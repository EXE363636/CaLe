-- =============================================================================
-- Chạy thử 0028 (cọc người lao động) trên DB thật — KHÔNG ghi gì lại.
--
-- Cách chạy: bash supabase/dryrun/run-0028.sh (ghép timeout + begin + migration
-- + file này + rollback). File kết thúc bằng raise exception "DRYRUN_RESULT"
-- mang bảng kết quả → transaction luôn rollback. Mọi dòng phải "ok".
--
-- Tạo tài khoản / ca GIẢ trong transaction (auth.users → trigger tạo hồ sơ),
-- giả lập người gọi bằng request.jwt.claims, "tua thời gian" bằng cách dời ngày
-- ca / no_show_at (now() cố định trong một transaction).
-- =============================================================================

create temp table _r (n serial, scn text, ok boolean, got text) on commit drop;

create or replace function pg_temp.chk(p_scn text, p_ok boolean, p_got text)
returns void language sql as $$ insert into _r (scn, ok, got) values (p_scn, coalesce(p_ok, false), p_got); $$;

create or replace function pg_temp.as_user(p_uid uuid, p_admin boolean default false)
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_uid, 'role', 'authenticated',
    'app_metadata', case when p_admin then jsonb_build_object('role', 'admin') else '{}'::jsonb end)::text, true);
$$;

create or replace function pg_temp.bal(p_uid uuid) returns int language sql as $$
  select coalesce((select balance from public.wallets where user_id = p_uid), 0);
$$;

create or replace function pg_temp.hold_status(p_app uuid) returns text language sql as $$
  select coalesce((select status from public.worker_holds where application_id = p_app), '(none)');
$$;

create or replace function pg_temp.hold_id(p_app uuid) returns uuid language sql as $$
  select id from public.worker_holds where application_id = p_app;
$$;

do $dry$
declare
  e1 uuid := gen_random_uuid();   -- nhà tuyển dụng
  w1 uuid := gen_random_uuid();   -- worker mới, chưa xác thực
  w2 uuid := gen_random_uuid();   -- worker đã duyệt CCCD
  w3 uuid := gen_random_uuid();   -- worker đủ 5 ca / 30 ngày
  w4 uuid := gen_random_uuid();   -- worker CCCD, khiếu nại
  w5 uuid := gen_random_uuid();   -- worker mới: giới hạn khoản, trần NTD, hoàn dự phòng
  adm uuid := gen_random_uuid();
  u uuid;
  sa uuid; sb uuid; sc uuid; sd uuid; se uuid; sf uuid; sp uuid; sq uuid;
  s9 uuid; s10 uuid; s11 uuid; s12 uuid; s13 uuid; c1 uuid;
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid; a6 uuid; a7 uuid; a8 uuid; a9 uuid;
  b1 uuid; b2 uuid; b3 uuid;
  v_err text; v_det text; v_state text; v_j jsonb; v_n int;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_future date := (now() at time zone 'Asia/Ho_Chi_Minh')::date + 3;
  v_topped int := 0;
begin
  -- ---------- Tài khoản giả ----------
  foreach u in array array[w1, w2, w3, w4, w5] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'dryrun-' || u || '@example.invalid',
              jsonb_build_object('role', 'worker', 'full_name', 'Dry ' || left(u::text, 4)),
              jsonb_build_object('provider', 'email'), now(), now());
    -- SĐT đã xác thực (phòng khi cờ require_phone_verification đang bật).
    update public.users set phone = '0399' || lpad((abs(hashtext(u::text)) % 1000000)::text, 6, '0') where id = u;
    update public.users set phone_verified_at = now() where id = u;
  end loop;
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (e1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || e1 || '@example.invalid',
            jsonb_build_object('role', 'employer', 'company_name', 'Dry Quán'),
            jsonb_build_object('provider', 'email'), now(), now());
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (adm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || adm || '@example.invalid', '{}'::jsonb,
            jsonb_build_object('provider', 'google', 'role', 'admin'), now(), now());
  insert into public.users (id, role, email) values (adm, 'admin', 'dryrun-' || adm || '@example.invalid');
  update public.users set identity_verified_at = now() where id in (w2, w4);
  perform set_config('dry.w1', w1::text, true);

  -- ---------- Ca giả: 30.000 đ/giờ × 5 giờ = 150.000 đ → cọc 75.000 ----------
  insert into public.shifts (employer_id, client_request_id, title, job_type, location, date, start_time, end_time,
                             hourly_wage, positions_total, status, escrow_status)
  select e1, 'dry-' || g, 'Dry ca ' || g, 'Other', 'HCM', v_future, '08:00', '13:00', 30000, 5, 'Published', 'Deposited'
    from generate_series(1, 13) g;
  select id into sa  from public.shifts where employer_id = e1 and client_request_id = 'dry-1';
  select id into sb  from public.shifts where employer_id = e1 and client_request_id = 'dry-2';
  select id into sc  from public.shifts where employer_id = e1 and client_request_id = 'dry-3';
  select id into sd  from public.shifts where employer_id = e1 and client_request_id = 'dry-4';
  select id into se  from public.shifts where employer_id = e1 and client_request_id = 'dry-5';
  select id into sf  from public.shifts where employer_id = e1 and client_request_id = 'dry-6';
  select id into sp  from public.shifts where employer_id = e1 and client_request_id = 'dry-7';
  select id into sq  from public.shifts where employer_id = e1 and client_request_id = 'dry-8';
  select id into s9  from public.shifts where employer_id = e1 and client_request_id = 'dry-9';
  select id into s10 from public.shifts where employer_id = e1 and client_request_id = 'dry-10';
  select id into s11 from public.shifts where employer_id = e1 and client_request_id = 'dry-11';
  select id into s12 from public.shifts where employer_id = e1 and client_request_id = 'dry-12';
  select id into s13 from public.shifts where employer_id = e1 and client_request_id = 'dry-13';
  update public.shifts set hourly_wage = 60000 where id = sc;   -- 300.000 đ → cọc chạm trần 100.000

  -- ---------- 1. Cờ tắt: không đổi gì ----------
  update public.platform_settings set require_worker_deposit = false where id;
  perform pg_temp.as_user(w1);
  a1 := public.apply(sa);
  perform pg_temp.chk('01 cờ tắt: ứng tuyển không giữ cọc', pg_temp.hold_status(a1) = '(none)' and pg_temp.bal(w1) = 0,
                      pg_temp.hold_status(a1) || ' bal=' || pg_temp.bal(w1));
  perform public.withdraw(a1, 'dry run');

  -- ---------- 2. Admin bật cờ (+ nhật ký), chặn giá trị sai ----------
  begin perform public.admin_set_worker_deposit_settings(true, 50, 100000, 5, 30, 3, 300000); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('02a worker gọi admin_set → FORBIDDEN', v_err = 'FORBIDDEN', v_err);
  perform pg_temp.as_user(adm, true);
  begin perform public.admin_set_worker_deposit_settings(true, 0, 100000, 5, 30, 3, 300000); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('02b tỉ lệ 0% → INVALID_INPUT', v_err = 'INVALID_INPUT', v_err);
  begin perform public.admin_set_worker_deposit_settings(true, 50, 100000, 5, 30, 0, 300000); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('02c tối đa 0 khoản → INVALID_INPUT', v_err = 'INVALID_INPUT', v_err);
  perform public.admin_set_worker_deposit_settings(true, 50, 100000, 5, 30, 3, 300000);
  v_j := public.admin_get_worker_deposit_settings();
  perform pg_temp.chk('02d bật cờ + ghi nhật ký',
    (v_j ->> 'enabled')::boolean and (v_j ->> 'maxOpenHolds')::int = 3 and (v_j ->> 'forfeitDailyCap')::int = 300000
      and exists (select 1 from public.platform_settings_audit where field = 'worker_deposit' and changed_by = adm),
    v_j::text);

  -- ---------- 3. Worker mới, ví 0 ----------
  perform pg_temp.as_user(w1);
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('03a trạng thái: cần cọc NOT_ENOUGH',
    v_j ->> 'reason' = 'NOT_ENOUGH' and (v_j ->> 'needsDeposit')::boolean, v_j::text);
  begin perform public.apply(sa); v_err := 'no error'; v_det := null;
  exception when others then get stacked diagnostics v_err = message_text, v_det = pg_exception_detail; end;
  perform pg_temp.chk('03b apply cũ không trừ ví → WORKER_DEPOSIT_REQUIRED (75000)',
    v_err = 'WORKER_DEPOSIT_REQUIRED' and v_det = '75000'
      and not exists (select 1 from public.applications where worker_id = w1 and shift_id = sa and status = 'Pending'),
    v_err || ' ' || coalesce(v_det, ''));
  begin perform public.apply_with_deposit(sa, 75000); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('03c ví thiếu → WORKER_DEPOSIT_INSUFFICIENT', v_err = 'WORKER_DEPOSIT_INSUFFICIENT', v_err);

  -- ---------- 4. Nạp 200.000, đồng ý thiếu → CHANGED; đồng ý đủ → giữ ----------
  perform public._wallet_apply(w1, 200000, 'UserTopUp', null, null, 'dry'); v_topped := v_topped + 200000;
  begin perform public.apply_with_deposit(sa, 50000); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04a đồng ý 50.000 < 75.000 → WORKER_DEPOSIT_CHANGED', v_err = 'WORKER_DEPOSIT_CHANGED', v_err);
  a2 := public.apply_with_deposit(sa, 75000);
  perform pg_temp.chk('04b giữ 75.000, ví còn 125.000',
    pg_temp.hold_status(a2) = 'Held' and pg_temp.bal(w1) = 125000, pg_temp.hold_status(a2) || ' bal=' || pg_temp.bal(w1));

  -- ---------- 5. Worker tự huỷ đơn chờ → hoàn đủ ----------
  perform public.withdraw(a2, 'dry run');
  perform pg_temp.chk('05 tự huỷ → hoàn, ví 200.000',
    pg_temp.hold_status(a2) = 'Refunded' and pg_temp.bal(w1) = 200000, pg_temp.hold_status(a2) || ' bal=' || pg_temp.bal(w1));

  -- ---------- L4: xoá đơn còn khoản giữ → bị chặn ----------
  begin delete from public.applications where id = a2; v_state := 'no error';
  exception when others then v_state := sqlstate; end;
  perform pg_temp.chk('05b L4 xoá đơn có khoản giữ → foreign_key_violation', v_state = '23503', v_state);

  -- ---------- 6. NTD từ chối → hoàn ----------
  a3 := public.apply_with_deposit(sa, 75000);
  perform pg_temp.as_user(e1);
  perform public.reject(a3, 'dry run');
  perform pg_temp.chk('06 bị từ chối → hoàn', pg_temp.hold_status(a3) = 'Refunded' and pg_temp.bal(w1) = 200000,
                      pg_temp.hold_status(a3) || ' bal=' || pg_temp.bal(w1));

  -- ---------- 7. NTD duyệt rồi huỷ ca → hoàn ----------
  perform pg_temp.as_user(w1);
  a4 := public.apply_with_deposit(sb, 75000);
  perform pg_temp.as_user(e1);
  perform public.approve(a4);
  perform public.cancel_shift(sb, 'dry run');
  perform pg_temp.chk('07 NTD huỷ ca → hoàn', pg_temp.hold_status(a4) = 'Refunded' and pg_temp.bal(w1) = 200000,
                      pg_temp.hold_status(a4) || ' bal=' || pg_temp.bal(w1));

  -- ---------- 8. Đã duyệt CCCD → miễn ----------
  perform pg_temp.as_user(w2);
  a5 := public.apply(sa);
  perform pg_temp.chk('08 CCCD → miễn cọc', pg_temp.hold_status(a5) = '(none)'
    and public.get_my_worker_deposit_status() ->> 'reason' = 'IDENTITY', pg_temp.hold_status(a5));

  -- ---------- 9. Đủ 5 ca / 30 ngày → miễn; 4 ca → cần cọc ----------
  insert into public.shifts (employer_id, client_request_id, title, job_type, location, date, start_time, end_time,
                             hourly_wage, positions_total, status, escrow_status)
  select e1, 'dry-past-' || g, 'Dry cũ ' || g, 'Other', 'HCM', v_today - g * 5, '08:00', '13:00',
         30000, 1, 'Completed', 'Released'
    from generate_series(1, 5) g;
  insert into public.applications (shift_id, worker_id, status, payout_amount)
  select s.id, w3, 'Confirmed', 150000 from public.shifts s
   where s.employer_id = e1 and s.client_request_id in ('dry-past-1', 'dry-past-2', 'dry-past-3', 'dry-past-4');
  perform pg_temp.as_user(w3);
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('09a 4 ca → cần cọc',
    (v_j ->> 'needsDeposit')::boolean and (v_j ->> 'completedInWindow')::int = 4, v_j::text);
  insert into public.applications (shift_id, worker_id, status, payout_amount)
  select s.id, w3, 'Confirmed', 150000 from public.shifts s where s.employer_id = e1 and s.client_request_id = 'dry-past-5';
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('09b 5 ca → miễn COMPLETED_SHIFTS', v_j ->> 'reason' = 'COMPLETED_SHIFTS', v_j::text);

  -- ---------- 10. Vắng mặt: trần 100.000, giữ tới hạn 72h, rồi chuyển NTD ----------
  perform pg_temp.as_user(w1);
  a6 := public.apply_with_deposit(sc, 100000);
  perform pg_temp.chk('10a cọc chạm trần 100.000',
    (select amount from public.worker_holds where application_id = a6) = 100000,
    (select amount::text from public.worker_holds where application_id = a6));
  perform pg_temp.as_user(e1);
  perform public.approve(a6);
  update public.shifts set date = v_today - 5 where id = sc;          -- ca đã qua 5 ngày
  perform public.employer_mark_no_show(a6);
  perform pg_temp.as_user(w1);
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('10b vắng mặt → RECENT_NO_SHOW + hạn chặn',
    v_j ->> 'reason' = 'RECENT_NO_SHOW' and v_j ->> 'blockedUntil' is not null, v_j::text);
  v_n := public._settle_worker_holds_overdue(500);                    -- vừa bị đánh vắng → hạn = now + 72h
  perform pg_temp.chk('10c trước hạn khiếu nại (72h) → vẫn giữ', pg_temp.hold_status(a6) = 'Held', pg_temp.hold_status(a6));
  update public.applications set no_show_at = now() - interval '2 days' where id = a6;
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('10d T3 bị đánh vắng 2 ngày trước → vẫn trong hạn 72h', pg_temp.hold_status(a6) = 'Held',
                      pg_temp.hold_status(a6));
  update public.applications set no_show_at = now() - interval '4 days' where id = a6;
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('10e quá hạn → chuyển NTD 100.000 (ví tiền mặt)',
    pg_temp.hold_status(a6) = 'Forfeited' and pg_temp.bal(e1) = 100000
      and exists (select 1 from public.wallet_ledger where user_id = e1 and application_id = a6
                  and kind = 'EmployerNoShowCompensation' and pocket = 'cash'),
    pg_temp.hold_status(a6) || ' e1=' || pg_temp.bal(e1));
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('10f quét lại → không chuyển trùng', pg_temp.bal(e1) = 100000
    and (select count(*) from public.wallet_ledger
         where application_id = a6 and kind = 'EmployerNoShowCompensation') = 1,
    'e1=' || pg_temp.bal(e1));
  perform pg_temp.as_user(e1);
  begin perform public.employer_revert_no_show(a6, 'dry run'); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('10g sửa vắng mặt sau khi đã chuyển → WORKER_DEPOSIT_SETTLED', v_err = 'WORKER_DEPOSIT_SETTLED', v_err);

  -- ---------- 11. CCCD + vắng mặt; L1 khiếu nại không kèm cọc; khiếu nại có cọc → admin hoàn ----------
  perform public._wallet_apply(w4, 200000, 'UserTopUp', null, null, 'dry'); v_topped := v_topped + 200000;
  perform pg_temp.as_user(w4);
  a7 := public.apply(sd);                                             -- CCCD → miễn
  perform pg_temp.as_user(e1);
  perform public.approve(a7);
  update public.shifts set date = v_today - 1 where id = sd;
  perform public.employer_mark_no_show(a7);
  perform pg_temp.as_user(w4);
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('11a CCCD + vắng mặt → vẫn cần cọc', v_j ->> 'reason' = 'RECENT_NO_SHOW', v_j::text);
  perform public.worker_contest_no_show(a7, 'Tôi có đến, quên check-in');
  perform public.worker_contest_no_show(a7, 'Tôi có đến, quên check-in');   -- gọi lặp
  perform pg_temp.chk('11b L1 khiếu nại không kèm cọc → no_show_contests Pending',
    (select status from public.no_show_contests where application_id = a7) = 'Pending'
      and pg_temp.hold_status(a7) = '(none)', coalesce((select status from public.no_show_contests where application_id = a7), '(none)'));

  a8 := public.apply_with_deposit(se, 75000);
  perform pg_temp.as_user(e1);
  perform public.approve(a8);
  update public.shifts set date = v_today - 1 where id = se;
  perform public.employer_mark_no_show(a8);
  perform pg_temp.as_user(w1);
  begin perform public.worker_contest_no_show(a8, 'tôi có đến'); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('11c khiếu nại đơn người khác → NOT_OWNER', v_err = 'NOT_OWNER', v_err);
  perform pg_temp.as_user(w4);
  perform public.worker_contest_no_show(a8, 'Tôi có đến, quán đóng cửa');
  perform public.worker_contest_no_show(a8, 'Tôi có đến, quán đóng cửa');   -- gọi lặp
  update public.shifts set date = v_today - 5 where id = se;
  update public.applications set no_show_at = now() - interval '4 days' where id = a8;
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('11d đang khiếu nại (quá hạn) → quét không chuyển', pg_temp.hold_status(a8) = 'Contested',
                      pg_temp.hold_status(a8));
  begin perform public.admin_resolve_worker_hold(pg_temp.hold_id(a8), true, 'x');
    v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('11e worker gọi admin_resolve → FORBIDDEN', v_err = 'FORBIDDEN', v_err);
  perform pg_temp.as_user(e1, true);                                  -- L5: NTD của ca mang quyền admin
  begin perform public.admin_resolve_worker_hold(pg_temp.hold_id(a8), false, 'tự xử');
    v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('11f L5 admin là NTD của ca → FORBIDDEN', v_err = 'FORBIDDEN', v_err);
  begin perform public.admin_resolve_no_show_contest(a7, false, 'tự xử');
    v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('11g L5 (không kèm cọc) admin là NTD → FORBIDDEN', v_err = 'FORBIDDEN', v_err);
  perform pg_temp.as_user(adm, true);
  perform public.admin_resolve_worker_hold(pg_temp.hold_id(a8), true, 'NTD xác nhận nhầm');
  perform pg_temp.chk('11h admin xử cho worker → hoàn 75.000',
    pg_temp.hold_status(a8) = 'Refunded' and pg_temp.bal(w4) = 200000,
    pg_temp.hold_status(a8) || ' bal=' || pg_temp.bal(w4));
  begin perform public.admin_resolve_worker_hold(pg_temp.hold_id(a8), false, 'x');
    v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('11i xử lại → ALREADY_REVIEWED', v_err = 'ALREADY_REVIEWED', v_err);
  perform pg_temp.as_user(w4);
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('11j a7 (L1) chưa xử → vẫn RECENT_NO_SHOW', v_j ->> 'reason' = 'RECENT_NO_SHOW', v_j::text);
  perform pg_temp.as_user(adm, true);
  perform public.admin_resolve_no_show_contest(a7, true, 'Quản lý ca xác nhận có đến');
  perform pg_temp.as_user(w4);
  v_j := public.get_my_worker_deposit_status();
  perform pg_temp.chk('11k cả 2 lần vắng được xử có lợi → lại miễn (IDENTITY)', v_j ->> 'reason' = 'IDENTITY', v_j::text);

  -- ---------- 12. Khiếu nại → admin xử cho NTD ----------
  perform pg_temp.as_user(w1);
  a9 := public.apply_with_deposit(sf, 75000);
  perform pg_temp.as_user(e1);
  perform public.approve(a9);
  update public.shifts set date = v_today - 1 where id = sf;
  perform public.employer_mark_no_show(a9);
  perform pg_temp.as_user(w1);
  perform public.worker_contest_no_show(a9, 'Tôi bị ốm đột xuất');
  perform pg_temp.as_user(adm, true);
  perform public.admin_resolve_worker_hold(pg_temp.hold_id(a9), false, 'Không báo trước');
  perform pg_temp.chk('12 admin xử cho NTD → chuyển 75.000',
    pg_temp.hold_status(a9) = 'Forfeited' and pg_temp.bal(e1) = 175000,
    pg_temp.hold_status(a9) || ' e1=' || pg_temp.bal(e1));

  -- ---------- 13. Khiếu nại quá hạn → CONTEST_CLOSED ----------
  perform public._wallet_apply(w1, 200000, 'UserTopUp', null, null, 'dry'); v_topped := v_topped + 200000;
  perform pg_temp.as_user(w1);
  a1 := public.apply_with_deposit(sp, 75000);
  perform pg_temp.as_user(e1);
  perform public.approve(a1);
  update public.shifts set date = v_today - 5 where id = sp;
  perform public.employer_mark_no_show(a1);
  update public.applications set no_show_at = now() - interval '4 days' where id = a1;
  perform pg_temp.as_user(w1);
  begin perform public.worker_contest_no_show(a1, 'Tôi có đến'); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('13 khiếu nại quá hạn → CONTEST_CLOSED', v_err = 'CONTEST_CLOSED', v_err);

  -- ---------- 14. Đang khiếu nại, NTD sửa nhầm vắng mặt → về Held; hoàn thành → hoàn ----------
  update public.applications set no_show_at = now() where id = a1;     -- mở lại hạn
  perform public.worker_contest_no_show(a1, 'Tôi có đến');
  perform pg_temp.as_user(e1);
  perform public.employer_revert_no_show(a1, 'Đến muộn');
  perform pg_temp.chk('14a sửa nhầm vắng mặt khi đang khiếu nại → Held', pg_temp.hold_status(a1) = 'Held',
                      pg_temp.hold_status(a1));
  update public.applications set status = 'Confirmed', confirmed_at = now() where id = a1;
  perform pg_temp.chk('14b hoàn thành → hoàn cọc', pg_temp.hold_status(a1) = 'Refunded', pg_temp.hold_status(a1));

  -- ---------- 15. Đơn còn chờ khi ca đã bắt đầu → quét hoàn ----------
  perform pg_temp.as_user(w1);
  v_err := 'no error';
  begin a2 := public.apply_with_deposit(sq, 100000);
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('15a đồng ý tối đa 100.000 → giữ đúng 75.000',
    v_err = 'no error' and (select amount from public.worker_holds where application_id = a2) = 75000, v_err);
  update public.shifts set date = v_today - 1 where id = sq;
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('15b Pending quá giờ bắt đầu → hoàn', pg_temp.hold_status(a2) = 'Refunded', pg_temp.hold_status(a2));

  -- ---------- 16. T2 giới hạn 3 khoản; T2 trần NTD 300.000/24h; L2 hoàn dự phòng ----------
  perform public._wallet_apply(w5, 300000, 'UserTopUp', null, null, 'dry'); v_topped := v_topped + 300000;
  perform pg_temp.as_user(w5);
  b1 := public.apply_with_deposit(s9, 75000);
  b2 := public.apply_with_deposit(s10, 75000);
  b3 := public.apply_with_deposit(s11, 75000);
  begin perform public.apply_with_deposit(s12, 75000); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('16a T2 khoản thứ 4 → WORKER_DEPOSIT_LIMIT, ví không bị trừ',
    v_err = 'WORKER_DEPOSIT_LIMIT' and pg_temp.bal(w5) = 75000
      and not exists (select 1 from public.applications where worker_id = w5 and shift_id = s12),
    v_err || ' bal=' || pg_temp.bal(w5));
  perform pg_temp.as_user(e1);
  perform public.approve(b1);
  perform public.approve(b2);
  perform public.approve(b3);
  update public.shifts set date = v_today - 5 where id in (s9, s10);
  update public.shifts set date = v_today - 9 where id = s11;
  perform public.employer_mark_no_show(b1);
  perform public.employer_mark_no_show(b2);
  update public.applications set no_show_at = now() - interval '4 days' where id in (b1, b2);
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('16b T2 NTD đã nhận 175.000: +75.000 tự chuyển, khoản kế (325.000 > 300.000) chờ admin',
    pg_temp.bal(e1) = 250000
      and (select count(*) from public.worker_holds where application_id in (b1, b2) and status = 'Forfeited') = 1
      and (select count(*) from public.worker_holds where application_id in (b1, b2)
           and status = 'Contested' and review_reason = 'EMPLOYER_DAILY_CAP' and contest_reason is null) = 1,
    'e1=' || pg_temp.bal(e1) || ' b1=' || pg_temp.hold_status(b1) || ' b2=' || pg_temp.hold_status(b2));
  perform pg_temp.chk('16c L2 đơn Approved, ca qua 9 ngày, không ai xử → hoàn dự phòng',
    pg_temp.hold_status(b3) = 'Refunded', pg_temp.hold_status(b3));
  -- Khoản chờ vì trần: worker vẫn gửi được lý do (quá hạn 72h vẫn nhận vì đang chờ admin).
  select application_id into a3 from public.worker_holds
   where application_id in (b1, b2) and status = 'Contested';
  perform pg_temp.as_user(w5);
  perform public.worker_contest_no_show(a3, 'Tôi có đến, có ảnh chụp');
  perform pg_temp.chk('16d worker thêm lý do cho khoản chờ vì trần',
    (select contest_reason from public.worker_holds where application_id = a3) = 'Tôi có đến, có ảnh chụp', '');
  perform pg_temp.as_user(adm, true);
  perform public.admin_resolve_worker_hold(pg_temp.hold_id(a3), true, 'Có ảnh chụp');
  perform pg_temp.chk('16e admin hoàn khoản chờ vì trần', pg_temp.hold_status(a3) = 'Refunded', pg_temp.hold_status(a3));

  -- Khoản đã hoàn dự phòng (L2), NTD mới đánh vắng → vẫn khiếu nại được (không kèm tiền).
  perform pg_temp.as_user(e1);
  perform public.employer_mark_no_show(b3);
  perform pg_temp.as_user(w5);
  perform public.worker_contest_no_show(b3, 'Tôi có làm, NTD đánh vắng muộn');
  perform pg_temp.chk('16f khoản đã hoàn + bị đánh vắng muộn → khiếu nại không kèm cọc',
    (select status from public.no_show_contests where application_id = b3) = 'Pending'
      and pg_temp.hold_status(b3) = 'Refunded' and pg_temp.bal(w5) = 225000,
    coalesce((select status from public.no_show_contests where application_id = b3), '(none)'));
  perform pg_temp.as_user(adm, true);
  v_j := public.admin_get_worker_deposit_settings();
  perform pg_temp.chk('16g không còn khoản quá hạn chưa xử lý (overdueHeldCount)',
    (v_j ->> 'overdueHeldCount') is not null
      and not exists (select 1 from public.worker_holds
                      where worker_id in (w1, w2, w3, w4, w5) and status = 'Held'),
    v_j ->> 'overdueHeldCount');

  -- ---------- 16h. Hệ thống tự đánh vắng (0019, auto_settled_at) → chờ admin, không tự chuyển ----------
  perform pg_temp.as_user(w1);
  c1 := public.apply_with_deposit(s13, 75000);
  perform pg_temp.as_user(e1);
  perform public.approve(c1);
  update public.shifts set date = v_today - 6 where id = s13;
  -- Giả lập _auto_settle_overdue (0019): Approved → NoShow + auto_settled_at, 4 ngày trước.
  update public.applications
     set status = 'NoShow', no_show_at = now() - interval '4 days', auto_settled_at = now() - interval '4 days'
   where id = c1;
  v_n := public._settle_worker_holds_overdue(500);
  perform pg_temp.chk('16h hệ thống tự đánh vắng, quá hạn → chờ admin (AUTO_NO_SHOW), NTD không nhận',
    pg_temp.hold_status(c1) = 'Contested'
      and (select review_reason from public.worker_holds where application_id = c1) = 'AUTO_NO_SHOW'
      and pg_temp.bal(e1) = 250000,
    pg_temp.hold_status(c1) || ' e1=' || pg_temp.bal(e1));
  perform pg_temp.as_user(adm, true);
  perform public.admin_resolve_worker_hold(pg_temp.hold_id(c1), true, 'NTD không xác nhận, không có căn cứ');
  perform pg_temp.chk('16i admin hoàn khoản tự đánh vắng', pg_temp.hold_status(c1) = 'Refunded'
    and pg_temp.bal(w1) = 225000, pg_temp.hold_status(c1) || ' w1=' || pg_temp.bal(w1));

  -- ---------- 17. Bảo toàn tiền ----------
  perform pg_temp.chk('17a tổng ví + khoản đang giữ = tổng đã nạp',
    (select sum(pg_temp.bal(x)) from unnest(array[e1, w1, w2, w3, w4, w5]) x)
      + (select coalesce(sum(amount), 0) from public.worker_holds
         where worker_id in (w1, w2, w3, w4, w5) and status in ('Held', 'Contested')) = v_topped,
    'topped=' || v_topped || ' e1=' || pg_temp.bal(e1) || ' w1=' || pg_temp.bal(w1)
      || ' w4=' || pg_temp.bal(w4) || ' w5=' || pg_temp.bal(w5));
  perform pg_temp.chk('17b mỗi đơn tối đa 1 dòng mỗi loại trong sổ ví',
    not exists (select application_id, kind from public.wallet_ledger
                where kind in ('WorkerDepositHeld', 'WorkerDepositRefund', 'EmployerNoShowCompensation')
                  and user_id in (e1, w1, w4, w5) group by 1, 2 having count(*) > 1), '');
end
$dry$;

-- ---------- 18. RLS + quyền cột (L6) ----------
do $rls$
declare v_w uuid := current_setting('dry.w1')::uuid; v_cnt int; v_mine int; v_state text;
begin
  select count(*) into v_mine from public.worker_holds where worker_id = v_w;
  perform pg_temp.as_user(v_w);
  set local role authenticated;
  select count(*) into v_cnt from public.worker_holds;
  begin
    perform resolved_by from public.worker_holds limit 1;
    v_state := 'no error';
  exception when others then v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.chk('18a RLS: worker chỉ thấy khoản của mình', v_cnt = v_mine and v_mine > 0, v_cnt || '/' || v_mine);
  perform pg_temp.chk('18b L6 worker đọc resolved_by → insufficient_privilege', v_state = '42501', v_state);
end
$rls$;

-- ---------- Kết quả: raise → transaction luôn rollback ----------
do $out$
begin
  raise exception 'DRYRUN_RESULT (% / % ok)%', (select count(*) filter (where ok) from _r), (select count(*) from _r),
    (select string_agg(E'\n' || lpad(n::text, 2) || ' ' || case when ok then 'ok  ' else 'FAIL' end || ' ' || scn
                       || case when ok then '' else ' [' || coalesce(got, '') || ']' end, '' order by n) from _r);
end
$out$;
