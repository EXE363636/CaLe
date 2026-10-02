import { test, expect } from './fixtures/test';
import { buildShift, buildSnapshot } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Trang chủ (02/10) — số ca đang mở, "Vì sao CaLẻ ra đời?" (số liệu đếm lên + bảng so
 * sánh), nền đổi tông khi cuộn, lọc sẵn `/shifts?viec=`.
 *
 *   - `OpenShiftCount` (màn đầu, dưới hai cửa vai trò): "● n ca đang tuyển · m ca gấp
 *     trong 24 giờ tới (dữ liệu demo) Xem ca →". Đếm bằng `isShiftAvailableForRecruiting`
 *     + `isUnfilledUrgent`; 0 ca → không hiện gì.
 *   - `section[aria-labelledby="home-why"]` (data-tone="apricot") "Vì sao CaLẻ ra đời?":
 *     4 số liệu có nguồn (mở tab mới, rel noopener; số đếm lên — `StatValue`) → bảng so
 *     sánh 5 dòng "Tuyển qua hội nhóm" / "Trên CaLẻ" → chú thích nguồn VTV. Khối / tiêu
 *     đề "CaLẻ giải quyết vấn đề gì?" (`home-solve`) đã bỏ.
 *   - Vùng bọc `.tone-scroll`: nền đổi theo `data-tone` của khối đang ở giữa màn hình
 *     (cream / apricot / paper / peach).
 *   - `/shifts?viec=<slug>` chọn sẵn "Loại công việc"; slug lạ → không lọc.
 *
 * Đồng hồ ghim ở ANCHOR_ISO (2027-06-02 12:00 ICT) cho phần đếm ca gấp.
 */

const DESKTOP = { width: 1440, height: 900 };

const OPEN = { status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, positionsFilled: 0 };

/** Dòng số ca đang mở ở màn đầu (nhận ra qua link "Xem ca →" của nó). */
function openCount(page: Page, linkName = 'Xem ca →') {
  return page
    .locator('main p')
    .filter({ has: page.getByRole('link', { name: linkName, exact: true }) });
}

test.describe('Trang chủ: số ca đang mở', () => {
  test('không có ca đang tuyển → không hiện dòng đếm (kể cả sau khi nạp dữ liệu)', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    // Có ca nhưng không ca nào đang tuyển: đủ người, đã huỷ, đã qua, chưa giữ cọc.
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ ...OPEN, id: 'e2e-cnt-full', date: '2027-06-03', startTime: '08:00', endTime: '12:00', positionsFilled: 2 }),
          buildShift({ ...OPEN, id: 'e2e-cnt-cancel', date: '2027-06-10', status: 'Cancelled' }),
          buildShift({ ...OPEN, id: 'e2e-cnt-past', date: '2027-05-20' }),
          buildShift({ ...OPEN, id: 'e2e-cnt-nodeposit', date: '2027-06-10', status: 'PendingDeposit', escrowStatus: 'None' }),
        ],
      }),
    );
    // Đăng nhập chỉ để có mốc "đã nạp dữ liệu": chuông thông báo chỉ hiện sau khi
    // AppHydrator nạp xong (cùng lúc cờ hydrated mà OpenShiftCount chờ).
    await loginAs(ACCOUNTS.worker.id, ANCHOR_ISO);
    await gotoApp('/');
    await expect(page.locator('header').getByRole('button', { name: /^Thông báo/ }).first()).toBeVisible();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // (Không lẫn với link "Xem ca đang tuyển →" ở khối loại việc.)
    await expect(page.getByText(/^\d+ ca đang tuyển$/)).toHaveCount(0);
    await expect(page.getByText('(dữ liệu demo)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Xem ca →', exact: true })).toHaveCount(0);
  });

  test('đếm đúng ca đang tuyển + ca gấp trong 24 giờ, ghi "(dữ liệu demo)", link tới /shifts', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await seedState(
      buildSnapshot({
        shifts: [
          // Gấp: bắt đầu trong 24 giờ tới, còn thiếu người.
          buildShift({ ...OPEN, id: 'e2e-cnt-urgent-1', date: '2027-06-03', startTime: '08:00', endTime: '12:00' }),
          buildShift({ ...OPEN, id: 'e2e-cnt-urgent-2', date: '2027-06-02', startTime: '18:00', endTime: '22:00' }),
          // Đang tuyển nhưng còn xa.
          buildShift({ ...OPEN, id: 'e2e-cnt-far', date: '2027-06-20' }),
          // Không tính: đủ người (dù trong 24 giờ), đã huỷ, đã qua.
          buildShift({ ...OPEN, id: 'e2e-cnt-full', date: '2027-06-03', startTime: '08:00', endTime: '12:00', positionsFilled: 2 }),
          buildShift({ ...OPEN, id: 'e2e-cnt-cancel', date: '2027-06-10', status: 'Cancelled' }),
          buildShift({ ...OPEN, id: 'e2e-cnt-past', date: '2027-05-20' }),
        ],
      }),
    );
    await gotoApp('/');

    const line = openCount(page);
    await expect(line).toHaveCount(1);
    await expect(line).toContainText('3 ca đang tuyển');
    await expect(line).toContainText('2 ca gấp trong 24 giờ tới');
    await expect(line).toContainText('(dữ liệu demo)');
    // Nằm ở màn đầu, ngay dưới hai cửa vai trò.
    const doors = page.getByRole('list', { name: 'Bạn đang tìm việc hay cần tuyển người?' });
    await expect(doors.locator('xpath=following-sibling::p[1]')).toContainText('3 ca đang tuyển');

    const link = line.getByRole('link', { name: 'Xem ca →', exact: true });
    await expect(link).toHaveAttribute('href', '/shifts');
    await link.click();
    await page.waitForURL('**/shifts');
    await expect(page.locator('a[href="/shifts/e2e-cnt-far"]')).toBeVisible();
  });

  test('số ít: "1 ca đang tuyển" · "1 ca gấp trong 24 giờ tới"', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await seedState(
      buildSnapshot({
        shifts: [buildShift({ ...OPEN, id: 'e2e-cnt-one', date: '2027-06-03', startTime: '08:00', endTime: '12:00' })],
      }),
    );
    await gotoApp('/');
    const line = openCount(page);
    await expect(line).toContainText('1 ca đang tuyển');
    await expect(line).toContainText('1 ca gấp trong 24 giờ tới');
  });

  test('chỉ có ca còn xa → hiện số ca, không có vế "ca gấp"', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ ...OPEN, id: 'e2e-cnt-far-1', date: '2027-06-20' }),
          buildShift({ ...OPEN, id: 'e2e-cnt-far-2', date: '2027-06-21' }),
        ],
      }),
    );
    await gotoApp('/');
    const line = openCount(page);
    await expect(line).toContainText('2 ca đang tuyển');
    await expect(line).not.toContainText('ca gấp');
    await expect(line).toContainText('(dữ liệu demo)');
  });
});

test.describe('Trang chủ: Vì sao CaLẻ ra đời?', () => {
  test('home-why: 4 số liệu có nguồn mở tab mới → bảng so sánh 5 dòng → chú thích VTV; không còn home-solve', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');

    const why = page.locator('main section[aria-labelledby="home-why"]');
    await expect(why).toHaveAttribute('data-tone', 'apricot');
    await expect(why.getByRole('heading', { level: 2, name: 'Vì sao CaLẻ ra đời?', exact: true })).toBeVisible();

    // 4 thẻ số liệu, mỗi thẻ một link nguồn ra ngoài (tab mới, không lộ window.opener).
    const stats = why.getByRole('list').first().getByRole('listitem');
    await expect(stats).toHaveCount(4);
    for (const [i, value] of WHY_VALUES.vi.entries()) {
      const stat = stats.nth(i);
      await expect(stat.locator('p').first()).toHaveText(value);
      const source = stat.getByRole('link');
      await expect(source).toHaveCount(1);
      await expect(source).toHaveAccessibleName(/^Nguồn: .+\(mở trang mới\)$/);
      await expect(source).toHaveAttribute('href', /^https:\/\//);
      await expect(source).toHaveAttribute('target', '_blank');
      await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
    }

    // Bảng so sánh "Tuyển qua hội nhóm" / "Trên CaLẻ" nằm ngay trong khối này (02/10:
    // bỏ tiêu đề phụ "CaLẻ giải quyết vấn đề gì?"), đúng 5 dòng theo thứ tự.
    const table = why.getByRole('list').nth(1);
    const rows = table.getByRole('listitem');
    await expect(rows).toHaveCount(5);
    for (const [i, topic] of ['Tiền công', 'Thông tin ca', 'Người không đến', 'Ai đã đến', 'Đánh giá'].entries()) {
      const row = rows.nth(i);
      await expect(row.locator('p').first()).toHaveText(topic);
      // Mỗi ô ghi tên cột (sr-only từ md) — không chỉ dựa vào vị trí / icon.
      await expect(row).toContainText('Tuyển qua hội nhóm:');
      await expect(row).toContainText('Trên CaLẻ:');
    }
    // Bản demo: câu về tiền ghi rõ mô phỏng.
    await expect(rows.nth(0)).toContainText('(mô phỏng)');
    await expect(rows.nth(2)).toContainText('(mô phỏng)');

    // Chú thích cảnh báo lừa đảo dẫn về VTV — nằm SAU bảng so sánh.
    const vtv = why.getByRole('link', { name: /^Nguồn: VTV, 01\/08\/2026/ });
    await expect(vtv).toHaveAttribute('href', /^https:\/\/vtv\.vn\//);
    await expect(vtv).toHaveAttribute('target', '_blank');
    await expect(vtv).toHaveAttribute('rel', 'noopener noreferrer');
    const tableHandle = await table.elementHandle();
    const vtvAfterTable = await vtv.evaluate(
      // DOCUMENT_POSITION_FOLLOWING (4): link đứng sau danh sách so sánh.
      (a, list) => Boolean((list as Node).compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING),
      tableHandle,
    );
    expect(vtvAfterTable, 'chú thích VTV nằm dưới bảng so sánh').toBe(true);

    // Khối / tiêu đề "CaLẻ giải quyết vấn đề gì?" đã bỏ hẳn.
    await expect(page.locator('#home-solve, [aria-labelledby="home-solve"]')).toHaveCount(0);
    await expect(page.getByText('CaLẻ giải quyết vấn đề gì')).toHaveCount(0);

    await expect(why).not.toContainText(/VNĐ|₫/);
  });

  test('nền trang đổi tông theo khối đang ở giữa màn hình (data-tone)', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedState(buildSnapshot());
    await gotoApp('/');

    const wrap = page.locator('main .tone-scroll');
    await expect(wrap).toHaveCount(1);
    // Khối loại việc / biên nhận không còn nền trắng riêng (nền do vùng bọc quyết định).
    for (const id of ['home-work', 'home-explain-title']) {
      await expect(page.locator(`section[aria-labelledby="${id}"]`), id).not.toHaveClass(/(^|\s)bg-white(\s|$)/);
    }

    // Đầu trang: tông của màn đầu (khối đầu tiên khai báo data-tone="cream").
    await expect(wrap.locator('section[data-tone]').first()).toHaveAttribute('data-tone', 'cream');
    await expect(wrap).toHaveAttribute('data-active-tone', 'cream');
    await expect(wrap).toHaveAttribute('style', /background-color:\s*var\(--tone-cream\)/);

    // Tông bám màu thương hiệu (02/10): khối trang chủ chỉ dùng cream / apricot / paper / peach.
    const declared = await wrap
      .locator('section[data-tone]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-tone')));
    expect([...new Set(declared)].sort()).toEqual(['apricot', 'cream', 'paper', 'peach']);
    await expect(page.locator('[data-tone="sand"], [data-tone="mint"]')).toHaveCount(0);

    // Cuộn để giữa màn hình nằm trong từng khối → vùng bọc lấy đúng tông khối đó.
    // Đi xuôi rồi quay ngược lại, để chắc không chỉ đổi một chiều.
    const tones: Array<[string, string]> = [
      ['home-why', 'apricot'],
      ['home-work', 'paper'],
      ['home-explain-title', 'peach'],
      ['home-features', 'cream'],
      ['home-why', 'apricot'],
    ];
    for (const [id, tone] of tones) {
      const section = page.locator(`section[aria-labelledby="${id}"]`);
      await expect(wrap.locator(`section[aria-labelledby="${id}"]`), `${id} nằm trong vùng bọc`).toHaveCount(1);
      await expect(section, id).toHaveAttribute('data-tone', tone);
      await section.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect(wrap, id).toHaveAttribute('data-active-tone', tone);
      await expect(wrap, id).toHaveAttribute('style', new RegExp(`background-color:\\s*var\\(--tone-${tone}\\)`));
    }
    // Dải kết có nền mực riêng, không khai báo tông.
    await expect(page.locator('section[aria-labelledby="home-close"]')).not.toHaveAttribute('data-tone', /.*/);
  });

  test('English: "Why was CaLẻ started?" + bảng so sánh + số ca đang mở bằng tiếng Anh', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ ...OPEN, id: 'e2e-en-urgent', date: '2027-06-03', startTime: '08:00', endTime: '12:00' }),
          buildShift({ ...OPEN, id: 'e2e-en-far', date: '2027-06-20' }),
        ],
      }),
    );
    await gotoApp('/');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const why = page.locator('main section[aria-labelledby="home-why"]');
    await expect(why.getByRole('heading', { level: 2, name: 'Why was CaLẻ started?', exact: true })).toBeVisible();
    await expect(why.getByRole('list').nth(1).getByRole('listitem').first().locator('p').first()).toHaveText('Wages');
    await expect(why.getByRole('link', { name: /^Source: VTV, 1 Aug 2026/ })).toBeVisible();
    await expect(page.getByText('What does CaLẻ solve?')).toHaveCount(0);
    await expect(page.getByText('Vì sao CaLẻ ra đời')).toHaveCount(0);

    const line = openCount(page, 'See shifts →');
    await expect(line).toContainText('2 open shifts');
    await expect(line).toContainText('1 urgent shift in the next 24 hours');
    await expect(line).toContainText('(demo data)');
    await expect(line.getByRole('link', { name: 'See shifts →', exact: true })).toHaveAttribute('href', '/shifts');
  });
});

/*
 * Số liệu "Vì sao CaLẻ ra đời?" (`StatValue`): `span.stat-mark[data-phase]`.
 *   - Nằm dưới màn đầu lúc tải → 'armed' (số thật trong suốt giữ chỗ, lớp đếm
 *     `span.stat-count[data-v]` hiện số 0 theo đúng định dạng ngôn ngữ, số màu mực);
 *     cuộn tới (≥ 60% thấy) → 'counting' ~1,2 giây → 'done' (lớp đếm biến mất, số
 *     thật hiện lại, chuyển màu cam đậm).
 *   - Đã thấy lúc tải → 'done' luôn, không đếm.
 *   - Giảm chuyển động → giữ 'static', hiện đủ số.
 * Đồng hồ giả (page.clock) dừng lại trước khi cuộn để soi số giữa chừng.
 */
const WHY_VALUES = {
  vi: ['2,53 triệu', '329.500', '61,7%', '1,4 triệu'],
  en: ['2.53 million', '329,500', '61.7%', '1.4 million'],
} as const;
/** Lớp đếm lúc chờ cuộn tới: số 0 giữ đúng số chữ số thập phân + đơn vị. */
const WHY_ZEROS = {
  vi: ['0,00 triệu', '0', '0,0%', '0,0 triệu'],
  en: ['0.00 million', '0', '0.0%', '0.0 million'],
} as const;
/** Khoảng nửa thời gian đếm (t ≈ 0,5 → tiến độ ≈ 0,86–0,875). */
const WHY_MID = {
  vi: [/^2,[12]\d triệu$/, /^28\d\.\d{3}$/, /^5[34],\d%$/, /^1,2 triệu$/],
  en: [/^2\.[12]\d million$/, /^28\d,\d{3}$/, /^5[34]\.\d%$/, /^1\.2 million$/],
} as const;

/** Màu số (giao diện sáng): cam đậm `--color-orange-700` khi 'static' / 'done', mực
 *  `--color-gray-900` khi 'armed' / 'counting' (globals.css `.stat-mark`). */
const STAT_DONE_COLOR = 'rgb(194, 65, 12)';
const STAT_COUNTING_COLOR = 'rgb(55, 55, 59)';
function markColor(mark: Locator) {
  return mark.evaluate((el) => getComputedStyle(el).color);
}

async function scrollStatsIntoView(why: Locator) {
  await why
    .getByRole('list')
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

test.describe('Trang chủ: số liệu đếm lên (StatValue)', () => {
  for (const lang of ['vi', 'en'] as const) {
    test(`${lang}: cuộn tới → đếm từ 0 lên (đúng định dạng) → data-phase="done", hiện đúng số`, async ({
      page,
      context,
      seedState,
      gotoApp,
    }) => {
      await page.setViewportSize(DESKTOP);
      if (lang === 'en') {
        const baseURL = test.info().project.use.baseURL!;
        await context.addCookies([{ name: 'cale.lang', value: 'en', url: baseURL }]);
      }
      await page.clock.install({ time: new Date(ANCHOR_ISO) });
      await seedState(buildSnapshot());
      await gotoApp('/');
      await expect(page.locator('html')).toHaveAttribute('lang', lang);

      const why = page.locator('main section[aria-labelledby="home-why"]');
      const marks = why.locator('.stat-mark');
      await expect(marks).toHaveCount(4);

      // Lúc tải: khối nằm dưới màn đầu → chờ cuộn tới, lớp đếm hiện 0.
      for (const [i, mark] of (await marks.all()).entries()) {
        await expect(mark).toHaveAttribute('data-phase', 'armed');
        // Số thật vẫn ở DOM (đúng một bản) — chỉ trong suốt giữ chỗ; số màu mực khi chờ / đếm.
        await expect(mark).toHaveText(WHY_VALUES[lang][i]);
        await expect(mark.locator('> span').first()).toHaveClass(/(^|\s)text-transparent(\s|$)/);
        const overlay = mark.locator('.stat-count');
        await expect(overlay).toHaveAttribute('aria-hidden', 'true');
        await expect(overlay).toHaveAttribute('data-v', WHY_ZEROS[lang][i]);
        expect(await markColor(mark)).toBe(STAT_COUNTING_COLOR);
      }

      // Dừng đồng hồ (rAF + performance.now) để soi số giữa chừng.
      await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 60_000));
      await scrollStatsIntoView(why);
      for (const mark of await marks.all()) {
        await expect(mark).toHaveAttribute('data-phase', 'counting');
      }

      // ~Nửa thời gian đếm: số đang lên, đúng định dạng ngôn ngữ, chưa tới số cuối.
      await page.clock.runFor(600);
      for (const [i, mark] of (await marks.all()).entries()) {
        await expect(mark).toHaveAttribute('data-phase', 'counting');
        await expect(mark.locator('.stat-count')).toHaveAttribute('data-v', WHY_MID[lang][i]);
        expect(await markColor(mark)).toBe(STAT_COUNTING_COLOR);
      }

      // Hết 1,2 giây → xong: bỏ lớp đếm, số thật hiện lại, chuyển màu cam đậm.
      await page.clock.runFor(1000);
      for (const [i, mark] of (await marks.all()).entries()) {
        await expect(mark).toHaveAttribute('data-phase', 'done');
        await expect(mark.locator('.stat-count')).toHaveCount(0);
        await expect(mark.locator('> span').first()).not.toHaveClass(/(^|\s)text-transparent(\s|$)/);
        await expect(mark).toHaveText(WHY_VALUES[lang][i]);
        await expect(mark).toBeVisible();
        // Màu chuyển dần (CSS transition, đồng hồ thật) sang cam đậm.
        await expect.poll(() => markColor(mark)).toBe(STAT_DONE_COLOR);
      }
    });
  }

  test('đã thấy lúc tải (màn hình cao) → "done" luôn, không đếm', async ({ page, seedState, gotoApp }) => {
    // Đủ cao để khối số liệu nằm trọn trong màn hình ngay lúc tải.
    await page.setViewportSize({ width: 1440, height: 3200 });
    await seedState(buildSnapshot());
    await gotoApp('/');

    const why = page.locator('main section[aria-labelledby="home-why"]');
    const marks = why.locator('.stat-mark');
    await expect(marks).toHaveCount(4);
    await expect(why.getByRole('list').first()).toBeInViewport({ ratio: 1 });
    for (const [i, mark] of (await marks.all()).entries()) {
      await expect(mark).toHaveAttribute('data-phase', 'done');
      await expect(mark.locator('.stat-count')).toHaveCount(0);
      await expect(mark).toHaveText(WHY_VALUES.vi[i]);
      await expect.poll(() => markColor(mark)).toBe(STAT_DONE_COLOR);
    }
  });

  test('giảm chuyển động → giữ "static", hiện đủ số, màu cam đậm ngay', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedState(buildSnapshot());
    await gotoApp('/');

    const why = page.locator('main section[aria-labelledby="home-why"]');
    await scrollStatsIntoView(why);
    // Mốc "đã chạy JS": ToneScroll (client) đổi tông khi khối vào giữa màn hình —
    // StatValue hydrate cùng lượt nên hiệu ứng của nó cũng đã chạy.
    await expect(page.locator('main .tone-scroll')).toHaveAttribute('data-active-tone', 'apricot');

    const marks = why.locator('.stat-mark');
    await expect(marks).toHaveCount(4);
    for (const [i, mark] of (await marks.all()).entries()) {
      await expect(mark).toHaveAttribute('data-phase', 'static');
      await expect(mark.locator('.stat-count')).toHaveCount(0);
      await expect(mark.locator('> span').first()).not.toHaveClass(/(^|\s)text-transparent(\s|$)/);
      await expect(mark).toHaveText(WHY_VALUES.vi[i]);
      expect(await markColor(mark)).toBe(STAT_DONE_COLOR);
    }
  });
});

test.describe('/shifts?viec= lọc sẵn loại việc', () => {
  const shifts = () => [
    buildShift({ ...OPEN, id: 'e2e-viec-pha', title: 'E2E Ca pha chế', jobType: 'Pha chế', date: '2030-06-10' }),
    buildShift({ ...OPEN, id: 'e2e-viec-phuc', title: 'E2E Ca phục vụ', jobType: 'Phục vụ', date: '2030-06-11' }),
  ];

  test('?viec=pha-che → chọn sẵn "Pha chế", chỉ còn ca Pha chế; bỏ lọc → hiện lại cả hai', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: shifts() }));
    await gotoApp('/shifts?viec=pha-che');

    const jobType = page.getByLabel('Loại công việc', { exact: true });
    await expect(jobType).toHaveValue('Pha chế');
    await expect(jobType.locator('option:checked')).toHaveText('Pha chế');
    await expect(page.locator('a[href="/shifts/e2e-viec-pha"]')).toBeVisible();
    await expect(page.locator('a[href="/shifts/e2e-viec-phuc"]')).toHaveCount(0);

    // Lọc sẵn chỉ là giá trị ban đầu: người dùng đổi bộ lọc như thường.
    await jobType.selectOption('');
    await expect(page.locator('a[href="/shifts/e2e-viec-phuc"]')).toBeVisible();
    await expect(page.locator('a[href="/shifts/e2e-viec-pha"]')).toBeVisible();
  });

  test('slug lạ ?viec=khong-co → không lọc, hiện mọi ca đang tuyển', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: shifts() }));
    await gotoApp('/shifts?viec=khong-co');

    const jobType = page.getByLabel('Loại công việc', { exact: true });
    await expect(jobType).toHaveValue('');
    await expect(jobType.locator('option:checked')).toHaveText('Tất cả');
    await expect(page.locator('a[href="/shifts/e2e-viec-pha"]')).toBeVisible();
    await expect(page.locator('a[href="/shifts/e2e-viec-phuc"]')).toBeVisible();
  });
});

test.describe('Trang chủ: CaLẻ làm được gì?', () => {
  test('danh sách đã có / sắp có đúng như đã duyệt (bản demo ghi "mô phỏng")', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const section = page.locator('section[aria-labelledby="home-features"]');
    await expect(section.getByRole('heading', { level: 2, name: 'CaLẻ làm được gì?' })).toBeVisible();

    const done = section.locator('h3', { hasText: 'Đã có' }).locator('xpath=following-sibling::ul[1]/li');
    const planned = section.locator('h3', { hasText: 'Sắp có' }).locator('xpath=following-sibling::ul[1]/li');
    await expect(done).toHaveCount(9);
    await expect(planned).toHaveCount(3);

    // Bản demo: câu về tiền / xác thực / tự chốt ghi "(mô phỏng)"; không nhắc PayOS.
    await expect(done.nth(0)).toContainText('(mô phỏng)');
    await expect(done.nth(2)).toContainText('(mô phỏng)');
    await expect(done.nth(5)).toContainText('12 giờ (mô phỏng)');
    await expect(done.nth(6)).toContainText('(mô phỏng)');
    await expect(section).not.toContainText('PayOS');

    // Không công khai lưới an toàn còn thiếu (khiếu nại / tranh chấp chưa bật ở production).
    await expect(section).not.toContainText(/khiếu nại|tranh chấp/i);
    await expect(section.getByText('Đang làm', { exact: true })).toHaveCount(0);
    await expect(planned.first()).toContainText('Nhắn tin');
    await expect(section.getByText('Cập nhật: 10/2026')).toBeVisible();
  });
});

test.describe('Trang landing: không hứa khiếu nại / tranh chấp (production chưa bật)', () => {
  test('trang chủ, /for-workers, /for-employers, /pricing không nhắc khiếu nại hay tranh chấp; trang chủ chỉ tới đội hỗ trợ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    for (const path of ['/', '/for-workers', '/for-employers', '/pricing']) {
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('main'), path).not.toContainText(/khiếu nại|tranh chấp/i);
    }
    await gotoApp('/');
    await expect(page.getByText('Có vấn đề sau ca: liên hệ đội hỗ trợ CaLẻ', { exact: true })).toBeVisible();
    await expect(page.locator('#home-refund').getByRole('heading', { level: 3 })).toHaveText('Hoàn lại và hỗ trợ');
  });
});

test.describe('Trang chủ: xuất hiện có nhịp (MotionGroup)', () => {
  test('khối dưới màn hình chờ ẩn rồi hiện khi cuộn tới; giảm chuyển động thì hiện sẵn', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const group = page.locator('section[aria-labelledby="home-features"] [data-motion]');
    await expect(group).toHaveAttribute('data-motion', 'armed');
    await expect(group).not.toHaveAttribute('data-in', /.*/);
    const firstItem = group.locator('.m-rise').first();
    await expect(firstItem).toHaveCSS('opacity', '0');

    await group.scrollIntoViewIfNeeded();
    await expect(group).toHaveAttribute('data-in', 'true');
    await expect(firstItem).toHaveCSS('opacity', '1');
    await expect(group.locator('.m-tick path').first()).toHaveCSS('stroke-dashoffset', '0px');

    // Giảm chuyển động: không gắn "armed", mọi mục hiện ngay.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoApp('/');
    const still = page.locator('section[aria-labelledby="home-features"] .m-rise').first();
    await expect(page.locator('section[aria-labelledby="home-features"] [data-motion]')).toHaveCount(0);
    await expect(still).toHaveCSS('opacity', '1');
  });
});
