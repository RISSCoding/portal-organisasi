// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'bun:test';
import {
  INVITATION_STATUSES,
  MEMBERSHIP_STATUSES,
  ORG_ROLES,
  PROJECT_STATUSES,
  RESERVED_ORG_SLUGS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  VISIBILITIES,
  isReservedSlug,
} from './enums';

// These assertions mirror the PostgreSQL enums in
// packages/db/migrations/0001_init.sql. Batch B adds a check:enum-parity
// CI job that will diff this file against the live schema; until then, this
// test is the source of truth for drift detection.

describe('enums', () => {
  it('ORG_ROLES matches ADR-0002 roles', () => {
    expect([...ORG_ROLES]).toEqual(['owner', 'admin', 'manager', 'member', 'guest']);
  });

  it('MEMBERSHIP_STATUSES matches schema', () => {
    expect([...MEMBERSHIP_STATUSES]).toEqual(['invited', 'active', 'suspended', 'removed']);
  });

  it('INVITATION_STATUSES matches schema', () => {
    expect([...INVITATION_STATUSES]).toEqual(['pending', 'accepted', 'revoked', 'expired']);
  });

  it('VISIBILITIES matches schema', () => {
    expect([...VISIBILITIES]).toEqual(['private', 'org', 'public']);
  });

  it('PROJECT_STATUSES matches schema', () => {
    expect([...PROJECT_STATUSES]).toEqual(['planned', 'active', 'paused', 'completed', 'archived']);
  });

  it('TASK_STATUSES matches schema', () => {
    expect([...TASK_STATUSES]).toEqual(['todo', 'in_progress', 'blocked', 'done', 'cancelled']);
  });

  it('TASK_PRIORITIES matches schema', () => {
    expect([...TASK_PRIORITIES]).toEqual(['low', 'medium', 'high', 'urgent']);
  });
});

describe('RESERVED_ORG_SLUGS (P2-8)', () => {
  it('contains exactly the nine reserved slugs', () => {
    expect([...RESERVED_ORG_SLUGS].sort()).toEqual(
      ['admin', 'api', 'app', 'assets', 'auth', 'mail', 'org', 'static', 'www'].sort(),
    );
  });

  it('isReservedSlug is case-insensitive', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('Admin')).toBe(true);
    expect(isReservedSlug('ADMIN')).toBe(true);
    expect(isReservedSlug('my-org')).toBe(false);
    expect(isReservedSlug('')).toBe(false);
  });
});
