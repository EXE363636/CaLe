import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift, buildApplication } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Flow 7 — employer marked the worker absent (NoShow); the worker can
 * file an absent dispute from `/shifts/[id]`.
 * Flow 8 — employer opened a dispute on a checked-out worker; the
 * worker can respond, and the employer then sees the response.
 *
 * Dialog fields are targeted by textbox role within the open dialog
 * (the dialog uses a mix of labelled / unlabelled textareas).
 */

function disputeShift(idSuffix: string, over: Record<string, unknown> = {}) {
  return buildShift({
    id: `e2e-disp-shift-${idSuffix}`,
    title: 'E2E Dispute Shift',
    date: '2027-06-10',
    startTime: '12:00',
    endTime: '14:00',
    positionsTotal: 1,
    positionsFilled: 1,
    ...over,
  });
}

test.describe('Flow 7: worker files an absent dispute', () => {
  test('NoShow worker sees the absent banner and can file an AbsentDispute', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const shift = disputeShift('7', {
      status: 'AwaitingConfirmation',
      escrowStatus: 'Refunded',
    });
    const application = buildApplication({
      id: 'e2e-disp-app-7',
      shiftId: shift.id,
      status: 'NoShow',
      noShowAt: '2027-06-10T12:20:00.000Z',
      payoutAmount: 90000,
    });
    await seedState(buildSnapshot({ shifts: [shift], applications: [application] }));
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp(`/shifts/${shift.id}`);

    // Absent banner + "Khiếu nại vắng mặt" CTA.
    await expect(
      page.getByText('Bạn đã bị đánh dấu vắng mặt cho ca này.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Khiếu nại vắng mặt' }).click();

    // The dispute dialog opens with the category preset. Fill the two
    // labelled textareas (DisputeDialog uses the <Textarea label> form).
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog
      .getByLabel('Lý do cụ thể')
      .fill('Tôi đã có mặt đúng giờ nhưng bị đánh dấu vắng mặt.');
    await dialog
      .getByLabel('Mô tả bằng chứng')
      .fill('Có ảnh chụp tại điểm làm việc lúc bắt đầu ca.');
    await dialog.getByRole('button', { name: 'Gửi khiếu nại' }).click();
    await page.waitForLoadState('networkidle');

    // After filing, the application is Disputed — the worker sees the
    // worker-initiated dispute status line.
    await expect(page.getByText(/Bạn đã khiếu nại ca này/)).toBeVisible();
  });
});

test.describe('Flow 8: employer dispute, worker responds, employer sees response', () => {
  test('worker responds to an employer-initiated dispute and the employer sees it', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    const shift = disputeShift('8', {
      status: 'AwaitingConfirmation',
      escrowStatus: 'Disputed',
    });
    const application = buildApplication({
      id: 'e2e-disp-app-8',
      shiftId: shift.id,
      status: 'Disputed',
      checkInAt: '2027-06-10T12:05:00.000Z',
      checkOutAt: '2027-06-10T14:02:00.000Z',
      payoutAmount: 90000,
    });
    const dispute = {
      id: 'e2e-disp-8',
      shiftId: shift.id,
      applicationId: application.id,
      raisedBy: 'employer',
      category: 'ChecklistFailed',
      reason: 'Checklist chưa hoàn thành đầy đủ.',
      evidenceDescription: 'Bàn số 3 chưa được dọn.',
      status: 'Open',
      createdAt: '2027-06-10T14:10:00.000Z',
      responses: [],
    };
    await seedState(
      buildSnapshot({
        shifts: [shift],
        applications: [application],
        disputes: [dispute],
      }),
    );
    await loginAs(ACCOUNTS.worker.id);

    await gotoApp(`/shifts/${shift.id}`);

    // Worker must NOT see "Bạn đã khiếu nại" for an employer-initiated
    // dispute; they see the employer-initiated copy + a respond CTA.
    await expect(
      page.getByText(/Nhà tuyển dụng đang khiếu nại ca này/),
    ).toBeVisible();

    await page
      .getByRole('button', { name: /Phản hồi khiếu nại/ })
      .first()
      .click();

    // The response dialog opens. Its first textbox is the response /
    // statement field.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('textbox')
      .first()
      .fill('Tôi đã dọn tất cả các bàn trước khi rời ca.');
    // Submit inside the dialog (worker-side submit label).
    await dialog
      .getByRole('button', { name: /Phản hồi khiếu nại/ })
      .click();
    await page.waitForLoadState('networkidle');

    // Switch to employer; the response is visible in the dispute panel.
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp(`/employer/shifts/${shift.id}`);

    await expect(
      page.getByText('Tôi đã dọn tất cả các bàn trước khi rời ca.').first(),
    ).toBeVisible();
  });
});
