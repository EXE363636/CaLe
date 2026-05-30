/**
 * CORE-STABILITY-10 — single source of truth for the shift lifecycle
 * state shown to users.
 *
 * Pure TypeScript — no React, no I/O. This module replaces the two
 * competing status systems that produced cross-page disagreement:
 *
 *   1. the stored `Shift.status` rendered raw by `ShiftStatusBadge`
 *      (lagged behind the wall clock until a lifecycle sync ran, and
 *      used a different colour — purple — for InProgress); and
 *   2. the live `getShiftDisplayPhase` rendered by `ShiftPhaseChip`
 *      (used different labels like "Sắp bắt đầu" and a different colour
 *      — green).
 *
 * `getShiftLifecycleState` is the ONE function every surface calls. It
 * is driven by the wall clock for the time-based transitions, so the
 * same `(shift, applications, nowIso)` always yields the same state on
 * the worker dashboard, worker detail, worker job list, employer
 * dashboard, employer detail, employer calendar, public list,
 * notification deeplink, and admin views.
 *
 * INVARIANTS (CORE-STABILITY-10):
 *   - The lifecycle state depends ONLY on the wall clock for the
 *     start/end transitions. Worker check-in and employer
 *     mark-present NEVER move the shift to InProgress before
 *     `startTime`, and NEVER end it before `endTime`. Presence is an
 *     application/attendance fact (see `attendanceState.ts`), not a
 *     shift-lifecycle fact.
 *   - `Draft` / `PendingDeposit` are never real public shifts.
 *   - `Completed` / `Cancelled` / `Expired` / `Disputed` are controlled
 *     terminal states and are never overwritten by the time rules.
 */

import type { Application, Shift } from '@/types';
import type { BadgeTone } from '@/components/ui';

// ---------------------------------------------------------------------------
// Canonical lifecycle state
// ---------------------------------------------------------------------------

export type ShiftLifecycleState =
  | 'Draft'
  | 'PendingDeposit'
  | 'Published'
  | 'StartingSoon'
  | 'InProgress'
  | 'AwaitingCheckout'
  | 'AwaitingEmployerConfirmation'
  | 'Completed'
  | 'Expired'
  | 'Cancelled'
  | 'Disputed';

/**
 * Minutes before `startTime` at which a Published shift flips to
 * `StartingSoon`. Kept small (matches the worker check-in window) so
 * "Sắp bắt đầu" genuinely means "about to begin", never a shift hours
 * away or — critically — a shift that has already started.
 */
export const STARTING_SOON_MINUTES = 15;

const MS_PER_MINUTE = 60_000;
const STARTING_SOON_MS = STARTING_SOON_MINUTES * MS_PER_MINUTE;

function shiftMomentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

// ---------------------------------------------------------------------------
// Source of truth
// ---------------------------------------------------------------------------

/**
 * Compute the single canonical lifecycle state for a shift at `nowIso`.
 *
 * Precedence:
 *   1. Controlled terminal states (Cancelled / Completed / Expired) and
 *      Draft / PendingDeposit are honoured first — the clock never
 *      overrides them.
 *   2. Dispute (escrow Disputed or any application Disputed) takes
 *      precedence over the time rules.
 *   3. Post-checkout: any application CheckedOut (awaiting confirm) →
 *      AwaitingEmployerConfirmation.
 *   4. Time rules (the only place the wall clock matters):
 *      - now < start − 15min → Published
 *      - start − 15min ≤ now < start → StartingSoon
 *      - start ≤ now < end → InProgress
 *      - now ≥ end → AwaitingCheckout if a worker still needs to check
 *        out / be confirmed, else AwaitingEmployerConfirmation, else
 *        Expired (nobody ever showed up).
 *
 * Check-in / mark-present do NOT appear in the time rules — they are
 * attendance facts. The only way presence influences the post-end state
 * is to distinguish "someone worked, awaiting checkout/confirm" from
 * "nobody showed → expired".
 */
export function getShiftLifecycleState(
  shift: Shift,
  applications: Application[],
  nowIso: string,
): ShiftLifecycleState {
  // 1. Controlled / non-public states first.
  if (shift.status === 'Cancelled') return 'Cancelled';
  if (shift.status === 'Completed') return 'Completed';
  if (shift.status === 'Expired') return 'Expired';
  if (shift.status === 'Draft') return 'Draft';
  if (shift.escrowStatus === 'PendingDeposit') return 'PendingDeposit';

  const myApps = applications.filter((a) => a.shiftId === shift.id);

  // 2. Dispute beats the time rules.
  const hasDispute =
    shift.escrowStatus === 'Disputed' ||
    myApps.some((a) => a.status === 'Disputed');
  if (hasDispute) return 'Disputed';

  // 3. AwaitingConfirmation status, or any checked-out application
  // waiting on the employer.
  const hasCheckedOutWaiting = myApps.some((a) => a.status === 'CheckedOut');
  if (shift.status === 'AwaitingConfirmation' || hasCheckedOutWaiting) {
    return 'AwaitingEmployerConfirmation';
  }

  // 4. Time rules — the ONLY place the wall clock matters.
  const now = new Date(nowIso).getTime();
  const start = shiftMomentMs(shift.date, shift.startTime);
  const end = shiftMomentMs(shift.date, shift.endTime);
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) {
    return 'Published';
  }

  if (now >= end) {
    // Post-end. Distinguish "work happened, awaiting checkout/confirm"
    // from "nobody showed → expired". Presence is read ONLY to make
    // this distinction, never to advance the shift before its time.
    const hasMidShift = myApps.some((a) => a.status === 'CheckedIn');
    if (hasMidShift) return 'AwaitingCheckout';
    const hasConfirmed = myApps.some((a) => a.status === 'Confirmed');
    if (hasConfirmed) return 'AwaitingEmployerConfirmation';
    // Nobody checked in / confirmed → the shift expired without
    // execution. (The stored status will catch up via lifecycle sync.)
    return 'Expired';
  }

  if (now >= start) {
    // start ≤ now < end — strictly time-driven. A worker checking in
    // (or not) does not change this; the shift is in progress because
    // the clock says so.
    return 'InProgress';
  }

  if (now >= start - STARTING_SOON_MS) {
    return 'StartingSoon';
  }

  return 'Published';
}

// ---------------------------------------------------------------------------
// Single badge mapping (label + tone + priority)
// ---------------------------------------------------------------------------

export interface ShiftStatusBadgeInfo {
  /** Canonical lifecycle state. */
  state: ShiftLifecycleState;
  /** i18n key for the label. */
  labelKey: string;
  /** Shared Badge tone — the SAME tone for the SAME state everywhere. */
  tone: BadgeTone;
  /**
   * Rendering priority when more than one badge could apply on a
   * surface. Higher = more important. Lets a caller pick the single
   * primary lifecycle badge and avoid contradictory chips.
   */
  priority: number;
}

/**
 * The ONE mapping from a lifecycle state to its label + colour.
 *
 * Colour rules (CORE-STABILITY-10 Part 6):
 *   - "Đang diễn ra" (InProgress) is ALWAYS `info` (blue) — never
 *     purple in one place and green in another.
 *   - "Sắp bắt đầu" (StartingSoon) is `warning` (amber).
 *   - Each state has exactly one tone, used on every surface.
 */
const BADGE_BY_STATE: Record<ShiftLifecycleState, ShiftStatusBadgeInfo> = {
  Draft: {
    state: 'Draft',
    labelKey: 'shift.lifecycle.Draft',
    tone: 'neutral',
    priority: 0,
  },
  PendingDeposit: {
    state: 'PendingDeposit',
    labelKey: 'shift.lifecycle.PendingDeposit',
    tone: 'neutral',
    priority: 10,
  },
  Published: {
    state: 'Published',
    labelKey: 'shift.lifecycle.Published',
    tone: 'info',
    priority: 20,
  },
  StartingSoon: {
    state: 'StartingSoon',
    labelKey: 'shift.lifecycle.StartingSoon',
    tone: 'warning',
    priority: 30,
  },
  InProgress: {
    state: 'InProgress',
    labelKey: 'shift.lifecycle.InProgress',
    tone: 'info',
    priority: 40,
  },
  AwaitingCheckout: {
    state: 'AwaitingCheckout',
    labelKey: 'shift.lifecycle.AwaitingCheckout',
    tone: 'warning',
    priority: 50,
  },
  AwaitingEmployerConfirmation: {
    state: 'AwaitingEmployerConfirmation',
    labelKey: 'shift.lifecycle.AwaitingEmployerConfirmation',
    tone: 'warning',
    priority: 60,
  },
  Disputed: {
    state: 'Disputed',
    labelKey: 'shift.lifecycle.Disputed',
    tone: 'danger',
    priority: 90,
  },
  Completed: {
    state: 'Completed',
    labelKey: 'shift.lifecycle.Completed',
    tone: 'success',
    priority: 80,
  },
  Expired: {
    state: 'Expired',
    labelKey: 'shift.lifecycle.Expired',
    tone: 'neutral',
    priority: 70,
  },
  Cancelled: {
    state: 'Cancelled',
    labelKey: 'shift.lifecycle.Cancelled',
    tone: 'danger',
    priority: 85,
  },
};

/** Return the canonical badge info (label key + tone + priority) for a state. */
export function getShiftStatusBadge(
  state: ShiftLifecycleState,
): ShiftStatusBadgeInfo {
  return BADGE_BY_STATE[state];
}
