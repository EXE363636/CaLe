import { test, expect } from './fixtures/test';
import {
  buildSnapshot,
  buildShift,
  buildScheduleBlock,
  buildWorker,
  buildEmployer,
  buildAdmin,
} from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * CORE-STABILITY-9 E2E — exercises the user-visible surfaces added in
 * this batch:
 *
 *   Part 5 — worker schedule busy/available toggle + the "Phù hợp lịch
 *            rảnh" sort on the shift listing with per-card match pills.
 *   Part 4 — worker profile skill progression (level + XP bars).
 *   Part 6 — site-wide honest backend-status note in the footer.
 *
 * The app is localStorage-only; preconditions are seeded directly so
 * the tests focus on the rendered surfaces, not store mechanics.
 */

// A worker with one available block covering 08:00–18:00 on 2027-06-10
// and a matching public shift inside that window.
function seedAvailabilityWorld() {
  const availableBlock = buildScheduleBlock({
    id: 'e2e-cs9-avail',
    title: 'Rảnh cả ngày',
    date: '2027-06-10',
    startTime: '08:00',
    endTime: '18:00',
    kind: 'available',
  });
  const matchingShift = buildShift({
    id: 'e2e-cs9-shift-match',
    title: 'Phục vụ trưa Quận 1',
    jobType: 'Phục vụ',
    location: '5 Lê Lợi, Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2027-06-10',
    startTime: '11:00',
    endTime: '15:00',
    hourlyWage: 80000,
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 0,
  });
  return { availableBlock, matchingShift };
}

test.describe('CS9 Part 5: availability-based job suggestions', () => {
  test('worker sees the availability sort toggle and a match pill on the listing', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    const { availableBlock, matchingShift } = seedAvailabilityWorld();
    await seedState(
      buildSnapshot({
        shifts: [matchingShift],
        scheduleBlocks: [availableBlock],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/shifts');

    // The "Phù hợp lịch rảnh" sort toggle is present for a signed-in worker.
    const availabilityToggle = page.getByRole('button', {
      name: 'Phù hợp lịch rảnh',
    });
    await expect(availabilityToggle).toBeVisible();

    // Switching to availability sort surfaces the match label on the card.
    await availabilityToggle.click();
    await expect(page.getByText('Rất phù hợp').first()).toBeVisible();
    await expect(page.getByText('Khớp lịch rảnh').first()).toBeVisible();
  });

  test('worker schedule dialog offers a busy / available kind toggle', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/schedule');

    // Open the add-block dialog (PRODUCT-UX-FIX-BACKEND-PREP-1 Part 1 —
    // button renamed from "Thêm lịch bận" to "Thêm lịch trình").
    await page.getByRole('button', { name: 'Thêm lịch trình' }).first().click();

    // Both kind options are offered, labelled "Lịch rảnh" / "Lịch bận".
    await expect(
      page.getByRole('button', { name: 'Lịch rảnh', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Lịch bận', exact: true }),
    ).toBeVisible();
  });
});

test.describe('CS9 Part 4: worker skill progression', () => {
  test('profile shows skill level + XP progress', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    const workerWithSkills = buildWorker({
      skillScores: [
        {
          category: 'Phục vụ',
          score: 88,
          completedCount: 6,
          xp: 130,
          lastUpdatedAt: '2027-06-01T10:00:00.000Z',
        },
      ],
    });
    await seedState(
      buildSnapshot({
        users: [buildEmployer(), workerWithSkills, buildAdmin()],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/profile');

    // The skill section heading + the skill category + a level chip.
    await expect(page.getByText('Kỹ năng của bạn')).toBeVisible();
    await expect(page.getByText('Phục vụ').first()).toBeVisible();
    // XP 130 → Level 3, rendered as "Cấp 3".
    await expect(page.getByText('Cấp 3').first()).toBeVisible();
  });
});

test.describe('CS9 Part 6: honest backend-status note', () => {
  test('footer states the demo data lives in the browser', async ({
    seedState,
    loginAs,
    gotoApp,
    page,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/shifts');

    await expect(
      page.getByText(
        'Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu.',
      ),
    ).toBeVisible();
  });
});
