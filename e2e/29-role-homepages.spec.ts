import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * P1 feedback F4 — trang chủ tách theo vai trò.
 *
 *   - `/` chỉ có 2 lựa chọn: "Tôi cần việc" → /viec-lam, "Tôi cần tuyển" → /tuyen-dung.
 *   - Hai trang vai trò có công tắc chung (aria-current đúng trang).
 *   - /viec-lam hiện tối đa 6 ca đang tuyển THẬT, mới đăng trước.
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
    await expect(main.getByRole('link', { name: /Tôi cần việc/ })).toHaveAttribute('href', '/viec-lam');
    await expect(main.getByRole('link', { name: /Tôi cần tuyển/ })).toHaveAttribute('href', '/tuyen-dung');

    await main.getByRole('link', { name: /Tôi cần việc/ }).click();
    await page.waitForURL('**/viec-lam');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
  });

  test('/viec-lam: switch marks worker, shows newest 6 open shifts, links to /tuyen-dung', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shifts = [1, 2, 3, 4, 5, 6, 7].map(openShift);
    // Ca đã huỷ không được hiện.
    shifts.push({ ...openShift(9), id: 'e2e-home-cancelled', title: 'E2E Ca đã huỷ', status: 'Cancelled' });
    await seedState(buildSnapshot({ shifts }));
    await gotoApp('/viec-lam');

    const sw = page.getByRole('navigation', { name: 'Chọn trang theo vai trò' });
    await expect(sw.getByRole('link', { name: 'Tôi cần việc' })).toHaveAttribute('aria-current', 'page');
    await expect(sw.getByRole('link', { name: 'Tôi cần tuyển' })).not.toHaveAttribute('aria-current', 'page');

    const cards = page.locator('section[aria-labelledby="worker-latest"] a[href^="/shifts/e2e-home-"]');
    await expect(cards).toHaveCount(6);
    await expect(cards.first()).toHaveAttribute('href', '/shifts/e2e-home-shift-7');
    await expect(page.getByText('E2E Ca mới 1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('E2E Ca đã huỷ')).toHaveCount(0);

    // Local/demo: lợi ích tiền nói rõ là mô phỏng.
    await expect(page.getByText('Ca hoàn thành, tiền công vào ví (mô phỏng trong bản demo).')).toBeVisible();

    await page.getByRole('link', { name: /Xem trang tuyển dụng/ }).click();
    await page.waitForURL('**/tuyen-dung');
  });

  test('/viec-lam: no open shift → honest empty state', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/viec-lam');
    await expect(page.getByText('Chưa có ca nào đang tuyển. Quay lại sau nhé.')).toBeVisible();
  });

  test('/tuyen-dung: switch marks employer, CTA goes to employer register, demo pricing is 0đ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/tuyen-dung');

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
