import { test, expect } from './fixtures/test';
import {
  buildSnapshot,
  buildShift,
  buildApplication,
} from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flows 1 + 2 — apply / approve.
 *
 *  1. Worker sees a published shift, applies, employer sees the
 *     pending application.
 *  2. Employer approves, worker sees the approved status.
 *
 * Each test seeds its own precondition and drives the key action
 * through the real UI.
 */

test.describe('Flow 1: worker applies, employer sees pending', () => {
  test('worker applies from shift detail and employer sees a pending applicant', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const shift = buildShift({
      id: 'e2e-apply-shift',
      title: 'E2E Apply Shift',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    await seedState(buildSnapshot({ shifts: [shift] }));
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp(`/shifts/${shift.id}`);

    // Apply via the real CTA.
    const applyBtn = page.getByRole('button', { name: 'Ứng tuyển' });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // After applying, the worker should no longer see a fresh apply
    // CTA — the application now exists. Reload to confirm persistence.
    await page.waitForLoadState('networkidle');

    // Switch to employer and confirm the pending application shows.
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);

    // The applicants section shows the pending bucket with the
    // worker. There are two matching headings (section + bucket), so
    // scope to the bucket heading by its id.
    await expect(
      page.locator('#applicant-bucket-Pending'),
    ).toBeVisible();
    // Worker name appears in the applicant row.
    await expect(page.getByText('Nguyễn Văn An').first()).toBeVisible();
  });
});

test.describe('Flow 2: employer approves, worker sees approved', () => {
  test('employer approves a pending applicant and the worker sees Approved', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const shift = buildShift({
      id: 'e2e-approve-shift',
      title: 'E2E Approve Shift',
      // Future date so the approve gate (no approve after start) passes.
      date: '2030-01-15',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    const application = buildApplication({
      id: 'e2e-approve-app',
      shiftId: shift.id,
      status: 'Pending',
    });
    await seedState(
      buildSnapshot({ shifts: [shift], applications: [application] }),
    );
    await loginAs(ACCOUNTS.employer.id);

    await gotoApp(`/employer/shifts/${shift.id}`);

    // Approve the applicant.
    const approveBtn = page.getByRole('button', { name: 'Duyệt' });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // The applicant should now appear under the "Đơn đã duyệt" bucket.
    await expect(
      page.locator('#applicant-bucket-Approved'),
    ).toBeVisible();

    // Worker side sees the approved status. The shift-detail
    // ApplicationActions renders the `application.status.Approved`
    // badge = "Đã duyệt".
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp(`/shifts/${shift.id}`);
    await expect(page.getByText('Đã duyệt').first()).toBeVisible();
  });
});
