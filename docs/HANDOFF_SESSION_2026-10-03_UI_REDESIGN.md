# HANDOFF — Session 2026-10-03 (làm lại giao diện trang công khai + dashboard + lịch)

> Bàn giao cho người làm tiếp ở máy khác. Đọc trước: `CLAUDE.md`, `HANDOFF.md`,
> `docs/HANDOFF_2026-10-02_VIEC_DINH_LAM.md` (việc đang định làm 02/10).
> Chi tiết thiết kế từng khối: `DESIGN.md` (đã cập nhật theo đợt này).

## Partner cần làm sau khi pull
1. `git pull` nhánh `main`. **`main` = `305c43c`**, đã có toàn bộ việc 03/10 (6 commit,
   bảng mục 1). Không cần nhánh nào khác.
2. **Không có migration, không có Edge Function mới.** Không cần `db push`, không cần deploy
   function. Không thêm dependency (`package.json` không đổi) → không cần `npm install` lại
   nếu máy đã cài từ 02/10. Không thêm biến môi trường.
3. Production `https://cale.io.vn` đã chạy bản `305c43c` và đã kiểm tra (mục 7).
4. **Ảnh gốc của 4 thành viên KHÔNG có trong repo** (cố ý, xem mục 3.4). Repo chỉ có bản
   cắt `public/images/team/*-avatar.jpg`. Cần ảnh gốc thì xin chủ dự án.
5. Thư mục `.impeccable/`, `.claude/agents/impeccable-*`, `.claude/skills/impeccable/` chỉ có
   ở máy chủ dự án (công cụ thiết kế cài cục bộ), không có trong repo, không cần để chạy app.

---

## 0. Quy tắc làm việc (giữ nguyên)
- Chỉ commit / push khi người phụ trách bảo rõ. **Không push `main`** khi chủ dự án chưa đồng ý.
- **Không tự `db push` / deploy Edge Function.** Người có quyền làm. AI agent chỉ chạy thử
  trong transaction rồi rollback (`supabase/dryrun/run-00NN.sh`).
- Việc mới: trình kế hoạch để duyệt trước khi code, mỗi việc một nhánh riêng.
- Theo `CLAUDE.md` §0:
  - `/tdd` cho `src/domain`;
  - `/verify` trước commit;
  - đụng migration / ví / PayOS / auth → `/verify pre-pr` + agent **security-reviewer** TRƯỚC push.
- **Production là tiền thật:** UI production không ghi "mô phỏng" cho nạp / rút / cọc.
  **Không dùng `VNĐ` hay `₫`**, chỉ `đ` / `đồng`.
- Merge vào `main` chỉ khi chủ dự án đồng ý, và chỉ SAU khi đã `db push` migration của nhánh đó.
- Không bịa dữ liệu; câu chữ phải đúng ở cả bản demo lẫn bản thật. Chữ hiển thị không dùng
  dấu "—".
- **Trang landing không hứa "khiếu nại / tranh chấp"**; ghi "liên hệ đội hỗ trợ CaLẻ"
  (spec e2e 32 kiểm tra).
- Dùng git worktree thì xoá junction `node_modules` TRƯỚC khi xoá bản sao.

---

## 1. Các commit trong ngày (đều đã ở `main`)

| Commit | Nội dung | DB |
|---|---|---|
| `b4588b2` | Trang chủ giới thiệu dự án: "Vì sao CaLẻ ra đời?", vòng loại việc (`JobRing`), biên nhận tự diễn + sơ đồ dòng tiền, "CaLẻ làm được gì?", ảnh chia sẻ link. E2E 31–34. | — |
| `95ed3ab` | `/for-workers`, `/for-employers` làm lại: minh hoạ tìm ca → ứng tuyển, "Thử đăng một ca" 3 bước, sau ca + đánh giá. Header khách gọn. E2E 35, 36. | — |
| `45dea0d` | Lịch người lao động / nhà tuyển dụng làm lại: 4 cụm giờ, thẻ tóm tắt tuần, chế độ "Danh sách", hộp chi tiết `EventPeek`. E2E 37. | — |
| `18d8045` | Trang thông tin, đăng nhập / đăng ký, cẩm nang, hướng dẫn; dashboard hai vai trò cùng khung `DashboardFrame`; chuông thông báo. E2E 38–40. | — |
| `1b82948` | Ô ví dashboard không phình theo danh sách lệnh rút (danh sách vào hộp lịch sử). | — |
| `305c43c` | **Đợt chính của tài liệu này** (mục 2–5): da công khai mới, gộp 11 trang vào trang vai trò / trang chủ / hỗ trợ, pháp lý làm lại, header dính, hiện dần khi cuộn, sửa hash của Next 16. E2E 41–45. | — |

Kiểm tra ở `305c43c` (03/10):
- tsc 0;
- lint 0 lỗi (5 cảnh báo có sẵn);
- `test:run` 1037/1037 (97 file);
- build OK: **25 trang** (+ `_not-found`), không còn 33 như `CLAUDE.md` ghi;
- e2e **362/362**.

---

## 2. Da trang công khai "giấy trắng, cam rõ"

Chủ dự án chọn hướng A. Lớp `.public-skin` trong `src/app/globals.css`, gắn tự động qua
`isPublicSkinPath` (`src/lib/publicSkin.ts`, có test) lên `ToneScroll`, `AuthShell`, header
khi ở trang công khai, footer. **Dashboard, lịch, trang ca, quản trị KHÔNG đổi.**

| | Sáng | Tối |
|---|---|---|
| Nền chính (`--tone-cream`) | `#FBF9F6` | `#141416` |
| Nền giấy (`--tone-paper`) | `#F2EEE8` | `#19191C` |
| Thẻ (`--color-white`) | `#FFFFFF` | `#24242A` |
| Cam (`--brand`) | `#FF8A3D` | bảng tối gốc |
| Viền mảnh `ring-black/5…`, `border-black/5…`, `bg-black/5` | giữ | đổi thành trắng 8–9% |

- Bản tối gốc để nền giấy = màu thẻ → thẻ chìm vào nền. Đã tách 3 lớp (chủ dự án báo 03/10).
- **Header dính khi cuộn:** `html, body` đổi `overflow-x: hidden` → thêm `overflow-x: clip`
  (giữ `hidden` làm dự phòng). `hidden` trên cả html lẫn body biến body thành khung cuộn
  riêng nên `sticky top-0` không dính.
- `.public-skin [id] { scroll-margin-top: 7rem }` (header dính cao 97px ở máy tính).

---

## 3. Gộp trang và nội dung mới

### 3.1 Bản đồ đường dẫn cũ (307 trong `next.config.ts`, `permanent: false`)
| Cũ (đã xoá) | Mới |
|---|---|
| `/about` | `/#home-about` |
| `/how-it-works` | `/#home-how` |
| `/pricing` | `/for-employers#employer-pricing` |
| `/safety` | `/support#support-safety` |
| `/worker/schedule-guide` | `/for-workers#worker-schedule` |
| `/worker/cancellation-policy` | `/for-workers#worker-cancel` |
| `/worker/reputation-guide` | `/for-workers#worker-reputation` |
| `/employer/post-shift-guide` | `/for-employers#employer-post` |
| `/employer/applicants-guide` | `/for-employers#employer-applicants` |
| `/employer/payments` | `/for-employers#employer-payments` |
| `/employer/reviews` | `/for-employers#employer-reviews` |

`src/components/layout/InfoPage.tsx` đã xoá (không còn trang dùng).

### 3.2 Trang chủ `/`
Thứ tự khối: màn đầu → **Về CaLẻ** → Vì sao CaLẻ ra đời? → Loại việc (`JobRing`) →
**Bốn bước của một ca** → Tiền của một ca đi về đâu? → CaLẻ làm được gì? → dải kết.
- `HomeAbout.tsx` (`#home-about`), 3 hàng trải ngang:
  1. giới thiệu + lưới 4 dữ kiện (Đơn vị phát triển · Đội ngũ {n} thành viên, đếm từ
     `teamData` · Làm việc tại Hà Nội · Giai đoạn) + dòng chấm màu về phiên bản;
  2. thanh trượt "Đội ngũ" (`about/TeamCarousel.tsx`, mục 3.4);
  3. đối tác tiềm năng (`about/PartnersSection.tsx`): chip viền nét đứt + MỘT chú thích;
     nhãn "định hướng" từng nhóm ở dạng `sr-only` (giữ yêu cầu R6.2, test Property 7).
- "Bốn bước của một ca" (`LandingSteps id="home-how"`) chuyển từ `/how-it-works`.

### 3.3 Trang vai trò
- `/for-workers`: 3 ảnh lợi ích lên ngay sau màn đầu; khối **"Ca đang tuyển"**
  (`OpenShiftsSection.tsx`, 6 ca thật, ô tìm → `/shifts?q=`); các khối gộp từ trang hướng
  dẫn kèm minh hoạ trong `GuidePreviews.tsx` (lịch, huỷ ca, điểm uy tín).
- `/for-employers`: "Thử đăng một ca" có khung cố định chiều cao (bước 1 cuộn trong khung);
  duyệt ứng viên, quản lý ca (minh hoạ); `EmployerPaymentsSection.tsx`;
  **`EmployerPricingSection.tsx`** (`#employer-pricing`, thay `/pricing`).
- `/shifts`: cùng da công khai, nhận `?q=`.

### 3.4 Đội ngũ (dữ liệu thật, chủ dự án gửi)
- `src/components/about/teamData.ts`: tên + vai trò của 4 người, `photo` trỏ
  `/images/team/<tên>-avatar.jpg`. **Chỉ lấy tên và vị trí**, không đưa mã số sinh viên hay mô
  tả công việc lên trang (theo yêu cầu).
- Ảnh: bản cắt vuông 400×400 quanh mặt từ ảnh gốc; ảnh gốc không commit vì nằm trong
  `public/` sẽ ai cũng tải được. Hiện trong vòng tròn 96px, `alt=""` (tên ở ngay dưới).
- Thay ảnh mà giữ tên file: Next lưu sẵn ảnh đã tối ưu theo đường dẫn → xoá
  `.next*/dev/cache/images` ở dev; trên production nên đổi tên file.
- Thanh trượt: vòng lặp vô hạn (3 bộ thẻ, hai bộ ngoài `aria-hidden`), tự chạy 4 giây, hàng
  nút ‹ · dừng/chạy · › căn giữa DƯỚI thanh. Tạm nghỉ khi: chuột trên các thẻ, focus bằng
  bàn phím (`:focus-visible`), 6 giây sau khi người dùng tự cuộn / bấm, khối khuất màn hình,
  tab ẩn. Giảm chuyển động → mặc định không chạy.

### 3.5 Hỗ trợ và pháp lý
- `/support`: khối **"Lưu ý an toàn"** (`#support-safety`, thay `/safety`) + minh hoạ
  `SafetyPreview` (hồ sơ, ví, tình huống "trả tiền mặt" cần từ chối).
- `/terms`, `/privacy`, `/disputes`: khung chung `components/landing/LegalArticle.tsx` +
  `components/legal/` (`legalChrome.tsx`, `LegalScrollUI.tsx`): thanh chuyển 3 tài liệu,
  mục lục sáng theo cuộn, vạch tiến độ đọc, số mục lớn, thẻ / dòng thời gian / bảng, thẻ
  "Còn thắc mắc?" + 2 thẻ "Đọc tiếp". **Câu pháp lý giữ nguyên văn**; không có ô tóm tắt
  (chủ dự án bỏ).
- **Câu riêng cho bản thật** (chủ dự án duyệt nguyên văn, xác nhận có bật Google Analytics):
  Điều khoản và Bảo mật ghi "giai đoạn thử nghiệm giới hạn (Beta)"; Bảo mật nêu Supabase,
  kho ảnh giấy tờ riêng tư, PayOS, SpeedSMS, đăng nhập Google, Google Analytics, "mỗi người chỉ
  đọc được dữ liệu của mình và phần cần cho ca làm chung". Bản demo giữ câu cũ.
  Test chặn: `src/__tests__/legalLiveWording.test.tsx`.

### 3.6 Header, menu, footer
- Khách: "Người lao động ▾" / "Nhà tuyển dụng ▾" là danh sách dọc dẫn tới từng khối của trang
  vai trò; "Hướng dẫn & hỗ trợ ▾" còn FAQ, Xử lý tranh chấp, Hướng dẫn sử dụng, Cẩm nang,
  Liên hệ hỗ trợ.
- **Sửa menu phải sửa HAI chỗ:** `WORKER_GROUP_PUBLIC` / `EMPLOYER_GROUP_PUBLIC` trong
  `src/components/layout/NavBar.tsx` (máy tính) và `PUBLIC_SECTIONS` trong
  `src/components/layout/MobileNav.tsx` (điện thoại).
- Chạm menu trên máy tính bảng ≥1280px: bỏ qua lần click trong 400ms sau khi mở bằng
  hover/focus (trước đó mở rồi đóng ngay).
- Footer (`Footer.tsx`, mảng `COLUMNS`): logo · CaLẻ · Người lao động · Nhà tuyển dụng · Cần
  hỗ trợ?. Email / hotline viết cứng ở `Footer.tsx`, `src/app/support/page.tsx`,
  `components/legal/legalChrome.tsx`: đổi một chỗ thì đổi cả ba.

---

## 4. Hiệu ứng
- **Hiện dần khi cuộn** (`components/landing/useScrollReveal.ts`, gắn trong `ToneScroll` →
  mọi trang công khai tự có). Chỉ phần tử nằm dưới màn hình lúc tải: `h2`, đoạn sau `h2`,
  mục danh sách, `figure`, `img`. Trượt lên 16px + rõ dần, nối nhau 70ms. Bỏ qua khối có hiệu
  ứng riêng (`[data-motion]`, `m-*`, `hero-in`, `motion-*`, ruột minh hoạ `aria-hidden`),
  menu, `details` đóng, thanh trượt ngang. Giảm chuyển động → không chạy.
- **Tắt hiệu ứng cho một khối:** thêm `data-reveal-skip` vào phần tử gốc (đang dùng cho
  `JobRing`, chủ dự án yêu cầu).
- `MotionGroup` có thêm kiểm tra khi cuộn làm dự phòng.

---

## 5. Lỗi kỹ thuật đáng nhớ (đã sửa)
1. **Hash của Next 16.2:** điều hướng phía client tới `/trang#khối` làm `canonicalUrl` lưu kèm
   hash → lần sau URL thành `/for-workers#a#b` hoặc dính hash cũ; bấm lại đúng khối đang mở
   thì về đầu trang. **`components/layout/HashLinkHandler.tsx`** (gắn trong layout) chặn mọi
   click link nội bộ `/trang#khối`: cùng trang → cuộn + `pushState`; khác trang →
   `router.push` KHÔNG kèm hash, vẽ xong mới cuộn + `replaceState`. Hàm thuần
   `src/lib/hashNav.ts` (có test). Link chỉ có `#khối` giữ hành vi gốc.
2. **IntersectionObserver trong iframe khác nguồn:** `rootMargin` bị bỏ qua → khối hiệu ứng
   nằm trống mãi, thanh trượt không tự chạy. Hiệu ứng mới và thanh trượt đo vị trí bằng
   `getBoundingClientRect` khi cuộn / mỗi nhịp.
3. **Hiện dần + nhảy tới khối:** tiêu đề đích đang "chờ hiện" (dịch 16px) làm trang cuộn lệch.
   `HashLinkHandler` cho mục đích hiện ngay trước khi cuộn.
4. Mục pháp lý có `py-10` → lề cuộn riêng 4.5rem (mục đầu 7rem) để tiêu đề dừng ngay dưới
   header.

---

## 6. Kiểm tra
```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build
npm run test:e2e        # tự mở dev server riêng ở cổng 3100 (chế độ local)
```
Đang chạy sẵn dev server `cale-dev-local` (cổng 3200, `.next-local`, xem commit `7e39919`)
thì dùng lại nó cho nhanh:
```bash
E2E_PORT=3200 npx playwright test --workers=3
```

Spec mới / sửa của đợt `305c43c`:
| Spec | Nội dung |
|---|---|
| `41-guide-pages-merged` | menu thả theo vai trò, ngăn kéo điện thoại, footer (lg / md / 375), chuyển hướng 7 trang hướng dẫn, khung cố định "Thử đăng một ca" |
| `42-worker-shifts-block` | khối "Ca đang tuyển", tìm ca |
| `43-info-pages-merged-home` | 4 trang gộp, "Về CaLẻ", thanh trượt đội ngũ (vòng lặp, tự chạy, dừng), khối phí, an toàn, link có hash, header dính, chạm máy tính bảng |
| `44-legal-pages` | khung 3 trang pháp lý |
| `45-scroll-reveal` | hiện dần khi cuộn + giảm chuyển động |
| 29, 32, 35, 36, 38 | sửa theo giao diện mới |

Unit mới: `publicSkin.test.ts`, `hashNav.test.ts`, `legalLiveWording.test.tsx`.

**Thêm chữ hiển thị mới:** mọi câu trong `tx('…')` cần bản tiếng Anh (thường thêm vào
`src/i18n/en-roles.ts`); file mới có chữ thì thêm vào danh sách quét trong
`src/__tests__/i18nEnglish.test.ts`.

---

## 7. Đã kiểm trên production sau deploy (03/10, chỉ đọc)
- 11 đường dẫn cũ → 307 đúng đích; `/pricing` mở ra tiêu đề "Phí dịch vụ" ngay dưới header.
- 11 trang công khai trả 200; 4 ảnh avatar 200, ảnh gốc 404 (đúng, không commit).
- Bảo mật / Điều khoản: có Supabase, PayOS, SpeedSMS, Google Analytics, "Beta"; không còn
  "localStorage", "lưu cục bộ". Trang chủ, trang nhà tuyển dụng: không còn chữ "mô phỏng".
- Header dính sau khi cuộn; footer đủ 4 cột; 375px không tràn ngang; chế độ tối rõ khối;
  không lỗi console.

---

## 8. Còn mở
1. **Cần chủ dự án quyết:** bản thật trên `/for-workers` (quy định huỷ ca, câu hỏi về cọc)
   vẫn ghi "bạn khiếu nại được trong 72 giờ" (`src/app/for-workers/page.tsx` ~dòng 389, 495).
   Landing không nên hứa khiếu nại → giữ hay đổi sang "liên hệ đội hỗ trợ CaLẻ".
2. **Đề xuất, chưa làm:** gọn `/user-guide`: bỏ phần "5 bước" trùng trang vai trò, giữ phần
   giải thích dashboard (nút trợ giúp trong dashboard trỏ vào đây).
3. **Tài liệu:** `HANDOFF.md` chưa ghi đợt này. `CLAUDE.md` §3–4 còn số liệu cũ (33 route,
   "không có git", danh sách route cũ). Chỉ sửa khi chủ dự án đồng ý.
4. **Test chập chờn khi dev server nặng** (chạy riêng thì qua):
   - `e2e/20` (đồng hồ 1600ms so với chờ 4000ms);
   - `e2e/42` ô tìm "pha chế": click trước khi form gắn xong handler → trang tải lại;
   - `e2e/43` ~dòng 839 dùng `locator('footer')`, có thể dính footer của lớp báo lỗi Next
     khi dev (các spec footer mới dùng `getByRole('contentinfo')`).
5. Việc 02/10 chưa xong vẫn theo `docs/HANDOFF_2026-10-02_VIEC_DINH_LAM.md` (đọc lại
   `docs/I18N_2D_EN_MONEY_REVIEW.md`: 181 câu tiền / cọc / rút cần người đọc lại bản tiếng Anh).
