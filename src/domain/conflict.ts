/**
 * Time-conflict detection for the CaLẻ / ShiftNow MVP (Req 22).
 *
 * Pure TypeScript — no React, no Next, no I/O. Used by the application flow
 * to prevent a worker from double-booking shifts when applying:
 *
 *   "Two ranges conflict iff
 *      (targetStart − 60min) < rEnd  &&  (targetEnd + 60min) > rStart"
 *
 * The 60-minute buffer (Req 22.3) is applied symmetrically around the
 * `target` range only. Each `approved` range contributes its raw start/end.
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

/** Symmetric buffer applied around the target range, in minutes (Req 22.3). */
export const BUFFER_MINUTES = 60;

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
 * Two ranges conflict iff the buffered target window overlaps the raw
 * approved window:
 *
 *   (targetStart − 60min) < rEnd  &&  (targetEnd + 60min) > rStart
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
