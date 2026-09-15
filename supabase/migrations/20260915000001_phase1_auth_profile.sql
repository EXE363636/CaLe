-- =============================================================================
-- BACKEND-MIGRATION-1 · Phase 1 — Auth + Profile
-- Xem docs/PHASE_1_PLAN.md (v4). Phạm vi: CHỈ danh tính + hồ sơ.
-- KHÔNG có reputation / rating / boost / verification / ví ở migration này.
--
-- Nguyên tắc bảo mật (điều kiện review):
--   * RLS bật cả 4 bảng; policy UPDATE có cả USING và WITH CHECK.
--   * REVOKE UPDATE/INSERT/DELETE bảng trước, rồi GRANT đúng cột chủ-sửa.
--   * Đọc công khai qua bảng projection `public_profiles` (không phơi bảng gốc).
--   * Admin authorization lấy từ trusted app_metadata (KHÔNG user_metadata).
--   * Mọi SECURITY DEFINER: fixed search_path='' + tên bảng fully-qualified
--     + REVOKE EXECUTE khỏi PUBLIC/anon.
--   * role do trigger server ép (worker|employer); 'admin' chỉ seed thủ công.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bảng danh tính (RIÊNG TƯ) + hồ sơ chủ-sửa
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('worker', 'employer', 'admin')),
  email      text not null,
  phone      text not null default '',
  suspended  boolean not null default false,
  created_at timestamptz not null default now()
);
-- Email so trùng không phân biệt hoa/thường (thay cho citext để tránh phụ thuộc
-- schema extension).
create unique index if not exists users_email_lower_idx
  on public.users (lower(email));

create table if not exists public.worker_profiles (
  user_id             uuid primary key references public.users (id) on delete cascade,
  full_name           text not null default '',
  avatar_url          text,
  bio                 text,
  skills              text[] not null default '{}',
  preferred_job_types text[] not null default '{}',
  preferred_locations text[] not null default '{}'
);

create table if not exists public.employer_profiles (
  user_id            uuid primary key references public.users (id) on delete cascade,
  company_name       text not null default '',
  business_type      text not null default '',
  description        text,
  logo_url           text,
  employer_type      text,
  employer_type10a   text,
  understaffed_policy text
);

-- ---------------------------------------------------------------------------
-- 2. Bảng projection CÔNG KHAI — chỉ dữ liệu an toàn (điều kiện 3)
--    KHÔNG chứa email / phone / suspended / verifications / reputation / kiểm duyệt.
--    Chỉ trigger (definer) được ghi; anon + authenticated chỉ SELECT.
-- ---------------------------------------------------------------------------

create table if not exists public.public_profiles (
  user_id            uuid primary key references public.users (id) on delete cascade,
  role               text not null,
  display_name       text not null default '',
  avatar_url         text,
  bio                text,
  skills             text[] not null default '{}',
  preferred_job_types text[] not null default '{}',
  business_type      text
);

-- ---------------------------------------------------------------------------
-- 3. Helper: admin authorization từ TRUSTED app_metadata (điều kiện 6)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users             enable row level security;
alter table public.worker_profiles   enable row level security;
alter table public.employer_profiles enable row level security;
alter table public.public_profiles   enable row level security;

-- users: chủ đọc/sửa dòng của mình; admin (app_metadata) toàn quyền.
create policy users_self_or_admin_select on public.users
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

create policy users_self_or_admin_update on public.users
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- worker_profiles: chủ đọc/sửa của mình (+ admin đọc). Người khác đọc qua
-- public_profiles, KHÔNG mở SELECT bảng gốc.
create policy worker_profiles_self_or_admin_select on public.worker_profiles
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy worker_profiles_self_update on public.worker_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- employer_profiles: tương tự.
create policy employer_profiles_self_or_admin_select on public.employer_profiles
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy employer_profiles_self_update on public.employer_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public_profiles: đọc công khai (an toàn) cho anon + authenticated.
create policy public_profiles_read on public.public_profiles
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 5. Phân quyền cột — REVOKE bảng trước, GRANT đúng cột chủ-sửa (điều kiện 2)
-- ---------------------------------------------------------------------------

-- Project đã TẮT "Automatically expose new tables" ⇒ phải GRANT tường minh.
-- Bảo đảm usage schema (thường đã có; grant idempotent).
grant usage on schema public to anon, authenticated;

-- anon KHÔNG chạm bảng gốc (chỉ đọc public_profiles) — phòng thủ theo lớp.
revoke select, insert, update, delete on public.users             from anon;
revoke select, insert, update, delete on public.worker_profiles   from anon;
revoke select, insert, update, delete on public.employer_profiles from anon;

-- authenticated: SELECT tường minh trên bảng gốc; RLS vẫn giới hạn CHỈ dòng của
-- mình/admin (mục 4). Không auto-expose nên nếu thiếu grant này authenticated sẽ
-- không đọc được cả dòng của chính mình.
grant select on public.users             to authenticated;
grant select on public.worker_profiles   to authenticated;
grant select on public.employer_profiles to authenticated;

revoke insert, update, delete on public.users from authenticated;
grant  update (phone) on public.users to authenticated;

revoke insert, update, delete on public.worker_profiles from authenticated;
grant  update (full_name, avatar_url, bio, skills,
               preferred_job_types, preferred_locations)
  on public.worker_profiles to authenticated;

revoke insert, update, delete on public.employer_profiles from authenticated;
grant  update (company_name, business_type, description, logo_url,
               employer_type, employer_type10a, understaffed_policy)
  on public.employer_profiles to authenticated;

revoke insert, update, delete on public.public_profiles from anon, authenticated;
grant  select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Trigger tạo user + profile khi signup (SECURITY DEFINER, hardened)
--    Role ép chỉ worker|employer — 'admin' KHÔNG bao giờ tạo qua signup.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := v_meta ->> 'role';
begin
  if v_role not in ('worker', 'employer') then
    raise exception 'handle_new_user: invalid role at signup: %',
      coalesce(v_role, '(null)');
  end if;

  insert into public.users (id, role, email, phone, suspended, created_at)
  values (new.id, v_role, new.email, coalesce(v_meta ->> 'phone', ''), false, now());

  if v_role = 'worker' then
    insert into public.worker_profiles (user_id, full_name)
    values (new.id, coalesce(v_meta ->> 'full_name', ''));

    insert into public.public_profiles (user_id, role, display_name)
    values (new.id, 'worker', coalesce(v_meta ->> 'full_name', ''));
  else
    insert into public.employer_profiles
      (user_id, company_name, business_type, employer_type, employer_type10a)
    values (
      new.id,
      coalesce(v_meta ->> 'company_name', ''),
      coalesce(v_meta ->> 'business_type', ''),
      v_meta ->> 'employer_type',
      v_meta ->> 'employer_type10a'
    );

    insert into public.public_profiles
      (user_id, role, display_name, business_type)
    values (
      new.id,
      'employer',
      coalesce(v_meta ->> 'company_name', ''),
      coalesce(v_meta ->> 'business_type', '')
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Trigger đồng bộ public_profiles khi hồ sơ gốc đổi (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.sync_worker_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.public_profiles
     set display_name        = new.full_name,
         avatar_url          = new.avatar_url,
         bio                 = new.bio,
         skills              = new.skills,
         preferred_job_types = new.preferred_job_types
   where user_id = new.user_id;
  return new;
end;
$$;

revoke execute on function public.sync_worker_public_profile() from public, anon;

create trigger trg_sync_worker_public
  after update on public.worker_profiles
  for each row execute function public.sync_worker_public_profile();

create or replace function public.sync_employer_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.public_profiles
     set display_name  = new.company_name,
         avatar_url    = new.logo_url,
         bio           = new.description,
         business_type = new.business_type
   where user_id = new.user_id;
  return new;
end;
$$;

revoke execute on function public.sync_employer_public_profile() from public, anon;

create trigger trg_sync_employer_public
  after update on public.employer_profiles
  for each row execute function public.sync_employer_public_profile();

-- ---------------------------------------------------------------------------
-- 8. RPC admin: đổi suspended (SECURITY DEFINER, hardened, authorization bên trong)
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_suspended(target uuid, value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_set_suspended: not authorized';
  end if;
  update public.users set suspended = value where id = target;
end;
$$;

revoke execute on function public.admin_set_suspended(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_suspended(uuid, boolean) to authenticated;

-- =============================================================================
-- GHI CHÚ SEED ADMIN (KHÔNG làm trong migration này):
--   Tài khoản admin chỉ tạo thủ công qua service_role/dashboard, và phải set
--   app_metadata = {"role":"admin"} (server-set) để is_admin() nhận. Signup công
--   khai KHÔNG bao giờ tạo được admin (trigger ở mục 6 chặn).
-- =============================================================================
