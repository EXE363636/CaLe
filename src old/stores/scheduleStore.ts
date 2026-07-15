/**
 * Schedule store (Phase 5) — owns the worker-only list of personal busy
 * blocks. One-time `(date, startTime, endTime)` entries only; no recurring
 * weekly schedules in the MVP.
 *
 * Workers add blocks to mark class time, side-jobs, family commitments,
 * etc. The application store consults `forUser(workerId)` when a worker
 * tries to apply, and rejects the apply with `SCHEDULE_CONFLICT` if any
 * block overlaps the target shift on the same date.
 *
 * Persistence follows the existing `STORAGE_KEYS.scheduleBlocks` key. The
 * store exposes a `hydrate` slot for `AppHydrator` to seed from
 * localStorage on boot.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import type { Result, ScheduleBlock } from '@/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ScheduleError =
  | 'NOT_FOUND'
  | 'OWNER_MISMATCH'
  | 'TITLE_REQUIRED'
  | 'DATE_REQUIRED'
  | 'TIME_REQUIRED'
  | 'TIME_RANGE_INVALID';

/** Required fields for creating a new block; `userId` is the owning worker. */
export interface NewScheduleBlockInput {
  userId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
  /** CORE-STABILITY-9 Part 5 — 'busy' (default) or 'available'. */
  kind?: 'busy' | 'available';
}

/** Editable subset of a block — owning user is fixed. */
export interface ScheduleBlockEditablePatch {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  kind?: 'busy' | 'available';
}

interface ScheduleStore {
  blocks: ScheduleBlock[];

  // Reads
  forUser(userId: string): ScheduleBlock[];
  getById(id: string): ScheduleBlock | undefined;

  // Mutators
  add(input: NewScheduleBlockInput): Result<ScheduleBlock, ScheduleError>;
  update(
    id: string,
    userId: string,
    patch: ScheduleBlockEditablePatch,
  ): Result<ScheduleBlock, ScheduleError>;
  remove(id: string, userId: string): Result<true, ScheduleError>;

  /** Hydrate the slice from a persisted snapshot. */
  hydrate(blocks: ScheduleBlock[]): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

function persist(blocks: ScheduleBlock[]): void {
  write(STORAGE_KEYS.scheduleBlocks, blocks);
}

/**
 * Validate a `{ title, date, startTime, endTime }` quad. Returns either
 * `{ ok: true }` or the first failing error code. Trims `title` so trailing
 * whitespace is not accepted as content.
 */
function validateInput(args: {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}): Result<true, ScheduleError> {
  if (args.title !== undefined && args.title.trim() === '') {
    return { ok: false, error: 'TITLE_REQUIRED' };
  }
  if (args.date !== undefined && args.date.trim() === '') {
    return { ok: false, error: 'DATE_REQUIRED' };
  }
  if (
    (args.startTime !== undefined && args.startTime.trim() === '') ||
    (args.endTime !== undefined && args.endTime.trim() === '')
  ) {
    return { ok: false, error: 'TIME_REQUIRED' };
  }
  if (
    args.startTime !== undefined &&
    args.endTime !== undefined &&
    args.endTime <= args.startTime
  ) {
    return { ok: false, error: 'TIME_RANGE_INVALID' };
  }
  return { ok: true, value: true };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  blocks: [],

  forUser(userId) {
    return get().blocks.filter((b) => b.userId === userId);
  },

  getById(id) {
    return get().blocks.find((b) => b.id === id);
  },

  add(input) {
    // All four scalars are required on create.
    const validation = validateInput({
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    });
    if (!validation.ok) return { ok: false, error: validation.error };

    const ts = nowIso();
    const block: ScheduleBlock = {
      id: newPrefixedId('sched'),
      userId: input.userId,
      title: input.title.trim(),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note?.trim() || undefined,
      kind: input.kind ?? 'busy',
      createdAt: ts,
      updatedAt: ts,
    };
    const next = [...get().blocks, block];
    set({ blocks: next });
    persist(next);
    return { ok: true, value: block };
  },

  update(id, userId, patch) {
    const existing = get().getById(id);
    if (!existing) return { ok: false, error: 'NOT_FOUND' };
    if (existing.userId !== userId) return { ok: false, error: 'OWNER_MISMATCH' };

    // Validate only the supplied fields, plus the cross-field time range
    // using the merged values (so changing only `endTime` still gets
    // checked against the existing `startTime`).
    const merged = {
      title: patch.title ?? existing.title,
      date: patch.date ?? existing.date,
      startTime: patch.startTime ?? existing.startTime,
      endTime: patch.endTime ?? existing.endTime,
    };
    const validation = validateInput(merged);
    if (!validation.ok) return { ok: false, error: validation.error };

    const updated: ScheduleBlock = {
      ...existing,
      ...patch,
      title: merged.title.trim(),
      note: patch.note !== undefined ? patch.note.trim() || undefined : existing.note,
      updatedAt: nowIso(),
    };
    const next = get().blocks.map((b) => (b.id === id ? updated : b));
    set({ blocks: next });
    persist(next);
    return { ok: true, value: updated };
  },

  remove(id, userId) {
    const existing = get().getById(id);
    if (!existing) return { ok: false, error: 'NOT_FOUND' };
    if (existing.userId !== userId) return { ok: false, error: 'OWNER_MISMATCH' };

    const next = get().blocks.filter((b) => b.id !== id);
    set({ blocks: next });
    persist(next);
    return { ok: true, value: true };
  },

  hydrate(blocks) {
    set({ blocks });
  },
}));
