import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = { title: 'Điều khoản sử dụng — CaLẻ' };

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Pháp lý"
      title="Điều khoản sử dụng"
      intro="Bằng việc tạo tài khoản hoặc sử dụng dịch vụ CaLẻ, bạn đồng ý với các điều khoản dưới đây. Tài liệu áp dụng cho phiên bản dùng thử của sản phẩm."
    >
      <InfoSection title="1. Phạm vi dịch vụ">
        CaLẻ là nền tảng kết nối nhà tuyển dụng cần người lao động ngắn hạn với
        người lao động linh hoạt. Chúng tôi không phải là người sử dụng
        lao động trực tiếp; quan hệ lao động được hai bên trao đổi tự
        nguyện thông qua nền tảng.
      </InfoSection>

      <InfoSection title="2. Tạo tài khoản">
        Bạn cần cung cấp thông tin chính xác và cập nhật. Bạn chịu trách
        nhiệm bảo mật mật khẩu của mình. CaLẻ có thể tạm khoá tài khoản
        nếu phát hiện hành vi gian lận, mạo danh, hoặc vi phạm pháp luật.
      </InfoSection>

      <InfoSection title="3. Hành vi không được phép">
        <InfoList
          items={[
            'Đăng ca giả, ca không có thật, hoặc ca vi phạm pháp luật.',
            'Mạo danh người khác, sử dụng giấy tờ giả để xác minh.',
            'Yêu cầu/hứa thanh toán ngoài luồng nền tảng.',
            'Quấy rối, đe doạ hoặc có hành vi không phù hợp với người dùng khác.',
          ]}
        />
      </InfoSection>

      <InfoSection title="4. Đảm bảo thanh toán">
        Nhà tuyển dụng đảm bảo thanh toán trước khi ca công khai. Khoản
        đảm bảo thanh toán được giải ngân hoặc hoàn lại theo trạng thái
        ca. Trong phiên bản dùng thử hiện tại, mọi giao dịch tiền tệ là
        mô phỏng và không tạo nghĩa vụ tài chính thực tế giữa các bên.
      </InfoSection>

      <InfoSection title="5. Thay đổi điều khoản">
        CaLedo Tech có thể cập nhật điều khoản theo thời gian. Người dùng
        sẽ được thông báo trước khi điều khoản mới có hiệu lực, và có
        quyền ngừng sử dụng dịch vụ nếu không đồng ý với phiên bản mới.
      </InfoSection>

      <InfoSection title="6. Liên hệ">
        Mọi thắc mắc về điều khoản, vui lòng gửi về{' '}
        <a
          href="mailto:support@caledo.vn"
          className="text-orange-700 hover:underline"
        >
          support@caledo.vn
        </a>
        .
      </InfoSection>
    </InfoPage>
  );
}
