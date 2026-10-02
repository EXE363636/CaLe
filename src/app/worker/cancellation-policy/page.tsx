import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export default async function WorkerCancellationPolicyPage() {
  const tx = await getTx();
  return (
    <InfoPage
      eyebrow={tx('Dành cho người lao động')}
      title={tx('Quy định huỷ ca')}
      intro={tx('CaLẻ cho phép bạn huỷ ca khi cần thiết, nhưng có quy định để bảo vệ nhà tuyển dụng và những người lao động khác. Hãy đọc kỹ trước khi ứng tuyển.')}
    >
      <InfoSection title={tx('Các nhóm huỷ ca')}>
        <InfoList
          items={[
            tx('Huỷ trước 24 giờ: không bị trừ điểm uy tín, không cần nhà tuyển dụng đồng ý.'),
            tx('Huỷ trong vòng 24 giờ: bị trừ −10 điểm uy tín (huỷ sát giờ).'),
            tx('Huỷ trong vòng 3 giờ trước giờ bắt đầu: cần nhà tuyển dụng đồng ý; nếu họ chấp nhận, vẫn áp dụng quy tắc trừ điểm theo thời gian.'),
            tx('Vắng mặt không báo trước: bị tính là no-show, trừ −20 điểm và có thể bị tạm khoá tài khoản nếu lặp lại.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Hạn mức huỷ ca')}>
        {tx('Bạn được huỷ tối đa 3 lần trong 7 ngày và 10 lần trong 30 ngày; vượt hạn mức thì tạm thời không huỷ được. Điểm ≥ 80 được thêm 1 lượt/tuần và 2 lượt/tháng; ≥ 95 thêm 2 lượt/tuần và 4 lượt/tháng.')}
      </InfoSection>

      <InfoSection title={tx('Cách huỷ đúng quy định')}>
        <InfoList
          items={[
            tx('Vào "Tổng quan" hoặc trang chi tiết ca, bấm "Huỷ đơn ứng tuyển".'),
            tx('Chọn lý do và viết ngắn gọn; thông tin này gửi tới nhà tuyển dụng.'),
            tx('Hệ thống sẽ tự động tính điểm và cập nhật lịch sử huỷ ngay.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Khi nhà tuyển dụng huỷ ca')}>
        {tx('Bạn nhận thông báo và không bị trừ điểm. Hãy tìm ca khác hợp với lịch của bạn.')}
      </InfoSection>
    </InfoPage>
  );
}
