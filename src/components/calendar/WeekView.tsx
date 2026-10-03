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
 *
 * 03/10 — thiết kế lại theo ngôn ngữ landing: cột giờ chỉ ghi giờ bắt đầu ("07:00"),
 * đầu cột ngày = thứ + ngày (hôm nay: ngày trong ô cam), vạch "bây giờ" cam trong cột
 * hôm nay (tính một lần khi mở trang, không chạy đồng hồ — CLAUDE.md §5.6), và
 * `emptyState` phủ giữa lưới khi cả tuần không có gì. Khung giờ do trang truyền vào
 * (`DAY_QUARTERS`: 24 giờ chia 4 cụm 6 giờ; cột giờ ghi tên cụm, trong cụm có vạch mờ
 * từng giờ, bấm ô trống → khung 1 giờ đúng chỗ bấm).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  dayViewLayout,
  generateSlots,
  todayIso,
  weekDates,
  type SlotConfig,
} from '@/domain/week';
import { useTx } from '@/i18n/LocaleProvider';

import { QUARTER_NAMES, nowOffsetMinutes } from './calendarModel';
import { formatDateVN, formatTimeVN } from '@/lib/format';
import {
  CalendarEventCard,
  calendarSlotRowHeight,
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
  /** Nhãn trạng thái dạng chữ cho thẻ trên lưới (xem CalendarEventCard). */
  statusLabel?: string;
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
  /** Phủ giữa lưới khi tuần không có sự kiện nào (vd lời mời tìm ca / đăng ca). */
  emptyState?: ReactNode;
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


/** Width of the leftmost time gutter (in pixels) — chỉ ghi giờ bắt đầu "HH:mm". */
const TIME_GUTTER_WIDTH = 60;

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
  emptyState,
}: WeekViewProps) {
  const tx = useTx();
  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const slots = useMemo(() => generateSlots(slotConfig), [slotConfig]);
  const today = todayIso();
  // Giờ hiện tại cho vạch "bây giờ": đọc một lần sau khi gắn (bản server không có vạch).
  const [nowHHmm, setNowHHmm] = useState<string | null>(null);
  useEffect(() => {
    const r = requestAnimationFrame(() => {
      const d = new Date();
      setNowHHmm(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    });
    return () => cancelAnimationFrame(r);
  }, []);
  const nowTop = nowHHmm ? nowOffsetMinutes(nowHHmm, slotConfig) : null;
  const weekEmpty = !events.some((e) => days.includes(e.date));

  // px-per-minute is derived so a slot of `slotMinutes` minutes maps to
  // exactly `SLOT_ROW_HEIGHT` pixels. Guard against an invalid config —
  // `generateSlots` already returns an empty list in that case, but the
  // div-by-zero would still leak `Infinity` into inline styles.
  const SLOT_ROW_HEIGHT = calendarSlotRowHeight(slotConfig.slotMinutes);
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
        <div className="flex border-b border-gray-200 bg-white">
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-gray-100 bg-white"
            style={{ width: TIME_GUTTER_WIDTH }}
            aria-hidden="true"
          />
          {days.map((date, idx) => {
            const isToday = date === today;
            return (
              <div
                key={date}
                className={[
                  'flex-1 min-w-[100px] border-l border-gray-100 px-2 py-2.5 text-center',
                  isToday ? 'bg-orange-50/60' : '',
                ].join(' ')}
              >
                <div className={['text-xs font-medium', isToday ? 'text-orange-800' : 'text-gray-600'].join(' ')}>
                  {tx(WEEKDAY_LABELS[idx])}
                </div>
                <div
                  className={[
                    'mx-auto mt-1 inline-flex min-w-[2.75rem] items-center justify-center rounded-lg px-1.5 py-0.5 text-sm font-semibold tabular-nums',
                    isToday ? 'bg-orange-500 text-gray-900' : 'text-gray-900',
                  ].join(' ')}
                >
                  {formatDateVN(date).slice(0, 5)}
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
        <div className="relative flex">
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
                className={['border-t px-2 pt-1 text-right text-xs font-medium whitespace-nowrap text-gray-500 tabular-nums', slotConfig.slotMinutes > 60 ? 'border-gray-200' : 'border-gray-100'].join(' ')}
              >
                {QUARTER_NAMES[slot.startTime] && slotConfig.slotMinutes > 60 && (
                  <span className="block text-xs font-semibold text-gray-800">{tx(QUARTER_NAMES[slot.startTime])}</span>
                )}
                {formatTimeVN(slot.startTime)}
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
                  isToday ? 'bg-orange-50/40' : '',
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
                        ? (e) => {
                            const [from, to] = clickedRange(slot.startTime, slot.endTime, slotConfig.slotMinutes, e.nativeEvent.offsetY, pxPerMinute);
                            onCellClick(date, from, to);
                          }
                        : undefined
                    }
                    style={{ height: SLOT_ROW_HEIGHT, backgroundImage: hourLines(pxPerMinute, slotConfig.slotMinutes) }}
                    aria-label={`${formatDateVN(date)} ${slot.startTime}-${slot.endTime}`}
                    // P3 focus: empty slot cells are flush in a tight grid,
                    // so an offset ring would overlap neighbours. Use an
                    // INSET ring (plus the existing bg tint) so keyboard
                    // focus is clearly visible without spilling over
                    // adjacent cells.
                    className={['block w-full border-t text-left transition-colors hover:bg-orange-50/60 focus:outline-none focus-visible:bg-orange-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400', slotConfig.slotMinutes > 60 ? 'border-gray-200' : 'border-gray-100'].join(' ')}
                  />
                ))}

                {/* Vạch "bây giờ" trong cột hôm nay. */}
                {isToday && nowTop !== null && (
                  <div aria-hidden="true" className="pointer-events-none absolute right-0 left-0 z-10" style={{ top: nowTop * pxPerMinute }}>
                    <span className="absolute -top-[5px] -left-[5px] h-2.5 w-2.5 rounded-full bg-orange-600" />
                    <span className="block h-0.5 bg-orange-600" />
                  </div>
                )}

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
                      timeRange={`${formatTimeVN(event.startTime)}–${formatTimeVN(event.endTime)}`}
                      subtitle={event.subtitle}
                      statusChip={event.statusChip}
                      statusLabel={event.statusLabel}
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

          {weekEmpty && emptyState && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-16">
              <div className="pointer-events-auto max-w-sm rounded-2xl bg-white/95 px-5 py-4 text-center shadow-card ring-1 ring-black/5">
                {emptyState}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Vạch mờ từng giờ bên trong một cụm dài (lưới 4 cụm 6 giờ). */
export function hourLines(pxPerMinute: number, slotMinutes: number): string | undefined {
  if (slotMinutes <= 60 || pxPerMinute <= 0) return undefined;
  const h = pxPerMinute * 60;
  return `repeating-linear-gradient(to bottom, transparent 0, transparent ${h - 1}px, var(--hour-line) ${h - 1}px, var(--hour-line) ${h}px)`;
}

/** Bấm vào ô của một cụm dài → khung 1 giờ tại giờ được bấm (không phải cả cụm 6 giờ). */
export function clickedRange(start: string, end: string, slotMinutes: number, offsetY: number, pxPerMinute: number): [string, string] {
  if (slotMinutes <= 60 || pxPerMinute <= 0) return [start, end];
  const [h, m] = start.split(':').map(Number);
  const base = h * 60 + m;
  const hour = Math.max(0, Math.min(Math.floor(slotMinutes / 60) - 1, Math.floor(offsetY / (pxPerMinute * 60))));
  const from = base + hour * 60;
  const to = Math.min(from + 60, 23 * 60 + 59);
  const fmt = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  return [fmt(from), fmt(to)];
}
