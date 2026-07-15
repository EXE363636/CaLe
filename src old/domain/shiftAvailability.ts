/**
 * Phase 10A-Fix-5 — canonical "is this shift open for new applicants" helper.
 *
 * The legacy filter on `/shifts` and the homepage featured-job picker
 * each rolled their own predicate using only `shift.positionsFilled`.
 * That field can drift out of sync with the application store —
 * especially during a session where an admin has just confirmed the
 * last seat. Manual QA caught a 3/3 shift still appearing on the
 * homepage as featured.
 *
 * `isShiftAvailableForRecruiting` is the single source of truth. It
 * uses the **safer** of the two occupancy signals:
 *
 *   filled = max(shift.positionsFilled, approvedOrConfirmedAppCount)
 *
 * so a stale `positionsFilled` can never let a full shift slip through.
 *
 * The helper is pure; callers pass in `applications` (the raw store
 * slice). Performance: O(applications.length) per call. The featured
 * picker calls this once per shift inside a `useMemo`, so the cost is
 * bounded by the number of seeded shifts.
 */

import type { Application, Shift } from '@/types';

/**
 * Application statuses that occupy a confirmed slot. `Pending` is
 * intentionally excluded because the worker hasn't been approved yet.
 * `CancellationRequested` IS counted because the shift hasn't actually
 * freed the seat — the cancellation might be rejected by the employer.
 *
 * Mirrors the existing `ACTIVE_STATUSES` rule in
 * `applicationStore.ts` (Phase 2 cancellation flow).
 */
const OCCUPYING_STATUSES = new Set<Application['status']>([
  'Approved',
  'CancellationRequested',
  'CheckedIn',
  'CheckedOut',
  'Confirmed',
]);

export function approvedOrConfirmedApplicationCount(
  shiftId: string,
  applications: Application[],
): number {
  let count = 0;
  for (const a of applications) {
    if (a.shiftId !== shiftId) continue;
    if (OCCUPYING_STATUSES.has(a.status)) count += 1;
  }
  return count;
}

export function effectiveFilledCount(
  shift: Shift,
  applications: Application[],
): number {
  const live = approvedOrConfirmedApplicationCount(shift.id, applications);
  return Math.max(shift.positionsFilled, live);
}

/**
 * Canonical predicate for "this shift is currently open for new
 * applicants". Returns `true` only when:
 *
 *   - status is `Published` (recruiting),
 *   - escrow is `Deposited` (employer paid the mock deposit),
 *   - start time is strictly in the future,
 *   - effective occupancy is below `positionsTotal`.
 *
 * Marketing / discovery surfaces should ALL go through this helper.
 * Owner / admin surfaces that intentionally show full or completed
 * shifts (e.g. the employer's manage page) should NOT use it.
 */
export function isShiftAvailableForRecruiting(
  shift: Shift,
  applications: Application[] | undefined,
  nowMs: number,
): boolean {
  if (shift.status !== 'Published') return false;
  if (shift.escrowStatus !== 'Deposited') return false;
  const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
  if (!Number.isFinite(startMs)) return false;
  if (startMs < nowMs) return false;
  const filled = applications
    ? effectiveFilledCount(shift, applications)
    : shift.positionsFilled;
  if (filled >= shift.positionsTotal) return false;
  return true;
}

/**
 * Convenience selector — returns the eligible-for-recruiting subset
 * of a shift list, sorted by soonest start time. Stable enough for
 * `useMemo` consumers.
 */
export function selectAvailableShiftsForRecruiting(
  shifts: Shift[],
  applications: Application[] | undefined,
  nowMs: number,
): Shift[] {
  return shifts
    .filter((s) => isShiftAvailableForRecruiting(s, applications, nowMs))
    .sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
}
