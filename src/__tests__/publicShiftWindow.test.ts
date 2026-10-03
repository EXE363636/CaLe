/**
 * Cửa sổ ngày của listing công khai (chế độ supabase): chỉ nạp ca có
 * `date >= hôm qua` theo giờ Việt Nam (UTC+7). Lấy hôm qua (không phải hôm
 * nay) để ca qua đêm bắt đầu hôm qua, kết thúc sáng nay vẫn còn trong listing.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { publicShiftsFromDate } from '@/domain/publicShiftWindow';
import { vietnamDate } from '@/domain/deposit';

describe('publicShiftsFromDate', () => {
  it('trả về ngày hôm qua theo giờ Việt Nam', () => {
    // 10:00 giờ VN ngày 03/10 → hôm qua là 02/10.
    expect(publicShiftsFromDate('2026-10-03T03:00:00.000Z')).toBe('2026-10-02');
  });

  it('dùng giờ Việt Nam, không phải UTC, quanh nửa đêm', () => {
    // 23:30 UTC ngày 02/10 = 06:30 giờ VN ngày 03/10 → hôm qua (VN) là 02/10.
    expect(publicShiftsFromDate('2026-10-02T23:30:00.000Z')).toBe('2026-10-02');
    // 16:59 UTC ngày 02/10 = 23:59 giờ VN ngày 02/10 → hôm qua (VN) là 01/10.
    expect(publicShiftsFromDate('2026-10-02T16:59:00.000Z')).toBe('2026-10-01');
    // 17:00 UTC ngày 02/10 = 00:00 giờ VN ngày 03/10 → hôm qua (VN) là 02/10.
    expect(publicShiftsFromDate('2026-10-02T17:00:00.000Z')).toBe('2026-10-02');
  });

  it('qua ranh giới tháng / năm', () => {
    expect(publicShiftsFromDate('2026-11-01T01:00:00.000Z')).toBe('2026-10-31');
    expect(publicShiftsFromDate('2027-01-01T05:00:00.000Z')).toBe('2026-12-31');
  });

  it('luôn đúng một ngày trước ngày VN hiện tại (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) }),
        (ms) => {
          const nowIso = new Date(ms).toISOString();
          const from = publicShiftsFromDate(nowIso);
          expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          const today = vietnamDate(nowIso);
          expect(from < today).toBe(true);
          const diffDays =
            (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
          expect(diffDays).toBe(1);
        },
      ),
    );
  });
});
