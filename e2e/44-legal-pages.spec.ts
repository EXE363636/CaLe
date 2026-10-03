import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import type { Locator, Page } from '@playwright/test';

/**
 * Ba trang pháp lý làm lại (03/10): /terms, /privacy, /disputes — chế độ local/demo.
 * Câu chữ pháp lý giữ nguyên văn; spec này kiểm phần TRÌNH BÀY:
 *
 *   1. `LegalHero`: thanh "Tài liệu pháp lý" (3 viên thuốc, trang đang xem
 *      aria-current="page", bấm viên khác → sang trang đó), nhãn "Pháp lý", h1 = tên tài
 *      liệu, hai chip "Áp dụng cho: bản dùng thử" + "{n} mục"; KHÔNG còn nút ở phần đầu.
 *   2. `LegalArticle`: mỗi mục có số lớn 01..0n (aria-hidden) + h2 bỏ "1. " ở đầu. Máy
 *      tính (1440): mục lục trái "Mục lục" dính, mục đang đọc aria-current="location"
 *      (mục 1 lúc đầu → mục sau khi tiêu đề qua ~140px → mục cuối ở đáy trang); bấm mục
 *      lục → tiêu đề mục nằm ngay dưới header dính (≤ 40px). Điện thoại (375): mục lục là
 *      <details> gập sẵn, nav máy tính ẩn, không cuộn ngang.
 *   3. Vạch tiến độ đọc: cố định trên cùng, aria-hidden, scaleX ~0 ở đầu → 1 gần đáy.
 *   4. Khối riêng: /terms thẻ ✕; /privacy bảng <dl> + thẻ quyền; /disputes thẻ icon, dòng
 *      thời gian 1–4, ô "7 ngày".
 *   5. `LegalEnd`: thẻ tối "Còn thắc mắc?" (email, hotline, "Trang liên hệ hỗ trợ" →
 *      /support) + hai thẻ "Đọc tiếp" tới HAI trang pháp lý còn lại.
 *   6. Tiếng Anh (cookie cale.lang=en).
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };
const EMAIL = 'nguyenphuonganh98113@gmail.com';
const HOTLINE = '0868325698';

type Doc = 'terms' | 'privacy' | 'disputes';

const DOCS: Record<Doc, { path: string; pill: string; title: string; sections: string[]; ids: string[] }> = {
  terms: {
    path: '/terms',
    pill: 'Điều khoản',
    title: 'Điều khoản sử dụng',
    sections: ['Phạm vi dịch vụ', 'Tạo tài khoản', 'Hành vi không được phép', 'Giữ cọc', 'Thay đổi điều khoản', 'Liên hệ'],
    ids: ['pham-vi-dich-vu', 'tao-tai-khoan', 'hanh-vi-khong-duoc-phep', 'giu-coc', 'thay-doi-dieu-khoan', 'lien-he'],
  },
  privacy: {
    path: '/privacy',
    pill: 'Bảo mật',
    title: 'Chính sách bảo mật',
    sections: [
      'Thông tin chúng tôi thu thập',
      'Cách chúng tôi sử dụng thông tin',
      'Lưu trữ trong phiên bản dùng thử',
      'Quyền của bạn',
      'Liên hệ về quyền riêng tư',
    ],
    ids: ['thong-tin-thu-thap', 'cach-su-dung', 'luu-tru', 'quyen-cua-ban', 'lien-he'],
  },
  disputes: {
    path: '/disputes',
    pill: 'Tranh chấp',
    title: 'Chính sách xử lý tranh chấp',
    // Chế độ local/demo: mục 4 là "Hệ quả với điểm uy tín" (bản thật: "Hệ quả với tài khoản").
    sections: ['Khi nào nên mở tranh chấp', 'Cách mở yêu cầu', 'Quy trình xét xử', 'Hệ quả với điểm uy tín', 'Phản hồi quyết định'],
    ids: ['khi-nao', 'cach-mo-yeu-cau', 'quy-trinh', 'he-qua', 'phan-hoi-quyet-dinh'],
  },
};

const ORDER: Doc[] = ['terms', 'privacy', 'disputes'];

/** Đường path (svg) của dấu ✕ / ✓ trong `LegalCards`. */
const X_PATH = 'm6 6 8 8M14 6l-8 8';
const CHECK_PATH = 'm5 10.5 3.2 3L15 6.5';

async function openLegal(
  { page, seedState, gotoApp }: { page: Page; seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>; gotoApp: (p: string) => Promise<void> },
  path: string,
  viewport = DESKTOP,
) {
  await page.setViewportSize(viewport);
  await seedState(buildSnapshot());
  await gotoApp(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

function hero(page: Page): Locator {
  return page.locator('main section').filter({ has: page.getByRole('heading', { level: 1 }) });
}

function article(page: Page): Locator {
  return page.locator('main #legal-article');
}

/** Mục lục máy tính (nav dính cột trái, không nằm trong <details>). */
function desktopToc(page: Page, label = 'Mục lục'): Locator {
  return page.locator(`main nav[aria-label="${label}"]:not(details nav)`);
}

async function headerBottom(page: Page): Promise<number> {
  return page.locator('header').first().evaluate((n) => n.getBoundingClientRect().bottom);
}

/** Vạch tiến độ: phần tử cố định ở mép trên, aria-hidden; trả về số đo scaleX của vạch con. */
async function progress(page: Page): Promise<{ count: number; ariaHidden: boolean; scale: number }> {
  return page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll<HTMLElement>('main *')).filter((el) => {
      const cs = getComputedStyle(el);
      return cs.position === 'fixed' && el.getBoundingClientRect().top === 0 && el.firstElementChild instanceof HTMLElement && el.closest('#legal-article') === null && el.closest('section') !== null && el.parentElement?.querySelector('#legal-article') != null;
    });
    const bar = bars[0];
    if (!bar) return { count: 0, ariaHidden: false, scale: NaN };
    const inner = bar.firstElementChild as HTMLElement;
    const m = /scaleX\(([-\d.e]+)\)/.exec(inner.style.transform);
    return { count: bars.length, ariaHidden: bar.getAttribute('aria-hidden') === 'true', scale: m ? Number(m[1]) : NaN };
  });
}

/** Chờ cuộn dừng hẳn: scrollY không đổi qua hai lần đọc liên tiếp. */
async function waitScrollSettled(page: Page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => window.scrollY);
        const settled = y === last;
        last = y;
        return settled;
      },
      { message: 'cuộn trang dừng hẳn', intervals: [100, 150, 150, 250] },
    )
    .toBe(true);
}

// ---------------------------------------------------------------------------
// 1. Phần đầu
// ---------------------------------------------------------------------------

test.describe('LegalHero', () => {
  for (const doc of ORDER) {
    const d = DOCS[doc];
    test(`${d.path}: thanh "Tài liệu pháp lý", nhãn "Pháp lý", h1, chip áp dụng + "${d.sections.length} mục", không nút`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await openLegal({ page, seedState, gotoApp }, d.path);

      const switcher = page.getByRole('navigation', { name: 'Tài liệu pháp lý', exact: true });
      await expect(switcher).toBeVisible();
      const pills = switcher.getByRole('link');
      await expect(pills).toHaveText(['Điều khoản', 'Bảo mật', 'Tranh chấp']);
      expect(await pills.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(['/terms', '/privacy', '/disputes']);
      for (const other of ORDER) {
        const pill = switcher.getByRole('link', { name: DOCS[other].pill, exact: true });
        if (other === doc) await expect(pill).toHaveAttribute('aria-current', 'page');
        else await expect(pill).not.toHaveAttribute('aria-current', /.*/);
      }

      const h = hero(page);
      await expect(h.getByText('Pháp lý', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(d.title);
      await expect(h.getByRole('listitem').filter({ hasText: 'Áp dụng cho: bản dùng thử' })).toHaveText('Áp dụng cho: bản dùng thử');
      await expect(h.getByRole('listitem').filter({ hasText: /mục$/ })).toHaveText(`${d.sections.length} mục`);

      // Không còn nút ở phần đầu: link duy nhất là 3 viên thuốc.
      await expect(h.getByRole('link')).toHaveCount(3);
      await expect(h.getByRole('button')).toHaveCount(0);
      await expect(h.getByRole('link', { name: 'Liên hệ hỗ trợ' })).toHaveCount(0);
    });
  }

  test('bấm viên thuốc khác → sang trang đó, viên mới aria-current="page"', async ({ page, seedState, gotoApp }) => {
    await openLegal({ page, seedState, gotoApp }, '/terms');
    const switcher = page.getByRole('navigation', { name: 'Tài liệu pháp lý', exact: true });

    await switcher.getByRole('link', { name: 'Bảo mật', exact: true }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chính sách bảo mật');
    await expect(switcher.getByRole('link', { name: 'Bảo mật', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(switcher.getByRole('link', { name: 'Điều khoản', exact: true })).not.toHaveAttribute('aria-current', /.*/);

    await switcher.getByRole('link', { name: 'Tranh chấp', exact: true }).click();
    await expect(page).toHaveURL(/\/disputes$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chính sách xử lý tranh chấp');
    await expect(switcher.getByRole('link', { name: 'Tranh chấp', exact: true })).toHaveAttribute('aria-current', 'page');

    await switcher.getByRole('link', { name: 'Điều khoản', exact: true }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Điều khoản sử dụng');
  });
});

// ---------------------------------------------------------------------------
// 2. Thân bài + mục lục + vạch tiến độ
// ---------------------------------------------------------------------------

test.describe('LegalArticle (máy tính 1440)', () => {
  for (const doc of ORDER) {
    const d = DOCS[doc];
    test(`${d.path}: số 01..0${d.sections.length} aria-hidden, h2 không có "1. ", mục lục "Mục lục" dính`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await openLegal({ page, seedState, gotoApp }, d.path);
      const art = article(page);

      await expect(art.getByRole('heading', { level: 2 })).toHaveText(d.sections);
      for (const title of await art.getByRole('heading', { level: 2 }).allTextContents()) {
        expect(title, 'h2 không bắt đầu bằng số thứ tự').not.toMatch(/^\s*\d+\.\s/);
      }
      const nums = art.locator(':scope > section > span[aria-hidden="true"]');
      await expect(nums).toHaveText(d.sections.map((_, i) => String(i + 1).padStart(2, '0')));

      // Mỗi mục là một vùng gắn nhãn bằng h2 của nó, id khớp neo mục lục.
      for (const [i, title] of d.sections.entries()) {
        await expect(art.getByRole('region', { name: title, exact: true })).toHaveAttribute('id', d.ids[i]);
      }

      const toc = desktopToc(page);
      await expect(toc).toBeVisible();
      await expect(toc).toHaveCSS('position', 'sticky');
      const links = toc.getByRole('link');
      await expect(links).toHaveCount(d.sections.length);
      for (const [i, title] of d.sections.entries()) {
        await expect(links.nth(i)).toHaveAttribute('href', `#${d.ids[i]}`);
        await expect(links.nth(i)).toHaveText(`${String(i + 1).padStart(2, '0')}${title}`);
      }
      // Lúc đầu: mục 1 đang đọc.
      await expect(links.first()).toHaveAttribute('aria-current', 'location');
      await expect(toc.locator('a[aria-current]')).toHaveCount(1);
      // Mục lục điện thoại (<details>) ẩn ở máy tính.
      await expect(page.locator('main details').filter({ hasText: 'Mục lục' })).toBeHidden();
    });
  }

  test('/terms: cuộn → mục lục sáng mục đang đọc; chạm đáy → mục cuối; vạch tiến độ 0 → 1', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    const d = DOCS.terms;
    await openLegal({ page, seedState, gotoApp }, d.path);
    const links = desktopToc(page).getByRole('link');

    // Đầu trang: vạch tiến độ ~0, một vạch duy nhất, aria-hidden.
    const top = await progress(page);
    expect(top.count, 'đúng một vạch tiến độ cố định ở mép trên').toBe(1);
    expect(top.ariaHidden, 'vạch tiến độ aria-hidden').toBe(true);
    expect(top.scale, 'đầu trang: scaleX ~0').toBeLessThan(0.05);
    await expect(links.first()).toHaveAttribute('aria-current', 'location');

    // Cuộn để tiêu đề mục 3 qua vạch ~140px (đặt ở 100px).
    const third = page.locator(`#${d.ids[2]}-h`);
    await page.evaluate((id) => {
      const el = document.getElementById(id)!;
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100);
    }, `${d.ids[2]}-h`);
    await waitScrollSettled(page);
    await expect(third).toBeInViewport();
    await expect(links.nth(2)).toHaveAttribute('aria-current', 'location');
    await expect(links.first()).not.toHaveAttribute('aria-current', /.*/);
    await expect(desktopToc(page).locator('a[aria-current]')).toHaveCount(1);
    // Mục lục dính: vẫn trong khung nhìn khi đã cuộn.
    await expect(desktopToc(page)).toBeInViewport();

    const mid = await progress(page);
    expect(mid.scale, 'giữa bài: vạch tiến độ đã tăng').toBeGreaterThan(top.scale);
    expect(mid.scale).toBeLessThan(1);

    // Chạm đáy trang: mục cuối sáng (mục ngắn không bao giờ lên tới vạch), vạch = 1.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await waitScrollSettled(page);
    await expect(links.last()).toHaveAttribute('aria-current', 'location');
    await expect(desktopToc(page).locator('a[aria-current]')).toHaveCount(1);
    await expect.poll(async () => (await progress(page)).scale, { message: 'đáy trang: scaleX = 1' }).toBe(1);

    // Cuộn lại đầu → mục 1 sáng lại, vạch về ~0.
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitScrollSettled(page);
    await expect(links.first()).toHaveAttribute('aria-current', 'location');
    await expect.poll(async () => (await progress(page)).scale).toBeLessThan(0.05);
  });

  for (const doc of ORDER) {
    const d = DOCS[doc];
    test(`${d.path}: bấm từng mục trong mục lục → tiêu đề mục ngay dưới header dính, mục đó sáng`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await openLegal({ page, seedState, gotoApp }, d.path);
      const links = desktopToc(page).getByRole('link');
      const hb = await headerBottom(page);

      for (const [i, id] of d.ids.entries()) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await waitScrollSettled(page);
        await links.nth(i).click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await waitScrollSettled(page);
        const heading = page.locator(`#${id}-h`);
        await expect(heading).toBeInViewport();
        const top = await heading.evaluate((n) => n.getBoundingClientRect().top);
        expect
          .soft(top, `${d.path} #${id}: tiêu đề nằm trong [header ${hb}, header + 40]`)
          .toBeGreaterThanOrEqual(hb);
        expect.soft(top, `${d.path} #${id}: tiêu đề nằm trong [header ${hb}, header + 40]`).toBeLessThanOrEqual(hb + 40);
        await expect(links.nth(i)).toHaveAttribute('aria-current', 'location');
      }
    });
  }
});

test.describe('LegalArticle (điện thoại 375)', () => {
  for (const doc of ORDER) {
    const d = DOCS[doc];
    test(`${d.path}: mục lục <details> gập sẵn, nav máy tính ẩn, không cuộn ngang`, async ({ page, seedState, gotoApp }) => {
      await openLegal({ page, seedState, gotoApp }, d.path, MOBILE);

      await expect(desktopToc(page)).toBeHidden();
      const details = page.locator('main details').filter({ has: page.locator('summary', { hasText: 'Mục lục' }) });
      await expect(details).toHaveCount(1);
      await expect(details).toBeVisible();
      await expect(details).not.toHaveAttribute('open', /.*/);
      const inner = details.getByRole('navigation', { name: 'Mục lục', exact: true });
      await expect(inner).toBeHidden();

      // Mở ra → đủ mục, bấm một mục → tới mục đó.
      await details.locator('summary').click();
      await expect(details).toHaveAttribute('open', '');
      await expect(inner).toBeVisible();
      const links = inner.getByRole('link');
      await expect(links).toHaveCount(d.sections.length);
      await expect(links.last()).toContainText(d.sections[d.sections.length - 1]);

      // Số mục nằm trên tiêu đề, vẫn aria-hidden; h2 không có "1. ".
      await expect(article(page).getByRole('heading', { level: 2 })).toHaveText(d.sections);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'không cuộn ngang ở 375px').toBeLessThanOrEqual(0);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Khối riêng của từng trang
// ---------------------------------------------------------------------------

test.describe('Khối trình bày trong mục', () => {
  test('/terms "Hành vi không được phép": 4 thẻ trắng có dấu ✕', async ({ page, seedState, gotoApp }) => {
    await openLegal({ page, seedState, gotoApp }, '/terms');
    const region = article(page).getByRole('region', { name: 'Hành vi không được phép', exact: true });
    const cards = region.getByRole('listitem');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toContainText('Đăng ca giả, ca không có thật, hoặc ca vi phạm pháp luật.');
    for (let i = 0; i < 4; i += 1) {
      const card = cards.nth(i);
      await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      const mark = card.locator(':scope > span[aria-hidden="true"]');
      await expect(mark.locator('svg path')).toHaveAttribute('d', X_PATH);
    }
  });

  test('/privacy: "Thông tin chúng tôi thu thập" là <dl> 4 dòng; "Quyền của bạn" là 3 thẻ ✓', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openLegal({ page, seedState, gotoApp }, '/privacy');
    const collect = article(page).getByRole('region', { name: 'Thông tin chúng tôi thu thập', exact: true });
    const dl = collect.locator('dl');
    await expect(dl).toHaveCount(1);
    await expect(dl.locator('dt')).toHaveText([
      'Thông tin tài khoản',
      'Thông tin xác minh tuỳ chọn',
      'Hoạt động trong ứng dụng',
      'Thông tin kỹ thuật',
    ]);
    await expect(dl.locator('dd')).toHaveCount(4);
    await expect(dl.locator('dd').first()).toHaveText('tên, email, số điện thoại, vai trò (người lao động hoặc nhà tuyển dụng).');

    const rights = article(page).getByRole('region', { name: 'Quyền của bạn', exact: true });
    const cards = rights.getByRole('listitem');
    await expect(cards).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(cards.nth(i)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(cards.nth(i).locator(':scope > span[aria-hidden="true"] svg path')).toHaveAttribute('d', CHECK_PATH);
    }
  });

  test('/disputes: 4 thẻ icon, quy trình 4 bước đánh số 1–4, ô "7 ngày" + câu đầy đủ + mailto', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openLegal({ page, seedState, gotoApp }, '/disputes');
    const art = article(page);

    const when = art.getByRole('region', { name: 'Khi nào nên mở tranh chấp', exact: true });
    const cards = when.getByRole('listitem');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toContainText('Người lao động vắng mặt không báo trước.');
    for (let i = 0; i < 4; i += 1) {
      const icon = cards.nth(i).locator(':scope > span[aria-hidden="true"] svg');
      await expect(icon).toHaveCount(1);
      // Thẻ icon, không phải dấu ✕ / ✓.
      await expect(icon.locator(`path[d="${X_PATH}"], path[d="${CHECK_PATH}"]`)).toHaveCount(0);
    }

    const steps = art.getByRole('region', { name: 'Quy trình xét xử', exact: true }).locator('ol');
    await expect(steps).toHaveCount(1);
    const items = steps.locator(':scope > li');
    await expect(items).toHaveCount(4);
    const numbers = await items.evaluateAll((lis) =>
      lis.map((li) =>
        Array.from(li.querySelectorAll(':scope > span[aria-hidden="true"]'))
          .map((s) => s.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(''),
      ),
    );
    expect(numbers).toEqual(['1', '2', '3', '4']);
    await expect(items.first()).toContainText('Quản trị viên CaLẻ nhận yêu cầu và liên hệ cả hai bên trong vòng 24–48 giờ.');
    await expect(items.last()).toContainText('Quyết định cuối cùng có thể là trả tiền cọc cho người lao động');

    const reply = art.getByRole('region', { name: 'Phản hồi quyết định', exact: true });
    const badge = reply.locator('span[aria-hidden="true"]').filter({ hasText: '7' }).first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/^\s*7\s*ngày\s*$/);
    await expect(reply).toContainText(
      `Nếu bạn cho rằng quyết định chưa hợp lý, có thể gửi phản hồi bằng văn bản về ${EMAIL}. Quản trị viên cấp cao sẽ xem xét lại trong vòng 7 ngày.`,
    );
    await expect(reply.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  });
});

// ---------------------------------------------------------------------------
// 4. Cuối trang
// ---------------------------------------------------------------------------

test.describe('LegalEnd', () => {
  for (const doc of ORDER) {
    const d = DOCS[doc];
    test(`${d.path}: thẻ "Còn thắc mắc?" (email, hotline, trang hỗ trợ) + "Đọc tiếp" tới hai trang còn lại`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await openLegal({ page, seedState, gotoApp }, d.path);
      const end = page.getByRole('region', { name: 'Còn thắc mắc?', exact: true });
      await expect(end.getByRole('heading', { level: 2, name: 'Còn thắc mắc?' })).toBeVisible();

      await expect(end.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
      await expect(end.getByRole('link', { name: HOTLINE })).toHaveAttribute('href', `tel:${HOTLINE}`);
      const support = end.getByRole('link', { name: /Trang liên hệ hỗ trợ/ });
      await expect(support).toHaveAttribute('href', '/support');

      // Thẻ tối.
      const card = end.getByRole('heading', { level: 2, name: 'Còn thắc mắc?' }).locator('..');
      const bg = await card.evaluate((n) => getComputedStyle(n).backgroundColor);
      const [r, g, b] = (bg.match(/\d+/g) ?? []).map(Number);
      expect(r + g + b, `nền thẻ "Còn thắc mắc?" tối (${bg})`).toBeLessThan(150);

      const nexts = end.getByRole('link').filter({ hasText: 'Đọc tiếp' });
      await expect(nexts).toHaveCount(2);
      const others = ORDER.filter((o) => o !== doc);
      expect(await nexts.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(others.map((o) => DOCS[o].path));
      for (const [i, o] of others.entries()) await expect(nexts.nth(i)).toContainText(DOCS[o].title);
      await expect(end.locator(`a[href="${d.path}"]`)).toHaveCount(0);

      // "Đọc tiếp" thứ nhất dẫn sang trang đó.
      await nexts.first().click();
      await expect(page).toHaveURL(new RegExp(`${DOCS[others[0]].path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(DOCS[others[0]].title);
    });
  }

  test('/disputes: "Trang liên hệ hỗ trợ" trong thẻ cuối → /support', async ({ page, seedState, gotoApp }) => {
    await openLegal({ page, seedState, gotoApp }, '/disputes');
    const end = page.getByRole('region', { name: 'Còn thắc mắc?', exact: true });
    await end.getByRole('link', { name: /Trang liên hệ hỗ trợ/ }).click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Liên hệ hỗ trợ');
  });
});

// ---------------------------------------------------------------------------
// 5. Tiếng Anh
// ---------------------------------------------------------------------------

test.describe('English (cale.lang=en)', () => {
  const EN: Record<Doc, { title: string; n: number }> = {
    terms: { title: 'Terms of use', n: 6 },
    privacy: { title: 'Privacy policy', n: 5 },
    disputes: { title: 'Dispute policy', n: 5 },
  };

  for (const doc of ORDER) {
    const d = DOCS[doc];
    test(`${d.path}: Terms · Privacy · Disputes, "Legal", "Contents", "Still have questions?"`, async ({
      page,
      context,
      seedState,
      gotoApp,
    }) => {
      const baseURL = test.info().project.use.baseURL!;
      await context.addCookies([{ name: 'cale.lang', value: 'en', url: baseURL }]);
      await openLegal({ page, seedState, gotoApp }, d.path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');

      const switcher = page.getByRole('navigation', { name: 'Legal documents', exact: true });
      await expect(switcher.getByRole('link')).toHaveText(['Terms', 'Privacy', 'Disputes']);
      await expect(switcher.locator('a[aria-current="page"]')).toHaveAttribute('href', d.path);

      const h = hero(page);
      await expect(h.getByText('Legal', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(EN[doc].title);
      await expect(h.getByRole('listitem').filter({ hasText: 'Applies to: trial version' })).toHaveCount(1);
      await expect(h.getByRole('listitem').filter({ hasText: `${EN[doc].n} sections` })).toHaveCount(1);

      await expect(desktopToc(page, 'Contents')).toBeVisible();
      await expect(desktopToc(page, 'Contents').getByRole('link')).toHaveCount(EN[doc].n);
      // h2 vẫn bỏ số "1. " ở bản tiếng Anh.
      for (const title of await article(page).getByRole('heading', { level: 2 }).allTextContents()) {
        expect(title).not.toMatch(/^\s*\d+\.\s/);
      }

      const end = page.getByRole('region', { name: 'Still have questions?', exact: true });
      await expect(end).toBeVisible();
      await expect(end.getByRole('link', { name: /Contact support page/ })).toHaveAttribute('href', '/support');
      await expect(end.getByRole('link').filter({ hasText: 'Read next' })).toHaveCount(2);
    });
  }
});
