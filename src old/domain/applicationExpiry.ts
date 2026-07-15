/**
 * Phase 10A-Fix-10 — pure helpers for expiring Pending applications
 * after the shift has started or otherwise stopped accepting workers.
 *
 * Pre-Fix-10 the platform left stale `Pending` applications hanging on
 * both the employer dashboard ("Đơn ứng tuyển chờ duyệt") and the
 * worker dashboard ("Chờ duyệt") even after the shift had started —
 * `Phase 10A-Fix-9` only blocked the approve action at the store
 * layer; nothing actually transitioned the application out of Pending.
 * This module is the canonical place to run the cleanup.
 *
 * Rules:
 *
 *   - Only `Pending` applications are touched. Approved / CheckedIn /
 *     CheckedOut / Confirmed / Rejected / CancelledByEmployer /
 *     CancelledByWorker / Expired stay where they are.
 *   - A pending application expires when:
 *       (a) shift's start datetime has passed, OR
 *       (b) shift status is `InProgress` / `AwaitingConfirmation` /
 *           `Completed` / `Cancelled` / `Expired`.
 *   - Worker is NOT penalised — no reputation drop, no quota tick, no
 *     cancellation-history entry. The protection mirrors the
 *     employer-cancellation rule from Phase 10A-Fix-7.
 *   - Idempotent: running the helper twice on the same data produces
 *     identical output and zero new notifications (callers track the
 *     `expiredIds` return field to fan out notifications exactly once).
 *
 * The helper is framework-free; the store wires the side effects.
 */

import type { Application, Shift, ShiftStatus } from '@/types';

/** Shift statuses that mean "no longer recruiting" for expiry purposes. */
const NON_RECRUITABLE_SHIFT_STATUSES: ReadonlySet<ShiftStatus> = new Set<
  ShiftStatus
>([
  'InProgress',
  'AwaitingConfirmation',
  'Completed',
  'Cancelled',
  'Expired',
]);

/**
 * Decide whether a given shift would expire any pending application
 * targeted at it. Mirrors the gate inside `applicationStore.approve`
 * so the two paths can never disagree.
 */
export function shouldExpirePendingForShift(
  shift: Shift,
  nowMs: number,
): boolean {
  if (NON_RECRUITABLE_SHIFT_STATUSES.has(shift.status)) return true;
  const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
  if (!Number.isFinite(startMs)) return false;
  return startMs <= nowMs;
}

export interface ExpirePendingPlanResult {
  /** New applications array with `Pending` → `Expired` flips applied. */
  applications: Application[];
  /** IDs of applications that actually changed in this pass. */
  expiredIds: string[];
}

/**
 * Pure planner: given the current applications + shifts + clock,
 * return the next applications array (with `Pending` → `Expired`
 * flips) plus the list of changed application IDs. Caller is
 * responsible for persisting the array and fanning out one
 * notification per changed ID.
 *
 * The function is idempotent in the steady state — applications that
 * are already `Expired` produce no further changes, and the returned
 * `expiredIds` is empty when nothing moved.
 */
export function planExpirePendingApplications(
  applications: Application[],
  shifts: Shift[],
  nowIso: string,
): ExpirePendingPlanResult {
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(nowMs)) {
    return { applications, expiredIds: [] };
  }

  // Index shifts once; every Pending application probes this map.
  const shiftById = new Map<string, Shift>();
  for (const s of shifts) shiftById.set(s.id, s);

  const expiredIds: string[] = [];
  const next: Application[] = applications.map((a) => {
    if (a.status !== 'Pending') return a;
    const shift = shiftById.get(a.shiftId);
    if (!shift) return a;
    if (!shouldExpirePendingForShift(shift, nowMs)) return a;
    expiredIds.push(a.id);
    return {
      ...a,
      status: 'Expired',
      expiredAt: nowIso,
      expiredReason: 'Ca đã bắt đầu trước khi đơn được duyệt.',
    };
  });

  return { applications: next, expiredIds };
}
