'use client';

import { Button, Badge } from '@/components/ui';
import { t } from '@/i18n/vi';
import type { ApplicationStatus, VerificationFlag, ShiftStatus } from '@/types';
import { canApplyToShifts } from '@/domain/reputation';

interface ApplicationActionsProps {
  shiftId: string;
  workerId: string;
  applicationStatus?: ApplicationStatus | null;
  workerVerifications: VerificationFlag[];
  workerReputationScore: number;
  shiftStatus: ShiftStatus;
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
  onApply,
  onRequestCancel,
  loading = false,
  error = null,
  className = '',
}: ApplicationActionsProps) {
  // Shift not open at all — render nothing
  if (shiftStatus !== 'Published' && shiftStatus !== 'FullyBooked') {
    return null;
  }

  // Shift fully booked
  if (shiftStatus === 'FullyBooked') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="warning">{t('shift.status.FullyBooked')}</Badge>
      </div>
    );
  }

  // Phone verification gate
  if (!workerVerifications.includes('phone')) {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <p className="text-sm text-amber-700">{t('verification.required')}</p>
        <Button variant="secondary" size="sm" onClick={() => {}}>
          {t('btn.verifyPhone')}
        </Button>
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

  if (applicationStatus === 'CancelledByWorker') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        <Badge tone="neutral">{t('application.status.CancelledByWorker')}</Badge>
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
