/**
 * Payment repo (supabase) — tiền THẬT qua PayOS.
 *
 *   Nạp (Kênh thu / QR):
 *     createPayment          : Edge Function `create-payment` -> QR/link PayOS.
 *     getPaymentOrderStatus  : RPC poll trạng thái đơn nạp.
 *     confirmMockPayment     : chỉ khi server chạy PAYOS_MOCK.
 *   Rút (Kênh chi):
 *     requestWithdrawal      : Edge Function `withdraw` (create) -> trừ ví + chi PayOS.
 *     checkWithdrawal        : Edge Function `withdraw` (status) -> tra lại lệnh chưa xong.
 *     listMyWithdrawals      : đọc payout_orders của chính mình (RLS).
 * Client KHÔNG tự cộng/trừ ví; mọi thay đổi số dư do server quyết định.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type {
  PaymentOrder,
  PaymentOrderStatus,
  PayoutOrder,
  PayoutOrderKind,
  PayoutOrderStatus,
} from '@/types';

export class PaymentApiError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'PaymentApiError';
    this.code = code;
  }
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

type FnResult = { ok?: boolean; error?: string; message?: string } & Record<string, unknown>;

/**
 * Gọi Edge Function. functions.invoke coi HTTP non-2xx là error; mã lỗi thật
 * `{ ok:false, error }` nằm trong error.context (Response) — đọc ra để ném đúng mã.
 */
async function invokeFn(name: string, body: Record<string, unknown>): Promise<FnResult> {
  const { data, error } = await getSupabaseClient().functions.invoke(name, { body });
  if (error) {
    let code = 'REQUEST_FAILED';
    let message = error.message;
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) code = String(parsed.error);
        if (parsed?.message) message = String(parsed.message);
      } catch {
        /* giữ mã mặc định */
      }
    }
    throw new PaymentApiError(code, message);
  }
  const d = (data ?? {}) as FnResult;
  if (d.ok === false) throw new PaymentApiError(String(d.error ?? 'REQUEST_FAILED'), d.message);
  return d;
}

// ---------------------------------------------------------------------------
// Nạp tiền
// ---------------------------------------------------------------------------

export interface CreatePaymentResult {
  orderCode: number;
  amount: number;
  checkoutUrl: string;
  qrCode: string | null;
  /** true = luồng MÔ PHỎNG (PAYOS_MOCK); client hiện nhãn + dùng mock-confirm. */
  mock: boolean;
}

/** Tạo đơn nạp thật + link/QR PayOS. amount = số nguyên đồng. */
export async function createPayment(amount: number): Promise<CreatePaymentResult> {
  const d = await invokeFn('create-payment', { amount });
  return {
    orderCode: num(d.orderCode),
    amount: num(d.amount),
    checkoutUrl: s(d.checkoutUrl),
    qrCode: typeof d.qrCode === 'string' ? d.qrCode : null,
    mock: d.mock === true,
  };
}

/**
 * MÔ PHỎNG (PAYOS_MOCK): xác nhận "đã chuyển khoản" → server cộng ví ngay (thay
 * cho webhook thật). Chỉ hợp lệ khi Edge Function chạy PAYOS_MOCK=true và đơn
 * thuộc người gọi. Trả true nếu server đã ghi nhận trả.
 */
export async function confirmMockPayment(orderCode: number): Promise<boolean> {
  const d = await invokeFn('create-payment', { action: 'mock-confirm', orderCode });
  return d.ok === true;
}

/** Poll trạng thái đơn nạp theo orderCode (RLS + guard chủ sở hữu ở RPC). */
export async function getPaymentOrderStatus(orderCode: number): Promise<PaymentOrder> {
  const { data, error } = await getSupabaseClient().rpc('get_payment_order_status', {
    p_order_code: orderCode,
  });
  if (error) throw new PaymentApiError('STATUS_FAILED', error.message);
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    orderCode: num(o.orderCode),
    status: (s(o.status) as PaymentOrderStatus) || 'PENDING',
    amount: num(o.amount),
    checkoutUrl: sOpt(o.checkoutUrl),
    qrCode: sOpt(o.qrCode),
    paidAt: sOpt(o.paidAt),
  };
}

// ---------------------------------------------------------------------------
// Rút tiền
// ---------------------------------------------------------------------------

export interface WithdrawalRequest {
  amount: number;
  toBin: string;
  toAccountNumber: string;
  toAccountName: string;
  /** Một key cho MỘT lần bấm rút — bấm lặp/gửi lại không tạo lệnh thứ hai. */
  idempotencyKey: string;
}

export interface WithdrawalResult {
  id: string;
  status: PayoutOrderStatus;
}

/** Tạo lệnh rút: server trừ ví + chi qua PayOS. Ném PaymentApiError khi lỗi. */
export async function requestWithdrawal(req: WithdrawalRequest): Promise<WithdrawalResult> {
  const d = await invokeFn('withdraw', { action: 'create', ...req });
  return { id: s(d.id), status: (s(d.status) as PayoutOrderStatus) || 'PENDING' };
}

/** Tra lại trạng thái lệnh rút chưa xong (server hỏi PayOS + hoàn ví nếu thất bại). */
export async function checkWithdrawal(id: string): Promise<WithdrawalResult> {
  const d = await invokeFn('withdraw', { action: 'status', id });
  return { id: s(d.id), status: (s(d.status) as PayoutOrderStatus) || 'PENDING' };
}

/** Các lệnh rút gần đây của người dùng hiện tại (RLS: chỉ thấy của mình). */
export async function listMyWithdrawals(limit = 10): Promise<PayoutOrder[]> {
  const { data, error } = await getSupabaseClient()
    .from('payout_orders')
    .select(
      'id, kind, user_id, shift_id, application_id, amount, to_bin, to_account_number, to_account_name, status, fail_reason, created_at, updated_at',
    )
    .eq('kind', 'USER_WITHDRAWAL')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new PaymentApiError('LIST_FAILED', error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: s(r.id),
    kind: s(r.kind) as PayoutOrderKind,
    userId: s(r.user_id),
    shiftId: sOpt(r.shift_id),
    applicationId: sOpt(r.application_id),
    amount: num(r.amount),
    toBin: s(r.to_bin),
    toAccountNumber: s(r.to_account_number),
    toAccountName: sOpt(r.to_account_name),
    status: s(r.status) as PayoutOrderStatus,
    failReason: sOpt(r.fail_reason),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  }));
}
