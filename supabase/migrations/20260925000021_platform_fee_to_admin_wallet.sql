-- =============================================================================
-- 0021 — Phí nền tảng 10% → ví admin được chỉ định
--
-- Trước migration này: khi chốt cọc, phí (`PLATFORM_FEE` trong
-- mock_payment_ledger) chỉ được GHI SỔ, tiền nằm lại két (system_bank) và
-- không thuộc ví ai → admin không thấy / không rút được doanh thu nền tảng.
--
-- Sau migration này:
--   * `platform_settings.fee_wallet_user_id` = MỘT admin nhận phí (mặc định:
--     admin tạo sớm nhất lúc apply). Đổi người nhận = sửa 1 dòng (service_role).
--   * Mỗi khi một dòng `PLATFORM_FEE` được ghi (mọi đường chốt cọc: 0012
--     release_deposit, 0018 _finalize_shift_deposit), trigger cộng phí vào ví
--     người nhận (kind `PlatformFeeReceived`) và trừ két — CÙNG mẫu trả công
--     worker (`_pay_worker_wage`: ví +x, két −x). Admin rút qua luồng rút
--     PayOS hiện có (Edge Function `withdraw`, không giới hạn vai trò).
--   * Cùng transaction với chốt cọc: cộng phí lỗi → chốt cọc rollback, không
--     có trạng thái nửa vời.
--   * Idempotent theo ca: mỗi ca chỉ cộng phí MỘT lần (khoá advisory + kiểm tra
--     ledger), chạy lại backfill không cộng trùng.
--   * Không có người nhận hợp lệ (NULL / không còn là admin) → phí ở lại két
--     như trước; chạy lại `select public.sync_platform_fees();` sau khi đặt
--     người nhận để chuyển bù.
--
-- Backfill: chỉ phí phát sinh TỪ 2026-09-24 (ngày 0017 khoá nạp/rút mô phỏng —
-- từ đó số dư ví chỉ đến từ nạp PayOS thật). Phí cũ hơn có thể sinh từ tiền
-- mô phỏng; cộng vào ví admin sẽ cho rút ra tiền thật không có thật.
--
-- ADDITIVE. Không sửa migration đã apply.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cấu hình người nhận phí (1 dòng duy nhất, id = true)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  id                 boolean primary key default true check (id),
  fee_wallet_user_id uuid references public.users(id) on delete set null,
  updated_at         timestamptz not null default now()
);
insert into public.platform_settings (id, fee_wallet_user_id)
  values (true, (select id from public.users where role = 'admin'
                 order by created_at asc limit 1))
  on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
create policy platform_settings_admin_sel on public.platform_settings
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. _credit_platform_fee — cộng phí 1 ca vào ví người nhận (idempotent).
--    Nội bộ: KHÔNG grant authenticated. Trả về số tiền đã cộng (0 = bỏ qua).
-- ---------------------------------------------------------------------------
create or replace function public._credit_platform_fee(p_shift_id uuid, p_amount int)
returns int language plpgsql security definer set search_path = '' as $$
declare v_to uuid;
begin
  if p_shift_id is null or coalesce(p_amount, 0) <= 0 then return 0; end if;

  select s.fee_wallet_user_id into v_to
    from public.platform_settings s
    join public.users u on u.id = s.fee_wallet_user_id and u.role = 'admin'
    where s.id;
  if v_to is null then return 0; end if;   -- chưa có người nhận → phí ở lại két

  -- Tuần tự hoá theo ca rồi mới kiểm tra đã cộng chưa (chống cộng trùng).
  perform pg_advisory_xact_lock(hashtextextended('platform_fee:' || p_shift_id::text, 0));
  if exists (select 1 from public.wallet_ledger
             where shift_id = p_shift_id and kind = 'PlatformFeeReceived') then
    return 0;
  end if;

  perform public._wallet_apply(v_to, p_amount, 'PlatformFeeReceived',
    p_shift_id, null, 'Phí dịch vụ 10% ca làm');
  perform public._bank_apply(-p_amount);
  return p_amount;
end; $$;

revoke execute on function public._credit_platform_fee(uuid, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Trigger: mỗi dòng PLATFORM_FEE mới → cộng vào ví người nhận
-- ---------------------------------------------------------------------------
create or replace function public._on_platform_fee_ledger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._credit_platform_fee(new.shift_id, new.amount);
  return new;
end; $$;

revoke execute on function public._on_platform_fee_ledger() from public, anon, authenticated;

drop trigger if exists mock_payment_ledger_platform_fee on public.mock_payment_ledger;
create trigger mock_payment_ledger_platform_fee
  after insert on public.mock_payment_ledger
  for each row when (new.entry_type = 'PLATFORM_FEE' and new.amount > 0)
  execute function public._on_platform_fee_ledger();

-- ---------------------------------------------------------------------------
-- 4. sync_platform_fees — chuyển bù phí chưa cộng (backfill / sau khi đổi
--    người nhận). Chỉ service_role. Trả về tổng đã cộng.
-- ---------------------------------------------------------------------------
create or replace function public.sync_platform_fees(
  p_since timestamptz default '2026-09-24 00:00:00+07'
) returns int language plpgsql security definer set search_path = '' as $$
declare r record; v_total int := 0;
begin
  for r in
    select shift_id, sum(amount)::int as amount
      from public.mock_payment_ledger
      where entry_type = 'PLATFORM_FEE' and amount > 0 and created_at >= p_since
      group by shift_id
  loop
    v_total := v_total + public._credit_platform_fee(r.shift_id, r.amount);
  end loop;
  return v_total;
end; $$;

revoke execute on function public.sync_platform_fees(timestamptz) from public, anon, authenticated;
grant  execute on function public.sync_platform_fees(timestamptz) to service_role;

-- Backfill 1 lần.
do $$
declare v_total int;
begin
  v_total := public.sync_platform_fees();
  raise notice '0021 backfill: đã cộng % đ phí nền tảng vào ví admin', v_total;
end $$;
