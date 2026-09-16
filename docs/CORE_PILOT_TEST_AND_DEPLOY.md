# Core Pilot — Hướng dẫn test tay 2 tài khoản + Checklist deploy Vercel

**Ngày:** 2026-09-16 · Mốc code freeze **20/9**. Bám `main@ae93ad8` (Phase 2 Slice 4 A–G).
Không thêm chức năng mới. Không payment/GPS/OTP/rating/Boost/editAsync.

---

## PHẦN A — Test tay 2 tài khoản thật (cale-dev)

### A0. Chuẩn bị
- `.env.local` (mode supabase, lấy ở Dashboard `cale-dev` → Settings → API):
  ```
  NEXT_PUBLIC_DATA_MODE=supabase
  NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
  ```
- Chạy `npm run dev` (port 3000).
- **Hai phiên đăng nhập song song:** session Supabase lưu theo origin/profile trình duyệt →
  dùng **2 profile trình duyệt khác nhau** (hoặc 1 cửa sổ thường + 1 ẩn danh) để employer và
  worker đăng nhập cùng lúc. (Một tab thường không giữ được 2 phiên.)
- **Tài khoản:** `cale-dev` đang **BẬT email confirmation**. Cách nhanh nhất: nhờ quản trị tạo
  sẵn 2 tài khoản đã confirm trong Supabase Dashboard (Auth → Users → Add user, tick *Auto
  confirm*, set user metadata `role`), hoặc đăng ký qua UI rồi bấm link xác nhận trong email.
  - Employer metadata: `{role:'employer', company_name, business_type, employer_type:'business', employer_type10a:'Company'}`
  - Worker metadata: `{role:'worker', full_name, phone}`

### A1. Luồng lõi (mục tiêu Core Pilot)
1. **Employer (profile 1):** đăng nhập → **Đăng ca tuyển** (`/employer/shifts/new`) → điền:
   Tên ca; Loại công việc; Địa điểm; **Ngày làm = sau HÔM NAY hơn 24 giờ** (vd +3 ngày); Giờ
   bắt đầu/kết thúc (end > start, cùng ngày); Lương/giờ; Số lượng; **Ảnh địa điểm** (điền tên
   file mô phỏng, vd `mat-tien.jpg`); Người phụ trách + SĐT (SĐT hợp lệ VN). → **Đăng ca /
   cọc mô phỏng** → xác nhận **"Đảm bảo thanh toán (mô phỏng)"** → ca được đăng.
   - ✔ Kỳ vọng: chuyển sang trang chi tiết ca; ca ở trạng thái **Đã đăng**.
   - Lưu ý: ở supabase mode gate xác minh nhà tuyển dụng đã được **nới** (verification chưa
     migrate, không phải security gate — RPC không chặn). Không cần xác minh để đăng.
2. **Worker (profile 2):** đăng nhập → **Tìm ca làm** (`/shifts`) → thấy ca vừa đăng + **tên
   NTD** → mở chi tiết → **Ứng tuyển**.
   - ✔ Kỳ vọng: nút Ứng tuyển hoạt động (gate xác minh SĐT đã nới ở supabase mode); trạng thái
     đơn = **Chờ duyệt**.
3. **Employer (profile 1):** mở chi tiết ca (`/employer/shifts/[id]`) → thấy ứng viên → **Duyệt**
   (hoặc **Từ chối** kèm lý do).
   - ✔ Kỳ vọng: đơn → **Đã duyệt**; `Còn X/Y vị trí` giảm 1.
4. **Worker (profile 2):** **focus lại** tab worker (hoặc mở lại `/worker/dashboard`) → trạng
   thái đơn hiện **Đã duyệt** — **KHÔNG cần reload thủ công** nhờ refetch-on-focus.
   - ✔ Kỳ vọng chính của Core Pilot: 2 máy thấy cùng trạng thái sau khi focus.

### A2. Luồng phụ (nếu còn thời gian)
- **Worker rút đơn:** dashboard/chi tiết → Huỷ đơn + lý do → nếu >3h trước giờ bắt đầu = huỷ
  luôn (CancelledByWorker); nếu ≤3h = tạo **Yêu cầu huỷ** (chờ employer duyệt).
- **Employer duyệt/ từ chối yêu cầu huỷ** → worker focus lại thấy cập nhật.
- **Employer huỷ ca:** chi tiết ca → Huỷ ca + lý do (chặn nếu trong 6h & còn ứng viên active,
  hoặc đã qua giờ bắt đầu) → đơn của ca chuyển terminal; ca gỡ khỏi listing công khai.

### A3. Nếu phát hiện lỗi CHẶN luồng → báo ngay (chỉ sửa lỗi chặn, không thêm chức năng)
Ghi rõ: bước nào, thông báo lỗi, và data mode. RPC layer đã test 78/78 (`npm run test:rls:phase2`)
nên lỗi thường nằm ở wiring UI/refetch.

---

## PHẦN B — Checklist deploy Vercel (code freeze 20/9)

### B1. Code (đã kiểm — ✅)
- `npm run build` (production, supabase env) → **0 lỗi, 28 routes**. `getDataMode()` LAZY nên
  build không throw.
- **Không secret phía client:** chỉ 3 biến `NEXT_PUBLIC_*` (DATA_MODE, SUPABASE_URL,
  SUPABASE_ANON_KEY). `service_role` chỉ ở `scripts/*.mjs` (Node test, đọc `.env.test.local`).
- `.env*` gitignored; chỉ `.env.example` (rỗng giá trị) được commit.
- ☐ (khuyến nghị) Nâng bản vá `next@16.2.6` → patch 16.x mới nhất trước khi public (rà `npm audit`).

### B2. Biến môi trường Vercel (Project → Settings → Environment Variables, scope **Production**)
- `NEXT_PUBLIC_DATA_MODE=supabase`
- `NEXT_PUBLIC_SUPABASE_URL=<URL cale-prod>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key cale-prod>`
- **TUYỆT ĐỐI KHÔNG** đặt `service_role` / database password trên Vercel.
- (Preview/Development env có thể trỏ `cale-dev` để test staging.)

### B3. Supabase `cale-prod` (⚠ hiện MỚI chỉ có migration ở cale-dev)
- ☐ **Push migration Phase 1+2 lên `cale-prod`**: `supabase link --project-ref <cale-prod>` →
  `supabase db push` (4 migration: `20260915000001..0004`). Bắt buộc trước khi deploy — nếu
  không app prod sẽ không có bảng.
- ☐ Auth → **URL Configuration**: `Site URL` = `https://<domain-prod>`; thêm domain vào
  **Redirect URLs** (để link xác nhận email trỏ đúng về prod).
- ☐ Auth → Email confirmation: **BẬT** ở prod (khuyến nghị). RLS đã bật sẵn qua migration.
- ☐ Seed: **cale-prod để RỖNG** (không seed demo). Employer thật đăng ca thật.
- ☐ Tạo tài khoản **admin** thủ công (dashboard) + set `app_metadata.role=admin` (không qua signup).

### B4. Domain / HTTPS
- ☐ Vercel → Domains: thêm custom domain; trỏ DNS theo hướng dẫn Vercel (A/CNAME).
- ☐ HTTPS: Vercel tự cấp SSL (Let's Encrypt) — chỉ cần domain verified. Ép HTTPS mặc định.
- ☐ Sau khi có domain: cập nhật lại `Site URL`/`Redirect URLs` ở Supabase (B3) cho khớp domain.

### B5. Analytics (tuỳ chọn, ngoài phạm vi Core Pilot)
- ☐ (nếu cần) Bật **Vercel Analytics / Speed Insights** trong Project Settings — không cần code.
- Không thêm analytics bên thứ ba trong giai đoạn freeze.

### B3b. Tài khoản admin (bootstrap qua CLI — KHÔNG sửa DB tay)
Tạo/đảm bảo MỘT admin cố định để quản trị qua Admin Dashboard. Chạy **local** (Node,
service_role chỉ ở máy bạn — không commit, không gửi chat):
```bash
npm run admin:bootstrap
```
- Script hỏi **email** + **mật khẩu admin** (mật khẩu nhập ẩn), hoặc đọc từ biến local
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` (không commit). Đọc `SUPABASE_SERVICE_ROLE_KEY` từ
  `.env.local` / `.env.test.local` (đã gitignore).
- **Idempotent:** chưa có → tạo + confirm email + set quyền; đã có → không tạo trùng,
  chỉ đảm bảo `public.users.role='admin'` **và** trusted `app_metadata.role='admin'`.
- Tài khoản **persistent** — không nằm trong cleanup của integration test.
- Đăng nhập bằng email/mật khẩu đó → `/admin/dashboard`. Signup công khai KHÔNG chọn được
  admin (trigger chặn role admin; form đăng ký chỉ worker/employer).
- **Prod:** chạy với `.env.local` trỏ **`cale-prod`** để tạo admin trên prod (sau khi
  `db push` migration lên cale-prod ở B3).

### B3c. Edge Function `admin-users` (quản lý tài khoản trong Admin Dashboard)

Admin Dashboard (chế độ supabase) có thể **tạo / khoá / mở khoá / xoá vĩnh viễn** tài
khoản Worker/Employer. Mọi thao tác đặc quyền chạy trong Edge Function `admin-users`
(Deno) — **service_role chỉ ở server, không bao giờ ra trình duyệt/Vercel**.

**Deploy (bước tương tác, chạy local với Supabase CLI đã login + link project):**
```bash
supabase functions deploy admin-users
```
- Không cần set secret thủ công: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` được
  Supabase **tự inject** vào runtime của Edge Function.
- Deploy riêng cho từng project: chạy khi đang link `cale-dev` (để test), rồi link
  `cale-prod` và deploy lại trước khi mở prod.
- Hàm tự xác thực JWT người gọi và **chỉ chấp nhận** khi trusted
  `app_metadata.role==='admin'`; anon/non-admin → 401/403.

**Kiểm thử hành vi (sau deploy, chạy local, cần `.env.test.local` có service_role):**
```bash
npm run test:admin
```
- Bao phủ: anon/non-admin bị chặn tạo/xoá; admin tạo Worker/Employer thật; email trùng →
  `EMAIL_EXISTS`; không tạo được role admin từ API; xoá tài khoản sạch (biến mất khỏi Auth
  + DB); tài khoản có ca/đơn → `USER_HAS_HISTORY`; admin không tự xoá; không xoá admin khác;
  khoá/mở khoá. Test tự dọn user tạm (không đụng admin bootstrap cố định).

**Dùng trong Admin Dashboard → tab "Người dùng" (chế độ supabase):**
- **Tạo tài khoản:** chọn vai trò (Worker/Employer — KHÔNG có admin), nhập email + tên
  hiển thị + mật khẩu tạm (≥8 ký tự). Danh sách tự tải lại sau khi tạo.
- **Khoá / Mở khoá:** giữ nguyên tài khoản + lịch sử, chỉ chặn hoạt động mới.
- **Xoá vĩnh viễn:** chỉ tài khoản **chưa có ca/đơn**. Modal cảnh báo yêu cầu **gõ lại
  đúng email** để xác nhận (không hoàn tác). Tài khoản có lịch sử → hệ thống báo dùng
  "Khoá tài khoản" thay vì xoá (tránh cascade xoá lây dữ liệu bên khác).

### B6. Kiểm thử sau deploy (smoke prod)
- ☐ Mở domain prod → landing render, không lỗi console.
- ☐ Đăng ký/đăng nhập thật (email confirm về đúng domain).
- ☐ Chạy lại luồng A1 trên prod với 2 tài khoản thật.
- ☐ Kiểm không có biến `service_role`/secret nào lộ ra client (DevTools → Network/Source).

---

## Trạng thái hiện tại (tham chiếu)
- `main@ae93ad8`: Phase 1 (auth/profile) + Phase 2 backend (migration cale-dev, RLS 78/78) +
  Slice 4 A–G (publish/apply/approve/reject/cancel/withdraw/cancellation + refetch-on-focus,
  gate verification nới ở supabase mode).
- Local grid: tsc 0, build 28, lint 0, unit 680/683 (3 known handbook), E2E local 112/112.
- Còn lại: `editAsync` (W6), E2E Supabase 2-browser tự động (H), và click-through 2 máy trên
  cửa sổ hiện (phần A này). Xem `HANDOFF.md §00`.
