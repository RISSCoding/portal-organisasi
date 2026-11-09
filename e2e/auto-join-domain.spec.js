// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const ownerEmail = `owner-auto-${runId}@test.local`;
const inviteeEmail = `new-user-${runId}@kampus.test`;
const password = 'password123';
const orgName = `Auto Join Org ${runId}`;
const domainToAdd = 'kampus.test';

test.beforeAll(async () => {
  adminSql = postgres(ADMIN_DB_URL, { max: 1 });
});

test.afterAll(async () => {
  try {
    await adminSql`DELETE FROM organizations WHERE name = ${orgName}`;
    await adminSql`DELETE FROM users WHERE email IN (${ownerEmail}, ${inviteeEmail})`;
  } catch (e) { /* ignore */ }
  await adminSql.end();
});

test('user with matching domain auto-joins organization', async ({ page, request }) => {
  // 1. Setup Owner
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: ownerEmail, password, name: 'Owner' } });
  const [owner] = await adminSql`SELECT id FROM users WHERE email = ${ownerEmail}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${owner.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${ownerEmail}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`auto-join-org-${runId}`}, ${orgName}, ${owner.id})`;
  });

  // 2. Login Owner
  await page.goto('/login');
  await page.fill('input[type="email"]', ownerEmail);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(orgName)).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // 3. Add Domain via UI
  await page.goto('/domains');
  await page.fill('input[placeholder="Domain (misal: kampus.ac.id)"]', domainToAdd);
  await page.getByRole('button', { name: 'Tambah Domain' }).click();
  
  // Verify domain added
  await expect(page.getByRole('cell', { name: `@${domainToAdd}` })).toBeVisible();

  // 4. Register New User with matching domain (via API)
  const registerRes = await request.post(`${API_VIA_WEB}/api/auth/register`, {
    data: { email: inviteeEmail, password, name: 'Auto Join User' },
  });
  expect(registerRes.status()).toBe(201);

  // 5. Verify new user is automatically a member of the org
  const [newUser] = await adminSql`SELECT id FROM users WHERE email = ${inviteeEmail}`;
  const [org] = await adminSql`SELECT id FROM organizations WHERE name = ${orgName}`;
  
  const [membership] = await adminSql`
    SELECT role FROM memberships
    WHERE user_id = ${newUser.id} AND organization_id = ${org.id}
  `;
  
  expect(membership).toBeDefined();
  expect(membership.role).toBe('member');
});
