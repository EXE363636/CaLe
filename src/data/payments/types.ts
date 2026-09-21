/**
 * Payment provider abstraction — dùng chung cho mock (CALE_MOCK) và live (PAYOS).
 *
 * React component KHÔNG gọi trực tiếp logic mock; luôn đi qua PaymentProvider.
 * Provider được quyết định Ở BACKEND (server config / RPC), client không tự chọn.
 * Hiện chỉ triển khai CALE_MOCK; PAYOS là stub (không gọi API, không key).
 */

export type PaymentProviderName = 'CALE_MOCK' | 'PAYOS';

/** Trạng thái dùng chung (provider-agnostic) — không phụ thuộc riêng CALE_MOCK. */
export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'HELD'
  | 'RELEASED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export interface CreatePaymentInput {
  /** Kênh ngân hàng (mock) đã chọn. */
  channelId: string;
  /** Idempotency key — trùng key trả lại phiên cũ, không tạo trùng. */
  clientRequestId: string;
  /** Existing published shift and approved application. Amount is server-owned. */
  shiftId: string;
  applicationId: string;
}

/** Kết quả phiên thanh toán (data trong envelope { code, desc, data }). */
export interface PaymentResult {
  provider: PaymentProviderName;
  paymentId: string;
  orderCode: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  qrPayload: string | null;
  channelId: string | null;
  bankCode: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  shiftId: string | null;
  applicationId: string | null;
  platformFee: number;
}

/** Envelope kiểu API payment. */
export interface PaymentEnvelope {
  code: string;
  desc: string;
  data: PaymentResult;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  getPayment(paymentId: string): Promise<PaymentResult>;
  cancelPayment(paymentId: string): Promise<PaymentResult>;
}

/**
 * Chỉ MOCK provider mới có "mô phỏng thanh toán thành công". Live provider
 * TUYỆT ĐỐI không expose khả năng này (PAID chỉ đến từ webhook đã xác minh).
 */
export interface MockCapablePaymentProvider extends PaymentProvider {
  /** Mô phỏng PENDING→HELD, không đăng/tạo ca. */
  simulateSuccess(paymentId: string): Promise<{ status: PaymentStatus; shiftId: string | null }>;
}

/** Kênh ngân hàng mô phỏng để chọn khi tạo QR. */
export interface PaymentChannel {
  id: string;
  provider: PaymentProviderName;
  mode: 'MOCK' | 'LIVE';
  displayName: string;
  bankCode: string | null;
  bankName: string | null;
  accountNumberMasked: string | null;
  logoPath: string | null;
  enabled: boolean;
}
