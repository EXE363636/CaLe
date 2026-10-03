-- =============================================================================
-- Chạy thử 0033, phần 1 (TRƯỚC migration): dựng dữ liệu giả + tái hiện 2 lỗi.
-- Ghép bởi run-0033.sh: begin → file này → 0033 → 0033_settlement_sweep_scenarios.sql
-- → rollback. Không ghi gì lại.
--
-- Dữ liệu giả (một transaction): 1 nhà tuyển dụng, 4 người lao động, các ca có
-- phiên cọc HELD chèn thẳng (bỏ qua luồng PayOS / ví). Id truyền sang phần 2 qua
-- set_config('dry.*', …, true).
-- =============================================================================

create temp table _r (n serial, scn text, ok boolean, got text) on commit drop;

create or replace function pg_temp.chk(p_scn text, p_ok boolean, p_got text)
returns void language sql as $$ insert into _r (scn, ok, got) values (p_scn, coalesce(p_ok, false), p_got); $$;

create or replace function pg_temp.as_user(p_uid uuid)
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_uid, 'role', 'authenticated', 'app_metadata', '{}'::jsonb)::text, true);
$$;

create or replace function pg_temp.id(p_key text) returns uuid language sql as $$
  select current_setting('dry.' || p_key)::uuid;
$$;

-- Ca giả 30.000 đ/giờ, 1 vị trí, có phiên cọc HELD (tiền công + phí 10%).
create or replace function pg_temp.mk_shift(p_emp uuid, p_key text, p_date date, p_start time, p_end time)
returns uuid language plpgsql as $$
declare v_id uuid; v_wage int;
begin
  insert into public.shifts (employer_id, client_request_id, title, job_type, location, date, start_time, end_time,
                             hourly_wage, positions_total, status, escrow_status)
    values (p_emp, 'dry33-' || p_key, 'Dry 0033 ' || p_key, 'Other', 'HCM', p_date, p_start, p_end,
            30000, 1, 'Published', 'Deposited')
    returning id into v_id;
  v_wage := round(30000 * extract(epoch from (p_end - p_start)) / 3600.0)::int;
  insert into public.payment_sessions (employer_id, client_request_id, order_code, amount, status, provider,
                                       shift_payload, platform_fee, shift_id, published_shift_id, paid_at)
    values (p_emp, 'dry33-' || p_key, 'DRY33' || upper(p_key), v_wage + round(v_wage * 0.10)::int, 'HELD',
            'CALE_MOCK', '{}'::jsonb, round(v_wage * 0.10)::int, v_id, v_id, now());
  perform set_config('dry.' || p_key, v_id::text, true);
  return v_id;
end; $$;

create or replace function pg_temp.mk_app(p_shift uuid, p_worker uuid, p_status text, p_payout int, p_key text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.applications (shift_id, worker_id, status, payout_amount, approved_at)
    values (p_shift, p_worker, p_status, p_payout, case when p_status <> 'Pending' then now() end)
    returning id into v_id;
  perform set_config('dry.' || p_key, v_id::text, true);
  return v_id;
end; $$;

create or replace function pg_temp.session_status(p_shift uuid) returns text language sql as $$
  select coalesce((select status from public.payment_sessions
                    where shift_id = p_shift and application_id is null
                    order by created_at desc limit 1), '(none)');
$$;
create or replace function pg_temp.app_status(p_app uuid) returns text language sql as $$
  select status from public.applications where id = p_app;
$$;
create or replace function pg_temp.bal(p_uid uuid) returns int language sql as $$
  select coalesce((select balance from public.wallets where user_id = p_uid), 0);
$$;

do $pre$
declare
  e1 uuid := gen_random_uuid();
  e2 uuid := gen_random_uuid();
  w1 uuid := gen_random_uuid();
  w2 uuid := gen_random_uuid();
  w3 uuid := gen_random_uuid();
  w4 uuid := gen_random_uuid();
  u uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_end timestamp;          -- giờ kết thúc (giờ VN) của ca "vừa hết > 60 phút, < 24 giờ"
  sp uuid; sg uuid; sr uuid; ar uuid;
  v_err text; v_got text;
begin
  foreach u in array array[w1, w2, w3, w4] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'dryrun-' || u || '@example.invalid',
              jsonb_build_object('role', 'worker', 'full_name', 'Dry ' || left(u::text, 4)),
              jsonb_build_object('provider', 'email'), now(), now());
  end loop;
  foreach u in array array[e1, e2] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'dryrun-' || u || '@example.invalid',
              jsonb_build_object('role', 'employer', 'company_name', 'Dry Quán'),
              jsonb_build_object('provider', 'email'), now(), now());
  end loop;
  perform set_config('dry.e1', e1::text, true);
  perform set_config('dry.e2', e2::text, true);
  perform set_config('dry.w1', w1::text, true);
  perform set_config('dry.w2', w2::text, true);
  perform set_config('dry.w3', w3::text, true);
  perform set_config('dry.w4', w4::text, true);

  -- Ca "độc" (cũ hơn → đứng đầu danh sách quét): đơn CheckedOut có tiền công lớn
  -- hơn cọc → _pay_worker_wage raise DEPOSIT_EXCEEDED.
  sp := pg_temp.mk_shift(e1, 'p', v_today - 60, '08:00', '13:00');
  perform pg_temp.mk_app(sp, w1, 'CheckedOut', 999999, 'ap');
  -- Ca bình thường đã quá hạn, đáng lẽ phải được chốt.
  sg := pg_temp.mk_shift(e1, 'g', v_today - 50, '08:00', '13:00');
  perform pg_temp.mk_app(sg, w2, 'CheckedOut', 150000, 'ag');

  -- Ca kết thúc cách đây ~2 giờ (qua mốc 60 phút, chưa tới 24 giờ tự chốt).
  v_end := (now() at time zone 'Asia/Ho_Chi_Minh') - interval '2 hours';
  if v_end::time < '01:00' then v_end := date_trunc('day', v_end) - interval '1 minute'; end if;
  perform set_config('dry.recent_date', v_end::date::text, true);
  perform set_config('dry.recent_end', to_char(v_end, 'HH24:MI'), true);
  perform set_config('dry.recent_start', to_char(v_end - interval '1 hour', 'HH24:MI'), true);

  -- 00a. TRƯỚC 0033: ca độc làm hỏng cả lượt quét (ca bình thường cũng không được chốt).
  begin
    perform public._auto_settle_overdue(500);
    v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  v_got := v_err || ' | ca thường: ' || pg_temp.session_status(sg);
  perform pg_temp.chk('00a trước 0033: một ca lỗi chặn cả lượt tự chốt',
    v_err like '%DEPOSIT_EXCEEDED%' and pg_temp.session_status(sg) = 'HELD', v_got);

  -- 00b. TRƯỚC 0033: NTD hoàn cọc sớm → đơn Approved treo mãi (chạy rồi hoàn tác).
  begin
    sr := pg_temp.mk_shift(e2, 'r0', current_setting('dry.recent_date')::date,
                           current_setting('dry.recent_start')::time, current_setting('dry.recent_end')::time);
    ar := pg_temp.mk_app(sr, w3, 'Approved', 30000, 'ar0');
    perform pg_temp.as_user(e2);
    perform public.refund_deposit_for_shift(sr);
    v_got := 'phiên=' || pg_temp.session_status(sr) || ' đơn=' || pg_temp.app_status(ar);
    raise exception 'UNDO';
  exception when others then
    if sqlerrm <> 'UNDO' then v_got := 'lỗi: ' || sqlerrm; end if;
  end;
  perform pg_temp.chk('00b trước 0033: hoàn cọc sớm để đơn Approved treo',
    v_got = 'phiên=REFUNDED đơn=Approved', v_got);
  perform set_config('request.jwt.claims', '', true);
end $pre$;
