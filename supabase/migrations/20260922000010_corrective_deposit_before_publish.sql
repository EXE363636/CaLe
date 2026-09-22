-- Corrective: "đăng ca phải thanh toán trước" (deposit-before-publish, CALE_MOCK).
--
-- Mô hình: employer trả CỌC TỔNG cho ca (lương × giờ × số vị trí + phí 10%) TRƯỚC,
-- khi "giữ tiền" (HELD) thì ca mới được publish (từ shift_payload). Đây là khôi
-- phục mô hình pay-then-publish của 0007, cộng ledger/HELD/RELEASED của 0009.
--
-- ADDITIVE — KHÔNG sửa/RPC per-worker của 0009 (create_payment_session(uuid,…),
-- confirm_payment_session, release_mock_payment vẫn còn) để frontend đang deploy
-- không gãy khi push migration này. Frontend mới gọi các hàm *_deposit_* dưới đây.
-- 0007/0008/0009 đã apply — giữ nguyên, chỉ CREATE OR REPLACE / ADD.

-- Ledger cho phép cọc chưa gắn worker (deposit lúc đăng chưa có application).
alter table public.mock_payment_ledger
  alter column application_id drop not null;

-- ---------------------------------------------------------------------------
-- create_deposit_session — tạo phiên cọc PENDING cho một ca CHƯA đăng (payload).
-- Amount tính ở SERVER = compute_shift_amount(payload) + phí 10%. Idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.create_deposit_session(
  p_shift_payload jsonb,
  p_channel_id uuid,
  p_client_request_id text
) returns public.payment_sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ch public.payment_channels;
  v_wage int; v_fee int; v_order text;
  v_row public.payment_sessions; v_existing public.payment_sessions;
begin
  perform public.require_active_employer();
  if p_client_request_id is null or btrim(p_client_request_id) = '' or length(p_client_request_id) > 200 then
    raise exception 'INVALID_CLIENT_REQUEST_ID'; end if;

  -- Idempotent theo (employer, client_request_id).
  select * into v_existing from public.payment_sessions
    where employer_id = v_uid and client_request_id = p_client_request_id;
  if found then return v_existing; end if;

  select * into v_ch from public.payment_channels where id = p_channel_id;
  if not found then raise exception 'CHANNEL_NOT_FOUND'; end if;
  if not v_ch.enabled then raise exception 'CHANNEL_DISABLED'; end if;
  if v_ch.mode <> 'MOCK' or v_ch.provider <> 'CALE_MOCK' then raise exception 'CHANNEL_NOT_AVAILABLE'; end if;

  -- compute_shift_amount = wage × giờ × số vị trí (raise INVALID_PAYLOAD nếu thiếu).
  v_wage := public.compute_shift_amount(p_shift_payload);
  v_fee  := round(v_wage * 0.10)::int;
  v_order := 'CALE' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.payment_sessions(
    employer_id, payment_channel_id, client_request_id, order_code, amount, currency,
    status, provider, shift_payload, platform_fee, provider_code, provider_message, expires_at
  ) values (
    v_uid, p_channel_id, p_client_request_id, v_order, v_wage + v_fee, 'VND',
    'PENDING', 'CALE_MOCK', p_shift_payload, v_fee, '00', 'created', now() + interval '30 minutes'
  ) returning * into v_row;

  -- QR VÔ HẠI: chỉ dữ liệu thử, không số TK/secret/PII.
  update public.payment_sessions set qr_payload = jsonb_build_object(
    'type', 'CALE_MOCK_DEPOSIT', 'paymentId', v_row.id, 'orderCode', v_row.order_code,
    'amount', v_row.amount, 'currency', 'VND', 'provider', 'CALE_MOCK',
    'channelId', p_channel_id, 'realTransaction', false
  )::text where id = v_row.id returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_deposit_session — PENDING→HELD + PUBLISH ca từ payload (idempotent).
-- Ca chỉ tồn tại sau khi giữ tiền. Ghi ledger HOLD (chưa gắn worker).
-- ---------------------------------------------------------------------------
create or replace function public.confirm_deposit_session(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_shift_id uuid;
begin
  perform public.require_active_employer();
  select * into v_s from public.payment_sessions where id = p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;

  -- Idempotent: đã HELD/RELEASED → trả ca đã publish, không publish lần hai.
  if v_s.status in ('HELD','RELEASED') then
    return jsonb_build_object('status', v_s.status,
      'shift_id', coalesce(v_s.shift_id, v_s.published_shift_id), 'order_code', v_s.order_code);
  end if;
  if v_s.status <> 'PENDING' then raise exception 'INVALID_SESSION_STATE'; end if;
  if v_s.expires_at is not null and now() > v_s.expires_at then
    update public.payment_sessions set status = 'EXPIRED', updated_at = now() where id = p_payment_id;
    raise exception 'SESSION_EXPIRED';
  end if;

  -- Publish ca bằng RPC hiện có (idempotent theo employer_id + client_request_id).
  v_shift_id := public.publish_shift(v_s.shift_payload, v_s.client_request_id, null);

  update public.payment_sessions
    set status = 'HELD', paid_at = now(), shift_id = v_shift_id, published_shift_id = v_shift_id,
        provider_code = '00', provider_message = 'mock hold', updated_at = now()
    where id = p_payment_id and status = 'PENDING';

  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_shift_id, null, 'HOLD', v_s.amount)
    on conflict (payment_session_id, entry_type) do nothing;

  return jsonb_build_object('status', 'HELD', 'shift_id', v_shift_id, 'order_code', v_s.order_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- release_deposit — HELD→RELEASED khi ca đã Completed. Idempotent. Ghi ledger
-- WORKER_PAYOUT (amount − fee) + PLATFORM_FEE.
-- ---------------------------------------------------------------------------
create or replace function public.release_deposit(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_shift public.shifts; v_payout int;
begin
  select * into v_s from public.payment_sessions where id = p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status = 'RELEASED' then return jsonb_build_object('status','RELEASED'); end if;
  if v_s.status <> 'HELD' then raise exception 'INVALID_SESSION_STATE'; end if;
  select * into v_shift from public.shifts where id = v_s.shift_id;
  if not found or v_shift.status <> 'Completed' then raise exception 'SHIFT_NOT_COMPLETED'; end if;

  v_payout := v_s.amount - v_s.platform_fee;
  update public.payment_sessions set status = 'RELEASED', released_at = now(), updated_at = now() where id = v_s.id;
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_s.shift_id, null, 'WORKER_PAYOUT', v_payout)
    on conflict (payment_session_id, entry_type) do nothing;
  insert into public.mock_payment_ledger(payment_session_id, shift_id, application_id, entry_type, amount)
    values (v_s.id, v_s.shift_id, null, 'PLATFORM_FEE', v_s.platform_fee)
    on conflict (payment_session_id, entry_type) do nothing;
  return jsonb_build_object('status','RELEASED','worker_payout',v_payout,'platform_fee',v_s.platform_fee);
end;
$$;

-- ---------------------------------------------------------------------------
-- employer_confirm_completion (wrapper) — sau khi xác nhận hoàn thành, nếu ca đã
-- Completed thì nhả CỌC theo shift_id. Lookup theo shift (deposit) thay vì
-- application (per-worker cũ). release_deposit tự no-op nếu ca chưa Completed.
-- Base _before_payment_release do 0009 tạo, giữ nguyên.
-- ---------------------------------------------------------------------------
create or replace function public.employer_confirm_completion(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_result uuid; v_shift_id uuid; v_payment uuid;
begin
  v_result := public.employer_confirm_completion_before_payment_release(p_application_id);
  select shift_id into v_shift_id from public.applications where id = p_application_id;
  if v_shift_id is not null then
    select id into v_payment from public.payment_sessions
      where shift_id = v_shift_id and status = 'HELD' limit 1;
    if v_payment is not null then perform public.release_deposit(v_payment); end if;
  end if;
  return v_result;
end;
$$;

-- Grants: revoke public/anon, grant authenticated.
revoke execute on function public.create_deposit_session(jsonb, uuid, text) from public, anon;
revoke execute on function public.confirm_deposit_session(uuid) from public, anon;
revoke execute on function public.release_deposit(uuid) from public, anon;
grant execute on function public.create_deposit_session(jsonb, uuid, text) to authenticated;
grant execute on function public.confirm_deposit_session(uuid) to authenticated;
grant execute on function public.release_deposit(uuid) to authenticated;
