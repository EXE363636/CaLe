import Link from 'next/link';

import { LandingChecks, LandingHelp, LandingSteps } from '@/components/landing/LandingSections';
import { MoneyFlowDiagram } from '@/components/landing/MoneyFlowDiagram';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { TypeOnView } from '@/components/landing/TypeOnView';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Cách hoạt động. P1 feedback F3 — bớt chữ: 4 bước, mỗi bước tối đa 2 câu, lời thường.
 * 03/10 — chủ dự án: đồng bộ thiết kế với landing (trước là khung trang thông tin hẹp,
 * thẻ trắng xếp dọc). Nay dùng chung khối của trang vai trò:
 *   1. Màn đầu: tiêu đề + 2 nút (xem ca / trang nhà tuyển dụng).
 *   2. 4 bước có đường nối tự vẽ khi cuộn tới (`LandingSteps`).
 *   3. Tiền của một ca đi về đâu (`MoneyFlowDiagram`, cùng sơ đồ trang chủ).
 *   4. Đi sâu theo vai trò: 2 thẻ dẫn tới minh hoạ "nhận ca" / "đăng ca".
 *   5. Cần nhớ + an toàn / hỗ trợ.
 *   6. Dải mực: hai cửa vai trò.
 * Nói đúng luồng: production giữ tiền công + 10% phí từ ví (0018), tự chốt ~24 giờ
 * sau ca (0019); local/demo là mô phỏng. Cảnh báo trùng lịch khi ứng tuyển chỉ có ở
 * bản demo (bản thật gửi đơn thẳng lên server, chưa kiểm trùng lịch).
 */
export default async function HowItWorksPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      {/* 1. Màn đầu */}
      <section data-tone="cream" className="hero-decor relative px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-orange-700">{tx('Hướng dẫn')}</p>
          <h1 className="mt-2 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {tx('Cách hoạt động')}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
            {tx('Một ca làm đi qua 4 bước, từ lúc đăng ca đến lúc trả tiền công.')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shifts"
              className="cta-arrow-nudge inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-8 text-base font-semibold text-gray-900 shadow-md hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {tx('Xem ca đang tuyển')} <span className="cta-arrow" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/for-employers"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-base font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {tx('Trang nhà tuyển dụng')}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Bốn bước */}
      <LandingSteps
        id="how-steps"
        tone="paper"
        title={tx('Bốn bước của một ca')}
        steps={[
          {
            title: tx('Nhà tuyển dụng đăng ca'),
            body: live
              ? tx('Nhập giờ làm, địa điểm, lương theo giờ và số người cần. Ca chỉ hiện cho người lao động sau khi hệ thống giữ tiền công và 10% phí từ ví.')
              : tx('Nhập giờ làm, địa điểm, lương theo giờ và số người cần. Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).'),
          },
          {
            title: tx('Người lao động ứng tuyển'),
            body: live
              ? tx('Chọn ca hợp lịch rồi bấm Ứng tuyển. Đơn chờ nhà tuyển dụng duyệt.')
              : tx('Chọn ca hợp lịch rồi bấm Ứng tuyển. Hệ thống cảnh báo nếu ca trùng giờ với lịch của bạn.'),
          },
          {
            title: tx('Duyệt và làm ca'),
            body: tx('Nhà tuyển dụng xem hồ sơ và duyệt người phù hợp. Người lao động bấm check-in khi đến và check-out khi xong.'),
          },
          {
            title: tx('Xác nhận và trả tiền công'),
            body: live
              ? tx('Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động. Nếu không ai bấm, hệ thống tự chốt khoảng 24 giờ sau ca.')
              : tx('Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động (mô phỏng).'),
          },
        ]}
      />

      {/* 3. Tiền của một ca đi về đâu */}
      <section aria-labelledby="how-money" data-tone="peach" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 id="how-money" className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            <TypeOnView text={tx('Tiền của một ca đi về đâu?')} />
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
            {tx('Mọi đồng giữ lúc đăng ca đi về đúng một trong ba nơi: người đã làm, phí CaLẻ, hoặc hoàn về ví nhà tuyển dụng.')}
          </p>
          <MoneyFlowDiagram />
        </div>
      </section>

      {/* 4. Đi sâu theo vai trò */}
      <section aria-labelledby="how-roles" data-tone="cream" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 id="how-roles" className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {tx('Xem kỹ từng bước theo vai trò')}
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            <RoleCard
              href="/for-workers#worker-apply"
              eyebrow={tx('Bạn tìm ca')}
              title={tx('Tìm ca, ứng tuyển, nhận tiền')}
              body={tx('Xem một ca từ lúc tìm, đọc chi tiết, ứng tuyển tới lúc check-in và tiền về ví.')}
              more={tx('Xem minh hoạ')}
            />
            <RoleCard
              href="/for-employers#employer-money"
              eyebrow={tx('Bạn cần người')}
              title={tx('Đăng ca, duyệt người, trả công')}
              body={tx('Thử đăng một ca, tính tiền giữ từ ví, xem người ứng tuyển và ngày làm diễn ra thế nào.')}
              more={tx('Thử đăng một ca')}
            />
          </ul>
        </div>
      </section>

      {/* 5. Cần nhớ + an toàn / hỗ trợ */}
      <section aria-labelledby="how-remember" data-tone="apricot" className="px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 id="how-remember" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {tx('Cần nhớ')}
          </h2>
          <LandingChecks
            items={[
              tx('Người lao động dùng CaLẻ miễn phí.'),
              tx('Phần tiền không dùng (vị trí trống, người vắng mặt, ca huỷ) được hoàn về ví nhà tuyển dụng.'),
              tx('Có vướng mắc: vào trang Liên hệ hỗ trợ.'),
            ]}
          />
        </div>
      </section>
      <div data-tone="apricot" className="pt-8">
        <LandingHelp
          id="how-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            {
              href: '/safety',
              icon: 'shield',
              title: tx('An toàn khi làm theo ca'),
              body: tx('Tiền công được giữ trước, xác minh tài khoản và những lưu ý khi đi làm.'),
            },
            {
              href: '/support',
              icon: 'help',
              title: tx('Cần hỗ trợ?'),
              body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.'),
            },
          ]}
        />
      </div>

      {/* 6. Dải mực: hai cửa vai trò */}
      <section aria-labelledby="how-close" className="bg-ink px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <h2 id="how-close" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            <TypeOnView text={tx('Bắt đầu từ phía của bạn')} />
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/for-workers"
              className="cta-arrow-nudge inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {tx('Tôi cần việc')} <span className="cta-arrow" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/for-employers"
              className="cta-arrow-nudge inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {tx('Tôi cần tuyển người')} <span className="cta-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </ToneScroll>
  );
}

function RoleCard({ href, eyebrow, title, body, more }: { href: string; eyebrow: string; title: string; body: string; more: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5 transition-shadow hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none sm:p-8"
      >
        <span className="text-sm font-semibold text-orange-700">{eyebrow}</span>
        <span className="mt-2 text-xl font-bold text-gray-900">{title}</span>
        <span className="mt-2 text-base leading-relaxed text-gray-600">{body}</span>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
          {more}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
            →
          </span>
        </span>
      </Link>
    </li>
  );
}
