'use client';

/**
 * PayoutHealthBanner — cảnh báo admin khi Kênh chi PayOS (ví Bảo Kim) hết tiền.
 *
 * Tiền nạp vào TK thu, tiền rút lấy từ TK chi: PayOS không tự chuyển thu → chi,
 * nên quỹ chi phải được nạp tay. Lệnh rút gặp quỹ cạn sẽ FAILED (tiền tự hoàn
 * về ví người dùng) — banner này để admin biết mà nạp quỹ. Chỉ đọc khi mount
 * (không polling). Chỉ mount ở chế độ supabase.
 */

import { useEffect, useState } from 'react';
import { getPayoutHealth, type PayoutHealth } from '@/data/repos/walletRepo';
import { formatLogDateTime } from '@/lib/format';
import { t } from '@/i18n/vi';

export function PayoutHealthBanner() {
  const [health, setHealth] = useState<PayoutHealth | null>(null);

  useEffect(() => {
    let alive = true;
    getPayoutHealth()
      .then((h) => {
        if (alive) setHealth(h);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!health) return null;
  const lowFunds = health.insufficientFailures24h > 0;
  if (!lowFunds && health.processingCount === 0) return null;

  return (
    <div
      role={lowFunds ? 'alert' : 'status'}
      className={
        lowFunds
          ? 'mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200'
          : 'mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200'
      }
    >
      {lowFunds && (
        <>
          <p className="font-semibold">{t('admin.payoutHealth.lowFunds.title')}</p>
          <p className="mt-1">
            {t('admin.payoutHealth.lowFunds.body').replace(
              '{count}',
              String(health.insufficientFailures24h),
            )}
            {health.lastInsufficientAt &&
              ` ${t('admin.payoutHealth.lowFunds.last')} ${formatLogDateTime(
                health.lastInsufficientAt,
              )}.`}
          </p>
        </>
      )}
      {health.processingCount > 0 && (
        <p className={lowFunds ? 'mt-1' : ''}>
          {t('admin.payoutHealth.processing').replace(
            '{count}',
            String(health.processingCount),
          )}
        </p>
      )}
    </div>
  );
}
