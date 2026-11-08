// SPDX-License-Identifier: AGPL-3.0-or-later
// Spike: proves Drizzle + Testcontainers + PostgreSQL RLS work on Bun.
// Run: cd spike && bun install && bun test
import { expect, test, beforeAll, afterAll } from 'bun:test';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

let container: StartedPostgreSqlContainer;
let admin: postgres.Sql;
let app: postgres.Sql;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('spike')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  admin = postgres(container.getConnectionUri(), { max: 1 });

  await admin.unsafe(`
    CREATE ROLE portal_app LOGIN PASSWORD 'app';
    GRANT USAGE ON SCHEMA public TO portal_app;
    CREATE TABLE widgets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      label text NOT NULL
    );
    INSERT INTO widgets (organization_id, label) VALUES
      ('11111111-1111-1111-1111-111111111111', 'X-widget'),
      ('22222222-2222-2222-2222-222222222222', 'Y-widget');
    ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY w_tenant ON widgets FOR ALL
      USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
      WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
    GRANT SELECT, INSERT, UPDATE, DELETE ON widgets TO portal_app;
  `);

  app = postgres({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: 'portal_app',
    password: 'app',
    database: 'spike',
    max: 1,
  });
}, 180_000);

afterAll(async () => {
  await app?.end({ timeout: 1 });
  await admin?.end({ timeout: 1 });
  await container?.stop();
});

test('RLS filters SELECT to session org', async () => {
  const db = drizzle(app);
  const rows = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_organization_id', '11111111-1111-1111-1111-111111111111', true)`,
    );
    return tx.execute<{ label: string }>(sql`SELECT label FROM widgets`);
  });
  expect(rows.map((r) => r.label)).toEqual(['X-widget']);
});

test('RLS denies INSERT into other tenant', async () => {
  const db = drizzle(app);
  await expect(
    db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_organization_id', '11111111-1111-1111-1111-111111111111', true)`,
      );
      await tx.execute(
        sql`INSERT INTO widgets (organization_id, label) VALUES ('22222222-2222-2222-2222-222222222222', 'evil')`,
      );
    }),
  ).rejects.toThrow();
});
