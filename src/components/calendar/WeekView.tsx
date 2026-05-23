'use client';

/**
 * WeekView — Phase 8 calendar UI.
 *
 * Mon→Sun timetable with a sticky time gutter on the left, slot rows
 * driven by `slotConfig`, and absolute-positioned event chips per day.
 *
 * Layout:
 *   Outer       : `overflow-x-auto` wrapper so the inner grid scrolls
 *                 horizontally on narrow viewports.
 *   Inner       : `min-w-[720px]` 8-column grid:
 *                   col 1     = sticky time gutter (`HH:mm - HH:mm`)
 *                   cols 2-8  = each weekday (Thứ Hai → Chủ Nhật)
 *   Header row  : weekday name + `formatDateVN(date)`. Today's header
 *                 gets the orange accent.
 *   Body        : per-day relative wrapper containing
 *                   - empty clickable slot cells (each 60px tall) which
 *                     fire `onCellClick(date, start, end)`
 *                   - absolute-positioned `CalendarEventCard`s laid out
 *                     via `dayViewLayout`.
 *
 * Pixel math:
 *   `slotMinutes` minutes ↔ 60 px, so `pxPerMinute = 60 / slotMinutes`.
 *
 * No store reads, no router. All data flows through props.
 *
 * Task 20.5 — Phase 8 calendar UI redesign.
 */

import { useMemo, type ReactNode } from 'react';
import {
  dayViewLayout,
  generateSlots,
  todayIso,
  weekDates,
  type SlotConfig,
} from '@/domain/week';
import { formatDateVN, formatTimeVN } from '@/lib/format';
import {
  CalendarEventCard,
  type CalendarEventVariant,
} from './CalendarEventCard';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Generic event shape consumed by the calendar views. Pages map their
 * domain rows (`ScheduleBlock`, `Shift`, etc.) to this shape so the view
 * layer stays decoupled from any one entity.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:mm`. */
  startTime: string;
  /** `HH:mm`. */
  endTime: string;
  subtitle?: string;
  statusChip?: ReactNode;
  variant: CalendarEventVariant;
}

interface WeekViewProps {
  /** `YYYY-MM-DD` Monday — the caller computes this via `startOfWeek`. */
  weekStart: string;
  slotConfig: SlotConfig;
  events: CalendarEvent[];
  onCellClick?: (date: string, startTime: string, endTime: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mon→Sun, matches the rest of the Vietnamese schedule UI. */
const WEEKDAY_LABELS: readonly string[] = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

/** Fixed visual height for one slot row (in pixels). */
const SLOT_ROW_HEIGHT = 60;

/** Width of the leftmost time gutter (in pixels). Wide enough for `HH:mm - HH:mm`. */
const TIME_GUTTER_WIDTH = 96;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeekView({
  weekStart,
  slotConfig,
  events,
  onCellClick,
  onEventClick,
  className = '',
}: WeekViewProps) {
  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const slots = useMemo(() => generateSlots(slotConfig), [slotConfig]);
  const today = todayIso();

  // px-per-minute is derived so a slot of `slotMinutes` minutes maps to
  // exactly `SLOT_ROW_HEIGHT` pixels. Guard against an invalid config —
  // `generateSlots` already returns an empty list in that case, but the
  // div-by-zero would still leak `Infinity` into inline styles.
  const pxPerMinute =
    slotConfig.slotMinutes > 0 ? SLOT_ROW_HEIGHT / slotConfig.slotMinutes : 0;

  // Pre-compute the laid-out events for every weekday once per render so we
  // don't re-run `dayViewLayout` for each cell during the body loop.
  const eventsByDay = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof dayViewLayout<CalendarEvent>>
    >();
    for (const day of days) {
      map.set(day, dayViewLayout(events, day, slotConfig));
    }
    return map;
  }, [days, events, slotConfig]);

  return (
    <div
      className={['overflow-x-auto', className].join(' ').trim()}
    >
      <div className="min-w-[720px]">
        {/* ----------------------------------------------------------------
            Header row: blank gutter cell + 7 weekday headers
        ----------------------------------------------------------------- */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-gray-200 bg-gray-50"
            style={{ width: TIME_GUTTER_WIDTH }}
            aria-hidden="true"
          />
          {days.map((date, idx) => {
            const isToday = date === today;
            return (
              <div
                key={date}
                className={[
                  'flex-1 min-w-[100px] border-l border-gray-100 px-2 py-2 text-center text-xs font-semibold',
                  isToday
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-700',
                ].join(' ')}
              >
                <div>{WEEKDAY_LABELS[idx]}</div>
                <div className="mt-0.5 font-mono text-[11px] font-normal text-gray-500">
                  {formatDateVN(date)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------------------------------------------------------
            Body: sticky time gutter + 7 day columns. Each day column is
            a `relative` container so absolutely-positioned events anchor
            against it.
        ----------------------------------------------------------------- */}
        <div className="flex">
          {/* Sticky time gutter — labels stack vertically to mirror the
              60px slot rows in each day column. */}
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-gray-200 bg-white"
            style={{ width: TIME_GUTTER_WIDTH }}
          >
            {slots.map((slot) => (
              <div
                key={`${slot.startTime}-${slot.endTime}`}
                style={{ height: SLOT_ROW_HEIGHT }}
                className="border-t border-gray-100 px-2 py-1 font-mono text-[11px] font-medium whitespace-nowrap text-gray-600"
              >
                {formatTimeVN(slot.startTime)} - {formatTimeVN(slot.endTime)}
              </div>
            ))}
          </div>

          {/* Per-day columns. */}
          {days.map((date) => {
            const isToday = date === today;
            const dayEvents = eventsByDay.get(date) ?? [];
            return (
              <div
                key={date}
                className={[
                  'relative flex-1 min-w-[100px] border-l border-gray-100',
                  isToday ? 'bg-orange-50/50' : '',
                ]
                  .join(' ')
                  .trim()}
              >
                {/* Empty clickable slot cells. */}
                {slots.map((slot) => (
                  <button
                    key={`${date}-${slot.startTime}`}
                    type="button"
                    onClick={
                      onCellClick
                        ? () =>
                            onCellClick(date, slot.startTime, slot.endTime)
                        : undefined
                    }
                    style={{ height: SLOT_ROW_HEIGHT }}
                    aria-label={`${formatDateVN(date)} ${slot.startTime}-${slot.endTime}`}
                    className="block w-full border-t border-gray-100 text-left transition-colors hover:bg-orange-50/60 focus:outline-none focus-visible:bg-orange-50"
                  />
                ))}

                {/* Absolute-positioned event chips overlay. */}
                {dayEvents.map(({ event, topMinutes, heightMinutes }) => (
                  <div
                    key={event.id}
                    className="absolute right-1 left-1"
                    style={{
                      top: topMinutes * pxPerMinute,
                      height: heightMinutes * pxPerMinute,
                    }}
                  >
                    <CalendarEventCard
                      title={event.title}
                      timeRange={`${formatTimeVN(event.startTime)} - ${formatTimeVN(event.endTime)}`}
                      subtitle={event.subtitle}
                      statusChip={event.statusChip}
                      variant={event.variant}
                      onClick={
                        onEventClick ? () => onEventClick(event) : undefined
                      }
                      absolute
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
