/**
 * Chat theo đơn ứng tuyển (migration 0035) — chế độ supabase. Chỉ gọi RPC
 * (bảng bật RLS, không cấp quyền bảng cho client); server kiểm quyền, luật
 * mở / đóng, giới hạn tốc độ. Lỗi RPC ném `Error(message)` với `message` là mã
 * lỗi server (CHAT_CLOSED, RATE_LIMITED…) — store chuyển nguyên mã cho
 * `toastFromStoreError`.
 *
 * Tin mới: kênh Realtime riêng tư `chat:<applicationId>`, sự kiện broadcast
 * `chat_message`. Payload CHỈ là tín hiệu để nạp lại qua RPC — không bao giờ
 * hiển thị trường nào từ payload.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/data/supabaseClient';
import type { ChatAccessLevel, ChatMessage, ChatThread } from '@/types';

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const access = (v: unknown): ChatAccessLevel => (v === 'open' || v === 'readonly' ? v : 'none');

export const CHAT_PAGE_SIZE = 50;

function toMessage(r: Row, applicationId: string): ChatMessage {
  return {
    id: str(r.id),
    applicationId,
    senderId: str(r.sender_id),
    body: str(r.body),
    createdAt: str(r.created_at),
    // 0035 (sau rà soát bảo mật): true chỉ khi CHÍNH người gọi đã báo cáo tin này.
    reported: r.reported === true,
  };
}

function toThread(r: Row): ChatThread {
  const unread = typeof r.unread === 'number' ? r.unread : Number(r.unread ?? 0);
  return {
    applicationId: str(r.application_id),
    shiftId: str(r.shift_id),
    shiftTitle: str(r.shift_title),
    shiftDate: str(r.shift_date),
    otherUserId: str(r.other_user_id),
    otherName: str(r.other_name),
    myRole: r.my_role === 'employer' ? 'employer' : 'worker',
    access: access(r.access),
    lastBody: optStr(r.last_body),
    lastAt: optStr(r.last_at),
    lastSenderId: optStr(r.last_sender_id),
    unread: Number.isFinite(unread) ? unread : 0,
  };
}

/** Các cuộc trò chuyện của mình (≤ 100), mới nhất trước. */
export async function listChatThreads(): Promise<ChatThread[]> {
  const { data, error } = await getSupabaseClient().rpc('get_chat_threads');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toThread).filter((t) => t.applicationId !== '');
}

/**
 * Một trang tin, trả về CŨ → MỚI. `before` = tin cũ nhất đang có (phân trang
 * keyset theo `(created_at, id)`); không có → trang mới nhất.
 */
export async function listChatMessages(
  applicationId: string,
  before?: { createdAt: string; id: string },
  limit: number = CHAT_PAGE_SIZE,
): Promise<ChatMessage[]> {
  const { data, error } = await getSupabaseClient().rpc('get_chat_messages', {
    p_application_id: applicationId,
    p_before: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[])
    .map((r) => toMessage(r, applicationId))
    .filter((m) => m.id !== '')
    .reverse();
}

export async function sendChatMessage(applicationId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await getSupabaseClient().rpc('send_chat_message', {
    p_application_id: applicationId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!row) throw new Error('BACKEND_ERROR');
  return toMessage(row, applicationId);
}

export async function markChatRead(applicationId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('mark_chat_read', {
    p_application_id: applicationId,
  });
  if (error) throw new Error(error.message);
}

export async function reportChatMessage(messageId: string, reason: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('report_chat_message', {
    p_message_id: messageId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

/**
 * Nghe tin mới của một cuộc trò chuyện (kênh riêng tư — server chỉ cho hai bên
 * của đơn nhận). `onSignal` được gọi mỗi khi có tin mới; người gọi tự nạp lại
 * qua RPC. Trả về hàm huỷ đăng ký (gọi khi đóng khung chat / đăng xuất).
 */
export function subscribeChat(applicationId: string, onSignal: () => void): () => void {
  const client = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    try {
      // Kênh private cần JWT của phiên hiện tại (supabase-js lấy từ auth).
      await client.realtime.setAuth();
    } catch {
      /* vẫn thử đăng ký; server từ chối nếu thiếu quyền */
    }
    if (cancelled) return;
    channel = client
      .channel(`chat:${applicationId}`, { config: { private: true } })
      .on('broadcast', { event: 'chat_message' }, () => onSignal())
      .subscribe();
  })();

  return () => {
    cancelled = true;
    if (channel) {
      void client.removeChannel(channel).catch(() => undefined);
      channel = null;
    }
  };
}
