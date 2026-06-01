import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = {
  title: 'Quy định huỷ ca — CaLẻ / Now',
};

export default function WorkerCancellationPolicyPage() {
  return (
    <InfoPage
      eyebrow="Dành cho người lao động"
      title="Quy định huỷ ca"
      intro="CaLẻ cho phép bạn huỷ ca khi cần thiết, nhưng có quy định để bảo vệ nhà tuyển dụng và những người làm khác. Hãy đọc kỹ trước khi ứng tuyển."
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
        Mỗi người lao động có hạn mức huỷ trong 7 ngày và 30 ngày gần
        nhất. Vượt hạn mức sẽ bị chặn huỷ tạm thời cho đến khi cửa sổ
        thời gian trôi qua. Điểm uy tín cao giúp bạn được nâng hạn mức:
        ≥ 80 điểm thêm 1 lượt/tuần và 2 lượt/tháng; ≥ 95 điểm thêm 2
        lượt/tuần và 4 lượt/tháng.
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
        Nếu nhà tuyển dụng chủ động huỷ ca, bạn sẽ nhận thông báo trong
        ứng dụng và không bị trừ điểm. Khoản đảm bảo thanh toán của họ sẽ
        được hoàn về ví ký quỹ. Bạn có thể tìm ca khác phù hợp với lịch
        của mình.
      </InfoSection>
    </InfoPage>
  );
}
