#!/usr/bin/env bash
# Chạy thử migration 0028 + kịch bản trên DB linked — KHÔNG ghi gì lại.
#
# An toàn (security review T1):
#   * Timeout: không chờ khoá quá 3s (bận thì huỷ, không xếp hàng chặn
#     production), mỗi câu ≤ 60s, phiên treo trong transaction ≤ 30s.
#   * Kết thúc bằng `raise exception` mang bảng kết quả → transaction LUÔN
#     rollback, kể cả khi mọi kịch bản đạt; `rollback;` cuối chỉ để dự phòng.
#   * Trong lúc chạy, transaction giữ khoá trên wallet_ledger / applications /
#     platform_settings (DDL của migration) → ghi sổ ví (webhook PayOS, rút
#     tiền) phải chờ. Chạy lúc ít giao dịch; cả script chỉ vài giây.
#   * Nên chạy lúc ít người dùng. Kết quả nằm trong thông báo lỗi
#     "DRYRUN_RESULT …" (mọi dòng phải "ok").
# Cần kết nối được Postgres của project (cổng pooler).
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/dryrun-0028.sql"
{
  # `set local` → chỉ trong transaction này, không dính sang phiên khác nếu
  # kết nối được dùng lại. (Postgres ≥ 17 có thể thêm transaction_timeout.)
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '60s';"
  echo "set local idle_in_transaction_session_timeout = '30s';"
  cat supabase/migrations/20260930000028_worker_deposit.sql
  cat supabase/dryrun/0028_worker_deposit_scenarios.sql
  echo 'rollback;'
} > "$out"
npx supabase db query --linked -f "$out" || true
