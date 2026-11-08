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

## File Upload Flow (S3/MinIO)

Aplikasi ini menggunakan *Presigned URL* untuk menangani unggahan file, sehingga file tidak melewati server API (menghemat *bandwidth* dan memori API).

### Alur Upload
1. Klien memanggil `POST /api/attachments/upload-url` dengan `fileName`, `mimeType`, `targetId`, dan `targetType`.
2. API memverifikasi hak akses (RBAC) dan menghasilkan `storageKey` dengan format: `<organization_id>/<targetType>/<targetId>/<uuid>.<ext>`.
3. API menggunakan AWS SDK untuk menghasilkan *Presigned PUT URL* (berlaku 1 jam) dan mengembalikannya ke klien.
4. Klien mengunggah file secara langsung ke URL tersebut (MinIO/S3).
5. Klien memanggil `POST /api/attachments/confirm` dengan `storageKey` dan metadata file.
6. API menyimpan metadata tersebut ke tabel `attachments` (yang dilindungi oleh RLS).

### Alur Download
1. Klien memanggil `GET /api/attachments/:id/download`.
2. API memverifikasi hak akses dan mencari `storage_key` di database (RLS memastikan user hanya bisa melihat attachment di organisasinya sendiri).
3. API menghasilkan *Presigned GET URL* (berlaku 1 jam) dan mengembalikannya ke klien.
4. Klien mengunduh file langsung dari MinIO/S3.

### Keamanan
- Isolasi *tenant* (RLS) diterapkan di database, sehingga user dari Org A tidak akan pernah bisa mendapatkan *download URL* untuk file milik Org B (akan mengembalikan `404 Not Found`).
- `storageKey` selalu diawali dengan `organization_id` untuk memastikan isolasi di level *storage*.
