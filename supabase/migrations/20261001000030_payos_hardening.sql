-- =============================================================================
-- 0030 — Gia cố webhook PayOS + chặn xoá người dùng có lịch sử tiền
-- =============================================================================
-- Các mục "còn mở" của handoff 10-01 mục 5.4 (security-reviewer 0029, mức Thấp):
--
-- 1. Số tiền vượt int4 → RPC lỗi → webhook 500 → PayOS gửi lại mãi.
--    credit_wallet_from_payos nhận p_paid_amount NUMERIC (bỏ bản integer); số
--    không nguyên / ngoài [1, 2147483647] → coi như không có số tiền hợp lệ
--    (AMOUNT_MISMATCH, paid null → admin chỉ "Không cộng" được). Edge Function
--    payos-webhook gọi theo tên tham số → KHÔNG cần deploy lại.
-- 2. Mã giao dịch PayOS dùng lại ở đơn khác → vi phạm unique index
--    payment_orders.provider_txn_ref → 500 lặp. Nay: lý do mới DUPLICATE_TXN_REF,
--    không gắn mã vào đơn này, ghi dòng cho admin; cộng dòng đó bị chặn
--    DUPLICATE_SUSPECT nếu mã đã được cộng ở đơn khác.
-- 3. Đơn PAID trước 0027 (không lưu mã giao dịch) nuốt mọi giao dịch mới thành
--    ALREADY_PAID. Nay chỉ coi là "gửi lại" khi đơn được trả trong 24 giờ qua;
--    muộn hơn → EXTRA_PAYMENT (có dòng). Cộng dòng cùng số tiền đơn → nghi trùng.
-- 4. get_payment_order_status báo NOT_OWNER khác ORDER_NOT_FOUND → đoán được mã
--    đơn của người khác. Nay cả hai là ORDER_NOT_FOUND.
-- 5. Xoá người dùng có ví / sổ ví / đơn nạp / đơn chi → trước đây xoá được (ví,
--    sổ ví, đơn nạp bị xoá theo cascade; tiền về sau cho QR cũ thành
--    "unknown-order"). Nay trigger trên public.users chặn (USER_HAS_MONEY_HISTORY);
--    Edge Function admin-users kiểm trước bằng _user_has_money_history để báo lỗi
--    rõ (cần deploy admin-users).
--
-- security-reviewer 0030 lượt 1 (đã sửa trong file này):
--   M1 — hai admin cộng cùng lúc 2 dòng CÙNG mã ở 2 đơn khác nhau → cộng trùng.
--        Sửa: khoá advisory theo mã giao dịch (_payos_txn_lock) trong
--        admin_resolve_payment_review (định nghĩa lại) và trong webhook (bỏ luôn
--        lỗi 500 tạm thời khi 2 webhook cùng mã tới 2 đơn cùng lúc — L1).
--   M2 — mã đã "Không cộng" (hoàn tay) ở đơn khác không tính nghi trùng → vừa
--        hoàn tay vừa cộng ví. Sửa: dòng cùng mã ở đơn khác đã Credited HOẶC
--        Dismissed → nghi trùng.
--   M3 — đơn nạp chưa trả / đã huỷ không chặn xoá → tiền về sau mất dấu. Sửa:
--        mọi đơn nạp đều chặn xoá.
--   L2 — nhận diện đơn PAID kiểu cũ bằng mốc: không có dòng Credited nào xử
--        TRƯỚC / CÙNG lúc đơn được trả (admin cộng đơn chưa trả thì paid_at =
--        resolved_at); dòng thêm cộng sau không làm mất cờ.
--   L3 — paidByReview đúng cả cho đơn cộng qua dòng DUPLICATE_TXN_REF (đơn không
--        gắn mã).
--
-- Logic thuần tương ứng: src/domain/paymentReview.ts (toPaidAmountInt,
-- isLegacyPaidRetry, isDuplicateSuspect opts).
-- Thứ tự khoá: payment_orders → payment_review_items → khoá mã giao dịch (_payos_txn_lock) → wallets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Lý do mới + index tra mã giao dịch trên mọi đơn
-- ---------------------------------------------------------------------------
alter table public.payment_review_items
  drop constraint if exists payment_review_items_reason_check;
alter table public.payment_review_items
  add constraint payment_review_items_reason_check
  check (reason in ('AMOUNT_MISMATCH','MISSING_REFERENCE','LINK_MISMATCH',
                    'ORDER_NOT_PAYABLE','EXTRA_PAYMENT','ALREADY_FLAGGED',
                    'DUPLICATE_TXN_REF'));
create index if not exists payment_review_items_txn_ref_idx
  on public.payment_review_items(txn_ref) where txn_ref is not null;

-- ---------------------------------------------------------------------------
-- Khoá theo mã giao dịch PayOS (giữ tới hết transaction). Thứ tự khoá ở mọi
-- hàm: payment_orders → payment_review_items → khoá mã → wallets.
-- ---------------------------------------------------------------------------
create or replace function public._payos_txn_lock(p_ref text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ref is not null then
    perform pg_advisory_xact_lock(hashtextextended('payos_txn:' || p_ref, 0));
  end if;
end; $$;
revoke execute on function public._payos_txn_lock(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1–3. Webhook: bản 0029 + số tiền numeric, mã trùng đơn khác, đơn PAID cũ
-- ---------------------------------------------------------------------------
drop function if exists public.credit_wallet_from_payos(bigint, integer, text, text);

create or replace function public.credit_wallet_from_payos(
  p_order_code bigint, p_paid_amount numeric, p_reference text, p_payment_link_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payment_orders;
        v_ref  text := nullif(btrim(p_reference), '');
        v_link text := nullif(btrim(p_payment_link_id), '');
        -- Khớp toPaidAmountInt: chỉ số nguyên trong [1, int4], còn lại → null.
        v_paid integer := case
          when p_paid_amount is not null and p_paid_amount = trunc(p_paid_amount)
               and p_paid_amount between 1 and 2147483647
          then p_paid_amount::integer end;
        v_ref_elsewhere boolean;
        v_reason text; v_note text;
begin
  select * into v_o from public.payment_orders where order_code = p_order_code for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- PayOS gửi lại đúng giao dịch đã xử lý -> không làm gì thêm. Đơn PAID chưa gắn
  -- mã + chưa từng bị đánh dấu (đơn trước 0027 / lối mock) chỉ được coi là "gửi
  -- lại" trong 24 giờ sau khi trả (khớp isLegacyPaidRetry).
  if v_o.status = 'PAID'
     and (v_o.provider_txn_ref = v_ref
          or (v_o.provider_txn_ref is null and not v_o.needs_review
              and v_o.paid_at > now() - interval '24 hours')) then
    return jsonb_build_object('status', 'ALREADY_PAID', 'order_code', p_order_code);
  end if;
  if v_o.needs_review and v_ref is not null
     and (v_o.provider_txn_ref = v_ref
          or position('ref=' || v_ref || ' ' in coalesce(v_o.review_reason, '') || ' ') > 0) then
    return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', 'ALREADY_RECORDED',
      'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', v_o.paid_amount);
  end if;

  -- Mã giao dịch đã gắn với đơn khác (đơn / dòng kiểm tra) → không gắn lại vào
  -- đơn này (tránh vi phạm unique → 500 lặp), ghi dòng cho admin. Khoá theo mã
  -- trước: webhook cùng mã cho đơn khác đang chạy thì chờ nó xong rồi mới đọc.
  perform public._payos_txn_lock(v_ref);
  v_ref_elsewhere := v_ref is not null and (
    exists (select 1 from public.payment_orders o2
             where o2.provider_txn_ref = v_ref and o2.id <> v_o.id)
    or exists (select 1 from public.payment_review_items x
                where x.txn_ref = v_ref and x.order_id <> v_o.id));

  if v_ref_elsewhere then
    v_reason := 'DUPLICATE_TXN_REF';
  elsif v_o.status = 'PAID' then
    v_reason := 'EXTRA_PAYMENT';
  elsif v_o.needs_review then
    v_reason := 'ALREADY_FLAGGED';
  elsif v_paid is null or v_paid <> v_o.amount then
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
      set paid_amount = v_paid, provider_txn_ref = v_ref, updated_at = now()
      where id = v_o.id;
    return public.credit_wallet_from_payment(p_order_code);
  end if;

  -- Không cộng ví. Đơn chưa gắn giao dịch nào thì gắn giao dịch này (paid_amount,
  -- provider_txn_ref — trừ khi mã thuộc đơn khác); các giao dịch sau chỉ nối vào
  -- review_reason.
  v_note := v_reason || ' paid=' || coalesce(v_paid::text, 'null')
            || ' ref=' || coalesce(v_ref, '-');
  if v_o.provider_txn_ref is null and v_o.status <> 'PAID' then
    update public.payment_orders
      set needs_review = true, review_reason = concat_ws(' | ', v_o.review_reason, v_note),
          paid_amount = v_paid,
          provider_txn_ref = case when v_ref_elsewhere then null else v_ref end,
          updated_at = now()
      where id = v_o.id;
  else
    update public.payment_orders
      set needs_review = true, review_reason = concat_ws(' | ', v_o.review_reason, v_note),
          updated_at = now()
      where id = v_o.id;
  end if;

  -- Một dòng cho admin xử. Chống trùng khi PayOS gửi lại: cùng mã giao dịch;
  -- không mã → cùng số tiền (khớp shouldRecordReviewItem).
  if not exists (
    select 1 from public.payment_review_items r
     where r.order_id = v_o.id
       and ((v_ref is not null and r.txn_ref = v_ref)
            or (v_ref is null and r.txn_ref is null
                and r.paid_amount is not distinct from v_paid))
  ) then
    insert into public.payment_review_items (order_id, user_id, reason, paid_amount, txn_ref)
      values (v_o.id, v_o.user_id, v_reason, v_paid, v_ref);
  end if;

  return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', v_reason,
    'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', v_paid,
    'paid_amount_raw', p_paid_amount);
end; $$;

revoke execute on function public.credit_wallet_from_payos(bigint, numeric, text, text)
  from public, anon, authenticated;
grant  execute on function public.credit_wallet_from_payos(bigint, numeric, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Nghi trùng: bản 0029 + (khớp isDuplicateSuspect opts)
--   - đơn PAID kiểu cũ (trước 0027 / lối mock: chưa có mã, chưa có paid_amount,
--     không có dòng Credited nào xử trước hoặc cùng lúc đơn được trả): dòng cùng
--     số tiền đơn → nghi trùng (có mã hay không);
--   - dòng có mã: mã đó đã được xử ở ĐƠN KHÁC (tự động: đơn PAID mang mã đó mà
--     mã không phải dòng bị đánh dấu; hoặc admin: dòng cùng mã đã Credited /
--     Dismissed — "không cộng" nghĩa là đã hoàn tay).
-- ---------------------------------------------------------------------------
create or replace function public._payment_review_duplicate_suspect(p_item_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select
      (o.status = 'PAID' and o.provider_txn_ref is null and o.paid_amount is null
       and i.paid_amount = o.amount
       and not exists (select 1 from public.payment_review_items c
                        where c.order_id = o.id and c.status = 'Credited'
                          and c.resolved_at <= o.paid_at))
      or case when i.txn_ref is null then
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
             or exists (select 1 from public.payment_orders o2
                         where o2.provider_txn_ref = i.txn_ref and o2.id <> i.order_id
                           and o2.status = 'PAID'
                           and not exists (select 1 from public.payment_review_items y
                                            where y.order_id = o2.id and y.txn_ref = i.txn_ref))
             or exists (select 1 from public.payment_review_items z
                         where z.txn_ref = i.txn_ref and z.order_id <> i.order_id
                           and z.status in ('Credited', 'Dismissed'))
           end
      from public.payment_review_items i
      join public.payment_orders o on o.id = i.order_id
     where i.id = p_item_id), false);
$$;
revoke execute on function public._payment_review_duplicate_suspect(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin xử dòng: bản 0029 + khoá theo mã giao dịch trước khi kiểm nghi trùng
-- (M1). Ở read committed, câu kiểm sau khi lấy khoá thấy dòng bên kia vừa commit.
-- ---------------------------------------------------------------------------
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
  -- Khoá đơn trước (cùng thứ tự với webhook) rồi tới dòng, rồi tới mã giao dịch.
  select * into v_o from public.payment_orders where id = v_order_id for update;
  select * into v_i from public.payment_review_items where id = p_item_id for update;
  if v_i.status <> 'Pending' then raise exception 'ALREADY_REVIEWED'; end if;
  if v_i.user_id = auth.uid() then raise exception 'FORBIDDEN'; end if;
  perform public._payos_txn_lock(v_i.txn_ref);

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

-- ---------------------------------------------------------------------------
-- 4. Trạng thái đơn của người nạp: không phân biệt "không có" / "của người khác"
-- ---------------------------------------------------------------------------
create or replace function public.get_payment_order_status(p_order_code bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_o public.payment_orders;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_o from public.payment_orders
   where order_code = p_order_code and user_id = v_uid;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  return jsonb_build_object(
    'orderCode', v_o.order_code, 'status', v_o.status, 'amount', v_o.amount,
    'checkoutUrl', v_o.checkout_url, 'qrCode', v_o.qr_code, 'paidAt', v_o.paid_at,
    'needsReview', exists (select 1 from public.payment_review_items r
                            where r.order_id = v_o.id and r.status = 'Pending'),
    'reviewed', exists (select 1 from public.payment_review_items r where r.order_id = v_o.id),
    -- Đơn PAID do admin cộng = có dòng Credited và đơn KHÔNG được cộng tự động
    -- (tự động ⇔ đơn mang mã mà mã đó không phải một dòng bị đánh dấu).
    'paidByReview', v_o.status = 'PAID'
      and exists (select 1 from public.payment_review_items r
                   where r.order_id = v_o.id and r.status = 'Credited')
      and (v_o.provider_txn_ref is null
           or exists (select 1 from public.payment_review_items r
                       where r.order_id = v_o.id and r.txn_ref = v_o.provider_txn_ref)));
end; $$;
revoke execute on function public.get_payment_order_status(bigint) from public, anon;
grant  execute on function public.get_payment_order_status(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Không xoá người dùng có lịch sử tiền (ví ≠ 0, sổ ví, đơn nạp — mọi trạng
--    thái, vì tiền vẫn có thể về cho QR cũ —, đơn chi, cọc người lao động).
--    Admin dùng "Khoá" thay thế.
-- ---------------------------------------------------------------------------
create or replace function public._user_has_money_history(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wallet_ledger where user_id = p_user_id)
      or exists (select 1 from public.wallets
                  where user_id = p_user_id and (balance <> 0 or promo_balance <> 0))
      or exists (select 1 from public.payment_orders where user_id = p_user_id)
      or exists (select 1 from public.payment_review_items where user_id = p_user_id)
      or exists (select 1 from public.payout_orders where user_id = p_user_id)
      or exists (select 1 from public.worker_holds
                  where worker_id = p_user_id or employer_id = p_user_id);
$$;
revoke execute on function public._user_has_money_history(uuid) from public, anon, authenticated;
grant  execute on function public._user_has_money_history(uuid) to service_role;

create or replace function public._users_block_delete_with_money()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public._user_has_money_history(old.id) then
    raise exception 'USER_HAS_MONEY_HISTORY'
      using hint = 'Tài khoản có lịch sử tiền thật; dùng "Khoá" thay vì xoá.';
  end if;
  return old;
end; $$;
revoke execute on function public._users_block_delete_with_money() from public, anon, authenticated;

drop trigger if exists users_block_delete_with_money on public.users;
create trigger users_block_delete_with_money
  before delete on public.users
  for each row execute function public._users_block_delete_with_money();
