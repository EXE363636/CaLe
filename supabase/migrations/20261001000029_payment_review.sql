-- =============================================================================
-- 0029 — Admin xử giao dịch nạp PayOS bị đánh dấu cần kiểm tra (needs_review)
-- =============================================================================
-- 0027 không cộng ví khi giao dịch lệch (AMOUNT_MISMATCH, MISSING_REFERENCE,
-- LINK_MISMATCH, ORDER_NOT_PAYABLE, EXTRA_PAYMENT, ALREADY_FLAGGED) mà chỉ đặt
-- payment_orders.needs_review + nối chuỗi review_reason. Số tiền của các giao
-- dịch sau giao dịch đầu chỉ nằm trong chuỗi đó → không xử được an toàn.
--
-- Bảng mới payment_review_items: MỖI giao dịch bị đánh dấu là một dòng
--   (đơn, người nạp, lý do, số tiền PayOS báo nhận, mã giao dịch, trạng thái
--   Pending → Credited | Dismissed). Không cấp quyền bảng cho client; đọc/ghi
--   chỉ qua RPC security definer.
--
-- credit_wallet_from_payos (0027) định nghĩa lại — thân giữ nguyên, thêm:
--   - ghi dòng payment_review_items khi đánh dấu (chống trùng: cùng mã giao
--     dịch; không mã → cùng số tiền);
--   - đơn PAID chưa có provider_txn_ref chỉ coi là "gửi lại" khi đơn CHƯA bị
--     đánh dấu (đơn trước 0027). Đơn đã đánh dấu rồi được admin cộng → giao dịch
--     mới vẫn thành EXTRA_PAYMENT, không bị nuốt thành ALREADY_PAID.
--
-- admin_resolve_payment_review(item, credit, note):
--   - credit: ví +paid_amount (SỐ TIỀN THỰC NHẬN, không phải số tiền đơn),
--     két +paid_amount, KHÔNG thưởng nạp ví; đơn chưa PAID → PAID.
--   - dismiss: không cộng gì (admin đã hoàn tay / giao dịch không hợp lệ).
--   - Ghi chú bắt buộc (người nạp thấy). Admin không xử đơn của chính mình.
--   - Nghi trùng → DUPLICATE_SUSPECT (_payment_review_duplicate_suspect): cùng
--     một lần chuyển có thể sinh 2 dòng khi PayOS gửi lại thiếu mã giao dịch.
--   Dòng sổ ví ghi kèm mã đơn để truy vết.
--   needs_review GIỮ NGUYÊN true → lối cũ credit_wallet_from_payment vẫn chặn
--   (hàm đó cộng amount của đơn + thưởng, không phải paid_amount).
--
-- Backfill: đơn bị đánh dấu trước 0029 → tách review_reason thành dòng Pending;
-- còn đơn needs_review nào không tách được dòng → migration DỪNG (không để tiền
-- khách kẹt mà admin không thấy). Trước db push: kiểm đơn needs_review (chỉ đọc)
-- và đối chiếu sổ ví nếu có đơn đã được xử lý tay.
--
-- Thứ tự khoá ở mọi hàm: payment_orders → payment_review_items → wallets.
-- Logic thuần tương ứng: src/domain/paymentReview.ts.
-- =============================================================================

create table if not exists public.payment_review_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.payment_orders(id) on delete restrict,
  user_id         uuid not null references public.users(id) on delete restrict,
  reason          text not null check (reason in ('AMOUNT_MISMATCH','MISSING_REFERENCE',
                    'LINK_MISMATCH','ORDER_NOT_PAYABLE','EXTRA_PAYMENT','ALREADY_FLAGGED')),
  paid_amount     integer,
  txn_ref         text,
  status          text not null default 'Pending'
                    check (status in ('Pending','Credited','Dismissed')),
  credited_amount integer check (credited_amount is null or credited_amount > 0),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 500),
  resolved_by     uuid references public.users(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  check ((status = 'Credited') = (credited_amount is not null)),
  check ((status = 'Pending') = (resolved_at is null))
);
create unique index if not exists payment_review_items_order_ref_uidx
  on public.payment_review_items(order_id, txn_ref) where txn_ref is not null;
create index if not exists payment_review_items_order_idx on public.payment_review_items(order_id);
create index if not exists payment_review_items_user_idx on public.payment_review_items(user_id);
create index if not exists payment_review_items_pending_idx
  on public.payment_review_items(created_at) where status = 'Pending';

alter table public.payment_review_items enable row level security;
revoke all on public.payment_review_items from public, anon, authenticated;
grant all on public.payment_review_items to service_role;

-- ---------------------------------------------------------------------------
-- 1. Backfill: đơn đã bị đánh dấu trước 0029 → tách review_reason thành dòng.
--    (30/09–01/10 production có 0 đơn; giữ cho đúng nếu có đơn mới trước push.)
-- ---------------------------------------------------------------------------
insert into public.payment_review_items (order_id, user_id, reason, paid_amount, txn_ref, created_at)
select distinct on (o.id, coalesce(nullif(m[3], '-'), '#' || m[2]))
       o.id, o.user_id, m[1], nullif(m[2], 'null')::integer, nullif(m[3], '-'), o.updated_at
  from public.payment_orders o
  cross join lateral regexp_split_to_table(o.review_reason, ' \| ') with ordinality as p(part, ord)
  cross join lateral regexp_match(btrim(p.part), '^([A-Z_]+) paid=(null|\d{1,9}) ref=(\S+)$') as m
 where o.needs_review
   and m is not null
   and m[1] in ('AMOUNT_MISMATCH','MISSING_REFERENCE','LINK_MISMATCH',
                'ORDER_NOT_PAYABLE','EXTRA_PAYMENT','ALREADY_FLAGGED')
   and not exists (select 1 from public.payment_review_items r where r.order_id = o.id)
 order by o.id, coalesce(nullif(m[3], '-'), '#' || m[2]), p.ord;

do $backfill_check$
declare v_codes text;
begin
  select string_agg(o.order_code::text, ', ') into v_codes
    from public.payment_orders o
   where o.needs_review
     and not exists (select 1 from public.payment_review_items r where r.order_id = o.id);
  if v_codes is not null then
    raise exception 'PAYMENT_REVIEW_BACKFILL_INCOMPLETE: %', v_codes
      using hint = 'review_reason của các đơn này không đúng định dạng 0027; tách tay trước khi push.';
  end if;
end $backfill_check$;

-- ---------------------------------------------------------------------------
-- 2. Webhook: bản 0027 + ghi payment_review_items
-- ---------------------------------------------------------------------------
create or replace function public.credit_wallet_from_payos(
  p_order_code bigint, p_paid_amount integer, p_reference text, p_payment_link_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payment_orders;
        v_ref  text := nullif(btrim(p_reference), '');
        v_link text := nullif(btrim(p_payment_link_id), '');
        v_reason text; v_note text;
begin
  select * into v_o from public.payment_orders where order_code = p_order_code for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- PayOS gửi lại đúng giao dịch đã xử lý -> không làm gì thêm. Đơn PAID chưa gắn
  -- mã chỉ được coi là "gửi lại" khi chưa từng bị đánh dấu (đơn trước 0027).
  if v_o.status = 'PAID'
     and ((v_o.provider_txn_ref is null and not v_o.needs_review)
          or v_o.provider_txn_ref = v_ref) then
    return jsonb_build_object('status', 'ALREADY_PAID', 'order_code', p_order_code);
  end if;
  if v_o.needs_review and v_ref is not null
     and (v_o.provider_txn_ref = v_ref
          or position('ref=' || v_ref || ' ' in coalesce(v_o.review_reason, '') || ' ') > 0) then
    return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', 'ALREADY_RECORDED',
      'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', v_o.paid_amount);
  end if;

  if v_o.status = 'PAID' then
    v_reason := 'EXTRA_PAYMENT';
  elsif v_o.needs_review then
    v_reason := 'ALREADY_FLAGGED';
  elsif p_paid_amount is null or p_paid_amount <> v_o.amount then
    v_reason := 'AMOUNT_MISMATCH';
  elsif v_ref is null then
    v_reason := 'MISSING_REFERENCE';      -- không có mã giao dịch -> không chống trùng được
  elsif v_link is not null and v_o.provider_ref is not null and v_o.provider_ref <> v_link then
    v_reason := 'LINK_MISMATCH';
  elsif v_o.status <> 'PENDING' then
    v_reason := 'ORDER_NOT_PAYABLE';
  end if;

  if v_reason is null then
    update public.payment_orders
      set paid_amount = p_paid_amount, provider_txn_ref = v_ref, updated_at = now()
      where id = v_o.id;
    return public.credit_wallet_from_payment(p_order_code);
  end if;

  -- Không cộng ví. Đơn chưa gắn giao dịch nào thì gắn giao dịch này (paid_amount,
  -- provider_txn_ref); các giao dịch sau chỉ nối vào review_reason.
  v_note := v_reason || ' paid=' || coalesce(p_paid_amount::text, 'null')
            || ' ref=' || coalesce(v_ref, '-');
  if v_o.provider_txn_ref is null and v_o.status <> 'PAID' then
    update public.payment_orders
      set needs_review = true, review_reason = concat_ws(' | ', v_o.review_reason, v_note),
          paid_amount = p_paid_amount, provider_txn_ref = v_ref, updated_at = now()
      where id = v_o.id;
  else
    update public.payment_orders
      set needs_review = true, review_reason = concat_ws(' | ', v_o.review_reason, v_note),
          updated_at = now()
      where id = v_o.id;
  end if;

  -- 0029: một dòng cho admin xử. Chống trùng khi PayOS gửi lại: cùng mã giao
  -- dịch; không mã → cùng số tiền (khớp shouldRecordReviewItem).
  if not exists (
    select 1 from public.payment_review_items r
     where r.order_id = v_o.id
       and ((v_ref is not null and r.txn_ref = v_ref)
            or (v_ref is null and r.txn_ref is null
                and r.paid_amount is not distinct from p_paid_amount))
  ) then
    insert into public.payment_review_items (order_id, user_id, reason, paid_amount, txn_ref)
      values (v_o.id, v_o.user_id, v_reason, p_paid_amount, v_ref);
  end if;

  return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', v_reason,
    'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', p_paid_amount);
end; $$;

revoke execute on function public.credit_wallet_from_payos(bigint, integer, text, text)
  from public, anon, authenticated;
grant  execute on function public.credit_wallet_from_payos(bigint, integer, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Nghi trùng (khớp isDuplicateSuspect, src/domain/paymentReview.ts)
--    Trong các dòng Credited KHÁC của cùng đơn:
--      - dòng không mã: có dòng không mã bất kỳ, hoặc dòng có mã cùng số tiền,
--        hoặc đơn đã được cộng TỰ ĐỘNG đúng số đó (đơn PAID có provider_txn_ref
--        mà mã đó không phải một dòng bị đánh dấu);
--      - dòng có mã: có dòng không mã cùng số tiền.
-- ---------------------------------------------------------------------------
create or replace function public._payment_review_duplicate_suspect(p_item_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when i.txn_ref is null then
             exists (select 1 from public.payment_review_items x
                      where x.order_id = i.order_id and x.id <> i.id and x.status = 'Credited'
                        and (x.txn_ref is null or x.paid_amount = i.paid_amount))
             or (o.status = 'PAID' and o.provider_txn_ref is not null
                 and o.paid_amount = i.paid_amount
                 and not exists (select 1 from public.payment_review_items y
                                  where y.order_id = o.id and y.txn_ref = o.provider_txn_ref))
           else
             exists (select 1 from public.payment_review_items x
                      where x.order_id = i.order_id and x.id <> i.id and x.status = 'Credited'
                        and x.txn_ref is null and x.paid_amount = i.paid_amount)
           end
      from public.payment_review_items i
      join public.payment_orders o on o.id = i.order_id
     where i.id = p_item_id), false);
$$;
revoke execute on function public._payment_review_duplicate_suspect(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Người nạp: trạng thái đơn (+ đang kiểm tra) và các giao dịch của mình
--    needsReview = còn dòng chờ; reviewed = đơn có dòng bất kỳ (báo "đã xử lý"
--    khi admin bỏ qua); paidByReview = đơn PAID do admin cộng (giao dịch gắn với
--    đơn là một dòng bị đánh dấu) → client không hiện số tiền đơn.
-- ---------------------------------------------------------------------------
create or replace function public.get_payment_order_status(p_order_code bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_o public.payment_orders;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_o from public.payment_orders where order_code = p_order_code;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_o.user_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  return jsonb_build_object(
    'orderCode', v_o.order_code, 'status', v_o.status, 'amount', v_o.amount,
    'checkoutUrl', v_o.checkout_url, 'qrCode', v_o.qr_code, 'paidAt', v_o.paid_at,
    'needsReview', exists (select 1 from public.payment_review_items r
                            where r.order_id = v_o.id and r.status = 'Pending'),
    'reviewed', exists (select 1 from public.payment_review_items r where r.order_id = v_o.id),
    'paidByReview', v_o.status = 'PAID' and exists (
      select 1 from public.payment_review_items r
       where r.order_id = v_o.id and r.status = 'Credited'
         and r.txn_ref is not distinct from v_o.provider_txn_ref));
end; $$;
revoke execute on function public.get_payment_order_status(bigint) from public, anon;
grant  execute on function public.get_payment_order_status(bigint) to authenticated;

create or replace function public.get_my_payment_reviews()
returns table (
  id uuid, order_code bigint, order_amount integer, reason text,
  paid_amount integer, txn_ref text, status text, credited_amount integer,
  resolution_note text, resolved_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return query
    select r.id, o.order_code, o.amount, r.reason,
           r.paid_amount, r.txn_ref, r.status, r.credited_amount,
           r.resolution_note, r.resolved_at, r.created_at
      from public.payment_review_items r
      join public.payment_orders o on o.id = r.order_id
     where r.user_id = v_uid
     order by (r.status = 'Pending') desc, r.created_at desc
     limit 20;
end; $$;
revoke execute on function public.get_my_payment_reviews() from public, anon;
grant  execute on function public.get_my_payment_reviews() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_payment_reviews(p_status text default 'Pending')
returns table (
  id uuid, order_id uuid, order_code bigint, order_amount integer, order_status text,
  order_created_at timestamptz, review_reason text,
  user_id uuid, user_name text, user_email text, user_role text,
  reason text, paid_amount integer, txn_ref text, status text, credited_amount integer,
  duplicate_suspect boolean,
  resolution_note text, resolved_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('Pending','Credited','Dismissed') then
    raise exception 'INVALID_INPUT';
  end if;
  return query
    select r.id, o.id, o.order_code, o.amount, o.status,
           o.created_at, o.review_reason,
           r.user_id, coalesce(pp.display_name, ''), coalesce(u.email, ''), coalesce(u.role, ''),
           r.reason, r.paid_amount, r.txn_ref, r.status, r.credited_amount,
           public._payment_review_duplicate_suspect(r.id),
           r.resolution_note, r.resolved_at, r.created_at
      from public.payment_review_items r
      join public.payment_orders o on o.id = r.order_id
      left join public.users u on u.id = r.user_id
      left join public.public_profiles pp on pp.user_id = r.user_id
     where p_status is null or r.status = p_status
     order by r.created_at asc
     limit 200;
end; $$;
revoke execute on function public.admin_list_payment_reviews(text) from public, anon;
grant  execute on function public.admin_list_payment_reviews(text) to authenticated;

create or replace function public.admin_resolve_payment_review(
  p_item_id uuid, p_credit boolean, p_note text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order_id uuid; v_o public.payment_orders; v_i public.payment_review_items;
        v_note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_credit is null then raise exception 'INVALID_INPUT'; end if;
  if v_note = '' then raise exception 'REASON_REQUIRED'; end if;
  if char_length(v_note) > 500 then raise exception 'FIELD_TOO_LONG'; end if;

  select order_id into v_order_id from public.payment_review_items where id = p_item_id;
  if v_order_id is null then raise exception 'NOT_FOUND'; end if;
  -- Khoá đơn trước (cùng thứ tự với webhook) rồi mới tới dòng.
  select * into v_o from public.payment_orders where id = v_order_id for update;
  select * into v_i from public.payment_review_items where id = p_item_id for update;
  if v_i.status <> 'Pending' then raise exception 'ALREADY_REVIEWED'; end if;
  if v_i.user_id = auth.uid() then raise exception 'FORBIDDEN'; end if;

  if not p_credit then
    update public.payment_review_items
       set status = 'Dismissed', resolution_note = v_note,
           resolved_by = auth.uid(), resolved_at = now()
     where id = p_item_id;
    return jsonb_build_object('status', 'Dismissed', 'id', p_item_id);
  end if;

  if v_i.paid_amount is null or v_i.paid_amount <= 0 then
    raise exception 'NOTHING_TO_CREDIT';
  end if;
  if public._payment_review_duplicate_suspect(v_i.id) then
    raise exception 'DUPLICATE_SUSPECT';
  end if;

  -- Tiền thật đã về tài khoản CaLẻ (PayOS báo, đã kiểm chữ ký): ví + két cùng số.
  -- Không thưởng nạp ví cho giao dịch xử lý tay.
  perform public._wallet_apply(v_i.user_id, v_i.paid_amount, 'UserTopUp', null, null,
    'Nạp tiền qua PayOS (quản trị viên đã kiểm tra) #' || v_o.order_code);
  perform public._bank_apply(v_i.paid_amount);

  update public.payment_review_items
     set status = 'Credited', credited_amount = v_i.paid_amount, resolution_note = v_note,
         resolved_by = auth.uid(), resolved_at = now()
   where id = p_item_id;
  -- needs_review giữ true: lối cũ credit_wallet_from_payment vẫn bị chặn.
  if v_o.status <> 'PAID' then
    update public.payment_orders
       set status = 'PAID', paid_at = now(), updated_at = now()
     where id = v_o.id;
  end if;

  return jsonb_build_object('status', 'Credited', 'id', p_item_id, 'amount', v_i.paid_amount);
end; $$;
revoke execute on function public.admin_resolve_payment_review(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_resolve_payment_review(uuid, boolean, text) to authenticated;
