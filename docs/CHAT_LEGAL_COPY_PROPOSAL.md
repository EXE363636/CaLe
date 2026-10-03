# Đề xuất câu chữ pháp lý cho chat (chờ chủ dự án duyệt)

> Nhánh `feat/chat`, migration 0035. **Chưa sửa** `/privacy`, `/terms`: câu pháp lý phải
> được chủ dự án duyệt nguyên văn (như đợt 03/10). Sau khi duyệt, thêm vào bản **thật**
> (`NEXT_PUBLIC_DATA_MODE=supabase`) của hai trang + bản tiếng Anh, và mở rộng
> `src/__tests__/legalLiveWording.test.tsx`.

## Cần chủ dự án chốt trước
1. **Thời hạn lưu tin nhắn.** Đề xuất: **12 tháng kể từ khi ca kết thúc**, trừ cuộc trò
   chuyện còn báo cáo chưa xử lý hoặc còn khoản cọc chờ admin xử (giữ tới khi xử xong).
   Hết hạn thì xoá. Hiện **chưa có** job xoá: cần một migration nhỏ sau khi chốt số.
2. Câu dưới đây có chấp nhận nguyên văn không (sửa thẳng trong file này rồi báo lại).

## `/privacy` — thêm một mục "Tin nhắn trong ca làm"
- Khi đơn ứng tuyển được duyệt, bạn và nhà tuyển dụng của ca có thể nhắn tin cho nhau
  trên CaLẻ. Nội dung tin (chữ), thời gian gửi và người gửi được lưu trên máy chủ của
  CaLẻ (Supabase). Tin không được mã hoá đầu cuối.
- Chỉ hai bên của đơn ứng tuyển đọc được cuộc trò chuyện.
- Quản trị viên CaLẻ chỉ đọc một cuộc trò chuyện khi có tin nhắn bị báo cáo, hoặc khi
  khoản cọc của đơn đó đang chờ quản trị viên xử lý (kể cả khi hệ thống tự chuyển sang
  chờ xử lý), và chỉ để giải quyết vụ việc đó. Mỗi lần đọc đều được ghi lại.
- Thông báo về tin nhắn mới không chứa nội dung tin.
- Tin nhắn được lưu {THỜI HẠN} kể từ khi ca kết thúc, rồi bị xoá; cuộc trò chuyện đang
  được xử lý báo cáo hoặc cọc được giữ tới khi xử lý xong.
- Bạn có thể yêu cầu trích xuất hoặc xoá tin nhắn của mình qua đội hỗ trợ CaLẻ.
- Đừng gửi số CCCD, mật khẩu, mã OTP hay số tài khoản ngân hàng qua tin nhắn.

## `/terms` — thêm một mục "Sử dụng tin nhắn"
- Tin nhắn chỉ dùng để trao đổi về ca làm. Không quấy rối, đe doạ, xúc phạm; không chia
  sẻ dữ liệu cá nhân của người khác; không lôi kéo trả tiền hoặc giao dịch ngoài CaLẻ.
- Tin đã gửi không sửa hoặc xoá được.
- Cuộc trò chuyện chỉ còn xem lại được khi đơn kết thúc hoặc bị huỷ, khi ca bị huỷ, hoặc
  sau 7 ngày kể từ giờ kết thúc ca.
- Mỗi người gửi được tối đa 20 tin mỗi phút và 300 tin mỗi ngày.
- Bạn có thể báo cáo tin nhắn vi phạm. CaLẻ có thể xem cuộc trò chuyện bị báo cáo hoặc
  có khoản cọc đang chờ xử lý, và dùng làm căn cứ xử lý, kể cả tạm khoá tài khoản.
  Báo cáo sai sự thật có thể bị xử lý.

## Kỹ thuật kèm theo (khi đã chốt)
- Migration dọn tin quá hạn (cron, bỏ qua cuộc còn báo cáo chưa xử lý / cọc Contested).
- Bản tiếng Anh trong `src/i18n/en-pages.ts`.
