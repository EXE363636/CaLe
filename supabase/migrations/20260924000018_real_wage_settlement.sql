-- =============================================================================
-- 0018 — Trả tiền công THẬT theo từng người + vắng mặt + hoàn cọc dư
--        + khoá các RPC mô phỏng cũ cho phép vượt quy trình cọc bằng ví.
--
-- Vấn đề trước migration này (tiền thật, sau 0016/0017):
--   1. Lương chỉ trả khi CẢ CA Completed → 1 người vắng (Approved mãi) là
--      không ai nhận lương, cọc kẹt vĩnh viễn (server chưa có RPC vắng mặt).
--   2. Ca tuyển thiếu người: release_deposit chỉ trả người Confirmed, phần cọc
--      của vị trí trống nằm lại két, KHÔNG hoàn employer.
--   3. RPC cũ còn grant authenticated: publish_shift (đăng ca KHÔNG cọc),
--      create/confirm_payment_session (0009: phiên HELD KHÔNG trừ ví → hoàn cọc
--      "ảo" về ví rồi rút tiền thật), release_mock_payment, và base
--      employer_confirm_completion_before_payment_release (xác nhận không trả).
--   4. edit_shift đổi giờ/số vị trí sau khi đã cọc → tiền công lệch cọc.
--
-- Mô hình két giữ nguyên (0012/0015):
--   Trả công : ví worker +payout, két −payout (phí nền tảng ở lại két).
--   Hoàn cọc : ví employer +refund, két KHÔNG đổi.
--
-- Chốt cọc (1 lần / ca): khi không còn ai đang giữ chỗ/đang làm →
--   paid      = tổng tiền công đã trả
--   fee_kept  = phí 10% TƯƠNG ỨNG phần đã trả (vị trí trống/vắng không mất phí)
--   refund    = amount − paid − fee_kept  → ví employer.
--
-- ADDITIVE + CORRECTIVE. Không sửa migration đã apply.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Khoá RPC cũ (client không còn gọi: MockPaymentSession không được dùng,
--    publishAsync không có nơi gọi; ca chỉ đăng qua confirm_deposit_session).
-- ---------------------------------------------------------------------------
revoke execute on function public.publish_shift(jsonb, text, uuid) from public, anon, authenticated;
revoke execute on function public.create_payment_session(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.confirm_payment_session(uuid) from public, anon, authenticated;
revoke execute on function public.release_mock_payment(uuid) from public, anon, authenticated;
revoke execute on function public.employer_confirm_completion_before_payment_release(uuid) from public, anon, authenticated;

-- Mỗi đơn ứng tuyển chỉ nhận tiền công MỘT lần (chống trả trùng).
create unique index if not exists wallet_ledger_wage_once_idx
  on public.wallet_ledger(application_id)
  where kind = 'WorkerWageReleased' and application_id is not null;

-- ---------------------------------------------------------------------------
-- 1. _pay_worker_wage — trả tiền công cho 1 đơn Confirmed (idempotent).
--    Nội bộ: KHÔNG grant authenticated.
-- ---------------------------------------------------------------------------
create or replace function public._pay_worker_wage(p_application_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_app public.applications; v_s public.payment_sessions; v_shift public.shifts;
        v_paid int; v_cap int; v_pay int;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found or v_app.status <> 'Confirmed' or coalesce(v_app.payout_amount, 0) <= 0 then
    return 0;
  end if;

  -- Khoá phiên cọc của ca: tuần tự hoá mọi lần trả/hoàn của cùng một ca.
  select * into v_s from public.payment_sessions
    where shift_id = v_app.shift_id and application_id is null
      and status in ('HELD', 'RELEASED', 'REFUNDED')
    order by created_at desc limit 1
    for update;
  if not found then return 0; end if;   -- ca không có cọc ví → không có gì để trả

  if exists (select 1 from public.wallet_ledger
             where application_id = v_app.id and kind = 'WorkerWageReleased') then
    return 0;                           -- đã trả
  end if;
  if v_s.status <> 'HELD' then raise exception 'DEPOSIT_NOT_HELD'; end if;

  select coalesce(sum(amount), 0) into v_paid from public.wallet_ledger
    where shift_id = v_app.shift_id and kind = 'WorkerWageReleased';
  v_cap := v_s.amount - v_s.platform_fee;
  select * into v_shift from public.shifts where id = v_app.shift_id;
  -- Dung sai làm tròn: cọc tính round(lương×giờ×số vị trí), mỗi người
  -- round(lương×giờ) → tổng có thể lệch tối đa ~1đ mỗi vị trí.
  if v_paid + v_app.payout_amount > v_cap + coalesce(v_shift.positions_total, 1) then
    raise exception 'DEPOSIT_EXCEEDED';
  end if;
  v_pay := least(v_app.payout_amount, v_cap - v_paid);
  if v_pay <= 0 then return 0; end if;

  perform public._wallet_apply(v_app.worker_id, v_pay, 'WorkerWageReleased',
    v_app.shift_id, v_app.id, 'Tiền công ca làm');
  perform public._bank_apply(-v_pay);
  return v_pay;
end; $$;

-- ---------------------------------------------------------------------------
-- 2. _finalize_shift_deposit — trả công mọi đơn Confirmed còn sót, rồi nếu ca
--    đã xong hết thì chốt cọc: hoàn phần dư về ví employer. Idempotent.
--    p_allow_stale = true: bỏ qua đơn Approved/CancellationRequested "treo"
--    (ca đã huỷ, hoặc đã hết giờ mà người đó không đến / không ai xử lý).
--    Nội bộ: KHÔNG grant authenticated.
-- ---------------------------------------------------------------------------
create or replace function public._finalize_shift_deposit(p_shift_id uuid, p_allow_stale boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_s public.payment_sessions; r record;
        v_paid int; v_cap int; v_fee_kept int; v_refund int;
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

  if v_refund > 0 then
    perform public._wallet_apply(v_s.employer_id, v_refund, 'EmployerUnusedRefund',
      p_shift_id, null, 'Hoàn cọc phần không sử dụng');
  end if;

  update public.payment_sessions
    set status = case when v_paid > 0 then 'RELEASED' else 'REFUNDED' end,
        released_at = case when v_paid > 0 then now() else released_at end,
        updated_at = now()
    where id = v_s.id;

  if v_paid > 0 then
    insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
      values (v_s.id, p_shift_id, null, 'WORKER_PAYOUT', v_paid)
      on conflict (payment_session_id, entry_type) do nothing;
  end if;
  if v_fee_kept > 0 then
    insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
      values (v_s.id, p_shift_id, null, 'PLATFORM_FEE', v_fee_kept)
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
    'refund', v_refund, 'amount', v_refund);
end; $$;

revoke execute on function public._pay_worker_wage(uuid) from public, anon, authenticated;
revoke execute on function public._finalize_shift_deposit(uuid, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. employer_confirm_completion — trả công NGAY cho người vừa xác nhận
--    (không chờ cả ca), chốt cọc nếu ca đã xong hết.
-- ---------------------------------------------------------------------------
create or replace function public.employer_confirm_completion(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_result uuid; v_sid uuid;
begin
  v_result := public.employer_confirm_completion_before_payment_release(p_application_id);
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is not null then
    perform public._finalize_shift_deposit(v_sid, false);
  end if;
  return v_result;
end; $$;

-- release_deposit (grant authenticated từ 0010) — giữ chữ ký, đổi sang luồng mới.
create or replace function public.release_deposit(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions;
begin
  select * into v_s from public.payment_sessions where id = p_payment_id;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status <> 'HELD' then return jsonb_build_object('status', v_s.status); end if;
  if v_s.shift_id is null or v_s.application_id is not null then raise exception 'INVALID_SESSION_STATE'; end if;
  return public._finalize_shift_deposit(v_s.shift_id, false);
end; $$;

-- ---------------------------------------------------------------------------
-- 4. employer_mark_no_show — employer đánh dấu người lao động VẮNG MẶT.
--    Chỉ đơn Approved chưa check-in / chưa được xác nhận có mặt, sau giờ bắt
--    đầu + 15 phút (khớp CHECK_IN_LATE_MINUTES ở client). Không giới hạn trên
--    để ca luôn đóng được. Người cuối cùng được xử lý → chốt cọc.
-- ---------------------------------------------------------------------------
create or replace function public.employer_mark_no_show(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);

  if v_app.status = 'NoShow' then return p_application_id; end if;   -- idempotent
  if v_app.status <> 'Approved' or v_app.check_in_at is not null or v_app.marked_present_at is not null then
    raise exception 'INVALID_STATE_FOR_NO_SHOW';
  end if;
  if v_shift.status in ('Cancelled', 'Completed', 'Expired') then raise exception 'INVALID_STATE_FOR_NO_SHOW'; end if;
  if now() < public.shift_start_ts(v_shift.date, v_shift.start_time) + interval '15 minutes' then
    raise exception 'NO_SHOW_TOO_EARLY';
  end if;

  update public.applications set status = 'NoShow'
    where id = p_application_id and status = 'Approved';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_NO_SHOW'; end if;

  -- Hết người đang giữ chỗ → ca Completed (nếu có người làm) + chốt cọc.
  if not exists (
    select 1 from public.applications
    where shift_id = v_sid and status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Disputed')
  ) then
    if exists (select 1 from public.applications where shift_id = v_sid and status = 'Confirmed') then
      update public.shifts set status = 'Completed', updated_at = now() where id = v_sid;
    end if;
    perform public._finalize_shift_deposit(v_sid, false);
  end if;
  return p_application_id;
end; $$;

revoke execute on function public.employer_mark_no_show(uuid) from public, anon;
grant execute on function public.employer_mark_no_show(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. refund_deposit_for_shift — hoàn cọc ca HUỶ / HẾT HẠN, trừ phần đã trả công.
--    Hết hạn: chỉ sau giờ kết thúc + 60 phút (hết cửa sổ xác nhận có mặt, để
--    không hoàn cọc trong lúc người lao động vẫn có thể được xác nhận).
-- ---------------------------------------------------------------------------
create or replace function public.refund_deposit_for_shift(p_shift_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_shift public.shifts;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  if v_shift.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;

  if v_shift.status <> 'Cancelled' then
    if now() < public.shift_end_ts(v_shift.date, v_shift.end_time) + interval '60 minutes' then
      raise exception 'SHIFT_NOT_REFUNDABLE';
    end if;
    if exists (select 1 from public.applications
               where shift_id = p_shift_id and status in ('CheckedIn','CheckedOut','Disputed')) then
      raise exception 'SHIFT_NOT_REFUNDABLE';
    end if;
  end if;
  return public._finalize_shift_deposit(p_shift_id, true);
end; $$;

revoke execute on function public.refund_deposit_for_shift(uuid) from public, anon;
grant execute on function public.refund_deposit_for_shift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. edit_shift — chặn sửa giờ/số vị trí vượt quá tiền cọc đã giữ; cập nhật
--    tiền công của người đã duyệt theo giờ mới.
-- ---------------------------------------------------------------------------
alter function public.edit_shift(uuid, jsonb) rename to edit_shift_before_deposit_guard;
revoke execute on function public.edit_shift_before_deposit_guard(uuid, jsonb) from public, anon, authenticated;

create or replace function public.edit_shift(p_shift_id uuid, p_patch jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_result uuid; v_shift public.shifts; v_s public.payment_sessions; v_per int;
begin
  v_result := public.edit_shift_before_deposit_guard(p_shift_id, p_patch);
  select * into v_shift from public.shifts where id = p_shift_id;
  v_per := round(v_shift.hourly_wage
                 * extract(epoch from (v_shift.end_time - v_shift.start_time)) / 3600.0)::int;

  select * into v_s from public.payment_sessions
    where shift_id = p_shift_id and application_id is null and status = 'HELD'
    order by created_at desc limit 1;
  if found and v_per * v_shift.positions_total
               > (v_s.amount - v_s.platform_fee) + v_shift.positions_total then
    raise exception 'DEPOSIT_TOO_LOW';   -- rollback cả phần sửa
  end if;

  update public.applications set payout_amount = v_per
    where shift_id = p_shift_id and status in ('Approved', 'CancellationRequested');
  return v_result;
end; $$;

revoke execute on function public.edit_shift(uuid, jsonb) from public, anon;
grant execute on function public.edit_shift(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Bỏ chữ "mô phỏng" trong lịch sử ví (tiền đã là tiền thật).
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
    'Giữ cọc đăng ca');

  update public.payment_sessions
    set status = 'HELD', paid_at = now(), shift_id = v_shift_id, published_shift_id = v_shift_id,
        provider_code = '00', provider_message = 'wallet hold', updated_at = now()
    where id = p_payment_id and status = 'PENDING';
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_shift_id, null, 'HOLD', v_s.amount) on conflict (payment_session_id, entry_type) do nothing;

  return jsonb_build_object('status', 'HELD', 'shift_id', v_shift_id, 'order_code', v_s.order_code);
end; $$;

update public.wallet_ledger
  set note = replace(note, ' (mô phỏng)', '')
  where note like '%(mô phỏng)%';
