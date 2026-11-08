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
import type { PgCtx } from '../helpers';

describe('RLS — membership & org privilege escalation (P0-A)', () => {
  let ctx: PgCtx;
  let owner: { id: string; email: string };
  let admin: { id: string; email: string };
  let member: { id: string; email: string };
  let orgId: string;

  beforeAll(async () => {
    ctx = await startPg();
    owner = await seedUser(ctx, 'owner@example.com');
    admin = await seedUser(ctx, 'admin@example.com');
    member = await seedUser(ctx, 'member@example.com');
    orgId = await seedOrgWithOwner(ctx, owner, 'org-x', 'Org X');
    await addMemberWithRole(ctx, orgId, admin.id, 'admin');
    await addMemberWithRole(ctx, orgId, member.id, 'member');
  }, 180_000);

  afterAll(async () => {
    await stopPg(ctx);
  });

  it('member cannot self-promote to owner', async () => {
    // RLS silently filters the row for UPDATE, so the query succeeds but updates 0 rows.
    const updated = await withCtx(ctx, member, orgId, async (tx) => {
      return tx<{ id: string }[]>`
        UPDATE memberships SET role = 'owner' 
        WHERE organization_id = ${orgId} AND user_id = ${member.id} 
        RETURNING id
      `;
    });
    expect(updated.length).toBe(0);

    // Verify via admin connection that the role is untouched
    const [row] =
      await ctx.admin`SELECT role FROM memberships WHERE organization_id = ${orgId} AND user_id = ${member.id}`;
    expect(row?.role).toBe('member');
  });

  it('member cannot INSERT a membership row', async () => {
    // INSERT throws because it violates the WITH CHECK clause.
    let caughtError: unknown = null;
    try {
      await withCtx(ctx, member, orgId, async (tx) => {
        await tx`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${member.id}, 'admin', 'active')`;
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    expect(String(caughtError)).toMatch(/row-level security|violates/i);
  });

  it('member cannot UPDATE the organization row', async () => {
    // Same as above: silently filters to 0 rows.
    const updated = await withCtx(ctx, member, orgId, async (tx) => {
      return tx<{ id: string }[]>`
        UPDATE organizations SET name = 'pwned' 
        WHERE id = ${orgId} 
        RETURNING id
      `;
    });
    expect(updated.length).toBe(0);

    // Verify via admin connection that the name is untouched
    const [row] = await ctx.admin`SELECT name FROM organizations WHERE id = ${orgId}`;
    expect(row?.name).not.toBe('pwned');
  });

  it('admin can UPDATE org and INSERT membership', async () => {
    await withCtx(ctx, admin, orgId, async (tx) => {
      await tx`UPDATE organizations SET name = 'Org X (renamed)' WHERE id = ${orgId}`;
      await tx`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${orgId}, ${owner.id}, 'member', 'active') ON CONFLICT DO NOTHING`;
    });

    // Verify changes were actually made
    const [orgRow] = await ctx.admin`SELECT name FROM organizations WHERE id = ${orgId}`;
    expect(orgRow?.name).toBe('Org X (renamed)');
  });
});
