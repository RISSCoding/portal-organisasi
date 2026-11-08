// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { startPg, stopPg, seedUser, seedOrgWithOwner, withCtx } from '../helpers';

describe('RLS — attachments', () => {
  let ctx: Awaited<ReturnType<typeof startPg>>;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let orgX: string;
  let orgY: string;
  let taskX: string;
  let taskY: string;

  beforeAll(async () => {
    ctx = await startPg();
    userA = await seedUser(ctx, 'a@file.test');
    userB = await seedUser(ctx, 'b@file.test');
    orgX = await seedOrgWithOwner(ctx, userA, 'org-x-file', 'Org X File');
    orgY = await seedOrgWithOwner(ctx, userB, 'org-y-file', 'Org Y File');

    // Seed tasks for both orgs
    const [wsX] = await ctx.admin<{ id: string }[]>`
      INSERT INTO workspaces (organization_id, name, slug) VALUES (${orgX}, 'WS X', 'ws-x-file') RETURNING id
    `;
    const [projX] = await ctx.admin<{ id: string }[]>`
      INSERT INTO projects (organization_id, workspace_id, name, slug) VALUES (${orgX}, ${wsX!.id}, 'Proj X', 'proj-x-file') RETURNING id
    `;
    const [tX] = await ctx.admin<{ id: string }[]>`
      INSERT INTO tasks (organization_id, project_id, title) VALUES (${orgX}, ${projX!.id}, 'Task X') RETURNING id
    `;
    taskX = tX!.id;

    const [wsY] = await ctx.admin<{ id: string }[]>`
      INSERT INTO workspaces (organization_id, name, slug) VALUES (${orgY}, 'WS Y', 'ws-y-file') RETURNING id
    `;
    const [projY] = await ctx.admin<{ id: string }[]>`
      INSERT INTO projects (organization_id, workspace_id, name, slug) VALUES (${orgY}, ${wsY!.id}, 'Proj Y', 'proj-y-file') RETURNING id
    `;
    const [tY] = await ctx.admin<{ id: string }[]>`
      INSERT INTO tasks (organization_id, project_id, title) VALUES (${orgY}, ${projY!.id}, 'Task Y') RETURNING id
    `;
    taskY = tY!.id;
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('user A cannot read attachments from org Y', async () => {
    await withCtx(ctx, userB, orgY, async (tx) => {
      await tx`INSERT INTO attachments (organization_id, task_id, uploaded_by_user_id, file_name, mime_type, file_size, storage_key)
               VALUES (${orgY}, ${taskY}, ${userB.id}, 'secret.pdf', 'application/pdf', 1024, 'org-y/secret.pdf')`;
    });
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM attachments`;
    });
    expect(rows.length).toBe(0);
  });

  it('forged organization_id does not leak org Y attachments', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      return tx`SELECT id FROM attachments WHERE organization_id = ${orgY}`;
    });
    expect(rows.length).toBe(0);
  });

  it('user A cannot INSERT attachment into org Y', async () => {
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, userA, orgX, async (tx) => {
        await tx`INSERT INTO attachments (organization_id, task_id, uploaded_by_user_id, file_name, mime_type, file_size, storage_key)
                 VALUES (${orgY}, ${taskY}, ${userA.id}, 'evil.pdf', 'application/pdf', 1024, 'org-y/evil.pdf')`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/row-level security|new row violates/i);
  });

  it('user A can create and read own attachment in org X', async () => {
    const rows = await withCtx(ctx, userA, orgX, async (tx) => {
      await tx`INSERT INTO attachments (organization_id, task_id, uploaded_by_user_id, file_name, mime_type, file_size, storage_key)
               VALUES (${orgX}, ${taskX}, ${userA.id}, 'my-file.pdf', 'application/pdf', 2048, 'org-x/my-file.pdf')`;
      return tx`SELECT id FROM attachments`;
    });
    expect(rows.length).toBe(1);
  });
});
