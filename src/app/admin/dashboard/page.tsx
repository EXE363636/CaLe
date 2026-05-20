'use client';

import { useState, useMemo } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAdminStore } from '@/stores/adminStore';
import { Card, Button, Badge, Input, Textarea } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { ReputationBadge } from '@/components/user/ReputationBadge';
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
  const [tab, setTab] = useState<Tab>('analytics');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>

      {/* Tab nav */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
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

      {tab === 'analytics' && <AnalyticsPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'shifts' && <ShiftsPanel />}
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

function AnalyticsPanel() {
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
      <StatCard label="Tổng người dùng" value={String(users.length)} />
      <StatCard label={t('admin.analytics.totalWorkers')} value={String(workerCount)} />
      <StatCard label={t('admin.analytics.totalEmployers')} value={String(employerCount)} />
      <StatCard label={t('admin.analytics.totalShifts')} value={String(shifts.length)} />
      <StatCard label="Ca đang hoạt động" value={String(activeShifts)} />
      <StatCard label={t('admin.analytics.completedShifts')} value={String(completedShifts)} />
      <StatCard label="Thanh toán đang tranh chấp" value={String(disputedPayments)} highlight />
      <StatCard label={t('admin.analytics.activeDisputes')} value={String(openDisputes)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={[
          'mt-1 text-xl font-bold',
          highlight ? 'text-red-600' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersPanel() {
  const users = useUserStore((s) => s.users);
  const suspend = useAdminStore((s) => s.suspend);
  const reactivate = useAdminStore((s) => s.reactivate);

  const [filter, setFilter] = useState<'all' | 'worker' | 'employer' | 'admin'>('all');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return users;
    return users.filter((u) => u.role === filter);
  }, [users, filter]);

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

      <ul className="flex flex-col gap-2">
        {filtered.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            adjusting={adjustingId === user.id}
            onAdjust={() => setAdjustingId(user.id)}
            onCancelAdjust={() => setAdjustingId(null)}
            onSuspend={() => suspend(user.id)}
            onReactivate={() => reactivate(user.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function UserRow({
  user,
  adjusting,
  onAdjust,
  onCancelAdjust,
  onSuspend,
  onReactivate,
}: {
  user: User;
  adjusting: boolean;
  onAdjust: () => void;
  onCancelAdjust: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const adjustReputation = useAdminStore((s) => s.adjustReputation);
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState('');

  const displayName =
    user.role === 'worker'
      ? user.fullName
      : user.role === 'employer'
        ? user.companyName
        : user.fullName;

  function handleSubmitAdjust() {
    if (note.trim() === '') return;
    adjustReputation(user.id, delta, note.trim());
    setDelta(0);
    setNote('');
    onCancelAdjust();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {displayName}
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({t(`role.${user.role}`)})
            </span>
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
            <Button size="sm" variant="ghost" onClick={onAdjust}>
              {t('btn.adjustReputation')}
            </Button>
          )}
          {user.suspended ? (
            <Button size="sm" variant="secondary" onClick={onReactivate}>
              {t('btn.reactivate')}
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={onSuspend}>
              {t('btn.suspend')}
            </Button>
          )}
        </div>
      </div>

      {/* Reputation adjust form */}
      {adjusting && user.role === 'worker' && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Điều chỉnh điểm (-100 → +100)"
              type="number"
              min={-100}
              max={100}
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-32"
            />
            <Input
              label={t('form.reasonNote')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 min-w-[200px]"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancelAdjust}>
              {t('btn.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmitAdjust}
              disabled={note.trim() === ''}
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

function ShiftsPanel() {
  const shifts = useShiftStore((s) => s.shifts);
  const users = useUserStore((s) => s.users);

  // Sort by createdAt desc (recent first)
  const sorted = useMemo(
    () => [...shifts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [shifts],
  );

  return (
    <ul className="flex flex-col gap-2">
      {sorted.slice(0, 50).map((shift) => {
        const employer = users.find((u) => u.id === shift.employerId);
        const employerName = employer?.role === 'employer' ? employer.companyName : 'Unknown';
        return <ShiftRow key={shift.id} shift={shift} employerName={employerName} />;
      })}
    </ul>
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
    overrideEscrow(shift.id, target, note.trim());
    setEditing(false);
    setNote('');
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{shift.title}</p>
          <p className="truncate text-xs text-gray-500">
            {employerName} • {formatDateVN(shift.date)} • {formatVND(shift.depositAmount)}
          </p>
        </div>
        <ShiftStatusBadge status={shift.status} />
        <EscrowStatusBadge status={shift.escrowStatus} />
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Override
          </Button>
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
    resolveDispute(dispute.id, outcome, note.trim());
    setResolving(false);
    setNote('');
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
