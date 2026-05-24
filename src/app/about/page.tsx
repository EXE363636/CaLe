import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = { title: 'Giới thiệu — CaLẻ / Now' };

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Về chúng tôi"
      title="Giới thiệu CaLẻ / Now"
      intro="CaLẻ (Now) là sản phẩm của CaLedo Tech — đội ngũ Việt Nam xây dựng nền tảng kết nối ca làm ngắn hạn cho người lao động linh hoạt và nhà tuyển dụng địa phương."
      ctas={[
        { label: 'Tìm ca làm', href: '/shifts' },
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Sứ mệnh">
        Chúng tôi tin rằng mọi giờ làm việc đều có giá trị. CaLẻ giúp người
        lao động nhận ca minh bạch về giờ giấc, mức lương, địa điểm, và giúp
        nhà tuyển dụng tìm được người phù hợp một cách an toàn.
      </InfoSection>

      <InfoSection title="Cách chúng tôi xây dựng niềm tin">
        <InfoList
          items={[
            'Đặt cọc trước khi ca được công khai để đảm bảo người lao động nhận đúng tiền công.',
            'Điểm uy tín hai chiều: cả người làm và nhà tuyển dụng đều có hồ sơ minh bạch.',
            'Quy trình huỷ ca rõ ràng để hạn chế rủi ro cho cả hai bên.',
            'Hỗ trợ tiếng Việt từ đội ngũ tại Hà Nội.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Đội ngũ phía sau">
        CaLedo Tech được thành lập với mục tiêu đưa các công cụ làm việc
        ngắn hạn đến gần hơn với thị trường lao động Việt Nam, đặc biệt là
        các bạn cần ca linh hoạt theo lịch học hoặc lịch cá nhân, và các
        chủ quán/cửa hàng cần người làm bù trong giờ cao điểm.
      </InfoSection>

      <InfoSection title="Phiên bản hiện tại">
        Đây là phiên bản dùng thử. Mọi giao dịch tiền tệ trên ứng dụng đều
        là mô phỏng — chưa kết nối với hệ thống thanh toán thực. Khi sản
        phẩm chính thức ra mắt, chúng tôi sẽ thông báo trước cho người dùng
        đã đăng ký.
      </InfoSection>
    </InfoPage>
  );
}
