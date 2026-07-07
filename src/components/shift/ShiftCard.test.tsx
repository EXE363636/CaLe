/**
 * QA-Stabilization-Automation — `<ShiftCard/>` worker-status regression.
 *
 * Old bug class 4 / Checklist K: a shift the current worker already has
 * an active application on MUST NOT show the public recruiting status
 * "Đang tuyển" as the card's primary badge. Instead the worker's
 * personal application status is the single primary label.
 *
 * UI-only — no store, no navigation.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ShiftCard } from './ShiftCard';
import type { Shift } from '@/types';

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-card-test',
    employerId: 'employer-1',
    title: 'Ca phục vụ cuối tuần',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2030-06-10',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 4,
    positionsFilled: 1,
    status: 'Published', // public status = "Đang tuyển"
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('<ShiftCard/> — worker application status takes over the primary badge', () => {
  it('shows the public "Đang tuyển" status when the worker has NOT applied', () => {
    render(<ShiftCard shift={makeShift()} />);
    expect(screen.getByText('Đang tuyển')).toBeInTheDocument();
  });

  it('does NOT show "Đang tuyển" when the worker has an Approved application', () => {
    render(
      <ShiftCard shift={makeShift()} workerApplicationStatus="Approved" />,
    );
    // The misleading public recruiting status must be gone.
    expect(screen.queryByText('Đang tuyển')).not.toBeInTheDocument();
    // The personal status is shown instead.
    expect(screen.getAllByText('Đã được duyệt').length).toBeGreaterThan(0);
  });

  it('shows "Đã ứng tuyển" (not "Đang tuyển") for a Pending application', () => {
    render(
      <ShiftCard shift={makeShift()} workerApplicationStatus="Pending" />,
    );
    expect(screen.queryByText('Đang tuyển')).not.toBeInTheDocument();
    expect(screen.getAllByText('Đã ứng tuyển').length).toBeGreaterThan(0);
  });

  it('keeps the "Xem chi tiết" view-application affordance for applied shifts', () => {
    render(
      <ShiftCard shift={makeShift()} workerApplicationStatus="Pending" />,
    );
    expect(screen.getByText(/Xem chi tiết/)).toBeInTheDocument();
  });
});
