/**
 * Sổ tiền của ca mẫu ở các minh hoạ landing (03/10): ca suôn sẻ, ca bị huỷ, ca có
 * người vắng. Số phải khớp luồng server: production giữ tiền công + 10% phí; phí chỉ
 * tính phần có người làm; ca huỷ hoàn đủ (cả phí); demo chưa thu phí. Mọi đồng giữ
 * trước đi về đúng một trong ba nơi.
 */

import { describe, expect, it } from 'vitest';

import { LANDING_SAMPLE_SHIFTS, sampleLedger, type LandingSampleShift } from './landingSamples';

const base: LandingSampleShift = {
  title: 'Ca thử',
  day: 'Thứ 2',
  start: '08:00',
  end: '12:00',
  wage: 50_000,
  hours: 4,
  people: 2,
  walletBefore: 0,
  employerWallet: 1_000_000,
};

describe('sampleLedger', () => {
  it('ca suôn sẻ: trả đủ, không hoàn', () => {
    expect(sampleLedger(base, false)).toEqual({ outcome: 'ok', held: 400_000, paid: 400_000, fee: 0, refund: 0, worked: 2 });
    expect(sampleLedger(base, true)).toEqual({ outcome: 'ok', held: 440_000, paid: 400_000, fee: 40_000, refund: 0, worked: 2 });
  });

  it('ca bị huỷ: không trả ai, không thu phí, hoàn đủ tiền đã giữ', () => {
    const s = { ...base, cancelReason: 'Lý do' };
    expect(sampleLedger(s, false)).toEqual({ outcome: 'cancelled', held: 400_000, paid: 0, fee: 0, refund: 400_000, worked: 0 });
    expect(sampleLedger(s, true)).toEqual({ outcome: 'cancelled', held: 440_000, paid: 0, fee: 0, refund: 440_000, worked: 0 });
  });

  it('có người vắng: chỉ trả người đã làm, phí trên phần đã làm, hoàn phần người vắng (cả phí)', () => {
    const s = { ...base, noShow: 1 };
    expect(sampleLedger(s, false)).toEqual({ outcome: 'noShow', held: 400_000, paid: 200_000, fee: 0, refund: 200_000, worked: 1 });
    expect(sampleLedger(s, true)).toEqual({ outcome: 'noShow', held: 440_000, paid: 200_000, fee: 20_000, refund: 220_000, worked: 1 });
  });

  it('mọi ca mẫu: giữ trước = trả + phí + hoàn, không âm', () => {
    for (const s of LANDING_SAMPLE_SHIFTS) {
      for (const live of [false, true]) {
        const l = sampleLedger(s, live);
        expect(l.paid + l.fee + l.refund, s.title).toBe(l.held);
        expect(Math.min(l.paid, l.fee, l.refund)).toBeGreaterThanOrEqual(0);
        expect(l.worked).toBeLessThanOrEqual(s.people);
      }
    }
  });

  it('dữ liệu mẫu có đủ các trường hợp không suôn sẻ', () => {
    const outcomes = LANDING_SAMPLE_SHIFTS.map((s) => sampleLedger(s, false).outcome);
    expect(outcomes.filter((o) => o === 'cancelled')).toHaveLength(2);
    expect(outcomes.filter((o) => o === 'noShow')).toHaveLength(2);
    expect(LANDING_SAMPLE_SHIFTS.filter((s) => s.workerNotSelected)).toHaveLength(1);
    // Người vắng phải ít hơn số người của ca (còn ít nhất một người làm).
    for (const s of LANDING_SAMPLE_SHIFTS) if (s.noShow) expect(s.noShow).toBeLessThan(s.people);
  });
});
