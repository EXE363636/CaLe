import Link from 'next/link';
import { t } from '@/i18n/vi';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang chủ — P1 feedback F4: tách theo vai trò.
 *
 * `/` chỉ còn một việc: cho khách chọn "Tôi cần việc" (→ `/viec-lam`) hay
 * "Tôi cần tuyển" (→ `/tuyen-dung`). Nội dung chi tiết của từng bên (lợi ích,
 * ca mới, bảng giá) nằm ở trang riêng; "Cách hoạt động" và "An toàn" đã có
 * trang `/how-it-works`, `/safety`. Hai khối màu đặc (cam / mực) theo hướng
 * "3 màu + khối màu" của F2.
 */
export default function RoleChooserPage() {
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
              href="/viec-lam"
              tone="brand"
              title={t('home.role.worker')}
              desc={t('home.chooser.worker.desc')}
              cta={t('home.chooser.worker.cta')}
            />
          </li>
          <li>
            <RoleCard
              href="/tuyen-dung"
              tone="ink"
              title={t('home.role.employer')}
              desc={t('home.chooser.employer.desc')}
              cta={t('home.chooser.employer.cta')}
            />
          </li>
        </ul>

        <p className="mt-8 text-center text-xs text-gray-500">
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
  title,
  desc,
  cta,
}: {
  href: string;
  tone: 'brand' | 'ink';
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className={[
        'motion-lift group flex h-full min-h-[220px] flex-col justify-between rounded-3xl p-7 shadow-card sm:p-8',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
        tone === 'brand' ? 'bg-orange-500 text-gray-900' : 'bg-gray-900 text-white',
      ].join(' ')}
    >
      <div>
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <p className={['mt-3 text-base leading-relaxed', tone === 'brand' ? 'text-gray-900/80' : 'text-white/80'].join(' ')}>
          {desc}
        </p>
      </div>
      <span className="cta-arrow-nudge mt-6 inline-flex items-center gap-1.5 text-base font-semibold">
        {cta} <span className="cta-arrow" aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
