// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  startPg,
  stopPg,
  seedUser,
  seedOrgWithOwner,
  addMemberWithRole,
  withCtx,
} from '../helpers';

describe('RLS — notifications', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@notif.test');
    userB = await seedUser(ctx, 'b@notif.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-notif', 'Org X Notifications');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-notif', 'Org Y Notifications');
    // Also make userB a member of orgX so the "same org, different user" case is real.
    await addMemberWithRole(ctx, orgX, userB.id, 'member');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A in org X cannot see user B notifications in org Y', async () => {
    await ctx.admin`
      INSERT INTO notifications (organization_id, user_id, type, title)
      VALUES (${orgY}, ${userB.id}, 'test', 'Y notification')
    `;
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM notifications`;
    });
    expect(rows.length).toBe(0);
  });

  it('user A cannot see user B notifications in the same org (user_id clause)', async () => {
    await ctx.admin`
      INSERT INTO notifications (organization_id, user_id, type, title)
      VALUES (${orgX}, ${userB.id}, 'test', 'X notification for B')
    `;
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM notifications`;
    });
    expect(rows.length).toBe(0);
  });

  it('user A can insert and read their own notification', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      await tx`INSERT INTO notifications (organization_id, user_id, type, title)
               VALUES (${orgX}, ${userA.id}, 'test', 'A notification')`;
      return tx`SELECT id FROM notifications`;
    });
    expect(rows.length).toBe(1);
  });

  it('user A cannot insert notification for user B in same org', async () => {
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO notifications (organization_id, user_id, type, title)
                 VALUES (${orgX}, ${userB.id}, 'test', 'spoofed')`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/row-level security|new row violates/i);
  });

  it('user A cannot read org Y notifications even with forged organization_id', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM notifications WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });
});
