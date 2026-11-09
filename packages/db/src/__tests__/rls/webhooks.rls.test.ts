// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — Webhooks', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@webhook.test');
    userB = await seedUser(ctx, 'b@webhook.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-webhook', 'Org X Webhook');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-webhook', 'Org Y Webhook');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read webhooks from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO webhooks (organization_id, name, url, secret, created_by_user_id)
               VALUES (${orgY}, 'Secret Hook', 'https://evil.com', 'secret', ${userB.id})`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM webhooks`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id does not leak org Y webhooks', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM webhooks WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });
});
