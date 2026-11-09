// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const email = `hr-${runId}@test.local`;
const password = 'password123';
const orgName = `HR Org ${runId}`;

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

test('HR leave request flow', async ({ page, request }) => {
  // 1. Setup
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email, password, name: 'Employee' } });
  const [user] = await adminSql`SELECT id FROM users WHERE email = ${email}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`hr-org-${runId}`}, ${orgName}, ${user.id})`;
  });

  // 2. Login
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  // TUNGGU AUTO-SWITCH SELESAI
  await expect(page.getByText(orgName)).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // 3. Go to HR Leaves
  await page.goto('/hr/leaves');
  await expect(page.getByText('Sisa Kuota Cuti:')).toBeVisible();
  await expect(page.getByText('12 Hari')).toBeVisible();

  // Intercept API response to see what the server says
  page.on('response', async (response) => {
    if (response.url().includes('/api/hr/leaves') && response.request().method() === 'POST') {
      console.log('POST /api/hr/leaves status:', response.status());
      console.log('POST /api/hr/leaves body:', await response.text());
    }
  });

  // 4. Submit a leave request
  await page.selectOption('select', 'annual');
  await page.fill('input[type="date"]', '2026-12-01');
  await page.fill('input[type="date"] >> nth=1', '2026-12-03');
  await page.fill('textarea', 'Liburan akhir tahun');
  await page.getByRole('button', { name: 'Ajukan' }).click();

  // 5. Verify it appears in the history
  await expect(page.getByText('2026-12-01 s/d 2026-12-03')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Liburan akhir tahun')).toBeVisible();
  await expect(page.getByText('PENDING')).toBeVisible();
});
