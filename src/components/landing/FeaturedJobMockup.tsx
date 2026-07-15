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
import { useCurrentUser } from '@/stores/authStore';
import { getWorkerReputation } from '@/stores/userStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { selectAvailableShiftsForRecruiting, effectiveFilledCount } from '@/domain/shiftAvailability';
import { formatDateVN, formatTimeVN, formatVND } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Application, Shift } from '@/types';

/**
 * Application statuses that keep a worker attached to an upcoming shift —
 * the exact set the worker dashboard (`src/app/worker/dashboard/page.tsx`)
 * uses to build its "Ca sắp tới" list. Shared here so the landing-hero
 * preview derives the same soonest-upcoming shift the dashboard would.
 */
const ACTIVE_UPCOMING_STATUSES = [
  'Approved',
  'CancellationRequested',
  'CheckedIn',
  'CheckedOut',
];

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR-safe mount gate so the live countdown only renders client-side (avoids hydration mismatch)
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
      // eslint-disable-next-line react-hooks/purity -- intentional real-time recruiting filter; re-sampled each minute via the `tick` dep so a shift that hits its start-time falls out
      Date.now(),
    );
    return eligible[0] ?? null;
    // `tick` deliberately included so the picker re-runs each minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, applications, tick]);

  // ---------------------------------------------------------------------
  // Cluster 2 · BUG 2 (Req 2.2, preserve 3.3) — supporting-stat previews
  // derived from the CURRENT user + role instead of hard-coded literals.
  //
  // `hydrated` gates the previews so the SSR markup and the first client
  // paint agree: the auth/user/shift/application stores are only populated
  // after `AppHydrator` runs its effect, so before that we render neither
  // tile (matching the server output) and let them appear once the stores
  // are ready.
  // ---------------------------------------------------------------------
  const currentUser = useCurrentUser();
  const hydrated = useHydrationStore((s) => s.hydrated);

  // Reputation preview: shown ONLY for a logged-in worker, sourced from the
  // single shared reader so it matches every other reputation surface
  // (dashboard StatTile, UserMenu chip, employer badges). `null` ⇒ no tile,
  // which is the correct result for a logged-out visitor or an employer.
  const reputationScore =
    currentUser && currentUser.role === 'worker'
      ? getWorkerReputation(currentUser.id)
      : null;

  // Stable "today" (YYYY-MM-DD) captured once per mount via a lazy
  // initializer so it is not an impure clock read during render
  // (react-hooks/purity), mirroring the worker dashboard's `nowMs`.
  const [todayStr] = useState(() => new Date().toISOString().slice(0, 10));

  // Upcoming preview: the current user's soonest real upcoming shift,
  // derived exactly like the worker dashboard — an active application on a
  // non-cancelled shift dated today-or-later, soonest first. Only a worker
  // has applications under their id, so this is naturally empty for an
  // employer / logged-out visitor ⇒ no upcoming card is shown.
  const upcomingShift = useMemo<Shift | null>(() => {
    if (!currentUser) return null;
    const byId = new Map(shifts.map((s) => [s.id, s]));
    const mine = applications
      .filter(
        (a) =>
          a.workerId === currentUser.id &&
          ACTIVE_UPCOMING_STATUSES.includes(a.status),
      )
      .map((a) => byId.get(a.shiftId))
      .filter(
        (s): s is Shift =>
          s !== undefined && s.status !== 'Cancelled' && s.date >= todayStr,
      )
      .sort((a, b) =>
        `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
      );
    return mine[0] ?? null;
  }, [currentUser, applications, shifts, todayStr]);

  // Resolve href + aria-label up-front so the JSX stays clean.
  const href = featured ? `/shifts/${featured.id}` : '/shifts';
  const ariaLabel = featured
    ? `Xem chi tiết ca ${featured.title}`
    : t('landing.hero.featured.exploreAria');

  return (
    <div
      className="entrance-right"
      style={{ ['--entrance-delay' as string]: '320ms' } as React.CSSProperties}
    >
      {/* Dispatch board — a single designed surface. Header + one featured
          shift row + (worker-only) secondary stat rows + a footer note so
          the board stays balanced even for a logged-out visitor. */}
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-lg ring-1 ring-orange-100/60">
        {/* Board header */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-orange-50/50 px-4 py-3 sm:px-5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-900">
            {t('landing.hero.featured.badge')}
          </span>
        </div>

        {/* Featured shift row — clickable, links to the real shift (or the
            full list when nothing is featured yet). */}
        <Link
          href={href}
          aria-label={ariaLabel}
          className="group block px-4 py-4 transition-colors hover:bg-orange-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 sm:px-5"
        >
          {featured ? (
            <FeaturedCardBody
              shift={featured}
              applications={applications}
              mounted={mounted}
            />
          ) : (
            <FeaturedFallbackBody />
          )}
        </Link>

        {/* Secondary stats — DERIVED from the current user + role (Cluster 2 ·
            BUG 2, Req 2.2), never hard-coded. Same derivation + gating as
            before; presentation is now a quiet board row instead of a
            big-number tile. A logged-out visitor / an employer sees neither. */}
        {hydrated && reputationScore !== null && (
          <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">
                {t('landing.hero.featured.repLabel')}
              </p>
              <p className="text-lg font-bold text-gray-900">{reputationScore}</p>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {t('landing.hero.featured.repHint')}
            </p>
          </div>
        )}

        {hydrated && upcomingShift && (
          <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">
                {t('landing.hero.featured.upcomingLabel')}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {formatTimeVN(upcomingShift.startTime)}–{formatTimeVN(upcomingShift.endTime)}
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {formatDateVN(upcomingShift.date)}
            </p>
          </div>
        )}

        {/* Board footer — a plain, honest legend that keeps the board
            visually balanced regardless of who is viewing. */}
        <div className="border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-500 sm:px-5">
          {t('landing.hero.featured.boardNote')}
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
  applications,
  mounted,
}: {
  shift: Shift;
  applications: Application[];
  mounted: boolean;
}) {
  // Phase 10A-Fix-6 — slot label now uses the canonical effective
  // occupancy and reads as "Còn X/Y vị trí" instead of the ambiguous
  // "{filled}/{total} người". `effectiveFilledCount` reconciles a
  // stale `positionsFilled` field against the live application store.
  const filled = effectiveFilledCount(shift, applications);
  const available = Math.max(0, shift.positionsTotal - filled);
  // Phase 10A-Fix-4 — derive countdown only on the client (mount
  // gate) so the SSR markup matches the first client paint and React
  // doesn't throw a hydration mismatch over the dynamic time string.
  const countdown = useMemo(() => {
    if (!mounted) return null;
    const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
    if (!Number.isFinite(startMs)) return null;
    // eslint-disable-next-line react-hooks/purity -- intentional live countdown to shift start; gated behind `mounted` and re-sampled via parent `tick`
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
      {/* Columnar shift data: thời gian · tiền công · chỗ trống. */}
      <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="min-w-0">
          <dt className="text-[11px] text-gray-400">Thời gian</dt>
          <dd className="mt-0.5 font-medium text-gray-900">{formatDateVN(shift.date)}</dd>
          <dd className="text-gray-600">
            {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-gray-400">Tiền công</dt>
          <dd className="mt-0.5 font-semibold text-orange-700">
            {formatVND(shift.hourlyWage)}
          </dd>
          <dd className="text-gray-600">mỗi giờ</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-gray-400">Chỗ trống</dt>
          <dd className="mt-0.5 font-medium text-gray-900">
            {available}/{shift.positionsTotal}
          </dd>
          <dd className="text-gray-600">vị trí</dd>
        </div>
      </dl>

      {/* Bottom row: view CTA + live countdown chip (Phase 10A-Fix-4,
          mount-gated so SSR and the first client paint agree). */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-orange-700">
          {t('landing.hero.featured.viewCta')} <span aria-hidden="true">→</span>
        </span>
        {countdown && (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
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
        )}
      </div>
    </>
  );
}

function FeaturedFallbackBody() {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-700">
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
      <p className="mt-3 text-xs font-semibold text-orange-700">
        {t('landing.hero.featured.exploreCta')} <span aria-hidden="true">→</span>
      </p>
    </>
  );
}
