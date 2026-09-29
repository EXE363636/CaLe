# HANDOFF — Session 2026-09-30 (P2-2 thưởng nạp ví + sửa tiêu đề lặp)

> Đọc kèm `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-09-29_P2-3.md` (phần trước) và
> `docs/HANDOFF_SESSION_2026-09-28_FEEDBACK.md` (plan P0–P3).

## ✅ Migration 0026 ĐÃ apply lên DB thật (30/09, hungkobe273)
- File: `supabase/migrations/20260930000026_topup_bonus.sql`.
- `npx supabase db push` sau khi chủ dự án đồng ý. Kiểm sau push:
  - `migration list` có cả local lẫn remote.
  - Chương trình thưởng **TẮT** (`topup_bonus_min/amount/max` = `500000/0/1`).
  - Không ví nào có tiền thưởng, không giao dịch/phiên cọc nào dùng túi thưởng.
  - Hàm mới đã chạy; quyền đúng (chỉ `get_topup_bonus` cho người đăng nhập;
    `credit_wallet_from_payment`, `_promo_apply` không ai gọi thẳng được).
- **Code `main` hiện tại vẫn chạy đúng với DB mới**: khi túi thưởng = 0 mọi hàm
  tiền cho kết quả y hệt trước (đã so thân hàm, chạy thử luồng tiền).

## 0. Trạng thái nhánh (chưa merge)
- `main` = `75755d7`.
- **PR #10** `fix/wallet-withdraw-visible` (nút Rút tiền + P2-3, 0025 đã push) —
  còn mở.
- Nhánh **`feat/p2-topup-bonus`** tách từ `fix/wallet-withdraw-visible` (gồm luôn
  các commit của PR #10), thêm:
  - `90a4716` **fix(ui): bỏ dòng nhãn lặp tiêu đề** — Tổng quan quản trị, Lịch
    tuyển dụng, Lịch cá nhân, Cẩm nang có dòng chữ nhỏ trùng tiêu đề → bỏ; Bảng
    giá / An toàn đổi nhãn sang "Chi phí" / "Hỗ trợ".
  - `478cc04` **feat(wallet): P2-2 thưởng nạp ví** (mục 1).
  - commit docs này.
- **Merge:** merge PR #10 trước, rồi PR của `feat/p2-topup-bonus` (base `main`).
  Hoặc đóng PR #10 và merge thẳng `feat/p2-topup-bonus` (đã chứa đủ).

## 1. P2-2 — thưởng nạp ví (feedback F10)
**Chủ dự án chốt (29–30/09):**
- Nạp ví qua PayOS đủ mức → cộng tiền thưởng (vd nạp 500.000 đ được +100.000 đ).
- **Chỉ nhà tuyển dụng** (tài khoản không bị khoá).
- Tiền thưởng **chỉ trả phí dịch vụ**; không trả tiền công, không rút, **không
  hết hạn**.
- Admin đặt mức nạp / tiền thưởng / **số lần tối đa mỗi NTD (mặc định 1)**.
  Thưởng ≤ 50% mức nạp (chống bấm nhầm). Thưởng = 0 → tắt. Mặc định TẮT.

**Mô hình tiền (két `system_bank` chỉ chứa tiền THẬT):**
- `wallets.promo_balance` = túi thưởng, tách khỏi `balance` (tiền mặt). Rút tiền
  chỉ đụng `balance`. Sổ ví có cột `pocket` ('cash' | 'promo').
- Nạp: tiền mặt +, két +; túi thưởng +thưởng, két không đổi.
- Giữ cọc: thưởng trả **phí** trước (≤ phí), còn lại (gồm toàn bộ tiền công) trừ
  tiền mặt. Lưu `payment_sessions.promo_used`.
- Chốt cọc (`_finalize_shift_deposit`): phí giữ lại lấy từ phần thưởng trước →
  phần đó là doanh thu bỏ qua, **không** vào ví admin (chỉ ghi `PLATFORM_FEE`
  phần tiền mặt); phần thưởng chưa dùng hoàn về **túi thưởng**.

**Server (0026):** cột mới ở `wallets`, `wallet_ledger`, `payment_orders`,
`payment_sessions`, `platform_settings`; `_promo_apply`; định nghĩa lại
`credit_wallet_from_payment` (0016), `confirm_deposit_session` +
`_finalize_shift_deposit` (0018), `get_wallet_state` (0012) — thân giữ nguyên, chỉ
thêm phần túi thưởng (đã diff, và md5 thân cũ trên remote khớp file gốc);
`get_topup_bonus()`, `admin_set_topup_bonus()` (ghi `platform_settings_audit`).

**Client:**
- `src/domain/topupBonus.ts` (+ `src/__tests__/topupBonus.test.ts`, có property
  test bảo toàn tiền) — khớp server.
- `src/data/repos/topupBonusRepo.ts`; ví đọc `promoBalance` (`walletRepo`,
  `walletStore`, `types`).
- `WalletPanel`: dòng "Tiền thưởng: X", nhãn "Tiền thưởng" trong lịch sử, hộp nạp
  của NTD hiện ưu đãi + số lần còn lại.
- `DepositWalletConfirm`: "Trả phí bằng tiền thưởng −X" / "Trừ từ số dư ví"; đủ
  tiền = tiền mặt ≥ cọc − phần thưởng dùng (prop mới `wageAmount`).
- Admin tab Thống kê: `TopUpBonusCard`. `FeeCampaignCard` và `TopUpBonusCard`
  hiện "Không tải được cài đặt này" + Thử lại khi server lỗi.
- Điều khoản mục 4: tiền thưởng không quy đổi tiền mặt.

## 2. Kiểm tra
- tsc 0 · lint 0 lỗi (7 cảnh báo có sẵn) · `test:run` 805/805 · build OK, 33 route.
- Chạy thử 0026 trên DB thật trong transaction + rollback (ví đặt về 0 cho dễ đọc):

| Luồng | Tiền mặt NTD | Thưởng | Ví admin |
|---|---|---|---|
| Nạp 2×500.000 (max 1 lần) | +1.000.000 | +100.000 (chỉ lần 1) | 0 |
| Giữ cọc 165.000 (công 150.000 + phí 15.000) | −150.000 | −15.000 | 0 |
| Huỷ ca | +150.000 | +15.000 | 0 |
| Làm đủ ca, phí trả bằng thưởng | — | — | **0** |
| Thưởng còn 4.000, làm đủ ca | −161.000 | −4.000 | **+11.000** |

  Thêm: gọi lại đơn nạp cũ không cộng trùng; worker nạp không thưởng; NTD bị khoá
  không thưởng; admin đặt thưởng > 50% bị chặn.
- **security-reviewer:** không có lỗi Nghiêm trọng/Cao/Trung bình. Đã sửa 3 mục
  Thấp. Còn lại (Thấp, chấp nhận): lập nhiều tài khoản NTD để gom thưởng (chỉ mất
  doanh thu phí, không thành tiền mặt); đua lần nạp đầu khi chưa có dòng ví (có
  sẵn từ 0014, giao dịch sau bị huỷ hẳn nên không vượt số lần).

## 3. Việc tiếp theo
- [ ] Merge PR #10 → PR `feat/p2-topup-bonus` → kiểm tay trên production:
  1. Admin → Thống kê → "Thưởng nạp ví": đặt nạp 500.000 / thưởng 100.000 / 1 lần.
  2. NTD mở "Nạp tiền vào ví" → thấy ưu đãi. Nạp 500.000 → ví hiện "Tiền thưởng:
     100.000 đ", lịch sử có "Thưởng nạp ví" (nhãn Tiền thưởng).
  3. Đăng ca → bước giữ cọc hiện "Trả phí bằng tiền thưởng −…".
  4. Huỷ ca đó → tiền thưởng quay lại; tiền mặt quay lại.
  5. Bấm "Tắt thưởng".
- [x] **Webhook PayOS so số tiền** — nhánh `fix/payos-webhook-amount`, migration
  `20260930000027_payos_webhook_amount_check.sql` (30/09):
  - `payos-webhook` gọi `credit_wallet_from_payos(order_code, data.amount,
    data.reference, data.paymentLinkId)` (chỉ service_role). Chỉ cộng ví khi đơn
    PENDING, số tiền khớp, có mã giao dịch, đúng payment link. PayOS gửi lại cùng
    giao dịch → không cộng lần hai.
  - Còn lại KHÔNG cộng, đặt `payment_orders.needs_review = true` +
    `review_reason` (AMOUNT_MISMATCH / MISSING_REFERENCE / LINK_MISMATCH /
    ORDER_NOT_PAYABLE / EXTRA_PAYMENT / ALREADY_FLAGGED); webhook vẫn trả 200.
  - Cột mới: `paid_amount`, `provider_txn_ref` (unique, = `data.reference`),
    `needs_review`, `review_reason`. `provider_ref` vẫn là paymentLinkId.
  - `credit_wallet_from_payment` (thân 0026 giữ nguyên) chặn `ORDER_NEEDS_REVIEW`.
  - Chạy thử trên DB thật (transaction + rollback): 16 kịch bản đúng.
    security-reviewer 2 lượt: lượt 1 có 2 mục Trung bình → đã sửa; lượt 2 không
    còn mục Trung bình trở lên.
  - **Triển khai đúng thứ tự:** `npx supabase db push` (0027) TRƯỚC, rồi
    `npx supabase functions deploy payos-webhook`. Ngược lại thì webhook báo 500
    (PayOS gửi lại, không mất tiền) tới khi push.
  - **Sau lần nạp thật đầu tiên:** kiểm đơn đó có `provider_txn_ref` và
    `paid_amount`, `needs_review = false`. Nếu bị `LINK_MISMATCH` /
    `MISSING_REFERENCE` hàng loạt → PayOS gửi khác tài liệu, báo lại để sửa.
  - **Admin xử lý đơn bị đánh dấu (chưa có UI):** xem bằng SQL
    `select order_code, user_id, amount, paid_amount, review_reason, created_at
    from payment_orders where needs_review order by created_at desc;` rồi đối
    chiếu giao dịch trên PayOS. KHÔNG tự đặt `needs_review = false` rồi gọi
    `credit_wallet_from_payment`: hàm đó cộng `amount` của đơn (kèm thưởng), không
    phải `paid_amount`. Hoàn tiền cho khách ngoài hệ thống, hoặc làm RPC admin
    riêng (việc sau).
  - Việc sau (Thấp): hiện "Đang kiểm tra giao dịch" cho người nạp khi đơn
    `needs_review` (`get_payment_order_status` chưa trả trường này); RPC + UI
    admin cho đơn cần xem.
- [ ] (tuỳ chọn) Dải "Đang miễn phí dịch vụ đến hết …" ở Bảng giá / `/for-employers`.
- [ ] **P2-1 cọc worker** — ĐÃ CHỐT (30/09), làm được SAU khi xong task webhook
      PayOS ở trên. Chi tiết: `HANDOFF_SESSION_2026-09-28_FEEDBACK.md` mục 3 (P2-1)
      và mục 5 câu 4. Tóm tắt:
      - Cọc = 50% tiền công ca, tối đa 100.000 đ.
      - Miễn cọc: đã duyệt CCCD, hoặc ≥5 ca hoàn thành trong 30 ngày gần nhất
        (cửa sổ trượt).
      - Vắng mặt không báo → 100% cọc về NTD sau 24h (khiếu nại → admin quyết), và
        mất quyền miễn cọc 30 ngày. Tự huỷ trước ca → hoàn đủ.

## 4. Lưu ý môi trường
Như `HANDOFF_SESSION_2026-09-29_P2-3.md` mục 4. Thêm: kịch bản chạy thử luồng tiền
dùng `set_config('request.jwt.claims', …)` để giả lập admin / NTD trong một
transaction, rồi `rollback`.
