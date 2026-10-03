/**
 * Bong bóng hỗ trợ (04/10): mở / đóng / Escape / trả tiêu điểm; trợ lý trả lời
 * từ kho (kho nhỏ truyền qua props); không trả lời được → kênh liên hệ (Facebook,
 * Zalo, hotline), không có Telegram; khách chỉ thấy 2 tab, đã đăng nhập thấy 3
 * (hộp thư: cuộc trò chuyện + thông báo, bấm thông báo → đánh dấu đã đọc + điều
 * hướng); ẩn ở /login; lịch sử giữ trong sessionStorage.
 *
 * Vòng "trợ lý khôn" (04/10): hỏi lại khi mơ hồ, dữ liệu cá nhân, nhiều câu trong một
 * tin, câu nối tiếp, "Đúng ý" / "Chưa đúng", ba chấm "đang trả lời", mở từ ngoài
 * (`openSupportBubble`), kênh liên hệ không cắt chữ.
 *
 * Mặc định giả lập `prefers-reduced-motion: reduce` → trả lời ngay (không chờ ba chấm);
 * test ba chấm tự tắt giả lập này và dùng đồng hồ giả.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

const nav = vi.hoisted(() => ({ pathname: '/', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { SupportBubble } from '@/components/support/SupportBubble';
import { SUPPORT_CHAT_STORAGE_KEY } from '@/components/support/SupportAssistant';
import { SupportContacts } from '@/components/support/SupportContacts';
import { openSupportBubble } from '@/components/support/supportBubbleEvents';
import { SUPPORT_KB } from '@/data/supportKb';
import { inboxUnreadCount } from '@/components/support/inboxRules';
import type { SupportEntry } from '@/domain/supportBot';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useWalletStore } from '@/stores/walletStore';
import type { Application, ChatThread, Notification, Shift, User, WalletLedgerEntry } from '@/types';

const KB: SupportEntry[] = [
  {
    id: 'withdraw',
    roles: ['worker'],
    questions: { vi: ['Rút tiền về ngân hàng thế nào?'], en: ['How do I withdraw money?'] },
    keywords: ['rut tien', 'withdraw', 'ngan hang'],
    answer: { vi: 'Vào Ví rồi chọn Rút tiền.', en: 'Open Wallet, then Withdraw.' },
    links: [{ href: '/worker/dashboard', label: { vi: 'Mở bảng điều khiển', en: 'Open dashboard' } }],
  },
  {
    id: 'cancel',
    questions: { vi: ['Huỷ ca có bị trừ điểm uy tín không?'], en: ['Does cancelling a shift cost reputation?'] },
    keywords: ['huy ca', 'tru diem', 'cancel shift'],
    answer: { vi: 'Huỷ sớm thì không bị trừ điểm.', en: 'Cancelling early costs nothing.' },
  },
];
const SUGGESTIONS = { worker: ['withdraw'], employer: ['cancel'], guest: ['withdraw', 'cancel'] };

async function renderBubble() {
  await act(async () => {
    render(<SupportBubble kb={KB} suggestions={SUGGESTIONS} />);
  });
}

const originalLoadThreads = useChatStore.getState().loadThreads;

function bubbleButton() {
  return screen.getByRole('button', { name: /Mở hỗ trợ CaLẻ|Đóng hỗ trợ/ });
}

async function openBubble() {
  await act(async () => {
    fireEvent.click(bubbleButton());
  });
  return screen.getByRole('dialog', { name: 'Hỗ trợ CaLẻ' });
}

async function ask(question: string) {
  const input = screen.getByLabelText('Câu hỏi của bạn');
  await act(async () => {
    fireEvent.change(input, { target: { value: question } });
    fireEvent.submit(input.closest('form')!);
  });
}

function login(id: string, role: 'worker' | 'employer') {
  useUserStore.getState().hydrate([
    role === 'worker'
      ? { id, role, fullName: 'Nguyễn An', email: 'an@example.com' }
      : { id, role, companyName: 'Quán Phở Hà', email: 'pho@example.com' },
  ] as unknown as User[]);
  useAuthStore.setState({ currentUserId: id });
}

const originalMatchMedia = window.matchMedia;
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Bubble với kho hỏi đáp thật (các hành vi "khôn" phụ thuộc kho). */
async function renderRealBubble() {
  await act(async () => {
    render(<SupportBubble />);
  });
}

function lastBotReply(): HTMLElement {
  const items = screen.getByRole('log').querySelectorAll<HTMLElement>('li[data-bot-kind]');
  return items[items.length - 1];
}

beforeEach(() => {
  setReducedMotion(true);
  nav.pathname = '/';
  nav.push.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
  useAuthStore.setState({ currentUserId: null });
  useNotificationStore.getState().hydrate([]);
  useChatStore.getState().clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  useChatStore.setState({ loadThreads: originalLoadThreads });
});

describe('SupportBubble — mở / đóng', () => {
  it('nút có nhãn + aria-expanded; mở → tiêu điểm vào tab; Escape → đóng, tiêu điểm về nút', async () => {
    await renderBubble();
    const button = bubbleButton();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const dialog = await openBubble();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(dialog).toHaveAttribute('aria-modal', 'false');
    const assistantTab = screen.getByRole('tab', { name: 'Hỏi CaLẻ' });
    expect(assistantTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(assistantTab);

    await act(async () => {
      fireEvent.keyDown(assistantTab, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('nút đóng trong khung cũng trả tiêu điểm về nút tròn', async () => {
    await renderBubble();
    const dialog = await openBubble();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng hỗ trợ' }));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bubbleButton());
  });

  it('phím mũi tên chuyển tab', async () => {
    await renderBubble();
    await openBubble();
    const assistantTab = screen.getByRole('tab', { name: 'Hỏi CaLẻ' });
    await act(async () => {
      fireEvent.keyDown(assistantTab, { key: 'ArrowRight' });
    });
    const contactTab = screen.getByRole('tab', { name: 'Liên hệ' });
    expect(contactTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(contactTab);
    await act(async () => {
      fireEvent.keyDown(contactTab, { key: 'ArrowRight' });
    });
    expect(screen.getByRole('tab', { name: 'Hỏi CaLẻ' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ẩn ở /login, /register, /forgot-password', async () => {
    for (const path of ['/login', '/register', '/forgot-password']) {
      nav.pathname = path;
      await renderBubble();
      expect(screen.queryByRole('button', { name: /hỗ trợ/ })).toBeNull();
      cleanup();
    }
  });
});

describe('SupportBubble — trợ lý "Hỏi CaLẻ"', () => {
  it('lời chào + câu gợi ý theo vai trò; bấm gợi ý → hỏi và trả lời kèm liên kết', async () => {
    await renderBubble();
    await openBubble();
    const log = screen.getByRole('log', { name: 'Cuộc trò chuyện với trợ lý CaLẻ' });
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(within(log).getByText(/trợ lý tự động của CaLẻ/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(within(log).getByRole('button', { name: 'Rút tiền về ngân hàng thế nào?' }));
    });
    expect(within(log).getByText(/vào Ví rồi chọn Rút tiền./)).toBeTruthy();
    expect(within(log).getByRole('link', { name: 'Mở bảng điều khiển' })).toHaveAttribute('href', '/worker/dashboard');
  });

  it('gõ câu hỏi → bong bóng người dùng + câu trả lời; có ghi chú phạm vi', async () => {
    await renderBubble();
    await openBubble();
    expect(screen.getByText(/chỉ trả lời câu hỏi về CaLẻ/)).toBeTruthy();
    await ask('rut tien the nao');
    expect(screen.getByText('rut tien the nao')).toBeTruthy();
    expect(screen.getByText(/vào Ví rồi chọn Rút tiền./)).toBeTruthy();
    expect((screen.getByLabelText('Câu hỏi của bạn') as HTMLInputElement).value).toBe('');
    expect(screen.getByLabelText('Câu hỏi của bạn')).toHaveAttribute('maxLength', '300');
  });

  it('không hiểu → xin lỗi + kênh liên hệ (Facebook, Zalo, hotline); không có Telegram', async () => {
    await renderBubble();
    await openBubble();
    await ask('thời tiết hôm nay thế nào');
    const log = screen.getByRole('log');
    expect(within(log).getByText(/xin lỗi bạn, mình chưa hiểu/)).toBeTruthy();
    const links = within(log).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('tel:0868325698');
    expect(links).toContain('https://www.facebook.com/profile.php?id=61594143497455');
    expect(links).toContain('https://zalo.me/0868325698');
    expect(links.some((h) => h?.startsWith('mailto:nguyenphuonganh98113@gmail.com?subject='))).toBe(true);
    const fb = within(log).getByRole('link', { name: /Facebook/ });
    expect(fb).toHaveAttribute('target', '_blank');
    expect(fb).toHaveAttribute('rel', 'noopener noreferrer');
    expect(document.body.innerHTML.toLowerCase()).not.toContain('telegram');
  });

  it('"gặp người thật" → kênh liên hệ', async () => {
    await renderBubble();
    await openBubble();
    await ask('cho mình gặp người thật');
    expect(within(screen.getByRole('log')).getByRole('link', { name: /Zalo/ })).toBeTruthy();
  });

  it('lịch sử giữ trong sessionStorage; "Xoá cuộc trò chuyện" xoá hết', async () => {
    await renderBubble();
    await openBubble();
    await ask('rút tiền thế nào');
    expect(window.sessionStorage.getItem(SUPPORT_CHAT_STORAGE_KEY)).toContain('rút tiền thế nào');
    cleanup();

    await renderBubble();
    await openBubble();
    expect(screen.getByText('rút tiền thế nào')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xoá cuộc trò chuyện' }));
    });
    expect(screen.queryByText('rút tiền thế nào')).toBeNull();
    expect(window.sessionStorage.getItem(SUPPORT_CHAT_STORAGE_KEY)).toBeNull();
  });

  it('sessionStorage hỏng / bị chặn không làm vỡ khung', async () => {
    window.sessionStorage.setItem(SUPPORT_CHAT_STORAGE_KEY, '{not json');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      await renderBubble();
      await openBubble();
      await ask('rút tiền thế nào');
      expect(screen.getByText(/vào Ví rồi chọn Rút tiền./)).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('SupportBubble — tab theo đăng nhập', () => {
  it('khách: đúng 2 tab (Hỏi CaLẻ, Liên hệ), không có hộp thư', async () => {
    await renderBubble();
    await openBubble();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hỏi CaLẻ', 'Liên hệ']);
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Liên hệ' }));
    });
    const panel = screen.getByRole('tabpanel', { name: 'Liên hệ' });
    expect(within(panel).getByRole('link', { name: /Hotline/ })).toHaveAttribute('href', 'tel:0868325698');
    const ticket = within(panel).getByRole('link', { name: /Gửi phiếu hỗ trợ/ });
    expect(decodeURIComponent(ticket.getAttribute('href')!)).toContain('[CaLẻ] Yêu cầu hỗ trợ');
    expect(decodeURIComponent(ticket.getAttribute('href')!)).toContain('Trang: /');
    expect(document.body.innerHTML.toLowerCase()).not.toContain('telegram');
  });

  it('đã đăng nhập: 3 tab; hộp thư có cuộc trò chuyện + thông báo; bấm thông báo → đã đọc + điều hướng', async () => {
    login('w1', 'worker');
    useChatStore.setState({
      threads: [
        {
          applicationId: 'app1',
          shiftId: 'sh1',
          shiftTitle: 'Phục vụ tiệc',
          shiftDate: '2099-01-01',
          otherUserId: 'e1',
          otherName: 'Quán Phở Hà',
          myRole: 'worker',
          access: 'open',
          lastBody: 'Nhớ mang đồng phục nhé',
          lastAt: '2099-01-01T01:00:00.000Z',
          lastSenderId: 'e1',
          unread: 2,
        },
      ],
    });
    // loadThreads (demo) tính lại từ store đơn / ca — giữ nguyên danh sách đã đặt.
    useChatStore.setState({ loadThreads: vi.fn().mockResolvedValue(undefined) });
    useNotificationStore.getState().hydrate([
      {
        id: 'n1',
        userId: 'w1',
        kind: 'ApplicationApproved',
        title: 'Đơn ứng tuyển đã được duyệt',
        body: 'Bạn đã được nhận vào ca Phục vụ tiệc.',
        link: '/shifts/sh1',
        read: false,
        createdAt: '2099-01-01T00:00:00.000Z',
      },
      // Thông báo chat của cuộc đã có dòng chat → không liệt kê / đếm lại.
      {
        id: 'n2',
        userId: 'w1',
        kind: 'ChatMessage',
        title: 'Tin nhắn mới về Phục vụ tiệc',
        body: 'Nhà tuyển dụng vừa nhắn cho bạn.',
        link: '/shifts/sh1?chat=1',
        read: false,
        createdAt: '2099-01-01T01:00:00.000Z',
        dedupeKey: 'chat:app1:m1',
      },
    ] as Notification[]);

    await renderBubble();
    // 2 tin chat + 1 thông báo (thông báo chat trùng không cộng).
    expect(bubbleButton()).toHaveAccessibleName('Mở hỗ trợ CaLẻ, 3 tin chưa đọc');
    await openBubble();
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('id')?.split('-tab-')[1])).toEqual([
      'assistant',
      'inbox',
      'contact',
    ]);
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /Hộp thư/ }));
    });
    const panel = screen.getByRole('tabpanel', { name: /Hộp thư/ });
    const thread = within(panel).getByRole('link', { name: /Quán Phở Hà/ });
    expect(thread).toHaveAttribute('href', '/shifts/sh1?chat=1');
    expect(thread.textContent).toContain('Phục vụ tiệc');
    expect(thread.textContent).toContain('2 tin chưa đọc');
    expect(within(panel).queryByText('Tin nhắn mới về Phục vụ tiệc')).toBeNull();

    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Đơn ứng tuyển đã được duyệt' }));
    });
    expect(useNotificationStore.getState().notifications.find((n) => n.id === 'n1')?.read).toBe(true);
    expect(nav.push).toHaveBeenCalledWith('/shifts/sh1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('nhà tuyển dụng: dòng chat mở /employer/shifts/{id}?chat={applicationId}', async () => {
    login('e1', 'employer');
    const loadSpy = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({
      loadThreads: loadSpy,
      threads: [
        {
          applicationId: 'app9',
          shiftId: 'sh9',
          shiftTitle: 'Kho vận',
          shiftDate: '2099-01-01',
          otherUserId: 'w9',
          otherName: 'Trần Bình',
          myRole: 'employer',
          access: 'readonly',
          unread: 0,
        },
      ] as ChatThread[],
    });
    await renderBubble();
    await openBubble();
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /Hộp thư/ }));
    });
    expect(screen.getByRole('link', { name: /Trần Bình/ })).toHaveAttribute('href', '/employer/shifts/sh9?chat=app9');
    expect(screen.getByText('Chưa có thông báo nào.')).toBeTruthy();
  });
});

describe('inboxUnreadCount', () => {
  const note = (over: Partial<Notification>): Notification => ({
    id: 'n',
    userId: 'u1',
    kind: 'ApplicationApproved',
    title: 't',
    body: 'b',
    read: false,
    createdAt: '2099-01-01T00:00:00.000Z',
    ...over,
  });
  const thread = { applicationId: 'a1', unread: 3 } as ChatThread;

  it('khách = 0; cộng chat + thông báo chưa đọc của đúng người', () => {
    expect(inboxUnreadCount([note({})], null, [thread])).toBe(0);
    expect(inboxUnreadCount([note({}), note({ id: 'x', userId: 'u2' }), note({ id: 'r', read: true })], 'u1', [thread])).toBe(4);
  });

  it('thông báo chat chỉ bị bỏ khi cuộc trò chuyện của nó đã có trong danh sách', () => {
    const chatNote = note({ id: 'c', kind: 'ChatMessage', dedupeKey: 'chat:a1' });
    const otherChat = note({ id: 'd', kind: 'ChatMessage', dedupeKey: 'chat:a2:m1' });
    expect(inboxUnreadCount([chatNote, otherChat], 'u1', [thread])).toBe(3 + 1);
    expect(inboxUnreadCount([chatNote, otherChat], 'u1', [])).toBe(2);
  });
});

describe('SupportBubble — trợ lý khôn', () => {
  it('câu mơ hồ → "Bạn muốn hỏi điều nào?" + nút chọn; bấm → trả lời mục đó', async () => {
    await renderRealBubble();
    await openBubble();
    await ask('cọc');
    const reply = lastBotReply();
    expect(reply).toHaveAttribute('data-bot-kind', 'clarify');
    expect(within(reply).getByText('Bạn muốn hỏi điều nào?')).toBeTruthy();
    const options = within(reply).getAllByRole('button');
    expect(options.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      fireEvent.click(options[0]);
    });
    expect(lastBotReply()).toHaveAttribute('data-bot-kind', 'answer');
  });

  it('nhiều câu trong một tin → hai câu trả lời trong cùng một lượt', async () => {
    await renderRealBubble();
    await openBubble();
    await ask('rút tiền thế nào? rút có mất phí không?');
    const reply = lastBotReply();
    expect(reply).toHaveAttribute('data-bot-kind', 'answer');
    expect(reply.querySelectorAll('[data-also-entry]').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('log').querySelectorAll('li[data-bot-kind]')).toHaveLength(1);
  });

  it('câu nối tiếp "bao lâu thì về?" sau câu rút tiền → thời gian rút tiền', async () => {
    await renderRealBubble();
    await openBubble();
    await ask('rút tiền về ngân hàng thế nào');
    await ask('bao lâu thì về?');
    const expected = SUPPORT_KB.find((e) => e.id === 'wallet-withdraw-time')!.answer.vi;
    expect(within(lastBotReply()).getByText(expected.trim().slice(0, 40), { exact: false })).toBeTruthy();
  });

  it('khách hỏi số dư → mời đăng nhập (liên kết /login), không có số', async () => {
    await renderRealBubble();
    await openBubble();
    await ask('số dư của tôi còn bao nhiêu');
    const reply = lastBotReply();
    expect(reply).toHaveAttribute('data-bot-kind', 'personal');
    expect(within(reply).getAllByRole('link').some((a) => a.getAttribute('href') === '/login')).toBe(true);
  });

  it('người lao động đã đăng nhập: số dư (sổ cái demo) + ca tiếp theo có liên kết', async () => {
    login('w1', 'worker');
    useShiftStore.getState().hydrate([
      {
        id: 'sh1',
        employerId: 'e1',
        title: 'Phục vụ tiệc cưới',
        date: '2099-01-01',
        startTime: '18:00',
        endTime: '22:00',
        status: 'Published',
      } as unknown as Shift,
    ]);
    useApplicationStore
      .getState()
      .hydrateApplications([{ id: 'a1', shiftId: 'sh1', workerId: 'w1', status: 'Approved' } as unknown as Application]);
    useWalletStore.getState().hydrate([], [
      { id: 'l1', occurredAt: '2026-01-01T00:00:00.000Z', userId: 'w1', kind: 'TopUp', amount: 1_250_000 } as unknown as WalletLedgerEntry,
      { id: 'l2', occurredAt: '2026-01-01T00:00:00.000Z', userId: 'w2', kind: 'TopUp', amount: 7_000_000 } as unknown as WalletLedgerEntry,
    ]);
    useChatStore.setState({ loadThreads: vi.fn().mockResolvedValue(undefined) });
    await renderRealBubble();
    await openBubble();
    // Lời chào gọi tên.
    expect(within(screen.getByRole('log')).getByText(/An/)).toBeTruthy();

    await ask('số dư của tôi còn bao nhiêu');
    expect(lastBotReply()).toHaveAttribute('data-bot-kind', 'personal');
    expect(lastBotReply().textContent).toContain('1.250.000đ');
    expect(lastBotReply().textContent).not.toContain('7.000.000');

    await ask('ca tiếp theo của mình là khi nào');
    const next = lastBotReply();
    expect(next.textContent).toContain('Phục vụ tiệc cưới');
    expect(within(next).getAllByRole('link').some((a) => a.getAttribute('href') === '/shifts/sh1')).toBe(true);
  });

  it('"Đúng ý" → "Cảm ơn bạn!", hết nút; "Chưa đúng" → xin lỗi + gợi ý khác + liên hệ', async () => {
    await renderRealBubble();
    await openBubble();
    await ask('rút tiền về ngân hàng thế nào');
    let reply = lastBotReply();
    await act(async () => {
      fireEvent.click(within(reply).getByRole('button', { name: /Đúng ý/ }));
    });
    expect(within(reply).getByText('Cảm ơn bạn!')).toBeTruthy();
    expect(within(reply).queryByRole('button', { name: /Đúng ý|Chưa đúng/ })).toBeNull();

    await ask('quên mật khẩu đăng nhập');
    reply = lastBotReply();
    await act(async () => {
      fireEvent.click(within(reply).getByRole('button', { name: /Chưa đúng/ }));
    });
    expect(within(reply).getByRole('button', { name: /Chưa đúng/ })).toBeDisabled();
    expect(within(reply).getByRole('button', { name: /Đúng ý/ })).toBeDisabled();
    const apology = lastBotReply();
    expect(apology).not.toBe(reply);
    expect(apology).toHaveAttribute('data-bot-kind', 'smalltalk');
    expect(within(apology).getAllByRole('link').some((a) => a.getAttribute('href') === 'tel:0868325698')).toBe(true);

    // Phản hồi được lưu (bản v2).
    const stored = JSON.parse(window.sessionStorage.getItem(SUPPORT_CHAT_STORAGE_KEY)!);
    expect(stored.v).toBe(2);
    expect(stored.messages.filter((m: { bot?: { feedback?: string } }) => m.bot?.feedback)).toHaveLength(2);
  });

  it('lịch sử bản v1 cũ bị bỏ qua an toàn', async () => {
    window.sessionStorage.setItem(
      SUPPORT_CHAT_STORAGE_KEY,
      JSON.stringify({ v: 1, owner: '', messages: [{ id: 'x', from: 'user', text: 'câu cũ v1' }] }),
    );
    await renderBubble();
    await openBubble();
    expect(screen.queryByText('câu cũ v1')).toBeNull();
  });

  it('ba chấm "đang trả lời" hiện trước, rồi mới có câu trả lời; gửi tiếp khi đang chờ → hiện ngay câu trước', async () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    await renderBubble();
    await openBubble();
    await ask('rút tiền thế nào');
    const log = screen.getByRole('log');
    const typing = log.querySelector('li[data-typing]');
    expect(typing).not.toBeNull();
    expect(typing).toHaveAttribute('aria-hidden', 'true');
    expect(within(log).queryByText(/vào Ví rồi chọn Rút tiền./)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(log.querySelector('li[data-typing]')).toBeNull();
    expect(within(log).getByText(/vào Ví rồi chọn Rút tiền./)).toBeTruthy();

    // Gửi hai câu liền nhau: câu trả lời thứ nhất hiện ngay khi gửi câu thứ hai.
    await ask('huỷ ca có bị trừ điểm không');
    await ask('rút tiền thế nào');
    expect(within(log).getByText(/huỷ sớm thì không bị trừ điểm./)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(within(log).getAllByText(/vào Ví rồi chọn Rút tiền./)).toHaveLength(2);
  });
});

describe('openSupportBubble', () => {
  it('mở tab Liên hệ; khách yêu cầu "Hộp thư" → tab Hỏi CaLẻ', async () => {
    await renderBubble();
    await act(async () => {
      openSupportBubble({ tab: 'contact' });
    });
    expect(screen.getByRole('dialog', { name: 'Hỗ trợ CaLẻ' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Liên hệ' })).toHaveAttribute('aria-selected', 'true');
    await act(async () => {
      openSupportBubble({ tab: 'inbox' });
    });
    expect(screen.getByRole('tab', { name: 'Hỏi CaLẻ' })).toHaveAttribute('aria-selected', 'true');
  });

  it('người đã đăng nhập: mở thẳng Hộp thư', async () => {
    login('w1', 'worker');
    useChatStore.setState({ loadThreads: vi.fn().mockResolvedValue(undefined) });
    await renderBubble();
    await act(async () => {
      openSupportBubble({ tab: 'inbox' });
    });
    expect(screen.getByRole('tab', { name: /Hộp thư/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ask: mở + hỏi luôn (cắt khoảng trắng, tối đa 300 ký tự)', async () => {
    await renderBubble();
    await act(async () => {
      openSupportBubble({ tab: 'contact', ask: '   rút tiền thế nào   ' });
    });
    expect(screen.getByRole('tab', { name: 'Hỏi CaLẻ' })).toHaveAttribute('aria-selected', 'true');
    const log = screen.getByRole('log');
    expect(within(log).getByText('rút tiền thế nào')).toBeTruthy();
    expect(within(log).getByText(/vào Ví rồi chọn Rút tiền./)).toBeTruthy();

    await act(async () => {
      openSupportBubble({ ask: 'x'.repeat(400) });
    });
    expect(within(log).getByText('x'.repeat(300))).toBeTruthy();
  });

  it('không có window (server) → không làm gì, không ném lỗi', () => {
    const original = globalThis.window;
    // @ts-expect-error — giả lập môi trường server
    delete globalThis.window;
    try {
      expect(() => openSupportBubble({ ask: 'x' })).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});

describe('SupportContacts — không cắt chữ', () => {
  it.each([false, true])('compact=%s: không có truncate / line-clamp, số hotline hiện đủ', async (compact) => {
    await act(async () => {
      render(<SupportContacts compact={compact} />);
    });
    const list = screen.getByRole('list', { name: 'Kênh liên hệ' });
    expect(list.querySelector('[class*="truncate"], [class*="line-clamp"], [class*="text-ellipsis"]')).toBeNull();
    expect(list.className).not.toMatch(/grid-cols-2/);
    expect(within(list).getByText('0868325698')).toBeTruthy();
    expect(within(list).getByText('Nhắn tin qua Facebook')).toBeTruthy();
    expect(within(list).getAllByRole('link')).toHaveLength(4);
  });
});

describe('Chuyển cho người thật có ngữ cảnh', () => {
  it('phiếu hỗ trợ dưới câu "không hiểu" điền sẵn câu đã hỏi; tab Liên hệ điền câu gần nhất', async () => {
    await renderBubble();
    await openBubble();
    await ask('thời tiết hôm nay thế nào');
    const ticket = within(lastBotReply()).getByRole('link', { name: /Gửi phiếu hỗ trợ/ });
    expect(decodeURIComponent(ticket.getAttribute('href')!)).toContain('thời tiết hôm nay thế nào');

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Liên hệ' }));
    });
    const panel = screen.getByRole('tabpanel', { name: 'Liên hệ' });
    const tabTicket = within(panel).getByRole('link', { name: /Gửi phiếu hỗ trợ/ });
    expect(decodeURIComponent(tabTicket.getAttribute('href')!)).toContain('thời tiết hôm nay thế nào');
  });

  it('không hiểu lần thứ hai liên tiếp → câu khác, khuyên liên hệ đội hỗ trợ', async () => {
    await renderRealBubble();
    await openBubble();
    await ask('asdkjh qwe');
    const first = lastBotReply();
    expect(first).toHaveAttribute('data-bot-kind', 'fallback');
    await ask('zzz qqq');
    const second = lastBotReply();
    expect(second).toHaveAttribute('data-bot-kind', 'fallback');
    const text = (el: HTMLElement) => el.querySelector('div div')?.textContent ?? '';
    expect(text(second)).not.toBe(text(first));
    expect(text(second).toLowerCase()).toContain('đội hỗ trợ');
  });
});
