-- =============================================================================
-- 0028 — Cọc người lao động (P2-1, feedback F9 "cọc hai đầu")
-- =============================================================================
-- Chủ dự án chốt 29–30/09 (HANDOFF_SESSION_2026-09-28_FEEDBACK mục 3 P2-1 + mục 5
-- câu 4; 4 điểm bổ sung duyệt 30/09):
--   * Cọc = min(round(tiền công ca × 50%), 100.000 đ). Giữ lúc ỨNG TUYỂN.
--   * Miễn cọc: đã duyệt CCCD, HOẶC ≥5 đơn hoàn thành có giờ kết thúc ca trong
--     30 ngày gần nhất (cửa sổ trượt tới lúc ứng tuyển).
--   * Vắng mặt trong 30 ngày → LUÔN cọc (kể cả đã duyệt CCCD / đủ ca). Lần vắng
--     mà admin xử có lợi cho worker (khiếu nại thắng) KHÔNG tính.
--   * Hoàn đủ: đơn Rejected / CancelledByWorker / CancelledByEmployer / Expired /
--     Confirmed, hoặc ca đã bắt đầu mà đơn vẫn Pending.
--   * Vắng mặt → giữ tới hạn = max(hết ca, lúc bị đánh vắng) + 72h. Worker khiếu
--     nại trong hạn → admin quyết. Hết hạn không khiếu nại → 100% về ví TIỀN MẶT
--     nhà tuyển dụng (rút được). CaLẻ không giữ phần nào.
--   * Cờ `require_worker_deposit` mặc định TẮT. Tắt cờ chỉ dừng giữ cọc MỚI; các
--     khoản đang giữ vẫn được hoàn / chuyển như thường.
-- Sau security review 30/09 (chủ dự án duyệt):
--   * T2 — mỗi worker tối đa 3 khoản Held/Contested cùng lúc; mỗi NTD TỰ nhận tối
--     đa 300.000 đ cọc vắng mặt / 24 giờ, vượt → khoản chờ admin (chống thông
--     đồng chuyển tiền worker → NTD). Cả hai là cài đặt admin.
--   * T3 — hạn khiếu nại 72 giờ (thay 24 giờ).
--   * Vắng mặt do HỆ THỐNG tự đánh (0019, auto_settled_at — NTD không xác nhận
--     gì) → khoản chờ admin (review_reason='AUTO_NO_SHOW'), không tự chuyển.
--     Chỉ vắng mặt do NTD tự đánh mới tự chuyển sau hạn.
--   * L1 — worker KHÔNG có cọc (được miễn) vẫn khiếu nại được vắng mặt
--     (no_show_contests); admin chấp nhận → lần vắng đó không tính mất miễn cọc.
--   * L2 — khoản Held mà đơn chưa kết thúc sau hết ca + 7 ngày → hoàn dự phòng.
--   * L3 — quét từng khoản trong khối exception riêng; lỗi quét cọc không kéo
--     rollback phần tự chốt 0019.
--   * L4 — khoá ngoại worker_holds / no_show_contests: on delete RESTRICT.
--   * L5 — admin không tự xử khoản / khiếu nại mà mình là worker hoặc NTD.
--   * L6 — worker chỉ đọc các cột cần thiết (không thấy resolved_by).
--
-- Mô hình tiền (giống cọc nhà tuyển dụng — chuyển giữa các ví, két KHÔNG đổi):
--   Giữ   : ví worker −X          (WorkerDepositHeld)
--   Hoàn  : ví worker +X          (WorkerDepositRefund)
--   Chuyển: ví tiền mặt NTD +X    (EmployerNoShowCompensation)
--   Túi thưởng (0026) không liên quan: cọc worker chỉ dùng tiền mặt.
--
-- An toàn:
--   * `apply` (bản cũ) KHÔNG BAO GIỜ trừ ví: cần cọc → WORKER_DEPOSIT_REQUIRED.
--     Trừ ví chỉ qua `apply_with_deposit(shift, số tiền worker đã đồng ý)`; số
--     cọc thực tế > số đã đồng ý → WORKER_DEPOSIT_CHANGED.
--   * Hoàn cọc qua TRIGGER trên applications.status → phủ mọi đường đổi trạng
--     thái (withdraw, reject, duyệt yêu cầu huỷ, cancel_shift, xác nhận hoàn
--     thành, tự chốt 0019) mà không phải bọc từng hàm. Idempotent theo trạng
--     thái khoản giữ + unique index trên ledger.
--   * Thứ tự khoá thống nhất: applications → worker_holds → wallets.
--
-- Client khớp bằng src/domain/workerDeposit.ts (có property test bảo toàn tiền).
-- Định nghĩa lại: apply (0022 — rename + wrapper), sync_overdue_settlements (0019).
-- ADDITIVE. Không sửa migration đã apply.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cài đặt (mặc định TẮT)
-- ---------------------------------------------------------------------------
alter table public.platform_settings
  add column if not exists require_worker_deposit          boolean not null default false,
  add column if not exists worker_deposit_ratio_pct        integer not null default 50
    check (worker_deposit_ratio_pct between 0 and 100),
  add column if not exists worker_deposit_max              integer not null default 100000
    check (worker_deposit_max >= 0),
  add column if not exists worker_deposit_exempt_after     integer not null default 5
    check (worker_deposit_exempt_after >= 0),
  add column if not exists worker_deposit_window_days      integer not null default 30
    check (worker_deposit_window_days between 1 and 365),
  add column if not exists worker_deposit_max_open         integer not null default 3
    check (worker_deposit_max_open between 1 and 20),
  add column if not exists worker_deposit_forfeit_daily_cap integer not null default 300000
    check (worker_deposit_forfeit_daily_cap >= 0);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Bảng khoản giữ cọc (1 đơn ứng tuyển ↔ tối đa 1 khoản)
-- ---------------------------------------------------------------------------
create table if not exists public.worker_holds (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null unique references public.applications(id) on delete restrict,
  worker_id       uuid not null references public.users(id) on delete restrict,
  shift_id        uuid not null references public.shifts(id) on delete restrict,
  employer_id     uuid not null references public.users(id) on delete restrict,
  amount          integer not null check (amount > 0),
  status          text not null default 'Held'
                  check (status in ('Held', 'Contested', 'Refunded', 'Forfeited')),
  contest_reason  text,
  contested_at    timestamptz,
  -- Hệ thống đưa khoản sang chờ admin (không phải worker khiếu nại).
  review_reason   text check (review_reason is null or review_reason in ('AUTO_NO_SHOW', 'EMPLOYER_DAILY_CAP')),
  resolution      text check (resolution is null or resolution in ('WORKER', 'EMPLOYER')),
  resolution_note text,
  resolved_by     uuid references public.users(id) on delete set null,
  resolved_at     timestamptz,
  settled_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists worker_holds_worker_idx on public.worker_holds (worker_id);
create index if not exists worker_holds_open_idx
  on public.worker_holds (status, created_at) where status in ('Held', 'Contested');

alter table public.worker_holds enable row level security;
revoke all on public.worker_holds from public, anon, authenticated;
-- L6: worker chỉ đọc cột cần hiển thị (không employer_id / resolved_by).
grant select (id, application_id, worker_id, shift_id, amount, status, contest_reason, contested_at,
              review_reason, resolution, resolution_note, settled_at, created_at)
  on public.worker_holds to authenticated;
grant all on public.worker_holds to service_role;
drop policy if exists worker_holds_sel on public.worker_holds;
-- Worker xem khoản của mình. Admin đọc qua RPC. NTD thấy tiền nhận qua sổ ví.
create policy worker_holds_sel on public.worker_holds
  for select to authenticated using (worker_id = auth.uid());

-- L1: khiếu nại vắng mặt KHÔNG kèm cọc (worker được miễn cọc).
create table if not exists public.no_show_contests (
  application_id  uuid primary key references public.applications(id) on delete restrict,
  worker_id       uuid not null references public.users(id) on delete restrict,
  reason          text not null,
  status          text not null default 'Pending' check (status in ('Pending', 'Upheld', 'Rejected')),
  resolution_note text,
  resolved_by     uuid references public.users(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists no_show_contests_pending_idx
  on public.no_show_contests (created_at) where status = 'Pending';

alter table public.no_show_contests enable row level security;
revoke all on public.no_show_contests from public, anon, authenticated;
grant select (application_id, worker_id, reason, status, resolution_note, resolved_at, created_at)
  on public.no_show_contests to authenticated;
grant all on public.no_show_contests to service_role;
drop policy if exists no_show_contests_sel on public.no_show_contests;
create policy no_show_contests_sel on public.no_show_contests
  for select to authenticated using (worker_id = auth.uid());

-- Mỗi đơn chỉ giữ / hoàn / chuyển MỘT lần (chống trùng ở tầng sổ ví).
create unique index if not exists wallet_ledger_worker_hold_once_idx
  on public.wallet_ledger (application_id, kind)
  where kind in ('WorkerDepositHeld', 'WorkerDepositRefund', 'EmployerNoShowCompensation')
    and application_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Hàm thuần (khớp src/domain/workerDeposit.ts)
-- ---------------------------------------------------------------------------
create or replace function public._worker_deposit_amount(p_wage int, p_ratio_pct int, p_max int)
returns int language sql immutable set search_path = '' as $$
  select greatest(0, least(
    round(greatest(coalesce(p_wage, 0), 0)::numeric * coalesce(p_ratio_pct, 0) / 100)::int,
    coalesce(p_max, 0)));
$$;

-- T3: hạn khiếu nại 72 giờ (NO_SHOW_CONTEST_HOURS).
create or replace function public._worker_hold_forfeit_deadline(p_shift_end timestamptz, p_no_show_at timestamptz)
returns timestamptz language sql immutable set search_path = '' as $$
  select greatest(p_shift_end, coalesce(p_no_show_at, p_shift_end)) + interval '72 hours';
$$;

revoke execute on function public._worker_deposit_amount(int, int, int) from public, anon, authenticated;
revoke execute on function public._worker_hold_forfeit_deadline(timestamptz, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. _worker_deposit_status — worker có cần cọc không (khớp workerDepositExemption)
-- ---------------------------------------------------------------------------
create or replace function public._worker_deposit_status(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_s public.platform_settings;
  v_verified timestamptz;
  v_window interval;
  v_completed int;
  v_open int;
  v_last_no_show timestamptz;
  v_blocked timestamptz;
  v_enabled boolean;
  v_needs boolean;
  v_reason text;
begin
  select * into v_s from public.platform_settings where id;
  select identity_verified_at into v_verified from public.users where id = p_uid;
  v_window := make_interval(days => coalesce(v_s.worker_deposit_window_days, 30));

  select count(*) into v_completed
    from public.applications a
    join public.shifts s on s.id = a.shift_id
   where a.worker_id = p_uid and a.status = 'Confirmed'
     and public.shift_end_ts(s.date, s.end_time) > now() - v_window
     and public.shift_end_ts(s.date, s.end_time) <= now();

  -- Lần vắng được admin xử có lợi cho worker (có cọc hoặc không) không tính.
  select max(a.no_show_at) into v_last_no_show
    from public.applications a
   where a.worker_id = p_uid and a.status = 'NoShow' and a.no_show_at is not null
     and not exists (select 1 from public.worker_holds h
                     where h.application_id = a.id and h.resolution = 'WORKER')
     and not exists (select 1 from public.no_show_contests c
                     where c.application_id = a.id and c.status = 'Upheld');
  if v_last_no_show is not null and now() < v_last_no_show + v_window then
    v_blocked := v_last_no_show + v_window;
  end if;

  select count(*) into v_open from public.worker_holds
   where worker_id = p_uid and status in ('Held', 'Contested');

  v_enabled := coalesce(v_s.require_worker_deposit, false);
  if not v_enabled then
    v_needs := false; v_reason := 'DISABLED';
  elsif v_blocked is not null then
    v_needs := true;  v_reason := 'RECENT_NO_SHOW';
  elsif v_verified is not null then
    v_needs := false; v_reason := 'IDENTITY';
  elsif v_completed >= coalesce(v_s.worker_deposit_exempt_after, 5) then
    v_needs := false; v_reason := 'COMPLETED_SHIFTS';
  else
    v_needs := true;  v_reason := 'NOT_ENOUGH';
  end if;

  return jsonb_build_object(
    'enabled', v_enabled,
    'needsDeposit', v_needs,
    'reason', v_reason,
    'completedInWindow', v_completed,
    'blockedUntil', v_blocked,
    'openHolds', v_open,
    'ratioPct', coalesce(v_s.worker_deposit_ratio_pct, 50),
    'maxAmount', coalesce(v_s.worker_deposit_max, 100000),
    'exemptAfter', coalesce(v_s.worker_deposit_exempt_after, 5),
    'windowDays', coalesce(v_s.worker_deposit_window_days, 30),
    'maxOpenHolds', coalesce(v_s.worker_deposit_max_open, 3),
    'forfeitDailyCap', coalesce(v_s.worker_deposit_forfeit_daily_cap, 300000));
end; $$;

revoke execute on function public._worker_deposit_status(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. _settle_worker_hold — hoàn (worker) / chuyển (NTD) một khoản. Idempotent:
--    chỉ chạy khi khoản đang ở đúng trạng thái p_expect. Nội bộ.
-- ---------------------------------------------------------------------------
create or replace function public._settle_worker_hold(p_hold_id uuid, p_outcome text, p_expect text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_h public.worker_holds;
begin
  if p_outcome not in ('refund', 'forfeit') then raise exception 'INVALID_INPUT'; end if;
  select * into v_h from public.worker_holds where id = p_hold_id for update;
  if not found or v_h.status <> p_expect then return 0; end if;

  if p_outcome = 'refund' then
    perform public._wallet_apply(v_h.worker_id, v_h.amount, 'WorkerDepositRefund',
      v_h.shift_id, v_h.application_id, 'Hoàn cọc ứng tuyển');
    update public.worker_holds set status = 'Refunded', settled_at = now() where id = v_h.id;
  else
    perform public._wallet_apply(v_h.employer_id, v_h.amount, 'EmployerNoShowCompensation',
      v_h.shift_id, v_h.application_id, 'Tiền cọc của người lao động vắng mặt');
    update public.worker_holds set status = 'Forfeited', settled_at = now() where id = v_h.id;
  end if;
  return v_h.amount;
end; $$;

revoke execute on function public._settle_worker_hold(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Trigger trên applications.status
--    * sang trạng thái kết thúc tốt / huỷ → hoàn khoản đang Held;
--    * NoShow → trạng thái khác (NTD sửa nhầm vắng mặt):
--        - khoản đã chuyển NTD → CHẶN (WORKER_DEPOSIT_SETTLED);
--        - khoản đang chờ admin → về Held (khiếu nại / xét duyệt không còn ý nghĩa).
-- ---------------------------------------------------------------------------
create or replace function public._on_application_status_worker_hold()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_h public.worker_holds;
begin
  select * into v_h from public.worker_holds where application_id = new.id for update;
  if not found then return new; end if;

  if old.status = 'NoShow' and new.status <> 'NoShow' then
    if v_h.status = 'Forfeited' then raise exception 'WORKER_DEPOSIT_SETTLED'; end if;
    if v_h.status = 'Contested' then
      update public.worker_holds set status = 'Held', review_reason = null where id = v_h.id;
      v_h.status := 'Held';
    end if;
  end if;

  if new.status in ('Rejected', 'CancelledByWorker', 'CancelledByEmployer', 'Expired', 'Confirmed')
     and v_h.status = 'Held' then
    perform public._settle_worker_hold(v_h.id, 'refund', 'Held');
  end if;
  return new;
end; $$;

revoke execute on function public._on_application_status_worker_hold() from public, anon, authenticated;

drop trigger if exists applications_worker_hold on public.applications;
create trigger applications_worker_hold
  after update of status on public.applications
  for each row when (old.status is distinct from new.status)
  execute function public._on_application_status_worker_hold();

-- ---------------------------------------------------------------------------
-- 7. Ứng tuyển
--    apply(shift)                      — KHÔNG trừ ví; cần cọc → WORKER_DEPOSIT_REQUIRED
--    apply_with_deposit(shift, accept) — trừ ví tối đa số worker đã đồng ý
-- ---------------------------------------------------------------------------
alter function public.apply(uuid) rename to apply_before_worker_deposit_guard;
revoke execute on function public.apply_before_worker_deposit_guard(uuid) from public, anon, authenticated;

create or replace function public._apply_with_worker_deposit(p_shift_id uuid, p_accepted int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_app uuid;
  v_status jsonb;
  v_shift public.shifts;
  v_wage int;
  v_amount int;
  v_bal int;
  v_open int;
begin
  -- Bản cũ: require_active_worker + xác thực SĐT (0022) + khoá ca + chèn đơn.
  v_app := public.apply_before_worker_deposit_guard(p_shift_id);

  v_status := public._worker_deposit_status(v_uid);
  if not coalesce((v_status ->> 'needsDeposit')::boolean, false) then return v_app; end if;

  select * into v_shift from public.shifts where id = p_shift_id;
  v_wage := round(v_shift.hourly_wage
                  * extract(epoch from (v_shift.end_time - v_shift.start_time)) / 3600.0)::int;
  v_amount := public._worker_deposit_amount(v_wage,
    (v_status ->> 'ratioPct')::int, (v_status ->> 'maxAmount')::int);
  if v_amount <= 0 then return v_app; end if;

  if p_accepted is null then
    raise exception 'WORKER_DEPOSIT_REQUIRED' using detail = v_amount::text;
  end if;
  if v_amount > p_accepted then
    raise exception 'WORKER_DEPOSIT_CHANGED' using detail = v_amount::text;
  end if;

  -- Khoá ví trước khi đếm → hai lần ứng tuyển song song của cùng worker tuần tự.
  select balance into v_bal from public.wallets where user_id = v_uid for update;
  if coalesce(v_bal, 0) < v_amount then
    raise exception 'WORKER_DEPOSIT_INSUFFICIENT' using detail = v_amount::text;
  end if;
  -- T2: tối đa N khoản đang giữ / khiếu nại.
  select count(*) into v_open from public.worker_holds
   where worker_id = v_uid and status in ('Held', 'Contested');
  if v_open >= (v_status ->> 'maxOpenHolds')::int then
    raise exception 'WORKER_DEPOSIT_LIMIT' using detail = (v_status ->> 'maxOpenHolds');
  end if;

  insert into public.worker_holds (application_id, worker_id, shift_id, employer_id, amount)
    values (v_app, v_uid, p_shift_id, v_shift.employer_id, v_amount);
  perform public._wallet_apply(v_uid, -v_amount, 'WorkerDepositHeld',
    p_shift_id, v_app, 'Giữ cọc ứng tuyển');
  return v_app;
end; $$;

revoke execute on function public._apply_with_worker_deposit(uuid, int) from public, anon, authenticated;

create or replace function public.apply(p_shift_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  return public._apply_with_worker_deposit(p_shift_id, null);
end; $$;
revoke execute on function public.apply(uuid) from public, anon;
grant execute on function public.apply(uuid) to authenticated;

create or replace function public.apply_with_deposit(p_shift_id uuid, p_accepted_deposit int)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if p_accepted_deposit is null or p_accepted_deposit < 0 then raise exception 'INVALID_INPUT'; end if;
  return public._apply_with_worker_deposit(p_shift_id, p_accepted_deposit);
end; $$;
revoke execute on function public.apply_with_deposit(uuid, int) from public, anon;
grant execute on function public.apply_with_deposit(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Quét khoản quá hạn. Idempotent, skip locked, mỗi khoản trong khối
--    exception riêng (L3). Nội bộ.
--    * đơn đã kết thúc / Pending khi ca đã bắt đầu → hoàn;
--    * NoShow hết hạn khiếu nại → chuyển NTD, TRỪ khi (a) hệ thống tự đánh vắng
--      (AUTO_NO_SHOW) hoặc (b) NTD đã tự nhận quá trần 24 giờ (T2,
--      EMPLOYER_DAILY_CAP) → khoản sang Contested chờ admin (review_reason);
--    * đơn chưa kết thúc sau hết ca + 7 ngày → hoàn dự phòng (L2).
-- ---------------------------------------------------------------------------
create or replace function public._settle_worker_holds_overdue(p_limit int default 200)
returns int language plpgsql security definer set search_path = '' as $$
declare r record; v_app public.applications; v_h public.worker_holds; v_shift public.shifts;
        v_outcome text; v_n int := 0; v_cap int; v_recent int;
begin
  select coalesce(worker_deposit_forfeit_daily_cap, 300000) into v_cap
    from public.platform_settings where id;
  v_cap := coalesce(v_cap, 300000);

  for r in
    select h.id, h.application_id
      from public.worker_holds h
      join public.applications a on a.id = h.application_id
      join public.shifts s on s.id = h.shift_id
     where h.status = 'Held'
       and (a.status in ('Rejected', 'CancelledByWorker', 'CancelledByEmployer', 'Expired', 'Confirmed')
            or (a.status = 'Pending' and now() >= public.shift_start_ts(s.date, s.start_time))
            or (a.status = 'NoShow' and now() >= public._worker_hold_forfeit_deadline(
                  public.shift_end_ts(s.date, s.end_time), a.no_show_at))
            or (a.status not in ('Pending', 'NoShow')
                and now() >= public.shift_end_ts(s.date, s.end_time) + interval '7 days'))
     order by h.created_at
     limit greatest(coalesce(p_limit, 200), 1)
  loop
    begin
      -- Khoá theo thứ tự applications → worker_holds (như mọi đường khác).
      select * into v_app from public.applications where id = r.application_id for update skip locked;
      if not found then continue; end if;
      select * into v_h from public.worker_holds where id = r.id for update skip locked;
      if not found or v_h.status <> 'Held' then continue; end if;
      select * into v_shift from public.shifts where id = v_h.shift_id;

      -- Quyết lại trên dữ liệu đã khoá (khớp workerHoldOutcome).
      v_outcome := case
        when v_app.status in ('Rejected', 'CancelledByWorker', 'CancelledByEmployer', 'Expired', 'Confirmed')
          then 'refund'
        when v_app.status = 'Pending'
          then case when now() >= public.shift_start_ts(v_shift.date, v_shift.start_time) then 'refund' end
        when v_app.status = 'NoShow'
          then case when now() >= public._worker_hold_forfeit_deadline(
                 public.shift_end_ts(v_shift.date, v_shift.end_time), v_app.no_show_at) then 'forfeit' end
        when now() >= public.shift_end_ts(v_shift.date, v_shift.end_time) + interval '7 days'
          then 'refund'
        else null end;
      if v_outcome is null then continue; end if;

      -- Hệ thống tự đánh vắng (0019: NTD không xác nhận có mặt hay vắng mặt) →
      -- không có căn cứ từ NTD → chờ admin, không tự chuyển (chốt 30/09).
      if v_outcome = 'forfeit' and v_app.auto_settled_at is not null then
        update public.worker_holds
           set status = 'Contested', review_reason = 'AUTO_NO_SHOW', contested_at = now()
         where id = v_h.id and status = 'Held';
        v_n := v_n + 1;
        continue;
      end if;

      if v_outcome = 'forfeit' then
        -- T2: khoá theo NTD rồi mới cộng dồn (hai phiên quét song song không vượt trần).
        -- Không chờ khoá: phiên khác đang xử lý NTD này → để lần quét sau (tránh
        -- RPC người dùng bị timeout rồi rollback cả phần tự chốt).
        if not pg_try_advisory_xact_lock(hashtextextended('worker_forfeit:' || v_h.employer_id::text, 0)) then
          continue;
        end if;
        select coalesce(sum(amount), 0) into v_recent from public.wallet_ledger
         where user_id = v_h.employer_id and kind = 'EmployerNoShowCompensation'
           and created_at > now() - interval '24 hours';
        if v_recent + v_h.amount > v_cap then
          update public.worker_holds
             set status = 'Contested', review_reason = 'EMPLOYER_DAILY_CAP', contested_at = now()
           where id = v_h.id and status = 'Held';
          v_n := v_n + 1;
          continue;
        end if;
      end if;

      if public._settle_worker_hold(v_h.id, v_outcome, 'Held') > 0 then v_n := v_n + 1; end if;
    exception when others then
      raise warning 'worker_hold % bỏ qua: %', r.id, sqlerrm;
    end;
  end loop;
  return v_n;
end; $$;

revoke execute on function public._settle_worker_holds_overdue(int) from public, anon, authenticated;

-- sync_overdue_settlements (0019) + quét cọc worker. Tự chốt trước (có thể đổi
-- đơn sang Confirmed / NoShow), rồi mới quét khoản giữ. Lỗi quét cọc không
-- rollback phần tự chốt (L3).
create or replace function public.sync_overdue_settlements()
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_n := public._auto_settle_overdue(50);
  begin
    v_n := v_n + public._settle_worker_holds_overdue(50);
  exception when others then
    raise warning 'quét cọc worker lỗi: %', sqlerrm;
  end;
  return v_n;
end; $$;

revoke execute on function public.sync_overdue_settlements() from public, anon;
grant execute on function public.sync_overdue_settlements() to authenticated;

do $cron$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron không khả dụng (%), bỏ qua lịch quét cọc worker.', sqlerrm;
    return;
  end;
  begin
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'cale-worker-holds';
    -- Chạy sau lịch tự chốt 0019 (phút 0/15/30/45) vài phút.
    perform cron.schedule('cale-worker-holds', '5,20,35,50 * * * *',
                          'select public._settle_worker_holds_overdue(500)');
  exception when others then
    raise notice 'Không lên lịch được pg_cron (%).', sqlerrm;
  end;
end
$cron$;

-- ---------------------------------------------------------------------------
-- 9. Worker: trạng thái cọc của mình + khiếu nại vắng mặt
-- ---------------------------------------------------------------------------
create or replace function public.get_my_worker_deposit_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_bal int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select balance into v_bal from public.wallets where user_id = v_uid;
  return public._worker_deposit_status(v_uid)
    || jsonb_build_object('balance', coalesce(v_bal, 0));
end; $$;
revoke execute on function public.get_my_worker_deposit_status() from public, anon;
grant execute on function public.get_my_worker_deposit_status() to authenticated;

-- Khiếu nại vắng mặt: có khoản cọc → khoản sang Contested; không có (được miễn
-- cọc, L1) hoặc khoản đã được hoàn (vd. hoàn dự phòng L2 rồi NTD mới đánh vắng)
-- → ghi no_show_contests. Cùng hạn 72 giờ. Gọi lặp an toàn.
create or replace function public.worker_contest_no_show(p_application_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_app public.applications; v_h public.worker_holds;
        v_shift public.shifts; v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(v_reason) < 5 then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_reason) > 500 then raise exception 'FIELD_TOO_LONG'; end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  if v_app.worker_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if v_app.status <> 'NoShow' then raise exception 'INVALID_STATE_FOR_CONTEST'; end if;

  select * into v_shift from public.shifts where id = v_app.shift_id;
  select * into v_h from public.worker_holds where application_id = p_application_id for update;

  -- Khoản đã hoàn vì admin xử cho worker → lần vắng đó vốn đã không bị tính.
  if found and v_h.status = 'Refunded' and v_h.resolution = 'WORKER' then return; end if;

  if not found or v_h.status = 'Refunded' then
    -- L1: không có cọc, hoặc cọc đã hoàn → khiếu nại không kèm tiền.
    if exists (select 1 from public.no_show_contests where application_id = p_application_id) then
      return;                                                     -- idempotent
    end if;
    if now() >= public._worker_hold_forfeit_deadline(
         public.shift_end_ts(v_shift.date, v_shift.end_time), v_app.no_show_at) then
      raise exception 'CONTEST_CLOSED';
    end if;
    insert into public.no_show_contests (application_id, worker_id, reason)
      values (p_application_id, v_uid, v_reason);
    return;
  end if;

  -- Đã khiếu nại → gọi lặp không đổi gì. Khoản đang chờ admin vì trần NTD (T2)
  -- mà worker chưa khiếu nại → vẫn nhận lý do.
  if v_h.status = 'Contested' and v_h.contest_reason is not null then return; end if;
  if v_h.status not in ('Held', 'Contested') then raise exception 'CONTEST_CLOSED'; end if;
  if v_h.status = 'Held' and now() >= public._worker_hold_forfeit_deadline(
       public.shift_end_ts(v_shift.date, v_shift.end_time), v_app.no_show_at) then
    raise exception 'CONTEST_CLOSED';
  end if;

  update public.worker_holds
     set status = 'Contested', contest_reason = v_reason, contested_at = coalesce(contested_at, now())
   where id = v_h.id and status in ('Held', 'Contested');
end; $$;
revoke execute on function public.worker_contest_no_show(uuid, text) from public, anon;
grant execute on function public.worker_contest_no_show(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Admin: danh sách + xử khiếu nại + cài đặt (+ nhật ký 0025)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_worker_holds(p_status text default 'Contested')
returns table (
  id uuid, application_id uuid, shift_id uuid, shift_title text,
  shift_date date, start_time time, end_time time,
  worker_id uuid, worker_name text, employer_id uuid, employer_name text,
  amount int, status text, contest_reason text, contested_at timestamptz, review_reason text,
  no_show_at timestamptz, resolution text, resolution_note text,
  resolved_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return query
    select h.id, h.application_id, h.shift_id, s.title,
           s.date, s.start_time, s.end_time,
           h.worker_id, coalesce(wp.display_name, ''), h.employer_id, coalesce(ep.display_name, ''),
           h.amount, h.status, h.contest_reason, h.contested_at, h.review_reason,
           a.no_show_at, h.resolution, h.resolution_note,
           h.resolved_at, h.created_at
      from public.worker_holds h
      join public.shifts s on s.id = h.shift_id
      join public.applications a on a.id = h.application_id
      left join public.public_profiles wp on wp.user_id = h.worker_id
      left join public.public_profiles ep on ep.user_id = h.employer_id
     where p_status is null or h.status = p_status
     order by case when h.status = 'Contested' then h.contested_at end asc nulls last,
              h.created_at desc
     limit 200;
end; $$;
revoke execute on function public.admin_list_worker_holds(text) from public, anon;
grant execute on function public.admin_list_worker_holds(text) to authenticated;

create or replace function public.admin_resolve_worker_hold(p_hold_id uuid, p_to_worker boolean, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_app_id uuid; v_h public.worker_holds; v_note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_to_worker is null then raise exception 'INVALID_INPUT'; end if;
  if v_note = '' then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_note) > 500 then raise exception 'FIELD_TOO_LONG'; end if;

  select application_id into v_app_id from public.worker_holds where id = p_hold_id;
  if v_app_id is null then raise exception 'NOT_FOUND'; end if;
  perform 1 from public.applications where id = v_app_id for update;
  select * into v_h from public.worker_holds where id = p_hold_id for update;
  -- L5: không tự xử khoản của chính mình.
  if auth.uid() in (v_h.worker_id, v_h.employer_id) then raise exception 'FORBIDDEN'; end if;
  if v_h.status <> 'Contested' then raise exception 'ALREADY_REVIEWED'; end if;

  update public.worker_holds
     set resolution = case when p_to_worker then 'WORKER' else 'EMPLOYER' end,
         resolution_note = v_note, resolved_by = auth.uid(), resolved_at = now()
   where id = p_hold_id;
  perform public._settle_worker_hold(p_hold_id,
    case when p_to_worker then 'refund' else 'forfeit' end, 'Contested');
end; $$;
revoke execute on function public.admin_resolve_worker_hold(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolve_worker_hold(uuid, boolean, text) to authenticated;

-- L1: khiếu nại vắng mặt không kèm cọc.
create or replace function public.admin_list_no_show_contests(p_status text default 'Pending')
returns table (
  application_id uuid, shift_id uuid, shift_title text,
  shift_date date, start_time time, end_time time,
  worker_id uuid, worker_name text, employer_id uuid, employer_name text,
  reason text, status text, no_show_at timestamptz,
  resolution_note text, resolved_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return query
    select c.application_id, s.id, s.title,
           s.date, s.start_time, s.end_time,
           c.worker_id, coalesce(wp.display_name, ''), s.employer_id, coalesce(ep.display_name, ''),
           c.reason, c.status, a.no_show_at,
           c.resolution_note, c.resolved_at, c.created_at
      from public.no_show_contests c
      join public.applications a on a.id = c.application_id
      join public.shifts s on s.id = a.shift_id
      left join public.public_profiles wp on wp.user_id = c.worker_id
      left join public.public_profiles ep on ep.user_id = s.employer_id
     where p_status is null or c.status = p_status
     order by c.created_at asc
     limit 200;
end; $$;
revoke execute on function public.admin_list_no_show_contests(text) from public, anon;
grant execute on function public.admin_list_no_show_contests(text) to authenticated;

create or replace function public.admin_resolve_no_show_contest(
  p_application_id uuid, p_overturn boolean, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_c public.no_show_contests; v_employer uuid; v_note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_overturn is null then raise exception 'INVALID_INPUT'; end if;
  if v_note = '' then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_note) > 500 then raise exception 'FIELD_TOO_LONG'; end if;

  perform 1 from public.applications where id = p_application_id for update;
  select * into v_c from public.no_show_contests where application_id = p_application_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select s.employer_id into v_employer
    from public.applications a join public.shifts s on s.id = a.shift_id
   where a.id = p_application_id;
  if auth.uid() in (v_c.worker_id, v_employer) then raise exception 'FORBIDDEN'; end if;   -- L5
  if v_c.status <> 'Pending' then raise exception 'ALREADY_REVIEWED'; end if;

  update public.no_show_contests
     set status = case when p_overturn then 'Upheld' else 'Rejected' end,
         resolution_note = v_note, resolved_by = auth.uid(), resolved_at = now()
   where application_id = p_application_id;
end; $$;
revoke execute on function public.admin_resolve_no_show_contest(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolve_no_show_contest(uuid, boolean, text) to authenticated;

create or replace function public.admin_get_worker_deposit_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_s public.platform_settings;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_s from public.platform_settings where id;
  return jsonb_build_object(
    'enabled', coalesce(v_s.require_worker_deposit, false),
    'ratioPct', coalesce(v_s.worker_deposit_ratio_pct, 50),
    'maxAmount', coalesce(v_s.worker_deposit_max, 100000),
    'exemptAfter', coalesce(v_s.worker_deposit_exempt_after, 5),
    'windowDays', coalesce(v_s.worker_deposit_window_days, 30),
    'maxOpenHolds', coalesce(v_s.worker_deposit_max_open, 3),
    'forfeitDailyCap', coalesce(v_s.worker_deposit_forfeit_daily_cap, 300000),
    'heldCount', (select count(*) from public.worker_holds where status = 'Held'),
    -- Khoản đã đến hạn xử lý hơn 1 giờ mà vẫn Held (lượt quét lỗi / bị bỏ qua).
    'overdueHeldCount', (
      select count(*)
        from public.worker_holds h
        join public.applications a on a.id = h.application_id
        join public.shifts s on s.id = h.shift_id
       where h.status = 'Held'
         and (a.status in ('Rejected', 'CancelledByWorker', 'CancelledByEmployer', 'Expired', 'Confirmed')
              or (a.status = 'Pending'
                  and now() >= public.shift_start_ts(s.date, s.start_time) + interval '1 hour')
              or (a.status = 'NoShow' and now() >= public._worker_hold_forfeit_deadline(
                    public.shift_end_ts(s.date, s.end_time), a.no_show_at) + interval '1 hour')
              or (a.status not in ('Pending', 'NoShow')
                  and now() >= public.shift_end_ts(s.date, s.end_time) + interval '7 days 1 hour'))),
    'heldAmount', (select coalesce(sum(amount), 0) from public.worker_holds where status = 'Held'),
    'contestedCount', (select count(*) from public.worker_holds where status = 'Contested')
                    + (select count(*) from public.no_show_contests where status = 'Pending'));
end; $$;
revoke execute on function public.admin_get_worker_deposit_settings() from public, anon;
grant execute on function public.admin_get_worker_deposit_settings() to authenticated;

create or replace function public.admin_set_worker_deposit_settings(
  p_enabled boolean, p_ratio_pct int, p_max int, p_exempt_after int, p_window_days int,
  p_max_open int, p_forfeit_daily_cap int
) returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.platform_settings;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  -- Giới hạn chống bấm nhầm (khớp WorkerDepositCard).
  if p_enabled is null or p_ratio_pct is null or p_max is null or p_exempt_after is null
     or p_window_days is null or p_max_open is null or p_forfeit_daily_cap is null
     or p_ratio_pct < 1 or p_ratio_pct > 100
     or p_max < 1000 or p_max > 500000
     or p_exempt_after < 1 or p_exempt_after > 100
     or p_window_days < 1 or p_window_days > 365
     or p_max_open < 1 or p_max_open > 20
     or p_forfeit_daily_cap < 0 or p_forfeit_daily_cap > 10000000 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v_old from public.platform_settings where id for update;
  if v_old.require_worker_deposit = p_enabled and v_old.worker_deposit_ratio_pct = p_ratio_pct
     and v_old.worker_deposit_max = p_max and v_old.worker_deposit_exempt_after = p_exempt_after
     and v_old.worker_deposit_window_days = p_window_days
     and v_old.worker_deposit_max_open = p_max_open
     and v_old.worker_deposit_forfeit_daily_cap = p_forfeit_daily_cap then
    return;
  end if;
  update public.platform_settings
     set require_worker_deposit = p_enabled, worker_deposit_ratio_pct = p_ratio_pct,
         worker_deposit_max = p_max, worker_deposit_exempt_after = p_exempt_after,
         worker_deposit_window_days = p_window_days, worker_deposit_max_open = p_max_open,
         worker_deposit_forfeit_daily_cap = p_forfeit_daily_cap, updated_at = now()
   where id;
  insert into public.platform_settings_audit (changed_by, field, old_value, new_value)
    values (auth.uid(), 'worker_deposit',
      v_old.require_worker_deposit || '/' || v_old.worker_deposit_ratio_pct || '/' || v_old.worker_deposit_max
        || '/' || v_old.worker_deposit_exempt_after || '/' || v_old.worker_deposit_window_days
        || '/' || v_old.worker_deposit_max_open || '/' || v_old.worker_deposit_forfeit_daily_cap,
      p_enabled || '/' || p_ratio_pct || '/' || p_max || '/' || p_exempt_after || '/' || p_window_days
        || '/' || p_max_open || '/' || p_forfeit_daily_cap);
end; $$;
revoke execute on function public.admin_set_worker_deposit_settings(boolean, int, int, int, int, int, int) from public, anon;
grant execute on function public.admin_set_worker_deposit_settings(boolean, int, int, int, int, int, int) to authenticated;
