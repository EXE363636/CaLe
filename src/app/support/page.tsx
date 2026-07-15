import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata = { title: 'Liên hệ hỗ trợ — CaLẻ / Now' };

export default function SupportPage() {
  return (
    <InfoPage
      eyebrow="Hỗ trợ"
      title="Liên hệ hỗ trợ"
      intro="Đội ngũ CaLedo Tech sẵn sàng hỗ trợ bạn trong giờ hành chính. Ngoài giờ, vui lòng gửi email — chúng tôi phản hồi trong vòng 24 giờ vào các ngày làm việc."
      ctas={[
        { label: 'Câu hỏi thường gặp', href: '/faq', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Email hỗ trợ">
        Gửi email về{' '}
        <a
          href="mailto:support@caledo.vn"
          className="font-medium text-orange-700 hover:underline"
        >
          support@caledo.vn
        </a>
        . Trong tiêu đề, vui lòng ghi rõ vai trò (người làm hoặc nhà
        tuyển dụng) và mã ca làm liên quan (nếu có) để chúng tôi xử lý
        nhanh hơn.
      </InfoSection>

      <InfoSection title="Hotline">
        Tổng đài: <span className="font-medium">1900 3636</span>
        <br />
        Giờ trực: 08:00 – 20:00, Thứ Hai đến Thứ Bảy.
      </InfoSection>

      <InfoSection title="Văn phòng">
        CaLedo Tech
        <br />
        Hà Nội, Việt Nam
      </InfoSection>

      <InfoSection title="Phản ánh hoặc gợi ý sản phẩm">
        Chúng tôi rất mong nhận được phản hồi từ người dùng thực tế. Nếu
        bạn có ý tưởng để cải thiện CaLẻ, gửi cho chúng tôi qua email
        hoặc form phản hồi trong ứng dụng.
      </InfoSection>
    </InfoPage>
  );
}
