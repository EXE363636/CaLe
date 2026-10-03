import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFeatures, LandingHelp, LandingRules, LandingSteps } from '@/components/landing/LandingSections';
import { ReviewFlowPreview } from '@/components/landing/ReviewFlowPreview';
import { RoleBand } from '@/components/landing/RoleBand';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Hồ sơ & điểm uy tín (người lao động). 03/10 — làm lại theo ngôn ngữ landing và soạn
 * lại cho đúng từng bản:
 *   - Bản thật: nhà tuyển dụng thấy số ca đã làm với họ, số lần vắng với họ, điểm sao
 *     trung bình, giới thiệu + việc ưa thích (WorkerSummaryRow / WorkerProfileModal).
 *     Điểm uy tín, cấp kỹ năng, hạn mức huỷ CHƯA có server (`capabilities.ratings`) →
 *     ghi "Sắp có", không hứa ngưỡng ưu tiên / khoá ứng tuyển.
 *   - Bản demo: có đủ điểm uy tín (+5 / −10 / −20, `domain/reputation`), ngưỡng, kỹ năng.
 */
export default async function WorkerReputationGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho người lao động')}
        title={tx('Hồ sơ & điểm uy tín')}
        lead={
          live
            ? tx('Hồ sơ rõ ràng và đánh giá tốt sau mỗi ca giúp nhà tuyển dụng yên tâm duyệt bạn. Điểm uy tín đang được hoàn thiện.')
            : tx('Hồ sơ rõ ràng, đánh giá tốt sau mỗi ca và điểm uy tín cao giúp nhà tuyển dụng yên tâm duyệt bạn.')
        }
        actions={[
          { href: '/worker/profile', label: tx('Cập nhật hồ sơ'), primary: true },
          { href: '/shifts', label: tx('Tìm ca làm') },
        ]}
        aside={<ReviewFlowPreview audience="worker" />}
      />

      <LandingFeatures
        id="rep-seen"
        tone="paper"
        title={tx('Nhà tuyển dụng thấy gì khi duyệt bạn')}
        lead={tx('Những thông tin này hiện trên thẻ ứng viên, cạnh nút Duyệt.')}
        items={
          live
            ? [
                { icon: 'status', title: tx('Số ca đã làm với họ'), body: tx('Bao nhiêu ca bạn đã hoàn thành cho chính nhà tuyển dụng đó.') },
                { icon: 'attendance', title: tx('Số lần vắng mặt với họ'), body: tx('Không đến mà không báo được ghi lại cho từng nhà tuyển dụng.') },
                { icon: 'star', title: tx('Điểm sao trung bình'), body: tx('Từ đánh giá sau ca của các nhà tuyển dụng trước.') },
                { icon: 'profile', title: tx('Hồ sơ của bạn'), body: tx('Lời giới thiệu và loại việc bạn muốn làm.') },
              ]
            : [
                { icon: 'shield', title: tx('Điểm uy tín'), body: tx('Tính từ lịch sử ca: hoàn thành, huỷ sát giờ, vắng mặt.') },
                { icon: 'status', title: tx('Ca đã hoàn thành, số lần vắng'), body: tx('Lịch sử làm ca của bạn trên CaLẻ.') },
                { icon: 'star', title: tx('Điểm sao trung bình'), body: tx('Từ đánh giá sau ca của các nhà tuyển dụng trước.') },
                { icon: 'profile', title: tx('Kỹ năng và xác minh'), body: tx('Cấp kỹ năng theo loại việc và giấy tờ đã xác minh.') },
              ]
        }
      />

      <LandingRules
        id="rep-rules"
        tone="apricot"
        title={tx('Điểm uy tín tính thế nào?')}
        badge={live ? tx('Sắp có') : undefined}
        lead={
          live
            ? tx('Bản thật chưa tính điểm uy tín. Khi tính năng mở, điểm sẽ cộng trừ theo luật dưới đây.')
            : tx('Mọi người bắt đầu với 100 điểm. Điểm thay đổi theo những gì bạn làm với từng ca.')
        }
        items={[
          { value: '+5', tone: 'good', title: tx('Hoàn thành ca'), body: tx('Nhà tuyển dụng xác nhận bạn đã làm xong ca.') },
          { value: '−10', tone: 'warn', title: tx('Huỷ trong 24 giờ trước ca'), body: tx('Huỷ càng sát giờ càng làm nhà tuyển dụng khó tìm người thay.') },
          { value: '−20', tone: 'bad', title: tx('Vắng mặt không báo'), body: tx('Không đến mà không báo trước. Bạn cũng không nhận tiền công ca đó.') },
          ...(live
            ? []
            : [
                { value: '≥ 80', tone: 'good' as const, title: tx('Được ưu tiên'), body: tx('Hiện trước trong danh sách người ứng tuyển, thêm lượt huỷ mỗi tuần (bản demo).') },
                { value: '< 50', tone: 'bad' as const, title: tx('Tạm khoá ứng tuyển'), body: tx('Không ứng tuyển ca mới cho tới khi điểm phục hồi (bản demo).') },
              ]),
        ]}
      />

      <LandingSteps
        id="rep-tips"
        tone="cream"
        title={tx('Giữ hồ sơ tốt')}
        steps={[
          { title: tx('Chỉ nhận ca chắc đi được'), body: tx('Xem kỹ giờ, địa điểm và yêu cầu trước khi bấm Ứng tuyển.') },
          { title: tx('Check-in đúng giờ'), body: tx('Bấm check-in trong khoảng 15 phút trước tới 15 phút sau giờ bắt đầu.') },
          { title: tx('Có việc thì huỷ sớm'), body: tx('Còn hơn 3 giờ thì tự huỷ được; càng sớm càng tốt cho nhà tuyển dụng.') },
          { title: tx('Làm tốt để được 4–5 sao'), body: tx('Đánh giá sau ca đi theo bạn sang những lần ứng tuyển sau.') },
        ]}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="rep-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/worker/cancellation-policy', icon: 'clock', title: tx('Quy định huỷ ca'), body: tx('Các mốc thời gian khi bạn cần huỷ một ca đã nhận.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
      <RoleBand audience="worker" />
    </ToneScroll>
  );
}
