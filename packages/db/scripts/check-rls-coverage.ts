// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(import.meta.dir, '..', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const sql = files.map((f) => readFileSync(join(migrationsDir, f), 'utf8')).join('\n');

const tableMatches = [...sql.matchAll(/CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/g)];
const tenantTables = tableMatches
  .filter((m) => /\borganization_id\b/.test(m[2] ?? ''))
  .map((m) => m[1] ?? '');

if (!tenantTables.includes('organizations')) {
  tenantTables.push('organizations');
}

const rlsMatches = [...sql.matchAll(/ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY/g)];
const rlsTables = rlsMatches.map((m) => m[1] ?? '');

const policyMatches = [...sql.matchAll(/CREATE POLICY \w+ ON (\w+)/g)];
const tablesWithPolicy = new Set(policyMatches.map((m) => m[1] ?? ''));

const missingRls = tenantTables.filter((t) => !rlsTables.includes(t));
const missingPolicy = tenantTables.filter((t) => rlsTables.includes(t) && !tablesWithPolicy.has(t));

let fail = false;
if (missingRls.length > 0) {
  console.error(`❌ Tables missing ENABLE ROW LEVEL SECURITY: ${missingRls.join(', ')}`);
  fail = true;
}
if (missingPolicy.length > 0) {
  console.error(`❌ Tables with RLS enabled but NO CREATE POLICY: ${missingPolicy.join(', ')}`);
  fail = true;
}

if (fail) process.exit(1);
console.log(
  `✅ All ${tenantTables.length} tenant-scoped/root tables have RLS enabled and at least one policy.`,
);
