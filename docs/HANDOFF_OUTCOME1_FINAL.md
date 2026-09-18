# BÀN GIAO — Outcome 1 (còn ~10%, 2026-09-18)

> Đọc cùng `CLAUDE.md` + `HANDOFF.md`. Branch: **`fix/p0-attendance-persistence`** (PR #2, **CHƯA merge**).
> Merge `main` = auto-deploy `cale.io.vn` → chỉ merge khi xong + review.

## 0. Trạng thái & cách chạy
- Supabase prod ref: `enurvffmliyrivehppaq`. `.env.local` (3 biến `NEXT_PUBLIC_*`, mode `supabase`);
  `.env.test.local` (`SUPABASE_SERVICE_ROLE_KEY`). **KHÔNG in/commit key.**
- Migrations đã apply remote tới `20260917000006`.
- Lệnh: `npx tsc --noEmit`, `npx eslint --quiet`, `npm run test:run`, `npm run build`,
  `npm run test:e2e`, `npm run test:attendance` (integration 2 session, tự dọn data),
  `npm run test:admin`.
- Đã chạy live OK: đăng ký/đăng nhập, đăng ca, ứng tuyển, duyệt/từ chối, đồng bộ 2 máy,
  admin CRUD tài khoản, check-in / mark-present / check-out **lưu DB**. Vercel/HTTPS/mobile OK.

## 1. 🔴 BUG CHẶN A — Employer bấm "Xác nhận hoàn thành" không ăn (đã truy gốc rễ, CHƯA sửa)
**Triệu chứng:** Worker check-out lưu OK; employer bấm xác nhận hoàn thành → không đổi trạng
thái, reload về lại `CheckedOut`.

**Gốc rễ** — `src/app/employer/shifts/[id]/page.tsx`:
- `ApplicationActionButtons` với status `CheckedOut` **return null** (~dòng 1386–1392) → cái
  `onConfirm` đã gate capability (~dòng 881) **không bao giờ chạy** cho trạng thái này (gate nhầm chỗ ở PR trước).
- Nút thật là **`EmployerConfirmationPanel`** (~dòng 933–941): `onConfirm={() => setRatingForAppId(app.id)}`
  → mở `RatingForm` → `onSubmit` gọi **`confirmCompletion(app.id, rating)` (SYNC local)** (~dòng 1064).
  Ở supabase mode hàm sync chỉ đổi RAM + `write()` no-op → **không gọi RPC `employer_confirm_completion`**
  → refetch/reload mất.

**Hướng sửa (chưa làm):** cho `EmployerConfirmationPanel.onConfirm` (và block RatingForm ~1060) đi
theo capability giống ApplicationActionButtons:
`onConfirm={() => hasCapability('ratings') ? setRatingForAppId(app.id) : handleConfirmComplete(app.id)}`,
và **không** mở RatingForm khi `!hasCapability('ratings')`. `handleConfirmComplete` (~dòng 240) →
`confirmCompletionAsync` → RPC `employer_confirm_completion` (đã có, đã test xanh: integration 37/37
gồm employer confirm). **Không cần migration mới.**

## 2. 🔴 BUG CHẶN B — Ca quá giờ vẫn `Published` trong DB (badge lệch nhóm)
**Triệu chứng:** ca đã qua giờ nhưng DB còn `Published` → dashboard xếp "Ca sắp tới", badge (đồng hồ)
ghi "Đã hết hạn".

**Gốc rễ:** supabase mode **không có quét vòng đời**. `runLifecycleSync` (client) chỉ chạy local +
ghi localStorage (no-op ở supabase). `shift.status` chỉ đổi qua RPC (publish / cancel_shift /
check-out→`AwaitingConfirmation` / confirm→`Completed`). **Không có đường** `Published/FullyBooked`
→ `Expired` (quá `start`, không ai giữ chỗ) hay roll sau khi hết giờ nếu không ai check-out.
Dashboard **nhóm theo `shift.status` thô** còn badge dùng `getShiftLifecycleState(shift, apps, now)`
(đồng hồ) → lệch. Xem worker dashboard filter `upcoming` (`sh.date >= todayStr`), `ShiftLifecycleBadge`.

**Hai hướng sửa (chọn 1, chưa làm):**
- **A. Server (đúng lâu dài):** migration corrective MỚI `20260917000007_…` thêm RPC idempotent
  (thời gian server) quét `Published/FullyBooked` quá hạn → `Expired` (không slot-holder) hoặc
  `AwaitingConfirmation` (hết giờ, có người checked-in); gọi khi read (trong `get_shift_detail`/refetch)
  hoặc scheduled job. Tôn trọng luật: check-in/mark-present **không** đẩy ca "Đang diễn ra" sớm; không nới time gate.
- **B. Client hiển thị (nhỏ, an toàn, không migration):** cho phần **nhóm** ở dashboard dùng chính
  `getShiftLifecycleState(...)` như badge, để ca quá giờ rơi đúng nhóm dù DB status trễ.

> Khuyến nghị đóng Outcome 1: làm **B** trước (đủ hết lệch UI); cân nhắc A ở phase sau.

## 3. Việc còn lại để chốt Outcome 1
1. Sửa Bug A (employer confirm) + Bug B (vòng đời ca).
2. Nghiệm thu live 2 tài khoản trên production sau khi sửa: đăng ca → ứng tuyển → duyệt → check-in →
   xác nhận có mặt → check-out → **employer xác nhận hoàn thành** → reload cả hai bên vẫn giữ trạng thái.
3. Smoke test: worker **rút đơn**, employer **huỷ ca**, reload cả hai bên.
4. Rà cuối: không còn CTA giả / text demo/MVP/"mô phỏng" trên production (kiểm trang chi tiết ca,
   dashboard, form đăng ca).

## 4. Ngoài phạm vi Outcome 1 (phase sau — hiện đang ẩn ở production)
OTP/xác minh SĐT · thông báo thật · thanh toán/ví · tranh chấp · đánh giá/điểm uy tín ·
no-show/chuyển vắng mặt · upload ảnh thật/GPS/boost. (Đã ẩn qua `src/data/capabilities.ts` + gate;
no-show/revert ẩn bằng `!isSupabaseEnv()`.)

## 5. Ràng buộc khi sửa
- Migration đã apply (0001–0006) **KHÔNG sửa**; cần đổi SQL → migration corrective mới. RPC dùng
  `CREATE OR REPLACE`, `search_path=''`, tên đầy đủ, revoke public/anon + grant authenticated, thời gian server.
- Không commit `.env*`/key/JWT/service_role. Chạy đủ grid + `npm run test:attendance` sau khi apply
  migration lên đúng ref `enurvffmliyrivehppaq`.
- Không push thẳng `main`; đẩy vào branch/PR #2, review rồi merge.

## 6. Con trỏ nhanh
- Attendance RPC: `supabase/migrations/20260917000006_p0_attendance_review_fixes.sql`, `…0005…`.
- Store: `src/stores/applicationStore.ts` (`confirmCompletionAsync`, `checkOutAsync`, `checkInAsync`, `markPresentAsync`).
- Employer confirm UI: `src/app/employer/shifts/[id]/page.tsx` (`EmployerConfirmationPanel` ~933,
  `handleConfirmComplete` ~240, RatingForm ~1060).
- Vòng đời/badge: `src/domain/shiftLifecycleState.ts`, `src/domain/timeGates.ts` (check-in window `+15`).
- Capability gate: `src/data/capabilities.ts`.
