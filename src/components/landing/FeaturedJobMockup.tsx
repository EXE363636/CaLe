'use client';

/**
 * FeaturedJobMockup — Phase 9E.
 *
 * Replaces the Phase 9D "Bản xem trước" decorative mockup with a real,
 * interactive featured-job card on the landing hero. The component reads
 * the live `useShiftStore` (via `AppHydrator`) and surfaces the first
 * currently-listable shift — same publication invariant the discovery
 * page uses (Published + Deposited + future + has positions remaining).
 *
 * Behavior:
 *   - If at least one eligible shift exists → main card links to
 *     `/shifts/[id]` for that shift, carries `aria-label` referencing the
 *     real title, has hover lift + focus ring.
 *   - If no eligible shift exists yet (e.g. AppHydrator hasn't run, all
 *     seed shifts have expired in demo time, or the user wiped
 *     localStorage) → main card links to `/shifts` and shows a tasteful
 *     "Khám phá ca làm ngay" placeholder. No fake `/shifts/[id]` route.
 *
 * The two supporting stat cards (reputation chip, sample calendar slot)
 * stay decorative and are clearly styled as "supporting stats" — they do
 * not look like clickable controls (no hover lift, no focus ring, no
 * pointer cursor). They live inside `aria-hidden` so screen readers skip
 * them. The featured job card is the one interactive surface.
 *
 * No new business logic, no new types, no new store actions. Pure read.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { useShiftStore } from '@/stores/shiftStore';
import { formatDateVN, formatVND } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Shift } from '@/types';

/** Same invariant `/shifts/page.tsx` enforces. Pure helper, no side effects. */
function isListable(s: Shift, nowMs: number): boolean {
  if (s.status !== 'Published') return false;
  if (s.escrowStatus !== 'Deposited') return false;
  if (s.positionsFilled >= s.positionsTotal) return false;
  const startMs = new Date(`${s.date}T${s.startTime}:00`).getTime();
  return startMs >= nowMs;
}

export function FeaturedJobMockup() {
  // Stable raw selector (HANDOFF.md Section 11). Filter / pick happens in
  // useMemo so we never feed Zustand a fresh-array selector.
  const shifts = useShiftStore((s) => s.shifts);

  const featured = useMemo<Shift | null>(() => {
    const now = Date.now();
    // Sort by start datetime ascending so "featured" reads as the
    // soonest upcoming opportunity — the demo-friendliest pick.
    const eligible = shifts
      .filter((s) => isListable(s, now))
      .sort((a, b) =>
        `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
      );
    return eligible[0] ?? null;
  }, [shifts]);

  // Resolve href + aria-label up-front so the JSX stays clean.
  const href = featured ? `/shifts/${featured.id}` : '/shifts';
  const ariaLabel = featured
    ? `Xem chi tiết ca ${featured.title}`
    : t('landing.hero.featured.exploreAria');

  return (
    <div
      className="entrance-right relative"
      style={{ ['--entrance-delay' as string]: '320ms' } as React.CSSProperties}
    >
      {/* Backdrop blob — gentle float for ambient warmth.
          Decorative, no input intercept. */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-orange-200/60 to-amber-100/40 blur-2xl float-soft float-soft-slow"
        aria-hidden="true"
      />

      {/* Subtle dot-grid behind the cards (CSS-only, masked). */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-dot-grid opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative grid gap-3 sm:grid-cols-2">
        {/* Featured-job pill — replaces Phase 9D "Bản xem trước". */}
        <span className="col-span-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700 shadow-sm backdrop-blur-sm">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            {/* Spark / fire glyph — reads as "đang nổi bật" */}
            <path d="M10 2c.4 0 .76.24.92.6l1.06 2.4 2.6.4a1 1 0 0 1 .56 1.7l-1.9 1.85.45 2.6a1 1 0 0 1-1.46 1.05L10 11.34l-2.23 1.26a1 1 0 0 1-1.46-1.05l.45-2.6L4.86 7.1a1 1 0 0 1 .56-1.7l2.6-.4 1.06-2.4A1 1 0 0 1 10 2Z" />
          </svg>
          {t('landing.hero.featured.badge')}
        </span>

        {/* Featured / clickable job card. Float gives it a touch of life
            but the hover lift is the primary affordance. */}
        <Link
          href={href}
          aria-label={ariaLabel}
          className="motion-lift group sm:col-span-2 rounded-2xl border border-orange-200 bg-white p-4 shadow-md ring-1 ring-orange-100 transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        >
          {featured ? (
            <FeaturedCardBody shift={featured} />
          ) : (
            <FeaturedFallbackBody />
          )}
        </Link>

        {/* Supporting stats — decorative only, marked aria-hidden. They
            live in their own group with subtle muted styling so they
            don't compete with the primary card. No hover lift, no focus
            ring, no pointer cursor. */}
        <div
          className="contents"
          aria-hidden="true"
        >
          <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {t('landing.hero.featured.repLabel')}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-500">95</p>
            <p className="mt-1 text-xs text-gray-500">
              {t('landing.hero.featured.repHint')}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {t('landing.hero.featured.upcomingLabel')}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {t('landing.hero.featured.upcomingDay')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
              <p className="text-xs text-gray-600">
                {t('landing.hero.featured.upcomingTime')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner card bodies
// ---------------------------------------------------------------------------

function FeaturedCardBody({ shift }: { shift: Shift }) {
  const remaining = Math.max(0, shift.positionsTotal - shift.positionsFilled);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-orange-700">
            {shift.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {shift.location}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
          {t('landing.hero.featured.statusBadge')}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="font-mono">
          {formatDateVN(shift.date)} • {shift.startTime}–{shift.endTime}
        </span>
        <span aria-hidden="true">•</span>
        <span className="font-semibold text-orange-600">
          {formatVND(shift.hourlyWage)}/giờ
        </span>
        <span aria-hidden="true">•</span>
        <span>
          {remaining}/{shift.positionsTotal} {t('common.positions')}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-orange-700">
          {t('landing.hero.featured.viewCta')} →
        </span>
      </div>
    </>
  );
}

function FeaturedFallbackBody() {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {t('landing.hero.featured.fallbackTitle')}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('landing.hero.featured.fallbackHint')}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
          {t('landing.hero.featured.statusBadge')}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-orange-700">
          {t('landing.hero.featured.exploreCta')} →
        </span>
      </div>
    </>
  );
}
