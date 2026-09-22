-- Corrective: fix ON CONFLICT DO UPDATE syntax trong _wallet_apply.
-- Lỗi: `public.wallets.balance` trong ON CONFLICT không hợp lệ.
-- Fix: dùng `wallets.balance` (refer existing row).

create or replace function public._wallet_apply(
  p_user uuid, p_amount int, p_kind text, p_shift uuid, p_app uuid, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.wallet_ledger(user_id, kind, amount, shift_id, application_id, note)
    values (p_user, p_kind, p_amount, p_shift, p_app, p_note);
  insert into public.wallets(user_id, balance, updated_at)
    values (p_user, p_amount, now())
    on conflict (user_id) do update
      set balance = balance + p_amount, updated_at = now();
end; $$;
