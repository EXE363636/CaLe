import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = { title: 'Cách hoạt động — CaLẻ / ShiftNow' };

export default function HowItWorksPage() {
  return (
    <InfoPage
      eyebrow="Hướng dẫn"
      title="Cách hoạt động"
      intro="Một ca làm trên CaLẻ đi qua bốn bước: nhà tuyển dụng đăng ca và đặt cọc, người lao động ứng tuyển, hai bên gặp nhau để thực hiện ca, sau đó xác nhận và thanh toán."
      ctas={[
        { label: 'Xem ca đang tuyển', href: '/shifts' },
      ]}
    >
      <InfoSection title="1. Đăng ca và đặt cọc">
        Nhà tuyển dụng tạo ca với địa điểm, giờ giấc, mức lương theo giờ
        và số lượng vị trí cần tuyển. Hệ thống tính toán số tiền cần đặt
        cọc dựa trên cấp độ tin cậy của doanh nghiệp. Ca chỉ được công
        khai sau khi đặt cọc thành công.
      </InfoSection>

      <InfoSection title="2. Người lao động ứng tuyển">
        Người lao động duyệt danh sách ca, kiểm tra thông tin nhà tuyển
        dụng, đánh giá từ người làm trước, và ứng tuyển nếu phù hợp với
        lịch cá nhân. Hệ thống tự động kiểm tra trùng lịch để hạn chế cam
        kết kép.
      </InfoSection>

      <InfoSection title="3. Duyệt và thực hiện ca">
        Nhà tuyển dụng duyệt người ứng tuyển dựa trên hồ sơ, điểm uy tín
        và kinh nghiệm. Đến giờ làm, người lao động check-in qua ứng
        dụng, làm việc, rồi check-out khi xong.
      </InfoSection>

      <InfoSection title="4. Xác nhận và thanh toán">
        Sau khi check-out, nhà tuyển dụng xác nhận hoàn thành và để lại
        đánh giá. Tiền cọc được giải ngân thành tiền công. Người lao
        động cũng có thể đánh giá nhà tuyển dụng để đóng góp dữ liệu uy
        tín cho cộng đồng.
      </InfoSection>

      <InfoSection title="Quyền và nghĩa vụ chính">
        <InfoList
          items={[
            'Nhà tuyển dụng đặt cọc trước, không thu phí đăng ký từ người lao động.',
            'Người lao động cần xác minh số điện thoại trước khi ứng tuyển ca đầu tiên.',
            'Mọi tranh chấp đều có thể yêu cầu quản trị viên xem xét.',
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
