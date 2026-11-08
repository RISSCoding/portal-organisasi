// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const ADMIN_DB_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/portal';
const API_VIA_WEB = 'http://localhost:3001';

let adminSql;
const runId = Date.now();
const emailA = `ownera-file-${runId}@test.local`;
const emailB = `ownerb-file-${runId}@test.local`;
const password = 'password123';
const orgAName = `File Org A ${runId}`;
const orgBName = `File Org B ${runId}`;

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) throw new Error('No cookie returned');
  const header = setCookieHeader;
  if (Array.isArray(header)) return header[0];
  return header;
}

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

test('attachment isolation: cross-org download denied', async ({ request }) => {
  // 1. Register both users
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: emailA, password, name: 'Owner A' } });
  await request.post(`${API_VIA_WEB}/api/auth/register`, { data: { email: emailB, password, name: 'Owner B' } });

  const [userA] = await adminSql`SELECT id FROM users WHERE email = ${emailA}`;
  const [userB] = await adminSql`SELECT id FROM users WHERE email = ${emailB}`;

  // 2. Create orgs
  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${userA.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${emailA}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`org-a-file-${runId}`}, ${orgAName}, ${userA.id})`;
  });

  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${userB.id}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${emailB}, true)`;
    await tx`SELECT set_config('app.current_organization_id', '', true)`;
    await tx`SELECT app.create_organization_with_owner(${`org-b-file-${runId}`}, ${orgBName}, ${userB.id})`;
  });

  // 3. Login both users
  const loginA = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email: emailA, password } });
  const cookieA = extractCookie(loginA.headers()['set-cookie']);

  const loginB = await request.post(`${API_VIA_WEB}/api/auth/login`, { data: { email: emailB, password } });
  const cookieB = extractCookie(loginB.headers()['set-cookie']);

  const [orgA] = await adminSql`SELECT id FROM organizations WHERE name = ${orgAName}`;
  const [orgB] = await adminSql`SELECT id FROM organizations WHERE name = ${orgBName}`;

  // 4. Switch to respective orgs
  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, { headers: { Cookie: cookieA }, data: { orgId: orgA.id } });
  await request.post(`${API_VIA_WEB}/api/auth/switch-org`, { headers: { Cookie: cookieB }, data: { orgId: orgB.id } });

  // 5. User A creates workspace -> project -> task
  const wsRes = await request.post(`${API_VIA_WEB}/api/workspaces`, { headers: { Cookie: cookieA }, data: { name: `WS ${runId}`, slug: `ws-file-${runId}` } });
  const ws = await wsRes.json();

  const projRes = await request.post(`${API_VIA_WEB}/api/projects`, { headers: { Cookie: cookieA }, data: { workspaceId: ws.id, name: `Proj ${runId}`, slug: `proj-file-${runId}` } });
  const proj = await projRes.json();

  const taskRes = await request.post(`${API_VIA_WEB}/api/tasks`, { headers: { Cookie: cookieA }, data: { projectId: proj.id, title: 'Task with File' } });
  const task = await taskRes.json();

  // 6. User A generates upload URL
  const uploadUrlRes = await request.post(`${API_VIA_WEB}/api/attachments/upload-url`, {
    headers: { Cookie: cookieA },
    data: {
      fileName: 'secret.pdf',
      mimeType: 'application/pdf',
      targetId: task.id,
      targetType: 'task',
    },
  });
  expect(uploadUrlRes.status()).toBe(201);
  const { uploadUrl, storageKey } = await uploadUrlRes.json();
  expect(uploadUrl).toContain('X-Amz-Signature');
  expect(storageKey).toContain(orgA.id);

  // 7. User A confirms the upload (simulasi; MinIO tidak perlu menyala)
  const confirmRes = await request.post(`${API_VIA_WEB}/api/attachments/confirm`, {
    headers: { Cookie: cookieA },
    data: {
      fileName: 'secret.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      storageKey,
      targetId: task.id,
      targetType: 'task',
    },
  });
  expect(confirmRes.status()).toBe(201);
  const attachment = await confirmRes.json();
  expect(attachment.id).toBeTruthy();

  // 8. User B tries to download User A's attachment (should be 404 because RLS hides it)
  const downloadRes = await request.get(`${API_VIA_WEB}/api/attachments/${attachment.id}/download`, {
    headers: { Cookie: cookieB },
  });
  expect(downloadRes.status()).toBe(404);

  // 9. User A can download their own attachment (200)
  const ownerDownloadRes = await request.get(`${API_VIA_WEB}/api/attachments/${attachment.id}/download`, {
    headers: { Cookie: cookieA },
  });
  expect(ownerDownloadRes.status()).toBe(200);
  const downloadData = await ownerDownloadRes.json();
  expect(downloadData.downloadUrl).toContain('X-Amz-Signature');
});
