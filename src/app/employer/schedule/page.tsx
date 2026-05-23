'use client';

/**
 * Employer schedule page (Phase 8 + Phase 9B polish).
 *
 *   - `<RoleGuard role="employer">` wrapper.
 *   - `useLifecycleSync()` boot (Phase 7 contract — rolls any time-driven
 *     status transitions forward on entry).
 *   - `<CalendarShell>` with a polished sidebar / toolbar / body.
 *   - Slot-config form is now collapsible (`<details>`) so the calendar
 *     gets full vertical space on mobile.
 *   - `TimeFieldVN` replaces the native `<input type="time">` so
 *     Vietnamese users always see `HH:mm`, never AM/PM.
 *
 * Owner-only filter and Zustand selector hygiene unchanged.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';

import { Button, Input, PageHelpButton, TimeFieldVN } from '@/components/ui';
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function rangeTitle(view: CalendarView, selectedDateIso: string): string {
  if (view === 'day') return formatDateVN(selectedDateIso);
  if (view === 'week') {
    const monday = startOfWeek(selectedDateIso);
    const days = weekDates(monday);
    return `${formatDateVN(days[0])} – ${formatDateVN(days[6])}`;
  }
  const last = addDaysIso(selectedDateIso, 6);
  return `${formatDateVN(selectedDateIso)} – ${formatDateVN(last)}`;
}

function stepDays(view: CalendarView, direction: 1 | -1): number {
  if (view === 'day') return direction;
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

  useLifecycleSync();

  const currentUserId = useAuthStore((s) => s.currentUserId);
  const shifts = useShiftStore((s) => s.shifts);

  const [view, setView] = useState<CalendarView>('week');
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() =>
    todayIso(),
  );
  const [slotCfg, setSlotCfg] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [slotCfgError, setSlotCfgError] = useState<string | null>(null);

  const myShifts = useMemo<Shift[]>(() => {
    if (!currentUserId) return [];
    return shifts.filter((s) => s.employerId === currentUserId);
  }, [shifts, currentUserId]);

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

  const sidebar = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-orange-100 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
        <MiniMonthCalendar
          selectedDateIso={selectedDateIso}
          onSelectDate={setSelectedDateIso}
          className="border-0 shadow-none"
        />
      </div>
      <Link href="/employer/shifts/new" className="block">
        <Button variant="primary" className="w-full">
          {t('btn.postShift')}
        </Button>
      </Link>
      <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
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
      {/* Phase 9B: collapsible slot config — same control surface as the
          worker page so both schedules stay visually consistent. */}
      <details className="group rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-gray-900">
          <span>{t('schedule.slotCfg.toggle')}</span>
          <span
            className="text-xs text-gray-500 transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            ▾
          </span>
        </summary>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <TimeFieldVN
            label={t('schedule.slotCfg.dayStart')}
            value={slotCfg.dayStart}
            onChange={(v) => handleSlotCfgChange({ dayStart: v })}
            className="w-32"
          />
          <TimeFieldVN
            label={t('schedule.slotCfg.dayEnd')}
            value={slotCfg.dayEnd}
            onChange={(v) => handleSlotCfgChange({ dayEnd: v })}
            className="w-32"
          />
          <Input
            label={t('schedule.slotCfg.slotMinutes')}
            type="number"
            min={15}
            step={15}
            value={
              Number.isFinite(slotCfg.slotMinutes) ? slotCfg.slotMinutes : ''
            }
            onChange={(e) => {
              const raw = e.target.value;
              handleSlotCfgChange({
                slotMinutes: raw === '' ? Number.NaN : Number(raw),
              });
            }}
            className="w-32"
          />
        </div>
        {slotCfgError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {slotCfgError}
          </p>
        )}
      </details>

      {/* Calendar body — wrapped in a soft white panel. */}
      <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
        {view === 'week' && (
          <WeekView
            weekStart={startOfWeek(selectedDateIso)}
            slotConfig={slotCfg}
            events={events}
            onEventClick={handleEventClick}
            className="rounded-2xl"
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
          <div className="p-4 sm:p-6">
            <AgendaView
              startDateIso={selectedDateIso}
              dayCount={7}
              events={events}
              onEventClick={handleEventClick}
              emptyMessage={t('calendar.empty.employer')}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Phase 9G — removed the floating blurred orange/amber circles
          that previously sat behind the schedule. They added clutter
          without conveying anything; the body's calm warm-cream chrome
          is enough surface treatment for the calendar grid. */}

      <header className="entrance-up mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('nav.employerSchedule')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('employerSchedule.page.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {t('employerSchedule.page.subtitle')}
            </p>
          </div>
          <PageHelpButton
            title={t('help.employerSchedule.title')}
            intro={t('help.employerSchedule.intro')}
            sections={[
              {
                heading: t('help.employerSchedule.section.purpose.heading'),
                items: [t('help.employerSchedule.section.purpose.item1')],
              },
              {
                heading: t('help.employerSchedule.section.numbers.heading'),
                items: [
                  t('help.employerSchedule.section.numbers.item1'),
                  t('help.employerSchedule.section.numbers.item2'),
                ],
              },
              {
                heading: t('help.employerSchedule.section.actions.heading'),
                items: [
                  t('help.employerSchedule.section.actions.item1'),
                  t('help.employerSchedule.section.actions.item2'),
                  t('help.employerSchedule.section.actions.item3'),
                ],
              },
              {
                heading: t('help.employerSchedule.section.mistakes.heading'),
                items: [t('help.employerSchedule.section.mistakes.item1')],
              },
            ]}
            cta={{ label: t('help.viewFullGuide'), href: '/user-guide' }}
          />
        </div>
      </header>

      <CalendarShell sidebar={sidebar} toolbar={toolbar} body={body} />
    </div>
  );
}
