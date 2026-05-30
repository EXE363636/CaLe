import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Smoke test — validates the seed/auth plumbing before the real
 * suite. If this fails, the deterministic-seed strategy is broken and
 * every other spec is meaningless.
 */
test.describe('QA-Automation-1 smoke', () => {
  test('seeded employer session lands on the employer dashboard', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(buildSnapshot({ shifts: [buildShift()] }));
    await loginAs(ACCOUNTS.employer.id);

    await gotoApp('/employer/dashboard');

    // RoleGuard renders nothing until authenticated; a heading proves
    // the seeded session was honoured.
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
    // We must NOT have been bounced to /login.
    expect(page.url()).toContain('/employer/dashboard');
  });

  test('seeded worker can open the public shift list', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await seedState(
      buildSnapshot({ shifts: [buildShift({ title: 'E2E Smoke Shift' })] }),
    );
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp('/shifts');

    await expect(page.getByText('E2E Smoke Shift')).toBeVisible();
  });
});
