'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import { Card, Badge, Button, EmptyState, HelpPopover, Modal, PageHelpButton } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { DashboardNotificationCard } from '@/components/layout/DashboardNotificationCard';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useModalFromQuery } from '@/lib/useModalFromQuery';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Shift } from '@/types';

export default function EmployerDashboardPage() {
  return (
    <RoleGuard role="employer">
      <EmployerDashboardContent />
    </RoleGuard>
  );
}

function EmployerDashboardContent() {
  useLifecycleSync();
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
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
  // Phase 10A-Fix-4 — read the live verification doc slice so the
  // pending-applications detail modal always shows current admin
  // approval state, not a frozen snapshot from when the application
  // was submitted.
  const workerDocuments = useVerificationStore((s) => s.workerDocuments);

  const employer = asEmployer(users.find((u) => u.id === currentUserId));

  // Phase 9H — stat-tile detail modals. Replaces the previous
  // `scrollToId(...)` shortcuts with proper modal lists so every tile
  // surfaces useful data even when the relevant section isn't on the
  // dashboard (e.g. completed shifts live on the schedule, not here).
  type StatDetail =
    | 'posted'
    | 'active'
    | 'pending'
    | 'completed'
    | 'payments'
    | null;
  const [statDetail, setStatDetail] = useState<StatDetail>(null);

  // Phase 9L — open a stat-detail modal when arriving with a `?modal=...`
  // query param (notification deep links).
  useModalFromQuery(
    ['posted', 'active', 'pending', 'completed', 'payments'] as const,
    (m) =>
      setStatDetail(
        m as 'posted' | 'active' | 'pending' | 'completed' | 'payments',
      ),
  );

  // Phase 9N — same-page modal handoff (see worker dashboard for rationale).
  useDashboardModalEvents('/employer/dashboard', (detail) => {
    const allowed = [
      'posted',
      'active',
      'pending',
      'completed',
      'payments',
    ] as const;
    if (
      detail.modal &&
      (allowed as readonly string[]).includes(detail.modal)
    ) {
      setStatDetail(detail.modal as (typeof allowed)[number]);
    }
  });

  const myShifts = useMemo(
    () => (employer ? shifts.filter((s) => s.employerId === employer.id) : []),
    [shifts, employer],
  );

  const totalDeposited = myShifts.reduce((acc, s) => acc + s.depositAmount, 0);
  const completedShifts = myShifts.filter((s) => s.status === 'Completed');
  const totalPaidOut = completedShifts.reduce((acc, s) => acc + s.depositAmount, 0);
  const activeShifts = myShifts.filter((s) =>
    ['Published', 'FullyBooked', 'InProgress', 'AwaitingConfirmation'].includes(s.status),
  );

  const pendingApps = useMemo(() => {
    if (!employer) return [];
    const shiftIds = new Set(myShifts.map((s) => s.id));
    return applications.filter((a) => shiftIds.has(a.shiftId) && a.status === 'Pending');
  }, [applications, myShifts, employer]);

  if (!employer) return null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative isolate mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Phase 9T — subtle decorative warmth anchored to the top-right
          of the dashboard. See worker dashboard for rationale. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl"
      />
      {/* Welcome strip — Phase 9D entrance-up on first paint. */}
      <header className="entrance-up mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-lg font-bold text-white shadow-sm">
            {employer.companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('employer.dashboard.title')}
            </p>
            <h1 className="truncate text-2xl font-bold text-gray-900">
              {employer.companyName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {activeShifts.length > 0
                ? t('employer.dashboard.welcome.active').replace(
                    '{count}',
                    String(activeShifts.length),
                  )
                : t('employer.dashboard.welcome.idle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageHelpButton
              title={t('help.employerDashboard.title')}
              intro={t('help.employerDashboard.intro')}
              sections={[
                {
                  heading: t('help.employerDashboard.section.purpose.heading'),
                  items: [t('help.employerDashboard.section.purpose.item1')],
                },
                {
                  heading: t('help.employerDashboard.section.numbers.heading'),
                  items: [
                    t('help.employerDashboard.section.numbers.item1'),
                    t('help.employerDashboard.section.numbers.item2'),
                    t('help.employerDashboard.section.numbers.item3'),
                    t('help.employerDashboard.section.numbers.item4'),
                  ],
                },
                {
                  heading: t('help.employerDashboard.section.actions.heading'),
                  items: [
                    t('help.employerDashboard.section.actions.item1'),
                    t('help.employerDashboard.section.actions.item2'),
                    t('help.employerDashboard.section.actions.item3'),
                    t('help.employerDashboard.section.actions.item4'),
                  ],
                },
                {
                  heading: t('help.employerDashboard.section.mistakes.heading'),
                  items: [
                    t('help.employerDashboard.section.mistakes.item1'),
                    t('help.employerDashboard.section.mistakes.item2'),
                    t('help.employerDashboard.section.mistakes.item3'),
                  ],
                },
              ]}
              cta={{ label: t('help.viewFullGuide'), href: '/user-guide' }}
            />
            <Link href="/employer/schedule">
              <Button size="sm" variant="secondary">
                {t('employer.dashboard.viewSchedule')}
              </Button>
            </Link>
            <Link href="/employer/shifts/new">
              <Button size="sm" variant="primary">
                {t('btn.postShift')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats — Phase 9H: each tile opens a dedicated detail modal
          (no more scroll-to-section, which was misleading when the
          target section wasn't actually on the dashboard). */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label={t('employer.dashboard.stats.activeShifts')}
          value={String(activeShifts.length)}
          tone="brand"
          icon="briefcase"
          onClick={() => setStatDetail('active')}
          ariaLabel="Xem chi tiết ca đang hoạt động"
        />
        <StatTile
          label={t('employer.dashboard.applicants')}
          value={String(pendingApps.length)}
          tone={pendingApps.length > 0 ? 'warn' : 'neutral'}
          icon="users"
          onClick={() => setStatDetail('pending')}
          ariaLabel="Xem chi tiết đơn ứng tuyển chờ duyệt"
        />
        <StatTile
          label={t('employer.dashboard.stats.postedShifts')}
          value={String(myShifts.length)}
          tone="neutral"
          icon="check"
          onClick={() => setStatDetail('posted')}
          ariaLabel="Xem chi tiết ca đã đăng"
        />
        <StatTile
          label={t('employer.dashboard.stats.completedShifts')}
          value={String(completedShifts.length)}
          tone="good"
          icon="check"
          onClick={() => setStatDetail('completed')}
          ariaLabel="Xem chi tiết ca đã hoàn thành"
        />
        <StatTile
          label={t('employer.dashboard.stats.totalDeposited')}
          value={formatVND(totalDeposited)}
          tone="neutral"
          icon="wallet"
          onClick={() => setStatDetail('payments')}
          ariaLabel="Xem tóm tắt thanh toán"
        />
        <StatTile
          label={t('employer.dashboard.stats.totalPaidOut')}
          value={formatVND(totalPaidOut)}
          tone="brand"
          icon="wallet"
          onClick={() => setStatDetail('payments')}
          ariaLabel="Xem tóm tắt thanh toán"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active shifts */}
          <section id="employer-active-shifts">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('employer.dashboard.upcomingShifts')}
              </h2>
              {activeShifts.length > 0 && (
                <Link
                  href="/employer/schedule"
                  className="text-xs font-medium text-orange-600 hover:underline"
                >
                  {t('employer.dashboard.viewSchedule')} →
                </Link>
              )}
            </div>
            {activeShifts.length === 0 ? (
              <EmptyState
                tone="warm"
                title={t('employer.dashboard.noShifts')}
                description={t('employer.dashboard.empty.upcoming.descriptionRich')}
                action={
                  <Link href="/employer/shifts/new">
                    <Button size="sm" variant="primary">
                      {t('btn.postShift')}
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeShifts.map((shift) => (
                  <Link href={`/employer/shifts/${shift.id}`} key={shift.id}>
                    <ShiftCard shift={shift} showEscrow />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Pending applications */}
          {pendingApps.length > 0 && (
            <section id="employer-pending-apps">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {t('employer.dashboard.pendingApps').replace('{count}', String(pendingApps.length))}
              </h2>
              <div className="flex flex-col gap-2">
                {pendingApps.slice(0, 5).map((a) => {
                  const shift = shifts.find((s) => s.id === a.shiftId);
                  const w = users.find((u) => u.id === a.workerId);
                  const wName = w?.role === 'worker' ? w.fullName : 'Người làm';
                  return (
                    <Card key={a.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{wName}</p>
                          <p className="truncate text-xs text-gray-500">{shift?.title ?? ''}</p>
                        </div>
                        <Link href={`/employer/shifts/${a.shiftId}`}>
                          <Badge tone="warning">{t('btn.viewDetail')}</Badge>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Side: notifications */}
        <aside>
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{t('nav.notifications')}</h2>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead(employer.id)}
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

      {/* Phase 9H — payments summary modal. Lists the actual shifts
          contributing to the deposit and payout totals so employers
          aren't staring at two opaque sums. */}
      <Modal
        open={statDetail === 'payments'}
        onClose={() => setStatDetail(null)}
        title={t('employer.payments.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.payments.title')}
            description={t('hint.employer.totalDeposited')}
            learnMoreHref="/user-guide#employer-total-deposit"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>{t('employer.payments.intro')}</p>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-orange-50 p-4 text-xs">
            <div>
              <dt className="inline-flex items-center gap-1 text-orange-700">
                <span>{t('employer.dashboard.stats.totalDeposited')}</span>
                {/* Phase 9Z-Fix-5: per-amount popover so the user can
                    deep-link to the specific guide section for the
                    deposit half of this shared modal. */}
                <HelpPopover
                  title={t('employer.dashboard.stats.totalDeposited')}
                  description={t('hint.employer.totalDeposited')}
                  learnMoreHref="/user-guide#employer-total-deposit"
                />
              </dt>
              <dd className="mt-1 text-base font-bold text-gray-900">
                {formatVND(totalDeposited)}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-orange-700">
                <span>{t('employer.dashboard.stats.totalPaidOut')}</span>
                {/* Phase 9Z-Fix-5: paid-out half — separate deep link. */}
                <HelpPopover
                  title={t('employer.dashboard.stats.totalPaidOut')}
                  description={t('hint.employer.totalPaidOut')}
                  learnMoreHref="/user-guide#employer-total-paid"
                />
              </dt>
              <dd className="mt-1 text-base font-bold text-orange-600">
                {formatVND(totalPaidOut)}
              </dd>
            </div>
            <div>
              <dt className="text-orange-700">
                {t('employer.dashboard.stats.completedShifts')}
              </dt>
              <dd className="mt-1 text-base font-bold text-emerald-600">
                {completedShifts.length}
              </dd>
            </div>
            <div>
              <dt className="text-orange-700">
                {t('employer.dashboard.stats.activeShifts')}
              </dt>
              <dd className="mt-1 text-base font-bold text-gray-900">
                {activeShifts.length}
              </dd>
            </div>
          </dl>

          {/* Recent payouts: the most-recent completed shifts that
              contributed to `totalPaidOut`. */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('employer.payments.recentTitle')}
            </p>
            {completedShifts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
                {t('employer.payments.empty')}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...completedShifts]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5)
                  .map((shift) => (
                    <li
                      key={shift.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {shift.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {formatDateVN(shift.date)} •{' '}
                          {formatTimeVN(shift.startTime)}–
                          {formatTimeVN(shift.endTime)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-orange-600">
                        {formatVND(shift.depositAmount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-500">
            {t('employer.payments.disclaimer')}
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

      {/* Phase 9H — posted-shifts modal */}
      <ShiftListModal
        open={statDetail === 'posted'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.posted.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.posted.title')}
            description={t('hint.employer.postedShifts')}
            learnMoreHref="/user-guide#employer-posted-shifts"
          />
        }
        intro={t('employer.detail.posted.intro')}
        emptyText={t('employer.detail.posted.empty')}
        shifts={[...myShifts].sort((a, b) =>
          `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`),
        )}
      />

      {/* Phase 9H — active-shifts modal */}
      <ShiftListModal
        open={statDetail === 'active'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.active.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.active.title')}
            description={t('hint.employer.activeShifts')}
            learnMoreHref="/user-guide#employer-active-shifts"
          />
        }
        intro={t('employer.detail.active.intro')}
        emptyText={t('employer.detail.active.empty')}
        shifts={[...activeShifts].sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
        )}
      />

      {/* Phase 9H — completed-shifts modal */}
      <ShiftListModal
        open={statDetail === 'completed'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.completed.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.completed.title')}
            description={t('hint.employer.completedShifts')}
            learnMoreHref="/user-guide#employer-completed-shifts"
          />
        }
        intro={t('employer.detail.completed.intro')}
        emptyText={t('employer.detail.completed.empty')}
        shifts={[...completedShifts].sort((a, b) =>
          `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`),
        )}
      />

      {/* Phase 9H — pending-applicants modal */}
      <Modal
        open={statDetail === 'pending'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.pending.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.pending.title')}
            description={t('hint.employer.pendingApps')}
            learnMoreHref="/user-guide#employer-pending-applications"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>{t('employer.detail.pending.intro')}</p>
          {pendingApps.length === 0 ? (
            <EmptyState
              tone="warm"
              title={t('employer.dashboard.empty.pending.title')}
              description={t('employer.dashboard.empty.pending.description')}
              action={
                <Link
                  href="/employer/shifts/new"
                  onClick={() => setStatDetail(null)}
                >
                  <Button size="sm" variant="primary">
                    {t('employer.dashboard.empty.pending.cta')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {pendingApps.map((a) => {
                const shift = shifts.find((s) => s.id === a.shiftId);
                const w = users.find((u) => u.id === a.workerId);
                const worker = w?.role === 'worker' ? w : null;
                const wName = worker?.fullName ?? 'Người làm';
                return (
                  <li
                    key={a.id}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {wName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {shift?.title ?? ''}
                          {shift && (
                            <>
                              {' • '}
                              {formatDateVN(shift.date)}
                            </>
                          )}
                        </p>
                        {worker && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                worker.reputationScore >= 80
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : worker.reputationScore >= 50
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700',
                              ].join(' ')}
                            >
                              {t('employer.detail.pending.repBadge').replace(
                                '{score}',
                                String(worker.reputationScore),
                              )}
                            </span>
                            {/* Phase 10A-Fix-4 — verification chips
                                derive from the LIVE verification store
                                so admin-side approvals reflect on the
                                next render. The legacy
                                `worker.verifications` array is no
                                longer the source of truth here. */}
                            <LiveVerificationChips
                              worker={worker}
                              workerDocuments={workerDocuments}
                            />
                            <span className="text-[10px] text-gray-400">
                              {t('employer.detail.pending.completedShifts').replace(
                                '{count}',
                                String(worker.completedShiftCount),
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/employer/shifts/${a.shiftId}`}
                        onClick={() => setStatDetail(null)}
                      >
                        <Badge tone="warning">{t('btn.viewDetail')}</Badge>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
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
// Phase 9H — shared shift-list modal used by posted / active / completed
// employer stat tiles. Each row links to the manage page so the employer
// can take action without losing the dashboard context.
// ---------------------------------------------------------------------------

function ShiftListModal({
  open,
  onClose,
  title,
  titleAccessory,
  intro,
  emptyText,
  shifts,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleAccessory?: ReactNode;
  intro: string;
  emptyText: string;
  shifts: Shift[];
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} titleAccessory={titleAccessory}>
      <div className="flex flex-col gap-3 text-sm text-gray-700">
        <p>{intro}</p>
        {shifts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
            {emptyText}
          </div>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {shifts.slice(0, 12).map((shift) => (
              <li
                key={shift.id}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {shift.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {formatDateVN(shift.date)} •{' '}
                      {formatTimeVN(shift.startTime)}–
                      {formatTimeVN(shift.endTime)}
                    </p>
                    {shift.location && (
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">
                        {shift.location}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ShiftStatusBadge status={shift.status} />
                    <span className="text-[11px] font-semibold text-orange-600">
                      {formatVND(shift.depositAmount)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500">
                    {shift.positionsFilled}/{shift.positionsTotal}{' '}
                    {t('employer.detail.positionsLabel')}
                  </span>
                  <Link
                    href={`/employer/shifts/${shift.id}`}
                    onClick={onClose}
                    className="text-[11px] font-medium text-orange-600 hover:underline"
                  >
                    {t('btn.viewDetail')} →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {shifts.length > 12 && (
          <p className="text-[11px] text-gray-500">
            {t('employer.detail.truncated').replace(
              '{count}',
              String(shifts.length - 12),
            )}
          </p>
        )}
        <div className="mt-1 flex justify-end">
          <Button size="sm" variant="primary" onClick={onClose}>
            {t('help.btn.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers — kept in sync with the worker dashboard StatTile.
// Phase 9Y-Fix-3: simplified back to a `<button>`-as-card when
// interactive. The Phase 9Y-Fix overlay-anchor pattern (introduced to
// allow a HelpPopover next to the label without nesting `<button>`s)
// is no longer needed because help has moved into the corresponding
// detail modal's title slot.
// ---------------------------------------------------------------------------

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
    'group relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-left w-full',
    'before:absolute before:left-0 before:top-0 before:h-1 before:w-full before:rounded-t-2xl',
    toneRing[tone],
  ].join(' ');

  const interactiveClasses = onClick
    ? 'motion-lift cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
    : '';

  const body = (
    <>
      {/* Phase 9Z-Fix-1: dropped the top-right decorative TileIcon —
          see the matching note in `src/app/worker/dashboard/page.tsx`.
          The `icon` prop is preserved for call-site compatibility but
          is intentionally a no-op. */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
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
        className={[baseClasses, interactiveClasses].join(' ')}
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

// ---------------------------------------------------------------------------
// Phase 10A-Fix-4 — live verification chips
// ---------------------------------------------------------------------------

import type { Worker, WorkerVerificationDocument } from '@/types';

function LiveVerificationChips({
  worker,
  workerDocuments,
}: {
  worker: Worker;
  workerDocuments: WorkerVerificationDocument[];
}) {
  const summary = useMemo(
    () => getWorkerVerificationSummary(worker, workerDocuments),
    [worker, workerDocuments],
  );
  return (
    <>
      {worker.verifications.includes('phone') && (
        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
          {t('verification.phone')}
        </span>
      )}
      {/* Phase 10A-Fix-5 — one chip per approved method, not just the
          most-recent primary, so an employer scanning the queue sees
          every identity proof the worker has cleared. */}
      {summary.approvedMethods.map((m) => (
        <span
          key={m.type}
          className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
        >
          Đã xác minh · {m.label}
        </span>
      ))}
      {summary.pendingCount > 0 && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          {summary.pendingCount} đang chờ duyệt
        </span>
      )}
    </>
  );
}
