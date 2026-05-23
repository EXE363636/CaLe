import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * InfoPage (Phase 9R).
 *
 * Shared shell for static information / policy pages reachable from
 * the global footer (`/about`, `/safety`, `/terms`, etc.). Provides a
 * consistent eyebrow + title + intro + content slot + optional CTA
 * row so the pages look like one product, not eleven.
 *
 * Server component — these pages have no client interactivity.
 */

interface InfoPageCta {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

interface InfoPageProps {
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
  ctas?: InfoPageCta[];
}

export function InfoPage({
  eyebrow = 'CaLẻ / ShiftNow',
  title,
  intro,
  children,
  ctas,
}: InfoPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="mb-8 border-b border-orange-100 pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          {intro}
        </p>
      </header>

      <div className="prose-info flex flex-col gap-6 text-[15px] leading-relaxed text-gray-700">
        {children}
      </div>

      {ctas && ctas.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
          {ctas.map((cta) => (
            <Link
              key={cta.href}
              href={cta.href}
              className={[
                'inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 text-sm font-semibold shadow-sm transition-colors',
                cta.variant === 'secondary'
                  ? 'border border-orange-300 bg-white text-orange-700 hover:bg-orange-50'
                  : 'bg-gradient-to-b from-orange-500 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700',
              ].join(' ')}
            >
              {cta.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Convenience presentational primitives used inside info-page content
// ---------------------------------------------------------------------------

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="text-[15px] leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  );
}

export function InfoList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-orange-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
