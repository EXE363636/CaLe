'use client';

/**
 * Worker personal schedule page (Phase 8 calendar shell).
 *
 * Phase 5 introduced one-time `ScheduleBlock` records and the apply-time
 * conflict gate. Phase 5B reshaped the page into a Mon→Sun timetable.
 * Phase 8 swaps that single grid for the new `CalendarShell` (mini-month
 * + legend sidebar, top toolbar, Day / Week / Agenda body) and folds the
 * worker's approved / pending / cancellation-requested shifts onto the
 * same canvas as their personal busy blocks.
 *
 * Hard rules (per HANDOFF.md Section 11):
 *  - Zustand selectors return only stable raw arrays. All `.filter` /
 *    `.map` derivations live in `useMemo` over those arrays.
 *  - The schedule store API, `ScheduleBlockDialog` form, and the apply
 *    conflict gate (`domain/scheduleConflict.ts`) are NOT touched here.
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
  EmptyState,
  Input,
  Modal,
  Textarea,
} from '@/components/ui';
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

  // Personal busy blocks for the current user.
  const myBlocks = useMemo<ScheduleBlock[]>(() => {
    if (!currentUserId) return [];
    return blocks.filter((b) => b.userId === currentUserId);
  }, [blocks, currentUserId]);

  // Applications that should appear on the calendar: this worker's
  // Approved / Pending / CancellationRequested rows. Rejected and
  // CancelledByWorker rows are intentionally hidden.
  const myCalendarApplications = useMemo<Application[]>(() => {
    if (!currentUserId) return [];
    return applications.filter(
      (a) =>
        a.workerId === currentUserId &&
        (a.status === 'Approved' ||
          a.status === 'Pending' ||
          a.status === 'CancellationRequested'),
    );
  }, [applications, currentUserId]);

  // O(1) shift lookup keyed by id — saves a linear scan per application.
  const shiftIndex = useMemo<Map<string, Shift>>(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts) map.set(s.id, s);
    return map;
  }, [shifts]);

  // Single calendar-event array fed to every body view. Personal blocks
  // and approved/pending shifts share one array so the views can
  // stack/sort them uniformly. IDs are prefixed so the click handler can
  // dispatch by source.
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const out: CalendarEvent[] = [];

    for (const block of myBlocks) {
      out.push({
        id: `block-${block.id}`,
        title: block.title,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        variant: 'personalBusy',
        subtitle: block.note,
      });
    }

    for (const app of myCalendarApplications) {
      const shift = shiftIndex.get(app.shiftId);
      if (!shift) continue;
      // Hide shifts that are no longer relevant (cancelled / completed /
      // expired) — they shouldn't clutter the worker's planner even if
      // their application row still exists.
      if (TERMINAL_SHIFT_STATUSES.has(shift.status)) continue;

      const variant: CalendarEvent['variant'] =
        app.status === 'Approved'
          ? 'approvedShift'
          : app.status === 'Pending'
          ? 'pendingShift'
          : 'cancelledShift';

      out.push({
        id: `app-${app.id}`,
        title: shift.title,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        variant,
        subtitle: shift.location,
      });
    }

    return out;
  }, [myBlocks, myCalendarApplications, shiftIndex]);

  // Sorted version for the fallback flat list at the bottom of the page.
  // Workers may have busy blocks outside the visible calendar window, and
  // delete affordance still lives there.
  const flatList = useMemo(() => {
    return [...myBlocks].sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
  }, [myBlocks]);

  // -------------------------------------------------------------------------
  // Toolbar title + nav
  // -------------------------------------------------------------------------

  const toolbarTitle = useMemo(() => {
    if (view === 'day') {
      return formatDateVN(selectedDateIso);
    }
    if (view === 'week') {
      const ws = startOfWeek(selectedDateIso);
      const we = stepDate(ws, 6);
      return `${formatDateVN(ws)} – ${formatDateVN(we)}`;
    }
    // agenda
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
      return stepDate(iso, -7); // agenda
    });
  }

  function handleNext() {
    setSelectedDateIso((iso) => {
      if (view === 'week') return shiftWeek(startOfWeek(iso), 1);
      if (view === 'day') return stepDate(iso, 1);
      return stepDate(iso, 7); // agenda
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
    setModalSeed({
      block: null,
      prefill: { date, startTime, endTime },
    });
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
      setActionError(t(`schedule.error.${result.error}`));
    }
  }

  // Calendar event click — dispatch by id prefix.
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
      <MiniMonthCalendar
        selectedDateIso={selectedDateIso}
        onSelectDate={setSelectedDateIso}
      />
      <Card>
        <CalendarLegend variant="worker" />
      </Card>
      <Card className="bg-orange-50 ring-1 ring-orange-100">
        <p className="text-xs text-orange-700">
          {t('schedule.page.approvedShiftsNote')}
        </p>
      </Card>
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
      {/* Slot-config form: a single Card above the body keeps the
          existing "Cấu hình khung giờ" affordance without crowding the
          sidebar. Day-grid views consume this; Agenda ignores it. */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-gray-900">
          {t('schedule.slotCfg.title')}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label={t('schedule.slotCfg.dayStart')}
            type="time"
            value={slotCfg.dayStart}
            onChange={(e) => handleSlotCfgChange({ dayStart: e.target.value })}
            className="w-32"
          />
          <Input
            label={t('schedule.slotCfg.dayEnd')}
            type="time"
            value={slotCfg.dayEnd}
            onChange={(e) => handleSlotCfgChange({ dayEnd: e.target.value })}
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
      </Card>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* The active body view. */}
      {view === 'week' && (
        slotsValid ? (
          <WeekView
            weekStart={startOfWeek(selectedDateIso)}
            slotConfig={slotCfg}
            events={calendarEvents}
            onCellClick={openCreateForSlot}
            onEventClick={handleEventClick}
          />
        ) : (
          <Card>
            <p className="py-6 text-center text-sm text-gray-400">
              {slotCfgError ?? t('schedule.slotCfg.error.INVALID_TIME_RANGE')}
            </p>
          </Card>
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
          <Card>
            <p className="py-6 text-center text-sm text-gray-400">
              {slotCfgError ?? t('schedule.slotCfg.error.INVALID_TIME_RANGE')}
            </p>
          </Card>
        )
      )}

      {view === 'agenda' && (
        <AgendaView
          startDateIso={selectedDateIso}
          dayCount={7}
          events={calendarEvents}
          onEventClick={handleEventClick}
          emptyMessage={t('calendar.empty.worker')}
        />
      )}

      {/* Flat fallback list — kept so workers can still delete blocks
          without finding them on the timetable. */}
      <section className="mt-2">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {t('schedule.list.title')}
        </h2>
        {flatList.length === 0 ? (
          <EmptyState
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('schedule.page.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('schedule.page.subtitle')}</p>
      </header>

      <CalendarShell sidebar={sidebar} toolbar={toolbar} body={body} />

      {/* Add / edit dialog (preserved verbatim from Phase 5B). */}
      <ScheduleBlockDialog
        seed={modalSeed}
        userId={currentUserId}
        onClose={closeModal}
      />
    </div>
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
          <p className="mt-0.5 text-xs text-gray-500">
            {formatDateVN(block.date)} • {formatTimeVN(block.startTime)}–
            {formatTimeVN(block.endTime)}
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
// Add / edit dialog (preserved verbatim from Phase 5B)
// ---------------------------------------------------------------------------

function ScheduleBlockDialog({
  seed,
  userId,
  onClose,
}: {
  seed: ModalSeed | null;
  userId: string;
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
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever the dialog opens (or the seed changes).
  // Closed dialogs keep their state so a typo is not lost between toggles.
  useEffect(() => {
    if (!open || !seed) return;
    if (seed.block) {
      setTitle(seed.block.title);
      setDate(seed.block.date);
      setStartTime(seed.block.startTime);
      setEndTime(seed.block.endTime);
      setNote(seed.block.note ?? '');
    } else {
      setTitle('');
      setDate(seed.prefill?.date ?? '');
      setStartTime(seed.prefill?.startTime ?? '');
      setEndTime(seed.prefill?.endTime ?? '');
      setNote('');
    }
    setError(null);
  }, [open, seed]);

  if (!open || !seed) return null;

  function handleSubmit() {
    if (!seed) return;
    setError(null);
    const result = seed.block
      ? update(seed.block.id, userId, { title, date, startTime, endTime, note })
      : add({ userId, title, date, startTime, endTime, note });
    if (!result.ok) {
      setError(t(`schedule.error.${result.error}`));
      return;
    }
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
        <Input
          label={t('schedule.form.date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Input
            label={t('schedule.form.startTime')}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1"
            required
          />
          <Input
            label={t('schedule.form.endTime')}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
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
