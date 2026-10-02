import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 12 — the shift timeline records an action with a
 * date+time+seconds timestamp, and the entry is NOT duplicated after a
 * page refresh (idempotent persistence + render).
 *
 * We drive a deterministic action (employer approves an applicant),
 * which emits an `EmployerApprovedApplicant` timeline entry, then
 * assert the rendered timestamp carries seconds and the entry count is
 * stable across a reload.
 */

test.describe('Flow 12: timeline logs with seconds and no duplicates', () => {
  test('approve emits a timestamped timeline entry that survives refresh without duplicating', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const shift = buildShift({
      id: 'e2e-timeline-shift',
      title: 'E2E Timeline Shift',
      date: '2030-02-20',
      positionsTotal: 2,
      positionsFilled: 0,
    });
    const application = buildApplication({
      id: 'e2e-timeline-app',
      shiftId: shift.id,
      status: 'Pending',
    });
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.employer.id);

    await gotoApp(`/employer/shifts/${shift.id}`);

    // Drive the action that emits a timeline entry.
    await page.getByRole('button', { name: 'Duyệt' }).click();
    await page.waitForLoadState('networkidle');

    // The timeline section (<section aria-labelledby> → region named by
    // its h2) shows the approve entry.
    const timeline = page.getByRole('region', { name: 'Lịch sử ca làm' });
    await expect(timeline).toBeVisible();

    const approvedEntry = timeline.getByText('Nhà tuyển dụng đã duyệt người lao động');
    await expect(approvedEntry.first()).toBeVisible();

    // Read the persisted timeline and assert exactly one approve entry
    // plus a seconds-resolution timestamp.
    const stateBefore = await page.evaluate(() => {
      const shifts = JSON.parse(
        window.localStorage.getItem('cale.shifts') || '[]',
      ) as Array<{ id: string; timeline?: Array<{ kind: string; occurredAt: string }> }>;
      const s = shifts.find((x) => x.id === 'e2e-timeline-shift');
      const entries = s?.timeline ?? [];
      return {
        approveCount: entries.filter((e) => e.kind === 'EmployerApprovedApplicant').length,
        // A seconds-resolution ISO timestamp has the form
        // YYYY-MM-DDTHH:mm:ss(.sss)?Z — assert it parses + has seconds.
        sampleOccurredAt: entries.find((e) => e.kind === 'EmployerApprovedApplicant')?.occurredAt ?? '',
      };
    });
    expect(stateBefore.approveCount).toBe(1);
    // ISO 8601 with seconds: contains a T and two colons.
    expect(stateBefore.sampleOccurredAt).toMatch(/T\d{2}:\d{2}:\d{2}/);

    // The rendered timestamp shows seconds (vi-VN second:'2-digit' →
    // HH:mm:ss). Each entry renders its timestamp in a <time dateTime>.
    const timelineTimes = timeline.locator('time');
    await expect(timelineTimes.first()).toBeVisible();
    const renderedTimes = await timelineTimes.allInnerTexts();
    expect(renderedTimes.some((t) => /\d{2}:\d{2}:\d{2}/.test(t))).toBe(true);
    // The approve entry's <time> carries the persisted ISO instant.
    await expect(
      timeline.locator(`time[datetime="${stateBefore.sampleOccurredAt}"]`),
    ).toHaveCount(1);

    // Refresh — the timeline entry must NOT duplicate.
    await page.reload();
    await page.waitForLoadState('networkidle');

    const stateAfter = await page.evaluate(() => {
      const shifts = JSON.parse(
        window.localStorage.getItem('cale.shifts') || '[]',
      ) as Array<{ id: string; timeline?: Array<{ kind: string }> }>;
      const s = shifts.find((x) => x.id === 'e2e-timeline-shift');
      const entries = s?.timeline ?? [];
      return entries.filter((e) => e.kind === 'EmployerApprovedApplicant').length;
    });
    expect(stateAfter).toBe(1);

    // And the rendered entry still appears exactly once.
    await expect(
      page.getByText('Nhà tuyển dụng đã duyệt người lao động'),
    ).toHaveCount(1);
  });
});
