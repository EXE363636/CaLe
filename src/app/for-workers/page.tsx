import Image from 'next/image';
import Link from 'next/link';
import { RoleSwitch } from '@/components/landing/RoleSwitch';
import { LatestShifts } from '@/components/landing/LatestShifts';
import { getT } from '@/i18n/server';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang cho người lao động — P1 feedback F4. Tối đa 4 khối:
 *   1. Hero: 1 câu + "Đăng ký để nhận ca" (chính) + "Xem ca đang tuyển" + đăng nhập.
 *   2. 3 lợi ích có ảnh (F3 — ảnh stock Unsplash, xem docs/IMAGE_CREDITS.md).
 *   3. 6 ca mới nhất (thật, cùng luật lọc với /shifts).
 *   4. Dải chuyển sang trang nhà tuyển dụng.
 * Khách chủ lực là sinh viên → câu ngắn, lời thường.
 */
export default async function WorkerHomePage() {
  const t = await getT();
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
      {/* 1. Hero — nền kem */}
      <section className="hero-decor relative px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <RoleSwitch active="worker" />
          <div className="mt-10 text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl">
              {t('workerHome.hero.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
              {t('workerHome.hero.lead')}
            </p>
            {/* Menu khách không còn mục "Tìm ca làm" → trang này là lối vào của
                người lao động: đăng ký là hành động chính (giống /for-employers). */}
            <div className="mt-8 flex flex-col items-center gap-3">
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
            </div>
          </div>
        </div>
      </section>

      {/* 2. 3 lợi ích — nền trắng */}
      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="worker-benefits">
        <div className="mx-auto max-w-6xl">
          <h2 id="worker-benefits" className="sr-only">{t('workerHome.benefits.title')}</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.title} className="overflow-hidden rounded-3xl bg-orange-50">
                <Image
                  src={b.img}
                  alt={b.alt}
                  width={960}
                  height={640}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  // Nằm trong khung nhìn đầu ở desktop (LCP) → tải ngay.
                  loading="eager"
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

      {/* 3. 6 ca mới nhất — nền kem */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="worker-latest">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="worker-latest" className="text-2xl font-bold text-gray-900 sm:text-3xl">
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

      {/* 4. Dải chuyển vai trò — khối mực */}
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

