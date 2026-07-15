'use client';

/**
 * Rejection-reason dialog for the employer manage shift page (Phase 6).
 *
 * Replaces the old one-click reject button. Employer must enter a
 * non-empty reason; the reason is persisted on the application and
 * forwarded to the worker's `ApplicationRejected` notification body so
 * the worker can see *why*.
 */

import { useEffect, useState } from 'react';
import { Modal, Button, Textarea } from '@/components/ui';
import { t } from '@/i18n/vi';

interface RejectApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Worker name shown in the dialog body for context. */
  workerName: string;
  /** Shift title shown in the dialog body for context. */
  shiftTitle: string;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectApplicationDialog({
  open,
  onClose,
  workerName,
  shiftTitle,
  onConfirm,
  loading = false,
}: RejectApplicationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional form reset on open so a prior failed submit doesn't leak; refactor would change dialog behavior
      setReason('');
      setError(null);
    }
  }, [open]);

  function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed === '') {
      setError(t('reject.error.reasonRequired'));
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('reject.dialog.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-700">
          {t('reject.dialog.intro')
            .replace('{worker}', workerName)
            .replace('{shift}', shiftTitle)}
        </p>

        <Textarea
          label={t('reject.dialog.reasonLabel')}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('reject.dialog.reasonPlaceholder')}
          maxLength={500}
          rows={3}
          required
          error={error ?? undefined}
        />

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('btn.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={loading}
            disabled={reason.trim() === ''}
          >
            {t('reject.dialog.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
