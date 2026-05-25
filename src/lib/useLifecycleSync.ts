'use client';

/**
 * One-shot lifecycle sync hook (Phase 7, extended in Phase 10A-Fix-10).
 *
 * Runs `useShiftStore.syncLifecycle()` AND
 * `useApplicationStore.expirePendingApplicationsForStartedShifts()` exactly
 * once when the component that calls this hook mounts. Designed for
 * top-level page components that the user can land on directly:
 *
 *   - `/shifts`
 *   - `/worker/dashboard`
 *   - `/employer/dashboard`
 *   - `/employer/shifts/[id]`
 *   - `/admin/dashboard`
 *
 * Both syncs are idempotent — the underlying actions no-op when nothing
 * has moved — so re-mounting the page (e.g. SPA navigation) is safe.
 *
 * No `setInterval`, no polling. The MVP only needs page-load freshness;
 * the trade-off is documented as a known limitation.
 */

import { useEffect } from 'react';

import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';

export function useLifecycleSync(): void {
  useEffect(() => {
    // Phase 7: roll shift lifecycle (Published → InProgress / Expired,
    // etc.) before anything else so the next pass sees the freshest
    // shift statuses.
    useShiftStore.getState().syncLifecycle();
    // Phase 10A-Fix-10: expire stale Pending applications whose shift
    // has started or moved into a terminal state. Idempotent — only
    // applications still in `'Pending'` are touched, so repeated
    // mounts produce zero further state changes.
    useApplicationStore
      .getState()
      .expirePendingApplicationsForStartedShifts();
    // Empty deps: fire once on mount. The store's own no-op behaviour
    // takes care of repeated mounts, so we don't need a stable callback.
  }, []);
}
