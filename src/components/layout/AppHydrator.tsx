'use client';

/**
 * AppHydrator — one-shot client component nạp trạng thái ban đầu vào mọi Zustand
 * store khi mount (đặt 1 lần ở app/layout.tsx). Không render UI riêng.
 *
 * BACKEND-MIGRATION-1 · Phase 1 · Slice 3 — hybrid boot:
 *   - MỌI slice (kể cả users seed) vẫn nạp từ localStorage `loadAll()` để seed
 *     shifts/applications tham chiếu id user seed KHÔNG vỡ (shifts/apps migrate ở
 *     Phase 2).
 *   - Chế độ supabase: khôi phục session thật (`getSession` → `loadOwnUser`) rồi
 *     OVERLAY user thật vào cache + set currentUserId; đăng ký `onAuthChange`
 *     (subscribeAuth). User thật là authoritative (sửa hồ sơ ghi/nạp Supabase);
 *     `public_profiles` của user khác HOÃN sang Phase 2 (chưa có dữ liệu cross-user
 *     thật để hiển thị).
 *   - Chế độ local: giữ nguyên hành vi cũ (hydrate auth từ snapshot + validate).
 */

import { useEffect, useRef, type ReactNode } from 'react';

import { loadAll } from '@/data/persistence';
import { getDataMode, getSupabaseClient } from '@/data/supabaseClient';
import { getUserRepo } from '@/data/repos/userRepo';
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

function isSupabaseMode(): boolean {
  try {
    return getDataMode() === 'supabase';
  } catch {
    return false;
  }
}

export function AppHydrator({ children }: AppHydratorProps): ReactNode {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let unsubscribeAuth: () => void = () => {};

    void (async () => {
      // --- Nạp mọi slice từ localStorage seed (gồm users seed) ---------------
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

      // Idempotent orchestrator — phản ánh transition theo đồng hồ khi app đóng.
      useApplicationStore.getState().runLifecycleSync();

      if (isSupabaseMode()) {
        // --- Khôi phục session Supabase + overlay user thật ------------------
        try {
          const client = getSupabaseClient();
          const {
            data: { session },
          } = await client.auth.getSession();

          if (session?.user) {
            const user = await getUserRepo().loadOwnUser(session.user.id);
            if (user && !user.suspended) {
              // Overlay user thật vào cache (không persist localStorage).
              const existing = useUserStore.getState().users;
              const merged = existing.some((u) => u.id === user.id)
                ? existing.map((u) => (u.id === user.id ? user : u))
                : [...existing, user];
              useUserStore.setState({ users: merged });
              useAuthStore.setState({
                currentUserId: user.id,
                lastActivityAt: new Date().toISOString(),
              });
            } else if (user?.suspended) {
              await client.auth.signOut();
            }
          }

          // Đồng bộ đăng xuất/refresh đa tab.
          unsubscribeAuth = useAuthStore.getState().subscribeAuth();
        } catch (err) {
          // Lỗi mạng/policy khi khôi phục session → app vẫn render (seed);
          // người dùng có thể đăng nhập lại. Không chặn boot.
          console.warn('[AppHydrator] khôi phục session Supabase thất bại', err);
        }
      } else {
        // --- Local mode: hydrate auth + validate (giữ nguyên hành vi cũ) -----
        useAuthStore.getState().hydrate(snapshot.auth);
        const auth = useAuthStore.getState();
        if (auth.currentUserId) {
          const user = useUserStore.getState().findById(auth.currentUserId);
          if (!user || user.suspended) {
            void auth.logout();
          }
        }
      }

      // Báo hydration xong để trang chi tiết an toàn quyết định notFound().
      useHydrationStore.getState().setHydrated(true);
    })();

    return () => unsubscribeAuth();
  }, []);

  return children;
}
