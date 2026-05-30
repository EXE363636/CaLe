import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 5 — employer sees the worker's checkout note + evidence in the
 * confirmation panel.
 * Flow 6 — employer confirms completion; worker wallet increases and a
 * post-payment rating banner appears for the worker.
 *
 * Preconditions are seeded directly (CheckedOut application with a
 * note + evidence filename + autoReleaseAt) so the test focuses on the
 * employer confirmation surface, not the checkout dialog mechanics.
 */

const AFTER_END = '2027-06-10T14:30:00'; // 14:30 ICT — shift ended

function checkedOutShiftAndApp(idSuffix: string) {
  const shift = buildShift({
    id: `e2e-co-shift-${idSuffix}`,
    title: 'E2E Checkout Shift',
    date: '2027-06-10',
    startTime: '12:00',
    endTime: '14:00',
    status: 'AwaitingConfirmation',
    escrowStatus: 'Completed',
    positionsTotal: 1,
    positionsFilled: 1,
    evidenceRequirement: 'OptionalPhoto',
  });
  const application = buildApplication({
    id: `e2e-co-app-${idSuffix}`,
    shiftId: shift.id,
    status: 'CheckedOut',
    checkInAt: '2027-06-10T12:05:00.000Z',
    checkOutAt: '2027-06-10T14:02:00.000Z',
    autoReleaseAt: '2027-06-11T02:02:00.000Z',
    workerCheckoutNote: 'Đã dọn bàn và bàn giao ca đầy đủ.',
    workerEvidenceFileName: 'ban-giao-ca.jpg',
    payoutAmount: 90000,
  });
  return { shift, application };
}

test.describe('Flow 5: employer sees checkout note + evidence', () => {
  test('confirmation panel shows the worker note and evidence filename', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(AFTER_END) });
    const { shift, application } = checkedOutShiftAndApp('5');
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.employer.id, '2027-06-10T14:00:00.000Z');

    await gotoApp(`/employer/shifts/${shift.id}`);

    await expect(
      page.getByText('Đã dọn bàn và bàn giao ca đầy đủ.'),
    ).toBeVisible();
    await expect(page.getByText('ban-giao-ca.jpg')).toBeVisible();
  });
});

test.describe('Flow 6: employer confirms, worker wallet + rating', () => {
  test('confirm completion credits the worker wallet and prompts a rating', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(AFTER_END) });
    const { shift, application } = checkedOutShiftAndApp('6');
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.employer.id, '2027-06-10T14:00:00.000Z');

    await gotoApp(`/employer/shifts/${shift.id}`);

    // Confirm completion opens the inline rating form; submit 5 stars.
    await page.getByRole('button', { name: 'Xác nhận hoàn thành' }).click();

    // The RatingForm shows star buttons (aria-label "N sao"). Click 5.
    await page.getByRole('button', { name: '5 sao' }).click();
    // Submit the rating ("Gửi").
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // Worker side: wallet balance increased + post-payment rating banner.
    await loginAs(ACCOUNTS.worker.id, '2027-06-10T14:00:00.000Z');
    await gotoApp('/worker/dashboard');

    // Wallet balance tile shows the credited payout (90.000 đ).
    await expect(page.getByText('90.000 đ').first()).toBeVisible();

    // Worker shift detail shows the post-payment rating prompt.
    await gotoApp(`/shifts/${shift.id}`);
    await expect(
      page.getByText('Bạn đã nhận lương. Hãy đánh giá nhà tuyển dụng để hoàn tất ca.'),
    ).toBeVisible();
  });
});
