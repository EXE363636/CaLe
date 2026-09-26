-- =============================================================================
-- 0023 — Lịch cá nhân của người lao động (lịch bận / lịch rảnh) trên server.
-- ADDITIVE. Không sửa migration đã apply.
--
-- Trước 0023, lịch bận/rảnh chỉ nằm trên trình duyệt (localStorage) → không
-- đồng bộ giữa các thiết bị. Bảng này làm nguồn sự thật cho lịch cá nhân.
--
-- Nguyên tắc (giống Phase 2):
--   * RLS bật; mỗi worker CHỈ đọc được lịch của chính mình (kể cả admin không
--     đọc — lịch cá nhân là dữ liệu riêng tư, không phục vụ nghiệp vụ nào khác).
--   * authenticated KHÔNG INSERT/UPDATE/DELETE trực tiếp — mọi ghi qua RPC
--     SECURITY DEFINER, search_path = '', fully-qualified, REVOKE PUBLIC/anon.
--   * Chỉ worker đang hoạt động (require_active_worker) được ghi.
--   * id do client sinh (uuid) để UI cập nhật lạc quan; upsert theo id nhưng
--     chỉ khi dòng đó thuộc auth.uid() (không ghi đè lịch người khác).
--   * Giới hạn 1000 mục / người để chặn lạm dụng dung lượng.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bảng
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_blocks (
  id          uuid primary key,
  user_id     uuid not null references public.users (id) on delete cascade,
  title       text not null,
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  note        text,
  kind        text not null default 'busy',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint schedule_blocks_title_ck check (length(btrim(title)) between 1 and 200),
  constraint schedule_blocks_note_ck  check (note is null or length(note) <= 500),
  constraint schedule_blocks_time_ck  check (end_time > start_time),
  constraint schedule_blocks_kind_ck  check (kind in ('busy', 'available'))
);
create index if not exists schedule_blocks_user_date_idx
  on public.schedule_blocks (user_id, date);

-- ---------------------------------------------------------------------------
-- 2. RLS + quyền bảng
-- ---------------------------------------------------------------------------
alter table public.schedule_blocks enable row level security;

drop policy if exists schedule_blocks_select_own on public.schedule_blocks;
create policy schedule_blocks_select_own on public.schedule_blocks
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.schedule_blocks from anon, authenticated;
grant select on public.schedule_blocks to authenticated;
grant select, insert, update, delete on public.schedule_blocks to service_role;

-- ---------------------------------------------------------------------------
-- 3. RPC ghi
-- ---------------------------------------------------------------------------

-- Tạo mới hoặc sửa một mục lịch của CHÍNH worker đang đăng nhập.
create or replace function public.upsert_schedule_block(
  p_id     uuid,
  p_title  text,
  p_date   date,
  p_start  time,
  p_end    time,
  p_note   text,
  p_kind   text
)
returns public.schedule_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
  v_kind  text := coalesce(p_kind, 'busy');
  v_row   public.schedule_blocks;
  v_count integer;
begin
  perform public.require_active_worker();

  if p_id is null then raise exception 'ID_REQUIRED'; end if;
  if v_title = '' then raise exception 'TITLE_REQUIRED'; end if;
  if p_date is null then raise exception 'DATE_REQUIRED'; end if;
  if p_start is null or p_end is null then raise exception 'TIME_REQUIRED'; end if;
  if p_end <= p_start then raise exception 'TIME_RANGE_INVALID'; end if;
  if v_kind not in ('busy', 'available') then raise exception 'KIND_INVALID'; end if;

  -- Mục đã tồn tại nhưng thuộc người khác → không cho ghi đè.
  if exists (
    select 1 from public.schedule_blocks b
    where b.id = p_id and b.user_id <> v_uid
  ) then
    raise exception 'OWNER_MISMATCH';
  end if;

  if not exists (select 1 from public.schedule_blocks b where b.id = p_id) then
    select count(*) into v_count from public.schedule_blocks b where b.user_id = v_uid;
    if v_count >= 1000 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.schedule_blocks as b
    (id, user_id, title, date, start_time, end_time, note, kind)
  values
    (p_id, v_uid, v_title, p_date, p_start, p_end, v_note, v_kind)
  on conflict (id) do update
    set title      = excluded.title,
        date       = excluded.date,
        start_time = excluded.start_time,
        end_time   = excluded.end_time,
        note       = excluded.note,
        kind       = excluded.kind,
        updated_at = now()
    where b.user_id = v_uid
  returning * into v_row;

  if v_row.id is null then raise exception 'OWNER_MISMATCH'; end if;
  return v_row;
end;
$$;

-- Xoá một mục lịch của CHÍNH worker đang đăng nhập (idempotent: không có → bỏ qua).
create or replace function public.delete_schedule_block(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_active_worker();
  delete from public.schedule_blocks b
  where b.id = p_id and b.user_id = auth.uid();
end;
$$;

revoke execute on function public.upsert_schedule_block(uuid, text, date, time, time, text, text) from public, anon;
revoke execute on function public.delete_schedule_block(uuid) from public, anon;
grant execute on function public.upsert_schedule_block(uuid, text, date, time, time, text, text) to authenticated;
grant execute on function public.delete_schedule_block(uuid) to authenticated;
