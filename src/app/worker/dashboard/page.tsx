'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, Badge, Button, EmptyState, Modal, PageHelpButton } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { CancelApplicationDialog } from '@/components/forms/CancelApplicationDialog';
import { EmployerFeedbackForm } from '@/components/forms/EmployerFeedbackForm';
import { canCheckIn, canCheckOut } from '@/domain/timeGates';
import { quotaUsage } from '@/domain/cancellationQuota';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useModalFromQuery } from '@/lib/useModalFromQuery';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
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
  const checkIn = useApplicationStore((s) => s.checkIn);
  const checkOut = useApplicationStore((s) => s.checkOut);
  const cancelByWorker = useApplicationStore((s) => s.cancelByWorker);
  const allFeedback = useEmployerFeedbackStore((s) => s.feedback);
  const submitFeedback = useEmployerFeedbackStore((s) => s.submit);
  const allNotifications = useNotificationStore((s) => s.notifications);
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
  const [feedbackForAppId, setFeedbackForAppId] = useState<string | null>(null);
  // Phase 9F — which detail modal is open (or null).
  // Phase 9G adds 'income' and 'completed' so the corresponding tiles
  // open dedicated modals instead of scrolling to unrelated sections.
  const [statDetail, setStatDetail] = useState<
    'reputation' | 'quota' | 'income' | 'completed' | null
  >(null);

  // Phase 9L — open a stat-detail modal when the page is loaded with a
  // `?modal=...` query param (used by notification deep links). The hook
  // reads the param exactly once on mount, opens the matching modal, and
  // strips the query so refreshing or closing the modal doesn't re-open it.
  useModalFromQuery(
    ['reputation', 'quota', 'income', 'completed'] as const,
    (m) => setStatDetail(m as 'reputation' | 'quota' | 'income' | 'completed'),
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

  if (!worker) return null;

  // Helper to look up a shift
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const getShift = (id: string) => shiftMap.get(id);

  // Stats
  const completedShifts = myApps.filter((a) => a.status === 'Confirmed');
  const totalEarnings = completedShifts.reduce((acc, a) => acc + (a.payoutAmount ?? 0), 0);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Phase 3: derive the worker's current cancellation quota whenever the
  // cancel dialog is open. We pull the raw history + reputation off the
  // worker selector (both stable references) and call the pure helper in
  // a `useMemo` so we never feed Zustand a fresh array selector.
  const cancelQuota = useMemo(() => {
    if (!cancelTarget) return undefined;
    return quotaUsage(
      worker.cancellationHistory,
      worker.reputationScore,
      new Date().toISOString(),
    );
  }, [cancelTarget, worker.cancellationHistory, worker.reputationScore]);

  // Upcoming approved/checked-in shifts (date in future or today).
  // Includes `CancellationRequested` so the worker still sees the shift
  // while waiting for the employer's decision.
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = myApps
    .filter((a) =>
      ['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut'].includes(a.status) &&
      getShift(a.shiftId) !== undefined &&
      getShift(a.shiftId)!.date >= todayStr,
    )
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
  // Phase 6: Confirmed applications that haven't yet received employer
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
    // Sort descending so the most-recent event is first.
    return events.sort((a, b) => b.at.localeCompare(a.at));
  }, [worker, myApps, shifts]);

  const restricted = worker.reputationScore < 50;

  function handleCheckIn(appId: string) {
    setActionLoading(appId);
    const result = checkIn(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.checkIn.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleCheckOut(appId: string) {
    setActionLoading(appId);
    const result = checkOut(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.checkOut.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleCancelRequest(appId: string) {
    const app = myApps.find((a) => a.id === appId);
    if (!app) return;
    setCancelTarget(app);
  }

  function handleCancelConfirm(reason: string) {
    if (!cancelTarget) return;
    setActionLoading(cancelTarget.id);
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome card — soft gradient strip with avatar fallback + quick stats peek */}
      <header className="entrance-up mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-lg font-bold text-white shadow-sm">
            {worker.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('worker.dashboard.welcome')}
            </p>
            <h1 className="truncate text-2xl font-bold text-gray-900">
              {worker.fullName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
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
              items={[
                t('help.workerDashboard.item1'),
                t('help.workerDashboard.item2'),
                t('help.workerDashboard.item3'),
                t('help.workerDashboard.item4'),
              ]}
            />
            <Link href="/shifts">
              <Button size="sm" variant="primary">
                {t('btn.findShift')}
              </Button>
            </Link>
            <Link href="/worker/schedule">
              <Button size="sm" variant="secondary">
                {t('nav.schedule')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Restriction banner */}
      {restricted && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('worker.dashboard.restricted')}
        </div>
      )}

      {/* Stats grid — Phase 9 polish: stronger tiles, reputation gets accent treatment */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t('worker.dashboard.stats.reputationScore')}
          value={String(worker.reputationScore)}
          suffix="/ 100"
          tone={
            worker.reputationScore >= 80
              ? 'good'
              : worker.reputationScore >= 50
                ? 'warn'
                : 'bad'
          }
          icon="star"
          onClick={() => setStatDetail('reputation')}
          ariaLabel="Xem chi tiết điểm uy tín"
        />
        <StatTile
          label={t('worker.dashboard.stats.completedShifts')}
          value={String(worker.completedShiftCount)}
          tone="neutral"
          icon="check"
          onClick={() => setStatDetail('completed')}
          ariaLabel="Xem chi tiết ca đã hoàn thành"
        />
        <StatTile
          label={t('worker.dashboard.stats.totalEarnings')}
          value={formatVND(totalEarnings)}
          tone="brand"
          icon="wallet"
          onClick={() => setStatDetail('income')}
          ariaLabel="Xem chi tiết thu nhập"
        />
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

      <div className="grid gap-6 lg:grid-cols-3">
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
                description={t('worker.dashboard.noUpcomingShifts.hint')}
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
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t('worker.dashboard.appliedShifts')}
            </h2>
            {pending.length === 0 ? (
              <EmptyState
                title={t('worker.dashboard.noApplications')}
                description={t('worker.dashboard.noApplications.hint')}
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

          {/* Phase 6: recently-rejected applications. Surfaces the
              employer's rejection reason so the worker doesn't have to
              dig through notifications. */}
          {recentlyRejected.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {t('worker.dashboard.recentlyRejected')}
              </h2>
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
            </section>
          )}

          {/* Phase 6: confirmed shifts awaiting worker → employer feedback. */}
          {feedbackPending.length > 0 && (
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
                          <Button
                            size="sm"
                            variant="primary"
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

          {/* Phase 6: reputation rules note — surfaced on the dashboard
              so workers see how to recover. */}
          <section>
            <Card className="bg-orange-50/40">
              <p className="text-sm font-semibold text-orange-800">
                {t('worker.dashboard.reputationHint.title')}
              </p>
              <p className="mt-1 text-xs text-orange-700">
                {t('worker.dashboard.reputationHint.gain')}
              </p>
              <p className="mt-1 text-xs text-orange-700">
                {t('worker.dashboard.reputationHint.lose')}
              </p>
            </Card>
          </section>
        </div>

        {/* Side column: notifications */}
        <aside>
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{t('nav.notifications')}</h2>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead(worker.id)}
                  className="text-xs text-orange-600 hover:underline"
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

      {/* Phase 9F + 9H — reputation detail modal.
          9H: adds `ratingsReceived` count and the most-recent cancellation
          history (LateCancel / OnTime markers) so the worker sees the
          actual events that moved the score, not just the rules. When
          there's no history yet we show an explicit MVP note instead of
          inventing fake events. */}
      <Modal
        open={statDetail === 'reputation'}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.stats.reputationScore')}
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-3 ring-1 ring-orange-100">
            <p className="text-[11px] font-medium uppercase tracking-wide text-orange-600">
              {t('worker.dashboard.reputationModal.currentLabel')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-orange-700">
              {worker.reputationScore}
              <span className="ml-1 text-sm font-medium text-orange-700/80">/ 100</span>
            </p>
            <p className="mt-1 text-xs text-orange-700/80">
              {worker.reputationScore >= 80
                ? t('worker.dashboard.reputationModal.bandGood')
                : worker.reputationScore >= 50
                  ? t('worker.dashboard.reputationModal.bandWarn')
                  : t('worker.dashboard.reputationModal.bandBad')}
            </p>
          </div>

          <div className="rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2">
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

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {t('worker.dashboard.reputationModal.completedLabel')}
              </p>
              <p className="mt-0.5 text-base font-bold text-emerald-600">
                {worker.completedShiftCount}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {t('worker.dashboard.reputationModal.ratingsLabel')}
              </p>
              <p className="mt-0.5 text-base font-bold text-orange-600">
                {worker.ratingsReceived.length}
              </p>
            </div>
          </div>

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
              <ul className="flex flex-col gap-2">
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

      {/* Phase 9F + 9H — cancellation quota detail modal.
          9H: adds the recent cancellation usage list so the worker can
          see exactly which cancellations counted against the weekly /
          monthly window. */}
      <Modal
        open={statDetail === 'quota'}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.cancelQuota')}
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
        open={statDetail === 'income'}
        onClose={() => setStatDetail(null)}
        title={t('worker.dashboard.stats.totalEarnings')}
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-3 ring-1 ring-orange-100">
            <p className="text-[11px] font-medium uppercase tracking-wide text-orange-600">
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
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
              {t('worker.dashboard.incomeModal.empty')}
            </div>
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
                        <span className="shrink-0 text-sm font-semibold text-orange-600">
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
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/40 px-4 py-3 ring-1 ring-emerald-100">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
              {t('worker.dashboard.completedModal.totalLabel')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">
              {worker.completedShiftCount}
            </p>
          </div>
          {completedShifts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
              {t('worker.dashboard.completedModal.empty')}
            </div>
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
                              <span className="shrink-0 text-xs font-semibold text-orange-600">
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
 * Phase 9 visual polish + Phase 9F interactivity: stat tile with optional
 * `onClick` so a tile can scroll, navigate, or open a modal. When
 * `onClick` is provided the tile renders as a `<button>` with hover lift,
 * focus ring, "→" indicator and `aria-label`. Otherwise it renders as a
 * plain `<div>`.
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
  const toneRing: Record<Tone, string> = {
    brand: 'before:bg-orange-500',
    neutral: 'before:bg-slate-300',
    good: 'before:bg-emerald-500',
    warn: 'before:bg-amber-500',
    bad: 'before:bg-red-500',
  };
  const toneText: Record<Tone, string> = {
    brand: 'text-orange-600',
    neutral: 'text-gray-900',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  };
  const baseClasses = [
    'relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-left w-full',
    'before:absolute before:left-0 before:top-0 before:h-1 before:w-full',
    toneRing[tone],
  ].join(' ');

  const interactiveClasses = onClick
    ? 'motion-lift cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
    : '';

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {icon && <TileIcon name={icon} />}
      </div>
      <p className={['mt-2 text-2xl font-extrabold', toneText[tone]].join(' ')}>
        {value}
        {suffix && (
          <span className="ml-1 text-xs font-medium text-gray-500">{suffix}</span>
        )}
      </p>
      {onClick && (
        <span
          aria-hidden="true"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
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
        className={['group', baseClasses, interactiveClasses].join(' ')}
      >
        {body}
      </button>
    );
  }

  return <div className={baseClasses}>{body}</div>;
}

function TileIcon({ name }: { name: IconName }) {
  const cls = 'h-5 w-5 text-gray-300';
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
  const showCheckIn = canCheckIn(nowIso, application, shift);
  const showCheckOut = canCheckOut(nowIso, application, shift);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/shifts/${shift.id}`}
            className="font-semibold text-gray-900 hover:text-orange-600"
          >
            {shift.title}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">{shift.location}</p>
        </div>
        <ShiftStatusBadge status={shift.status} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>{formatDateVN(shift.date)}</span>
        <span>
          {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
        </span>
        <span className="font-medium text-orange-600">{formatVND(shift.hourlyWage)}/giờ</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={badgeToneFor(application.status)}>
          {t(`application.status.${application.status}`)}
        </Badge>

        {showCheckIn && (
          <Button size="sm" variant="primary" onClick={onCheckIn} loading={loading}>
            {t('btn.checkIn')}
          </Button>
        )}
        {showCheckOut && (
          <Button size="sm" variant="primary" onClick={onCheckOut} loading={loading}>
            {t('btn.checkOut')}
          </Button>
        )}
        {application.status === 'Approved' && !showCheckIn && (
          <Button size="sm" variant="ghost" onClick={onCancel} loading={loading}>
            {t('btn.cancel')}
          </Button>
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
            className="font-semibold text-gray-900 hover:text-orange-600"
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
        <span className="font-medium text-orange-600">{formatVND(shift.hourlyWage)}/giờ</span>
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
            className="font-semibold text-gray-900 hover:text-orange-600"
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

function badgeToneFor(status: Application['status']): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' {
  switch (status) {
    case 'Approved': return 'success';
    case 'CheckedIn': return 'purple';
    case 'CheckedOut': return 'warning';
    case 'Confirmed': return 'success';
    case 'Pending': return 'warning';
    case 'CancellationRequested': return 'warning';
    case 'Rejected': return 'danger';
    case 'NoShow': return 'danger';
    case 'CancelledByWorker': return 'neutral';
    default: return 'neutral';
  }
}
