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
  useHydrationStore,
  useNotificationStore,
  useReviewReportStore,
  useScheduleStore,
  useShiftStore,
  useUserStore,
  useVerificationStore,
  useWalletStore,
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
    useReviewReportStore.getState().hydrate(snapshot.reviewReports);
    useVerificationStore
      .getState()
      .hydrate(
        snapshot.workerVerifications,
        snapshot.employerVerifications,
        snapshot.employerTypeChangeRequests,
      );
    useWalletStore
      .getState()
      .hydrate(snapshot.wallets, snapshot.walletLedger);

    // QA-Fix-1 E — reconcile the wallet ledger with historical
    // confirmed applications so "Số dư ví" and "Tổng thu nhập" don't
    // contradict on a fresh seed. Idempotent: no-op once any ledger
    // entry exists (runtime transactions or a prior backfill).
    useWalletStore.getState().backfillFromHistory({
      applications: snapshot.applications,
      shifts: snapshot.shifts,
    });

    // Phase 10C-Stab-1 B — single canonical orchestrator after
    // hydration so the very first render reflects time-driven
    // transitions that happened while the app was closed. Replaces
    // the prior hand-rolled `syncLifecycle` + `expirePending` +
    // `autoRelease` trio. Idempotent — repeated boot passes are
    // safe because every sub-action filters on its own audit
    // markers.
    useApplicationStore.getState().runLifecycleSync();

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

    // Signal hydration complete so detail pages can safely make their
    // `notFound()` decision (otherwise a cold load / refresh /
    // deep-link renders a permanent 404 against the still-empty store).
    useHydrationStore.getState().setHydrated(true);
  }, []);

  return children;
}
