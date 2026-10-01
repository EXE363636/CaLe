/**
 * P2-1 (F9) — cọc người lao động ("cọc hai đầu").
 *
 * Chủ dự án chốt 29–30/09:
 *   - Cọc = 50% tiền công ca, tối đa 100.000 đ. Giữ lúc ỨNG TUYỂN.
 *   - Miễn cọc: đã duyệt CCCD, hoặc ≥5 ca hoàn thành trong 30 ngày gần nhất.
 *   - Vắng mặt (không bị admin xử có lợi cho worker) trong 30 ngày → LUÔN cọc.
 *   - Hoàn đủ: hoàn thành, bị từ chối, huỷ (bất kỳ bên), ca bắt đầu mà đơn còn chờ.
 *   - Vắng mặt → giữ tới hạn khiếu nại (72 giờ) rồi 100% về ví tiền mặt nhà
 *     tuyển dụng. Khiếu nại trong hạn → admin quyết.
 *   - Cờ mặc định TẮT.
 * Sau security review 30/09 (chủ dự án duyệt):
 *   - Mỗi worker tối đa 3 khoản cọc đang giữ / khiếu nại cùng lúc.
 *   - Mỗi NTD tự nhận tối đa 300.000 đ cọc vắng mặt / 24 giờ; vượt → chờ admin.
 *   - Khoản giữ quá 7 ngày sau hết ca mà đơn chưa kết thúc → hoàn dự phòng.
 *   - Hệ thống tự đánh vắng (NTD không xác nhận) → cọc chờ admin, không tự chuyển.
 *
 * Logic thuần, KHỚP server migration 0028:
 *   - `workerDepositAmount`       ↔ _worker_deposit_amount
 *   - `workerDepositExemption`    ↔ _worker_deposit_status
 *   - `workerDepositLimitReached` ↔ _apply_with_worker_deposit (WORKER_DEPOSIT_LIMIT)
 *   - `noShowForfeitDeadline`     ↔ _worker_hold_forfeit_deadline
 *   - `forfeitReviewReason`       ↔ _settle_worker_holds_overdue (AUTO_NO_SHOW / EMPLOYER_DAILY_CAP)
 *   - `workerHoldOutcome`         ↔ trigger hoàn cọc + _settle_worker_holds_overdue
 */

import { hoursBetween } from './deposit';

export interface WorkerDepositSettings {
  /** `platform_settings.require_worker_deposit`. */
  enabled: boolean;
  /** Tỉ lệ cọc theo tiền công ca (%, 0–100). */
  ratioPct: number;
  /** Trần cọc mỗi đơn (đồng). */
  maxAmount: number;
  /** Số ca hoàn thành trong cửa sổ để được miễn cọc. */
  exemptAfter: number;
  /** Cửa sổ trượt (ngày) cho cả "đủ ca" lẫn "mất quyền miễn sau vắng mặt". */
  windowDays: number;
  /** Số khoản cọc đang giữ / khiếu nại tối đa của một worker. */
  maxOpenHolds: number;
  /** Tổng cọc vắng mặt TỰ chuyển cho một NTD trong 24 giờ (đồng); vượt → chờ admin. */
  forfeitDailyCap: number;
}

export const DEFAULT_WORKER_DEPOSIT_SETTINGS: WorkerDepositSettings = {
  enabled: false,
  ratioPct: 50,
  maxAmount: 100000,
  exemptAfter: 5,
  windowDays: 30,
  maxOpenHolds: 3,
  forfeitDailyCap: 300000,
};

/** Hạn khiếu nại vắng mặt (giờ), tính từ max(hết ca, lúc bị đánh vắng). */
export const NO_SHOW_CONTEST_HOURS = 72;
/** Khoản giữ chưa xử lý được quá số ngày này sau hết ca → hoàn dự phòng. */
export const WORKER_HOLD_STALE_DAYS = 7;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Tiền công một vị trí của ca — khớp server `approve`: round(lương giờ × số giờ). */
export function workerShiftWage(hourlyWage: number, startTime: string, endTime: string): number {
  return Math.round(hourlyWage * hoursBetween(startTime, endTime));
}

/** Cọc của một đơn = min(round(tiền công ca × tỉ lệ), trần). */
export function workerDepositAmount(
  wage: number,
  settings: Pick<WorkerDepositSettings, 'ratioPct' | 'maxAmount'>,
): number {
  const raw = Math.round((Math.max(0, wage) * settings.ratioPct) / 100);
  return Math.max(0, Math.min(raw, settings.maxAmount));
}

/** Worker đã giữ đủ số khoản cọc cho phép (Held + Contested) → không giữ thêm. */
export function workerDepositLimitReached(openHolds: number, maxOpenHolds: number): boolean {
  return openHolds >= maxOpenHolds;
}

/**
 * Chuyển thêm `amount` cho NTD đã tự nhận `forfeitedLast24h` trong 24 giờ qua
 * có vượt trần không — vượt thì khoản chuyển sang chờ admin, không tự chuyển.
 */
export function forfeitNeedsReview(forfeitedLast24h: number, amount: number, dailyCap: number): boolean {
  return forfeitedLast24h + amount > dailyCap;
}

export type ForfeitReviewReason = 'AUTO_NO_SHOW' | 'EMPLOYER_DAILY_CAP';

/**
 * Cọc vắng mặt đã quá hạn khiếu nại: tự chuyển cho NTD (null) hay chờ admin.
 *   - AUTO_NO_SHOW: hệ thống tự đánh vắng (0019, NTD không xác nhận gì) —
 *     không có căn cứ từ NTD nên admin duyệt (chủ dự án chốt 30/09).
 *   - EMPLOYER_DAILY_CAP: NTD đã tự nhận quá trần 24 giờ.
 */
export function forfeitReviewReason(input: {
  autoMarkedNoShow: boolean;
  forfeitedLast24h: number;
  amount: number;
  dailyCap: number;
}): ForfeitReviewReason | null {
  if (input.autoMarkedNoShow) return 'AUTO_NO_SHOW';
  if (forfeitNeedsReview(input.forfeitedLast24h, input.amount, input.dailyCap)) return 'EMPLOYER_DAILY_CAP';
  return null;
}

export type WorkerDepositReason =
  | 'DISABLED'
  | 'IDENTITY'
  | 'COMPLETED_SHIFTS'
  | 'RECENT_NO_SHOW'
  | 'NOT_ENOUGH';

export interface WorkerDepositExemption {
  needsDeposit: boolean;
  reason: WorkerDepositReason;
  /** Số ca hoàn thành có giờ kết thúc trong cửa sổ (now − windowDays, now]. */
  completedInWindow: number;
  /** Mất quyền miễn tới lúc này (lần vắng gần nhất + windowDays); null nếu không bị chặn. */
  blockedUntil: string | null;
}

export function workerDepositExemption(input: {
  identityVerifiedAt: string | null;
  /** Giờ kết thúc ca (ISO) của các đơn đã hoàn thành (Confirmed). */
  completedShiftEnds: string[];
  /**
   * Lúc bị đánh vắng (ISO) của các đơn còn NoShow, trừ đơn admin xử có lợi cho
   * worker (khoản cọc xử cho worker, hoặc khiếu nại không kèm cọc được chấp nhận).
   */
  noShowAts: string[];
  nowIso: string;
  settings: WorkerDepositSettings;
}): WorkerDepositExemption {
  const { settings } = input;
  const now = Date.parse(input.nowIso);
  const windowMs = settings.windowDays * DAY_MS;
  const since = now - windowMs;

  const completedInWindow = input.completedShiftEnds.filter((iso) => {
    const t = Date.parse(iso);
    return t > since && t <= now;
  }).length;

  const lastNoShow = input.noShowAts.reduce(
    (max, iso) => Math.max(max, Date.parse(iso)),
    Number.NEGATIVE_INFINITY,
  );
  const blockedUntilMs = lastNoShow + windowMs;
  const blockedUntil = now < blockedUntilMs ? new Date(blockedUntilMs).toISOString() : null;

  if (!settings.enabled) {
    return { needsDeposit: false, reason: 'DISABLED', completedInWindow, blockedUntil };
  }
  if (blockedUntil) {
    return { needsDeposit: true, reason: 'RECENT_NO_SHOW', completedInWindow, blockedUntil };
  }
  if (input.identityVerifiedAt) {
    return { needsDeposit: false, reason: 'IDENTITY', completedInWindow, blockedUntil };
  }
  if (completedInWindow >= settings.exemptAfter) {
    return { needsDeposit: false, reason: 'COMPLETED_SHIFTS', completedInWindow, blockedUntil };
  }
  return { needsDeposit: true, reason: 'NOT_ENOUGH', completedInWindow, blockedUntil };
}

/**
 * Hạn khiếu nại vắng mặt = muộn hơn trong hai mốc (hết ca, lúc bị đánh vắng)
 * + 72 giờ — hệ thống tự đánh vắng lúc hết ca + 24h vẫn cho worker đủ 72 giờ.
 */
export function noShowForfeitDeadline(shiftEndIso: string, noShowAtIso: string): string {
  const t = Math.max(Date.parse(shiftEndIso), Date.parse(noShowAtIso)) + NO_SHOW_CONTEST_HOURS * HOUR_MS;
  return new Date(t).toISOString();
}

export type WorkerHoldStatus = 'Held' | 'Contested' | 'Refunded' | 'Forfeited';
export type WorkerHoldOutcome = 'refund' | 'forfeit' | 'keep';

/** Trạng thái đơn → hoàn cọc ngay. */
export const WORKER_HOLD_REFUND_STATUSES = [
  'Rejected',
  'CancelledByWorker',
  'CancelledByEmployer',
  'Expired',
  'Confirmed',
] as const;

export function workerHoldOutcome(input: {
  holdStatus: WorkerHoldStatus;
  appStatus: string;
  shiftStartIso: string;
  shiftEndIso: string;
  /** noShowForfeitDeadline(...) khi đơn NoShow; null nếu chưa có. */
  forfeitDeadlineIso: string | null;
  nowIso: string;
}): WorkerHoldOutcome {
  // Contested → admin quyết; Refunded/Forfeited → đã xử lý xong.
  if (input.holdStatus !== 'Held') return 'keep';
  if ((WORKER_HOLD_REFUND_STATUSES as readonly string[]).includes(input.appStatus)) return 'refund';
  const now = Date.parse(input.nowIso);
  if (input.appStatus === 'Pending') {
    return now >= Date.parse(input.shiftStartIso) ? 'refund' : 'keep';
  }
  if (input.appStatus === 'NoShow') {
    if (!input.forfeitDeadlineIso) return 'keep';
    return now >= Date.parse(input.forfeitDeadlineIso) ? 'forfeit' : 'keep';
  }
  // Dự phòng: đơn chưa kết thúc mà ca đã qua 7 ngày → hoàn (tiền không kẹt mãi).
  return now >= Date.parse(input.shiftEndIso) + WORKER_HOLD_STALE_DAYS * DAY_MS ? 'refund' : 'keep';
}

/** Tiền đi đâu khi xử lý khoản giữ. CaLẻ không giữ phần nào. */
export function workerHoldSettlement(
  amount: number,
  outcome: WorkerHoldOutcome,
): { workerCredit: number; employerCredit: number } {
  if (outcome === 'refund') return { workerCredit: amount, employerCredit: 0 };
  if (outcome === 'forfeit') return { workerCredit: 0, employerCredit: amount };
  return { workerCredit: 0, employerCredit: 0 };
}
