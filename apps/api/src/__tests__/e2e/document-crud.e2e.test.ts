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

describe('HTTP E2E — Document CRUD', () => {
  let cookieOwner: string;
  let cookieMember: string;
  let cookieOutsider: string;
  let orgId: string;
  let orgOtherId: string;
  let projectId: string;
  let documentId: string;
  const server = () => app.getHttpServer();

  it('setup: register users, create orgs, add member, seed workspace & project', async () => {
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'owner@d.test', password: 'password123', name: 'Owner' });
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'member@d.test', password: 'password123', name: 'Member' });
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'outsider@d.test', password: 'password123', name: 'Outsider' });

    const loginOwner = await request(server())
      .post('/api/auth/login')
      .send({ email: 'owner@d.test', password: 'password123' });
    cookieOwner = extractCookie(loginOwner.headers['set-cookie']);
    const loginMember = await request(server())
      .post('/api/auth/login')
      .send({ email: 'member@d.test', password: 'password123' });
    cookieMember = extractCookie(loginMember.headers['set-cookie']);
    const loginOutsider = await request(server())
      .post('/api/auth/login')
      .send({ email: 'outsider@d.test', password: 'password123' });
    cookieOutsider = extractCookie(loginOutsider.headers['set-cookie']);

    const [ownerUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'owner@d.test'`;
    const [memberUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'member@d.test'`;
    const [outsiderUser] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'outsider@d.test'`;

    const [orgRow] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-d-test', 'Org D', ${ownerUser!.id}) RETURNING id
    `;
    orgId = orgRow!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${ownerUser!.id}, 'owner', 'active')`;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${memberUser!.id}, 'member', 'active')`;

    const [orgOther] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-d-other', 'Org D Other', ${outsiderUser!.id}) RETURNING id
    `;
    orgOtherId = orgOther!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgOtherId}, ${outsiderUser!.id}, 'owner', 'active')`;

    const wsRes = await request(server())
      .post('/api/workspaces')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId)
      .send({ name: 'WS D', slug: 'ws-d' });
    const workspaceId = (wsRes.body as { id: string }).id;

    const projRes = await request(server())
      .post('/api/projects')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId)
      .send({ workspaceId, name: 'Proj D', slug: 'proj-d' });
    projectId = (projRes.body as { id: string }).id;
  });

  it('owner can create document (201)', async () => {
    const res = await request(server())
      .post('/api/documents')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId)
      .send({ projectId, title: 'Doc 1', content: 'Initial content' });
    expect(res.status).toBe(201);
    const body = res.body as { id: string; version: number };
    expect(body.version).toBe(1);
    documentId = body.id;
  });

  it('member can read document (200)', async () => {
    const res = await request(server())
      .get(`/api/documents/${documentId}`)
      .set('Cookie', cookieMember)
      .set('X-Active-Org', orgId);
    expect(res.status).toBe(200);
    const body = res.body as { title: string; content: string; version: number };
    expect(body.title).toBe('Doc 1');
    expect(body.content).toBe('Initial content');
  });

  it('member can update document and version bumps to 2 (200)', async () => {
    const res = await request(server())
      .patch(`/api/documents/${documentId}`)
      .set('Cookie', cookieMember)
      .set('X-Active-Org', orgId)
      .send({ content: 'Updated content' });
    expect(res.status).toBe(200);
    const body = res.body as { version: number };
    expect(body.version).toBe(2);
  });

  it('member cannot delete document (403)', async () => {
    const res = await request(server())
      .delete(`/api/documents/${documentId}`)
      .set('Cookie', cookieMember)
      .set('X-Active-Org', orgId);
    expect(res.status).toBe(403);
  });

  it('outsider in different org cannot see document (200, empty list)', async () => {
    const res = await request(server())
      .get(`/api/documents/project/${projectId}`)
      .set('Cookie', cookieOutsider)
      .set('X-Active-Org', orgOtherId);
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBe(0);
  });

  it('owner can delete document (200)', async () => {
    const res = await request(server())
      .delete(`/api/documents/${documentId}`)
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId);
    expect(res.status).toBe(200);
  });
});
