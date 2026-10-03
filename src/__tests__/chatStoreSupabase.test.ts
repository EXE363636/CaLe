/**
 * 0035 — chatStore ở chế độ supabase (client giả): gọi RPC đúng tên / tham số
 * (keyset `p_before` + `p_before_id`), nghe kênh Realtime riêng tư khi mở, nạp
 * lại khi có tín hiệu (gộp theo id, không đọc payload), huỷ kênh khi đóng /
 * `clear()` (đăng xuất), chuyển nguyên mã lỗi server.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (payload: unknown) => void;

type RpcFn = (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

const h = vi.hoisted(() => ({
  rpc: null as unknown as import('vitest').Mock<RpcFn>,
  setAuth: null as unknown as import('vitest').Mock<(token?: string | null) => Promise<void>>,
  channels: [] as Array<{
    topic: string;
    opts: unknown;
    handlers: Array<{ type: string; filter: unknown; cb: (p: unknown) => void }>;
    subscribed: boolean;
    removed: boolean;
  }>,
}));

vi.mock('@/data/supabaseClient', async (orig) => {
  const actual = await orig<typeof import('@/data/supabaseClient')>();
  return {
    ...actual,
    getDataMode: () => 'supabase',
    isSupabaseEnv: () => true,
    getSupabaseClient: () => ({
      rpc: (name: string, args?: Record<string, unknown>) => h.rpc(name, args),
      realtime: { setAuth: (token?: string | null) => h.setAuth(token) },
      channel: (topic: string, opts: unknown) => {
        const ch = { topic, opts, handlers: [] as Array<{ type: string; filter: unknown; cb: Handler }>, subscribed: false, removed: false };
        h.channels.push(ch);
        const api = {
          on(type: string, filter: unknown, cb: Handler) {
            ch.handlers.push({ type, filter, cb });
            return api;
          },
          subscribe() {
            ch.subscribed = true;
            return api;
          },
          __ch: ch,
        };
        return api;
      },
      removeChannel: async (api: { __ch: { removed: boolean } }) => {
        api.__ch.removed = true;
        return 'ok';
      },
    }),
  };
});

import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';

const row = (id: string, at: string, sender = 'emp', over: Record<string, unknown> = {}) => ({
  id,
  sender_id: sender,
  body: `tin ${id}`,
  created_at: at,
  reported: false,
  ...over,
});

const flush = () => new Promise((r) => setTimeout(r, 0));

let pages: Record<string, unknown[]>;

beforeEach(() => {
  h.channels = [];
  h.setAuth = vi.fn<(token?: string | null) => Promise<void>>().mockResolvedValue(undefined);
  pages = { newest: [row('m2', '2026-10-03T10:00:02Z'), row('m1', '2026-10-03T10:00:01Z')] };
  h.rpc = vi.fn<RpcFn>(async (name, args) => {
    if (name === 'get_chat_messages') {
      return { data: args?.p_before ? pages.older ?? [] : pages.newest, error: null };
    }
    if (name === 'send_chat_message') {
      return { data: [row('m9', '2026-10-03T10:05:00Z', 'me', { body: args?.p_body })], error: null };
    }
    if (name === 'get_chat_threads') {
      return {
        data: [
          {
            application_id: 'app1',
            shift_id: 'sh1',
            shift_title: 'Ca',
            shift_date: '2026-10-04',
            other_user_id: 'emp',
            other_name: 'Quán',
            my_role: 'worker',
            access: 'open',
            last_body: 'x',
            last_at: '2026-10-03T10:00:02Z',
            last_sender_id: 'emp',
            unread: 2,
          },
        ],
        error: null,
      };
    }
    return { data: null, error: null };
  });
  useChatStore.getState().clear();
  useNotificationStore.getState().hydrate([]);
});

describe('chatStore (supabase)', () => {
  it('loadThreads: map hàng RPC → ChatThread; bỏ kết quả khi người dùng đã đổi', async () => {
    await useChatStore.getState().loadThreads('me');
    expect(useChatStore.getState().threads[0]).toMatchObject({
      applicationId: 'app1',
      myRole: 'worker',
      access: 'open',
      unread: 2,
      otherName: 'Quán',
    });
    useChatStore.getState().clear();
    await useChatStore.getState().loadThreads('me', () => false);
    expect(useChatStore.getState().threads).toEqual([]);
  });

  it('openThread: tải trang mới nhất (cũ → mới), đánh dấu đã đọc, đăng ký kênh private chat:<id>', async () => {
    await useChatStore.getState().loadThreads('me');
    useNotificationStore.getState().hydrate([
      { id: 'server:n', serverId: 'n', source: 'server', userId: 'me', kind: 'ChatMessage', title: '', body: '', read: false, createdAt: '', dedupeKey: 'chat:app1' },
    ]);
    const res = await useChatStore.getState().openThread('app1', 'me');
    await flush();
    expect(res.ok).toBe(true);
    expect(useChatStore.getState().messagesByApplication.app1.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(h.rpc).toHaveBeenCalledWith('get_chat_messages', {
      p_application_id: 'app1',
      p_before: null,
      p_before_id: null,
      p_limit: 50,
    });
    expect(h.rpc).toHaveBeenCalledWith('mark_chat_read', { p_application_id: 'app1' });
    expect(useChatStore.getState().threads[0].unread).toBe(0);
    expect(useNotificationStore.getState().unreadCount('me')).toBe(0);

    expect(h.setAuth).toHaveBeenCalled();
    expect(h.channels).toHaveLength(1);
    expect(h.channels[0]).toMatchObject({ topic: 'chat:app1', opts: { config: { private: true } }, subscribed: true });
    expect(h.channels[0].handlers[0]).toMatchObject({ type: 'broadcast', filter: { event: 'chat_message' } });
  });

  it('tín hiệu Realtime → nạp lại trang mới nhất, gộp theo id (không lấy nội dung từ payload)', async () => {
    await useChatStore.getState().openThread('app1', 'me');
    await flush();
    pages.newest = [row('m3', '2026-10-03T10:00:03Z'), row('m2', '2026-10-03T10:00:02Z')];
    h.channels[0].handlers[0].cb({ payload: { id: 'm3', applicationId: 'app1', body: '<b>giả</b>' } });
    await flush();
    await flush();
    const msgs = useChatStore.getState().messagesByApplication.app1;
    expect(msgs.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(msgs[2].body).toBe('tin m3');
  });

  it('loadOlder: keyset theo tin cũ nhất (p_before + p_before_id), thêm vào đầu', async () => {
    pages.newest = Array.from({ length: 50 }, (_, i) =>
      row(`n${String(50 - i).padStart(2, '0')}`, `2026-10-03T10:${String(50 - i).padStart(2, '0')}:00Z`),
    );
    pages.older = [row('o1', '2026-10-03T09:00:00Z')];
    await useChatStore.getState().openThread('app1', 'me');
    expect(useChatStore.getState().hasMoreByApplication.app1).toBe(true);
    const res = await useChatStore.getState().loadOlder('app1');
    expect(res.ok).toBe(true);
    expect(h.rpc).toHaveBeenCalledWith('get_chat_messages', {
      p_application_id: 'app1',
      p_before: '2026-10-03T10:01:00Z',
      p_before_id: 'n01',
      p_limit: 50,
    });
    expect(useChatStore.getState().messagesByApplication.app1[0].id).toBe('o1');
    expect(useChatStore.getState().hasMoreByApplication.app1).toBe(false);
  });

  it('send: kiểm tra phía client trước, gọi RPC, thêm tin; lỗi server chuyển nguyên mã', async () => {
    await useChatStore.getState().openThread('app1', 'me');
    expect(await useChatStore.getState().send('app1', 'me', '  ')).toEqual({ ok: false, error: 'CHAT_EMPTY' });
    const res = await useChatStore.getState().send('app1', 'me', ' Chào anh ');
    expect(res.ok).toBe(true);
    expect(h.rpc).toHaveBeenCalledWith('send_chat_message', { p_application_id: 'app1', p_body: 'Chào anh' });
    expect(useChatStore.getState().messagesByApplication.app1.at(-1)).toMatchObject({ id: 'm9', senderId: 'me' });

    h.rpc.mockResolvedValueOnce({ data: null, error: { message: 'CHAT_CLOSED' } });
    expect(await useChatStore.getState().send('app1', 'me', 'hi')).toEqual({ ok: false, error: 'CHAT_CLOSED' });
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: 'CHAT_DAILY_LIMIT' } });
    expect(await useChatStore.getState().send('app1', 'me', 'hi')).toEqual({ ok: false, error: 'CHAT_DAILY_LIMIT' });
  });

  it('report: RPC report_chat_message, đánh dấu tin đã báo cáo (của tôi)', async () => {
    await useChatStore.getState().openThread('app1', 'me');
    const res = await useChatStore.getState().report('app1', 'm1', 'me', ' Lừa đảo ');
    expect(res.ok).toBe(true);
    expect(h.rpc).toHaveBeenCalledWith('report_chat_message', { p_message_id: 'm1', p_reason: 'Lừa đảo' });
    expect(useChatStore.getState().messagesByApplication.app1.find((m) => m.id === 'm1')?.reported).toBe(true);
  });

  it('openThread lỗi (CHAT_NOT_AVAILABLE) → trả mã lỗi, ghi lỗi tải', async () => {
    h.rpc.mockImplementationOnce(async () => ({ data: null, error: { message: 'CHAT_NOT_AVAILABLE' } }));
    const res = await useChatStore.getState().openThread('appX', 'me');
    expect(res).toEqual({ ok: false, error: 'CHAT_NOT_AVAILABLE' });
    expect(useChatStore.getState().errorByApplication.appX).toBe('CHAT_NOT_AVAILABLE');
  });

  it('closeThread huỷ kênh; clear() (đăng xuất) huỷ mọi kênh + xoá tin trong bộ nhớ', async () => {
    await useChatStore.getState().openThread('app1', 'me');
    await useChatStore.getState().openThread('app2', 'me');
    await flush();
    expect(h.channels).toHaveLength(2);
    useChatStore.getState().closeThread('app1');
    expect(h.channels[0].removed).toBe(true);
    expect(h.channels[1].removed).toBe(false);

    useChatStore.getState().clear();
    expect(h.channels[1].removed).toBe(true);
    expect(useChatStore.getState().messagesByApplication).toEqual({});
    expect(useChatStore.getState().threads).toEqual([]);

    // Mở lại sau khi clear → đăng ký kênh mới.
    await useChatStore.getState().openThread('app1', 'me');
    await flush();
    expect(h.channels).toHaveLength(3);
  });

  it('mở cùng một cuộc hai lần không đăng ký trùng kênh', async () => {
    await useChatStore.getState().openThread('app1', 'me');
    await useChatStore.getState().openThread('app1', 'me');
    await flush();
    expect(h.channels).toHaveLength(1);
  });
});

describe('đăng xuất giữa chừng (rà soát bảo mật client)', () => {
  it('kết quả trả về SAU clear() không ghi lại dữ liệu của tài khoản cũ', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const base = h.rpc.getMockImplementation()!;
    h.rpc.mockImplementation(async (name, args) => {
      if (name === 'get_chat_messages' || name === 'get_chat_threads') await gate;
      return base(name, args);
    });

    const opening = useChatStore.getState().openThread('app1', 'me');
    const listing = useChatStore.getState().loadThreads('me');
    useChatStore.getState().clear();
    release();
    await opening;
    await listing;
    await flush();

    const s = useChatStore.getState();
    expect(s.messagesByApplication).toEqual({});
    expect(s.threads).toEqual([]);
  });

  it('mở cuộc trò chuyện bị từ chối → xoá tin cũ trong bộ nhớ + huỷ kênh', async () => {
    await useChatStore.getState().openThread('app1', 'me');
    expect(useChatStore.getState().messagesByApplication.app1).toHaveLength(2);
    h.rpc.mockImplementation(async () => ({ data: null, error: { message: 'CHAT_NOT_AVAILABLE' } }));
    useChatStore.getState().closeThread('app1');
    const r = await useChatStore.getState().openThread('app1', 'me');
    await flush();
    expect(r).toEqual({ ok: false, error: 'CHAT_NOT_AVAILABLE' });
    expect(useChatStore.getState().messagesByApplication.app1).toBeUndefined();
    expect(h.channels.at(-1)?.removed).toBe(true);
  });

  it('lỗi không phải mã server (chữ thường, chi tiết nội bộ) → BACKEND_ERROR', async () => {
    h.rpc.mockImplementation(async () => ({ data: null, error: { message: 'invalid input syntax for type uuid: "x"' } }));
    const r = await useChatStore.getState().openThread('app1', 'me');
    expect(r).toEqual({ ok: false, error: 'BACKEND_ERROR' });
  });
});
