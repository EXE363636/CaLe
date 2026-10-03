import { GuideHero } from '@/components/landing/GuideHero';
import { LandingHelp } from '@/components/landing/LandingSections';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Câu hỏi thường gặp. 03/10 — làm lại theo ngôn ngữ landing: `GuideHero`, câu hỏi chia
 * theo chủ đề (mục lục chủ đề dính bên trái từ `lg`, hàng chip trên điện thoại), mỗi
 * câu là `<details>` như `LandingFaq`; cuối trang hai lối tắt hỗ trợ.
 *
 * Giữ nguyên mọi câu hỏi / trả lời cũ, kể cả câu đổi theo chế độ dữ liệu.
 */

interface FaqGroup {
  id: string;
  title: string;
  items: Array<{ q: string; a: string }>;
}

export default async function FaqPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();

  const groups: FaqGroup[] = [
    {
      id: 'faq-worker',
      title: tx('Người lao động'),
      items: [
        {
          q: tx('Tại sao tôi không ứng tuyển được một số ca?'),
          // Bản thật không chặn theo điểm uy tín và chưa có xác minh giấy tờ (capabilities).
          a: live
            ? tx('Bạn cần xác thực số điện thoại trước khi ứng tuyển ca đầu tiên. Ca đã đủ người hoặc đã bắt đầu thì không nhận thêm đơn.')
            : tx('Bạn cần xác minh số điện thoại trước khi ứng tuyển ca đầu tiên, và điểm uy tín cần ≥ 50. Một số ca cũng yêu cầu xác minh thêm CMND/CCCD hoặc thẻ sinh viên — thông tin này hiển thị ở phần chi tiết ca làm.'),
        },
        {
          q: tx('Tôi có thể huỷ ca đã ứng tuyển không?'),
          a: tx('Có. Còn hơn 3 giờ nữa mới bắt đầu thì bạn tự huỷ được; trong vòng 3 giờ cần nhà tuyển dụng đồng ý. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín. Chi tiết tại "Quy định huỷ ca".'),
        },
      ],
    },
    {
      id: 'faq-employer',
      title: tx('Nhà tuyển dụng'),
      items: [
        {
          q: tx('Tôi đăng ca xong nhưng chưa ai ứng tuyển, làm sao bây giờ?'),
          // Bản thật chưa có lượt boost.
          a: live
            ? tx('Hãy đảm bảo ca đã được giữ cọc và công khai (kiểm tra trạng thái hiển thị "Đang tuyển"). Mô tả ca rõ ràng, mức lương theo thị trường khu vực. Nếu cần thay đổi mô tả, dùng nút Chỉnh sửa trước 24h.')
            : tx('Hãy đảm bảo ca đã được giữ cọc và công khai (kiểm tra trạng thái hiển thị "Đang tuyển"). Mô tả ca rõ ràng, mức lương theo thị trường khu vực, và sử dụng lượt boost (nếu có) để ưu tiên hiển thị. Nếu cần thay đổi mô tả, dùng nút Chỉnh sửa trước 24h.'),
        },
      ],
    },
    {
      id: 'faq-money',
      title: tx('Tiền và thanh toán'),
      items: [
        {
          q: tx('Tôi có phải trả trước khoản nào khi đăng ký người lao động không?'),
          a: tx('Không. Người lao động hoàn toàn không phải nộp phí đăng ký, khoản trả trước hoặc phí ẩn nào. Mọi tiền cọc trên hệ thống đều do nhà tuyển dụng thực hiện trước khi ca được công khai.'),
        },
        {
          q: tx('Khi nào tôi nhận được tiền công?'),
          a: live
            ? tx('Ngay khi nhà tuyển dụng xác nhận bạn hoàn thành ca, tiền công được chuyển vào ví của bạn trên CaLẻ và bạn có thể rút về tài khoản ngân hàng bất cứ lúc nào. Nếu nhà tuyển dụng không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.')
            : tx('Sau khi bạn check-out và nhà tuyển dụng xác nhận hoàn thành, tiền công được trả vào hệ thống và phản ánh ngay trong mục "Tổng thu nhập" trên dashboard người lao động. Trong bản dùng thử hiện tại, mọi giao dịch tiền tệ đều là mô phỏng.'),
        },
      ],
    },
    {
      id: 'faq-problem',
      title: tx('Khi có vấn đề'),
      items: [
        {
          q: tx('Tôi gặp tranh chấp với người lao động/nhà tuyển dụng — phải làm sao?'),
          // Bản thật chưa có luồng "Báo cáo sự cố" trong app (capabilities.disputes = false).
          a: live
            ? tx('Vào trang Liên hệ hỗ trợ, mô tả sự việc và gửi kèm bằng chứng (ảnh bàn giao, giờ check-in). Đội ngũ CaLẻ sẽ xem và phản hồi.')
            : tx('Mở chi tiết ca làm và bấm "Báo cáo sự cố". Quản trị viên sẽ xem xét hồ sơ, đánh giá từ cả hai bên và quyết định trả tiền cọc cho người lao động hoặc hoàn lại cho nhà tuyển dụng. Vui lòng tham khảo "Chính sách xử lý tranh chấp" để biết quy trình.'),
        },
      ],
    },
  ];

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Hỗ trợ')}
        title={tx('Câu hỏi thường gặp')}
        lead={tx('Tổng hợp các câu hỏi chúng tôi nhận được nhiều nhất từ người lao động và nhà tuyển dụng. Nếu bạn không tìm thấy câu trả lời, hãy liên hệ tổ hỗ trợ.')}
        actions={[{ href: '/support', label: tx('Liên hệ hỗ trợ') }]}
      />

      <FaqGroups groups={groups} topicsLabel={tx('Chủ đề')} />

      <div data-tone="cream" className="pt-14 sm:pt-20">
        <LandingHelp
          id="faq-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
            { href: '/support#support-safety', icon: 'shield', title: tx('Bảo vệ người dùng'), body: tx('Xác minh tài khoản, nhận tiền trong ứng dụng và cách xử lý khi gặp nguy hiểm.') },
          ]}
        />
      </div>
    </ToneScroll>
  );
}

// ---------------------------------------------------------------------------
// Câu hỏi theo chủ đề — cùng kiểu thẻ `<details>` với `LandingFaq`.
// ---------------------------------------------------------------------------

function FaqGroups({ groups, topicsLabel }: { groups: FaqGroup[]; topicsLabel: string }) {
  return (
    <section data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <nav aria-label={topicsLabel} className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold text-orange-700">{topicsLabel}</p>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {groups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-800 ring-1 ring-gray-200 hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 lg:flex lg:rounded-lg lg:bg-transparent lg:px-3 lg:ring-0 lg:hover:bg-orange-50 lg:hover:text-orange-800"
                >
                  {g.title}
                  <span className="text-xs font-semibold tabular-nums text-gray-500">{g.items.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          {groups.map((g) => (
            <div key={g.id} id={g.id} className="scroll-mt-24">
              <h2 className="text-balance text-2xl font-bold tracking-tight text-gray-900">{g.title}</h2>
              <div className="mt-5 divide-y divide-orange-200/70 rounded-2xl bg-white shadow-card ring-1 ring-gray-200">
                {g.items.map((it) => (
                  <details key={it.q} className="group px-5 sm:px-6">
                    <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 [&::-webkit-details-marker]:hidden">
                      {it.q}
                      <svg
                        className="h-5 w-5 shrink-0 text-orange-700 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M10 4v12M4 10h12" />
                      </svg>
                    </summary>
                    <p className="max-w-[70ch] pb-5 text-sm leading-relaxed text-gray-700 sm:text-base">{it.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
