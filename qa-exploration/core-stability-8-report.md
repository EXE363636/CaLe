# CORE-STABILITY-8 — Draft Architecture, Lifecycle Integrity, Refund Policy, Backend Readiness

**Date:** 2026-05-30
**Status:** Complete. All targeted issues fixed, all gates green.
**App:** CaLẻ / ShiftNow (localStorage-only Next.js 16 MVP, mock-only).

Parts: 0 backend readiness (doc), 1 draft architecture, 2 required
contact, 3 lifecycle integrity, 4 attendance state machine, 5
cancellation/refund policy, 6 backend migration (doc), 7 regression +
pentest.

## 1. Root causes

- **Draft (Part 1):** a failed-deposit / "Lưu nháp" left a real
  `Shift{status:'Draft'}` in the main shift list, so it leaked into
  employer detail/stats/calendar and lifecycle status logic. There was
  no draft model and "Lưu nháp" / "Quay lại chỉnh sửa" didn't persist or
  restore the form.
- **Contact (Part 2):** the on-site contact wasn't required to publish.
- **Lifecycle (Part 3):** `suggestShiftStatus` / `getShiftDisplayPhase`
  required a check-in before promoting past start, so an Approved-only
  shift kept showing "Đang tuyển" after 13:00.
- **Attendance (Part 4):** `markPresentByEmployer` set the worker's
  `checkInAt`, so a one-sided employer action prematurely unlocked
  worker check-out.
- **Refund (Part 5):** an empty deposited shift expiry notified but
  never refunded the deposit; there was no understaffed policy.

## 2. Bugs fixed

CS8-1 draft architecture; CS8-2 required contact; CS8-3 lifecycle
"Đang tuyển after start"; CS8-4 premature check-out; CS8-5 empty-expiry
refund; CS8-6 understaffed policy + auto-cancel. Full detail in
`core-stability-8-bugs.json`.

## 3. Product decisions made

1. **Draft = saved form snapshot, not a published job** — separate
   `ShiftDraft` model/store; excluded from every real-shift surface.
2. **Two-sided attendance** — employer mark-present establishes presence
   but the worker must still self-confirm before check-out unlocks.
3. **Default understaffed policy = "Vẫn chạy với số người đã duyệt"**;
   employers may opt into "Chỉ chạy khi đủ số người" (auto-cancel + full
   refund if understaffed at start).
4. **RequireFull auto-cancel is a SYSTEM action** that bypasses the
   human 6h cancel gate but never touches a disputed application.

## 4. Features deferred

- **Backend** — not built (per instruction). Acknowledged + planned in
  `backend-readiness-plan.md` and `backend-migration-plan.md`.

## 5. Files changed

- `src/types/index.ts` — `ShiftDraft`, `NoShowPolicy`,
  `Employer.understaffedPolicy`.
- `src/stores/shiftDraftStore.ts` (new), `src/stores/index.ts`,
  `src/components/layout/AppHydrator.tsx`,
  `src/data/persistence.ts` (schema 10→11, `shiftDrafts` slice),
  `e2e/fixtures/constants.ts` + `seed.ts`.
- `src/stores/shiftStore.ts` — `discardDraftShift`, contact-required
  guards (`CONTACT_PERSON_REQUIRED` / `CONTACT_PHONE_REQUIRED`),
  `byEmployer` excludes Draft.
- `src/stores/applicationStore.ts` — `markPresentByEmployer` no longer
  sets `checkInAt`; `checkIn` accepts employer-marked-present; empty-
  expiry full refund; RequireFull auto-cancel (Step 2c).
- `src/domain/shiftLifecycle.ts` — recruiting window closes at start.
- `src/domain/timeGates.ts` — `canCheckOut` requires worker `checkInAt`;
  `canCheckIn` allows post-mark-present self-confirm.
- `src/components/forms/ShiftForm.tsx` — required contact + `onSaveDraft`.
- `src/app/employer/shifts/new/page.tsx` — draft save/restore/delete,
  "Bản nháp đã lưu" section, insufficient-balance draft flow.
- `src/app/employer/dashboard/page.tsx`, `src/app/employer/schedule/page.tsx`
  — exclude Draft from lists/calendar.
- `src/app/employer/profile/page.tsx` — understaffed policy card.
- `src/i18n/vi.ts` — draft / contact / understaffed keys.
- Tests: `src/__tests__/coreStability8.test.ts` (new, 19),
  `e2e/22-core-stability-8.spec.ts` (new), `ShiftForm.test.tsx`,
  and updated fixtures in several phase10c tests + the CS6/CS7/15
  E2E `fillShiftForm` helpers (contact fields), lifecycle assertions.

## 6. Tests added/updated

- **Unit** `coreStability8.test.ts` — draft store, draft exclusion,
  contact guard, lifecycle at start, attendance two-sided, empty-expiry
  refund, understaffed auto-cancel (19 tests). `ShiftForm.test.tsx` —
  contact-required block.
- **E2E** `22-core-stability-8.spec.ts` — draft save/restore/delete;
  worker never sees a draft.
- **Updated** phase10cStab1Batch2/3/4/4B (contact fields + lifecycle
  assertions), phase10cStab1 (checkout requires checkInAt),
  qaStabilizationStoreGuards (contact fields), CS6/CS7/15 E2E
  `fillShiftForm` helpers.

## 7. Draft behavior table

| Aspect | Behavior |
|---|---|
| Storage | `ShiftDraft` in `shiftDraftStore` (`cale.shiftDrafts`) — NOT a `Shift` |
| Save | "Lưu nháp" saves full form (incomplete allowed) with savedAt/updatedAt |
| Restore | "Tiếp tục chỉnh sửa" / "Quay lại chỉnh sửa" repopulate ALL fields |
| Delete | "Xóa bản nháp" — no cancellation history / refund / notification |
| Worker visibility | never (not in public listing, not in job list) |
| Lifecycle | never synced; no Sắp bắt đầu / Đang diễn ra / hết hạn |
| Cancel | no cancel button (drafts aren't shifts) |
| Wallet | no deposit/ledger until published |
| Listing/calendar/stats | excluded (byEmployer + dashboard + schedule filter Draft) |
| Insufficient-balance | draft preserved; top-up resumes without retyping; lingering Draft shift discarded |

## 8. Lifecycle behavior table (shift 13:00–14:00)

| Time | Status | Display phase |
|---|---|---|
| 12:59 | Published / FullyBooked | Upcoming / CheckInOpen |
| 13:00 (start) | InProgress (recruiting closed) | InProgress ("Đang diễn ra") |
| 13:59 | InProgress (NOT "Đang tuyển") | InProgress |
| 14:01, someone checked in + done | AwaitingConfirmation | AwaitingEmployerConfirmation |
| 14:01, nobody checked in | Expired (+ deposit refund if empty) | Expired |
| Draft | Draft (never moves) | excluded |

Consistent across employer dashboard/detail/calendar, worker
dashboard/job list, and notification deeplinks because all use the one
`runLifecycleSync` engine + the shared `suggestShiftStatus` /
`getShiftDisplayPhase`.

## 9. Attendance state table

| State | worker checkInAt | markedPresentAt | Worker can check-out? |
|---|---|---|---|
| Approved, not arrived | — | — | no |
| WorkerCheckedInOnly | set | — | yes (when shift conditions allow) |
| EmployerMarkedPresentOnly | — | set | no — worker must self-confirm ("Tôi đã có mặt") |
| BothConfirmedPresent | set | set | yes |
| NoShow | — | — | no |
| Late arrival correction (CS7) | set | set | yes (revert NoShow→present, blocked if dispute open) |

Worker sees the "Nhà tuyển dụng đã xác nhận bạn có mặt. Hãy check-in"
notice when marked-present without self check-in. Check-out never
unlocks on a one-sided employer mark.

## 10. Refund policy table

| Scenario | Outcome |
|---|---|
| No-applicant deposited shift expires | Full deposit refunded; notification "tiền đặt cọc đã được hoàn về ví" → wallet history; escrow Refunded; idempotent |
| 1/3 filled completes | Pay 1 worker (WorkerWageReleased); refund 2 unused slots (EmployerUnusedRefund) |
| Employer cancels before start | Refund per cancellation/penalty rules (existing) |
| Employer cancels after approvals | Penalty (time-window) + refund remaining; affected workers protected (no penalty) |
| RequireFull + understaffed at start | Auto-cancel; full deposit refunded; approved workers → CancelledByEmployer (no penalty); both sides notified |
| Draft | No deposit, so no refund |

## 11. Backend readiness summary

localStorage is acceptable for demo only; clearing cache loses all
runtime data. Production needs a backend DB + real auth + server-side
authorization + server-side lifecycle jobs. **Recommended: Supabase /
Postgres.** Full table list, server jobs, API boundaries, auth model,
5-phase migration order, and risks are in
`backend-readiness-plan.md` (Part 0) and `backend-migration-plan.md`
(Part 6). The CORE-STABILITY-8 frontend invariants (draft separation,
single lifecycle engine, two-sided attendance, required contact,
explicit refunds, in-store money guards) were fixed first so the backend
can implement the same contracts authoritatively.

## 12. Security / access-control result

All checks PASS (see `core-stability-8-security.md`): draft isolation +
access control, attendance authorization, refund authorization, direct-
store-bypass guards, deeplink privacy, draft-field XSS inert.

## 13. Unit / build / E2E / time results

- `npm run test:run`: **466 passed / 466** (was 446; +20).
- `npm run build`: **clean, 28 routes**.
- `npx playwright test --project=chromium`: **101 passed / 101** (was 99;
  +2). Log: `qa-exploration/e2e-cs8-full.log`.
- `npm run test:time`: **22 passed / 22**.
- `npm audit`: **2 moderate** (postcss via next) — deferred.

## 14. Report file paths

- `qa-exploration/core-stability-8-report.md` (this file)
- `qa-exploration/core-stability-8-bugs.json`
- `qa-exploration/core-stability-8-security.md` + `.json`
- `qa-exploration/backend-readiness-plan.md`
- `qa-exploration/backend-migration-plan.md`
- `qa-exploration/checklist-coverage-matrix.md` (updated)

## 15. Remaining blockers

None. Deferred (non-blocking): backend implementation (planned),
postcss/next moderate advisory, prior deferrals (staff-supply, chat,
calendar availability).

## 16. Manual QA readiness verdict

**Ready.** Every readiness criterion is met:
- Draft is no longer treated as a real shift (separate model; excluded
  from lists/lifecycle/worker view; restore/delete work).
- Contact person + phone required for publish/deposit (UI + store).
- Lifecycle state consistent across roles/pages (one engine); a started
  shift never shows "Đang tuyển".
- Employer mark-present does not prematurely trigger worker checkout
  (two-sided confirmation).
- Cancellation / unused-slot / empty-expiry refunds work; RequireFull
  auto-cancel + refund works.
- Not-enough-workers policy exists (employer setting, default documented).
- Clear-cache / localStorage limitation documented
  (`backend-readiness-plan.md`).
- Backend migration plan written (`backend-migration-plan.md`).
- No Critical/High exploratory or security bugs remain.
- Unit (466) / build (28 routes) / E2E (101) / time (22) all pass.
