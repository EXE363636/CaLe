/**
 * Payment provider factory + adapters.
 *
 * - CALE_MOCK: gọi RPC Supabase (create/confirm/cancel) — KHÔNG giao dịch thật.
 * - PAYOS: stub, CHƯA triển khai (không gọi API, không key, không secret).
 *
 * Provider được quyết định ở BACKEND: hiện chỉ MOCK khả dụng (live chưa có
 * credentials). Client KHÔNG tự chọn provider. Sau này thêm PayOS adapter +
 * webhook mà không sửa UI chính.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type {
  CreatePaymentInput,
  MockCapablePaymentProvider,
  PaymentChannel,
  PaymentProvider,
  PaymentResult,
} from './types';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | null =>
  typeof v === 'string' && v !== '' ? v : null;
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

function rowToPaymentResult(r: Row): PaymentResult {
  return {
    provider: (s(r.provider) as PaymentResult['provider']) || 'CALE_MOCK',
    paymentId: s(r.id),
    orderCode: s(r.order_code),
    amount: num(r.amount),
    currency: s(r.currency) || 'VND',
    status: (s(r.status) as PaymentResult['status']) || 'PENDING',
    qrPayload: sOpt(r.qr_payload),
    channelId: sOpt(r.payment_channel_id),
    bankCode: null, // đọc từ channel khi cần hiển thị
    expiresAt: sOpt(r.expires_at),
    paidAt: sOpt(r.paid_at),
    publishedShiftId: sOpt(r.published_shift_id),
  };
}

function rowToChannel(r: Row): PaymentChannel {
  return {
    id: s(r.id),
    provider: (s(r.provider) as PaymentChannel['provider']) || 'CALE_MOCK',
    mode: (s(r.mode) as PaymentChannel['mode']) || 'MOCK',
    displayName: s(r.display_name),
    bankCode: sOpt(r.bank_code),
    bankName: sOpt(r.bank_name),
    accountNumberMasked: sOpt(r.account_number_masked),
    logoPath: sOpt(r.logo_path),
    enabled: Boolean(r.enabled),
  };
}

/** Kênh ngân hàng (mock) đang bật — để render bộ chọn "Chọn ngân hàng nhận tiền". */
export async function listPaymentChannels(): Promise<PaymentChannel[]> {
  const { data, error } = await getSupabaseClient()
    .from('payment_channels')
    .select('*')
    .eq('enabled', true)
    .order('display_name', { ascending: true });
  if (error) throw new Error(`listPaymentChannels: ${error.message}`);
  return (data ?? []).map((r) => rowToChannel(r as Row));
}

// ---------------------------------------------------------------------------
// CALE_MOCK provider
// ---------------------------------------------------------------------------

class MockPaymentProvider implements MockCapablePaymentProvider {
  readonly name = 'CALE_MOCK' as const;

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const { data, error } = await getSupabaseClient().rpc('create_payment_session', {
      p_channel_id: input.channelId,
      p_client_request_id: input.clientRequestId,
      p_shift_payload: input.shiftPayload,
    });
    if (error) throw new Error(error.message);
    return rowToPaymentResult(data as Row);
  }

  async getPayment(paymentId: string): Promise<PaymentResult> {
    // Đọc lại từ Supabase qua RLS (employer chỉ thấy phiên của mình) → reload-safe.
    const { data, error } = await getSupabaseClient()
      .from('payment_sessions')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();
    if (error) throw new Error(`getPayment: ${error.message}`);
    if (!data) throw new Error('SESSION_NOT_FOUND');
    return rowToPaymentResult(data as Row);
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    const { error } = await getSupabaseClient().rpc('cancel_payment_session', {
      p_payment_id: paymentId,
    });
    if (error) throw new Error(error.message);
    return this.getPayment(paymentId);
  }

  async simulateSuccess(paymentId: string): Promise<{ status: PaymentResult['status']; shiftId: string | null }> {
    const { data, error } = await getSupabaseClient().rpc('confirm_payment_session', {
      p_payment_id: paymentId,
    });
    if (error) throw new Error(error.message);
    const d = (data ?? {}) as { status?: string; shift_id?: string };
    return { status: (d.status as PaymentResult['status']) ?? 'PAID', shiftId: d.shift_id ?? null };
  }
}

// ---------------------------------------------------------------------------
// PAYOS provider — STUB (không gọi API, không key). Chuẩn bị cho tương lai.
// ---------------------------------------------------------------------------

class PayosPaymentProvider implements PaymentProvider {
  readonly name = 'PAYOS' as const;
  private notImplemented(): never {
    // Live provider chưa có credentials → không bao giờ chạy ở bản này.
    throw new Error('PAYOS_NOT_IMPLEMENTED');
  }
  async createPayment(): Promise<PaymentResult> { return this.notImplemented(); }
  async getPayment(): Promise<PaymentResult> { return this.notImplemented(); }
  async cancelPayment(): Promise<PaymentResult> { return this.notImplemented(); }
}

// ---------------------------------------------------------------------------
// Factory — provider quyết định ở backend. Hiện chỉ MOCK khả dụng.
// ---------------------------------------------------------------------------

let mockSingleton: MockPaymentProvider | null = null;

/**
 * Trả provider hoạt động hiện tại. Live (PAYOS) chỉ bật khi có credentials
 * server + capability livePayments — hiện tại luôn là CALE_MOCK.
 */
export function getPaymentProvider(): MockCapablePaymentProvider {
  return (mockSingleton ??= new MockPaymentProvider());
}

/** Dùng cho test/tương lai; KHÔNG expose cho client tự chọn provider. */
export function getPayosProviderStub(): PaymentProvider {
  return new PayosPaymentProvider();
}

export type { PaymentResult, PaymentChannel, CreatePaymentInput } from './types';
