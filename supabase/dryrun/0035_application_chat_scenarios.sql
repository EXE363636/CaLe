-- =============================================================================
-- Chạy thử 0035 (chat theo đơn ứng tuyển) trên DB thật — KHÔNG ghi gì lại.
--
-- Cách chạy: bash supabase/dryrun/run-0035.sh (begin + timeout + 0035 + file này +
-- rollback). Kết thúc bằng raise exception "DRYRUN_RESULT" → transaction luôn
-- rollback. Mọi dòng phải "ok". Ca / đơn giả chèn thẳng.
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

create or replace function pg_temp.mk_user(p_uid uuid, p_role text) returns void language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (p_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || p_uid || '@example.invalid',
            case p_role when 'worker' then jsonb_build_object('role', 'worker', 'full_name', 'Dry Worker')
                        when 'employer' then jsonb_build_object('role', 'employer', 'company_name', 'Dry Quán')
                        else '{}'::jsonb end,
            case when p_role = 'admin' then jsonb_build_object('provider', 'google', 'role', 'admin')
                 else jsonb_build_object('provider', 'email') end, now(), now());
  if p_role = 'admin' then
    insert into public.users (id, role, email) values (p_uid, 'admin', 'dryrun-' || p_uid || '@example.invalid')
      on conflict (id) do update set role = 'admin';
  end if;
end; $$;

create or replace function pg_temp.mk_shift(p_emp uuid, p_key text, p_date date) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.shifts (employer_id, client_request_id, title, job_type, location, date, start_time, end_time,
                             hourly_wage, positions_total, status, escrow_status)
    values (p_emp, 'dry35-' || p_key, 'Dry 0035 ' || p_key, 'Other', 'HCM', p_date, '08:00', '12:00',
            30000, 3, 'Published', 'Deposited')
    returning id into v_id;
  return v_id;
end; $$;

create or replace function pg_temp.mk_app(p_shift uuid, p_worker uuid, p_status text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.applications (shift_id, worker_id, status, approved_at)
    values (p_shift, p_worker, p_status, case when p_status <> 'Pending' then now() end)
    returning id into v_id;
  return v_id;
end; $$;

create or replace function pg_temp.notif(p_uid uuid, p_app uuid) returns text language sql as $$
  select coalesce((select count(*)::text || case when bool_or(read_at is null) then ' unread' else ' read' end
                     from public.user_notifications
                    where user_id = p_uid and kind = 'ChatMessage' and dedupe_key = 'chat:' || p_app), '0');
$$;

do $dry$
declare
  e1 uuid := gen_random_uuid(); e2 uuid := gen_random_uuid();
  w1 uuid := gen_random_uuid(); w2 uuid := gen_random_uuid();
  adm uuid := gen_random_uuid();
  d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  ss uuid; so uuid; aa uuid; ap uuid; ab uuid;
  m_w uuid; m_e uuid;
  v_err text; v_n int; v_t record; v_ok int; v_all int; v_txt text := ''; r record; i int;
begin
  perform pg_temp.mk_user(e1, 'employer'); perform pg_temp.mk_user(e2, 'employer');
  perform pg_temp.mk_user(w1, 'worker'); perform pg_temp.mk_user(w2, 'worker');
  perform pg_temp.mk_user(adm, 'admin');

  ss := pg_temp.mk_shift(e1, 's', d + 3);
  aa := pg_temp.mk_app(ss, w1, 'Approved');
  ap := pg_temp.mk_app(ss, w2, 'Pending');
  so := pg_temp.mk_shift(e1, 'o', d - 10);
  ab := pg_temp.mk_app(so, w1, 'Confirmed');

  -- ---------- 01. Người lao động gửi tin, NTD được báo ----------
  perform pg_temp.as_user(w1);
  select t.id into m_w from public.send_chat_message(aa, E'\n  Em chào anh, mai em tới sớm 15 phút ạ \t\n') t;
  perform pg_temp.chk('01a gửi được, đã cắt khoảng trắng / xuống dòng hai đầu',
    (select body from public.chat_messages where id = m_w) = 'Em chào anh, mai em tới sớm 15 phút ạ', '');
  perform pg_temp.chk('01b NTD có 1 thông báo ChatMessage chưa đọc', pg_temp.notif(e1, aa) = '1 unread', pg_temp.notif(e1, aa));

  -- ---------- 02. NTD đọc danh sách + tin ----------
  perform pg_temp.as_user(e1);
  select * into v_t from public.get_chat_threads() t where t.application_id = aa;
  perform pg_temp.chk('02a danh sách: có cuộc trò chuyện, 1 chưa đọc, đang mở, vai trò employer',
    v_t.unread = 1 and v_t.access = 'open' and v_t.my_role = 'employer' and v_t.other_user_id = w1,
    coalesce(v_t::text, '(none)'));
  select count(*) into v_n from public.get_chat_messages(aa);
  perform pg_temp.chk('02b NTD đọc được 1 tin', v_n = 1, v_n::text);

  -- ---------- 03. Trả lời + gộp thông báo ----------
  select t.id into m_e from public.send_chat_message(aa, 'Ok em, nhớ mặc áo trắng nhé') t;
  perform pg_temp.chk('03a người lao động được báo', pg_temp.notif(w1, aa) = '1 unread', pg_temp.notif(w1, aa));
  perform pg_temp.as_user(e1);
  perform public.mark_chat_read(aa);
  perform pg_temp.chk('03b NTD đọc → thông báo đã đọc', pg_temp.notif(e1, aa) = '1 read', pg_temp.notif(e1, aa));
  perform pg_temp.as_user(w1);
  perform public.send_chat_message(aa, 'Dạ vâng');
  perform pg_temp.chk('03c tin mới → VẪN một dòng thông báo, mở lại chưa đọc', pg_temp.notif(e1, aa) = '1 unread', pg_temp.notif(e1, aa));
  perform pg_temp.as_user(e1);
  select * into v_t from public.get_chat_threads() t where t.application_id = aa;
  perform pg_temp.chk('03d số chưa đọc chỉ đếm tin của người kia sau lần đọc cuối', v_t.unread = 1, v_t.unread::text);

  -- ---------- 04. Người ngoài ----------
  perform pg_temp.as_user(w2);
  begin perform public.get_chat_messages(aa); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04a người lao động khác đọc → CHAT_NOT_AVAILABLE', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  begin perform public.send_chat_message(aa, 'hi'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04b người lao động khác gửi → CHAT_NOT_AVAILABLE', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  perform pg_temp.as_user(e2);
  begin perform public.get_chat_messages(aa); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04c NTD khác đọc → CHAT_NOT_AVAILABLE', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  perform set_config('request.jwt.claims', '', true);
  begin perform public.get_chat_threads(); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('04d chưa đăng nhập → NOT_AUTHENTICATED', v_err = 'NOT_AUTHENTICATED', v_err);

  -- ---------- 05. Đơn chưa duyệt / ca đã qua 7 ngày ----------
  perform pg_temp.as_user(w2);
  begin perform public.send_chat_message(ap, 'cho em hỏi'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('05a đơn Chờ duyệt → CHAT_CLOSED', v_err = 'CHAT_CLOSED', v_err);
  begin perform public.get_chat_messages(ap); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('05b đơn Chờ duyệt không có cuộc trò chuyện → CHAT_NOT_AVAILABLE', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  perform pg_temp.as_user(w1);
  begin perform public.send_chat_message(ab, 'anh ơi'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('05c ca kết thúc quá 7 ngày → CHAT_CLOSED (chỉ đọc)', v_err = 'CHAT_CLOSED', v_err);
  begin perform public.get_chat_messages(ab); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('05d … nhưng vẫn đọc được lịch sử', v_err = 'no error', v_err);

  -- ---------- 06. Kiểm nội dung ----------
  begin perform public.send_chat_message(aa, '   '); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('06a chỉ khoảng trắng → CHAT_EMPTY', v_err = 'CHAT_EMPTY', v_err);
  begin perform public.send_chat_message(aa, E'\n\t ' || chr(8203) || chr(65279) || E'\n'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('06c chỉ xuống dòng / tab / ký tự vô hình → CHAT_EMPTY', v_err = 'CHAT_EMPTY', v_err);
  begin perform public.send_chat_message(aa, repeat('a', 1001)); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('06b 1001 ký tự → CHAT_TOO_LONG', v_err = 'CHAT_TOO_LONG', v_err);

  -- ---------- 07. Giới hạn 20 tin / phút ----------
  for i in 1..18 loop perform public.send_chat_message(aa, 'tin ' || i); end loop;   -- w1 đã gửi 2
  begin perform public.send_chat_message(aa, 'tin 21'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('07 tin thứ 21 trong một phút → RATE_LIMITED', v_err = 'RATE_LIMITED', v_err);

  -- ---------- 08. Báo cáo + admin chỉ đọc khi có báo cáo chưa xử lý ----------
  perform pg_temp.as_user(adm, true);
  begin perform public.admin_get_chat_messages(aa); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08a admin đọc khi CHƯA có báo cáo → CHAT_NOT_AVAILABLE', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  begin perform public.get_chat_messages(aa); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08b admin KHÔNG đọc qua RPC của người dùng', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  perform pg_temp.chk('08c danh sách admin chưa có cuộc này',
    not exists (select 1 from public.admin_list_chat_reviews() t where t.application_id = aa), '');
  perform pg_temp.as_user(w1);
  begin perform public.report_chat_message(m_w, 'spam'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08d báo cáo tin của chính mình → CANNOT_REPORT_OWN', v_err = 'CANNOT_REPORT_OWN', v_err);
  begin perform public.report_chat_message(m_e, E'  \n '); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08e báo cáo không lý do → REASON_REQUIRED', v_err = 'REASON_REQUIRED', v_err);
  perform public.report_chat_message(m_e, 'Đòi chuyển khoản ngoài app');
  perform pg_temp.chk('08f người báo cáo thấy cờ đã báo cáo',
    (select t.reported from public.get_chat_messages(aa, p_limit => 100) t where t.id = m_e), '');
  perform pg_temp.as_user(e1);
  perform pg_temp.chk('08g người bị báo cáo KHÔNG thấy cờ',
    not (select t.reported from public.get_chat_messages(aa, p_limit => 100) t where t.id = m_e), '');
  perform pg_temp.as_user(adm, true);
  select count(*) into v_n from public.admin_get_chat_messages(aa, p_limit => 100);
  perform pg_temp.chk('08h có báo cáo → admin đọc được cả cuộc (21 tin) + ghi nhật ký',
    v_n = 21 and exists (select 1 from public.chat_admin_access_log l
                          where l.application_id = aa and l.admin_id = adm and l.action = 'read'), v_n::text);
  perform pg_temp.chk('08i admin thấy lý do báo cáo',
    (select t.report_reason from public.admin_get_chat_messages(aa, p_limit => 100) t where t.id = m_e) = 'Đòi chuyển khoản ngoài app', '');
  select * into v_t from public.admin_list_chat_reviews() t where t.application_id = aa;
  perform pg_temp.chk('08j danh sách admin có cuộc này, 1 báo cáo chưa xử lý',
    v_t.reported_count = 1 and v_t.unresolved_count = 1, coalesce(v_t::text, '(none)'));
  perform pg_temp.chk('08k xử lý báo cáo → 1 tin', public.admin_resolve_chat_reports(aa) = 1, '');
  begin perform public.admin_get_chat_messages(aa); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08l đã xử lý hết báo cáo → admin hết quyền đọc', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  perform pg_temp.as_user(w2, true);   -- JWT ghi admin nhưng bảng users không phải admin
  begin perform public.admin_list_chat_reviews(); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08m JWT admin giả (users không phải admin) → NOT_AUTHORIZED', v_err = 'NOT_AUTHORIZED', v_err);
  perform pg_temp.as_user(w2);
  begin perform public.admin_list_chat_reviews(); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('08n người thường gọi admin_list_chat_reviews → NOT_AUTHORIZED', v_err = 'NOT_AUTHORIZED', v_err);

  -- ---------- 09. Tài khoản bị khoá ----------
  update public.users set suspended = true where id = e1;
  perform pg_temp.as_user(e1);
  begin perform public.send_chat_message(aa, 'xin chào'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('09a tài khoản bị khoá gửi → SUSPENDED', v_err = 'SUSPENDED', v_err);
  begin perform public.get_chat_messages(aa); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('09b tài khoản bị khoá đọc → CHAT_NOT_AVAILABLE', v_err = 'CHAT_NOT_AVAILABLE', v_err);
  perform pg_temp.chk('09c tài khoản bị khoá không nghe kênh', not public._chat_topic_allowed('chat:' || aa), '');
  update public.users set suspended = false where id = e1;

  -- ---------- 10. Realtime ----------
  perform pg_temp.as_user(w1);
  perform pg_temp.chk('10a bên của đơn nghe được chat:<đơn>', public._chat_topic_allowed('chat:' || aa), '');
  perform pg_temp.as_user(w2);
  perform pg_temp.chk('10b người ngoài KHÔNG nghe được', not public._chat_topic_allowed('chat:' || aa), '');
  perform pg_temp.chk('10c topic sai dạng → false, không lỗi',
    not public._chat_topic_allowed('chat:xyz') and not public._chat_topic_allowed(null)
      and not public._chat_topic_allowed('other:' || aa), '');
  perform pg_temp.chk('10d có realtime.send (trigger phát tin được)',
    to_regprocedure('realtime.send(jsonb, text, text, boolean)') is not null, '');
  perform pg_temp.chk('10e policy realtime chat_participants_receive đã tạo',
    exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages'
                                        and policyname = 'chat_participants_receive'), '');
  select string_agg(policyname || ' (' || cmd || ')', ', ') into v_err from pg_policies
   where schemaname = 'realtime' and tablename = 'messages' and policyname <> 'chat_participants_receive';
  perform pg_temp.chk('10f không có policy nào KHÁC trên realtime.messages (không nới quyền nghe / phát)',
    v_err is null, coalesce(v_err, ''));

  -- ---------- 11. Quyền ----------
  perform pg_temp.chk('11a client KHÔNG đọc thẳng bảng chat_messages / chat_reads',
    not has_table_privilege('authenticated', 'public.chat_messages', 'select')
      and not has_table_privilege('anon', 'public.chat_messages', 'select')
      and not has_table_privilege('authenticated', 'public.chat_reads', 'select'), '');
  perform pg_temp.chk('11b hàm nội bộ không mở cho client',
    not has_function_privilege('authenticated', 'public._chat_party(uuid, uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public._chat_access(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public._chat_can_read(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public._chat_admin_can_read(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public._chat_is_admin()', 'execute')
      and not has_function_privilege('authenticated', 'public._chat_user_active(uuid)', 'execute')
      and not has_table_privilege('authenticated', 'public.chat_admin_access_log', 'select'), '');
  perform pg_temp.chk('11c anon KHÔNG gọi được RPC chat',
    not has_function_privilege('anon', 'public.send_chat_message(uuid, text)', 'execute')
      and not has_function_privilege('anon', 'public.get_chat_messages(uuid, timestamptz, uuid, int)', 'execute')
      and not has_function_privilege('anon', 'public.admin_get_chat_messages(uuid, timestamptz, uuid, int)', 'execute'), '');

  -- ---------- 12. Trần 300 tin / ngày + phân trang (created_at, id) ----------
  insert into public.chat_messages (application_id, sender_id, body, created_at)
    select aa, e1, 'cũ ' || g, clock_timestamp() - interval '2 hours' from generate_series(1, 299) g;
  perform pg_temp.as_user(e1);
  begin perform public.send_chat_message(aa, 'tin 301'); v_err := 'no error'; exception when others then v_err := sqlerrm; end;
  perform pg_temp.chk('12a tin thứ 301 trong 24 giờ → CHAT_DAILY_LIMIT', v_err = 'CHAT_DAILY_LIMIT', v_err);
  -- 299 tin cùng một thời điểm: trang sau theo (created_at, id) không bỏ sót / trùng.
  declare v_bt timestamptz; v_bid uuid; v_seen int := 0; v_page int; v_ids uuid[] := '{}'; r2 record;
  begin
    loop
      v_page := 0;
      for r2 in select t.created_at, t.id from public.get_chat_messages(aa, v_bt, v_bid, 100) t loop
        v_page := v_page + 1; v_bt := r2.created_at; v_bid := r2.id; v_ids := v_ids || r2.id;
      end loop;
      exit when v_page = 0;
      v_seen := v_seen + v_page;
      exit when v_seen > 1000;
    end loop;
    perform pg_temp.chk('12b phân trang (created_at, id) đi hết mọi tin, không trùng / sót',
      v_seen = (select count(*) from public.chat_messages where application_id = aa)
        and v_seen = (select count(distinct x) from unnest(v_ids) x), v_seen::text);
  end;

  select count(*) filter (where ok), count(*) into v_ok, v_all from _r;
  for r in select * from _r order by n loop
    v_txt := v_txt || E'\n' || case when r.ok then 'ok   ' else 'FAIL ' end || r.scn
             || case when r.ok then '' else '  [' || coalesce(r.got, '') || ']' end;
  end loop;
  raise exception 'DRYRUN_RESULT (% / % ok)%', v_ok, v_all, v_txt;
end $dry$;
