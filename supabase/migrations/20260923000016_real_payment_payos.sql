-- Thanh toán THẬT qua PayOS (nạp tiền = Kênh thu/QR, chi hộ = Kênh chi).
--
-- KHÁC BIỆT QUAN TRỌNG với escrow mô phỏng (CALE_MOCK, migration 0012):
--   * wallets / system_bank / mock_payment_ledger = MÔ PHỎNG (không tiền thật).
--   * payment_orders / payout_orders (file này) = DÒNG TIỀN THẬT qua cổng PayOS.
-- Hai lớp cùng tồn tại: nạp tiền THẬT làm tăng số dư ví (ví trở thành "số dư thật
-- người dùng đã nạp"); còn giữ cọc/hoàn cọc nội bộ vẫn dùng ví như trước.
--
-- Nguyên tắc bảo mật (giữ nguyên chuẩn repo):
--   * Client KHÔNG bao giờ tự cộng/trừ tiền. Mọi thay đổi tiền thật đi qua RPC
--     security definer, hoặc qua Edge Function dùng service_role.
--   * RPC definer: search_path='', revoke public/anon, grant đúng vai trò.
--   * Ghi tiền vào ví do webhook PayOS kích hoạt (server-verified chữ ký), KHÔNG
--     phải do client tự khai đã trả.
-- ADDITIVE: chỉ thêm bảng/cột/RPC. KHÔNG sửa migration đã apply (0001-0015).

-- ---------------------------------------------------------------------------
-- 1. Worker khai tài khoản ngân hàng nhận payout (Kênh chi PayOS)
--    bank_bin = mã BIN ngân hàng (napas), account_number = STK, account_name = tên chủ TK.
-- ---------------------------------------------------------------------------
alter table public.worker_profiles
  add column if not exists bank_bin            text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_name   text;

-- ---------------------------------------------------------------------------
-- 2. payment_orders — đơn NẠP tiền thật (Kênh thu / QR PayOS)
--    Vòng đời: PENDING (đã tạo link) -> PAID (webhook xác nhận) hoặc
--              CANCELLED / EXPIRED / FAILED.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_orders (
  id           uuid primary key default gen_random_uuid(),
  order_code   bigint not null unique,        -- PayOS orderCode (số)
  user_id      uuid not null references public.users(id) on delete cascade,
  amount       integer not null check (amount > 0),
  status       text not null default 'PENDING'
                 check (status in ('PENDING','PAID','CANCELLED','EXPIRED','FAILED')),
  provider     text not null default 'PAYOS',
  checkout_url text,                            -- link/QR PayOS trả về
  qr_code      text,
  provider_ref text,                            -- id giao dịch phía PayOS
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  updated_at   timestamptz not null default now()
);
create index if not exists payment_orders_user_idx on public.payment_orders(user_id);

-- ---------------------------------------------------------------------------
-- 3. payout_orders — đơn CHI tiền thật (Kênh chi PayOS) ra STK người nhận
--    kind: WORKER_PAYOUT (trả lương worker) | EMPLOYER_REFUND (hoàn cọc employer).
--    idempotency_key: UUID gửi PayOS qua X-Idempotency-Key (chống chi trùng).
-- ---------------------------------------------------------------------------
create table if not exists public.payout_orders (
  id                uuid primary key default gen_random_uuid(),
  idempotency_key   text not null unique,
  kind              text not null check (kind in ('WORKER_PAYOUT','EMPLOYER_REFUND')),
  user_id           uuid not null references public.users(id) on delete cascade, -- người NHẬN
  shift_id          uuid references public.shifts(id) on delete set null,
  application_id    uuid references public.applications(id) on delete set null,
  amount            integer not null check (amount > 0),
  to_bin            text not null,
  to_account_number text not null,
  to_account_name   text,
  status            text not null default 'PENDING'
                      check (status in ('PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED')),
  provider          text not null default 'PAYOS',
  provider_ref      text,
  fail_reason       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists payout_orders_user_idx  on public.payout_orders(user_id);
create index if not exists payout_orders_shift_idx on public.payout_orders(shift_id);

-- ---------------------------------------------------------------------------
-- 4. RLS + grants
--    Client (authenticated) CHỈ đọc đơn của chính mình. Không insert/update/delete
--    trực tiếp — mọi ghi qua Edge Function (service_role) hoặc RPC definer.
-- ---------------------------------------------------------------------------
alter table public.payment_orders enable row level security;
alter table public.payout_orders  enable row level security;

revoke all on public.payment_orders, public.payout_orders from anon, authenticated;
grant select on public.payment_orders, public.payout_orders to authenticated;
grant all    on public.payment_orders, public.payout_orders to service_role;

create policy payment_orders_sel on public.payment_orders
  for select to authenticated using (user_id = auth.uid());
create policy payout_orders_sel on public.payout_orders
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. RPC: cộng ví THẬT khi PayOS xác nhận nạp thành công (idempotent)
--    Chỉ service_role gọi (từ Edge Function payos-webhook, sau khi verify chữ ký).
--    Idempotent theo order_code: đơn đã PAID -> no-op (webhook có thể gửi lặp).
--    Dùng lại _wallet_apply / _bank_apply của 0012: ví +amount, két +amount
--    (đối xứng UserTopUp mô phỏng, nhưng đây là tiền THẬT).
-- ---------------------------------------------------------------------------
create or replace function public.credit_wallet_from_payment(p_order_code bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payment_orders;
begin
  select * into v_o from public.payment_orders where order_code = p_order_code for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- Idempotent: đã ghi nhận trả rồi -> trả trạng thái, không cộng lần hai.
  if v_o.status = 'PAID' then
    return jsonb_build_object('status', 'ALREADY_PAID', 'order_code', p_order_code);
  end if;
  if v_o.status in ('CANCELLED','EXPIRED','FAILED') then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;

  update public.payment_orders
    set status = 'PAID', paid_at = now(), updated_at = now()
    where id = v_o.id;

  -- Cộng ví người nạp + két (tiền thật vào hệ thống).
  perform public._wallet_apply(v_o.user_id, v_o.amount, 'UserTopUp', null, null,
    'Nạp tiền vào ví qua PayOS');
  perform public._bank_apply(v_o.amount);

  return jsonb_build_object('status', 'PAID', 'order_code', p_order_code, 'amount', v_o.amount);
end; $$;

revoke execute on function public.credit_wallet_from_payment(bigint) from public, anon, authenticated;
grant  execute on function public.credit_wallet_from_payment(bigint) to service_role;

-- ---------------------------------------------------------------------------
-- 6. RPC đọc: trạng thái một đơn nạp theo order_code (cho client poll sau khi
--    quét QR). RLS đã chặn xem đơn người khác; hàm này thêm guard chủ sở hữu.
-- ---------------------------------------------------------------------------
create or replace function public.get_payment_order_status(p_order_code bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_o public.payment_orders;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_o from public.payment_orders where order_code = p_order_code;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_o.user_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  return jsonb_build_object(
    'orderCode', v_o.order_code, 'status', v_o.status, 'amount', v_o.amount,
    'checkoutUrl', v_o.checkout_url, 'qrCode', v_o.qr_code, 'paidAt', v_o.paid_at);
end; $$;

revoke execute on function public.get_payment_order_status(bigint) from public, anon;
grant  execute on function public.get_payment_order_status(bigint) to authenticated;
