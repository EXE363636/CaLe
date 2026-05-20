/**
 * Reputation domain module.
 *
 * Pure TypeScript — no React, no Next, no I/O. Deterministic and easily
 * property-tested. Backs Requirements 8.x (reputation lifecycle), 12.1–12.3
 * (cancellation classification), and 14.5 (admin manual adjustment).
 *
 * Score model:
 *  - All workers start at `INITIAL_SCORE` (100).
 *  - Score is always clamped to `[MIN_SCORE, MAX_SCORE]` (`[0, 100]`).
 *  - Workers below `APPLY_THRESHOLD` (50) cannot apply to new shifts.
 */

import type { ApplicationStatus } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INITIAL_SCORE = 100;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;
export const APPLY_THRESHOLD = 50;

/** Reputation deltas for the non-admin event kinds (Req 8.2–8.4). */
const COMPLETED_DELTA = 5;
const NO_SHOW_DELTA = -20;
const LATE_CANCEL_DELTA = -10;

/** Late-cancel window in milliseconds (24 hours). */
const LATE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of events that can change a worker's reputation.
 *
 * `AdminAdjust` carries an explicit signed `delta`. The delta is added as-is
 * (it is *not* clamped before addition), but the resulting score is always
 * clamped to `[MIN_SCORE, MAX_SCORE]`.
 */
export type ReputationEvent =
  | { kind: 'Completed' }
  | { kind: 'NoShow' }
  | { kind: 'LateCancel' }
  | { kind: 'AdminAdjust'; delta: number };

/** Result of classifying a worker-initiated cancellation. */
export type CancellationClass = 'NoPenalty' | 'OnTime' | 'LateCancel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number): number {
  if (n < MIN_SCORE) return MIN_SCORE;
  if (n > MAX_SCORE) return MAX_SCORE;
  return n;
}

function deltaFor(event: ReputationEvent): number {
  switch (event.kind) {
    case 'Completed':
      return COMPLETED_DELTA;
    case 'NoShow':
      return NO_SHOW_DELTA;
    case 'LateCancel':
      return LATE_CANCEL_DELTA;
    case 'AdminAdjust':
      return event.delta;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a single reputation event to a starting score and return the new
 * score, clamped to `[MIN_SCORE, MAX_SCORE]`.
 *
 * The starting score is also clamped before adding the delta so that callers
 * cannot drift outside the legal range by feeding back stored values.
 */
export function applyReputationEvent(
  score: number,
  event: ReputationEvent,
): number {
  return clamp(clamp(score) + deltaFor(event));
}

/**
 * Predicate: does this score allow the worker to apply to new shifts?
 *
 * `true` iff `score >= APPLY_THRESHOLD` (Req 8.5).
 */
export function canApplyToShifts(score: number): boolean {
  return score >= APPLY_THRESHOLD;
}

/**
 * Classify a worker-initiated cancellation as `NoPenalty`, `OnTime`, or
 * `LateCancel` based on the application's current status and the time
 * remaining until the shift starts (Req 12.1–12.3).
 *
 * Rules:
 *  - `Pending` → `NoPenalty` (employer hadn't approved yet).
 *  - Any other non-`Approved` status → `NoPenalty` (defensive; nothing to
 *    penalise because the worker isn't on the hook for the shift).
 *  - `Approved` and the shift starts at least 24h from `now` → `OnTime`.
 *  - `Approved` and the shift starts inside the 24h window (or has already
 *    started) → `LateCancel`. Cancelling after the shift has begun is still
 *    treated as a late cancellation so the worker is penalised.
 *
 * Both timestamps are ISO 8601 strings.
 */
export function classifyCancellation(
  applicationStatus: ApplicationStatus,
  shiftStartISO: string,
  nowISO: string,
): CancellationClass {
  if (applicationStatus === 'Pending') return 'NoPenalty';
  if (applicationStatus !== 'Approved') return 'NoPenalty';

  const shiftStart = Date.parse(shiftStartISO);
  const now = Date.parse(nowISO);

  // Defensive: an unparseable timestamp shouldn't reward the worker. Treat
  // it the same as a same-day cancellation.
  if (Number.isNaN(shiftStart) || Number.isNaN(now)) return 'LateCancel';

  const msUntilStart = shiftStart - now;
  if (msUntilStart >= LATE_CANCEL_WINDOW_MS) return 'OnTime';
  return 'LateCancel';
}
