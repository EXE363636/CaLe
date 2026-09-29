import path from 'node:path';
import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * P0 feedback F7 — step 2: admin "Chưa khớp" / "Đã huỷ" shift filters.
 *
 *   - Ca làm tab chips: Tất cả, Đang hoạt động, Chưa khớp (unfilled),
 *     Đã hoàn thành, Đã huỷ (cancelled), [Tranh chấp — payments only].
 *   - unfilled = lifecycle Published/StartingSoon AND effective filled
 *     (max(positionsFilled, occupying apps)) < positionsTotal. Sorted by
 *     start ascending; each row shows "Thiếu N người", prefixed
 *     "Gấp · " when it starts within 24h.
 *   - cancelled = status Cancelled, or lifecycle Expired with nobody filled.
 *   - Thống kê tiles "Ca chưa khớp" (+ "{n} ca bắt đầu trong 24 giờ") and
 *     "Ca huỷ" jump to the matching chip.
 *   - ?tab=shifts&filter=unfilled|cancelled deeplinks work; unknown
 *     filter values fall back to "Tất cả".
 *
 * Time: `page.clock` pinned at ANCHOR_ISO = 2027-06-02 12:00 ICT.
 *
 * Optional screenshots: set E2E_SHOT_DIR to an absolute directory.
 */

const DESKTOP = { width: 1440, height: 900 };
const SHOT_DIR = process.env.E2E_SHOT_DIR;

const TITLES = {
  farUnfilled: 'E2E F7 Chưa khớp xa',
  urgentUnfilled: 'E2E F7 Chưa khớp gấp',
  full: 'E2E F7 Đủ người',
  cancelled: 'E2E F7 Đã huỷ',
  expiredEmpty: 'E2E F7 Hết hạn trống',
} as const;

function seedShifts() {
  // Unfilled, 18 days out. Newest createdAt, so the default createdAt-desc
  // order would put it FIRST — "Chưa khớp" must put it after the urgent one.
  const farUnfilled = buildShift({
    id: 'e2e-f7-far',
    title: TITLES.farUnfilled,
    date: '2027-06-20',
    startTime: '08:00',
    endTime: '12:00',
    positionsTotal: 2,
    positionsFilled: 0,
    createdAt: '2027-06-01T10:00:00.000Z',
  });
  // Unfilled, starts 2027-06-03 08:00 ICT = 20h after the anchor → "Gấp".
  // positionsFilled is 0 but one Approved application occupies a seat →
  // effective filled 1 of 3 → "Thiếu 2 người".
  const urgentUnfilled = buildShift({
    id: 'e2e-f7-urgent',
    title: TITLES.urgentUnfilled,
    date: '2027-06-03',
    startTime: '08:00',
    endTime: '12:00',
    positionsTotal: 3,
    positionsFilled: 0,
    createdAt: '2027-05-30T10:00:00.000Z',
  });
  const full = buildShift({
    id: 'e2e-f7-full',
    title: TITLES.full,
    date: '2027-06-15',
    startTime: '08:00',
    endTime: '12:00',
    positionsTotal: 2,
    positionsFilled: 2,
    createdAt: '2027-05-31T10:00:00.000Z',
  });
  const cancelled = buildShift({
    id: 'e2e-f7-cancelled',
    title: TITLES.cancelled,
    date: '2027-06-12',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Cancelled',
    escrowStatus: 'Refunded',
    positionsTotal: 2,
    positionsFilled: 0,
    createdAt: '2027-05-29T10:00:00.000Z',
  });
  // Ended before the anchor, nobody took it → lifecycle Expired, 0 filled.
  const expiredEmpty = buildShift({
    id: 'e2e-f7-expired',
    title: TITLES.expiredEmpty,
    date: '2027-05-20',
    startTime: '08:00',
    endTime: '12:00',
    positionsTotal: 2,
    positionsFilled: 0,
    createdAt: '2027-05-10T10:00:00.000Z',
  });
  const approved = buildApplication({
    id: 'e2e-f7-app-urgent',
    shiftId: urgentUnfilled.id,
    status: 'Approved',
    appliedAt: '2027-06-01T03:00:00.000Z',
  });
  return buildSnapshot({
    shifts: [farUnfilled, urgentUnfilled, full, cancelled, expiredEmpty],
    applications: [approved],
  });
}

type Page = import('@playwright/test').Page;

async function setup(
  page: Page,
  fx: {
    seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>;
    loginAs: (id: string) => Promise<void>;
    gotoApp: (p: string) => Promise<void>;
  },
  url: string,
) {
  await page.setViewportSize(DESKTOP);
  await page.clock.install({ time: new Date(ANCHOR_ISO) });
  await fx.seedState(seedShifts());
  await fx.loginAs(ACCOUNTS.admin.id);
  await fx.gotoApp(url);
}

function tab(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

function chip(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

/** Titles of the shift rows currently listed, in DOM order. */
function rowTitles(page: Page) {
  return page.getByRole('link', { name: /^E2E F7 / });
}

function row(page: Page, title: string) {
  return page.locator('li').filter({
    has: page.getByRole('link', { name: title, exact: true }),
  });
}

test.describe('Thống kê tiles: Ca chưa khớp / Ca huỷ', () => {
  test('tiles show counts and "Ca chưa khớp" jumps to the Chưa khớp chip (sorted, urgent flagged)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await setup(page, { seedState, loginAs, gotoApp }, '/admin/dashboard');
    await expect(tab(page, 'Thống kê')).toHaveAttribute('aria-pressed', 'true');

    const unfilledTile = page.getByRole('button', {
      name: 'Lọc ca chưa đủ người trong tab Ca làm',
    });
    const cancelledTile = page.getByRole('button', {
      name: 'Lọc ca đã huỷ hoặc hết hạn không ai nhận',
    });
    await expect(unfilledTile).toContainText('Ca chưa khớp');
    await expect(unfilledTile.locator('p').nth(1)).toHaveText('2');
    await expect(unfilledTile).toContainText('1 ca bắt đầu trong 24 giờ');
    await expect(cancelledTile).toContainText('Ca huỷ');
    await expect(cancelledTile.locator('p').nth(1)).toHaveText('2');

    if (SHOT_DIR) {
      await page.screenshot({
        path: path.join(SHOT_DIR, 'admin-thong-ke-tiles-1440.png'),
        fullPage: true,
      });
    }

    await unfilledTile.click();

    await expect(tab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Chưa khớp')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Tất cả')).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveURL(/[?&]tab=shifts/);
    await expect(page).toHaveURL(/[?&]filter=unfilled/);
    await expect(
      page.getByText('Ca đã đăng, chưa bắt đầu, còn thiếu người.', { exact: false }),
    ).toBeVisible();

    // Only the two unfilled shifts, earliest start first.
    await expect(rowTitles(page)).toHaveText([
      TITLES.urgentUnfilled,
      TITLES.farUnfilled,
    ]);
    await expect(row(page, TITLES.urgentUnfilled)).toContainText('Gấp · Thiếu 2 người');
    await expect(row(page, TITLES.farUnfilled)).toContainText('Thiếu 2 người');
    await expect(row(page, TITLES.farUnfilled)).not.toContainText('Gấp');

    if (SHOT_DIR) {
      await page.screenshot({
        path: path.join(SHOT_DIR, 'admin-ca-lam-chua-khop-1440.png'),
        fullPage: true,
      });
    }
  });

  test('"Ca huỷ" tile jumps to the Đã huỷ chip listing Cancelled + Expired-empty only', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await setup(page, { seedState, loginAs, gotoApp }, '/admin/dashboard');

    await page
      .getByRole('button', { name: 'Lọc ca đã huỷ hoặc hết hạn không ai nhận' })
      .click();

    await expect(tab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Đã huỷ')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/[?&]filter=cancelled/);
    await expect(
      page.getByText('Ca bị huỷ, hoặc hết hạn mà không có ai nhận.'),
    ).toBeVisible();

    // Default createdAt-desc order: Cancelled (05-29) before Expired (05-10).
    await expect(rowTitles(page)).toHaveText([TITLES.cancelled, TITLES.expiredEmpty]);
    // Status is not colour-only: the lifecycle badge carries a text label.
    await expect(row(page, TITLES.cancelled)).toContainText('Đã huỷ');
    await expect(row(page, TITLES.expiredEmpty)).toContainText('Hết hạn');
  });
});

test.describe('Ca làm deeplinks', () => {
  test('?tab=shifts&filter=cancelled opens the Đã huỷ chip', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await setup(page, { seedState, loginAs, gotoApp }, '/admin/dashboard?tab=shifts&filter=cancelled');

    await expect(tab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Đã huỷ')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/[?&]filter=cancelled/);
    await expect(rowTitles(page)).toHaveText([TITLES.cancelled, TITLES.expiredEmpty]);
  });

  test('?tab=shifts&filter=unfilled opens the Chưa khớp chip', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await setup(page, { seedState, loginAs, gotoApp }, '/admin/dashboard?tab=shifts&filter=unfilled');

    await expect(chip(page, 'Chưa khớp')).toHaveAttribute('aria-pressed', 'true');
    await expect(rowTitles(page)).toHaveText([
      TITLES.urgentUnfilled,
      TITLES.farUnfilled,
    ]);
  });

  test('?filter=bogus is ignored and falls back to Tất cả', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await setup(page, { seedState, loginAs, gotoApp }, '/admin/dashboard?tab=shifts&filter=bogus');

    await expect(tab(page, 'Ca làm')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Tất cả')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Chưa khớp')).toHaveAttribute('aria-pressed', 'false');
    await expect(chip(page, 'Đã huỷ')).toHaveAttribute('aria-pressed', 'false');
    await expect(rowTitles(page)).toHaveCount(5);
    // The invalid value is dropped from the mirrored URL.
    await expect(page).toHaveURL(/\/admin\/dashboard\?tab=shifts$/);
    // No unfilled badges outside the Chưa khớp chip.
    await expect(page.getByText(/Thiếu \d+ người/)).toHaveCount(0);
  });
});
