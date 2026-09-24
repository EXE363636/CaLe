-- Rút tiền THẬT về tài khoản ngân hàng (PayOS Kênh chi) + KHOÁ tạo tiền mô phỏng.
--
-- Bối cảnh: từ 0016 ví nhận tiền THẬT (nạp qua PayOS). Khi đã rút được tiền thật,
-- mọi đường TẠO số dư không qua cổng thật đều là lỗ hổng (tạo tiền giả → rút ra
-- tiền thật). Vì vậy khoá wallet_top_up / wallet_withdraw (mô phỏng, 0012).
--
-- Luồng rút (Edge Function `withdraw`, service_role):
--   begin_withdrawal  : khoá dòng ví, kiểm đủ số dư, TRỪ ví ngay, tạo payout_orders
--                       PENDING (idempotent theo idempotency_key).
--   gọi PayOS Kênh chi (referenceId = payout_orders.id).
--   settle_withdrawal : PROCESSING / SUCCEEDED / FAILED. FAILED → HOÀN lại ví
--                       (một lần duy nhất; trạng thái cuối không đổi nữa).
-- Két trung tâm: giữ đúng mô hình đã chốt (Withdraw: ví −, két giữ nguyên).
-- ADDITIVE + CORRECTIVE. KHÔNG sửa migration đã apply (0001-0016).

-- ---------------------------------------------------------------------------
-- 1. Khoá tạo/rút tiền mô phỏng (hàm vẫn tồn tại, chỉ bỏ quyền gọi từ client)
-- ---------------------------------------------------------------------------
revoke execute on function public.wallet_top_up(int)   from public, anon, authenticated;
revoke execute on function public.wallet_withdraw(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. payout_orders.kind: thêm USER_WITHDRAWAL (người dùng tự rút)
--    Drop mọi CHECK đang ràng buộc cột kind (tên do Postgres tự đặt), thêm lại.
-- ---------------------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'payout_orders'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.payout_orders drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.payout_orders add constraint payout_orders_kind_check
  check (kind in ('WORKER_PAYOUT','EMPLOYER_REFUND','USER_WITHDRAWAL'));

create index if not exists payout_orders_user_created_idx
  on public.payout_orders(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. begin_withdrawal — trừ ví + tạo lệnh rút (service_role)
-- ---------------------------------------------------------------------------
create or replace function public.begin_withdrawal(
  p_user uuid, p_amount int, p_bin text, p_account text, p_name text, p_idem text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_bal int; v_existing public.payout_orders; v_id uuid;
begin
  if p_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_bin is null or p_bin !~ '^[0-9]{6}$' then raise exception 'INVALID_BANK'; end if;
  if p_account is null or p_account !~ '^[0-9A-Za-z]{4,30}$' then raise exception 'INVALID_ACCOUNT'; end if;
  if p_idem is null or length(p_idem) < 8 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;

  -- Idempotent: cùng key → trả lệnh cũ, KHÔNG trừ ví lần hai.
  select * into v_existing from public.payout_orders where idempotency_key = p_idem;
  if found then
    return jsonb_build_object('id', v_existing.id, 'status', v_existing.status, 'replayed', true);
  end if;

  -- Khoá dòng ví: hai lệnh rút song song không thể cùng vượt số dư.
  select balance into v_bal from public.wallets where user_id = p_user for update;
  if coalesce(v_bal, 0) < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into public.payout_orders(
    idempotency_key, kind, user_id, amount, to_bin, to_account_number, to_account_name, status)
  values (p_idem, 'USER_WITHDRAWAL', p_user, p_amount, p_bin, p_account, nullif(trim(p_name), ''), 'PENDING')
  returning id into v_id;

  perform public._wallet_apply(p_user, -p_amount, 'UserWithdrawal', null, null,
    'Rút tiền về tài khoản *' || right(p_account, 4));

  return jsonb_build_object('id', v_id, 'status', 'PENDING');
end; $$;

-- ---------------------------------------------------------------------------
-- 4. settle_withdrawal — cập nhật kết quả chi; FAILED → hoàn ví (một lần)
-- ---------------------------------------------------------------------------
create or replace function public.settle_withdrawal(
  p_id uuid, p_state text, p_provider_ref text, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payout_orders;
begin
  if p_state not in ('PROCESSING','SUCCEEDED','FAILED') then raise exception 'INVALID_STATE'; end if;
  select * into v_o from public.payout_orders
    where id = p_id and kind = 'USER_WITHDRAWAL' for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- Trạng thái cuối: không đổi nữa (chống hoàn tiền hai lần).
  if v_o.status in ('SUCCEEDED','FAILED','CANCELLED') then
    return jsonb_build_object('id', p_id, 'status', v_o.status, 'final', true);
  end if;

  if p_state = 'FAILED' then
    perform public._wallet_apply(v_o.user_id, v_o.amount, 'UserWithdrawalReversed', null, null,
      'Hoàn tiền do rút tiền không thành công');
  end if;

  update public.payout_orders
    set status = p_state,
        provider_ref = coalesce(p_provider_ref, provider_ref),
        fail_reason = case when p_state = 'FAILED' then left(p_reason, 300) else fail_reason end,
        updated_at = now()
    where id = p_id;

  return jsonb_build_object('id', p_id, 'status', p_state);
end; $$;

revoke execute on function public.begin_withdrawal(uuid,int,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.settle_withdrawal(uuid,text,text,text)         from public, anon, authenticated;
grant  execute on function public.begin_withdrawal(uuid,int,text,text,text,text) to service_role;
grant  execute on function public.settle_withdrawal(uuid,text,text,text)         to service_role;
