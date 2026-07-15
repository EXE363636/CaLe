'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatMonthYearVN, monthGrid, todayIso } from '@/domain/week';
import { t } from '@/i18n/vi';

/**
 * Sidebar mini-month calendar.
 *
 * Pure presentational + local navigation state. Click a day → notify parent.
 * The component owns its visible-month state (year + month, 1-indexed).
 * Prev/Next chevrons only adjust the visible month; only day clicks and the
 * "Hôm nay" link emit `onSelectDate`.
 *
 * Task 20.3 — Phase 8 calendar UI redesign.
 */

interface MiniMonthCalendarProps {
  /** Currently-selected date as `YYYY-MM-DD`. Drives the orange highlight. */
  selectedDateIso: string;
  /** Called when the user clicks a day cell or the "Hôm nay" link. */
  onSelectDate: (iso: string) => void;
  /** Extra classes applied to the outer container. */
  className?: string;
}

/** Mon→Sun headers, ISO-style — matches the rest of the schedule UI. */
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

/** Parse `"YYYY-MM-DD"` → `{ year, month }` (month is 1-indexed). Falls back to today. */
function parseYearMonth(iso: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  const today = todayIso();
  return {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  };
}

/** Step the visible month by ±1, wrapping the year if necessary. */
function stepMonth(
  year: number,
  month: number,
  delta: 1 | -1,
): { year: number; month: number } {
  const next = month + delta;
  if (next < 1) return { year: year - 1, month: 12 };
  if (next > 12) return { year: year + 1, month: 1 };
  return { year, month: next };
}

export function MiniMonthCalendar({
  selectedDateIso,
  onSelectDate,
  className = '',
}: MiniMonthCalendarProps) {
  // Default visible month = month of selectedDateIso. Re-sync only when the
  // *month* of the selected date changes externally (so internal Prev/Next
  // navigation isn't clobbered while the user keeps the same selected day).
  const initial = useMemo(() => parseYearMonth(selectedDateIso), [selectedDateIso]);
  const [visible, setVisible] = useState(initial);
  const selectedYM = useMemo(() => parseYearMonth(selectedDateIso), [selectedDateIso]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional visible-month resync when the selected month changes externally; functional update is a no-op when unchanged
    setVisible((prev) =>
      prev.year === selectedYM.year && prev.month === selectedYM.month
        ? prev
        : selectedYM,
    );
  }, [selectedYM]);

  const cells = useMemo(
    () => monthGrid(visible.year, visible.month),
    [visible.year, visible.month],
  );

  function handlePrev() {
    setVisible((v) => stepMonth(v.year, v.month, -1));
  }

  function handleNext() {
    setVisible((v) => stepMonth(v.year, v.month, 1));
  }

  function handleToday() {
    const today = todayIso();
    const ym = parseYearMonth(today);
    setVisible(ym);
    onSelectDate(today);
  }

  return (
    <div
      className={[
        'rounded-lg border border-gray-200 bg-white p-3',
        className,
      ].join(' ')}
    >
      {/* Header: prev / month-year / next + "Hôm nay" link */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={handlePrev}
          aria-label={t('calendar.miniMonth.aria.prev')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12.78 4.22a.75.75 0 010 1.06L8.06 10l4.72 4.72a.75.75 0 11-1.06 1.06l-5.25-5.25a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div
          className="flex-1 text-center text-sm font-semibold text-gray-900"
          aria-live="polite"
        >
          {formatMonthYearVN(visible.year, visible.month)}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label={t('calendar.miniMonth.aria.next')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.22 4.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 01-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleToday}
          className="ml-1 inline-flex min-h-[44px] items-center rounded-md px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        >
          {t('calendar.today')}
        </button>
      </div>

      {/* Weekday header row */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-medium uppercase tracking-wide text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 6×7 day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const day = Number(cell.iso.slice(8, 10));
          const isSelected = cell.iso === selectedDateIso;
          const classes = [
            'flex items-center justify-center rounded-md text-sm transition-colors',
            'min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
          ];
          if (isSelected) {
            classes.push('bg-orange-500 text-gray-900 font-semibold');
          } else if (cell.isToday) {
            classes.push(
              cell.inMonth ? 'text-gray-900' : 'text-gray-400',
              'ring-2 ring-orange-500 hover:bg-gray-100',
            );
          } else {
            classes.push(
              cell.inMonth ? 'text-gray-900' : 'text-gray-400',
              'hover:bg-gray-100',
            );
          }
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              aria-label={cell.iso}
              aria-pressed={isSelected}
              className={classes.join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
