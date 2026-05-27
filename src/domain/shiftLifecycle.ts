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
      // Phase 10C-Stab-1 Batch 3 C — only flip to InProgress when at
      // least one worker has actually checked in (or beyond). An
      // Approved-only roster does NOT promote the shift to
      // InProgress because we have no proof of presence yet.
      if (hasCheckedIn) return 'InProgress';
      if (hasActiveWorker) return shift.status;
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

// ---------------------------------------------------------------------------
// Phase 10C-Stab-1 Batch 3 C — display phase helper
// ---------------------------------------------------------------------------

/**
 * Phase 10C-Stab-1 Batch 3 C / Batch 4 B — narrow display phase used
 * by worker / employer / public UI to render an at-a-glance "what's
 * happening to this shift right now" chip without the user having to
 * interpret the full lifecycle status. Distinct from `Shift.status`
 * because it accounts for actual check-in presence and dispute /
 * post-checkout state.
 *
 *   - `'Upcoming'`                       — start has not yet been
 *                                          reached AND no check-in
 *                                          window is open yet, OR the
 *                                          start time has just passed
 *                                          but no one has checked in.
 *   - `'CheckInOpen'`                    — within the 15-minute
 *                                          pre-start check-in window.
 *   - `'InProgress'`                     — start has passed and at
 *                                          least one worker has
 *                                          self-checked-in (or been
 *                                          employer-marked-present).
 *   - `'AwaitingWorkerCheckout'`         — end has passed AND at least
 *                                          one app is `'CheckedIn'`
 *                                          (worker still needs to
 *                                          check out).
 *   - `'AwaitingEmployerConfirmation'`   — `Shift.status` is
 *                                          `'AwaitingConfirmation'`
 *                                          OR an app is `'CheckedOut'`
 *                                          and not yet
 *                                          `'Confirmed'/'NoShow'`.
 *   - `'Disputed'`                       — `Shift.escrowStatus` is
 *                                          `'Disputed'` OR any app on
 *                                          the shift is
 *                                          `status === 'Disputed'`.
 *   - `'Completed'`                      — `Shift.status` is
 *                                          `'Completed'`.
 *   - `'Expired'`                        — `Shift.status` is
 *                                          `'Expired'`.
 *   - `'Cancelled'`                      — shift was cancelled
 *                                          (employer or admin).
 */
export type ShiftDisplayPhase =
  | 'Upcoming'
  | 'CheckInOpen'
  | 'InProgress'
  | 'AwaitingWorkerCheckout'
  | 'AwaitingEmployerConfirmation'
  | 'Disputed'
  | 'Completed'
  | 'Expired'
  | 'Cancelled';

const CHECK_IN_OPEN_MINUTES = 15;

/**
 * Phase 10C-Stab-1 Batch 4 F — "Sắp bắt đầu" worker-facing window.
 * Distinct from `CHECK_IN_OPEN_MINUTES` (which drives the 15-minute
 * "Bạn có thể check-in sớm" affordance). The 6-hour window controls
 * when the worker / discovery surfaces tag a shift as "starting
 * soon" so the user can plan their day.
 */
export const STARTING_SOON_HOURS = 6;
const STARTING_SOON_MS = STARTING_SOON_HOURS * 60 * 60_000;

/**
 * Predicate: should we tag this shift as "Sắp bắt đầu" right now?
 *
 * Returns `true` iff `start - now <= 6h && start - now > 0`. Pure /
 * deterministic.
 */
export function isShiftStartingSoon(
  shift: Pick<Shift, 'date' | 'startTime'>,
  nowIso: string,
): boolean {
  const now = new Date(nowIso).getTime();
  const start = shiftMomentMs(shift.date, shift.startTime);
  if (Number.isNaN(now) || Number.isNaN(start)) return false;
  const delta = start - now;
  return delta > 0 && delta <= STARTING_SOON_MS;
}

/**
 * Compute the display phase for a single shift given the wall clock
 * and the application list. Pure / deterministic.
 *
 * Distinct from `suggestShiftStatus` because it answers a UI
 * question ("what chip do we render next to this shift?") and
 * therefore reads check-in presence directly. The lifecycle status
 * machine remains the source of truth for storage and audit; this
 * helper exists strictly for the user-facing chip.
 */
export function getShiftDisplayPhase(
  shift: Shift,
  applications: Application[],
  nowIso: string,
): ShiftDisplayPhase {
  if (shift.status === 'Cancelled') return 'Cancelled';
  if (shift.status === 'Completed') return 'Completed';
  if (shift.status === 'Expired') return 'Expired';

  const myApps = applications.filter((a) => a.shiftId === shift.id);
  const hasDispute =
    shift.escrowStatus === 'Disputed' ||
    myApps.some((a) => a.status === 'Disputed');
  if (hasDispute) return 'Disputed';

  const now = new Date(nowIso).getTime();
  const start = shiftMomentMs(shift.date, shift.startTime);
  const end = shiftMomentMs(shift.date, shift.endTime);
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) {
    return 'Upcoming';
  }

  // AwaitingEmployerConfirmation: lifecycle status flagged or any
  // app is CheckedOut waiting for confirm/dispute.
  const hasCheckedOutWaiting = myApps.some((a) => a.status === 'CheckedOut');
  if (
    shift.status === 'AwaitingConfirmation' ||
    hasCheckedOutWaiting
  ) {
    return 'AwaitingEmployerConfirmation';
  }

  // AwaitingWorkerCheckout: end has passed AND at least one app is
  // still CheckedIn (hasn't checked out yet).
  const hasMidShift = myApps.some((a) => a.status === 'CheckedIn');
  if (now >= end && hasMidShift) return 'AwaitingWorkerCheckout';

  // InProgress: now in [start, end) AND at least one app is checked in.
  if (now >= start && now < end) {
    if (hasMidShift) return 'InProgress';
    return 'Upcoming';
  }

  // CheckInOpen: within the 15-minute pre-start window.
  if (now < start && now >= start - CHECK_IN_OPEN_MINUTES * 60_000) {
    return 'CheckInOpen';
  }
  return 'Upcoming';
}
