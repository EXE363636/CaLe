import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = {
  title: 'Đặt cọc & thanh toán — CaLẻ / ShiftNow',
};

export default function EmployerPaymentsPage() {
  return (
    <InfoPage
      eyebrow="Dành cho nhà tuyển dụng"
      title="Đặt cọc & thanh toán"
      intro="CaLẻ áp dụng mô hình ký quỹ: nhà tuyển dụng đặt cọc trước, tiền chỉ được giải ngân khi ca hoàn thành thực tế. Đây là cam kết chất lượng cho người lao động."
      ctas={[
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
        { label: 'Quản lý ứng viên', href: '/employer/dashboard', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Cấp độ tin cậy và tỷ lệ đặt cọc">
        <InfoList
          items={[
            'Mới (Low): cần đặt cọc 100% tiền công của ca.',
            'Đã xác minh hoặc đã hoàn thành ≥ 3 ca (Medium): cần đặt cọc 70%.',
            'Đã xác minh và đã hoàn thành ≥ 5 ca (High): cần đặt cọc 50%.',
          ]}
        />
        Tỷ lệ này được tính trên tổng tiền công (mức theo giờ × số giờ
        × số vị trí). Phần còn lại được thanh toán sau khi ca hoàn
        thành.
      </InfoSection>

      <InfoSection title="Khi nào tiền được giải ngân">
        <InfoList
          items={[
            'Khi bạn xác nhận hoàn thành ca, hệ thống chuyển tiền cọc thành tiền công cho người làm.',
            'Khi bạn huỷ ca đúng quy định (trước 6 giờ và chưa có ứng viên), tiền được hoàn về ví ký quỹ.',
            'Khi xảy ra tranh chấp, quản trị viên quyết định giải ngân hoặc hoàn cọc dựa trên bằng chứng.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Quy định huỷ ca cho nhà tuyển dụng">
        <InfoList
          items={[
            'Trước 6 giờ: huỷ tự do, hoàn 100% cọc.',
            'Trong vòng 6 giờ trước giờ bắt đầu, có ứng viên đang chờ duyệt hoặc đã được duyệt: chặn huỷ để bảo vệ người lao động.',
            'Trong vòng 6 giờ và chưa có ứng viên nào: vẫn được phép huỷ.',
            'Sau giờ bắt đầu: không được phép huỷ.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Lượt boost">
        Khi người lao động vắng mặt không báo trước (no-show), bạn được
        tặng 1 lượt boost để dùng cho ca tiếp theo, giúp ca hiển thị
        ưu tiên trong danh sách tìm việc.
      </InfoSection>

      <InfoSection title="Lưu ý phiên bản dùng thử">
        Mọi giao dịch tiền tệ trên CaLẻ hiện tại là mô phỏng. Khi
        phiên bản chính thức ra mắt, chúng tôi sẽ thông báo rõ về cổng
        thanh toán hỗ trợ và các điều khoản tài chính áp dụng.
      </InfoSection>
    </InfoPage>
  );
}
