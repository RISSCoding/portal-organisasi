// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — HR Leave Requests', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@hr.test');
    userB = await seedUser(ctx, 'b@hr.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-hr', 'Org X HR');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-hr', 'Org Y HR');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read leave requests from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO leave_requests (organization_id, user_id, start_date, end_date, reason)
               VALUES (${orgY}, ${userB.id}, '2026-12-01', '2026-12-05', 'Liburan')`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM leave_requests`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id does not leak org Y leaves', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM leave_requests WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });

  it('user A cannot INSERT leave into org Y', async () => {
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO leave_requests (organization_id, user_id, start_date, end_date, reason)
                 VALUES (${orgY}, ${userA.id}, '2026-12-01', '2026-12-05', 'Hack')`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/row-level security|new row violates/i);
  });

  it('user A can create and read own leave in org X', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      await tx`INSERT INTO leave_requests (organization_id, user_id, start_date, end_date, reason)
               VALUES (${orgX}, ${userA.id}, '2026-12-10', '2026-12-12', 'Keperluan Keluarga')`;
      return tx`SELECT id FROM leave_requests`;
    });
    expect(rows.length).toBe(1);
  });
});
