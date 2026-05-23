import Link from 'next/link';
import { Reveal } from '@/components/ui';
import { FeaturedJobMockup } from '@/components/landing/FeaturedJobMockup';
import { t } from '@/i18n/vi';

// ---------------------------------------------------------------------------
// Inline icons (no external library)
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
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-sm">
      {n}
    </span>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M16 11h4M16 14h4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 3 7 7 .5-5.5 4.5L18 21l-6-3.5L6 21l1.5-7L2 9.5 9 9z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hero background decoration (Phase 9E)
//
// CSS-only / inline-SVG layer that sits behind the hero copy + featured
// job mockup. Three jobs:
//
//   1. Curved bottom gradient wash — the hero used to cut hard against
//      the next section. The wash softens the edge so the page reads as
//      a continuous warm surface.
//   2. Floating motif icons — phone, calendar pin, shield, location pin —
//      drift slowly behind the hero on the `.float-soft` loop. Each
//      sits at a fixed semi-random position on `lg+` and is hidden on
//      mobile so the small viewport stays clean.
//   3. All icons are aria-hidden + pointer-events-none.
//
// No external image assets, no new dependencies.
// ---------------------------------------------------------------------------

function HeroBackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
      {/* Curved bottom gradient wash — bleeds the hero into the section
          below so the boundary feels designed, not stamped. */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-orange-50/60 to-orange-100/80"
        style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}
      />

      {/* Floating motif icons — desktop only, low alpha. */}
      <div className="hidden lg:block">
        <span className="float-soft absolute left-[6%] top-[18%] text-orange-300/70">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {/* Phone glyph — represents the worker app */}
            <rect x="6" y="2" width="12" height="20" rx="3" />
            <path d="M11 18h2" />
          </svg>
        </span>

        <span className="float-soft float-soft-slow absolute left-[14%] bottom-[14%] text-amber-300/70">
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {/* Calendar */}
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </span>

        <span className="float-soft absolute right-[8%] top-[58%] text-orange-300/60">
          <svg className="h-11 w-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {/* Shield with check — escrow trust */}
            <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>

        <span className="float-soft float-soft-slow absolute right-[18%] top-[16%] text-amber-300/60">
          <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {/* Map pin — location */}
            <path d="M12 21s7-5 7-11a7 7 0 1 0-14 0c0 6 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero mockup — Phase 9D decorative preview (clearly labelled, not clickable)
//
// Phase 9E — replaced the local `HeroMockup` with the new client-island
// `FeaturedJobMockup` (`@/components/landing/FeaturedJobMockup`). The
// island reads the live `useShiftStore`, picks the soonest currently-
// listable shift, and renders an interactive "featured job" card that
// links to `/shifts/[id]` (or `/shifts` if the store is empty). The two
// supporting stat cards stay decorative inside an `aria-hidden` wrapper.
//
// The local `HeroMockup` component was removed.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Page (Server Component — `FeaturedJobMockup` is the only client island.)
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-decor relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Phase 9E — curved bottom wash + floating motif icons. CSS-only,
            inline SVG, all decorative + aria-hidden so they never trap
            input. The wash lifts the bottom edge so the hero blends into
            the next section instead of cutting hard against the gray
            page chrome. */}
        <HeroBackgroundDecor />

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          {/* Copy column */}
          <div className="text-center lg:text-left">
            <span
              className="entrance-up inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200"
              style={{ ['--entrance-delay' as string]: '0ms' } as React.CSSProperties}
            >
              <span aria-hidden="true">✨</span>
              {t('landing.hero.badge')}
            </span>
            <h1
              className="entrance-up mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
              style={{ ['--entrance-delay' as string]: '80ms' } as React.CSSProperties}
            >
              {t('landing.hero.title')}
              <span className="block bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {t('landing.hero.titleAccent')}
              </span>
            </h1>
            <p
              className="entrance-up mt-5 text-lg leading-relaxed text-gray-600"
              style={{ ['--entrance-delay' as string]: '160ms' } as React.CSSProperties}
            >
              {t('landing.hero.subtitle')}
            </p>
            <div
              className="entrance-up mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
              style={{ ['--entrance-delay' as string]: '240ms' } as React.CSSProperties}
            >
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[52px] items-center justify-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-7 text-base font-semibold text-white shadow-md transition-shadow hover:shadow-lg hover:from-orange-500 hover:to-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {t('landing.cta.employer')}
              </Link>
              <Link
                href="/shifts"
                className="motion-press inline-flex min-h-[52px] items-center justify-center rounded-xl border border-orange-300 bg-white/80 px-7 text-base font-semibold text-orange-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {t('landing.cta.worker')}
              </Link>
            </div>
            <p
              className="entrance-up mt-4 text-xs text-gray-500"
              style={{ ['--entrance-delay' as string]: '320ms' } as React.CSSProperties}
            >
              {t('landing.hero.trustHint')}
            </p>
          </div>

          {/* Mockup column — Phase 9E client island for the real
              featured job. */}
          <div className="lg:pl-6">
            <FeaturedJobMockup />
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-orange-100 bg-white/60 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <ShieldIcon />, label: t('landing.trust.escrow') },
            { icon: <WalletIcon />, label: t('landing.trust.noDeposit') },
            { icon: <StarIcon />, label: t('landing.trust.reputation') },
            { icon: <CalendarIcon />, label: t('landing.trust.schedule') },
          ].map((item, i) => (
            <Reveal key={item.label} delayMs={i * 80}>
              <div className="flex items-center gap-3 rounded-xl px-2 py-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  {item.icon}
                </span>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Employer benefits */}
            <Reveal delayMs={0}>
              <div className="motion-lift rounded-2xl border border-gray-200 bg-white p-7 shadow-sm hover:shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-lg bg-orange-100 p-2"><WalletIcon /></span>
                <h2 className="text-xl font-bold text-gray-900">{t('landing.employer.title')}</h2>
              </div>
              <p className="mb-5 text-sm text-gray-500">{t('landing.employer.lead')}</p>
              <ul className="flex flex-col gap-4">
                {[
                  { title: t('landing.employer.benefit1'), desc: t('landing.employer.benefit1.desc') },
                  { title: t('landing.employer.benefit2'), desc: t('landing.employer.benefit2.desc') },
                  { title: t('landing.employer.benefit3'), desc: t('landing.employer.benefit3.desc') },
                ].map((b) => (
                  <li key={b.title} className="flex gap-3">
                    <CheckIcon />
                    <div>
                      <p className="font-semibold text-gray-900">{b.title}</p>
                      <p className="text-sm text-gray-500">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=employer"
                className="motion-press mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
              >
                {t('landing.cta.registerEmployer')}
              </Link>
              </div>
            </Reveal>

            {/* Worker benefits */}
            <Reveal delayMs={120}>
              <div className="motion-lift rounded-2xl border border-gray-200 bg-white p-7 shadow-sm hover:shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-lg bg-orange-100 p-2"><StarIcon /></span>
                <h2 className="text-xl font-bold text-gray-900">{t('landing.worker.title')}</h2>
              </div>
              <p className="mb-5 text-sm text-gray-500">{t('landing.worker.lead')}</p>
              <ul className="flex flex-col gap-4">
                {[
                  { title: t('landing.worker.benefit1'), desc: t('landing.worker.benefit1.desc') },
                  { title: t('landing.worker.benefit2'), desc: t('landing.worker.benefit2.desc') },
                  { title: t('landing.worker.benefit3'), desc: t('landing.worker.benefit3.desc') },
                ].map((b) => (
                  <li key={b.title} className="flex gap-3">
                    <CheckIcon />
                    <div>
                      <p className="font-semibold text-gray-900">{b.title}</p>
                      <p className="text-sm text-gray-500">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=worker"
                className="motion-press mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-orange-500 bg-white px-5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
              >
                {t('landing.cta.registerWorker')}
              </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-white/60 px-4 py-16 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
              {t('landing.howItWorks.lead')}
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-2">
            {/* Employer steps */}
            <Reveal delayMs={0}>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-6">
              <h3 className="mb-4 font-semibold text-orange-700">{t('landing.employer.title')}</h3>
              <ol className="flex flex-col gap-4">
                {[
                  t('landing.howItWorks.employer.step1'),
                  t('landing.howItWorks.employer.step2'),
                  t('landing.howItWorks.employer.step3'),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <p className="pt-1 text-sm text-gray-700">{step}</p>
                  </li>
                ))}
              </ol>
              </div>
            </Reveal>

            {/* Worker steps */}
            <Reveal delayMs={120}>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-6">
              <h3 className="mb-4 font-semibold text-orange-700">{t('landing.worker.title')}</h3>
              <ol className="flex flex-col gap-4">
                {[
                  t('landing.howItWorks.worker.step1'),
                  t('landing.howItWorks.worker.step2'),
                  t('landing.howItWorks.worker.step3'),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <p className="pt-1 text-sm text-gray-700">{step}</p>
                  </li>
                ))}
              </ol>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-500 px-4 py-16 text-center sm:px-6 lg:px-8">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-2xl">
          <Reveal>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('landing.finalCta.title')}</h2>
            <p className="mt-2 text-orange-50">{t('landing.finalCta.subtitle')}</p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[52px] items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-orange-600 shadow-md hover:shadow-lg transition-shadow"
              >
                {t('landing.cta.registerEmployer')}
              </Link>
              <Link
                href="/register?role=worker"
                className="motion-press inline-flex min-h-[52px] items-center justify-center rounded-xl border-2 border-white bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 transition-colors"
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
