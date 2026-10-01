/**
 * Notification store — in-app notifications surfaced on dashboards.
 *
 * Other stores call `push()` for each event in the `NotificationKind`
 * union (Req 18). The unread-count selector backs the badge on the nav
 * bell (Req 18.5).
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { listMyNotifications, markMyNotificationsRead } from '@/data/repos/notificationRepo';
import { toAppNotification } from '@/domain/serverNotification';
import { t } from '@/i18n/vi';
import { formatVND } from '@/lib/format';
import { newPrefixedId } from '@/lib/ids';
import type { Notification } from '@/types';

interface NotificationStore {
  notifications: Notification[];

  /**
   * Push a new notification. The store fills in `id`, `createdAt`, and
   * `read = false`; callers supply `userId`, `kind`, pre-localized `title`
   * and `body`, and an optional `link`.
   */
  push(input: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification;
  markRead(id: string): void;
  markAllRead(userId: string): void;

  forUser(userId: string): Notification[];
  unreadCount(userId: string): number;

  /** Hydrate the slice from a persisted snapshot. */
  hydrate(notifications: Notification[]): void;

  /**
   * 0031 (chế độ supabase) — nạp thông báo phía server của `userId`, thay phần
   * server cũ của người đó; thông báo tạo ở client giữ nguyên. Ném khi RPC lỗi
   * (người gọi tự bỏ qua). Gọi lúc boot + khi quay lại tab, không polling.
   * `isCurrent`: kiểm lại sau khi RPC trả về — người dùng đã đổi (đăng xuất /
   * đổi tài khoản giữa chừng) thì bỏ kết quả, không gắn thông báo nhầm người.
   */
  refetchServer(userId: string, isCurrent?: () => boolean): Promise<void>;

  /** Bỏ mọi thông báo server khỏi bộ nhớ (đăng xuất / đổi tài khoản). */
  clearServer(): void;
}

// Thông báo server không ghi localStorage: nguồn sự thật là server.
function persist(notifications: Notification[]): void {
  write(
    STORAGE_KEYS.notifications,
    notifications.filter((n) => n.source !== 'server'),
  );
}

// Đã đọc trên máy này dù ghi về server lỗi; lần nạp sau server trả lại trạng thái thật.
function syncReadToServer(ids: string[] | null): void {
  void markMyNotificationsRead(ids).catch(() => undefined);
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  push(input) {
    // CORE-STABILITY-6 Part 2 — idempotent push. When the caller
    // supplies a `dedupeKey`, skip creating a new notification if one
    // with the same `(userId, dedupeKey)` already exists. This makes
    // repeated `runLifecycleSync` / AppHydrator boots safe: the
    // end-of-shift / no-check-in notice (and any keyed event) is
    // emitted at most once per recipient + transition.
    if (input.dedupeKey) {
      const existing = get().notifications.find(
        (n) => n.userId === input.userId && n.dedupeKey === input.dedupeKey,
      );
      if (existing) return existing;
    }
    const created: Notification = {
      ...input,
      id: newPrefixedId('notif'),
      createdAt: new Date().toISOString(),
      read: false,
    };
    const next = [created, ...get().notifications];
    set({ notifications: next });
    persist(next);
    return created;
  },

  markRead(id) {
    const target = get().notifications.find((n) => n.id === id);
    if (target?.source === 'server' && target.serverId && !target.read) {
      syncReadToServer([target.serverId]);
    }
    const next = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    set({ notifications: next });
    persist(next);
  },

  markAllRead(userId) {
    if (
      get().notifications.some(
        (n) => n.userId === userId && n.source === 'server' && !n.read,
      )
    ) {
      syncReadToServer(null);
    }
    const next = get().notifications.map((n) =>
      n.userId === userId && !n.read ? { ...n, read: true } : n,
    );
    set({ notifications: next });
    persist(next);
  },

  forUser(userId) {
    return get().notifications.filter((n) => n.userId === userId);
  },

  unreadCount(userId) {
    return get().notifications.reduce(
      (acc, n) => acc + (n.userId === userId && !n.read ? 1 : 0),
      0,
    );
  },

  hydrate(notifications) {
    set({ notifications });
  },

  async refetchServer(userId, isCurrent = () => true) {
    const rows = await listMyNotifications();
    if (!isCurrent()) return;
    const fmt = { t: (key: string) => t(key), money: formatVND };
    const fresh = rows
      .map((r) => toAppNotification(r, userId, fmt))
      .filter((n): n is Notification => n !== null);
    const kept = get().notifications.filter(
      (n) => !(n.userId === userId && n.source === 'server'),
    );
    set({ notifications: [...fresh, ...kept] });
  },

  clearServer() {
    set({ notifications: get().notifications.filter((n) => n.source !== 'server') });
  },
}));
