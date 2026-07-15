/**
 * Time-conflict detection for the CaLẻ / ShiftNow MVP (Req 22).
 *
 * Pure TypeScript — no React, no Next, no I/O. Used by the application flow
 * to prevent a worker from double-booking shifts when applying:
 *
 *   "Two ranges conflict iff
 *      targetStart < rEnd  &&  targetEnd > rStart"
 *
 * Phase 10C-Stab-1 Batch 3 H — the previous 60-minute symmetric buffer
 * was removed. Workers can now book back-to-back shifts so long as the
 * ranges do not actually overlap. The `BUFFER_MINUTES` constant stays
 * for backwards compatibility but is set to `0` so the formula
 * collapses to pure interval overlap.
 *
 * Inputs are wall-clock pairs:
 *   - `date`      — calendar date as `YYYY-MM-DD`
 *   - `startTime` — 24-hour wall clock as `HH:mm`
 *   - `endTime`   — 24-hour wall clock as `HH:mm`
 *
 * Each `(date, time)` pair is converted to epoch milliseconds via
 * `new Date(\`${date}T${time}:00\`).getTime()`, matching the convention used
 * by `domain/timeGates.ts`. Callers are responsible for passing well-formed
 * strings; malformed inputs yield `NaN` and are treated as non-conflicting
 * so the UI never reports a false positive on garbage data.
 *
 * Pending or rejected applications are intentionally NOT the concern of
 * this module — callers must filter their `approved` list down to actually
 * approved shifts before invoking these functions (Req 22.4).
 */

// ---------------------------------------------------------------------------
// Types and constants
// ---------------------------------------------------------------------------

export interface TimeRange {
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Start of the range, 24-hour `HH:mm`. */
  startTime: string;
  /** End of the range, 24-hour `HH:mm`. */
  endTime: string;
}

/**
 * Symmetric buffer applied around the target range, in minutes.
 *
 * Phase 10C-Stab-1 Batch 3 H — set to `0` so the conflict formula
 * collapses to pure interval overlap. Kept as an exported constant
 * for backwards compatibility with callers / tests that referenced
 * the old name.
 */
export const BUFFER_MINUTES = 0;

const MS_PER_MINUTE = 60 * 1000;
const BUFFER_MS = BUFFER_MINUTES * MS_PER_MINUTE;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Combine a `YYYY-MM-DD` date and `HH:mm` wall-clock time into epoch ms. */
function momentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

/**
 * Two ranges conflict iff the target window overlaps the approved
 * window:
 *
 *   targetStart < rEnd  &&  targetEnd > rStart
 *
 * Phase 10C-Stab-1 Batch 3 H — the 60-minute symmetric buffer was
 * removed; with `BUFFER_MS = 0` the formula collapses to pure
 * interval overlap. The `targetStart - BUFFER_MS` / `targetEnd +
 * BUFFER_MS` arithmetic is preserved so any future re-introduction
 * of a buffer requires only a constant change.
 *
 * Returns `false` when any input produces `NaN` (malformed strings).
 */
function rangesConflict(target: TimeRange, r: TimeRange): boolean {
  const targetStart = momentMs(target.date, target.startTime);
  const targetEnd = momentMs(target.date, target.endTime);
  const rStart = momentMs(r.date, r.startTime);
  const rEnd = momentMs(r.date, r.endTime);

  if (
    Number.isNaN(targetStart) ||
    Number.isNaN(targetEnd) ||
    Number.isNaN(rStart) ||
    Number.isNaN(rEnd)
  ) {
    return false;
  }

  return targetStart - BUFFER_MS < rEnd && targetEnd + BUFFER_MS > rStart;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Predicate: does `target` conflict with any range in `approved`?
 *
 * Returns `false` for an empty `approved` list (Req 22.4 — pending/rejected
 * applications are filtered out by the caller, so an empty list means there
 * is nothing to conflict with).
 */
export function hasConflict(target: TimeRange, approved: TimeRange[]): boolean {
  for (const r of approved) {
    if (rangesConflict(target, r)) return true;
  }
  return false;
}

/**
 * Return every range in `approved` that overlaps the buffered `target`
 * window, preserving input order. Used to render the conflict message
 * required by Req 22.5 ("display conflicting shift details").
 */
export function findConflicts(
  target: TimeRange,
  approved: TimeRange[],
): TimeRange[] {
  return approved.filter((r) => rangesConflict(target, r));
}
