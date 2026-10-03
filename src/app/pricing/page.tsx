import Link from 'next/link';

import { FeeCampaignNote } from '@/components/landing/FeeCampaignNote';
import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFaq, LandingHelp } from '@/components/landing/LandingSections';
import { ShiftPostPlayground } from '@/components/landing/ShiftPostPlayground';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { TypeOnView } from '@/components/landing/TypeOnView';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Bảng giá. 03/10 — làm lại theo ngôn ngữ landing (thẻ giá hai phía, form "Thử đăng một
 * ca" để tính thử, hỏi đáp). Câu chữ:
 *   - Bản thật: người lao động không mất phí; nhà tuyển dụng trả 10% chỉ trên phần ca có
 *     người làm; phần không dùng hoàn cả tiền công lẫn phí; đợt miễn phí hiện ở đầu trang
 *     (`FeeCampaignNote`).
 *   - Bản demo: chưa thu phí, mọi khoản là mô phỏng. Bỏ câu cũ "huỷ ca sau khi đã duyệt có
 *     thể bị trừ 5–15% tiền giữ" (không khớp luật huỷ ở các trang khác) và dấu "—".
 */
export default async function PricingPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Chi phí')}
        title={live ? tx('Phí 10%, chỉ trên phần ca có người làm') : tx('Giai đoạn thử nghiệm: 0 đ')}
        lead={
          <>
            {live
              ? tx('Người lao động không mất phí. Nhà tuyển dụng chỉ trả phí cho phần ca có người làm.')
              : tx('Giao dịch và số dư đều là mô phỏng. CaLẻ chưa thu, giữ hoặc chuyển tiền thật.')}
            <FeeCampaignNote />
          </>
        }
        actions={[
          { href: '/employer/shifts/new', label: tx('Đăng ca tuyển'), primary: true },
          { href: '/register', label: tx('Đăng ký / Đăng nhập') },
        ]}
      />

      {/* Thẻ giá hai phía */}
      <section aria-label={tx('Bảng giá')} data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ul className="grid gap-4 md:grid-cols-2">
            <PriceCard
              who={tx('Người lao động')}
              price={tx('Miễn phí')}
              unit={tx('Tìm ca và ứng tuyển không mất phí.')}
              points={
                live
                  ? [tx('Nhận đủ tiền công vào ví sau ca.'), tx('Rút tiền về tài khoản ngân hàng của bạn.'), tx('CaLẻ không thu phí rút tiền.')]
                  : [tx('Tiền công vào ví mô phỏng sau ca.'), tx('Chưa rút được tiền thật.')]
              }
              href="/for-workers"
              cta={tx('Trang người lao động')}
            />
            <PriceCard
              who={tx('Nhà tuyển dụng')}
              price={live ? '10%' : '0 đ'}
              unit={live ? tx('trên tiền công của phần ca có người làm') : tx('dự kiến 10% tiền công, chưa thu phí')}
              points={
                live
                  ? [
                      tx('Đăng ca, duyệt người ứng tuyển miễn phí.'),
                      tx('Tiền công + phí được giữ khi đăng ca.'),
                      tx('Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí phần đó.'),
                    ]
                  : [tx('Đăng ca, duyệt người ứng tuyển miễn phí.'), tx('Tiền công được giữ (mô phỏng) khi đăng ca.'), tx('Phần không dùng được hoàn lại (mô phỏng).')]
              }
              href="/for-employers"
              cta={tx('Trang nhà tuyển dụng')}
              accent
            />
          </ul>
        </div>
      </section>

      {/* Tính thử */}
      <section aria-labelledby="price-try" data-tone="peach" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <h2 id="price-try" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              <TypeOnView text={tx('Một ca tốn bao nhiêu?')} />
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {live
                ? tx('Ví dụ: tiền công 200.000 đ thì giữ 220.000 đ. Ca xong, người lao động nhận 200.000 đ, phí CaLẻ 20.000 đ.')
                : tx('Ví dụ mô phỏng: tiền công 200.000 đ thì giữ 200.000 đ (chưa cộng phí). Ca xong, người lao động nhận 200.000 đ.')}
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-600">{tx('Thử đăng một ca: sửa giờ, lương, số người là thấy ngay số tiền giữ từ ví.')}</p>
          </div>
          <ShiftPostPlayground />
        </div>
      </section>

      <LandingFaq
        id="price-faq"
        tone="cream"
        title={tx('Câu hỏi thường gặp')}
        items={[
          { q: tx('Khi nào tiền được giữ?'), a: tx('Khi bạn đăng ca. Ca chỉ hiện cho người lao động sau khi đã giữ đủ tiền.') },
          {
            q: tx('Khi nào người lao động nhận tiền?'),
            a: live
              ? tx('Khi nhà tuyển dụng xác nhận hoàn thành. Nếu nhà tuyển dụng không xác nhận, hệ thống tự chốt khoảng 24 giờ sau giờ kết thúc ca: người đã check-in được trả công, người không check-in bị tính vắng mặt.')
              : tx('Khi bạn xác nhận hoàn thành ca, tiền công được ghi vào ví người làm (mô phỏng).'),
          },
          { q: tx('Có gói trả phí nào khác không?'), a: tx('Chưa. Hiện chỉ có mức phí ở trên.') },
        ]}
        more={{ href: '/faq', label: tx('Xem tất cả câu hỏi') }}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="price-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/employer/payments', icon: 'wallet', title: tx('Tiền được giữ thế nào'), body: tx('Khi nào tiền được trả hoặc hoàn, và quy định huỷ ca.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
    </ToneScroll>
  );
}

function PriceCard({
  who,
  price,
  unit,
  points,
  href,
  cta,
  accent,
}: {
  who: string;
  price: string;
  unit: string;
  points: string[];
  href: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <li className={['flex flex-col rounded-3xl p-6 shadow-card ring-1 sm:p-8', accent ? 'bg-orange-50 ring-orange-200' : 'bg-white ring-black/5'].join(' ')}>
      <h2 className="text-sm font-semibold text-orange-700">{who}</h2>
      <p className="mt-2 text-5xl font-extrabold tracking-tight text-gray-900 tabular-nums">{price}</p>
      <p className="mt-1 text-base text-gray-600">{unit}</p>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-gray-700">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 10.5 3.2 3L15 6.5" />
            </svg>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className="mt-6 inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
        {cta} →
      </Link>
    </li>
  );
}
