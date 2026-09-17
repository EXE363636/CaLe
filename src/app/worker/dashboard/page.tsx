'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker, getWorkerReputation } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { getDataMode } from '@/data/supabaseClient';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useWalletStore } from '@/stores/walletStore';
import { Card, Badge, Button, EmptyState, HelpPopover, Modal, PageHelpButton } from '@/components/ui';
import { CancelApplicationDialog } from '@/components/forms/CancelApplicationDialog';
import { CheckoutDialog } from '@/components/forms/CheckoutDialog';
import { EmployerFeedbackForm } from '@/components/forms/EmployerFeedbackForm';
import { WalletPanel } from '@/components/wallet/WalletPanel';
import { NoPaymentNotice } from '@/components/wallet/NoPaymentNotice';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { hasCapability } from '@/data/capabilities';
import { canCheckIn, canCheckOut } from '@/domain/timeGates';
import { deriveAttendanceState, attendanceCopyKey } from '@/domain/attendanceState';
import { suggestShiftsForWorker } from '@/domain/availabilityMatch';
import { buildSkillDisplayList } from '@/domain/skillProgression';
import { deriveWorkerIncome } from '@/domain/finance';
import { SkillProgressBar } from '@/components/user/SkillProgressBar';
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { getShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { useScheduleStore } from '@/stores/scheduleStore';
import { quotaUsage } from '@/domain/cancellationQuota';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useModalFromQuery, useSectionFromQuery } from '@/lib/useModalFromQuery';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { getUserInitials } from '@/lib/initials';
import { DashboardNotificationCard } from '@/components/layout/DashboardNotificationCard';
import { t } from '@/i18n/vi';
import type { Application, Shift } from '@/types';

export default function WorkerDashboardPage() {
  return (
    <RoleGuard role="worker">
      <WorkerDashboardContent />
    </RoleGuard>
  );
}

function WorkerDashboardContent() {
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
  const submitFeedback = useEmployerFeedbackStore((s) => s.submit);
  const allNotifications = useNotificationStore((s) => s.notifications);
  const scheduleBlocks = useScheduleStore((s) => s.blocks);
  // Cluster 3 · BUG 5 (Req 2.5): subscribe to the append-only wallet ledger so
  // the worker's income tile stays reactive and is derived from the single
  // money source (see `totalEarnings` below).
  const ledger = useWalletStore((s) => s.ledger);
  const notifications = useMemo(
    () =>
      currentUserId
        ? allNotifications.filter((n) => n.userId === currentUserId)
        : [],
    [allNotifications, currentUserId],
  );
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markRead = useNotificationStore((s) => s.markRead);

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

  // CORE-STABILITY-6 Part 1 — "Việc đã ứng tuyển" section intent. When
  // fired (cold-load `?section=applications` OR same-route event) we
  // scroll the applied-jobs section into view and flash a ring so the
  // result is VISIBLE, not just a URL change. Works on repeat clicks.
  const [applicationsHighlight, setApplicationsHighlight] = useState(false);
  const focusApplications = useCallback(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('worker-applications-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Re-trigger the highlight even if it's already on (repeat click):
    // turn it off synchronously, then on, then auto-clear.
    setApplicationsHighlight(false);
    requestAnimationFrame(() => setApplicationsHighlight(true));
    window.setTimeout(() => setApplicationsHighlight(false), 1600);
  }, []);

  // CORE-STABILITY-7 Part 1 — wallet-history deeplink. Incrementing
  // this signal opens the WalletPanel's ledger modal. Driven by the
  // `?modal=wallet` query (cold load) and the same-route notification
  // event (top-up / withdraw / wage-release notifications).
  const [walletLedgerSignal, setWalletLedgerSignal] = useState(0);
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
  // and DashboardNotificationCard both fire `cale:open-dashboard-modal`
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
  const unreadCount = notifications.filter((n) => !n.read).length;

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
      return sh.date >= todayStr;
    })
    .sort((a, b) => {
      const sa = getShift(a.shiftId)!;
      const sb = getShift(b.shiftId)!;
      return `${sa.date}T${sa.startTime}`.localeCompare(`${sb.date}T${sb.startTime}`);
    });

  const pending = myApps.filter((a) => a.status === 'Pending');
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

  const recentlyCompleted = useMemo(
    () =>
      myApps
        .filter((a) => a.status === 'Confirmed')
        .sort((a, b) =>
          (b.confirmedAt ?? b.checkOutAt ?? '').localeCompare(a.confirmedAt ?? a.checkOutAt ?? ''),
        )
        .slice(0, 5),
    [myApps],
  );

  // Feedback pending: completed shifts that haven't received employer
  // feedback from this worker. The feedback store is the source of truth
  // for "already submitted" — guards against double-submission.
  const feedbackPending = useMemo(() => {
    if (!worker) return [] as Application[];
    const submittedIds = new Set(
      allFeedback
        .filter((f) => f.fromUserId === worker.id)
        .map((f) => f.applicationId),
    );
    return myApps
      .filter((a) => a.status === 'Confirmed' && !submittedIds.has(a.id))
      .sort((a, b) => (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? ''));
  }, [myApps, allFeedback, worker]);

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
            ? `+${rec.reputationPointsRestored} Bảo vệ quyền lợi do nhà tuyển dụng hủy ca`
            : 'Bảo vệ quyền lợi do nhà tuyển dụng hủy ca',
        sublabel:
          rec.reputationPointsRestored > 0
            ? `${rec.shiftTitle} • ${rec.employerName} • ${rec.reason}`
            : `${rec.shiftTitle} • ${rec.employerName} • Bạn đã đạt 100 điểm nên không cộng thêm uy tín.`,
      });
    }
    // Sort descending so the most-recent event is first.
    return events.sort((a, b) => b.at.localeCompare(a.at));
  }, [worker, myApps, shifts]);

  if (!worker) return null;

  const restricted = worker.reputationScore < 50;
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
        t('feedback.checkOut.success.desc'),
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

  return (
    <div className="relative isolate mx-auto flex max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      {/* Phase 9T — subtle decorative warmth anchored to the top-right
          of the dashboard, behind every card. Same principle as the
          homepage hero blobs: low alpha, blurred, pointer-events-none,
          aria-hidden. The layout doesn't move; only the surface gains
          a hint of depth so the page no longer reads as "white cards on
          gray". `isolate` on the wrapper keeps the `-z-10` blob below
          the cards without bleeding under the rest of the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl"
      />
      {/* Quieter — the dashboard opens on a compact "dispatch block",
          not a marketing hero: white surface, soft border, ink text, one
          orange primary CTA. Warmth comes from the page's cream bg + the
          white card (DESIGN.md: One Orange Rule / Warmth-From-Background). */}
      <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl font-bold text-orange-700 ring-1 ring-orange-100">
            {getUserInitials(worker.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500">{t('worker.dashboard.welcome')}</p>
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
              {worker.fullName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {worker.completedShiftCount > 0
                ? t('worker.dashboard.welcome.veteran').replace(
                    '{count}',
                    String(worker.completedShiftCount),
                  )
                : t('worker.dashboard.welcome.newcomer')}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            {/* THE single page-level primary CTA (One-Orange / Req 2.4,
                11.3). This inline Link replicates the Button primitive's
                primary contract exactly — solid bg-orange-500 (#FF9A5F) +
                dark ink text-gray-900 (#37373B), no gradient, no white
                text, shared hover/active/focus treatment — so it never
                drifts from `<Button variant="primary">`. */}
            <Link
              href="/shifts"
              className="motion-press inline-flex min-h-[44px] items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-orange-400 hover:shadow-md active:bg-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('btn.findShift')}
            </Link>
            <Link
              href="/worker/schedule"
              className="motion-press inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('nav.schedule')}
            </Link>
          </div>
        </div>
      </header>

      {/* Restriction banner — phụ thuộc điểm uy tín (chưa có backend ở supabase). */}
      {hasCapability('ratings') && restricted && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('worker.dashboard.restricted')}
        </div>
      )}

      {/* Stats grid — calm reference metrics. On mobile these sit BELOW
          the actionable work area (order-2) so the worker sees "Ca sắp
          tới" first; on desktop they return to the top strip. */}
      <section className="order-2 mb-8 mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:order-none lg:mt-0">
        {/* Điểm uy tín: chưa có backend đánh giá thật → ẩn ở supabase để không
            hiện con số mặc định (100) như dữ liệu thật (mục 5). */}
        {hasCapability('ratings') && (
          <StatTile
            label={t('worker.dashboard.stats.reputationScore')}
            value={String(reputationScore)}
            suffix="/ 100"
            tone={
              reputationScore >= 80
                ? 'good'
                : reputationScore >= 50
                  ? 'warn'
                  : 'bad'
            }
            icon="star"
            onClick={() => setStatDetail('reputation')}
            ariaLabel="Xem chi tiết điểm uy tín"
          />
        )}
        <StatTile
          label={t('worker.dashboard.stats.completedShifts')}
          /* Supabase: đếm từ đơn đã xác nhận thật; local: giữ số hồ sơ seed. */
          value={String(isSupabaseEnv() ? completedShifts.length : worker.completedShiftCount)}
          tone="neutral"
          icon="check"
          onClick={() => setStatDetail('completed')}
          ariaLabel="Xem chi tiết ca đã hoàn thành"
        />
        {/* Thu nhập/ví: chưa có backend thanh toán → ẩn ở supabase. */}
        {hasCapability('wallet') && (
          <StatTile
            label={t('worker.dashboard.stats.totalEarnings')}
            value={formatVND(totalEarnings)}
            tone="brand"
            icon="wallet"
            onClick={() => setStatDetail('income')}
            ariaLabel="Xem chi tiết thu nhập"
          />
        )}
        <StatTile
          label={t('worker.dashboard.cancelQuota')}
          value={
            liveQuota
              ? `${liveQuota.weekly.remaining}/${liveQuota.weekly.limit}`
              : '–'
          }
          suffix={liveQuota ? t('worker.dashboard.cancelQuota.weekHint') : undefined}
          tone={
            liveQuota && liveQuota.weekly.remaining === 0
              ? 'bad'
              : liveQuota && liveQuota.weekly.remaining <= 1
                ? 'warn'
                : 'neutral'
          }
          icon="calendar"
          onClick={() => setStatDetail('quota')}
          ariaLabel="Xem chi tiết hạn mức huỷ"
        />
      </section>

      {/* Phase 10C-Stab-1 Batch 4B — wallet balance + ledger. On mobile
          this follows the work area + stats (order-3); desktop unchanged. */}
      <section className="order-3 mb-8 lg:order-none">
        {isSupabaseEnv() ? (
          <NoPaymentNotice />
        ) : (
          <WalletPanel
            userId={worker.id}
            role="worker"
            openLedgerSignal={walletLedgerSignal}
          />
        )}
      </section>

      {/* Mobile-first ordering — the work area (upcoming + actions) leads
          on small screens (order-1), above the stats + wallet. */}
      <div className="order-1 grid gap-6 lg:order-none lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Upcoming */}
          <section id="worker-upcoming-section">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t('worker.dashboard.upcomingShifts')}
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState
                tone="warm"
                title={t('worker.dashboard.noUpcomingShifts')}
                description={t('worker.dashboard.empty.upcoming.descriptionRich')}
                action={
                  <Link href="/shifts">
                    <Button size="sm" variant="primary">
                      {t('btn.findShift')}
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming.map((a) => {
                  const shift = getShift(a.shiftId)!;
                  return (
                    <UpcomingShiftCard
                      key={a.id}
                      application={a}
                      shift={shift}
                      loading={actionLoading === a.id}
                      onCheckIn={() => handleCheckIn(a.id)}
                      onCheckOut={() => handleCheckOut(a.id)}
                      onCancel={() => handleCancelRequest(a.id)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending applications */}
          <section
            id="worker-applications-section"
            className={[
              'scroll-mt-24 rounded-2xl transition-shadow',
              applicationsHighlight
                ? 'ring-2 ring-orange-400 ring-offset-2'
                : '',
            ].join(' ')}
          >
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t('worker.dashboard.appliedShifts')}
            </h2>
            {pending.length === 0 ? (
              <EmptyState
                tone="warm"
                title={t('worker.dashboard.empty.applications.title')}
                description={t('worker.dashboard.empty.applications.description')}
                action={
                  <Link href="/shifts">
                    <Button size="sm" variant="primary">
                      {t('worker.dashboard.empty.applications.cta')}
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((a) => {
                  const shift = getShift(a.shiftId);
                  if (!shift) return null;
                  return <PendingApplicationCard key={a.id} application={a} shift={shift} />;
                })}
              </div>
            )}
          </section>

          {/* Distill — the three "bad-news" histories (rejected,
              employer-cancelled, expired) are consolidated into ONE
              collapsible "Lịch sử gần đây". The work area now leads with
              the next shift + action; past setbacks stay one tap away
              (progressive disclosure), collapsed by default. */}
          {recentlyRejected.length +
            recentlyCancelledByEmployer.length +
            recentlyExpired.length +
            recentlyCompleted.length >
            0 && (
            <section>
              <details className="group rounded-2xl border border-gray-200 bg-white shadow-card">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                  <span className="text-sm font-semibold text-gray-900">
                    Lịch sử gần đây
                    <span className="ml-1 font-normal text-gray-500">
                      (
                      {recentlyRejected.length +
                        recentlyCancelledByEmployer.length +
                        recentlyExpired.length +
                        recentlyCompleted.length}
                      )
                    </span>
                  </span>
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <div className="flex flex-col gap-5 border-t border-gray-100 px-5 py-4">
                  {recentlyRejected.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">
                        {t('worker.dashboard.recentlyRejected')}
                      </h3>
                      <div className="flex flex-col gap-3">
                        {recentlyRejected.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return (
                            <RejectedApplicationCard
                              key={a.id}
                              application={a}
                              shift={shift}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {recentlyCancelledByEmployer.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">
                        Ca làm bị nhà tuyển dụng hủy
                      </h3>
                      <div className="flex flex-col gap-3">
                        {recentlyCancelledByEmployer.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return (
                            <Link key={a.id} href={`/shifts/${shift.id}`}>
                              <Card className="hover:border-orange-300 hover:shadow-sm transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900">
                                      {shift.title}
                                    </p>
                                    <p className="mt-0.5 text-sm text-gray-500">
                                      {formatDateVN(shift.date)} •{' '}
                                      {formatTimeVN(shift.startTime)}–
                                      {formatTimeVN(shift.endTime)}
                                    </p>
                                  </div>
                                  <Badge tone="danger">
                                    {t('application.status.CancelledByEmployer')}
                                  </Badge>
                                </div>
                                {shift.employerCancellationReason && (
                                  <p className="mt-2 text-sm text-gray-700">
                                    <span className="font-medium">Lý do:</span>{' '}
                                    {shift.employerCancellationReason}
                                  </p>
                                )}
                                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                  Bạn không bị trừ điểm uy tín hoặc hạn mức hủy
                                  vì ca do nhà tuyển dụng hủy.
                                </p>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {recentlyExpired.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">
                        Đơn ứng tuyển đã hết hạn
                      </h3>
                      <div className="flex flex-col gap-3">
                        {recentlyExpired.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return (
                            <Link key={a.id} href={`/shifts/${shift.id}`}>
                              <Card className="hover:border-orange-300 hover:shadow-sm transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900">
                                      {shift.title}
                                    </p>
                                    <p className="mt-0.5 text-sm text-gray-500">
                                      {formatDateVN(shift.date)} •{' '}
                                      {formatTimeVN(shift.startTime)}–
                                      {formatTimeVN(shift.endTime)}
                                    </p>
                                  </div>
                                  <Badge tone="neutral">
                                    {t('application.status.Expired')}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                  Ca đã bắt đầu trước khi đơn của bạn được duyệt.
                                  Bạn không bị trừ điểm uy tín hoặc hạn mức hủy.
                                </p>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {recentlyCompleted.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">
                        Ca làm đã hoàn thành
                      </h3>
                      <div className="flex flex-col gap-3">
                        {recentlyCompleted.map((a) => {
                          const shift = getShift(a.shiftId);
                          if (!shift) return null;
                          return (
                            <Link key={a.id} href={`/shifts/${shift.id}`}>
                              <Card className="hover:border-orange-300 hover:shadow-sm transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900">
                                      {shift.title}
                                    </p>
                                    <p className="mt-0.5 text-sm text-gray-500">
                                      {formatDateVN(shift.date)} •{' '}
                                      {formatTimeVN(shift.startTime)}–
                                      {formatTimeVN(shift.endTime)}
                                    </p>
                                  </div>
                                  <Badge tone="success">
                                    {t('application.status.Confirmed')}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                  Ca làm việc đã hoàn thành và tiền công đã được cộng vào ví của bạn.
                                </p>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </section>
          )}

          {/* Phase 6: confirmed shifts awaiting worker → employer feedback.
              Đánh giá chưa có backend ở supabase → ẩn. */}
          {hasCapability('ratings') && feedbackPending.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {t('worker.dashboard.feedbackPending')}
              </h2>
              <div className="flex flex-col gap-3">
                {feedbackPending.map((a) => {
                  const shift = getShift(a.shiftId);
                  if (!shift) return null;
                  const showForm = feedbackForAppId === a.id;
                  return (
                    <Card key={a.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">
                            {shift.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {formatDateVN(shift.date)}
                          </p>
                        </div>
                        {!showForm && (
                          // Secondary, not primary: the page's single
                          // primary CTA is the header "Tìm ca làm" (Req
                          // 2.4/2.5, 11.3). This per-card action uses the
                          // outlined orange secondary style.
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setFeedbackForAppId(a.id)}
                          >
                            {t('worker.dashboard.feedbackBtn')}
                          </Button>
                        )}
                      </div>
                      {showForm && (
                        <div className="mt-3">
                          <EmployerFeedbackForm
                            onSubmit={(input) => {
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
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* CORE-STABILITY-9 Part 5 — availability-based job suggestions.
              Only shown when the worker has declared free time and there
              are matching shifts. */}
          {recommendedShifts.length > 0 && (
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('availability.suggest.title')}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {t('availability.suggest.subtitle')}
                  </p>
                </div>
                <Link href="/shifts">
                  <Button size="sm" variant="ghost">
                    {t('availability.suggest.viewAll')}
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {recommendedShifts.map((m) => (
                  <Link key={m.shift.id} href={`/shifts/${m.shift.id}`}>
                    <Card className="transition-colors hover:border-emerald-300 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {m.shift.title}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatDateVN(m.shift.date)} •{' '}
                            {formatTimeVN(m.shift.startTime)}–
                            {formatTimeVN(m.shift.endTime)}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {m.shift.location} ·{' '}
                            {formatVND(m.shift.hourlyWage)}
                            {t('common.perHour')}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
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
                          {m.fitsAvailability && (
                            <span className="text-[11px] font-medium text-emerald-700">
                              {t('availability.fitsAvailability')}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Distill — the skill summary + reputation tips motivate but
              aren't the worker's immediate job, so they're demoted into
              one collapsed disclosure. The dashboard leads with shifts +
              actions; growth/coaching stays one tap away.
              Kỹ năng/điểm uy tín chưa có backend ở supabase → ẩn cả khối. */}
          {hasCapability('ratings') && (
          <section>
            <details className="group rounded-2xl border border-gray-200 bg-white shadow-card">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                <span className="text-sm font-semibold text-gray-900">
                  Kỹ năng & giữ uy tín
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4">
                {/* Skill summary */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('skill.dashboard.title')}
                    </h3>
                    <Link
                      href="/worker/profile"
                      className="text-xs font-medium text-orange-700 hover:underline"
                    >
                      {t('btn.viewDetail')}
                    </Link>
                  </div>
                  <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
                    {t('skill.section.intro')}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {buildSkillDisplayList(worker.skillScores)
                      .slice(0, 4)
                      .map((entry) => (
                        <SkillProgressBar
                          key={entry.category}
                          entry={entry}
                          compact
                        />
                      ))}
                  </div>
                </div>

                {/* Reputation recovery tips */}
                <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 py-3">
                  <p className="text-sm font-semibold text-orange-800">
                    {t('worker.dashboard.reputationHint.title')}
                  </p>
                  <p className="mt-1 text-xs text-orange-700">
                    {t('worker.dashboard.reputationHint.gain')}
                  </p>
                  <p className="mt-1 text-xs text-orange-700">
                    {t('worker.dashboard.reputationHint.lose')}
                  </p>
                </div>
              </div>
            </details>
          </section>
          )}
        </div>

        {/* Side column: notifications — chưa có backend ở supabase → ẩn. */}
        {hasCapability('notifications') && (
        <aside>
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{t('nav.notifications')}</h2>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead(worker.id)}
                  className="text-xs text-orange-700 hover:underline"
                >
                  {t('btn.markAllRead')}
                </button>
              )}
            </div>
            <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-gray-400">{t('common.noData')}</li>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <li key={n.id}>
                    <DashboardNotificationCard
                      notification={n}
                      onRead={markRead}
                    />
                  </li>
                ))
              )}
            </ul>
          </Card>
        </aside>
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
              quota={cancelQuota}
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
              <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {t('worker.dashboard.reputationModal.completedLabel')}
                </p>
                <p className="mt-0.5 text-xl font-bold text-emerald-600">
                  {worker.completedShiftCount}
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-white px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('worker.dashboard.reputationModal.recentTitle')}
            </p>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] italic text-gray-500">
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
                        ? 'border border-indigo-200 bg-indigo-50/60'
                        : 'border border-gray-200 bg-white',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {ev.isAdmin && (
                          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                            {t('worker.dashboard.reputationModal.adminBadge')}
                          </span>
                        )}
                        <p className="truncate text-xs font-medium text-gray-900">
                          {ev.label}
                        </p>
                      </div>
                      {ev.sublabel && (
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          {ev.sublabel}
                        </p>
                      )}
                      {ev.at !== '0000-00-00T00:00:00.000Z' && (
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {formatDateVN(ev.at.slice(0, 10))}
                        </p>
                      )}
                    </div>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        ev.delta > 0
                          ? 'bg-emerald-50 text-emerald-700'
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
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {t('worker.dashboard.reputationModal.baseSublabel')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
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
        open={statDetail === 'quota'}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
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
                        <p className="mt-0.5 text-[11px] text-gray-500">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Bảo vệ quyền lợi
              </p>
              <ul className="flex flex-col gap-2">
                {[...(worker.protections ?? [])]
                  .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                  .slice(0, 5)
                  .map((rec) => (
                    <li
                      key={rec.id}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-emerald-900">
                          {rec.quotaSlotsRefunded > 0
                            ? `+${rec.quotaSlotsRefunded} lượt hủy được hoàn lại`
                            : 'Không bị tính lượt hủy'}
                        </p>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          {rec.shiftTitle}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-emerald-800/80">
                        {rec.employerName} • Lý do: {rec.reason}
                      </p>
                      <p className="mt-0.5 text-[11px] text-emerald-700/70">
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
            <p className="text-[11px] font-medium uppercase tracking-wide text-orange-700">
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
                <Link href="/shifts" onClick={() => setStatDetail(null)}>
                  <Button size="sm" variant="primary">
                    {t('worker.dashboard.empty.income.cta')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                            {shift?.title ?? 'Ca làm'}
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
                            <p className="mt-0.5 truncate text-[11px] text-gray-400">
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
          <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
              {t('worker.dashboard.completedModal.totalLabel')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">
              {worker.completedShiftCount}
            </p>
          </div>
          {completedShifts.length === 0 ? (
            <EmptyState
              tone="warm"
              title={t('worker.dashboard.empty.completed.title')}
              description={t('worker.dashboard.empty.completed.description')}
              action={
                <Link href="/shifts" onClick={() => setStatDetail(null)}>
                  <Button size="sm" variant="primary">
                    {t('worker.dashboard.empty.completed.cta')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('worker.dashboard.completedModal.recentTitle').replace(
                  '{shown}',
                  String(Math.min(5, completedShifts.length)),
                ).replace('{total}', String(worker.completedShiftCount))}
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
                    const myRating = shift
                      ? worker.ratingsReceived.find(
                          (r) => r.shiftId === shift.id,
                        )
                      : undefined;
                    return (
                      <li
                        key={app.id}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {shift?.title ?? 'Ca làm'}
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
                              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                                {shift.location}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {t('worker.dashboard.completedModal.confirmedBadge')}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          {myRating ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <span aria-hidden="true">★</span>
                              {myRating.stars}/5
                              {myRating.feedback && (
                                <span className="ml-1 truncate text-[11px] font-normal text-gray-500">
                                  · {myRating.feedback}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">
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
              {worker.completedShiftCount > completedShifts.length && (
                <p className="text-[11px] italic text-gray-500">
                  {t('worker.dashboard.completedModal.legacyNote').replace(
                    '{count}',
                    String(
                      worker.completedShiftCount - completedShifts.length,
                    ),
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Phase 9 visual polish + Phase 9F interactivity. Stat tile with
 * optional `onClick` so a tile can scroll, navigate, or open a modal.
 *
 * Phase 9Y-Fix-3: contextual help has been pulled OUT of the stat tile
 * entirely. The `?` glyph used to live next to the label (Phase 9Y-Fix
 * popover, Phase 9Y hover hint) but manual QA flagged that even a small
 * inline glyph cluttered the dashboard overview. Help is now rendered
 * inside the corresponding stat detail modal — see the matching
 * `<Modal titleAccessory={<HelpPopover ... />} />` blocks below. The
 * tile is therefore back to a clean `<button>`-as-card structure when
 * interactive, with no inline help instrumentation and no nested-button
 * concerns.
 */
type Tone = 'brand' | 'neutral' | 'good' | 'warn' | 'bad';
type IconName = 'star' | 'check' | 'wallet' | 'calendar' | 'briefcase' | 'users' | 'shield';

function StatTile({
  label,
  value,
  suffix,
  tone = 'neutral',
  icon,
  onClick,
  ariaLabel,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: Tone;
  icon?: IconName;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  // Quieter — stat tiles are calm: white surface, soft border, no tinted
  // wash and no saturated gradient chips. Colour is a small accent on the
  // icon glyph + the value only (DESIGN.md: One Orange / status-as-accent).
  const toneChip: Record<Tone, string> = {
    brand: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100',
    neutral: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
    good: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    warn: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    bad: 'bg-red-50 text-red-600 ring-1 ring-red-100',
  };
  const toneText: Record<Tone, string> = {
    brand: 'text-orange-600',
    neutral: 'text-gray-900',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  };

  const baseClasses =
    'group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 text-left w-full shadow-card';

  const interactiveClasses = onClick
    ? 'motion-lift cursor-pointer hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
    : '';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {icon && (
          <span
            className={['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneChip[tone]].join(' ')}
            aria-hidden="true"
          >
            <TileIcon name={icon} />
          </span>
        )}
      </div>
      <p className={['mt-3 text-2xl font-extrabold leading-none', toneText[tone]].join(' ')}>
        {value}
        {suffix && (
          <span className="ml-1 text-xs font-medium text-gray-500">{suffix}</span>
        )}
      </p>
      {onClick && (
        // Affordance is persistent (not hover-only) so touch users see
        // the tile is tappable; calm gray by default, orange on
        // hover/focus per the quieter color discipline.
        <span
          aria-hidden="true"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 transition-colors group-hover:text-orange-700 group-focus-visible:text-orange-700"
        >
          Xem chi tiết →
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className={[baseClasses, interactiveClasses].join(' ')}
      >
        {body}
      </button>
    );
  }

  return <div className={baseClasses}>{body}</div>;
}

function TileIcon({ name }: { name: IconName }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'star':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="m12 2 3 7 7 .5-5.5 4.5L18 21l-6-3.5L6 21l1.5-7L2 9.5 9 9z" />
        </svg>
      );
    case 'check':
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    case 'wallet':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path strokeLinecap="round" d="M9 7V5h6v2" />
        </svg>
      );
    case 'users':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <circle cx="9" cy="8" r="3" />
          <path strokeLinecap="round" d="M3 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 1 0 0-6M21 20c0-2.5-2-4.5-5-5" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
        </svg>
      );
    default:
      return null;
  }
}

function UpcomingShiftCard({
  application,
  shift,
  loading,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  application: Application;
  shift: Shift;
  loading: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
}) {
  const nowIso = new Date().toISOString();
  // Gate thống nhất: CTA chấm công chỉ hiện khi capability attendance bật
  // (production = có RPC thật). Time gate quyết định thời điểm hiển thị.
  const attendanceOn = hasCapability('attendance');
  const showCheckIn = attendanceOn && canCheckIn(nowIso, application, shift);
  const showCheckOut = attendanceOn && canCheckOut(nowIso, application, shift);
  // CORE-STABILITY-9 Parts 1 & 3 — derive the canonical attendance
  // state and render WORKER-perspective copy (never employer text).
  const attendanceState = deriveAttendanceState(application, shift, nowIso);
  const attendanceCopy = attendanceCopyKey(attendanceState, 'worker');
  // CORE-STABILITY-10 — the unified lifecycle state. We render the
  // shared badge once the shift is time-relevant to the worker
  // (StartingSoon onwards). While it is still plain `Published`
  // (recruiting, far from start) the worker's own application-status
  // badge ("Đã duyệt") is the correct primary label — the public
  // recruiting status "Đang tuyển" is a discovery concern, not the
  // approved worker's. The state itself is computed by the single
  // source-of-truth helper, so it never disagrees with other surfaces.
  const lifecycleState = getShiftLifecycleState(shift, [application], nowIso);
  const showLifecycleBadge = lifecycleState !== 'Published';

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/shifts/${shift.id}`}
            className="font-semibold text-gray-900 hover:text-orange-700"
          >
            {shift.title}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">{shift.location}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* CORE-STABILITY-10 — single unified lifecycle badge, the
              same label + colour as every other surface (the worker's
              own application status badge appears below). */}
          {showLifecycleBadge && (
            <ShiftLifecycleBadge
              shift={shift}
              applications={[application]}
              nowIso={nowIso}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>{formatDateVN(shift.date)}</span>
        <span>
          {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
        </span>
        <span className="font-medium text-orange-700">{formatVND(shift.hourlyWage)}/giờ</span>
      </div>

      {attendanceCopy && (
        <p
          role="status"
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
        >
          {t(attendanceCopy)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Quieter — the shift lifecycle badge (top-right) is the single
            primary status chip; the worker's application status is a
            small inline label, not a competing badge. The Approved case
            gets a subtle emerald check so an approved-but-far shift still
            reads as reassuring while the lifecycle badge is hidden. */}
        {application.status === 'Approved' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {t('application.status.Approved')}
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-600">
            {t(`application.status.${application.status}`)}
          </span>
        )}

        {/* Per-row contextual actions use the outlined orange secondary
            style, not primary: the worker dashboard's single page-level
            primary CTA is the header "Tìm ca làm" (Req 2.4/2.5, 11.3).
            Only the variant styling changes here — role, accessible name,
            handler and loading state are unchanged. */}
        {showCheckIn && (
          <Button size="md" variant="secondary" onClick={onCheckIn} loading={loading}>
            {t('btn.checkIn')}
          </Button>
        )}
        {showCheckOut && (
          <Button size="md" variant="secondary" onClick={onCheckOut} loading={loading}>
            {t('btn.checkOut')}
          </Button>
        )}
        {application.status === 'Approved' &&
          !showCheckIn &&
          shift.status !== 'Cancelled' && (
            <Button size="sm" variant="ghost" onClick={onCancel} loading={loading}>
              {t('btn.cancel')}
            </Button>
          )}
        {/* Phase 10C Wave 5 — worker can open a structured dispute
            after check-out while waiting for employer confirmation.
            The dispute dialog lives on the shift detail page so the
            dashboard card just deep-links there to keep the dialog
            state in one place. */}
        {application.status === 'CheckedOut' && (
          <Link
            href={`/shifts/${shift.id}`}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-800 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {t('worker.dispute.openButton')}
          </Link>
        )}
      </div>
    </Card>
  );
}

function PendingApplicationCard({
  application,
  shift,
}: {
  application: Application;
  shift: Shift;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/shifts/${shift.id}`}
            className="font-semibold text-gray-900 hover:text-orange-700"
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
        <span className="font-medium text-orange-700">{formatVND(shift.hourlyWage)}/giờ</span>
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
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/shifts/${shift.id}`}
            className="font-semibold text-gray-900 hover:text-orange-700"
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
