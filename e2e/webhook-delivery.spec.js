// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const email = `webhook-${runId}@test.local`;
const password = 'password123';
const orgName = `Webhook Org ${runId}`;

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

test('webhook delivery fires on task.created event', async ({ page, request }) => {
  // 1. Setup Owner
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email, password, name: 'Owner' } });
  const [user] = await adminSql`SELECT id FROM users WHERE email = ${email}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`webhook-org-${runId}`}, ${orgName}, ${user.id})`;
  });

  // 2. Login
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(page.getByText(orgName)).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // 3. Create Webhook via UI
  await page.goto('/webhooks');
  await page.fill('input[placeholder="Nama Webhook (misal: Slack Notification)"]', 'Test Webhook');
  await page.fill('input[placeholder="https://example.com/webhook"]', 'http://localhost:9999/test-endpoint');
  await page.locator('label').filter({ hasText: 'Task Dibuat' }).locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Buat Webhook' }).click();

  // Verify webhook created
  await expect(page.getByRole('cell', { name: 'Test Webhook' })).toBeVisible();
  await expect(page.getByText('Webhook Berhasil Dibuat!')).toBeVisible();

  // 4. Create a task via API which should trigger the webhook
  const login = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email, password } });
  const cookie = login.headers()['set-cookie'];

  const [org] = await adminSql`SELECT id FROM organizations WHERE name = ${orgName}`;
  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, {
    headers: { Cookie: cookie },
    data: { orgId: org.id }
  });

  const wsRes = await request.post(`${API_VIA_WEB}/api/workspaces`, {
    headers: { Cookie: cookie },
    data: { name: 'WS', slug: `ws-${runId}` }
  });
  const ws = await wsRes.json();

  const projRes = await request.post(`${API_VIA_WEB}/api/projects`, {
    headers: { Cookie: cookie },
    data: { workspaceId: ws.id, name: 'Proj', slug: `proj-${runId}` }
  });
  const proj = await projRes.json();

  await request.post(`${API_VIA_WEB}/api/tasks`, {
    headers: { Cookie: cookie },
    data: { projectId: proj.id, title: 'Webhook Test Task' }
  });

  // 5. Wait for worker to process queue
  await page.waitForTimeout(3000);

  // 6. Verify webhook_deliveries record was created (in database)
  const [delivery] = await adminSql`
    SELECT id, event, status_code FROM webhook_deliveries
    WHERE organization_id = ${org.id} AND event = 'task.created'
    LIMIT 1
  `;
  
  expect(delivery).toBeDefined();
  expect(delivery.event).toBe('task.created');
  // Since endpoint is not real (localhost:9999 doesn't exist), status_code might be null (failed) or not set yet
  // The point is: delivery record is created, meaning dispatchEvent was triggered
});
