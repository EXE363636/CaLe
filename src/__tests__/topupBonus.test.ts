import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  splitDepositFunding,
  splitDepositSettlement,
  topUpBonusFor,
} from '@/domain/topupBonus';

// P2-2 (F10) — thưởng nạp ví: tiền thưởng nằm ở "túi thưởng", CHỈ trả phí dịch
// vụ (không trả công, không rút). Khớp server migration 0026
// (credit_wallet_from_payment / confirm_deposit_session / _finalize_shift_deposit).

describe('topUpBonusFor', () => {
  const rule = { minAmount: 500000, bonusAmount: 100000, maxPerUser: 1 };

  it('nạp đủ mức, chưa nhận lần nào → thưởng', () => {
    expect(topUpBonusFor(500000, rule, 0)).toBe(100000);
    expect(topUpBonusFor(2000000, rule, 0)).toBe(100000);
  });

  it('nạp dưới mức → không thưởng', () => {
    expect(topUpBonusFor(499999, rule, 0)).toBe(0);
  });

  it('đã nhận đủ số lần → không thưởng', () => {
    expect(topUpBonusFor(500000, rule, 1)).toBe(0);
    expect(topUpBonusFor(500000, { ...rule, maxPerUser: 3 }, 2)).toBe(100000);
  });

  it('chương trình tắt (thưởng 0) → không thưởng', () => {
    expect(topUpBonusFor(900000, { ...rule, bonusAmount: 0 }, 0)).toBe(0);
  });
});

describe('splitDepositFunding — giữ cọc: thưởng trả phí trước', () => {
  it('thưởng đủ trả hết phí → tiền mặt chỉ trả tiền công', () => {
    // cọc 165.000 = công 150.000 + phí 15.000; thưởng 100.000
    expect(splitDepositFunding(165000, 15000, 100000)).toEqual({ promoUse: 15000, cashNeeded: 150000 });
  });

  it('thưởng ít hơn phí → dùng hết thưởng, tiền mặt bù phần phí còn lại', () => {
    expect(splitDepositFunding(165000, 15000, 4000)).toEqual({ promoUse: 4000, cashNeeded: 161000 });
  });

  it('không có thưởng hoặc phí 0 (đợt miễn phí) → toàn tiền mặt', () => {
    expect(splitDepositFunding(165000, 15000, 0)).toEqual({ promoUse: 0, cashNeeded: 165000 });
    expect(splitDepositFunding(150000, 0, 100000)).toEqual({ promoUse: 0, cashNeeded: 150000 });
  });
});

describe('splitDepositSettlement — chốt cọc: phần thưởng không thành tiền mặt', () => {
  it('ca làm đủ → phí giữ lại lấy từ thưởng trước, không hoàn gì', () => {
    // cọc 165.000 (phí 15.000, thưởng dùng 15.000); trả công 150.000, phí giữ 15.000
    expect(splitDepositSettlement({ refund: 0, feeKept: 15000, promoUsed: 15000 })).toEqual({
      feeKeptPromo: 15000,
      feeKeptCash: 0,
      refundPromo: 0,
      refundCash: 0,
    });
  });

  it('ca huỷ trước khi làm → thưởng về túi thưởng, tiền mặt về tiền mặt', () => {
    expect(splitDepositSettlement({ refund: 165000, feeKept: 0, promoUsed: 15000 })).toEqual({
      feeKeptPromo: 0,
      feeKeptCash: 0,
      refundPromo: 15000,
      refundCash: 150000,
    });
  });

  it('làm một nửa → phí giữ một nửa (từ thưởng), nửa thưởng còn lại hoàn về túi thưởng', () => {
    // công 75.000 đã trả, phí giữ 7.500; hoàn 165.000 − 75.000 − 7.500 = 82.500
    expect(splitDepositSettlement({ refund: 82500, feeKept: 7500, promoUsed: 15000 })).toEqual({
      feeKeptPromo: 7500,
      feeKeptCash: 0,
      refundPromo: 7500,
      refundCash: 75000,
    });
  });

  it('thưởng chỉ trả một phần phí → phí giữ vượt phần thưởng thì phần dư là tiền mặt', () => {
    expect(splitDepositSettlement({ refund: 0, feeKept: 15000, promoUsed: 4000 })).toEqual({
      feeKeptPromo: 4000,
      feeKeptCash: 11000,
      refundPromo: 0,
      refundCash: 0,
    });
  });

  it('không dùng thưởng → giống hệt trước đây', () => {
    expect(splitDepositSettlement({ refund: 82500, feeKept: 7500, promoUsed: 0 })).toEqual({
      feeKeptPromo: 0,
      feeKeptCash: 7500,
      refundPromo: 0,
      refundCash: 82500,
    });
  });
});

describe('splitDepositSettlement — bảo toàn tiền (property)', () => {
  it('không sinh/mất tiền, thưởng không hoàn vượt phần đã dùng, không số âm', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }), // tiền công
        fc.integer({ min: 0, max: 500_000 }), // phí
        fc.integer({ min: 0, max: 1_000_000 }), // số dư thưởng
        fc.double({ min: 0, max: 1, noNaN: true }), // tỉ lệ đã làm
        (wage, fee, promo, ratio) => {
          const amount = wage + fee;
          const { promoUse } = splitDepositFunding(amount, fee, promo);
          const paid = Math.round(wage * ratio);
          const feeKept = wage > 0 ? Math.min(fee, Math.round((fee * paid) / wage)) : 0;
          const refund = Math.max(amount - paid - feeKept, 0);
          const r = splitDepositSettlement({ refund, feeKept, promoUsed: promoUse });

          expect(r.feeKeptPromo + r.feeKeptCash).toBe(feeKept);
          expect(r.refundPromo + r.refundCash).toBe(refund);
          expect(r.feeKeptPromo + r.refundPromo).toBeLessThanOrEqual(promoUse);
          for (const v of Object.values(r)) expect(v).toBeGreaterThanOrEqual(0);
          // Tiền mặt vào (amount − promoUse) = tiền mặt ra (công + hoàn tiền mặt + phí tiền mặt).
          expect(paid + r.refundCash + r.feeKeptCash).toBe(amount - promoUse);
        },
      ),
    );
  });
});
