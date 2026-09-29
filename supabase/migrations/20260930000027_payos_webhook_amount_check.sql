-- =============================================================================
-- 0027 — Webhook PayOS: so số tiền thực nhận trước khi cộng ví
-- =============================================================================
-- Trước đây `payos-webhook` chỉ kiểm chữ ký + code '00' rồi gọi
-- credit_wallet_from_payment(order_code) → cộng `payment_orders.amount` (số tiền
-- lúc TẠO đơn) dù PayOS báo nhận bao nhiêu. Khi thưởng nạp ví (0026) bật, sai
-- lệch này còn kéo theo tiền thưởng.
--
-- Hàm mới credit_wallet_from_payos(order_code, paid_amount, reference):
--   - Khoá đơn. PAID + cùng mã giao dịch (PayOS gửi lại) → ALREADY_PAID.
--   - Khớp số tiền + đơn PENDING → ghi `paid_amount`, `provider_ref` (mã giao
--     dịch PayOS) rồi gọi credit_wallet_from_payment (0026, gồm thưởng).
--   - Còn lại KHÔNG cộng ví, đặt `needs_review` + `review_reason`, trả
--     NEEDS_REVIEW; admin xử lý tay (hoàn tiền / cộng đúng số):
--       AMOUNT_MISMATCH   số tiền nhận ≠ số tiền đơn (hoặc thiếu);
--       ORDER_NOT_PAYABLE tiền về cho đơn CANCELLED / EXPIRED / FAILED;
--       EXTRA_PAYMENT     giao dịch thứ hai (mã khác) cho đơn đã PAID;
--       ALREADY_FLAGGED   giao dịch mới cho đơn đang chờ admin.
--     Giao dịch sau được nối vào review_reason, không ghi đè dấu vết cũ.
-- Không đổi hàm/cột cũ. `credit_wallet_from_payment(bigint)` vẫn dùng cho
-- mock-confirm (PAYOS_MOCK) và script kiểm thử.
-- =============================================================================

alter table public.payment_orders
  add column if not exists paid_amount   integer,
  add column if not exists needs_review  boolean not null default false,
  add column if not exists review_reason text;

create index if not exists payment_orders_needs_review_idx
  on public.payment_orders(created_at) where needs_review;

create or replace function public.credit_wallet_from_payos(
  p_order_code bigint, p_paid_amount integer, p_reference text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_o public.payment_orders; v_ref text := nullif(p_reference, '');
        v_reason text; v_note text;
begin
  select * into v_o from public.payment_orders where order_code = p_order_code for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- Gọi lại cùng giao dịch (hoặc đơn cũ chưa lưu mã giao dịch) -> idempotent.
  if v_o.status = 'PAID'
     and (v_ref is null or v_o.provider_ref is null or v_o.provider_ref = v_ref) then
    return jsonb_build_object('status', 'ALREADY_PAID', 'order_code', p_order_code);
  end if;
  -- Đơn đã bị đánh dấu, PayOS gửi lại đúng giao dịch đó -> không ghi thêm.
  if v_o.needs_review and v_ref is not null and v_o.provider_ref = v_ref then
    return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', v_o.review_reason,
      'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', v_o.paid_amount);
  end if;

  if v_o.status = 'PAID' then
    v_reason := 'EXTRA_PAYMENT';          -- giao dịch thứ hai cho đơn đã cộng ví
  elsif v_o.needs_review then
    v_reason := 'ALREADY_FLAGGED';        -- đơn đã chờ admin, không tự cộng nữa
  elsif p_paid_amount is null or p_paid_amount <> v_o.amount then
    v_reason := 'AMOUNT_MISMATCH';
  elsif v_o.status <> 'PENDING' then
    v_reason := 'ORDER_NOT_PAYABLE';      -- tiền về cho đơn đã huỷ / hết hạn / lỗi
  end if;

  if v_reason is null then
    update public.payment_orders
      set paid_amount = p_paid_amount, provider_ref = coalesce(v_ref, provider_ref),
          updated_at = now()
      where id = v_o.id;
    return public.credit_wallet_from_payment(p_order_code);
  end if;

  -- Không cộng ví. Lần đánh dấu đầu ghi paid_amount/provider_ref; các giao dịch
  -- sau chỉ nối vào review_reason để giữ đủ dấu vết cho admin.
  v_note := v_reason || ' paid=' || coalesce(p_paid_amount::text, 'null')
            || ' ref=' || coalesce(v_ref, '-');
  if v_o.needs_review or v_o.status = 'PAID' then
    update public.payment_orders
      set needs_review = true,
          review_reason = concat_ws(' | ', v_o.review_reason, v_note),
          updated_at = now()
      where id = v_o.id;
  else
    update public.payment_orders
      set needs_review = true, review_reason = v_note,
          paid_amount = p_paid_amount, provider_ref = coalesce(v_ref, provider_ref),
          updated_at = now()
      where id = v_o.id;
  end if;
  return jsonb_build_object('status', 'NEEDS_REVIEW', 'reason', v_reason,
    'order_code', p_order_code, 'amount', v_o.amount, 'paid_amount', p_paid_amount);
end; $$;

revoke execute on function public.credit_wallet_from_payos(bigint, integer, text)
  from public, anon, authenticated;
grant  execute on function public.credit_wallet_from_payos(bigint, integer, text)
  to service_role;
