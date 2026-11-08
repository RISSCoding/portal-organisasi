// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — comments', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;
  let taskX: string;
  let taskY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@comments.test');
    userB = await seedUser(ctx, 'b@comments.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-comments', 'Org X Comments');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-comments', 'Org Y Comments');

    // Seed workspace -> project -> task per org via admin (bypasses RLS).
    // Task is required because comments_target_check requires task_id or document_id.
    const [wsX] = await ctx.admin<{ id: string }[]>`
      INSERT INTO workspaces (organization_id, name, slug)
      VALUES (${orgX}, 'WS X', 'ws-x-comments') RETURNING id
    `;
    const [projX] = await ctx.admin<{ id: string }[]>`
      INSERT INTO projects (organization_id, workspace_id, name, slug)
      VALUES (${orgX}, ${wsX!.id}, 'Proj X', 'proj-x-comments') RETURNING id
    `;
    const [tx] = await ctx.admin<{ id: string }[]>`
      INSERT INTO tasks (organization_id, project_id, title)
      VALUES (${orgX}, ${projX!.id}, 'Task X') RETURNING id
    `;
    taskX = tx!.id;

    const [wsY] = await ctx.admin<{ id: string }[]>`
      INSERT INTO workspaces (organization_id, name, slug)
      VALUES (${orgY}, 'WS Y', 'ws-y-comments') RETURNING id
    `;
    const [projY] = await ctx.admin<{ id: string }[]>`
      INSERT INTO projects (organization_id, workspace_id, name, slug)
      VALUES (${orgY}, ${wsY!.id}, 'Proj Y', 'proj-y-comments') RETURNING id
    `;
    const [ty] = await ctx.admin<{ id: string }[]>`
      INSERT INTO tasks (organization_id, project_id, title)
      VALUES (${orgY}, ${projY!.id}, 'Task Y') RETURNING id
    `;
    taskY = ty!.id;
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read comments from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO comments (organization_id, task_id, author_user_id, content)
               VALUES (${orgY}, ${taskY}, ${userB.id}, 'Y comment')`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM comments`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id in WHERE does not leak org Y comments', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM comments WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });

  it('user A cannot INSERT comment into org Y', async () => {
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO comments (organization_id, task_id, author_user_id, content)
                 VALUES (${orgY}, ${taskY}, ${userA.id}, 'evil')`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/row-level security|new row violates/i);
  });

  it('user A can insert and read own comments in org X', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      await tx`INSERT INTO comments (organization_id, task_id, author_user_id, content)
               VALUES (${orgX}, ${taskX}, ${userA.id}, 'my own comment')`;
      return tx`SELECT id FROM comments`;
    });
    expect(rows.length).toBe(1);
  });
});
