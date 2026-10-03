-- =============================================================================
-- 0035 — Chat giữa người lao động và nhà tuyển dụng (kế hoạch duyệt 02/10)
-- =============================================================================
-- Mỗi ĐƠN ỨNG TUYỂN một cuộc trò chuyện (người lao động ↔ NTD của ca đó). Luật
-- (khớp src/domain/chat.ts):
--   - Có cuộc trò chuyện khi đơn TỪNG được duyệt (approved_at hoặc trạng thái giữ
--     chỗ / đã xong). Gửi được khi đơn đang Approved / CancellationRequested /
--     CheckedIn / CheckedOut / Confirmed, ca chưa huỷ, chưa quá hết ca + 7 ngày;
--     còn lại chỉ đọc. Tài khoản bị khoá: không đọc, không gửi, không nghe kênh.
--   - Chỉ chữ, 1–1000 ký tự sau khi cắt khoảng trắng / xuống dòng / ký tự vô hình
--     hai đầu; tối đa 20 tin / phút và 300 tin / ngày mỗi người.
--   - Báo cáo tin của người kia. Chỉ người báo cáo thấy cờ "đã báo cáo" (người bị
--     báo cáo không biết, tránh trả đũa).
--   - Admin đọc cuộc trò chuyện CHỈ khi còn tin bị báo cáo CHƯA xử lý, hoặc khoản cọc
--     người lao động của đơn đang chờ admin xử (worker_holds.status = 'Contested') —
--     chủ dự án chốt 03/10. Admin đọc qua RPC riêng, MỖI lần đọc ghi nhật ký
--     (chat_admin_access_log); kiểm vai trò admin trong bảng users (không chỉ JWT).
--     Admin đánh dấu đã xử lý báo cáo → hết quyền đọc (trừ khi còn cọc chờ xử).
--   - Tin mới: Supabase Realtime kênh RIÊNG TƯ 'chat:<application_id>'. Trigger
--     gửi payload tối thiểu (id tin); client nhận rồi gọi RPC lấy tin. Policy trên
--     realtime.messages: chỉ hai bên của đơn nhận được; không có policy insert →
--     client không tự phát vào kênh.
--   - Thông báo: kind 'ChatMessage' trong user_notifications (0031), MỘT dòng cho
--     mỗi cuộc trò chuyện (dedupe 'chat:<application_id>'); tin mới mở lại dòng
--     đó thành chưa đọc; params không chứa nội dung tin.
-- Bảng RPC-only như 0031: RLS bật, không cấp quyền bảng cho client.
-- Chưa có: hạn lưu / dọn tin cũ, ảnh / tệp (chờ chủ dự án chốt hạn lưu + câu chữ
-- trang Bảo mật / Điều khoản).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bảng
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  application_id      uuid not null references public.applications(id) on delete cascade,
  sender_id           uuid not null references public.users(id) on delete cascade,
  body                text not null check (char_length(body) between 1 and 1000),
  -- clock_timestamp: tin gửi liên tiếp (kể cả trong một transaction) có thứ tự rõ.
  created_at          timestamptz not null default clock_timestamp(),
  reported_at         timestamptz,
  reported_by         uuid references public.users(id) on delete set null,
  report_reason       text check (report_reason is null or char_length(report_reason) <= 500),
  report_resolved_at  timestamptz,
  report_resolved_by  uuid references public.users(id) on delete set null
);
create index if not exists chat_messages_app_idx on public.chat_messages(application_id, created_at desc, id desc);
create index if not exists chat_messages_sender_idx on public.chat_messages(sender_id, created_at desc);
create index if not exists chat_messages_open_report_idx on public.chat_messages(application_id)
  where reported_at is not null and report_resolved_at is null;

create table if not exists public.chat_reads (
  application_id  uuid not null references public.applications(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  last_read_at    timestamptz not null default clock_timestamp(),
  primary key (application_id, user_id)
);

-- Nhật ký admin đọc cuộc trò chuyện.
create table if not exists public.chat_admin_access_log (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references public.users(id) on delete cascade,
  application_id  uuid not null references public.applications(id) on delete cascade,
  action          text not null check (action in ('read', 'resolve')),
  created_at      timestamptz not null default clock_timestamp()
);
create index if not exists chat_admin_access_log_app_idx on public.chat_admin_access_log(application_id, created_at desc);

alter table public.chat_messages enable row level security;
alter table public.chat_reads enable row level security;
alter table public.chat_admin_access_log enable row level security;
revoke all on public.chat_messages from public, anon, authenticated;
revoke all on public.chat_reads from public, anon, authenticated;
revoke all on public.chat_admin_access_log from public, anon, authenticated;
grant all on public.chat_messages to service_role;
grant all on public.chat_reads to service_role;
grant all on public.chat_admin_access_log to service_role;

-- Thông báo kind mới.
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check
  check (kind in ('PaymentReviewCredited', 'PaymentReviewDismissed', 'ChatMessage'));

-- ---------------------------------------------------------------------------
-- 2. Hàm nội bộ
-- ---------------------------------------------------------------------------
-- Cắt khoảng trắng / xuống dòng / tab / ký tự vô hình (U+200B–U+200D, U+FEFF) hai đầu.
create or replace function public._chat_trim(p_text text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(p_text, ''), '^[\s​-‍﻿]+|[\s​-‍﻿]+$', '', 'g');
$$;

-- Người dùng tồn tại và không bị khoá.
create or replace function public._chat_user_active(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users u where u.id = p_uid and not u.suspended);
$$;

-- Admin thật: JWT là admin VÀ bảng users ghi admin, không bị khoá (JWT còn hạn sau
-- khi bị hạ quyền không đủ để đọc).
create or replace function public._chat_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin()
     and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin' and not u.suspended);
$$;

-- Vai trò của p_uid trong cuộc trò chuyện của đơn: 'worker' | 'employer' | null.
create or replace function public._chat_party(p_application_id uuid, p_uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when a.worker_id = p_uid then 'worker'
              when s.employer_id = p_uid then 'employer' end
    from public.applications a join public.shifts s on s.id = a.shift_id
   where a.id = p_application_id;
$$;

-- 'none' | 'open' | 'readonly' (khớp chatAccess của src/domain/chat.ts).
create or replace function public._chat_access(p_application_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when not (a.status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Confirmed')
              or a.approved_at is not null) then 'none'
    when a.status not in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Confirmed')
         or s.status = 'Cancelled' then 'readonly'
    when now() >= public.shift_end_ts(s.date, s.end_time) + interval '7 days' then 'readonly'
    else 'open' end
    from public.applications a join public.shifts s on s.id = a.shift_id
   where a.id = p_application_id;
$$;

-- Admin được đọc: còn báo cáo CHƯA xử lý, hoặc cọc người lao động của đơn chờ admin xử.
create or replace function public._chat_admin_can_read(p_application_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.chat_messages c
                  where c.application_id = p_application_id
                    and c.reported_at is not null and c.report_resolved_at is null)
      or exists (select 1 from public.worker_holds h
                  where h.application_id = p_application_id and h.status = 'Contested');
$$;

-- Người dùng hiện tại là một bên của đơn, đang hoạt động, đơn có cuộc trò chuyện.
create or replace function public._chat_can_read(p_application_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not public._chat_user_active(v_uid) then return false; end if;
  return public._chat_party(p_application_id, v_uid) is not null
     and coalesce(public._chat_access(p_application_id), 'none') <> 'none';
end; $$;

-- Topic realtime 'chat:<uuid>' → được nhận không (topic sai dạng → false, không lỗi).
create or replace function public._chat_topic_allowed(p_topic text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_topic is null or p_topic !~ '^chat:[0-9a-fA-F-]{36}$' then return false; end if;
  return public._chat_can_read(substring(p_topic from 6)::uuid);
exception when others then
  return false;
end; $$;

revoke execute on function public._chat_trim(text) from public, anon, authenticated;
revoke execute on function public._chat_user_active(uuid) from public, anon, authenticated;
revoke execute on function public._chat_is_admin() from public, anon, authenticated;
revoke execute on function public._chat_party(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._chat_access(uuid) from public, anon, authenticated;
revoke execute on function public._chat_admin_can_read(uuid) from public, anon, authenticated;
revoke execute on function public._chat_can_read(uuid) from public, anon, authenticated;
-- Policy realtime chạy với quyền người nhận → cần execute (hàm chỉ trả boolean về
-- quyền của CHÍNH người gọi; đơn không tồn tại và đơn của người khác đều false).
revoke execute on function public._chat_topic_allowed(text) from public, anon;
grant execute on function public._chat_topic_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC người dùng
-- ---------------------------------------------------------------------------
-- Danh sách cuộc trò chuyện của mình (có tin, hoặc đang mở). Tên hiển thị công khai
-- của người bên kia, tin cuối, số tin chưa đọc. Tài khoản bị khoá: danh sách rỗng.
create or replace function public.get_chat_threads()
returns table (application_id uuid, shift_id uuid, shift_title text, shift_date date,
               other_user_id uuid, other_name text, my_role text, access text,
               last_body text, last_at timestamptz, last_sender_id uuid, unread integer)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public._chat_user_active(v_uid) then return; end if;
  return query
    with mine as (
      select a.id as app_id, s.id as sid, s.title, s.date,
             case when a.worker_id = v_uid then s.employer_id else a.worker_id end as other_id,
             case when a.worker_id = v_uid then 'worker' else 'employer' end as role
        from public.applications a join public.shifts s on s.id = a.shift_id
       where (a.worker_id = v_uid or s.employer_id = v_uid)
         and (a.status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Confirmed')
              or a.approved_at is not null)
    )
    select m.app_id, m.sid, m.title, m.date, m.other_id,
           coalesce(pp.display_name, ''),
           m.role, public._chat_access(m.app_id),
           lm.body, lm.created_at, lm.sender_id,
           (select count(*)::int from public.chat_messages c
             where c.application_id = m.app_id and c.sender_id <> v_uid
               and c.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz))
      from mine m
      left join public.public_profiles pp on pp.user_id = m.other_id
      left join public.chat_reads r on r.application_id = m.app_id and r.user_id = v_uid
      left join lateral (
        select c.body, c.created_at, c.sender_id from public.chat_messages c
         where c.application_id = m.app_id order by c.created_at desc, c.id desc limit 1) lm on true
     where lm.created_at is not null or public._chat_access(m.app_id) = 'open'
     order by coalesce(lm.created_at, '-infinity'::timestamptz) desc, m.date desc
     limit 100;
end; $$;

-- Tin của một cuộc trò chuyện (chỉ hai bên), mới nhất trước. Trang sau: truyền
-- (created_at, id) của tin cũ nhất đang có. `reported` = CHÍNH người gọi đã báo cáo.
create or replace function public.get_chat_messages(p_application_id uuid,
                                                    p_before timestamptz default null,
                                                    p_before_id uuid default null,
                                                    p_limit int default 50)
returns table (id uuid, sender_id uuid, body text, created_at timestamptz, reported boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public._chat_can_read(p_application_id) then raise exception 'CHAT_NOT_AVAILABLE'; end if;
  return query
    select c.id, c.sender_id, c.body, c.created_at,
           (c.reported_at is not null and c.reported_by = v_uid)
      from public.chat_messages c
     where c.application_id = p_application_id
       and (p_before is null
            or c.created_at < p_before
            or (p_before_id is not null and c.created_at = p_before and c.id < p_before_id))
     order by c.created_at desc, c.id desc
     limit least(greatest(coalesce(p_limit, 50), 1), 100);
end; $$;

create or replace function public.send_chat_message(p_application_id uuid, p_body text)
returns table (id uuid, sender_id uuid, body text, created_at timestamptz, reported boolean)
language plpgsql security definer set search_path = '' as $$
-- Cột trả về (id, sender_id, body, created_at…) trùng tên cột bảng → mọi tham chiếu
-- cột trong hàm này đều ghi rõ bảng / bí danh.
declare v_uid uuid := auth.uid(); v_role text; v_susp boolean; v_party text;
        v_body text := public._chat_trim(p_body); v_minute int; v_day int;
        v_msg public.chat_messages; v_app public.applications; v_shift public.shifts;
        v_to uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select u.role, u.suspended into v_role, v_susp from public.users u where u.id = v_uid;
  if v_role is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_susp then raise exception 'SUSPENDED'; end if;

  v_party := public._chat_party(p_application_id, v_uid);
  if v_party is null then raise exception 'CHAT_NOT_AVAILABLE'; end if;
  if coalesce(public._chat_access(p_application_id), 'none') <> 'open' then raise exception 'CHAT_CLOSED'; end if;
  if char_length(v_body) = 0 then raise exception 'CHAT_EMPTY'; end if;
  if char_length(v_body) > 1000 then raise exception 'CHAT_TOO_LONG'; end if;

  -- Giới hạn tốc độ: khoá theo người gửi để hai yêu cầu song song không cùng lọt.
  perform pg_advisory_xact_lock(hashtextextended('chat_send:' || v_uid::text, 0));
  select count(*) filter (where c.created_at > clock_timestamp() - interval '1 minute'),
         count(*)
    into v_minute, v_day
    from public.chat_messages c
   where c.sender_id = v_uid and c.created_at > clock_timestamp() - interval '24 hours';
  if v_minute >= 20 then raise exception 'RATE_LIMITED'; end if;
  if v_day >= 300 then raise exception 'CHAT_DAILY_LIMIT'; end if;

  insert into public.chat_messages (application_id, sender_id, body)
    values (p_application_id, v_uid, v_body) returning * into v_msg;

  insert into public.chat_reads (application_id, user_id, last_read_at)
    values (p_application_id, v_uid, v_msg.created_at)
    on conflict (application_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- Thông báo cho người kia: một dòng mỗi cuộc trò chuyện, tin mới mở lại chưa đọc.
  select * into v_app from public.applications where public.applications.id = p_application_id;
  select * into v_shift from public.shifts where public.shifts.id = v_app.shift_id;
  v_to := case when v_party = 'worker' then v_shift.employer_id else v_app.worker_id end;
  insert into public.user_notifications (user_id, kind, params, dedupe_key)
    values (v_to, 'ChatMessage',
            jsonb_build_object('applicationId', p_application_id, 'shiftId', v_shift.id,
                               'shiftTitle', v_shift.title, 'fromRole', v_party),
            'chat:' || p_application_id::text)
    on conflict (user_id, dedupe_key) do update
      set read_at = null, created_at = now(), params = excluded.params;

  return query select v_msg.id, v_msg.sender_id, v_msg.body, v_msg.created_at, false;
end; $$;

create or replace function public.mark_chat_read(p_application_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public._chat_can_read(p_application_id) then raise exception 'CHAT_NOT_AVAILABLE'; end if;
  insert into public.chat_reads (application_id, user_id, last_read_at)
    values (p_application_id, v_uid, clock_timestamp())
    on conflict (application_id, user_id) do update set last_read_at = excluded.last_read_at;
  update public.user_notifications set read_at = now()
   where user_id = v_uid and dedupe_key = 'chat:' || p_application_id::text and read_at is null;
end; $$;

-- Báo cáo tin của NGƯỜI KIA (một lần; lần sau giữ báo cáo đầu).
create or replace function public.report_chat_message(p_message_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_msg public.chat_messages;
        v_reason text := public._chat_trim(p_reason);
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_reason = '' then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_reason) > 500 then raise exception 'FIELD_TOO_LONG'; end if;
  select * into v_msg from public.chat_messages where id = p_message_id for update;
  if not found or not public._chat_can_read(v_msg.application_id) then
    raise exception 'CHAT_NOT_AVAILABLE';
  end if;
  if v_msg.sender_id = v_uid then raise exception 'CANNOT_REPORT_OWN'; end if;
  update public.chat_messages
     set reported_at = now(), reported_by = v_uid, report_reason = v_reason
   where id = p_message_id and reported_at is null;
end; $$;

-- ---------------------------------------------------------------------------
-- 4. RPC admin (mỗi lần đọc / xử lý ghi chat_admin_access_log)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_chat_reviews()
returns table (application_id uuid, shift_id uuid, shift_title text, shift_date date,
               worker_id uuid, worker_name text, employer_id uuid, employer_name text,
               reported_count integer, unresolved_count integer, last_reported_at timestamptz,
               hold_contested boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._chat_is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return query
    select a.id, s.id, s.title, s.date, a.worker_id, coalesce(wp.display_name, ''),
           s.employer_id, coalesce(ep.display_name, ''),
           (select count(*)::int from public.chat_messages c
             where c.application_id = a.id and c.reported_at is not null),
           (select count(*)::int from public.chat_messages c
             where c.application_id = a.id and c.reported_at is not null and c.report_resolved_at is null),
           (select max(c.reported_at) from public.chat_messages c where c.application_id = a.id),
           exists (select 1 from public.worker_holds h where h.application_id = a.id and h.status = 'Contested')
      from public.applications a
      join public.shifts s on s.id = a.shift_id
      left join public.public_profiles wp on wp.user_id = a.worker_id
      left join public.public_profiles ep on ep.user_id = s.employer_id
     where exists (select 1 from public.chat_messages c where c.application_id = a.id)
       and public._chat_admin_can_read(a.id)
     order by 11 desc nulls last
     limit 100;
end; $$;

create or replace function public.admin_get_chat_messages(p_application_id uuid,
                                                          p_before timestamptz default null,
                                                          p_before_id uuid default null,
                                                          p_limit int default 50)
returns table (id uuid, sender_id uuid, body text, created_at timestamptz,
               reported_at timestamptz, reported_by uuid, report_reason text,
               report_resolved_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public._chat_is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if not public._chat_admin_can_read(p_application_id) then raise exception 'CHAT_NOT_AVAILABLE'; end if;
  insert into public.chat_admin_access_log (admin_id, application_id, action)
    values (auth.uid(), p_application_id, 'read');
  return query
    select c.id, c.sender_id, c.body, c.created_at, c.reported_at, c.reported_by,
           c.report_reason, c.report_resolved_at
      from public.chat_messages c
     where c.application_id = p_application_id
       and (p_before is null
            or c.created_at < p_before
            or (p_before_id is not null and c.created_at = p_before and c.id < p_before_id))
     order by c.created_at desc, c.id desc
     limit least(greatest(coalesce(p_limit, 50), 1), 100);
end; $$;

-- Đánh dấu đã xử lý mọi báo cáo của cuộc trò chuyện → admin hết quyền đọc (trừ khi
-- còn cọc chờ xử). Trả số tin vừa đánh dấu.
create or replace function public.admin_resolve_chat_reports(p_application_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public._chat_is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  update public.chat_messages c
     set report_resolved_at = now(), report_resolved_by = auth.uid()
   where c.application_id = p_application_id
     and c.reported_at is not null and c.report_resolved_at is null;
  get diagnostics v_n = row_count;
  insert into public.chat_admin_access_log (admin_id, application_id, action)
    values (auth.uid(), p_application_id, 'resolve');
  return v_n;
end; $$;

revoke execute on function public.get_chat_threads() from public, anon;
grant  execute on function public.get_chat_threads() to authenticated;
revoke execute on function public.get_chat_messages(uuid, timestamptz, uuid, int) from public, anon;
grant  execute on function public.get_chat_messages(uuid, timestamptz, uuid, int) to authenticated;
revoke execute on function public.send_chat_message(uuid, text) from public, anon;
grant  execute on function public.send_chat_message(uuid, text) to authenticated;
revoke execute on function public.mark_chat_read(uuid) from public, anon;
grant  execute on function public.mark_chat_read(uuid) to authenticated;
revoke execute on function public.report_chat_message(uuid, text) from public, anon;
grant  execute on function public.report_chat_message(uuid, text) to authenticated;
revoke execute on function public.admin_list_chat_reviews() from public, anon;
grant  execute on function public.admin_list_chat_reviews() to authenticated;
revoke execute on function public.admin_get_chat_messages(uuid, timestamptz, uuid, int) from public, anon;
grant  execute on function public.admin_get_chat_messages(uuid, timestamptz, uuid, int) to authenticated;
revoke execute on function public.admin_resolve_chat_reports(uuid) from public, anon;
grant  execute on function public.admin_resolve_chat_reports(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Realtime: báo có tin mới lên kênh riêng tư (payload tối thiểu)
-- ---------------------------------------------------------------------------
create or replace function public._chat_broadcast_new()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('id', new.id, 'applicationId', new.application_id),
      'chat_message', 'chat:' || new.application_id::text, true);
  exception when others then
    -- Realtime lỗi: tin vẫn lưu; client lấy lại khi mở cuộc trò chuyện.
    raise warning 'chat realtime: %', sqlerrm;
  end;
  return new;
end; $$;
revoke execute on function public._chat_broadcast_new() from public, anon, authenticated;

drop trigger if exists chat_messages_broadcast on public.chat_messages;
create trigger chat_messages_broadcast
  after insert on public.chat_messages
  for each row execute function public._chat_broadcast_new();

-- Chỉ hai bên của đơn nhận được broadcast của 'chat:<application_id>'. Không có
-- policy insert → client không tự phát vào kênh. Lỗi ở đây → migration dừng (không
-- nuốt lỗi; dự án Supabase luôn có schema realtime).
drop policy if exists chat_participants_receive on realtime.messages;
create policy chat_participants_receive on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'broadcast'
         and public._chat_topic_allowed(realtime.topic()));
