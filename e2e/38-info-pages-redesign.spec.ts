import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';

/**
 * Trang thông tin làm lại theo ngôn ngữ landing (03/10), chế độ local/demo:
 *   - /pricing (03/10, lần 4: gộp vào /for-employers#employer-pricing): hai thẻ giá (người
 *     lao động "Miễn phí", nhà tuyển dụng "0 đ" bản demo), lối tắt tới form "Thử đăng một
 *     ca"; tiền ghi `đ`, không `VNĐ` / `₫`.
 *   - /register: phần giới thiệu bên cạnh đổi theo vai trò đang chọn; ghi chú demo "mô phỏng".
 *   - /login: phần giới thiệu "Ca làm của bạn vẫn ở đây."
 *   - Bài cẩm nang về tiền: dải "Bản demo: nạp, giữ tiền…" + nội dung bản demo (sổ cái mô phỏng).
 *   - /user-guide: thẻ #employer-total-deposit còn; link hướng dẫn trỏ thẳng vào khối của
 *     trang vai trò (03/10: 7 trang hướng dẫn nhỏ đã gộp vào /for-workers, /for-employers;
 *     đường dẫn cũ chuyển hướng — xem e2e/41) và mở đúng khối.
 */

const DESKTOP = { width: 1440, height: 900 };

/** Link hướng dẫn trên /user-guide → khối trên trang vai trò (`target` = tiêu đề khối). */
const GUIDES = [
  { path: '/for-workers#worker-schedule', target: '#worker-schedule', h2: 'Lịch cá nhân: ca, giờ học, việc riêng ở một chỗ' },
  { path: '/for-employers#employer-post', target: '#employer-money', h2: 'Một ca tốn bao nhiêu?' },
  { path: '/for-employers#employer-applicants', target: '#employer-applicants', h2: 'Duyệt người, theo dõi ngày làm trên một trang' },
] as const;
const OLD_GUIDES = ['/worker/schedule-guide', '/employer/post-shift-guide', '/employer/applicants-guide'];

test.describe('Trang thông tin làm lại (03/10)', () => {
  // 03/10 (lần 4): trang /pricing gộp thành khối "Phí dịch vụ" (#employer-pricing) của
  // /for-employers; đường dẫn cũ chuyển hướng tới khối (chi tiết vị trí / link: e2e/43).
  test('/pricing → /for-employers#employer-pricing: thẻ giá hai phía, tính thử, không VNĐ / ₫', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/pricing');
    await expect(page).toHaveURL(/^[^#]*\/for-employers#employer-pricing$/);

    const section = page.locator('section[aria-labelledby="employer-pricing"]');
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Giai đoạn thử nghiệm: 0 đ');
    await expect(section.getByRole('heading', { level: 2 })).toBeInViewport();
    const workerCard = section.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3, name: 'Người lao động' }) });
    await expect(workerCard).toHaveCount(1);
    await expect(workerCard).toContainText('Miễn phí');

    const employerCard = section.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3, name: 'Nhà tuyển dụng' }) });
    await expect(employerCard).toHaveCount(1);
    await expect(employerCard).toContainText('0 đ');
    await expect(employerCard).toContainText('mô phỏng');

    // Lối tắt tính thử → form "Thử đăng một ca" ("Một ca tốn bao nhiêu?") trên cùng trang.
    await expect(section.getByRole('link', { name: /Tính thử với ca của bạn/ })).toHaveAttribute('href', '/for-employers#employer-post');
    await expect(page.getByRole('heading', { level: 2, name: 'Một ca tốn bao nhiêu?' })).toBeAttached();

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

  test('/user-guide: thẻ #employer-total-deposit; link hướng dẫn mở đúng khối của trang vai trò', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/user-guide#employer-total-deposit');

    const card = page.locator('#employer-total-deposit');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { level: 3 })).toHaveText('Tổng tiền công chờ thanh toán');
    await expect(page.locator('#worker-reputation')).toBeAttached();
    await expect(page.locator('#worker-schedule')).toBeAttached();

    for (const g of GUIDES) await expect(page.locator(`main a[href="${g.path}"]`).first(), g.path).toBeAttached();
    // Không còn link tới trang hướng dẫn cũ.
    for (const old of OLD_GUIDES) await expect(page.locator(`main a[href="${old}"]`), old).toHaveCount(0);

    // Đi theo link thật (điều hướng client) cho từng khối.
    for (const g of GUIDES) {
      await gotoApp('/user-guide');
      const link = page.locator(`main a[href="${g.path}"]`).first();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.waitForURL(`**${g.path}`);
      await expect(page.locator(g.target)).toHaveText(g.h2);
      await expect(page.locator(g.target)).toBeInViewport();
    }
  });
});
