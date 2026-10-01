-- =============================================================================
-- Chạy thử 0031 (thông báo phía server khi admin xử giao dịch nạp) trên DB
-- thật — KHÔNG ghi gì lại.
--
-- Cách chạy: bash supabase/dryrun/run-0031.sh (ghép timeout + begin + 0030 +
-- 0031 + file này + rollback; 0030 chạy lại được nhiều lần). File kết thúc
-- bằng raise exception "DRYRUN_RESULT" → transaction luôn rollback.
-- =============================================================================

create temp table _r (n serial, scn text, ok boolean, got text) on commit drop;

create or replace function pg_temp.chk(p_scn text, p_ok boolean, p_got text)
returns void language sql as $$ insert into _r (scn, ok, got) values (p_scn, coalesce(p_ok, false), p_got); $$;

create or replace function pg_temp.as_user(p_uid uuid, p_admin boolean default false)
returns void language sql as $$
  select set_config('request.jwt.claims', case when p_uid is null then '' else jsonb_build_object(
    'sub', p_uid, 'role', 'authenticated',
    'app_metadata', case when p_admin then jsonb_build_object('role', 'admin') else '{}'::jsonb end)::text end, true);
$$;

create or replace function pg_temp.item_id(p_order bigint) returns uuid language sql as $$
  select r.id from public.payment_review_items r
    join public.payment_orders o on o.id = r.order_id
   where o.order_code = p_order order by r.created_at, r.id limit 1;
$$;
create or replace function pg_temp.notifs(p_uid uuid) returns int language sql as $$
  select count(*)::int from public.user_notifications where user_id = p_uid;
$$;

do $dry$
declare
  w1  uuid := gen_random_uuid();
  w2  uuid := gen_random_uuid();
  adm uuid := gen_random_uuid();
  u uuid;
  base bigint := 9900000000 + (floor(random() * 90000000))::bigint * 10;
  oa bigint := base + 1; ob bigint := base + 2;
  v_j jsonb; v_n int; v_id uuid; v_ids uuid[]; v_k text; v_p jsonb;
begin
  foreach u in array array[w1, w2] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'dryrun-' || u || '@example.invalid',
              jsonb_build_object('role', 'worker', 'full_name', 'Dry ' || left(u::text, 4)),
              jsonb_build_object('provider', 'email'), now(), now());
  end loop;
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (adm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || adm || '@example.invalid', '{}'::jsonb,
            jsonb_build_object('provider', 'google', 'role', 'admin'), now(), now());
  insert into public.users (id, role, email) values (adm, 'admin', 'dryrun-' || adm || '@example.invalid')
    on conflict (id) do nothing;
  update public.platform_settings set topup_bonus_amount = 0 where id;

  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref) values
    (oa, w1, 50000, 'PENDING', 'LINK-A'),
    (ob, w1, 30000, 'PENDING', 'LINK-B');
  perform public.credit_wallet_from_payos(oa, 49000, 'DRY-NA1', 'LINK-A');
  perform public.credit_wallet_from_payos(ob, 29000, 'DRY-NB1', 'LINK-B');

  -- 01 Webhook đánh dấu → chưa có thông báo (chỉ khi admin xử).
  perform pg_temp.chk('01 đánh dấu chưa sinh thông báo', pg_temp.notifs(w1) = 0, pg_temp.notifs(w1)::text);

  -- 02 Admin cộng → 1 thông báo PaymentReviewCredited, đủ tham số.
  perform pg_temp.as_user(adm, true);
  perform public.admin_resolve_payment_review(pg_temp.item_id(oa), true, 'Khớp sao kê');
  select kind, params into v_k, v_p from public.user_notifications where user_id = w1;
  perform pg_temp.chk('02 cộng → PaymentReviewCredited (mã đơn, số đã cộng, ghi chú)',
    pg_temp.notifs(w1) = 1 and v_k = 'PaymentReviewCredited'
    and (v_p->>'orderCode')::bigint = oa and (v_p->>'creditedAmount')::int = 49000
    and v_p->>'note' = 'Khớp sao kê', coalesce(v_k, 'null') || ' ' || coalesce(v_p::text, 'null'));

  -- 03 Admin không cộng → PaymentReviewDismissed.
  perform public.admin_resolve_payment_review(pg_temp.item_id(ob), false, 'Đã hoàn tay');
  perform pg_temp.chk('03 không cộng → PaymentReviewDismissed',
    pg_temp.notifs(w1) = 2 and exists (select 1 from public.user_notifications
      where user_id = w1 and kind = 'PaymentReviewDismissed' and params->>'note' = 'Đã hoàn tay'),
    pg_temp.notifs(w1)::text);

  -- 04 Sửa dòng đã xử (không đổi Pending → …) → không thêm thông báo.
  update public.payment_review_items set resolution_note = 'sửa ghi chú' where id = pg_temp.item_id(oa);
  perform pg_temp.chk('04 cập nhật dòng đã xử → không thêm', pg_temp.notifs(w1) = 2, pg_temp.notifs(w1)::text);

  -- 05 Đọc: chỉ của mình.
  perform pg_temp.as_user(w1);
  select count(*), array_agg(id) into v_n, v_ids from public.get_my_notifications();
  perform pg_temp.chk('05a chủ thấy 2 thông báo', v_n = 2, v_n::text);
  perform pg_temp.as_user(w2);
  select count(*) into v_n from public.get_my_notifications();
  perform pg_temp.chk('05b người khác thấy 0', v_n = 0, v_n::text);

  -- 06 Đánh dấu đã đọc: người khác truyền id của w1 → 0 dòng; chủ → đúng số.
  v_n := public.mark_my_notifications_read(v_ids);
  perform pg_temp.chk('06a người khác đánh dấu id của chủ → 0, vẫn chưa đọc',
    v_n = 0 and not exists (select 1 from public.user_notifications where user_id = w1 and read_at is not null),
    v_n::text);
  perform pg_temp.as_user(w1);
  v_n := public.mark_my_notifications_read(array[v_ids[1]]);
  perform pg_temp.chk('06b chủ đánh dấu 1 id → 1', v_n = 1, v_n::text);
  v_n := public.mark_my_notifications_read(null);
  perform pg_temp.chk('06c chủ đánh dấu tất cả → 1 (còn lại)', v_n = 1, v_n::text);
  v_n := public.mark_my_notifications_read(null);
  perform pg_temp.chk('06d gọi lại → 0 (idempotent)', v_n = 0, v_n::text);

  -- 07 Quá 100 id → INVALID_INPUT.
  begin
    perform public.mark_my_notifications_read(array_fill(gen_random_uuid(), array[101]));
    perform pg_temp.chk('07 quá 100 id → INVALID_INPUT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('07 quá 100 id → INVALID_INPUT', sqlerrm = 'INVALID_INPUT', sqlerrm);
  end;

  -- 08 Chưa đăng nhập → NOT_AUTHENTICATED.
  perform pg_temp.as_user(null);
  begin
    perform * from public.get_my_notifications();
    perform pg_temp.chk('08 chưa đăng nhập → NOT_AUTHENTICATED', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('08 chưa đăng nhập → NOT_AUTHENTICATED', sqlerrm = 'NOT_AUTHENTICATED', sqlerrm);
  end;

  -- 09 Quyền.
  perform pg_temp.chk('09 quyền: bảng không cho client; RPC chỉ authenticated; hàm trigger không cho client',
    not has_table_privilege('authenticated', 'public.user_notifications', 'select')
    and not has_table_privilege('authenticated', 'public.user_notifications', 'insert')
    and not has_table_privilege('anon', 'public.user_notifications', 'select')
    and has_function_privilege('authenticated', 'public.get_my_notifications()', 'execute')
    and not has_function_privilege('anon', 'public.get_my_notifications()', 'execute')
    and has_function_privilege('authenticated', 'public.mark_my_notifications_read(uuid[])', 'execute')
    and not has_function_privilege('anon', 'public.mark_my_notifications_read(uuid[])', 'execute')
    and not has_function_privilege('authenticated', 'public._notify_payment_review_resolved()', 'execute')
    and (select relrowsecurity from pg_class where oid = 'public.user_notifications'::regclass),
    'ok');

  perform set_config('request.jwt.claims', '', true);
end $dry$;

do $fin$
declare v_txt text; v_ok int; v_all int;
begin
  select count(*) filter (where ok), count(*) into v_ok, v_all from _r;
  select string_agg(format('%s %s | %s', case when ok then 'ok  ' else 'FAIL' end, scn, left(got, 160)), E'\n' order by n)
    into v_txt from _r;
  raise exception 'DRYRUN_RESULT (% / % ok)%', v_ok, v_all, E'\n' || v_txt;
end $fin$;
