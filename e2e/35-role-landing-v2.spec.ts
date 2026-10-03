import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Trang vai trò bản 03/10 (`/for-workers`, `/for-employers`).
 *
 *   - /for-workers: "Chọn loại việc bạn muốn làm" (9 loại → `/shifts?viec=…`, phụ bếp /
 *     dọn dẹp → `/shifts`), cảnh nhận ca 3 bước (`ApplyPreview`, #worker-apply: Tìm ca →
 *     Xem chi tiết → Sau khi ứng tuyển), thẻ xác thực tự gõ (`VerifyPreview`), "Tiền về
 *     tay bạn khi nào?" (`PayoutTimeline`, 5 chặng), FAQ rút tiền. Khối "Làm theo ca mà vẫn
 *     yên tâm" (#worker-care) đã bỏ (03/10); lịch cá nhân, huỷ ca, uy tín là khối riêng
 *     (gộp từ trang hướng dẫn cũ — xem e2e/41).
 *   - /for-employers: "Một ca tốn bao nhiêu?" (`ShiftPostPlayground`, 3 bước: Điền ca →
 *     Tuyển người → Ngày làm & sau ca; sửa được giờ / lương / số người, số dư ví mẫu
 *     2.000.000 đ), thẻ xác thực; khối bảng giá riêng đã bỏ; thêm "Duyệt người…"
 *     (#employer-applicants) và "Tiền của một ca đi về đâu?" (#employer-payments).
 *
 * 03/10: các bước của minh hoạ nhiều bước chồng trong MỘT ô (`StageStack`): bước không
 * xem vẫn có trong DOM nhưng `invisible` + `inert` + aria-hidden → kiểm nội dung bước
 * bằng `stageAt(fig, i)` / `toBeHidden()`, không dùng `toHaveCount(0)`.
 *
 * Hai minh hoạ nhiều bước có thanh bước (`PreviewSteps`): đang tự chạy là chữ, chạy xong
 * (hoặc giảm chuyển động) là nút để xem lại từng bước. Trạng thái cuối = bước 3.
 *
 * Minh hoạ chạy MỘT lần khi cuộn tới (`useTypingScript`, requestAnimationFrame): bản
 * server và giảm chuyển động hiện sẵn trạng thái CUỐI → kiểm trạng thái cuối bằng
 * `reducedMotion: 'reduce'`. Kiểm giữa chừng: đồng hồ giả DỪNG trước khi vào trang,
 * cuộn tới, chờ minh hoạ về trạng thái trống (IntersectionObserver đã bắn — chỉ nó đặt
 * về trống khi đồng hồ đứng), rồi `runFor`. Thời lượng: mỗi ô `type` = ký tự × 55 +
 * 260 ms, mỗi mốc `mark` = ms của nó (`typingScript.ts`).
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

/** Dừng đồng hồ trước khi tải trang: minh hoạ chỉ chạy khi test gọi `runFor`. */
async function openPaused(
  page: Page,
  gotoApp: (p: string) => Promise<void>,
  seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>,
  path: string,
) {
  await page.setViewportSize(DESKTOP);
  await page.clock.install({ time: new Date(ANCHOR_ISO) });
  await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 1_000));
  await seedState(buildSnapshot());
  await gotoApp(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Minh hoạ "Thử đăng một ca" (cả figure, gồm thanh bước + chú thích + "Xem lại"). */
function playground(page: Page): Locator {
  return page.locator('section[aria-labelledby="employer-money"] figure').filter({ hasText: 'Minh hoạ đăng ca' });
}
/** Minh hoạ "Tìm được ca là ứng tuyển ngay". */
function applyFig(page: Page): Locator {
  return page.locator('#worker-apply').locator('xpath=ancestor::section[1]').locator('figure');
}
/** Giá trị (dd) của một dòng trong bảng tiền / khối "Khi ca xong". */
function row(scope: Locator, label: string): Locator {
  return scope.locator('dl > div').filter({ hasText: label }).locator('dd');
}
function replayButton(fig: Locator): Locator {
  return fig.locator('figcaption button', { hasText: 'Xem lại' });
}
/** Thanh 3 bước (`PreviewSteps`): đang tự chạy là chữ, chạy xong là nút. */
function stepBar(fig: Locator, name: string): Locator {
  return fig.getByRole('list', { name, exact: true });
}
function currentStep(bar: Locator): Locator {
  return bar.locator('[aria-current="step"]');
}
/** Nút một bước trên thanh bước (tên nút có tiền tố "1. " / "✓ "). */
function stepButton(bar: Locator, label: string): Locator {
  return bar.getByRole('button', { name: new RegExp(`${label}$`) });
}
/** Bước thứ i (0-based) trong `StageStack` của một minh hoạ nhiều bước. Mọi bước luôn có
 *  trong DOM; bước không xem là `invisible` + `inert` + aria-hidden (03/10). */
function stageAt(fig: Locator, i: number): Locator {
  return fig.locator('div.grid > div[class*="grid-area"]').nth(i);
}
/** Một bước của ApplyPreview: 0 Tìm ca, 1 Xem chi tiết, 2 Sau khi ứng tuyển. */
function applyStage(fig: Locator, i: number): Locator {
  return stageAt(fig, i);
}
/** Các mốc trên dòng thời gian (`TimelineItem`): sáng = opacity-100, chưa tới = opacity-30. */
function timeline(scope: Locator): Locator {
  return scope.locator('ol.flex-col > li');
}
/** Dòng người ứng tuyển ở bước 2 của ShiftPostPlayground (có "★ x,y · n đánh giá"). */
function applicantRows(fig: Locator): Locator {
  return fig.locator('ul > li').filter({ hasText: /\d+ đánh giá/ });
}

// ---------------------------------------------------------------------------
// /for-workers
// ---------------------------------------------------------------------------

test.describe('/for-workers bản 03/10', () => {
  test('thứ tự khối + 9 loại việc dẫn tới /shifts đã lọc; khối "yên tâm" đã bỏ; FAQ rút tiền (demo)', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');

    const order = await main
      .locator('section[aria-labelledby]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby') ?? ''));
    expect(order.filter((id) => id !== 'worker-proof'), `thứ tự khối: ${order.join(', ')}`).toEqual([
      // 03/10: 3 thẻ lợi ích có ảnh ngay sau hero.
      'worker-benefits',
      'worker-jobs',
      // 03/10: "Ca đang tuyển" ngay sau "Chọn loại việc" (chi tiết: e2e/42).
      'worker-shifts',
      'worker-how',
      'worker-apply',
      'worker-verify',
      'worker-schedule',
      'worker-money',
      'worker-cancel',
      'worker-reputation',
      'worker-reputation-rules',
      'worker-faq',
      // 04/10: minh hoạ trợ lý theo câu hỏi người lao động (chi tiết: e2e/48).
      'worker-assistant',
      'worker-help',
    ]);
    // Mọi khối nội dung mang data-tone (ToneScroll đổi nền theo khối).
    for (const id of order) {
      await expect(main.locator(`section[aria-labelledby="${id}"]`), id).toHaveAttribute('data-tone', /.+/);
    }

    const jobs = main.locator('section[aria-labelledby="worker-jobs"]');
    await expect(jobs.getByRole('heading', { level: 2, name: 'Chọn loại việc bạn muốn làm' })).toBeVisible();
    const links = jobs.getByRole('listitem').getByRole('link');
    await expect(links).toHaveCount(9);
    const expected: Array<[string, string]> = [
      ['Phục vụ', '/shifts?viec=phuc-vu'],
      ['Phụ bếp', '/shifts'],
      ['Pha chế', '/shifts?viec=pha-che'],
      ['Thu ngân', '/shifts?viec=thu-ngan'],
      ['Kho vận', '/shifts?viec=kho-van'],
      ['Hỗ trợ sự kiện', '/shifts?viec=su-kien'],
      ['Phát tờ rơi', '/shifts?viec=phat-to-roi'],
      ['Bảo vệ', '/shifts?viec=bao-ve'],
      ['Dọn dẹp', '/shifts'],
    ];
    for (const [i, [label, href]] of expected.entries()) {
      await expect(links.nth(i), label).toContainText(label);
      await expect(links.nth(i), label).toHaveAttribute('href', href);
    }

    // "Làm theo ca mà vẫn yên tâm" (#worker-care) đã bỏ (03/10); 2 điều về tiền cũng không còn.
    await expect(main.locator('#worker-care, section[aria-labelledby="worker-care"]')).toHaveCount(0);
    await expect(main.getByText('Làm theo ca mà vẫn yên tâm', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Biết trước mình được bao nhiêu', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Tiền công có sẵn', { exact: true })).toHaveCount(0);

    // FAQ demo: có câu rút tiền (trả lời mô phỏng), không có câu cọc khi ứng tuyển.
    const faq = main.locator('section[aria-labelledby="worker-faq"]');
    const withdraw = faq.locator('details').filter({ hasText: 'Rút tiền về ngân hàng thế nào?' });
    await expect(withdraw).toHaveCount(1);
    await withdraw.locator('summary').click();
    await expect(
      withdraw.getByText('Bản demo chưa rút được tiền thật; số dư trong ví là mô phỏng.', { exact: true }),
    ).toBeVisible();
    await expect(faq.getByText('Ứng tuyển có phải đặt cọc không?', { exact: true })).toHaveCount(0);

    // Bấm "Phục vụ" → /shifts đã lọc.
    await links.nth(0).click();
    await page.waitForURL('**/shifts?viec=phuc-vu');
  });

  // Kịch bản ApplyPreview (mốc ghi lúc BẮT ĐẦU): gõ "phục vụ" 0–645, "Quận 3" 645–1235,
  // results 1235, pick 2035, detail 2735 (bước 2), press 5335, applied 5835 (bước 3),
  // t1 6135, t2 6685, t3 7235, t4 7785, t5 8335, t6 8885, hết 9285 ms.
  test('ApplyPreview tự diễn khi cuộn tới: tìm → chọn ca → bước 2 chi tiết → bước 3 theo dõi đơn; xong thì bấm được từng bước', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-workers');
    const section = page.locator('#worker-apply').locator('xpath=ancestor::section[1]');
    await expect(section.getByRole('heading', { level: 2, name: 'Tìm được ca là ứng tuyển ngay' })).toBeVisible();
    const fig = applyFig(page);
    const bar = stepBar(fig, 'Các bước nhận một ca');
    const [search, detail, after] = [0, 1, 2].map((i) => applyStage(fig, i));
    const rows = search.locator('ul > li');
    const items = timeline(after);
    const again = replayButton(fig);

    await fig.scrollIntoViewIfNeeded();
    // IntersectionObserver bắn → bước 1, ô tìm trống, danh sách mờ hẳn; thanh bước chưa bấm được.
    await expect(currentStep(bar)).toHaveText('1. Tìm ca');
    await expect(bar.getByRole('button')).toHaveCount(0);
    await expect(search.getByText('Tìm theo tên ca, địa điểm...', { exact: true })).toBeVisible();
    await expect(rows.nth(0)).toHaveClass(/opacity-0/);
    await expect(detail).toBeHidden();
    await expect(after).toBeHidden();
    await expect(again).toBeHidden();

    // 1000 ms: đã gõ "phục vụ", kết quả chưa hiện (1235).
    await page.clock.runFor(1_000);
    await expect(search.getByText('phục vụ', { exact: true })).toBeVisible();
    await expect(rows.nth(0)).toHaveClass(/opacity-0/);

    // 2500 ms: có kết quả, đã chọn ca đầu (2035), chưa sang chi tiết (2735).
    await page.clock.runFor(1_500);
    await expect(search.getByText('Quận 3', { exact: true })).toBeVisible();
    await expect(rows.nth(0)).toHaveClass(/opacity-100/);
    await expect(rows.nth(0)).toHaveClass(/border-orange-300/);
    await expect(rows.nth(1)).toHaveClass(/opacity-60/);
    await expect(rows.nth(0)).toContainText('Phục vụ quán cà phê');
    await expect(rows.nth(0)).toContainText('180.000 đ');
    await expect(rows.nth(1)).toContainText('Phục vụ tiệc cưới');
    await expect(rows.nth(1)).toContainText('200.000 đ');
    // Đang tự chạy: dòng kết quả chưa phải nút.
    await expect(rows.nth(0).getByRole('button')).toHaveCount(0);
    await expect(detail).toBeHidden();

    // 3500 ms: bước 2 "Xem chi tiết".
    await page.clock.runFor(1_000);
    await expect(currentStep(bar)).toHaveText('2. Xem chi tiết');
    await expect(bar).toContainText('✓ Tìm ca');
    await expect(search).toBeHidden();
    await expect(detail).toBeVisible();
    await expect(detail.getByText('Tiền công cả ca', { exact: true })).toBeVisible();
    await expect(detail.getByText('45.000 đ/giờ · 4 giờ', { exact: true })).toBeVisible();
    await expect(detail).toContainText('180.000 đ');
    await expect(detail.getByText('Anh Tuấn, quản lý quán', { exact: true })).toBeVisible();
    await expect(detail).toContainText('4,7 · 12 đánh giá về quán');
    await expect(detail).toContainText('Tự huỷ được tới 04:00 (3 giờ trước ca)');
    await expect(detail.getByRole('button', { name: 'Ứng tuyển', exact: true })).toBeVisible();
    await expect(detail.getByRole('button', { name: /Tìm ca/ })).toHaveCount(0);
    await expect(after).toBeHidden();

    // 6200 ms: bước 3 (applied 5835), mốc 1 sáng (6135), mốc 2 chưa (6685).
    await page.clock.runFor(2_700);
    await expect(currentStep(bar)).toHaveText('3. Sau khi ứng tuyển');
    await expect(detail).toBeHidden();
    await expect(after).toBeVisible();
    await expect(after.locator('span.rounded-full', { hasText: 'Đã ứng tuyển' })).toBeVisible();
    await expect(items).toHaveCount(6);
    await expect(items.nth(0)).toHaveClass(/opacity-100/);
    await expect(items.nth(1)).toHaveClass(/opacity-30/);
    await expect(items.nth(5)).toHaveClass(/opacity-30/);
    await expect(again).toBeHidden();

    // 9400 ms: hết kịch bản (9285) — mọi mốc sáng, có "Xem lại", thanh bước thành nút.
    await page.clock.runFor(3_200);
    for (let i = 0; i < 6; i += 1) await expect(items.nth(i)).toHaveClass(/opacity-100/);
    await expect(items.nth(4)).toContainText('+180.000 đ');
    await expect(again).toBeVisible();
    await expect(bar.getByRole('button')).toHaveCount(3);
    await expect(stepButton(bar, 'Sau khi ứng tuyển')).toHaveAttribute('aria-current', 'step');

    // Bấm thanh bước "Tìm ca" → dòng kết quả đầu là nút → chi tiết → "Ứng tuyển" → bước 3.
    await stepButton(bar, 'Tìm ca').click();
    await expect(search).toBeVisible();
    await expect(after).toBeHidden();
    await rows.nth(0).getByRole('button').click();
    await expect(detail).toBeVisible();
    await expect(currentStep(bar)).toHaveText('2. Xem chi tiết');
    await detail.getByRole('button', { name: 'Ứng tuyển', exact: true }).click();
    await expect(after).toBeVisible();
    await after.getByRole('button', { name: '← Xem chi tiết' }).click();
    await expect(detail).toBeVisible();
    await detail.getByRole('button', { name: '← Tìm ca' }).click();
    await expect(search).toBeVisible();

    // "Xem lại" chạy lại từ đầu: bước 1 trống, thanh bước lại chỉ là chữ.
    await again.click();
    await expect(currentStep(bar)).toHaveText('1. Tìm ca');
    await expect(bar.getByRole('button')).toHaveCount(0);
    await expect(search.getByText('Tìm theo tên ca, địa điểm...', { exact: true })).toBeVisible();
    await expect(again).toBeHidden();
  });

  test('PayoutTimeline chạy một lần khi cuộn tới: chặng sáng dần, xong có "Xem lại"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-workers');
    const fig = page.locator('section[aria-labelledby="worker-money"] figure');
    const lit = fig.locator('.flow-node.is-lit');
    const again = replayButton(fig);

    await fig.scrollIntoViewIfNeeded();
    // IntersectionObserver bắn → về trạng thái đầu (chưa chặng nào sáng).
    await expect(lit).toHaveCount(0);
    await expect(again).toBeHidden();

    // Mốc chặng n = 250 + (n − 1) × 1100 ms → ở 1400 ms: 2 chặng sáng.
    await page.clock.runFor(1_400);
    await expect(lit).toHaveCount(2);
    await expect(again).toBeHidden();

    // Tổng 250 + 4 × 1100 + 400 = 5050 ms.
    await page.clock.runFor(4_000);
    await expect(lit).toHaveCount(5);
    await expect(again).toBeVisible();
    await expect(fig.locator('ol > li').nth(3)).toContainText('+180.000 đ');

    // "Xem lại" chạy lại từ đầu.
    await again.click();
    await expect(lit).toHaveCount(0);
    await expect(again).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// /for-employers
// ---------------------------------------------------------------------------

test.describe('/for-employers bản 03/10', () => {
  test('thứ tự khối; "Tiền của bạn đi đâu?" đã bỏ; khối giá (gộp /pricing) sau khối tiền; thẻ hồ sơ mới', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');

    const order = await main
      .locator('section[aria-labelledby]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby') ?? ''));
    const idx = (id: string) => order.indexOf(id);
    for (const id of [
      'employer-benefits',
      'employer-how',
      'employer-money',
      'employer-verify',
      'employer-applicants',
      'employer-control',
      'employer-payments',
      'employer-pricing',
      'employer-reviews',
      'employer-faq',
      'employer-assistant',
      'employer-help',
    ]) {
      expect(idx(id), `có khối ${id} (thứ tự: ${order.join(', ')})`).toBeGreaterThanOrEqual(0);
    }
    // 03/10: 3 thẻ lợi ích có ảnh là khối đầu tiên sau hero, trước "Từ lúc đăng ca…".
    expect(idx('employer-benefits'), order.join(', ')).toBe(0);
    expect(idx('employer-how')).toBe(1);
    expect(idx('employer-how')).toBeLessThan(idx('employer-money'));
    expect(idx('employer-money')).toBeLessThan(idx('employer-verify'));
    expect(idx('employer-verify')).toBeLessThan(idx('employer-control'));
    // 03/10: duyệt người (gộp từ /employer/applicants-guide) trước các tính năng kiểm soát;
    // "Tiền của một ca đi về đâu?" (gộp từ /employer/payments) ngay sau, rồi tới "Đánh giá
    // hai chiều sau mỗi ca"; khối "An toàn và hỗ trợ" sau FAQ (chi tiết ở e2e/36).
    expect(idx('employer-applicants')).toBe(idx('employer-verify') + 1);
    expect(idx('employer-control')).toBe(idx('employer-applicants') + 1);
    expect(idx('employer-payments')).toBe(idx('employer-control') + 1);
    // 03/10 (lần 4): khối "Phí dịch vụ" (#employer-pricing, gộp từ /pricing) nằm giữa
    // khối tiền và khối đánh giá (chi tiết ở e2e/43).
    expect(idx('employer-pricing')).toBe(idx('employer-payments') + 1);
    expect(idx('employer-reviews')).toBe(idx('employer-pricing') + 1);
    expect(idx('employer-faq')).toBeLessThan(idx('employer-help'));
    // 04/10: minh hoạ trợ lý theo câu hỏi nhà tuyển dụng, giữa FAQ và "An toàn và hỗ trợ".
    expect(idx('employer-assistant')).toBe(idx('employer-faq') + 1);
    expect(idx('employer-help')).toBe(idx('employer-assistant') + 1);

    await expect(
      main.getByRole('heading', { level: 2, name: 'Một ca tốn bao nhiêu?', exact: true }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { level: 2, name: 'Xác thực tài khoản trước ca đầu tiên', exact: true }),
    ).toBeVisible();
    await expect(stepBar(playground(page), 'Các bước đăng một ca')).toBeVisible();

    // Đã bỏ: "Tiền của bạn đi đâu?". Khối giá bản cũ ("0đ" viết liền) không
    // quay lại; khối giá mới (#employer-pricing) có đúng một tiêu đề, tiền ghi "0 đ".
    await expect(main.locator('section[aria-labelledby="employer-pricing"]')).toHaveCount(1);
    await expect(main.locator('#employer-pricing')).toHaveText('Giai đoạn thử nghiệm: 0 đ');
    await expect(main.getByText('0đ', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Tiền của bạn đi đâu?', { exact: true })).toHaveCount(0);

    // "Bạn nắm được mọi thứ trong ca": còn 4 điều (03/10 bỏ 2 điều đã có ở khối duyệt người).
    const control = main.locator('section[aria-labelledby="employer-control"]');
    await expect(control.locator('li h3')).toHaveText([
      'Trạng thái ca rõ ràng',
      'Lịch tuyển dụng',
      'Đăng lại ca cũ',
      'Ví có lịch sử',
    ]);
  });

  // Kịch bản ShiftPostPlayground (mốc ghi lúc BẮT ĐẦU; mỗi ô = ký tự × charMs + 260):
  // tiêu đề 0–1195, loại việc –1840, ngày –2590, địa điểm –3700, giờ bắt đầu –4235,
  // giờ kết thúc –4770, lương –5360, số người 5360–5675, mô tả –7071, yêu cầu –8323,
  // người phụ trách –9158; press 9158, posted 9858 (bước 2), a1 10758, a2 11308,
  // a3 11858, ap1 12458, ap2 12908, ap3 13358, day 14458 (bước 3), d1 14858, d2 15358,
  // d3 15858, d4 16358, hết 16758 ms.
  test('ShiftPostPlayground tự chạy khi cuộn tới: bước 1 điền ca → bước 2 tuyển người → bước 3 ngày làm; xong thì bấm được từng bước', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-employers');
    const fig = playground(page);
    const bar = stepBar(fig, 'Các bước đăng một ca');
    const heading = fig.getByText('Đăng ca mới', { exact: true });
    // Tên ca còn có ở bước 2 (ẩn) → chỉ xét ô "Tên ca làm" của bước 1.
    const title = stageAt(fig, 0).getByText('Phục vụ tiệc cưới', { exact: true });
    const total = row(fig, 'Tổng giữ từ ví');
    const applicants = applicantRows(fig);
    const items = timeline(fig);
    const again = replayButton(fig);

    await fig.scrollIntoViewIfNeeded();
    // IntersectionObserver bắn → bước 1, form trống, chưa có tổng.
    await expect(currentStep(bar)).toHaveText('1. Điền ca');
    await expect(bar.getByRole('button')).toHaveCount(0);
    await expect(heading).toBeVisible();
    await expect(title).toHaveCount(0);
    await expect(total).toHaveText('Chưa tính');
    await expect(again).toBeHidden();

    // 1500 ms: đã gõ xong tiêu đề, giờ / lương chưa tới.
    await page.clock.runFor(1_500);
    await expect(title).toBeVisible();
    await expect(fig.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('');
    await expect(total).toHaveText('Chưa tính');

    // 6000 ms: đã gõ xong "3" người (5360–5675) → có tổng, ví đủ; vẫn ở bước 1.
    await page.clock.runFor(4_500);
    await expect(fig.getByLabel('Lương theo giờ (đ)', { exact: true })).toHaveValue('45.000');
    await expect(fig.getByLabel('Số lượng người cần', { exact: true })).toHaveValue('3');
    await expect(total).toHaveText('675.000 đ');
    await expect(fig).toContainText('Số dư hiện tại: 2.000.000 đ');
    await expect(fig.getByText('Đủ để giữ', { exact: true })).toBeVisible();
    await expect(currentStep(bar)).toHaveText('1. Điền ca');

    // 10300 ms: đã "đăng" (9858) → bước 2; chưa có người ứng tuyển (10758).
    await page.clock.runFor(4_300);
    await expect(currentStep(bar)).toHaveText('2. Tuyển người');
    await expect(heading).toBeHidden();
    await expect(fig.getByText('Đang tuyển', { exact: true })).toBeVisible();
    await expect(fig.getByText('Ví của bạn (mô phỏng)', { exact: true })).toBeVisible();
    await expect(fig.getByText('−675.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('1.325.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('Người lao động thấy ca của bạn như sau:', { exact: true })).toBeVisible();
    await expect(fig.getByText('225.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('mỗi người', { exact: true })).toBeVisible();
    await expect(fig.getByText('0/3 người đã duyệt', { exact: true })).toBeVisible();
    await expect(applicants).toHaveCount(0);

    // 13200 ms: 3 người ứng tuyển (a1–a3), đã duyệt 2 (ap2 12908), chưa người 3 (13358).
    await page.clock.runFor(2_900);
    await expect(applicants).toHaveCount(3);
    await expect(fig.getByText('2/3 người đã duyệt', { exact: true })).toBeVisible();
    await expect(applicants.nth(0)).toContainText('Minh Anh');
    await expect(applicants.nth(0)).toContainText(/★\s4,8 · 12 đánh giá/);
    await expect(applicants.nth(0).getByText('Đã duyệt', { exact: true })).toBeVisible();
    await expect(applicants.nth(1)).toContainText('Quốc Bảo');
    await expect(applicants.nth(1).getByText('Đã duyệt', { exact: true })).toBeVisible();
    await expect(applicants.nth(2)).toContainText('Thu Hà');
    await expect(applicants.nth(2).getByText('Duyệt', { exact: true })).toBeVisible();
    await expect(fig).toContainText('Sửa ca được tới 17:00 hôm trước. Huỷ được tới 11:00 (6 giờ trước ca)');
    await expect(fig.getByRole('button', { name: '← Sửa lại' })).toHaveCount(0);

    // 14600 ms: bước 3 (day 14458), chưa mốc nào sáng (d1 14858).
    await page.clock.runFor(1_400);
    await expect(currentStep(bar)).toHaveText('3. Ngày làm & sau ca');
    await expect(fig.getByText('Đang tuyển', { exact: true })).toBeHidden();
    await expect(items).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) await expect(items.nth(i)).toHaveClass(/opacity-30/);

    // 15500 ms: d1 (14858), d2 (15358) sáng; d3 (15858) chưa.
    await page.clock.runFor(900);
    await expect(items.nth(0)).toHaveClass(/opacity-100/);
    await expect(items.nth(1)).toHaveClass(/opacity-100/);
    await expect(items.nth(2)).toHaveClass(/opacity-30/);
    await expect(again).toBeHidden();

    // 16900 ms: hết kịch bản — mọi mốc sáng, "Xem lại", thanh bước thành nút.
    await page.clock.runFor(1_400);
    for (let i = 0; i < 4; i += 1) await expect(items.nth(i)).toHaveClass(/opacity-100/);
    await expect(again).toBeVisible();
    await expect(bar.getByRole('button')).toHaveCount(3);
    await expect(stepButton(bar, 'Ngày làm & sau ca')).toHaveAttribute('aria-current', 'step');
    await expect(fig.getByRole('button', { name: '← Tuyển người' })).toBeVisible();

    // Thanh bước → "Tuyển người": đủ 3/3, có "← Sửa lại" và "Tiếp: ngày làm →".
    await stepButton(bar, 'Tuyển người').click();
    await expect(fig.getByText('3/3 người đã duyệt', { exact: true })).toBeVisible();
    await fig.getByRole('button', { name: '← Sửa lại' }).click();
    await expect(heading).toBeVisible();
    await expect(fig.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('17:00');
    await fig.getByRole('button', { name: 'Giữ tiền và đăng ca' }).click();
    await expect(currentStep(bar)).toHaveText('2. Tuyển người');
    await fig.getByRole('button', { name: 'Tiếp: ngày làm →' }).click();
    await expect(currentStep(bar)).toHaveText('3. Ngày làm & sau ca');
    await fig.getByRole('button', { name: '← Tuyển người' }).click();
    await expect(currentStep(bar)).toHaveText('2. Tuyển người');

    // "Xem lại" gõ lại từ đầu.
    await again.click();
    await expect(currentStep(bar)).toHaveText('1. Điền ca');
    await expect(title).toHaveCount(0);
    await expect(total).toHaveText('Chưa tính');
    await expect(bar.getByRole('button')).toHaveCount(0);
  });

  test('ShiftPostPlayground: chạm vào ô giờ giữa chừng → dừng kịch bản, ở lại bước 1 với số ví dụ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-employers');
    const fig = playground(page);
    const bar = stepBar(fig, 'Các bước đăng một ca');
    const start = fig.getByLabel('Giờ bắt đầu', { exact: true });

    await fig.scrollIntoViewIfNeeded();
    await expect(row(fig, 'Tổng giữ từ ví')).toHaveText('Chưa tính');
    await page.clock.runFor(2_000);
    await expect(start).toHaveValue('');

    await start.click();
    // Dừng = nhảy tới cuối kịch bản nhưng giữ bước 1: form đủ số ví dụ, thanh bước bấm được.
    await expect(currentStep(bar)).toHaveText('1. Điền ca');
    await expect(start).toHaveValue('17:00');
    await expect(row(fig, 'Tổng giữ từ ví')).toHaveText('675.000 đ');
    await expect(bar.getByRole('button')).toHaveCount(3);
    // Đồng hồ chạy tiếp cũng không tự sang bước 2.
    await page.clock.runFor(9_000);
    await expect(fig.getByText('Đăng ca mới', { exact: true })).toBeVisible();
    await expect(currentStep(bar)).toHaveText('1. Điền ca');
  });

  test('VerifyPreview giữa chừng: đã gửi mã, chưa nhập mã, chưa "Đang chờ duyệt"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/for-employers');
    const section = page.locator('#employer-verify').locator('xpath=ancestor::section[1]');
    const fig = section.locator('figure');
    const sent = fig.getByText('Đã gửi mã tới 0987 654 321. Mã có hiệu lực 5 phút.', { exact: true });
    const again = replayButton(fig);

    await fig.scrollIntoViewIfNeeded();
    // IntersectionObserver bắn → thẻ trống: dòng "đã gửi mã" ẩn (giữ chỗ).
    await expect(sent).toBeHidden();
    await expect(fig.getByText('0987 654 321', { exact: true })).toHaveCount(0);

    // SĐT 12 ký tự = 920 ms rồi mốc "sent"; mã OTP bắt đầu ở 1670 ms.
    await page.clock.runFor(1_200);
    await expect(fig.getByText('0987 654 321', { exact: true })).toBeVisible();
    await expect(sent).toBeVisible();
    await expect(fig.getByText('482915', { exact: true })).toHaveCount(0);
    await expect(fig.getByText('Chưa xác thực', { exact: true })).toBeVisible();
    await expect(fig.getByText('Đã xác thực', { exact: true })).toHaveCount(0);
    await expect(fig.getByText('Đang chờ duyệt', { exact: true })).toHaveCount(0);
    await expect(fig.getByText('CCCD của bạn đang chờ quản trị viên duyệt.', { exact: true })).toBeHidden();
    await expect(again).toBeHidden();

    // Tổng kịch bản 7105 ms.
    await page.clock.runFor(6_500);
    await expect(fig.getByText('Đã xác thực', { exact: true })).toBeVisible();
    await expect(fig.getByText('Đang chờ duyệt', { exact: true })).toBeVisible();
    await expect(fig.getByText('Trần Thu Hà', { exact: true })).toBeVisible();
    await expect(again).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Giảm chuyển động: trạng thái cuối hiện sẵn + sửa số trong form thử
// ---------------------------------------------------------------------------

test.describe('Trang vai trò — giảm chuyển động (trạng thái cuối)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('PayoutTimeline: 5 chặng sáng sẵn, đủ nhãn + số, không có "Xem lại"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    const section = page.locator('section[aria-labelledby="worker-money"]');
    await expect(section.getByRole('heading', { level: 2, name: 'Tiền về tay bạn khi nào?' })).toBeVisible();
    const fig = section.locator('figure');
    const stops = fig.locator('ol > li');
    await expect(stops).toHaveCount(5);
    const expected: Array<[string, string]> = [
      ['Nhà tuyển dụng giữ tiền', '180.000 đ'],
      ['Bạn làm ca', '4 giờ'],
      ['Xác nhận hoàn thành', '✓'],
      ['Vào ví CaLẻ của bạn', '+180.000 đ'],
      ['Rút về ngân hàng', 'Chưa có'],
    ];
    for (const [i, [label, chip]] of expected.entries()) {
      await expect(stops.nth(i)).toContainText(label);
      const chipEl = stops.nth(i).locator('.flow-node > span').last();
      await expect(chipEl, label).toHaveText(chip);
      await expect(chipEl, label).toHaveCSS('opacity', '1');
      await expect(stops.nth(i).locator('.flow-node'), label).toHaveClass(/is-lit/);
    }
    await expect(fig.getByText('Bản demo chưa rút được tiền thật', { exact: true })).toBeVisible();
    await expect(fig.getByText('Ví dụ: ca 4 giờ × 45.000 đ (mô phỏng).', { exact: true })).toBeVisible();
    await expect(replayButton(fig)).toBeHidden();
    // Hai ô cũ không còn.
    await expect(page.getByText('Tiền công của bạn', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Phí của bạn', { exact: true })).toHaveCount(0);
  });

  test('ApplyPreview: hiện sẵn bước 3 "Sau khi ứng tuyển", mọi mốc sáng; thanh bước bấm được', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    const section = page.locator('#worker-apply').locator('xpath=ancestor::section[1]');
    // Da `.public-skin` (03/10): tông xen kẽ lại sau khi chèn "Ca đang tuyển" và đưa thẻ lợi
    // ích lên đầu → khối nhận ca nền "paper" (bảng tông đầy đủ: e2e/42).
    await expect(section).toHaveAttribute('data-tone', 'paper');
    const fig = applyFig(page);
    const bar = stepBar(fig, 'Các bước nhận một ca');
    const [search, detail, after] = [0, 1, 2].map((i) => applyStage(fig, i));

    await expect(bar.getByRole('button')).toHaveCount(3);
    await expect(stepButton(bar, 'Sau khi ứng tuyển')).toHaveAttribute('aria-current', 'step');
    await expect(search).toBeHidden();
    await expect(detail).toBeHidden();
    await expect(after).toBeVisible();
    await expect(after.locator('span.rounded-full', { hasText: 'Đã ứng tuyển' })).toBeVisible();
    await expect(after).toContainText('Phục vụ quán cà phê');

    const items = timeline(after);
    const expected: Array<[string, string]> = [
      ['Bây giờ', 'Đã ứng tuyển'],
      ['Khi được duyệt', 'Đã được duyệt'],
      ['06:45–07:15', 'Check-in tại quán'],
      ['11:00', 'Check-out'],
      ['Sau ca', 'Nhận tiền'],
      ['14 ngày', 'Đánh giá'],
    ];
    await expect(items).toHaveCount(expected.length);
    for (const [i, [time, label]] of expected.entries()) {
      await expect(items.nth(i).locator(':scope > span').first(), label).toHaveText(time);
      await expect(items.nth(i), label).toContainText(label);
      await expect(items.nth(i), label).toHaveClass(/opacity-100/);
    }
    await expect(items.nth(4)).toContainText('+180.000 đ');
    await expect(items.nth(4)).toContainText('Nhà tuyển dụng xác nhận là tiền được ghi vào ví (mô phỏng).');
    await expect(replayButton(fig)).toBeHidden();

    // Bấm từng bước: chi tiết (có đánh giá quán, quy định huỷ) rồi danh sách tìm.
    await stepButton(bar, 'Xem chi tiết').click();
    await expect(detail).toBeVisible();
    await expect(after).toBeHidden();
    await expect(detail.getByText('Tiền công cả ca', { exact: true })).toBeVisible();
    await expect(detail.getByText('45.000 đ/giờ · 4 giờ', { exact: true })).toBeVisible();
    await expect(detail.getByText('Người phụ trách tại chỗ', { exact: true })).toBeVisible();
    await expect(detail.getByText('Anh Tuấn, quản lý quán', { exact: true })).toBeVisible();
    await expect(detail).toContainText('4,7 · 12 đánh giá về quán');
    await expect(detail).toContainText('“Chủ quán dễ chịu, chỉ việc rõ ràng, trả đúng giờ.”');
    await expect(detail).toContainText('Tự huỷ được tới 04:00 (3 giờ trước ca); sau đó cần nhà tuyển dụng đồng ý.');
    await stepButton(bar, 'Tìm ca').click();
    await expect(search).toBeVisible();
    const rows = search.locator('ul > li');
    await expect(rows).toHaveCount(2);
    await expect(search.getByText('phục vụ', { exact: true })).toBeVisible();
    await expect(rows.nth(0)).toContainText('180.000 đ');
    await expect(rows.nth(1)).toContainText('200.000 đ');
    await expect(fig).not.toContainText(/VNĐ|₫/);
  });

  for (const c of [
    { path: '/for-workers', id: 'worker-verify', phone: '0912 345 678', name: 'Nguyễn Minh Anh', heading: 'Xác thực một lần trước ca đầu tiên' },
    { path: '/for-employers', id: 'employer-verify', phone: '0987 654 321', name: 'Trần Thu Hà', heading: 'Xác thực tài khoản trước ca đầu tiên' },
  ]) {
    test(`VerifyPreview ${c.path}: hiện sẵn bước cuối (đã xác thực SĐT, CCCD chờ duyệt)`, async ({
      page,
      seedState,
      gotoApp,
    }) => {
      await page.setViewportSize(DESKTOP);
      await seedState(buildSnapshot());
      await gotoApp(c.path);
      const section = page.locator(`#${c.id}`).locator('xpath=ancestor::section[1]');
      await expect(section.getByRole('heading', { level: 2, name: c.heading })).toBeVisible();
      const fig = section.locator('figure');
      for (const text of [
        c.phone,
        `Đã gửi mã tới ${c.phone}. Mã có hiệu lực 5 phút.`,
        '482915',
        'Đã xác thực',
        c.name,
        '0123 4567 8901',
        'Đang chờ duyệt',
        'CCCD của bạn đang chờ quản trị viên duyệt.',
      ]) {
        await expect(fig.getByText(text, { exact: true }), text).toBeVisible();
      }
      await expect(fig.getByText('Chưa xác thực', { exact: true })).toHaveCount(0);
      const tiles = fig.locator('ul > li');
      await expect(tiles).toHaveCount(3);
      for (let i = 0; i < 3; i += 1) await expect(tiles.nth(i)).toHaveClass(/border-green-300/);
      await expect(replayButton(fig)).toBeHidden();
    });
  }

  test('ShiftPostPlayground: hiện sẵn bước 3 "Ngày làm & sau ca"; bước 1 đủ form + 675.000 đ (demo chưa thu phí)', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const fig = playground(page);
    const bar = stepBar(fig, 'Các bước đăng một ca');

    // Trạng thái cuối = bước 3, mọi mốc sáng; thanh bước là nút.
    await expect(bar.getByRole('button')).toHaveCount(3);
    await expect(stepButton(bar, 'Ngày làm & sau ca')).toHaveAttribute('aria-current', 'step');
    await expect(fig.getByText('Ngày làm & sau ca', { exact: true })).toBeVisible();
    await expect(fig.getByText('Phục vụ tiệc cưới · Thứ 7 tuần này', { exact: true })).toBeVisible();
    const items = timeline(fig);
    const expected: Array<[string, string]> = [
      ['16:45–17:15', 'Check-in'],
      ['17:00–22:00', 'Ca diễn ra'],
      ['22:00', 'Xác nhận hoàn thành'],
      ['14 ngày', 'Đánh giá'],
    ];
    await expect(items).toHaveCount(expected.length);
    for (const [i, [time, label]] of expected.entries()) {
      await expect(items.nth(i).locator(':scope > span').first(), label).toHaveText(time);
      await expect(items.nth(i), label).toContainText(label);
      await expect(items.nth(i), label).toHaveClass(/opacity-100/);
    }
    await expect(items.nth(2)).toContainText('Bạn bấm xác nhận là tiền công được ghi vào ví người làm (mô phỏng).');
    const absent = fig.getByRole('checkbox', { name: 'Giả sử 1 người không đến' });
    await expect(absent).not.toBeChecked();
    await expect(row(fig, 'Trả người đã làm')).toHaveText('675.000 đ');
    // Dòng hoàn giữ chỗ (ẩn) khi không ai vắng.
    await expect(fig.getByText('Hoàn về ví của bạn', { exact: true })).toBeHidden();
    await expect(fig.getByRole('button', { name: '← Tuyển người' })).toBeVisible();
    await expect(replayButton(fig)).toBeHidden();
    // Chỉ bước đang xem hiện ra: form và danh sách ứng tuyển ở bước ẩn (invisible + inert).
    await expect(fig.getByText('Đăng ca mới', { exact: true })).toBeHidden();
    await expect(fig.getByText('Người ứng tuyển', { exact: true })).toBeHidden();
    for (const i of [0, 1]) {
      await expect(stageAt(fig, i)).toHaveAttribute('aria-hidden', 'true');
      await expect(stageAt(fig, i)).toHaveAttribute('inert', '');
    }

    // Bước 2: ví đã trừ, thẻ ca như người lao động thấy, đủ 3/3 người đã duyệt.
    await stepButton(bar, 'Tuyển người').click();
    await expect(fig.getByText('Đang tuyển', { exact: true })).toBeVisible();
    await expect(fig.getByText('Ví của bạn (mô phỏng)', { exact: true })).toBeVisible();
    await expect(fig.getByText('−675.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('1.325.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('225.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('3/3 người đã duyệt', { exact: true })).toBeVisible();
    const applicants = applicantRows(fig);
    await expect(applicants).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) await expect(applicants.nth(i).getByText('Đã duyệt', { exact: true })).toBeVisible();
    await expect(fig.getByRole('button', { name: '← Sửa lại' })).toBeVisible();
    await expect(fig.getByRole('button', { name: 'Tiếp: ngày làm →' })).toBeVisible();

    // Bước 1: form đủ thông tin ví dụ, bảng tiền, số dư ví đủ.
    await stepButton(bar, 'Điền ca').click();
    await expect(fig.getByText('Đăng ca mới', { exact: true })).toBeVisible();
    const form = stageAt(fig, 0);
    for (const text of [
      'Phục vụ tiệc cưới',
      'Thứ 7 tuần này',
      'Nhà hàng tiệc cưới, Quận 3, TP.HCM',
      'Bưng món, dọn bàn cho tiệc 40 bàn; làm theo hướng dẫn của quản lý sảnh.',
      'Áo sơ mi trắng, quần đen, giày kín mũi. Không cần kinh nghiệm.',
      'Chị Hạnh, quản lý sảnh',
    ]) {
      // Ô nhiều dòng có bản sao ẩn (aria-hidden) giữ chiều cao → chỉ xét bản đang hiện.
      await expect(form.getByText(text, { exact: true }).filter({ visible: true }), text).toBeVisible();
    }
    for (const label of ['Tên ca làm', 'Loại công việc', 'Ngày làm', 'Địa điểm', 'Mô tả công việc', 'Yêu cầu', 'Người phụ trách tại chỗ']) {
      await expect(form.getByText(label, { exact: true }), label).toBeVisible();
    }
    await expect(fig.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('17:00');
    await expect(fig.getByLabel('Giờ kết thúc', { exact: true })).toHaveValue('22:00');
    await expect(fig.getByLabel('Lương theo giờ (đ)', { exact: true })).toHaveValue('45.000');
    await expect(fig.getByLabel('Số lượng người cần', { exact: true })).toHaveValue('3');
    await expect(row(fig, 'Tiền công')).toHaveText('675.000 đ');
    await expect(fig.getByText('3 × 5 giờ × 45.000 đ', { exact: true })).toBeVisible();
    await expect(row(fig, 'Phí dịch vụ')).toHaveText('Bản demo chưa thu phí');
    await expect(fig.getByText('Tổng giữ từ ví (mô phỏng)', { exact: true })).toBeVisible();
    await expect(row(fig, 'Tổng giữ từ ví')).toHaveText('675.000 đ');
    await expect(fig).toContainText('Số dư hiện tại: 2.000.000 đ');
    await expect(fig.getByText('Đủ để giữ', { exact: true })).toBeVisible();
    await expect(fig.getByRole('button', { name: 'Giữ tiền và đăng ca' })).toBeEnabled();
    await expect(fig).not.toContainText(/VNĐ|₫/);
  });

  test('ShiftPostPlayground: sửa số người / lương / giờ, thiếu tiền ví thì không đăng được, nhập sai giờ; giả sử 1 người vắng ở bước 3', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const fig = playground(page);
    const bar = stepBar(fig, 'Các bước đăng một ca');
    await stepButton(bar, 'Điền ca').click();

    const total = row(fig, 'Tổng giữ từ ví');
    const people = fig.getByLabel('Số lượng người cần', { exact: true });
    const wage = fig.getByLabel('Lương theo giờ (đ)', { exact: true });
    const start = fig.getByLabel('Giờ bắt đầu', { exact: true });
    const end = fig.getByLabel('Giờ kết thúc', { exact: true });
    const post = fig.getByRole('button', { name: 'Giữ tiền và đăng ca' });
    const enough = fig.getByText('Đủ để giữ', { exact: true });
    const hint = fig.getByText('Nhập giờ kết thúc sau giờ bắt đầu, lương và số người để tính.', { exact: true });

    // 12 người × 5 giờ × 45.000 đ = 2.700.000 đ > số dư 2.000.000 đ → thiếu, không đăng được.
    await people.fill('12');
    await expect(total).toHaveText('2.700.000 đ');
    await expect(
      fig.getByText('Thiếu 700.000 đ: ca được lưu nháp, nạp thêm rồi đăng', { exact: true }),
    ).toBeVisible();
    await expect(enough).toHaveCount(0);
    await expect(post).toBeDisabled();

    // 5 người → đủ.
    await people.fill('5');
    await expect(total).toHaveText('1.125.000 đ');
    await expect(fig.getByText('5 × 5 giờ × 45.000 đ', { exact: true })).toBeVisible();
    await expect(enough).toBeVisible();
    await expect(post).toBeEnabled();

    // Lương gõ không dấu chấm → tự định dạng.
    await wage.fill('60000');
    await expect(wage).toHaveValue('60.000');
    await expect(total).toHaveText('1.500.000 đ');

    // Giờ gõ "1730" → "17:30"; 17:30–22:00 = 4,5 giờ.
    await start.fill('1730');
    await expect(start).toHaveValue('17:30');
    await expect(fig.getByText('5 × 4,5 giờ × 60.000 đ', { exact: true })).toBeVisible();
    await expect(total).toHaveText('1.350.000 đ');
    await expect(hint).toHaveCount(0);

    // Giờ kết thúc trước giờ bắt đầu → không tính, có gợi ý, không có dòng ví, không đăng được.
    await end.fill('1600');
    await expect(end).toHaveValue('16:00');
    await expect(total).toHaveText('Chưa tính');
    await expect(row(fig, 'Tiền công')).toHaveText('Chưa tính');
    await expect(hint).toBeVisible();
    await expect(fig.getByText('Số dư hiện tại', { exact: false })).toHaveCount(0);
    await expect(post).toBeDisabled();

    // Sửa lại hợp lệ → có số trở lại; đăng → bước 2 theo số đã sửa.
    await end.fill('2200');
    await expect(total).toHaveText('1.350.000 đ');
    await expect(hint).toHaveCount(0);
    await post.click();
    await expect(currentStep(bar)).toHaveText('2. Tuyển người');
    await expect(fig.getByText('−1.350.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('650.000 đ', { exact: true })).toBeVisible();
    // Mỗi người: 4,5 giờ × 60.000 đ.
    await expect(fig.getByText('270.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('3/5 người đã duyệt', { exact: true })).toBeVisible();

    // Bước 3: giả sử 1 người không đến → trả 4 người, hoàn 1 phần.
    await fig.getByRole('button', { name: 'Tiếp: ngày làm →' }).click();
    await expect(currentStep(bar)).toHaveText('3. Ngày làm & sau ca');
    const absent = fig.getByRole('checkbox', { name: 'Giả sử 1 người không đến' });
    await expect(row(fig, 'Trả người đã làm')).toHaveText('1.350.000 đ');
    await expect(fig.getByText('Hoàn về ví của bạn', { exact: true })).toBeHidden();
    await absent.check();
    await expect(row(fig, 'Trả người đã làm')).toHaveText('1.080.000 đ');
    await expect(row(fig, 'Hoàn về ví của bạn')).toHaveText('+270.000 đ');
    await absent.uncheck();
    await expect(fig.getByText('Hoàn về ví của bạn', { exact: true })).toBeHidden();
    await expect(fig).not.toContainText(/VNĐ|₫/);
  });

  test('ShiftPostPlayground: số ví dụ (3 người) — 1 người vắng thì trả 450.000 đ, hoàn +225.000 đ', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');
    const fig = playground(page);
    const absent = fig.getByRole('checkbox', { name: 'Giả sử 1 người không đến' });
    await absent.check();
    await expect(row(fig, 'Trả người đã làm')).toHaveText('450.000 đ');
    await expect(row(fig, 'Hoàn về ví của bạn')).toHaveText('+225.000 đ');
    // Ô đánh dấu nằm ở bước 3: bấm thanh bước sang bước 1 rồi về 3 vẫn giữ lựa chọn.
    const bar = stepBar(fig, 'Các bước đăng một ca');
    await stepButton(bar, 'Điền ca').click();
    // Bước 3 ẩn (aria-hidden) → ô đánh dấu ra khỏi cây truy cập.
    await expect(absent).toHaveCount(0);
    await stepButton(bar, 'Ngày làm & sau ca').click();
    await expect(absent).toBeChecked();
    await expect(row(fig, 'Hoàn về ví của bạn')).toHaveText('+225.000 đ');
  });

  for (const path of ['/for-workers', '/for-employers']) {
    test(`${path}: không có "VNĐ" / "₫"; 375px không cuộn ngang`, async ({ page, seedState, gotoApp }) => {
      await page.setViewportSize(MOBILE);
      await seedState(buildSnapshot());
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const main = page.locator('main');
      await expect(main).not.toContainText(/VNĐ|₫/);
      // Minh hoạ ở trạng thái cuối (rộng nhất); cuộn qua từng minh hoạ rồi đo.
      for (const fig of await main.locator('figure').all()) {
        await fig.scrollIntoViewIfNeeded();
        const box = await fig.boundingBox();
        if (box) expect(box.x + box.width, 'minh hoạ vừa khung 375px').toBeLessThanOrEqual(MOBILE.width + 0.5);
      }
      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.doc).toBeLessThanOrEqual(MOBILE.width);
      expect(widths.body).toBeLessThanOrEqual(MOBILE.width);
    });
  }
});
