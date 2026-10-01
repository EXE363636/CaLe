-- =============================================================================
-- Chạy thử 0032 (két sang bigint) trên DB thật — KHÔNG ghi gì lại.
-- Cách chạy: bash supabase/dryrun/run-0032.sh. Kết thúc bằng raise exception
-- "DRYRUN_RESULT" → transaction luôn rollback. Mọi dòng phải "ok".
-- Kịch bản 00 chạy TRƯỚC khi áp 0032 (file run ghép theo thứ tự đó) để chứng minh
-- lỗi tràn có thật; các kịch bản sau chạy trên 0032.
-- =============================================================================

do $after$
declare
  w uuid := gen_random_uuid();
  oc bigint := 9900000000 + (floor(random() * 90000000))::bigint * 10 + 1;
  v_k0 bigint; v_j jsonb; v_ok int := 0; v_all int := 0; v_txt text := '';
begin
  -- 01 Kiểu cột đã là bigint.
  v_all := v_all + 1;
  if (select data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'system_bank' and column_name = 'balance') = 'bigint' then
    v_ok := v_ok + 1; v_txt := v_txt || E'\nok   01 system_bank.balance là bigint';
  else v_txt := v_txt || E'\nFAIL 01 system_bank.balance là bigint'; end if;

  -- 02 Két sát trần int4, cộng thêm 1 triệu → không lỗi, vượt 2.147.483.647.
  v_k0 := (select balance from public.system_bank where id);
  update public.system_bank set balance = 2147483000 where id;
  v_all := v_all + 1;
  begin
    perform public._bank_apply(1000000);
    if (select balance from public.system_bank where id) = 2148483000 then
      v_ok := v_ok + 1; v_txt := v_txt || E'\nok   02 _bank_apply vượt trần int4 không lỗi';
    else v_txt := v_txt || E'\nFAIL 02 _bank_apply vượt trần int4: sai số'; end if;
  exception when others then v_txt := v_txt || E'\nFAIL 02 _bank_apply: ' || sqlerrm; end;

  -- 03 get_system_bank trả đúng số lớn.
  v_all := v_all + 1;
  v_j := public.get_system_bank();
  if (v_j->>'balance')::bigint = 2148483000 then
    v_ok := v_ok + 1; v_txt := v_txt || E'\nok   03 get_system_bank trả 2.148.483.000';
  else v_txt := v_txt || E'\nFAIL 03 get_system_bank: ' || v_j::text; end if;

  -- 04 Luồng nạp thật (webhook) chạy được khi két đã vượt int4.
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (w, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'dryrun-' || w || '@example.invalid',
            jsonb_build_object('role', 'worker', 'full_name', 'Dry'), jsonb_build_object('provider', 'email'), now(), now());
  update public.platform_settings set topup_bonus_amount = 0 where id;
  insert into public.payment_orders (order_code, user_id, amount, status, provider_ref)
    values (oc, w, 50000, 'PENDING', 'LINK-BIG');
  v_all := v_all + 1;
  begin
    v_j := public.credit_wallet_from_payos(oc, 50000, 'DRY-BIG1', 'LINK-BIG');
    if v_j->>'status' = 'PAID' and (select balance from public.system_bank where id) = 2148533000 then
      v_ok := v_ok + 1; v_txt := v_txt || E'\nok   04 webhook cộng ví khi két > int4: két 2.148.533.000';
    else v_txt := v_txt || E'\nFAIL 04 webhook: ' || v_j::text; end if;
  exception when others then v_txt := v_txt || E'\nFAIL 04 webhook: ' || sqlerrm; end;

  -- 05 Quyền: không đổi (client vẫn chỉ đọc qua RPC / policy select).
  v_all := v_all + 1;
  if not has_table_privilege('anon', 'public.system_bank', 'select')
     and not has_table_privilege('authenticated', 'public.system_bank', 'update')
     and not has_function_privilege('authenticated', 'public._bank_apply(integer)', 'execute') then
    v_ok := v_ok + 1; v_txt := v_txt || E'\nok   05 quyền két không đổi';
  else v_txt := v_txt || E'\nFAIL 05 quyền két'; end if;

  raise exception 'DRYRUN_RESULT (% / % ok)%', v_ok, v_all, v_txt;
end $after$;
