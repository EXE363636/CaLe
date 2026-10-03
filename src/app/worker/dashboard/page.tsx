'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker, getWorkerReputation } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { getDataMode } from '@/data/supabaseClient';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useWalletStore } from '@/stores/walletStore';
import { useWorkerDepositStore } from '@/stores/workerDepositStore';
import { WorkerNoShowDepositAlert } from '@/components/workerDeposit/WorkerNoShowDepositAlert';
import { Card, Badge, Button, EmptyState, HelpPopover, Modal, PageHelpButton, ButtonLink, PageShell } from '@/components/ui';
import { CancelApplicationDialog } from '@/components/forms/CancelApplicationDialog';
import { CheckoutDialog } from '@/components/forms/CheckoutDialog';
import { EmployerFeedbackForm } from '@/components/forms/EmployerFeedbackForm';
import { WalletPanel } from '@/components/wallet/WalletPanel';
import { NoPaymentNotice } from '@/components/wallet/NoPaymentNotice';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { hasCapability } from '@/data/capabilities';
import { canCheckIn, canCheckOut, isLateCheckout } from '@/domain/timeGates';
import { deriveAttendanceState, attendanceCopyKey } from '@/domain/attendanceState';
import { suggestShiftsForWorker } from '@/domain/availabilityMatch';
import { buildSkillDisplayList } from '@/domain/skillProgression';
import { deriveWorkerIncome } from '@/domain/finance';
import { SkillProgressBar } from '@/components/user/SkillProgressBar';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { getShiftLifecycleState, isActiveDashboardShift } from '@/domain/shiftLifecycleState';
import { startsIn } from '@/domain/shiftJourney';
import { useScheduleStore } from '@/stores/scheduleStore';
import { quotaUsage } from '@/domain/cancellationQuota';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useModalFromQuery, useSectionFromQuery } from '@/lib/useModalFromQuery';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import {
  DASH_CARD,
  DashboardEmpty,
  DashboardHeader,
  DashboardNote,
  DashboardSection,
  DashboardTiles,
  DASH_TILE,
  SegmentedTabs,
} from '@/components/dashboard/DashboardFrame';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { canReviewApplication } from '@/domain/reviewEligibility';
import { submitReviewAsync, useReviewBackendStore } from '@/lib/reviewSync';
import { ShiftReviewStatus } from '@/components/shift/ShiftReviewStatus';
import { tSettlement } from '@/lib/settlementCopy';
import type { Application, Shift } from '@/types';

export default function WorkerDashboardPage() {
  return (
    <RoleGuard role="worker">
      <WorkerDashboardContent />
    </RoleGuard>
  );
}

function WorkerDashboardContent() {
  const t = useT();
  const tx = useTx();
  useLifecycleSync();
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  // Attendance đi qua async wrapper (tự dispatch supabase→RPC / local→sync) nên
  // trang KHÔNG tự đoán mode; không cần selector sync riêng.
  const checkInAsync = useApplicationStore((s) => s.checkInAsync);
  const checkOutAsync = useApplicationStore((s) => s.checkOutAsync);
  const cancelByWorker = useApplicationStore((s) => s.cancelByWorker);
  const withdrawAsync = useApplicationStore((s) => s.withdrawAsync);
  const allFeedback = useEmployerFeedbackStore((s) => s.feedback);
  const allRatings = useApplicationStore((s) => s.ratings);
  const submitFeedback = useEmployerFeedbackStore((s) => s.submit);
  const scheduleBlocks = useScheduleStore((s) => s.blocks);
  // Cluster 3 · BUG 5 (Req 2.5): subscribe to the append-only wallet ledger so
  // the worker's income tile stays reactive and is derived from the single
  // money source (see `totalEarnings` below).
  const ledger = useWalletStore((s) => s.ledger);

  const worker = asWorker(users.find((u) => u.id === currentUserId));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  // Phase 10C — worker check-out dialog target. We open the dialog
  // instead of triggering an instant check-out so the worker can
  // submit the per-shift evidence payload.
  const [checkoutTargetId, setCheckoutTargetId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [feedbackForAppId, setFeedbackForAppId] = useState<string | null>(null);
  // Phase 9F — which detail modal is open (or null).
  // Phase 9G adds 'income' and 'completed' so the corresponding tiles
  // open dedicated modals instead of scrolling to unrelated sections.
  const [statDetail, setStatDetail] = useState<
    'reputation' | 'quota' | 'income' | 'completed' | null
  >(null);
  // 03/10 — tab của khu "Đơn ứng tuyển".
  const [appTab, setAppTab] = useState<'pending' | 'closed'>('pending');

  // CORE-STABILITY-6 Part 1 — "Việc đã ứng tuyển" section intent. When
  // fired (cold-load `?section=applications` OR same-route event) we
  // scroll the applied-jobs section into view and flash a ring so the
  // result is VISIBLE, not just a URL change. Works on repeat clicks.
  const [applicationsHighlight, setApplicationsHighlight] = useState(false);
  // Hẹn giờ tắt vòng sáng của lần bấm trước — huỷ khi bấm lại để nó không tắt sớm vòng mới.
  const highlightTimerRef = useRef<number | undefined>(undefined);
  const focusApplications = useCallback(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('worker-applications-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Re-trigger the highlight even if it's already on (repeat click):
    // turn it off synchronously, then on, then auto-clear.
    setAppTab('pending');
    setApplicationsHighlight(false);
    requestAnimationFrame(() => setApplicationsHighlight(true));
    window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setApplicationsHighlight(false), 1600);
  }, []);

  // CORE-STABILITY-7 Part 1 — wallet-history deeplink. Incrementing
  // this signal opens the WalletPanel's ledger modal. Driven by the
  // `?modal=wallet` query (cold load) and the same-route notification
  // event (top-up / withdraw / wage-release notifications).
  const [walletLedgerSignal, setWalletLedgerSignal] = useState(0);
  // P2-1 (0028) — bật cọc người lao động → worker cần nạp ví để đặt cọc.
  const depositStatus = useWorkerDepositStore((s) => s.status);
  const refreshDepositStatus = useWorkerDepositStore((s) => s.refresh);
  useEffect(() => {
    if (isSupabaseEnv()) void refreshDepositStatus();
  }, [refreshDepositStatus]);
  // CORE-STABILITY-9 Part 5 — stable "now" sample for the recommended-
  // shifts memo. Captured once per mount via a lazy `useState`
  // initializer so it is NOT an impure `Date.now()` call during render
  // (react-hooks/purity). The recommendations feed is a soft, non-
  // authoritative widget (top 4 future shifts that fit availability);
  // it has no timer and only recomputes when its data deps change, so
  // sampling the clock at mount instead of at each recompute does not
  // change any lifecycle, money, or business rule.
  const [nowMs] = useState(() => Date.now());
  const openWalletHistory = useCallback(() => {
    setWalletLedgerSignal((n) => n + 1);
  }, []);

  // Cold-load `?section=...` (e.g. navigating from another page). Reads
  // once on mount via the same hook family as `?modal=`.
  useSectionFromQuery(['applications'] as const, (s) => {
    if (s === 'applications') focusApplications();
  });

  // Phase 9L — open a stat-detail modal when the page is loaded with a
  // `?modal=...` query param (used by notification deep links). The hook
  // reads the param exactly once on mount, opens the matching modal, and
  // strips the query so refreshing or closing the modal doesn't re-open it.
  useModalFromQuery(
    ['reputation', 'quota', 'income', 'completed', 'wallet'] as const,
    (m) => {
      if (m === 'wallet') {
        openWalletHistory();
        return;
      }
      setStatDetail(m as 'reputation' | 'quota' | 'income' | 'completed');
    },
  );

  // Phase 9N — also listen for in-page modal events. NotificationBell
  // fires `cale:open-dashboard-modal`
  // when the user clicks a same-page notification link, so the modal
  // opens without a navigation flicker.
  useDashboardModalEvents('/worker/dashboard', (detail) => {
    const allowed = ['reputation', 'quota', 'income', 'completed'] as const;
    if (
      detail.modal &&
      (allowed as readonly string[]).includes(detail.modal)
    ) {
      setStatDetail(detail.modal as (typeof allowed)[number]);
    }
    // CORE-STABILITY-7 Part 1 — same-route wallet-history intent.
    if (detail.modal === 'wallet') {
      openWalletHistory();
    }
    // CORE-STABILITY-6 Part 1 — same-route "Việc đã ứng tuyển" intent.
    if (detail.section === 'applications') {
      focusApplications();
    }
  });

  // Memo: applications grouped by status
  const myApps = useMemo(
    () => (worker ? applications.filter((a) => a.workerId === worker.id) : []),
    [applications, worker],
  );

  // Live cancellation-quota usage for the dashboard tile (Phase 9 polish).
  // Pure helper, stable inputs, so it's safe outside the cancel dialog
  // path — `nowIso` is recomputed on every render but `quotaUsage` is fast.
  const liveQuota = useMemo(() => {
    if (!worker) return null;
    return quotaUsage(
      worker.cancellationHistory,
      worker.reputationScore,
      new Date().toISOString(),
    );
  }, [worker]);

  // Helper to look up a shift
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const getShift = (id: string) => shiftMap.get(id);

  // Stats
  const completedShifts = myApps.filter((a) => a.status === 'Confirmed');
  // Cluster 3 · BUG 5 (Req 2.5): the worker's total income is derived from the
  // single money source — the wallet ledger's wage-release credits
  // (`deriveWorkerIncome`) — instead of summing per-application `payoutAmount`
  // snapshots. This makes the income tile + income modal reconcile with the
  // wallet balance and every other money surface. For a clean account the
  // figure is unchanged (each confirmed shift released its payout to the
  // wallet); it legitimately differs only when a wage was partially released
  // (a resolved dispute), where the ledger reflects what the wallet holds.
  const totalEarnings = worker ? deriveWorkerIncome(ledger, worker.id) : 0;

  // Phase 3: derive the worker's current cancellation quota whenever the
  // cancel dialog is open. We pull the raw history + reputation off the
  // worker selector (both stable references) and call the pure helper in
  // a `useMemo` so we never feed Zustand a fresh array selector.
  const cancelQuota = useMemo(() => {
    if (!cancelTarget || !worker) return undefined;
    return quotaUsage(
      worker.cancellationHistory,
      worker.reputationScore,
      new Date().toISOString(),
    );
  }, [cancelTarget, worker]);

  // Upcoming approved/checked-in shifts (date in future or today).
  // Includes `CancellationRequested` so the worker still sees the shift
  // while waiting for the employer's decision.
  // Phase 10A-Fix-7: drop applications whose shift was cancelled by the
  // employer — they belong in the "recent cancelled" section, not the
  // upcoming list. The application status `'CancelledByEmployer'` is
  // also excluded from the active set.
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const upcoming = myApps
    .filter((a) => {
      if (
        !['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut'].includes(
          a.status,
        )
      ) {
        return false;
      }
      const sh = getShift(a.shiftId);
      if (!sh) return false;
      if (sh.status === 'Cancelled') return false;
      if (sh.date < todayStr) return false;
      // Group by the SAME clock the badge uses. In supabase mode there is
      // no lifecycle sync, so a shift can linger at `Published` in the DB
      // after its end time; grouping by the raw status put it under "Ca
      // sắp tới" with a "Đã hết hạn" badge. `isActiveDashboardShift`
      // drops such overdue shifts so the group agrees with the badge.
      return isActiveDashboardShift(sh, applications, nowIso);
    })
    .sort((a, b) => {
      const sa = getShift(a.shiftId)!;
      const sb = getShift(b.shiftId)!;
      return `${sa.date}T${sa.startTime}`.localeCompare(`${sb.date}T${sb.startTime}`);
    });

  const pending = myApps.filter((a) => a.status === 'Pending');
  // Đã từng ứng tuyển (bất kỳ trạng thái nào) → khối trống chỉ cần một dòng gọn.
  const isReturningWorker = myApps.length > 0;
  // Phase 6: keep recently-rejected applications visible so the worker
  // can read the rejection reason. Limit to 5 to avoid dashboard sprawl.
  const recentlyRejected = useMemo(
    () =>
      myApps
        .filter((a) => a.status === 'Rejected')
        .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
        .slice(0, 5),
    [myApps],
  );

  // Phase 10A-Fix-10: keep recently-expired applications visible so
  // the worker has a clickable surface for the expiry reason and the
  // no-penalty note. The notification bell also deep-links to
  // `/shifts/{id}` but the dashboard is the worker's home.
  const recentlyExpired = useMemo(
    () =>
      myApps
        .filter((a) => a.status === 'Expired')
        .sort((a, b) =>
          (b.expiredAt ?? '').localeCompare(a.expiredAt ?? ''),
        )
        .slice(0, 5),
    [myApps],
  );

  // Phase 10A-Fix-7: keep recently-cancelled-by-employer applications
  // visible on the dashboard so the worker has a clickable surface for
  // the cancellation reason + protection note. The notification bell
  // also deep-links to `/shifts/{id}` but the dashboard is the worker's
  // home, so we mirror the `recentlyRejected` pattern here.
  const recentlyCancelledByEmployer = useMemo(
    () =>
      myApps
        .filter((a) => a.status === 'CancelledByEmployer')
        .sort((a, b) =>
          (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? ''),
        )
        .slice(0, 5),
    [myApps],
  );

  // Feedback pending: completed shifts that haven't received employer
  // feedback from this worker. The feedback store is the source of truth
  // for "already submitted" — guards against double-submission.
  const reviewBackend = useReviewBackendStore((s) => s.available);
  const feedbackPending = useMemo(() => {
    if (!worker) return [] as Application[];
    const submittedIds = new Set(
      allFeedback
        .filter((f) => f.fromUserId === worker.id)
        .map((f) => f.applicationId),
    );
    return myApps
      .filter((a) => a.status === 'Confirmed' && !submittedIds.has(a.id))
      // Production: server chỉ nhận đánh giá trong 14 ngày sau ca (0024).
      .filter((a) => {
        if (!isSupabaseEnv()) return true;
        if (reviewBackend !== 'yes') return false;
        const sh = shifts.find((s) => s.id === a.shiftId);
        return !!sh && canReviewApplication(a, sh, false);
      })
      .sort((a, b) => (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? ''));
  }, [myApps, allFeedback, worker, shifts, reviewBackend]);

  // CORE-STABILITY-9 Part 5 — recommended shifts ranked by the worker's
  // declared free time + skills. Pure scorer (`suggestShiftsForWorker`);
  // surfaces only the top few that fit an availability block so the
  // dashboard stays focused. Excludes shifts the worker already applied to.
  const recommendedShifts = useMemo(() => {
    if (!worker) return [];
    const myBlocks = scheduleBlocks.filter((b) => b.userId === worker.id);
    if (myBlocks.every((b) => b.kind !== 'available')) return [];
    const appliedShiftIds = new Set(myApps.map((a) => a.shiftId));
    const candidates = shifts.filter((s) => {
      if (appliedShiftIds.has(s.id)) return false;
      if (s.status !== 'Published' && s.status !== 'FullyBooked') return false;
      // Future shifts only.
      const startMs = new Date(`${s.date}T${s.startTime}:00`).getTime();
      return Number.isNaN(startMs) || startMs >= nowMs;
    });
    const approvedApps = myApps.filter(
      (a) =>
        a.status === 'Approved' ||
        a.status === 'CheckedIn' ||
        a.status === 'CheckedOut',
    );
    const shiftIndex = new Map<string, Shift>(shifts.map((s) => [s.id, s]));
    return suggestShiftsForWorker(
      candidates,
      worker,
      myBlocks,
      approvedApps,
      shiftIndex,
    )
      .filter((m) => m.fitsAvailability)
      .slice(0, 4);
  }, [worker, scheduleBlocks, myApps, shifts, nowMs]);
  // Phase 9I — derive a reputation score timeline from observable
  // events so the modal can explain *why* the score is what it is.
  // Source: confirmed applications (+5 each), late cancellations (−10
  // each), no-shows (counted via `noShowCount`, dates unknown so
  // shown aggregated), and admin adjustments (which the admin store
  // appends to `cancellationHistory` with a `[Admin set X → Y] reason`
  // prefix on `reasonNote`).  Sorted descending by event date.
  type RepEvent = {
    id: string;
    at: string;
    delta: number;
    label: string;
    sublabel?: string;
    /** True when the event row is an admin adjustment (rendered with
     *  a distinct tone so it doesn't read as a routine event). */
    isAdmin?: boolean;
  };
  // Phase 9J: parse `[Admin set old → new] reason` records out of
  // `cancellationHistory`. The admin store appends these synthetic
  // records on every `adjustReputation` call so the worker can see
  // them inline on the timeline. Returns `null` for non-admin records.
  const parseAdminAdjust = (
    note: string | undefined,
  ): { oldScore: number; newScore: number; reason: string } | null => {
    if (!note) return null;
    const match = /^\[Admin set (\d+)\s*→\s*(\d+)\]\s*(.*)$/.exec(note);
    if (!match) return null;
    return {
      oldScore: Number(match[1]),
      newScore: Number(match[2]),
      reason: match[3].trim(),
    };
  };
  const repTimeline = useMemo<RepEvent[]>(() => {
    if (!worker) return [];
    const events: RepEvent[] = [];
    // Confirmed completions → +5 each
    for (const app of myApps) {
      if (app.status !== 'Confirmed') continue;
      const shift = shifts.find((s) => s.id === app.shiftId);
      events.push({
        id: `rep-${app.id}`,
        at: app.confirmedAt ?? `${shift?.date ?? ''}T00:00:00.000Z`,
        delta: +5,
        label: t('worker.dashboard.reputationModal.eventCompleted'),
        sublabel: shift?.title,
      });
    }
    // Cancellation history split into:
    //   - admin adjustments  (synthetic record, parsed from reasonNote)
    //   - LateCancel         (−10)
    //   - OnTime             (0, surfaced for context)
    for (const rec of worker.cancellationHistory) {
      const admin = parseAdminAdjust(rec.reasonNote);
      if (admin) {
        const delta = admin.newScore - admin.oldScore;
        events.push({
          id: `rep-${rec.id}`,
          at: rec.cancelledAt,
          delta,
          label: t('worker.dashboard.reputationModal.eventAdminAdjust')
            .replace('{old}', String(admin.oldScore))
            .replace('{new}', String(admin.newScore)),
          sublabel: admin.reason
            ? `${t('worker.dashboard.reputationModal.eventAdminBy')} • ${admin.reason}`
            : t('worker.dashboard.reputationModal.eventAdminBy'),
          isAdmin: true,
        });
        continue;
      }
      if (rec.type === 'LateCancel') {
        const shift = shifts.find((s) => s.id === rec.shiftId);
        events.push({
          id: `rep-${rec.id}`,
          at: rec.cancelledAt,
          delta: -10,
          label: t('worker.dashboard.reputationModal.eventLateCancel'),
          sublabel: shift?.title ?? rec.reasonNote,
        });
      }
      // OnTime cancellations carry no delta — intentionally skipped to
      // keep the timeline focused on score-changing events.
    }
    // No-show count is a number (we don't have per-shift IDs); show
    // aggregated as one row when > 0.
    if (worker.noShowCount > 0) {
      events.push({
        id: 'rep-noshow-summary',
        at: '0000-00-00T00:00:00.000Z',
        delta: -20 * worker.noShowCount,
        label: t('worker.dashboard.reputationModal.eventNoShow').replace(
          '{count}',
          String(worker.noShowCount),
        ),
      });
    }
    // Phase 10A-Fix-8: employer-cancellation protection events. Each
    // record carries the +reputation delta that was applied at the
    // time of the cancellation; when the worker was already at the
    // 100-point cap the delta is 0 and the timeline still shows the
    // event so the worker understands the system protected them.
    for (const rec of worker.protections ?? []) {
      events.push({
        id: `rep-protection-${rec.id}`,
        at: rec.occurredAt,
        delta: rec.reputationPointsRestored,
        label:
          rec.reputationPointsRestored > 0
            ? `+${rec.reputationPointsRestored} ${t('worker.dashboard.protection.eventLabel')}`
            : t('worker.dashboard.protection.eventLabel'),
        sublabel:
          rec.reputationPointsRestored > 0
            ? `${rec.shiftTitle} • ${rec.employerName} • ${rec.reason}`
            : `${rec.shiftTitle} • ${rec.employerName} • ${t('worker.dashboard.protection.capNote')}`,
      });
    }
    // Sort descending so the most-recent event is first.
    return events.sort((a, b) => b.at.localeCompare(a.at));
  }, [worker, myApps, shifts, t]);

  // Hồ sơ chưa tải xong (supabase cold load) → trạng thái đang tải có
  // thông báo cho trình đọc màn hình, thay vì trang trắng.
  if (!worker) {
    return (
      <div
        className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        {t('common.loading')}
      </div>
    );
  }

  const restricted = worker.reputationScore < 50;
  // MỘT nguồn cho "số ca đã hoàn thành" trên mọi bề mặt của trang (lời chào,
  // ô thống kê, modal): supabase đếm từ đơn đã xác nhận thật; local giữ số
  // hồ sơ seed (có cả ca lịch sử không còn đơn tương ứng).
  const completedCount = isSupabaseEnv()
    ? completedShifts.length
    : worker.completedShiftCount;
  // Cluster 2 · BUG 3 (Req 2.3): read the displayed reputation through the
  // single shared source so this tile matches every other surface. Returns
  // the same clamped `worker.reputationScore` — no visible change.
  const reputationScore = getWorkerReputation(worker.id);

  async function handleCheckIn(appId: string) {
    if (actionLoading) return; // khóa double-click
    setActionLoading(appId);
    // Wrapper tự dispatch: supabase → RPC + refetch server; local → sync cũ.
    const result = await checkInAsync(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.checkIn.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleCheckOut(appId: string) {
    // Phase 10C — open the dialog instead of instant check-out.
    // The dialog gathers the per-shift evidence payload and forwards
    // it to the new `checkOut({ applicationId, ... })` action.
    setCheckoutError(null);
    setCheckoutTargetId(appId);
  }

  async function handleCheckoutSubmit(payload: {
    checklist?: boolean[];
    note?: string;
    evidenceFileName?: string;
  }) {
    if (!checkoutTargetId) return;
    if (actionLoading) return; // khóa double-click
    setActionLoading(checkoutTargetId);
    const input = { applicationId: checkoutTargetId, ...payload };
    // Wrapper tự dispatch: supabase → RPC + refetch; local → sync (giữ lỗi có cấu trúc).
    const result = await checkOutAsync(input);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(
        t('feedback.checkOut.success'),
        tSettlement('feedback.checkOut.success.desc', t),
      );
      setCheckoutTargetId(null);
      setCheckoutError(null);
      return;
    }
    // Surface the typed EVIDENCE_REQUIRED reason (or any other store
    // error) inside the dialog AND as a toast. The dialog stays open
    // so the worker can correct the payload.
    const message = toastFromStoreError(result.error);
    setCheckoutError(message);
    showError(message);
  }

  function handleCancelRequest(appId: string) {
    const app = myApps.find((a) => a.id === appId);
    if (!app) return;
    setCancelTarget(app);
  }

  async function handleCancelConfirm(reason: string) {
    if (!cancelTarget || actionLoading) return;
    setActionLoading(cancelTarget.id);

    // Supabase: rút qua RPC withdraw; trạng thái mới = 'CancellationRequested' (cần
    // employer duyệt) hoặc 'CancelledByWorker'.
    if (getDataMode() === 'supabase') {
      const res = await withdrawAsync(cancelTarget.id, reason);
      setActionLoading(null);
      if (res.ok) {
        if (res.value === 'CancellationRequested') {
          showInfo(
            t('feedback.cancelRequest.success'),
            t('feedback.cancelRequest.success.desc'),
          );
        } else {
          showSuccess(t('feedback.cancel.success'));
        }
        setCancelTarget(null);
        return;
      }
      showError(toastFromStoreError(res.error));
      return;
    }

    const result = cancelByWorker(cancelTarget.id, reason);
    setActionLoading(null);
    if (result.ok) {
      // Close on success regardless of branch — the dashboard re-renders
      // with the new application status (CancelledByWorker or
      // CancellationRequested) reflecting whichever path was taken.
      if (result.value.requiresApproval) {
        showInfo(
          t('feedback.cancelRequest.success'),
          t('feedback.cancelRequest.success.desc'),
        );
      } else {
        showSuccess(t('feedback.cancel.success'));
      }
      setCancelTarget(null);
      return;
    }
    // On QUOTA_EXCEEDED / WRONG_STATUS / etc. the dialog stays open. The
    // dialog itself renders the quota message and the user-facing error;
    // we keep the modal mounted so they can see the explanation. Also
    // surface a toast so the actor knows the action was rejected.
    showError(toastFromStoreError(result.error));
  }

  // 03/10 — dashboard làm lại: việc tiếp theo lên đầu, một khu "Đơn ứng tuyển" có tab,
  // 3 ô số gọn trong một thẻ, cột phải: Ví / Thông báo / Kỹ năng & giữ uy tín.
  const nextShift = upcoming[0];
  const nextShiftObj = nextShift ? getShift(nextShift.shiftId) : undefined;
  const closedCount = recentlyRejected.length + recentlyCancelledByEmployer.length + recentlyExpired.length;
  const activeAppTab = appTab === 'closed' && closedCount > 0 ? 'closed' : 'pending';
  const statusLine = nextShiftObj
    ? // Không lặp tên ca: thẻ ca ngay bên dưới đã có.
      tx('Ca tiếp theo bắt đầu {date} lúc {time}.')
        .replace('{date}', formatDateVN(nextShiftObj.date))
        .replace('{time}', formatTimeVN(nextShiftObj.startTime))
    : pending.length > 0
      ? tx('{n} đơn đang chờ nhà tuyển dụng duyệt.').replace('{n}', String(pending.length))
      : completedCount > 0
        ? t('worker.dashboard.welcome.veteran').replace('{count}', String(completedCount))
        : t('worker.dashboard.welcome.newcomer');
  const stats: Array<{ key: string; label: string; value: string; suffix?: string; valueClass?: string; onClick: () => void }> = [
    {
      key: 'completed',
      label: t('worker.dashboard.stats.completedShifts'),
      value: String(completedCount),
      onClick: () => setStatDetail('completed'),
    },
    ...(hasCapability('wallet')
      ? [
          {
            key: 'income',
            label: t('worker.dashboard.stats.totalEarnings'),
            value: formatVND(totalEarnings),
            onClick: () => setStatDetail('income'),
          },
        ]
      : []),
    ...(hasCapability('ratings')
      ? [
          {
            key: 'reputation',
            label: t('worker.dashboard.stats.reputationScore'),
            value: String(reputationScore),
            suffix: '/ 100',
            valueClass: reputationScore >= 80 ? 'text-green-700' : reputationScore >= 50 ? 'text-amber-700' : 'text-red-700',
            onClick: () => setStatDetail('reputation'),
          },
        ]
      : []),
  ];

  return (
    <PageShell width="wide" className="flex flex-col">
      <DashboardHeader
        title={t('worker.dashboard.greeting').replace('{name}', worker.fullName)}
        status={statusLine}
        actions={
          <>
          <PageHelpButton
            title={t('help.workerDashboard.title')}
            intro={t('help.workerDashboard.intro')}
            sections={[
              {
                heading: t('help.workerDashboard.section.purpose.heading'),
                items: [t('help.workerDashboard.section.purpose.item1')],
              },
              {
                heading: t('help.workerDashboard.section.numbers.heading'),
                items: [
                  t('help.workerDashboard.section.numbers.item1'),
                  t('help.workerDashboard.section.numbers.item2'),
                  t('help.workerDashboard.section.numbers.item3'),
                  t('help.workerDashboard.section.numbers.item4'),
                ],
              },
              {
                heading: t('help.workerDashboard.section.actions.heading'),
                items: [
                  t('help.workerDashboard.section.actions.item1'),
                  t('help.workerDashboard.section.actions.item2'),
                  t('help.workerDashboard.section.actions.item3'),
                  t('help.workerDashboard.section.actions.item4'),
                ],
              },
              {
                heading: t('help.workerDashboard.section.mistakes.heading'),
                items: [
                  t('help.workerDashboard.section.mistakes.item1'),
                  t('help.workerDashboard.section.mistakes.item2'),
                  t('help.workerDashboard.section.mistakes.item3'),
                ],
              },
            ]}
            cta={{ label: t('help.viewFullGuide'), href: '/user-guide' }}
          />
          {/* Không lặp nút cam "Tìm ca làm": thanh điều hướng đã có (một nút cam mỗi màn). */}
          <Link
            href="/worker/schedule"
            className="motion-press inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            {t('nav.schedule')}
          </Link>
          </>
        }
      />

      {/* Restriction banner — phụ thuộc điểm uy tín (chưa có backend ở supabase). */}
      {hasCapability('ratings') && restricted && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('worker.dashboard.restricted')}
        </div>
      )}
      {/* P2-1 (0028, T3) — bị đánh vắng ở ca có cọc: cảnh báo để kịp khiếu nại. */}
      <WorkerNoShowDepositAlert className="mb-6" />

      {/* Ô số: một thẻ, mỗi ô mở hộp chi tiết (?modal=completed|income|reputation). */}
      <DashboardTiles
        label={tx('Tóm tắt của bạn')}
        items={stats}
        viewDetail={t('btn.viewDetail')}
        extra={
          hasCapability('wallet') ? (
            // Ví (server): worker NHẬN lương (tự cộng khi ca hoàn thành) + RÚT.
            // Chỉ nạp được khi đang bật cọc người lao động (P2-1). Không giữ tiền client (#7).
            <div id="wallet" className="h-full scroll-mt-24">
              <WalletPanel
                variant="tile"
                className={DASH_TILE}
                userId={worker.id}
                role="worker"
                openLedgerSignal={walletLedgerSignal}
                allowTopUp={!!depositStatus?.enabled}
              />
            </div>
          ) : undefined
        }
      />
      {!hasCapability('wallet') && (
        <div className="-mt-6 mb-10">
          <NoPaymentNotice />
        </div>
      )}

      {/* Các khối trải hết bề ngang, một cột — không cột phụ lệch chiều cao. */}
      <div className="flex flex-col gap-10">
          {/* Ca làm sắp tới — ca gần nhất là thẻ lớn kèm nút check-in / check-out. */}
          <DashboardSection
            id="worker-upcoming-section"
            title={t('worker.dashboard.upcomingShifts')}
            count={upcoming.length}
            link={upcoming.length > 0 ? { href: '/worker/schedule', label: t('nav.schedule') } : undefined}
          >
            {!nextShift || !nextShiftObj ? (
              <DashboardEmpty
                title={t('worker.dashboard.noUpcomingShifts')}
                body={isReturningWorker ? tx('Ca được duyệt sẽ hiện ở đây, kèm nút check-in khi tới giờ.') : t('worker.dashboard.empty.upcoming.descriptionRich')}
                action={{ href: '/shifts', label: t('btn.findShift') }}
              />
            ) : (
              // Ca gần nhất đứng đầu lưới (kèm nút check-in / check-out khi tới giờ).
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((a) => {
                  const shift = getShift(a.shiftId)!;
                  return (
                    <UpcomingShiftCard
                      key={a.id}
                      application={a}
                      shift={shift}
                      applications={applications}
                      loading={actionLoading === a.id}
                      onCheckIn={() => handleCheckIn(a.id)}
                      onCheckOut={() => handleCheckOut(a.id)}
                      onCancel={() => handleCancelRequest(a.id)}
                    />
                  );
                })}
              </div>
            )}
          </DashboardSection>

          {/* Cần bạn làm: đánh giá nhà tuyển dụng sau ca. */}
          {hasCapability('reviews') && feedbackPending.length > 0 && (
            <DashboardSection id="worker-todo" title={t('worker.dashboard.feedbackPending')} count={feedbackPending.length}>
              <ul className={['divide-y divide-gray-100 overflow-hidden', DASH_CARD].join(' ')}>
                {feedbackPending.map((a) => {
                  const shift = getShift(a.shiftId);
                  if (!shift) return null;
                  const showForm = feedbackForAppId === a.id;
                  return (
                    <li key={a.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">{shift.title}</p>
                          <p className="mt-0.5 text-sm text-gray-500">{formatDateVN(shift.date)}</p>
                        </div>
                        {!showForm && (
                          <Button size="sm" variant="secondary" onClick={() => setFeedbackForAppId(a.id)}>
                            {t('worker.dashboard.feedbackBtn')}
                          </Button>
                        )}
                      </div>
                      {showForm && (
                        <div className="mt-3">
                          <EmployerFeedbackForm
                            onSubmit={async (input) => {
                              if (isSupabaseEnv()) {
                                const res = await submitReviewAsync({
                                  applicationId: a.id,
                                  stars: input.stars,
                                  comment: input.comment,
                                  tags: input.tags,
                                });
                                if (res.ok) {
                                  showSuccess(t('review.success'));
                                  setFeedbackForAppId(null);
                                } else {
                                  showError(res.error);
                                }
                                return;
                              }
                              const result = submitFeedback({
                                shiftId: shift.id,
                                applicationId: a.id,
                                fromUserId: worker.id,
                                toEmployerId: shift.employerId,
                                stars: input.stars,
                                comment: input.comment,
                                tags: input.tags,
                              });
                              if (result.ok) {
                                setFeedbackForAppId(null);
                              }
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </DashboardSection>
          )}

          {/* Đơn ứng tuyển: một khu, hai tab (Chờ duyệt / Không thành). `?section=applications`
              cuộn tới đây và nháy viền. */}
          <DashboardSection
            id="worker-applications-section"
            title={tx('Đơn ứng tuyển')}
            highlight={applicationsHighlight}
            aside={
              closedCount > 0 ? (
                <SegmentedTabs
                  idBase="worker-apps"
                  label={tx('Lọc đơn ứng tuyển')}
                  value={activeAppTab}
                  onChange={setAppTab}
                  tabs={[
                    { key: 'pending', label: tx('Chờ duyệt'), count: pending.length },
                    { key: 'closed', label: t('worker.dashboard.history.title'), count: closedCount },
                  ]}
                />
              ) : undefined
            }
          >
            <div
              {...(closedCount > 0
                ? { id: 'worker-apps-panel', role: 'tabpanel', 'aria-labelledby': `worker-apps-tab-${activeAppTab}` }
                : {})}
            >
              {activeAppTab === 'pending' ? (
                pending.length === 0 ? (
                  <DashboardNote>
                    {t(isReturningWorker ? 'worker.dashboard.noPendingApplications' : 'worker.dashboard.empty.applications.title')}{' '}
                    <Link
                      href="/shifts"
                      className="rounded font-medium text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      {t('worker.dashboard.findMore')}
                    </Link>
                  </DashboardNote>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pending.map((a) => {
                      const shift = getShift(a.shiftId);
                      if (!shift) return null;
                      return <PendingApplicationCard key={a.id} application={a} shift={shift} />;
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-5">
                  {recentlyRejected.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('worker.dashboard.recentlyRejected')}</h3>
                      <div className="flex flex-col gap-3">
                        {recentlyRejected.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return <RejectedApplicationCard key={a.id} application={a} shift={shift} />;
                        })}
                      </div>
                    </div>
                  )}
                  {recentlyCancelledByEmployer.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('worker.dashboard.history.cancelledByEmployer')}</h3>
                      <div className="flex flex-col gap-3">
                        {recentlyCancelledByEmployer.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return (
                            <HistoryShiftCard
                              key={a.id}
                              shift={shift}
                              badgeTone="danger"
                              badgeLabel={t('application.status.CancelledByEmployer')}
                              reason={shift.employerCancellationReason}
                              note={t('worker.dashboard.history.cancelledByEmployerNote')}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {recentlyExpired.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('worker.dashboard.history.expired')}</h3>
                      <div className="flex flex-col gap-3">
                        {recentlyExpired.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return (
                            <HistoryShiftCard
                              key={a.id}
                              shift={shift}
                              badgeTone="neutral"
                              badgeLabel={t('application.status.Expired')}
                              note={t('worker.dashboard.history.expiredNote')}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DashboardSection>

          {/* Ca hợp giờ rảnh (chỉ khi người lao động đã khai lịch rảnh và có ca khớp). */}
          {recommendedShifts.length > 0 && (
            <DashboardSection
              id="worker-suggest"
              title={t('availability.suggest.title')}
              link={{ href: '/shifts', label: t('availability.suggest.viewAll') }}
            >
              <p className="-mt-2 mb-3 text-sm text-gray-500">{t('availability.suggest.subtitle')}</p>
              <ul className={['divide-y divide-gray-100 overflow-hidden', DASH_CARD].join(' ')}>
                {recommendedShifts.map((m) => (
                  <li key={m.shift.id}>
                    <Link
                      href={`/shifts/${m.shift.id}`}
                      className="flex items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-900">{m.shift.title}</span>
                        <span className="mt-0.5 block text-sm text-gray-500 tabular-nums">
                          {formatDateVN(m.shift.date)} · {formatTimeVN(m.shift.startTime)}–{formatTimeVN(m.shift.endTime)} · {m.shift.location}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatVND(m.shift.hourlyWage)}
                          {t('common.perHour')}
                        </span>
                        <Badge
                          tone={
                            m.label === t('availability.match.veryGood')
                              ? 'success'
                              : m.label === t('availability.match.good')
                                ? 'info'
                                : 'warning'
                          }
                        >
                          {m.label}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </DashboardSection>
          )}
          {/* Kỹ năng & giữ uy tín — chưa có backend ở supabase → ẩn. */}
          {hasCapability('ratings') && (
            <DashboardSection
              id="worker-skills"
              title={t('worker.dashboard.skills.title')}
              link={{ href: '/worker/profile', label: t('btn.viewDetail') }}
            >
              <div className={['grid gap-5 p-5 sm:p-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center', DASH_CARD].join(' ')}>
              {liveQuota && (
                <button
                  type="button"
                  onClick={() => setStatDetail('quota')}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-left transition-colors hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span className="text-sm text-gray-700">{t('worker.dashboard.cancelQuota')}</span>
                  <span
                    className={[
                      'text-sm font-bold tabular-nums',
                      liveQuota.weekly.remaining === 0 ? 'text-red-700' : liveQuota.weekly.remaining <= 1 ? 'text-amber-700' : 'text-gray-900',
                    ].join(' ')}
                  >
                    {liveQuota.weekly.remaining}/{liveQuota.weekly.limit}
                    <span className="ml-1 text-xs font-medium text-gray-500">{t('worker.dashboard.cancelQuota.weekHint')}</span>
                  </span>
                </button>
              )}
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
                {buildSkillDisplayList(worker.skillScores)
                  .slice(0, 3)
                  .map((entry) => (
                    <SkillProgressBar key={entry.category} entry={entry} compact />
                  ))}
              </div>
              </div>
            </DashboardSection>
          )}
      </div>

      {/* Cancel confirmation dialog */}
      {cancelTarget &&
        (() => {
          const shift = getShift(cancelTarget.shiftId);
          if (!shift) return null;
          return (
            <CancelApplicationDialog
              open={true}
              onClose={() => setCancelTarget(null)}
              application={cancelTarget}
              shift={shift}
              onConfirm={handleCancelConfirm}
              loading={actionLoading === cancelTarget.id}
              // Hạn mức huỷ chưa có backend ở supabase → không truyền quota (tránh
              // hiện 5/5 sai). Local giữ nguyên.
              quota={hasCapability('ratings') ? cancelQuota : undefined}
            />
          );
        })()}

      {/* Phase 10C — Worker check-out dialog. Mounted as a sibling of
          the cancel dialog so it can be opened from any upcoming-card
          row. Resolves the live application + shift on render so a
          background lifecycle update doesn't leave the dialog
          showing stale data. */}
      {checkoutTargetId &&
        (() => {
          const targetApp = myApps.find((a) => a.id === checkoutTargetId);
          if (!targetApp) return null;
          const shift = getShift(targetApp.shiftId);
          if (!shift) return null;
          return (
            <CheckoutDialog
              open={true}
              onClose={() => {
                setCheckoutTargetId(null);
                setCheckoutError(null);
              }}
              application={targetApp}
              shift={shift}
              onSubmit={handleCheckoutSubmit}
              loading={actionLoading === targetApp.id}
              errorMessage={checkoutError}
            />
          );
        })()}

      {/* Phase 9F + 9H — reputation detail modal.
          9H: adds `ratingsReceived` count and the most-recent cancellation
          history (LateCancel / OnTime markers) so the worker sees the
          actual events that moved the score, not just the rules. When
          there's no history yet we show an explicit MVP note instead of
          inventing fake events. */}
      <Modal
        open={statDetail === 'reputation' && hasCapability('ratings')}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.stats.reputationScore')}
        className="max-w-4xl"
        titleAccessory={
          <HelpPopover
            title={t('worker.dashboard.stats.reputationScore')}
            description={t('hint.worker.reputation')}
            learnMoreHref="/user-guide#worker-reputation"
          />
        }
      >
        {/* UI-REFRESH Batch 2 — wider desktop layout: left column holds
            the summary + rules + stat grid, right column holds the
            scrollable history. Collapses to one column on mobile/tablet. */}
        <div className="grid gap-4 text-sm text-gray-700 lg:grid-cols-2">
          {/* Left column — summary + rules + stats */}
          <div className="flex flex-col gap-3">
            {/* UI-VISUAL-REDESIGN-1 — bold score hero with a ring gauge so
                the reputation modal opens on a strong visual, not a flat
                number. The gauge is a conic-gradient ring sized by score. */}
            {/* Quieter — white score card (was a drenched orange→amber
                gradient with white text + blob). The conic gauge is kept
                but now reads its stops from the LIVE theme tokens: an
                orange-500 (#FF9A5F) arc on a soft orange-100 track, with an
                orange number, so orange stays a small accent and text is
                ink. Using `var(--color-orange-500)`/`var(--color-orange-100)`
                (emitted by the Tailwind `@theme` block) keeps the gauge on
                the current palette and carries NO raw hex — the previous
                `#f97316`/`#f1f5f9` stops were the stale orange + a slate
                track. Score is still shown as text (gauge is aria-hidden);
                the `* 3.6` degree derivation is unchanged. */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-card">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--color-orange-500) ${worker.reputationScore * 3.6}deg, var(--color-orange-100) 0deg)`,
                  }}
                  aria-hidden="true"
                >
                  <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white px-1">
                    <span className="text-xl font-extrabold leading-none text-orange-600">
                      {worker.reputationScore}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">
                    {t('worker.dashboard.reputationModal.currentLabel')}
                  </p>
                  <p className="mt-0.5 text-2xl font-extrabold text-gray-900">
                    {worker.reputationScore}
                    <span className="ml-1 text-sm font-medium text-gray-500">/ 100</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {worker.reputationScore >= 80
                      ? t('worker.dashboard.reputationModal.bandGood')
                      : worker.reputationScore >= 50
                        ? t('worker.dashboard.reputationModal.bandWarn')
                        : t('worker.dashboard.reputationModal.bandBad')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2.5">
              <p className="text-xs font-semibold text-orange-800">
                {t('worker.dashboard.reputationHint.title')}
              </p>
              <p className="mt-1 text-xs text-orange-700">
                {t('worker.dashboard.reputationHint.gain')}
              </p>
              <p className="mt-1 text-xs text-orange-700">
                {t('worker.dashboard.reputationHint.lose')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-green-100 bg-white px-3 py-2.5">
                <p className="text-sm font-medium text-gray-600">
                  {t('worker.dashboard.reputationModal.completedLabel')}
                </p>
                <p className="mt-0.5 text-xl font-bold text-green-600">
                  {worker.completedShiftCount}
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-white px-3 py-2.5">
                <p className="text-sm font-medium text-gray-600">
                  {t('worker.dashboard.reputationModal.ratingsLabel')}
                </p>
                <p className="mt-0.5 text-xl font-bold text-orange-600">
                  {worker.ratingsReceived.length}
                </p>
              </div>
            </div>
          </div>

          {/* Right column — history (scrolls if long) */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-600">
              {t('worker.dashboard.reputationModal.recentTitle')}
            </p>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500">
              {t('worker.dashboard.reputationModal.timelineNote')}
            </p>
            {repTimeline.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
                {t('worker.dashboard.reputationModal.noHistory')}
              </div>
            ) : (
              <ul className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1">
                {repTimeline.slice(0, 8).map((ev) => (
                  <li
                    key={ev.id}
                    className={[
                      'flex items-start justify-between gap-2 rounded-lg px-3 py-2',
                      ev.isAdmin
                        ? 'border border-orange-200 bg-orange-50'
                        : 'border border-gray-200 bg-white',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {ev.isAdmin && (
                          <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-xs font-semibold text-white">
                            {t('worker.dashboard.reputationModal.adminBadge')}
                          </span>
                        )}
                        <p className="truncate text-xs font-medium text-gray-900">
                          {ev.label}
                        </p>
                      </div>
                      {ev.sublabel && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {ev.sublabel}
                        </p>
                      )}
                      {ev.at !== '0000-00-00T00:00:00.000Z' && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatDateVN(ev.at.slice(0, 10))}
                        </p>
                      )}
                    </div>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                        ev.delta > 0
                          ? 'bg-green-50 text-green-700'
                          : ev.delta < 0
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700',
                      ].join(' ')}
                    >
                      {ev.delta > 0 ? '+' : ''}
                      {ev.delta}
                    </span>
                  </li>
                )).concat(
                  <li
                    key="rep-base"
                    className="flex items-start justify-between gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {t('worker.dashboard.reputationModal.baseLabel')}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t('worker.dashboard.reputationModal.baseSublabel')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      100
                    </span>
                  </li>,
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setStatDetail(null)}
          >
            {t('help.btn.close')}
          </Button>
        </div>
      </Modal>

      {/* Phase 9F + 9H — cancellation quota detail modal.
          9H: adds the recent cancellation usage list so the worker can
          see exactly which cancellations counted against the weekly /
          monthly window. */}
      <Modal
        open={statDetail === 'quota' && hasCapability('ratings')}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.cancelQuota')}
        titleAccessory={
          <HelpPopover
            title={t('worker.dashboard.cancelQuota')}
            description={t('hint.worker.cancelQuota')}
            learnMoreHref="/user-guide#worker-cancellation-quota"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>{t('worker.dashboard.quotaModal.intro')}</p>
          {liveQuota && (
            <ul className="flex flex-col gap-2">
              <li className="rounded-lg bg-orange-50 px-3 py-2">
                <span className="font-semibold text-orange-800">
                  {t('cancel.quota.weekly')
                    .replace('{remaining}', String(liveQuota.weekly.remaining))
                    .replace('{limit}', String(liveQuota.weekly.limit))}
                </span>
              </li>
              <li className="rounded-lg bg-orange-50 px-3 py-2">
                <span className="font-semibold text-orange-800">
                  {t('cancel.quota.monthly')
                    .replace('{remaining}', String(liveQuota.monthly.remaining))
                    .replace('{limit}', String(liveQuota.monthly.limit))}
                </span>
              </li>
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-600">
              {t('worker.dashboard.quotaModal.recentTitle')}
            </p>
            {worker.cancellationHistory.filter(
              (rec) => !rec.reasonNote?.startsWith('[Admin set'),
            ).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
                {t('worker.dashboard.quotaModal.empty')}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...worker.cancellationHistory]
                  .filter(
                    (rec) => !rec.reasonNote?.startsWith('[Admin set'),
                  )
                  .sort((a, b) => b.cancelledAt.localeCompare(a.cancelledAt))
                  .slice(0, 5)
                  .map((rec) => {
                    const shift = getShift(rec.shiftId);
                    return (
                      <li
                        key={rec.id}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-gray-900">
                            {shift?.title ?? t('worker.dashboard.quotaModal.unknownShift')}
                          </p>
                          <span
                            className={[
                              'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                              rec.type === 'LateCancel'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700',
                            ].join(' ')}
                          >
                            {rec.type === 'LateCancel'
                              ? t('worker.dashboard.reputationModal.lateCancel')
                              : t('worker.dashboard.reputationModal.onTimeCancel')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatDateVN(rec.cancelledAt.slice(0, 10))}
                        </p>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-500">
            {t('worker.dashboard.quotaModal.bonus')}
          </p>

          {/* Phase 10A-Fix-8: protection-against-employer-cancellation
              entries. Visible alongside the cancellation usage list so
              the worker can see exactly when the system protected them
              and whether a quota slot was refunded. */}
          {(worker.protections ?? []).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-green-700">
                {t('worker.dashboard.protection.title')}
              </p>
              <ul className="flex flex-col gap-2">
                {[...(worker.protections ?? [])]
                  .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                  .slice(0, 5)
                  .map((rec) => (
                    <li
                      key={rec.id}
                      className="rounded-lg border border-green-200 bg-green-50/60 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-green-900">
                          {rec.quotaSlotsRefunded > 0
                            ? t('worker.dashboard.protection.quotaRefunded').replace(
                                '{count}',
                                String(rec.quotaSlotsRefunded),
                              )
                            : t('worker.dashboard.protection.quotaNotCounted')}
                        </p>
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          {rec.shiftTitle}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-green-800/80">
                        {rec.employerName} • {t('worker.dashboard.history.reasonLabel')}{' '}
                        {rec.reason}
                      </p>
                      <p className="mt-0.5 text-xs text-green-700/70">
                        {formatDateVN(rec.occurredAt.slice(0, 10))}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setStatDetail(null)}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 9G — income detail modal */}
      <Modal
        open={statDetail === 'income' && hasCapability('wallet')}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.stats.totalEarnings')}
        titleAccessory={
          <HelpPopover
            title={t('worker.dashboard.stats.totalEarnings')}
            description={t('hint.worker.totalEarnings')}
            learnMoreHref="/user-guide#worker-total-income"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <div className="rounded-xl bg-orange-50 px-4 py-3 ring-1 ring-orange-100">
            <p className="text-sm font-medium text-orange-700">
              {t('worker.dashboard.incomeModal.totalLabel')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-orange-700">
              {formatVND(totalEarnings)}
            </p>
            <p className="mt-1 text-xs text-orange-700/80">
              {t('worker.dashboard.incomeModal.completedCount').replace(
                '{count}',
                String(completedShifts.length),
              )}
            </p>
          </div>
          {completedShifts.length === 0 ? (
            <EmptyState
              tone="warm"
              title={t('worker.dashboard.empty.income.title')}
              description={t('worker.dashboard.empty.income.description')}
              action={
                <ButtonLink href="/shifts" size="sm" variant="primary" onClick={() => setStatDetail(null)}>
                  {t('worker.dashboard.empty.income.cta')}
                </ButtonLink>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">
                {t('worker.dashboard.incomeModal.recentTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {[...completedShifts]
                  .sort((a, b) =>
                    (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? ''),
                  )
                  .slice(0, 5)
                  .map((app) => {
                    const shift = getShift(app.shiftId);
                    const employer = shift
                      ? users.find((u) => u.id === shift.employerId)
                      : undefined;
                    const employerName =
                      employer?.role === 'employer'
                        ? employer.companyName
                        : undefined;
                    return (
                      <li
                        key={app.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {shift?.title ?? tx('Ca làm')}
                          </p>
                          {employerName && (
                            <p className="mt-0.5 truncate text-xs text-orange-700">
                              {employerName}
                            </p>
                          )}
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {shift
                              ? `${formatDateVN(shift.date)} • ${formatTimeVN(shift.startTime)}–${formatTimeVN(shift.endTime)}`
                              : ''}
                          </p>
                          {shift?.location && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {shift.location}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-orange-700">
                          {formatVND(app.payoutAmount ?? 0)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-500">
            {t('worker.dashboard.incomeModal.disclaimer')}
          </p>
          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setStatDetail(null)}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 9G — completed shifts modal */}
      <Modal
        open={statDetail === 'completed'}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.stats.completedShifts')}
        titleAccessory={
          <HelpPopover
            title={t('worker.dashboard.stats.completedShifts')}
            description={t('hint.worker.completedShifts')}
            learnMoreHref="/user-guide#worker-completed-shifts"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <div className="rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-100">
            <p className="text-sm font-medium text-green-700">
              {t('worker.dashboard.completedModal.totalLabel')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-green-700 tabular-nums">
              {completedCount}
            </p>
          </div>
          {completedShifts.length === 0 ? (
            <EmptyState
              tone="warm"
              title={t('worker.dashboard.empty.completed.title')}
              description={t('worker.dashboard.empty.completed.description')}
              action={
                <ButtonLink href="/shifts" size="sm" variant="primary" onClick={() => setStatDetail(null)}>
                  {t('worker.dashboard.empty.completed.cta')}
                </ButtonLink>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">
                {t('worker.dashboard.completedModal.recentTitle').replace(
                  '{shown}',
                  String(Math.min(5, completedShifts.length)),
                ).replace('{total}', String(completedCount))}
              </p>
              <ul className="flex flex-col gap-2">
                {[...completedShifts]
                  .sort((a, b) =>
                    (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? ''),
                  )
                  .slice(0, 5)
                  .map((app) => {
                    const shift = getShift(app.shiftId);
                    const employer = shift
                      ? users.find((u) => u.id === shift.employerId)
                      : undefined;
                    const employerName =
                      employer?.role === 'employer'
                        ? employer.companyName
                        : undefined;
                    // Đánh giá thật (0024): nhà tuyển dụng → bạn, bạn → nhà tuyển dụng.
                    const received =
                      allRatings.find(
                        (r) => r.applicationId === app.id && r.toUserId === worker.id,
                      ) ??
                      (shift
                        ? worker.ratingsReceived.find((r) => r.shiftId === shift.id)
                        : undefined);
                    const given = allFeedback.find(
                      (f) => f.applicationId === app.id && f.fromUserId === worker.id,
                    );
                    return (
                      <li
                        key={app.id}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {shift?.title ?? tx('Ca làm')}
                            </p>
                            {employerName && (
                              <p className="mt-0.5 truncate text-xs text-orange-700">
                                {employerName}
                              </p>
                            )}
                            <p className="mt-0.5 truncate text-xs text-gray-600">
                              {shift
                                ? `${formatDateVN(shift.date)} • ${formatTimeVN(shift.startTime)}–${formatTimeVN(shift.endTime)}`
                                : ''}
                            </p>
                            {shift?.location && (
                              <p className="mt-0.5 truncate text-xs text-gray-600">
                                {shift.location}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                            {t('worker.dashboard.completedModal.confirmedBadge')}
                          </span>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          {received || given ? (
                            <ShiftReviewStatus
                              givenStars={given?.stars}
                              receivedStars={received?.stars}
                              counterpartName={employerName ?? t('common.employer')}
                            />
                          ) : (
                            <span className="text-sm text-gray-600">
                              {t('worker.dashboard.completedModal.noRating')}
                            </span>
                          )}
                          {app.payoutAmount !== undefined &&
                            app.payoutAmount > 0 && (
                              <span className="shrink-0 text-xs font-semibold text-orange-700">
                                {formatVND(app.payoutAmount)}
                              </span>
                            )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
              {completedCount > completedShifts.length && (
                <p className="text-xs italic text-gray-500">
                  {t('worker.dashboard.completedModal.legacyNote').replace(
                    '{count}',
                    String(completedCount - completedShifts.length),
                  )}
                </p>
              )}
            </div>
          )}
          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setStatDetail(null)}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function UpcomingShiftCard({
  application,
  shift,
  applications,
  loading,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  application: Application;
  shift: Shift;
  applications: Application[];
  loading: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const tx = useTx();
  const nowIso = new Date().toISOString();
  // Gate thống nhất: CTA chấm công chỉ hiện khi capability attendance bật
  // (production = có RPC thật). Time gate quyết định thời điểm hiển thị.
  const attendanceOn = hasCapability('attendance');
  const showCheckIn = attendanceOn && canCheckIn(nowIso, application, shift);
  const showCheckOut = attendanceOn && canCheckOut(nowIso, application, shift);
  const lateCheckout = showCheckOut && isLateCheckout(nowIso, shift);
  // CORE-STABILITY-9 Parts 1 & 3 — derive the canonical attendance
  // state and render WORKER-perspective copy (never employer text).
  const attendanceState = deriveAttendanceState(application, shift, nowIso);
  const attendanceCopy = attendanceCopyKey(attendanceState, 'worker');
  const canCancel =
    application.status === 'Approved' && !showCheckIn && shift.status !== 'Cancelled';
  // "Còn bao lâu" tính một lần lúc render — không đếm ngược bằng timer (§5.6).
  const left = startsIn(shift, nowIso);
  const startsInLabel = !left
    ? null
    : left.days > 0
      ? tx('Bắt đầu sau {d} ngày {h} giờ').replace('{d}', String(left.days)).replace('{h}', String(left.hours))
      : left.hours > 0
        ? tx('Bắt đầu sau {h} giờ {m} phút').replace('{h}', String(left.hours)).replace('{m}', String(left.minutes))
        : tx('Bắt đầu sau {m} phút').replace('{m}', String(left.minutes));

  const hasActions = showCheckIn || showCheckOut || canCancel || application.status === 'CheckedOut';
  // CORE-STABILITY-10 — còn `Published` (xa giờ bắt đầu) thì nhãn chính là
  // trạng thái đơn của mình ("Đã duyệt"); từ "Sắp bắt đầu" trở đi thẻ hiện
  // badge vòng đời chung để cùng nhãn + màu với mọi trang khác (§5.3).
  const showLifecycleBadge = getShiftLifecycleState(shift, applications, nowIso) !== 'Published';

  // Cùng khung với thẻ ca ở dashboard nhà tuyển dụng (ShiftCard: tổng tiền ca,
  // ngày, giờ, địa điểm, badge vòng đời hoặc chip trạng thái đơn của mình).
  return (
    <div className="flex flex-col gap-2">
      <ShiftCard
        shift={shift}
        applications={applications}
        nowIso={nowIso}
        href={`/shifts/${shift.id}`}
        workerApplicationStatus={showLifecycleBadge ? undefined : application.status}
      />

      {attendanceCopy && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
        >
          {t(attendanceCopy)}
        </p>
      )}

      {(hasActions || startsInLabel) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {startsInLabel && !showCheckIn && (
            <span className="text-xs font-medium text-gray-600 tabular-nums">{startsInLabel}</span>
          )}
          {/* Per-row contextual actions use the outlined orange secondary
              style, not primary: the worker dashboard's single page-level
              primary CTA is the header "Tìm ca làm" (Req 2.4/2.5, 11.3). */}
          {showCheckIn && (
            <Button size="md" variant="secondary" onClick={onCheckIn} loading={loading}>
              {t('btn.checkIn')}
            </Button>
          )}
          {showCheckOut && (
            <Button size="md" variant="secondary" onClick={onCheckOut} loading={loading}>
              {t(lateCheckout ? 'btn.checkOutLate' : 'btn.checkOut')}
            </Button>
          )}
          {/* Phase 10C Wave 5 — worker can open a structured dispute after
              check-out; the dialog lives on the shift detail page. */}
          {application.status === 'CheckedOut' && (
            <Link
              href={`/shifts/${shift.id}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium text-amber-800 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {t('worker.dispute.openButton')}
            </Link>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel} loading={loading} className="ml-auto">
              {t('btn.cancel')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Thẻ một dòng trong "Lịch sử gần đây": cả thẻ là liên kết tới ca. */
function HistoryShiftCard({
  shift,
  badgeTone,
  badgeLabel,
  reason,
  note,
}: {
  shift: Shift;
  badgeTone: 'danger' | 'neutral' | 'success';
  badgeLabel: string;
  reason?: string;
  note: string;
}) {
  const t = useT();
  return (
    <Link
      href={`/shifts/${shift.id}`}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
    >
      <Card className="transition-colors hover:border-orange-300 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words font-semibold text-gray-900">{shift.title}</p>
            <p className="mt-0.5 text-sm text-gray-500 tabular-nums">
              {formatDateVN(shift.date)} • {formatTimeVN(shift.startTime)}–
              {formatTimeVN(shift.endTime)}
            </p>
          </div>
          <Badge tone={badgeTone}>{badgeLabel}</Badge>
        </div>
        {reason && (
          <p className="mt-2 break-words text-sm text-gray-700">
            <span className="font-medium">{t('worker.dashboard.history.reasonLabel')}</span>{' '}
            {reason}
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{note}</p>
      </Card>
    </Link>
  );
}

function PendingApplicationCard({
  application,
  shift,
}: {
  application: Application;
  shift: Shift;
}) {
  const t = useT();
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/shifts/${shift.id}`}
            className="break-words font-semibold text-gray-900 hover:text-orange-700"
          >
            {shift.title}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">{shift.location}</p>
        </div>
        <Badge tone="warning">{t(`application.status.${application.status}`)}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>{formatDateVN(shift.date)}</span>
        <span>
          {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
        </span>
        <span className="font-medium text-orange-700 tabular-nums">
          {formatVND(shift.hourlyWage)}
          {t('common.perHour')}
        </span>
      </div>
    </Card>
  );
}

function RejectedApplicationCard({
  application,
  shift,
}: {
  application: Application;
  shift: Shift;
}) {
  const t = useT();
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/shifts/${shift.id}`}
            className="break-words font-semibold text-gray-900 hover:text-orange-700"
          >
            {shift.title}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">{shift.location}</p>
        </div>
        <Badge tone="danger">{t('application.status.Rejected')}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>{formatDateVN(shift.date)}</span>
        <span>
          {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
        </span>
      </div>
      {application.rejectionReason && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-medium">{t('worker.dashboard.rejectionReasonLabel')}:</span>{' '}
          {application.rejectionReason}
        </p>
      )}
    </Card>
  );
}
