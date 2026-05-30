import { test, expect } from './fixtures/test';
import { buildSnapshot, buildWorker, buildEmployer, buildAdmin } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * PRODUCT-UX-FIX-BACKEND-PREP-1 E2E.
 *
 *   Part 1 — schedule button renamed to "Thêm lịch trình"; the dialog
 *            offers both "Lịch rảnh" and "Lịch bận" and adding either
 *            kind works.
 *   Part 2 — a brand-new worker (no skill scores) still sees the skill
 *            section with default casual-job cards at Cấp 1, and no
 *            programming-language skills appear.
 *   Part 3 — honest backend note remains visible site-wide.
 */

test.describe('Part 1: schedule "Thêm lịch trình" + busy/available', () => {
  test('page shows the renamed button and the dialog offers both kinds', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/schedule');

    // Renamed button.
    const addButton = page.getByRole('button', { name: 'Thêm lịch trình' }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Modal helper copy + both options.
    await expect(
      page.getByText(/Bạn có thể thêm khoảng thời gian rảnh/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Lịch rảnh', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Lịch bận', exact: true }),
    ).toBeVisible();
  });

  test('dialog defaults and kind toggle switch between available and busy', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/schedule');

    await page.getByRole('button', { name: 'Thêm lịch trình' }).first().click();

    // Selecting "Lịch rảnh" shows the availability hint.
    await page.getByRole('button', { name: 'Lịch rảnh', exact: true }).click();
    await expect(
      page.getByText(/Khung giờ rảnh giúp gợi ý ca làm/),
    ).toBeVisible();

    // Selecting "Lịch bận" shows the busy hint.
    await page.getByRole('button', { name: 'Lịch bận', exact: true }).click();
    await expect(
      page.getByText(/Khung giờ bận sẽ chặn ứng tuyển/),
    ).toBeVisible();
  });
});

test.describe('Part 2: skill section visible for a brand-new worker', () => {
  test('new worker (no scores) sees default casual-job skill cards, no programming skills', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    // Worker with empty skillScores.
    const freshWorker = buildWorker({ skillScores: [], completedShiftCount: 0 });
    await seedState(
      buildSnapshot({
        users: [buildEmployer(), freshWorker, buildAdmin()],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/profile');

    // Section heading present + default casual-job categories visible.
    await expect(page.getByText('Kỹ năng của bạn')).toBeVisible();
    await expect(page.getByText('Phục vụ').first()).toBeVisible();
    await expect(page.getByText('Pha chế').first()).toBeVisible();
    await expect(page.getByText('Bốc xếp').first()).toBeVisible();
    // Default placeholders render at Level 1.
    await expect(page.getByText('Cấp 1').first()).toBeVisible();

    // No programming-language skills anywhere on the page.
    await expect(page.getByText('Java', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Python', { exact: true })).toHaveCount(0);
    await expect(page.getByText('C++', { exact: true })).toHaveCount(0);
  });
});

test.describe('Part 3: honest backend note', () => {
  test('footer demo-data note is visible', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/profile');

    await expect(
      page.getByText(
        'Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu.',
      ),
    ).toBeVisible();
  });
});
