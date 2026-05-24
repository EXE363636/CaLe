import type { ReactNode } from 'react';
import Link from 'next/link';
import { RouteBackdrop } from './RouteBackdrop';

/**
 * InfoPage (Phase 9R, polished in Phase 9Z).
 *
 * Shared shell for static information / policy pages reachable from
 * the global footer (`/about`, `/safety`, `/terms`, etc.). Provides a
 * consistent eyebrow + title + intro + content slot + optional CTA
 * row so the pages look like one product, not eleven.
 *
 * Phase 9Z visual upgrade:
 *   - Header now sits inside an `.info-page-hero` strip — soft warm
 *     gradient + inset orange ring + a low-opacity `<RouteBackdrop
 *     variant="page" />` decoratively layered behind the eyebrow /
 *     title / intro. Replaces the previous flat orange underline,
 *     gives the shell brand identity continuity with the homepage.
 *   - The strip is decorative only; backdrop is `aria-hidden`.
 *   - Reduced-motion users still see the strip — only the pulse
 *     animation on the backdrop's nodes is short-circuited (handled
 *     by the existing `prefers-reduced-motion` media query in
 *     `globals.css`).
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
  eyebrow = 'CaLẻ / Now',
  title,
  intro,
  children,
  ctas,
}: InfoPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="info-page-hero relative mb-8 overflow-hidden">
        <RouteBackdrop variant="page" className="opacity-70" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            {intro}
          </p>
        </div>
      </header>

      <div className="info-content text-[15px] leading-relaxed text-gray-700">
        {children}
      </div>

      {ctas && ctas.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
          {ctas.map((cta) => (
            <Link
              key={cta.href}
              href={cta.href}
              className={[
                // Phase 9Z-Fix-3: `.cta-arrow-nudge` shifts the inner
                // `<span class="cta-arrow">` 4 px right on hover/focus.
                'cta-arrow-nudge inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold shadow-sm transition-colors',
                cta.variant === 'secondary'
                  ? 'border border-orange-300 bg-white text-orange-700 hover:bg-orange-50'
                  : 'bg-gradient-to-b from-orange-500 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700',
              ].join(' ')}
            >
              {cta.label}
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
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
  // Phase 9Z-Fix-2: wrapped in `.info-section-card` (subtle orange
  // left rail + tightened rhythm) so consecutive sections feel like
  // one connected reading surface, not a stack of plain paragraphs.
  // The heading style is owned by the CSS rule on `.info-section-card
  // > h2` so callers don't have to remember Tailwind classes.
  return (
    <section className="info-section-card">
      <h2>{title}</h2>
      <div className="text-[15px] leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  );
}

/**
 * InfoStep — Phase 9Z-Fix-2.
 *
 * Numbered step block for step-based guidance pages
 * (`/how-it-works`, `/worker/cancellation-policy`,
 * `/employer/payments`). Renders as a white card with a soft orange
 * ring and a left-side badge gutter so each step reads as its own
 * designed block, not raw prose floating after the hero.
 *
 * Caller passes `n` (the step number) and `title`. Children are the
 * step body. The card markup + badge are owned by `.info-step-card`
 * + `.info-step-badge` in `globals.css`.
 */
export function InfoStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="info-step-card">
      <span className="info-step-badge" aria-hidden="true">
        {n}
      </span>
      <h3>{title}</h3>
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
