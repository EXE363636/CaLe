import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = {
  title: 'Giữ tiền ca làm (mô phỏng) — CaLẻ / Now',
};

export default function EmployerPaymentsPage() {
  return (
    <InfoPage
      eyebrow="Dành cho nhà tuyển dụng"
      title="Giữ tiền ca làm (mô phỏng)"
      intro="CaLẻ áp dụng mô hình giữ tiền ca làm: nhà tuyển dụng nạp trước tiền công vào ví ký quỹ, tiền chỉ được giải ngân khi ca hoàn thành thực tế. Đây là cam kết chất lượng cho người lao động. Trong MVP/demo không có giao dịch thật."
      ctas={[
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
        { label: 'Quản lý ứng viên', href: '/employer/dashboard', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Cấp độ tin cậy và tỷ lệ giữ tiền ca làm">
        <InfoList
          items={[
            'Trong giai đoạn dùng thử, mọi nhà tuyển dụng đều giữ trước 100% tiền công của ca, không phụ thuộc cấp độ tin cậy.',
            'Cấp độ tin cậy (Mới / Đã xác minh / Tin cậy cao) sẽ ảnh hưởng đến hiển thị, ưu tiên và phí dịch vụ trong tương lai, nhưng không làm giảm tỷ lệ ký quỹ.',
            'Mục tiêu là bảo vệ tiền công cho người lao động ngay cả khi nhà tuyển dụng không liên hệ được.',
          ]}
        />
        Tổng khoản tiền ca được giữ = mức theo giờ × số giờ × số vị
        trí. Toàn bộ khoản này được giữ trong ví ký quỹ cho đến khi ca
        hoàn thành hoặc được hoàn theo quy định huỷ.
      </InfoSection>

      <InfoSection title="Khi nào tiền được giải ngân">
        <InfoList
          items={[
            'Khi bạn xác nhận hoàn thành ca, hệ thống chuyển khoản tiền ca được giữ thành tiền công cho người lao động.',
            'Khi bạn huỷ ca đúng quy định (trước 6 giờ và chưa có ứng viên), tiền được hoàn về ví ký quỹ.',
            'Khi xảy ra tranh chấp, quản trị viên quyết định giải ngân hoặc hoàn khoản tiền ca được giữ dựa trên bằng chứng.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Quy định huỷ ca cho nhà tuyển dụng">
        <InfoList
          items={[
            'Trước 6 giờ: huỷ tự do, hoàn 100% khoản tiền ca được giữ.',
            'Trong vòng 6 giờ trước giờ bắt đầu, có ứng viên đang chờ duyệt hoặc đã được duyệt: chặn huỷ để bảo vệ người lao động.',
            'Trong vòng 6 giờ và chưa có ứng viên nào: vẫn được phép huỷ.',
            'Sau giờ bắt đầu: không được phép huỷ.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Lượt boost">
        Khi người lao động vắng mặt không báo trước, bạn được
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
