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
 *
 * Supabase (migration 0023): the server is the source of truth.
 * `refetchMine` loads the worker's blocks; mutations stay synchronous and
 * optimistic (same `Result` API), are pushed to the server in the
 * background and reverted on failure (`syncError`). If the server has no
 * `schedule_blocks` yet (0023 not applied) the store falls back to
 * device-only storage (`serverSync: 'off'`).
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import {
  ScheduleBackendMissingError,
  deleteScheduleBlock,
  listMyScheduleBlocks,
  upsertScheduleBlock,
} from '@/data/repos/scheduleRepo';
import { isSupabaseEnv } from '@/data/supabaseClient';
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

/**
 * Server sync state (supabase only). `unknown` until the first load;
 * `on` = blocks live on the server; `off` = server has no table yet →
 * device-only storage.
 */
export type ScheduleServerSync = 'unknown' | 'on' | 'off';

/** Last background sync failure, surfaced by the schedule page. */
export type ScheduleSyncError = 'LOAD_FAILED' | 'SAVE_FAILED' | null;

interface ScheduleStore {
  blocks: ScheduleBlock[];
  serverSync: ScheduleServerSync;
  syncError: ScheduleSyncError;

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

  /** Supabase: load the signed-in worker's blocks from the server. */
  refetchMine(userId: string): Promise<void>;
  clearSyncError(): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

function persist(blocks: ScheduleBlock[]): void {
  write(STORAGE_KEYS.scheduleBlocks, blocks);
}

/** Server ids are uuids; local/demo keeps the legacy `sched-…` prefix. */
function newBlockId(): string {
  if (isSupabaseEnv() && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return newPrefixedId('sched');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One-time upload marker per user: blocks saved on this device BEFORE the
 * server table existed are uploaded once; afterwards the server list wins
 * (so a block deleted on another device is not resurrected from this cache).
 */
function uploadedMarkerKey(userId: string): string {
  return `${STORAGE_KEYS.scheduleBlocks}.uploaded.${userId}`;
}
function readUploaded(userId: string): boolean {
  try {
    return window.localStorage.getItem(uploadedMarkerKey(userId)) === '1';
  } catch {
    return false;
  }
}
function markUploaded(userId: string): void {
  try {
    window.localStorage.setItem(uploadedMarkerKey(userId), '1');
  } catch {
    /* private mode — the upload is simply retried next time (idempotent) */
  }
}

const devWarn = (msg: string, err: unknown): void => {
  if (process.env.NODE_ENV !== 'production') console.warn(msg, err);
};

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

export const useScheduleStore = create<ScheduleStore>((set, get) => {
  /**
   * Push one mutation to the server when sync is on. On failure, apply
   * `revert` to the CURRENT list (edits made meanwhile survive) and flag
   * `SAVE_FAILED` for the page to show.
   */
  function pushToServer(
    run: () => Promise<unknown>,
    revert: (blocks: ScheduleBlock[]) => ScheduleBlock[],
  ): void {
    if (get().serverSync !== 'on') return;
    void run().catch((err: unknown) => {
      devWarn('[schedule] sync failed', err);
      const next = revert(get().blocks);
      set({ blocks: next, syncError: 'SAVE_FAILED' });
      persist(next);
    });
  }

  return {
    blocks: [],
    serverSync: 'unknown',
    syncError: null,

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
        id: newBlockId(),
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
      pushToServer(
        () => upsertScheduleBlock(block),
        (cur) => cur.filter((b) => b.id !== block.id),
      );
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
      pushToServer(
        () => upsertScheduleBlock(updated),
        (cur) => cur.map((b) => (b.id === id ? existing : b)),
      );
      return { ok: true, value: updated };
    },

    remove(id, userId) {
      const existing = get().getById(id);
      if (!existing) return { ok: false, error: 'NOT_FOUND' };
      if (existing.userId !== userId) return { ok: false, error: 'OWNER_MISMATCH' };

      const next = get().blocks.filter((b) => b.id !== id);
      set({ blocks: next });
      persist(next);
      pushToServer(
        () => deleteScheduleBlock(id),
        (cur) => (cur.some((b) => b.id === id) ? cur : [...cur, existing]),
      );
      return { ok: true, value: true };
    },

    hydrate(blocks) {
      set({ blocks });
    },

    async refetchMine(userId) {
      if (!isSupabaseEnv() || !userId) return;
      set({ syncError: null });
      let server: ScheduleBlock[];
      try {
        server = await listMyScheduleBlocks();
      } catch (err) {
        if (err instanceof ScheduleBackendMissingError) {
          // 0023 chưa apply → giữ lịch trên thiết bị như trước.
          set({ serverSync: 'off' });
          return;
        }
        devWarn('[schedule] load failed', err);
        set({ syncError: 'LOAD_FAILED' });
        return;
      }

      // Upload once: blocks this worker saved on this device before the
      // server table existed (legacy `sched-…` ids get a fresh uuid).
      if (!readUploaded(userId)) {
        const serverIds = new Set(server.map((b) => b.id));
        const pending = get().blocks.filter(
          (b) => b.userId === userId && !serverIds.has(b.id),
        );
        try {
          while (pending.length > 0) {
            const b = pending[0];
            const toSend = UUID_RE.test(b.id) ? b : { ...b, id: newBlockId() };
            server.push(await upsertScheduleBlock(toSend));
            pending.shift();
          }
          markUploaded(userId);
        } catch (err) {
          // Keep what didn't upload (never drop the worker's data); the
          // marker stays unset so the next load retries.
          devWarn('[schedule] upload failed', err);
          server.push(...pending);
          set({ syncError: 'SAVE_FAILED' });
        }
      }

      // Server list is the truth for this worker.
      set((st) => ({
        blocks: server,
        serverSync: 'on',
        syncError: st.syncError === 'SAVE_FAILED' ? st.syncError : null,
      }));
      persist(server);
    },

    clearSyncError() {
      set({ syncError: null });
    },
  };
});
