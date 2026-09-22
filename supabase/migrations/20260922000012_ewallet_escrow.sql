-- Ví điện tử + Escrow (MÔ PHỎNG) theo mô hình két trung tâm "Két bảo đảm CALE_MOCK".
-- Tiền KHÔNG thật. security definer + search_path='' + RLS chỉ đọc của mình.
--
-- Luồng (khớp bản mô phỏng đã chốt):
--   Deposit (nạp ví)   : ví user +amount,  két +amount.
--   Lock (đăng ca)     : ví employer -deposit, két KHÔNG đổi (cọc HELD trong payment_session).
--   Complete (hoàn thành): két -payout, ví worker +payout (phí nền tảng giữ lại trong két).
--   Withdraw (rút)     : ví user -amount (guard đủ), két KHÔNG đổi.
--
-- ADDITIVE + CORRECTIVE: thêm bảng/RPC ví; CREATE OR REPLACE confirm_deposit_session
-- (0010) + release_deposit (0010) để nối vào ví. Không sửa migration đã apply.

-- ---------------------------------------------------------------------------
-- 1. Bảng ví + két
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  amount integer not null,
  shift_id uuid references public.shifts(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_idx on public.wallet_ledger(user_id);

-- Két trung tâm: 1 dòng duy nhất (id=true).
create table if not exists public.system_bank (
  id boolean primary key default true check (id),
  name text not null default 'Két bảo đảm CALE_MOCK',
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.system_bank (id) values (true) on conflict (id) do nothing;

-- RLS + grants
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.system_bank enable row level security;
revoke all on public.wallets, public.wallet_ledger, public.system_bank from anon, authenticated;
grant select on public.wallets, public.wallet_ledger, public.system_bank to authenticated;
grant all on public.wallets, public.wallet_ledger, public.system_bank to service_role;
create policy wallets_sel on public.wallets for select to authenticated using (user_id = auth.uid());
create policy wallet_ledger_sel on public.wallet_ledger for select to authenticated using (user_id = auth.uid());
-- Số dư két minh bạch: ai đăng nhập cũng xem được (demo).
create policy system_bank_sel on public.system_bank for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Helper nội bộ (KHÔNG grant authenticated — chỉ gọi trong RPC definer)
-- ---------------------------------------------------------------------------
create or replace function public._wallet_apply(
  p_user uuid, p_amount int, p_kind text, p_shift uuid, p_app uuid, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.wallet_ledger(user_id, kind, amount, shift_id, application_id, note)
    values (p_user, p_kind, p_amount, p_shift, p_app, p_note);
  insert into public.wallets(user_id, balance, updated_at)
    values (p_user, p_amount, now())
    on conflict (user_id) do update
      set balance = public.wallets.balance + p_amount, updated_at = now();
end; $$;

create or replace function public._bank_apply(p_delta int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.system_bank set balance = balance + p_delta, updated_at = now() where id;
end; $$;

revoke execute on function public._wallet_apply(uuid,int,text,uuid,uuid,text) from public, anon, authenticated;
revoke execute on function public._bank_apply(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC ví (grant authenticated)
-- ---------------------------------------------------------------------------
-- Deposit: ví +amount, két +amount.
create or replace function public.wallet_top_up(p_amount int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  perform public._wallet_apply(v_uid, p_amount, 'UserTopUp', null, null, 'Nạp tiền vào ví (mô phỏng)');
  perform public._bank_apply(p_amount);
  return jsonb_build_object('ok', true, 'balance', (select balance from public.wallets where user_id = v_uid));
end; $$;

-- Withdraw: ví -amount (guard đủ số dư), két KHÔNG đổi.
create or replace function public.wallet_withdraw(p_amount int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_bal int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select coalesce(balance,0) into v_bal from public.wallets where user_id = v_uid;
  if coalesce(v_bal,0) < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._wallet_apply(v_uid, -p_amount, 'UserWithdrawal', null, null, 'Rút tiền khỏi ví (mô phỏng)');
  return jsonb_build_object('ok', true, 'balance', (select balance from public.wallets where user_id = v_uid));
end; $$;

-- Số dư + lịch sử ví của user hiện tại.
create or replace function public.get_wallet_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_bal int; v_ledger jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select coalesce(balance,0) into v_bal from public.wallets where user_id = v_uid;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'occurredAt', l.created_at, 'userId', l.user_id, 'kind', l.kind,
    'amount', l.amount, 'shiftId', l.shift_id, 'applicationId', l.application_id, 'note', l.note
  ) order by l.created_at desc), '[]'::jsonb) into v_ledger
  from public.wallet_ledger l where l.user_id = v_uid;
  return jsonb_build_object('balance', coalesce(v_bal,0), 'ledger', v_ledger);
end; $$;

-- Số dư két Két bảo đảm CALE_MOCK (minh bạch demo).
create or replace function public.get_system_bank()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return (select jsonb_build_object('name', name, 'balance', balance) from public.system_bank where id);
end; $$;

revoke execute on function public.wallet_top_up(int) from public, anon;
revoke execute on function public.wallet_withdraw(int) from public, anon;
revoke execute on function public.get_wallet_state() from public, anon;
revoke execute on function public.get_system_bank() from public, anon;
grant execute on function public.wallet_top_up(int) to authenticated;
grant execute on function public.wallet_withdraw(int) to authenticated;
grant execute on function public.get_wallet_state() to authenticated;
grant execute on function public.get_system_bank() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. LOCK — confirm_deposit_session: trừ cọc từ ví employer (két không đổi)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_deposit_session(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_shift_id uuid; v_bal int;
begin
  perform public.require_active_employer();
  select * into v_s from public.payment_sessions where id = p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status in ('HELD','RELEASED') then
    return jsonb_build_object('status', v_s.status,
      'shift_id', coalesce(v_s.shift_id, v_s.published_shift_id), 'order_code', v_s.order_code);
  end if;
  if v_s.status <> 'PENDING' then raise exception 'INVALID_SESSION_STATE'; end if;
  if v_s.expires_at is not null and now() > v_s.expires_at then
    update public.payment_sessions set status = 'EXPIRED', updated_at = now() where id = p_payment_id;
    raise exception 'SESSION_EXPIRED';
  end if;

  -- LOCK: cần đủ số dư ví; trừ cọc khỏi ví employer. Két KHÔNG đổi.
  select coalesce(balance,0) into v_bal from public.wallets where user_id = v_uid;
  if coalesce(v_bal,0) < v_s.amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  v_shift_id := public.publish_shift(v_s.shift_payload, v_s.client_request_id, null);
  perform public._wallet_apply(v_uid, -v_s.amount, 'EmployerDepositHeld', v_shift_id, null,
    'Giữ cọc đăng ca (mô phỏng)');

  update public.payment_sessions
    set status = 'HELD', paid_at = now(), shift_id = v_shift_id, published_shift_id = v_shift_id,
        provider_code = '00', provider_message = 'wallet hold', updated_at = now()
    where id = p_payment_id and status = 'PENDING';
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_shift_id, null, 'HOLD', v_s.amount) on conflict (payment_session_id, entry_type) do nothing;

  return jsonb_build_object('status', 'HELD', 'shift_id', v_shift_id, 'order_code', v_s.order_code);
end; $$;

-- ---------------------------------------------------------------------------
-- 5. COMPLETE — release_deposit: két -payout, ví worker +payout (phí giữ lại két)
-- ---------------------------------------------------------------------------
create or replace function public.release_deposit(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_shift public.shifts;
        v_total int := 0; r record;
begin
  select * into v_s from public.payment_sessions where id = p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status = 'RELEASED' then return jsonb_build_object('status','RELEASED'); end if;
  if v_s.status <> 'HELD' then raise exception 'INVALID_SESSION_STATE'; end if;
  select * into v_shift from public.shifts where id = v_s.shift_id;
  if not found or v_shift.status <> 'Completed' then raise exception 'SHIFT_NOT_COMPLETED'; end if;

  -- COMPLETE: mỗi worker Confirmed nhận lương vào ví; trừ két đúng phần lương.
  for r in
    select a.id, a.worker_id, coalesce(a.payout_amount,0) as payout
    from public.applications a
    where a.shift_id = v_s.shift_id and a.status = 'Confirmed' and coalesce(a.payout_amount,0) > 0
  loop
    perform public._wallet_apply(r.worker_id, r.payout, 'WorkerWageReleased', v_s.shift_id, r.id,
      'Lương ca (mô phỏng)');
    v_total := v_total + r.payout;
  end loop;
  perform public._bank_apply(-v_total);   -- tiền rời két sang worker; phí (amount-payout) giữ lại két

  update public.payment_sessions set status='RELEASED', released_at=now(), updated_at=now() where id=v_s.id;
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_s.shift_id, null, 'WORKER_PAYOUT', v_total) on conflict (payment_session_id, entry_type) do nothing;
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_s.shift_id, null, 'PLATFORM_FEE', v_s.platform_fee) on conflict (payment_session_id, entry_type) do nothing;

  return jsonb_build_object('status','RELEASED','worker_payout',v_total,'platform_fee',v_s.platform_fee);
end; $$;
