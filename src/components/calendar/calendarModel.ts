/**
 * Lịch (03/10 — thiết kế lại) — phần tính toán thuần của lưới tuần / ngày.
 *
 * Chủ dự án chốt: 24 giờ chia 4 CỤM ĐỀU NHAU, mỗi cụm 6 giờ — Đêm (00–06), Sáng
 * (06–12), Chiều (12–18), Tối (18–24). Lưới luôn hiện đủ cả ngày (không còn ô "Tuỳ
 * chỉnh khung giờ", không còn ca nằm ngoài lưới); mỗi giờ cao `QUARTER_PX_PER_HOUR`
 * (24px — chủ dự án thấy 40px quá dài) để cả ngày gọn trong khoảng 576px, trong cụm có
 * vạch mờ từng giờ.
 * Cấu hình hợp lệ với `validateSlotConfig` (`domain/week`: cuối ngày tối đa 23:59).
 */

import { timeToMinutes, type SlotConfig } from '@/domain/week';

export const DAY_QUARTERS: SlotConfig = { dayStart: '00:00', dayEnd: '23:59', slotMinutes: 360 };
/** Chiều cao một giờ trong lưới 4 cụm (px). */
export const QUARTER_PX_PER_HOUR = 24;

/** Tên cụm theo giờ bắt đầu (chuỗi tiếng Việt — trang dịch bằng `tx`). */
export const QUARTER_NAMES: Readonly<Record<string, string>> = {
  '00:00': 'Đêm',
  '06:00': 'Sáng',
  '12:00': 'Chiều',
  '18:00': 'Tối',
};

/** Vạch "bây giờ": số phút tính từ đầu khung, hoặc null nếu giờ hiện tại nằm ngoài khung. */
export function nowOffsetMinutes(nowHHmm: string, cfg: SlotConfig): number | null {
  const now = timeToMinutes(nowHHmm);
  const start = timeToMinutes(cfg.dayStart);
  const end = timeToMinutes(cfg.dayEnd);
  if ([now, start, end].some(Number.isNaN) || now < start || now > end) return null;
  return now - start;
}
