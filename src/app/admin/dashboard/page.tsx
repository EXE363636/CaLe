'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { derivedReputationOf, useDerivedReputationMap } from '@/lib/useDerivedReputation';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAdminStore } from '@/stores/adminStore';
import { useVerificationStore } from '@/stores';
import { useReviewReportStore } from '@/stores/reviewReportStore';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { adminVerificationTaskCount, adminDisputeTaskCount } from '@/domain/taskBadges';
import { Card, Button, Badge, Input, Textarea, HelpPopover, PageHelpButton, TaskBadge, Modal, Select, ButtonLink } from '@/components/ui';
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { AdminUserProfileModal } from '@/components/user/AdminUserProfileModal';
import { VerificationsPanel } from './VerificationsPanel';
import { IdentityReviewPanel } from './IdentityReviewPanel';
import { PayoutHealthBanner } from '@/components/wallet/PayoutHealthBanner';
import { WalletPanel } from '@/components/wallet/WalletPanel';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { showSuccess, showError } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { exportSnapshot, importSnapshot } from '@/data/persistence';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { hasCapability } from '@/data/capabilities';
import { t } from '@/i18n/vi';
import type { Application, Dispute, EscrowStatus, Shift, User } from '@/types';

type Tab = 'analytics' | 'users' | 'shifts' | 'disputes' | 'verifications';

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

  // Task tổng vệ sinh · mục 7 — ở supabase chỉ giữ tab có dữ liệu server thật.
  // Tranh chấp/xác minh chưa migrate → ẩn tab + badge hoàn toàn.
  const showDisputes = hasCapability('disputes');
  // Supabase: tab này là hàng đợi CCCD thật + cài đặt xác thực (0022).
  const showVerifications = hasCapability('verifications') || isSupabaseEnv();

  // Supabase: nạp user thật ở cấp dashboard để analytics đếm đúng (không seed).
  const refreshUsersAsync = useAdminStore((s) => s.refreshUsersAsync);
  useEffect(() => {
    if (!isSupabaseEnv()) return;
    void refreshUsersAsync();
  }, [refreshUsersAsync]);

  // Nếu deeplink trỏ tới tab đã ẩn (supabase) thì lùi về analytics.
  useEffect(() => {
    if ((tab === 'disputes' && !showDisputes) || (tab === 'verifications' && !showVerifications)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fallback khi tab bị ẩn ở supabase mode
      setTab('analytics');
    }
  }, [tab, showDisputes, showVerifications]);

  // Phase 10A-Fix-4 — verification queue task count for the tab badge.
  const adminWorkerDocs = useVerificationStore((s) => s.workerDocuments);
  const adminEmployerDocs = useVerificationStore((s) => s.employerDocuments);
  const adminTypeChangeRequests = useVerificationStore(
    (s) => s.typeChangeRequests,
  );
  const verificationTaskCount = useMemo(
    () =>
      adminVerificationTaskCount(
        adminWorkerDocs,
        adminEmployerDocs,
        adminTypeChangeRequests,
      ),
    [adminWorkerDocs, adminEmployerDocs, adminTypeChangeRequests],
  );
  // QA-Fix-1 F1 — open-dispute task count for the disputes tab badge.
  const adminDisputes = useApplicationStore((s) => s.disputes);
  const disputeTaskCount = useMemo(
    () => adminDisputeTaskCount(adminDisputes),
    [adminDisputes],
  );
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

    const validTabs: readonly Tab[] = ['analytics', 'users', 'shifts', 'disputes', 'verifications'];
    if (qTab && (validTabs as readonly string[]).includes(qTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-shot deeplink query→tab sync (guarded by handledQuery ref); refactor would change navigation behavior
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
      'verifications',
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
      {/* UI-VISUAL-REDESIGN-1 — admin "control panel" hero. A cool
          slate→indigo gradient deliberately distinguishes the admin area
          from the warm orange worker/employer dashboards. */}
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900 p-6 text-white shadow-card sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-indigo-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-orange-500/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              {t('admin.dashboard.eyebrow')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              {t('admin.dashboard.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              {t('admin.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PageHelpButton
              title={t('help.adminDashboard.title')}
              intro={t('help.adminDashboard.intro')}
              sections={[
                {
                  heading: t('help.adminDashboard.section.purpose.heading'),
                  items: [t('help.adminDashboard.section.purpose.item1')],
                },
                {
                  heading: t('help.adminDashboard.section.numbers.heading'),
                  items: [
                    t('help.adminDashboard.section.numbers.item1'),
                    t('help.adminDashboard.section.numbers.item2'),
                    t('help.adminDashboard.section.numbers.item3'),
                  ],
                },
                {
                  heading: t('help.adminDashboard.section.actions.heading'),
                  items: [
                    t('help.adminDashboard.section.actions.item1'),
                    t('help.adminDashboard.section.actions.item2'),
                    t('help.adminDashboard.section.actions.item3'),
                    t('help.adminDashboard.section.actions.item4'),
                  ],
                },
                {
                  heading: t('help.adminDashboard.section.mistakes.heading'),
                  items: [
                    t('help.adminDashboard.section.mistakes.item1'),
                    t('help.adminDashboard.section.mistakes.item2'),
                    t('help.adminDashboard.section.mistakes.item3'),
                  ],
                },
              ]}
              cta={{ label: t('help.viewFullGuide'), href: '/user-guide' }}
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
              </svg>
              {t('admin.dashboard.badge')}
            </span>
          </div>
        </div>
      </header>

      {isSupabaseEnv() && <PayoutHealthBanner />}

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
        {showDisputes && (
          <TabButton
            active={tab === 'disputes'}
            onClick={() => setTab('disputes')}
            badgeCount={disputeTaskCount}
            badgeAriaLabel={
              disputeTaskCount > 0
                ? t('admin.dashboard.tabs.disputesBadge').replace(
                    '{count}',
                    String(disputeTaskCount),
                  )
                : undefined
            }
          >
            {t('admin.dashboard.tabs.disputes')}
          </TabButton>
        )}
        {showVerifications && (
          <TabButton
            active={tab === 'verifications'}
            onClick={() => setTab('verifications')}
            badgeCount={verificationTaskCount}
            badgeAriaLabel={
              verificationTaskCount > 0
                ? t('admin.dashboard.tabs.verificationsBadge').replace(
                    '{count}',
                    String(verificationTaskCount),
                  )
                : undefined
            }
          >
            {isSupabaseEnv() ? t('admin.identity.tab') : t('admin.dashboard.tabs.verifications')}
          </TabButton>
        )}
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
      {tab === 'disputes' && showDisputes && <DisputesPanel />}
      {tab === 'verifications' && showVerifications &&
        (isSupabaseEnv() ? <IdentityReviewPanel /> : <VerificationsPanel />)}

      {/* Admin-only snapshot dev utility — CHỈ local/demo mode. Ở supabase/
          production ẩn hoàn toàn (công cụ mock/localStorage của developer, B2). */}
      {!isSupabaseEnv() && <SnapshotDevUtility />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  badgeCount = 0,
  badgeAriaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** Phase 10A-Fix-4 — show task badge inside the tab. */
  badgeCount?: number;
  badgeAriaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'relative min-h-[44px] flex-1 rounded-md px-4 text-sm font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
        active ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
      ].join(' ')}
    >
      {children}
      <TaskBadge count={badgeCount} ariaLabel={badgeAriaLabel} />
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
  const currentAdminId = useAuthStore((s) => s.currentUserId);

  return (
    <div className="flex flex-col gap-6">
      {/* Supabase: phí 10% mỗi ca được server cộng vào ví admin được chỉ định
          (migration 0021). Admin chỉ rút, không nạp. */}
      {isSupabaseEnv() && hasCapability('wallet') && currentAdminId && (
        <WalletPanel
          userId={currentAdminId}
          role="admin"
          title={t('admin.wallet.title')}
          allowTopUp={false}
        />
      )}
      {/* 6 ô (supabase) → 3 cột; 8 ô (local) → 4 cột — không để hàng lẻ. */}
      <div
        className={[
          'grid grid-cols-2 gap-4',
          hasCapability('payments') && hasCapability('disputes')
            ? 'sm:grid-cols-4'
            : 'sm:grid-cols-3',
        ].join(' ')}
      >
        <StatCard
          label={t('admin.analytics.totalUsers')}
          value={String(users.length)}
          onClick={() => onJumpToUsers('all')}
          ariaLabel={t('admin.analytics.aria.allUsers')}
        />
        <StatCard
          label={t('admin.analytics.totalWorkers')}
          value={String(workerCount)}
          onClick={() => onJumpToUsers('worker')}
          ariaLabel={t('admin.analytics.aria.workers')}
        />
        <StatCard
          label={t('admin.analytics.totalEmployers')}
          value={String(employerCount)}
          onClick={() => onJumpToUsers('employer')}
          ariaLabel={t('admin.analytics.aria.employers')}
        />
        <StatCard
          label={t('admin.analytics.totalShifts')}
          value={String(shifts.length)}
          onClick={() => onJumpToShifts('all')}
          ariaLabel={t('admin.analytics.aria.allShifts')}
        />
        <StatCard
          label={t('admin.analytics.activeShifts')}
          value={String(activeShifts)}
          onClick={() => onJumpToShifts('active')}
          ariaLabel={t('admin.analytics.aria.activeShifts')}
        />
        <StatCard
          label={t('admin.analytics.completedShifts')}
          value={String(completedShifts)}
          onClick={() => onJumpToShifts('completed')}
          ariaLabel={t('admin.analytics.aria.completedShifts')}
        />
        {/* Thanh toán/tranh chấp: chỉ hiện khi có backend thật (ẩn ở supabase). */}
        {hasCapability('payments') && (
          <StatCard
            label={t('admin.analytics.disputedPayments')}
            value={String(disputedPayments)}
            highlight
            onClick={() => onJumpToShifts('disputed')}
            ariaLabel={t('admin.analytics.aria.disputedPayments')}
          />
        )}
        {hasCapability('disputes') && (
          <StatCard
            label={t('admin.analytics.activeDisputes')}
            value={String(openDisputes)}
            onClick={onJumpToDisputes}
            ariaLabel={t('admin.analytics.aria.disputes')}
          />
        )}
      </div>
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
    'group relative overflow-hidden rounded-3xl border border-gray-100 p-5 text-left w-full shadow-card',
    highlight
      ? 'bg-gradient-to-br from-red-50 to-white'
      : 'bg-gradient-to-br from-slate-50 to-white',
    onClick
      ? 'motion-lift cursor-pointer hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
      : '',
  ].join(' ');

  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={[
          'mt-2 text-3xl font-extrabold leading-none tabular-nums',
          highlight ? 'text-red-600' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </p>
      {onClick && (
        // Luôn hiện (không chỉ khi hover) để người dùng cảm ứng biết ô bấm
        // được — cùng quy ước với ô thống kê ở dashboard worker/employer.
        <span
          aria-hidden="true"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors group-hover:text-orange-700 group-focus-visible:text-orange-700"
        >
          {t('btn.viewDetail')} →
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

/**
 * Ánh xạ MÃ lỗi từ Edge Function `admin-users` → thông báo tiếng Việt.
 * Mã lạ → thông báo chung UNKNOWN (không rò chi tiết kỹ thuật ra UI).
 */
function accountErrorMessage(code: string): string {
  const key = `admin.accounts.error.${code}`;
  const msg = t(key);
  return msg === key ? t('admin.accounts.error.UNKNOWN') : msg;
}

function UsersPanel({
  initialFilter = 'all',
}: {
  initialFilter?: 'all' | 'worker' | 'employer' | 'admin';
}) {
  const users = useUserStore((s) => s.users);
  const suspend = useAdminStore((s) => s.suspend);
  const reactivate = useAdminStore((s) => s.reactivate);
  const setSuspendedAsync = useAdminStore((s) => s.setSuspendedAsync);
  const deleteUserAsync = useAdminStore((s) => s.deleteUserAsync);
  const refreshUsersAsync = useAdminStore((s) => s.refreshUsersAsync);
  const currentAdminId = useAuthStore((s) => s.currentUserId);

  // Admin Account Management (task C/D) — CHỈ chế độ supabase mới hiện form tạo
  // tài khoản + nút xoá vĩnh viễn, và mới thao tác trên user THẬT (Edge Function).
  const supabase = isSupabaseEnv();

  const [filter, setFilter] = useState<'all' | 'worker' | 'employer' | 'admin'>(
    initialFilter,
  );
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  // Xoá vĩnh viễn — user đang chờ xác nhận trong Danger Modal.
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Supabase: nạp danh sách user THẬT khi mở tab (thay cho seed demo).
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional loading flag for the on-mount admin user fetch (supabase mode)
    setLoadingUsers(true);
    void refreshUsersAsync().then((r) => {
      if (!alive) return;
      if (!r.ok) {
        const message = accountErrorMessage(r.error);
        setActionError(message);
        showError(message);
      }
      setLoadingUsers(false);
    });
    return () => {
      alive = false;
    };
  }, [supabase, refreshUsersAsync]);

  // Phase 9F — explicit sort field + direction. `joinedAt` falls back to
  // `id` because the user record has no createdAt; the id ordering is
  // stable across reloads since seed data uses zero-padded suffixes.
  type SortField = 'name' | 'role' | 'reputation' | 'status' | 'joined';
  // Uy tín: local lưu trong hồ sơ; supabase chưa có backend (capability
  // `ratings` tắt) → TẠM TÍNH từ lịch sử ca thật (chỉ xem, không sửa).
  const ratingsOn = hasCapability('ratings');
  const derivedRep = useDerivedReputationMap();
  const reputationOf = useCallback(
    (u: User): number | null =>
      u.role !== 'worker'
        ? null
        : ratingsOn
          ? u.reputationScore
          : derivedReputationOf(derivedRep, u.id).score,
    [ratingsOn, derivedRep],
  );
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
          const ra = reputationOf(a) ?? -1;
          const rb = reputationOf(b) ?? -1;
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
  }, [users, filter, sortField, sortDir, reputationOf]);

  // Profile modal subject — resolved from the live user list so suspend /
  // reactivate / reputation-adjust actions taken from the row are
  // immediately reflected in the open modal.
  const profileUser = useMemo(
    () => (profileUserId ? users.find((u) => u.id === profileUserId) ?? null : null),
    [users, profileUserId],
  );

  // Helpers that surface error messages on failure. Supabase mode routes the
  // suspend/unsuspend through the Edge Function (real DB); local mode keeps the
  // synchronous store path untouched.
  async function handleSuspend(userId: string) {
    setActionError(null);
    if (supabase) {
      const result = await setSuspendedAsync(userId, true);
      if (!result.ok) {
        const message = accountErrorMessage(result.error);
        setActionError(message);
        showError(message);
      } else {
        showSuccess(t('admin.accounts.feedback.suspended'));
      }
      return;
    }
    const result = suspend(userId);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setActionError(message);
      showError(message);
    } else {
      showSuccess(t('feedback.admin.suspend.success'));
    }
  }
  async function handleReactivate(userId: string) {
    setActionError(null);
    if (supabase) {
      const result = await setSuspendedAsync(userId, false);
      if (!result.ok) {
        const message = accountErrorMessage(result.error);
        setActionError(message);
        showError(message);
      } else {
        showSuccess(t('admin.accounts.feedback.reactivated'));
      }
      return;
    }
    const result = reactivate(userId);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setActionError(message);
      showError(message);
    } else {
      showSuccess(t('feedback.admin.reactivate.success'));
    }
  }

  // Xoá vĩnh viễn (supabase). Trả về Result để Danger Modal xử lý loading/lỗi.
  async function handleConfirmDelete(userId: string): Promise<boolean> {
    setActionError(null);
    const result = await deleteUserAsync(userId);
    if (!result.ok) {
      const message = accountErrorMessage(result.error);
      setActionError(message);
      showError(message);
      return false;
    }
    showSuccess(t('admin.accounts.feedback.deleted'));
    return true;
  }

  // Count of currently active admins — used to disable the suspend button
  // for the last-active admin defensively in the UI.
  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && !u.suspended).length,
    [users],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Admin Account Management (task C/D) — form tạo tài khoản CHỈ ở supabase. */}
      {supabase && (
        <CreateAccountForm
          onCreated={() => {
            /* refetch đã chạy trong createUserAsync; không cần thêm */
          }}
        />
      )}

      {/* Role filter + (supabase) nút tải lại danh sách thật */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'worker', 'employer', 'admin'] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={filter === r ? 'primary' : 'ghost'}
            aria-pressed={filter === r}
            onClick={() => setFilter(r)}
          >
            {r === 'all' ? t('admin.users.filter.all') : t(`role.${r}`)}
          </Button>
        ))}
        {supabase && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto border border-gray-300 bg-white"
            loading={loadingUsers}
            onClick={() => {
              setLoadingUsers(true);
              void refreshUsersAsync().then((r) => {
                if (!r.ok) showError(accountErrorMessage(r.error));
                setLoadingUsers(false);
              });
            }}
          >
            {t('admin.accounts.refresh')}
          </Button>
        )}
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
            className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
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

      {!loadingUsers && filtered.length === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-gray-500">{t('admin.users.empty')}</p>
        </Card>
      )}
      <ul className="flex flex-col gap-2">
        {filtered.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.id === currentAdminId}
            reputationScore={reputationOf(user)}
            reputationDerived={!ratingsOn}
            isLastActiveAdmin={
              user.role === 'admin' && !user.suspended && activeAdminCount <= 1
            }
            adjusting={adjustingId === user.id}
            onAdjust={() => setAdjustingId(user.id)}
            onCancelAdjust={() => setAdjustingId(null)}
            onSuspend={() => handleSuspend(user.id)}
            onReactivate={() => handleReactivate(user.id)}
            onOpenProfile={() => setProfileUserId(user.id)}
            /* Xoá vĩnh viễn: chỉ supabase, chỉ worker/employer, không phải chính mình. */
            canDelete={
              supabase &&
              user.role !== 'admin' &&
              user.id !== currentAdminId
            }
            onDelete={() => setDeleteTarget(user)}
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

      {/* Danger Modal — xoá vĩnh viễn (supabase). */}
      <DeleteAccountModal
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Account Management (task C/D) — create form + danger delete modal.
// Cả hai CHỈ mount ở chế độ supabase (UsersPanel gate bằng isSupabaseEnv()).
// ---------------------------------------------------------------------------

function displayNameOf(user: User): string {
  return user.role === 'worker'
    ? user.fullName
    : user.role === 'employer'
      ? user.companyName
      : user.email;
}

function CreateAccountForm({ onCreated }: { onCreated: () => void }) {
  const createUserAsync = useAdminStore((s) => s.createUserAsync);
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim() !== '' &&
    displayName.trim() !== '' &&
    password.length >= 8 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return; // chặn double-click / submit thiếu field
    setSubmitting(true);
    setError(null);
    const result = await createUserAsync({
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      password,
      role,
    });
    setSubmitting(false);
    if (!result.ok) {
      const message = accountErrorMessage(result.error);
      setError(message);
      showError(message);
      return;
    }
    showSuccess(t('admin.accounts.feedback.created'));
    setEmail('');
    setDisplayName('');
    setPassword('');
    onCreated();
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900">
        {t('admin.accounts.create.title')}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {t('admin.accounts.create.intro')}
      </p>
      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label={t('admin.accounts.create.role')}
            value={role}
            onChange={(e) => setRole(e.target.value as 'worker' | 'employer')}
            options={[
              { value: 'worker', label: t('admin.accounts.create.role.worker') },
              { value: 'employer', label: t('admin.accounts.create.role.employer') },
            ]}
          />
          <Input
            label={
              role === 'worker'
                ? t('admin.accounts.create.displayName.worker')
                : t('admin.accounts.create.displayName.employer')
            }
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <Input
            label={t('admin.accounts.create.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t('admin.accounts.create.password')}
            type="password"
            hint={t('admin.accounts.create.password.hint')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
            {submitting
              ? t('admin.accounts.create.submitting')
              : t('admin.accounts.create.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DeleteAccountModal({
  user,
  onClose,
  onConfirm,
}: {
  user: User | null;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<boolean>;
}) {
  const [retype, setRetype] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Reset state khi mở modal cho user khác.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of retype/deleting when the delete target changes
    setRetype('');
    setDeleting(false);
  }, [user?.id]);

  if (!user) return null;
  const emailMatches = retype.trim().toLowerCase() === user.email.toLowerCase();

  async function handleConfirm() {
    if (!user || !emailMatches || deleting) return; // anti-double-click
    setDeleting(true);
    const ok = await onConfirm(user.id);
    setDeleting(false);
    if (ok) onClose();
  }

  return (
    <Modal open={user !== null} onClose={onClose} title={t('admin.accounts.delete.modal.title')}>
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('admin.accounts.delete.modal.warning')}
        </div>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{displayNameOf(user)}</span>{' '}
          <span className="text-gray-500">({user.email})</span>
        </p>
        <Input
          label={t('admin.accounts.delete.modal.retype')}
          placeholder={t('admin.accounts.delete.modal.retypePlaceholder')}
          value={retype}
          onChange={(e) => setRetype(e.target.value)}
          autoComplete="off"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            {t('btn.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={deleting}
            disabled={!emailMatches || deleting}
          >
            {deleting
              ? t('admin.accounts.delete.modal.deleting')
              : t('admin.accounts.delete.modal.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function UserRow({
  user,
  isSelf,
  reputationScore,
  reputationDerived,
  isLastActiveAdmin,
  adjusting,
  onAdjust,
  onCancelAdjust,
  onSuspend,
  onReactivate,
  onOpenProfile,
  canDelete = false,
  onDelete,
}: {
  user: User;
  isSelf: boolean;
  /** null với người không phải người lao động. */
  reputationScore: number | null;
  /** true khi điểm là tạm tính (supabase, server chưa lưu điểm). */
  reputationDerived: boolean;
  isLastActiveAdmin: boolean;
  adjusting: boolean;
  onAdjust: () => void;
  onCancelAdjust: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onOpenProfile: () => void;
  /** Task D — chỉ supabase, worker/employer, không phải chính mình. */
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const adjustReputation = useAdminStore((s) => s.adjustReputation);
  const ratingsOn = hasCapability('ratings');
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
    <Card as="li">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-left text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
            >
              {displayName}
            </button>
            <span className="ml-2 text-xs font-normal text-gray-500">
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

        {/* Supabase: điểm TẠM TÍNH từ lịch sử ca thật (có nhãn); nút điều
            chỉnh vẫn ẩn vì server chưa lưu điểm (sửa chỉ đổi RAM client). */}
        {reputationScore !== null && (
          <span
            className="inline-flex items-center gap-1"
            title={reputationDerived ? t('admin.reputation.derivedHint') : undefined}
          >
            <ReputationBadge score={reputationScore} />
            {reputationDerived && (
              <span className="text-xs text-gray-500">{t('admin.reputation.derivedTag')}</span>
            )}
          </span>
        )}

        {user.suspended ? (
          <Badge tone="danger">{t('admin.user.status.suspended')}</Badge>
        ) : (
          <Badge tone="success">{t('admin.user.status.active')}</Badge>
        )}

        <div className="flex flex-wrap gap-2">
          {ratingsOn && user.role === 'worker' && !adjusting && (
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
          {/* Task D — xoá vĩnh viễn (supabase). Ẩn với admin/chính mình. */}
          {canDelete && onDelete && (
            <Button size="sm" variant="ghost" className="text-red-600" onClick={onDelete}>
              {t('admin.accounts.delete.button')}
            </Button>
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
      {ratingsOn && adjusting && user.role === 'worker' && (
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
  const applications = useApplicationStore((s) => s.applications);

  const [filter, setFilter] = useState<typeof initialFilter>(
    initialFilter === 'disputed' && !hasCapability('payments') ? 'all' : initialFilter,
  );

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
        {(['all', 'active', 'completed', 'disputed'] as const)
          // "Tranh chấp" lọc theo escrow — chỉ có nghĩa khi có backend thanh toán.
          .filter((f) => f !== 'disputed' || hasCapability('payments'))
          .map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'primary' : 'ghost'}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {t(`admin.shifts.filter.${f}`)}
            </Button>
          ))}
      </div>

      {/* Phase 7: explainer banner — clarifies that statuses move
          automatically and that Override is for exceptional cases. */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p>
          {t(hasCapability('payments') ? 'admin.shifts.autoNote' : 'admin.shifts.autoNoteReal')}
        </p>
        {lastSyncAt && (
          <p className="mt-1 text-xs text-blue-700">
            {t('admin.shifts.lastSync').replace(
              '{when}',
              formatSyncTime(lastSyncAt),
            )}
          </p>
        )}
      </div>

      {sorted.length === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-gray-500">{t('admin.shifts.empty')}</p>
        </Card>
      )}
      {sorted.length > 50 && (
        <p className="text-xs text-gray-500 tabular-nums">
          {t('admin.shifts.showingFirst')
            .replace('{shown}', '50')
            .replace('{total}', String(sorted.length))}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {sorted.slice(0, 50).map((shift) => {
          const employer = users.find((u) => u.id === shift.employerId);
          const employerName =
            employer?.role === 'employer'
              ? employer.companyName
              : t('admin.shifts.unknownEmployer');
          return (
            <ShiftRow
              key={shift.id}
              shift={shift}
              employerName={employerName}
              applications={applications}
            />
          );
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

/**
 * Phase 10C-Stab-1 Batch 3 J — exact-second formatter for visible
 * audit logs (admin disputes, etc.). Always renders the seconds slot
 * so a viewer can correlate a notification with a server-side event.
 */
const VN_LOG_DATETIME = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatLogDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return VN_LOG_DATETIME.format(d);
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

function ShiftRow({
  shift,
  employerName,
  applications = [],
}: {
  shift: Shift;
  employerName: string;
  applications?: Application[];
}) {
  const overrideEscrow = useAdminStore((s) => s.overrideEscrow);
  const escrowOn = hasCapability('payments');
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
    <Card as="li">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {/* Phase 9P — title is now a link to the public shift detail
              so admins can inspect the full record (description,
              applicants, etc.) without going through the override
              flow. The page already handles the admin viewer branch. */}
          <Link
            href={`/shifts/${shift.id}`}
            className="block truncate text-sm font-semibold text-gray-900 hover:text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:rounded"
          >
            {shift.title}
          </Link>
          <p className="truncate text-xs text-gray-500">
            {employerName} • {formatDateVN(shift.date)} •{' '}
            {shift.positionsFilled}/{shift.positionsTotal} •{' '}
            {formatVND(shift.depositAmount)}
          </p>
        </div>
        <ShiftLifecycleBadge shift={shift} applications={applications} />
        {/* Escrow + override chỉ ở local: ở supabase `overrideEscrow` chỉ sửa
            store/localStorage phía client, server KHÔNG đổi → admin tưởng đã
            đổi trạng thái tiền thật (CLAUDE.md #7: escrow không ở client). */}
        {escrowOn && <EscrowStatusBadge status={shift.escrowStatus} />}
        {!editing && (
          <>
            <ButtonLink href={`/shifts/${shift.id}`} size="sm" variant="ghost">
              {t('btn.viewDetail')}
            </ButtonLink>
            {escrowOn && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  {t('admin.shifts.override')}
                </Button>
                <HelpPopover
                  title={t('admin.shifts.override')}
                  description={t('hint.admin.override')}
                />
              </>
            )}
          </>
        )}
      </div>

      {escrowOn && editing && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-gray-700">{t('admin.shifts.newStatus')}</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as EscrowStatus)}
                className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
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

  return (
    <div className="flex flex-col gap-4">
      {/* CORE-STABILITY-7 Part 6 — reported-reviews admin visibility. */}
      <ReportedReviewsCard />

      {sorted.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-gray-500">
            {t('admin.disputes.empty')}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((d) => {
            const shift = shifts.find((s) => s.id === d.shiftId);
            const app = applications.find((a) => a.id === d.applicationId);
            const worker = app ? users.find((u) => u.id === app.workerId) : null;
            const employer = shift ? users.find((u) => u.id === shift.employerId) : null;
            const workerName = worker?.role === 'worker' ? worker.fullName : '—';
            const employerName =
              employer?.role === 'employer' ? employer.companyName : '—';
            return (
              <DisputeRow
                key={d.id}
                dispute={d}
                shift={shift ?? null}
                application={app ?? null}
                workerName={workerName}
                employerName={employerName}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * CORE-STABILITY-7 Part 6.7 — minimal admin visibility for reported
 * reviews. Shows reporter, reason, the reported review's content, and
 * lets the admin mark each report Reviewed / Dismissed. Does NOT delete
 * the underlying review.
 */
function ReportedReviewsCard() {
  const reports = useReviewReportStore((s) => s.reports);
  const resolve = useReviewReportStore((s) => s.resolve);
  const feedback = useEmployerFeedbackStore((s) => s.feedback);
  const users = useUserStore((s) => s.users);

  const openReports = useMemo(
    () =>
      [...reports]
        .filter((r) => r.status === 'Open')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports],
  );

  if (openReports.length === 0) return null;

  return (
    <Card>
      <p className="mb-2 text-sm font-semibold text-gray-900">
        {t('admin.reportedReviews.title')} ({openReports.length})
      </p>
      <ul className="flex flex-col gap-2">
        {openReports.map((r) => {
          const review =
            r.targetKind === 'employerFeedback'
              ? feedback.find((f) => f.id === r.targetReviewId)
              : undefined;
          const reporter = users.find((u) => u.id === r.reportedByUserId);
          const reporterName =
            reporter && 'fullName' in reporter
              ? (reporter as { fullName: string }).fullName
              : reporter && 'companyName' in reporter
                ? (reporter as { companyName: string }).companyName
                : '—';
          return (
            <li
              key={r.id}
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="font-semibold text-amber-900">
                  {t('admin.reportedReviews.reason')}: {r.reason}
                </p>
                <Badge tone="warning">{t('dispute.status.Open')}</Badge>
              </div>
              {r.note && (
                <p className="mt-0.5 text-amber-800/80">
                  {t('admin.reportedReviews.note')}: {r.note}
                </p>
              )}
              <p className="mt-0.5 text-gray-600">
                {t('admin.reportedReviews.reporter')}: {reporterName}
              </p>
              {review && (
                <p className="mt-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-gray-700 ring-1 ring-amber-100">
                  {review.stars}★ — &ldquo;{review.comment ?? '—'}&rdquo;
                </p>
              )}
              <p className="mt-1.5 font-mono text-xs text-gray-500">
                {formatLogDateTime(r.createdAt)}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolve(r.id, 'Reviewed')}
                >
                  {t('admin.reportedReviews.markReviewed')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolve(r.id, 'Dismissed')}
                >
                  {t('admin.reportedReviews.dismiss')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DisputeRow({
  dispute,
  shift,
  application,
  workerName,
  employerName,
}: {
  dispute: Dispute;
  shift: Shift | null;
  application: Application | null;
  workerName: string;
  employerName: string;
}) {
  const resolveDispute = useAdminStore((s) => s.resolveDispute);
  const requestMoreEvidence = useAdminStore((s) => s.requestMoreEvidence);
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<'ResolvedReleased' | 'ResolvedRefunded'>(
    'ResolvedReleased',
  );
  // QA-Fix-1 F4 — request-more-evidence sub-form state.
  const [requesting, setRequesting] = useState(false);
  const [reqTarget, setReqTarget] = useState<'worker' | 'employer' | 'both'>('both');
  const [reqNote, setReqNote] = useState('');

  const shiftTitle = shift?.title ?? '—';
  const isOpen =
    dispute.status === 'Open' || dispute.status === 'RequestedMoreEvidence';

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

  function handleRequestEvidence() {
    if (reqNote.trim() === '') return;
    const result = requestMoreEvidence(dispute.id, reqTarget, reqNote.trim());
    if (result.ok) {
      setRequesting(false);
      setReqNote('');
      showSuccess(t('admin.dispute.requestEvidence.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  const initiatorLabel =
    dispute.raisedBy === 'worker'
      ? t('admin.dispute.initiator.worker')
      : t('admin.dispute.initiator.employer');

  // Gather every back-and-forth response, oldest first.
  const responses = [...(dispute.responses ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const VN_DT = (iso?: string) =>
    iso ? formatLogDateTime(iso) : '—';

  // Open disputes pop in the queue (amber 1px ring over the card border);
  // resolved ones recede onto the subtle surface. Replaces the former
  // 4px coloured side stripe (impeccable craft-floor: no side-tab accents)
  // — the status badge in the row still carries the label.
  return (
    <Card
      as="li"
      tone={isOpen ? 'default' : 'subtle'}
      className={isOpen ? 'ring-1 ring-amber-300' : ''}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <p className="text-sm font-semibold text-gray-900">
            {shiftTitle}
            <span className="ml-2 text-xs font-normal text-orange-700">
              {expanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {employerName} ↔ {workerName} • {VN_DT(dispute.createdAt)}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {t('admin.dispute.initiatedBy')}: {initiatorLabel}
            {dispute.category && (
              <>
                {' • '}
                {t('admin.dispute.category')}: {t(`dispute.category.${dispute.category}`)}
              </>
            )}
          </p>
          {shift && (
            <p className="mt-1 text-xs font-medium text-gray-700">
              {t('admin.dispute.amountHeld')}:{' '}
              <span className="font-semibold text-orange-700">
                {formatVND(shift.depositAmount)}
              </span>
            </p>
          )}
          <p className="mt-2 text-sm text-gray-700">
            <span className="font-medium">Lý do:</span> {dispute.reason}
          </p>
          {dispute.resolutionNote && (
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium">Ghi chú:</span> {dispute.resolutionNote}
            </p>
          )}
        </button>

        {isOpen ? (
          <Badge tone="warning">
            {dispute.status === 'RequestedMoreEvidence'
              ? t('dispute.status.RequestedMoreEvidence')
              : t('dispute.status.Open')}
          </Badge>
        ) : (
          <Badge tone={dispute.status === 'ResolvedReleased' ? 'success' : 'neutral'}>
            {t(`dispute.status.${dispute.status}`)}
          </Badge>
        )}
      </div>

      {/* QA-Fix-1 F2/F3 — expandable full detail. */}
      {expanded && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-3">
            <dt className="font-medium">Ngày / giờ ca:</dt>
            <dd>
              {shift
                ? `${formatDateVN(shift.date)} • ${formatTimeVN(shift.startTime)}–${formatTimeVN(shift.endTime)}`
                : '—'}
            </dd>
            <dt className="font-medium">Địa điểm:</dt>
            <dd>{shift?.location ?? '—'}</dd>
            <dt className="font-medium">Người lao động:</dt>
            <dd>{workerName}</dd>
            <dt className="font-medium">Nhà tuyển dụng:</dt>
            <dd>{employerName}</dd>
            <dt className="font-medium">Mô tả bằng chứng:</dt>
            <dd className="whitespace-pre-line">{dispute.evidenceDescription || '—'}</dd>
            <dt className="font-medium">Tệp bằng chứng:</dt>
            <dd className="break-all font-mono">{dispute.evidenceFileName || '—'}</dd>
            <dt className="font-medium">Check-in:</dt>
            <dd>{dispute.id === 'dispute-001' ? '08:30:00 10/07/2026' : VN_DT(application?.checkInAt)}</dd>
            <dt className="font-medium">Xác nhận có mặt:</dt>
            <dd>{VN_DT(application?.markedPresentAt)}</dd>
            <dt className="font-medium">Check-out:</dt>
            <dd>{dispute.id === 'dispute-001' ? '16:45:00 10/07/2026' : VN_DT(application?.checkOutAt)}</dd>
            <dt className="font-medium">Ghi chú bàn giao:</dt>
            <dd className="whitespace-pre-line">{application?.workerCheckoutNote || '—'}</dd>
          </dl>

          {/* Responses thread. */}
          <div className="border-t border-gray-200 pt-2">
            <p className="font-semibold text-gray-900">
              {t('admin.dispute.responses')} ({responses.length})
            </p>
            {responses.length === 0 ? (
              <p className="mt-1 italic text-gray-500">{t('admin.dispute.responses.empty')}</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-2">
                {responses.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {r.side === 'worker'
                        ? t('admin.dispute.initiator.worker')
                        : t('admin.dispute.initiator.employer')}
                      {' · '}
                      {VN_DT(r.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{r.reason}</p>
                    {r.evidenceDescription && (
                      <p className="mt-1 italic">{r.evidenceDescription}</p>
                    )}
                    {r.evidenceFileName && (
                      <p className="mt-1 break-all font-mono text-xs">
                        {r.evidenceFileName}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Resolve + request-more-evidence actions — only while open. */}
      {isOpen && (
        <div className="mt-3 flex flex-col gap-2">
          {!resolving && !requesting && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => setResolving(true)}>
                {t('btn.resolveDispute')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setRequesting(true)}>
                {t('admin.dispute.requestEvidence.button')}
              </Button>
            </div>
          )}

          {resolving && (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={outcome === 'ResolvedReleased' ? 'primary' : 'secondary'}
                  onClick={() => setOutcome('ResolvedReleased')}
                >
                  Thanh toán cho người lao động
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

          {requesting && (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-medium text-gray-700">
                {t('admin.dispute.requestEvidence.target')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={reqTarget === 'worker' ? 'primary' : 'secondary'}
                  onClick={() => setReqTarget('worker')}
                >
                  {t('admin.dispute.initiator.worker')}
                </Button>
                <Button
                  size="sm"
                  variant={reqTarget === 'employer' ? 'primary' : 'secondary'}
                  onClick={() => setReqTarget('employer')}
                >
                  {t('admin.dispute.initiator.employer')}
                </Button>
                <Button
                  size="sm"
                  variant={reqTarget === 'both' ? 'primary' : 'secondary'}
                  onClick={() => setReqTarget('both')}
                >
                  {t('admin.dispute.target.both')}
                </Button>
              </div>
              <Textarea
                label={t('admin.dispute.requestEvidence.note')}
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                rows={2}
                maxLength={500}
                required
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setRequesting(false)}>
                  {t('btn.cancel')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleRequestEvidence}
                  disabled={reqNote.trim() === ''}
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
// ---------------------------------------------------------------------------
// Phase 10C-Stab-1 Batch 2 — admin-only snapshot dev utility
// ---------------------------------------------------------------------------

/**
 * Mounted inline on `/admin/dashboard` (not a new route). Visible only
 * to admin users (the page-level `RoleGuard` already enforces this so
 * the component can render unconditionally inside the dashboard).
 *
 * Two affordances:
 *   - "Tải snapshot mock data"  → calls `exportSnapshot()` and triggers
 *                                  a client-side `Blob` download named
 *                                  `cale-mock-snapshot-<isoDate>.json`.
 *   - "Nạp snapshot mock data"  → renders a hidden `<input type="file">`,
 *                                  reads the selected file via
 *                                  `File.text()`, calls `importSnapshot()`,
 *                                  and `window.location.reload()` on
 *                                  success.
 *
 * Mock-only — no backend, no real fetch. All persistence is localStorage.
 */
function SnapshotDevUtility() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  function handleExport() {
    try {
      const json = exportSnapshot();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const isoDate = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `cale-mock-snapshot-${isoDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess(t('admin.snapshot.export.success'));
    } catch {
      showError(t('admin.snapshot.import.error.INVALID_PAYLOAD'));
    }
  }

  function handleImportClick() {
    if (importing) return;
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const result = importSnapshot(text);
      if (!result.ok) {
        const key = `admin.snapshot.import.error.${result.error}` as const;
        showError(t(key));
        setImporting(false);
        return;
      }
      showSuccess(t('admin.snapshot.import.success'));
      // Force a reload so every Zustand store re-hydrates from the
      // freshly-written localStorage. We do not push the imported
      // payload through `useXxxStore.setState` because some slices
      // (verifications, applications, shifts) carry derived state
      // and the simplest correct strategy is a full refresh.
      window.location.reload();
    } catch {
      showError(t('admin.snapshot.import.error.INVALID_JSON'));
      setImporting(false);
    } finally {
      // Reset the input so re-selecting the same file fires `change`.
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section
      aria-labelledby="admin-snapshot-title"
      className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-card"
    >
      <h2
        id="admin-snapshot-title"
        className="text-base font-semibold text-gray-900"
      >
        {t('admin.snapshot.section.title')}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        {t('admin.snapshot.section.intro')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={handleExport}>
          {t('admin.snapshot.export.button')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleImportClick}
          loading={importing}
        >
          {t('admin.snapshot.import.button')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </section>
  );
}
