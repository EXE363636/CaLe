-- =============================================================================
-- 0020 — applications.marked_present_by_employer_id (0005) tham chiếu users
-- KHÔNG có ON DELETE → xoá tài khoản employer từng "xác nhận có mặt" bị lỗi
-- khoá ngoại (lộ ra khi cleanup `npm run test:payment`). Đổi sang SET NULL:
-- dấu marked_present_at vẫn giữ, chỉ mất người đánh dấu khi tài khoản bị xoá.
-- ADDITIVE + CORRECTIVE. Không sửa migration đã apply.
-- =============================================================================

do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any (con.conkey)
    where ns.nspname = 'public' and rel.relname = 'applications'
      and con.contype = 'f' and att.attname = 'marked_present_by_employer_id'
  loop
    execute format('alter table public.applications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.applications
  add constraint applications_marked_present_by_employer_id_fkey
  foreign key (marked_present_by_employer_id) references public.users (id) on delete set null;
