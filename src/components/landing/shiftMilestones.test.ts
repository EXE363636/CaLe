/**
 * Mốc giờ của một ca trong minh hoạ "đăng ca" / "nhận ca" ở trang vai trò (03/10):
 * tính từ giờ bắt đầu / kết thúc bằng đúng hằng số của app (`domain/timeGates`) +
 * tự chốt 24 giờ (migration 0019). Giờ lệch sang ngày khác ghi `dayOffset`.
 */

import { describe, expect, it } from 'vitest';

import { shiftMilestones } from './shiftMilestones';

describe('shiftMilestones', () => {
  it('ca 17:00–22:00', () => {
    expect(shiftMilestones('17:00', '22:00')).toEqual({
      checkInOpen: { time: '16:45', dayOffset: 0 },
      checkInClose: { time: '17:15', dayOffset: 0 },
      autoSettle: { time: '22:00', dayOffset: 1 },
      editBy: { time: '17:00', dayOffset: -1 },
      employerCancelBy: { time: '11:00', dayOffset: 0 },
      workerCancelBy: { time: '14:00', dayOffset: 0 },
    });
  });

  it('ca sáng sớm: mốc lùi qua nửa đêm sang hôm trước', () => {
    const m = shiftMilestones('05:00', '09:00')!;
    expect(m.employerCancelBy).toEqual({ time: '23:00', dayOffset: -1 });
    expect(m.workerCancelBy).toEqual({ time: '02:00', dayOffset: 0 });
    expect(m.checkInOpen).toEqual({ time: '04:45', dayOffset: 0 });
  });

  it('giờ không hợp lệ → null', () => {
    expect(shiftMilestones('7h', '22:00')).toBeNull();
    expect(shiftMilestones('17:00', '25:00')).toBeNull();
  });
});
