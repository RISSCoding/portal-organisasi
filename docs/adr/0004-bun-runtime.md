# ADR-0004: Bun runtime across the monorepo

Status: Accepted (Phase 0)

## Decision
- Bun is runtime, package manager, default test runner for `api`, `web`, `worker`, and all packages.
- Workspaces via Bun. Turborepo not added.
- Docker: `oven/bun` for `api` and `worker`. `web` uses Node if Next.js build fails on Bun.
- Vitest only when a feature is unavailable in `bun test`.

## Spike result
> Runtime: **Podman** (rootless, `podman.socket` via systemd --user).
> Bun version: **1.4.0**.
> - NestJS on Bun: **PASS**
> - class-validator on Bun: **PASS** (400 for invalid DTO)
> - Drizzle + postgres.js on Bun: **PASS**
> - Testcontainers + RLS on Bun: **PASS** (2/2 tests, ~23s cold)

## Fallback
If NestJS fails on Bun in the future, fallback is Elysia. Switch happens before a batch, never mid-batch.

## Consequences
- `bun.lockb` must be committed.
- `bun test` is default; Jest not introduced.
