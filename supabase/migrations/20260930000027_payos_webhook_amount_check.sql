-- =============================================================================
-- 0027 — Webhook PayOS: so số tiền thực nhận trước khi cộng ví
-- =============================================================================
-- Trước đây `payos-webhook` chỉ kiểm chữ ký + code '00' rồi gọi
-- credit_wallet_from_payment(order_code) → cộng `payment_orders.amount` (số tiền
-- lúc TẠO đơn) dù PayOS báo nhận bao nhiêu. Khi thưởng nạp ví (0026) bật, sai
-- lệch này còn kéo theo tiền thưởng.
--
-- Cột mới trên payment_orders:
--   paid_amount       số tiền PayOS báo đã nhận (giao dịch đầu tiên của đơn).
--   provider_txn_ref  mã giao dịch PayOS (`data.reference`) đã gắn với đơn.
--                     (`provider_ref` giữ nguyên = paymentLinkId lúc tạo đơn.)
--   needs_review / review_reason  đơn cần admin xử lý tay, không tự cộng ví.
--
-- Hàm mới credit_wallet_from_payos(order_code, paid_amount, reference,
-- payment_link_id) — chỉ service_role:
--   - PAID và cùng mã giao dịch (PayOS gửi lại) → ALREADY_PAID. Đơn PAID trước
--     0027 (chưa có provider_txn_ref) cũng coi là ALREADY_PAID.
--   - Khớp số tiền + đơn PENDING + đúng payment link → ghi paid_amount,
--     provider_txn_ref rồi gọi credit_wallet_from_payment (0026, gồm thưởng).
--   - Còn lại KHÔNG cộng ví, đặt needs_review, trả NEEDS_REVIEW:
--       AMOUNT_MISMATCH   số tiền nhận ≠ số tiền đơn (hoặc thiếu);
--       MISSING_REFERENCE webhook không có mã giao dịch (data.reference);
--       LINK_MISMATCH     paymentLinkId của webhook ≠ link đã tạo cho đơn;
--       ORDER_NOT_PAYABLE tiền về cho đơn CANCELLED / EXPIRED / FAILED;
--       EXTRA_PAYMENT     giao dịch khác cho đơn đã PAID;
--       ALREADY_FLAGGED   giao dịch khác cho đơn đang chờ admin.
--     Mỗi giao dịch chỉ được ghi vào review_reason một lần (gửi lại không nối trùng).
--
-- credit_wallet_from_payment(bigint) (0026) được định nghĩa lại, thân giữ nguyên,
-- chỉ thêm chặn `ORDER_NEEDS_REVIEW`: đơn đã bị đánh dấu không thể được cộng qua
-- lối cũ (mock-confirm, script, xử lý tay).
-- =============================================================================

alter table public.payment_orders
  add column if not exists paid_amount      integer,
  add column if not exists provider_txn_ref text,
  add column if not exists needs_review     boolean not null default false,
  add column if not exists review_reason    text;

create unique index if not exists payment_orders_provider_txn_ref_uidx
  on public.payment_orders(provider_txn_ref) where provider_txn_ref is not null;
create index if not exists payment_orders_needs_review_idx
  on public.payment_orders(created_at) where needs_review;

-- ---------------------------------------------------------------------------
-- 1. Lối cũ: bản 0026 + chặn đơn đang chờ admin
-- ---------------------------------------------------------------------------
create or replace function public.credit_wallet_from_payment(p_order_code bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payment_orders; v_s public.platform_settings;
        v_role text; v_suspended boolean; v_times int; v_bonus int := 0;
begin
  select * into v_o from public.payment_orders where order_code = p_order_code for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- Idempotent: đã ghi nhận trả rồi -> trả trạng thái, không cộng lần hai.
  if v_o.status = 'PAID' then
    return jsonb_build_object('status', 'ALREADY_PAID', 'order_code', p_order_code);
  end if;
  if v_o.status in ('CANCELLED','EXPIRED','FAILED') then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;
  -- 0027: đơn lệch số tiền / cần admin xem -> không cộng qua bất kỳ lối nào.
  if v_o.needs_review then
    raise exception 'ORDER_NEEDS_REVIEW';
  end if;

  update public.payment_orders
    set status = 'PAID', paid_at = now(), updated_at = now()
    where id = v_o.id;

  -- Cộng ví người nạp + két (tiền thật vào hệ thống).
  perform public._wallet_apply(v_o.user_id, v_o.amount, 'UserTopUp', null, null,
    'Nạp tiền vào ví qua PayOS');
  perform public._bank_apply(v_o.amount);

  -- P2-2: thưởng nạp ví (chỉ nhà tuyển dụng). Dòng ví của người này đã bị khoá
  -- bởi _wallet_apply ở trên → các lần nạp đồng thời của cùng người xếp hàng,
  -- đếm số lần thưởng không bị đua.
  select * into v_s from public.platform_settings where id;
  select role, suspended into v_role, v_suspended from public.users where id = v_o.user_id;
  if v_role = 'employer' and not coalesce(v_suspended, false)
     and coalesce(v_s.topup_bonus_amount, 0) > 0
     and v_o.amount >= coalesce(v_s.topup_bonus_min, 0) then
    select count(*) into v_times from public.payment_orders
      where user_id = v_o.user_id and bonus_amount > 0;
    if v_times < coalesce(v_s.topup_bonus_max_per_user, 0) then
      v_bonus := v_s.topup_bonus_amount;
      update public.payment_orders set bonus_amount = v_bonus where id = v_o.id;
      perform public._promo_apply(v_o.user_id, v_bonus, 'TopUpBonus', null,
        'Thưởng nạp ví (chỉ dùng trả phí dịch vụ)');
    end if;
  end if;

  return jsonb_build_object('status', 'PAID', 'order_code', p_order_code,
    'amount', v_o.amount, 'bonus', v_bonus);
end; $$;

-- ---------------------------------------------------------------------------
-- 2. Lối webhook: so số tiền + mã giao dịch
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

  -- PayOS gửi lại đúng giao dịch đã xử lý -> không làm gì thêm.
  if v_o.status = 'PAID'
     and (v_o.provider_txn_ref is null or v_o.provider_txn_ref = v_ref) then
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
  return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', v_reason,
    'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', p_paid_amount);
end; $$;

revoke execute on function public.credit_wallet_from_payos(bigint, integer, text, text)
  from public, anon, authenticated;
grant  execute on function public.credit_wallet_from_payos(bigint, integer, text, text)
  to service_role;
