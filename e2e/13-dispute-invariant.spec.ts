import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * QA-Fix-1 regression — dispute invariant (H1, H2).
 *
 * H1: An Open dispute forces the linked application into Disputed and
 *     hides the employer confirm-and-pay control.
 * H2: After the admin resolves the dispute, neither side shows a stale
 *     "Đang khiếu nại" / wrong state.
 */

function disputedSetup(idSuffix: string) {
  const shift = buildShift({
    id: `e2e-di-shift-${idSuffix}`,
    title: 'E2E Dispute Invariant Shift',
    date: '2027-06-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'AwaitingConfirmation',
    // Escrow intentionally seeded as Completed (NOT Disputed) to prove
    // the lifecycle invariant reconciles it on load.
    escrowStatus: 'Completed',
    positionsTotal: 1,
    positionsFilled: 1,
  });
  // App seeded as CheckedOut (NOT Disputed) even though an Open dispute
  // exists — the invariant must flip it to Disputed.
  const application = buildApplication({
    id: `e2e-di-app-${idSuffix}`,
    shiftId: shift.id,
    status: 'CheckedOut',
    checkInAt: '2027-06-10T08:05:00.000Z',
    checkOutAt: '2027-06-10T12:02:00.000Z',
    autoReleaseAt: '2027-06-11T00:02:00.000Z',
    payoutAmount: 200000,
  });
  const dispute = {
    id: `e2e-di-disp-${idSuffix}`,
    shiftId: shift.id,
    applicationId: application.id,
    raisedBy: 'employer',
    category: 'ChecklistFailed',
    reason: 'Checklist chưa hoàn thành.',
    status: 'Open',
    createdAt: '2027-06-10T12:10:00.000Z',
    responses: [],
  };
  return { shift, application, dispute };
}

test.describe('H1: open dispute forces Disputed + hides confirm', () => {
  test('employer detail shows the dispute bucket, not a confirm-and-pay panel', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const { shift, application, dispute } = disputedSetup('1');
    await seedState(
      buildSnapshot({
        shifts: [shift],
        applications: [application],
        disputes: [dispute],
      }),
    );
    await loginAs(ACCOUNTS.employer.id);

    await gotoApp(`/employer/shifts/${shift.id}`);

    // The application reconciled to Disputed → "Đang khiếu nại" bucket.
    await expect(page.locator('#applicant-bucket-Disputed')).toBeVisible();
    // The confirm-and-pay control must NOT be present.
    await expect(
      page.getByRole('button', { name: 'Xác nhận hoàn thành' }),
    ).toHaveCount(0);
    // No "Chờ xác nhận hoàn thành" bucket for this app.
    await expect(page.locator('#applicant-bucket-AwaitingConfirmation')).toHaveCount(0);
  });
});

test.describe('H2: admin resolves dispute, stale state clears', () => {
  test('after release, employer no longer shows Đang khiếu nại and app is Confirmed', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const { shift, application, dispute } = disputedSetup('2');
    await seedState(
      buildSnapshot({
        shifts: [shift],
        applications: [application],
        disputes: [dispute],
      }),
    );
    await loginAs(ACCOUNTS.admin.id);

    await gotoApp('/admin/dashboard?tab=disputes');

    // Resolve: release to worker.
    await page.getByRole('button', { name: 'Giải quyết tranh chấp' }).first().click();
    await page.getByRole('button', { name: 'Thanh toán cho người làm' }).click();
    await page.getByLabel(/Ghi chú/).first().fill('Người làm đã hoàn thành đầy đủ.');
    await page.getByRole('button', { name: 'Xác nhận' }).first().click();
    await page.waitForLoadState('networkidle');

    // Employer side no longer shows the dispute bucket.
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);
    await expect(page.locator('#applicant-bucket-Disputed')).toHaveCount(0);
    // App moved to Confirmed → "Đã hoàn thành" bucket.
    await expect(page.locator('#applicant-bucket-Confirmed')).toBeVisible();
  });
});
