import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * QA-Fix-2 Phase 1 — cannot create/post shifts in the past.
 *
 * The clock is pinned so "today" is deterministic. We drive the real
 * create form on /employer/shifts/new. Fields are targeted by their
 * stable `name`/`label` via getByLabel with regex (the Input/Field
 * components append a required asterisk to the visible label, so we
 * match a prefix rather than the exact string).
 */

const NOW = '2026-05-28T10:00:00'; // local ICT wall-clock
const PAST_ERROR =
  'Không thể đăng ca trong quá khứ. Vui lòng chọn ngày/giờ trong tương lai.';

async function fillShiftForm(
  page: import('@playwright/test').Page,
  opts: { date: string; start: string; end: string; title: string },
) {
  // Title + location: match label prefix (asterisk suffix on required).
  await page.getByLabel(/^Tên ca làm/).fill(opts.title);
  await page.getByLabel(/^Địa điểm/).fill('12 Nguyễn Huệ, Quận 1, TP.HCM');
  // DateFieldVN — smart dd/mm/yyyy text input; type digits, it auto-pads.
  const [y, m, d] = opts.date.split('-');
  const dateInput = page.getByLabel(/^Ngày làm/);
  await dateInput.click();
  await dateInput.pressSequentially(`${d}${m}${y}`, { delay: 15 });
  // TimeFieldVN — HH:mm text input.
  await page.getByLabel(/^Giờ bắt đầu/).fill(opts.start);
  await page.getByLabel(/^Giờ kết thúc/).fill(opts.end);
  // Wage — custom input with id.
  await page.locator('#shift-hourly-wage').fill('50000');
}

test.describe('Phase 1: past-shift posting is blocked', () => {
  test('past date is rejected with the Vietnamese error', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(NOW) });
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');

    await gotoApp('/employer/shifts/new');

    await fillShiftForm(page, {
      date: '2026-05-24',
      start: '08:00',
      end: '12:00',
      title: 'E2E Past Shift',
    });
    await page.getByRole('button', { name: 'Đăng ca cần tuyển' }).click();

    await expect(page.getByText(PAST_ERROR)).toBeVisible();
  });

  test('today with an end time already passed is rejected', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(NOW) });
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');

    await gotoApp('/employer/shifts/new');

    await fillShiftForm(page, {
      date: '2026-05-28',
      start: '06:00',
      end: '09:00',
      title: 'E2E Today Passed',
    });
    await page.getByRole('button', { name: 'Đăng ca cần tuyển' }).click();

    await expect(page.getByText(PAST_ERROR)).toBeVisible();
  });

  test('a future shift is accepted (advances past the form to deposit)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.clock.install({ time: new Date(NOW) });
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id, '2099-01-01T00:00:00.000Z');

    await gotoApp('/employer/shifts/new');

    await fillShiftForm(page, {
      date: '2026-06-15',
      start: '08:00',
      end: '12:00',
      title: 'E2E Future Shift',
    });
    await page.getByRole('button', { name: 'Đăng ca cần tuyển' }).click();

    await expect(page.getByText(PAST_ERROR)).toHaveCount(0);
    // Deposit confirm card appears after a valid create.
    await expect(
      page.getByRole('button', { name: 'Xác nhận đã thanh toán' }),
    ).toBeVisible();
  });
});
