import Image from 'next/image';
import Link from 'next/link';
import { UrgentShifts } from '@/components/landing/UrgentShifts';
import { getT } from '@/i18n/server';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang chủ — P1 feedback F4: tách theo vai trò.
 *
 * `/` chỉ có một việc: cho khách chọn "Tôi cần việc" (→ `/for-workers`) hay
 * "Tôi cần tuyển" (→ `/for-employers`). Chi tiết từng bên nằm ở trang riêng.
 * Mỗi thẻ vai trò có ảnh + 3 lợi ích ngắn (F3 "thêm hình", tránh trống trải mà
 * không thêm khối chữ). Dưới 2 thẻ: "Ca gấp cần người" — dữ liệu thật, tự ẩn
 * khi không có ca gấp. Lợi ích về tiền nói đúng theo chế độ (CLAUDE.md §5).
 */
export default async function RoleChooserPage() {
  const t = await getT();
  const supabase = isSupabaseEnv();
  return (
    <div className="hero-decor relative flex min-w-0 flex-col px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-5xl">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl">
            {t('landing.hero.title')}{' '}
            <span className="text-orange-600">{t('landing.hero.titleAccent')}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
            {t('home.chooser.lead')}
          </p>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6">
          <li>
            <RoleCard
              href="/for-workers"
              tone="brand"
              img="/images/landing/worker-phuc-vu.webp"
              imgAlt={t('workerHome.benefit.fast.alt')}
              title={t('home.role.worker')}
              desc={t('home.chooser.worker.desc')}
              chips={[
                t('home.chooser.worker.chip.free'),
                t(supabase ? 'home.chooser.worker.chip.pay' : 'home.chooser.worker.chip.pay.demo'),
                t('home.chooser.worker.chip.noExp'),
              ]}
              cta={t('home.chooser.worker.cta')}
            />
          </li>
          <li>
            <RoleCard
              href="/for-employers"
              tone="ink"
              img="/images/landing/employer-su-kien.webp"
              imgAlt={t('employerHome.benefit.attendance.alt')}
              title={t('home.role.employer')}
              desc={t('home.chooser.employer.desc')}
              chips={[
                t(supabase ? 'home.chooser.employer.chip.fee' : 'home.chooser.employer.chip.fee.demo'),
                t('home.chooser.employer.chip.payWorked'),
                t('home.chooser.employer.chip.refund'),
              ]}
              cta={t('home.chooser.employer.cta')}
            />
          </li>
        </ul>

        <UrgentShifts />

        <p className="mt-10 text-center text-xs text-gray-500">
          {supabase ? t('landing.hero.trustHint.supabase') : t('landing.hero.trustHint')}
        </p>
        <p className="mt-3 text-center text-sm text-gray-600">
          <Link href="/how-it-works" className="font-semibold text-orange-700 hover:underline">
            {t('landing.howItWorks.title')}
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/safety" className="font-semibold text-orange-700 hover:underline">
            {t('home.chooser.safetyLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}

function RoleCard({
  href,
  tone,
  img,
  imgAlt,
  title,
  desc,
  chips,
  cta,
}: {
  href: string;
  tone: 'brand' | 'ink';
  img: string;
  imgAlt: string;
  title: string;
  desc: string;
  chips: string[];
  cta: string;
}) {
  const brand = tone === 'brand';
  return (
    <Link
      href={href}
      className={[
        'motion-lift group flex h-full flex-col overflow-hidden rounded-3xl shadow-card',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
        brand ? 'bg-brand text-ink' : 'bg-ink text-white',
      ].join(' ')}
    >
      <Image
        src={img}
        alt={imgAlt}
        width={960}
        height={640}
        sizes="(min-width: 640px) 50vw, 100vw"
        // Thẻ nằm trong khung nhìn đầu (LCP) → tải ngay.
        loading="eager"
        className="aspect-[2/1] w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <p className={['mt-2 text-base leading-relaxed', brand ? 'text-gray-900/80' : 'text-white/80'].join(' ')}>
          {desc}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c}
              className={[
                'rounded-full px-3 py-1 text-sm font-semibold',
                brand ? 'bg-white/70 text-gray-900' : 'bg-white/10 text-white',
              ].join(' ')}
            >
              {c}
            </li>
          ))}
        </ul>
        <span className="cta-arrow-nudge mt-auto inline-flex items-center gap-1.5 pt-6 text-base font-semibold">
          {cta} <span className="cta-arrow" aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
