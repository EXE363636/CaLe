-- =============================================================================
-- 0032 — Két (system_bank.balance) sang bigint
-- =============================================================================
-- system_bank.balance là integer (tối đa 2.147.483.647 đ). Két là TỔNG tiền mọi
-- người nạp qua PayOS → khi vượt ~2,1 tỷ đồng, `_bank_apply` tràn số
-- (integer out of range) → credit_wallet_from_payos lỗi → webhook 500 → PayOS gửi
-- lại mãi, không ai được cộng ví (handoff 10-01 FOLLOWUPS mục A.4).
--
-- Chỉ đổi kiểu cột:
--   - `_bank_apply(p_delta int)` giữ nguyên: mỗi lần cộng/trừ vẫn trong int;
--     `balance + p_delta` tự thành bigint.
--   - `get_system_bank()` trả jsonb → số lớn hiển thị đúng (client: number JS an
--     toàn tới 9e15).
--   - Không hàm nào đọc số dư két vào biến int; không view / chỉ mục nào phụ thuộc
--     cột. Policy `system_bank_sel` không tham chiếu cột.
-- Không đổi: wallets.balance / promo_balance / wallet_ledger.amount (int theo từng
-- người / từng dòng). NGOẠI LỆ cần theo dõi: ví nhận phí 10% của admin
-- (platform_settings.fee_wallet_user_id) gom phí toàn sàn — nếu không rút, vượt
-- ~2,1 tỷ đồng (≈ 21 tỷ đồng tiền công đã chốt) thì _credit_platform_fee tràn →
-- chốt cọc lỗi. Còn xa; ghi ở handoff FOLLOWUPS (cùng sync_platform_fees dùng int).
-- =============================================================================

-- ALTER TYPE lấy khoá ACCESS EXCLUSIVE trên hàng két (mọi webhook nạp / trả công /
-- phí đều update hàng này). Không chờ khoá quá 5 giây: bận thì huỷ, push lại lúc ít
-- giao dịch (security-reviewer). `set` (không phải `set local`) để có tác dụng dù
-- CLI có bọc transaction hay không; phiên db push kết thúc là hết.
set lock_timeout = '5s';
alter table public.system_bank alter column balance type bigint;
