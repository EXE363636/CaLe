'use client';

import { formatDateVN } from '@/lib/format';
import { CalendarEventCard } from './CalendarEventCard';
import type { CalendarEvent } from './WeekView';
export type { CalendarEvent } from './WeekView';

interface AgendaViewProps {
  /** Anchor date — agenda starts at this date and walks forward `dayCount` days. */
  startDateIso: string;
  /** How many days to include. Defaults to 7. */
  dayCount?: number;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  /** Localized empty-state message when no events fall in the window. */
  emptyMessage?: string;
  className?: string;
}

/**
 * Vietnamese weekday names indexed by `Date.prototype.getDay()`
 * (Sunday=0, Monday=1, …, Saturday=6). Defined as a module-level
 * constant so each render reuses the same array.
 */
const VN_WEEKDAYS: readonly string[] = [
  'Chủ Nhật', // 0 = Sunday
  'Thứ Hai', // 1 = Monday
  'Thứ Ba', // 2 = Tuesday
  'Thứ Tư', // 3 = Wednesday
  'Thứ Năm', // 4 = Thursday
  'Thứ Sáu', // 5 = Friday
  'Thứ Bảy', // 6 = Saturday
];

/**
 * Build the list of `YYYY-MM-DD` strings starting at `startIso` and
 * walking forward `count` days. Anchored at local midnight via the
 * `T00:00:00` suffix (matches `formatDateVN`'s convention) so DST or
 * UTC drift never shifts the calendar day.
 */
function buildDayList(startIso: string, count: number): string[] {
  if (count <= 0) return [];
  const days: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(cursor.getTime())) return [];

  for (let i = 0; i < count; i++) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Look up the Vietnamese weekday for a `YYYY-MM-DD` date string.
 * Returns an empty string for unparseable inputs so the heading
 * never renders `undefined`.
 */
function vnWeekday(dayIso: string): string {
  const d = new Date(`${dayIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return VN_WEEKDAYS[d.getDay()] ?? '';
}

/**
 * Mobile-friendly chronological list of calendar events grouped by day.
 *
 * Walks `dayCount` days starting at `startDateIso`, filters `events` to
 * each day (matching on `event.date`), sorts by `startTime` ascending
 * and renders one heading + a vertical stack of `CalendarEventCard`s
 * per non-empty day. Days with no events are omitted entirely so the
 * agenda stays compact.
 *
 * When the entire window has zero events, the localized `emptyMessage`
 * (or a sensible default) is rendered centered in muted gray text.
 *
 * Unlike `WeekView` / `DayView`, this component does not paint a time
 * grid and does not absolutely position events. It is the most usable
 * layout below the `md` breakpoint and serves as a fallback for any
 * viewport.
 */
export function AgendaView({
  startDateIso,
  dayCount = 7,
  events,
  onEventClick,
  emptyMessage,
  className,
}: AgendaViewProps) {
  const days = buildDayList(startDateIso, dayCount);

  // Group events per day in a single pass for O(n) work, then sort each
  // bucket by start time so chronological order holds within a day.
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const day of days) eventsByDay.set(day, []);
  for (const ev of events) {
    const bucket = eventsByDay.get(ev.date);
    if (bucket) bucket.push(ev);
  }
  for (const list of eventsByDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const nonEmptyDays = days.filter(
    (day) => (eventsByDay.get(day)?.length ?? 0) > 0,
  );

  const wrapperClass = ['flex flex-col gap-6', className ?? ''].join(' ').trim();

  if (nonEmptyDays.length === 0) {
    return (
      <div className={wrapperClass}>
        <p className="px-4 py-8 text-center text-sm text-gray-500">
          {emptyMessage ?? ''}
        </p>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {nonEmptyDays.map((day) => {
        const dayEvents = eventsByDay.get(day) ?? [];
        const weekday = vnWeekday(day);
        const formatted = formatDateVN(day);
        return (
          <section key={day} className="flex flex-col gap-2">
            <h3 className="flex items-baseline gap-2 text-sm font-semibold text-gray-900">
              <span>{formatted}</span>
              {weekday && (
                <span className="text-xs font-normal text-gray-500">
                  {weekday}
                </span>
              )}
            </h3>
            <ul className="flex flex-col gap-2">
              {dayEvents.map((ev) => (
                <li key={ev.id}>
                  <CalendarEventCard
                    title={ev.title}
                    timeRange={`${ev.startTime} - ${ev.endTime}`}
                    subtitle={ev.subtitle}
                    statusChip={ev.statusChip}
                    variant={ev.variant}
                    onClick={
                      onEventClick ? () => onEventClick(ev) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
