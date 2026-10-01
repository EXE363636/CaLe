import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * Cẩm nang tách riêng người lao động / nhà tuyển dụng (01/10):
 *   - `/handbook` chỉ là trang chọn: 2 thẻ, không có danh sách bài trộn.
 *   - `/handbook?for=worker` chỉ có danh mục + bài của người lao động; tương tự employer.
 *   - Trang bài ghi rõ "Dành cho …" và breadcrumb theo vai trò; bài liên quan cùng vai trò.
 *   - Menu đã đăng nhập dẫn thẳng vào cẩm nang của vai trò.
 */

const DESKTOP = { width: 1440, height: 900 };

test.describe('Cẩm nang theo vai trò', () => {
  test('/handbook: chọn giữa 2 cẩm nang, không trộn bài', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/handbook');

    const main = page.locator('main');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cẩm nang làm việc');
    await expect(main.getByRole('link', { name: /Cẩm nang người lao động/ })).toHaveAttribute('href', '/handbook?for=worker');
    await expect(main.getByRole('link', { name: /Cẩm nang nhà tuyển dụng/ })).toHaveAttribute('href', '/handbook?for=employer');
    // Trang chọn không liệt kê bài nào.
    await expect(main.locator('a[href^="/handbook/"]')).toHaveCount(0);
  });

  test('cẩm nang người lao động chỉ có bài người lao động; chuyển sang nhà tuyển dụng', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/handbook?for=worker');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cẩm nang người lao động');
    const sw = page.getByRole('navigation', { name: 'Chọn cẩm nang theo vai trò' });
    await expect(sw.getByRole('link', { name: 'Người lao động' })).toHaveAttribute('aria-current', 'page');
    const menu = page.getByRole('navigation', { name: 'Danh mục cẩm nang người lao động' });
    await expect(menu.getByRole('link', { name: 'Bắt đầu làm ca' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Đăng ca & tuyển người' })).toHaveCount(0);
    // Bài của nhà tuyển dụng không xuất hiện.
    await expect(page.locator('a[href="/handbook/giu-coc-phi-dich-vu-va-hoan-tien"]')).toHaveCount(0);
    await expect(page.locator('a[href="/handbook/lan-dau-nhan-ca-chuan-bi-gi"]').first()).toBeVisible();

    await sw.getByRole('link', { name: 'Nhà tuyển dụng' }).click();
    await page.waitForURL('**/handbook?for=employer');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cẩm nang nhà tuyển dụng');
    await expect(page.locator('a[href="/handbook/lan-dau-nhan-ca-chuan-bi-gi"]')).toHaveCount(0);
    await expect(page.locator('a[href="/handbook/giu-coc-phi-dich-vu-va-hoan-tien"]').first()).toBeVisible();
  });

  test('trang bài ghi rõ vai trò; bài liên quan cùng vai trò', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/handbook/chon-muc-bang-chung-khi-dang-ca');

    await expect(page.getByText('Dành cho nhà tuyển dụng', { exact: true }).first()).toBeVisible();
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'Nhà tuyển dụng' })).toHaveAttribute('href', '/handbook?for=employer');
    // Bài liên quan: chỉ bài của nhà tuyển dụng.
    const related = page.locator('section', { has: page.getByRole('heading', { name: 'Bài khác cho nhà tuyển dụng' }) });
    await expect(related.locator('a[href="/handbook/giu-coc-phi-dich-vu-va-hoan-tien"]').first()).toBeVisible();
    await expect(related.locator('a[href="/handbook/lan-dau-nhan-ca-chuan-bi-gi"]')).toHaveCount(0);
  });

  test('menu nhà tuyển dụng dẫn thẳng vào cẩm nang nhà tuyển dụng', async ({ page, seedState, loginAs, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Cẩm nang làm việc' }).first()).toHaveAttribute('href', '/handbook?for=employer');
  });

  test('tiếng Anh: khung trang + nội dung bài', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/handbook?for=worker');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Worker handbook');
    await page.goto('/handbook/lan-dau-nhan-ca-chuan-bi-gi');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your first shift: 5 things to prepare before you go');
    await expect(page.getByText('For workers', { exact: true }).first()).toBeVisible();
  });
});
