'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAdminStore } from '@/stores/adminStore';
import { Card, Button, Badge, Input, Textarea, PageHelpButton } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { AdminUserProfileModal } from '@/components/user/AdminUserProfileModal';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { showSuccess, showError } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND, formatDateVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Dispute, EscrowStatus, Shift, User } from '@/types';

type Tab = 'analytics' | 'users' | 'shifts' | 'disputes';

export default function AdminDashboardPage() {
  return (
    <RoleGuard role="admin">
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  useLifecycleSync();
  const [tab, setTab] = useState<Tab>('analytics');
  // Phase 9F — when the analytics StatTiles fire, they switch to a tab
  // and seed an initial filter so the panel renders the right slice.
  const [usersInitialFilter, setUsersInitialFilter] = useState<
    'all' | 'worker' | 'employer' | 'admin'
  >('all');
  const [shiftsInitialFilter, setShiftsInitialFilter] = useState<
    'all' | 'active' | 'completed' | 'disputed'
  >('all');

  // Phase 9L — notification deep links may arrive with `?tab=...` and
  // optionally `?filter=...`. Apply once on mount and strip the params
  // so refreshing or switching tabs doesn't keep snapping back.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledQuery = useRef(false);
  useEffect(() => {
    if (handledQuery.current) return;
    const qTab = searchParams.get('tab');
    const qFilter = searchParams.get('filter');
    if (!qTab && !qFilter) return;
    handledQuery.current = true;

    const validTabs: readonly Tab[] = ['analytics', 'users', 'shifts', 'disputes'];
    if (qTab && (validTabs as readonly string[]).includes(qTab)) {
      setTab(qTab as Tab);
    }
    if (qFilter) {
      if ((qTab ?? 'users') === 'users') {
        const allowed = ['all', 'worker', 'employer', 'admin'] as const;
        if ((allowed as readonly string[]).includes(qFilter)) {
          setUsersInitialFilter(qFilter as (typeof allowed)[number]);
        }
      } else if (qTab === 'shifts') {
        const allowed = ['all', 'active', 'completed', 'disputed'] as const;
        if ((allowed as readonly string[]).includes(qFilter)) {
          setShiftsInitialFilter(qFilter as (typeof allowed)[number]);
        }
      }
    }
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 9N — listen for the in-page modal/tab event so a notification
  // click from the global bell while already on `/admin/dashboard` still
  // switches tab + filter without a router round-trip.
  useDashboardModalEvents('/admin/dashboard', (detail) => {
    const validTabs: readonly Tab[] = [
      'analytics',
      'users',
      'shifts',
      'disputes',
    ];
    if (detail.tab && (validTabs as readonly string[]).includes(detail.tab)) {
      setTab(detail.tab as Tab);
      if (detail.filter) {
        if ((detail.tab ?? 'users') === 'users') {
          const allowed = ['all', 'worker', 'employer', 'admin'] as const;
          if ((allowed as readonly string[]).includes(detail.filter)) {
            setUsersInitialFilter(detail.filter as (typeof allowed)[number]);
          }
        } else if (detail.tab === 'shifts') {
          const allowed = ['all', 'active', 'completed', 'disputed'] as const;
          if ((allowed as readonly string[]).includes(detail.filter)) {
            setShiftsInitialFilter(detail.filter as (typeof allowed)[number]);
          }
        }
      }
    }
  });

  function jumpToUsers(filter: typeof usersInitialFilter) {
    setUsersInitialFilter(filter);
    setTab('users');
  }
  function jumpToShifts(filter: typeof shiftsInitialFilter) {
    setShiftsInitialFilter(filter);
    setTab('shifts');
  }
  function jumpToDisputes() {
    setTab('disputes');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('admin.dashboard.eyebrow')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('admin.dashboard.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {t('admin.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PageHelpButton
              title={t('help.adminDashboard.title')}
              intro={t('help.adminDashboard.intro')}
              items={[
                t('help.adminDashboard.item1'),
                t('help.adminDashboard.item2'),
                t('help.adminDashboard.item3'),
                t('help.adminDashboard.item4'),
              ]}
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
              </svg>
              {t('admin.dashboard.badge')}
            </span>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
        <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
          {t('admin.dashboard.tabs.analytics')}
        </TabButton>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
          {t('admin.dashboard.tabs.users')}
        </TabButton>
        <TabButton active={tab === 'shifts'} onClick={() => setTab('shifts')}>
          {t('admin.dashboard.tabs.shifts')}
        </TabButton>
        <TabButton active={tab === 'disputes'} onClick={() => setTab('disputes')}>
          {t('admin.dashboard.tabs.disputes')}
        </TabButton>
      </div>

      {tab === 'analytics' && (
        <AnalyticsPanel
          onJumpToUsers={jumpToUsers}
          onJumpToShifts={jumpToShifts}
          onJumpToDisputes={jumpToDisputes}
        />
      )}
      {tab === 'users' && <UsersPanel initialFilter={usersInitialFilter} />}
      {tab === 'shifts' && <ShiftsPanel initialFilter={shiftsInitialFilter} />}
      {tab === 'disputes' && <DisputesPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'min-h-[44px] flex-1 rounded-md px-4 text-sm font-medium transition-colors',
        active ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function AnalyticsPanel({
  onJumpToUsers,
  onJumpToShifts,
  onJumpToDisputes,
}: {
  onJumpToUsers: (filter: 'all' | 'worker' | 'employer' | 'admin') => void;
  onJumpToShifts: (filter: 'all' | 'active' | 'completed' | 'disputed') => void;
  onJumpToDisputes: () => void;
}) {
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const disputes = useApplicationStore((s) => s.disputes);

  const workerCount = users.filter((u) => u.role === 'worker').length;
  const employerCount = users.filter((u) => u.role === 'employer').length;
  const activeShifts = shifts.filter((s) =>
    ['Published', 'FullyBooked', 'InProgress', 'AwaitingConfirmation'].includes(s.status),
  ).length;
  const completedShifts = shifts.filter((s) => s.status === 'Completed').length;
  const disputedPayments = shifts.filter((s) => s.escrowStatus === 'Disputed').length;
  const openDisputes = disputes.filter((d) => d.status === 'Open').length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Tổng người dùng"
        value={String(users.length)}
        onClick={() => onJumpToUsers('all')}
        ariaLabel="Xem toàn bộ người dùng"
      />
      <StatCard
        label={t('admin.analytics.totalWorkers')}
        value={String(workerCount)}
        onClick={() => onJumpToUsers('worker')}
        ariaLabel="Lọc người lao động trong tab Người dùng"
      />
      <StatCard
        label={t('admin.analytics.totalEmployers')}
        value={String(employerCount)}
        onClick={() => onJumpToUsers('employer')}
        ariaLabel="Lọc nhà tuyển dụng trong tab Người dùng"
      />
      <StatCard
        label={t('admin.analytics.totalShifts')}
        value={String(shifts.length)}
        onClick={() => onJumpToShifts('all')}
        ariaLabel="Xem toàn bộ ca làm trong tab Ca làm"
      />
      <StatCard
        label="Ca đang hoạt động"
        value={String(activeShifts)}
        onClick={() => onJumpToShifts('active')}
        ariaLabel="Lọc ca đang hoạt động"
      />
      <StatCard
        label={t('admin.analytics.completedShifts')}
        value={String(completedShifts)}
        onClick={() => onJumpToShifts('completed')}
        ariaLabel="Lọc ca đã hoàn thành"
      />
      <StatCard
        label="Thanh toán đang tranh chấp"
        value={String(disputedPayments)}
        highlight
        onClick={() => onJumpToShifts('disputed')}
        ariaLabel="Lọc ca có thanh toán tranh chấp"
      />
      <StatCard
        label={t('admin.analytics.activeDisputes')}
        value={String(openDisputes)}
        onClick={onJumpToDisputes}
        ariaLabel="Mở tab Tranh chấp"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  onClick,
  ariaLabel,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const baseClasses = [
    'group relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-left w-full',
    onClick
      ? 'motion-lift cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
      : '',
  ].join(' ');

  const body = (
    <>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={[
          'mt-1 text-xl font-bold',
          highlight ? 'text-red-600' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </p>
      {onClick && (
        <span
          aria-hidden="true"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
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
        className={baseClasses}
      >
        {body}
      </button>
    );
  }
  return <div className={baseClasses}>{body}</div>;
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersPanel({
  initialFilter = 'all',
  helpButton,
}: {
  initialFilter?: 'all' | 'worker' | 'employer' | 'admin';
  helpButton?: React.ReactNode;
}) {
  const users = useUserStore((s) => s.users);
  const suspend = useAdminStore((s) => s.suspend);
  const reactivate = useAdminStore((s) => s.reactivate);
  const currentAdminId = useAuthStore((s) => s.currentUserId);

  const [filter, setFilter] = useState<'all' | 'worker' | 'employer' | 'admin'>(
    initialFilter,
  );
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Phase 9F — explicit sort field + direction. `joinedAt` falls back to
  // `id` because the user record has no createdAt; the id ordering is
  // stable across reloads since seed data uses zero-padded suffixes.
  type SortField = 'name' | 'role' | 'reputation' | 'status' | 'joined';
  const [sortField, setSortField] = useState<SortField>('reputation');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const base = filter === 'all' ? users : users.filter((u) => u.role === filter);
    const sorted = [...base];

    function compare(a: typeof users[number], b: typeof users[number]): number {
      switch (sortField) {
        case 'name': {
          const an = (a.role === 'worker' ? a.fullName : a.role === 'employer' ? a.companyName : a.fullName) ?? '';
          const bn = (b.role === 'worker' ? b.fullName : b.role === 'employer' ? b.companyName : b.fullName) ?? '';
          return an.localeCompare(bn, 'vi');
        }
        case 'role': {
          const w = (r: typeof a.role) => (r === 'worker' ? 0 : r === 'employer' ? 1 : 2);
          return w(a.role) - w(b.role);
        }
        case 'reputation': {
          const ra = a.role === 'worker' ? a.reputationScore : -1;
          const rb = b.role === 'worker' ? b.reputationScore : -1;
          return ra - rb;
        }
        case 'status': {
          // Active first when ascending; suspended first when descending.
          return Number(!!a.suspended) - Number(!!b.suspended);
        }
        case 'joined':
        default:
          return a.id.localeCompare(b.id);
      }
    }

    sorted.sort((a, b) => {
      const cmp = compare(a, b);
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return a.id.localeCompare(b.id);
    });
    return sorted;
  }, [users, filter, sortField, sortDir]);

  // Profile modal subject — resolved from the live user list so suspend /
  // reactivate / reputation-adjust actions taken from the row are
  // immediately reflected in the open modal.
  const profileUser = useMemo(
    () => (profileUserId ? users.find((u) => u.id === profileUserId) ?? null : null),
    [users, profileUserId],
  );

  // Helpers that surface error messages on failure
  function handleSuspend(userId: string) {
    setActionError(null);
    const result = suspend(userId);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setActionError(message);
      showError(message);
    } else {
      showSuccess(t('feedback.admin.suspend.success'));
    }
  }
  function handleReactivate(userId: string) {
    setActionError(null);
    const result = reactivate(userId);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setActionError(message);
      showError(message);
    } else {
      showSuccess(t('feedback.admin.reactivate.success'));
    }
  }

  // Count of currently active admins — used to disable the suspend button
  // for the last-active admin defensively in the UI.
  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && !u.suspended).length,
    [users],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'worker', 'employer', 'admin'] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={filter === r ? 'primary' : 'ghost'}
            onClick={() => setFilter(r)}
          >
            {r === 'all' ? 'Tất cả' : t(`role.${r}`)}
          </Button>
        ))}
      </div>

      {/* Action error toast */}
      {actionError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Sort controls — Phase 9F */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-gray-700">
            {t('admin.user.sortField')}
          </span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as typeof sortField)}
            className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <option value="name">{t('admin.user.sortField.name')}</option>
            <option value="role">{t('admin.user.sortField.role')}</option>
            <option value="reputation">
              {t('admin.user.sortField.reputation')}
            </option>
            <option value="status">{t('admin.user.sortField.status')}</option>
            <option value="joined">{t('admin.user.sortField.joined')}</option>
          </select>
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="border border-gray-300 bg-white"
          aria-label={
            sortDir === 'asc'
              ? t('admin.user.sortDir.toDesc')
              : t('admin.user.sortDir.toAsc')
          }
        >
          {sortDir === 'asc'
            ? `${t('admin.user.sortDir.asc')} ↑`
            : `${t('admin.user.sortDir.desc')} ↓`}
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.id === currentAdminId}
            isLastActiveAdmin={
              user.role === 'admin' && !user.suspended && activeAdminCount <= 1
            }
            adjusting={adjustingId === user.id}
            onAdjust={() => setAdjustingId(user.id)}
            onCancelAdjust={() => setAdjustingId(null)}
            onSuspend={() => handleSuspend(user.id)}
            onReactivate={() => handleReactivate(user.id)}
            onOpenProfile={() => setProfileUserId(user.id)}
          />
        ))}
      </ul>

      {/* Shared profile modal — opens for any user the admin clicks. */}
      <AdminUserProfileModal
        open={profileUser !== null}
        onClose={() => setProfileUserId(null)}
        user={profileUser}
        isSelf={profileUser?.id === currentAdminId}
      />
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  isLastActiveAdmin,
  adjusting,
  onAdjust,
  onCancelAdjust,
  onSuspend,
  onReactivate,
  onOpenProfile,
}: {
  user: User;
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  adjusting: boolean;
  onAdjust: () => void;
  onCancelAdjust: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onOpenProfile: () => void;
}) {
  const adjustReputation = useAdminStore((s) => s.adjustReputation);
  // Worker-only row state. For non-workers `currentScore` is always 0; the
  // adjust UI is hidden anyway so the value is unused.
  const currentScore = user.role === 'worker' ? user.reputationScore : 0;
  const [newScore, setNewScore] = useState<number>(currentScore);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const displayName =
    user.role === 'worker'
      ? user.fullName
      : user.role === 'employer'
        ? user.companyName
        : user.fullName;

  function handleStartAdjust() {
    setNewScore(currentScore);
    setReason('');
    setFormError(null);
    onAdjust();
  }

  function handleCancelAdjust() {
    setReason('');
    setFormError(null);
    onCancelAdjust();
  }

  function handleSubmitAdjust() {
    setFormError(null);
    const trimmed = reason.trim();
    if (trimmed === '') {
      const message = t('admin.error.REASON_REQUIRED');
      setFormError(message);
      showError(message);
      return;
    }
    if (
      Number.isNaN(newScore) ||
      !Number.isFinite(newScore) ||
      newScore < 0 ||
      newScore > 100
    ) {
      const message = t('admin.user.scoreOutOfRange');
      setFormError(message);
      showError(message);
      return;
    }
    const result = adjustReputation(user.id, newScore, trimmed);
    if (!result.ok) {
      // Map admin store errors to localized messages; fall back to generic.
      const message = toastFromStoreError(result.error);
      setFormError(message);
      showError(message);
      return;
    }
    showSuccess(t('feedback.admin.reputationAdjust.success'));
    setReason('');
    handleCancelAdjust();
  }

  // Suspending myself or the last active admin is forbidden — hide the
  // suspend button entirely so admins don't lock themselves out.
  const canSuspend = !isSelf && !isLastActiveAdmin;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-left text-orange-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
            >
              {displayName}
            </button>
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({t(`role.${user.role}`)})
            </span>
            {isSelf && (
              <Badge tone="info" className="ml-2">
                {t('admin.user.currentAccount')}
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>

        {user.role === 'worker' && <ReputationBadge score={user.reputationScore} />}

        {user.suspended ? (
          <Badge tone="danger">Tạm khoá</Badge>
        ) : (
          <Badge tone="success">Hoạt động</Badge>
        )}

        <div className="flex gap-2">
          {user.role === 'worker' && !adjusting && (
            <Button size="sm" variant="ghost" onClick={handleStartAdjust}>
              {t('btn.adjustReputation')}
            </Button>
          )}
          {user.suspended ? (
            <Button size="sm" variant="secondary" onClick={onReactivate}>
              {t('btn.reactivate')}
            </Button>
          ) : (
            canSuspend && (
              <Button size="sm" variant="danger" onClick={onSuspend}>
                {t('btn.suspend')}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Reputation adjust form — admin sets the FINAL score in [0, 100],
          not a delta. Reason is required.

          Phase 9K layout fix: switched from a single `flex flex-wrap`
          row (which left the score and reason inputs misaligned because
          the score field's hint text added extra vertical space below
          it) to a clean 2-column responsive grid. Each column owns its
          input + hint/error so column heights stay aligned.
            * mobile  (`grid-cols-1`) — score above reason, both full-width
            * sm+     (`grid-cols-2`) — side-by-side, balanced
          Both inputs carry hint text so the columns feel symmetric.
          The submit/cancel buttons live in a separate row below. */}
      {adjusting && user.role === 'worker' && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500">
            {t('admin.user.currentScore')}: <strong>{currentScore}</strong>
          </p>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <Input
              label={t('admin.user.newScore')}
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder={t('admin.user.newScore.placeholder')}
              hint={t('admin.user.newScore.hint')}
              value={Number.isFinite(newScore) ? newScore : ''}
              error={
                !Number.isNaN(newScore) &&
                Number.isFinite(newScore) &&
                (newScore < 0 || newScore > 100)
                  ? t('admin.user.scoreOutOfRange')
                  : undefined
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setNewScore(NaN);
                  return;
                }
                const parsed = Number(raw);
                setNewScore(parsed);
              }}
              required
            />
            <Input
              label={t('form.reasonNote')}
              placeholder={t('admin.user.reasonNote.placeholder')}
              hint={t('admin.user.reasonNote.hint')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          {formError && (
            <p role="alert" className="text-xs text-red-600">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancelAdjust}>
              {t('btn.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmitAdjust}
              disabled={
                reason.trim() === '' ||
                Number.isNaN(newScore) ||
                !Number.isFinite(newScore) ||
                newScore < 0 ||
                newScore > 100
              }
            >
              {t('btn.save')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shifts tab
// ---------------------------------------------------------------------------

function ShiftsPanel({
  initialFilter = 'all',
}: {
  initialFilter?: 'all' | 'active' | 'completed' | 'disputed';
}) {
  const shifts = useShiftStore((s) => s.shifts);
  const lastSyncAt = useShiftStore((s) => s.lastLifecycleSyncAt);
  const users = useUserStore((s) => s.users);

  const [filter, setFilter] = useState<typeof initialFilter>(initialFilter);

  // Phase 9F — filter the visible list according to the active chip.
  // Sort by createdAt desc (recent first) within the filtered slice.
  const sorted = useMemo(() => {
    const filtered = shifts.filter((s) => {
      switch (filter) {
        case 'active':
          return ['Published', 'FullyBooked', 'InProgress', 'AwaitingConfirmation'].includes(
            s.status,
          );
        case 'completed':
          return s.status === 'Completed';
        case 'disputed':
          return s.escrowStatus === 'Disputed';
        case 'all':
        default:
          return true;
      }
    });
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [shifts, filter]);

  return (
    <div className="flex flex-col gap-3">
      {/* Filter chips — Phase 9F */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'active', 'completed', 'disputed'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'primary' : 'ghost'}
            onClick={() => setFilter(f)}
          >
            {t(`admin.shifts.filter.${f}`)}
          </Button>
        ))}
      </div>

      {/* Phase 7: explainer banner — clarifies that statuses move
          automatically and that Override is for exceptional cases. */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p>{t('admin.shifts.autoNote')}</p>
        {lastSyncAt && (
          <p className="mt-1 text-xs text-blue-700">
            {t('admin.shifts.lastSync').replace(
              '{when}',
              formatSyncTime(lastSyncAt),
            )}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {sorted.slice(0, 50).map((shift) => {
          const employer = users.find((u) => u.id === shift.employerId);
          const employerName = employer?.role === 'employer' ? employer.companyName : 'Unknown';
          return <ShiftRow key={shift.id} shift={shift} employerName={employerName} />;
        })}
      </ul>
    </div>
  );
}

/**
 * Format an ISO sync timestamp as a short Vietnamese-style time. Falls
 * back to the raw value on parse failure.
 */
function formatSyncTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return (
    `${pad(d.getHours())}:${pad(d.getMinutes())} ` +
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  );
}

const ESCROW_OPTIONS: EscrowStatus[] = [
  'PendingDeposit',
  'Deposited',
  'InProgress',
  'Completed',
  'Released',
  'Disputed',
  'Refunded',
];

function ShiftRow({ shift, employerName }: { shift: Shift; employerName: string }) {
  const overrideEscrow = useAdminStore((s) => s.overrideEscrow);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<EscrowStatus>(shift.escrowStatus);
  const [note, setNote] = useState('');

  function handleOverride() {
    if (note.trim() === '' || target === shift.escrowStatus) return;
    const result = overrideEscrow(shift.id, target, note.trim());
    setEditing(false);
    setNote('');
    if (result.ok) {
      showSuccess(t('feedback.admin.escrow.override.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {/* Phase 9P — title is now a link to the public shift detail
              so admins can inspect the full record (description,
              applicants, etc.) without going through the override
              flow. The page already handles the admin viewer branch. */}
          <Link
            href={`/shifts/${shift.id}`}
            className="block truncate text-sm font-semibold text-gray-900 hover:text-orange-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:rounded"
          >
            {shift.title}
          </Link>
          <p className="truncate text-xs text-gray-500">
            {employerName} • {formatDateVN(shift.date)} •{' '}
            {shift.positionsFilled}/{shift.positionsTotal} •{' '}
            {formatVND(shift.depositAmount)}
          </p>
        </div>
        <ShiftStatusBadge status={shift.status} />
        <EscrowStatusBadge status={shift.escrowStatus} />
        {!editing && (
          <>
            <Link href={`/shifts/${shift.id}`}>
              <Button size="sm" variant="ghost">
                {t('btn.viewDetail')}
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {t('admin.shifts.override')}
            </Button>
          </>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-gray-700">Trạng thái mới</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as EscrowStatus)}
                className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm"
              >
                {ESCROW_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`escrow.${opt}`)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label={t('form.reasonNote')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 min-w-[200px]"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('btn.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOverride}
              disabled={note.trim() === '' || target === shift.escrowStatus}
            >
              {t('btn.save')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Disputes tab
// ---------------------------------------------------------------------------

function DisputesPanel() {
  const disputes = useApplicationStore((s) => s.disputes);
  const shifts = useShiftStore((s) => s.shifts);
  const users = useUserStore((s) => s.users);
  const applications = useApplicationStore((s) => s.applications);

  // Sort: open first, then resolved by recency
  const sorted = useMemo(() => {
    return [...disputes].sort((a, b) => {
      if (a.status === 'Open' && b.status !== 'Open') return -1;
      if (a.status !== 'Open' && b.status === 'Open') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [disputes]);

  if (sorted.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-gray-400">
          Chưa có tranh chấp nào.
        </p>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((d) => {
        const shift = shifts.find((s) => s.id === d.shiftId);
        const app = applications.find((a) => a.id === d.applicationId);
        const worker = app ? users.find((u) => u.id === app.workerId) : null;
        const employer = shift ? users.find((u) => u.id === shift.employerId) : null;
        const workerName = worker?.role === 'worker' ? worker.fullName : '—';
        const employerName = employer?.role === 'employer' ? employer.companyName : '—';
        return (
          <DisputeRow
            key={d.id}
            dispute={d}
            shiftTitle={shift?.title ?? '—'}
            workerName={workerName}
            employerName={employerName}
          />
        );
      })}
    </ul>
  );
}

function DisputeRow({
  dispute,
  shiftTitle,
  workerName,
  employerName,
}: {
  dispute: Dispute;
  shiftTitle: string;
  workerName: string;
  employerName: string;
}) {
  const resolveDispute = useAdminStore((s) => s.resolveDispute);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<'ResolvedReleased' | 'ResolvedRefunded'>(
    'ResolvedReleased',
  );

  function handleResolve() {
    if (note.trim() === '') return;
    const result = resolveDispute(dispute.id, outcome, note.trim());
    setResolving(false);
    setNote('');
    if (result.ok) {
      showSuccess(t('feedback.admin.dispute.resolve.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{shiftTitle}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {employerName} ↔ {workerName} • {formatDateVN(dispute.createdAt)}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            <span className="font-medium">Lý do:</span> {dispute.reason}
          </p>
          {dispute.resolutionNote && (
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium">Giải quyết:</span> {dispute.resolutionNote}
            </p>
          )}
        </div>

        {dispute.status === 'Open' ? (
          <Badge tone="warning">{t('dispute.status.Open')}</Badge>
        ) : (
          <Badge tone={dispute.status === 'ResolvedReleased' ? 'success' : 'neutral'}>
            {t(`dispute.status.${dispute.status}`)}
          </Badge>
        )}
      </div>

      {/* Resolve action — only for Open disputes */}
      {dispute.status === 'Open' && (
        <div className="mt-3">
          {!resolving ? (
            <Button size="sm" variant="primary" onClick={() => setResolving(true)}>
              {t('btn.resolveDispute')}
            </Button>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={outcome === 'ResolvedReleased' ? 'primary' : 'secondary'}
                  onClick={() => setOutcome('ResolvedReleased')}
                >
                  Thanh toán cho người làm
                </Button>
                <Button
                  size="sm"
                  variant={outcome === 'ResolvedRefunded' ? 'primary' : 'secondary'}
                  onClick={() => setOutcome('ResolvedRefunded')}
                >
                  Hoàn tiền cho nhà tuyển dụng
                </Button>
              </div>
              <Textarea
                label={t('form.resolutionNote')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                required
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setResolving(false)}>
                  {t('btn.cancel')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleResolve}
                  disabled={note.trim() === ''}
                >
                  {t('btn.confirm')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
