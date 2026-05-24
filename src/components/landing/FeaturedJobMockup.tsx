'use client';

/**
 * FeaturedJobMockup — Phase 9E (live countdown added in Phase 10A-Fix-4,
 * canonical availability helper added in Phase 10A-Fix-5).
 *
 * Replaces the Phase 9D "Bản xem trước" decorative mockup with a real,
 * interactive featured-job card on the landing hero. The component reads
 * the live `useShiftStore` + `useApplicationStore` (via `AppHydrator`)
 * and surfaces the first currently-recruiting shift via the canonical
 * `isShiftAvailableForRecruiting(shift, applications, nowMs)` helper.
 *
 * Behavior:
 *   - If at least one eligible shift exists → main card links to
 *     `/shifts/[id]` for that shift, carries `aria-label` referencing the
 *     real title, has hover lift + focus ring. A small live countdown
 *     chip ("Bắt đầu sau 2 ngày 04 giờ" / "Bắt đầu sau 03:25") sits on
 *     the card so the marketing surface feels alive.
 *   - If no eligible shift exists yet → main card links to `/shifts`
 *     and shows a tasteful "Khám phá ca làm ngay" placeholder.
 *
 * Phase 10A-Fix-5 — picker now consults the application store too, so
 * a 3/3 shift that hasn't yet had its `positionsFilled` written back
 * to the shift record can never slip through. The fallback keeps
 * working because the picker always picks `eligible[0]` — if the
 * top candidate is full it's automatically dropped from the eligible
 * list and the next one wins.
 *
 * No new business logic, no new types, no new store actions. Pure read.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { selectAvailableShiftsForRecruiting } from '@/domain/shiftAvailability';
import { formatDateVN, formatVND } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Shift } from '@/types';

/** Same invariant `/shifts/page.tsx` enforces. Pure helper, no side effects. */
// Phase 10A-Fix-5 — replaced inline `isListable` with the canonical
// `isShiftAvailableForRecruiting` from `@/domain/shiftAvailability`,
// which also reconciles `positionsFilled` against the application
// store so a stale field can't let a 3/3 shift slip through.

/**
 * Phase 10A-Fix-4 — pure countdown formatter for the featured card.
 *
 * Returns end-user Vietnamese phrasing keyed off the gap between now
 * and the shift start:
 *
 *   - >= 24h  → "Bắt đầu sau {N} ngày {HH} giờ"
 *   - >= 1h   → "Bắt đầu sau {H} giờ {MM} phút"
 *   - <  1h   → "Bắt đầu sau {MM}:{SS} phút" (no leading "0 giờ")
 *   - <= 0    → null (caller should drop the chip; the shift is no
 *                  longer eligible to be featured anyway)
 */
export function formatFeaturedCountdown(diffMs: number): string | null {
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  if (days >= 1) {
    const hh = String(hours).padStart(2, '0');
    return `Bắt đầu sau ${days} ngày ${hh} giờ`;
  }
  if (hours >= 1) {
    const mm = String(mins).padStart(2, '0');
    return `Bắt đầu sau ${hours} giờ ${mm} phút`;
  }
  // Under 1 hour — show MM:SS so the urgency reads.
  const sec = totalSec % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return `Bắt đầu sau ${mm}:${ss} phút`;
}

export function FeaturedJobMockup() {
  // Stable raw selectors (HANDOFF.md Section 11). Filter / pick happens
  // in useMemo so we never feed Zustand a fresh-array selector.
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);

  // Phase 10A-Fix-4 — SSR-safe mount gate plus a once-per-minute tick.
  // The tick lets the countdown re-render without us running a 1Hz
  // timer (which would be visually noisy and waste CPU). It also
  // re-runs the eligibility filter, so a shift that becomes full or
  // hits its start-time during the user's session falls out and the
  // next eligible shift takes over.
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const featured = useMemo<Shift | null>(() => {
    // Phase 10A-Fix-5 — canonical helper accounts for both the shift's
    // own `positionsFilled` AND live application-store occupancy. A
    // shift whose seats are filled by approved/confirmed applications
    // can no longer slip through because of a stale field.
    const eligible = selectAvailableShiftsForRecruiting(
      shifts,
      applications,
      Date.now(),
    );
    return eligible[0] ?? null;
    // `tick` deliberately included so the picker re-runs each minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, applications, tick]);

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
            <FeaturedCardBody shift={featured} mounted={mounted} />
          ) : (
            <FeaturedFallbackBody />
          )}
        </Link>

        {/* Supporting stats — decorative only, marked aria-hidden. They
            live in their own group with subtle muted styling so they
            don't compete with the primary card. No hover lift, no focus
            ring, no pointer cursor.

            Phase 9U — hidden below `sm` (mobile). Manual screenshot QA
            at 360 / 390 / 430 px showed these two cards fighting the
            featured card for breathing room and pushing the hero
            taller than the viewport. The featured card alone reads
            cleaner on mobile; the stats stay on tablet and up. */}
        <div
          className="contents"
          aria-hidden="true"
        >
          <div className="hidden rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-sm sm:block">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {t('landing.hero.featured.repLabel')}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-500">95</p>
            <p className="mt-1 text-xs text-gray-500">
              {t('landing.hero.featured.repHint')}
            </p>
          </div>

          <div className="hidden rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-sm sm:block">
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

function FeaturedCardBody({
  shift,
  mounted,
}: {
  shift: Shift;
  mounted: boolean;
}) {
  const remaining = Math.max(0, shift.positionsTotal - shift.positionsFilled);
  // Phase 10A-Fix-4 — derive countdown only on the client (mount
  // gate) so the SSR markup matches the first client paint and React
  // doesn't throw a hydration mismatch over the dynamic time string.
  const countdown = useMemo(() => {
    if (!mounted) return null;
    const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
    if (!Number.isFinite(startMs)) return null;
    return formatFeaturedCountdown(startMs - Date.now());
  }, [mounted, shift.date, shift.startTime]);
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
      {/* Phase 10A-Fix-4 — live countdown chip. Mount-gated so SSR
          and first client paint agree. */}
      {countdown && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
            <svg
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="7" />
              <path d="M10 6v4l2.5 2.5" />
            </svg>
            {countdown}
          </span>
        </div>
      )}
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
