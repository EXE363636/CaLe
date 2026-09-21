-- ===========================================================================
-- P0 · Sửa ca kẹt sau giờ (2026-09-18) — corrective migration.
-- KHÔNG sửa migration đã apply (0004/0005/0006/0007). Chỉ CREATE OR REPLACE hàm
-- (giữ nguyên chữ ký → GRANT cũ còn hiệu lực) + thêm cột audit (additive).
--
-- Bối cảnh: đơn kẹt `CheckedIn` sau khi ca kết thúc vì:
--   (1) worker_check_out chỉ mở [end, end+60p] → quá 60p mất đường check-out.
--   (2) employer_confirm_completion chỉ nhận `CheckedOut` → không đóng được đơn
--       `CheckedIn` sau giờ khi worker chưa/không check-out.
--
-- Sửa:
--   (1) worker_check_out: từ giờ kết thúc trở đi LUÔN cho check-out (bỏ chặn +60p).
--       Vẫn dùng thời gian server, ghi check_out_at thật, idempotent, kiểm chủ đơn.
--   (2) employer_confirm_completion: cho phép đóng thủ công đơn `CheckedIn` sau giờ
--       khi employer ĐÃ marked_present và worker CHƯA check_out. Không bịa
--       check_out_at; đánh dấu confirmed_without_checkout=true để audit.
--
-- KHÔNG auto-complete: không có sweep tự chuyển CheckedIn→CheckedOut/Completed.
-- ===========================================================================

-- Cột audit: xác nhận hoàn thành thủ công dù worker chưa check-out.
alter table public.applications
  add column if not exists confirmed_without_checkout boolean not null default false;

-- ---------------------------------------------------------------------------
-- (1) worker_check_out — cho check-out muộn (bỏ chặn trên +60 phút)
-- ---------------------------------------------------------------------------
create or replace function public.worker_check_out(
  p_application_id uuid,
  p_note           text default null,
  p_evidence_file_name text default null,
  p_checklist      jsonb default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications;
        v_end timestamptz; v_note text; v_file text; v_req text; v_cnt int; v_len int;
begin
  perform public.require_active_worker();
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.worker_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;

  if v_app.check_out_at is not null then return p_application_id; end if; -- idempotent
  if v_app.status <> 'CheckedIn' then raise exception 'INVALID_STATE_FOR_CHECKOUT'; end if;
  if v_app.check_in_at is null then raise exception 'CHECKOUT_REQUIRES_SELF_CHECKIN'; end if;

  v_end := public.shift_end_ts(v_shift.date, v_shift.end_time);
  -- Chỉ chặn TRƯỚC giờ kết thúc; từ giờ kết thúc trở đi cho check-out muộn (không giới hạn trên).
  if now() < v_end then raise exception 'CHECKOUT_WINDOW_CLOSED'; end if;

  v_note := btrim(coalesce(p_note, ''));
  if char_length(coalesce(p_note, '')) > 1000 then raise exception 'NOTE_TOO_LONG'; end if;
  v_file := btrim(coalesce(p_evidence_file_name, ''));
  if char_length(coalesce(p_evidence_file_name, '')) > 255 then raise exception 'EVIDENCE_FILENAME_INVALID'; end if;
  if v_file ~ '[/\\]' then raise exception 'EVIDENCE_FILENAME_INVALID'; end if;

  if p_checklist is not null then
    if jsonb_typeof(p_checklist) <> 'array' then raise exception 'EVIDENCE_INVALID'; end if;
    if exists (select 1 from jsonb_array_elements(p_checklist) e where jsonb_typeof(e) <> 'boolean')
      then raise exception 'EVIDENCE_INVALID'; end if;
  end if;
  v_len := case when p_checklist is null then 0 else jsonb_array_length(p_checklist) end;

  v_req := coalesce(v_shift.evidence_requirement, 'None');
  if v_req = 'ChecklistOnly' then
    if v_len <> 2 then raise exception 'CHECKLIST_INCOMPLETE'; end if;
    if exists (select 1 from jsonb_array_elements(p_checklist) e where e = to_jsonb(false))
      then raise exception 'CHECKLIST_INCOMPLETE'; end if;
  elsif v_req = 'RequiredHandoverChecklist' then
    if v_len <> 3 then raise exception 'CHECKLIST_INCOMPLETE'; end if;
    if exists (select 1 from jsonb_array_elements(p_checklist) e where e = to_jsonb(false))
      then raise exception 'CHECKLIST_INCOMPLETE'; end if;
    if v_note = '' then raise exception 'NOTE_REQUIRED'; end if;
  end if;

  update public.applications
    set status = 'CheckedOut',
        check_out_at = now(),
        worker_checkout_note = case when v_note = '' then null else v_note end,
        worker_evidence_file_name = case when v_file = '' then null else v_file end,
        checkout_checklist = p_checklist
    where id = p_application_id and status = 'CheckedIn';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_CHECKOUT'; end if;

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
-- (2) employer_confirm_completion — xác nhận CheckedOut HOẶC đóng thủ công
--     đơn CheckedIn sau giờ (đã marked_present, chưa check_out).
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

  -- Idempotent: đã hoàn thành → no-op.
  if v_app.confirmed_at is not null or v_app.status = 'Confirmed' then return p_application_id; end if;

  v_end := public.shift_end_ts(v_shift.date, v_shift.end_time);
  if now() < v_end then raise exception 'SHIFT_NOT_ENDED'; end if;

  if v_app.status = 'CheckedOut' then
    -- Luồng thường: worker đã check-out.
    update public.applications set status = 'Confirmed', confirmed_at = now()
      where id = p_application_id and status = 'CheckedOut';
    get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_CONFIRM'; end if;
  elsif v_app.status = 'CheckedIn'
        and v_app.marked_present_at is not null
        and v_app.check_out_at is null then
    -- Đóng thủ công đơn kẹt: worker chưa check-out nhưng employer đã xác nhận có mặt.
    -- KHÔNG bịa check_out_at; đánh dấu confirmed_without_checkout để audit.
    update public.applications
      set status = 'Confirmed', confirmed_at = now(), confirmed_without_checkout = true
      where id = p_application_id and status = 'CheckedIn' and check_out_at is null;
    get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_CONFIRM'; end if;
  else
    raise exception 'INVALID_STATE_FOR_CONFIRM';
  end if;

  -- Nhất quán shift: mọi slot-holder đã Confirmed → ca Completed.
  if not exists (
    select 1 from public.applications
    where shift_id = v_sid and status in ('Approved','CancellationRequested','CheckedIn','CheckedOut')
  ) then
    update public.shifts set status = 'Completed', updated_at = now() where id = v_sid;
  end if;
  return p_application_id;
end;
$$;
