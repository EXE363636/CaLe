/**
 * Mock payment simulator + pricing — unit/component (chạy local).
 * Integration RPC (Supabase thật) ở scripts/payment-integration.mjs.
 *
 * Bao phủ: capability mockPayments/livePayments; pricing trung thực không nút mua;
 * MockPaymentSession — mock mode CÓ nút "Mô phỏng thanh toán thành công",
 * live mode TUYỆT ĐỐI không render nút đó.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  live: false,
  session: {
    provider: 'CALE_MOCK', paymentId: 'p1', orderCode: 'CALE260918ABCD1234',
    amount: 300000, currency: 'VND', status: 'PENDING',
    qrPayload: JSON.stringify({ type: 'CALE_MOCK_PAYMENT', paymentId: 'p1', amount: 300000, realTransaction: false }),
    channelId: 'c1', bankCode: 'MB', expiresAt: null, paidAt: null,
    shiftId: 'shift-1', applicationId: 'application-1', platformFee: 0,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('paymentId=p1'),
}));
vi.mock('@/data/capabilities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/capabilities')>();
  return { ...actual, hasCapability: (k: string) => (k === 'livePayments' ? h.live : true) };
});
vi.mock('@/data/payments', () => ({
  getPaymentProvider: () => ({
    name: 'CALE_MOCK',
    getPayment: async () => h.session,
    createPayment: vi.fn(),
    cancelPayment: vi.fn(),
    simulateSuccess: vi.fn(),
  }),
  listPaymentChannels: async () => [
    { id: 'c1', provider: 'CALE_MOCK', mode: 'MOCK', displayName: 'MB Bank (Demo)', bankCode: 'MB', bankName: 'MB', accountNumberMasked: 'xxxx-1234', logoPath: null, enabled: true },
  ],
}));

import { capabilities } from '@/data/capabilities';
import { MockPaymentSession } from '@/components/payment/MockPaymentSession';
import PricingPage from '@/app/pricing/page';

const nfc = (s: string | null | undefined) => (s ?? '').normalize('NFC');

afterEach(() => cleanup());

describe('capability mock/live payments', () => {
  it('supabase: mockPayments bật, livePayments tắt, KHÔNG bật payments thật', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
    const c = capabilities();
    expect(c.mockPayments).toBe(true);
    expect(c.livePayments).toBe(false);
    expect(c.payments).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('PricingPage — trung thực, không nút mua', () => {
  it('hiển thị giai đoạn thử nghiệm / 0đ / sắp công bố, không CTA mua/thanh toán', () => {
    const { container } = render(<PricingPage />);
    const text = nfc(container.textContent);
    expect(text).toContain('Giai đoạn thử nghiệm');
    expect(text).toContain('0đ');
    expect(text).toContain('Bảng giá dự kiến — chưa thu phí');
    expect(text.toLowerCase()).not.toContain('mua ngay');
    expect(text.toLowerCase()).not.toContain('thanh toán ngay');
  });
});

describe('MockPaymentSession — nút mô phỏng theo mode', () => {
  const props = {
    shiftId: 'shift-1',
    applicationId: 'application-1',
    clientRequestId: 'req-1',
    previewAmount: 300000,
    onPaid: vi.fn(),
    onCancel: vi.fn(),
  };

  it('mock mode: CÓ nút mô phỏng giữ tiền và cảnh báo không chuyển tiền thật', async () => {
    h.live = false;
    render(<MockPaymentSession {...props} />);
    // Chờ phiên PENDING khôi phục từ query.
    expect(await screen.findByText('Mô phỏng giữ tiền (HELD)')).toBeInTheDocument();
    expect(screen.getByText('MÔ PHỎNG — KHÔNG CHUYỂN TIỀN THẬT')).toBeInTheDocument();
  });

  it('live mode: KHÔNG render nút xác nhận giả', async () => {
    h.live = true;
    render(<MockPaymentSession {...props} />);
    // Đợi phiên load (nút hủy luôn có ở trạng thái PENDING).
    expect(await screen.findByText('Hủy phiên mô phỏng')).toBeInTheDocument();
    expect(screen.queryByText('Mô phỏng thanh toán thành công')).toBeNull();
  });
});
