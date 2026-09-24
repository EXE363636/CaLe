-- =============================================================================
-- 0019 — Tự chốt ca quá hạn + "đến muộn → có mặt" + cảnh báo quỹ chi cho admin.
--
-- 1. Tự chốt (không để tiền kẹt khi employer không bấm gì): sau giờ kết thúc
--    ca + 24 giờ, với ca còn cọc HELD:
--      CheckedOut / CheckedIn         → Confirmed (tự xác nhận, trả công)
--      Approved (không ai điểm danh)  → NoShow
--      CancellationRequested (treo)   → Expired
--    rồi chốt cọc (_finalize_shift_deposit, 0018). Ca đã huỷ còn HELD → hoàn cọc.
--    Chạy: (a) client gọi sync_overdue_settlements() khi mở app (khớp quy tắc
--    "đồng bộ khi mount", không polling), (b) pg_cron 15 phút/lần nếu có.
-- 2. employer_revert_no_show: sửa nhầm vắng mặt (đến muộn) khi cọc CHƯA chốt.
-- 3. admin_payout_health: admin thấy lệnh rút thất bại vì Kênh chi hết tiền.
--
-- ADDITIVE + CORRECTIVE. Không sửa migration đã apply.
-- =============================================================================

alter table public.applications
  add column if not exists no_show_at timestamptz,
  add column if not exists no_show_reverted_at timestamptz,
  add column if not exists no_show_revert_reason text,
  add column if not exists auto_settled_at timestamptz;

-- ---------------------------------------------------------------------------
-- 1. employer_mark_no_show (0018) + dấu no_show_at.
-- ---------------------------------------------------------------------------
create or replace function public.employer_mark_no_show(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications; v_cnt int;
begin
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);

  if v_app.status = 'NoShow' then return p_application_id; end if;   -- idempotent
  if v_app.status <> 'Approved' or v_app.check_in_at is not null or v_app.marked_present_at is not null then
    raise exception 'INVALID_STATE_FOR_NO_SHOW';
  end if;
  if v_shift.status in ('Cancelled', 'Completed', 'Expired') then raise exception 'INVALID_STATE_FOR_NO_SHOW'; end if;
  if now() < public.shift_start_ts(v_shift.date, v_shift.start_time) + interval '15 minutes' then
    raise exception 'NO_SHOW_TOO_EARLY';
  end if;

  update public.applications set status = 'NoShow', no_show_at = now()
    where id = p_application_id and status = 'Approved';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_NO_SHOW'; end if;

  if not exists (
    select 1 from public.applications
    where shift_id = v_sid and status in ('Approved','CancellationRequested','CheckedIn','CheckedOut','Disputed')
  ) then
    if exists (select 1 from public.applications where shift_id = v_sid and status = 'Confirmed') then
      update public.shifts set status = 'Completed', updated_at = now() where id = v_sid;
    end if;
    perform public._finalize_shift_deposit(v_sid, false);
  end if;
  return p_application_id;
end; $$;

-- ---------------------------------------------------------------------------
-- 2. employer_revert_no_show — vắng mặt → có mặt (đến muộn). Chỉ khi cọc còn
--    HELD (chưa chốt/hoàn). Sau đó employer xác nhận hoàn thành như thường.
-- ---------------------------------------------------------------------------
create or replace function public.employer_revert_no_show(p_application_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_shift public.shifts; v_app public.applications;
        v_reason text := btrim(coalesce(p_reason, '')); v_cnt int;
begin
  if v_reason = '' then raise exception 'REASON_REQUIRED'; end if;
  if length(v_reason) > 500 then raise exception 'FIELD_TOO_LONG'; end if;
  select shift_id into v_sid from public.applications where id = p_application_id;
  if v_sid is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_sid for update;
  select * into v_app from public.applications where id = p_application_id for update;
  perform public.assert_employer_owner(v_shift.employer_id);

  if v_app.status <> 'NoShow' then raise exception 'INVALID_STATE_FOR_REVERT'; end if;
  if v_shift.status in ('Cancelled', 'Completed') then raise exception 'INVALID_STATE_FOR_REVERT'; end if;
  if exists (select 1 from public.payment_sessions where shift_id = v_sid and application_id is null)
     and not exists (select 1 from public.payment_sessions
                     where shift_id = v_sid and application_id is null and status = 'HELD') then
    raise exception 'DEPOSIT_NOT_HELD';
  end if;

  update public.applications
    set status = 'CheckedIn',
        marked_present_at = now(),
        marked_present_by_employer_id = auth.uid(),
        no_show_reverted_at = now(),
        no_show_revert_reason = v_reason
    where id = p_application_id and status = 'NoShow';
  get diagnostics v_cnt = row_count; if v_cnt <> 1 then raise exception 'INVALID_STATE_FOR_REVERT'; end if;
  return p_application_id;
end; $$;

revoke execute on function public.employer_revert_no_show(uuid, text) from public, anon;
grant execute on function public.employer_revert_no_show(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. _auto_settle_overdue — quét ca còn cọc HELD đã quá hạn. Idempotent, an
--    toàn khi chạy song song (skip locked). Nội bộ: KHÔNG grant authenticated.
-- ---------------------------------------------------------------------------
create or replace function public._auto_settle_overdue(p_limit int default 200)
returns int language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_sid uuid; v_shift public.shifts; v_n int := 0;
begin
  select array_agg(q.id) into v_ids from (
    select s.id from public.shifts s
    where exists (select 1 from public.payment_sessions p
                  where p.shift_id = s.id and p.application_id is null and p.status = 'HELD')
      and (s.status = 'Cancelled'
           or public.shift_end_ts(s.date, s.end_time) + interval '24 hours' <= now())
    order by s.date, s.end_time
    limit greatest(coalesce(p_limit, 200), 1)
  ) q;

  foreach v_sid in array coalesce(v_ids, '{}'::uuid[]) loop
    select * into v_shift from public.shifts where id = v_sid for update skip locked;
    if not found then continue; end if;   -- phiên khác đang xử lý ca này

    if v_shift.status <> 'Cancelled' then
      update public.applications
        set status = 'Confirmed', confirmed_at = now(), auto_settled_at = now(),
            confirmed_without_checkout = (status = 'CheckedIn')
        where shift_id = v_sid and status in ('CheckedOut', 'CheckedIn');
      update public.applications
        set status = 'NoShow', no_show_at = now(), auto_settled_at = now()
        where shift_id = v_sid and status = 'Approved';
      update public.applications
        set status = 'Expired', expired_at = now(),
            expired_reason = 'CANCELLATION_REQUEST_STALE', auto_settled_at = now()
        where shift_id = v_sid and status = 'CancellationRequested';

      if v_shift.status <> 'Completed'
         and exists (select 1 from public.applications where shift_id = v_sid and status = 'Confirmed')
         and not exists (select 1 from public.applications where shift_id = v_sid and status = 'Disputed') then
        update public.shifts set status = 'Completed', updated_at = now() where id = v_sid;
      end if;
    end if;

    perform public._finalize_shift_deposit(v_sid, v_shift.status = 'Cancelled');
    v_n := v_n + 1;
  end loop;
  return v_n;
end; $$;

revoke execute on function public._auto_settle_overdue(int) from public, anon, authenticated;

-- Client gọi khi mở app (mọi user đăng nhập): chỉ thực hiện việc ĐÃ đến hạn.
create or replace function public.sync_overdue_settlements()
returns int language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return public._auto_settle_overdue(50);
end; $$;

revoke execute on function public.sync_overdue_settlements() from public, anon;
grant execute on function public.sync_overdue_settlements() to authenticated;

-- pg_cron (nếu project bật được): quét 15 phút/lần kể cả khi không ai mở app.
-- Lỗi (extension không khả dụng) → chỉ NOTICE, không làm hỏng migration.
do $cron$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron không khả dụng (%), bỏ qua lịch tự chốt.', sqlerrm;
    return;
  end;
  begin
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'cale-auto-settle';
    perform cron.schedule('cale-auto-settle', '*/15 * * * *',
                          'select public._auto_settle_overdue(500)');
  exception when others then
    raise notice 'Không lên lịch được pg_cron (%).', sqlerrm;
  end;
end
$cron$;

-- ---------------------------------------------------------------------------
-- 4. admin_payout_health — tình trạng Kênh chi cho trang admin.
-- ---------------------------------------------------------------------------
create or replace function public.admin_payout_health()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return jsonb_build_object(
    'insufficientFailures24h', (
      select count(*) from public.payout_orders
      where status = 'FAILED' and created_at > now() - interval '24 hours'
        and (fail_reason ilike '%không đủ%' or fail_reason ilike '%insufficient%')),
    'lastInsufficientAt', (
      select max(created_at) from public.payout_orders
      where status = 'FAILED'
        and (fail_reason ilike '%không đủ%' or fail_reason ilike '%insufficient%')),
    'failed24h', (
      select count(*) from public.payout_orders
      where status = 'FAILED' and created_at > now() - interval '24 hours'),
    'processingCount', (
      select count(*) from public.payout_orders where status in ('PENDING', 'PROCESSING'))
  );
end; $$;

revoke execute on function public.admin_payout_health() from public, anon;
grant execute on function public.admin_payout_health() to authenticated;
