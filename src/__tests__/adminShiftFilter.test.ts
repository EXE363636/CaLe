/**
 * P0 feedback F7 — bộ lọc ca của Tổng quan admin.
 *
 * Ghim:
 *   - `unfilled` (Ca chưa khớp): ca thật đã đăng, CHƯA bắt đầu, số người
 *     nhận (max(positionsFilled, đơn chiếm chỗ)) < positionsTotal. Draft /
 *     PendingDeposit / ca đã bắt đầu / ca đủ người không tính.
 *   - `isUnfilledUrgent`: ca chưa khớp bắt đầu trong UNFILLED_URGENT_HOURS.
 *   - `cancelled` (Ca huỷ): ca Cancelled, hoặc Expired mà không ai nhận.
 *     Ca Expired có người đã nhận (no-show…) không tính là "huỷ".
 *   - Các bộ lọc cũ giữ nguyên nghĩa: active / completed / disputed / all.
 *   - `isAdminShiftFilter` chỉ nhận giá trị trong danh sách (dùng cho ?filter=).
 */

import { describe, it, expect } from 'vitest';

import {
  ADMIN_SHIFT_FILTERS,
  UNFILLED_URGENT_HOURS,
  countAdminShifts,
  isAdminShiftFilter,
  isUnfilledUrgent,
  matchesAdminShiftFilter,
} from '@/domain/adminShiftFilter';
import type { Application, Shift } from '@/types';

// Giờ địa phương (lifecycle đọc `${date}T${time}:00` theo giờ máy).
const NOW_ISO = new Date('2026-10-01T08:00:00').toISOString();

function makeShift(id: string, override: Partial<Shift> = {}): Shift {
  return {
    id,
    employerId: 'employer-1',
    title: `Shift ${id}`,
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: '2026-10-03',
    startTime: '10:00',
    endTime: '14:00',
    hourlyWage: 50_000,
    positionsTotal: 2,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 440_000,
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
    ...override,
  };
}

function makeApp(shiftId: string, workerId: string, status: Application['status']): Application {
  return {
    id: `app-${shiftId}-${workerId}`,
    shiftId,
    workerId,
    status,
    appliedAt: '2026-09-21T00:00:00.000Z',
  };
}

describe('matchesAdminShiftFilter — unfilled (Ca chưa khớp)', () => {
  it('ca đã đăng, chưa bắt đầu, còn thiếu người → chưa khớp', () => {
    const s = makeShift('s1');
    expect(matchesAdminShiftFilter(s, [], 'unfilled', NOW_ISO)).toBe(true);
  });

  it('đếm cả đơn chiếm chỗ (Approved…) dù positionsFilled bị lệch', () => {
    const s = makeShift('s1', { positionsFilled: 0 });
    const apps = [makeApp('s1', 'w1', 'Approved'), makeApp('s1', 'w2', 'Confirmed')];
    expect(matchesAdminShiftFilter(s, apps, 'unfilled', NOW_ISO)).toBe(false);
  });

  it('đơn Pending chưa chiếm chỗ → vẫn chưa khớp', () => {
    const s = makeShift('s1');
    const apps = [makeApp('s1', 'w1', 'Pending'), makeApp('s1', 'w2', 'Pending')];
    expect(matchesAdminShiftFilter(s, apps, 'unfilled', NOW_ISO)).toBe(true);
  });

  it('ca đủ người (FullyBooked) → không tính', () => {
    const s = makeShift('s1', { status: 'FullyBooked', positionsFilled: 2 });
    expect(matchesAdminShiftFilter(s, [], 'unfilled', NOW_ISO)).toBe(false);
  });

  it('ca đã bắt đầu / đã qua → không tính', () => {
    const started = makeShift('s1', { date: '2026-10-01', startTime: '07:00', endTime: '12:00' });
    const past = makeShift('s2', { date: '2026-09-30' });
    expect(matchesAdminShiftFilter(started, [], 'unfilled', NOW_ISO)).toBe(false);
    expect(matchesAdminShiftFilter(past, [], 'unfilled', NOW_ISO)).toBe(false);
  });

  it('ca sắp bắt đầu (trong 15 phút) mà thiếu người → vẫn chưa khớp', () => {
    const s = makeShift('s1', { date: '2026-10-01', startTime: '08:10', endTime: '12:00' });
    expect(matchesAdminShiftFilter(s, [], 'unfilled', NOW_ISO)).toBe(true);
  });

  it('Draft / chờ đặt cọc / đã huỷ không phải ca thật đang tuyển → không tính', () => {
    expect(matchesAdminShiftFilter(makeShift('d', { status: 'Draft' }), [], 'unfilled', NOW_ISO)).toBe(false);
    expect(
      matchesAdminShiftFilter(makeShift('p', { escrowStatus: 'PendingDeposit' }), [], 'unfilled', NOW_ISO),
    ).toBe(false);
    expect(matchesAdminShiftFilter(makeShift('c', { status: 'Cancelled' }), [], 'unfilled', NOW_ISO)).toBe(false);
  });
});

describe('isUnfilledUrgent — ca chưa khớp sắp bắt đầu', () => {
  it(`chưa khớp và bắt đầu trong ${UNFILLED_URGENT_HOURS} giờ → gấp`, () => {
    const s = makeShift('s1', { date: '2026-10-01', startTime: '18:00', endTime: '22:00' });
    expect(isUnfilledUrgent(s, [], NOW_ISO)).toBe(true);
  });

  it('chưa khớp nhưng còn xa → không gấp', () => {
    const s = makeShift('s1', { date: '2026-10-05' });
    expect(isUnfilledUrgent(s, [], NOW_ISO)).toBe(false);
  });

  it('đủ người thì không gấp dù sắp bắt đầu', () => {
    const s = makeShift('s1', { date: '2026-10-01', startTime: '18:00', endTime: '22:00', positionsFilled: 2 });
    expect(isUnfilledUrgent(s, [], NOW_ISO)).toBe(false);
  });
});

describe('matchesAdminShiftFilter — cancelled (Ca huỷ)', () => {
  it('ca Cancelled → tính', () => {
    expect(matchesAdminShiftFilter(makeShift('c', { status: 'Cancelled' }), [], 'cancelled', NOW_ISO)).toBe(true);
  });

  it('ca Expired không ai nhận → tính', () => {
    expect(matchesAdminShiftFilter(makeShift('e', { status: 'Expired' }), [], 'cancelled', NOW_ISO)).toBe(true);
  });

  it('ca đã qua giờ, chưa sync, không ai nhận (lifecycle = Expired) → tính', () => {
    const s = makeShift('e', { date: '2026-09-30' });
    expect(matchesAdminShiftFilter(s, [], 'cancelled', NOW_ISO)).toBe(true);
  });

  it('ca Expired có người đã nhận (vd vắng mặt) → không tính là huỷ', () => {
    const s = makeShift('e', { status: 'Expired', positionsFilled: 1 });
    expect(matchesAdminShiftFilter(s, [], 'cancelled', NOW_ISO)).toBe(false);
  });

  it('ca đang tuyển / hoàn thành → không tính', () => {
    expect(matchesAdminShiftFilter(makeShift('p'), [], 'cancelled', NOW_ISO)).toBe(false);
    expect(matchesAdminShiftFilter(makeShift('d', { status: 'Completed' }), [], 'cancelled', NOW_ISO)).toBe(false);
  });
});

describe('matchesAdminShiftFilter — bộ lọc cũ giữ nguyên nghĩa', () => {
  it('all nhận mọi ca', () => {
    expect(matchesAdminShiftFilter(makeShift('x', { status: 'Cancelled' }), [], 'all', NOW_ISO)).toBe(true);
  });
  it('active theo status lưu trữ', () => {
    expect(matchesAdminShiftFilter(makeShift('a', { status: 'InProgress' }), [], 'active', NOW_ISO)).toBe(true);
    expect(matchesAdminShiftFilter(makeShift('b', { status: 'Completed' }), [], 'active', NOW_ISO)).toBe(false);
  });
  it('completed / disputed', () => {
    expect(matchesAdminShiftFilter(makeShift('c', { status: 'Completed' }), [], 'completed', NOW_ISO)).toBe(true);
    expect(
      matchesAdminShiftFilter(makeShift('d', { escrowStatus: 'Disputed' }), [], 'disputed', NOW_ISO),
    ).toBe(true);
  });
});

describe('countAdminShifts', () => {
  it('đếm chưa khớp (kèm số gấp) và ca huỷ', () => {
    const shifts = [
      makeShift('u1'),
      makeShift('u2', { date: '2026-10-01', startTime: '18:00', endTime: '22:00' }),
      makeShift('full', { positionsFilled: 2 }),
      makeShift('c1', { status: 'Cancelled' }),
      makeShift('e1', { status: 'Expired' }),
      makeShift('e2', { status: 'Expired', positionsFilled: 1 }),
    ];
    expect(countAdminShifts(shifts, [], NOW_ISO)).toEqual({
      unfilled: 2,
      unfilledUrgent: 1,
      cancelled: 2,
    });
  });
});

describe('isAdminShiftFilter', () => {
  it('nhận đúng danh sách, từ chối giá trị lạ', () => {
    for (const f of ADMIN_SHIFT_FILTERS) expect(isAdminShiftFilter(f)).toBe(true);
    expect(isAdminShiftFilter('unfilled')).toBe(true);
    expect(isAdminShiftFilter('cancelled')).toBe(true);
    expect(isAdminShiftFilter('hacked')).toBe(false);
    expect(isAdminShiftFilter(null)).toBe(false);
  });
});
