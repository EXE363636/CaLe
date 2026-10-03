#!/usr/bin/env bash
# Chạy thử migration 0034 (chặn duyệt trùng giờ) trên DB linked — KHÔNG ghi gì lại.
#
# Kết thúc bằng raise exception "DRYRUN_RESULT" → transaction LUÔN rollback. Mọi
# dòng phải "ok". ALTER FUNCTION … RENAME giữ khoá hàm tới hết transaction (vài
# giây): lần duyệt đơn thật trong lúc đó phải chờ. lock_timeout 3s: bận thì huỷ.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/dryrun-0034.sql"
{
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '60s';"
  echo "set local idle_in_transaction_session_timeout = '30s';"
  cat supabase/migrations/20261003000034_approve_overlap_guard.sql
  cat supabase/dryrun/0034_approve_overlap_scenarios.sql
  echo 'rollback;'
} > "$out"
npx supabase db query --linked -f "$out" || true
