'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { canCheckIn, canCheckOut } from '@/domain/timeGates';
import { averageRating } from '@/domain/rating';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
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
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const checkIn = useApplicationStore((s) => s.checkIn);
  const checkOut = useApplicationStore((s) => s.checkOut);
  const cancelByWorker = useApplicationStore((s) => s.cancelByWorker);
  const allNotifications = useNotificationStore((s) => s.notifications);
  const notifications = useMemo(
    () =>
      currentUserId
        ? allNotifications.filter((n) => n.userId === currentUserId)
        : [],
    [allNotifications, currentUserId],
  );
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const worker = asWorker(users.find((u) => u.id === currentUserId));
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Memo: applications grouped by status
  const myApps = useMemo(
    () => (worker ? applications.filter((a) => a.workerId === worker.id) : []),
    [applications, worker],
  );

  if (!worker) return null;

  // Helper to look up a shift
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const getShift = (id: string) => shiftMap.get(id);

  // Stats
  const completedShifts = myApps.filter((a) => a.status === 'Confirmed');
  const totalEarnings = completedShifts.reduce((acc, a) => acc + (a.payoutAmount ?? 0), 0);
  const avgRating = averageRating(worker.ratingsReceived);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Upcoming approved/checked-in shifts (date in future or today)
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = myApps
    .filter((a) =>
      ['Approved', 'CheckedIn', 'CheckedOut'].includes(a.status) &&
      getShift(a.shiftId) !== undefined &&
      getShift(a.shiftId)!.date >= todayStr,
    )
    .sort((a, b) => {
      const sa = getShift(a.shiftId)!;
      const sb = getShift(b.shiftId)!;
      return `${sa.date}T${sa.startTime}`.localeCompare(`${sb.date}T${sb.startTime}`);
    });

  const pending = myApps.filter((a) => a.status === 'Pending');
  const restricted = worker.reputationScore < 50;

  function handleCheckIn(appId: string) {
    setActionLoading(appId);
    checkIn(appId);
    setActionLoading(null);
  }

  function handleCheckOut(appId: string) {
    setActionLoading(appId);
    checkOut(appId);
    setActionLoading(null);
  }

  function handleCancel(appId: string) {
    setActionLoading(appId);
    cancelByWorker(appId);
    setActionLoading(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Greeting */}
      <header className="mb-6">
        <p className="text-sm text-gray-500">{t('worker.dashboard.welcome')}</p>
        <h1 className="text-2xl font-bold text-gray-900">{worker.fullName}</h1>
      </header>

      {/* Restriction banner */}
      {restricted && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('worker.dashboard.restricted')}
        </div>
      )}

      {/* Stats grid */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('worker.dashboard.stats.completedShifts')} value={String(worker.completedShiftCount)} />
        <StatCard label={t('worker.dashboard.stats.totalEarnings')} value={formatVND(totalEarnings)} highlight />
        <StatCard
          label={t('worker.dashboard.stats.reputationScore')}
          valueNode={<ReputationBadge score={worker.reputationScore} />}
        />
        <StatCard
          label={t('worker.dashboard.stats.avgRating')}
          value={avgRating === null ? t('reputation.noRatings') : `${avgRating.toFixed(1)} / 5 ⭐`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Upcoming */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t('worker.dashboard.upcomingShifts')}
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState title={t('worker.dashboard.noUpcomingShifts')} />
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
                      onCancel={() => handleCancel(a.id)}
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
              <EmptyState title={t('worker.dashboard.noApplications')} />
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
                  <li
                    key={n.id}
                    className={['px-4 py-3 text-sm', !n.read ? 'bg-orange-50' : ''].join(' ')}
                  >
                    <p className="font-medium text-gray-900">{n.title}</p>
                    <p className="mt-0.5 text-xs text-gray-600">{n.body}</p>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  valueNode,
  highlight,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <div
        className={[
          'mt-1 text-lg font-bold',
          highlight ? 'text-orange-600' : 'text-gray-900',
        ].join(' ')}
      >
        {valueNode ?? value}
      </div>
    </Card>
  );
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

function badgeToneFor(status: Application['status']): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' {
  switch (status) {
    case 'Approved': return 'success';
    case 'CheckedIn': return 'purple';
    case 'CheckedOut': return 'warning';
    case 'Confirmed': return 'success';
    case 'Pending': return 'warning';
    case 'Rejected': return 'danger';
    case 'NoShow': return 'danger';
    case 'CancelledByWorker': return 'neutral';
    default: return 'neutral';
  }
}
