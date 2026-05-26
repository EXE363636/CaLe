/**
 * Phase 10C — `<CheckoutDialog/>` UI tests (Wave 3).
 *
 * Locks down the visible behaviour of the worker check-out dialog
 * without exercising the store directly:
 *
 *   - Renders the dialog title and intro copy.
 *   - Mentions the 12-hour rule somewhere in the dialog (intro).
 *   - Renders one checklist row per `CHECKOUT_CHECKLIST_ITEMS_VI`
 *     entry for the current evidence requirement.
 *   - Shows the photo filename input only for `'OptionalPhoto'`,
 *     `'RequiredPhoto'`, and `'RequiredHandoverChecklist'`.
 *   - Submit button gating mirrors `validateCheckoutPayload`.
 *   - Surfaces the parent's `errorMessage` as a `role="alert"`.
 *   - Exposes the help popover trigger ("Vì sao cần bằng chứng?").
 *
 * No store / lifecycle assertions live here — those belong to
 * `src/__tests__/phase10cCheckout.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CheckoutDialog } from './CheckoutDialog';
import { CHECKOUT_CHECKLIST_ITEMS_VI } from '@/i18n/vi';
import type { Application, Shift, EvidenceRequirement } from '@/types';

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-test',
    employerId: 'employer-1',
    title: 'Ca thử',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1',
    date: '2030-01-01',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50000,
    positionsTotal: 1,
    positionsFilled: 0,
    status: 'InProgress',
    escrowStatus: 'InProgress',
    depositAmount: 200000,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    evidenceRequirement: 'OptionalPhoto',
    ...overrides,
  };
}

function makeApp(): Application {
  return {
    id: 'app-1',
    shiftId: 'shift-test',
    workerId: 'w1',
    status: 'CheckedIn',
    appliedAt: '2025-01-01T00:00:00.000Z',
  };
}

function getSubmitButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: /Hoàn tất ca làm/i,
  }) as HTMLButtonElement;
}

describe('<CheckoutDialog/> — Phase 10C', () => {
  it('renders title, intro, and the help popover trigger', () => {
    render(
      <CheckoutDialog
        open
        onClose={() => {}}
        application={makeApp()}
        shift={makeShift()}
        onSubmit={() => {}}
      />,
    );
    expect(
      screen.getAllByRole('heading', { name: /Hoàn tất ca làm/i }).length,
    ).toBeGreaterThanOrEqual(1);
    // Intro mentions the 12-hour rule.
    expect(
      screen.getByText(/12 giờ để xác nhận hoặc khiếu nại/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Giải thích: Vì sao cần bằng chứng\?/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders one checklist row per template entry', () => {
    const cases: EvidenceRequirement[] = [
      'None',
      'ChecklistOnly',
      'OptionalPhoto',
      'RequiredPhoto',
      'RequiredHandoverChecklist',
    ];
    for (const level of cases) {
      const expected = CHECKOUT_CHECKLIST_ITEMS_VI[level];
      const { unmount } = render(
        <CheckoutDialog
          open
          onClose={() => {}}
          application={makeApp()}
          shift={makeShift({ evidenceRequirement: level })}
          onSubmit={() => {}}
        />,
      );
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(expected.length);
      unmount();
    }
  });

  it('hides the photo filename input for None / ChecklistOnly', () => {
    for (const level of ['None', 'ChecklistOnly'] as EvidenceRequirement[]) {
      const { unmount } = render(
        <CheckoutDialog
          open
          onClose={() => {}}
          application={makeApp()}
          shift={makeShift({ evidenceRequirement: level })}
          onSubmit={() => {}}
        />,
      );
      expect(
        screen.queryByLabelText(/Tên tệp ảnh bàn giao/i),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it('shows the photo filename input for OptionalPhoto / RequiredPhoto / RequiredHandoverChecklist', () => {
    for (const level of [
      'OptionalPhoto',
      'RequiredPhoto',
      'RequiredHandoverChecklist',
    ] as EvidenceRequirement[]) {
      const { unmount } = render(
        <CheckoutDialog
          open
          onClose={() => {}}
          application={makeApp()}
          shift={makeShift({ evidenceRequirement: level })}
          onSubmit={() => {}}
        />,
      );
      expect(
        screen.getByLabelText(/Tên tệp ảnh bàn giao/i),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it('disables submit when RequiredPhoto has no filename and enables once filled', () => {
    render(
      <CheckoutDialog
        open
        onClose={() => {}}
        application={makeApp()}
        shift={makeShift({ evidenceRequirement: 'RequiredPhoto' })}
        onSubmit={() => {}}
      />,
    );
    expect(getSubmitButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Tên tệp ảnh bàn giao/i), {
      target: { value: 'handover-007.jpg' },
    });
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it('disables submit when RequiredHandoverChecklist is incomplete', () => {
    render(
      <CheckoutDialog
        open
        onClose={() => {}}
        application={makeApp()}
        shift={makeShift({
          evidenceRequirement: 'RequiredHandoverChecklist',
        })}
        onSubmit={() => {}}
      />,
    );
    // Required levels start with un-ticked rows.
    expect(getSubmitButton()).toBeDisabled();
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    for (const cb of checkboxes) fireEvent.click(cb);
    // Still missing the note.
    expect(getSubmitButton()).toBeDisabled();
    // Use the role-based query so it doesn't collide with the
    // checklist row "Đã viết ghi chú bàn giao đầy đủ".
    fireEvent.change(screen.getByRole('textbox', { name: /Ghi chú bàn giao/i }), {
      target: { value: 'đã bàn giao xong' },
    });
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it('forwards the payload to onSubmit when submit clicks', () => {
    const handle =
      vi.fn<(p: { checklist?: boolean[]; note?: string; evidenceFileName?: string }) => void>();
    render(
      <CheckoutDialog
        open
        onClose={() => {}}
        application={makeApp()}
        shift={makeShift({ evidenceRequirement: 'OptionalPhoto' })}
        onSubmit={handle}
      />,
    );
    // OptionalPhoto pre-ticks the 2-row checklist; submit is enabled.
    fireEvent.change(screen.getByLabelText(/Tên tệp ảnh bàn giao/i), {
      target: { value: 'opt.jpg' },
    });
    fireEvent.click(getSubmitButton());
    expect(handle).toHaveBeenCalledTimes(1);
    const payload = handle.mock.calls[0]![0];
    expect(payload.evidenceFileName).toBe('opt.jpg');
    expect(payload.checklist).toEqual([true, true]);
  });

  it('renders the parent-supplied errorMessage as a role="alert"', () => {
    render(
      <CheckoutDialog
        open
        onClose={() => {}}
        application={makeApp()}
        shift={makeShift()}
        onSubmit={() => {}}
        errorMessage="Vui lòng tích đầy đủ các mục trước khi gửi."
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Vui lòng tích đầy đủ các mục trước khi gửi.');
  });
});
