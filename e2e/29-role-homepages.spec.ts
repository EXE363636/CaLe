import { test, expect } from './fixtures/test';
import { buildSnapshot, buildShift } from './fixtures/seed';
import { ACCOUNTS, ANCHOR_ISO } from './fixtures/constants';

/**
 * P1 feedback F4 — trang chủ tách theo vai trò.
 *
 *   - `/` chỉ có 2 lựa chọn: "Tôi cần việc" → /for-workers, "Tôi cần tuyển" → /for-employers.
 *   - Hai trang vai trò có công tắc chung (aria-current đúng trang).
 *   - /for-workers không liệt kê ca (khối "Ca mới đăng" đã bỏ); xem ca ở /shifts.
 *   - /shifts khi chưa có ca đang tuyển: khối trống trung thực (OpenShiftsEmpty).
 *   - Đã đăng nhập: logo về nơi làm việc (worker → /shifts, employer → dashboard).
 */

const DESKTOP = { width: 1440, height: 900 };

function openShift(i: number) {
  return buildShift({
    id: `e2e-home-shift-${i}`,
    title: `E2E Ca mới ${i}`,
    date: '2030-06-10',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 0,
    // i lớn hơn = đăng sau → phải đứng trước.
    createdAt: `2026-09-${String(10 + i).padStart(2, '0')}T08:00:00.000Z`,
  });
}

test.describe('Role homepages', () => {
  test('"/" offers exactly the two role choices', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    // Biên nhận tự diễn vòng đời ca (usePlayback); giảm chuyển động → đứng yên ở
    // bước "hoàn thành" nên số tiền / đối soát bên dưới không phụ thuộc thời điểm.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedState(buildSnapshot());
    await gotoApp('/');

    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Việc làm ngắn hạn, rõ ca – rõ tiền');

    // Màn đầu: đúng hai cửa vai trò dưới câu hỏi chọn vai trò.
    const doors = main.getByRole('list', { name: 'Bạn đang tìm việc hay cần tuyển người?' });
    const doorLinks = doors.getByRole('link');
    await expect(doorLinks).toHaveCount(2);
    await expect(doorLinks.nth(0)).toHaveAccessibleName(/^Tôi cần việc/);
    await expect(doorLinks.nth(0)).toHaveAttribute('href', '/for-workers');
    await expect(doorLinks.nth(1)).toHaveAccessibleName(/^Tôi cần tuyển/);
    await expect(doorLinks.nth(1)).toHaveAttribute('href', '/for-employers');

    // Dải kết lặp lại đúng hai cửa đó.
    const close = main.locator('section[aria-labelledby="home-close"]');
    await expect(close.getByRole('heading', { name: 'Bắt đầu từ phía của bạn' })).toBeVisible();
    await expect(close.getByRole('link', { name: /^Tôi cần việc/ })).toHaveAttribute('href', '/for-workers');
    await expect(close.getByRole('link', { name: /^Tôi cần tuyển/ })).toHaveAttribute('href', '/for-employers');

    // Bản demo nói rõ tiền là mô phỏng, chưa thu phí. Biên nhận là sổ cân đối:
    // giữ trước 180.000 đ = trả người lao động 180.000 đ + phí 0 đ + hoàn 0 đ.
    await expect(main.locator('h1 + p')).toContainText('(mô phỏng)');
    const receipt = main.locator('figure.home-receipt');
    await expect(receipt.locator('figcaption')).toHaveText(
      'Minh hoạ: tên và số liệu là ví dụ. Bấm từng dòng để xem giải thích.',
    );
    await expect(receipt.getByText('Tiền của ca này đi đâu?', { exact: true })).toBeVisible();
    const lines = receipt.locator('[data-receipt-line]');
    await expect(lines).toHaveCount(4);
    const expectLine = async (target: string, label: string, detail: string, amount: string) => {
      const line = receipt.locator(`[data-receipt-line="${target}"]`);
      await expect(line).toHaveAttribute('href', `#${target}`);
      await expect(line).toContainText(label);
      await expect(line).toContainText(detail);
      await expect(line).toContainText(amount);
    };
    await expectLine('home-hold', 'Giữ trước khi đăng ca', 'Từ ví nhà tuyển dụng: tiền công (mô phỏng)', '180.000 đ');
    await expectLine('home-paid', 'Trả người lao động', 'Khi ca được xác nhận, không trừ phí (mô phỏng)', '180.000 đ');
    await expectLine('home-fee', 'Phí CaLẻ', 'Bản demo chưa thu phí', '0 đ');
    await expectLine('home-refund', 'Hoàn về nhà tuyển dụng', 'Ca đủ người, không ai vắng', '0 đ');
    await expect(lines.nth(0)).toHaveAttribute('data-receipt-line', 'home-hold');
    await expect(lines.nth(1)).toHaveAttribute('data-receipt-line', 'home-paid');
    await expect(lines.nth(2)).toHaveAttribute('data-receipt-line', 'home-fee');
    await expect(lines.nth(3)).toHaveAttribute('data-receipt-line', 'home-refund');
    // Dòng đối soát: tiền ra cộng lại đúng bằng tiền giữ trước.
    await expect(receipt.getByText('Đối soát', { exact: true })).toBeVisible();
    await expect(receipt.getByText('180.000 + 0 + 0 = 180.000 đ', { exact: true })).toBeVisible();
    // Mỗi dòng có đúng một thẻ giải thích cùng id bên dưới: số thứ tự + tiêu đề +
    // một câu cho mỗi phía (dl); giải thích dài nằm trong "Xem chi tiết" (đóng sẵn).
    const explain = main.locator('section[aria-labelledby="home-explain-title"]');
    await expect(explain.getByRole('heading', { level: 2, name: 'Tiền của một ca đi về đâu?', exact: true })).toBeVisible();
    await expect(explain.locator('li.home-explain')).toHaveCount(4);
    for (const [i, [id, title]] of ([
      ['home-hold', 'Giữ trước tiền công'],
      ['home-paid', 'Làm xong, được trả'],
      ['home-fee', 'Phí CaLẻ'],
      ['home-refund', 'Hoàn lại và hỗ trợ'],
    ] as const).entries()) {
      const card = main.locator(`li#${id}`);
      await expect(card).toHaveClass(/home-explain/);
      await expect(explain.locator('li.home-explain').nth(i)).toHaveAttribute('id', id);
      await expect(card.getByRole('heading', { level: 3, name: title })).toBeVisible();
      await expect(card.locator('.explain-num')).toHaveText(String(i + 1));
      await expect(card.locator('dt')).toHaveText(['Phía người lao động', 'Phía nhà tuyển dụng']);
      await expect(card.locator('dd')).toHaveCount(2);
      const more = card.locator('details');
      await expect(more).toHaveCount(1);
      await expect(more).not.toHaveAttribute('open', /.*/);
      await expect(more.locator('summary')).toHaveText('Xem chi tiết');
    }
    await expect(main.locator('#home-attend, #home-trouble')).toHaveCount(0);
    await expect(main).not.toContainText(/VNĐ|₫/);

    // Thứ tự khối (03/10, lần 4): màn đầu → "Về CaLẻ" (home-about, gộp từ /about, chứa
    // băng chuyền "Đội ngũ" home-team và thẻ đối tác home-partners) → "Vì sao CaLẻ ra
    // đời?" (home-why: số liệu → bảng so sánh → chú thích VTV; khối / tiêu đề home-solve
    // đã bỏ) → loại việc (home-work) →
    // "Bốn bước của một ca" (home-how, gộp từ /how-it-works) → đọc biên nhận →
    // "CaLẻ làm được gì?" (home-features) → dải kết. Chi tiết hai khối mới: e2e/43.
    // Khối ảnh / lời chia sẻ thật đang ẩn (không render gì); khối gấp home-urgent nằm
    // trong home-work và tự ẩn khi không có ca. FAQ trang chủ đã bỏ (hai trang vai trò
    // có FAQ riêng).
    const order = await main
      .locator('section[aria-labelledby]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby')));
    expect(order.filter((id) => id !== 'home-urgent'), `thứ tự khối: ${order.join(', ')}`).toEqual([
      'home-about',
      'home-team',
      'home-partners',
      'home-why',
      'home-work',
      'home-how',
      'home-explain-title',
      'home-features',
      'home-close',
    ]);
    await expect(main.locator('section[aria-labelledby="home-faq"], #home-faq')).toHaveCount(0);
    await expect(main.getByRole('heading', { name: 'Câu hỏi hay gặp' })).toHaveCount(0);

    // Lối đi thẳng dưới vòng thẻ.
    const work = main.locator('section[aria-labelledby="home-work"]');
    await expect(
      work.getByText(
        'Từ quán ăn, quán cà phê tới sự kiện và kho hàng: những việc cần thêm người trong vài giờ. Mỗi ca ghi rõ giờ làm, tổng tiền và yêu cầu.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(work.getByRole('link', { name: 'Xem ca đang tuyển →', exact: true })).toHaveAttribute(
      'href',
      '/shifts',
    );
    await expect(work.getByRole('link', { name: 'Đăng ca tuyển →', exact: true })).toHaveAttribute(
      'href',
      '/employer/shifts/new',
    );

    await doorLinks.nth(0).click();
    await page.waitForURL('**/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
  });

  // Ca gấp = đang tuyển, bắt đầu trong 24 giờ tới, còn thiếu người.
  // Đồng hồ ghim ở ANCHOR_ISO (2027-06-02 12:00 ICT).
  test('"/" shows "Ca gấp cần người" with only urgent unfilled shifts', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    const base = { status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, startTime: '08:00', endTime: '12:00' };
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ ...base, id: 'e2e-urgent-1', title: 'E2E Ca gấp', date: '2027-06-03', positionsFilled: 0 }),
          buildShift({ ...base, id: 'e2e-urgent-full', title: 'E2E Ca gấp đủ người', date: '2027-06-03', positionsFilled: 2 }),
          buildShift({ ...base, id: 'e2e-far', title: 'E2E Ca còn xa', date: '2027-06-20', positionsFilled: 0 }),
        ],
      }),
    );
    await gotoApp('/');

    const block = page.locator('section[aria-labelledby="home-urgent"]');
    await expect(block.getByRole('heading', { name: 'Ca gấp cần người' })).toBeVisible();
    const cards = block.locator('a[href^="/shifts/e2e-"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute('href', '/shifts/e2e-urgent-1');
  });

  test('"/" hides the urgent block when no shift is urgent', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install({ time: new Date(ANCHOR_ISO) });
    await seedState(
      buildSnapshot({
        shifts: [
          buildShift({ id: 'e2e-far', title: 'E2E Ca còn xa', date: '2027-06-20', status: 'Published', escrowStatus: 'Deposited', positionsTotal: 2, positionsFilled: 0 }),
        ],
      }),
    );
    await gotoApp('/');
    const doors = page.getByRole('list', { name: 'Bạn đang tìm việc hay cần tuyển người?' });
    await expect(doors.getByRole('link', { name: /^Tôi cần việc/ })).toBeVisible();
    await expect(page.locator('#home-urgent')).toHaveCount(0);
  });

  test('"/" receipt line "Trả người lao động" jumps to its explanation', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');

    const receipt = page.locator('main figure.home-receipt');
    await receipt.getByRole('link', { name: /Trả người lao động/ }).click();
    await expect(page).toHaveURL(/#home-paid$/);
    const paid = page.locator('li#home-paid');
    await expect(paid).toHaveClass(/home-explain/);
    await expect(paid.getByRole('heading', { level: 3, name: 'Làm xong, được trả' })).toBeVisible();
    await expect(paid).toBeInViewport();
  });

  test('"/" explain card: "Xem chi tiết" opens the full explanation', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');

    const paid = page.locator('li#home-paid');
    await expect(paid.getByText('Phía người lao động', { exact: true })).toBeVisible();
    await expect(paid.getByText('Nhận đúng số tiền đã thấy trên ca.', { exact: true })).toBeVisible();
    await expect(paid.getByText('Chỉ trả cho người đã làm và đã được xác nhận.', { exact: true })).toBeVisible();

    // Đóng sẵn: thân giải thích dài + ghi chú check-in chưa hiện.
    const body = paid.getByText(/^Nhà tuyển dụng duyệt từng người\./);
    const note = paid.getByText('Check-in hiện là ghi nhận trên ứng dụng, chưa dùng GPS hay mã QR.', {
      exact: true,
    });
    await expect(body).toBeHidden();
    await expect(note).toBeHidden();

    await paid.getByText('Xem chi tiết', { exact: true }).click();
    await expect(paid.locator('details')).toHaveAttribute('open', '');
    await expect(body).toBeVisible();
    await expect(body).toContainText('(mô phỏng)');
    await expect(note).toBeVisible();

    // Thẻ phí: link bảng giá nằm trong phần chi tiết (03/10: /pricing gộp vào khối giá
    // của trang nhà tuyển dụng).
    const fee = page.locator('li#home-fee');
    const pricing = fee.getByRole('link', { name: /Xem bảng giá/ });
    await expect(pricing).toBeHidden();
    await fee.getByText('Xem chi tiết', { exact: true }).click();
    await expect(pricing).toBeVisible();
    await expect(pricing).toHaveAttribute('href', '/for-employers#employer-pricing');
  });

  test('"/" receipt replays the shift lifecycle in a loop (normal motion)', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await page.clock.install();
    await seedState(buildSnapshot());
    await gotoApp('/');

    const receipt = page.locator('main figure.home-receipt');
    const paid = receipt.locator('[data-receipt-line="home-paid"]');
    // Bắt đầu ở bước "hoàn thành" (giống bản server).
    await expect(paid).toContainText('180.000 đ');
    await expect(receipt.getByText('180.000 + 0 + 0 = 180.000 đ', { exact: true })).toBeVisible();
    await expect(receipt.getByText('Đã hoàn thành', { exact: true }).first()).toBeVisible();

    // Hết 3,8 giây ở bước cuối → quay lại bước đầu: ca vừa đăng, tiền ra chưa có số.
    await page.clock.runFor(4000);
    await expect(paid).toContainText('—');
    await expect(paid).not.toContainText('180.000 đ');
    await expect(receipt.getByText('Đang tuyển', { exact: true })).toBeVisible();
    await expect(receipt.getByText('Chốt sổ khi ca hoàn thành', { exact: true })).toBeVisible();
  });

  test('/for-workers: switch marks worker, no "Ca mới đăng" list (only "Ca đang tuyển"), links to /for-employers', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // Khối "Ca mới đăng" đã bỏ theo yêu cầu chủ sản phẩm; 03/10 thay bằng khối
    // "Ca đang tuyển" (6 ca sớm nhất + "Xem tất cả" → /shifts).
    const shifts = [1, 2, 3, 4, 5, 6, 7].map(openShift);
    shifts.push({ ...openShift(9), id: 'e2e-home-cancelled', title: 'E2E Ca đã huỷ', status: 'Cancelled' });
    await seedState(buildSnapshot({ shifts }));
    await gotoApp('/for-workers');

    const sw = page.getByRole('navigation', { name: 'Chọn trang theo vai trò' });
    await expect(sw.getByRole('link', { name: 'Tôi cần việc' })).toHaveAttribute('aria-current', 'page');
    await expect(sw.getByRole('link', { name: 'Tôi cần tuyển' })).not.toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');

    // Menu khách không còn "Tìm ca làm" → hero có đăng ký (chính) + xem ca + đăng nhập.
    const hero = page.locator('main section').first();
    await expect(hero.getByRole('link', { name: /Đăng ký để nhận ca/ })).toHaveAttribute('href', '/register?role=worker');
    await expect(hero.getByRole('link', { name: 'Xem ca đang tuyển' })).toHaveAttribute('href', '/shifts');
    await expect(hero.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');

    // Local/demo: lợi ích tiền nói rõ là mô phỏng.
    await expect(page.getByText('Ca hoàn thành, tiền công vào ví (mô phỏng trong bản demo).')).toBeVisible();

    // 03/10: "Tiền về tay bạn khi nào?" — sơ đồ 5 chặng (PayoutTimeline) thay cho 2 ô
    // "Tiền công của bạn" / "Phí của bạn". Trạng thái cuối của sơ đồ: e2e/35.
    const money = page.locator('section[aria-labelledby="worker-money"]');
    await expect(money.getByRole('heading', { level: 2, name: 'Tiền về tay bạn khi nào?' })).toBeVisible();
    await expect(money.locator('figure ol > li')).toHaveCount(5);
    await expect(money).toContainText('180.000 đ (mô phỏng)');
    // Ô cũ (bản 2 ô, bản 3 ô) không còn trên trang.
    await expect(page.getByText('Tiền công của bạn', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Phí của bạn', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Trước khi ca hiện ra', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Khi ca xong', { exact: true })).toHaveCount(0);

    // Khối cũ "Ca mới đăng" vẫn không còn. Từ 03/10 trang có khối "Ca đang tuyển"
    // (#worker-shifts, chi tiết ở e2e/42): tối đa 6 thẻ ca đang tuyển, ca đã huỷ không hiện.
    await expect(page.getByRole('heading', { name: 'Ca mới đăng' })).toHaveCount(0);
    await expect(page.locator('section[aria-labelledby="worker-latest"]')).toHaveCount(0);
    const openBlock = page.locator('section[aria-labelledby="worker-shifts"]');
    await expect(openBlock.locator('a[href^="/shifts/e2e-home-shift-"]')).toHaveCount(6);
    await expect(page.locator('a[href="/shifts/e2e-home-cancelled"]')).toHaveCount(0);
    await expect(page.getByText('E2E Ca đã huỷ')).toHaveCount(0);

    await page.getByRole('link', { name: /Xem trang tuyển dụng/ }).click();
    await page.waitForURL('**/for-employers');
  });

  test('đường dẫn cũ /viec-lam, /tuyen-dung chuyển sang /for-workers, /for-employers', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await seedState(buildSnapshot());
    await gotoApp('/viec-lam');
    await page.waitForURL('**/for-workers');
    await gotoApp('/tuyen-dung');
    await page.waitForURL('**/for-employers');
  });

  test('/shifts: no open shift → honest empty state', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/shifts');
    // OpenShiftsEmpty (headingLevel 2 trên /shifts): says plainly that
    // nothing is open — no invented sample shifts, no filters over 0 shifts.
    const emptyHeading = page.getByRole('heading', {
      level: 2,
      name: 'Hiện chưa có ca nào đang mở tuyển.',
    });
    await expect(emptyHeading).toBeVisible();
    const empty = emptyHeading.locator('xpath=ancestor::section[1]');
    // Guest → one concrete next step: create a worker account.
    await expect(empty.getByRole('link', { name: 'Tạo tài khoản người lao động' })).toHaveAttribute(
      'href',
      '/register?role=worker',
    );
    // 03/10: /how-it-works gộp vào khối "Bốn bước của một ca" của trang chủ.
    await expect(empty.getByRole('link', { name: /Cách CaLẻ hoạt động/ })).toHaveAttribute(
      'href',
      '/#home-how',
    );
    // "Khi có ca mới" explains the real flow (3 steps), not fake shift cards.
    await expect(empty.getByRole('listitem')).toHaveCount(3);
  });

  test('/for-employers: switch marks employer, CTA goes to employer register, demo fee shown in shift playground', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-employers');

    const sw = page.getByRole('navigation', { name: 'Chọn trang theo vai trò' });
    await expect(sw.getByRole('link', { name: 'Tôi cần tuyển' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cần người làm theo ca?');
    await expect(page.getByRole('link', { name: /Đăng ký để đăng ca/ }).first()).toHaveAttribute(
      'href',
      '/register?role=employer',
    );
    // Phí demo nằm trong form thử đăng ca ("Một ca tốn bao nhiêu?"); "Tiền của bạn đi
    // đâu?" đã bỏ. 03/10 (lần 4): trang /pricing gộp về đây thành khối "Phí dịch vụ"
    // (#employer-pricing, "Giai đoạn thử nghiệm: 0 đ") — chi tiết ở e2e/43.
    const money = page.locator('section[aria-labelledby="employer-money"]');
    await expect(money.getByRole('heading', { level: 2, name: 'Một ca tốn bao nhiêu?', exact: true })).toBeVisible();
    await expect(money.getByText('Bản demo chưa thu phí', { exact: true })).toBeVisible();
    await expect(page.locator('section[aria-labelledby="employer-pricing"]')).toHaveCount(1);
    await expect(page.locator('#employer-pricing')).toHaveText('Giai đoạn thử nghiệm: 0 đ');
    await expect(page.getByText('Tiền của bạn đi đâu?', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(money.getByRole('heading', { level: 2, name: 'What does a shift cost?', exact: true })).toBeVisible();
  });

  // Nút cam bên phải header (khách, desktop ≥ xl) — 03/10: khách chỉ có "Đăng nhập" +
  // MỘT nút cam đăng ký trên mọi trang. Trang của người lao động (/for-workers, /shifts
  // và trang con): "Đăng ký để nhận ca"; /for-employers: "Đăng ký để đăng ca"; nơi khác
  // (kể cả "/"): "Đăng ký". Không còn "Đăng ca tuyển" cho khách. Chi tiết ở e2e/36.
  test('guest header CTA: worker pages → "Đăng ký để nhận ca", /for-employers → "Đăng ký để đăng ca", elsewhere → "Đăng ký"', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: [openShift(1)] }));
    const header = page.locator('header').first();
    const register = header.locator('a[href^="/register"]');
    const postShift = header.getByRole('link', { name: 'Đăng ca tuyển' });

    const cases: Array<[string, string, string]> = [
      ['/for-workers', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/shifts', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/shifts/e2e-home-shift-1', 'Đăng ký để nhận ca', '/register?role=worker'],
      ['/for-employers', 'Đăng ký để đăng ca', '/register?role=employer'],
      ['/', 'Đăng ký', '/register'],
      ['/support', 'Đăng ký', '/register'],
    ];
    for (const [path, label, href] of cases) {
      await gotoApp(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(register, path).toHaveCount(1);
      await expect(register, path).toBeVisible();
      await expect(register, path).toHaveText(label);
      await expect(register, path).toHaveAttribute('href', href);
      await expect(register, path).toHaveClass(/bg-orange-500/);
      await expect(postShift, path).toHaveCount(0);
    }

    await gotoApp('/for-workers');
    await register.click();
    await page.waitForURL('**/register?role=worker');
  });

  test('logged-in logo goes to the role workspace', async ({ page, seedState, loginAs, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/dashboard');
    await expect(page.locator('header a:has(img[src="/images/logo.png"])').first()).toHaveAttribute(
      'href',
      '/employer/dashboard',
    );
  });
});

test.describe('Nút VI / EN (đợt 1: trang công khai)', () => {
  test('chuyển sang English rồi về Tiếng Việt, nhớ lựa chọn khi tải lại', async ({
    page,
    seedState,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/for-workers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');

    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find short shifts near you');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    // 03/10 (lần 2): "Workers" / "Employers" là nút menu thả, danh sách dọc tới từng khối.
    await expect(nav.locator('button[aria-haspopup="menu"]')).toHaveText(['Workers', 'Employers', 'Help & support']);
    const workers = nav.getByRole('button', { name: 'Workers', exact: true });
    await workers.hover();
    await expect(workers).toHaveAttribute('aria-expanded', 'true');
    const workerMenu = page.getByRole('menu', { name: 'Workers', exact: true });
    await expect(workerMenu.getByRole('menuitem')).toHaveText([
      'Overview for workers',
      'Open shifts',
      'Find and apply for shifts',
      'My schedule',
      'When you get paid',
      'Cancellation rules',
      'Profile & reputation',
      'FAQ',
    ]);
    await expect(workerMenu.getByRole('menuitem').first()).toHaveAttribute('href', '/for-workers');
    const employers = nav.getByRole('button', { name: 'Employers', exact: true });
    await employers.hover();
    await expect(workers).toHaveAttribute('aria-expanded', 'false');
    const employerMenu = page.getByRole('menu', { name: 'Employers', exact: true });
    await expect(employerMenu.getByRole('menuitem')).toHaveText([
      'Overview for employers',
      'Try posting a shift',
      'Review applicants',
      'Holding shift wages',
      'Service fee',
      'Post-shift reviews',
      'FAQ',
    ]);
    await expect(employerMenu.getByRole('menuitem').first()).toHaveAttribute('href', '/for-employers');
    // Chọn một mục (tiếng Anh) → đúng khối, menu đóng.
    await employerMenu.getByRole('menuitem', { name: 'Holding shift wages', exact: true }).click();
    await expect(page).toHaveURL(/\/for-employers#employer-payments$/);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('#employer-payments')).toBeInViewport();
    await workers.hover();
    await workerMenu.getByRole('menuitem', { name: 'Overview for workers', exact: true }).click();
    await expect(page).toHaveURL(/\/for-workers$/);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find short shifts near you');

    await page.getByRole('button', { name: 'Chuyển sang Tiếng Việt' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tìm ca làm ngắn hạn gần bạn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  });
  test('trang chủ "/" (biên nhận ca) hiện tiếng Anh', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Việc làm ngắn hạn, rõ ca – rõ tiền');

    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Short-term work, clear shifts – clear pay');
    await expect(page.getByRole('heading', { level: 2, name: 'Where does the money for a shift go?', exact: true })).toBeVisible();
    const doors = page.getByRole('list', { name: 'Looking for work or hiring?' });
    await expect(doors.getByRole('link')).toHaveCount(2);
    await expect(doors.getByRole('link', { name: /^I need work/ })).toHaveAttribute('href', '/for-workers');
    const receipt = page.locator('main figure.home-receipt');
    await expect(receipt.getByText('Where did this shift’s money go?', { exact: true })).toBeVisible();
    await expect(receipt.getByRole('link', { name: /Paid to the worker/ })).toBeVisible();
    await expect(receipt.getByText('Tiền của ca này đi đâu')).toHaveCount(0);
  });
  test('đợt 2a: danh sách ca + thẻ ca + chi tiết ca hiện tiếng Anh', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot({ shifts: [openShift(1)] }));
    await gotoApp('/shifts');
    await page.getByRole('button', { name: 'Switch to English' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find shifts');
    await expect(page.getByPlaceholder('Search by shift name or place...')).toBeVisible();
    const card = page.locator('a[href="/shifts/e2e-home-shift-1"]');
    await expect(card.getByText('Hiring', { exact: true })).toBeVisible();
    await expect(card.getByText('2/2 spots left')).toBeVisible();
    await expect(card.getByText('whole shift')).toBeVisible();

    await card.click();
    await page.waitForURL('**/shifts/e2e-home-shift-1');
    await expect(page.getByText('Pay for the whole shift')).toBeVisible();
    await expect(page.getByRole('link', { name: /Back/ })).toBeVisible();
  });
  test('đợt 2b: dashboard người lao động hiện tiếng Anh', async ({ page, seedState, loginAs, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.worker.id);
    await gotoApp('/worker/dashboard');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hello,');
    await expect(page.getByText('Reputation score', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Upcoming shifts', { exact: true }).first()).toBeVisible();
  });
  test('đợt 2d: trang đăng ca của nhà tuyển dụng hiện tiếng Anh', async ({
    page,
    seedState,
    loginAs,
    gotoApp,
  }) => {
    await page.setViewportSize(DESKTOP);
    // employer-001 đã có ca trong seed → có loại tài khoản → thấy form (không bị chặn).
    await seedState(buildSnapshot());
    await loginAs(ACCOUNTS.employer.id);
    await gotoApp('/employer/shifts/new');
    await expect(page.getByLabel(/^Tên ca làm/)).toBeVisible();
    await page.getByRole('button', { name: 'Switch to English' }).click();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'cale.lang')?.value).toBe('en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post a shift');
    await expect(page.getByText('Shift details', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/^Shift name/)).toBeVisible();
    await expect(page.getByLabel(/^Job type/)).toBeVisible();
    await expect(page.getByLabel(/^Hourly pay \(đ\)/)).toBeVisible();
    await expect(page.getByText('Tên ca làm')).toHaveCount(0);
  });
});

test.describe('Nút giao diện sáng / tối', () => {
  test('bật tối ngay, nhớ khi tải lại, tắt về sáng', async ({ page, seedState, gotoApp }) => {
    await page.setViewportSize(DESKTOP);
    await seedState(buildSnapshot());
    await gotoApp('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    // Nền trang đổi sang tối (#141416).
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .toBe('rgb(20, 20, 22)');

    // Server đọc cookie → trang tải lại đã tối sẵn (không nháy trắng).
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});
