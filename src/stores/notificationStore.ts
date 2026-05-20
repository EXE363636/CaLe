/**
 * Notification store — in-app notifications surfaced on dashboards.
 *
 * Other stores call `push()` for each event in the `NotificationKind`
 * union (Req 18). The unread-count selector backs the badge on the nav
 * bell (Req 18.5).
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
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
}

function persist(notifications: Notification[]): void {
  write(STORAGE_KEYS.notifications, notifications);
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  push(input) {
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
    const next = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    set({ notifications: next });
    persist(next);
  },

  markAllRead(userId) {
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
}));
