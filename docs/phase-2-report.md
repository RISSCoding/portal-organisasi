# Phase 2 — Closure Report

**Date:** 2026-11-08
**Tag:** v0.2.0-phase2
**Runtime:** Bun 1.4.0 (34cbb9a40)
**Host:** Fedora Linux Workstation (GNOME), rootless Podman
**Repo:** portal-organisasi

## Scope delivered

Phase 2 delivers the MVP Completion of Portal Organisasi: Task, Comment, Document, and Notification APIs + UIs, on top of the Phase 1 foundation.

### Backend (apps/api)
- **Tasks:** `TaskService` + `TaskController` (create, list by project, update, delete). Subtask support via `parent_task_id`. RBAC via `can()`. Audit log on create/update/delete.
- **Comments:** `CommentService` + `CommentController` (list by target, create, delete). Supports both `task` and `document` targets. App-layer deny: only author, owner, or admin can delete.
- **Documents:** `DocumentService` + `DocumentController` (create, read, update with automatic version bump, delete). RBAC via `can()`.
- **Notifications:** `NotificationService` + `NotificationController` (list own, mark read, mark all read). RLS enforces `user_id = current_user`.

### Database (packages/db)
- Schema `0002_phase1.sql` already contains `comments`, `notifications`, and `tasks.parent_task_id`.
- RLS policies cover all tenant-scoped tables, verified by 17 RLS tests.

### Web (apps/web)
- `/workspaces/[id]`: list projects in a workspace.
- `/workspaces/[id]/projects/[id]`: list tasks, create tasks, toggle status.
- `/workspaces/[id]/projects/[id]/documents`: list documents, create documents.
- `/workspaces/[id]/projects/[id]/documents/[id]`: view/edit document with version display, list and post comments.

## Verification

All lines below are verbatim output from a single chained run on 2026-11-08.

- `bun run typecheck` (clean)
- `bun run lint` (clean)
- `bun run format:check` (clean)
- `bun run test:unit` (31 pass, 0 fail)
- `bun run test:rls` (17 pass, 0 fail, 5 files)
- `bun run test:integration` (43 pass, 0 fail, 8 files)

**Totals: 91 tests pass, 0 fail.**

### Test inventory (Phase 2 additions)
| Suite | File | Count |
|-------|------|-------|
| E2E | `task-crud.e2e.test.ts` | 7 |
| E2E | `comment-crud.e2e.test.ts` | 8 |
| E2E | `document-crud.e2e.test.ts` | 7 |
| E2E | `notification-api.e2e.test.ts` | 6 |
