import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Minh hoạ landing — các vòng KHÔNG suôn sẻ (03/10, `landingSamples.ts`).
 *
 * Ba minh hoạ đọc chung 8 ca mẫu, mỗi vòng sang ca kế tiếp (`sampleShift(offset, round)`):
 * biên nhận trang chủ offset 0, nhà tuyển dụng offset 1, người lao động offset 2.
 *   - Ca 3 "Kiểm hàng kho", ca 6 "Phát tờ rơi khai trương": có `cancelReason`.
 *   - Ca 4 "Hỗ trợ sự kiện ra mắt" (4 người), ca 7 "Phục vụ nhà hàng buffet": `noShow: 1`.
 *   - Ca 5 "Thu ngân siêu thị mini": `workerNotSelected`.
 * Bản demo (local): giữ = tiền công, không phí (`sampleLedger(shift, false)`).
 *
 * Hẹn giờ: `usePlayback` dùng setTimeout theo bước, chỉ chạy khi khối trong khung nhìn
 * (IntersectionObserver chạy theo khung hình thật). Đồng hồ được DỪNG trước khi vào trang;
 * hẹn giờ của bước đầu đặt xong (sau hydrate + IntersectionObserver) thì khối có
 * `data-playback="running"` — chờ mốc đó rồi chạy đúng thời lượng bước đầu tới chuyển bước
 * đầu tiên (mốc đồng bộ S, chính xác vì đồng hồ đứng yên tới lúc đó); từ S mọi bước sau
 * tính bằng tổng thời lượng các bước + 300 ms đệm (bước ngắn nhất 1100 ms).
 * Cho đồng hồ trôi bằng `advance` (fastForward từng 100 ms), không `runFor`: `runFor` chạy
 * từng khung hình 16 ms của mọi vòng requestAnimationFrame trên trang (vd vòng xoay việc
 * làm trang chủ), ~1 giây thật cho mỗi giây giả khi máy bận → vượt 30 giây của test.
 * Số dư ví đếm lên bằng requestAnimationFrame (cũng theo đồng hồ giả) → `runFor` thêm
 * 1000 ms (> 900 ms đếm) trước khi đọc số cuối.
 */

const DESKTOP = { width: 1440, height: 900 };
const MARGIN = 300;
/** Bước nhảy của `advance`: mọi thời lượng bước và đệm đều là bội của số này. */
const CHUNK = 100;

async function openPaused(
  page: Page,
  gotoApp: (p: string) => Promise<void>,
  seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>,
  path: string,
) {
  await page.setViewportSize(DESKTOP);
  await page.clock.install({ time: new Date(ANCHOR_ISO) });
  // Dừng đồng hồ trước khi tải trang: minh hoạ không tự chạy theo thời gian thật.
  await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 1_000));
  await seedState(buildSnapshot());
  await gotoApp(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/**
 * Chờ hẹn giờ bước đầu của minh hoạ được đặt (đồng hồ đang dừng nên chưa trôi ms nào),
 * rồi chạy đúng `firstStepMs` → mốc đồng bộ S ngay sau chuyển bước đầu tiên.
 */
async function syncToFirstStep(page: Page, fig: Locator, firstStepMs: number) {
  await expect(fig.locator('[data-playback="running"]')).toBeAttached();
  await advance(page, firstStepMs);
}

/**
 * Cho đồng hồ giả trôi `ms` bằng các lần fastForward 100 ms. fastForward chỉ gọi mỗi hẹn
 * giờ đến hạn một lần ở cuối bước nhảy; vì mốc đồng bộ và mọi thời lượng bước đều là bội
 * 100 ms nên hẹn giờ của minh hoạ luôn đến hạn ĐÚNG cuối một bước nhảy — không trễ, lịch
 * các bước sau không lệch.
 */
async function advance(page: Page, ms: number) {
  expect(ms % CHUNK, `${ms} ms phải là bội ${CHUNK} ms`).toBe(0);
  for (let done = 0; done < ms; done += CHUNK) await page.clock.fastForward(CHUNK);
}

/** Badge trạng thái ở đầu thẻ (Badge đầu tiên trong DOM, trước thanh bước ShiftJourney). */
function headerBadge(fig: Locator) {
  return fig.locator('span.inline-flex.rounded-full').first();
}

// ---------------------------------------------------------------------------
// Biên nhận trang chủ (offset 0, vòng 0 đứng ở "hoàn thành" 3800 ms)
// ---------------------------------------------------------------------------

/** Thời lượng một vòng thường / vòng huỷ của biên nhận. */
const RECEIPT_ROUND = 1700 + 1500 * 3 + 3800; // 10000
const RECEIPT_CANCELLED_ROUND = 1700 + 3800; // 5500

test.describe('Biên nhận trang chủ — vòng huỷ và vòng có người vắng', () => {
  test('vòng 3 huỷ: hoàn đủ; vòng 4 có 1 người vắng: trả 3 người, hoàn 1 phần', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await openPaused(page, gotoApp, seedState, '/');
    const receipt = page.locator('main figure.home-receipt');
    const title = receipt.locator('p.text-lg').first();
    const line = (target: string) => receipt.locator(`[data-receipt-line="${target}"]`);
    const badge = headerBadge(receipt);

    // Vòng 0 đứng ở "hoàn thành" (ca phụ bếp, 180.000 đ).
    await expect(title).toHaveText('Phụ bếp quán lẩu');
    await expect(badge).toHaveText('Đã hoàn thành');

    // S = đầu vòng 1 (Phục vụ tiệc cưới), 3800 ms sau bước "hoàn thành" của vòng 0.
    await syncToFirstStep(page, receipt, 3800);
    await expect(title).toHaveText('Phục vụ tiệc cưới');

    // Vòng 3 "Kiểm hàng kho" (2 người × 4 giờ × 38.000 đ = 304.000 đ giữ) — bước đăng ca.
    await advance(page, RECEIPT_ROUND * 2 + MARGIN);
    await expect(title).toHaveText('Kiểm hàng kho');
    await expect(badge).toHaveText('Đang tuyển');
    await expect(line('home-hold')).toContainText('304.000 đ');
    await expect(line('home-paid')).toContainText('—');
    await expect(line('home-paid')).toContainText('Khi ca được xác nhận, không trừ phí (mô phỏng)');
    await expect(receipt.getByText('Chốt sổ khi ca hoàn thành', { exact: true })).toBeVisible();
    await expect(receipt.getByText(/^Lý do huỷ:/)).toHaveCount(0);

    // 1700 ms sau → "Đã hủy" (tông danger), lý do huỷ, hoàn đủ.
    await advance(page, 1700);
    await expect(badge).toHaveText('Đã hủy');
    await expect(badge).toHaveClass(/bg-red-100/);
    await expect(receipt.getByText('Lý do huỷ: Lô hàng về trễ, kho dời lịch kiểm sang tuần sau.', { exact: true })).toBeVisible();
    await expect(line('home-hold')).toContainText('304.000 đ');
    await expect(line('home-hold')).toContainText('Từ ví nhà tuyển dụng: tiền công (mô phỏng)');
    await expect(line('home-paid')).toContainText('Ca bị huỷ trước giờ làm, không ai làm');
    await expect(line('home-paid')).toContainText('0 đ');
    await expect(line('home-paid')).not.toContainText('—');
    await expect(line('home-fee')).toContainText('Bản demo chưa thu phí');
    await expect(line('home-fee')).toContainText('0 đ');
    await expect(line('home-refund')).toContainText('Ca bị huỷ: hoàn đủ tiền đã giữ');
    await expect(line('home-refund')).toContainText('304.000 đ');
    await expect(receipt.getByText('0 + 0 + 304.000 = 304.000 đ', { exact: true })).toBeVisible();

    // Vòng 4 "Hỗ trợ sự kiện ra mắt" (4 người × 5 giờ × 50.000 đ = 1.000.000 đ, 1 người vắng).
    // Đang ở 300 ms vào bước huỷ (bắt đầu 1700 ms vào vòng 3) → 5500 − 1700 ms nữa là
    // đầu vòng 4 + 300 ms.
    await advance(page, RECEIPT_CANCELLED_ROUND - 1700);
    await expect(title).toHaveText('Hỗ trợ sự kiện ra mắt');
    await expect(badge).toHaveText('Đang tuyển');
    await expect(receipt.getByText(/^Lý do huỷ:/)).toHaveCount(0);
    await expect(line('home-hold')).toContainText('1.000.000 đ');
    await expect(line('home-refund')).toContainText('—');
    // Chưa chốt: mô tả vẫn là câu thường.
    await expect(line('home-refund')).toContainText('Ca đủ người, không ai vắng');

    // Bước "hoàn thành" (sau 1700 + 1500 × 3 ms): chỉ trả người đã làm, hoàn phần người vắng.
    await advance(page, 1700 + 1500 * 3);
    await expect(badge).toHaveText('Đã hoàn thành');
    await expect(badge).toHaveClass(/bg-green-100/);
    await expect(line('home-hold')).toContainText('1.000.000 đ');
    await expect(line('home-paid')).toContainText('Chỉ trả cho người đã làm');
    await expect(line('home-paid')).toContainText('750.000 đ');
    await expect(line('home-fee')).toContainText('Bản demo chưa thu phí');
    await expect(line('home-fee')).toContainText('0 đ');
    await expect(line('home-refund')).toContainText('1 người vắng mặt: hoàn phần của người đó');
    await expect(line('home-refund')).toContainText('250.000 đ');
    await expect(receipt.getByText('750.000 + 0 + 250.000 = 1.000.000 đ', { exact: true })).toBeVisible();
    await expect(receipt.getByText(/^Lý do huỷ:/)).toHaveCount(0);
    await expect(receipt).not.toContainText(/VNĐ|₫/);
  });
});

// ---------------------------------------------------------------------------
// Nhà tuyển dụng (/for-employers, offset 1)
// ---------------------------------------------------------------------------

test.describe('Minh hoạ nhà tuyển dụng — ca có người vắng mặt', () => {
  test('vòng 3: người cuối "Vắng mặt", trả 3 người, hoàn 250.000 đ về ví', async ({ page, seedState, gotoApp }) => {
    await openPaused(page, gotoApp, seedState, '/for-employers');
    const fig = page.locator('figure').filter({ hasText: 'Minh hoạ giao diện quản lý ca' });
    const title = fig.locator('p.text-lg').first();
    const badge = headerBadge(fig);
    const wallet = fig.getByText('Ví của bạn', { exact: true }).locator('..');
    const rows = fig.locator('ul > li');

    // Vòng 0: Phục vụ tiệc cưới (3 người × 5 giờ × 80.000 đ = 1.200.000 đ), đang trừ ví.
    await expect(title).toHaveText('Phục vụ tiệc cưới');
    await expect(wallet).toContainText('−1.200.000 đ');
    // S = bước duyệt người đầu tiên (chip trừ ví biến mất), 1900 ms sau đầu vòng 0.
    await syncToFirstStep(page, fig, 1900);
    await expect(wallet).not.toContainText('−');

    // Từ S: hết vòng 0 (11800 − 1900) + vòng 1 pha chế 1 người (9600) + vòng 2 huỷ (5100)
    // = 24600 → đầu vòng 3; tới "chờ xác nhận": 1900 + 3 × 1100 + 1700 = 6900.
    await advance(page, 24_600 + 6_900 + MARGIN);
    await expect(title).toHaveText('Hỗ trợ sự kiện ra mắt');
    await expect(badge).toHaveText('Chờ xác nhận');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Quốc Bảo');
    await expect(rows.nth(0)).toContainText('Đã duyệt');
    await expect(rows.nth(1)).toContainText('Đã duyệt');
    await expect(rows.nth(2)).toContainText('Gia Huy');
    const absent = rows.nth(2).locator('span.inline-flex.rounded-full');
    await expect(absent).toHaveText('Vắng mặt');
    await expect(absent).toHaveClass(/bg-red-100/);
    await expect(rows.nth(2)).not.toContainText('Đã duyệt');
    // Chưa xong ca: dải tiền vẫn là tiền đã giữ, ví chưa được hoàn.
    await expect(fig.getByText('Đã giữ từ ví', { exact: true })).toBeVisible();
    await expect(fig).toContainText('1.000.000 đ');
    await expect(fig.getByText(/^Hoàn .* về ví ·/)).toHaveCount(0);
    await expect(wallet).toContainText('3.800.000 đ');
    await expect(wallet).not.toContainText('+');

    // 1700 ms sau → hoàn thành; thêm 1000 ms cho số dư đếm lên xong.
    await advance(page, 1_700);
    await expect(badge).toHaveText('Đã hoàn thành');
    await page.clock.runFor(1_000);
    await expect(fig.getByText('Đã trả cho 3 người', { exact: true })).toBeVisible();
    await expect(fig.getByText('750.000 đ', { exact: true })).toBeVisible();
    await expect(fig.getByText('Hoàn 250.000 đ về ví · 1 người vắng mặt', { exact: true })).toBeVisible();
    await expect(rows.nth(2).locator('span.inline-flex.rounded-full')).toHaveText('Vắng mặt');
    await expect(wallet).toHaveClass(/border-green-300/);
    await expect(wallet.getByText('+250.000 đ', { exact: true })).toBeVisible();
    // 4.800.000 − 1.000.000 giữ + 250.000 hoàn.
    await expect(wallet).toContainText('4.050.000 đ');
    await expect(fig).not.toContainText(/VNĐ|₫/);
  });
});

// ---------------------------------------------------------------------------
// Người lao động (/for-workers, offset 2)
// ---------------------------------------------------------------------------

test.describe('Minh hoạ người lao động — ca bị huỷ và không được chọn', () => {
  test('vòng 1 / 4 bị huỷ, vòng 3 bị từ chối; ví đứng yên', async ({ page, seedState, gotoApp }) => {
    await openPaused(page, gotoApp, seedState, '/for-workers');
    const fig = page.locator('figure').filter({ hasText: 'Minh hoạ giao diện người lao động' });
    const title = fig.locator('p.text-lg').first();
    const badge = headerBadge(fig);
    const wallet = fig.getByText('Ví của bạn', { exact: true }).locator('..');
    const expectWalletUnchanged = async (amount: string) => {
      await expect(wallet).toContainText(amount);
      await expect(wallet).not.toContainText('+');
      await expect(wallet).not.toHaveClass(/border-green-300/);
    };

    // Vòng 0: Pha chế quán cà phê (07:00–11:00). S = bước check-in (1900 ms sau đầu vòng).
    await expect(title).toHaveText('Pha chế quán cà phê');
    const working = fig.getByText('Đang làm · kết thúc lúc 11:00', { exact: true });
    await syncToFirstStep(page, fig, 1900);
    await expect(working).toBeVisible();

    // Vòng 1 "Kiểm hàng kho": đầu vòng = S + (8500 − 1900).
    await advance(page, 6_600 + MARGIN);
    await expect(title).toHaveText('Kiểm hàng kho');
    await expect(badge).toHaveText('Đã duyệt');
    await expect(fig.getByText('Check-in', { exact: true })).toBeVisible();
    await expectWalletUnchanged('735.000 đ');

    // 1900 ms sau → nhà tuyển dụng huỷ.
    await advance(page, 1_900);
    await expect(badge).toHaveText('Đã hủy bởi nhà tuyển dụng');
    await expect(badge).toHaveClass(/bg-red-100/);
    await expect(fig.getByText('Lý do huỷ: Lô hàng về trễ, kho dời lịch kiểm sang tuần sau.', { exact: true })).toBeVisible();
    await expect(fig.getByText('Check-in', { exact: true })).toHaveCount(0);
    await expect(fig.getByText('Hoàn thành · tiền đã về ví', { exact: true })).toHaveCount(0);
    await expectWalletUnchanged('735.000 đ');

    // Vòng 3 "Thu ngân siêu thị mini": đang ở 300 ms vào bước huỷ (bắt đầu 1900 ms vào vòng 1)
    // → còn 5100 − 1900 − 300 của vòng 1, rồi vòng 2 thường 8500, rồi 300 ms đệm.
    await advance(page, 5_100 - 1_900 + 8_500);
    await expect(title).toHaveText('Thu ngân siêu thị mini');
    await expect(badge).toHaveText('Chờ duyệt');
    await expect(badge).toHaveClass(/bg-amber-100/);
    await expect(fig.getByText('Đã ứng tuyển · chờ nhà tuyển dụng duyệt', { exact: true })).toBeVisible();
    await expectWalletUnchanged('318.000 đ');

    await advance(page, 1_900);
    await expect(badge).toHaveText('Bị từ chối');
    await expect(fig.getByText('Nhà tuyển dụng đã chọn đủ người · xem ca khác', { exact: true })).toBeVisible();
    await expect(fig.getByText('Đã ứng tuyển · chờ nhà tuyển dụng duyệt', { exact: true })).toHaveCount(0);
    await expect(fig.getByText(/^Lý do huỷ:/)).toHaveCount(0);
    await expectWalletUnchanged('318.000 đ');

    // Vòng 4 "Phát tờ rơi khai trương" (huỷ vì mưa): đầu vòng + 300 ms sau 5100 − 1900 ms.
    await advance(page, 5_100 - 1_900);
    await expect(title).toHaveText('Phát tờ rơi khai trương');
    await expect(badge).toHaveText('Đã duyệt');
    await advance(page, 1_900);
    await expect(badge).toHaveText('Đã hủy bởi nhà tuyển dụng');
    await expect(fig.getByText('Lý do huỷ: Mưa lớn, cửa hàng lùi ngày khai trương.', { exact: true })).toBeVisible();
    await expectWalletUnchanged('890.000 đ');
    await expect(fig).not.toContainText(/VNĐ|₫/);
  });
});
