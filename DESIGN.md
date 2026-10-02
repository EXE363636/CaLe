---
name: CaLẻ / Now
description: Sàn việc làm theo ca ngắn hạn cho Việt Nam — nền kem ấm, cam tín hiệu, trạng thái minh bạch.
colors:
  brand: "#FF9A5F"
  brand-deep: "#ea580c"
  brand-soft: "#FFD5AE"
  cream: "#FFF4E9"
  surface: "#ffffff"
  bg-base: "#f9fafb"
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

### Ba màu thương hiệu (P1 feedback F2, 29/09/2026)
Giao diện chung và trang marketing chỉ dùng **3 màu + trắng**, có tên ngữ nghĩa
trong `@theme` của `globals.css`:
- **Kem** `bg-cream` = `--background` `#FFF4E9`
- **Cam** `bg-brand` = `--brand` `#FF9A5F` (orange-500)
- **Mực** `bg-ink` / `text-ink` = `--foreground` `#37373B` (gray-900)

Trang marketing (`/`, `/for-workers`, `/for-employers`) dựng bằng **khối màu đặc** xen kẽ
kem / trắng / cam / mực, ít viền và bóng. Không dùng indigo / tím / hồng / xanh ngọc
để trang trí; `slate-*` đã gộp vào `gray-*`, `emerald-*` vào `green-*`, `rose-*`
vào `red-*`. `amber` chỉ cho trạng thái chờ / cảnh báo. Màu trạng thái
(xanh lá / đỏ / vàng / xanh dương) chỉ dùng cho trạng thái, qua bộ tone của `Badge`.

### Neutral
- **Mực / Ink** (`#37373B`, gray-900 = `ink`): màu chữ thân (body) mặc định,
  tiêu đề và nhãn đậm.
- **Xám phụ / Muted** (`#4b5563`, gray-600): mô tả, phụ đề.
- **Xám nhạt / Muted Soft** (`#6b7280`, gray-500): chú thích thứ cấp.
- **Xám mờ / Faint** (`#9ca3af`, gray-400): placeholder, trạng thái disabled.
- **Viền / Border** (`#e5e7eb` gray-200; `#d1d5db` gray-300 khi cần rõ hơn).
- **Nền app / Base** (`#f9fafb`, gray-50): nền phụ nhạt; thẻ trắng nổi lên trên.

### Status (semantic — badge & alerts)
Mỗi màu trạng thái là một cặp nền nhạt + mực đậm, đạt tương phản đọc được:
- **Info** (`#dbeafe` nền / `#1e40af` mực, blue): "Đã đăng", "Đang diễn ra".
- **Warning** (`#fef3c7` nền / `#92400e` mực, amber): "Sắp bắt đầu", "Chờ check-out/xác nhận".
- **Success** (`#dcfce7` nền / `#166534` mực, green): "Hoàn thành".
- **Danger** (`#fee2e2` nền / `#991b1b` mực, red; nút danger nền `#ef4444`): "Có tranh chấp", "Đã huỷ".
- **Neutral** (`#f3f4f6` nền / `#374151` mực, gray): "Nháp", "Chờ cọc", "Hết hạn".
- **Purple** (`#f3e8ff` nền / `#6b21a8` mực): tông dự phòng của `Badge`, dùng hạn chế
  (không dùng tím ở nơi khác).

Badge trạng thái ca **giữ nguyên** bộ tông này ("Đang diễn ra" = info xanh dương) —
câu trả lời 2 của chủ dự án (29/09): "3 màu" không áp cho badge.

### Named Rules
**The One Orange Rule.** Chỉ có MỘT màu thương hiệu — cam tín hiệu. Nó gánh hành
động, lựa chọn hiện tại và điểm nhấn, chiếm ≤10% mỗi màn hình app. Sự khan hiếm
của nó là điểm mấu chốt; đừng bôi cam lên nền lớn trong app (trừ dải CTA marketing).

**The Warmth-From-Background Rule.** Cảm giác ấm đến từ nền kem + gradient + chữ,
KHÔNG phải từ việc tô cam mọi bề mặt. Nền là kem/trắng; cam là để nhấn.

**The Status-Color-Never-Alone Rule.** Màu trạng thái luôn đi kèm nhãn chữ. Không
bao giờ truyền đạt "Có tranh chấp" hay "Hoàn thành" chỉ bằng màu.

### Giao diện tối (từ 30/09)
Bật bằng nút ☾/☀ trên menu → `<html data-theme="dark">` (cookie `cale.theme`, mặc
định sáng). Nguồn chuẩn: khối `:root[data-theme="dark"]` cuối `src/app/globals.css`.
**Không dùng class `dark:`** — chỉ đổi giá trị biến màu:
- Nền trang `#141416`, bề mặt (thẻ, `bg-white`) `#1D1D21`, chữ `#F1F1F4`; thang xám đảo.
- Cam thương hiệu `#FF9A5F` giữ nguyên. Nền cam nhạt (50–300) → nâu tối; chữ cam
  đậm (600–950) → cam sáng.
- Màu trạng thái: nền 50–300 pha tối, chữ 600–950 sáng.
- **Khối thương hiệu giữ bảng màu bản sáng bên trong:** nền cam (`bg-orange-300…500`,
  `bg-brand`) và khối mực (`bg-ink`, `bg-gray-900`) — khối mực vẫn tối (`#2C2C31`).
- Phần tử `text-white` luôn chữ trắng, nền đậm trên chính nó giữ tông đậm; chữ trên
  ảnh có lớp phủ `from-black` giữ màu sáng; nền mờ hộp thoại luôn tối.
- Kiểm 30/09: 34 màn (công khai + worker/employer/admin) không còn chữ < 3:1.

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
- **Background:** trắng mặc định; `warm` = `orange-50/60` viền `orange-100`; `subtle` = `gray-50`.
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
- **Backdrop:** `gray-900/60` đặc, KHÔNG `backdrop-blur` (tránh band trên nền gradient). Click nền để đóng.
- **Panel:** trắng, bo `16px`, `p-6`, `shadow-modal`, `ring-1 ring-black/5`, animation `modal-panel-anim`.
- **A11y:** đóng bằng ESC, focus trap, khoá scroll nền, nút đóng 36px có `aria-label`.

### Landing: biên nhận ca & cửa vai trò (trang chủ, 02/10)
Chỉ dùng trên trang marketing; nguồn: `HomeReceipt.tsx`, `src/app/page.tsx`, khối "Trang chủ — biên nhận ca" trong `globals.css`.
- **Biên nhận:** thẻ trắng bo `16px`; đầu là tên ca + `Badge` trạng thái thật + `ShiftJourney`; đường xé `.receipt-tear` = nét đứt `border-dashed gray-200` + hai khuyết tròn màu `var(--background)` (tự đúng ở giao diện tối). Số tiền `tabular-nums` mực đậm; bảng là sổ tiền một ca: dòng 1 tiền vào (giữ trước), nét đứt, rồi các dòng tiền ra (trả người lao động, phí, hoàn lại); cuối bảng là dòng **Đối soát** kẻ đậm (`tiền ra cộng lại = tiền giữ trước` + dấu ✓ xanh).
- **Số dòng:** vòng tròn mực (`bg-gray-900`, số trắng) dẫn đầu mỗi dòng/mục; khi đang trỏ đổi sang `bg-brand` + chữ mực. Mỗi dòng là liên kết `#id` tới mục giải thích cùng số: mục sáng lên (`orange-50` + viền `orange-200`) qua `:has()` khi rê/focus dòng, qua `:target` khi bấm. Chuyển động cùng kiểu minh hoạ ở `/for-workers`, `/for-employers` (`usePlayback`): biên nhận tự diễn vòng đời ca rồi lặp — đăng ca, giữ tiền (các dòng tiền ra hiện "—", đối soát "Chốt sổ khi ca hoàn thành") → duyệt → đang diễn ra → chờ xác nhận → hoàn thành: tiền ra hiện số, dấu ✓ đối soát tự vẽ. Bản server và khi giảm chuyển động đứng yên ở bước hoàn thành; chỉ chạy khi trong khung nhìn. Mỗi vòng đổi sang ca mẫu khác (`landingSamples.ts`: 8 ca + 8 tài khoản mẫu, dùng chung cho cả minh hoạ ở `/for-workers`, `/for-employers`; mỗi trang bắt đầu ở một ca khác nhau). Không phải vòng nào cũng suôn sẻ (03/10): 2 ca bị huỷ (biên nhận: "Đã hủy" + lý do đỏ, hoàn đủ; người lao động: "Đã hủy bởi nhà tuyển dụng" + lý do; nhà tuyển dụng: hoàn đủ về ví), 2 ca có 1 người vắng (biên nhận chỉ trả người đã làm, hoàn phần người vắng; nhà tuyển dụng: dòng người đó viền đỏ + "Vắng mặt", "Hoàn … về ví", ví xanh cộng lại), 1 ca người lao động không được chọn ("Chờ duyệt" → "Bị từ chối" + "Nhà tuyển dụng đã chọn đủ người · xem ca khác"). Số tiền mọi trường hợp từ `sampleLedger` (có unit test). Mọi số tiền cùng cỡ (`text-lg`); từ `sm` cột số bên phải rộng cố định, điện thoại số tiền xuống dưới chữ (cột chữ dùng hết bề ngang, nhãn không ngắt dòng). Bấm dòng → mục đích loé sáng (`explain-arrive`).
- **Thứ tự trang chủ (02/10):** màn đầu (câu chính + hai cửa + dòng số ca đang mở + biên nhận) → "Vì sao CaLẻ ra đời?" (số liệu + bảng so sánh trong cùng một khối) → loại việc (vòng thẻ) → "Tiền của một ca đi về đâu?" → "CaLẻ làm được gì?" → khối ảnh / lời chia sẻ thật (đang ẩn) → dải mực kết. Không có FAQ (hai trang vai trò có FAQ riêng). Tiêu đề dạng câu hỏi luôn có dấu "?".
- **Nền đổi màu khi cuộn (`ToneScroll`):** các khối không có nền riêng; mỗi khối khai báo `data-tone`, vùng bọc chuyển dần (900ms, giảm chuyển động → đổi ngay) sang tông của khối đang cắt ngang giữa màn hình. Tông bám bộ màu thương hiệu (`--tone-*` trong globals.css, dẫn từ biến gốc nên tự có bản tối): `cream` = `--background` (màn đầu), `apricot` = `orange-50` ("Vì sao ra đời?"), `paper` = trắng bề mặt (loại việc), `peach` = `--brand-soft` pha kem 55% (tiền đi đâu); dải kết giữ nền mực riêng.
- **Dòng số ca đang mở (`OpenShiftCount`):** dưới hai cửa, chữ `text-sm`: chấm xanh `green-600` + "{n} ca đang tuyển" đậm + "· {m} ca gấp trong 24 giờ tới" + "(dữ liệu demo)" ở bản demo + liên kết cam "Xem ca →". Đếm đúng điều kiện của `/shifts` và khối "Ca gấp"; 0 ca → không hiện.
- **"Vì sao CaLẻ ra đời?" (`whyData.ts`):** đoạn bối cảnh (quán cần người vài giờ, sinh viên cần việc theo lịch học, hai bên vẫn tìm nhau qua hội nhóm) → 4 thẻ số trắng bo `16px` (điện thoại 2 cột, `lg` 4 cột): số lớn `text-2xl`/`sm:text-4xl` đậm màu cam đậm `orange-700` (`StatValue`: lần đầu cuộn tới đếm lên từ 0 trong 1,2 giây bằng màu chữ thường, giữ đúng cách viết số theo ngôn ngữ, đếm xong chuyển dần sang cam; đã thấy lúc tải / giảm chuyển động → số đủ, cam sẵn. Không dùng vệt highlight sau chữ — đã thử 02/10, rối mắt) + một dòng giải thích `text-base` + dòng nguồn `text-sm` gạch chân nhạt, mở trang gốc ở tab mới (mỗi số ghi nguồn và kỳ, không viết "hiện nay") → bảng so sánh → chú thích nguồn cảnh báo lừa đảo việc làm thêm.
- **Bảng so sánh (cùng khối "Vì sao CaLẻ ra đời?", ngay dưới 4 thẻ số, không tiêu đề con — lý do ra đời chính là vấn đề CaLẻ giải quyết):** khối trắng 5 hàng, chữ `text-base` (`md` 3 cột chủ đề / "Tuyển qua hội nhóm" ✕ xám / "Trên CaLẻ" ✓ xanh; điện thoại xếp dọc, tên cột in đậm trước mỗi ô), dưới cùng là chú thích nguồn cảnh báo lừa đảo. Không nêu tên mạng xã hội; cột CaLẻ chỉ ghi tính năng đang chạy, câu về tiền có "(mô phỏng)" ở bản demo.
- **Sơ đồ dòng tiền (`MoneyFlowDiagram`, trên 4 thẻ giải thích):** Ví nhà tuyển dụng → ① CaLẻ giữ tiền → thanh gom tách 3 nhánh ② Người lao động / ③ Phí CaLẻ / ④ Hoàn về ví nhà tuyển dụng. Ô trắng bo `16px` cao cố định 72px (số tròn mực → cam khi sáng, tên + dòng phụ cắt gọn, số tiền đậm bên phải: trừ đỏ, cộng xanh, phí cam); đường nối 3px rãnh `gray-200`, tô `--brand`, chấm tiền 10px chạy dọc. Máy tính: ngang (ô giãn, đường nối 48px); điện thoại: dọc. Chạy MỘT lần khi cuộn tới (~1,3 giây/bước): đường tô → chấm chạy → ô đích sáng (viền `orange-300`, hiện số) và thẻ cùng số bên dưới viền cam 2px; xong có nút "Xem lại" (luôn giữ chỗ để không giật trang). Giảm chuyển động → trạng thái cuối, không chấm, không "Xem lại". Ví dụ: ca 2 người × 4 giờ × 45.000 đ, một người vắng (để cả ba nhánh có tiền); số tính bằng `serverWageTotal`/`platformFee`, demo ghi "(mô phỏng)".
- **"CaLẻ làm được gì?" (`featureData.ts`, trước khối ảnh / dải kết, tông `cream`):** hai thẻ cạnh nhau từ `lg` (3:2) — "Đã có" thẻ trắng, chấm xanh, danh sách 2 cột từ `sm` với dấu ✓ `green-700`; "Sắp có" thẻ nền `orange-50` viền đứt `orange-300` 2px, chấm cam, biểu tượng đồng hồ `orange-700`. Chữ mục `text-base`. Dưới cùng "Cập nhật: <tháng>". "Đã có" chỉ ghi chức năng chạy ở cả demo lẫn production (câu tiền / xác thực có "(mô phỏng)" ở demo); "Sắp có" chỉ ghi việc chủ dự án đã duyệt và là phần "có thì tốt hơn" — không công khai lưới an toàn còn thiếu (khiếu nại / tranh chấp chưa bật ở production; các trang landing nói "liên hệ đội hỗ trợ CaLẻ" thay vì hứa khiếu nại, quyết định 03/10).
- **Thẻ giải thích:** lưới 4 thẻ trắng (điện thoại xếp dọc, `sm` 2 cột, `lg` 4 cột), thẻ cùng hàng cao bằng nhau và dùng chung hàng lưới (`grid-rows-subgrid`) nên tên mục, hai dòng "Phía…" và "Xem chi tiết" thẳng hàng giữa các thẻ; mỗi thẻ: số tròn mực + tên mục + `dl` hai dòng "Phía người lao động / Phía nhà tuyển dụng"; giải thích đầy đủ (+ ghi chú, liên kết bảng giá) nằm trong `<details>` "Xem chi tiết" chữ cam có mũi tên xoay.
- **Cửa vai trò (`RoleDoor`):** cả khối là một liên kết, cao ≥76px, bo `16px`, tên vai trò + một dòng mô tả + mũi tên. Ba tông: `brand` (nền cam + chữ mực, hover `orange-400`), `ink` (nền mực + chữ trắng) trên nền sáng, `outline` (viền `white/50`, nền trong) trên dải mực. Mỗi nhóm cửa chỉ một cửa cam.

### Landing: "Từ những ca đã chạy thử" — bằng chứng xã hội (02/10)
Nguồn: `LandingProof.tsx` (`LandingProofView`), dữ liệu `proofData.ts`. Đặt ngay trước dải mực kết ở cả 3 trang (`/`: cả hai phía, nền trắng; `/for-workers`: lời người lao động, nền kem; `/for-employers`: lời nhà tuyển dụng, nền trắng). Gồm: tiêu đề + đoạn dẫn; lưới ảnh 4:3 bo `16px` (`sm` 2 cột, `lg` 3 cột) có chú thích nơi chụp; lưới thẻ lời chia sẻ trắng bo `16px` (`md` 2, `lg` 3 cột): câu trích `text-lg` trong ngoặc kép, dưới là ảnh tròn 44px (hoặc chữ cái đầu trên nền `orange-100`) + tên + vai trò; ghi chú nhỏ về sự đồng ý. **Chỉ điền dữ liệu THẬT, đã xin phép** (`consentDate`); danh sách trống → khối không hiện (không khung trống, không câu mẫu). Ảnh tự chụp để ở `public/images/proof/`.

### Ảnh chia sẻ link (Open Graph, 02/10)
`src/app/opengraph-image.png` (trang chủ, mọi trang không có ảnh riêng dùng chung), `src/app/for-workers/opengraph-image.png`, `src/app/for-employers/opengraph-image.png`, 1200×630, kèm `opengraph-image.alt.txt`. Bố cục: nền kem + hai vòng tròn `--brand-soft` / `orange-50`; trái là logo, tiêu đề hero 58px đậm (không ngắt dòng), một câu phụ, 3–4 chip viền cam; phải là một thẻ minh hoạ trắng bo 28px (biên nhận / thẻ ca / duyệt người) có chữ "Minh hoạ". Tạo lại bằng `node scripts/generate-og-images.mjs http://localhost:<cổng>` khi đổi câu chữ hay màu. Tiêu đề / mô tả thẻ chia sẻ ở `src/lib/shareMeta.ts` + `export const metadata` của từng trang; tên tab trình duyệt vẫn là "CaLẻ".

### Trang chủ: ngân sách chuyển động (03/10)
Chuyển động liên tục chỉ có 3: biên nhận tự diễn vòng đời ca, vòng thẻ loại việc xoay, nền đổi tông khi cuộn. Mọi thứ khác chạy MỘT lần: chữ đánh máy (2 câu), số liệu đếm lên, sơ đồ dòng tiền, và xuất hiện có nhịp — `.hero-in` (màn đầu hiện lần lượt khi tải, trễ 90ms/phần tử theo `--i`), `.m-rise` (trồi 18px + hiện dần, trễ 90ms theo `--i`) + `.m-tick` (dấu ✓ tự vẽ) cho hàng bảng so sánh, 4 thẻ "tiền đi về đâu", mục "CaLẻ làm được gì?" và hai cửa ở dải kết, dùng `MotionGroup` (chỉ ẩn khi `data-motion="armed"`). **Không thêm vòng lặp mới.** Giảm chuyển động → tất cả đứng yên, nội dung đủ.

### Landing: chữ đánh máy khi cuộn tới (02/10)
Nguồn: `TypeOnView.tsx`, khối "Chữ đánh máy" trong `globals.css`. **Dùng tiết chế — mỗi trang đúng 2 câu:** tiêu đề lời hứa giữa trang + câu chốt cuối trang (`/`: "Ca làm cho nhiều loại việc", "Bắt đầu từ phía của bạn"; `/for-workers`: "Tiền công của bạn", "Bạn cần tuyển người?"; `/for-employers`: "Tiền của bạn đi đâu?", "Sẵn sàng đăng ca đầu tiên?"). Lần đầu cuộn tới, câu hiện dần từng ký tự (0,35–1,5 giây), con trỏ cam `var(--brand)` rộng 3px, gõ xong mờ dần. **Không** dùng cho đoạn văn, danh sách, thẻ, FAQ, số tiền, nút: chữ cần đọc phải hiện ngay (thử nghiệm gõ mọi chỗ 02/10: cuộn nhanh trên điện thoại gặp cả khối trống, nhiều con trỏ cùng chạy). Khối đã trong màn hình lúc tải không gõ; giảm chuyển động → hiện đủ chữ. Chữ thật luôn ở DOM (trong suốt khi gõ), không xô lệch bố cục.

### Landing: vòng thẻ loại việc (trang chủ, 02/10)
Nguồn: `JobRing.tsx`, `homeJobs.ts`, khối "vòng thẻ loại việc" trong `globals.css`.
- **Vòng:** dải thẻ tràn hết bề ngang màn hình, uốn như mặt trong một vòng tròn (thẻ giữa lùi xa, thẻ hai mép to hơn và nghiêng vào trong), hai mép mờ dần vào nền bằng mask. Tự xoay liên tục thành vòng lặp (~46px cung/giây); dừng khi rê chuột, focus bàn phím, đã chọn thẻ, bấm "Tạm dừng", ra khỏi màn hình hoặc tab ẩn. Giảm chuyển động → không tự xoay. Kéo ngang để xoay (có quán tính); nút tròn ‹ ⏸ › viền xám ở dưới.
- **Thẻ:** ảnh dọc 4:5 bo `16px`, bóng `shadow-modal`, lớp phủ tối dưới đáy (`.job-scrim`, màu cố định) + tên việc + 1 dòng mô tả (giữ chỗ 2 dòng). Thẻ đang chọn có viền cam `ring-4 ring-brand`.
- **Tìm ca theo loại việc:** nút "Tìm ca làm" trong khung chi tiết mở `/shifts?viec=<slug>` (`lib/jobTypeSlug.ts`) — `/shifts` chọn sẵn loại việc đó; Phụ bếp, Dọn dẹp (đăng dưới "Khác") mở `/shifts` không lọc.
- **Lối đi thẳng:** dưới hàng nút ‹ ⏸ › là hai liên kết chữ "Xem ca đang tuyển →" (cam) và "Đăng ca tuyển →" (mực), không bắt khách ấn thẻ mới thấy đường đi tiếp.
- **Khung chi tiết:** ấn thẻ → vòng dừng, thẻ về giữa, bên dưới hiện khung trắng bo `24px`: tên việc + mô tả, 3 cột (điện thoại: xếp dọc) "1. Việc gồm gì / 2. Một ca thường thế nào / 3. Cần gì để làm" có gạch trên cam nhạt, nút cam "Tìm ca làm" + nút viền "Đăng ca loại này", ghi chú "Mô tả chung…". Nút X hoặc ấn lại thẻ để đóng.
- **Ảnh:** người châu Á, ưu tiên bối cảnh Việt Nam (yêu cầu 02/10); nguồn ở `docs/IMAGE_CREDITS.md`.

### Signature: Shift Lifecycle Badge
Thành phần đặc trưng nhất của sản phẩm — MỘT badge trạng thái ca dùng ở MỌI bề
mặt (worker/employer/admin/list/detail/deeplink). Một hàm thuần
(`getShiftLifecycleState`) tính trạng thái theo đồng hồ, một bảng ánh xạ
(`getShiftStatusBadge`) gán đúng một nhãn + một tông cho mỗi trạng thái:

| Trạng thái | Nhãn | Tông |
|---|---|---|
| Draft | Nháp | neutral |
| PendingDeposit | Chờ giữ cọc | neutral |
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
- **Do** cho mỗi màn một hành động chính rõ ràng ("Ứng tuyển ca", "Duyệt người ứng tuyển", "Xác nhận hoàn thành", "Xuất bảng kiểm tra tiền").
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
