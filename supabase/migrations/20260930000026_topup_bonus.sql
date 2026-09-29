-- =============================================================================
-- 0026 — Thưởng nạp ví cho nhà tuyển dụng (P2-2, feedback F10)
-- =============================================================================
-- Chủ dự án chốt 29/09:
--   * Nạp ví qua PayOS đủ mức → được cộng tiền thưởng (vd nạp 500.000 đ được
--     +100.000 đ). Chỉ nhà tuyển dụng.
--   * Tiền thưởng CHỈ trả phí dịch vụ; không trả tiền công, không rút, không
--     hết hạn.
--   * Admin đặt mức nạp, tiền thưởng, số lần tối đa mỗi nhà tuyển dụng (mặc
--     định 1). Tiền thưởng = 0 → tắt (mặc định TẮT).
--
-- Mô hình tiền (két "system_bank" chỉ chứa TIỀN THẬT):
--   * `wallets.promo_balance` — túi thưởng, tách khỏi `balance` (tiền mặt). Rút
--     tiền chỉ đụng `balance` (begin_withdrawal không đổi).
--   * Nạp: tiền mặt +amount, két +amount (như cũ); túi thưởng +bonus, két KHÔNG
--     đổi (thưởng không phải tiền thật).
--   * Giữ cọc: thưởng trả PHÍ trước (≤ phí), còn lại trừ tiền mặt. Lưu phần
--     thưởng đã dùng ở `payment_sessions.promo_used`.
--   * Chốt cọc: phí giữ lại lấy từ phần thưởng trước → phần đó là doanh thu bỏ
--     qua, KHÔNG chuyển vào ví admin (chỉ ghi PLATFORM_FEE phần tiền mặt, trigger
--     0021 chỉ cộng phần này). Phần thưởng chưa dùng hoàn về TÚI THƯỞNG.
--   → Tiền mặt vào (amount − promo_used) = công + hoàn tiền mặt + phí tiền mặt;
--     két luôn khớp tổng tiền mặt.
--   Client khớp bằng src/domain/topupBonus.ts (có property test bảo toàn tiền).
--
-- Định nghĩa lại (thân giữ nguyên bản cũ, chỉ thêm phần túi thưởng):
--   credit_wallet_from_payment (0016), confirm_deposit_session (0018),
--   _finalize_shift_deposit (0018), get_wallet_state (0012).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cột mới
-- ---------------------------------------------------------------------------
alter table public.wallets
  add column if not exists promo_balance integer not null default 0 check (promo_balance >= 0);

-- 'cash' = tiền mặt (balance), 'promo' = túi thưởng (promo_balance).
alter table public.wallet_ledger
  add column if not exists pocket text not null default 'cash' check (pocket in ('cash', 'promo'));

alter table public.payment_orders
  add column if not exists bonus_amount integer not null default 0 check (bonus_amount >= 0);

alter table public.payment_sessions
  add column if not exists promo_used     integer not null default 0 check (promo_used >= 0),
  add column if not exists promo_fee_kept integer not null default 0 check (promo_fee_kept >= 0);

alter table public.platform_settings
  add column if not exists topup_bonus_min          integer not null default 500000 check (topup_bonus_min >= 0),
  add column if not exists topup_bonus_amount       integer not null default 0      check (topup_bonus_amount >= 0),
  add column if not exists topup_bonus_max_per_user integer not null default 1      check (topup_bonus_max_per_user >= 0);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. _promo_apply — cộng/trừ túi thưởng + ghi sổ (pocket='promo'). Nội bộ.
-- ---------------------------------------------------------------------------
create or replace function public._promo_apply(
  p_user uuid, p_amount int, p_kind text, p_shift uuid, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_amount = 0 then return; end if;
  insert into public.wallet_ledger(user_id, kind, amount, shift_id, application_id, note, pocket)
    values (p_user, p_kind, p_amount, p_shift, null, p_note, 'promo');
  update public.wallets
    set promo_balance = promo_balance + p_amount, updated_at = now()
    where user_id = p_user;
  if not found then
    insert into public.wallets(user_id, balance, promo_balance, updated_at)
      values (p_user, 0, p_amount, now());
  end if;
end; $$;
revoke execute on function public._promo_apply(uuid, int, text, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Nạp PayOS: thêm thưởng (bản 0016 + khối thưởng)
-- ---------------------------------------------------------------------------
create or replace function public.credit_wallet_from_payment(p_order_code bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payment_orders; v_s public.platform_settings;
        v_role text; v_suspended boolean; v_times int; v_bonus int := 0;
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

  -- P2-2: thưởng nạp ví (chỉ nhà tuyển dụng). Dòng ví của người này đã bị khoá
  -- bởi _wallet_apply ở trên → các lần nạp đồng thời của cùng người xếp hàng,
  -- đếm số lần thưởng không bị đua.
  select * into v_s from public.platform_settings where id;
  select role, suspended into v_role, v_suspended from public.users where id = v_o.user_id;
  if v_role = 'employer' and not coalesce(v_suspended, false)
     and coalesce(v_s.topup_bonus_amount, 0) > 0
     and v_o.amount >= coalesce(v_s.topup_bonus_min, 0) then
    select count(*) into v_times from public.payment_orders
      where user_id = v_o.user_id and bonus_amount > 0;
    if v_times < coalesce(v_s.topup_bonus_max_per_user, 0) then
      v_bonus := v_s.topup_bonus_amount;
      update public.payment_orders set bonus_amount = v_bonus where id = v_o.id;
      perform public._promo_apply(v_o.user_id, v_bonus, 'TopUpBonus', null,
        'Thưởng nạp ví (chỉ dùng trả phí dịch vụ)');
    end if;
  end if;

  return jsonb_build_object('status', 'PAID', 'order_code', p_order_code,
    'amount', v_o.amount, 'bonus', v_bonus);
end; $$;

-- ---------------------------------------------------------------------------
-- 4. Giữ cọc: thưởng trả phí trước (bản 0018 + chia túi)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_deposit_session(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_shift_id uuid;
        v_bal int; v_promo int; v_promo_use int;
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

  -- LOCK: thưởng trả phí trước, còn lại cần đủ tiền mặt. Két KHÔNG đổi.
  select coalesce(balance, 0), coalesce(promo_balance, 0) into v_bal, v_promo
    from public.wallets where user_id = v_uid for update;
  v_promo_use := greatest(0, least(coalesce(v_promo, 0), v_s.platform_fee));
  if coalesce(v_bal, 0) < v_s.amount - v_promo_use then raise exception 'INSUFFICIENT_BALANCE'; end if;

  v_shift_id := public.publish_shift(v_s.shift_payload, v_s.client_request_id, null);
  perform public._wallet_apply(v_uid, -(v_s.amount - v_promo_use), 'EmployerDepositHeld', v_shift_id, null,
    'Giữ cọc đăng ca');
  perform public._promo_apply(v_uid, -v_promo_use, 'PromoFeeUsed', v_shift_id,
    'Dùng tiền thưởng trả phí dịch vụ');

  update public.payment_sessions
    set status = 'HELD', paid_at = now(), shift_id = v_shift_id, published_shift_id = v_shift_id,
        provider_code = '00', provider_message = 'wallet hold', promo_used = v_promo_use,
        updated_at = now()
    where id = p_payment_id and status = 'PENDING';
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_shift_id, null, 'HOLD', v_s.amount) on conflict (payment_session_id, entry_type) do nothing;

  return jsonb_build_object('status', 'HELD', 'shift_id', v_shift_id, 'order_code', v_s.order_code,
    'promo_used', v_promo_use);
end; $$;

-- ---------------------------------------------------------------------------
-- 5. Chốt cọc: chia phí giữ lại / tiền hoàn theo túi (bản 0018 + chia túi)
-- ---------------------------------------------------------------------------
create or replace function public._finalize_shift_deposit(p_shift_id uuid, p_allow_stale boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_s public.payment_sessions; r record;
        v_paid int; v_cap int; v_fee_kept int; v_refund int;
        v_fee_promo int; v_fee_cash int; v_refund_promo int; v_refund_cash int;
begin
  select * into v_s from public.payment_sessions
    where shift_id = p_shift_id and application_id is null and status = 'HELD'
    order by created_at desc limit 1
    for update;
  if not found then return jsonb_build_object('status', 'NO_HELD_SESSION'); end if;

  -- Trả công mọi người đã Confirmed mà chưa nhận (vd. xác nhận trước 0018).
  for r in select id from public.applications
           where shift_id = p_shift_id and status = 'Confirmed' loop
    perform public._pay_worker_wage(r.id);
  end loop;

  -- Còn người đang làm / chờ xác nhận / tranh chấp → chưa chốt.
  if exists (select 1 from public.applications
             where shift_id = p_shift_id and status in ('CheckedIn', 'CheckedOut', 'Disputed')) then
    return jsonb_build_object('status', 'PENDING_WORKERS');
  end if;
  if not p_allow_stale and exists (
    select 1 from public.applications
    where shift_id = p_shift_id and status in ('Approved', 'CancellationRequested')) then
    return jsonb_build_object('status', 'PENDING_WORKERS');
  end if;

  select coalesce(sum(amount), 0) into v_paid from public.wallet_ledger
    where shift_id = p_shift_id and kind = 'WorkerWageReleased';
  v_cap := v_s.amount - v_s.platform_fee;
  v_fee_kept := case when v_cap > 0
    then least(v_s.platform_fee, round(v_s.platform_fee::numeric * v_paid / v_cap)::int)
    else 0 end;
  v_refund := greatest(v_s.amount - v_paid - v_fee_kept, 0);

  -- P2-2: chia theo túi (khớp splitDepositSettlement).
  v_fee_promo    := least(coalesce(v_s.promo_used, 0), v_fee_kept);
  v_fee_cash     := v_fee_kept - v_fee_promo;
  v_refund_promo := greatest(0, least(coalesce(v_s.promo_used, 0) - v_fee_promo, v_refund));
  v_refund_cash  := v_refund - v_refund_promo;

  if v_refund_cash > 0 then
    perform public._wallet_apply(v_s.employer_id, v_refund_cash, 'EmployerUnusedRefund',
      p_shift_id, null, 'Hoàn cọc phần không sử dụng');
  end if;
  if v_refund_promo > 0 then
    perform public._promo_apply(v_s.employer_id, v_refund_promo, 'PromoFeeRefund',
      p_shift_id, 'Hoàn tiền thưởng (phí không dùng)');
  end if;

  update public.payment_sessions
    set status = case when v_paid > 0 then 'RELEASED' else 'REFUNDED' end,
        released_at = case when v_paid > 0 then now() else released_at end,
        promo_fee_kept = v_fee_promo,
        updated_at = now()
    where id = v_s.id;

  if v_paid > 0 then
    insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
      values (v_s.id, p_shift_id, null, 'WORKER_PAYOUT', v_paid)
      on conflict (payment_session_id, entry_type) do nothing;
  end if;
  -- Chỉ phần phí trả bằng TIỀN MẶT là doanh thu thật (trigger 0021 cộng ví admin).
  if v_fee_cash > 0 then
    insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
      values (v_s.id, p_shift_id, null, 'PLATFORM_FEE', v_fee_cash)
      on conflict (payment_session_id, entry_type) do nothing;
  end if;
  if v_refund > 0 then
    insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
      values (v_s.id, p_shift_id, null, 'REFUND', v_refund)
      on conflict (payment_session_id, entry_type) do nothing;
  end if;

  return jsonb_build_object(
    'status', case when v_refund > 0 then 'REFUNDED' else 'RELEASED' end,
    'worker_payout', v_paid, 'platform_fee', v_fee_kept,
    'platform_fee_promo', v_fee_promo, 'refund_promo', v_refund_promo,
    'refund', v_refund, 'amount', v_refund);
end; $$;

revoke execute on function public._finalize_shift_deposit(uuid, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_wallet_state: thêm promoBalance + pocket (bản 0012 + 2 trường)
-- ---------------------------------------------------------------------------
create or replace function public.get_wallet_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_bal int; v_promo int; v_ledger jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select coalesce(balance,0), coalesce(promo_balance,0) into v_bal, v_promo
    from public.wallets where user_id = v_uid;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'occurredAt', l.created_at, 'userId', l.user_id, 'kind', l.kind,
    'amount', l.amount, 'shiftId', l.shift_id, 'applicationId', l.application_id, 'note', l.note,
    'pocket', l.pocket
  ) order by l.created_at desc), '[]'::jsonb) into v_ledger
  from public.wallet_ledger l where l.user_id = v_uid;
  return jsonb_build_object('balance', coalesce(v_bal,0), 'promoBalance', coalesce(v_promo,0),
    'ledger', v_ledger);
end; $$;

-- ---------------------------------------------------------------------------
-- 7. Đọc chương trình thưởng (người đăng nhập): mức + số lần còn lại của mình
-- ---------------------------------------------------------------------------
create or replace function public.get_topup_bonus()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.platform_settings; v_times int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_s from public.platform_settings where id;
  select count(*) into v_times from public.payment_orders
    where user_id = v_uid and bonus_amount > 0;
  return jsonb_build_object(
    'minAmount', coalesce(v_s.topup_bonus_min, 0),
    'bonusAmount', coalesce(v_s.topup_bonus_amount, 0),
    'maxPerUser', coalesce(v_s.topup_bonus_max_per_user, 0),
    'timesReceived', v_times
  );
end; $$;
revoke execute on function public.get_topup_bonus() from public, anon;
grant execute on function public.get_topup_bonus() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Admin đặt chương trình thưởng (+ nhật ký 0025)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_topup_bonus(
  p_min int, p_amount int, p_max_per_user int
) returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.platform_settings;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_min is null or p_amount is null or p_max_per_user is null
     or p_min < 2000 or p_min > 100000000
     or p_amount < 0 or p_amount > p_min / 2   -- chống bấm nhầm: thưởng ≤ 50% mức nạp
     or p_max_per_user < 0 or p_max_per_user > 100 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v_old from public.platform_settings where id for update;
  if v_old.topup_bonus_min = p_min and v_old.topup_bonus_amount = p_amount
     and v_old.topup_bonus_max_per_user = p_max_per_user then
    return;
  end if;
  update public.platform_settings
     set topup_bonus_min = p_min, topup_bonus_amount = p_amount,
         topup_bonus_max_per_user = p_max_per_user, updated_at = now()
   where id;
  insert into public.platform_settings_audit (changed_by, field, old_value, new_value)
    values (auth.uid(), 'topup_bonus',
      v_old.topup_bonus_min || '/' || v_old.topup_bonus_amount || '/' || v_old.topup_bonus_max_per_user,
      p_min || '/' || p_amount || '/' || p_max_per_user);
end; $$;
revoke execute on function public.admin_set_topup_bonus(int, int, int) from public, anon;
grant execute on function public.admin_set_topup_bonus(int, int, int) to authenticated;
