# Manual Checklist A–M Coverage Matrix — QA-Stabilization-Automation Phase 3

**Generated:** 2026-05-30
**Last updated:** 2026-05-31 (CORE-STABILITY-9 — role-aware attendance
copy, checkout timing lock, attendance state machine, skill XP/levels,
availability blocks + recommendations, backend status note)
**App:** CaLẻ / ShiftNow (localStorage-only Next.js 16 MVP)

Coverage types:
- **E2E** = automated Playwright spec
- **Unit** = vitest unit/domain/property test
- **Manual** = manual-only visual QA (recorded in `VISUAL_QA.md`)
- **Deferred** = intentionally not built (reason given)
- **Not covered** = gap (reason given)

Every checkbox is mapped individually.

---

## Checklist A — Repost old/cancelled/expired/completed shift

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Does not auto-publish | E2E | `e2e/09-repost.spec.ts` — "repost navigates to a prefilled new-shift form without auto-publishing" | Asserts shift count unchanged + source still Cancelled |
| Opens posting form | E2E | `e2e/09-repost.spec.ts` (URL → `/employer/shifts/new?from=`) | |
| Prefills old content | E2E | same — title prefilled | |
| Removes cancelled/expired suffixes | E2E | same — "(đã huỷ)" suffix stripped | |
| Clears/requires new date/time | E2E | same — date input asserted empty | Future date/time enforced by past-shift validator on submit |
| Allows editing | Manual | `VISUAL_QA.md` | Form is the standard editable ShiftForm |
| Old shift unchanged | E2E | `e2e/09-repost.spec.ts` — srcStatus stays Cancelled | |
| New shift uses normal deposit flow | Unit + Manual | `shiftStore.repostFromShift` (Batch 3) + new-shift deposit path | New shift created on submit via simulateDeposit |
| Old timeline logs repost start with seconds | Unit | `phase10cStab1Batch2.test.ts` (repost lineage / `CreatedFromRepost`) | Timeline seconds verified by Flow 12 pattern |

## Checklist B — Shift time status

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Before start: not "Đang diễn ra" | Unit | `phase10cStab1Batch2.test.ts` (suggestShiftStatus / getShiftDisplayPhase) | |
| Early check-in window: "Sắp bắt đầu" / "Có thể check-in" | Unit + E2E | `getShiftDisplayPhase` + `e2e/03-checkin-window.spec.ts` (within-window) | |
| No conflicting badges | E2E | `e2e/14-status-wallet-admin.spec.ts` H5 | Single ShiftPhaseChip |
| Exact start: becomes ongoing | Unit | `phase10cStab1.test.ts` / Batch 2 lifecycle (21:02–21:03 ends 21:04) | |
| End: not ongoing | Unit | `phase10cStab1Batch2.test.ts` (08:30–11:30 not running at 21:15) | |
| Checked-in not checked-out: Chờ check-out | Unit + Manual | `applicantBucket.AwaitingCheckout` bucket; `getShiftDisplayPhase` | |
| Checked-out: Chờ xác nhận | E2E | `e2e/05-checkout-confirm.spec.ts` (AwaitingConfirmation bucket) | |
| Confirmed: Đã hoàn thành | E2E | `e2e/13-dispute-invariant.spec.ts` H2 (Confirmed bucket) | |
| No vague "Đang xử lý" | Manual | `VISUAL_QA.md` — replaced by explicit phase chips | Verified by code: phase labels enumerated |

## Checklist C — Check-in / mark present / mark absent

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Worker can check in only from 15 min before start | E2E + Unit | `e2e/03-checkin-window.spec.ts` (within) + `timeGates.canWorkerCheckIn` | |
| After 5 min from start, check-in blocked | E2E | `e2e/03-checkin-window.spec.ts` ("later than 5 min after start") | |
| Too early error clear | E2E | `e2e/03-checkin-window.spec.ts` (too-early → no CTA) | CTA gated; message in `lifecycle.checkIn.outsideWindow` |
| Too late error clear | E2E | same | |
| After check-in worker sees checked-in status | E2E | `e2e/03-checkin-window.spec.ts` ("Đã check-in" visible) | |
| Employer still sees mark-present | E2E | `e2e/04-attendance.spec.ts` Flow 4 | |
| Employer sees mismatch warning | E2E | `e2e/04-attendance.spec.ts` (mismatch warning visible) | |
| Employer has mark-absent when eligible | E2E (negative) + Manual | `e2e/14` H4 (absent NOT shown on terminal) + manual positive | Positive mark-absent path is manual |
| Mark-absent exists even when evidenceRequirement = None | Manual | `VISUAL_QA.md` | Mark-absent gate is independent of evidence requirement |
| Employer marked-present visible to worker | Unit + Manual | `markPresentByEmployer` (Batch 2/3) | |
| Employer marked-present but worker not check-in → mismatch | E2E | `e2e/04-attendance.spec.ts` | |
| Ended/completed/cancelled/disputed shifts hide wrong live controls | E2E | `e2e/14` H4 (expired) + `e2e/13` H1 (disputed hides confirm) | |

## Checklist D — Check-out / confirm completion

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Worker sees check-out after shift end | Unit + Manual | `timeGates.canWorkerCheckOut` | |
| Check-out opens dialog, not instant | Unit + Manual | `CheckoutDialog` mounted on worker dashboard | Dialog mechanics tested in `phase10cCheckout.test.ts` |
| Checklist required if configured | Unit | `phase10cCheckout.test.ts` (CHECKLIST_INCOMPLETE) | |
| Evidence required if configured | Unit | `phase10cCheckout.test.ts` (PHOTO_REQUIRED) | |
| Worker sees awaiting employer confirmation | E2E | `e2e/05-checkout-confirm.spec.ts` (awaiting) | |
| Employer sees check-out time | Manual + E2E | `e2e/05-checkout-confirm.spec.ts` (panel) | EmployerConfirmationPanel |
| Employer sees each checklist item label/status | Unit + Manual | `EmployerConfirmationPanel` + `phase10cCheckout` | |
| Employer sees handover note | E2E | `e2e/05-checkout-confirm.spec.ts` (note visible) | |
| Employer sees evidence filename | E2E | `e2e/05-checkout-confirm.spec.ts` (filename visible) | |
| Employer can confirm | E2E | `e2e/05-checkout-confirm.spec.ts` Flow 6 | |
| Employer can dispute | E2E | `e2e/07-disputes.spec.ts` Flow 8 (employer-initiated) | |

## Checklist E — Employer disputes worker

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Missing category blocked | Unit | `phase10cDispute.test.ts` (CATEGORY_REQUIRED) | |
| Missing reason blocked | Unit | `phase10cDispute.test.ts` (REASON_REQUIRED) | |
| Missing evidence description blocked if required | Unit | `phase10cDispute.test.ts` / DisputeDialog `evidenceDescriptionRequired` | |
| Submit moves to Disputed | Unit + E2E | `phase10cDispute.test.ts` + `e2e/07` Flow 8 | |
| Employer sees submitted dispute | E2E | `e2e/07-disputes.spec.ts` Flow 8 | |
| Worker copy says employer is disputing | E2E | `e2e/07` Flow 8 ("Nhà tuyển dụng đang khiếu nại ca này") | |
| Worker does not see wrong "Bạn đã khiếu nại" | E2E | `e2e/07` Flow 8 (asserts employer-initiated copy) | |
| Worker sees category/reason/evidence/file | Manual + Unit | dispute detail render; `phase10cDispute` round-trip | |
| Payment held explanation | Manual | `VISUAL_QA.md` | escrow → Disputed via invariant |
| Worker can respond/add evidence | E2E | `e2e/07` Flow 8 (worker responds) | |
| Employer sees worker response | E2E | `e2e/07` Flow 8 (response visible to employer) | |

## Checklist F — Worker absent dispute

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Worker sees absent banner | E2E | `e2e/07-disputes.spec.ts` Flow 7 | |
| Worker sees reason if any | Manual | `VISUAL_QA.md` | |
| Has "Khiếu nại vắng mặt" | E2E | `e2e/07` Flow 7 (CTA) | |
| Dialog opens | E2E | `e2e/07` Flow 7 (dialog visible) | |
| Category AbsentDispute / Vietnamese label | Unit | `phase10cWorkerDispute.test.ts` (worker category enum) | |
| Worker can submit reason/evidence/file | E2E | `e2e/07` Flow 7 (fills reason + evidence) | |
| App moves to Disputed | E2E + Unit | `e2e/07` Flow 7 + `phase10cWorkerDispute.test.ts` | |
| Employer gets notification | Unit | `phase10cWorkerDispute.test.ts` ("fires employer + admin notifications") | |
| Admin gets notification | Unit | same | |
| Worker sees dispute tracking | E2E | `e2e/07` Flow 7 ("Bạn đã khiếu nại ca này") | |
| No duplicate dispute | Unit | `phase10cWorkerDispute.test.ts` (WRONG_STATUS when already Disputed) | |

## Checklist G — Admin dispute handling

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Admin sees new dispute | E2E | `e2e/14-status-wallet-admin.spec.ts` H10/H11 | |
| Card has shift name | E2E + Manual | admin DisputeRow header (shiftTitle) | |
| Worker visible | Manual | DisputeRow detail (workerName) | |
| Employer visible | Manual | DisputeRow detail (employerName) | |
| Reason visible | E2E | `e2e/14` H10/H11 (reason text asserted) | |
| Status visible | Manual + E2E | status Badge | |
| Evidence/file visible | Manual | DisputeRow detail (evidenceDescription/filename) | |
| Resolve notifies both sides | Unit | `phase10cStab1Batch3.test.ts` ("notifies both sides") | |
| After resolve, no stale dispute state | E2E | `e2e/13-dispute-invariant.spec.ts` H2 | |
| Request more evidence UI if implemented | E2E | `e2e/14` H10/H11 ("Yêu cầu bổ sung thông tin" visible) | |
| Badge count appears | E2E | `e2e/14` H10/H11 (disputes tab badge) | |

## Checklist H — Worker paid + required employer rating

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Worker receives pay notification | Unit | `phase10cAutoRelease.test.ts` / confirmCompletion notification | |
| Worker wallet increases | E2E | `e2e/05-checkout-confirm.spec.ts` Flow 6 (90.000 đ) | |
| Ledger has wage line | E2E + Unit | `e2e/14` H8/H9 + `phase10cStab1Batch4B.test.ts` (WageReleased) | |
| Worker sees required rating banner | E2E | `e2e/05-checkout-confirm.spec.ts` Flow 6 | |
| Rating copy correct | E2E | `e2e/05` Flow 6 (exact banner text) | |
| Submit rating clears banner | Unit + Manual | `phase10cStab1Batch4B` (paidAwaitingRating clears) | |
| Employer receives rating notification if implemented | Unit | `phase10cStab1Batch4B.test.ts` (timeline/notification threading) | |

## Checklist I — Wallet + ledger

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Worker dashboard wallet visible | E2E | `e2e/14` H8/H9 + `e2e/16` | WalletPanel |
| Balance correct | E2E | `e2e/16-wallet-topup-navbar.spec.ts` (exact amounts) | |
| Recent transactions visible | E2E | `e2e/16` (ledger modal) | |
| Ledger modal/list opens | E2E | `e2e/16` ("Xem lịch sử giao dịch") | |
| Wage copy readable | Manual + Unit | `wallet.kind.*` Vietnamese labels | |
| Employer wallet visible | E2E | `e2e/16` (employer top-up) | |
| Employer balance correct | E2E | `e2e/16` (250.000 đ) | |
| Employer deposit ledger visible | Unit | `phase10cStab1Batch4` (EmployerDepositHeld) | |
| Unused slot refund visible | Unit | `walletStore` EmployerUnusedRefund | Manual visual confirm |
| Dispute refund visible | Unit | `phase10cStab1Batch4` (EmployerDisputeRefund) | |
| Custom top-up works | E2E | `e2e/16` Phase 4 (exact 123.000đ) | |
| Wallet withdrawal (cash-out) works + ledger line | E2E + Unit | `e2e/20-core-stability-6.spec.ts` Part 3 ("worker withdraws a valid amount and sees the ledger entry"; "employer can also withdraw") + `coreStability6.test.ts` (`walletStore.withdraw`) | CORE-STABILITY-6 Part 3 — `UserWithdrawal` ledger + notification |
| Over-balance / invalid withdrawal blocked | E2E + Unit | `e2e/20` Part 3 ("withdrawal greater than balance is blocked") + `coreStability6.test.ts` (INSUFFICIENT_BALANCE / INVALID_AMOUNT guards) | CORE-STABILITY-6 Part 3 |
| Employer deposit blocked on insufficient balance | E2E + Unit | `e2e/20` Part 4 ("deposit is blocked … when the wallet is empty"; "deposit succeeds after topping up") + `phase10cStab1Batch4`/`Batch4B`/`Batch2` (fund-first) | CORE-STABILITY-6 Part 4 — `simulateDeposit` guards before any mutation; no ghost shift |
| Insufficient deposit preserves draft + offers top-up path (modal) | E2E | `e2e/21-core-stability-7.spec.ts` Part 2 ("blocks deposit with a modal offering a top-up path; draft is preserved; resume after top-up") | CORE-STABILITY-7 Part 2 — Nạp tiền ngay / Lưu nháp / Quay lại; resume without retyping |
| Draft not visible in public worker job list | Unit (invariant) | `domain/filter` VISIBLE_STATUSES = {Published, FullyBooked} + escrow Deposited | CORE-STABILITY-7 Part 2.6/2.7 |
| Top-up creates notification (wallet history deeplink) | E2E | `e2e/21` Part 1 | CORE-STABILITY-7 Part 1.4 |

## Checklist J — Timeline

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Apply log | Unit | `phase10cStab1Batch4B.test.ts` (WorkerApplied) | |
| Approve log | E2E | `e2e/12-timeline.spec.ts` (EmployerApprovedApplicant) | |
| Check-in log | Unit | `phase10cStab1Batch4B.test.ts` | |
| Mark-present log | Unit | `phase10cStab1Batch4B.test.ts` | |
| Mark-absent log | Unit | `phase10cStab1Batch4B.test.ts` | |
| Check-out log | Unit | `phase10cStab1Batch4B.test.ts` | |
| Confirm/dispute log | Unit | `phase10cStab1Batch4B.test.ts` | |
| Worker response log | Unit | `phase10cStab1Batch4B.test.ts` | |
| Admin resolve log | Unit | `phase10cStab1Batch4B.test.ts` (resolveDispute timeline) | |
| Date/time/seconds | E2E | `e2e/12-timeline.spec.ts` (`/T\d{2}:\d{2}:\d{2}/` + rendered hh:mm:ss) | |
| Refresh does not duplicate | E2E | `e2e/12-timeline.spec.ts` (count stable across reload) | |
| Repost log | Unit | `phase10cStab1Batch2.test.ts` (CreatedFromRepost) | |
| Wallet/payment log if relevant | Unit | `phase10cStab1Batch4` (DepositHeld/ShiftPublished) | |

## Checklist K — Worker job list

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Sorted by start time | Unit + Manual | `domain/filter` preserves order; list sorts by datetime | |
| Prioritizes worker preferred location | Manual | `VISUAL_QA.md` | preference sort is a display nicety |
| Applied shift not plain "Đang tuyển" | E2E | `e2e/11-already-applied.spec.ts` | |
| Shows Đã ứng tuyển | E2E | `e2e/11` (chip) | |
| Shows Đã được duyệt | Unit + Manual | `apply.applied.Approved` label | |
| Shows check-in/check-out/awaiting/disputed states | Manual + Unit | `apply.applied.*` labels | |
| CTA becomes Xem đơn/Xem chi tiết, not duplicate apply | E2E | `e2e/11` ("Xem chi tiết" instead of apply) | |

## Checklist L — Overlap

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| 12:40–12:45 vs 13:40–13:45 allowed | Unit | `phase10cStab1Batch3.test.ts` ("back-to-back → no conflict") | |
| 12:40–13:45 vs 13:40–13:45 blocked | Unit | `phase10cStab1Batch3.test.ts` ("overlapping → conflict") | |
| Error names conflict shift/time | E2E + Manual | `e2e/10-schedule-overlap.spec.ts` Flow 10 (overlapping blocked) | |
| Deep-link to conflict if implemented | Deferred | — | Conflict detail shown inline; no separate deep-link (out of scope) |
| Cancelled does not block | Unit | `phase10cStab1.test.ts` Bug 8 (status filter) | |
| Expired does not block | Unit | `phase10cStab1.test.ts` Bug 8 | |
| Rejected does not block | Unit | `phase10cStab1.test.ts` Bug 8 | |
| Completed past does not block | Unit | `phase10cStab1.test.ts` Bug 8 (Confirmed past excluded) | |

## Checklist M — Notifications/deep-links

| Checkbox | Coverage | Test file / name | Notes |
|----------|----------|------------------|-------|
| Worker apply → employer notification | Unit | `applicationStore.apply` push (notificationStore) | |
| Employer approve → worker notification | Unit | `applicationStore.approve` push | |
| Worker check-in → employer notification | Unit | `phase10cStab1Batch4B.test.ts` (WorkerCheckedIn) | |
| Employer mark-present → worker notification | Unit | `phase10cStab1Batch3` (EmployerMarkedPresent) | |
| Worker check-out → employer notification | Unit | `phase10cStab1Batch4B.test.ts` (WorkerCheckedOut) | |
| Employer confirm → worker pay notification | Unit | `phase10cAutoRelease.test.ts` / confirmCompletion | |
| Employer dispute → worker notification | Unit | `phase10cDispute.test.ts` ("fires worker + admin notifications") | |
| Worker response → employer notification | Unit | `phase10cStab1Batch4B.test.ts` | |
| Admin resolve → both sides notification | Unit | `phase10cStab1Batch3.test.ts` ("notifies both sides") | |
| Click notification goes to correct page | E2E | `e2e/13-dispute-invariant.spec.ts` H2 (deep-link tab); `e2e/smoke` cold-load | |
| No stale page state after click | E2E | `e2e/13` H2 (reconciled state on deep-link) | |
| Same-route shortcut/intent opens tab/modal (UserMenu) | E2E | `e2e/19-intent-deeplink.spec.ts` (employer pending modal, worker reputation modal, admin disputes tab — all same-route, repeat-safe) | NAV-INTENT-DEEPLINK-FIX-1 |
| Repeat same-route intent click re-opens, no duplicate side effects | E2E | `e2e/19-intent-deeplink.spec.ts` (asserts app/dispute counts unchanged) | NAV-INTENT-DEEPLINK-FIX-1 |
| Same-route section intent (worker "Việc đã ứng tuyển") scrolls + highlights, repeat-safe | E2E | `e2e/20-core-stability-6.spec.ts` Part 1 ("focuses the applied section while already on the dashboard (repeat-safe)") | CORE-STABILITY-6 Part 1 — `useSectionFromQuery` + flash-ring |
| Notifications show date+time+seconds | E2E (probe) + Unit | rendered `font-mono` timestamp "HH:mm:ss DD/MM/YYYY" on bell + dashboard cards (`formatLogDateTime`); `coreStability6.test.ts` ("every notification carries a createdAt timestamp") | CORE-STABILITY-6 Part 2 — vi-VN renders time-first |
| Lifecycle notifications do not duplicate on repeat sync (dedupeKey) | Unit | `coreStability6.test.ts` ("does NOT create a duplicate when the same (userId, dedupeKey) is pushed again"; "allows the same dedupeKey for a DIFFERENT user") | CORE-STABILITY-6 Part 2 |
| Wallet top-up creates notification + deeplinks to wallet history | E2E + Unit | `e2e/21-core-stability-7.spec.ts` Part 1 ("top-up creates a notification that deeplinks to wallet history") + `coreStability7.test.ts` (resolveNotificationTarget, dedup) | CORE-STABILITY-7 Part 1 |
| Wallet withdrawal notification deeplinks to wallet history | Unit | `coreStability7.test.ts` (`resolveNotificationTarget` UserWithdrawal → wallet); WalletPanel pushes link=`?modal=wallet` | CORE-STABILITY-7 Part 1 |
| Wage release / deposit / refund notifications deeplink to wallet or shift | Unit | `coreStability7.test.ts` (AutoReleaseSettled → worker wallet / employer shift); `confirmCompletion`→`?modal=wallet`; `simulateDeposit`→`EmployerDepositPaid` employer wallet | CORE-STABILITY-7 Part 1 |
| Every notification kind resolves to a meaningful context | Unit | `coreStability7.test.ts` (`resolveNotificationTarget`); deeplink coverage table in `core-stability-7-report.md` §7 | CORE-STABILITY-7 Part 1 |

---

## Coverage summary

- **E2E-covered:** Checklists A, C, D, E, F, G, H, I, J(partial), K, L(partial), M(partial)
- **Unit/domain-covered:** B, D, E, F, J, L, M (store/notification threading), plus all dispute/checkout/auto-release contracts
- **Manual-only visual QA:** B ("no Đang xử lý"), C (positive mark-absent, evidenceRequirement=None mark-absent), D (panel labels), E (held-payment explanation), I (unused-slot/dispute refund visual), K (preferred-location sort)
- **Deferred:** L "deep-link to conflict" (conflict shown inline; separate deep-link out of scope)
- **Not covered (gaps):** none that are Critical/High — manual-only items are display niceties or positive variants of negative-asserted automated tests

### CORE-STABILITY-6 additions (2026-05-30)

- **I (Wallet + ledger):** wallet **withdrawal** (cash-out) + over-balance/
  invalid guards now E2E + Unit covered; employer **deposit insufficient-
  balance** guard now E2E + Unit covered (no ghost published shift).
- **M (Notifications/deep-links):** worker **section** intent
  ("Việc đã ứng tuyển", scroll + flash-ring, repeat-safe) E2E covered;
  notification **timestamp** (date+time+seconds, vi-VN time-first) and
  **dedupe** (per `(userId, dedupeKey)`) covered. Re-checked after the fix
  — no checklist item regressed.

### CORE-STABILITY-7 additions (2026-05-30)

- **C (Check-in / mark present / mark absent):** absent action is now
  **dimmed with a reason** for checked-in workers; employer can correct a
  wrongful absent via **absent→present (late arrival)** with reason +
  timeline + worker notification + safe reputation/boost/escrow restore
  (blocked when an open dispute exists). Unit covered
  (`coreStability7.test.ts` → `revertNoShowToPresent`).
- **H/J (Rating + Timeline):** worker rating history + reviews now show
  **full date+time+seconds** (`formatLogDateTime`); the reversal logs a
  timeline entry.
- **I (Wallet + ledger):** insufficient-deposit **draft preservation +
  top-up resume** modal (E2E); **top-up notification** + wallet-history
  deeplink (E2E).
- **M (Notifications/deep-links):** **every notification kind** resolves
  to a meaningful context via `resolveNotificationTarget`; wallet
  **top-up / withdraw / deposit / wage-release** all deeplink to wallet
  history (or shift detail) with dedup keys; same-route wallet deeplink
  opens the ledger modal in place.
- **New (Feedback/review):** sort (newest/oldest/highest/lowest/with-
  comment), rating summary + star distribution, **report flow** ("Báo cáo
  đánh giá") that notifies admins, flags "Đang được xem xét", never
  deletes the review, deduped per reporter; admin disputes tab shows a
  reported-reviews card. Unit covered (`coreStability7.test.ts` →
  `reviewReportStore`).
- **New (Avatar/logo):** single global initials rule
  (`lib/initials.ts` → `getUserInitials`) used everywhere; "QP" / "NV"
  verified consistent live + Unit covered.
- **New (Numeric fields):** phone / amount / headcount strip non-digits
  on input and validate; contact phone E2E covered.

All checkboxes mapped. No hidden uncovered Critical/High items.

### CORE-STABILITY-8 additions (2026-05-30)

- **A (Repost) / I (Wallet):** drafts are now a separate `ShiftDraft`
  model (save / restore / delete) — NOT real shifts. Excluded from the
  public listing, employer lists/stats/calendar, lifecycle sync, and the
  worker job list. Covered: `coreStability8.test.ts` (draft store +
  `byEmployer`/`discardDraftShift` exclusion + lifecycle skips Draft),
  `e2e/22-core-stability-8.spec.ts` (save/restore/delete; worker never
  sees a draft).
- **New (Contact required):** publish/deposit requires on-site contact
  person + numeric phone; draft can save incomplete.
  `coreStability8.test.ts` (`simulateDeposit` `CONTACT_PERSON_REQUIRED` /
  `CONTACT_PHONE_REQUIRED`); `ShiftForm.test.tsx` (form blocks submit).
- **B (Time status):** recruiting window closes at start — a started
  shift shows "Đang diễn ra", never "Đang tuyển"; consistent across
  roles via the one lifecycle engine. `coreStability8.test.ts`
  (12:59/13:00/13:59) + updated phase10cStab1Batch3/Batch4 assertions.
- **C (Check-in / present / absent):** two-sided attendance — employer
  mark-present establishes presence but does NOT set the worker's
  `checkInAt`; check-out requires the worker's own self check-in.
  `coreStability8.test.ts` (mark-present ≠ checkInAt; checkout locked
  until self check-in) + updated phase10cStab1 checkout test.
- **New (Refund policy):** empty deposited-shift expiry refunds the full
  deposit (+ wallet deeplink); RequireFull understaffed auto-cancel +
  full refund; RunWithApproved runs as-is. `coreStability8.test.ts`
  (empty-expiry refund no-dup; RequireFull/RunWithApproved).
- **Backend readiness:** localStorage limitation documented +
  migration plan (`backend-readiness-plan.md`, `backend-migration-plan.md`).

All CORE-STABILITY-8 checkboxes mapped. No hidden uncovered
Critical/High items.

### CORE-STABILITY-9 additions (2026-05-31)

- **C (Check-in / mark present / mark absent):** attendance status text
  is now **role-aware** — the employer surface renders employer-addressed
  copy and the worker surface renders worker-addressed copy (never
  cross-perspective). Backed by a canonical attendance **state machine**
  (`deriveAttendanceState` → 11 states; `attendanceCopyKey(state, role)`).
  Covered: `coreStability9.test.ts` (11-state matrix; worker/employer
  keys distinct; non-banner states undefined), `e2e/04-attendance.spec.ts`
  (employer-perspective copy shown / clears).
- **D (Check-out / confirm completion):** check-out now opens at shift
  **END** (window `[end, end+60min]`), not start — the CTA stays hidden
  mid-shift and still requires the worker's own self check-in. Covered:
  `coreStability9.test.ts` (15:50/15:55/15:59 hidden; 16:00/16:01
  visible; +61min hidden; employer-only never unlocks) + updated
  `coreStability8.test.ts` / `phase10cStab1.test.ts`.
- **New (Skill progression):** workers earn **XP / levels** per job
  category on confirmed shifts (levels 1–5; +10/+5/+3/+2; 0 if disputed);
  the profile shows level + XP progress bars (`SkillProgressBar`),
  applicant cards show a compact level. Covered: `coreStability9.test.ts`
  (levels, xpForCompletion, skillProgress, awardSkillXp),
  `e2e/23-core-stability-9.spec.ts` (profile shows Cấp 3 for 130 XP).
- **K (Worker job list) / New (Availability):** workers can declare
  **free time** (`ScheduleBlock.kind='available'`, non-blocking) and the
  job list offers a **"Phù hợp lịch rảnh"** sort with per-card match
  pills; the worker dashboard surfaces an **availability-based
  recommendation** section ("Gợi ý theo lịch rảnh và kỹ năng của bạn.").
  Rule-based scorer (time 40 / location 25 / skill 25 / wage 10; excludes
  busy/approved overlaps). Covered: `coreStability9.test.ts`
  (fitsInsideAvailability, matchLabel, scoreShiftForWorker, ranking/drop),
  `e2e/23-core-stability-9.spec.ts` (availability sort toggle + match
  pill; schedule busy/available toggle).
- **New (Backend status):** the footer now states site-wide, honestly,
  that demo data lives in the browser ("Dữ liệu demo đang lưu trên trình
  duyệt. Xóa cache sẽ mất dữ liệu."). Covered: `e2e/23-core-stability-9.spec.ts`
  (footer note visible). Migration plan extended
  (`backend-migration-plan.md` §11).

All CORE-STABILITY-9 checkboxes mapped. No hidden uncovered
Critical/High items. Unit (504) / build (28 routes) / E2E (105) / time
(22) all pass.

### CORE-STABILITY-10 additions (2026-05-31)

- **B (Shift time status):** the cross-page status disagreement is fixed
  by a single source of truth — `getShiftLifecycleState(shift,
  applications, nowIso)` rendered by one `ShiftLifecycleBadge` on every
  surface (worker dashboard/detail/job list, public list, employer
  dashboard + stat modals, employer detail, employer calendar, admin).
  The lifecycle is time-only; check-in / employer mark-present never
  advance it. Covered: `coreStability10.test.ts` (Part 1 time rules +
  Part 7 cross-role time-travel 18:05–18:09), `e2e/25-core-stability-10.spec.ts`
  (same label across worker/employer surfaces at 18:04 / 18:06 / 18:10).
- **C (Check-in / mark present / mark absent):** present + absent paired;
  absent disabled+dimmed with reason for a checked-in worker; absent
  independent of evidenceRequirement. Covered: `coreStability10.test.ts`
  (Part 4 eligibility).
- **D (Check-out / confirm completion):** checkout only after end,
  re-asserted across roles + time-travel. Covered: `coreStability10.test.ts`
  (Part 2/3), `e2e/25-core-stability-10.spec.ts` (no checkout 18:04/18:06,
  visible 18:10).
- **Badge consistency (Part 6):** `getShiftStatusBadge(state)` is the one
  label+tone+priority map; "Đang diễn ra" (InProgress) is `info` (blue)
  everywhere — never purple or green. Covered: `coreStability10.test.ts`
  (Part 6).
- **Role-aware copy (Part 5):** re-audited; worker "bạn" / employer
  "người làm, bạn đã xác nhận" / admin neutral; no UI references the
  legacy cross-perspective `lifecycle.mismatch.*` keys. Covered:
  `coreStability10.test.ts` (key distinctness), `e2e/04-attendance.spec.ts`.

All CORE-STABILITY-10 checkboxes mapped. No hidden uncovered
Critical/High items. Unit (544) / build (28 routes) / E2E (112) / time
(22) all pass.
