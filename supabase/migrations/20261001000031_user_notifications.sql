-- =============================================================================
-- 0031 — Thông báo phía server cho người dùng (đợt 1: kết quả kiểm tra giao dịch nạp)
-- =============================================================================
-- Trước 0031 thông báo trong app chỉ nằm trong trình duyệt (notificationStore):
-- admin xử giao dịch nạp (0029) thì người nạp không được báo, phải tự mở ví.
--
-- Bảng user_notifications: mỗi dòng một thông báo cho MỘT người dùng.
--   - kind + params (jsonb) — client dựng câu chữ theo ngôn ngữ (không lưu chữ).
--   - dedupe_key: (user_id, dedupe_key) duy nhất → ghi lặp không nhân đôi.
--   - Không cấp quyền bảng cho client; RLS bật, không policy. Đọc / đánh dấu đã
--     đọc chỉ qua RPC của CHÍNH người đó.
-- Trigger trên payment_review_items: Pending → Credited | Dismissed → ghi thông
-- báo cho người nạp (số đã cộng, mã đơn, ghi chú của admin — người nạp vốn đã
-- thấy ghi chú qua get_my_payment_reviews). Không đụng logic tiền của 0029/0030.
-- Logic thuần tương ứng: src/domain/serverNotification.ts.
-- =============================================================================

create table if not exists public.user_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('PaymentReviewCredited','PaymentReviewDismissed')),
  params      jsonb not null default '{}'::jsonb,
  dedupe_key  text not null check (char_length(dedupe_key) <= 200),
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index if not exists user_notifications_user_idx
  on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from public, anon, authenticated;
grant all on public.user_notifications to service_role;

-- ---------------------------------------------------------------------------
-- 1. Kết quả kiểm tra giao dịch nạp → thông báo cho người nạp
-- ---------------------------------------------------------------------------
create or replace function public._notify_payment_review_resolved()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code bigint;
begin
  if old.status = 'Pending' and new.status in ('Credited', 'Dismissed') then
    select order_code into v_code from public.payment_orders where id = new.order_id;
    insert into public.user_notifications (user_id, kind, params, dedupe_key)
    values (
      new.user_id,
      case when new.status = 'Credited' then 'PaymentReviewCredited' else 'PaymentReviewDismissed' end,
      jsonb_build_object(
        'orderCode', v_code,
        'creditedAmount', new.credited_amount,
        'paidAmount', new.paid_amount,
        'note', new.resolution_note),
      'payment-review:' || new.id::text)
    on conflict (user_id, dedupe_key) do nothing;
  end if;
  return new;
end; $$;
revoke execute on function public._notify_payment_review_resolved() from public, anon, authenticated;

drop trigger if exists payment_review_items_notify on public.payment_review_items;
create trigger payment_review_items_notify
  after update of status on public.payment_review_items
  for each row execute function public._notify_payment_review_resolved();

-- ---------------------------------------------------------------------------
-- 2. Người dùng: đọc + đánh dấu đã đọc thông báo của CHÍNH mình
-- ---------------------------------------------------------------------------
create or replace function public.get_my_notifications()
returns table (id uuid, kind text, params jsonb, read_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return query
    select n.id, n.kind, n.params, n.read_at, n.created_at
      from public.user_notifications n
     where n.user_id = v_uid
     order by n.created_at desc
     limit 50;
end; $$;
revoke execute on function public.get_my_notifications() from public, anon;
grant  execute on function public.get_my_notifications() to authenticated;

-- p_ids null → đánh dấu mọi thông báo chưa đọc của mình. Trả số dòng đổi.
create or replace function public.mark_my_notifications_read(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_ids is not null and cardinality(p_ids) > 100 then raise exception 'INVALID_INPUT'; end if;
  update public.user_notifications
     set read_at = now()
   where user_id = v_uid and read_at is null
     and (p_ids is null or id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end; $$;
revoke execute on function public.mark_my_notifications_read(uuid[]) from public, anon;
grant  execute on function public.mark_my_notifications_read(uuid[]) to authenticated;
