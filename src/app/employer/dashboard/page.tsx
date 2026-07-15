'use client';

import { useMemo, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asEmployer, getWorkerReputation } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useWalletStore } from '@/stores/walletStore';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import { deriveEmployerPaidOut, sumDepositBasis } from '@/domain/finance';
import { Card, Badge, Button, EmptyState, HelpPopover, Modal, PageHelpButton } from '@/components/ui';
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { WalletPanel } from '@/components/wallet/WalletPanel';
import { DashboardNotificationCard } from '@/components/layout/DashboardNotificationCard';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useModalFromQuery } from '@/lib/useModalFromQuery';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { getUserInitials } from '@/lib/initials';
import { t } from '@/i18n/vi';
import type { Application, Shift } from '@/types';

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
  // Cluster 3 · BUG 5 (Req 2.5): subscribe to the append-only wallet ledger so
  // the employer's paid-out tile stays reactive and is derived from the single
  // money source (see `totalPaidOut` below).
  const ledger = useWalletStore((s) => s.ledger);
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

  // CORE-STABILITY-7 Part 1 — wallet-history deeplink signal (see
  // worker dashboard). Opens the WalletPanel ledger modal on a
  // `?modal=wallet` deeplink or same-route notification event (deposit
  // held, refund, wage release, top-up, withdraw).
  const [walletLedgerSignal, setWalletLedgerSignal] = useState(0);
  const openWalletHistory = useCallback(() => {
    setWalletLedgerSignal((n) => n + 1);
  }, []);

  // Phase 9L — open a stat-detail modal when arriving with a `?modal=...`
  // query param (notification deep links).
  useModalFromQuery(
    ['posted', 'active', 'pending', 'completed', 'payments', 'wallet'] as const,
    (m) => {
      if (m === 'wallet') {
        openWalletHistory();
        return;
      }
      setStatDetail(
        m as 'posted' | 'active' | 'pending' | 'completed' | 'payments',
      );
    },
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
    // CORE-STABILITY-7 Part 1 — same-route wallet-history intent.
    if (detail.modal === 'wallet') {
      openWalletHistory();
    }
  });

  const myShifts = useMemo(
    () =>
      employer
        ? shifts.filter(
            // CORE-STABILITY-8 Part 1 — Draft shifts are not real
            // shifts; exclude them from every employer dashboard
            // list / stat / calendar surface.
            (s) => s.employerId === employer.id && s.status !== 'Draft',
          )
        : [],
    [shifts, employer],
  );

  // Cluster 3 · BUG 5 (Req 2.5): source the employer money tiles from the single
  // derived money module instead of two independent reductions.
  // - "Tổng đã đảm bảo" (totalDeposited) keeps its CUMULATIVE-deposit meaning —
  //   Σ depositAmount over the employer's non-Draft shifts — via `sumDepositBasis`.
  //   That equals the previous `myShifts.reduce(...)` exactly, so the number is
  //   UNCHANGED; only its source is unified.
  // - "Tổng đã chi trả" (totalPaidOut) becomes the wages actually RELEASED from
  //   the wallet ledger for this employer's shifts (`deriveEmployerPaidOut`),
  //   rather than Σ completed `shift.depositAmount`. This legitimately CHANGES
  //   the figure for any completed shift with unfilled positions (or a partial
  //   release): the deposit basis counted positions no wage was released for,
  //   while the released-wage basis reconciles with what workers received.
  const totalDeposited = employer ? sumDepositBasis(shifts, employer.id) : 0;
  const completedShifts = myShifts.filter((s) => s.status === 'Completed');
  const totalPaidOut = employer
    ? deriveEmployerPaidOut(ledger, employer.id, { shifts, applications })
    : 0;
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
    <div className="relative isolate mx-auto flex max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      {/* Phase 9T — subtle decorative warmth anchored to the top-right
          of the dashboard. See worker dashboard for rationale. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl"
      />
      {/* Quieter — compact white "command center" header matching the
          worker dashboard: white surface, soft border, ink text, one
          orange primary CTA. Warmth comes from the page bg + white card
          (DESIGN.md: One Orange Rule / Warmth-From-Background). */}
      <header className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl font-bold text-orange-700 ring-1 ring-orange-100">
            {getUserInitials(employer.companyName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500">{t('employer.dashboard.title')}</p>
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
              {employer.companyName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
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
            <Link
              href="/employer/schedule"
              className="motion-press inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('employer.dashboard.viewSchedule')}
            </Link>
            <Link
              href="/employer/shifts/new"
              className="motion-press inline-flex min-h-[44px] items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-orange-400 hover:shadow-md active:bg-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('btn.postShift')}
            </Link>
          </div>
        </div>
      </header>

      {/* Stats — Phase 9H: each tile opens a dedicated detail modal
          (no more scroll-to-section, which was misleading when the
          target section wasn't actually on the dashboard). */}
      <section className="order-2 mb-8 mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:order-none lg:mt-0 lg:grid-cols-3">
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

      {/* Phase 10C-Stab-1 Batch 4B — wallet balance + ledger. On mobile
          this follows the work area + stats (order-3); desktop unchanged. */}
      {currentUserId && (
        <section className="order-3 mb-8 lg:order-none">
          <WalletPanel
            userId={currentUserId}
            role="employer"
            openLedgerSignal={walletLedgerSignal}
          />
        </section>
      )}

      {/* Mobile-first ordering — the work area (active shifts + pending
          applicants + notifications) leads on small screens (order-1),
          above the stats + wallet. */}
      <div className="order-1 grid gap-6 lg:order-none lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active shifts */}
          <section id="employer-active-shifts">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('employer.dashboard.upcomingShifts')}
              </h2>
              {activeShifts.length > 0 && (
                <Link
                  href="/employer/schedule"
                  className="text-xs font-medium text-orange-700 hover:underline"
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
              <div className="grid gap-4 sm:grid-cols-2">
                {activeShifts.map((shift) => (
                  <Link href={`/employer/shifts/${shift.id}`} key={shift.id}>
                    <ShiftCard shift={shift} applications={applications} showEscrow />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Pending applications */}
          {pendingApps.length > 0 && (
            <section id="employer-pending-apps">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
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
              <dd className="mt-1 text-base font-bold text-orange-700">
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
                      <span className="shrink-0 text-sm font-semibold text-orange-700">
                        {formatVND(shift.depositAmount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Phase 10A-Fix-8: employer cancellation penalty ledger.
              When the employer has cancelled a shift after at least
              one worker was approved, the deposit penalty (5/10/15%)
              is stored on the shift record. We list them here so the
              employer has a permanent ledger surface, not just a
              one-time toast. */}
          <EmployerPenaltyLedger employerShifts={myShifts} />

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
        applications={applications}
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
        applications={applications}
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
        applications={applications}
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
                // Cluster 2 · BUG 3 (Req 2.3): read the applicant's reputation
                // through the single shared source so this badge matches the
                // worker's own dashboard / trust chip. Same clamped value.
                const repScore = worker ? getWorkerReputation(worker.id) : 0;
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
                                repScore >= 80
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : repScore >= 50
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700',
                              ].join(' ')}
                            >
                              {t('employer.detail.pending.repBadge').replace(
                                '{score}',
                                String(repScore),
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
                            <span className="text-[10px] text-gray-500">
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
  applications = [],
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleAccessory?: ReactNode;
  intro: string;
  emptyText: string;
  shifts: Shift[];
  applications?: Application[];
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
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">
                        {shift.location}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ShiftLifecycleBadge shift={shift} applications={applications} />
                    <span className="text-[11px] font-semibold text-orange-700">
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
                    className="text-[11px] font-medium text-orange-700 hover:underline"
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
        // Persistent affordance (not hover-only) so touch users see the
        // tile is tappable; calm gray by default, orange on hover/focus.
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

// ---------------------------------------------------------------------------
// Phase 10A-Fix-8 — employer cancellation penalty ledger
// ---------------------------------------------------------------------------

function EmployerPenaltyLedger({
  employerShifts,
}: {
  employerShifts: Shift[];
}) {
  const penaltyEntries = useMemo(() => {
    return employerShifts
      .filter(
        (s) =>
          s.cancelledBy === 'employer' &&
          s.employerCancelledAfterApproval === true &&
          (s.employerCancellationPenaltyAmount ?? 0) > 0,
      )
      .sort((a, b) =>
        (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? ''),
      );
  }, [employerShifts]);

  if (penaltyEntries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Phí hủy ca sau khi đã duyệt người
      </p>
      <ul className="flex flex-col gap-2">
        {penaltyEntries.slice(0, 5).map((shift) => (
          <li
            key={shift.id}
            className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-red-900">
                  {shift.title}
                </p>
                <p className="mt-0.5 text-[11px] text-red-800/80">
                  {shift.cancelledAt &&
                    formatDateVN(shift.cancelledAt.slice(0, 10))}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-red-700">
                  {Math.round(
                    (shift.employerCancellationPenaltyRate ?? 0) * 100,
                  )}
                  % khoản đảm bảo thanh toán
                </p>
                <p className="text-sm font-bold text-red-800">
                  -{formatVND(shift.employerCancellationPenaltyAmount ?? 0)}
                </p>
              </div>
            </div>
            {shift.employerCancellationReason && (
              <p className="mt-1.5 text-[11px] text-red-800/90">
                Lý do: {shift.employerCancellationReason}
              </p>
            )}
            <p className="mt-0.5 text-[11px] italic text-red-700/70">
              Phí hủy do ca đã có người lao động được duyệt.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
