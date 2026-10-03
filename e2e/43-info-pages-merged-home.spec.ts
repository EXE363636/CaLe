import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import type { Locator, Page } from '@playwright/test';

/**
 * Bốn trang thông tin gộp vào trang khác (03/10, lần 4), chế độ local/demo.
 *
 *   1. `next.config.ts` chuyển hướng tạm thời (307):
 *        /about        → /#home-about                      (khối "Về CaLẻ" của trang chủ)
 *        /how-it-works → /#home-how                        (khối "Bốn bước của một ca")
 *        /pricing      → /for-employers#employer-pricing   (khối "Phí dịch vụ")
 *        /safety       → /support#support-safety           (khối "Lưu ý an toàn")
 *      Mở đường dẫn cũ → URL mới kèm hash, tiêu đề khối nằm gần đầu màn hình, ngay dưới
 *      header dính (ToneScroll cuộn lại một lần sau khi vẽ).
 *   2. Nội dung ở chỗ mới: trang chủ #home-how (4 bước, ngay trước "Tiền của một ca đi về
 *      đâu?") và #home-about (ngay sau màn đầu, trước "Vì sao CaLẻ ra đời?": giới thiệu + 4
 *      dữ kiện, băng chuyền "Đội ngũ" vòng lặp + tự chạy, thẻ đối tác chip nét đứt có nhãn
 *      định hướng sr-only); /for-employers#employer-pricing (ngay
 *      sau #employer-payments, hai thẻ giá, ví dụ, "Tính thử với ca của bạn"); /support
 *      #support-safety (3 thẻ, giữa thẻ liên hệ và "Khi có vấn đề trong ca").
 *   3. Link cũ đã đổi đích: trang chủ "Xem bảng giá" / "An toàn" / dải kết "Cách hoạt động";
 *      thẻ an toàn ở trang vai trò, /faq, /user-guide; khối trống /shifts.
 *   4. `HashLinkHandler`: link `/trang#khối` bấm phía client → URL đúng một hash, khối gần
 *      đầu màn hình; bấm sang trang không hash sau đó → URL không mang hash cũ, đầu trang;
 *      chọn lại cùng mục sau khi cuộn đi → về lại khối.
 *   5. Màn cảm ứng rộng (1366×1024, hasTouch): chạm nút menu thả → menu mở và GIỮ mở.
 */

const DESKTOP = { width: 1440, height: 900 };

const REDIRECTS: Array<{ from: string; to: string; path: string; target: string; heading: string }> = [
  { from: '/about', to: '/#home-about', path: '/', target: '#home-about', heading: 'Về CaLẻ' },
  { from: '/how-it-works', to: '/#home-how', path: '/', target: '#home-how', heading: 'Bốn bước của một ca' },
  {
    from: '/pricing',
    to: '/for-employers#employer-pricing',
    path: '/for-employers',
    target: '#employer-pricing',
    heading: 'Giai đoạn thử nghiệm: 0 đ',
  },
  { from: '/safety', to: '/support#support-safety', path: '/support', target: '#support-safety', heading: 'Lưu ý an toàn' },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function topOf(el: Locator): Promise<number> {
  return el.evaluate((node) => node.getBoundingClientRect().top);
}

async function headerBottom(page: Page): Promise<number> {
  return page.locator('header').first().evaluate((node) => node.getBoundingClientRect().bottom);
}

/** Chờ cuộn (mượt) dừng hẳn: scrollY không đổi qua hai lần đọc liên tiếp. */
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

/** Tiêu đề khối nằm gần đầu màn hình: dưới header, trong ~1/3 trên của khung nhìn. */
async function expectNearTop(page: Page, el: Locator, label: string, viewportHeight = DESKTOP.height) {
  await expect(el, label).toBeInViewport();
  const hb = await headerBottom(page);
  await expect
    .poll(async () => {
      const top = await topOf(el);
      return top >= hb - 1 && top <= viewportHeight / 3;
    }, { message: `${label}: tiêu đề nằm gần đầu màn hình, dưới header` })
    .toBe(true);
}

/** Thẻ đang đứng đầu thanh trượt "Đội ngũ" (mép trái gần mép trái khung nhất). */
async function firstVisibleMember(track: Locator): Promise<{ name: string; hidden: boolean }> {
  return track.evaluate((ul) => {
    const left = ul.getBoundingClientRect().left;
    let best: Element | null = null;
    let dist = Infinity;
    for (const li of Array.from(ul.children)) {
      const d = Math.abs(li.getBoundingClientRect().left - left);
      if (d < dist) {
        dist = d;
        best = li;
      }
    }
    return {
      name: best?.querySelector('p')?.textContent?.trim() ?? '',
      hidden: best?.getAttribute('aria-hidden') === 'true',
    };
  });
}

/** Thứ tự các khối có aria-labelledby trong <main>. */
async function sectionOrder(page: Page): Promise<string[]> {
  return page
    .locator('main section[aria-labelledby]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby') ?? ''));
}

function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Main navigation' });
}

function navTrigger(page: Page, name: string): Locator {
  return mainNav(page).getByRole('button', { name, exact: true });
}

async function openNavMenu(page: Page, name: string): Promise<Locator> {
  const trigger = navTrigger(page, name);
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByRole('menu', { name, exact: true });
  await expect(menu).toBeVisible();
  return menu;
}

// ---------------------------------------------------------------------------
// 1. Đường dẫn cũ → khối mới
// ---------------------------------------------------------------------------

test.describe('Bốn trang thông tin cũ chuyển hướng (03/10)', () => {
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
    test(`${r.from} → ${r.to}: tiêu đề "${r.heading}" hiện gần đầu màn hình, dưới header`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot());
      await gotoApp(r.from);
      await expect(page).toHaveURL(new RegExp(`^[^#]*${escapeRe(r.to)}$`));
      expect(new URL(page.url()).pathname, r.from).toBe(r.path);
      const heading = page.locator(r.target);
      await expect(heading).toHaveText(r.heading);
      await expect(page.getByRole('heading', { level: 2, name: r.heading, exact: true })).toBeVisible();
      await expectNearTop(page, heading, r.from);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Nội dung ở chỗ mới
// ---------------------------------------------------------------------------

test.describe('Nội dung trang cũ ở chỗ mới (03/10)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('trang chủ #home-how: 4 bước (demo), ngay trước "Tiền của một ca đi về đâu?"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Việc làm ngắn hạn, rõ ca – rõ tiền');

    const how = main.locator('section[aria-labelledby="home-how"]');
    await expect(how.getByRole('heading', { level: 2, name: 'Bốn bước của một ca', exact: true })).toBeVisible();
    await expect(how).toContainText('Một ca làm đi qua 4 bước, từ lúc đăng ca đến lúc trả tiền công.');
    const steps = how.locator('ol > li');
    await expect(steps).toHaveCount(4);
    await expect(steps.locator('h3')).toHaveText([
      'Nhà tuyển dụng đăng ca',
      'Người lao động ứng tuyển',
      'Duyệt và làm ca',
      'Xác nhận và trả tiền công',
    ]);
    // Số thứ tự là chữ, không chỉ là hình.
    for (let i = 0; i < 4; i += 1) await expect(steps.nth(i)).toContainText(String(i + 1));
    // Bản demo: bước 1 / 4 ghi "mô phỏng"; bước 2 nhắc cảnh báo trùng lịch.
    await expect(steps.nth(0)).toContainText('(mô phỏng)');
    await expect(steps.nth(1)).toContainText('Hệ thống cảnh báo nếu ca trùng giờ với lịch của bạn.');
    await expect(steps.nth(3)).toContainText('(mô phỏng)');

    const order = await sectionOrder(page);
    expect(order.indexOf('home-how'), order.join(', ')).toBeGreaterThan(order.indexOf('home-work'));
    expect(order.indexOf('home-explain-title'), order.join(', ')).toBe(order.indexOf('home-how') + 1);
    await expect(main).not.toContainText(/VNĐ|₫/);
  });

  test('trang chủ #home-about: giới thiệu + 4 dữ kiện, băng chuyền "Đội ngũ", thẻ đối tác định hướng', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const main = page.locator('main');
    const about = main.locator('section[aria-labelledby="home-about"]');
    await about.scrollIntoViewIfNeeded();

    // Hàng 1: tiêu đề + 2 đoạn (trái); bảng 2×2 dữ kiện + câu phiên bản (phải).
    const heading = about.getByRole('heading', { level: 2, name: 'Về CaLẻ', exact: true });
    await expect(heading).toBeVisible();
    await expect(about).toContainText('CaLẻ là sàn việc làm theo ca ngắn hạn của CaLedo Tech, một đội ngũ tại Việt Nam.');
    const facts = about.locator('dl');
    await expect(facts.locator('dt')).toHaveText(['Đơn vị phát triển', 'Đội ngũ', 'Làm việc tại', 'Giai đoạn']);
    await expect(facts.locator('dd')).toHaveText(['CaLedo Tech', '4 thành viên', 'Hà Nội', 'Bản dùng thử']);
    // Bản demo: nói rõ giao dịch là mô phỏng.
    await expect(about).toContainText('Mọi giao dịch tiền tệ trên ứng dụng đều là mô phỏng');

    // Hàng 2: "Đội ngũ" — băng chuyền vòng lặp vô hạn (3 bộ 4 thẻ, hai bộ ngoài aria-hidden);
    // nút dưới khung, căn giữa: trước · dừng / chạy · sau; luôn bấm được.
    const team = about.locator('section[aria-labelledby="home-team"]');
    await expect(team.getByRole('heading', { level: 3, name: 'Đội ngũ', exact: true })).toBeVisible();
    const track = team.getByRole('list', { name: 'Đội ngũ', exact: true });
    await expect(track).toHaveAttribute('tabindex', '0');
    const cards = track.getByRole('listitem');
    await expect(cards).toHaveCount(4);
    await expect(track.locator(':scope > li:not([aria-hidden="true"])')).toHaveCount(4);
    await expect(track.locator(':scope > li')).toHaveCount(12);
    const names = ['Nguyễn Phương Anh', 'Phạm Ngọc Hưng', 'Nguyễn Vũ Anh', 'Nguyễn Thị Ngọc Mai'];
    for (const [i, name] of names.entries()) await expect(cards.nth(i)).toContainText(name);
    // Thẻ gọn: ảnh tròn (ảnh trang trí alt="", hoặc chữ cái đầu khi chưa có ảnh) + số thứ tự
    // (aria-hidden) + tên + vai trò. Cả 4 thành viên đã có ảnh (03/10) → mỗi thẻ một ảnh.
    const visible = track.locator(':scope > li:not([aria-hidden="true"])');
    await expect(visible.first()).toContainText('01');
    await expect(visible.nth(3)).toContainText('04');
    for (let i = 0; i < 4; i++) await expect(visible.nth(i).locator('img')).toHaveCount(1);
    for (const img of await track.locator('img').all()) await expect(img).toHaveAttribute('alt', '');

    const buttons = team.getByRole('button');
    // Giảm chuyển động → đứng yên sẵn: nút giữa là "Tự chạy" (chưa bật).
    const labels = await buttons.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    expect(labels).toEqual(['Thành viên trước', 'Tự chạy', 'Thành viên sau']);
    const prev = team.getByRole('button', { name: 'Thành viên trước', exact: true });
    const next = team.getByRole('button', { name: 'Thành viên sau', exact: true });
    await expect(team.getByRole('button', { name: 'Tự chạy', exact: true })).toHaveAttribute('aria-pressed', 'false');
    // Nút nằm dưới khung trượt, căn giữa khối.
    const trackBox = await track.boundingBox();
    const midBox = await buttons.nth(1).boundingBox();
    expect(trackBox && midBox).toBeTruthy();
    if (trackBox && midBox) {
      expect(midBox.y, 'nút dưới khung').toBeGreaterThan(trackBox.y + trackBox.height - 1);
      expect(Math.abs(midBox.x + midBox.width / 2 - (trackBox.x + trackBox.width / 2)), 'nút căn giữa').toBeLessThan(4);
    }

    await team.scrollIntoViewIfNeeded();
    const firstVisible = () => firstVisibleMember(track);
    await expect.poll(firstVisible, { message: 'bắt đầu ở thẻ đầu của bộ giữa' }).toEqual({ name: names[0], hidden: false });
    // Sau 4 lần "Thành viên sau" vòng về thẻ đầu (đã nhảy về bộ giữa, không aria-hidden).
    for (const name of [...names.slice(1), names[0]]) {
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(async () => (await firstVisible()).name, { message: `sau → ${name}` }).toBe(name);
    }
    await expect.poll(firstVisible, { message: 'vòng về bộ giữa' }).toEqual({ name: names[0], hidden: false });
    // "Thành viên trước" từ thẻ đầu → thẻ cuối (không có đầu / cuối, nút luôn bấm được).
    await expect(prev).toBeEnabled();
    await prev.click();
    await expect.poll(firstVisible, { message: 'trước → thẻ cuối' }).toEqual({ name: names[3], hidden: false });
    await expect(prev).toBeEnabled();
    await expect(next).toBeEnabled();

    // Hàng 3: thẻ đối tác — nhóm là chip viền nét đứt; nhãn định hướng ở dạng chữ cho trình
    // đọc màn hình trong từng nhóm + MỘT dòng chú thích nhìn thấy.
    const partners = about.locator('section[aria-labelledby="home-partners"]');
    await expect(
      partners.getByRole('heading', { level: 3, name: 'Đối tác tiềm năng & định hướng hợp tác', exact: true }),
    ).toBeVisible();
    await expect(partners.locator('strong')).toHaveText('chưa xác lập quan hệ đối tác chính thức');
    const groups = partners.getByRole('listitem');
    await expect(groups).toHaveCount(7);
    for (let i = 0; i < 7; i += 1) {
      await expect(groups.nth(i)).toHaveClass(/border-dashed/);
      const label = groups.nth(i).locator('.sr-only');
      await expect(label).toHaveText('(Đối tác tiềm năng / định hướng)');
    }
    const legend = partners.getByText('Đối tác tiềm năng / định hướng', { exact: true });
    await expect(legend).toHaveCount(1);
    await expect(legend).toBeVisible();

    // Bố cục desktop: hàng 1 = giới thiệu (trái) + dữ kiện (phải); hàng 2 = "Đội ngũ";
    // hàng 3 = đối tác.
    const box = async (l: Locator) => {
      const bb = await l.boundingBox();
      expect(bb).not.toBeNull();
      return bb as { x: number; y: number; width: number; height: number };
    };
    const intro = await box(heading);
    const factsBox = await box(facts);
    const teamBox = await box(team);
    const partnersBox = await box(partners);
    expect(factsBox.x, 'dữ kiện nằm bên phải phần giới thiệu').toBeGreaterThan(intro.x + 100);
    expect(teamBox.y, 'đội ngũ ở hàng dưới').toBeGreaterThan(factsBox.y + factsBox.height);
    expect(teamBox.x, 'đội ngũ bắt đầu từ mép trái').toBeLessThanOrEqual(intro.x + 1);
    expect(partnersBox.y, 'đối tác dưới đội ngũ').toBeGreaterThanOrEqual(teamBox.y + teamBox.height);

    // Vị trí (03/10, lần 4): khối đầu tiên ngay sau màn đầu, trước "Vì sao CaLẻ ra đời?".
    const order = await sectionOrder(page);
    expect(order[0], order.join(', ')).toBe('home-about');
    expect(order.indexOf('home-why'), order.join(', ')).toBe(order.indexOf('home-partners') + 1);
    const hero = main.locator('section[data-tone]').first();
    await expect(hero.locator('h1')).toHaveCount(1);
    await expect(hero.locator('xpath=following-sibling::section[1]')).toHaveAttribute('aria-labelledby', 'home-about');
    await expect(about).not.toContainText(/khiếu nại|tranh chấp/i);
  });

  test('trang chủ: tông nền xen kẽ cream / paper theo thứ tự khối', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const main = page.locator('main');
    await expect(main.locator('section[data-tone]').first()).toHaveAttribute('data-tone', 'cream');
    const tones = await main
      .locator('section[aria-labelledby][data-tone]')
      .evaluateAll((els) => els.map((el) => [el.getAttribute('aria-labelledby'), el.getAttribute('data-tone')] as const));
    // Khối ảnh / lời chia sẻ thật (home-proof) tự ẩn khi chưa có dữ liệu.
    const list = tones.filter(([id]) => !String(id).endsWith('-proof'));
    // home-partners là thẻ con trong home-about (không khai báo tông).
    expect(list).toEqual([
      ['home-about', 'paper'],
      ['home-why', 'cream'],
      ['home-work', 'paper'],
      ['home-how', 'cream'],
      ['home-explain-title', 'paper'],
      ['home-features', 'cream'],
    ]);
  });

  test('/for-employers#employer-pricing: ngay sau #employer-payments, hai thẻ giá, ví dụ, "Tính thử" → form đăng ca', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');

    const order = await sectionOrder(page);
    expect(order.indexOf('employer-pricing'), order.join(', ')).toBe(order.indexOf('employer-payments') + 1);
    expect(order.indexOf('employer-reviews'), order.join(', ')).toBe(order.indexOf('employer-pricing') + 1);

    const pricing = main.locator('section[aria-labelledby="employer-pricing"]');
    await expect(pricing).toHaveAttribute('data-tone', 'cream');
    await expect(pricing.getByText('Phí dịch vụ', { exact: true })).toBeVisible();
    await expect(pricing.getByRole('heading', { level: 2 })).toHaveText('Giai đoạn thử nghiệm: 0 đ');
    await expect(pricing).toContainText('Giao dịch và số dư đều là mô phỏng.');

    const cards = pricing.locator(':scope ul > li').filter({ has: page.locator('h3') });
    await expect(cards.locator('h3')).toHaveText(['Người lao động', 'Nhà tuyển dụng']);
    const worker = cards.filter({ has: page.getByRole('heading', { level: 3, name: 'Người lao động', exact: true }) });
    await expect(worker).toContainText('Miễn phí');
    await expect(worker).toContainText('Tiền công vào ví mô phỏng sau ca.');
    const employer = cards.filter({ has: page.getByRole('heading', { level: 3, name: 'Nhà tuyển dụng', exact: true }) });
    await expect(employer.getByText('0 đ', { exact: true })).toBeVisible();
    await expect(employer).toContainText('dự kiến 10% tiền công, chưa thu phí');
    await expect(employer).toContainText('(mô phỏng)');
    await expect(pricing).toContainText(
      'Ví dụ mô phỏng: tiền công 200.000 đ thì giữ 200.000 đ (chưa cộng phí). Ca xong, người lao động nhận 200.000 đ.',
    );
    await expect(pricing).not.toContainText(/VNĐ|₫/);

    // #employer-payments (demo): còn 3 thẻ — thẻ "0 đ Phí dịch vụ" đã chuyển sang khối giá.
    const payments = main.locator('section[aria-labelledby="employer-payments"]');
    await expect(payments.locator('h3')).toHaveText(['Trả công (mô phỏng)', 'Huỷ đúng quy định', 'Lượt boost']);
    await expect(payments.getByText('Phí dịch vụ', { exact: true })).toHaveCount(0);

    // FAQ: câu hỏi mới về gói trả phí.
    const faq = main.locator('section[aria-labelledby="employer-faq"]');
    await expect(faq.getByText('Có gói trả phí nào khác không?', { exact: true })).toBeVisible();

    // "Tính thử với ca của bạn" → cùng trang, khối "Một ca tốn bao nhiêu?" gần đầu màn hình.
    const tryIt = pricing.getByRole('link', { name: /Tính thử với ca của bạn/ });
    await expect(tryIt).toHaveAttribute('href', '/for-employers#employer-post');
    await tryIt.scrollIntoViewIfNeeded();
    await tryIt.click();
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-post$/);
    await expectNearTop(page, page.locator('#employer-money'), 'Tính thử → #employer-money');
  });

  test('/support#support-safety: 3 thẻ, giữa thẻ liên hệ và "Khi có vấn đề trong ca"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/support');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Liên hệ hỗ trợ');

    const order = await sectionOrder(page);
    expect(order.slice(0, 3), order.join(', ')).toEqual(['support-contact', 'support-safety', 'support-report']);

    const safety = main.locator('section[aria-labelledby="support-safety"]');
    await expect(safety.getByRole('heading', { level: 2, name: 'Lưu ý an toàn', exact: true })).toBeVisible();
    await expect(safety.locator('h3')).toHaveText(['Xác minh tài khoản', 'Phí và cọc', 'Nhận tiền công']);
    await expect(safety).toContainText('CaLẻ không thu phí và không giữ tiền của người lao động.');
    await expect(safety).toContainText('Chỉ nhận tiền công trong ứng dụng, không nhận tiền mặt ngoài luồng.');
    await expect(main.locator('section[aria-labelledby="support-report"]').getByRole('heading', { level: 2 })).toHaveText(
      'Khi có vấn đề trong ca',
    );
    await expect(main).not.toContainText(/VNĐ|₫/);
  });
});

test.describe('Trang chủ "Đội ngũ": tự chạy (chuyển động bình thường)', () => {
  test('tự sang thẻ sau mỗi 4 giây khi chuột ở ngoài; "Dừng tự chạy" giữ yên; "Tự chạy" chạy lại', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // Đồng hồ giả dừng: thời gian chỉ trôi khi test tua → đúng một nhịp 4 giây mỗi lần.
    await page.clock.install({ time: new Date('2027-06-02T05:00:00.000Z') });
    await page.clock.pauseAt(new Date('2027-06-02T05:00:01.000Z'));
    await seedState(buildSnapshot());
    await gotoApp('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const team = page.locator('main section[aria-labelledby="home-team"]');
    const track = team.getByRole('list', { name: 'Đội ngũ', exact: true });
    await track.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(track).toBeInViewport({ ratio: 0.9 });
    // Chuột ở ngoài khối (mép phải trang, ngoài khung max-w-6xl), không focus bên trong.
    await page.mouse.move(DESKTOP.width - 5, DESKTOP.height / 2);
    const pause = team.getByRole('button', { name: 'Dừng tự chạy', exact: true });
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => firstVisibleMember(track)).toEqual({ name: 'Nguyễn Phương Anh', hidden: false });

    await page.clock.runFor(4_500);
    await expect
      .poll(async () => (await firstVisibleMember(track)).name, { message: 'tự sang thẻ sau sau 4 giây' })
      .toBe('Phạm Ngọc Hưng');

    // Dừng: bấm nút rồi bỏ focus + đưa chuột ra ngoài → 9 giây vẫn đứng yên.
    await pause.click();
    const play = team.getByRole('button', { name: 'Tự chạy', exact: true });
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await play.blur();
    await page.mouse.move(DESKTOP.width - 5, DESKTOP.height / 2);
    await page.clock.runFor(9_000);
    expect((await firstVisibleMember(track)).name, 'đã dừng: không tự chạy').toBe('Phạm Ngọc Hưng');

    // Bật lại: sau 4 giây sang thẻ kế.
    await play.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await pause.blur();
    await page.mouse.move(DESKTOP.width - 5, DESKTOP.height / 2);
    await page.clock.runFor(4_500);
    await expect
      .poll(async () => (await firstVisibleMember(track)).name, { message: 'chạy lại sau 4 giây' })
      .toBe('Nguyễn Vũ Anh');
  });

  test('bấm chuột "Dừng tự chạy" rồi "Tự chạy", chuột để yên trên nút: vẫn tự sang thẻ sau; rê chuột lên các thẻ mới tạm nghỉ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    // 03/10 (sửa "không tự xoay"): focus do bấm chuột (không :focus-visible) và chuột trên
    // hàng nút KHÔNG làm tạm nghỉ; chỉ chuột trên khung thẻ (<ul>) hoặc focus bàn phím.
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date('2027-06-02T05:00:00.000Z') });
    await page.clock.pauseAt(new Date('2027-06-02T05:00:01.000Z'));
    await seedState(buildSnapshot());
    await gotoApp('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const team = page.locator('main section[aria-labelledby="home-team"]');
    const track = team.getByRole('list', { name: 'Đội ngũ', exact: true });
    await track.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(track).toBeInViewport({ ratio: 0.9 });
    await expect.poll(() => firstVisibleMember(track)).toEqual({ name: 'Nguyễn Phương Anh', hidden: false });

    // Bấm chuột: dừng rồi chạy lại; con trỏ và focus ở lại trên nút.
    await team.getByRole('button', { name: 'Dừng tự chạy', exact: true }).click();
    const play = team.getByRole('button', { name: 'Tự chạy', exact: true });
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await play.click();
    const pause = team.getByRole('button', { name: 'Dừng tự chạy', exact: true });
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(pause).toBeFocused();
    expect(await pause.evaluate((el) => el.matches(':focus-visible')), 'focus do chuột, không phải bàn phím').toBe(false);
    expect(await pause.evaluate((el) => el.matches(':hover')), 'chuột vẫn trên nút').toBe(true);

    await page.clock.runFor(4_500);
    await expect
      .poll(async () => (await firstVisibleMember(track)).name, { message: 'chuột trên nút + focus do bấm: vẫn tự chạy trong ~4,5 giây' })
      .toBe('Phạm Ngọc Hưng');

    // Chuột trên khung thẻ → tạm nghỉ (9 giây không đổi).
    const box = await track.boundingBox();
    expect(box).not.toBeNull();
    const b = box as { x: number; y: number; width: number; height: number };
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.clock.runFor(9_000);
    expect((await firstVisibleMember(track)).name, 'chuột trên các thẻ: tạm nghỉ').toBe('Phạm Ngọc Hưng');

    // Về lại hàng nút → chạy tiếp.
    await pause.hover();
    await page.clock.runFor(4_500);
    await expect
      .poll(async () => (await firstVisibleMember(track)).name, { message: 'rời khung thẻ: chạy tiếp' })
      .toBe('Nguyễn Vũ Anh');
  });
});

// ---------------------------------------------------------------------------
// 3. Link đã đổi đích
// ---------------------------------------------------------------------------

test.describe('Link tới bốn trang cũ đã đổi đích (03/10)', () => {
  test('không còn link nào tới /about, /how-it-works, /pricing, /safety trên các trang công khai', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    for (const path of ['/', '/for-workers', '/for-employers', '/support', '/faq', '/user-guide', '/shifts', '/handbook']) {
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      for (const r of REDIRECTS) {
        await expect(page.locator(`a[href="${r.from}"], a[href^="${r.from}#"], a[href^="${r.from}?"]`), `${path}: ${r.from}`).toHaveCount(0);
      }
    }
  });

  test('trang chủ: "Xem bảng giá", "An toàn", dải kết "Cách hoạt động" trỏ đúng khối', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const main = page.locator('main');
    await expect(main.getByRole('link', { name: /^An toàn/ })).toHaveAttribute('href', '/support#support-safety');

    // Dải kết: link neo trong trang → cuộn tới "Bốn bước của một ca".
    const close = main.locator('section[aria-labelledby="home-close"]');
    const howLink = close.getByRole('link', { name: 'Cách hoạt động', exact: true });
    await expect(howLink).toHaveAttribute('href', '#home-how');
    await howLink.scrollIntoViewIfNeeded();
    await howLink.click();
    await expect(page).toHaveURL(/^[^#]*\/#home-how$/);
    await expectNearTop(page, page.locator('#home-how'), 'dải kết → #home-how');

    // "Xem bảng giá" trong "Xem chi tiết" của thẻ phí → khối giá trên trang nhà tuyển dụng.
    const fee = page.locator('li#home-fee');
    await fee.scrollIntoViewIfNeeded();
    await fee.getByText('Xem chi tiết', { exact: true }).click();
    const pricing = fee.getByRole('link', { name: /Xem bảng giá/ });
    await expect(pricing).toHaveAttribute('href', '/for-employers#employer-pricing');
    await pricing.click();
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-pricing$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');
    await expectNearTop(page, page.locator('#employer-pricing'), 'Xem bảng giá → #employer-pricing');
  });

  test('thẻ an toàn ở trang vai trò, /faq, /user-guide → /support#support-safety (mở đúng khối)', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    const cases: Array<[string, RegExp]> = [
      ['/for-workers', /^An toàn khi làm theo ca/],
      ['/for-employers', /^An toàn khi làm theo ca/],
      ['/faq', /^Bảo vệ người dùng/],
      ['/user-guide', /^An toàn khi đi làm/],
    ];
    for (const [path, name] of cases) {
      await gotoApp(path);
      const link = page.locator('main').getByRole('link', { name });
      await expect(link, path).toHaveAttribute('href', '/support#support-safety');
    }
    // Đi theo link thật (điều hướng phía client) từ /user-guide.
    const link = page.locator('main').getByRole('link', { name: /^An toàn khi đi làm/ });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/^[^#]*\/support#support-safety$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Liên hệ hỗ trợ');
    await expectNearTop(page, page.locator('#support-safety'), '/user-guide → #support-safety');
  });

  test('/shifts trống: "Cách CaLẻ hoạt động" → trang chủ #home-how', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/shifts');
    const link = page.locator('main').getByRole('link', { name: /Cách CaLẻ hoạt động/ });
    await expect(link).toHaveAttribute('href', '/#home-how');
    await link.click();
    await expect(page).toHaveURL(/^[^#]*\/#home-how$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Việc làm ngắn hạn, rõ ca – rõ tiền');
    await expectNearTop(page, page.locator('#home-how'), '/shifts → #home-how');
  });
});

// ---------------------------------------------------------------------------
// 4. Menu / chân trang mới + điều hướng có hash phía client
// ---------------------------------------------------------------------------

test.describe('Menu "Hướng dẫn & hỗ trợ", "Phí dịch vụ" và điều hướng có hash (03/10)', () => {
  test('"Hướng dẫn & hỗ trợ": FAQ, tranh chấp, hướng dẫn sử dụng, cẩm nang, "Liên hệ hỗ trợ"; "Nhà tuyển dụng" có "Phí dịch vụ"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const help = await openNavMenu(page, 'Hướng dẫn & hỗ trợ');
    const items = help.getByRole('menuitem');
    await expect(items).toHaveCount(5);
    const hrefs = await items.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toEqual(['/faq', '/disputes', '/user-guide', '/handbook', '/support']);
    for (const [i, name] of ['Câu hỏi thường gặp', 'Xử lý tranh chấp', 'Hướng dẫn sử dụng', 'Cẩm nang làm việc', 'Liên hệ hỗ trợ'].entries()) {
      await expect(items.nth(i)).toContainText(name);
    }
    for (const gone of ['Cách hoạt động', 'Bảng giá', 'Bảo vệ người dùng']) {
      await expect(help.getByText(gone), gone).toHaveCount(0);
    }

    const employers = await openNavMenu(page, 'Nhà tuyển dụng');
    const fee = employers.getByRole('menuitem', { name: 'Phí dịch vụ', exact: true });
    await expect(fee).toHaveAttribute('href', '/for-employers#employer-pricing');
    await fee.click();
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-pricing$/);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expectNearTop(page, page.locator('#employer-pricing'), 'menu → Phí dịch vụ');

    // "Liên hệ hỗ trợ" → /support; mục "Hướng dẫn & hỗ trợ" sáng (aria-current trên nhóm).
    const help2 = await openNavMenu(page, 'Hướng dẫn & hỗ trợ');
    await help2.getByRole('menuitem', { name: /Liên hệ hỗ trợ/ }).click();
    await page.waitForURL('**/support');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Liên hệ hỗ trợ');
  });

  test('English: menu "Employers" có "Service fee"; "Help & support" có "Contact support"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const employers = await openNavMenu(page, 'Employers');
    await expect(employers.getByRole('menuitem', { name: 'Service fee', exact: true })).toHaveAttribute(
      'href',
      '/for-employers#employer-pricing',
    );
    const help = await openNavMenu(page, 'Help & support');
    await expect(help.getByRole('menuitem', { name: /Contact support/ })).toHaveAttribute('href', '/support');
    // Khối giá cũng có bản tiếng Anh (không còn chữ Việt ở tiêu đề).
    await expect(page.locator('#employer-pricing')).not.toHaveText('Giai đoạn thử nghiệm: 0 đ');
  });

  test('chân trang "Phí dịch vụ" (phía client) → khối giá; rồi "Tổng quan cho người lao động" → đúng /for-workers, đầu trang', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');

    const footerNav = page.getByTestId('site-footer').getByRole('navigation', { name: 'Liên kết chân trang' });
    // 03/10 (lần 5): "Bảng giá" bỏ khỏi cột "CaLẻ"; cùng đích là "Phí dịch vụ" ở cột "Nhà tuyển dụng".
    const priceLink = footerNav.getByRole('link', { name: 'Phí dịch vụ', exact: true });
    await priceLink.scrollIntoViewIfNeeded();
    await priceLink.click();
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-pricing$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');
    await expectNearTop(page, page.locator('#employer-pricing'), 'chân trang → #employer-pricing');
    await waitScrollSettled(page);

    const menu = await openNavMenu(page, 'Người lao động');
    await menu.getByRole('menuitem', { name: 'Tổng quan cho người lao động', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
    await expect(page.getByRole('menu')).toHaveCount(0);
    // Đúng nguyên URL: không mang hash cũ (#employer-pricing) sang trang mới.
    await expect(page).toHaveURL(/^[^#]*\/for-workers$/);
    expect(new URL(page.url()).hash).toBe('');
    await expect.poll(() => page.evaluate(() => window.scrollY), { message: 'đầu trang' }).toBeLessThan(10);
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  });

  test('chọn lại cùng mục "Phí dịch vụ" sau khi cuộn đi chỗ khác → về lại khối giá', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const target = page.locator('#employer-pricing');
    for (let round = 0; round < 2; round += 1) {
      const menu = await openNavMenu(page, 'Nhà tuyển dụng');
      await menu.getByRole('menuitem', { name: 'Phí dịch vụ', exact: true }).click();
      // Đúng một hash, kể cả lần chọn lại.
      await expect(page, `lần ${round + 1}: URL`).toHaveURL(/^[^#]*\/for-employers#employer-pricing$/);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expectNearTop(page, target, `lần ${round + 1}: Phí dịch vụ`);
      await waitScrollSettled(page);
      if (round === 0) {
        // Cuộn tay lên đầu trang (hash giữ nguyên) rồi chọn lại cùng mục.
        await page.mouse.wheel(0, -20000);
        await expect(target).not.toBeInViewport();
        await expect(page).toHaveURL(/#employer-pricing$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Màn cảm ứng rộng: chạm mở menu thả, không đóng ngay
// ---------------------------------------------------------------------------

test.describe('Menu thả trên màn cảm ứng rộng (1366×1024, hasTouch)', () => {
  test.use({ viewport: { width: 1366, height: 1024 }, hasTouch: true });

  test('chạm nút "Hướng dẫn & hỗ trợ" → menu mở và giữ mở; chạm lại → đóng; chạm mục → sang trang', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    // Đồng hồ giả (chạy theo thời gian thật) để "giữ mở" kiểm bằng cách tua, không ngủ.
    await page.clock.install();
    await seedState(buildSnapshot());
    await gotoApp('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const trigger = navTrigger(page, 'Hướng dẫn & hỗ trợ');
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu', { name: 'Hướng dẫn & hỗ trợ', exact: true });
    await expect(menu).toBeVisible();
    // Một giây sau vẫn mở (lỗi cũ: mouseenter/focus mở rồi click đóng ngay).
    await page.clock.runFor(1_000);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();

    // Chạm lại nút (đã quá 400ms) → đóng; chạm nữa → mở.
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await menu.getByRole('menuitem', { name: /Liên hệ hỗ trợ/ }).tap();
    await page.waitForURL('**/support');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Liên hệ hỗ trợ');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('chạm "Nhà tuyển dụng" → menu giữ mở; chạm "Phí dịch vụ" → khối giá', async ({ page, seedState, gotoApp }) => {
    await page.clock.install();
    await seedState(buildSnapshot());
    await gotoApp('/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const trigger = navTrigger(page, 'Nhà tuyển dụng');
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.clock.runFor(1_000);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu', { name: 'Nhà tuyển dụng', exact: true });
    await menu.getByRole('menuitem', { name: 'Phí dịch vụ', exact: true }).tap();
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-pricing$/);
    await expect(page.locator('#employer-pricing')).toBeInViewport();
  });
});

// ---------------------------------------------------------------------------
// 6. Header dính (03/10: html/body `overflow-x: clip` thay `hidden` → body không còn là
//    vùng cuộn riêng, `sticky top-0` của header bám đầu màn hình) + 375px không cuộn ngang
// ---------------------------------------------------------------------------

test.describe('Header dính khi cuộn; 375px không cuộn ngang', () => {
  test('/for-employers: cuộn 2500px → header vẫn ở mép trên; mở "Nhà tuyển dụng" và chọn mục được', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');

    await page.evaluate(() => window.scrollTo({ top: 2500, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(2500);
    const header = page.locator('header').first();
    expect(await header.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    await expect(header).toBeInViewport();
    await expect(page.getByRole('heading', { level: 1 })).not.toBeInViewport();

    const menu = await openNavMenu(page, 'Nhà tuyển dụng');
    await menu.getByRole('menuitem', { name: 'Đánh giá sau ca', exact: true }).click();
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-reviews$/);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expectNearTop(page, page.locator('#employer-reviews'), 'header dính → Đánh giá sau ca');
    await waitScrollSettled(page);
    // Sau khi cuộn tới khối, header vẫn bám mép trên và không che tiêu đề khối.
    expect(await header.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    await expectNearTop(page, page.locator('#employer-reviews'), 'tiêu đề khối dưới header dính');
  });

  for (const path of ['/', '/for-workers', '/for-employers']) {
    test(`375px ${path}: không cuộn ngang (kể cả khối mới), header dính`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await seedState(buildSnapshot());
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const ids =
        path === '/' ? ['home-how', 'home-about'] : path === '/for-employers' ? ['employer-pricing'] : ['worker-help'];
      for (const id of ids) {
        const section = page.locator(`section[aria-labelledby="${id}"]`);
        await section.scrollIntoViewIfNeeded();
        expect(await section.evaluate((el) => el.scrollWidth), `#${id} không tràn ngang`).toBeLessThanOrEqual(375);
      }
      await page.getByTestId('site-footer').scrollIntoViewIfNeeded();
      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        scrollX: window.scrollX,
      }));
      expect(widths.doc, 'documentElement').toBeLessThanOrEqual(375);
      expect(widths.body, 'body').toBeLessThanOrEqual(375);
      // Thử cuộn ngang: trang không dịch sang phải.
      await page.evaluate(() => window.scrollTo({ left: 200, behavior: 'instant' }));
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
      expect(widths.scrollX).toBe(0);
      // Header vẫn bám mép trên khi đã cuộn xuống cuối trang.
      expect(await page.locator('header').first().evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    });
  }
});
