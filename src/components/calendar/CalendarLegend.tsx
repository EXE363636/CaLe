import { t } from '@/i18n/vi';

interface CalendarLegendProps {
  /** Audience for this legend — drives which color/label entries are shown. */
  variant: 'worker' | 'employer';
  /** Optional extra classes appended to the outer wrapper. */
  className?: string;
}

interface LegendEntry {
  /** Tailwind background class for the swatch. Matches `CalendarEventCard`'s
   *  border tone (the `*-300` step) so the swatch remains visible on a
   *  white sidebar even though event cards use the lighter `*-100` fill. */
  swatchClass: string;
  /** Translation key whose Vietnamese string is rendered next to the swatch. */
  labelKey: string;
}

const workerEntries: LegendEntry[] = [
  {
    swatchClass: 'bg-slate-300',
    labelKey: 'calendar.legend.worker.personalBusy',
  },
  {
    // P3 palette: success/positive family unified on `green-*` (was
    // `emerald-300`) to match the `availableSlot` event-card swatch.
    swatchClass: 'bg-green-300',
    labelKey: 'calendar.legend.worker.availableSlot',
  },
  {
    swatchClass: 'bg-orange-300',
    labelKey: 'calendar.legend.worker.approvedShift',
  },
  {
    swatchClass: 'bg-amber-300',
    labelKey: 'calendar.legend.worker.pendingShift',
  },
];

const employerEntries: LegendEntry[] = [
  {
    swatchClass: 'bg-blue-300',
    labelKey: 'calendar.legend.employer.published',
  },
  {
    swatchClass: 'bg-amber-300',
    labelKey: 'calendar.legend.employer.fullyBooked',
  },
  {
    // P3 palette: caution/waiting family unified on `amber-*` (was
    // `yellow-300`) to match the `awaitingShift` event-card swatch.
    swatchClass: 'bg-amber-300',
    labelKey: 'calendar.legend.employer.awaiting',
  },
  {
    swatchClass: 'bg-green-300',
    labelKey: 'calendar.legend.employer.completed',
  },
  {
    swatchClass: 'bg-red-300',
    labelKey: 'calendar.legend.employer.cancelled',
  },
  {
    swatchClass: 'bg-gray-300',
    labelKey: 'calendar.legend.employer.expired',
  },
];

/**
 * Pure presentational color-key for the Phase 8 calendar pages.
 *
 * Renders a small vertical list of swatch + label rows that matches the
 * `CalendarEventCard` palette so viewers can decode the event blocks at a
 * glance. The `worker` and `employer` variants surface different status
 * sets — workers see their own busy/approved/pending colors; employers
 * see the full shift lifecycle palette.
 *
 * No store reads, no routing, no `'use client'` directive — safe to render
 * inside a React Server Component. All copy is funnelled through `t()`
 * so missing keys fall back to the key itself (and warn in dev) without
 * breaking the build.
 */
export function CalendarLegend({ variant, className }: CalendarLegendProps) {
  const entries = variant === 'worker' ? workerEntries : employerEntries;

  return (
    <div
      className={['flex flex-col gap-2', className ?? ''].join(' ').trim()}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('calendar.legend.title')}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {entries.map((entry, idx) => (
          <li
            key={`${entry.labelKey}-${idx}`}
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <span
              aria-hidden="true"
              className={['h-3 w-3 shrink-0 rounded', entry.swatchClass]
                .join(' ')
                .trim()}
            />
            <span>{t(entry.labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
