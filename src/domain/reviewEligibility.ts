/**
 * Đánh giá sau ca (0024) — điều kiện hiển thị form đánh giá ở client, khớp RPC
 * `submit_shift_review`: đơn đã 'Confirmed', chưa đánh giá chiều này, và trong
 * 14 ngày kể từ giờ KẾT THÚC ca. Pure — không React / IO.
 */

import type { Application, Shift } from '@/types';

export const REVIEW_WINDOW_DAYS = 14;

/** Mốc hết hạn đánh giá (ms) = giờ kết thúc ca (giờ địa phương) + 14 ngày. */
export function reviewDeadlineMs(shift: Pick<Shift, 'date' | 'startTime' | 'endTime'>): number {
  const end = new Date(`${shift.date}T${shift.endTime}:00`);
  // Ca qua đêm (kết thúc <= bắt đầu) → kết thúc vào ngày hôm sau.
  if (shift.endTime <= shift.startTime) end.setDate(end.getDate() + 1);
  return end.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function canReviewApplication(
  app: Pick<Application, 'status'> | undefined,
  shift: Pick<Shift, 'date' | 'startTime' | 'endTime'>,
  alreadyReviewed: boolean,
  nowMs: number = Date.now(),
): boolean {
  if (!app || app.status !== 'Confirmed' || alreadyReviewed) return false;
  return nowMs <= reviewDeadlineMs(shift);
}
