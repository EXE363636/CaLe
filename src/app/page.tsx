import Link from 'next/link';
import { Reveal } from '@/components/ui';
import { FeaturedJobMockup } from '@/components/landing/FeaturedJobMockup';
import { RouteBackdrop } from '@/components/layout/RouteBackdrop';
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
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md ring-4 ring-orange-50">
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

// Phase 9U — small dispute-handling glyph for the Safety section.
// Two-headed "balance / scales" silhouette so it reads as fairness
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
// Hero background decoration (Phase 9U — extends Phase 9T)
//
// One curved bottom wash + two animated gradient blobs (Phase 9T) +
// a third small ellipse anchor for richer depth on tall hero
// columns. All inside an `overflow-hidden` parent and the page-root
// `overflow-x: hidden` clamp so they can't bleed past the viewport.
// ---------------------------------------------------------------------------

function HeroBackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
      {/* Curved bottom gradient wash */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-orange-50/60 to-orange-100/80"
        style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}
      />

      {/* Phase 9T blobs — hidden below `lg`. */}
      <div
        className="float-blob absolute -right-20 top-12 hidden h-72 w-72 rounded-full bg-orange-200/40 blur-3xl lg:block"
      />
      <div
        className="float-blob float-blob-slow absolute -left-16 bottom-24 hidden h-56 w-56 rounded-full bg-amber-200/35 blur-3xl lg:block"
      />

      {/* Phase 9U — third small ellipse anchored mid-right, slower
          drift so the depth doesn't feel synchronised with the other
          two blobs. Hidden below `md` because mobile already stays
          calm via the page-root overflow clamp. */}
      <div
        className="float-blob float-blob-slow absolute right-6 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full bg-amber-100/40 blur-2xl md:block lg:hidden"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component — `FeaturedJobMockup` is the only client island.)
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="flex min-w-0 flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-decor relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        <HeroBackgroundDecor />
        {/* Phase 9Z — route-network backdrop layered behind the hero
            blobs. Establishes the Vietnam-shift-network metaphor at
            first paint. Decorative + accessible (aria-hidden on the
            wrapper) + motion-safe (pulse-node respects
            prefers-reduced-motion). */}
        <RouteBackdrop variant="hero" className="-z-0 hidden md:block" />

        <div className="relative mx-auto grid min-w-0 max-w-6xl gap-10 sm:gap-12 lg:grid-cols-2 lg:items-center">
          {/* Copy column */}
          <div className="min-w-0 text-center lg:text-left">
            <span
              className="entrance-up inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200"
              style={{ ['--entrance-delay' as string]: '0ms' } as React.CSSProperties}
            >
              <span aria-hidden="true">✨</span>
              {t('landing.hero.badge')}
            </span>

            {/* Phase 9U — mobile-specific headline.
                Below `sm` we render the punchier two-line headline so
                the H1 fits cleanly at 360 px without `text-balance`
                squeezing the line awkwardly. From `sm` up the desktop
                headline takes over. We use two separate <span>s with
                Tailwind responsive utilities rather than two H1s so
                screen readers see one heading.

                Phase 9V — Vietnamese diacritic typography fix:
                  - `leading-tight` (line-height 1.25) prevents the
                    bottom diacritic of one line from colliding with
                    the top diacritic of the next line. Tailwind's
                    `text-6xl` ships with `line-height: 1` which is
                    too tight for combining marks like "động".
                  - Desktop max size dropped from `lg:text-6xl` to
                    `lg:text-5xl` so the long accent phrase
                    ("cho người lao động linh hoạt") fits without
                    wrapping inside the `lg:grid-cols-2` copy column.
                  - `lg:max-w-xl` constrains the H1 so it can't
                    visually creep toward the mockup column. Future
                    copy edits must keep these three guards. */}
            <h1
              className="entrance-up mt-4 text-3xl font-extrabold tracking-tight leading-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl lg:max-w-xl"
              style={{ ['--entrance-delay' as string]: '80ms' } as React.CSSProperties}
            >
              <span className="sm:hidden">
                {t('landing.hero.title.mobile')}
                <span className="block bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  {t('landing.hero.titleAccent.mobile')}
                </span>
              </span>
              <span className="hidden sm:inline">
                {t('landing.hero.title')}
                <span className="block bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  {t('landing.hero.titleAccent')}
                </span>
              </span>
            </h1>

            <p
              className="entrance-up mt-5 text-base leading-relaxed text-gray-600 sm:text-lg"
              style={{ ['--entrance-delay' as string]: '160ms' } as React.CSSProperties}
            >
              <span className="sm:hidden">{t('landing.hero.subtitle.mobile')}</span>
              <span className="hidden sm:inline">{t('landing.hero.subtitle')}</span>
            </p>

            {/* CTAs — Phase 9U: primary on the left is the worker
                action ("Tìm ca làm ngay" → /shifts), secondary is the
                employer side ("Đăng ca cần tuyển" → register). On
                mobile both stack as full-width pills. */}
            <div
              className="entrance-up mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
              style={{ ['--entrance-delay' as string]: '240ms' } as React.CSSProperties}
            >
              <Link
                href="/shifts"
                className="motion-press inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-7 text-base font-semibold text-white shadow-md transition-shadow hover:shadow-lg hover:from-orange-500 hover:to-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('landing.cta.worker')}
              </Link>
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-orange-300 bg-white/80 px-7 text-base font-semibold text-orange-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('landing.cta.employer')}
              </Link>
            </div>

            {/* Trust chips — Phase 9U: tighter padding + smaller text
                at base so they fit two-up at 360 px without wrapping
                three lines. */}
            <div
              className="entrance-up mt-4 flex flex-wrap justify-center gap-2 lg:justify-start"
              style={{ ['--entrance-delay' as string]: '360ms' } as React.CSSProperties}
            >
              {[
                'Người làm không đặt cọc',
                'Nhà tuyển dụng đặt cọc tiền công',
                'Điểm uy tín minh bạch',
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-gray-700 ring-1 ring-orange-200 sm:gap-1.5 sm:px-3 sm:text-xs"
                >
                  <CheckIcon />
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup column — Phase 9U: tighter outer panel padding
              (`p-3 sm:p-6 lg:p-8`) so the inner mockup never
              competes for the last few pixels of viewport at 360 px.
              `min-w-0` propagates the page-root clamp through this
              grid column. */}
          <div className="min-w-0 lg:pl-6">
            <div className="hero-panel min-w-0 p-3 sm:p-6 lg:p-8">
              <FeaturedJobMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-orange-100 bg-white/60 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto grid min-w-0 max-w-5xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[
            { icon: <ShieldIcon />, label: t('landing.trust.escrow') },
            { icon: <WalletIcon />, label: t('landing.trust.noDeposit') },
            { icon: <StarIcon />, label: t('landing.trust.reputation') },
            { icon: <CalendarIcon />, label: t('landing.trust.schedule') },
          ].map((item, i) => (
            <Reveal key={item.label} delayMs={i * 80}>
              {/* Phase 9U — punchier surface: card-like with soft
                  shadow + ring so the four pills read as designed
                  trust signals rather than four floating bullet
                  rows. */}
              <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-orange-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 ring-1 ring-orange-100">
                  {item.icon}
                </span>
                <p className="min-w-0 text-sm font-semibold text-gray-700">{item.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Audience cards ──────────────────────────────────────────────── */}
      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            {/* Worker card — Phase 9U: amber gradient header strip,
                stronger icon block, prominent CTA. */}
            <Reveal delayMs={0}>
              <div
                className="motion-lift audience-card-wrk entrance-up-soft relative flex min-w-0 flex-col rounded-2xl border border-orange-100 p-6 shadow-sm ring-1 ring-orange-50 hover:shadow-lg sm:p-7"
                style={{ ['--entrance-delay' as string]: '40ms' } as React.CSSProperties}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  {t('landing.audience.worker.eyebrow')}
                </span>
                <div className="mt-2 mb-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 ring-1 ring-orange-200">
                    <StarIcon />
                  </span>
                  <h2 className="min-w-0 text-xl font-bold text-gray-900 sm:text-2xl">{t('landing.worker.title')}</h2>
                </div>
                <p className="mb-5 text-sm text-gray-500">{t('landing.worker.lead')}</p>
                <ul className="flex flex-1 flex-col gap-4">
                  {[
                    { title: t('landing.worker.benefit1'), desc: t('landing.worker.benefit1.desc') },
                    { title: t('landing.worker.benefit2'), desc: t('landing.worker.benefit2.desc') },
                    { title: t('landing.worker.benefit3'), desc: t('landing.worker.benefit3.desc') },
                  ].map((b) => (
                    <li key={b.title} className="flex gap-3">
                      <CheckIcon />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{b.title}</p>
                        <p className="text-sm text-gray-500">{b.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register?role=worker"
                  className="motion-press mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg border border-orange-500 bg-white px-5 text-sm font-semibold text-orange-700 shadow-sm hover:bg-orange-50 sm:w-auto"
                >
                  {t('landing.cta.registerWorker')}
                </Link>
              </div>
            </Reveal>

            {/* Employer card — Phase 9U: deeper orange gradient strip,
                solid orange CTA button to balance the worker card's
                ghost CTA. */}
            <Reveal delayMs={120}>
              <div
                className="motion-lift audience-card-emp entrance-up-soft relative flex min-w-0 flex-col rounded-2xl border border-orange-100 p-6 shadow-sm ring-1 ring-orange-50 hover:shadow-lg sm:p-7"
                style={{ ['--entrance-delay' as string]: '160ms' } as React.CSSProperties}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                  {t('landing.audience.employer.eyebrow')}
                </span>
                <div className="mt-2 mb-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 ring-1 ring-orange-300">
                    <WalletIcon />
                  </span>
                  <h2 className="min-w-0 text-xl font-bold text-gray-900 sm:text-2xl">{t('landing.employer.title')}</h2>
                </div>
                <p className="mb-5 text-sm text-gray-500">{t('landing.employer.lead')}</p>
                <ul className="flex flex-1 flex-col gap-4">
                  {[
                    { title: t('landing.employer.benefit1'), desc: t('landing.employer.benefit1.desc') },
                    { title: t('landing.employer.benefit2'), desc: t('landing.employer.benefit2.desc') },
                    { title: t('landing.employer.benefit3'), desc: t('landing.employer.benefit3.desc') },
                  ].map((b) => (
                    <li key={b.title} className="flex gap-3">
                      <CheckIcon />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{b.title}</p>
                        <p className="text-sm text-gray-500">{b.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register?role=employer"
                  className="motion-press mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg sm:w-auto"
                >
                  {t('landing.cta.registerEmployer')}
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Designed for Vietnam shift work — Phase 9Z ──────────────────── */}
      {/* Network-of-cities strip. Pure illustration, NOT live coverage
          data — copy reads "thiết kế cho nhu cầu ca làm linh hoạt
          tại Việt Nam" so the MVP doesn't overclaim reach. Cities
          were chosen as the five most-populated Vietnamese metros
          where short-term shift work is most common; visual only. */}
      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="section-shell relative overflow-hidden p-6 sm:p-10">
            <RouteBackdrop variant="page" />
            <div className="relative">
              <div className="mb-8 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                  {t('landing.vn.eyebrow')}
                </span>
                <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                  {t('landing.vn.title')}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
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
                  <Reveal key={city.name} delayMs={i * 60}>
                    <div className="card-lift flex h-full flex-col items-start gap-1 rounded-xl border border-orange-100 bg-white/80 p-4 shadow-sm">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 ring-1 ring-orange-200">
                          <svg className="h-3.5 w-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" suppressHydrationWarning>
                            <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
                            <circle cx="12" cy="9" r="2.5" />
                          </svg>
                        </span>
                        {city.name}
                      </span>
                      <span className="text-[11px] text-gray-500">{city.sub}</span>
                    </div>
                  </Reveal>
                ))}
              </div>

              <p className="mt-6 text-center text-[11px] text-gray-500">
                {t('landing.vn.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="section-wave relative bg-white/60 px-4 py-14 backdrop-blur-sm sm:px-6 sm:py-16 lg:px-8">
        {/* Phase 9U — paper texture behind the timeline so it doesn't
            read as plain white. Decorative, behind content. */}
        <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto min-w-0 max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              {t('landing.howItWorks.eyebrow')}
            </span>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
              {t('landing.howItWorks.lead')}
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            {/* Employer steps — timeline rule down the left edge. */}
            <Reveal delayMs={0}>
              <div
                className="entrance-up-soft rounded-2xl border border-orange-100 bg-orange-50/40 p-6"
                style={{ ['--entrance-delay' as string]: '0ms' } as React.CSSProperties}
              >
                <h3 className="mb-5 font-semibold text-orange-700">{t('landing.employer.title')}</h3>
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

            {/* Worker steps */}
            <Reveal delayMs={120}>
              <div
                className="entrance-up-soft rounded-2xl border border-orange-100 bg-orange-50/40 p-6"
                style={{ ['--entrance-delay' as string]: '120ms' } as React.CSSProperties}
              >
                <h3 className="mb-5 font-semibold text-orange-700">{t('landing.worker.title')}</h3>
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
          </div>

          {/* Phase 9Y — link into the long-form public guide. The "Cách
              hoạt động" section above gives the 3-step skeleton; the
              guide page (/user-guide) carries the full 9-step worker
              + 9-step employer timeline plus an FAQ. */}
          <div className="mt-10 flex justify-center">
            <Link
              href="/user-guide"
              // Phase 9Z-Fix-3: `.cta-arrow-nudge` triggers a small
              // 4 px right-shift of the inner arrow on hover/focus.
              // The arrow is wrapped in `<span class="cta-arrow">`.
              className="cta-arrow-nudge inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-5 text-sm font-semibold text-orange-700 shadow-sm hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {t('landing.howItWorks.viewGuide')} <span className="cta-arrow"><ArrowRightIcon /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Safety section (NEW Phase 9U) ───────────────────────────────── */}
      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto min-w-0 max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              {t('landing.safety.eyebrow')}
            </span>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('landing.safety.title')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
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
              },
              {
                icon: <WalletIcon />,
                title: t('landing.safety.deposit.title'),
                desc: t('landing.safety.deposit.desc'),
                cta: t('landing.safety.deposit.cta'),
                href: '/employer/payments',
              },
              {
                icon: <StarIcon />,
                title: t('landing.safety.reputation.title'),
                desc: t('landing.safety.reputation.desc'),
                cta: t('landing.safety.reputation.cta'),
                href: '/worker/reputation-guide',
              },
              {
                icon: <ScalesIcon />,
                title: t('landing.safety.dispute.title'),
                desc: t('landing.safety.dispute.desc'),
                cta: t('landing.safety.dispute.cta'),
                href: '/disputes',
              },
            ].map((card, i) => (
              <Reveal key={card.title} delayMs={i * 80}>
                <Link
                  href={card.href}
                  className="cta-arrow-nudge motion-lift entrance-up-soft group flex min-w-0 flex-col rounded-2xl border border-orange-100 bg-white p-5 shadow-sm ring-1 ring-orange-50 transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  style={{ ['--entrance-delay' as string]: `${i * 80}ms` } as React.CSSProperties}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 ring-1 ring-orange-100">
                    {card.icon}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-gray-900 group-hover:text-orange-700">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {card.desc}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-orange-700">
                    {card.cta} <span className="cta-arrow"><ArrowRightIcon /></span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA band ──────────────────────────────────────────────── */}
      <section className="cta-band relative overflow-hidden px-4 py-14 text-center sm:px-6 sm:py-16 lg:px-8">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto min-w-0 max-w-2xl">
          <Reveal>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('landing.finalCta.title')}</h2>
            <p className="mt-2 text-orange-50">{t('landing.finalCta.subtitle')}</p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register?role=employer"
                className="motion-press inline-flex min-h-[52px] items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-orange-600 shadow-lg hover:shadow-xl transition-shadow"
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
