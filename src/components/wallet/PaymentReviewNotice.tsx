'use client';

/**
 * 0029 — trong ví (production): các giao dịch nạp PayOS bị webhook đánh dấu cần
 * kiểm tra, để người nạp biết tiền không "mất" mà đang chờ quản trị viên, và
 * xem kết quả (đã cộng bao nhiêu / không cộng + ghi chú).
 * Hiện: dòng đang chờ + dòng đã xử lý trong 30 ngày. Ẩn khi không có gì.
 */

import { useEffect, useState } from 'react';

import { listMyPaymentReviews, type MyPaymentReview } from '@/data/repos/paymentReviewRepo';
import { fillTemplate, paymentReviewSummary } from '@/domain/paymentReview';
import { formatVND } from '@/lib/format';
import { useT, useTx } from '@/i18n/LocaleProvider';

const RECENT_MS = 30 * 86_400_000;
const MAX_ROWS = 3;


function tone(status: MyPaymentReview['status']): string {
  if (status === 'Credited') return 'bg-green-50 text-green-800 ring-green-200';
  if (status === 'Dismissed') return 'bg-gray-100 text-gray-700 ring-gray-200';
  return 'bg-amber-50 text-amber-800 ring-amber-200';
}

export function PaymentReviewNotice({
  reloadSignal = 0,
  compact = false,
}: {
  reloadSignal?: number;
  /** Một dòng tóm tắt (ô ví trên dashboard); danh sách đầy đủ ở hộp lịch sử giao dịch. */
  compact?: boolean;
}) {
  const t = useT();
  const tx = useTx();
  const fill = (key: string, map: Record<string, string>) => fillTemplate(t(key), map);
  const [rows, setRows] = useState<MyPaymentReview[]>([]);

  useEffect(() => {
    let alive = true;
    listMyPaymentReviews()
      .then((r) => {
        if (!alive) return;
        const cutoff = Date.now() - RECENT_MS;
        setRows(
          r.filter(
            (x) => x.status === 'Pending' || (x.resolvedAt !== null && Date.parse(x.resolvedAt) >= cutoff),
          ),
        );
      })
      // Không tải được thì thôi: khu này chỉ để thông tin, không chặn ví.
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [reloadSignal]);

  if (rows.length === 0) return null;
  const { pendingCount } = paymentReviewSummary(rows);
  if (compact) {
    if (pendingCount === 0) return null;
    return (
      <p className="mt-2 text-xs font-semibold text-amber-800">
        {tx('{n} giao dịch nạp đang được kiểm tra.').replace('{n}', String(pendingCount))}
      </p>
    );
  }

  return (
    <div className="mt-3" role="region" aria-label={t('wallet.review.title')}>
      <p className="mb-1 text-xs font-medium text-gray-700">{t('wallet.review.title')}</p>
      {pendingCount > 0 && <p className="mb-2 text-xs text-gray-600">{t('wallet.review.hint')}</p>}
      <ul className="flex flex-col gap-2">
        {rows.slice(0, MAX_ROWS).map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs"
          >
            <div className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900">
                {r.paidAmount === null
                  ? fill('wallet.review.rowUnknown', { amount: formatVND(r.orderAmount) })
                  : fill('wallet.review.row', {
                      paid: formatVND(r.paidAmount),
                      amount: formatVND(r.orderAmount),
                    })}
              </span>
              {r.resolutionNote && r.status !== 'Pending' && (
                <span className="mt-0.5 block whitespace-pre-line text-gray-700">
                  {fill('wallet.review.note', { note: r.resolutionNote })}
                </span>
              )}
              <span className="mt-0.5 block text-gray-600">
                {fill('wallet.review.support', { code: String(r.orderCode) })}
              </span>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tone(r.status)}`}>
              {r.status === 'Credited'
                ? fill('wallet.review.status.Credited', { amount: formatVND(r.creditedAmount ?? 0) })
                : t(`wallet.review.status.${r.status}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
