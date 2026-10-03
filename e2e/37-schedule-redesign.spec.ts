import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import {
  buildSnapshot,
  buildShift,
  buildApplication,
  buildScheduleBlock,
} from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * Lịch (03/10 — thiết kế lại): /worker/schedule + /employer/schedule.
 *
 *   - Lưới cố định 24 giờ = 4 cụm 6 giờ (Đêm / Sáng / Chiều / Tối), mỗi giờ 24px
 *     (cụm 144px). Bấm ô trống → khung 1 giờ đúng giờ được bấm.
 *   - Bấm một mục → hộp chi tiết (EventPeek), không nhảy trang ngay.
 *   - Dải tóm tắt tuần, lớp phủ tuần trống, Danh sách hiện đủ 7 ngày.
 *   - Điện thoại (<640px) mặc định "Danh sách", không tràn ngang.
 *
 * Thời gian: `page.clock.setFixedTime(ANCHOR)` — chỉ cố định Date (thứ Tư
 * 02/06/2027 12:00 ICT), giữ timer / requestAnimationFrame chạy thật (trang đổi
 * sang Danh sách trên điện thoại qua rAF). Tuần đang xem: 31/05 → 06/06/2027.
 * Không kiểm vị trí vạch "bây giờ" (phụ thuộc đồng hồ).
 */

const HOUR_PX = 24;
const CLUSTER_PX = HOUR_PX * 6;
const DESKTOP = { width: 1280, height: 900 };

/** Ca chiều thứ Năm trong tuần đang xem: 4 giờ × 45.000 đ = 180.000 đ. */
function approvedAfternoonShift() {
  const shift = buildShift({
    id: 'e2e-sched-approved',
    title: 'Ca chiều phục vụ',
    date: '2027-06-03',
    startTime: '13:00',
    endTime: '17:00',
    hourlyWage: 45000,
    positionsTotal: 2,
    positionsFilled: 1,
  });
  const app = buildApplication({
    id: 'e2e-sched-approved-app',
    shiftId: shift.id,
    status: 'Approved',
  });
  return { shift, app };
}

function blockFriday() {
  return buildScheduleBlock({
    id: 'e2e-block-fri',
    title: 'Học tiếng Anh',
    date: '2027-06-05',
    startTime: '09:00',
    endTime: '11:00',
    note: 'Lớp buổi sáng',
    kind: 'busy',
    createdAt: '2027-06-01T00:00:00.000Z',
    updatedAt: '2027-06-01T00:00:00.000Z',
  });
}

async function openWorkerSchedule(
  page: Page,
  gotoApp: (p: string) => Promise<void>,
): Promise<void> {
  await gotoApp('/worker/schedule');
  await expect(page.getByRole('heading', { level: 1, name: 'Lịch cá nhân' })).toBeVisible();
}

function viewButton(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

/** Ô trống trong lưới tuần: nhãn `dd/mm/yyyy HH:mm-HH:mm`. */
const WEEK_CELL = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}-\d{2}:\d{2}$/;

test.describe('Lịch thiết kế lại — lưới 4 cụm 6 giờ', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('tuần: 4 cụm × 7 ngày, gutter ghi tên cụm + giờ bắt đầu, mỗi cụm cao 144px', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    await expect(viewButton(page, 'Tuần')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: WEEK_CELL })).toHaveCount(28);

    // Bốn cụm của thứ Ba 01/06/2027 — đúng nhãn, không còn khung tuỳ chỉnh.
    for (const range of ['00:00-06:00', '06:00-12:00', '12:00-18:00']) {
      await expect(page.getByRole('button', { name: `01/06/2027 ${range}`, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /^01\/06\/2027 18:00-/ })).toBeVisible();
    await expect(page.getByText('Tuỳ chỉnh khung giờ')).toHaveCount(0);

    for (const name of ['Đêm', 'Sáng', 'Chiều', 'Tối']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    const box = await page.getByRole('button', { name: '01/06/2027 12:00-18:00', exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.height - CLUSTER_PX)).toBeLessThanOrEqual(1);
  });

  test('ngày: 4 cụm, nhãn ô HH:mm–HH:mm', async ({ page, seedState, loginAs, gotoApp }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    await viewButton(page, 'Ngày').click();
    await expect(viewButton(page, 'Ngày')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^\d{2}:\d{2}–\d{2}:\d{2}$/ })).toHaveCount(4);
    await expect(page.getByRole('button', { name: '12:00–18:00', exact: true })).toBeVisible();
    for (const name of ['Đêm', 'Sáng', 'Chiều', 'Tối']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test('bấm ô trống cụm "Chiều" ở giờ thứ 2 → hộp thêm lịch điền sẵn 13:00–14:00', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    // Cụm Chiều bắt đầu 12:00; y = 1,5 giờ × 24px → giờ thứ hai của cụm (13:00).
    await page
      .getByRole('button', { name: '01/06/2027 12:00-18:00', exact: true })
      .click({ position: { x: 20, y: HOUR_PX * 1.5 } });

    const dialog = page.getByRole('dialog', { name: 'Thêm lịch trình của bạn' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/^Ngày/)).toHaveValue('01/06/2027');
    await expect(dialog.getByLabel(/^Giờ bắt đầu/)).toHaveValue('13:00');
    await expect(dialog.getByLabel(/^Giờ kết thúc/)).toHaveValue('14:00');
  });
});

test.describe('Lịch thiết kế lại — người lao động', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('tóm tắt tuần: 1 ca, 4 giờ, 180.000 đ, 1 đơn chờ duyệt (ca tuần khác không tính)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const approved = approvedAfternoonShift();
    const pendingShift = buildShift({ id: 'e2e-sched-pending', title: 'Ca sáng chờ duyệt', date: '2027-06-04', startTime: '08:00', endTime: '10:00' });
    const nextWeek = buildShift({ id: 'e2e-sched-nextweek', title: 'Ca tuần sau', date: '2027-06-10', startTime: '08:00', endTime: '16:00' });
    await seedState(
      buildSnapshot({
        shifts: [approved.shift, pendingShift, nextWeek],
        applications: [
          approved.app,
          buildApplication({ shiftId: pendingShift.id, status: 'Pending' }),
          buildApplication({ shiftId: nextWeek.id, status: 'Approved' }),
        ],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    const dl = page.locator('dl[aria-label="Tóm tắt tuần đang xem"]');
    await expect(dl).toBeVisible();
    const value = (label: string) => ddFor(dl, label);
    await expect(value('Ca đã nhận trong tuần')).toHaveText('1');
    await expect(value('Giờ làm')).toHaveText('4');
    await expect(value('Tiền công dự kiến')).toHaveText('180.000 đ');
    await expect(value('Đơn chờ duyệt')).toHaveText('1');
  });

  test('bấm ca đã duyệt → hộp chi tiết (trạng thái, giờ, nơi, tiền công, giờ mở check-in, link trang ca)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const approved = approvedAfternoonShift();
    await seedState(buildSnapshot({ shifts: [approved.shift], applications: [approved.app] }));
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    await page.locator('button[title^="Ca chiều phục vụ"]').click();

    // Không nhảy trang ngay — mở hộp chi tiết.
    const peek = page.getByRole('dialog', { name: 'Ca chiều phục vụ' });
    await expect(peek).toBeVisible();
    await expect(page).toHaveURL(/\/worker\/schedule$/);
    await expect(peek.getByText('Đã được duyệt', { exact: true })).toBeVisible();
    await expect(rowValue(peek, 'Thời gian')).toHaveText('03/06/2027 · 13:00–17:00');
    await expect(rowValue(peek, 'Địa điểm')).toHaveText('12 Nguyễn Huệ, Quận 1, TP.HCM');
    await expect(rowValue(peek, 'Tiền công cả ca')).toHaveText('180.000 đ');
    await expect(peek.getByText('Check-in mở từ 12:45, 15 phút trước giờ bắt đầu.')).toBeVisible();

    const link = peek.getByRole('link', { name: 'Mở trang ca →' });
    await expect(link).toHaveAttribute('href', `/shifts/${approved.shift.id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/shifts/${approved.shift.id}$`));
  });

  test('bấm lịch bận → hộp chi tiết; "Chỉnh sửa" mở hộp sửa, "Xoá" xoá lịch', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const block = blockFriday();
    await seedState(buildSnapshot({ scheduleBlocks: [block] }));
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    const card = page.locator('button[title^="Học tiếng Anh"]');
    await card.click();
    const peek = page.getByRole('dialog', { name: 'Học tiếng Anh' });
    await expect(peek).toBeVisible();
    await expect(rowValue(peek, 'Thời gian')).toHaveText('05/06/2027 · 09:00–11:00');
    await expect(rowValue(peek, 'Ghi chú')).toHaveText('Lớp buổi sáng');
    await expect(peek.getByRole('link')).toHaveCount(0);

    // Chỉnh sửa → hộp sửa cũ, điền sẵn dữ liệu lịch.
    await peek.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Cập nhật lịch trình' });
    await expect(edit).toBeVisible();
    await expect(edit.getByLabel(/^Tên/)).toHaveValue('Học tiếng Anh');
    await expect(edit.getByLabel(/^Giờ bắt đầu/)).toHaveValue('09:00');
    await expect(edit.getByLabel(/^Giờ kết thúc/)).toHaveValue('11:00');
    await edit.getByRole('button', { name: 'Huỷ', exact: true }).click();
    await expect(edit).toBeHidden();

    // Xoá cần bấm hai lần (lần đầu đổi thành "Bấm lần nữa để xoá") → lịch biến mất, danh sách đếm 0.
    await card.click();
    await expect(peek.getByText('Lịch bận', { exact: true })).toBeVisible();
    await peek.getByRole('button', { name: 'Xoá', exact: true }).click();
    await expect(card).toHaveCount(1);
    await peek.getByRole('button', { name: 'Bấm lần nữa để xoá' }).click();
    await expect(page.getByText('Đã xoá lịch trình').first()).toBeVisible();
    await expect(card).toHaveCount(0);
    await expect(page.locator('summary', { hasText: 'Tất cả lịch trình (0)' })).toBeVisible();
  });

  test('"Tất cả lịch trình (n)" thu gọn mặc định, mở ra có hàng sửa / xoá', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot({ scheduleBlocks: [blockFriday()] }));
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    const summary = page.locator('summary', { hasText: 'Tất cả lịch trình (1)' });
    await expect(summary).toBeVisible();
    const details = page.locator('details', { has: summary });
    await expect(details).not.toHaveAttribute('open', '');
    await expect(details.getByRole('button', { name: 'Chỉnh sửa', exact: true })).toBeHidden();

    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details.getByText('Học tiếng Anh')).toBeVisible();
    await expect(details.getByRole('button', { name: 'Chỉnh sửa', exact: true })).toBeVisible();
    await expect(details.getByRole('button', { name: 'Xoá', exact: true })).toBeVisible();
  });

  test('tuần trống → lớp phủ "Tìm ca" + "Thêm lịch trình"; Danh sách hiện đủ 7 ngày trống', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);

    await expect(page.getByText('Tuần này chưa có ca hay lịch bận nào.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tìm ca', exact: true })).toHaveAttribute('href', '/shifts');
    // Toolbar + lớp phủ đều có "Thêm lịch trình"; nút trong lớp phủ mở hộp thêm.
    const addButtons = page.getByRole('button', { name: 'Thêm lịch trình', exact: true });
    await expect(addButtons).toHaveCount(2);
    await addButtons.last().click();
    const dialog = page.getByRole('dialog', { name: 'Thêm lịch trình của bạn' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click();
    await expect(dialog).toBeHidden();

    await viewButton(page, 'Danh sách').click();
    await expect(viewButton(page, 'Danh sách')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Ngày trống.', { exact: true })).toHaveCount(7);
    // Mỗi ngày trống có "Tìm ca" + "Thêm lịch trình".
    await expect(page.getByRole('link', { name: 'Tìm ca', exact: true })).toHaveCount(7);
    await expect(addButtons).toHaveCount(1 + 7);

    // Ngày đầu danh sách = hôm nay (02/06/2027) — thêm lịch điền sẵn ngày đó.
    await addButtons.nth(1).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/^Ngày/)).toHaveValue('02/06/2027');
  });
});

test.describe('Lịch thiết kế lại — nhà tuyển dụng', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('tóm tắt tuần + bấm ca → hộp chi tiết có số người và link quản lý ca; cột phải không có nút đăng ca', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const approved = approvedAfternoonShift();
    await seedState(buildSnapshot({ shifts: [approved.shift], applications: [approved.app] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/schedule');
    await expect(page.getByRole('heading', { level: 1, name: 'Lịch tuyển dụng' })).toBeVisible();

    const dl = page.locator('dl[aria-label="Tóm tắt tuần đang xem"]');
    const value = (label: string) => ddFor(dl, label);
    await expect(value('Ca trong tuần')).toHaveText('1');
    await expect(value('Người đã nhận / cần')).toHaveText('1/2');
    await expect(value('Ca còn thiếu người')).toHaveText('1');

    // Chỉ toolbar có "Đăng ca cần tuyển"; cột phải không còn nút đăng ca phụ.
    const sidebar = page.getByRole('complementary', { name: 'Calendar sidebar' });
    await expect(sidebar.getByRole('link', { name: /Đăng ca cần tuyển/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Đăng ca cần tuyển', exact: true })).toHaveCount(1);

    await page.locator('button[title^="Ca chiều phục vụ"]').click();
    const peek = page.getByRole('dialog', { name: 'Ca chiều phục vụ' });
    await expect(peek).toBeVisible();
    await expect(page).toHaveURL(/\/employer\/schedule$/);
    await expect(rowValue(peek, 'Thời gian')).toHaveText('03/06/2027 · 13:00–17:00');
    await expect(rowValue(peek, 'Địa điểm')).toHaveText('12 Nguyễn Huệ, Quận 1, TP.HCM');
    await expect(rowValue(peek, 'Người đã nhận')).toHaveText('1/2');
    await expect(peek.getByText('Check-in mở từ 12:45, 15 phút trước giờ bắt đầu.')).toBeVisible();
    // Badge trạng thái có nhãn chữ (không chỉ màu): `shift.lifecycle.Published` + cọc.
    await expect(peek.getByText('Đang tuyển', { exact: true })).toBeVisible();
    await expect(peek.getByText('Đã giữ cọc', { exact: true })).toBeVisible();
    await expect(peek.getByRole('link', { name: 'Mở trang quản lý ca →' })).toHaveAttribute(
      'href',
      `/employer/shifts/${approved.shift.id}`,
    );
  });

  test('tuần trống → lớp phủ "Đăng ca cần tuyển"; Danh sách: 7 ngày trống có link đăng ca', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/schedule');

    await expect(page.getByText('Tuần này chưa có ca nào.')).toBeVisible();
    const overlay = page.locator('div', { has: page.getByText('Tuần này chưa có ca nào.') }).last();
    await expect(overlay.getByRole('link', { name: 'Đăng ca cần tuyển', exact: true })).toHaveAttribute(
      'href',
      '/employer/shifts/new',
    );

    await viewButton(page, 'Danh sách').click();
    await expect(page.getByText('Ngày trống.', { exact: true })).toHaveCount(7);
    const dayLinks = page
      .locator('section', { has: page.getByText('Ngày trống.', { exact: true }) })
      .getByRole('link', { name: 'Đăng ca cần tuyển', exact: true });
    await expect(dayLinks).toHaveCount(7);
    await expect(dayLinks.first()).toHaveAttribute('href', '/employer/shifts/new');
  });
});

test.describe('Lịch thiết kế lại — điện thoại + ngôn ngữ', () => {
  for (const path of ['/worker/schedule', '/employer/schedule'] as const) {
    test(`375px ${path}: mặc định "Danh sách", không tràn ngang`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.clock.setFixedTime(new Date(ANCHOR_ISO));
      const approved = approvedAfternoonShift();
      await seedState(buildSnapshot({ shifts: [approved.shift], applications: [approved.app] }));
      await loginAs(path.startsWith('/worker') ? ACCOUNTS.worker.id : ACCOUNTS.employer.id);
      await gotoApp(path);

      await expect(viewButton(page, 'Danh sách')).toHaveAttribute('aria-pressed', 'true');
      await expect(viewButton(page, 'Tuần')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByText('Ngày trống.', { exact: true }).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('nút chế độ: "Danh sách" (VI) / "List" (EN)', async ({
    page,
    context,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await openWorkerSchedule(page, gotoApp);
    await expect(viewButton(page, 'Danh sách')).toBeVisible();
    await expect(viewButton(page, 'Agenda')).toHaveCount(0);

    const baseURL = test.info().project.use.baseURL!;
    await context.addCookies([{ name: 'cale.lang', value: 'en', url: baseURL }]);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(viewButton(page, 'List')).toBeVisible();
    await expect(viewButton(page, 'Danh sách')).toHaveCount(0);
  });
});

type Scope = ReturnType<Page['locator']>;

/** `dd` ngay sau `dt` có nhãn đúng `label` (không phụ thuộc lớp bọc của từng mục). */
function ddFor(scope: Scope, label: string) {
  return scope
    .locator('dt')
    .filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`) })
    .locator('xpath=following-sibling::dd[1]');
}

/** Giá trị của một hàng trong hộp chi tiết. */
function rowValue(scope: Scope, label: string) {
  return ddFor(scope, label);
}
