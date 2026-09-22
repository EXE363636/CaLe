-- Hoàn cọc (mô phỏng) khi ca BỊ HUỶ hoặc HẾT HẠN KHÔNG CÓ NGƯỜI LÀM.
-- Trước migration này: cancel_shift chỉ đổi escrow_status='Refunded' (nhãn) mà
-- KHÔNG trả tiền cọc về ví employer → tiền "kẹt" trong két. Đây là fix.
--
-- Mô hình két (khớp 0012):
--   Lock (HELD)   : ví employer -amount, két KHÔNG đổi (tiền treo trong két).
--   Refund        : ví employer +amount, két KHÔNG đổi (tiền treo → về ví employer).
-- ADDITIVE + CORRECTIVE: thêm 'REFUNDED' vào payment status + 'REFUND' vào
-- ledger entry_type; thêm RPC refund_deposit_for_shift. KHÔNG sửa migration đã apply.

-- ---------------------------------------------------------------------------
-- 1. Mở rộng ràng buộc trạng thái
-- ---------------------------------------------------------------------------
alter table public.payment_sessions drop constraint if exists payment_sessions_status_ck;
alter table public.payment_sessions add constraint payment_sessions_status_ck
  check (status in ('CREATED','PENDING','HELD','RELEASED','CANCELLED','EXPIRED','REFUNDED'));

-- Drop mọi CHECK constraint đang ràng buộc entry_type (tên có thể do Postgres
-- tự đặt), rồi thêm lại gồm 'REFUND'. Robust nếu tên constraint khác dự kiến.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'mock_payment_ledger'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%entry_type%'
  loop
    execute format('alter table public.mock_payment_ledger drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.mock_payment_ledger add constraint mock_payment_ledger_entry_type_check
  check (entry_type in ('HOLD','WORKER_PAYOUT','PLATFORM_FEE','REFUND'));

-- ---------------------------------------------------------------------------
-- 2. RPC: hoàn cọc cho một ca (idempotent, tự kiểm điều kiện ở server)
-- ---------------------------------------------------------------------------
-- Điều kiện hoàn (một trong hai):
--   a) Ca đã BỊ HUỶ (status='Cancelled'), hoặc
--   b) Ca đã QUA GIỜ KẾT THÚC và KHÔNG có ai Confirmed (không ai làm → hết hạn).
-- Chỉ hoàn phiên đang HELD; đã REFUNDED/khác → no-op (idempotent).
create or replace function public.refund_deposit_for_shift(p_shift_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_shift public.shifts;
  v_s public.payment_sessions;
  v_end timestamptz;
  v_has_confirmed boolean;
  v_refundable boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  if v_shift.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;

  -- Phiên cọc đang giữ (HELD). Không có → đã hoàn hoặc chưa từng giữ → no-op.
  select * into v_s from public.payment_sessions
    where shift_id = p_shift_id and status = 'HELD'
    order by created_at desc limit 1
    for update;
  if not found then
    return jsonb_build_object('status', 'NO_HELD_SESSION');
  end if;

  -- Điều kiện hoàn.
  v_end := public.shift_start_ts(v_shift.date, v_shift.end_time);
  select exists(
    select 1 from public.applications
    where shift_id = p_shift_id and status = 'Confirmed'
  ) into v_has_confirmed;
  v_refundable := (v_shift.status = 'Cancelled')
    or (now() >= v_end and not v_has_confirmed);
  if not v_refundable then raise exception 'SHIFT_NOT_REFUNDABLE'; end if;

  -- Hoàn cọc về ví employer. Két KHÔNG đổi (tiền vốn treo trong két).
  perform public._wallet_apply(v_s.employer_id, v_s.amount, 'EmployerUnusedRefund',
    p_shift_id, null, 'Hoàn cọc ca huỷ/hết hạn (mô phỏng)');

  update public.payment_sessions set status = 'REFUNDED', updated_at = now()
    where id = v_s.id;
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, p_shift_id, null, 'REFUND', v_s.amount)
    on conflict (payment_session_id, entry_type) do nothing;

  return jsonb_build_object('status', 'REFUNDED', 'amount', v_s.amount);
end; $$;

revoke execute on function public.refund_deposit_for_shift(uuid) from public, anon;
grant execute on function public.refund_deposit_for_shift(uuid) to authenticated;
