# CLAUDE.md — CaLẻ / Now

> Hướng dẫn cho AI agent làm việc trên repo này. Đọc file này + `HANDOFF.md`
> trước khi động vào code. Không cần scan lại toàn bộ repository.

---

## 1. Sản phẩm là gì

**CaLẻ / Now** — sàn việc làm **theo ca ngắn hạn** cho thị trường Việt Nam.
Đây là **web app phục vụ nghiệp vụ** (không phải trang đăng tin), dẫn người dùng
qua vòng đời: đăng ca → ứng tuyển → duyệt → theo dõi trạng thái → check-in/out →
hoàn thành → đánh giá → đối soát.

**Trạng thái quan trọng:** hiện là **demo/prototype chạy hoàn toàn ở trình
duyệt**, dữ liệu lưu `localStorage`. **CHƯA có backend** (không API route, không
DB, không auth server thật). Ví/escrow/cọc/check-in đều là **mô phỏng** và UI
phải nói đúng như thế.

**Tên hiển thị:** dùng **CaLẻ** ở mọi bề mặt hướng người dùng; chỉ dùng
**CaLẻ / Now** trong tài liệu nội bộ/kỹ thuật.

### Ba vai trò
- **Worker (người lao động):** tìm ca, ứng tuyển, check-in/out, ví, điểm uy tín + kỹ năng. Copy xưng "bạn".
- **Employer (nhà tuyển dụng):** đăng ca, đặt cọc (mô phỏng), duyệt ứng viên, xác nhận có mặt/hoàn thành, khiếu nại. Copy dùng "người lao động".
- **Admin (quản trị viên):** xác minh giấy tờ, xử lý tranh chấp, override trạng thái, điều chỉnh uy tín. Copy trung lập.

---

## 2. Tech stack

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI | **React 19** + **TypeScript 5** + **Tailwind v4** (không config file, không dùng `dark:`) |
| State | **Zustand 5** — mỗi domain một store |
| Persistence | **localStorage** (mock) qua `src/data/persistence.ts` |
| Test đơn vị | **Vitest 4** + `fast-check` (property-based) |
| Test E2E | **Playwright** (chromium, cần dev server ở port 3000) |
| Backend (kế hoạch) | **Supabase / Postgres** — chưa bắt đầu |

Dependencies runtime chỉ có: `next`, `react`, `react-dom`, `zustand`. Không có
dependency backend nào.

---

## 3. Cấu trúc project

```
src/
  app/                    # App Router — 28 route (page.tsx)
    page.tsx              # landing
    login, register
    shifts/, shifts/[id]/
    worker/dashboard, worker/profile, worker/schedule, worker/reputation-guide, worker/cancellation-policy
    employer/dashboard, employer/shifts/new, employer/shifts/[id], employer/payments, employer/profile, employer/reviews, employer/schedule
    admin/dashboard/
    disputes/
    (trang thông tin) about, faq, how-it-works, safety, terms, privacy, support, user-guide, handbook, handbook/[slug]
    layout.tsx           # root layout: AppHydrator + NavBar + Footer + ToastHost
    globals.css          # NGUỒN SỰ THẬT palette (khối :root + @theme)
  domain/                # 33 module logic THUẦN (không React/IO) — server tái dùng được
  stores/                # 15 Zustand store (barrel: stores/index.ts)
  components/            # ui / layout / shift / user / forms / calendar / handbook / landing / wallet / about
  data/
    persistence.ts       # loadAll/persistAll, SCHEMA_VERSION, STORAGE_KEYS, export/import snapshot
    seed/*.json          # dữ liệu seed (users, shifts, applications, ...)
    mock/                # handbookArticles.ts
  lib/                   # helper: format, ids, validate, notificationTarget, useLifecycleSync, ...
  i18n/vi.ts             # toàn bộ chuỗi tiếng Việt (nguồn sự thật copy)
  types/index.ts         # toàn bộ mô hình dữ liệu, chú thích theo từng phase
  __tests__/             # 46 file unit + property (thư mục properties/, generators/)
e2e/                     # 23 spec Playwright + fixtures/
docs/                    # tài liệu handoff, backend plan, security note
.kiro/                   # spec (đã hoàn thành các phase) + skill "impeccable" (design tooling)
```

### Kiến trúc dữ liệu (quan trọng để hiểu)
- **`types/index.ts`** là nguồn sự thật mô hình. Timestamp = ISO 8601 string; date = `YYYY-MM-DD`; time = `HH:mm`; tiền = số nguyên đồng.
- **`domain/`** chứa hàm thuần: lifecycle, escrow, reputation, wage, conflict, evidence, skillProgression, availabilityMatch... Không phụ thuộc React → **server backend tái dùng được nguyên vẹn**.
- **`stores/`** là lớp duy nhất truy cập dữ liệu. Mỗi mutation ghi lại `localStorage` qua `persist(...)`. Đây là chỗ sẽ thay bằng Supabase call — **interface store giữ nguyên**.
- **`AppHydrator`** (client, mount 1 lần ở layout) gọi `loadAll()` rồi seed mọi store, chạy `runLifecycleSync()`, validate auth.

---

## 4. Cách chạy / test

```bash
npm run dev          # dev server (port 3000)
npm run build        # build production — BẤT BIẾN: đúng 28 route
npm run test:run     # unit test (Vitest, chạy 1 lần)
npm run test:time    # bộ time-travel lifecycle
npm run test:e2e     # Playwright (cần dev server ở 3000)
npm run lint         # eslint
npx tsc --noEmit     # type-check
```

### Lưu ý môi trường
- Windows: terminal có thể hiển thị tiếng Việt bị **mojibake** — ghi báo cáo ra file UTF-8, pipe log ra file.
- **Không có git** trong thư mục này (repo chưa init). Không auto-commit trừ khi được yêu cầu.
- **Ngày "hôm nay" trong môi trường là 2026-09-15** — nhiều test dùng mốc thời gian cứng ~giữa 2026; xem `HANDOFF.md` mục lỗi.

---

## 5. Nguyên tắc BẮT BUỘC giữ

### Nghiệp vụ (bất biến)
1. **Một nguồn sự thật cho lifecycle ca làm** — `getShiftLifecycleState(shift, applications, nowIso)` trong `src/domain/shiftLifecycleState.ts`, dùng ở **mọi** bề mặt. Trạng thái **chỉ theo đồng hồ** cho transition start/end.
2. **Check-in / employer mark-present KHÔNG đẩy ca sang "Đang diễn ra" sớm**, cũng không kết thúc ca sớm. Presence là "attendance fact", không phải "lifecycle fact".
3. **Cùng một ca = cùng nhãn + cùng màu badge ở mọi trang** (qua `getShiftStatusBadge` + component `ShiftLifecycleBadge`). "Đang diễn ra" LUÔN là tông `info` (xanh dương).
4. **Check-out chỉ hiện SAU khi ca kết thúc** (`now >= end`, trong cửa sổ 60 phút) và chỉ khi worker đã tự check-in.
5. **Draft KHÔNG phải ca thật** — lưu ở `shiftDraftStore`, không vào listing công khai, không vào lifecycle, không đụng ví, không cần hủy/hoàn cọc.
6. **Không polling / setTimeout / setInterval cho lifecycle** — chỉ đồng bộ khi mount qua `useLifecycleSync` (gọi `applicationStore.runLifecycleSync()`) + `AppHydrator`. Mọi sub-step phải **idempotent** (dựa vào audit marker như `shiftStartedNotifiedAt`, notification `dedupeKey`).
7. **Ví / escrow KHÔNG được ở client trong production** — đây là lý do chính của backend migration.
8. **Thông báo phải deeplink đúng ngữ cảnh** qua `resolveNotificationTarget` (`src/lib/notificationTarget.ts`).
9. **Copy theo vai trò:** worker "bạn"; employer nói về worker là "người lao động" (thuật ngữ chuẩn toàn app, i18n dùng nhất quán); admin trung lập. Không trang employer nào được hiện "Nhà tuyển dụng đã xác nhận bạn…" — tức không xưng hô với employer bằng giọng của worker.

### Trung thực về mô phỏng (bắt buộc phản ánh trong UI)
- Cọc/ví/escrow/hoàn tiền → gọi là **"mô phỏng" / "sổ cái mô phỏng"**.
- Thanh toán → **"theo dõi trạng thái thanh toán"**, không phải cổng thật.
- Check-in/out → **"trạng thái ở mức prototype"**, không phải GPS/QR chống gian lận.
- Không dùng từ/icon gợi ý "guaranteed payout" hay giao dịch tài chính thật.
- **Tiền tệ:** dùng chữ thường `đ` / `đồng`. **Cấm `VNĐ` và `₫`.**

### Kỹ thuật
- **Không viết lại app từ đầu.** Code đã ổn định, có test.
- **Không thêm tính năng mới** (chat, staff-supply/agency, AI matching) trước khi backend/core ổn định — đã quyết định hoãn.
- Khi đổi shape dữ liệu persistence → **bump `SCHEMA_VERSION`** trong `persistence.ts` (hiện là 19) để tự reseed.
- **Palette:** `src/app/globals.css` là nguồn chuẩn DUY NHẤT. `DESIGN.md` + `.impeccable/design.json` cập nhật để KHỚP globals.css, không ngược lại.
- Mục tiêu **WCAG 2.1 AA**, mobile-first, chạm tối thiểu 44×44px, tôn trọng `prefers-reduced-motion`.

---

## 6. Design system (tóm tắt)

- **Bảng màu:** nền kem ấm `#FFF4E9`, một màu thương hiệu duy nhất là cam tín hiệu `#FF9A5F` (dùng ≤10% mỗi màn app, chỉ cho hành động + điểm nhấn). Cam đậm `#ea580c` cho chữ/viền. Bộ màu trạng thái ngữ nghĩa (info/warning/success/danger/neutral/purple) — mỗi cái là cặp nền nhạt + mực đậm.
- **Chữ:** một họ Inter (subset latin + vietnamese), phân cấp bằng weight/cỡ. Thang cỡ cố định trong app (không `clamp()`); chỉ hero landing mới co giãn.
- **Trạng thái không bao giờ chỉ dựa vào màu** — luôn kèm nhãn chữ.
- **Component đặc trưng:** `ShiftLifecycleBadge` (badge trạng thái ca duy nhất, dùng mọi nơi).
- Chi tiết đầy đủ: xem `DESIGN.md` và `PRODUCT.md`.

### Bảng trạng thái lifecycle → nhãn → tông
| State | Nhãn | Tông |
|---|---|---|
| Draft | Nháp | neutral |
| PendingDeposit | Chờ đặt cọc | neutral |
| Published | Đã đăng | info |
| StartingSoon | Sắp bắt đầu | warning |
| InProgress | Đang diễn ra | info |
| AwaitingCheckout | Chờ check-out | warning |
| AwaitingEmployerConfirmation | Chờ xác nhận | warning |
| Completed | Hoàn thành | success |
| Expired | Hết hạn | neutral |
| Cancelled | Đã huỷ | danger |
| Disputed | Có tranh chấp | danger |

---

## 7. Tài liệu tham chiếu trong repo

- `PRODUCT.md` — người dùng, mục đích, brand, anti-references, design principles, a11y.
- `DESIGN.md` — design system đầy đủ (màu, typography, elevation, component, do/don't).
- `HANDOFF.md` — trạng thái hiện tại, lỗi đã phát hiện, kế hoạch backend, rủi ro, bước tiếp theo. **Đọc file này để biết nên làm gì.**
- `docs/BACKEND_MIGRATION_PLAN.md` — kế hoạch backend cho chủ dự án (không kỹ thuật).
- `docs/KIRO_HANDOFF_CURRENT_STATE.md` — bàn giao trạng thái (lịch sử các phase CORE-STABILITY).
- `docs/CURRENT_TODO.md` — checklist QA thủ công + thứ tự migration.
- `docs/SUPABASE_SECURITY_NOTE.md` — đọc TRƯỚC khi cấu hình Supabase.
