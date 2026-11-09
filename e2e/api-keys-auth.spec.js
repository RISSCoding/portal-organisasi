// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const email = `keys-${runId}@test.local`;
const password = 'password123';
const orgName = `Keys Org ${runId}`;

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

test('api key authentication works and respects isolation', async ({ page, request }) => {
  // 1. Setup Owner
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email, password, name: 'Owner' } });
  const [user] = await adminSql`SELECT id FROM users WHERE email = ${email}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`keys-org-${runId}`}, ${orgName}, ${user.id})`;
  });

  // 2. Login via UI
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(page.getByText(orgName)).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // 3. Create API Key via UI
  await page.goto('/api-keys');
  await page.fill('input[placeholder="Nama API Key (misal: Script LPJ)"]', 'Test Key');
  await page.click('button:has-text("Generate Key")');

  // Extract the raw key from the UI
  const keyElement = page.locator('code');
  await expect(keyElement).toBeVisible();
  const rawKey = await keyElement.innerText();
  expect(rawKey).toContain('pk_live_');

  // 4. Use the API Key to access an endpoint (Bypass Cookie)
  // We use request.get() which doesn't have the browser's cookie jar by default
  const res = await request.get(`${API_VIA_WEB}/api/organizations/me`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toHaveLength(1);
  expect(data[0].name).toBe(orgName);

  // 5. Verify last_used_at is updated
  await page.reload();
  const lastUsedRow = page.getByRole('row', { name: /Test Key/ });
  await expect(lastUsedRow).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/); // Matches date format
});
