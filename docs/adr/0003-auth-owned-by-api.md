ADR-0003: Auth is owned by the NestJS API

Status: Accepted (Phase 0)
Decision

    NestJS owns registration, login, logout, MFA, password reset, session lifecycle.

    Session is an opaque random token (32 bytes), SHA-256 hashed at rest.

    Cookie: portal_session, HttpOnly, SameSite=Lax, Secure in production.

    NextAuth removed from Phase 0.
