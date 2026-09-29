import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * P0 feedback — "Ca công khai" removed from the employer top nav.
 *
 * The only real use of that link was "see my shift the way workers see
 * it". That now lives on the employer's own shift page as
 * "Xem như người lao động thấy" → `/shifts/<id>`, where the owner sees
 * an explanatory note (instead of the apply button) and "Quay lại"
 * returns to the manage page, not the public list.
 */

const DESKTOP = { width: 1440, height: 900 };

function seedShift() {
  return buildShift({
    id: 'e2e-view-as-worker-shift',
    title: 'E2E Xem như người lao động',
    date: '2030-05-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 0,
  });
}

test.describe('Employer: view own shift as a worker', () => {
  test('employer nav has no "Ca công khai" link', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: [seedShift()] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Ca công khai' })).toHaveCount(0);
    await expect(nav.locator('a[href="/shifts"]')).toHaveCount(0);
  });

  test('"Xem như người lao động thấy" opens the public page; "Quay lại" returns to manage page', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: [seedShift()] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/shifts/e2e-view-as-worker-shift');

    const preview = page.getByRole('link', { name: /Xem như người lao động thấy/ });
    await expect(preview).toHaveAttribute('href', '/shifts/e2e-view-as-worker-shift');
    await preview.click();

    await page.waitForURL('**/shifts/e2e-view-as-worker-shift');
    await expect(page.getByRole('heading', { name: 'E2E Xem như người lao động' })).toBeVisible();
    await expect(page.getByText('Đây là trang người lao động thấy khi xem ca của bạn.')).toBeVisible();

    const back = page.getByRole('link', { name: /Quay lại/ }).first();
    await expect(back).toHaveAttribute('href', '/employer/shifts/e2e-view-as-worker-shift');
    await back.click();
    await page.waitForURL('**/employer/shifts/e2e-view-as-worker-shift');
  });

  test('draft / pending-deposit shift has no preview link', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(
      buildSnapshot({
        shifts: [{ ...seedShift(), escrowStatus: 'PendingDeposit' }],
      }),
    );
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/shifts/e2e-view-as-worker-shift');

    await expect(page.getByRole('heading', { name: 'E2E Xem như người lao động' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem như người lao động thấy/ })).toHaveCount(0);
  });
});
