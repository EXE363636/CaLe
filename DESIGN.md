---
name: CaLẻ / Now
description: Sàn việc làm theo ca ngắn hạn cho Việt Nam — nền kem ấm, cam tín hiệu, trạng thái minh bạch.
colors:
  brand: "#FF9A5F"
  brand-deep: "#ea580c"
  brand-soft: "#FFD5AE"
  cream: "#FFF4E9"
  surface: "#ffffff"
  bg-base: "#f8fafc"
  ink: "#37373B"
  ink-heading: "#37373B"
  muted: "#4b5563"
  muted-soft: "#6b7280"
  faint: "#9ca3af"
  border: "#e5e7eb"
  border-strong: "#d1d5db"
  success-bg: "#dcfce7"
  success-ink: "#166534"
  warning-bg: "#fef3c7"
  warning-ink: "#92400e"
  danger: "#ef4444"
  danger-bg: "#fee2e2"
  danger-ink: "#991b1b"
  info-bg: "#dbeafe"
  info-ink: "#1e40af"
  neutral-bg: "#f3f4f6"
  neutral-ink: "#374151"
  purple-bg: "#f3e8ff"
  purple-ink: "#6b21a8"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "#FF9A5F"
    textColor: "#37373B"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#feac74"
    textColor: "#37373B"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-heading}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-ink}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: CaLẻ / Now

> **Nguồn sự thật palette (đồng bộ runtime).** Runtime `src/app/globals.css`
> (khối `:root` + `@theme`) là nguồn chuẩn (canonical) DUY NHẤT cho bảng màu.
> Tài liệu này được cập nhật để **khớp** runtime,
> không phải ngược lại. Khi có khác biệt, giá trị trong `globals.css` là giá trị đúng.

## 1. Overview

**Creative North Star: "Bảng điều phối đáng tin" (The Trusted Dispatch Board)**

CaLẻ / Now trông như một tấm bảng điều phối ca làm: ấm áp, dễ đọc, và luôn cho
biết mọi thứ đang ở đâu. Mọi màn hình là một bề mặt làm việc, nơi trạng thái ca,
tiền công, và bước tiếp theo hiện ra rõ ràng trên nền kem ấm, được neo bằng một
màu cam tín hiệu duy nhất. Sự ấm áp đến từ nền và typography; sự tin cậy đến từ
tính nhất quán — cùng một trạng thái luôn có cùng một nhãn và cùng một màu ở mọi
nơi. Hệ thống phục vụ công việc, không phô diễn.

Đây là bề mặt **product** (app phục vụ tác vụ), không phải trang marketing. Công
cụ phải lùi lại phía sau tác vụ: quen thuộc, có thể đoán trước, không có thành
phần lạ không mục đích. Người dùng — lao động trẻ, sinh viên, freelancer, doanh
nghiệp nhỏ — thường thao tác nhanh trên điện thoại, đôi khi ngoài trời. Vì vậy độ
rõ và tương phản thắng sự tinh tế; một hành động chính rõ ràng thắng một lưới nút
đều nhau.

Hệ thống **từ chối**: vẻ rao vặt lộn xộn, gig-app game hóa sặc sỡ, fintech tối
màu navy/gold hào nhoáng, và dashboard dày đặc chữ. Nó cũng từ chối phóng đại:
ví, cọc, thanh toán và check-in đều là **mô phỏng/prototype** và giao diện phải
nói đúng như thế.

**Key Characteristics:**
- Nền kem ấm (`#FFF4E9`), thẻ trắng nổi lên bằng bóng mềm nhiều lớp.
- Một màu thương hiệu duy nhất: cam tín hiệu (`#FF9A5F`) cho hành động và điểm nhấn.
- Trạng thái là công dân hạng nhất: nhãn + màu nhất quán, không bao giờ chỉ dựa vào màu.
- Một họ chữ (Inter), thang cỡ cố định cho app; luôn dễ đọc tiếng Việt có dấu.
- Chuyển động phục vụ định hướng, luôn tôn trọng `prefers-reduced-motion`.
- Mobile-first, chạm tối thiểu 44px, mục tiêu WCAG 2.1 AA.

## 2. Colors

Bảng màu là một sắc cam ấm trên nền kem trung tính, cộng một bộ màu trạng thái ngữ
nghĩa dùng cho badge và cảnh báo. Cam là giọng nói duy nhất; phần còn lại là nền và mực.

### Primary
- **Cam CaLẻ / Signal Orange** (`#FF9A5F`, orange-500): màu hành động và thương hiệu.
  Dùng cho nút chính (nền đặc + chữ tối `#37373B`), liên kết đang chọn, chỉ báo trạng
  thái và điểm nhấn — không dùng để trang trí.
- **Cam đậm / Deep Orange** (`#ea580c`, orange-600): chữ/viền nhấn đậm — chữ nút
  secondary, liên kết, và chữ cam trên nền sáng (bảo đảm tương phản đủ). KHÔNG dùng
  làm nền nút primary (primary là nền đặc `#FF9A5F` + chữ tối, không gradient).

### Secondary
- **Cam nhạt / Soft Orange** (`#FFD5AE`, orange-200): nền chip, viền nhẹ, vùng nhấn mảng.
- **Kem ấm / Warm Cream** (`#FFF4E9`, `--background`): nền kem của toàn trang; thẻ trắng nổi lên trên.

### Neutral
- **Mực than / Slate Ink** (`#37373B`, slate-900): màu chữ thân (body) mặc định.
- **Mực tiêu đề / Heading Ink** (`#37373B`, gray-900): tiêu đề và nhãn đậm.
- **Xám phụ / Muted** (`#4b5563`, gray-600): mô tả, phụ đề.
- **Xám nhạt / Muted Soft** (`#6b7280`, gray-500): chú thích thứ cấp.
- **Xám mờ / Faint** (`#9ca3af`, gray-400): placeholder, trạng thái disabled.
- **Viền / Border** (`#e5e7eb` gray-200; `#d1d5db` gray-300 khi cần rõ hơn).
- **Nền app / Base** (`#f8fafc`, slate-50): đáy của gradient nền; thẻ trắng nổi lên trên.

### Status (semantic — badge & alerts)
Mỗi màu trạng thái là một cặp nền nhạt + mực đậm, đạt tương phản đọc được:
- **Info** (`#dbeafe` nền / `#1e40af` mực, blue): "Đã đăng", "Đang diễn ra".
- **Warning** (`#fef3c7` nền / `#92400e` mực, amber): "Sắp bắt đầu", "Chờ check-out/xác nhận".
- **Success** (`#dcfce7` nền / `#166534` mực, green): "Hoàn thành".
- **Danger** (`#fee2e2` nền / `#991b1b` mực, red; nút danger nền `#ef4444`): "Có tranh chấp", "Đã huỷ".
- **Neutral** (`#f3f4f6` nền / `#374151` mực, gray): "Nháp", "Chờ cọc", "Hết hạn".
- **Purple** (`#f3e8ff` nền / `#6b21a8` mực): dành riêng, dùng hạn chế.

### Named Rules
**The One Orange Rule.** Chỉ có MỘT màu thương hiệu — cam tín hiệu. Nó gánh hành
động, lựa chọn hiện tại và điểm nhấn, chiếm ≤10% mỗi màn hình app. Sự khan hiếm
của nó là điểm mấu chốt; đừng bôi cam lên nền lớn trong app (trừ dải CTA marketing).

**The Warmth-From-Background Rule.** Cảm giác ấm đến từ nền kem + gradient + chữ,
KHÔNG phải từ việc tô cam mọi bề mặt. Nền là kem/trắng; cam là để nhấn.

**The Status-Color-Never-Alone Rule.** Màu trạng thái luôn đi kèm nhãn chữ. Không
bao giờ truyền đạt "Có tranh chấp" hay "Hoàn thành" chỉ bằng màu.

## 3. Typography

**Display Font:** Inter (Google Fonts, subset `latin` + `vietnamese`, biến `--font-inter`)
**Body Font:** Inter (cùng họ)
**Label/Mono Font:** không có họ riêng — Inter ở weight/cỡ khác biệt

**Character:** Một họ sans humanist duy nhất, hỗ trợ dấu tiếng Việt đầy đủ. Phân
cấp bằng weight và cỡ, không bằng cách ghép font. Trung tính, dễ đọc, không phô
diễn — đúng tinh thần một công cụ làm việc.

### Hierarchy
- **Display** (800, responsive `1.875rem → 3rem`, line-height 1.25, tracking -0.025em):
  CHỈ dùng cho H1 hero trang landing. App không dùng cỡ này.
- **Headline** (700, `1.5rem → 1.875rem`, line-height 1.3): tiêu đề mục/section.
- **Title** (600, `1.125rem`, line-height 1.4): tiêu đề thẻ, tiêu đề modal.
- **Body** (400, `0.875rem` mặc định UI / `1rem` prose, line-height 1.5, prose dùng `leading-relaxed`):
  văn bản chính. Giữ độ dài dòng 65–75ch cho đoạn văn dài.
- **Label** (600, `0.75rem`, letter-spacing 0.05em, đôi khi UPPERCASE): nhãn nhỏ, eyebrow, chú thích.

### Named Rules
**The Fixed-Scale-In-App Rule.** Trong app dùng thang cỡ cố định (rem/Tailwind
step), KHÔNG dùng `clamp()` co giãn. Chỉ hero landing mới tăng cỡ theo breakpoint.
Chữ co giãn trong sidebar/thẻ trông tệ hơn, không tốt hơn.

**The Vietnamese-Legibility Rule.** Line-height đủ thoáng (≥1.25 cho tiêu đề) để
dấu dòng trên không chạm dấu dòng dưới. Không nhồi mô tả dài trong màn thao tác chính.

## 4. Elevation

Hệ thống **có dùng bóng**, nhưng mềm và nhiều lớp — không phẳng tuyệt đối, cũng
không nặng nề. Độ sâu báo hiệu "thẻ này nổi trên nền kem" và phản hồi trạng thái
(hover/focus). Nền trang là gradient kem ấm; thẻ trắng nổi lên nhờ bóng, hiếm khi
chỉ nhờ viền.

### Shadow Vocabulary
- **shadow-card** (`0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)`): độ
  nâng nghỉ của thẻ. Mềm, khuếch tán, gần như không thấy đường viền cứng.
- **shadow-card-hover** (`0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)`):
  thẻ clickable khi hover/focus-within, đi kèm nâng `translateY(-2px)` (`.motion-lift`).
- **shadow-modal** (`0 8px 32px rgba(0,0,0,0.12), 0 16px 48px rgba(0,0,0,0.08)`):
  panel modal, tách khỏi backdrop tối đặc.
- **Ring nhấn thương hiệu**: các panel như `hero-panel`/`section-shell` dùng
  `inset 0 0 0 1px rgba(255,154,95,0.12–0.18)` để mép đọc như "được thiết kế".

### Named Rules
**The Soft-Layered Rule.** Bóng luôn là hai lớp alpha thấp (khuếch tán), không bao
giờ là một lớp cứng tối. Nếu trông như app 2014 thì bóng quá tối và blur quá nhỏ.

**The Lift-On-Intent Rule.** Nâng + đậm bóng chỉ xuất hiện khi phần tử có thể tương
tác và người dùng hover/focus. Bề mặt tĩnh không tự nâng.

## 5. Components

### Buttons
- **Shape:** bo góc mềm (`8px`, rounded-lg). Bốn intent: primary, secondary, ghost, danger.
- **Sizes:** sm cao 36px (`px-3 py-1.5`), md cao 44px (`px-4 py-2`, mặc định), lg cao 52px (`px-6 py-3`).
- **Primary:** solid `#FF9A5F` (orange-500) + chữ tối `#37373B` (gray-900), `shadow-sm`,
  KHÔNG gradient; hover sáng lên trong ramp cam (`orange-400`) giữ chữ tối + `shadow-md`;
  active `orange-300`; disabled `orange-200` chữ `gray-500`, bỏ bóng.
- **Secondary:** nền trắng, chữ cam đậm (`#ea580c`), viền cam (`#FF9A5F`, orange-500); hover nền `orange-50`.
- **Ghost:** trong suốt, chữ xám (`#4b5563`); hover nền `gray-100`. Hành động hạng ba.
- **Danger:** gradient đỏ (`#ef4444 → #dc2626`), chữ trắng. Chỉ cho hành động phá huỷ.
- **Focus:** đồng nhất mọi biến thể — `focus-visible:ring-2 ring-orange-400 ring-offset-2`.
- **Loading:** spinner inline 16px, nút tự disable.

### Inputs / Fields
- **Style:** nền trắng, viền `gray-300`, bo `8px`, cao tối thiểu 44px, chữ `gray-900`, placeholder `gray-400`.
- **Hover:** viền đậm lên `gray-400`.
- **Focus:** `focus-visible:ring-2 ring-orange-400 ring-offset-1`, bỏ outline mặc định.
- **Error:** viền `red-400`, nền `red-50`, ring đỏ; thông báo lỗi `text-xs text-red-600` kèm `role="alert"` và `aria-invalid`.
- **Disabled:** nền `gray-100`, chữ `gray-500`, con trỏ `not-allowed`.
- **Label:** `text-sm font-medium text-gray-700`; dấu `*` đỏ khi bắt buộc.

### Cards / Containers
- **Corner Style:** bo `16px` (rounded-2xl).
- **Background:** trắng mặc định; `warm` = `orange-50/60` viền `orange-100`; `subtle` = `slate-50`.
- **Shadow Strategy:** `shadow-card` khi nghỉ; `shadow-card-hover` + `.motion-lift` khi `clickable`.
- **Border:** `1px gray-200` mặc định; bỏ viền khi `flush` (thẻ-trong-thẻ) để không rối.
- **Internal Padding:** `20px` (p-5).
- **Nested rule:** không lồng thẻ trong thẻ có viền — dùng `flush` cho lớp trong.

### Badges / Status Chips
- **Shape:** viên thuốc (`rounded-full`), `px-2.5 py-0.5`, `text-xs font-semibold`, `ring-1` cùng tông.
- **Sáu tông:** success / warning / danger / info / neutral / purple (xem mục Colors).
- **Luôn kèm nhãn chữ**; badge không bao giờ chỉ là một chấm màu.

### Navigation
- **Header:** sticky trên cùng, nền `white/95` + `backdrop-blur-sm`, viền dưới `orange-100`, `shadow-sm`, `z-30`.
- **Brand:** "CaLẻ / Now" chữ cam đậm + phụ đề nhỏ "by CaLedo Tech".
- **Nav link:** `text-sm font-medium`, cao ≥40px; active = nền `orange-50` chữ `orange-700`; hover = nền `gray-100`.
- **Dropdown:** chỉ một mở tại một thời điểm; bo `12px`, viền `gray-200`, `shadow-xl`, `z-40`; mở khi hover/focus/click, đóng trễ 150ms; item có nhãn + mô tả phụ.
- **Mobile (< xl):** thu về hamburger + drawer; desktop (≥1280px) luôn hiện nav ngang, không thu.
- **Role-aware:** nav khác nhau cho khách / worker / employer / admin; badge tác vụ (`TaskBadge`) đếm việc cần xử lý.

### Modal
- **Portal** ra `document.body`, thoát mọi ngữ cảnh clipping. `z-[100]` trên cả nav.
- **Backdrop:** `slate-900/60` đặc, KHÔNG `backdrop-blur` (tránh band trên nền gradient). Click nền để đóng.
- **Panel:** trắng, bo `16px`, `p-6`, `shadow-modal`, `ring-1 ring-black/5`, animation `modal-panel-anim`.
- **A11y:** đóng bằng ESC, focus trap, khoá scroll nền, nút đóng 36px có `aria-label`.

### Signature: Shift Lifecycle Badge
Thành phần đặc trưng nhất của sản phẩm — MỘT badge trạng thái ca dùng ở MỌI bề
mặt (worker/employer/admin/list/detail/deeplink). Một hàm thuần
(`getShiftLifecycleState`) tính trạng thái theo đồng hồ, một bảng ánh xạ
(`getShiftStatusBadge`) gán đúng một nhãn + một tông cho mỗi trạng thái:

| Trạng thái | Nhãn | Tông |
|---|---|---|
| Draft | Nháp | neutral |
| PendingDeposit | Chờ đặt cọc | neutral |
| Published | Đã đăng | info (blue) |
| StartingSoon | Sắp bắt đầu | warning (amber) |
| InProgress | Đang diễn ra | info (blue) |
| AwaitingCheckout | Chờ check-out | warning |
| AwaitingEmployerConfirmation | Chờ xác nhận | warning |
| Completed | Hoàn thành | success (green) |
| Expired | Hết hạn | neutral |
| Cancelled | Đã huỷ | danger (red) |
| Disputed | Có tranh chấp | danger (red) |

**The Single-Source-Of-Truth Rule.** Cùng một ca luôn hiện cùng nhãn + cùng màu ở
mọi trang. "Đang diễn ra" LUÔN là `info` (xanh dương) — không bao giờ tím ở nơi này,
xanh lá ở nơi khác. Check-in/mark-present KHÔNG đẩy ca sang "Đang diễn ra" sớm;
lifecycle chỉ theo đồng hồ.

## 6. Do's and Don'ts

### Do:
- **Do** dùng tên hiển thị **"CaLẻ"** ở mọi bề mặt hướng người dùng (UI, landing, wording người dùng đọc); chỉ dùng **"CaLẻ / Now"** trong tài liệu nội bộ/kỹ thuật (repo, handoff), để không tạo cảm giác hai thương hiệu.
- **Do** dùng nhãn tiếng Việt rõ ràng trong app ("Ca đang chờ duyệt", "Cần xác nhận", "Đối soát") thay cho kiểu chữ trang trí.
- **Do** neo mỗi màn hình bằng nền kem/trắng và dùng cam (`#FF9A5F`) chỉ cho hành động + điểm nhấn (≤10% bề mặt app).
- **Do** hiển thị trạng thái ca qua `ShiftLifecycleBadge` — luôn nhãn chữ + tông nhất quán; cùng trạng thái = cùng màu ở mọi nơi.
- **Do** cho mỗi màn một hành động chính rõ ràng ("Ứng tuyển ca", "Duyệt ứng viên", "Xác nhận hoàn thành", "Xuất đối soát").
- **Do** dùng bóng mềm hai lớp (`shadow-card`) cho thẻ; nâng (`.motion-lift`) chỉ khi clickable.
- **Do** giữ mọi phần tử tương tác ≥44px và body text ≥4.5:1 tương phản, kể cả trên nền kem.
- **Do** gắn nhãn phần mô phỏng đúng sự thật: "đặt cọc mô phỏng", "trạng thái thanh toán", "sổ cái mô phỏng", "check-in (prototype)".
- **Do** cung cấp đủ trạng thái cho mọi control: default, hover, focus, active, disabled, loading, error.
- **Do** tôn trọng `prefers-reduced-motion` cho mọi animation.

### Don't:
- **Don't** biến CaLẻ thành **web rao vặt/đăng tin lộn xộn** (nhiều màu, banner, chữ nhấp nháy) — nó che mờ quy trình và làm mất niềm tin.
- **Don't** trông như một **trang đăng tin việc làm thông thường**; UI phải ưu tiên trạng thái, tiến trình và bước tiếp theo.
- **Don't** **game hóa quá đà** điểm uy tín/huy hiệu/kỹ năng — Trust Score là dữ liệu quyết định việc làm, không phải bảng tích điểm giải trí.
- **Don't** dùng **fintech tối màu navy/gold, glass hào nhoáng** — sai ngữ cảnh lao động phổ thông Việt Nam.
- **Don't** tạo **dashboard dày đặc chữ, form dài, bảng rối** khiến người ít rành công nghệ bị ngợp.
- **Don't** để UI **quá corporate, xa cách**; giữ chuyên nghiệp nhưng gần gũi.
- **Don't** dùng wording/icon **ngụ ý ví, escrow, thanh toán tự động hay chấm công chống gian lận thật** đã vận hành.
- **Don't** truyền đạt trạng thái **chỉ bằng màu** — luôn kèm nhãn/icon.
- **Don't** dùng **gradient-text** trong UI app (một instance hợp lệ duy nhất: dòng nhấn H1 hero landing — đừng lan ra ngoài đó).
- **Don't** rải **eyebrow UPPERCASE tracked** lên mọi mục màn app; đó là thủ pháp bề mặt marketing, không phải ngữ pháp cho app.
- **Don't** dùng **viền-sọc-cạnh** (border-left/right > 1px làm dải màu) trên thẻ/alert; dùng viền đủ, nền nhạt, hoặc icon/số dẫn đầu.
- **Don't** mặc định **glassmorphism**; backdrop-blur chỉ dùng hiếm và có mục đích (đã bỏ blur trên backdrop modal có chủ đích).
