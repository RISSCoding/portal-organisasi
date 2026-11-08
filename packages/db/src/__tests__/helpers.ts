// SPDX-License-Identifier: AGPL-3.0-or-later
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface PgCtx {
  container: StartedPostgreSqlContainer;
  admin: postgres.Sql;
  app: postgres.Sql;
}

export async function startPg(): Promise<PgCtx> {
  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('portal')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const admin = postgres(container.getConnectionUri(), { max: 1 });

  const migrationsDir = join(import.meta.dir, '..', '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    await admin.unsafe(readFileSync(join(migrationsDir, f), 'utf8'));
  }

  const app = postgres({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: 'portal_app',
    password: 'app',
    database: 'portal',
    max: 1,
  });

  return { container, admin, app };
}

export async function stopPg(ctx: PgCtx): Promise<void> {
  await ctx.app?.end({ timeout: 1 });
  await ctx.admin?.end({ timeout: 1 });
  await ctx.container?.stop();
}

export async function seedUser(ctx: PgCtx, email: string): Promise<{ id: string; email: string }> {
  const [row] = await ctx.admin<{ id: string; email: string }[]>`
    INSERT INTO users (email, password_hash, name) VALUES (${email}, 'x', ${email.split('@')[0] ?? 'user'})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id, email
  `;
  return row!;
}

export async function seedOrgWithOwner(
  ctx: PgCtx,
  owner: { id: string; email: string },
  slug: string,
  name: string,
): Promise<string> {
  return withCtx(ctx, owner, null, async (tx) => {
    const [row] = await tx<
      { id: string }[]
    >`SELECT app.create_organization_with_owner(${slug}, ${name}, ${owner.id}) AS id`;
    return row!.id;
  });
}

export async function addMemberWithRole(
  ctx: PgCtx,
  orgId: string,
  userId: string,
  role: string,
): Promise<void> {
  await ctx.admin`
    INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${userId}, ${role}, 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'
  `;
}

export async function withCtx<T>(
  ctx: PgCtx,
  user: { id: string; email: string },
  orgId: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const result = await ctx.app.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${user.email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', ${orgId ?? ''}, true)`;
    return fn(tx);
  });
  return result as T;
}
