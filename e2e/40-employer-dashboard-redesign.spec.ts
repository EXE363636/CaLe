import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication, buildWorker } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * Dashboard nhà tuyển dụng (03/10 — làm lại lần 2, cùng khung DashboardFrame với dashboard
 * người lao động):
 *
 *   - Đầu trang: h1 = tên doanh nghiệp; dòng trạng thái ưu tiên: "{n} đơn đang chờ bạn
 *     duyệt." → "Ca tiếp theo bắt đầu …" (chỉ ca CHƯA bắt đầu, theo `startsIn` giờ địa
 *     phương — ca đang diễn ra không tính) → lời chào cũ. Nút phụ: trợ giúp + "Lịch tuyển
 *     dụng". Nút cam "Đăng ca cần tuyển" đã bỏ khỏi đầu trang (thanh điều hướng có "Đăng ca").
 *   - Hàng thẻ `<section aria-label="Tóm tắt của bạn">`: mỗi ô số là một thẻ `<button>` riêng
 *     — "Ca đã đăng" → hộp "Tất cả ca đã đăng"; "Ca đã hoàn thành" → hộp "Ca đã hoàn thành";
 *     (local) "Tiền công đã trả" → hộp "Tóm tắt thanh toán". Thẻ CUỐI là ô ví (#wallet,
 *     WalletPanel variant="tile": "Ví tiền", số dư, "Nạp tiền vào ví" / "Rút tiền" / "Xem
 *     lịch sử giao dịch"). Ô "Ca đang hoạt động" / "Đơn chờ duyệt" cũ đã bỏ.
 *   - Khối một cột: "Ca làm sắp tới" (+ số đếm; trống → thẻ trắng có link "Đăng ca cần
 *     tuyển →"), "Đơn chờ duyệt" (luôn hiện; gom theo ca: "{n} người: Tên1, Tên2" + "Xem &
 *     duyệt"), "Đánh giá về bạn" + số đếm (#employer-received-reviews: "4,7 ★ trung bình từ n
 *     đánh giá", link "Cách đánh giá sau ca", tối đa 2 nhận xét mới nhất, sao có aria-label
 *     "{n} sao"). Không còn cột phụ / bảng thông báo.
 *   - 375px: lưới 2 cột (ô số lẻ cuối + ô ví trải 2 cột), không tràn ngang, số dài xuống dòng.
 *
 * Thời gian: `page.clock.setFixedTime(ANCHOR)` (thứ Tư 02/06/2027 12:00 ICT).
 */

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 375, height: 812 };

const COMPANY = 'Quán Phở Hà';

const SECOND_WORKER = buildWorker({
  id: 'worker-e2e-002',
  email: 'binh.tran@example.com',
  phone: '+84905444002',
  fullName: 'Trần Thị Bình',
});

/** Ca sắp tới đã đăng: thứ Năm 10/06/2027 11:00–14:00 (sau ANCHOR). */
function upcomingShift(over: Record<string, unknown> = {}) {
  return buildShift({
    id: 'e2e-ed-upcoming',
    title: 'Phục vụ quán phở giờ trưa',
    date: '2027-06-10',
    startTime: '11:00',
    endTime: '14:00',
    ...over,
  });
}

/** Ca đã hoàn thành có một người được xác nhận (backfill ví → "Tiền công đã trả"). */
function completedShiftWithPayout(payout: number) {
  const shift = buildShift({
    id: 'e2e-ed-completed',
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
    id: 'e2e-ed-completed-app',
    shiftId: shift.id,
    status: 'Confirmed',
    confirmedAt: '2027-05-20T15:00:00.000Z',
    payoutAmount: payout,
  });
  return { shift, app };
}

function feedback(id: string, stars: number, comment = 'Chủ quán thân thiện.', createdAt = '2027-05-21T03:00:00.000Z') {
  return {
    id,
    shiftId: 'e2e-ed-completed',
    applicationId: `${id}-app`,
    fromUserId: ACCOUNTS.worker.id,
    toEmployerId: ACCOUNTS.employer.id,
    stars,
    comment,
    tags: [],
    createdAt,
  };
}

async function openDashboard(page: Page, gotoApp: (p: string) => Promise<void>) {
  await gotoApp('/employer/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: COMPANY })).toBeVisible();
}

function statsCard(page: Page) {
  return page.getByRole('region', { name: 'Tóm tắt của bạn' });
}

/** Các thẻ số (nút con trực tiếp của hàng thẻ — không tính nút trong ô ví). */
function statCards(page: Page) {
  return statsCard(page).locator(':scope > button');
}

function pendingSection(page: Page) {
  return page.locator('#employer-pending-apps');
}

function dashboardHeader(page: Page) {
  return page.locator('main header').filter({ has: page.getByRole('heading', { level: 1, name: COMPANY }) });
}

test.describe('Dashboard nhà tuyển dụng — làm lại', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('dòng trạng thái nói ca tiếp theo; h1 là tên doanh nghiệp', async ({ page, seedState, loginAs, gotoApp }) => {
    await seedState(buildSnapshot({ shifts: [upcomingShift()] }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    await expect(dashboardHeader(page).getByText('Ca tiếp theo bắt đầu 10/06/2027 lúc 11:00.', { exact: true })).toBeVisible();

    const active = page.locator('#employer-active-shifts');
    await expect(active.getByRole('heading', { level: 2, name: /^Ca làm sắp tới\s*1$/ })).toBeVisible();
    await expect(active.getByText('Phục vụ quán phở giờ trưa').first()).toBeVisible();
  });

  test('có ca sắp tới VÀ đơn chờ → dòng trạng thái ưu tiên số đơn chờ duyệt', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const shift = upcomingShift();
    const apps = [
      buildApplication({ id: 'e2e-ed-p1', shiftId: shift.id, workerId: ACCOUNTS.worker.id, status: 'Pending' }),
      buildApplication({ id: 'e2e-ed-p2', shiftId: shift.id, workerId: SECOND_WORKER.id, status: 'Pending' }),
    ];
    const base = buildSnapshot();
    await seedState(buildSnapshot({ users: [...base.users, SECOND_WORKER], shifts: [shift], applications: apps }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const header = dashboardHeader(page);
    await expect(header.getByText('2 đơn đang chờ bạn duyệt.', { exact: true })).toBeVisible();
    await expect(header.getByText(/^Ca tiếp theo bắt đầu/)).toHaveCount(0);
  });

  test('ca đang diễn ra không phải "ca tiếp theo": dòng trạng thái nói ca chưa bắt đầu', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    // Ca hôm nay 10:00–14:00 đang diễn ra lúc ANCHOR (12:00), có một người đã nhận.
    const live = buildShift({
      id: 'e2e-ed-live',
      title: 'Phụ bếp ca trưa hôm nay',
      date: '2027-06-02',
      startTime: '10:00',
      endTime: '14:00',
      positionsFilled: 1,
    });
    const liveApp = buildApplication({ id: 'e2e-ed-live-app', shiftId: live.id, status: 'Approved' });
    await seedState(buildSnapshot({ shifts: [live, upcomingShift()], applications: [liveApp] }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const header = dashboardHeader(page);
    await expect(header.getByText('Ca tiếp theo bắt đầu 10/06/2027 lúc 11:00.', { exact: true })).toBeVisible();
    await expect(header.getByText(/02\/06\/2027/)).toHaveCount(0);
    // Ca đang diễn ra vẫn nằm trong "Ca làm sắp tới" (2 ca hoạt động).
    await expect(page.locator('#employer-active-shifts').getByRole('heading', { level: 2 })).toHaveText('Ca làm sắp tới 2');
  });

  test('chỉ có ca đang diễn ra → lời chào "đang có n ca làm hoạt động", không "Ca tiếp theo"', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const live = buildShift({
      id: 'e2e-ed-live',
      title: 'Phụ bếp ca trưa hôm nay',
      date: '2027-06-02',
      startTime: '10:00',
      endTime: '14:00',
      positionsFilled: 1,
    });
    const liveApp = buildApplication({ id: 'e2e-ed-live-app', shiftId: live.id, status: 'Approved' });
    await seedState(buildSnapshot({ shifts: [live], applications: [liveApp] }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const header = dashboardHeader(page);
    await expect(
      header.getByText('Bạn đang có 1 ca làm hoạt động. Theo dõi trạng thái và đơn ứng tuyển bên dưới.', { exact: true }),
    ).toBeVisible();
    await expect(header.getByText(/^Ca tiếp theo bắt đầu/)).toHaveCount(0);
  });

  test('không có ca, không có đơn → lời chào cũ; khối trống có link đăng ca', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    await expect(
      dashboardHeader(page).getByText('Chưa có ca làm nào hoạt động. Đăng ca mới để bắt đầu nhận đơn ứng tuyển.', {
        exact: true,
      }),
    ).toBeVisible();

    const active = page.locator('#employer-active-shifts');
    // Không có số đếm khi trống.
    await expect(active.getByRole('heading', { level: 2, name: 'Ca làm sắp tới', exact: true })).toBeVisible();
    const postLink = active.getByRole('link', { name: /^Đăng ca cần tuyển/ });
    await expect(postLink).toBeVisible();
    await expect(postLink).toHaveAttribute('href', '/employer/shifts/new');

    // "Đơn chờ duyệt" luôn hiện, kể cả khi trống.
    const pending = pendingSection(page);
    await expect(pending.getByRole('heading', { level: 2, name: 'Đơn chờ duyệt', exact: true })).toBeVisible();
    await expect(pending.getByText('Chưa có đơn nào chờ duyệt. Đơn mới sẽ hiện ở đây.', { exact: true })).toBeVisible();
    await expect(pending.getByRole('link', { name: 'Xem & duyệt' })).toHaveCount(0);
  });

  test('đầu trang: không còn nút "Đăng ca cần tuyển" (chỉ thanh điều hướng có "Đăng ca")', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot({ shifts: [upcomingShift()] }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const header = dashboardHeader(page);
    await expect(header).toHaveCount(1);
    await expect(header.getByRole('link', { name: 'Lịch tuyển dụng', exact: true })).toBeVisible();
    await expect(header.getByRole('link', { name: /Đăng ca/ })).toHaveCount(0);
    await expect(header.locator('a[href="/employer/shifts/new"]')).toHaveCount(0);
    // Có ca sắp tới → trong <main> không còn link đăng ca nào.
    await expect(page.locator('main').getByRole('link', { name: /Đăng ca cần tuyển/ })).toHaveCount(0);

    // Thanh điều hướng (ngoài <main>) vẫn có nút "Đăng ca".
    const navPost = page.getByRole('banner').getByRole('link', { name: 'Đăng ca', exact: true });
    await expect(navPost).toBeVisible();
    await expect(navPost).toHaveAttribute('href', '/employer/shifts/new');
  });

  test('ô số trong "Tóm tắt của bạn" mở đúng hộp: đã đăng / đã hoàn thành / thanh toán', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const done = completedShiftWithPayout(405000);
    await seedState(buildSnapshot({ shifts: [upcomingShift(), done.shift], applications: [done.app] }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const stats = statsCard(page);
    await expect(stats).toBeVisible();
    await expect(statCards(page)).toHaveCount(3);
    // Ô cũ đã bỏ; nhãn tiền không còn viết hoa toàn bộ.
    for (const gone of ['Ca đang hoạt động', 'Đơn chờ duyệt', 'TỔNG TIỀN CÔNG ĐÃ THANH TOÁN', 'TỔNG TIỀN CÔNG CHỜ THANH TOÁN']) {
      await expect(stats.getByText(gone, { exact: true })).toHaveCount(0);
    }

    const cases: Array<{ label: string; name: RegExp; value: string; dialog: string; inDialog: string[] }> = [
      {
        label: 'Ca đã đăng',
        name: /^Ca đã đăng\s*2$/,
        value: '2',
        dialog: 'Tất cả ca đã đăng',
        inDialog: ['Phục vụ quán phở giờ trưa', 'Rửa bát ca tối'],
      },
      { label: 'Ca đã hoàn thành', name: /^Ca đã hoàn thành\s*1$/, value: '1', dialog: 'Ca đã hoàn thành', inDialog: ['Rửa bát ca tối'] },
      {
        label: 'Tiền công đã trả',
        name: /^Tiền công đã trả\s*405\.000 đ$/,
        value: '405.000 đ',
        dialog: 'Tóm tắt thanh toán',
        inDialog: ['Tiền công chờ thanh toán', 'Tiền công đã trả'],
      },
    ];
    for (const c of cases) {
      const btn = statCards(page).filter({ has: page.getByText(c.label, { exact: true }) });
      await expect(btn).toHaveCount(1);
      await expect(btn).toHaveAccessibleName(c.name);
      await expect(btn).toContainText(c.value);
      await expect(btn).toContainText('Xem chi tiết →');
      await btn.click();
      const dialog = page.getByRole('dialog', { name: c.dialog });
      await expect(dialog).toBeVisible();
      for (const text of c.inDialog) {
        await expect(dialog.getByText(text, { exact: true }).first()).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }

    // Ô ví: thẻ cuối của cùng hàng — số dư + 3 nút chữ, không có danh sách giao dịch.
    const wallet = stats.locator('#wallet');
    await expect(wallet).toBeVisible();
    expect(await stats.evaluate((s) => !!s.lastElementChild?.querySelector('#wallet'))).toBe(true);
    await expect(wallet.getByText('Ví tiền', { exact: true })).toBeVisible();
    for (const name of ['Nạp tiền vào ví', 'Rút tiền', 'Xem lịch sử giao dịch']) {
      await expect(wallet.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(wallet.getByText('Giao dịch gần đây')).toHaveCount(0);

    // Desktop: 4 thẻ một hàng, cao bằng nhau.
    const boxes = await stats.evaluate((s) =>
      Array.from(s.children).map((el) => {
        // Ô ví: đo thẻ thấy được (#wallet > section), không phải ô lưới bọc ngoài.
        const card = el.tagName === 'BUTTON' ? el : (el.querySelector('#wallet > section') as HTMLElement);
        const r = card.getBoundingClientRect();
        return { top: r.top, height: r.height };
      }),
    );
    expect(boxes).toHaveLength(4);
    expect(Math.max(...boxes.map((b) => b.top)) - Math.min(...boxes.map((b) => b.top))).toBeLessThanOrEqual(1);
    expect(Math.max(...boxes.map((b) => b.height)) - Math.min(...boxes.map((b) => b.height))).toBeLessThanOrEqual(1);
  });

  test('đơn chờ duyệt gom theo ca: 2 người một ca → một dòng "2 người:" + link duyệt', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const busy = upcomingShift();
    const other = buildShift({
      id: 'e2e-ed-other',
      title: 'Thu ngân cửa hàng tiện lợi',
      date: '2027-06-12',
      startTime: '08:00',
      endTime: '12:00',
    });
    const apps = [
      buildApplication({ id: 'e2e-ed-a1', shiftId: busy.id, workerId: ACCOUNTS.worker.id, status: 'Pending' }),
      buildApplication({ id: 'e2e-ed-a2', shiftId: busy.id, workerId: SECOND_WORKER.id, status: 'Pending' }),
      buildApplication({ id: 'e2e-ed-a3', shiftId: other.id, workerId: SECOND_WORKER.id, status: 'Pending' }),
    ];
    const base = buildSnapshot();
    await seedState(buildSnapshot({ users: [...base.users, SECOND_WORKER], shifts: [busy, other], applications: apps }));
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const pending = pendingSection(page);
    await expect(pending.getByRole('heading', { level: 2, name: /^Đơn chờ duyệt\s*3$/ })).toBeVisible();
    // Một dòng mỗi ca (2 ca), không phải một dòng mỗi đơn (3 đơn).
    const rows = pending.getByRole('listitem');
    await expect(rows).toHaveCount(2);

    const busyRow = rows.filter({ hasText: 'Phục vụ quán phở giờ trưa' });
    await expect(busyRow).toHaveCount(1);
    await expect(busyRow).toContainText('10/06/2027');
    await expect(busyRow).toContainText('11:00–14:00');
    await expect(busyRow.getByText('2 người:', { exact: true })).toBeVisible();
    await expect(busyRow).toContainText('Nguyễn Văn An');
    await expect(busyRow).toContainText('Trần Thị Bình');
    const review = busyRow.getByRole('link', { name: 'Xem & duyệt' });
    await expect(review).toHaveAttribute('href', `/employer/shifts/${busy.id}`);

    const otherRow = rows.filter({ hasText: 'Thu ngân cửa hàng tiện lợi' });
    await expect(otherRow.getByText('1 người:', { exact: true })).toBeVisible();
    await expect(otherRow).toContainText('Trần Thị Bình');
    await expect(otherRow).not.toContainText('Nguyễn Văn An');
    await expect(otherRow.getByRole('link', { name: 'Xem & duyệt' })).toHaveAttribute('href', `/employer/shifts/${other.id}`);

    // Dòng sắp theo giờ bắt đầu: ca 10/06 trước ca 12/06.
    await expect(rows.first()).toContainText('Phục vụ quán phở giờ trưa');

    await review.click();
    await expect(page).toHaveURL(new RegExp(`/employer/shifts/${busy.id}$`));
  });

  test('"Đánh giá về bạn": số đếm ở tiêu đề, trung bình sao, 2 nhận xét mới nhất có nhãn "{n} sao"', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(
      buildSnapshot({
        employerFeedback: [
          feedback('e2e-ed-fb1', 5, 'Nhận xét cũ nhất, không hiện.', '2027-05-10T03:00:00.000Z'),
          feedback('e2e-ed-fb2', 4, 'Trả công đúng hẹn.', '2027-05-21T03:00:00.000Z'),
          feedback('e2e-ed-fb3', 5, 'Chủ quán thân thiện.', '2027-05-28T03:00:00.000Z'),
        ],
      }),
    );
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const card = page.locator('#employer-received-reviews');
    await expect(page.getByRole('region', { name: 'Đánh giá về bạn' })).toHaveCount(1);
    // Dấu cách trước số đếm.
    await expect(card.getByRole('heading', { level: 2 })).toHaveText('Đánh giá về bạn 3');
    await expect(card.getByRole('link', { name: /^Xem chi tiết/ })).toHaveAttribute('href', '/employer/profile');
    // 14/3 = 4,67 → "4,7".
    await expect(card.getByText('4,7', { exact: true })).toBeVisible();
    await expect(card.getByText('trung bình từ 3 đánh giá', { exact: true })).toBeVisible();
    await expect(card.getByText(/^Chưa có đánh giá/)).toHaveCount(0);
    await expect(card.getByRole('link', { name: /^Cách đánh giá sau ca/ })).toHaveAttribute('href', '/for-employers#employer-reviews');

    // Tối đa 2 nhận xét, mới nhất trước; sao có nhãn chữ.
    const comments = card.getByRole('listitem');
    await expect(comments).toHaveCount(2);
    await expect(comments.nth(0)).toContainText('Chủ quán thân thiện.');
    await expect(comments.nth(1)).toContainText('Trả công đúng hẹn.');
    await expect(card.getByText('Nhận xét cũ nhất, không hiện.')).toHaveCount(0);
    await expect(comments.nth(0).locator('[aria-label]')).toHaveAttribute('aria-label', '5 sao');
    await expect(comments.nth(1).locator('[aria-label]')).toHaveAttribute('aria-label', '4 sao');
  });

  test('"Đánh giá về bạn": chưa có đánh giá → câu "Chưa có đánh giá…"', async ({ page, seedState, loginAs, gotoApp }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const card = page.getByRole('region', { name: 'Đánh giá về bạn' });
    await expect(card.getByText(/^Chưa có đánh giá\./)).toBeVisible();
    await expect(card.getByText(/trung bình từ/)).toHaveCount(0);
    await expect(card.getByRole('link', { name: /^Cách đánh giá sau ca/ })).toHaveAttribute('href', '/for-employers#employer-reviews');
  });
});

test.describe('Dashboard nhà tuyển dụng — điện thoại 375px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('lưới 2 cột (ô lẻ cuối + ô ví trải 2 cột); tiền công ≥ 10.000.000 đ xuống dòng trong thẻ, không tràn', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const done = completedShiftWithPayout(12345000);
    const busy = upcomingShift();
    const apps = [
      done.app,
      buildApplication({ id: 'e2e-ed-m1', shiftId: busy.id, workerId: ACCOUNTS.worker.id, status: 'Pending' }),
      buildApplication({ id: 'e2e-ed-m2', shiftId: busy.id, workerId: SECOND_WORKER.id, status: 'Pending' }),
    ];
    const base = buildSnapshot();
    await seedState(
      buildSnapshot({
        users: [...base.users, SECOND_WORKER],
        shifts: [busy, done.shift],
        applications: apps,
        employerFeedback: [feedback('e2e-ed-fb1', 5)],
      }),
    );
    await loginAs(ACCOUNTS.employer.id);
    await openDashboard(page, gotoApp);

    const stats = statsCard(page);
    await expect(statCards(page).filter({ hasText: 'Tiền công đã trả' })).toContainText('12.345.000 đ');
    // Số dư ví dài (≥ 10 triệu) ở ô ví: xem spec 39 (ví người lao động). Ở đây không seed
    // sổ ví để app tự backfill "Tiền công đã trả" từ đơn đã xác nhận.
    await expect(stats.locator('#wallet')).toContainText('Ví tiền');
    await expect(pendingSection(page).getByText('2 người:', { exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const m = await stats.evaluate((section) => {
      const tiles = Array.from(section.children).map((el) => {
        const isStat = el.tagName === 'BUTTON';
        const card = (isStat ? el : el.querySelector('#wallet > section')) as HTMLElement;
        const value = (isStat ? card.querySelectorAll(':scope > span')[1] : card.querySelectorAll(':scope > p')[1]) as HTMLElement;
        const c = card.getBoundingClientRect();
        const v = value.getBoundingClientRect();
        return {
          kind: isStat ? 'stat' : 'wallet',
          text: value.textContent ?? '',
          scroll: card.scrollWidth,
          client: card.clientWidth,
          top: c.top,
          width: c.width,
          left: c.left,
          right: c.right,
          valueLeft: v.left,
          valueRight: v.right,
        };
      });
      return { sectionWidth: section.getBoundingClientRect().width, tiles };
    });
    expect(m.tiles.map((t) => t.kind)).toEqual(['stat', 'stat', 'stat', 'wallet']);
    for (const c of m.tiles) {
      expect(c.scroll, `thẻ "${c.text}" tràn nội dung`).toBeLessThanOrEqual(c.client + 1);
      expect(c.valueLeft, `số "${c.text}" lệch trái khỏi thẻ`).toBeGreaterThanOrEqual(c.left - 0.5);
      expect(c.valueRight, `số "${c.text}" vượt phải thẻ`).toBeLessThanOrEqual(c.right + 0.5);
    }
    const [a, b, paid, wallet] = m.tiles;
    expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(1);
    expect(a.width).toBeLessThan(m.sectionWidth * 0.6);
    expect(paid.text).toContain('12.345.000');
    expect(paid.top).toBeGreaterThan(a.top);
    expect(paid.width).toBeGreaterThanOrEqual(m.sectionWidth - 1);
    expect(wallet.top).toBeGreaterThan(paid.top);
    expect(wallet.width).toBeGreaterThanOrEqual(m.sectionWidth - 1);
  });
});
