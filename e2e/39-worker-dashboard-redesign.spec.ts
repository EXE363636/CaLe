import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication, buildFunds } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * Dashboard người lao động (03/10 — làm lại lần 2):
 *
 *   - Dòng trạng thái dưới lời chào: ca tiếp theo / số đơn chờ duyệt / lời chào cũ.
 *   - Hàng thẻ `<section aria-label="Tóm tắt của bạn">` (DashboardTiles,
 *     components/dashboard/DashboardFrame): mỗi ô số là MỘT thẻ `<button>` riêng (nhãn, số
 *     lớn, "Xem chi tiết →" aria-hidden) — Ca đã hoàn thành, Tổng thu nhập, Điểm uy tín;
 *     thẻ CUỐI là ô ví (`<div id="wallet">` + WalletPanel variant="tile": "Ví tiền", số dư,
 *     nút chữ "Rút tiền" / "Xem lịch sử giao dịch", không có danh sách giao dịch gần đây).
 *     Các thẻ cao bằng nhau.
 *   - Không còn cột phụ, không còn bảng thông báo trong trang — chỉ chuông trên thanh điều
 *     hướng (dropdown: chấm cam + tiêu đề đậm cho thông báo chưa đọc, giờ tương đối).
 *   - Khối một cột, trải hết bề ngang: "Ca làm sắp tới" (mọi ca trong một lưới 2 cột, gần
 *     nhất trước), "Đơn ứng tuyển" (tab), ..., "Kỹ năng & giữ uy tín" (#worker-skills: link
 *     "Xem chi tiết →" tới hồ sơ, nút "Hạn mức huỷ tuần n/m còn lại", 3 thanh kỹ năng).
 *   - Tiêu đề khối có dấu cách trước số đếm ("Ca làm sắp tới 2").
 *   - 375px: lưới 2 cột; ô số lẻ cuối và ô ví trải 2 cột; không tràn ngang; số dài
 *     (≥ 10.000.000 đ) xuống dòng trong thẻ thay vì tràn.
 *
 * Thời gian: `page.clock.setFixedTime(ANCHOR)` (thứ Tư 02/06/2027 12:00 ICT) — chỉ cố
 * định Date, timer chạy thật (vòng nháy viền khu đơn dùng setTimeout).
 */

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 375, height: 812 };

const REJECT_REASON = 'Đã đủ người cho khung giờ này';

/** Ca đã được duyệt: thứ Năm 10/06/2027 11:00–14:00 (sau ANCHOR). */
function approvedUpcoming() {
  const shift = buildShift({
    id: 'e2e-wd-approved',
    title: 'Phục vụ quán phở giờ trưa',
    date: '2027-06-10',
    startTime: '11:00',
    endTime: '14:00',
    positionsFilled: 1,
  });
  const app = buildApplication({ id: 'e2e-wd-approved-app', shiftId: shift.id, status: 'Approved' });
  return { shift, app };
}

/** Ca đã duyệt thứ hai, xa hơn: thứ Hai 21/06/2027 18:00–22:00. */
function approvedLater() {
  const shift = buildShift({
    id: 'e2e-wd-approved-later',
    title: 'Bảo vệ bãi xe buổi tối',
    date: '2027-06-21',
    startTime: '18:00',
    endTime: '22:00',
    positionsFilled: 1,
  });
  const app = buildApplication({ id: 'e2e-wd-approved-later-app', shiftId: shift.id, status: 'Approved' });
  return { shift, app };
}

/** Một đơn chờ duyệt + một đơn bị từ chối (có lý do). */
function pendingAndRejected() {
  const pendingShift = buildShift({
    id: 'e2e-wd-pending',
    title: 'Thu ngân cửa hàng tiện lợi',
    date: '2027-06-12',
    startTime: '08:00',
    endTime: '12:00',
  });
  const rejectedShift = buildShift({
    id: 'e2e-wd-rejected',
    title: 'Phụ bếp nhà hàng buổi tối',
    date: '2027-06-14',
    startTime: '17:00',
    endTime: '21:00',
  });
  const pendingApp = buildApplication({ id: 'e2e-wd-pending-app', shiftId: pendingShift.id, status: 'Pending' });
  const rejectedApp = buildApplication({
    id: 'e2e-wd-rejected-app',
    shiftId: rejectedShift.id,
    status: 'Rejected',
    rejectionReason: REJECT_REASON,
    rejectedAt: '2027-06-01T09:00:00.000Z',
  });
  return { shifts: [pendingShift, rejectedShift], apps: [pendingApp, rejectedApp] };
}

/** 2 chưa đọc (1 giờ trước, 10/05) + 2 đã đọc (hôm qua 16:05, 01/05). */
function notifications() {
  const base = { userId: ACCOUNTS.worker.id, kind: 'ApplicationApproved' as const };
  return [
    {
      ...base,
      id: 'e2e-wd-n1',
      title: 'Đơn ứng tuyển đã được duyệt',
      body: 'Nhà tuyển dụng đã duyệt đơn của bạn cho ca Phục vụ quán phở giờ trưa.',
      read: false,
      createdAt: '2027-06-02T04:00:00.000Z', // 1 giờ trước ANCHOR
    },
    {
      ...base,
      id: 'e2e-wd-n2',
      kind: 'ApplicationRejected' as const,
      title: 'Đơn ứng tuyển không được chọn',
      body: 'Ca Phụ bếp nhà hàng buổi tối đã đủ người.',
      read: false,
      createdAt: '2027-05-10T03:00:00.000Z', // cũ hơn hôm qua, cùng năm → "10/05"
    },
    {
      ...base,
      id: 'e2e-wd-n4',
      title: 'Nhắc lịch ca sắp tới',
      body: 'Bạn có ca làm vào tuần sau.',
      read: true,
      createdAt: '2027-06-01T09:05:00.000Z', // 16:05 ICT hôm qua → "Hôm qua 16:05"
    },
    {
      ...base,
      id: 'e2e-wd-n3',
      title: 'Chào mừng đến CaLẻ',
      body: 'Hoàn thiện hồ sơ để nhận ca nhanh hơn.',
      read: true,
      createdAt: '2027-05-01T03:00:00.000Z',
    },
  ];
}

async function openDashboard(page: Page, gotoApp: (p: string) => Promise<void>, path = '/worker/dashboard') {
  await gotoApp(path);
  await expect(page.getByRole('heading', { level: 1, name: 'Xin chào, Nguyễn Văn An' })).toBeVisible();
}

function statsRegion(page: Page) {
  return page.getByRole('region', { name: 'Tóm tắt của bạn' });
}

/** Các thẻ số (nút con trực tiếp của hàng thẻ — không tính nút trong ô ví). */
function statCards(page: Page) {
  return statsRegion(page).locator(':scope > button');
}

/** Tên tab = nhãn + dấu cách + số đếm (vd "Chờ duyệt 1"). */
function appTab(page: Page, label: 'Chờ duyệt' | 'Đơn không thành') {
  return page
    .getByRole('tablist', { name: 'Lọc đơn ứng tuyển' })
    .getByRole('tab', { name: new RegExp(`^${label} \\d+$`) });
}

type TileBox = {
  kind: 'stat' | 'wallet';
  text: string;
  left: number;
  right: number;
  top: number;
  height: number;
  width: number;
  scroll: number;
  client: number;
  valueLeft: number;
  valueRight: number;
};

/**
 * Đo từng thẻ của hàng "Tóm tắt của bạn": thẻ số (nút) và ô ví (div con cuối chứa
 * #wallet). Giá trị = span thứ hai của nút / dòng số dư (p thứ hai) của ô ví.
 */
async function measureTiles(page: Page): Promise<{ sectionWidth: number; tiles: TileBox[] }> {
  return statsRegion(page).evaluate((section) => {
    const box = (card: HTMLElement, value: HTMLElement, kind: 'stat' | 'wallet') => {
      const c = card.getBoundingClientRect();
      const v = value.getBoundingClientRect();
      return {
        kind,
        text: value.textContent ?? '',
        left: c.left,
        right: c.right,
        top: c.top,
        height: c.height,
        width: c.width,
        scroll: card.scrollWidth,
        client: card.clientWidth,
        valueLeft: v.left,
        valueRight: v.right,
      };
    };
    const tiles = Array.from(section.children).map((child) => {
      const el = child as HTMLElement;
      if (el.tagName === 'BUTTON') return box(el, el.querySelectorAll(':scope > span')[1] as HTMLElement, 'stat');
      const card = el.querySelector('#wallet > section') as HTMLElement;
      return box(card, card.querySelectorAll(':scope > p')[1] as HTMLElement, 'wallet');
    });
    return { sectionWidth: section.getBoundingClientRect().width, tiles };
  });
}

/** Không thẻ nào tràn nội dung; số nằm trong thẻ; toàn trang không tràn ngang. */
async function expectTilesFit(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const m = await measureTiles(page);
  for (const c of m.tiles) {
    expect(c.scroll, `thẻ "${c.text}" tràn nội dung`).toBeLessThanOrEqual(c.client + 1);
    expect(c.valueLeft, `số "${c.text}" lệch trái khỏi thẻ`).toBeGreaterThanOrEqual(c.left - 0.5);
    expect(c.valueRight, `số "${c.text}" vượt phải thẻ`).toBeLessThanOrEqual(c.right + 0.5);
  }
  return m;
}

/** Trạng thái hiển thị của một dòng trong dropdown chuông. */
async function bellItemLook(item: Locator) {
  return item.evaluate((btn) => {
    const row = btn.firstElementChild as HTMLElement;
    const dot = row.querySelector(':scope > [aria-hidden="true"]') as HTMLElement;
    const title = row.querySelector('p > span') as HTMLElement;
    return {
      dot: getComputedStyle(dot).backgroundColor,
      weight: Number(getComputedStyle(title).fontWeight),
      rowBg: getComputedStyle(row).backgroundColor,
    };
  });
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

test.describe('Dashboard người lao động — làm lại', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('dòng trạng thái nói ca tiếp theo; không còn nút cam "Tìm ca làm ngay" trong trang', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const { shift, app } = approvedUpcoming();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    await expect(page.getByText('Ca tiếp theo bắt đầu 10/06/2027 lúc 11:00.', { exact: true })).toBeVisible();

    const upcoming = page.locator('#worker-upcoming-section');
    await expect(upcoming.getByRole('heading', { level: 2, name: /^Ca làm sắp tới/ })).toBeVisible();
    await expect(upcoming.getByText('Phục vụ quán phở giờ trưa').first()).toBeVisible();

    // Nút cam chỉ còn trên thanh điều hướng — trong <main> không lặp lại.
    await expect(page.locator('main').getByRole('link', { name: 'Tìm ca làm ngay' })).toHaveCount(0);
    await expect(page.locator('main').getByRole('link', { name: 'Lịch cá nhân', exact: true })).toBeVisible();
  });

  test('không có ca sắp tới nhưng có đơn chờ → dòng trạng thái đếm đơn chờ', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const { shifts, apps } = pendingAndRejected();
    await seedState(buildSnapshot({ shifts, applications: apps }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    await expect(page.getByText('1 đơn đang chờ nhà tuyển dụng duyệt.', { exact: true })).toBeVisible();
  });

  test('"Ca làm sắp tới": mọi ca trong một lưới 2 cột, gần nhất trước; tiêu đề có dấu cách trước số', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const near = approvedUpcoming();
    const far = approvedLater();
    const NEAR = 'Phục vụ quán phở giờ trưa';
    const FAR = 'Bảo vệ bãi xe buổi tối';
    // Seed ca xa trước để chắc thứ tự là do app sắp, không do thứ tự seed.
    await seedState(buildSnapshot({ shifts: [far.shift, near.shift], applications: [far.app, near.app] }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    const upcoming = page.locator('#worker-upcoming-section');
    await expect(upcoming.getByRole('heading', { level: 2 })).toHaveText('Ca làm sắp tới 2');
    // Tiêu đề phụ cũ đã bỏ.
    await expect(page.getByText('Các ca đã nhận khác')).toHaveCount(0);
    await expect(upcoming.getByText(NEAR).first()).toBeVisible();
    await expect(upcoming.getByText(FAR).first()).toBeVisible();

    // Một lưới, hai thẻ cạnh nhau (cùng hàng), ca gần nhất ở bên trái.
    const cards = await upcoming.evaluate((section, titles: string[]) => {
      const grid = section.querySelector(':scope > .grid') as HTMLElement;
      return Array.from(grid.children).map((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const text = el.textContent ?? '';
        return { which: titles.find((t) => text.includes(t)) ?? '', left: r.left, top: r.top };
      });
    }, [NEAR, FAR]);
    expect(cards.map((c) => c.which)).toEqual([NEAR, FAR]);
    expect(Math.abs(cards[0].top - cards[1].top)).toBeLessThanOrEqual(1);
    expect(cards[0].left).toBeLessThan(cards[1].left);
  });

  test('hàng "Tóm tắt của bạn": mỗi ô số là một thẻ nút riêng mở đúng hộp; thẻ cuối là ví', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot(buildFunds(ACCOUNTS.worker.id, 1350000)));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    const stats = statsRegion(page);
    await expect(stats).toBeVisible();
    await expect(statCards(page)).toHaveCount(3);
    // Ô cũ đã bỏ khỏi hàng thẻ (hạn mức huỷ chuyển sang "Kỹ năng & giữ uy tín").
    for (const gone of ['Ca sắp tới', 'Đơn chờ duyệt', 'Hạn mức huỷ tuần']) {
      await expect(stats.getByText(gone, { exact: true })).toHaveCount(0);
    }

    // Tên nút = chữ hiển thị (nhãn + số); "Xem chi tiết →" hiện nhưng aria-hidden.
    const cases: Array<{ name: RegExp; dialog: string; value: string }> = [
      { name: /^Ca đã hoàn thành\s*3$/, dialog: 'Ca đã hoàn thành', value: '3' },
      { name: /^Tổng thu nhập\s*1\.350\.000 đ$/, dialog: 'Tổng thu nhập', value: '1.350.000 đ' },
      { name: /^Điểm uy tín\s*90\s*\/ 100$/, dialog: 'Điểm uy tín', value: '90' },
    ];
    for (const c of cases) {
      const btn = statCards(page).filter({ has: page.getByText(c.dialog, { exact: true }) });
      await expect(btn).toHaveCount(1);
      await expect(btn).toHaveAccessibleName(c.name);
      await expect(btn).toContainText(c.value);
      await expect(btn).toContainText('Xem chi tiết →');
      await btn.click();
      const dialog = page.getByRole('dialog', { name: c.dialog });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }

    // Ô ví: thẻ cuối của cùng hàng, gọn — số dư + nút chữ, không có danh sách giao dịch.
    const wallet = stats.locator('#wallet');
    await expect(wallet).toBeVisible();
    expect(await stats.evaluate((s) => !!s.lastElementChild?.querySelector('#wallet'))).toBe(true);
    await expect(wallet.getByText('Ví tiền', { exact: true })).toBeVisible();
    await expect(wallet.getByText('1.350.000 đ', { exact: true })).toBeVisible();
    await expect(wallet.getByRole('button', { name: 'Rút tiền', exact: true })).toBeEnabled();
    await expect(wallet.getByText('Giao dịch gần đây')).toHaveCount(0);
    await expect(wallet.getByText('E2E seed')).toHaveCount(0);
    await wallet.getByRole('button', { name: 'Xem lịch sử giao dịch', exact: true }).click();
    const ledger = page.getByRole('dialog', { name: 'Lịch sử giao dịch ví' });
    await expect(ledger).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(ledger).toBeHidden();

    // Desktop: 4 thẻ trên một hàng, cao bằng nhau.
    const m = await measureTiles(page);
    expect(m.tiles.map((t) => t.kind)).toEqual(['stat', 'stat', 'stat', 'wallet']);
    const tops = m.tiles.map((t) => t.top);
    const heights = m.tiles.map((t) => t.height);
    expect(Math.max(...tops) - Math.min(...tops), 'các thẻ không cùng một hàng').toBeLessThanOrEqual(1);
    expect(Math.max(...heights) - Math.min(...heights), 'các thẻ không cao bằng nhau').toBeLessThanOrEqual(1);
  });

  test('"Kỹ năng & giữ uy tín": link hồ sơ, nút "Hạn mức huỷ tuần" mở hộp hạn mức, 3 thanh kỹ năng', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    const skills = page.locator('#worker-skills');
    await expect(skills.getByRole('heading', { level: 2, name: 'Kỹ năng & giữ uy tín' })).toBeVisible();
    await expect(skills.getByRole('link', { name: /^Xem chi tiết/ })).toHaveAttribute('href', '/worker/profile');

    // Tên nút lấy từ chữ hiển thị: "Hạn mức huỷ tuần 3/3 còn lại".
    const quotaRow = skills.getByRole('button', { name: /^Hạn mức huỷ tuần\s*\d+\/\d+\s*còn lại$/ });
    await expect(quotaRow).toBeVisible();
    // Thanh kỹ năng: nhóm cạnh nút hạn mức trong cùng thẻ.
    expect(await quotaRow.evaluate((btn) => btn.parentElement?.lastElementChild?.children.length ?? 0)).toBe(3);

    await quotaRow.click();
    const dialog = page.getByRole('dialog', { name: 'Hạn mức huỷ tuần' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('tab "Đơn không thành" mới hiện lý do từ chối; "Chờ duyệt" hiện đơn đang chờ', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const { shifts, apps } = pendingAndRejected();
    await seedState(buildSnapshot({ shifts, applications: apps }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    const section = page.locator('#worker-applications-section');
    const tablist = page.getByRole('tablist', { name: 'Lọc đơn ứng tuyển' });
    await expect(tablist.getByRole('tab', { name: 'Chờ duyệt 1', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(tablist.getByRole('tab', { name: 'Đơn không thành 1', exact: true })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    // Chỉ tab đang chọn nằm trong thứ tự Tab; tabpanel gắn với tab đang chọn.
    await expect(appTab(page, 'Chờ duyệt')).toHaveAttribute('tabindex', '0');
    await expect(appTab(page, 'Đơn không thành')).toHaveAttribute('tabindex', '-1');
    await expect(section.getByRole('tabpanel', { name: 'Chờ duyệt 1' })).toBeVisible();
    await expect(section.getByText('Thu ngân cửa hàng tiện lợi')).toBeVisible();
    await expect(section.getByText(REJECT_REASON)).toHaveCount(0);

    await appTab(page, 'Đơn không thành').click();
    await expect(appTab(page, 'Đơn không thành')).toHaveAttribute('aria-selected', 'true');
    await expect(section.getByText(REJECT_REASON)).toBeVisible();
    // Nhãn trạng thái bằng chữ, không chỉ màu.
    await expect(section.getByText('Đơn bị từ chối gần đây')).toBeVisible();
    await expect(section.getByText('Thu ngân cửa hàng tiện lợi')).toHaveCount(0);

    await appTab(page, 'Chờ duyệt').click();
    await expect(section.getByText(REJECT_REASON)).toHaveCount(0);
    await expect(section.getByText('Thu ngân cửa hàng tiện lợi')).toBeVisible();

    // Phím mũi tên chuyển tab và dời tiêu điểm.
    await appTab(page, 'Chờ duyệt').focus();
    await page.keyboard.press('ArrowRight');
    await expect(appTab(page, 'Đơn không thành')).toHaveAttribute('aria-selected', 'true');
    await expect(appTab(page, 'Đơn không thành')).toBeFocused();
    await expect(section.getByText(REJECT_REASON)).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(appTab(page, 'Chờ duyệt')).toHaveAttribute('aria-selected', 'true');
    await expect(appTab(page, 'Chờ duyệt')).toBeFocused();
  });

  test('không có đơn không thành → không có tablist', async ({ page, seedState, loginAs, gotoApp }) => {
    const { shift, app } = approvedUpcoming();
    await seedState(buildSnapshot({ shifts: [shift], applications: [app] }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    await expect(page.locator('#worker-applications-section').getByRole('heading', { name: 'Đơn ứng tuyển' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Lọc đơn ứng tuyển' })).toHaveCount(0);
  });

  test('?section=applications mở khu đơn ở tab "Chờ duyệt"; lối tắt cùng trang cũng kéo về "Chờ duyệt"', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const { shifts, apps } = pendingAndRejected();
    await seedState(buildSnapshot({ shifts, applications: apps }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp, '/worker/dashboard?section=applications');

    const section = page.locator('#worker-applications-section');
    await expect(section).toBeInViewport();
    await expect(appTab(page, 'Chờ duyệt')).toHaveAttribute('aria-selected', 'true');
    await expect(section.getByText('Thu ngân cửa hàng tiện lợi')).toBeVisible();

    // Đang ở "Đơn không thành" → lối tắt "Việc đã ứng tuyển" (cùng trang) về lại "Chờ duyệt".
    await appTab(page, 'Đơn không thành').click();
    await expect(section.getByText(REJECT_REASON)).toBeVisible();
    await page.getByRole('button', { name: 'Mở menu tài khoản' }).hover();
    await expect(page.getByRole('menu', { name: 'Tài khoản' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Việc đã ứng tuyển' }).click();
    await expect(appTab(page, 'Chờ duyệt')).toHaveAttribute('aria-selected', 'true');
    await expect(section.getByText(REJECT_REASON)).toHaveCount(0);
  });

  test('chuông thông báo: chấm cam + tiêu đề đậm cho chưa đọc, giờ tương đối, đánh dấu tất cả đã đọc', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot({ notifications: notifications() }));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    // Bảng thông báo trong trang đã bỏ — chỉ còn chuông trên thanh điều hướng.
    await expect(page.locator('main').getByRole('heading', { name: /^Thông báo/ })).toHaveCount(0);
    await expect(page.locator('section[aria-labelledby="dashboard-notifications"]')).toHaveCount(0);

    const bellButton = page.getByRole('banner').getByRole('button', { name: 'Thông báo', exact: true });
    await expect(bellButton).toHaveAttribute('aria-expanded', 'false');
    await expect(bellButton).toContainText('2'); // số chưa đọc
    await bellButton.click();
    await expect(bellButton).toHaveAttribute('aria-expanded', 'true');
    const bell = page.getByRole('dialog', { name: 'Thông báo' });
    await expect(bell).toBeVisible();
    await expect(bell.getByRole('listitem')).toHaveCount(4);

    const item = (title: string) => bell.getByRole('button', { name: title, exact: true });
    // Mới nhất trước.
    await expect(bell.getByRole('listitem').first()).toContainText('Đơn ứng tuyển đã được duyệt');

    // Giờ tương đối theo ANCHOR (12:00 ICT 02/06/2027).
    await expect(item('Đơn ứng tuyển đã được duyệt').locator('time')).toHaveText('1 giờ trước');
    await expect(item('Nhắc lịch ca sắp tới').locator('time')).toHaveText('Hôm qua 16:05');
    await expect(item('Đơn ứng tuyển không được chọn').locator('time')).toHaveText('10/05');
    await expect(item('Chào mừng đến CaLẻ').locator('time')).toHaveText('01/05');
    await expect(item('Đơn ứng tuyển đã được duyệt').locator('time')).toHaveAttribute(
      'datetime',
      '2027-06-02T04:00:00.000Z',
    );

    // Chuột ra khỏi danh sách để không dính nền hover.
    await page.mouse.move(0, 0);
    // Chưa đọc: chấm cam + tiêu đề đậm, KHÔNG tô nền cả dòng. Đã đọc: không chấm, chữ thường.
    for (const title of ['Đơn ứng tuyển đã được duyệt', 'Đơn ứng tuyển không được chọn']) {
      const look = await bellItemLook(item(title));
      expect(look.dot, `"${title}" thiếu chấm cam`).not.toBe(TRANSPARENT);
      expect(look.weight, `"${title}" không đậm`).toBeGreaterThanOrEqual(600);
      expect(look.rowBg, `"${title}" bị tô nền`).toBe(TRANSPARENT);
    }
    for (const title of ['Nhắc lịch ca sắp tới', 'Chào mừng đến CaLẻ']) {
      const look = await bellItemLook(item(title));
      expect(look.dot, `"${title}" đã đọc mà còn chấm`).toBe(TRANSPARENT);
      expect(look.weight, `"${title}" đã đọc mà còn đậm`).toBeLessThan(600);
      expect(look.rowBg).toBe(TRANSPARENT);
    }

    await bell.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
    await expect(bell.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toHaveCount(0);
    await expect(bellButton).not.toContainText('2');
    // Danh sách vẫn mở và còn đủ 4 thông báo, không còn dòng nào chưa đọc.
    await expect(bell).toBeVisible();
    await expect(bell.getByRole('listitem')).toHaveCount(4);
    for (const title of ['Đơn ứng tuyển đã được duyệt', 'Đơn ứng tuyển không được chọn']) {
      const look = await bellItemLook(item(title));
      expect(look.dot).toBe(TRANSPARENT);
      expect(look.weight).toBeLessThan(600);
    }

    await page.keyboard.press('Escape');
    await expect(bell).toBeHidden();
  });
});

test.describe('Dashboard người lao động — điện thoại 375px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.clock.setFixedTime(new Date(ANCHOR_ISO));
  });

  test('lưới 2 cột: ô số lẻ cuối và ô ví trải 2 cột; không tràn ngang', async ({ page, seedState, loginAs, gotoApp }) => {
    const { shift, app } = approvedUpcoming();
    const extra = pendingAndRejected();
    await seedState(
      buildSnapshot({
        shifts: [shift, ...extra.shifts],
        applications: [app, ...extra.apps],
        notifications: notifications(),
        ...buildFunds(ACCOUNTS.worker.id, 1350000),
      }),
    );
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);
    await expect(statsRegion(page)).toBeVisible();

    const m = await expectTilesFit(page);
    expect(m.tiles.map((t) => t.kind)).toEqual(['stat', 'stat', 'stat', 'wallet']);
    const [a, b, c, wallet] = m.tiles;
    // Hai ô đầu cùng hàng, mỗi ô ~ nửa bề ngang.
    expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(1);
    expect(a.width).toBeLessThan(m.sectionWidth * 0.6);
    // Ô số lẻ cuối + ô ví: hàng riêng, trải hết bề ngang.
    expect(c.top).toBeGreaterThan(a.top);
    expect(wallet.top).toBeGreaterThan(c.top);
    expect(c.width).toBeGreaterThanOrEqual(m.sectionWidth - 1);
    expect(wallet.width).toBeGreaterThanOrEqual(m.sectionWidth - 1);
  });

  test('thu nhập + số dư ≥ 10.000.000 đ: số dài xuống dòng trong thẻ, không tràn ngang', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot(buildFunds(ACCOUNTS.worker.id, 123456000)));
    await loginAs(ACCOUNTS.worker.id);
    await openDashboard(page, gotoApp);

    await expect(statCards(page).filter({ hasText: 'Tổng thu nhập' })).toContainText('123.456.000 đ');
    await expect(statsRegion(page).locator('#wallet')).toContainText('123.456.000 đ');
    const m = await expectTilesFit(page);
    const income = m.tiles.find((c) => c.kind === 'stat' && c.text.includes('123.456.000'));
    const wallet = m.tiles.find((c) => c.kind === 'wallet');
    expect(income, 'không thấy thẻ thu nhập').toBeTruthy();
    expect(wallet?.text).toContain('123.456.000');
  });
});
