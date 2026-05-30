# UI-REFRESH-FROM-BOLT-REFERENCE-1 — Batch 5 Final Visual QA + Regression Report

**Date:** 2026-06-01
**App:** CaLẻ / Now (localStorage-only Next.js 16 MVP).
**Scope:** Full visual QA + regression sweep after UI-refresh Batches 1–4.
No new features. No business-logic changes. No routes changed.

---

## 1. Visual QA summary

The four refresh batches are visually cohesive and regression-free:

- **Batch 1** — shared design system: `shadow-card` / `shadow-card-hover`
  / `shadow-modal` tokens + `PageShell` / `SectionHeader` / `StatCard` /
  `MetricGrid` primitives; `Card` + `Modal` elevation refined app-wide.
- **Batch 2** — worker pages (dashboard tiles, reputation modal widened to
  2-column, profile widened + skill grid, job list, schedule, shift detail).
- **Batch 3** — employer pages (dashboard tiles, multi-section create-shift
  form, applicant-bucket panels, schedule, profile widened to `PageShell`).
- **Batch 4** — admin dashboard + dispute cards (status accent + amount
  held) + reported reviews, wallet ledger rows, notification dropdown.

The headline programmatic result: a **horizontal-overflow sweep across all
12 major routes × 6 viewports (1920/1536/1440/1366/1280/1024) found ZERO
offenders.** Desktop layouts use the full width band consistently; nothing
reads as a narrow mobile column on desktop.

This batch made **no code changes** — the sweep confirmed the Batches 1–4
output is already clean, so there were no visual regressions to fix.

## 2. Pages checked

Programmatic overflow sweep (12 routes × 6 viewports = 72 checks, all pass):
`/`, `/worker/dashboard`, `/shifts`, `/shifts/[id]`, `/worker/schedule`,
`/worker/profile`, `/employer/dashboard`, `/employer/shifts/new`,
`/employer/shifts/[id]`, `/employer/schedule`, `/employer/profile`,
`/admin/dashboard`.

Screenshot + manual review (1440×900) of all 25 target surfaces incl.
modals: home, worker dashboard / job list / shift detail / schedule /
profile, reputation modal, wallet/history modal, employer dashboard /
create-shift / shift detail / schedule / profile, admin dashboard /
disputes / users / shifts / verification, reported reviews, notification
dropdown, top-up / withdraw modal, insufficient-balance modal, dispute
dialog, rating / review-report dialog.

| # | Visual QA requirement | Result |
|---|---|---|
| 1 | No narrow mobile-looking layouts on desktop | ✅ PageShell / max-w bands on every page |
| 2 | No horizontal overflow | ✅ 0/72 offenders in the sweep |
| 3 | Header/nav does not overlap | ✅ `18-header-nav` specs pass 1280–3840px |
| 4 | Desktop pages use width properly | ✅ |
| 5 | Cards have consistent spacing + shadow | ✅ `shadow-card` standardized |
| 6 | Modals not too narrow on desktop | ✅ reputation `max-w-4xl`, wallet `max-w-xl`, dialogs `max-w-lg`+ |
| 7 | Long lists scroll inside modal/body | ✅ wallet ledger `max-h-[60vh]`, reputation history `max-h-[22rem]` |
| 8 | Skill section grid + visible for 0-XP worker | ✅ `buildSkillDisplayList` grid, default cards at 0 XP |
| 9 | Reputation modal wide, not single column | ✅ `lg:grid-cols-2` |
| 10 | Employer applicant buckets readable | ✅ panel surfaces + pill counts |
| 11 | Admin dispute cards scannable | ✅ status accent + amount-held line |
| 12 | Wallet ledger rows readable | ✅ two-column, right-aligned `tabular-nums` |
| 13 | Notifications show timestamp + distinguishable | ✅ `formatLogDateTime` + unread tint/dot |
| 14 | Badge colors consistent | ✅ shared `Badge` tones unchanged |
| 15 | Vietnamese copy not broken | ✅ only additive section/label keys added |
| 16 | No missing buttons / hidden CTAs | ✅ all action buttons preserved (E2E confirms) |
| 17 | Tablet/mobile still readable | ✅ 1024px in sweep + tablet nav specs pass |

## 3. Issues found / fixed

**No visual regressions found.** The overflow sweep returned `none` at all
six viewports, and the screenshot review of all 25 surfaces showed
consistent elevation, spacing, modal widths, and preserved CTAs. No fixes
were required in this batch. See `ui-refresh-final-bugs.json`.

## 4. Screenshots (1440×900)

- `qa-exploration/shots/ui-refresh-final-home.png`
- `qa-exploration/shots/ui-refresh-final-worker-dashboard.png`
- `qa-exploration/shots/ui-refresh-final-worker-profile.png`
- `qa-exploration/shots/ui-refresh-final-worker-schedule.png`
- `qa-exploration/shots/ui-refresh-final-employer-dashboard.png`
- `qa-exploration/shots/ui-refresh-final-employer-create-shift.png`
- `qa-exploration/shots/ui-refresh-final-employer-shift-detail.png`
- `qa-exploration/shots/ui-refresh-final-admin-dashboard.png`
- `qa-exploration/shots/ui-refresh-final-notifications.png`
- `qa-exploration/shots/ui-refresh-final-wallet-modal.png`
- `qa-exploration/shots/ui-refresh-final-reputation-modal.png`

(Batch 2–4 per-page screenshots also retained under `qa-exploration/shots/`.)

## 5. Regression checklist result

| # | Core regression requirement | Result | Evidence |
|---|---|---|---|
| 1 | Same shift status consistent across worker/employer/card/detail | ✅ | `25-core-stability-10` + `ShiftLifecycleBadge` untouched |
| 2 | Check-in does not start shift early | ✅ | time-travel suite (22/22) |
| 3 | Employer mark-present does not start shift early | ✅ | time-travel suite |
| 4 | Checkout does not appear before shift end | ✅ | `canCheckOut` untouched; time-travel |
| 5 | Employer sees both present/absent where valid | ✅ | `01-apply-approve`, shift-detail buttons intact |
| 6 | Draft separate from real shift | ✅ | `22-core-stability-8` |
| 7 | Worker cannot see draft | ✅ | draft excluded from listing/schedule |
| 8 | Insufficient-balance modal still works | ✅ | `20-core-stability-6` Part 4, `21-core-stability-7` |
| 9 | Wallet top-up / withdraw still works | ✅ | `20-core-stability-6` Part 3, `16-wallet-topup` |
| 10 | Notifications still deeplink | ✅ | `19-intent-deeplink`, `21-core-stability-7` |
| 11 | Same-route intents still work | ✅ | `19-intent-deeplink` (worker/employer/admin) |
| 12 | Reviews sorting / reporting still works | ✅ | reported-reviews resolve untouched |
| 13 | Schedule availability still works | ✅ | `23-core-stability-9`, `24-product-ux-fix` |
| 14 | Skill progression still visible | ✅ | `23/24` skill tests |

## 6. Test results

- `npm run test:run`: **544 passed / 544**.
- `npm run build`: **clean, 28 routes** (invariant held).
- `npm run test:e2e` (chromium): **112 passed / 112**.
- `npm run test:time`: **22 passed / 22**.
- Horizontal-overflow sweep: **0 offenders / 72 checks** (12 routes × 6
  viewports).

## 7. Remaining visual issues

None blocking. Pre-existing, intentional limitations (documented in
`VISUAL_QA.md`, unchanged by this work):
- Calendar Week/Day grid scrolls horizontally **inside its own panel**
  below ~768px (intentional; Agenda view is the mobile-friendly default).
  This is a contained inner scroll, not page-level overflow — the sweep
  measures `documentElement` and found no page overflow.
- Mock-only data; no real product photography.
- Admin row layouts stay table-style (intentional "serious/functional"
  admin direction) — now with refined card elevation + dispute accents.

## 8. Ready to commit?

**YES — the UI refresh is ready to commit.**
- App logic intact (544 unit + 112 E2E + 22 time-travel all green).
- No route lost (28-route invariant held).
- No core feature removed; all CTAs/buttons preserved.
- Lifecycle / attendance / checkout / draft / wallet / dispute /
  notification logic unchanged.
- Homepage present and polished.
- UI visibly improved with consistent elevation + spacing.
- Desktop layouts use full width; zero horizontal overflow at
  1920/1536/1440/1366/1280/1024.

The user commits explicitly — no auto-commit was performed.
