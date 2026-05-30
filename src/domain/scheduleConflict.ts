/**
 * Schedule-conflict detection (Phase 5 + Phase 9B).
 *
 * Pure TypeScript — no React, no Next, no I/O. Focused on a worker's
 * personal busy blocks (`ScheduleBlock`) rather than the existing approved
 * shift list (which lives in `domain/conflict.ts`). The two checks are
 * complementary; the application store consults both gates.
 *
 * Phase 9B adds an inverse helper `findShiftOverlap` used by the worker
 * schedule page to refuse personal busy blocks that would land on top of
 * an already-approved (or in-progress) work shift. The apply-time gates
 * are untouched — this is page-level validation only.
 *
 * Rules:
 *  - Only the same calendar `date` matters. Schedule blocks are one-time,
 *    not recurring (Phase 5 limitation).
 *  - Two ranges on the same date conflict iff `targetStart < blockEnd` AND
 *    `targetEnd > blockStart`. No buffer is applied — workers expect exact
 *    overlap detection on their own calendar; the 60-min buffer only
 *    applies to inter-shift conflicts (Req 22.3) handled by
 *    `domain/conflict.ts`.
 *  - Malformed input strings yield `false` (not a conflict) so the UI
 *    never reports a false positive on garbage data.
 */

import type { Application, ApplicationStatus, ScheduleBlock, Shift } from '@/types';

import type { TimeRange } from './conflict';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function momentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

function rangesOverlap(target: TimeRange, block: ScheduleBlock): boolean {
  if (target.date !== block.date) return false;
  const ts = momentMs(target.date, target.startTime);
  const te = momentMs(target.date, target.endTime);
  const bs = momentMs(block.date, block.startTime);
  const be = momentMs(block.date, block.endTime);

  if (
    Number.isNaN(ts) ||
    Number.isNaN(te) ||
    Number.isNaN(bs) ||
    Number.isNaN(be)
  ) {
    return false;
  }

  return ts < be && te > bs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Predicate: does the `target` shift collide with any of the worker's
 * personal BUSY `blocks`?
 *
 * CORE-STABILITY-9 Part 5 — availability blocks (`kind === 'available'`)
 * are NEVER treated as conflicts; only `'busy'` (or legacy undefined)
 * blocks gate applications.
 */
export function hasScheduleConflict(
  target: TimeRange,
  blocks: ScheduleBlock[],
): boolean {
  for (const b of blocks) {
    if (b.kind === 'available') continue;
    if (rangesOverlap(target, b)) return true;
  }
  return false;
}

/**
 * Return every BUSY block that collides with `target`, preserving input
 * order. Availability blocks are excluded.
 */
export function findScheduleConflicts(
  target: TimeRange,
  blocks: ScheduleBlock[],
): ScheduleBlock[] {
  return blocks.filter((b) => b.kind !== 'available' && rangesOverlap(target, b));
}

// ---------------------------------------------------------------------------
// Phase 9B — block-vs-shift overlap detection
// ---------------------------------------------------------------------------

/**
 * Application statuses that are considered to occupy a confirmed/working
 * slot on the worker's schedule. A worker who already has an approved
 * (or checked-in / checked-out / pending-cancel) work shift on a given
 * day cannot then claim that exact window as "personal busy" without
 * causing a confusing UI state — the calendar would show two overlapping
 * events claiming the same time.
 *
 * `Pending` is intentionally omitted: a pending application is not
 * confirmed work yet, so the worker can still mark personal busy time on
 * the same window (and may decide to cancel the pending application
 * instead). This matches the Phase 5/8 product behavior.
 */
const CONFIRMED_WORK_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'Approved',
  'CheckedIn',
  'CheckedOut',
  'CancellationRequested',
]);

/** Output of `findShiftOverlap` — the offending shift, if any. */
export interface ShiftOverlap {
  shift: Shift;
  application: Application;
}

/**
 * Find the first confirmed/working work shift that the proposed personal
 * busy block (`target`) overlaps with, scoped to the given worker.
 *
 * Used by the worker schedule page (Phase 9B) to refuse adding/editing a
 * personal busy block that would sit on top of an already-approved work
 * shift. Returns `null` when no overlap exists.
 *
 * The worker filtering is the caller's responsibility — pass only that
 * worker's applications. We then resolve each application's shift via the
 * provided `shiftIndex` (`Map<id, Shift>`) and apply the same
 * `same-date + buffer-free overlap` rule as `hasScheduleConflict`.
 *
 * - Applications whose shift is missing from the index are skipped (the
 *   shift store may have just dropped them).
 * - Shifts in terminal states (`Cancelled` / `Completed` / `Expired`)
 *   are also skipped — they no longer occupy schedule space.
 * - When `excludeBlockId` is supplied, applications and their shifts are
 *   not the source of comparison (the parameter exists for symmetry with
 *   future helpers and is currently unused in this function — kept for
 *   API stability with the schedule-block helpers above).
 */
export function findShiftOverlap(
  target: TimeRange,
  applications: Application[],
  shiftIndex: Map<string, Shift>,
): ShiftOverlap | null {
  for (const app of applications) {
    if (!CONFIRMED_WORK_STATUSES.has(app.status)) continue;
    const shift = shiftIndex.get(app.shiftId);
    if (!shift) continue;
    if (
      shift.status === 'Cancelled' ||
      shift.status === 'Completed' ||
      shift.status === 'Expired'
    ) {
      continue;
    }

    const ts = momentMs(target.date, target.startTime);
    const te = momentMs(target.date, target.endTime);
    const bs = momentMs(shift.date, shift.startTime);
    const be = momentMs(shift.date, shift.endTime);
    if (
      Number.isNaN(ts) ||
      Number.isNaN(te) ||
      Number.isNaN(bs) ||
      Number.isNaN(be)
    ) {
      continue;
    }
    if (target.date !== shift.date) continue;
    if (ts < be && te > bs) {
      return { shift, application: app };
    }
  }
  return null;
}
