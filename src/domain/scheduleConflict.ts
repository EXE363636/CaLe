/**
 * Schedule-conflict detection (Phase 5).
 *
 * Pure TypeScript — no React, no Next, no I/O. Focused on a worker's
 * personal busy blocks (`ScheduleBlock`) rather than the existing approved
 * shift list (which lives in `domain/conflict.ts`). The two checks are
 * complementary; the application store consults both gates.
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

import type { ScheduleBlock } from '@/types';

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
 * personal `blocks`?
 */
export function hasScheduleConflict(
  target: TimeRange,
  blocks: ScheduleBlock[],
): boolean {
  for (const b of blocks) {
    if (rangesOverlap(target, b)) return true;
  }
  return false;
}

/**
 * Return every block that collides with `target`, preserving input order.
 * Useful for rendering "conflicts with: <block titles>" UI hints.
 */
export function findScheduleConflicts(
  target: TimeRange,
  blocks: ScheduleBlock[],
): ScheduleBlock[] {
  return blocks.filter((b) => rangesOverlap(target, b));
}
