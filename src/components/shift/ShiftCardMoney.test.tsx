/**
 * Critique 2026-09-26 (Tìm ca làm) — thẻ ca "rõ tiền, rõ ngày":
 *  - tổng tiền cả ca (lương/giờ × số giờ) là con số chính, lương/giờ phụ;
 *  - ngày tương đối "Hôm nay / Ngày mai / T6, 26/09";
 *  - với `href`, cả thẻ là MỘT liên kết thật (không phải div role=button).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ShiftCard } from './ShiftCard';
import { formatRelativeDayVN } from '@/lib/format';
import type { Shift } from '@/types';

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 's-money',
    employerId: 'employer-1',
    title: 'Ca phục vụ tối',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2030-06-10',
    startTime: '18:00',
    endTime: '22:00',
    hourlyWage: 45_000,
    positionsTotal: 3,
    positionsFilled: 1,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 0,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatRelativeDayVN', () => {
  const now = new Date(2026, 8, 25, 10, 0); // Thứ Sáu 25/09/2026, giờ địa phương
  it('hôm nay / ngày mai', () => {
    expect(formatRelativeDayVN('2026-09-25', now)).toBe('Hôm nay');
    expect(formatRelativeDayVN('2026-09-26', now)).toBe('Ngày mai');
  });
  it('ngày khác cùng năm → thứ viết tắt + dd/mm', () => {
    expect(formatRelativeDayVN('2026-10-02', now)).toBe('T6, 02/10');
    expect(formatRelativeDayVN('2026-09-27', now)).toBe('CN, 27/09');
  });
  it('khác năm → kèm năm', () => {
    expect(formatRelativeDayVN('2027-01-05', now)).toBe('T3, 05/01/2027');
  });
});

describe('<ShiftCard/> — tiền cả ca + liên kết thật', () => {
  it('hiện tổng tiền cả ca và lương/giờ × số giờ', () => {
    render(<ShiftCard shift={makeShift()} />);
    // 45.000 × 4 giờ = 180.000
    expect(screen.getByText(/180\.000/)).toBeTruthy();
    expect(screen.getByText('cả ca')).toBeTruthy();
    expect(screen.getByText(/4 giờ/)).toBeTruthy();
    expect(screen.getByText('Còn 2/3 vị trí')).toBeTruthy();
  });

  it('ca qua đêm (không tính được số giờ) → chỉ hiện lương/giờ, không bịa tổng', () => {
    render(<ShiftCard shift={makeShift({ startTime: '22:00', endTime: '02:00' })} />);
    expect(screen.queryByText('cả ca')).toBeNull();
    expect(screen.getByText(/45\.000/)).toBeTruthy();
  });

  it('href → một liên kết duy nhất tới chi tiết ca, không có role=button', () => {
    const { container } = render(
      <ShiftCard shift={makeShift()} href="/shifts/s-money" employerName="Quán Phở Hà" />,
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/shifts/s-money');
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(screen.getByText('Quán Phở Hà')).toBeTruthy();
  });
});
