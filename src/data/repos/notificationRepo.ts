/**
 * Thông báo phía server (migration 0031). Chỉ đọc / đánh dấu đã đọc thông báo
 * của CHÍNH người dùng qua RPC; server tự ghi thông báo (trigger), client không
 * tạo được.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { ServerNotificationRow } from '@/domain/serverNotification';

type Row = Record<string, unknown>;

/** ≤50 thông báo mới nhất của mình. */
export async function listMyNotifications(): Promise<ServerNotificationRow[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_notifications');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({
    id: typeof r.id === 'string' ? r.id : '',
    kind: typeof r.kind === 'string' ? r.kind : '',
    params: r.params && typeof r.params === 'object' ? (r.params as Record<string, unknown>) : {},
    readAt: typeof r.read_at === 'string' ? r.read_at : null,
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
  }));
}

/** `ids` null → đánh dấu mọi thông báo chưa đọc của mình. */
export async function markMyNotificationsRead(ids: string[] | null): Promise<void> {
  const { error } = await getSupabaseClient().rpc('mark_my_notifications_read', { p_ids: ids });
  if (error) throw new Error(error.message);
}
