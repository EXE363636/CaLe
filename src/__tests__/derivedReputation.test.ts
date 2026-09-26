/**
 * deriveReputationFromHistory — điểm uy tín tạm tính từ lịch sử đơn thật
 * (supabase, server chưa lưu điểm). Kiểm tra đúng luật của domain/reputation:
 * hoàn thành +5, vắng mặt −20, huỷ muộn −10 (chỉ khi đã được duyệt và huỷ
 * trong 24h trước giờ bắt đầu), kẹp [0, 100] theo thứ tự thời gian.
 */
import { describe, expect, it } from 'vitest';

import { deriveReputationFromHistory } from '@/domain/reputation';
import type { Application, Shift } from '@/types';

const shift = (id: string, date: string): Shift =>
  ({ id, date, startTime: '08:00', endTime: '12:00' }) as Shift;

const app = (id: string, shiftId: string, over: Partial<Application>): Application =>
  ({ id, shiftId, workerId: 'w1', appliedAt: '2026-09-01T00:00:00Z', ...over }) as Application;

const shifts = new Map<string, Shift>([
  ['s1', shift('s1', '2026-09-10')],
  ['s2', shift('s2', '2026-09-11')],
  ['s3', shift('s3', '2026-09-12')],
]);

describe('deriveReputationFromHistory', () => {
  it('không có lịch sử → 100 điểm', () => {
    expect(deriveReputationFromHistory([], shifts)).toEqual({
      score: 100,
      completed: 0,
      noShows: 0,
      lateCancels: 0,
      workerCancellations: 0,
    });
  });

  it('vắng mặt −20; hoàn thành sau đó +5 (đếm theo thứ tự thời gian)', () => {
    const r = deriveReputationFromHistory(
      [
        app('a2', 's2', { status: 'Confirmed', confirmedAt: '2026-09-11T06:00:00Z' }),
        app('a1', 's1', { status: 'NoShow' }),
      ],
      shifts,
    );
    // 100 → NoShow (10/9) 80 → Completed (11/9) 85
    expect(r).toEqual({ score: 85, completed: 1, noShows: 1, lateCancels: 0, workerCancellations: 0 });
  });

  it('hoàn thành trước rồi vắng mặt: trần 100 khiến kết quả phụ thuộc thứ tự', () => {
    const r = deriveReputationFromHistory(
      [
        app('a1', 's1', { status: 'Confirmed', confirmedAt: '2026-09-10T06:00:00Z' }),
        app('a2', 's2', { status: 'NoShow' }),
      ],
      shifts,
    );
    // 100 → +5 kẹp 100 → −20 = 80
    expect(r.score).toBe(80);
  });

  it('huỷ trong 24h sau khi đã được duyệt → huỷ muộn −10', () => {
    const r = deriveReputationFromHistory(
      [
        app('a1', 's1', {
          status: 'CancelledByWorker',
          approvedAt: '2026-09-05T00:00:00Z',
          cancellationRequestedAt: '2026-09-09T20:00:00',
        }),
      ],
      shifts,
    );
    expect(r).toEqual({ score: 90, completed: 0, noShows: 0, lateCancels: 1, workerCancellations: 1 });
  });

  it('huỷ sớm (≥24h) hoặc huỷ khi chưa được duyệt → không trừ', () => {
    const r = deriveReputationFromHistory(
      [
        app('a1', 's1', {
          status: 'CancelledByWorker',
          approvedAt: '2026-09-05T00:00:00Z',
          cancelledAt: '2026-09-07T00:00:00',
        }),
        app('a2', 's2', { status: 'CancelledByWorker', cancelledAt: '2026-09-11T07:00:00' }),
      ],
      shifts,
    );
    expect(r).toEqual({ score: 100, completed: 0, noShows: 0, lateCancels: 0, workerCancellations: 2 });
  });

  it('điểm không xuống dưới 0', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      app(`a${i}`, 's3', { status: 'NoShow', noShowAt: `2026-09-12T0${i}:00:00Z` }),
    );
    expect(deriveReputationFromHistory(many, shifts).score).toBe(0);
  });
});
