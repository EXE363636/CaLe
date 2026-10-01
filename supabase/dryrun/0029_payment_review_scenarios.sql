-- =============================================================================
-- Chạy thử 0029 (admin xử giao dịch nạp bị đánh dấu) trên DB thật — KHÔNG ghi gì lại.
--
-- Cách chạy: bash supabase/dryrun/run-0029.sh (ghép timeout + begin + migration
-- + file này + rollback). File kết thúc bằng raise exception "DRYRUN_RESULT"
-- mang bảng kết quả → transaction luôn rollback. Mọi dòng phải "ok".
--
-- Tài khoản / đơn nạp GIẢ (order_code 9_9xx_xxx_xxx), gọi webhook RPC trực tiếp
-- (vai trò chạy script ≈ service_role), giả lập người gọi bằng request.jwt.claims.
-- Thưởng nạp ví được BẬT trong transaction để kiểm "cộng tay không thưởng".
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
create or replace function pg_temp.promo(p_uid uuid) returns int language sql as $$
  select coalesce((select promo_balance from public.wallets where user_id = p_uid), 0);
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
create or replace function pg_temp.item_id_amt(p_order bigint, p_amt int) returns uuid language sql as $$
  select r.id from public.payment_review_items r
    join public.payment_orders o on o.id = r.order_id
   where o.order_code = p_order and r.txn_ref is null and r.paid_amount is not distinct from p_amt
   limit 1;
$$;

do $dry$
declare
  w1  uuid := gen_random_uuid();   -- worker nạp
  e1  uuid := gen_random_uuid();   -- NTD nạp (có thưởng nạp ví)
  w2  uuid := gen_random_uuid();   -- người khác (kiểm NOT_OWNER)
  adm uuid := gen_random_uuid();
  u uuid;
  base bigint := 9900000000 + (floor(random() * 90000000))::bigint * 10;
  oa bigint := base + 1; ob bigint := base + 2; oc bigint := base + 3;
  od bigint := base + 4; oe bigint := base + 5; of_ bigint := base + 6; og bigint := base + 7;
  oj bigint := base + 10; ok_ bigint := base + 11;
  v_j jsonb; v_err text; v_n int; v_b0 int; v_p0 int; v_k0 bigint; v_k1 bigint; v_s text;
  v_total_before bigint; v_total_after bigint;
begin
  -- ---------- Tài khoản giả ----------
  foreach u in array array[w1, w2] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'dryrun-' || u || '@example.invalid',
              jsonb_build_object('role', 'worker', 'full_name', 'Dry ' || left(u::text, 4)),
              jsonb_build_object('provider', 'email'), now(), now());
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
  insert into public.users (id, role, email) values (adm, 'admin', 'dryrun-' || adm || '@example.invalid')
    on conflict (id) do nothing;

  -- Thưởng nạp ví BẬT (chỉ trong transaction): nạp ≥ 0 được +100.000, tối đa 5 lần.
  update public.platform_settings
     set topup_bonus_amount = 100000, topup_bonus_min = 0, topup_bonus_max_per_user = 5 where id;

  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref) values
    (oa, w1, 50000, 'PENDING', 'LINK-A'),
    (ob, e1, 50000, 'PENDING', 'LINK-B'),
    (oc, w1, 30000, 'PENDING', 'LINK-C'),
    (od, w1, 40000, 'PENDING', 'LINK-D'),
    (oe, adm, 20000, 'PENDING', 'LINK-E'),
    (of_, e1, 50000, 'PENDING', 'LINK-F'),
    (og, w1, 10000, 'PENDING', 'LINK-G'),
    (oj, w1, 15000, 'PENDING', 'LINK-J'),
    (ok_, w1, 25000, 'PENDING', 'LINK-K');

  v_total_before := pg_temp.bal(w1) + pg_temp.bal(e1) + pg_temp.bal(w2) + pg_temp.bal(adm);
  v_k0 := pg_temp.bank();

  -- 01 Giao dịch khớp → cộng tự động, không có dòng kiểm tra.
  v_j := public.credit_wallet_from_payos(oa, 50000, 'DRY-RA1', 'LINK-A');
  perform pg_temp.chk('01 khớp → PAID, ví +50.000, 0 dòng',
    v_j->>'status' = 'PAID' and pg_temp.bal(w1) = 50000 and pg_temp.items(oa) = 0, v_j::text);

  -- 02 PayOS gửi lại → ALREADY_PAID.
  v_j := public.credit_wallet_from_payos(oa, 50000, 'DRY-RA1', 'LINK-A');
  perform pg_temp.chk('02 gửi lại → ALREADY_PAID, ví giữ nguyên',
    v_j->>'status' = 'ALREADY_PAID' and pg_temp.bal(w1) = 50000 and pg_temp.items(oa) = 0, v_j::text);

  -- 03 Chuyển thêm lần hai → EXTRA_PAYMENT, 1 dòng, không cộng.
  v_j := public.credit_wallet_from_payos(oa, 20000, 'DRY-RA2', 'LINK-A');
  perform pg_temp.chk('03 chuyển thêm → EXTRA_PAYMENT, 1 dòng, ví giữ nguyên',
    v_j->>'reason' = 'EXTRA_PAYMENT' and pg_temp.items(oa) = 1 and pg_temp.bal(w1) = 50000
    and (select paid_amount from public.payment_review_items where id = pg_temp.item_id(oa, 'DRY-RA2')) = 20000,
    v_j::text);

  -- 04 Gửi lại giao dịch thừa → ALREADY_RECORDED, vẫn 1 dòng.
  v_j := public.credit_wallet_from_payos(oa, 20000, 'DRY-RA2', 'LINK-A');
  perform pg_temp.chk('04 gửi lại giao dịch thừa → không thêm dòng',
    v_j->>'reason' = 'ALREADY_RECORDED' and pg_temp.items(oa) = 1, v_j::text);

  -- 05 Lệch số tiền → AMOUNT_MISMATCH, không cộng, không thưởng.
  v_j := public.credit_wallet_from_payos(ob, 49000, 'DRY-RB1', 'LINK-B');
  perform pg_temp.chk('05 lệch số tiền → AMOUNT_MISMATCH, 1 dòng, ví 0',
    v_j->>'reason' = 'AMOUNT_MISMATCH' and pg_temp.items(ob) = 1
    and pg_temp.bal(e1) = 0 and pg_temp.promo(e1) = 0, v_j::text);

  -- 06 Sau đó chuyển đúng số → ALREADY_FLAGGED, dòng thứ 2.
  v_j := public.credit_wallet_from_payos(ob, 50000, 'DRY-RB2', 'LINK-B');
  perform pg_temp.chk('06 chuyển đúng sau khi lệch → ALREADY_FLAGGED, 2 dòng',
    v_j->>'reason' = 'ALREADY_FLAGGED' and pg_temp.items(ob) = 2 and pg_temp.bal(e1) = 0, v_j::text);

  -- 07 Không mã giao dịch → MISSING_REFERENCE; gửi lại y hệt không thêm dòng.
  v_j := public.credit_wallet_from_payos(oc, 30000, '', 'LINK-C');
  perform public.credit_wallet_from_payos(oc, 30000, null, 'LINK-C');
  perform pg_temp.chk('07 không mã → MISSING_REFERENCE; gửi lại không nhân đôi',
    v_j->>'reason' = 'MISSING_REFERENCE' and pg_temp.items(oc) = 1, v_j::text);

  -- 08 Người nạp thấy "đang kiểm tra"; người khác không đọc được đơn.
  perform pg_temp.as_user(e1);
  v_j := public.get_payment_order_status(ob);
  perform pg_temp.chk('08a chủ đơn: needsReview = true',
    (v_j->>'needsReview')::boolean and v_j->>'status' = 'PENDING', v_j::text);
  perform pg_temp.as_user(w1);
  v_j := public.get_payment_order_status(oa);
  perform pg_temp.chk('08b đơn PAID có giao dịch thừa chờ xử: needsReview = true',
    (v_j->>'needsReview')::boolean and v_j->>'status' = 'PAID', v_j::text);
  perform pg_temp.as_user(w2);
  begin
    perform public.get_payment_order_status(ob);
    perform pg_temp.chk('08c người khác → NOT_OWNER', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('08c người khác → NOT_OWNER', sqlerrm = 'NOT_OWNER', sqlerrm);
  end;

  -- 09 get_my_payment_reviews chỉ trả dòng của mình.
  perform pg_temp.as_user(e1);
  select count(*) into v_n from public.get_my_payment_reviews();
  perform pg_temp.chk('09a NTD thấy đúng 2 dòng của mình', v_n = 2, v_n::text);
  perform pg_temp.as_user(w2);
  select count(*) into v_n from public.get_my_payment_reviews();
  perform pg_temp.chk('09b người khác thấy 0 dòng', v_n = 0, v_n::text);

  -- 10 Không phải admin → FORBIDDEN (list + resolve).
  perform pg_temp.as_user(w2);
  begin
    perform * from public.admin_list_payment_reviews();
    perform pg_temp.chk('10a list không phải admin → FORBIDDEN', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('10a list không phải admin → FORBIDDEN', sqlerrm = 'FORBIDDEN', sqlerrm);
  end;
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(ob, 'DRY-RB1'), true, 'thử');
    perform pg_temp.chk('10b resolve không phải admin → FORBIDDEN', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('10b resolve không phải admin → FORBIDDEN', sqlerrm = 'FORBIDDEN', sqlerrm);
  end;

  -- 11 Admin: ghi chú rỗng → REASON_REQUIRED; trạng thái lạ → INVALID_INPUT.
  perform pg_temp.as_user(adm, true);
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(ob, 'DRY-RB1'), true, '   ');
    perform pg_temp.chk('11a ghi chú rỗng → REASON_REQUIRED', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('11a ghi chú rỗng → REASON_REQUIRED', sqlerrm = 'REASON_REQUIRED', sqlerrm);
  end;
  begin
    perform * from public.admin_list_payment_reviews('Bogus');
    perform pg_temp.chk('11b trạng thái lạ → INVALID_INPUT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('11b trạng thái lạ → INVALID_INPUT', sqlerrm = 'INVALID_INPUT', sqlerrm);
  end;
  select count(*) into v_n from public.admin_list_payment_reviews() l
   where l.order_code in (oa, ob, oc);
  perform pg_temp.chk('11c admin thấy 4 dòng chờ của 3 đơn', v_n = 4, v_n::text);

  -- 12 Cộng tay đúng SỐ TIỀN THỰC NHẬN, không thưởng (dù thưởng đang bật).
  v_b0 := pg_temp.bal(e1); v_p0 := pg_temp.promo(e1); v_k1 := pg_temp.bank();
  v_j := public.admin_resolve_payment_review(pg_temp.item_id(ob, 'DRY-RB1'), true, 'Đã đối chiếu PayOS');
  select status into v_s from public.payment_orders where order_code = ob;
  perform pg_temp.chk('12 cộng tay: ví +49.000, túi thưởng 0, két +49.000, đơn PAID, cờ giữ',
    v_j->>'status' = 'Credited' and pg_temp.bal(e1) = v_b0 + 49000 and pg_temp.promo(e1) = v_p0
    and pg_temp.bank() = v_k1 + 49000 and v_s = 'PAID'
    and (select needs_review from public.payment_orders where order_code = ob)
    and exists (select 1 from public.wallet_ledger where user_id = e1 and kind = 'UserTopUp' and amount = 49000
                 and note = 'Nạp tiền qua PayOS (quản trị viên đã kiểm tra) #' || ob),
    v_j::text);

  -- 13 Cộng lần hai → ALREADY_REVIEWED.
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(ob, 'DRY-RB1'), true, 'lần hai');
    perform pg_temp.chk('13 cộng lần hai → ALREADY_REVIEWED', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('13 cộng lần hai → ALREADY_REVIEWED', sqlerrm = 'ALREADY_REVIEWED', sqlerrm);
  end;

  -- 14 Bỏ qua → không cộng gì.
  v_b0 := pg_temp.bal(e1); v_k1 := pg_temp.bank();
  v_j := public.admin_resolve_payment_review(pg_temp.item_id(ob, 'DRY-RB2'), false, 'Đã hoàn tay cho người chuyển');
  perform pg_temp.chk('14 bỏ qua: ví và két giữ nguyên, dòng Dismissed',
    v_j->>'status' = 'Dismissed' and pg_temp.bal(e1) = v_b0 and pg_temp.bank() = v_k1
    and (select status from public.payment_review_items where id = pg_temp.item_id(ob, 'DRY-RB2')) = 'Dismissed',
    v_j::text);

  -- 15 Đơn admin đã cộng: gửi lại giao dịch cũ không đổi gì; giao dịch MỚI vẫn thành dòng.
  v_j := public.credit_wallet_from_payos(ob, 49000, 'DRY-RB1', 'LINK-B');
  perform pg_temp.chk('15a gửi lại giao dịch đã cộng → ALREADY_PAID',
    v_j->>'status' = 'ALREADY_PAID' and pg_temp.items(ob) = 2, v_j::text);
  v_j := public.credit_wallet_from_payos(ob, 50000, 'DRY-RB2', 'LINK-B');
  perform pg_temp.chk('15b gửi lại giao dịch đã bỏ qua → không thêm dòng',
    v_j->>'reason' = 'ALREADY_RECORDED' and pg_temp.items(ob) = 2, v_j::text);
  v_j := public.credit_wallet_from_payos(ob, 5000, 'DRY-RB3', 'LINK-B');
  perform pg_temp.chk('15c giao dịch mới → EXTRA_PAYMENT, dòng thứ 3',
    v_j->>'reason' = 'EXTRA_PAYMENT' and pg_temp.items(ob) = 3, v_j::text);

  -- 16 Không mã: cộng 1 lần được; dòng không mã khác của cùng đơn → DUPLICATE_SUSPECT.
  v_b0 := pg_temp.bal(w1);
  perform public.admin_resolve_payment_review(pg_temp.item_id_amt(oc, 30000), true, 'Khớp sao kê');
  perform pg_temp.chk('16a cộng dòng không mã → ví +30.000', pg_temp.bal(w1) = v_b0 + 30000, pg_temp.bal(w1)::text);
  -- Đơn C đã PAID nhưng chưa gắn mã + đã đánh dấu → giao dịch không mã mới KHÔNG bị nuốt.
  v_j := public.credit_wallet_from_payos(oc, 31000, null, 'LINK-C');
  perform pg_temp.chk('16b đơn PAID không mã + đã đánh dấu: giao dịch mới vẫn có dòng',
    v_j->>'reason' = 'EXTRA_PAYMENT' and pg_temp.items(oc) = 2, v_j::text);
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id_amt(oc, 31000), true, 'thử');
    perform pg_temp.chk('16c cộng dòng không mã thứ hai → DUPLICATE_SUSPECT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('16c cộng dòng không mã thứ hai → DUPLICATE_SUSPECT', sqlerrm = 'DUPLICATE_SUSPECT', sqlerrm);
  end;
  select l.duplicate_suspect into v_s from public.admin_list_payment_reviews() l
   where l.id = pg_temp.item_id_amt(oc, 31000);
  perform pg_temp.chk('16d danh sách admin báo duplicate_suspect', v_s = 'true', coalesce(v_s, 'null'));

  -- 17 Không biết số tiền → NOTHING_TO_CREDIT; bỏ qua vẫn được.
  perform public.credit_wallet_from_payos(od, null, 'DRY-RD1', 'LINK-D');
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(od, 'DRY-RD1'), true, 'thử');
    perform pg_temp.chk('17a số tiền null → NOTHING_TO_CREDIT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('17a số tiền null → NOTHING_TO_CREDIT', sqlerrm = 'NOTHING_TO_CREDIT', sqlerrm);
  end;
  v_j := public.admin_resolve_payment_review(pg_temp.item_id(od, 'DRY-RD1'), false, 'Không xác định được số tiền');
  perform pg_temp.chk('17b bỏ qua dòng số tiền null', v_j->>'status' = 'Dismissed', v_j::text);

  -- 18 Lối cũ vẫn bị chặn với đơn đã đánh dấu chưa PAID.
  begin
    perform public.credit_wallet_from_payment(od);
    perform pg_temp.chk('18 credit_wallet_from_payment đơn đã đánh dấu → ORDER_NEEDS_REVIEW', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('18 credit_wallet_from_payment đơn đã đánh dấu → ORDER_NEEDS_REVIEW',
      sqlerrm = 'ORDER_NEEDS_REVIEW', sqlerrm);
  end;

  -- 19 Admin không xử đơn của chính mình.
  perform public.credit_wallet_from_payos(oe, 1, 'DRY-RE1', 'LINK-E');
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(oe, 'DRY-RE1'), true, 'tự cộng');
    perform pg_temp.chk('19 admin tự xử đơn mình → FORBIDDEN', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('19 admin tự xử đơn mình → FORBIDDEN', sqlerrm = 'FORBIDDEN', sqlerrm);
  end;

  -- 20 Đối chứng: thưởng nạp ví đang bật thật (đơn khớp tự động của NTD có thưởng).
  v_p0 := pg_temp.promo(e1);
  v_j := public.credit_wallet_from_payos(of_, 50000, 'DRY-RF1', 'LINK-F');
  perform pg_temp.chk('20 đối chứng: đơn khớp của NTD có thưởng +100.000',
    (v_j->>'bonus')::int = 100000 and pg_temp.promo(e1) = v_p0 + 100000, v_j::text);

  -- 21 Sai payment link → LINK_MISMATCH; hết hạn → ORDER_NOT_PAYABLE.
  v_j := public.credit_wallet_from_payos(og, 10000, 'DRY-RG1', 'LINK-OTHER');
  perform pg_temp.chk('21a sai link → LINK_MISMATCH', v_j->>'reason' = 'LINK_MISMATCH', v_j::text);
  update public.payment_orders set status = 'EXPIRED', needs_review = false, review_reason = null,
         paid_amount = null, provider_txn_ref = null where order_code = og;
  delete from public.payment_review_items r using public.payment_orders o
   where o.id = r.order_id and o.order_code = og;
  v_j := public.credit_wallet_from_payos(og, 10000, 'DRY-RG2', 'LINK-G');
  perform pg_temp.chk('21b đơn hết hạn → ORDER_NOT_PAYABLE, có dòng',
    v_j->>'reason' = 'ORDER_NOT_PAYABLE' and pg_temp.items(og) = 1, v_j::text);
  v_b0 := pg_temp.bal(w1);
  perform public.admin_resolve_payment_review(pg_temp.item_id(og, 'DRY-RG2'), true, 'Tiền đã về');
  perform pg_temp.chk('21c cộng tay đơn hết hạn → ví +10.000, đơn PAID',
    pg_temp.bal(w1) = v_b0 + 10000
    and (select status from public.payment_orders where order_code = og) = 'PAID', pg_temp.bal(w1)::text);

  -- 25 (review M1) Đơn đã cộng TỰ ĐỘNG, PayOS gửi lại thiếu mã → dòng không mã cùng số → nghi trùng.
  perform public.credit_wallet_from_payos(oj, 15000, 'DRY-RJ1', 'LINK-J');
  v_j := public.credit_wallet_from_payos(oj, 15000, null, 'LINK-J');
  select l.duplicate_suspect into v_s from public.admin_list_payment_reviews() l
   where l.id = pg_temp.item_id_amt(oj, 15000);
  perform pg_temp.chk('25a gửi lại thiếu mã sau khi cộng tự động → có dòng, list báo nghi trùng',
    v_j->>'reason' = 'EXTRA_PAYMENT' and pg_temp.items(oj) = 1 and v_s = 'true', v_j::text || ' / ' || coalesce(v_s, 'null'));
  v_b0 := pg_temp.bal(w1);
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id_amt(oj, 15000), true, 'thử');
    perform pg_temp.chk('25b cộng dòng đó → DUPLICATE_SUSPECT, ví giữ nguyên', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('25b cộng dòng đó → DUPLICATE_SUSPECT, ví giữ nguyên',
      sqlerrm = 'DUPLICATE_SUSPECT' and pg_temp.bal(w1) = v_b0, sqlerrm);
  end;
  -- Gửi thêm khác số tiền (thiếu mã) → KHÔNG nghi trùng với lần cộng tự động.
  perform public.credit_wallet_from_payos(oj, 7000, null, 'LINK-J');
  select l.duplicate_suspect into v_s from public.admin_list_payment_reviews() l
   where l.id = pg_temp.item_id_amt(oj, 7000);
  perform pg_temp.chk('25c thiếu mã nhưng khác số tiền → không nghi trùng', v_s = 'false', coalesce(v_s, 'null'));

  -- 26 (review M1 biến thể) Dòng có mã lệch + dòng không mã cùng số: cộng 1 thì dòng kia bị chặn.
  perform public.credit_wallet_from_payos(ok_, 24000, 'DRY-RK1', 'LINK-K');
  perform public.credit_wallet_from_payos(ok_, 24000, null, 'LINK-K');
  perform public.admin_resolve_payment_review(pg_temp.item_id_amt(ok_, 24000), true, 'Khớp sao kê');
  begin
    perform public.admin_resolve_payment_review(pg_temp.item_id(ok_, 'DRY-RK1'), true, 'thử');
    perform pg_temp.chk('26 dòng có mã cùng số với dòng không mã đã cộng → DUPLICATE_SUSPECT', false, 'không lỗi');
  exception when others then
    perform pg_temp.chk('26 dòng có mã cùng số với dòng không mã đã cộng → DUPLICATE_SUSPECT',
      sqlerrm = 'DUPLICATE_SUSPECT', sqlerrm);
  end;

  -- 27 (review L2/L3) reviewed: đơn chỉ có dòng đã bỏ qua → needsReview false, reviewed true.
  perform pg_temp.as_user(w1);
  v_j := public.get_payment_order_status(od);
  perform pg_temp.chk('27a đơn bị bỏ qua: PENDING, needsReview=false, reviewed=true',
    v_j->>'status' = 'PENDING' and not (v_j->>'needsReview')::boolean and (v_j->>'reviewed')::boolean, v_j::text);
  v_j := public.get_payment_order_status(og);
  perform pg_temp.chk('27b đơn admin đã cộng: PAID, reviewed=true, paidByReview=true',
    v_j->>'status' = 'PAID' and (v_j->>'reviewed')::boolean and (v_j->>'paidByReview')::boolean, v_j::text);
  v_j := public.get_payment_order_status(oa);
  perform pg_temp.chk('27d đơn cộng tự động rồi có giao dịch thừa: reviewed=true, paidByReview=false',
    v_j->>'status' = 'PAID' and (v_j->>'reviewed')::boolean and not (v_j->>'paidByReview')::boolean, v_j::text);
  v_j := public.get_payment_order_status(oc);
  perform pg_temp.chk('27e đơn không mã được admin cộng: paidByReview=true',
    v_j->>'status' = 'PAID' and (v_j->>'paidByReview')::boolean, v_j::text);
  perform pg_temp.as_user(e1);
  v_j := public.get_payment_order_status(of_);
  perform pg_temp.chk('27c đơn khớp tự động: reviewed=false, paidByReview=false',
    v_j->>'status' = 'PAID' and not (v_j->>'reviewed')::boolean and not (v_j->>'paidByReview')::boolean, v_j::text);
  perform pg_temp.as_user(adm, true);

  -- 22 Bảo toàn tiền: tổng ví tăng = két tăng − (không có gì khác) ; thưởng ở túi riêng.
  v_total_after := pg_temp.bal(w1) + pg_temp.bal(e1) + pg_temp.bal(w2) + pg_temp.bal(adm);
  perform pg_temp.chk('22 tổng ví tăng = két tăng (50k+50k+15k tự động + 49k+30k+10k+24k tay)',
    v_total_after - v_total_before = pg_temp.bank() - v_k0
    and v_total_after - v_total_before = 50000 + 50000 + 49000 + 30000 + 10000 + 15000 + 24000,
    (v_total_after - v_total_before)::text || ' / ' || (pg_temp.bank() - v_k0)::text);

  -- 23 Client không đọc/ghi thẳng bảng.
  perform pg_temp.chk('23 anon/authenticated không có quyền bảng',
    not has_table_privilege('authenticated', 'public.payment_review_items', 'select')
    and not has_table_privilege('anon', 'public.payment_review_items', 'select')
    and not has_table_privilege('authenticated', 'public.payment_review_items', 'insert'),
    'ok');

  -- 24 Backfill (câu lệnh trong migration) tách đúng review_reason cũ, bỏ trùng.
  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref, needs_review, review_reason)
    values (base + 8, w1, 70000, 'PENDING', 'LINK-H', true,
      'AMOUNT_MISMATCH paid=69000 ref=DRY-RH1 | ALREADY_FLAGGED paid=70000 ref=DRY-RH2 | ALREADY_FLAGGED paid=70000 ref=DRY-RH2 | MISSING_REFERENCE paid=null ref=- | rác');
  insert into public.payment_review_items (order_id, user_id, reason, paid_amount, txn_ref, created_at)
  select distinct on (o.id, coalesce(nullif(m[3], '-'), '#' || m[2]))
         o.id, o.user_id, m[1], nullif(m[2], 'null')::integer, nullif(m[3], '-'), o.updated_at
    from public.payment_orders o
    cross join lateral regexp_split_to_table(o.review_reason, ' \| ') with ordinality as p(part, ord)
    cross join lateral regexp_match(btrim(p.part), '^([A-Z_]+) paid=(null|\d{1,9}) ref=(\S+)$') as m
   where o.needs_review
     and m is not null
     and m[1] in ('AMOUNT_MISMATCH','MISSING_REFERENCE','LINK_MISMATCH',
                  'ORDER_NOT_PAYABLE','EXTRA_PAYMENT','ALREADY_FLAGGED')
     and not exists (select 1 from public.payment_review_items r where r.order_id = o.id)
   order by o.id, coalesce(nullif(m[3], '-'), '#' || m[2]), p.ord;
  perform pg_temp.chk('24 backfill: 3 dòng (bỏ trùng + rác), số tiền đúng',
    pg_temp.items(base + 8) = 3
    and (select paid_amount from public.payment_review_items where id = pg_temp.item_id(base + 8, 'DRY-RH1')) = 69000
    and (select paid_amount from public.payment_review_items where id = pg_temp.item_id(base + 8, null)) is null,
    pg_temp.items(base + 8)::text);

  -- 28 (review L1) Còn đơn needs_review không tách được dòng → khối kiểm của migration báo lỗi.
  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref, needs_review, review_reason)
    values (base + 9, w1, 70000, 'PENDING', 'LINK-I', true, 'ghi tay không đúng định dạng');
  begin
    declare v_codes text;
    begin
      select string_agg(o.order_code::text, ', ') into v_codes
        from public.payment_orders o
       where o.needs_review
         and not exists (select 1 from public.payment_review_items r where r.order_id = o.id);
      if v_codes is not null then
        raise exception 'PAYMENT_REVIEW_BACKFILL_INCOMPLETE: %', v_codes;
      end if;
      perform pg_temp.chk('28 backfill thiếu → migration dừng', false, 'không lỗi');
    end;
  exception when others then
    perform pg_temp.chk('28 backfill thiếu → migration dừng',
      sqlerrm like 'PAYMENT_REVIEW_BACKFILL_INCOMPLETE: %' || (base + 9)::text || '%', sqlerrm);
  end;

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
