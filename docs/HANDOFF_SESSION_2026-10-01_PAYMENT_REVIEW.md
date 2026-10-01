# HANDOFF — Session 2026-10-01 (admin xử giao dịch nạp cần kiểm tra, 0029)

> Đọc kèm `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-09-30_WEB.md` mục 2.1 (webhook 0027)
> và `docs/HANDOFF_SESSION_2026-09-30_P2-1.md` (phần trước: cọc người lao động, đã merge).

## Partner cần làm sau khi pull
1. Kéo nhánh (chưa merge vào `main`):
   ```bash
   git fetch origin
   git checkout feat/payment-review
   git pull origin feat/payment-review
   ```
   Sau đó chạy `graphify update .`. Không thêm dependency mới.
2. **`main` đã có P2-1 cọc người lao động** (`e45942a`, 0028 đã `db push` 01/10, cờ
   vẫn TẮT). Xem `docs/HANDOFF_SESSION_2026-09-30_P2-1.md`.
3. **0029 CHƯA `db push`.** Đừng merge nhánh này vào `main` trước khi push DB: màn admin
   gọi RPC chưa có thì sẽ báo lỗi tải. Thứ tự:
   1. kiểm chỉ đọc (mục 5.1);
   2. chủ dự án duyệt;
   3. `npx supabase db push`;
   4. kiểm sau push (mục 5.2);
   5. merge.
4. Thử nhanh trên production sau khi push:
   - Tab Thống kê của admin không hiện thẻ mới khi chưa có giao dịch nào bị đánh dấu.
   - Nạp ví vẫn chạy như cũ.

## 0. Trạng thái
- Nhánh `feat/payment-review` (tách từ `main` = `e45942a`, đã có P2-1), đã push; chưa
  merge.
- Migration **`20261001000029_payment_review.sql` CHƯA `db push`**.
- Gate:
  - tsc 0 · lint 0 lỗi (7 cảnh báo có sẵn);
  - `test:run` 915/915 · `test:time` 22/22 · build OK (33 trang);
  - e2e 136/136 (1 test chập chờn lúc máy tải nặng, chạy lại riêng thì đạt).
- **Chạy thử trên DB thật (transaction + rollback): 48/48 đạt.** Sau đó kiểm DB:
  không có bảng / hàm / tài khoản `dryrun-` nào còn lại.
- **security-reviewer 2 lượt:**
  - Lượt 1: 2 mục Trung bình + 7 mục Thấp. Đã sửa các mục thuộc diff (mục 4).
  - Lượt 2: chỉ còn mục Thấp (mục 6).

## 1. Quy tắc (chủ dự án chốt 01/10)
- **Cộng tay:**
  - Cộng đúng **số tiền PayOS báo nhận** (`paid_amount`), không phải số tiền đơn.
  - **Không có thưởng nạp ví.**
- **"Không cộng (đã xử lý ngoài)"** chỉ là ghi nhận. Admin tự hoàn tiền cho người
  chuyển qua ngân hàng; CaLẻ không tự hoàn.
- **Màn admin** nằm ở tab Thống kê, ẩn khi không có giao dịch nào.

## 2. Server (0029)
- **Bảng `payment_review_items`:**
  - Mỗi giao dịch bị webhook đánh dấu là một dòng: đơn, người nạp, lý do, `paid_amount`,
    `txn_ref`, trạng thái `Pending → Credited | Dismissed`, ghi chú, admin xử.
  - Không cấp quyền bảng cho client; RLS bật, không có policy. Chỉ đọc / ghi qua RPC.
  - FK `on delete restrict`: người dùng có giao dịch kiểm tra thì không xoá được.
- **Backfill** tách `review_reason` của các đơn đã bị đánh dấu thành từng dòng. Còn đơn
  nào không tách được → migration **dừng** (`PAYMENT_REVIEW_BACKFILL_INCOMPLETE`).
- **`credit_wallet_from_payos`:** thân giữ như 0027, thêm 2 điểm:
  - Ghi thêm một dòng, chống trùng khi PayOS gửi lại: cùng mã giao dịch; không có mã
    thì cùng số tiền.
  - Đơn PAID chưa có mã giao dịch chỉ được coi là "gửi lại" khi **chưa từng bị đánh
    dấu**. Nhờ vậy giao dịch mới cho đơn admin đã cộng vẫn thành dòng, không bị nuốt.
  - Edge Function `payos-webhook` không đổi, không cần deploy.
- **Người nạp:**
  - `get_payment_order_status` trả thêm 3 cờ:
    - `needsReview`: còn dòng chờ;
    - `reviewed`: đơn có dòng bất kỳ;
    - `paidByReview`: đơn PAID do admin cộng.
  - `get_my_payment_reviews()` trả tối đa 20 dòng của chính mình.
- **Admin:** `admin_list_payment_reviews(p_status)` và
  `admin_resolve_payment_review(item, credit, note)`.
  - Ghi chú bắt buộc; người nạp thấy ghi chú.
  - Không xử được giao dịch của chính mình.
  - **Cộng:**
    - ví + két cùng tăng `paid_amount`;
    - sổ ví ghi `UserTopUp` kèm `#order_code`;
    - đơn chưa PAID thì chuyển PAID.
  - **Nghi trùng → `DUPLICATE_SUSPECT`** (`_payment_review_duplicate_suspect`). Cùng một
    lần chuyển có thể sinh 2 dòng khi PayOS gửi lại thiếu mã.
  - `needs_review` **giữ true mãi**, nên lối cũ `credit_wallet_from_payment` (cộng
    `amount` + thưởng) vẫn bị chặn.
- **Chạy thử:** `bash supabase/dryrun/run-0029.sh`. Kết quả nằm trong thông báo lỗi
  `DRYRUN_RESULT (48 / 48 ok)`.

## 3. Client (chỉ chế độ supabase)
- **Logic thuần** `src/domain/paymentReview.ts` (khớp SQL, có property test):
  - `isDuplicateSuspect`, `paymentReviewCreditBlock` / `paymentReviewDismissBlock`;
  - `shouldRecordReviewItem`, `parseReviewReasonNotes`;
  - `fillTemplate`: điền mẫu câu một lượt, để tên người dùng chứa `{email}` không làm
    giả dòng thông tin.
- **Repo** `src/data/repos/paymentReviewRepo.ts`.
- **Màn QR nạp tiền** (`PayosTopUpQr`), dùng `walletStore.pollRealTopUpState`:
  - đơn đang chờ → "CaLẻ đã nhận giao dịch nhưng cần kiểm tra thêm… không cần chuyển
    khoản lại";
  - admin đã bỏ qua → báo đã xử lý, đừng chuyển lại;
  - đơn đã qua kiểm tra rồi được cộng → toast không ghi số tiền đơn.
- **Ví** (`PaymentReviewNotice` trong `WalletPanel`): giao dịch đang kiểm tra, cộng với
  các giao dịch đã xử lý trong 30 ngày (số đã cộng / ghi chú).
- **Admin, tab Thống kê** (`PaymentReviewList`), thông tin mỗi dòng:
  - lý do; đơn (mã, số tiền, trạng thái); người nạp; số PayOS báo nhận; mã giao dịch;
  - nút "Cộng X vào ví" / "Không cộng (đã xử lý ngoài)".
- **VI/EN:** các màn trên thuộc đợt 2 (chưa dịch).

## 4. security-reviewer lượt 1 — đã sửa
- **M1 — cộng trùng.** Lỗi: cùng một lần chuyển nằm ở dòng có mã (hoặc đã được cộng tự
  động) và cả dòng không mã. Sửa: thêm quy tắc nghi trùng ở server + domain, kịch bản
  25–26.
- **M2 / L1 — backfill.** Sửa: thêm khối kiểm sau backfill (kịch bản 28). Trước
  `db push` phải kiểm các đơn `needs_review` (mục 5).
- **L2 / L3 — client hiện sai.** Lỗi: hiện sai số tiền khi admin cộng trước lần kiểm đầu;
  hiện "chưa nhận được" sau khi bỏ qua. Sửa: thêm cờ `reviewed` từ server.
- **L4 — mẫu câu bị điền tiếp.** Sửa: dùng `fillTemplate` một lượt.
- **L5 — khó truy vết.** Sửa: sổ ví ghi kèm mã đơn.

## 5. Việc tiếp theo
1. **Trước `db push`**, kiểm (chỉ đọc):
   ```sql
   select order_code, user_id, amount, paid_amount, review_reason
   from payment_orders where needs_review;
   ```
   - 01/10 có 0 đơn.
   - Nếu có đơn: đối chiếu `wallet_ledger` xem đơn đó đã được cộng tay chưa. Đã cộng thì
     sau push bấm "Không cộng" kèm ghi chú.
2. **Chủ dự án duyệt → `npx supabase db push`** (người dùng tự chạy) → merge vào `main`.
   Kiểm sau push:
   - `migration list` có 0029 cả 2 cột;
   - quyền hàm: `_payment_review_duplicate_suspect` và `credit_wallet_from_payos`
     không cấp cho `authenticated`;
   - bảng không cấp cho client.
3. **Lần nạp thật đầu tiên** (vẫn là việc mở từ 0027): kiểm đơn có `provider_txn_ref`,
   `paid_amount`, `needs_review = false`, và không sinh dòng nào.
4. **Còn mở, có từ trước 0029** (Thấp, chưa sửa):
   - Đơn PAID trước 0027 (không có mã giao dịch) nuốt mọi giao dịch mới thành
     ALREADY_PAID.
   - Index unique toàn cục `payment_orders.provider_txn_ref`: nếu PayOS dùng lại mã ở
     đơn khác → webhook 500 lặp.
   - `paid_amount` vượt int4 → RPC lỗi → webhook 500 lặp.
   - `get_payment_order_status` phân biệt NOT_OWNER / ORDER_NOT_FOUND.
   - `admin-users` xoá người dùng có giao dịch kiểm tra → lỗi DELETE_FAILED chung chung.
     Người dùng có ví tiền thật nhưng không có ca vẫn xoá được (ví và sổ ví bị xoá theo).
5. **Chưa có:** thông báo (email / in-app server) cho người nạp khi admin xử; người nạp
   xem kết quả trong ví.

## 6. security-reviewer lượt 2
- Không có mục Nghiêm trọng / Cao / Trung bình; M1, M2, L1–L5 đã đóng.
- Còn 3 mục Thấp:
  1. **Backfill vẫn có thể bỏ sót một phần đơn.** Đơn có một đoạn hợp lệ và một đoạn sai
     định dạng thì đoạn sai bị bỏ mà không báo. Xử lý: dựa vào bước kiểm chỉ đọc trước
     `db push` (mục 5.1).
  2. **Quy tắc nghi trùng chặn cả hai lần chuyển thật cùng số tiền.** Đây là lựa chọn an
     toàn có chủ ý. Câu nhắc trên UI hướng dẫn admin bấm "Không cộng" rồi hoàn tay lần
     chuyển thừa.
  3. **Câu "đã kiểm tra và cộng" hiện cả khi đơn được cộng tự động.** Đã sửa: thêm cờ
     `paidByReview` (kịch bản 27b–27e).
