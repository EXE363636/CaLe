/**
 * Admin Account Management + Production Cleanup — task B (client-side surfaces).
 *
 * Các test chạy được LOCAL (Vitest/jsdom) cho phần "xóa dấu vết demo" ở chế độ
 * supabase/production. Data mode được ép qua `NEXT_PUBLIC_DATA_MODE` (đọc runtime
 * bởi isSupabaseEnv()/Footer). Phần server (Edge Function admin-users) có bộ
 * integration riêng: scripts/admin-management-integration.mjs (chạy với Supabase
 * thật sau khi deploy function).
 *
 * Bao phủ (E):
 *   - Không hiện hộp "Tài khoản demo" + email seed + mật khẩu `demo` ở supabase.
 *   - Local mode vẫn giữ nguyên hộp demo (không phá baseline demo).
 *   - Footer supabase: nội dung trung thực (đã lưu trên hệ thống; chưa thu/giữ tiền).
 *   - Trang /employer/payments: supabase không còn "mô phỏng/ký quỹ/MVP".
 *   - NoPaymentNotice hiển thị thông điệp trung thực (thay CTA ví).
 *   - AuthSidePanel supabase không hứa ký quỹ/giải ngân, không "MVP/giả lập".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// Router mock cho các trang client dùng next/navigation (LoginPage).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

import { Footer } from '@/components/layout/Footer';
import EmployerPaymentsPage from '@/app/employer/payments/page';
import { NoPaymentNotice } from '@/components/wallet/NoPaymentNotice';
import { AuthSidePanel } from '@/components/layout/AuthSidePanel';
import LoginPage from '@/app/login/page';

const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');
const lc = (s: string | null | undefined): string => nfc(s).toLowerCase();

function setMode(mode: 'supabase' | 'local') {
  vi.stubEnv('NEXT_PUBLIC_DATA_MODE', mode);
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Login — hộp "Tài khoản demo" + seed credentials
// ---------------------------------------------------------------------------

describe('B1 — login demo box gated by data mode', () => {
  it('supabase: KHÔNG hiện hộp demo, email seed hay mật khẩu demo', () => {
    setMode('supabase');
    const { container } = render(<LoginPage />);
    expect(screen.queryByText('Tài khoản demo')).toBeNull();
    const text = lc(container.textContent);
    expect(text).not.toContain('an.nguyen@gmail.com');
    expect(text).not.toContain('lien@quanphoha.vn');
    expect(text).not.toContain('admin@cale.vn');
    // Không lộ mật khẩu mẫu / nhãn "demo".
    expect(text).not.toContain('demo');
  });

  it('local: VẪN hiện hộp demo (giữ nguyên cho dev/test)', () => {
    setMode('local');
    const { container } = render(<LoginPage />);
    expect(screen.getByText('Tài khoản demo')).toBeInTheDocument();
    expect(lc(container.textContent)).toContain('an.nguyen@gmail.com');
  });
});

// ---------------------------------------------------------------------------
// Footer — nội dung theo data mode
// ---------------------------------------------------------------------------

describe('B5 — footer honest note by data mode', () => {
  it('supabase: nói đã lưu trên hệ thống + tiền thật qua PayOS, không "demo/MVP"', () => {
    setMode('supabase');
    const { container } = render(<Footer />);
    const text = nfc(container.textContent);
    expect(text).toContain('được lưu trên hệ thống');
    expect(text).toContain('giao dịch thật qua cổng thanh toán PayOS');
    expect(lc(text)).not.toContain('mô phỏng');
    expect(lc(text)).not.toContain('mvp');
    expect(lc(text)).not.toContain('dữ liệu demo');
  });

  it('local: giữ ghi chú demo/localStorage như cũ', () => {
    setMode('local');
    const { container } = render(<Footer />);
    const text = nfc(container.textContent);
    expect(text).toContain('Dữ liệu demo đang lưu trên trình duyệt');
  });
});

// ---------------------------------------------------------------------------
// /employer/payments — trang thanh toán
// ---------------------------------------------------------------------------

describe('B4 — /employer/payments content by data mode', () => {
  it('supabase: nội dung trung thực, không "mô phỏng / ký quỹ / MVP / escrow"', () => {
    setMode('supabase');
    const { container } = render(<EmployerPaymentsPage />);
    const text = lc(container.textContent);
    expect(text).toContain('giữ cọc tiền công');
    expect(text).toContain('xác nhận hoàn thành');
    expect(text).not.toContain('mô phỏng');
    expect(text).not.toContain('ký quỹ');
    expect(text).not.toContain('mvp');
    expect(text).not.toContain('escrow');
  });

  it('local: vẫn mô tả mô hình giữ tiền mô phỏng (giữ nguyên cho demo)', () => {
    setMode('local');
    const { container } = render(<EmployerPaymentsPage />);
    expect(lc(container.textContent)).toContain('mô phỏng');
  });
});

// ---------------------------------------------------------------------------
// NoPaymentNotice + AuthSidePanel
// ---------------------------------------------------------------------------

describe('B4 — NoPaymentNotice honest message', () => {
  it('hiển thị thông điệp CaLẻ chưa thu/giữ tiền', () => {
    const { container } = render(<NoPaymentNotice />);
    expect(nfc(container.textContent)).toContain('chưa thu hoặc giữ tiền');
  });
});

describe('B — AuthSidePanel honesty by data mode', () => {
  it('supabase: mô tả giữ cọc thật, không "ký quỹ/giải ngân/MVP/giả lập"', () => {
    setMode('supabase');
    const { container } = render(<AuthSidePanel mode="register" />);
    const text = lc(container.textContent);
    expect(text).not.toContain('giải ngân');
    expect(text).not.toContain('mvp');
    expect(text).not.toContain('giả lập');
    expect(text).toContain('giữ cọc');
    expect(text).not.toContain('mô phỏng');
  });

  it('local: giữ nguyên nội dung dùng thử (MVP)', () => {
    setMode('local');
    const { container } = render(<AuthSidePanel mode="register" />);
    expect(lc(container.textContent)).toContain('mvp');
  });
});
