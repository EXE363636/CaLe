'use client';

/**
 * Employer schedule page (Phase 8).
 *
 * Replaces the Phase 7 weekly timetable with the calendar-shell layout
 * shared by `/worker/schedule`:
 *
 *   - `<RoleGuard role="employer">` wrapper.
 *   - `useLifecycleSync()` boot (Phase 7 contract — rolls any time-driven
 *     status transitions forward on entry).
 *   - `<CalendarShell>` with three slots:
 *       sidebar : `MiniMonthCalendar` + `CalendarLegend variant="employer"`
 *                 + a "Đăng ca mới" CTA linking to `/employer/shifts/new`.
 *       toolbar : `CalendarToolbar` with Day / Week / Agenda switcher,
 *                 ◀ / ▶ / Hôm nay buttons, and a secondary "Đăng ca mới"
 *                 button in the actions slot.
 *       body    : `WeekView`, `DayView`, or `AgendaView`, driven by
 *                 `view` state.
 *
 * Owner-only: the employer only sees their own shifts. Filtering happens
 * inside a `useMemo` over the stable `shifts` array — never inside a
 * Zustand selector — to keep the store subscription cheap.
 *
 * Mock / localStorage only. No real backend; the lifecycle sync is the
 * only "freshness" mechanism (no polling, no server push).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';

import { Button, Card } from '@/components/ui';
import { CalendarShell } from '@/components/calendar/CalendarShell';
import { MiniMonthCalendar } from '@/components/calendar/MiniMonthCalendar';
import { CalendarLegend } from '@/components/calendar/CalendarLegend';
import {
  CalendarToolbar,
  type CalendarView,
} from '@/components/calendar/CalendarToolbar';
import { WeekView, type CalendarEvent } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import {
  type CalendarEventVariant,
} from '@/components/calendar/CalendarEventCard';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';

import {
  startOfWeek,
  todayIso,
  validateSlotConfig,
  weekDates,
  type SlotConfig,
} from '@/domain/week';
import { formatDateVN } from '@/lib/format';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { t } from '@/i18n/vi';
import type { Shift, ShiftStatus } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  dayStart: '07:00',
  dayEnd: '21:00',
  slotMinutes: 120,
};

/**
 * Map a `ShiftStatus` to a `CalendarEventCard` variant. The legend
 * (`CalendarLegend variant="employer"`) is the source of truth for the
 * color-to-meaning mapping; this table only ever bridges to it.
 *
 *  - `Published`              → blue   (`publishedShift`)
 *  - `FullyBooked`            → amber  (`fullyBookedShift`)
 *  - `AwaitingConfirmation`   → yellow (`awaitingShift`)
 *  - `Completed`              → green  (`completedShift`)
 *  - `Cancelled` / `Expired`  → red, line-through (`cancelledShift`)
 *  - `Draft` / `InProgress`   → blue   (`publishedShift`) — `Draft` is
 *                               rare on this page (deposit flow already
 *                               flips it to `Published`); `InProgress`
 *                               isn't in the legend yet, so blue is the
 *                               most informative neutral fallback.
 */
const STATUS_VARIANT: Record<ShiftStatus, CalendarEventVariant> = {
  Draft: 'publishedShift',
  Published: 'publishedShift',
  FullyBooked: 'fullyBookedShift',
  InProgress: 'publishedShift',
  AwaitingConfirmation: 'awaitingShift',
  Completed: 'completedShift',
  Cancelled: 'cancelledShift',
  Expired: 'cancelledShift',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pad a number to two digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Add `n` whole days to a `YYYY-MM-DD` date. Anchors at local midnight so
 * timezone offsets never roll the calendar day. Mirrors the private
 * helper in `domain/week.ts`.
 */
function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Build the localized title for the toolbar based on the active view.
 *
 *  - `day`    : `"DD/MM/YYYY"`
 *  - `week`   : `"DD/MM/YYYY – DD/MM/YYYY"` (Mon→Sun of `selectedDateIso`'s week)
 *  - `agenda` : `"DD/MM/YYYY – DD/MM/YYYY"` (`selectedDateIso` + 6 days)
 */
function rangeTitle(view: CalendarView, selectedDateIso: string): string {
  if (view === 'day') {
    return formatDateVN(selectedDateIso);
  }
  if (view === 'week') {
    const monday = startOfWeek(selectedDateIso);
    const days = weekDates(monday);
    return `${formatDateVN(days[0])} – ${formatDateVN(days[6])}`;
  }
  // Agenda: 7-day rolling window starting at selectedDateIso.
  const last = addDaysIso(selectedDateIso, 6);
  return `${formatDateVN(selectedDateIso)} – ${formatDateVN(last)}`;
}

/** Per-view step size for the ◀ / ▶ buttons. */
function stepDays(view: CalendarView, direction: 1 | -1): number {
  if (view === 'day') return direction;
  // Both Week and Agenda step by a full 7-day window.
  return direction * 7;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmployerSchedulePage() {
  return (
    <RoleGuard role="employer">
      <SchedulePageContent />
    </RoleGuard>
  );
}

function SchedulePageContent() {
  const router = useRouter();

  // Phase 7 contract — roll any time-driven shift transitions forward on
  // entry so status badges in the calendar reflect "now". Idempotent;
  // re-mounting is safe.
  useLifecycleSync();

  const currentUserId = useAuthStore((s) => s.currentUserId);
  // Stable raw `shifts` array selector. Per-employer filter + per-event
  // mapping live in `useMemo` below so we never feed Zustand a fresh
  // array selector (HANDOFF.md, Section 4 — same principle as the
  // employer manage page).
  const shifts = useShiftStore((s) => s.shifts);

  const [view, setView] = useState<CalendarView>('week');
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() =>
    todayIso(),
  );
  const [slotCfg, setSlotCfg] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [slotCfgError, setSlotCfgError] = useState<string | null>(null);

  // Owner-only filter. Workers / admins / other employers must never see
  // another employer's shifts on this page.
  const myShifts = useMemo<Shift[]>(() => {
    if (!currentUserId) return [];
    return shifts.filter((s) => s.employerId === currentUserId);
  }, [shifts, currentUserId]);

  // Map owned shifts to the generic `CalendarEvent` shape consumed by the
  // calendar views. The status chip slot carries both the shift status
  // badge and the escrow status badge so an employer can read everything
  // without leaving the calendar.
  const events = useMemo<CalendarEvent[]>(() => {
    return myShifts.map((shift) => ({
      id: shift.id,
      title: shift.title,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      subtitle: `${shift.positionsFilled}/${shift.positionsTotal} ${t('common.positions')}`,
      statusChip: (
        <span className="flex flex-wrap items-center gap-1">
          <ShiftStatusBadge status={shift.status} />
          <EscrowStatusBadge status={shift.escrowStatus} />
        </span>
      ),
      variant: STATUS_VARIANT[shift.status],
    }));
  }, [myShifts]);

  if (!currentUserId) return null;

  // -----------------------------------------------------------------------
  // Toolbar handlers
  // -----------------------------------------------------------------------

  function handlePrev() {
    setSelectedDateIso((iso) => addDaysIso(iso, stepDays(view, -1)));
  }

  function handleNext() {
    setSelectedDateIso((iso) => addDaysIso(iso, stepDays(view, 1)));
  }

  function handleToday() {
    setSelectedDateIso(todayIso());
  }

  function handleEventClick(event: CalendarEvent) {
    router.push(`/employer/shifts/${event.id}`);
  }

  function handleSlotCfgChange(patch: Partial<SlotConfig>) {
    const next = { ...slotCfg, ...patch };
    const validation = validateSlotConfig(next);
    setSlotCfg(next);
    setSlotCfgError(
      validation.ok ? null : t(`schedule.slotCfg.error.${validation.error}`),
    );
  }

  // -----------------------------------------------------------------------
  // Slots
  // -----------------------------------------------------------------------

  const sidebar = (
    <div className="flex flex-col gap-4">
      <MiniMonthCalendar
        selectedDateIso={selectedDateIso}
        onSelectDate={setSelectedDateIso}
      />
      <Link href="/employer/shifts/new" className="block">
        <Button variant="primary" className="w-full">
          {t('btn.postShift')}
        </Button>
      </Link>
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <CalendarLegend variant="employer" />
      </div>
    </div>
  );

  const toolbar = (
    <CalendarToolbar
      title={rangeTitle(view, selectedDateIso)}
      view={view}
      onViewChange={setView}
      onPrev={handlePrev}
      onNext={handleNext}
      onToday={handleToday}
      actions={
        <Link href="/employer/shifts/new">
          <Button variant="primary" size="sm">
            {t('btn.postShift')}
          </Button>
        </Link>
      }
    />
  );

  const body = (
    <div className="flex flex-col gap-4">
      {/* Slot-config form — same defaults as before, mounted in a small
          card above the body so the employer can still tune the visible
          window when they need to. */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-gray-900">
          {t('schedule.slotCfg.title')}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <SlotCfgInput
            label={t('schedule.slotCfg.dayStart')}
            type="time"
            value={slotCfg.dayStart}
            onChange={(v) => handleSlotCfgChange({ dayStart: v })}
          />
          <SlotCfgInput
            label={t('schedule.slotCfg.dayEnd')}
            type="time"
            value={slotCfg.dayEnd}
            onChange={(v) => handleSlotCfgChange({ dayEnd: v })}
          />
          <SlotCfgInput
            label={t('schedule.slotCfg.slotMinutes')}
            type="number"
            min={15}
            step={15}
            value={
              Number.isFinite(slotCfg.slotMinutes)
                ? String(slotCfg.slotMinutes)
                : ''
            }
            onChange={(v) =>
              handleSlotCfgChange({
                slotMinutes: v === '' ? Number.NaN : Number(v),
              })
            }
          />
        </div>
        {slotCfgError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {slotCfgError}
          </p>
        )}
      </Card>

      {/* Calendar body — switch on `view`. */}
      {view === 'week' && (
        <WeekView
          weekStart={startOfWeek(selectedDateIso)}
          slotConfig={slotCfg}
          events={events}
          onEventClick={handleEventClick}
        />
      )}
      {view === 'day' && (
        <DayView
          dateIso={selectedDateIso}
          slotConfig={slotCfg}
          events={events}
          onEventClick={handleEventClick}
        />
      )}
      {view === 'agenda' && (
        <AgendaView
          startDateIso={selectedDateIso}
          dayCount={7}
          events={events}
          onEventClick={handleEventClick}
          emptyMessage={t('calendar.empty.employer')}
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('employerSchedule.page.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('employerSchedule.page.subtitle')}
        </p>
      </header>

      <CalendarShell sidebar={sidebar} toolbar={toolbar} body={body} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot-config input — minimal local wrapper, mirroring the worker page so
// the two schedule pages stay visually identical.
// ---------------------------------------------------------------------------

function SlotCfgInput({
  label,
  type,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  type: 'time' | 'number';
  value: string;
  onChange: (v: string) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        step={step}
        className="w-32 min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm"
      />
    </label>
  );
}
