/**
 * Feature: checkpoint-readiness-phase-1, Task 5.9 — render tests for the
 * LandingRoleExperience island (landing integration).
 *
 * Verifies neutral-first behavior, single-role display (never both at
 * once), immediate role switching, correct CTA routes, and absence of
 * /khao-sat. Example-based render tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { LandingRoleExperience } from './LandingRoleExperience';
import { useRoleSelectionStore } from '@/stores/roleSelectionStore';

const WORKER_TITLE = 'Tìm ca làm linh hoạt, nhận lương minh bạch';
const EMPLOYER_TITLE = 'Tuyển người làm ngắn hạn nhanh và an toàn';

function resetStore() {
  window.sessionStorage?.clear?.();
  useRoleSelectionStore.setState({ selectedRole: null, hasHydrated: false });
}

beforeEach(resetStore);
afterEach(() => {
  cleanup();
  resetStore();
});

describe('checkpoint-readiness-phase-1 — <LandingRoleExperience/> (Task 5.9)', () => {
  it('shows the neutral chooser and NEITHER role view on first render', () => {
    render(<LandingRoleExperience />);
    expect(
      screen.getByRole('button', { name: 'Tôi là người lao động' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tôi là nhà tuyển dụng' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(WORKER_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPLOYER_TITLE)).not.toBeInTheDocument();
  });

  it('clicking worker shows ONLY worker content (employer full content absent)', () => {
    render(<LandingRoleExperience />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là người lao động' }));
    expect(screen.getByText(WORKER_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(EMPLOYER_TITLE)).not.toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Tìm ca làm ngay' });
    expect(cta).toHaveAttribute('href', '/shifts');
  });

  it('clicking employer shows ONLY employer content (worker full content absent)', () => {
    render(<LandingRoleExperience />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là nhà tuyển dụng' }));
    expect(screen.getByText(EMPLOYER_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(WORKER_TITLE)).not.toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Đăng ca cần tuyển' });
    expect(cta).toHaveAttribute('href', '/register?role=employer');
  });

  it('switches role immediately without confirmation', () => {
    render(<LandingRoleExperience />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là người lao động' }));
    expect(screen.getByText(WORKER_TITLE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là nhà tuyển dụng' }));
    expect(screen.getByText(EMPLOYER_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(WORKER_TITLE)).not.toBeInTheDocument();
  });

  it('never renders a CTA pointing at /khao-sat', () => {
    render(<LandingRoleExperience />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là người lao động' }));
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toContain('khao-sat');
    }
  });

  it('restores the persisted session role after hydrate (returning visitor)', () => {
    // Simulate a prior selection persisted in this session.
    window.sessionStorage.setItem('cale.session.role', JSON.stringify('employer'));
    render(<LandingRoleExperience />);
    // hydrate() runs in useEffect on mount → employer content shown.
    expect(screen.getByText(EMPLOYER_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(WORKER_TITLE)).not.toBeInTheDocument();
  });
});
