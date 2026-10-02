import Link from 'next/link';
import type { CSSProperties } from 'react';
import { HomeReceipt, type HomeReceiptLine } from '@/components/landing/HomeReceipt';
import { homeJobs } from '@/components/landing/homeJobs';
import { JobRing } from '@/components/landing/JobRing';
import { LandingProofView } from '@/components/landing/LandingProof';
import { MoneyFlowDiagram } from '@/components/landing/MoneyFlowDiagram';
import { MotionGroup } from '@/components/landing/MotionGroup';
import { FEATURES_UPDATED, featuresDone, featuresPlanned } from '@/components/landing/featureData';
import { OpenShiftCount } from '@/components/landing/OpenShiftCount';
import { StatValue } from '@/components/landing/StatValue';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { WHY_SCAM_SOURCE_URL, whyRows, whyStats } from '@/components/landing/whyData';
import { proofCopy } from '@/components/landing/proofData';
import { TypeOnView } from '@/components/landing/TypeOnView';
import { UrgentShifts } from '@/components/landing/UrgentShifts';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getLocale, getT, getTx } from '@/i18n/server';
import { shareMeta } from '@/lib/shareMeta';

/**
 * Trang chủ — "biên nhận ca" (02/10, thay trang chọn vai trò P1 F4).
 *
 *   1. Màn đầu: câu chính + hai cửa vai trò (→ `/for-workers`, `/for-employers`)
 *      bên trái; bên phải là biên nhận một ca đã xong (minh hoạ, số liệu ví dụ).
 *   2. "Vì sao CaLẻ ra đời?": bối cảnh bằng số liệu chính thức có nguồn (`whyData.ts`,
 *      số đếm lên + highlight — `StatValue`) và bảng so sánh tuyển qua hội nhóm với
 *      trên CaLẻ — lý do ra đời cũng là vấn đề CaLẻ giải quyết, nên chung một khối.
 *   3. Loại việc (vòng thẻ xoay liên tục, ấn thẻ xem chi tiết — `JobRing` +
 *      `homeJobs.ts`) kèm lối đi thẳng "Xem ca đang tuyển" / "Đăng ca tuyển", và
 *      "Ca gấp cần người" (dữ liệu thật, tự ẩn khi không có).
 *   4. "Tiền của một ca đi về đâu?": sơ đồ dòng tiền chạy một lần khi cuộn tới
 *      (`MoneyFlowDiagram`) + bốn thẻ ①–④ khớp bốn dòng biên nhận; giải thích đầy đủ
 *      trong "Xem chi tiết".
 *   5. "CaLẻ làm được gì?": chức năng đã có / sắp có (`featureData.ts`).
 *   6. (Khối ảnh / lời chia sẻ thật — tự ẩn khi chưa có.) Dải kết: hai cửa vai trò.
 * Nền trang đổi màu theo khối đang xem (`ToneScroll` + `data-tone`); dải kết có nền
 * mực riêng.
 * (02/10 sau khi thử vai người dùng: đưa loại việc lên trước phần dòng tiền, rút gọn
 * phần giải thích, bỏ FAQ — hai trang vai trò đã có FAQ riêng.)
 * Chi tiết sâu nằm ở hai trang vai trò; trang này không lặp khối của chúng.
 * Câu về tiền đổi theo chế độ (CLAUDE.md §5): demo ghi "mô phỏng", chưa thu phí.
 */
// Thẻ chia sẻ link (ảnh: opengraph-image.png cạnh file này).
export const metadata = shareMeta(
  'CaLẻ — Việc làm ngắn hạn, rõ ca – rõ tiền',
  'Tiền công giữ trước mỗi ca, theo dõi ca tới lúc xong và chỉ trả cho người đã làm. Tìm ca làm vài giờ hoặc đăng ca cần người.',
);

export default async function HomePage() {
  const t = await getT();
  const tx = await getTx();
  const locale = await getLocale();
  const supabase = isSupabaseEnv();

  // Biên nhận: số tiền tính trong HomeReceipt từ ca mẫu (landingSamples.ts); ở đây
  // chỉ có câu chữ, đổi theo chế độ.
  const receiptLines: HomeReceiptLine[] = [
    {
      target: 'home-hold',
      label: tx('Giữ trước khi đăng ca'),
      detail: supabase
        ? tx('Từ ví nhà tuyển dụng: tiền công + phí 10%')
        : tx('Từ ví nhà tuyển dụng: tiền công (mô phỏng)'),
      kind: 'held',
    },
    {
      target: 'home-paid',
      label: tx('Trả người lao động'),
      detail: supabase
        ? tx('Khi ca được xác nhận, không trừ phí')
        : tx('Khi ca được xác nhận, không trừ phí (mô phỏng)'),
      kind: 'paid',
      split: true,
      detailCancelled: tx('Ca bị huỷ trước giờ làm, không ai làm'),
      detailNoShow: tx('Chỉ trả cho người đã làm'),
    },
    {
      target: 'home-fee',
      label: tx('Phí CaLẻ'),
      detail: supabase ? tx('10% tiền công, nhà tuyển dụng trả') : tx('Bản demo chưa thu phí'),
      kind: 'fee',
      detailCancelled: supabase ? tx('Ca bị huỷ thì không thu phí') : tx('Bản demo chưa thu phí'),
      detailNoShow: supabase ? tx('10% phần ca có người làm') : tx('Bản demo chưa thu phí'),
    },
    {
      target: 'home-refund',
      label: tx('Hoàn về nhà tuyển dụng'),
      detail: tx('Ca đủ người, không ai vắng'),
      kind: 'refund',
      detailCancelled: tx('Ca bị huỷ: hoàn đủ tiền đã giữ'),
      detailNoShow: tx('{n} người vắng mặt: hoàn phần của người đó'),
    },
  ];
  const balance = {
    label: tx('Đối soát'),
    pending: tx('Chốt sổ khi ca hoàn thành'),
  };

  const explain = [
    {
      id: 'home-hold',
      title: tx('Giữ trước tiền công'),
      body: supabase
        ? tx('Khi đăng ca, tiền công cộng phí 10% được giữ từ ví nhà tuyển dụng. Ca chỉ hiện cho người lao động khi đã giữ đủ.')
        : tx('Khi đăng ca, tiền công được giữ từ ví nhà tuyển dụng (mô phỏng). Ca chỉ hiện cho người lao động khi đã giữ đủ.'),
      worker: tx('Ca nào bạn thấy cũng đã có tiền công giữ sẵn.'),
      employer: tx('Đăng ca miễn phí. Tiền giữ trước nằm trên CaLẻ tới khi ca xong.'),
    },
    {
      id: 'home-paid',
      title: tx('Làm xong, được trả'),
      body: supabase
        ? tx('Nhà tuyển dụng duyệt từng người. Đến giờ, người lao động check-in trên điện thoại và nhà tuyển dụng xác nhận có mặt. Sau check-out, nhà tuyển dụng xác nhận hoàn thành; nếu không thao tác, hệ thống tự xác nhận sau 24 giờ kể từ giờ kết thúc ca và trả đủ tiền công vào ví người lao động. Tiền trong ví rút được về tài khoản ngân hàng.')
        : tx('Nhà tuyển dụng duyệt từng người. Đến giờ, người lao động check-in trên điện thoại và nhà tuyển dụng xác nhận có mặt. Sau check-out, nhà tuyển dụng xác nhận hoàn thành; nếu không thao tác, ca tự được xác nhận sau 12 giờ và tiền công được ghi đủ vào ví người lao động (mô phỏng).'),
      note: tx('Check-in hiện là ghi nhận trên ứng dụng, chưa dùng GPS hay mã QR.'),
      worker: tx('Nhận đúng số tiền đã thấy trên ca.'),
      employer: tx('Chỉ trả cho người đã làm và đã được xác nhận.'),
    },
    {
      id: 'home-fee',
      title: tx('Phí CaLẻ'),
      body: supabase
        ? tx('Phí là 10% tiền công, do nhà tuyển dụng trả và chỉ tính trên phần ca có người làm. Người lao động không mất phí.')
        : tx('Bản demo chưa thu phí ai. Khi chạy thật, phí là 10% tiền công, do nhà tuyển dụng trả; người lao động không mất phí.'),
      link: { href: '/pricing', label: tx('Xem bảng giá') },
      worker: tx('Nhận đủ tiền công, không bị trừ phí.'),
      employer: supabase
        ? tx('Chỉ trả phí trên phần ca có người làm.')
        : tx('Đăng ca miễn phí; bản demo chưa thu phí.'),
    },
    {
      id: 'home-refund',
      title: tx('Hoàn lại và hỗ trợ'),
      body: supabase
        ? tx('Người vắng mặt hoặc vị trí không ai nhận: tiền công và phí của phần đó hoàn về ví nhà tuyển dụng. Có vấn đề sau ca thì liên hệ đội hỗ trợ CaLẻ qua trang Hỗ trợ.')
        : tx('Người vắng mặt hoặc vị trí không ai nhận: phần tiền đó hoàn về ví nhà tuyển dụng (mô phỏng). Có vấn đề sau ca thì liên hệ đội hỗ trợ CaLẻ qua trang Hỗ trợ.'),
      worker: tx('Chưa được trả đúng thì liên hệ đội hỗ trợ CaLẻ.'),
      employer: tx('Đánh dấu vắng mặt, không trả cho phần không ai làm.'),
    },
  ];

  const doors = {
    worker: {
      href: '/for-workers',
      title: t('home.role.worker'),
      desc: tx('Tìm ca gần bạn, làm vài giờ, không mất phí.'),
    },
    employer: {
      href: '/for-employers',
      title: t('home.role.employer'),
      desc: tx('Đăng ca theo giờ, duyệt từng người, trả cho người đã làm.'),
    },
  };

  return (
    // Nền đổi màu theo khối đang xem (data-tone trên từng khối) — ToneScroll.
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      {/* 1. Màn đầu — chữ + hai cửa bên trái, biên nhận bên phải */}
      <section data-tone="cream" className="px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              {/* Hai vế mỗi vế một dòng — tránh ngắt giữa "ngắn hạn". */}
              <span className="hero-in block" style={{ '--i': 0 } as CSSProperties}>{t('landing.hero.title')}</span>{' '}
              <span className="hero-in block" style={{ '--i': 1 } as CSSProperties}>{t('landing.hero.titleAccent')}</span>
            </h1>
            <p className="hero-in mt-5 max-w-xl text-lg leading-relaxed text-gray-700" style={{ '--i': 2 } as CSSProperties}>
              {supabase
                ? tx('CaLẻ giữ trước tiền công của mỗi ca, theo dõi ca tới lúc xong và chỉ trả cho người đã làm.')
                : tx('CaLẻ giữ trước tiền công của mỗi ca (mô phỏng), theo dõi ca tới lúc xong và chỉ trả cho người đã làm.')}
            </p>
            <p id="home-doors" className="hero-in mt-9 text-base font-semibold text-gray-900" style={{ '--i': 3 } as CSSProperties}>
              {t('home.chooser.lead')}
            </p>
            <ul aria-labelledby="home-doors" className="hero-in mt-3 grid max-w-md gap-3" style={{ '--i': 4 } as CSSProperties}>
              <li>
                <RoleDoor {...doors.worker} tone="brand" />
              </li>
              <li>
                <RoleDoor {...doors.employer} tone="ink" />
              </li>
            </ul>
            {/* Số ca đang mở thật (tự ẩn khi 0) — trả lời ngay "có việc không?". */}
            <OpenShiftCount />
            <p className="hero-in mt-4 text-sm text-gray-600" style={{ '--i': 5 } as CSSProperties}>
              {t('workerHome.hero.haveAccount')}{' '}
              <Link href="/login" className="font-semibold text-orange-700 underline-offset-4 hover:underline">
                {t('nav.login')}
              </Link>
            </p>
          </div>

          <div className="hero-in" style={{ '--i': 3 } as CSSProperties}>
            <HomeReceipt
              lines={receiptLines}
              pending="—"
              heading={tx('Tiền của ca này đi đâu?')}
              balance={balance}
              caption={tx('Minh hoạ: tên và số liệu là ví dụ. Bấm từng dòng để xem giải thích.')}
            />
          </div>
        </div>
      </section>

      {/* 2. Vì sao CaLẻ ra đời? — bối cảnh bằng số liệu chính thức (whyData.ts, mỗi số ghi
          nguồn + kỳ, số đếm lên + highlight khi cuộn tới) → bảng so sánh tuyển qua hội nhóm
          với trên CaLẻ (lý do ra đời = vấn đề CaLẻ giải quyết) → cảnh báo lừa đảo việc làm
          thêm. Không kể chuyện nhóm chưa có thật. */}
      <section aria-labelledby="home-why" data-tone="apricot" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="home-why" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Vì sao CaLẻ ra đời?')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
              {tx('Quán cần người làm vài giờ lúc đông khách, sinh viên cần việc theo lịch học. Nhưng hai bên vẫn tìm nhau qua bài đăng trong các hội nhóm: hứa trả miệng, thiếu thông tin, có chuyện thì không ai đứng giữa. CaLẻ ra đời để thay cách làm đó.')}
            </p>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {whyStats(tx).map((st) => (
              <li key={st.label} className="flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5 sm:p-6">
                <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  <StatValue value={st.value} locale={locale} />
                </p>
                <p className="mt-1.5 text-base leading-snug text-gray-800">{st.label}</p>
                <a
                  href={st.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex min-h-[44px] items-end pt-3 text-sm leading-snug text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  {tx('Nguồn: {source}').replace('{source}', st.source)}
                  <span className="sr-only"> {tx('(mở trang mới)')}</span>
                </a>
              </li>
            ))}
          </ul>


          {/* Lý do ra đời chính là những vấn đề CaLẻ giải quyết: so sánh ngay dưới số liệu. */}
          <MotionGroup className="mt-10 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
            {/* Tiêu đề cột chỉ hiện từ md; điện thoại mỗi ô tự ghi tên cột (sr-only từ md). */}
            <div aria-hidden="true" className="hidden grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-gray-200 px-6 py-4 text-base font-semibold md:grid">
              <span />
              <span className="text-gray-600">{tx('Tuyển qua hội nhóm')}</span>
              <span className="text-gray-900">{tx('Trên CaLẻ')}</span>
            </div>
            <ul className="divide-y divide-gray-200">
              {whyRows(tx, supabase).map((row, i) => (
                <li key={row.topic} style={{ '--i': i } as CSSProperties} className="m-rise grid gap-2 px-5 py-4 md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:px-6 md:py-5">
                  <p className="text-base font-semibold text-gray-900">{row.topic}</p>
                  <p className="flex gap-2 text-base leading-relaxed text-gray-600">
                    <svg className="mt-1.5 h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" />
                    </svg>
                    <span>
                      <span className="font-semibold md:sr-only">{tx('Tuyển qua hội nhóm')}: </span>
                      {row.before}
                    </span>
                  </p>
                  <p className="flex gap-2 text-base leading-relaxed text-gray-900">
                    <svg className="m-tick mt-1 h-4 w-4 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 10.5 3.2 3L15 6.5" />
                    </svg>
                    <span>
                      <span className="font-semibold md:sr-only">{tx('Trên CaLẻ')}: </span>
                      {row.after}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </MotionGroup>
          <p className="mt-6 text-sm leading-relaxed text-gray-600">
            {tx('Công an nhiều lần cảnh báo chiêu đăng tin tuyển "việc làm thêm" để lừa sinh viên.')}{' '}
            <a
              href={WHY_SCAM_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-gray-300 underline-offset-2 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {tx('Nguồn: VTV, 01/08/2026')}
              <span className="sr-only"> {tx('(mở trang mới)')}</span>
            </a>
          </p>
        </div>
      </section>

      {/* 3. Loại việc (vòng thẻ) + ca gấp (tự ẩn khi không có). */}
      <section aria-labelledby="home-work" data-tone="paper" className="overflow-x-clip px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="home-work" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              <TypeOnView text={tx('Ca làm cho nhiều loại việc')} />
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
              {tx('Từ quán ăn, quán cà phê tới sự kiện và kho hàng: những việc cần thêm người trong vài giờ. Mỗi ca ghi rõ giờ làm, tổng tiền và yêu cầu.')}
            </p>
          </div>
          <div className="mt-8">
            <JobRing
              jobs={homeJobs(tx, t)}
              copy={{
                frameTitles: [tx('Việc gồm gì'), tx('Một ca thường thế nào'), tx('Cần gì để làm')],
                findLabel: tx('Tìm ca làm'),
                postLabel: tx('Đăng ca loại này'),
                note: tx('Mô tả chung. Giờ làm, tiền công và yêu cầu cụ thể ghi trên từng ca.'),
              }}
              links={
                <>
                  <Link href="/shifts" className="inline-flex min-h-[44px] items-center text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                    {tx('Xem ca đang tuyển')} →
                  </Link>
                  <Link href="/employer/shifts/new" className="inline-flex min-h-[44px] items-center text-gray-900 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                    {tx('Đăng ca tuyển')} →
                  </Link>
                </>
              }
            />
          </div>

          <UrgentShifts />
        </div>
      </section>

      {/* 4. Tiền của một ca đi về đâu? — bốn thẻ khớp bốn dòng biên nhận. Mỗi thẻ chỉ
          hai câu ngắn cho hai phía; giải thích đầy đủ nằm trong "Xem chi tiết". */}
      <section aria-labelledby="home-explain-title" data-tone="peach" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="home-explain-title" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Tiền của một ca đi về đâu?')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
              {tx('Mỗi đồng giữ trước chỉ đi về một trong ba nơi: người lao động, phí CaLẻ, hoặc hoàn lại nhà tuyển dụng. Cả hai bên cùng thấy từng dòng.')}
            </p>
          </div>
          {/* Mỗi thẻ chiếm 4 hàng của lưới cha (subgrid): tên mục, phía người lao động,
              phía nhà tuyển dụng, "Xem chi tiết" thẳng hàng giữa các thẻ cùng hàng. */}
          {/* Sơ đồ dòng tiền chạy một lần khi cuộn tới; thẻ cùng số bên dưới sáng theo. */}
          <MoneyFlowDiagram />
          <MotionGroup>
            <ol className="mt-10 grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {explain.map((e, i) => (
                <li
                  key={e.id}
                  id={e.id}
                  style={{ '--i': i } as CSSProperties}
                  className="m-rise home-explain row-span-4 grid grid-rows-subgrid rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="explain-num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-base font-bold text-white tabular-nums">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-semibold leading-snug text-gray-900">{e.title}</h3>
                  </div>
                  <dl className="row-span-2 grid grid-rows-subgrid">
                    <div>
                      <dt className="text-sm font-semibold text-gray-900">{tx('Phía người lao động')}</dt>
                      <dd className="mt-0.5 text-base leading-relaxed text-gray-700">{e.worker}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-gray-900">{tx('Phía nhà tuyển dụng')}</dt>
                      <dd className="mt-0.5 text-base leading-relaxed text-gray-700">{e.employer}</dd>
                    </div>
                  </dl>
                  <details className="group">
                    <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 text-sm font-semibold text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 [&::-webkit-details-marker]:hidden">
                      {tx('Xem chi tiết')}
                      <svg className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 8 5 5 5-5" />
                      </svg>
                    </summary>
                    <p className="text-base leading-relaxed text-gray-700">{e.body}</p>
                    {'note' in e && e.note && <p className="mt-2 text-sm leading-relaxed text-gray-600">{e.note}</p>}
                    {'link' in e && e.link && (
                      <Link
                        href={e.link.href}
                        className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        {e.link.label} →
                      </Link>
                    )}
                  </details>
                </li>
              ))}
            </ol>
          </MotionGroup>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-gray-700">
            {[
              supabase
                ? tx('Số điện thoại được xác minh trước khi ứng tuyển')
                : tx('Số điện thoại được xác minh trước khi ứng tuyển (mô phỏng)'),
              tx('Hai bên đánh giá nhau sau mỗi ca'),
              tx('Có vấn đề sau ca: liên hệ đội hỗ trợ CaLẻ'),
            ].map((it) => (
              <li key={it} className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 10.5 3.2 3L15 6.5" />
                </svg>
                {it}
              </li>
            ))}
            <li>
              <Link href="/safety" className="font-semibold text-orange-700 underline-offset-4 hover:underline">
                {t('home.chooser.safetyLink')} →
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* 5. CaLẻ làm được gì? — chức năng đã có / sắp có (featureData.ts, danh sách đã
          duyệt 03/10). Câu về tiền ghi "(mô phỏng)" ở bản demo. */}
      <section aria-labelledby="home-features" data-tone="cream" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="home-features" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('CaLẻ làm được gì?')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
              {tx('Những gì đã chạy hôm nay, và những gì nhóm đang làm tiếp.')}
            </p>
          </div>
          <MotionGroup className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-green-600" />
                {tx('Đã có')}
              </h3>
              <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {featuresDone(tx, supabase).map((f, i) => (
                  <li key={f} style={{ '--i': i } as CSSProperties} className="m-rise flex gap-3 text-base leading-relaxed text-gray-800">
                    <svg className="m-tick mt-1 h-5 w-5 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 10.5 3.2 3L15 6.5" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-6 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brand" />
                {tx('Sắp có')}
              </h3>
              <ul className="mt-5 grid gap-4">
                {featuresPlanned(tx).map((f, i) => (
                  <li key={f} style={{ '--i': i + 4 } as CSSProperties} className="m-rise flex gap-3 text-base leading-relaxed text-gray-800">
                    <svg className="mt-1 h-5 w-5 shrink-0 text-orange-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="10" cy="10" r="7" />
                      <path d="M10 6.5V10l2.5 1.5" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </MotionGroup>
          <p className="mt-4 text-sm text-gray-600">{tx('Cập nhật: {month}').replace('{month}', FEATURES_UPDATED)}</p>
        </div>
      </section>

      {/* Ảnh tự chụp + lời chia sẻ thật từ đợt chạy thử — tự ẩn khi chưa có (proofData.ts). */}
      <LandingProofView id="home-proof" copy={proofCopy(tx)} locale={locale} tone="paper" />

      {/* 6. Dải kết — hai cửa vai trò */}
      <section aria-labelledby="home-close" className="bg-ink px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
          <div>
            <h2 id="home-close" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              <TypeOnView text={tx('Bắt đầu từ phía của bạn')} />
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
              {supabase ? t('landing.hero.trustHint.supabase') : t('landing.hero.trustHint')}
            </p>
            <p className="mt-5 text-sm">
              <Link href="/how-it-works" className="font-semibold text-brand underline-offset-4 hover:underline">
                {t('landing.howItWorks.title')}
              </Link>
            </p>
          </div>
          <MotionGroup>
            <ul className="grid gap-3">
              <li className="m-rise" style={{ '--i': 0 } as CSSProperties}>
                <RoleDoor {...doors.worker} tone="brand" />
              </li>
              <li className="m-rise" style={{ '--i': 1 } as CSSProperties}>
                <RoleDoor {...doors.employer} tone="outline" />
              </li>
            </ul>
          </MotionGroup>
        </div>
      </section>
    </ToneScroll>
  );
}

/** Cửa vai trò: cả khối là một liên kết, tên vai trò + một dòng mô tả + mũi tên. */
function RoleDoor({
  href,
  title,
  desc,
  tone,
}: {
  href: string;
  title: string;
  desc: string;
  /** `outline`: viền sáng trên dải mực — không dùng nền trắng (giao diện tối giữ #fff trong khối mực). */
  tone: 'brand' | 'ink' | 'outline';
}) {
  const skin = {
    brand: 'bg-brand text-gray-900 shadow-card hover:bg-orange-400',
    ink: 'bg-ink text-white shadow-card hover:brightness-125',
    outline: 'border border-white/50 bg-transparent text-white hover:bg-white/10',
  }[tone];
  const sub = tone === 'brand' ? 'text-gray-800' : 'text-white/75';
  return (
    <Link
      href={href}
      className={[
        'cta-arrow-nudge motion-press flex min-h-[76px] items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 motion-reduce:transition-none',
        skin,
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-snug">{title}</span>
        <span className={['mt-0.5 block text-pretty text-sm leading-snug', sub].join(' ')}>{desc}</span>
      </span>
      <svg className="cta-arrow h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 10h12M11 5l5 5-5 5" />
      </svg>
    </Link>
  );
}
