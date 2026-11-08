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
import type http from 'node:http';
import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';

let container: StartedPostgreSqlContainer;
let app: INestApplication;
let adminSql: postgres.Sql;

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

describe('HTTP E2E — Forged X-Active-Org header', () => {
  let cookieA: string;
  let orgY: string;
  const server = () => app.getHttpServer() as http.Server;

  it('setup: register users, login A, create org Y for B', async () => {
    const regA = await request(server())
      .post('/api/auth/register')
      .send({ email: 'a@e2e.test', password: 'password123', name: 'A' });
    if (regA.status >= 400)
      throw new Error(`Register A failed: ${regA.status} ${JSON.stringify(regA.body)}`);

    const regB = await request(server())
      .post('/api/auth/register')
      .send({ email: 'b@e2e.test', password: 'password123', name: 'B' });
    if (regB.status >= 400)
      throw new Error(`Register B failed: ${regB.status} ${JSON.stringify(regB.body)}`);

    const loginRes = await request(server())
      .post('/api/auth/login')
      .send({ email: 'a@e2e.test', password: 'password123' });
    if (loginRes.status >= 400)
      throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);

    const setCookie = loginRes.headers['set-cookie'] as string[] | string | undefined;
    if (!setCookie) throw new Error('No set-cookie header returned from login');
    cookieA = Array.isArray(setCookie) ? setCookie[0]! : setCookie;

    const [userB] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'b@e2e.test'`;
    const [orgRow] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-y', 'Org Y', ${userB!.id}) RETURNING id
    `;
    orgY = orgRow!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgY}, ${userB!.id}, 'owner', 'active')`;
  });

  it('user A + forged X-Active-Org: ORG_Y → 403', async () => {
    const res = await request(server())
      .get('/api/organizations/me')
      .set('Cookie', cookieA)
      .set('X-Active-Org', orgY);

    expect(res.status).toBe(403);
  });

  it('user A without forged header → only sees own orgs (empty)', async () => {
    const res = await request(server()).get('/api/organizations/me').set('Cookie', cookieA);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
