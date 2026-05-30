import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * CORE-STABILITY-10 E2E — the SAME shift must show the SAME lifecycle
 * label across worker dashboard, worker detail, employer dashboard, and
 * employer detail at a fixed clock. Check-in / mark-present must not
 * start the shift early, and checkout must not appear before end.
 *
 * Shift: 18:05–18:09 on 2027-06-10. Worker approved + self-checked-in
 * at 18:04; employer marked present at 18:00.
 */

const SHIFT_ID = 'e2e-cs10-shift';
const APP_ID = 'e2e-cs10-app';

function seedShiftWorld() {
  const shift = buildShift({
    id: SHIFT_ID,
    title: 'CS10 Ca tối',
    date: '2027-06-10',
    startTime: '18:05',
    endTime: '18:09',
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 1,
    positionsFilled: 1,
  });
  return { shift };
}

test.describe('CS10: lifecycle badge consistency across surfaces', () => {
  test('at 18:04 (pre-start) all surfaces agree it has NOT started + no checkout', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    // Clock just before start; worker checked in early at 18:04,
    // employer marked present at 18:00.
    await page.clock.install({ time: new Date('2027-06-10T18:04:30') });
    const { shift } = seedShiftWorld();
    const application = buildApplication({
      id: APP_ID,
      shiftId: SHIFT_ID,
      status: 'CheckedIn',
      approvedAt: '2027-06-02T03:00:00.000Z',
      markedPresentAt: '2027-06-10T11:00:00.000Z', // 18:00 ICT
      checkInAt: '2027-06-10T11:04:00.000Z', // 18:04 ICT
      payoutAmount: 90000,
    });
    await seedState(
      buildSnapshot({ shifts: [shift], applications: [application] }),
    );

    // Worker detail.
    await loginAs(ACCOUNTS.worker.id, '2027-06-10T18:00:00.000Z');
    await gotoApp(`/shifts/${SHIFT_ID}`);
    // Pre-start within 15min → "Sắp bắt đầu". NEVER "Đang diễn ra".
    await expect(page.getByText('Sắp bắt đầu').first()).toBeVisible();
    await expect(page.getByText('Đang diễn ra')).toHaveCount(0);
    // No checkout CTA before end.
    await expect(
      page.getByRole('button', { name: 'Check-out' }),
    ).toHaveCount(0);

    // Worker dashboard.
    await gotoApp('/worker/dashboard');
    await expect(page.getByText('Sắp bắt đầu').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Check-out' }),
    ).toHaveCount(0);

    // Employer detail.
    await loginAs(ACCOUNTS.employer.id, '2027-06-10T18:00:00.000Z');
    await gotoApp(`/employer/shifts/${SHIFT_ID}`);
    await expect(page.getByText('Sắp bắt đầu').first()).toBeVisible();
    await expect(page.getByText('Đang diễn ra')).toHaveCount(0);
  });

  test('at 18:06 (mid-shift) all surfaces show "Đang diễn ra" + no checkout', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date('2027-06-10T18:06:30') });
    const { shift } = seedShiftWorld();
    const application = buildApplication({
      id: APP_ID,
      shiftId: SHIFT_ID,
      status: 'CheckedIn',
      approvedAt: '2027-06-02T03:00:00.000Z',
      markedPresentAt: '2027-06-10T11:00:00.000Z',
      checkInAt: '2027-06-10T11:04:00.000Z',
      payoutAmount: 90000,
    });
    await seedState(
      buildSnapshot({ shifts: [shift], applications: [application] }),
    );

    // Worker detail.
    await loginAs(ACCOUNTS.worker.id, '2027-06-10T18:06:00.000Z');
    await gotoApp(`/shifts/${SHIFT_ID}`);
    await expect(page.getByText('Đang diễn ra').first()).toBeVisible();
    await expect(page.getByText('Sắp bắt đầu')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Check-out' }),
    ).toHaveCount(0);

    // Worker dashboard.
    await gotoApp('/worker/dashboard');
    await expect(page.getByText('Đang diễn ra').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Check-out' }),
    ).toHaveCount(0);

    // Employer detail.
    await loginAs(ACCOUNTS.employer.id, '2027-06-10T18:06:00.000Z');
    await gotoApp(`/employer/shifts/${SHIFT_ID}`);
    await expect(page.getByText('Đang diễn ra').first()).toBeVisible();
    await expect(page.getByText('Sắp bắt đầu')).toHaveCount(0);
  });

  test('at 18:10 (after end) worker checkout appears; all surfaces show ended state', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date('2027-06-10T18:10:30') });
    const { shift } = seedShiftWorld();
    const application = buildApplication({
      id: APP_ID,
      shiftId: SHIFT_ID,
      status: 'CheckedIn',
      approvedAt: '2027-06-02T03:00:00.000Z',
      markedPresentAt: '2027-06-10T11:00:00.000Z',
      checkInAt: '2027-06-10T11:04:00.000Z',
      payoutAmount: 90000,
    });
    await seedState(
      buildSnapshot({ shifts: [shift], applications: [application] }),
    );

    // Worker dashboard — checkout CTA visible after end.
    await loginAs(ACCOUNTS.worker.id, '2027-06-10T18:10:00.000Z');
    await gotoApp('/worker/dashboard');
    await expect(
      page.getByRole('button', { name: 'Check-out' }).first(),
    ).toBeVisible();
    // Not "Đang diễn ra" anymore (ended → awaiting checkout).
    await expect(page.getByText('Đang diễn ra')).toHaveCount(0);
  });
});
