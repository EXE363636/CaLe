import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export default async function WorkerReputationGuidePage() {
  const tx = await getTx();
  return (
    <InfoPage
      eyebrow={tx('Dành cho người lao động')}
      title={tx('Hồ sơ & điểm uy tín')}
      intro={tx('Điểm uy tín giúp nhà tuyển dụng nhanh chóng nhận biết bạn là người lao động đáng tin. Mọi người đều bắt đầu với 100 điểm và có thể giữ vững/tăng lên qua hành vi thực tế.')}
      ctas={[
        { label: tx('Tìm ca làm'), href: '/shifts' },
      ]}
    >
      <InfoSection title={tx('Cách tính điểm')}>
        <InfoList
          items={[
            tx('+5 điểm mỗi khi hoàn thành ca làm và được nhà tuyển dụng xác nhận.'),
            tx('−10 điểm khi huỷ ca trong vòng 24 giờ trước giờ bắt đầu (huỷ sát giờ).'),
            tx('−20 điểm khi vắng mặt không báo trước.'),
            tx('Quản trị viên có thể điều chỉnh điểm với lý do cụ thể; mọi điều chỉnh đều ghi vào lịch sử.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Ngưỡng điểm và quyền lợi')}>
        <InfoList
          items={[
            tx('≥ 80: được hiển thị ưu tiên trong danh sách người ứng tuyển, mở rộng hạn mức huỷ ca trong tuần.'),
            tx('50 – 79: ứng tuyển bình thường.'),
            tx('< 50: tạm khoá quyền ứng tuyển ca mới cho đến khi điểm phục hồi.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Cách nhanh chóng cải thiện điểm')}>
        <InfoList
          items={[
            tx('Chỉ ứng tuyển ca bạn chắc chắn tham gia được.'),
            tx('Đến đúng giờ, check-in qua hệ thống để có dấu thời gian rõ ràng.'),
            tx('Nếu có việc đột xuất, huỷ càng sớm càng tốt — huỷ trước 24h không bị trừ điểm.'),
            tx('Hoàn thành tốt ca làm để nhận đánh giá 4–5 sao và cộng điểm.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Hồ sơ cá nhân')}>
        {tx('Cập nhật ảnh đại diện, kỹ năng và khu vực ưa thích trong trang Hồ sơ. Nhà tuyển dụng nhìn thấy thông tin này khi xét duyệt đơn ứng tuyển, vì vậy hồ sơ rõ ràng giúp bạn được duyệt nhanh hơn.')}
      </InfoSection>
    </InfoPage>
  );
}
