# Kế hoạch Triển khai: Frontend Visual Polish

## Tổng quan (Overview)

Kế hoạch này chuyển Tài liệu Thiết kế thành chuỗi bước code tăng dần cho một đợt **đánh bóng
thị giác** (chỉ lớp trình bày). Thứ tự bám đúng chiến lược của thiết kế: **(1) khoá lớp token
runtime** làm nguồn sự thật duy nhất → **(2) hoà giải drift nội bộ trong `globals.css`** →
**(3) đánh bóng/siết các UI_Primitive** để tiêu thụ token → **(4) hoà giải tài liệu**
(`DESIGN.md` + `.impeccable/design.json`) khớp runtime → **(5) quét từng màn theo ưu tiên lưu
lượng** → **(6) kiểm chứng tự động theo từng thuộc tính**.

Mỗi bước xây trên bước trước và kết thúc bằng việc "nối dây" (wiring) để không còn mã treo
hay mã mồ côi. Mọi tác vụ chỉ gồm hoạt động viết/sửa/kiểm thử code trong repo.

### Ràng buộc cứng xuyên suốt (Yêu cầu 12 + ranh giới trình bày/logic của thiết kế)

- **CHỈ lớp trình bày:** `className`/Tailwind, `src/app/globals.css`, `DESIGN.md`,
  `.impeccable/design.json`, và các thay đổi JSX **thuần tạo kiểu** (wrapper/container không
  đổi hành vi, không đổi danh tính trợ năng).
- **BỊ CẤM (ngoài phạm vi):** `src/stores` (Zustand), `src/domain`, `src/data` (mock/seed),
  logic nghiệp vụ trong `src/lib`, **nội dung** chuỗi i18n, `src/types`, event handler,
  hợp đồng props/dữ liệu, đích điều hướng/route, logic finance/reputation/attendance/
  notification, backend/Supabase, AI. **KHÔNG** sửa lỗi chức năng (hoãn sang đợt sau).
- **Guardrail detector (false-positive đã ghi nhận):** cặp primary CTA là **nền `#FF9A5F` +
  chữ tối `#37373B`**. Nếu công cụ dò tương phản cảnh báo "chữ tối trên cam sáng", đó là
  false-positive đã biết; **KHÔNG** hoàn nguyên về chữ trắng, **KHÔNG** quay lại `#f97316`,
  **KHÔNG** dùng lại gradient cam cũ cho nút primary. Không tác vụ nào được tái lập chữ
  trắng-trên-cam.

### Công cụ & quy ước kiểm thử (đã có trong repo)

- Unit/PBT: **vitest** — chạy MỘT LẦN bằng `npm run test:run` (không dùng watch). PBT dùng
  **fast-check `^4.8.0`** (đã cài — KHÔNG cài lại). Mỗi property test chạy `numRuns: 100` và
  gắn thẻ `// Feature: frontend-visual-polish, Property {số}: {nội dung}`.
- e2e: **Playwright** — `npm run test:e2e`, thư mục `e2e/`. **BỔ SUNG** file mới, KHÔNG xoá/
  sửa/skip test cũ (Yêu cầu 13.3).
- Vị trí test theo quy ước: `src/__tests__/` (unit), `src/__tests__/properties/` (PBT),
  `src/__tests__/generators/` (generator), `e2e/` (Playwright).
- Cổng chất lượng: `npm run build`, `npm run lint`, `npm run test:run`, `npm run test:e2e`.

## Tasks

- [x] 1. Khoá lớp token runtime làm nguồn sự thật duy nhất
  - [x] 1.1 Xác minh & khoá canonical palette trong `src/app/globals.css`
    - Kiểm tra khối `:root` + `@theme` khai báo đúng và duy nhất: `--background #FFF4E9`,
      `--foreground #37373B`, `--brand #FF9A5F`, `--brand-soft #FFD5AE`, ramp cam remap
      (`orange-50 #ffead5` … `orange-500 #ff9a5f`, đuôi 600–900 giữ gần mặc định),
      `--color-gray-900`/`--color-slate-900 = #37373b`.
    - Bảo đảm brand-palette hex chỉ được khai báo TRONG khối token chuẩn này (không định
      nghĩa lại rời rạc nơi khác). Bổ sung comment "anchor" ghi rõ đây là nguồn chuẩn; không
      đổi hành vi, không đổi giá trị đang đạt WCAG AA.
    - Ghi guardrail vào comment: primary CTA = nền `#FF9A5F` + chữ tối `#37373B`, không bao
      giờ chữ trắng.
    - _Requirements: 1.1, 1.3, 1.4, 1.6_

  - [ ]* 1.2 Viết property test tương phản token (fast-check, unit)
    - **Property 6: Primary-CTA and token contrast meets WCAG AA**
    - **Validates: Requirements 1.6, 10.1, 10.2, 13.5**
    - Tạo `src/__tests__/properties/tokenContrast.property.test.ts`; helper tính tỷ lệ tương
      phản WCAG 2.1 đặt trong test (hoặc `src/__tests__/generators/`), KHÔNG thêm vào
      `src/lib`. Generator `fc.constantFrom(...)` trên tập cặp token thiết yếu hữu hạn (gồm
      cặp primary CTA `#37373B` trên `#FF9A5F` và 5 cặp trạng thái info/warning/success/
      danger/neutral).
    - Assert: cặp chữ thân/UI ≥ 4.5:1; cặp chữ lớn/đồ hoạ phi văn bản ≥ 3:1; khẳng định rõ
      `#37373B` trên `#FF9A5F` ≥ 4.5:1 (cấu hình được chấp nhận — guardrail, không phải lỗi).
    - Thẻ: `// Feature: frontend-visual-polish, Property 6: Primary-CTA and token contrast meets WCAG AA`; `numRuns: 100`.

- [x] 2. Hoà giải drift nội bộ trong `globals.css`
  - [x] 2.1 Hội tụ các lớp trang trí & InfoPage off-token về palette runtime
    - `.bg-route-soft`: đổi `rgba(251,146,60,…)` / `rgba(249,115,22,…)` → `rgba(255,154,95,…)`.
    - `.info-page-hero`: đổi `#fff7ed` → `#FFF4E9`/nền trắng; `rgba(251,146,60,…)` →
      `rgba(255,154,95,…)`.
    - `.info-section-card`: viền trái `rgba(251,146,60,0.25)` → `rgba(255,154,95,…)`; `> h2`
      `color: #111827` → `#37373B`.
    - `.info-step-card`: bóng `rgba(251,146,60,…)` → `rgba(255,154,95,…)`; `> h3`
      `color: #111827` → `#37373B`.
    - `.info-step-badge`: gradient `#fb923c → #f97316` → gradient on-palette (cam runtime).
      Đây là **badge số trang trí**, KHÔNG phải primary CTA — được phép giữ chữ trắng nếu nền
      đủ đậm đạt tương phản; quy tắc "chữ tối trên cam" chỉ áp cho primary CTA.
    - Chỉ đổi giá trị màu (thuộc tính trình bày); không đổi bố cục/hành vi.
    - _Requirements: 1.5, 1.1, 2.1_

- [x] 3. Đánh bóng & siết hợp đồng token cho UI_Primitive (`src/components/ui/*`, `src/components/shift/*`)
  - [x] 3.1 Siết `Button` + quy tắc primary CTA + tiêu điểm
    - `src/components/ui/Button.tsx`: primary = `bg-orange-500 text-gray-900` (solid `#FF9A5F`
      + mực `#37373B`, KHÔNG gradient, KHÔNG chữ trắng — guardrail); secondary/ghost/danger
      dùng token; focus ring `focus-visible:ring-orange-400 ring-offset-2` đồng nhất mọi biến
      thể; vùng chạm `min-h-[44px]`. Thay mọi hex rời rạc bằng tiện ích token cùng vai trò.
    - Giữ nguyên hợp đồng props/sự kiện; chỉ đổi diện mạo.
    - _Requirements: 2.1, 10.3, 10.4, 9.1, 1.6_

  - [x] 3.2 Siết `Card` + `StatCard` cho độ nâng/bóng
    - `Card.tsx`, `StatCard.tsx`: `shadow-card` ở trạng thái nghỉ; chỉ khi `clickable`/
      `onClick` mới thêm `motion-lift` + `hover:shadow-card-hover` + nâng `translateY(-2px)`;
      bề mặt tĩnh giữ nguyên bóng nghỉ, không đổi sang hover-shadow.
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.3 Siết `Badge` cho cặp màu trạng thái ngữ nghĩa
    - `Badge.tsx`: sáu tông (info/warning/success/danger/neutral/purple) là cặp nền + mực +
      ring lấy từ token; bảo đảm nhãn chữ luôn hiện diện (không truyền đạt chỉ bằng màu).
    - _Requirements: 1.2, 3.3, 3.4_

  - [x] 3.4 Siết `Modal` cho bóng độ nâng
    - `Modal.tsx`: panel dùng `shadow-modal`; backdrop `slate-900/60` KHÔNG blur và KHÔNG áp
      bóng nâng; giữ nguyên A11y (ESC, focus trap, khoá scroll). Bóng luôn hai lớp, alpha
      ≤ 0.12.
    - _Requirements: 4.4, 4.5_

  - [x] 3.5 Siết các trường nhập (Input, Select, Textarea, DateFieldVN, TimeFieldVN)
    - Nền trắng, viền `gray-300`, bo 8px, cao ≥ 44px, focus ring cam; biến thể error dùng tông
      danger + giữ `role="alert"`/`aria-invalid` sẵn có. KHÔNG đổi hợp đồng props/validate —
      chỉ diện mạo + trạng thái thị giác phân biệt (default/hover/focus/active/disabled).
    - _Requirements: 10.3, 10.4, 10.6, 9.1_

  - [x] 3.6 Siết `EmptyState` thành cấu trúc rỗng dùng chung
    - `EmptyState.tsx`: icon trong chip gradient ấm + tiêu đề + mô tả, viền nét đứt, nền trung
      tính — cùng một cấu trúc cho mọi vùng rỗng, token hoá màu/bo/khoảng cách.
    - _Requirements: 8.1, 8.4_

  - [x] 3.7 Siết `Toast` + `Reveal` + chỉ báo tải (tôn trọng reduced-motion)
    - Xác nhận `Toast.tsx`/`Reveal.tsx` tiêu thụ token và tôn trọng `prefers-reduced-motion`
      (entrance/reveal về end-state ngay, chỉ báo tải tĩnh); chuẩn hoá spinner/skeleton dùng
      màu/bo/khoảng cách token; chuyển tiếp lift/press ≤ 200ms.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.5_

  - [x] 3.8 Siết `ShiftLifecycleBadge` + các component shift để tiêu thụ mapping chuẩn
    - `ShiftLifecycleBadge.tsx` và các component `src/components/shift/*` (ShiftCard,
      EscrowStatusBadge, …): render nhãn + tông qua `getShiftStatusBadge` (đọc từ
      `@/domain/shiftLifecycleState`). **KHÔNG sửa `src/domain`** — chỉ tiêu thụ. Token hoá
      mọi hex rời rạc.
    - _Requirements: 3.1, 3.2, 3.3, 11.2_

  - [ ]* 3.9 Viết property test cho Shift Lifecycle Badge (fast-check, unit)
    - **Property 2: Shift Lifecycle Badge single source of truth**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 11.2**
    - Tạo `src/__tests__/properties/shiftLifecycleBadge.property.test.ts`; import
      `getShiftStatusBadge` từ `@/domain/shiftLifecycleState` (KHÔNG sửa module này).
      Generator `fc.constantFrom(...)` trên union 11 trạng thái. Assert: mỗi trạng thái cho
      `labelKey` không rỗng + `tone ∈ {info,warning,success,danger,neutral}` khớp bảng chuẩn
      của thiết kế, và hàm đơn trị (tra cứu lặp cho cùng kết quả).
    - Thẻ: `// Feature: frontend-visual-polish, Property 2: Shift Lifecycle Badge single source of truth`; `numRuns: 100`.

  - [ ]* 3.10 Viết unit/component test cho các primitive (ví dụ & edge case)
    - Card áp `shadow-card`/`shadow-card-hover` đúng lúc (4.1–4.3); Modal dùng `shadow-modal`
      không lên backdrop (4.4); EmptyState đúng cấu trúc (8.1, 8.4); Button có trạng thái
      loading phân biệt (10.5); Input có biến thể error tông danger (10.6); nhãn dự phòng
      neutral cho trạng thái vòng đời ngoài 11 mục (3.5).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.1, 8.4, 10.5, 10.6, 3.5_

- [x] 4. Checkpoint — Bảo đảm token + primitive ổn định
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Hoà giải tài liệu khớp runtime (deliverable — thay đổi tài liệu, không đổi hành vi)
  - [x] 5.1 Cập nhật `DESIGN.md` (YAML frontmatter màu + narrative)
    - Theo bảng hoà giải của thiết kế: `colors.brand #f97316 → #FF9A5F`; `colors.brand-soft
      #ffedd5 → #FFD5AE`; `colors.cream #fff7ed → #FFF4E9`; `colors.ink #0f172a → #37373B`;
      `colors.ink-heading #111827 → #37373B`; cập nhật mọi narrative/keyCharacteristics còn
      nhắc `#fff7ed`/`#f97316`; CSS mẫu Primary/Secondary Button → nền `#FF9A5F`, chữ
      `#37373B`, bỏ gradient primary.
    - _Requirements: 1.3, 1.7_

  - [x] 5.2 Cập nhật `.impeccable/design.json` (colorMeta + component samples)
    - `colorMeta.brand.canonical` + `tonalRamp` quanh `#FF9A5F` (ramp remap);
      `colorMeta.cream.canonical #FFF4E9`; `colorMeta.ink.canonical #37373B`;
      `components.button-primary.backgroundColor #FF9A5F`,
      `components.button-primary.textColor #37373B` (mực tối — guardrail, KHÔNG `#ffffff`),
      mô tả "solid `#FF9A5F` + chữ tối `#37373B`, không gradient".
    - Sau bước này, ba nguồn (`globals.css`, `DESIGN.md`, `design.json`) khai báo cùng giá trị
      (so khớp không phân biệt hoa/thường) cho mọi token màu ở Yêu cầu 1.1–1.2.
    - _Requirements: 1.3, 1.7, 2.1_

- [x] 6. Quét đánh bóng từng màn theo thứ tự ưu tiên lưu lượng (Yêu cầu 11)
  - [x] 6.1 Bảng điều khiển Worker — `src/app/worker/dashboard/page.tsx`
    - Đúng MỘT primary CTA cam ("Tìm ca làm"); hành động phụ dùng secondary/ghost/danger;
      lưới StatTile dùng `shadow-card`; `EmptyState` tông ấm; trạng thái ca qua
      `ShiftLifecycleBadge`; CTA nội tuyến (nếu có) giữ đúng hợp đồng token của `Button`
      (`bg-orange-500 text-gray-900`, không tự trôi); khoảng cách 4/8/16/24/32, padding thẻ
      20px. Phân biệt primary "trang" với primary cục bộ trong EmptyState/Modal.
    - _Requirements: 11.1, 11.2, 11.3, 2.4, 2.5, 5.2_

  - [x] 6.2 Bảng điều khiển Employer — `src/app/employer/dashboard/page.tsx`
    - Đúng một primary hành động chính; badge tác vụ; danh sách ca dùng `ShiftLifecycleBadge`;
      token hoá, bóng mềm, nhịp khoảng cách; CTA nội tuyến theo hợp đồng `Button`.
    - _Requirements: 11.1, 11.2, 11.3, 2.4, 2.5_

  - [x] 6.3 Trang Landing — `src/app/page.tsx` (+ `src/components/landing/*`)
    - CTA `bg-orange-500 text-gray-900`; dòng nhấn H1 dùng **màu đặc** `text-orange-600`
      (KHÔNG gradient-text); hero H1 co giãn `text-3xl → sm:text-4xl → lg:text-5xl` (=3rem),
      đơn điệu không giảm; `cta-band` nền tối `#37373B` chữ trắng (hợp lệ trên nền tối); giữ
      One-Orange (nền không tô cam). Gradient-text chỉ tồn tại ở H1 hero landing.
    - _Requirements: 2.1, 2.2, 6.2, 6.5, 6.6, 11.1_

  - [x] 6.4 Trang Chi tiết ca (công khai) — `src/app/shifts/[id]/page.tsx`
    - Đúng một primary hành động ngữ cảnh (Ứng tuyển / hành động ca); trạng thái qua
      `ShiftLifecycleBadge`; kiểm tra tương phản, vùng chạm ≥ 44px, nhịp khoảng cách, bóng thẻ.
    - _Requirements: 11.1, 11.2, 11.3, 2.4_

  - [x] 6.5 Trang Chi tiết ca (employer) — `src/app/employer/shifts/[id]/page.tsx`
    - Như 6.4 ở phía employer: một primary ngữ cảnh; `ShiftLifecycleBadge`; token/bóng/khoảng
      cách/tương phản.
    - _Requirements: 11.1, 11.2, 11.3, 2.4_

  - [x] 6.6 Bề mặt marketing/info còn lại
    - `src/app/{about,how-it-works,safety,faq,user-guide,terms,privacy,support}`: áp lớp
      InfoPage đã hoà giải (`.info-page-hero`, `.info-section-card`, `.info-step-card`,
      `.info-step-badge`), token hoá màu, nhịp khoảng cách 4/8/16/24/32, cỡ/độ cao dòng chữ.
    - _Requirements: 1.4, 1.5, 5.1, 5.3, 6.3_

  - [x] 6.7 Bề mặt admin/disputes
    - `src/app/admin/dashboard`, `src/app/disputes` (và các trang `src/app/employer/*` còn
      lại): token hoá, `ShiftLifecycleBadge` cho trạng thái ca, đúng một primary hành động,
      bóng mềm, tương phản.
    - _Requirements: 1.4, 3.2, 2.4, 2.5_

  - [x] 6.8 NavBar responsive — `src/components/layout/NavBar.tsx`
    - Tinh chỉnh diện mạo token/tương phản/tiêu điểm; vùng chạm ≥ 44px; giữ `< xl` hiện
      hamburger + drawer, `≥ xl` hiện nav ngang; **giữ nguyên đích route/hành vi dropdown**
      (không đổi điều hướng).
    - _Requirements: 9.3, 9.4, 10.3, 9.1, 12.1_

- [x] 7. Checkpoint — Bảo đảm các màn ưu tiên + tài liệu ổn định
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Kiểm chứng thuộc tính tự động (bổ sung, không xoá/sửa test cũ)
  - [ ]* 8.1 e2e — không cuộn ngang cấp trang tại 360/390/430px
    - **Property 5: Không cuộn ngang ở cấp trang tại 360/390/430px**
    - **Validates: Requirements 9.2**
    - Thêm `e2e/26-no-horizontal-scroll.spec.ts`: với mỗi khung nhìn 360/390/430px trên các
      màn ưu tiên, assert `document.scrollWidth <= innerWidth` (không thanh cuộn ngang).

  - [ ]* 8.2 e2e — vùng chạm ≥ 44×44 trên các màn ưu tiên (mobile)
    - **Property 4: Vùng chạm tối thiểu 44×44**
    - **Validates: Requirements 9.1**
    - Thêm `e2e/27-touch-targets.spec.ts`: đo bounding box mỗi phần tử tương tác (nút, liên
      kết hành động, nút icon, mục nav, control biểu mẫu); assert bề rộng ≥ 44 và cao ≥ 44 px.

  - [ ]* 8.3 e2e — tôn trọng prefers-reduced-motion
    - **Property 3: Tôn trọng prefers-reduced-motion**
    - **Validates: Requirements 7.3, 7.4, 8.5**
    - Thêm `e2e/28-reduced-motion.spec.ts`: giả lập `prefers-reduced-motion: reduce`; assert
      không phần tử nào phát sinh dịch chuyển/biến đổi tỉ lệ/độ mờ kéo dài; entrance/reveal ở
      end-state (opacity 1, không transform); chỉ báo tải tĩnh.

  - [ ]* 8.4 e2e — đúng một hành động chính mỗi bề mặt
    - **Property 7: Đúng một hành động chính trên mỗi bề mặt**
    - **Validates: Requirements 2.4, 11.3**
    - Thêm `e2e/29-single-primary.spec.ts`: với Worker dashboard, Employer dashboard, Chi tiết
      ca — đếm phần tử kiểu nút primary = đúng 1; các hành động khác là secondary/ghost/danger.

  - [ ]* 8.5 e2e — điều hướng responsive theo breakpoint
    - Thêm `e2e/30-responsive-nav.spec.ts`: `< 1280px` thu nav vào hamburger drawer;
      `≥ 1280px` hiện nav ngang; `< 640px` dồn bố cục nhiều cột thành một cột.
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ]* 8.6 Kiểm tra tĩnh — nhất quán token (không còn hex lệch palette)
    - **Property 1: Nhất quán token (không còn hex lệch palette)**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 4.5, 6.1, 6.5, 6.6, 7.5, 7.6**
    - Thêm `src/__tests__/tokenConsistency.audit.test.ts` (vitest, đọc/parse file): grep hex
      palette cũ (`#f97316`, `#fb923c`, `#ea580c` khi làm nền primary, `#fff7ed`, `#0f172a`,
      `#111827`) trong `src/components/**`, `src/app/**`, và các lớp trang trí/InfoPage của
      `globals.css` (ngoài khối token chuẩn) → phải rỗng; parse & so khớp token giữa
      `globals.css`/`DESIGN.md`/`design.json`; xác nhận bóng hai lớp (blur ≥ 8px, alpha ≤ 0.12),
      không `clamp()` cỡ chữ in-app, gradient-text không xuất hiện ngoài H1 hero landing.

  - [ ]* 8.7 e2e — không phát sinh lỗi/cảnh báo console mới
    - Thêm `e2e/31-console-clean.spec.ts`: bắt `console` khi tải các màn bị thay đổi; assert
      không có lỗi/cảnh báo mới so với baseline.
    - _Requirements: 13.4_

- [x] 9. Cổng chất lượng (Yêu cầu 13)
  - [x] 9.1 Chạy build + lint và sửa lỗi MỚI (nếu có)
    - `npm run build` (thoát mã 0) và `npm run lint`; sửa mọi lỗi TypeScript/ESLint MỚI phát
      sinh so với baseline, chỉ bằng thay đổi lớp trình bày. Không phát sinh lỗi mới.
    - _Requirements: 13.1_

  - [ ]* 9.2 Chạy toàn bộ test và bảo đảm không hồi quy
    - `npm run test:run` (unit + PBT) và `npm run test:e2e` (Playwright): 100% test hiện có
      PASS, 0 fail; **không** xoá/skip/vô hiệu bất kỳ test nào để đạt pass. Bộ e2e hiện có bảo
      vệ bất biến hành vi (route/đích điều hướng — 12.1; tương tác — 12.4); xác nhận diff
      `src/i18n/vi.ts` không đổi nội dung chuỗi (12.2) và danh tính trợ năng được giữ (12.5).
      Sửa hồi quy chỉ ở lớp trình bày.
    - _Requirements: 13.2, 13.3, 12.1, 12.2, 12.4, 12.5_

- [x] 10. Checkpoint cuối — Bảo đảm toàn bộ cổng chất lượng đạt
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tác vụ đánh dấu `*` là kiểm thử (unit/PBT/e2e/kiểm tra tĩnh) — có thể bỏ qua cho MVP nhanh,
  nhưng nên chạy để bảo vệ các thuộc tính đúng đắn. Tác vụ KHÔNG có `*` là code lõi bắt buộc.
- **Guardrail xuyên suốt:** chữ tối `#37373B` trên nền `#FF9A5F` là chủ ý và đạt WCAG AA
  4.5:1. KHÔNG tác vụ nào được đổi lại chữ trắng-trên-cam, quay về `#f97316`, hay dùng lại
  gradient cam cho nút primary.
- **Chỉ lớp trình bày (Yêu cầu 12.3):** mọi thay đổi nằm trong tập đóng thuộc tính thị giác
  (màu, typography, khoảng cách, độ nâng/bóng, chuyển động, diện mạo trạng thái). Nếu một
  chỉnh sửa vô tình đổi hành vi quan sát được (điều hướng, sự kiện, gửi form, validate, dữ
  liệu gửi đi, điều kiện hiển thị-ẩn), phải loại khỏi phạm vi và hoàn nguyên (Yêu cầu 12.4).
- **`src/domain` bất khả xâm phạm:** `shiftLifecycleState.ts` (nguồn của
  `getShiftStatusBadge`) chỉ được **tiêu thụ**, không sửa. Chuyển một bề mặt sang
  `ShiftLifecycleBadge` chỉ được phép khi không đổi hành vi/điều kiện hiển thị.
- **PBT:** chỉ hai thuộc tính là unit/PBT-được (P2, P6), mỗi thuộc tính một property test
  đơn, `numRuns: 100`, gắn thẻ theo quy ước. P1 là kiểm tra tĩnh; P3/P4/P5/P7 là e2e Playwright.
- QA thị giác thủ công (One-Orange ≤ 10%, nhịp khoảng cách định tính, before/after screenshot)
  nằm trong Chiến lược Kiểm thử của thiết kế nhưng KHÔNG phải tác vụ code cho agent, nên không
  liệt kê ở đây; phần định lượng được phủ bởi các test tự động P1–P7 và cổng chất lượng.
- Checkpoint bảo đảm kiểm chứng tăng dần: chạy `npm run test:run` (một lần, không watch) và
  `npm run test:e2e` tại mỗi checkpoint.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 2, "tasks": ["3.9", "3.10", "5.1", "5.2", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8"] },
    { "id": 3, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] },
    { "id": 4, "tasks": ["9.1", "9.2"] }
  ]
}
```
