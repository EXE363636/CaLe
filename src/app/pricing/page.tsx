import type { ReactNode } from 'react';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang bảng giá công khai.
 *
 * P0 feedback F8 — không lặp thông tin: mỗi ý chỉ nói MỘT lần, gom thành 2 thẻ
 * (Người lao động / Nhà tuyển dụng) + 1 ví dụ + FAQ ngắn. Bỏ mục VIP/Boost
 * "dự kiến" cho tới khi chủ dự án chốt giá.
 *
 * Supabase/production: phí dịch vụ 10% ĐANG được thu thật (giữ cùng cọc, chỉ
 * tính trên phần ca có người làm — khớp _finalize_shift_deposit, 0018; tự chốt
 * sau 24 giờ — 0019). Local/demo: mọi số tiền là mô phỏng, chưa thu phí.
 * Không có nút mua thật; CTA chỉ dẫn tới đăng ký / đăng ca.
 */
export default function PricingPage() {
  const live = isSupabaseEnv();

  return (
    <InfoPage
      eyebrow="Bảng giá"
      title={live ? 'Bảng giá giai đoạn thử nghiệm (Beta)' : 'Giai đoạn thử nghiệm — 0đ'}
      intro={
        live
          ? 'Người lao động không mất phí. Nhà tuyển dụng chỉ trả phí cho phần ca có người làm.'
          : 'Giao dịch và số dư đều là mô phỏng. CaLẻ chưa thu, giữ hoặc chuyển tiền thật.'
      }
      ctas={[
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
        { label: 'Đăng ký / Đăng nhập', href: '/register', variant: 'secondary' },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PriceCard
          audience="Người lao động"
          price="Miễn phí"
          points={[
            'Tìm ca và ứng tuyển không mất phí.',
            live ? 'Nhận đủ tiền công vào ví sau ca.' : 'Tiền công vào ví mô phỏng sau ca.',
            live ? 'Rút tiền về tài khoản ngân hàng của bạn.' : 'Chưa rút được tiền thật.',
          ]}
        />
        <PriceCard
          audience="Nhà tuyển dụng"
          price={live ? '10%' : '0đ'}
          priceNote={live ? 'trên tiền công' : 'dự kiến 10% tiền công — chưa thu phí'}
          highlight
          points={
            live
              ? [
                  'Đăng ca, duyệt người ứng tuyển miễn phí.',
                  'Tiền công + phí được giữ khi đăng ca.',
                  'Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí phần đó.',
                ]
              : [
                  'Đăng ca, duyệt người ứng tuyển miễn phí.',
                  'Tiền công được giữ (mô phỏng) khi đăng ca.',
                  'Huỷ ca sau khi đã duyệt người có thể bị trừ 5–15% tiền giữ (mô phỏng).',
                ]
          }
          example={
            live
              ? 'Ví dụ: tiền công 200.000đ → giữ 220.000đ. Ca xong, người lao động nhận 200.000đ, phí CaLẻ 20.000đ.'
              : 'Ví dụ mô phỏng: tiền công 200.000đ → giữ 200.000đ (chưa cộng phí). Ca xong, người lao động nhận 200.000đ.'
          }
        />
      </div>

      {/* FAQ mô tả luồng tiền THẬT ở production (0010 đăng sau khi giữ cọc,
          0019 tự chốt). Local/demo không có tự chốt → không hiện. */}
      {live && (
        <InfoSection title="Câu hỏi thường gặp">
          <dl className="flex flex-col gap-4">
            <Faq q="Khi nào tiền được giữ?">
              Khi bạn đăng ca. Ca chỉ hiện cho người lao động sau khi đã giữ đủ tiền.
            </Faq>
            <Faq q="Khi nào người lao động nhận tiền?">
              Khi nhà tuyển dụng xác nhận hoàn thành. Nếu nhà tuyển dụng không xác nhận, hệ thống tự
              chốt khoảng 24 giờ sau giờ kết thúc ca: người đã check-in được trả công, người không
              check-in bị tính vắng mặt. Ca đang có tranh chấp chờ quản trị viên xử lý.
            </Faq>
            <Faq q="Có gói trả phí nào khác không?">
              Chưa. Hiện chỉ có mức phí ở trên.
            </Faq>
          </dl>
        </InfoSection>
      )}
    </InfoPage>
  );
}

function PriceCard({
  audience,
  price,
  priceNote,
  points,
  example,
  highlight,
}: {
  audience: string;
  price: string;
  priceNote?: string;
  points: string[];
  example?: string;
  highlight?: boolean;
}) {
  return (
    <section
      className={[
        'flex flex-col rounded-2xl border p-5 shadow-card',
        highlight ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white',
      ].join(' ')}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">{audience}</h2>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-extrabold text-gray-900">{price}</span>
        {priceNote && <span className="text-sm text-gray-600">{priceNote}</span>}
      </p>
      <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-gray-700 marker:text-orange-400">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {example && (
        <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-sm text-gray-700 ring-1 ring-orange-100">
          {example}
        </p>
      )}
    </section>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-gray-900">{q}</dt>
      <dd className="mt-1 text-gray-700">{children}</dd>
    </div>
  );
}
