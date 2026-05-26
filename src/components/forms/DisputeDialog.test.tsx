/**
 * Phase 10C — `<DisputeDialog/>` tests.
 *
 * UI-only — the store action contract is exercised by
 * `src/__tests__/phase10cDispute.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DisputeDialog, type DisputePayload } from './DisputeDialog';
import {
  EMPLOYER_DISPUTE_CATEGORIES,
  WORKER_DISPUTE_CATEGORIES,
} from '@/types';

function getSubmitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /Gửi khiếu nại/i }) as HTMLButtonElement;
}

describe('<DisputeDialog/> — Phase 10C employer side', () => {
  it('renders all employer-side categories in the picker', () => {
    render(
      <DisputeDialog
        open
        onClose={() => {}}
        side="employer"
        onSubmit={() => {}}
      />,
    );
    const select = screen.getByLabelText(/Loại khiếu nại/i) as HTMLSelectElement;
    const optionValues = Array.from(select.options)
      .map((o) => o.value)
      .filter((v) => v.length > 0);
    expect(optionValues).toEqual([...EMPLOYER_DISPUTE_CATEGORIES]);
  });

  it('renders all worker-side categories when side="worker"', () => {
    render(
      <DisputeDialog
        open
        onClose={() => {}}
        side="worker"
        onSubmit={() => {}}
      />,
    );
    const select = screen.getByLabelText(/Loại khiếu nại/i) as HTMLSelectElement;
    const optionValues = Array.from(select.options)
      .map((o) => o.value)
      .filter((v) => v.length > 0);
    expect(optionValues).toEqual([...WORKER_DISPUTE_CATEGORIES]);
  });

  it('disables submit until category, reason, and evidence description are set', () => {
    render(
      <DisputeDialog
        open
        onClose={() => {}}
        side="employer"
        onSubmit={() => {}}
      />,
    );
    expect(getSubmitButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Loại khiếu nại/i), {
      target: { value: 'NoShow' },
    });
    expect(getSubmitButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Lý do cụ thể/i), {
      target: { value: 'Người làm không tới ca.' },
    });
    expect(getSubmitButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Mô tả bằng chứng/i), {
      target: { value: 'Đã liên hệ nhưng không trả lời.' },
    });
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it('forwards the payload to onSubmit when valid', () => {
    const handle = vi.fn<(p: DisputePayload) => void>();
    render(
      <DisputeDialog
        open
        onClose={() => {}}
        side="employer"
        onSubmit={handle}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Loại khiếu nại/i), {
      target: { value: 'BehaviorIssue' },
    });
    fireEvent.change(screen.getByLabelText(/Lý do cụ thể/i), {
      target: { value: ' cãi với khách ' },
    });
    fireEvent.change(screen.getByLabelText(/Mô tả bằng chứng/i), {
      target: { value: 'Có ghi âm.' },
    });
    fireEvent.change(screen.getByLabelText(/Tệp đính kèm/i), {
      target: { value: 'audio.mp3' },
    });
    fireEvent.click(getSubmitButton());
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0]![0]).toEqual({
      category: 'BehaviorIssue',
      // Trimmed.
      reason: 'cãi với khách',
      evidenceDescription: 'Có ghi âm.',
      evidenceFileName: 'audio.mp3',
    });
  });

  it('blocks an invalid filename with a clear error', () => {
    render(
      <DisputeDialog
        open
        onClose={() => {}}
        side="employer"
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Loại khiếu nại/i), {
      target: { value: 'NoShow' },
    });
    fireEvent.change(screen.getByLabelText(/Lý do cụ thể/i), {
      target: { value: 'reason' },
    });
    fireEvent.change(screen.getByLabelText(/Mô tả bằng chứng/i), {
      target: { value: 'desc' },
    });
    const fileInput = screen.getByLabelText(/Tệp đính kèm/i);
    fireEvent.change(fileInput, { target: { value: '../etc/passwd' } });
    fireEvent.blur(fileInput);
    expect(getSubmitButton()).toBeDisabled();
    expect(
      screen.getByText(/Tên tệp không được chứa ký tự/i),
    ).toBeInTheDocument();
  });

  it('renders a parent-supplied errorMessage as a role="alert"', () => {
    render(
      <DisputeDialog
        open
        onClose={() => {}}
        side="employer"
        onSubmit={() => {}}
        errorMessage="Đã có lỗi từ máy chủ."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Đã có lỗi từ máy chủ.');
  });
});
