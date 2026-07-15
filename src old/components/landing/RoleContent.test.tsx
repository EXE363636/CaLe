/**
 * Feature: checkpoint-readiness-phase-1, Task 5.7 / 5.8 — render tests for
 * RoleContent, RoleSwitcher and IndustryFocus.
 *
 * Example-based render tests (not PBT — the disjoint/CTA logic is covered
 * by Property 2 in checkpointReadinessPhase1RoleContent.test.ts).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { RoleContent } from './RoleContent';
import { RoleSwitcher } from './RoleSwitcher';
import { IndustryFocus } from './IndustryFocus';
import { useRoleSelectionStore } from '@/stores/roleSelectionStore';

function resetStore() {
  window.sessionStorage?.clear?.();
  useRoleSelectionStore.setState({ selectedRole: null, hasHydrated: false });
}

afterEach(cleanup);

describe('checkpoint-readiness-phase-1 — <RoleContent/> (Task 5.7)', () => {
  it('renders the neutral intro and NEITHER role view when role is null', () => {
    render(<RoleContent role={null} />);
    expect(screen.getByText('Bạn đến với CaLẻ với vai trò nào?')).toBeInTheDocument();
    // Neither role's distinctive title is shown.
    expect(
      screen.queryByText('Tìm ca làm linh hoạt, nhận lương minh bạch'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Tuyển người làm ngắn hạn nhanh và an toàn'),
    ).not.toBeInTheDocument();
  });

  it('renders ONLY worker content for role="worker"', () => {
    render(<RoleContent role="worker" />);
    expect(
      screen.getByText('Tìm ca làm linh hoạt, nhận lương minh bạch'),
    ).toBeInTheDocument();
    // Employer-only step title must NOT appear.
    expect(
      screen.queryByText('Duyệt ứng viên và xác nhận hoàn thành'),
    ).not.toBeInTheDocument();
    // Worker CTA → /shifts, never /khao-sat.
    const cta = screen.getByRole('link', { name: 'Tìm ca làm ngay' });
    expect(cta).toHaveAttribute('href', '/shifts');
    expect(cta.getAttribute('href')).not.toContain('khao-sat');
  });

  it('renders ONLY employer content for role="employer"', () => {
    render(<RoleContent role="employer" />);
    expect(
      screen.getByText('Tuyển người làm ngắn hạn nhanh và an toàn'),
    ).toBeInTheDocument();
    // Worker-only step description must NOT appear.
    expect(
      screen.queryByText('Lọc ca theo khu vực, thời gian và mức lương phù hợp với bạn.'),
    ).not.toBeInTheDocument();
    // Employer CTA → /register?role=employer, never /khao-sat.
    const cta = screen.getByRole('link', { name: 'Đăng ca cần tuyển' });
    expect(cta).toHaveAttribute('href', '/register?role=employer');
    expect(cta.getAttribute('href')).not.toContain('khao-sat');
    // Employer step 2 wording.
    expect(screen.getByText('Đảm bảo thanh toán')).toBeInTheDocument();
  });
});

describe('checkpoint-readiness-phase-1 — <RoleSwitcher/> (Task 5.7)', () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  it('renders both role choices in the neutral state', () => {
    render(<RoleSwitcher />);
    expect(
      screen.getByRole('button', { name: 'Tôi là người lao động' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tôi là nhà tuyển dụng' }),
    ).toBeInTheDocument();
  });

  it('selecting a role updates the store immediately and marks it active', () => {
    render(<RoleSwitcher />);
    const workerBtn = screen.getByRole('button', { name: 'Tôi là người lao động' });
    fireEvent.click(workerBtn);
    expect(useRoleSelectionStore.getState().selectedRole).toBe('worker');
    expect(workerBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching to the other role updates immediately without confirmation', () => {
    render(<RoleSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là người lao động' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tôi là nhà tuyển dụng' }));
    expect(useRoleSelectionStore.getState().selectedRole).toBe('employer');
  });
});

describe('checkpoint-readiness-phase-1 — <IndustryFocus/> (Task 5.8)', () => {
  it('renders the six focus industries', () => {
    render(<IndustryFocus />);
    for (const name of [
      'Nhà hàng / F&B',
      'Quán café',
      'Sự kiện',
      'Tiệc cưới',
      'Bán lẻ',
      'Kho vận nhẹ',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('frames the list as a focus, not "all industries"', () => {
    render(<IndustryFocus />);
    expect(
      screen.getByText(/tập trung vào các ngành dưới đây thay vì phục vụ mọi ngành/i),
    ).toBeInTheDocument();
  });

  it('renders the remaining items when one entry is blank (partial render)', () => {
    render(
      <IndustryFocus
        industries={[
          { nameKey: 'landing.industry.fnb' },
          { nameKey: '   ' },
          { nameKey: 'landing.industry.retail' },
        ]}
      />,
    );
    expect(screen.getByText('Nhà hàng / F&B')).toBeInTheDocument();
    expect(screen.getByText('Bán lẻ')).toBeInTheDocument();
  });
});
