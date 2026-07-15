# Implementation Plan

This plan fixes the demo-logic / data-consistency batch in the fixed cluster order from the
design: **Cluster 1** (check-in / absence CTA + notification deep-link) → **Cluster 2**
(current-user / reputation / upcoming hard-coding) → **Cluster 3** (money consistency via derived
data) → **Cluster 4** (payment / escrow wording) → **Cluster 5** (handbook / footer) →
**Cluster 6** (skill progress) → **Cluster 7** (AI prototype, last).

Each cluster follows the exploratory bug-condition methodology:

1. **Explore** — write the bug-condition check(s) FIRST and run them on the UNFIXED code. They
   MUST FAIL (this surfaces the counterexample and confirms the bug exists).
2. **Preserve** — write preservation test(s) and run them on the UNFIXED code. They MUST PASS
   (this records the baseline behavior that must survive the fix).
3. **Fix** — apply the change reusing the existing utilities, then re-run the SAME exploration
   test (now PASSES → bug fixed) and the SAME preservation test (still PASSES → no regression).
4. **Verify** — per cluster, run `npx tsc --noEmit`, `npm run lint`, and the UI anti-pattern
   detector on every touched `.tsx` surface. **NO commits are made by this workflow.**

Property numbers (`Property 1`–`Property 17`) refer to the Correctness Properties in `design.md`
(Properties 1–10 = Bug Condition, Properties 11–17 = Preservation). Requirement clauses
(`2.x` / `3.x`) refer to `bugfix.md`.

Property-based tests (fast-check, already a dev dependency) are recommended for the pure domain
layers — attendance states, reputation rules, wallet/deposit/escrow, and derived money — per the
design's Testing Strategy. Observe behavior on UNFIXED code first, then encode it.

Test locations follow the existing convention: `src/__tests__/` for unit/integration,
`src/__tests__/properties/` for property-based tests, `src/__tests__/generators/` for fast-check
generators, and `e2e/` for Playwright specs. Run unit/PBT with `npm run test:run` (single run,
not watch mode).

---

## Cluster 1 — Check-in / absence CTA + notification deep-link (P1)

- [x] 1. Explore: attendance CTA under "both confirmed present" (bug-condition check)
  - **Property 1: Bug Condition** - Attendance CTA respects "both confirmed present"
  - **CRITICAL**: Write and run this BEFORE any fix. It MUST FAIL on unfixed code — failure proves the bug.
  - **DO NOT fix the test or the code when it fails.** This test encodes the expected behavior and will validate the fix later.
  - **GOAL**: Surface the counterexample — the stray disabled red "Đánh dấu vắng mặt" button.
  - **Scoped PBT approach** (deterministic bug): build an `(application, shift, now)` triple where `deriveAttendanceState(application, shift, now) === 'BothConfirmedPresent'` (worker tapped "Tôi đã có mặt", employer tapped "Xác nhận có mặt"). Reuse `deriveAttendanceState` from `src/domain/attendanceState.ts`.
  - Assert the employer shift-detail action row (`src/app/employer/shifts/[id]/page.tsx`) renders NO "Đánh dấu vắng mặt" primary CTA; only the waiting-for-checkout banner ("Hai bên đã xác nhận có mặt…").
  - **EXPECTED OUTCOME**: Test FAILS — the disabled red button renders via the `absentDisabledReason` branch (`app.status === 'CheckedIn' && Boolean(app.checkInAt)`).
  - Document the counterexample (state = `BothConfirmedPresent`, yet mark-absent CTA present) to confirm the root cause.
  - Suggested file: `src/__tests__/properties/attendanceCtaGating.property.test.ts`
  - _Bug_Condition: isBugCondition where surface = EmployerShiftDetailRow AND deriveAttendanceState = 'BothConfirmedPresent' AND markAbsentCtaIsRendered_
  - _Requirements: 1.1, 2.1_

- [x] 2. Explore: check-in notification deep-link target (bug-condition check)
  - **Property 2: Bug Condition** - Check-in notification deep-links to an actionable surface
  - **CRITICAL**: Write and run this BEFORE any fix. It MUST FAIL on unfixed code.
  - **DO NOT fix the test or the code when it fails.**
  - **GOAL**: Surface the counterexample — `resolveNotificationTarget` returns `undefined` for a check-in kind.
  - **Scoped approach** (deterministic bug): call `resolveNotificationTarget` (`src/lib/notificationTarget.ts`) for a worker `ShiftStartingSoon` notification carrying a `shiftId`, and assert it returns the worker shift-detail link for that shift.
  - Additionally assert the deep-link target (`src/app/shifts/[id]/page.tsx`) renders a check-in/check-out action when the time gate allows.
  - **EXPECTED OUTCOME**: Test FAILS — `resolveNotificationTarget` falls through to `return undefined` for `ShiftStartingSoon`; the worker cannot act from the notification.
  - Document the counterexample (`ShiftStartingSoon` → `undefined`; CTA only lives on `/worker/dashboard`).
  - Suggested file: `src/__tests__/notificationTargetCheckin.test.ts`
  - _Bug_Condition: isBugCondition where surface = CheckInNotification AND resolveNotificationTarget does NOT land on a surface with the check-in/out action_
  - _Requirements: 1.4, 2.4_

- [x] 3. Preserve: attendance states other than "both confirmed present" (baseline)
  - **Property 11: Preservation** - Attendance states other than "both confirmed present"
  - **IMPORTANT**: Follow observation-first methodology. Run on UNFIXED code and confirm it PASSES before any fix.
  - **Recommended PBT**: property-based test over the `AttendanceState` enum (all states EXCEPT `BothConfirmedPresent`, including a genuine no-show `Approved`/never-checked-in worker) using fast-check. Reuse `deriveAttendanceState` and `canEmployerMarkAbsent` (`src/domain/timeGates.ts`).
  - Observe and assert: copy + employer actions are unchanged for every non-`BothConfirmedPresent` state, and the "Đánh dấu vắng mặt" affordance still appears for an `Approved` never-checked-in worker inside `[start+15min, end+grace]`.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code (records the baseline to preserve).
  - Suggested file: `src/__tests__/properties/attendanceStatePreservation.property.test.ts`
  - _Requirements: 3.1, 3.2_

- [x] 4. Preserve: existing notification routing (baseline)
  - **Property 13: Preservation** - Existing notification routing
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix.
  - Observe and assert: for non-check-in kinds and for notifications that already carry an explicit correct `link`, `resolveNotificationTarget` returns the same destination as today (explicit `link` still wins; the `undefined` fallback for genuinely context-less kinds is retained).
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code.
  - Suggested file: `src/__tests__/notificationTargetPreservation.test.ts`
  - _Requirements: 3.5_

- [x] 5. Fix: gate the attendance action row + deep-link check-in notifications

  - [x] 5.1 Suppress the stray mark-absent CTA when both sides confirmed
    - File: `src/app/employer/shifts/[id]/page.tsx`
    - Reuse the attendance state already computed for `employerAttendanceCopy` via `deriveAttendanceState(app, shift, nowIso)`; gate the button row on it.
    - Change `absentDisabledReason` to be `null` when the derived state is `BothConfirmedPresent` (and, more generally, when the worker has self-confirmed presence such that absence must go through dispute), so the disabled red "Đánh dấu vắng mặt" button no longer renders in that state.
    - Leave `canMarkAbsent` (driven by `canEmployerMarkAbsent` / `shouldMarkNoShow` on an `Approved` worker) unchanged so a genuine no-show still shows the button.
    - Route post-confirmation absence through the existing "report issue" / dispute affordance; introduce NO new absence CTA.
    - _Bug_Condition: surface = EmployerShiftDetailRow AND deriveAttendanceState = 'BothConfirmedPresent' AND markAbsentCtaIsRendered_
    - _Expected_Behavior: Property 1 — no mark-absent primary CTA; only the waiting-for-checkout banner; absence reachable solely via the dispute flow_
    - _Preservation: Property 11 — non-"both confirmed" states (incl. no-show) keep their copy and actions_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 5.2 Deep-link check-in notifications to a surface that hosts the action
    - File: `src/lib/notificationTarget.ts` — extend `resolveNotificationTarget` so worker-facing check-in kinds (`ShiftStartingSoon`, plus any check-in-window kind) resolve to `shiftLink('worker', shiftId)`, falling back to `/worker/dashboard` when `shiftId` is absent. An explicit `notification.link` still wins; all currently-mapped kinds and the `undefined` fallback for context-less kinds are unchanged.
    - File: `src/app/shifts/[id]/page.tsx` (worker view) — confirm/add the check-in/check-out CTA, reusing `canCheckIn` / `canCheckOut` and the same handler the dashboard uses, so the worker can act in place. (Task 2 determines whether the CTA already exists or must be added.)
    - _Bug_Condition: surface = CheckInNotification AND resolveNotificationTarget does NOT land on a surface with the check-in/out action_
    - _Expected_Behavior: Property 2 — resolver returns the worker shift-detail link and the detail renders the matching check-in/out action when gates allow_
    - _Preservation: Property 13 — non-check-in kinds and explicit-link notifications keep their destinations_
    - _Requirements: 2.4, 3.5_

  - [x] 5.3 Verify bug-condition tests now pass
    - **Property 1: Expected Behavior** - Attendance CTA respects "both confirmed present"
    - **Property 2: Expected Behavior** - Check-in notification deep-links to an actionable surface
    - **IMPORTANT**: Re-run the SAME tests from tasks 1 and 2 — do NOT write new tests.
    - **EXPECTED OUTCOME**: both tests PASS (bugs fixed).
    - _Requirements: 2.1, 2.4_

  - [x] 5.4 Verify preservation tests still pass
    - **Property 11: Preservation** - Attendance states other than "both confirmed present"
    - **Property 13: Preservation** - Existing notification routing
    - **IMPORTANT**: Re-run the SAME tests from tasks 3 and 4 — do NOT write new tests.
    - **EXPECTED OUTCOME**: both tests still PASS (no regressions).
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 5.5 Cluster 1 verification (NO commits)
    - Run `npx tsc --noEmit` (no type errors).
    - Run `npm run lint` (eslint clean).
    - Run the UI anti-pattern detector on each touched surface: `node .kiro/skills/impeccable/scripts/detect.mjs --json src/app/employer/shifts/[id]/page.tsx` and `node .kiro/skills/impeccable/scripts/detect.mjs --json src/app/shifts/[id]/page.tsx` (expect `[]`).
    - Optional E2E: extend the existing `e2e/03-checkin-window.spec.ts` — worker taps a `ShiftStartingSoon` notification and lands on the shift detail with the check-in action; employer marks present after worker self-confirms and sees no mark-absent CTA.
    - **Do NOT create any git commit.**
    - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.5_

---

## Cluster 2 — Current user / reputation / upcoming hard-coding (P1/P2)

- [x] 6. Explore: landing hero hard-coding (bug-condition check)
  - **Property 3: Bug Condition** - Landing hero derives from current user + role
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **GOAL**: Surface the counterexamples — the literal `95` reputation tile and the fabricated "Sắp diễn ra" upcoming card.
  - **Scoped approach** (deterministic bug): render `FeaturedJobMockup` (`src/components/landing/FeaturedJobMockup.tsx`) as a logged-out visitor and as a logged-in employer.
  - Assert: no reputation tile shows the literal `95`; a reputation preview appears ONLY when the current user is a worker; an upcoming card appears ONLY when the current user has a real upcoming shift.
  - **EXPECTED OUTCOME**: Test FAILS — hero renders literal `95` and a hard-coded upcoming card regardless of user/role.
  - Suggested file: `src/__tests__/featuredJobMockup.test.tsx`
  - _Bug_Condition: surface = LandingHero AND (reputationPreviewValue is literal 95 OR upcomingCardShown with no real upcoming shift OR reputationPreviewShown AND role != 'worker')_
  - _Requirements: 1.2, 2.2_

- [x] 7. Explore: reputation read-source divergence (bug-condition check)
  - **Property 4: Bug Condition** - Single shared reputation source
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Recommended PBT**: property-based test over random worker states (fast-check) asserting that two surfaces displaying the same worker's reputation render the identical value.
  - Concretely observe the counterexample: worker dashboard `StatTile` reads `worker.reputationScore` (e.g. 80) while the hero shows a literal 95 — two sources for one worker.
  - **EXPECTED OUTCOME**: Test FAILS — reads diverge (80 vs 95) because there is no shared `getWorkerReputation(userId)` reader yet.
  - Suggested file: `src/__tests__/properties/reputationDisplayEquality.property.test.ts`
  - _Bug_Condition: surface reads worker reputation AND reputationRead does NOT come from getWorkerReputation(userId)_
  - _Requirements: 1.3, 2.3_

- [x] 8. Preserve: worker's own dashboard + reputation rules (baseline)
  - **Property 12: Preservation** - Worker's own dashboard + reputation rules
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix.
  - **Recommended PBT**: property-based test over random reputation event sequences (fast-check) asserting `applyReputationEvent` output is unchanged (completed +5, late-cancel −10, no-show −20, admin adjust, clamp 0–100, apply threshold 50). Reuse the existing rules in `src/domain/reputation.ts` — do NOT modify them.
  - Also assert a logged-in worker's own dashboard still shows their real reputation, completed-shift count, earnings, and upcoming shifts derived from their own data.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code (baseline for the rules; only the display read source will change).
  - Suggested file: `src/__tests__/properties/reputationRules.property.test.ts`
  - _Requirements: 3.3, 3.4_

- [x] 9. Fix: single shared reputation reader + hero derives from current user/role

  - [x] 9.1 Add the shared reputation reader and route all displays through it
    - File: `src/domain/reputation.ts` (or a thin `src/stores` selector) — add `getWorkerReputation(userId)` that reads `Worker.reputationScore` from `userStore` and returns the clamped score. Read-only accessor; the scoring rules stay untouched.
    - Route every reputation display through it: worker dashboard `StatTile`, `UserMenu` trust chip (`src/components/layout/UserMenu.tsx`), employer applicant badges, and the landing hero — so the same worker shows one value everywhere.
    - _Bug_Condition: surface reads worker reputation AND reputationRead does NOT come from getWorkerReputation(userId)_
    - _Expected_Behavior: Property 4 — every surface reads getWorkerReputation(userId) and shows the identical value_
    - _Preservation: Property 12 — reputation rules unchanged; only the read source is unified_
    - _Requirements: 2.3, 3.4_

  - [x] 9.2 Derive the landing hero from the current user + role
    - File: `src/components/landing/FeaturedJobMockup.tsx`
    - Remove the hard-coded `95` tile; render a reputation preview only when `useCurrentUser()` is a worker, sourcing the number from `getWorkerReputation(currentUser.id)`; otherwise omit the tile.
    - Remove the hard-coded upcoming card; show "Sắp diễn ra" only when the current user has a real upcoming shift (derived from the shift/application stores for that user); otherwise omit it.
    - Delete the now-unused `landing.hero.featured.upcomingDay` / `upcomingTime` usage; keep labels that remain meaningful.
    - _Bug_Condition: surface = LandingHero AND (literal 95 OR fabricated upcoming card OR reputation preview for non-worker)_
    - _Expected_Behavior: Property 3 — reputation preview only for a worker (via shared reader); upcoming card only for a real upcoming shift; no literals_
    - _Preservation: Property 12 — a logged-in worker still sees real derived values_
    - _Requirements: 2.2, 3.3_

  - [x] 9.3 Verify bug-condition tests now pass
    - **Property 3: Expected Behavior** - Landing hero derives from current user + role
    - **Property 4: Expected Behavior** - Single shared reputation source
    - **IMPORTANT**: Re-run the SAME tests from tasks 6 and 7 — do NOT write new tests.
    - **EXPECTED OUTCOME**: both tests PASS.
    - _Requirements: 2.2, 2.3_

  - [x] 9.4 Verify preservation test still passes
    - **Property 12: Preservation** - Worker's own dashboard + reputation rules
    - **IMPORTANT**: Re-run the SAME test from task 8 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test still PASSES (rules unchanged, own-dashboard data intact).
    - _Requirements: 3.3, 3.4_

  - [x] 9.5 Cluster 2 verification (NO commits)
    - Run `npx tsc --noEmit`, then `npm run lint`.
    - Run the detector on the touched surface(s): `node .kiro/skills/impeccable/scripts/detect.mjs --json src/components/landing/FeaturedJobMockup.tsx` (and any other touched `.tsx`, e.g. `UserMenu.tsx`); expect `[]`.
    - **Do NOT create any git commit.**
    - _Requirements: 2.2, 2.3, 3.3, 3.4_

---

## Cluster 3 — Money consistency via derived data (P2)

- [x] 10. Explore: money figures not reconciled (bug-condition check)
  - **Property 5: Bug Condition** - Money figures derived from one source
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Recommended PBT**: property-based test (fast-check) over seeded worker/employer ledger + shift states asserting that `walletBalance`, `totalIncome`, `totalPaid`, and deposit/guarantee amount reconcile because they come from one derived source.
  - Concretely observe the counterexample: worker dashboard `totalEarnings` sums `application.payoutAmount`; employer dashboard `totalPaidOut` sums `shift.depositAmount`; the wallet tile reads `walletStore.getBalance` — three independent sources that don't reconcile.
  - **EXPECTED OUTCOME**: Test FAILS — figures come from three independent sources.
  - Suggested files: `src/__tests__/properties/derivedMoney.property.test.ts` (+ generator in `src/__tests__/generators/`)
  - _Bug_Condition: surface shows any money figure AND figureSource is NOT the single derived money source_
  - _Requirements: 1.5, 2.5_

- [x] 11. Preserve: wallet mutations + deposit/escrow (baseline)
  - **Property 14: Preservation** - Wallet mutations + deposit/escrow
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix.
  - **Recommended PBT**: property-based test (fast-check) over random wallet mutation sequences asserting invariants hold on `src/stores/walletStore.ts`: `credit` / `debit` / `topUp` / `withdraw` (with invalid-amount and insufficient-balance guards), `backfillFromHistory` idempotency, balance never negative, and sum-of-ledger equals balance. Also assert `calculateDeposit` (`src/domain/deposit.ts`, wage × hours × positions) and `transitionEscrow` (`src/domain/escrow.ts`) produce the same values and legal transitions.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code (the derived money layer will be read-only over these).
  - Suggested file: `src/__tests__/properties/walletDepositEscrow.property.test.ts`
  - _Requirements: 3.6, 3.7_

- [x] 12. Fix: single derived money computation consumed on every surface

  - [x] 12.1 Add the derived money source (pure)
    - File: `src/domain/finance.ts` (new, pure functions, no store writes) — a single computation over the mock wallet ledger (`walletStore`) plus confirmed applications/shifts exposing, per user: `walletBalance`, `totalIncome`, `totalPaid`, `guaranteed`/deposit amount, and `recentTransactions`.
    - Read-only over existing stores; do NOT change `walletStore` mutations/guards/`backfillFromHistory`, `calculateDeposit`, or `transitionEscrow`.
    - _Bug_Condition: surface shows any money figure AND figureSource is NOT the single derived money source_
    - _Expected_Behavior: Property 5 — all money figures produced by the one derived computation and reconcile everywhere_
    - _Preservation: Property 14 — wallet/deposit/escrow domain behavior unchanged; derived layer only reads_
    - _Requirements: 2.5, 3.6, 3.7_

  - [x] 12.2 Consume the derived source on every money surface
    - Replace the three independent reductions with reads from `src/domain/finance.ts`: worker dashboard `totalEarnings` tile + income modal, employer dashboard `totalPaidOut` / `totalDeposited` tiles, and the wallet panel (`src/components/wallet/*`).
    - _Bug_Condition: surface shows any money figure AND figureSource is NOT the single derived money source_
    - _Expected_Behavior: Property 5 — figures reconcile across every surface that shows them_
    - _Preservation: Property 14 — read-only over wallet/deposit/escrow_
    - _Requirements: 2.5, 3.6, 3.7_

  - [x] 12.3 Verify bug-condition test now passes
    - **Property 5: Expected Behavior** - Money figures derived from one source
    - **IMPORTANT**: Re-run the SAME test from task 10 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test PASSES (figures reconcile per account).
    - _Requirements: 2.5_

  - [x] 12.4 Verify preservation test still passes
    - **Property 14: Preservation** - Wallet mutations + deposit/escrow
    - **IMPORTANT**: Re-run the SAME test from task 11 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test still PASSES (never-negative balance, ledger append-only, deposit/escrow unchanged).
    - _Requirements: 3.6, 3.7_

  - [x] 12.5 Cluster 3 verification (NO commits)
    - Run `npx tsc --noEmit`, then `npm run lint`.
    - Run the detector on each touched money surface `.tsx` (worker dashboard, employer dashboard, wallet panel components); expect `[]`.
    - Optional E2E: worker and employer money figures reconcile across dashboard and wallet panel for a seeded account.
    - **Do NOT create any git commit.**
    - _Requirements: 2.5, 3.6, 3.7_

---

## Cluster 4 — Payment / escrow wording (P2)

- [x] 13. Explore: payment-guarantee wording + missing demo note (bug-condition check)
  - **Property 6: Bug Condition** - Payment-guarantee wording + demo note
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Scoped approach** (deterministic bug): for every surface that presents the payment-guarantee concept (`NavBar`, `Footer`, `/employer/payments`), assert the copy uses the clearer standardized wording AND always includes the note "Trong MVP/demo không có giao dịch thật.".
  - **EXPECTED OUTCOME**: Test FAILS — surfaces use the confusing "Đảm bảo thanh toán" / "Mô phỏng đảm bảo thanh toán" wording and do not consistently include the no-real-transactions note.
  - Suggested file: `src/__tests__/paymentGuaranteeWording.test.tsx`
  - _Bug_Condition: surface shows the payment-guarantee concept AND (wordingIsConfusing OR missingNoRealTxnNote)_
  - _Requirements: 1.6, 2.6_

- [x] 14. Preserve: escrow status strings + payment routes (baseline)
  - **Property 14: Preservation** - Wallet mutations + deposit/escrow (escrow status strings unchanged)
  - **Property 15: Preservation** - Legal links + guide routes (payment route still resolves)
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix. This cluster is copy-only.
  - Observe and assert: escrow **status** enum strings/labels are unchanged and the `/employer/payments` route still resolves to a valid page. Only the payment-guarantee concept wording changes.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code.
  - Suggested file: `src/__tests__/escrowStatusStringsPreservation.test.ts`
  - _Requirements: 3.7, 3.8_

- [ ] 15. Fix: standardize payment-guarantee wording + mandatory demo note

  - [x] 15.1 Standardize the label and add the demo note everywhere
    - File: `src/i18n/vi.ts` — standardize the label to a clearer phrase (e.g. "Giữ tiền ca làm (mô phỏng)" / "Mô phỏng giữ tiền để đảm bảo trả công").
    - Add the mandatory note "Trong MVP/demo không có giao dịch thật." wherever the concept appears: `src/components/layout/NavBar.tsx`, `src/components/layout/Footer.tsx`, and `/employer/payments`.
    - Keep escrow **status** strings and routes intact — this is wording only.
    - _Bug_Condition: surface shows the payment-guarantee concept AND (wordingIsConfusing OR missingNoRealTxnNote)_
    - _Expected_Behavior: Property 6 — clearer standardized wording plus an always-present no-real-transactions note_
    - _Preservation: Property 14 (escrow status strings) + Property 15 (payment route) unchanged_
    - _Requirements: 2.6, 3.7, 3.8_

  - [x] 15.2 Verify bug-condition test now passes
    - **Property 6: Expected Behavior** - Payment-guarantee wording + demo note
    - **IMPORTANT**: Re-run the SAME test from task 13 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test PASSES (all surfaces carry clearer wording + the demo note).
    - _Requirements: 2.6_

  - [x] 15.3 Verify preservation test still passes
    - **Property 14: Preservation** - escrow status strings unchanged
    - **Property 15: Preservation** - payment route still resolves
    - **IMPORTANT**: Re-run the SAME test from task 14 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test still PASSES.
    - _Requirements: 3.7, 3.8_

  - [-] 15.4 Cluster 4 verification (NO commits)
    - Run `npx tsc --noEmit`, then `npm run lint`.
    - Run the detector on `src/components/layout/NavBar.tsx`, `src/components/layout/Footer.tsx`, and the `/employer/payments` page `.tsx`; expect `[]`.
    - **Do NOT create any git commit.**
    - _Requirements: 2.6, 3.7, 3.8_

---

## Cluster 5 — Handbook / footer (P3)

- [x] 16. Explore: handbook content + menu label (bug-condition check)
  - **Property 7: Bug Condition** - Practical handbook content + menu label
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Scoped approach** (deterministic bug): assert the guide menu label reads "Cẩm nang" (or "Cẩm nang đi ca") rather than "Bắt đầu nhanh" / "Tin cậy & An toàn", and that `/user-guide` presents original, short, practical handbook content for both workers and employers.
  - **EXPECTED OUTCOME**: Test FAILS — the label is "Bắt đầu nhanh" and the page is framed as trust/safety, not a practical handbook.
  - Suggested file: `src/__tests__/handbookContent.test.tsx`
  - _Bug_Condition: guideMenuLabelIsTrustSafety OR handbookContentMissing_
  - _Requirements: 1.7, 2.7_

- [x] 17. Explore: footer grouping (bug-condition check)
  - **Property 8: Bug Condition** - Footer grouping
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Scoped approach** (deterministic bug): render `src/components/layout/Footer.tsx` and assert "Bắt đầu nhanh"/quick-start is in the handbook/guide group, and the "Pháp lý & Hỗ trợ" group contains ONLY Terms, Privacy, Dispute handling, and Contact support.
  - **EXPECTED OUTCOME**: Test FAILS — "Bắt đầu nhanh" is grouped under `LEGAL_COLUMN`.
  - Suggested file: `src/__tests__/footerGrouping.test.tsx`
  - _Bug_Condition: quickStartLinkGroupedUnderLegal_
  - _Requirements: 1.8, 2.8_

- [x] 18. Preserve: legal links + guide/safety routes (baseline)
  - **Property 15: Preservation** - Legal links + guide routes
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix.
  - Observe and assert: the four footer legal links (Terms, Privacy, Dispute handling, Contact support) and the existing routes `/user-guide` and `/safety` all resolve to valid pages.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code (routes must survive the rename + regrouping).
  - Suggested file: `src/__tests__/legalRoutesPreservation.test.ts`
  - _Requirements: 3.8, 3.9_

- [x] 19. Fix: rewrite handbook + rename menu label + regroup footer

  - [x] 19.1 Rewrite the guide as an original practical handbook and rename the menu label
    - File: `src/app/user-guide/page.tsx` — rewrite as an original, short, practical handbook for workers (satisfying employers, punctuality, communicating conflicts, cancelling well) and employers (attracting staff, clear descriptions, fair pay, reducing no-shows). Content is original, not copied from the web.
    - File: `src/i18n/vi.ts` — rename `nav.label.userGuide` to "Cẩm nang" (or "Cẩm nang đi ca"). File: `src/components/layout/NavBar.tsx` — reflect the renamed label. Keep the `/user-guide` route valid.
    - _Bug_Condition: guideMenuLabelIsTrustSafety OR handbookContentMissing_
    - _Expected_Behavior: Property 7 — original practical handbook for both audiences; menu label "Cẩm nang"_
    - _Preservation: Property 15 — `/user-guide` and `/safety` still resolve_
    - _Requirements: 2.7, 3.9_

  - [x] 19.2 Regroup the footer
    - File: `src/components/layout/Footer.tsx` — move "Bắt đầu nhanh" out of `LEGAL_COLUMN` into the handbook/guide group; leave `LEGAL_COLUMN` with only Terms, Privacy, Dispute handling, and Contact support. Legal routes unchanged.
    - _Bug_Condition: quickStartLinkGroupedUnderLegal_
    - _Expected_Behavior: Property 8 — quick-start in the handbook/guide group; legal group holds only the four legal links_
    - _Preservation: Property 15 — the four legal links still route correctly_
    - _Requirements: 2.8, 3.8_

  - [x] 19.3 Verify bug-condition tests now pass
    - **Property 7: Expected Behavior** - Practical handbook content + menu label
    - **Property 8: Expected Behavior** - Footer grouping
    - **IMPORTANT**: Re-run the SAME tests from tasks 16 and 17 — do NOT write new tests.
    - **EXPECTED OUTCOME**: both tests PASS.
    - _Requirements: 2.7, 2.8_

  - [x] 19.4 Verify preservation test still passes
    - **Property 15: Preservation** - Legal links + guide routes
    - **IMPORTANT**: Re-run the SAME test from task 18 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test still PASSES (all legal links + `/user-guide` + `/safety` resolve).
    - _Requirements: 3.8, 3.9_

  - [x] 19.5 Cluster 5 verification (NO commits)
    - Run `npx tsc --noEmit`, then `npm run lint`.
    - Run the detector on `src/app/user-guide/page.tsx`, `src/components/layout/Footer.tsx`, and `src/components/layout/NavBar.tsx`; expect `[]`.
    - Optional E2E: "Cẩm nang" label present, "Bắt đầu nhanh" in the guide group, legal links still route.
    - **Do NOT create any git commit.**
    - _Requirements: 2.7, 2.8, 3.8, 3.9_

---

## Cluster 6 — Skill progress (P3)

- [x] 20. Explore: flat skill chips in the worker profile modal (bug-condition check)
  - **Property 9: Bug Condition** - Per-skill progress in the worker profile modal
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Scoped approach** (deterministic bug): render `src/components/user/WorkerProfileModal.tsx` for a worker WITH `skillScores` and assert each skill shows a progress/level bar derived from that worker's data (e.g. "Phục vụ 85%"), not flat identical chips.
  - **EXPECTED OUTCOME**: Test FAILS — skills render as flat gray chips via `ChipList`, ignoring `worker.skillScores`.
  - Suggested file: `src/__tests__/workerProfileSkills.test.tsx`
  - _Bug_Condition: surface = WorkerProfileModal AND skillsRenderedAsFlatChips_
  - _Requirements: 1.11, 2.11_

- [x] 21. Preserve: profile non-skill sections + no-skill-data (baseline)
  - **Property 16: Preservation** - Worker profile non-skill sections + no-skill-data
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix.
  - Observe and assert: the modal's identity, verification summary, stats, bio, preferences, and rating-history sections render exactly as before, and the modal degrades gracefully for a worker with NO recorded skill data.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code.
  - Suggested file: `src/__tests__/workerProfileModalPreservation.test.tsx`
  - _Requirements: 3.10_

- [ ] 22. Fix: per-skill progress bars in the worker profile modal

  - [~] 22.1 Replace flat chips with derived per-skill progress bars
    - File: `src/components/user/WorkerProfileModal.tsx` — replace the skills `ChipList` with the existing `SkillProgressBar` (`src/components/user/SkillProgressBar.tsx`), driven by `worker.skillScores` via `buildSkillDisplayList` from `src/domain/skillProgression.ts`, so each skill shows a level/progress bar derived from the worker's data.
    - Degrade gracefully when the worker has no `skillScores` (render the existing placeholder / omit the section), leaving all non-skill sections untouched.
    - _Bug_Condition: surface = WorkerProfileModal AND skillsRenderedAsFlatChips_
    - _Expected_Behavior: Property 9 — each skill shows a progress/level bar derived from worker.skillScores_
    - _Preservation: Property 16 — non-skill sections + no-skill-data path unchanged_
    - _Requirements: 2.11, 3.10_

  - [~] 22.2 Verify bug-condition test now passes
    - **Property 9: Expected Behavior** - Per-skill progress in the worker profile modal
    - **IMPORTANT**: Re-run the SAME test from task 20 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test PASSES (progress bars derived from `skillScores`).
    - _Requirements: 2.11_

  - [~] 22.3 Verify preservation test still passes
    - **Property 16: Preservation** - Worker profile non-skill sections + no-skill-data
    - **IMPORTANT**: Re-run the SAME test from task 21 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test still PASSES.
    - _Requirements: 3.10_

  - [~] 22.4 Cluster 6 verification (NO commits)
    - Run `npx tsc --noEmit`, then `npm run lint`.
    - Run the detector on `src/components/user/WorkerProfileModal.tsx`; expect `[]`.
    - **Do NOT create any git commit.**
    - _Requirements: 2.11, 3.10_

---

## Cluster 7 — AI prototype (P3, last)

- [~] 23. Explore: AI assistant absent / unlabelled (bug-condition check)
  - **Property 10: Bug Condition** - Labelled mock AI assistant
  - **CRITICAL**: Write and run BEFORE any fix. It MUST FAIL on unfixed code.
  - **Scoped approach**: assert a worker assistant exists that takes a free schedule and returns matching shifts, and an employer assistant exists that takes needs and returns a title/description/time/pay/required-skills draft — and that every output is labelled "Gợi ý AI trong demo".
  - **Recommended PBT**: for the pure suggestion logic, property-based test (fast-check) over random free-schedule / needs inputs asserting the assistant returns deterministic mock suggestions and makes NO network/API call (Property 17 invariant).
  - **EXPECTED OUTCOME**: Test FAILS — no assistant exists.
  - Suggested file: `src/__tests__/aiAssistant.test.tsx` (+ `src/__tests__/properties/aiAssistant.property.test.ts`)
  - _Bug_Condition: assistantRequested AND (noAssistantExists OR outputNotLabelledDemoAI)_
  - _Requirements: 1.9, 1.10, 2.9, 2.10_

- [~] 24. Preserve: no real external AI/API or financial transactions (baseline)
  - **Property 17: Preservation** - No real external AI/API or financial transactions
  - **IMPORTANT**: Run on UNFIXED code and confirm it PASSES before any fix.
  - Observe and assert (e.g. by asserting `fetch` / network is never invoked and no wallet mutation is triggered) that demo interactions make no real external AI/API calls and no real financial transactions. This baseline must continue to hold after the assistant is added.
  - **EXPECTED OUTCOME**: Test PASSES on unfixed code.
  - Suggested file: `src/__tests__/noRealExternalCallsPreservation.test.ts`
  - _Requirements: 3.11_

- [ ] 25. Fix: labelled mock AI assistants for worker and employer

  - [~] 25.1 Build the worker and employer mock assistants (local, labelled, no network)
    - New components under `src/components/` — Worker assistant: takes a free schedule and returns matching shifts from the mock store, reusing `suggestShiftsForWorker` from `src/domain/availabilityMatch.ts`. Employer assistant: takes free-text needs and returns a suggested title/description/time/pay/required-skills draft computed locally from mock-data heuristics.
    - Label every output "Gợi ý AI trong demo" and make NO network/API call.
    - _Bug_Condition: assistantRequested AND (noAssistantExists OR outputNotLabelledDemoAI)_
    - _Expected_Behavior: Property 10 — mock suggestions computed from mock data, output labelled "Gợi ý AI trong demo", no real AI/API call_
    - _Preservation: Property 17 — no real external AI/API calls; no real financial transactions_
    - _Requirements: 2.9, 2.10, 3.11_

  - [~] 25.2 Verify bug-condition test now passes
    - **Property 10: Expected Behavior** - Labelled mock AI assistant
    - **IMPORTANT**: Re-run the SAME test from task 23 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test PASSES (assistants exist, outputs labelled, suggestions derived from mock data).
    - _Requirements: 2.9, 2.10_

  - [~] 25.3 Verify preservation test still passes
    - **Property 17: Preservation** - No real external AI/API or financial transactions
    - **IMPORTANT**: Re-run the SAME test from task 24 — do NOT write a new test.
    - **EXPECTED OUTCOME**: test still PASSES (assistant makes no real calls).
    - _Requirements: 3.11_

  - [~] 25.4 Cluster 7 verification (NO commits)
    - Run `npx tsc --noEmit`, then `npm run lint`.
    - Run the detector on each new assistant `.tsx` component; expect `[]`.
    - **Do NOT create any git commit.**
    - _Requirements: 2.9, 2.10, 3.11_

---

## Final checkpoint

- [~] 26. Checkpoint — full suite green, no regressions, no commits
  - Run the full unit/PBT suite once: `npm run test:run` (all bug-condition tests PASS, all preservation tests PASS).
  - Run `npx tsc --noEmit` and `npm run lint` across the project (both clean).
  - Optionally run the E2E suite: `npm run test:e2e`.
  - Confirm every Bug Condition property (Properties 1–10) is satisfied and every Preservation property (Properties 11–17) still holds.
  - **Do NOT create any git commit.** If any question or ambiguity arises, ask the user before proceeding.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_
