# HANDOFF — Session 2026-09-28 (Kế hoạch sửa theo feedback khách hàng / đi thực tế)

> Đọc kèm `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-09-26_AUTH.md`.
> File này mới là **PLAN**, chưa sửa code. Làm theo thứ tự P0 → P3. Mục có dấu
> **[QUYẾT]** cần chủ dự án chốt trước khi code (xem mục 5).

## ⛔ BẮT BUỘC TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ (kể cả P0)
Ai pull về (người hay AI agent) phải xong **cả 2 việc** dưới đây, ghi kết quả vào
file này, commit, **rồi mới được sửa code**. Chưa xong thì DỪNG và hỏi chủ dự án.

- [x] **A. Migration 0023/0024.** Hỏi người viết (partner; `a44dc82` và `f7a20a7` là 2 commit
      TẠO RA migration, không phải bản mới nhất) đã định chạy `npx supabase db push` chưa.
  - Người viết tự chạy. Người khác **KHÔNG chạy hộ**.
  - Kiểm tra bằng `npx supabase migration list`: 0023 và 0024 phải có cả cột local lẫn
    remote.
  - Ghi kết quả: **đã apply 29/09/2026 bởi hungkobe273** (`npx supabase db push`;
    `migration list` giờ có cả local lẫn remote cho 0023/0024).
    - Phát hiện trước khi push: bảng `schedule_blocks`, `shift_reviews` và 3 RPC
      **đã có sẵn trên remote** (từng chạy tay, không ghi vào `schema_migrations`);
      `shift_reviews` có 2 dòng thật.
    - Đã so hàm/constraint/cột/policy/index/quyền trên remote với file local (chạy
      lại trong transaction + rollback): **khớp 100%**. Sau push so lại: schema không
      đổi, dữ liệu giữ nguyên (2 dòng đánh giá). Push thực chất chỉ ghi lịch sử.
- [x] **B. Trả lời đủ 7 câu ở mục 5.** _(xong 29/09 — P3 hoãn theo câu 6; P2-1 còn 3 điểm mở ở câu 4)_ Điền vào dòng **Trả lời:** dưới từng câu.
  - Phải có **đủ 7 câu trả lời** mới bắt đầu, kể cả P0.
  - Câu nào bị trả lời "chưa biết" thì ghi rõ, và KHÔNG làm phần phụ thuộc câu đó:
    - Câu 1 → P0 bước 6.
    - Câu 2, 3, 7 → P1.
    - Câu 4, 5 → P2.
    - Câu 6 → P3.

> AI agent: đọc tới đây mà A hoặc B chưa có kết quả → hỏi người dùng 2 việc này
> trước, không tự suy đoán câu trả lời, không tự chạy `db push` 0023/0024.

## 0. Trạng thái repo lúc lập plan
- **Bản mới nhất có plan này:** `main` = `feat/payos-real-payment` = `d725728`
  (`b79809a` thêm plan, `d725728` thêm mục ⛔). Hai commit này CHỈ sửa tài liệu
  (`docs/`, `CLAUDE.md`), không đổi code.
- **Code mới nhất** vẫn là `adbef85` của partner (lịch lưu server 0023, đánh giá hai
  chiều 0024, rà soát UI, hồ sơ worker, `PAYOS_MOCK`). Plan được viết dựa trên code này.
- ✅ **Migration `0023_schedule_blocks` và `0024_shift_reviews` đã apply** (29/09,
  xem mục ⛔-A). Lúc lập plan `migration list` báo cột remote trống, nhưng thực tế
  bảng đã được chạy tay từ trước; nay đã ghi đúng vào lịch sử migration.
- 0001–0024 đã apply. Cờ bắt buộc SĐT/CCCD vẫn TẮT. SpeedSMS chưa có token.
- **Cập nhật 29/09 — P0 xong** trên nhánh `fix/p0-feedback` (tách từ `main` =
  `c76c603`, gồm 2 commit docs mục ⛔). 7 commit: `85a7c1d` (P0-1) → `a05eec5` (P0-2)
  → `57dcbb7` (P0-3) → `c0dae9c` (P0-4) → `0db9007` (P0-5) → `8e96780` (P0-6) →
  `421f9ce` (sửa FAQ bảng giá theo security-reviewer) + commit docs `9a31c31` +
  `e915d38` (thêm theo yêu cầu 29/09: bỏ "Ca công khai" khỏi nav employer — 7 → 6
  mục; trang quản lý ca có link "Xem như người lao động thấy"; E2E 28).
  **Chưa merge `main`** — chờ chủ dự án đồng ý. Không đổi DB.
  - Gate: tsc 0 lỗi; eslint `src`+`e2e` 0 lỗi; `test:run` 778/778 (không còn 3 fail
    `handbookContent`); `test:time` 22/22; `build` OK.
  - E2E (server local-mode tạm ở cổng 3101, webpack — vì :3000 đang chạy dev
    supabase nên Playwright không tự mở được server): spec mới 26, 27 + 18, 19 qua.
    Toàn bộ bộ e2e: 111 qua + 4 lỗi do tải (qua khi chạy 1 worker) + **7 test ví hỏng
    có sẵn trên `main`** (14:117, 16×2, 20×3, 21:24 — không tìm thấy nút "Nạp tiền vào
    ví" sau các đợt đổi UI ví trước P0). Không do P0.
  - security-reviewer: không có lỗi Nghiêm trọng/Cao; mục Trung bình (FAQ tự chốt
    24h nói quá) đã sửa ở `421f9ce`.
  - `npm run lint` toàn repo đang báo lỗi ở `playwright-report/` (báo cáo sinh ra khi
    chạy e2e) và `.claude/skills/impeccable/` (chưa track) — eslint config chưa
    ignore 2 thư mục này. Không phải lỗi code.
- **Cập nhật 29/09 — P1 phần lớn xong**, 3 nhánh nối tiếp nhau (mỗi nhánh tách từ
  nhánh trước — merge theo thứ tự `fix/p0-feedback` → `feat/p1-homepage` →
  `feat/p1-colors` → `feat/p1-copy` → `feat/p1-copy-app`). Chưa merge, không đổi DB.
  - `feat/p1-homepage`: `29cf204` tách trang chủ (`/` chọn vai trò, `/viec-lam`,
    `/tuyen-dung`, E2E 29; build 33 route); `5675d83` 6 ảnh stock Unsplash
    (`docs/IMAGE_CREDITS.md`).
  - `feat/p1-colors`: `6752720` gom 3 màu + token `cream/brand/ink`, badge giữ
    nguyên; ảnh lợi ích `loading="eager"`.
  - `feat/p1-copy`: `7c54658` thống nhất thuật ngữ **"cọc"** + **"người ứng tuyển"**
    (chủ dự án chốt 29/09; nhãn trạng thái "Chờ giữ cọc"/"Đã giữ cọc");
    `9e97bbf` rút gọn user-guide (~−65% chữ), how-it-works, safety, about và bỏ
    các câu sai ở production (FAQ "không có tiền thật", "Xác nhận đã thanh
    toán", bắt buộc SĐT, "giảm phí tương lai").
  - Gate mỗi nhánh: tsc 0, eslint `src`+`e2e` 0 lỗi, `test:run` 778/778, build OK;
    e2e toàn bộ 123 qua, chỉ còn 7 test ví hỏng sẵn trên `main`.
  - `feat/p1-copy-app` (tách từ `feat/p1-copy`): `300ca50` rút gọn 22 chuỗi `vi.ts`
    + 4 trang app còn ≤2 câu; bỏ "thanh toán giả lập" (sai ở production) và lời hứa
    "cấp độ ảnh hưởng phí". → **P1 xong** (trừ "quán đang dùng" và ảnh cho bước ở
    trang thông tin).
- **Cập nhật 29/09 (chiều):** P0 + P1 đã merge `main` (PR #8, #9 → `75755d7`),
  gồm cả sửa 7 test e2e ví và eslint. **P2-3 xong** trên nhánh
  `fix/wallet-withdraw-visible` (kèm sửa nút Rút tiền) — migration 0025 **chưa
  push**. Chi tiết: `docs/HANDOFF_SESSION_2026-09-29_P2-3.md`.

## 1. Feedback gốc, đã gom nhóm
| # | Nhóm | Feedback | Loại |
|---|---|---|---|
| F1 | Bố cục | 2 bên lề còn trống, mở rộng vùng nội dung | Code |
| F2 | Màu | Màu chưa thống nhất; chỉ 3 màu, dùng khối màu (color block) | Code |
| F3 | Nội dung | Nhiều chữ quá, thêm hình; lọc bớt thông tin; câu từ khó hiểu | Code + nội dung |
| F4 | Trang chủ | Nhiều thông tin quá; tách trang chủ cho nhà tuyển dụng và người lao động; đưa tính năng dùng nhiều nhất và lợi ích của từng bên lên đầu | Code |
| F5 | Đăng ca | Nội dung bị lặp ở trang Đăng ca (nhà tuyển dụng) | Code |
| F6 | Lịch | "Lịch tuyển đủ chỗ thì ghi lịch tuyển dụng" | Code **[QUYẾT]** |
| F7 | Admin | Thiếu mục: ca chưa khớp, ca huỷ; nút Back phải về Tổng quan admin, không phải trang chủ | Code |
| F8 | Bảng giá | Không lặp thông tin | Code |
| F9 | Xác thực worker | Xác thực người lao động bằng CCCD; worker chưa xác thực thì phải đặt cọc; làm đủ N ca thì không cần cọc ("cọc 2 đầu") | DB + Code **[QUYẾT]** |
| F10 | Cọc NTD | Lần đầu cọc đủ; từ lần 2 giảm cọc, hoặc credit (nạp 500 được 600, dùng dần) | DB + Code **[QUYẾT]** |
| F11 | Parttime | Mở thị trường job parttime dài hạn (phục vụ/chạy bàn/bưng bê có training; phụ bếp/sơ chế/bếp nóng/bếp lạnh; khách sạn, kho bãi, sự kiện). Không cho 2 bên thấy SĐT của nhau. Phí giới thiệu. | DB + Code **[QUYẾT]** |
| F12 | Vận hành | Đăng hộ job của quán (có xin phép) cho web nhiều tin, trông uy tín; free cả tháng rồi mới mời nhà tuyển dụng trả phí | Code nhỏ + vận hành |
| F13 | Kinh doanh | Pháp lý hộ kinh doanh, chi phí, poster, fanpage/TikTok, khảo sát, seeding… | Không code (mục 4) |

## 2. Hiện trạng code liên quan (đã soi)
- **Lề/độ rộng:** container trang dùng lẫn `max-w-7xl` (9), `max-w-6xl` (7),
  `max-w-5xl` (6), `max-w-4xl/3xl/2xl`… NavBar rộng `max-w-[1600px]`, còn nội dung
  hẹp hơn nên hai bên trống trên màn ≥1440px. Chưa có component container chung.
- **Màu:** `globals.css` có 4 màu gốc (`--background #FFF4E9`, `--foreground #37373B`,
  `--brand #FF9A5F`, `--brand-soft #FFD5AE`) nhưng code dùng class Tailwind trực tiếp.
  Số lần dùng theo họ màu: gray 1149, orange 631, **red 246, amber 147, emerald 73,
  green 40, blue 26, slate 21, indigo 12, rose 6, purple 5, teal 2, pink 2**. Vừa có
  green lẫn emerald, vừa có gray lẫn slate → lệch tông.
- **Trang chủ** `src/app/page.tsx` (359 dòng): 6 khối (hero 2 CTA → dải tin cậy 3 ý
  → cách hoạt động 2 cột → an toàn 4 thẻ → tách vai trò 2 thẻ → CTA cuối). Không có
  ảnh nào (chỉ icon SVG + `FeaturedJobMockup`). `public/images` chỉ có `logo.png` và
  `handbook/`. Hai vai trò trộn chung một trang.
- **Đăng ca** `src/app/employer/shifts/new/page.tsx` (1121 dòng) + `ShiftForm.tsx`:
  số tiền cọc hiện trong form (`ShiftForm.tsx:728, 744`) **và** lại hiện ở thẻ
  "Đặt cọc" cuối trang (`page.tsx` ~1059: tổng lương, hệ số, tỉ lệ, số cọc); còn thêm
  popover trợ giúp, `VerificationGateNotice`, thẻ cam số dư ở đầu trang. Cần chụp
  màn production để khoanh đúng chỗ lặp (bước 1 của P0-3).
- **Admin** `src/app/admin/dashboard/page.tsx`: tab `analytics | users | shifts |
  disputes | verifications`. Bộ lọc tab Ca làm chỉ có `all | active | completed |
  disputed` → **không có "Chưa khớp" và "Đã huỷ"**. Với admin, logo NavBar
  (`NavBar.tsx:490`) và mục "Trang chủ" (`NavBar.tsx:798`) đều trỏ `/`.
- **Bảng giá** `src/app/pricing/page.tsx`: ở production, ý "Nhà tuyển dụng: đăng ca,
  duyệt ứng viên miễn phí" và "10% phí" bị nhắc lại ở intro + danh sách + ví dụ; còn
  mục VIP/Boost "Dự kiến" chưa chốt.
- **SĐT:** worker chỉ thấy `onSiteContactPhone` của ca ở trang chi tiết ca
  (`shifts/[id]/page.tsx:1185`). Employer thấy SĐT worker trong modal hồ sơ.
- **Cọc worker:** chưa có. Cọc NTD = tiền công + 10% phí, chặn ở
  `create_deposit_session` (0018/0022). Ví có `credit_wallet_from_payment`.
- **CCCD:** đã có luồng nộp + admin duyệt cho cả worker và employer (0022). Chỉ
  mới dùng để chặn employer; chưa dùng cho worker.

## 3. Kế hoạch

### P0 — Sửa nhanh, không đổi DB (≈1–2 ngày) — ✅ XONG 29/09 (nhánh `fix/p0-feedback`)
1. ✅ **Admin: Back về Tổng quan admin (F7).** _(`85a7c1d`: logo admin → Tổng quan,
   bỏ "Trang chủ" ở nav admin; URL dashboard giữ `?tab=&filter=` bằng replaceState
   nên Back trình duyệt đúng tab + bộ lọc; "Quay lại" ở chi tiết ca → `?tab=shifts`
   (chưa giữ `filter`, Back trình duyệt thì giữ). E2E 26.)_
   - `NavBar.tsx`: khi `role === 'admin'` thì logo và mục "Trang chủ" trỏ
     `/admin/dashboard` (hoặc bỏ mục "Trang chủ" ở `AdminNav`).
   - Trang admin mở sang (chi tiết ca, tranh chấp, hồ sơ): link quay lại dùng
     `/admin/dashboard?tab=<tab đang đứng>` (page đã đọc `?tab=&filter=`, dòng ~103).
2. ✅ **Admin: thêm bộ lọc ca (F7).** _(`a05eec5`: `src/domain/adminShiftFilter.ts`
   + 20 unit test. "Chưa khớp" = ca thật chưa bắt đầu, `effectiveFilledCount` <
   `positionsTotal`; "Gấp" nếu bắt đầu trong 24h. "Đã huỷ" = Cancelled hoặc Expired
   không ai nhận. Ô Thống kê "Ca chưa khớp" (kèm số gấp) + "Ca huỷ". E2E 27.)_
   - Tab Ca làm, thêm filter `unfilled` (đã đăng, chưa đủ người, dựa
     `getShiftLifecycleState` + số đơn Confirmed < `slots`; tách thêm "sắp bắt đầu mà
     chưa đủ") và `cancelled` (`Cancelled`, `Expired` không ai nhận).
   - Tab Thống kê, thêm 2 ô "Ca chưa khớp", "Ca huỷ" bấm vào nhảy sang filter đó
     (dùng sẵn `jumpToShifts`). Cập nhật union type ở dòng 362.
3. ✅ **Đăng ca bớt lặp (F5).** _(`c0dae9c`: KHÔNG chụp được production vì agent không
   được đăng nhập bằng mật khẩu → khoanh chỗ lặp bằng đọc code supabase mode: công
   thức + cách hoàn bị nói 3 lần. Giờ chỉ còn khối tóm tắt dưới form (tiền công /
   phí 10% / tổng giữ từ ví + 1 dòng); bỏ thẻ cam đầu trang + ghi chú lặp ở bước xác
   nhận; đầu trang chỉ còn `VerificationGateNotice` khi có việc. Popover 3 ý, đúng
   theo mode. **Nên chụp lại production bằng tài khoản employer để xác nhận.**)_
   - Chụp trang production khi đăng nhập employer và khoanh các khối lặp.
   - Giữ **một** khối tóm tắt tiền (tiền công, phí 10%, tổng giữ cọc) ở cuối form,
     cạnh nút Đăng; bỏ khối kia.
   - Gộp thẻ số dư và `VerificationGateNotice` thành một thanh cảnh báo khi có vấn đề.
   - Popover trợ giúp: tối đa 3 ý.
4. ✅ **Bảng giá không lặp (F8).** _(`57dcbb7`, `421f9ce`: 2 thẻ + 1 ví dụ + FAQ 3 câu
   (chỉ production); bỏ VIP/Boost.)_
   - Viết lại thành 2 cột thẻ: **Người lao động** (Miễn phí, 3 ý) và **Nhà tuyển
     dụng** (10% trên tiền công, 3 ý, 1 ví dụ), rồi FAQ ngắn.
   - Bỏ "Dự kiến VIP/Boost" cho tới khi chốt. Sau này thêm cột "Parttime dài hạn"
     khi F11 chốt giá.
5. ✅ **Mở rộng lề (F1).** _(`0db9007`: repo đã có `PageShell` (`src/components/ui/`)
   → thêm cỡ `wide` = `max-w-[1400px]` thay vì tạo `PageContainer` trùng. Áp cho
   dashboard worker/employer, Tổng quan admin, `/shifts`. Đo `/shifts`: 1920px →
   nội dung 1400px; 375px → lề 16px, không cuộn ngang. Các trang khác chưa đổi.)_
   - Tạo `src/components/layout/PageContainer.tsx` với 3 cỡ: `wide` (dashboard,
     danh sách ca, admin: `max-w-[1400px]`), `default` (`max-w-7xl`), `narrow` (form,
     trang đọc: `max-w-3xl`). Padding `px-4 sm:px-6 lg:px-8`.
   - Thay dần các `mx-auto max-w-*` rải rác, ưu tiên admin, dashboard, `/shifts`.
6. ✅ **Nhãn lịch (F6).** _(`8e96780`: theo câu trả lời 1 chỉ đổi nhãn rút gọn
   "Lịch tuyển" → "Lịch tuyển dụng"; KHÔNG làm nhãn "Đã tuyển đủ". Nav employer vẫn
   vừa một hàng từ 1280px — spec 18 qua 10 cỡ màn.)_ **Thêm (`e915d38`):** bỏ mục
   "Ca công khai" (/shifts) khỏi nav employer; thay bằng link "Xem như người lao động
   thấy" trên `/employer/shifts/[id]` (chủ ca xem trang công khai có ghi chú, "Quay
   lại" về trang quản lý ca). Nội dung plan cũ:
   - Ở lịch employer, ca đã đủ người hiện nhãn chữ "Đã tuyển đủ" rõ ràng
     (`calendar.legend.employer.fullyBooked` đã có).
   - Đổi tên mục điều hướng employer "Lịch" thành "Lịch tuyển dụng".

Gate P0: `tsc`, `lint`, `test:run`, `build`, và kiểm tra trên trình duyệt admin +
employer.

### P1 — Trang chủ, màu, hình, câu chữ (≈3–5 ngày) — ✅ phần lớn xong 29/09 (xem mục 0)
_Thực tế khác plan: `/` là trang chọn vai trò (câu 3), trang người lao động ở
`/viec-lam`; badge giữ nguyên (câu 2); thuật ngữ chốt "cọc" thay vì "tiền giữ lại";
"quán đang dùng" chưa làm (không có quán thật đồng ý hiện tên)._
1. ✅ **Tách trang chủ theo vai trò (F4).**
   - `/`: dành cho người lao động (khách chủ lực là sinh viên), gồm:
     - Hero: 1 câu + ô tìm ca / nút "Tìm ca gần bạn".
     - 3 lợi ích có ảnh: nhận việc nhanh, tiền về ví sau ca, không cần kinh nghiệm.
     - 6 ca mới nhất (thật).
     - 1 dải chuyển sang "Bạn cần tuyển người? →".
   - Route mới `/tuyen-dung`: dành cho nhà tuyển dụng, gồm:
     - Hero: "Đăng ca trong 2 phút".
     - 3 lợi ích: đủ người đúng giờ, chỉ trả khi có người làm, hoàn cọc khi thiếu.
     - Bảng giá rút gọn, logo/quán đang dùng, CTA Đăng ca.
   - Có công tắc "Tôi cần việc / Tôi cần tuyển" ở đầu cả 2 trang.
   - Đã đăng nhập: worker về `/shifts`, employer về dashboard (link logo theo vai trò).
   - Khối "Cách hoạt động" và "An toàn" chuyển sang `/how-it-works`, `/safety` (đã có
     trang). Trang chủ chỉ còn tối đa 4 khối.
   - Lưu ý bất biến build "đúng 28 route" trong CLAUDE.md đã cũ (hiện 31), cập nhật
     con số khi thêm route.
2. ✅ **3 màu + khối màu (F2) [QUYẾT phạm vi].**
   - 3 màu thương hiệu: **kem `#FFF4E9`**, **cam `#FF9A5F`**, **mực `#37373B`** (+ trắng).
   - Mỗi section của trang marketing là một khối nền đặc: kem / cam / mực, xen kẽ
     nhau, ít viền và bóng.
   - Trong app, thêm token ngữ nghĩa vào `@theme` (`--color-ink`, `--color-brand`,
     `--color-cream`, `--color-ok`, `--color-bad`, `--color-wait`), rồi codemod:
     - `slate-*` → `gray-*`; `emerald-*` → `green-*`.
     - Bỏ `indigo`/`purple`/`teal`/`pink`/`rose` (đổi sang cam hoặc mực).
     - `amber` chỉ dùng cho trạng thái chờ.
   - Màu trạng thái ca: đề xuất giữ tối thiểu xanh lá (xong), đỏ (huỷ/lỗi), vàng
     (chờ). Nhãn chữ luôn đi kèm. **Mâu thuẫn bất biến CLAUDE.md** ("Đang diễn ra"
     luôn xanh dương `info`): nếu chủ dự án muốn đúng 3 màu cả trong badge thì phải
     sửa bất biến này, `getShiftStatusBadge`, `DESIGN.md` và test badge cùng lúc.
3. ✅ **Hình ảnh (F3).** _(6 ảnh cho 2 trang vai trò; trang thông tin chưa có ảnh bước)_
   - Cần khoảng 8–10 ảnh thật: quán ăn, phục vụ, phụ bếp, kho, sự kiện, sinh viên.
     Ưu tiên ảnh tự chụp ở 10 quán đi khảo sát (xin phép), hoặc ảnh có giấy phép
     miễn phí (Unsplash/Pexels).
   - Đặt ở `public/images/landing/`, dùng `next/image`, có `alt` tiếng Việt, nén WebP
     ≤150KB.
   - Thẻ ca đã có `workplaceImage`; hiện ảnh đó ở danh sách ca.
4. ✅ **Bớt chữ + câu dễ hiểu (F3).** _(thuật ngữ "cọc" + 4 trang thông tin + mô tả dài trong app)_
   - Rà `src/i18n/vi.ts` theo danh sách từ khó, đổi ra lời thường. Ví dụ:
     - "escrow/giữ cọc" → "tiền giữ lại".
     - "đối soát" → "kiểm tra tiền".
     - "lifecycle/trạng thái vòng đời" → "tình trạng ca".
     - "phí nền tảng" → "phí dịch vụ CaLẻ".
     - "ứng viên" → "người ứng tuyển".
   - Mỗi đoạn mô tả ≤2 câu; hint form ≤1 dòng.
   - Trang thông tin (about, how-it-works, safety, user-guide): cắt khoảng một nửa,
     chuyển thành các bước có hình.

Gate P1: như P0, cộng test snapshot/e2e của landing nếu có. Kiểm tra mobile 375px.

### P2 — Cọc hai đầu + xác thực worker + ưu đãi cọc NTD (DB, ≈4–6 ngày) [QUYẾT]
Migration mới (0025+), không sửa migration cũ; RPC security definer,
`search_path=''`.
1. **Worker chưa xác thực phải cọc (F9).**
   - `platform_settings`: `worker_deposit_amount` (vd 50.000đ, hoặc % tiền công ca),
     `worker_deposit_exempt_after` (vd 3 ca hoàn thành), `require_worker_deposit`
     (mặc định TẮT).
   - Hàm `_worker_needs_deposit(uid)`: KHÔNG cần nếu `identity_verified_at` có giá trị
     HOẶC số đơn Completed ≥ N.
   - Bọc `apply` thêm lần nữa (theo mẫu `*_before_*_guard`): nếu cần cọc, trừ ví
     worker vào khoản giữ `worker_holds(application_id, amount, status)`. Ví không
     đủ thì báo `WORKER_DEPOSIT_REQUIRED` kèm số tiền, UI mời nạp ví hoặc xác thực
     CCCD.
   - Giải phóng khoản giữ:
     - Hoàn cho worker: ca hoàn thành, bị từ chối, hoặc tự rút đơn trước hạn.
     - Chuyển cho nhà tuyển dụng (hoặc chia) **[QUYẾT]**: vắng mặt (no-show), huỷ
       sát giờ.
     - Gắn vào `_finalize_shift_deposit` / luồng từ chối / huỷ, đảm bảo idempotent.
   - UI:
     - Trang ca hiện "Cọc 50.000đ, hoàn lại khi bạn làm xong ca" hoặc "Bạn được
       miễn cọc".
     - Hồ sơ hiện "Xác thực CCCD để không phải cọc".
2. **Ưu đãi cọc nhà tuyển dụng (F10), chọn 1 trong 2:**
   - (a) Giảm cọc từ ca thứ 2: `employer_deposit_ratio_after_first` (vd 50%). Rủi ro
     là thiếu tiền trả công, phải có luồng thu phần còn lại. **Không khuyến nghị**
     vì trả công đang tự động sau 24h.
   - (b) **Khuyến nghị:** thưởng khi nạp ví, ví dụ nạp 500.000đ được cộng thêm
     100.000đ.
     - Bảng `topup_bonus_rules(min_amount, bonus_amount, active)` và cột ví
       `promo_balance` (không rút được, dùng trước để trả **phí dịch vụ**, không trả
       lương).
     - Cộng thưởng trong `credit_wallet_from_payment` (idempotent theo payment id).
     - Cần điều khoản: tiền thưởng không quy đổi tiền mặt.
3. ✅ _(29/09, `d9e3dcf`, chưa push DB — thêm luật: ngày làm ca ≤ đợt + 30 ngày;
   xem `HANDOFF_SESSION_2026-09-29_P2-3.md`)_
   **Miễn phí theo đợt (F12):** `platform_settings.fee_free_until` (ngày), nghĩa là
   phí 0% cho ca đăng trước ngày đó. Dùng cho campaign "free cả tháng / 1 tuần".
   Admin bật/tắt ở tab Thống kê.
4. Chạy thử trong transaction + rollback (như 0022) trước `db push`. Mọi cờ mặc
   định TẮT.

### P3 — Thị trường parttime dài hạn (≈1–2 tuần) [QUYẾT mô hình phí]
Đây là **tính năng mới**. CLAUDE.md đang hoãn tính năng mới; chủ dự án đã yêu cầu
nên làm, nhưng cách ly khỏi luồng ca/escrow.
1. **DB:**
   - Bảng `job_posts`:
     - Nhà tuyển dụng: `employer_id`, hoặc `posted_by_admin` + `source_note` khi
       đăng hộ.
     - Nội dung: `title`, `category` (phục vụ/chạy bàn · phụ bếp/sơ chế · bếp
       nóng/lạnh · khách sạn · kho bãi · sự kiện · khác), `district`, `address`,
       `schedule_text` (vd "Tối T2–T6, 18h–22h"), `min_hours_per_week`,
       `wage_min`/`wage_max` (đ/giờ).
     - Điều kiện: `has_training`, `no_experience_ok`, `requirements`.
     - Trạng thái: `status` (Draft/Open/Closed/Filled), `expires_at`.
   - Bảng `job_post_applications`.
   - RPC `create_job_post`, `apply_job_post`, `admin_create_job_post_on_behalf`,
     `list_open_job_posts`.
2. **Ẩn SĐT (F11):**
   - Worker và nhà tuyển dụng **không thấy SĐT/email của nhau** trong luồng parttime.
   - CaLẻ là trung gian: admin xem cả hai, gọi giới thiệu, hẹn phỏng vấn.
   - RPC trả hồ sơ ứng viên đã che (tên + kỹ năng + số ca đã làm).
3. **Phí giới thiệu [QUYẾT]**, ghi nhận bằng một cột trạng thái (không thu tự động
   ở bản đầu):
   - Gói thấp: 200.000đ/lượt nhận người, không bảo hành.
   - Gói cao: phí cao hơn, nếu người nghỉ trong X ngày thì giới thiệu lại 1 lần.
   - Tham chiếu thị trường: CareerViet thu khoảng 2,5 tháng lương; CaLẻ rẻ hơn nhiều.
4. **UI:**
   - `/viec-parttime` (danh sách + lọc theo nhóm nghề/quận/giờ) và
     `/viec-parttime/[id]`.
   - Nhà tuyển dụng: "Đăng tin parttime" (form ngắn, khác form ca).
   - Admin: tab "Parttime" (duyệt tin, đăng hộ, danh sách ứng tuyển, đánh dấu đã
     giới thiệu/đã nhận/đã thu phí).
5. Trang chủ worker thêm tab "Ca lẻ | Parttime".

## 4. Việc KHÔNG phải code (chủ dự án / team kinh doanh)
- [ ] **Pháp lý:** đăng ký hộ kinh doanh online (Cổng Dịch vụ công quốc gia), cần
      cho PayOS, hoá đơn, điều khoản. Cập nhật Chính sách bảo mật cho ảnh CCCD
      (NĐ 13/2023) trước khi bật bắt buộc CCCD.
- [ ] **Chi phí:** tính lại cố định (Vercel, Supabase, tên miền, Resend free tier)
      và biến đổi (SpeedSMS/tin, phí PayOS/giao dịch, seeding, in ấn). Đưa kết quả
      vào bảng giá.
- [ ] **Poster** giới thiệu CaLẻ + **QR khảo sát** + **bảng giá in**. Tờ khảo sát A5
      vài câu tick (Anh/chị thấy cần cải thiện gì?).
- [ ] **Kênh:** fanpage + TikTok, 2 campaign:
      - "Miễn phí tất cả" (1 tuần). Code hỗ trợ bằng `fee_free_until` (P2-3).
      - "Free cả tháng" rồi mới mời nhà tuyển dụng trả phí.
- [ ] **Thực địa:** trong 3 ngày gặp 1–2 người/ngày; 10 quán quanh khu vực; hỏi sinh
      viên có sẵn sàng làm với mức lương đó không.
- [ ] **Thứ tự tăng trưởng:** online trước, nhắm sinh viên. Lấy job thật (xin phép,
      đăng hộ) để web có nhiều tin → mời sinh viên đăng ký → có người rồi mới mời
      nhà tuyển dụng.
- [ ] **Dùng thử:** chuỗi lớn (vd Golden Gate), tuyển nhiều. Gửi account dùng thử +
      KPI (số ca đăng, tỉ lệ đủ người, thời gian tuyển) + thu phản hồi tính năng.
- [ ] **Seeding** nhóm cộng đồng "Tuyển dụng parttime"; ngành khách sạn, kho bãi,
      sự kiện.
- [ ] **Nguyên tắc:** không đưa SĐT hai bên cho nhau (tránh đi đường riêng), áp dụng
      cho parttime (P3).

## 5. Cần chủ dự án chốt trước khi code (BẮT BUỘC — xem mục ⛔ ở đầu file)
1. **F6:** "Lịch tuyển đủ chỗ thì ghi lịch tuyển dụng" nghĩa là gì? (plan đang hiểu:
   ca đủ người hiện "Đã tuyển đủ" + đổi tên mục "Lịch" → "Lịch tuyển dụng").
   **Trả lời:** Không làm nhãn "Đã tuyển đủ". Chỉ thay nhãn **"Lịch tuyển" → "Lịch tuyển dụng"** (mục điều hướng/tiêu đề lịch employer). _(29/09)_
2. **F2:** "chỉ 3 màu" áp dụng cho cả badge trạng thái ca không? (Nếu có thì phải bỏ
   bất biến "Đang diễn ra = xanh dương".)
   **Trả lời:** **Không**, badge trạng thái ca giữ nguyên ("Đang diễn ra" vẫn xanh dương `info`). "3 màu" chỉ áp cho giao diện chung/trang marketing. _(29/09)_
3. **F4:** trang chủ `/` mặc định cho người lao động, nhà tuyển dụng ở `/tuyen-dung`,
   đúng không?
   **Trả lời:** **Trang chủ riêng** cho người lao động và nhà tuyển dụng; **`/` là trang chọn vai trò** (2 nút "Tôi cần việc" / "Tôi cần tuyển" dẫn sang 2 trang riêng). Đường dẫn 2 trang con chốt khi làm P1. _(29/09)_
4. **F9:** cọc worker bao nhiêu (số cố định hay % tiền công)? Làm đủ mấy ca thì miễn?
   Worker vắng mặt thì tiền cọc về đâu (nhà tuyển dụng / CaLẻ / chia)?
   **Trả lời:** Nguyên văn: "worker tính cọc bằng 50% số tiền sau khi hoàn thành ca, trong 1 tháng nếu hoàn thành đủ 5 ca trở lên thì không cần cọc". Tức cọc = **50% tiền công của ca**; **≥5 ca hoàn thành trong 1 tháng** thì miễn cọc. _(29/09)_
   ⚠️ **Còn chưa chốt** (hỏi lại trước khi làm P2-1): worker vắng mặt thì cọc về đâu (NTD / CaLẻ / chia); "1 tháng" là 30 ngày gần nhất hay tháng dương lịch; worker đã xác thực CCCD có được miễn cọc không.
5. **F10:** giảm cọc từ lần 2, hay thưởng nạp ví (nạp 500 được 600)? Tiền thưởng chỉ
   trừ phí dịch vụ, hay trừ được cả tiền công?
   **Trả lời:** **Thưởng nạp ví** (vd nạp 500.000đ được thêm 100.000đ); tiền thưởng **chỉ trừ phí dịch vụ**, không trả tiền công, không rút được. _(29/09)_
6. **F11:** giá giới thiệu parttime: 200.000đ/lượt không bảo hành, và gói bảo hành
   bao nhiêu, bảo hành mấy ngày? Bản đầu có cho nhà tuyển dụng tự đăng không, hay
   chỉ admin đăng hộ?
   **Trả lời:** **Tạm thời chưa triển khai** parttime → **không làm P3**. _(29/09)_
7. Ảnh cho trang chủ: team tự chụp hay dùng ảnh stock?
   **Trả lời:** **Ảnh stock trước** (Unsplash/Pexels, giấy phép miễn phí), thay dần bằng ảnh team tự chụp. _(29/09)_

## 6. Thứ tự đề xuất
Xong mục ⛔ (A + B) → P0 → P1 → P2 → P3. Mỗi phần
một commit/nhánh riêng. Không push `main` khi chưa được chủ dự án đồng ý.

## 7. Việc ngày mai (29/09) — checklist P0
Nhánh: `fix/p0-feedback` tách từ `main`. Mỗi bước một commit.

- [x] **Chuẩn bị**
  - `git pull`, `graphify update .`
  - Hoàn thành mục ⛔ ở đầu file (A: 0023/0024; B: đủ 7 câu trả lời). Chưa xong →
    dừng, không làm các bước dưới.
- [x] **Bước 1: Admin Back** (`NavBar.tsx`)
  - Admin bấm logo hoặc "Trang chủ" thì về `/admin/dashboard`.
  - Link quay lại từ trang con giữ nguyên `?tab=`.
  - Test: đăng nhập admin → mở chi tiết ca → Back → vẫn ở đúng tab admin.
- [x] **Bước 2: Admin lọc ca** (`admin/dashboard/page.tsx`)
  - Tab Ca làm thêm filter `unfilled` và `cancelled`.
  - Tab Thống kê thêm 2 ô số liệu tương ứng, bấm vào nhảy sang filter.
  - Thêm unit test cho hàm lọc (tách ra `src/domain/` nếu cần, để test được thuần).
- [x] **Bước 3: Bảng giá** (`pricing/page.tsx`)
  - Viết lại thành 2 thẻ (Người lao động / Nhà tuyển dụng), 1 ví dụ, FAQ.
  - Bỏ mục VIP/Boost "dự kiến".
- [x] **Bước 4: Đăng ca bớt lặp** _(chưa chụp production — xem mục 3)_
  - Chụp trang production (tài khoản employer), khoanh các khối lặp.
  - Giữ một khối tóm tắt tiền cạnh nút Đăng.
  - Gộp cảnh báo số dư và cảnh báo xác thực thành một thanh.
  - Chạy lại `ShiftForm.test.tsx` và e2e đăng ca.
- [x] **Bước 5: `PageShell wide` + mở rộng lề** _(dùng PageShell có sẵn)_
  - Áp cho admin, dashboard worker/employer, `/shifts` trước.
  - Kiểm tra các cỡ 375 / 1280 / 1920px.
- [x] **Bước 6: Nhãn lịch employer** _(chỉ đổi nhãn, theo câu 1)_
  - Ca đủ người hiện "Đã tuyển đủ".
  - Mục điều hướng "Lịch" đổi thành "Lịch tuyển dụng" (nếu chủ dự án xác nhận F6).
- [x] **Gate:** `npx tsc --noEmit`, `npm run lint`, `npm run test:run` (3 fail
  `handbookContent` có sẵn), `npm run build`; kiểm tra trên trình duyệt.
- [x] **Kết thúc:** _(mục 0 + 3 đã cập nhật; nhánh đã push; chờ đồng ý merge)_
  - Cập nhật mục 0 và mục 3 của file này (đánh dấu ✅).
  - Push nhánh; chỉ merge `main` khi chủ dự án đồng ý.

### Tiếp theo (sau P0)
- [x] Merge P0 + P1 vào `main` (PR #8, #9 → `75755d7`).
- [ ] Chụp production bằng tài khoản employer: trang Đăng ca (P0-4), Tổng quan admin
      + dashboard (màu P1-2).
- [x] P1-4 còn lại: mô tả dài trong màn app (`300ca50`).
- [ ] P2 chờ chốt 3 điểm mở ở câu 4 (cọc worker khi vắng mặt về đâu; "1 tháng"
      tính thế nào; đã xác thực CCCD có miễn cọc không).
- [x] Task riêng: 7 e2e ví hỏng sẵn trên `main`; eslint bỏ qua `playwright-report/`
      (`a24b0b7`, đã merge).
- [x] P2-3 miễn phí theo đợt (`d9e3dcf`) — còn chờ `db push` 0025 + merge.
