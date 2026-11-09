// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const ownerEmail = `owner-settings-${runId}@test.local`;
const memberEmail = `member-settings-${runId}@test.local`;
const password = 'password123';
const orgName = `Settings Org ${runId}`;
const newName = `Updated Org ${runId}`;
const newColor = '#ff5733';

test.beforeAll(async () => {
  adminSql = postgres(ADMIN_DB_URL, { max: 1 });
});

test.afterAll(async () => {
  try {
    await adminSql`DELETE FROM organizations WHERE name IN (${orgName}, ${newName})`;
    await adminSql`DELETE FROM users WHERE email IN (${ownerEmail}, ${memberEmail})`;
  } catch (e) { /* ignore */ }
  await adminSql.end();
});

test('admin can update org settings, member cannot', async ({ page, request }) => {
  // 1. Setup Owner + Member
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: ownerEmail, password, name: 'Owner' } });
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: memberEmail, password, name: 'Member' } });

  const [owner] = await adminSql`SELECT id FROM users WHERE email = ${ownerEmail}`;
  const [member] = await adminSql`SELECT id FROM users WHERE email = ${memberEmail}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${owner.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${ownerEmail}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`settings-org-${runId}`}, ${orgName}, ${owner.id})`;
  });

  const [org] = await adminSql`SELECT id FROM organizations WHERE name = ${orgName}`;
  await adminSql`INSERT INTO memberships (organization_id, user_id, role, status) VALUES (${org.id}, ${member.id}, 'member', 'active')`;

  // 2. Login as Owner, update settings via API (UI color picker tidak reliable di Playwright)
  const loginOwner = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email: ownerEmail, password } });
  const ownerCookie = loginOwner.headers()['set-cookie'];
  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, {
    headers: { Cookie: ownerCookie },
    data: { orgId: org.id }
  });

  const patchRes = await request.patch(`${API_VIA_WEB}/api/organizations/current`, {
    headers: { Cookie: ownerCookie },
    data: { name: newName, primaryColor: newColor }
  });
  expect(patchRes.status()).toBe(200);

  // 3. Verify DB persistence
  const [dbOrg] = await adminSql`SELECT name, settings FROM organizations WHERE id = ${org.id}`;
  expect(dbOrg.name).toBe(newName);
  
  // postgres.js returns jsonb as JSON string by default; parse it
  const settings = typeof dbOrg.settings === 'string' ? JSON.parse(dbOrg.settings) : dbOrg.settings;
  expect(typeof settings).toBe('object');
  expect(settings.primaryColor).toBe(newColor);

  // 4. Verify UI shows updated name
  await page.goto('/login');
  await page.fill('input[type="email"]', ownerEmail);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(newName)).toBeVisible();

  // 5. Verify Member cannot update (403)
  const loginMember = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email: memberEmail, password } });
  const memberCookie = loginMember.headers()['set-cookie'];
  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, {
    headers: { Cookie: memberCookie },
    data: { orgId: org.id }
  });

  const memberPatch = await request.patch(`${API_VIA_WEB}/api/organizations/current`, {
    headers: { Cookie: memberCookie },
    data: { name: 'Hacked Name' }
  });
  expect(memberPatch.status()).toBe(403);
});
