'use client';

/**
 * Admin-only profile modal opened by clicking a user name in the admin
 * dashboard Users tab.
 *
 * Adapts to the user's role:
 *  - Worker: identity, reputation, verifications, completed/no-show/
 *    cancellation counters, **rolling 7-/30-day cancellation quota usage**,
 *    skills, preferences, bio, and rating history.
 *  - Employer: company identity, business info, posted / active /
 *    completed / cancelled shift counts, disputed-payment count, status.
 *  - Admin: identity, status, "current account" badge when applicable,
 *    role label.
 *
 * Sources data entirely from existing stores; no API calls. The modal is
 * read-only — admin actions (suspend, reactivate, reputation adjust) live
 * on the row itself.
 */

import { useMemo } from 'react';
import { Modal, Badge, StarRating } from '@/components/ui';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';
import { VerificationBadge } from './VerificationBadge';
import { useShiftStore } from '@/stores/shiftStore';
import { quotaUsage } from '@/domain/cancellationQuota';
import { averageRating } from '@/domain/rating';
import { formatDateVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Admin, Employer, User, Worker } from '@/types';

interface AdminUserProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  /** When the modal subject is the currently logged-in admin. */
  isSelf?: boolean;
}

export function AdminUserProfileModal({
  open,
  onClose,
  user,
  isSelf = false,
}: AdminUserProfileModalProps) {
  if (!user) return null;

  // Title is generic — the body branches on role below.
  const title = t('admin.profile.title');

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-lg">
      {user.role === 'worker' && <WorkerBody worker={user} />}
      {user.role === 'employer' && <EmployerBody employer={user} />}
      {user.role === 'admin' && <AdminBody admin={user} isSelf={isSelf} />}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

function WorkerBody({ worker }: { worker: Worker }) {
  const avg = averageRating(worker.ratingsReceived);

  // Phase 3 quota — derived in a useMemo so the modal never feeds Zustand
  // a fresh array selector. `cancellationHistory` and `reputationScore`
  // are stable refs as long as the worker record itself doesn't change.
  const quota = useMemo(
    () =>
      quotaUsage(
        worker.cancellationHistory,
        worker.reputationScore,
        new Date().toISOString(),
      ),
    [worker.cancellationHistory, worker.reputationScore],
  );

  // Cancellation count = quota-countable history entries. Admin
  // reputation-adjust entries (shiftId === '') are excluded by the same
  // helper through `quotaUsage`'s monthly window in practice, but we want
  // a *lifetime* count too — read directly from the array and skip the
  // synthetic ones.
  const lifetimeCancellations = useMemo(
    () => worker.cancellationHistory.filter((r) => r.shiftId !== '').length,
    [worker.cancellationHistory],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <UserAvatar name={worker.fullName} avatarUrl={worker.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{worker.fullName}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{worker.email}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{worker.phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ReputationBadge score={worker.reputationScore} />
          <SuspensionBadge suspended={worker.suspended} />
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-4 gap-2 rounded-xl bg-gray-50 p-3">
        <Stat
          value={String(worker.completedShiftCount)}
          label={t('employer.applicant.completedShifts')}
        />
        <Stat
          value={avg === null ? '—' : avg.toFixed(1)}
          label={t('employer.applicant.avgRating')}
        />
        <Stat
          value={String(worker.noShowCount)}
          label={t('employer.applicant.noShows')}
        />
        <Stat
          value={String(lifetimeCancellations)}
          label={t('employer.applicant.cancellations')}
        />
      </div>

      {/* Cancellation quota — admin-only deep-dive into Phase 3 limits */}
      <Section title={t('admin.profile.quota.title')}>
        <div className="rounded-lg border border-gray-100 p-3 text-sm">
          <p className="text-gray-700">
            {t('admin.profile.quota.weekly')
              .replace('{used}', String(quota.weekly.used))
              .replace('{limit}', String(quota.weekly.limit))
              .replace('{remaining}', String(quota.weekly.remaining))}
          </p>
          <p className="mt-1 text-gray-700">
            {t('admin.profile.quota.monthly')
              .replace('{used}', String(quota.monthly.used))
              .replace('{limit}', String(quota.monthly.limit))
              .replace('{remaining}', String(quota.monthly.remaining))}
          </p>
        </div>
      </Section>

      {/* Verification */}
      <Section title="Xác minh">
        <VerificationBadge verifications={worker.verifications} />
      </Section>

      {/* Bio */}
      <Section title={t('employer.applicant.bio')}>
        {worker.bio ? (
          <p className="whitespace-pre-line text-sm text-gray-700">{worker.bio}</p>
        ) : (
          <p className="text-sm italic text-gray-400">
            {t('employer.applicant.noBio')}
          </p>
        )}
      </Section>

      {/* Skills */}
      {worker.skills.length > 0 && (
        <Section title={t('employer.applicant.skills')}>
          <ChipList items={worker.skills} />
        </Section>
      )}

      {/* Preferred job types */}
      {worker.preferredJobTypes.length > 0 && (
        <Section title={t('employer.applicant.preferredJobs')}>
          <ChipList items={worker.preferredJobTypes} />
        </Section>
      )}

      {/* Preferred locations */}
      {worker.preferredLocations.length > 0 && (
        <Section title={t('employer.applicant.preferredLocations')}>
          <ChipList items={worker.preferredLocations} />
        </Section>
      )}

      {/* Rating history */}
      <Section title={t('employer.applicant.ratingHistory')}>
        {worker.ratingsReceived.length === 0 ? (
          <p className="text-sm italic text-gray-400">{t('reputation.noRatings')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {worker.ratingsReceived.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <StarRating value={r.stars} readOnly size="sm" />
                  <span className="text-xs text-gray-400">
                    {formatDateVN(r.createdAt)}
                  </span>
                </div>
                {r.feedback && (
                  <p className="mt-1.5 text-sm text-gray-700">
                    &ldquo;{r.feedback}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Employer
// ---------------------------------------------------------------------------

function EmployerBody({ employer }: { employer: Employer }) {
  const allShifts = useShiftStore((s) => s.shifts);

  const stats = useMemo(() => {
    let posted = 0;
    let active = 0;
    let completed = 0;
    let cancelled = 0;
    let disputedPayments = 0;
    for (const s of allShifts) {
      if (s.employerId !== employer.id) continue;
      posted += 1;
      if (s.status === 'Completed') completed += 1;
      else if (s.status === 'Cancelled') cancelled += 1;
      else if (
        s.status === 'Published' ||
        s.status === 'FullyBooked' ||
        s.status === 'InProgress' ||
        s.status === 'AwaitingConfirmation'
      ) {
        active += 1;
      }
      if (s.escrowStatus === 'Disputed') disputedPayments += 1;
    }
    return { posted, active, completed, cancelled, disputedPayments };
  }, [allShifts, employer.id]);

  return (
    <div className="flex flex-col gap-5">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <UserAvatar
          name={employer.companyName}
          avatarUrl={employer.logoUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {employer.companyName}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {employer.businessType}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{employer.email}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{employer.phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {employer.verifiedBusiness ? (
            <Badge tone="success">{t('employer.profile.verifiedBusiness')}</Badge>
          ) : (
            <Badge tone="neutral">{t('employer.profile.notVerified')}</Badge>
          )}
          <SuspensionBadge suspended={employer.suspended} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-4">
        <Stat
          value={String(stats.posted)}
          label={t('employer.profile.postedShifts')}
        />
        <Stat
          value={String(stats.active)}
          label={t('employer.profile.activeShifts')}
        />
        <Stat
          value={String(stats.completed)}
          label={t('employer.profile.completedShifts')}
        />
        <Stat
          value={String(stats.cancelled)}
          label={t('employer.profile.cancelledShifts')}
        />
      </div>

      {/* Disputed payments — only worth surfacing when non-zero */}
      {stats.disputedPayments > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('admin.profile.employer.disputedPayments').replace(
            '{count}',
            String(stats.disputedPayments),
          )}
        </div>
      )}

      {/* Description */}
      <Section title={t('employer.profile.description')}>
        {employer.description ? (
          <p className="whitespace-pre-line text-sm text-gray-700">
            {employer.description}
          </p>
        ) : (
          <p className="text-sm italic text-gray-400">
            {t('employer.profile.noDescription')}
          </p>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

function AdminBody({ admin, isSelf }: { admin: Admin; isSelf: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <UserAvatar name={admin.fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{admin.fullName}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{admin.email}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{admin.phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone="info">{t('role.admin')}</Badge>
          <SuspensionBadge suspended={admin.suspended} />
          {isSelf && (
            <Badge tone="info">{t('admin.user.currentAccount')}</Badge>
          )}
        </div>
      </div>

      <Section title={t('admin.profile.admin.note')}>
        <p className="text-sm text-gray-700">
          {t('admin.profile.admin.description')}
        </p>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function SuspensionBadge({ suspended }: { suspended: boolean }) {
  return suspended ? (
    <Badge tone="danger">Tạm khoá</Badge>
  ) : (
    <Badge tone="success">Hoạt động</Badge>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-lg font-bold text-gray-900">{value}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, idx) => (
        <span
          key={`${it}-${idx}`}
          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
        >
          {it}
        </span>
      ))}
    </div>
  );
}
