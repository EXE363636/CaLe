'use client';

/**
 * Khối "Tiền của một ca đi về đâu?" của `/for-employers` (`#employer-payments`, 03/10 —
 * gộp từ trang `/employer/payments` cũ): sơ đồ dòng tiền của trang chủ
 * (`MoneyFlowDiagram`) + 4 luật trả / hoàn đúng theo bản (bản thật: tiền thật qua PayOS,
 * tự chốt 24 giờ, hoàn cả phí; demo: mô phỏng, chưa thu phí, lượt boost).
 * Tách thành component để test render được riêng (trang vai trò có component async).
 */

import { MoneyFlowDiagram } from '@/components/landing/MoneyFlowDiagram';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { useTx } from '@/i18n/LocaleProvider';

export function EmployerPaymentsSection({ tone = 'cream' }: { tone?: string } = {}) {
  const tx = useTx();
  const supabase = isSupabaseEnv();
  return (
    <section aria-labelledby="employer-payments" data-tone={tone} className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 id="employer-payments" className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {tx('Tiền của một ca đi về đâu?')}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
          {supabase
            ? tx('Khi đăng ca, hệ thống giữ tiền công cùng phí dịch vụ từ ví. Mỗi đồng đó đi về đúng một trong ba nơi: người đã làm, phí CaLẻ, hoặc hoàn về ví của bạn.')
            : tx('Khi đăng ca, tiền công được giữ từ ví (mô phỏng). Mỗi đồng đó đi về đúng một trong ba nơi: người đã làm, phí CaLẻ, hoặc hoàn về ví của bạn. Bản demo không có giao dịch thật.')}
        </p>
        <MoneyFlowDiagram />
        {/* Phí dịch vụ nằm ở khối ngay sau (`EmployerPricingSection`, 03/10). Không nhắc
            tranh chấp / khiếu nại trên trang landing (chưa bật ở bản thật). */}
        <ul className={['mt-10 grid gap-3 sm:grid-cols-2', supabase ? 'lg:grid-cols-4' : 'lg:grid-cols-3'].join(' ')}>
          {(supabase
            ? [
                { v: tx('Xác nhận'), tone: 'good', title: tx('Trả công'), body: tx('Bạn bấm "Xác nhận hoàn thành" cho từng người: tiền công vào ví người đó ngay.') },
                { v: '24h', tone: 'neutral', title: tx('Tự chốt'), body: tx('Không ai bấm thì hệ thống tự xác nhận 24 giờ sau khi ca kết thúc.') },
                { v: tx('Hoàn'), tone: 'good', title: tx('Phần không dùng'), body: tx('Vị trí trống, người vắng mặt, ca huỷ: phần tiền tương ứng, kể cả phí, hoàn về ví của bạn.') },
                { v: tx('Rút'), tone: 'neutral', title: tx('Về ngân hàng'), body: tx('Nạp bằng chuyển khoản qua PayOS; số dư ví rút về ngân hàng khi bạn cần.') },
              ]
            : [
                { v: tx('Xác nhận'), tone: 'good', title: tx('Trả công (mô phỏng)'), body: tx('Bạn xác nhận hoàn thành ca: khoản tiền giữ chuyển thành tiền công cho người lao động.') },
                { v: tx('Hoàn'), tone: 'good', title: tx('Huỷ đúng quy định'), body: tx('Huỷ ca đúng mốc thì khoản tiền giữ được hoàn về ví.') },
                { v: 'Boost', tone: 'neutral', title: tx('Lượt boost'), body: tx('Người lao động vắng mặt không báo: bạn được tặng 1 lượt boost cho ca sau, giúp ca hiện ưu tiên.') },
              ]
          ).map((r) => (
            <li key={r.title} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
              <span
                className={[
                  'inline-flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg px-2 text-sm font-bold ring-1',
                  r.tone === 'good'
                    ? 'bg-green-50 text-green-800 ring-green-200'
                    : r.tone === 'warn'
                      ? 'bg-amber-50 text-amber-900 ring-amber-200'
                      : 'bg-gray-50 text-gray-800 ring-gray-200',
                ].join(' ')}
              >
                {r.v}
              </span>
              <h3 className="mt-3 text-base font-semibold text-gray-900">{r.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
