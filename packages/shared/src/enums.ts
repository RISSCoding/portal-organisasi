// SPDX-License-Identifier: AGPL-3.0-or-later
// Mirrors PostgreSQL enum types from migrations/0001_init.sql.
// Keep in sync with the SQL — CI diff-tests these values.

export const ORG_ROLES = ['owner', 'admin', 'manager', 'member', 'guest'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['invited', 'active', 'suspended', 'removed'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const VISIBILITIES = ['private', 'org', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const PROJECT_STATUSES = ['planned', 'active', 'paused', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// P2-8: reserved at the application layer (DB only enforces uniqueness).
export const RESERVED_ORG_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'www',
  'mail',
  'auth',
  'static',
  'assets',
  'org',
]);

// Case-insensitive check. App layer MUST call this before any org INSERT.
// The DB only enforces slug uniqueness, not reserved-status — see ADR-0001.
export function isReservedSlug(slug: string): boolean {
  return RESERVED_ORG_SLUGS.has(slug.toLowerCase());
}
