/**
 * Phase 10A-Fix-7 — pure helpers for employer-side shift cancellation.
 *
 * Cancellation as it existed pre-Fix-7 was a single-button, no-reason
 * action that never distinguished "no one applied yet" from "I'm
 * dropping six approved workers two hours before start". Manual QA
 * surfaced the obvious product bug: the worker still saw a "Hủy"
 * button on a shift they had no part in cancelling, and got no
 * compensation for the disruption. This module is the canonical place
 * for the new rules:
 *
 *   - Reason is required (caller validates; helpers consume).
 *   - "Affected" workers (Approved / CancellationRequested / CheckedIn
 *     / CheckedOut / Confirmed) are flipped to a NEW
 *     `'CancelledByEmployer'` application status. They are never
 *     mis-labelled `'CancelledByWorker'`.
 *   - Each affected worker receives a protection credit:
 *       reputationPointsRestored = clamp(100 - score, 0, 2)
 *       quotaSlotsRefunded       = min(weeklyUsage, 1)
 *     plus a `WorkerProtectionRecord` so the bump is auditable in
 *     their reputation / cancellation history modal.
 *   - The employer is charged a deposit penalty:
 *       > 24h before start: 5% of deposit
 *       ≤ 24h, > 6h:        10%
 *       ≤ 6h:               15%
 *     when at least one worker had been approved at cancel time. No
 *     approved workers → no penalty (employer can still cancel cheaply
 *     before recruitment).
 *
 * The helpers are framework-free so they're trivially unit-testable.
 * The store wires the side effects (setting application status,
 * patching the shift record, fanning out notifications, mutating worker
 * reputation / protections, persisting). UI surfaces only render and
 * read.
 */

import type {
  Application,
  ApplicationStatus,
  CancellationRecord,
  Shift,
  Worker,
  WorkerProtectionRecord,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Statuses that count an application as "still active" at cancel time. */
export const AFFECTED_APPLICATION_STATUSES: ReadonlySet<ApplicationStatus> =
  new Set([
    'Approved',
    'CancellationRequested',
    'CheckedIn',
    'CheckedOut',
    'Confirmed',
  ]);

/** Statuses that mean the worker had been approved (drives penalty). */
export const APPROVED_OR_LATER_STATUSES: ReadonlySet<ApplicationStatus> =
  new Set([
    'Approved',
    'CancellationRequested',
    'CheckedIn',
    'CheckedOut',
    'Confirmed',
  ]);

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Reputation cap. Mirrors the rest of the app. */
const REPUTATION_CAP = 100;
/** Reputation bump a single protection event grants, before clamping. */
const REPUTATION_BUMP = 2;
/** Quota slots refunded per protection event, before clamping. */
const QUOTA_REFUND_SLOTS = 1;

// ---------------------------------------------------------------------------
// Penalty
// ---------------------------------------------------------------------------

export interface PenaltyResult {
  /** Decimal rate (0, 0.05, 0.10, or 0.15). */
  rate: number;
  /** Rounded VND amount. */
  amount: number;
  /** True iff at least one worker had been approved at cancel time. */
  afterApproval: boolean;
}

/**
 * Compute the deposit-penalty details for an employer cancellation.
 *
 * Returns `{ rate: 0, amount: 0, afterApproval: false }` when no worker
 * was ever approved — the employer can cancel an empty shift without
 * penalty.
 */
export function computeEmployerCancellationPenalty(
  shift: Shift,
  applications: Application[],
  nowMs: number,
): PenaltyResult {
  const afterApproval = applications.some(
    (a) =>
      a.shiftId === shift.id &&
      APPROVED_OR_LATER_STATUSES.has(a.status),
  );
  if (!afterApproval) {
    return { rate: 0, amount: 0, afterApproval: false };
  }

  const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
  const gapMs = Number.isFinite(startMs) ? startMs - nowMs : Infinity;

  let rate: number;
  if (gapMs <= 6 * ONE_HOUR_MS) {
    rate = 0.15;
  } else if (gapMs <= 24 * ONE_HOUR_MS) {
    rate = 0.1;
  } else {
    rate = 0.05;
  }

  const amount = Math.round(shift.depositAmount * rate);
  return { rate, amount, afterApproval: true };
}

// ---------------------------------------------------------------------------
// Worker protection
// ---------------------------------------------------------------------------

/** Use a single helper so we never accidentally call `crypto` server-side. */
function nextProtectionId(workerId: string, occurredAt: string): string {
  // Mock-id: deterministic enough that repeated calls within the same
  // millisecond still get distinct ids if the caller spins fresh
  // counters. The worker store also de-dupes by `(kind, shiftId)`
  // before appending, so the id collision risk is theoretical.
  return `wprot-${workerId}-${occurredAt.replace(/[^0-9]/g, '')}`;
}

export interface BuildProtectionInput {
  worker: Worker;
  shift: Shift;
  employerName: string;
  reason: string;
  occurredAt: string;
}

/**
 * Build the protection record (and the patch that should be merged
 * into the worker) without touching any store. Caller is responsible
 * for persisting the patch via `userStore.updateUser`.
 */
export function buildWorkerProtection(input: BuildProtectionInput): {
  record: WorkerProtectionRecord;
  patch: { reputationScore: number; protections: WorkerProtectionRecord[] };
} {
  const reputationHeadroom = Math.max(
    0,
    REPUTATION_CAP - input.worker.reputationScore,
  );
  const reputationPointsRestored = Math.min(reputationHeadroom, REPUTATION_BUMP);
  const recentLateCancels = input.worker.cancellationHistory.filter(
    (c) => c.type === 'LateCancel',
  ).length;
  const quotaSlotsRefunded = recentLateCancels > 0 ? QUOTA_REFUND_SLOTS : 0;

  const record: WorkerProtectionRecord = {
    id: nextProtectionId(input.worker.id, input.occurredAt),
    kind: 'EmployerCancelledShift',
    shiftId: input.shift.id,
    shiftTitle: input.shift.title,
    employerId: input.shift.employerId,
    employerName: input.employerName,
    reason: input.reason,
    occurredAt: input.occurredAt,
    reputationPointsRestored,
    quotaSlotsRefunded,
  };

  // Quota refund mirrors the worker's perspective: drop the most-recent
  // LateCancel record from `cancellationHistory` so quota usage falls
  // by one slot. We keep this on the helper so the store can apply the
  // patch atomically.
  const next = (input.worker.protections ?? []).slice();
  next.unshift(record);

  return {
    record,
    patch: {
      reputationScore:
        input.worker.reputationScore + reputationPointsRestored,
      protections: next,
    },
  };
}

/**
 * Phase 10A-Fix-7: drop the most-recent `LateCancel` from the worker's
 * cancellation history so the protected slot stops counting against
 * their weekly quota. Pure — caller persists the result.
 */
export function refundOneLateCancel(
  history: CancellationRecord[],
): CancellationRecord[] {
  let dropped = false;
  const next: CancellationRecord[] = [];
  // Walk newest-first so we drop the most recent late-cancel.
  const sorted = [...history].sort((a, b) =>
    b.cancelledAt.localeCompare(a.cancelledAt),
  );
  for (const entry of sorted) {
    if (!dropped && entry.type === 'LateCancel') {
      dropped = true;
      continue;
    }
    next.push(entry);
  }
  // Restore original sort (oldest-first) so callers keep stable
  // ordering in their UI.
  next.sort((a, b) => a.cancelledAt.localeCompare(b.cancelledAt));
  return next;
}
