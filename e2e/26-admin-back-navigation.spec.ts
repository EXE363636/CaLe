import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * P0 feedback F7 — admin "Back" navigation.
 *
 *   - Admin has no landing of their own: the header logo points to
 *     `/admin/dashboard` and the admin desktop nav has no "Trang chủ".
 *   - The admin dashboard mirrors the active tab (+ shifts filter chip)
 *     in the URL via `history.replaceState`, so returning from a shift
 *     detail (in-app "Quay lại" or the browser Back button) lands on
 *     the "Ca làm" tab instead of the default "Thống kê" tab.
 *   - Shift detail "Quay lại" goes to `/admin/dashboard?tab=shifts`
 *     for admins and still to `/shifts` for everyone else.
 *
 * The desktop nav is `xl`-only, so a >= 1280px viewport is used.
 */

const DESKTOP = { width: 1440, height: 900 };

// Far-future Published shift so the stored status stays "Published"
// (counts under the "Đang hoạt động" chip) regardless of machine clock.
function seedShift() {
  return buildShift({
    id: 'e2e-admin-back-shift',
    title: 'E2E Admin Back Shift',
    date: '2030-05-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 0,
  });
}

function logoLink(page: import('@playwright/test').Page) {
  return page.locator('header a:has(img[src="/images/logo.png"])').first();
}

function adminTab(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

test.describe('Admin header: logo + nav', () => {
  test('logo links to /admin/dashboard and the admin nav has no "Trang chủ"', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.admin.id);
    await gotoApp('/admin/dashboard');

    await expect(logoLink(page)).toHaveAttribute('href', '/admin/dashboard');

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'Tổng quan admin' }),
    ).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Trang chủ' })).toHaveCount(0);
    await expect(nav.locator('a[href="/"]')).toHaveCount(0);
  });

  test('worker logo links to the shift list', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    // P1 feedback F4 — worker đã đăng nhập: logo về danh sách ca.
    await expect(logoLink(page)).toHaveAttribute('href', '/shifts');
  });
});

test.describe('Admin shifts tab survives a trip to shift detail', () => {
  test('filter chip is mirrored in the URL; "Quay lại" returns to the Ca làm tab', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shift = seedShift();
    await seedState(buildSnapshot({ shifts: [shift] }));
    await loginAs(ACCOUNTS.admin.id);
    await gotoApp('/admin/dashboard');

    await adminTab(page, 'Ca làm').click();
    await expect(adminTab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/\/admin\/dashboard\?tab=shifts$/);

    await page.getByRole('button', { name: 'Đang hoạt động', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Đang hoạt động', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/[?&]tab=shifts/);
    await expect(page).toHaveURL(/[?&]filter=active/);

    // Open the shift detail via the title link.
    await page.getByRole('link', { name: 'E2E Admin Back Shift' }).click();
    await expect(page).toHaveURL(new RegExp(`/shifts/${shift.id}$`));

    const back = page.getByRole('link', { name: /Quay lại/ });
    await expect(back).toHaveAttribute('href', '/admin/dashboard?tab=shifts');
    await back.click();

    await expect(page).toHaveURL(/\/admin\/dashboard\?tab=shifts/);
    await expect(adminTab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(adminTab(page, 'Thống kê')).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByRole('link', { name: 'E2E Admin Back Shift' }),
    ).toBeVisible();
  });

  test('browser Back from shift detail restores the Ca làm tab and the same filter chip', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shift = seedShift();
    await seedState(buildSnapshot({ shifts: [shift] }));
    await loginAs(ACCOUNTS.admin.id);
    await gotoApp('/admin/dashboard');

    await adminTab(page, 'Ca làm').click();
    await page.getByRole('button', { name: 'Đang hoạt động', exact: true }).click();
    await expect(page).toHaveURL(/[?&]filter=active/);

    await page.getByRole('link', { name: 'E2E Admin Back Shift' }).click();
    await expect(page).toHaveURL(new RegExp(`/shifts/${shift.id}$`));
    await expect(page.getByRole('link', { name: /Quay lại/ })).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL(/\/admin\/dashboard\?/);
    await expect(page).toHaveURL(/[?&]tab=shifts/);
    await expect(page).toHaveURL(/[?&]filter=active/);
    await expect(adminTab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Đang hoạt động', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Tất cả', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('Non-admin shift detail back link', () => {
  test('worker "Quay lại" on shift detail still goes to /shifts', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shift = seedShift();
    await seedState(buildSnapshot({ shifts: [shift] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);

    const back = page.getByRole('link', { name: /Quay lại/ });
    await expect(back).toHaveAttribute('href', '/shifts');
    await back.click();
    await expect(page).toHaveURL(/\/shifts$/);
  });
});
