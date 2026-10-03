/**
 * 0035 — ChatPanel (chế độ local/demo): danh sách tin (role="log"), tin của mình /
 * người kia, ô nhập có nhãn + đếm ký tự, Enter gửi / Shift+Enter không gửi,
 * chỉ đọc, cảnh báo giao dịch ngoài app, báo cáo tin của người kia.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { ChatPanel } from '@/components/chat/ChatPanel';
import { useApplicationStore } from '@/stores/applicationStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import type { Application, ChatMessage, Shift, User } from '@/types';

const WORKER = 'w1';
const EMPLOYER = 'e1';

const msg = (id: string, sender: string, body: string, at: string): ChatMessage => ({
  id,
  applicationId: 'app1',
  senderId: sender,
  body,
  createdAt: at,
  reported: false,
});

function seed(shiftOver: Partial<Shift> = {}, messages: ChatMessage[] = []) {
  useUserStore.getState().hydrate([
    { id: WORKER, role: 'worker', fullName: 'Nguyễn An' },
    { id: EMPLOYER, role: 'employer', companyName: 'Quán Phở Hà' },
  ] as unknown as User[]);
  useShiftStore.getState().hydrate([
    {
      id: 'sh1',
      employerId: EMPLOYER,
      title: 'Phục vụ tiệc',
      date: '2099-01-01',
      startTime: '08:00',
      endTime: '12:00',
      status: 'Published',
      ...shiftOver,
    } as unknown as Shift,
  ]);
  useApplicationStore.getState().hydrateApplications([
    { id: 'app1', shiftId: 'sh1', workerId: WORKER, status: 'Approved' } as unknown as Application,
  ]);
  useChatStore.getState().hydrate(messages, []);
}

async function renderPanel(access: 'open' | 'readonly' = 'open', viewer: 'worker' | 'employer' = 'worker') {
  const userId = viewer === 'worker' ? WORKER : EMPLOYER;
  await act(async () => {
    render(
      <ChatPanel
        applicationId="app1"
        userId={userId}
        viewerRole={viewer}
        access={access}
        otherName={viewer === 'worker' ? 'Quán Phở Hà' : 'Nguyễn An'}
      />,
    );
  });
}

beforeEach(() => {
  window.localStorage.clear();
  useNotificationStore.getState().hydrate([]);
  useChatStore.getState().clear();
});
afterEach(cleanup);

describe('ChatPanel', () => {
  it('trống: lời gợi ý theo vai trò; log có nhãn; ô nhập có nhãn + đếm ký tự', async () => {
    seed();
    await renderPanel('open', 'employer');
    expect(screen.getByRole('log', { name: 'Tin nhắn' })).toBeTruthy();
    expect(screen.getByText(/dặn người lao động giờ đến/)).toBeTruthy();
    const box = screen.getByLabelText('Tin nhắn của bạn');
    fireEvent.change(box, { target: { value: 'Xin chào' } });
    expect(screen.getByText('8/1000 ký tự')).toBeTruthy();
  });

  it('tin của mình / người kia; Enter gửi, Shift+Enter không gửi', async () => {
    seed({}, [msg('m1', EMPLOYER, 'Em đến lúc 7:45 nhé', '2026-10-03T10:00:00.000Z')]);
    await renderPanel();
    const log = screen.getByRole('log');
    expect(within(log).getByText('Em đến lúc 7:45 nhé')).toBeTruthy();
    expect(within(log).getAllByText('Quán Phở Hà').length).toBeGreaterThan(0);

    const box = screen.getByLabelText('Tin nhắn của bạn');
    fireEvent.change(box, { target: { value: 'Dạ vâng' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(useChatStore.getState().localMessages).toHaveLength(1);

    await act(async () => {
      fireEvent.keyDown(box, { key: 'Enter' });
    });
    expect(useChatStore.getState().localMessages).toHaveLength(2);
    expect(within(log).getByText('Dạ vâng')).toBeTruthy();
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('như Messenger: đang đọc tin cũ thì tin mới của người kia không kéo giật xuống, hiện nút "Tin nhắn mới"', async () => {
    const m1 = msg('m1', EMPLOYER, 'Em đến lúc 7:45 nhé', '2026-10-03T10:00:00.000Z');
    seed({}, [m1]);
    await renderPanel();
    const log = screen.getByRole('log');
    Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 300 });
    log.scrollTop = 100;
    fireEvent.scroll(log);

    const m2 = msg('m2', EMPLOYER, 'Nhớ mang áo trắng', '2026-10-03T10:05:00.000Z');
    await act(async () => {
      // Tin mới tới (như nhận qua Realtime).
      useChatStore.setState((st) => ({
        messagesByApplication: { ...st.messagesByApplication, app1: [...(st.messagesByApplication.app1 ?? []), m2] },
      }));
    });
    expect(log.scrollTop).toBe(100);
    const jump = screen.getByRole('button', { name: /Tin nhắn mới/ });
    await act(async () => {
      fireEvent.click(jump);
    });
    expect(screen.queryByRole('button', { name: /Tin nhắn mới/ })).toBeNull();

    // Tin của chính mình: luôn cuộn xuống, không hiện nút.
    log.scrollTop = 100;
    fireEvent.scroll(log);
    const box = screen.getByLabelText('Tin nhắn của bạn');
    fireEvent.change(box, { target: { value: 'Dạ vâng' } });
    await act(async () => {
      fireEvent.keyDown(box, { key: 'Enter' });
    });
    expect(screen.queryByRole('button', { name: /Tin nhắn mới/ })).toBeNull();
  });

  it('chỉ đọc: không có ô nhập, nói rõ cuộc trò chuyện đã đóng', async () => {
    seed({ status: 'Cancelled' }, [msg('m1', EMPLOYER, 'Ca huỷ rồi em', '2026-10-03T10:00:00.000Z')]);
    await renderPanel('readonly');
    expect(screen.queryByLabelText('Tin nhắn của bạn')).toBeNull();
    expect(screen.getByText('Cuộc trò chuyện đã đóng, chỉ xem lại được.')).toBeTruthy();
    expect(screen.getByText('Ca huỷ rồi em')).toBeTruthy();
  });

  it('cảnh báo (không chặn) khi tin có dấu hiệu giao dịch ngoài CaLẻ — không nói "mô phỏng"', async () => {
    seed();
    await renderPanel();
    const box = screen.getByLabelText('Tin nhắn của bạn');
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.change(box, { target: { value: 'Kết bạn zalo 0901 234 567 nhé' } });
    const note = screen.getByRole('note');
    expect(note.textContent).toMatch(/Giữ trao đổi và thanh toán trên CaLẻ/);
    expect(note.textContent).not.toMatch(/mô phỏng/);
    expect((screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('quá 1000 ký tự: báo vượt giới hạn, nút gửi tắt', async () => {
    seed();
    await renderPanel();
    fireEvent.change(screen.getByLabelText('Tin nhắn của bạn'), { target: { value: 'x'.repeat(1001) } });
    expect(screen.getByText(/Vượt quá 1000 ký tự/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('báo cáo tin của người kia: biểu mẫu lý do → "Đã báo cáo"; tin của mình không có nút báo cáo', async () => {
    seed({}, [
      msg('m1', EMPLOYER, 'Chuyển khoản riêng cho anh', '2026-10-03T10:00:00.000Z'),
      msg('m2', WORKER, 'Dạ', '2026-10-03T10:01:00.000Z'),
    ]);
    await renderPanel();
    const reportButtons = screen.getAllByRole('button', { name: /Báo cáo tin nhắn lúc/ });
    expect(reportButtons).toHaveLength(1);
    fireEvent.click(reportButtons[0]);
    const form = screen.getByRole('form', { name: 'Báo cáo tin nhắn' });
    fireEvent.change(within(form).getByLabelText('Lý do báo cáo'), { target: { value: 'Đòi giao dịch ngoài app' } });
    await act(async () => {
      fireEvent.click(within(form).getByRole('button', { name: 'Gửi báo cáo' }));
    });
    expect(screen.queryByRole('form', { name: 'Báo cáo tin nhắn' })).toBeNull();
    expect(screen.getByText('Đã báo cáo')).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /Báo cáo tin nhắn lúc/ })).toHaveLength(0);
  });

  it('người gửi tin bị báo cáo không thấy nhãn "Đã báo cáo"', async () => {
    seed({}, [
      { ...msg('m1', EMPLOYER, 'Tin bị báo cáo', '2026-10-03T10:00:00.000Z'), reported: true, reportedBy: WORKER },
    ]);
    await renderPanel('open', 'employer');
    expect(screen.getByText('Tin bị báo cáo')).toBeTruthy();
    expect(screen.queryByText('Đã báo cáo')).toBeNull();
  });

  it('nội dung là chữ thuần (không render HTML)', async () => {
    seed({}, [msg('m1', EMPLOYER, '<b>đậm</b> https://x.vn', '2026-10-03T10:00:00.000Z')]);
    await renderPanel();
    const log = screen.getByRole('log');
    expect(log.querySelector('b')).toBeNull();
    expect(log.querySelector('a')).toBeNull();
    expect(within(log).getByText('<b>đậm</b> https://x.vn')).toBeTruthy();
  });
});
