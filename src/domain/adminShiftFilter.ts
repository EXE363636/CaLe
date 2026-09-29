/**
 * P0 feedback F7 — bộ lọc ca của Tổng quan admin (tab Ca làm + ô Thống kê).
 *
 * Pure TypeScript — không React, không I/O.
 *
 *   - `unfilled` (Ca chưa khớp): ca thật đang tuyển, CHƯA bắt đầu (lifecycle
 *     `Published` / `StartingSoon` — cùng đồng hồ với badge), số người nhận
 *     `effectiveFilledCount` < `positionsTotal`. `isUnfilledUrgent` tách
 *     riêng ca chưa khớp sẽ bắt đầu trong UNFILLED_URGENT_HOURS giờ tới.
 *   - `cancelled` (Ca huỷ): lifecycle `Cancelled`, hoặc `Expired` mà không
 *     ai nhận (effectiveFilledCount = 0). Ca hết hạn có người đã nhận (vắng
 *     mặt…) là chuyện khác, không tính là huỷ.
 *   - `active` / `completed` / `disputed`: giữ nguyên nghĩa cũ (theo status /
 *     escrow lưu trữ) để không đổi hành vi các ô Thống kê đang có.
 */

import type { Application, Shift } from '@/types';
import { getShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { effectiveFilledCount } from '@/domain/shiftAvailability';

export const ADMIN_SHIFT_FILTERS = [
  'all',
  'active',
  'unfilled',
  'completed',
  'cancelled',
  'disputed',
] as const;

export type AdminShiftFilter = (typeof ADMIN_SHIFT_FILTERS)[number];

/** Ca chưa khớp bắt đầu trong số giờ này được coi là gấp. */
export const UNFILLED_URGENT_HOURS = 24;

export function isAdminShiftFilter(value: unknown): value is AdminShiftFilter {
  return typeof value === 'string' && (ADMIN_SHIFT_FILTERS as readonly string[]).includes(value);
}

function isUnfilled(shift: Shift, applications: Application[], nowIso: string): boolean {
  const state = getShiftLifecycleState(shift, applications, nowIso);
  if (state !== 'Published' && state !== 'StartingSoon') return false;
  return effectiveFilledCount(shift, applications) < shift.positionsTotal;
}

export function isUnfilledUrgent(shift: Shift, applications: Application[], nowIso: string): boolean {
  if (!isUnfilled(shift, applications, nowIso)) return false;
  const start = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
  const now = new Date(nowIso).getTime();
  return start - now <= UNFILLED_URGENT_HOURS * 60 * 60 * 1000;
}

function isCancelledOrUnclaimed(shift: Shift, applications: Application[], nowIso: string): boolean {
  const state = getShiftLifecycleState(shift, applications, nowIso);
  if (state === 'Cancelled') return true;
  return state === 'Expired' && effectiveFilledCount(shift, applications) === 0;
}

export function matchesAdminShiftFilter(
  shift: Shift,
  applications: Application[],
  filter: AdminShiftFilter,
  nowIso: string,
): boolean {
  switch (filter) {
    case 'active':
      return ['Published', 'FullyBooked', 'InProgress', 'AwaitingConfirmation'].includes(shift.status);
    case 'unfilled':
      return isUnfilled(shift, applications, nowIso);
    case 'completed':
      return shift.status === 'Completed';
    case 'cancelled':
      return isCancelledOrUnclaimed(shift, applications, nowIso);
    case 'disputed':
      return shift.escrowStatus === 'Disputed';
    case 'all':
    default:
      return true;
  }
}

export interface AdminShiftCounts {
  unfilled: number;
  unfilledUrgent: number;
  cancelled: number;
}

export function countAdminShifts(
  shifts: Shift[],
  applications: Application[],
  nowIso: string,
): AdminShiftCounts {
  const counts: AdminShiftCounts = { unfilled: 0, unfilledUrgent: 0, cancelled: 0 };
  for (const s of shifts) {
    if (isUnfilled(s, applications, nowIso)) {
      counts.unfilled += 1;
      if (isUnfilledUrgent(s, applications, nowIso)) counts.unfilledUrgent += 1;
    } else if (isCancelledOrUnclaimed(s, applications, nowIso)) {
      counts.cancelled += 1;
    }
  }
  return counts;
}
