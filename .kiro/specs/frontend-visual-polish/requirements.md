# Requirements Document

## Introduction

Tính năng **Frontend Visual Polish** (Tinh chỉnh thẩm mỹ giao diện) nhằm nâng chất lượng
hình ảnh của web CaLẻ hiện tại — vốn đã chạy trơn tru — để giao diện trông đẹp, gọn và
đáng tin hơn. Đây là một đợt **đánh bóng thị giác**, KHÔNG phải thiết kế lại và KHÔNG thay
đổi hành vi, luồng nghiệp vụ, hay dữ liệu.

Mọi cải tiến phải **tuân thủ và củng cố** hệ thống thiết kế sẵn có (`DESIGN.md` +
`.impeccable/design.json`) với North Star "Bảng điều phối đáng tin". Không giới thiệu ngôn
ngữ thiết kế mới, màu thương hiệu mới, dark mode, hay thư viện component mới trừ khi người
dùng yêu cầu rõ ràng.

**Quyết định đã chốt (người dùng xác nhận): Runtime là nguồn sự thật cho palette.**
Giữ bảng màu đang triển khai trong runtime (`src/app/globals.css`) làm nguồn sự thật duy
nhất; `DESIGN.md` và `.impeccable/design.json` sẽ được cập nhật để khớp với runtime. KHÔNG
hoàn nguyên về `#f97316`. KHÔNG dùng lại gradient cam cũ cho nút primary.

Bảng giá trị chuẩn (canonical) đã chốt:

| Vai trò | Giá trị chuẩn |
|---|---|
| Dark (mực/ink) | `#37373B` |
| Primary (cam thương hiệu) | `#FF9A5F` |
| Neutral | `#FFD5AE` |
| Background (nền kem) | `#FFF4E9` |

Quy tắc nút Primary CTA: nền `#FF9A5F` + chữ `#37373B` (chữ tối), KHÔNG dùng chữ trắng trên
cam sáng.

Ghi chú detector: Nếu công cụ dò tương phản (detector) cảnh báo về "chữ tối trên `#FF9A5F`",
đây là **false-positive đã được ghi nhận** so với quyết định này; KHÔNG được vì cảnh báo đó
mà đổi lại sang chữ trắng. (Cặp `#37373B` trên nền `#FF9A5F` vẫn phải đạt WCAG AA 4.5:1 —
đây là cấu hình được chấp nhận.)

Phạm vi ưu tiên các bề mặt lưu lượng cao: Bảng điều khiển Worker, Bảng điều khiển Employer,
trang Landing, và trang Chi tiết ca — nhưng chuẩn thẩm mỹ áp dụng nhất quán trên toàn bộ giao diện.

**Ngoài phạm vi (OUT-OF-SCOPE):** Đây là đợt **đánh bóng thị giác** chỉ thay đổi phần trình
bày/UI/UX. Đợt này KHÔNG được thay đổi: logic nghiệp vụ; các store (Zustand); dữ liệu
mock/seed; hệ thống tài chính (finance); hệ thống uy tín (reputation); hệ thống chấm công
(attendance); hệ thống thông báo (notification). Đợt này KHÔNG được đụng tới backend/Supabase.
Đợt này KHÔNG liên quan tới AI. Các bản sửa lỗi chức năng (functional bug) hiện có được
hoãn lại sang một đợt sau.

## Glossary

- **CaLe_UI**: Toàn bộ giao diện frontend đã render của CaLẻ — mọi trang trong `src/app` và mọi component trong `src/components`.
- **Design_Tokens**: Lớp token thiết kế dùng chung (màu, typography, bo góc, khoảng cách, bóng, chuyển động) khai báo trong `src/app/globals.css` (`@theme`), `DESIGN.md`, và `.impeccable/design.json`.
- **UI_Primitive**: Các component nền tảng dùng lại (Button, Card, Badge, Input, Select, Textarea, EmptyState, Modal, Toast, StatCard, SectionHeader, PageShell, Reveal).
- **ShiftLifecycleBadge**: Badge trạng thái ca đặc trưng, dùng ở mọi bề mặt để hiển thị trạng thái vòng đời ca.
- **Motion_Layer**: Lớp chuyển động (các lớp CSS `motion-lift`, `motion-press`, `entrance-*`, `reveal`, `toast-*`, `float-*`).
- **Build_Pipeline**: Quy trình biên dịch và kiểm tra tĩnh của dự án (`next build`, TypeScript, ESLint).
- **Test_Suite**: Bộ kiểm thử hiện có (unit tests và e2e Playwright trong `e2e/`).
- **Brand_Orange**: Màu cam thương hiệu tín hiệu duy nhất theo quy tắc "The One Orange Rule".
- **In_App_Surface**: Màn hình phục vụ tác vụ trong ứng dụng (worker/employer/admin/shifts/disputes), phân biệt với trang landing/marketing.
- **Worker / Employer / Admin / Visitor**: Các vai người dùng — lao động, nhà tuyển dụng, quản trị viên, và khách chưa đăng nhập.
- **Contrast_Ratio**: Tỉ lệ tương phản màu theo WCAG 2.1, đo giữa màu chữ/đối tượng và nền phía sau.

## Requirements

### Requirement 1: Một nguồn sự thật duy nhất cho Design Tokens

**User Story:** Là người bảo trì frontend, tôi muốn một bộ Design_Tokens duy nhất và nhất quán giữa tài liệu và mã nguồn, để mọi bề mặt dùng cùng màu, kiểu chữ và độ nâng mà không bị lệch.

#### Acceptance Criteria

1. THE Design_Tokens SHALL định nghĩa đúng một giá trị chuẩn (canonical) duy nhất cho mỗi token màu thương hiệu sau: cam thương hiệu, cam đậm, cam nhạt, nền kem, và mực (ink); không token nào trong nhóm này được phép có nhiều hơn một giá trị chuẩn.
2. THE Design_Tokens SHALL định nghĩa đúng một cặp giá trị chuẩn — gồm một màu nền và một màu mực (chữ) — cho mỗi trạng thái ngữ nghĩa sau: info, warning, success, danger, và neutral.
3. THE Design_Tokens SHALL khai báo cùng một giá trị màu (so khớp không phân biệt chữ hoa/thường) giữa `DESIGN.md`, `.impeccable/design.json`, và `src/app/globals.css` cho mọi token màu được nêu ở tiêu chí 1 và 2.
4. THE CaLe_UI SHALL lấy màu thương hiệu, màu trung tính và màu trạng thái từ Design_Tokens thông qua các lớp tiện ích Tailwind hoặc biến CSS.
5. IF một UI_Primitive dùng một giá trị màu nằm ngoài Design_Tokens, THEN THE CaLe_UI SHALL thay giá trị đó bằng token chuẩn có cùng vai trò ngữ nghĩa (thương hiệu, trung tính, hoặc trạng thái) với cách dùng hiện tại của giá trị đó.
6. THE Design_Tokens SHALL bảo đảm giá trị chuẩn của cam thương hiệu, khi được dùng làm nền cho chữ, đạt tỷ lệ tương phản tối thiểu 4.5:1 với màu chữ đi kèm theo chuẩn WCAG 2.1 AA cho chữ thường.
7. IF một token màu dùng chung có giá trị khác nhau giữa `DESIGN.md`, `.impeccable/design.json`, và `src/app/globals.css`, THEN THE Design_Tokens SHALL lấy giá trị đang triển khai trong `src/app/globals.css` (giá trị đạt WCAG 2.1 AA) làm giá trị chuẩn duy nhất, và `DESIGN.md` cùng `.impeccable/design.json` SHALL được cập nhật để khớp với giá trị chuẩn đó.

### Requirement 2: Kỷ luật "The One Orange Rule"

**User Story:** Là Worker và Employer, tôi muốn màu cam chỉ xuất hiện ở hành động và điểm nhấn, để hành động chính luôn nổi bật và màn hình không bị rối.

#### Acceptance Criteria

1. THE CaLe_UI SHALL chỉ dùng Brand_Orange cho hành động tương tác (nút primary, viền và chữ nút secondary), mục hoặc liên kết đang được chọn, vòng tiêu điểm bàn phím, chỉ báo trạng thái, và điểm nhấn thương hiệu.
2. WHERE một bề mặt là In_App_Surface, THE CaLe_UI SHALL giữ tổng diện tích điểm ảnh hiển thị Brand_Orange (sắc cam tín hiệu, không bao gồm nền kem, nền trắng, hay cam nhạt dùng làm nền chip) không vượt quá 10% diện tích vùng hiển thị ban đầu của khung nhìn (phần thấy được khi chưa cuộn), đo ở trạng thái nghỉ mặc định — không có phần tử đang hover hoặc focus và không có modal, overlay, hay dropdown đang mở — tại mỗi khung nhìn đại diện rộng 360px và 1280px.
3. WHERE một bề mặt là nền không tương tác, THE CaLe_UI SHALL dùng nền kem hoặc nền trắng và SHALL KHÔNG tô Brand_Orange làm mảng nền.
4. WHERE một bề mặt là In_App_Surface, THE CaLe_UI SHALL hiển thị đúng một hành động chính bằng kiểu nút primary.
5. WHERE một bề mặt là In_App_Surface, THE CaLe_UI SHALL hiển thị các hành động còn lại không phải hành động chính bằng kiểu nút secondary, ghost, hoặc danger.

### Requirement 3: Trạng thái luôn kèm nhãn chữ và nhất quán toàn hệ thống

**User Story:** Là bất kỳ người dùng nào, tôi muốn trạng thái ca luôn có nhãn chữ tiếng Việt và cùng một màu ở mọi nơi, để tôi hiểu trạng thái mà không phải đoán qua màu.

#### Acceptance Criteria

1. THE ShiftLifecycleBadge SHALL hiển thị đúng một nhãn chữ tiếng Việt và đúng một tông màu trạng thái thuộc tập {info, warning, success, danger, neutral} cho mỗi trạng thái trong đúng 11 trạng thái vòng đời ca (Draft, PendingDeposit, Published, StartingSoon, InProgress, AwaitingCheckout, AwaitingEmployerConfirmation, Completed, Expired, Cancelled, Disputed), khớp đúng bảng ánh xạ nhãn–tông chuẩn của ShiftLifecycleBadge định nghĩa trong DESIGN.md và .impeccable/design.json.
2. THE ShiftLifecycleBadge SHALL hiển thị cùng một nhãn và cùng một tông — theo đúng bảng ánh xạ chuẩn — cho một trạng thái vòng đời nhất định trên mọi bề mặt worker, employer, admin, danh sách, chi tiết, và deeplink, không để bất kỳ bề mặt nào lệch nhãn hoặc lệch tông.
3. THE CaLe_UI SHALL hiển thị kèm mỗi chỉ báo trạng thái một nhãn chữ tiếng Việt hoặc một icon có nhãn chữ đi kèm, sao cho trạng thái vẫn nhận biết được khi loại bỏ màu và không bị truyền đạt chỉ bằng màu.
4. WHERE một thông tin trạng thái được truyền đạt bằng tông màu, THE CaLe_UI SHALL truyền đạt cùng thông tin trạng thái đó bằng một nhãn chữ tiếng Việt đặt kèm phần tử mang màu.
5. IF một ca có trạng thái vòng đời không nằm trong 11 trạng thái ánh xạ chuẩn, THEN THE ShiftLifecycleBadge SHALL hiển thị một nhãn chữ tiếng Việt dự phòng kèm tông neutral.

### Requirement 4: Tinh chỉnh độ nâng và bóng đổ

**User Story:** Là người dùng, tôi muốn các thẻ nổi lên bằng bóng mềm nhất quán, để giao diện có chiều sâu ấm áp mà không nặng nề.

#### Acceptance Criteria

1. WHILE một UI_Primitive dạng thẻ (Card) ở trạng thái nghỉ — không được hover và không chứa tiêu điểm bàn phím — THE CaLe_UI SHALL áp dụng token bóng hai lớp `shadow-card` cho bề mặt thẻ đó.
2. WHERE một UI_Primitive dạng thẻ là có thể nhấn được (nhấn vào sẽ điều hướng hoặc kích hoạt một hành động), WHEN con trỏ hover lên thẻ đó hoặc thẻ nhận/chứa tiêu điểm bàn phím, THE CaLe_UI SHALL áp dụng token `shadow-card-hover` và nâng thẻ `translateY(-2px)`.
3. WHILE một bề mặt là tĩnh và không tương tác (không phải Card có thể nhấn, không phải nút hay liên kết), THE CaLe_UI SHALL giữ nguyên bóng ở trạng thái nghỉ của bề mặt đó và SHALL KHÔNG đổi sang `shadow-card-hover` hay áp dụng hiệu ứng nâng `translateY`.
4. WHEN một modal được hiển thị, THE CaLe_UI SHALL áp dụng token `shadow-modal` cho panel của modal và SHALL KHÔNG áp dụng bóng nâng đó cho lớp nền (backdrop).
5. THE CaLe_UI SHALL, cho mọi độ nâng, chỉ dùng bóng gồm đúng hai lớp khuếch tán (bán kính blur ≥ 8px) với độ mờ (alpha) mỗi lớp không vượt quá 0.12, và SHALL KHÔNG dùng bóng một lớp cứng hoặc bóng có alpha vượt 0.12.

### Requirement 5: Nhịp khoảng cách và bố cục

**User Story:** Là người dùng, tôi muốn khoảng cách và căn chỉnh đều đặn, để nội dung dễ quét mắt và trông chỉn chu.

#### Acceptance Criteria

1. THE CaLe_UI SHALL chỉ lấy các giá trị margin và gap giữa các phần tử từ thang khoảng cách đã định nghĩa (4px, 8px, 16px, 24px, 32px).
2. THE CaLe_UI SHALL áp dụng padding trong 20px cho mỗi thẻ nội dung tiêu chuẩn, tức thẻ độc lập không phải panel modal và không phải thẻ lồng bên trong thẻ khác.
3. WHERE nhiều khối nội dung xếp dọc liền kề nhau trong cùng một nhóm, THE CaLe_UI SHALL áp dụng cùng một giá trị khoảng cách dọc lấy từ thang khoảng cách (4px, 8px, 16px, 24px, 32px) giữa mọi cặp khối anh em kề nhau.
4. THE CaLe_UI SHALL căn các phần tử nằm trên cùng một hàng trong mỗi thẻ hoặc mỗi khối theo một mốc căn ngang chung — cùng cạnh trên, cùng tâm dọc, hoặc cùng đường cơ sở chữ.

### Requirement 6: Tính nhất quán của Typography

**User Story:** Là người dùng đọc tiếng Việt có dấu, tôi muốn chữ dễ đọc và phân cấp rõ ràng, để nội dung không bị chật hay chồng dấu.

#### Acceptance Criteria

1. WHERE một bề mặt là In_App_Surface, THE CaLe_UI SHALL giữ cỡ chữ của mỗi cấp typography (Headline, Title, Body, Label) không đổi theo chiều rộng khung nhìn, dùng các bước cố định tính bằng rem của thang typography đã định nghĩa trong Design_Tokens (không dùng hàm co giãn `clamp()`).
2. WHERE một bề mặt là H1 hero của trang landing, THE CaLe_UI SHALL tăng cỡ chữ Display theo chiều rộng khung nhìn từ 1.875rem tại breakpoint nhỏ nhất đến tối đa 3rem tại breakpoint desktop (≥1280px), và không giảm cỡ chữ khi chiều rộng khung nhìn tăng.
3. THE CaLe_UI SHALL áp dụng line-height tối thiểu 1.25 cho các cấp tiêu đề (Display, Headline, Title) để dấu tiếng Việt ở dòng trên không chạm dấu ở dòng dưới.
4. THE CaLe_UI SHALL render chữ thân UI ở cỡ 0.875rem và chữ prose ở cỡ 1rem, đều bằng họ chữ Inter ở weight 400.
5. THE CaLe_UI SHALL giới hạn hiệu ứng gradient-text ở đúng một dòng nhấn và chỉ trên H1 hero của trang landing.
6. IF một phần tử chữ trên In_App_Surface áp dụng hiệu ứng gradient-text, THEN THE CaLe_UI SHALL render phần tử đó bằng màu chữ đặc lấy từ Design_Tokens thay cho gradient.

### Requirement 7: Tinh chỉnh vi tương tác và chuyển động

**User Story:** Là người dùng, tôi muốn chuyển động phục vụ định hướng và tôn trọng nhu cầu giảm chuyển động, để trải nghiệm mượt mà và không gây khó chịu.

#### Acceptance Criteria

1. WHEN một người dùng hover hoặc focus một thẻ có thể nhấn hoặc một nút, THE Motion_Layer SHALL hoàn tất chuyển tiếp nâng (`motion-lift`) trong vòng 200ms.
2. WHEN một người dùng nhấn (trạng thái `active`) một nút hoặc một phần tử có thể nhấn, THE Motion_Layer SHALL hoàn tất chuyển tiếp nhấn (`motion-press`) trong vòng 200ms.
3. WHILE thiết lập hệ thống là `prefers-reduced-motion: reduce`, THE Motion_Layer SHALL vô hiệu hoá mọi animation và transition sao cho không phần tử nào phát sinh dịch chuyển vị trí, biến đổi tỉ lệ, hay chuyển tiếp độ mờ kéo dài theo thời gian.
4. WHILE thiết lập hệ thống là `prefers-reduced-motion: reduce`, THE Motion_Layer SHALL hiển thị nội dung của animation vào trang (`entrance-*`) và scroll-reveal (`reveal`) ngay ở trạng thái cuối nhìn thấy được, không giữ nội dung ở trạng thái ẩn.
5. THE Motion_Layer SHALL giữ biên độ dịch chuyển so với vị trí nghỉ của mọi chuyển động lặp trang trí (`float-*`) ở mức tối đa 16px.
6. THE Motion_Layer SHALL chỉ animate các thuộc tính `transform` và `opacity` (chỉ tác động compositor) cho animation vào trang và scroll-reveal, và SHALL KHÔNG animate các thuộc tính ảnh hưởng bố cục như `width`, `height`, `top`, `left`, hoặc `margin`.

### Requirement 8: Chất lượng trạng thái rỗng, đang tải và lỗi

**User Story:** Là người dùng, tôi muốn trạng thái rỗng/đang tải/lỗi có hình thức nhất quán và thân thiện, để tôi luôn biết chuyện gì đang xảy ra.

#### Acceptance Criteria

1. WHEN một vùng danh sách hoặc dữ liệu tải xong và không có mục nào, THE CaLe_UI SHALL render một EmptyState gồm icon trong chip gradient ấm, một tiêu đề, và một mô tả.
2. WHILE dữ liệu của một vùng đang được tải, THE CaLe_UI SHALL render một chỉ báo tải — skeleton cho vùng nội dung hoặc danh sách, spinner cho hành động nội tuyến — dùng màu, bo góc và khoảng cách từ Design_Tokens.
3. IF một yêu cầu dữ liệu thất bại, THEN THE CaLe_UI SHALL hiển thị thông báo lỗi dùng tông danger của hệ thống thiết kế, kèm chữ cho biết thao tác nào đã thất bại, và không truyền đạt lỗi chỉ bằng màu.
4. THE CaLe_UI SHALL dùng cùng một cấu trúc EmptyState — viền nét đứt, chip icon gradient ấm, bố cục canh giữa, và nền trung tính nhạt — cho mọi vùng rỗng, bất kể vùng đó thuộc màn hình nào.
5. WHERE người dùng bật prefers-reduced-motion, THE CaLe_UI SHALL hiển thị chỉ báo tải ở dạng tĩnh, không có hiệu ứng chuyển động lặp lại.

### Requirement 9: Tinh chỉnh responsive và mobile

**User Story:** Là người dùng thao tác trên điện thoại, tôi muốn giao diện gọn trên màn hình nhỏ, để tôi thao tác nhanh mà không phải cuộn ngang.

#### Acceptance Criteria

1. THE CaLe_UI SHALL bảo đảm mỗi phần tử tương tác có vùng chạm hữu hiệu tối thiểu 44×44 pixel CSS (hộp tương tác tính cả khoảng đệm), ngay cả khi kích thước hiển thị của phần tử nhỏ hơn 44px.
2. WHILE chiều rộng khung nhìn nằm trong khoảng 320px đến 639px (gồm các giá trị tiêu biểu 360px, 390px và 430px), THE CaLe_UI SHALL trình bày toàn bộ bố cục nằm gọn trong chiều rộng khung nhìn và không phát sinh cuộn ngang ở cấp trang.
3. WHILE chiều rộng khung nhìn nhỏ hơn 1280px, THE CaLe_UI SHALL thu điều hướng chính vào một drawer được mở bằng một nút hamburger hiển thị rõ.
4. WHILE chiều rộng khung nhìn từ 1280px trở lên, THE CaLe_UI SHALL hiển thị điều hướng chính dưới dạng thanh ngang và không thu vào drawer hamburger.
5. WHILE chiều rộng khung nhìn nhỏ hơn 640px, THE CaLe_UI SHALL dồn các bố cục nhiều cột thành một cột dọc duy nhất.

### Requirement 10: Khả năng truy cập và tương phản

**User Story:** Là người dùng có thị lực hạn chế hoặc dùng bàn phím, tôi muốn chữ đủ tương phản và tiêu điểm rõ ràng, để tôi đọc và điều hướng được.

#### Acceptance Criteria

1. THE CaLe_UI SHALL render chữ thân và chữ UI có cỡ nhỏ hơn 24px ở weight thường (hoặc nhỏ hơn 18.66px ở weight đậm) ở Contrast_Ratio tối thiểu 4.5:1 so với nền phía sau, ngoại trừ chữ thuần trang trí, chữ trong control ở trạng thái disabled, và logo.
2. THE CaLe_UI SHALL render chữ lớn (từ 24px trở lên ở weight thường, hoặc từ 18.66px trở lên ở weight đậm) và các phần tử đồ hoạ phi văn bản cần thiết để nhận biết control hoặc hiểu nội dung (ranh giới/viền control, icon mang nghĩa, chỉ báo trạng thái) ở Contrast_Ratio tối thiểu 3:1 so với nền hoặc màu kề bên.
3. WHEN một phần tử tương tác nhận tiêu điểm bàn phím, THE CaLe_UI SHALL hiển thị vòng tiêu điểm màu cam rộng 2px kèm khoảng đệm offset tối thiểu 1px, đạt Contrast_Ratio tối thiểu 3:1 so với nền kề bên.
4. THE CaLe_UI SHALL hiển thị các trạng thái default, hover, focus, active, và disabled với biểu hiện thị giác phân biệt được với nhau và lấy từ Design_Tokens, cho mỗi control tương tác.
5. WHERE một control kích hoạt một thao tác bất đồng bộ, THE CaLe_UI SHALL cung cấp một trạng thái loading có biểu hiện thị giác phân biệt được với trạng thái default.
6. WHERE một control nhận dữ liệu nhập có thể không hợp lệ, THE CaLe_UI SHALL cung cấp một trạng thái error dùng tông danger, có biểu hiện thị giác phân biệt được với trạng thái default.

### Requirement 11: Ưu tiên các bề mặt lưu lượng cao

**User Story:** Là chủ sản phẩm, tôi muốn ưu tiên đánh bóng các màn hình lưu lượng cao trước, để giá trị cảm nhận tăng nhanh nhất.

#### Acceptance Criteria

1. THE CaLe_UI SHALL áp dụng chuẩn thẩm mỹ của tính năng này cho bốn bề mặt lưu lượng cao — Bảng điều khiển Worker, Bảng điều khiển Employer, trang Landing, và trang Chi tiết ca — trong đó "chuẩn thẩm mỹ" được xác định là mỗi bề mặt tuân thủ đồng thời: Design_Tokens (Yêu cầu 1); The One Orange Rule với Brand_Orange phủ tối đa 10% diện tích trên In_App_Surface (Yêu cầu 2); token bóng mềm hai lớp `shadow-card` cho thẻ ở trạng thái nghỉ (Yêu cầu 4); các giá trị khoảng cách thuộc thang 4/8/16/24/32px (Yêu cầu 5); thang cỡ chữ cố định trên In_App_Surface (Yêu cầu 6); và Contrast_Ratio đạt WCAG 2.1 AA (Yêu cầu 10).
2. WHERE một trong bốn bề mặt lưu lượng cao hiển thị trạng thái vòng đời của một ca, THE CaLe_UI SHALL hiển thị trạng thái đó qua đúng thành phần ShiftLifecycleBadge và không dùng chỉ báo trạng thái ca nào khác.
3. THE CaLe_UI SHALL trình bày đúng một hành động chính trên mỗi In_App_Surface lưu lượng cao — Bảng điều khiển Worker, Bảng điều khiển Employer, và trang Chi tiết ca — hiển thị bằng đúng một nút kiểu primary, và không hiển thị nút primary thứ hai trên cùng bề mặt đó.

### Requirement 12: Ràng buộc chỉ thay đổi hình ảnh (không đổi hành vi)

**User Story:** Là chủ sản phẩm, tôi muốn đợt đánh bóng không làm thay đổi hành vi, để không phát sinh rủi ro hồi quy.

#### Acceptance Criteria

1. THE CaLe_UI SHALL giữ nguyên tập hợp các route hiện có và đích điều hướng của mỗi phần tử điều hướng, sao cho mỗi liên kết và nút điều hướng dẫn tới đúng route như trước đợt đánh bóng.
2. THE CaLe_UI SHALL giữ nguyên nguyên văn từ ngữ của nội dung chữ và nhãn tiếng Việt hướng người dùng hiện có, chỉ cho phép thay đổi cách trình bày trực quan của chữ (ví dụ: hiển thị chữ hoa/thường) mà không sửa đổi chuỗi văn bản gốc.
3. THE CaLe_UI SHALL giới hạn mọi thay đổi trong tập đóng các thuộc tính trình bày trực quan: màu, typography, khoảng cách, độ nâng và bóng, chuyển động, và diện mạo trạng thái thị giác (default, hover, focus, active, disabled, loading, error).
4. IF một thay đổi làm biến đổi hành vi quan sát được tại giao diện — gồm kết quả điều hướng, việc kích hoạt và xử lý sự kiện của phần tử tương tác, việc gửi biểu mẫu, kết quả kiểm tra hợp lệ đầu vào, dữ liệu được gửi đi, hoặc điều kiện hiển thị và ẩn phần tử — THEN THE CaLe_UI SHALL loại thay đổi đó khỏi phạm vi tính năng này.
5. THE CaLe_UI SHALL giữ nguyên tập hợp trang có thể truy cập và giữ nguyên sự hiện diện cùng danh tính trợ năng (vai trò trợ năng và tên trợ năng) của mỗi phần tử nội dung và phần tử tương tác hiện có, cho phép bổ sung phần tử bao bọc chỉ nhằm mục đích tạo kiểu.

### Requirement 13: Cổng chất lượng và kiểm chứng

**User Story:** Là người bảo trì, tôi muốn kiểm chứng đợt đánh bóng an toàn, để chắc chắn không làm hỏng build hay test.

#### Acceptance Criteria

1. WHEN Build_Pipeline chạy trên mã nguồn đã áp dụng đợt đánh bóng, THE Build_Pipeline SHALL hoàn tất `next build` thành công (thoát với mã 0), không phát sinh thêm lỗi TypeScript hoặc ESLint nào so với baseline (baseline: trạng thái dự án ngay trước khi bắt đầu đợt đánh bóng).
2. WHEN Test_Suite chạy trên mã nguồn đã áp dụng đợt đánh bóng, THE Test_Suite SHALL báo cáo kết quả cuối cùng đạt (pass) cho 100% unit test và e2e test đã tồn tại trong baseline, với 0 test thất bại.
3. THE Test_Suite SHALL giữ nguyên đầy đủ số lượng và phạm vi các unit test và e2e test đã tồn tại trong baseline, không xóa, bỏ qua (skip), hay vô hiệu hóa bất kỳ test nào như một cách để đạt trạng thái pass.
4. WHEN CaLe_UI render một màn hình bị thay đổi bởi đợt đánh bóng, THE CaLe_UI SHALL không ghi ra thông báo mức lỗi (error) hoặc cảnh báo (warning) nào trên console trình duyệt mà chưa tồn tại trong baseline.
5. WHERE một màn hình bị thay đổi bởi đợt đánh bóng, THE CaLe_UI SHALL duy trì tuân thủ tương phản WCAG 2.1 AA, cụ thể Contrast_Ratio tối thiểu 4.5:1 cho chữ thân và chữ UI thiết yếu, và tối thiểu 3:1 cho chữ lớn và phần tử UI phi văn bản mang ý nghĩa, so với nền phía sau.
