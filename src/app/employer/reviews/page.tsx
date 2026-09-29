import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

export default function EmployerReviewsPage() {
  // Production (0024): đánh giá tách khỏi bước xác nhận/trả công, trong 14 ngày
  // sau ca. Bản demo vẫn gộp chấm sao vào bước xác nhận hoàn thành.
  const production = isSupabaseEnv();

  return (
    <InfoPage
      eyebrow="Dành cho nhà tuyển dụng"
      title="Đánh giá sau ca"
      intro="Đánh giá hai chiều giúp xây dựng cộng đồng tin cậy. Sau mỗi ca hoàn thành, bạn nên dành 1–2 phút để chấm điểm và viết một câu nhận xét cho người lao động."
      ctas={[
        { label: 'Mở dashboard nhà tuyển dụng', href: '/employer/dashboard' },
      ]}
    >
      <InfoSection title="Khi nào cần đánh giá">
        {production ? (
          <>
            Sau khi ca được xác nhận hoàn thành, bạn có 14 ngày để chấm 1–5 sao
            cho từng người trong trang quản lý ca. Đánh giá không ảnh hưởng tiền
            công, và người lao động cũng có thể đánh giá lại bạn.
          </>
        ) : (
          <>
            Khi xác nhận hoàn thành ca, bạn chấm 1–5 sao và viết nhận xét ngắn.
            Trong bản demo, phải đánh giá thì tiền công (mô phỏng) mới được trả.
          </>
        )}
      </InfoSection>

      <InfoSection title="Tiêu chí gợi ý">
        <InfoList
          items={[
            'Đúng giờ: người lao động có mặt đúng giờ bắt đầu ca không?',
            'Thái độ: lịch sự, hợp tác với khách và đồng nghiệp?',
            'Chất lượng công việc: có hoàn thành đúng yêu cầu trong mô tả ca?',
            'Giao tiếp: nghe máy, báo trước nếu đến muộn hoặc có vấn đề?',
          ]}
        />
      </InfoSection>

      <InfoSection title="Đánh giá xây dựng">
        Viết cụ thể: &quot;Pha chế nhanh, gọn quầy&quot; hữu ích hơn
        &quot;Tốt&quot;. Đánh giá đã gửi không sửa được.
      </InfoSection>

      <InfoSection title="Khi cần báo cáo thay vì đánh giá">
        Nếu có hành vi không phù hợp (vắng mặt không báo, gây mất an toàn),
        đừng chỉ đánh giá thấp —{' '}
        {production
          ? 'hãy liên hệ bộ phận hỗ trợ CaLẻ để quản trị viên xem xét.'
          : 'hãy mở "Báo cáo sự cố" để quản trị viên xem xét.'}{' '}
        Đánh giá vẫn nên trung thực nhưng sự cố cần được xử lý riêng.
      </InfoSection>
    </InfoPage>
  );
}
