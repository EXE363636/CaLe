import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * QA-Fix-2 Phase 4 — custom wallet top-up.
 * QA-Fix-2 Phase 5 — navbar layout / no horizontal overflow.
 */

test.describe('Phase 4: custom wallet top-up', () => {
  test('top up an exact custom amount (123.000đ) and see it in the ledger', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('123000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();

    // Balance shows exactly 123.000 đ.
    await expect(page.getByText('123.000 đ').first()).toBeVisible();

    // Ledger modal lists the top-up line.
    await page.getByRole('button', { name: 'Xem lịch sử giao dịch' }).click();
    const ledgerDialog = page.getByRole('dialog');
    await expect(ledgerDialog.getByText('Nạp tiền vào ví').first()).toBeVisible();
    await expect(ledgerDialog.getByText('+123.000 đ').first()).toBeVisible();
  });

  test('invalid top-up amounts are blocked', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
    const dialog = page.getByRole('dialog');

    // Empty → required error.
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(dialog.getByText('Vui lòng nhập số tiền.')).toBeVisible();

    // Letters are stripped by the numeric-only input → stays empty.
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('abc');
    await expect(dialog.getByLabel('Số tiền muốn nạp (đồng)')).toHaveValue('');

    // 0 → invalid.
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('0');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(
      dialog.getByText('Số tiền không hợp lệ. Chỉ nhập số dương.'),
    ).toBeVisible();
  });

  test('employer can also custom top-up', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');

    await page.getByRole('button', { name: 'Nạp tiền vào ví' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('250000');
    await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
    await expect(page.getByText('250.000 đ').first()).toBeVisible();
  });
});

test.describe('Phase 5: navbar layout', () => {
  for (const width of [1440, 1024]) {
    test(`employer nav has no horizontal overflow at ${width}px`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedState(buildSnapshot());
      await loginAs(ACCOUNTS.employer.id);
      await gotoApp('/employer/dashboard');

      // No horizontal overflow: scrollWidth must not exceed clientWidth.
      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1); // allow sub-pixel rounding

      // The sticky nav header is present (truncation keeps it intact).
      await expect(page.getByRole('banner')).toBeVisible();
    });
  }

  test('admin nav accessible with no overflow at 1440px', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.admin.id);
    await gotoApp('/admin/dashboard');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole('link', { name: 'Tổng quan admin' }),
    ).toBeVisible();
  });
});
