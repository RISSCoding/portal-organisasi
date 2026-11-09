// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const email = `finance-${runId}@test.local`;
const password = 'password123';
const orgName = `Finance Org ${runId}`;

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

test('finance flow: create budget, submit expense, approve', async ({ page, request }) => {
  // 1. Setup Owner
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email, password, name: 'Owner' } });
  const [user] = await adminSql`SELECT id FROM users WHERE email = ${email}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${user.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${email}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`finance-org-${runId}`}, ${orgName}, ${user.id})`;
  });

  const [org] = await adminSql`SELECT id FROM organizations WHERE name = ${orgName}`;

  // 2. Login
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(page.getByText(orgName)).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // 3. Go to Finance
  await page.goto('/finance');
  await expect(page.getByRole('heading', { name: 'Keuangan' })).toBeVisible();

  // 4. Create Budget (Scope by unique placeholder)
  const budgetForm = page.locator('form').filter({ has: page.getByPlaceholder('Nama Anggaran') });
  await budgetForm.getByPlaceholder('Nama Anggaran').fill('Kas Kegiatan');
  await budgetForm.getByPlaceholder('Jumlah (Rp)').fill('1000000');
  await budgetForm.getByRole('button', { name: 'Simpan' }).click();

  // Verify budget appears in table
  await expect(page.getByRole('cell', { name: 'Kas Kegiatan' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Kas Kegiatan/ }).getByRole('cell').nth(1)).toHaveText('1,000,000');
  await expect(page.getByRole('row', { name: /Kas Kegiatan/ }).getByRole('cell').nth(2)).toHaveText('0');
  await expect(page.getByRole('row', { name: /Kas Kegiatan/ }).getByRole('cell').nth(3)).toHaveText('1,000,000');

  // 5. Create Expense (Scope by unique placeholder)
  const expenseForm = page.locator('form').filter({ has: page.getByPlaceholder('Judul Pengeluaran') });
  await expenseForm.getByPlaceholder('Judul Pengeluaran').fill('Beli Spidol');
  await expenseForm.getByPlaceholder('Jumlah (Rp)').fill('50000');
  await expenseForm.locator('select').selectOption({ label: 'Kas Kegiatan' });
  await expenseForm.getByRole('button', { name: 'Ajukan' }).click();

  // Verify expense appears and is pending
  await expect(page.getByRole('cell', { name: 'Beli Spidol' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'PENDING' })).toBeVisible();

  // 6. Approve via API
  const loginRes = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email, password } });
  const cookie = loginRes.headers()['set-cookie'];

  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, {
    headers: { Cookie: cookie },
    data: { orgId: org.id }
  });

  const expensesRes = await request.get(`${API_VIA_WEB}/api/finance/expenses/all`, { headers: { Cookie: cookie } });
  const expensesData = await expensesRes.json();
  const expenseId = expensesData[0].id;

  await request.patch(`${API_VIA_WEB}/api/finance/expenses/${expenseId}/status`, {
    headers: { Cookie: cookie },
    data: { status: 'approved' }
  });

  // 7. Verify UI updates
  await page.reload();
  await expect(page.getByRole('cell', { name: 'APPROVED' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Kas Kegiatan/ }).getByRole('cell').nth(2)).toHaveText('50,000');
  await expect(page.getByRole('row', { name: /Kas Kegiatan/ }).getByRole('cell').nth(3)).toHaveText('950,000');
});
