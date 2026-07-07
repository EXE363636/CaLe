import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata = { title: 'Câu hỏi thường gặp — CaLẻ / Now' };

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="Hỗ trợ"
      title="Câu hỏi thường gặp"
      intro="Tổng hợp các câu hỏi chúng tôi nhận được nhiều nhất từ người lao động và nhà tuyển dụng. Nếu bạn không tìm thấy câu trả lời, hãy liên hệ tổ hỗ trợ."
      ctas={[
        { label: 'Liên hệ hỗ trợ', href: '/support' },
      ]}
    >
      <InfoSection title="Tôi có phải trả trước khoản nào khi đăng ký người lao động không?">
        Không. Người lao động hoàn toàn không phải nộp phí đăng ký, khoản
        trả trước hoặc phí ẩn nào. Mọi khoản đảm bảo thanh toán trên hệ
        thống đều do nhà tuyển dụng thực hiện trước khi ca được công khai.
      </InfoSection>

      <InfoSection title="Tại sao tôi không ứng tuyển được một số ca?">
        Bạn cần xác minh số điện thoại trước khi ứng tuyển ca đầu tiên,
        và điểm uy tín cần ≥ 50. Một số ca cũng yêu cầu xác minh thêm
        CMND/CCCD hoặc thẻ sinh viên — thông tin này hiển thị ở phần
        chi tiết ca làm.
      </InfoSection>

      <InfoSection title="Tôi có thể huỷ ca đã ứng tuyển không?">
        Có, nhưng quy định khác nhau theo thời điểm huỷ. Huỷ trước giờ
        bắt đầu hơn 24h không bị trừ điểm; huỷ sát giờ trong vòng 24h
        sẽ bị trừ −10 điểm uy tín và có thể cần nhà tuyển dụng đồng ý.
        Chi tiết tại &quot;Quy định huỷ ca&quot;.
      </InfoSection>

      <InfoSection title="Khi nào tôi nhận được tiền công?">
        Sau khi bạn check-out và nhà tuyển dụng xác nhận hoàn thành,
        tiền công được giải ngân vào hệ thống và phản ánh ngay trong
        mục &quot;Tổng thu nhập&quot; trên dashboard người lao động. Trong bản
        dùng thử hiện tại, mọi giao dịch tiền tệ đều là mô phỏng.
      </InfoSection>

      <InfoSection title="Tôi đăng ca xong nhưng chưa ai ứng tuyển, làm sao bây giờ?">
        Hãy đảm bảo ca đã được đảm bảo thanh toán và công khai (kiểm tra trạng thái
        hiển thị &quot;Đang tuyển&quot;). Mô tả ca rõ ràng, mức lương theo thị
        trường khu vực, và sử dụng lượt boost (nếu có) để ưu tiên hiển
        thị. Nếu cần thay đổi mô tả, dùng nút Chỉnh sửa trước 24h.
      </InfoSection>

      <InfoSection title="Tôi gặp tranh chấp với người lao động/nhà tuyển dụng — phải làm sao?">
        Mở chi tiết ca làm và bấm &quot;Báo cáo sự cố&quot;. Quản trị viên sẽ xem
        xét hồ sơ, đánh giá từ cả hai bên và đưa ra quyết định giải
        ngân hoặc hoàn khoản đảm bảo thanh toán. Vui lòng tham khảo &quot;Chính sách xử lý tranh
        chấp&quot; để biết quy trình.
      </InfoSection>
    </InfoPage>
  );
}
