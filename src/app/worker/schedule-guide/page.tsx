import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFeatures, LandingHelp, LandingRules, LandingSteps } from '@/components/landing/LandingSections';
import { RoleBand } from '@/components/landing/RoleBand';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Hướng dẫn Lịch cá nhân (người lao động) — 03/10, tách khỏi mục `#worker-schedule` của
 * `/user-guide` thành trang riêng theo ngôn ngữ landing (menu "Người lao động → Lịch cá
 * nhân" trỏ về đây). Mô tả đúng lịch mới (`feat/schedule-redesign`): 4 cụm 6 giờ, thẻ
 * tóm tắt tuần, bấm ô trống thêm giờ bận / rảnh, hộp chi tiết, Danh sách trên điện thoại.
 *   - Bản demo: ứng tuyển ca trùng giờ bận / trùng ca đã duyệt bị CHẶN
 *     (`applicationStore.apply` → SCHEDULE_CONFLICT / CONFLICT).
 *   - Bản thật: đơn gửi thẳng lên server, CHƯA kiểm trùng lịch → nói rõ để người dùng tự xem.
 */
export default async function WorkerScheduleGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho người lao động')}
        title={tx('Lịch cá nhân')}
        lead={tx('Một chỗ xem các ca đã nhận, ca đang chờ duyệt và giờ bận của bạn, để không nhận nhầm ca trùng giờ học hay việc riêng.')}
        actions={[
          { href: '/worker/schedule', label: tx('Mở lịch cá nhân'), primary: true },
          { href: '/shifts', label: tx('Tìm ca làm') },
        ]}
      />

      <LandingFeatures
        id="sched-what"
        tone="paper"
        title={tx('Lịch hiện những gì')}
        items={[
          { icon: 'calendar', title: tx('Ca đã nhận và ca chờ duyệt'), body: tx('Mỗi ca một màu theo trạng thái: chờ duyệt, đã duyệt, đã hoàn thành.') },
          { icon: 'clock', title: tx('Giờ bận, giờ rảnh'), body: tx('Bạn tự thêm: giờ học, ca làm nơi khác, việc riêng; hoặc giờ rảnh muốn nhận ca.') },
          { icon: 'money', title: tx('Tóm tắt tuần'), body: tx('Số ca đã nhận, số giờ làm, tiền công dự kiến và số đơn chờ duyệt của tuần đang xem.') },
          { icon: 'status', title: tx('Sắp tới'), body: tx('Năm mục gần nhất kể từ hôm nay, bấm là mở chi tiết.') },
        ]}
      />

      <LandingSteps
        id="sched-how"
        tone="apricot"
        title={tx('Cách dùng')}
        steps={[
          { title: tx('Chọn tuần'), body: tx('Bấm mũi tên hoặc chọn ngày trên lịch tháng nhỏ. Mỗi ngày chia 4 cụm: Đêm, Sáng, Chiều, Tối.') },
          { title: tx('Thêm giờ bận'), body: tx('Bấm vào ô trống: hộp thêm lịch mở sẵn đúng giờ bạn bấm.') },
          { title: tx('Xem chi tiết'), body: tx('Bấm một ca để xem giờ, địa điểm, tiền công và giờ mở check-in.') },
          { title: tx('Trên điện thoại'), body: tx('Lịch mở sẵn chế độ Danh sách, xem từng ngày cho dễ.') },
        ]}
      />

      <LandingRules
        id="sched-conflict"
        tone="cream"
        title={tx('Trùng lịch')}
        lead={tx('Ví dụ: bạn học 14:00–16:00 thứ Ba, rồi thấy một ca 15:00–17:00 cùng ngày.')}
        items={
          live
            ? [
                { value: tx('Tự xem'), tone: 'warn', title: tx('Kiểm tra lịch trước khi ứng tuyển'), body: tx('Bản này chưa tự chặn ca trùng giờ khi ứng tuyển. Mở lịch xem giờ bận trước khi bấm Ứng tuyển.') },
                { value: tx('Huỷ sớm'), tone: 'neutral', title: tx('Lỡ nhận ca trùng'), body: tx('Còn hơn 3 giờ trước ca thì tự huỷ được.') },
              ]
            : [
                { value: tx('Chặn'), tone: 'bad', title: tx('Ca trùng giờ bận bị chặn'), body: tx('Bấm Ứng tuyển ca 15:00–17:00 sẽ báo trùng lịch với giờ học của bạn.') },
                { value: tx('Chặn'), tone: 'bad', title: tx('Ca trùng ca đã duyệt bị chặn'), body: tx('Không nhận được hai ca chồng giờ nhau.') },
                { value: tx('Khoá'), tone: 'neutral', title: tx('Không thêm giờ bận đè lên ca đã duyệt'), body: tx('Ca đã duyệt được giữ chỗ trên lịch.') },
              ]
        }
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="sched-help"
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
