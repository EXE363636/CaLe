-- =============================================================================
-- BACKEND-MIGRATION-1 · Phase 2 — Shifts + Applications (v2)
-- Xem docs/PHASE_2_PLAN.md (v2.1). KHÔNG sửa migration Phase 1 đã apply.
-- File này CHƯA từng apply lên cale-dev → được viết lại trực tiếp (không phải corrective).
--
-- Nguyên tắc: RLS mọi bảng; MỌI mutation qua RPC SECURITY DEFINER (authenticated
-- không INSERT/UPDATE/DELETE trực tiếp); mọi definer set search_path='' + fully-
-- qualified + REVOKE EXECUTE PUBLIC/anon; RPC chỉ enforce dữ liệu server hiện có
-- (role/suspended/ownership/thời-gian-VN/trạng-thái/số-chỗ/uniqueness); tiền = MÔ
-- PHỎNG; Draft KHÔNG tồn tại trên server.
-- Tham số PL/pgSQL prefix `p_` để tránh ambiguity với cột.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bảng
-- ---------------------------------------------------------------------------

create table if not exists public.shifts (
  id                    uuid primary key default gen_random_uuid(),
  employer_id           uuid not null references public.users (id) on delete cascade,
  client_request_id     text not null,
  title                 text not null,
  description           text not null default '',
  requirements          text not null default '',
  job_type              text not null,
  custom_job_type_name  text,
  location              text not null,
  district              text,
  date                  date not null,
  start_time            time not null,
  end_time              time not null,
  hourly_wage           integer not null,
  positions_total       integer not null,
  positions_filled      integer not null default 0,
  status                text not null,
  escrow_status         text not null,
  deposit_amount        integer not null default 0,
  workplace_image_label text,
  workplace_notes       text,
  on_site_contact_name  text,
  on_site_contact_phone text,
  requires_verified_document_on_arrival boolean not null default false,
  evidence_requirement  text,
  cancelled_at          timestamptz,
  cancelled_by          text,
  employer_cancellation_reason text,
  reposted_from_shift_id uuid references public.shifts (id) on delete set null,
  timeline              jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint shifts_client_req_uniq unique (employer_id, client_request_id),
  constraint shifts_positions_ck check (positions_total >= 1 and positions_filled >= 0 and positions_filled <= positions_total),
  constraint shifts_wage_ck check (hourly_wage > 0),
  constraint shifts_time_ck check (end_time > start_time),
  constraint shifts_status_ck check (status in ('Published','FullyBooked','InProgress','AwaitingConfirmation','Completed','Cancelled','Expired')),
  constraint shifts_escrow_ck check (escrow_status in ('PendingDeposit','Deposited','InProgress','Completed','Released','Disputed','Refunded')),
  constraint shifts_cancelled_by_ck check (cancelled_by is null or cancelled_by in ('employer','admin')),
  constraint shifts_evidence_ck check (evidence_requirement is null or evidence_requirement in ('None','ChecklistOnly','OptionalPhoto','RequiredPhoto','RequiredHandoverChecklist'))
);
create index if not exists shifts_employer_idx on public.shifts (employer_id);
create index if not exists shifts_status_idx on public.shifts (status);

create table if not exists public.applications (
  id                        uuid primary key default gen_random_uuid(),
  shift_id                  uuid not null references public.shifts (id) on delete cascade,
  worker_id                 uuid not null references public.users (id) on delete cascade,
  status                    text not null,
  applied_at                timestamptz not null default now(),
  approved_at               timestamptz,
  rejection_reason          text,
  cancelled_at              timestamptz,
  cancellation_requested_at timestamptz,
  cancellation_reason_note  text,
  pre_cancellation_status   text,
  expired_at                timestamptz,
  expired_reason            text,
  payout_amount             integer,
  constraint applications_status_ck check (status in ('Pending','Approved','Rejected','CancelledByWorker','CancelledByEmployer','Expired','CancellationRequested','NoShow','CheckedIn','CheckedOut','Confirmed','Disputed')),
  constraint applications_payout_ck check (payout_amount is null or payout_amount >= 0)
);
create index if not exists applications_shift_idx on public.applications (shift_id);
create index if not exists applications_worker_idx on public.applications (worker_id);
create unique index if not exists applications_open_uniq
  on public.applications (shift_id, worker_id)
  where status not in ('Rejected', 'CancelledByWorker');

create table if not exists public.public_shifts (
  id                    uuid primary key references public.shifts (id) on delete cascade,
  employer_id           uuid not null,
  title                 text not null,
  description           text not null default '',
  requirements          text not null default '',
  job_type              text not null,
  custom_job_type_name  text,
  location              text not null,
  district              text,
  date                  date not null,
  start_time            time not null,
  end_time              time not null,
  hourly_wage           integer not null,
  positions_total       integer not null,
  positions_filled      integer not null,
  status                text not null,
  workplace_image_label text,
  workplace_notes       text,
  evidence_requirement  text,
  requires_verified_document_on_arrival boolean not null default false,
  created_at            timestamptz not null
);

-- ---------------------------------------------------------------------------
-- 2. RLS + grants
-- ---------------------------------------------------------------------------

alter table public.shifts        enable row level security;
alter table public.applications  enable row level security;
alter table public.public_shifts enable row level security;

create policy shifts_select on public.shifts
  for select to authenticated
  using (employer_id = auth.uid() or public.is_admin());

create policy applications_select on public.applications
  for select to authenticated
  using (
    worker_id = auth.uid()
    or exists (select 1 from public.shifts s where s.id = applications.shift_id and s.employer_id = auth.uid())
    or public.is_admin()
  );

create policy public_shifts_read on public.public_shifts
  for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
revoke all on public.shifts        from anon, authenticated;
revoke all on public.applications  from anon, authenticated;
revoke all on public.public_shifts from anon, authenticated;
grant select on public.shifts        to authenticated;
grant select on public.applications  to authenticated;
grant select on public.public_shifts to anon, authenticated;
grant select, insert, update, delete on public.shifts, public.applications, public.public_shifts to service_role;

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.shift_start_ts(p_date date, p_start time)
returns timestamptz language sql immutable set search_path = '' as $$
  select (p_date + p_start) at time zone 'Asia/Ho_Chi_Minh';
$$;

create or replace function public.count_slot_holders(p_shift uuid)
returns integer language sql stable set search_path = '' as $$
  select count(*)::int from public.applications
  where shift_id = p_shift
    and status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Confirmed');
$$;

create or replace function public.is_valid_vn_phone(p_phone text)
returns boolean language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(p_phone, ''), '[()\s-]', '', 'g') ~ '^(\+?84|0)[35789][0-9]{8}$';
$$;

create or replace function public.require_active_worker()
returns void language plpgsql stable set search_path = '' as $$
declare v_role text; v_susp boolean;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select role, suspended into v_role, v_susp from public.users where id = auth.uid();
  if v_role is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_susp then raise exception 'SUSPENDED'; end if;
  if v_role <> 'worker' then raise exception 'NOT_A_WORKER'; end if;
end;
$$;

create or replace function public.require_active_employer()
returns void language plpgsql stable set search_path = '' as $$
declare v_role text; v_susp boolean;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select role, suspended into v_role, v_susp from public.users where id = auth.uid();
  if v_role is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_susp then raise exception 'SUSPENDED'; end if;
  if v_role <> 'employer' then raise exception 'NOT_AN_EMPLOYER'; end if;
end;
$$;

-- Kiểm employer sở hữu. Phase 2: KHÔNG admin bypass mutation (admin chỉ ĐỌC —
-- xem RLS select + get_shift_detail). Admin mutation/override để phase sau; nhờ vậy
-- không có mơ hồ cancelled_by (luôn 'employer').
create or replace function public.assert_employer_owner(p_employer_id uuid)
returns void language plpgsql stable set search_path = '' as $$
declare v_role text; v_susp boolean;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select role, suspended into v_role, v_susp from public.users where id = auth.uid();
  if v_role is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_susp then raise exception 'SUSPENDED'; end if;
  if v_role <> 'employer' then raise exception 'NOT_AN_EMPLOYER'; end if;
  if p_employer_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
end;
$$;

-- Recompute positions_filled + đồng bộ Published <-> FullyBooked (giữ nguyên
-- các status khác). Caller phải đang giữ FOR UPDATE trên row shift.
create or replace function public.sync_shift_fill_status(p_shift uuid)
returns void language plpgsql set search_path = '' as $$
declare v_total int; v_status text; v_filled int;
begin
  select positions_total, status into v_total, v_status from public.shifts where id = p_shift;
  v_filled := public.count_slot_holders(p_shift);
  update public.shifts set
    positions_filled = v_filled,
    status = case when v_status in ('Published','FullyBooked')
                  then (case when v_filled >= v_total then 'FullyBooked' else 'Published' end)
                  else v_status end,
    updated_at = now()
  where id = p_shift;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger đồng bộ public_shifts (allowlist trạng thái)
-- ---------------------------------------------------------------------------

create or replace function public.sync_public_shift()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_shifts where id = old.id;
    return old;
  end if;
  if new.status in ('Published','FullyBooked') then
    insert into public.public_shifts (
      id, employer_id, title, description, requirements, job_type, custom_job_type_name,
      location, district, date, start_time, end_time, hourly_wage, positions_total,
      positions_filled, status, workplace_image_label, workplace_notes,
      evidence_requirement, requires_verified_document_on_arrival, created_at
    ) values (
      new.id, new.employer_id, new.title, new.description, new.requirements, new.job_type,
      new.custom_job_type_name, new.location, new.district, new.date, new.start_time,
      new.end_time, new.hourly_wage, new.positions_total, new.positions_filled, new.status,
      new.workplace_image_label, new.workplace_notes, new.evidence_requirement,
      new.requires_verified_document_on_arrival, new.created_at
    )
    on conflict (id) do update set
      title = excluded.title, description = excluded.description,
      requirements = excluded.requirements, job_type = excluded.job_type,
      custom_job_type_name = excluded.custom_job_type_name, location = excluded.location,
      district = excluded.district, date = excluded.date, start_time = excluded.start_time,
      end_time = excluded.end_time, hourly_wage = excluded.hourly_wage,
      positions_total = excluded.positions_total, positions_filled = excluded.positions_filled,
      status = excluded.status, workplace_image_label = excluded.workplace_image_label,
      workplace_notes = excluded.workplace_notes, evidence_requirement = excluded.evidence_requirement,
      requires_verified_document_on_arrival = excluded.requires_verified_document_on_arrival;
  else
    delete from public.public_shifts where id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_public_shift() from public, anon;
create trigger trg_sync_public_shift
  after insert or update or delete on public.shifts
  for each row execute function public.sync_public_shift();

-- ---------------------------------------------------------------------------
-- 5. RPC: publish_shift (server-validate → INSERT Published; idempotent; repost)
-- ---------------------------------------------------------------------------

create or replace function public.publish_shift(
  p_payload jsonb,
  p_client_request_id text,
  p_reposted_from_shift_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_req text := btrim(coalesce(p_client_request_id, ''));
  v_title text := btrim(coalesce(p_payload->>'title',''));
  v_job text := btrim(coalesce(p_payload->>'job_type',''));
  v_custom text := btrim(coalesce(p_payload->>'custom_job_type_name',''));
  v_loc text := btrim(coalesce(p_payload->>'location',''));
  v_cname text := btrim(coalesce(p_payload->>'on_site_contact_name',''));
  v_cphone text := btrim(coalesce(p_payload->>'on_site_contact_phone',''));
  v_evidence text := p_payload->>'evidence_requirement';
  -- Text thô — KHÔNG cast trong DECLARE (tránh lỗi cast thô của PostgreSQL).
  v_date_txt  text := p_payload->>'date';
  v_start_txt text := p_payload->>'start_time';
  v_end_txt   text := p_payload->>'end_time';
  v_wage_txt  text := p_payload->>'hourly_wage';
  v_total_txt text := p_payload->>'positions_total';
  v_date date; v_start time; v_end time; v_wage int; v_total int;
  -- Safe-parse boolean (không cast thô): chỉ 'true' → true.
  v_reqdoc boolean := (lower(coalesce(p_payload->>'requires_verified_document_on_arrival','false')) = 'true');
  v_hours numeric; v_deposit int; v_id uuid; v_src public.shifts;
begin
  perform public.require_active_employer();

  -- 0) Idempotency NGAY sau authorization + validate client_request_id: nếu đã tồn
  --    tại (employer_id, client_request_id) → trả ID cũ, KHÔNG validate lại payload
  --    (retry không bị SHIFT_IN_PAST sau khi ca đã tạo).
  if v_req = '' or length(v_req) > 200 then raise exception 'INVALID_CLIENT_REQUEST_ID'; end if;
  select id into v_id from public.shifts where employer_id = v_uid and client_request_id = v_req;
  if v_id is not null then return v_id; end if;

  -- 1) Validate text.
  if v_title = '' then raise exception 'TITLE_REQUIRED'; end if;
  if v_job = '' then raise exception 'JOB_TYPE_REQUIRED'; end if;
  if v_loc = '' then raise exception 'LOCATION_REQUIRED'; end if;
  if v_cname = '' then raise exception 'CONTACT_NAME_REQUIRED'; end if;
  if not public.is_valid_vn_phone(v_cphone) then raise exception 'CONTACT_PHONE_INVALID'; end if;
  if v_job = 'Khác' and v_custom = '' then raise exception 'CUSTOM_JOB_TYPE_REQUIRED'; end if;
  if v_evidence is not null and v_evidence not in ('None','ChecklistOnly','OptionalPhoto','RequiredPhoto','RequiredHandoverChecklist')
    then raise exception 'EVIDENCE_INVALID'; end if;

  -- 2) Presence + safe-cast typed fields → error code ỔN ĐỊNH (không lỗi cast thô).
  if v_date_txt is null or btrim(v_date_txt) = '' then raise exception 'DATE_REQUIRED'; end if;
  if v_start_txt is null or btrim(v_start_txt) = '' then raise exception 'TIME_REQUIRED'; end if;
  if v_end_txt is null or btrim(v_end_txt) = '' then raise exception 'TIME_REQUIRED'; end if;
  if v_wage_txt is null or btrim(v_wage_txt) = '' then raise exception 'INVALID_WAGE'; end if;
  if v_total_txt is null or btrim(v_total_txt) = '' then raise exception 'INVALID_POSITIONS'; end if;
  begin v_date := v_date_txt::date;   exception when others then raise exception 'DATE_REQUIRED'; end;
  begin v_start := v_start_txt::time; exception when others then raise exception 'TIME_REQUIRED'; end;
  begin v_end := v_end_txt::time;     exception when others then raise exception 'TIME_REQUIRED'; end;
  begin v_wage := v_wage_txt::int;    exception when others then raise exception 'INVALID_WAGE'; end;
  begin v_total := v_total_txt::int;  exception when others then raise exception 'INVALID_POSITIONS'; end;

  -- 3) Validate giá trị.
  if v_end <= v_start then raise exception 'INVALID_TIME_RANGE'; end if;
  if v_wage <= 0 then raise exception 'INVALID_WAGE'; end if;
  if v_total < 1 then raise exception 'INVALID_POSITIONS'; end if;
  if public.shift_start_ts(v_date, v_start) <= now() then raise exception 'SHIFT_IN_PAST'; end if;

  if p_reposted_from_shift_id is not null then
    select * into v_src from public.shifts where id = p_reposted_from_shift_id;
    if not found then raise exception 'REPOST_SOURCE_NOT_FOUND'; end if;
    if v_src.employer_id <> v_uid then raise exception 'REPOST_SOURCE_NOT_OWNED'; end if;
    if v_src.status not in ('Cancelled','Expired','Completed') then raise exception 'REPOST_SOURCE_NOT_REPOSTABLE'; end if;
  end if;

  v_hours := extract(epoch from (v_end - v_start)) / 3600.0;
  v_deposit := round(v_wage * v_hours * v_total)::int;

  insert into public.shifts (
    employer_id, client_request_id, title, description, requirements, job_type,
    custom_job_type_name, location, district, date, start_time, end_time, hourly_wage,
    positions_total, positions_filled, status, escrow_status, deposit_amount,
    workplace_image_label, workplace_notes, on_site_contact_name, on_site_contact_phone,
    requires_verified_document_on_arrival, evidence_requirement, reposted_from_shift_id,
    timeline
  ) values (
    v_uid, v_req, v_title, coalesce(p_payload->>'description',''),
    coalesce(p_payload->>'requirements',''), v_job,
    nullif(v_custom,''), v_loc, p_payload->>'district', v_date, v_start, v_end, v_wage,
    v_total, 0, 'Published', 'Deposited', v_deposit,
    p_payload->>'workplace_image_label', p_payload->>'workplace_notes', v_cname, v_cphone,
    v_reqdoc,
    v_evidence, p_reposted_from_shift_id,
    case when p_reposted_from_shift_id is not null
      then jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'occurredAt', now(),
             'kind', 'Reposted', 'note', p_reposted_from_shift_id::text))
      else '[]'::jsonb end
  )
  on conflict (employer_id, client_request_id) do nothing
  returning id into v_id;

  -- Idempotent retry: trả ca cũ, KHÔNG audit lặp.
  if v_id is null then
    select id into v_id from public.shifts where employer_id = v_uid and client_request_id = v_req;
    return v_id;
  end if;

  if p_reposted_from_shift_id is not null then
    update public.shifts set
      timeline = timeline || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(),
        'occurredAt', now(), 'kind', 'CreatedFromRepost', 'note', v_id::text)),
      updated_at = now()
    where id = p_reposted_from_shift_id and employer_id = v_uid;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: edit_shift (24h gate; editable fields; không date/wage; ≥ giữ chỗ)
-- ---------------------------------------------------------------------------

create or replace function public.edit_shift(p_shift_id uuid, p_patch jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_shift public.shifts;
  v_title text; v_job text; v_loc text; v_custom text;
  v_start_txt text := p_patch->>'start_time';
  v_end_txt text := p_patch->>'end_time';
  v_total_txt text := p_patch->>'positions_total';
  v_new_start time; v_new_end time; v_new_total int; v_holders int;
begin
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  perform public.assert_employer_owner(v_shift.employer_id);
  if v_shift.status not in ('Published','FullyBooked') then raise exception 'SHIFT_NOT_EDITABLE'; end if;
  -- 24h gate trên giờ bắt đầu CŨ: ca quá gần thì không cho sửa gì.
  if now() > (public.shift_start_ts(v_shift.date, v_shift.start_time) - interval '24 hours')
    then raise exception 'TOO_LATE'; end if;

  -- Ghép patch + trim + kiểm không rỗng (giữ invariant publish).
  v_title  := btrim(coalesce(p_patch->>'title', v_shift.title));
  v_job    := btrim(coalesce(p_patch->>'job_type', v_shift.job_type));
  v_loc    := btrim(coalesce(p_patch->>'location', v_shift.location));
  v_custom := btrim(coalesce(p_patch->>'custom_job_type_name', coalesce(v_shift.custom_job_type_name, '')));
  if v_title = '' then raise exception 'TITLE_REQUIRED'; end if;
  if v_job = '' then raise exception 'JOB_TYPE_REQUIRED'; end if;
  if v_loc = '' then raise exception 'LOCATION_REQUIRED'; end if;
  if v_job = 'Khác' and v_custom = '' then raise exception 'CUSTOM_JOB_TYPE_REQUIRED'; end if;

  -- Safe-cast (error code ổn định, không lỗi cast thô).
  v_new_start := v_shift.start_time;
  if v_start_txt is not null then
    begin v_new_start := v_start_txt::time; exception when others then raise exception 'TIME_REQUIRED'; end;
  end if;
  v_new_end := v_shift.end_time;
  if v_end_txt is not null then
    begin v_new_end := v_end_txt::time; exception when others then raise exception 'TIME_REQUIRED'; end;
  end if;
  if v_new_end <= v_new_start then raise exception 'INVALID_TIME_RANGE'; end if;

  -- 24h gate trên giờ bắt đầu MỚI: không cho dời start xuống dưới 24h.
  if now() > (public.shift_start_ts(v_shift.date, v_new_start) - interval '24 hours')
    then raise exception 'TOO_LATE'; end if;

  v_new_total := v_shift.positions_total;
  if v_total_txt is not null then
    begin v_new_total := v_total_txt::int; exception when others then raise exception 'INVALID_POSITIONS'; end;
  end if;
  v_holders := public.count_slot_holders(p_shift_id);
  if v_new_total < v_holders then raise exception 'POSITIONS_BELOW_FILLED'; end if;
  if v_new_total < 1 then raise exception 'INVALID_POSITIONS'; end if;

  -- CHỈ editable fields; KHÔNG đổi date/hourly_wage.
  update public.shifts set
    title = v_title,
    description = coalesce(p_patch->>'description', description),
    requirements = coalesce(p_patch->>'requirements', requirements),
    job_type = v_job,
    custom_job_type_name = nullif(v_custom, ''),
    location = v_loc,
    district = coalesce(p_patch->>'district', district),
    start_time = v_new_start,
    end_time = v_new_end,
    positions_total = v_new_total,
    updated_at = now()
  where id = p_shift_id;
  -- positions_total đổi có thể lật Published<->FullyBooked.
  perform public.sync_shift_fill_status(p_shift_id);
  return p_shift_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. RPC: cancel_shift (reason bắt buộc; gate 6h/active; xử lý mọi application)
-- ---------------------------------------------------------------------------

create or replace function public.cancel_shift(p_shift_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_shift public.shifts; v_reason text := btrim(coalesce(p_reason,'')); v_has_active boolean;
begin
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  perform public.assert_employer_owner(v_shift.employer_id);
  if v_reason = '' then raise exception 'REASON_REQUIRED'; end if;
  if v_shift.status in ('Cancelled','Completed','Expired') then raise exception 'TOO_LATE_STARTED'; end if;
  if now() >= public.shift_start_ts(v_shift.date, v_shift.start_time) then raise exception 'TOO_LATE_STARTED'; end if;
  -- Trong 6h trước giờ bắt đầu + có applicant active → chặn (parity store).
  if now() >= (public.shift_start_ts(v_shift.date, v_shift.start_time) - interval '6 hours') then
    select exists(select 1 from public.applications
      where shift_id = p_shift_id
        and status in ('Pending','Approved','CancellationRequested','CheckedIn','CheckedOut'))
      into v_has_active;
    if v_has_active then raise exception 'TOO_LATE_HAS_APPLICANTS'; end if;
  end if;

  update public.applications set status='Expired', expired_at=now(), expired_reason='SHIFT_CANCELLED'
    where shift_id = p_shift_id and status = 'Pending';
  update public.applications set status='CancelledByEmployer', cancelled_at=now()
    where shift_id = p_shift_id and status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Confirmed');

  update public.shifts set
    status='Cancelled', escrow_status='Refunded', positions_filled=0,
    cancelled_at=now(), cancelled_by='employer', employer_cancellation_reason=v_reason,
    timeline = timeline || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(),
      'occurredAt', now(), 'kind', 'EmployerCancelled')),
    updated_at=now()
  where id = p_shift_id;
  return p_shift_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPC: apply (worker)
-- ---------------------------------------------------------------------------

create or replace function public.apply(p_shift_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_shift public.shifts; v_app uuid;
begin
  perform public.require_active_worker();
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  if v_shift.status not in ('Published','FullyBooked') then raise exception 'SHIFT_NOT_AVAILABLE'; end if;
  if now() >= public.shift_start_ts(v_shift.date, v_shift.start_time) then raise exception 'SHIFT_ALREADY_STARTED'; end if;
  if public.count_slot_holders(p_shift_id) >= v_shift.positions_total then raise exception 'FULLY_BOOKED'; end if;
  begin
    insert into public.applications (shift_id, worker_id, status)
    values (p_shift_id, v_uid, 'Pending') returning id into v_app;
  exception when unique_violation then raise exception 'ALREADY_APPLIED';
  end;
  return v_app;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. RPC: withdraw(p_application_id, p_reason) — reason bắt buộc
-- ---------------------------------------------------------------------------

create or replace function public.withdraw(p_application_id uuid, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_shift public.shifts; v_app public.applications;
  v_reason text := btrim(coalesce(p_reason,'')); v_within3h boolean; v_cnt int;
begin
  perform public.require_active_worker();  -- authenticated + role worker + không suspended
  if v_reason = '' then raise exception 'REASON_REQUIRED'; end if;
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  -- Thứ tự khóa: shift trước, application sau.
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.worker_id <> v_uid then raise exception 'NOT_OWNER'; end if;

  if v_app.status = 'Pending' then
    update public.applications set status='CancelledByWorker', cancelled_at=now(),
      cancellation_reason_note=v_reason where id=p_application_id and status='Pending';
    get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_WITHDRAW'; end if;
    return 'CancelledByWorker';
  elsif v_app.status = 'Approved' then
    v_within3h := now() >= (public.shift_start_ts(v_shift.date, v_shift.start_time) - interval '3 hours');
    if v_within3h then
      update public.applications set status='CancellationRequested', pre_cancellation_status='Approved',
        cancellation_requested_at=now(), cancellation_reason_note=v_reason
        where id=p_application_id and status='Approved';
      get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_WITHDRAW'; end if;
      return 'CancellationRequested';
    else
      update public.applications set status='CancelledByWorker', cancelled_at=now(),
        cancellation_reason_note=v_reason where id=p_application_id and status='Approved';
      get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_WITHDRAW'; end if;
      perform public.sync_shift_fill_status(v_sid);
      return 'CancelledByWorker';
    end if;
  end if;
  raise exception 'INVALID_STATE_FOR_WITHDRAW';
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. RPC: approve / reject
-- ---------------------------------------------------------------------------

create or replace function public.approve(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_hours numeric; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);
  -- Re-verify SAU khi khóa (chống cancel song song hồi sinh app).
  if v_shift.status not in ('Published','FullyBooked') then raise exception 'SHIFT_NOT_AVAILABLE'; end if;
  if now() >= public.shift_start_ts(v_shift.date, v_shift.start_time) then raise exception 'SHIFT_ALREADY_STARTED'; end if;
  if v_app.status <> 'Pending' then raise exception 'INVALID_STATE_FOR_APPROVE'; end if;
  if public.count_slot_holders(v_sid) >= v_shift.positions_total then raise exception 'NO_SLOTS'; end if;

  v_hours := extract(epoch from (v_shift.end_time - v_shift.start_time)) / 3600.0;
  update public.applications set status='Approved', approved_at=now(),
    payout_amount = round(v_shift.hourly_wage * v_hours)::int
    where id=p_application_id and status='Pending';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_APPROVE'; end if;
  perform public.sync_shift_fill_status(v_sid);
  return p_application_id;
end;
$$;

create or replace function public.reject(p_application_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_reason text := btrim(coalesce(p_reason,'')); v_cnt int;
begin
  if v_reason = '' then raise exception 'REASON_REQUIRED'; end if;
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);
  if v_app.status <> 'Pending' then raise exception 'INVALID_STATE_FOR_REJECT'; end if;

  update public.applications set status='Rejected', rejection_reason=v_reason
    where id=p_application_id and status='Pending';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_REJECT'; end if;
  return p_application_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. RPC: approve / reject cancellation request
-- ---------------------------------------------------------------------------

create or replace function public.approve_cancellation_request(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);
  if v_app.status <> 'CancellationRequested' then raise exception 'INVALID_STATE'; end if;

  update public.applications set status='CancelledByWorker', cancelled_at=now()
    where id=p_application_id and status='CancellationRequested';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE'; end if;
  perform public.sync_shift_fill_status(v_sid);
  return p_application_id;
end;
$$;

create or replace function public.reject_cancellation_request(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);
  if v_app.status <> 'CancellationRequested' then raise exception 'INVALID_STATE'; end if;

  update public.applications set status='Approved', cancellation_requested_at=null,
    cancellation_reason_note=null, pre_cancellation_status=null
    where id=p_application_id and status='CancellationRequested';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE'; end if;
  return p_application_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. RPC: get_shift_detail (read model theo vai; chặn anon)
-- ---------------------------------------------------------------------------

create or replace function public.get_shift_detail(p_shift_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_shift public.shifts; v_is_owner boolean;
  v_is_admin boolean := public.is_admin(); v_app public.applications; v_base jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  v_is_owner := (v_shift.employer_id = v_uid);
  select * into v_app from public.applications
    where shift_id = p_shift_id and worker_id = v_uid order by applied_at desc limit 1;
  if not v_is_owner and not v_is_admin and v_app.id is null then raise exception 'NOT_AUTHORIZED'; end if;

  v_base := jsonb_build_object(
    'id', v_shift.id, 'employer_id', v_shift.employer_id, 'title', v_shift.title,
    'description', v_shift.description, 'requirements', v_shift.requirements,
    'job_type', v_shift.job_type, 'custom_job_type_name', v_shift.custom_job_type_name,
    'location', v_shift.location, 'district', v_shift.district, 'date', v_shift.date,
    'start_time', v_shift.start_time, 'end_time', v_shift.end_time,
    'hourly_wage', v_shift.hourly_wage, 'positions_total', v_shift.positions_total,
    'positions_filled', v_shift.positions_filled, 'status', v_shift.status,
    'workplace_image_label', v_shift.workplace_image_label, 'workplace_notes', v_shift.workplace_notes,
    'evidence_requirement', v_shift.evidence_requirement,
    'requires_verified_document_on_arrival', v_shift.requires_verified_document_on_arrival,
    'created_at', v_shift.created_at);

  if v_is_owner or v_is_admin or v_app.status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Confirmed') then
    v_base := v_base || jsonb_build_object(
      'on_site_contact_name', v_shift.on_site_contact_name,
      'on_site_contact_phone', v_shift.on_site_contact_phone);
  end if;
  return v_base;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. EXECUTE grants
-- ---------------------------------------------------------------------------

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.publish_shift(jsonb, text, uuid)',
    'public.edit_shift(uuid, jsonb)',
    'public.cancel_shift(uuid, text)',
    'public.apply(uuid)',
    'public.withdraw(uuid, text)',
    'public.approve(uuid)',
    'public.reject(uuid, text)',
    'public.approve_cancellation_request(uuid)',
    'public.reject_cancellation_request(uuid)',
    'public.get_shift_detail(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated;', fn);
  end loop;
end;
$$;

revoke execute on function public.shift_start_ts(date, time) from public, anon;
revoke execute on function public.count_slot_holders(uuid) from public, anon;
revoke execute on function public.is_valid_vn_phone(text) from public, anon;
revoke execute on function public.require_active_worker() from public, anon;
revoke execute on function public.require_active_employer() from public, anon;
revoke execute on function public.assert_employer_owner(uuid) from public, anon;
revoke execute on function public.sync_shift_fill_status(uuid) from public, anon;
