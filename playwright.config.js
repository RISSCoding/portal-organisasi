// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'bun run --filter "@portal/api" start',
      url: 'http://localhost:3000/api/docs',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun run --filter "@portal/web" build && bun run --filter "@portal/web" start',
      url: 'http://localhost:3001',
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
