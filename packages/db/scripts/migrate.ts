// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const adminUrl =
  process.env.DATABASE_ADMIN_URL || 'postgres://postgres:postgres@localhost:5432/portal';
const sql = postgres(adminUrl, { max: 1 });

async function migrate() {
  console.log('Menjalankan migrasi database...');

  // Buat role portal_app jika belum ada
  await sql.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'portal_app') THEN
        CREATE ROLE portal_app LOGIN PASSWORD 'app';
      END IF;
    END
    $$;
  `);

  const migrationsDir = join(import.meta.dir, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const query = readFileSync(join(migrationsDir, file), 'utf8');
    try {
      await sql.unsafe(query);
    } catch (e: unknown) {
      // Tangkap semua error "already exists" agar script idempotent
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('already exists')) {
        console.log(`  (skipped: object already exists)`);
      } else {
        throw e;
      }
    }
  }

  console.log('✅ Semua migrasi berhasil dieksekusi.');
  await sql.end();
  process.exit(0);
}

void migrate();
