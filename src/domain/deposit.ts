/**
 * Deposit calculation for the CaLẻ / ShiftNow MVP.
 *
 * The simulated deposit (Req 3.2) equals:
 *
 *   depositAmount = hourlyWage × hoursPerWorker × positionsTotal
 *
 * Times are 24-hour `HH:mm` strings. Only non-overnight ranges are supported
 * for the MVP — `start` must be strictly earlier than `end` on the same day.
 * Anything else (malformed input, equal times, end ≤ start) returns `0` as
 * a defensive default so the UI can still render a deposit total without
 * throwing. Stores layered above are responsible for surfacing validation
 * errors at form-submit time.
 */

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parse a strict `HH:mm` string into total minutes since midnight.
 * Returns `null` for any malformed input.
 */
function parseHHmm(value: string): number | null {
  if (typeof value !== 'string') return null;
  const match = HHMM_RE.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/**
 * Decimal hours between two same-day `HH:mm` times.
 *
 * Returns `0` when:
 *  - either input is not a valid `HH:mm` string, or
 *  - `end` is not strictly after `start` (overnight ranges are out of scope
 *    for the MVP).
 *
 * @example
 *   hoursBetween('09:00', '12:30'); // 3.5
 *   hoursBetween('22:00', '02:00'); // 0 (overnight, unsupported)
 *   hoursBetween('10:00', '10:00'); // 0
 */
export function hoursBetween(start: string, end: string): number {
  const startMin = parseHHmm(start);
  const endMin = parseHHmm(end);
  if (startMin === null || endMin === null) return 0;
  if (endMin <= startMin) return 0;
  return (endMin - startMin) / 60;
}

/**
 * Simulated deposit total for a shift.
 *
 * `depositAmount = wage × hours × positions`. No clamping or rounding is
 * applied — callers feed integer VND wages and integer positions, and
 * `hoursBetween` already returns a clean fractional hour count, so the
 * product is exact for typical inputs.
 *
 * @example
 *   calculateDeposit(50000, 4, 3); // 600000
 */
export function calculateDeposit(
  wage: number,
  hours: number,
  positions: number,
): number {
  return wage * hours * positions;
}

/**
 * Phí dịch vụ (mô phỏng) — 10% trên tiền công gốc. KHỚP server
 * (create_deposit_session: `v_fee := round(v_wage * 0.10)`).
 */
export const PLATFORM_FEE_RATE = 0.1;

/** Phí dịch vụ trên một khoản tiền công gốc (làm tròn như server). */
export function platformFee(base: number, rate: number = PLATFORM_FEE_RATE): number {
  return Math.round(base * rate);
}

/** Ngày `YYYY-MM-DD` theo giờ Việt Nam (UTC+7, không có giờ mùa hè). */
export function vietnamDate(nowIso: string): string {
  return new Date(Date.parse(nowIso) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * P2-3 (F12) — đợt miễn phí dịch vụ: miễn phí đến HẾT ngày `feeFreeUntil`
 * (giờ Việt Nam). KHỚP server `_platform_fee_rate()` (migration 0025).
 */
export function isFeeFreeActive(feeFreeUntil: string | null, nowIso: string): boolean {
  return feeFreeUntil != null && vietnamDate(nowIso) <= feeFreeUntil;
}

/** Tỉ lệ phí đang áp dụng: 0 trong đợt miễn phí, còn lại `PLATFORM_FEE_RATE`. */
export function effectiveFeeRate(feeFreeUntil: string | null, nowIso: string): number {
  return isFeeFreeActive(feeFreeUntil, nowIso) ? 0 : PLATFORM_FEE_RATE;
}

/**
 * Ca đăng trong đợt chỉ được miễn phí nếu ngày làm ca không quá chừng này
 * ngày sau ngày kết thúc đợt (chủ dự án chốt 29/09 — chặn đăng trước hàng
 * loạt ca ở xa để né phí). KHỚP server `_shift_fee_rate` (migration 0025).
 */
export const FEE_FREE_SHIFT_GRACE_DAYS = 30;

/** Ngày làm ca muộn nhất còn được miễn phí: `feeFreeUntil` + 30 ngày. */
export function feeFreeShiftDeadline(feeFreeUntil: string): string {
  const d = new Date(`${feeFreeUntil}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + FEE_FREE_SHIFT_GRACE_DAYS);
  return d.toISOString().slice(0, 10);
}

/** Ca `shiftDate` đăng lúc `nowIso` có được miễn phí dịch vụ không. */
export function isFeeFreeForShift(
  feeFreeUntil: string | null,
  shiftDate: string,
  nowIso: string,
): boolean {
  if (!feeFreeUntil || !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) return false;
  return isFeeFreeActive(feeFreeUntil, nowIso) && shiftDate <= feeFreeShiftDeadline(feeFreeUntil);
}

/** Tỉ lệ phí cho một ca cụ thể (0 nếu `isFeeFreeForShift`). */
export function shiftFeeRate(
  feeFreeUntil: string | null,
  shiftDate: string,
  nowIso: string,
): number {
  return isFeeFreeForShift(feeFreeUntil, shiftDate, nowIso) ? 0 : PLATFORM_FEE_RATE;
}

/**
 * Số dư cần đảm bảo THẬT khi đăng ca (supabase) = tiền công gốc + 10% phí.
 * Đây là số tiền server trừ khỏi ví employer khi giữ cọc, nên UI hiển thị số
 * này để employer biết cần bao nhiêu số dư ví.
 *
 * @example calculateDepositWithFee(50000, 3, 1); // 150000 + 15000 = 165000
 */
export function calculateDepositWithFee(
  wage: number,
  hours: number,
  positions: number,
  rate: number = PLATFORM_FEE_RATE,
): number {
  const base = serverWageTotal(wage, hours, positions);
  return base + platformFee(base, rate);
}

/**
 * Tiền công gốc làm tròn ĐÚNG như server (`compute_shift_amount`:
 * `round(lương × giờ × vị trí)`). Tính qua số phút nguyên để tránh sai số
 * float ở mốc ,5 đồng; phí phải tính trên số đã làm tròn này.
 *
 * @example serverWageTotal(25000, 140 / 60, 1); // 58333 (không phải 58333,33)
 */
export function serverWageTotal(wage: number, hours: number, positions: number): number {
  const minutes = Math.round(hours * 60);
  return Math.round((wage * minutes * positions) / 60);
}
