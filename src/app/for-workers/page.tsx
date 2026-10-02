import Image from 'next/image';
import Link from 'next/link';
import { RoleSwitch } from '@/components/landing/RoleSwitch';
import { RoleHomeCta } from '@/components/landing/RoleHomeCta';
import { LatestShifts } from '@/components/landing/LatestShifts';
import { WorkerPreview } from '@/components/landing/LandingPreview';
import {
  LandingChecks,
  LandingFaq,
  LandingFeatures,
  LandingMoneyFlow,
  LandingSteps,
} from '@/components/landing/LandingSections';
import { getT, getTx } from '@/i18n/server';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang cho người lao động. Trước đây (P1 feedback F4) giới hạn 4 khối; từ 02/10
 * chủ dự án yêu cầu trình bày đủ thông tin để khách ở lại, nên trang có:
 *   1. Hero: câu chính + "Đăng ký để nhận ca" + "Xem ca đang tuyển" + đăng nhập
 *      + minh hoạ giao diện trên điện thoại.
 *   2. Cách hoạt động: 4 bước từ tìm ca tới nhận tiền.
 *   3. 3 lợi ích có ảnh (F3 — ảnh stock Unsplash, xem docs/IMAGE_CREDITS.md).
 *   4. 6 ca mới nhất (thật, cùng luật lọc với /shifts).
 *   5. Làm theo ca mà vẫn yên tâm: những gì app làm cho bạn.
 *   6. Tiền công của bạn: ví dụ số + quy định huỷ ca.
 *   7. Câu hỏi thường gặp.
 *   8. Dải chuyển sang trang nhà tuyển dụng.
 * Khách chủ lực là sinh viên → câu ngắn, lời thường. Chỉ nói tính năng chạy ở
 * CẢ demo lẫn production (`data/capabilities.ts`).
 */
export default async function WorkerHomePage() {
  const t = await getT();
  const tx = await getTx();
  const supabase = isSupabaseEnv();
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
    <div className="flex min-w-0 flex-col">
      {/* 1. Hero — nền kem, chữ bên trái + minh hoạ trên điện thoại bên phải */}
      <section className="hero-decor relative px-4 pb-14 pt-8 sm:px-6 sm:pb-20 lg:px-8">
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

      {/* 2. Cách hoạt động — nền trắng */}
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
      />

      {/* 3. 3 lợi ích có ảnh — nền kem */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="worker-benefits">
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

      {/* 4. 6 ca mới nhất — nền trắng */}
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="worker-latest">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="worker-latest" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {t('workerHome.latest.title')}
            </h2>
            <Link
              href="/shifts"
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {t('workerHome.latest.viewAll')} →
            </Link>
          </div>
          <LatestShifts />
        </div>
      </section>

      {/* 5. Làm theo ca mà vẫn yên tâm — nền kem */}
      <LandingFeatures
        id="worker-care"
        title={tx('Làm theo ca mà vẫn yên tâm')}
        lead={tx('Những gì CaLẻ làm sẵn để bạn chỉ cần lo đi làm.')}
        items={[
          {
            icon: 'money',
            title: tx('Biết trước mình được bao nhiêu'),
            body: tx('Tổng tiền cả ca hiện ngay trên thẻ ca, kèm đơn giá và số giờ.'),
          },
          {
            icon: 'wallet',
            title: tx('Tiền công có sẵn'),
            body: supabase
              ? tx('Ca chỉ được đăng khi nhà tuyển dụng đã giữ đủ tiền công trên CaLẻ.')
              : tx('Ca chỉ được đăng khi nhà tuyển dụng đã giữ đủ tiền công (mô phỏng).'),
          },
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
      />

      {/* 6. Tiền công của bạn — nền trắng */}
      <LandingMoneyFlow
        id="worker-money"
        title={tx('Tiền công của bạn')}
        lead={tx('Ví dụ một ca 4 giờ, 45.000 đ mỗi giờ.')}
        stages={[
          {
            label: tx('Trước khi ca hiện ra'),
            amount: '180.000 đ',
            body: supabase
              ? tx('đã được nhà tuyển dụng giữ sẵn trên CaLẻ.')
              : tx('đã được giữ sẵn (mô phỏng).'),
          },
          {
            label: tx('Khi ca xong'),
            amount: '180.000 đ',
            body: supabase
              ? tx('vào ví của bạn khi nhà tuyển dụng xác nhận, hoặc tự động sau 24 giờ.')
              : tx('được ghi vào ví của bạn (mô phỏng).'),
          },
          {
            label: tx('Phí của bạn'),
            amount: '0 đ',
            body: supabase
              ? tx('Tìm ca, ứng tuyển và nhận tiền đều không mất phí. Rút số dư về ngân hàng khi cần.')
              : tx('Tìm ca và ứng tuyển không mất phí. Bản demo chưa rút được tiền thật.'),
          },
        ]}
        rulesTitle={tx('Huỷ ca đã nhận')}
        rules={[
          tx('Ca còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ được.'),
          tx('Trong vòng 3 giờ: gửi yêu cầu huỷ, nhà tuyển dụng đồng ý thì mới huỷ; trong lúc chờ bạn vẫn giữ chỗ.'),
          tx('Không đến mà không báo: bị tính vắng mặt và không nhận tiền công.'),
        ]}
      />

      {/* 7. Câu hỏi thường gặp — nền kem */}
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
      />

      {/* 8. Dải chuyển vai trò — khối mực */}
      <section className="bg-ink px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-lg font-semibold">{t('workerHome.switch.text')}</p>
          <Link
            href="/for-employers"
            className="cta-arrow-nudge inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {t('workerHome.switch.cta')} <span className="cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
