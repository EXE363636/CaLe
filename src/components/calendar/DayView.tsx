'use client';

import type { CSSProperties } from 'react';
import {
  dayViewLayout,
  generateSlots,
  todayIso,
  type SlotConfig,
} from '@/domain/week';
import { formatDateVN, formatTimeVN } from '@/lib/format';
import { CalendarEventCard } from './CalendarEventCard';
import type { CalendarEvent } from './WeekView';
export type { CalendarEvent } from './WeekView';

interface DayViewProps {
  /** `YYYY-MM-DD`. */
  dateIso: string;
  /** Drives the visible window and slot row height (pxPerMinute = 60 / slotMinutes). */
  slotConfig: SlotConfig;
  /** Events are filtered/clamped to this single day by `dayViewLayout`. */
  events: CalendarEvent[];
  /** Click an empty cell — receives the cell's `[startTime, endTime)`. */
  onCellClick?: (date: string, startTime: string, endTime: string) => void;
  /** Click an event chip. */
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

/**
 * Single-day vertical timeline.
 *
 * Mirrors the visual language of `WeekView` (sticky time gutter on the
 * left, time-grid driven by `generateSlots`, events absolute-positioned
 * via `dayViewLayout`) but for one day. No store reads, no router, no
 * new dependencies.
 *
 * Each slot row renders at exactly `60px` tall so pixel math is trivial:
 * `pxPerMinute = 60 / slotConfig.slotMinutes`. With the default 120-min
 * slot that's `0.5 px/min`; with a 60-min slot it's `1 px/min`.
 *
 * Task 20.6 — Phase 8 calendar UI redesign.
 */
const WEEKDAY_LABELS: readonly string[] = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

/** Map a `YYYY-MM-DD` to the localized Vietnamese weekday name (Mon-first). */
function weekdayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const jsDay = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return WEEKDAY_LABELS[idx] ?? '';
}

export function DayView({
  dateIso,
  slotConfig,
  events,
  onCellClick,
  onEventClick,
  className = '',
}: DayViewProps) {
  const slots = generateSlots(slotConfig);
  const positioned = dayViewLayout(events, dateIso, slotConfig);
  const pxPerMinute = 60 / slotConfig.slotMinutes;
  const isToday = dateIso === todayIso();

  const headerCellClasses = [
    'flex-1 px-2 py-2 text-center text-xs font-semibold',
    isToday ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700',
  ].join(' ');

  return (
    <div className={['flex flex-col', className].join(' ').trim()}>
      <div className="min-w-[300px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header row: empty time-gutter cell + single date cell */}
        <div className="flex border-b border-gray-100">
          <div
            className="w-24 shrink-0 border-r border-gray-100 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-500"
            aria-hidden="true"
          />
          <div className={headerCellClasses}>
            <div>{weekdayLabel(dateIso)}</div>
            <div className="mt-0.5 font-mono text-[11px] font-normal text-gray-500">
              {formatDateVN(dateIso)}
            </div>
          </div>
        </div>

        {/* Body: time gutter (sticky left) + single day column with overlay */}
        <div className="flex">
          {/* Time gutter */}
          <div className="sticky left-0 z-10 w-24 shrink-0 border-r border-gray-100 bg-gray-50">
            {slots.map((slot) => (
              <div
                key={`gutter-${slot.startTime}-${slot.endTime}`}
                className="flex h-[60px] items-start whitespace-nowrap border-t border-gray-100 px-2 py-1 font-mono text-[11px] font-medium text-gray-600"
              >
                {formatTimeVN(slot.startTime)}–{formatTimeVN(slot.endTime)}
              </div>
            ))}
          </div>

          {/* Day column — relative so absolute event chips anchor here. */}
          <div className="relative flex-1">
            {slots.map((slot) => (
              <button
                key={`cell-${slot.startTime}-${slot.endTime}`}
                type="button"
                onClick={() =>
                  onCellClick?.(dateIso, slot.startTime, slot.endTime)
                }
                aria-label={`${formatTimeVN(slot.startTime)}–${formatTimeVN(slot.endTime)}`}
                className="block h-[60px] w-full border-t border-gray-100 text-left transition-colors hover:bg-orange-50/60 focus:outline-none focus-visible:bg-orange-50"
              />
            ))}

            {/* Absolute-positioned event chips */}
            {positioned.map(({ event, topMinutes, heightMinutes }) => {
              const style: CSSProperties = {
                top: `${topMinutes * pxPerMinute}px`,
                height: `${heightMinutes * pxPerMinute}px`,
              };
              const timeRange = `${formatTimeVN(event.startTime)} - ${formatTimeVN(event.endTime)}`;
              return (
                <div
                  key={event.id}
                  className="absolute left-1 right-1 z-20"
                  style={style}
                >
                  <CalendarEventCard
                    title={event.title}
                    timeRange={timeRange}
                    subtitle={event.subtitle}
                    statusChip={event.statusChip}
                    variant={event.variant}
                    absolute
                    onClick={
                      onEventClick ? () => onEventClick(event) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
