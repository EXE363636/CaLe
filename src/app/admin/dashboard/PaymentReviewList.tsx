'use client';

/**
 * 0029 — admin xử giao dịch nạp PayOS bị webhook đánh dấu cần kiểm tra
 * (số tiền lệch, thiếu mã giao dịch, đơn đã huỷ, chuyển thêm…):
 *   - "Cộng X vào ví": X = số tiền PayOS báo nhận, không kèm thưởng nạp ví;
 *   - "Không cộng": admin đã hoàn tay cho người chuyển / giao dịch không hợp lệ.
 * Ghi chú bắt buộc (người nạp thấy). Server chặn admin tự xử giao dịch của mình
 * và cộng trùng (giao dịch gửi lại thiếu mã); client chỉ tắt nút sớm.
 */

import { useEffect, useState } from 'react';

import { Button, Card, Textarea } from '@/components/ui';
import { formatVnDateTime } from '@/components/workerDeposit/vnTime';
import {
  adminListPaymentReviews,
  adminResolvePaymentReview,
  type AdminPaymentReview,
} from '@/data/repos/paymentReviewRepo';
import {
  fillTemplate,
  paymentReviewCreditBlock,
  paymentReviewDismissBlock,
} from '@/domain/paymentReview';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND } from '@/lib/format';
import { showError, showSuccess } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import { vi } from '@/i18n/vi';
import { useT } from '@/i18n/LocaleProvider';

// Điền một lượt: tên người dùng đặt (vd "{email}") không làm sai dòng thông tin.

export function PaymentReviewList() {
  const t = useT();
  const [items, setItems] = useState<AdminPaymentReview[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [failedKey, setFailedKey] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    adminListPaymentReviews()
      .then((r) => {
        if (alive) setItems(r);
      })
      .catch(() => {
        if (alive) setFailedKey(reloadKey);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // Không có gì để xử → không chiếm chỗ trên trang Thống kê.
  if (items && items.length === 0) return null;

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">{t('admin.paymentReview.title')}</h2>
      <p className="mt-1 text-sm text-gray-600">{t('admin.paymentReview.hint')}</p>
      {!items && failedKey === reloadKey ? (
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{t('admin.settings.loadError')}</span>
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            {t('btn.retry')}
          </Button>
        </div>
      ) : !items ? (
        <p className="mt-1 text-sm text-gray-600" role="status">{t('common.loading')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((it) => (
            <ReviewItem key={it.id} item={it} onResolved={() => setReloadKey((k) => k + 1)} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ReviewItem({ item, onResolved }: { item: AdminPaymentReview; onResolved: () => void }) {
  const t = useT();
  const fill = (key: string, map: Record<string, string>) => fillTemplate(t(key), map);
  const adminId = useAuthStore((s) => s.currentUserId) ?? '';
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<null | 'credit' | 'dismiss'>(null);

  const creditBlock = paymentReviewCreditBlock(item, adminId, item.duplicateSuspect);
  const dismissBlock = paymentReviewDismissBlock(item, adminId);
  const noteOk = note.trim().length > 0;

  async function resolve(credit: boolean) {
    setSaving(credit ? 'credit' : 'dismiss');
    try {
      await adminResolvePaymentReview(item.id, credit, note.trim());
      showSuccess(t(credit ? 'admin.paymentReview.credited' : 'admin.paymentReview.dismissed'));
      onResolved();
    } catch (e) {
      showError(toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR'));
    } finally {
      setSaving(null);
    }
  }

  const role = vi[`role.${item.userRole}`] ? t(`role.${item.userRole}`) : item.userRole;
  const blockMsg = creditBlock && creditBlock !== 'ALREADY_REVIEWED'
    ? t(`admin.paymentReview.block.${creditBlock}`)
    : null;

  return (
    <li className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800">
      <p className="font-semibold">{t(`admin.paymentReview.reason.${item.reason}`)}</p>
      <p className="mt-1 text-gray-600">
        {fill('admin.paymentReview.order', {
          code: String(item.orderCode),
          amount: formatVND(item.orderAmount),
          status: t(`admin.paymentReview.orderStatus.${item.orderStatus}`),
          date: formatVnDateTime(item.orderCreatedAt),
        })}
      </p>
      <p className="mt-1 text-gray-600">
        {fill('admin.paymentReview.user', {
          name: item.userName || item.userId.slice(0, 8),
          role,
          email: item.userEmail || '—',
        })}
      </p>
      <p className="mt-1 font-medium">
        {item.paidAmount === null
          ? t('admin.paymentReview.paidUnknown')
          : fill('admin.paymentReview.paid', { amount: formatVND(item.paidAmount) })}
      </p>
      {item.txnRef ? (
        <p className="mt-1 break-all text-gray-600">
          {fill('admin.paymentReview.ref', { ref: item.txnRef })}
        </p>
      ) : (
        <p className="mt-1 text-amber-800">{t('admin.paymentReview.noRef')}</p>
      )}
      <div className="mt-2">
        <Textarea
          id={`payment-review-note-${item.id}`}
          label={t('admin.paymentReview.noteLabel')}
          value={note}
          maxLength={500}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {blockMsg ? (
        <p className="mt-2 text-amber-800">{blockMsg}</p>
      ) : (
        <p className="mt-2 text-xs text-gray-600">{t('admin.paymentReview.creditHint')}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {item.paidAmount !== null && item.paidAmount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            disabled={!noteOk || creditBlock !== null || saving !== null}
            loading={saving === 'credit'}
            onClick={() => void resolve(true)}
          >
            {fill('admin.paymentReview.credit', { amount: formatVND(item.paidAmount) })}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={!noteOk || dismissBlock !== null || saving !== null}
          loading={saving === 'dismiss'}
          onClick={() => void resolve(false)}
        >
          {t('admin.paymentReview.dismiss')}
        </Button>
      </div>
    </li>
  );
}
