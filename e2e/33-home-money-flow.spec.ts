import { test, expect } from './fixtures/test';
import { buildSnapshot } from './fixtures/seed';
import { ANCHOR_ISO } from './fixtures/constants';
import type { Locator, Page } from '@playwright/test';

/**
 * Trang chủ — sơ đồ dòng tiền (`MoneyFlowDiagram`, 02/10) trong khối
 * `section[aria-labelledby="home-explain-title"]`, ngay trên bốn thẻ ①–④.
 *
 *   - `figure.money-flow[data-step]` 0..5. Thấy ≥ 45% (IntersectionObserver) → chạy MỘT
 *     lần: bước 1 sau 250 ms, rồi mỗi 1300 ms một bước tới 5 (setTimeout).
 *       1: "Ví nhà tuyển dụng" (−360.000 đ) + ① "CaLẻ giữ tiền" (360.000 đ)
 *       2: ② "Người lao động" (+180.000 đ)
 *       3: ③ "Phí CaLẻ" (+0 đ — demo chưa thu phí)
 *       4: ④ "Hoàn về ví nhà tuyển dụng" (+180.000 đ)
 *       5: xong → nút "Xem lại" hiện.
 *     Ô đã sáng có class `is-lit`; đường nối / nhánh đã tô có `is-on`.
 *   - Bước 1..4: khối cha có `data-flow-step` = bước (CSS tô thẻ #home-hold / -paid /
 *     -fee / -refund); bước 0 và 5 → bỏ thuộc tính. Kiểm thuộc tính, không kiểm màu.
 *   - Nút "Xem lại" luôn ở DOM nhưng `invisible` + disabled + aria-hidden tới bước 5;
 *     ấn → chạy lại từ 0. Hiện / ẩn nút KHÔNG được đổi vị trí cuộn (lỗi scroll
 *     anchoring đã sửa) → kiểm window.scrollY đứng yên suốt một lượt chạy + chạy lại.
 *   - Giảm chuyển động → bước 5 ngay, mọi ô sáng, không có nút, không data-flow-step.
 *   - Máy tính (≥ 1024px) xếp ngang; điện thoại 375px xếp dọc, không cuộn ngang.
 *
 * Hẹn giờ điều khiển bằng page.clock: cài trước khi vào trang, dừng đồng hồ trước khi
 * cuộn tới sơ đồ, rồi `runFor` từng bước.
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const STEP_MS = 1300;
const FIRST_MS = 250;

/** Năm ô theo thứ tự DOM: nguồn, ①, ②, ③, ④ — ô thứ i sáng từ bước LIT_FROM[i]. */
const LIT_FROM = [1, 1, 2, 3, 4];
const NODES = {
  vi: [
    { label: 'Ví nhà tuyển dụng', amount: '−360.000 đ' },
    { label: 'CaLẻ giữ tiền', amount: '360.000 đ' },
    { label: 'Người lao động', amount: '+180.000 đ' },
    { label: 'Phí CaLẻ', amount: '+0 đ' },
    { label: 'Hoàn về ví nhà tuyển dụng', amount: '+180.000 đ' },
  ],
  en: [
    { label: 'Employer wallet', amount: '−360.000 đ' },
    { label: 'CaLẻ holds the money', amount: '360.000 đ' },
    { label: 'Workers', amount: '+180.000 đ' },
    { label: 'CaLẻ fee', amount: '+0 đ' },
    { label: 'Back to the employer wallet', amount: '+180.000 đ' },
  ],
} as const;
const CAPTION = {
  vi: 'Ví dụ: ca 2 người × 4 giờ × 45.000 đ, một người vắng mặt (mô phỏng).',
  en: 'Example: a shift for 2 people × 4 hours × 45,000 đ, with one no-show (simulated).',
} as const;
const REPLAY = { vi: 'Xem lại', en: 'Replay' } as const;
/** Thẻ giải thích sáng theo bước 1..4. */
const CARD_FOR_STEP = ['home-hold', 'home-paid', 'home-fee', 'home-refund'];

function explainSection(page: Page) {
  return page.locator('main section[aria-labelledby="home-explain-title"]');
}
function flow(page: Page) {
  return explainSection(page).locator('figure.money-flow');
}
function replayButton(page: Page) {
  return flow(page).locator('figcaption button');
}

/** Kiểm trạng thái sơ đồ + khối cha + nút đúng với một bước. */
async function expectStep(page: Page, step: number, lang: 'vi' | 'en' = 'vi') {
  const fig = flow(page);
  await expect(fig).toHaveAttribute('data-step', String(step));

  const nodes = fig.locator('.flow-node');
  await expect(nodes).toHaveCount(5);
  for (const [i, from] of LIT_FROM.entries()) {
    const node = nodes.nth(i);
    const lit = step >= from;
    if (lit) await expect(node, `ô ${i} sáng ở bước ${step}`).toHaveClass(/(^|\s)is-lit(\s|$)/);
    else await expect(node, `ô ${i} chưa sáng ở bước ${step}`).not.toHaveClass(/(^|\s)is-lit(\s|$)/);
    // Số tiền chỉ đọc được (không aria-hidden) khi ô đã sáng.
    const amount = node.locator('> span').last();
    await expect(amount).toHaveText(NODES[lang][i].amount);
    await expect(amount).toHaveAttribute('aria-hidden', lit ? 'false' : 'true');
  }

  // Đường nối chính: nguồn→① từ bước 1, ①→bus từ bước 2; nhánh tới ②③④ từ bước 2/3/4.
  const links = fig.locator('.flow-link');
  await expect(links).toHaveCount(2);
  const stubs = fig.locator('.flow-stub');
  await expect(stubs).toHaveCount(3);
  const onFrom: Array<[Locator, number]> = [
    [links.nth(0), 1],
    [links.nth(1), 2],
    [stubs.nth(0), 2],
    [stubs.nth(1), 3],
    [stubs.nth(2), 4],
  ];
  for (const [el, from] of onFrom) {
    if (step >= from) await expect(el).toHaveClass(/(^|\s)is-on(\s|$)/);
    else await expect(el).not.toHaveClass(/(^|\s)is-on(\s|$)/);
  }

  // Thẻ giải thích cùng số sáng theo (thuộc tính trên khối cha, đúng selector CSS).
  const section = explainSection(page);
  if (step >= 1 && step <= 4) {
    await expect(section).toHaveAttribute('data-flow-step', String(step));
    await expect(page.locator(`[data-flow-step="${step}"] #${CARD_FOR_STEP[step - 1]}`)).toHaveCount(1);
  } else {
    await expect(section).not.toHaveAttribute('data-flow-step', /.*/);
  }

  // Nút "Xem lại": luôn ở DOM, chỉ dùng được khi xong.
  const btn = replayButton(page);
  await expect(btn).toHaveCount(1);
  await expect(btn).toHaveText(REPLAY[lang]);
  if (step === 5) {
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(btn).not.toHaveAttribute('aria-hidden', 'true');
    await expect(fig.getByRole('button', { name: REPLAY[lang], exact: true })).toBeVisible();
  } else {
    await expect(btn).toBeHidden();
    await expect(btn).toHaveClass(/(^|\s)invisible(\s|$)/);
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('aria-hidden', 'true');
    // Không lọt vào cây trợ năng.
    await expect(fig.getByRole('button', { name: REPLAY[lang], exact: true })).toHaveCount(0);
  }
}

/** scrollY sau khi ép tính lại bố cục (scroll anchoring áp dụng lúc layout). */
function scrollY(page: Page) {
  return page.evaluate(() => {
    void document.documentElement.getBoundingClientRect();
    return window.scrollY;
  });
}

/** Ghi mọi lần đổi data-step + mọi sự kiện cuộn từ giờ trở đi. */
async function startRecording(page: Page) {
  await flow(page).evaluate((fig) => {
    const w = window as unknown as { __flowSteps: string[]; __flowScrolls: number[] };
    w.__flowSteps = [];
    w.__flowScrolls = [];
    new MutationObserver(() => {
      const s = fig.getAttribute('data-step') ?? '';
      if (w.__flowSteps[w.__flowSteps.length - 1] !== s) w.__flowSteps.push(s);
    }).observe(fig, { attributes: true, attributeFilter: ['data-step'] });
    window.addEventListener('scroll', () => w.__flowScrolls.push(window.scrollY), { passive: true });
  });
}
function recorded(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __flowSteps: string[]; __flowScrolls: number[] };
    return { steps: [...w.__flowSteps], scrolls: [...w.__flowScrolls] };
  });
}

async function openHome(page: Page, gotoApp: (p: string) => Promise<void>, seedState: (s: ReturnType<typeof buildSnapshot>) => Promise<void>) {
  await page.clock.install({ time: new Date(ANCHOR_ISO) });
  await seedState(buildSnapshot());
  await gotoApp('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/**
 * Dừng đồng hồ, cuộn sơ đồ vào giữa màn hình, rồi nhích từng 50 ms tới khi bước 1
 * hiện (IntersectionObserver chạy theo khung hình thật, không theo đồng hồ giả).
 */
async function scrollToFlowAndStart(page: Page) {
  await page.clock.pauseAt(new Date(Date.parse(ANCHOR_ISO) + 60_000));
  await flow(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect
    .poll(
      async () => {
        await page.clock.runFor(50);
        return flow(page).getAttribute('data-step');
      },
      { message: 'sơ đồ bắt đầu chạy khi cuộn tới' },
    )
    .toBe('1');
}

/**
 * Đang ở bước `from` (tới bước đó chưa quá ~100 ms): nửa bước sau vẫn là `from`,
 * đủ 1300 ms thì sang `from + 1`.
 */
async function advance(page: Page, from: number) {
  await page.clock.runFor(STEP_MS / 2);
  await expect(flow(page)).toHaveAttribute('data-step', String(from));
  await page.clock.runFor(STEP_MS / 2);
  await expect(flow(page)).toHaveAttribute('data-step', String(from + 1));
}

for (const [name, viewport] of [
  ['máy tính', DESKTOP],
  ['điện thoại 375px', MOBILE],
] as const) {
  test(`${name}: cuộn tới → chạy bước 1→5 một lần, thẻ sáng theo, "Xem lại" chạy lại; không giật cuộn`, async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(viewport);
    await openHome(page, gotoApp, seedState);

    // Lúc tải: sơ đồ nằm dưới màn đầu → chưa chạy.
    await expect(flow(page)).toHaveCount(1);
    await expectStep(page, 0);
    await expect(flow(page)).toContainText(CAPTION.vi);
    // Sơ đồ nằm trên bốn thẻ giải thích.
    const above = await flow(page).evaluate((fig) => {
      const card = document.getElementById('home-hold');
      return Boolean(card && fig.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(above, 'sơ đồ đứng trước thẻ #home-hold').toBe(true);

    await scrollToFlowAndStart(page);
    await startRecording(page);
    const baseY = await scrollY(page);
    const baseHeight = (await flow(page).boundingBox())!.height;

    await expectStep(page, 1);
    for (const from of [1, 2, 3, 4]) {
      await advance(page, from);
      await expectStep(page, from + 1);
      expect(await scrollY(page), `scrollY sau bước ${from + 1}`).toBe(baseY);
    }

    // Chạy MỘT lần: để thêm thời gian cũng không chạy lại.
    await page.clock.runFor(STEP_MS * 3);
    await expectStep(page, 5);
    // Nút hiện / ẩn không đổi chiều cao sơ đồ (giữ chỗ bằng `invisible`).
    expect((await flow(page).boundingBox())!.height).toBe(baseHeight);

    // "Xem lại" → về 0 ngay, chạy lại đúng nhịp (đồng hồ dừng nên mốc bấm là chính xác).
    await replayButton(page).click();
    await expectStep(page, 0);
    expect(await scrollY(page), 'scrollY ngay sau khi bấm "Xem lại"').toBe(baseY);
    await page.clock.runFor(FIRST_MS - 1);
    await expect(flow(page)).toHaveAttribute('data-step', '0');
    await page.clock.runFor(1);
    await expectStep(page, 1);
    for (const from of [1, 2, 3, 4]) {
      await page.clock.runFor(STEP_MS - 1);
      await expect(flow(page)).toHaveAttribute('data-step', String(from));
      await page.clock.runFor(1);
      await expectStep(page, from + 1);
      expect(await scrollY(page), `scrollY sau bước ${from + 1} (chạy lại)`).toBe(baseY);
    }
    expect((await flow(page).boundingBox())!.height).toBe(baseHeight);

    // Cả lượt: đúng thứ tự bước, không lần cuộn nào lệch khỏi vị trí ban đầu.
    const rec = await recorded(page);
    expect(rec.steps).toEqual(['2', '3', '4', '5', '0', '1', '2', '3', '4', '5']);
    expect(rec.scrolls.every((y) => y === baseY), `các lần cuộn: ${rec.scrolls.join(', ')}`).toBe(true);
    expect(await scrollY(page)).toBe(baseY);

    await expect(flow(page)).not.toContainText(/VNĐ|₫/);
  });
}

test('giảm chuyển động → bước 5 ngay, mọi ô sáng, không có "Xem lại", không data-flow-step', async ({
  page,
  seedState,
  gotoApp,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedState(buildSnapshot());
  await gotoApp('/');

  // Ghi mọi lần khối cha nhận data-flow-step (không được có lần nào).
  await explainSection(page).evaluate((section) => {
    const w = window as unknown as { __flowAttr: string[] };
    w.__flowAttr = [];
    new MutationObserver(() => {
      const v = section.getAttribute('data-flow-step');
      if (v) w.__flowAttr.push(v);
    }).observe(section, { attributes: true, attributeFilter: ['data-flow-step'] });
  });
  await flow(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));

  await expect(flow(page)).toHaveAttribute('data-step', '5');
  const nodes = flow(page).locator('.flow-node');
  await expect(nodes).toHaveCount(5);
  for (const [i, node] of (await nodes.all()).entries()) {
    await expect(node).toHaveClass(/(^|\s)is-lit(\s|$)/);
    await expect(node).toContainText(NODES.vi[i].label);
    await expect(node.locator('> span').last()).toHaveText(NODES.vi[i].amount);
  }
  for (const el of await flow(page).locator('.flow-link, .flow-stub').all()) {
    await expect(el).toHaveClass(/(^|\s)is-on(\s|$)/);
  }
  const btn = replayButton(page);
  await expect(btn).toHaveCount(1);
  await expect(btn).toBeHidden();
  await expect(btn).toBeDisabled();
  await expect(btn).toHaveAttribute('aria-hidden', 'true');
  await expect(flow(page).getByRole('button', { name: 'Xem lại' })).toHaveCount(0);
  await expect(explainSection(page)).not.toHaveAttribute('data-flow-step', /.*/);
  expect(await page.evaluate(() => (window as unknown as { __flowAttr: string[] }).__flowAttr)).toEqual([]);
});

test('English: nhãn, chú thích, nút "Replay" bằng tiếng Anh', async ({ page, context, seedState, gotoApp }) => {
  await page.setViewportSize(DESKTOP);
  const baseURL = test.info().project.use.baseURL!;
  await context.addCookies([{ name: 'cale.lang', value: 'en', url: baseURL }]);
  await openHome(page, gotoApp, seedState);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const fig = flow(page);
  await expect(fig).toContainText(CAPTION.en);
  const nodes = fig.locator('.flow-node');
  for (const [i, n] of NODES.en.entries()) {
    await expect(nodes.nth(i).locator('span.truncate').first()).toHaveText(n.label);
  }

  await scrollToFlowAndStart(page);
  await expectStep(page, 1, 'en');
  for (const from of [1, 2, 3, 4]) await advance(page, from);
  await expectStep(page, 5, 'en');
  await expect(fig.getByRole('button', { name: 'Replay', exact: true })).toBeEnabled();
  // Không sót chữ tiếng Việt của sơ đồ.
  for (const vi of ['Ví nhà tuyển dụng', 'CaLẻ giữ tiền', 'Hoàn về ví nhà tuyển dụng', 'Xem lại', 'Ví dụ:']) {
    await expect(fig).not.toContainText(vi);
  }
});

test.describe('bố cục', () => {
  test('máy tính ≥ 1024px: xếp ngang (nguồn → ① → ba nhánh cùng hàng trên)', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedState(buildSnapshot());
    await gotoApp('/');
    await flow(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(flow(page)).toHaveAttribute('data-step', '5');

    const nodes = flow(page).locator('.flow-node');
    const [src, held, paid, fee, refund] = await Promise.all([0, 1, 2, 3, 4].map((i) => nodes.nth(i).boundingBox()));
    // Nguồn, ①, ② cùng một hàng, trái → phải.
    expect(held!.x).toBeGreaterThan(src!.x + src!.width);
    expect(paid!.x).toBeGreaterThan(held!.x + held!.width);
    expect(Math.abs(held!.y - src!.y)).toBeLessThan(2);
    expect(Math.abs(paid!.y - src!.y)).toBeLessThan(2);
    // ②③④ xếp chồng trong cột nhánh.
    expect(Math.abs(fee!.x - paid!.x)).toBeLessThan(2);
    expect(fee!.y).toBeGreaterThan(paid!.y + paid!.height - 1);
    expect(refund!.y).toBeGreaterThan(fee!.y + fee!.height - 1);
  });

  test('điện thoại 375px: xếp dọc, không cuộn ngang trang', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(MOBILE);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedState(buildSnapshot());
    await gotoApp('/');
    await flow(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(flow(page)).toHaveAttribute('data-step', '5');

    const nodes = flow(page).locator('.flow-node');
    const boxes = await Promise.all([0, 1, 2, 3, 4].map((i) => nodes.nth(i).boundingBox()));
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i]!.y, `ô ${i} nằm dưới ô ${i - 1}`).toBeGreaterThan(boxes[i - 1]!.y + boxes[i - 1]!.height - 1);
    }
    for (const b of boxes) {
      expect(b!.x).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width).toBeLessThanOrEqual(MOBILE.width);
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width);
  });
});
