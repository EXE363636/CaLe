import type { Page } from '@playwright/test';

import { test, expect } from './fixtures/test';



/**

 * Minh hoạ "hỏi trợ lý" tự chạy (`SupportChatDemo`, 04/10) — chế độ local/demo.

 *

 *   - Có ở trang chủ (khối "Thắc mắc? Hỏi trợ lý CaLẻ") và /support ("Trợ lý CaLẻ trả lời

 *     ngay 24/7"). `figure[data-support-demo]` mang `data-playback`

 *     (static | playing | paused | done).

 *   - Giảm chuyển động: hiện đủ 4 lượt hỏi / đáp, đứng yên.

 *   - "Thử hỏi trợ lý ngay" và nút "Nhắn với trợ lý" ở chân trang mở bong bóng hỗ trợ

 *     (`role="dialog"` "Hỗ trợ CaLẻ") ở tab "Hỏi CaLẻ".

 *

 * Kho hỏi đáp đang được mở rộng → spec KHÔNG so câu chữ trả lời, chỉ đếm tin và đọc câu hỏi.

 */



const QUESTIONS = [
  'Đi làm qua CaLẻ có mất phí gì không?',
  'Lỡ chủ quán không trả lương thì sao?',
  'thế bao lâu thì có tiền?',
  'dang ca tuyen nguoi co ton phi ko',
  'cho mình gặp người thật',
];



function demo(page: Page) {

  return page.locator('figure[data-support-demo]');

}



async function expectBubbleOpenOnAssistant(page: Page) {

  const dialog = page.getByRole('dialog', { name: 'Hỗ trợ CaLẻ' });

  await expect(dialog).toBeVisible();

  await expect(dialog.getByRole('tab', { name: 'Hỏi CaLẻ' })).toHaveAttribute('aria-selected', 'true');

}



test.describe('Minh hoạ trợ lý', () => {

  test.use({ viewport: { width: 1280, height: 900 } });



  for (const path of ['/', '/support']) {

    test(`${path}: giảm chuyển động → hiện đủ cuộc trò chuyện`, async ({ page, gotoApp }) => {

      await page.emulateMedia({ reducedMotion: 'reduce' });

      await gotoApp(path);

      const fig = demo(page);

      await expect(fig).toHaveCount(1);

      await fig.scrollIntoViewIfNeeded();

      await expect(fig).toHaveAttribute('data-playback', 'static');

      await expect(fig.locator('[data-demo-msg="user"]')).toHaveCount(5);

      await expect(fig.locator('[data-demo-msg="bot"]')).toHaveCount(5);

      const users = fig.locator('[data-demo-msg="user"]');

      for (const [i, q] of QUESTIONS.entries()) {

        await expect(users.nth(i)).toBeVisible();

        await expect(users.nth(i)).toContainText(q);

      }

      for (const msg of await fig.locator('[data-demo-msg="bot"]').all()) await expect(msg).toBeVisible();

      await expect(fig.getByRole('button', { name: /cuộc trò chuyện mẫu/ })).toHaveCount(0);

    });

  }



  test('trang chủ: tự chạy khi cuộn tới, tạm dừng được; nút mở bong bóng ở tab trợ lý', async ({ page, gotoApp }) => {

    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await gotoApp('/');

    await expect(page.getByRole('heading', { name: 'Thắc mắc? Hỏi trợ lý CaLẻ' })).toBeVisible();

    const fig = demo(page);

    await fig.scrollIntoViewIfNeeded();

    await expect(fig).toHaveAttribute('data-playback', 'playing');

    // Câu hỏi đầu được gửi, rồi trợ lý trả lời.

    await expect(fig.locator('[data-demo-msg="user"]').first()).toBeVisible({ timeout: 6_000 });

    await expect(fig.locator('[data-demo-msg="bot"]').first()).toBeVisible({ timeout: 6_000 });



    await fig.getByRole('button', { name: 'Tạm dừng cuộc trò chuyện mẫu' }).click();

    await expect(fig).toHaveAttribute('data-playback', 'paused');

    await fig.getByRole('button', { name: 'Tiếp tục cuộc trò chuyện mẫu' }).click();

    await expect(fig).toHaveAttribute('data-playback', 'playing');



    await fig.getByRole('button', { name: 'Thử hỏi trợ lý ngay' }).click();

    await expectBubbleOpenOnAssistant(page);

  });



  test('/support: khối trợ lý ở đầu trang, nút mở bong bóng', async ({ page, gotoApp }) => {

    await gotoApp('/support');

    await expect(page.getByRole('heading', { name: 'Trợ lý CaLẻ trả lời ngay 24/7' })).toBeVisible();

    await demo(page).getByRole('button', { name: 'Thử hỏi trợ lý ngay' }).click();

    await expectBubbleOpenOnAssistant(page);

  });



  test('chân trang: "Nhắn với trợ lý" mở bong bóng', async ({ page, gotoApp }) => {

    await gotoApp('/faq');

    const btn = page.getByRole('contentinfo').getByRole('button', { name: 'Nhắn với trợ lý' });

    await btn.scrollIntoViewIfNeeded();

    await btn.click();

    await expectBubbleOpenOnAssistant(page);

  });

  for (const [path, heading, first] of [
    ['/for-workers', 'Thắc mắc khi đi làm? Hỏi trợ lý CaLẻ', 'Chưa có kinh nghiệm thì có làm được không?'],
    ['/for-employers', 'Cần tuyển người? Hỏi trợ lý CaLẻ', 'Đăng ca tuyển người thế nào?'],
  ] as const) {
    test(`${path}: minh hoạ hỏi đúng thắc mắc của đối tượng`, async ({ page, gotoApp }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await gotoApp(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      const fig = demo(page);
      await fig.scrollIntoViewIfNeeded();
      await expect(fig.locator('[data-demo-msg="user"]')).toHaveCount(5);
      await expect(fig.locator('[data-demo-msg="user"]').first()).toContainText(first);
      await fig.getByRole('button', { name: 'Thử hỏi trợ lý ngay' }).click();
      await expectBubbleOpenOnAssistant(page);
    });
  }
});

