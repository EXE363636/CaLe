import { test, expect } from './fixtures/test';
import {
  buildSnapshot,
  buildShift,
  buildApplication,
  buildEmployerVerificationDocs,
} from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * CORE-STABILITY-7 — E2E for:
 *   Part 1: wallet top-up notification + deeplink to wallet history
 *   Part 2: insufficient-deposit draft modal + top-up resume
 *   Part 4: contact-phone numeric validation
 *   Part 6: feedback report flow
 *   Part 9: baseline security / access-control
 */

const DESKTOP = { width: 1440, height: 900 };

// ---------------------------------------------------------------------------
// Part 1 — wallet top-up notification + deeplink
// ---------------------------------------------------------------------------

test.describe('Part 1: wallet top-up notification + deeplink', () => {
  test('worker top-up creates a notification that deeplinks to wallet history', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    // Top up.
    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('500000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('500.000 đ').first()).toBeVisible();

    // A top-up notification appears in the bell.
    await page
      .getByRole('button', { name: 'Thông báo', exact: true })
      .click();
    const bell = page.getByRole('dialog', { name: 'Thông báo' });
    await expect(bell.getByText('Nạp tiền vào ví').first()).toBeVisible();

    // Clicking it opens the wallet ledger modal (same-route deeplink).
    await bell.getByText('Nạp tiền vào ví').first().click();
    await expect(
      page.getByText('Lịch sử giao dịch ví').first(),
    ).toBeVisible({ timeout: 4000 });
  });
});

// ---------------------------------------------------------------------------
// Part 2 — insufficient-deposit draft modal
// ---------------------------------------------------------------------------

async function fillShiftForm(
  page: import('@playwright/test').Page,
  opts: { date: string; start: string; end: string; title: string },
) {
  await page.getByLabel(/^Tên ca làm/).fill(opts.title);
  await page.getByLabel(/^Địa điểm/).fill('12 Nguyễn Huệ, Quận 1, TP.HCM');
  const [y, m, d] = opts.date.split('-');
  const dateInput = page.getByLabel(/^Ngày làm/);
  await dateInput.click();
  await dateInput.pressSequentially(`${d}${m}${y}`, { delay: 15 });
  await page.getByLabel(/^Giờ bắt đầu/).fill(opts.start);
  await page.getByLabel(/^Giờ kết thúc/).fill(opts.end);
  await page.locator('#shift-hourly-wage').fill('50000');
}

test.describe('Part 2: insufficient-deposit draft modal', () => {
  test('blocks deposit with a modal offering a top-up path; draft is preserved; resume after top-up', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // Verified employer, ZERO wallet balance.
    await seedState(
      buildSnapshot({
        employerVerifications: buildEmployerVerificationDocs(),
      }),
    );
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');
    await gotoApp('/employer/shifts/new');

    await fillShiftForm(page, {
      date: '2030-06-15',
      start: '08:00',
      end: '12:00',
      title: 'CS7 Draft Shift',
    });
    await page.getByRole('button', { name: 'Đăng ca cần tuyển' }).click();

    const depositBtn = page.getByRole('button', {
      name: 'Xác nhận đã thanh toán',
    });
    await expect(depositBtn).toBeVisible();
    await depositBtn.click();

    // The insufficient-balance MODAL appears (not just a toast) with the
    // three actions.
    const modal = page.getByRole('dialog');
    await expect(
      modal.getByText('Số dư ví không đủ để đặt cọc').first(),
    ).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Nạp tiền ngay' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Lưu nháp' })).toBeVisible();

    // No ghost published shift was created.
    const publishedBefore = await page.evaluate(() => {
      const shifts = JSON.parse(localStorage.getItem('cale.shifts') || '[]');
      return shifts.filter(
        (s: { status: string; title: string }) =>
          s.title === 'CS7 Draft Shift' && s.status === 'Published',
      ).length;
    });
    expect(publishedBefore).toBe(0);

    // "Nạp tiền ngay" opens the top-up modal; the deposit draft stays.
    await modal.getByRole('button', { name: 'Nạp tiền ngay' }).click();
    const topUp = page.getByRole('dialog');
    await topUp.getByLabel('Số tiền muốn nạp (đồng)').fill('5000000');
    await topUp.getByRole('button', { name: 'Xác nhận nạp' }).click();

    // The deposit-confirm card is still mounted — confirm again, this
    // time it succeeds (no insufficient-balance error).
    const depositBtn2 = page.getByRole('button', {
      name: 'Xác nhận đã thanh toán',
    });
    await expect(depositBtn2).toBeVisible();
    await depositBtn2.click();
    await expect(
      page.getByText('Số dư ví không đủ để đặt cọc').first(),
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Part 4 — contact phone numeric validation
// ---------------------------------------------------------------------------

test.describe('Part 4: numeric field validation', () => {
  test('on-site contact phone strips letters on input', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(
      buildSnapshot({
        employerVerifications: buildEmployerVerificationDocs(),
      }),
    );
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');
    await gotoApp('/employer/shifts/new');

    const phoneInput = page.getByLabel('SĐT người phụ trách tại chỗ');
    await phoneInput.fill('090abc123');
    // Letters are stripped — value holds digits only.
    await expect(phoneInput).toHaveValue('090123');
  });
});

// ---------------------------------------------------------------------------
// Part 6 — feedback report flow is covered by unit tests
// (src/__tests__/coreStability7.test.ts → reviewReportStore). The report
// UI lives inside the EmployerProfileModal / AdminUserProfileModal which
// are opened from deep within shift-detail flows; the store-backed
// behavior (reason required, admin notified, review stays visible,
// dedupe, resolve) is asserted deterministically at the unit level.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Part 9 — baseline security / access-control
// ---------------------------------------------------------------------------

test.describe('Part 9: security / access-control', () => {
  test('feedback comment with an XSS payload renders as inert text', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const xss = '<img src=x onerror="window.__cs7xss=1">';
    const feedback = {
      id: 'cs7-fb-xss',
      shiftId: 'cs7-shift',
      applicationId: 'cs7-app',
      fromUserId: ACCOUNTS.worker.id,
      toEmployerId: ACCOUNTS.employer.id,
      stars: 1,
      comment: xss,
      tags: [],
      createdAt: '2026-05-01T09:00:00.000Z',
    };
    await seedState(buildSnapshot({ employerFeedback: [feedback] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');

    // The payload must not have executed anywhere on the page.
    const fired = await page.evaluate(
      () => (window as unknown as { __cs7xss?: number }).__cs7xss === 1,
    );
    expect(fired).toBe(false);
    const injected = await page.evaluate(
      () => document.querySelectorAll('img[src="x"]').length,
    );
    expect(injected).toBe(0);
  });

  test('unauthenticated user cannot reach the employer shift-create (deposit) flow', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await gotoApp('/employer/shifts/new');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
