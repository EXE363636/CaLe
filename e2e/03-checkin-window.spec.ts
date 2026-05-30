import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 3 — worker check-in window (Phase 10C-Stab-1: open 15 min
 * before start, close 5 min after start).
 *
 * Time is controlled with Playwright's `page.clock` so the test is
 * deterministic and independent of the machine clock. The shift is
 * fixed at 2027-06-10 12:00–14:00 (local ICT). We install the fake
 * clock at three instants and assert whether the worker's check-in
 * CTA ("Check-in") is available.
 *
 * The check-in CTA lives on the worker dashboard's upcoming-shift
 * card, gated by `canCheckIn(now, app, shift)`.
 */

const SHIFT_DATE = '2027-06-10';
const SHIFT_START = '12:00';
const SHIFT_END = '14:00';

// Wall-clock instants in the browser timezone (Asia/Ho_Chi_Minh, set
// in playwright.config). `new Date('YYYY-MM-DDTHH:mm:ss')` (no 'Z') is
// parsed in the browser's local TZ, which matches how the app
// interprets shift `${date}T${startTime}:00`. So these literals are
// ICT wall-clock and line up with the shift's 12:00 start.
const T_TOO_EARLY = '2027-06-10T11:40:00'; // 20 min before start
const T_WITHIN = '2027-06-10T11:50:00'; // 10 min before start (window open)
const T_TOO_LATE = '2027-06-10T12:10:00'; // 10 min after start (window closed)

function seedApprovedShift() {
  const shift = buildShift({
    id: 'e2e-checkin-shift',
    title: 'E2E Check-in Shift',
    date: SHIFT_DATE,
    startTime: SHIFT_START,
    endTime: SHIFT_END,
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 1,
    positionsFilled: 1,
  });
  const application = buildApplication({
    id: 'e2e-checkin-app',
    shiftId: shift.id,
    status: 'Approved',
    approvedAt: '2027-06-02T03:00:00.000Z',
    payoutAmount: 90000,
  });
  return { shift, application };
}

test.describe('Flow 3: worker check-in window', () => {
  test('too early (>15 min before start) — check-in is blocked', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(T_TOO_EARLY) });
    const { shift, application } = seedApprovedShift();
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp('/worker/dashboard');

    // The shift card is visible (it's today), but the Check-in CTA
    // must NOT be present this far before start.
    await expect(page.getByText('E2E Check-in Shift')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Check-in', exact: true }),
    ).toHaveCount(0);
  });

  test('within 15 min before start — check-in is allowed and succeeds', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(T_WITHIN) });
    const { shift, application } = seedApprovedShift();
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp('/worker/dashboard');

    const checkInBtn = page.getByRole('button', { name: 'Check-in', exact: true });
    await expect(checkInBtn).toBeVisible();
    await checkInBtn.click();

    // After check-in, the application status flips to CheckedIn — the
    // status badge updates and the Check-in CTA disappears.
    await expect(
      page.getByRole('button', { name: 'Check-in', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText('Đã check-in').first()).toBeVisible();
  });

  test('later than 5 min after start — check-in is blocked', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(T_TOO_LATE) });
    const { shift, application } = seedApprovedShift();
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp('/worker/dashboard');

    // Past the 5-minute grace — no Check-in CTA.
    await expect(
      page.getByRole('button', { name: 'Check-in', exact: true }),
    ).toHaveCount(0);
  });
});
