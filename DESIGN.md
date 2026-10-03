---
name: CaLẻ / Now
description: Sàn việc làm theo ca ngắn hạn cho Việt Nam — nền kem ấm, cam tín hiệu, trạng thái minh bạch.
colors:
  brand: "#FF9A5F"
  brand-deep: "#ea580c"
  brand-soft: "#FFD5AE"
  cream: "#FBF9F6"
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
- Nền trắng ngà (`#FBF9F6`, 03/10; trước là kem `#FFF4E9`), thẻ trắng nổi lên bằng bóng mềm nhiều lớp.
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
- **Trắng ngà / Ivory** (`#FBF9F6`, `--background`, 03/10; trước là kem `#FFF4E9`): nền của toàn trang, cả app; thẻ trắng nổi lên trên.

### Ba màu thương hiệu (P1 feedback F2, 29/09/2026)
Giao diện chung và trang marketing chỉ dùng **3 màu + trắng**, có tên ngữ nghĩa
trong `@theme` của `globals.css`:
- **Kem** `bg-cream` = `--background` `#FBF9F6` (trắng ngà, 03/10)
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

### Da trang công khai "giấy trắng, cam rõ" (03/10)
Chủ dự án chọn hướng A cho MỌI trang công khai (`/`, `/for-workers`, `/for-employers`, bảng giá,
cẩm nang, hướng dẫn, trang thông tin, đăng nhập / đăng ký) + header khi đang ở các trang đó +
footer. Lớp `.public-skin` trong `globals.css` (chỉ giao diện sáng; tối giữ bảng tối hiện có),
gắn trên `ToneScroll`, `AuthShell` (`public-canvas` = nền giấy) và footer. **Từ 03/10 (tối) lớp
này gắn ở `<body>` (`app/layout.tsx`)** theo yêu cầu chủ dự án "nền và màu các block giống landing
page": app (dashboard, lịch, hồ sơ, trang ca, quản trị), header, hộp thoại và toast dùng cùng bộ màu
(nền trắng ngà, cam `#FF8A3D`, nền cam nhạt trung tính, mực `#1E1E22`; tối: nền / giấy / thẻ ba
lớp). `lib/publicSkin.ts` (`isPublicSkinPath`) đã bỏ vì không còn trang nào khác da. **Giao diện tối của da công khai (03/10):** ba lớp tách rõ — nền `#141416` < giấy `#19191c` < thẻ (`--color-white`) `#24242a`; viền / vạch kẻ `ring-black/5|10`, `border-black/5|10`, `bg-black/5` đổi thành trắng 8–9% (bản tối gốc để giấy = màu thẻ nên thẻ chìm).
- **Nền:** trắng ngà `#FBF9F6` + giấy ấm `#F2EEE8` xen kẽ (`--tone-cream` / `--tone-peach` = trắng ngà,
  `--tone-paper` / `--tone-apricot` = giấy; `--background` = trắng ngà). Không dùng trắng tinh làm nền:
  thẻ trắng `#FFF` phải luôn nổi lên. Hết các tông đào / kem phủ cả trang. Trang vai
  trò xếp khối `cream` (trắng) / `paper` (giấy) luân phiên.
- **Cam đậm hơn một nấc:** `--brand` = `orange-500` = `#FF8A3D` (hover `orange-400` `#FF9F60`); nút
  chính vẫn là nền cam + chữ mực (≈ 7:1). Nền cam nhạt trung tính hơn: `orange-50` `#FFF5EE`,
  `100` `#FFEADB`, `200` `#FFD9BF`, `300` `#FFBD8F`. Chữ cam đậm (`600`/`700`) giữ nguyên.
- **Mực đậm hơn:** `gray-900` / `ink` = `#1E1E22`.
- **`hero-decor`:** chỉ còn một quầng cam rất nhạt góc phải trên (10%), không dải đào.
- Chọn chữ (`::selection`) nền `#FFD9BF`, chữ mực. Link `#khối` có `scroll-margin-top: 6rem`.

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
- **Khách (03/10, lần 2):** "Người lao động" / "Nhà tuyển dụng" là menu thả **danh sách dọc tới từng khối của trang vai trò** (mục đầu "Tổng quan cho …", sau đó `#khối`: người lao động — Ca đang tuyển, Tìm ca và ứng tuyển, Lịch cá nhân, Tiền về tay khi nào, Quy định huỷ ca, Hồ sơ & điểm uy tín, Câu hỏi thường gặp; nhà tuyển dụng — Thử đăng một ca, Duyệt người ứng tuyển, Giữ tiền ca làm, Đánh giá sau ca, Câu hỏi thường gặp). "Người lao động" sáng cả ở `/shifts`. Ngăn kéo điện thoại của khách: Trang chủ, rồi hai nhóm cùng danh sách.
- **Dropdown:** chỉ một mở tại một thời điểm; bo `12px`, viền `gray-200`, `shadow-xl`, `z-40`; mở khi hover/focus/click, đóng trễ 150ms; item có nhãn + mô tả phụ.
- **Mobile (< xl):** thu về hamburger + drawer; desktop (≥1280px) luôn hiện nav ngang, không thu.
- **Role-aware:** nav khác nhau cho khách / worker / employer / admin; badge tác vụ (`TaskBadge`) đếm việc cần xử lý.
- **Nút cam bên phải (03/10):** khách trên trang vai trò (`/for-workers`, `/shifts`, `/for-employers`) chỉ có "Đăng nhập" + một nút cam "Đăng ký để nhận ca" / "Đăng ký để đăng ca" (không lặp chữ "Đăng ký"); `/` có "Đăng nhập · Đăng ký", không nút cam; trang khác giữ "Đăng ký" + "Đăng ca tuyển". Đã đăng nhập: việc chính của vai trò là nút cam ("Đăng ca" cho nhà tuyển dụng, "Tìm ca làm" cho người lao động), mục trùng trong menu giữa được bỏ. Ngăn kéo điện thoại: nút đăng ký mang vai trò của trang.

### Modal
- **Portal** ra `document.body`, thoát mọi ngữ cảnh clipping. `z-[100]` trên cả nav.
- **Backdrop:** `gray-900/60` đặc, KHÔNG `backdrop-blur` (tránh band trên nền gradient). Click nền để đóng.
- **Panel:** trắng, bo `16px`, `p-6`, `shadow-modal`, `ring-1 ring-black/5`, animation `modal-panel-anim`.
- **A11y:** đóng bằng ESC, focus trap, khoá scroll nền, nút đóng 36px có `aria-label`.

### Footer (03/10)
Nguồn `components/layout/Footer.tsx`, gắn mọi route, nền giấy `var(--tone-paper)` + `.public-skin`. Từ `lg` **một hàng**: logo + một câu giới thiệu · ba cột liên kết "CaLẻ" (Giới thiệu, Cách hoạt động, Hướng dẫn sử dụng, Cẩm nang, Lưu ý an toàn, Câu hỏi thường gặp) / "Người lao động" (Tìm ca làm + 5 khối của `/for-workers`) / "Nhà tuyển dụng" (Đăng ca tuyển + 5 khối của `/for-employers`, gồm "Phí dịch vụ") · "Cần hỗ trợ?" (Email, Hotline `tel:`, Địa chỉ: nhãn `text-xs` trên giá trị; link cam "Cách phản ánh sự cố →"); lưới `1fr / 3fr / 1.35fr`. `md`: logo | hỗ trợ, ba cột liên kết hàng dưới; điện thoại: logo, hỗ trợ, liên kết 2 cột. Hai cột vai trò thêm lại 03/10 (chủ dự án). Tiêu đề cột chữ thường đậm `text-sm`, KHÔNG eyebrow in hoa. Dưới: đường kẻ, "© 2026 CaLedo Tech" + hàng liên kết pháp lý nhỏ (Điều khoản · Bảo mật · Tranh chấp · Hỗ trợ, tiêu đề ẩn "Pháp lý & hỗ trợ"), rồi dòng trạng thái dữ liệu có chấm màu (demo hổ phách "không có giao dịch thật"; bản thật xanh "giao dịch thật qua PayOS"). Link: hover chữ mực + gạch chân cam dày 2px cách 4px.

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
Nguồn: `LandingProof.tsx` (`LandingProofView`), dữ liệu `proofData.ts`. Đặt ngay trước dải mực kết ở cả 3 trang (`/`: cả hai phía, tông paper; `/for-workers`: lời người lao động, tông cream; `/for-employers`: lời nhà tuyển dụng, tông paper). Gồm: tiêu đề + đoạn dẫn; lưới ảnh 4:3 bo `16px` (`sm` 2 cột, `lg` 3 cột) có chú thích nơi chụp; lưới thẻ lời chia sẻ trắng bo `16px` (`md` 2, `lg` 3 cột): câu trích `text-lg` trong ngoặc kép, dưới là ảnh tròn 44px (hoặc chữ cái đầu trên nền `orange-100`) + tên + vai trò; ghi chú nhỏ về sự đồng ý. **Chỉ điền dữ liệu THẬT, đã xin phép** (`consentDate`); danh sách trống → khối không hiện (không khung trống, không câu mẫu). Ảnh tự chụp để ở `public/images/proof/`.

### Ảnh chia sẻ link (Open Graph, 02/10)
`src/app/opengraph-image.png` (trang chủ, mọi trang không có ảnh riêng dùng chung), `src/app/for-workers/opengraph-image.png`, `src/app/for-employers/opengraph-image.png`, 1200×630, kèm `opengraph-image.alt.txt`. Bố cục: nền kem + hai vòng tròn `--brand-soft` / `orange-50`; trái là logo, tiêu đề hero 58px đậm (không ngắt dòng), một câu phụ, 3–4 chip viền cam; phải là một thẻ minh hoạ trắng bo 28px (biên nhận / thẻ ca / duyệt người) có chữ "Minh hoạ". Tạo lại bằng `node scripts/generate-og-images.mjs http://localhost:<cổng>` khi đổi câu chữ hay màu. Tiêu đề / mô tả thẻ chia sẻ ở `src/lib/shareMeta.ts` + `export const metadata` của từng trang; tên tab trình duyệt vẫn là "CaLẻ".

### Trang chủ: ngân sách chuyển động (03/10)
Chuyển động liên tục chỉ có 3: biên nhận tự diễn vòng đời ca, vòng thẻ loại việc xoay, nền đổi tông khi cuộn. Mọi thứ khác chạy MỘT lần: chữ đánh máy (2 câu), số liệu đếm lên, sơ đồ dòng tiền, và xuất hiện có nhịp — `.hero-in` (màn đầu hiện lần lượt khi tải, trễ 90ms/phần tử theo `--i`), `.m-rise` (trồi 18px + hiện dần, trễ 90ms theo `--i`) + `.m-tick` (dấu ✓ tự vẽ) cho hàng bảng so sánh, 4 thẻ "tiền đi về đâu", mục "CaLẻ làm được gì?" và hai cửa ở dải kết, dùng `MotionGroup` (chỉ ẩn khi `data-motion="armed"`). **Không thêm vòng lặp mới.** Giảm chuyển động → tất cả đứng yên, nội dung đủ.

### Trang vai trò: form tự gõ ví dụ & sơ đồ tiền về tay (03/10)
Nguồn: `ShiftPostPlayground.tsx`, `ApplyPreview.tsx`, `VerifyPreview.tsx`, `PayoutTimeline.tsx`; kịch bản `typingScript.ts` (hàm thuần, có test) + `useTypingScript.ts`. Cả hai trang vai trò bọc `ToneScroll` như trang chủ (khối dùng chung nhận `tone`; `/for-workers`: cream → paper (loại việc) → cream (4 bước) → peach (tìm ca & ứng tuyển) → apricot (xác thực) → paper (tiền về tay) → apricot (đánh giá & uy tín) → cream (ảnh) → peach (tính năng) → paper (FAQ); `/for-employers`: cream → paper → peach (một ca tốn bao nhiêu) → apricot (xác thực) → cream (bạn nắm được gì) → peach (đánh giá & uy tín) → paper → cream).
- **Form tự gõ:** thẻ trắng bo `24px` `shadow-modal` giống minh hoạ hero; ô cao 44px bo `12px`, NHÃN Y HỆT form thật (`form.*`, `verify.*`, `shiftForm.depositSummary.*`). Lần đầu cuộn tới, từng ô được gõ lần lượt (55ms/ký tự, nghỉ 260ms giữa các ô): ô đang gõ viền `orange-400` + vòng `orange-200` + con trỏ cam; nút minh hoạ "được bấm" (`scale-95`) rồi hiện kết quả (badge trạng thái thật). Chạy MỘT lần, xong có "Xem lại" (luôn giữ chỗ). Bản server / giảm chuyển động: trạng thái cuối.
- **"Thử đăng một ca" (`/for-employers`, 3 bước):** thanh 3 bước ở đầu thẻ (`PreviewSteps`: vạch 4px cam / xám + nhãn, bước đã qua có ✓; chạy xong mỗi bước là nút bấm được). ① *Điền ca*: form tự gõ đủ các ô của form thật (tên, loại việc, ngày, địa điểm, giờ, lương, số người, mô tả, yêu cầu, người phụ trách tại chỗ; ô dài gõ nhanh hơn — `charMs`), bảng tiền `orange-50`, dòng số dư ví (xanh "Đủ để giữ" / vàng "Thiếu … — ca được lưu nháp, nạp thêm rồi đăng", nút đăng mờ đi). Giờ, lương, số người là ô thật, sửa được. ② *Tuyển người*: nút đăng biến mất; ví trừ tiền giữ (khung đỏ thoáng qua), thẻ ca như người lao động thấy (tiền mỗi người), người ứng tuyển hiện dần kèm ★ rồi được duyệt, "a/n người đã duyệt", mốc sửa / huỷ tính theo giờ ca. ③ *Ngày làm & sau ca*: dòng thời gian (`TimelineItem`: giờ bên trái, chấm cam + đường nối) — check-in 15 phút trước/sau giờ bắt đầu, ca diễn ra, xác nhận (bản thật: tự chốt sau 24 giờ), đánh giá 14 ngày; ô xanh "Giả sử 1 người không đến" → trả / phí / hoàn. Mốc giờ từ `shiftMilestones` (hằng số `domain/timeGates`). **Khung cố định (03/10, chủ dự án):** ba bước chồng trong một ô lưới (`StageStack` trong `previewParts.tsx`), bước không xem `invisible` + `inert`, nút chuyển bước dồn đáy (`StageNav`, luôn giữ chỗ); các dòng chỉ hiện trong một tình huống (dòng phụ của bảng tiền, dòng số dư ví, dòng "Hoàn về ví", ô mô tả / yêu cầu đang gõ) đều giữ chỗ trước (`Row reserve`, ô nhiều dòng có lớp chữ đầy đủ ẩn). Chiều cao không đổi suốt lúc tự gõ, khi bấm qua 3 bước và khi bật / tắt "1 người không đến". **Khung gọn (03/10, lần 2):** cao cố định bằng bước 2/3 (`StageStack` `h-[43rem] sm:h-[37rem]`); bước 1 chia đôi: các ô điền nằm trong vùng cuộn riêng (thanh cuộn mảnh `orange-300`, mép mờ trắng ở đáy), đang tự gõ thì vùng đó cuộn theo ô đang gõ (chỉ cuộn vùng, không cuộn trang; giảm chuyển động → nhảy thẳng); bảng tiền + dòng số dư + nút "Giữ tiền và đăng ca" ghim ở đáy khung. Bước 2/3 có `Stage scroll` dự phòng cho màn hẹp.
- **"Tìm được ca là ứng tuyển ngay" (`ApplyPreview`, 3 bước):** ① *Tìm ca*: ô tìm + khu vực tự gõ, 2 dòng ca, chọn dòng đầu. ② *Xem chi tiết*: dải tổng tiền cả ca + đơn giá, mô tả / yêu cầu / người phụ trách (lưới nhãn 7.5rem), ô đánh giá quán ★ + một nhận xét, hạn tự huỷ theo giờ ca (bản thật thêm dòng cọc), nút "Ứng tuyển" cam rộng. ③ *Sau khi ứng tuyển*: nút biến mất, badge "Đã ứng tuyển", dòng thời gian: chờ duyệt → được duyệt (hạn tự huỷ) → giờ check-in → check-out → nhận tiền (+180.000 đ xanh; bản thật tự chốt 24 giờ) → đánh giá 14 ngày. Khung cố định `h-[34rem] sm:h-[27rem]`: bước 3 (dòng thời gian) cuộn bên trong và tự cuộn theo mốc mới hiện khi đang tự chạy. `ReviewFlowPreview` giữ khung cao bằng bước dài nhất.
- **Sau ca: đánh giá + uy tín (`ReviewFlowPreview`, cả hai trang, 4 bước):** khối hai cột như các khối khác (chữ + 3 ý bên trái, thẻ bên phải). Thẻ có thanh 4 bước ("Quán chấm", "Người làm chấm", "Sao hiện ra", "Uy tín, kỹ năng") + đầu thẻ ca "Đã hoàn thành". ① ô `orange-50/50`: sao `amber-500` tô lần lượt, nhận xét tự gõ, "Gửi" → "✓ Đã gửi" `green-50`; ② như ① + thẻ nhanh (viền `orange-300` khi chọn); ③ thẻ ứng viên "★ 4,8 · 13 đánh giá" (+1 xanh) và nhận xét về quán; ④ ô `green-50` điểm 85 → 90/100 + dòng luật (+5 / −10 / −20), thanh kỹ năng cam (Phục vụ lên cấp 3). Bản thật: chip mực "Sắp có" ở bước ④ + chú thích. Đánh giá hai chiều có ở cả demo lẫn bản thật (0024). Thay hai thẻ rời (lệch chiều cao) trước đó.
- **An toàn & hỗ trợ (`LandingHelp`):** hai thẻ trắng bo `16px` (icon khiên / dấu hỏi trên ô `orange-50`, tiêu đề + mũi tên, một câu) dẫn tới `/support#support-safety` (lưu ý an toàn) và `/support`, ngay sau hỏi đáp.
- **Lương tham khảo (`JobWageHint`):** dòng chữ nhỏ `orange-800` đậm dưới mô tả thẻ loại việc: "30.000–45.000 đ/giờ · 3 ca đang tuyển", tính từ ca đang tuyển thật (`wageRanges`); không có ca → không hiện.
- **Thứ tự hai cột:** trên điện thoại chữ luôn đi trước minh hoạ; từ `lg` các khối xen kẽ trái/phải bằng `lg:order-last`.
- **Thẻ xác thực (`VerifyPreview`, cả hai trang):** SĐT → "Gửi mã" → dòng "Đã gửi mã…" (giữ chỗ sẵn) → mã 6 số giãn chữ → "Đã xác thực"; CCCD: họ tên, số (dãy số liên tiếp, rõ là ví dụ), 3 ô ảnh viền đứt → xanh + ✓, "Gửi xác thực" → "Đang chờ duyệt". `aria-hidden`, chỉ đọc chú thích. Luồng này chỉ có ở production; bản demo ghi "minh hoạ là luồng xác thực của bản thật".
- **Sơ đồ "Tiền về tay bạn khi nào?" (`/for-workers`):** 5 ô (giữ tiền → làm ca → xác nhận / tự chốt 24 giờ → ví → rút về ngân hàng) dùng chung CSS `flow-*` với sơ đồ dòng tiền trang chủ; điện thoại dọc, máy tính ngang (ô giãn đều, đường nối 24px). Chạy một lần ~1,1 giây/chặng.
- **Ca đang tuyển (`/for-workers#worker-shifts`, `OpenShiftsSection`, 03/10):** ngay sau "Chọn loại việc": tiêu đề + một câu, ô tìm + nút cam "Tìm ca" (gửi `/shifts?q=…`), lưới 6 thẻ ca thật (cùng `ShiftCard`, cùng điều kiện lọc / sắp như `/shifts`), nút viền "Xem tất cả {n} ca →". Chưa nạp dữ liệu → 3 ô giữ chỗ; không có ca → `OpenShiftsEmpty`.
- **`/shifts` (03/10):** thuộc phần người lao động của trang công khai: da `.public-skin` nền trắng ngà, đầu trang không đóng khung (link "← Trang người lao động", tiêu đề `text-3xl/4xl` đậm, một câu), tab "Người lao động" sáng (`NavLink alsoActive`); đọc `?q=` làm từ khoá ban đầu. `/shifts/[id]` vẫn là app.
- **Loại việc (`/for-workers`):** lưới thẻ trắng 72px (ảnh 56px bo `12px` + tên + một dòng mô tả + mũi tên), `sm` 2 cột, `lg` 3 cột, dẫn tới `/shifts?viec=…`; trên lưới là số ca đang tuyển thật (`OpenShiftCount`, 0 ca thì ẩn).
- **Đợt miễn phí (`FeeCampaignNote`):** ô `green-50` viền `green-200` dưới dải cam kết ở hero nhà tuyển dụng, chỉ khi đợt đang chạy.
- Ngân sách chuyển động mỗi trang vai trò: 1 minh hoạ lặp (hero) + nền đổi tông; mọi thứ khác chạy một lần.
- **Thứ tự (03/10, lần 2):** khối 3 ảnh lợi ích đứng ngay sau hero ở cả hai trang (trước "Chọn loại việc" / "Từ lúc đăng ca đến lúc trả tiền"); các khối xen kẽ `cream` / `paper`. `LandingRules` có minh hoạ: không dính khi cuộn, thẻ luật giãn cho hai cột cùng đỉnh cùng đáy. `LandingSteps`: đường nối chạy từ tâm số này tới tâm số sau, nằm dưới vòng tròn (liền mạch).
- **Bốn trang thông tin gộp vào landing (03/10, lần 2):** `/about`, `/how-it-works`, `/pricing`, `/safety` và khung `InfoPage` đã XOÁ; `next.config.ts` chuyển hướng (307):
  - `/how-it-works` → `/#home-how`: dải `LandingSteps` "Bốn bước của một ca" ngay trước "Tiền của một ca đi về đâu?" của trang chủ.
  - `/about` → `/#home-about`: khối "Về CaLẻ" (`HomeAbout.tsx`) ngay sau màn đầu, trước "Vì sao CaLẻ ra đời?" — ba hàng trải hết bề ngang: (1) trái tiêu đề + giới thiệu + "làm cho ai"; phải lưới 2×2 ô thông tin nhanh trên thẻ trắng (Đơn vị phát triển · Đội ngũ {n} thành viên đếm từ `teamData` · Làm việc tại Hà Nội · Giai đoạn) + một dòng chấm màu về phiên bản (xanh = bản thật, cam = bản dùng thử); (2) thanh trượt ngang vòng lặp vô hạn "Đội ngũ" — thẻ gọn: ảnh tròn 96px (chưa có ảnh → hai chữ cái đầu trên nền mực / cam xen kẽ), số thứ tự 01–04, tên, vai trò cam (3 bộ thẻ, nhảy tức thì về bộ giữa khi cuộn xong, hai bộ phụ `aria-hidden`; `lg`: thẻ `19rem`, 3 trọn + một phần thẻ sau) (`about/TeamCarousel.tsx`: thẻ trắng bo `24px` rộng `16–19.5rem`; `scroll-snap`, tự chạy mỗi 4 giây (nghỉ khi di chuột / focus trong khối, 6 giây sau khi người dùng tự cuộn, khi khuất màn hình hoặc tab ẩn; giảm chuyển động → mặc định không chạy), hàng ba nút tròn 44px căn giữa DƯỚI thanh trượt: ‹ · dừng / chạy (`aria-pressed`) · ›, luôn bấm được; dữ liệu `about/teamData.ts`); (3) thẻ trắng `PartnersSection` hai cột: trái tiêu đề h3 + lời rào "chưa xác lập quan hệ đối tác chính thức" + MỘT chú thích (viên viền nét đứt = "Đối tác tiềm năng / định hướng"); phải các nhóm là chip viền nét đứt cam, nhãn định hướng từng nhóm ở dạng `sr-only`. "Chúng tôi làm gì" / "Điều chúng tôi giữ" bỏ vì trùng các khối trên.
  - `/pricing` → `/for-employers#employer-pricing`: `EmployerPricingSection` ngay sau `#employer-payments` — cột trái nhãn "Phí dịch vụ" + tiêu đề + `FeeCampaignNote` + ví dụ (ô trắng) + link "Tính thử với ca của bạn" về `#employer-post`; cột phải hai thẻ giá. Thẻ "0 đ Phí dịch vụ" trong khối dòng tiền bản demo bỏ (còn 3 thẻ, `lg:grid-cols-3`).
  - `/safety` → `/support#support-safety`: "Lưu ý an toàn" (tiêu đề trái dính, thẻ trắng có ô icon) giữa thẻ liên hệ và "Khi có vấn đề trong ca"; "Ưu tiên an toàn / gọi 113" giữ ở bước 1 của khối phản ánh.
  - Menu "Hướng dẫn & hỗ trợ" còn: Câu hỏi thường gặp, Xử lý tranh chấp, Hướng dẫn sử dụng, Cẩm nang, Liên hệ hỗ trợ. Menu "Nhà tuyển dụng" thêm "Phí dịch vụ". Footer cột "CaLẻ" trỏ tới các khối mới.
  - Link nội bộ `/trang#khối` do `HashLinkHandler` (layout) tự xử lý: Next 16.2 giữ hash cũ trong `canonicalUrl` khi điều hướng client tới URL có hash (`/for-workers#a#b`, bấm lại đúng khối thì về đầu trang). Cùng trang: cuộn tới khối + `pushState`; khác trang: điều hướng không kèm hash, vẽ xong mới cuộn + `replaceState`.
- **Khối gộp từ 7 trang hướng dẫn nhỏ (03/10):** `/worker/reputation-guide`, `/worker/schedule-guide`, `/worker/cancellation-policy`, `/employer/post-shift-guide`, `/employer/applicants-guide`, `/employer/payments`, `/employer/reviews` đã XOÁ; `next.config.ts` chuyển hướng (307) về khối tương ứng: `/for-workers#worker-schedule` (Lịch cá nhân), `#worker-cancel` (Quy định huỷ ca), `#worker-reputation` (+ `#worker-reputation-rules`); `/for-employers#employer-post`, `#employer-applicants`, `#employer-payments`, `#employer-reviews`. `ToneScroll` cuộn lại MỘT lần (~300ms) tới khối của `#hash` vì minh hoạ phía trên dựng xong sau lần cuộn đầu của trình duyệt. Minh hoạ mới (`GuidePreviews.tsx`, đứng yên, `aria-hidden` + `figcaption`):
  - `SchedulePreview`: lịch cá nhân chế độ Danh sách trong khung điện thoại (`PhoneFrame`: viền mực bo `2.75rem`, "đảo" camera, màn `gray-50`, bóng `.phone-bezel`) — dải 7 ngày (hôm nay ô cam), 3 thẻ tóm tắt tuần, nhóm theo ngày: giờ bận viền đứt, ca có badge trạng thái đơn; ca trùng giờ bận bị chặn (ô đỏ viền đứt) CHỈ ở bản demo.
  - `CancelWindowPreview` (cột trái của `LandingRules`, prop `aside`): thanh 3 đoạn xanh / hổ phách / đỏ theo mốc thật (`shiftMilestones`: tự huỷ trước 14:00, cần đồng ý 14:00–17:00, vắng mặt sau 17:15), nhãn chữ dưới mỗi đoạn, mũi "15:20" + ô hổ phách giải thích việc xảy ra lúc đó.
  - `ApplicantPreview`: thẻ quản lý ca — ứng viên chờ duyệt (ô `orange-50/60`, chip thông tin đúng theo bản: bản thật số ca đã làm với bạn / số lần vắng / việc ưa thích; demo uy tín / kỹ năng / xác thực), nút Duyệt cam + Từ chối viền; dưới là người đã duyệt "Có mặt" (xanh) / "Vắng mặt" (đỏ, phần tiền hoàn về ví).
  - `ReputationPreview` (cột trái của `#worker-reputation-rules`): thẻ "Điểm uy tín của bạn" 80/100 + chip xanh "Được ưu tiên"; thước 0–100 ba đoạn (đỏ nhạt dưới 50 "tạm khoá", xám, xanh từ 80 "ưu tiên"), chấm mực ở điểm hiện tại; 4 thay đổi gần nhất theo luật thật (+5 / −10 / −20, chip theo tông, "→ điểm sau"). Bản thật: chip mực "Sắp có" + chú thích "khi tính năng mở".
  - `ShiftControlPreview` (`#employer-control`, `LandingFeatures` có `aside` → hai cột: tiêu đề + 4 ý (lưới 2 cột) bên trái, thẻ bên phải): tên ca + badge `info` "Đang diễn ra" (không xuống dòng), lịch tuyển dụng 7 ngày (ca đang xem ô `orange-50` viền `orange-300`, ca khác vạch `blue-200`), lịch sử ví 3 dòng (giữ đỏ / hoàn xanh / nạp xanh; bản thật cộng phí 10%, demo ghi "(mô phỏng)"), nút viền "Đăng lại ca này".
  - `/for-employers#employer-payments` (`EmployerPaymentsSection`): `MoneyFlowDiagram` của trang chủ + 4 thẻ luật (chip giá trị theo tông). Trang `/for-workers` bỏ khối "Làm theo ca mà vẫn yên tâm" (trùng các khối mới); `/for-employers` bỏ 2 ý trùng ở "Bạn nắm được mọi thứ trong ca".

### Hiện dần khi cuộn (03/10)
Nguồn: `components/landing/useScrollReveal.ts` (gắn trong `ToneScroll` → mọi trang công khai dùng khung đó), CSS `[data-reveal]` trong `globals.css`. Trong mỗi khối trừ màn đầu: `h2`, đoạn ngay sau `h2`, mục cấp một của danh sách, `figure`, `img`, `[data-reveal-item]` — chỉ những phần tử nằm DƯỚI màn hình lúc tải. Tới vạch 90% chiều cao màn hình: trượt lên 16px + rõ dần (500/600ms, `cubic-bezier(0.22,1,0.36,1)`), các phần tử cùng khung hình nối nhau 70ms (tối đa 6 bậc), xong thì gỡ thuộc tính. Đo bằng `getBoundingClientRect` khi cuộn (không dựa IntersectionObserver: rootMargin bị bỏ qua trong iframe khác nguồn). Bỏ qua khối đã có chuyển động riêng (`[data-motion]`, `[data-reveal-skip]` — vd vòng thẻ loại việc `JobRing` —, `m-*`, `hero-in`, `motion-*`, ruột minh hoạ `aria-hidden`), menu, `details` đóng, thanh trượt ngang. Giảm chuyển động: không chạy. `MotionGroup` cũng có thêm kiểm tra khi cuộn làm dự phòng (khối không còn nằm trống).

### Landing: chữ đánh máy khi cuộn tới (02/10)
Nguồn: `TypeOnView.tsx`, khối "Chữ đánh máy" trong `globals.css`. **Dùng tiết chế — mỗi trang đúng 2 câu:** tiêu đề lời hứa giữa trang + câu chốt cuối trang (`/`: "Ca làm cho nhiều loại việc", "Bắt đầu từ phía của bạn"; `/for-workers`: "Tiền về tay bạn khi nào?", "Bạn cần tuyển người?"; `/for-employers`: "Một ca tốn bao nhiêu?", "Sẵn sàng đăng ca đầu tiên?"). Lần đầu cuộn tới, câu hiện dần từng ký tự (0,35–1,5 giây), con trỏ cam `var(--brand)` rộng 3px, gõ xong mờ dần. **Không** dùng cho đoạn văn, danh sách, thẻ, FAQ, số tiền, nút: chữ cần đọc phải hiện ngay (thử nghiệm gõ mọi chỗ 02/10: cuộn nhanh trên điện thoại gặp cả khối trống, nhiều con trỏ cùng chạy). Khối đã trong màn hình lúc tải không gõ; giảm chuyển động → hiện đủ chữ. Chữ thật luôn ở DOM (trong suốt khi gõ), không xô lệch bố cục.

### Landing: vòng thẻ loại việc (trang chủ, 02/10)
Nguồn: `JobRing.tsx`, `homeJobs.ts`, khối "vòng thẻ loại việc" trong `globals.css`.
- **Vòng:** dải thẻ tràn hết bề ngang màn hình, uốn như mặt trong một vòng tròn (thẻ giữa lùi xa, thẻ hai mép to hơn và nghiêng vào trong), hai mép mờ dần vào nền bằng mask. Tự xoay liên tục thành vòng lặp (~46px cung/giây); dừng khi rê chuột, focus bàn phím, đã chọn thẻ, bấm "Tạm dừng", ra khỏi màn hình hoặc tab ẩn. Giảm chuyển động → không tự xoay. Kéo ngang để xoay (có quán tính); nút tròn ‹ ⏸ › viền xám ở dưới.
- **Thẻ:** ảnh dọc 4:5 bo `16px`, bóng `shadow-modal`, lớp phủ tối dưới đáy (`.job-scrim`, màu cố định) + tên việc + 1 dòng mô tả (giữ chỗ 2 dòng). Thẻ đang chọn có viền cam `ring-4 ring-brand`.
- **Tìm ca theo loại việc:** nút "Tìm ca làm" trong khung chi tiết mở `/shifts?viec=<slug>` (`lib/jobTypeSlug.ts`) — `/shifts` chọn sẵn loại việc đó; Phụ bếp, Dọn dẹp (đăng dưới "Khác") mở `/shifts` không lọc.
- **Lối đi thẳng:** dưới hàng nút ‹ ⏸ › là hai liên kết chữ "Xem ca đang tuyển →" (cam) và "Đăng ca tuyển →" (mực), không bắt khách ấn thẻ mới thấy đường đi tiếp.
- **Khung chi tiết:** ấn thẻ → vòng dừng, thẻ về giữa, bên dưới hiện khung trắng bo `24px`: tên việc + mô tả, 3 cột (điện thoại: xếp dọc) "1. Việc gồm gì / 2. Một ca thường thế nào / 3. Cần gì để làm" có gạch trên cam nhạt, nút cam "Tìm ca làm" + nút viền "Đăng ca loại này", ghi chú "Mô tả chung…". Nút X hoặc ấn lại thẻ để đóng.
- **Ảnh:** người châu Á, ưu tiên bối cảnh Việt Nam (yêu cầu 02/10); nguồn ở `docs/IMAGE_CREDITS.md`.

### Lịch cá nhân / lịch tuyển dụng (03/10)
Nguồn: `src/components/calendar/*` (`CalendarShell`, `CalendarToolbar`, `WeekView`, `DayView`, `AgendaView`, `SchedulePieces`, `calendarModel`), trang `/worker/schedule`, `/employer/schedule`. Chế độ **Operate** nhưng cùng ngôn ngữ với landing.
- **Đầu trang:** tiêu đề (không thêm dòng nhãn phía trên — trùng ý tiêu đề) `text-3xl`/`sm:text-4xl` đậm, một câu mô tả, tóm tắt tuần đang xem thành các thẻ trên một hàng riêng trải hết bề ngang (thẳng mép trái lịch, mép phải cột bên) (`ScheduleSummary`: 4 thẻ → lưới 2 cột / `sm` 4 cột, 3 thẻ → 3 cột mọi cỡ, thẻ trắng bo `16px`, nhãn `text-xs` + số `text-2xl` đậm; thẻ cần chú ý nền `amber-50`, số `amber-800`). Người lao động: ca đã nhận, giờ làm, tiền công dự kiến, đơn chờ duyệt. Nhà tuyển dụng: số ca, người đã nhận / cần, ca còn thiếu người. Nút "Hướng dẫn sử dụng" bên phải.
- **Bố cục:** thanh công cụ trải hết bề ngang phía trên; dưới đó lịch là phần chính (cột trái), cột phải 19.5rem từ `lg`: lịch tháng nhỏ, "Sắp tới" (5 mục gần nhất, chấm màu theo loại), chú giải (nhà tuyển dụng 6 nhãn → 2 cột). Hai cột bắt đầu và kết thúc cùng một đường: khối cuối mỗi cột giãn ra (`lg:flex-1`), không để thừa một khúc lịch hay cột phụ. Điện thoại: cột phải xuống dưới lịch.
- **Thanh công cụ:** thẻ trắng bo `16px`; ‹ "Hôm nay" › + khoảng ngày; nút chế độ Ngày / Tuần / Danh sách trên nền `orange-50`, chế độ đang chọn là ô trắng nổi; nút hành động cam ("Thêm lịch trình" / "Đăng ca cần tuyển"). Điện thoại mặc định **Danh sách**.
- **Lưới giờ:** 24 giờ chia **4 cụm đều nhau** 6 giờ — Đêm 00–06, Sáng 06–12, Chiều 12–18, Tối 18–24 (`DAY_QUARTERS`); mỗi giờ 24px (cụm 144px, cả ngày ~576px), kẻ cụm `gray-200`, vạch mờ từng giờ `--hour-line` (có bản tối). Cột giờ ghi tên cụm + giờ bắt đầu. Đầu cột ngày: thứ + "dd/MM" (hôm nay: ô cam). Vạch "bây giờ" cam (chấm + đường 2px) trong cột hôm nay, đọc giờ một lần khi mở trang. Bấm ô trống → khung 1 giờ đúng chỗ bấm (người lao động: thêm lịch bận / rảnh). Bỏ ô "Tuỳ chỉnh khung giờ".
- **Tuần trống:** hộp trắng giữa lưới với một câu + hành động ("Tìm ca" / "Thêm lịch trình"; "Đăng ca cần tuyển"). **Danh sách:** hiện đủ 7 ngày, ngày trống là ô viền đứt "Ngày trống." + hành động (ngày đã qua chỉ ghi "Ngày trống."); tiêu đề là khoảng 7 ngày đang xem.
- **Bấm một mục:** hộp chi tiết (`EventPeek`, dùng `Modal`): nhãn trạng thái đúng tông, Thời gian / Địa điểm / Tiền công cả ca (người lao động) hoặc Người đã nhận (nhà tuyển dụng), ghi chú "Check-in mở từ hh:mm, 15 phút trước giờ bắt đầu", nút "Mở trang ca" / "Mở trang quản lý ca"; lịch bận / rảnh thì nhãn loại (Lịch bận / Lịch rảnh) + Xoá (bấm lần hai mới xoá, nút chuyển đỏ "Bấm lần nữa để xoá") / Chỉnh sửa. Ghi chú check-in chỉ cho ca sắp tới. Ca quá hạn vẽ xám (khớp chú giải "Đã quá hạn"), không đỏ gạch ngang như ca huỷ.
- Danh sách đầy đủ lịch bận / rảnh của người lao động thu vào mục mở rộng dưới lịch.

### Trang hướng dẫn, bảng giá, đăng nhập, cẩm nang (03/10)
Chế độ **Read**, cùng ngôn ngữ với trang vai trò: trang bọc `ToneScroll`, mỗi khối khai báo `data-tone` (cream / paper / peach / apricot), không còn khung hẹp hay nền động (`InfoPage` đã xoá 03/10).
- **`GuideHero`** (`components/landing/GuideHero.tsx`): đầu trang nền kem `hero-decor` — dòng nhãn cam `text-sm`, tiêu đề `text-3xl`→`lg:text-5xl` đậm, một đoạn dẫn, 1–2 nút (cam chính + viền trắng); tuỳ chọn minh hoạ bên phải từ `lg` (thẻ tự diễn của landing). Dùng cho `/user-guide`, `/handbook`, `/support`, `/faq` (7 trang hướng dẫn nhỏ và `/about`, `/how-it-works`, `/pricing`, `/safety` đã gộp vào landing, 03/10).
- **Trang pháp lý `/terms`, `/privacy`, `/disputes` (03/10, lần 2)** — khung riêng trong `components/landing/LegalArticle.tsx` + `components/legal/` (`legalChrome.tsx`, `LegalScrollUI.tsx`), câu chữ pháp lý GIỮ NGUYÊN văn, chỉ đổi cách trình bày; KHÔNG có ô tóm tắt (chủ dự án bỏ):
  - `LegalHero`: thanh chuyển 3 tài liệu dạng viên thuốc trắng (trang đang xem nền mực, `aria-current="page"`), nhãn cam "Pháp lý", tiêu đề `text-3xl`→`lg:text-5xl`, đoạn dẫn, chip thông tin ("Áp dụng cho: bản dùng thử" / bản thật "bản thử nghiệm giới hạn (Beta)", "{n} mục").
  - `LegalArticle`: từ `lg` mục lục dính bên trái (số 01.. + tên mục, mục đang đọc viền trái cam + chữ đậm, `aria-current="location"`), bài bên phải; mỗi mục có số lớn cam ở lề trái (điện thoại: số nằm trên tiêu đề), tiêu đề bỏ số "1. " đầu; các mục ngăn bằng đường kẻ mảnh. Vạch tiến độ đọc cam 4px cố định trên cùng màn hình (`aria-hidden`).
  - Khối trong mục: `LegalCards` (thẻ trắng có ô icon; ✕ đỏ cho điều cấm, ✓ xanh cho quyền), `LegalSteps` (dòng thời gian số trong vòng mực), `LegalDefs` (bảng nhãn / nội dung tách ở dấu ":"), `LegalSentences` (đoạn rất dài ngắt từng câu, vd "Giữ cọc" bản thật), `LegalCallout` (ô cam nhạt, số lớn trong thẻ trắng, vd "7 ngày").
  - `LegalEnd`: thẻ mực "Còn thắc mắc?" (email, hotline, giờ trực như `/support`, link trang hỗ trợ) + hai thẻ trắng "Đọc tiếp" tới hai tài liệu còn lại.
- **`LandingRules`** (`LandingSections.tsx`): tiêu đề bên trái (dính khi cuộn), bên phải các thẻ trắng bo `24px`, mỗi thẻ một chip giá trị theo tông (`good` xanh lá / `warn` hổ phách / `bad` đỏ / `neutral` xám) + tiêu đề + mô tả. Dùng cho mốc huỷ ca, điểm uy tín, quy tắc trả / hoàn tiền.
- **Bảng giá (`#employer-pricing`, không còn trang riêng):** hai thẻ giá h3 (người lao động nền trắng, nhà tuyển dụng nền `orange-50`), giá `text-4xl`→`sm:text-5xl` đậm, gạch đầu dòng dấu tích xanh; form tính thử là `ShiftPostPlayground` ở `#employer-post`.
- **Đăng nhập / đăng ký / quên mật khẩu (`AuthShell` + `AuthSidePanel`):** nền kem `hero-decor`, từ `lg` hai cột: giới thiệu bên trái (dính khi cuộn), thẻ form trắng bo `24px` bên phải; điện thoại form lên trước. Đăng ký: giới thiệu đổi theo vai trò đang chọn (3 lợi ích có ô icon `orange-100` + "Sau khi đăng ký" 3 bước số tròn mực). Đăng nhập: 2 thẻ "Người lao động / Nhà tuyển dụng". Dòng ghi chú cuối theo chế độ dữ liệu.
- **Cẩm nang:** công tắc Người lao động / Nhà tuyển dụng cùng kiểu `RoleSwitch` (viên thuốc tròn nền trắng, ô đang chọn nền mực), căn giữa trên cùng phần đầu trang (`GuideHero` prop `top`); danh mục là hàng chip tròn (đang chọn nền mực, chữ trắng; cuộn ngang trên điện thoại); bài nổi bật là thẻ sáng hai cột (ảnh | chữ), không phủ chữ lên ảnh tối; thẻ bài bo `24px`. Trang bài: chữ căn trái (không căn đều), cột đọc ~70 ký tự, ghi chú là khối viền trái cam `orange-50`; bài về tiền ở bản demo có hộp hổ phách "Bản demo: … mô phỏng" đầu bài.
- **`/user-guide`:** 5 bước mỗi vai trò (`LandingSteps`), rồi thẻ trắng giải thích từng ô dashboard — giữ `id` để link `#…` nhảy tới (`scroll-mt-24`), "Ví dụ:" trong ô `orange-50`, tính năng đã có trang riêng thì thẻ dẫn sang trang đó.

### Dashboard người lao động / nhà tuyển dụng (03/10)
Chế độ **Operate**. Hai trang dùng CHUNG khung `components/dashboard/DashboardFrame.tsx`, MỘT cột (không cột phụ lệch chiều cao):
- **`DashboardHeader`:** không đóng khung; tiêu đề `text-3xl/4xl` đậm ("Xin chào, {tên}" / tên cơ sở) + một dòng trạng thái (nhà tuyển dụng: đơn chờ duyệt → ca tiếp theo → lời chào; người lao động: ca tiếp theo → đơn chờ → lời chào). Bên phải: Hướng dẫn + lịch (viền). **Không** lặp nút cam — thanh điều hướng đã có.
- **`DashboardTiles`:** hàng thẻ trắng bo `24px` cao bằng nhau, mỗi thẻ: nhãn `text-sm`, số `text-2xl/3xl` đậm, "Xem chi tiết →" dưới đáy; thẻ cuối là ví (`WalletPanel variant="tile"`: số dư + 3 nút chữ, không danh sách giao dịch). Người lao động: Ca đã hoàn thành / Tổng thu nhập / Điểm uy tín / Ví. Nhà tuyển dụng: Ca đã đăng / Ca đã hoàn thành / Tiền công đã trả / Ví (bản thật ẩn ô không có số thật). Điện thoại 2 cột, ô lẻ cuối + ô ví trải 2 cột.
- **Khối (`DashboardSection`: tiêu đề + số đếm + link phải), trải hết bề ngang:** người lao động "Ca làm sắp tới" (lưới 2 cột, ca gần nhất đầu tiên, nút Check-in / Check-out) → "Đánh giá nhà tuyển dụng" → "Đơn ứng tuyển" (`SegmentedTabs` "Chờ duyệt n / Đơn không thành n") → "Ca làm phù hợp" → "Kỹ năng & giữ uy tín" (dòng hạn mức huỷ + 3 kỹ năng một hàng). Nhà tuyển dụng "Ca làm sắp tới" → "Đơn chờ duyệt" gom theo ca → "Đánh giá về bạn" (sao trung bình bên trái, 2 nhận xét mới nhất bên phải). Khối trống: `DashboardEmpty` / `DashboardNote`.
- **Thông báo:** chỉ ở chuông trên thanh điều hướng (bỏ bảng trong dashboard). Mục chưa đọc = chấm cam + tiêu đề đậm (không tô nền cả dòng); giờ tương đối ("25 phút trước", "Hôm qua 16:05", "10/07", `lib/notificationTime.ts`).

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
