// SPDX-License-Identifier: AGPL-3.0-or-later
// Stable error codes. The API maps these to HTTP status + machine-readable code
// in responses. Never leak internal details (SQL, stack) to clients.

export const ERROR_CODES = {
  // 400
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESERVED_SLUG: 'RESERVED_SLUG',
  SLUG_TAKEN: 'SLUG_TAKEN',
  // 401
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  // 403
  FORBIDDEN: 'FORBIDDEN',
  NOT_ORG_MEMBER: 'NOT_ORG_MEMBER',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  MFA_POLICY_REQUIRED: 'MFA_POLICY_REQUIRED',
  // 404
  NOT_FOUND: 'NOT_FOUND',
  // 409
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVITATION_EXISTS: 'INVITATION_EXISTS',
  MEMBERSHIP_EXISTS: 'MEMBERSHIP_EXISTS',
  // 429
  RATE_LIMITED: 'RATE_LIMITED',
  // 500
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
