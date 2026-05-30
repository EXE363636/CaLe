import { defineConfig, devices } from '@playwright/test';

/**
 * QA-Automation-1 — Playwright E2E configuration for CaLẻ / ShiftNow.
 *
 * The app is a localStorage-only Next.js MVP (no backend). E2E tests
 * seed deterministic state into `localStorage` via an idempotent init
 * script (see `e2e/fixtures/seed.ts`) and drive the real UI. Time-
 * sensitive flows (check-in window) use Playwright's `page.clock`.
 *
 * Trace, screenshot, and video are captured on failure so Kiro (and
 * CI) can inspect what went wrong via `npx playwright show-report`.
 */
export default defineConfig({
  testDir: './e2e',
  // Each spec seeds its own deterministic state, so files are
  // isolated. Run files in parallel; serialise tests inside a file
  // only where a spec opts in with `test.describe.serial`.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 7_500 },

  use: {
    baseURL: 'http://localhost:3000',
    // Capture artefacts on first retry / failure so a green local run
    // stays fast but a failure is fully debuggable.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The app renders Vietnamese copy; keep the locale stable so
    // Intl.DateTimeFormat output is deterministic across machines.
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start the Next.js dev server. Reuse an already-running
  // instance locally so iteration is fast; CI always starts fresh.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
