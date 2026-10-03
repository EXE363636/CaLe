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
 *
 * 03/10 — thiết kế lại theo ngôn ngữ landing (nhánh feat/schedule-redesign):
 *   - Đầu trang: tiêu đề lớn + tóm tắt tuần đang xem (số ca, người đã nhận / cần,
 *     số ca còn thiếu người).
 *   - 24 giờ chia 4 cụm 6 giờ (Đêm / Sáng / Chiều / Tối, `DAY_QUARTERS`) — bỏ ô
 *     "Tuỳ chỉnh khung giờ"; lưới luôn đủ cả ngày.
 *   - Điện thoại: mặc định Danh sách, hiện cả ngày trống kèm "Đăng ca".
 *   - Bấm một ca → hộp chi tiết (`EventPeek`): giờ, nơi, trạng thái, số người, giờ
 *     mở check-in + "Mở trang quản lý ca".
 *   - Cột phải: lịch tháng nhỏ, "Sắp tới", chú giải.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';

import { PageHelpButton, ButtonLink } from '@/components/ui';
import { DAY_QUARTERS } from '@/components/calendar/calendarModel';
import { EventPeek, ScheduleSummary, UpcomingList } from '@/components/calendar/SchedulePieces';
import { shiftMilestones } from '@/components/landing/shiftMilestones';
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
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';

import {
  startOfWeek,
  todayIso,
  weekDates,
} from '@/domain/week';
import { formatDateVN } from '@/lib/format';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useT, useTx } from '@/i18n/LocaleProvider';
import {
  getShiftLifecycleState,
  getShiftStatusBadge,
  type ShiftLifecycleState,
} from '@/domain/shiftLifecycleState';
import type { Shift } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// CORE-STABILITY-10 — calendar event colour keyed by the canonical
// lifecycle STATE (not the stored status) so the calendar tile colour
// agrees with the unified lifecycle badge.
const LIFECYCLE_VARIANT: Record<ShiftLifecycleState, CalendarEventVariant> = {
  Draft: 'publishedShift',
  PendingDeposit: 'publishedShift',
  Published: 'publishedShift',
  StartingSoon: 'fullyBookedShift',
  InProgress: 'publishedShift',
  AwaitingCheckout: 'awaitingShift',
  AwaitingEmployerConfirmation: 'awaitingShift',
  Completed: 'completedShift',
  Expired: 'expiredShift',
  Cancelled: 'cancelledShift',
  Disputed: 'cancelledShift',
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
  const t = useT();
  const tx = useTx();

  useLifecycleSync();

  const currentUserId = useAuthStore((s) => s.currentUserId);
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);

  const [view, setView] = useState<CalendarView>('week');
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() =>
    todayIso(),
  );
  // Ca đang mở trong hộp chi tiết.
  const [peekId, setPeekId] = useState<string | null>(null);

  // Điện thoại: mặc định Danh sách (lưới tuần 7 cột quá chật).
  useEffect(() => {
    const r = requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 639px)').matches) setView('agenda');
    });
    return () => cancelAnimationFrame(r);
  }, []);

  const myShifts = useMemo<Shift[]>(() => {
    if (!currentUserId) return [];
    // CORE-STABILITY-8 Part 1 — Draft shifts never appear on the
    // employer calendar as real shifts.
    return shifts.filter(
      (s) => s.employerId === currentUserId && s.status !== 'Draft',
    );
  }, [shifts, currentUserId]);

  const events = useMemo<CalendarEvent[]>(() => {
    const nowIso = new Date().toISOString();
    return myShifts.map((shift) => {
      const state = getShiftLifecycleState(shift, applications, nowIso);
      return {
        id: shift.id,
        title: shift.title,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        subtitle: `${shift.positionsFilled}/${shift.positionsTotal} ${t('common.positions')}`,
        statusChip: (
          <span className="flex flex-wrap items-center gap-1">
            <ShiftLifecycleBadge
              shift={shift}
              applications={applications}
              nowIso={nowIso}
            />
            <EscrowStatusBadge status={shift.escrowStatus} />
          </span>
        ),
        statusLabel: t(getShiftStatusBadge(state).labelKey),
        variant: LIFECYCLE_VARIANT[state],
      };
    });
  }, [myShifts, applications, t]);

  const weekDays = useMemo(() => weekDates(startOfWeek(selectedDateIso)), [selectedDateIso]);
  // 24 giờ chia 4 cụm 6 giờ (Đêm / Sáng / Chiều / Tối) — chủ dự án chốt 03/10.
  const slotCfg = DAY_QUARTERS;

  // Tóm tắt tuần đang xem: số ca (trừ huỷ / hết hạn), người đã nhận / cần, ca thiếu người.
  const summary = useMemo(() => {
    const inWeek = new Set(weekDays);
    const nowIso = new Date().toISOString();
    let count = 0;
    let filled = 0;
    let needed = 0;
    let short = 0;
    for (const shift of myShifts) {
      if (!inWeek.has(shift.date)) continue;
      const state = getShiftLifecycleState(shift, applications, nowIso);
      if (state === 'Cancelled' || state === 'Expired') continue;
      count += 1;
      filled += shift.positionsFilled;
      needed += shift.positionsTotal;
      if ((state === 'Published' || state === 'StartingSoon') && shift.positionsFilled < shift.positionsTotal) short += 1;
    }
    return { count, filled, needed, short };
  }, [myShifts, applications, weekDays]);

  const upcoming = useMemo(() => {
    const today = todayIso();
    return events
      .filter((e) => e.date >= today && e.variant !== 'cancelledShift')
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
      .slice(0, 5);
  }, [events]);

  if (!currentUserId) return null;

  const peekShift = peekId ? myShifts.find((sh) => sh.id === peekId) ?? null : null;
  const peekEvent = peekId ? events.find((e) => e.id === peekId) ?? null : null;

  function handlePrev() {
    setSelectedDateIso((iso) => addDaysIso(iso, stepDays(view, -1)));
  }
  function handleNext() {
    setSelectedDateIso((iso) => addDaysIso(iso, stepDays(view, 1)));
  }
  function handleToday() {
    setSelectedDateIso(todayIso());
  }
  // Bấm một ca → hộp chi tiết (03/10); "Mở trang quản lý ca" từ đó.
  function handleEventClick(event: CalendarEvent) {
    setPeekId(event.id);
  }

  const sidebar = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-1 shadow-card ring-1 ring-black/5">
        <MiniMonthCalendar
          selectedDateIso={selectedDateIso}
          onSelectDate={setSelectedDateIso}
          className="border-0 shadow-none"
        />
      </div>
      <UpcomingList
        title={tx('Sắp tới')}
        empty={
          <>
            {tx('Chưa có ca nào sắp tới.')}{' '}
            <Link href="/employer/shifts/new" className="font-semibold text-orange-700 hover:underline">
              {t('btn.postShift')} →
            </Link>
          </>
        }
        items={upcoming.map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, variant: e.variant, label: e.subtitle }))}
        onSelect={setPeekId}
      />
      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5">
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
        <ButtonLink href="/employer/shifts/new" variant="primary" size="sm">
            {t('btn.postShift')}
          </ButtonLink>
      }
    />
  );

  const body = (
    <div className="flex flex-col gap-4">

      {/* Calendar body — wrapped in a soft white panel. */}
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-black/5">
        {view === 'week' && (
          <WeekView
            weekStart={startOfWeek(selectedDateIso)}
            slotConfig={slotCfg}
            events={events}
            onEventClick={handleEventClick}
            className="rounded-2xl"
            emptyState={
              <>
                <p className="text-sm font-semibold text-gray-900">{tx('Tuần này chưa có ca nào.')}</p>
                <p className="mt-1 text-sm text-gray-600">{tx('Ca đăng xong hiện ở đây theo đúng giờ, kèm số người đã nhận.')}</p>
                <Link
                  href="/employer/shifts/new"
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  {t('btn.postShift')}
                </Link>
              </>
            }
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
              renderEmptyDay={(day) => day < todayIso() ? <span>{tx('Ngày trống.')}</span> : (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{tx('Ngày trống.')}</span>
                  <Link href="/employer/shifts/new" className="font-semibold text-orange-700 hover:underline">
                    {t('btn.postShift')}
                  </Link>
                </span>
              )}
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

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{t('employerSchedule.page.title')}</h1>
          <p className="mt-2 max-w-2xl text-base text-gray-600">{t('employerSchedule.page.subtitle')}</p>
          <ScheduleSummary
            label={tx('Tóm tắt tuần đang xem')}
            items={[
              { value: String(summary.count), label: tx('Ca trong tuần') },
              { value: `${summary.filled}/${summary.needed}`, label: tx('Người đã nhận / cần') },
              { value: String(summary.short), label: tx('Ca còn thiếu người'), warn: summary.short > 0 },
            ]}
          />
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
      </header>

      <CalendarShell sidebar={sidebar} toolbar={toolbar} body={body} />

      {/* Hộp chi tiết khi bấm một ca (03/10). */}
      <EventPeek
        open={peekShift !== null}
        onClose={() => setPeekId(null)}
        title={peekShift?.title ?? ''}
        badge={peekEvent?.statusChip}
        rows={
          peekShift
            ? [
                { label: tx('Thời gian'), value: `${formatDateVN(peekShift.date)} · ${peekShift.startTime}–${peekShift.endTime}` },
                { label: tx('Địa điểm'), value: peekShift.location },
                { label: tx('Người đã nhận'), value: `${peekShift.positionsFilled}/${peekShift.positionsTotal}` },
              ]
            : []
        }
        note={
          peekShift && peekEvent && (peekEvent.variant === 'publishedShift' || peekEvent.variant === 'fullyBookedShift') && peekShift.date >= todayIso()
            ? tx('Check-in mở từ {time}, 15 phút trước giờ bắt đầu.').replace('{time}', shiftMilestones(peekShift.startTime, peekShift.endTime)?.checkInOpen.time ?? peekShift.startTime)
            : undefined
        }
        actions={
          peekShift ? (
            <Link
              href={`/employer/shifts/${peekShift.id}`}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {tx('Mở trang quản lý ca')} →
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}
