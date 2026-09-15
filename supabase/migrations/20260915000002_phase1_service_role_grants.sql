-- =============================================================================
-- BACKEND-MIGRATION-1 · Phase 1 — GRANT quyền bảng cho service_role
--
-- Bổ sung cho 20260915000001_phase1_auth_profile.sql (KHÔNG sửa file đó vì đã
-- push lên cale-dev).
--
-- Lý do: project TẮT "Automatically expose new tables" ⇒ bảng mới KHÔNG tự cấp
-- quyền cho service_role. service_role BYPASS RLS nhưng vẫn cần GRANT privilege
-- ở mức bảng — nếu thiếu, mọi truy cập PostgREST bằng service_role (migration/
-- server/integration test) đều bị từ chối. (Admin Auth API dùng role auth admin
-- riêng nên vẫn tạo user được; nhưng .from('users')... qua service_role thì không.)
-- =============================================================================

grant usage on schema public to service_role;

grant select, insert, update, delete on
  public.users,
  public.worker_profiles,
  public.employer_profiles,
  public.public_profiles
to service_role;
