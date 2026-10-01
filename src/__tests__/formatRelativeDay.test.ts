import { describe, expect, it } from 'vitest';

import { formatRelativeDay, formatRelativeDayVN } from '@/lib/format';

// VI/EN đợt 2a — ngày của ca trên thẻ ca theo ngôn ngữ đang hiển thị.
const NOW = new Date(2026, 9, 1, 10, 0); // Thứ Năm 01/10/2026 (giờ địa phương)

describe('formatRelativeDay', () => {
  it('vi: giống hệt formatRelativeDayVN', () => {
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-09', '2027-01-05', 'bad']) {
      expect(formatRelativeDay(d, 'vi', NOW)).toBe(formatRelativeDayVN(d, NOW));
    }
  });

  it('en: Today / Tomorrow / "Fri, 09/10"; khác năm thêm năm', () => {
    expect(formatRelativeDay('2026-10-01', 'en', NOW)).toBe('Today');
    expect(formatRelativeDay('2026-10-02', 'en', NOW)).toBe('Tomorrow');
    expect(formatRelativeDay('2026-10-09', 'en', NOW)).toBe('Fri, 09/10');
    expect(formatRelativeDay('2027-01-05', 'en', NOW)).toBe('Tue, 05/01/2027');
  });
});
