import { test, expect } from './fixtures/test';
import { buildShift, buildSnapshot } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Trang vai trò + header, bản 03/10 (phần 2).
 *
 *   1. Header desktop (≥ xl): khách chỉ có "Đăng nhập" + MỘT nút cam đăng ký trên mọi
 *      trang ("Đăng ký để nhận ca" / "Đăng ký để đăng ca" trên trang vai trò, "Đăng ký"
 *      nơi khác; ẩn nút trỏ về chính trang đang xem). Đã đăng nhập: "Đăng ca" (nhà tuyển
 *      dụng) / "Tìm ca làm" (người lao động) rời thanh menu giữa, thành nút cam bên phải.
 *      Ngăn kéo menu điện thoại: nút đăng ký mang đúng vai trò của trang.
 *   2. Khối đánh giá hai chiều (#worker-reviews / #employer-reviews): một thẻ 4 bước
 *      `ReviewFlowPreview` (Quán chấm → Người làm chấm → Sao hiện ra → Uy tín, kỹ năng)
 *      — trạng thái cuối (giảm chuyển động) và các mốc giữa chừng (đồng hồ giả dừng,
 *      như e2e/35). Mốc chi tiết ghi ngay trên describe.
 *   3. Khối "An toàn và hỗ trợ" (#worker-help / #employer-help) → /safety, /support.
 *   4. Minh hoạ đầu trang nhà tuyển dụng: dòng ứng viên "★ 4,8 · 12 đánh giá".
 *   5. Thẻ loại việc ở /for-workers: "{min}–{max} đ/giờ · n ca đang tuyển" từ ca đang tuyển.
 *   6. Dải mực cuối trang vai trò (`RoleBand`) theo người xem.
 *   7. /how-it-works bản mới (màn đầu, 4 bước, sơ đồ tiền, thẻ vai trò, hỗ trợ, dải cuối).
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

/** Dừng đồng hồ trước khi tải trang: minh hoạ chỉ chạy khi test gọi `runFor`. */
async function openPaused(
  page: Page,
  gotoApp: (p: string) => Promise<void>,
  seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>,
  path: string,
) {
  await page.setViewportSize(DESKTOP);
  await page.clock.install({ time: new Date(ANCHOR_ISO) });
  await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 1_000));
  await seedState(buildSnapshot());
  await gotoApp(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

function header(page: Page): Locator {
  return page.locator('header').first();
}
function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Main navigation' });
}
function reviewFig(scope: Locator): Locator {
  return scope.locator('figure').filter({ hasText: 'Minh hoạ đánh giá sau ca' });
}
/** Thanh 4 bước của `ReviewFlowPreview`: đang tự chạy là chữ, chạy xong là nút. */
function stepBar(fig: Locator): Locator {
  return fig.getByRole('list', { name: 'Các bước sau một ca', exact: true });
}
function currentStep(bar: Locator): Locator {
  return bar.locator('[aria-current="step"]');
}
/** Nút một bước (tên có tiền tố "1. " / "✓ "). */
function stepButton(bar: Locator, label: string): Locator {
  return bar.getByRole('button', { name: new RegExp(`${label}$`) });
}
/** Ô chấm của một phía (bước 1 / 2). */
function panel(fig: Locator, title: string): Locator {
  return fig.locator('div.rounded-2xl').filter({ hasText: title });
}
/** Dãy sao của ô chấm; aria-label "n/5" = số sao đã tô. */
function starsOf(p: Locator): Locator {
  return p.locator('p[aria-label$="/5"]');
}
function replayButton(fig: Locator): Locator {
  return fig.locator('figcaption button', { hasText: 'Xem lại' });
}

const E_TEXT = 'Đến sớm, làm nhanh, khách khen.';
const W_TEXT = 'Quán chỉ việc rõ ràng, trả đúng giờ.';

// ---------------------------------------------------------------------------
// 1. Header
// ---------------------------------------------------------------------------

test.describe('Header khách (desktop ≥ xl) — 03/10', () => {
  test('mọi trang: "Đăng nhập" + MỘT nút cam đăng ký (theo vai trò của trang); không còn "Đăng ca tuyển"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    const h = header(page);
    const login = h.getByRole('link', { name: 'Đăng nhập', exact: true });
    const register = h.locator('a[href^="/register"]');

    const cases: Array<[string, string, string]> = [
      ['/for-workers', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/shifts', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/for-employers', 'Đăng ký để đăng ca', '/register?role=employer'],
      ['/', 'Đăng ký', '/register'],
      ['/about', 'Đăng ký', '/register'],
      ['/faq', 'Đăng ký', '/register'],
      ['/how-it-works', 'Đăng ký', '/register'],
    ];
    for (const [path, label, href] of cases) {
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(login, path).toBeVisible();
      await expect(login, path).toHaveAttribute('href', '/login');
      await expect(register, path).toHaveCount(1);
      await expect(register, path).toHaveText(label);
      await expect(register, path).toHaveAttribute('href', href);
      await expect(register, path).toHaveClass(/bg-orange-500/);
      await expect(h.getByRole('link', { name: 'Đăng ca tuyển' }), path).toHaveCount(0);
    }

    // Ẩn nút trỏ về chính trang đang xem.
    await gotoApp('/login');
    await expect(login).toHaveCount(0);
    await expect(register).toHaveCount(1);
    await expect(register).toHaveAttribute('href', '/register');
    await gotoApp('/register');
    await expect(login).toBeVisible();
    await expect(register).toHaveCount(0);

    await gotoApp('/for-employers');
    await register.click();
    await page.waitForURL('**/register?role=employer');
  });

  test('ngăn kéo menu điện thoại (khách): nút đăng ký theo vai trò của trang', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    const cases: Array<[string, string, string]> = [
      ['/for-workers', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/shifts', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/for-employers', 'Đăng ký để đăng ca', '/register?role=employer'],
      ['/', 'Đăng ký', '/register'],
      ['/about', 'Đăng ký', '/register'],
    ];
    for (const [path, label, href] of cases) {
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await header(page).getByRole('button', { name: 'Menu' }).click();
      const drawer = page.locator('#mobile-nav-drawer');
      const reg = drawer.getByRole('link', { name: label, exact: true });
      await expect(reg, path).toBeVisible();
      await expect(reg, path).toHaveAttribute('href', href);
      await expect(drawer.getByRole('link', { name: 'Đăng nhập', exact: true }), path).toBeVisible();
      // Chỉ MỘT nút đăng ký trong ngăn kéo.
      await expect(drawer.getByRole('link', { name: /^Đăng ký/ }), path).toHaveCount(1);
    }
  });
});

test.describe('Header đã đăng nhập — việc chính là nút cam bên phải (03/10)', () => {
  test('nhà tuyển dụng: "Đăng ca" không còn trong menu giữa, là nút cam → /employer/shifts/new', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');
    await expect(mainNav(page)).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'Tổng quan', exact: true })).toBeVisible();
    await expect(mainNav(page).locator('a[href="/employer/shifts/new"]')).toHaveCount(0);
    await expect(mainNav(page).getByRole('link', { name: 'Đăng ca', exact: true })).toHaveCount(0);

    const post = header(page).getByRole('link', { name: 'Đăng ca', exact: true });
    await expect(post).toBeVisible();
    await expect(post).toHaveAttribute('href', '/employer/shifts/new');
    await expect(post).toHaveAttribute('title', 'Đăng ca tuyển');
    await expect(post).toHaveClass(/bg-orange-500/);
    // Nút nằm ở vùng phải, bên phải thanh menu.
    const navBox = await mainNav(page).boundingBox();
    const postBox = await post.boundingBox();
    expect(navBox && postBox && postBox.x >= navBox.x + navBox.width).toBe(true);
    // Khách không thấy "Đăng nhập" / nút đăng ký khi đã đăng nhập.
    await expect(header(page).getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveCount(0);
    await expect(header(page).locator('a[href^="/register"]')).toHaveCount(0);

    await post.click();
    await page.waitForURL('**/employer/shifts/new');
  });

  test('người lao động: "Tìm ca làm" không còn trong menu giữa, là nút cam → /shifts', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');
    await expect(mainNav(page)).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'Tổng quan', exact: true })).toBeVisible();
    await expect(mainNav(page).locator('a[href="/shifts"]')).toHaveCount(0);
    await expect(mainNav(page).getByRole('link', { name: 'Tìm ca làm', exact: true })).toHaveCount(0);

    const find = header(page).getByRole('link', { name: 'Tìm ca làm', exact: true });
    await expect(find).toBeVisible();
    await expect(find).toHaveAttribute('href', '/shifts');
    await expect(find).toHaveClass(/bg-orange-500/);
    const navBox = await mainNav(page).boundingBox();
    const findBox = await find.boundingBox();
    expect(navBox && findBox && findBox.x >= navBox.x + navBox.width).toBe(true);
    await expect(header(page).locator('a[href^="/register"]')).toHaveCount(0);

    await find.click();
    await page.waitForURL('**/shifts');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  for (const c of [
    { who: 'nhà tuyển dụng', id: ACCOUNTS.employer.id, path: '/employer/dashboard', label: 'Đăng ca' },
    { who: 'người lao động', id: ACCOUNTS.worker.id, path: '/worker/dashboard', label: 'Tìm ca làm' },
  ]) {
    test(`${c.who} ở 375px: nút cam "${c.label}" ẩn trong header (chỉ từ xl)`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize(MOBILE);
      await seedState(buildSnapshot());
      await loginAs(c.id);
      await gotoApp(c.path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(header(page).getByRole('button', { name: 'Menu' })).toBeVisible();
      await expect(header(page).getByRole('link', { name: c.label, exact: true })).toBeHidden();
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Sau ca: đánh giá hai chiều + uy tín / kỹ năng (`ReviewFlowPreview`, 4 bước)
// ---------------------------------------------------------------------------

test.describe('Khối đánh giá hai chiều — trạng thái cuối (giảm chuyển động)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const c of [
    {
      path: '/for-workers',
      id: 'worker-reviews',
      heading: 'Làm tốt thì được ghi nhận',
      points: ['Hai bên chấm nhau', 'Điểm sao đi theo bạn', 'Uy tín và kỹ năng'],
      profile: 'Hồ sơ của bạn',
    },
    {
      path: '/for-employers',
      id: 'employer-reviews',
      heading: 'Đánh giá hai chiều sau mỗi ca',
      points: ['Hai bên chấm nhau', 'Điểm sao trên thẻ ứng viên', 'Uy tín và kỹ năng'],
      profile: 'Hồ sơ ứng viên',
    },
  ]) {
    test(`${c.path}: thẻ 4 bước hiện sẵn bước "Uy tín, kỹ năng"; bấm thanh bước xem lại 3 bước trước`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot());
      await gotoApp(c.path);
      const section = page.locator(`section[aria-labelledby="${c.id}"]`);
      await expect(section.getByRole('heading', { level: 2, name: c.heading, exact: true })).toBeVisible();
      for (const p of c.points) await expect(section.getByText(p, { exact: true }), p).toBeVisible();

      const fig = reviewFig(section);
      await expect(fig).toHaveCount(1);
      const bar = stepBar(fig);
      await expect(fig.getByText('Phục vụ quán cà phê', { exact: true })).toBeVisible();
      await expect(fig.getByText('Thứ 7 · 07:00–11:00', { exact: true })).toBeVisible();
      // Badge trạng thái ca: nhãn chữ "Đã hoàn thành" (không chỉ màu), tông success.
      const badge = fig.getByText('Đã hoàn thành', { exact: true });
      await expect(badge).toBeVisible();
      await expect(badge).toHaveClass(/green/);

      // Trạng thái cuối = bước 4; thanh bước là nút.
      await expect(bar.getByRole('button')).toHaveCount(4);
      await expect(stepButton(bar, 'Uy tín, kỹ năng')).toHaveAttribute('aria-current', 'step');
      await expect(fig.getByText(c.profile, { exact: true })).toBeVisible();
      await expect(fig.getByText('Điểm uy tín', { exact: true })).toBeVisible();
      await expect(fig).toContainText('90/100');
      await expect(fig.getByText('+5 · Hoàn thành ca Phục vụ quán cà phê', { exact: true })).toBeVisible();
      const serve = fig.locator('li').filter({ hasText: 'Phục vụ' });
      await expect(serve.getByText('Cấp 3', { exact: true })).toBeVisible();
      await expect(serve.getByText('Lên cấp!', { exact: true })).toBeVisible();
      await expect(serve.getByText('+17 XP · ca 5 sao', { exact: true })).toBeVisible();
      const barista = fig.locator('li').filter({ hasText: 'Pha chế' });
      await expect(barista.getByText('Cấp 1', { exact: true })).toBeVisible();
      await expect(barista.getByText('30/50 XP', { exact: true })).toBeVisible();
      await expect(barista.getByText('Lên cấp!', { exact: true })).toHaveCount(0);
      // Bản demo: chú thích "số liệu là ví dụ", KHÔNG có chip "Sắp có" (chỉ bản thật).
      await expect(
        fig.getByText('Minh hoạ đánh giá sau ca. Tên, nhận xét và số liệu là ví dụ.', { exact: true }),
      ).toBeVisible();
      await expect(fig.getByText('Sắp có', { exact: true })).toHaveCount(0);
      await expect(replayButton(fig)).toBeHidden();
      // Chỉ bước đang xem được vẽ.
      await expect(fig.getByText('Quán chấm Minh Anh', { exact: true })).toHaveCount(0);

      // Bước 1: quán chấm 5 sao, nhận xét, đã gửi.
      await stepButton(bar, 'Quán chấm').click();
      const emp = panel(fig, 'Quán chấm Minh Anh');
      await expect(emp).toBeVisible();
      await expect(starsOf(emp)).toHaveAttribute('aria-label', '5/5');
      await expect(emp.getByText(E_TEXT, { exact: true })).toBeVisible();
      await expect(emp.getByText('✓ Đã gửi', { exact: true })).toBeVisible();
      await expect(fig.getByText('Điểm uy tín', { exact: true })).toHaveCount(0);

      // Bước 2: người làm chấm quán 4 sao, 2 thẻ nhanh, nhận xét, đã gửi.
      await stepButton(bar, 'Người làm chấm').click();
      const wkr = panel(fig, 'Minh Anh chấm quán');
      await expect(wkr).toBeVisible();
      await expect(starsOf(wkr)).toHaveAttribute('aria-label', '4/5');
      await expect(wkr.getByText('Đánh giá nhanh (tuỳ chọn)', { exact: true })).toBeVisible();
      const chips = wkr.locator('ul > li');
      await expect(chips).toHaveText(['Trả lương đúng cam kết', 'Môi trường tốt', 'Giao tiếp rõ ràng', 'Công việc đúng mô tả']);
      await expect(wkr.locator('ul > li.bg-orange-100')).toHaveText(['Trả lương đúng cam kết', 'Giao tiếp rõ ràng']);
      await expect(wkr.getByText(W_TEXT, { exact: true })).toBeVisible();
      await expect(wkr.getByText('✓ Đã gửi', { exact: true })).toBeVisible();

      // Bước 3: sao hiện trên thẻ ứng viên (13 đánh giá, +1) và trang chi tiết ca của quán.
      await stepButton(bar, 'Sao hiện ra').click();
      await expect(fig.getByText('Nhà tuyển dụng khác thấy trên thẻ ứng viên:', { exact: true })).toBeVisible();
      await expect(fig).toContainText(/★\s4,8 · 13 đánh giá/);
      await expect(fig.getByText('+1', { exact: true })).toBeVisible();
      await expect(fig.getByText('Người tìm ca thấy trên trang chi tiết ca của quán:', { exact: true })).toBeVisible();
      await expect(fig.getByText(`“${W_TEXT}”`, { exact: true })).toBeVisible();
      await expect(fig.getByText('Trả lương đúng cam kết · Giao tiếp rõ ràng', { exact: true })).toBeVisible();

      await expect(section).not.toContainText(/VNĐ|₫/);
    });
  }
});

// Kịch bản ReviewFlowPreview (mốc ghi lúc BẮT ĐẦU): e1..e5 400–1080, gõ nhận xét quán
// 1250–3215, eSent 3215, w 4115 (bước 2), w1..w4 4415–4925, tag1 5095, tag2 5395, gõ
// nhận xét 5695–7935, wSent 7935, shown 8835 (bước 3), shown2 9535, rep 11135 (bước 4),
// event 11635, score 12435, xp 13335, level 14235, hết 14635 ms.
test.describe('Khối đánh giá hai chiều — chạy một lần khi cuộn tới', () => {
  test('ReviewFlowPreview: quán chấm → người làm chấm → sao hiện ra → uy tín, kỹ năng; xong thì bấm được từng bước', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-workers');
    const fig = reviewFig(page.locator('section[aria-labelledby="worker-reviews"]'));
    const bar = stepBar(fig);
    const emp = panel(fig, 'Quán chấm Minh Anh');
    const wkr = panel(fig, 'Minh Anh chấm quán');
    const activeChips = wkr.locator('ul > li.bg-orange-100');
    const detailLabel = fig.getByText('Người tìm ca thấy trên trang chi tiết ca của quán:', { exact: true });
    const event = fig.getByText('+5 · Hoàn thành ca Phục vụ quán cà phê', { exact: true });
    const serve = fig.locator('li').filter({ hasText: 'Phục vụ' });
    const again = replayButton(fig);

    await fig.scrollIntoViewIfNeeded();
    // IntersectionObserver bắn → bước 1 trống: chưa sao, chưa chữ, chưa gửi.
    await expect(currentStep(bar)).toHaveText('1. Quán chấm');
    await expect(bar.getByRole('button')).toHaveCount(0);
    await expect(starsOf(emp)).toHaveAttribute('aria-label', '0/5');
    await expect(emp.getByText('Gửi', { exact: true })).toBeVisible();
    await expect(again).toBeHidden();

    // 2000 ms: 5 sao (1080), đang gõ nhận xét (1250–3215), chưa gửi.
    await page.clock.runFor(2_000);
    await expect(starsOf(emp)).toHaveAttribute('aria-label', '5/5');
    await expect(emp).toContainText('Đến sớm');
    await expect(emp.getByText(E_TEXT, { exact: true })).toHaveCount(0);
    await expect(emp.getByText('✓ Đã gửi', { exact: true })).toHaveCount(0);

    // 3600 ms: đã gửi (3215), vẫn bước 1 (w 4115).
    await page.clock.runFor(1_600);
    await expect(emp.getByText(E_TEXT, { exact: true })).toBeVisible();
    await expect(emp.getByText('✓ Đã gửi', { exact: true })).toBeVisible();
    await expect(currentStep(bar)).toHaveText('1. Quán chấm');

    // 4800 ms: bước 2, 3 sao (w3 4755, w4 4925), chưa thẻ nào.
    await page.clock.runFor(1_200);
    await expect(currentStep(bar)).toHaveText('2. Người làm chấm');
    await expect(bar).toContainText('✓ Quán chấm');
    await expect(emp).toHaveCount(0);
    await expect(starsOf(wkr)).toHaveAttribute('aria-label', '3/5');
    await expect(activeChips).toHaveCount(0);

    // 5300 ms: 4 sao, thẻ 1 (5095), chưa thẻ 2 (5395).
    await page.clock.runFor(500);
    await expect(starsOf(wkr)).toHaveAttribute('aria-label', '4/5');
    await expect(activeChips).toHaveText(['Trả lương đúng cam kết']);
    await expect(wkr.getByText('✓ Đã gửi', { exact: true })).toHaveCount(0);

    // 9000 ms: bước 3 (shown 8835): thẻ ứng viên 13 đánh giá, +1; dòng trang quán chưa (9535).
    await page.clock.runFor(3_700);
    await expect(currentStep(bar)).toHaveText('3. Sao hiện ra');
    await expect(fig).toContainText(/★\s4,8 · 13 đánh giá/);
    await expect(fig.getByText('+1', { exact: true })).toBeVisible();
    await expect(detailLabel).toBeHidden();

    // 9800 ms: nhận xét về quán hiện.
    await page.clock.runFor(800);
    await expect(detailLabel).toBeVisible();
    await expect(fig.getByText(`“${W_TEXT}”`, { exact: true })).toBeVisible();

    // 11300 ms: bước 4 (rep 11135): 85/100, dòng "+5" chưa (11635), Phục vụ Cấp 2 · 58/70 XP.
    await page.clock.runFor(1_500);
    await expect(currentStep(bar)).toHaveText('4. Uy tín, kỹ năng');
    await expect(fig).toContainText('85/100');
    await expect(event).toBeHidden();
    await expect(serve.getByText('Cấp 2', { exact: true })).toBeVisible();
    await expect(serve.getByText('58/70 XP', { exact: true })).toBeVisible();

    // 12700 ms: "+5" (11635) và điểm 90 (12435); chưa XP (13335).
    await page.clock.runFor(1_400);
    await expect(event).toBeVisible();
    await expect(fig).toContainText('90/100');
    await expect(serve.getByText('Cấp 2', { exact: true })).toBeVisible();
    await expect(serve.getByText('Lên cấp!', { exact: true })).toHaveCount(0);

    // 14800 ms: hết kịch bản (14635).
    await page.clock.runFor(2_100);
    await expect(serve.getByText('Cấp 3', { exact: true })).toBeVisible();
    await expect(serve.getByText('Lên cấp!', { exact: true })).toBeVisible();
    await expect(serve.getByText('+17 XP · ca 5 sao', { exact: true })).toBeVisible();
    await expect(again).toBeVisible();
    await expect(bar.getByRole('button')).toHaveCount(4);

    // Bấm thanh bước quay lại bước 1.
    await stepButton(bar, 'Quán chấm').click();
    await expect(emp.getByText('✓ Đã gửi', { exact: true })).toBeVisible();
    await expect(fig.getByText('Điểm uy tín', { exact: true })).toHaveCount(0);

    // "Xem lại" chạy lại từ đầu.
    await again.click();
    await expect(currentStep(bar)).toHaveText('1. Quán chấm');
    await expect(starsOf(emp)).toHaveAttribute('aria-label', '0/5');
    await expect(emp.getByText('✓ Đã gửi', { exact: true })).toHaveCount(0);
    await expect(bar.getByRole('button')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 3. An toàn và hỗ trợ; 4. minh hoạ đầu trang nhà tuyển dụng
// ---------------------------------------------------------------------------

test.describe('Trang vai trò — khối "An toàn và hỗ trợ"', () => {
  for (const c of [
    { path: '/for-workers', id: 'worker-help' },
    { path: '/for-employers', id: 'employer-help' },
  ]) {
    test(`${c.path}: lối tắt /safety và /support`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot());
      await gotoApp(c.path);
      const section = page.locator(`section[aria-labelledby="${c.id}"]`);
      // Tiêu đề chỉ cho trình đọc màn hình (sr-only).
      await expect(section.getByRole('heading', { level: 2, name: 'An toàn và hỗ trợ', exact: true })).toBeAttached();
      await expect(page.locator(`#${c.id}`)).toHaveClass(/sr-only/);
      const links = section.getByRole('link');
      await expect(links).toHaveCount(2);
      const safety = section.getByRole('link', { name: /^An toàn khi làm theo ca/ });
      const support = section.getByRole('link', { name: /^Cần hỗ trợ\?/ });
      await expect(safety).toHaveAttribute('href', '/safety');
      await expect(support).toHaveAttribute('href', '/support');
      await support.click();
      await page.waitForURL('**/support');
    });
  }
});

test.describe('Minh hoạ đầu trang nhà tuyển dụng — dòng ứng viên', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('mỗi ứng viên có "★ x,y · n đánh giá", không còn "Đã xác minh SĐT"', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const fig = page.locator('figure').filter({ hasText: 'Minh hoạ giao diện quản lý ca' });
    const rows = fig.locator('ul > li');
    await expect(rows.first()).toBeVisible();
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i += 1) {
      await expect(rows.nth(i)).toContainText(/★\s\d,\d · \d+ đánh giá/);
    }
    await expect(fig).not.toContainText('Đã xác minh SĐT');
  });
});

// ---------------------------------------------------------------------------
// 5. Mức lương theo loại việc (/for-workers)
// ---------------------------------------------------------------------------

test.describe('/for-workers — mức lương trên thẻ loại việc', () => {
  /** Thẻ loại việc theo thứ tự cố định (e2e/35): 0 Phục vụ, 2 Pha chế, 3 Thu ngân. */
  function jobLinks(page: Page): Locator {
    return page.locator('section[aria-labelledby="worker-jobs"]').getByRole('listitem').getByRole('link');
  }

  test('lấy từ ca đang tuyển: khoảng lương + số ca; ca đầy / đã qua / đã huỷ không tính', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    const open = { date: '2027-06-10', status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, positionsFilled: 0 };
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ ...open, jobType: 'Phục vụ', hourlyWage: 40000 }),
          buildShift({ ...open, jobType: 'Phục vụ', hourlyWage: 52000 }),
          buildShift({ ...open, jobType: 'Pha chế', hourlyWage: 45000 }),
          // Không tính: đã đủ người, đã qua giờ bắt đầu, đã huỷ.
          buildShift({ ...open, jobType: 'Phục vụ', hourlyWage: 99000, positionsFilled: 2 }),
          buildShift({ ...open, jobType: 'Phục vụ', hourlyWage: 20000, date: '2027-05-20' }),
          buildShift({ ...open, jobType: 'Phục vụ', hourlyWage: 30000, status: 'Cancelled' }),
        ],
      }),
    );
    await gotoApp('/for-workers');
    const links = jobLinks(page);
    await expect(links).toHaveCount(9);
    await expect(links.nth(0)).toContainText('Phục vụ');
    await expect(links.nth(0)).toContainText(/40\.000–52\.000\s?đ\/giờ · 2 ca đang tuyển/);
    await expect(links.nth(2)).toContainText('Pha chế');
    await expect(links.nth(2)).toContainText(/45\.000\s?đ\/giờ · 1 ca đang tuyển/);
    await expect(links.nth(3)).toContainText('Thu ngân');
    await expect(links.nth(3)).not.toContainText('ca đang tuyển');
    // "Phụ bếp" / "Dọn dẹp" không có loại việc tương ứng → không có dòng lương.
    await expect(links.nth(1)).not.toContainText('ca đang tuyển');
    await expect(links.nth(8)).not.toContainText('ca đang tuyển');
    await expect(page.locator('main')).not.toContainText(/VNĐ|₫/);
  });

  test('không có ca đang tuyển: thẻ không ghi lương, bố cục 375px không cuộn ngang', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    const links = jobLinks(page);
    await expect(links).toHaveCount(9);
    for (let i = 0; i < 9; i += 1) await expect(links.nth(i)).not.toContainText('ca đang tuyển');
    for (const l of await links.all()) {
      const box = await l.boundingBox();
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width + 0.5);
    }
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(MOBILE.width);
  });
});

// ---------------------------------------------------------------------------
// 6. Dải mực cuối trang (`RoleBand`) — chữ và nút theo người đang xem
// ---------------------------------------------------------------------------

test.describe('Dải cuối trang vai trò (RoleBand) theo người xem', () => {
  // Khách: tiêu đề gõ chữ khi cuộn tới (TypeOnView) → giảm chuyển động để đọc trọn câu.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  const cases: Array<{
    who: string;
    userId: string | null;
    path: string;
    title: string;
    cta: string;
    href: string;
    switchText?: string;
    switchLink?: [string, string];
  }> = [
    {
      who: 'khách',
      userId: null,
      path: '/for-workers',
      title: 'Sẵn sàng nhận ca đầu tiên?',
      cta: 'Đăng ký để nhận ca',
      href: '/register?role=worker',
      switchText: 'Bạn cần tuyển người?',
      switchLink: ['Xem trang tuyển dụng', '/for-employers'],
    },
    {
      who: 'khách',
      userId: null,
      path: '/for-employers',
      title: 'Sẵn sàng đăng ca đầu tiên?',
      cta: 'Đăng ký để đăng ca',
      href: '/register?role=employer',
      switchText: 'Bạn đang tìm việc?',
      switchLink: ['Xem trang tìm việc', '/for-workers'],
    },
    {
      who: 'người lao động',
      userId: ACCOUNTS.worker.id,
      path: '/for-workers',
      title: 'Tìm ca tiếp theo?',
      cta: 'Tìm ca làm',
      href: '/shifts',
    },
    {
      who: 'nhà tuyển dụng',
      userId: ACCOUNTS.employer.id,
      path: '/for-employers',
      title: 'Cần thêm người cho ca tới?',
      cta: 'Đăng ca cần tuyển',
      href: '/employer/shifts/new',
    },
    {
      who: 'nhà tuyển dụng',
      userId: ACCOUNTS.employer.id,
      path: '/for-workers',
      title: 'Trang này dành cho người lao động.',
      cta: 'Về trang của bạn',
      href: '/employer/dashboard',
    },
    {
      who: 'người lao động',
      userId: ACCOUNTS.worker.id,
      path: '/for-employers',
      title: 'Trang này dành cho nhà tuyển dụng.',
      cta: 'Về trang của bạn',
      href: '/worker/dashboard',
    },
  ];

  for (const c of cases) {
    test(`${c.who} ở ${c.path}: "${c.title}" + "${c.cta}"`, async ({ page, seedState, loginAs, gotoApp }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot());
      if (c.userId) await loginAs(c.userId);
      await gotoApp(c.path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const band = page
        .locator('section')
        .filter({ has: page.getByText(c.title, { exact: true }) })
        .last();
      await band.scrollIntoViewIfNeeded();
      await expect(band.getByText(c.title, { exact: true })).toBeVisible();
      const cta = band.getByRole('link', { name: new RegExp(`^${c.cta}`) });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', c.href);
      await expect(cta).toHaveClass(/bg-orange-500/);

      if (c.switchText && c.switchLink) {
        await expect(band.getByText(c.switchText)).toBeVisible();
        const sw = band.getByRole('link', { name: c.switchLink[0], exact: true });
        await expect(sw).toHaveAttribute('href', c.switchLink[1]);
        await expect(band.getByRole('link')).toHaveCount(2);
      } else {
        // Đã đăng nhập: không có dòng chuyển trang, không mời đăng ký.
        await expect(band.getByRole('link')).toHaveCount(1);
        await expect(band).not.toContainText('Đăng ký');
        await expect(band).not.toContainText('đầu tiên');
      }

      await cta.click();
      await page.waitForURL(`**${c.href}`);
    });
  }
});

// ---------------------------------------------------------------------------
// 7. /how-it-works (bản 03/10, cùng khối với trang vai trò)
// ---------------------------------------------------------------------------

test.describe('/how-it-works bản 03/10', () => {
  // Tiêu đề gõ chữ khi cuộn tới (TypeOnView) → giảm chuyển động để đọc trọn câu.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('màn đầu, 4 bước (demo), sơ đồ tiền, thẻ theo vai trò, cần nhớ, hỗ trợ, dải cuối', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/how-it-works');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Cách hoạt động');
    const hero = main.locator('section').first();
    await expect(hero.getByRole('link', { name: /^Xem ca đang tuyển/ })).toHaveAttribute('href', '/shifts');
    await expect(hero.getByRole('link', { name: 'Trang nhà tuyển dụng', exact: true })).toHaveAttribute(
      'href',
      '/for-employers',
    );

    // 4 bước; bản demo: bước 2 nhắc cảnh báo trùng lịch, bước 1 / 4 ghi "mô phỏng".
    const steps = main.locator('section[aria-labelledby="how-steps"]');
    await expect(steps.getByRole('heading', { level: 2, name: 'Bốn bước của một ca', exact: true })).toBeVisible();
    const items = steps.locator('ol > li');
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toContainText('Nhà tuyển dụng đăng ca');
    await expect(items.nth(0)).toContainText('(mô phỏng)');
    await expect(items.nth(1)).toContainText('Người lao động ứng tuyển');
    await expect(items.nth(1)).toContainText('Hệ thống cảnh báo nếu ca trùng giờ với lịch của bạn.');
    await expect(items.nth(2)).toContainText('Duyệt và làm ca');
    await expect(items.nth(3)).toContainText('Xác nhận và trả tiền công');
    await expect(items.nth(3)).toContainText('(mô phỏng)');

    const money = main.locator('section[aria-labelledby="how-money"]');
    await expect(money.getByRole('heading', { level: 2, name: 'Tiền của một ca đi về đâu?' })).toBeVisible();
    await expect(money.locator('figure.money-flow')).toBeVisible();

    const roles = main.locator('section[aria-labelledby="how-roles"]');
    await expect(roles.getByRole('heading', { level: 2, name: 'Xem kỹ từng bước theo vai trò' })).toBeVisible();
    await expect(roles.getByRole('link')).toHaveCount(2);
    await expect(roles.getByRole('link', { name: /Xem minh hoạ/ })).toHaveAttribute('href', '/for-workers#worker-apply');
    await expect(roles.getByRole('link', { name: /Thử đăng một ca/ })).toHaveAttribute(
      'href',
      '/for-employers#employer-money',
    );

    const remember = main.locator('section[aria-labelledby="how-remember"]');
    await expect(remember.getByRole('heading', { level: 2, name: 'Cần nhớ' })).toBeVisible();
    await expect(remember.getByRole('listitem')).toHaveCount(3);
    await expect(remember).toContainText('Người lao động dùng CaLẻ miễn phí.');

    const help = main.locator('section[aria-labelledby="how-help"]');
    await expect(help.getByRole('link', { name: /^An toàn khi làm theo ca/ })).toHaveAttribute('href', '/safety');
    await expect(help.getByRole('link', { name: /^Cần hỗ trợ\?/ })).toHaveAttribute('href', '/support');

    const close = main.locator('section[aria-labelledby="how-close"]');
    await expect(close.getByRole('heading', { level: 2, name: 'Bắt đầu từ phía của bạn' })).toBeVisible();
    await expect(close.getByRole('link', { name: /^Tôi cần việc/ })).toHaveAttribute('href', '/for-workers');
    await expect(close.getByRole('link', { name: /^Tôi cần tuyển người/ })).toHaveAttribute('href', '/for-employers');
    await expect(main).not.toContainText(/VNĐ|₫/);

    // Thẻ vai trò dẫn tới đúng minh hoạ.
    await roles.getByRole('link', { name: /Thử đăng một ca/ }).click();
    await page.waitForURL('**/for-employers#employer-money');
    await expect(page.locator('#employer-money')).toBeVisible();
  });

  test('375px không cuộn ngang', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    await gotoApp('/how-it-works');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cách hoạt động');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(MOBILE.width);
  });
});
