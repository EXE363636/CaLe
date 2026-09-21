-- Corrective CALE_MOCK payment flow.
-- 0007/0008 are already applied and intentionally remain unchanged.
-- A shift is published first. A payment session is created only for an
-- existing shift + Approved application, then HELD and finally RELEASED.

alter table public.payment_sessions
  add column if not exists shift_id uuid references public.shifts(id) on delete cascade,
  add column if not exists application_id uuid references public.applications(id) on delete cascade,
  add column if not exists platform_fee integer not null default 0,
  add column if not exists released_at timestamptz;

alter table public.payment_sessions drop constraint if exists payment_sessions_status_ck;
alter table public.payment_sessions add constraint payment_sessions_status_ck
  check (status in ('CREATED','PENDING','HELD','RELEASED','CANCELLED','EXPIRED'));

create unique index if not exists payment_sessions_application_uniq
  on public.payment_sessions(application_id) where application_id is not null;

create table if not exists public.mock_payment_ledger (
  id uuid primary key default gen_random_uuid(),
  payment_session_id uuid not null references public.payment_sessions(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  entry_type text not null check (entry_type in ('HOLD','WORKER_PAYOUT','PLATFORM_FEE')),
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique(payment_session_id, entry_type)
);
alter table public.mock_payment_ledger enable row level security;
revoke all on public.mock_payment_ledger from anon, authenticated;
grant select on public.mock_payment_ledger to authenticated;
grant all on public.mock_payment_ledger to service_role;
create policy mock_payment_ledger_select on public.mock_payment_ledger
  for select to authenticated using (
    exists (select 1 from public.payment_sessions p where p.id = payment_session_id and p.employer_id = auth.uid())
  );

drop function if exists public.create_payment_session(uuid, text, jsonb);
create or replace function public.create_payment_session(
  p_shift_id uuid, p_application_id uuid, p_channel_id uuid, p_client_request_id text
) returns public.payment_sessions language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_shift public.shifts; v_app public.applications;
  v_channel public.payment_channels; v_amount int; v_fee int; v_row public.payment_sessions;
begin
  perform public.require_active_employer();
  select * into v_shift from public.shifts where id = p_shift_id for share;
  if not found or v_shift.employer_id <> v_uid then raise exception 'SHIFT_NOT_FOUND'; end if;
  select * into v_app from public.applications where id = p_application_id for share;
  if not found or v_app.shift_id <> p_shift_id then raise exception 'APPLICATION_NOT_FOUND'; end if;
  if v_app.status <> 'Approved' then raise exception 'APPLICATION_NOT_APPROVED'; end if;
  select * into v_channel from public.payment_channels where id = p_channel_id and enabled and provider = 'CALE_MOCK';
  if not found then raise exception 'CHANNEL_NOT_AVAILABLE'; end if;
  if btrim(coalesce(p_client_request_id,'')) = '' then raise exception 'INVALID_CLIENT_REQUEST_ID'; end if;
  select * into v_row from public.payment_sessions where employer_id = v_uid and client_request_id = p_client_request_id;
  if found then return v_row; end if;
  v_amount := round(v_shift.hourly_wage * extract(epoch from (v_shift.end_time-v_shift.start_time))/3600.0)::int;
  v_fee := round(v_amount * 0.10)::int;
  insert into public.payment_sessions (employer_id,payment_channel_id,client_request_id,order_code,amount,
    status,provider,shift_payload,shift_id,application_id,platform_fee,expires_at)
  values (v_uid,p_channel_id,p_client_request_id,'CALE-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
    v_amount+v_fee,'PENDING','CALE_MOCK','{}'::jsonb,p_shift_id,p_application_id,v_fee,now()+interval '30 minutes')
  returning * into v_row;
  update public.payment_sessions set qr_payload = jsonb_build_object(
    'type','CALE_MOCK_PAYMENT','paymentId',v_row.id,'amount',v_row.amount,'currency','VND',
    'provider','CALE_MOCK','realTransaction',false)::text where id=v_row.id returning * into v_row;
  return v_row;
end; $$;

create or replace function public.confirm_payment_session(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_s public.payment_sessions; v_wage int;
begin
  perform public.require_active_employer();
  select * into v_s from public.payment_sessions where id=p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status in ('HELD','RELEASED') then return jsonb_build_object('status',v_s.status,'shift_id',v_s.shift_id); end if;
  if v_s.status <> 'PENDING' then raise exception 'INVALID_SESSION_STATE'; end if;
  if v_s.expires_at is not null and now()>v_s.expires_at then update public.payment_sessions set status='EXPIRED' where id=p_payment_id; raise exception 'SESSION_EXPIRED'; end if;
  update public.payment_sessions set status='HELD', paid_at=now(), provider_code='00', provider_message='mock hold', updated_at=now()
    where id=p_payment_id and status='PENDING';
  select payout_amount into v_wage from public.applications where id=v_s.application_id;
  insert into public.mock_payment_ledger(payment_session_id,shift_id,application_id,entry_type,amount)
    values (v_s.id,v_s.shift_id,v_s.application_id,'HOLD',v_s.amount) on conflict do nothing;
  return jsonb_build_object('status','HELD','shift_id',v_s.shift_id,'order_code',v_s.order_code);
end; $$;

create or replace function public.release_mock_payment(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_s public.payment_sessions; v_shift public.shifts; v_app public.applications; v_uid uuid:=auth.uid(); v_wage int;
begin
  select * into v_s from public.payment_sessions where id=p_payment_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.employer_id<>v_uid then raise exception 'NOT_OWNER'; end if;
  if v_s.status='RELEASED' then return jsonb_build_object('status','RELEASED'); end if;
  if v_s.status<>'HELD' then raise exception 'INVALID_SESSION_STATE'; end if;
  select * into v_shift from public.shifts where id=v_s.shift_id;
  select * into v_app from public.applications where id=v_s.application_id;
  if v_app.status<>'Confirmed' or v_shift.status<>'Completed' then raise exception 'SHIFT_NOT_COMPLETED'; end if;
  v_wage := coalesce(v_app.payout_amount, v_s.amount-v_s.platform_fee);
  update public.payment_sessions set status='RELEASED',released_at=now(),updated_at=now() where id=v_s.id;
  insert into public.mock_payment_ledger values (gen_random_uuid(),v_s.id,v_s.shift_id,v_s.application_id,'WORKER_PAYOUT',v_wage,now()) on conflict (payment_session_id,entry_type) do nothing;
  insert into public.mock_payment_ledger values (gen_random_uuid(),v_s.id,v_s.shift_id,v_s.application_id,'PLATFORM_FEE',v_s.platform_fee,now()) on conflict (payment_session_id,entry_type) do nothing;
  return jsonb_build_object('status','RELEASED','worker_payout',v_wage,'platform_fee',v_s.platform_fee);
end; $$;

alter function public.employer_confirm_completion(uuid) rename to employer_confirm_completion_before_payment_release;
create or replace function public.employer_confirm_completion(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_result uuid; v_payment uuid;
begin
  v_result := public.employer_confirm_completion_before_payment_release(p_application_id);
  select id into v_payment from public.payment_sessions where application_id=p_application_id and status='HELD' limit 1;
  if v_payment is not null then perform public.release_mock_payment(v_payment); end if;
  return v_result;
end; $$;

revoke execute on function public.create_payment_session(uuid,uuid,uuid,text) from public,anon;
revoke execute on function public.confirm_payment_session(uuid) from public,anon;
revoke execute on function public.release_mock_payment(uuid) from public,anon;
grant execute on function public.create_payment_session(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.confirm_payment_session(uuid) to authenticated;
grant execute on function public.release_mock_payment(uuid) to authenticated;