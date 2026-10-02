/**
 * Máy tính chi phí một ca ở `/for-employers` ("Thử đăng một ca", 03/10).
 *
 * Dùng đúng hàm tiền của app (`hoursBetween`, `serverWageTotal`, `platformFee`) nên
 * số khớp form đăng ca và server:
 *   - giữ từ ví = tiền công (làm tròn như `compute_shift_amount`) + phí;
 *   - có người vắng → chỉ trả người đã làm, phí chỉ trên phần đó, phần còn lại
 *     (cả phí) hoàn về ví — giống `sampleLedger` và khối "Tiền của bạn đi đâu?".
 * `rate` = 0 khi bản demo (chưa thu phí) hoặc đang trong đợt miễn phí.
 */

import { hoursBetween, platformFee, serverWageTotal } from '@/domain/deposit';

export interface ShiftCostInput {
  wage: number;
  start: string;
  end: string;
  people: number;
  absent: number;
  rate: number;
}

export interface ShiftCost {
  hours: number;
  /** Tiền công cả ca (mọi vị trí). */
  wages: number;
  /** Phí trên tiền công cả ca — phần được giữ cùng lúc đăng ca. */
  fee: number;
  held: number;
  /** Trả cho người đã làm. */
  paid: number;
  /** Phí giữ lại (chỉ trên phần ca có người làm). */
  paidFee: number;
  refund: number;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Trần ô lương / giờ trên trang — chỉ để ô nhập không phình. */
export const MONEY_INPUT_MAX = 10_000_000;

export function shiftCostBreakdown(input: ShiftCostInput): ShiftCost | null {
  const { wage, start, end, people, rate } = input;
  if (!HHMM.test(start) || !HHMM.test(end)) return null;
  const hours = hoursBetween(start, end);
  if (hours <= 0 || wage <= 0 || people < 1) return null;
  const absent = Math.max(0, Math.min(people, Math.floor(input.absent)));
  const wages = serverWageTotal(wage, hours, people);
  const fee = platformFee(wages, rate);
  const held = wages + fee;
  const paid = serverWageTotal(wage, hours, people - absent);
  const paidFee = platformFee(paid, rate);
  return { hours, wages, fee, held, paid, paidFee, refund: held - paid - paidFee };
}

/** Số tiền từ ô nhập ("45.000", "45,000 đ" → 45000), chặn trần. */
export function parseMoneyInput(raw: string): number {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  return digits ? Math.min(Number(digits), MONEY_INPUT_MAX) : 0;
}
