// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
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

describe('HTTP E2E — Approval Workflow', () => {
  let cookieOwner: string;
  let cookieMember: string;
  let cookieOutsider: string;
  let orgId: string;
  let orgOtherId: string;
  let requestId: string;
  const server = (): App => app.getHttpServer() as App;

  it('setup: register users, create orgs, add member', async () => {
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'owner@a.test', password: 'password123', name: 'Owner' });
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'member@a.test', password: 'password123', name: 'Member' });
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'outsider@a.test', password: 'password123', name: 'Outsider' });

    const loginOwner = await request(server())
      .post('/api/auth/login')
      .send({ email: 'owner@a.test', password: 'password123' });
    cookieOwner = extractCookie(loginOwner.headers['set-cookie']);
    const loginMember = await request(server())
      .post('/api/auth/login')
      .send({ email: 'member@a.test', password: 'password123' });
    cookieMember = extractCookie(loginMember.headers['set-cookie']);
    const loginOutsider = await request(server())
      .post('/api/auth/login')
      .send({ email: 'outsider@a.test', password: 'password123' });
    cookieOutsider = extractCookie(loginOutsider.headers['set-cookie']);

    const [ownerUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'owner@a.test'`;
    const [memberUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'member@a.test'`;
    const [outsiderUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'outsider@a.test'`;

    const [orgRow] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-a-test', 'Org A', ${ownerUser!.id}) RETURNING id
    `;
    orgId = orgRow!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${ownerUser!.id}, 'owner', 'active')`;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${memberUser!.id}, 'member', 'active')`;

    const [orgOther] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-a-other', 'Org A Other', ${outsiderUser!.id}) RETURNING id
    `;
    orgOtherId = orgOther!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgOtherId}, ${outsiderUser!.id}, 'owner', 'active')`;
  });

  it('member can create approval request (201)', async () => {
    const res = await request(server())
      .post('/api/approvals')
      .set('Cookie', cookieMember)
      .set('X-Active-Org', orgId)
      .send({ title: 'Budget Request', description: 'Need budget for event' });
    expect(res.status).toBe(201);
    requestId = (res.body as { id: string }).id;
  });

  it('owner can list approval requests (200)', async () => {
    const res = await request(server())
      .get('/api/approvals')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId);
    expect(res.status).toBe(200);
    const body = res.body as { id: string; title: string; status: string }[];
    expect(body.length).toBe(1);
    expect(body[0]!.id).toBe(requestId);
    expect(body[0]!.status).toBe('pending');
  });

  it('member cannot approve request (403)', async () => {
    const res = await request(server())
      .patch(`/api/approvals/${requestId}/act`)
      .set('Cookie', cookieMember)
      .set('X-Active-Org', orgId)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
  });

  it('owner can approve request (200)', async () => {
    const res = await request(server())
      .patch(`/api/approvals/${requestId}/act`)
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId)
      .send({ action: 'approve', comment: 'Approved by owner' });
    expect(res.status).toBe(200);
  });

  it('request status is now approved (200)', async () => {
    const res = await request(server())
      .get('/api/approvals')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId);
    const body = res.body as { id: string; status: string }[];
    const req = body.find((r) => r.id === requestId);
    expect(req?.status).toBe('approved');
  });

  it('outsider in different org cannot see approval requests (200, empty)', async () => {
    const res = await request(server())
      .get('/api/approvals')
      .set('Cookie', cookieOutsider)
      .set('X-Active-Org', orgOtherId);
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBe(0);
  });
});
