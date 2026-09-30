# HANDOFF — Session 2026-09-30 (webhook PayOS · menu · đường dẫn EN · VI/EN · sáng/tối)

> Đọc kèm `CLAUDE.md` (mục 0 agent/lệnh; mục 5 quy tắc song ngữ + giao diện tối),
> `docs/HANDOFF_SESSION_2026-09-30_P2-2.md` (phần trước của ngày),
> `docs/HANDOFF_SESSION_2026-09-28_FEEDBACK.md` (plan P0–P3 theo feedback của cô).

## 0. Partner cần làm sau khi pull
1. Pull code:
   ```bash
   git checkout main
   git pull origin main
   ```
   Sau đó chạy `graphify update .`.
2. Không thêm dependency mới → không cần `npm install` (chỉ `npm ci` nếu máy báo thiếu gói).
3. **DB / Edge Function: không cần làm gì.**
   - `0027` đã `db push`, `payos-webhook` đã deploy (30/09).
   - Kiểm: `npx supabase migration list` phải có 0001–0027 đủ cả 2 cột.
4. Mở **phiên Claude Code mới**, rồi thử trên cale.io.vn:
   - Nút 🌐 **EN/VI** và nút ☾/☀ **sáng/tối** ở góc phải menu.
   - `/viec-lam` tự chuyển sang `/for-workers`.
   - Trang người lao động có nút "Đăng ký để nhận ca".
5. **Việc tiếp theo đề xuất: P2-1 cọc worker** (mục 4). Điều kiện trước là webhook so
   số tiền, đã xong.

## 1. Trạng thái
- `main` = `3c778f7` (và commit docs này). Đã lên cale.io.vn, đã kiểm trên production.
- Mỗi tính năng một nhánh, đều đã merge:

| Nhánh | Nội dung | Merge |
|---|---|---|
| `fix/payos-webhook-amount` | Webhook PayOS so số tiền (0027) | `395c060` |
| `fix/home-nav-find-shift` | Menu khách bỏ "Tìm ca làm" | `16f2074` |
| `feat/en-paths-worker-signup` | Đường dẫn EN + nút đăng ký worker + VI/EN đợt 1 | `4cf7e82` |
| `feat/dark-mode` | Giao diện sáng / tối | `3c778f7` |

- Gate lần cuối:
  - `tsc` 0 lỗi; lint 0 lỗi (7 cảnh báo có sẵn).
  - `test:run` 810/810; e2e 136/136; build OK.
  - Mọi route render theo request (ƒ) — xem mục 2.3.

## 2. Đã làm

### 2.1 Webhook PayOS so số tiền — migration `20260930000027_payos_webhook_amount_check.sql`
- `payos-webhook` gọi RPC mới `credit_wallet_from_payos(order_code, data.amount,
  data.reference, data.paymentLinkId)` (chỉ service_role).
- **Chỉ cộng ví khi đủ 4 điều kiện:** đơn PENDING, số tiền khớp, có mã giao dịch, đúng
  payment link. PayOS gửi lại cùng giao dịch → không cộng lần hai.
- **Các trường hợp khác KHÔNG cộng ví:** đặt `payment_orders.needs_review = true` +
  `review_reason`, webhook vẫn trả 200. Các lý do:
  - `AMOUNT_MISMATCH` — số tiền nhận khác số tiền đơn;
  - `MISSING_REFERENCE` — webhook không có mã giao dịch;
  - `LINK_MISMATCH` — sai payment link;
  - `ORDER_NOT_PAYABLE` — tiền về cho đơn đã huỷ / hết hạn;
  - `EXTRA_PAYMENT` — chuyển lần hai cho đơn đã cộng;
  - `ALREADY_FLAGGED` — giao dịch mới cho đơn đang chờ admin.
- **Cột mới:** `paid_amount`, `provider_txn_ref` (unique, = `data.reference`),
  `needs_review`, `review_reason`. `provider_ref` vẫn là paymentLinkId.
- `credit_wallet_from_payment` (thân 0026 giữ nguyên) chặn `ORDER_NEEDS_REVIEW` → đơn đã
  đánh dấu không cộng được qua mock-confirm / script / tay.
- **Đã kiểm:**
  - Chạy thử 16 kịch bản trên DB thật (transaction + rollback).
  - security-reviewer 2 lượt: lượt 1 có 2 mục Trung bình → đã sửa; lượt 2 không còn.
  - Sau push: quyền đúng, 0 đơn bị đánh dấu. Gọi thử webhook: không data → 200, sai
    chữ ký → 401.
- ⚠️ **Lần nạp thật đầu tiên:** kiểm đơn đó có `provider_txn_ref`, `paid_amount`,
  `needs_review = false`. Nếu nhiều đơn bị `LINK_MISMATCH` / `MISSING_REFERENCE` → PayOS
  gửi khác tài liệu, cần sửa.
- ⚠️ **Admin chưa có UI xem đơn bị đánh dấu.** Xem bằng SQL:
  ```sql
  select order_code, user_id, amount, paid_amount, review_reason, created_at
  from payment_orders where needs_review order by created_at desc;
  ```
  KHÔNG tự đặt `needs_review = false` rồi gọi `credit_wallet_from_payment`: hàm đó cộng
  `amount` của đơn (kèm thưởng), không phải `paid_amount`.

### 2.2 Menu, đường dẫn, nút đăng ký worker
- **Menu khách:**
  - Bỏ mục "Tìm ca làm" riêng, trên cả desktop lẫn mobile.
  - Lối tìm ca chỉ còn trong dropdown "Người lao động" và menu tài khoản worker.
- **Đường dẫn:** `/viec-lam` → `/for-workers`, `/tuyen-dung` → `/for-employers`.
  Redirect 308 vĩnh viễn nằm trong `next.config.ts`.
- **Hero `/for-workers`:**
  - Nút chính "Đăng ký để nhận ca" (→ `/register?role=worker`).
  - Nút phụ "Xem ca đang tuyển".
  - Dòng "Đã có tài khoản? Đăng nhập".
- **e2e `29-role-homepages`:** kiểm nút đăng ký worker và redirect đường dẫn cũ.

### 2.3 Nút VI / EN — đợt 1 (trang công khai)
- **Cơ chế:**
  - Cookie `cale.lang` (mặc định `vi`). Root layout đọc cookie, đặt `<html lang>`,
    bọc `LocaleProvider`.
  - Nút `LanguageToggle` đổi ngôn ngữ bằng `router.refresh()`.
- **Code:**
  - `src/i18n/locale.ts`, `LocaleProvider.tsx` (`useT` / `useTx`), `server.ts`
    (`getT` / `getTx`).
  - `src/i18n/en.ts` gồm hai phần:
    - `en`: bản dịch theo khoá;
    - `enText`: dịch theo câu tiếng Việt còn viết cứng (menu, footer, bảng giá). Nhờ
      vậy hằng `NAV_GROUPS` và các test cũ giữ nguyên.
- **Đã dịch:** NavBar, MobileNav, Footer, `/`, `/for-workers`, `/for-employers`,
  `/pricing`, `/login`, `/register`, `/forgot-password`.
- **Chưa dịch** (tự hiện tiếng Việt): thẻ ca, lỗi server (`errorMap`), toast,
  dashboard, ví, admin, cẩm nang, các trang thông tin khác → **đợt 2**.
- **Test `i18nEnglish.test.ts`:** báo lỗi khi thiếu bản dịch, có khoá lạ trong
  `en.ts`, hoặc có `VNĐ` / `₫`.
- **Test server component async:** dùng `render(await Page())` + mock
  `@/i18n/server` (xem `mockPayment.test.tsx`).
- **Đánh đổi:** vì layout đọc cookie, mọi route render theo request (ƒ), không còn
  trang tĩnh. Chấp nhận được vì dữ liệu vốn tải ở client.
- **Cách làm đợt 2 cho một màn:**
  1. Đổi `import { t } from '@/i18n/vi'` thành `const t = useT()` (client), hoặc
     `const t = await getT()` (server, component phải async).
  2. Chữ viết cứng bọc bằng `tx('…')`.
  3. Thêm bản dịch vào `en.ts`.
  4. Thêm file vào `PHASE1_FILES` trong `i18nEnglish.test.ts`.
- ⚠️ Bản dịch do AI viết, **nhờ người đọc lại** trước khi quảng bá (nhất là bảng giá).

### 2.4 Giao diện sáng / tối
- **Cơ chế:**
  - `<html data-theme="dark">`, cookie `cale.theme` (mặc định sáng).
  - Root layout đặt sẵn ở server → mở trang không nháy trắng.
  - Nút `ThemeToggle` đổi ngay, không cần tải lại.
- **Chỉ đổi biến màu:** khối `:root[data-theme="dark"]` cuối `globals.css`,
  **không dùng `dark:`**.
  - Nền, bề mặt và thang xám được đảo.
  - Cam thương hiệu giữ nguyên.
  - Màu trạng thái: nền pha tối, chữ sáng (tới sắc 950).
- **Các quy tắc giữ tương phản:**
  - Khối cam và khối mực giữ bảng màu bản sáng bên trong; khối mực vẫn tối.
  - `text-white` luôn trắng, và nền đậm trên chính phần tử đó giữ tông đậm.
  - Chữ trên ảnh có lớp phủ `from-black` giữ màu sáng.
  - Nền mờ sau hộp thoại luôn tối.
- **Đã kiểm:** đo tương phản tự động 34 màn (công khai + worker / employer / admin), không
  còn chữ dưới 3:1. e2e nút sáng/tối. Quy tắc chi tiết ghi ở DESIGN.md mục "Giao diện tối".
- **Thêm màu hex / gradient mới trong CSS** thì phải thêm bản tối vào khối dark.

### 2.5 Công cụ Claude Code dùng chung (`.claude/`)
- 4 agent: `security-reviewer`, `e2e-runner`, `tdd-guide`, `build-error-resolver`.
- 3 lệnh: `/verify`, `/tdd`, `/checkpoint`.
- `CLAUDE.md` mục 0 quy định lúc nào tự dùng; mô tả ở `.claude/README.md`.

## 3. Đối chiếu feedback của cô (HANDOFF 09-28, mục 1)

| Nhóm | Tình trạng |
|---|---|
| F1 lề · F2 màu · F3 bớt chữ/ảnh · F4 trang chủ tách vai trò · F5 đăng ca bớt lặp · F6 nhãn lịch · F7 admin · F8 bảng giá | ✅ xong (P0/P1, PR #8 #9) |
| F10 nạp 500 được 600 | ✅ thưởng nạp ví (0026), **đang tắt**, chờ kiểm tay |
| F12 miễn phí theo đợt | ✅ (0025), **đang tắt** |
| F9 xác thực worker + **cọc 2 đầu** | CCCD + admin duyệt có từ trước; **cọc worker CHƯA code** (đã chốt, mục 4) |
| F11 parttime dài hạn | Hoãn (chủ dự án chốt 29/09) |
| F13 kinh doanh / pháp lý / marketing | Việc của team, checklist ở HANDOFF 09-28 mục 4 |
| Thêm (ngoài danh sách) | Webhook so số tiền, VI/EN, sáng/tối, đường dẫn EN |

## 4. Việc tiếp theo (theo thứ tự)
1. **Kiểm tay thưởng nạp ví trên production** (HANDOFF P2-2 mục 3: bật → nạp thật
   500.000 → đăng ca → huỷ → tắt). Đây cũng là lần nạp thật đầu tiên qua webhook mới →
   kiểm luôn mục 2.1 ⚠️.
2. **P2-1 cọc worker** — thiết kế đã chốt ở HANDOFF 09-28 mục 3 (P2-1) + mục 5 câu 4:
   - Cọc = 50% tiền công ca, tối đa 100.000 đ.
   - Miễn cọc: đã duyệt CCCD, hoặc ≥5 ca hoàn thành trong 30 ngày gần nhất.
   - Vắng mặt không báo → 100% cọc về NTD sau 24h (khiếu nại → admin quyết), và mất
     quyền miễn 30 ngày. Tự huỷ trước ca → hoàn đủ.
   - Cờ mặc định TẮT. Migration mới 0028+, chạy thử transaction + rollback,
     `/verify pre-pr` + security-reviewer trước `db push`.
3. **UI admin cho đơn nạp `needs_review`** + hiện "Đang kiểm tra giao dịch" cho người nạp
   (`get_payment_order_status` chưa trả trường này).
4. **VI/EN đợt 2:** dashboard, ví, thẻ ca, `errorMap`, admin, cẩm nang.
5. Còn mở từ trước: chụp production trang Đăng ca / Tổng quan admin bằng tài khoản thật
   (HANDOFF 09-28 mục 7).

## 5. Lưu ý môi trường (Windows)
- `next dev` ở :3000 giữ khoá `.next` → chạy Playwright (dev server :3100) phải tắt
  dev server kia trước.
- Turbopack đôi khi giữ CSS cũ sau khi sửa `globals.css` → xoá `.next/dev` + `.next/cache`
  rồi chạy lại.
- Worktree có junction `node_modules`: **xoá junction trước** (`cmd /c rmdir <wt>\node_modules`)
  rồi mới `git worktree remove`, nếu không sẽ xoá sạch `node_modules` của repo chính
  (đã xảy ra 30/09, sửa bằng `npm ci`).
- Pane trình duyệt dev bị ẩn: `/register` có thể kẹt nội dung Suspense (lỗi môi
  trường, bản build chạy đúng); chụp màn hình có thể timeout → kiểm bằng JS/đo đạc.
