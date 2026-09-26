-- =============================================================================
-- 0024 — Đánh giá hai chiều sau ca (nhà tuyển dụng ⇄ người lao động).
-- ADDITIVE. Không sửa migration đã apply.
--
-- Chỉ HIỂN THỊ — chưa tính vào điểm uy tín (điểm vẫn tạm tính từ lịch sử ca).
--
-- Nguyên tắc:
--   * Một bảng cho cả hai chiều (direction). Mỗi đơn ứng tuyển tối đa MỘT đánh
--     giá mỗi chiều (unique application_id + direction); đánh giá bất biến.
--   * Chỉ ghi qua RPC SECURITY DEFINER `submit_shift_review`:
--       - người gọi phải là worker của đơn HOẶC employer sở hữu ca;
--       - đơn phải ở trạng thái 'Confirmed' (ca đã xác nhận hoàn thành);
--       - trong 14 ngày kể từ giờ kết thúc ca;
--       - tài khoản không bị khoá.
--     Server tự suy ra chiều + người nhận — client không tự khai to_user.
--   * Đọc: mọi người dùng đã đăng nhập (đánh giá là thông tin uy tín công khai
--     trong nền tảng: worker xem trước khi ứng tuyển, employer xem khi duyệt).
-- =============================================================================

create table if not exists public.shift_reviews (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications (id) on delete cascade,
  shift_id        uuid not null references public.shifts (id) on delete cascade,
  direction       text not null,
  from_user_id    uuid not null references public.users (id) on delete cascade,
  to_user_id      uuid not null references public.users (id) on delete cascade,
  stars           smallint not null,
  comment         text,
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  constraint shift_reviews_direction_ck check (direction in ('employer_to_worker', 'worker_to_employer')),
  constraint shift_reviews_stars_ck check (stars between 1 and 5),
  constraint shift_reviews_comment_ck check (comment is null or length(comment) <= 500),
  constraint shift_reviews_tags_ck check (
    tags <@ array['PaidOnTime', 'GoodEnvironment', 'ClearCommunication', 'AccurateDescription']::text[]
  ),
  constraint shift_reviews_once_uniq unique (application_id, direction)
);
create index if not exists shift_reviews_to_user_idx   on public.shift_reviews (to_user_id);
create index if not exists shift_reviews_from_user_idx on public.shift_reviews (from_user_id);

alter table public.shift_reviews enable row level security;

drop policy if exists shift_reviews_select_authenticated on public.shift_reviews;
create policy shift_reviews_select_authenticated on public.shift_reviews
  for select to authenticated
  using (true);

revoke all on public.shift_reviews from anon, authenticated;
grant select on public.shift_reviews to authenticated;
grant select, insert, update, delete on public.shift_reviews to service_role;

create or replace function public.submit_shift_review(
  p_application_id uuid,
  p_stars          int,
  p_comment        text,
  p_tags           text[]
)
returns public.shift_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_susp    boolean;
  v_app     public.applications;
  v_shift   public.shifts;
  v_dir     text;
  v_to      uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_tags    text[] := coalesce(p_tags, '{}');
  v_row     public.shift_reviews;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select suspended into v_susp from public.users where id = v_uid;
  if v_susp is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_susp then raise exception 'SUSPENDED'; end if;

  select * into v_app from public.applications where id = p_application_id;
  if v_app.id is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into v_shift from public.shifts where id = v_app.shift_id;

  if v_uid = v_app.worker_id then
    v_dir := 'worker_to_employer';
    v_to  := v_shift.employer_id;
  elsif v_uid = v_shift.employer_id then
    v_dir := 'employer_to_worker';
    v_to  := v_app.worker_id;
    v_tags := '{}';                       -- nhãn chỉ dành cho đánh giá nhà tuyển dụng
  else
    raise exception 'NOT_PARTICIPANT';
  end if;

  if v_app.status <> 'Confirmed' then raise exception 'NOT_COMPLETED'; end if;
  if now() > public.shift_end_ts(v_shift.date, v_shift.end_time) + interval '14 days' then
    raise exception 'REVIEW_WINDOW_CLOSED';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then raise exception 'INVALID_STARS'; end if;
  if v_comment is not null and length(v_comment) > 500 then raise exception 'COMMENT_TOO_LONG'; end if;
  if not (v_tags <@ array['PaidOnTime', 'GoodEnvironment', 'ClearCommunication', 'AccurateDescription']::text[]) then
    raise exception 'INVALID_TAGS';
  end if;

  insert into public.shift_reviews
    (application_id, shift_id, direction, from_user_id, to_user_id, stars, comment, tags)
  values
    (v_app.id, v_shift.id, v_dir, v_uid, v_to, p_stars, v_comment, v_tags)
  on conflict (application_id, direction) do nothing
  returning * into v_row;

  if v_row.id is null then raise exception 'ALREADY_SUBMITTED'; end if;
  return v_row;
end;
$$;

revoke execute on function public.submit_shift_review(uuid, int, text, text[]) from public, anon;
grant execute on function public.submit_shift_review(uuid, int, text, text[]) to authenticated;
