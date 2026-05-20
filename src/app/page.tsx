import Link from 'next/link';
import { t } from '@/i18n/vi';

// ---------------------------------------------------------------------------
// Icons (inline SVG — no external library)
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
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
      {n}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component — no client state needed)
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-orange-50 to-white px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-4 text-lg text-gray-600">{t('landing.hero.subtitle')}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register?role=employer"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-orange-500 px-8 text-base font-semibold text-white shadow hover:bg-orange-600 active:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 transition-colors"
            >
              {t('landing.cta.employer')}
            </Link>
            <Link
              href="/shifts"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-orange-500 bg-white px-8 text-base font-semibold text-orange-600 shadow hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 transition-colors"
            >
              {t('landing.cta.worker')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 md:grid-cols-2">

            {/* Employer benefits */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t('landing.employer.title')}</h2>
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
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                {t('landing.cta.registerEmployer')}
              </Link>
            </div>

            {/* Worker benefits */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t('landing.worker.title')}</h2>
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
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-orange-500 bg-white px-5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
              >
                {t('landing.cta.registerWorker')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            {t('landing.howItWorks.title')}
          </h2>
          <div className="grid gap-10 md:grid-cols-2">

            {/* Employer steps */}
            <div>
              <h3 className="mb-4 font-semibold text-orange-600">{t('landing.employer.title')}</h3>
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

            {/* Worker steps */}
            <div>
              <h3 className="mb-4 font-semibold text-orange-600">{t('landing.worker.title')}</h3>
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
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────────────────── */}
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Tại sao chọn CaLẻ / ShiftNow?</h2>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: '100%', label: 'Thanh toán an toàn' },
              { value: '0₫', label: 'Người làm không đặt cọc' },
              { value: '⭐', label: 'Hệ thống điểm uy tín' },
              { value: '✓', label: 'Xác minh danh tính' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-extrabold text-orange-500">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-orange-500 px-4 py-14 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-white">Bắt đầu ngay hôm nay</h2>
          <p className="mt-2 text-orange-100">Đăng ký miễn phí, không cần đặt cọc.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register?role=employer"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-orange-600 shadow hover:bg-orange-50 transition-colors"
            >
              {t('landing.cta.registerEmployer')}
            </Link>
            <Link
              href="/register?role=worker"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white bg-transparent px-8 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              {t('landing.cta.registerWorker')}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
