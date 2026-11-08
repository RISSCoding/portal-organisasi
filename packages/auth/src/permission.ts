// SPDX-License-Identifier: AGPL-3.0-or-later
import type { OrgRole } from '@portal/shared';

export type PermissionResource =
  | 'org'
  | 'member'
  | 'workspace'
  | 'project'
  | 'task'
  | 'document'
  | 'comment'
  | 'audit_log'
  | 'policy';

export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'invite'
  | 'remove'
  | 'change_role'
  | 'transfer_ownership';

const NONE: ReadonlySet<OrgRole> = new Set();

function roles(...r: OrgRole[]): ReadonlySet<OrgRole> {
  return new Set(r);
}

const MATRIX: Record<
  PermissionResource,
  Partial<Record<PermissionAction, ReadonlySet<OrgRole>>>
> = {
  org: {
    read: roles('owner', 'admin', 'manager', 'member'),
    update: roles('owner', 'admin'),
    delete: roles('owner'),
    transfer_ownership: roles('owner'),
  },
  member: {
    read: roles('owner', 'admin', 'manager', 'member'),
    invite: roles('owner', 'admin'),
    remove: roles('owner', 'admin'),
    change_role: roles('owner', 'admin'),
  },
  workspace: {
    read: roles('owner', 'admin', 'manager', 'member'),
    create: roles('owner', 'admin'),
    update: roles('owner', 'admin', 'manager'),
    delete: roles('owner', 'admin'),
  },
  project: {
    read: roles('owner', 'admin', 'manager', 'member'),
    create: roles('owner', 'admin', 'manager'),
    update: roles('owner', 'admin', 'manager'),
    delete: roles('owner', 'admin', 'manager'),
  },
  task: {
    read: roles('owner', 'admin', 'manager', 'member'),
    create: roles('owner', 'admin', 'manager', 'member'),
    update: roles('owner', 'admin', 'manager', 'member'),
    delete: roles('owner', 'admin', 'manager'),
  },
  document: {
    read: roles('owner', 'admin', 'manager', 'member'),
    create: roles('owner', 'admin', 'manager', 'member'),
    update: roles('owner', 'admin', 'manager', 'member'),
    delete: roles('owner', 'admin', 'manager'),
  },
  comment: {
    read: roles('owner', 'admin', 'manager', 'member'),
    create: roles('owner', 'admin', 'manager', 'member'),
    update: roles('owner', 'admin', 'manager', 'member'),
    delete: roles('owner', 'admin', 'manager', 'member'),
  },
  audit_log: {
    read: roles('owner', 'admin'),
  },
  policy: {
    read: roles('owner', 'admin'),
    update: roles('owner', 'admin'),
  },
};

export function can(
  role: OrgRole | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (!role) return false;
  const allowed = MATRIX[resource]?.[action] ?? NONE;
  return allowed.has(role);
}

export interface MemberMutationContext {
  actorRole: OrgRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: OrgRole;
}

export function canModifyMember(ctx: MemberMutationContext): boolean {
  const { actorRole, actorUserId, targetUserId, targetRole } = ctx;
  if (actorUserId === targetUserId) return false;
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') return targetRole !== 'owner' && targetRole !== 'admin';
  return false;
}
