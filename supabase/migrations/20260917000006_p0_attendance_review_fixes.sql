-- ===========================================================================
-- P0 · Attendance review fixes (2026-09-17) — corrective migration cho 0005.
-- 0005 ĐÃ apply lên remote, nên mọi thay đổi SQL nằm ở migration MỚI này.
--
-- (2) Đồng bộ time gate check-in: cửa sổ muộn start+5 → start+15 (khớp UI
--     CHECK_IN_LATE_MINUTES=15). Giữ nguyên kiểm quyền/trạng thái.
-- (3) Validation evidence phía server theo đúng domain contract
--     (src/domain/evidence.ts). Server là nguồn sự thật; client chỉ hỗ trợ UX:
--       - checklist phải là JSON ARRAY BOOLEAN (không nhận string/object/number).
--       - ChecklistOnly: đúng 2 phần tử, tất cả true.
--       - RequiredHandoverChecklist: đúng 3 phần tử, tất cả true, note (trim) không rỗng.
--       - None / OptionalPhoto: không ép.
--       - RequiredPhoto (dữ liệu cũ): upload ảnh thật CHƯA có → KHÔNG coi chuỗi
--         filename là ảnh đã tải; không ép "photo required" (tránh chặn oan/giả).
--     Bounds note ≤1000, filename ≤255, filename không chứa '/'/'\'.
--
-- CREATE OR REPLACE giữ nguyên chữ ký hàm → GRANT/REVOKE của 0005 vẫn còn hiệu lực.
-- search_path='' + tên đầy đủ + security definer giữ nguyên.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- (2) worker_check_in — cửa sổ muộn start+15
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

  if v_app.check_in_at is not null then return p_application_id; end if; -- idempotent

  v_start := public.shift_start_ts(v_shift.date, v_shift.start_time);
  v_end   := public.shift_end_ts(v_shift.date, v_shift.end_time);

  if v_app.status = 'Approved' then
    -- Cửa sổ [start-15p, start+15p] — đồng bộ UI CHECK_IN_LATE_MINUTES=15.
    if not (now() >= v_start - interval '15 minutes' and now() <= v_start + interval '15 minutes')
      then raise exception 'CHECK_IN_WINDOW_CLOSED'; end if;
  elsif v_app.status = 'CheckedIn' and v_app.check_in_at is null then
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
-- (3) worker_check_out — validation evidence đầy đủ theo domain contract
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
  if not (now() >= v_end and now() <= v_end + interval '60 minutes')
    then raise exception 'CHECKOUT_WINDOW_CLOSED'; end if;

  -- Bounds/shape của note & filename.
  v_note := btrim(coalesce(p_note, ''));
  if char_length(coalesce(p_note, '')) > 1000 then raise exception 'NOTE_TOO_LONG'; end if;
  v_file := btrim(coalesce(p_evidence_file_name, ''));
  if char_length(coalesce(p_evidence_file_name, '')) > 255 then raise exception 'EVIDENCE_FILENAME_INVALID'; end if;
  if v_file ~ '[/\\]' then raise exception 'EVIDENCE_FILENAME_INVALID'; end if;

  -- checklist (nếu gửi) PHẢI là JSON array boolean — chặn string/object/number.
  if p_checklist is not null then
    if jsonb_typeof(p_checklist) <> 'array' then raise exception 'EVIDENCE_INVALID'; end if;
    if exists (
      select 1 from jsonb_array_elements(p_checklist) e where jsonb_typeof(e) <> 'boolean'
    ) then raise exception 'EVIDENCE_INVALID'; end if;
  end if;
  v_len := case when p_checklist is null then 0 else jsonb_array_length(p_checklist) end;

  v_req := coalesce(v_shift.evidence_requirement, 'None');
  if v_req = 'ChecklistOnly' then
    if v_len <> 2 then raise exception 'CHECKLIST_INCOMPLETE'; end if;
    if exists (select 1 from jsonb_array_elements(p_checklist) e where e = to_jsonb(false)) then
      raise exception 'CHECKLIST_INCOMPLETE'; end if;
  elsif v_req = 'RequiredHandoverChecklist' then
    if v_len <> 3 then raise exception 'CHECKLIST_INCOMPLETE'; end if;
    if exists (select 1 from jsonb_array_elements(p_checklist) e where e = to_jsonb(false)) then
      raise exception 'CHECKLIST_INCOMPLETE'; end if;
    if v_note = '' then raise exception 'NOTE_REQUIRED'; end if;
  -- 'None' / 'OptionalPhoto': không ép.
  -- 'RequiredPhoto' (dữ liệu cũ): upload ảnh thật chưa có → KHÔNG ép filename giả.
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
