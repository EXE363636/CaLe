/**
 * Automatic shift-status lifecycle (Phase 7).
 *
 * Pure TypeScript — no React, no Next, no I/O. Given a shift's current
 * record, the application list, and the wall-clock `now`, computes the
 * status the shift *should* be in based on time + escrow + applications.
 *
 * Decisions are conservative:
 *
 *  - **Draft** stays Draft until the employer confirms the mock deposit
 *    (handled separately by `shiftStore.simulateDeposit`).
 *  - **Cancelled / Completed / Expired** are terminal — never auto-changed.
 *    Admin override (`shiftStore.setStatus`) is the only escape hatch.
 *  - **Published / FullyBooked** can flip between each other based on
 *    `positionsFilled / positionsTotal`, and progress to `InProgress`,
 *    `AwaitingConfirmation`, or `Expired` once the start / end times
 *    have passed.
 *  - **InProgress** rolls forward to `AwaitingConfirmation` once the end
 *    time has passed.
 *  - **AwaitingConfirmation** never auto-advances — the employer must
 *    confirm completion or report an issue.
 *
 * The function never auto-marks workers as no-show, never auto-confirms
 * completion, and never moves escrow status — those side effects stay in
 * the explicit store actions where humans (or admin overrides) are the
 * gatekeepers.
 */

import type { Application, ApplicationStatus, Shift, ShiftStatus } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Combine `YYYY-MM-DD` + `HH:mm` into epoch ms; `NaN` on malformed input. */
function shiftMomentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

/** Application statuses that count as "still on the shift" for lifecycle purposes. */
const ACTIVE_APP_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  'Approved',
  'CancellationRequested',
  'CheckedIn',
  'CheckedOut',
  'Confirmed',
]);

/** Terminal shift statuses: never auto-changed. */
const TERMINAL_SHIFT_STATUSES: ReadonlySet<ShiftStatus> = new Set<ShiftStatus>([
  'Cancelled',
  'Completed',
  'Expired',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the lifecycle-suggested next status for `shift` given the
 * application list and the current `now` ISO timestamp.
 *
 * Returns the shift's current status when no automatic move is warranted
 * (or when the status is terminal). Callers should `setStatus` only when
 * the suggestion differs from the current value.
 */
export function suggestShiftStatus(
  shift: Shift,
  applications: Application[],
  nowIso: string,
): ShiftStatus {
  if (TERMINAL_SHIFT_STATUSES.has(shift.status)) return shift.status;

  // Draft never moves automatically — depositing flips status via the
  // explicit `shiftStore.simulateDeposit` action.
  if (shift.status === 'Draft') return 'Draft';

  const now = new Date(nowIso).getTime();
  const start = shiftMomentMs(shift.date, shift.startTime);
  const end = shiftMomentMs(shift.date, shift.endTime);
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) {
    return shift.status;
  }

  const startedPast = now >= start;
  const endedPast = now >= end;

  // Per-shift application snapshot.
  const myApps = applications.filter((a) => a.shiftId === shift.id);
  const hasActiveWorker = myApps.some((a) => ACTIVE_APP_STATUSES.has(a.status));
  const hasCheckedIn = myApps.some(
    (a) => a.status === 'CheckedIn' || a.status === 'CheckedOut' || a.status === 'Confirmed',
  );
  const allDoneOrAbsent = myApps.every(
    (a) =>
      a.status === 'CheckedOut' ||
      a.status === 'Confirmed' ||
      a.status === 'NoShow' ||
      a.status === 'Rejected' ||
      a.status === 'CancelledByWorker',
  );
  const positionsFull = shift.positionsFilled >= shift.positionsTotal;

  // ---------------------------------------------------------------------
  // AwaitingConfirmation: never auto-advances. Employer / admin decides.
  // ---------------------------------------------------------------------
  if (shift.status === 'AwaitingConfirmation') return 'AwaitingConfirmation';

  // ---------------------------------------------------------------------
  // InProgress: roll forward when the end has passed AND every active
  // worker has either checked out or been marked NoShow / cancelled. We
  // require `allDoneOrAbsent` to avoid yanking the page out from under a
  // worker who is mid-shift but hasn't checked out yet.
  // ---------------------------------------------------------------------
  if (shift.status === 'InProgress') {
    if (endedPast && allDoneOrAbsent) return 'AwaitingConfirmation';
    return 'InProgress';
  }

  // ---------------------------------------------------------------------
  // Published / FullyBooked share the same time-based rules.
  // ---------------------------------------------------------------------
  if (shift.status === 'Published' || shift.status === 'FullyBooked') {
    // End passed.
    if (endedPast) {
      if (hasCheckedIn) return 'AwaitingConfirmation';
      // No one checked in — the shift expired without execution.
      return 'Expired';
    }

    // Start passed but end hasn't yet.
    if (startedPast) {
      if (hasActiveWorker) return 'InProgress';
      // Start passed without anyone approved → still expired (no one
      // showed up). Falls through to the normal time-only branch.
      return 'Expired';
    }

    // Future shift: only the position-counter rule fires.
    return positionsFull ? 'FullyBooked' : 'Published';
  }

  return shift.status;
}

// ---------------------------------------------------------------------------
// Bulk helper
// ---------------------------------------------------------------------------

export interface LifecycleSyncResult {
  /** New shifts array with the suggested statuses applied. */
  shifts: Shift[];
  /** IDs of shifts whose status actually changed in this sync. */
  changedIds: string[];
  /** Wall-clock when the sync ran (ISO 8601). */
  syncedAt: string;
}

/**
 * Walk the full `shifts` list and produce the next snapshot using
 * {@link suggestShiftStatus}. Pure: callers (typically `shiftStore`) are
 * responsible for diffing, persisting, and broadcasting.
 *
 * The returned `changedIds` lets callers no-op when nothing changed —
 * critical for keeping `useEffect`-driven sync calls from triggering a
 * re-render storm.
 */
export function syncLifecycle(
  shifts: Shift[],
  applications: Application[],
  nowIso: string,
): LifecycleSyncResult {
  const changedIds: string[] = [];
  const next = shifts.map((s) => {
    const suggested = suggestShiftStatus(s, applications, nowIso);
    if (suggested === s.status) return s;
    changedIds.push(s.id);
    return { ...s, status: suggested, updatedAt: nowIso };
  });
  return { shifts: next, changedIds, syncedAt: nowIso };
}
