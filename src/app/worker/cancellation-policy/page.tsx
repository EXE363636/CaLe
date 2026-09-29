import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export default function WorkerCancellationPolicyPage() {
  return (
    <InfoPage
      eyebrow="Dành cho người lao động"
      title="Quy định huỷ ca"
      intro="CaLẻ cho phép bạn huỷ ca khi cần thiết, nhưng có quy định để bảo vệ nhà tuyển dụng và những người lao động khác. Hãy đọc kỹ trước khi ứng tuyển."
    >
      <InfoSection title="Các nhóm huỷ ca">
        <InfoList
          items={[
            'Huỷ trước 24 giờ: không bị trừ điểm uy tín, không cần nhà tuyển dụng đồng ý.',
            'Huỷ trong vòng 24 giờ: bị trừ −10 điểm uy tín (huỷ sát giờ).',
            'Huỷ trong vòng 3 giờ trước giờ bắt đầu: cần nhà tuyển dụng đồng ý; nếu họ chấp nhận, vẫn áp dụng quy tắc trừ điểm theo thời gian.',
            'Vắng mặt không báo trước: bị tính là no-show, trừ −20 điểm và có thể bị tạm khoá tài khoản nếu lặp lại.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Hạn mức huỷ ca">
        Bạn được huỷ tối đa 3 lần trong 7 ngày và 10 lần trong 30 ngày; vượt
        hạn mức thì tạm thời không huỷ được. Điểm ≥ 80 được thêm 1 lượt/tuần và
        2 lượt/tháng; ≥ 95 thêm 2 lượt/tuần và 4 lượt/tháng.
      </InfoSection>

      <InfoSection title="Cách huỷ đúng quy định">
        <InfoList
          items={[
            'Vào "Tổng quan" hoặc trang chi tiết ca, bấm "Huỷ đơn ứng tuyển".',
            'Chọn lý do và viết ngắn gọn; thông tin này gửi tới nhà tuyển dụng.',
            'Hệ thống sẽ tự động tính điểm và cập nhật lịch sử huỷ ngay.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Khi nhà tuyển dụng huỷ ca">
        Bạn nhận thông báo và không bị trừ điểm. Hãy tìm ca khác hợp với
        lịch của bạn.
      </InfoSection>
    </InfoPage>
  );
}
