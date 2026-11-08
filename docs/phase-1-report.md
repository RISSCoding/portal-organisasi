# Phase 1 — Closure Report

**Date:** 2026-11-08
**Tag:** v0.1.0-phase1
**Runtime:** Bun 1.4.0 (34cbb9a40)
**Host:** Fedora Linux Workstation (GNOME), rootless Podman
**Repo:** portal-organisasi

## Scope delivered

Phase 1 delivers the identity, organization, workspace, and project foundation
of Portal Organisasi. Task, Document, Comment-CRUD, Notification-API, and
Notification-UI are scheduled for Phase 2.

### Backend (apps/api)
- Auth: register, login, logout, session cookie, MFA TOTP scaffold.
- Organizations: create, list, switch active org.
- Memberships: invite by email + token, accept invitation, list active members.
- Workspaces: create, list. RBAC enforced.
- Projects: create, list by workspace. RBAC enforced.
- Tenant isolation: enforced via `withOrgContext` and `TenantMiddleware`.
- RBAC engine: `packages/auth`.

### Database (packages/db)
- Schema `0001_init.sql` and `0002_phase1.sql`.
- RLS enabled + at least one policy on every tenant-scoped table.
- `check:rls-coverage` and `check:enum-parity` scripts in CI.

### Web (apps/web)
- `/login`, `/dashboard`, `/workspaces`.
- Build passes.
- Render-level verification deferred to Phase 2 (G3).

### Worker (apps/worker)
- BullMQ skeleton with `token-cleanup` queue, hourly cron, SIGTERM handler.

### Infra
- `infra/docker/docker-compose.yml` (postgres, redis, minio, mailpit, api, web).
- SELinux `:Z` and Ryuk disabled documented.

## Verification

All lines below are verbatim output from a single chained run on 2026-11-08.

- `bun run typecheck` (clean)
- `bun run lint` (clean)
- `bun run format:check` (clean)
- `bun run test:unit` (31 pass, 0 fail)
- `bun run test:rls` (17 pass, 0 fail, 5 files)
- `bun run test:integration` (15 pass, 0 fail, 4 files)

**Totals: 63 tests pass, 0 fail.**

## Known deferrals

### G3 — UI render-level verification
`bun run --filter @portal/web build` succeeds, but no browser test. Playwright-based smoke test is scheduled for Phase 2.

### Task / Document / Comment / Notification
Tables exist with RLS, APIs and UIs deferred to Phase 2.

### CI exercise
GitHub Actions has not been exercised. First push will confirm.
