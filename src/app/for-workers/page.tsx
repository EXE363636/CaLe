import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ApplyPreview } from '@/components/landing/ApplyPreview';
import { homeJobs } from '@/components/landing/homeJobs';
import { JobWageHint } from '@/components/landing/JobWageHint';
import { MotionGroup } from '@/components/landing/MotionGroup';
import { OpenShiftCount } from '@/components/landing/OpenShiftCount';
import { PayoutTimeline } from '@/components/landing/PayoutTimeline';
import { ReviewFlowPreview } from '@/components/landing/ReviewFlowPreview';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { VerifyPreview } from '@/components/landing/VerifyPreview';
import { RoleSwitch } from '@/components/landing/RoleSwitch';
import { RoleBand } from '@/components/landing/RoleBand';
import { RoleHomeCta } from '@/components/landing/RoleHomeCta';
import { LandingProofView } from '@/components/landing/LandingProof';
import { proofCopy } from '@/components/landing/proofData';
import { WorkerPreview } from '@/components/landing/LandingPreview';
import {
  LandingChecks,
  LandingFaq,
  LandingFeatures,
  LandingHelp,
  LandingMoneyFlow,
  LandingSteps,
} from '@/components/landing/LandingSections';
import { getLocale, getT, getTx } from '@/i18n/server';
import { shareMeta } from '@/lib/shareMeta';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang cho người lao động. Trước đây (P1 feedback F4) giới hạn 4 khối; từ 02/10
 * chủ dự án yêu cầu trình bày đủ thông tin để khách ở lại. 03/10 sắp lại theo câu
 * người tìm ca hỏi (có ca không → làm sao → cần gì → tiền về khi nào):
 *   1. Hero: câu chính + "Đăng ký để nhận ca" + "Xem ca đang tuyển" + đăng nhập
 *      + minh hoạ vòng đời ca trên điện thoại (tự diễn, có ca bị huỷ / không được chọn).
 *   2. Chọn loại việc: số ca đang tuyển THẬT + 9 loại việc dẫn tới `/shifts?viec=…`.
 *   3. Cách hoạt động: 4 bước từ tìm ca tới nhận tiền.
 *   4. Tìm ca và ứng tuyển: cảnh tìm ca tự gõ → chọn ca → "Ứng tuyển" (`ApplyPreview`).
 *   5. Xác thực một lần: thẻ xác thực SĐT / CCCD tự gõ thông tin ví dụ.
 *   6. Tiền về tay bạn khi nào: sơ đồ 5 chặng chạy một lần + quy định huỷ ca.
 *   7. Làm tốt thì được ghi nhận: đánh giá hai chiều + điểm uy tín / kỹ năng, một thẻ
 *      4 bước (`ReviewFlowPreview`, phần uy tín bản thật gắn "Sắp có").
 *   8. 3 lợi ích có ảnh (F3 — ảnh stock Unsplash, xem docs/IMAGE_CREDITS.md).
 *   9. Làm theo ca mà vẫn yên tâm: 4 điều app làm cho bạn.
 *  10. Câu hỏi thường gặp (production thêm cọc khi ứng tuyển, rút tiền) + an toàn / hỗ trợ.
 *  11. Dải chuyển sang trang nhà tuyển dụng.
 * Nền cả trang đổi màu theo khối đang xem (`ToneScroll`, như trang chủ).
 * Khách chủ lực là sinh viên → câu ngắn, lời thường. Chỉ nói tính năng chạy ở
 * CẢ demo lẫn production (`data/capabilities.ts`); khác nhau thì rẽ theo `supabase`.
 */
// Thẻ chia sẻ link (ảnh: opengraph-image.png cạnh file này).
export const metadata = shareMeta(
  'Tìm ca làm ngắn hạn gần bạn | CaLẻ',
  'Không mất phí. Biết trước tổng tiền cả ca trước khi ứng tuyển, check-in ngay trên điện thoại.',
);

export default async function WorkerHomePage() {
  const t = await getT();
  const tx = await getTx();
  const locale = await getLocale();
  const supabase = isSupabaseEnv();
  const jobs = homeJobs(tx, t);
  const benefits = [
    {
      img: '/images/landing/worker-phuc-vu.webp',
      alt: t('workerHome.benefit.fast.alt'),
      title: t('workerHome.benefit.fast.title'),
      desc: t('workerHome.benefit.fast.desc'),
    },
    {
      img: '/images/landing/worker-vi-tien.webp',
      alt: t('workerHome.benefit.pay.alt'),
      title: t('workerHome.benefit.pay.title'),
      desc: t(supabase ? 'workerHome.benefit.pay.desc' : 'workerHome.benefit.pay.desc.demo'),
    },
    {
      img: '/images/landing/worker-phu-bep.webp',
      alt: t('workerHome.benefit.noExp.alt'),
      title: t('workerHome.benefit.noExp.title'),
      desc: t('workerHome.benefit.noExp.desc'),
    },
  ];

  return (
    // Nền đổi màu theo khối đang xem (data-tone trên từng khối) — ToneScroll.
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      {/* 1. Hero — chữ bên trái + minh hoạ trên điện thoại bên phải */}
      <section data-tone="cream" className="hero-decor relative px-4 pb-14 pt-8 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <RoleSwitch active="worker" />
          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl">
                {t('workerHome.hero.title')}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg lg:mx-0">
                {t('workerHome.hero.lead')}{' '}
                {supabase
                  ? tx('Tiền công đã được giữ sẵn trước khi ca hiện ra, làm xong là về ví.')
                  : tx('Tiền công đã được giữ sẵn trước khi ca hiện ra (mô phỏng), làm xong là về ví.')}
              </p>
              {/* Menu khách không còn mục "Tìm ca làm" → trang này là lối vào của
                  người lao động: đăng ký là hành động chính (giống /for-employers). */}
              <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
                {/* Đã đăng nhập → không mời đăng ký nữa (RoleHomeCta). */}
                <RoleHomeCta audience="worker" placement="hero">
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <Link
                      href="/register?role=worker"
                      className="cta-arrow-nudge motion-press inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-8 text-base font-semibold text-gray-900 shadow-md hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      {t('workerHome.hero.cta')} <span className="cta-arrow" aria-hidden="true">→</span>
                    </Link>
                    <Link
                      href="/shifts"
                      className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-base font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      {t('workerHome.hero.browse')}
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('workerHome.hero.haveAccount')}{' '}
                    <Link href="/login" className="font-semibold text-orange-700 hover:underline">
                      {t('nav.login')}
                    </Link>
                  </p>
                </RoleHomeCta>
              </div>
              <LandingChecks
                items={[
                  tx('Không mất phí'),
                  tx('Biết trước tổng tiền ca'),
                  tx('Check-in trên điện thoại'),
                ]}
              />
            </div>
            <WorkerPreview />
          </div>
        </div>
      </section>

      {/* 2. Chọn loại việc — số ca đang tuyển thật + lối tắt vào /shifts đã lọc */}
      <section aria-labelledby="worker-jobs" data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="worker-jobs" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Chọn loại việc bạn muốn làm')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {tx('Bấm một loại việc để xem các ca đang tuyển của loại đó. Giờ làm, tiền công và yêu cầu ghi rõ trên từng ca.')}
            </p>
            <OpenShiftCount />
          </div>
          <MotionGroup>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j, i) => (
                <li key={j.id} className="m-rise" style={{ '--i': i } as CSSProperties}>
                  <Link
                    href={j.filter ? `/shifts?viec=${j.filter}` : '/shifts'}
                    className="group flex min-h-[72px] items-center gap-4 rounded-2xl bg-white p-3 pr-4 shadow-card ring-1 ring-black/5 transition-shadow hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none"
                  >
                    <Image src={j.img} alt="" width={112} height={112} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-gray-900">{j.label}</span>
                      <span className="block text-sm text-gray-600">{j.desc}</span>
                      <JobWageHint filter={j.filter} />
                    </span>
                    <span aria-hidden="true" className="text-orange-700 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </MotionGroup>
        </div>
      </section>

      {/* 3. Cách hoạt động */}
      <LandingSteps
        id="worker-how"
        title={tx('Từ lúc tìm ca đến lúc nhận tiền')}
        lead={tx('Bốn bước, làm hết trên điện thoại.')}
        steps={[
          {
            title: tx('Tìm ca hợp lịch'),
            body: tx('Mỗi ca ghi rõ tổng tiền cả ca, giờ làm, địa điểm và yêu cầu. Chỉ ca đã được giữ trước tiền công mới hiện ra.'),
          },
          {
            title: tx('Ứng tuyển, chờ duyệt'),
            body: tx('Xác thực số điện thoại một lần, rồi ứng tuyển bằng một nút. Được duyệt, trạng thái đơn đổi ngay trên trang Tổng quan.'),
          },
          {
            title: tx('Đi làm'),
            body: tx('Tới nơi bấm check-in, xong ca bấm check-out, ngay trên điện thoại.'),
          },
          {
            title: tx('Nhận tiền'),
            body: supabase
              ? tx('Nhà tuyển dụng xác nhận là tiền công vào ví CaLẻ của bạn; không ai bấm thì hệ thống tự chốt sau 24 giờ. Rút về ngân hàng khi cần.')
              : tx('Nhà tuyển dụng xác nhận là tiền công được ghi vào ví của bạn (mô phỏng).'),
          },
        ]}
        tone="cream"
      />

      {/* 4. Tìm ca và ứng tuyển — cảnh tìm ca tự gõ, chọn ca, bấm "Ứng tuyển" */}
      <section aria-labelledby="worker-apply" data-tone="peach" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-last">
            <h2 id="worker-apply" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Tìm được ca là ứng tuyển ngay')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">{tx('Không cần gửi CV hay nhắn tin hỏi giá.')}</p>
            <ul className="mt-6 flex flex-col gap-5">
              <VerifyPoint n={1} title={tx('Lọc theo ý bạn')} body={tx('Tìm theo tên ca, địa điểm; lọc theo khu vực, loại việc, mức lương.')} />
              <VerifyPoint n={2} title={tx('Thấy hết trước khi bấm')} body={tx('Tổng tiền cả ca, giờ làm, địa điểm và yêu cầu ghi ngay trên ca.')} />
              <VerifyPoint
                n={3}
                title={tx('Một nút ứng tuyển')}
                body={tx('Đơn chờ nhà tuyển dụng duyệt; được duyệt hay không, trạng thái đổi ngay trên trang Tổng quan.')}
              />
            </ul>
          </div>
          <ApplyPreview />
        </div>
      </section>

      {/* 5. Xác thực một lần — thẻ xác thực tự gõ thông tin ví dụ */}
      <section aria-labelledby="worker-verify" data-tone="apricot" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="worker-verify" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Xác thực một lần trước ca đầu tiên')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {supabase
                ? tx('Làm ngay trong trang Hồ sơ, mất vài phút.')
                : tx('Bản demo dùng giấy tờ mô phỏng; minh hoạ là luồng xác thực của bản thật.')}
            </p>
            <ul className="mt-6 flex flex-col gap-5">
              <VerifyPoint
                n={1}
                title={tx('Số điện thoại')}
                body={tx('Nhập số, nhận mã 6 số qua tin nhắn. Cần làm trước khi ứng tuyển ca đầu tiên.')}
              />
              <VerifyPoint
                n={2}
                title={tx('CCCD, không bắt buộc')}
                body={
                  supabase
                    ? tx('Không cần để ứng tuyển. Khi CaLẻ yêu cầu cọc lúc ứng tuyển, đã xác thực CCCD thì thường được miễn cọc.')
                    : tx('Nhà tuyển dụng thấy nhãn "Đã xác minh danh tính" trên hồ sơ của bạn. Trong bản demo, xác thực là mô phỏng.')
                }
              />
              {supabase && (
                <VerifyPoint
                  n={3}
                  title={tx('Ảnh giấy tờ được để riêng')}
                  body={tx('Ảnh CCCD nằm ở kho riêng tư, chỉ quản trị viên xem để duyệt.')}
                />
              )}
            </ul>
          </div>
          <VerifyPreview audience="worker" />
        </div>
      </section>

      {/* 6. Tiền về tay bạn khi nào — sơ đồ 5 chặng (chạy một lần) + quy định huỷ */}
      <LandingMoneyFlow
        id="worker-money"
        title={tx('Tiền về tay bạn khi nào?')}
        typedTitle
        lead={
          supabase
            ? tx('Ví dụ một ca 4 giờ, 45.000 đ mỗi giờ: bạn nhận đủ 180.000 đ, không mất phí.')
            : tx('Ví dụ một ca 4 giờ, 45.000 đ mỗi giờ: bạn nhận đủ 180.000 đ (mô phỏng).')
        }
        diagram={<PayoutTimeline />}
        rulesTitle={tx('Huỷ ca đã nhận')}
        rules={[
          tx('Ca còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ được.'),
          tx('Trong vòng 3 giờ: gửi yêu cầu huỷ, nhà tuyển dụng đồng ý thì mới huỷ; trong lúc chờ bạn vẫn giữ chỗ.'),
          tx('Không đến mà không báo: bị tính vắng mặt và không nhận tiền công.'),
        ]}
        tone="paper"
      />

      {/* 7. Đánh giá hai chiều + uy tín / kỹ năng (bản thật: "Sắp có") */}
      <section aria-labelledby="worker-reviews" data-tone="apricot" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="worker-reviews" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Làm tốt thì được ghi nhận')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">{tx('Mỗi ca xong để lại dấu vết cho ca sau.')}</p>
            <ul className="mt-6 flex flex-col gap-5">
              <VerifyPoint n={1} title={tx('Hai bên chấm nhau')} body={tx('Trong 14 ngày sau ca, quán chấm sao cho bạn và bạn chấm quán. Gửi rồi không sửa được.')} />
              <VerifyPoint n={2} title={tx('Điểm sao đi theo bạn')} body={tx('Nhà tuyển dụng khác thấy điểm sao trung bình của bạn khi duyệt người ở ca sau.')} />
              <VerifyPoint
                n={3}
                title={tx('Uy tín và kỹ năng')}
                body={
                  supabase
                    ? tx('Sắp có: điểm uy tín theo lịch sử ca và cấp kỹ năng theo từng loại việc.')
                    : tx('Điểm uy tín cộng trừ theo lịch sử ca; kỹ năng lên cấp theo số ca và số sao.')
                }
              />
            </ul>
          </div>
          <ReviewFlowPreview audience="worker" />
        </div>
      </section>

      {/* 8. 3 lợi ích có ảnh */}
      <section data-tone="cream" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="worker-benefits">
        <div className="mx-auto max-w-6xl">
          <h2 id="worker-benefits" className="sr-only">{t('workerHome.benefits.title')}</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.title} className="overflow-hidden rounded-3xl bg-white shadow-card">
                <Image
                  src={b.img}
                  alt={b.alt}
                  width={960}
                  height={640}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. Làm theo ca mà vẫn yên tâm — 4 điều app làm sẵn */}
      <LandingFeatures
        id="worker-care"
        title={tx('Làm theo ca mà vẫn yên tâm')}
        lead={tx('Những gì CaLẻ làm sẵn để bạn chỉ cần lo đi làm.')}
        items={[
          {
            icon: 'phone',
            title: tx('Check-in ngay trên điện thoại'),
            body: tx('Tới nơi bấm check-in, xong ca bấm check-out. Không cần sổ chấm công.'),
          },
          {
            icon: 'status',
            title: tx('Luôn biết ca đang ở đâu'),
            body: tx('Đã duyệt, sắp bắt đầu, đang diễn ra, chờ xác nhận: trạng thái hiện rõ trên trang Tổng quan.'),
          },
          {
            icon: 'star',
            title: tx('Xem quán trước khi nhận'),
            body: tx('Đánh giá từ người đã làm ca ở đó hiện ngay trên trang chi tiết ca.'),
          },
          {
            icon: 'clock',
            title: tx('Huỷ ca có quy định rõ'),
            body: tx('Còn hơn 3 giờ thì tự huỷ được; sát giờ hơn thì cần nhà tuyển dụng đồng ý.'),
          },
        ]}
        tone="peach"
      />

      {/* 10. Câu hỏi thường gặp */}
      <LandingFaq
        id="worker-faq"
        title={tx('Câu hỏi thường gặp')}
        more={{ href: '/faq', label: tx('Xem tất cả câu hỏi') }}
        items={[
          {
            q: tx('Tôi có mất phí không?'),
            a: supabase
              ? tx('Không. Tìm ca, ứng tuyển và nhận tiền công đều miễn phí; bạn nhận đủ số tiền ghi trên ca.')
              : tx('Không. Tìm ca và ứng tuyển miễn phí; trong bản demo mọi khoản tiền đều là mô phỏng.'),
          },
          {
            q: tx('Khi nào tôi nhận được tiền công?'),
            a: supabase
              ? tx('Ngay khi nhà tuyển dụng xác nhận bạn hoàn thành ca, tiền công được chuyển vào ví của bạn trên CaLẻ và bạn có thể rút về tài khoản ngân hàng bất cứ lúc nào. Nếu nhà tuyển dụng không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.')
              : tx('Sau khi bạn check-out và nhà tuyển dụng xác nhận hoàn thành, tiền công được trả vào hệ thống và phản ánh ngay trong mục "Tổng thu nhập" trên dashboard người lao động. Trong bản dùng thử hiện tại, mọi giao dịch tiền tệ đều là mô phỏng.'),
          },
          {
            q: tx('Rút tiền về ngân hàng thế nào?'),
            a: supabase
              ? tx('Vào ví, chọn rút tiền và nhập tài khoản ngân hàng nhận. CaLẻ không thu phí rút; mỗi lần rút từ 2.000 đ.')
              : tx('Bản demo chưa rút được tiền thật; số dư trong ví là mô phỏng.'),
          },
          // Cọc người lao động (migration 0028) chỉ có ở bản thật, quản trị viên bật / tắt.
          ...(supabase
            ? [
                {
                  q: tx('Ứng tuyển có phải đặt cọc không?'),
                  a: tx('Tuỳ thời điểm. CaLẻ có thể yêu cầu một khoản cọc nhỏ khi ứng tuyển để hạn chế nhận ca rồi bỏ; số tiền hiện rõ để bạn đồng ý trước khi gửi đơn. Cọc hoàn đủ khi ca hoàn thành, khi bạn không được chọn, khi bạn huỷ hoặc ca bị huỷ. Vắng mặt không báo thì cọc chuyển cho nhà tuyển dụng; bạn khiếu nại được trong 72 giờ. Đã xác thực CCCD hoặc làm đủ số ca gần đây thì thường được miễn.'),
                },
              ]
            : []),
          {
            q: tx('Tại sao tôi chưa ứng tuyển được?'),
            a: tx('Bạn cần xác thực số điện thoại trước khi ứng tuyển ca đầu tiên. Một số ca có thêm yêu cầu riêng, ghi rõ trong chi tiết ca.'),
          },
          {
            q: tx('Có cần kinh nghiệm không?'),
            a: tx('Không nhất thiết. Nhiều ca phục vụ, phụ bếp, sự kiện nhận người mới; yêu cầu ghi rõ ở từng ca.'),
          },
          {
            q: tx('Tôi có huỷ ca đã nhận được không?'),
            a: tx('Được. Ca còn hơn 3 giờ nữa mới bắt đầu thì bạn tự huỷ; sát giờ hơn thì gửi yêu cầu và chờ nhà tuyển dụng đồng ý.'),
          },
        ]}
        tone="paper"
      />

      {/* An toàn & hỗ trợ — lối tắt tới /safety và /support */}
      <LandingHelp
        id="worker-help"
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
        tone="paper"
      />

      {/* Ảnh tự chụp + lời chia sẻ thật của phía này — tự ẩn khi chưa có (proofData.ts). */}
      <LandingProofView id="worker-proof" copy={proofCopy(tx)} locale={locale} audience="worker" tone="cream" />

      {/* 11. Dải mực cuối trang — chữ và nút theo người đang xem (RoleBand) */}
      <RoleBand audience="worker" />
    </ToneScroll>
  );
}

/** Một ý ở khối "Xác thực một lần": số thứ tự + tiêu đề + một câu. */
function VerifyPoint({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white tabular-nums">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
      </div>
    </li>
  );
}
