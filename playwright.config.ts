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
// E2E chạy trên CỔNG RIÊNG (mặc định 3100), tách khỏi dev server thường ở 3000.
// Lý do: `reuseExistingServer` sẽ tái dùng BẤT KỲ server nào đang chạy ở url —
// nếu 3000 đang chạy `npm run dev` ở mode `supabase` (đúng .env.local), bộ E2E
// (cần mode `local` + seed/localStorage) sẽ bị nhầm sang server đó và mọi test
// văng về /login. Cổng riêng đảm bảo Playwright luôn tự khởi động server `local`.
const E2E_PORT = process.env.E2E_PORT ?? '3100';
const E2E_HOST = `http://localhost:${E2E_PORT}`;

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
    baseURL: E2E_HOST,
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
    url: E2E_HOST,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    // Bộ E2E này dùng seed + session localStorage nên PHẢI chạy ở data mode
    // `local`. Pin ở đây để dev server của Playwright không đọc nhầm
    // NEXT_PUBLIC_DATA_MODE=supabase từ .env.local (Next ưu tiên process.env hơn
    // .env.local). Cổng riêng E2E_PORT tách khỏi dev server 3000 đang chạy.
    // E2E Supabase thật là bộ riêng (test:e2e:supabase).
    env: { NEXT_PUBLIC_DATA_MODE: 'local', PORT: E2E_PORT },
  },
});
