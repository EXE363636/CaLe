'use client';

/**
 * P2-1 (0028) — người lao động xác nhận số tiền cọc TRƯỚC khi ví bị trừ.
 * Số đã đồng ý được gửi lên `apply_with_deposit`; server từ chối nếu số thật lớn hơn.
 */

import { Button, Modal } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { useT } from '@/i18n/LocaleProvider';

interface Props {
  open: boolean;
  amount: number;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function WorkerDepositConfirmModal({ open, amount, loading, onConfirm, onClose }: Props) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('workerDeposit.confirm.title')}>
      <p className="text-sm text-gray-700">
        {t('workerDeposit.confirm.body').replace('{amount}', formatVND(amount))}
      </p>
      <p className="mt-2 text-sm text-gray-700">{t('workerDeposit.confirm.noShow')}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {t('workerDeposit.confirm.cancel')}
        </Button>
        <Button variant="primary" onClick={onConfirm} loading={loading}>
          {t('workerDeposit.confirm.submit')}
        </Button>
      </div>
    </Modal>
  );
}
