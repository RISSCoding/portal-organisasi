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
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AppModule } from '../../app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';

interface EmailJobData {
  to: string;
  orgName: string;
  token: string;
}

let container: StartedPostgreSqlContainer;
let app: INestApplication;
let adminSql: postgres.Sql;
let emailQueue: Queue<EmailJobData>;
let redisConnection: IORedis;

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
  const migrationsDir = join(import.meta.dir, '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    await adminSql.unsafe(readFileSync(join(migrationsDir, f), 'utf8'));
  }
  process.env.DATABASE_URL = uri.replace('postgres://postgres:postgres@', 'postgres://portal_app:app@');
  
  // Setup Redis connection for verification
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  emailQueue = new Queue<EmailJobData>('email', { connection: redisConnection });

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  await app.init();
}, 180_000);

afterAll(async () => {
  await emailQueue.close();
  await redisConnection.quit();
  await app?.close();
  await adminSql?.end({ timeout: 1 });
  await container?.stop();
});

describe('Integration — Email Queue', () => {
  let cookieOwner: string;
  let orgId: string;
  const server = (): App => app.getHttpServer() as App;

  it('setup: register owner, create org', async () => {
    await request(server()).post('/api/auth/register').send({ email: 'owner@q.test', password: 'password123', name: 'Owner' });
    const loginRes = await request(server()).post('/api/auth/login').send({ email: 'owner@q.test', password: 'password123' });
    cookieOwner = extractCookie(loginRes.headers['set-cookie']);

    const [user] = await adminSql<{ id: string }[]>`SELECT id FROM users WHERE email = 'owner@q.test'`;
    await adminSql.begin(async (tx) => {
      await tx`SELECT set_config('app.current_user_id', ${user!.id}, true)`;
      await tx`SELECT set_config('app.current_user_email', 'owner@q.test', true)`;
      await tx`SELECT set_config('app.current_organization_id', '', true)`;
      const [org] = await tx<{ id: string }[]>`SELECT app.create_organization_with_owner('org-q', 'Org Q', ${user!.id}) AS id`;
      orgId = org!.id;
    });

    await request(server()).post('/api/auth/switch-org').set('Cookie', cookieOwner).send({ orgId });
  });

  it('enqueues send-invitation job when invite API is called', async () => {
    const inviteeEmail = 'invitee@q.test';
    
    // 1. Call API
    const res = await request(server())
      .post('/api/invitations')
      .set('Cookie', cookieOwner)
      .set('X-Active-Org', orgId)
      .send({ email: inviteeEmail, role: 'member' });
    
    expect(res.status).toBe(201);

    // 2. Verify job exists in Redis
    const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed']);
    const inviteJob = jobs.find((j) => j.name === 'send-invitation' && j.data.to === inviteeEmail);
    
    expect(inviteJob).toBeDefined();
    expect(inviteJob?.data.orgName).toBe('Org Q');
  });
});
