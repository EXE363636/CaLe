-- ============================================================================
-- XOÁ SẠCH DỮ LIỆU MÔ PHỎNG — chạy MỘT LẦN trong Supabase Dashboard → SQL Editor.
-- KHÔNG phải migration (không đặt trong supabase/migrations).
--
-- XOÁ: toàn bộ ca làm, đơn ứng tuyển, phiên cọc, sổ cái cọc mô phỏng, ví,
--      lịch sử giao dịch ví, đơn nạp/rút PayOS. Két trung tâm về 0.
-- GIỮ: tài khoản người dùng (users, auth), hồ sơ worker/employer, public_profiles,
--      danh sách kênh ngân hàng (payment_channels).
--
-- ⚠️ KHÔNG HOÀN TÁC ĐƯỢC. Supabase dự án này dùng chung dev + prod.
-- Chạy migration 0017 TRƯỚC hoặc NGAY SAU script này (0017 khoá hàm nạp mô phỏng
-- để không ai tạo lại tiền mô phỏng).
-- ============================================================================

-- BƯỚC 1 — XEM TRƯỚC (chạy riêng khối này để biết sẽ xoá bao nhiêu dòng)
select 'shifts' as bang, count(*) from public.shifts
union all select 'applications', count(*) from public.applications
union all select 'public_shifts', count(*) from public.public_shifts
union all select 'payment_sessions', count(*) from public.payment_sessions
union all select 'mock_payment_ledger', count(*) from public.mock_payment_ledger
union all select 'wallets', count(*) from public.wallets
union all select 'wallet_ledger', count(*) from public.wallet_ledger
union all select 'payment_orders', count(*) from public.payment_orders
union all select 'payout_orders', count(*) from public.payout_orders
union all select 'system_bank (so du)', balance from public.system_bank;

-- BƯỚC 2 — XOÁ (chạy khối begin ... commit)
begin;

truncate table
  public.mock_payment_ledger,
  public.payment_sessions,
  public.payout_orders,
  public.payment_orders,
  public.wallet_ledger,
  public.wallets,
  public.applications,
  public.public_shifts,
  public.shifts
cascade;

update public.system_bank set balance = 0, updated_at = now() where id;

commit;

-- BƯỚC 3 — KIỂM TRA: chạy lại khối BƯỚC 1, mọi dòng phải = 0.
