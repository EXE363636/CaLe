#!/usr/bin/env bash
# Chạy thử migration 0033 (gia cố lượt quét tự chốt cọc) trên DB linked — KHÔNG ghi gì lại.
#
# Thứ tự: phần 1 (dữ liệu giả + tái hiện lỗi TRƯỚC 0033) → 0033 → phần 2 (kịch bản
# sau 0033). Kết thúc bằng raise exception "DRYRUN_RESULT" → transaction LUÔN
# rollback. Mọi dòng phải "ok".
# Lưu ý: lượt quét _auto_settle_overdue trong transaction cũng chạm các ca thật đã
# quá hạn (nếu có, cron 15 phút nên thường không có) rồi rollback; khoá hàng giữ
# tới hết transaction → chạy lúc ít giao dịch. lock_timeout 3s: bận thì huỷ.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/dryrun-0033.sql"
{
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '30s';"
  echo "set local idle_in_transaction_session_timeout = '30s';"
  cat supabase/dryrun/0033_settlement_sweep_pre.sql
  cat supabase/migrations/20261003000033_settlement_sweep_hardening.sql
  cat supabase/dryrun/0033_settlement_sweep_scenarios.sql
  echo 'rollback;'
} > "$out"
npx supabase db query --linked -f "$out" || true
