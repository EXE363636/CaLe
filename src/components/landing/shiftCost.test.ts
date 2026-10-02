/**
 * Máy tính chi phí ca ở `/for-employers` (03/10): số phải khớp luồng server —
 * tiền công làm tròn như `compute_shift_amount`, phí 10% (0 trong đợt miễn phí /
 * bản demo), có người vắng thì chỉ trả người đã làm, phí trên phần đã làm, phần
 * còn lại hoàn về ví. Mọi đồng giữ trước đi về đúng một trong ba nơi.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { parseMoneyInput, shiftCostBreakdown } from './shiftCost';

describe('shiftCostBreakdown', () => {
  it('ca 2 người × 4 giờ × 45.000 đ, phí 10%', () => {
    expect(shiftCostBreakdown({ wage: 45_000, start: '08:00', end: '12:00', people: 2, absent: 0, rate: 0.1 })).toEqual({
      hours: 4,
      wages: 360_000,
      fee: 36_000,
      held: 396_000,
      paid: 360_000,
      paidFee: 36_000,
      refund: 0,
    });
  });

  it('một người vắng: trả người đã làm, phí trên phần đã làm, hoàn phần còn lại (cả phí)', () => {
    expect(shiftCostBreakdown({ wage: 45_000, start: '08:00', end: '12:00', people: 2, absent: 1, rate: 0.1 })).toEqual({
      hours: 4,
      wages: 360_000,
      fee: 36_000,
      held: 396_000,
      paid: 180_000,
      paidFee: 18_000,
      refund: 198_000,
    });
  });

  it('miễn phí (đợt miễn phí hoặc bản demo): không cộng phí', () => {
    const r = shiftCostBreakdown({ wage: 30_000, start: '18:00', end: '22:30', people: 3, absent: 0, rate: 0 });
    expect(r).toMatchObject({ hours: 4.5, wages: 405_000, fee: 0, held: 405_000 });
  });

  it('làm tròn tiền công như server (giờ lẻ)', () => {
    const r = shiftCostBreakdown({ wage: 25_000, start: '09:00', end: '11:20', people: 1, absent: 0, rate: 0.1 });
    expect(r?.wages).toBe(58_333);
    expect(r?.fee).toBe(5_833);
  });

  it('dữ liệu chưa hợp lệ → null', () => {
    const base = { wage: 45_000, start: '08:00', end: '12:00', people: 2, absent: 0, rate: 0.1 };
    expect(shiftCostBreakdown({ ...base, wage: 0 })).toBeNull();
    expect(shiftCostBreakdown({ ...base, people: 0 })).toBeNull();
    expect(shiftCostBreakdown({ ...base, end: '08:00' })).toBeNull();
    expect(shiftCostBreakdown({ ...base, start: '8h' })).toBeNull();
    // Ca qua đêm chưa hỗ trợ (giống form đăng ca).
    expect(shiftCostBreakdown({ ...base, start: '22:00', end: '02:00' })).toBeNull();
  });

  it('số người vắng bị chặn trong [0, số người]', () => {
    const r = shiftCostBreakdown({ wage: 45_000, start: '08:00', end: '12:00', people: 1, absent: 5, rate: 0.1 });
    expect(r).toMatchObject({ paid: 0, paidFee: 0, refund: 198_000 });
  });

  it('bảo toàn tiền: giữ = trả + phí giữ lại + hoàn, không âm', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000, max: 2_000_000 }),
        fc.integer({ min: 0, max: 22 * 60 }),
        fc.integer({ min: 1, max: 120 }),
        fc.integer({ min: 1, max: 50 }),
        fc.nat(50),
        fc.constantFrom(0, 0.1),
        (wage, startMin, len, people, absent, rate) => {
          const endMin = Math.min(startMin + len, 23 * 60 + 59);
          const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          const r = shiftCostBreakdown({ wage, start: hhmm(startMin), end: hhmm(endMin), people, absent, rate });
          if (!r) return;
          expect(r.paid + r.paidFee + r.refund).toBe(r.held);
          expect(Math.min(r.paid, r.paidFee, r.refund)).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});

describe('parseMoneyInput', () => {
  it('chỉ giữ chữ số', () => {
    expect(parseMoneyInput('45.000')).toBe(45_000);
    expect(parseMoneyInput('45,000 đ')).toBe(45_000);
    expect(parseMoneyInput('')).toBe(0);
    expect(parseMoneyInput('abc')).toBe(0);
  });
  it('chặn trần để ô nhập không phình', () => {
    expect(parseMoneyInput('99999999999')).toBe(10_000_000);
  });
});
