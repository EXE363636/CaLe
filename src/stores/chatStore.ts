/**
 * Chat người lao động ↔ nhà tuyển dụng — mỗi ĐƠN ỨNG TUYỂN một cuộc trò chuyện
 * (kế hoạch duyệt 02/10, migration 0035).
 *
 * Hai chế độ, cùng một interface cho UI:
 *   - supabase (production): RPC qua `data/repos/chatRepo`; tin mới qua kênh
 *     Realtime riêng tư `chat:<applicationId>` — sự kiện chỉ là tín hiệu để nạp
 *     lại trang mới nhất (gộp theo id). Đăng ký kênh khi mở khung chat, huỷ khi
 *     đóng / đăng xuất / đổi tài khoản (`clear`).
 *   - local / demo: tin lưu localStorage (`cale.chatMessages`, `cale.chatReads`),
 *     áp đúng luật của `domain/chat.ts` + giới hạn tốc độ như server, và đẩy
 *     một thông báo cho người kia qua `notificationStore`.
 *
 * Không polling, không setInterval: tin mới ở production đến qua Realtime; ở
 * demo người kia chỉ thấy tin khi đăng nhập lại (cùng trình duyệt).
 *
 * Nhận `userId` từ người gọi (UI đọc `authStore`) để không import vòng
 * `authStore` ↔ `chatStore` (authStore gọi `clear()` khi đăng xuất).
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import {
  CHAT_PAGE_SIZE,
  listChatMessages,
  listChatThreads,
  markChatRead,
  reportChatMessage,
  sendChatMessage,
  subscribeChat,
} from '@/data/repos/chatRepo';
import { getDataMode } from '@/data/supabaseClient';
import { chatAccess, validateChatMessage } from '@/domain/chat';
import { tCurrent } from '@/i18n/locale';
import { newPrefixedId } from '@/lib/ids';
import { resolveNotificationTarget } from '@/lib/notificationTarget';
import { asEmployer, asWorker, useUserStore } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import type { Application, ChatMessage, ChatRead, ChatThread, Shift } from '@/types';

export type ChatResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Giống server (0035): ≤ 20 tin / phút, ≤ 300 tin / ngày mỗi người. */
export const CHAT_RATE_PER_MINUTE = 20;
export const CHAT_RATE_PER_DAY = 300;
export const CHAT_REPORT_REASON_MAX = 500;

interface ChatStore {
  /** local/demo — mọi tin đã lưu (mọi người dùng trên trình duyệt này). */
  localMessages: ChatMessage[];
  /** local/demo — lần đọc cuối. */
  localReads: ChatRead[];

  /** Cuộc trò chuyện của người dùng hiện tại (badge chưa đọc). */
  threads: ChatThread[];
  /** Tin đã tải của từng cuộc, CŨ → MỚI. */
  messagesByApplication: Record<string, ChatMessage[]>;
  hasMoreByApplication: Record<string, boolean>;
  loadingByApplication: Record<string, boolean>;
  /** Mã lỗi lần tải gần nhất (null = ổn). */
  errorByApplication: Record<string, string | null>;

  hydrate(messages: ChatMessage[], reads: ChatRead[]): void;
  loadThreads(userId: string, isCurrent?: () => boolean): Promise<void>;
  /** Tải tin mới nhất + đánh dấu đã đọc + (supabase) nghe tin mới. */
  openThread(applicationId: string, userId: string): Promise<ChatResult<void>>;
  /** Ngừng nghe tin mới của cuộc này (đóng khung chat). */
  closeThread(applicationId: string): void;
  loadOlder(applicationId: string): Promise<ChatResult<void>>;
  send(applicationId: string, userId: string, body: string): Promise<ChatResult<ChatMessage>>;
  report(
    applicationId: string,
    messageId: string,
    userId: string,
    reason: string,
  ): Promise<ChatResult<void>>;
  /** Huỷ mọi kênh + xoá tin trong bộ nhớ (đăng xuất / đổi tài khoản). */
  clear(): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isServer = (): boolean => getDataMode() === 'supabase';
const nowIso = (): string => new Date().toISOString();
/** Chỉ nhận mã lỗi dạng `MA_LOI` của RPC; chi tiết nội bộ (Postgres / mạng) → BACKEND_ERROR. */
const errCode = (e: unknown): string =>
  e instanceof Error && /^[A-Z][A-Z_]*$/.test(e.message) ? e.message : 'BACKEND_ERROR';

/**
 * Phiên dữ liệu: `clear()` (đăng xuất / đổi tài khoản) tăng số phiên. Mọi việc
 * bất đồng bộ chụp số phiên lúc bắt đầu và bỏ kết quả nếu phiên đã đổi → kết quả
 * về muộn của tài khoản cũ không ghi lại vào bộ nhớ (rà soát bảo mật client).
 */
let epoch = 0;

/** Thứ tự hiển thị: cũ → mới theo (createdAt, id) — khớp keyset của server. */
function byTime(a: ChatMessage, b: ChatMessage): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (ta !== tb) return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Gộp theo id (bản mới thắng), sắp cũ → mới. */
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(byTime);
}

/** Kênh Realtime đang mở, theo applicationId. */
const subscriptions = new Map<string, () => void>();

function unsubscribeAll(): void {
  for (const off of subscriptions.values()) off();
  subscriptions.clear();
}

function persistLocal(messages: ChatMessage[], reads: ChatRead[]): void {
  write(STORAGE_KEYS.chatMessages, messages);
  write(STORAGE_KEYS.chatReads, reads);
}

interface LocalContext {
  app: Application;
  shift: Shift;
  party: 'worker' | 'employer';
}

/** Local: đơn + ca + vai trò của `userId` trong cuộc, hoặc null (không phải hai bên). */
function localContext(applicationId: string, userId: string): LocalContext | null {
  const app = useApplicationStore.getState().applications.find((a) => a.id === applicationId);
  if (!app) return null;
  const shift = useShiftStore.getState().getById(app.shiftId);
  if (!shift) return null;
  if (app.workerId === userId) return { app, shift, party: 'worker' };
  if (shift.employerId === userId) return { app, shift, party: 'employer' };
  return null;
}

function localUnread(
  messages: ChatMessage[],
  reads: ChatRead[],
  applicationId: string,
  userId: string,
): number {
  const last = reads.find((r) => r.applicationId === applicationId && r.userId === userId)?.lastReadAt;
  const lastMs = last ? Date.parse(last) : -Infinity;
  return messages.filter(
    (m) =>
      m.applicationId === applicationId &&
      m.senderId !== userId &&
      Date.parse(m.createdAt) > lastMs,
  ).length;
}

/** Local: dựng danh sách cuộc trò chuyện như `get_chat_threads()`. */
function localThreads(userId: string, messages: ChatMessage[], reads: ChatRead[]): ChatThread[] {
  const now = nowIso();
  const users = useUserStore.getState();
  const out: ChatThread[] = [];
  for (const app of useApplicationStore.getState().applications) {
    const ctx = localContext(app.id, userId);
    if (!ctx) continue;
    const access = chatAccess(ctx.app, ctx.shift, now);
    if (access === 'none') continue;
    const msgs = messages.filter((m) => m.applicationId === app.id).sort(byTime);
    const last = msgs[msgs.length - 1];
    if (!last && access !== 'open') continue;
    const otherUserId = ctx.party === 'worker' ? ctx.shift.employerId : ctx.app.workerId;
    const other = users.findById(otherUserId);
    const otherName =
      ctx.party === 'worker'
        ? (asEmployer(other)?.companyName ?? '')
        : (asWorker(other)?.fullName ?? '');
    out.push({
      applicationId: app.id,
      shiftId: ctx.shift.id,
      shiftTitle: ctx.shift.title,
      shiftDate: ctx.shift.date,
      otherUserId,
      otherName,
      myRole: ctx.party,
      access,
      lastBody: last?.body,
      lastAt: last?.createdAt,
      lastSenderId: last?.senderId,
      unread: localUnread(messages, reads, app.id, userId),
    });
  }
  return out.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}

function withRead(reads: ChatRead[], applicationId: string, userId: string, at: string): ChatRead[] {
  const rest = reads.filter((r) => !(r.applicationId === applicationId && r.userId === userId));
  return [...rest, { applicationId, userId, lastReadAt: at }];
}

/** Local: một thông báo chưa đọc mỗi cuộc cho người nhận (tin mới mở lại khi đã đọc). */
function notifyOtherParty(ctx: LocalContext, messageId: string): void {
  const recipientId = ctx.party === 'worker' ? ctx.shift.employerId : ctx.app.workerId;
  const recipientRole = ctx.party === 'worker' ? 'employer' : 'worker';
  const key = `chat:${ctx.app.id}`;
  const store = useNotificationStore.getState();
  const hasUnread = store.notifications.some(
    (n) =>
      n.userId === recipientId &&
      !n.read &&
      !!n.dedupeKey &&
      (n.dedupeKey === key || n.dedupeKey.startsWith(`${key}:`)),
  );
  if (hasUnread) return;
  const values = (s: string) => s.replace('{shiftTitle}', () => ctx.shift.title);
  store.push({
    userId: recipientId,
    kind: 'ChatMessage',
    title: values(tCurrent('notification.chat.title')),
    body: tCurrent(
      ctx.party === 'worker' ? 'notification.chat.body.fromWorker' : 'notification.chat.body.fromEmployer',
    ),
    link: resolveNotificationTarget(
      { kind: 'ChatMessage', shiftId: ctx.shift.id, applicationId: ctx.app.id },
      recipientRole,
    ),
    dedupeKey: `${key}:${messageId}`,
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>((set, get) => {
  const setFor = <K extends 'messagesByApplication' | 'hasMoreByApplication' | 'loadingByApplication' | 'errorByApplication'>(
    key: K,
    applicationId: string,
    value: ChatStore[K][string],
  ) => set({ [key]: { ...get()[key], [applicationId]: value } } as unknown as Pick<ChatStore, K>);

  const zeroUnread = (applicationId: string) =>
    set({
      threads: get().threads.map((t) => (t.applicationId === applicationId ? { ...t, unread: 0 } : t)),
    });

  /** Supabase: nạp trang mới nhất, gộp vào tin đã có (bỏ qua nếu đã đổi phiên). */
  async function refreshNewest(applicationId: string): Promise<ChatMessage[]> {
    const my = epoch;
    const rows = await listChatMessages(applicationId);
    if (my !== epoch) return rows;
    const merged = mergeMessages(get().messagesByApplication[applicationId] ?? [], rows);
    setFor('messagesByApplication', applicationId, merged);
    if (get().hasMoreByApplication[applicationId] === undefined) {
      setFor('hasMoreByApplication', applicationId, rows.length >= CHAT_PAGE_SIZE);
    }
    return rows;
  }

  /** Supabase: tín hiệu Realtime → nạp lại + (đang mở) đánh dấu đã đọc. */
  async function onSignal(applicationId: string, userId: string): Promise<void> {
    const my = epoch;
    try {
      await refreshNewest(applicationId);
      if (my !== epoch || !subscriptions.has(applicationId)) return;
      await markChatRead(applicationId);
      if (my !== epoch) return;
      zeroUnread(applicationId);
      useNotificationStore.getState().markReadByDedupeKey(userId, `chat:${applicationId}`);
    } catch {
      /* lần mở / tín hiệu sau thử lại */
    }
  }

  return {
    localMessages: [],
    localReads: [],
    threads: [],
    messagesByApplication: {},
    hasMoreByApplication: {},
    loadingByApplication: {},
    errorByApplication: {},

    hydrate(messages, reads) {
      set({
        localMessages: Array.isArray(messages) ? messages : [],
        localReads: Array.isArray(reads) ? reads : [],
      });
    },

    async loadThreads(userId, isCurrent = () => true) {
      if (isServer()) {
        const my = epoch;
        const threads = await listChatThreads();
        if (my !== epoch || !isCurrent()) return;
        set({ threads });
        return;
      }
      set({ threads: localThreads(userId, get().localMessages, get().localReads) });
    },

    async openThread(applicationId, userId) {
      if (!isServer()) {
        const ctx = localContext(applicationId, userId);
        if (!ctx || chatAccess(ctx.app, ctx.shift, nowIso()) === 'none') {
          setFor('errorByApplication', applicationId, 'CHAT_NOT_AVAILABLE');
          return { ok: false, error: 'CHAT_NOT_AVAILABLE' };
        }
        const msgs = get().localMessages.filter((m) => m.applicationId === applicationId).sort(byTime);
        const reads = withRead(get().localReads, applicationId, userId, nowIso());
        set({
          localReads: reads,
          messagesByApplication: { ...get().messagesByApplication, [applicationId]: msgs },
          hasMoreByApplication: { ...get().hasMoreByApplication, [applicationId]: false },
          errorByApplication: { ...get().errorByApplication, [applicationId]: null },
        });
        persistLocal(get().localMessages, reads);
        useNotificationStore.getState().markReadByDedupeKey(userId, `chat:${applicationId}`);
        set({ threads: localThreads(userId, get().localMessages, reads) });
        return { ok: true, value: undefined };
      }

      if (!subscriptions.has(applicationId)) {
        subscriptions.set(
          applicationId,
          subscribeChat(applicationId, () => void onSignal(applicationId, userId)),
        );
      }
      const my = epoch;
      setFor('loadingByApplication', applicationId, true);
      setFor('errorByApplication', applicationId, null);
      try {
        const rows = await refreshNewest(applicationId);
        if (my !== epoch) return { ok: false, error: 'NOT_AUTHENTICATED' };
        setFor('hasMoreByApplication', applicationId, rows.length >= CHAT_PAGE_SIZE);
      } catch (e) {
        if (my !== epoch) return { ok: false, error: 'NOT_AUTHENTICATED' };
        const code = errCode(e);
        if (code === 'CHAT_NOT_AVAILABLE') {
          // Mất quyền (vd. bị khoá): bỏ tin cũ trong bộ nhớ + huỷ kênh.
          const messages = { ...get().messagesByApplication };
          const hasMore = { ...get().hasMoreByApplication };
          delete messages[applicationId];
          delete hasMore[applicationId];
          set({ messagesByApplication: messages, hasMoreByApplication: hasMore });
          get().closeThread(applicationId);
        }
        setFor('loadingByApplication', applicationId, false);
        setFor('errorByApplication', applicationId, code);
        return { ok: false, error: code };
      }
      setFor('loadingByApplication', applicationId, false);
      try {
        await markChatRead(applicationId);
        if (my !== epoch) return { ok: false, error: 'NOT_AUTHENTICATED' };
        zeroUnread(applicationId);
        useNotificationStore.getState().markReadByDedupeKey(userId, `chat:${applicationId}`);
      } catch {
        /* đọc được tin là đủ; đánh dấu đã đọc thử lại lần sau */
      }
      return { ok: true, value: undefined };
    },

    closeThread(applicationId) {
      const off = subscriptions.get(applicationId);
      if (off) {
        off();
        subscriptions.delete(applicationId);
      }
    },

    async loadOlder(applicationId) {
      if (!isServer()) return { ok: true, value: undefined };
      const current = get().messagesByApplication[applicationId] ?? [];
      const oldest = current[0];
      if (!oldest) return { ok: true, value: undefined };
      const my = epoch;
      setFor('loadingByApplication', applicationId, true);
      try {
        const rows = await listChatMessages(applicationId, { createdAt: oldest.createdAt, id: oldest.id });
        if (my !== epoch) return { ok: false, error: 'NOT_AUTHENTICATED' };
        setFor(
          'messagesByApplication',
          applicationId,
          mergeMessages(get().messagesByApplication[applicationId] ?? [], rows),
        );
        setFor('hasMoreByApplication', applicationId, rows.length >= CHAT_PAGE_SIZE);
        return { ok: true, value: undefined };
      } catch (e) {
        return { ok: false, error: errCode(e) };
      } finally {
        if (my === epoch) setFor('loadingByApplication', applicationId, false);
      }
    },

    async send(applicationId, userId, body) {
      const valid = validateChatMessage(body);
      if (!valid.ok) {
        return { ok: false, error: valid.error === 'EMPTY' ? 'CHAT_EMPTY' : 'CHAT_TOO_LONG' };
      }

      if (isServer()) {
        const my = epoch;
        try {
          const msg = await sendChatMessage(applicationId, valid.value);
          if (my !== epoch) return { ok: true, value: msg };
          setFor(
            'messagesByApplication',
            applicationId,
            mergeMessages(get().messagesByApplication[applicationId] ?? [], [msg]),
          );
          set({
            threads: get().threads.map((t) =>
              t.applicationId === applicationId
                ? { ...t, lastBody: msg.body, lastAt: msg.createdAt, lastSenderId: msg.senderId }
                : t,
            ),
          });
          return { ok: true, value: msg };
        } catch (e) {
          return { ok: false, error: errCode(e) };
        }
      }

      // --- local / demo: cùng luật với server ---------------------------------
      const user = useUserStore.getState().findById(userId);
      if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
      if (user.suspended) return { ok: false, error: 'SUSPENDED' };
      const ctx = localContext(applicationId, userId);
      if (!ctx) return { ok: false, error: 'CHAT_NOT_AVAILABLE' };
      const now = nowIso();
      const access = chatAccess(ctx.app, ctx.shift, now);
      if (access === 'none') return { ok: false, error: 'CHAT_NOT_AVAILABLE' };
      if (access !== 'open') return { ok: false, error: 'CHAT_CLOSED' };
      const nowMs = Date.parse(now);
      const mine = get().localMessages.filter((m) => m.senderId === userId);
      if (mine.filter((m) => nowMs - Date.parse(m.createdAt) < 60_000).length >= CHAT_RATE_PER_MINUTE) {
        return { ok: false, error: 'RATE_LIMITED' };
      }
      if (mine.filter((m) => nowMs - Date.parse(m.createdAt) < 86_400_000).length >= CHAT_RATE_PER_DAY) {
        return { ok: false, error: 'CHAT_DAILY_LIMIT' };
      }

      const msg: ChatMessage = {
        id: newPrefixedId('chat'),
        applicationId,
        senderId: userId,
        body: valid.value,
        createdAt: now,
        reported: false,
      };
      const messages = [...get().localMessages, msg];
      const reads = withRead(get().localReads, applicationId, userId, now);
      set({
        localMessages: messages,
        localReads: reads,
        messagesByApplication: {
          ...get().messagesByApplication,
          [applicationId]: mergeMessages(get().messagesByApplication[applicationId] ?? [], [msg]),
        },
      });
      persistLocal(messages, reads);
      notifyOtherParty(ctx, msg.id);
      set({ threads: localThreads(userId, messages, reads) });
      return { ok: true, value: msg };
    },

    async report(applicationId, messageId, userId, reason) {
      const r = reason.trim();
      if (r === '') return { ok: false, error: 'REASON_REQUIRED' };
      if (r.length > CHAT_REPORT_REASON_MAX) return { ok: false, error: 'FIELD_TOO_LONG' };

      const markReported = (list: ChatMessage[]) =>
        list.map((m) => (m.id === messageId ? { ...m, reported: true } : m));

      if (isServer()) {
        const my = epoch;
        try {
          await reportChatMessage(messageId, r);
        } catch (e) {
          return { ok: false, error: errCode(e) };
        }
        if (my !== epoch) return { ok: true, value: undefined };
        setFor(
          'messagesByApplication',
          applicationId,
          markReported(get().messagesByApplication[applicationId] ?? []),
        );
        return { ok: true, value: undefined };
      }

      const ctx = localContext(applicationId, userId);
      const target = get().localMessages.find((m) => m.id === messageId);
      if (!ctx || !target || target.applicationId !== applicationId) {
        return { ok: false, error: 'CHAT_NOT_AVAILABLE' };
      }
      if (target.senderId === userId) return { ok: false, error: 'CANNOT_REPORT_OWN' };
      // Báo cáo đầu tiên được giữ (như server).
      const messages = target.reportedBy
        ? get().localMessages
        : get().localMessages.map((m) =>
            m.id === messageId ? { ...m, reported: true, reportedBy: userId, reportReason: r } : m,
          );
      set({
        localMessages: messages,
        messagesByApplication: {
          ...get().messagesByApplication,
          [applicationId]: messages.filter((m) => m.applicationId === applicationId).sort(byTime),
        },
      });
      persistLocal(messages, get().localReads);
      return { ok: true, value: undefined };
    },

    clear() {
      epoch += 1;
      unsubscribeAll();
      set({
        threads: [],
        messagesByApplication: {},
        hasMoreByApplication: {},
        loadingByApplication: {},
        errorByApplication: {},
      });
    },
  };
});

/**
 * "Đã báo cáo" chỉ hiện với NGƯỜI BÁO CÁO (0035 sau rà soát bảo mật): server
 * chỉ trả `reported = true` cho tin chính người gọi đã báo cáo; ở demo đối
 * chiếu `reportedBy`. Người gửi tin bị báo cáo không bao giờ thấy nhãn này.
 */
export function isReportedByMe(message: ChatMessage, userId: string): boolean {
  if (message.senderId === userId) return false;
  if (message.reportedBy !== undefined) return message.reportedBy === userId;
  return message.reported;
}
