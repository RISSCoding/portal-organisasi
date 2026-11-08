// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { createHash } from 'node:crypto';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const ownerEmail = `owner-inv-${runId}@test.local`;
const inviteeEmail = `invitee-inv-${runId}@test.local`;
const password = 'password123';
const orgName = `Inv Org ${runId}`;
const rawToken = `token-${runId}`;

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

test('invite acceptance UI flow', async ({ page, request }) => {
  // Debug: Listen to console and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // 1. Setup via API + Admin SQL
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: ownerEmail, password, name: 'Owner' } });
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: inviteeEmail, password, name: 'Invitee' } });

  const [owner] = await adminSql`SELECT id FROM users WHERE email = ${ownerEmail}`;
  const [invitee] = await adminSql`SELECT id FROM users WHERE email = ${inviteeEmail}`;

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${owner.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${ownerEmail}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`inv-org-${runId}`}, ${orgName}, ${owner.id})`;
  });

  const [org] = await adminSql`SELECT id FROM organizations WHERE name = ${orgName}`;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 86400000);

  await adminSql`
    INSERT INTO invitations (organization_id, email, role, token_hash, invited_by_user_id, expires_at)
    VALUES (${org.id}, ${inviteeEmail}, 'member', ${tokenHash}, ${owner.id}, ${expiresAt})
  `;

  // 2. Login as Invitee
  await page.goto('/login');
  await page.fill('input[type="email"]', inviteeEmail);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard$/);

  // 3. Go to Invite Link
  await page.goto(`/invitations/accept?token=${rawToken}`);

  // 4. Verify Success (Tambah timeout lebih lama)
  try {
    await expect(page.getByText('Undangan berhasil diterima!')).toBeVisible({ timeout: 15000 });
  } catch (e) {
    console.log('=== PAGE CONTENT ON FAILURE ===');
    console.log(await page.content());
    throw e;
  }
  
  // 5. Verify redirect to Dashboard and Org is visible
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 });
  await expect(page.getByText(orgName)).toBeVisible();
});
