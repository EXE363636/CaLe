-- ===========================================================================
-- Mock payment simulator (2026-09-18) — provider CALE_MOCK.
--
-- TUYỆT ĐỐI KHÔNG giao dịch thật, KHÔNG gọi payOS/ngân hàng. Đây là mô phỏng
-- phục vụ demo, thiết kế để sau này thay bằng provider thật (PAYOS) mà không
-- viết lại UI/DB.
--
-- Bảng provider-agnostic:
--   payment_channels  — kênh ngân hàng (mock, số TK đã che), chọn khi tạo QR.
--   payment_sessions  — phiên thanh toán chung (CREATED/PENDING/PAID/CANCELLED/
--                        EXPIRED/FAILED), có provider/provider_payment_id/
--                        provider_response/channel để sẵn sàng cho live.
--
-- Bất biến:
--   - RLS: employer chỉ ĐỌC phiên của chính mình; client KHÔNG được INSERT/UPDATE
--     (không sửa amount/employer_id/status). Mọi thay đổi qua RPC SECURITY DEFINER.
--   - amount TÍNH LẠI Ở SERVER từ lương×thời lượng×số vị trí (không tin client).
--   - RPC kiểm auth.uid(); confirm + publish idempotent; provider quyết định ở
--     server (client không chọn provider). Chỉ MOCK được bật.
--   - search_path='' + tên đầy đủ; revoke execute khỏi public/anon, grant authenticated.
--   - KHÔNG secret trong dữ liệu mock. Live keys (nếu có sau này) chỉ ở Edge Function
--     Secrets, KHÔNG trong migration/Git.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. payment_channels
-- ---------------------------------------------------------------------------
create table if not exists public.payment_channels (
  id                     uuid primary key default gen_random_uuid(),
  provider               text not null,
  mode                   text not null,
  display_name           text not null,
  bank_code              text,
  bank_name              text,
  bank_bin               text,
  account_name           text,
  account_number_masked  text,
  logo_path              text,
  enabled                boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint payment_channels_provider_ck check (provider in ('CALE_MOCK','PAYOS')),
  constraint payment_channels_mode_ck check (mode in ('MOCK','LIVE'))
);

-- ---------------------------------------------------------------------------
-- 2. payment_sessions (provider-agnostic, live-ready)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_sessions (
  id                   uuid primary key default gen_random_uuid(),
  employer_id          uuid not null references public.users (id) on delete cascade,
  payment_channel_id   uuid references public.payment_channels (id),
  client_request_id    text not null,
  order_code           text not null,
  amount               integer not null,
  currency             text not null default 'VND',
  status               text not null default 'PENDING',
  provider             text not null,
  provider_payment_id  text,
  provider_response    jsonb,
  provider_code        text,
  provider_message     text,
  shift_payload        jsonb not null,
  qr_payload           text,
  published_shift_id   uuid references public.shifts (id) on delete set null,
  expires_at           timestamptz,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint payment_sessions_status_ck check (status in ('CREATED','PENDING','PAID','CANCELLED','EXPIRED','FAILED')),
  constraint payment_sessions_amount_ck check (amount >= 0),
  constraint payment_sessions_provider_ck check (provider in ('CALE_MOCK','PAYOS')),
  constraint payment_sessions_client_req_uniq unique (employer_id, client_request_id)
);
create index if not exists payment_sessions_employer_idx on public.payment_sessions (employer_id);

-- ---------------------------------------------------------------------------
-- 3. RLS + grants
-- ---------------------------------------------------------------------------
alter table public.payment_channels enable row level security;
alter table public.payment_sessions enable row level security;

revoke all on public.payment_channels from anon, authenticated;
revoke all on public.payment_sessions from anon, authenticated;
grant select on public.payment_channels to authenticated;
grant select on public.payment_sessions to authenticated;
grant select, insert, update, delete on public.payment_channels, public.payment_sessions to service_role;

-- Kênh: authenticated đọc kênh đang bật (để chọn ngân hàng). Không sửa được.
create policy payment_channels_select on public.payment_channels
  for select to authenticated using (enabled = true);

-- Phiên: employer chỉ đọc phiên CỦA MÌNH. Không có policy insert/update/delete cho
-- authenticated → chỉ đổi qua RPC SECURITY DEFINER (không tự sửa amount/status).
create policy payment_sessions_select on public.payment_sessions
  for select to authenticated using (employer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Helper: tính amount ở SERVER (không tin client)
-- ---------------------------------------------------------------------------
create or replace function public.compute_shift_amount(p_payload jsonb)
returns integer language plpgsql immutable set search_path = '' as $$
declare v_wage int; v_start time; v_end time; v_pos int; v_hours numeric;
begin
  begin
    v_wage  := (p_payload ->> 'hourly_wage')::int;
    v_start := (p_payload ->> 'start_time')::time;
    v_end   := (p_payload ->> 'end_time')::time;
    v_pos   := (p_payload ->> 'positions_total')::int;
  exception when others then raise exception 'INVALID_PAYLOAD'; end;
  if v_wage is null or v_start is null or v_end is null or v_pos is null then raise exception 'INVALID_PAYLOAD'; end if;
  if v_end <= v_start then raise exception 'INVALID_TIME_RANGE'; end if;
  if v_wage <= 0 or v_pos < 1 then raise exception 'INVALID_PAYLOAD'; end if;
  v_hours := extract(epoch from (v_end - v_start)) / 3600.0;
  return round(v_wage * v_hours * v_pos)::int;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: create_payment_session — tạo phiên PENDING (mô phỏng)
-- ---------------------------------------------------------------------------
create or replace function public.create_payment_session(
  p_channel_id uuid,
  p_client_request_id text,
  p_shift_payload jsonb
)
returns public.payment_sessions language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ch public.payment_channels; v_amount int;
        v_order text; v_row public.payment_sessions; v_existing public.payment_sessions;
begin
  perform public.require_active_employer();
  if p_client_request_id is null or btrim(p_client_request_id) = '' or length(p_client_request_id) > 200 then
    raise exception 'INVALID_CLIENT_REQUEST_ID'; end if;

  -- Idempotent theo (employer, client_request_id): trả phiên đã có, không tạo trùng.
  select * into v_existing from public.payment_sessions
    where employer_id = v_uid and client_request_id = p_client_request_id;
  if found then return v_existing; end if;

  select * into v_ch from public.payment_channels where id = p_channel_id;
  if not found then raise exception 'CHANNEL_NOT_FOUND'; end if;
  if not v_ch.enabled then raise exception 'CHANNEL_DISABLED'; end if;
  -- Chỉ MOCK được phép (live provider chưa bật khi chưa có credentials).
  if v_ch.mode <> 'MOCK' then raise exception 'CHANNEL_NOT_AVAILABLE'; end if;

  v_amount := public.compute_shift_amount(p_shift_payload);
  v_order  := 'CALE' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.payment_sessions(
    employer_id, payment_channel_id, client_request_id, order_code, amount, currency,
    status, provider, shift_payload, provider_code, provider_message, expires_at
  ) values (
    v_uid, p_channel_id, p_client_request_id, v_order, v_amount, 'VND',
    'PENDING', v_ch.provider, p_shift_payload, '00', 'created', now() + interval '30 minutes'
  ) returning * into v_row;

  -- QR payload VÔ HẠI: không số TK/mã NH thật/secret/PII. bank_code chỉ là mã demo.
  update public.payment_sessions set qr_payload = jsonb_build_object(
    'type', 'CALE_MOCK_PAYMENT',
    'paymentId', v_row.id,
    'orderCode', v_row.order_code,
    'amount', v_row.amount,
    'currency', 'VND',
    'provider', v_ch.provider,
    'channelId', p_channel_id,
    'bankCode', v_ch.bank_code,
    'realTransaction', false
  )::text
  where id = v_row.id returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: confirm_payment_session — PENDING→PAID + publish ca (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_payment_session(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_shift_id uuid;
begin
  perform public.require_active_employer();
  select * into v_s from public.payment_sessions where id = p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;

  -- Idempotent: đã PAID → trả lại ca đã đăng, KHÔNG publish/đổi lần hai.
  if v_s.status = 'PAID' then
    return jsonb_build_object('status', 'PAID', 'shift_id', v_s.published_shift_id, 'order_code', v_s.order_code);
  end if;
  if v_s.status <> 'PENDING' then raise exception 'INVALID_SESSION_STATE'; end if;
  if v_s.expires_at is not null and now() > v_s.expires_at then
    update public.payment_sessions set status = 'EXPIRED', updated_at = now() where id = p_payment_id;
    raise exception 'SESSION_EXPIRED';
  end if;

  -- Publish ca bằng RPC hiện có (idempotent theo employer_id+client_request_id).
  v_shift_id := public.publish_shift(v_s.shift_payload, v_s.client_request_id, null);

  update public.payment_sessions
    set status = 'PAID', paid_at = now(), provider_code = '00', provider_message = 'success',
        provider_payment_id = coalesce(provider_payment_id, id::text),
        published_shift_id = v_shift_id, updated_at = now()
    where id = p_payment_id and status = 'PENDING';

  return jsonb_build_object('status', 'PAID', 'shift_id', v_shift_id, 'order_code', v_s.order_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. RPC: cancel_payment_session
-- ---------------------------------------------------------------------------
create or replace function public.cancel_payment_session(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions;
begin
  perform public.require_active_employer();
  select * into v_s from public.payment_sessions where id = p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status = 'CANCELLED' then return jsonb_build_object('status', 'CANCELLED'); end if;
  if v_s.status not in ('CREATED', 'PENDING') then raise exception 'INVALID_SESSION_STATE'; end if;
  update public.payment_sessions set status = 'CANCELLED', updated_at = now() where id = p_payment_id;
  return jsonb_build_object('status', 'CANCELLED');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. EXECUTE grants
-- ---------------------------------------------------------------------------
revoke execute on function public.compute_shift_amount(jsonb) from public, anon;
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.create_payment_session(uuid, text, jsonb)',
    'public.confirm_payment_session(uuid)',
    'public.cancel_payment_session(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated;', fn);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Seed kênh MOCK (số TK đã che, nhãn Demo) — KHÔNG số TK thật
-- ---------------------------------------------------------------------------
insert into public.payment_channels (provider, mode, display_name, bank_code, bank_name, bank_bin, account_name, account_number_masked, logo_path, enabled)
values
  ('CALE_MOCK','MOCK','MB Bank (Demo)','MB','Ngân hàng Quân đội (Demo)','970422','CALE DEMO','xxxx-xxxx-1234','/images/banks/mb.png', true),
  ('CALE_MOCK','MOCK','Vietcombank (Demo)','VCB','Vietcombank (Demo)','970436','CALE DEMO','xxxx-xxxx-5678','/images/banks/vcb.png', true),
  ('CALE_MOCK','MOCK','ACB (Demo)','ACB','ACB (Demo)','970416','CALE DEMO','xxxx-xxxx-9012','/images/banks/acb.png', true),
  ('CALE_MOCK','MOCK','BIDV (Demo)','BIDV','BIDV (Demo)','970418','CALE DEMO','xxxx-xxxx-3456','/images/banks/bidv.png', true)
on conflict do nothing;
