/**
 * Giao dịch nạp PayOS cần admin kiểm tra (migration 0029).
 *
 * Server quyết định tiền: admin chỉ chọn "cộng" (đúng số PayOS báo nhận, không
 * thưởng) hoặc "không cộng". Client đọc để hiển thị; điều kiện chặn tính lại
 * bằng src/domain/paymentReview.ts (khớp server) chỉ để tắt nút sớm.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import {
  PAYMENT_REVIEW_REASONS,
  type PaymentReviewItemLike,
  type PaymentReviewReason,
  type PaymentReviewStatus,
} from '@/domain/paymentReview';
import type { PaymentOrderStatus } from '@/types';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;

const STATUSES: PaymentReviewStatus[] = ['Pending', 'Credited', 'Dismissed'];
const toReason = (v: unknown): PaymentReviewReason =>
  PAYMENT_REVIEW_REASONS.includes(v as PaymentReviewReason) ? (v as PaymentReviewReason) : 'AMOUNT_MISMATCH';
const toStatus = (v: unknown): PaymentReviewStatus =>
  STATUSES.includes(v as PaymentReviewStatus) ? (v as PaymentReviewStatus) : 'Pending';

// ---------------------------------------------------------------------------
// Người nạp
// ---------------------------------------------------------------------------

export interface MyPaymentReview {
  id: string;
  orderCode: number;
  orderAmount: number;
  reason: PaymentReviewReason;
  paidAmount: number | null;
  status: PaymentReviewStatus;
  creditedAmount: number | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/** ≤20 giao dịch bị đánh dấu của chính mình, dòng đang chờ lên trước. */
export async function listMyPaymentReviews(): Promise<MyPaymentReview[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_payment_reviews');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({
    id: s(r.id),
    orderCode: num(r.order_code),
    orderAmount: num(r.order_amount),
    reason: toReason(r.reason),
    paidAmount: numOrNull(r.paid_amount),
    status: toStatus(r.status),
    creditedAmount: numOrNull(r.credited_amount),
    resolutionNote: sOrNull(r.resolution_note),
    resolvedAt: sOrNull(r.resolved_at),
    createdAt: s(r.created_at),
  }));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminPaymentReview extends PaymentReviewItemLike {
  orderCode: number;
  orderAmount: number;
  orderStatus: PaymentOrderStatus;
  orderCreatedAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
  /** Server tính isDuplicateSuspect: cộng dòng này có thể cộng trùng một lần chuyển. */
  duplicateSuspect: boolean;
  createdAt: string;
}

export async function adminListPaymentReviews(): Promise<AdminPaymentReview[]> {
  const { data, error } = await getSupabaseClient().rpc('admin_list_payment_reviews', {
    p_status: 'Pending',
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({
    id: s(r.id),
    orderId: s(r.order_id),
    userId: s(r.user_id),
    reason: toReason(r.reason),
    status: toStatus(r.status),
    paidAmount: numOrNull(r.paid_amount),
    txnRef: sOrNull(r.txn_ref),
    orderCode: num(r.order_code),
    orderAmount: num(r.order_amount),
    orderStatus: (s(r.order_status) as PaymentOrderStatus) || 'PENDING',
    orderCreatedAt: s(r.order_created_at),
    userName: s(r.user_name),
    userEmail: s(r.user_email),
    userRole: s(r.user_role),
    duplicateSuspect: r.duplicate_suspect === true,
    createdAt: s(r.created_at),
  }));
}

/** credit = true → cộng ví đúng số PayOS báo nhận; false → ghi nhận không cộng. */
export async function adminResolvePaymentReview(id: string, credit: boolean, note: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_resolve_payment_review', {
    p_item_id: id,
    p_credit: credit,
    p_note: note,
  });
  if (error) throw new Error(error.message);
}
