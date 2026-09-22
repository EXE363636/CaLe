-- Ví READ-ONLY (supabase) — suy từ dữ liệu server, KHÔNG để ví ở client (bất biến #7).
--
-- Worker: mỗi đơn Confirmed = tiền công đã nhả (employer_confirm_completion đã
-- RELEASED cọc) → 1 dòng ledger WorkerWageReleased (+payout_amount). Read-only,
-- KHÔNG nạp/rút, KHÔNG giao dịch thật ("sổ cái mô phỏng").
--
-- ADDITIVE: chỉ thêm 1 RPC đọc; không sửa bảng/migration đã apply.
-- security definer + search_path='' + chỉ đọc của auth.uid() + revoke/grant chuẩn.

create or replace function public.get_wallet_ledger()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select coalesce(jsonb_agg(e order by (e->>'occurredAt')), '[]'::jsonb) into v_out
  from (
    select jsonb_build_object(
      'id', 'wage-' || a.id,
      'occurredAt', coalesce(a.confirmed_at, now()),
      'userId', v_uid,
      'kind', 'WorkerWageReleased',
      'amount', coalesce(a.payout_amount, 0),
      'shiftId', a.shift_id,
      'applicationId', a.id,
      'note', 'Lương ca "' || coalesce(s.title, 'ca làm') || '" (mô phỏng)'
    ) as e
    from public.applications a
    join public.shifts s on s.id = a.shift_id
    where a.worker_id = v_uid
      and a.status = 'Confirmed'
      and coalesce(a.payout_amount, 0) > 0
  ) t;
  return v_out;
end;
$$;

revoke execute on function public.get_wallet_ledger() from public, anon;
grant execute on function public.get_wallet_ledger() to authenticated;
