import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFeatures, LandingHelp, LandingRules } from '@/components/landing/LandingSections';
import { ReviewFlowPreview } from '@/components/landing/ReviewFlowPreview';
import { RoleBand } from '@/components/landing/RoleBand';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Đánh giá sau ca (nhà tuyển dụng). 03/10 — làm lại theo ngôn ngữ landing, minh hoạ
 * bằng thẻ "sau ca" 4 bước (`ReviewFlowPreview`). Đúng luồng thật (0024): sau khi ca
 * được xác nhận hoàn thành, mỗi bên chấm 1–5 sao + nhận xét trong 14 ngày, gửi rồi không
 * sửa; người lao động chọn thêm thẻ nhanh. Điểm sao hiện trên thẻ ứng viên.
 *   - Bản thật: sự cố → liên hệ đội hỗ trợ (chưa có luồng tranh chấp).
 *   - Bản demo: phải đánh giá khi xác nhận thì tiền công (mô phỏng) mới được trả; sự cố
 *     → "Báo cáo sự cố".
 */
export default async function EmployerReviewsGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho nhà tuyển dụng')}
        title={tx('Đánh giá sau ca')}
        lead={tx('Một phút chấm sao và viết một câu nhận xét giúp nhà tuyển dụng sau biết người mình sắp duyệt, và giúp người làm tốt được nhận ca tiếp.')}
        actions={[{ href: '/employer/dashboard', label: tx('Mở trang quản lý'), primary: true }]}
        aside={<ReviewFlowPreview audience="employer" />}
      />

      <LandingRules
        id="review-when"
        tone="paper"
        title={tx('Khi nào và chấm thế nào?')}
        items={[
          {
            value: tx('14 ngày'),
            tone: 'neutral',
            title: tx('Sau khi ca hoàn thành'),
            body: live
              ? tx('Bạn có 14 ngày kể từ giờ kết thúc ca để chấm từng người trong trang quản lý ca.')
              : tx('Bạn chấm khi xác nhận hoàn thành ca. Trong bản demo, phải đánh giá thì tiền công (mô phỏng) mới được trả.'),
          },
          { value: '1–5 ★', tone: 'good', title: tx('Chấm sao, thêm một câu nhận xét'), body: tx('Nhận xét không bắt buộc nhưng rất có ích cho nhà tuyển dụng sau.') },
          { value: tx('Hai chiều'), tone: 'neutral', title: tx('Người lao động cũng chấm quán'), body: tx('Họ chấm sao, chọn thẻ nhanh như "Trả lương đúng cam kết" và viết nhận xét về quán.') },
          { value: tx('Cố định'), tone: 'warn', title: tx('Gửi rồi không sửa được'), body: tx('Đọc lại trước khi bấm Gửi.') },
        ]}
      />

      <LandingFeatures
        id="review-criteria"
        tone="apricot"
        title={tx('Gợi ý tiêu chí')}
        lead={tx('Viết cụ thể: "Pha chế nhanh, gọn quầy" hữu ích hơn "Tốt".')}
        items={[
          { icon: 'clock', title: tx('Đúng giờ'), body: tx('Có mặt và check-in đúng giờ bắt đầu ca không?') },
          { icon: 'profile', title: tx('Thái độ'), body: tx('Lịch sự, hợp tác với khách và đồng nghiệp?') },
          { icon: 'status', title: tx('Chất lượng công việc'), body: tx('Làm đúng những gì ghi trong mô tả ca?') },
          { icon: 'phone', title: tx('Giao tiếp'), body: tx('Nghe máy, báo trước nếu đến muộn hay có vấn đề?') },
        ]}
      />

      <LandingRules
        id="review-incident"
        tone="cream"
        title={tx('Có sự cố thì sao?')}
        lead={tx('Đánh giá vẫn nên trung thực, nhưng sự cố cần được xử lý riêng.')}
        items={[
          {
            value: '!',
            tone: 'bad',
            title: tx('Không chỉ chấm sao thấp'),
            body: live
              ? tx('Gặp hành vi không phù hợp hay mất an toàn: liên hệ đội hỗ trợ CaLẻ để quản trị viên xem xét.')
              : tx('Gặp hành vi không phù hợp hay mất an toàn: mở "Báo cáo sự cố" để quản trị viên xem xét.'),
          },
          { value: tx('Vắng'), tone: 'warn', title: tx('Người không đến'), body: tx('Đánh dấu vắng mặt trong trang quản lý ca; phần tiền của vị trí đó hoàn về ví của bạn.') },
        ]}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="review-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/safety', icon: 'shield', title: tx('An toàn khi làm theo ca'), body: tx('Tiền công được giữ trước, xác minh tài khoản và những lưu ý khi đi làm.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
      <RoleBand audience="employer" />
    </ToneScroll>
  );
}
