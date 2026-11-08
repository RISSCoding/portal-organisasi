// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';
import type { PgCtx } from '../helpers';

describe('RLS — cross-tenant isolation', () => {
  let ctx: PgCtx;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@example.com');
    userB = await seedUser(ctx, 'b@example.com');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x', 'Org X');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y', 'Org Y');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A in org X sees only org X workspaces', async () => {
    await withCtx(ctx, userA, orgX, async (tx) => {
      await tx`INSERT INTO workspaces (organization_id, name, slug) VALUES (${orgX}, 'X-ws', 'x-ws')`;
    });
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO workspaces (organization_id, name, slug) VALUES (${orgY}, 'Y-ws', 'y-ws')`;
    });

    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx<{ name: string }[]>`SELECT name FROM workspaces`;
    });
    expect(rows.map((r) => r.name)).toEqual(['X-ws']);
  });

  it('forged organization_id in WHERE does not leak org Y data', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx<{ name: string }[]>`SELECT name FROM workspaces WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });
});
