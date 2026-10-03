/**
 * Quy tắc gộp "Hộp thư" của bong bóng hỗ trợ: cuộc trò chuyện (0035) + thông báo.
 *
 * Tránh đếm / liệt kê hai lần một tin chat: thông báo `ChatMessage` mang
 * `dedupeKey` `chat:<applicationId>` (server) hoặc `chat:<applicationId>:<msgId>`
 * (demo). Nếu cuộc trò chuyện của đơn đó đã có trong danh sách `threads` (dòng
 * chat đã hiện số chưa đọc + tin cuối), thông báo đó bị ẩn khỏi mục "Thông báo"
 * và không cộng vào số trên nút. Chưa nạp được cuộc trò chuyện (vd. lỗi mạng) →
 * thông báo chat vẫn hiện như mọi thông báo khác, không bị mất.
 *
 * Logic thuần (không React) để nút tròn và tab dùng chung một cách đếm.
 */

import type { ChatThread, Notification } from '@/types';

/** Số thông báo gần nhất hiện trong hộp thư (giống chuông). */
export const INBOX_NOTIFICATION_LIMIT = 10;

/** applicationId của một thông báo chat, hoặc null. */
export function chatApplicationIdOf(n: Notification): string | null {
  if (n.kind !== 'ChatMessage' || !n.dedupeKey?.startsWith('chat:')) return null;
  const id = n.dedupeKey.split(':')[1];
  return id ? id : null;
}

/** Thông báo của `userId` cho hộp thư (bỏ thông báo chat trùng dòng chat), mới → cũ. */
export function inboxNotifications(
  all: readonly Notification[],
  userId: string | null,
  threads: readonly ChatThread[],
): Notification[] {
  if (!userId) return [];
  const threadApps = new Set(threads.map((th) => th.applicationId));
  return all
    .filter((n) => {
      if (n.userId !== userId) return false;
      const appId = chatApplicationIdOf(n);
      return !(appId && threadApps.has(appId));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Số trên nút tròn / tab hộp thư = tin chat chưa đọc + thông báo chưa đọc (không trùng). */
export function inboxUnreadCount(
  all: readonly Notification[],
  userId: string | null,
  threads: readonly ChatThread[],
): number {
  if (!userId) return 0;
  const chat = threads.reduce((sum, th) => sum + (th.unread > 0 ? th.unread : 0), 0);
  const notes = inboxNotifications(all, userId, threads).filter((n) => !n.read).length;
  return chat + notes;
}
