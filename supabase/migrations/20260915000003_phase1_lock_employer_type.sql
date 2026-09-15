-- =============================================================================
-- BACKEND-MIGRATION-1 · Phase 1 — KHÓA employer_type / employer_type10a
--
-- Bổ sung cho 20260915000001 (đã push — KHÔNG sửa file đó). Migration 0001 lỡ
-- GRANT UPDATE hai cột này cho `authenticated`; nhưng đây là dữ liệu KHÓA:
--   - Loại tài khoản đặt lúc đăng ký (trigger signup, SECURITY DEFINER — vẫn ghi
--     được, không phụ thuộc GRANT).
--   - Đổi loại sau đó phải qua luồng type-change do admin duyệt (Phase 1 giữ ở
--     deferred/localStorage; sẽ migrate ở phase verification/moderation).
--
-- Vì vậy REVOKE quyền UPDATE hai cột khỏi authenticated để client KHÔNG tự đổi.
-- =============================================================================

revoke update (employer_type, employer_type10a)
  on public.employer_profiles from authenticated;
