'use client';

/**
 * PayoutHealthBanner — cảnh báo admin khi Kênh chi PayOS (ví Bảo Kim) hết tiền,
 * và (0033) khi có ca còn cọc kẹt HELD quá hạn tự chốt.
 *
 * Tiền nạp vào TK thu, tiền rút lấy từ TK chi: PayOS không tự chuyển thu → chi,
 * nên quỹ chi phải được nạp tay. Lệnh rút gặp quỹ cạn sẽ FAILED (tiền tự hoàn
 * về ví người dùng) — banner này để admin biết mà nạp quỹ. Chỉ đọc khi mount
 * (không polling). Chỉ mount ở chế độ supabase.
 */

import { useEffect, useState } from 'react';
import { getPayoutHealth, type PayoutHealth } from '@/data/repos/walletRepo';
import { formatLogDateTime } from '@/lib/format';
import { useT } from '@/i18n/LocaleProvider';

export function PayoutHealthBanner() {
  const t = useT();
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
  // 0033: ca lượt tự chốt bỏ qua vì lỗi → tiền công / cọc kẹt, cần admin xử.
  const stuck = health.stuckDeposits > 0;
  const urgent = lowFunds || stuck;
  if (!urgent && health.processingCount === 0) return null;

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={
        urgent
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
      {stuck && (
        <p className={lowFunds ? 'mt-1 font-semibold' : 'font-semibold'}>
          {t('admin.payoutHealth.stuckDeposits').replace('{count}', String(health.stuckDeposits))}
        </p>
      )}
      {health.processingCount > 0 && (
        <p className={urgent ? 'mt-1' : ''}>
          {t('admin.payoutHealth.processing').replace(
            '{count}',
            String(health.processingCount),
          )}
        </p>
      )}
    </div>
  );
}
