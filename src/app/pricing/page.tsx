import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = {
  title: 'Bảng giá — CaLẻ',
};

/**
 * Trang bảng giá công khai. KHÔNG có gói cũ trong code/Git history nên KHÔNG bịa
 * con số: hiển thị trung thực giai đoạn thử nghiệm (0đ, miễn phí), liệt kê các
 * tính năng ĐÃ hoạt động thật, và khu vực "Gói chính thức — sắp công bố".
 * Không có nút mua thật; CTA chỉ dẫn tới đăng ký / đăng ca.
 */
export default function PricingPage() {
  return (
    <InfoPage
      eyebrow="Bảng giá"
      title="Giai đoạn thử nghiệm — Miễn phí"
      intro="CaLẻ đang trong giai đoạn thử nghiệm. Mọi tính năng hiện có đều miễn phí. CaLẻ hiện chưa thu phí và chưa thu, giữ hoặc chuyển tiền giữa hai bên."
      ctas={[
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
        { label: 'Đăng ký / Đăng nhập', href: '/register', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Gói hiện tại: Thử nghiệm — 0đ">
        <p className="mb-2">
          <span className="text-2xl font-extrabold text-orange-700">0đ</span>{' '}
          <span className="text-sm text-gray-500">· Miễn phí trong thời gian thử nghiệm</span>
        </p>
        <p>Các tính năng đang hoạt động thật:</p>
        <InfoList
          items={[
            'Đăng ký / đăng nhập Người lao động và Nhà tuyển dụng.',
            'Đăng ca, quản lý và duyệt/từ chối ứng viên.',
            'Người lao động tìm ca và ứng tuyển.',
            'Chấm công: check-in, xác nhận có mặt, check-out, xác nhận hoàn thành (lưu trên hệ thống).',
            'Đồng bộ dữ liệu giữa các thiết bị/phiên đăng nhập.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Gói chính thức — sắp công bố">
        <p>
          Chúng tôi sẽ công bố các gói dịch vụ chính thức trong thời gian tới. Nếu có bất kỳ
          khoản phí nào, CaLẻ sẽ thông báo rõ ràng và trước khi áp dụng.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Thanh toán trong ứng dụng hiện đang ở chế độ mô phỏng phục vụ thử nghiệm — chưa có giao
          dịch tiền thật.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
