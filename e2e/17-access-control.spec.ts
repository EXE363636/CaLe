import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * QA-Stabilization-Automation Phase 6B — baseline access-control.
 *
 * The app is a localStorage-only mock with NO backend; the enforced
 * authorization boundary is the client-side `RoleGuard` (documented as
 * "NOT a security boundary" but the actual gate for the demo). These
 * checks confirm that gate behaves: unauthenticated and wrong-role
 * users are redirected away from protected role-scoped routes and the
 * protected content does not render.
 *
 * No destructive actions, no brute force, localhost only.
 */

const PROTECTED = {
  worker: ['/worker/dashboard', '/worker/profile', '/worker/schedule'],
  employer: [
    '/employer/dashboard',
    '/employer/profile',
    '/employer/shifts/new',
    '/employer/schedule',
  ],
  admin: ['/admin/dashboard'],
};

test.describe('Phase 6B: unauthenticated cannot reach protected routes', () => {
  for (const path of [
    ...PROTECTED.worker,
    ...PROTECTED.employer,
    ...PROTECTED.admin,
  ]) {
    test(`guest visiting ${path} is redirected to /login`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      // Seed with NO auth pointer (guest).
      await seedState(buildSnapshot({ shifts: [buildShift()] }));
      await gotoApp(path);
      // RoleGuard redirects unauthenticated users to /login.
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });
  }
});

test.describe('Phase 6B: wrong-role users are bounced to their own dashboard', () => {
  test('worker visiting an employer route lands on the worker dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot({ shifts: [buildShift()] }));
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/employer/dashboard');
    await page.waitForURL(/\/worker\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toContain('/worker/dashboard');
    // The employer dashboard content is not rendered.
    expect(page.url()).not.toContain('/employer/dashboard');
  });

  test('worker visiting the admin dashboard is bounced to the worker dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/admin/dashboard');
    await page.waitForURL(/\/worker\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toContain('/worker/dashboard');
  });

  test('employer visiting a worker route lands on the employer dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/worker/dashboard');
    await page.waitForURL(/\/employer\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toContain('/employer/dashboard');
  });

  test('employer visiting the admin dashboard is bounced to the employer dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/admin/dashboard');
    await page.waitForURL(/\/employer\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toContain('/employer/dashboard');
  });

  test('admin visiting a worker route is bounced to the admin dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.admin.id);
    await gotoApp('/worker/dashboard');
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toContain('/admin/dashboard');
  });
});

test.describe('Phase 6B: cross-tenant employer isolation', () => {
  test("employer A cannot view/manage employer B's shift (404 not-found guard)", async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    // A shift owned by employer-002, viewed by employer-001.
    const otherShift = buildShift({
      id: 'e2e-ac-other-shift',
      employerId: 'employer-002',
      title: 'Ca của nhà tuyển dụng khác',
      status: 'Published',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    await seedState(buildSnapshot({ shifts: [otherShift] }));
    await loginAs(ACCOUNTS.employer.id); // employer-001
    await gotoApp(`/employer/shifts/${otherShift.id}`);
    await page.waitForLoadState('networkidle');

    // The page guards with `notFound()` when shift.employerId !==
    // currentUserId — so the shift title and all owner management
    // controls (edit / cancel / repost) must be absent.
    await expect(
      page.getByRole('heading', { name: 'Ca của nhà tuyển dụng khác' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Đăng lại từ ca này' }),
    ).toHaveCount(0);
  });
});

