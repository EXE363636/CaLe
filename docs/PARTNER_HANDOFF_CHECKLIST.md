# Checklist bàn giao cho Partner — CaLẻ / Now

> Dành cho dev/partner tiếp nhận dự án. Tick từng mục theo thứ tự. Mục tiêu:
> chạy được app, hiểu kiến trúc, nắm ràng buộc, và sẵn sàng bắt đầu backend.
> **Cập nhật:** 2026-09-15.

## Bối cảnh 30 giây
**CaLẻ / Now** — sàn việc làm **theo ca ngắn hạn** (thị trường VN). Hiện là
**demo frontend hoàn chỉnh** chạy hoàn toàn ở trình duyệt, dữ liệu ở
`localStorage`. **Chưa có backend** — ví/cọc/escrow/check-in đều là **mô phỏng**.
Bước lớn tiếp theo: **migrate sang Supabase**. Lưới an toàn (test) đã xanh.

---

## A. Môi trường & chạy thử
- [ ] Cài Node (khớp `engines`/`.nvmrc` nếu có) và chạy `npm install`.
- [ ] `npm run dev` → mở http://localhost:3000, thấy landing page.
- [ ] Đăng nhập thử bằng tài khoản demo (xem §Tài khoản demo bên dưới).
- [ ] Đi thử 1 vòng: worker tìm ca / employer đăng ca (mô phỏng đặt cọc).

## B. Xác minh trạng thái (chạy đúng như số dưới là "sạch")
- [ ] `npm run build` → **đúng 28 route**, không lỗi.
- [ ] `npx tsc --noEmit` → sạch.
- [ ] `npm run test:run` → **672/675 pass** (3 fail còn lại là test đỏ **cố ý**
      cho spec handbook chưa làm — KHÔNG phải regression, xem §Việc đang mở).
- [ ] `npm run test:e2e` → **112/0 pass** (Playwright tự khởi động dev server;
      lần đầu chạy `npx playwright install chromium`).
- [ ] `npm run lint` → 0 error (còn warning cũ, không chặn).

## C. Hiểu kiến trúc & đọc tài liệu (theo thứ tự)
- [ ] `CLAUDE.md` — sản phẩm, stack, cấu trúc, **nguyên tắc bất biến**. Đọc đầu tiên.
- [ ] `HANDOFF.md` — trạng thái hiện tại, việc đã/đang làm, kế hoạch backend.
- [ ] `PRODUCT.md` + `DESIGN.md` — người dùng, brand, design system.
- [ ] Nắm 3 lớp dữ liệu:
      **`src/types/index.ts`** (nguồn sự thật mô hình) →
      **`src/domain/`** (logic THUẦN, không React — server tái dùng nguyên vẹn) →
      **`src/stores/`** (Zustand, lớp DUY NHẤT truy cập dữ liệu — chỗ sẽ thay bằng
      Supabase, **interface store giữ nguyên**).
- [ ] Hiểu **lifecycle một nguồn sự thật**: `src/domain/shiftLifecycleState.ts`
      + component `ShiftLifecycleBadge` (dùng ở mọi bề mặt).

## D. Ràng buộc BẤT BIẾN (không được phá — chi tiết ở CLAUDE.md §5)
- [ ] **Không viết lại app từ đầu**; **không thêm tính năng mới** (chat, agency,
      AI matching) trước khi backend/core ổn.
- [ ] Lifecycle **chỉ theo đồng hồ**; **không polling/setTimeout/setInterval** —
      chỉ đồng bộ khi mount qua `useLifecycleSync` + `AppHydrator`; mọi sub-step
      **idempotent**.
- [ ] **Check-in / mark-present KHÔNG** đẩy ca sang "Đang diễn ra" sớm; check-out
      chỉ hiện SAU khi ca kết thúc.
- [ ] Cùng một ca = **cùng nhãn + cùng màu badge** ở mọi trang. "Đang diễn ra"
      luôn tông `info` (xanh dương).
- [ ] **Trung thực mô phỏng** trong UI: cọc/ví/escrow gọi là "mô phỏng"; không
      gợi ý "guaranteed payout"/giao dịch thật.
- [ ] **Tiền tệ:** chữ thường `đ` / `đồng`. **Cấm `VNĐ` và `₫`.**
- [ ] **Copy theo vai trò:** worker xưng "bạn"; nói về worker dùng **"người lao
      động"** (thuật ngữ chuẩn toàn app); admin trung lập.
- [ ] Đổi shape persistence → **bump `SCHEMA_VERSION`** trong
      `src/data/persistence.ts` (hiện **19**). Nếu đụng E2E, đồng bộ luôn
      `e2e/fixtures/constants.ts` (phải khớp 19).
- [ ] **Palette:** `src/app/globals.css` là nguồn chuẩn DUY NHẤT.

## E. Trước khi bắt đầu backend (BACKEND-MIGRATION-1)
- [ ] Đọc `docs/BACKEND_MIGRATION_PLAN.md` (kế hoạch, per-phase, estimate ~3–5 tuần MVP).
- [ ] Đọc `docs/SUPABASE_SECURITY_NOTE.md` **TRƯỚC** khi cấu hình Supabase.
- [ ] Nắm **thứ tự bảng an toàn** (tiền làm SAU CÙNG):
      users/profiles → shifts/drafts → applications → attendance_events →
      notifications → **wallet/ledger/escrow (CUỐI CÙNG, rủi ro nhất)** →
      disputes/reviews → schedule_blocks → worker_skill_scores.
- [ ] Nắm 4 rủi ro chính (HANDOFF §7): (1) tiền phải quyết định + ghi ở **server**,
      mọi job **idempotent**, tuyệt đối không double-pay/refund; (2) phân quyền
      bằng **RLS server**, không dựa frontend (user sửa được localStorage);
      (3) lifecycle + auto-release 12h chạy **server schedule**, không phụ thuộc
      trình duyệt mở; (4) **KHÔNG lộ `service_role` key**.
- [ ] Mỗi phase ship **sau interface store hiện tại** để UI tiếp tục chạy.
- [ ] Có **chấp thuận rõ ràng của chủ dự án** trước khi bắt đầu.

---

## Việc đang mở / đã biết
- **Spec handbook (`visual-a11y-polish-round-2`) — HOÃN:** 3 test trong
  `src/__tests__/handbookContent.test.tsx` đỏ **cố ý**, mã hoá hành vi mong muốn:
  đổi nhãn menu "Bắt đầu nhanh" → "Cẩm nang" + thêm nội dung cẩm nang thực hành
  cho worker & employer (`src/app/user-guide/page.tsx`, `src/i18n/vi.ts`).
  Đây là **feature content chưa làm**, không phải bug. Làm khi có định hướng nội dung.
- **Lint:** còn warning cũ (vd `<img>` nên dùng `next/image`) — dọn dần, không chặn.
- **Kết quả QA thủ công gần nhất:** `docs/QA_MANUAL_RESULTS_2026-09-15.md`
  (không lỗi Critical/High).

## Tài khoản demo & cách đăng nhập
- Mật khẩu **mọi tài khoản seed**: `demo`.
- Worker: `an.nguyen@gmail.com` · Employer: `lien@quanphoha.vn` · Admin: `admin@cale.vn`.
- Seed users đầy đủ: `src/data/seed/users.json`.
- **Lưu ý thời gian:** seed neo quanh **giữa 2026**; nếu đồng hồ máy đã qua các mốc
  đó, ca seed sẽ tự chuyển Hết hạn/Hoàn thành khi boot. Để test cửa sổ thời gian
  (check-in/out, đang diễn ra), **tạo ca mới quanh giờ hiện tại**.

## Nguồn sự thật / tài liệu tham chiếu
| File | Nội dung |
|---|---|
| `CLAUDE.md` | Nguyên tắc bắt buộc, cấu trúc, stack |
| `HANDOFF.md` | Trạng thái + kế hoạch + rủi ro (đọc để biết làm gì) |
| `PRODUCT.md` / `DESIGN.md` | Sản phẩm / design system |
| `docs/BACKEND_MIGRATION_PLAN.md` | Kế hoạch backend |
| `docs/SUPABASE_SECURITY_NOTE.md` | Bảo mật Supabase (đọc trước khi cấu hình) |
| `docs/CURRENT_TODO.md` | Checklist QA + thứ tự migration |
| `docs/QA_MANUAL_RESULTS_2026-09-15.md` | Kết quả QA thủ công gần nhất |
| `docs/KIRO_HANDOFF_CURRENT_STATE.md` | Lịch sử các phase CORE-STABILITY |

## Lưu ý bàn giao khác
- Git commit thẳng lên `main` theo convention repo (lịch sử tuyến tính, chưa có
  workflow branch/PR). Commit gần nhất gói toàn bộ đợt ổn định test + chuẩn hoá copy.
- `.claude/launch.json` đã có sẵn để khởi động dev server nhanh cho QA.
- CLAUDE.md §7 có nhắc `qa-exploration/backend-migration-plan.md` nhưng **file này
  hiện không tồn tại** — dùng `docs/BACKEND_MIGRATION_PLAN.md` thay thế.
