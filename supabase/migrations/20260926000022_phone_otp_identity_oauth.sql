-- =============================================================================
-- 0022 — Xác thực SĐT (OTP SMS) + xác thực CCCD (admin duyệt tay) + đăng nhập
--        Google (OAuth, bước chọn vai trò sau lần đăng nhập đầu).
-- ADDITIVE + CORRECTIVE. Không sửa migration đã apply.
--
--   1. users.phone_verified_at / identity_verified_at. Đổi SĐT → mất xác thực.
--   2. platform_settings: require_phone_verification, require_employer_identity
--      (mặc định TẮT — admin bật trong tab Xác minh khi SMS đã gửi được thật),
--      otp_daily_cap (trần số OTP toàn hệ thống / 24h — chặn đốt tiền SMS).
--   3. phone_otps + _phone_otp_issue (service_role, gọi từ Edge Function
--      phone-otp; giới hạn chống spam) + verify_phone_otp (authenticated).
--   4. identity_verifications + bucket riêng tư identity-docs + RPC nộp/duyệt.
--   5. Chặn server: apply (worker) cần SĐT; create_deposit_session (employer
--      đăng ca) cần SĐT + CCCD — theo cờ ở (2). Bọc hàm cũ (rename + wrapper).
--   6. OAuth: handle_new_user bỏ qua user OAuth chưa có vai trò (trước đây RAISE
--      → đăng nhập Google lỗi); complete_oauth_signup tạo hồ sơ sau khi chọn vai trò.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Cột xác thực trên users
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists phone_verified_at    timestamptz,
  add column if not exists identity_verified_at timestamptz;

-- Một SĐT đã xác thực chỉ thuộc một tài khoản.
create unique index if not exists users_verified_phone_uidx
  on public.users (phone) where phone_verified_at is not null;

-- Client chỉ được update(phone) (grant cột, 0001) → không tự đặt được
-- phone_verified_at. Đổi SĐT mà không kèm đặt lại dấu xác thực (chỉ hàm
-- verify_phone_otp làm vậy) → xoá dấu xác thực.
create or replace function public._users_phone_change_reset()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.phone is distinct from old.phone
     and new.phone_verified_at is not distinct from old.phone_verified_at then
    new.phone_verified_at := null;
  end if;
  return new;
end; $$;

drop trigger if exists users_phone_change_reset on public.users;
create trigger users_phone_change_reset
  before update of phone on public.users
  for each row execute function public._users_phone_change_reset();

-- ---------------------------------------------------------------------------
-- 2. Cờ bắt buộc + trần OTP
-- ---------------------------------------------------------------------------
alter table public.platform_settings
  add column if not exists require_phone_verification boolean not null default false,
  add column if not exists require_employer_identity  boolean not null default false,
  add column if not exists otp_daily_cap              int     not null default 300;

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. OTP số điện thoại
-- ---------------------------------------------------------------------------
create table if not exists public.phone_otps (
  id          uuid primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  phone       text not null,
  code_hash   text not null,          -- sha256(id || ':' || code), hex
  ip          text,
  attempts    int  not null default 0,
  send_status text not null default 'PENDING'
              check (send_status in ('PENDING', 'SENT', 'FAILED')),
  fail_reason text,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists phone_otps_user_idx    on public.phone_otps (user_id, created_at desc);
create index if not exists phone_otps_phone_idx   on public.phone_otps (phone, created_at desc);
create index if not exists phone_otps_ip_idx      on public.phone_otps (ip, created_at desc);
create index if not exists phone_otps_created_idx on public.phone_otps (created_at);

alter table public.phone_otps enable row level security;   -- không policy: chỉ service_role
revoke all on public.phone_otps from public, anon, authenticated;
grant all on public.phone_otps to service_role;

-- Chuẩn hoá SĐT VN về dạng 0xxxxxxxxx ('' nếu không hợp lệ).
create or replace function public.normalize_vn_phone(p_phone text)
returns text language sql immutable set search_path = '' as $$
  select case
    when v ~ '^0[35789][0-9]{8}$'     then v
    when v ~ '^\+?84[35789][0-9]{8}$' then '0' || right(v, 9)
    else '' end
  from (select regexp_replace(coalesce(p_phone, ''), '[()\s.-]', '', 'g') as v) s;
$$;

-- Cấp một OTP (Edge Function phone-otp gọi SAU khi xác thực JWT). Kiểm mọi giới
-- hạn trong MỘT transaction có khoá → không vượt trần dù gọi song song.
-- Trả jsonb {ok:true} hoặc {ok:false, error, retryAfter?}.
create or replace function public._phone_otp_issue(
  p_id uuid, p_user_id uuid, p_phone text, p_ip text, p_code_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := public.normalize_vn_phone(p_phone);
  v_user public.users;
  v_last timestamptz;
  v_cap int;
  c_cooldown constant int := 60;       -- giây giữa 2 lần gửi / tài khoản
  c_per_user constant int := 5;        -- / 24h
  c_per_phone constant int := 5;       -- / 24h (chống spam SĐT người khác)
  c_per_ip constant int := 10;         -- / 24h
begin
  if v_phone = '' then return jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); end if;

  select * into v_user from public.users where id = p_user_id;
  if not found or v_user.role not in ('worker', 'employer') then
    return jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  end if;
  if v_user.suspended then return jsonb_build_object('ok', false, 'error', 'SUSPENDED'); end if;
  if v_user.phone_verified_at is not null and v_user.phone = v_phone then
    return jsonb_build_object('ok', false, 'error', 'PHONE_ALREADY_VERIFIED');
  end if;
  if exists (select 1 from public.users
             where phone = v_phone and phone_verified_at is not null and id <> p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'PHONE_IN_USE');
  end if;

  perform pg_advisory_xact_lock(hashtext('cale_phone_otp_issue'));

  select max(created_at) into v_last from public.phone_otps where user_id = p_user_id;
  if v_last is not null and v_last > now() - make_interval(secs => c_cooldown) then
    return jsonb_build_object('ok', false, 'error', 'OTP_COOLDOWN', 'retryAfter',
      ceil(extract(epoch from (v_last + make_interval(secs => c_cooldown) - now())))::int);
  end if;
  if (select count(*) from public.phone_otps
      where user_id = p_user_id and created_at > now() - interval '24 hours') >= c_per_user then
    return jsonb_build_object('ok', false, 'error', 'OTP_USER_LIMIT');
  end if;
  if (select count(*) from public.phone_otps
      where phone = v_phone and created_at > now() - interval '24 hours') >= c_per_phone then
    return jsonb_build_object('ok', false, 'error', 'OTP_PHONE_LIMIT');
  end if;
  if p_ip is not null and p_ip <> '' and (select count(*) from public.phone_otps
      where ip = p_ip and created_at > now() - interval '24 hours') >= c_per_ip then
    return jsonb_build_object('ok', false, 'error', 'OTP_IP_LIMIT');
  end if;
  select otp_daily_cap into v_cap from public.platform_settings where id;
  if (select count(*) from public.phone_otps
      where created_at > now() - interval '24 hours' and send_status <> 'FAILED')
     >= coalesce(v_cap, 300) then
    return jsonb_build_object('ok', false, 'error', 'OTP_DAILY_CAP');
  end if;

  -- Vô hiệu mã cũ chưa dùng: chỉ mã mới nhất có hiệu lực.
  update public.phone_otps set expires_at = least(expires_at, now())
    where user_id = p_user_id and consumed_at is null;

  insert into public.phone_otps (id, user_id, phone, code_hash, ip, expires_at)
  values (p_id, p_user_id, v_phone, p_code_hash, nullif(p_ip, ''), now() + interval '5 minutes');

  return jsonb_build_object('ok', true, 'phone', v_phone);
end; $$;

create or replace function public._phone_otp_mark(p_id uuid, p_status text, p_reason text)
returns void language sql security definer set search_path = '' as $$
  update public.phone_otps
     set send_status = p_status, fail_reason = left(p_reason, 300)
   where id = p_id;
$$;

revoke execute on function public._phone_otp_issue(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public._phone_otp_mark(uuid, text, text) from public, anon, authenticated;
grant execute on function public._phone_otp_issue(uuid, uuid, text, text, text) to service_role;
grant execute on function public._phone_otp_mark(uuid, text, text) to service_role;

-- Người dùng nhập mã. Sai mã vẫn COMMIT số lần thử (trả jsonb, không raise).
create or replace function public.verify_phone_otp(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_otp public.phone_otps;
  c_max_attempts constant int := 5;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(p_code, '') !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'error', 'OTP_INVALID');
  end if;

  select * into v_otp from public.phone_otps
    where user_id = v_uid and consumed_at is null and send_status <> 'FAILED'
    order by created_at desc limit 1
    for update;
  if not found or v_otp.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'OTP_EXPIRED');
  end if;
  if v_otp.attempts >= c_max_attempts then
    return jsonb_build_object('ok', false, 'error', 'OTP_TOO_MANY_ATTEMPTS');
  end if;

  update public.phone_otps set attempts = attempts + 1 where id = v_otp.id;

  if encode(extensions.digest(v_otp.id::text || ':' || p_code, 'sha256'), 'hex')
     <> v_otp.code_hash then
    return jsonb_build_object('ok', false, 'error', 'OTP_INVALID',
      'attemptsLeft', c_max_attempts - v_otp.attempts - 1);
  end if;

  update public.phone_otps set consumed_at = now() where id = v_otp.id;

  if exists (select 1 from public.users
             where phone = v_otp.phone and phone_verified_at is not null and id <> v_uid) then
    return jsonb_build_object('ok', false, 'error', 'PHONE_IN_USE');
  end if;

  update public.users
     set phone = v_otp.phone, phone_verified_at = now()
   where id = v_uid;

  return jsonb_build_object('ok', true, 'phone', v_otp.phone);
end; $$;

revoke execute on function public.verify_phone_otp(text) from public, anon;
grant execute on function public.verify_phone_otp(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. CCCD — ảnh ở bucket riêng tư, admin duyệt tay
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-docs', 'identity-docs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

-- Người dùng chỉ ghi vào thư mục <uid>/, không sửa/xoá (ảnh đã nộp là bằng chứng).
drop policy if exists identity_docs_insert_own on storage.objects;
create policy identity_docs_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'identity-docs'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists identity_docs_select_own_or_admin on storage.objects;
create policy identity_docs_select_own_or_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'identity-docs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create table if not exists public.identity_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  full_name     text not null,
  id_number     text not null,
  date_of_birth date,
  front_path    text not null,
  back_path     text not null,
  selfie_path   text not null,
  status        text not null default 'Pending'
                check (status in ('Pending', 'Approved', 'Rejected')),
  reject_reason text,
  reviewed_by   uuid references public.users(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists identity_one_pending_uidx
  on public.identity_verifications (user_id) where status = 'Pending';
-- Một số CCCD chỉ được duyệt cho một tài khoản.
create unique index if not exists identity_number_approved_uidx
  on public.identity_verifications (id_number) where status = 'Approved';
create index if not exists identity_status_idx
  on public.identity_verifications (status, created_at);

alter table public.identity_verifications enable row level security;
revoke all on public.identity_verifications from public, anon, authenticated;
grant select on public.identity_verifications to authenticated;
grant all on public.identity_verifications to service_role;
drop policy if exists identity_verifications_sel on public.identity_verifications;
create policy identity_verifications_sel on public.identity_verifications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.submit_identity_verification(
  p_full_name text, p_id_number text, p_date_of_birth date,
  p_front_path text, p_back_path text, p_selfie_path text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_user public.users;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_num text := regexp_replace(coalesce(p_id_number, ''), '\s', '', 'g');
  v_id uuid;
  v_path text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_user from public.users where id = v_uid;
  if not found or v_user.role not in ('worker', 'employer') then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_user.suspended then raise exception 'SUSPENDED'; end if;
  if v_user.identity_verified_at is not null then raise exception 'IDENTITY_ALREADY_VERIFIED'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100 then raise exception 'INVALID_FULL_NAME'; end if;
  if v_num !~ '^[0-9]{12}$' then raise exception 'INVALID_ID_NUMBER'; end if;
  if p_date_of_birth is not null
     and (p_date_of_birth > current_date - interval '15 years' or p_date_of_birth < date '1900-01-01') then
    raise exception 'INVALID_DATE_OF_BIRTH';
  end if;

  foreach v_path in array array[p_front_path, p_back_path, p_selfie_path] loop
    if v_path is null or split_part(v_path, '/', 1) <> v_uid::text
       or not exists (select 1 from storage.objects
                      where bucket_id = 'identity-docs' and name = v_path) then
      raise exception 'INVALID_DOCUMENT';
    end if;
  end loop;

  if exists (select 1 from public.identity_verifications
             where id_number = v_num and status = 'Approved' and user_id <> v_uid) then
    raise exception 'ID_NUMBER_IN_USE';
  end if;

  begin
    insert into public.identity_verifications
      (user_id, full_name, id_number, date_of_birth, front_path, back_path, selfie_path)
    values (v_uid, v_name, v_num, p_date_of_birth, p_front_path, p_back_path, p_selfie_path)
    returning id into v_id;
  exception when unique_violation then raise exception 'ALREADY_PENDING';
  end;
  return v_id;
end; $$;

revoke execute on function public.submit_identity_verification(text, text, date, text, text, text) from public, anon;
grant execute on function public.submit_identity_verification(text, text, date, text, text, text) to authenticated;

create or replace function public.admin_list_identity_verifications(p_status text default 'Pending')
returns table (
  id uuid, user_id uuid, role text, email text, phone text, display_name text,
  full_name text, id_number text, date_of_birth date,
  front_path text, back_path text, selfie_path text,
  status text, reject_reason text, reviewed_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return query
    select v.id, v.user_id, u.role, u.email, u.phone,
           coalesce(pp.display_name, ''),
           v.full_name, v.id_number, v.date_of_birth,
           v.front_path, v.back_path, v.selfie_path,
           v.status, v.reject_reason, v.reviewed_at, v.created_at
      from public.identity_verifications v
      join public.users u on u.id = v.user_id
      left join public.public_profiles pp on pp.user_id = v.user_id
     where p_status is null or v.status = p_status
     order by case when v.status = 'Pending' then v.created_at end asc,
              v.created_at desc
     limit 200;
end; $$;

create or replace function public.admin_review_identity(
  p_id uuid, p_approve boolean, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.identity_verifications; v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_row from public.identity_verifications where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_row.status <> 'Pending' then raise exception 'ALREADY_REVIEWED'; end if;

  if p_approve then
    if exists (select 1 from public.identity_verifications
               where id_number = v_row.id_number and status = 'Approved' and user_id <> v_row.user_id) then
      raise exception 'ID_NUMBER_IN_USE';
    end if;
    update public.identity_verifications
       set status = 'Approved', reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = null
     where id = p_id;
    update public.users set identity_verified_at = now() where id = v_row.user_id;
  else
    if v_reason = '' then raise exception 'REASON_REQUIRED'; end if;
    update public.identity_verifications
       set status = 'Rejected', reviewed_by = auth.uid(), reviewed_at = now(),
           reject_reason = left(v_reason, 500)
     where id = p_id;
  end if;
end; $$;

revoke execute on function public.admin_list_identity_verifications(text) from public, anon;
revoke execute on function public.admin_review_identity(uuid, boolean, text) from public, anon;
grant execute on function public.admin_list_identity_verifications(text) to authenticated;
grant execute on function public.admin_review_identity(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Trạng thái xác thực của chính mình + cờ bắt buộc (không bí mật).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_verification()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_user public.users;
  v_s public.platform_settings;
  v_idv public.identity_verifications;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_user from public.users where id = v_uid;
  select * into v_s from public.platform_settings where id;
  select * into v_idv from public.identity_verifications
    where user_id = v_uid order by created_at desc limit 1;
  return jsonb_build_object(
    'phone', coalesce(v_user.phone, ''),
    'phoneVerifiedAt', v_user.phone_verified_at,
    'identityVerifiedAt', v_user.identity_verified_at,
    'identityStatus', case when v_user.identity_verified_at is not null then 'Approved'
                           else coalesce(v_idv.status, 'None') end,
    'identityRejectReason', case when v_idv.status = 'Rejected' then v_idv.reject_reason end,
    'requirePhone', coalesce(v_s.require_phone_verification, false),
    'requireEmployerIdentity', coalesce(v_s.require_employer_identity, false)
  );
end; $$;

revoke execute on function public.get_my_verification() from public, anon;
grant execute on function public.get_my_verification() to authenticated;

create or replace function public.admin_get_verification_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_s public.platform_settings;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_s from public.platform_settings where id;
  return jsonb_build_object(
    'requirePhone', coalesce(v_s.require_phone_verification, false),
    'requireEmployerIdentity', coalesce(v_s.require_employer_identity, false),
    'otpDailyCap', coalesce(v_s.otp_daily_cap, 300),
    'otpSent24h', (select count(*) from public.phone_otps
                   where created_at > now() - interval '24 hours' and send_status = 'SENT'),
    'otpFailed24h', (select count(*) from public.phone_otps
                     where created_at > now() - interval '24 hours' and send_status = 'FAILED'),
    'lastOtpFailReason', (select fail_reason from public.phone_otps
                          where send_status = 'FAILED' order by created_at desc limit 1),
    'pendingIdentity', (select count(*) from public.identity_verifications where status = 'Pending')
  );
end; $$;

create or replace function public.admin_set_verification_settings(
  p_require_phone boolean, p_require_employer_identity boolean, p_otp_daily_cap int
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_otp_daily_cap is not null and (p_otp_daily_cap < 0 or p_otp_daily_cap > 100000) then
    raise exception 'INVALID_INPUT';
  end if;
  update public.platform_settings
     set require_phone_verification = coalesce(p_require_phone, require_phone_verification),
         require_employer_identity  = coalesce(p_require_employer_identity, require_employer_identity),
         otp_daily_cap              = coalesce(p_otp_daily_cap, otp_daily_cap),
         updated_at = now()
   where id;
end; $$;

revoke execute on function public.admin_get_verification_settings() from public, anon;
revoke execute on function public.admin_set_verification_settings(boolean, boolean, int) from public, anon;
grant execute on function public.admin_get_verification_settings() to authenticated;
grant execute on function public.admin_set_verification_settings(boolean, boolean, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Chặn phía server theo cờ bắt buộc
-- ---------------------------------------------------------------------------
create or replace function public._assert_account_verified(p_need_identity boolean)
returns void language plpgsql stable security definer set search_path = '' as $$
declare v_s public.platform_settings; v_user public.users;
begin
  select * into v_s from public.platform_settings where id;
  select * into v_user from public.users where id = auth.uid();
  if coalesce(v_s.require_phone_verification, false) and v_user.phone_verified_at is null then
    raise exception 'PHONE_NOT_VERIFIED';
  end if;
  if p_need_identity and coalesce(v_s.require_employer_identity, false)
     and v_user.identity_verified_at is null then
    raise exception 'IDENTITY_NOT_VERIFIED';
  end if;
end; $$;
revoke execute on function public._assert_account_verified(boolean) from public, anon, authenticated;

-- Worker ứng tuyển.
alter function public.apply(uuid) rename to apply_before_verify_guard;
revoke execute on function public.apply_before_verify_guard(uuid) from public, anon, authenticated;

create or replace function public.apply(p_shift_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_active_worker();
  perform public._assert_account_verified(false);
  return public.apply_before_verify_guard(p_shift_id);
end; $$;
revoke execute on function public.apply(uuid) from public, anon;
grant execute on function public.apply(uuid) to authenticated;

-- Employer đăng ca: chặn NGAY bước tạo phiên cọc (trước khi có tiền đi), không
-- chặn ở publish (ca đã trả tiền QR thì vẫn phải lên được).
alter function public.create_deposit_session(jsonb, uuid, text)
  rename to create_deposit_session_before_verify_guard;
revoke execute on function public.create_deposit_session_before_verify_guard(jsonb, uuid, text)
  from public, anon, authenticated;

create or replace function public.create_deposit_session(
  p_shift_payload jsonb, p_channel_id uuid, p_client_request_id text
) returns public.payment_sessions
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_active_employer();
  perform public._assert_account_verified(true);
  return public.create_deposit_session_before_verify_guard(
    p_shift_payload, p_channel_id, p_client_request_id);
end; $$;
revoke execute on function public.create_deposit_session(jsonb, uuid, text) from public, anon;
grant execute on function public.create_deposit_session(jsonb, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. OAuth (Google): tạo hồ sơ sau khi người dùng chọn vai trò
-- ---------------------------------------------------------------------------
create or replace function public._create_user_profile(p_id uuid, p_email text, p_meta jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role text := p_meta ->> 'role';
begin
  if v_role is null or v_role not in ('worker', 'employer') then
    raise exception 'INVALID_ROLE';
  end if;

  insert into public.users (id, role, email, phone, suspended, created_at)
  values (p_id, v_role, p_email, coalesce(p_meta ->> 'phone', ''), false, now());

  if v_role = 'worker' then
    insert into public.worker_profiles (user_id, full_name)
    values (p_id, coalesce(p_meta ->> 'full_name', ''));
    insert into public.public_profiles (user_id, role, display_name)
    values (p_id, 'worker', coalesce(p_meta ->> 'full_name', ''));
  else
    insert into public.employer_profiles
      (user_id, company_name, business_type, employer_type, employer_type10a)
    values (
      p_id,
      coalesce(p_meta ->> 'company_name', ''),
      coalesce(p_meta ->> 'business_type', ''),
      p_meta ->> 'employer_type',
      p_meta ->> 'employer_type10a'
    );
    insert into public.public_profiles (user_id, role, display_name, business_type)
    values (p_id, 'employer',
            coalesce(p_meta ->> 'company_name', ''),
            coalesce(p_meta ->> 'business_type', ''));
  end if;
end; $$;
revoke execute on function public._create_user_profile(uuid, text, jsonb) from public, anon, authenticated;

-- Giữ nguyên hành vi đăng ký email/mật khẩu (thiếu vai trò → lỗi). User OAuth
-- chưa có vai trò → KHÔNG tạo hồ sơ; app đưa sang bước chọn vai trò.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := v_meta ->> 'role';
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
begin
  if v_role is null or v_role not in ('worker', 'employer') then
    if v_provider <> 'email' and v_provider <> 'phone' then
      return new;
    end if;
    raise exception 'handle_new_user: invalid role at signup: %', coalesce(v_role, '(null)');
  end if;
  perform public._create_user_profile(new.id, new.email, v_meta);
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon;

create or replace function public.complete_oauth_signup(p_profile jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_role text := p_profile ->> 'role';
  v_phone text := public.normalize_vn_phone(p_profile ->> 'phone');
  v_type10a text := p_profile ->> 'employer_type10a';
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.users where id = v_uid) then raise exception 'ALREADY_REGISTERED'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if v_role is null or v_role not in ('worker', 'employer') then raise exception 'INVALID_ROLE'; end if;
  if v_phone = '' then raise exception 'INVALID_PHONE'; end if;
  if v_role = 'worker' and btrim(coalesce(p_profile ->> 'full_name', '')) = '' then
    raise exception 'INVALID_INPUT';
  end if;
  if v_role = 'employer' and (
       btrim(coalesce(p_profile ->> 'company_name', '')) = ''
    or btrim(coalesce(p_profile ->> 'business_type', '')) = ''
    or v_type10a is null
    or v_type10a not in ('Individual', 'HouseholdBusiness', 'Company', 'AgencyEvent')) then
    raise exception 'INVALID_INPUT';
  end if;

  perform public._create_user_profile(v_uid, v_email, jsonb_build_object(
    'role', v_role,
    'phone', v_phone,
    'full_name', left(btrim(coalesce(p_profile ->> 'full_name', '')), 100),
    'company_name', left(btrim(coalesce(p_profile ->> 'company_name', '')), 150),
    'business_type', left(btrim(coalesce(p_profile ->> 'business_type', '')), 100),
    'employer_type', case when v_role = 'employer'
                          then case when v_type10a = 'Individual' then 'individual' else 'business' end end,
    'employer_type10a', case when v_role = 'employer' then v_type10a end
  ));
end; $$;

revoke execute on function public.complete_oauth_signup(jsonb) from public, anon;
grant execute on function public.complete_oauth_signup(jsonb) to authenticated;
