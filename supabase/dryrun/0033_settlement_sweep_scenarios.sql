-- =============================================================================
-- Chạy thử 0033, phần 2 (SAU migration). Dùng dữ liệu + hàm pg_temp của phần 1.
-- Kết thúc bằng raise exception "DRYRUN_RESULT" → transaction luôn rollback.
-- Mọi dòng phải "ok".
-- =============================================================================

do $dry$
declare
  e1 uuid := pg_temp.id('e1');
  e2 uuid := pg_temp.id('e2');
  w1 uuid := pg_temp.id('w1');
  w2 uuid := pg_temp.id('w2');
  w3 uuid := pg_temp.id('w3');
  w4 uuid := pg_temp.id('w4');
  sp uuid := pg_temp.id('p');
  sg uuid := pg_temp.id('g');
  ap uuid := pg_temp.id('ap');
  ag uuid := pg_temp.id('ag');
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  sr uuid; ar uuid; acr uuid; sf uuid; ss uuid; asp uuid; afp uuid;
  v_err text; v_n int; v_w2 int; v_ok int; v_all int; v_txt text := '';
  adm uuid := gen_random_uuid(); v_j jsonb;
  r record;
begin
  -- ---------- 01. Ca độc không chặn ca khác ----------
  begin
    v_n := public._auto_settle_overdue(500);
    v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('01a sau 0033: lượt quét không lỗi dù có ca độc', v_err = 'no error', v_err);
  perform pg_temp.chk('01b ca thường được chốt + trả công',
    pg_temp.session_status(sg) = 'RELEASED' and pg_temp.app_status(ag) = 'Confirmed' and pg_temp.bal(w2) = 150000,
    'phiên=' || pg_temp.session_status(sg) || ' đơn=' || pg_temp.app_status(ag) || ' ví=' || pg_temp.bal(w2));
  perform pg_temp.chk('01c ca độc giữ nguyên (rollback riêng ca đó, lượt sau thử lại)',
    pg_temp.session_status(sp) = 'HELD' and pg_temp.app_status(ap) = 'CheckedOut' and pg_temp.bal(w1) = 0,
    'phiên=' || pg_temp.session_status(sp) || ' đơn=' || pg_temp.app_status(ap));

  -- ---------- 02. Chạy lại: không trả công lần hai ----------
  v_w2 := pg_temp.bal(w2);
  perform public._auto_settle_overdue(500);
  perform pg_temp.chk('02 chạy lại idempotent (không trả hai lần)', pg_temp.bal(w2) = v_w2,
    'ví trước=' || v_w2 || ' sau=' || pg_temp.bal(w2));

  -- ---------- 03. Hoàn cọc sớm đóng đơn treo ----------
  sr := pg_temp.mk_shift(e2, 'r', current_setting('dry.recent_date')::date,
                         current_setting('dry.recent_start')::time, current_setting('dry.recent_end')::time);
  ar := pg_temp.mk_app(sr, w3, 'Approved', 30000, 'ar');
  acr := pg_temp.mk_app(sr, w4, 'CancellationRequested', 30000, 'acr');
  perform pg_temp.as_user(e1);
  begin perform public.refund_deposit_for_shift(sr); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('03a người khác hoàn cọc → NOT_OWNER', v_err = 'NOT_OWNER', v_err);
  perform pg_temp.as_user(e2);
  begin perform public.refund_deposit_for_shift(sr); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('03b hoàn cọc sớm: Approved → NoShow (hệ thống đánh vắng)',
    v_err = 'no error' and pg_temp.app_status(ar) = 'NoShow'
      and (select auto_settled_at is not null and no_show_at is not null from public.applications where id = ar),
    v_err || ' đơn=' || pg_temp.app_status(ar));
  perform pg_temp.chk('03c hoàn cọc sớm: CancellationRequested → Expired',
    pg_temp.app_status(acr) = 'Expired'
      and (select expired_reason from public.applications where id = acr) = 'CANCELLATION_REQUEST_STALE',
    pg_temp.app_status(acr));
  perform pg_temp.chk('03d hoàn đủ cọc về ví NTD (không ai làm)',
    pg_temp.session_status(sr) = 'REFUNDED' and pg_temp.bal(e2) = 33000,
    'phiên=' || pg_temp.session_status(sr) || ' ví NTD=' || pg_temp.bal(e2));

  -- ---------- 04. Chưa tới mốc 60 phút vẫn chặn ----------
  sf := pg_temp.mk_shift(e2, 'f', v_today + 2, '08:00', '13:00');
  begin perform public.refund_deposit_for_shift(sf); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04 ca chưa diễn ra → SHIFT_NOT_REFUNDABLE, cọc vẫn giữ',
    v_err = 'SHIFT_NOT_REFUNDABLE' and pg_temp.session_status(sf) = 'HELD', v_err);

  -- ---------- 05. Đơn Pending khi ca đã bắt đầu → Expired ----------
  ss := pg_temp.mk_shift(e1, 's', v_today - 1, '08:00', '13:00');
  asp := pg_temp.mk_app(ss, w3, 'Pending', null, 'asp');
  afp := pg_temp.mk_app(sf, w4, 'Pending', null, 'afp');
  perform set_config('request.jwt.claims', '', true);
  perform public._auto_settle_overdue(500);
  perform pg_temp.chk('05a Pending ca đã bắt đầu → Expired (SHIFT_STARTED)',
    pg_temp.app_status(asp) = 'Expired'
      and (select expired_reason from public.applications where id = asp) = 'SHIFT_STARTED',
    pg_temp.app_status(asp));
  perform pg_temp.chk('05b Pending ca chưa bắt đầu giữ nguyên', pg_temp.app_status(afp) = 'Pending',
    pg_temp.app_status(afp));

  -- ---------- 06. App gọi sync_overdue_settlements ----------
  perform pg_temp.as_user(w1);
  begin v_n := public.sync_overdue_settlements(); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('06a sync_overdue_settlements chạy, không lỗi', v_err = 'no error', v_err);
  perform set_config('request.jwt.claims', '', true);
  begin v_n := public.sync_overdue_settlements(); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('06b chưa đăng nhập → NOT_AUTHENTICATED', v_err = 'NOT_AUTHENTICATED', v_err);

  -- ---------- 07. Quyền: hàm nội bộ không mở cho client ----------
  perform pg_temp.chk('07a authenticated KHÔNG gọi được _close_overdue_applications',
    not has_function_privilege('authenticated', 'public._close_overdue_applications(uuid)', 'execute'), '');
  perform pg_temp.chk('07b authenticated KHÔNG gọi được _expire_started_pending',
    not has_function_privilege('authenticated', 'public._expire_started_pending(int)', 'execute'), '');
  perform pg_temp.chk('07c authenticated KHÔNG gọi được _auto_settle_overdue',
    not has_function_privilege('authenticated', 'public._auto_settle_overdue(int)', 'execute'), '');
  perform pg_temp.chk('07d anon KHÔNG gọi được sync_overdue_settlements / refund_deposit_for_shift',
    not has_function_privilege('anon', 'public.sync_overdue_settlements()', 'execute')
      and not has_function_privilege('anon', 'public.refund_deposit_for_shift(uuid)', 'execute'), '');

  -- ---------- 08. Admin thấy ca kẹt cọc (ca độc vẫn HELD quá hạn) ----------
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (adm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || adm || '@example.invalid', '{}'::jsonb,
            jsonb_build_object('provider', 'google', 'role', 'admin'), now(), now());
  insert into public.users (id, role, email) values (adm, 'admin', 'dryrun-' || adm || '@example.invalid')
    on conflict (id) do update set role = 'admin';
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', adm, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
  v_j := public.admin_payout_health();
  perform pg_temp.chk('08a admin_payout_health.stuckDeposits ≥ 1 (ca độc)',
    (v_j ->> 'stuckDeposits')::int >= 1, v_j::text);
  perform pg_temp.as_user(w1);
  begin v_j := public.admin_payout_health(); v_err := 'no error';
  exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08b người thường gọi admin_payout_health → NOT_AUTHORIZED', v_err = 'NOT_AUTHORIZED', v_err);
  perform set_config('request.jwt.claims', '', true);

  -- ---------- Kết quả ----------
  select count(*) filter (where ok), count(*) into v_ok, v_all from _r;
  for r in select * from _r order by n loop
    v_txt := v_txt || E'\n' || case when r.ok then 'ok   ' else 'FAIL ' end || r.scn
             || case when r.ok then '' else '  [' || coalesce(r.got, '') || ']' end;
  end loop;
  raise exception 'DRYRUN_RESULT (% / % ok)%', v_ok, v_all, v_txt;
end $dry$;
