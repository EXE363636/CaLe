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
export const CHECK_IN_EARLY_MINUTES = 30;

/** A worker may check in at most this many minutes after the shift starts. */
export const CHECK_IN_LATE_MINUTES = 15;

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
 * window `[shiftStart − 30min, shiftStart + 15min]` (Req 7.1).
 */
export function canCheckIn(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  if (application.status !== 'Approved') return false;

  const now = toEpochMs(nowIso);
  const start = shiftStartMs(shift);
  if (Number.isNaN(now) || Number.isNaN(start)) return false;

  return now >= start - CHECK_IN_EARLY_MS && now <= start + CHECK_IN_LATE_MS;
}

/**
 * Predicate: may the worker check out for this application right now?
 *
 * `true` iff the application is `CheckedIn` and `now` is at or after the
 * shift's scheduled end time (Req 7.3).
 */
export function canCheckOut(
  nowIso: string,
  application: Application,
  shift: Shift,
): boolean {
  if (application.status !== 'CheckedIn') return false;

  const now = toEpochMs(nowIso);
  const end = shiftEndMs(shift);
  if (Number.isNaN(now) || Number.isNaN(end)) return false;

  return now >= end;
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
