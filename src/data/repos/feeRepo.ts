/**
 * P2-3 (F12) — cài đặt phí dịch vụ: đợt miễn phí `fee_free_until` (0025).
 *
 * `get_fee_settings` công khai (không bí mật); `admin_set_fee_free_until`
 * chỉ admin (server kiểm `is_admin()`).
 */

import { getSupabaseClient } from '@/data/supabaseClient';

export interface FeeSettings {
  /** Ngày `YYYY-MM-DD` (giờ Việt Nam) miễn phí đến hết; null = không có đợt. */
  feeFreeUntil: string | null;
}

export async function getFeeSettings(): Promise<FeeSettings> {
  const { data, error } = await getSupabaseClient().rpc('get_fee_settings');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    feeFreeUntil: typeof o.feeFreeUntil === 'string' ? o.feeFreeUntil : null,
  };
}

/** Đặt ngày miễn phí đến hết (`YYYY-MM-DD`), hoặc null để tắt. */
export async function adminSetFeeFreeUntil(until: string | null): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_set_fee_free_until', {
    p_until: until,
  });
  if (error) throw new Error(error.message);
}
