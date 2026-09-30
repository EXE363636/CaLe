import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  DEFAULT_WORKER_DEPOSIT_SETTINGS,
  NO_SHOW_CONTEST_HOURS,
  WORKER_HOLD_STALE_DAYS,
  forfeitNeedsReview,
  forfeitReviewReason,
  noShowForfeitDeadline,
  workerDepositLimitReached,
  workerDepositAmount,
  workerDepositExemption,
  workerHoldOutcome,
  workerHoldSettlement,
  workerShiftWage,
  type WorkerDepositSettings,
} from '@/domain/workerDeposit';

// P2-1 (F9) — cọc người lao động. Khớp server migration 0028
// (_worker_deposit_status / apply / trigger hoàn cọc / _settle_worker_holds_overdue).

const ON: WorkerDepositSettings = { ...DEFAULT_WORKER_DEPOSIT_SETTINGS, enabled: true };
const NOW = '2026-10-01T05:00:00.000Z';
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();

describe('DEFAULT_WORKER_DEPOSIT_SETTINGS', () => {
  it('mặc định TẮT, 50%, tối đa 100.000 đ, miễn sau 5 ca / 30 ngày, ≤3 khoản, trần chuyển 300.000 đ/ngày/NTD', () => {
    expect(DEFAULT_WORKER_DEPOSIT_SETTINGS).toEqual({
      enabled: false, ratioPct: 50, maxAmount: 100000, exemptAfter: 5, windowDays: 30,
      maxOpenHolds: 3, forfeitDailyCap: 300000,
    });
  });

  it('hạn khiếu nại 72 giờ, hoàn dự phòng sau 7 ngày', () => {
    expect(NO_SHOW_CONTEST_HOURS).toBe(72);
    expect(WORKER_HOLD_STALE_DAYS).toBe(7);
  });
});

describe('forfeitReviewReason — khi nào cọc vắng mặt KHÔNG tự chuyển mà chờ admin', () => {
  const base = { autoMarkedNoShow: false, forfeitedLast24h: 0, amount: 75000, dailyCap: 300000 };

  it('NTD tự đánh vắng, dưới trần → tự chuyển (null)', () => {
    expect(forfeitReviewReason(base)).toBeNull();
  });

  it('hệ thống tự đánh vắng (NTD không xác nhận gì) → chờ admin, kể cả dưới trần', () => {
    expect(forfeitReviewReason({ ...base, autoMarkedNoShow: true })).toBe('AUTO_NO_SHOW');
  });

  it('NTD tự đánh vắng nhưng vượt trần 24 giờ → chờ admin vì trần', () => {
    expect(forfeitReviewReason({ ...base, forfeitedLast24h: 250000 })).toBe('EMPLOYER_DAILY_CAP');
  });

  it('cả hai → ưu tiên AUTO_NO_SHOW', () => {
    expect(forfeitReviewReason({ ...base, autoMarkedNoShow: true, forfeitedLast24h: 250000 })).toBe('AUTO_NO_SHOW');
  });
});

describe('workerDepositLimitReached — T2: tối đa N khoản cọc đang giữ / khiếu nại cùng lúc', () => {
  it('dưới trần → được giữ thêm; bằng trần → chặn', () => {
    expect(workerDepositLimitReached(2, 3)).toBe(false);
    expect(workerDepositLimitReached(3, 3)).toBe(true);
    expect(workerDepositLimitReached(4, 3)).toBe(true);
  });
});

describe('forfeitNeedsReview — T2: trần tiền cọc vắng mặt tự chuyển cho 1 NTD / 24 giờ', () => {
  it('cộng dồn vượt trần → chờ admin; bằng trần → vẫn tự chuyển', () => {
    expect(forfeitNeedsReview(200000, 100000, 300000)).toBe(false);
    expect(forfeitNeedsReview(250000, 100000, 300000)).toBe(true);
    expect(forfeitNeedsReview(0, 100000, 0)).toBe(true);   // trần 0 → luôn chờ admin
  });

  it('property: tổng tự chuyển trong 24 giờ không bao giờ vượt trần', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 1, max: 500_000 }), { maxLength: 30 }),
      fc.integer({ min: 0, max: 2_000_000 }),
      (amounts, cap) => {
        let auto = 0;
        for (const a of amounts) if (!forfeitNeedsReview(auto, a, cap)) auto += a;
        expect(auto).toBeLessThanOrEqual(cap);
      },
    ));
  });
});

describe('workerShiftWage — tiền công 1 vị trí (khớp approve: round(lương giờ × số giờ))', () => {
  it('30.000 đ × 5 giờ = 150.000 đ', () => {
    expect(workerShiftWage(30000, '08:00', '13:00')).toBe(150000);
  });

  it('giờ lẻ làm tròn', () => {
    expect(workerShiftWage(25001, '08:00', '09:30')).toBe(37502); // 37501.5 → 37502
  });

  it('giờ không hợp lệ / qua đêm → 0', () => {
    expect(workerShiftWage(30000, '22:00', '02:00')).toBe(0);
  });
});

describe('workerDepositAmount — cọc = min(round(tiền công × tỉ lệ), tối đa)', () => {
  it('50% tiền công ca', () => {
    expect(workerDepositAmount(150000, ON)).toBe(75000);
  });

  it('chạm trần 100.000 đ', () => {
    expect(workerDepositAmount(200000, ON)).toBe(100000);
    expect(workerDepositAmount(1000000, ON)).toBe(100000);
  });

  it('làm tròn như Postgres round() (nửa lên)', () => {
    expect(workerDepositAmount(33333, ON)).toBe(16667);   // 16666.5 → 16667
    expect(workerDepositAmount(1, ON)).toBe(1);           // 0.5 → 1
  });

  it('tiền công 0 → cọc 0', () => {
    expect(workerDepositAmount(0, ON)).toBe(0);
  });

  it('property: 0 ≤ cọc ≤ min(tiền công, trần), là số nguyên, đơn điệu theo tiền công', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 50_000_000 }),
      fc.integer({ min: 0, max: 50_000_000 }),
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 0, max: 500_000 }),
      (a, b, ratioPct, maxAmount) => {
        const s = { ratioPct, maxAmount };
        const x = workerDepositAmount(a, s);
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(Math.min(a, maxAmount));
        if (a <= b) expect(x).toBeLessThanOrEqual(workerDepositAmount(b, s));
      },
    ));
  });
});

describe('workerDepositExemption', () => {
  const base = { identityVerifiedAt: null, completedShiftEnds: [], noShowAts: [], nowIso: NOW, settings: ON };

  it('cờ tắt → không cần cọc', () => {
    const r = workerDepositExemption({ ...base, settings: DEFAULT_WORKER_DEPOSIT_SETTINGS });
    expect(r.needsDeposit).toBe(false);
    expect(r.reason).toBe('DISABLED');
  });

  it('chưa xác thực, chưa đủ ca → cần cọc', () => {
    const r = workerDepositExemption({ ...base, completedShiftEnds: [daysAgo(1), daysAgo(2)] });
    expect(r).toEqual({ needsDeposit: true, reason: 'NOT_ENOUGH', completedInWindow: 2, blockedUntil: null });
  });

  it('đã duyệt CCCD → miễn', () => {
    const r = workerDepositExemption({ ...base, identityVerifiedAt: daysAgo(100) });
    expect(r.needsDeposit).toBe(false);
    expect(r.reason).toBe('IDENTITY');
  });

  it('≥5 ca hoàn thành trong 30 ngày → miễn', () => {
    const ends = [1, 3, 7, 20, 29].map(daysAgo);
    const r = workerDepositExemption({ ...base, completedShiftEnds: ends });
    expect(r.needsDeposit).toBe(false);
    expect(r.reason).toBe('COMPLETED_SHIFTS');
    expect(r.completedInWindow).toBe(5);
  });

  it('ca kết thúc đúng mốc 30 ngày trước KHÔNG tính (cửa sổ (now−30d, now])', () => {
    const ends = [1, 3, 7, 20, 30].map(daysAgo);
    const r = workerDepositExemption({ ...base, completedShiftEnds: ends });
    expect(r.completedInWindow).toBe(4);
    expect(r.needsDeposit).toBe(true);
  });

  it('ca kết thúc trong tương lai không tính', () => {
    const future = new Date(Date.parse(NOW) + 3_600_000).toISOString();
    const ends = [1, 2, 3, 4].map(daysAgo).concat(future);
    expect(workerDepositExemption({ ...base, completedShiftEnds: ends }).completedInWindow).toBe(4);
  });

  it('vắng mặt trong 30 ngày → LUÔN cần cọc, kể cả đã duyệt CCCD / đủ 5 ca', () => {
    const r = workerDepositExemption({
      ...base,
      identityVerifiedAt: daysAgo(100),
      completedShiftEnds: [1, 2, 3, 4, 5, 6].map(daysAgo),
      noShowAts: [daysAgo(40), daysAgo(10)],
    });
    expect(r.needsDeposit).toBe(true);
    expect(r.reason).toBe('RECENT_NO_SHOW');
    // hạn = lần vắng gần nhất + 30 ngày
    expect(r.blockedUntil).toBe(new Date(Date.parse(daysAgo(10)) + 30 * 86_400_000).toISOString());
  });

  it('vắng mặt đúng mốc 30 ngày trước → đã hết hạn chặn', () => {
    const r = workerDepositExemption({ ...base, identityVerifiedAt: daysAgo(100), noShowAts: [daysAgo(30)] });
    expect(r.needsDeposit).toBe(false);
    expect(r.blockedUntil).toBeNull();
  });

  it('tôn trọng cài đặt exemptAfter / windowDays', () => {
    const s = { ...ON, exemptAfter: 2, windowDays: 7 };
    const r = workerDepositExemption({ ...base, settings: s, completedShiftEnds: [daysAgo(1), daysAgo(6), daysAgo(8)] });
    expect(r.completedInWindow).toBe(2);
    expect(r.needsDeposit).toBe(false);
  });
});

describe('noShowForfeitDeadline — hạn khiếu nại = max(hết ca, lúc bị đánh vắng) + 72h', () => {
  const end = '2026-10-01T10:00:00.000Z';

  it('NTD đánh vắng trong ca → hạn = hết ca + 72h', () => {
    expect(noShowForfeitDeadline(end, '2026-10-01T02:30:00.000Z')).toBe('2026-10-04T10:00:00.000Z');
  });

  it('hệ thống tự đánh vắng lúc hết ca + 24h → worker vẫn còn đủ 72h', () => {
    expect(noShowForfeitDeadline(end, '2026-10-02T10:05:00.000Z')).toBe('2026-10-05T10:05:00.000Z');
  });
});

describe('workerHoldOutcome', () => {
  const start = '2026-10-01T02:00:00.000Z';
  const end = '2026-10-01T07:00:00.000Z';
  const base = {
    holdStatus: 'Held' as const, shiftStartIso: start, shiftEndIso: end, forfeitDeadlineIso: null, nowIso: NOW,
  };

  it.each(['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut', 'Disputed'] as const)(
    'L2: %s mà ca đã kết thúc ≥ 7 ngày → hoàn dự phòng (tiền không kẹt)', (appStatus) => {
      expect(workerHoldOutcome({ ...base, appStatus, nowIso: '2026-10-08T06:59:59.000Z' })).toBe('keep');
      expect(workerHoldOutcome({ ...base, appStatus, nowIso: '2026-10-08T07:00:00.000Z' })).toBe('refund');
    });

  it('L2: NoShow không dùng hoàn dự phòng (đi theo hạn khiếu nại)', () => {
    expect(workerHoldOutcome({
      ...base, appStatus: 'NoShow', forfeitDeadlineIso: '2026-10-20T00:00:00.000Z', nowIso: '2026-10-10T00:00:00.000Z',
    })).toBe('keep');
  });

  it.each(['Rejected', 'CancelledByWorker', 'CancelledByEmployer', 'Expired', 'Confirmed'] as const)(
    '%s → hoàn cọc worker', (appStatus) => {
      expect(workerHoldOutcome({ ...base, appStatus })).toBe('refund');
    });

  it.each(['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut', 'Disputed'] as const)(
    '%s → giữ cọc', (appStatus) => {
      expect(workerHoldOutcome({ ...base, appStatus })).toBe('keep');
    });

  it('Pending trước giờ bắt đầu → giữ; từ giờ bắt đầu → hoàn', () => {
    expect(workerHoldOutcome({ ...base, appStatus: 'Pending', nowIso: '2026-10-01T01:59:59.000Z' })).toBe('keep');
    expect(workerHoldOutcome({ ...base, appStatus: 'Pending', nowIso: start })).toBe('refund');
  });

  it('NoShow trước hạn → giữ; tới hạn → chuyển NTD', () => {
    const deadline = '2026-10-02T10:00:00.000Z';
    expect(workerHoldOutcome({ ...base, appStatus: 'NoShow', forfeitDeadlineIso: deadline, nowIso: '2026-10-02T09:59:59.000Z' })).toBe('keep');
    expect(workerHoldOutcome({ ...base, appStatus: 'NoShow', forfeitDeadlineIso: deadline, nowIso: deadline })).toBe('forfeit');
  });

  it('NoShow thiếu hạn → giữ (không chuyển tiền khi thiếu dữ liệu)', () => {
    expect(workerHoldOutcome({ ...base, appStatus: 'NoShow', forfeitDeadlineIso: null })).toBe('keep');
  });

  it.each(['Contested', 'Refunded', 'Forfeited'] as const)(
    'khoản giữ %s → không tự động xử lý nữa', (holdStatus) => {
      expect(workerHoldOutcome({ ...base, holdStatus, appStatus: 'Confirmed' })).toBe('keep');
      expect(workerHoldOutcome({ ...base, holdStatus, appStatus: 'NoShow', forfeitDeadlineIso: start })).toBe('keep');
    });
});

describe('workerHoldSettlement — bảo toàn tiền', () => {
  it('hoàn → về ví worker; chuyển → về ví NTD; giữ → không đổi', () => {
    expect(workerHoldSettlement(50000, 'refund')).toEqual({ workerCredit: 50000, employerCredit: 0 });
    expect(workerHoldSettlement(50000, 'forfeit')).toEqual({ workerCredit: 0, employerCredit: 50000 });
    expect(workerHoldSettlement(50000, 'keep')).toEqual({ workerCredit: 0, employerCredit: 0 });
  });

  it('property: khoản giữ đã xử lý chia đúng bằng số tiền giữ, không âm, CaLẻ không giữ phần nào', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 500_000 }),
      fc.constantFrom('refund' as const, 'forfeit' as const),
      (amount, outcome) => {
        const r = workerHoldSettlement(amount, outcome);
        expect(r.workerCredit).toBeGreaterThanOrEqual(0);
        expect(r.employerCredit).toBeGreaterThanOrEqual(0);
        expect(r.workerCredit + r.employerCredit).toBe(amount);
      },
    ));
  });
});
