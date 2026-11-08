// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const email = `kanban-${runId}@test.local`;
const password = 'password123';
const orgName = `Kanban Org ${runId}`;
const wsName = `Kanban WS ${runId}`;
const projName = `Kanban Proj ${runId}`;

test.beforeAll(async () => {
  adminSql = postgres(ADMIN_DB_URL, { max: 1 });
});

test.afterAll(async () => {
  try {
    await adminSql`DELETE FROM organizations WHERE name = ${orgName}`;
    await adminSql`DELETE FROM users WHERE email = ${email}`;
  } catch (e) { /* ignore */ }
  await adminSql.end();
});

test('kanban board renders tasks from API by status', async ({ page, request }) => {
  // 1. Setup via API + Admin SQL
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email, password, name: 'User' } });
  const [user] = await adminSql`SELECT id FROM users WHERE email = ${email}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`kanban-org-${runId}`}, ${orgName}, ${user.id})`;
  });

  const [org] = await adminSql`SELECT id FROM organizations WHERE name = ${orgName}`;
  
  // Need to set active org via API before creating WS
  const login = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email, password } });
  const cookie = login.headers()['set-cookie'];

  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, { headers: { Cookie: cookie }, data: { orgId: org.id } });
  
  const wsRes = await request.post(`${API_VIA_WEB}/api/workspaces`, { headers: { Cookie: cookie }, data: { name: wsName, slug: `ws-${runId}` } });
  const ws = await wsRes.json();

  const projRes = await request.post(`${API_VIA_WEB}/api/projects`, { headers: { Cookie: cookie }, data: { workspaceId: ws.id, name: projName, slug: `proj-${runId}` } });
  const proj = await projRes.json();

  await request.post(`${API_VIA_WEB}/api/tasks`, { headers: { Cookie: cookie }, data: { projectId: proj.id, title: 'Task In Todo' } });
  const task2 = await request.post(`${API_VIA_WEB}/api/tasks`, { headers: { Cookie: cookie }, data: { projectId: proj.id, title: 'Task In Done' } });
  const t2 = await task2.json();
  
  await request.patch(`${API_VIA_WEB}/api/tasks/${t2.id}`, { headers: { Cookie: cookie }, data: { status: 'done' } });

  // 2. Login to UI
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  // 3. Go to Kanban Board
  await page.goto(`/workspaces/${ws.id}/projects/${proj.id}/board`);

  // 4. Verify Tasks are in correct columns
  const todoCol = page.locator('div', { hasText: 'To Do' }).first();
  const doneCol = page.locator('div', { hasText: 'Done' }).first();

  await expect(todoCol.getByText('Task In Todo')).toBeVisible();
  await expect(doneCol.getByText('Task In Done')).toBeVisible();
});
