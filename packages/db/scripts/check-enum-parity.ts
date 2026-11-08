// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ORG_ROLES,
  MEMBERSHIP_STATUSES,
  INVITATION_STATUSES,
  VISIBILITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from '@portal/shared';

const sql = readFileSync(join(import.meta.dir, '..', 'migrations', '0001_init.sql'), 'utf8');

function extractEnum(name: string): string[] {
  const regex = new RegExp(`CREATE TYPE ${name} AS ENUM \\((.*?)\\);`, 's');
  const match = sql.match(regex);
  if (!match || !match[1]) return [];
  return match[1].split(',').map((s) => s.trim().replace(/'/g, ''));
}

const dbEnums = {
  org_role: extractEnum('org_role'),
  membership_status: extractEnum('membership_status'),
  invitation_status: extractEnum('invitation_status'),
  visibility: extractEnum('visibility'),
  project_status: extractEnum('project_status'),
  task_status: extractEnum('task_status'),
  task_priority: extractEnum('task_priority'),
};

const tsEnums = {
  org_role: [...ORG_ROLES],
  membership_status: [...MEMBERSHIP_STATUSES],
  invitation_status: [...INVITATION_STATUSES],
  visibility: [...VISIBILITIES],
  project_status: [...PROJECT_STATUSES],
  task_status: [...TASK_STATUSES],
  task_priority: [...TASK_PRIORITIES],
};

let fail = false;
for (const key of Object.keys(dbEnums)) {
  const db = dbEnums[key as keyof typeof dbEnums].sort().join(',');
  const ts = tsEnums[key as keyof typeof tsEnums].sort().join(',');
  if (db !== ts) {
    console.error(`❌ Enum mismatch for ${key}:\n  DB: ${db}\n  TS: ${ts}`);
    fail = true;
  }
}

if (fail) process.exit(1);
console.log('✅ Enum parity check passed.');
