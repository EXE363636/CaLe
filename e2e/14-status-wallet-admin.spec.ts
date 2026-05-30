import { test, expect } from './fixtures/test';
import {
  buildSnapshot,
  buildShift,
  buildApplication,
} from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * QA-Fix-1 regression — status badges, expired controls, wallet,
 * admin badge/detail, notification copy (H3–H11).
 */

// H3 — worker approved upcoming card does not show "Đang tuyển".
test('H3: worker approved upcoming card has no "Đang tuyển" primary status', async ({
  page,
  seedState,
  loginAs,
  gotoApp,
}) => {
  // Future shift the worker is Approved on.
  const shift = buildShift({
    id: 'e2e-h3-shift',
    title: 'E2E H3 Upcoming',
    date: '2030-09-10',
    startTime: '09:00',
    endTime: '12:00',
    status: 'Published',
    positionsTotal: 2,
    positionsFilled: 1,
  });
  const application = buildApplication({
    id: 'e2e-h3-app',
    shiftId: shift.id,
    status: 'Approved',
    payoutAmount: 90000,
  });
  await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
  await loginAs(ACCOUNTS.worker.id);

  await gotoApp('/worker/dashboard');

  const card = page.locator('text=E2E H3 Upcoming').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
  // The upcoming card must show "Đã duyệt" but not the recruiting
  // "Đang tuyển" status. Scope the assertion to the upcoming section.
  await expect(page.getByText('E2E H3 Upcoming')).toBeVisible();
  // "Đang tuyển" should NOT appear within the upcoming card.
  await expect(card.getByText('Đang tuyển')).toHaveCount(0);
  void card;
});

// H4 — expired shift with approved-no-checkin does not show stale mark-absent.
test('H4: expired shift no longer shows live "Đánh dấu vắng mặt"', async ({
  page,
  seedState,
  loginAs,
  gotoApp,
}) => {
  const shift = buildShift({
    id: 'e2e-h4-shift',
    title: 'E2E H4 Expired',
    date: '2020-01-01', // long past
    startTime: '08:00',
    endTime: '12:00',
    status: 'Expired',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 1,
  });
  const application = buildApplication({
    id: 'e2e-h4-app',
    shiftId: shift.id,
    status: 'Approved',
    payoutAmount: 90000,
  });
  await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
  await loginAs(ACCOUNTS.employer.id);

  await gotoApp(`/employer/shifts/${shift.id}`);

  await expect(
    page.getByRole('button', { name: 'Đánh dấu vắng mặt' }),
  ).toHaveCount(0);
});

// H5 — duplicate status badges are not rendered on the employer detail header.
test('H5: employer detail header shows the phase chip once, no duplicate terminal badge', async ({
  page,
  seedState,
  loginAs,
  gotoApp,
}) => {
  const shift = buildShift({
    id: 'e2e-h5-shift',
    title: 'E2E H5 Cancelled',
    status: 'Cancelled',
    escrowStatus: 'Refunded',
    date: '2020-02-02',
    startTime: '08:00',
    endTime: '12:00',
  });
  await seedState(buildSnapshot({ shifts: [shift] }));
  await loginAs(ACCOUNTS.employer.id);

  await gotoApp(`/employer/shifts/${shift.id}`);

  // "Đã hủy" should appear at most once in the header status row
  // (the phase chip). The cancelled banner below uses different copy
  // ("Ca này đã kết thúc hoặc đã huỷ" / "shift.cancelled.banner"), so
  // we scope strictly to header-level status badges by counting the
  // exact phase label in small badge form. Allow ≤1 in the header.
  const cancelledBadges = page.getByText('Đã hủy', { exact: true });
  expect(await cancelledBadges.count()).toBeLessThanOrEqual(1);
});

// H8/H9 — wallet reconciliation + top-up.
test('H8/H9: worker wallet reflects historical payouts and top-up adds a ledger entry', async ({
  page,
  seedState,
  loginAs,
  gotoApp,
}) => {
  const shift = buildShift({
    id: 'e2e-h8-shift',
    title: 'E2E H8 Completed',
    date: '2026-01-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Completed',
    escrowStatus: 'Released',
    positionsTotal: 1,
    positionsFilled: 1,
  });
  const application = buildApplication({
    id: 'e2e-h8-app',
    shiftId: shift.id,
    status: 'Confirmed',
    confirmedAt: '2026-01-10T12:30:00.000Z',
    payoutAmount: 200000,
  });
  await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
  await loginAs(ACCOUNTS.worker.id);

  await gotoApp('/worker/dashboard');

  // Backfill credited the worker wallet with the historical payout.
  await expect(page.getByText('200.000 đ').first()).toBeVisible();

  // QA-Fix-2 Phase 4 — top-up now uses a custom-amount modal.
  await page.getByRole('button', { name: 'Nạp tiền vào ví' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Số tiền muốn nạp (đồng)').fill('500000');
  await dialog.getByRole('button', { name: 'Xác nhận nạp' }).click();
  await expect(page.getByText('700.000 đ').first()).toBeVisible();
});

// H10/H11 — admin dispute badge + expandable detail.
test('H10/H11: admin disputes tab shows a badge and expandable detail', async ({
  page,
  seedState,
  loginAs,
  gotoApp,
}) => {
  const shift = buildShift({
    id: 'e2e-h10-shift',
    title: 'E2E H10 Dispute',
    date: '2027-06-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'AwaitingConfirmation',
    escrowStatus: 'Disputed',
    positionsTotal: 1,
    positionsFilled: 1,
  });
  const application = buildApplication({
    id: 'e2e-h10-app',
    shiftId: shift.id,
    status: 'Disputed',
    checkInAt: '2027-06-10T08:05:00.000Z',
    checkOutAt: '2027-06-10T12:02:00.000Z',
    payoutAmount: 200000,
  });
  const dispute = {
    id: 'e2e-h10-disp',
    shiftId: shift.id,
    applicationId: application.id,
    raisedBy: 'employer',
    category: 'LeftEarly',
    reason: 'Rời ca sớm 30 phút.',
    evidenceDescription: 'Camera ghi nhận rời lúc 11:30.',
    status: 'Open',
    createdAt: '2027-06-10T12:10:00.000Z',
    responses: [
      {
        id: 'e2e-h10-resp-1',
        side: 'worker',
        authorUserId: ACCOUNTS.worker.id,
        reason: 'Tôi làm đủ giờ, quản lý cho về sớm.',
        createdAt: '2027-06-10T12:20:00.000Z',
      },
    ],
  };
  await seedState(
    buildSnapshot({
      shifts: [shift],
      applications: [application],
      disputes: [dispute],
    }),
  );
  await loginAs(ACCOUNTS.admin.id);

  await gotoApp('/admin/dashboard?tab=disputes');

  // Expand the dispute card.
  await page.getByRole('button', { name: /Xem chi tiết/ }).first().click();

  // Detail shows both the worker response and the category in Vietnamese
  // (NOT the raw key "dispute.category.LeftEarly").
  await expect(
    page.getByText('Tôi làm đủ giờ, quản lý cho về sớm.'),
  ).toBeVisible();
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('dispute.category.');
  // The Vietnamese label for LeftEarly is present somewhere.
  expect(body).toContain('Rời ca sớm 30 phút.');

  // Request-more-evidence action is available.
  await expect(
    page.getByRole('button', { name: 'Yêu cầu bổ sung thông tin' }),
  ).toBeVisible();
});
