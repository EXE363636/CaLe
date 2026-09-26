'use client';

import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import { t } from '@/i18n/vi';
import type { ApplicationStatus, VerificationFlag, ShiftStatus } from '@/types';
import { canApplyToShifts } from '@/domain/reputation';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { formatVND } from '@/lib/format';

interface ApplicationActionsProps {
  shiftId: string;
  workerId: string;
  applicationStatus?: ApplicationStatus | null;
  workerVerifications: VerificationFlag[];
  workerReputationScore: number;
  shiftStatus: ShiftStatus;
  /** Tiền công đã trả cho đơn này (đơn `Confirmed`) — hiện trong phần kết quả. */
  payoutAmount?: number;
  onApply: () => void;
  /** Worker requests cancellation — parent should open the confirmation dialog. */
  onRequestCancel: () => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function ApplicationActions({
  applicationStatus,
  workerVerifications,
  workerReputationScore,
  shiftStatus,
  payoutAmount,
  onApply,
  onRequestCancel,
  loading = false,
  error = null,
  className = '',
}: ApplicationActionsProps) {
  const wrap = ['flex flex-col items-start gap-2', className].join(' ');

  // Outcome states — the worker is already past applying, so these come
  // BEFORE the shift-open gate (a finished shift used to render an empty
  // card here, with no word on how the worker's shift turned out).
  if (applicationStatus === 'Confirmed') {
    const paid = typeof payoutAmount === 'number' && payoutAmount > 0;
    return (
      <div className={wrap}>
        <Badge tone="success">{t('apply.applied.Confirmed')}</Badge>
        <p className="text-sm text-gray-700">{t('apply.outcome.completed')}</p>
        {paid && (
          <p className="text-sm font-medium text-gray-900">
            {t(isSupabaseEnv() ? 'apply.outcome.paid.real' : 'apply.outcome.paid.demo').replace(
              '{amount}',
              formatVND(payoutAmount),
            )}{' '}
            <Link
              href="/worker/dashboard#wallet"
              className="rounded font-medium text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {t('apply.outcome.viewWallet')} →
            </Link>
          </p>
        )}
      </div>
    );
  }
  if (applicationStatus === 'CheckedOut' || applicationStatus === 'CheckedIn') {
    return (
      <div className={wrap}>
        <Badge tone={applicationStatus === 'CheckedOut' ? 'warning' : 'info'}>
          {t(`application.status.${applicationStatus}`)}
        </Badge>
        <p className="text-sm text-gray-700">
          {t(applicationStatus === 'CheckedOut' ? 'apply.outcome.checkedOut' : 'apply.outcome.checkedIn')}
        </p>
      </div>
    );
  }
  if (applicationStatus === 'Disputed') {
    return (
      <div className={wrap}>
        <Badge tone="danger">{t('application.status.Disputed')}</Badge>
        <p className="text-sm text-gray-700">{t('apply.outcome.disputed')}</p>
      </div>
    );
  }
  if (applicationStatus === 'NoShow') {
    // The absent-dispute banner below carries the explanation + action.
    return (
      <div className={wrap}>
        <Badge tone="danger">{t('application.status.NoShow')}</Badge>
      </div>
    );
  }
  if (applicationStatus === 'CancelledByEmployer') {
    return (
      <div className={wrap}>
        <Badge tone="neutral">{t('application.status.CancelledByEmployer')}</Badge>
        <p className="text-sm text-gray-700">{t('apply.outcome.cancelledByEmployer')}</p>
      </div>
    );
  }

  // Shift not open and the worker has nothing pending on it.
  if (shiftStatus !== 'Published' && shiftStatus !== 'FullyBooked') {
    if (applicationStatus === 'Expired') {
      return (
        <div className={wrap}>
          <Badge tone="neutral">{t('application.status.Expired')}</Badge>
          <p className="text-xs text-gray-600">{t('apply.outcome.expiredNote')}</p>
        </div>
      );
    }
    return <p className={['text-sm text-gray-600', className].join(' ')}>{t('apply.outcome.closed')}</p>;
  }

  // Shift fully booked
  if (shiftStatus === 'FullyBooked') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="warning">{t('shift.status.FullyBooked')}</Badge>
      </div>
    );
  }

  // Phone verification gate — the demo has no real phone-verification
  // flow, so instead of a no-op button the CTA navigates to the worker
  // profile (where phone / verification is managed). It never fakes a
  // successful verification.
  if (!workerVerifications.includes('phone')) {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <p className="text-sm text-amber-700">{t('verification.required')}</p>
        <Link
          href="/worker/profile"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-orange-500 bg-white px-4 text-sm font-medium text-orange-700 shadow-sm transition hover:bg-orange-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        >
          {t('verification.goToProfile')}
        </Link>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Reputation gate
  if (!canApplyToShifts(workerReputationScore)) {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <p className="text-sm text-red-700">{t('apply.error.REPUTATION_TOO_LOW')}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Application status states
  if (applicationStatus === 'Pending') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="warning">{t('application.status.Pending')}</Badge>
        <Button variant="secondary" size="sm" onClick={onRequestCancel} loading={loading}>
          {t('btn.cancelApplication')}
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (applicationStatus === 'Approved') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="success">{t('application.status.Approved')}</Badge>
        <Button variant="secondary" size="sm" onClick={onRequestCancel} loading={loading}>
          {t('btn.cancelApplication')}
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (applicationStatus === 'Rejected') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="danger">{t('application.status.Rejected')}</Badge>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (applicationStatus === 'CancellationRequested') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="warning">{t('application.status.CancellationRequested')}</Badge>
        <p className="text-xs text-gray-600">
          {t('cancel.requested.awaitingDecision')}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (applicationStatus === 'CancelledByWorker') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="neutral">{t('application.status.CancelledByWorker')}</Badge>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (applicationStatus === 'Expired') {
    // Phase 10A-Fix-10: Pending applications that the employer never
    // approved before the shift started land here. No action buttons —
    // the worker can't cancel something that already expired, and
    // re-applying to a started shift is blocked separately.
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="neutral">{t('application.status.Expired')}</Badge>
        <p className="text-xs text-gray-600">{t('apply.outcome.expiredNote')}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Not applied yet — show Apply button
  return (
    <div className={['flex flex-col gap-2', className].join(' ')}>
      <Button variant="primary" onClick={onApply} loading={loading}>
        {t('btn.apply')}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
