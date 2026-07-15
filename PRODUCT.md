# Product

## Register

product

## Users

CaLẻ / Now phục vụ ba vai trò trên một nền tảng việc làm theo ca ngắn hạn tại
Việt Nam. Đây là **web app phục vụ công việc**, không phải trang đăng tin;
trọng tâm là các luồng nghiệp vụ sau đăng nhập.

- **Người lao động (Worker).** Người trẻ, sinh viên, freelancer, lao động phổ
  thông tìm ca linh hoạt. Bối cảnh: thường thao tác trên điện thoại, khi đang
  di chuyển hoặc tranh thủ, cần quyết định nhanh với ca gần/ca gấp. Việc cần
  làm: tìm ca phù hợp, ứng tuyển, theo dõi trạng thái ca, check-in/check-out,
  xem tiền công, theo dõi điểm uy tín và kỹ năng.
- **Nhà tuyển dụng (Employer).** Doanh nghiệp nhỏ, cửa hàng, quán, đơn vị có
  nhu cầu người làm tạm thời. Việc cần làm: đăng ca, đặt cọc (mô phỏng), duyệt
  ứng viên, quản lý trạng thái làm việc, xử lý no-show, xác nhận hoàn thành,
  đánh giá và đối soát giờ/tiền công.
- **Quản trị viên (Admin).** Vận hành nền tảng. Việc cần làm: xác minh giấy
  tờ, xử lý tranh chấp, override trạng thái khi cần, điều chỉnh điểm uy tín.
  Bối cảnh: màn hình dày dữ liệu, ưu tiên độ chính xác và khả năng rà soát.

## Product Purpose

CaLẻ / Now là nền tảng **kết nối và quản lý việc làm theo ca ngắn hạn**, không
chỉ là nơi đăng tin. Sản phẩm dẫn người dùng qua một quy trình rõ ràng: đăng ca
→ ứng tuyển → duyệt → theo dõi trạng thái → check-in/out → hoàn thành → đánh
giá → đối soát. Giá trị cốt lõi là làm cho mỗi bên luôn biết ca đang ở trạng
thái nào, ai đã làm gì, tiền công và thời gian ra sao, và bước tiếp theo là gì.

Thành công nghĩa là: người lao động và nhà tuyển dụng hoàn thành trọn một vòng
đời ca làm mà không bối rối về trạng thái, và tin tưởng thông tin đủ minh bạch
để tiếp tục — kể cả khi có no-show hay tranh chấp.  

**Trạng thái trung thực (bắt buộc phản ánh trong UI).** Đây hiện là bản
demo/prototype chạy hoàn toàn ở trình duyệt (dữ liệu localStorage, backend chưa
được xây). UI **không được** tạo cảm giác đã có hệ thống tài chính hay chống
gian lận thật đang vận hành:

- Đặt cọc, ví, escrow, hoàn tiền → mô tả là **mô phỏng / sổ cái mô phỏng**.
- Thanh toán → **theo dõi trạng thái thanh toán**, không phải cổng thanh toán thật.
- Check-in/check-out → **theo dõi trạng thái ở mức prototype**, không phải
  GPS/QR chống gian lận.
- Không dùng từ ngữ hay biểu tượng gợi ý "guaranteed payout" hoặc giao dịch tài
  chính thật.

Quy ước hiển thị tiền tệ: dùng chữ thường `đ` / `đồng`; không dùng `VNĐ` hay `₫`.

## Brand Personality

Ba từ khóa dùng khi ra quyết định thiết kế: **đáng tin – rõ ràng – nhanh gọn**.

- **Đáng tin.** Sản phẩm xử lý việc làm, tiền công, xác minh, đánh giá và tranh
  chấp — giao diện phải củng cố niềm tin ở mỗi bước.
- **Rõ ràng.** Người dùng luôn biết ca ở đâu, lương bao nhiêu, trạng thái gì, ai
  duyệt, có vấn đề gì sau ca.
- **Nhanh gọn.** Việc theo ca cần thao tác nhanh, nhất là với ca gần/ca gấp/ca
  ngắn hạn.

Cảm giác chính người dùng nên có: *"Tôi biết mình đang làm gì, trạng thái của
ca đang ở đâu, và thông tin đủ minh bạch để yên tâm tiếp tục."*

Giọng điệu: chuyên nghiệp nhưng gần gũi. Đáng tin và nghiêm túc khi nói về tiền
công/tranh chấp, nhưng vẫn thân thiện, dễ hiểu với người dùng phổ thông — không
xa cách, không "đao to búa lớn". Copy theo vai trò: worker xưng "bạn"; employer
dùng "người làm"; admin dùng từ trung lập.

**Tên hiển thị:** dùng **CaLẻ** ở mọi bề mặt hướng người dùng (UI, landing, wording
người dùng đọc); chỉ dùng **CaLẻ / Now** trong tài liệu nội bộ/kỹ thuật (repo,
handoff), để không tạo cảm giác có hai thương hiệu khác nhau.

## Anti-references

Những gì CaLẻ **không** nên trông giống:

- **Web rao vặt / đăng tin lộn xộn** (nhiều màu, banner, chữ nhấp nháy, mật độ
  quảng cáo cao). Làm mất cảm giác đáng tin và che mờ quy trình.
- **Trang đăng tin việc làm thông thường.** CaLẻ là nền tảng có quy trình
  (đăng → duyệt → theo dõi → hoàn thành → đánh giá → đối soát); UI phải ưu tiên
  trạng thái, tiến trình và hành động tiếp theo, không phải chỉ là danh sách tin.
- **Gig-app sặc sỡ, game hóa quá đà.** Không biến điểm uy tín / huy hiệu / kỹ
  năng thành trò tích điểm giải trí. Trust Score là dữ liệu hỗ trợ quyết định
  việc làm — phải nghiêm túc và dễ hiểu, không phải bảng thành tích.
- **Fintech tối màu "sang chảnh" (navy/gold, glass, hào nhoáng).** Không hợp
  ngữ cảnh lao động phổ thông Việt Nam.
- **Dashboard dày đặc chữ, form dài, bảng rối.** Khiến người dùng ít rành công
  nghệ bị ngợp. Ưu tiên một hành động chính rõ ràng trên mỗi màn hình.
- **UI quá "corporate", xa người dùng phổ thông.** Cần chuyên nghiệp nhưng vẫn
  gần gũi với người lao động trẻ, sinh viên, freelancer và doanh nghiệp nhỏ.
- **Giao diện phóng đại năng lực hệ thống.** Không để wording/icon khiến người
  dùng hiểu nhầm rằng ví, escrow, thanh toán tự động hay chấm công chống gian
  lận thật đã vận hành (xem mục Product Purpose).

## Design Principles

1. **Đáng tin nhờ minh bạch.** Mỗi màn hình phải trả lời được: ca đang ở trạng
   thái nào, tiền công/thời gian ra sao, ai đã hành động, bước tiếp theo là gì.
   Ưu tiên trạng thái và tiến trình hơn trang trí.
2. **Trung thực mặc định.** Không bao giờ ngụ ý một hệ thống tài chính hay chống
   gian lận thật khi nó chỉ là mô phỏng. Gắn nhãn rõ phần mô phỏng/prototype.
3. **Rõ ràng hơn hoa mỹ.** Mỗi màn hình có một hành động chính rõ ràng ("Ứng
   tuyển ca", "Duyệt ứng viên", "Xác nhận hoàn thành", "Xuất đối soát"). Trạng
   thái quan trọng không chỉ dựa vào màu — kèm nhãn chữ và/hoặc icon.
4. **Nhanh gọn theo ngữ cảnh.** Thiết kế mobile-first, thao tác ít bước, hoạt
   động tốt trên màn nhỏ và mạng không ổn định — vì người dùng thường quyết định
   ca ngay khi đang di chuyển.
5. **Chuyên nghiệp nhưng gần gũi.** Đủ nghiêm túc để tin tưởng giao tiền công và
   tranh chấp, đủ thân thiện để người dùng phổ thông dùng ngay mà không thấy
   xa cách. Nhất quán vocabulary component trên mọi màn hình.

## Accessibility & Inclusion

- **Mục tiêu: WCAG 2.1 mức AA** làm chuẩn tối thiểu, đặc biệt cho form, bảng,
  trạng thái ca, nút hành động chính, thông báo lỗi và luồng xác nhận.
- **Mobile-first.** Người lao động thao tác nhiều trên điện thoại (tìm ca, xem
  ca gần, ứng tuyển, cập nhật trạng thái). Tối ưu cho màn hình nhỏ, mạng không
  ổn định và thao tác nhanh. *(Chưa có số liệu thiết bị cụ thể trong tài liệu —
  không khẳng định tỷ lệ Android đời thấp; nhưng vẫn thiết kế phòng cho thiết bị
  yếu.)*
- **Tương phản cao hơn mức "đẹp mắt".** Người dùng có thể xem ca ngoài trời,
  trong quán/cửa hàng, ánh sáng thất thường. Giữ được nền kem ấm + cam chủ đạo,
  nhưng chữ, nút, badge trạng thái và cảnh báo phải đủ rõ (body ≥ 4.5:1).
- **Chữ tiếng Việt dễ đọc.** Không quá nhỏ, không lỗi dấu, không nhồi mô tả dài
  trong màn hình thao tác chính.
- **Trạng thái không chỉ dựa vào màu.** "Đang chờ duyệt", "Đã duyệt", "Đang
  làm", "Hoàn thành", "Có tranh chấp", "No-show"… phải có cả nhãn chữ, icon
  hoặc mô tả ngắn.
- **Tôn trọng `prefers-reduced-motion`.** Giữ motion để định hướng thao tác và
  tạo cảm giác mượt, nhưng luôn có phương án giảm chuyển động; không gây phân tâm
  trong app xử lý việc làm và tiền công.
- **Chạm tối thiểu 44×44px** cho mọi phần tử tương tác.
