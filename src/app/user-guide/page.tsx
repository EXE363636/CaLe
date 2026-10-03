import Link from 'next/link';

import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFaq, LandingHelp, LandingSteps } from '@/components/landing/LandingSections';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Hướng dẫn sử dụng (`/user-guide`). 03/10 — làm lại theo ngôn ngữ landing:
 *   - 5 bước cho mỗi vai trò (`LandingSteps`);
 *   - thẻ giải thích từng ô / tính năng, GIỮ NGUYÊN các `#id` mà ô thống kê trên
 *     dashboard, menu và chân trang dẫn tới (worker-*, employer-*, verification-overview).
 *     Tính năng đã có trang hướng dẫn riêng thì thẻ dẫn sang trang đó;
 *   - hỏi đáp + hỗ trợ.
 *
 * Câu mặc định đúng cho bản thật (`isSupabaseEnv()`), bản demo đổi câu ở chỗ khác nhau:
 * bản thật chưa chặn ca trùng giờ, chưa dùng điểm uy tín, nhà tuyển dụng chưa thấy huy
 * hiệu xác minh, không có thông báo trong app; tiền là thật qua PayOS.
 */

type Tx = (viText: string) => string;

interface GuideItem {
  id: string;
  title: string;
  bullets: string[];
  example?: string;
  link?: { href: string; label: string };
}

export default async function UserGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Hướng dẫn sử dụng')}
        title={tx('Cách dùng CaLẻ')}
        lead={
          live
            ? tx('Hướng dẫn ngắn cho người lao động và nhà tuyển dụng. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua PayOS.')
            : tx('Hướng dẫn ngắn cho người lao động và nhà tuyển dụng. Đây là bản demo: tiền và xác minh đều là mô phỏng.')
        }
        actions={[
          { href: '/shifts', label: tx('Tìm ca làm ngay'), primary: true },
          { href: '/register?role=employer', label: tx('Đăng ca tuyển') },
        ]}
      />

      <LandingSteps id="guide-worker-steps" tone="paper" title={tx('Người lao động: 5 bước')} steps={workerSteps(tx, live)} />
      <LandingSteps id="guide-employer-steps" tone="apricot" title={tx('Nhà tuyển dụng: 5 bước')} steps={employerSteps(tx, live)} />

      <GuideGroup
        id="guide-worker-items"
        tone="cream"
        title={tx('Trên trang của người lao động')}
        lead={tx('Giải thích các ô và tính năng bạn gặp trên trang Tổng quan.')}
        items={workerItems(tx, live)}
        exampleLabel={tx('Ví dụ:')}
      />
      <GuideGroup
        id="guide-employer-items"
        tone="paper"
        title={tx('Trên trang của nhà tuyển dụng')}
        lead={tx('Giải thích các ô và tính năng trên trang quản lý ca.')}
        items={employerItems(tx, live)}
        exampleLabel={tx('Ví dụ:')}
      />
      <GuideGroup
        id="guide-money-items"
        tone="apricot"
        title={tx('Tiền ca làm và xác minh')}
        items={moneyItems(tx, live)}
        exampleLabel={tx('Ví dụ:')}
      />

      <LandingFaq
        id="guide-faq"
        tone="cream"
        title={tx('Câu hỏi thường gặp')}
        items={[
          {
            q: tx('Người lao động có phải trả trước không?'),
            a: live
              ? tx('Thường là không. Nếu CaLẻ đang áp dụng cọc ứng tuyển, bạn thấy số cọc (tối đa 50% tiền công ca, không quá 100.000đ) trước khi đồng ý; cọc được hoàn khi hoàn thành, bị từ chối hoặc huỷ, chỉ mất khi vắng mặt không báo.')
              : tx('Không. Chỉ nhà tuyển dụng giữ cọc tiền công trước khi đăng ca.'),
          },
          {
            q: tx('Tôi có huỷ được ca đã được duyệt không?'),
            a: live
              ? tx('Được. Còn hơn 3 giờ trước ca thì huỷ ngay; dưới 3 giờ cần nhà tuyển dụng đồng ý.')
              : tx('Được. Còn hơn 3 giờ trước ca thì huỷ ngay; dưới 3 giờ cần nhà tuyển dụng đồng ý. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín.'),
          },
          {
            q: tx('Có giao dịch tiền thật không?'),
            a: live
              ? tx('Có. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua cổng thanh toán PayOS.')
              : tx('Không. Đây là bản demo, mọi giao dịch đều là mô phỏng.'),
          },
          {
            q: tx('Có vướng mắc thì làm gì?'),
            a: live
              ? tx('Vào trang Liên hệ hỗ trợ, đội ngũ CaLẻ sẽ xem và phản hồi.')
              : tx('Bấm "Báo cáo vấn đề" trên trang quản lý ca; quản trị viên xem xét theo Chính sách xử lý tranh chấp.'),
          },
        ]}
        more={{ href: '/faq', label: tx('Xem tất cả câu hỏi') }}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="guide-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/safety', icon: 'shield', title: tx('An toàn khi đi làm'), body: tx('Cách nhận ra ca đáng ngờ và giữ an toàn trong ca.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
    </ToneScroll>
  );
}

// ---------------------------------------------------------------------------
// Nội dung
// ---------------------------------------------------------------------------

function workerSteps(tx: Tx, live: boolean) {
  return [
    {
      title: tx('Đăng ký và làm hồ sơ.'),
      body: tx('Chọn "Tôi muốn tìm ca làm" khi đăng ký. Thêm kỹ năng và khu vực muốn làm trong trang Hồ sơ.'),
    },
    {
      title: tx('Tìm và ứng tuyển ca.'),
      body: live
        ? tx('Bấm "Tìm ca làm", mở ca phù hợp rồi bấm "Ứng tuyển". Hệ thống chưa tự chặn ca trùng giờ, hãy xem Lịch cá nhân trước khi ứng tuyển.')
        : tx('Bấm "Tìm ca làm", mở ca phù hợp rồi bấm "Ứng tuyển". Ca trùng giờ với lịch của bạn sẽ bị chặn.'),
    },
    {
      title: tx('Chờ duyệt.'),
      body: tx('Trạng thái đơn hiện trong trang Tổng quan: Đã duyệt hoặc Bị từ chối (kèm lý do).'),
    },
    {
      title: tx('Đi làm.'),
      body: tx('Đến nơi thì bấm "Check-in" trên trang Tổng quan, làm xong bấm "Check-out".'),
    },
    {
      title: tx('Nhận tiền công.'),
      body: live
        ? tx('Nhà tuyển dụng xác nhận hoàn thành thì tiền công vào ví, rút về ngân hàng khi cần. Không ai bấm thì hệ thống tự chốt khoảng 24 giờ sau ca.')
        : tx('Nhà tuyển dụng xác nhận hoàn thành thì tiền công vào ví (mô phỏng trong bản demo).'),
    },
  ];
}

function employerSteps(tx: Tx, live: boolean) {
  return [
    {
      title: tx('Đăng ký và chọn loại tài khoản.'),
      body: tx('Chọn "Tôi cần tuyển người lao động", rồi chọn Cá nhân hoặc Doanh nghiệp.'),
    },
    {
      title: tx('Đăng ca và giữ cọc.'),
      body: live
        ? tx('Nhập giờ, địa điểm, lương và số người cần. Hệ thống giữ tiền công + phí dịch vụ 10% (0đ trong đợt miễn phí) từ ví rồi mới công khai ca.')
        : tx('Nhập giờ, địa điểm, lương và số người cần. Bấm "Mô phỏng giữ cọc" để công khai ca.'),
    },
    {
      title: tx('Duyệt người ứng tuyển.'),
      body: live
        ? tx('Xem hồ sơ, số sao trung bình và số ca người đó đã làm với bạn, rồi bấm "Duyệt" hoặc "Từ chối" kèm lý do.')
        : tx('Xem hồ sơ và điểm uy tín, bấm "Duyệt" hoặc "Từ chối" kèm lý do.'),
    },
    {
      title: tx('Theo dõi ca.'),
      body: tx('Ca tự chuyển sang Đang diễn ra khi đến giờ. Người lao động check-in khi đến và check-out khi xong.'),
    },
    {
      title: tx('Xác nhận hoàn thành.'),
      body: live
        ? tx('Bấm "Xác nhận hoàn thành" để trả tiền công. Ai không đến thì bấm "Vắng mặt": phần cọc đó hoàn về ví của bạn.')
        : tx('Bấm "Xác nhận hoàn thành" để trả tiền công (mô phỏng). Ai không đến thì bấm "Vắng mặt".'),
    },
  ];
}

function workerItems(tx: Tx, live: boolean): GuideItem[] {
  return [
    {
      id: 'worker-schedule',
      title: tx('Lịch cá nhân'),
      bullets: live
        ? [tx('Đánh dấu giờ bận / rảnh trong tuần và xem các ca đã nhận.'), tx('Bản chính thức chưa tự chặn ca trùng giờ khi ứng tuyển; lịch giúp bạn tự tránh.')]
        : [tx('Đánh dấu giờ bận / rảnh trong tuần.'), tx('Khi bạn ứng tuyển, ca trùng lịch bận hoặc trùng ca đã được duyệt sẽ bị chặn.')],
      example: live
        ? tx('Bạn học 14:00–16:00 thứ Ba: đừng ứng tuyển ca 15:00–17:00 thứ Ba.')
        : tx('Bạn học 14:00–16:00 thứ Ba. Ca 15:00–17:00 thứ Ba sẽ báo trùng lịch.'),
      link: { href: '/worker/schedule-guide', label: tx('Hướng dẫn Lịch cá nhân') },
    },
    live
      ? {
          id: 'worker-reputation',
          title: tx('Nhà tuyển dụng xem gì khi duyệt bạn'),
          bullets: [
            tx('Bản chính thức chưa dùng điểm uy tín.'),
            tx('Khi duyệt, nhà tuyển dụng xem số sao trung bình, nhận xét, số ca bạn đã làm và số lần vắng mặt ở ca của họ.'),
          ],
          link: { href: '/worker/reputation-guide', label: tx('Hồ sơ & điểm uy tín') },
        }
      : {
          id: 'worker-reputation',
          title: tx('Điểm uy tín'),
          bullets: [
            tx('Bắt đầu 100 điểm (tạm tính từ lịch sử ca). Hoàn thành ca +5, vắng mặt không báo −20, huỷ trong 24 giờ trước ca −10.'),
            tx('Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).'),
          ],
          example: tx('Bạn đang 100 điểm, vắng một ca không báo thì còn 80.'),
          link: { href: '/worker/reputation-guide', label: tx('Hồ sơ & điểm uy tín') },
        },
    {
      id: 'worker-completed-shifts',
      title: tx('Ca đã hoàn thành'),
      bullets: [tx('Số ca bạn làm xong và đã được xác nhận (nhà tuyển dụng bấm hoặc hệ thống tự chốt). Ca đang chờ xác nhận chưa được đếm.')],
      example: tx('Tuần này làm 3 ca, 2 ca đã xác nhận → ô này hiện 2.'),
    },
    {
      id: 'worker-total-income',
      title: tx('Tổng thu nhập'),
      bullets: [
        live ? tx('Tổng tiền công đã vào ví từ các ca đã được xác nhận.') : tx('Tổng tiền công từ các ca đã được xác nhận (mô phỏng).'),
        tx('Không tính ca đang diễn ra hoặc đang chờ xác nhận.'),
      ],
      example: tx('Ca 4 giờ × 45.000đ + ca 5 giờ × 60.000đ → tăng 480.000đ.'),
    },
    {
      id: 'worker-cancellation-quota',
      title: tx('Hạn mức huỷ ca'),
      bullets: live
        ? [tx('Bản thật chưa giới hạn số lần huỷ và chưa tính điểm uy tín.'), tx('Còn hơn 3 giờ trước ca thì tự huỷ; trong vòng 3 giờ cần nhà tuyển dụng đồng ý.')]
        : [tx('Tối đa 3 lần huỷ trong 7 ngày và 10 lần trong 30 ngày.'), tx('Điểm uy tín 80–94: 4/tuần, 12/tháng. Điểm 95–100: 5/tuần, 14/tháng.')],
      example: live
        ? tx('Huỷ một ca bắt đầu sau 2 giờ nữa → gửi yêu cầu, chờ nhà tuyển dụng đồng ý.')
        : tx('7 ngày qua đã huỷ 2 ca → còn 1 lượt.'),
      link: { href: '/worker/cancellation-policy', label: tx('Quy định huỷ ca') },
    },
  ];
}

function employerItems(tx: Tx, live: boolean): GuideItem[] {
  return [
    {
      id: 'employer-post-shift',
      title: tx('Đăng ca tuyển'),
      bullets: [
        tx('Nhập tên ca, giờ, địa điểm, lương theo giờ và số người cần.'),
        live
          ? tx('Ca chỉ hiện cho người lao động sau khi hệ thống giữ tiền công + phí dịch vụ 10% từ ví (0đ trong đợt miễn phí).')
          : tx('Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).'),
      ],
      example: live
        ? tx('Ca 4 giờ, 35.000đ/giờ, cần 2 người: tiền công 280.000đ → giữ 308.000đ (gồm 28.000đ phí, ngoài đợt miễn phí).')
        : tx('Ca 4 giờ, 35.000đ/giờ, cần 2 người: giữ cọc 280.000đ (mô phỏng).'),
      link: { href: '/employer/post-shift-guide', label: tx('Hướng dẫn đăng ca') },
    },
    {
      id: 'employer-applicants',
      title: tx('Quản lý người ứng tuyển'),
      bullets: [
        live
          ? tx('Xem hồ sơ, số sao trung bình, số ca đã làm và số lần vắng mặt với bạn ngay trên trang quản lý ca.')
          : tx('Xem hồ sơ, điểm uy tín và số ca đã làm ngay trên trang quản lý ca.'),
        tx('Bấm "Duyệt", hoặc "Từ chối" kèm lý do để người lao động hiểu.'),
      ],
      example: tx('3 người ứng tuyển: bạn duyệt 2 người nhiều kinh nghiệm, từ chối 1 người kèm lý do.'),
      link: { href: '/employer/applicants-guide', label: tx('Hướng dẫn quản lý người ứng tuyển') },
    },
    {
      id: 'employer-active-shifts',
      title: tx('Ca đang hoạt động'),
      bullets: [tx('Ca đã giữ cọc và đang tuyển, đã đủ người, đang diễn ra hoặc chờ xác nhận. Không tính nháp, đã huỷ, hết hạn, đã hoàn thành.')],
    },
    {
      id: 'employer-pending-applications',
      title: tx('Đơn chờ duyệt'),
      bullets: [tx('Đơn bạn chưa duyệt hoặc từ chối. Nên xử lý sớm, nhất là ca diễn ra trong 24 giờ tới.')],
    },
    {
      id: 'employer-posted-shifts',
      title: tx('Ca đã đăng'),
      bullets: [tx('Tổng số ca bạn từng tạo, gồm mọi trạng thái.')],
    },
    {
      id: 'employer-completed-shifts',
      title: tx('Ca đã hoàn thành'),
      bullets: [
        live
          ? tx('Ca bạn đã xác nhận hoàn thành; tiền công đã vào ví người lao động.')
          : tx('Ca bạn đã xác nhận hoàn thành; tiền công đã được trả (mô phỏng).'),
      ],
    },
  ];
}

function moneyItems(tx: Tx, live: boolean): GuideItem[] {
  return [
    {
      id: 'employer-payments',
      title: tx('Giữ cọc'),
      bullets: [
        tx('Tiền công được giữ cọc trước khi ca hiện ra, và chỉ trả cho người lao động khi ca xong.'),
        tx('Phần không dùng (vị trí trống, người vắng mặt, ca huỷ) hoàn về ví của bạn.'),
        live ? tx('Nạp và rút tiền là giao dịch thật qua PayOS.') : tx('Trong bản demo, mọi giao dịch đều là mô phỏng.'),
      ],
      link: { href: '/employer/payments', label: tx('Xem chi tiết giữ cọc') },
    },
    {
      id: 'employer-total-deposit',
      title: tx('Tổng tiền công chờ thanh toán'),
      bullets: [
        live
          ? tx('Tiền công đang giữ cho các ca chưa xong (không gồm phí dịch vụ). Chưa phải tiền đã trả.')
          : tx('Tiền cọc đang giữ cho các ca chưa xong. Chưa phải tiền đã trả.'),
      ],
      example: tx('Đăng ca 280.000đ tiền công → ô này tăng 280.000đ.'),
    },
    {
      id: 'employer-total-paid',
      title: tx('Tổng tiền công đã thanh toán'),
      bullets: [tx('Tiền đã trả cho người lao động, tăng mỗi lần bạn xác nhận hoàn thành.')],
    },
    {
      id: 'verification-overview',
      title: tx('Cách xác minh hoạt động'),
      bullets: live
        ? [
            tx('Xác thực số điện thoại bằng mã OTP và gửi ảnh CCCD trong trang Hồ sơ; quản trị viên duyệt CCCD.'),
            tx('Chỉ quản trị viên xem ảnh CCCD. Hiện nhà tuyển dụng chưa thấy huy hiệu xác minh.'),
          ]
        : [
            tx('Gửi giấy tờ trong trang Hồ sơ; quản trị viên duyệt.'),
            tx('Người dùng khác chỉ thấy huy hiệu "Đã xác minh" và số giấy tờ đã che, không thấy ảnh gốc.'),
          ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Khối thẻ — mỗi thẻ giữ `id` để link `#…` nhảy tới (scroll-mt chừa header dính).
// ---------------------------------------------------------------------------

function GuideGroup({
  id,
  tone,
  title,
  lead,
  items,
  exampleLabel,
}: {
  id: string;
  tone: string;
  title: string;
  lead?: string;
  items: GuideItem[];
  exampleLabel: string;
}) {
  return (
    <section aria-labelledby={id} data-tone={tone} className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h2>
          {lead && <p className="mt-3 text-base leading-relaxed text-gray-600">{lead}</p>}
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} id={item.id} className="flex scroll-mt-24 flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5">
              <h3 className="text-lg font-bold tracking-tight text-gray-900">{item.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {item.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {item.example && (
                <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
                  <span className="mr-1 font-semibold text-orange-800">{exampleLabel}</span>
                  {item.example}
                </p>
              )}
              {item.link && (
                <Link
                  href={item.link.href}
                  className="mt-auto inline-flex min-h-[44px] items-center self-start pt-3 text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  {item.link.label} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
