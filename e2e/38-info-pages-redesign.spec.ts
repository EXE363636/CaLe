import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';

/**
 * Trang thông tin làm lại theo ngôn ngữ landing (03/10), chế độ local/demo:
 *   - /pricing: hai thẻ giá (người lao động "Miễn phí", nhà tuyển dụng "0 đ" bản demo),
 *     form "Thử đăng một ca"; tiền ghi `đ`, không `VNĐ` / `₫`.
 *   - /register: phần giới thiệu bên cạnh đổi theo vai trò đang chọn; ghi chú demo "mô phỏng".
 *   - /login: phần giới thiệu "Ca làm của bạn vẫn ở đây."
 *   - Bài cẩm nang về tiền: dải "Bản demo: nạp, giữ tiền…" + nội dung bản demo (sổ cái mô phỏng).
 *   - /user-guide: thẻ #employer-total-deposit còn; ba link tới trang hướng dẫn mới mở được.
 *   - Ba trang hướng dẫn mới: có h1, không cuộn ngang ở 375px.
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const GUIDES = [
  { path: '/worker/schedule-guide', h1: 'Lịch cá nhân' },
  { path: '/employer/post-shift-guide', h1: 'Đăng ca tuyển' },
  { path: '/employer/applicants-guide', h1: 'Quản lý người ứng tuyển' },
] as const;

test.describe('Trang thông tin làm lại (03/10)', () => {
  test('/pricing: thẻ giá hai phía, tính thử, không VNĐ / ₫', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/pricing');

    const cards = page.getByRole('region', { name: 'Bảng giá' });
    const workerCard = cards.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2, name: 'Người lao động' }) });
    await expect(workerCard).toHaveCount(1);
    await expect(workerCard).toContainText('Miễn phí');
    await expect(workerCard.getByRole('link', { name: /Trang người lao động/ })).toHaveAttribute('href', '/for-workers');

    const employerCard = cards.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2, name: 'Nhà tuyển dụng' }) });
    await expect(employerCard).toHaveCount(1);
    await expect(employerCard).toContainText('0 đ');
    await expect(employerCard).toContainText('mô phỏng');
    await expect(employerCard.getByRole('link', { name: /Trang nhà tuyển dụng/ })).toHaveAttribute('href', '/for-employers');

    // Khối tính thử.
    await expect(page.getByRole('heading', { level: 2, name: 'Một ca tốn bao nhiêu?' })).toBeAttached();
    await expect(page.getByText('Thử đăng một ca', { exact: false }).first()).toBeVisible();

    const text = await page.locator('main').innerText();
    expect(text).not.toContain('VNĐ');
    expect(text).not.toContain('₫');
  });

  test('/register: phần giới thiệu đổi theo vai trò; ghi chú demo "mô phỏng"', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/register');

    const workerHeadline = page.getByText('Làm ca theo giờ rảnh của bạn.', { exact: true });
    const employerHeadline = page.getByText('Thiếu người cho ca, tuyển trong vài phút.', { exact: true });

    await expect(workerHeadline).toBeVisible();
    await expect(employerHeadline).toHaveCount(0);
    await expect(page.getByText(/Bản demo: dữ liệu lưu trong trình duyệt này\..*mô phỏng\./)).toBeVisible();

    await page.getByRole('button', { name: 'Tôi cần tuyển người lao động' }).click();
    await expect(employerHeadline).toBeVisible();
    await expect(workerHeadline).toHaveCount(0);

    await page.getByRole('button', { name: 'Tôi muốn tìm ca làm' }).click();
    await expect(workerHeadline).toBeVisible();
    await expect(employerHeadline).toHaveCount(0);
  });

  test('/login: phần giới thiệu "Ca làm của bạn vẫn ở đây."', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/login');

    await expect(page.getByText('Ca làm của bạn vẫn ở đây.', { exact: true })).toBeVisible();
    await expect(page.getByText(/Bản demo: dữ liệu lưu trong trình duyệt này\..*mô phỏng\./)).toBeVisible();
  });

  test('bài cẩm nang về tiền: dải bản demo + nội dung bản demo', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    // Seed qua một trang nhẹ, rồi mở bài KHÔNG chờ `networkidle`: thẻ "Bài khác" ở cuối
    // bài là ảnh `loading="lazy"` qua /_next/image; một request ảnh treo ở dev server làm
    // `networkidle` không bao giờ tới, dù nội dung cần kiểm đã hiện. Chờ theo điều kiện.
    await gotoApp('/login');
    await page.goto('/handbook/giu-coc-phi-dich-vu-va-hoan-tien', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/^Bản demo: nạp, giữ tiền/)).toBeVisible();

    await expect(page.getByRole('heading', { name: '1. Nạp ví' })).toBeVisible();
    const demoParagraph = page.getByText(/Trong bản demo, bạn nạp ví bằng cách nhập số tiền trong ví\..*sổ cái mô phỏng/);
    await expect(demoParagraph).toBeVisible();
    // Câu bản thật (mã QR PayOS) không hiện ở chế độ demo.
    await expect(page.getByText('Bạn nạp tiền vào ví bằng mã QR PayOS', { exact: false })).toHaveCount(0);
  });

  test('/user-guide: thẻ #employer-total-deposit; ba link hướng dẫn mở được', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/user-guide#employer-total-deposit');

    const card = page.locator('#employer-total-deposit');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { level: 3 })).toHaveText('Tổng tiền công chờ thanh toán');
    await expect(page.locator('#worker-reputation')).toBeAttached();
    await expect(page.locator('#worker-schedule')).toBeAttached();

    for (const g of GUIDES) {
      const link = page.locator(`main a[href="${g.path}"]`).first();
      await expect(link).toBeAttached();
      const res = await page.request.get(g.path);
      expect(res.status(), g.path).toBe(200);
    }

    // Đi theo link thật (điều hướng client) cho từng trang.
    for (const g of GUIDES) {
      await gotoApp('/user-guide');
      const link = page.locator(`main a[href="${g.path}"]`).first();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.waitForURL(`**${g.path}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(g.h1);
    }
  });

  for (const g of GUIDES) {
    test(`${g.path}: có h1, không cuộn ngang ở 375px`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize(MOBILE);
      await seedState(buildSnapshot());
      await gotoApp(g.path);

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(g.h1);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(MOBILE.width);
    });
  }
});
