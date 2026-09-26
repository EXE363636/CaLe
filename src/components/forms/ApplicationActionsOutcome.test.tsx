/**
 * Critique 2026-09-26 (chi tiết ca) — khối "ứng tuyển" không bao giờ rỗng:
 * ca đã đóng / đơn đã qua bước ứng tuyển hiện kết quả thay vì hộp trắng.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ApplicationActions } from './ApplicationActions';
import type { ApplicationStatus, ShiftStatus } from '@/types';

function renderActions(
  applicationStatus: ApplicationStatus | null,
  shiftStatus: ShiftStatus,
  payoutAmount?: number,
) {
  return render(
    <ApplicationActions
      shiftId="s1"
      workerId="w1"
      applicationStatus={applicationStatus}
      workerVerifications={['phone']}
      workerReputationScore={100}
      shiftStatus={shiftStatus}
      payoutAmount={payoutAmount}
      onApply={() => {}}
      onRequestCancel={() => {}}
    />,
  );
}

describe('<ApplicationActions/> — kết quả sau khi ứng tuyển', () => {
  it('đơn đã hoàn thành trên ca đã đóng → hiện kết quả + tiền công, không rỗng', () => {
    const { container } = renderActions('Confirmed', 'Completed', 45_454);
    expect(container.textContent).not.toBe('');
    expect(screen.getByText('Đã hoàn thành')).toBeTruthy();
    expect(screen.getByText(/45\.454 đ/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Xem ví/ }).getAttribute('href')).toBe(
      '/worker/dashboard#wallet',
    );
  });

  it('ca đã đóng, chưa ứng tuyển → câu "không còn nhận ứng tuyển"', () => {
    renderActions(null, 'Completed');
    expect(screen.getByText('Ca này không còn nhận ứng tuyển.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('đã check-out → báo đang chờ nhà tuyển dụng xác nhận', () => {
    renderActions('CheckedOut', 'InProgress');
    expect(screen.getByText(/Đang chờ nhà tuyển dụng xác nhận/)).toBeTruthy();
  });

  it('ca đang mở, chưa ứng tuyển → vẫn là nút Ứng tuyển', () => {
    renderActions(null, 'Published');
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
