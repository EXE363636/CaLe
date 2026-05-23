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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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

      {/* Stats — Phase 9 polish: StatTile with semantic accent strips */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label={t('employer.dashboard.stats.activeShifts')}
          value={String(activeShifts.length)}
          tone="brand"
          icon="briefcase"
        />
        <StatTile
          label={t('employer.dashboard.applicants')}
          value={String(pendingApps.length)}
          tone={pendingApps.length > 0 ? 'warn' : 'neutral'}
          icon="users"
        />
        <StatTile
          label={t('employer.dashboard.stats.postedShifts')}
          value={String(myShifts.length)}
          tone="neutral"
          icon="check"
        />
        <StatTile
          label={t('employer.dashboard.stats.completedShifts')}
          value={String(completedShifts.length)}
          tone="good"
          icon="check"
        />
        <StatTile
          label={t('employer.dashboard.stats.totalDeposited')}
          value={formatVND(totalDeposited)}
          tone="neutral"
          icon="wallet"
        />
        <StatTile
          label={t('employer.dashboard.stats.totalPaidOut')}
          value={formatVND(totalPaidOut)}
          tone="brand"
          icon="wallet"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active shifts */}
          <section>
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
                description={t('employer.dashboard.noShifts.hint')}
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
            <section>
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

// ---------------------------------------------------------------------------
// Helpers — kept in sync with the worker dashboard StatTile.
// ---------------------------------------------------------------------------

type Tone = 'brand' | 'neutral' | 'good' | 'warn' | 'bad';
type IconName = 'star' | 'check' | 'wallet' | 'calendar' | 'briefcase' | 'users' | 'shield';

function StatTile({
  label,
  value,
  suffix,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: Tone;
  icon?: IconName;
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
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm',
        'before:absolute before:left-0 before:top-0 before:h-1 before:w-full',
        toneRing[tone],
      ].join(' ')}
    >
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
    </div>
  );
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
