'use client';

/**
 * Worker personal schedule page (Phase 5 + Phase 5B).
 *
 * Phase 5 introduced one-time `ScheduleBlock` records and the apply-time
 * conflict gate. Phase 5B reshapes this page into a Monday→Sunday weekly
 * timetable so workers can manage busy time the way they think about it
 * (like a school timetable). The list view is preserved at the bottom as
 * a flat fallback.
 *
 * Intentional limitations for the MVP:
 *  - One-time blocks only — no recurring weekly schedules.
 *  - No calendar widget, no Google Calendar, no server sync.
 *  - Slot configuration is local UI state only — not persisted.
 *  - localStorage / mock only.
 */

import { useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Textarea,
} from '@/components/ui';
import {
  generateSlots,
  rangesOverlap,
  shiftWeek,
  startOfWeek,
  todayIso,
  validateSlotConfig,
  weekDates,
  type SlotConfig,
  type TimeSlot,
} from '@/domain/week';
import { formatDateVN, formatTimeVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { ScheduleBlock } from '@/types';

const WEEKDAY_LABELS: readonly string[] = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  dayStart: '07:00',
  dayEnd: '21:00',
  slotMinutes: 120,
};

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

export default function WorkerSchedulePage() {
  return (
    <RoleGuard role="worker">
      <SchedulePageContent />
    </RoleGuard>
  );
}

function SchedulePageContent() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  // Select the stable raw `blocks` array. Filtering / sorting is derived
  // below in `useMemo` so we never feed Zustand a fresh-array selector.
  const blocks = useScheduleStore((s) => s.blocks);
  const remove = useScheduleStore((s) => s.remove);

  const [weekStart, setWeekStart] = useState<string>(() => startOfWeek(todayIso()));
  const [slotCfg, setSlotCfg] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [slotCfgError, setSlotCfgError] = useState<string | null>(null);

  const [modalSeed, setModalSeed] = useState<ModalSeed | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Per-user list (used by the timetable cell logic AND the fallback list).
  const myBlocks = useMemo(() => {
    if (!currentUserId) return [];
    return blocks.filter((b) => b.userId === currentUserId);
  }, [blocks, currentUserId]);

  // Days of the currently-displayed week.
  const days = useMemo(() => weekDates(weekStart), [weekStart]);

  // Slot rows derived from the config; falls back to an empty list when
  // the config is invalid (the form-error UI surfaces the reason).
  const slots = useMemo(() => generateSlots(slotCfg), [slotCfg]);

  // Blocks that fall inside the current week, indexed by date for O(1)
  // cell lookup. Sorted by `startTime` so multiple blocks in the same
  // cell render in chronological order.
  const blocksByDate = useMemo(() => {
    const set = new Set(days);
    const map = new Map<string, ScheduleBlock[]>();
    for (const b of myBlocks) {
      if (!set.has(b.date)) continue;
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [myBlocks, days]);

  // Sorted version for the fallback flat list at the bottom of the page.
  const flatList = useMemo(() => {
    return [...myBlocks].sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
  }, [myBlocks]);

  if (!currentUserId) return null;

  function openCreateForSlot(date: string, slot: TimeSlot) {
    setActionError(null);
    setModalSeed({
      block: null,
      prefill: {
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
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

  // Validate a slot-config edit before committing it. We always update the
  // visible inputs, but a `slotCfgError` blocks the timetable from re-rendering
  // with garbage values.
  function handleSlotCfgChange(patch: Partial<SlotConfig>) {
    const next = { ...slotCfg, ...patch };
    const validation = validateSlotConfig(next);
    setSlotCfg(next);
    setSlotCfgError(
      validation.ok ? null : t(`schedule.slotCfg.error.${validation.error}`),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('schedule.page.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('schedule.page.subtitle')}</p>
      </header>

      <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
        {t('schedule.page.approvedShiftsNote')}
      </p>

      {/* Week navigation */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
        >
          ← {t('schedule.week.prev')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setWeekStart(startOfWeek(todayIso()))}
        >
          {t('schedule.week.current')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
        >
          {t('schedule.week.next')} →
        </Button>
        <span className="ml-auto text-xs text-gray-500">
          {formatDateVN(days[0])} – {formatDateVN(days[6])}
        </span>
        <Button size="sm" variant="primary" onClick={openCreateBlank}>
          {t('schedule.btn.add')}
        </Button>
      </div>

      {/* Slot config */}
      <Card className="mt-4">
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

      {/* Action error */}
      {actionError && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Timetable */}
      <section className="mt-6">
        {slots.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-gray-400">
              {slotCfgError ?? t('schedule.slotCfg.error.INVALID_TIME_RANGE')}
            </p>
          </Card>
        ) : (
          <Timetable
            days={days}
            slots={slots}
            blocksByDate={blocksByDate}
            onCellClick={openCreateForSlot}
            onBlockClick={openEdit}
          />
        )}
      </section>

      {/* Flat list — kept as an at-a-glance fallback so workers can still
          delete blocks without finding them on the timetable. */}
      <section className="mt-8">
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

      {/* Add / edit dialog */}
      <ScheduleBlockDialog
        seed={modalSeed}
        userId={currentUserId}
        onClose={closeModal}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timetable grid
// ---------------------------------------------------------------------------

function Timetable({
  days,
  slots,
  blocksByDate,
  onCellClick,
  onBlockClick,
}: {
  days: string[];
  slots: TimeSlot[];
  blocksByDate: Map<string, ScheduleBlock[]>;
  onCellClick: (date: string, slot: TimeSlot) => void;
  onBlockClick: (block: ScheduleBlock) => void;
}) {
  const todayStr = todayIso();
  const weekHasNoBlocks = Array.from(blocksByDate.values()).every(
    (list) => list.length === 0,
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-500">
              {t('schedule.timetable.timeColumn')}
            </th>
            {days.map((d, idx) => {
              const isToday = d === todayStr;
              return (
                <th
                  key={d}
                  className={[
                    'border-l border-gray-100 px-2 py-2 text-center text-xs font-semibold',
                    isToday ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700',
                  ].join(' ')}
                >
                  <div>{WEEKDAY_LABELS[idx]}</div>
                  <div className="mt-0.5 font-mono text-[11px] font-normal text-gray-500">
                    {formatDateVN(d)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={`${slot.startTime}-${slot.endTime}`}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-gray-100 bg-gray-50 px-2 py-2 text-left text-[11px] font-mono font-medium text-gray-600 align-top whitespace-nowrap"
              >
                {formatTimeVN(slot.startTime)}–{formatTimeVN(slot.endTime)}
              </th>
              {days.map((d) => {
                const overlapping = (blocksByDate.get(d) ?? []).filter((b) =>
                  rangesOverlap(b.startTime, b.endTime, slot.startTime, slot.endTime),
                );
                return (
                  <TimetableCell
                    key={`${d}-${slot.startTime}`}
                    date={d}
                    slot={slot}
                    blocks={overlapping}
                    onCellClick={onCellClick}
                    onBlockClick={onBlockClick}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {weekHasNoBlocks && (
        <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
          {t('schedule.empty.weekHint')}
        </p>
      )}
    </div>
  );
}

function TimetableCell({
  date,
  slot,
  blocks,
  onCellClick,
  onBlockClick,
}: {
  date: string;
  slot: TimeSlot;
  blocks: ScheduleBlock[];
  onCellClick: (date: string, slot: TimeSlot) => void;
  onBlockClick: (block: ScheduleBlock) => void;
}) {
  const empty = blocks.length === 0;

  if (empty) {
    return (
      <td className="border-l border-t border-gray-100 align-top">
        <button
          type="button"
          onClick={() => onCellClick(date, slot)}
          aria-label={t('schedule.timetable.addInSlot')}
          className="h-full min-h-[60px] w-full text-left transition-colors hover:bg-orange-50/60 focus:outline-none focus-visible:bg-orange-50"
        >
          <span className="sr-only">{t('schedule.timetable.addInSlot')}</span>
        </button>
      </td>
    );
  }

  return (
    <td className="border-l border-t border-gray-100 align-top">
      <div className="flex min-h-[60px] flex-col gap-1 p-1">
        {blocks.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onBlockClick(b)}
            className="rounded-md bg-orange-100 px-2 py-1 text-left text-[11px] font-medium text-orange-800 ring-1 ring-orange-200 transition-colors hover:bg-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <div className="truncate">{b.title}</div>
            <div className="mt-0.5 font-mono text-[10px] font-normal text-orange-700/80">
              {formatTimeVN(b.startTime)}–{formatTimeVN(b.endTime)}
            </div>
          </button>
        ))}
      </div>
    </td>
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
// Add / edit dialog
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
