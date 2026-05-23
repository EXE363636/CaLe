'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { formatVND } from '@/lib/format';
import { t } from '@/i18n/vi';

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

  const employer = asEmployer(users.find((u) => u.id === currentUserId));
  if (!employer) return null;

  const myShifts = useMemo(
    () => shifts.filter((s) => s.employerId === employer.id),
    [shifts, employer.id],
  );

  const totalDeposited = myShifts.reduce((acc, s) => acc + s.depositAmount, 0);
  const completedShifts = myShifts.filter((s) => s.status === 'Completed');
  const totalPaidOut = completedShifts.reduce((acc, s) => acc + s.depositAmount, 0);
  const activeShifts = myShifts.filter((s) =>
    ['Published', 'FullyBooked', 'InProgress', 'AwaitingConfirmation'].includes(s.status),
  );

  const pendingApps = useMemo(() => {
    const shiftIds = new Set(myShifts.map((s) => s.id));
    return applications.filter((a) => shiftIds.has(a.shiftId) && a.status === 'Pending');
  }, [applications, myShifts]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{t('employer.dashboard.title')}</p>
          <h1 className="text-2xl font-bold text-gray-900">{employer.companyName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/employer/schedule">
            <Button variant="secondary">{t('employer.dashboard.viewSchedule')}</Button>
          </Link>
          <Link href="/employer/shifts/new">
            <Button variant="primary">{t('btn.postShift')}</Button>
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label={t('employer.dashboard.stats.postedShifts')} value={String(myShifts.length)} />
        <StatCard label={t('employer.dashboard.stats.completedShifts')} value={String(completedShifts.length)} />
        <StatCard label={t('employer.dashboard.stats.totalDeposited')} value={formatVND(totalDeposited)} />
        <StatCard label={t('employer.dashboard.stats.totalPaidOut')} value={formatVND(totalPaidOut)} highlight />
        <StatCard label={t('employer.dashboard.stats.boostCredits')} value={String(employer.boostCredits)} />
        <StatCard label={t('employer.dashboard.applicants')} value={String(pendingApps.length)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active shifts */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t('employer.dashboard.upcomingShifts')}
            </h2>
            {activeShifts.length === 0 ? (
              <EmptyState title={t('employer.dashboard.noShifts')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeShifts.map((shift) => {
                  const appCount = applications.filter(
                    (a) => a.shiftId === shift.id && a.status === 'Pending',
                  ).length;
                  return (
                    <Link href={`/employer/shifts/${shift.id}`} key={shift.id}>
                      <ShiftCard shift={shift} showEscrow>
                      </ShiftCard>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending applications */}
          {pendingApps.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Đơn ứng tuyển chờ duyệt ({pendingApps.length})
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
                  <li key={n.id} className={['px-4 py-3 text-sm', !n.read ? 'bg-orange-50' : ''].join(' ')}>
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

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={['mt-1 text-lg font-bold', highlight ? 'text-orange-600' : 'text-gray-900'].join(' ')}>
        {value}
      </p>
    </Card>
  );
}
