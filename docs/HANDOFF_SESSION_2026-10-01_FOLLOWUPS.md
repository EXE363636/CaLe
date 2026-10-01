# HANDOFF — Session 2026-10-01 (việc tiếp sau 0029)

> Đọc kèm `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-10-01_PAYMENT_REVIEW.md` (0029, đã
> `db push` + merge `main` = `966dd7e`).

## Partner cần làm sau khi pull
1. Ba nhánh xếp chồng, merge đúng thứ tự (mỗi nhánh tách từ nhánh trước):
   1. `feat/payos-hardening` — migration **0030** (mục A);
   2. `feat/payment-review-notify` — migration **0031** (mục B);
   3. `feat/i18n-phase2` — không đụng DB (mục C).
2. **0030, 0031 CHƯA `db push`.** Thứ tự cho mỗi migration:
   1. chạy thử: `bash supabase/dryrun/run-00NN.sh` (mọi dòng "ok");
   2. chủ dự án duyệt;
   3. `npx supabase db push` (người làm);
   4. kiểm sau push (mục A.5 / B.5);
   5. merge nhánh vào `main`.
3. **Deploy Edge Function (người làm) sau khi push 0030:**
   ```bash
   npx supabase functions deploy admin-users
   npx supabase functions deploy create-payment
   ```
   `payos-webhook` KHÔNG đổi, không cần deploy.

---

## A. Gia cố webhook PayOS + chặn xoá người có lịch sử tiền (0030)

Nhánh `feat/payos-hardening` (tách từ `main` = `966dd7e`).
Migration `supabase/migrations/20261001000030_payos_hardening.sql`.

### A.1 Đóng các mục "còn mở" của handoff 10-01 mục 5.4
| Mục cũ | Sửa |
|---|---|
| `paid_amount` vượt int4 → RPC lỗi → webhook 500 lặp | `credit_wallet_from_payos` nhận `p_paid_amount numeric` (bỏ bản `integer`). Số không nguyên / ngoài [1, 2.147.483.647] → coi như không có số tiền (AMOUNT_MISMATCH, admin chỉ "Không cộng" được). Webhook gọi theo tên tham số → không cần deploy. |
| Mã giao dịch PayOS dùng lại ở đơn khác → vi phạm unique → 500 lặp | Lý do mới **`DUPLICATE_TXN_REF`**: không gắn mã vào đơn, ghi dòng cho admin. Cộng dòng đó bị chặn `DUPLICATE_SUSPECT` khi mã đã được xử ở đơn khác (tự động / admin cộng / admin "Không cộng"). |
| Đơn PAID trước 0027 nuốt mọi giao dịch mới thành ALREADY_PAID | Chỉ coi là "PayOS gửi lại" khi đơn được trả trong 24 giờ qua; muộn hơn → EXTRA_PAYMENT có dòng. Dòng cùng số tiền đơn → nghi trùng. Production có đúng 1 đơn như vậy (24/09, 50.000 đ). |
| `get_payment_order_status` phân biệt NOT_OWNER / ORDER_NOT_FOUND | Cả hai là `ORDER_NOT_FOUND`. `create-payment` (mock-confirm) cũng vậy. |
| Xoá người dùng có ví tiền thật được (ví, sổ ví bị xoá theo) | Trigger `users_block_delete_with_money` trên `public.users` → `USER_HAS_MONEY_HISTORY` khi có: sổ ví, ví ≠ 0, **bất kỳ** đơn nạp nào, dòng kiểm tra, đơn chi, cọc người lao động. `admin-users` kiểm trước qua `_user_has_money_history` để báo lỗi rõ (chuỗi mới trong `vi.ts`). Admin dùng "Khoá tài khoản". |

### A.2 security-reviewer
- **Lượt 1:** 3 mục Trung bình + 6 mục Thấp. Đã sửa:
  - M1: hai admin cộng cùng lúc 2 dòng cùng mã ở 2 đơn → cộng trùng. Sửa: khoá
    advisory theo mã (`_payos_txn_lock`) trong webhook và trong
    `admin_resolve_payment_review` (định nghĩa lại, thân như 0029 + khoá).
  - M2: mã đã "Không cộng" (hoàn tay) ở đơn khác vẫn cộng được → tính nghi trùng.
  - M3: người chỉ có đơn nạp chưa trả / đã huỷ vẫn xoá được → mọi đơn nạp chặn xoá.
  - L1 (500 tạm thời khi 2 webhook cùng mã), L2 (nhận diện đơn PAID kiểu cũ bằng
    mốc thời gian), L3 (`paidByReview` cho đơn cộng qua dòng mã trùng), L5
    (mock-confirm).
- **Lượt 2:** không có Nghiêm trọng / Cao / Trung bình; đã kiểm thứ tự khoá, không
  deadlock. Thứ tự khoá: đơn → dòng kiểm tra → khoá mã → ví → két.

### A.3 Kiểm tra
- Domain `src/domain/paymentReview.ts` (TDD): `toPaidAmountInt`, `isLegacyPaidRetry`,
  `isDuplicateSuspect(..., { txnRefResolvedElsewhere, legacyCreditedAmount })`.
- Gate: tsc 0 · lint 0 lỗi (7 cảnh báo có sẵn) · `test:run` 922/922 · `test:time` 22/22
  · build OK (33 trang) · e2e 136/136.
- **Chạy thử DB thật (transaction + rollback): `bash supabase/dryrun/run-0030.sh` →
  24/24.** Kịch bản 0029 chạy lại trên nền 0030: 47/48, chỉ 08c đổi
  (NOT_OWNER → ORDER_NOT_FOUND, có chủ ý). Sau đó DB không còn tài khoản / hàm thử.

### A.4 Còn mở (Thấp, đã chấp nhận)
- Admin "Không cộng" nhầm một dòng có mã → dòng hợp lệ cùng mã ở đơn khác bị nghi trùng
  vĩnh viễn, chỉ xử ngoài hệ thống. An toàn về tiền; câu nhắc đã thêm vào màn admin.
- `scripts/payment-integration.mjs`, `scripts/attendance-integration.mjs`
  (`npm run test:payment` / `test:attendance`) **không dọn được user test nữa** (user
  test luôn có sổ ví → trigger chặn xoá). Chỉ chạy trên DB không có tiền thật, hoặc
  sửa script: đưa ví test về 0 có ghi sổ rồi khoá thay vì xoá.
- `system_bank.balance` / `wallets.balance` là `integer`: két vượt ~2,147 tỷ đồng thì
  `_bank_apply` tràn → webhook 500 lặp. Nên lên migration chuyển `bigint`.
- Đơn kiểu cũ / mock có dòng thêm được cộng tay → poll hiện "đã kiểm tra và cộng"
  (chỉ hiển thị).

### A.5 Kiểm sau `db push` 0030 (chỉ đọc)
- `migration list`: 0030 có ở cả 2 cột.
- Quyền:
  - `credit_wallet_from_payos(bigint, numeric, text, text)`: chỉ `service_role`;
    bản `(bigint, integer, …)` không còn.
  - `_payos_txn_lock`, `_payment_review_duplicate_suspect`, `_user_has_money_history`,
    `_users_block_delete_with_money`: không cấp cho `anon` / `authenticated`.
  - Trigger `users_block_delete_with_money` có trên `public.users`.
- **Webhook qua PostgREST** (chạy thử SQL không đi qua lớp này): trên trang PayOS gửi
  webhook thử → phải nhận 200 (`unknown-order (ack)`), không phải 500.
- Sau deploy `admin-users`: xoá thử một tài khoản có đơn nạp → báo "đã có giao dịch tiền
  thật… dùng Khoá tài khoản".
