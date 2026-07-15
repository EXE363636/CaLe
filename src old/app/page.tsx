import Link from 'next/link';
import { Reveal } from '@/components/ui';
import { FeaturedJobMockup } from '@/components/landing/FeaturedJobMockup';
import { LandingRoleExperience } from '@/components/landing/LandingRoleExperience';
import { IndustryFocus } from '@/components/landing/IndustryFocus';
import { RouteBackdrop } from '@/components/layout/RouteBackdrop';
import { t } from '@/i18n/vi';

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg className="h-4.5 w-4.5 shrink-0 text-orange-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <path d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M16 11h4M16 14h4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" suppressHydrationWarning>
      <path d="m12 2 3 7 7 .5-5.5 4.5L18 21l-6-3.5L6 21l1.5-7L2 9.5 9 9z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ScalesIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <path d="M12 4v16M5 8h14" />
      <path d="M5 8 2 16h6L5 8ZM19 8l-3 8h6l-3-8Z" />
      <path d="M8 21h8" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hero background decoration — richer depth with three animated blobs
// ---------------------------------------------------------------------------

function HeroBackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
      {/* Curved bottom gradient wash */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-orange-50/50 to-orange-100/70"
        style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}
      />

      {/* Primary orange blob — top right */}
      <div
        className="float-blob absolute -right-16 -top-8 hidden h-80 w-80 rounded-full bg-orange-200/50 blur-3xl lg:block"
      />
      {/* Secondary amber blob — bottom left */}
      <div
        className="float-blob float-blob-slow absolute -left-20 bottom-20 hidden h-64 w-64 rounded-full bg-amber-200/40 blur-3xl lg:block"
      />
      {/* Tertiary small blob — center right */}
      <div
        className="float-blob float-blob-slow absolute right-8 top-1/3 hidden h-48 w-48 -translate-y-1/2 rounded-full bg-orange-100/50 blur-2xl md:block lg:hidden"
      />
      {/* Subtle grid texture overlay */}
      <div
        className="absolute inset-0 bg-dot-grid opacity-40"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust stat items with gradient icon containers
// ---------------------------------------------------------------------------

interface TrustItem {
  icon: React.ReactNode;
  label: string;
  iconGradient: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: <ShieldIcon />,
    label: 'Thanh toán được đảm bảo qua ký quỹ',
    iconGradient: 'from-orange-400 to-orange-600',
  },
  {
    icon: <WalletIcon />,
    label: 'Người lao động không phải trả trước',
    iconGradient: 'from-amber-400 to-orange-500',
  },
  {
    icon: <StarIcon />,
    label: 'Điểm uy tín minh bạch',
    iconGradient: 'from-yellow-400 to-amber-500',
  },
  {
    icon: <CalendarIcon />,
    label: 'Chọn ca linh hoạt theo lịch rảnh',
    iconGradient: 'from-orange-500 to-rose-500',
  },
];

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="flex min-w-0 flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-decor relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <HeroBackgroundDecor />
        <RouteBackdrop variant="hero" className="-z-0 hidden md:block" />

        <div className="relative mx-auto grid min-w-0 max-w-6xl gap-12 sm:gap-14 lg:grid-cols-2 lg:items-center">
          {/* Copy column */}
          <div className="min-w-0 text-center lg:text-left">
            {/* Badge */}
            <span
              className="entrance-up inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-orange-300/40"
              style={{
                ['--entrance-delay' as string]: '0ms',
                background: 'rgba(249, 115, 22, 0.10)',
                color: 'var(--brand)',
              } as React.CSSProperties}
            >
              <span aria-hidden="true" className="text-sm">✨</span>
              {t('landing.hero.badge')}
            </span>

            {/* Headline */}
            <h1
              className="entrance-up mt-5 text-4xl font-extrabold tracking-tight leading-tight text-balance lg:text-5xl xl:text-6xl lg:max-w-xl"
              style={{ ['--entrance-delay' as string]: '80ms', color: 'var(--foreground)' } as React.CSSProperties}
            >
              <span className="sm:hidden">
                {t('landing.hero.title.mobile')}
                <span
                  className="block gradient-text"
                >
                  {t('landing.hero.titleAccent.mobile')}
                </span>
              </span>
              <span className="hidden sm:inline">
                {t('landing.hero.title')}
                <span
                  className="block gradient-text"
                >
                  {t('landing.hero.titleAccent')}
                </span>
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="entrance-up mt-5 text-base leading-relaxed sm:text-lg"
              style={{ ['--entrance-delay' as string]: '160ms', color: 'var(--muted)' } as React.CSSProperties}
            >
              <span className="sm:hidden">{t('landing.hero.subtitle.mobile')}</span>
              <span className="hidden sm:inline">{t('landing.hero.subtitle')}</span>
            </p>

            {/* CTAs */}
            <div
              className="entrance-up mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
              style={{ ['--entrance-delay' as string]: '240ms' } as React.CSSProperties}
            >
              <Link
                href="/shifts"
                className="motion-press group relative inline-flex min-h-[52px] w-full items-center justify-center overflow-hidden rounded-xl px-7 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto"
                style={{
                  background: 'linear-gradient(135deg, #ea580c 0%, #f97316 40%, #fb923c 100%)',
                  boxShadow: '0 8px 32px rgba(249, 115, 22, 0.35), 0 2px 8px rgba(249, 115, 22, 0.2)',
                }}
              >
                {/* Shimmer overlay */}
                <span className="shimmer pointer-events-none absolute inset-0 rounded-xl" aria-hidden="true" />
                {t('landing.cta.worker')}
              </Link>
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border-2 px-7 text-base font-bold transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto"
                style={{
                  borderColor: 'rgba(249, 115, 22, 0.35)',
                  color: 'var(--brand)',
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {t('landing.cta.employer')}
              </Link>
            </div>

            {/* Trust chips */}
            <div
              className="entrance-up mt-5 flex flex-wrap justify-center gap-2 lg:justify-start"
              style={{ ['--entrance-delay' as string]: '360ms' } as React.CSSProperties}
            >
              {[
                'Người lao động không phải trả trước',
                'Nhà tuyển dụng đảm bảo thanh toán tiền công',
                'Điểm uy tín minh bạch',
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ring-1 ring-orange-200/50 sm:gap-1.5 sm:text-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    color: 'var(--foreground)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <CheckIcon />
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup column */}
          <div className="min-w-0 lg:pl-4">
            <div className="hero-panel min-w-0 p-3 sm:p-6 lg:p-8">
              <FeaturedJobMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section
        className="relative px-4 py-8 sm:px-6 lg:px-8"
        style={{
          borderTop: '1px solid rgba(249, 115, 22, 0.08)',
          borderBottom: '1px solid rgba(249, 115, 22, 0.08)',
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="mx-auto grid min-w-0 max-w-5xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {TRUST_ITEMS.map((item, i) => (
            <Reveal key={item.label} delayMs={i * 80}>
              <div
                className="flex min-w-0 items-center gap-3 rounded-2xl p-3.5 ring-1 ring-orange-200/50 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: 'var(--shadow-sm)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.iconGradient} text-white shadow-md`}
                  style={{ boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)' }}
                >
                  {item.icon}
                </span>
                <p className="min-w-0 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{item.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Role-aware experience ─────────────────────────────────────────── */}
      <LandingRoleExperience />

      {/* ── Vietnam cities ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="section-shell relative overflow-hidden p-6 sm:p-10">
            <RouteBackdrop variant="page" />
            <div className="relative">
              <div className="mb-10 text-center">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--brand)' }}
                >
                  {t('landing.vn.eyebrow')}
                </span>
                <h2
                  className="mt-2 text-2xl font-bold sm:text-3xl"
                  style={{ color: 'var(--foreground)' }}
                >
                  {t('landing.vn.title')}
                </h2>
                <p
                  className="mx-auto mt-2 max-w-xl text-sm"
                  style={{ color: 'var(--muted)' }}
                >
                  {t('landing.vn.lead')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { name: 'Hà Nội', sub: 'Thủ đô' },
                  { name: 'TP.HCM', sub: 'Trung tâm phía Nam' },
                  { name: 'Đà Nẵng', sub: 'Miền Trung' },
                  { name: 'Cần Thơ', sub: 'ĐB Sông Cửu Long' },
                  { name: 'Hải Phòng', sub: 'Cảng biển phía Bắc' },
                ].map((city, i) => (
                  <Reveal key={city.name} delayMs={i * 70}>
                    <div
                      className="card-lift flex h-full flex-col items-start gap-1.5 rounded-2xl p-4 ring-1 ring-orange-100/40 transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        boxShadow: 'var(--shadow-sm)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        <span
                          aria-hidden="true"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-1"
                          style={{
                            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(245, 158, 11, 0.08))',
                            outline: '1px solid rgba(249, 115, 22, 0.2)',
                          }}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning style={{ color: 'var(--brand)' }}>
                            <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
                            <circle cx="12" cy="9" r="2.5" />
                          </svg>
                        </span>
                        {city.name}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{city.sub}</span>
                    </div>
                  </Reveal>
                ))}
              </div>

              <p className="mt-6 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
                {t('landing.vn.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Industry focus ───────────────────────────────────────────────── */}
      <IndustryFocus />

      {/* ── Safety section ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="mb-12 text-center">
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--brand)' }}
            >
              {t('landing.safety.eyebrow')}
            </span>
            <h2
              className="mt-2 text-2xl font-bold sm:text-3xl"
              style={{ color: 'var(--foreground)' }}
            >
              {t('landing.safety.title')}
            </h2>
            <p
              className="mx-auto mt-2 max-w-xl text-sm"
              style={{ color: 'var(--muted)' }}
            >
              {t('landing.safety.lead')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {[
              {
                icon: <ShieldIcon />,
                title: t('landing.safety.verify.title'),
                desc: t('landing.safety.verify.desc'),
                cta: t('landing.safety.verify.cta'),
                href: '/safety',
                gradient: 'from-orange-400 to-orange-600',
              },
              {
                icon: <WalletIcon />,
                title: t('landing.safety.deposit.title'),
                desc: t('landing.safety.deposit.desc'),
                cta: t('landing.safety.deposit.cta'),
                href: '/employer/payments',
                gradient: 'from-amber-400 to-orange-500',
              },
              {
                icon: <StarIcon />,
                title: t('landing.safety.reputation.title'),
                desc: t('landing.safety.reputation.desc'),
                cta: t('landing.safety.reputation.cta'),
                href: '/worker/reputation-guide',
                gradient: 'from-yellow-400 to-amber-500',
              },
              {
                icon: <ScalesIcon />,
                title: t('landing.safety.dispute.title'),
                desc: t('landing.safety.dispute.desc'),
                cta: t('landing.safety.dispute.cta'),
                href: '/disputes',
                gradient: 'from-orange-500 to-rose-500',
              },
            ].map((card, i) => (
              <Reveal key={card.title} delayMs={i * 80}>
                <Link
                  href={card.href}
                  className="cta-arrow-nudge card-lift group flex min-w-0 flex-col rounded-2xl p-5 ring-1 ring-orange-100/80 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: 'var(--shadow-sm)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white`}
                    style={{ boxShadow: '0 4px 14px rgba(249, 115, 22, 0.28)' }}
                  >
                    {card.icon}
                  </span>
                  <h3
                    className="mt-4 text-base font-bold transition-colors duration-150 group-hover:text-orange-600"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="mt-1.5 flex-1 text-sm leading-relaxed"
                    style={{ color: 'var(--muted)' }}
                  >
                    {card.desc}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: 'var(--brand)' }}
                  >
                    {card.cta} <span className="cta-arrow"><ArrowRightIcon /></span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA band ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
        {/* Animated mesh background */}
        <div
          className="gradient-drift absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #b45309 0%, #c2410c 20%, #ea580c 40%, #f97316 60%, #fb923c 80%, #f59e0b 100%)',
          }}
          aria-hidden="true"
        />
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="float-blob absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="float-blob float-blob-slow absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="absolute inset-0 bg-dot-grid opacity-15" />
        </div>

        {/* Top wave */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-10"
          style={{
            background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(248, 250, 252, 0.8) 0%, transparent 70%)',
            borderBottomLeftRadius: '50% 100%',
            borderBottomRightRadius: '50% 100%',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto min-w-0 max-w-2xl">
          <Reveal>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl drop-shadow-sm">
              {t('landing.finalCta.title')}
            </h2>
            <p className="mt-3 text-lg text-orange-100">{t('landing.finalCta.subtitle')}</p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[56px] items-center justify-center rounded-xl bg-white px-8 text-base font-bold text-orange-600 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
              >
                {t('landing.cta.registerEmployer')}
              </Link>
              <Link
                href="/register?role=worker"
                className="motion-press inline-flex min-h-[56px] items-center justify-center rounded-xl border-2 border-white/80 bg-white/10 px-8 text-base font-bold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
              >
                {t('landing.cta.registerWorker')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
