import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Bong bóng hỗ trợ (04/10) — chế độ local/demo.
 *
 * Bề mặt (src/components/support/*, gắn ở src/app/layout.tsx):
 *   - Nút tròn góc phải dưới, tên "Mở hỗ trợ CaLẻ" (kèm số chưa đọc nếu có).
 *   - Khung `role="dialog"` "Hỗ trợ CaLẻ", tab "Hỏi CaLẻ" / ("Hộp thư" khi đăng nhập) / "Liên hệ".
 *   - Trợ lý: mỗi câu trả lời là `<li data-bot-kind="answer|smalltalk|fallback">`;
 *     lịch sử giữ trong sessionStorage (`cale.supportChat`).
 *   - Ẩn ở /login, /register, /forgot-password.
 *
 * Kho hỏi đáp (`src/data/supportKb.ts`) đang được mở rộng → spec KHÔNG phụ thuộc
 * câu chữ trả lời, chỉ phụ thuộc loại trả lời (`data-bot-kind`) và mục
 * `wallet-withdraw`.
 */

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 375, height: 812 };

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61594143497455';
const ZALO_URL = 'https://zalo.me/0868325698';
const SUPPORT_EMAIL = 'nguyenphuonganh98113@gmail.com';
const TICKET_SUBJECT = encodeURIComponent('[CaLẻ] Yêu cầu hỗ trợ');

const WITHDRAW_Q = 'rút tiền về ngân hàng thế nào';
const OFF_TOPIC_Q = 'giá vàng hôm nay';

// ---------------------------------------------------------------------------
// Locators / helpers
// ---------------------------------------------------------------------------

function bubbleButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Mở hỗ trợ CaLẻ/ });
}

function panel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Hỗ trợ CaLẻ' });
}

async function openBubble(page: Page): Promise<Locator> {
  const button = bubbleButton(page);
  await expect(button).toBeVisible();
  await button.click();
  const dialog = panel(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Gõ câu hỏi + Enter; trả về tin trả lời mới nhất của trợ lý. */
async function ask(dialog: Locator, question: string): Promise<Locator> {
  const replies = dialog.locator('li[data-bot-kind]');
  const before = await replies.count();
  const input = dialog.getByRole('textbox', { name: 'Câu hỏi của bạn' });
  await input.fill(question);
  await input.press('Enter');
  await expect(replies).toHaveCount(before + 1);
  await expect(input).toHaveValue('');
  return replies.nth(before);
}

function workerNotification(over: Record<string, unknown> = {}) {
  return {
    id: 'e2e-support-note-1',
    userId: ACCOUNTS.worker.id,
    kind: 'ApplicationApproved',
    title: 'Đơn ứng tuyển của bạn đã được duyệt',
    body: 'Xem lịch làm của bạn để chuẩn bị cho ca sắp tới.',
    link: '/worker/schedule',
    read: false,
    createdAt: '2026-10-01T03:00:00.000Z',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// 1. Khách — trợ lý hỏi đáp
// ---------------------------------------------------------------------------

test.describe('Bong bóng hỗ trợ — khách', () => {
  test.use({ viewport: DESKTOP });

  test('nút góc phải dưới; 2 tab; trả lời / dự phòng / chào hỏi; Escape; lưu sau tải lại; xoá', async ({
    page,
    gotoApp,
  }) => {
    await gotoApp('/');

    // Nút tròn ở góc phải dưới.
    const button = bubbleButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeGreaterThan(DESKTOP.width - 48);
    expect(box!.y + box!.height).toBeGreaterThan(DESKTOP.height - 48);

    const dialog = await openBubble(page);
    await expect(bubbleButton(page)).toHaveCount(0); // đổi tên sang "Đóng hỗ trợ"
    await expect(page.getByRole('button', { name: 'Đóng hỗ trợ' }).first()).toBeVisible();

    // Đúng 2 tab cho khách.
    const tabs = dialog.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveText('Hỏi CaLẻ');
    await expect(tabs.nth(1)).toHaveText('Liên hệ');
    await expect(dialog.getByRole('tab', { name: 'Hỏi CaLẻ' })).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.getByRole('tab', { name: 'Hộp thư' })).toHaveCount(0);
    // Mở → tiêu điểm vào tab đang chọn.
    await expect(dialog.getByRole('tab', { name: 'Hỏi CaLẻ' })).toBeFocused();

    // Lời chào + câu gợi ý.
    const log = dialog.getByRole('log', { name: 'Cuộc trò chuyện với trợ lý CaLẻ' });
    await expect(log).toContainText('trợ lý tự động của CaLẻ');
    await expect(log.getByText('Câu hỏi gợi ý')).toBeVisible();
    const welcome = log.locator('li').first();
    expect(await welcome.getByRole('button').count()).toBeGreaterThan(0);

    // Hỏi rút tiền → trả lời từ kho.
    const answer = await ask(dialog, WITHDRAW_Q);
    await expect(answer).toHaveAttribute('data-bot-kind', 'answer');
    await expect(log.getByText(WITHDRAW_Q, { exact: true })).toBeVisible();

    // Câu ngoài lề → nói thật + kênh liên hệ ngay trong câu trả lời.
    const fallback = await ask(dialog, OFF_TOPIC_Q);
    await expect(fallback).toHaveAttribute('data-bot-kind', 'fallback');
    const fb = fallback.locator(`a[href="${FACEBOOK_URL}"]`);
    const zalo = fallback.locator(`a[href="${ZALO_URL}"]`);
    await expect(fb).toBeVisible();
    await expect(zalo).toBeVisible();
    await expect(fb).toHaveAttribute('target', '_blank');
    await expect(zalo).toHaveAttribute('target', '_blank');

    // Chào hỏi → smalltalk.
    const hello = await ask(dialog, 'xin chào');
    await expect(hello).toHaveAttribute('data-bot-kind', 'smalltalk');

    // Escape → đóng, tiêu điểm về nút tròn.
    await dialog.getByRole('textbox', { name: 'Câu hỏi của bạn' }).focus();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await expect(bubbleButton(page)).toBeFocused();
    await expect(bubbleButton(page)).toHaveAttribute('aria-expanded', 'false');

    // Tải lại → cuộc trò chuyện còn (sessionStorage).
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reopened = await openBubble(page);
    const kinds = reopened.locator('li[data-bot-kind]');
    await expect(kinds).toHaveCount(3);
    await expect(kinds.nth(0)).toHaveAttribute('data-bot-kind', 'answer');
    await expect(kinds.nth(1)).toHaveAttribute('data-bot-kind', 'fallback');
    await expect(kinds.nth(2)).toHaveAttribute('data-bot-kind', 'smalltalk');
    await expect(reopened.getByText(WITHDRAW_Q, { exact: true })).toBeVisible();

    // Xoá cuộc trò chuyện → chỉ còn lời chào, sessionStorage sạch.
    await reopened.getByRole('button', { name: 'Xoá cuộc trò chuyện' }).click();
    await expect(kinds).toHaveCount(0);
    await expect(reopened.getByText(WITHDRAW_Q, { exact: true })).toHaveCount(0);
    await expect(reopened.getByRole('button', { name: 'Xoá cuộc trò chuyện' })).toHaveCount(0);
    await expect(reopened.getByRole('log')).toContainText('trợ lý tự động của CaLẻ');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('cale.supportChat')))
      .toBeNull();

    // Tải lại lần nữa → vẫn trống.
    await page.reload();
    await page.waitForLoadState('networkidle');
    const again = await openBubble(page);
    await expect(again.getByRole('log')).toContainText('trợ lý tự động của CaLẻ');
    await expect(again.locator('li[data-bot-kind]')).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // 2. Tab Liên hệ
  // -------------------------------------------------------------------------

  test('tab Liên hệ: hotline, email có tiêu đề, Facebook + Zalo tab mới; không có Telegram', async ({
    page,
    gotoApp,
  }) => {
    await gotoApp('/');
    const dialog = await openBubble(page);

    const contactTab = dialog.getByRole('tab', { name: 'Liên hệ' });
    await contactTab.click();
    await expect(contactTab).toHaveAttribute('aria-selected', 'true');

    const list = dialog.getByRole('list', { name: 'Kênh liên hệ' });
    await expect(list).toBeVisible();

    const hotline = list.getByRole('link', { name: /Hotline/ });
    await expect(hotline).toHaveAttribute('href', 'tel:0868325698');

    const ticket = list.getByRole('link', { name: /Gửi phiếu hỗ trợ/ });
    const mailHref = await ticket.getAttribute('href');
    expect(mailHref).not.toBeNull();
    expect(mailHref!.startsWith(`mailto:${SUPPORT_EMAIL}?subject=${TICKET_SUBJECT}`)).toBe(true);
    expect(mailHref).toContain('&body=');

    const fb = list.getByRole('link', { name: /Facebook/ });
    await expect(fb).toHaveAttribute('href', FACEBOOK_URL);
    await expect(fb).toHaveAttribute('target', '_blank');
    await expect(fb).toHaveAttribute('rel', /noopener/);

    const zalo = list.getByRole('link', { name: /Zalo/ });
    await expect(zalo).toHaveAttribute('href', ZALO_URL);
    await expect(zalo).toHaveAttribute('target', '_blank');
    await expect(zalo).toHaveAttribute('rel', /noopener/);

    // Không còn Telegram ở bất cứ đâu trong khung (chữ hay thuộc tính).
    const html = await dialog.evaluate((el) => el.outerHTML.toLowerCase());
    expect(html).not.toContain('telegram');
    await expect(dialog).not.toContainText(/telegram/i);
  });

  // -------------------------------------------------------------------------
  // 3. Ẩn ở trang đăng nhập / đăng ký
  // -------------------------------------------------------------------------

  for (const path of ['/login', '/register']) {
    test(`ẩn ở ${path}`, async ({ page, gotoApp }) => {
      await gotoApp(path);
      await expect(page.locator('main, form').first()).toBeVisible();
      await expect(bubbleButton(page)).toHaveCount(0);
      await expect(panel(page)).toHaveCount(0);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Người lao động đã đăng nhập — Hộp thư
// ---------------------------------------------------------------------------

test.describe('Bong bóng hỗ trợ — người lao động đã đăng nhập', () => {
  test.use({ viewport: DESKTOP });

  test('3 tab; Hộp thư có "Tin nhắn" + "Thông báo"; bấm thông báo → điều hướng', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const note = workerNotification();
    await seedState(buildSnapshot({ notifications: [note] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/shifts');

    const dialog = await openBubble(page);
    const tabs = dialog.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveText('Hỏi CaLẻ');
    await expect(tabs.nth(1)).toContainText('Hộp thư');
    await expect(tabs.nth(2)).toHaveText('Liên hệ');

    const inboxTab = dialog.getByRole('tab', { name: /^Hộp thư/ });
    await inboxTab.click();
    await expect(inboxTab).toHaveAttribute('aria-selected', 'true');

    const inbox = dialog.getByRole('tabpanel', { name: /^Hộp thư/ });
    await expect(inbox.getByRole('region', { name: 'Tin nhắn' })).toBeVisible();
    const notes = inbox.getByRole('region', { name: 'Thông báo' });
    await expect(notes).toBeVisible();

    // Thông báo đã seed → bấm → đánh dấu đã đọc + điều hướng, khung đóng.
    const item = notes.getByRole('button', { name: note.title });
    await expect(item).toBeVisible();
    await item.click();
    await expect(page).toHaveURL(/\/worker\/schedule$/);
    await expect(panel(page)).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate((id) => {
          const raw = window.localStorage.getItem('cale.notifications');
          const list = raw ? (JSON.parse(raw) as Array<{ id: string; read: boolean }>) : [];
          return list.find((n) => n.id === id)?.read ?? null;
        }, note.id),
      )
      .toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Điện thoại 375×812
// ---------------------------------------------------------------------------

test.describe('Bong bóng hỗ trợ — điện thoại', () => {
  test.use({ viewport: MOBILE });

  test('khung vừa chiều ngang, không tràn ngang; nút đóng hoạt động', async ({ page, gotoApp }) => {
    await gotoApp('/');
    const dialog = await openBubble(page);

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);

    // Nội dung dài (câu ngoài lề kèm kênh liên hệ) vẫn không tràn ngang.
    const fallback = await ask(dialog, OFF_TOPIC_Q);
    await expect(fallback).toHaveAttribute('data-bot-kind', 'fallback');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);

    await dialog.getByRole('button', { name: 'Đóng hỗ trợ' }).click();
    await expect(panel(page)).toHaveCount(0);
    await expect(bubbleButton(page)).toBeVisible();
    await expect(bubbleButton(page)).toBeFocused();
  });
  test('như Messenger: hỏi xong vẫn thấy câu mình hỏi ở đầu khung, câu trả lời đọc từ trên xuống', async ({
    page,
    gotoApp,
  }) => {
    await gotoApp('/');
    const dialog = await openBubble(page);
    const log = dialog.getByRole('log');
    for (const q of ['đi làm có mất phí gì không', 'đăng ca tuyển người thế nào', 'rút tiền về ngân hàng thế nào']) {
      const reply = await ask(dialog, q);
      const asked = dialog.locator('li[data-msg-id]').filter({ hasText: q }).last();
      const logBox = (await log.boundingBox())!;
      const askedBox = (await asked.boundingBox())!;
      const replyBox = (await reply.boundingBox())!;
      // Câu hỏi nằm trong khung nhìn (không bị cuộn mất lên trên)…
      expect(askedBox.y).toBeGreaterThanOrEqual(logBox.y - 1);
      expect(askedBox.y).toBeLessThan(logBox.y + logBox.height);
      // …và phần đầu câu trả lời cũng thấy được ngay.
      expect(replyBox.y).toBeLessThan(logBox.y + logBox.height);
    }
  });
});
