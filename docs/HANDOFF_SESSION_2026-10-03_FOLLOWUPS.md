# HANDOFF: Session 2026-10-03, phần tiếp (bỏ hứa khiếu nại, màu app giống landing, CLAUDE.md)

> Bàn giao cho người làm tiếp ở máy khác. Đây là phần nối của
> `docs/HANDOFF_SESSION_2026-10-03_UI_REDESIGN.md` (đọc file đó trước nếu chưa đọc).
> Đọc thêm: `CLAUDE.md` (vừa cập nhật, mục 3 dưới đây), `DESIGN.md`.

## Partner cần làm sau khi pull
1. `git pull` nhánh `main`. `main` đã có cả 3 commit của phần này (bảng mục 1) và file này.
   Không cần nhánh nào khác.
2. **Không có migration, không có Edge Function mới, không thêm dependency, không thêm biến
   môi trường.** Không cần `db push`, không cần deploy function, không cần `npm install` lại.
3. Production `https://cale.io.vn` đã chạy bản mới và đã kiểm tra (mục 5).
4. Có code mới đang dở trên máy, tự viết màu / nền riêng: đọc mục 2 trước khi merge, vì cả app
   giờ mang lớp `.public-skin`.

## 0. Quy tắc làm việc
Không đổi so với mục 0 của file bàn giao 03/10. Từ nay các quy tắc chính (nhánh, commit,
merge, `db push`, tiền thật) cũng đã ghi trong `CLAUDE.md` §4 "Lưu ý môi trường".

---

## 1. Các commit (đều đã ở `main`, nối thẳng, không có commit merge)
| Commit | Nhánh | Nội dung |
|---|---|---|
| `f9013be` | `fix/worker-landing-no-complaint-promise` | `/for-workers` bản thật: bỏ "bạn khiếu nại được trong 72 giờ", thay bằng "liên hệ đội hỗ trợ CaLẻ" |
| `06bdd28` | `style/app-background-ivory` | Nền và màu các khối của app giống trang công khai |
| `1aba07c` | `docs/claude-md-refresh` | `CLAUDE.md` cập nhật theo hiện trạng |

---

## 2. Màu app giống trang công khai (`06bdd28`)
Chủ dự án yêu cầu: nền app (dashboard, lịch, hồ sơ…) và màu các khối giống landing, "cho đỡ
bị đè màu" (trước đó app nền đào `#FFF4E9`, các ô cam nhạt phủ đào).

**Cách làm:** gắn lớp `.public-skin` lên `<body>` (`src/app/layout.tsx`). Mọi trang, hộp thoại,
toast dùng chung bộ màu đã có của trang công khai (khối `.public-skin` trong `globals.css`):
- Giao diện sáng: nền trắng ngà `#FBF9F6`; cam `#FF8A3D`; nền cam nhạt trung tính
  (`orange-50` `#FFF5EE` … `200` `#FFD9BF`); mực `#1E1E22`.
- Giao diện tối: nền `#141416` < giấy `#19191c` < thẻ (`--color-white`) `#24242a`; viền
  `ring-black/5|10`, `border-black/5|10`, `bg-black/5` đổi thành trắng mờ. Nút cam ở tối vẫn
  `#FF9A5F` (bảng tối cũ), không đổi.
- `:root --background` đổi `#FFF4E9` → `#FBF9F6` để vùng ngoài `<body>` (kéo quá đầu / cuối
  trang) và các biến tính sẵn ở `:root` (`--brand-tint`…) cũng khớp. 4 chỗ viết cứng màu kem
  (`.section-wave`, `.cta-band`, `.info-page-hero`, quầng `.info-step-badge`) đổi theo.
- Bỏ `src/lib/publicSkin.ts` (`isPublicSkinPath`) và test của nó: header không còn tự gắn lớp
  theo đường dẫn. `ToneScroll`, `AuthSidePanel`, `Footer`, `/shifts` vẫn tự gắn `.public-skin`
  (thừa nhưng vô hại, để nguyên).

**Lưu ý khi viết code mới:**
- Đừng thêm màu nền đào / kem riêng cho trang app; dùng token (`bg-background`, `bg-white`,
  `bg-orange-50`…), da tự đổi cả sáng lẫn tối.
- `.public-skin [id] { scroll-margin-top: 7rem }` giờ áp cho MỌI trang (vì header dính cao 97px).
  Khối cần lề khác thì tự đặt `scroll-mt-…!` như trang pháp lý.
- Biến khai bằng `var()` ở `:root` được tính ở `:root`, không theo da. Thêm biến dẫn xuất mới
  từ `--brand` / `--color-orange-*` thì khai lại trong khối `.public-skin` hoặc dùng thẳng token.
- `DESIGN.md` mục "Da trang công khai" và bảng màu đã cập nhật.

---

## 3. `/for-workers`: bỏ hứa khiếu nại (`f9013be`)
Chủ dự án chốt mục 8.1 của file 03/10. Hai câu chỉ hiện ở bản thật (`NEXT_PUBLIC_DATA_MODE=supabase`):
- Thẻ "Không đến mà không báo": "…cọc chuyển cho nhà tuyển dụng. Nếu thấy ghi nhận chưa đúng,
  bạn liên hệ đội hỗ trợ CaLẻ."
- FAQ "Ứng tuyển có phải đặt cọc không?": "…Vắng mặt không báo thì cọc chuyển cho nhà tuyển
  dụng; nếu thấy ghi nhận chưa đúng, bạn liên hệ đội hỗ trợ CaLẻ. …"
- Bản tiếng Anh sửa theo (`en-pages.ts`, `en-landing.ts`). Bỏ hẳn mốc "72 giờ" ở landing: ghi
  kèm dễ hiểu thành "liên hệ hỗ trợ trong 72 giờ là giữ được cọc".
- **Giữ nguyên** (không phải landing): `/terms` (mô tả đúng cơ chế cọc 72 giờ trên server) và
  hộp cảnh báo cọc trong dashboard người lao động (tính năng thật).
- Test mới `src/__tests__/workerLandingLiveWording.test.tsx`: dựng `/for-workers` ở chế độ
  supabase, kiểm tra không có "khiếu nại" và có câu mới. Muốn dựng trang server có
  `RoleSwitch` (component server async) trong jsdom thì mock `RoleSwitch` + `next/navigation`
  như test này.

---

## 4. `CLAUDE.md` (`1aba07c`, chủ dự án đồng ý sửa)
- §1: hai chế độ dữ liệu (demo `localStorage` mô phỏng; production Supabase + PayOS tiền thật),
  trỏ `src/data/capabilities.ts`.
- §2: dòng Backend (Supabase, 32 migration, 5 Edge Function, PayOS), dependencies đúng, e2e tự
  mở server ở cổng `E2E_PORT` (mặc định 3100).
- §3: 25 route, 16 store, ~40 module domain, 43 spec e2e, `data/repos`, `supabase/`.
- §4: build 25 route + `_not-found`; có git và các quy tắc nhánh / merge / `db push`; bỏ câu
  "hôm nay là 2026-09-15".
- §6: bảng màu chung (mục 2). §7: trỏ tới các file bàn giao theo phiên.
- `HANDOFF.md` gốc **chưa** cập nhật (mục 6).

---

## 5. Kiểm tra
- `/verify` trước mỗi commit code: tsc 0 lỗi, lint 0 lỗi (5 cảnh báo cũ), build OK. Unit trên
  `main` sau khi gộp: **1036/1036** (97 file; trước đợt này 1037, bỏ 2 test của
  `publicSkin.test.ts`, thêm 1 test `/for-workers`).
- e2e đầy đủ (`E2E_PORT=3200 npx playwright test --workers=3`): **361/362**. Ca hỏng:
  `e2e/34-landing-failure-cases.spec.ts:66` (biên nhận trang chủ, quá 30 giây ở bước "Đã hoàn
  thành"). Chạy lại trên `main` CHƯA có thay đổi màu cũng hỏng y hệt → không do đợt này; lần
  chạy đầy đủ hôm trước thì qua → nghi chập chờn (mục 6).
- Chụp ảnh `/worker/dashboard`, `/worker/schedule`, `/worker/profile` (sáng + tối) ở bản chạy thử:
  nền đúng, thẻ trắng nổi, các ô cam nhạt hết phủ đào.
- **Production (chỉ đọc, sau deploy):** `/for-workers` không còn "khiếu nại" / "72 giờ", có cả
  2 câu mới. `/`, `/for-workers`, `/login`, `/shifts`, `/terms`: `<body>` có `.public-skin`, nền
  `rgb(251,249,246)` (sáng) / `rgb(20,20,22)` (tối), cam `#ff8a3d` ở sáng, không cuộn ngang,
  không lỗi console. Trang dashboard chuyển về `/login` khi chưa đăng nhập; **bên trong
  dashboard trên production chưa ai xem bằng mắt** (cần tài khoản thật).

---

## 6. Còn mở
1. **Xem bằng mắt** dashboard người lao động / nhà tuyển dụng / quản trị trên production sau
   khi đăng nhập (sáng + tối). Khối nào còn lệch màu: chụp gửi chủ dự án.
2. **Đề xuất, chưa làm:** gọn `/user-guide`: bỏ phần "5 bước" trùng trang vai trò, giữ phần
   giải thích dashboard.
3. **Tài liệu:** `HANDOFF.md` gốc chưa ghi các đợt từ khi có production. Chỉ sửa khi chủ dự án
   đồng ý.
4. **Test chập chờn:** `e2e/34:66` (mới, mục 5), `e2e/20`, `e2e/42` ô tìm "pha chế", `e2e/43`
   ~dòng 839 `locator('footer')` (chi tiết ở mục 8.4 file 03/10).
5. Việc 02/10 chưa xong: `docs/HANDOFF_2026-10-02_VIEC_DINH_LAM.md` (đọc lại
   `docs/I18N_2D_EN_MONEY_REVIEW.md`: 181 câu tiền / cọc / rút bản tiếng Anh).
