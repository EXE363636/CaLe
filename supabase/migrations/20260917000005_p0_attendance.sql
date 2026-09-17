-- ===========================================================================
-- P0 · Attendance persistence (2026-09-17)
--
-- Migration MỚI (không sửa 0001–0004 đã apply). Bổ sung cột attendance cho
-- public.applications + RPC SECURITY DEFINER cho từng mutation attendance:
--   worker_check_in, employer_mark_present, worker_check_out, employer_confirm_completion
--
-- Bất biến (theo 0004):
--   - Client KHÔNG được UPDATE trực tiếp applications (chỉ SELECT). Mọi thay đổi
--     đi qua RPC definer. Thời gian dùng now() ở server, KHÔNG tin client.
--   - search_path='' + gọi object bằng tên đầy đủ. Revoke execute khỏi public/anon,
--     chỉ grant cho authenticated.
--   - Khóa shift TRƯỚC rồi application (cùng thứ tự các RPC 0004) → tránh deadlock.
--   - Check-in của worker và mark-present của employer là HAI dấu độc lập:
--       * worker_check_in stamp check_in_at (dấu tự xác nhận của worker).
--       * employer_mark_present stamp marked_present_at (+ ai xác nhận), KHÔNG đụng
--         check_in_at → không giả thành worker tự check-in.
--       * check-out CHỈ mở khi worker đã tự check-in (check_in_at not null).
--   - Escrow/thanh toán vẫn là mô phỏng — RPC KHÔNG đụng escrow_status.
--   - Gọi lặp ổn định: nếu dấu thời gian đích đã set thì trả về no-op (không tạo
--     timestamp/chuyển trạng thái trùng).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Cột attendance
-- ---------------------------------------------------------------------------
alter table public.applications add column if not exists check_in_at                 timestamptz;
alter table public.applications add column if not exists marked_present_at           timestamptz;
alter table public.applications add column if not exists marked_present_by_employer_id uuid references public.users (id);
alter table public.applications add column if not exists check_out_at                timestamptz;
alter table public.applications add column if not exists confirmed_at                timestamptz;
alter table public.applications add column if not exists worker_checkout_note        text;
alter table public.applications add column if not exists worker_evidence_file_name   text;
alter table public.applications add column if not exists checkout_checklist          jsonb;

-- ---------------------------------------------------------------------------
-- 2. Helper: shift_end_ts (song song shift_start_ts, cùng timezone VN)
-- ---------------------------------------------------------------------------
create or replace function public.shift_end_ts(p_date date, p_end time)
returns timestamptz language sql immutable set search_path = '' as $$
  select (p_date + p_end) at time zone 'Asia/Ho_Chi_Minh';
$$;

-- ---------------------------------------------------------------------------
-- 3. RPC: worker_check_in — worker TỰ check-in (dấu check_in_at)
-- ---------------------------------------------------------------------------
create or replace function public.worker_check_in(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications;
        v_start timestamptz; v_end timestamptz; v_cnt int;
begin
  perform public.require_active_worker();
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.worker_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;

  -- Idempotent: đã tự check-in rồi → no-op, không stamp lại.
  if v_app.check_in_at is not null then return p_application_id; end if;

  v_start := public.shift_start_ts(v_shift.date, v_shift.start_time);
  v_end   := public.shift_end_ts(v_shift.date, v_shift.end_time);

  if v_app.status = 'Approved' then
    -- Cửa sổ [start-15p, start+5p].
    if not (now() >= v_start - interval '15 minutes' and now() <= v_start + interval '5 minutes')
      then raise exception 'CHECK_IN_WINDOW_CLOSED'; end if;
  elsif v_app.status = 'CheckedIn' and v_app.check_in_at is null then
    -- Worker được employer xác nhận có mặt trước (status CheckedIn nhưng chưa tự
    -- check-in) vẫn có thể tự xác nhận trong khoảng [start-15p, end+60p] để mở check-out.
    if not (now() >= v_start - interval '15 minutes' and now() <= v_end + interval '60 minutes')
      then raise exception 'CHECK_IN_WINDOW_CLOSED'; end if;
  else
    raise exception 'INVALID_STATE_FOR_CHECKIN';
  end if;

  update public.applications
    set status = 'CheckedIn', check_in_at = now()
    where id = p_application_id and check_in_at is null;
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_CHECKIN'; end if;
  return p_application_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: employer_mark_present — employer xác nhận worker CÓ MẶT
--    (dấu marked_present_at ĐỘC LẬP; KHÔNG đụng check_in_at)
-- ---------------------------------------------------------------------------
create or replace function public.employer_mark_present(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications;
        v_start timestamptz; v_end timestamptz; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);

  -- Idempotent: đã xác nhận có mặt rồi → no-op.
  if v_app.marked_present_at is not null then return p_application_id; end if;
  if v_app.status not in ('Approved','CheckedIn') then raise exception 'INVALID_STATE_FOR_MARK_PRESENT'; end if;

  v_start := public.shift_start_ts(v_shift.date, v_shift.start_time);
  v_end   := public.shift_end_ts(v_shift.date, v_shift.end_time);
  if not (now() >= v_start - interval '15 minutes' and now() <= v_end + interval '60 minutes')
    then raise exception 'MARK_PRESENT_WINDOW_CLOSED'; end if;

  update public.applications
    set marked_present_at = now(),
        marked_present_by_employer_id = auth.uid(),
        -- Approved → CheckedIn (không set check_in_at: đây là dấu của employer,
        -- không phải worker tự check-in). CheckedIn giữ nguyên.
        status = case when status = 'Approved' then 'CheckedIn' else status end
    where id = p_application_id and marked_present_at is null;
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_MARK_PRESENT'; end if;
  return p_application_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: worker_check_out — worker check-out (chỉ khi đã tự check-in + ca đã kết thúc)
-- ---------------------------------------------------------------------------
create or replace function public.worker_check_out(
  p_application_id uuid,
  p_note           text default null,
  p_evidence_file_name text default null,
  p_checklist      jsonb default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications;
        v_end timestamptz; v_note text; v_file text; v_req text; v_cnt int;
begin
  perform public.require_active_worker();
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.worker_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;

  -- Idempotent: đã check-out rồi → no-op.
  if v_app.check_out_at is not null then return p_application_id; end if;
  if v_app.status <> 'CheckedIn' then raise exception 'INVALID_STATE_FOR_CHECKOUT'; end if;
  -- Employer mark-present đơn thuần KHÔNG mở check-out; cần worker tự check-in.
  if v_app.check_in_at is null then raise exception 'CHECKOUT_REQUIRES_SELF_CHECKIN'; end if;

  v_end := public.shift_end_ts(v_shift.date, v_shift.end_time);
  -- Check-out chỉ mở sau khi ca KẾT THÚC, trong cửa sổ ân hạn 60 phút.
  if not (now() >= v_end and now() <= v_end + interval '60 minutes')
    then raise exception 'CHECKOUT_WINDOW_CLOSED'; end if;

  v_note := btrim(coalesce(p_note, ''));
  if length(v_note) > 1000 then raise exception 'NOTE_TOO_LONG'; end if;
  v_file := btrim(coalesce(p_evidence_file_name, ''));
  if length(v_file) > 255 then raise exception 'EVIDENCE_FILENAME_INVALID'; end if;
  if v_file ~ '[/\\]' then raise exception 'EVIDENCE_FILENAME_INVALID'; end if;
  v_req := coalesce(v_shift.evidence_requirement, 'None');
  if v_req = 'RequiredPhoto' and v_file = '' then raise exception 'EVIDENCE_REQUIRED'; end if;

  update public.applications
    set status = 'CheckedOut',
        check_out_at = now(),
        worker_checkout_note = case when v_note = '' then null else v_note end,
        worker_evidence_file_name = case when v_file = '' then null else v_file end,
        checkout_checklist = p_checklist
    where id = p_application_id and status = 'CheckedIn';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_CHECKOUT'; end if;

  -- Nhất quán shift: nếu không còn slot-holder nào đang chờ (Approved/
  -- CancellationRequested/CheckedIn) thì ca chuyển sang 'AwaitingConfirmation'.
  if not exists (
    select 1 from public.applications
    where shift_id = v_sid and status in ('Approved','CancellationRequested','CheckedIn')
  ) then
    update public.shifts set status = 'AwaitingConfirmation', updated_at = now()
      where id = v_sid and status in ('Published','FullyBooked');
  end if;
  return p_application_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: employer_confirm_completion — employer xác nhận HOÀN THÀNH
--    (KHÔNG đụng escrow/thanh toán — vẫn là mô phỏng, để task sau)
-- ---------------------------------------------------------------------------
create or replace function public.employer_confirm_completion(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_end timestamptz; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);

  -- Idempotent: đã xác nhận hoàn thành → no-op.
  if v_app.confirmed_at is not null or v_app.status = 'Confirmed' then return p_application_id; end if;
  if v_app.status <> 'CheckedOut' then raise exception 'INVALID_STATE_FOR_CONFIRM'; end if;

  v_end := public.shift_end_ts(v_shift.date, v_shift.end_time);
  if now() < v_end then raise exception 'SHIFT_NOT_ENDED'; end if;

  update public.applications set status = 'Confirmed', confirmed_at = now()
    where id = p_application_id and status = 'CheckedOut';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_CONFIRM'; end if;

  -- Nhất quán shift: nếu mọi slot-holder đã Confirmed (không còn Approved/
  -- CancellationRequested/CheckedIn/CheckedOut) thì ca 'Completed'.
  if not exists (
    select 1 from public.applications
    where shift_id = v_sid and status in ('Approved','CancellationRequested','CheckedIn','CheckedOut')
  ) then
    update public.shifts set status = 'Completed', updated_at = now() where id = v_sid;
  end if;
  return p_application_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. EXECUTE grants — revoke khỏi public/anon, chỉ grant authenticated.
--    Helper shift_end_ts KHÔNG grant cho authenticated (chỉ gọi trong definer).
-- ---------------------------------------------------------------------------
revoke execute on function public.shift_end_ts(date, time) from public, anon;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.worker_check_in(uuid)',
    'public.employer_mark_present(uuid)',
    'public.worker_check_out(uuid, text, text, jsonb)',
    'public.employer_confirm_completion(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated;', fn);
  end loop;
end;
$$;
