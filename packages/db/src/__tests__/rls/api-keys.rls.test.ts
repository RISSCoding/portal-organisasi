// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — API Keys', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@keys.test');
    userB = await seedUser(ctx, 'b@keys.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-keys', 'Org X Keys');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-keys', 'Org Y Keys');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read API keys from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO api_keys (organization_id, user_id, name, prefix, key_hash)
               VALUES (${orgY}, ${userB.id}, 'Secret Key', 'pk_live_secret', 'hash_secret')`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM api_keys`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id does not leak org Y API keys', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM api_keys WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });
});
