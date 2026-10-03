/**
 * Thông báo phía server (migration 0031, bảng `user_notifications`) → thông báo
 * trong app (`Notification`). Server chỉ lưu `kind` + `params`; câu chữ dựng ở
 * client theo mẫu trong `vi.ts` (điền MỘT lượt — ghi chú admin chứa `{amount}`
 * không bị điền tiếp).
 *
 * Đợt 1: kết quả admin xử giao dịch nạp PayOS cần kiểm tra (0029).
 * 0035: tin nhắn chat mới (`ChatMessage`, params applicationId / shiftId /
 * shiftTitle / fromRole) — deeplink mở khung chat qua `resolveNotificationTarget`.
 */

import { fillTemplate } from '@/domain/paymentReview';
import { resolveNotificationTarget } from '@/lib/notificationTarget';
import type { Notification } from '@/types';

export const SERVER_NOTIFICATION_KINDS = [
  'PaymentReviewCredited',
  'PaymentReviewDismissed',
  'ChatMessage',
] as const;
export type ServerNotificationKind = (typeof SERVER_NOTIFICATION_KINDS)[number];

export interface ServerNotificationRow {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFormat {
  /** Tra mẫu câu theo khoá (vi.ts). */
  t: (key: string) => string;
  /** Định dạng tiền (vd. formatVND). */
  money: (amount: number) => string;
}

const KEY_PREFIX: Record<Exclude<ServerNotificationKind, 'ChatMessage'>, string> = {
  PaymentReviewCredited: 'notification.paymentReview.credited',
  PaymentReviewDismissed: 'notification.paymentReview.dismissed',
};

/** Id trong store: tiền tố riêng để không trùng id thông báo tạo ở client. */
export const serverNotificationId = (serverId: string): string => `server:${serverId}`;

const isKind = (v: string): v is ServerNotificationKind =>
  (SERVER_NOTIFICATION_KINDS as readonly string[]).includes(v);

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** null khi loại không biết / dòng hỏng — chuông bỏ qua, không vỡ. */
export function toAppNotification(
  row: ServerNotificationRow,
  userId: string,
  fmt: NotificationFormat,
): Notification | null {
  if (!row.id || !isKind(row.kind)) return null;
  const p = row.params ?? {};
  if (row.kind === 'ChatMessage') return chatNotification(row, userId, fmt);
  const code = toNum(p.orderCode);
  const amount = toNum(p.creditedAmount);
  const values: Record<string, string> = {
    code: code === null ? '' : String(code),
    note: typeof p.note === 'string' ? p.note : '',
  };
  if (amount !== null) values.amount = fmt.money(amount);
  const prefix = KEY_PREFIX[row.kind];
  return {
    id: serverNotificationId(row.id),
    serverId: row.id,
    source: 'server',
    userId,
    kind: row.kind,
    title: fillTemplate(fmt.t(`${prefix}.title`), values),
    body: fillTemplate(fmt.t(`${prefix}.body`), values),
    read: row.readAt !== null,
    createdAt: row.createdAt,
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * 0035 — "Tin nhắn mới về ca {shiftTitle}". Người nhận là phía còn lại của
 * `fromRole`; deeplink theo vai trò người nhận. `dedupeKey` = khoá server
 * (`chat:<applicationId>`) để chatStore đánh dấu đã đọc khi mở cuộc trò chuyện.
 */
function chatNotification(
  row: ServerNotificationRow,
  userId: string,
  fmt: NotificationFormat,
): Notification {
  const p = row.params ?? {};
  // Chỉ nhận id đúng dạng (uuid của server / id demo) trước khi ghép vào đường dẫn.
  const safeId = (v: unknown) => {
    const s = str(v);
    return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : '';
  };
  const applicationId = safeId(p.applicationId);
  const shiftId = safeId(p.shiftId);
  const fromRole = p.fromRole === 'worker' || p.fromRole === 'employer' ? p.fromRole : null;
  const recipientRole = fromRole === 'worker' ? 'employer' : fromRole === 'employer' ? 'worker' : undefined;
  const values = { shiftTitle: str(p.shiftTitle) };
  const bodyKey =
    fromRole === 'worker'
      ? 'notification.chat.body.fromWorker'
      : fromRole === 'employer'
        ? 'notification.chat.body.fromEmployer'
        : 'notification.chat.body.generic';
  return {
    id: serverNotificationId(row.id),
    serverId: row.id,
    source: 'server',
    userId,
    kind: 'ChatMessage',
    title: fillTemplate(fmt.t('notification.chat.title'), values),
    body: fillTemplate(fmt.t(bodyKey), values),
    link: resolveNotificationTarget({ kind: 'ChatMessage', shiftId, applicationId }, recipientRole),
    dedupeKey: applicationId ? `chat:${applicationId}` : undefined,
    read: row.readAt !== null,
    createdAt: row.createdAt,
  };
}
