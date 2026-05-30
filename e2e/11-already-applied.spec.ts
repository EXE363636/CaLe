import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 11 — the public worker shift list shows an already-applied
 * status ("Đã ứng tuyển") instead of a plain recruiting state for a
 * shift the current worker has already applied to.
 */

test.describe('Flow 11: worker job list reflects already-applied', () => {
  test('a shift the worker already applied to shows "Đã ứng tuyển"', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const applied = buildShift({
      id: 'e2e-applied-shift',
      title: 'Ca đã ứng tuyển E2E',
      date: '2030-04-10',
      status: 'Published',
      positionsTotal: 3,
      positionsFilled: 0,
    });
    const application = buildApplication({
      id: 'e2e-applied-app',
      shiftId: applied.id,
      status: 'Pending',
    });
    await seedState(
      buildSnapshot({ shifts: [applied], applications: [application] }),
    );
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp('/shifts');

    // The card for this shift shows the already-applied chip.
    await expect(page.getByText('Ca đã ứng tuyển E2E')).toBeVisible();
    await expect(page.getByText('Đã ứng tuyển').first()).toBeVisible();
    // And a "view details" affordance instead of an apply CTA.
    await expect(page.getByText('Xem chi tiết').first()).toBeVisible();
  });
});
