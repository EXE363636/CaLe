# CORE-STABILITY-10 — Unified Shift Lifecycle, Role-aware Attendance, Checkout Lock, Badge Consistency

**Date:** 2026-05-31
**Status:** Complete. All targeted bugs fixed, all gates green.
**App:** CaLẻ / ShiftNow (localStorage-only Next.js 16 MVP, mock-only).
No backend added; no new features; not auto-committed.

Parts: 1 one source of truth for shift lifecycle, 2 separate
shift/attendance state, 3 worker check-in/out UI, 4 employer
present/absent UI, 5 role-aware copy audit, 6 badge label+colour
consistency, 7 cross-role time-travel, 8 exploratory QA + security.

## 1. Root causes

The headline bug (the same shift showing different status on different
pages) was caused by **two parallel, competing status systems**:

1. **Stored `Shift.status`** rendered raw by `ShiftStatusBadge`. This
   lagged the wall clock (it only advanced when a lifecycle sync ran)
   and mapped `InProgress` to the **purple** Badge tone. Used by the
   worker job list / worker detail / employer dashboard / employer
   calendar / admin.
2. **Live `getShiftDisplayPhase`** rendered by an ad-hoc `ShiftPhaseChip`
   (employer detail) and an inline phase badge (worker dashboard card).
   It used different LABELS ("Sắp bắt đầu", "Đang diễn ra") and a
   different COLOUR (`InProgress` → green/`success`).

Because different pages used different systems, the same shift could
read "Sắp bắt đầu" on the worker card, "Đang diễn ra" on the worker
detail, "Đang diễn ra" (green) on one page and "Đang diễn ra" (purple)
on another. The secondary issues (checkout timing, present/absent
visibility, role-aware copy) were largely already correct from
CORE-STABILITY-8/9 but are re-asserted here with dedicated tests.

## 2. Shift lifecycle source-of-truth

New module `src/domain/shiftLifecycleState.ts`:
`getShiftLifecycleState(shift, applications, nowIso)` returns ONE
canonical `ShiftLifecycleState`:

`Draft | PendingDeposit | Published | StartingSoon | InProgress |
AwaitingCheckout | AwaitingEmployerConfirmation | Completed | Expired |
Cancelled | Disputed`.

Rules (time-only for the transitions):
- Draft / PendingDeposit / Cancelled / Completed / Expired are honoured
  first — the clock never overrides them.
- Dispute (escrow Disputed or any app Disputed) beats the time rules.
- Any CheckedOut app (or `status === 'AwaitingConfirmation'`) →
  `AwaitingEmployerConfirmation`.
- `now < start − 15min` → Published; `[start − 15min, start)` →
  StartingSoon; `[start, end)` → InProgress; `now ≥ end` →
  AwaitingCheckout (someone checked in) / AwaitingEmployerConfirmation
  (someone confirmed) / Expired (nobody showed).

**Check-in and employer mark-present NEVER appear in the time rules.**
Presence is read only to distinguish "someone worked → awaiting
checkout" from "nobody showed → expired" after the end time. A worker
checking in at 18:04 does not make an 18:05 shift InProgress.

This helper is rendered by the single `<ShiftLifecycleBadge>` component
on every surface: worker dashboard, worker detail, worker job list,
public list, employer dashboard (+ stat modals), employer detail,
employer calendar, admin shifts. Same `(shift, applications, now)` ⇒
same state ⇒ same label + colour, everywhere.

## 3. Attendance / application state machine

`src/domain/attendanceState.ts` (`getApplicationAttendanceState` /
`deriveAttendanceState`) is unchanged in contract and remains SEPARATE
from the shift lifecycle. States:

`ApprovedNotStarted | WorkerCheckedInEarly | WorkerCheckedInInProgress |
EmployerMarkedPresentOnly | BothConfirmedPresent | NoShow |
AwaitingCheckout | CheckedOut | AwaitingEmployerConfirmation | Disputed |
Completed`.

Invariants (all re-tested in `coreStability10.test.ts`):
- Employer mark-present ≠ worker check-in (distinct timestamps:
  `markedPresentAt` vs `checkInAt`).
- Worker check-in ≠ shift started (shift state is time-only).
- Checkout requires `now ≥ end` AND `status === 'CheckedIn'` AND the
  worker's own `checkInAt` is set. Employer-marked-present alone never
  unlocks checkout.

## 4. Worker checkout eligibility rules

`canCheckOut(now, app, shift)` (unchanged from CS9, re-tested):
- Before early-check-in window: no check-in, no checkout.
- Within 15min before start: Check-in available; no checkout.
- After early check-in, before start: "Đã check-in" + "Bạn đã
  check-in. Vui lòng chờ đến giờ bắt đầu ca."; no checkout.
- During shift `[start, end)`: working state; no checkout.
- After end `[end, end + 60min]`: checkout if `CheckedIn` + own
  `checkInAt`.
- Employer-marked-present only (no self check-in): worker sees "Nhà
  tuyển dụng đã xác nhận bạn có mặt. Vui lòng tự check-in…"; no checkout
  before end.

## 5. Employer present/absent button behavior

`ApplicationActionButtons` (employer detail) + `canEmployerMarkPresent`
/ `canEmployerMarkAbsent`:
- Approved worker in window → BOTH "Đánh dấu có mặt" and "Đánh dấu vắng
  mặt" shown.
- Worker self checked-in → "Đánh dấu có mặt" stays (employer can still
  confirm presence); "Đánh dấu vắng mặt" rendered DISABLED/dimmed with
  the reason "Người làm đã check-in. Chỉ đánh dấu vắng mặt nếu có tranh
  chấp." — visible, not hidden.
- Employer already marked present → "Bạn đã xác nhận người làm có mặt.
  Đang chờ người làm tự check-in…" (employer-perspective).
- Mark-absent is INDEPENDENT of `evidenceRequirement` (works for
  `None`).
- NoShow + not yet released → "đổi vắng mặt → có mặt" (late arrival)
  with reason, blocked when a dispute is open.

## 6. Role-aware copy table

| Attendance state | Worker ("bạn") | Employer ("người làm") | Admin (neutral) |
|---|---|---|---|
| WorkerCheckedInEarly | "Bạn đã check-in. Vui lòng chờ đến giờ bắt đầu ca." | "Người làm đã check-in. Vui lòng xác nhận có mặt nếu đúng." | "Người làm đã tự check-in." |
| WorkerCheckedInInProgress | "Bạn đã check-in. Hãy hoàn thành ca và check-out sau khi ca kết thúc." | "Người làm đã check-in. Vui lòng xác nhận có mặt nếu đúng." | "Người làm đã tự check-in." |
| EmployerMarkedPresentOnly | "Nhà tuyển dụng đã xác nhận bạn có mặt. Vui lòng tự check-in…" | "Bạn đã xác nhận người làm có mặt. Đang chờ người làm tự check-in…" | "Nhà tuyển dụng đã xác nhận có mặt." |
| BothConfirmedPresent | "Hai bên đã xác nhận có mặt. Hãy hoàn thành ca và check-out…" | "Hai bên đã xác nhận có mặt. Đợi đến hết ca để người làm check-out." | "Hai bên đã xác nhận có mặt." |
| AwaitingCheckout | "Ca đã kết thúc. Vui lòng check-out để gửi bàn giao." | "Ca đã kết thúc. Đang chờ người làm check-out." | "Ca đã kết thúc, đang chờ người làm check-out." |

Audit result: no employer page renders "Nhà tuyển dụng đã xác nhận
bạn…"; no worker page renders "Bạn đã xác nhận người làm…". The legacy
`lifecycle.mismatch.*` keys are no longer referenced by any UI
component. The worker notification body "Nhà tuyển dụng đã xác nhận bạn
có mặt…" is sent TO the worker (correct worker-perspective).

## 7. Badge color mapping

`getShiftStatusBadge(state)` → `{ labelKey, tone, priority }`. ONE tone
per state, used everywhere:

| State | Label | Tone |
|---|---|---|
| Draft | Bản nháp | neutral |
| PendingDeposit | Chờ đặt cọc | neutral |
| Published | Đang tuyển | info (blue) |
| StartingSoon | Sắp bắt đầu | warning (amber) |
| InProgress | Đang diễn ra | **info (blue)** |
| AwaitingCheckout | Chờ check-out | warning (amber) |
| AwaitingEmployerConfirmation | Chờ xác nhận | warning (amber) |
| Completed | Đã hoàn thành | success (green) |
| Expired | Đã hết hạn | neutral |
| Cancelled | Đã hủy | danger (red) |
| Disputed | Đang khiếu nại | danger (red) |

`InProgress` is now ALWAYS `info` (blue) — never purple, never green.
The deposit/escrow badge (`EscrowStatusBadge`) stays visually separate
from the lifecycle badge. The worker's own upcoming card suppresses the
lifecycle badge ONLY while the state is plain `Published` (recruiting,
far from start) — its primary label there is the application-status
badge "Đã duyệt"; the moment the state reaches StartingSoon/InProgress/
ended, the shared badge shows with the same label+colour as everywhere.

## 8. Files changed

- `src/domain/shiftLifecycleState.ts` (NEW) — `getShiftLifecycleState`,
  `getShiftStatusBadge`, `ShiftLifecycleState`.
- `src/components/shift/ShiftLifecycleBadge.tsx` (NEW) — the one badge.
- `src/components/shift/ShiftCard.tsx` — uses `ShiftLifecycleBadge`
  (worker job list / employer dashboard cards); accepts
  `applications` + `nowIso`.
- `src/app/shifts/page.tsx` — passes `applications` to ShiftCard.
- `src/app/shifts/[id]/page.tsx` — worker detail uses
  `ShiftLifecycleBadge`.
- `src/app/worker/dashboard/page.tsx` — UpcomingShiftCard uses the
  shared badge (suppressed while plain Published); removed the inline
  phase chip + `getShiftDisplayPhase` import.
- `src/app/employer/dashboard/page.tsx` — main list + 3 stat modals use
  the shared badge; threads `applications`.
- `src/app/employer/shifts/[id]/page.tsx` — header uses the shared
  badge; removed `ShiftPhaseChip` + `getShiftDisplayPhase` import.
- `src/app/employer/schedule/page.tsx` — calendar chips + tile colour
  keyed by the canonical lifecycle state.
- `src/app/admin/dashboard/page.tsx` — admin shift rows use the shared
  badge; threads `applications`.
- `src/i18n/vi.ts` — `shift.lifecycle.*` canonical labels.
- Tests: `src/__tests__/coreStability10.test.ts` (NEW, 32),
  `e2e/25-core-stability-10.spec.ts` (NEW, 3).

`ShiftStatusBadge` and `getShiftDisplayPhase` are retained (still
exported; `getShiftDisplayPhase` still covered by existing Batch3/4
tests) but are no longer the badge rendered on any page.

## 9. Tests added / updated

- **Unit** `coreStability10.test.ts` (32): lifecycle state is time-only
  (check-in/mark-present don't move it); StartingSoon vs InProgress
  boundaries (18:05–18:09); attendance state separation; checkout never
  before end; employer present/absent eligibility; role-aware copy keys
  distinct; badge mapping (InProgress = info, never purple/green);
  cross-role time-travel (6 probes) where worker and employer states are
  asserted identical at every instant.
- **E2E** `25-core-stability-10.spec.ts` (3): same seeded shift shows the
  same label across worker dashboard / worker detail / employer detail
  at 18:04 (Sắp bắt đầu, no checkout), 18:06 (Đang diễn ra, no
  checkout), 18:10 (checkout visible, not InProgress).
- No existing test needed changing for the new badge; the H3 status
  assertion (worker card has no "Đang tuyển") still holds because the
  worker card suppresses the Published badge.

## 10. Unit / build / E2E / time results

- `npm run test:run`: **544 passed / 544** (was 512; +32).
- `npm run build`: **clean, 28 routes** (no new routes).
- `npx playwright test --project=chromium`: **112 passed / 112** (was
  109; +3). Log: `qa-exploration/e2e-full-cs10.log`.
- `npm run test:time`: **22 passed / 22**.
- `npm audit`: **2 moderate** (postcss via next) — pre-existing,
  build-time only, no deps added by CS10.

## 11. Exploratory QA result

1. Worker early check-in — "Đã check-in" + waiting copy, no checkout. ✅
2. Worker in-progress — working-state copy, no checkout. ✅
3. Worker checkout only after end — hidden at 18:05/18:08, visible
   18:09/18:10. ✅
4. Employer mark-present before start — does NOT make shift InProgress;
   state stays StartingSoon. ✅
5. Employer mark-present after worker check-in — present action
   idempotent; checkout still gated to end. ✅
6. Employer absent button — visible; disabled+dimmed with reason when
   worker checked in. ✅
7. Same shift across worker dashboard/detail — identical label+colour. ✅
8. Same shift across employer dashboard/detail — identical
   label+colour. ✅
9. Badge colours consistent — InProgress = blue everywhere. ✅
10. Notification deeplink — opens the detail computed by the same
    helper; cannot create stale/contradictory state and cannot bypass
    the checkout time gate. ✅

No Critical/High exploratory bugs remain.

## 12. Security / access-control result

All PASS (see `core-stability-10-security.md`):
- Worker cannot trigger employer mark-present/absent (those live on the
  RoleGuard'd employer detail; store actions act on the employer's own
  shift).
- Employer cannot trigger worker check-in (worker self check-in is a
  worker-only action; employer mark-present sets `markedPresentAt`, not
  `checkInAt`).
- Employer cannot mark attendance for another employer's shift
  (`shift.employerId === currentUserId`, 404 otherwise).
- Direct action cannot bypass the checkout time gate (`canCheckOut`
  enforces `now ≥ end` + self check-in in the store, not just the UI).
- Notification deeplink cannot bypass the checkout time gate (the gate
  is recomputed on render from the wall clock; a deeplink only
  navigates).

## 13. Remaining blockers

None. Deferred (non-blocking): backend implementation (planned, not in
scope for this task), postcss/next moderate advisory, prior deferrals
(staff-supply, chat, full calendar availability sync).

## 14. Manual QA readiness verdict

**Ready.** Every readiness criterion is met:
- Same shift shows the same lifecycle state across worker/employer/card/
  detail (one source of truth + one badge).
- Check-in does not start the shift early (time-only lifecycle).
- Employer mark-present does not start the shift early.
- Checkout never appears before shift end.
- Employer sees both present/absent actions where valid (absent
  disabled+dimmed with reason when checked in).
- Badge colours are consistent (InProgress = blue everywhere).
- Role-aware copy is correct (worker "bạn", employer "người làm", admin
  neutral; no cross-perspective text).
- No Critical/High exploratory or security bugs remain.
- Unit (544) / build (28 routes) / E2E (112) / time (22) all pass.
