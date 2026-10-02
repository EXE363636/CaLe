/**
 * Mốc giờ của một ca (03/10) — cho minh hoạ "đăng ca" / "nhận ca" ở trang vai trò.
 * Dùng đúng hằng số của app nên câu "mở check-in 16:45", "huỷ trước 11:00"… khớp
 * luật thật:
 *   - check-in: từ 15 phút trước tới 15 phút sau giờ bắt đầu (`CHECK_IN_*_MINUTES`);
 *   - nhà tuyển dụng sửa ca khi còn hơn 24 giờ (`EDIT_DEADLINE_HOURS`), huỷ khi còn
 *     hơn 6 giờ (`CANCEL_DEADLINE_HOURS`, áp dụng khi đã có người ứng tuyển);
 *   - người lao động tự huỷ khi còn hơn 3 giờ (`WORKER_CANCEL_APPROVAL_HOURS`);
 *   - không ai xác nhận thì tự chốt 24 giờ sau giờ kết thúc (migration 0019).
 * Hàm thuần: chỉ làm việc với "HH:mm" + số ngày lệch so với ngày làm ca.
 */

import {
  CANCEL_DEADLINE_HOURS,
  CHECK_IN_EARLY_MINUTES,
  CHECK_IN_LATE_MINUTES,
  EDIT_DEADLINE_HOURS,
  WORKER_CANCEL_APPROVAL_HOURS,
} from '@/domain/timeGates';

/** Tự chốt sau giờ kết thúc (migration 0019, `auto_settled_at`). */
export const AUTO_SETTLE_HOURS = 24;

export interface ClockMark {
  time: string;
  /** 0 = ngày làm ca, -1 = hôm trước, 1 = hôm sau. */
  dayOffset: number;
}

export interface ShiftMilestones {
  checkInOpen: ClockMark;
  checkInClose: ClockMark;
  autoSettle: ClockMark;
  editBy: ClockMark;
  employerCancelBy: ClockMark;
  workerCancelBy: ClockMark;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY = 24 * 60;

function toMinutes(hhmm: string): number | null {
  const m = HHMM.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function mark(minutes: number): ClockMark {
  const dayOffset = Math.floor(minutes / DAY);
  const inDay = minutes - dayOffset * DAY;
  const h = String(Math.floor(inDay / 60)).padStart(2, '0');
  const m = String(inDay % 60).padStart(2, '0');
  return { time: `${h}:${m}`, dayOffset };
}

export function shiftMilestones(start: string, end: string): ShiftMilestones | null {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return null;
  return {
    checkInOpen: mark(s - CHECK_IN_EARLY_MINUTES),
    checkInClose: mark(s + CHECK_IN_LATE_MINUTES),
    autoSettle: mark(e + AUTO_SETTLE_HOURS * 60),
    editBy: mark(s - EDIT_DEADLINE_HOURS * 60),
    employerCancelBy: mark(s - CANCEL_DEADLINE_HOURS * 60),
    workerCancelBy: mark(s - WORKER_CANCEL_APPROVAL_HOURS * 60),
  };
}
