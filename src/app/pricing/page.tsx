import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

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
  // Supabase/production: phí nền tảng 10% ĐANG được thu thật (giữ cùng cọc,
  // chỉ tính trên phần ca có người làm — khớp _finalize_shift_deposit, 0018).
  if (isSupabaseEnv()) {
    return (
      <InfoPage
        eyebrow="Bảng giá"
        title="Bảng giá giai đoạn thử nghiệm (Beta)"
        intro="Người lao động dùng miễn phí. Nhà tuyển dụng trả phí nền tảng 10% trên tiền công của phần ca có người làm."
        ctas={[
          { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
          { label: 'Đăng ký / Đăng nhập', href: '/register', variant: 'secondary' },
        ]}
      >
        <InfoSection title="Phí hiện áp dụng">
          <InfoList
            items={[
              'Người lao động: miễn phí, nhận đủ tiền công vào ví và rút về ngân hàng.',
              'Nhà tuyển dụng: đăng ca, nhận và duyệt ứng viên miễn phí.',
              'Phí nền tảng: 10% tiền công, được giữ cùng tiền cọc khi đăng ca.',
              'Chỉ tính phí phần ca có người làm: vị trí trống, người lao động vắng mặt hoặc ca bị huỷ được hoàn cả tiền công lẫn phí tương ứng.',
            ]}
          />
          <p className="mt-3">
            Ví dụ: tiền công 200.000đ + phí nền tảng 10% 20.000đ = giữ cọc 220.000đ. Khi ca hoàn
            thành, người lao động nhận 200.000đ vào ví, CaLẻ thu phí 20.000đ.
          </p>
        </InfoSection>

        <InfoSection title="Dự kiến — chưa áp dụng">
          <InfoList
            items={[
              'VIP Nhà tuyển dụng: 99.000đ/30 ngày; phí nền tảng còn 5%.',
              'Boost tin tuyển: 10.000đ/lượt.',
            ]}
          />
        </InfoSection>
      </InfoPage>
    );
  }

  return (
    <InfoPage
      eyebrow="Bảng giá"
      title="Giai đoạn thử nghiệm — 0đ"
      intro="Giao dịch và số dư đều là mô phỏng. CaLẻ chưa thu, giữ hoặc chuyển tiền thật."
      ctas={[
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
        { label: 'Đăng ký / Đăng nhập', href: '/register', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Hiện tại: Giai đoạn thử nghiệm — 0đ">
        <p className="mb-2">
          <span className="text-2xl font-extrabold text-orange-700">0đ</span>{' '}
          <span className="text-sm text-gray-500">· Miễn phí trong thời gian thử nghiệm</span>
        </p>
        <p>Các tính năng đang hoạt động thật:</p>
        <InfoList
          items={[
            'Đăng ký / đăng nhập Người lao động và Nhà tuyển dụng.',
            'Đăng ca miễn phí, quản lý và duyệt/từ chối ứng viên miễn phí.',
            'Người lao động tìm ca và ứng tuyển.',
            'Chấm công: check-in, xác nhận có mặt, check-out, xác nhận hoàn thành (lưu trên hệ thống).',
            'Đồng bộ dữ liệu giữa các thiết bị/phiên đăng nhập.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Bảng giá dự kiến — chưa thu phí">
        <InfoList items={[
          'Người lao động: miễn phí.',
          'Nhà tuyển dụng: đăng ca, nhận và duyệt ứng viên miễn phí.',
          'Phí nền tảng tiêu chuẩn dự kiến: 10% tiền công của ca hoàn thành.',
          'VIP Nhà tuyển dụng dự kiến: 99.000đ/30 ngày; phí nền tảng dự kiến còn 5% — chưa thu phí.',
          'Boost tin tuyển dự kiến: 10.000đ/lượt — chưa thu phí.',
        ]} />
        <p className="mt-3">Ví dụ mô phỏng: tiền công 200.000đ + phí nền tảng 10% 20.000đ = tổng bảo đảm 220.000đ; worker nhận mô phỏng 200.000đ và CaLẻ ghi nhận phí mô phỏng 20.000đ.</p>
      </InfoSection>
    </InfoPage>
  );
}
