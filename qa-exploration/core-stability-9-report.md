# CORE-STABILITY-9 — Role-aware Attendance Copy, Checkout Timing Lock, Skill Progression, Availability Suggestions, Backend Status

**Date:** 2026-05-31
**Status:** Complete. All targeted issues fixed, all gates green.
**App:** CaLẻ / ShiftNow (localStorage-only Next.js 16 MVP, mock-only).

Parts: 1 role-aware attendance copy, 2 checkout timing lock, 3
attendance state machine, 4 worker skill progression (XP/level), 5
availability blocks + availability-based job suggestions, 6 honest
backend status, 7 regression + pentest.

## 1. Root causes

- **Attendance copy (Part 1):** the employer shift-detail page reused
  worker-perspective lifecycle strings (`lifecycle.mismatch.workerOnly`
  etc.), so an employer saw text addressed to the worker ("Nhà tuyển
  dụng đã xác nhận bạn có mặt…"). There was no role-aware copy layer.
- **Checkout timing (Part 2):** `canCheckOut` opened the window at shift
  START (`now >= start`), letting a worker check out mid-shift. A
  5-minute shift 15:55–16:00 showed the check-out CTA at 15:55.
- **State machine (Part 3):** attendance facts (worker self check-in vs
  employer mark-present vs clock-driven start/end) were scattered across
  ad-hoc booleans, making cross-role copy and gating inconsistent.
- **Skill progression (Part 4):** `WorkerSkillScore` carried only a
  rating-derived 0–100 score; there was no levelling / XP ("cày cấp")
  loop to reward repeated good work.
- **Availability (Part 5):** `ScheduleBlock` only modelled BUSY time; a
  worker couldn't declare FREE time, and the job list had no
  free-schedule-aware suggestions.
- **Backend status (Part 6):** the demo never told users their data
  lives only in the browser.

## 2. Bugs fixed

CS9-1 employer saw worker-perspective attendance copy; CS9-2 worker
could check out mid-shift (before end); CS9-3 no canonical attendance
state machine for consistent role-aware gating/copy; CS9-4 no skill
XP/level progression; CS9-5 no availability blocks / free-schedule job
suggestions; CS9-6 no honest demo-data persistence note. Full detail in
`core-stability-9-bugs.json`.

## 3. Product decisions made

1. **Role-aware copy is keyed `attendance.copy.{worker|employer|admin}.
   {state}`** — every (state, role) pair has its own string so copy is
   never cross-perspective. Only 5 states warrant a banner
   (WorkerCheckedInEarly, WorkerCheckedInInProgress,
   EmployerMarkedPresentOnly, BothConfirmedPresent, AwaitingCheckout).
2. **Check-out opens at shift END, not start** — window `[end, end +
   60min]`. A worker is mid-shift until end; the CTA stays hidden.
   Still requires the worker's own `checkInAt` (an employer mark-present
   alone never unlocks check-out — preserves CS8 Part 4).
3. **Skill XP is a separate field** (`WorkerSkillScore.xp`) from the
   rating score. Levels 1–5 at 0/50/120/250/500 XP. +10 completed, +5
   5★, +3 4★, +2 no-dispute, 0 if disputed. Awarded on
   `confirmCompletion` only.
4. **Availability is a `kind` discriminator on `ScheduleBlock`**
   (`'busy'` default | `'available'`). Available blocks NEVER gate
   applications (no conflict); only busy blocks do. Reuses the existing
   schedule store/slice — no new persisted slice, no schema bump.
5. **Recommendations are RULE-BASED, not AI** — weighted scorer (time
   40%, location 25%, skill 25%, wage 10%); shifts overlapping a busy
   block or an approved/active job are excluded. Labels Rất phù hợp ≥75 /
   Phù hợp ≥50 / Cần cân nhắc. Copy: "Gợi ý theo lịch rảnh và kỹ năng
   của bạn."
6. **Backend status is stated truthfully site-wide** in the footer — no
   partial/hidden backend exists.

## 4. Features deferred

- **Backend** — not built (per instruction). Plan extended in
  `backend-migration-plan.md` §11 (attendance projection, skill XP
  column, availability `kind`, recommendation compute-on-read).
- **Weekly recurring availability** — MVP is one-time blocks only.
- **Recommendation precompute cache** — inline scorer is cheap enough.

## 5. Files changed

- `src/domain/attendanceState.ts` (new) — `deriveAttendanceState`
  (11 states), `attendanceCopyKey` (role-aware).
- `src/domain/timeGates.ts` — `canCheckOut` window `[end, end+60min]`
  (was `[start, …]`).
- `src/domain/skillProgression.ts` (new) — `levelForXp`, `skillProgress`,
  `xpForCompletion`, `awardSkillXp`, thresholds.
- `src/domain/availabilityMatch.ts` (new) — `scoreShiftForWorker`,
  `suggestShiftsForWorker`, `fitsInsideAvailability`, `matchLabel`,
  weights.
- `src/domain/scheduleConflict.ts` — busy/available aware (available
  blocks excluded from conflict).
- `src/types/index.ts` — `WorkerSkillScore.xp?`, `ScheduleBlock.kind?`.
- `src/stores/scheduleStore.ts` — `kind` on input/patch/add (default
  busy).
- `src/stores/applicationStore.ts` — `awardSkillXp` chained into
  `confirmCompletion`.
- `src/components/user/SkillProgressBar.tsx` (new),
  `src/components/user/WorkerSummaryRow.tsx`,
  `src/app/worker/profile/page.tsx` — skill level/XP bars.
- `src/app/worker/dashboard/page.tsx` — worker-perspective attendance
  copy on `UpcomingShiftCard`; checkout CTA gated by `canCheckOut`;
  availability-based "Ca làm phù hợp" recommendation section.
- `src/app/employer/shifts/[id]/page.tsx` — employer-perspective
  attendance copy (replaced cross-perspective lifecycle strings).
- `src/app/worker/schedule/page.tsx` — busy/available kind toggle in the
  add/edit dialog; available blocks rendered with a distinct variant;
  kind chip in the flat list.
- `src/app/shifts/page.tsx` — "Phù hợp lịch rảnh" sort + per-card match
  pills via `suggestShiftsForWorker`.
- `src/components/shift/ShiftCard.tsx` — optional `matchLabel` /
  `fitsAvailability` pills.
- `src/components/calendar/CalendarEventCard.tsx` +
  `CalendarLegend.tsx` — `availableSlot` variant + legend entry.
- `src/components/layout/Footer.tsx` — site-wide demo-data note.
- `src/i18n/vi.ts` — attendance role-aware copy, skill, availability,
  legend, and updated checkout-window keys.
- `qa-exploration/backend-migration-plan.md` — §11 CS9 addendum.
- Tests: `src/__tests__/coreStability9.test.ts` (new, 38),
  `e2e/23-core-stability-9.spec.ts` (new, 4); updated
  `coreStability8.test.ts` + `phase10cStab1.test.ts` (checkout
  end-gating) and `e2e/04-attendance.spec.ts` (role-aware copy).

## 6. Tests added/updated

- **Unit** `coreStability9.test.ts` (38): attendance state machine (11
  states), role-aware copy keys (no cross-perspective), checkout
  end-gating boundary (15:50/15:55/15:59 hidden; 16:00/16:01 visible;
  +61min hidden; employer-only never unlocks), skill XP/level math,
  availability matching + exclusions + ranking.
- **E2E** `23-core-stability-9.spec.ts` (4): availability sort toggle +
  match pill on the listing; schedule busy/available toggle; profile
  skill level/XP; footer demo-data note.
- **Updated** `coreStability8.test.ts` (Part 4 checkout now after end),
  `phase10cStab1.test.ts` (Bug 6 checkout window), `04-attendance.spec.ts`
  (employer-perspective copy).

## 7. Role-aware attendance copy table

| State | Worker copy (gist) | Employer copy (gist) | Admin copy (gist) |
|---|---|---|---|
| WorkerCheckedInEarly | "Bạn đã check-in. Chờ đến giờ bắt đầu." | "Người làm đã check-in. Xác nhận có mặt nếu đúng." | "Người làm đã tự check-in." |
| WorkerCheckedInInProgress | "Bạn đã check-in. Hoàn thành ca và check-out sau khi kết thúc." | "Người làm đã check-in. Xác nhận có mặt nếu đúng." | "Người làm đã tự check-in." |
| EmployerMarkedPresentOnly | "NTD đã xác nhận bạn có mặt. Hãy tự check-in." | "Bạn đã xác nhận có mặt. Đang chờ người làm tự check-in." | "NTD đã xác nhận có mặt." |
| BothConfirmedPresent | "Hai bên đã xác nhận. Check-out sau khi kết thúc." | "Hai bên đã xác nhận. Đợi hết ca để người làm check-out." | "Hai bên đã xác nhận có mặt." |
| AwaitingCheckout | "Ca đã kết thúc. Vui lòng check-out để gửi bàn giao." | "Ca đã kết thúc. Đang chờ người làm check-out." | "Ca đã kết thúc, đang chờ check-out." |

Worker and employer strings are distinct for every banner state — the
employer never sees worker-addressed text and vice-versa.

## 8. Attendance state machine table

| Status | checkInAt | markedPresentAt | clock | State |
|---|---|---|---|---|
| Approved | — | — | any | ApprovedNotStarted |
| Approved | — | set | any | EmployerMarkedPresentOnly |
| CheckedIn | set | — | before start | WorkerCheckedInEarly |
| CheckedIn | set | — | started, before end | WorkerCheckedInInProgress |
| CheckedIn | — | set | any | EmployerMarkedPresentOnly |
| CheckedIn | set | set | before end | BothConfirmedPresent |
| CheckedIn | set | any | at/after end | AwaitingCheckout |
| CheckedOut | — | — | any | AwaitingEmployerConfirmation |
| Confirmed | — | — | any | Completed |
| Disputed | — | — | any | Disputed |
| NoShow | — | — | any | NoShow |

Pure projection — derived, never stored.

## 9. Checkout timing table (shift 15:55–16:00, worker self-checked-in)

| Time | canCheckOut | Note |
|---|---|---|
| 15:50 | no | before start |
| 15:55 | no | at start — still mid-shift |
| 15:59 | no | mid-shift |
| 16:00 | yes | exactly end — window opens |
| 16:01 | yes | within 60-min grace |
| 17:01 | no | end + 61min, beyond grace |
| any, employer-marked-present only | no | requires worker self check-in |

## 10. Skill XP / level table

| XP range | Level | XP for a completed shift |
|---|---|---|
| 0–49 | 1 | +10 completed |
| 50–119 | 2 | +5 (5★) / +3 (4★) / +0 (1–3★) |
| 120–249 | 3 | +2 no-dispute |
| 250–499 | 4 | 0 total if disputed/no-show |
| 500+ | 5 (max) | — |

5★ + completed + no-dispute = 17 XP/shift. Awarded on
`confirmCompletion`; disputed shifts award 0.

## 11. Availability matching table

| Factor | Weight | Rule |
|---|---|---|
| Time fit | 40% | 1.0 if shift fits entirely inside an `available` block, else 0 |
| Location | 25% | 1.0 if shift location matches a preferred location, 0.5 if none declared, else 0 |
| Skill | 25% | 1.0 skill+score, 0.7 one of them, else 0 |
| Wage | 10% | hourlyWage / 100k, capped at 1 |
| **Exclusion** | — | overlaps a BUSY block OR an approved/active job → dropped |

Labels: ≥75 Rất phù hợp · ≥50 Phù hợp · else Cần cân nhắc.

## 12. Security / access-control result

All checks PASS (see `core-stability-9-security.md`): worker cannot edit
skill XP via UI (XP is server-/store-computed on confirm, never a form
field); a worker cannot edit another worker's availability (store
`OWNER_MISMATCH` guard); availability notes / skill category labels are
rendered as inert text (React escaping, no `dangerouslySetInnerHTML`);
direct route navigation cannot bypass the attendance state (the state is
derived from store data + clock, and the checkout gate enforces
self-check-in + end-window server-side in the store).

## 13. Unit / build / E2E / time results

- `npm run test:run`: **504 passed / 504** (was 466; +38).
- `npm run build`: **clean, 28 routes** (invariant held; no new routes).
- `npx playwright test --project=chromium`: **105 passed / 105** (was
  101; +4). Log: `qa-exploration/e2e-full-cs9.log`.
- `npm run test:time`: **22 passed / 22**.
- `npm audit`: **2 moderate** (postcss via next) — pre-existing,
  build-time only, no CS9 deps added; fix would downgrade Next to 9.x
  (breaking) — deferred.

## 14. Report file paths

- `qa-exploration/core-stability-9-report.md` (this file)
- `qa-exploration/core-stability-9-bugs.json`
- `qa-exploration/core-stability-9-security.md` + `.json`
- `qa-exploration/backend-migration-plan.md` (§11 updated)
- `qa-exploration/checklist-coverage-matrix.md` (updated)

## 15. Remaining blockers

None. Deferred (non-blocking): backend implementation (planned),
postcss/next moderate advisory, weekly recurring availability,
recommendation precompute cache, prior deferrals (staff-supply, chat,
full calendar availability sync).

## 16. Manual QA readiness verdict

**Ready.** Every readiness criterion is met:
- Employer and worker each see role-correct attendance copy; no
  cross-perspective text.
- Check-out only unlocks after the shift ends (within 60-min grace) and
  only for a worker who self-checked-in.
- A single canonical attendance state machine backs the copy + gating
  across worker and employer surfaces.
- Workers earn skill XP/levels on confirmed shifts; profile shows
  level + XP bars; XP cannot be set by the client.
- Workers can declare free time (`available` blocks) that does NOT block
  applications; the job list and dashboard surface free-schedule + skill
  suggestions with clear match labels.
- The demo states truthfully, site-wide, that data lives in the browser.
- Backend migration plan updated with the four new concepts.
- No Critical/High exploratory or security bugs remain.
- Unit (504) / build (28 routes) / E2E (105) / time (22) all pass.
