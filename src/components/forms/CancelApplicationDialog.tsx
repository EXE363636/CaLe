'use client';

/**
 * Confirmation dialog for worker-initiated application cancellation.
 *
 * Forces the worker to:
 *  - acknowledge the late-cancel reputation hit when applicable, and
 *  - acknowledge that an employer must approve when the shift is within 3h, and
 *  - acknowledge their remaining 7-/30-day quota (Phase 3), and
 *  - provide a non-empty reason that's persisted on the cancellation record
 *    AND included in the employer notification.
 */

import { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Textarea } from '@/components/ui';
import { classifyCancellation } from '@/domain/reputation';
import { requiresEmployerApprovalToCancel } from '@/domain/timeGates';
import { canCancelByQuota, type QuotaUsage } from '@/domain/cancellationQuota';
import { t } from '@/i18n/vi';
import type { Application, Shift } from '@/types';

interface CancelApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  application: Application;
  shift: Shift;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  /**
   * Worker's current 7-/30-day cancellation quota usage. When the worker
   * has no quota left the submit button is disabled and a clear Vietnamese
   * blocker message is shown above the reason field.
   */
  quota?: QuotaUsage;
}

export function CancelApplicationDialog({
  open,
  onClose,
  application,
  shift,
  onConfirm,
  loading = false,
  quota,
}: CancelApplicationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const { isLate, needsApproval } = useMemo(() => {
    if (!open) return { isLate: false, needsApproval: false };
    const now = new Date().toISOString();
    const cls = classifyCancellation(
      application.status,
      `${shift.date}T${shift.startTime}:00`,
      now,
    );
    return {
      isLate: cls === 'LateCancel',
      needsApproval:
        application.status === 'Approved' &&
        requiresEmployerApprovalToCancel(now, shift),
    };
  }, [open, application.status, shift]);

  const quotaBlocked = quota !== undefined && !canCancelByQuota(quota);

  function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed === '') {
      setError(t('cancel.confirm.reasonRequired'));
      return;
    }
    if (quotaBlocked) {
      setError(t('cancel.confirm.quotaBlocked'));
      return;
    }
    onConfirm(trimmed);
  }

  // Submit-button label changes when an approval will be requested rather
  // than the cancel happening immediately.
  const submitLabel = needsApproval
    ? t('cancel.confirm.requestSubmit')
    : t('cancel.confirm.submit');

  return (
    <Modal open={open} onClose={onClose} title={t('cancel.confirm.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-700">
          Bạn sắp huỷ đơn ứng tuyển ca <span className="font-semibold">{shift.title}</span>.
        </p>

        {/* Quota indicator — always shown when the parent supplied usage,
            so the worker sees their remaining capacity even when not yet
            blocked. Becomes a hard-stop banner when both windows are
            empty. */}
        {quota && (
          <div
            className={[
              'rounded-lg border px-3 py-2 text-sm',
              quotaBlocked
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-gray-200 bg-gray-50 text-gray-700',
            ].join(' ')}
          >
            <p className="font-medium">
              {quotaBlocked
                ? t('cancel.quota.blockedTitle')
                : t('cancel.quota.title')}
            </p>
            <p className="mt-1">
              {t('cancel.quota.weekly')
                .replace('{remaining}', String(quota.weekly.remaining))
                .replace('{limit}', String(quota.weekly.limit))}
            </p>
            <p>
              {t('cancel.quota.monthly')
                .replace('{remaining}', String(quota.monthly.remaining))
                .replace('{limit}', String(quota.monthly.limit))}
            </p>
            {quotaBlocked && (
              <p className="mt-1 text-xs">{t('cancel.quota.blockedHint')}</p>
            )}
          </div>
        )}

        {needsApproval && !quotaBlocked && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
            {t('cancel.confirm.approvalRequired')}
          </div>
        )}

        {!quotaBlocked && isLate ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {t('cancel.confirm.lateWarning')}
          </div>
        ) : !quotaBlocked && application.status === 'Approved' && !needsApproval ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t('cancel.confirm.onTimeNote')}
          </div>
        ) : null}

        <Textarea
          label={t('cancel.confirm.reasonLabel')}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('cancel.confirm.reasonPlaceholder')}
          maxLength={500}
          rows={3}
          required
          error={error ?? undefined}
          disabled={quotaBlocked}
        />

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('cancel.confirm.keep')}
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={loading}
            disabled={reason.trim() === '' || quotaBlocked}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
