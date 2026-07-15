/**
 * Phase 10C-Stabilization-1 — central lifecycle sync helper.
 *
 * Pure orchestration over the existing sub-helpers:
 *
 *   - `suggestShiftStatus` (`domain/shiftLifecycle.ts`) — rolls
 *     `Published` / `FullyBooked` / `InProgress` shifts forward
 *     based on `now`.
 *   - `planExpirePendingApplications` (`domain/applicationExpiry.ts`)
 *     — flips stale `Pending` applications to `Expired` once the
 *     shift starts.
 *   - `autoReleaseEligibleApplications` (`applicationStore`,
 *     Wave 5B) — auto-confirms checked-out applications 12 h after
 *     `checkOutAt` when no dispute is open.
 *
 * This module hosts a *plan* function that returns the diffed
 * snapshot for callers (the application store, mostly) to persist.
 * The Zustand-side `useShiftStore.syncLifecycle()` and
 * `useApplicationStore.expirePendingApplicationsForStartedShifts()`
 * /`autoReleaseEligibleApplications()` actions remain the canonical
 * persistence layer; this helper composes them so every page mount
 * runs the full sequence in one go.
 *
 * NEVER uses `setTimeout`, `setInterval`, polling, or any external
 * API. The Phase 10C-Stab-1 constraint: lifecycle sync runs on
 * page mount / app hydration only.
 */

import {
  planExpirePendingApplications,
  type ExpirePendingPlanResult,
} from './applicationExpiry';
import {
  syncLifecycle,
  type LifecycleSyncResult,
} from './shiftLifecycle';
import type { Application, Shift } from '@/types';

export interface LifecyclePlanInput {
  shifts: Shift[];
  applications: Application[];
  /** ISO 8601 wall-clock; defaults to `new Date().toISOString()` at
   *  the call site if omitted. */
  nowIso: string;
}

export interface LifecyclePlanResult {
  /** Shifts after applying time-driven status transitions. */
  shifts: Shift[];
  /** Shift IDs whose status changed in this pass. */
  changedShiftIds: string[];
  /** Applications after expiring stale `Pending` records. */
  applications: Application[];
  /** Application IDs that flipped `Pending` → `Expired`. */
  expiredApplicationIds: string[];
  /** ISO timestamp of this pass (echoed for caller convenience). */
  syncedAt: string;
}

/**
 * Pure planner: given the current shift + application snapshot and a
 * wall-clock, returns the diffed next snapshot. Caller is responsible
 * for persisting the slices and fanning out notifications.
 *
 * The planner is idempotent — running it twice on the same input
 * produces identical output and `changedShiftIds` /
 * `expiredApplicationIds` of `[]`.
 *
 * Auto-release is intentionally NOT in this planner. The Wave 5B
 * action `applicationStore.autoReleaseEligibleApplications` mutates
 * many slices (applications, ratings, shifts, notifications,
 * worker reputation, skill scores) and re-uses `confirmCompletion`
 * end-to-end — packaging that into a pure planner would duplicate
 * the entire side-effect surface. Callers run the auto-release
 * action AFTER persisting this planner's output (the established
 * order is `syncLifecycle → expirePending → autoRelease`).
 */
export function planLifecycleSync(
  input: LifecyclePlanInput,
): LifecyclePlanResult {
  const { shifts, applications, nowIso } = input;

  // 1. Roll shift statuses forward based on time + applications.
  const shiftResult: LifecycleSyncResult = syncLifecycle(
    shifts,
    applications,
    nowIso,
  );

  // 2. Expire stale Pending applications. The planner runs against
  //    the POST-shift-sync snapshot so a Published-but-just-expired
  //    shift's Pending applicants get expired in the same pass.
  const expiryResult: ExpirePendingPlanResult = planExpirePendingApplications(
    applications,
    shiftResult.shifts,
    nowIso,
  );

  return {
    shifts: shiftResult.shifts,
    changedShiftIds: shiftResult.changedIds,
    applications: expiryResult.applications,
    expiredApplicationIds: expiryResult.expiredIds,
    syncedAt: nowIso,
  };
}
