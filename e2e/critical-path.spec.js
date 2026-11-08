// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const email = `e2e-${runId}@test.local`;
const password = 'password123';
const orgSlug = `e2e-org-${runId}`;
const orgName = `E2E Org ${runId}`;

test.beforeAll(async () => {
  adminSql = postgres(ADMIN_DB_URL, { max: 1 });
});

test.afterAll(async () => {
  try {
    await adminSql`DELETE FROM organizations WHERE slug LIKE 'e2e-org-%'`;
    await adminSql`DELETE FROM users WHERE email LIKE 'e2e-%@test.local'`;
  } catch {
    // ignore cleanup failures
  }
  await adminSql.end();
});

test('critical path: login → org switch → workspace → project → task', async ({ page, request }) => {
  // Setup via API + SQL
  const regRes = await request.post(`${API_VIA_WEB}/api/auth/register`, {
    data: { email, password, name: 'E2E Test User' },
  });
  expect(regRes.ok(), `register failed: ${regRes.status()} ${await regRes.text()}`).toBeTruthy();

  const [user] = await adminSql`SELECT id FROM users WHERE email = ${email}`;
  expect(user?.id, 'user not found after register').toBeTruthy();

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${orgSlug}, ${orgName}, ${user.id})`;
  });

  // UI login
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  // Dashboard: Pastikan org ada dan tunggu auto-switch selesai
  await expect(page.getByText(orgName)).toBeVisible();
  await expect(page.getByText('[Active]')).toBeVisible();

  // Navigate to Workspaces
  await page.getByRole('link', { name: 'Workspaces' }).click();
  await expect(page).toHaveURL(/\/workspaces$/);

  // Create workspace
  const wsName = `E2E Workspace ${runId}`;
  const wsSlug = `e2e-ws-${runId}`;
  await page.fill('input[placeholder="Workspace Name"]', wsName);
  await page.fill('input[placeholder="slug-name"]', wsSlug);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(wsName)).toBeVisible();

  // Open the workspace
  await page.getByText(wsName).click();
  await expect(page).toHaveURL(new RegExp(`/workspaces/[^/]+$`));

  // Create project
  const projName = `E2E Project ${runId}`;
  const projSlug = `e2e-proj-${runId}`;
  await page.fill('input[placeholder="Project Name"]', projName);
  await page.fill('input[placeholder="slug-name"]', projSlug);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(projName)).toBeVisible();

  // Open the project
  await page.getByText(projName).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);

  // Create task
  const taskTitle = `E2E Task ${runId}`;
  await page.fill('input[placeholder="New Task Title"]', taskTitle);
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();

  // Toggle task status
  const taskRow = page.locator('li', { hasText: taskTitle });
  await taskRow.locator('input[type="checkbox"]').click();
  await expect(taskRow.locator('input[type="checkbox"]')).toBeChecked();
});
