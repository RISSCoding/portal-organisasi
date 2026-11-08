// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, withCtx } from '../helpers';
import type { PgCtx } from '../helpers';

describe('app.create_organization_with_owner', () => {
  let ctx: PgCtx;

  beforeAll(async () => {
    ctx = await startPg();
  }, 180_000);
  afterAll(async () => {
    await stopPg(ctx);
  });

  it('creates org and owner membership for the caller', async () => {
    const userA = await seedUser(ctx, 'a@example.com');
    const result = await withCtx(ctx, userA, null, async (tx) => {
      const [row] = await tx<
        { id: string }[]
      >`SELECT app.create_organization_with_owner('acme', 'Acme', ${userA.id}) AS id`;
      return row;
    });
    expect(result?.id).toBeTruthy();
  });

  it('refuses user A creating an org on behalf of user B (P0-1)', async () => {
    const userA = await seedUser(ctx, 'a@example.com');
    const userB = await seedUser(ctx, 'b@example.com');
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, userA, null, async (tx) => {
        await tx`SELECT app.create_organization_with_owner('evil', 'Evil', ${userB.id})`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/insufficient_privilege|caller/);
  });
});
