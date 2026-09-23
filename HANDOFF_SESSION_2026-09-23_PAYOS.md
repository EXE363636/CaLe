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

## 6. CHƯA LÀM / việc tiếp theo (Bước 3+)

1. **Payout THẬT (Kênh chi)** — quan trọng nhất:
   - Form worker khai STK (cột DB đã có ở 0016, type đã có; thiếu UI ở
     `worker/profile`).
   - Edge Function `create-payout`: xong ca + employer xác nhận → gọi PayOS Kênh
     chi ra STK worker, kèm `X-Idempotency-Key`, ghi `payout_orders`.
   - Edge Function `create-refund`: ca huỷ/hết hạn → chi hoàn về employer.
   - Nối vào lifecycle hiện có (`release_deposit` / `refund_deposit_for_shift`).
   - **Lưu ý mô hình**: nạp thật làm tăng ví; nhưng payout thật rút tiền ra khỏi
     TK ngân hàng thật, KHÁC với "trừ ví mô phỏng". Cần quyết cách đối soát
     ví-vs-tiền-thật trước khi code (chưa chốt).
2. **i18n hoá** chuỗi mới (đang hardcode trong WalletPanel/paymentRepo).
3. **Đối soát**: trang admin xem `payment_orders`/`payout_orders`.

---

## 7. Ràng buộc (giữ nguyên)
- AI KHÔNG push `main` (deploy prod Vercel) → **partner tự merge/push main**.
  Session này push lên branch `feat/payos-real-payment`.
- KHÔNG commit `.env*`/key. KHÔNG sửa migration đã apply.
- RPC: security definer, `search_path=''`, revoke public/anon + grant đúng vai trò.
- Tiền tệ `đ`/`đồng` (cấm `VNĐ`/`₫`). Màn tiền mô phỏng ghi "MÔ PHỎNG".
