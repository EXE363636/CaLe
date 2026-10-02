/**
 * Chặng đường của một ca — dữ liệu cho thanh bước vòng đời (`ShiftJourney`).
 *
 * Pure TypeScript — no React, no I/O. KHÔNG phải nguồn trạng thái thứ hai:
 * đầu vào là `ShiftLifecycleState` đã tính bởi `getShiftLifecycleState`
 * (theo đồng hồ), cộng một sự kiện "đã có người được duyệt" do bên gọi suy ra
 * (worker: đơn của mình; employer: có đơn được duyệt). Check-in / có mặt
 * không đẩy bước "Đang diễn ra" sớm — bước đó chỉ theo trạng thái đồng hồ.
 */

import type { ShiftLifecycleState } from './shiftLifecycleState';
import type { ApplicationStatus, Shift } from '@/types';

const APPROVED_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'Approved',
  'CancellationRequested',
  'CheckedIn',
  'CheckedOut',
  'Confirmed',
  'Disputed',
]);

/** Đơn đã qua bước duyệt (kể cả đang xin huỷ, đã chấm công, đang tranh chấp). */
export function wasApproved(status: ApplicationStatus): boolean {
  return APPROVED_STATUSES.has(status);
}

export const JOURNEY_STEPS = [
  'posted',
  'approved',
  'inProgress',
  'awaitingConfirm',
  'completed',
] as const;

export type JourneyStepKey = (typeof JOURNEY_STEPS)[number];
export type JourneyStepStatus = 'done' | 'current' | 'todo' | 'halted';
export type JourneyHalt = 'Cancelled' | 'Expired' | 'Disputed';

export interface ShiftJourney {
  steps: Array<{ key: JourneyStepKey; status: JourneyStepStatus }>;
  /** Ca dừng giữa chừng — bước `halted` là nơi nó dừng. */
  halted?: JourneyHalt;
}

/** Chỉ số bước ca đã tới (bước "hiện tại"); `JOURNEY_STEPS.length` = xong hết. */
function reachedIndex(state: ShiftLifecycleState, approved: boolean): number {
  switch (state) {
    case 'Draft':
    case 'PendingDeposit':
      return 0;
    case 'Published':
    case 'StartingSoon':
    case 'Cancelled':
    case 'Expired':
      return approved ? 1 : 0;
    case 'InProgress':
      return 2;
    case 'AwaitingCheckout':
    case 'AwaitingEmployerConfirmation':
    case 'Disputed':
      return 3;
    case 'Completed':
      return JOURNEY_STEPS.length;
  }
}

export function shiftJourney(
  state: ShiftLifecycleState,
  { approved }: { approved: boolean },
): ShiftJourney {
  const halted: JourneyHalt | undefined =
    state === 'Cancelled' || state === 'Expired' || state === 'Disputed' ? state : undefined;
  // Nháp / chờ cọc: chưa thật sự "đã đăng" — bước đầu là hiện tại, không done.
  const at = reachedIndex(state, approved);
  const steps = JOURNEY_STEPS.map((key, i) => {
    let status: JourneyStepStatus;
    if (i < at) status = 'done';
    else if (i === at) status = halted ? 'halted' : 'current';
    else status = 'todo';
    return { key, status };
  });
  return halted ? { steps, halted } : { steps };
}

export interface StartsIn {
  totalMinutes: number;
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Thời gian còn lại tới giờ bắt đầu ca, tính MỘT lần tại `nowIso` (render /
 * mount) — không đếm ngược bằng timer (CLAUDE.md §5.6). `null` khi đã tới giờ
 * hoặc ngày giờ không hợp lệ.
 */
export function startsIn(shift: Pick<Shift, 'date' | 'startTime'>, nowIso: string): StartsIn | null {
  const start = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(now) || now >= start) return null;
  const totalMinutes = Math.ceil((start - now) / 60_000);
  return {
    totalMinutes,
    days: Math.floor(totalMinutes / (24 * 60)),
    hours: Math.floor((totalMinutes % (24 * 60)) / 60),
    minutes: totalMinutes % 60,
  };
}
