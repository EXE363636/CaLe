import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * Chat người lao động ↔ nhà tuyển dụng (0035) — chế độ local/demo.
 *
 * Luật (src/domain/chat.ts + src/stores/chatStore.ts, chế độ local):
 *   - Mỗi ĐƠN một cuộc trò chuyện; chỉ có khi đơn từng được duyệt.
 *   - Mở đến 7 ngày sau giờ kết thúc ca; sau đó (hoặc khi huỷ) chỉ đọc.
 *   - 1–1000 ký tự (cắt khoảng trắng hai đầu); Enter gửi, Shift+Enter xuống dòng.
 *   - Cảnh báo giao dịch ngoài CaLẻ (Zalo, chuyển khoản, số dài) — KHÔNG chặn gửi.
 *   - Một thông báo chưa đọc mỗi cuộc cho người kia; deeplink:
 *       worker  → /shifts/{shiftId}?chat=1
 *       employer→ /employer/shifts/{shiftId}?chat={applicationId}
 *   - "Đã báo cáo" chỉ người báo cáo thấy; người gửi tin bị báo cáo không thấy.
 *
 * Bề mặt: worker — mục `<section aria-labelledby="shift-chat-title">` ("Trao đổi với
 * nhà tuyển dụng") trên /shifts/[id]; employer — nút "Nhắn tin" trên dòng người lao
 * động ở /employer/shifts/[id] → hộp thoại "Trao đổi với {tên}".
 *
 * Thời gian: `page.clock.setFixedTime` quanh ANCHOR (thứ Tư 02/06/2027 12:00 ICT);
 * khi đổi người dùng thì đẩy đồng hồ lên vài phút để tin của hai bên có mốc khác nhau.
 */

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 375, height: 812 };

const WORKER_NAME = 'Nguyễn Văn An';
const SHIFT_TITLE = 'Phục vụ quán phở giờ trưa';
const ANCHOR_MS = new Date(ANCHOR_ISO).getTime();
const at = (minutes: number) => new Date(ANCHOR_MS + minutes * 60_000);
const atIso = (minutes: number) => at(minutes).toISOString();

/** Ca sắp tới (10/06/2027 11:00–14:00) + đơn đã duyệt của worker-001. */
function upcomingApproved(appOver: Record<string, unknown> = {}) {
  const shift = buildShift({
    id: 'e2e-chat-shift',
    title: SHIFT_TITLE,
    date: '2027-06-10',
    startTime: '11:00',
    endTime: '14:00',
    positionsTotal: 2,
    positionsFilled: 1,
  });
  const app = buildApplication({
    id: 'e2e-chat-app',
    shiftId: shift.id,
    status: 'Approved',
    approvedAt: '2027-06-02T04:00:00.000Z',
    ...appOver,
  });
  return { shift, app };
}

function chatMessage(over: Record<string, unknown>) {
  return {
    id: 'chat_e2e_1',
    applicationId: 'e2e-chat-app',
    senderId: ACCOUNTS.worker.id,
    body: 'Chào chị, em đến lúc 10:45 được không ạ?',
    createdAt: atIso(-30),
    reported: false,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Locators / helpers
// ---------------------------------------------------------------------------

function workerSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Trao đổi với nhà tuyển dụng' });
}

/** Mở khung chat của người lao động (nút trong mục chat) và trả về panel. */
async function openWorkerChat(page: Page, buttonName: RegExp = /^Nhắn với nhà tuyển dụng/): Promise<Locator> {
  const section = workerSection(page);
  await expect(section).toBeVisible();
  await section.getByRole('button', { name: buttonName }).click();
  const panel = section.getByTestId('chat-panel');
  await expect(panel).toBeVisible();
  // Đợi tải xong (aria-busy=false) để khẳng định "không có" không bị đúng giả.
  await expect(panel.getByRole('log')).toHaveAttribute('aria-busy', 'false');
  return panel;
}

function employerChatButton(page: Page): Locator {
  return page.getByRole('button', { name: new RegExp(`^Nhắn tin với ${WORKER_NAME}`) });
}

async function openEmployerChat(page: Page): Promise<Locator> {
  await employerChatButton(page).click();
  const dialog = page.getByRole('dialog', { name: `Trao đổi với ${WORKER_NAME}` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('log')).toHaveAttribute('aria-busy', 'false');
  return dialog;
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Mở chuông thông báo — thử lại nếu cú bấm đầu rơi vào lúc chưa hydrate xong. */
async function openBell(page: Page): Promise<Locator> {
  const bellPanel = page.getByRole('dialog', { name: 'Thông báo' });
  await expect(async () => {
    if (!(await bellPanel.isVisible())) {
      await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
    }
    await expect(bellPanel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  return bellPanel;
}

// ---------------------------------------------------------------------------
// 1–4. Gửi tin, cảnh báo ngoài nền tảng, nhà tuyển dụng đọc + trả lời, deeplink
// ---------------------------------------------------------------------------

test.describe('Chat — gửi và nhận (local)', () => {
  test('người lao động có đơn đã duyệt: thấy mục chat, Enter gửi, Shift+Enter xuống dòng', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page);
    const log = panel.getByRole('log', { name: 'Tin nhắn' });
    await expect(log).toContainText('Chưa có tin nhắn nào. Bạn có thể hỏi nhà tuyển dụng');
    await expect(panel.getByText('Bản demo: tin nhắn chỉ lưu trên trình duyệt này.')).toBeVisible();

    const composer = panel.getByLabel('Tin nhắn của bạn');
    await expect(composer).toBeFocused();

    // Shift+Enter → xuống dòng, chưa gửi.
    await composer.pressSequentially('Chào chị');
    await composer.press('Shift+Enter');
    await composer.pressSequentially('Em hỏi chỗ gửi xe ạ');
    await expect(composer).toHaveValue('Chào chị\nEm hỏi chỗ gửi xe ạ');
    await expect(log.locator('li')).toHaveCount(0);

    // Enter → gửi; ô nhập trống lại; tin nằm trong role="log" với nhãn "Bạn".
    await composer.press('Enter');
    await expect(log.locator('li')).toHaveCount(1);
    const bubble = log.locator('li').first();
    expect(await bubble.locator('p').textContent()).toBe('Chào chị\nEm hỏi chỗ gửi xe ạ');
    await expect(bubble).toContainText('Bạn');
    await expect(composer).toHaveValue('');
    // Tin của chính mình: không có nút "Báo cáo".
    await expect(bubble.getByRole('button', { name: /^Báo cáo/ })).toHaveCount(0);

    // Lưu vào localStorage (chế độ demo) + một thông báo cho nhà tuyển dụng.
    const stored = await page.evaluate(() => ({
      messages: JSON.parse(localStorage.getItem('cale.chatMessages') ?? '[]'),
      notifications: JSON.parse(localStorage.getItem('cale.notifications') ?? '[]'),
    }));
    expect(stored.messages).toHaveLength(1);
    expect(stored.messages[0]).toMatchObject({ applicationId: app.id, senderId: ACCOUNTS.worker.id });
    const chatNotes = stored.notifications.filter((n: { kind: string }) => n.kind === 'ChatMessage');
    expect(chatNotes).toHaveLength(1);
    expect(chatNotes[0]).toMatchObject({
      userId: ACCOUNTS.employer.id,
      read: false,
      link: `/employer/shifts/${shift.id}?chat=${app.id}`,
    });

    // Gửi thêm một tin: vẫn chỉ MỘT thông báo chưa đọc cho cuộc này.
    await composer.fill('Em cảm ơn chị');
    await composer.press('Enter');
    await expect(log.locator('li')).toHaveCount(2);
    const notesAfter = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('cale.notifications') ?? '[]').filter(
          (n: { kind: string }) => n.kind === 'ChatMessage',
        ).length,
    );
    expect(notesAfter).toBe(1);
  });

  test('cảnh báo giao dịch ngoài CaLẻ hiện khi gõ "zalo" nhưng không chặn gửi', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page);
    const composer = panel.getByLabel('Tin nhắn của bạn');
    const warning = panel.getByRole('note');

    await composer.fill('Chị cho em hỏi');
    await expect(warning).toHaveCount(0);

    await composer.fill('kết bạn zalo em nhé');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Giữ trao đổi và thanh toán trên CaLẻ.');
    // Cảnh báo được nối vào mô tả của ô nhập (trình đọc màn hình).
    const warnId = await warning.getAttribute('id');
    expect(warnId).toBeTruthy();
    expect((await composer.getAttribute('aria-describedby'))?.split(' ')).toContain(warnId);
    await expect(panel.getByRole('button', { name: 'Gửi', exact: true })).toBeEnabled();

    await panel.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(panel.getByRole('log').locator('li')).toHaveCount(1);
    await expect(panel.getByRole('log')).toContainText('kết bạn zalo em nhé');
    // Ô nhập trống → cảnh báo biến mất.
    await expect(composer).toHaveValue('');
    await expect(warning).toHaveCount(0);

    // Số dài (SĐT / số tài khoản) cũng cảnh báo.
    await composer.fill('số em 0905 444 001 nha');
    await expect(warning).toBeVisible();
  });

  test('nhà tuyển dụng thấy số chưa đọc trên nút "Nhắn tin", mở hộp thoại, trả lời; số chưa đọc mất', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page);
    const composer = panel.getByLabel('Tin nhắn của bạn');
    await composer.fill('Chị ơi em đến sớm 15 phút được không ạ?');
    await composer.press('Enter');
    await expect(panel.getByRole('log').locator('li')).toHaveCount(1);

    // --- Nhà tuyển dụng -----------------------------------------------------
    await page.clock.setFixedTime(at(5));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);

    const button = employerChatButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleName(`Nhắn tin với ${WORKER_NAME}, 1 tin chưa đọc`);
    // Số hiển thị (không chỉ màu): "1".
    await expect(button).toContainText('1');

    const dialog = await openEmployerChat(page);
    const log = dialog.getByRole('log', { name: 'Tin nhắn' });
    await expect(log.locator('li')).toHaveCount(1);
    await expect(log).toContainText('Chị ơi em đến sớm 15 phút được không ạ?');
    // Nhãn người gửi là tên người lao động (giọng employer, không "Bạn").
    await expect(log.locator('li').first()).toContainText(WORKER_NAME);
    await expect(dialog.getByText(/^Dặn người lao động giờ đến/)).toBeVisible();

    const reply = dialog.getByLabel('Tin nhắn của bạn');
    await expect(reply).toBeFocused();
    await reply.fill('Được em, nhớ mặc áo trắng nhé.');
    await reply.press('Enter');
    await expect(log.locator('li')).toHaveCount(2);
    await expect(log.locator('li').nth(1)).toContainText('Được em, nhớ mặc áo trắng nhé.');
    await expect(log.locator('li').nth(1)).toContainText('Bạn');

    // Đóng hộp thoại → nút không còn số chưa đọc.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toHaveAccessibleName(`Nhắn tin với ${WORKER_NAME}`);

    // Thông báo chat của nhà tuyển dụng đã được đánh dấu đã đọc khi mở cuộc trò chuyện.
    const employerUnread = await page.evaluate(
      (uid) =>
        JSON.parse(localStorage.getItem('cale.notifications') ?? '[]').filter(
          (n: { kind: string; userId: string; read: boolean }) =>
            n.kind === 'ChatMessage' && n.userId === uid && !n.read,
        ).length,
      ACCOUNTS.employer.id,
    );
    expect(employerUnread).toBe(0);

    // --- Người lao động thấy trả lời + số chưa đọc ------------------------------
    await page.clock.setFixedTime(at(10));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);
    const workerButton = workerSection(page).getByRole('button', { name: /^Nhắn với nhà tuyển dụng/ });
    await expect(workerButton).toHaveAccessibleName('Nhắn với nhà tuyển dụng 1 tin chưa đọc');
    const workerPanel = await openWorkerChat(page);
    await expect(workerPanel.getByRole('log')).toContainText('Được em, nhớ mặc áo trắng nhé.');
    await expect(workerPanel.getByRole('log').locator('li').nth(1)).toContainText('Quán Phở Hà');
  });

  test('thông báo tin nhắn trong chuông deeplink tới /employer/shifts/{id}?chat={appId} và mở hộp thoại', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page);
    await panel.getByLabel('Tin nhắn của bạn').fill('Em chào chị ạ');
    await panel.getByLabel('Tin nhắn của bạn').press('Enter');
    await expect(panel.getByRole('log').locator('li')).toHaveCount(1);

    await page.clock.setFixedTime(at(5));
    await loginAs(ACCOUNTS.employer.id);
    // Biên dịch sẵn route đích (dev server biên dịch theo yêu cầu) để cú bấm
    // thông báo không phụ thuộc thời gian biên dịch. Chỉ XEM, không mở chat.
    await gotoApp(`/employer/shifts/${shift.id}`);
    await expect(employerChatButton(page)).toBeVisible();
    await gotoApp('/employer/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const bell = await openBell(page);
    const item = bell.getByRole('button', { name: `Tin nhắn mới về ca ${SHIFT_TITLE}` });
    await expect(item).toBeVisible();
    await expect(item).toHaveAccessibleDescription(/Chưa đọc.*Người lao động vừa nhắn tin cho bạn/);

    const deeplink = page.waitForURL(`**/employer/shifts/${shift.id}?chat=${app.id}`);
    await item.click();
    await deeplink;

    const dialog = page.getByRole('dialog', { name: `Trao đổi với ${WORKER_NAME}` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('log')).toContainText('Em chào chị ạ');
    // Tham số ?chat bị bỏ khỏi URL sau khi mở (tải lại không mở lại hộp thoại).
    await expect(page).toHaveURL(new RegExp(`/employer/shifts/${shift.id}$`));

    // Chuông: thông báo đã đọc.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Thông báo', exact: true })).not.toContainText(/\d/);
  });

  test('thông báo tin nhắn của người lao động deeplink tới /shifts/{id}?chat=1 và mở khung chat', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);
    const dialog = await openEmployerChat(page);
    await dialog.getByLabel('Tin nhắn của bạn').fill('Mai em nhớ mang CCCD nhé.');
    await dialog.getByLabel('Tin nhắn của bạn').press('Enter');
    await expect(dialog.getByRole('log').locator('li')).toHaveCount(1);

    await page.clock.setFixedTime(at(5));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);
    await expect(workerSection(page)).toBeVisible();
    await gotoApp('/worker/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const bell = await openBell(page);
    const item = bell.getByRole('button', { name: `Tin nhắn mới về ca ${SHIFT_TITLE}` });
    await expect(item).toHaveAccessibleDescription(/Nhà tuyển dụng vừa nhắn tin cho bạn/);
    const deeplink = page.waitForURL(`**/shifts/${shift.id}?chat=1`);
    await item.click();
    await deeplink;

    const section = workerSection(page);
    await expect(section.getByTestId('chat-panel')).toBeVisible();
    await expect(section.getByRole('log')).toContainText('Mai em nhớ mang CCCD nhé.');
    await expect(page).toHaveURL(new RegExp(`/shifts/${shift.id}$`));
  });
});

// ---------------------------------------------------------------------------
// 5. Chỉ đọc + không có chat
// ---------------------------------------------------------------------------

test.describe('Chat — chỉ đọc / không có', () => {
  test('ca đã kết thúc hơn 7 ngày (đơn Confirmed): xem lịch sử, không có ô nhập, có thông báo chỉ đọc', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    // 20/05/2027 17:00–21:00 → kết thúc 13 ngày trước ANCHOR.
    const shift = buildShift({
      id: 'e2e-chat-past',
      title: 'Rửa bát ca tối',
      date: '2027-05-20',
      startTime: '17:00',
      endTime: '21:00',
      status: 'Completed',
      escrowStatus: 'Released',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    const app = buildApplication({
      id: 'e2e-chat-past-app',
      shiftId: shift.id,
      status: 'Confirmed',
      approvedAt: '2027-05-18T03:00:00.000Z',
      confirmedAt: '2027-05-20T15:00:00.000Z',
      payoutAmount: 180000,
    });
    const msg = chatMessage({
      id: 'chat_e2e_past',
      applicationId: app.id,
      body: 'Em đã tới cửa sau ạ.',
      createdAt: '2027-05-20T09:50:00.000Z',
    });
    await seedState(buildSnapshot({ shifts: [shift], applications: [app], chatMessages: [msg] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page, /^Xem lại tin nhắn với nhà tuyển dụng/);
    await expect(panel.getByRole('log')).toContainText('Em đã tới cửa sau ạ.');
    await expect(panel.getByLabel('Tin nhắn của bạn')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Gửi', exact: true })).toHaveCount(0);
    await expect(panel.getByText('Cuộc trò chuyện đã đóng, chỉ xem lại được.')).toBeVisible();
    await expect(panel.getByText(/đóng sau 7 ngày kể từ khi ca kết thúc/)).toBeVisible();

    // Phía nhà tuyển dụng: cũng chỉ đọc.
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);
    const dialog = await openEmployerChat(page);
    await expect(dialog.getByRole('log')).toContainText('Em đã tới cửa sau ạ.');
    await expect(dialog.getByLabel('Tin nhắn của bạn')).toHaveCount(0);
    await expect(dialog.getByText('Cuộc trò chuyện đã đóng, chỉ xem lại được.')).toBeVisible();
  });

  test('đơn đang chờ duyệt: không có mục chat (người lao động) và không có nút "Nhắn tin" (nhà tuyển dụng)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved({ status: 'Pending', approvedAt: undefined });
    await seedState(
      buildSnapshot({ shifts: [{ ...shift, positionsFilled: 0 }], applications: [app] }),
    );
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    // Trang đã hiện xong (tiêu đề ca) rồi mới khẳng định "không có".
    await expect(page.getByRole('heading', { name: SHIFT_TITLE }).first()).toBeVisible();
    await expect(page.getByText('Quán Phở Hà').first()).toBeVisible();
    await expect(workerSection(page)).toHaveCount(0);
    await expect(page.getByTestId('chat-panel')).toHaveCount(0);

    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);
    await expect(page.getByText(WORKER_NAME).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Duyệt/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Nhắn tin/ })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Báo cáo tin nhắn
// ---------------------------------------------------------------------------

test.describe('Chat — báo cáo', () => {
  test('nhà tuyển dụng báo cáo tin của người lao động; người gửi không thấy nhãn "Đã báo cáo"', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    const msg = chatMessage({ body: 'Chị chuyển khoản riêng cho em trước nhé.' });
    await seedState(buildSnapshot({ shifts: [shift], applications: [app], chatMessages: [msg] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);

    const dialog = await openEmployerChat(page);
    const log = dialog.getByRole('log');
    await expect(log).toContainText('Chị chuyển khoản riêng cho em trước nhé.');
    await log.getByRole('button', { name: /^Báo cáo tin nhắn lúc / }).click();

    const form = dialog.getByRole('form', { name: 'Báo cáo tin nhắn' });
    await expect(form).toBeVisible();
    const reason = form.getByLabel('Lý do báo cáo');
    await expect(reason).toBeFocused();
    const submit = form.getByRole('button', { name: 'Gửi báo cáo' });
    await expect(submit).toBeDisabled();
    await reason.fill('Đòi chuyển khoản riêng ngoài CaLẻ.');
    await submit.click();

    await expect(form).toBeHidden();
    await expect(page.getByText('Đã gửi báo cáo. Quản trị viên sẽ xem lại.')).toBeVisible();
    await expect(log.getByText('Đã báo cáo', { exact: true })).toBeVisible();
    await expect(log.getByRole('button', { name: /^Báo cáo tin nhắn lúc / })).toHaveCount(0);

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cale.chatMessages') ?? '[]'));
    expect(stored[0]).toMatchObject({
      reported: true,
      reportedBy: ACCOUNTS.employer.id,
      reportReason: 'Đòi chuyển khoản riêng ngoài CaLẻ.',
    });

    // Tải lại: người báo cáo vẫn thấy nhãn.
    await page.keyboard.press('Escape');
    await gotoApp(`/employer/shifts/${shift.id}`);
    const again = await openEmployerChat(page);
    await expect(again.getByRole('log').getByText('Đã báo cáo', { exact: true })).toBeVisible();

    // Người gửi tin (người lao động) KHÔNG thấy tin của mình bị báo cáo.
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);
    const panel = await openWorkerChat(page);
    await expect(panel.getByRole('log')).toContainText('Chị chuyển khoản riêng cho em trước nhé.');
    await expect(panel.getByText('Đã báo cáo', { exact: true })).toHaveCount(0);
    await expect(panel.getByText('Đòi chuyển khoản riêng ngoài CaLẻ.')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Kiểm tra dữ liệu nhập
// ---------------------------------------------------------------------------

test.describe('Chat — kiểm tra nội dung', () => {
  test('chỉ khoảng trắng không gửi được; 1001 ký tự bị chặn kèm bộ đếm + lỗi', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page);
    const composer = panel.getByLabel('Tin nhắn của bạn');
    const send = panel.getByRole('button', { name: 'Gửi', exact: true });
    const items = panel.getByRole('log').locator('li');

    await expect(panel.getByText('0/1000 ký tự')).toBeVisible();
    await expect(send).toBeDisabled();

    // Chỉ khoảng trắng / xuống dòng.
    await composer.fill('   \n  ');
    await expect(send).toBeDisabled();
    await expect(panel.getByText('0/1000 ký tự')).toBeVisible();
    await composer.press('Enter');
    await expect(page.getByRole('alert').filter({ hasText: 'Vui lòng nhập nội dung tin nhắn.' })).toBeVisible();
    await expect(items).toHaveCount(0);

    // 1001 ký tự.
    await composer.fill('a'.repeat(1001));
    await expect(panel.getByText('1001/1000 ký tự · Vượt quá 1000 ký tự.')).toBeVisible();
    await expect(composer).toHaveAttribute('aria-invalid', 'true');
    await expect(send).toBeDisabled();
    await composer.press('Enter');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Tin nhắn dài quá 1000 ký tự. Vui lòng rút gọn.' }),
    ).toBeVisible();
    await expect(items).toHaveCount(0);
    const storedCount = await page.evaluate(
      () => JSON.parse(localStorage.getItem('cale.chatMessages') ?? '[]').length,
    );
    expect(storedCount).toBe(0);

    // Đúng 1000 ký tự (có khoảng trắng hai đầu) → gửi được, lưu bản đã cắt.
    await composer.fill(`  ${'b'.repeat(1000)}  `);
    await expect(panel.getByText('1000/1000 ký tự', { exact: true })).toBeVisible();
    await expect(composer).toHaveAttribute('aria-invalid', 'false');
    await send.click();
    await expect(items).toHaveCount(1);
    const body = await page.evaluate(
      () => JSON.parse(localStorage.getItem('cale.chatMessages') ?? '[]')[0]?.body as string,
    );
    expect(body).toBe('b'.repeat(1000));
  });
});

// ---------------------------------------------------------------------------
// 8. Tiếng Anh
// ---------------------------------------------------------------------------

test.describe('Chat — tiếng Anh', () => {
  test('cookie cale.lang=en: mục chat hiện chữ tiếng Anh', async ({
    page,
    context,
    baseURL,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(at(0));
    await context.addCookies([{ name: 'cale.lang', value: 'en', url: baseURL! }]);
    const { shift, app } = upcomingApproved();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const section = page.getByRole('region', { name: 'Chat with the employer' });
    await expect(section).toBeVisible();
    await section.getByRole('button', { name: 'Message the employer' }).click();
    const panel = section.getByTestId('chat-panel');
    await expect(panel.getByRole('log', { name: 'Messages' })).toContainText('No messages yet.');
    await expect(panel.getByLabel('Your message')).toBeVisible();
    await expect(panel.getByText('Press Enter to send, Shift + Enter for a new line.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
    await panel.getByLabel('Your message').fill('add me on zalo');
    await expect(panel.getByRole('note')).toContainText('Keep messages and payments on CaLẻ.');
    await expect(panel.getByText('Tin nhắn của bạn')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Di động 375px
// ---------------------------------------------------------------------------

test.describe('Chat — di động 375px', () => {
  test('không tràn ngang khi mở chat (trang người lao động + hộp thoại nhà tuyển dụng)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(MOBILE);
    await page.clock.setFixedTime(at(0));
    const { shift, app } = upcomingApproved();
    const longWord = 'x'.repeat(120);
    const msgs = [
      chatMessage({ id: 'chat_e2e_m1', body: `Tin dài không dấu cách: ${longWord}`, createdAt: atIso(-20) }),
      chatMessage({
        id: 'chat_e2e_m2',
        senderId: ACCOUNTS.employer.id,
        body: 'Ok em, nhớ đến cửa sau nhé.',
        createdAt: atIso(-10),
      }),
    ];
    await seedState(buildSnapshot({ shifts: [shift], applications: [app], chatMessages: msgs }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const panel = await openWorkerChat(page);
    await expect(panel.getByRole('log').locator('li')).toHaveCount(2);
    await panel.getByLabel('Tin nhắn của bạn').fill('kết bạn zalo em nhé');
    await expect(panel.getByRole('note')).toBeVisible();
    await noHorizontalScroll(page);
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(MOBILE.width);

    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);
    const dialog = await openEmployerChat(page);
    await expect(dialog.getByRole('log').locator('li')).toHaveCount(2);
    // Đợi hiệu ứng mở hộp thoại (scale) xong rồi mới đo.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await noHorizontalScroll(page);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width);
    // Nút gửi chạm được (≥ 44px).
    const sendBox = await dialog.getByRole('button', { name: 'Gửi', exact: true }).boundingBox();
    expect(sendBox!.height).toBeGreaterThanOrEqual(44);
  });
});
