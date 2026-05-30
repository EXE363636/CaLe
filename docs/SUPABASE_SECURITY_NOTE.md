# Supabase — Lưu ý an toàn (đọc trước khi cấu hình backend)

**Ngày:** 31/05/2026
**Trạng thái:** Supabase **chưa được tạo project**. Tài liệu này là hướng
dẫn an toàn cho BACKEND-MIGRATION-1 khi bắt đầu.

> Nguyên tắc vàng: thứ gì lộ ra trình duyệt thì coi như công khai. Chỉ
> những giá trị an toàn cho client mới được gắn tiền tố `NEXT_PUBLIC_`.

---

## 1. Project URL — có thể chia sẻ

`NEXT_PUBLIC_SUPABASE_URL` (URL của project) **có thể** đưa vào cấu hình
app và lộ ra trình duyệt. Bản thân URL không phải bí mật.

## 2. Publishable / anon key — dùng được ở trình duyệt NẾU RLS đúng

`NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable key) **có thể** dùng
trong trình duyệt — **NHƯNG chỉ an toàn khi Row Level Security (RLS) và
policy đã được cấu hình đúng** cho mọi bảng. Nếu RLS sai/tắt, anon key
có thể đọc/ghi dữ liệu không được phép. Bật RLS cho TẤT CẢ bảng trước
khi dùng anon key ở client.

## 3. Secret key / service_role key — TUYỆT ĐỐI KHÔNG lộ

`service_role` (và bất kỳ secret key nào) **bỏ qua RLS** và có toàn
quyền. **Không bao giờ**:
- đưa vào code frontend / component / bất kỳ biến `NEXT_PUBLIC_` nào;
- in ra log, console, hay báo cáo;
- dán vào chat công khai, issue, hay ảnh chụp màn hình;
- commit vào git.

Chỉ dùng `service_role` ở phía server (migration script, server route,
edge function) qua biến môi trường server-only.

## 4. Nếu đã lỡ lộ secret / service_role key công khai

**Rotate/revoke ngay** trong Supabase dashboard (Settings → API → tạo key
mới / thu hồi key cũ) **TRƯỚC KHI** bắt đầu backend migration. Coi key đã
lộ là bị xâm phạm vĩnh viễn.

## 5. Dùng biến môi trường

- Sao chép `.env.example` → `.env.local` (đã được gitignore) và điền giá
  trị thật ở đó. **Không** commit `.env.local`.
- `NEXT_PUBLIC_*` → an toàn cho trình duyệt (URL, anon key khi RLS đúng).
- `SUPABASE_DATABASE_URL` và mọi secret → **server / migration only**,
  không có tiền tố `NEXT_PUBLIC_`.
- Trên hosting (ví dụ Vercel), đặt biến môi trường ở dashboard của
  hosting, không hard-code trong source.

## 6. Migration bắt đầu từ bảng an toàn trước (không phải tiền/escrow)

Thứ tự an toàn (chi tiết trong `docs/BACKEND_MIGRATION_PLAN.md`):

1. `users` / profiles
2. `shifts` / `shift_drafts`
3. `applications`
4. `attendance_events`
5. `notifications`
6. **`wallet` / ledger / escrow** — chỉ sau khi các bảng trên ổn định,
   vì logic tiền phải server-authoritative và là phần rủi ro nhất.
7. `disputes` / `reviews`
8. `schedule_blocks`
9. `worker_skill_scores`

Lý do hoãn tiền/escrow: logic tiền không được phụ thuộc client; phải
được quyết định + ghi nhận ở server với RLS chặt. Làm các bảng an toàn
trước giúp dựng nền auth + RLS + pattern truy cập đúng trước khi đụng
đến tiền.
