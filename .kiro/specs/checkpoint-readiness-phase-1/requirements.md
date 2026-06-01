# Requirements Document

## Introduction

Tài liệu này mô tả yêu cầu cho **Checkpoint Readiness – Phase 1** của sản phẩm CaLẻ / Now: một sàn kết nối ca làm ngắn hạn (mock/MVP, chạy hoàn toàn phía client, không có backend) giữa người lao động linh hoạt (sinh viên, người làm bán thời gian) và nhà tuyển dụng cần người làm ngắn hạn.

Phase 1 **chỉ làm phần nội dung tĩnh (STATIC) và dữ liệu mô phỏng lưu trên localStorage (MOCK)** nhằm chuẩn bị cho buổi báo cáo/checkpoint. Mục tiêu là làm rõ định vị sản phẩm theo hai vai trò (người lao động / nhà tuyển dụng), nâng cấp ngôn từ thương hiệu và thanh toán, bổ sung cam kết điều khoản khi đăng ký, thu thập dữ liệu khảo sát thị trường, và trình bày nội dung Business Model Canvas cùng định hướng ngành ban đầu.

Phase 1 **không thay đổi bất kỳ logic nghiệp vụ lõi nào** (vòng đời ca làm, ứng tuyển, check-in/check-out, ví/ký quỹ, điểm uy tín, tiến trình kỹ năng, ghép lịch, thông báo/deeplink, tranh chấp/đánh giá/báo cáo, bản nháp ca). Mọi thay đổi liên quan đến tiền cọc/đặt cọc chỉ diễn ra ở mức **nhãn hiển thị (i18n/display label)**; tên nội bộ trong mã nguồn (deposit/escrow) giữ nguyên.

Baseline hiện tại là GREEN và **phải được giữ nguyên**: eslint pass, tsc pass, vitest 544 test pass, next build 28 route pass (commit d10dff8).

### Quy ước đọc tài liệu

- **Mức ưu tiên**: `P0` (bắt buộc cho checkpoint) hoặc `P1` (nên có, không chặn checkpoint).
- **Loại dữ liệu**: `[STATIC]` (nội dung/nhãn tĩnh, không lưu trạng thái) hoặc `[MOCK/localStorage]` (có lưu trạng thái trên trình duyệt).
- Mỗi tiêu chí chấp nhận tuân theo một mẫu EARS (WHEN / WHILE / IF-THEN / WHERE / THE…SHALL).

## Glossary

- **Hệ_Thống_CaLẻ**: Toàn bộ ứng dụng web MVP CaLẻ / Now chạy phía client trên Next.js.
- **Trang_Chủ**: Trang landing tại route `/` (`src/app/page.tsx`).
- **Hệ_Thống_Điều_Hướng**: Tập hợp các thành phần điều hướng dùng chung gồm NavBar (`NavBar.tsx`), MobileNav (`MobileNav.tsx`) và Footer (`Footer.tsx`).
- **Bộ_Từ_Điển**: Lớp i18n tiếng Việt duy nhất tại `src/i18n/vi.ts` cùng hàm trợ giúp `t()`.
- **Trang_Đăng_Ký**: Trang đăng ký tài khoản tại route `/register` (`src/app/register/page.tsx`).
- **Hệ_Thống_Khảo_Sát**: Tính năng thu thập dữ liệu khảo sát phía client, lưu trên localStorage qua lớp `src/data/persistence.ts`.
- **Trang_Nội_Dung**: Các trang thông tin tĩnh dùng primitive `InfoPage` (ví dụ `/about`, `/safety`, và các route mới của Phase 1).
- **Người_Lao_Động**: Người dùng tìm và nhận ca làm ngắn hạn; được xưng hô là "bạn" trong nội dung dành cho vai trò này.
- **Nhà_Tuyển_Dụng**: Người dùng đăng ca và tuyển người làm; nội dung dành cho vai trò này nhắc đến đối tượng được tuyển là "người làm".
- **Khách_Truy_Cập**: Người dùng chưa đăng nhập đang xem nội dung công khai.
- **Vai_Trò_Đã_Chọn**: Lựa chọn vai trò (người lao động / nhà tuyển dụng) của Khách_Truy_Cập trên Trang_Chủ.
- **Phiên_Trình_Duyệt**: Phiên làm việc hiện tại của trình duyệt (session) dùng để ghi nhớ Vai_Trò_Đã_Chọn.
- **Đảm_Bảo_Thanh_Toán**: Nhóm thuật ngữ hiển thị thay thế cho "tiền cọc/đặt cọc" ở mức nhãn (Đảm bảo thanh toán / Thanh toán trước / Ví doanh nghiệp / Số dư tuyển dụng / Gói trả trước / Phí dịch vụ tuyển dụng).
- **BMC**: Business Model Canvas gồm 9 khối thành phần.
- **Baseline_Xanh**: Trạng thái kiểm thử đạt chuẩn hiện tại (eslint pass, tsc pass, vitest 544 test pass, next build 28 route pass — commit d10dff8).
- **Logic_Lõi**: Các module nghiệp vụ không được phép thay đổi hành vi, gồm `src/domain/escrow.ts`, `deposit.ts`, `reputation.ts`, `shiftLifecycleState.ts`, `lifecycleSync.ts`, `timeGates.ts` và phần logic của `src/stores/applicationStore.ts`, `shiftStore.ts`, `walletStore.ts`, `adminStore.ts`.

## Requirements

### Requirement 1: Phân tách vai trò trên Trang chủ — `P0` `[STATIC]` + `[MOCK/localStorage]`

**User Story:** Là một Khách_Truy_Cập, tôi muốn chọn "Tôi là người lao động" hoặc "Tôi là nhà tuyển dụng" ngay trên Trang_Chủ, để xem nội dung phù hợp đúng nhu cầu của mình.

#### Acceptance Criteria

1. WHEN Khách_Truy_Cập mở Trang_Chủ, THE Trang_Chủ SHALL hiển thị hai lựa chọn vai trò có nhãn "Tôi là người lao động" và "Tôi là nhà tuyển dụng". `[STATIC]`
2. WHEN Khách_Truy_Cập chọn vai trò "Người lao động", THE Trang_Chủ SHALL hiển thị nhóm lợi ích, quy trình hoạt động và lời kêu gọi hành động (CTA) dành riêng cho Người_Lao_Động. `[STATIC]`
3. WHEN Khách_Truy_Cập chọn vai trò "Nhà tuyển dụng", THE Trang_Chủ SHALL hiển thị nhóm lợi ích, quy trình hoạt động và CTA dành riêng cho Nhà_Tuyển_Dụng. `[STATIC]`
4. WHEN Khách_Truy_Cập chọn một vai trò, THE Trang_Chủ SHALL lưu Vai_Trò_Đã_Chọn vào Phiên_Trình_Duyệt. `[MOCK/localStorage]`
5. WHILE Vai_Trò_Đã_Chọn còn tồn tại trong Phiên_Trình_Duyệt, THE Trang_Chủ SHALL hiển thị nội dung của vai trò đó làm mặc định khi Khách_Truy_Cập quay lại Trang_Chủ trong cùng phiên. `[MOCK/localStorage]`
6. IF chưa có Vai_Trò_Đã_Chọn trong Phiên_Trình_Duyệt, THEN THE Trang_Chủ SHALL hiển thị trạng thái trung lập cho phép chọn một trong hai vai trò mà không ưu tiên vai trò nào và không hiển thị đồng thời toàn bộ nội dung Người_Lao_Động và toàn bộ nội dung Nhà_Tuyển_Dụng. `[STATIC]`
7. WHERE Khách_Truy_Cập đã chọn một vai trò, THE Trang_Chủ SHALL cung cấp cách chuyển sang vai trò còn lại mà không cần tải lại trang. `[STATIC]`
8. WHEN Khách_Truy_Cập đã chọn một vai trò, THE Trang_Chủ SHALL chỉ hiển thị nội dung của vai trò đó và không hiển thị đồng thời nội dung của vai trò còn lại. `[STATIC]`
9. WHEN Khách_Truy_Cập chọn một vai trò khác với Vai_Trò_Đã_Chọn đang lưu trong Phiên_Trình_Duyệt, THE Trang_Chủ SHALL chuyển ngay nội dung hiển thị sang vai trò mới được chọn và cập nhật Vai_Trò_Đã_Chọn trong Phiên_Trình_Duyệt mà không cần bước xác nhận. `[MOCK/localStorage]`

### Requirement 2: Hai luồng "Cách hoạt động" theo vai trò — `P0` `[STATIC]`

**User Story:** Là một Khách_Truy_Cập, tôi muốn xem quy trình sử dụng riêng cho từng vai trò, để hiểu nhanh các bước phù hợp với mình.

#### Acceptance Criteria

1. WHEN Khách_Truy_Cập xem luồng hoạt động dành cho Người_Lao_Động, THE Trang_Chủ SHALL hiển thị ba bước theo thứ tự: "Tìm ca" → "Ứng tuyển / check-in" → "Hoàn thành, nhận lương, tăng uy tín". `[STATIC]`
2. WHEN Khách_Truy_Cập xem luồng hoạt động dành cho Nhà_Tuyển_Dụng, THE Trang_Chủ SHALL hiển thị ba bước theo thứ tự: "Đăng ca" → "Đảm bảo thanh toán" → "Duyệt ứng viên / xác nhận hoàn thành". `[STATIC]`
3. WHILE đang hiển thị nội dung dành cho Người_Lao_Động, THE Trang_Chủ SHALL chỉ xưng hô người đọc là "bạn" trong nội dung dành cho Người_Lao_Động. `[STATIC]`
4. WHILE đang hiển thị nội dung dành cho Nhà_Tuyển_Dụng, THE Trang_Chủ SHALL gọi đối tượng được tuyển là "người làm". `[STATIC]`
5. WHILE đang hiển thị nội dung dành cho Nhà_Tuyển_Dụng, THE Trang_Chủ SHALL không xưng hô người đọc là "bạn". `[STATIC]`
6. WHILE một luồng vai trò đang được xem là luồng chính, THE Trang_Chủ SHALL xác định cách xưng hô theo luồng vai trò chính đang được xem chứ không chỉ dựa vào việc nội dung Người_Lao_Động có xuất hiện hay không. `[STATIC]`
7. THE Trang_Chủ SHALL trình bày hai luồng hoạt động bằng các primitive giao diện hiện có (ví dụ Card, InfoStep) mà không tạo lại bố cục giao diện mới. `[STATIC]`

### Requirement 3: Sắp xếp lại Điều hướng và Footer (chỉ đổi nhãn) — `P0` `[STATIC]`

**User Story:** Là một Khách_Truy_Cập, tôi muốn điều hướng rõ ràng và hấp dẫn hơn, để dễ tìm đúng nội dung mình cần.

#### Acceptance Criteria

1. WHEN Hệ_Thống_Điều_Hướng hiển thị thanh điều hướng cho Khách_Truy_Cập, THE Hệ_Thống_Điều_Hướng SHALL bỏ hoàn toàn mục "Hỗ trợ" khỏi NavBar, bất kể Footer có hiển thị liên kết "Hỗ trợ" hay không. `[STATIC]`
2. WHEN Hệ_Thống_Điều_Hướng hiển thị Footer, THE Hệ_Thống_Điều_Hướng SHALL hiển thị liên kết "Hỗ trợ" trong Footer. `[STATIC]`
3. WHEN Hệ_Thống_Điều_Hướng hiển thị nhãn cho route `/safety`, THE Hệ_Thống_Điều_Hướng SHALL dùng nhãn rõ ràng/hấp dẫn hơn thay cho nhãn "An toàn" hiện tại. `[STATIC]`
4. WHEN Hệ_Thống_Điều_Hướng hiển thị nhãn cho route `/user-guide`, THE Hệ_Thống_Điều_Hướng SHALL dùng nhãn rõ ràng/hấp dẫn hơn thay cho nhãn "Hướng dẫn" hiện tại. `[STATIC]`
5. THE Hệ_Thống_Điều_Hướng SHALL giữ nguyên tất cả đường dẫn route hiện có khi đổi nhãn (chỉ thay đổi văn bản hiển thị, không thay đổi `href`). `[STATIC]`
6. THE Hệ_Thống_Điều_Hướng SHALL áp dụng các thay đổi nhãn đồng nhất trên cả NavBar, MobileNav và Footer cho cùng một route. `[STATIC]`

### Requirement 4: Ngôn từ thanh toán mềm hơn (chỉ đổi nhãn) — `P0` `[STATIC]`

**User Story:** Là một Nhà_Tuyển_Dụng, tôi muốn ngôn từ thanh toán nghe nhẹ nhàng và chuyên nghiệp, để cảm thấy yên tâm khi dùng nền tảng.

#### Acceptance Criteria

1. WHEN Bộ_Từ_Điển hiển thị nhãn liên quan đến "tiền cọc / đặt cọc / cọc ca làm" cho người dùng, THE Bộ_Từ_Điển SHALL thay bằng các thuật ngữ mềm hơn thuộc nhóm Đảm_Bảo_Thanh_Toán (Đảm bảo thanh toán / Thanh toán trước / Ví doanh nghiệp / Số dư tuyển dụng / Gói trả trước / Phí dịch vụ tuyển dụng). `[STATIC]`
2. THE Hệ_Thống_CaLẻ SHALL giữ nguyên toàn bộ tên định danh nội bộ trong mã nguồn (deposit/escrow) và chỉ thay đổi ở mức nhãn hiển thị qua Bộ_Từ_Điển. `[STATIC]`
3. THE Hệ_Thống_CaLẻ SHALL không thay đổi hành vi của Logic_Lõi ký quỹ/đặt cọc khi cập nhật ngôn từ hiển thị. `[STATIC]`
4. WHEN Bộ_Từ_Điển hiển thị giá trị tiền tệ, THE Bộ_Từ_Điển SHALL dùng đơn vị viết thường "đ"/"đồng" và không dùng "VNĐ" hoặc "₫". `[STATIC]`
5. THE Hệ_Thống_CaLẻ SHALL áp dụng ngôn từ thanh toán mới một cách nhất quán trên mọi nhãn hiển thị cho người dùng (NavBar, Footer, Trang_Chủ, Trang_Nội_Dung và các trang dashboard). `[STATIC]`
6. WHERE một thành phần (component) định nghĩa ngôn từ thanh toán mềm ở mức cục bộ, THE Hệ_Thống_CaLẻ SHALL ưu tiên ngôn từ mềm ở mức thành phần hơn mọi cấu hình thuật ngữ toàn cục, đảm bảo nhãn hiển thị cho người dùng luôn là ngôn từ mềm. `[STATIC]`

### Requirement 5: Nâng cấp nội dung Giới thiệu / Thương hiệu — `P1` `[STATIC]`

**User Story:** Là một giảng viên/người hướng dẫn xem demo, tôi muốn hiểu tầm nhìn, sứ mệnh và giá trị cốt lõi của sản phẩm, để đánh giá định hướng của dự án.

#### Acceptance Criteria

1. WHEN người dùng mở trang Giới thiệu (`/about`), THE Trang_Nội_Dung SHALL hiển thị các phần: tầm nhìn, sứ mệnh, giá trị cốt lõi và đội ngũ sáng lập. `[STATIC]`
2. THE Trang_Nội_Dung SHALL dùng ngôn từ mềm như "hướng tới", "được xây dựng để", "mong muốn" khi trình bày tầm nhìn và sứ mệnh. `[STATIC]`
3. THE Trang_Nội_Dung SHALL trình bày nội dung thương hiệu mà không đưa ra tuyên bố mạnh chưa được kiểm chứng. `[STATIC]`
4. THE Trang_Nội_Dung SHALL tái sử dụng primitive `InfoPage` và `InfoSection` để trình bày nội dung Giới thiệu. `[STATIC]`
5. IF một phần của trang Giới thiệu (tầm nhìn / sứ mệnh / giá trị cốt lõi / đội ngũ sáng lập) không tải hoặc không render được, THEN THE Trang_Nội_Dung SHALL vẫn hiển thị các phần còn lại và giữ cho trang tiếp tục render mà không hiển thị trang lỗi toàn phần. `[STATIC]`

### Requirement 6: Mục Đối tác (tiềm năng / định hướng) — `P1` `[STATIC]`

**User Story:** Là một giảng viên/người hướng dẫn xem demo, tôi muốn thấy các nhóm đối tác mà sản phẩm hướng tới, để hiểu hệ sinh thái dự kiến.

#### Acceptance Criteria

1. WHEN người dùng xem mục Đối tác, THE Trang_Nội_Dung SHALL liệt kê các nhóm đối tác tiềm năng: trường đại học / phòng công tác sinh viên, F&B / nhà hàng / quán café, đơn vị tổ chức sự kiện, tiệc cưới, cổng thanh toán, doanh nghiệp thời vụ, và đối tác xác minh / an toàn. `[STATIC]`
2. WHEN Trang_Nội_Dung hiển thị bất kỳ đối tác tiềm năng nào, THE Trang_Nội_Dung SHALL gắn nhãn rõ ràng rằng đó là đối tác "tiềm năng / định hướng", kể cả khi cách trình bày không gây hiểu nhầm. `[STATIC]`
3. THE Trang_Nội_Dung SHALL không gắn nhãn "tiềm năng / định hướng" cho bất kỳ đối tác thực tế (đã được xác lập) nào. `[STATIC]`
4. THE Trang_Nội_Dung SHALL không trình bày các nhóm đối tác tiềm năng theo cách khiến người đọc hiểu nhầm là quan hệ đối tác đã được xác lập. `[STATIC]`

### Requirement 7: Cam kết điều khoản khi đăng ký — `P0` `[MOCK/localStorage]`

**User Story:** Là một người dùng đang đăng ký, tôi muốn xác nhận đã đọc và đồng ý các điều khoản, để hiểu rõ quyền lợi và trách nhiệm trước khi tạo tài khoản.

#### Acceptance Criteria

1. WHEN Trang_Đăng_Ký hiển thị biểu mẫu đăng ký, THE Trang_Đăng_Ký SHALL hiển thị một ô đánh dấu (checkbox) bắt buộc với nội dung "Tôi đã đọc và đồng ý với điều khoản sử dụng / chính sách an toàn / quy định xử lý tranh chấp". `[STATIC]`
2. WHEN Trang_Đăng_Ký hiển thị ô đánh dấu cam kết, THE Trang_Đăng_Ký SHALL kèm các liên kết tới `/terms`, `/privacy` và `/safety`. `[STATIC]`
3. IF người dùng gửi biểu mẫu đăng ký khi ô đánh dấu cam kết chưa được tích, THEN THE Trang_Đăng_Ký SHALL chặn việc đăng ký và hiển thị thông báo yêu cầu đồng ý điều khoản. `[MOCK/localStorage]`
4. WHEN người dùng đã tích ô đánh dấu cam kết và mọi trường hợp lệ, THE Trang_Đăng_Ký SHALL cho phép tiếp tục quy trình đăng ký hiện có. `[MOCK/localStorage]`
5. THE Trang_Đăng_Ký SHALL giữ nguyên hành vi của luồng xác thực/đăng ký hiện có (chỉ bổ sung bước kiểm tra cam kết ở phía frontend). `[MOCK/localStorage]`

### Requirement 8: Khảo sát thu thập dữ liệu cho Người lao động — `P0` `[MOCK/localStorage]`

**User Story:** Là một thành viên nhóm dự án thu thập dữ liệu, tôi muốn thu thập khảo sát từ người lao động, để hiểu nhu cầu và hành vi tìm việc của họ.

#### Acceptance Criteria

1. WHEN Người_Lao_Động mở khảo sát dành cho người lao động, THE Hệ_Thống_Khảo_Sát SHALL hiển thị các câu hỏi: nơi thường tìm việc, khó khăn khi tìm việc ngắn hạn, ngành muốn làm, ưu tiên (lương / gần nhà / giờ linh hoạt / uy tín), và mức độ sẵn sàng dùng web/app. `[STATIC]`
2. WHEN Người_Lao_Động gửi khảo sát hợp lệ, THE Hệ_Thống_Khảo_Sát SHALL lưu câu trả lời vào localStorage qua lớp persistence. `[MOCK/localStorage]`
3. IF một câu hỏi bắt buộc chưa được trả lời khi gửi, THEN THE Hệ_Thống_Khảo_Sát SHALL chặn việc gửi và chỉ rõ câu hỏi còn thiếu. `[MOCK/localStorage]`
4. WHEN Người_Lao_Động gửi khảo sát thành công, THE Hệ_Thống_Khảo_Sát SHALL hiển thị xác nhận đã ghi nhận câu trả lời. `[STATIC]`
5. THE Hệ_Thống_Khảo_Sát SHALL lưu dữ liệu khảo sát chỉ trên trình duyệt và không gửi yêu cầu mạng thật ra ngoài. `[MOCK/localStorage]`

### Requirement 9: Khảo sát thu thập dữ liệu cho Nhà tuyển dụng — `P0` `[MOCK/localStorage]`

**User Story:** Là một thành viên nhóm dự án thu thập dữ liệu, tôi muốn thu thập khảo sát từ nhà tuyển dụng, để hiểu nhu cầu tuyển dụng và mức độ sẵn sàng trả phí.

#### Acceptance Criteria

1. WHEN Nhà_Tuyển_Dụng mở khảo sát dành cho nhà tuyển dụng, THE Hệ_Thống_Khảo_Sát SHALL hiển thị các câu hỏi: ngành cần tuyển, tần suất tuyển, kênh đang tuyển hiện tại, khó khăn (thiếu người / bùng ca / lọc ứng viên / chất lượng), mức độ sẵn sàng dùng thử miễn phí, mức độ sẵn sàng trả phí, mô hình ưa thích (trả theo ca / gói tháng / ví trả trước / hoa hồng), và khả năng giới thiệu doanh nghiệp hoặc người phù hợp. `[STATIC]`
2. WHEN Nhà_Tuyển_Dụng gửi khảo sát hợp lệ, THE Hệ_Thống_Khảo_Sát SHALL lưu câu trả lời vào localStorage qua lớp persistence. `[MOCK/localStorage]`
3. IF một câu hỏi bắt buộc chưa được trả lời khi gửi, THEN THE Hệ_Thống_Khảo_Sát SHALL chặn việc gửi và chỉ rõ câu hỏi còn thiếu. `[MOCK/localStorage]`
4. IF khảo sát thu thập tên hoặc số điện thoại của một bên thứ ba, THEN THE Hệ_Thống_Khảo_Sát SHALL chặn việc gửi cho đến khi ô đánh dấu đồng ý chia sẻ thực sự được tích, chứ không chỉ dựa vào sự hiện diện của ô đánh dấu. `[MOCK/localStorage]`
5. WHEN Nhà_Tuyển_Dụng gửi khảo sát hợp lệ, THE Hệ_Thống_Khảo_Sát SHALL hiển thị xác nhận đã ghi nhận câu trả lời. `[STATIC]`
6. IF việc gửi khảo sát không hợp lệ hoặc bị chặn, THEN THE Hệ_Thống_Khảo_Sát SHALL không hiển thị xác nhận thành công. `[STATIC]`
7. THE Hệ_Thống_Khảo_Sát SHALL lưu dữ liệu khảo sát chỉ trên trình duyệt và không gửi yêu cầu mạng thật ra ngoài. `[MOCK/localStorage]`

### Requirement 10: Nội dung Business Model Canvas và điểm khác biệt — `P1` `[STATIC]`

**User Story:** Là một giảng viên/người hướng dẫn xem demo, tôi muốn xem mô hình kinh doanh và điểm khác biệt của sản phẩm, để đánh giá tính khả thi và định vị cạnh tranh.

#### Acceptance Criteria

1. WHEN người dùng mở trang nội dung BMC, THE Trang_Nội_Dung SHALL hiển thị đủ 9 khối: Value Propositions, Customer Segments, Customer Relationships, Channels, Key Activities, Key Resources, Key Partners, Cost Structure, Revenue Streams. `[STATIC]`
2. WHEN người dùng xem nội dung điểm khác biệt, THE Trang_Nội_Dung SHALL trình bày sự khác biệt của CaLẻ so với nhóm Facebook / Zalo / Manpower / Beetask. `[STATIC]`
3. THE Trang_Nội_Dung SHALL nêu các yếu tố khác biệt: chuyên về tuyển dụng ngắn hạn, xác minh, điểm uy tín, check-in/check-out, thanh toán minh bạch, và dữ liệu giảm rủi ro bùng ca. `[STATIC]`
4. THE Trang_Nội_Dung SHALL trình bày nội dung BMC dưới dạng trang tĩnh tại một route mới mà không làm hỏng quá trình build. `[STATIC]`
5. IF một số trong 9 khối BMC không tải hoặc không render được, THEN THE Trang_Nội_Dung SHALL vẫn mở trang BMC và hiển thị các khối còn lại (hiển thị một phần, không chặn cứng toàn trang). `[STATIC]`

### Requirement 11: Định hướng ngành ban đầu hiển thị trên web — `P1` `[STATIC]`

**User Story:** Là một Khách_Truy_Cập, tôi muốn thấy các ngành mà nền tảng tập trung phục vụ, để biết sản phẩm có phù hợp với nhu cầu của mình hay không.

#### Acceptance Criteria

1. WHEN Khách_Truy_Cập xem mục định hướng ngành, THE Trang_Chủ SHALL hiển thị các ngành trọng tâm: Nhà hàng / F&B, Quán café, Sự kiện, Tiệc cưới, Bán lẻ, và Kho vận nhẹ. `[STATIC]`
2. THE Trang_Chủ SHALL trình bày các ngành trọng tâm theo cách thể hiện sự tập trung rõ ràng thay vì gợi ý nền tảng phục vụ mọi ngành. `[STATIC]`
3. IF một số ngành trọng tâm không tải hoặc không render được, THEN THE Trang_Chủ SHALL vẫn hiển thị các ngành trọng tâm còn lại (hiển thị một phần). `[STATIC]`

### Requirement 12: Guardrails & Yêu cầu phi chức năng (bảo toàn baseline) — `P0` `[STATIC]` + `[MOCK/localStorage]`

**User Story:** Là một thành viên nhóm dự án, tôi muốn mọi thay đổi của Phase 1 nằm trong phạm vi an toàn, để baseline xanh và nghiệp vụ lõi không bị ảnh hưởng.

#### Acceptance Criteria

1. THE Hệ_Thống_CaLẻ SHALL giữ nguyên hành vi của vòng đời ca làm, luồng ứng tuyển, cổng check-in/check-out, ví/ký quỹ, điểm uy tín, tiến trình kỹ năng, ghép lịch, thông báo/deeplink, tranh chấp/đánh giá/báo cáo và bản nháp ca sau khi triển khai Phase 1. `[STATIC]`
2. THE Hệ_Thống_CaLẻ SHALL giữ nguyên nguyên trạng nội dung mã nguồn của các module Logic_Lõi (`src/domain/escrow.ts`, `deposit.ts`, `reputation.ts`, `shiftLifecycleState.ts`, `lifecycleSync.ts`, `timeGates.ts`; phần logic của `src/stores/applicationStore.ts`, `shiftStore.ts`, `walletStore.ts`, `adminStore.ts`), bao gồm cả việc không thực hiện bất kỳ thay đổi nào chỉ mang tính chất lượng mã (thêm/sửa chú thích, đổi tên, tách hàm trợ giúp) bên trong các tệp này. `[STATIC]`
3. THE Hệ_Thống_CaLẻ SHALL giữ nguyên tất cả đường dẫn route hiện có và không xoá route nào đang tồn tại. `[STATIC]`
4. WHERE Phase 1 thêm route mới, THE Hệ_Thống_CaLẻ SHALL giữ `next build` ở trạng thái thành công (build xanh). `[STATIC]`
5. THE Hệ_Thống_CaLẻ SHALL giữ nguyên Baseline_Xanh: eslint pass, tsc pass, vitest 544 test pass, và next build pass. `[STATIC]`
6. THE Hệ_Thống_CaLẻ SHALL chỉ vận hành ở chế độ MOCK/STATIC trong Phase 1, không thêm backend, không thanh toán thật, và không thay đổi cơ chế xác thực thật. `[MOCK/localStorage]`
7. WHEN Phase 1 lưu dữ liệu mới (khảo sát, lựa chọn vai trò), THE Hệ_Thống_CaLẻ SHALL chỉ lưu qua localStorage/mock và không gửi dữ liệu ra dịch vụ bên ngoài. `[MOCK/localStorage]`
8. IF localStorage không khả dụng hoặc bị vô hiệu hoá khi lưu dữ liệu khảo sát hoặc lựa chọn vai trò, THEN THE Hệ_Thống_CaLẻ SHALL dùng cơ chế lưu trữ dự phòng phía trình duyệt (sessionStorage hoặc bộ nhớ tạm trong phiên) và vẫn không gửi dữ liệu ra dịch vụ bên ngoài. `[MOCK/localStorage]`
9. THE Hệ_Thống_CaLẻ SHALL chỉ thay đổi giao diện ở mức nội dung/ngôn từ và phân tách vai trò trên landing, tái sử dụng các primitive hiện có (InfoPage, Card, Button, Modal) mà không thực hiện thiết kế lại toàn bộ giao diện. `[STATIC]`
