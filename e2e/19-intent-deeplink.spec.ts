import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * NAV-INTENT-DEEPLINK-FIX-1 — same-route intent regression.
 *
 * Bug: UserMenu shortcuts whose href carried an intent (`?modal=` /
 * `?tab=`) only worked when navigating FROM a different page. While
 * already on the target route, a plain `<Link>` updated the URL but
 * the page's mount-only intent reader (`useModalFromQuery` / `?tab=`)
 * never re-fired, so the tab/modal did not open.
 *
 * Fix: `MenuLink` routes same-route intent clicks through
 * `navigateWithIntent`, which dispatches the existing
 * `DASHBOARD_MODAL_EVENT` the dashboards already subscribe to. These
 * tests open the UserMenu WHILE ALREADY on the target dashboard and
 * assert the tab/modal opens — and still opens on a repeat click,
 * with no duplicate side effects.
 *
 * The UserMenu is desktop-only (`xl:flex`), so a >= 1280px viewport is
 * used.
 */

const DESKTOP = { width: 1440, height: 900 };

async function openUserMenu(page: import('@playwright/test').Page) {
  // The UserMenu opens on hover (onMouseEnter) and toggles on click.
  // Hovering is the reliable way to open it in a test (a click after an
  // auto-hover can toggle it closed). The avatar trigger carries
  // aria-label "Mở menu tài khoản" when closed.
  await page.getByRole('button', { name: 'Mở menu tài khoản' }).hover();
  await expect(page.getByRole('menu', { name: 'Tài khoản' })).toBeVisible();
}

test.describe('Employer same-route intents', () => {
  test('UserMenu "Quản lý ứng viên" opens the pending modal while already on the dashboard (and again on repeat click)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // Seed a pending application so the pending modal has content.
    const shift = buildShift({
      id: 'e2e-intent-shift',
      title: 'E2E Intent Shift',
      date: '2030-05-10',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    const application = buildApplication({
      id: 'e2e-intent-app',
      shiftId: shift.id,
      status: 'Pending',
    });
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');

    // Already on the dashboard — open the menu and click the shortcut.
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Quản lý ứng viên' }).click();

    // The pending modal opens in-place (no navigation away). Scope to
    // the dialog so the assertion is unambiguous.
    const pendingDialog = page.getByRole('dialog');
    await expect(pendingDialog).toBeVisible();
    await expect(
      pendingDialog
        .getByRole('heading', { name: 'Đơn ứng tuyển chờ duyệt' })
        .first(),
    ).toBeVisible();
    expect(page.url()).toContain('/employer/dashboard');

    // Close it, then click the SAME shortcut again — it must reopen.
    await pendingDialog.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Quản lý ứng viên' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: 'Đơn ứng tuyển chờ duyệt' })
        .first(),
    ).toBeVisible();

    // No duplicate application rows from repeated intent clicks.
    const appCount = await page.evaluate(
      () => JSON.parse(localStorage.getItem('cale.applications') || '[]').length,
    );
    expect(appCount).toBe(1);
  });
});

test.describe('Worker same-route intents', () => {
  test('UserMenu "Điểm uy tín" opens the reputation modal while already on the worker dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');

    await openUserMenu(page);
    // Worker reputation shortcut → ?modal=reputation.
    await page
      .getByRole('menuitem', { name: /uy tín/i })
      .first()
      .click();

    // The reputation modal opens in-place.
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(page.url()).toContain('/worker/dashboard');
  });
});

test.describe('Admin same-route intents', () => {
  test('UserMenu "Tranh chấp" opens the disputes tab while already on the admin dashboard (repeat-safe)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // Seed an open dispute so the disputes tab has a card + badge.
    const shift = buildShift({
      id: 'e2e-intent-disp-shift',
      title: 'E2E Intent Dispute',
      date: '2027-06-10',
      startTime: '08:00',
      endTime: '12:00',
      status: 'AwaitingConfirmation',
      escrowStatus: 'Disputed',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    const application = buildApplication({
      id: 'e2e-intent-disp-app',
      shiftId: shift.id,
      status: 'Disputed',
      checkInAt: '2027-06-10T08:05:00.000Z',
      checkOutAt: '2027-06-10T12:02:00.000Z',
      payoutAmount: 200000,
    });
    const dispute = {
      id: 'e2e-intent-disp',
      shiftId: shift.id,
      applicationId: application.id,
      raisedBy: 'employer',
      category: 'LeftEarly',
      reason: 'Rời ca sớm.',
      status: 'Open',
      createdAt: '2027-06-10T12:10:00.000Z',
      responses: [],
    };
    await seedState(
      buildSnapshot({
        shifts: [shift],
        applications: [application],
        disputes: [dispute],
      }),
    );
    await loginAs(ACCOUNTS.admin.id);
    await gotoApp('/admin/dashboard');

    // Already on admin dashboard (default analytics tab) — open the
    // disputes tab via the UserMenu shortcut.
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Tranh chấp' }).click();

    // The disputes tab opens in-place: the dispute card is visible.
    await expect(page.getByText('E2E Intent Dispute').first()).toBeVisible();
    expect(page.url()).toContain('/admin/dashboard');

    // Repeat click still focuses the disputes tab (switch away first).
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Người dùng' }).click();
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Tranh chấp' }).click();
    await expect(page.getByText('E2E Intent Dispute').first()).toBeVisible();

    // No duplicate dispute from repeated intent clicks.
    const dispCount = await page.evaluate(
      () => JSON.parse(localStorage.getItem('cale.disputes') || '[]').length,
    );
    expect(dispCount).toBe(1);
  });
});
