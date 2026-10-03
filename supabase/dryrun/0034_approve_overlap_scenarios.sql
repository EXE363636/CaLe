-- =============================================================================
-- Chạy thử 0034 (chặn duyệt trùng giờ) trên DB thật — KHÔNG ghi gì lại.
--
-- Cách chạy: bash supabase/dryrun/run-0034.sh (begin + timeout + 0034 + file này +
-- rollback). Kết thúc bằng raise exception "DRYRUN_RESULT" → transaction luôn
-- rollback. Mọi dòng phải "ok". Ca / đơn giả chèn thẳng (bỏ qua luồng cọc).
-- =============================================================================

create temp table _r (n serial, scn text, ok boolean, got text) on commit drop;

create or replace function pg_temp.chk(p_scn text, p_ok boolean, p_got text)
returns void language sql as $$ insert into _r (scn, ok, got) values (p_scn, coalesce(p_ok, false), p_got); $$;

create or replace function pg_temp.as_user(p_uid uuid)
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_uid, 'role', 'authenticated', 'app_metadata', '{}'::jsonb)::text, true);
$$;

create or replace function pg_temp.mk_shift(p_emp uuid, p_key text, p_date date, p_start time, p_end time,
                                            p_status text default 'Published')
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.shifts (employer_id, client_request_id, title, job_type, location, date, start_time, end_time,
                             hourly_wage, positions_total, status, escrow_status)
    values (p_emp, 'dry34-' || p_key, 'Dry 0034 ' || p_key, 'Other', 'HCM', p_date, p_start, p_end,
            30000, 2, p_status, 'Deposited')
    returning id into v_id;
  return v_id;
end; $$;

create or replace function pg_temp.mk_app(p_shift uuid, p_worker uuid, p_status text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.applications (shift_id, worker_id, status, approved_at)
    values (p_shift, p_worker, p_status, case when p_status <> 'Pending' then now() end)
    returning id into v_id;
  return v_id;
end; $$;

create or replace function pg_temp.app_status(p_app uuid) returns text language sql as $$
  select status from public.applications where id = p_app;
$$;

do $dry$
declare
  e1 uuid := gen_random_uuid();
  e2 uuid := gen_random_uuid();
  w1 uuid := gen_random_uuid();
  u uuid;
  d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date + 5;
  sa uuid; sb uuid; sc uuid; sd uuid; se uuid; sf uuid;
  sg uuid; sh uuid; si uuid; ag uuid; ai uuid;
  ab uuid; ac uuid; ad uuid; af uuid;
  v_err text; v_ok int; v_all int; v_txt text := ''; r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (w1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || w1 || '@example.invalid',
            jsonb_build_object('role', 'worker', 'full_name', 'Dry W1'),
            jsonb_build_object('provider', 'email'), now(), now());
  foreach u in array array[e1, e2] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'dryrun-' || u || '@example.invalid',
              jsonb_build_object('role', 'employer', 'company_name', 'Dry Quán'),
              jsonb_build_object('provider', 'email'), now(), now());
  end loop;

  -- w1 đã được e1 duyệt ca A 08:00–13:00.
  sa := pg_temp.mk_shift(e1, 'a', d, '08:00', '13:00');
  perform pg_temp.mk_app(sa, w1, 'Approved');

  -- ---------- 01. Ca B 10:00–15:00 (e2) giao giờ với A → chặn ----------
  sb := pg_temp.mk_shift(e2, 'b', d, '10:00', '15:00');
  ab := pg_temp.mk_app(sb, w1, 'Pending');
  perform pg_temp.as_user(e2);
  begin perform public.approve(ab); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('01 ca giao giờ với ca đã duyệt → WORKER_SCHEDULE_CONFLICT, đơn vẫn Chờ duyệt',
    v_err = 'WORKER_SCHEDULE_CONFLICT' and pg_temp.app_status(ab) = 'Pending', v_err || ' / ' || pg_temp.app_status(ab));

  -- ---------- 02. Người ngoài không dò được lịch ----------
  perform pg_temp.as_user(e1);
  begin perform public.approve(ab); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('02 NTD khác duyệt đơn của ca không phải của mình → lỗi chủ ca, không lộ trùng giờ',
    v_err <> 'no error' and v_err <> 'WORKER_SCHEDULE_CONFLICT', v_err);

  -- ---------- 03. Ca nối tiếp 13:00–17:00 → cho duyệt ----------
  perform pg_temp.as_user(e2);
  sc := pg_temp.mk_shift(e2, 'c', d, '13:00', '17:00');
  ac := pg_temp.mk_app(sc, w1, 'Pending');
  begin perform public.approve(ac); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('03 ca nối tiếp (13:00 kết thúc = 13:00 bắt đầu) → duyệt được',
    v_err = 'no error' and pg_temp.app_status(ac) = 'Approved', v_err);

  -- ---------- 04. Ca ngày khác cùng giờ → cho duyệt ----------
  sd := pg_temp.mk_shift(e2, 'd', d + 1, '08:00', '13:00');
  ad := pg_temp.mk_app(sd, w1, 'Pending');
  begin perform public.approve(ad); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04 ca ngày khác cùng giờ → duyệt được', v_err = 'no error' and pg_temp.app_status(ad) = 'Approved', v_err);

  -- ---------- 05. Ca trùng giờ nhưng đã HUỶ không chặn ----------
  se := pg_temp.mk_shift(e1, 'e', d, '18:00', '20:00', 'Cancelled');
  perform pg_temp.mk_app(se, w1, 'Approved');
  sf := pg_temp.mk_shift(e2, 'f', d, '18:30', '19:30');
  af := pg_temp.mk_app(sf, w1, 'Pending');
  begin perform public.approve(af); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('05 trùng giờ với ca ĐÃ HUỶ → duyệt được', v_err = 'no error' and pg_temp.app_status(af) = 'Approved', v_err);

  -- ---------- 06. Kiểm tra cũ vẫn chạy ----------
  begin perform public.approve(af); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('06 duyệt lại đơn đã duyệt → INVALID_STATE_FOR_APPROVE (kiểm tra cũ giữ nguyên)',
    v_err = 'INVALID_STATE_FOR_APPROVE', v_err);

  -- ---------- 08. Đơn không còn Pending: lỗi trạng thái, KHÔNG lộ trùng giờ ----------
  sg := pg_temp.mk_shift(e2, 'g', d, '09:00', '11:00');
  ag := pg_temp.mk_app(sg, w1, 'Rejected');
  begin perform public.approve(ag); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08 chủ ca duyệt đơn đã từ chối (có trùng giờ) → INVALID_STATE_FOR_APPROVE, không dò được lịch',
    v_err = 'INVALID_STATE_FOR_APPROVE', v_err);

  -- ---------- 09. Đơn "Xin huỷ" vẫn giữ chỗ ----------
  sh := pg_temp.mk_shift(e1, 'h', d + 2, '20:00', '22:00');
  perform pg_temp.mk_app(sh, w1, 'CancellationRequested');
  si := pg_temp.mk_shift(e2, 'i', d + 2, '21:00', '23:00');
  ai := pg_temp.mk_app(si, w1, 'Pending');
  begin perform public.approve(ai); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('09 người lao động đang "Xin huỷ" ca trùng giờ → vẫn chặn',
    v_err = 'WORKER_SCHEDULE_CONFLICT' and pg_temp.app_status(ai) = 'Pending', v_err);

  -- ---------- 10. Dời giờ ca đã có người duyệt sang giờ trùng → chặn ----------
  begin perform public.edit_shift(sc, jsonb_build_object('start_time', '12:00')); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('10a dời ca C (w1 đã duyệt) về 12:00, trùng ca A tới 13:00 → EDIT_WORKER_SCHEDULE_CONFLICT, giờ giữ nguyên',
    v_err = 'EDIT_WORKER_SCHEDULE_CONFLICT'
      and (select start_time from public.shifts where id = sc) = '13:00'::time, v_err);
  begin perform public.edit_shift(sc, jsonb_build_object('start_time', '14:00')); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('10b dời ca C sang 14:00 (không trùng) → được',
    v_err = 'no error' and (select start_time from public.shifts where id = sc) = '14:00'::time, v_err);

  -- ---------- 07. Quyền ----------
  perform pg_temp.chk('07a authenticated KHÔNG gọi thẳng được approve_before_overlap_guard',
    not has_function_privilege('authenticated', 'public.approve_before_overlap_guard(uuid)', 'execute'), '');
  perform pg_temp.chk('07c authenticated KHÔNG gọi thẳng được edit_shift_before_overlap_guard / _worker_has_overlap',
    not has_function_privilege('authenticated', 'public.edit_shift_before_overlap_guard(uuid, jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public._worker_has_overlap(uuid, uuid)', 'execute'), '');
  perform pg_temp.chk('07b authenticated gọi được approve, anon thì không',
    has_function_privilege('authenticated', 'public.approve(uuid)', 'execute')
      and not has_function_privilege('anon', 'public.approve(uuid)', 'execute'), '');

  select count(*) filter (where ok), count(*) into v_ok, v_all from _r;
  for r in select * from _r order by n loop
    v_txt := v_txt || E'\n' || case when r.ok then 'ok   ' else 'FAIL ' end || r.scn
             || case when r.ok then '' else '  [' || coalesce(r.got, '') || ']' end;
  end loop;
  raise exception 'DRYRUN_RESULT (% / % ok)%', v_ok, v_all, v_txt;
end $dry$;
