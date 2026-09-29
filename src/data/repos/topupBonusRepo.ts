/**
 * P2-2 (F10) — chương trình thưởng nạp ví (migration 0026).
 *
 * `get_topup_bonus` (đã đăng nhập): mức nạp, tiền thưởng, số lần tối đa + số
 * lần mình đã nhận. `admin_set_topup_bonus` chỉ admin (server kiểm is_admin()).
 * Tiền thưởng do SERVER cộng khi đơn nạp PayOS được xác nhận — client chỉ hiển thị.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { TopUpBonusRule } from '@/domain/topupBonus';

export interface TopUpBonusInfo extends TopUpBonusRule {
  timesReceived: number;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

export async function getTopUpBonus(): Promise<TopUpBonusInfo> {
  const { data, error } = await getSupabaseClient().rpc('get_topup_bonus');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    minAmount: num(o.minAmount),
    bonusAmount: num(o.bonusAmount),
    maxPerUser: num(o.maxPerUser),
    timesReceived: num(o.timesReceived),
  };
}

export async function adminSetTopUpBonus(rule: TopUpBonusRule): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_set_topup_bonus', {
    p_min: rule.minAmount,
    p_amount: rule.bonusAmount,
    p_max_per_user: rule.maxPerUser,
  });
  if (error) throw new Error(error.message);
}
