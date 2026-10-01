/**
 * P2-1 (0028) — UI cọc người lao động (supabase). Repo được mock; server thật
 * chạy thử bằng supabase/dryrun/run-0028.sh.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { NoShowContest, WorkerDepositStatus, WorkerHold } from '@/data/repos/workerDepositRepo';

const h = vi.hoisted(() => ({
  hold: null as WorkerHold | null,
  contest: null as NoShowContest | null,
  noShowAt: null as string | null,
  send: vi.fn(async () => {}),
}));

vi.mock('@/data/repos/workerDepositRepo', () => ({
  getMyHoldForApplication: async () => h.hold,
  getMyNoShowContest: async () => h.contest,
  getMyApplicationNoShowAt: async () => h.noShowAt,
  contestNoShow: h.send,
}));

import { WorkerDepositApplyNotice } from './WorkerDepositApplyNotice';
import { WorkerDepositContestPanel } from './WorkerDepositContestPanel';

afterEach(() => {
  cleanup();
  h.hold = null;
  h.contest = null;
  h.noShowAt = null;
  h.send.mockClear();
});

const base: WorkerDepositStatus = {
  enabled: true, ratioPct: 50, maxAmount: 100000, exemptAfter: 5, windowDays: 30,
  maxOpenHolds: 3, forfeitDailyCap: 300000,
  needsDeposit: true, reason: 'NOT_ENOUGH', completedInWindow: 2, blockedUntil: null,
  openHolds: 0, balance: 200000,
};

describe('WorkerDepositApplyNotice', () => {
  it('cờ tắt → không hiện gì', () => {
    const { container } = render(
      <WorkerDepositApplyNotice status={{ ...base, enabled: false, needsDeposit: false, reason: 'DISABLED' }} amount={0} />,
    );
    expect(container.textContent).toBe('');
  });

  it('cần cọc → hiện số tiền, cách hoàn, số dư; không hiện "mô phỏng" / VNĐ / ₫', () => {
    render(<WorkerDepositApplyNotice status={base} amount={75000} />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Ứng tuyển ca này cần đặt cọc 75.000 đ.');
    expect(text).toContain('Số dư ví: 200.000 đ.');
    expect(text).not.toMatch(/mô phỏng|VNĐ|₫/);
    expect(screen.queryByRole('link', { name: 'Nạp tiền vào ví' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Xác thực CCCD để được miễn cọc' })).toBeTruthy();
  });

  it('ví thiếu → mời nạp ví', () => {
    render(<WorkerDepositApplyNotice status={{ ...base, balance: 10000 }} amount={75000} />);
    expect(screen.getByRole('link', { name: 'Nạp tiền vào ví' }).getAttribute('href')).toBe('/worker/dashboard#wallet');
  });

  it('T2: đã giữ đủ số khoản tối đa → báo đạt tối đa', () => {
    render(<WorkerDepositApplyNotice status={{ ...base, openHolds: 3 }} amount={75000} />);
    expect(document.body.textContent).toContain('Bạn đang giữ 3/3 khoản cọc, đã đạt tối đa.');
  });

  it('vắng mặt gần đây → hiện hạn theo giờ VN, không mời xác thực CCCD (CCCD không miễn được)', () => {
    render(
      <WorkerDepositApplyNotice
        status={{ ...base, reason: 'RECENT_NO_SHOW', blockedUntil: '2026-10-19T20:00:00.000Z' }}
        amount={75000}
      />,
    );
    // 20:00 UTC ngày 19 = 03:00 ngày 20 giờ VN.
    expect(document.body.textContent).toContain('tới ngày 20/10/2026');
    expect(screen.queryByRole('link', { name: 'Xác thực CCCD để được miễn cọc' })).toBeNull();
  });

  it('miễn cọc vì CCCD / vì đủ ca', () => {
    render(<WorkerDepositApplyNotice status={{ ...base, needsDeposit: false, reason: 'IDENTITY' }} amount={0} />);
    expect(document.body.textContent).toContain('đã xác thực CCCD');
    cleanup();
    render(<WorkerDepositApplyNotice status={{ ...base, needsDeposit: false, reason: 'COMPLETED_SHIFTS' }} amount={0} />);
    expect(document.body.textContent).toContain('đã làm đủ 5 ca trong 30 ngày');
  });
});

const hold = (over: Partial<WorkerHold> = {}): WorkerHold => ({
  id: 'h1', applicationId: 'a1', shiftId: 's1', amount: 75000, status: 'Held',
  contestReason: null, contestedAt: null, reviewReason: null, resolution: null, resolutionNote: null,
  settledAt: null, createdAt: '2026-09-30T00:00:00.000Z', appStatus: 'NoShow', noShowAt: null, ...over,
});

describe('WorkerDepositContestPanel', () => {
  // Ca kết thúc xa trong tương lai → còn hạn khiếu nại.
  const props = { applicationId: 'a1', shiftDate: '2099-01-01', shiftEndTime: '13:00' };

  it('có cọc, còn hạn → hạn 72 giờ theo giờ VN; gửi khiếu nại (lý do quá ngắn bị chặn ở client)', async () => {
    h.hold = hold();
    const onLoaded = vi.fn();
    render(<WorkerDepositContestPanel {...props} onLoaded={onLoaded} />);
    await screen.findByText('Tiền cọc 75.000 đ đang được giữ');
    expect(onLoaded).toHaveBeenCalled();
    // Hết ca 13:00 ngày 01/01/2099 (giờ VN) + 72 giờ.
    expect(document.body.textContent).toMatch(/13:00.*04\/01\/2099|04\/01\/2099.*13:00/);

    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }));
    expect(await screen.findByText('Vui lòng ghi lý do (ít nhất 5 ký tự).')).toBeTruthy();
    expect(h.send).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Lý do khiếu nại'), { target: { value: 'Tôi có đến đúng giờ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }));
    await waitFor(() => expect(h.send).toHaveBeenCalledWith('a1', 'Tôi có đến đúng giờ'));
  });

  it('quá hạn → không còn ô khiếu nại', async () => {
    h.hold = hold();
    render(<WorkerDepositContestPanel {...props} shiftDate="2020-01-01" />);
    await screen.findByText('Đã hết hạn khiếu nại. Tiền cọc sẽ chuyển cho nhà tuyển dụng.');
    expect(screen.queryByRole('button', { name: 'Gửi khiếu nại' })).toBeNull();
  });

  it('T2: hệ thống giữ lại chờ admin mà worker chưa khiếu nại → vẫn cho gửi lý do', async () => {
    h.hold = hold({ status: 'Contested', reviewReason: 'EMPLOYER_DAILY_CAP' });
    render(<WorkerDepositContestPanel {...props} shiftDate="2020-01-01" />);
    await screen.findByText(/đang chờ quản trị viên xem xét trước khi chuyển/);
    expect(screen.getByRole('button', { name: 'Gửi khiếu nại' })).toBeTruthy();
  });

  it('đang khiếu nại / đã hoàn (ghi chú admin chứa $& không bị méo) / đã chuyển', async () => {
    h.hold = hold({ status: 'Contested', contestReason: 'Tôi có đến' });
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText(/Quản trị viên đang xem xét/);
    cleanup();

    h.hold = hold({ status: 'Refunded', resolution: 'WORKER', resolutionNote: 'NTD nhầm $& lần 2' });
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText('Tiền cọc 75.000 đ đã hoàn về ví của bạn.');
    expect(document.body.textContent).toContain('Ghi chú của quản trị viên: NTD nhầm $& lần 2');
    cleanup();

    h.hold = hold({ status: 'Forfeited' });
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText('Tiền cọc 75.000 đ đã chuyển cho nhà tuyển dụng.');
  });

  it('L1: không có cọc → vẫn khiếu nại được (không kèm tiền)', async () => {
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText('Bạn bị đánh vắng mặt ở ca này');
    fireEvent.change(screen.getByLabelText('Lý do khiếu nại'), { target: { value: 'Tôi có đến, quên check-in' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }));
    await waitFor(() => expect(h.send).toHaveBeenCalledWith('a1', 'Tôi có đến, quên check-in'));
  });

  it('L1: hạn tính theo lúc bị đánh vắng của đơn (tự chốt đánh vắng muộn vẫn còn hạn)', async () => {
    // Ca kết thúc 2020 (quá 72h từ lâu), nhưng đơn bị đánh vắng ở tương lai xa → còn hạn.
    h.noShowAt = '2099-01-01T00:00:00.000Z';
    render(<WorkerDepositContestPanel {...props} shiftDate="2020-01-01" />);
    await screen.findByText('Bạn bị đánh vắng mặt ở ca này');
    expect(screen.getByRole('button', { name: 'Gửi khiếu nại' })).toBeTruthy();
  });

  it('khoản đã hoàn dự phòng rồi mới bị đánh vắng → hiện đã hoàn + vẫn khiếu nại được', async () => {
    h.hold = hold({ status: 'Refunded', resolution: null });
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText('Tiền cọc 75.000 đ đã hoàn về ví của bạn.');
    expect(document.body.textContent).toContain('Bạn bị đánh vắng mặt ở ca này');
    expect(screen.getByRole('button', { name: 'Gửi khiếu nại' })).toBeTruthy();
  });

  it('L1: khiếu nại không kèm cọc đang chờ / được chấp nhận', async () => {
    h.contest = { applicationId: 'a1', reason: 'x', status: 'Pending', resolutionNote: null, createdAt: '' };
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText('Bạn đã khiếu nại. Quản trị viên đang xem xét.');
    expect(screen.queryByRole('button', { name: 'Gửi khiếu nại' })).toBeNull();
    cleanup();

    h.contest = { applicationId: 'a1', reason: 'x', status: 'Upheld', resolutionNote: 'Đúng', createdAt: '' };
    render(<WorkerDepositContestPanel {...props} />);
    await screen.findByText(/lần vắng mặt này không bị tính/);
  });
});
