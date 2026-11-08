// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — Finance (Budgets & Expenses)', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@finance.test');
    userB = await seedUser(ctx, 'b@finance.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-finance', 'Org X Finance');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-finance', 'Org Y Finance');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read budgets from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO budgets (organization_id, name, amount, created_by_user_id)
               VALUES (${orgY}, 'Secret Budget', 1000000, ${userB.id})`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM budgets`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id does not leak org Y expenses', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM expenses WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });

  it('user A cannot INSERT expense into org Y', async () => {
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO expenses (organization_id, requester_user_id, title, amount)
                 VALUES (${orgY}, ${userA.id}, 'Hack Expense', 500000)`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/row-level security|new row violates/i);
  });

  it('user A can create and read own expense in org X', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      await tx`INSERT INTO expenses (organization_id, requester_user_id, title, amount)
               VALUES (${orgX}, ${userA.id}, 'Team Lunch', 150000)`;
      return tx`SELECT id FROM expenses`;
    });
    expect(rows.length).toBe(1);
  });
});
