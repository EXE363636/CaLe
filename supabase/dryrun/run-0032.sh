#!/usr/bin/env bash
# Chạy thử migration 0032 (két sang bigint) trên DB linked — KHÔNG ghi gì lại.
#
# Thứ tự: kịch bản 00 (TRƯỚC 0032: két sát trần int4 + cộng thêm → phải lỗi tràn,
# chứng minh lỗi có thật) → 0032 → các kịch bản sau. Kết thúc bằng raise exception
# "DRYRUN_RESULT" → transaction LUÔN rollback.
# Lưu ý: ALTER TABLE giữ khoá system_bank tới hết transaction (vài giây) → webhook /
# nạp / rút phải chờ; chạy lúc ít giao dịch. lock_timeout 3s: bận thì huỷ.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/dryrun-0032.sql"
{
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '60s';"
  echo "set local idle_in_transaction_session_timeout = '30s';"
  cat <<'SQL'
create temp table _pre (txt text, ok boolean) on commit drop;
do $before$
declare v_type text;
begin
  select data_type into v_type from information_schema.columns
   where table_schema = 'public' and table_name = 'system_bank' and column_name = 'balance';
  if v_type = 'bigint' then
    insert into _pre values ('00 (bỏ qua) DB đã có 0032', true);
    return;
  end if;
  update public.system_bank set balance = 2147483000 where id;
  begin
    perform public._bank_apply(1000000);
    insert into _pre values ('00 trước 0032: cộng vượt trần int4 KHÔNG lỗi (không tái hiện được)', false);
  exception when others then
    insert into _pre values ('00 trước 0032: cộng vượt trần int4 → ' || sqlerrm, sqlerrm like '%out of range%');
  end;
end $before$;
SQL
  cat supabase/migrations/20261001000032_bank_balance_bigint.sql
  # Ghép kết quả kịch bản 00 vào thông báo cuối.
  sed -e "s/  raise exception 'DRYRUN_RESULT (% \/ % ok)%', v_ok, v_all, v_txt;/  select v_ok + count(*) filter (where ok), v_all + count(*), coalesce(string_agg(case when ok then E'\\nok   ' else E'\\nFAIL ' end || txt, ''), '') || v_txt into v_ok, v_all, v_txt from _pre;\n  raise exception 'DRYRUN_RESULT (% \/ % ok)%', v_ok, v_all, v_txt;/" supabase/dryrun/0032_bank_bigint_scenarios.sql
  echo 'rollback;'
} > "$out"
npx supabase db query --linked -f "$out" || true
