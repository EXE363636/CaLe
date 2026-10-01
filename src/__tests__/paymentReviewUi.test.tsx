/**
 * 0029 — UI giao dịch nạp cần kiểm tra (supabase). Repo / store được mock; server
 * thật chạy thử bằng supabase/dryrun/run-0029.sh.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { AdminPaymentReview, MyPaymentReview } from '@/data/repos/paymentReviewRepo';

const h = vi.hoisted(() => ({
  mine: [] as MyPaymentReview[],
  admin: [] as AdminPaymentReview[],
  adminId: 'admin-1',
  resolve: vi.fn(async () => {}),
  poll: vi.fn(async (): Promise<string> => 'PENDING'),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/data/repos/paymentReviewRepo', () => ({
  listMyPaymentReviews: async () => h.mine,
  adminListPaymentReviews: async () => h.admin,
  adminResolvePaymentReview: h.resolve,
}));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: { currentUserId: string }) => unknown) => sel({ currentUserId: h.adminId }),
}));
vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({ pollRealTopUpState: h.poll, confirmMockTopUp: async () => false }),
}));
vi.mock('@/lib/toast', () => ({ showSuccess: h.success, showError: h.error }));

import { PaymentReviewNotice } from '@/components/wallet/PaymentReviewNotice';
import { PayosTopUpQr } from '@/components/payment/PayosTopUpQr';
import { PaymentReviewList } from '@/app/admin/dashboard/PaymentReviewList';

afterEach(() => {
  cleanup();
  h.mine = [];
  h.admin = [];
  h.adminId = 'admin-1';
  h.resolve.mockClear();
  h.poll.mockReset();
  h.poll.mockResolvedValue('PENDING');
  h.success.mockClear();
  h.error.mockClear();
});

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const mine = (over: Partial<MyPaymentReview> = {}): MyPaymentReview => ({
  id: 'm1', orderCode: 123456, orderAmount: 50000, reason: 'AMOUNT_MISMATCH',
  paidAmount: 49000, status: 'Pending', creditedAmount: null, resolutionNote: null,
  resolvedAt: null, createdAt: daysAgo(1), ...over,
});

const adminItem = (over: Partial<AdminPaymentReview> = {}): AdminPaymentReview => ({
  id: 'r1', orderId: 'o1', userId: 'u1', reason: 'AMOUNT_MISMATCH', status: 'Pending',
  paidAmount: 49000, txnRef: 'FT123', orderCode: 123456, orderAmount: 50000,
  orderStatus: 'PENDING', orderCreatedAt: daysAgo(1), userName: 'Quán Dry', userEmail: 'q@example.invalid',
  userRole: 'employer', duplicateSuspect: false, createdAt: daysAgo(1), ...over,
});

const noFakeMoneyWords = () => expect(document.body.textContent ?? '').not.toMatch(/mô phỏng|VNĐ|₫/);

describe('PaymentReviewNotice (ví người nạp)', () => {
  it('không có giao dịch → không hiện gì', async () => {
    const { container } = render(<PaymentReviewNotice />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe('');
  });

  it('dòng đang chờ: số tiền chuyển + số tiền đơn, nhãn "Đang kiểm tra", lời giải thích', async () => {
    h.mine = [mine()];
    render(<PaymentReviewNotice />);
    expect(await screen.findByText('Chuyển 49.000 đ cho đơn nạp 50.000 đ')).toBeTruthy();
    expect(screen.getByText('Đang kiểm tra')).toBeTruthy();
    expect(document.body.textContent).toContain('Quản trị viên sẽ đối chiếu');
    expect(document.body.textContent).toContain('#123456');
    noFakeMoneyWords();
  });

  it('đã cộng: hiện số đã cộng + ghi chú; đã xử lý quá 30 ngày thì ẩn', async () => {
    h.mine = [
      mine({ id: 'a', status: 'Credited', creditedAmount: 49000, resolutionNote: 'Đã đối chiếu', resolvedAt: daysAgo(2) }),
      mine({ id: 'b', status: 'Dismissed', resolutionNote: 'cũ', resolvedAt: daysAgo(40) }),
    ];
    render(<PaymentReviewNotice />);
    expect(await screen.findByText('Đã cộng 49.000 đ')).toBeTruthy();
    expect(screen.getByText('Ghi chú: Đã đối chiếu')).toBeTruthy();
    expect(screen.queryByText('Ghi chú: cũ')).toBeNull();
    // Không còn dòng chờ → không hiện lời "sẽ đối chiếu".
    expect(document.body.textContent).not.toContain('Quản trị viên sẽ đối chiếu');
  });
});

describe('PayosTopUpQr — đơn bị đánh dấu cần kiểm tra', () => {
  const order = { orderCode: 1, amount: 50000, checkoutUrl: 'https://pay.example/x', qrCode: null, mock: false };

  it('REVIEW → báo đang kiểm tra (không phải lỗi); admin cộng xong (PAID_REVIEWED) → onPaid({ reviewed: true })', async () => {
    const onPaid = vi.fn();
    h.poll.mockResolvedValueOnce('REVIEW').mockResolvedValueOnce('PAID_REVIEWED');
    render(<PayosTopUpQr order={order} userId="u1" onPaid={onPaid} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản' }));
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('cần kiểm tra thêm');
    expect(status.textContent).toContain('Không cần chuyển khoản lại');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản' }));
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith({ reviewed: true }));
  });

  it('đơn đã qua kiểm tra rồi được cộng (PAID_REVIEWED) ngay lần bấm đầu → reviewed: true', async () => {
    const onPaid = vi.fn();
    h.poll.mockResolvedValueOnce('PAID_REVIEWED');
    render(<PayosTopUpQr order={order} userId="u1" onPaid={onPaid} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản' }));
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith({ reviewed: true }));
  });

  it('admin đã xử lý và không cộng (REVIEW_CLOSED) → báo đã xử lý, không mời kiểm tra lại', async () => {
    h.poll.mockResolvedValueOnce('REVIEW_CLOSED');
    render(<PayosTopUpQr order={order} userId="u1" onPaid={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản' }));
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('không cộng vào ví');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('PAID ngay → onPaid({ reviewed: false })', async () => {
    const onPaid = vi.fn();
    h.poll.mockResolvedValueOnce('PAID');
    render(<PayosTopUpQr order={order} userId="u1" onPaid={onPaid} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã chuyển khoản' }));
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith({ reviewed: false }));
  });
});

describe('PaymentReviewList (admin)', () => {
  it('trống → không hiện gì', async () => {
    const { container } = render(<PaymentReviewList />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe('');
  });

  it('cần ghi chú mới bấm được; cộng gửi đúng id + credit=true + ghi chú', async () => {
    h.admin = [adminItem()];
    render(<PaymentReviewList />);
    const credit = await screen.findByRole('button', { name: 'Cộng 49.000 đ vào ví' });
    expect(screen.getByText('Số tiền chuyển khác số tiền đơn nạp')).toBeTruthy();
    expect(document.body.textContent).toContain('Nhà tuyển dụng');
    expect(document.body.textContent).toContain('Mã giao dịch: FT123');
    expect((credit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Ghi chú (bắt buộc, người nạp sẽ thấy)'), {
      target: { value: '  Đã đối chiếu PayOS  ' },
    });
    expect((credit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(credit);
    await waitFor(() => expect(h.resolve).toHaveBeenCalledWith('r1', true, 'Đã đối chiếu PayOS'));
    expect(h.success).toHaveBeenCalled();
    noFakeMoneyWords();
  });

  it('không cộng → credit=false', async () => {
    h.admin = [adminItem()];
    render(<PaymentReviewList />);
    fireEvent.change(await screen.findByLabelText('Ghi chú (bắt buộc, người nạp sẽ thấy)'), {
      target: { value: 'Đã hoàn tay' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Không cộng (đã xử lý ngoài)' }));
    await waitFor(() => expect(h.resolve).toHaveBeenCalledWith('r1', false, 'Đã hoàn tay'));
  });

  it('server báo nghi trùng → báo nghi trùng, khoá nút cộng', async () => {
    h.admin = [adminItem({ txnRef: null, reason: 'MISSING_REFERENCE', duplicateSuspect: true })];
    render(<PaymentReviewList />);
    const credit = await screen.findByRole('button', { name: 'Cộng 49.000 đ vào ví' });
    fireEvent.change(screen.getByLabelText('Ghi chú (bắt buộc, người nạp sẽ thấy)'), { target: { value: 'x' } });
    expect((credit as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('Nghi trùng');
    expect(document.body.textContent).toContain('Không có mã giao dịch');
  });

  it('tên người dùng chứa "{email}" không làm giả dòng thông tin', async () => {
    h.admin = [adminItem({ userName: '{email}', userEmail: 'that@example.invalid' })];
    render(<PaymentReviewList />);
    expect(await screen.findByText('Người nạp: {email} (Nhà tuyển dụng) · that@example.invalid')).toBeTruthy();
  });

  it('giao dịch của chính admin → khoá cả hai nút', async () => {
    h.adminId = 'u1';
    h.admin = [adminItem()];
    render(<PaymentReviewList />);
    const credit = await screen.findByRole('button', { name: 'Cộng 49.000 đ vào ví' });
    fireEvent.change(screen.getByLabelText('Ghi chú (bắt buộc, người nạp sẽ thấy)'), { target: { value: 'x' } });
    expect((credit as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Không cộng (đã xử lý ngoài)' }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('giao dịch của chính bạn');
  });

  it('không rõ số tiền → không có nút cộng, vẫn bỏ qua được', async () => {
    h.admin = [adminItem({ paidAmount: null })];
    render(<PaymentReviewList />);
    expect(await screen.findByText('PayOS không báo số tiền hợp lệ.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Cộng / })).toBeNull();
    expect(screen.getByRole('button', { name: 'Không cộng (đã xử lý ngoài)' })).toBeTruthy();
  });
});
