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

import {
  loadAll,
  cleanupLegacyBusinessData,
  read,
  STORAGE_KEYS,
} from '@/data/persistence';
import type { ScheduleBlock } from '@/types';
import { refetchReviews } from '@/lib/reviewSync';
import { getDataMode, getSupabaseClient, isSupabaseEnv } from '@/data/supabaseClient';
import { getUserRepo } from '@/data/repos/userRepo';
import { syncOverdueSettlements } from '@/data/repos/walletRepo';
import {
  useApplicationStore,
  useChatStore,
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
/** Khoảng tối thiểu giữa hai lần refetch-on-focus (04/10). */
const FOCUS_REFETCH_MIN_MS = 30_000;

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
    // Lịch cá nhân (0023) — cần cho gợi ý ca + chặn ứng tuyển trùng lịch bận.
    // 04/10: đơn của worker và lịch cá nhân độc lập nhau → nạp song song.
    await Promise.all([
      useApplicationStore.getState().refetchForWorker(cur.id),
      useScheduleStore.getState().refetchMine(cur.id),
    ]);
    // Nạp các ca worker ĐÃ ứng tuyển nhưng KHÔNG có trong listing công khai
    // vừa nạp — thiếu khỏi shiftStore thì dashboard + lịch + trang chi tiết sẽ
    // 404/không hiển thị trạng thái. Hai nhóm:
    //  1) ca cũ hơn cửa sổ listing (trước hôm qua) nhưng vẫn ở `public_shifts`
    //     → nạp MỘT lô theo id (`refetchPublicByIds`), không N request;
    //  2) ca không còn công khai (đã huỷ / hoàn thành…) → `refetchOne` đọc
    //     `get_shift_detail` (RPC cấp quyền cho worker-có-đơn).
    // Chỉ nạp ca còn thiếu (idempotent).
    const appliedShiftIds = [
      ...new Set(
        useApplicationStore.getState().forWorker(cur.id).map((a) => a.shiftId),
      ),
    ];
    const missingNow = () =>
      appliedShiftIds.filter((id) => !useShiftStore.getState().getById(id));
    await useShiftStore.getState().refetchPublicByIds(missingNow());
    // 04/10: nhóm 2 song song — mỗi `refetchOne` đọc store SAU khi chờ rồi mới ghi
    // (upsert theo id) nên các lượt không đè nhau.
    await Promise.all(missingNow().map((id) => useShiftStore.getState().refetchOne(id)));
  }
  const empIds = useShiftStore
    .getState()
    .shifts.map((s) => s.employerId)
    .filter((id) => id !== cur?.id);
  const profs = await getUserRepo().loadPublicProfiles(empIds);
  for (const p of profs) useUserStore.getState().overlayUser(p);

  // Đánh giá hai chiều (0024): của chính mình + nhà tuyển dụng các ca đang
  // thấy + người lao động trong các đơn đang thấy. Lỗi không chặn boot.
  if (cur) {
    const reviewUserIds = [
      cur.id,
      ...useShiftStore.getState().shifts.map((sh) => sh.employerId),
      ...useApplicationStore.getState().applications.map((a) => a.workerId),
    ];
    // 04/10: ba lượt nạp dưới độc lập nhau (đánh giá / thông báo / trò chuyện, mỗi
    // lượt tự nuốt lỗi) → chạy song song thay vì lần lượt.
    await Promise.all([
      refetchReviews(reviewUserIds),
      // Thông báo phía server (0031: kết quả kiểm tra giao dịch nạp). Lỗi (vd. DB
      // chưa có 0031) không chặn boot — chuông chỉ thiếu thông báo server.
      useNotificationStore
        .getState()
        .refetchServer(cur.id, () => useAuthStore.getState().currentUserId === cur.id)
        .catch(() => undefined),
      // 0035 — cuộc trò chuyện + số tin chưa đọc. Lỗi (vd. DB chưa có 0035) không chặn boot.
      useChatStore
        .getState()
        .loadThreads(cur.id, () => useAuthStore.getState().currentUserId === cur.id)
        .catch(() => undefined),
    ]);
  }
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
      // Lịch cá nhân (bận/rảnh): server là nguồn sự thật (0023 `schedule_blocks`,
      // restoreAuth → refetchMine). Bản trên thiết bị (localStorage) chỉ nạp tạm
      // ở đây: refetchMine tải lên một lần các khối tạo trước khi có bảng rồi
      // thay bằng danh sách server; server chưa có 0023 thì giữ lịch trên thiết
      // bị (`serverSync: 'off'`). Trang lịch lọc theo currentUserId nên không
      // lẫn lịch của tài khoản khác.
      const storedBlocks = read<ScheduleBlock[]>(STORAGE_KEYS.scheduleBlocks, []);
      useScheduleStore
        .getState()
        .hydrate(Array.isArray(storedBlocks) ? storedBlocks : []);
      useEmployerFeedbackStore.getState().hydrate([]);
      useReviewReportStore.getState().hydrate([]);
      useShiftDraftStore.getState().hydrate([]);
      useWalletStore.getState().hydrate([], []);
      useChatStore.getState().hydrate([], []);
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
      useChatStore.getState().hydrate(snapshot.chatMessages, snapshot.chatReads);
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
    // 04/10: cách nhau tối thiểu FOCUS_REFETCH_MIN_MS giữa hai lần nạp lại khi focus —
    // trước đây mỗi lần chuyển tab / bấm ra ngoài rồi vào lại đều chạy lại cả chuỗi
    // nạp (nhiều request + render lại). Tính từ lúc mount vì boot vừa nạp xong.
    let lastRun = Date.now();
    const onFocus = () => {
      if (document.visibilityState !== 'visible' || running) return;
      if (Date.now() - lastRun < FOCUS_REFETCH_MIN_MS) return;
      lastRun = Date.now();
      running = true;
      // Đồng bộ nền khi quay lại tab: thất bại (mạng chập chờn, phiên vừa hết
      // hạn / đổi tài khoản giữa chừng → request chạy như anon) KHÔNG được làm
      // vỡ trang — giữ dữ liệu đã nạp, lần focus sau thử lại. Trước đây thiếu
      // catch → unhandledRejection hiện overlay lỗi của Next.
      void refetchPhase2Supabase()
        .catch((e: unknown) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[AppHydrator] refetch-on-focus failed:', e);
          }
        })
        .finally(() => {
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
