import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * P1 feedback F4 — trang chủ tách theo vai trò.
 *
 *   - `/` chỉ có 2 lựa chọn: "Tôi cần việc" → /for-workers, "Tôi cần tuyển" → /for-employers.
 *   - Hai trang vai trò có công tắc chung (aria-current đúng trang).
 *   - /for-workers hiện tối đa 6 ca đang tuyển THẬT, mới đăng trước.
 *   - Đã đăng nhập: logo về nơi làm việc (worker → /shifts, employer → dashboard).
 */

const DESKTOP = { width: 1440, height: 900 };

function openShift(i: number) {
  return buildShift({
    id: `e2e-home-shift-${i}`,
    title: `E2E Ca mới ${i}`,
    date: '2030-06-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 0,
    // i lớn hơn = đăng sau → phải đứng trước.
    createdAt: `2026-09-${String(10 + i).padStart(2, '0')}T08:00:00.000Z`,
  });
}

test.describe('Role homepages', () => {
  test('"/" offers exactly the two role choices', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');

    const main = page.locator('main');
    await expect(main.getByRole('link', { name: /Tôi cần việc/ })).toHaveAttribute('href', '/for-workers');
    await expect(main.getByRole('link', { name: /Tôi cần tuyển/ })).toHaveAttribute('href', '/for-employers');

    // Thẻ có ảnh + 3 lợi ích ngắn; bản demo nói rõ ví mô phỏng / chưa thu phí.
    await expect(main.locator('ul > li > a img')).toHaveCount(2);
    await expect(main.getByText('Ví mô phỏng', { exact: true })).toBeVisible();
    await expect(main.getByText('Chưa thu phí', { exact: true })).toBeVisible();

    await main.getByRole('link', { name: /Tôi cần việc/ }).click();
    await page.waitForURL('**/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
  });

  // Ca gấp = đang tuyển, bắt đầu trong 24 giờ tới, còn thiếu người.
  // Đồng hồ ghim ở ANCHOR_ISO (2027-06-02 12:00 ICT).
  test('"/" shows "Ca gấp cần người" with only urgent unfilled shifts', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    const base = { status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, startTime: '08:00', endTime: '12:00' };
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ ...base, id: 'e2e-urgent-1', title: 'E2E Ca gấp', date: '2027-06-03', positionsFilled: 0 }),
          buildShift({ ...base, id: 'e2e-urgent-full', title: 'E2E Ca gấp đủ người', date: '2027-06-03', positionsFilled: 2 }),
          buildShift({ ...base, id: 'e2e-far', title: 'E2E Ca còn xa', date: '2027-06-20', positionsFilled: 0 }),
        ],
      }),
    );
    await gotoApp('/');

    const block = page.locator('section[aria-labelledby="home-urgent"]');
    await expect(block.getByRole('heading', { name: 'Ca gấp cần người' })).toBeVisible();
    const cards = block.locator('a[href^="/shifts/e2e-"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute('href', '/shifts/e2e-urgent-1');
  });

  test('"/" hides the urgent block when no shift is urgent', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ id: 'e2e-far', title: 'E2E Ca còn xa', date: '2027-06-20', status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, positionsFilled: 0 }),
        ],
      }),
    );
    await gotoApp('/');
    await expect(page.getByRole('link', { name: /Tôi cần việc/ })).toBeVisible();
    await expect(page.locator('#home-urgent')).toHaveCount(0);
  });

  test('/for-workers: switch marks worker, shows newest 6 open shifts, links to /for-employers', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shifts = [1, 2, 3, 4, 5, 6, 7].map(openShift);
    // Ca đã huỷ không được hiện.
    shifts.push({ ...openShift(9), id: 'e2e-home-cancelled', title: 'E2E Ca đã huỷ', status: 'Cancelled' });
    await seedState(buildSnapshot({ shifts }));
    await gotoApp('/for-workers');

    const sw = page.getByRole('navigation', { name: 'Chọn trang theo vai trò' });
    await expect(sw.getByRole('link', { name: 'Tôi cần việc' })).toHaveAttribute('aria-current', 'page');
    await expect(sw.getByRole('link', { name: 'Tôi cần tuyển' })).not.toHaveAttribute('aria-current', 'page');

    const cards = page.locator('section[aria-labelledby="worker-latest"] a[href^="/shifts/e2e-home-"]');
    await expect(cards).toHaveCount(6);
    await expect(cards.first()).toHaveAttribute('href', '/shifts/e2e-home-shift-7');
    await expect(page.getByText('E2E Ca mới 1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('E2E Ca đã huỷ')).toHaveCount(0);

    // Menu khách không còn "Tìm ca làm" → hero có đăng ký (chính) + xem ca + đăng nhập.
    const hero = page.locator('main section').first();
    await expect(hero.getByRole('link', { name: /Đăng ký để nhận ca/ })).toHaveAttribute('href', '/register?role=worker');
    await expect(hero.getByRole('link', { name: 'Xem ca đang tuyển' })).toHaveAttribute('href', '/shifts');
    await expect(hero.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');

    // Local/demo: lợi ích tiền nói rõ là mô phỏng.
    await expect(page.getByText('Ca hoàn thành, tiền công vào ví (mô phỏng trong bản demo).')).toBeVisible();

    await page.getByRole('link', { name: /Xem trang tuyển dụng/ }).click();
    await page.waitForURL('**/for-employers');
  });

  test('đường dẫn cũ /viec-lam, /tuyen-dung chuyển sang /for-workers, /for-employers', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await gotoApp('/viec-lam');
    await page.waitForURL('**/for-workers');
    await gotoApp('/tuyen-dung');
    await page.waitForURL('**/for-employers');
  });

  test('/for-workers: no open shift → honest empty state', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByText('Chưa có ca nào đang tuyển. Quay lại sau nhé.')).toBeVisible();
  });

  test('/for-employers: switch marks employer, CTA goes to employer register, demo pricing is 0đ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');

    const sw = page.getByRole('navigation', { name: 'Chọn trang theo vai trò' });
    await expect(sw.getByRole('link', { name: 'Tôi cần tuyển' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');
    await expect(page.getByRole('link', { name: /Đăng ký để đăng ca/ }).first()).toHaveAttribute(
      'href',
      '/register?role=employer',
    );
    const pricing = page.locator('section[aria-labelledby="employer-pricing"]');
    await expect(pricing.getByText('0đ', { exact: true })).toBeVisible();
    await expect(pricing).toContainText('chưa thu phí');
  });

  test('logged-in logo goes to the role workspace', async ({ page, seedState, loginAs, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');
    await expect(page.locator('header a:has(img[src="/images/logo.png"])').first()).toHaveAttribute(
      'href',
      '/employer/dashboard',
    );
  });
});

test.describe('Nút VI / EN (đợt 1: trang công khai)', () => {
  test('chuyển sang English rồi về Tiếng Việt, nhớ lựa chọn khi tải lại', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');

    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find short shifts near you');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('button', { name: 'Workers' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find short shifts near you');

    await page.getByRole('button', { name: 'Chuyển sang Tiếng Việt' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  });
});
