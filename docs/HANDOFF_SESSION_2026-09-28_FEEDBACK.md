# HANDOFF — Session 2026-09-28 (Kế hoạch sửa theo feedback khách hàng / đi thực tế)

> Đọc kèm `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-09-26_AUTH.md`.
> File này mới là **PLAN**, chưa sửa code. Làm theo thứ tự P0 → P3. Mục có dấu
> **[QUYẾT]** cần chủ dự án chốt trước khi code (xem mục 5).

## ⛔ BẮT BUỘC TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ (kể cả P0)
Ai pull về (người hay AI agent) phải xong **cả 2 việc** dưới đây, ghi kết quả vào
file này, commit, **rồi mới được sửa code**. Chưa xong thì DỪNG và hỏi chủ dự án.

- [ ] **A. Migration 0023/0024.** Hỏi người viết (partner; `a44dc82` và `f7a20a7` là 2 commit
      TẠO RA migration, không phải bản mới nhất) đã định chạy `npx supabase db push` chưa.
  - Người viết tự chạy. Người khác **KHÔNG chạy hộ**.
  - Kiểm tra bằng `npx supabase migration list`: 0023 và 0024 phải có cả cột local lẫn
    remote.
  - Ghi kết quả: `____` (vd "đã apply 29/09 bởi …" / "chưa, lý do …").
- [ ] **B. Trả lời đủ 7 câu ở mục 5.** Điền vào dòng **Trả lời:** dưới từng câu.
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
- ⚠️ **Migration `0023_schedule_blocks` và `0024_shift_reviews` CHƯA apply** lên
  Supabase (`npx supabase migration list`: cột remote trống). Code tự chịu được thiếu
  bảng: lịch giữ trên thiết bị, form đánh giá ẩn. Người viết 0023/0024 chạy
  `npx supabase db push` sau khi review, rồi ghi lại vào handoff.
- 0001–0022 đã apply. Cờ bắt buộc SĐT/CCCD vẫn TẮT. SpeedSMS chưa có token.

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

### P0 — Sửa nhanh, không đổi DB (≈1–2 ngày)
1. **Admin: Back về Tổng quan admin (F7).**
   - `NavBar.tsx`: khi `role === 'admin'` thì logo và mục "Trang chủ" trỏ
     `/admin/dashboard` (hoặc bỏ mục "Trang chủ" ở `AdminNav`).
   - Trang admin mở sang (chi tiết ca, tranh chấp, hồ sơ): link quay lại dùng
     `/admin/dashboard?tab=<tab đang đứng>` (page đã đọc `?tab=&filter=`, dòng ~103).
2. **Admin: thêm bộ lọc ca (F7).**
   - Tab Ca làm, thêm filter `unfilled` (đã đăng, chưa đủ người, dựa
     `getShiftLifecycleState` + số đơn Confirmed < `slots`; tách thêm "sắp bắt đầu mà
     chưa đủ") và `cancelled` (`Cancelled`, `Expired` không ai nhận).
   - Tab Thống kê, thêm 2 ô "Ca chưa khớp", "Ca huỷ" bấm vào nhảy sang filter đó
     (dùng sẵn `jumpToShifts`). Cập nhật union type ở dòng 362.
3. **Đăng ca bớt lặp (F5).**
   - Chụp trang production khi đăng nhập employer và khoanh các khối lặp.
   - Giữ **một** khối tóm tắt tiền (tiền công, phí 10%, tổng giữ cọc) ở cuối form,
     cạnh nút Đăng; bỏ khối kia.
   - Gộp thẻ số dư và `VerificationGateNotice` thành một thanh cảnh báo khi có vấn đề.
   - Popover trợ giúp: tối đa 3 ý.
4. **Bảng giá không lặp (F8).**
   - Viết lại thành 2 cột thẻ: **Người lao động** (Miễn phí, 3 ý) và **Nhà tuyển
     dụng** (10% trên tiền công, 3 ý, 1 ví dụ), rồi FAQ ngắn.
   - Bỏ "Dự kiến VIP/Boost" cho tới khi chốt. Sau này thêm cột "Parttime dài hạn"
     khi F11 chốt giá.
5. **Mở rộng lề (F1).**
   - Tạo `src/components/layout/PageContainer.tsx` với 3 cỡ: `wide` (dashboard,
     danh sách ca, admin: `max-w-[1400px]`), `default` (`max-w-7xl`), `narrow` (form,
     trang đọc: `max-w-3xl`). Padding `px-4 sm:px-6 lg:px-8`.
   - Thay dần các `mx-auto max-w-*` rải rác, ưu tiên admin, dashboard, `/shifts`.
6. **Nhãn lịch (F6, tạm hiểu, cần chủ dự án xác nhận).**
   - Ở lịch employer, ca đã đủ người hiện nhãn chữ "Đã tuyển đủ" rõ ràng
     (`calendar.legend.employer.fullyBooked` đã có).
   - Đổi tên mục điều hướng employer "Lịch" thành "Lịch tuyển dụng".

Gate P0: `tsc`, `lint`, `test:run`, `build`, và kiểm tra trên trình duyệt admin +
employer.

### P1 — Trang chủ, màu, hình, câu chữ (≈3–5 ngày)
1. **Tách trang chủ theo vai trò (F4).**
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
2. **3 màu + khối màu (F2) [QUYẾT phạm vi].**
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
3. **Hình ảnh (F3).**
   - Cần khoảng 8–10 ảnh thật: quán ăn, phục vụ, phụ bếp, kho, sự kiện, sinh viên.
     Ưu tiên ảnh tự chụp ở 10 quán đi khảo sát (xin phép), hoặc ảnh có giấy phép
     miễn phí (Unsplash/Pexels).
   - Đặt ở `public/images/landing/`, dùng `next/image`, có `alt` tiếng Việt, nén WebP
     ≤150KB.
   - Thẻ ca đã có `workplaceImage`; hiện ảnh đó ở danh sách ca.
4. **Bớt chữ + câu dễ hiểu (F3).**
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
3. **Miễn phí theo đợt (F12):** `platform_settings.fee_free_until` (ngày), nghĩa là
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
   **Trả lời:** ____
2. **F2:** "chỉ 3 màu" áp dụng cho cả badge trạng thái ca không? (Nếu có thì phải bỏ
   bất biến "Đang diễn ra = xanh dương".)
   **Trả lời:** ____
3. **F4:** trang chủ `/` mặc định cho người lao động, nhà tuyển dụng ở `/tuyen-dung`,
   đúng không?
   **Trả lời:** ____
4. **F9:** cọc worker bao nhiêu (số cố định hay % tiền công)? Làm đủ mấy ca thì miễn?
   Worker vắng mặt thì tiền cọc về đâu (nhà tuyển dụng / CaLẻ / chia)?
   **Trả lời:** ____
5. **F10:** giảm cọc từ lần 2, hay thưởng nạp ví (nạp 500 được 600)? Tiền thưởng chỉ
   trừ phí dịch vụ, hay trừ được cả tiền công?
   **Trả lời:** ____
6. **F11:** giá giới thiệu parttime: 200.000đ/lượt không bảo hành, và gói bảo hành
   bao nhiêu, bảo hành mấy ngày? Bản đầu có cho nhà tuyển dụng tự đăng không, hay
   chỉ admin đăng hộ?
   **Trả lời:** ____
7. Ảnh cho trang chủ: team tự chụp hay dùng ảnh stock?
   **Trả lời:** ____

## 6. Thứ tự đề xuất
Xong mục ⛔ (A + B) → P0 → P1 → P2 → P3. Mỗi phần
một commit/nhánh riêng. Không push `main` khi chưa được chủ dự án đồng ý.

## 7. Việc ngày mai (29/09) — checklist P0
Nhánh: `fix/p0-feedback` tách từ `main`. Mỗi bước một commit.

- [ ] **Chuẩn bị**
  - `git pull`, `graphify update .`
  - Hoàn thành mục ⛔ ở đầu file (A: 0023/0024; B: đủ 7 câu trả lời). Chưa xong →
    dừng, không làm các bước dưới.
- [ ] **Bước 1: Admin Back** (`NavBar.tsx`)
  - Admin bấm logo hoặc "Trang chủ" thì về `/admin/dashboard`.
  - Link quay lại từ trang con giữ nguyên `?tab=`.
  - Test: đăng nhập admin → mở chi tiết ca → Back → vẫn ở đúng tab admin.
- [ ] **Bước 2: Admin lọc ca** (`admin/dashboard/page.tsx`)
  - Tab Ca làm thêm filter `unfilled` và `cancelled`.
  - Tab Thống kê thêm 2 ô số liệu tương ứng, bấm vào nhảy sang filter.
  - Thêm unit test cho hàm lọc (tách ra `src/domain/` nếu cần, để test được thuần).
- [ ] **Bước 3: Bảng giá** (`pricing/page.tsx`)
  - Viết lại thành 2 thẻ (Người lao động / Nhà tuyển dụng), 1 ví dụ, FAQ.
  - Bỏ mục VIP/Boost "dự kiến".
- [ ] **Bước 4: Đăng ca bớt lặp**
  - Chụp trang production (tài khoản employer), khoanh các khối lặp.
  - Giữ một khối tóm tắt tiền cạnh nút Đăng.
  - Gộp cảnh báo số dư và cảnh báo xác thực thành một thanh.
  - Chạy lại `ShiftForm.test.tsx` và e2e đăng ca.
- [ ] **Bước 5: `PageContainer` + mở rộng lề**
  - Áp cho admin, dashboard worker/employer, `/shifts` trước.
  - Kiểm tra các cỡ 375 / 1280 / 1920px.
- [ ] **Bước 6: Nhãn lịch employer**
  - Ca đủ người hiện "Đã tuyển đủ".
  - Mục điều hướng "Lịch" đổi thành "Lịch tuyển dụng" (nếu chủ dự án xác nhận F6).
- [ ] **Gate:** `npx tsc --noEmit`, `npm run lint`, `npm run test:run` (3 fail
  `handbookContent` có sẵn), `npm run build`; kiểm tra trên trình duyệt.
- [ ] **Kết thúc:**
  - Cập nhật mục 0 và mục 3 của file này (đánh dấu ✅).
  - Push nhánh; chỉ merge `main` khi chủ dự án đồng ý.
