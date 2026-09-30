import { defineConfig, devices } from '@playwright/test';
import { PORTS } from './e2e/support/env';

/**
 * End-to-end smoke tests (plan P0-10): the three apps together, on their own
 * ports, against a seeded in-memory database (e2e/support/api-server.js).
 * Production builds, so what runs is what deploys. Stripe and mail are off.
 *
 *   npm run test:e2e               # build + run
 *   E2E_SKIP_BUILD=1 npm run test:e2e   # reuse the last e2e builds
 *
 * The builds bake the e2e API URL in (NEXT_PUBLIC_* / VITE_*): run
 * `npm run build` again before deploying from the same checkout.
 */
const skipBuild = process.env.E2E_SKIP_BUILD === '1';
const api = `http://localhost:${PORTS.api}`;
const website = `http://localhost:${PORTS.website}`;
const dashboard = `http://localhost:${PORTS.dashboard}`;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/support/api-server.js',
      url: `${api}/api/ready`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: skipBuild
        ? `npm run start --workspace=apps/website -- -p ${PORTS.website}`
        : `npm run build --workspace=apps/website && npm run start --workspace=apps/website -- -p ${PORTS.website}`,
      url: website,
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: api,
        API_INTERNAL_URL: api,
        NEXT_PUBLIC_SITE_URL: website,
        NEXT_PUBLIC_DASHBOARD_URL: dashboard,
      },
    },
    {
      command: skipBuild
        ? `npm run preview --workspace=apps/dashboard -- --port ${PORTS.dashboard} --strictPort`
        : `npm run build --workspace=apps/dashboard && npm run preview --workspace=apps/dashboard -- --port ${PORTS.dashboard} --strictPort`,
      url: dashboard,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: `${api}/api` },
    },
  ],
});
