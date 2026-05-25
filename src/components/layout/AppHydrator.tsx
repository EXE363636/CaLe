'use client';

/**
 * AppHydrator — one-shot client component that reads `loadAll()` from
 * `data/persistence.ts` on mount and seeds every Zustand store.
 *
 * Mounted once near the root of the app (in `app/layout.tsx`). Renders no
 * UI of its own; children pass through unchanged.
 *
 * Hydration runs inside `useEffect`, which only fires on the client. This
 * sidesteps SSR/CSR mismatches caused by `localStorage` access and by
 * Vietnamese-formatted dates that depend on the `vi-VN` locale being
 * active in the browser.
 */

import { useEffect, useRef, type ReactNode } from 'react';

import { loadAll } from '@/data/persistence';
import {
  useApplicationStore,
  useAuthStore,
  useEmployerFeedbackStore,
  useNotificationStore,
  useScheduleStore,
  useShiftStore,
  useUserStore,
  useVerificationStore,
} from '@/stores';

interface AppHydratorProps {
  children: ReactNode;
}

export function AppHydrator({ children }: AppHydratorProps): ReactNode {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const snapshot = loadAll();
    useUserStore.getState().hydrate(snapshot.users);
    useShiftStore.getState().hydrate(snapshot.shifts);
    useApplicationStore.getState().hydrateApplications(snapshot.applications);
    useApplicationStore.getState().hydrateRatings(snapshot.ratings);
    useApplicationStore.getState().hydrateDisputes(snapshot.disputes);
    useNotificationStore.getState().hydrate(snapshot.notifications);
    useAuthStore.getState().hydrate(snapshot.auth);
    useScheduleStore.getState().hydrate(snapshot.scheduleBlocks);
    useEmployerFeedbackStore.getState().hydrate(snapshot.employerFeedback);
    useVerificationStore
      .getState()
      .hydrate(
        snapshot.workerVerifications,
        snapshot.employerVerifications,
        snapshot.employerTypeChangeRequests,
      );

    // Phase 7: roll the shift lifecycle forward once after hydration so
    // freshly-loaded data reflects any time-driven transitions that
    // happened while the app was closed (e.g. a Published shift whose
    // start time has now passed → InProgress / Expired). Page-level
    // `useEffect` hooks call this again on entry to keep things current
    // during a single session, but the boot pass ensures the very first
    // render is consistent. No-op when nothing has moved.
    useShiftStore.getState().syncLifecycle();
    // Phase 10A-Fix-10: also flip stale Pending applications to
    // `'Expired'` so the very first dashboard paint after page reload
    // reflects the right state. Idempotent.
    useApplicationStore
      .getState()
      .expirePendingApplicationsForStartedShifts();

    // Validate persisted auth: if currentUserId points to a missing or
    // suspended user, force a logout so navigation/role chrome doesn't
    // render in an inconsistent state.
    const auth = useAuthStore.getState();
    if (auth.currentUserId) {
      const user = useUserStore.getState().findById(auth.currentUserId);
      if (!user || user.suspended) {
        auth.logout();
      }
    }
  }, []);

  return children;
}
