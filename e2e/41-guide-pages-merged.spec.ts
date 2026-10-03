import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Gộp 7 trang hướng dẫn nhỏ vào hai trang vai trò (03/10), chế độ local/demo.
 *
 *   1. Bảy đường dẫn cũ chuyển hướng tạm thời (307, `next.config.ts`) tới đúng khối của
 *      `/for-workers` / `/for-employers`; trang cuộn lại MỘT lần ~300 ms sau khi vẽ
 *      (`ToneScroll`) nên tiêu đề khối nằm gần đầu màn hình, dưới header dính
 *      (`.public-skin [id] { scroll-margin-top: 6rem }`).
 *   2. Header khách (03/10, lần 2): "Người lao động ▾" / "Nhà tuyển dụng ▾" lại là menu
 *      thả (cùng `Dropdown` với "Hướng dẫn & hỗ trợ ▾": rê chuột / focus mở, bấm bật-tắt,
 *      role="menu" + "menuitem", mỗi lúc một menu) — danh sách dọc tới từng khối của trang
 *      vai trò (`NAV_GROUPS.workerPublic` / `employerPublic`). Chọn mục → đúng `#khối` gần
 *      đầu màn hình và menu đóng, kể cả khi đang ở chính trang đó. Ngăn kéo điện thoại
 *      (khách): "Chính" = Trang chủ, rồi hai nhóm cùng mục với thanh menu.
 *      03/10 (lần 4): "Nhà tuyển dụng" thêm "Phí dịch vụ" (#employer-pricing); "Hướng dẫn &
 *      hỗ trợ" bỏ "Cách hoạt động" / "Bảng giá" / "Bảo vệ người dùng", thêm "Liên hệ hỗ trợ".
 *      Chạm trên màn cảm ứng rộng: xem e2e/43.
 *   3. Chân trang (03/10, lần 5): lg một hàng logo + giới thiệu · ba cột liên kết "CaLẻ" /
 *      "Người lao động" / "Nhà tuyển dụng" · "Cần hỗ trợ?"; md logo | hỗ trợ, ba cột hàng
 *      dưới; 375px xếp dọc, liên kết 2 cột. Không còn "Bảng giá" (= "Phí dịch vụ") và không
 *      link nào tới trang cũ; hàng pháp lý có tiêu đề ẩn "Pháp lý & hỗ trợ".
 *   4. `ShiftPostPlayground` (/for-employers): ba bước chồng trong một ô (`StageStack`,
 *      cao cố định `h-[43rem] sm:h-[37rem]`) → khung không đổi chiều cao khi đổi bước, khi
 *      bật / tắt "Giả sử 1 người không đến", và suốt lúc tự chạy. Bước 1 cuộn vùng ô điền
 *      bên trong khung theo ô đang gõ (không cuộn trang): xem e2e/42.
 *   5. 375px: hai trang vai trò không cuộn ngang.
 */

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 375, height: 812 };

const REDIRECTS: Array<{ from: string; to: string; target: string; heading: string }> = [
  { from: '/worker/reputation-guide', to: '/for-workers#worker-reputation', target: '#worker-reputation', heading: 'Làm tốt thì được ghi nhận' },
  { from: '/worker/schedule-guide', to: '/for-workers#worker-schedule', target: '#worker-schedule', heading: 'Lịch cá nhân: ca, giờ học, việc riêng ở một chỗ' },
  { from: '/worker/cancellation-policy', to: '/for-workers#worker-cancel', target: '#worker-cancel', heading: 'Cần huỷ ca đã nhận?' },
  // #employer-post là id của section; tiêu đề khối là h2#employer-money.
  { from: '/employer/post-shift-guide', to: '/for-employers#employer-post', target: '#employer-money', heading: 'Một ca tốn bao nhiêu?' },
  { from: '/employer/applicants-guide', to: '/for-employers#employer-applicants', target: '#employer-applicants', heading: 'Duyệt người, theo dõi ngày làm trên một trang' },
  { from: '/employer/payments', to: '/for-employers#employer-payments', target: '#employer-payments', heading: 'Tiền của một ca đi về đâu?' },
  { from: '/employer/reviews', to: '/for-employers#employer-reviews', target: '#employer-reviews', heading: 'Đánh giá hai chiều sau mỗi ca' },
];

/** Mọi đường dẫn đã bỏ: 7 trang hướng dẫn + 4 trang thông tin (03/10, lần 4 — e2e/43). */
const GONE = [...REDIRECTS.map((r) => r.from), '/about', '/how-it-works', '/pricing', '/safety'];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Khoảng cách từ mép trên khung nhìn tới phần tử (px). */
async function topOf(el: Locator): Promise<number> {
  return el.evaluate((node) => node.getBoundingClientRect().top);
}

/** Đáy header dính (px) — tiêu đề khối không được nằm dưới header. */
async function headerBottom(page: Page): Promise<number> {
  return page.locator('header').first().evaluate((node) => node.getBoundingClientRect().bottom);
}

/** Tiêu đề khối nằm gần đầu màn hình: dưới header, trong ~1/3 trên của khung nhìn. */
async function expectNearTop(page: Page, el: Locator, label: string) {
  await expect(el, label).toBeInViewport();
  const hb = await headerBottom(page);
  await expect
    .poll(async () => {
      const top = await topOf(el);
      return top >= hb - 1 && top <= DESKTOP.height / 3;
    }, { message: `${label}: tiêu đề nằm gần đầu màn hình, dưới header` })
    .toBe(true);
}

// ---------------------------------------------------------------------------
// 1. Bảy đường dẫn cũ → đúng khối
// ---------------------------------------------------------------------------

test.describe('Trang hướng dẫn cũ chuyển hướng vào trang vai trò (03/10)', () => {
  test('máy chủ trả 307 kèm Location tới đúng khối', async ({ page, seedState, gotoApp }) => {
    await seedState(buildSnapshot());
    await gotoApp('/login');
    for (const r of REDIRECTS) {
      const res = await page.request.get(r.from, { maxRedirects: 0 });
      expect(res.status(), r.from).toBe(307);
      expect(res.headers()['location'], r.from).toBe(r.to);
    }
  });

  for (const r of REDIRECTS) {
    test(`${r.from} → ${r.to}: tiêu đề "${r.heading}" hiện gần đầu màn hình`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot());
      await gotoApp(r.from);
      await expect(page).toHaveURL(new RegExp(`${escapeRe(r.to)}$`));
      const heading = page.getByRole('heading', { level: 2, name: r.heading, exact: true });
      await expect(heading).toBeVisible();
      await expect(page.locator(r.target)).toHaveText(r.heading);
      await expectNearTop(page, page.locator(r.target), r.from);
    });
  }

  test('khối mới trên /for-workers: lịch cá nhân, huỷ ca, uy tín; không còn #worker-reviews / #worker-care', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
    for (const id of ['worker-schedule', 'worker-cancel', 'worker-reputation', 'worker-reputation-rules']) {
      await expect(main.locator(`#${id}`), id).toHaveCount(1);
    }
    await expect(main.locator('#worker-reputation-rules')).toHaveText('Điểm uy tín tính thế nào?');
    await expect(main.locator('#worker-reviews, #worker-care')).toHaveCount(0);
    // Quy định huỷ chỉ còn ở khối #worker-cancel, không lặp trong khối tiền.
    const money = main.locator('section[aria-labelledby="worker-money"]');
    await expect(money).toHaveCount(1);
    await expect(money).not.toContainText('Cần huỷ ca đã nhận?');
  });

  test('khối mới trên /for-employers: duyệt người, tiền một ca (3 quy tắc ở bản demo), sửa và huỷ ca', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(main.locator('section#employer-post')).toHaveAttribute('aria-labelledby', 'employer-money');
    await expect(main.locator('section#employer-post')).toContainText('Sửa và huỷ ca đã đăng');
    const pay = main.locator('section[aria-labelledby="employer-payments"]');
    // 03/10 (lần 4): thẻ "0 đ Phí dịch vụ" chuyển sang khối giá (#employer-pricing).
    await expect(pay.locator('h3')).toHaveText(['Trả công (mô phỏng)', 'Huỷ đúng quy định', 'Lượt boost']);
    await expect(main.locator('section[aria-labelledby="employer-control"] li h3')).toHaveCount(4);
    await expect(main.locator('section[aria-labelledby="employer-applicants"]')).toHaveCount(1);
    await expect(main).not.toContainText(/VNĐ|₫/);
  });
});

// ---------------------------------------------------------------------------
// 2. Header khách (danh sách dọc theo vai trò) + ngăn kéo điện thoại
// ---------------------------------------------------------------------------

/** Mục danh sách dọc "Người lao động" — giống `WORKER_GROUP_PUBLIC` (NavBar.tsx). */
const WORKER_ITEMS: Array<[string, string]> = [
  ['Tổng quan cho người lao động', '/for-workers'],
  ['Ca đang tuyển', '/for-workers#worker-shifts'],
  ['Tìm ca và ứng tuyển', '/for-workers#worker-apply'],
  ['Lịch cá nhân', '/for-workers#worker-schedule'],
  ['Tiền về tay khi nào', '/for-workers#worker-money'],
  ['Quy định huỷ ca', '/for-workers#worker-cancel'],
  ['Hồ sơ & điểm uy tín', '/for-workers#worker-reputation'],
  ['Câu hỏi thường gặp', '/for-workers#worker-faq'],
];

/** Mục danh sách dọc "Nhà tuyển dụng" — giống `EMPLOYER_GROUP_PUBLIC` (NavBar.tsx). */
const EMPLOYER_ITEMS: Array<[string, string]> = [
  ['Tổng quan cho nhà tuyển dụng', '/for-employers'],
  ['Thử đăng một ca', '/for-employers#employer-post'],
  ['Duyệt người ứng tuyển', '/for-employers#employer-applicants'],
  ['Giữ tiền ca làm', '/for-employers#employer-payments'],
  ['Phí dịch vụ', '/for-employers#employer-pricing'],
  ['Đánh giá sau ca', '/for-employers#employer-reviews'],
  ['Câu hỏi thường gặp', '/for-employers#employer-faq'],
];

function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Main navigation' });
}

function navTrigger(page: Page, name: string): Locator {
  return mainNav(page).getByRole('button', { name, exact: true });
}

/** Rê chuột lên nút để mở danh sách; trả về menu đang mở. */
async function openNavMenu(page: Page, name: string): Promise<Locator> {
  const trigger = navTrigger(page, name);
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByRole('menu', { name, exact: true });
  await expect(menu).toBeVisible();
  return menu;
}

async function expectMenuItems(menu: Locator, items: Array<[string, string]>, label: string) {
  const links = menu.getByRole('menuitem');
  await expect(links, label).toHaveText(items.map(([text]) => text));
  const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs, label).toEqual(items.map(([, href]) => href));
}

/**
 * Chờ cuộn (mượt) dừng hẳn: scrollY không đổi qua hai lần đọc liên tiếp. Từ 03/10 cuộn
 * cùng trang là `scrollIntoView({ behavior: 'smooth' })` (HashLinkHandler, ~1 giây cho
 * quãng dài); lăn chuột trong lúc đang cuộn mượt bị Chromium bỏ qua.
 */
async function waitScrollSettled(page: Page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => window.scrollY);
        const settled = y === last;
        last = y;
        return settled;
      },
      { message: 'cuộn trang dừng hẳn', intervals: [150, 150, 150, 250] },
    )
    .toBe(true);
}

/** Chọn một mục trong danh sách dọc rồi kiểm: đúng URL, menu đóng, khối hiện gần đầu màn hình. */
async function pickNavItem(page: Page, group: string, item: string, url: string, target: string) {
  const menu = await openNavMenu(page, group);
  await menu.getByRole('menuitem', { name: item, exact: true }).click();
  // Đúng nguyên URL (bắt cả lỗi hash chồng "#a#b").
  await expect(page, `${item}: URL`).toHaveURL(new RegExp(`^[^#]*${escapeRe(url)}$`));
  await expect(navTrigger(page, group), `${item}: menu đóng`).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('menu'), `${item}: không còn menu mở`).toHaveCount(0);
  await expectNearTop(page, page.locator(target), `${group} → ${item}`);
  await waitScrollSettled(page);
  // Đã dừng cuộn mà tiêu đề vẫn ở gần đầu màn hình, dưới header.
  await expectNearTop(page, page.locator(target), `${group} → ${item} (sau khi dừng cuộn)`);
}

test.describe('Header khách: danh sách dọc theo vai trò (03/10)', () => {
  test('desktop: "Người lao động" / "Nhà tuyển dụng" / "Hướng dẫn & hỗ trợ" là nút menu thả; rê chuột mở đúng mục, mỗi lúc một menu', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // Đồng hồ giả (chạy theo thời gian thật): bấm nút trong 400ms sau khi rê chuột mở menu
    // bị bỏ qua (chống chạm-đóng-ngay trên màn cảm ứng) → tua đồng hồ thay vì ngủ.
    await page.clock.install();
    await seedState(buildSnapshot());
    await gotoApp('/');
    const nav = mainNav(page);
    await expect(nav).toBeVisible();

    // Ba nút menu thả; hai vai trò không còn là link thẳng.
    await expect(nav.locator('button[aria-haspopup="menu"]')).toHaveText([
      'Người lao động',
      'Nhà tuyển dụng',
      'Hướng dẫn & hỗ trợ',
    ]);
    await expect(nav.getByRole('link', { name: /^(Người lao động|Nhà tuyển dụng)$/ })).toHaveCount(0);
    for (const name of ['Người lao động', 'Nhà tuyển dụng', 'Hướng dẫn & hỗ trợ']) {
      await expect(navTrigger(page, name), name).toHaveAttribute('aria-expanded', 'false');
    }
    await expect(page.getByRole('menu')).toHaveCount(0);

    const workers = await openNavMenu(page, 'Người lao động');
    await expectMenuItems(workers, WORKER_ITEMS, 'Người lao động');

    // Rê sang nút bên cạnh: menu trước đóng, chỉ một menu mở.
    const employers = await openNavMenu(page, 'Nhà tuyển dụng');
    await expectMenuItems(employers, EMPLOYER_ITEMS, 'Nhà tuyển dụng');
    await expect(navTrigger(page, 'Người lao động')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('menu')).toHaveCount(1);

    // Bấm khi đang mở (đã quá 400ms kể từ lúc rê chuột mở) → đóng; bấm lần nữa → mở
    // (chuột vẫn trên nút).
    const trigger = navTrigger(page, 'Nhà tuyển dụng');
    await page.clock.runFor(500);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Esc đóng.
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const help = await openNavMenu(page, 'Hướng dẫn & hỗ trợ');
    // 03/10 (lần 4): "Cách hoạt động" / "Bảng giá" / "Bảo vệ người dùng" đã gộp vào trang chủ,
    // trang nhà tuyển dụng và /support; thêm "Liên hệ hỗ trợ".
    const helpHrefs = await help.getByRole('menuitem').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(helpHrefs).toEqual(['/faq', '/disputes', '/user-guide', '/handbook', '/support']);
    await expect(page.getByRole('menu')).toHaveCount(1);
    // Không menu nào còn link tới 7 trang hướng dẫn cũ hay 4 trang thông tin cũ.
    for (const name of ['Người lao động', 'Nhà tuyển dụng', 'Hướng dẫn & hỗ trợ']) {
      await openNavMenu(page, name);
      for (const from of GONE) await expect(page.locator(`header a[href="${from}"]`), `${name}: ${from}`).toHaveCount(0);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('bàn phím: focus vào nút mở danh sách, Esc đóng', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const trigger = navTrigger(page, 'Người lao động');
    await trigger.focus();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expectMenuItems(page.getByRole('menu', { name: 'Người lao động' }), WORKER_ITEMS, 'focus');
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('từ trang khác: chọn mục → sang trang vai trò, đúng khối gần đầu màn hình, menu đóng', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await pickNavItem(page, 'Người lao động', 'Quy định huỷ ca', '/for-workers#worker-cancel', '#worker-cancel');
    await expect(page.locator('#worker-cancel')).toHaveText('Cần huỷ ca đã nhận?');

    // Từ /for-workers sang khối của trang nhà tuyển dụng.
    await pickNavItem(page, 'Nhà tuyển dụng', 'Giữ tiền ca làm', '/for-employers#employer-payments', '#employer-payments');
    await expect(page.locator('#employer-payments')).toHaveText('Tiền của một ca đi về đâu?');
  });

  test('mục "Tổng quan" → đầu trang vai trò; hash cũ không bám theo URL', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    // Tải thẳng /for-employers#… (tải đầy đủ) rồi chọn "Tổng quan": về đúng /for-employers, đầu trang.
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers#employer-payments');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    let menu = await openNavMenu(page, 'Nhà tuyển dụng');
    await menu.getByRole('menuitem', { name: 'Tổng quan cho nhà tuyển dụng', exact: true }).click();
    await expect(page).toHaveURL(/\/for-employers$/);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();

    // Đã tới /for-workers#worker-cancel bằng menu (điều hướng phía client), sang trang
    // khác, rồi chọn "Tổng quan cho người lao động": phải về /for-workers (không hash), đầu trang.
    await pickNavItem(page, 'Người lao động', 'Quy định huỷ ca', '/for-workers#worker-cancel', '#worker-cancel');
    await pickNavItem(page, 'Nhà tuyển dụng', 'Đánh giá sau ca', '/for-employers#employer-reviews', '#employer-reviews');
    menu = await openNavMenu(page, 'Người lao động');
    await menu.getByRole('menuitem', { name: 'Tổng quan cho người lao động', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page, 'Tổng quan: URL không mang hash cũ').toHaveURL(/\/for-workers$/);
    await expect(page.getByRole('heading', { level: 1 }), 'Tổng quan: đầu trang').toBeInViewport();
    // Rồi chọn một khối khác: URL đúng một hash.
    await pickNavItem(page, 'Người lao động', 'Lịch cá nhân', '/for-workers#worker-schedule', '#worker-schedule');
  });

  test('đang ở /for-workers: chọn mục cùng trang → cuộn tới đúng khối (xuống rồi lên), menu đóng', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const steps: Array<[string, string]> = [
      ['Hồ sơ & điểm uy tín', '#worker-reputation'],
      ['Ca đang tuyển', '#worker-shifts'], // ngược lên
      ['Câu hỏi thường gặp', '#worker-faq'],
      ['Tìm ca và ứng tuyển', '#worker-apply'],
      ['Tiền về tay khi nào', '#worker-money'],
      ['Lịch cá nhân', '#worker-schedule'],
      ['Quy định huỷ ca', '#worker-cancel'],
    ];
    for (const [item, target] of steps) {
      await pickNavItem(page, 'Người lao động', item, `/for-workers${target}`, target);
    }
  });

  test('đang ở /for-workers#worker-cancel, cuộn đi chỗ khác rồi chọn lại "Quy định huỷ ca" → về đúng khối', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await pickNavItem(page, 'Người lao động', 'Quy định huỷ ca', '/for-workers#worker-cancel', '#worker-cancel');
    // Cuộn tay lên trên (hash giữ nguyên), rồi chọn lại cùng mục: như link neo thường, về lại khối.
    await page.mouse.wheel(0, -2500);
    await expect(page.locator('#worker-cancel')).not.toBeInViewport();
    await pickNavItem(page, 'Người lao động', 'Quy định huỷ ca', '/for-workers#worker-cancel', '#worker-cancel');
  });

  test('đang ở /for-employers: chọn mục cùng trang → cuộn tới đúng khối, menu đóng', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const steps: Array<[string, string]> = [
      ['Đánh giá sau ca', '#employer-reviews'],
      ['Thử đăng một ca', '#employer-post'], // ngược lên; tiêu đề khối là h2#employer-money
      ['Câu hỏi thường gặp', '#employer-faq'],
      ['Duyệt người ứng tuyển', '#employer-applicants'],
      ['Giữ tiền ca làm', '#employer-payments'],
    ];
    for (const [item, target] of steps) {
      await pickNavItem(page, 'Nhà tuyển dụng', item, `/for-employers${target}`, target);
    }
  });

  test('ngăn kéo điện thoại (khách): "Chính" = Trang chủ; nhóm "Người lao động" / "Nhà tuyển dụng" cùng mục với thanh menu', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.locator('header').first().getByRole('button', { name: 'Menu' }).click();
    const drawer = page.locator('#mobile-nav-drawer');
    const section = (heading: string) =>
      drawer.locator('section').filter({ has: page.getByText(heading, { exact: true }) });

    await expect(drawer.locator('section > p')).toHaveText([
      'Chính',
      'Người lao động',
      'Nhà tuyển dụng',
      'Hướng dẫn & hỗ trợ',
    ]);
    const main = section('Chính');
    await expect(main.getByRole('link')).toHaveText(['Trang chủ']);
    // 03/10 (lần 4): nhóm hỗ trợ còn FAQ, tranh chấp, hướng dẫn sử dụng, liên hệ hỗ trợ.
    const helpLinks = section('Hướng dẫn & hỗ trợ').getByRole('link');
    await expect(helpLinks).toHaveText(['Câu hỏi thường gặp', 'Xử lý tranh chấp', 'Hướng dẫn sử dụng', 'Liên hệ hỗ trợ']);
    expect(await helpLinks.evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual([
      '/faq',
      '/disputes',
      '/user-guide',
      '/support',
    ]);
    await expect(main.getByRole('link')).toHaveAttribute('href', '/');

    const groups: Array<[string, Array<[string, string]>]> = [
      ['Người lao động', WORKER_ITEMS],
      ['Nhà tuyển dụng', EMPLOYER_ITEMS],
    ];
    for (const [heading, items] of groups) {
      const links = section(heading).getByRole('link');
      await expect(links, heading).toHaveText(items.map(([text]) => text));
      const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
      expect(hrefs, heading).toEqual(items.map(([, href]) => href));
    }
    for (const from of GONE) await expect(drawer.locator(`a[href="${from}"]`), from).toHaveCount(0);
  });

  test('ngăn kéo điện thoại, đang ở /for-workers: chọn "Quy định huỷ ca" → ngăn kéo đóng, khối hiện trong màn hình', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const menuButton = page.locator('header').first().getByRole('button', { name: 'Menu' });
    await menuButton.click();
    const drawer = page.locator('#mobile-nav-drawer');
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    await drawer
      .locator('section')
      .filter({ has: page.getByText('Người lao động', { exact: true }) })
      .getByRole('link', { name: 'Quy định huỷ ca', exact: true })
      .click();
    await page.waitForURL('**/for-workers#worker-cancel');
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('body')).not.toHaveClass(/\bno-scroll\b/);
    const target = page.locator('#worker-cancel');
    await expect(target).toBeInViewport();
    const hb = await headerBottom(page);
    await expect
      .poll(async () => {
        const top = await topOf(target);
        return top >= hb - 1 && top <= MOBILE.height / 2;
      }, { message: 'drawer → #worker-cancel: tiêu đề dưới header, nửa trên màn hình' })
      .toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Chân trang
// ---------------------------------------------------------------------------

test.describe('Chân trang: logo · 3 cột liên kết · "Cần hỗ trợ?" (03/10)', () => {
  // 03/10 (lần 3): bỏ cột "Bắt đầu". 03/10 (lần 4): bốn trang thông tin cũ gộp vào khối
  // của trang chủ / nhà tuyển dụng / hỗ trợ; "Bảo vệ người dùng" đổi thành "Lưu ý an toàn".
  // 03/10 (lần 5): thêm lại hai cột vai trò "Người lao động" / "Nhà tuyển dụng" trỏ tới
  // các khối của trang vai trò; "Bảng giá" bỏ khỏi cột "CaLẻ" (= "Phí dịch vụ").
  const COLUMNS: Array<[string, Array<[string, string]>]> = [
    [
      'CaLẻ',
      [
        ['Giới thiệu', '/#home-about'],
        ['Cách hoạt động', '/#home-how'],
        ['Hướng dẫn sử dụng', '/user-guide'],
        ['Cẩm nang làm việc', '/handbook'],
        ['Lưu ý an toàn', '/support#support-safety'],
        ['Câu hỏi thường gặp', '/faq'],
      ],
    ],
    [
      'Người lao động',
      [
        ['Tìm ca làm', '/shifts'],
        ['Ca đang tuyển', '/for-workers#worker-shifts'],
        ['Lịch cá nhân', '/for-workers#worker-schedule'],
        ['Tiền về tay khi nào', '/for-workers#worker-money'],
        ['Quy định huỷ ca', '/for-workers#worker-cancel'],
        ['Hồ sơ & điểm uy tín', '/for-workers#worker-reputation'],
      ],
    ],
    [
      'Nhà tuyển dụng',
      [
        ['Đăng ca tuyển', '/employer/shifts/new'],
        ['Thử đăng một ca', '/for-employers#employer-post'],
        ['Duyệt người ứng tuyển', '/for-employers#employer-applicants'],
        ['Giữ tiền ca làm', '/for-employers#employer-payments'],
        ['Phí dịch vụ', '/for-employers#employer-pricing'],
        ['Đánh giá sau ca', '/for-employers#employer-reviews'],
      ],
    ],
  ];
  const COLUMN_HEADINGS = COLUMNS.map(([h]) => h);

  function footerParts(page: Page) {
    const footer = page.getByTestId('site-footer');
    const nav = footer.getByRole('navigation', { name: 'Liên kết chân trang' });
    return {
      footer,
      logo: footer.getByRole('link', { name: 'CaLẻ', exact: true }).first(),
      nav,
      help: footer.getByRole('region', { name: 'Cần hỗ trợ?' }),
      column: (heading: string) =>
        nav.locator(':scope > div').filter({ has: page.getByRole('heading', { level: 2, name: heading, exact: true }) }),
    };
  }

  async function boxOf(el: Locator) {
    const b = await el.boundingBox();
    expect(b).not.toBeNull();
    return b as { x: number; y: number; width: number; height: number };
  }

  async function expectNoHorizontalScroll(page: Page, width: number) {
    await page.getByTestId('site-footer').scrollIntoViewIfNeeded();
    const widths = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      footer: (document.querySelector('footer') as HTMLElement).scrollWidth,
    }));
    expect(widths.doc, `${width}px: trang không cuộn ngang`).toBeLessThanOrEqual(width);
    expect(widths.body, `${width}px: body không cuộn ngang`).toBeLessThanOrEqual(width);
    expect(widths.footer, `${width}px: chân trang không tràn ngang`).toBeLessThanOrEqual(width);
  }

  test('lg: một hàng logo → CaLẻ → Người lao động → Nhà tuyển dụng → Cần hỗ trợ?; đủ link đúng đích; hàng pháp lý, ghi chú dữ liệu demo', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    const { footer, logo, nav, help, column } = footerParts(page);
    await footer.scrollIntoViewIfNeeded();

    // Bốn tiêu đề cột (h2), đúng thứ tự trên màn hình: 3 cột liên kết rồi "Cần hỗ trợ?".
    await expect(nav.getByRole('heading', { level: 2 })).toHaveText(COLUMN_HEADINGS);
    await expect(help.getByRole('heading', { level: 2 })).toHaveText(['Cần hỗ trợ?']);
    await expect(footer.getByRole('heading', { name: 'Bắt đầu', exact: true })).toHaveCount(0);

    // "Cần hỗ trợ?": email, hotline, địa chỉ, lối sang /support.
    await expect(help).toBeVisible();
    await expect(help.locator('a[href^="mailto:"]')).toHaveCount(1);
    await expect(help.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(help).toContainText('Hà Nội, Việt Nam');
    await expect(help.getByRole('link', { name: /Cách phản ánh sự cố/ })).toHaveAttribute('href', '/support');

    // Mỗi cột: đúng nhãn + đúng đích, đúng thứ tự.
    for (const [heading, links] of COLUMNS) {
      const col = column(heading);
      await expect(col, heading).toHaveCount(1);
      const a = col.getByRole('link');
      await expect(a, heading).toHaveText(links.map(([label]) => label));
      const hrefs = await a.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
      expect(hrefs, heading).toEqual(links.map(([, href]) => href));
    }
    await expect(nav.getByRole('link')).toHaveCount(COLUMNS.reduce((n, [, links]) => n + links.length, 0));
    // "Bảng giá" không còn ở chân trang (đã là "Phí dịch vụ" ở cột nhà tuyển dụng).
    await expect(footer.getByRole('link', { name: 'Bảng giá', exact: true })).toHaveCount(0);
    // Cột vai trò trỏ vào trang vai trò / tìm ca.
    await expect(footer.locator('a[href^="/for-workers"]')).toHaveCount(5);
    await expect(footer.locator('a[href^="/for-employers"]')).toHaveCount(5);
    await expect(footer.locator('a[href="/shifts"]')).toHaveCount(1);
    // Không còn link nào tới 11 trang cũ.
    for (const from of GONE) await expect(footer.locator(`a[href="${from}"]`), from).toHaveCount(0);

    // Desktop: một hàng, trái → phải, mép trên thẳng hàng.
    await expect(logo).toHaveAttribute('href', '/');
    const blocks: Array<[string, Locator]> = [
      ['logo', logo],
      ...COLUMN_HEADINGS.map((h): [string, Locator] => [h, column(h)]),
      ['Cần hỗ trợ?', help],
    ];
    const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (const [, el] of blocks) boxes.push(await boxOf(el));
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i - 1].x + boxes[i - 1].width, `${blocks[i - 1][0]} nằm trái ${blocks[i][0]}`).toBeLessThanOrEqual(boxes[i].x + 1);
      expect(Math.abs(boxes[i].y - boxes[0].y), `${blocks[i][0]}: mép trên thẳng hàng với logo`).toBeLessThan(4);
    }

    // Hàng pháp lý: tiêu đề chỉ cho trình đọc màn hình.
    const legalHeading = footer.getByRole('heading', { level: 2, name: 'Pháp lý & hỗ trợ', exact: true });
    await expect(legalHeading).toBeAttached();
    await expect(legalHeading).toHaveClass(/sr-only/);
    const legal = legalHeading.locator('xpath=..').getByRole('link');
    const legalHrefs = await legal.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(legalHrefs).toEqual(['/terms', '/privacy', '/disputes', '/support']);
    await expect(footer).toContainText('© 2026 CaLedo Tech');
    await expect(
      footer.getByText('Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu. Trong MVP/demo không có giao dịch thật.', { exact: true }),
    ).toBeVisible();

    await expectNoHorizontalScroll(page, DESKTOP.width);
  });

  test('md (768px): logo | "Cần hỗ trợ?" hàng đầu; ba cột liên kết một hàng bên dưới; không cuộn ngang', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(TABLET);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    const { footer, logo, help, column } = footerParts(page);
    await footer.scrollIntoViewIfNeeded();

    const [l, h] = [await boxOf(logo), await boxOf(help)];
    expect(l.x + l.width).toBeLessThanOrEqual(h.x + 1);
    expect(Math.abs(l.y - h.y)).toBeLessThan(4);
    const cols: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (const heading of COLUMN_HEADINGS) cols.push(await boxOf(column(heading)));
    for (const [i, c] of cols.entries()) {
      expect(c.y, `${COLUMN_HEADINGS[i]} dưới "Cần hỗ trợ?"`).toBeGreaterThanOrEqual(h.y + h.height - 1);
      if (i > 0) {
        expect(Math.abs(c.y - cols[0].y), `${COLUMN_HEADINGS[i]}: cùng hàng`).toBeLessThan(4);
        expect(cols[i - 1].x + cols[i - 1].width).toBeLessThanOrEqual(c.x + 1);
      }
    }
    await expectNoHorizontalScroll(page, TABLET.width);
  });

  test('375px: logo → "Cần hỗ trợ?" → CaLẻ | Người lao động → Nhà tuyển dụng; không cuộn ngang', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    const { footer, logo, help, column } = footerParts(page);
    await footer.scrollIntoViewIfNeeded();
    const [l, h] = [await boxOf(logo), await boxOf(help)];
    const [cale, workers, employers] = [
      await boxOf(column('CaLẻ')),
      await boxOf(column('Người lao động')),
      await boxOf(column('Nhà tuyển dụng')),
    ];
    expect(l.y + l.height).toBeLessThanOrEqual(h.y + 1);
    expect(h.y + h.height).toBeLessThanOrEqual(cale.y + 1);
    // Hàng đầu 2 cột: CaLẻ trái, Người lao động phải.
    expect(Math.abs(cale.y - workers.y)).toBeLessThan(4);
    expect(cale.x + cale.width).toBeLessThanOrEqual(workers.x + 1);
    // Nhà tuyển dụng xuống hàng dưới, cột trái.
    expect(employers.y).toBeGreaterThanOrEqual(Math.max(cale.y + cale.height, workers.y + workers.height) - 1);
    expect(Math.abs(employers.x - cale.x)).toBeLessThan(4);
    await expectNoHorizontalScroll(page, MOBILE.width);
  });
});

// ---------------------------------------------------------------------------
// 4. ShiftPostPlayground: khung không đổi chiều cao
// ---------------------------------------------------------------------------

function playground(page: Page): Locator {
  return page.locator('section[aria-labelledby="employer-money"] figure').filter({ hasText: 'Minh hoạ đăng ca' });
}
/** Khung trắng của minh hoạ (ref của kịch bản), không gồm chú thích bên dưới. */
function card(fig: Locator): Locator {
  return fig.locator(':scope > div').first();
}
async function heightOf(el: Locator): Promise<number> {
  return el.evaluate((node) => Math.round(node.getBoundingClientRect().height));
}
function stepBar(fig: Locator): Locator {
  return fig.getByRole('list', { name: 'Các bước đăng một ca', exact: true });
}
function stepButton(bar: Locator, label: string): Locator {
  return bar.getByRole('button', { name: new RegExp(`${label}$`) });
}

test.describe('ShiftPostPlayground — chiều cao khung cố định (giảm chuyển động)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('đổi qua 3 bước và bật / tắt "Giả sử 1 người không đến": chiều cao không đổi; bước ẩn là invisible + inert', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const fig = playground(page);
    const bar = stepBar(fig);
    const box = card(fig);
    await fig.scrollIntoViewIfNeeded();

    // Trạng thái cuối = bước 3.
    await expect(bar.getByRole('button')).toHaveCount(3);
    await expect(stepButton(bar, 'Ngày làm & sau ca')).toHaveAttribute('aria-current', 'step');
    const base = await heightOf(box);
    expect(base).toBeGreaterThan(0);

    // Ba bước chồng trong một ô: luôn đủ 3, chỉ một bước không ẩn.
    const stages = box.locator('div.grid > div[class*="grid-area"]');
    await expect(stages).toHaveCount(3);
    await expect(stages.nth(2)).not.toHaveAttribute('aria-hidden', 'true');
    for (const i of [0, 1]) {
      await expect(stages.nth(i)).toHaveAttribute('aria-hidden', 'true');
      await expect(stages.nth(i)).toHaveAttribute('inert', '');
      await expect(stages.nth(i)).toHaveClass(/invisible/);
      await expect(stages.nth(i)).toBeHidden();
    }

    const steps: Array<[string, number]> = [
      ['Điền ca', 0],
      ['Tuyển người', 1],
      ['Ngày làm & sau ca', 2],
      ['Tuyển người', 1],
      ['Điền ca', 0],
    ];
    for (const [label, i] of steps) {
      await stepButton(bar, label).click();
      await expect(stepButton(bar, label)).toHaveAttribute('aria-current', 'step');
      await expect(stages.nth(i)).toBeVisible();
      expect(await heightOf(box), `chiều cao ở bước "${label}"`).toBe(base);
    }

    // Bước 3: bật / tắt "1 người không đến" — dòng hoàn giữ chỗ, khung không nhảy.
    await stepButton(bar, 'Ngày làm & sau ca').click();
    const absent = fig.getByRole('checkbox', { name: 'Giả sử 1 người không đến' });
    await absent.check();
    await expect(fig.getByText('+225.000 đ', { exact: true })).toBeVisible();
    expect(await heightOf(box), 'chiều cao khi 1 người vắng').toBe(base);
    await absent.uncheck();
    await expect(fig.getByText('+225.000 đ', { exact: true })).toBeHidden();
    expect(await heightOf(box), 'chiều cao khi bỏ đánh dấu').toBe(base);
  });
});

test.describe('ShiftPostPlayground — chiều cao khung cố định khi tự chạy', () => {
  // Mốc kịch bản (e2e/35): posted 9858 (bước 2), day 14458 (bước 3), hết 16758 ms.
  test('bước 1 trống → bước 2 → bước 3 → hết kịch bản: chiều cao như nhau', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 1_000));
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const fig = playground(page);
    const bar = stepBar(fig);
    const box = card(fig);
    const current = bar.locator('[aria-current="step"]');

    await fig.scrollIntoViewIfNeeded();
    await expect(current).toHaveText('1. Điền ca');
    await expect(fig.locator('dl > div').filter({ hasText: 'Tổng giữ từ ví' }).locator('dd')).toHaveText('Chưa tính');
    const heights: Array<[string, number]> = [['bước 1 trống', await heightOf(box)]];

    await page.clock.runFor(6_000);
    await expect(fig.getByText('Đủ để giữ', { exact: true })).toBeVisible();
    heights.push(['bước 1 đã tính tiền', await heightOf(box)]);

    await page.clock.runFor(4_300);
    await expect(current).toHaveText('2. Tuyển người');
    heights.push(['bước 2', await heightOf(box)]);

    await page.clock.runFor(4_300);
    await expect(current).toHaveText('3. Ngày làm & sau ca');
    heights.push(['bước 3', await heightOf(box)]);

    await page.clock.runFor(2_500);
    await expect(fig.locator('figcaption button', { hasText: 'Xem lại' })).toBeVisible();
    await expect(bar.getByRole('button')).toHaveCount(3);
    heights.push(['hết kịch bản', await heightOf(box)]);

    const final = heights[heights.length - 1][1];
    for (const [label, h] of heights) expect(h, `chiều cao ${label} (các mốc: ${JSON.stringify(heights)})`).toBe(final);
  });
});

// ---------------------------------------------------------------------------
// 5. 375px không cuộn ngang
// ---------------------------------------------------------------------------

test.describe('Trang vai trò ở 375px', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const path of ['/for-workers', '/for-employers']) {
    test(`${path}: không cuộn ngang, kể cả các khối mới`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize(MOBILE);
      await seedState(buildSnapshot());
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const ids =
        path === '/for-workers'
          ? ['worker-schedule', 'worker-cancel', 'worker-reputation', 'worker-reputation-rules']
          : ['employer-money', 'employer-applicants', 'employer-control', 'employer-payments', 'employer-reviews'];
      for (const id of ids) {
        const section = page.locator(`section[aria-labelledby="${id}"]`);
        await section.scrollIntoViewIfNeeded();
        const sw = await section.evaluate((el) => el.scrollWidth);
        expect(sw, `#${id} không tràn ngang`).toBeLessThanOrEqual(MOBILE.width);
      }
      await page.getByTestId('site-footer').scrollIntoViewIfNeeded();
      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.doc).toBeLessThanOrEqual(MOBILE.width);
      expect(widths.body).toBeLessThanOrEqual(MOBILE.width);
    });
  }
});
