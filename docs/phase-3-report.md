# Phase 3 — Closure Report

**Date:** 2026-11-08
**Tag:** v0.3.0-phase3
**Runtime:** Bun 1.4.0 (34cbb9a40)
**Host:** Fedora Linux Workstation (GNOME), rootless Podman
**Repo:** portal-organisasi

## Scope delivered

Phase 3 delivers **Workflow/Approval** and **Notification UI** to complete the core organizational feature set.

### Backend (apps/api)
- **Approvals:** `ApprovalService` + `ApprovalController` (create request, list requests, act on request). RBAC: only owner/admin can approve/reject.
- **Notifications:** Already existed in Phase 2; UI now available.
- **Migration 0003:** `workflow_templates`, `approval_requests`, `approval_steps` with RLS.

### Web (apps/web)
- `/approvals`: List requests, create requests, approve/reject buttons.
- `/notifications`: List notifications, mark as read, mark all as read.
- Dashboard links to both.

### Database (packages/db)
- `0003_phase3.sql` added.
- RLS tests for `workflow_templates`, `approval_requests`, `approval_steps` (9 new tests).

## Verification

All lines below are verbatim output from a single chained run on 2026-11-08.

- `bun run typecheck` (clean)
- `bun run lint` (clean)
- `bun run format:check` (clean)
- `bun run test:unit` (31 pass, 0 fail)
- `bun run test:rls` (26 pass, 0 fail, 6 files)
- `bun run test:integration` (50 pass, 0 fail, 9 files)

**Totals: 107 tests pass, 0 fail.**

## Known deferrals

### SSO / SAML / OIDC
Deferred to a future phase.

### E-signature
Deferred to a future phase.

### Calendar
Deferred to a future phase.

### CI exercise
GitHub Actions has not been exercised. First push will confirm.
