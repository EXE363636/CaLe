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

// PricingPage là server component async, đọc ngôn ngữ từ cookie (next/headers) —
// ngoài request thì giả lập ngôn ngữ mặc định (tiếng Việt).
vi.mock('@/i18n/server', async () => {
  const { makeT, makeTx } = await import('@/i18n/locale');
  return {
    getLocale: async () => 'vi',
    getT: async () => makeT('vi'),
    getTx: async () => makeTx('vi'),
  };
});

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
  it('hiển thị giai đoạn thử nghiệm / 0đ / sắp công bố, không CTA mua/thanh toán', async () => {
    const { container } = render(await PricingPage());
    const text = nfc(container.textContent);
    expect(text).toContain('Giai đoạn thử nghiệm');
    expect(text).toContain('0đ');
    expect(text).toContain('chưa thu phí');
    expect(text.toLowerCase()).not.toContain('mua ngay');
    expect(text.toLowerCase()).not.toContain('thanh toán ngay');
  });

  // P0 feedback F8 — 2 thẻ, mỗi ý một lần, bỏ VIP/Boost "dự kiến".
  it('2 thẻ Người lao động / Nhà tuyển dụng, không còn VIP/Boost, ví dụ chỉ 1 lần', async () => {
    const { container } = render(await PricingPage());
    const text = nfc(container.textContent);
    const headings = Array.from(container.querySelectorAll('h2')).map((h) => nfc(h.textContent));
    expect(headings).toEqual(expect.arrayContaining(['Người lao động', 'Nhà tuyển dụng']));
    expect(text).not.toMatch(/VIP|Boost/);
    expect(text.match(/Ví dụ/g)?.length).toBe(1);
    expect(text).not.toMatch(/VNĐ|₫/);
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
    expect(screen.getByText('MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT')).toBeInTheDocument();
  });

  it('live mode: KHÔNG render nút xác nhận giả', async () => {
    h.live = true;
    render(<MockPaymentSession {...props} />);
    // Đợi phiên load (nút hủy luôn có ở trạng thái PENDING).
    expect(await screen.findByText('Hủy phiên mô phỏng')).toBeInTheDocument();
    expect(screen.queryByText('Mô phỏng thanh toán thành công')).toBeNull();
  });
});
