'use client';

/**
 * One-shot lifecycle sync hook (Phase 7).
 *
 * Runs `useShiftStore.syncLifecycle()` exactly once when the component
 * that calls this hook mounts. Designed for top-level page components
 * that the user can land on directly:
 *
 *   - `/shifts`
 *   - `/worker/dashboard`
 *   - `/employer/dashboard`
 *   - `/employer/shifts/[id]`
 *   - `/admin/dashboard`
 *
 * The sync is idempotent — `syncLifecycle()` no-ops when nothing has
 * moved — so re-mounting the page (e.g. SPA navigation) is safe.
 *
 * No `setInterval`, no polling. The MVP only needs page-load freshness;
 * the trade-off is documented as a known limitation.
 */

import { useEffect } from 'react';

import { useShiftStore } from '@/stores/shiftStore';

export function useLifecycleSync(): void {
  useEffect(() => {
    useShiftStore.getState().syncLifecycle();
    // Empty deps: fire once on mount. The store's own no-op behavior
    // takes care of repeated mounts, so we don't need a stable callback.
  }, []);
}
