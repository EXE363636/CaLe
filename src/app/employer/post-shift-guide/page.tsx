import { GuideHero } from '@/components/landing/GuideHero';
import { LandingHelp, LandingRules, LandingSteps } from '@/components/landing/LandingSections';
import { RoleBand } from '@/components/landing/RoleBand';
import { ShiftPostPlayground } from '@/components/landing/ShiftPostPlayground';
import { shiftMilestones } from '@/components/landing/shiftMilestones';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Hướng dẫn Đăng ca tuyển (nhà tuyển dụng) — 03/10, tách khỏi mục `#employer-post-shift`
 * của `/user-guide` thành trang riêng; minh hoạ bằng form "Thử đăng một ca"
 * (`ShiftPostPlayground`, sửa được số). Mốc sửa / huỷ tính theo ca ví dụ 17:00.
 * Ví không đủ → ca được lưu nháp, nạp thêm rồi đăng (luồng thật của trang đăng ca).
 */
const START = '17:00';

export default async function EmployerPostShiftGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  const ms = shiftMilestones(START, '22:00');
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho nhà tuyển dụng')}
        title={tx('Đăng ca tuyển')}
        lead={
          live
            ? tx('Nhập giờ, địa điểm, lương theo giờ và số người cần. Ca hiện cho người lao động ngay khi hệ thống giữ đủ tiền công cùng 10% phí từ ví.')
            : tx('Nhập giờ, địa điểm, lương theo giờ và số người cần. Ca hiện cho người lao động khi đã giữ đủ tiền công (mô phỏng).')
        }
        actions={[
          { href: '/employer/shifts/new', label: tx('Đăng ca tuyển'), primary: true },
          { href: '/employer/payments', label: tx('Tiền được giữ thế nào') },
        ]}
        aside={<ShiftPostPlayground />}
      />

      <LandingSteps
        id="post-steps"
        tone="paper"
        title={tx('Bốn bước đăng một ca')}
        steps={[
          { title: tx('Điền ca'), body: tx('Tên ca, loại việc, ngày, giờ, địa điểm, lương theo giờ, số người; thêm mô tả, yêu cầu và người phụ trách tại chỗ.') },
          { title: tx('Xem số tiền giữ'), body: live ? tx('Trang đăng ca tính sẵn tiền công, phí 10% và tổng giữ từ ví.') : tx('Trang đăng ca tính sẵn tổng tiền giữ từ ví (mô phỏng).') },
          { title: tx('Giữ tiền và đăng'), body: tx('Ví đủ thì ca hiện ngay cho người lao động; ví thiếu thì ca được lưu nháp, nạp thêm rồi đăng.') },
          { title: tx('Duyệt người'), body: tx('Người ứng tuyển hiện trong trang quản lý ca; bạn duyệt từng người.') },
        ]}
      />

      <LandingRules
        id="post-rules"
        tone="apricot"
        title={tx('Sửa và huỷ ca đã đăng')}
        lead={tx('Ví dụ một ca bắt đầu lúc {start}.').replace('{start}', START)}
        items={[
          {
            value: ms ? tx('{time} hôm trước').replace('{time}', ms.editBy.time) : '24h',
            tone: 'neutral',
            title: tx('Sửa ca'),
            body: tx('Sửa được khi còn hơn 24 giờ nữa mới bắt đầu.'),
          },
          {
            value: tx('Trước {time}').replace('{time}', ms?.employerCancelBy.time ?? '11:00'),
            tone: 'good',
            title: tx('Huỷ ca'),
            body: tx('Còn hơn 6 giờ: huỷ được, khoản tiền giữ hoàn về ví. Trong 6 giờ mà đã có người ứng tuyển thì không huỷ được.'),
          },
          { value: tx('Đăng lại'), tone: 'neutral', title: tx('Ca lặp lại hằng tuần'), body: tx('Tạo ca mới từ ca cũ, chỉ cần chọn lại ngày giờ.') },
        ]}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="post-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/employer/applicants-guide', icon: 'profile', title: tx('Quản lý người ứng tuyển'), body: tx('Duyệt người, xác nhận có mặt và hoàn thành ca.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
      <RoleBand audience="employer" />
    </ToneScroll>
  );
}
