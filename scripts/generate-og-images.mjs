/**
 * Tạo ảnh xem trước khi chia sẻ link (Open Graph, 1200×630) cho `/`, `/for-workers`,
 * `/for-employers` (02/10). Ảnh dùng đúng font Inter + màu thương hiệu của app nên
 * chụp trên dev server đang chạy:
 *
 *   node scripts/generate-og-images.mjs            # mặc định http://localhost:3000
 *   node scripts/generate-og-images.mjs http://localhost:3200
 *
 * Ghi ra `src/app/opengraph-image.png`, `src/app/for-workers/opengraph-image.png`,
 * `src/app/for-employers/opengraph-image.png` — Next tự gắn thẻ og:image theo vị trí
 * file. Đổi câu chữ ở đây thì sửa luôn mô tả trong `opengraph-image.alt.txt` cạnh ảnh.
 *
 * Số tiền trên ảnh là ví dụ theo luồng production (tiền công + 10% phí giữ trước),
 * ghi "Minh hoạ". Không dùng "VNĐ" / "₫".
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const INK = '#2a2a2e';
const MUTED = '#55555c';
const ORANGE_DARK = '#9a3412';

const chip = (text) =>
  `<span style="display:inline-flex;align-items:center;height:44px;padding:0 20px;border-radius:999px;background:#fff;border:1.5px solid #ffd5ae;color:${ORANGE_DARK};font-size:21px;font-weight:600">${text}</span>`;

const card = (inner) =>
  `<div style="width:410px;border-radius:28px;background:#fff;box-shadow:0 24px 60px rgba(120,60,20,.16),0 2px 6px rgba(0,0,0,.06);padding:30px 32px;color:${INK}">${inner}</div>`;

const row = (label, amount, opts = {}) =>
  `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 0;${opts.top ? 'border-top:2px dashed #e5e5e8;' : ''}">
     <span style="font-size:20px;color:${opts.muted ? MUTED : INK};font-weight:${opts.bold ? 700 : 500}">${label}</span>
     <span style="font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;color:${opts.color ?? INK}">${amount}</span>
   </div>`;

const badge = (text, bg, fg) =>
  `<span style="display:inline-flex;align-items:center;flex-shrink:0;white-space:nowrap;height:32px;padding:0 14px;border-radius:999px;background:${bg};color:${fg};font-size:16px;font-weight:700">${text}</span>`;

const receipt = card(`
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
    <span style="font-size:22px;font-weight:800;white-space:nowrap">Phụ bếp quán lẩu</span>
    ${badge('Đã hoàn thành', '#dcfce7', '#166534')}
  </div>
  <div style="font-size:18px;color:${MUTED};margin-top:6px">Thứ 7 · 17:00–21:00 · 1 người</div>
  <div style="margin-top:18px">
    ${row('Giữ trước khi đăng ca', '198.000 đ', { top: true })}
    ${row('Trả người lao động', '180.000 đ', { color: '#15803d' })}
    ${row('Phí CaLẻ (10%)', '18.000 đ', { muted: true })}
    ${row('Hoàn về nhà tuyển dụng', '0 đ', { muted: true })}
  </div>
  <div style="font-size:15px;color:${MUTED};margin-top:10px">Minh hoạ</div>`);

const shiftCard = card(`
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
    <span style="font-size:22px;font-weight:800;white-space:nowrap">Pha chế quán cà phê</span>
    ${badge('Đang tuyển', '#dbeafe', '#1e40af')}
  </div>
  <div style="font-size:18px;color:${MUTED};margin-top:6px">Thứ 3 · 07:00–11:00 · 4 giờ</div>
  <div style="margin-top:22px;border-radius:18px;background:#fff4e9;padding:18px 20px">
    <div style="font-size:18px;color:${MUTED}">Tổng tiền cả ca</div>
    <div style="font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px">140.000 đ</div>
    <div style="font-size:17px;color:${MUTED};margin-top:2px">35.000 đ/giờ · tiền công đã giữ trước</div>
  </div>
  <div style="margin-top:20px;height:56px;border-radius:16px;background:#ff9a5f;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:700;color:${INK}">Ứng tuyển</div>
  <div style="font-size:15px;color:${MUTED};margin-top:12px">Minh hoạ</div>`);

const applicant = (initials, name, approved) => `
  <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:16px;border:1.5px solid ${approved ? '#86efac' : '#e5e5e8'};background:${approved ? '#f0fdf4' : '#fff'};margin-top:10px">
    <span style="width:42px;height:42px;border-radius:999px;background:#ffdbb8;color:${ORANGE_DARK};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800">${initials}</span>
    <span style="flex:1;font-size:20px;font-weight:700">${name}</span>
    ${approved ? badge('Đã duyệt', '#dcfce7', '#166534') : `<span style="height:36px;padding:0 16px;border-radius:10px;background:#ff9a5f;display:flex;align-items:center;font-size:16px;font-weight:700;color:${INK}">Duyệt</span>`}
  </div>`;

const applicantsCard = card(`
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
    <span style="font-size:22px;font-weight:800;white-space:nowrap">Phục vụ tiệc cưới</span>
    ${badge('Đã đăng', '#dbeafe', '#1e40af')}
  </div>
  <div style="font-size:18px;color:${MUTED};margin-top:6px">Thứ 7 · 17:00–22:00 · 3 người</div>
  ${applicant('MA', 'Minh Anh', true)}
  ${applicant('QB', 'Quốc Bảo', true)}
  ${applicant('TH', 'Thu Hà', false)}
  <div style="font-size:15px;color:${MUTED};margin-top:12px">Minh hoạ</div>`);

const IMAGES = [
  {
    out: 'src/app/opengraph-image.png',
    title: ['Việc làm ngắn hạn,', 'rõ ca – rõ tiền'],
    sub: 'Tiền công giữ trước mỗi ca, chỉ trả cho người đã làm.',
    chips: ['Phục vụ', 'Pha chế', 'Phụ bếp', 'Sự kiện'],
    right: receipt,
  },
  {
    out: 'src/app/for-workers/opengraph-image.png',
    title: ['Tìm ca làm ngắn hạn', 'gần bạn'],
    sub: 'Không mất phí. Biết trước tổng tiền cả ca trước khi ứng tuyển.',
    chips: ['Làm vài giờ', 'Không cần kinh nghiệm', 'Check-in trên điện thoại'],
    right: shiftCard,
  },
  {
    out: 'src/app/for-employers/opengraph-image.png',
    title: ['Cần người', 'làm theo ca?'],
    sub: 'Đăng ca theo giờ, duyệt từng người, chỉ trả cho người đã làm.',
    chips: ['Đăng ca miễn phí', 'Duyệt từng người', 'Hoàn phần không dùng'],
    right: applicantsCard,
  },
];

const html = (img) => `
  <div id="og" style="position:fixed;inset:0;width:1200px;height:630px;z-index:2147483647;overflow:hidden;background:#fff4e9;font-family:var(--font-sans),Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="position:absolute;right:-160px;top:-200px;width:640px;height:640px;border-radius:50%;background:#ffd5ae;opacity:.55"></div>
    <div style="position:absolute;left:-120px;bottom:-260px;width:420px;height:420px;border-radius:50%;background:#ffead5"></div>
    <div style="position:relative;display:flex;align-items:center;gap:48px;height:100%;padding:0 64px">
      <div style="flex:1;min-width:0">
        <img src="/images/logo.png" alt="" style="height:64px;width:auto;display:block" />
        <div style="margin-top:40px;font-size:58px;line-height:1.08;font-weight:800;letter-spacing:-0.02em;white-space:nowrap;color:${INK}">
          ${img.title.map((t) => `<div>${t}</div>`).join('')}
        </div>
        <div style="margin-top:22px;font-size:27px;line-height:1.4;color:${MUTED};max-width:560px">${img.sub}</div>
        <div style="margin-top:34px;display:flex;flex-wrap:wrap;gap:12px">${img.chips.map(chip).join('')}</div>
      </div>
      <div style="flex-shrink:0">${img.right}</div>
    </div>
  </div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/about`, { waitUntil: 'networkidle' });
for (const img of IMAGES) {
  await page.evaluate((markup) => {
    document.getElementById('og')?.remove();
    document.body.insertAdjacentHTML('beforeend', markup);
  }, html(img));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('#og img')].map((i) => (i.complete ? null : new Promise((r) => (i.onload = r)))));
  });
  await page.locator('#og').screenshot({ path: path.join(ROOT, img.out) });
  console.log('wrote', img.out);
}
await browser.close();
