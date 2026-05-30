import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * CORE-STABILITY-6 — E2E for:
 *   Part 1: worker "Việc đã ứng tuyển" same-route section intent
 *   Part 3: wallet withdrawal (worker + employer), guarded
 *   Part 4: employer deposit blocked on insufficient balance
 */

const DESKTOP = { width: 1440, height: 900 };

async function openUserMenu(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Mở menu tài khoản' }).hover();
  await expect(page.getByRole('menu', { name: 'Tài khoản' })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Part 1 — worker "Việc đã ứng tuyển" same-route intent
// ---------------------------------------------------------------------------

test.describe('Part 1: worker applied-jobs section intent (same-route)', () => {
  test('UserMenu "Việc đã ứng tuyển" focuses the applied section while already on the dashboard (repeat-safe)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shift = buildShift({
      id: 'cs6-applied-shift',
      title: 'CS6 Applied Shift',
      date: '2030-09-10',
      positionsTotal: 3,
      positionsFilled: 0,
    });
    const application = buildApplication({
      id: 'cs6-applied-app',
      shiftId: shift.id,
      status: 'Pending',
    });
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    const section = page.locator('#worker-applications-section');
    await expect(section).toBeVisible();

    // Click the shortcut while already on the dashboard.
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Việc đã ứng tuyển' }).click();

    // The section gets a temporary highlight ring (visible result, not
    // just a URL change).
    await expect(section).toHaveClass(/ring-2/, { timeout: 4000 });
    expect(page.url()).toContain('/worker/dashboard');

    // Wait for the highlight to auto-clear, then re-click — it must
    // highlight again.
    await expect(section).not.toHaveClass(/ring-2/, { timeout: 4000 });
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Việc đã ứng tuyển' }).click();
    await expect(section).toHaveClass(/ring-2/, { timeout: 4000 });
  });
});

// ---------------------------------------------------------------------------
// Part 3 — wallet withdrawal
// ---------------------------------------------------------------------------

test.describe('Part 3: wallet withdrawal', () => {
  test('worker withdraws a valid amount and sees the ledger entry', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    // Top up first so there is a balance to withdraw.
    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('500000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('500.000 đ').first()).toBeVisible();

    // Withdraw 200.000.
    await page.getByRole('button', { name: 'Rút tiền' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn rút (đồng)').fill('200000');
    await dialog.getByRole('button', { name: 'Xác nhận rút' }).click();

    // Balance drops to 300.000.
    await expect(page.getByText('300.000 đ').first()).toBeVisible();

    // Ledger shows the withdrawal line (negative).
    await page.getByRole('button', { name: 'Xem lịch sử giao dịch' }).click();
    const ledger = page.getByRole('dialog');
    await expect(ledger.getByText('Rút tiền khỏi ví').first()).toBeVisible();
    await expect(ledger.getByText('-200.000 đ').first()).toBeVisible();
  });

  test('withdrawal greater than balance is blocked with a clear error', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('100000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('100.000 đ').first()).toBeVisible();

    await page.getByRole('button', { name: 'Rút tiền' }).click();
    dialog = page.getByRole('dialog');
    // Over-balance.
    await dialog.getByLabel('Số tiền muốn rút (đồng)').fill('200000');
    await dialog.getByRole('button', { name: 'Xác nhận rút' }).click();
    await expect(
      dialog.getByText('Số dư không đủ để rút tiền.'),
    ).toBeVisible();

    // Letters are stripped → empty → required error.
    await dialog.getByLabel('Số tiền muốn rút (đồng)').fill('abc');
    await expect(dialog.getByLabel('Số tiền muốn rút (đồng)')).toHaveValue('');
  });

  test('employer can also withdraw', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');

    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).first().click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('300000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('300.000 đ').first()).toBeVisible();

    await page.getByRole('button', { name: 'Rút tiền' }).first().click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn rút (đồng)').fill('100000');
    await dialog.getByRole('button', { name: 'Xác nhận rút' }).click();
    await expect(page.getByText('200.000 đ').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Part 4 — employer deposit insufficient balance
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
  // CORE-STABILITY-8 Part 2 — on-site contact required to publish.
  await page.getByLabel(/^Người phụ trách tại chỗ/).fill('Anh Liêm');
  await page.getByLabel(/^SĐT người phụ trách tại chỗ/).fill('0901234567');
}

test.describe('Part 4: employer deposit blocked on insufficient balance', () => {
  test('deposit is blocked with the insufficient-balance error when the wallet is empty', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    // Verified employer (buildSnapshot seeds approved docs) but ZERO
    // wallet balance.
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');
    await gotoApp('/employer/shifts/new');

    await fillShiftForm(page, {
      date: '2030-06-15',
      start: '08:00',
      end: '12:00',
      title: 'CS6 Insufficient Deposit Shift',
    });
    await page.getByRole('button', { name: 'Đăng ca cần tuyển' }).click();

    // Deposit confirm card appears after a valid create.
    const depositBtn = page.getByRole('button', {
      name: 'Xác nhận đã thanh toán',
    });
    await expect(depositBtn).toBeVisible();

    // Attempt deposit with 0 balance → blocked. CORE-STABILITY-7 Part 2
    // replaced the bare toast with a modal offering a top-up path; the
    // modal title still surfaces the insufficient-balance message.
    await depositBtn.click();
    const insufficientModal = page.getByRole('dialog');
    await expect(
      insufficientModal.getByText('Số dư ví không đủ để đặt cọc').first(),
    ).toBeVisible();
    await expect(
      insufficientModal.getByRole('button', { name: 'Nạp tiền ngay' }),
    ).toBeVisible();

    // No ghost published shift was created.
    const published = await page.evaluate(() => {
      const shifts = JSON.parse(localStorage.getItem('cale.shifts') || '[]');
      return shifts.filter(
        (s: { status: string; title: string }) =>
          s.title === 'CS6 Insufficient Deposit Shift' &&
          s.status === 'Published',
      ).length;
    });
    expect(published).toBe(0);
  });

  test('deposit succeeds after topping up enough', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');

    // Top up generously on the dashboard first.
    await gotoApp('/employer/dashboard');
    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).first().click();
    const topUp = page.getByRole('dialog');
    await topUp.getByLabel('Số tiền muốn nạp (đồng)').fill('5000000');
    await topUp.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('5.000.000 đ').first()).toBeVisible();

    // Now create + deposit a shift.
    await gotoApp('/employer/shifts/new');
    await fillShiftForm(page, {
      date: '2030-06-15',
      start: '08:00',
      end: '12:00',
      title: 'CS6 Funded Deposit Shift',
    });
    await page.getByRole('button', { name: 'Đăng ca cần tuyển' }).click();
    const depositBtn = page.getByRole('button', {
      name: 'Xác nhận đã thanh toán',
    });
    await expect(depositBtn).toBeVisible();
    await depositBtn.click();

    // No insufficient-balance error; deposit succeeds.
    await expect(
      page.getByText('Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.'),
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Part 8 — baseline security / access-control for withdrawal
// ---------------------------------------------------------------------------

test.describe('Part 8: withdrawal security / access-control', () => {
  test('unauthenticated user is redirected away from the worker dashboard (no wallet access)', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await seedState(buildSnapshot()); // no auth pointer = guest
    await gotoApp('/worker/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
    // The wallet "Rút tiền" control is not reachable.
    await expect(page.getByRole('button', { name: 'Rút tiền' })).toHaveCount(0);
  });

  test('withdrawal note with an XSS payload renders as inert text (escaped, not executed)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('300000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('300.000 đ').first()).toBeVisible();

    await page.getByRole('button', { name: 'Rút tiền' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn rút (đồng)').fill('100000');
    const xss = '<img src=x onerror="window.__cs6xss=1">';
    await dialog
      .getByLabel(/Ghi chú \/ số tài khoản/)
      .fill(xss);
    await dialog.getByRole('button', { name: 'Xác nhận rút' }).click();
    await expect(page.getByText('200.000 đ').first()).toBeVisible();

    // Open the ledger so the withdrawal note (containing the payload)
    // is actually rendered, then assert it is inert text.
    await page.getByRole('button', { name: 'Xem lịch sử giao dịch' }).click();
    const ledger = page.getByRole('dialog');
    await expect(ledger.getByText('Rút tiền khỏi ví').first()).toBeVisible();

    // The payload did not execute and no injected <img src=x> exists.
    const xssFired = await page.evaluate(
      () => (window as unknown as { __cs6xss?: number }).__cs6xss === 1,
    );
    expect(xssFired).toBe(false);
    const injected = await page.evaluate(
      () => document.querySelectorAll('img[src="x"]').length,
    );
    expect(injected).toBe(0);
    // The literal payload text is present (escaped) in the ledger.
    await expect(ledger.getByText(xss, { exact: false }).first()).toBeVisible();
  });
});
