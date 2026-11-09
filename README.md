# Portal Organisasi

> Open-source, self-hostable workspace platform for modern organizations.

[![CI](https://github.com/RISSCoding/portal-organisasi/actions/workflows/ci.yml/badge.svg)](https://github.com/RISSCoding/portal-organisasi/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A5_1.4.0-black.svg)](https://bun.sh)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/RISSCoding/portal-organisasi/pulls)

![Portal Organisasi Dashboard](docs/assets/dashboard-placeholder.png)

Portal Organisasi is a **multi-tenant, self-hostable workspace platform** for
organizations — modeled on GitHub Organizations and Figma Teams, but open source and
deployable on your own infrastructure. One user can belong to many organizations with
different roles per org. Data isolation is enforced at the database layer via
**PostgreSQL Row-Level Security**, so a query bug can never leak rows across tenants.

## Features

- **Hard multi-tenancy** — PostgreSQL RLS, `withOrgContext` helper, tenant middleware.
- **Authentication** — Register, login, MFA (TOTP), opaque session cookies, argon2id hashing.
- **RBAC engine** — `can(role, resource, action)` matrix + app-layer deny rules.
- **Workspaces & Projects** — Nested hierarchy with RBAC on every operation.
- **Tasks** — Kanban with drag-and-drop, subtasks, priorities, statuses.
- **Documents** — TipTap rich-text editor with automatic version bumping.
- **Comments** — Polymorphic (tasks + documents), author/admin delete rules.
- **Notifications** — Per-user feed with mark-as-read, tenant-scoped by RLS.
- **Approval Workflows** — Multi-level approval chains, owner/admin-only approvals.
- **HR module** — Leave requests, per-year balances, auto-deduction on approval.
- **Finance module** — Budgets + expenses, approval flow, per-budget usage tracking.
- **File Uploads** — MinIO presigned URLs with strict `storage_key` prefix validation.
- **Full-text Search** — PostgreSQL `tsvector`, tenant-isolated.
- **API Keys** — Bearer-token access via hashed keys, `last_used_at` tracking.
- **Webhooks** — HMAC-SHA256 signed payloads, BullMQ delivery with retry.
- **Domain Auto-Join** — Users with a verified email domain join the org automatically.
- **Self-hostable** — One `podman-compose up` to run the entire stack.

## Quick Start (Self-Hosting)

See **[docs/self-hosting.md](docs/self-hosting.md)** for a full production-grade guide
covering Podman/Docker, TLS reverse proxy, backups, and the security checklist.

For local development on Fedora:

```bash
# 1. Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash && exec $SHELL

# 2. Install dependencies
bun install

# 3. Start infrastructure (Postgres, Redis, MinIO, Mailpit)
cd infra/docker && podman-compose up -d && cd ../..

# 4. Apply migrations
export DATABASE_ADMIN_URL="postgres://postgres:postgres@localhost:5432/portal"
bun run --filter '@portal/db' migrate

# 5. Run API + Web
bun run dev
# → API: http://localhost:3000/api   (Swagger: /api/docs)
# → Web: http://localhost:3001

# 6. (Optional) Run the worker for emails/webhooks
bun run --filter '@portal/worker' dev
```

## Architecture

Portal Organisasi is a Bun monorepo:

```
portal-organisasi/
├── apps/
│   ├── api/        # NestJS — auth, sessions, tenant middleware, REST endpoints
│   ├── web/        # Next.js 14 App Router — UI (Tailwind CSS v3)
│   └── worker/     # BullMQ — email + webhook delivery, cron cleanup
├── packages/
│   ├── auth/       # argon2id hashing + RBAC matrix
│   ├── db/         # SQL migrations, RLS helpers, Testcontainers RLS tests
│   └── shared/     # Zod DTOs, enums, error codes
└── infra/docker/   # Compose stack + Dockerfiles
```

**Tenant isolation** is enforced in PostgreSQL. The app connects as a non-owner role
(`portal_app`), and every query runs inside `withOrgContext`, which sets
`app.current_user_id` / `app.current_organization_id` for the transaction. RLS
policies on every tenant-scoped table use these GUCs to filter rows. See
[`docs/adr/0001-tenant-isolation-rls.md`](docs/adr/0001-tenant-isolation-rls.md).

**Authentication** is owned entirely by the NestJS API. See
[`docs/adr/0003-auth-owned-by-api.md`](docs/adr/0003-auth-owned-by-api.md).

For the full architecture, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) ≥ 1.4.0 |
| API | [NestJS](https://nestjs.com) 10 + `postgres.js` |
| Web | [Next.js](https://nextjs.org) 14 (App Router) + Tailwind CSS v3 |
| Database | PostgreSQL 16 + Row-Level Security |
| Queue | [BullMQ](https://github.com/taskforcesh/bullmq) + Redis 7 |
| Storage | MinIO (S3-compatible) with presigned URLs |
| Rich Text | [TipTap](https://tiptap.dev) |
| Drag & Drop | [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) |
| Testing | Bun test (unit / RLS / integration) + Playwright (E2E) |

## Testing

```bash
# Unit tests
bun run test:unit

# RLS integration tests — requires Podman/Docker + Testcontainers
export TESTCONTAINERS_RYUK_DISABLED=true
bun run test:rls

# API integration + HTTP E2E tests — requires Postgres + Redis
export REDIS_URL=redis://localhost:6379
bun run test:integration

# Playwright E2E — requires the full stack running
npx playwright test
```

> **Fedora + rootless Podman:** `TESTCONTAINERS_RYUK_DISABLED=true` is required. See
> [`docs/dev-setup-fedora.md`](docs/dev-setup-fedora.md).

## Contributing

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Every tenant-scoped endpoint must ship with a **cross-tenant test** that asserts a
   `403` or `404` for a user in a different org.
3. Ensure `bun run typecheck`, `bun run lint`, and `bun run format:check` pass.
4. Open a PR.

## License

Portal Organisasi is licensed under the **GNU Affero General Public License v3.0**
(AGPL-3.0-or-later). See [`LICENSE`](LICENSE).
