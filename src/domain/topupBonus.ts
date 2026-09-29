/**
 * P2-2 (F10) — thưởng nạp ví cho nhà tuyển dụng.
 *
 * Tiền thưởng nằm ở "túi thưởng" (`wallets.promo_balance`), tách khỏi tiền
 * mặt: CHỈ dùng trả phí dịch vụ, không trả tiền công, không rút, không hết hạn.
 * Các hàm dưới đây là logic thuần, KHỚP server migration 0026:
 *   - `topUpBonusFor`          ↔ credit_wallet_from_payment
 *   - `splitDepositFunding`    ↔ confirm_deposit_session
 *   - `splitDepositSettlement` ↔ _finalize_shift_deposit
 */

export interface TopUpBonusRule {
  /** Số tiền nạp tối thiểu (đồng) để được thưởng. */
  minAmount: number;
  /** Tiền thưởng mỗi lần (đồng). 0 = chương trình tắt. */
  bonusAmount: number;
  /** Số lần thưởng tối đa mỗi nhà tuyển dụng. */
  maxPerUser: number;
}

/** Tiền thưởng cho một lần nạp `amount`, khi người này đã nhận `timesReceived` lần. */
export function topUpBonusFor(
  amount: number,
  rule: TopUpBonusRule,
  timesReceived: number,
): number {
  if (rule.bonusAmount <= 0 || rule.minAmount <= 0) return 0;
  if (amount < rule.minAmount) return 0;
  if (timesReceived >= rule.maxPerUser) return 0;
  return rule.bonusAmount;
}

/**
 * Giữ cọc: tiền thưởng trả PHÍ trước (tối đa bằng phí), phần còn lại — gồm
 * toàn bộ tiền công — trừ tiền mặt.
 */
export function splitDepositFunding(
  amount: number,
  fee: number,
  promoBalance: number,
): { promoUse: number; cashNeeded: number } {
  const promoUse = Math.max(0, Math.min(promoBalance, fee));
  return { promoUse, cashNeeded: amount - promoUse };
}

/**
 * Chốt cọc: `refund` (tổng hoàn) và `feeKept` (phí giữ lại) tính như cũ; chia
 * theo phần đã trả bằng thưởng `promoUsed`:
 *   - phí giữ lại lấy từ phần thưởng trước (`feeKeptPromo` là doanh thu bỏ qua —
 *     KHÔNG chuyển thành tiền thật vào ví admin);
 *   - phần thưởng chưa dùng hoàn về TÚI THƯỞNG, không bao giờ thành tiền mặt.
 */
export function splitDepositSettlement(input: {
  refund: number;
  feeKept: number;
  promoUsed: number;
}): { feeKeptPromo: number; feeKeptCash: number; refundPromo: number; refundCash: number } {
  const feeKeptPromo = Math.min(input.promoUsed, input.feeKept);
  const refundPromo = Math.max(0, Math.min(input.promoUsed - feeKeptPromo, input.refund));
  return {
    feeKeptPromo,
    feeKeptCash: input.feeKept - feeKeptPromo,
    refundPromo,
    refundCash: input.refund - refundPromo,
  };
}
