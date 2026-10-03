import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Thông báo phía server (0031) trong notificationStore: nạp lại thay đúng phần
// server của người dùng, giữ thông báo tạo ở client; đánh dấu đã đọc ghi về server.

const listMyNotifications = vi.fn();
const markMyNotificationsRead = vi.fn();
vi.mock('@/data/repos/notificationRepo', () => ({
  listMyNotifications: (...a: unknown[]) => listMyNotifications(...a),
  markMyNotificationsRead: (...a: unknown[]) => markMyNotificationsRead(...a),
}));

import { useNotificationStore } from '@/stores/notificationStore';

const serverRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'PaymentReviewCredited',
  params: { orderCode: 42, creditedAmount: 49000, note: 'Khớp sao kê' },
  readAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  listMyNotifications.mockReset();
  markMyNotificationsRead.mockReset().mockResolvedValue(undefined);
  useNotificationStore.getState().hydrate([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('notificationStore — thông báo phía server (0031)', () => {
  it('refetchServer: thêm thông báo server, câu chữ tiếng Việt có mã đơn + số tiền + ghi chú', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    const [n] = useNotificationStore.getState().forUser('u1');
    expect(n).toMatchObject({ id: 'server:a', serverId: 'a', source: 'server', kind: 'PaymentReviewCredited', read: false });
    expect(n.body).toContain('#42');
    expect(n.body).toContain('49.000');
    expect(n.body).toContain('Khớp sao kê');
  });

  it('refetchServer: giữ thông báo client, thay phần server cũ (không nhân đôi), bỏ dòng loại lạ', async () => {
    useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 'local', body: '' });
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    listMyNotifications.mockResolvedValue([serverRow('a'), serverRow('b'), serverRow('c', { kind: 'Bogus' })]);
    await useNotificationStore.getState().refetchServer('u1');
    const ids = useNotificationStore.getState().forUser('u1').map((n) => n.id);
    expect(ids.filter((id) => id.startsWith('server:')).sort()).toEqual(['server:a', 'server:b']);
    expect(useNotificationStore.getState().forUser('u1').some((n) => n.title === 'local')).toBe(true);
  });

  it('refetchServer: không đụng thông báo server của người dùng khác', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    listMyNotifications.mockResolvedValue([]);
    await useNotificationStore.getState().refetchServer('u2');
    expect(useNotificationStore.getState().forUser('u1')).toHaveLength(1);
  });

  it('markRead thông báo server → ghi về server đúng id; thông báo client → không gọi server', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    useNotificationStore.getState().markRead('server:a');
    expect(markMyNotificationsRead).toHaveBeenCalledWith(['a']);
    expect(useNotificationStore.getState().forUser('u1')[0].read).toBe(true);

    const local = useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 't', body: '' });
    markMyNotificationsRead.mockClear();
    useNotificationStore.getState().markRead(local.id);
    expect(markMyNotificationsRead).not.toHaveBeenCalled();
  });

  it('markAllRead: có thông báo server chưa đọc → ghi về server (tất cả); không có → không gọi', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a'), serverRow('b', { readAt: '2026-10-01T11:00:00.000Z' })]);
    await useNotificationStore.getState().refetchServer('u1');
    useNotificationStore.getState().markAllRead('u1');
    expect(markMyNotificationsRead).toHaveBeenCalledWith(null);
    expect(useNotificationStore.getState().unreadCount('u1')).toBe(0);

    markMyNotificationsRead.mockClear();
    useNotificationStore.getState().markAllRead('u1');
    expect(markMyNotificationsRead).not.toHaveBeenCalled();
  });

  it('clearServer (đăng xuất / đổi tài khoản): bỏ mọi thông báo server, giữ thông báo client', async () => {
    useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 'local', body: '' });
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    useNotificationStore.getState().clearServer();
    const left = useNotificationStore.getState().notifications;
    expect(left.map((n) => n.title)).toEqual(['local']);
  });

  it('refetchServer: người dùng đã đổi trong lúc chờ RPC → bỏ kết quả (không gắn nhầm người)', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1', () => false);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('ghi đã đọc lên server lỗi → không ném (đã đọc trên máy này)', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    markMyNotificationsRead.mockRejectedValue(new Error('offline'));
    expect(() => useNotificationStore.getState().markRead('server:a')).not.toThrow();
    await Promise.resolve();
  });
});

describe('notificationStore — chế độ supabase: chuông chỉ có thông báo THẬT của người dùng', () => {
  // Ở production, push() chạy trên máy NGƯỜI THAO TÁC (vd. nhà tuyển dụng duyệt đơn →
  // thông báo cho người lao động; admin xử lý → thông báo cho người khác). Lưu lại thì
  // máy này hiện thông báo không ai khác thấy và mất khi tải lại → không được lưu.
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
  });

  it('push() không lưu thông báo tạo ở client (của mình hay của người khác)', () => {
    useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 'mine', body: '' });
    useNotificationStore.getState().push({ userId: 'u2', kind: 'ApplicationApproved', title: 'other', body: '' });
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    expect(useNotificationStore.getState().unreadCount('u1')).toBe(0);
  });

  it('thông báo server vẫn hiện + đếm chưa đọc đúng; push() sau đó không làm lệch số', async () => {
    listMyNotifications.mockResolvedValue([
      serverRow('a'),
      serverRow('b', { readAt: '2026-10-01T11:00:00.000Z' }),
    ]);
    await useNotificationStore.getState().refetchServer('u1');
    useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 'local', body: '' });
    expect(useNotificationStore.getState().forUser('u1').map((n) => n.id).sort()).toEqual([
      'server:a',
      'server:b',
    ]);
    expect(useNotificationStore.getState().unreadCount('u1')).toBe(1);

    useNotificationStore.getState().markRead('server:a');
    expect(markMyNotificationsRead).toHaveBeenCalledWith(['a']);
    expect(useNotificationStore.getState().unreadCount('u1')).toBe(0);
  });

  it('đăng xuất (clearServer) → chuông rỗng', async () => {
    listMyNotifications.mockResolvedValue([serverRow('a')]);
    await useNotificationStore.getState().refetchServer('u1');
    useNotificationStore.getState().clearServer();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('chế độ local giữ nguyên: push() vẫn lưu', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'local');
    useNotificationStore.getState().push({ userId: 'u1', kind: 'UserTopUp', title: 'local', body: '' });
    expect(useNotificationStore.getState().forUser('u1')).toHaveLength(1);
  });
});
