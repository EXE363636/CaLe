/**
 * Mức lương tham khảo trên thẻ loại việc ở `/for-workers` (03/10): tính từ các ca
 * ĐANG TUYỂN thật (cùng điều kiện với danh sách `/shifts`), không phải số tự đặt.
 */

import { describe, expect, it } from 'vitest';

import { wageRanges } from './wageReference';

const s = (jobType: string, hourlyWage: number) => ({ jobType, hourlyWage });

describe('wageRanges', () => {
  it('gom theo loại việc: thấp nhất, cao nhất, số ca', () => {
    const r = wageRanges([s('Phục vụ', 30_000), s('Phục vụ', 45_000), s('Pha chế', 40_000), s('Phục vụ', 35_000)]);
    expect(r.get('Phục vụ')).toEqual({ min: 30_000, max: 45_000, count: 3 });
    expect(r.get('Pha chế')).toEqual({ min: 40_000, max: 40_000, count: 1 });
    expect(r.get('Bảo vệ')).toBeUndefined();
  });

  it('bỏ qua lương không hợp lệ', () => {
    const r = wageRanges([s('Phục vụ', 0), s('Phục vụ', Number.NaN), s('Phục vụ', 32_000)]);
    expect(r.get('Phục vụ')).toEqual({ min: 32_000, max: 32_000, count: 1 });
  });

  it('không có ca → map rỗng', () => {
    expect(wageRanges([]).size).toBe(0);
  });
});
