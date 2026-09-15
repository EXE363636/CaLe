'use client';

/**
 * AppHydrator — one-shot client component nạp trạng thái ban đầu vào mọi Zustand
 * store khi mount (đặt 1 lần ở app/layout.tsx).
 *
 * BACKEND-MIGRATION-1 · Phase 1 · hybrid boot + guardrails:
 *   - MỌI slice (kể cả users seed) nạp từ localStorage `loadAll()` để seed
 *     shifts/applications không vỡ (migrate ở Phase 2).
 *   - Chế độ supabase: khôi phục session (`getSession` → `syncSessionUser`) +
 *     `subscribeAuth`. `public_profiles`-of-others hoãn Phase 2.
 *   - Lỗi cấu hình data mode: KHÔNG fallback local — hiện lỗi chặn (guardrail 1/5).
 *   - Lỗi khôi phục session: hiện banner lỗi + nút Thử lại (guardrail 5), KHÔNG
 *     âm thầm render như bình thường.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { loadAll } from '@/data/persistence';
import { getDataMode, getSupabaseClient } from '@/data/supabaseClient';
import {
  useApplicationStore,
  useAuthStore,
  useEmployerFeedbackStore,
  useHydrationStore,
  useNotificationStore,
  useReviewReportStore,
  useScheduleStore,
  useShiftDraftStore,
  useShiftStore,
  useUserStore,
  useVerificationStore,
  useWalletStore,
} from '@/stores';

interface AppHydratorProps {
  children: ReactNode;
}

type BootError = null | 'config' | 'session';

function BootErrorBar({
  kind,
  onRetry,
}: {
  kind: Exclude<BootError, null>;
  onRetry?: () => void;
}): ReactNode {
  const msg =
    kind === 'config'
      ? 'Cấu hình máy chủ chưa đúng (data mode). Vui lòng liên hệ quản trị viên.'
      : 'Không khôi phục được phiên đăng nhập từ máy chủ.';
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-3 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white"
    >
      <span>{msg}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export function AppHydrator({ children }: AppHydratorProps): ReactNode {
  const hydratedRef = useRef(false);
  const unsubRef = useRef<() => void>(() => {});
  const [bootError, setBootError] = useState<BootError>(null);

  // Khôi phục auth theo data mode. Tách riêng để nút "Thử lại" gọi lại được.
  const restoreAuth = useCallback(async () => {
    setBootError(null);
    unsubRef.current();
    unsubRef.current = () => {};

    // getDataMode() có thể throw khi prod cấu hình sai — KHÔNG fallback local.
    let mode: 'local' | 'supabase';
    try {
      mode = getDataMode();
    } catch {
      setBootError('config');
      useHydrationStore.getState().setHydrated(true);
      return;
    }

    if (mode === 'supabase') {
      try {
        const client = getSupabaseClient();
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.user) {
          const status = await useAuthStore.getState().syncSessionUser(session.user.id);
          if (status === 'error') {
            setBootError('session');
          } else if (status === 'suspended' || status === 'notfound') {
            await client.auth.signOut();
          }
        }
        unsubRef.current = useAuthStore.getState().subscribeAuth();
      } catch {
        setBootError('session');
      }
    } else {
      // Local: hydrate auth + validate (giữ nguyên hành vi cũ).
      const snap = loadAll();
      useAuthStore.getState().hydrate(snap.auth);
      const auth = useAuthStore.getState();
      if (auth.currentUserId) {
        const user = useUserStore.getState().findById(auth.currentUserId);
        if (!user || user.suspended) {
          void auth.logout();
        }
      }
    }

    useHydrationStore.getState().setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    // Nạp mọi slice từ localStorage seed (mode-independent).
    const snapshot = loadAll();
    useUserStore.getState().hydrate(snapshot.users);
    useVerificationStore
      .getState()
      .hydrate(
        snapshot.workerVerifications,
        snapshot.employerVerifications,
        snapshot.employerTypeChangeRequests,
      );
    useShiftStore.getState().hydrate(snapshot.shifts);
    useApplicationStore.getState().hydrateApplications(snapshot.applications);
    useApplicationStore.getState().hydrateRatings(snapshot.ratings);
    useApplicationStore.getState().hydrateDisputes(snapshot.disputes);
    useNotificationStore.getState().hydrate(snapshot.notifications);
    useScheduleStore.getState().hydrate(snapshot.scheduleBlocks);
    useEmployerFeedbackStore.getState().hydrate(snapshot.employerFeedback);
    useReviewReportStore.getState().hydrate(snapshot.reviewReports);
    useShiftDraftStore.getState().hydrate(snapshot.shiftDrafts);
    useWalletStore.getState().hydrate(snapshot.wallets, snapshot.walletLedger);
    useWalletStore.getState().backfillFromHistory({
      applications: snapshot.applications,
      shifts: snapshot.shifts,
    });
    useApplicationStore.getState().runLifecycleSync();

    void restoreAuth();

    return () => unsubRef.current();
  }, [restoreAuth]);

  // Lỗi cấu hình = chặn hẳn (không render app ở trạng thái sai).
  if (bootError === 'config') {
    return <BootErrorBar kind="config" />;
  }

  return (
    <>
      {bootError === 'session' && (
        <BootErrorBar kind="session" onRetry={() => void restoreAuth()} />
      )}
      {children}
    </>
  );
}
