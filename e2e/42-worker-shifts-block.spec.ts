import { test, expect } from './fixtures/test';
import { buildShift, buildSnapshot } from './fixtures/seed';
import { ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Khối "Ca đang tuyển" trên /for-workers, /shifts làm lại, khung cố định của hai minh
 * hoạ (03/10), chế độ local/demo.
 *
 *   1. `OpenShiftsSection` (#worker-shifts, ngay sau "Chọn loại việc"): tối đa 6 thẻ ca
 *      đang tuyển (cùng điều kiện /shifts — `isShiftAvailableForRecruiting`, sắp theo giờ
 *      bắt đầu sớm nhất), link `/shifts/<id>`; "Xem tất cả {n} ca →" khi > 6, "Mở trang
 *      tìm ca →" khi ≤ 6; không có ca → `OpenShiftsEmpty`; bản server (chưa nạp dữ liệu)
 *      là 3 ô giữ chỗ `aria-busy`. Ô tìm (role=search) → `/shifts?q=…` (trống → /shifts).
 *      Tông nền các khối xen kẽ cream / paper sau khi chèn khối.
 *   2. `/shifts`: da `.public-skin`, đầu trang không đóng khung, link "← Trang người lao
 *      động" + h1 "Tìm ca làm"; đọc `?q=` làm chữ tìm ban đầu (lọc theo tên / địa điểm /
 *      mô tả); nút menu thả khách "Người lao động ▾" sáng (navLinkClasses active) khi
 *      ở /shifts, /for-workers; "Nhà tuyển dụng ▾" sáng ở /for-employers.
 *   3. `ShiftPostPlayground`: khung cao cố định; bước 1 cuộn VÙNG Ô ĐIỀN theo ô đang gõ
 *      (không cuộn trang), bảng tiền + nút đăng ghim dưới vùng cuộn.
 *   4. `ApplyPreview`: khung cao cố định; bước 3 cuộn dòng thời gian theo mốc mới.
 *   5. Hai minh hoạ tĩnh (aria-hidden, có figcaption): `ReputationPreview` ở cột trái của
 *      #worker-reputation-rules; `ShiftControlPreview` ở cột phải #employer-control
 *      (LandingFeatures có `aside`: tiêu đề + 4 ý xếp 2 cột bên trái, không cột dính).
 *   6. 375px: không cuộn ngang (kể cả hai khối trên).
 *
 * Ca seed ở năm 2030 → luôn "tương lai" theo đồng hồ thật (danh sách lọc bằng Date.now()).
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

/** 8 ca đang tuyển (ngày tăng dần) + 3 ca KHÔNG được hiện (huỷ, đủ người, đã qua). */
function seedShifts() {
  const open = [1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
    buildShift({
      id: `e2e-open-${i}`,
      title: i === 2 ? 'E2E Pha chế quầy bar' : `E2E Ca tuyển ${i}`,
      location: i === 5 ? '45 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM' : '12 Nguyễn Huệ, Quận 1, TP.HCM',
      district: i === 5 ? 'Bình Thạnh, TP.HCM' : 'Quận 1, TP.HCM',
      date: `2030-07-0${i}`,
      startTime: '08:00',
      endTime: '12:00',
    }),
  );
  const hidden = [
    // Sớm hơn mọi ca mở: nếu lọt điều kiện sẽ chiếm chỗ đầu.
    buildShift({ id: 'e2e-hidden-cancelled', title: 'E2E Ca đã huỷ', date: '2030-06-01', status: 'Cancelled' }),
    buildShift({ id: 'e2e-hidden-full', title: 'E2E Ca đủ người', date: '2030-06-02', positionsTotal: 2, positionsFilled: 2 }),
    buildShift({ id: 'e2e-hidden-past', title: 'E2E Ca đã qua', date: '2025-01-05' }),
  ];
  return [...hidden, ...open];
}

function block(page: Page): Locator {
  return page.locator('section[aria-labelledby="worker-shifts"]');
}
function cardLinks(scope: Locator): Locator {
  return scope.locator('a[href^="/shifts/"]');
}
async function hrefs(links: Locator): Promise<Array<string | null>> {
  return links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
}
async function heightOf(el: Locator): Promise<number> {
  return el.evaluate((node) => Math.round(node.getBoundingClientRect().height));
}
async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY));
}
/** Cuộn tức thì (không trượt) để mốc scrollY không trôi trong lúc đo. */
async function scrollToCenter(el: Locator) {
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

/** Dừng đồng hồ trước khi tải trang: minh hoạ chỉ chạy khi test gọi `runFor`. */
async function openPaused(
  page: Page,
  gotoApp: (p: string) => Promise<void>,
  seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>,
  path: string,
  viewport = DESKTOP,
) {
  await page.setViewportSize(viewport);
  await page.clock.install({ time: new Date(ANCHOR_ISO) });
  await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 1_000));
  await seedState(buildSnapshot());
  await gotoApp(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Chạy đồng hồ giả từng nấc nhỏ cho tới khi điều kiện đúng. */
async function advanceUntil(page: Page, check: () => Promise<boolean>, label: string, stepMs = 50, maxMs = 20_000) {
  for (let t = 0; t <= maxMs; t += stepMs) {
    if (await check()) return;
    await page.clock.runFor(stepMs);
  }
  throw new Error(`Hết ${maxMs} ms đồng hồ giả mà chưa tới: ${label}`);
}

// ---------------------------------------------------------------------------
// 1. Khối "Ca đang tuyển"
// ---------------------------------------------------------------------------

test.describe('/for-workers — khối "Ca đang tuyển" (03/10)', () => {
  test('8 ca đang tuyển → 6 thẻ sớm nhất, link /shifts/<id>; ca huỷ / đủ người / đã qua không hiện; "Xem tất cả 8 ca →"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: seedShifts() }));
    await gotoApp('/for-workers');
    const section = block(page);
    await expect(section.getByRole('heading', { level: 2, name: 'Ca đang tuyển', exact: true })).toBeVisible();
    await expect(section.locator('h2')).toHaveAttribute('id', 'worker-shifts');

    // Ngay sau "Chọn loại việc".
    const order = await page
      .locator('main section[aria-labelledby]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby')));
    expect(order.indexOf('worker-shifts'), order.join(', ')).toBe(order.indexOf('worker-jobs') + 1);

    const links = cardLinks(section);
    await expect(links).toHaveCount(6);
    expect(await hrefs(links)).toEqual([1, 2, 3, 4, 5, 6].map((i) => `/shifts/e2e-open-${i}`));
    await expect(section.getByText(/E2E Ca (đã huỷ|đủ người|đã qua)/)).toHaveCount(0);
    await expect(section.locator('[aria-busy="true"]')).toHaveCount(0);
    // Thẻ ca: tiền hiển thị "đ", không "VNĐ" / "₫".
    await expect(links.first()).toContainText('đ');
    await expect(section).not.toContainText(/VNĐ|₫/);

    const all = section.getByRole('link', { name: /^Xem tất cả 8 ca/ });
    await expect(all).toHaveAttribute('href', '/shifts');
    await expect(section.getByRole('link', { name: /Mở trang tìm ca/ })).toHaveCount(0);

    // Bấm thẻ thứ hai → trang chi tiết đúng ca.
    await links.nth(1).click();
    await page.waitForURL('**/shifts/e2e-open-2');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Pha chế quầy bar');
  });

  test('"Xem tất cả 8 ca →" mở /shifts đủ 8 ca', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: seedShifts() }));
    await gotoApp('/for-workers');
    const all = block(page).getByRole('link', { name: /^Xem tất cả 8 ca/ });
    await all.scrollIntoViewIfNeeded();
    await all.click();
    await page.waitForURL(/\/shifts$/);
    await expect(page.getByText('8 ca đang mở tuyển', { exact: true })).toBeVisible();
    await expect(cardLinks(page.locator('main'))).toHaveCount(8);
  });

  test('≤ 6 ca: hiện hết, nút "Mở trang tìm ca →"', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    const shifts = seedShifts().filter((s) => ['e2e-open-1', 'e2e-open-2', 'e2e-open-3', 'e2e-hidden-full'].includes(String(s.id)));
    await seedState(buildSnapshot({ shifts }));
    await gotoApp('/for-workers');
    const section = block(page);
    await expect(cardLinks(section)).toHaveCount(3);
    await expect(section.getByRole('link', { name: /^Mở trang tìm ca/ })).toHaveAttribute('href', '/shifts');
    await expect(section.getByRole('link', { name: /Xem tất cả/ })).toHaveCount(0);
  });

  test('không có ca đang tuyển → khối "Hiện chưa có ca nào đang mở tuyển." (h3), không thẻ ca', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    const shifts = seedShifts().filter((s) => String(s.id).startsWith('e2e-hidden-'));
    await seedState(buildSnapshot({ shifts }));
    await gotoApp('/for-workers');
    const section = block(page);
    await expect(
      section.getByRole('heading', { level: 3, name: 'Hiện chưa có ca nào đang mở tuyển.', exact: true }),
    ).toBeVisible();
    await expect(cardLinks(section)).toHaveCount(0);
    await expect(section.getByRole('link', { name: /Xem tất cả|Mở trang tìm ca/ })).toHaveCount(0);
    // Khách: lối tạo tài khoản người lao động.
    await expect(section.getByRole('link', { name: 'Tạo tài khoản người lao động' })).toHaveAttribute('href', '/register?role=worker');
    // Ô tìm vẫn có.
    await expect(section.getByRole('search')).toBeVisible();
  });

  test('bản server (chưa nạp dữ liệu): 3 ô giữ chỗ aria-busy, không báo "chưa có ca"', async ({ page, seedState, gotoApp }) => {
    await seedState(buildSnapshot());
    await gotoApp('/login');
    const res = await page.request.get('/for-workers');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const start = html.indexOf('aria-labelledby="worker-shifts"');
    expect(start, 'có khối #worker-shifts trong HTML server').toBeGreaterThan(-1);
    const chunk = html.slice(start, html.indexOf('</section>', start));
    expect(chunk.match(/aria-busy="true"/g) ?? []).toHaveLength(1);
    // Ba ô giữ chỗ nằm trong vùng aria-busy.
    const busy = chunk.slice(chunk.indexOf('aria-busy="true"'));
    expect(busy.match(/animate-pulse/g) ?? []).toHaveLength(3);
    expect(chunk).not.toContain('Hiện chưa có ca nào đang mở tuyển.');
  });

  // 03/10: thẻ lợi ích (có ảnh) lên ngay sau hero ở cả hai trang; tông xen kẽ lại.
  // FAQ và "An toàn và hỗ trợ" chung một tông (cặp khối cuối trang, như trước).
  const TONES: Record<string, Record<string, string>> = {
    '/for-workers': {
      'worker-benefits': 'paper',
      'worker-jobs': 'cream',
      'worker-shifts': 'paper',
      'worker-how': 'cream',
      'worker-apply': 'paper',
      'worker-verify': 'cream',
      'worker-schedule': 'paper',
      'worker-money': 'cream',
      'worker-cancel': 'paper',
      'worker-reputation': 'cream',
      'worker-reputation-rules': 'paper',
      'worker-faq': 'cream',
      'worker-help': 'cream',
    },
    '/for-employers': {
      'employer-benefits': 'paper',
      'employer-how': 'cream',
      'employer-money': 'paper',
      'employer-verify': 'cream',
      'employer-applicants': 'paper',
      'employer-control': 'cream',
      'employer-payments': 'paper',
      // 03/10 (lần 4): khối giá gộp từ /pricing; các khối sau đổi tông lại.
      'employer-pricing': 'cream',
      'employer-reviews': 'paper',
      'employer-faq': 'cream',
      'employer-help': 'cream',
    },
  };
  for (const [path, expected] of Object.entries(TONES)) {
    test(`${path}: thẻ lợi ích ngay sau hero; tông nền xen kẽ cream / paper`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot({ shifts: seedShifts() }));
      await gotoApp(path);
      const main = page.locator('main');
      await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
      // Hero: khối đầu, tông cream, không aria-labelledby.
      await expect(main.locator('section[data-tone]').first()).toHaveAttribute('data-tone', 'cream');
      const tones = await main
        .locator('section[aria-labelledby][data-tone]')
        .evaluateAll((els) => els.map((el) => [el.getAttribute('aria-labelledby'), el.getAttribute('data-tone')] as const));
      const list = tones.filter(([id]) => !String(id).endsWith('-proof'));
      // Thứ tự + tông đúng bảng (thứ tự khoá của bảng = thứ tự khối trên trang).
      expect(list.map(([id]) => id)).toEqual(Object.keys(expected));
      expect(Object.fromEntries(list)).toEqual(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Ô tìm → /shifts?q=…, đầu trang /shifts
// ---------------------------------------------------------------------------

test.describe('Ô tìm "Ca đang tuyển" → /shifts?q=… (03/10)', () => {
  test('gõ "pha chế" + "Tìm ca" → /shifts?q=pha chế, ô tìm điền sẵn, chỉ còn ca khớp', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: seedShifts() }));
    await gotoApp('/for-workers');
    const form = block(page).getByRole('search');
    const input = form.locator('#worker-shift-search');
    await expect(form.getByLabel('Tìm ca', { exact: true })).toHaveAttribute('id', 'worker-shift-search');
    await input.fill('  pha chế ');
    await form.getByRole('button', { name: 'Tìm ca', exact: true }).click();
    await page.waitForURL(/\/shifts\?q=/);
    expect(new URL(page.url()).searchParams.get('q')).toBe('pha chế');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm');
    await expect(page.getByRole('searchbox', { name: 'Tìm kiếm' })).toHaveValue('pha chế');
    await expect(page.getByText('1 ca đang mở tuyển', { exact: true })).toBeVisible();
    const links = cardLinks(page.locator('main'));
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute('href', '/shifts/e2e-open-2');
  });

  test('ô trống + Enter → /shifts không có q, đủ 8 ca', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: seedShifts() }));
    await gotoApp('/for-workers');
    const input = block(page).locator('#worker-shift-search');
    await input.fill('   ');
    await input.press('Enter');
    await page.waitForURL(/\/shifts$/);
    await expect(page.getByRole('searchbox', { name: 'Tìm kiếm' })).toHaveValue('');
    await expect(page.getByText('8 ca đang mở tuyển', { exact: true })).toBeVisible();
  });

  test('/shifts?q= lọc theo địa điểm; không khớp → trạng thái rỗng có nút xoá lọc', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: seedShifts() }));
    await gotoApp(`/shifts?q=${encodeURIComponent('Bình Thạnh')}`);
    await expect(page.getByRole('searchbox', { name: 'Tìm kiếm' })).toHaveValue('Bình Thạnh');
    await expect(cardLinks(page.locator('main'))).toHaveCount(1);
    await expect(cardLinks(page.locator('main'))).toHaveAttribute('href', '/shifts/e2e-open-5');

    await gotoApp(`/shifts?q=${encodeURIComponent('không có ca này')}`);
    await expect(cardLinks(page.locator('main'))).toHaveCount(0);
    const clear = page.getByRole('button', { name: 'Xoá bộ lọc' });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page.getByText('8 ca đang mở tuyển', { exact: true })).toBeVisible();
  });

  test('đầu trang /shifts: da public-skin, không đóng khung, "← Trang người lao động" → /for-workers; tab "Người lao động" sáng', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: seedShifts() }));
    await gotoApp('/shifts');
    const main = page.locator('main');
    await expect(main.locator('.public-skin')).toHaveCount(1);
    const head = main.locator('.public-skin header').first();
    await expect(head.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm');
    await expect(head).toContainText('Ca chỉ hiện ở đây khi nhà tuyển dụng đã giữ trước tiền công.');
    // Không còn hộp trắng quanh đầu trang.
    const headStyle = await head.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderTopWidth, shadow: cs.boxShadow };
    });
    expect(headStyle).toEqual({ bg: 'rgba(0, 0, 0, 0)', border: '0px', shadow: 'none' });

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    // 03/10 (lần 2): hai vai trò là nút menu thả; nút sáng khi ở /shifts, /for-workers.
    const workers = nav.getByRole('button', { name: 'Người lao động', exact: true });
    const employers = nav.getByRole('button', { name: 'Nhà tuyển dụng', exact: true });
    await expect(workers).toHaveAttribute('aria-haspopup', 'menu');
    await expect(workers).toHaveAttribute('aria-expanded', 'false');
    await expect(workers).toHaveClass(/\bbg-orange-50\b/);
    await expect(workers).toHaveClass(/\btext-orange-800\b/);
    await expect(employers).not.toHaveClass(/\bbg-orange-50\b/);

    const back = head.getByRole('link', { name: /Trang người lao động/ });
    await expect(back).toHaveAttribute('href', '/for-workers');
    await expect(back).toHaveText(/^←\s*Trang người lao động$/);
    await back.click();
    await page.waitForURL('**/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
    await expect(workers).toHaveClass(/\bbg-orange-50\b/);
    await expect(employers).not.toHaveClass(/\bbg-orange-50\b/);

    // /for-employers: nút "Nhà tuyển dụng" sáng, "Người lao động" tắt.
    await gotoApp('/for-employers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');
    await expect(employers).toHaveClass(/\bbg-orange-50\b/);
    await expect(employers).toHaveClass(/\btext-orange-800\b/);
    await expect(workers).not.toHaveClass(/\bbg-orange-50\b/);

    // Trang khác: không nút nào sáng.
    await gotoApp('/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(workers).not.toHaveClass(/\bbg-orange-50\b/);
    await expect(employers).not.toHaveClass(/\bbg-orange-50\b/);
  });
});

// ---------------------------------------------------------------------------
// 3. ShiftPostPlayground — vùng ô điền cuộn theo ô đang gõ, trang đứng yên
// ---------------------------------------------------------------------------

function playground(page: Page): Locator {
  return page.locator('section[aria-labelledby="employer-money"] figure').filter({ hasText: 'Minh hoạ đăng ca' });
}
/** Khung trắng của minh hoạ (không gồm chú thích). */
function card(fig: Locator): Locator {
  return fig.locator(':scope > div').first();
}
function stageAt(fig: Locator, i: number): Locator {
  return fig.locator('div.grid > div[class*="grid-area"]').nth(i);
}
function stepBar(fig: Locator, name: string): Locator {
  return fig.getByRole('list', { name, exact: true });
}
function stepButton(bar: Locator, label: string): Locator {
  return bar.getByRole('button', { name: new RegExp(`${label}$`) });
}

const FIELDS = ['title', 'jobType', 'date', 'location', 'start', 'end', 'wage', 'people', 'desc', 'req', 'contact'];

test.describe('ShiftPostPlayground — bước 1 cuộn bên trong khung (03/10)', () => {
  test('tự gõ: vùng ô điền cuộn theo ô đang gõ, trang không cuộn, khung không đổi chiều cao; nút đăng ghim ở đáy', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-employers');
    const fig = playground(page);
    const box = card(fig);
    const bar = stepBar(fig, 'Các bước đăng một ca');
    const current = bar.locator('[aria-current="step"]');
    const step1 = stageAt(fig, 0);
    const fields = step1.locator('div.overflow-y-auto');
    await expect(fields).toHaveCount(1);
    await expect(fields.locator('[data-field]')).toHaveCount(FIELDS.length);
    const post = step1.getByRole('button', { name: 'Giữ tiền và đăng ca', exact: true });
    // Bảng tiền, dòng ví, nút đăng nằm NGOÀI vùng cuộn.
    await expect(fields.getByRole('button')).toHaveCount(0);
    await expect(fields.locator('dl')).toHaveCount(0);

    await scrollToCenter(fig);
    await expect(current).toHaveText('1. Điền ca');
    const y0 = await scrollY(page);
    const h0 = await heightOf(box);
    // Desktop 1440: khung ~700 px (h-[37rem] cho các bước + thanh bước + đệm).
    expect(h0, 'chiều cao khung desktop').toBeGreaterThan(640);
    expect(h0, 'chiều cao khung desktop').toBeLessThan(760);
    const overflow = await fields.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, top: el.scrollTop }));
    expect(overflow.sh, 'vùng ô điền dài hơn khung → phải cuộn').toBeGreaterThan(overflow.ch);
    expect(overflow.top).toBe(0);

    const tops: number[] = [];
    for (const f of FIELDS) {
      const activeMark = fields.locator(`[data-field="${f}"] [class~="border-orange-400"]`);
      await advanceUntil(page, async () => (await activeMark.count()) > 0, `ô "${f}" đang gõ`);
      // Ô đang gõ nằm trọn trong vùng nhìn của vùng cuộn (đợi cuộn mượt xong).
      await expect
        .poll(
          () =>
            fields.evaluate((el, key) => {
              const target = el.querySelector(`[data-field="${key}"]`)!.getBoundingClientRect();
              const view = el.getBoundingClientRect();
              return target.top >= view.top - 1 && target.bottom <= view.bottom + 1;
            }, f),
          { message: `ô "${f}" nằm trong vùng nhìn của vùng ô điền` },
        )
        .toBe(true);
      tops.push(await fields.evaluate((el) => Math.round(el.scrollTop)));
      expect(await scrollY(page), `trang không cuộn khi gõ ô "${f}"`).toBe(y0);
      expect(await heightOf(box), `chiều cao khung khi gõ ô "${f}"`).toBe(h0);
      // Nút đăng luôn thấy được trong khung (ghim dưới vùng cuộn).
      const inside = await post.evaluate((btn, frame) => {
        const b = btn.getBoundingClientRect();
        const c = (frame as Element).getBoundingClientRect();
        return b.top >= c.top && b.bottom <= c.bottom;
      }, await box.elementHandle());
      expect(inside, `nút đăng nằm trong khung khi gõ ô "${f}"`).toBe(true);
    }
    // Cuộn đi xuống theo thứ tự ô, và thật sự đã cuộn.
    expect(tops, JSON.stringify(tops)).toEqual([...tops].sort((a, b) => a - b));
    expect(tops[tops.length - 1], JSON.stringify(tops)).toBeGreaterThan(0);

    // Bước 2, bước 3, hết kịch bản: trang vẫn đứng yên, khung vẫn cao như cũ.
    await advanceUntil(page, async () => (await current.textContent()) === '2. Tuyển người', 'bước 2');
    expect(await heightOf(box), 'bước 2').toBe(h0);
    await advanceUntil(page, async () => (await current.textContent()) === '3. Ngày làm & sau ca', 'bước 3');
    expect(await heightOf(box), 'bước 3').toBe(h0);
    const again = fig.locator('figcaption button', { hasText: 'Xem lại' });
    await advanceUntil(page, async () => again.isVisible(), 'hết kịch bản');
    expect(await heightOf(box), 'hết kịch bản').toBe(h0);
    expect(await scrollY(page), 'trang không cuộn suốt kịch bản').toBe(y0);

    // Xong kịch bản: đổi bước + bật / tắt "1 người không đến" — khung không nhảy.
    for (const label of ['Điền ca', 'Tuyển người', 'Ngày làm & sau ca']) {
      await stepButton(bar, label).click();
      await expect(stepButton(bar, label)).toHaveAttribute('aria-current', 'step');
      expect(await heightOf(box), `chiều cao ở bước "${label}"`).toBe(h0);
    }
    const absent = fig.getByRole('checkbox', { name: 'Giả sử 1 người không đến' });
    await absent.check();
    await expect(fig.getByText('+225.000 đ', { exact: true })).toBeVisible();
    expect(await heightOf(box), '1 người vắng').toBe(h0);
    await absent.uncheck();
    expect(await heightOf(box), 'bỏ đánh dấu vắng').toBe(h0);
  });

  test('375px (giảm chuyển động): khung cố định khi đổi bước; bước 1 cuộn bên trong, nút đăng vẫn thấy', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(MOBILE);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const fig = playground(page);
    const box = card(fig);
    const bar = stepBar(fig, 'Các bước đăng một ca');
    await scrollToCenter(fig);
    await expect(bar.getByRole('button')).toHaveCount(3);
    const h0 = await heightOf(box);
    expect(h0).toBeGreaterThan(0);
    for (const label of ['Điền ca', 'Tuyển người', 'Ngày làm & sau ca', 'Điền ca']) {
      await stepButton(bar, label).click();
      await expect(stepButton(bar, label)).toHaveAttribute('aria-current', 'step');
      expect(await heightOf(box), `chiều cao ở bước "${label}" (375px)`).toBe(h0);
    }
    const fields = stageAt(fig, 0).locator('div.overflow-y-auto');
    const m = await fields.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
    expect(m.sh).toBeGreaterThan(m.ch);
    // Header dính (03/10, html/body overflow-x: clip): ở 375px thanh bước nằm dưới header nên
    // khi bấm, Playwright cuộn trang để chạm được nút → đặt lại khung vào giữa màn hình trước
    // khi kiểm nút đăng (khung cao cố định, nút nằm trong khung).
    await scrollToCenter(box);
    await expect(stageAt(fig, 0).getByRole('button', { name: 'Giữ tiền và đăng ca', exact: true })).toBeInViewport();
    const sw = await box.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(sw, 'khung minh hoạ không tràn ngang').toBeLessThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 4. ApplyPreview — khung cố định, dòng thời gian cuộn bên trong
// ---------------------------------------------------------------------------

function applyFig(page: Page): Locator {
  return page.locator('#worker-apply').locator('xpath=ancestor::section[1]').locator('figure');
}

for (const vp of [
  { name: 'desktop', size: DESKTOP },
  { name: '375px', size: MOBILE },
]) {
  test(`ApplyPreview (${vp.name}): tự chạy → khung không đổi chiều cao, trang không cuộn`, async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-workers', vp.size);
    const fig = applyFig(page);
    const box = card(fig);
    const bar = stepBar(fig, 'Các bước nhận một ca');
    const current = bar.locator('[aria-current="step"]');
    const after = stageAt(fig, 2);
    const items = after.locator('ol.flex-col > li');

    await scrollToCenter(fig);
    await expect(current).toHaveText('1. Tìm ca');
    const y0 = await scrollY(page);
    const h0 = await heightOf(box);
    expect(h0).toBeGreaterThan(0);
    const heights: Array<[string, number]> = [['bước 1', h0]];

    await advanceUntil(page, async () => (await current.textContent()) === '2. Xem chi tiết', 'bước 2');
    heights.push(['bước 2', await heightOf(box)]);
    await advanceUntil(page, async () => (await current.textContent()) === '3. Sau khi ứng tuyển', 'bước 3');
    heights.push(['bước 3', await heightOf(box)]);

    for (let k = 1; k <= 6; k += 1) {
      await advanceUntil(page, async () => /opacity-100/.test((await items.nth(k - 1).getAttribute('class')) ?? ''), `mốc ${k}`);
      heights.push([`mốc ${k}`, await heightOf(box)]);
      expect(await scrollY(page), `trang không cuộn ở mốc ${k}`).toBe(y0);
    }
    const again = fig.locator('figcaption button', { hasText: 'Xem lại' });
    await advanceUntil(page, async () => again.isVisible(), 'hết kịch bản');
    heights.push(['hết kịch bản', await heightOf(box)]);
    expect(await scrollY(page), 'trang không cuộn suốt kịch bản').toBe(y0);

    for (const label of ['Tìm ca', 'Xem chi tiết', 'Sau khi ứng tuyển']) {
      await stepButton(bar, label).click();
      await expect(stepButton(bar, label)).toHaveAttribute('aria-current', 'step');
      heights.push([`bấm "${label}"`, await heightOf(box)]);
    }
    for (const [label, h] of heights) expect(h, `chiều cao ${label} (${JSON.stringify(heights)})`).toBe(h0);
  });

  test(`ApplyPreview (${vp.name}): bước 3 tự chạy — dòng thời gian cuộn bên trong, mốc vừa sáng nằm trọn trong vùng nhìn`, async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-workers', vp.size);
    const fig = applyFig(page);
    const bar = stepBar(fig, 'Các bước nhận một ca');
    const current = bar.locator('[aria-current="step"]');
    const after = stageAt(fig, 2);
    const items = after.locator('ol.flex-col > li');
    await scrollToCenter(fig);
    await expect(current).toHaveText('1. Tìm ca');
    const y0 = await scrollY(page);
    await advanceUntil(page, async () => (await current.textContent()) === '3. Sau khi ứng tuyển', 'bước 3');
    // Khung cố định: dòng thời gian dài hơn khung → cuộn bên trong.
    const m = await after.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
    expect(m.sh, JSON.stringify(m)).toBeGreaterThan(m.ch);

    for (let k = 1; k <= 6; k += 1) {
      await advanceUntil(page, async () => /opacity-100/.test((await items.nth(k - 1).getAttribute('class')) ?? ''), `mốc ${k}`);
      // Hiện số đo khi hỏng: mép trên / dưới của mốc so với vùng cuộn.
      await expect
        .poll(
          () =>
            after.evaluate((el, i) => {
              const li = el.querySelectorAll('ol.flex-col > li')[i].getBoundingClientRect();
              const view = el.getBoundingClientRect();
              const top = Math.round(li.top - view.top);
              const bottom = Math.round(li.bottom - view.top);
              return top >= -1 && bottom <= el.clientHeight + 1
                ? 'trong vùng nhìn'
                : `ngoài vùng nhìn: mép trên ${top}px, mép dưới ${bottom}px, vùng cuộn cao ${el.clientHeight}px, scrollTop ${Math.round(el.scrollTop)}`;
            }, k - 1),
          { message: `mốc ${k} (vừa sáng) nằm trọn trong vùng nhìn của bước 3` },
        )
        .toBe('trong vùng nhìn');
      expect(await scrollY(page), `trang không cuộn ở mốc ${k}`).toBe(y0);
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Minh hoạ tĩnh: điểm uy tín (/for-workers), quản lý ca (/for-employers)
// ---------------------------------------------------------------------------

async function rectOf(el: Locator) {
  const b = await el.boundingBox();
  expect(b, 'phần tử có kích thước').not.toBeNull();
  return { left: b!.x, right: b!.x + b!.width, top: b!.y, bottom: b!.y + b!.height };
}

test.describe('Minh hoạ tĩnh trong khối luật uy tín / quản lý ca (03/10)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('/for-workers #worker-reputation-rules: ReputationPreview ở cột trái dưới tiêu đề, ẩn với trình đọc màn hình, có chú thích', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    const section = page.locator('section[aria-labelledby="worker-reputation-rules"]');
    await section.scrollIntoViewIfNeeded();
    const fig = section.locator('figure');
    await expect(fig).toHaveCount(1);
    await expect(fig.locator(':scope > div')).toHaveAttribute('aria-hidden', 'true');
    await expect(fig.locator('figcaption')).toHaveText('Minh hoạ điểm uy tín. Ca và số điểm là ví dụ.');
    await expect(fig).toContainText('Điểm uy tín của bạn');
    await expect(fig).not.toContainText('Sắp có');
    await expect(fig).not.toContainText(/VNĐ|₫/);
    // Cột trái: dưới tiêu đề, bên trái danh sách luật.
    const h2 = await rectOf(section.locator('#worker-reputation-rules'));
    const f = await rectOf(fig);
    const rule = await rectOf(section.locator('li h3').first());
    expect(f.top).toBeGreaterThan(h2.bottom);
    expect(f.right).toBeLessThanOrEqual(rule.left);
    // Có minh hoạ → hai cột không dính khi cuộn; thẻ luật giãn: danh sách bắt đầu ngang
    // tiêu đề và kết thúc ngang đáy thẻ minh hoạ (không tính dòng chú thích).
    const sticky = await section.evaluate((el) =>
      [...el.querySelectorAll('*')].filter((n) => getComputedStyle(n).position === 'sticky').length,
    );
    expect(sticky).toBe(0);
    const list = await rectOf(section.locator('ul').filter({ has: page.locator('li h3') }));
    const cardBox = await rectOf(fig.locator(':scope > div'));
    expect(Math.abs(list.top - h2.top), `đỉnh danh sách ${list.top} / tiêu đề ${h2.top}`).toBeLessThanOrEqual(4);
    expect(Math.abs(list.bottom - cardBox.bottom), `đáy danh sách ${list.bottom} / đáy thẻ minh hoạ ${cardBox.bottom}`).toBeLessThanOrEqual(24);
  });

  test('/for-employers #employer-control: 4 ý (2 cột) bên trái, ShiftControlPreview bên phải, không cột dính; nhãn "Đang diễn ra" tông info', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const section = page.locator('section[aria-labelledby="employer-control"]');
    await section.scrollIntoViewIfNeeded();
    const titles = section.locator('li h3');
    await expect(titles).toHaveText(['Trạng thái ca rõ ràng', 'Lịch tuyển dụng', 'Đăng lại ca cũ', 'Ví có lịch sử']);
    const fig = section.locator('figure');
    await expect(fig).toHaveCount(1);
    await expect(fig.locator(':scope > div')).toHaveAttribute('aria-hidden', 'true');
    await expect(fig.locator('figcaption')).toHaveText('Minh hoạ trang quản lý ca. Tên và số liệu là ví dụ.');
    // Bất biến badge: "Đang diễn ra" luôn kèm chữ và tông info (xanh dương).
    const badge = fig.getByText('Đang diễn ra', { exact: true });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/\bbg-blue-100\b/);
    // Bản demo: ví ghi rõ mô phỏng, tiền dùng "đ".
    await expect(fig).toContainText('Lịch sử ví (mô phỏng)');
    await expect(fig).toContainText('−675.000 đ');
    await expect(fig).not.toContainText(/VNĐ|₫/);

    // Bố cục: 4 ý xếp 2 cột (hai ý đầu cùng hàng), minh hoạ ở bên phải danh sách.
    const [a, b] = [await rectOf(titles.nth(0)), await rectOf(titles.nth(1))];
    expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(2);
    expect(b.left).toBeGreaterThan(a.right);
    const list = await rectOf(section.locator('ul').filter({ has: page.locator('li h3') }));
    const f = await rectOf(fig);
    expect(f.left).toBeGreaterThanOrEqual(list.right);
    // Không còn cột dính.
    const sticky = await section.evaluate((el) =>
      [...el.querySelectorAll('*')].filter((n) => getComputedStyle(n).position === 'sticky').length,
    );
    expect(sticky).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. 375px không cuộn ngang
// ---------------------------------------------------------------------------

test.describe('375px — "Ca đang tuyển", /shifts, khối luật uy tín / quản lý ca không cuộn ngang', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const path of ['/for-workers', `/shifts?q=${encodeURIComponent('E2E')}`, '/for-employers']) {
    test(`${path}: không cuộn ngang`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize(MOBILE);
      await seedState(buildSnapshot({ shifts: seedShifts() }));
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (path === '/for-workers') {
        const section = block(page);
        await section.scrollIntoViewIfNeeded();
        await expect(cardLinks(section)).toHaveCount(6);
        expect(await section.evaluate((el) => el.scrollWidth), '#worker-shifts').toBeLessThanOrEqual(MOBILE.width);
        const rules = page.locator('section[aria-labelledby="worker-reputation-rules"]');
        await rules.scrollIntoViewIfNeeded();
        await expect(rules.locator('figure figcaption')).toBeVisible();
        expect(await rules.evaluate((el) => el.scrollWidth), '#worker-reputation-rules').toBeLessThanOrEqual(MOBILE.width);
        // Ô tìm + nút "Tìm ca" vừa một hàng, chạm ≥ 44px.
        const btn = section.getByRole('button', { name: 'Tìm ca', exact: true });
        const bb = await btn.boundingBox();
        expect(bb!.height).toBeGreaterThanOrEqual(44);
        expect(bb!.x + bb!.width).toBeLessThanOrEqual(MOBILE.width);
      } else if (path === '/for-employers') {
        const control = page.locator('section[aria-labelledby="employer-control"]');
        await control.scrollIntoViewIfNeeded();
        await expect(control.locator('figure figcaption')).toBeVisible();
        expect(await control.evaluate((el) => el.scrollWidth), '#employer-control').toBeLessThanOrEqual(MOBILE.width);
        const fig = await rectOf(control.locator('figure'));
        expect(fig.right, 'minh hoạ quản lý ca nằm trong màn hình').toBeLessThanOrEqual(MOBILE.width);
      } else {
        await expect(cardLinks(page.locator('main'))).toHaveCount(8);
        await expect(page.locator('main .public-skin header').getByRole('link', { name: /Trang người lao động/ })).toBeVisible();
      }
      await page.locator('footer').scrollIntoViewIfNeeded();
      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.doc).toBeLessThanOrEqual(MOBILE.width);
      expect(widths.body).toBeLessThanOrEqual(MOBILE.width);
    });
  }
});
