import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export default async function SupportPage() {
  const tx = await getTx();
  return (
    <InfoPage
      eyebrow={tx('Hỗ trợ')}
      title={tx('Liên hệ hỗ trợ')}
      intro={tx('Đội ngũ CaLedo Tech sẵn sàng hỗ trợ bạn trong giờ hành chính. Ngoài giờ, vui lòng gửi email — chúng tôi phản hồi trong vòng 24 giờ vào các ngày làm việc.')}
      ctas={[
        { label: tx('Câu hỏi thường gặp'), href: '/faq', variant: 'secondary' },
      ]}
    >
      <InfoSection title={tx('Email hỗ trợ')}>
        {tx('Gửi email về')}{' '}
        <a
          href="mailto:nguyenphuonganh98113@gmail.com"
          className="font-medium text-orange-700 hover:underline"
        >
          nguyenphuonganh98113@gmail.com
        </a>
        {tx('. Trong tiêu đề, vui lòng ghi rõ vai trò (người lao động hoặc nhà tuyển dụng) và mã ca làm liên quan (nếu có) để chúng tôi xử lý nhanh hơn.')}
      </InfoSection>

      <InfoSection title="Hotline">
        {tx('Tổng đài:')} <span className="font-medium">0868325698</span>
        <br />
        {tx('Giờ trực: 08:00 – 20:00, Thứ Hai đến Thứ Bảy.')}
      </InfoSection>

      <InfoSection title={tx('Văn phòng')}>
        CaLedo Tech
        <br />
        Hà Nội, Việt Nam
      </InfoSection>

      <InfoSection title={tx('Phản ánh hoặc gợi ý sản phẩm')}>
        {tx('Chúng tôi rất mong nhận được phản hồi từ người dùng thực tế. Nếu bạn có ý tưởng để cải thiện CaLẻ, gửi cho chúng tôi qua email hoặc form phản hồi trong ứng dụng.')}
      </InfoSection>
    </InfoPage>
  );
}
