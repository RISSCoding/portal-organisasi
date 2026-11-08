// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — approval workflow tables', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@approval.test');
    userB = await seedUser(ctx, 'b@approval.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-approval', 'Org X Approval');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-approval', 'Org Y Approval');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  describe('workflow_templates', () => {
    it('user A cannot see workflow templates from org Y', async () => {
      await ctx.admin`
        INSERT INTO workflow_templates (organization_id, name, created_by_user_id)
        VALUES (${orgY}, 'Template Y', ${userB.id})
      `;
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        return tx`SELECT id FROM workflow_templates`;
      });
      expect(rows.length).toBe(0);
    });

    it('forged organization_id does not leak org Y templates', async () => {
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        return tx`SELECT id FROM workflow_templates WHERE organization_id = ${orgY}`;
      });
      expect(rows.length).toBe(0);
    });

    it('user A can create and read own template in org X', async () => {
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO workflow_templates (organization_id, name, created_by_user_id)
                 VALUES (${orgX}, 'Template X', ${userA.id})`;
        return tx`SELECT id FROM workflow_templates`;
      });
      expect(rows.length).toBe(1);
    });
  });

  describe('approval_requests', () => {
    it('user A cannot read requests from org Y', async () => {
      await ctx.admin`
        INSERT INTO approval_requests (organization_id, requester_user_id, title)
        VALUES (${orgY}, ${userB.id}, 'Request Y')
      `;
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        return tx`SELECT id FROM approval_requests`;
      });
      expect(rows.length).toBe(0);
    });

    it('forged organization_id does not leak org Y requests', async () => {
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        return tx`SELECT id FROM approval_requests WHERE organization_id = ${orgY}`;
      });
      expect(rows.length).toBe(0);
    });

    it('user A cannot INSERT request into org Y', async () => {
      let caught: unknown = null;
      try {
        await withCtx(ctx, userA, orgX, async (tx) => {
          await tx`INSERT INTO approval_requests (organization_id, requester_user_id, title)
                   VALUES (${orgY}, ${userA.id}, 'evil')`;
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      expect(String(caught)).toMatch(/row-level security|new row violates/i);
    });

    it('user A can create and read own request in org X', async () => {
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO approval_requests (organization_id, requester_user_id, title)
                 VALUES (${orgX}, ${userA.id}, 'Request X')`;
        return tx`SELECT id FROM approval_requests`;
      });
      expect(rows.length).toBe(1);
    });
  });

  describe('approval_steps', () => {
    it('user A cannot read steps from org Y', async () => {
      const [reqY] = await ctx.admin<{ id: string }[]>`
        INSERT INTO approval_requests (organization_id, requester_user_id, title)
        VALUES (${orgY}, ${userB.id}, 'Request Y steps') RETURNING id
      `;
      await ctx.admin`
        INSERT INTO approval_steps (organization_id, approval_request_id, step_order)
        VALUES (${orgY}, ${reqY!.id}, 1)
      `;
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        return tx`SELECT id FROM approval_steps`;
      });
      expect(rows.length).toBe(0);
    });

    it('forged organization_id does not leak org Y steps', async () => {
      const rows = await withCtx(ctx, userA, orgX, async (tx) => {
        return tx`SELECT id FROM approval_steps WHERE organization_id = ${orgY}`;
      });
      expect(rows.length).toBe(0);
    });
  });
});
