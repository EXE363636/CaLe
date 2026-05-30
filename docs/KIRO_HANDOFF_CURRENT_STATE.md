# Bàn giao trạng thái hiện tại — CaLẻ / Now

**Ngày cập nhật:** 31/05/2026
**Mục đích tài liệu:** Giúp một tài khoản Kiro mới hiểu ngay tình trạng
dự án và tiếp tục công việc một cách an toàn, KHÔNG làm lại từ đầu.

> Tài liệu này CHỈ mô tả trạng thái. Không thay đổi logic sản phẩm.

---

## 1. Tổng quan dự án

- **Tên sản phẩm:** CaLẻ / Now
- **Mục đích:** Sàn việc làm theo ca ngắn hạn (shift-based job
  marketplace) cho thị trường Việt Nam — kết nối nhà tuyển dụng cần
  người làm tạm thời với người lao động linh hoạt.
- **Vai trò người dùng:**
  - **Worker (Người làm):** tìm ca, ứng tuyển, check-in/check-out, nhận
    lương qua ví, xem điểm uy tín + kỹ năng.
  - **Employer (Nhà tuyển dụng):** đăng ca, đặt cọc (mô phỏng), duyệt
    ứng viên, xác nhận có mặt/vắng mặt, xác nhận hoàn thành, khiếu nại.
  - **Admin (Quản trị viên):** xác minh giấy tờ, xử lý tranh chấp,
    override trạng thái, điều chỉnh điểm uy tín.
- **Trạng thái hiện tại:** **Demo frontend** với dữ liệu lưu trên
  **localStorage (mock)**. Tất cả luồng nghiệp vụ chạy hoàn toàn ở
  trình duyệt.
- **Backend:** **CHƯA được triển khai.** Không có API route, không có
  database, không có auth server thật.
- **Supabase:** **CHƯA tạo project.** Mới chỉ ở mức **kế hoạch** (xem
  `docs/BACKEND_MIGRATION_PLAN.md` + `qa-exploration/backend-migration-plan.md`).
  Nếu sau này tạo project Supabase, hãy đọc `docs/SUPABASE_SECURITY_NOTE.md`
  trước khi cấu hình.

---

## 2. Stack kỹ thuật hiện tại

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI | **React 19** + **TypeScript 5** + **Tailwind v4** (không có file config, không dùng `dark:`) |
| State | **Zustand 5** (mỗi domain một store) |
| Persistence | **localStorage** (mock, qua `src/data/persistence.ts`) |
| Test đơn vị | **Vitest 4** (+ `fast-check` cho property-based) |
| Test E2E | **Playwright** (chromium) |
| Backend (kế hoạch) | **Supabase / Postgres** — chưa bắt đầu |

Không có dependency backend nào trong `package.json` (chỉ `next`,
`react`, `react-dom`, `zustand`).

### Lệnh quan trọng
- `npm run test:run` — chạy toàn bộ unit test (hiện 544 test)
- `npm run build` — build production (hiện đúng **28 route**, là bất biến)
- `npm run test:e2e` — chạy Playwright (hiện 112 test, cần dev server ở port 3000)
- `npm run test:time` — chạy bộ time-travel lifecycle (hiện 22 test)

### Lưu ý môi trường
- Terminal Windows hiển thị tiếng Việt bị **mojibake** — ghi báo cáo ra
  file UTF-8, pipe log E2E ra file (`Out-File -Encoding utf8` /
  `Tee-Object`).
- Dev server khởi động bằng `npm run dev`, dùng cổng 3000 cho Playwright.
  Nhớ dừng server khi xong.

---

## 3. Quy tắc quan trọng (BẮT BUỘC tuân thủ)

- **KHÔNG chạy lại các orchestrator/spec task cũ từ đầu.** Tiếp tục từ
  code sản phẩm và báo cáo hiện tại.
- **KHÔNG viết lại app từ đầu.** Code hiện tại đã ổn định và có test.
- **KHÔNG thêm tính năng mới** trước khi backend/core ổn định.
- **KHÔNG thêm chat / staff-supply (agency mode)** trước khi backend +
  core ổn định (đã quyết định hoãn — xem
  `qa-exploration/chat-readiness-decision.md`,
  `qa-exploration/staff-supply-proposal.md`).
- **KHÔNG để lộ secret / service_role key của Supabase** ra frontend,
  log, hay chat công khai. Chỉ dùng biến môi trường
  (xem `docs/SUPABASE_SECURITY_NOTE.md`).
- **KHÔNG auto-commit** trừ khi được yêu cầu rõ ràng.
- Kiến trúc **mock-only**: tiền tệ dùng chữ thường `đ` hoặc `đồng`;
  cấm `VNĐ` và `₫`.
- **Không dùng `setTimeout`/`setInterval`/polling** cho lifecycle; chỉ
  dùng `useLifecycleSync` + `AppHydrator` → `runLifecycleSync`.

---

## 4. Các giai đoạn ổn định đã hoàn thành

### CORE-STABILITY-7 (xong)
- **Sửa gì:** deeplink thông báo + resolver tập trung
  (`src/lib/notificationTarget.ts`); thông báo nạp/rút ví deeplink tới
  `?modal=wallet`; modal nháp khi đặt cọc thiếu tiền; helper chữ cái
  viết tắt avatar (`src/lib/initials.ts`); validate trường số
  (`src/lib/validate.ts`); đảo vắng mặt → có mặt
  (`revertNoShowToPresent`); sắp xếp + báo cáo đánh giá
  (`src/stores/reviewReportStore.ts`).
- **File chính:** `applicationStore.ts`, `notificationTarget.ts`,
  `reviewReportStore.ts`, `EmployerFeedbackList`, `i18n/vi.ts`.
- **Test:** `src/__tests__/coreStability7.test.ts`,
  `e2e/21-core-stability-7.spec.ts`. Báo cáo:
  `qa-exploration/core-stability-7-report.md`.
- **Rủi ro còn lại:** không có; là pass ổn định.

### CORE-STABILITY-8 (xong)
- **Sửa gì:** kiến trúc Draft (`ShiftDraft` + `src/stores/shiftDraftStore.ts`,
  Draft KHÔNG phải ca thật, bị loại khỏi mọi bề mặt ca thật); bắt buộc
  người phụ trách tại chỗ khi đăng (`CONTACT_PERSON_REQUIRED` /
  `CONTACT_PHONE_REQUIRED`); tính toàn vẹn lifecycle (cửa sổ tuyển đóng
  tại giờ bắt đầu); điểm danh hai phía (mark-present KHÔNG set
  `checkInAt` của worker); chính sách hoàn cọc (hoàn đủ khi hết hạn rỗng,
  `understaffedPolicy`, `RequireFull` auto-cancel).
- **File chính:** `shiftDraftStore.ts`, `shiftStore.ts`,
  `applicationStore.ts`, `shiftLifecycle.ts`, `timeGates.ts`,
  `ShiftForm.tsx`, `persistence.ts` (SCHEMA_VERSION = 11).
- **Test:** `src/__tests__/coreStability8.test.ts`,
  `e2e/22-core-stability-8.spec.ts`. Báo cáo:
  `qa-exploration/core-stability-8-report.md`.
- **Rủi ro còn lại:** không (đã được củng cố thêm ở CS10).

### CORE-STABILITY-9 (xong)
- **Sửa gì:** copy điểm danh theo vai trò
  (`src/domain/attendanceState.ts` + key `attendance.copy.{worker|employer|admin}.*`);
  khóa thời điểm check-out (mở SAU khi ca kết thúc); máy trạng thái điểm
  danh; tiến trình kỹ năng XP/level
  (`src/domain/skillProgression.ts` + `SkillProgressBar.tsx`); lịch rảnh
  + gợi ý ca theo lịch (`src/domain/availabilityMatch.ts`,
  `ScheduleBlock.kind`); ghi chú backend trung thực ở footer.
- **File chính:** `attendanceState.ts`, `skillProgression.ts`,
  `availabilityMatch.ts`, `timeGates.ts` (`canCheckOut` đổi sang
  `now >= end`), `scheduleStore.ts`, `Footer.tsx`.
- **Test:** `src/__tests__/coreStability9.test.ts`,
  `e2e/23-core-stability-9.spec.ts`. Báo cáo:
  `qa-exploration/core-stability-9-report.md`.
- **Rủi ro còn lại:** không.

### PRODUCT-UX-FIX-BACKEND-PREP-1 (xong)
- **Sửa gì:** đổi tên nút lịch "Thêm lịch bận" → **"Thêm lịch trình"**
  (modal có cả "Lịch rảnh" và "Lịch bận" + copy hướng dẫn); hiển thị
  phần kỹ năng cho worker mới (luôn hiện thẻ kỹ năng mặc định nghề phổ
  thông ở Cấp 1 / 0 XP, không có kỹ năng lập trình); xác nhận trạng thái
  backend trung thực; chuẩn bị plan BACKEND-MIGRATION-1
  (`docs/BACKEND_MIGRATION_PLAN.md`).
- **File chính:** `i18n/vi.ts`, `worker/schedule/page.tsx`,
  `worker/profile/page.tsx`, `worker/dashboard/page.tsx`,
  `SkillProgressBar.tsx`, `skillProgression.ts` (`buildSkillDisplayList`,
  `DEFAULT_SKILL_CATEGORIES`).
- **Test:** bổ sung trong `coreStability9.test.ts`,
  `e2e/24-product-ux-fix.spec.ts`.
- **Rủi ro còn lại:** không.

### CORE-STABILITY-10 (xong — quan trọng nhất, mới nhất)
- **Sửa gì:** **một nguồn sự thật duy nhất cho lifecycle ca làm.** Trước
  đây có HAI hệ thống trạng thái cạnh tranh (`Shift.status` thô qua
  `ShiftStatusBadge` — InProgress màu tím; và `getShiftDisplayPhase` qua
  `ShiftPhaseChip` — nhãn khác, màu xanh lá), khiến cùng một ca hiện
  trạng thái khác nhau trên các trang. Đã tạo
  `src/domain/shiftLifecycleState.ts` (`getShiftLifecycleState` +
  `getShiftStatusBadge`) và component duy nhất
  `src/components/shift/ShiftLifecycleBadge.tsx` dùng ở MỌI bề mặt.
  Lifecycle chỉ phụ thuộc đồng hồ; check-in/mark-present KHÔNG đẩy ca
  sang InProgress sớm. Badge "Đang diễn ra" luôn là màu `info` (xanh
  dương) ở mọi nơi.
- **File chính:** `src/domain/shiftLifecycleState.ts` (mới),
  `src/components/shift/ShiftLifecycleBadge.tsx` (mới), `ShiftCard.tsx`,
  `shifts/page.tsx`, `shifts/[id]/page.tsx`, `worker/dashboard/page.tsx`,
  `employer/dashboard/page.tsx`, `employer/shifts/[id]/page.tsx`,
  `employer/schedule/page.tsx`, `admin/dashboard/page.tsx`, `i18n/vi.ts`.
- **Test:** `src/__tests__/coreStability10.test.ts` (32),
  `e2e/25-core-stability-10.spec.ts` (3). Báo cáo:
  `qa-exploration/core-stability-10-report.md`,
  `core-stability-10-security.md`.
- **Rủi ro còn lại:** không có rủi ro Critical/High. Cần **QA thủ công**
  để xác nhận trên giao diện thật (xem `docs/CURRENT_TODO.md`).

---

## 5. Baseline kiểm thử hiện tại (kết quả mới nhất)

| Kiểm thử | Kết quả |
|---|---|
| `npm run test:run` (unit) | **544 passed / 544** |
| `npm run build` | **clean, đúng 28 route** |
| `npm run test:e2e` (chromium) | **112 passed / 112** |
| `npm run test:time` | **22 passed / 22** |
| `npm audit` | **2 moderate** (postcss qua next) — chỉ ở build-time, không có dependency mới; hoãn (sửa sẽ phải hạ cấp Next.js — breaking) |

---

## 6. Quy tắc nghiệp vụ quan trọng (PHẢI giữ)

1. **Draft KHÔNG phải ca thật** — lưu ở `shiftDraftStore`, không vào
   listing công khai, không vào lifecycle, không có nút hủy/hoàn cọc.
2. **Check-in KHÔNG làm ca bắt đầu** — lifecycle dựa vào thời gian.
3. **Employer mark-present KHÔNG làm ca bắt đầu** — chỉ set
   `markedPresentAt`, không set `checkInAt` của worker.
4. **Check-out chỉ hiện SAU khi ca kết thúc** (`now >= end`, trong cửa
   sổ 60 phút) và chỉ khi worker đã tự check-in.
5. **Lifecycle ca làm dựa theo thời gian và tập trung** — dùng
   `getShiftLifecycleState(shift, applications, nowIso)` ở mọi nơi.
6. **Ví / escrow KHÔNG được ở client trong production** — phải chuyển
   sang server (đây là lý do chính của backend migration).
7. **Thông báo phải deeplink đúng ngữ cảnh** (qua
   `resolveNotificationTarget`).
8. **Cùng trạng thái = cùng badge + cùng màu ở mọi nơi** (qua
   `getShiftStatusBadge`).
9. **Copy theo vai trò:** worker dùng "bạn"; employer dùng "người làm" /
   "bạn đã xác nhận"; admin dùng từ trung lập. Không trang employer nào
   được hiện "Nhà tuyển dụng đã xác nhận bạn…".

---

## 7. Blocker hiện tại / công việc khuyến nghị tiếp theo

1. **QA thủ công sau CORE-STABILITY-10** (xem `docs/CURRENT_TODO.md`
   phần 1) — xác nhận tính nhất quán lifecycle, copy theo vai trò, màu
   badge trên giao diện thật.
2. **Sau đó: BACKEND-MIGRATION-1 với Supabase** (chỉ bắt đầu sau khi
   QA thủ công xong VÀ được chấp thuận rõ ràng).
   - **KHÔNG migrate ví/escrow trước.** Bắt đầu từ bảng an toàn.
   - Thứ tự migration khuyến nghị:
     - a. `users` / profiles (worker_profiles, employer_profiles)
     - b. `shifts` / `shift_drafts`
     - c. `applications`
     - d. `attendance_events`
     - e. `notifications`
     - f. `wallet` / ledger / escrow (sau khi các bảng an toàn ổn)
     - g. `disputes` / `reviews`
     - h. `schedule_blocks`
     - i. `worker_skill_scores`

Chi tiết kỹ thuật từng bảng: `qa-exploration/backend-migration-plan.md`.
Bản tóm tắt cho chủ dự án (không kỹ thuật): `docs/BACKEND_MIGRATION_PLAN.md`.
