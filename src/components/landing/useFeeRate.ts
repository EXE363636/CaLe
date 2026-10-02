'use client';

/**
 * Phí dịch vụ đang áp dụng cho khách xem trang `/for-employers` (03/10).
 *
 * - Bản demo: 0 (chưa thu phí).
 * - Production: 10%, trừ khi quản trị viên đang chạy đợt miễn phí (migration 0025,
 *   RPC công khai `get_fee_settings`) → 0 và trả về ngày hết đợt để trang ghi
 *   "Miễn phí (đợt đến hết …)". Chưa đọc được (đang tải / lỗi mạng) → coi như 10%:
 *   không bao giờ hứa miễn phí khi chưa chắc.
 *
 * Ca đăng trong đợt chỉ miễn phí nếu ngày làm ca không quá hết đợt + 30 ngày
 * (`isFeeFreeForShift`); trang chỉ là ví dụ nên ghi chú điều này ở chỗ hiện đợt.
 */

import { useEffect, useState } from 'react';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { getFeeSettings } from '@/data/repos/feeRepo';
import { isFeeFreeActive, PLATFORM_FEE_RATE } from '@/domain/deposit';

export function useFeeRate(): { live: boolean; rate: number; feeFreeUntil: string | null } {
  const live = isSupabaseEnv();
  // Ngày hết đợt miễn phí, chỉ khi đợt đang chạy lúc đọc (giờ Việt Nam).
  const [feeFreeUntil, setFeeFreeUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    getFeeSettings()
      .then((s) => {
        if (alive && isFeeFreeActive(s.feeFreeUntil, new Date().toISOString())) setFeeFreeUntil(s.feeFreeUntil);
      })
      .catch(() => {
        /* Không đọc được → giữ 10% (không hứa miễn phí). */
      });
    return () => {
      alive = false;
    };
  }, [live]);

  if (!live) return { live, rate: 0, feeFreeUntil: null };
  return { live, rate: feeFreeUntil ? 0 : PLATFORM_FEE_RATE, feeFreeUntil };
}
