// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const emailA = `usera-search-${runId}@test.local`;
const emailB = `userb-search-${runId}@test.local`;
const password = 'password123';
const orgAName = `Search Org A ${runId}`;
const orgBName = `Search Org B ${runId}`;

test.beforeAll(async () => {
  adminSql = postgres(ADMIN_DB_URL, { max: 1 });
});

test.afterAll(async () => {
  try {
    await adminSql`DELETE FROM organizations WHERE name IN (${orgAName}, ${orgBName})`;
    await adminSql`DELETE FROM users WHERE email IN (${emailA}, ${emailB})`;
  } catch (e) { /* ignore */ }
  await adminSql.end();
});

test('global search respects tenant isolation', async ({ page, request }) => {
  // 1. Register users
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: emailA, password, name: 'User A' } });
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: emailB, password, name: 'User B' } });

  const [userA] = await adminSql`SELECT id FROM users WHERE email = ${emailA}`;
  const [userB] = await adminSql`SELECT id FROM users WHERE email = ${emailB}`;

  // 2. Create orgs
  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${userA.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${emailA}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`search-org-a-${runId}`}, ${orgAName}, ${userA.id})`;
  });
  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${userB.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${emailB}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`search-org-b-${runId}`}, ${orgBName}, ${userB.id})`;
  });

  const [orgA] = await adminSql`SELECT id FROM organizations WHERE name = ${orgAName}`;
  const [orgB] = await adminSql`SELECT id FROM organizations WHERE name = ${orgBName}`;

  // 3. Seed data
  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${userA.id}, true)`;
    await tx`SELECT set_config('app.current_organization_id', ${orgA.id}, true)`;
    const [ws] = await tx`INSERT INTO workspaces (organization_id, name, slug) VALUES (${orgA.id}, 'WS A', 'ws-a') RETURNING id`;
    const [proj] = await tx`INSERT INTO projects (organization_id, workspace_id, name, slug) VALUES (${orgA.id}, ${ws.id}, 'Proj A', 'proj-a') RETURNING id`;
    await tx`INSERT INTO tasks (organization_id, project_id, title, description) VALUES (${orgA.id}, ${proj.id}, 'Secret Alpha', 'This is a very secret task')`;
  });

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${userB.id}, true)`;
    await tx`SELECT set_config('app.current_organization_id', ${orgB.id}, true)`;
    const [ws] = await tx`INSERT INTO workspaces (organization_id, name, slug) VALUES (${orgB.id}, 'WS B', 'ws-b') RETURNING id`;
    const [proj] = await tx`INSERT INTO projects (organization_id, workspace_id, name, slug) VALUES (${orgB.id}, ${ws.id}, 'Proj B', 'proj-b') RETURNING id`;
    await tx`INSERT INTO tasks (organization_id, project_id, title, description) VALUES (${orgB.id}, ${proj.id}, 'Secret Beta', 'This is another secret task')`;
  });

  // 4. Login as User A
  await page.goto('/login');
  await page.fill('input[type="email"]', emailA);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(orgAName)).toBeVisible();

  // 5. Search for "Alpha" -> Should find User A's task
  await page.fill('input[placeholder="Cari tasks, documents..."]', 'Alpha');
  await page.press('input[placeholder="Cari tasks, documents..."]', 'Enter');
  await expect(page).toHaveURL(/\/search\?q=Alpha/);
  await expect(page.getByText('Secret Alpha')).toBeVisible();

  // 6. Search for "Beta" -> Should NOT find User B's task (Isolation)
  await page.goto('/search?q=Beta');
  await expect(page.getByText('No results found.')).toBeVisible();
  await expect(page.getByText('Secret Beta')).not.toBeVisible();
});
