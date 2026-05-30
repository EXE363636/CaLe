import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 10 — schedule overlap blocks only real time overlap, not
 * adjacency. The worker already holds an Approved application on a
 * 13:40–13:45 shift; applying to:
 *   - a 12:40–12:45 shift (no overlap) → succeeds (Pending)
 *   - a 12:40–13:45 shift (overlaps)   → blocked with a conflict error
 *
 * A future date keeps both shifts in the active conflict pool
 * regardless of the machine clock.
 */

const DATE = '2030-03-15';

function existingApprovedShift() {
  const shift = buildShift({
    id: 'e2e-ovl-existing',
    title: 'Ca đã duyệt 13:40',
    date: DATE,
    startTime: '13:40',
    endTime: '13:45',
    positionsTotal: 1,
    positionsFilled: 1,
  });
  const app = buildApplication({
    id: 'e2e-ovl-existing-app',
    shiftId: shift.id,
    status: 'Approved',
    payoutAmount: 10000,
  });
  return { shift, app };
}

test.describe('Flow 10: schedule overlap', () => {
  test('adjacent shift (12:40–12:45 vs 13:40–13:45) does NOT block', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const existing = existingApprovedShift();
    const target = buildShift({
      id: 'e2e-ovl-adjacent',
      title: 'Ca không trùng 12:40',
      date: DATE,
      startTime: '12:40',
      endTime: '12:45',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    await seedState(
      buildSnapshot({
        shifts: [existing.shift, target],
        applications: [existing.app],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp(`/shifts/${target.id}`);
    await page.getByRole('button', { name: 'Ứng tuyển' }).click();

    // Apply succeeds → the Pending status badge appears (the apply CTA
    // is replaced by the Pending state + cancel button).
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
  });

  test('overlapping shift (12:40–13:45 vs 13:40–13:45) DOES block', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const existing = existingApprovedShift();
    const target = buildShift({
      id: 'e2e-ovl-overlap',
      title: 'Ca trùng giờ 12:40-13:45',
      date: DATE,
      startTime: '12:40',
      endTime: '13:45',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    await seedState(
      buildSnapshot({
        shifts: [existing.shift, target],
        applications: [existing.app],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp(`/shifts/${target.id}`);
    await page.getByRole('button', { name: 'Ứng tuyển' }).click();

    // Apply is blocked — a conflict error toast/message appears and the
    // worker is NOT moved to Pending.
    await expect(page.getByText(/trùng|xung đột|đã có ca/i).first()).toBeVisible();
    await expect(page.getByText('Chờ duyệt')).toHaveCount(0);
  });
});
