-- =============================================================================
-- Phase 1 — schema + RLS tests (pgTAP). Chạy: `supabase test db` (cần Docker).
-- Kiểm các bất biến bảo mật ở docs/PHASE_1_PLAN.md (v4) mục 6/10.
-- =============================================================================

begin;
select plan(18);

-- --- Cấu trúc bảng tồn tại ---------------------------------------------------
select has_table('public', 'users', 'có bảng users');
select has_table('public', 'worker_profiles', 'có bảng worker_profiles');
select has_table('public', 'employer_profiles', 'có bảng employer_profiles');
select has_table('public', 'public_profiles', 'có bảng public_profiles');

-- --- RLS đã bật --------------------------------------------------------------
select is(relrowsecurity, true, 'RLS bật ở users')
  from pg_class where oid = 'public.users'::regclass;
select is(relrowsecurity, true, 'RLS bật ở worker_profiles')
  from pg_class where oid = 'public.worker_profiles'::regclass;
select is(relrowsecurity, true, 'RLS bật ở employer_profiles')
  from pg_class where oid = 'public.employer_profiles'::regclass;
select is(relrowsecurity, true, 'RLS bật ở public_profiles')
  from pg_class where oid = 'public.public_profiles'::regclass;

-- --- public_profiles KHÔNG chứa cột nhạy cảm (điều kiện 1/3) -----------------
select hasnt_column('public', 'public_profiles', 'email', 'public_profiles không có email');
select hasnt_column('public', 'public_profiles', 'phone', 'public_profiles không có phone');
select hasnt_column('public', 'public_profiles', 'suspended', 'public_profiles không có suspended');

-- --- Phân quyền cột: authenticated KHÔNG update được role/suspended ----------
select ok(
  not has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE'),
  'authenticated KHÔNG update được users.role'
);
select ok(
  not has_column_privilege('authenticated', 'public.users', 'suspended', 'UPDATE'),
  'authenticated KHÔNG update được users.suspended'
);
select ok(
  has_column_privilege('authenticated', 'public.users', 'phone', 'UPDATE'),
  'authenticated update được users.phone'
);

-- --- anon đọc được public_profiles, KHÔNG đọc users -------------------------
select ok(
  has_table_privilege('anon', 'public.public_profiles', 'SELECT'),
  'anon có quyền SELECT public_profiles'
);
select ok(
  not has_table_privilege('anon', 'public.users', 'SELECT'),
  'anon KHÔNG có quyền SELECT users'
);

-- --- Hàm bảo mật tồn tại + là SECURITY DEFINER ------------------------------
select ok(
  (select prosecdef from pg_proc where oid = 'public.handle_new_user'::regproc),
  'handle_new_user là SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.admin_set_suspended(uuid, boolean)'::regprocedure),
  'admin_set_suspended là SECURITY DEFINER'
);

select * from finish();
rollback;
