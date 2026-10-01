#!/usr/bin/env bash
# Chạy thử migration 0031 + kịch bản trên DB linked — KHÔNG ghi gì lại.
#
# Ghép 0030 trước 0031: 0030 chạy lại được nhiều lần (create or replace /
# drop if exists), nên script dùng được cả trước lẫn sau khi 0030 đã db push.
# An toàn: giống run-0029.sh (timeout khoá 3s, câu ≤ 60s, kết thúc bằng
# raise exception → transaction LUÔN rollback). Kết quả nằm trong thông báo
# lỗi "DRYRUN_RESULT …" (mọi dòng phải "ok").
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/dryrun-0031.sql"
{
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '60s';"
  echo "set local idle_in_transaction_session_timeout = '30s';"
  cat supabase/migrations/20261001000030_payos_hardening.sql
  cat supabase/migrations/20261001000031_user_notifications.sql
  cat supabase/dryrun/0031_user_notifications_scenarios.sql
  echo 'rollback;'
} > "$out"
npx supabase db query --linked -f "$out" || true
