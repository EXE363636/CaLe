-- =============================================================================
-- 0033 — Gia cố lượt quét tự chốt cọc (rà soát ổn định 03/10)
-- =============================================================================
-- 1. _auto_settle_overdue (0019) không bắt lỗi theo từng ca: MỘT ca lỗi (vd.
--    DEPOSIT_EXCEEDED khi trả công) làm rollback cả lô 500 ca. Danh sách sắp theo
--    ngày nên ca lỗi luôn đứng đầu → mọi lần cron / app gọi đều hỏng → KHÔNG ca
--    quá hạn nào của ai được chốt nữa. Sửa: mỗi ca một khối begin/exception (như
--    _settle_worker_holds_overdue của 0028), lỗi chỉ ghi warning rồi đi tiếp.
-- 2. refund_deposit_for_shift (0018) cho NTD hoàn cọc từ hết ca + 60 phút với
--    allow_stale, KHÔNG đóng đơn Approved / CancellationRequested → cọc hết HELD
--    nên lượt tự chốt không bao giờ chọn lại ca → đơn treo "Đã duyệt" mãi, cọc
--    người lao động (0028) rơi vào hoàn dự phòng 7 ngày thay vì xử vắng mặt.
--    Sửa: đóng đơn treo đúng như lượt tự chốt (_close_overdue_applications) rồi mới
--    chốt cọc. Approved → NoShow có auto_settled_at (hệ thống đánh vắng, NTD không
--    tự xác nhận) → cọc người lao động chuyển Contested chờ admin, như 0028.
-- 3. Đơn Pending khi ca đã bắt đầu không bao giờ hết hạn ở server (chỉ bản demo
--    làm ở client) → hiện "Chờ duyệt" mãi, chiếm worker_deposit_max_open tới lượt
--    quét cọc. Sửa: _expire_started_pending → Expired, lý do 'SHIFT_STARTED';
--    trigger 0028 hoàn cọc người lao động ngay khi đổi trạng thái.
--    Chạy ở đầu _auto_settle_overdue (cron 'cale-auto-settle' 15 phút + app gọi
--    sync_overdue_settlements) → không cần lịch cron mới.
-- 4. sync_overdue_settlements (0028) chạy MỖI lần người dùng mở / quay lại tab:
--    nhiều người cùng lúc → các lượt quét chồng nhau tranh khoá, dễ chạm
--    statement_timeout 8s của authenticated rồi rollback. Sửa: khoá tư vấn toàn
--    cục dạng try → đang có lượt quét khác thì bỏ qua; cron (_auto_settle_overdue)
--    lấy cùng khoá dạng chờ → không chạy chồng lượt từ app.
-- 5. admin_payout_health thêm stuckDeposits: ca lỗi giờ chỉ ghi warning vào log
--    nên admin phải thấy số ca còn cọc HELD quá hạn tự chốt (banner admin).
--
-- Không đổi: chữ ký hàm, quyền, lịch cron, bảng. Chạy lại được nhiều lần
-- (create or replace).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Đóng đơn còn treo của một ca đã quá giờ (dùng chung cho tự chốt + hoàn cọc).
--    Người gọi đã khoá hàng shifts. Nội bộ: KHÔNG grant authenticated.
-- ---------------------------------------------------------------------------
create or replace function public._close_overdue_applications(p_shift_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.applications
    set status = 'Confirmed', confirmed_at = now(), auto_settled_at = now(),
        confirmed_without_checkout = (status = 'CheckedIn')
    where shift_id = p_shift_id and status in ('CheckedOut', 'CheckedIn');
  update public.applications
    set status = 'NoShow', no_show_at = now(), auto_settled_at = now()
    where shift_id = p_shift_id and status = 'Approved';
  update public.applications
    set status = 'Expired', expired_at = now(),
        expired_reason = 'CANCELLATION_REQUEST_STALE', auto_settled_at = now()
    where shift_id = p_shift_id and status = 'CancellationRequested';

  if exists (select 1 from public.applications where shift_id = p_shift_id and status = 'Confirmed')
     and not exists (select 1 from public.applications where shift_id = p_shift_id and status = 'Disputed') then
    update public.shifts set status = 'Completed', updated_at = now()
      where id = p_shift_id and status not in ('Completed', 'Cancelled');
  end if;
end; $$;

revoke execute on function public._close_overdue_applications(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Đơn Pending khi ca đã bắt đầu → Expired ('SHIFT_STARTED'). Nội bộ.
--    approve() đã chặn duyệt sau giờ bắt đầu (SHIFT_ALREADY_STARTED) nên đơn này
--    không còn đường nào thành ca làm. skip locked: đơn đang bị phiên khác khoá
--    (vd. người lao động đang tự rút) → để lượt sau.
-- ---------------------------------------------------------------------------
create or replace function public._expire_started_pending(p_limit int default 200)
returns int language plpgsql security definer set search_path = '' as $$
declare r record; v_n int := 0;
begin
  for r in
    select a.id from public.applications a
      join public.shifts s on s.id = a.shift_id
     where a.status = 'Pending'
       and public.shift_start_ts(s.date, s.start_time) <= now()
     order by s.date, s.start_time
     limit greatest(coalesce(p_limit, 200), 1)
  loop
    -- Mỗi đơn một khối (trigger 0028 hoàn cọc người lao động có thể lỗi riêng
    -- một đơn): lỗi không kéo cả lô.
    begin
      perform 1 from public.applications where id = r.id and status = 'Pending' for update skip locked;
      if not found then continue; end if;
      update public.applications
         set status = 'Expired', expired_at = now(), expired_reason = 'SHIFT_STARTED'
       where id = r.id and status = 'Pending';
      v_n := v_n + 1;
    exception when others then
      raise warning 'hết hạn đơn % bỏ qua: %', r.id, sqlerrm;
    end;
  end loop;
  return v_n;
end; $$;

revoke execute on function public._expire_started_pending(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. _auto_settle_overdue — bản 0019 + bắt lỗi theo từng ca + hết hạn đơn Pending.
-- ---------------------------------------------------------------------------
create or replace function public._auto_settle_overdue(p_limit int default 200)
returns int language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_sid uuid; v_shift public.shifts; v_n int := 0;
begin
  -- Cùng khoá với sync_overdue_settlements: cron CHỜ lượt quét từ app (≤ 8 giây)
  -- xong rồi mới chạy, không chạy chồng (tránh deadlock trên ví khi hai lượt khoá
  -- đơn của cùng người lao động theo thứ tự khác nhau). App gọi qua sync đã giữ
  -- khoá (khoá tư vấn lồng được trong cùng phiên).
  perform pg_advisory_xact_lock(hashtextextended('cale:sync_overdue_settlements', 0));

  begin
    v_n := public._expire_started_pending(p_limit);
  exception when others then
    raise warning 'hết hạn đơn chờ duyệt lỗi: %', sqlerrm;
  end;

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
    -- Mỗi ca một khối: lỗi chỉ rollback ca đó (kể cả đổi trạng thái đơn), các ca
    -- khác vẫn được chốt. Ca lỗi vẫn HELD → lượt sau thử lại, warning ghi log.
    begin
      select * into v_shift from public.shifts where id = v_sid for update skip locked;
      if not found then continue; end if;   -- phiên khác đang xử lý ca này

      if v_shift.status <> 'Cancelled' then
        perform public._close_overdue_applications(v_sid);
      end if;

      perform public._finalize_shift_deposit(v_sid, v_shift.status = 'Cancelled');
      v_n := v_n + 1;
    exception when others then
      raise warning 'tự chốt ca % bỏ qua: %', v_sid, sqlerrm;
    end;
  end loop;
  return v_n;
end; $$;

revoke execute on function public._auto_settle_overdue(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. refund_deposit_for_shift — bản 0018 + đóng đơn treo trước khi chốt cọc.
-- ---------------------------------------------------------------------------
create or replace function public.refund_deposit_for_shift(p_shift_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_shift public.shifts;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'SHIFT_NOT_FOUND'; end if;
  if v_shift.employer_id <> v_uid then raise exception 'NOT_OWNER'; end if;

  if v_shift.status <> 'Cancelled' then
    if now() < public.shift_end_ts(v_shift.date, v_shift.end_time) + interval '60 minutes' then
      raise exception 'SHIFT_NOT_REFUNDABLE';
    end if;
    if exists (select 1 from public.applications
               where shift_id = p_shift_id and status in ('CheckedIn','CheckedOut','Disputed')) then
      raise exception 'SHIFT_NOT_REFUNDABLE';
    end if;
    -- Còn Approved / CancellationRequested → đóng như lượt tự chốt (không để treo).
    perform public._close_overdue_applications(p_shift_id);
  end if;
  return public._finalize_shift_deposit(p_shift_id, true);
end; $$;

revoke execute on function public.refund_deposit_for_shift(uuid) from public, anon;
grant execute on function public.refund_deposit_for_shift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. sync_overdue_settlements — bản 0028 + chỉ một lượt quét từ app tại một lúc.
-- ---------------------------------------------------------------------------
create or replace function public.sync_overdue_settlements()
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int := 0;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  -- Khoá giữ tới hết transaction của RPC. Đang có lượt khác → bỏ qua (việc đã tới
  -- hạn sẽ được lượt đó / cron xử lý), không chờ.
  if not pg_try_advisory_xact_lock(hashtextextended('cale:sync_overdue_settlements', 0)) then
    return 0;
  end if;
  begin
    v_n := public._auto_settle_overdue(50);
  exception when others then
    raise warning 'tự chốt lỗi: %', sqlerrm;
  end;
  begin
    v_n := v_n + public._settle_worker_holds_overdue(50);
  exception when others then
    raise warning 'quét cọc worker lỗi: %', sqlerrm;
  end;
  return v_n;
end; $$;

revoke execute on function public.sync_overdue_settlements() from public, anon;
grant execute on function public.sync_overdue_settlements() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. admin_payout_health — bản 0019 + stuckDeposits: lượt quét giờ bỏ qua ca lỗi
--    (chỉ ghi warning vào log) → admin cần thấy ca có cọc kẹt HELD quá hạn tự chốt
--    (hết ca + 25 giờ, hoặc đã huỷ hơn 1 giờ; cron chạy 15 phút một lần).
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
      select count(*) from public.payout_orders where status in ('PENDING', 'PROCESSING')),
    'stuckDeposits', (
      select count(*) from public.payment_sessions p
        join public.shifts s on s.id = p.shift_id
       where p.application_id is null and p.status = 'HELD'
         and ((s.status = 'Cancelled' and coalesce(s.cancelled_at, s.updated_at) <= now() - interval '1 hour')
              or public.shift_end_ts(s.date, s.end_time) + interval '25 hours' <= now()))
  );
end; $$;

revoke execute on function public.admin_payout_health() from public, anon;
grant execute on function public.admin_payout_health() to authenticated;
