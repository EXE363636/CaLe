import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

export default async function EmployerReviewsPage() {
  const tx = await getTx();
  // Production (0024): đánh giá tách khỏi bước xác nhận/trả công, trong 14 ngày
  // sau ca. Bản demo vẫn gộp chấm sao vào bước xác nhận hoàn thành.
  const production = isSupabaseEnv();

  return (
    <InfoPage
      eyebrow={tx('Dành cho nhà tuyển dụng')}
      title={tx('Đánh giá sau ca')}
      intro={tx('Đánh giá hai chiều giúp xây dựng cộng đồng tin cậy. Sau mỗi ca hoàn thành, bạn nên dành 1–2 phút để chấm điểm và viết một câu nhận xét cho người lao động.')}
      ctas={[
        { label: tx('Mở dashboard nhà tuyển dụng'), href: '/employer/dashboard' },
      ]}
    >
      <InfoSection title={tx('Khi nào cần đánh giá')}>
        {production ? (
          <>
            {tx('Sau khi ca được xác nhận hoàn thành, bạn có 14 ngày để chấm 1–5 sao cho từng người trong trang quản lý ca. Đánh giá không ảnh hưởng tiền công, và người lao động cũng có thể đánh giá lại bạn.')}
          </>
        ) : (
          <>
            {tx('Khi xác nhận hoàn thành ca, bạn chấm 1–5 sao và viết nhận xét ngắn. Trong bản demo, phải đánh giá thì tiền công (mô phỏng) mới được trả.')}
          </>
        )}
      </InfoSection>

      <InfoSection title={tx('Tiêu chí gợi ý')}>
        <InfoList
          items={[
            tx('Đúng giờ: người lao động có mặt đúng giờ bắt đầu ca không?'),
            tx('Thái độ: lịch sự, hợp tác với khách và đồng nghiệp?'),
            tx('Chất lượng công việc: có hoàn thành đúng yêu cầu trong mô tả ca?'),
            tx('Giao tiếp: nghe máy, báo trước nếu đến muộn hoặc có vấn đề?'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Đánh giá xây dựng')}>
        {tx('Viết cụ thể: "Pha chế nhanh, gọn quầy" hữu ích hơn "Tốt". Đánh giá đã gửi không sửa được.')}
      </InfoSection>

      <InfoSection title={tx('Khi cần báo cáo thay vì đánh giá')}>
        {tx('Nếu có hành vi không phù hợp (vắng mặt không báo, gây mất an toàn), đừng chỉ đánh giá thấp —')}{' '}
        {production
          ? tx('hãy liên hệ bộ phận hỗ trợ CaLẻ để quản trị viên xem xét.')
          : tx('hãy mở "Báo cáo sự cố" để quản trị viên xem xét.')}{' '}
        {tx('Đánh giá vẫn nên trung thực nhưng sự cố cần được xử lý riêng.')}
      </InfoSection>
    </InfoPage>
  );
}
