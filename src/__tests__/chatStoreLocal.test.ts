/**
 * 0035 — chatStore ở chế độ local/demo: cùng luật với server (domain/chat.ts +
 * giới hạn tốc độ), lưu localStorage, thông báo cho người kia (một thông báo
 * chưa đọc mỗi cuộc), deeplink đúng vai trò, "Đã báo cáo" chỉ người báo cáo thấy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/data/persistence';
import { chatLink, resolveNotificationTarget } from '@/lib/notificationTarget';
import { useApplicationStore } from '@/stores/applicationStore';
import { CHAT_RATE_PER_MINUTE, isReportedByMe, mergeMessages, useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import type { Application, ChatMessage, Shift, User } from '@/types';

const WORKER = 'w1';
const EMPLOYER = 'e1';
const OUTSIDER = 'w2';

const users = [
  { id: WORKER, role: 'worker', fullName: 'Nguyễn An', email: 'a@x.vn' },
  { id: OUTSIDER, role: 'worker', fullName: 'Người ngoài', email: 'b@x.vn' },
  { id: EMPLOYER, role: 'employer', companyName: 'Quán Phở Hà', email: 'e@x.vn' },
] as unknown as User[];

function shiftOf(over: Partial<Shift> = {}): Shift {
  return {
    id: 'sh1',
    employerId: EMPLOYER,
    title: 'Phục vụ tiệc',
    date: '2099-01-01',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Published',
    ...over,
  } as unknown as Shift;
}

function appOf(over: Partial<Application> = {}): Application {
  return {
    id: 'app1',
    shiftId: 'sh1',
    workerId: WORKER,
    status: 'Approved',
    approvedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  } as unknown as Application;
}

function seed(shift: Shift = shiftOf(), app: Application = appOf()) {
  useUserStore.getState().hydrate(users);
  useShiftStore.getState().hydrate([shift]);
  useApplicationStore.getState().hydrateApplications([app]);
}

beforeEach(() => {
  window.localStorage.clear();
  useNotificationStore.getState().hydrate([]);
  useChatStore.getState().hydrate([], []);
  useChatStore.getState().clear();
  seed();
});

describe('chatStore (local) — gửi tin', () => {
  it('người lao động gửi: lưu localStorage, hiện trong cuộc, thông báo cho nhà tuyển dụng với link mở đúng đơn', async () => {
    const res = await useChatStore.getState().send('app1', WORKER, '  Mấy giờ em có mặt ạ?  ');
    expect(res.ok).toBe(true);
    const msgs = useChatStore.getState().messagesByApplication.app1;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ senderId: WORKER, body: 'Mấy giờ em có mặt ạ?', reported: false });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.chatMessages) ?? '[]')).toHaveLength(1);

    const notes = useNotificationStore.getState().forUser(EMPLOYER);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ kind: 'ChatMessage', read: false, link: '/employer/shifts/sh1?chat=app1' });
    expect(notes[0].title).toContain('Phục vụ tiệc');
    expect(useNotificationStore.getState().forUser(WORKER)).toHaveLength(0);
  });

  it('một thông báo chưa đọc mỗi cuộc; đọc rồi thì tin mới mở lại thông báo', async () => {
    await useChatStore.getState().send('app1', EMPLOYER, 'Em đến lúc 7:45 nhé');
    await useChatStore.getState().send('app1', EMPLOYER, 'Mặc áo trắng');
    expect(useNotificationStore.getState().unreadCount(WORKER)).toBe(1);
    expect(useNotificationStore.getState().forUser(WORKER)[0].link).toBe('/shifts/sh1?chat=1');

    // Người lao động mở cuộc trò chuyện → đã đọc, thông báo cũng đã đọc.
    await useChatStore.getState().loadThreads(WORKER);
    expect(useChatStore.getState().threads[0]).toMatchObject({ applicationId: 'app1', unread: 2, myRole: 'worker' });
    const opened = await useChatStore.getState().openThread('app1', WORKER);
    expect(opened.ok).toBe(true);
    expect(useNotificationStore.getState().unreadCount(WORKER)).toBe(0);
    expect(useChatStore.getState().threads[0].unread).toBe(0);

    await useChatStore.getState().send('app1', EMPLOYER, 'Nhớ mang giày đen');
    expect(useNotificationStore.getState().unreadCount(WORKER)).toBe(1);
  });

  it('tin rỗng / quá dài bị chặn với mã lỗi như server', async () => {
    expect(await useChatStore.getState().send('app1', WORKER, '   \n ')).toEqual({ ok: false, error: 'CHAT_EMPTY' });
    expect(await useChatStore.getState().send('app1', WORKER, 'x'.repeat(1001))).toEqual({
      ok: false,
      error: 'CHAT_TOO_LONG',
    });
  });

  it('người ngoài đơn / đơn chưa duyệt → CHAT_NOT_AVAILABLE', async () => {
    expect(await useChatStore.getState().send('app1', OUTSIDER, 'hi')).toEqual({
      ok: false,
      error: 'CHAT_NOT_AVAILABLE',
    });
    seed(shiftOf(), appOf({ status: 'Pending', approvedAt: undefined }));
    expect(await useChatStore.getState().send('app1', WORKER, 'hi')).toEqual({
      ok: false,
      error: 'CHAT_NOT_AVAILABLE',
    });
    expect((await useChatStore.getState().openThread('app1', WORKER)).ok).toBe(false);
  });

  it('cuộc đã đóng (ca huỷ / quá 7 ngày sau ca) → CHAT_CLOSED, vẫn xem lại được', async () => {
    seed(shiftOf({ status: 'Cancelled' }));
    expect(await useChatStore.getState().send('app1', WORKER, 'hi')).toEqual({ ok: false, error: 'CHAT_CLOSED' });
    expect((await useChatStore.getState().openThread('app1', WORKER)).ok).toBe(true);

    seed(shiftOf({ date: '2020-01-01' }));
    expect(await useChatStore.getState().send('app1', EMPLOYER, 'hi')).toEqual({ ok: false, error: 'CHAT_CLOSED' });
  });

  it('tài khoản bị khoá → SUSPENDED', async () => {
    useUserStore.getState().hydrate(users.map((u) => (u.id === WORKER ? { ...u, suspended: true } : u)) as User[]);
    expect(await useChatStore.getState().send('app1', WORKER, 'hi')).toEqual({ ok: false, error: 'SUSPENDED' });
  });

  it(`giới hạn ${CHAT_RATE_PER_MINUTE} tin / phút → RATE_LIMITED`, async () => {
    for (let i = 0; i < CHAT_RATE_PER_MINUTE; i++) {
      expect((await useChatStore.getState().send('app1', WORKER, `tin ${i}`)).ok).toBe(true);
    }
    expect(await useChatStore.getState().send('app1', WORKER, 'quá nhanh')).toEqual({
      ok: false,
      error: 'RATE_LIMITED',
    });
  });
});

describe('chatStore (local) — báo cáo', () => {
  it('báo cáo tin của người kia: cần lý do; không báo cáo tin của mình; nhãn chỉ người báo cáo thấy', async () => {
    const sent = await useChatStore.getState().send('app1', EMPLOYER, 'Chuyển khoản riêng cho anh nhé');
    if (!sent.ok) throw new Error('send failed');
    const id = sent.value.id;

    expect(await useChatStore.getState().report('app1', id, WORKER, '  ')).toEqual({
      ok: false,
      error: 'REASON_REQUIRED',
    });
    expect(await useChatStore.getState().report('app1', id, EMPLOYER, 'tự báo cáo')).toEqual({
      ok: false,
      error: 'CANNOT_REPORT_OWN',
    });
    expect((await useChatStore.getState().report('app1', id, WORKER, 'Đòi giao dịch ngoài app')).ok).toBe(true);

    const msg = useChatStore.getState().messagesByApplication.app1.find((m) => m.id === id)!;
    expect(isReportedByMe(msg, WORKER)).toBe(true);
    expect(isReportedByMe(msg, EMPLOYER)).toBe(false);
  });
});

describe('deeplink + gộp tin', () => {
  it('resolveNotificationTarget ChatMessage theo vai trò người nhận; link tường minh vẫn thắng', () => {
    expect(resolveNotificationTarget({ kind: 'ChatMessage', shiftId: 's', applicationId: 'a' }, 'worker')).toBe(
      '/shifts/s?chat=1',
    );
    expect(resolveNotificationTarget({ kind: 'ChatMessage', shiftId: 's', applicationId: 'a' }, 'employer')).toBe(
      '/employer/shifts/s?chat=a',
    );
    expect(resolveNotificationTarget({ kind: 'ChatMessage', shiftId: 's' }, 'admin')).toBeUndefined();
    expect(resolveNotificationTarget({ kind: 'ChatMessage', link: '/x' }, 'worker')).toBe('/x');
    expect(chatLink('employer', 's')).toBe('/employer/shifts/s');
    expect(chatLink('worker', undefined)).toBeUndefined();
  });

  it('mergeMessages: gộp theo id, sắp cũ → mới theo (createdAt, id)', () => {
    const m = (id: string, at: string, body = id): ChatMessage => ({
      id,
      applicationId: 'a',
      senderId: 'u',
      body,
      createdAt: at,
      reported: false,
    });
    const merged = mergeMessages(
      [m('b', '2026-10-03T10:00:01Z'), m('a', '2026-10-03T10:00:00Z')],
      [m('b', '2026-10-03T10:00:01Z', 'mới'), m('c', '2026-10-03T10:00:01Z')],
    );
    expect(merged.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(merged[1].body).toBe('mới');
  });
});

// Đảm bảo không ai bật polling: store không dùng setInterval.
it('không dùng setInterval', async () => {
  const spy = vi.spyOn(globalThis, 'setInterval');
  await useChatStore.getState().send('app1', WORKER, 'hi');
  await useChatStore.getState().openThread('app1', WORKER);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
