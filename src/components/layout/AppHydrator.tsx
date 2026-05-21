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
  useNotificationStore,
  useShiftStore,
  useUserStore,
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
