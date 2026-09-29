/**
 * P0 feedback F5 — trang đăng ca chỉ còn MỘT khối tóm tắt tiền (production).
 *
 * Ghim: ở supabase mode, ShiftForm hiện một khối duy nhất gồm tiền công, phí
 * dịch vụ 10%, tổng giữ từ ví và một dòng khi nào đăng / hoàn; ở local/demo
 * (không phí) giữ một dòng số tiền như cũ.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

const h = vi.hoisted(() => ({ supabase: true }));

vi.mock('@/data/supabaseClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/supabaseClient')>();
  return { ...actual, isSupabaseEnv: () => h.supabase };
});

import { ShiftForm } from '@/components/forms/ShiftForm';

const nfc = (s: string | null | undefined) => (s ?? '').normalize('NFC');

// 25.000đ/giờ × 4 giờ × 2 người = 200.000đ tiền công; phí 10% = 20.000đ.
const VALUES = {
  hourlyWage: 25_000,
  startTime: '10:00',
  endTime: '14:00',
  positionsTotal: 2,
};

afterEach(() => {
  cleanup();
  h.supabase = true;
});

describe('ShiftForm — khối tóm tắt tiền (P0 F5)', () => {
  it('supabase: một khối duy nhất với tiền công, phí 10%, tổng giữ từ ví', () => {
    render(<ShiftForm onSubmit={() => {}} initialValues={VALUES} />);
    const blocks = screen.getAllByTestId('shift-form-deposit-summary');
    expect(blocks).toHaveLength(1);
    const text = nfc(blocks[0].textContent);
    expect(text).toContain('Tiền công');
    expect(text).toMatch(/200\.000\s*đ/);
    expect(text).toContain('Phí dịch vụ 10%');
    expect(text).toMatch(/20\.000\s*đ/);
    expect(text).toContain('Tổng giữ từ ví');
    expect(text).toMatch(/220\.000\s*đ/);
    expect(within(blocks[0]).getByText(/hoàn về ví/)).toBeTruthy();
  });

  it('local/demo: không phí → một dòng số tiền như cũ', () => {
    h.supabase = false;
    render(<ShiftForm onSubmit={() => {}} initialValues={VALUES} />);
    const block = screen.getByTestId('shift-form-deposit-summary');
    const text = nfc(block.textContent);
    expect(text).toMatch(/200\.000\s*đ/);
    expect(text).not.toContain('Phí dịch vụ 10%');
  });
});
