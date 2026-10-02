/**
 * Dữ liệu MẪU cho các minh hoạ landing (biên nhận trang chủ, minh hoạ người lao
 * động / nhà tuyển dụng). Mỗi vòng lặp minh hoạ chuyển sang ca mẫu kế tiếp để
 * khách thấy nhiều loại việc. Không phải ca / người thật — mọi minh hoạ ghi rõ
 * "Minh hoạ … số liệu là ví dụ".
 *
 * Chuỗi tiếng Việt ở đây được dịch qua `tx(...)` khi hiển thị; bản tiếng Anh nằm ở
 * `en-landing.ts` (test `i18nEnglish.test.ts` kiểm đủ).
 */

import { platformFee, serverWageTotal } from '@/domain/deposit';

export interface LandingSampleShift {
  title: string;
  /** Thứ trong tuần, dạng "Thứ 7" / "Chủ nhật". */
  day: string;
  start: string;
  end: string;
  /** Lương theo giờ (đồng). */
  wage: number;
  hours: number;
  people: number;
  /** Số dư ví của người lao động mẫu TRƯỚC ca này (mỗi ca một người khác nhau). */
  walletBefore: number;
  /** Số dư ví của nhà tuyển dụng mẫu TRƯỚC khi đăng ca (≥ số tiền phải giữ). */
  employerWallet: number;
  /** Có lý do → minh hoạ nhà tuyển dụng diễn cảnh ca bị huỷ trước khi duyệt ai
   *  (hoàn đủ tiền đã giữ về ví). Lý do là ví dụ do nhóm viết. */
  cancelReason?: string;
  /** Số người được duyệt nhưng vắng mặt (03/10): biên nhận chỉ trả người đã làm và
   *  hoàn phần của người vắng; minh hoạ nhà tuyển dụng đánh dấu "Vắng mặt" + hoàn ví. */
  noShow?: number;
  /** Người lao động mẫu ứng tuyển nhưng không được chọn (nhà tuyển dụng đã đủ người). */
  workerNotSelected?: boolean;
}

/** 8 ca mẫu — đủ loại việc trong form đăng ca (+ phụ bếp, đăng dưới "Khác"). Không phải
 *  vòng nào cũng suôn sẻ (03/10): 2 ca bị huỷ, 2 ca có người vắng, 1 ca người lao động
 *  không được chọn — ba minh hoạ đọc chung dữ liệu nên cùng một ca khớp nhau ở cả ba. */
export const LANDING_SAMPLE_SHIFTS: LandingSampleShift[] = [
  { title: 'Phụ bếp quán lẩu', day: 'Thứ 7', start: '17:00', end: '21:00', wage: 45_000, hours: 4, people: 1, walletBefore: 1_280_000, employerWallet: 2_400_000 },
  { title: 'Phục vụ tiệc cưới', day: 'Thứ 7', start: '17:00', end: '22:00', wage: 80_000, hours: 5, people: 3, walletBefore: 460_000, employerWallet: 3_500_000 },
  { title: 'Pha chế quán cà phê', day: 'Thứ 3', start: '07:00', end: '11:00', wage: 35_000, hours: 4, people: 1, walletBefore: 2_150_000, employerWallet: 1_150_000 },
  { title: 'Kiểm hàng kho', day: 'Thứ 5', start: '08:00', end: '12:00', wage: 38_000, hours: 4, people: 2, walletBefore: 735_000, employerWallet: 2_000_000, cancelReason: 'Lô hàng về trễ, kho dời lịch kiểm sang tuần sau.' },
  { title: 'Hỗ trợ sự kiện ra mắt', day: 'Thứ 6', start: '15:00', end: '20:00', wage: 50_000, hours: 5, people: 4, walletBefore: 1_020_000, employerWallet: 4_800_000, noShow: 1 },
  { title: 'Thu ngân siêu thị mini', day: 'Thứ 2', start: '18:00', end: '22:00', wage: 32_000, hours: 4, people: 1, walletBefore: 318_000, employerWallet: 900_000, workerNotSelected: true },
  { title: 'Phát tờ rơi khai trương', day: 'Chủ nhật', start: '08:00', end: '11:00', wage: 30_000, hours: 3, people: 2, walletBefore: 890_000, employerWallet: 1_600_000, cancelReason: 'Mưa lớn, cửa hàng lùi ngày khai trương.' },
  { title: 'Phục vụ nhà hàng buffet', day: 'Thứ 6', start: '18:00', end: '22:00', wage: 42_000, hours: 4, people: 2, walletBefore: 1_560_000, employerWallet: 2_750_000, noShow: 1 },
];

/** 8 tài khoản người lao động mẫu (tên + chữ viết tắt cho ảnh đại diện). */
/** `rating` / `shifts`: điểm sao trung bình + số đánh giá — thứ nhà tuyển dụng thấy
 *  trên thẻ ứng viên ở CẢ demo lẫn bản thật (đánh giá hai chiều, 0024). */
export const LANDING_SAMPLE_WORKERS: Array<{ name: string; initials: string; rating: number; reviews: number }> = [
  { name: 'Minh Anh', initials: 'MA', rating: 4.8, reviews: 12 },
  { name: 'Quốc Bảo', initials: 'QB', rating: 4.6, reviews: 7 },
  { name: 'Thu Hà', initials: 'TH', rating: 4.9, reviews: 21 },
  { name: 'Gia Huy', initials: 'GH', rating: 4.5, reviews: 4 },
  { name: 'Ngọc Trâm', initials: 'NT', rating: 4.7, reviews: 9 },
  { name: 'Đức Long', initials: 'ĐL', rating: 4.4, reviews: 5 },
  { name: 'Khánh Linh', initials: 'KL', rating: 5, reviews: 3 },
  { name: 'Hoàng Nam', initials: 'HN', rating: 4.8, reviews: 15 },
];

/** Ca mẫu thứ `round` tính từ `start` (vòng quanh danh sách). */
export function sampleShift(start: number, round: number): LandingSampleShift {
  const n = LANDING_SAMPLE_SHIFTS.length;
  return LANDING_SAMPLE_SHIFTS[(((start + round) % n) + n) % n];
}

/** Tối đa 3 người ứng tuyển mẫu cho ca, xoay vòng trong 8 tài khoản theo `seed`. */
export function sampleApplicants(seed: number, count: number) {
  const n = LANDING_SAMPLE_WORKERS.length;
  return Array.from({ length: Math.min(3, count) }, (_, k) => LANDING_SAMPLE_WORKERS[(seed * 3 + k) % n]);
}

/** Chuỗi tiếng Việt cần bản tiếng Anh (cho test i18n). */
export const LANDING_SAMPLE_TEXTS: string[] = [
  ...new Set(LANDING_SAMPLE_SHIFTS.flatMap((s) => [s.title, s.day, ...(s.cancelReason ? [s.cancelReason] : [])])),
];

export interface SampleLedger {
  outcome: 'ok' | 'cancelled' | 'noShow';
  /** Giữ trước khi đăng ca (production: tiền công + 10% phí). */
  held: number;
  /** Trả người lao động (chỉ người đã làm). */
  paid: number;
  /** Phí CaLẻ — chỉ trên phần ca có người làm; demo chưa thu. */
  fee: number;
  /** Hoàn về ví nhà tuyển dụng (ca huỷ: hoàn đủ, cả phí). */
  refund: number;
  /** Số người đã làm. */
  worked: number;
}

/** Sổ tiền của ca mẫu theo đúng luồng server (`serverWageTotal`, `platformFee`). */
export function sampleLedger(shift: LandingSampleShift, live: boolean): SampleLedger {
  const wagesAll = serverWageTotal(shift.wage, shift.hours, shift.people);
  const held = live ? wagesAll + platformFee(wagesAll) : wagesAll;
  if (shift.cancelReason) {
    return { outcome: 'cancelled', held, paid: 0, fee: 0, refund: held, worked: 0 };
  }
  const worked = shift.people - (shift.noShow ?? 0);
  const paid = serverWageTotal(shift.wage, shift.hours, worked);
  const fee = live ? platformFee(paid) : 0;
  return { outcome: shift.noShow ? 'noShow' : 'ok', held, paid, fee, refund: held - paid - fee, worked };
}
