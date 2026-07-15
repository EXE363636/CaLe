# Requirements Document

## Introduction

Tính năng **Visual A11y Polish Round 2** (Tinh chỉnh thẩm mỹ & trợ năng — Đợt 2) là đợt
**đánh bóng trình bày và khả năng truy cập (a11y)** tiếp nối spec `frontend-visual-polish`
đã hoàn tất. Sau đợt trước, một lượt QA thị giác + rà soát mã ở mức a11y trên 11 route và
các component dùng chung của web CaLẻ / Now (Next.js 16 App Router, React 19, Tailwind CSS 4
cấu hình qua `@theme` trong `src/app/globals.css`, state Zustand) đã phát hiện các khiếm
khuyết trình bày/trợ năng còn sót. Đợt này khắc phục các khiếm khuyết đó — KHÔNG thiết kế
lại, KHÔNG thay đổi hành vi, luồng nghiệp vụ, hay dữ liệu.

**Nguồn sự thật palette là runtime (đã chốt, không mở lại).** Bảng màu đang triển khai trong
`src/app/globals.css` (`:root` + `@theme`) là nguồn chuẩn (canonical) DUY NHẤT. Bảng giá trị
chuẩn:

| Vai trò | Giá trị chuẩn | Ánh xạ Tailwind |
|---|---|---|
| Dark / mực (ink) | `#37373B` | `gray-900`, `slate-900` |
| Primary / cam thương hiệu | `#FF9A5F` | `orange-500` |
| Neutral | `#FFD5AE` | `orange-200` |
| Background / kem | `#FFF4E9` | `--background` |

Ramp cam đã remap trong `@theme`: `orange-600 = #ea580c`, `orange-700 = #c2410c` (đuôi
600–900 giữ gần mặc định để chữ cam trên nền sáng còn đọc được).

**LAN CAN KHÓA (guardrail, không được vi phạm):** nền cam chính/đang-chọn dùng cam ĐẶC
`#FF9A5F` + chữ TỐI `#37373B` — KHÔNG BAO GIỜ chữ trắng trên cam sáng, KHÔNG BAO GIỜ dùng
`#f97316`, KHÔNG BAO GIỜ dùng gradient cho nút primary. Cặp `#37373B` trên `#FF9A5F` đo được
≈ 5.9:1 (đạt WCAG AA) — đây là cấu hình ĐÚNG đã xác nhận. Nếu công cụ dò tương phản
(detector) cảnh báo "chữ tối trên `#FF9A5F`", coi đó là **false-positive đã ghi nhận** và
KHÔNG được vì cảnh báo đó mà đổi lại chữ trắng.

**Tổ chức theo ưu tiên.** Yêu cầu được nhóm theo mức ưu tiên người dùng đã gán: **P1** (bắt
buộc sửa — WCAG AA / guardrail trên phần tử tương tác), **P2** (nên sửa), **P3** (đánh bóng).
Thứ tự thực thi và cổng kiểm chứng là **P1 → kiểm chứng → P2 → kiểm chứng → P3 → kiểm chứng**
(Yêu cầu 12). Mỗi tiêu chí được neo vào component/route thật và tỉ lệ tương phản đo được để
có thể kiểm chứng.

**Ngoài phạm vi (OUT-OF-SCOPE) — xem Yêu cầu 11.** Đây là đợt CHỈ thay đổi lớp trình bày và
a11y (className / Tailwind / CSS / markup thuần tạo kiểu). KHÔNG sửa logic, store, domain,
dữ liệu mock/seed, nghiệp vụ tài chính/uy tín/chấm công/thông báo, logic `src/lib`, nội dung
chuỗi i18n, `src/types`, event handler, hợp đồng props/dữ liệu, hay đích điều hướng. KHÔNG
đụng backend/Supabase. KHÔNG liên quan AI. KHÔNG commit.

## Glossary

- **CaLe_UI**: Toàn bộ giao diện frontend đã render của CaLẻ — mọi trang trong `src/app` và mọi component trong `src/components`.
- **Presentation_Layer**: Lớp trình bày được phép thay đổi — `className`/tiện ích Tailwind, CSS trong `src/app/globals.css`, và markup JSX thuần tạo kiểu (wrapper, container bố cục, phần tử trang trí `aria-hidden`).
- **Runtime_Palette**: Bảng màu chuẩn khai báo trong `src/app/globals.css` (`:root` + `@theme`) — nguồn sự thật duy nhất.
- **Brand_Orange**: Cam thương hiệu đặc `#FF9A5F` (tiện ích `orange-500`).
- **Deep_Orange**: Cam đậm `#ea580c` (tiện ích `orange-600`).
- **Darker_Orange**: Cam đậm hơn `#c2410c` (tiện ích `orange-700`).
- **Dark_Ink**: Mực tối `#37373B` (tiện ích `gray-900`).
- **Button_Primitive**: Component nút dùng chung tại `src/components/ui/Button.tsx` (các biến thể primary/secondary/ghost/danger; cỡ sm/md/lg).
- **StarRating**: Component đánh giá sao tại `src/components/ui/StarRating.tsx`.
- **CalendarToolbar**: Thanh công cụ lịch tại `src/components/calendar/CalendarToolbar.tsx` (có bộ chuyển view Ngày/Tuần/Agenda).
- **MiniMonthCalendar**: Lịch tháng thu nhỏ tại `src/components/calendar/MiniMonthCalendar.tsx` (ô ngày được chọn + chevron trước/sau + liên kết "Hôm nay").
- **CalendarEventCard**: Thẻ sự kiện lịch tại `src/components/calendar/CalendarEventCard.tsx`.
- **CalendarLegend**: Chú giải màu lịch tại `src/components/calendar/CalendarLegend.tsx`.
- **WeekView**: Bảng lịch tuần tại `src/components/calendar/WeekView.tsx` (ô slot trống có thể nhấn + thẻ sự kiện).
- **ShiftCard**: Thẻ ca làm tại `src/components/shift/ShiftCard.tsx` (có dòng tiền công).
- **WorkerSummaryRow**: Hàng tóm tắt ứng viên tại `src/components/user/WorkerSummaryRow.tsx` (nút tên + liên kết "+N", render bằng `Card`).
- **ShiftForm**: Biểu mẫu đăng ca tại `src/components/forms/ShiftForm.tsx`; **FormSection** là thẻ nhóm trường bên trong nó; có các khối cảnh báo/callout nền cam.
- **NavBar**: Điều hướng desktop tại `src/components/layout/NavBar.tsx` (phụ đề "by CaLedo Tech" đã dùng `text-gray-500`).
- **MobileNav**: Ngăn kéo điều hướng mobile tại `src/components/layout/MobileNav.tsx` (phụ đề "by CaLedo Tech" đang dùng `text-gray-400`).
- **Admin_Dashboard**: Route `/admin/dashboard` (`src/app/admin/dashboard/page.tsx`), gồm component nội bộ `TabButton`, các `<select>` sắp xếp, dấu thời gian, và nút liên kết tên người dùng.
- **Shifts_Listing**: Route `/shifts` (`src/app/shifts/page.tsx`), gồm các nút chuyển chế độ sắp xếp và lưới thẻ ca.
- **Register_Page / Login_Page**: Route `/register` (`src/app/register/page.tsx`) và `/login` (`src/app/login/page.tsx`), gồm các liên kết xác thực và thẻ chọn loại nhà tuyển dụng.
- **Worker_Profile**: Route `/worker/profile` (`src/app/worker/profile/page.tsx`), gồm ngày tháng của lịch sử đánh giá và thẻ xác minh có các hàng con.
- **Employer_Shift_Detail**: Trang chi tiết ca phía nhà tuyển dụng, gồm mục "bucket" ứng viên chứa `WorkerSummaryRow`.
- **Focus_Ring**: Vòng tiêu điểm bàn phím — hợp đồng chuẩn `focus-visible:ring-2` màu `ring-orange-400` kèm `ring-offset` (offset ≥ 1px; nút/điều khiển dùng `ring-offset-2`, trường nhập dùng `ring-offset-1`).
- **Touch_Target**: Vùng chạm hữu hiệu (hộp tương tác tính cả đệm) của một phần tử tương tác, đo bằng CSS pixel.
- **Reduced_Motion**: Thiết lập hệ thống `prefers-reduced-motion: reduce`.
- **Contrast_Ratio**: Tỉ lệ tương phản màu theo WCAG 2.1, đo giữa màu chữ/đối tượng và nền phía sau.
- **Semantic_Status_Color**: Màu trạng thái ngữ nghĩa (info/warning/success/danger/neutral) đi kèm một nhãn chữ.
- **Baseline**: Trạng thái dự án ngay trước khi bắt đầu đợt đánh bóng này, dùng để so lỗi build/lint/type và số lượng test.
- **Web_Main_Baseline**: Mã ứng dụng cũ nhúng trong thư mục `Web-main/` (thiếu `react-router-dom`; lint `Math.random`) — các lỗi có sẵn của nó thuộc Baseline và NẰM NGOÀI phạm vi đợt này.
- **Quality_Gate**: Cổng chất lượng chạy sau mỗi nhóm ưu tiên (ESLint trên `src`, kiểm tra tương phản/detector trên tệp đã đụng, test component liên quan, và `tsc`).

---

## Nhóm P1 — Bắt buộc sửa (WCAG AA / guardrail trên phần tử tương tác)

### Requirement 1: Loại bỏ chữ trắng trên nền cam sáng ở phần tử tương tác/đang-chọn

**Ưu tiên:** P1

**User Story:** Là người dùng đọc nhãn trên các điều khiển cam, tôi muốn chữ trên nền cam sáng đủ tương phản, để tôi đọc được nhãn của nút và ô đang chọn.

#### Acceptance Criteria

1. THE CaLe_UI SHALL render chữ trên mọi bề mặt tương tác hoặc đang-chọn có nền `bg-orange-500` (Brand_Orange `#FF9A5F`) bằng Dark_Ink `text-gray-900` (`#37373B`), và SHALL KHÔNG dùng chữ trắng (`text-white`) trên các bề mặt đó.
2. THE CalendarToolbar SHALL render nút chuyển view đang hoạt động (trạng thái `active`, `aria-pressed="true"`) bằng nền `bg-orange-500` với chữ `text-gray-900`, thay cho cặp `bg-orange-500 text-white` hiện tại.
3. THE MiniMonthCalendar SHALL render ô ngày đang được chọn (`isSelected`) bằng nền `bg-orange-500` với chữ `text-gray-900`, thay cho cặp `bg-orange-500 text-white` hiện tại.
4. WHEN quy tắc P1 được áp dụng trên các bề mặt worker và employer chứa CalendarToolbar và MiniMonthCalendar (gồm `/worker/schedule` và `/employer/schedule`), THE CaLe_UI SHALL hiển thị chữ Dark_Ink trên nền Brand_Orange ở cả nút chuyển view đang hoạt động lẫn ô ngày đang chọn.
5. WHEN một phép tìm kiếm tĩnh trên `src/components` và `src/app` tìm chuỗi lớp `bg-orange-500 text-white` (chữ trắng đặt cùng nền cam sáng), THE CaLe_UI SHALL không còn kết quả nào sau khi hoàn tất nhóm P1.
6. THE CaLe_UI SHALL giữ cặp Dark_Ink `#37373B` trên nền Brand_Orange `#FF9A5F` (Contrast_Ratio đo được ≈ 5.9:1, đạt WCAG AA ≥ 4.5:1) làm cấu hình chuẩn cho bề mặt cam đặc, và SHALL KHÔNG hoàn nguyên các bề mặt này sang chữ trắng, sang màu `#f97316`, hay sang nền gradient.
7. IF một công cụ dò tương phản gắn cờ cặp Dark_Ink trên Brand_Orange là vi phạm, THEN THE CaLe_UI SHALL coi cảnh báo đó là false-positive đã ghi nhận và giữ nguyên cặp màu chuẩn.

### Requirement 2: Tương phản chữ cam trên nền sáng đạt WCAG AA

**Ưu tiên:** P1

**User Story:** Là người dùng có thị lực hạn chế, tôi muốn chữ cam cỡ thường trên nền sáng đủ tương phản, để tôi đọc được tiền công, liên kết và nhãn điều khiển.

#### Acceptance Criteria

1. THE CaLe_UI SHALL render chữ thường và chữ nhỏ (cỡ < 24px ở weight thường, hoặc < 18.66px ở weight đậm) mang màu cam trên nền sáng bằng Darker_Orange `text-orange-700` (`#c2410c`, Contrast_Ratio ≈ 5.35:1 trên nền trắng, đạt ≥ 4.5:1), thay cho Deep_Orange `text-orange-600` (`#ea580c`, ≈ 3.56:1, không đạt 4.5:1).
2. THE Button_Primitive SHALL render nhãn chữ của biến thể `secondary` bằng `text-orange-700` trên nền trắng, giữ nguyên viền cam `border-orange-500`.
3. THE ShiftCard SHALL render dòng tiền công (`{formatVND(...)}{/giờ}`) bằng `text-orange-700`.
4. THE WorkerSummaryRow SHALL render liên kết "+N" (kỹ năng còn lại) bằng `text-orange-700`, và SHALL render trạng thái hover của nút tên ứng viên bằng `hover:text-orange-700`.
5. THE MiniMonthCalendar SHALL render liên kết "Hôm nay" bằng `text-orange-700`.
6. THE Login_Page và THE Register_Page SHALL render các liên kết xác thực cỡ thường (ví dụ chuyển giữa đăng nhập và đăng ký) bằng `text-orange-700`.
7. THE Admin_Dashboard SHALL render các nút-liên kết tên người dùng cỡ thường bằng `text-orange-700`.
8. WHERE chữ cam là chữ lớn (≥ 24px ở weight thường, hoặc ≥ 18.66px ở weight đậm) và đạt Contrast_Ratio ≥ 3:1 so với nền, THE CaLe_UI SHALL cho phép giữ `text-orange-600` cho chữ đó.
9. THE CaLe_UI SHALL bảo đảm mọi chữ cam cỡ thường/nhỏ trên nền sáng trong phạm vi đợt này đạt Contrast_Ratio ≥ 4.5:1 so với nền phía sau.

---

## Nhóm P2 — Nên sửa

### Requirement 3: Tương phản chữ meta (thông tin thật) đạt WCAG AA

**Ưu tiên:** P2

**User Story:** Là người dùng, tôi muốn các dòng thông tin phụ (ngày tháng, dấu thời gian, phụ đề) đủ tương phản, để tôi đọc được thông tin thật đang hiển thị.

#### Acceptance Criteria

1. THE CaLe_UI SHALL render chữ mang thông tin thật đang hiển thị bằng `text-gray-500` (`#6b7280`, Contrast_Ratio ≈ 4.8:1 trên nền trắng, đạt ≥ 4.5:1), thay cho `text-gray-400` (`#9ca3af`, ≈ 2.5:1, không đạt).
2. THE Worker_Profile SHALL render ngày tháng trong lịch sử đánh giá bằng `text-gray-500`.
3. THE Admin_Dashboard SHALL render các dấu thời gian bằng `text-gray-500`.
4. THE MobileNav SHALL render phụ đề "by CaLedo Tech" bằng `text-gray-500`, đồng bộ với NavBar (đã dùng `text-gray-500`).
5. WHERE một chữ ở màu `text-gray-400` là placeholder thật, là chữ trong control ở trạng thái disabled, hoặc là icon trang trí `aria-hidden`, THE CaLe_UI SHALL cho phép giữ `text-gray-400`.
6. WHERE một dòng gợi ý (hint) của thẻ loại nhà tuyển dụng đang-chọn trên Register_Page nằm trên nền `bg-orange-50` (cặp `text-gray-500` trên `bg-orange-50` đo được ≈ 4.1:1, không đạt 4.5:1), THE Register_Page SHALL render dòng gợi ý đó bằng màu đậm hơn `text-gray-600` để đạt Contrast_Ratio ≥ 4.5:1.

### Requirement 4: Vùng chạm tối thiểu cho hành động quan trọng trên mobile

**Ưu tiên:** P2

**User Story:** Là người dùng thao tác trên điện thoại, tôi muốn các nút hành động quan trọng đủ lớn để chạm, để tôi thao tác chính xác mà không bấm nhầm.

#### Acceptance Criteria

1. THE CaLe_UI SHALL định nghĩa một chính sách vùng chạm cho `Button_Primitive` cỡ `sm` (hiện `min-h-[36px]`) sao cho các hành động quan trọng trên mobile đạt Touch_Target ≥ 44×44 CSS px, trong khi các bề mặt desktop dày (dense) được phép giữ chiều cao 36px.
2. WHILE chiều rộng khung nhìn < 768px, THE CaLe_UI SHALL bảo đảm mỗi nút hành động theo hàng thuộc nhóm quan trọng trên mobile — worker check-in, worker check-out, employer duyệt (approve), employer từ chối (reject), và employer đánh dấu có mặt (mark-present) — có Touch_Target ≥ 44×44 CSS px, kể cả khi kích thước hiển thị nhỏ hơn.
3. WHERE một nút `Button_Primitive` cỡ `sm` chỉ dùng trong bối cảnh desktop dày và không thuộc nhóm hành động quan trọng trên mobile, THE CaLe_UI SHALL cho phép giữ chiều cao tối thiểu 36px.
4. THE StarRating SHALL bảo đảm mỗi nút sao tương tác (khi không ở chế độ `readOnly`) có Touch_Target ≥ 44×44 CSS px, kể cả khi glyph ngôi sao hiển thị nhỏ hơn (`h-4/h-6/h-8`).
5. THE MiniMonthCalendar SHALL bảo đảm nút chevron "tháng trước" và "tháng sau" có Touch_Target ≥ 44×44 CSS px, thay cho kích thước `h-8 w-8` (32px) hiện tại.

---

## Nhóm P3 — Đánh bóng

### Requirement 5: Nhất quán vòng tiêu điểm bàn phím (Focus_Ring)

**Ưu tiên:** P3

**User Story:** Là người dùng dùng bàn phím, tôi muốn mọi điều khiển hiển thị cùng một kiểu vòng tiêu điểm, để tôi luôn thấy rõ mình đang ở đâu.

#### Acceptance Criteria

1. WHEN một phần tử tương tác nhận tiêu điểm bàn phím, THE CaLe_UI SHALL hiển thị Focus_Ring gồm `focus-visible:ring-2` màu `ring-orange-400` kèm `ring-offset` (offset ≥ 1px), đạt Contrast_Ratio ≥ 3:1 so với nền kề bên.
2. THE Admin_Dashboard SHALL hiển thị Focus_Ring trên component `TabButton` (hiện chỉ có `transition-colors`, không có vòng tiêu điểm) và trên mỗi `<select>` sắp xếp.
3. THE Shifts_Listing SHALL hiển thị Focus_Ring trên các nút chuyển chế độ sắp xếp.
4. THE WorkerSummaryRow SHALL bổ sung `ring-offset` cho Focus_Ring của nút tên ứng viên (hiện `focus-visible:ring-2 ring-orange-400` thiếu offset).
5. THE CalendarToolbar SHALL bổ sung `ring-offset` cho Focus_Ring của nút chuyển view (hiện thiếu offset).
6. THE MiniMonthCalendar SHALL bổ sung `ring-offset` cho Focus_Ring của các chevron, liên kết "Hôm nay", và các ô ngày (hiện thiếu offset).
7. THE WeekView SHALL hiển thị Focus_Ring trên các ô slot trống có thể nhấn (hiện chỉ đổi nền `focus-visible:bg-orange-50`, không có vòng tiêu điểm).
8. THE CalendarEventCard SHALL hiển thị Focus_Ring có `ring-offset` trên thẻ sự kiện có thể nhấn.
9. THE ShiftForm SHALL hiển thị Focus_Ring trên ô nhập tiền công theo giờ (`#shift-hourly-wage`).

### Requirement 6: Bảng màu ngữ nghĩa của lịch

**Ưu tiên:** P3

**User Story:** Là người dùng xem lịch, tôi muốn các màu trạng thái trong lịch thuộc đúng họ màu ngữ nghĩa và không cạnh tranh với hành động chính, để tôi đọc lịch nhanh và không rối.

#### Acceptance Criteria

1. THE CalendarEventCard SHALL render biến thể `awaitingShift` bằng họ màu `amber-*` thay cho họ lệch-palette `yellow-*` (hiện `bg-yellow-100 border-yellow-300 text-yellow-900`).
2. THE CalendarLegend SHALL render ô màu (swatch) của mục "awaiting" (employer) bằng `amber-*` thay cho `yellow-*` (hiện `bg-yellow-300`), khớp với CalendarEventCard.
3. THE CaLe_UI SHALL biểu thị trạng thái "hoàn thành / thành công" trong CalendarEventCard và CalendarLegend bằng một họ màu `green-*` thống nhất, và SHALL KHÔNG biểu thị cùng trạng thái "hoàn thành / thành công" đó bằng họ `emerald-*` ở bất kỳ bề mặt lịch nào.
4. THE CalendarEventCard SHALL giảm độ đậm của mảng nền cam ở biến thể "approved shift" (hiện `bg-orange-100`) xuống một mức nhạt hơn để Brand_Orange không cạnh tranh với các nút hành động (CTA), trong khi giữ nguyên viền và nhãn để không mất dấu hiệu nhận biết.
5. THE CaLe_UI SHALL giữ nguyên ý nghĩa và nhãn chữ của mọi trạng thái lịch khi đổi họ màu, sao cho mỗi biến thể vẫn ứng với đúng trạng thái như trước.

### Requirement 7: Tinh chỉnh StarRating

**Ưu tiên:** P3

**User Story:** Là người dùng chấm/đọc điểm đánh giá, tôi muốn ngôi sao dùng màu chuẩn, viền sao rỗng đủ rõ và tôn trọng giảm chuyển động, để trải nghiệm đánh giá nhất quán và dễ nhìn.

#### Acceptance Criteria

1. THE StarRating SHALL lấy màu tô ngôi sao đầy và màu viền ngôi sao rỗng từ token/tiện ích của Runtime_Palette, thay cho các literal hex cứng `#f59e0b` (tô) và `#d1d5db` (viền) hiện tại.
2. THE StarRating SHALL render viền ngôi sao rỗng đạt Contrast_Ratio ≥ 3:1 so với nền phía sau (viền hiện `#d1d5db` ≈ 1.5:1 trên nền trắng, không đạt), theo chuẩn đồ hoạ phi văn bản của WCAG 2.1.
3. WHILE thiết lập hệ thống là Reduced_Motion, THE StarRating SHALL không phóng to ngôi sao (vô hiệu hiệu ứng `hover:scale-110`) và không phát sinh chuyển tiếp biến đổi tỉ lệ theo thời gian.
4. WHEN một nút sao tương tác nhận tiêu điểm bàn phím, THE StarRating SHALL hiển thị Focus_Ring gồm `focus-visible:ring-2` màu `ring-orange-400` kèm `ring-offset` (offset ≥ 1px).

### Requirement 8: Tôn trọng giảm chuyển động cho các chuyển động còn sót

**Ưu tiên:** P3

**User Story:** Là người dùng nhạy cảm với chuyển động, tôi muốn mọi chuyển động còn sót cũng dừng khi tôi bật giảm chuyển động, để giao diện không gây khó chịu.

#### Acceptance Criteria

1. WHILE thiết lập hệ thống là Reduced_Motion, THE CaLe_UI SHALL hiển thị chỉ báo tải của Button_Primitive (spinner `animate-spin`) ở dạng không tạo chuyển động quay liên tục theo thời gian, trong khi vẫn giữ chỉ báo tải nhận biết được.
2. WHILE thiết lập hệ thống là Reduced_Motion, THE CaLe_UI SHALL vô hiệu mọi hiệu ứng `transition-transform` và `hover:scale` nội tuyến chưa nằm trong khối `prefers-reduced-motion: reduce` của `src/app/globals.css`, sao cho không phần tử nào phát sinh biến đổi vị trí hay tỉ lệ theo thời gian.
3. WHERE một phần tử trang trí dùng `transition-transform` để xoay dấu chỉ mở/đóng (ví dụ chevron `group-open:rotate-180`), WHILE thiết lập hệ thống là Reduced_Motion, THE CaLe_UI SHALL chuyển phần tử đó sang trạng thái cuối tức thời, không tween theo thời gian.
4. THE CaLe_UI SHALL giữ nguyên chức năng và nội dung của mọi chỉ báo tải và dấu chỉ trạng thái khi vô hiệu chuyển động, chỉ thay đổi biểu hiện chuyển động.

### Requirement 9: Xử lý thẻ-trong-thẻ (flush / không viền lồng)

**Ưu tiên:** P3

**User Story:** Là người dùng, tôi muốn các thẻ lồng nhau không xếp chồng viền và bóng, để bố cục sạch và không rối mắt.

#### Acceptance Criteria

1. WHERE một thẻ có viền được lồng bên trong một thẻ khác có viền hoặc có bóng, THE CaLe_UI SHALL áp dụng xử lý "flush" (bỏ viền/bóng của lớp trong) cho lớp thẻ bên trong.
2. THE Worker_Profile SHALL áp dụng xử lý flush cho các hàng con bên trong thẻ xác minh, để các hàng con không có viền lồng thừa.
3. THE Employer_Shift_Detail SHALL áp dụng xử lý flush cho `WorkerSummaryRow` (vốn render bằng `Card`) khi nó nằm bên trong mục "bucket" ứng viên của thẻ/section chi tiết ca.
4. THE ShiftForm SHALL áp dụng xử lý flush cho các khối callout nền cam nằm bên trong `FormSection` (ví dụ khối "workplace section" và fieldset bằng chứng đang dùng `border border-orange-100`), để chúng không tạo viền lồng bên trong thẻ `FormSection`.

### Requirement 10: Kỷ luật "The One Orange Rule" — ghi nhận và giảm mảng cam trang trí

**Ưu tiên:** P3

**User Story:** Là chủ sản phẩm, tôi muốn cam trang trí không lấn quá ngưỡng trên các màn hình ứng dụng, để cam giữ vai trò tín hiệu cho hành động.

#### Acceptance Criteria

1. THE CaLe_UI SHALL ghi nhận (record) diện tích Brand_Orange trang trí đo được cho từng bề mặt ứng cử — đường đăng ký nhà tuyển dụng trên Register_Page, các callout cam xếp chồng ở `/employer/shifts/new`, lưới thẻ ca trên Shifts_Listing, và màn tranh chấp của admin — làm bằng chứng QA.
2. WHERE một bề mặt ứng dụng (In_App_Surface) hiển thị Brand_Orange trang trí (không phải phần tử tương tác và không phải Semantic_Status_Color) vượt ~10% diện tích vùng hiển thị ban đầu của khung nhìn, đo ở trạng thái nghỉ tại mỗi khung nhìn rộng 360px và 1280px, THE CaLe_UI SHALL giảm diện tích cam trang trí đó xuống không quá 10%.
3. THE CaLe_UI SHALL KHÔNG thay đổi bất kỳ Semantic_Status_Color nào đang đi kèm một nhãn chữ khi thực hiện việc giảm mảng cam trang trí.

---

## Ràng buộc phạm vi

### Requirement 11: Ràng buộc chỉ thay đổi trình bày và trợ năng

**Ưu tiên:** Ràng buộc xuyên suốt (áp dụng cho mọi thay đổi P1/P2/P3)

**User Story:** Là chủ sản phẩm, tôi muốn đợt đánh bóng chỉ đụng lớp trình bày và a11y, để không phát sinh rủi ro hồi quy về hành vi hay dữ liệu.

#### Acceptance Criteria

1. THE CaLe_UI SHALL giới hạn mọi thay đổi trong Presentation_Layer: `className`/tiện ích Tailwind, CSS trong `src/app/globals.css`, và markup JSX thuần tạo kiểu (wrapper trình bày, container bố cục, phần tử trang trí `aria-hidden`).
2. THE CaLe_UI SHALL KHÔNG sửa đổi `src/stores` (Zustand), `src/domain`, `src/data` (dữ liệu mock/seed), logic nghiệp vụ tài chính/uy tín/chấm công/thông báo, logic nghiệp vụ trong `src/lib`, hay `src/types`.
3. THE CaLe_UI SHALL KHÔNG sửa đổi nội dung chuỗi i18n (nghĩa/câu chữ trong `src/i18n/vi.ts`); chỉ cho phép đổi cách trình bày trực quan (ví dụ `text-transform` qua CSS) mà không sửa chuỗi gốc.
4. THE CaLe_UI SHALL KHÔNG sửa đổi event handler, hợp đồng props/dữ liệu, hay đích điều hướng/route của phần tử điều hướng.
5. THE CaLe_UI SHALL KHÔNG đụng backend/Supabase và SHALL KHÔNG đưa AI vào đợt này.
6. THE CaLe_UI SHALL giữ nguyên vai trò trợ năng (role) và tên trợ năng (accessible name) của mọi phần tử hiện có, sao cho các test định vị phần tử theo role + accessible name vẫn khớp; cho phép bổ sung wrapper chỉ nhằm tạo kiểu.
7. IF một thay đổi làm biến đổi hành vi quan sát được tại giao diện — gồm kết quả điều hướng, kích hoạt/xử lý sự kiện, gửi biểu mẫu, kết quả validate, dữ liệu gửi đi, hoặc điều kiện hiển thị-ẩn phần tử — THEN THE CaLe_UI SHALL loại thay đổi đó khỏi phạm vi và hoàn nguyên.
8. THE CaLe_UI SHALL không tạo commit như một phần của đợt này.

---

## Cổng chất lượng và kiểm chứng

### Requirement 12: Thứ tự thực thi theo ưu tiên và cổng kiểm chứng

**Ưu tiên:** Cổng kiểm chứng (điều phối toàn bộ P1/P2/P3)

**User Story:** Là người bảo trì, tôi muốn mỗi nhóm ưu tiên được kiểm chứng trước khi sang nhóm sau, để đợt đánh bóng an toàn và không phát sinh lỗi mới so với baseline.

#### Acceptance Criteria

1. THE CaLe_UI SHALL thực thi theo thứ tự P1 → kiểm chứng → P2 → kiểm chứng → P3 → kiểm chứng, và SHALL KHÔNG bắt đầu một nhóm ưu tiên sau khi cổng kiểm chứng của nhóm trước chưa đạt.
2. WHEN một nhóm ưu tiên hoàn tất, THE Quality_Gate SHALL chạy ESLint trên `src`, chạy kiểm tra tương phản/detector trên các tệp đã đụng, chạy các test component liên quan, và chạy `tsc`.
3. THE Quality_Gate SHALL phân loại các lỗi có sẵn của Web_Main_Baseline (thiếu `react-router-dom`; lint `Math.random`) là Baseline nằm ngoài phạm vi, và SHALL đánh giá "đạt" khi không phát sinh lỗi TypeScript hoặc ESLint MỚI so với Baseline.
4. THE Quality_Gate SHALL không cho phép xóa, bỏ qua (skip), hay vô hiệu hóa bất kỳ test nào như một cách để đạt trạng thái pass.
5. THE CaLe_UI SHALL giữ nguyên các selector test dựa trên vai trò (role) + tên trợ năng (accessible name), sao cho không selector nào của bộ test hiện có bị đổi hay hỏng.
6. WHEN Quality_Gate của một nhóm phát hiện lỗi TypeScript/ESLint mới, test thất bại, hoặc selector test bị đổi, THE CaLe_UI SHALL khắc phục trước khi chuyển sang nhóm ưu tiên tiếp theo.
