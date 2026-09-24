# HANDOFF — Session 2026-09-23 (PayOS: nạp tiền THẬT + mock mode)

> Bàn giao cho partner. Đọc kèm `CLAUDE.md`, `HANDOFF.md`,
> `HANDOFF_SESSION_2026-09-23.md` (ví hybrid mô phỏng — nền tảng của session này).
>
> **Session này chuyển từ "ví mô phỏng" sang tích hợp THANH TOÁN THẬT qua PayOS,
> nhưng có MOCK MODE để chạy full luồng ngay mà KHÔNG cần tài khoản ngân hàng /
> PayOS account.** Cắm tài khoản thật sau chỉ là đổi vài secret.

---

## 1. Quyết định sản phẩm (chốt trong session)

- Làm **payment thật** qua **PayOS** (cổng VN dễ tích hợp nhất, cá nhân đăng ký
  bằng CCCD được — có cả Kênh thu/nạp lẫn Kênh chi/payout).
- Quy mô pilot nhỏ (~2 tháng, tổng dòng tiền ~2 triệu) → rủi ro pháp lý/thuế thực
  tế không đáng kể; rủi ro duy nhất là ngân hàng gắn cờ TK cá nhân nếu pattern
  giao dịch dày. Khuyến nghị: dùng 1 TK riêng, giữ tiền càng ngắn càng tốt.
  **Trước khi scale/gọi vốn phải lập pháp nhân + xin giấy phép trung gian thanh toán.**
- Làm **từng bước**: Bước 1 (DB) ✅ · Bước 2 (nạp thật + mock) ✅ · **Bước 3
  (payout Kênh chi) CHƯA làm**.

---

## 2. Đã làm session này (chưa merge main — nằm ở branch `feat/payos-real-payment`)

### 2.1 DB — migration `0016` (ADDITIVE, chưa apply)
File: `supabase/migrations/20260923000016_real_payment_payos.sql`
- Cột mới `worker_profiles`: `bank_bin`, `bank_account_number`, `bank_account_name`
  (STK worker nhận payout — dùng cho Bước 3).
- Bảng `payment_orders` — đơn NẠP thật (PENDING→PAID), unique `order_code`.
- Bảng `payout_orders` — đơn CHI thật (Kênh chi), có `idempotency_key`.
- RLS: client CHỈ đọc đơn của mình; ghi tiền chỉ qua service_role/RPC definer.
- RPC `credit_wallet_from_payment(order_code)` — cộng ví THẬT, **idempotent**
  (chỉ `service_role` gọi, từ webhook). Dùng lại `_wallet_apply`/`_bank_apply` 0012.
- RPC `get_payment_order_status(order_code)` — client poll trạng thái.

### 2.2 Edge Functions (Deno) — `supabase/functions/`
- `_shared/payos.ts` — ký/verify HMAC-SHA256 PayOS, CORS, helper.
- `create-payment/index.ts` — verify JWT → tạo `payment_orders` → **nếu
  `PAYOS_MOCK=true` thì trả QR giả** (không gọi PayOS), ngược lại gọi PayOS thật.
  Có action `mock-confirm` (chỉ khi mock) cộng ví ngay thay cho webhook.
- `payos-webhook/index.ts` — PayOS gọi (không JWT) → **verify chữ ký** →
  `credit_wallet_from_payment`. `verify_jwt=false` đã set trong `config.toml`.

### 2.3 Client
- `src/data/repos/paymentRepo.ts` — `createPayment`, `getPaymentOrderStatus`,
  `confirmMockPayment`.
- `src/stores/walletStore.ts` — `createRealTopUp`, `pollRealTopUp`,
  `confirmMockTopUp`.
- `src/components/wallet/WalletPanel.tsx` — bước QR thật: hiện QR + (thật) link
  PayOS / (mock) banner "MÔ PHỎNG" + nút "Tôi đã chuyển khoản". **Không dùng
  timer** (poll theo nút bấm). Gắn sau cờ `NEXT_PUBLIC_PAYOS_ENABLED`.
- `src/types/index.ts` — bank fields cho `Worker` + type `PaymentOrder`/`PayoutOrder`.
- `.env.example` — tài liệu hoá tất cả biến PayOS + hướng dẫn test mock.

### 2.4 Gate (đã chạy, xanh)
`tsc` ✅ · `eslint src/` ✅ · `build` ✅ (route không đổi) · `test:run` **716 pass**
(3 fail handbook CÓ SẴN, không liên quan).

---

## 3. CÁCH TEST NGAY — MOCK MODE (không cần PayOS account / STK)

Không đăng ký gì, chạy full luồng nạp tiền (nhập số → QR → "đã chuyển khoản" →
ví cộng tiền):

1. Apply migration 0016 (Supabase Dashboard → SQL Editor, dán nội dung file).
2. Bật mock ở Edge Function + deploy:
   ```bash
   supabase secrets set PAYOS_MOCK=true
   supabase functions deploy create-payment
   supabase functions deploy payos-webhook   # (không bắt buộc cho mock, nhưng nên deploy sẵn)
   ```
3. Bật UI PayOS (client): đặt trên Vercel (hoặc `.env.local`):
   ```
   NEXT_PUBLIC_PAYOS_ENABLED=true
   ```
   rồi redeploy / restart dev.
4. Vào ví → "Nạp tiền" → nhập số → thấy QR + banner **MÔ PHỎNG** → bấm
   "Tôi đã chuyển khoản (mô phỏng)" → số dư ví tăng.

> Mock mode: QR là mã giả (đánh dấu `realTransaction:false`), tiền cộng qua RPC
> `credit_wallet_from_payment` — vẫn đi đúng đường tiền thật sau này sẽ đi.

## 4. KHI CÓ TÀI KHOẢN THẬT — chuyển sang real

1. Đăng ký PayOS (Kênh thu + Kênh chi) bằng CCCD → lấy `Client ID`, `API Key`,
   `Checksum Key`. Hỏi PayOS: có sandbox Kênh chi không + phí payout.
2. Cắm secret + tắt mock:
   ```bash
   supabase secrets set PAYOS_MOCK=false \
     PAYOS_CLIENT_ID=... PAYOS_API_KEY=... PAYOS_CHECKSUM_KEY=... \
     PAYOS_RETURN_URL=https://cale.io.vn/worker/dashboard \
     PAYOS_CANCEL_URL=https://cale.io.vn/worker/dashboard
   supabase functions deploy create-payment
   supabase functions deploy payos-webhook
   ```
3. Khai webhook URL trong dashboard PayOS:
   `https://<project-ref>.supabase.co/functions/v1/payos-webhook`
4. Giữ `NEXT_PUBLIC_PAYOS_ENABLED=true`. Xong — luồng nạp giờ là tiền thật.

> Chưa làm gì ở mục 3/4 → app vẫn chạy nguyên luồng nạp mô phỏng cũ (cờ tắt).

---

## 5. Bảo mật (giữ đúng chuẩn repo)
- Secret PayOS **chỉ ở Edge Function** (`supabase secrets`), KHÔNG `NEXT_PUBLIC_`,
  KHÔNG commit. `NEXT_PUBLIC_PAYOS_ENABLED` chỉ là cờ bật UI, không phải secret.
- Ví **chỉ tăng khi webhook đã verify chữ ký** (thật) hoặc qua mock-confirm có
  guard chủ đơn (mock). Client không tự khai đã trả.
- Idempotent theo `order_code` → webhook gửi lặp không cộng 2 lần.
- Migration additive, KHÔNG sửa 0001–0015.

---

## 6. Cập nhật 24/09/2026 — Rút tiền THẬT + trả công/hoàn cọc tiền thật

### 6.1 Rút tiền về ngân hàng (worker + employer) — migration 0017
- Ví → nút "Rút tiền" → chọn ngân hàng + STK + tên → Edge Function `withdraw`
  → `begin_withdrawal` (trừ ví, `payout_orders` PENDING) → PayOS Kênh chi
  `POST /v1/payouts`. Thất bại rõ ràng (FAILED/CANCELLED…) → `settle_withdrawal`
  hoàn ví đúng 1 lần. Lỗi mạng → PROCESSING (không hoàn), nút "Kiểm tra".
- `wallet_top_up`/`wallet_withdraw` (mô phỏng) đã bị revoke.
- Secrets (đặt bằng `npx supabase secrets set`, KHÔNG commit):
  `PAYOS_PAYOUT_CLIENT_ID`, `PAYOS_PAYOUT_API_KEY`, `PAYOS_PAYOUT_CHECKSUM_KEY`
  (bộ key RIÊNG của Kênh chi), `PAYOS_PAYOUT_PROXY_URL`, tuỳ chọn
  `PAYOS_PAYOUT_DESCRIPTION` (chỉ chữ+số, mặc định CALE).
- **IP cố định**: Kênh chi PayOS bắt buộc whitelist IP; Edge Function không có
  IP cố định → lệnh chi đi qua proxy tinyproxy trên VPS (chỉ cho tới
  `api-merchant.payos.vn:443`, có BasicAuth). Cài bằng
  `supabase/scripts/setup-payout-proxy.sh`; IP VPS đã khai trong Kênh chi.
  Chạy lại script = mật khẩu proxy MỚI → phải set lại `PAYOS_PAYOUT_PROXY_URL`.
- **Vận hành**: tiền nạp vào TK THU (BIDV), tiền chi lấy từ ví **Bảo Kim** (TK
  CHI). PayOS KHÔNG tự chuyển thu → chi → phải nạp quỹ Bảo Kim trước (pilot:
  nạp sẵn 1–2 triệu). Bảo Kim hết tiền → lệnh rút báo "Số dư tài khoản không
  đủ…" và tiền tự hoàn về ví người dùng.

### 6.2 Trả công / vắng mặt / hoàn cọc — migration 0018
- Trả công **ngay khi employer xác nhận từng người** (không chờ cả ca), mỗi đơn
  1 lần (unique index `wallet_ledger_wage_once_idx`).
- RPC mới `employer_mark_no_show` (nút "Đánh dấu vắng mặt" đã bật ở supabase,
  có hỏi xác nhận, KHÔNG hoàn tác). Sau giờ bắt đầu + 15 phút.
- Chốt cọc khi hết người đang làm: hoàn về ví employer phần
  `amount − tiền công đã trả − phí 10% tương ứng` (vị trí trống/vắng không mất phí).
- `refund_deposit_for_shift`: ca huỷ → hoàn ngay; ca hết hạn → chỉ sau giờ kết
  thúc + 60 phút và không còn ai CheckedIn/CheckedOut.
- `edit_shift` chặn tăng giờ/số vị trí vượt tiền cọc (`DEPOSIT_TOO_LOW`) và cập
  nhật tiền công người đã duyệt theo giờ mới.
- Đã revoke khỏi authenticated (lỗ hổng tiền thật): `publish_shift` (đăng ca
  không cọc), `create_payment_session`/`confirm_payment_session` (0009, phiên
  HELD không trừ ví), `release_mock_payment`,
  `employer_confirm_completion_before_payment_release`, `edit_shift_before_deposit_guard`.
- Ghi chú ví bỏ chữ "(mô phỏng)".

### 6.3 CHƯA LÀM
1. Tự xác nhận hoàn thành sau X giờ nếu employer không bấm (cần job định kỳ
   phía server) — hiện worker phụ thuộc employer bấm xác nhận.
2. Vắng mặt ở server chưa trừ điểm uy tín / chưa có "đến muộn → có mặt".
3. Cảnh báo admin khi Kênh chi hết số dư.
4. `npm run test:payment` (scripts/payment-integration.mjs) còn gọi RPC mô phỏng
   đã revoke → cần viết lại.
5. Trang admin đối soát `payment_orders`/`payout_orders`; các trang tĩnh còn
   chữ "mô phỏng".

---

## 7. Ràng buộc (giữ nguyên)
- AI KHÔNG push `main` (deploy prod Vercel) → **partner tự merge/push main**.
  Session này push lên branch `feat/payos-real-payment`.
- KHÔNG commit `.env*`/key. KHÔNG sửa migration đã apply (0001–0018).
- RPC: security definer, `search_path=''`, revoke public/anon + grant đúng vai trò.
- Tiền tệ `đ`/`đồng` (cấm `VNĐ`/`₫`). Tiền trong ví giờ là TIỀN THẬT.
