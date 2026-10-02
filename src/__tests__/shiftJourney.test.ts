/**
 * shiftJourney — chặng đường của một ca (thanh bước vòng đời) suy ra từ
 * `getShiftLifecycleState`, không phải nguồn trạng thái thứ hai.
 * startsIn — thời gian còn lại tới giờ bắt đầu (tính một lần lúc render).
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { JOURNEY_STEPS, shiftJourney, startsIn, wasApproved } from '@/domain/shiftJourney';
import type { ShiftLifecycleState } from '@/domain/shiftLifecycleState';
import type { Shift } from '@/types';

const statuses = (s: ReturnType<typeof shiftJourney>) => s.steps.map((x) => x.status);

describe('shiftJourney', () => {
  it('có đúng 5 bước theo thứ tự đăng → duyệt → diễn ra → chờ xác nhận → hoàn thành', () => {
    expect(JOURNEY_STEPS).toEqual(['posted', 'approved', 'inProgress', 'awaitingConfirm', 'completed']);
  });

  it('ca đã đăng, chưa duyệt ai: bước "đã đăng" là bước hiện tại', () => {
    const j = shiftJourney('Published', { approved: false });
    expect(statuses(j)).toEqual(['current', 'todo', 'todo', 'todo', 'todo']);
    expect(j.halted).toBeUndefined();
  });

  it('đã duyệt, chưa tới giờ (kể cả sắp bắt đầu): bước "đã duyệt" là hiện tại', () => {
    for (const state of ['Published', 'StartingSoon'] as const) {
      expect(statuses(shiftJourney(state, { approved: true }))).toEqual([
        'done',
        'current',
        'todo',
        'todo',
        'todo',
      ]);
    }
  });

  it('đang diễn ra theo đồng hồ: bước 3 hiện tại', () => {
    expect(statuses(shiftJourney('InProgress', { approved: true }))).toEqual([
      'done',
      'done',
      'current',
      'todo',
      'todo',
    ]);
  });

  it('hết giờ, chờ check-out hoặc chờ xác nhận: bước 4 hiện tại', () => {
    for (const state of ['AwaitingCheckout', 'AwaitingEmployerConfirmation'] as const) {
      expect(statuses(shiftJourney(state, { approved: true }))).toEqual([
        'done',
        'done',
        'done',
        'current',
        'todo',
      ]);
    }
  });

  it('hoàn thành: mọi bước xong', () => {
    expect(statuses(shiftJourney('Completed', { approved: true }))).toEqual(Array(5).fill('done'));
  });

  it('nháp / chờ giữ cọc: chưa tới bước nào (bước đầu là hiện tại nhưng chưa xong)', () => {
    for (const state of ['Draft', 'PendingDeposit'] as const) {
      expect(statuses(shiftJourney(state, { approved: false }))).toEqual([
        'current',
        'todo',
        'todo',
        'todo',
        'todo',
      ]);
    }
  });

  it('huỷ / hết hạn dừng ở bước đã tới; tranh chấp dừng ở bước chờ xác nhận', () => {
    const cancelled = shiftJourney('Cancelled', { approved: true });
    expect(cancelled.halted).toBe('Cancelled');
    expect(statuses(cancelled)).toEqual(['done', 'halted', 'todo', 'todo', 'todo']);

    const expired = shiftJourney('Expired', { approved: false });
    expect(expired.halted).toBe('Expired');
    expect(statuses(expired)).toEqual(['halted', 'todo', 'todo', 'todo', 'todo']);

    const disputed = shiftJourney('Disputed', { approved: true });
    expect(disputed.halted).toBe('Disputed');
    expect(statuses(disputed)).toEqual(['done', 'done', 'done', 'halted', 'todo']);
  });

  it('bất biến: luôn đúng một bước current hoặc halted (trừ khi hoàn thành), các bước trước nó đều done', () => {
    const states: ShiftLifecycleState[] = [
      'Draft',
      'PendingDeposit',
      'Published',
      'StartingSoon',
      'InProgress',
      'AwaitingCheckout',
      'AwaitingEmployerConfirmation',
      'Completed',
      'Expired',
      'Cancelled',
      'Disputed',
    ];
    fc.assert(
      fc.property(fc.constantFrom(...states), fc.boolean(), (state, approved) => {
        const s = statuses(shiftJourney(state, { approved }));
        const marks = s.filter((x) => x === 'current' || x === 'halted').length;
        expect(marks).toBe(state === 'Completed' ? 0 : 1);
        const i = s.findIndex((x) => x === 'current' || x === 'halted');
        if (i >= 0) {
          expect(s.slice(0, i).every((x) => x === 'done')).toBe(true);
          expect(s.slice(i + 1).every((x) => x === 'todo')).toBe(true);
        }
      }),
    );
  });
});

describe('wasApproved', () => {
  it('đơn đã qua bước duyệt (kể cả đang xin huỷ, đã chấm công, tranh chấp) là đã duyệt', () => {
    for (const s of ['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut', 'Confirmed', 'Disputed'] as const) {
      expect(wasApproved(s)).toBe(true);
    }
    for (const s of ['Pending', 'Rejected', 'Expired', 'CancelledByWorker', 'CancelledByEmployer', 'NoShow'] as const) {
      expect(wasApproved(s)).toBe(false);
    }
  });
});

describe('startsIn', () => {
  const shift = { date: '2026-10-02', startTime: '18:00', endTime: '22:00' } as Shift;

  it('tách ngày / giờ / phút còn lại tới giờ bắt đầu', () => {
    expect(startsIn(shift, new Date('2026-10-02T15:45:00').toISOString())).toEqual({
      totalMinutes: 135,
      days: 0,
      hours: 2,
      minutes: 15,
    });
    expect(startsIn(shift, new Date('2026-09-30T17:00:00').toISOString())).toEqual({
      totalMinutes: 2 * 24 * 60 + 60,
      days: 2,
      hours: 1,
      minutes: 0,
    });
  });

  it('đã qua giờ bắt đầu hoặc dữ liệu sai → null', () => {
    expect(startsIn(shift, new Date('2026-10-02T18:00:00').toISOString())).toBeNull();
    expect(startsIn({ ...shift, startTime: 'xx' } as Shift, new Date().toISOString())).toBeNull();
  });
});
