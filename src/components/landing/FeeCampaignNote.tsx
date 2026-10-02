'use client';

/**
 * `/for-employers` hero — "Đang miễn phí dịch vụ đến hết …" khi quản trị viên đang
 * chạy đợt miễn phí (production, migration 0025). Không có đợt / bản demo / chưa
 * đọc được → không hiện gì (dòng cam kết ở hero vẫn ghi quy tắc 10% thường lệ).
 * Ca đăng trong đợt chỉ miễn phí nếu ngày làm ca không quá hết đợt + 30 ngày —
 * ghi kèm để không hứa quá.
 */

import { useTx } from '@/i18n/LocaleProvider';
import { formatDateVN } from '@/lib/format';

import { useFeeRate } from './useFeeRate';

export function FeeCampaignNote() {
  const tx = useTx();
  const { feeFreeUntil } = useFeeRate();
  if (!feeFreeUntil) return null;
  return (
    <p className="motion-fade-up mx-auto mt-4 max-w-xl rounded-2xl bg-green-50 px-4 py-2.5 text-sm text-green-900 ring-1 ring-green-200 lg:mx-0">
      <span className="font-semibold">
        {tx('Đang miễn phí dịch vụ đến hết {date}.').replace('{date}', formatDateVN(feeFreeUntil))}
      </span>{' '}
      {tx('Áp dụng cho ca làm trong vòng 30 ngày sau đợt.')}
    </p>
  );
}
