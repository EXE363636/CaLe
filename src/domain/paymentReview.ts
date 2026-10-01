/**
 * Giao dịch nạp PayOS cần admin kiểm tra — logic thuần, khớp migration 0029.
 *
 * Từ 0027 webhook không cộng ví khi giao dịch lệch (số tiền, mã giao dịch, link,
 * đơn đã huỷ, chuyển lần hai…): đơn bị đặt `needs_review` và mỗi giao dịch được
 * ghi một dòng `payment_review_items`. Admin xử từng dòng:
 *   - cộng ví đúng SỐ TIỀN THỰC NHẬN (PayOS báo, đã kiểm chữ ký) — không thưởng;
 *   - hoặc bỏ qua (đã hoàn tay / giao dịch không hợp lệ) — không cộng gì.
 */

export const PAYMENT_REVIEW_REASONS = [
  'AMOUNT_MISMATCH',
  'MISSING_REFERENCE',
  'LINK_MISMATCH',
  'ORDER_NOT_PAYABLE',
  'EXTRA_PAYMENT',
  'ALREADY_FLAGGED',
] as const;
export type PaymentReviewReason = (typeof PAYMENT_REVIEW_REASONS)[number];

export type PaymentReviewStatus = 'Pending' | 'Credited' | 'Dismissed';

export interface PaymentReviewItemLike {
  id: string;
  orderId: string;
  userId: string;
  reason: PaymentReviewReason;
  status: PaymentReviewStatus;
  /** Số tiền PayOS báo đã nhận; null khi webhook không có số hợp lệ. */
  paidAmount: number | null;
  /** Mã giao dịch PayOS (`data.reference`); null khi webhook không gửi. */
  txnRef: string | null;
}

export interface ReviewNote {
  reason: PaymentReviewReason;
  paidAmount: number | null;
  txnRef: string | null;
}

/** Một đoạn `review_reason` đúng như 0027 ghi: "<LÝ DO> paid=<số|null> ref=<mã|->". */
export function formatReviewNote(
  reason: PaymentReviewReason,
  paidAmount: number | null,
  txnRef: string | null,
): string {
  return `${reason} paid=${paidAmount === null ? 'null' : paidAmount} ref=${txnRef ?? '-'}`;
}

const NOTE_RE = /^([A-Z_]+) paid=(null|\d+) ref=(\S+)$/;

/** Tách `review_reason` (các đoạn nối bằng " | ") — dùng cho backfill 0029. */
export function parseReviewReasonNotes(text: string | null | undefined): ReviewNote[] {
  if (!text) return [];
  const out: ReviewNote[] = [];
  for (const part of text.split(' | ')) {
    const m = NOTE_RE.exec(part.trim());
    if (!m) continue;
    const reason = m[1] as PaymentReviewReason;
    if (!PAYMENT_REVIEW_REASONS.includes(reason)) continue;
    out.push({
      reason,
      paidAmount: m[2] === 'null' ? null : Number(m[2]),
      txnRef: m[3] === '-' ? null : m[3],
    });
  }
  return out;
}

/**
 * Có ghi thêm dòng cho giao dịch vừa tới không (các dòng sẵn có của CÙNG đơn):
 *   - có mã giao dịch → không ghi nếu đã có dòng cùng mã;
 *   - không mã → không ghi nếu đã có dòng không mã cùng số tiền (PayOS gửi lại
 *     không phân biệt được giao dịch, chọn an toàn: không nhân đôi).
 */
export function shouldRecordReviewItem(
  existing: ReadonlyArray<Pick<PaymentReviewItemLike, 'paidAmount' | 'txnRef'>>,
  incoming: Pick<PaymentReviewItemLike, 'paidAmount' | 'txnRef'>,
): boolean {
  if (incoming.txnRef !== null) return !existing.some((e) => e.txnRef === incoming.txnRef);
  return !existing.some((e) => e.txnRef === null && e.paidAmount === incoming.paidAmount);
}

export type PaymentReviewBlock =
  | 'ALREADY_REVIEWED'
  | 'FORBIDDEN'
  | 'NOTHING_TO_CREDIT'
  | 'DUPLICATE_SUSPECT';

/** Lý do admin không được bỏ qua dòng này; null = được. */
export function paymentReviewDismissBlock(
  item: Pick<PaymentReviewItemLike, 'status' | 'userId'>,
  adminId: string,
): Extract<PaymentReviewBlock, 'ALREADY_REVIEWED' | 'FORBIDDEN'> | null {
  if (item.status !== 'Pending') return 'ALREADY_REVIEWED';
  if (item.userId === adminId) return 'FORBIDDEN';
  return null;
}

/**
 * Cùng MỘT lần chuyển khoản có thể sinh 2 dòng nếu PayOS gửi lại thiếu mã giao
 * dịch (dòng có mã + dòng không mã, hoặc đơn đã cộng tự động + dòng không mã).
 * Nghi trùng (chặn cộng) khi, trong các dòng Credited KHÁC của cùng đơn:
 *   - dòng không mã: có dòng không mã bất kỳ, hoặc dòng có mã cùng số tiền,
 *     hoặc đơn đã được cộng tự động đúng số tiền đó (`autoCreditedAmount`);
 *   - dòng có mã: có dòng không mã cùng số tiền.
 * Khớp điều kiện DUPLICATE_SUSPECT trong admin_resolve_payment_review (0029).
 */
export function isDuplicateSuspect(
  item: PaymentReviewItemLike,
  orderItems: ReadonlyArray<PaymentReviewItemLike>,
  autoCreditedAmount: number | null,
): boolean {
  const credited = orderItems.filter(
    (o) => o.id !== item.id && o.orderId === item.orderId && o.status === 'Credited',
  );
  if (item.txnRef === null) {
    return (
      credited.some((o) => o.txnRef === null || o.paidAmount === item.paidAmount) ||
      (autoCreditedAmount !== null && autoCreditedAmount === item.paidAmount)
    );
  }
  return credited.some((o) => o.txnRef === null && o.paidAmount === item.paidAmount);
}

/**
 * Lý do admin không được cộng ví cho dòng này; null = được.
 * `duplicateSuspect`: kết quả isDuplicateSuspect (server tính sẵn trong danh sách).
 */
export function paymentReviewCreditBlock(
  item: PaymentReviewItemLike,
  adminId: string,
  duplicateSuspect: boolean,
): PaymentReviewBlock | null {
  const base = paymentReviewDismissBlock(item, adminId);
  if (base) return base;
  if (item.paidAmount === null || item.paidAmount <= 0) return 'NOTHING_TO_CREDIT';
  if (duplicateSuspect) return 'DUPLICATE_SUSPECT';
  return null;
}

/**
 * Điền mẫu câu `{key}` trong MỘT lượt: giá trị (tên người dùng đặt…) chứa
 * `{email}` hay `$&` không bị điền tiếp / diễn giải. Thiếu giá trị → giữ nguyên.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) =>
    Object.prototype.hasOwnProperty.call(values, k) ? values[k] : m,
  );
}

export interface PaymentReviewSummary {
  pendingCount: number;
  creditedTotal: number;
  dismissedCount: number;
}

/** Tóm tắt cho người nạp: còn mấy giao dịch đang kiểm tra, đã cộng bao nhiêu. */
export function paymentReviewSummary(
  items: ReadonlyArray<{ status: PaymentReviewStatus; creditedAmount: number | null }>,
): PaymentReviewSummary {
  let pendingCount = 0;
  let creditedTotal = 0;
  let dismissedCount = 0;
  for (const i of items) {
    if (i.status === 'Pending') pendingCount += 1;
    else if (i.status === 'Credited') creditedTotal += i.creditedAmount ?? 0;
    else dismissedCount += 1;
  }
  return { pendingCount, creditedTotal, dismissedCount };
}
