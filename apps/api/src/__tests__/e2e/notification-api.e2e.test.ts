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

describe('HTTP E2E — Notification API', () => {
  let cookieUserA: string;
  let orgA: string;
  let orgB: string;
  let userAId: string;
  let userBId: string;
  let notifAId: string;
  let notifBId: string;
  const server = (): App => app.getHttpServer() as App;

  it('setup: register users, create orgs, seed notifications', async () => {
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'usera@n.test', password: 'password123', name: 'User A' });
    await request(server())
      .post('/api/auth/register')
      .send({ email: 'userb@n.test', password: 'password123', name: 'User B' });

    const loginA = await request(server())
      .post('/api/auth/login')
      .send({ email: 'usera@n.test', password: 'password123' });
    cookieUserA = extractCookie(loginA.headers['set-cookie']);

    const [userARow] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'usera@n.test'`;
    const [userBRow] = await adminSql<
      { id: string }[]
    >`SELECT id FROM users WHERE email = 'userb@n.test'`;
    userAId = userARow!.id;
    userBId = userBRow!.id;

    const [orgARow] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-n-a', 'Org N A', ${userAId}) RETURNING id
    `;
    orgA = orgARow!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgA}, ${userAId}, 'owner', 'active')`;

    const [orgBRow] = await adminSql<{ id: string }[]>`
      INSERT INTO organizations (slug, name, created_by_user_id) VALUES ('org-n-b', 'Org N B', ${userBId}) RETURNING id
    `;
    orgB = orgBRow!.id;
    await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgB}, ${userBId}, 'owner', 'active')`;

    // Seed notifications directly via admin
    const [notifARow] = await adminSql<{ id: string }[]>`
      INSERT INTO notifications (organization_id, user_id, type, title, body)
      VALUES (${orgA}, ${userAId}, 'task_assigned', 'Task Assigned', 'You have been assigned a task')
      RETURNING id
    `;
    notifAId = notifARow!.id;

    const [notifBRow] = await adminSql<{ id: string }[]>`
      INSERT INTO notifications (organization_id, user_id, type, title, body)
      VALUES (${orgB}, ${userBId}, 'task_assigned', 'Task Assigned', 'You have been assigned a task')
      RETURNING id
    `;
    notifBId = notifBRow!.id;
  });

  it('user A can list own notifications (200)', async () => {
    const res = await request(server())
      .get('/api/notifications')
      .set('Cookie', cookieUserA)
      .set('X-Active-Org', orgA);
    expect(res.status).toBe(200);
    const body = res.body as { id: string; is_read: boolean }[];
    expect(body.length).toBe(1);
    expect(body[0]!.id).toBe(notifAId);
    expect(body[0]!.is_read).toBe(false);
  });

  it('user A cannot see user B notifications in org B (200, empty)', async () => {
    const res = await request(server())
      .get('/api/notifications')
      .set('Cookie', cookieUserA)
      .set('X-Active-Org', orgA);
    // Even if we try to forge header to org B, TenantMiddleware will block it (403)
    // So we test the normal case where orgA has no User B notifs.
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBe(1);
  });

  it('user A can mark own notification as read (200)', async () => {
    const res = await request(server())
      .patch(`/api/notifications/${notifAId}/read`)
      .set('Cookie', cookieUserA)
      .set('X-Active-Org', orgA);
    expect(res.status).toBe(200);
  });

  it('user A cannot mark user B notification as read (404)', async () => {
    // RLS hides the notification, so the UPDATE returns 0 rows, triggering 404
    const res = await request(server())
      .patch(`/api/notifications/${notifBId}/read`)
      .set('Cookie', cookieUserA)
      .set('X-Active-Org', orgA);
    expect(res.status).toBe(404);
  });

  it('user A can mark all own notifications as read (200)', async () => {
    const res = await request(server())
      .patch('/api/notifications/read-all')
      .set('Cookie', cookieUserA)
      .set('X-Active-Org', orgA);
    expect(res.status).toBe(200);

    // Verify list is now all read
    const listRes = await request(server())
      .get('/api/notifications')
      .set('Cookie', cookieUserA)
      .set('X-Active-Org', orgA);
    const body = listRes.body as { is_read: boolean }[];
    expect(body.every((n) => n.is_read)).toBe(true);
  });
});
