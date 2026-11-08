// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'bun:test';
import { can, canModifyMember } from './permission';

describe('can() — org', () => {
  it('only owner can delete org', () => {
    expect(can('owner', 'org', 'delete')).toBe(true);
    expect(can('admin', 'org', 'delete')).toBe(false);
    expect(can('manager', 'org', 'delete')).toBe(false);
    expect(can('member', 'org', 'delete')).toBe(false);
    expect(can('guest', 'org', 'delete')).toBe(false);
  });

  it('only owner can transfer ownership', () => {
    expect(can('owner', 'org', 'transfer_ownership')).toBe(true);
    for (const r of ['admin', 'manager', 'member', 'guest'] as const) {
      expect(can(r, 'org', 'transfer_ownership')).toBe(false);
    }
  });

  it('owner+admin can update org', () => {
    expect(can('owner', 'org', 'update')).toBe(true);
    expect(can('admin', 'org', 'update')).toBe(true);
    expect(can('manager', 'org', 'update')).toBe(false);
    expect(can('member', 'org', 'update')).toBe(false);
  });
});

describe('can() — member', () => {
  it('guest has no member permissions', () => {
    for (const a of ['read', 'invite', 'remove', 'change_role'] as const) {
      expect(can('guest', 'member', a)).toBe(false);
    }
  });

  it('only owner+admin can invite', () => {
    expect(can('owner', 'member', 'invite')).toBe(true);
    expect(can('admin', 'member', 'invite')).toBe(true);
    expect(can('manager', 'member', 'invite')).toBe(false);
    expect(can('member', 'member', 'invite')).toBe(false);
  });
});

describe('can() — workspace', () => {
  it('manager cannot create workspace in Phase 0', () => {
    expect(can('manager', 'workspace', 'create')).toBe(false);
  });

  it('manager can update workspace', () => {
    expect(can('manager', 'workspace', 'update')).toBe(true);
  });

  it('member cannot delete workspace', () => {
    expect(can('member', 'workspace', 'delete')).toBe(false);
  });
});

describe('can() — audit_log', () => {
  it('only owner+admin can read audit log', () => {
    expect(can('owner', 'audit_log', 'read')).toBe(true);
    expect(can('admin', 'audit_log', 'read')).toBe(true);
    expect(can('manager', 'audit_log', 'read')).toBe(false);
    expect(can('member', 'audit_log', 'read')).toBe(false);
  });
});

describe('can() — deny by default', () => {
  it('null/undefined role always denies', () => {
    expect(can(null, 'org', 'read')).toBe(false);
    expect(can(undefined, 'task', 'read')).toBe(false);
  });

  it('unknown resource returns false', () => {
    // @ts-expect-error — deliberately passing an invalid resource
    expect(can('owner', 'nope', 'read')).toBe(false);
  });
});

describe('canModifyMember() — app-layer deny', () => {
  const ctx = (
    actorRole: 'owner' | 'admin' | 'manager',
    targetRole: 'owner' | 'admin' | 'member',
  ) => ({
    actorRole,
    actorUserId: 'a',
    targetUserId: 'b',
    targetRole,
  });

  it('admin cannot modify other admin', () => {
    expect(canModifyMember(ctx('admin', 'admin'))).toBe(false);
  });

  it('admin cannot modify owner', () => {
    expect(canModifyMember(ctx('admin', 'owner'))).toBe(false);
  });

  it('admin can modify member', () => {
    expect(canModifyMember(ctx('admin', 'member'))).toBe(true);
  });

  it('owner can modify anyone except self', () => {
    expect(canModifyMember(ctx('owner', 'admin'))).toBe(true);
    expect(canModifyMember(ctx('owner', 'member'))).toBe(true);
  });

  it('nobody can modify themselves via member endpoints', () => {
    const self = { ...ctx('owner', 'owner'), targetUserId: 'a' };
    expect(canModifyMember(self)).toBe(false);
  });

  it('manager cannot modify anyone', () => {
    expect(canModifyMember(ctx('manager', 'member'))).toBe(false);
  });
});
