/**
 * Time-gate domain module.
 *
 * Pure TypeScript — no React, no Next, no I/O. Backs the time-window rules
 * for the shift lifecycle:
 *
 *  - Worker check-in / check-out / no-show gates (Req 7.1, 7.3, 7.5).
 *  - Employer edit / cancel 24-hour deadline (Req 25.1, 25.3).
 *
 * All "now" inputs are ISO 8601 strings, matching the rest of the codebase.
 * A shift's start/end are derived from its `(date, startTime / endTime)`
 * pair using the local-time interpretation
 * `new Date(\`${shift.date}T${shift.startTime}:00\`).getTime()`.
 */

import type { Application, Shift } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** A worker may check in at most this many minutes before the shift starts. */
export const CHECK_IN_EARLY_MINUTES = 15;

/**
 * A worker may check in at most this many minutes after the shift starts.
 * Đồng bộ với RPC `worker_check_in` (migration 0006): cửa sổ check-in muộn =
 * start + 15 phút. Cũng là mốc "quá giờ → no-show" (shouldMarkNoShow).
 */
export const CHECK_IN_LATE_MINUTES = 15;

/**
 * Phase 10C-Stab-1 — grace window after the shift's scheduled end during
 * which the worker can still check out. Beyond this window the lifecycle
 * sync rolls the shift to AwaitingConfirmation and check-out is blocked.
 */
export const CHECK_OUT_GRACE_MINUTES = 60;

/** Employers can edit a shift only this many hours before start. */
export const EDIT_DEADLINE_HOURS = 24;

/**
 * Phase 9F: employers can cancel a shift up until this many hours before
 * start. Looser than the edit window because an outright cancel is the
 * least surprising action a worker can receive — they get the slot back
 * cleanly, no half-edited details.
 */
export const CANCEL_DEADLINE_HOURS = 6;

/**
 * Backwards-compatible alias kept so existing imports / call sites that
 * referenced the unified deadline don't break. Equal to
 * {@link EDIT_DEADLINE_HOURS} (24h) — the historical value.
 */
export const EDIT_CANCEL_DEADLINE_HOURS = EDIT_DEADLINE_HOURS;

/**
 * Worker cancellation auto-approval threshold (Phase 2).
 *
 * If the shift starts in **more than** this many hours, a worker's cancel
 * is processed immediately. Within this window, the cancellation has to be
 * approved by the employer. Independent from the 24-hour late-cancel
 * reputation rule (Req 12.3) — that one still triggers separately.
 */
export const WORKER_CANCEL_APPROVAL_HOURS = 3;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const CHECK_IN_EARLY_MS = CHECK_IN_EARLY_MINUTES * MS_PER_MINUTE;
const CHECK_IN_LATE_MS = CHECK_IN_LATE_MINUTES * MS_PER_MINUTE;
const CHECK_OUT_GRACE_MS = CHECK_OUT_GRACE_MINUTES * MS_PER_MINUTE;
const EDIT_DEADLINE_MS = EDIT_DEADLINE_HOURS * MS_PER_HOUR;
const CANCEL_DEADLINE_MS = CANCEL_DEADLINE_HOURS * MS_PER_HOUR;
const WORKER_CANCEL_APPROVAL_MS = WORKER_CANCEL_APPROVAL_HOURS * MS_PER_HOUR;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse an ISO 8601 instant to epoch ms. */
function toEpochMs(iso: string): number {
  return new Date(iso).getTime();
}

/** Combine a `YYYY-MM-DD` date and `HH:mm` wall-clock time into epoch ms. */
function shiftMomentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

function shiftStartMs(shift: Shift): number {
  return shiftMomentMs(shift.date, shift.startTime);
}

function shiftEndMs(shift: Shift): number {
  return shiftMomentMs(shift.date, shift.endTime);
}

// ---------------------------------------------------------------------------
// Worker gates
// ---------------------------------------------------------------------------

/**
 * Predicate: may the worker check in for this application right now?
 *
 * `true` iff the application is `Approved` and `now` lies in the inclusive
 * window `[shiftStart − 15min, shiftStart + 15min]` (Phase 10C-Stab-1
 * tightened from the prior 30/15 to 15/15).
 */
export function canCheckIn(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  const end = shiftEndMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start)) return false;

  // CORE-STABILITY-8 Part 4 — a worker whom the employer marked present
  // (status CheckedIn but no self `checkInAt`) can still confirm "Tôi
  // đã có mặt" any time during the shift (start → end + grace) so they
  // can unlock their own check-out.
  if (
    application.status === 'CheckedIn' &&
    !application.checkInAt &&
    !Number.isNaN(end)
  ) {
    return now >= start - CHECK_IN_EARLY_MS && now <= end + CHECK_OUT_GRACE_MS;
  }

  if (application.status !== 'Approved') return false;
  return now >= start - CHECK_IN_EARLY_MS && now <= start + CHECK_IN_LATE_MS;
}

/**
 * Predicate: may the worker check out for this application right now?
 *
 * CORE-STABILITY-9 Part 2 — check-out is ONLY available after the shift
 * has ENDED (not merely started). The window is `[shiftEnd, shiftEnd +
 * 60min grace]`. Before end the worker is mid-shift and must not see a
 * check-out CTA (a shift 15:55–16:00 is not checkable-out at 15:55).
 *
 * `true` iff:
 *   - the application is `'CheckedIn'`, AND
 *   - the worker has self-confirmed presence (`checkInAt` set — an
 *     employer mark-present alone never unlocks check-out), AND
 *   - `now` lies in the inclusive window `[shiftEnd, shiftEnd + 60min]`.
 */
export function canCheckOut(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  if (application.status !== 'CheckedIn') return false;
  // CORE-STABILITY-8 Part 4 — the worker must have self-confirmed
  // presence ("Tôi đã có mặt", which stamps `checkInAt`). An employer
  // mark-present alone sets status to CheckedIn + `markedPresentAt`
  // but NOT `checkInAt`, so it cannot prematurely unlock check-out.
  if (!application.checkInAt) return false;

  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  const end = shiftEndMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) return false;

  // CORE-STABILITY-9 Part 2 — check-out opens at shift END, not start.
  return now >= end && now <= end + CHECK_OUT_GRACE_MS;
}

/**
 * Predicate: should this approved-but-not-checked-in application be marked
 * as a no-show?
 *
 * `true` iff the application is still `Approved` and `now` is strictly later
 * than `shiftStart + 15min` (Req 7.5).
 */
export function shouldMarkNoShow(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  if (application.status !== 'Approved') return false;

  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start)) return false;

  return now > start + CHECK_IN_LATE_MS;
}

// ---------------------------------------------------------------------------
// Employer gates
// ---------------------------------------------------------------------------

/**
 * Internal: shared "is the shift in a non-terminal state with `now`
 * earlier than `(start − deadlineMs)`" predicate used by both edit and
 * cancel gates. Phase 9F split the unified 24h deadline into:
 *   - 24h for edits  (`canEditShift`)
 *   - 6h  for cancels (`canCancelShift`)
 */
function withinShiftDeadline(
  nowIso: string,
  shift: Shift,
  deadlineMs: number,
): boolean {
  if (shift.status === 'Cancelled' || shift.status === 'Completed') {
    return false;
  }

  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start)) return false;

  return start - now >= deadlineMs;
}

/**
 * Predicate: may the employer edit this shift right now?
 *
 * `true` iff there are at least 24h until the shift starts and the shift is
 * not already cancelled or completed (Req 25.1). Edit deadline is
 * intentionally stricter than cancel deadline because a late edit could
 * surprise approved workers; a late cancel just frees their slot.
 */
export function canEditShift(nowIso: string, shift: Shift): boolean {
  return withinShiftDeadline(nowIso, shift, EDIT_DEADLINE_MS);
}

/**
 * Predicate: may the employer cancel this shift right now?
 *
 * Phase 9F — `true` iff there are at least 6 hours until the shift starts
 * and the shift is not already cancelled or completed. Within the 6-hour
 * window the cancel button is hidden / disabled and the page surfaces
 * `shift.error.TOO_LATE_CANCEL` instead of letting the store apply a
 * silent no-op.
 *
 * Independent from the worker's late-cancel reputation rule (24h) and
 * the `requiresEmployerApprovalToCancel` 3h gate.
 */
export function canCancelShift(nowIso: string, shift: Shift): boolean {
  return withinShiftDeadline(nowIso, shift, CANCEL_DEADLINE_MS);
}

// ---------------------------------------------------------------------------
// Worker cancellation gate (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Predicate: does an `Approved` worker need employer approval to cancel
 * right now?
 *
 * Returns `true` when the shift starts within `WORKER_CANCEL_APPROVAL_HOURS`
 * (3h) of `now` *or* has already started. In that window the worker may
 * only file a `CancellationRequested`; the employer approves or rejects.
 *
 * Outside the window (>3h until start) the worker may cancel immediately.
 *
 * Independent from the 24-hour late-cancel reputation rule
 * ({@link classifyCancellation}) — both apply in their own right.
 */
export function requiresEmployerApprovalToCancel(
  nowIso: string,
  shift: Shift,
): boolean {
  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start)) return false;
  return start - now < WORKER_CANCEL_APPROVAL_MS;
}


// ---------------------------------------------------------------------------
// Phase 10C-Stabilization-1 — canonical lifecycle gates
// ---------------------------------------------------------------------------

/**
 * Phase 10C-Stab-1 canonical helpers. These wrap the existing
 * `canCheckIn` / `canCheckOut` / `shouldMarkNoShow` predicates with
 * names that match the bug-fix checklist verbatim and add the
 * employer-side counterparts that QA flagged as missing.
 *
 * Naming: `canWorkerCheckIn`, `canEmployerMarkPresent`,
 * `canWorkerCheckOut`, `canEmployerMarkAbsent`.
 *
 * Rules (Phase 10C-Stab-1 spec D):
 *   - Worker check-in: 15 min before start through 15 min after start.
 *   - Employer mark-present: same window OR during the shift (start
 *     → end + grace window).
 *   - Worker check-out: from start through end + 60 min grace, only
 *     when the application is `'CheckedIn'`.
 *   - Employer mark-absent: from `start + CHECK_IN_LATE_MS` (i.e. the
 *     moment the worker missed the check-in window) through end + grace.
 *     Available for ALL shifts regardless of `evidenceRequirement`.
 */

/** Alias of {@link canCheckIn} — canonical Phase 10C-Stab-1 name. */
export const canWorkerCheckIn = canCheckIn;

/** Alias of {@link canCheckOut} — canonical Phase 10C-Stab-1 name. */
export const canWorkerCheckOut = canCheckOut;

/**
 * Predicate: may the employer mark this approved worker as present
 * right now?
 *
 * Phase 10C-Stab-1 Batch 3 D — extended to also accept applications
 * that are already `'CheckedIn'` (worker self-checked-in but the
 * employer has not yet confirmed presence). Once `markedPresentAt`
 * is set the predicate returns `false` so the action becomes
 * idempotent at the gate level.
 *
 * Returns `true` iff:
 *   - the application is `'Approved'` OR (`'CheckedIn'` and not yet
 *     marked present), AND
 *   - `now` lies inside the inclusive window `[shiftStart − 15min,
 *     shiftEnd + 60min]`. Employers can confirm presence either
 *     during the worker's check-in window OR any time during the
 *     shift (or its grace tail).
 */
export function canEmployerMarkPresent(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  if (
    application.status !== 'Approved' &&
    application.status !== 'CheckedIn'
  ) {
    return false;
  }
  if (application.markedPresentAt) return false;

  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  const end = shiftEndMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }

  return now >= start - CHECK_IN_EARLY_MS && now <= end + CHECK_OUT_GRACE_MS;
}

/**
 * Predicate: may the employer mark this approved worker as absent
 * (no-show) right now?
 *
 * Phase 10C-Stab-1 D.5: "Employer 'Đánh dấu vắng mặt' must exist for
 * every shift regardless of `evidenceRequirement`." This predicate
 * intentionally does NOT read `shift.evidenceRequirement` — the no-
 * show action is a labor-rights affordance, not an evidence flow.
 *
 * Returns `true` iff the application is `'Approved'` (worker never
 * checked in) and `now` is at least at `shiftStart +
 * CHECK_IN_LATE_MS` (15 min after start — the moment the worker has
 * definitively missed their window). The upper bound is `end +
 * grace` so the employer can still mark absence retroactively while
 * the lifecycle sync is rolling the shift to AwaitingConfirmation.
 *
 * Mirror of the existing `shouldMarkNoShow` but inverted to a
 * "may the employer act?" framing so the UI can decide button
 * visibility cleanly.
 */
export function canEmployerMarkAbsent(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  if (application.status !== 'Approved') return false;

  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  const end = shiftEndMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }

  return now >= start + CHECK_IN_LATE_MS && now <= end + CHECK_OUT_GRACE_MS;
}
