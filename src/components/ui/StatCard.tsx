'use client';

import type { ReactNode } from 'react';

export type StatCardTone =
  | 'brand'
  | 'good'
  | 'info'
  | 'warn'
  | 'bad'
  | 'neutral';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional small suffix shown after the value (e.g. "/ 100"). */
  suffix?: ReactNode;
  /** Optional icon rendered in a tinted chip on the right. */
  icon?: ReactNode;
  tone?: StatCardTone;
  /** When provided, the whole card becomes a button. */
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * UI-REFRESH-FROM-BOLT-REFERENCE-1 — shared stat/metric card.
 *
 * Bolt-inspired (`ui/StatCard`): label on top, large value, a tinted
 * icon chip on the right. CSS-only (no framer-motion — the reference's
 * count-up animation is dropped to avoid adding a dependency). Reuses
 * the existing `.motion-lift` utility for the hover lift, matching the
 * rest of the app.
 *
 * Tones map to the app's existing semantic palette so colours stay
 * consistent with `Badge` / lifecycle badge.
 */
const toneAccent: Record<StatCardTone, { chip: string; value: string }> = {
  brand: { chip: 'bg-orange-100 text-orange-600', value: 'text-orange-700' },
  good: { chip: 'bg-green-100 text-green-600', value: 'text-green-700' },
  info: { chip: 'bg-blue-100 text-blue-600', value: 'text-blue-700' },
  warn: { chip: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
  bad: { chip: 'bg-red-100 text-red-600', value: 'text-red-700' },
  neutral: { chip: 'bg-gray-100 text-gray-600', value: 'text-gray-900' },
};

export function StatCard({
  label,
  value,
  suffix,
  icon,
  tone = 'neutral',
  onClick,
  ariaLabel,
  className = '',
}: StatCardProps) {
  const accent = toneAccent[tone];
  const base = [
    // Resting elevation uses the soft two-layer `shadow-card` token
    // (matching `Card`) instead of the flat `shadow-sm` (Req 4.1).
    'rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-card',
    // Only interactive (onClick) tiles lift: `motion-lift` supplies the
    // translateY(-2px) on hover, and `shadow-card-hover` applies on both
    // pointer hover and keyboard focus (Req 4.2). Static tiles keep the
    // resting shadow with no lift (Req 4.3).
    onClick
      ? 'motion-lift cursor-pointer hover:shadow-card-hover focus-visible:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={['text-2xl font-bold leading-none', accent.value].join(' ')}>
            {value}
          </span>
          {suffix && (
            <span className="text-sm font-medium text-gray-500">{suffix}</span>
          )}
        </div>
      </div>
      {icon && (
        <span
          className={['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent.chip].join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={base}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

interface MetricGridProps {
  children: ReactNode;
  /** Columns at the lg breakpoint. Defaults to 4. */
  cols?: 2 | 3 | 4;
  className?: string;
}

/**
 * Responsive grid wrapper for `StatCard`s: 2 cols on mobile, expanding to
 * 3/4 on desktop. Keeps dashboards using the full width band.
 */
export function MetricGrid({ children, cols = 4, className = '' }: MetricGridProps) {
  const colClass =
    cols === 2
      ? 'sm:grid-cols-2'
      : cols === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4';
  return (
    <div className={['grid grid-cols-2 gap-3', colClass, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
