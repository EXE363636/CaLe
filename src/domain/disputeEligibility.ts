/**
 * Worker dispute eligibility helper.
 *
 * Phase 10C-Stab-1 Batch 4 D — pure helper used by the worker UI and
 * `applicationStore.workerOpenDispute` to gate dispute filing on:
 *
 *   - employer has filed a dispute against this worker → worker can
 *     respond via `appendDisputeResponse` (eligible),
 *   - worker is `'CheckedOut'` AND `now >= autoReleaseAt - 1h` AND no
 *     existing dispute → eligible (employer near-miss),
 *   - app is `'Approved' | 'CheckedIn' | 'CheckedOut' | 'Confirmed' |
 *     'NoShow'` AND category is workplace/scope → eligible regardless
 *     of timing,
 *   - app is `'CheckedOut'` and category is `'PaymentDispute'` AND
 *     `now < autoReleaseAt - 1h` → `'notYet'`.
 *
 * Pure / deterministic; no React, no I/O.
 */

import type { Application, Dispute, Shift } from '@/types';

export type WorkerDisputeEligibility =
  | 'eligible'
  | 'notYet'
  | 'blocked';

/**
 * Compute the worker's dispute eligibility for a given application.
 *
 * @param application Worker application record.
 * @param shift       Owning shift (only used for context; unused for
 *                    timing today, reserved for future expansion).
 * @param dispute     Optional existing dispute on the application.
 * @param nowIso      Wall-clock ISO-8601 timestamp.
 */
export function canWorkerOpenDispute(
  application: Application,
  shift: Shift,
  dispute: Dispute | undefined,
  nowIso: string,
): WorkerDisputeEligibility {
  void shift;
  const status = application.status;

  // If a non-terminal dispute already exists, the worker can respond
  // via `appendDisputeResponse` (eligible).
  if (dispute) {
    const TERMINAL = new Set([
      'ResolvedReleased',
      'ResolvedRefunded',
      'PartialRelease',
      'ClosedInvalid',
    ]);
    if (!TERMINAL.has(dispute.status)) return 'eligible';
  }

  // CheckedOut + within last 1h before auto-release → eligible.
  if (status === 'CheckedOut' && application.autoReleaseAt) {
    const now = new Date(nowIso).getTime();
    const autoReleaseMs = new Date(application.autoReleaseAt).getTime();
    if (Number.isFinite(now) && Number.isFinite(autoReleaseMs)) {
      if (now >= autoReleaseMs - 60 * 60_000) return 'eligible';
      // Earlier than the 1-hour window → notYet (only matters for
      // PaymentDispute; other categories are handled in the store).
      return 'notYet';
    }
  }

  // Approved / CheckedIn / Confirmed / NoShow — workplace / scope
  // categories are always eligible. The store gates on category to
  // route PaymentDispute through the `notYet` path.
  if (
    status === 'Approved' ||
    status === 'CheckedIn' ||
    status === 'Confirmed' ||
    status === 'NoShow'
  ) {
    return 'eligible';
  }

  return 'blocked';
}
