import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFeatures, LandingHelp, LandingSteps } from '@/components/landing/LandingSections';
import { EmployerPreview } from '@/components/landing/LandingPreview';
import { RoleBand } from '@/components/landing/RoleBand';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Hướng dẫn Quản lý người ứng tuyển (nhà tuyển dụng) — 03/10, tách khỏi mục
 * `#employer-applicants` của `/user-guide` thành trang riêng; minh hoạ bằng thẻ quản lý
 * ca tự diễn của trang nhà tuyển dụng (`EmployerPreview`).
 *   - Bản thật: thẻ ứng viên có số ca đã làm với bạn, số lần vắng với bạn, điểm sao,
 *     giới thiệu + việc ưa thích (không có điểm uy tín / kỹ năng / nhãn xác thực).
 *   - Bản demo: thêm điểm uy tín, kỹ năng, xác minh giấy tờ.
 */
export default async function EmployerApplicantsGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho nhà tuyển dụng')}
        title={tx('Quản lý người ứng tuyển')}
        lead={tx('Mọi việc với người làm của một ca nằm trên trang quản lý ca: duyệt người, xác nhận có mặt, đánh dấu vắng và xác nhận hoàn thành.')}
        actions={[{ href: '/employer/dashboard', label: tx('Mở trang quản lý'), primary: true }]}
        aside={<EmployerPreview />}
      />

      <LandingFeatures
        id="app-card"
        tone="paper"
        title={tx('Thẻ ứng viên cho bạn biết gì')}
        items={
          live
            ? [
                { icon: 'status', title: tx('Số ca đã làm với bạn'), body: tx('Người này từng hoàn thành bao nhiêu ca cho bạn.') },
                { icon: 'attendance', title: tx('Số lần vắng mặt với bạn'), body: tx('Không đến mà không báo, với chính bạn.') },
                { icon: 'star', title: tx('Điểm sao trung bình'), body: tx('Từ đánh giá sau ca của các nhà tuyển dụng trước.') },
                { icon: 'profile', title: tx('Hồ sơ'), body: tx('Lời giới thiệu và loại việc người đó muốn làm.') },
              ]
            : [
                { icon: 'shield', title: tx('Điểm uy tín'), body: tx('Tính từ lịch sử ca: hoàn thành, huỷ sát giờ, vắng mặt.') },
                { icon: 'status', title: tx('Ca đã hoàn thành, số lần vắng'), body: tx('Lịch sử làm ca của người đó trên CaLẻ.') },
                { icon: 'star', title: tx('Điểm sao và kỹ năng'), body: tx('Điểm sao từ đánh giá sau ca, cấp kỹ năng theo loại việc.') },
                { icon: 'profile', title: tx('Xác minh'), body: tx('Số điện thoại, giấy tờ đã xác minh.') },
              ]
        }
      />

      <LandingSteps
        id="app-steps"
        tone="apricot"
        title={tx('Từ duyệt người tới trả công')}
        steps={[
          { title: tx('Duyệt hoặc từ chối'), body: tx('Bấm "Duyệt" từng người; từ chối thì ghi lý do để người đó hiểu.') },
          { title: tx('Xác nhận có mặt'), body: tx('Ngày làm, người lao động check-in khi tới; bạn xác nhận có mặt từng người.') },
          { title: tx('Đánh dấu vắng mặt'), body: tx('Ai không đến, bạn đánh dấu vắng; phần tiền của vị trí đó hoàn về ví.') },
          {
            title: tx('Xác nhận hoàn thành'),
            body: live
              ? tx('Sau giờ kết thúc, bấm xác nhận là tiền công vào ví người làm; không bấm thì tự chốt sau 24 giờ.')
              : tx('Sau giờ kết thúc, bấm xác nhận là tiền công được ghi vào ví người làm (mô phỏng).'),
          },
        ]}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="app-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/employer/reviews', icon: 'star', title: tx('Đánh giá sau ca'), body: tx('Chấm sao và nhận xét cho từng người trong 14 ngày.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
      <RoleBand audience="employer" />
    </ToneScroll>
  );
}
