# Old-Bug Regression Gate — QA-Stabilization-Automation Phase 1

**Run date:** 2026-05-30
**Mode:** Read-only verification (no code edits in this phase)
**App:** CaLẻ / ShiftNow — Next.js 16 + Zustand 5 + Tailwind v4, localStorage-only mock

## Automated baseline

| Suite | Command | Result |
|-------|---------|--------|
| Unit / property | `npm run test:run` | **395 passed / 395** (29 files), exit 0 |
| Production build | `npm run build` | exit 0, **exactly 28 routes** |
| End-to-end | `npx playwright test --project=chromium` | **34 passed / 34**, exit 0 |

All three gates green. Full E2E log: `qa-exploration/e2e-phase1.log`.

## Old bug-class verification matrix

Each old bug class is verified against the passing E2E spec(s) that exercise it
plus a code read of the backing store/UI logic. Status legend: **Pass** /
**Fail** / **Needs recheck** / **Deferred (product decision)**.

| # | Old bug class | Status | Evidence (E2E spec / code) |
|---|---------------|--------|----------------------------|
| 1 | Duplicate lifecycle badges (Đã hết hạn / Đã huỷ / Đã hoàn thành / Đang diễn ra; no conflicting Đang diễn ra + Sắp bắt đầu + Đang xử lý) | **Pass** | `e2e/14-status-wallet-admin.spec.ts` H5 (≤1 "Đã hủy" in header); employer/worker detail render a single `ShiftPhaseChip`. |
| 2 | Dispute invariant (open dispute → app Disputed + escrow held; confirm-pay hidden; both sides respond; no stale Đang khiếu nại after resolve) | **Pass** | `e2e/13-dispute-invariant.spec.ts` H1+H2; `e2e/07-disputes.spec.ts` Flow 8. Backed by `runLifecycleSync` Step 0. |
| 3 | Wallet / income (worker wallet reconciles with released wages; employer deposit/refund/top-up ledger; no duplicate after refresh) | **Pass** | `e2e/14` H8/H9 (backfill + top-up); `e2e/05-checkout-confirm.spec.ts` Flow 6 (confirm credits wallet). `walletStore.backfillFromHistory` idempotent. |
| 4 | Worker job status (already-applied shift not plain Đang tuyển; CTA = Xem chi tiết / Xem đơn) | **Pass** | `e2e/11-already-applied.spec.ts` Flow 11; `e2e/14` H3. |
| 5 | Expired/cancelled/completed shifts (no wrong live attendance controls; old expired shift not shown active) | **Pass** | `e2e/14` H4 (expired shift shows no "Đánh dấu vắng mặt"); gated by `canMarkAbsent`/`canMarkPresent` + `!shiftTerminal`. |
| 6 | Admin dispute (badge/count; expandable card; full detail; no raw i18n keys) | **Pass** | `e2e/14` H10/H11 (badge, expand, both-sides detail, `body` has no `dispute.category.` raw key). |
| 7 | Repost (Đăng lại từ ca này opens editable form; no auto-publish; suffixes removed; old shift unchanged) | **Pass** | `e2e/09-repost.spec.ts` Flow 9. |
| 8 | Worker absent dispute (absent banner; Khiếu nại vắng mặt; no duplicate) | **Pass** | `e2e/07-disputes.spec.ts` Flow 7. |
| 9 | Post-payment employer rating (worker paid sees required rating prompt; rating clears prompt; employer notified) | **Pass** | `e2e/05-checkout-confirm.spec.ts` Flow 6 (rating banner after pay). |
| 10 | Timeline (logs action with date/time/seconds; refresh does not duplicate) | **Pass** | `e2e/12-timeline.spec.ts` Flow 12 (seconds-resolution timestamp + idempotent on reload). |
| 11 | Notification deep-links (cold-load detail pages work; opens correct detail; no stale state) | **Pass** | `e2e/smoke.spec.ts` (cold-load seeded sessions); `e2e/13` H2 (deep-link reconciled state). Backed by `hydrationStore.hydrated` gate. |

## Gate verdict

**PASS — no old Critical/High regressions.** All 11 old bug classes verified
green via the passing 34-test E2E suite and confirmed in the backing store/UI
code. New-bug implementation (Phase 2) is unblocked.

Note: Phases 2A (past-shift block), 2B (lifecycle reconciliation), and 2D
(custom wallet top-up) were already implemented in the prior QA-Fix-2 session
and are confirmed present in `src/domain/shiftScheduling.ts`,
`src/stores/applicationStore.ts` (`runLifecycleSync` Steps 0/2b), and
`src/components/wallet/WalletPanel.tsx`. They are re-verified by the exploratory
pass (Phase 5) and the access-control pass (Phase 6).
