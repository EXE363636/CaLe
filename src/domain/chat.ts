/**
 * Chat giữa người lao động và nhà tuyển dụng — mỗi ĐƠN ỨNG TUYỂN một cuộc trò chuyện
 * (kế hoạch duyệt 02/10, migration 0035). Logic thuần, không React / IO; server
 * (0035) kiểm lại đúng các luật này, client dùng để hiện / ẩn ô nhập.
 *
 *   - Mở khi đơn được duyệt và còn giữ chỗ / đã xong; đóng (chỉ đọc) sau 7 ngày kể
 *     từ giờ kết thúc ca, hoặc khi đơn từng được duyệt rồi huỷ / vắng / hết hạn,
 *     hoặc ca bị huỷ. Đơn chưa từng được duyệt: không có cuộc trò chuyện.
 *   - Chỉ chữ, tối đa 1000 ký tự.
 *   - Tin có dấu hiệu giao dịch ngoài app (Zalo, Telegram, chuyển khoản, số tài
 *     khoản / SĐT…) → hiện cảnh báo "giữ giao dịch trên CaLẻ", KHÔNG chặn.
 *
 * Giờ ca tính như `timeGates.ts`: `new Date(\`${date}T${time}:00\`)` (giờ máy).
 */

import type { ApplicationStatus, ShiftStatus } from '@/types';

export const CHAT_MAX_LENGTH = 1000;
export const CHAT_READONLY_AFTER_DAYS = 7;

/** Đơn đang giữ chỗ hoặc đã hoàn thành → được nhắn. */
export const CHAT_OPEN_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  'Approved',
  'CancellationRequested',
  'CheckedIn',
  'CheckedOut',
  'Confirmed',
]);

export type ChatAccess = 'none' | 'open' | 'readonly';

export interface ChatApplicationLike {
  status: ApplicationStatus;
  /** Có giá trị = đơn từng được duyệt (đủ điều kiện có lịch sử trò chuyện). */
  approvedAt?: string;
}

export interface ChatShiftLike {
  date: string;
  endTime: string;
  status: ShiftStatus;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function chatAccess(app: ChatApplicationLike, shift: ChatShiftLike, nowIso: string): ChatAccess {
  const everApproved = CHAT_OPEN_STATUSES.has(app.status) || !!app.approvedAt;
  if (!everApproved) return 'none';
  if (!CHAT_OPEN_STATUSES.has(app.status) || shift.status === 'Cancelled') return 'readonly';
  const endMs = new Date(`${shift.date}T${shift.endTime}:00`).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (Number.isFinite(endMs) && nowMs >= endMs + CHAT_READONLY_AFTER_DAYS * DAY_MS) return 'readonly';
  return 'open';
}

export type ChatMessageError = 'EMPTY' | 'TOO_LONG';

/** Khoảng trắng / xuống dòng / ký tự vô hình hai đầu — khớp `_chat_trim` của 0035. */
const EDGE_BLANK = /^[\s​-‍﻿]+|[\s​-‍﻿]+$/g;

export function validateChatMessage(
  body: string,
): { ok: true; value: string } | { ok: false; error: ChatMessageError } {
  const value = body.replace(EDGE_BLANK, '');
  if (value.length === 0) return { ok: false, error: 'EMPTY' };
  if (value.length > CHAT_MAX_LENGTH) return { ok: false, error: 'TOO_LONG' };
  return { ok: true, value };
}

/** Bỏ dấu tiếng Việt + chữ thường để so từ khoá ("chuyển khoản" = "chuyen khoan"). */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

const OFF_PLATFORM_WORDS = /\b(zalo|tele|telegram|momo|stk|ck|chuyen khoan|so tai khoan|tai khoan ngan hang)\b/;
/** Dãy ≥ 9 chữ số, cho phép một dấu cách / chấm / gạch giữa các nhóm (SĐT, số tài khoản). */
const LONG_NUMBER = /\+?\d(?:[ .-]?\d){8,}/;

export function detectOffPlatformHint(body: string): boolean {
  const f = fold(body);
  return OFF_PLATFORM_WORDS.test(f) || LONG_NUMBER.test(f);
}
