'use client';

/**
 * Khối "Phí dịch vụ" của `/for-employers` (`#employer-pricing`, 03/10 — gộp từ trang
 * `/pricing` cũ): hai thẻ giá (người lao động / nhà tuyển dụng), đợt miễn phí nếu đang
 * chạy (`FeeCampaignNote`), một ví dụ tính tiền và lối tắt tới form "Thử đăng một ca".
 * Câu chữ giữ như trang giá:
 *   - Bản thật: người lao động không mất phí; nhà tuyển dụng trả 10% chỉ trên phần ca có
 *     người làm; phần không dùng hoàn cả tiền công lẫn phí.
 *   - Bản demo: chưa thu phí, mọi khoản là mô phỏng.
 * Tách thành component để test render được riêng (trang vai trò có component async).
 */

import Link from 'next/link';

import { FeeCampaignNote } from '@/components/landing/FeeCampaignNote';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { useTx } from '@/i18n/LocaleProvider';

export function EmployerPricingSection({ tone = 'cream' }: { tone?: string } = {}) {
  const tx = useTx();
  const live = isSupabaseEnv();
  return (
    <section aria-labelledby="employer-pricing" data-tone={tone} className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div>
          <p className="text-sm font-semibold text-orange-700">{tx('Phí dịch vụ')}</p>
          <h2 id="employer-pricing" className="mt-2 text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {live ? tx('Phí 10%, chỉ trên phần ca có người làm') : tx('Giai đoạn thử nghiệm: 0 đ')}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            {live
              ? tx('Người lao động không mất phí. Nhà tuyển dụng chỉ trả phí cho phần ca có người làm.')
              : tx('Giao dịch và số dư đều là mô phỏng. CaLẻ chưa thu, giữ hoặc chuyển tiền thật.')}
          </p>
          <FeeCampaignNote />
          <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-black/5">
            {live
              ? tx('Ví dụ: tiền công 200.000 đ thì giữ 220.000 đ. Ca xong, người lao động nhận 200.000 đ, phí CaLẻ 20.000 đ.')
              : tx('Ví dụ mô phỏng: tiền công 200.000 đ thì giữ 200.000 đ (chưa cộng phí). Ca xong, người lao động nhận 200.000 đ.')}
          </p>
          <Link
            href="/for-employers#employer-post"
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {tx('Tính thử với ca của bạn')} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          <PriceCard
            who={tx('Người lao động')}
            price={tx('Miễn phí')}
            unit={tx('Tìm ca và ứng tuyển không mất phí.')}
            points={
              live
                ? [tx('Nhận đủ tiền công vào ví sau ca.'), tx('Rút tiền về tài khoản ngân hàng của bạn.'), tx('CaLẻ không thu phí rút tiền.')]
                : [tx('Tiền công vào ví mô phỏng sau ca.'), tx('Chưa rút được tiền thật.')]
            }
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
            accent
          />
        </ul>
      </div>
    </section>
  );
}

function PriceCard({ who, price, unit, points, accent }: { who: string; price: string; unit: string; points: string[]; accent?: boolean }) {
  return (
    <li className={['flex flex-col rounded-3xl p-6 shadow-card ring-1 sm:p-7', accent ? 'bg-orange-50 ring-orange-200' : 'bg-white ring-black/5'].join(' ')}>
      <h3 className="text-sm font-semibold text-orange-700">{who}</h3>
      <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-5xl">{price}</p>
      <p className="mt-1 text-base text-gray-600">{unit}</p>
      <ul className="mt-5 flex flex-col gap-2.5 text-sm text-gray-700">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 10.5 3.2 3L15 6.5" />
            </svg>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
