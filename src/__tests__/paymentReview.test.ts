import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  PAYMENT_REVIEW_REASONS,
  fillTemplate,
  formatReviewNote,
  isDuplicateSuspect,
  isLegacyPaidRetry,
  parseReviewReasonNotes,
  paymentReviewCreditBlock,
  paymentReviewDismissBlock,
  paymentReviewSummary,
  shouldRecordReviewItem,
  toPaidAmountInt,
  type PaymentReviewItemLike,
} from '@/domain/paymentReview';

// Giao dịch nạp PayOS bị đánh dấu cần admin kiểm tra (0027 needs_review). Khớp
// server migration 0029 (credit_wallet_from_payos ghi payment_review_items,
// admin_resolve_payment_review, backfill từ review_reason).

const ADMIN = 'admin-1';
const item = (over: Partial<PaymentReviewItemLike> = {}): PaymentReviewItemLike => ({
  id: 'i1',
  orderId: 'o1',
  userId: 'u1',
  reason: 'AMOUNT_MISMATCH',
  status: 'Pending',
  paidAmount: 50000,
  txnRef: 'FT123',
  ...over,
});

describe('PAYMENT_REVIEW_REASONS — 6 lý do của 0027 + DUPLICATE_TXN_REF (0030)', () => {
  it('đủ 7 lý do', () => {
    expect([...PAYMENT_REVIEW_REASONS].sort()).toEqual([
      'ALREADY_FLAGGED',
      'AMOUNT_MISMATCH',
      'DUPLICATE_TXN_REF',
      'EXTRA_PAYMENT',
      'LINK_MISMATCH',
      'MISSING_REFERENCE',
      'ORDER_NOT_PAYABLE',
    ]);
  });
});

describe('toPaidAmountInt — số tiền PayOS báo, ngoài khoảng int4 → null (0030, webhook không lỗi 500 lặp)', () => {
  it('số nguyên dương trong int4 → giữ nguyên', () => {
    expect(toPaidAmountInt(50000)).toBe(50000);
    expect(toPaidAmountInt(2147483647)).toBe(2147483647);
  });
  it('vượt int4, ≤ 0, số lẻ, không phải số hữu hạn, null → null', () => {
    for (const v of [2147483648, 1e21, 0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(toPaidAmountInt(v)).toBeNull();
    }
  });
  it('property: kết quả luôn null hoặc số nguyên trong [1, 2147483647]', () => {
    fc.assert(
      fc.property(fc.oneof(fc.double(), fc.integer(), fc.constant(null)), (v) => {
        const r = toPaidAmountInt(v);
        return r === null || (Number.isInteger(r) && r >= 1 && r <= 2147483647 && r === v);
      }),
    );
  });
});

describe('isLegacyPaidRetry — đơn PAID trước 0027 (không có mã giao dịch) chỉ coi là PayOS gửi lại trong 24 giờ', () => {
  const now = '2026-10-01T12:00:00.000Z';
  it('trả trong 24 giờ → gửi lại (không ghi gì)', () => {
    expect(isLegacyPaidRetry('2026-10-01T00:00:00.000Z', now)).toBe(true);
    expect(isLegacyPaidRetry('2026-09-30T12:00:00.001Z', now)).toBe(true);
  });
  it('quá 24 giờ hoặc không có giờ trả → giao dịch mới (ghi dòng kiểm tra)', () => {
    expect(isLegacyPaidRetry('2026-09-30T12:00:00.000Z', now)).toBe(false);
    expect(isLegacyPaidRetry('2026-09-24T09:55:22.377Z', now)).toBe(false);
    expect(isLegacyPaidRetry(null, now)).toBe(false);
  });
});

describe('formatReviewNote / parseReviewReasonNotes — chuỗi review_reason của 0027', () => {
  it('đúng định dạng 0027: "<LÝ DO> paid=<số|null> ref=<mã|->"', () => {
    expect(formatReviewNote('AMOUNT_MISMATCH', 49000, 'FT1')).toBe('AMOUNT_MISMATCH paid=49000 ref=FT1');
    expect(formatReviewNote('MISSING_REFERENCE', null, null)).toBe('MISSING_REFERENCE paid=null ref=-');
  });

  it('tách nhiều giao dịch nối bằng " | "', () => {
    expect(parseReviewReasonNotes('AMOUNT_MISMATCH paid=49000 ref=FT1 | ALREADY_FLAGGED paid=1000 ref=FT2')).toEqual([
      { reason: 'AMOUNT_MISMATCH', paidAmount: 49000, txnRef: 'FT1' },
      { reason: 'ALREADY_FLAGGED', paidAmount: 1000, txnRef: 'FT2' },
    ]);
  });

  it('paid=null → null; ref=- → null; đoạn lạ / rỗng bị bỏ qua', () => {
    expect(parseReviewReasonNotes('MISSING_REFERENCE paid=null ref=- | ghi tay | ')).toEqual([
      { reason: 'MISSING_REFERENCE', paidAmount: null, txnRef: null },
    ]);
    expect(parseReviewReasonNotes(null)).toEqual([]);
    expect(parseReviewReasonNotes('UNKNOWN paid=1 ref=x')).toEqual([]);
  });

  it('property: ghép rồi tách ra đúng như cũ', () => {
    const note = fc.record({
      reason: fc.constantFrom(...PAYMENT_REVIEW_REASONS),
      paidAmount: fc.option(fc.integer({ min: 0, max: 50_000_000 }), { nil: null }),
      txnRef: fc.option(fc.stringMatching(/^[A-Za-z0-9_-]{1,20}$/).filter((s) => s !== '-'), { nil: null }),
    });
    fc.assert(fc.property(fc.array(note, { maxLength: 6 }), (notes) => {
      const text = notes.map((n) => formatReviewNote(n.reason, n.paidAmount, n.txnRef)).join(' | ');
      expect(parseReviewReasonNotes(text)).toEqual(notes);
    }));
  });
});

describe('shouldRecordReviewItem — chống ghi trùng khi PayOS gửi lại webhook', () => {
  it('có mã giao dịch: đã có dòng cùng mã của đơn → không ghi', () => {
    expect(shouldRecordReviewItem([item()], { paidAmount: 50000, txnRef: 'FT123' })).toBe(false);
    expect(shouldRecordReviewItem([item()], { paidAmount: 50000, txnRef: 'FT999' })).toBe(true);
  });

  it('không có mã: trùng số tiền với dòng không mã (mọi trạng thái) → không ghi', () => {
    const noRef = item({ txnRef: null, reason: 'MISSING_REFERENCE', status: 'Credited' });
    expect(shouldRecordReviewItem([noRef], { paidAmount: 50000, txnRef: null })).toBe(false);
    expect(shouldRecordReviewItem([noRef], { paidAmount: 60000, txnRef: null })).toBe(true);
    // Dòng có mã không chặn giao dịch không mã cùng số tiền.
    expect(shouldRecordReviewItem([item()], { paidAmount: 50000, txnRef: null })).toBe(true);
  });

  it('chưa có dòng nào → ghi', () => {
    expect(shouldRecordReviewItem([], { paidAmount: null, txnRef: null })).toBe(true);
  });
});

describe('isDuplicateSuspect — cùng một lần chuyển có thể bị ghi 2 dòng (có mã / không mã)', () => {
  const credited = (over: Partial<PaymentReviewItemLike> = {}) =>
    item({ id: 'c0', status: 'Credited', ...over });

  it('dòng không mã + đơn đã có dòng không mã khác được cộng (mọi số tiền) → nghi trùng', () => {
    const cur = item({ txnRef: null });
    expect(isDuplicateSuspect(cur, [credited({ txnRef: null, paidAmount: 10000 }), cur], null)).toBe(true);
  });

  it('dòng không mã + đơn đã có dòng CÓ mã cùng số tiền được cộng → nghi trùng; khác số tiền → không', () => {
    const cur = item({ txnRef: null, paidAmount: 50000 });
    expect(isDuplicateSuspect(cur, [credited({ txnRef: 'FT1', paidAmount: 50000 })], null)).toBe(true);
    expect(isDuplicateSuspect(cur, [credited({ txnRef: 'FT1', paidAmount: 60000 })], null)).toBe(false);
  });

  it('dòng không mã + đơn đã được cộng TỰ ĐỘNG đúng số đó → nghi trùng (PayOS gửi lại thiếu mã)', () => {
    const cur = item({ txnRef: null, paidAmount: 50000, reason: 'EXTRA_PAYMENT' });
    expect(isDuplicateSuspect(cur, [], 50000)).toBe(true);
    expect(isDuplicateSuspect(cur, [], 20000)).toBe(false);
  });

  it('dòng CÓ mã + đơn đã có dòng không mã cùng số tiền được cộng → nghi trùng', () => {
    expect(isDuplicateSuspect(item(), [credited({ txnRef: null, paidAmount: 50000 })], null)).toBe(true);
    expect(isDuplicateSuspect(item(), [credited({ txnRef: null, paidAmount: 1000 })], null)).toBe(false);
  });

  it('dòng CÓ mã: dòng có mã khác đã cộng / cộng tự động không làm nghi trùng (mã khác = giao dịch khác)', () => {
    expect(isDuplicateSuspect(item(), [credited({ txnRef: 'FT9', paidAmount: 50000 })], 50000)).toBe(false);
  });

  it('mã giao dịch đã được xử ở ĐƠN KHÁC — cộng hoặc "không cộng" (đã hoàn tay) → nghi trùng', () => {
    const cur = item({ reason: 'DUPLICATE_TXN_REF' });
    expect(isDuplicateSuspect(cur, [], null, { txnRefResolvedElsewhere: true })).toBe(true);
    expect(isDuplicateSuspect(cur, [], null, { txnRefResolvedElsewhere: false })).toBe(false);
    // Không mã thì cờ này không áp dụng.
    expect(isDuplicateSuspect(item({ txnRef: null }), [], null, { txnRefResolvedElsewhere: true })).toBe(false);
  });

  it('đơn PAID trước 0027 (không biết mã đã cộng): dòng có mã HAY không mã cùng số tiền đơn → nghi trùng', () => {
    const opts = { legacyCreditedAmount: 50000 };
    expect(isDuplicateSuspect(item({ reason: 'EXTRA_PAYMENT', paidAmount: 50000 }), [], null, opts)).toBe(true);
    expect(isDuplicateSuspect(item({ reason: 'EXTRA_PAYMENT', txnRef: null, paidAmount: 50000 }), [], null, opts)).toBe(true);
    expect(isDuplicateSuspect(item({ reason: 'EXTRA_PAYMENT', paidAmount: 20000 }), [], null, opts)).toBe(false);
  });

  it('chỉ xét dòng Credited của CÙNG đơn, khác chính nó', () => {
    const cur = item({ txnRef: null });
    expect(isDuplicateSuspect(cur, [credited({ txnRef: null, orderId: 'o2' })], null)).toBe(false);
    expect(isDuplicateSuspect(cur, [item({ id: 'p', txnRef: null, status: 'Pending' })], null)).toBe(false);
    expect(isDuplicateSuspect(cur, [{ ...cur, status: 'Credited' }], null)).toBe(false);
  });
});

describe('paymentReviewCreditBlock — khi nào admin KHÔNG được cộng ví', () => {
  it('dòng chờ, có số tiền > 0, admin khác người nạp, không nghi trùng → được cộng', () => {
    expect(paymentReviewCreditBlock(item(), ADMIN, false)).toBeNull();
  });

  it('đã xử lý → ALREADY_REVIEWED (kiểm trước cả người nạp)', () => {
    expect(paymentReviewCreditBlock(item({ status: 'Credited' }), ADMIN, false)).toBe('ALREADY_REVIEWED');
    expect(paymentReviewCreditBlock(item({ status: 'Dismissed' }), ADMIN, false)).toBe('ALREADY_REVIEWED');
    expect(paymentReviewCreditBlock(item({ status: 'Credited' }), 'u1', false)).toBe('ALREADY_REVIEWED');
  });

  it('admin là người nạp → FORBIDDEN', () => {
    expect(paymentReviewCreditBlock(item(), 'u1', false)).toBe('FORBIDDEN');
  });

  it('không biết số tiền hoặc ≤ 0 → NOTHING_TO_CREDIT', () => {
    expect(paymentReviewCreditBlock(item({ paidAmount: null }), ADMIN, false)).toBe('NOTHING_TO_CREDIT');
    expect(paymentReviewCreditBlock(item({ paidAmount: 0 }), ADMIN, false)).toBe('NOTHING_TO_CREDIT');
  });

  it('nghi trùng → DUPLICATE_SUSPECT', () => {
    expect(paymentReviewCreditBlock(item(), ADMIN, true)).toBe('DUPLICATE_SUSPECT');
  });
});

describe('paymentReviewDismissBlock — bỏ qua (không cộng ví)', () => {
  it('dòng chờ → được; đã xử lý → ALREADY_REVIEWED; người nạp → FORBIDDEN', () => {
    expect(paymentReviewDismissBlock(item({ paidAmount: null }), ADMIN)).toBeNull();
    expect(paymentReviewDismissBlock(item({ status: 'Dismissed' }), ADMIN)).toBe('ALREADY_REVIEWED');
    expect(paymentReviewDismissBlock(item(), 'u1')).toBe('FORBIDDEN');
  });
});

describe('paymentReviewSummary — người nạp thấy gì trong ví', () => {
  it('đếm dòng chờ, tổng đã cộng, số dòng bỏ qua', () => {
    const items = [
      { status: 'Pending' as const, creditedAmount: null },
      { status: 'Credited' as const, creditedAmount: 49000 },
      { status: 'Credited' as const, creditedAmount: 1000 },
      { status: 'Dismissed' as const, creditedAmount: null },
    ];
    expect(paymentReviewSummary(items)).toEqual({ pendingCount: 1, creditedTotal: 50000, dismissedCount: 1 });
    expect(paymentReviewSummary([])).toEqual({ pendingCount: 0, creditedTotal: 0, dismissedCount: 0 });
  });

  it('property: tổng đã cộng = tổng creditedAmount của các dòng Credited; số dòng được bảo toàn', () => {
    const row = fc.oneof(
      fc.record({ status: fc.constant('Pending' as const), creditedAmount: fc.constant(null) }),
      fc.record({ status: fc.constant('Dismissed' as const), creditedAmount: fc.constant(null) }),
      fc.record({ status: fc.constant('Credited' as const), creditedAmount: fc.integer({ min: 1, max: 50_000_000 }) }),
    );
    fc.assert(fc.property(fc.array(row, { maxLength: 30 }), (rows) => {
      const s = paymentReviewSummary(rows);
      const credited = rows.filter((r) => r.status === 'Credited');
      expect(s.creditedTotal).toBe(credited.reduce((a, r) => a + (r.creditedAmount ?? 0), 0));
      expect(s.pendingCount + s.dismissedCount + credited.length).toBe(rows.length);
    }));
  });
});

describe('fillTemplate — điền chữ người dùng nhập vào mẫu câu (một lượt)', () => {
  it('điền mọi chỗ trống', () => {
    expect(fillTemplate('Người nạp: {name} · {email}', { name: 'An', email: 'a@x' })).toBe('Người nạp: An · a@x');
  });

  it('giá trị chứa "{email}" / "$&" không bị điền tiếp hay diễn giải', () => {
    expect(fillTemplate('{name} · {email}', { name: '{email}', email: 'thật@x' })).toBe('{email} · thật@x');
    expect(fillTemplate('{name}', { name: '$& $1' })).toBe('$& $1');
  });

  it('chỗ trống không có giá trị → giữ nguyên', () => {
    expect(fillTemplate('{a} {b}', { a: '1' })).toBe('1 {b}');
  });
});
