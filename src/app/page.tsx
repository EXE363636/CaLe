import Link from 'next/link';
import { Reveal } from '@/components/ui';
import { FeaturedJobMockup } from '@/components/landing/FeaturedJobMockup';
import { t } from '@/i18n/vi';

// ---------------------------------------------------------------------------
// Inline icons (no external library). Each icon below maps to a specific,
// meaningful signal on the page — none are decorative filler.
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-orange-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-gray-900 shadow-md ring-4 ring-orange-50">
      {n}
    </span>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <path d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M16 11h4M16 14h4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" suppressHydrationWarning>
      <path d="m12 2 3 7 7 .5-5.5 4.5L18 21l-6-3.5L6 21l1.5-7L2 9.5 9 9z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

// Balance / scales silhouette for the dispute row — reads as fairness
// rather than legal warning.
function ScalesIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
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
// Page (Server Component — `FeaturedJobMockup` is the only client island.)
//
// Hierarchy rule: worker ALWAYS explores shifts first (→ /shifts); employer
// registers to post a shift (→ /register?role=employer). Every viewport has
// at most ONE saturated-orange primary CTA.
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="flex min-w-0 flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-decor relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto grid min-w-0 max-w-6xl items-center gap-10 sm:gap-12 lg:grid-cols-2">
          {/* Copy column */}
          <div className="min-w-0 text-center lg:text-left">
            <span
              className="entrance-up inline-flex items-center rounded-full bg-orange-100/70 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200"
              style={{ ['--entrance-delay' as string]: '0ms' } as React.CSSProperties}
            >
              {t('landing.hero.badge')}
            </span>

            {/* One unified headline for every breakpoint. */}
            <h1
              className="entrance-up mt-4 text-3xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl"
              style={{ ['--entrance-delay' as string]: '80ms' } as React.CSSProperties}
            >
              {t('landing.hero.title')}
              <span className="block text-orange-600">{t('landing.hero.titleAccent')}</span>
            </h1>

            <p
              className="entrance-up mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg lg:mx-0"
              style={{ ['--entrance-delay' as string]: '160ms' } as React.CSSProperties}
            >
              {t('landing.hero.subtitle')}
            </p>

            {/* CTAs — worker primary (→ /shifts) + employer secondary (→ register). */}
            <div
              className="entrance-up mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
              style={{ ['--entrance-delay' as string]: '240ms' } as React.CSSProperties}
            >
              <Link
                href="/shifts"
                className="motion-press inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-orange-500 px-7 text-base font-semibold text-gray-900 shadow-md transition-shadow hover:bg-orange-400 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('landing.cta.worker')}
              </Link>
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-orange-300 bg-white px-7 text-base font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('landing.cta.employer')}
              </Link>
            </div>

            {/* Honest microcopy — rendered directly under the CTAs. */}
            <p
              className="entrance-up mt-4 text-xs text-gray-500"
              style={{ ['--entrance-delay' as string]: '320ms' } as React.CSSProperties}
            >
              {t('landing.hero.trustHint')}
            </p>
          </div>

          {/* Live shift board (the sole hero visual). */}
          <div className="min-w-0 lg:pl-6">
            <FeaturedJobMockup />
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      {/* Three honest signals as a light divided row (not floating cards),
          plus a plain-language note that the money steps are simulated. */}
      <section className="border-y border-orange-100 bg-white/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <ul className="grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-orange-100">
            {[
              { icon: <CalendarIcon />, label: t('landing.trust.time'), desc: t('landing.trust.time.desc') },
              { icon: <CheckIcon />, label: t('landing.trust.confirm'), desc: t('landing.trust.confirm.desc') },
              { icon: <StarIcon />, label: t('landing.trust.reputation'), desc: t('landing.trust.reputation.desc') },
            ].map((item) => (
              <li key={item.label} className="flex min-w-0 items-start gap-3 sm:px-5 sm:first:pl-0">
                <span className="mt-0.5 shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900">{item.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
            {t('landing.trust.simNote')}
          </p>
        </div>
      </section>

      {/* ── How it works (merged worker + employer lanes) ────────────────── */}
      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-500">{t('landing.howItWorks.lead')}</p>
          </div>
          <div className="grid gap-10 md:grid-cols-2 md:gap-12">
            <Reveal>
              <div>
                <h3 className="mb-5 text-base font-semibold text-gray-900">
                  {t('landing.howItWorks.worker.title')}
                </h3>
                <ol className="timeline-rule flex flex-col gap-5 pl-0">
                  {[
                    t('landing.howItWorks.worker.step1'),
                    t('landing.howItWorks.worker.step2'),
                    t('landing.howItWorks.worker.step3'),
                  ].map((step, i) => (
                    <li key={i} className="relative flex items-start gap-3">
                      <StepNumber n={i + 1} />
                      <p className="pt-1 text-sm text-gray-700">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <Reveal delayMs={120}>
              <div>
                <h3 className="mb-5 text-base font-semibold text-gray-900">
                  {t('landing.howItWorks.employer.title')}
                </h3>
                <ol className="timeline-rule flex flex-col gap-5 pl-0">
                  {[
                    t('landing.howItWorks.employer.step1'),
                    t('landing.howItWorks.employer.step2'),
                    t('landing.howItWorks.employer.step3'),
                  ].map((step, i) => (
                    <li key={i} className="relative flex items-start gap-3">
                      <StepNumber n={i + 1} />
                      <p className="pt-1 text-sm text-gray-700">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>

          <div className="mt-10">
            <Link
              href="/how-it-works"
              className="cta-arrow-nudge inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-orange-200 bg-white px-5 text-sm font-semibold text-orange-700 shadow-sm hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {t('landing.howItWorks.viewGuide')} <span className="cta-arrow"><ArrowRightIcon /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Safety & trust (one short list) ──────────────────────────────── */}
      {/* Every row reflects the prototype honestly; the financial row is
          explicitly labelled a simulation. */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto min-w-0 max-w-3xl">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('landing.safety.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-500">{t('landing.safety.lead')}</p>
          </div>
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            {[
              { icon: <ShieldIcon />, title: t('landing.safety.confirm.title'), desc: t('landing.safety.confirm.desc') },
              { icon: <StarIcon />, title: t('landing.safety.reputation.title'), desc: t('landing.safety.reputation.desc') },
              { icon: <ScalesIcon />, title: t('landing.safety.dispute.title'), desc: t('landing.safety.dispute.desc') },
              { icon: <WalletIcon />, title: t('landing.safety.finance.title'), desc: t('landing.safety.finance.desc') },
            ].map((row) => (
              <li key={row.title} className="flex items-start gap-4 px-4 py-4 sm:px-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 ring-1 ring-orange-100">
                  {row.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{row.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{row.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Worker / Employer split ──────────────────────────────────────── */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto grid min-w-0 max-w-4xl gap-4 sm:grid-cols-2">
          {/* Worker — the primary path. */}
          <div className="flex flex-col rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">{t('landing.split.worker.title')}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-500">{t('landing.split.worker.desc')}</p>
            <Link
              href="/shifts"
              className="motion-press mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 shadow-md transition-shadow hover:bg-orange-400 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('landing.cta.worker')}
            </Link>
          </div>

          {/* Employer — the secondary path. */}
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">{t('landing.split.employer.title')}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-500">{t('landing.split.employer.desc')}</p>
            <Link
              href="/register?role=employer"
              className="motion-press mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-orange-300 bg-white px-5 text-sm font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('landing.cta.employer')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      {/* One worker primary action + an employer text link. No large orange
          mass — the section sits on the page's cream background. */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto min-w-0 max-w-2xl text-center">
          <Reveal>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('landing.finalCta.title')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-base text-gray-600">
              {t('landing.finalCta.subtitle')}
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <Link
                href="/shifts"
                className="cta-arrow-nudge motion-press inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-8 text-base font-semibold text-gray-900 shadow-md transition-shadow hover:bg-orange-400 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {t('landing.cta.worker')} <span className="cta-arrow"><ArrowRightIcon /></span>
              </Link>
              <p className="text-sm text-gray-500">
                {t('landing.finalCta.employerPrompt')}{' '}
                <Link
                  href="/register?role=employer"
                  className="rounded font-semibold text-orange-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  {t('landing.cta.employer')}
                </Link>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
