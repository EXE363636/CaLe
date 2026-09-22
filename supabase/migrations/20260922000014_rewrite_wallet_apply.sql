-- Corrective: rewrite _wallet_apply để tránh ON CONFLICT issue với search_path=''.
-- Dùng UPDATE (if exists) + INSERT (if not), thay vì ON CONFLICT.

create or replace function public._wallet_apply(
  p_user uuid, p_amount int, p_kind text, p_shift uuid, p_app uuid, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.wallet_ledger(user_id, kind, amount, shift_id, application_id, note)
    values (p_user, p_kind, p_amount, p_shift, p_app, p_note);

  -- Try UPDATE first; if no rows affected, INSERT new.
  update public.wallets
    set balance = balance + p_amount, updated_at = now()
    where user_id = p_user;

  if not found then
    insert into public.wallets(user_id, balance, updated_at)
      values (p_user, p_amount, now());
  end if;
end; $$;
