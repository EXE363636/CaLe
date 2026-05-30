# QA-Automation-1 — Playwright E2E Suite

End-to-end tests for the most important CaLẻ / ShiftNow user flows,
driven through the real UI against a locally-running dev server.

## Why this design

The app is a **localStorage-only Next.js MVP** (no backend). There are
no API routes to seed through, and the demo data lives in the browser
profile. So the suite:

1. **Seeds deterministic state into `localStorage`** via a Playwright
   `addInitScript` that runs *before* the app's `AppHydrator` reads it.
   The snapshot mirrors the `cale.*` keys and `SCHEMA_VERSION` from
   `src/data/persistence.ts`.
2. **Controls time with `page.clock`** for the check-in window and
   attendance flows, so tests never depend on the machine clock and
   there are no flaky `Date.now()` fixtures.
3. **Switches users in-place** (flips `cale.auth` via `localStorage`)
   so runtime writes — an application the worker just created, a
   dispute, a wallet-ledger entry — survive a cross-role hand-off
   within a single test.

## Layout

```
e2e/
  fixtures/
    constants.ts   # STORAGE_KEYS, SCHEMA_VERSION, demo accounts, ANCHOR
    seed.ts        # deterministic snapshot + entity builders
    test.ts        # custom fixtures: seedState / loginAs / gotoApp
  smoke.spec.ts            # plumbing sanity (seed + auth)
  01-apply-approve.spec.ts # Flows 1 & 2
  03-checkin-window.spec.ts# Flow 3 (clock-controlled)
  04-attendance.spec.ts    # Flow 4
  05-checkout-confirm.spec.ts # Flows 5 & 6
  07-disputes.spec.ts      # Flows 7 & 8
  09-repost.spec.ts        # Flow 9
  10-schedule-overlap.spec.ts # Flow 10
  11-already-applied.spec.ts  # Flow 11
  12-timeline.spec.ts      # Flow 12
```

## Demo accounts (seed)

All seed users share the password `demo` (`passwordHash:
"mock-hash:demo"`):

| Role     | Email                 |
|----------|-----------------------|
| Employer | `lien@quanphoha.vn`   |
| Worker   | `an.nguyen@gmail.com` |
| Admin    | `admin@cale.vn`       |

Tests do not log in through the form (except where the flow demands
it) — `loginAs(userId)` seeds the auth pointer directly for speed and
determinism.

## How to run

```bash
# 1. Install browsers once (already run during setup)
npx playwright install chromium

# 2. Run the whole suite (auto-starts `npm run dev` if not running)
npm run test:e2e

# Run a single spec
npx playwright test e2e/03-checkin-window.spec.ts

# Headed / interactive UI mode
npm run test:e2e:ui

# Open the last HTML report (traces, screenshots, videos)
npm run test:e2e:report
```

The dev server is started automatically by Playwright's `webServer`
config (`reuseExistingServer` locally). If you already have
`npm run dev` running on :3000 it is reused.

## Failure artefacts

On failure (and on the first retry in CI) Playwright captures:

- **trace** (`trace: 'retain-on-failure'`) — open with
  `npx playwright show-trace test-results/<…>/trace.zip`
- **screenshot** (`screenshot: 'only-on-failure'`)
- **video** (`video: 'retain-on-failure'`)

All land under `test-results/` and are summarised in the HTML report
(`playwright-report/`). Both directories are git-ignored.

## CI-ready command

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e:ci
```

`test:e2e:ci` uses the `github` + `html` reporters. In CI the config
sets `retries: 2`, `workers: 1`, and `forbidOnly: true`, and always
starts a fresh dev server.

## Time control note

The browser timezone is pinned to `Asia/Ho_Chi_Minh` in
`playwright.config.ts`. Clock-controlled specs install the fake clock
with **ICT wall-clock literals** (e.g. `new Date('2027-06-10T11:50:00')`)
because the app interprets shift `${date}T${startTime}:00` in local
time. The session `lastActivityAt` is stamped far in the future so the
24-hour idle timeout never fires under any controlled clock.

## Coverage map

| # | Flow | Spec |
|---|------|------|
| 1 | Worker applies → employer sees pending | `01-apply-approve` |
| 2 | Employer approves → worker sees approved | `01-apply-approve` |
| 3 | Check-in window: too early / within 15 min / >5 min after | `03-checkin-window` |
| 4 | Check-in → employer mark-present + mismatch warning | `04-attendance` |
| 5 | Check-out → employer sees note + evidence | `05-checkout-confirm` |
| 6 | Confirm completion → worker wallet + rating prompt | `05-checkout-confirm` |
| 7 | Mark absent → worker files absent dispute | `07-disputes` |
| 8 | Employer dispute → worker responds → employer sees it | `07-disputes` |
| 9 | Repost cancelled shift → prefilled form, no auto-publish | `09-repost` |
| 10 | Schedule overlap: adjacent allowed / overlap blocked | `10-schedule-overlap` |
| 11 | Job list shows "Đã ứng tuyển" for applied shift | `11-already-applied` |
| 12 | Timeline logs with seconds, no duplicate on refresh | `12-timeline` |
