'use client';

/**
 * Worker personal schedule page (Phase 8 calendar shell + Phase 9B polish).
 *
 * Phase 5 introduced one-time `ScheduleBlock` records and the apply-time
 * conflict gate. Phase 5B reshaped the page into a Mon→Sun timetable.
 * Phase 8 swapped that grid for the new `CalendarShell` (sidebar + toolbar
 * + Day/Week/Agenda body). Phase 9B layers visual polish on top, plus:
 *
 *   - Personal busy blocks may not overlap **confirmed work shifts**
 *     (Approved / CheckedIn / CheckedOut / CancellationRequested) — gate
 *     enforced on add and on edit. Pure UI validation; the apply-time
 *     gate (`applicationStore.apply`) remains untouched.
 *   - All native date / time inputs replaced with `DateFieldVN` and
 *     `TimeFieldVN` so Vietnamese users always see `dd/mm/yyyy` and
 *     `HH:mm` regardless of OS locale.
 *   - Slot-config form collapsed into a `<details>` to give the
 *     calendar more room on mobile.
 *   - Approved shifts on the calendar render a small lock glyph + the
 *     localized label "Ca đã duyệt" so they read as read-only.
 *
 * Hard rules (per HANDOFF.md Section 11):
 *  - Zustand selectors return only stable raw arrays. All `.filter` /
 *    `.map` derivations live in `useMemo` over those arrays.
 *  - The schedule store API and `domain/scheduleConflict.ts.findScheduleConflicts`
 *    apply-time gate are NOT touched here.
 *  - localStorage / mock only — no server, no calendar sync.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CalendarLegend } from '@/components/calendar/CalendarLegend';
import { CalendarShell } from '@/components/calendar/CalendarShell';
import {
  CalendarToolbar,
  type CalendarView,
} from '@/components/calendar/CalendarToolbar';
import { MiniMonthCalendar } from '@/components/calendar/MiniMonthCalendar';
import { WeekView, type CalendarEvent } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { RoleGuard } from '@/components/layout/RoleGuard';
import {
  Button,
  Card,
  DateFieldVN,
  EmptyState,
  Input,
  Modal,
  PageHelpButton,
  Textarea,
  TimeFieldVN,
} from '@/components/ui';
import { findShiftOverlap } from '@/domain/scheduleConflict';
import {
  formatMonthYearVN,
  shiftWeek,
  startOfWeek,
  todayIso,
  validateSlotConfig,
  type SlotConfig,
} from '@/domain/week';
import { t } from '@/i18n/vi';
import { formatDateVN, formatTimeVN } from '@/lib/format';
import { showSuccess, showError } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useShiftStore } from '@/stores/shiftStore';
import type { Application, ScheduleBlock, Shift, ShiftStatus } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  dayStart: '07:00',
  dayEnd: '21:00',
  slotMinutes: 120,
};

/** Shifts in any of these statuses are not surfaced on the worker calendar. */
const TERMINAL_SHIFT_STATUSES: ReadonlySet<ShiftStatus> = new Set([
  'Cancelled',
  'Completed',
  'Expired',
]);

interface ModalSeed {
  /** When provided, edit mode. */
  block: ScheduleBlock | null;
  /** When provided (create mode), prefill date + start/end from a slot click. */
  prefill: {
    date: string;
    startTime: string;
    endTime: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Add `n` whole days to a `YYYY-MM-DD` string, anchored at local midnight. */
function stepDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkerSchedulePage() {
  return (
    <RoleGuard role="worker">
      <SchedulePageContent />
    </RoleGuard>
  );
}

function SchedulePageContent() {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.currentUserId);

  // Stable raw selectors. NEVER inline `.filter` / `.map` in a Zustand
  // selector — see HANDOFF.md Section 11.
  const blocks = useScheduleStore((s) => s.blocks);
  const remove = useScheduleStore((s) => s.remove);
  const applications = useApplicationStore((s) => s.applications);
  const shifts = useShiftStore((s) => s.shifts);

  // -------------------------------------------------------------------------
  // View state
  // -------------------------------------------------------------------------
  const [view, setView] = useState<CalendarView>('week');
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => todayIso());
  const [slotCfg, setSlotCfg] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [slotCfgError, setSlotCfgError] = useState<string | null>(null);

  const [modalSeed, setModalSeed] = useState<ModalSeed | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const myBlocks = useMemo<ScheduleBlock[]>(() => {
    if (!currentUserId) return [];
    return blocks.filter((b) => b.userId === currentUserId);
  }, [blocks, currentUserId]);

  const myCalendarApplications = useMemo<Application[]>(() => {
    if (!currentUserId) return [];
    return applications.filter(
      (a) =>
        a.workerId === currentUserId &&
        (a.status === 'Approved' ||
          a.status === 'Pending' ||
          a.status === 'CancellationRequested' ||
          a.status === 'CheckedIn' ||
          a.status === 'CheckedOut'),
    );
  }, [applications, currentUserId]);

  const shiftIndex = useMemo<Map<string, Shift>>(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts) map.set(s.id, s);
    return map;
  }, [shifts]);

  // Single calendar-event array fed to every body view. IDs are prefixed
  // so `handleEventClick` can dispatch to edit-dialog vs `/shifts/[id]`.
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const out: CalendarEvent[] = [];

    for (const block of myBlocks) {
      const isAvailable = block.kind === 'available';
      out.push({
        id: `block-${block.id}`,
        title: block.title,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        variant: isAvailable ? 'availableSlot' : 'personalBusy',
        subtitle: block.note
          ? block.note
          : isAvailable
            ? t('schedule.event.availableLabel')
            : t('schedule.event.personalLabel'),
      });
    }

    for (const app of myCalendarApplications) {
      const shift = shiftIndex.get(app.shiftId);
      if (!shift) continue;
      if (TERMINAL_SHIFT_STATUSES.has(shift.status)) continue;

      const variant: CalendarEvent['variant'] =
        app.status === 'Approved' ||
        app.status === 'CheckedIn' ||
        app.status === 'CheckedOut'
          ? 'approvedShift'
          : app.status === 'Pending'
            ? 'pendingShift'
            : 'cancelledShift';

      // Phase 9B — confirmed work shifts get the orange "Ca đã duyệt"
      // lock chip so they read as read-only. `CancellationRequested`
      // already renders with the red `cancelledShift` variant + line-
      // through, which carries its own meaning ("đang chờ huỷ"); adding
      // an orange "approved" lock on top would say two different things
      // at once. The shift-overlap guard in the dialog still treats
      // `CancellationRequested` as a confirmed slot, so the worker can't
      // book over it — we just don't double-label the chip.
      const isLocked =
        app.status === 'Approved' ||
        app.status === 'CheckedIn' ||
        app.status === 'CheckedOut';

      out.push({
        id: `app-${app.id}`,
        title: shift.title,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        variant,
        subtitle: shift.location,
        statusChip: isLocked ? <LockedChip /> : undefined,
      });
    }

    return out;
  }, [myBlocks, myCalendarApplications, shiftIndex]);

  const flatList = useMemo(() => {
    return [...myBlocks].sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
  }, [myBlocks]);

  // -------------------------------------------------------------------------
  // Toolbar title + nav
  // -------------------------------------------------------------------------

  const toolbarTitle = useMemo(() => {
    if (view === 'day') return formatDateVN(selectedDateIso);
    if (view === 'week') {
      const ws = startOfWeek(selectedDateIso);
      const we = stepDate(ws, 6);
      return `${formatDateVN(ws)} – ${formatDateVN(we)}`;
    }
    const year = Number(selectedDateIso.slice(0, 4));
    const month = Number(selectedDateIso.slice(5, 7));
    if (Number.isFinite(year) && Number.isFinite(month)) {
      return formatMonthYearVN(year, month);
    }
    return '';
  }, [view, selectedDateIso]);

  function handlePrev() {
    setSelectedDateIso((iso) => {
      if (view === 'week') return shiftWeek(startOfWeek(iso), -1);
      if (view === 'day') return stepDate(iso, -1);
      return stepDate(iso, -7);
    });
  }
  function handleNext() {
    setSelectedDateIso((iso) => {
      if (view === 'week') return shiftWeek(startOfWeek(iso), 1);
      if (view === 'day') return stepDate(iso, 1);
      return stepDate(iso, 7);
    });
  }
  function handleToday() {
    setSelectedDateIso(todayIso());
  }

  // -------------------------------------------------------------------------
  // Dialog open/close
  // -------------------------------------------------------------------------

  function openCreateForSlot(date: string, startTime: string, endTime: string) {
    setActionError(null);
    setModalSeed({ block: null, prefill: { date, startTime, endTime } });
  }
  function openEdit(block: ScheduleBlock) {
    setActionError(null);
    setModalSeed({ block, prefill: null });
  }
  function openCreateBlank() {
    setActionError(null);
    setModalSeed({ block: null, prefill: null });
  }
  function closeModal() {
    setModalSeed(null);
  }

  function handleDelete(id: string) {
    if (!currentUserId) return;
    setActionError(null);
    const result = remove(id, currentUserId);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setActionError(message);
      showError(message);
    } else {
      showSuccess(t('feedback.schedule.delete.success'));
    }
  }

  // Calendar event click — dispatch by id prefix. Approved-shift events
  // navigate to `/shifts/[id]` (read-only, no edit dialog) per Phase 9B.
  function handleEventClick(event: CalendarEvent) {
    if (event.id.startsWith('block-')) {
      const blockId = event.id.slice('block-'.length);
      const block = myBlocks.find((b) => b.id === blockId);
      if (block) openEdit(block);
      return;
    }
    if (event.id.startsWith('app-')) {
      const appId = event.id.slice('app-'.length);
      const app = myCalendarApplications.find((a) => a.id === appId);
      if (!app) return;
      const shift = shiftIndex.get(app.shiftId);
      if (!shift) return;
      router.push(`/shifts/${shift.id}`);
    }
  }

  // -------------------------------------------------------------------------
  // Slot-config form
  // -------------------------------------------------------------------------

  function handleSlotCfgChange(patch: Partial<SlotConfig>) {
    const next = { ...slotCfg, ...patch };
    const validation = validateSlotConfig(next);
    setSlotCfg(next);
    setSlotCfgError(
      validation.ok ? null : t(`schedule.slotCfg.error.${validation.error}`),
    );
  }

  if (!currentUserId) return null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const sidebar = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-orange-100 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
        <MiniMonthCalendar
          selectedDateIso={selectedDateIso}
          onSelectDate={setSelectedDateIso}
          className="border-0 shadow-none"
        />
      </div>
      <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <CalendarLegend variant="worker" />
      </div>
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-sm">
        <p className="text-xs leading-relaxed text-orange-800">
          {t('schedule.page.approvedShiftsNote')}
        </p>
      </div>
    </div>
  );

  const toolbar = (
    <CalendarToolbar
      title={toolbarTitle}
      view={view}
      onViewChange={setView}
      onPrev={handlePrev}
      onNext={handleNext}
      onToday={handleToday}
      actions={
        <Button size="sm" variant="primary" onClick={openCreateBlank}>
          {t('schedule.btn.add')}
        </Button>
      }
    />
  );

  const slotsValid = slotCfgError === null;

  const body = (
    <div className="flex flex-col gap-4">
      {/* Phase 9B: slot config tucked inside a collapsible `<details>` so
          it doesn't dominate the body on mobile. The summary uses a custom
          chevron because Tailwind's `marker:hidden` doesn't reach Safari's
          `::-webkit-details-marker` (already handled in globals.css). */}
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
            value={Number.isFinite(slotCfg.slotMinutes) ? slotCfg.slotMinutes : ''}
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

      {actionError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Calendar body — wrapped in a soft white panel so the whole grid
          reads as a real product surface, not a bare table. */}
      <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-card backdrop-blur-sm">
        {view === 'week' && (
          slotsValid ? (
            <WeekView
              weekStart={startOfWeek(selectedDateIso)}
              slotConfig={slotCfg}
              events={calendarEvents}
              onCellClick={openCreateForSlot}
              onEventClick={handleEventClick}
              className="rounded-2xl"
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">
              {slotCfgError ?? t('schedule.slotCfg.error.INVALID_TIME_RANGE')}
            </p>
          )
        )}

        {view === 'day' && (
          slotsValid ? (
            <DayView
              dateIso={selectedDateIso}
              slotConfig={slotCfg}
              events={calendarEvents}
              onCellClick={openCreateForSlot}
              onEventClick={handleEventClick}
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">
              {slotCfgError ?? t('schedule.slotCfg.error.INVALID_TIME_RANGE')}
            </p>
          )
        )}

        {view === 'agenda' && (
          <div className="p-4 sm:p-6">
            <AgendaView
              startDateIso={selectedDateIso}
              dayCount={7}
              events={calendarEvents}
              onEventClick={handleEventClick}
              emptyMessage={t('calendar.empty.worker')}
            />
          </div>
        )}
      </div>

      {/* Flat fallback list — kept so workers can still delete blocks
          without finding them on the timetable. */}
      <section className="mt-2">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {t('schedule.list.title')}
        </h2>
        {flatList.length === 0 ? (
          <EmptyState
            tone="warm"
            title={t('schedule.empty.title')}
            description={t('schedule.empty.description')}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {flatList.map((block) => (
              <BlockRow
                key={block.id}
                block={block}
                onEdit={() => openEdit(block)}
                onDelete={() => handleDelete(block.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Phase 9G — removed the floating blurred orange/amber circles
          that previously sat behind the schedule. The body's calm
          warm-cream chrome already provides surface treatment for the
          calendar grid; the extra blobs added clutter without value. */}

      <header className="entrance-up mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('nav.schedule')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('schedule.page.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {t('schedule.page.subtitle')}
            </p>
          </div>
          <PageHelpButton
            title={t('help.workerSchedule.title')}
            intro={t('help.workerSchedule.intro')}
            sections={[
              {
                heading: t('help.workerSchedule.section.purpose.heading'),
                items: [t('help.workerSchedule.section.purpose.item1')],
              },
              {
                heading: t('help.workerSchedule.section.numbers.heading'),
                items: [
                  t('help.workerSchedule.section.numbers.item1'),
                  t('help.workerSchedule.section.numbers.item2'),
                ],
              },
              {
                heading: t('help.workerSchedule.section.actions.heading'),
                items: [
                  t('help.workerSchedule.section.actions.item1'),
                  t('help.workerSchedule.section.actions.item2'),
                  t('help.workerSchedule.section.actions.item3'),
                ],
              },
              {
                heading: t('help.workerSchedule.section.mistakes.heading'),
                items: [
                  t('help.workerSchedule.section.mistakes.item1'),
                  t('help.workerSchedule.section.mistakes.item2'),
                ],
              },
            ]}
            cta={{ label: t('help.viewFullGuide'), href: '/user-guide' }}
          />
        </div>
      </header>

      <CalendarShell sidebar={sidebar} toolbar={toolbar} body={body} />

      {/* Add / edit dialog (preserved from Phase 5B; date/time inputs
          swapped for the Vietnamese-friendly fields in Phase 9B, plus
          shift-overlap guard added). */}
      <ScheduleBlockDialog
        seed={modalSeed}
        userId={currentUserId}
        myApplications={myCalendarApplications}
        shiftIndex={shiftIndex}
        myBlocks={myBlocks}
        onClose={closeModal}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Locked chip — tiny inline indicator on approved-shift events
// ---------------------------------------------------------------------------

function LockedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200">
      <svg
        className="h-2.5 w-2.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      {t('schedule.event.lockedLabel')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Flat list row (preserved from Phase 5)
// ---------------------------------------------------------------------------

function BlockRow({
  block,
  onEdit,
  onDelete,
}: {
  block: ScheduleBlock;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {block.title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>
              {formatDateVN(block.date)} • {formatTimeVN(block.startTime)}–
              {formatTimeVN(block.endTime)}
            </span>
            <span
              className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                block.kind === 'available'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
              ].join(' ')}
            >
              {block.kind === 'available'
                ? t('schedule.kind.available')
                : t('schedule.kind.busy')}
            </span>
          </p>
          {block.note && (
            <p className="mt-1.5 whitespace-pre-line text-sm text-gray-700">
              {block.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {t('btn.edit')}
          </Button>
          {!confirmDelete ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t('btn.delete')}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete();
                  setConfirmDelete(false);
                }}
              >
                {t('schedule.btn.confirmDelete')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                {t('btn.cancel')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add / edit dialog (Phase 5B form, Phase 9B inputs + shift-overlap gate)
// ---------------------------------------------------------------------------

function ScheduleBlockDialog({
  seed,
  userId,
  myApplications,
  shiftIndex,
  myBlocks,
  onClose,
}: {
  seed: ModalSeed | null;
  userId: string;
  myApplications: Application[];
  shiftIndex: Map<string, Shift>;
  myBlocks: ScheduleBlock[];
  onClose: () => void;
}) {
  const add = useScheduleStore((s) => s.add);
  const update = useScheduleStore((s) => s.update);

  const open = seed !== null;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<'busy' | 'available'>('busy');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !seed) return;
    if (seed.block) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional dialog field sync from seed prop on open; refactor would change edit/prefill behavior
      setTitle(seed.block.title);
      setDate(seed.block.date);
      setStartTime(seed.block.startTime);
      setEndTime(seed.block.endTime);
      setNote(seed.block.note ?? '');
      setKind(seed.block.kind === 'available' ? 'available' : 'busy');
    } else {
      setTitle('');
      setDate(seed.prefill?.date ?? '');
      setStartTime(seed.prefill?.startTime ?? '');
      setEndTime(seed.prefill?.endTime ?? '');
      setNote('');
      setKind('busy');
    }
    setError(null);
  }, [open, seed]);

  if (!open || !seed) return null;

  function handleSubmit() {
    if (!seed) return;
    setError(null);

    // Phase 9B client-side guards. We let the store own the canonical
    // validation (required fields, time-range, owner-mismatch) — these
    // checks add UX-friendly preconditions that surface localized errors
    // before the round-trip.

    if (date === '' || startTime === '' || endTime === '') {
      setError(t('schedule.error.TIME_REQUIRED'));
      return;
    }

    // End-after-start sanity. The store also checks this but its error
    // code is `TIME_RANGE_INVALID`; we surface the friendlier message
    // here so the user doesn't see a bare error key.
    if (endTime <= startTime) {
      setError(t('error.endBeforeStart'));
      return;
    }

    // Phase 9B — block-vs-shift overlap. Worker can't create or edit a
    // personal busy block over an approved/checked-in/checked-out
    // /cancellation-requested work shift. CORE-STABILITY-9 Part 5 —
    // availability blocks are exempt: marking yourself "rảnh" over a
    // window that already holds an approved shift is harmless (the
    // shift simply takes precedence), so only BUSY blocks are gated.
    if (kind === 'busy') {
      const overlap = findShiftOverlap(
        { date, startTime, endTime },
        myApplications,
        shiftIndex,
      );
      if (overlap) {
        setError(t('error.shiftOverlap'));
        return;
      }
    }

    void myBlocks; // intentionally unused — store handles block↔block uniqueness

    const result = seed.block
      ? update(seed.block.id, userId, { title, date, startTime, endTime, note, kind })
      : add({ userId, title, date, startTime, endTime, note, kind });
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setError(message);
      showError(message);
      return;
    }
    showSuccess(
      seed.block
        ? t('feedback.schedule.update.success')
        : t('feedback.schedule.add.success'),
    );
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        seed.block
          ? t('schedule.dialog.editTitle')
          : t('schedule.dialog.addTitle')
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label={t('schedule.form.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-gray-700">
            {t('schedule.kind.label')}
          </legend>
          <p className="text-xs text-gray-500">{t('schedule.kind.helper')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('available')}
              aria-pressed={kind === 'available'}
              className={[
                'rounded-xl border px-3 py-2 text-left text-sm transition',
                kind === 'available'
                  ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              {t('schedule.kind.available')}
            </button>
            <button
              type="button"
              onClick={() => setKind('busy')}
              aria-pressed={kind === 'busy'}
              className={[
                'rounded-xl border px-3 py-2 text-left text-sm transition',
                kind === 'busy'
                  ? 'border-slate-400 bg-slate-100 font-semibold text-slate-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              {t('schedule.kind.busy')}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {kind === 'available'
              ? t('schedule.kind.availableHint')
              : t('schedule.kind.busyHint')}
          </p>
        </fieldset>
        <DateFieldVN
          label={t('schedule.form.date')}
          value={date}
          onChange={setDate}
          required
        />
        <div className="flex gap-2">
          <TimeFieldVN
            label={t('schedule.form.startTime')}
            value={startTime}
            onChange={setStartTime}
            className="flex-1"
            required
          />
          <TimeFieldVN
            label={t('schedule.form.endTime')}
            value={endTime}
            onChange={setEndTime}
            className="flex-1"
            required
          />
        </div>
        <Textarea
          label={t('schedule.form.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('btn.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {t('btn.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
