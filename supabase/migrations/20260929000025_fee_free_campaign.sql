-- =============================================================================
-- 0025 — Miễn phí dịch vụ theo đợt (P2-3, feedback F12)
-- =============================================================================
-- Mục đích: chạy campaign "Miễn phí tất cả 1 tuần" / "Free cả tháng".
--   * `platform_settings.fee_free_until` (date, giờ Việt Nam): ca tạo phiên cọc
--     đến HẾT ngày này thì phí dịch vụ = 0%. NULL = tắt (mặc định).
--   * `_platform_fee_rate()` — đợt miễn phí có đang chạy không (0 hoặc 0.10).
--   * `_shift_fee_rate(ngày ca)` — tỉ lệ phí cho một ca: 0 nếu đang trong đợt
--     VÀ ngày làm ca <= fee_free_until + 30 ngày. Client khớp bằng
--     `shiftFeeRate` trong src/domain/deposit.ts.
--   * `create_deposit_session_before_verify_guard` (thân từ 0010, đổi tên ở
--     0022) được định nghĩa lại, CHỈ đổi dòng tính phí. Phí lưu vào
--     `payment_sessions.platform_fee` lúc tạo phiên → đối soát (0018) và
--     chuyển phí cho admin (0021) dùng đúng số đó; phí 0 thì không cộng gì.
--   * `get_fee_settings()` — công khai (không bí mật) để trang Đăng ca / Bảng
--     giá hiện "Miễn phí đến hết ...".
--   * `admin_set_fee_free_until(date)` — chỉ admin; NULL để tắt. Mỗi lần đổi
--     ghi `platform_settings_audit` (ai đổi, cũ → mới).
--   * Mép đợt: phiên cọc tạo trong đợt (phí 0) còn hạn 30 phút nên có thể được
--     xác nhận ngay sau khi đợt kết thúc — chấp nhận.
-- Không đổi số tiền của phiên cọc đã tạo trước đó.
-- =============================================================================

alter table public.platform_settings
  add column if not exists fee_free_until date;

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Tỉ lệ phí đang áp dụng
-- ---------------------------------------------------------------------------
create or replace function public._platform_fee_rate()
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare v_until date;
begin
  select fee_free_until into v_until from public.platform_settings where id;
  if v_until is not null
     and (now() at time zone 'Asia/Ho_Chi_Minh')::date <= v_until then
    return 0;
  end if;
  return 0.10;
end; $$;
revoke execute on function public._platform_fee_rate() from public, anon, authenticated;

-- Tỉ lệ phí cho MỘT ca: miễn phí khi đang trong đợt VÀ ngày làm ca không quá
-- 30 ngày sau ngày kết thúc đợt (chủ dự án chốt 29/09 — chặn đăng trước hàng
-- loạt ca ở xa để né phí). Ngày ca thiếu/sai → tính phí bình thường.
create or replace function public._shift_fee_rate(p_shift_date text)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare v_until date; v_date date;
begin
  -- Đọc fee_free_until MỘT lần (không gọi _platform_fee_rate rồi đọc lại —
  -- admin tắt đợt giữa 2 lần đọc sẽ ra NULL và lọt phí 0).
  select fee_free_until into v_until from public.platform_settings where id;
  if v_until is null
     or (now() at time zone 'Asia/Ho_Chi_Minh')::date > v_until then
    return 0.10;
  end if;
  begin
    v_date := p_shift_date::date;
  exception when others then
    return 0.10;
  end;
  if v_date is null or v_date > v_until + 30 then return 0.10; end if;
  return 0;
end; $$;
revoke execute on function public._shift_fee_rate(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Phiên cọc: phí theo `_platform_fee_rate()` (còn lại giữ nguyên 0010)
-- ---------------------------------------------------------------------------
create or replace function public.create_deposit_session_before_verify_guard(
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
  v_fee  := round(v_wage * public._shift_fee_rate(p_shift_payload ->> 'date'))::int;
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
revoke execute on function public.create_deposit_session_before_verify_guard(jsonb, uuid, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Đọc cài đặt phí (công khai)
-- ---------------------------------------------------------------------------
create or replace function public.get_fee_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_until date;
begin
  select fee_free_until into v_until from public.platform_settings where id;
  return jsonb_build_object(
    'feeRate', public._platform_fee_rate(),
    'feeFreeUntil', v_until
  );
end; $$;
revoke execute on function public.get_fee_settings() from public;
grant execute on function public.get_fee_settings() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Admin đặt / tắt đợt miễn phí
-- ---------------------------------------------------------------------------
-- Nhật ký đổi cài đặt ảnh hưởng doanh thu (ai đổi, cũ → mới). Chỉ admin đọc;
-- chỉ ghi qua RPC security definer.
create table if not exists public.platform_settings_audit (
  id         bigint generated always as identity primary key,
  changed_by uuid references public.users(id) on delete set null,
  field      text not null,
  old_value  text,
  new_value  text,
  changed_at timestamptz not null default now()
);
alter table public.platform_settings_audit enable row level security;
revoke all on public.platform_settings_audit from anon, authenticated;
grant select on public.platform_settings_audit to authenticated;
grant all on public.platform_settings_audit to service_role;
create policy platform_settings_audit_admin_sel on public.platform_settings_audit
  for select to authenticated using (public.is_admin());

create or replace function public.admin_set_fee_free_until(p_until date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_old date;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  -- NULL = tắt. Có ngày thì phải từ hôm nay đến tối đa 1 năm tới.
  if p_until is not null and (p_until < v_today or p_until > v_today + 366) then
    raise exception 'INVALID_INPUT';
  end if;
  select fee_free_until into v_old from public.platform_settings where id for update;
  if v_old is not distinct from p_until then return; end if;  -- không đổi → không ghi
  update public.platform_settings
     set fee_free_until = p_until,
         updated_at = now()
   where id;
  insert into public.platform_settings_audit (changed_by, field, old_value, new_value)
    values (auth.uid(), 'fee_free_until', v_old::text, p_until::text);
end; $$;
revoke execute on function public.admin_set_fee_free_until(date) from public, anon;
grant execute on function public.admin_set_fee_free_until(date) to authenticated;
