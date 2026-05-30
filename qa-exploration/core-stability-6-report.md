# CORE-STABILITY-6 — Stability Pass Report

**Date:** 2026-05-30
**Status:** Complete. All targeted bugs fixed, all gates green.
**App:** CaLẻ / ShiftNow (localStorage-only Next.js 16 MVP, mock-only).

This task bundled eight parts: worker same-route section intent (1),
notification dedup + timestamps (2), wallet withdrawal (3), employer
deposit insufficient-balance guard (4), staff-supply concept (5, defer),
chat readiness (6, defer), checklist A–M regression (7), and
test/pentest + reports (8).

---

## 1. Root cause

- **Part 1 (worker section intent):** the worker UserMenu shortcut and
  the dashboard read tab/modal/section intent **once on mount**. When the
  user was already on `/worker/dashboard`, a same-route click changed the
  URL but Next.js did not remount, so the applied-jobs section never
  scrolled/opened. (Same class of bug as NAV-INTENT-DEEPLINK-FIX-1, now
  extended to a **section** target.)
- **Part 2 (notifications):** `notificationStore.push` had no
  deduplication, so a repeated lifecycle pass for the same event could
  push duplicate notifications; and the notification UI rendered no
  date/time, so users could not tell when an event fired.
- **Part 3 (withdrawal):** the wallet supported top-up only — there was
  no demo cash-out path or store guard.
- **Part 4 (deposit guard):** `simulateDeposit` did not check the wallet
  balance before mutating, so an underfunded employer could enter an
  inconsistent deposit state.
- **Build type error (found during validation):** Part 3's withdraw
  notification was authored with `kind: 'UserTopUp'`, which is **not** a
  member of the `NotificationKind` union — `next build` TypeScript check
  failed. Fixed by adding a real `UserWithdrawal` kind.

## 2. Global intent/deeplink strategy (Part 1)

Reused the existing same-route event mechanism rather than inventing a
new one. `DashboardModalEventDetail` gained a `section` field;
`navigateWithIntent` / `handleNotificationClick` dispatch the existing
`DASHBOARD_MODAL_EVENT` for same-route section intents. A new
`useSectionFromQuery` hook reads `?section=` on cold load. The worker
dashboard's applied-jobs section got `id="worker-applications-section"`,
`scroll-mt-24`, and a **repeat-safe flash-ring** (`applicationsHighlight`
state cleared and re-armed via `requestAnimationFrame`, so a second click
re-triggers the highlight). Wired through both `useSectionFromQuery`
(cold load) and `useDashboardModalEvents` (same-route). The handler only
scrolls/flashes — it never mutates store state, so repeat clicks create
no duplicate side effects.

## 3. Files changed

- `src/types/index.ts` — added `UserWithdrawal` to `NotificationKind`;
  (Part 3) `UserWithdrawal` `WalletLedgerEntryKind`; (Part 2) optional
  `dedupeKey` on `Notification`; (Part 1) `section` on
  `DashboardModalEventDetail`.
- `src/stores/notificationStore.ts` — `push()` dedupes on
  `(userId, dedupeKey)`.
- `src/stores/walletStore.ts` — `withdraw(userId, amount, note)` →
  `Result<WalletLedgerEntry, 'INVALID_AMOUNT' | 'INSUFFICIENT_BALANCE'>`.
- `src/stores/shiftStore.ts` — `simulateDeposit` guards
  `balance < depositAmount` before any mutation (`INSUFFICIENT_BALANCE`).
- `src/components/wallet/WalletPanel.tsx` — `allowWithdraw` + "Rút tiền"
  action (balance>0) + modal + `UserWithdrawal` notification.
- `src/components/layout/NotificationBell.tsx`,
  `src/components/layout/DashboardNotificationCard.tsx` — render
  `formatLogDateTime(createdAt)` (newest-first in the bell).
- `src/lib/format.ts` — shared `formatLogDateTime` (vi-VN,
  `second: '2-digit'`).
- `src/lib/useModalFromQuery.ts` — `useSectionFromQuery`.
- `src/lib/notificationAction.ts` — `section` intent handling.
- `src/app/worker/dashboard/page.tsx` — applied section id + scroll-mt +
  flash-ring + `focusApplications` wiring.
- `src/i18n/vi.ts` — `wallet.withdraw.*`, `wallet.kind.UserWithdrawal`,
  `notification.kind.UserWithdrawal`,
  `shift.create.error.INSUFFICIENT_BALANCE`.
- Tests: `e2e/20-core-stability-6.spec.ts`,
  `src/__tests__/coreStability6.test.ts`,
  `src/__tests__/timeTravelLifecycle.test.ts`,
  `src/__tests__/qaStabilizationStoreGuards.test.ts`,
  `phase10cStab1Batch4 / Batch4B / Batch2` (fund-first updates).

No new routes (28 invariant held). No new dependencies.

## 4. Employer actions fixed / verified

- **Deposit blocked on insufficient balance (Part 4):** creating a shift
  with an empty wallet now shows "Số dư ví không đủ để đặt cọc. Vui lòng
  nạp thêm tiền." and produces **no** ghost published shift. Funding the
  wallet first lets the deposit succeed.
- **Wallet withdrawal (Part 3):** employer can cash out (balance>0) via
  "Rút tiền"; balance + ledger update; over-balance/invalid blocked.
- Employer same-route UserMenu intents from NAV-INTENT-DEEPLINK-FIX-1
  re-verified unbroken.

## 5. Worker actions fixed / verified

- **"Việc đã ứng tuyển" section intent (Part 1):** focuses + scrolls +
  flash-highlights the applied-jobs section while already on the
  dashboard, and again on repeat click.
- **Wallet withdrawal (Part 3):** worker cash-out works; ledger shows the
  negative "Rút tiền khỏi ví" line; over-balance shows "Số dư không đủ
  để rút tiền.".
- **Notifications (Part 2):** timestamped (date+time+seconds, vi-VN
  time-first) and deduped.

## 6. Admin actions fixed / verified

No admin-specific bug in this task. Admin same-route tab intents
(disputes/users/shifts) from NAV-INTENT-DEEPLINK-FIX-1 re-verified by the
full E2E run (`e2e/19-intent-deeplink.spec.ts` green).

## 7. Tests added/updated

- **Unit** `src/__tests__/coreStability6.test.ts` — withdrawal guards
  (exact/over-balance/zero-negative-NaN-Infinity/note) + notification
  dedupe & ordering & createdAt.
- **E2E** `e2e/20-core-stability-6.spec.ts` — Part 1 (section intent,
  repeat-safe), Part 3 (worker withdraw + ledger, over-balance blocked,
  employer withdraw), Part 4 (deposit blocked when empty; succeeds after
  top-up; no ghost shift), Part 8 (unauth redirect; withdrawal-note XSS
  inert).
- **Updated** `phase10cStab1Batch4 / Batch4B / Batch2` to fund wallets
  before depositing (Part 4 guard).
- **Time-travel** `timeTravelLifecycle` / `qaStabilizationStoreGuards`
  re-verified for dedupe idempotency.

## 8. Checklist A–M verification status

`qa-exploration/checklist-coverage-matrix.md` updated:
- **I (Wallet + ledger):** added withdrawal (cash-out) + over-balance/
  invalid guard + employer deposit insufficient-balance coverage
  (E2E + Unit).
- **M (Notifications/deep-links):** added worker section intent
  (scroll + flash-ring, repeat-safe), notification timestamp
  (date+time+seconds), and dedupe coverage.
No checklist item regressed; no uncovered Critical/High gaps.

## 9. Calendar availability + staff-supply + chat status

- **Calendar availability (prior):** deferred —
  `qa-exploration/calendar-availability-proposal.md`.
- **Staff-supply / agency (Part 5):** **deferred (analysis only)** —
  new top-level role with money-split + multi-party-dispute implications;
  conflicts with the stability guardrail against role/business-logic
  changes. `qa-exploration/staff-supply-proposal.md`.
- **Chat / contact (Part 6):** **deferred** — communication needs met by
  timestamped notifications + structured disputes; if later needed, scope
  to dispute-only replies. `qa-exploration/chat-readiness-decision.md`.

## 10. Unit / build / E2E / time results

- `npm run test:run`: **420 passed / 420** (34 files).
- `npm run build`: **clean, 28 routes** (TypeScript type-check passes —
  the `UserTopUp` type error is fixed).
- `npx playwright test --project=chromium`: **94 passed / 94**
  (`qa-exploration/e2e-cs6-final.log`).
- `npm run test:time`: **22 passed / 22**.
- `npm audit`: **2 moderate** (postcss via next) — deferred (see
  `core-stability-6-security.md`).

## 11. Remaining deferred items

- Staff-supply / agency actor (Part 5) — own spec.
- In-app chat / contact (Part 6) — dispute-only replies if later needed.
- Calendar availability + recommendation — own spec.
- postcss/next moderate advisory — coordinated Next.js upgrade.
- (Pre-existing) server-side authorization (mock-only MVP),
  admin partial-release dispute outcomes, auto-no-show penalty policy.

## 12. Manual QA readiness verdict

**Ready.** All five targeted bugs are fixed (including the build-blocking
`UserTopUp` type error caught during validation), money-handling paths
(withdrawal + deposit) are guarded and property/E2E covered, notification
timestamp + dedupe verified (vi-VN renders time-first "HH:mm:ss
DD/MM/YYYY" — the earlier read-only probe's `false` was a probe-regex
artifact, confirmed by inspecting the rendered DOM), and all four gates
are green (unit 420, build 28 routes, E2E 94, time 22). Deferred items
are documented proposals, not regressions.
