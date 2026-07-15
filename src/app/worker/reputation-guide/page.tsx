import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = {
  title: 'Hồ sơ & điểm uy tín — CaLẻ / Now',
};

export default function WorkerReputationGuidePage() {
  return (
    <InfoPage
      eyebrow="Dành cho người lao động"
      title="Hồ sơ & điểm uy tín"
      intro="Điểm uy tín giúp nhà tuyển dụng nhanh chóng nhận biết bạn là người làm đáng tin. Mọi người đều bắt đầu với 100 điểm và có thể giữ vững/tăng lên qua hành vi thực tế."
      ctas={[
        { label: 'Tìm ca làm', href: '/shifts' },
      ]}
    >
      <InfoSection title="Cách tính điểm">
        <InfoList
          items={[
            '+5 điểm mỗi khi hoàn thành ca làm và được nhà tuyển dụng xác nhận.',
            '−10 điểm khi huỷ ca trong vòng 24 giờ trước giờ bắt đầu (huỷ sát giờ).',
            '−20 điểm khi vắng mặt không báo trước.',
            'Quản trị viên có thể điều chỉnh điểm với lý do cụ thể; mọi điều chỉnh đều ghi vào lịch sử.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Ngưỡng điểm và quyền lợi">
        <InfoList
          items={[
            '≥ 80: được hiển thị ưu tiên trong danh sách ứng viên, mở rộng hạn mức huỷ ca trong tuần.',
            '50 – 79: ứng tuyển bình thường.',
            '< 50: tạm khoá quyền ứng tuyển ca mới cho đến khi điểm phục hồi.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Cách nhanh chóng cải thiện điểm">
        <InfoList
          items={[
            'Chỉ ứng tuyển ca bạn chắc chắn tham gia được.',
            'Đến đúng giờ, check-in qua hệ thống để có dấu thời gian rõ ràng.',
            'Nếu có việc đột xuất, huỷ càng sớm càng tốt — huỷ trước 24h không bị trừ điểm.',
            'Hoàn thành tốt ca làm để nhận đánh giá 4–5 sao và cộng điểm.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Hồ sơ cá nhân">
        Cập nhật ảnh đại diện, kỹ năng và khu vực ưa thích trong trang
        Hồ sơ. Nhà tuyển dụng nhìn thấy thông tin này khi xét duyệt đơn
        ứng tuyển, vì vậy hồ sơ rõ ràng giúp bạn được duyệt nhanh hơn.
      </InfoSection>
    </InfoPage>
  );
}
