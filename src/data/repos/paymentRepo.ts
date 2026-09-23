/**
 * Payment repo (supabase) — NẠP tiền THẬT qua PayOS (Kênh thu / QR).
 *
 * KHÁC walletRepo (mô phỏng CALE_MOCK): đây là dòng tiền THẬT.
 *   createPayment          : gọi Edge Function `create-payment` -> trả QR/link PayOS.
 *   getPaymentOrderStatus  : RPC poll trạng thái đơn sau khi người dùng quét QR.
 * Client KHÔNG tự cộng ví; ví chỉ tăng khi webhook PayOS xác nhận (server).
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { PaymentOrder, PaymentOrderStatus } from '@/types';

export class PaymentApiError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'PaymentApiError';
    this.code = code;
  }
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

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
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke('create-payment', {
    body: { amount },
  });
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
  const d = data as {
    ok?: boolean; error?: string; message?: string;
    orderCode?: number; amount?: number; checkoutUrl?: string; qrCode?: string | null;
  };
  if (!d || d.ok === false) throw new PaymentApiError(String(d?.error ?? 'REQUEST_FAILED'), d?.message);
  return {
    orderCode: num(d.orderCode),
    amount: num(d.amount),
    checkoutUrl: s(d.checkoutUrl),
    qrCode: d.qrCode ?? null,
    mock: (d as { mock?: boolean }).mock === true,
  };
}

/**
 * MÔ PHỎNG (PAYOS_MOCK): xác nhận "đã chuyển khoản" → server cộng ví ngay (thay
 * cho webhook thật). Chỉ hợp lệ khi Edge Function chạy PAYOS_MOCK=true và đơn
 * thuộc người gọi. Trả true nếu server đã ghi nhận trả.
 */
export async function confirmMockPayment(orderCode: number): Promise<boolean> {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke('create-payment', {
    body: { action: 'mock-confirm', orderCode },
  });
  if (error) {
    let code = 'REQUEST_FAILED';
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) code = String(parsed.error);
      } catch {
        /* giữ mã mặc định */
      }
    }
    throw new PaymentApiError(code, error.message);
  }
  return (data as { ok?: boolean } | null)?.ok === true;
}

/** Poll trạng thái đơn nạp theo orderCode (RLS + guard chủ sở hữu ở RPC). */
export async function getPaymentOrderStatus(orderCode: number): Promise<PaymentOrder> {
  const { data, error } = await getSupabaseClient().rpc('get_payment_order_status', {
    p_order_code: orderCode,
  });
  if (error) throw new PaymentApiError('STATUS_FAILED', error.message);
  const o = (data ?? {}) as {
    orderCode?: number; status?: string; amount?: number;
    checkoutUrl?: string; qrCode?: string; paidAt?: string;
  };
  return {
    orderCode: num(o.orderCode),
    status: (s(o.status) as PaymentOrderStatus) || 'PENDING',
    amount: num(o.amount),
    checkoutUrl: o.checkoutUrl ?? undefined,
    qrCode: o.qrCode ?? undefined,
    paidAt: o.paidAt ?? undefined,
  };
}
