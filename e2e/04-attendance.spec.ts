import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 4 — after the worker self-checks-in, the employer still sees
 * "Xác nhận có mặt" (mark present) and a mismatch warning appears
 * because only the worker confirmed presence.
 *
 * Clock is pinned to during the shift so the employer mark-present
 * gate (`canEmployerMarkPresent`: start−15min .. end+60min) is open.
 */

const SHIFT = {
  id: 'e2e-attend-shift',
  title: 'E2E Attendance Shift',
  date: '2027-06-10',
  startTime: '12:00',
  endTime: '14:00',
};

// 12:30 ICT — during the shift.
const DURING = '2027-06-10T12:30:00';

test.describe('Flow 4: check-in + employer mark-present + mismatch', () => {
  test('worker checked in (employer not yet) — employer sees mark-present and a mismatch warning', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(DURING) });

    const shift = buildShift({
      ...SHIFT,
      status: 'InProgress',
      escrowStatus: 'InProgress',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    // Worker self-checked-in: checkInAt set, markedPresentAt NOT set.
    const application = buildApplication({
      id: 'e2e-attend-app',
      shiftId: shift.id,
      status: 'CheckedIn',
      approvedAt: '2027-06-02T03:00:00.000Z',
      checkInAt: '2027-06-10T12:05:00.000Z',
      payoutAmount: 90000,
    });

    await seedState(
      buildSnapshot({ shifts: [shift], applications: [application] }),
    );
    await loginAs(ACCOUNTS.employer.id, '2027-06-10T12:00:00.000Z');

    await gotoApp(`/employer/shifts/${shift.id}`);

    // Employer can still mark the worker present.
    await expect(
      page.getByRole('button', { name: 'Xác nhận có mặt' }),
    ).toBeVisible();

    // CORE-STABILITY-9 Part 1 — employer sees EMPLOYER-perspective copy
    // (never worker-perspective). Worker self-checked-in mid-shift →
    // state WorkerCheckedInInProgress → "Người làm đã check-in. Vui
    // lòng xác nhận có mặt nếu đúng."
    await expect(
      page.getByText(/Người làm đã check-in\. Vui lòng xác nhận có mặt/),
    ).toBeVisible();
  });

  test('employer marks present — mismatch warning clears', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(DURING) });

    const shift = buildShift({
      ...SHIFT,
      id: 'e2e-attend-shift-2',
      status: 'InProgress',
      escrowStatus: 'InProgress',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    const application = buildApplication({
      id: 'e2e-attend-app-2',
      shiftId: shift.id,
      status: 'CheckedIn',
      checkInAt: '2027-06-10T12:05:00.000Z',
      payoutAmount: 90000,
    });

    await seedState(
      buildSnapshot({ shifts: [shift], applications: [application] }),
    );
    await loginAs(ACCOUNTS.employer.id, '2027-06-10T12:00:00.000Z');

    await gotoApp(`/employer/shifts/${shift.id}`);

    await page.getByRole('button', { name: 'Xác nhận có mặt' }).click();

    // After confirming, the state moves to BothConfirmedPresent so the
    // "Vui lòng xác nhận có mặt" prompt clears.
    await expect(
      page.getByText(/Người làm đã check-in\. Vui lòng xác nhận có mặt/),
    ).toHaveCount(0);
  });
});
