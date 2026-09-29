import { describe, expect, it } from 'vitest';
import {
  calculateDepositWithFee,
  FEE_FREE_SHIFT_GRACE_DAYS,
  effectiveFeeRate,
  feeFreeShiftDeadline,
  isFeeFreeActive,
  isFeeFreeForShift,
  platformFee,
  shiftFeeRate,
  vietnamDate,
} from '@/domain/deposit';

// P2-3 (F12) — miễn phí dịch vụ theo đợt. Khớp server `_platform_fee_rate()`:
// miễn phí khi ngày hiện tại theo giờ Việt Nam (UTC+7) <= fee_free_until.

describe('vietnamDate', () => {
  it('đổi mốc UTC sang ngày theo giờ Việt Nam', () => {
    expect(vietnamDate('2026-10-05T16:59:59.000Z')).toBe('2026-10-05'); // 23:59:59 VN
    expect(vietnamDate('2026-10-05T17:00:00.000Z')).toBe('2026-10-06'); // 00:00 VN
  });
});

describe('isFeeFreeActive', () => {
  it('không có ngày → không miễn phí', () => {
    expect(isFeeFreeActive(null, '2026-10-01T03:00:00.000Z')).toBe(false);
  });

  it('miễn phí đến hết ngày fee_free_until (tính cả ngày đó, giờ VN)', () => {
    expect(isFeeFreeActive('2026-10-05', '2026-10-01T03:00:00.000Z')).toBe(true);
    expect(isFeeFreeActive('2026-10-05', '2026-10-05T16:59:59.000Z')).toBe(true);
  });

  it('hết hiệu lực từ 00:00 ngày hôm sau (giờ VN)', () => {
    expect(isFeeFreeActive('2026-10-05', '2026-10-05T17:00:00.000Z')).toBe(false);
  });
});

// Chủ dự án chọn phương án 2 (29/09): đăng trong đợt VÀ ngày làm ca không quá
// 30 ngày sau ngày kết thúc đợt — chặn đăng trước hàng loạt ca ở xa để né phí.
describe('isFeeFreeForShift (đợt đến hết 07/10)', () => {
  const until = '2026-10-07';
  const during = '2026-10-05T03:00:00.000Z';

  it('hạn ngày làm ca = ngày kết thúc đợt + 30 ngày', () => {
    expect(FEE_FREE_SHIFT_GRACE_DAYS).toBe(30);
    expect(feeFreeShiftDeadline(until)).toBe('2026-11-06');
  });

  it('ca trong đợt hoặc trong 30 ngày sau → miễn phí', () => {
    expect(isFeeFreeForShift(until, '2026-10-06', during)).toBe(true);
    expect(isFeeFreeForShift(until, '2026-10-20', during)).toBe(true);
    expect(isFeeFreeForShift(until, '2026-11-06', during)).toBe(true);
  });

  it('ca xa hơn 30 ngày sau đợt → tính phí', () => {
    expect(isFeeFreeForShift(until, '2026-11-07', during)).toBe(false);
    expect(isFeeFreeForShift(until, '2027-03-20', during)).toBe(false);
    expect(shiftFeeRate(until, '2027-03-20', during)).toBe(0.1);
  });

  it('đăng sau khi đợt kết thúc → tính phí dù ca gần', () => {
    expect(isFeeFreeForShift(until, '2026-10-09', '2026-10-08T03:00:00.000Z')).toBe(false);
  });

  it('thiếu ngày ca hoặc không có đợt → tính phí', () => {
    expect(isFeeFreeForShift(until, '', during)).toBe(false);
    expect(isFeeFreeForShift(null, '2026-10-06', during)).toBe(false);
    expect(shiftFeeRate(until, '2026-10-06', during)).toBe(0);
  });
});

// Security review 29/09: client phải làm tròn tiền công TRƯỚC khi tính phí,
// giống server (`compute_shift_amount` = round(lương × giờ × vị trí)), nếu
// không ca có phút lẻ luôn bị báo "phí vừa thay đổi".
describe('calculateDepositWithFee khớp server với ca có phút lẻ', () => {
  it('08:00–10:20, 25.000đ/giờ, 1 vị trí → 58.333 + 5.833 = 64.166', () => {
    expect(calculateDepositWithFee(25000, 140 / 60, 1)).toBe(64166);
  });

  it('trong đợt miễn phí → chỉ tiền công đã làm tròn', () => {
    expect(calculateDepositWithFee(25000, 140 / 60, 1, 0)).toBe(58333);
  });

  it('nửa đồng làm tròn lên như Postgres round()', () => {
    // 25.001 × 0,5 giờ = 12.500,5 → 12.501; phí round(1.250,1) = 1.250.
    expect(calculateDepositWithFee(25001, 0.5, 1)).toBe(12501 + 1250);
  });
});

describe('effectiveFeeRate + platformFee', () => {
  it('trong đợt miễn phí → phí 0', () => {
    const rate = effectiveFeeRate('2026-10-05', '2026-10-01T03:00:00.000Z');
    expect(rate).toBe(0);
    expect(platformFee(150000, rate)).toBe(0);
  });

  it('ngoài đợt → 10% như cũ', () => {
    const rate = effectiveFeeRate('2026-10-05', '2026-10-06T03:00:00.000Z');
    expect(rate).toBe(0.1);
    expect(platformFee(150000, rate)).toBe(15000);
    expect(platformFee(150000)).toBe(15000);
  });
});
