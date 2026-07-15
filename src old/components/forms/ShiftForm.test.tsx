/**
 * Phase 10C — ShiftForm evidence picker tests (Wave 1).
 *
 * Covers the new "Bằng chứng sau ca" fieldset:
 *   - All 5 evidence levels render as radios.
 *   - Initial selection equals `suggestedEvidenceForJobType('')`
 *     (`'RequiredHandoverChecklist'` per Wave 0).
 *   - Picking a job category re-seeds the picker to the new
 *     suggestion when the employer hasn't manually overridden it.
 *   - The "Hệ thống đề xuất" chip sits next to the suggested option.
 *   - Choosing a high-risk job category disables every option below
 *     `'RequiredHandoverChecklist'`.
 *   - Submitting the form calls `onSubmit` with the chosen
 *     `evidenceRequirement` field.
 *   - The privacy warning copy is rendered.
 *
 * UI-only — no store, no auto-release, no checkout flow.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { ShiftForm, type ShiftFormValues } from './ShiftForm';
import {
  EVIDENCE_REQUIREMENT_VALUES,
  suggestedEvidenceForJobType,
} from '@/domain/evidence';
import { evidenceRequirementLabel } from '@/i18n/vi';

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText('Tên ca làm', { exact: false }), {
    target: { value: 'Ca thử' },
  });
  // Use exact match — "Địa điểm" collides with "Ảnh địa điểm /
  // khu vực làm việc" in the workplace section under a fuzzy regex.
  fireEvent.change(screen.getByLabelText(/^Địa điểm/), {
    target: { value: 'Quận 1' },
  });
  fireEvent.change(screen.getByLabelText(/Ngày làm/i), {
    target: { value: '01/01/2030' },
  });
  fireEvent.change(screen.getByLabelText(/Giờ bắt đầu/i), {
    target: { value: '08:00' },
  });
  fireEvent.change(screen.getByLabelText(/Giờ kết thúc/i), {
    target: { value: '12:00' },
  });
  fireEvent.change(screen.getByLabelText(/Lương theo giờ/i), {
    target: { value: '50000' },
  });
  // CORE-STABILITY-8 Part 2 — on-site contact person + phone are now
  // required to publish (the "Đăng ca" submit path). Anchor the name
  // regex so it doesn't also match "SĐT người phụ trách tại chỗ".
  fireEvent.change(screen.getByLabelText(/^Người phụ trách tại chỗ/), {
    target: { value: 'Anh Liêm' },
  });
  fireEvent.change(screen.getByLabelText(/^SĐT người phụ trách tại chỗ/), {
    target: { value: '0901234567' },
  });
}

describe('<ShiftForm/> — Phase 10C evidence picker', () => {
  it('renders all 5 evidence options as radios', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    for (const option of EVIDENCE_REQUIREMENT_VALUES) {
      const label = evidenceRequirementLabel(option);
      // Each option label appears exactly once next to its radio.
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
    const radios = screen.getAllByRole('radio', {
      name: (_name, el) =>
        el.getAttribute('name') === 'shiftForm-evidenceRequirement',
    });
    expect(radios).toHaveLength(EVIDENCE_REQUIREMENT_VALUES.length);
  });

  it("initial selection equals suggestedEvidenceForJobType('')", () => {
    render(<ShiftForm onSubmit={() => {}} />);
    const expected = suggestedEvidenceForJobType('');
    const checked = screen
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).checked);
    expect(checked).toBeTruthy();
    expect((checked as HTMLInputElement).value).toBe(expected);
  });

  it('renders the privacy warning copy', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    expect(
      screen.getByText(
        /Không yêu cầu chụp khách hàng, giấy tờ cá nhân.*hoá đơn nhạy cảm.*hàng hoá bảo mật/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows the "Hệ thống đề xuất" chip next to the suggested option', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    // Pick a Low-risk job type (Phát tờ rơi → ChecklistOnly).
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Phát tờ rơi' },
    });
    const chips = screen.getAllByText('Hệ thống đề xuất');
    expect(chips.length).toBeGreaterThanOrEqual(1);
    // The chip should render inside the same `<label>` as the
    // `'ChecklistOnly'` option's radio.
    const checklistOnlyLabel = chips[0].closest('label');
    expect(checklistOnlyLabel).toBeTruthy();
    const radio = within(checklistOnlyLabel as HTMLElement).getByRole(
      'radio',
    ) as HTMLInputElement;
    expect(radio.value).toBe('ChecklistOnly');
  });

  it('re-seeds the picker when the job category changes (untouched picker)', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    // Switch to a Low-risk job; the picker should re-seed to
    // `'ChecklistOnly'`.
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Phát tờ rơi' },
    });
    const checked = screen
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).checked);
    expect((checked as HTMLInputElement).value).toBe('ChecklistOnly');

    // Switch to a Medium-risk job; the picker should re-seed to
    // `'OptionalPhoto'`.
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Phục vụ' },
    });
    const checkedAfter = screen
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).checked);
    expect((checkedAfter as HTMLInputElement).value).toBe('OptionalPhoto');
  });

  it('preserves the employer\u2019s manual pick when the job category changes', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Phát tờ rơi' }, // Low risk → ChecklistOnly
    });
    // Manually override to OptionalPhoto.
    fireEvent.click(
      screen.getByRole('radio', {
        name: (_n, el) => (el as HTMLInputElement).value === 'OptionalPhoto',
      }) as HTMLElement,
    );
    // Switch to another Low-risk job (suggestion stays
    // ChecklistOnly). The employer's OptionalPhoto pick must
    // survive.
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Hỗ trợ sự kiện' },
    });
    const checked = screen
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).checked);
    expect((checked as HTMLInputElement).value).toBe('OptionalPhoto');
  });

  it('disables sub-min options for high-risk job categories', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Thu ngân' }, // High risk
    });
    // High risk allows only RequiredHandoverChecklist + RequiredPhoto.
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const map = new Map(radios.map((r) => [r.value, r]));
    expect(map.get('None')?.disabled).toBe(true);
    expect(map.get('ChecklistOnly')?.disabled).toBe(true);
    expect(map.get('OptionalPhoto')?.disabled).toBe(true);
    expect(map.get('RequiredHandoverChecklist')?.disabled).toBe(false);
    expect(map.get('RequiredPhoto')?.disabled).toBe(false);
  });

  it('lifts the selection when switching from low-risk to high-risk', () => {
    render(<ShiftForm onSubmit={() => {}} />);
    // Start on Low risk and override to None.
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Phát tờ rơi' },
    });
    fireEvent.click(
      screen.getByRole('radio', {
        name: (_n, el) => (el as HTMLInputElement).value === 'None',
      }) as HTMLElement,
    );
    // Switch to High risk; the picker should lift to the suggestion
    // for that category (RequiredHandoverChecklist).
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Thu ngân' },
    });
    const checked = screen
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).checked) as HTMLInputElement;
    expect(checked.value).toBe('RequiredHandoverChecklist');
  });

  it('submits the chosen evidenceRequirement on the values payload', () => {
    const handle = vi.fn<(values: ShiftFormValues) => void>();
    render(<ShiftForm onSubmit={handle} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Loại công việc/i), {
      target: { value: 'Phục vụ' }, // Medium → OptionalPhoto
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Đăng ca cần tuyển/i }),
    );
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0]![0].evidenceRequirement).toBe('OptionalPhoto');
  });

  it('CORE-STABILITY-8 Part 2 — blocks submit (onSubmit not called) when on-site contact is missing', () => {
    const handle = vi.fn<(values: ShiftFormValues) => void>();
    render(<ShiftForm onSubmit={handle} />);
    // Fill everything via the shared helper, then CLEAR the on-site
    // contact fields so the publish path is missing its required
    // contact. The form must block submit (onSubmit never fires).
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/^Người phụ trách tại chỗ/), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText(/^SĐT người phụ trách tại chỗ/), {
      target: { value: '' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Đăng ca cần tuyển/i }),
    );
    expect(handle).not.toHaveBeenCalled();
  });
});
