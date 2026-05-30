import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 9 — reposting a cancelled shift opens a prefilled (sanitized)
 * form at /employer/shifts/new?from=… and does NOT auto-publish a new
 * shift. The source shift remains unchanged.
 */

test.describe('Flow 9: repost opens prefilled editable form', () => {
  test('repost navigates to a prefilled new-shift form without auto-publishing', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const cancelled = buildShift({
      id: 'e2e-repost-src',
      title: 'Phục vụ tiệc cuối tuần (đã huỷ)',
      description: 'Mô tả gốc cho ca tiệc.',
      status: 'Cancelled',
      escrowStatus: 'Refunded',
      date: '2027-06-05',
      startTime: '18:00',
      endTime: '22:00',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    await seedState(buildSnapshot({ shifts: [cancelled] }));
    await loginAs(ACCOUNTS.employer.id);

    await gotoApp(`/employer/shifts/${cancelled.id}`);

    // Count shifts before reposting.
    const shiftsBefore = await page.evaluate(
      () => JSON.parse(window.localStorage.getItem('cale.shifts') || '[]').length,
    );

    await page.getByRole('button', { name: 'Đăng lại từ ca này' }).click();
    // Wait for the client-side navigation to the new-shift form.
    await page.waitForURL(/\/employer\/shifts\/new\?from=/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // We landed on the new-shift form with `?from=`.
    expect(page.url()).toContain('/employer/shifts/new');
    expect(page.url()).toContain(`from=${cancelled.id}`);

    // Title is prefilled and sanitized — the "(đã huỷ)" suffix is gone.
    const titleInput = page.getByLabel('Tên ca làm');
    await expect(titleInput).toHaveValue('Phục vụ tiệc cuối tuần');

    // Date/start/end are blank (employer must pick a fresh future date).
    await expect(page.getByLabel('Ngày làm')).toHaveValue('');

    // No new shift was auto-created — count is unchanged, and the
    // source shift is still Cancelled.
    const shiftsAfter = await page.evaluate(() => {
      const list = JSON.parse(
        window.localStorage.getItem('cale.shifts') || '[]',
      ) as Array<{ id: string; status: string }>;
      return {
        count: list.length,
        srcStatus: list.find((s) => s.id === 'e2e-repost-src')?.status,
      };
    });
    expect(shiftsAfter.count).toBe(shiftsBefore);
    expect(shiftsAfter.srcStatus).toBe('Cancelled');
  });
});
