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

import { loadAll, cleanupLegacyBusinessData } from '@/data/persistence';
import { getDataMode, getSupabaseClient, isSupabaseEnv } from '@/data/supabaseClient';
import { getUserRepo } from '@/data/repos/userRepo';
import { syncOverdueSettlements } from '@/data/repos/walletRepo';
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

/**
 * Phase 2 — refetch shifts/applications + public profiles theo scope user hiện tại
 * (supabase mode). Dùng lúc boot và refetch-on-focus (đồng bộ 2 máy không cần reload).
 * Refetch thay theo scope (public/employer/worker) nên không cần xoá trước → không nháy.
 */
async function refetchPhase2Supabase(): Promise<void> {
  const cur = useAuthStore.getState().currentUser();
  // Tự chốt ca quá hạn (tự xác nhận / vắng mặt / hoàn cọc dư) TRƯỚC khi nạp để
  // dữ liệu hiển thị đã phản ánh kết quả. Idempotent; lỗi không chặn boot.
  if (cur) await syncOverdueSettlements().catch(() => undefined);
  if (cur?.role === 'admin') {
    // Admin cần MỌI ca (kể cả đã hoàn thành/huỷ — không có trong `public_shifts`)
    // để thống kê + tab "Ca làm" đếm đúng. RLS `shifts_select`/`applications_select`
    // đã cho `is_admin()` đọc toàn bộ.
    await useShiftStore.getState().refetchAll();
    const ids = useShiftStore.getState().shifts.map((s) => s.id);
    await useApplicationStore.getState().refetchForShifts(ids);
  } else {
    await useShiftStore.getState().refetchPublic();
  }
  if (cur?.role === 'employer') {
    await useShiftStore.getState().refetchEmployer(cur.id);
    const ids = useShiftStore.getState().byEmployer(cur.id).map((s) => s.id);
    await useApplicationStore.getState().refetchForShifts(ids);
  } else if (cur?.role === 'worker') {
    await useApplicationStore.getState().refetchForWorker(cur.id);
    // Nạp các ca worker ĐÃ ứng tuyển nhưng KHÔNG còn trong listing công khai
    // (đã huỷ / đầy chỗ / hết hạn) — chúng không có trong `public_shifts` nên
    // thiếu khỏi shiftStore → dashboard + trang chi tiết sẽ 404/không hiển thị
    // trạng thái. `refetchOne` đọc `get_shift_detail` (RPC cấp quyền cho
    // worker-có-đơn) và upsert vào store. Chỉ nạp ca còn thiếu (idempotent).
    const appliedShiftIds = [
      ...new Set(
        useApplicationStore.getState().forWorker(cur.id).map((a) => a.shiftId),
      ),
    ];
    const missingShiftIds = appliedShiftIds.filter(
      (id) => !useShiftStore.getState().getById(id),
    );
    for (const id of missingShiftIds) {
      await useShiftStore.getState().refetchOne(id);
    }
  }
  const empIds = useShiftStore
    .getState()
    .shifts.map((s) => s.employerId)
    .filter((id) => id !== cur?.id);
  const profs = await getUserRepo().loadPublicProfiles(empIds);
  for (const p of profs) useUserStore.getState().overlayUser(p);
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
          } else if (
            status === 'notfound' &&
            (await useAuthStore.getState().markPendingOAuth())
          ) {
            // Đăng nhập Google lần đầu: giữ phiên, trang đăng ký hiện bước chọn vai trò.
          } else if (status === 'suspended' || status === 'notfound') {
            await client.auth.signOut();
          }
        }

        // Phase 2 — nạp shifts/applications từ Supabase (thay seed localStorage cho
        // 2 slice này). Xoá seed trước ở lần boot rồi refetch theo scope.
        useShiftStore.setState({ shifts: [] });
        useApplicationStore.setState({ applications: [] });
        await refetchPhase2Supabase();

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

    if (isSupabaseEnv()) {
      // Supabase/production: KHÔNG hydrate seed. Dọn dữ liệu nghiệp vụ/seed cũ
      // trong localStorage (an toàn, allowlist, không đụng session `sb-*`), rồi
      // khởi tạo RỖNG mọi slice CHƯA có backend thật (mục 2). users/shifts/
      // applications sẽ được restoreAuth() nạp từ server theo scope.
      cleanupLegacyBusinessData();
      useUserStore.getState().hydrate([]);
      useVerificationStore.getState().hydrate([], [], []);
      useShiftStore.getState().hydrate([]);
      useApplicationStore.getState().hydrateApplications([]);
      useApplicationStore.getState().hydrateRatings([]);
      useApplicationStore.getState().hydrateDisputes([]);
      useNotificationStore.getState().hydrate([]);
      useScheduleStore.getState().hydrate([]);
      useEmployerFeedbackStore.getState().hydrate([]);
      useReviewReportStore.getState().hydrate([]);
      useShiftDraftStore.getState().hydrate([]);
      useWalletStore.getState().hydrate([], []);
      // Không backfill ví, không runLifecycleSync trên seed (không có seed).
    } else {
      // Local/demo: hydrate mọi slice từ localStorage seed (giữ nguyên baseline).
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
    }

    void restoreAuth();

    return () => unsubRef.current();
  }, [restoreAuth]);

  // Phase 2 · G — refetch-on-focus: khi tab được focus lại (supabase mode), nạp lại
  // shifts/đơn theo scope để hai máy thấy cùng trạng thái mà không cần reload thủ công.
  useEffect(() => {
    let mode: 'local' | 'supabase';
    try {
      mode = getDataMode();
    } catch {
      return;
    }
    if (mode !== 'supabase') return;
    let running = false;
    const onFocus = () => {
      if (document.visibilityState !== 'visible' || running) return;
      running = true;
      void refetchPhase2Supabase().finally(() => {
        running = false;
      });
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

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
