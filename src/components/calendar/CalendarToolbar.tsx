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

import { useT } from '@/i18n/LocaleProvider';

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
  const t = useT();
  // 03/10 — thiết kế lại theo ngôn ngữ landing: thẻ trắng bo 16px, mũi tên + "Hôm
  // nay" gom một cụm, tiêu đề khoảng ngày cạnh đó; nút chuyển chế độ nền cam nhạt,
  // chế độ đang chọn là ô trắng nổi. Điện thoại: hai hàng.
  return (
    <div
      className={[
        'flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-black/5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:p-4',
        className,
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label={t('calendar.prev')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-800 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {t('calendar.today')}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={t('calendar.next')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Chevron dir="right" />
        </button>
        <h2 className="ml-2 min-w-0 text-base font-semibold text-gray-900 tabular-nums sm:text-lg">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <div role="group" className="inline-flex items-center gap-1 rounded-xl bg-orange-50 p-1 ring-1 ring-orange-100">
          {VIEW_OPTIONS.map((opt) => {
            const active = opt.value === view;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onViewChange(opt.value)}
                className={[
                  'min-h-[40px] rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none sm:px-4',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                  active ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-900',
                ].join(' ')}
              >
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm12 5-5 5 5 5' : 'm8 5 5 5-5 5'} />
    </svg>
  );
}
