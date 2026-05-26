'use client';

/**
 * One-shot lifecycle sync hook (Phase 7, extended in Phase 10A-Fix-10
 * and rebuilt in Phase 10C-Stabilization-1 B).
 *
 * Runs `applicationStore.runLifecycleSync()` exactly once when the
 * component that calls this hook mounts. The store action is the
 * canonical orchestrator that:
 *
 *   1. rolls shift statuses forward (`shiftStore.syncLifecycle`),
 *   2. expires stale Pending applications,
 *   3. emits idempotent `ShiftStarted` / `ShiftEnded` notifications,
 *   4. settles 12 h auto-release eligible applications.
 *
 * Designed for top-level page components that the user can land on
 * directly:
 *
 *   - `/shifts`
 *   - `/worker/dashboard`
 *   - `/employer/dashboard`
 *   - `/employer/shifts/[id]`
 *   - `/admin/dashboard`
 *
 * Every sub-step is idempotent — re-mounting the page (e.g. SPA
 * navigation) is safe.
 *
 * No `setInterval`, no polling. The MVP only needs page-load
 * freshness; the trade-off is documented as a known limitation.
 */

import { useEffect } from 'react';

import { useApplicationStore } from '@/stores/applicationStore';

export function useLifecycleSync(): void {
  useEffect(() => {
    // Phase 10C-Stab-1 B — single canonical orchestrator. Replaces
    // the prior 3-step hand-rolled sequence with one call that also
    // emits idempotent `ShiftStarted` / `ShiftEnded` notifications.
    useApplicationStore.getState().runLifecycleSync();
  }, []);
}
