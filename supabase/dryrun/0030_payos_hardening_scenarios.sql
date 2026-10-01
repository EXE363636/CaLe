-- =============================================================================
-- Chạy thử 0030 (gia cố webhook PayOS + chặn xoá người dùng có lịch sử tiền)
-- trên DB thật — KHÔNG ghi gì lại.
--
-- Cách chạy: bash supabase/dryrun/run-0030.sh (ghép timeout + begin + migration
-- + file này + rollback). File kết thúc bằng raise exception "DRYRUN_RESULT"
-- mang bảng kết quả → transaction luôn rollback. Mọi dòng phải "ok".
--
-- Tài khoản / đơn nạp GIẢ (order_code 9_9xx_xxx_xxx), gọi webhook RPC trực tiếp
-- (vai trò chạy script ≈ service_role), giả lập người gọi bằng request.jwt.claims.
-- Thưởng nạp ví TẮT trong transaction để số dư dễ kiểm.
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
create or replace function pg_temp.bank() returns bigint language sql as $$
  select balance::bigint from public.system_bank where id;
$$;
create or replace function pg_temp.items(p_order bigint) returns int language sql as $$
  select count(*)::int from public.payment_review_items r
    join public.payment_orders o on o.id = r.order_id where o.order_code = p_order;
$$;
create or replace function pg_temp.item_id(p_order bigint, p_ref text) returns uuid language sql as $$
  select r.id from public.payment_review_items r
    join public.payment_orders o on o.id = r.order_id
   where o.order_code = p_order and r.txn_ref is not distinct from p_ref
   order by r.created_at, r.id limit 1;
$$;
create or replace function pg_temp.suspect(p_item uuid) returns text language sql as $$
  select coalesce((select l.duplicate_suspect::text from public.admin_list_payment_reviews() l
                    where l.id = p_item), 'null');
$$;

do $dry$
declare
  w1  uuid := gen_random_uuid();   -- người nạp
  w2  uuid := gen_random_uuid();   -- người khác
  w3  uuid := gen_random_uuid();   -- tài khoản mới, chưa có tiền
  adm uuid := gen_random_uuid();
  u uuid;
  base bigint := 9900000000 + (floor(random() * 90000000))::bigint * 10;
  oa bigint := base + 1; ob bigint := base + 2; oc bigint := base + 3; od bigint := base + 4;
  oe bigint := base + 5; of_ bigint := base + 6; og bigint := base + 7; oh bigint := base + 8;
  oi bigint := base + 9; oj bigint := base + 10; ok_ bigint := base + 11;
  v_j jsonb; v_b0 int; v_k0 bigint; v_total_before bigint; v_total_after bigint; v_s text;
begin
  foreach u in array array[w1, w2, w3] loop
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
    (oa, w1, 10000, 'PENDING', 'LINK-A'),
    (ob, w1, 50000, 'PENDING', 'LINK-B'),
    (oc, w1, 50000, 'PENDING', 'LINK-C'),
    (od, w1, 40000, 'PENDING', 'LINK-D'),
    (oe, w1, 40000, 'PENDING', 'LINK-E'),
    (of_, w1, 30000, 'PENDING', 'LINK-F'),
    (og, w1, 30000, 'PENDING', 'LINK-G'),
    (oj, w1, 10000, 'PENDING', 'LINK-J'),
    (ok_, w1, 10000, 'PENDING', 'LINK-K');
  -- Đơn PAID kiểu trước 0027 (không mã, không paid_amount): một cũ, một vừa trả.
  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref, paid_at) values
    (oh, w1, 20000, 'PAID', 'LINK-H', now() - interval '2 days'),
    (oi, w1, 20000, 'PAID', 'LINK-I', now() - interval '1 hour');

  v_total_before := pg_temp.bal(w1) + pg_temp.bal(w2) + pg_temp.bal(w3) + pg_temp.bal(adm);
  v_k0 := pg_temp.bank();

  -- 01 Số tiền vượt int4 → không lỗi, AMOUNT_MISMATCH, dòng paid null.
  v_j := public.credit_wallet_from_payos(oa, 3000000000, 'DRY-XA1', 'LINK-A');
  perform pg_temp.chk('01 số tiền 3 tỉ (vượt int4) → AMOUNT_MISMATCH, dòng paid null, không lỗi',
    v_j->>'reason' = 'AMOUNT_MISMATCH' and pg_temp.items(oa) = 1
    and (select paid_amount from public.payment_review_items where id = pg_temp.item_id(oa, 'DRY-XA1')) is null
    and (v_j->>'paid_amount_raw')::numeric = 3000000000, v_j::text);

  -- 02 Số cực lớn / số lẻ → không lỗi; số lẻ khớp đơn vẫn không cộng.
  v_j := public.credit_wallet_from_payos(oj, 1e21, 'DRY-XJ1', 'LINK-J');
  perform pg_temp.chk('02a số 1e21 → không lỗi, AMOUNT_MISMATCH',
    v_j->>'reason' = 'AMOUNT_MISMATCH' and pg_temp.items(oj) = 1, v_j::text);
  v_j := public.credit_wallet_from_payos(ok_, 10000.5, 'DRY-XK1', 'LINK-K');
  perform pg_temp.chk('02b số lẻ 10000.5 → AMOUNT_MISMATCH, ví không đổi',
    v_j->>'reason' = 'AMOUNT_MISMATCH' and pg_temp.bal(w1) = 0, v_j::text);

  -- 03 Giao dịch khớp vẫn cộng tự động như cũ.
  v_j := public.credit_wallet_from_payos(ob, 50000, 'DRY-XB1', 'LINK-B');
  perform pg_temp.chk('03 khớp → PAID, ví +50.000, gắn mã + paid_amount',
    v_j->>'status' = 'PAID' and pg_temp.bal(w1) = 50000
    and (select provider_txn_ref = 'DRY-XB1' and paid_amount = 50000 from public.payment_orders where order_code = ob),
    v_j::text);

  -- 04 Cùng mã giao dịch tới cho ĐƠN KHÁC → DUPLICATE_TXN_REF, không lỗi unique, không gắn mã.
  v_j := public.credit_wallet_from_payos(oc, 50000, 'DRY-XB1', 'LINK-C');
  perform pg_temp.chk('04 mã đã thuộc đơn khác → DUPLICATE_TXN_REF, ví giữ, đơn không gắn mã',
    v_j->>'reason' = 'DUPLICATE_TXN_REF' and pg_temp.bal(w1) = 50000 and pg_temp.items(oc) = 1
    and (select provider_txn_ref is null and needs_review from public.payment_orders where order_code = oc),
    v_j::text);

  -- 05 PayOS gửi lại → ALREADY_RECORDED.
  v_j := public.credit_wallet_from_payos(oc, 50000, 'DRY-XB1', 'LINK-C');
  perform pg_temp.chk('05 gửi lại → ALREADY_RECORDED, vẫn 1 dòng',
    v_j->>'reason' = 'ALREADY_RECORDED' and pg_temp.items(oc) = 1, v_j::text);

  -- 06 Admin cộng dòng đó → DUPLICATE_SUSPECT (mã đã cộng tự động ở đơn B).
  perform pg_temp.as_user(adm, true);
  v_s := pg_temp.suspect(pg_temp.item_id(oc, 'DRY-XB1'));
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(oc, 'DRY-XB1'), true, 'thử');
    perform pg_temp.chk('06 cộng dòng mã trùng (đơn kia cộng tự động) → DUPLICATE_SUSPECT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('06 cộng dòng mã trùng (đơn kia cộng tự động) → DUPLICATE_SUSPECT',
      sqlerrm = 'DUPLICATE_SUSPECT' and v_s = 'true' and pg_temp.bal(w1) = 50000, sqlerrm || ' / list=' || v_s);
  end;

  -- 07 Mã đã được ADMIN cộng ở đơn khác → dòng mới cùng mã bị chặn.
  perform public.credit_wallet_from_payos(od, 40001, 'DRY-XD1', 'LINK-D');
  perform public.admin_resolve_payment_review(pg_temp.item_id(od, 'DRY-XD1'), true, 'Khớp sao kê');
  v_j := public.credit_wallet_from_payos(oe, 40000, 'DRY-XD1', 'LINK-E');
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(oe, 'DRY-XD1'), true, 'thử');
    perform pg_temp.chk('07 mã đã được admin cộng ở đơn khác → DUPLICATE_TXN_REF + DUPLICATE_SUSPECT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('07 mã đã được admin cộng ở đơn khác → DUPLICATE_TXN_REF + DUPLICATE_SUSPECT',
      v_j->>'reason' = 'DUPLICATE_TXN_REF' and sqlerrm = 'DUPLICATE_SUSPECT', v_j::text || ' / ' || sqlerrm);
  end;

  -- 08 (review M2) Mã ở đơn khác đã "Không cộng" (= đã hoàn tay) → vẫn nghi trùng.
  perform public.credit_wallet_from_payos(of_, 30001, 'DRY-XF1', 'LINK-F');
  perform public.admin_resolve_payment_review(pg_temp.item_id(of_, 'DRY-XF1'), false, 'Hoàn tay');
  v_j := public.credit_wallet_from_payos(og, 30000, 'DRY-XF1', 'LINK-G');
  v_s := pg_temp.suspect(pg_temp.item_id(og, 'DRY-XF1'));
  perform pg_temp.chk('08 mã trùng, đơn kia đã bỏ qua (hoàn tay) → DUPLICATE_TXN_REF, vẫn nghi trùng',
    v_j->>'reason' = 'DUPLICATE_TXN_REF' and v_s = 'true', v_j::text || ' / ' || v_s);

  -- 09 Đơn PAID trước 0027, trả 2 ngày trước → giao dịch mới thành dòng (không bị nuốt).
  v_b0 := pg_temp.bal(w1);
  v_j := public.credit_wallet_from_payos(oh, 20000, 'DRY-XH2', 'LINK-H');
  v_s := pg_temp.suspect(pg_temp.item_id(oh, 'DRY-XH2'));
  perform pg_temp.chk('09a đơn PAID cũ (2 ngày) → EXTRA_PAYMENT, có dòng, cùng số tiền đơn → nghi trùng',
    v_j->>'reason' = 'EXTRA_PAYMENT' and pg_temp.items(oh) = 1 and pg_temp.bal(w1) = v_b0 and v_s = 'true',
    v_j::text || ' / ' || v_s);
  v_j := public.credit_wallet_from_payos(oh, 1234, 'DRY-XH3', 'LINK-H');
  v_s := pg_temp.suspect(pg_temp.item_id(oh, 'DRY-XH3'));
  perform public.admin_resolve_payment_review(pg_temp.item_id(oh, 'DRY-XH3'), true, 'Chuyển thêm thật');
  perform pg_temp.chk('09b khác số tiền → không nghi trùng, admin cộng được +1.234',
    v_s = 'false' and pg_temp.bal(w1) = v_b0 + 1234, v_s || ' / ' || pg_temp.bal(w1));
  -- (review L2) Sau khi cộng một dòng khác số tiền, dòng cùng số tiền đơn vẫn nghi trùng.
  v_s := pg_temp.suspect(pg_temp.item_id(oh, 'DRY-XH2'));
  perform pg_temp.chk('09c đơn cũ đã cộng thêm 1 dòng → dòng cùng số tiền đơn vẫn nghi trùng',
    v_s = 'true', v_s);

  -- 10 Đơn PAID trước 0027, vừa trả 1 giờ → vẫn coi là PayOS gửi lại.
  v_j := public.credit_wallet_from_payos(oi, 20000, 'DRY-XI1', 'LINK-I');
  perform pg_temp.chk('10 đơn PAID cũ trả trong 24 giờ → ALREADY_PAID, không dòng',
    v_j->>'status' = 'ALREADY_PAID' and pg_temp.items(oi) = 0, v_j::text);

  -- 11 Trạng thái đơn: người khác nhận ORDER_NOT_FOUND (không còn NOT_OWNER).
  perform pg_temp.as_user(w2);
  begin
    perform public.get_payment_order_status(ob);
    perform pg_temp.chk('11a người khác → ORDER_NOT_FOUND', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('11a người khác → ORDER_NOT_FOUND', sqlerrm = 'ORDER_NOT_FOUND', sqlerrm);
  end;
  perform pg_temp.as_user(w1);
  v_j := public.get_payment_order_status(ob);
  perform pg_temp.chk('11b chủ đơn vẫn đọc được', v_j->>'status' = 'PAID', v_j::text);
  v_j := public.get_payment_order_status(oc);
  perform pg_temp.chk('11c đơn mã trùng: needsReview = true', (v_j->>'needsReview')::boolean, v_j::text);
  v_j := public.get_payment_order_status(od);
  perform pg_temp.chk('11d đơn admin cộng: paidByReview = true', (v_j->>'paidByReview')::boolean, v_j::text);
  v_j := public.get_payment_order_status(oh);
  perform pg_temp.chk('11e đơn cũ (cộng tự động trước 0027) + dòng thêm được cộng: paidByReview = true',
    (v_j->>'paidByReview')::boolean, v_j::text);
  perform pg_temp.as_user(adm, true);

  -- 12 Xoá người dùng có lịch sử tiền → chặn; tài khoản mới → xoá được.
  perform pg_temp.chk('12a _user_has_money_history: w1 có, w3 không',
    public._user_has_money_history(w1) and not public._user_has_money_history(w3), 'ok');
  begin
    delete from auth.users where id = w1;
    perform pg_temp.chk('12b xoá auth user có ví → USER_HAS_MONEY_HISTORY', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('12b xoá auth user có ví → USER_HAS_MONEY_HISTORY',
      sqlerrm = 'USER_HAS_MONEY_HISTORY' and exists (select 1 from public.users where id = w1), sqlerrm);
  end;
  -- (review M3) Chỉ có một đơn nạp đã huỷ (chưa có tiền) → vẫn chặn xoá.
  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref)
    values (base + 20, w2, 10000, 'CANCELLED', 'LINK-W2');
  begin
    delete from auth.users where id = w2;
    perform pg_temp.chk('12d chỉ có đơn nạp đã huỷ → vẫn chặn xoá', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('12d chỉ có đơn nạp đã huỷ → vẫn chặn xoá', sqlerrm = 'USER_HAS_MONEY_HISTORY', sqlerrm);
  end;
  delete from auth.users where id = w3;
  perform pg_temp.chk('12c xoá tài khoản chưa có tiền → được (cascade public.users)',
    not exists (select 1 from public.users where id = w3), 'ok');

  -- 13 Quyền hàm.
  perform pg_temp.chk('13 quyền: webhook RPC chỉ service_role; bản integer đã bỏ; hàm nội bộ không cho client',
    to_regprocedure('public.credit_wallet_from_payos(bigint, integer, text, text)') is null
    and not has_function_privilege('authenticated', 'public.credit_wallet_from_payos(bigint, numeric, text, text)', 'execute')
    and not has_function_privilege('anon', 'public.credit_wallet_from_payos(bigint, numeric, text, text)', 'execute')
    and has_function_privilege('service_role', 'public.credit_wallet_from_payos(bigint, numeric, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public._user_has_money_history(uuid)', 'execute')
    and has_function_privilege('service_role', 'public._user_has_money_history(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public._payment_review_duplicate_suspect(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public._payos_txn_lock(text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_resolve_payment_review(uuid, boolean, text)', 'execute')
    and not has_function_privilege('anon', 'public.admin_resolve_payment_review(uuid, boolean, text)', 'execute'),
    'ok');

  -- 14 Bảo toàn tiền: tổng ví tăng = két tăng = 50.000 tự động + 40.001 + 1.234 tay.
  v_total_after := pg_temp.bal(w1) + pg_temp.bal(w2) + pg_temp.bal(adm);
  perform pg_temp.chk('14 tổng ví tăng = két tăng = 91.235',
    v_total_after - v_total_before = pg_temp.bank() - v_k0
    and v_total_after - v_total_before = 50000 + 40001 + 1234,
    (v_total_after - v_total_before)::text || ' / ' || (pg_temp.bank() - v_k0)::text);

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
