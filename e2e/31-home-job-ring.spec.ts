import { test, expect } from './fixtures/test';
import { buildShift, buildSnapshot } from './fixtures/seed';
import type { Page } from '@playwright/test';

/**
 * Trang chủ — "Ca làm cho nhiều loại việc" (`JobRing` + `homeJobs.ts`).
 *
 *   - Vòng thẻ `.job-ring`: 9 nút thẻ đúng thứ tự (bản nhân đôi `aria-hidden` + `inert`),
 *     mỗi nút `aria-expanded` + `aria-controls="home-job-detail"`. Không còn story
 *     toàn màn hình (dialog) hay dải `ul.job-scroller`.
 *   - Vòng tự xoay (requestAnimationFrame ghi `style.transform`) → kiểm bằng page.clock;
 *     nút "Tạm dừng" / "Tiếp tục" dừng / chạy lại.
 *   - Ấn thẻ → khung chi tiết `#home-job-detail` (3 ý + 2 nút), thẻ về giữa, vòng dừng;
 *     "Đóng" ẩn khung, vòng chạy lại.
 *   - "Tìm ca làm" → `/shifts?viec=<slug>` (lọc sẵn loại việc); "Phụ bếp", "Dọn dẹp"
 *     không có loại riêng → `/shifts` không lọc.
 *   - "Việc sau" / "Việc trước" xoay đúng một thẻ; Tab tới thẻ → thẻ về giữa.
 *   - Giảm chuyển động → không tự xoay, không có nút "Tạm dừng"; ‹ › vẫn dùng được.
 *   - Điện thoại 375px: không cuộn ngang trang, ấn thẻ mở khung chi tiết.
 *
 * Thẻ đang xoay không "đứng yên" nên Playwright không bấm được → trước khi ấn thẻ,
 * rê chuột lên thẻ (`clickCard`; vòng dừng khi có chuột ở trên, như người dùng thật).
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const LABELS = [
  'Phục vụ',
  'Phụ bếp',
  'Pha chế',
  'Thu ngân',
  'Kho vận',
  'Hỗ trợ sự kiện',
  'Phát tờ rơi',
  'Bảo vệ',
  'Dọn dẹp',
];

function workSection(page: Page) {
  return page.locator('section[aria-labelledby="home-work"]');
}

function ring(page: Page) {
  return workSection(page).locator('.job-ring');
}

/** Nút thẻ gốc (không tính bản nhân đôi aria-hidden). */
function originalCards(page: Page) {
  return ring(page).locator('li.job-ring-card:not([aria-hidden="true"]) > button');
}

function card(page: Page, label: string) {
  return ring(page).getByRole('button', { name: label, exact: true });
}

function detail(page: Page) {
  return page.locator('#home-job-detail');
}

function firstTransform(page: Page) {
  return ring(page)
    .locator('li.job-ring-card')
    .first()
    .evaluate((el) => (el as HTMLElement).style.transform);
}

/** Nhãn thẻ đang hiện gần giữa màn hình nhất + độ lệch (px) của tâm thẻ. */
function centreCard(page: Page) {
  return page.evaluate(() => {
    const mid = window.innerWidth / 2;
    let best = { label: '', dx: Number.POSITIVE_INFINITY };
    document.querySelectorAll<HTMLElement>('.job-ring li.job-ring-card').forEach((li) => {
      if (li.style.visibility === 'hidden') return;
      const r = li.getBoundingClientRect();
      const dx = Math.abs(r.left + r.width / 2 - mid);
      if (dx < best.dx) best = { label: li.querySelector('button')?.getAttribute('aria-label') ?? '', dx };
    });
    return best;
  });
}

/** Độ lệch (px) so với giữa màn hình của thẻ GỐC có nhãn `label`. */
function cardOffset(page: Page, label: string) {
  return page.evaluate((name) => {
    const li = Array.from(
      document.querySelectorAll<HTMLElement>('.job-ring li.job-ring-card:not([aria-hidden="true"])'),
    ).find((el) => el.querySelector('button')?.getAttribute('aria-label') === name);
    if (!li) return Number.POSITIVE_INFINITY;
    const r = li.getBoundingClientRect();
    return Math.abs(r.left + r.width / 2 - window.innerWidth / 2);
  }, label);
}

async function openHome(
  page: Page,
  seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>,
  gotoApp: (p: string) => Promise<void>,
  viewport = DESKTOP,
  snapshot = buildSnapshot(),
) {
  await page.setViewportSize(viewport);
  await seedState(snapshot);
  await gotoApp('/');
  await expect(workSection(page).getByRole('heading', { level: 2, name: 'Ca làm cho nhiều loại việc' })).toBeVisible();
  // Vòng đã đo xong hình học và vẽ thẻ; cuộn vòng ra giữa màn hình (IntersectionObserver)
  // để cả vòng lẫn hàng nút điều khiển cùng hiện — các cú bấm sau không phải cuộn trang nữa.
  // `instant`: trang đặt `scroll-behavior: smooth`, cuộn mượt làm toạ độ thẻ đổi giữa chừng.
  await expect(ring(page)).toHaveAttribute('data-ready', '');
  await ring(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

/**
 * Ấn thẻ `label`: rê chuột lên đúng thẻ trước (có chuột trên vòng → vòng dừng, thẻ
 * đứng yên) rồi mới click, như người dùng thật.
 */
async function clickCard(page: Page, label: string) {
  const box = await page.evaluate((name) => {
    const li = Array.from(
      document.querySelectorAll<HTMLElement>('.job-ring li.job-ring-card:not([aria-hidden="true"])'),
    ).find((el) => el.querySelector('button')?.getAttribute('aria-label') === name);
    const r = li?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }, label);
  expect(box, `thẻ "${label}" phải đang hiện`).not.toBeNull();
  await page.mouse.move(box!.x, box!.y);
  await card(page, label).click();
}

test.describe('Trang chủ: vòng thẻ các loại việc', () => {
  test('9 thẻ đúng thứ tự, bản nhân đôi bị ẩn khỏi cây trợ năng, không còn story / dải cuộn cũ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openHome(page, seedState, gotoApp);
    const cards = originalCards(page);
    await expect(cards).toHaveCount(9);
    for (const [i, label] of LABELS.entries()) {
      // Thẻ xa giữa bị `visibility: hidden` (không có tên tính được) → kiểm thuộc tính aria-label.
      await expect(cards.nth(i)).toHaveAttribute('aria-label', label);
      await expect(cards.nth(i)).toHaveAttribute('aria-expanded', 'false');
      await expect(cards.nth(i)).toHaveAttribute('aria-controls', 'home-job-detail');
    }

    // Bản nhân đôi (nếu có): aria-hidden + inert, nút không vào thứ tự Tab, không aria-controls.
    const copies = ring(page).locator('li.job-ring-card[aria-hidden="true"]');
    const copyCount = await copies.count();
    expect(copyCount % LABELS.length).toBe(0);
    for (let i = 0; i < copyCount; i += 1) {
      await expect(copies.nth(i)).toHaveAttribute('inert', '');
      await expect(copies.nth(i).locator('button')).toHaveAttribute('tabindex', '-1');
      await expect(copies.nth(i).locator('button')).not.toHaveAttribute('aria-controls', /.*/);
    }

    // Cây trợ năng chỉ có thẻ gốc: mọi nút thẻ thấy được đều là nhãn hợp lệ, không trùng.
    const names = await ring(page)
      .getByRole('button')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(LABELS).toContain(n);

    // Story toàn màn hình + dải cuộn ngang cũ đã bỏ.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Xem story/ })).toHaveCount(0);
    await expect(page.locator('ul.job-scroller')).toHaveCount(0);
    // Chưa chọn thẻ → khung chi tiết rỗng.
    await expect(detail(page).getByRole('heading')).toHaveCount(0);
  });

  test('tự xoay (đồng hồ giả); "Tạm dừng" dừng, "Tiếp tục" chạy lại', async ({ page, seedState, gotoApp }) => {
    await page.clock.install();
    await openHome(page, seedState, gotoApp);
    const section = workSection(page);

    const t0 = await firstTransform(page);
    await page.clock.runFor(1000);
    await expect.poll(() => firstTransform(page)).not.toBe(t0);

    await section.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    const resume = section.getByRole('button', { name: 'Tiếp tục', exact: true });
    await expect(resume).toBeVisible();
    await expect(section.getByRole('button', { name: 'Tạm dừng', exact: true })).toHaveCount(0);

    // Cho một khung hình vẽ xong sau khi dừng rồi mới chụp mốc.
    await page.clock.runFor(100);
    const paused = await firstTransform(page);
    await page.clock.runFor(2000);
    expect(await firstTransform(page)).toBe(paused);

    await resume.click();
    await expect(section.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible();
    await page.clock.runFor(1000);
    await expect.poll(() => firstTransform(page)).not.toBe(paused);
  });

  test('ấn "Pha chế": khung chi tiết 3 ý, thẻ về giữa, vòng dừng; "Đóng" ẩn khung', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openHome(page, seedState, gotoApp);
    const section = workSection(page);

    // Đưa "Phụ bếp" về giữa để "Pha chế" nằm ngay bên phải, còn trong màn hình nhưng lệch giữa.
    await section.getByRole('button', { name: 'Việc sau', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe('Phụ bếp');

    await expect.poll(() => cardOffset(page, 'Pha chế')).toBeGreaterThan(100);

    const pha = card(page, 'Pha chế');
    await clickCard(page, 'Pha chế');
    await expect(pha).toHaveAttribute('aria-expanded', 'true');

    const panel = detail(page);
    await expect(panel.getByRole('heading', { level: 3, name: 'Pha chế' })).toBeVisible();
    for (const title of ['1. Việc gồm gì', '2. Một ca thường thế nào', '3. Cần gì để làm']) {
      await expect(panel.getByText(title, { exact: true })).toBeVisible();
    }
    // Loại việc có slug → danh sách ca lọc sẵn (`lib/jobTypeSlug`).
    await expect(panel.getByRole('link', { name: 'Tìm ca làm' })).toHaveAttribute('href', '/shifts?viec=pha-che');
    await expect(panel.getByRole('link', { name: 'Đăng ca loại này' })).toHaveAttribute(
      'href',
      '/employer/shifts/new',
    );
    await expect(
      panel.getByText('Mô tả chung. Giờ làm, tiền công và yêu cầu cụ thể ghi trên từng ca.', { exact: true }),
    ).toBeVisible();

    // Vòng dừng khi đang chọn thẻ.
    await expect(section.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeVisible();
    await expect(section.getByRole('button', { name: 'Tạm dừng', exact: true })).toHaveCount(0);

    // Thẻ được chọn về giữa màn hình.
    await expect.poll(() => cardOffset(page, 'Pha chế')).toBeLessThan(40);

    await panel.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(panel.getByRole('heading', { level: 3 })).toHaveCount(0);
    await expect(panel.getByRole('link', { name: 'Tìm ca làm' })).toHaveCount(0);
    await expect(pha).toHaveAttribute('aria-expanded', 'false');
    await expect(section.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible();
  });

  test('"Việc sau" / "Việc trước" xoay đúng một thẻ', async ({ page, seedState, gotoApp }) => {
    await openHome(page, seedState, gotoApp);
    const section = workSection(page);
    await section.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    await expect(section.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeVisible();

    const start = (await centreCard(page)).label;
    const i = LABELS.indexOf(start);
    expect(i).toBeGreaterThanOrEqual(0);
    const next = LABELS[(i + 1) % LABELS.length];
    const afterNext = LABELS[(i + 2) % LABELS.length];

    await section.getByRole('button', { name: 'Việc sau', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe(next);
    await expect.poll(async () => (await centreCard(page)).dx).toBeLessThan(2);

    await section.getByRole('button', { name: 'Việc sau', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe(afterNext);
    await expect.poll(async () => (await centreCard(page)).dx).toBeLessThan(2);

    await section.getByRole('button', { name: 'Việc trước', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe(next);
    await expect.poll(async () => (await centreCard(page)).dx).toBeLessThan(2);

    await section.getByRole('button', { name: 'Việc trước', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe(start);
  });

  test('bàn phím: Tab tới một thẻ → thẻ đó về giữa', async ({ page, seedState, gotoApp }) => {
    await openHome(page, seedState, gotoApp);
    const section = workSection(page);
    // Dừng vòng để vị trí các thẻ cố định, rồi lùi Tab từ "Việc trước" vào thẻ gốc cuối cùng đang hiện.
    await section.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    await expect(section.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeVisible();

    await page.keyboard.press('Shift+Tab');
    await expect(section.getByRole('button', { name: 'Việc trước', exact: true })).toBeFocused();

    // Ghi lại độ lệch mọi thẻ gốc trước khi Tab vào vòng.
    const before = new Map<string, number>();
    for (const label of LABELS) before.set(label, await cardOffset(page, label));

    await page.keyboard.press('Shift+Tab');
    const focused = page.locator('.job-ring li.job-ring-card:not([aria-hidden="true"]) > button:focus');
    await expect(focused).toHaveCount(1);
    const label = (await focused.getAttribute('aria-label')) ?? '';
    expect(LABELS).toContain(label);
    expect(await focused.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    // Thẻ được Tab tới lúc đầu lệch giữa rõ ràng, sau đó trượt về giữa.
    expect(before.get(label)).toBeGreaterThan(100);
    await expect.poll(() => cardOffset(page, label)).toBeLessThan(40);
    // Focus bằng bàn phím không mở khung chi tiết.
    await expect(focused).toHaveAttribute('aria-expanded', 'false');
  });

  test('giảm chuyển động: không tự xoay, không có "Tạm dừng"; "Việc sau" vẫn dùng được', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await openHome(page, seedState, gotoApp);
    const section = workSection(page);

    await expect(section.getByRole('button', { name: 'Tạm dừng', exact: true })).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Tiếp tục', exact: true })).toHaveCount(0);

    await page.clock.runFor(100);
    const t0 = await firstTransform(page);
    await page.clock.runFor(3000);
    expect(await firstTransform(page)).toBe(t0);

    const start = (await centreCard(page)).label;
    const next = LABELS[(LABELS.indexOf(start) + 1) % LABELS.length];
    await section.getByRole('button', { name: 'Việc sau', exact: true }).click();
    await page.clock.runFor(100);
    await expect.poll(async () => (await centreCard(page)).label).toBe(next);
    await expect.poll(async () => (await centreCard(page)).dx).toBeLessThan(2);
  });

  test('điện thoại 375px: không cuộn ngang trang, ấn thẻ mở khung chi tiết', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openHome(page, seedState, gotoApp, MOBILE);
    await expect(ring(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);

    const { label } = await centreCard(page);
    expect(LABELS).toContain(label);
    const target = card(page, label);
    await clickCard(page, label);
    await expect(target).toHaveAttribute('aria-expanded', 'true');
    await expect(detail(page).getByRole('heading', { level: 3, name: label })).toBeVisible();
    await expect(detail(page).getByRole('link', { name: 'Tìm ca làm' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);
  });

  test('English: thẻ và khung chi tiết hiện tiếng Anh', async ({ page, seedState, gotoApp }) => {
    await openHome(page, seedState, gotoApp);
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const section = workSection(page);
    await expect(section.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(section.getByRole('button', { name: 'Next job', exact: true })).toBeVisible();
    await expect(originalCards(page).nth(2)).toHaveAccessibleName('Barista / bartender');

    // Đưa "Barista / bartender" (thẻ thứ 3) về sát giữa rồi ấn.
    await section.getByRole('button', { name: 'Next job', exact: true }).click();
    await section.getByRole('button', { name: 'Next job', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe('Barista / bartender');
    await clickCard(page, 'Barista / bartender');
    await expect(detail(page).getByRole('heading', { level: 3, name: 'Barista / bartender' })).toBeVisible();
    await expect(detail(page).getByText('1. What the work involves', { exact: true })).toBeVisible();
    await expect(detail(page).getByRole('link', { name: 'Find shifts' })).toHaveAttribute(
      'href',
      '/shifts?viec=pha-che',
    );
  });

  test('"Pha chế" → "Tìm ca làm" mở /shifts?viec=pha-che, lọc sẵn chỉ còn ca Pha chế', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    const open = { status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, positionsFilled: 0 };
    await openHome(
      page,
      seedState,
      gotoApp,
      DESKTOP,
      buildSnapshot({
        shifts: [
          buildShift({ ...open, id: 'e2e-ring-pha', title: 'E2E Ca pha chế', jobType: 'Pha chế', date: '2030-06-10' }),
          buildShift({ ...open, id: 'e2e-ring-phuc', title: 'E2E Ca phục vụ', jobType: 'Phục vụ', date: '2030-06-11' }),
        ],
      }),
    );
    const section = workSection(page);
    await section.getByRole('button', { name: 'Việc sau', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe('Phụ bếp');
    await clickCard(page, 'Pha chế');

    const find = detail(page).getByRole('link', { name: 'Tìm ca làm' });
    await expect(find).toHaveAttribute('href', '/shifts?viec=pha-che');
    await find.click();
    await page.waitForURL('**/shifts?viec=pha-che');

    const jobType = page.getByLabel('Loại công việc', { exact: true });
    await expect(jobType).toHaveValue('Pha chế');
    await expect(jobType.locator('option:checked')).toHaveText('Pha chế');
    await expect(page.locator('a[href="/shifts/e2e-ring-pha"]')).toBeVisible();
    await expect(page.locator('a[href="/shifts/e2e-ring-phuc"]')).toHaveCount(0);
  });

  test('"Phụ bếp" (không có loại riêng): "Tìm ca làm" mở /shifts không lọc', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openHome(page, seedState, gotoApp);
    const section = workSection(page);
    await section.getByRole('button', { name: 'Việc sau', exact: true }).click();
    await expect.poll(async () => (await centreCard(page)).label).toBe('Phụ bếp');
    await clickCard(page, 'Phụ bếp');
    await expect(detail(page).getByRole('heading', { level: 3, name: 'Phụ bếp' })).toBeVisible();
    await expect(detail(page).getByRole('link', { name: 'Tìm ca làm' })).toHaveAttribute('href', '/shifts');
  });
});
