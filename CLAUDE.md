# CLAUDE.md — CaLẻ / Now

> Hướng dẫn cho AI agent làm việc trên repo này. Đọc file này + `HANDOFF.md`
> trước khi động vào code. Không cần scan lại toàn bộ repository.

## 0. Agent & lệnh của repo — TỰ ÁP DỤNG, không cần người dùng nhắc

Có trong `.claude/` (mô tả: `.claude/README.md`). AI agent tự dùng theo bảng dưới:

| Khi | Tự làm |
|---|---|
| Sắp `git commit` có sửa code | Chạy `/verify` (chỉ sửa docs/Markdown thì bỏ qua). Không ĐẠT → sửa rồi mới commit. |
| Diff đụng `supabase/migrations`, `supabase/functions`, ví/cọc/PayOS/rút tiền, auth, CCCD | Chạy `/verify pre-pr` + gọi agent **security-reviewer** rà diff TRƯỚC khi push. Có lỗi Nghiêm trọng → dừng, báo người dùng. |
| Thêm hàm `src/domain/` hoặc sửa bug tái hiện được | Làm theo `/tdd` (test hỏng trước, rồi mới sửa). |
| Thêm/đổi luồng người dùng trên UI | Gọi agent **e2e-runner** thêm/cập nhật spec `e2e/`. |
| `tsc` / `lint` / `build` đỏ | Gọi agent **build-error-resolver**. |
| Bắt đầu phần việc dài (một bước P0/P1…) | `/checkpoint create <tên>`; xong thì `/checkpoint verify <tên>`. |

Báo ngắn cho người dùng khi đã chạy (vd "verify ĐẠT, security-reviewer: không có lỗi
nghiêm trọng").

---

## 1. Sản phẩm là gì

**CaLẻ / Now** — sàn việc làm **theo ca ngắn hạn** cho thị trường Việt Nam.
Đây là **web app phục vụ nghiệp vụ** (không phải trang đăng tin), dẫn người dùng
qua vòng đời: đăng ca → ứng tuyển → duyệt → theo dõi trạng thái → check-in/out →
hoàn thành → đánh giá → đối soát.

**Trạng thái quan trọng (cập nhật 03/10/2026):** app chạy theo **hai chế độ**, chọn bằng
`NEXT_PUBLIC_DATA_MODE`:
- **local / demo** (mặc định, cũng là chế độ của e2e): chạy hoàn toàn ở trình duyệt, dữ liệu
  `localStorage`; ví/cọc/check-in đều là **mô phỏng** và UI phải nói đúng như thế.
- **supabase = production** (`https://cale.io.vn`, thử nghiệm giới hạn Beta): Supabase Postgres +
  RLS + Edge Functions; nạp / giữ cọc / trả công / hoàn cọc / rút tiền là **tiền thật qua PayOS**.
  Tính năng nào đã nối server thật: xem `src/data/capabilities.ts` (nguồn sự thật duy nhất).

**Tên hiển thị:** dùng **CaLẻ** ở mọi bề mặt hướng người dùng; chỉ dùng
**CaLẻ / Now** trong tài liệu nội bộ/kỹ thuật.

### Ba vai trò
- **Worker (người lao động):** tìm ca, ứng tuyển, check-in/out, ví, điểm uy tín + kỹ năng. Copy xưng "bạn".
- **Employer (nhà tuyển dụng):** đăng ca, giữ cọc (demo: mô phỏng; production: tiền thật qua PayOS), duyệt ứng viên, xác nhận có mặt/hoàn thành, khiếu nại. Copy dùng "người lao động".
- **Admin (quản trị viên):** xác minh giấy tờ, xử lý tranh chấp, override trạng thái, điều chỉnh uy tín. Copy trung lập.

---

## 2. Tech stack

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI | **React 19** + **TypeScript 5** + **Tailwind v4** (không config file, không dùng `dark:`) |
| State | **Zustand 5** — mỗi domain một store |
| Persistence | demo: **localStorage** qua `src/data/persistence.ts`; production: **Supabase** qua `src/data/repos/*` |
| Backend | **Supabase** (Postgres + RLS, `supabase/migrations` 32 migration, Edge Functions `create-payment`, `payos-webhook`, `withdraw`, `phone-otp`, `admin-users`) + **PayOS** |
| Test đơn vị | **Vitest 4** + `fast-check` (property-based) |
| Test E2E | **Playwright** (chromium, tự mở dev server riêng ở cổng `E2E_PORT`, mặc định 3100, chế độ local) |

Dependencies runtime: `next`, `react`, `react-dom`, `zustand`, `@supabase/supabase-js`, `react-qr-code`.

---

## 3. Cấu trúc project

```
src/
  app/                    # App Router — 25 route (page.tsx), đếm ngày 03/10/2026
    page.tsx              # trang chủ (giới thiệu chung, khối "Về CaLẻ" #home-about, "Cách hoạt động" #home-how)
    for-workers, for-employers  # trang theo vai trò (đã gộp các trang hướng dẫn nhỏ + bảng giá #employer-pricing)
    login, register, forgot-password
    shifts/, shifts/[id]/
    worker/dashboard, worker/profile, worker/schedule
    employer/dashboard, employer/shifts/new, employer/shifts/[id], employer/profile, employer/schedule
    admin/dashboard/
    disputes/
    (thông tin / pháp lý) faq, terms, privacy, support (#support-safety), user-guide, handbook, handbook/[slug]
    layout.tsx           # root layout: <body class="public-skin"> + AppHydrator + NavBar + Footer + ToastHost + HashLinkHandler
    globals.css          # NGUỒN SỰ THẬT palette (khối :root + @theme + .public-skin)
  domain/                # ~40 module logic THUẦN (không React/IO) — server tái dùng được
  stores/                # 16 Zustand store (barrel: stores/index.ts)
  components/            # ui / layout / shift / user / forms / calendar / handbook / landing / legal / about / dashboard / wallet / payment / workerDeposit / verification / auth / analytics
  data/
    persistence.ts       # loadAll/persistAll, SCHEMA_VERSION, STORAGE_KEYS, export/import snapshot (demo)
    repos/               # truy cập Supabase theo bảng (production)
    capabilities.ts      # tính năng nào đã có backend thật theo data mode
    supabaseClient.ts    # isSupabaseEnv(), client lười
    seed/*.json          # dữ liệu seed demo (users, shifts, applications, ...)
    mock/                # handbookArticles.ts (+ bản tiếng Anh)
  lib/                   # helper: format, ids, validate, notificationTarget, useLifecycleSync, hashNav, ...
  i18n/                  # vi.ts (nguồn sự thật copy) + en*.ts (bản tiếng Anh theo đợt)
  types/index.ts         # toàn bộ mô hình dữ liệu, chú thích theo từng phase
  __tests__/             # unit + property (properties/, generators/); tổng ~97 file *.test.ts(x) trong src/
supabase/                # migrations/, functions/ (Edge), dryrun/run-00NN.sh (chạy thử trong transaction + rollback), tests/
e2e/                     # 43 spec Playwright + fixtures/
docs/                    # handoff theo phiên (HANDOFF_SESSION_*.md), backend plan, security note
.kiro/specs/             # spec requirements/design/tasks các phase (tài liệu lịch sử)
```

### Kiến trúc dữ liệu (quan trọng để hiểu)
- **`types/index.ts`** là nguồn sự thật mô hình. Timestamp = ISO 8601 string; date = `YYYY-MM-DD`; time = `HH:mm`; tiền = số nguyên đồng.
- **`domain/`** chứa hàm thuần: lifecycle, escrow, reputation, wage, conflict, evidence, skillProgression, availabilityMatch... Không phụ thuộc React → **server backend tái dùng được nguyên vẹn**.
- **`stores/`** là lớp duy nhất UI dùng để truy cập dữ liệu. Chế độ demo: mỗi mutation ghi lại `localStorage` qua `persist(...)`; chế độ production: store gọi `data/repos/*` (Supabase), tiền đi qua RPC / Edge Function trên server — **interface store giữ nguyên**.
- **`AppHydrator`** (client, mount 1 lần ở layout) gọi `loadAll()` rồi seed mọi store, chạy `runLifecycleSync()`, validate auth.

---

## 4. Cách chạy / test

```bash
npm run dev          # dev server (port 3000)
npm run build        # build production — 25 route + _not-found (03/10/2026; route cũ có redirect trong next.config.ts)
npm run test:run     # unit test (Vitest, chạy 1 lần)
npm run test:time    # bộ time-travel lifecycle
npm run test:e2e     # Playwright (tự mở dev server ở cổng E2E_PORT, mặc định 3100)
npm run lint         # eslint
npx tsc --noEmit     # type-check
```

### Lưu ý môi trường
- Windows: terminal có thể hiển thị tiếng Việt bị **mojibake** — ghi báo cáo ra file UTF-8, pipe log ra file.
- **Có git** (remote GitHub, nhánh chính `main`). Mỗi việc một nhánh riêng; chỉ commit / push / merge khi chủ dự án bảo rõ. Merge `main` chỉ sau khi migration của nhánh đó đã được chủ dự án `db push`.
- Không tự `db push` hay deploy Edge Function: chỉ chạy thử migration trong transaction + rollback (`supabase/dryrun/run-00NN.sh`).
- Ngày trong môi trường theo đồng hồ thật; nhiều test dùng mốc thời gian cứng (~giữa 2026) hoặc `page.clock` của Playwright.

---

## 5. Nguyên tắc BẮT BUỘC giữ

### Nghiệp vụ (bất biến)
1. **Một nguồn sự thật cho lifecycle ca làm** — `getShiftLifecycleState(shift, applications, nowIso)` trong `src/domain/shiftLifecycleState.ts`, dùng ở **mọi** bề mặt. Trạng thái **chỉ theo đồng hồ** cho transition start/end.
2. **Check-in / employer mark-present KHÔNG đẩy ca sang "Đang diễn ra" sớm**, cũng không kết thúc ca sớm. Presence là "attendance fact", không phải "lifecycle fact".
3. **Cùng một ca = cùng nhãn + cùng màu badge ở mọi trang** (qua `getShiftStatusBadge` + component `ShiftLifecycleBadge`). "Đang diễn ra" LUÔN là tông `info` (xanh dương).
4. **Check-out chỉ hiện SAU khi ca kết thúc** (`now >= end`, không giới hạn trên; sau 60 phút hiển thị là check-out muộn) và chỉ khi worker đã tự check-in.
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
- **Ngoại lệ — production (`NEXT_PUBLIC_DATA_MODE=supabase`, từ 09/2026):** nạp, giữ
  cọc, trả công, hoàn cọc, rút tiền là **tiền THẬT qua PayOS** (migration 0016–0019)
  → UI production KHÔNG được ghi "mô phỏng" cho các luồng này; mô tả đúng luồng
  server. Nhãn mô phỏng chỉ còn cho chế độ local/demo và khi bật `PAYOS_MOCK=true`.
  Xác minh giấy tờ, check-in, điểm uy tín vẫn là mô phỏng/prototype.
- **Tiền tệ:** dùng chữ thường `đ` / `đồng`. **Cấm `VNĐ` và `₫`.**

### Kỹ thuật
- **Không viết lại app từ đầu.** Code đã ổn định, có test.
- **Không thêm tính năng mới** (chat, staff-supply/agency, AI matching) trước khi backend/core ổn định — đã quyết định hoãn.
- Khi đổi shape dữ liệu persistence → **bump `SCHEMA_VERSION`** trong `persistence.ts` (hiện là 19) để tự reseed.
- **Song ngữ VI / EN (từ 30/09, đợt 1 = trang công khai):** cookie `cale.lang`, xem
  `src/i18n/locale.ts`. Màn đã dịch dùng `useT()`/`useTx()` (client) hoặc `await getT()`/
  `await getTx()` (server) thay cho `t` của `vi.ts`. Thêm/sửa chữ trên các màn này → thêm
  bản tiếng Anh vào `src/i18n/en.ts` (`en` theo khoá, `enText` theo câu Việt viết cứng);
  test `i18nEnglish.test.ts` sẽ báo nếu thiếu. Màn chưa chuyển vẫn dùng `t` (luôn tiếng Việt).
  Đợt 2a (01/10): `errorMap`, `/shifts`, thẻ ca, nhãn trạng thái, chuông, ví, `/shifts/[id]`
  — bản dịch ở `src/i18n/en-app.ts` (không ghi đè câu đợt 1). Đợt 2b: 2 dashboard + hộp thoại
  con (`en-dashboard.ts`), trang quản trị (`en-admin.ts`). Code ngoài React (`errorMap`,
  store, xử lý sự kiện) dùng `tCurrent` / `txCurrent` (đọc `<html lang>`), KHÔNG dùng trong render.
- **Giao diện tối (30/09):** `<html data-theme="dark">`, chỉ đổi biến màu trong
  `globals.css` (không dùng `dark:`). Thêm màu hex/gradient mới trong CSS thì thêm bản tối
  ở khối `:root[data-theme="dark"]`; xem DESIGN.md mục "Giao diện tối".
- **Palette:** `src/app/globals.css` là nguồn chuẩn DUY NHẤT. `DESIGN.md` cập nhật để KHỚP globals.css, không ngược lại.
- Mục tiêu **WCAG 2.1 AA**, mobile-first, chạm tối thiểu 44×44px, tôn trọng `prefers-reduced-motion`.

---

## 6. Design system (tóm tắt)

- **Bảng màu (03/10/2026):** cả app và trang công khai dùng chung da `.public-skin` (gắn ở `<body>`, xem `globals.css` + DESIGN.md). Giao diện sáng: nền trắng ngà `#FBF9F6` (trang công khai xen kẽ giấy ấm `#F2EEE8`), thẻ trắng nổi lên; một màu thương hiệu duy nhất là cam `#FF8A3D` (token gốc `:root --brand` vẫn là `#FF9A5F`, da khai lại; dùng ≤10% mỗi màn app, chỉ cho hành động + điểm nhấn); nền cam nhạt trung tính `orange-50` `#FFF5EE` … `200` `#FFD9BF`; mực `#1E1E22`. Giao diện tối: nền `#141416` < giấy `#19191c` < thẻ `#24242a`. Cam đậm `#ea580c` cho chữ/viền. Bộ màu trạng thái ngữ nghĩa (info/warning/success/danger/neutral/purple) — mỗi cái là cặp nền nhạt + mực đậm.
- **Chữ:** một họ Inter (subset latin + vietnamese), phân cấp bằng weight/cỡ. Thang cỡ cố định trong app (không `clamp()`); chỉ hero landing mới co giãn.
- **Trạng thái không bao giờ chỉ dựa vào màu** — luôn kèm nhãn chữ.
- **Component đặc trưng:** `ShiftLifecycleBadge` (badge trạng thái ca duy nhất, dùng mọi nơi).
- Chi tiết đầy đủ: xem `DESIGN.md` và `PRODUCT.md`.

### Bảng trạng thái lifecycle → nhãn → tông
| State | Nhãn | Tông |
|---|---|---|
| Draft | Nháp | neutral |
| PendingDeposit | Chờ giữ cọc | neutral |
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
- `docs/HANDOFF_SESSION_*.md` — bàn giao theo phiên, mới hơn `HANDOFF.md` (bản mới nhất: `docs/HANDOFF_SESSION_2026-10-03_UI_REDESIGN.md`; việc còn dở: `docs/HANDOFF_2026-10-02_VIEC_DINH_LAM.md`). `HANDOFF.md` gốc chưa cập nhật từ khi có production.
- `docs/BACKEND_MIGRATION_PLAN.md` — kế hoạch backend cho chủ dự án (không kỹ thuật).
- `docs/KIRO_HANDOFF_CURRENT_STATE.md` — bàn giao trạng thái (lịch sử các phase CORE-STABILITY).
- `docs/CURRENT_TODO.md` — checklist QA thủ công + thứ tự migration.
- `docs/SUPABASE_SECURITY_NOTE.md` — đọc TRƯỚC khi cấu hình Supabase.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
