/**
 * Phase 10C — `<PaymentEvidenceCard/>` worker-facing card tests (Wave 2).
 *
 * Read-only education card. Locks down the visible Vietnamese copy:
 *   - Title "Quy trình thanh toán & bằng chứng" + intro mentions
 *     evidence is risk-based.
 *   - Per-level "what you need to prepare" line (uses the
 *     evidence requirement label from Wave 0).
 *   - 12-hour confirmation rule.
 *   - 12-hour auto-release rule.
 *   - Required-evidence banner ("Ca này yêu cầu bằng chứng bàn giao")
 *     for `'RequiredPhoto'` and `'RequiredHandoverChecklist'`; absent
 *     for the three lower levels.
 *   - Privacy warning is rendered.
 *   - Help popover trigger ("Khi nào cần bằng chứng?") is present.
 *   - Fallback message renders when `evidenceRequirement` is missing.
 *
 * UI-only — no store, no checkout flow, no dispute / admin / auto-release.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentEvidenceCard } from './PaymentEvidenceCard';
import type { Shift, EvidenceRequirement } from '@/types';

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
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 200000,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    evidenceRequirement: 'OptionalPhoto',
    ...overrides,
  };
}

describe('<PaymentEvidenceCard/> — Phase 10C worker education', () => {
  it('renders the card title, intro, and the two payment-release rules', () => {
    render(<PaymentEvidenceCard shift={makeShift()} />);
    expect(
      screen.getByRole('heading', { name: 'Quy trình thanh toán & bằng chứng' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /tuỳ độ rủi ro công việc.*không phải ca nào cũng cần ảnh bàn giao/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sau khi bạn check-out, nhà tuyển dụng có tối đa 12 giờ để xác nhận hoặc khiếu nại.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Nếu nhà tuyển dụng không thao tác trong 12 giờ, hệ thống sẽ tự động giải ngân tiền công.',
      ),
    ).toBeInTheDocument();
  });

  it('exposes the HelpPopover trigger labelled "Khi nào cần bằng chứng?"', () => {
    render(<PaymentEvidenceCard shift={makeShift()} />);
    const trigger = screen.getByRole('button', {
      name: /Giải thích: Khi nào cần bằng chứng\?/i,
    });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('renders the privacy warning copy', () => {
    render(<PaymentEvidenceCard shift={makeShift()} />);
    expect(
      screen.getByText(
        /Không yêu cầu chụp khách hàng, giấy tờ cá nhân.*hoá đơn nhạy cảm.*hàng hoá bảo mật/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows the evidence label and the per-level "prepare" copy', () => {
    const cases: Array<{
      level: EvidenceRequirement;
      label: string;
      prepareSnippet: RegExp;
    }> = [
      {
        level: 'None',
        label: 'Không cần bằng chứng',
        prepareSnippet: /chỉ cần thông báo nhà tuyển dụng/i,
      },
      {
        level: 'ChecklistOnly',
        label: 'Chỉ cần checklist hoàn thành',
        prepareSnippet: /tích đầy đủ các mục checklist/i,
      },
      {
        level: 'OptionalPhoto',
        label: 'Có thể đính kèm ảnh bàn giao',
        prepareSnippet: /đính kèm ảnh bàn giao nếu thấy cần thiết/i,
      },
      {
        level: 'RequiredPhoto',
        label: 'Bắt buộc đính kèm ảnh bàn giao',
        prepareSnippet: /đính kèm ảnh bàn giao khu vực làm việc/i,
      },
      {
        level: 'RequiredHandoverChecklist',
        label: 'Bắt buộc checklist + ghi chú bàn giao',
        prepareSnippet:
          /tích đầy đủ checklist và viết ghi chú bàn giao đầy đủ/i,
      },
    ];

    for (const { level, label, prepareSnippet } of cases) {
      const { unmount } = render(
        <PaymentEvidenceCard
          shift={makeShift({ evidenceRequirement: level })}
        />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(prepareSnippet)).toBeInTheDocument();
      unmount();
    }
  });

  it('shows the required-evidence banner only for required levels', () => {
    const required: EvidenceRequirement[] = [
      'RequiredPhoto',
      'RequiredHandoverChecklist',
    ];
    const optional: EvidenceRequirement[] = [
      'None',
      'ChecklistOnly',
      'OptionalPhoto',
    ];

    for (const level of required) {
      const { unmount } = render(
        <PaymentEvidenceCard
          shift={makeShift({ evidenceRequirement: level })}
        />,
      );
      expect(
        screen.getByText('Ca này yêu cầu bằng chứng bàn giao'),
      ).toBeInTheDocument();
      unmount();
    }

    for (const level of optional) {
      const { unmount } = render(
        <PaymentEvidenceCard
          shift={makeShift({ evidenceRequirement: level })}
        />,
      );
      expect(
        screen.queryByText('Ca này yêu cầu bằng chứng bàn giao'),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it('renders a Vietnamese fallback when evidenceRequirement is missing', () => {
    render(
      <PaymentEvidenceCard
        shift={makeShift({ evidenceRequirement: undefined })}
      />,
    );
    expect(
      screen.getByText(/Không tìm thấy thông tin yêu cầu bằng chứng/i),
    ).toBeInTheDocument();
    // Title still renders (so the section never collapses to empty).
    expect(
      screen.getByRole('heading', { name: 'Quy trình thanh toán & bằng chứng' }),
    ).toBeInTheDocument();
    // Body content (rules) is suppressed in the fallback to avoid
    // misleading copy when we don't know the level.
    expect(
      screen.queryByText(/12 giờ để xác nhận hoặc khiếu nại/i),
    ).not.toBeInTheDocument();
  });
});
