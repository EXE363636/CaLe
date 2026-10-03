/**
 * Migration 0033: lượt tự chốt bỏ qua ca lỗi (chỉ ghi warning vào log) → admin
 * phải thấy số ca còn cọc kẹt HELD quá hạn (admin_payout_health.stuckDeposits).
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/data/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc }),
  isSupabaseEnv: () => true,
}));

import { getPayoutHealth } from '@/data/repos/walletRepo';
import { PayoutHealthBanner } from '@/components/wallet/PayoutHealthBanner';

const base = {
  insufficientFailures24h: 0,
  lastInsufficientAt: null,
  failed24h: 0,
  processingCount: 0,
};

beforeEach(() => {
  rpc.mockReset();
});

describe('admin_payout_health.stuckDeposits (0033)', () => {
  it('repo đọc stuckDeposits; server cũ chưa có trường → 0', async () => {
    rpc.mockResolvedValueOnce({ data: { ...base, stuckDeposits: 3 }, error: null });
    expect((await getPayoutHealth()).stuckDeposits).toBe(3);
    rpc.mockResolvedValueOnce({ data: base, error: null });
    expect((await getPayoutHealth()).stuckDeposits).toBe(0);
  });

  it('banner cảnh báo khi có ca kẹt cọc', async () => {
    rpc.mockResolvedValueOnce({ data: { ...base, stuckDeposits: 2 }, error: null });
    render(<PayoutHealthBanner />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('2');
    expect(alert.textContent?.toLowerCase()).toContain('cọc');
  });

  it('không có gì bất thường → không hiện banner', async () => {
    rpc.mockResolvedValueOnce({ data: { ...base, stuckDeposits: 0 }, error: null });
    const { container } = render(<PayoutHealthBanner />);
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
