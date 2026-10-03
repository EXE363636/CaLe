/**
 * Lịch (03/10 — thiết kế lại): 24 giờ chia 4 cụm đều nhau (6 giờ), vạch "bây giờ".
 */

import { describe, expect, it } from 'vitest';

import { generateSlots, validateSlotConfig } from '@/domain/week';

import { DAY_QUARTERS, QUARTER_NAMES, nowOffsetMinutes } from './calendarModel';
import { calendarSlotRowHeight } from './CalendarEventCard';

describe('DAY_QUARTERS', () => {
  it('hợp lệ và cho đúng 4 cụm 6 giờ phủ cả ngày', () => {
    expect(validateSlotConfig(DAY_QUARTERS)).toEqual({ ok: true });
    const slots = generateSlots(DAY_QUARTERS);
    expect(slots.map((s) => s.startTime)).toEqual(['00:00', '06:00', '12:00', '18:00']);
    expect(slots.every((s) => QUARTER_NAMES[s.startTime])).toBe(true);
  });

  it('mỗi cụm cao 6 × 24px', () => {
    expect(calendarSlotRowHeight(DAY_QUARTERS.slotMinutes)).toBe(144);
  });
});

describe('nowOffsetMinutes', () => {
  const cfg = { dayStart: '08:00', dayEnd: '20:00', slotMinutes: 60 };
  it('trong khung → số phút tính từ đầu khung', () => {
    expect(nowOffsetMinutes('09:30', cfg)).toBe(90);
    expect(nowOffsetMinutes('09:30', DAY_QUARTERS)).toBe(570);
  });
  it('ngoài khung → null', () => {
    expect(nowOffsetMinutes('07:59', cfg)).toBeNull();
    expect(nowOffsetMinutes('20:01', cfg)).toBeNull();
  });
});
