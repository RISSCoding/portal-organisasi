// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — Organization Domains', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@domain.test');
    userB = await seedUser(ctx, 'b@domain.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-domain', 'Org X Domain');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-domain', 'Org Y Domain');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read domains from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO organization_domains (organization_id, domain, created_by_user_id)
               VALUES (${orgY}, 'evil.com', ${userB.id})`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM organization_domains`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id does not leak org Y domains', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM organization_domains WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });
});
