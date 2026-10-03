/**
 * 03/10 — chuông thông báo ở production (supabase): hiện cho người đã đăng nhập,
 * chỉ có thông báo phía server (0031: kết quả kiểm tra giao dịch nạp) của chính
 * người đó; danh sách rỗng nói rõ "chưa có thông báo" (không phải "chưa có dữ liệu").
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const nav = vi.hoisted(() => ({ pathname: '/worker/dashboard', push: (() => undefined) as (href: string) => void }));
const listMyNotifications = vi.fn();
const markMyNotificationsRead = vi.fn();
vi.mock('@/data/repos/notificationRepo', () => ({
  listMyNotifications: (...a: unknown[]) => listMyNotifications(...a),
  markMyNotificationsRead: (...a: unknown[]) => markMyNotificationsRead(...a),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: (href: string) => nav.push(href), replace: vi.fn() }),
}));

import { NotificationBell } from '@/components/layout/NotificationBell';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/types';

const nfc = (s: string | null | undefined) => (s ?? '').normalize('NFC');

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
  listMyNotifications.mockReset();
  markMyNotificationsRead.mockReset().mockResolvedValue(undefined);
  useNotificationStore.getState().hydrate([]);
  useAuthStore.setState({ currentUserId: 'u1' });
  nav.pathname = '/worker/dashboard';
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ currentUserId: null });
  vi.unstubAllEnvs();
});

const openBell = () => fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }));

describe('NotificationBell — production (supabase)', () => {
  it('không có thông báo → không có số chưa đọc; mở ra nói "Chưa có thông báo nào."', () => {
    // Thao tác trên máy này (vd. duyệt đơn cho người khác) không được hiện trong chuông.
    useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 'local', body: '' });
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: 'Thông báo' });
    expect(nfc(bell.textContent)).toBe('');
    openBell();
    expect(nfc(screen.getByRole('dialog', { name: 'Thông báo' }).textContent)).toContain(
      'Chưa có thông báo nào.',
    );
  });

  it('thông báo server của mình: số chưa đọc + câu chữ; "Đánh dấu tất cả đã đọc" ghi về server', async () => {
    listMyNotifications.mockResolvedValue([
      {
        id: 'a',
        kind: 'PaymentReviewCredited',
        params: { orderCode: 42, creditedAmount: 49000, note: 'Khớp sao kê' },
        readAt: null,
        createdAt: '2026-10-01T10:00:00.000Z',
      },
    ]);
    await useNotificationStore.getState().refetchServer('u1');
    render(<NotificationBell />);
    expect(nfc(screen.getByRole('button', { name: 'Thông báo' }).textContent)).toBe('1');
    openBell();
    expect(screen.getByRole('button', { name: 'Đã cộng tiền nạp vào ví' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
    expect(markMyNotificationsRead).toHaveBeenCalledWith(null);
    expect(nfc(screen.getByRole('button', { name: 'Thông báo' }).textContent)).toBe('');
  });

  it('bấm thông báo server → mở lịch sử ví trên dashboard đúng vai trò (deeplink)', async () => {
    useUserStore.getState().overlayUser({ id: 'u1', role: 'employer', name: 'NTD' } as unknown as User);
    nav.pathname = '/shifts';
    const pushed: string[] = [];
    nav.push = (href) => pushed.push(href);
    listMyNotifications.mockResolvedValue([
      {
        id: 'b',
        kind: 'PaymentReviewDismissed',
        params: { orderCode: 7, note: 'Không khớp' },
        readAt: null,
        createdAt: '2026-10-01T10:00:00.000Z',
      },
    ]);
    await useNotificationStore.getState().refetchServer('u1');
    render(<NotificationBell />);
    openBell();
    fireEvent.click(screen.getByRole('button', { name: 'Giao dịch nạp đã được xử lý' }));
    expect(pushed).toEqual(['/employer/dashboard?modal=wallet']);
    expect(markMyNotificationsRead).toHaveBeenCalledWith(['b']);
  });
});
