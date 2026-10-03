import { GuideHero } from '@/components/landing/GuideHero';
import { LandingHelp, LandingRules, LandingSteps } from '@/components/landing/LandingSections';
import { RoleBand } from '@/components/landing/RoleBand';
import { shiftMilestones } from '@/components/landing/shiftMilestones';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { CHECK_IN_LATE_MINUTES } from '@/domain/timeGates';
import { getTx } from '@/i18n/server';

/**
 * Quy định huỷ ca (người lao động). 03/10 — làm lại theo ngôn ngữ landing; các mốc giờ
 * tính từ một ca ví dụ 17:00–22:00 bằng đúng hằng số của app (`shiftMilestones`,
 * `domain/timeGates`): tự huỷ khi còn hơn 3 giờ, trong 3 giờ cần nhà tuyển dụng đồng ý,
 * không đến = vắng mặt.
 *   - Bản thật: chưa có điểm uy tín / hạn mức huỷ (`capabilities.ratings`) → không nêu
 *     trừ điểm như luật đang chạy, không nêu hạn mức; nêu cọc khi ứng tuyển (0028).
 *   - Bản demo: trừ điểm uy tín, hạn mức 3 lần / 7 ngày, 10 lần / 30 ngày.
 */
const START = '17:00';
const END = '22:00';

export default async function WorkerCancellationPolicyPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  const ms = shiftMilestones(START, END);
  const selfBy = ms?.workerCancelBy.time ?? '14:00';
  const late = `${START.slice(0, 3)}${String(CHECK_IN_LATE_MINUTES).padStart(2, '0')}`;

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho người lao động')}
        title={tx('Quy định huỷ ca')}
        lead={tx('Có việc đột xuất thì huỷ được, miễn là đúng mốc giờ. Ví dụ dưới đây là một ca bắt đầu lúc {start}.').replace('{start}', START)}
        actions={[
          { href: '/worker/dashboard', label: tx('Mở trang Tổng quan'), primary: true },
          { href: '/shifts', label: tx('Tìm ca làm') },
        ]}
      />

      <LandingRules
        id="cancel-windows"
        tone="paper"
        title={tx('Huỷ lúc nào thì sao?')}
        lead={tx('Ca ví dụ: {start}–{end}. Mốc giờ đổi theo giờ bắt đầu của ca bạn nhận.').replace('{start}', START).replace('{end}', END)}
        items={[
          {
            value: tx('Trước {time}').replace('{time}', selfBy),
            tone: 'good',
            title: tx('Tự huỷ'),
            body: live
              ? tx('Còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ, không cần ai đồng ý.')
              : tx('Còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín.'),
          },
          {
            value: `${selfBy}–${START}`,
            tone: 'warn',
            title: tx('Cần nhà tuyển dụng đồng ý'),
            body: tx('Trong 3 giờ trước ca: gửi yêu cầu huỷ. Trong lúc chờ, bạn vẫn giữ chỗ.'),
          },
          {
            value: tx('Sau {time}').replace('{time}', late),
            tone: 'bad',
            title: tx('Không đến mà không báo'),
            body: live
              ? tx('Bị tính vắng mặt và không nhận tiền công. Nếu bạn đã đặt cọc khi ứng tuyển, cọc chuyển cho nhà tuyển dụng; bạn khiếu nại được trong 72 giờ.')
              : tx('Bị tính vắng mặt, không nhận tiền công và bị trừ 20 điểm uy tín.'),
          },
        ]}
        note={
          live
            ? tx('Điểm uy tín và hạn mức số lần huỷ đang được hoàn thiện; khi mở, huỷ sát giờ sẽ ảnh hưởng tới điểm của bạn.')
            : tx('Hạn mức (bản demo): tối đa 3 lần huỷ trong 7 ngày và 10 lần trong 30 ngày. Điểm từ 80 được thêm 1 lượt mỗi tuần, từ 95 thêm 2 lượt.')
        }
      />

      <LandingSteps
        id="cancel-how"
        tone="cream"
        title={tx('Cách huỷ đúng quy định')}
        steps={[
          { title: tx('Mở ca đã nhận'), body: tx('Vào trang Tổng quan hoặc trang chi tiết ca.') },
          { title: tx('Bấm "Huỷ đơn ứng tuyển"'), body: tx('Trong 3 giờ trước ca, nút này gửi yêu cầu huỷ tới nhà tuyển dụng.') },
          { title: tx('Ghi lý do ngắn gọn'), body: tx('Lý do được gửi tới nhà tuyển dụng.') },
          { title: tx('Theo dõi trạng thái'), body: tx('Đơn chuyển sang "Yêu cầu huỷ" cho tới khi nhà tuyển dụng trả lời.') },
        ]}
      />

      <LandingRules
        id="cancel-employer"
        tone="apricot"
        title={tx('Khi nhà tuyển dụng huỷ ca')}
        items={[
          {
            value: '0',
            tone: 'good',
            title: tx('Bạn không bị trừ gì'),
            body: live
              ? tx('Đơn chuyển sang "Nhà tuyển dụng đã hủy" trên trang Tổng quan. Cọc khi ứng tuyển (nếu có) được hoàn đủ.')
              : tx('Bạn nhận thông báo, đơn chuyển sang "Nhà tuyển dụng đã hủy" và không bị trừ điểm.'),
          },
          {
            value: '6h',
            tone: 'neutral',
            title: tx('Nhà tuyển dụng cũng có mốc'),
            body: tx('Họ chỉ huỷ được khi còn hơn 6 giờ nữa mới bắt đầu, nếu ca đã có người ứng tuyển.'),
          },
        ]}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="cancel-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/worker/reputation-guide', icon: 'star', title: tx('Hồ sơ & điểm uy tín'), body: tx('Nhà tuyển dụng thấy gì khi duyệt bạn.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
      <RoleBand audience="worker" />
    </ToneScroll>
  );
}
