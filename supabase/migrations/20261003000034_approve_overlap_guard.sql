-- =============================================================================
-- 0034 — Không để một người lao động giữ chỗ ở hai ca trùng giờ (rà soát ổn định 03/10)
-- =============================================================================
-- approve (0004) không kiểm trùng giờ ở server; chỉ app kiểm lúc ỨNG TUYỂN, và chỉ
-- so với các ca ĐÃ được duyệt. Người lao động ứng tuyển hai ca trùng giờ khi cả hai
-- còn "Chờ duyệt" thì hai nhà tuyển dụng duyệt được cả hai → chắc chắn vắng một ca
-- (bị đánh vắng, mất cọc 0028 nếu có). edit_shift (0004 / 0018) cũng dời được giờ
-- một ca đã có người được duyệt sang giờ trùng ca khác của họ.
--
-- Luật trùng = app (src/domain/conflict.ts, BUFFER 0): start < end' và end > start'
-- (ca nối tiếp nhau KHÔNG tính trùng). Đơn đang giữ chỗ = ACTIVE_STATUSES của
-- applicationStore: Approved, CancellationRequested, CheckedIn, CheckedOut; bỏ qua
-- ca đã huỷ.
--
-- 1. approve: bọc. Kiểm chủ ca → khoá tư vấn theo người lao động (hai NTD duyệt
--    cùng lúc không lọt; đúng ở READ COMMITTED mặc định: câu kiểm chạy SAU khi có
--    khoá nên thấy đơn phiên kia vừa commit) → chạy bản cũ (kiểm Pending / trạng
--    thái ca / giờ bắt đầu / còn chỗ, khoá ca + đơn) → MỚI kiểm trùng trên giờ ca
--    đã khoá. Kiểm trùng sau cùng để chủ ca không dò được lịch người lao động bằng
--    đơn đã rút / bị từ chối (chỉ đơn duyệt hợp lệ mới tới bước này). Trùng →
--    raise → rollback cả lần duyệt (kể cả khoản giữ cọc trigger 0028 tạo).
-- 2. edit_shift: bọc. Sau khi sửa (bản cũ khoá ca), nếu có người đang giữ chỗ ở ca
--    mà giờ mới trùng ca khác của họ → EDIT_WORKER_SCHEDULE_CONFLICT, rollback.
--
-- Biết mà để nguyên: employer_revert_no_show (0019) đưa NoShow → CheckedIn không
-- kiểm trùng — đó là ghi nhận người lao động THỰC SỰ đã đi làm ca đó; chặn thì họ
-- mất tiền công.
--
-- Không đổi: chữ ký approve(uuid) / edit_shift(uuid, jsonb), quyền gọi, các kiểm
-- tra cũ. Người lao động vẫn ỨNG TUYỂN được nhiều ca trùng giờ (app đã cảnh báo).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Người lao động có đơn giữ chỗ KHÁC giao giờ với ca p_shift_id không. Nội bộ.
-- ---------------------------------------------------------------------------
create or replace function public._worker_has_overlap(p_worker_id uuid, p_shift_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_shift public.shifts; v_start timestamptz; v_end timestamptz;
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then return false; end if;
  v_start := public.shift_start_ts(v_shift.date, v_shift.start_time);
  v_end   := public.shift_end_ts(v_shift.date, v_shift.end_time);
  return exists (
    select 1 from public.applications a
      join public.shifts s on s.id = a.shift_id
     where a.worker_id = p_worker_id
       and a.shift_id <> p_shift_id
       and a.status in ('Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut')
       and s.status <> 'Cancelled'
       and public.shift_start_ts(s.date, s.start_time) < v_end
       and public.shift_end_ts(s.date, s.end_time) > v_start);
end; $$;

revoke execute on function public._worker_has_overlap(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. approve
-- ---------------------------------------------------------------------------
alter function public.approve(uuid) rename to approve_before_overlap_guard;
revoke execute on function public.approve_before_overlap_guard(uuid) from public, anon, authenticated;

create or replace function public.approve(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_app public.applications; v_emp uuid; v_res uuid;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select employer_id into v_emp from public.shifts where id = v_app.shift_id;
  if v_emp is null then raise exception 'SHIFT_NOT_FOUND'; end if;
  perform public.assert_employer_owner(v_emp);

  -- Tuần tự hoá mọi lần duyệt của cùng một người lao động (giữ tới hết transaction).
  -- Thứ tự khoá: khoá tư vấn → ca → đơn (bản cũ) → ví (trigger 0028).
  perform pg_advisory_xact_lock(hashtextextended('approve_worker:' || v_app.worker_id::text, 0));

  v_res := public.approve_before_overlap_guard(p_application_id);

  if public._worker_has_overlap(v_app.worker_id, v_app.shift_id) then
    raise exception 'WORKER_SCHEDULE_CONFLICT';
  end if;
  return v_res;
end; $$;

revoke execute on function public.approve(uuid) from public, anon;
grant execute on function public.approve(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. edit_shift
-- ---------------------------------------------------------------------------
alter function public.edit_shift(uuid, jsonb) rename to edit_shift_before_overlap_guard;
revoke execute on function public.edit_shift_before_overlap_guard(uuid, jsonb) from public, anon, authenticated;

create or replace function public.edit_shift(p_shift_id uuid, p_patch jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_result uuid; r record;
begin
  v_result := public.edit_shift_before_overlap_guard(p_shift_id, p_patch);
  for r in
    select worker_id from public.applications
     where shift_id = p_shift_id
       and status in ('Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut')
  loop
    if public._worker_has_overlap(r.worker_id, p_shift_id) then
      raise exception 'EDIT_WORKER_SCHEDULE_CONFLICT';   -- rollback cả phần sửa
    end if;
  end loop;
  return v_result;
end; $$;

revoke execute on function public.edit_shift(uuid, jsonb) from public, anon;
grant execute on function public.edit_shift(uuid, jsonb) to authenticated;
