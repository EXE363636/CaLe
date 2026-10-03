import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import type { Page } from '@playwright/test';

/**
 * Hiện dần khi cuộn ở trang công khai (03/10, `useScrollReveal` gắn trong `ToneScroll`),
 * chế độ local/demo.
 *
 *   - Chuyển động thường: phần tử dưới màn đầu lúc tải mang `data-reveal="armed"` (ẩn,
 *     opacity 0); cuộn tới → `data-reveal="in"` rồi gỡ thuộc tính (~1,6 giây), opacity 1.
 *   - Giảm chuyển động: không phần tử nào từng nhận `data-reveal`.
 */

const DESKTOP = { width: 1440, height: 900 };

/** Đếm mọi lần một phần tử nhận `data-reveal` (kể cả khi đã gỡ ngay sau đó). */
async function recordReveals(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __revealSeen: number };
    w.__revealSeen = 0;
    new MutationObserver((records) => {
      for (const r of records) {
        if ((r.target as Element).hasAttribute('data-reveal')) w.__revealSeen += 1;
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-reveal'] });
  });
}

function revealSeen(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __revealSeen: number }).__revealSeen);
}

test.describe('Hiện dần khi cuộn — chuyển động thường', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('/for-workers: tiêu đề dưới màn đầu "armed" lúc tải; cuộn tới → hiện đủ, gỡ data-reveal', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await recordReveals(page);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Tiêu đề khối "Hồ sơ & điểm uy tín" nằm xa dưới màn đầu.
    const heading = page.locator('#worker-reputation');
    await expect(heading).toHaveAttribute('data-reveal', 'armed');
    expect(await heading.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(DESKTOP.height);
    expect(await heading.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

    await heading.scrollIntoViewIfNeeded();
    // Hết chuyển động (500–600 ms + trễ bậc, gỡ thuộc tính sau ~1,6 giây).
    await expect(heading).not.toHaveAttribute('data-reveal', { timeout: 4_000 });
    await expect.poll(() => heading.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await expect(heading).toBeInViewport();
    expect(await revealSeen(page)).toBeGreaterThan(0);
  });
});

test.describe('Hiện dần khi cuộn — giảm chuyển động', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('/for-workers: cuộn hết trang, không phần tử nào nhận data-reveal', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await recordReveals(page);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.locator('#worker-reputation')).not.toHaveAttribute('data-reveal');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += DESKTOP.height / 2) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await expect(page.locator('[data-reveal]')).toHaveCount(0);
    }
    await page.getByTestId('site-footer').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    expect(await revealSeen(page)).toBe(0);
  });
});
