# Portal Organisasi

Open-source multi-tenant web platform for organizations.

## Quick Start (Fedora/Podman)

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Install deps: `bun install`
3. Start infra: `cd infra/docker && podman-compose up -d`
4. Run API: `bun run --filter='@portal/api' dev`
5. Run Web: `bun run --filter='@portal/web' dev`
6. Visit http://localhost:3001

## Testing

```bash
# Unit tests
bun run test:unit

# RLS integration tests (requires Podman/Docker)
export TESTCONTAINERS_RYUK_DISABLED=true
bun run test:rls

