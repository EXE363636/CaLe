#!/usr/bin/env bash
# Chạy thử migration 0035 (chat theo đơn ứng tuyển) trên DB linked — KHÔNG ghi gì lại.
#
# Kết thúc bằng raise exception "DRYRUN_RESULT" → transaction LUÔN rollback. Mọi
# dòng phải "ok". Chỉ thêm bảng / hàm / policy mới + đổi check constraint của
# user_notifications (khoá bảng thông báo vài giây). lock_timeout 3s: bận thì huỷ.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${TMPDIR:-/tmp}/dryrun-0035.sql"
{
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '30s';"
  echo "set local idle_in_transaction_session_timeout = '30s';"
  cat supabase/migrations/20261003000035_application_chat.sql
  cat supabase/dryrun/0035_application_chat_scenarios.sql
  echo 'rollback;'
} > "$out"
npx supabase db query --linked -f "$out" || true
