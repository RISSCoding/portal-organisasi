Architecture
Runtime

Bun across the monorepo. See docs/adr/0004-bun-runtime.md.
Layout

    apps/api — NestJS. Owns auth, sessions, orgs, memberships, permissions, audit, tenant middleware.

    apps/web — Next.js App Router. Minimal UI for auth and org switching.

    apps/worker — BullMQ. Cron for token cleanup.

    packages/db — Drizzle schema, SQL migrations, RLS tests.

    packages/auth — password hashing, RBAC matrix.

    packages/shared — Zod DTOs, enums, error codes.

Tenant Isolation

PostgreSQL RLS on a shared schema. Session GUCs set via withOrgContext. See docs/adr/0001-tenant-isolation-rls.md.
Auth

NestJS-owned. Opaque session cookie. See docs/adr/0003-auth-owned-by-api.md.
Testing

    bun test for unit + RLS integration (Testcontainers).

    Every tenant-scoped endpoint ships with a cross-tenant test returning 403/404.
