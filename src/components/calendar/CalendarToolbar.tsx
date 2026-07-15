'use client';

/**
 * CalendarToolbar
 * ----------------
 * Top bar for the calendar shell pages. Layout:
 *
 *   [ Title ]   [ Hôm nay  ←  → ]   [ Ngày | Tuần | Agenda ]   [ actions ]
 *
 * On narrow viewports the row wraps, with the title staying on top, the
 * day-step controls and segmented view switcher dropping below, and the
 * optional `actions` slot wrapping last.
 *
 * The toolbar is fully controlled — it owns no state and reads no stores
 * or routers. Parents pass `view`, the navigation callbacks, and an
 * optional `actions` node for page-specific CTAs (e.g. "Đăng ca mới").
 */

import { Button } from '@/components/ui';
import { t } from '@/i18n/vi';

export type CalendarView = 'day' | 'week' | 'agenda';

interface CalendarToolbarProps {
  title: string;
  view: CalendarView;
  onViewChange: (next: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const VIEW_OPTIONS: ReadonlyArray<{ value: CalendarView; labelKey: string }> = [
  { value: 'day', labelKey: 'calendar.view.day' },
  { value: 'week', labelKey: 'calendar.view.week' },
  { value: 'agenda', labelKey: 'calendar.view.agenda' },
];

export function CalendarToolbar({
  title,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  actions,
  className = '',
}: CalendarToolbarProps) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm',
        className,
      ].join(' ')}
    >
      {/* Left: title */}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      {/* Middle: day-step controls */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onToday} className="min-h-[44px]">
          {t('calendar.today')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          aria-label={t('calendar.prev')}
          className="min-h-[44px] min-w-[44px]"
        >
          ←
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          aria-label={t('calendar.next')}
          className="min-h-[44px] min-w-[44px]"
        >
          →
        </Button>
      </div>

      {/* Right: segmented view switcher */}
      <div
        role="group"
        className="ml-auto inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1"
      >
        {VIEW_OPTIONS.map((opt) => {
          const active = opt.value === view;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onViewChange(opt.value)}
              className={[
                'min-h-[44px] rounded-md px-4 text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
                active
                  ? 'bg-orange-500 text-gray-900 shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ].join(' ')}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Far right: optional page-specific actions */}
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
