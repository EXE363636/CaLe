/**
 * 03/10 — ô ví `variant="tile"` trên dashboard ở production (supabase): lệnh rút thất bại /
 * giao dịch nạp cần kiểm tra KHÔNG được bày trong ô (từng kéo cả hàng thẻ số cao gấp đôi);
 * ô chỉ giữ một dòng tóm tắt khi có lệnh đang chạy, danh sách nằm trong hộp lịch sử.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { MyPaymentReview } from '@/data/repos/paymentReviewRepo';
import type { PayoutOrder } from '@/types';

const h = vi.hoisted(() => ({ reviews: [] as MyPaymentReview[] }));

vi.mock('@/data/supabaseClient', async (orig) => ({
  ...(await orig<typeof import('@/data/supabaseClient')>()),
  getDataMode: () => 'supabase',
}));
vi.mock('@/data/repos/paymentReviewRepo', () => ({
  listMyPaymentReviews: async () => h.reviews,
}));

import { WalletPanel } from '@/components/wallet/WalletPanel';
import { useWalletStore } from '@/stores/walletStore';

const withdrawal = (over: Partial<PayoutOrder>): PayoutOrder =>
  ({
    id: 'w1',
    amount: 2000,
    toBin: '970422',
    toAccountNumber: '0000009999',
    toAccountName: 'NGUYEN VAN A',
    status: 'FAILED',
    failReason: 'signature không hợp lệ',
    createdAt: '2026-09-24T07:53:54.000Z',
    ...over,
  }) as PayoutOrder;

function seed(withdrawals: PayoutOrder[]) {
  useWalletStore.setState({
    withdrawals,
    wallets: [{ userId: 'u1', balance: 1, promoBalance: 0 }] as never,
    ledger: [],
    refetchAsync: async () => {},
    refetchWithdrawalsAsync: async () => {},
  } as never);
}

beforeEach(() => {
  h.reviews = [];
});
afterEach(cleanup);

describe('WalletPanel tile (supabase)', () => {
  it('lệnh rút thất bại không bày trong ô; mở "Xem lịch sử giao dịch" mới thấy', async () => {
    seed([withdrawal({ id: 'a' }), withdrawal({ id: 'b' }), withdrawal({ id: 'c' })]);
    render(<WalletPanel userId="u1" role="employer" variant="tile" />);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText('Lệnh rút gần đây')).toBeNull();
    expect(screen.queryByText(/đang xử lý/)).toBeNull();

    const history = screen.getByRole('button', { name: 'Xem lịch sử giao dịch' }) as HTMLButtonElement;
    expect(history.disabled).toBe(false);
    fireEvent.click(history);
    expect(await screen.findByText('Lệnh rút gần đây')).toBeTruthy();
  });

  it('lệnh rút đang chạy + giao dịch nạp đang kiểm tra: mỗi loại một dòng tóm tắt', async () => {
    seed([withdrawal({ id: 'p', status: 'PROCESSING', failReason: undefined }), withdrawal({ id: 'f' })]);
    h.reviews = [
      {
        id: 'r1', orderCode: 1, orderAmount: 50000, reason: 'AMOUNT_MISMATCH', paidAmount: 49000,
        status: 'Pending', creditedAmount: null, resolutionNote: null, resolvedAt: null,
        createdAt: new Date().toISOString(),
      } as MyPaymentReview,
    ];
    render(<WalletPanel userId="u1" role="worker" variant="tile" />);

    expect(screen.getByText('1 lệnh rút đang xử lý.')).toBeTruthy();
    expect(await screen.findByText('1 giao dịch nạp đang được kiểm tra.')).toBeTruthy();
    expect(screen.queryByText('Lệnh rút gần đây')).toBeNull();
    expect(screen.queryByText(/Chuyển 49\.000 đ/)).toBeNull();
    // Sổ cái trống vẫn mở được hộp lịch sử để xem chi tiết giao dịch nạp đang kiểm tra.
    fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử giao dịch' }));
    expect(await screen.findByText('Chuyển 49.000 đ cho đơn nạp 50.000 đ')).toBeTruthy();
  });

  it('bản panel (không tile) vẫn hiện danh sách lệnh rút như cũ', async () => {
    seed([withdrawal({ id: 'a' })]);
    render(<WalletPanel userId="u1" role="employer" />);
    expect(await screen.findByText('Lệnh rút gần đây')).toBeTruthy();
  });
});
