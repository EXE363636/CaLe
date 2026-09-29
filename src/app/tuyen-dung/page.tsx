import Link from 'next/link';
import { RoleSwitch } from '@/components/landing/RoleSwitch';
import { t } from '@/i18n/vi';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang cho nhà tuyển dụng — P1 feedback F4. Tối đa 4 khối:
 *   1. Hero: 1 câu + CTA đăng ký để đăng ca.
 *   2. 3 lợi ích (nói đúng luồng tiền: production = tiền thật qua ví/PayOS,
 *      local/demo = mô phỏng — CLAUDE.md §5).
 *   3. Bảng giá rút gọn (chi tiết ở /pricing).
 *   4. Khối mực: CTA đăng ca + chuyển sang trang người lao động.
 * Không hiện "quán đang dùng" cho tới khi có khách thật đồng ý (không bịa).
 */
export default function EmployerHomePage() {
  const supabase = isSupabaseEnv();
  const benefits = [
    { icon: <CheckIcon />, title: t('employerHome.benefit.attendance.title'), desc: t('employerHome.benefit.attendance.desc') },
    {
      icon: <CoinIcon />,
      title: t('employerHome.benefit.payWorked.title'),
      desc: t(supabase ? 'employerHome.benefit.payWorked.desc' : 'employerHome.benefit.payWorked.desc.demo'),
    },
    {
      icon: <RefundIcon />,
      title: t('employerHome.benefit.refund.title'),
      desc: t(supabase ? 'employerHome.benefit.refund.desc' : 'employerHome.benefit.refund.desc.demo'),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col">
      {/* 1. Hero — nền kem */}
      <section className="hero-decor relative px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <RoleSwitch active="employer" />
          <div className="mt-10 text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl">
              {t('employerHome.hero.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
              {t('employerHome.hero.lead')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/register?role=employer"
                className="cta-arrow-nudge motion-press inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-8 text-base font-semibold text-gray-900 shadow-md hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {t('employerHome.hero.cta')} <span className="cta-arrow" aria-hidden="true">→</span>
              </Link>
              <p className="text-sm text-gray-600">
                {t('employerHome.hero.haveAccount')}{' '}
                <Link href="/login" className="font-semibold text-orange-700 hover:underline">
                  {t('nav.login')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 3 lợi ích — nền trắng */}
      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="employer-benefits">
        <div className="mx-auto max-w-6xl">
          <h2 id="employer-benefits" className="sr-only">{t('employerHome.benefits.title')}</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.title} className="rounded-3xl bg-orange-50 p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                  {b.icon}
                </span>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{b.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Bảng giá rút gọn — nền kem */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="employer-pricing">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-center shadow-card sm:p-10">
          <h2 id="employer-pricing" className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            {t('employerHome.pricing.title')}
          </h2>
          <p className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            {supabase ? '10%' : '0đ'}
          </p>
          <p className="mt-2 text-base text-gray-600">
            {t(supabase ? 'employerHome.pricing.unit' : 'employerHome.pricing.unit.demo')}
          </p>
          <p className="mx-auto mt-5 max-w-md rounded-xl bg-orange-50 px-4 py-3 text-sm text-gray-700">
            {t(supabase ? 'employerHome.pricing.example' : 'employerHome.pricing.example.demo')}
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {t('employerHome.pricing.more')} →
          </Link>
        </div>
      </section>

      {/* 4. Khối mực — CTA + chuyển vai trò */}
      <section className="bg-gray-900 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold">{t('employerHome.final.text')}</p>
            <p className="mt-1 text-sm text-white/70">
              {t('employerHome.switch.text')}{' '}
              <Link href="/viec-lam" className="font-semibold text-white underline-offset-2 hover:underline">
                {t('employerHome.switch.cta')}
              </Link>
            </p>
          </div>
          <Link
            href="/register?role=employer"
            className="cta-arrow-nudge inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {t('employerHome.hero.cta')} <span className="cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function CoinIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15 9.5c0-1.4-1.3-2-3-2s-3 .8-3 2 1.3 1.8 3 2.2 3 1 3 2.3-1.3 2-3 2-3-.7-3-2" />
    </svg>
  );
}
function RefundIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
