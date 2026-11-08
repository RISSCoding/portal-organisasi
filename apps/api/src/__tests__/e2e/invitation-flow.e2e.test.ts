// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';

let container: StartedPostgreSqlContainer;
let app: INestApplication;
let adminSql: postgres.Sql;

function extractCookie(setCookieHeader: unknown): string {
  if (!setCookieHeader) throw new Error('No cookie returned');
  const header = setCookieHeader as string | string[];
  if (Array.isArray(header)) {
    const first = header[0];
    if (typeof first !== 'string') throw new Error('Invalid cookie array');
    return first;
  }
  if (typeof header === 'string') return header;
  throw new Error('Unrecognized set-cookie format');
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  const uri = container.getConnectionUri();

  adminSql = postgres(uri, { max: 1 });

  const migrationsDir = join(
    import.meta.dir,
    '..',
    '..',
    '..',
    '..',
    '..',
    'packages',
    'db',
    'migrations',
  );
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    await adminSql.unsafe(readFileSync(join(migrationsDir, f), 'utf8'));
  }

  process.env.DATABASE_URL = uri.replace(
    'postgres://postgres:postgres@',
    'postgres://portal_app:app@',
  );

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  await app.init();
}, 180_000);

afterAll(async () => {
  await app?.close();
  await adminSql?.end({ timeout: 1 });
  await container?.stop();
});

describe('HTTP E2E — Invitation Flow', () => {
  let cookieOwner: string;
  let cookieInvitee: string;
  let orgId: string;
  let inviteToken: string;
  const server = () => app.getHttpServer();

  it('setup: register owner & invitee, create org', async () => {
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'owner@invite.test', password: 'password123', name: 'Owner' });
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'invitee@invite.test', password: 'password123', name: 'Invitee' });

    const loginOwner = await request(server())
      .post('/api/auth/login')
      .send({ email: 'owner@invite.test', password: 'password123' });
    cookieOwner = extractCookie(loginOwner.headers['set-cookie']);

    const loginInvitee = await request(server())
      .post('/api/auth/login')
      .send({ email: 'invitee@invite.test', password: 'password123' });
    cookieInvitee = extractCookie(loginInvitee.headers['set-cookie']);

    const [ownerUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'owner@invite.test'`;
    const [orgRow] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-invite', 'Org Invite', ${ownerUser!.id}) RETURNING id
    `;
    orgId = orgRow!.id;

    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${ownerUser!.id}, 'owner', 'active')`;
  });

  it('owner can invite invitee (201)', async () => {
    const res = await request(server())
      .post('/api/invitations')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId)
      .send({ email: 'invitee@invite.test', role: 'member' });

    expect(res.status).toBe(201);
    const body = res.body as { ok: boolean; token: string };
    expect(body.ok).toBe(true);
    expect(body.token).toBeTruthy();
    inviteToken = body.token;
  });

  it('invitee can accept invitation (201)', async () => {
    const res = await request(server())
      .post('/api/invitations/accept')
      .set('Cookie', cookieInvitee)
      .send({ token: inviteToken });

    expect(res.status).toBe(201);
    const body = res.body as { ok: boolean; orgId: string };
    expect(body.ok).toBe(true);
    expect(body.orgId).toBe(orgId);
  });

  it('invitee is now a member and can list members', async () => {
    const res = await request(server())
      .get('/api/members')
      .set('Cookie', cookieInvitee)
      .set('X-Active-Org', orgId);

    expect(res.status).toBe(200);
    const members = res.body as { email: string; role: string }[];
    expect(members.length).toBe(2);
    const emails = members.map((m) => m.email).sort();
    expect(emails).toEqual(['invitee@invite.test', 'owner@invite.test']);
  });
});
