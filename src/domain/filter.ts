/**
 * Shift filter domain module.
 *
 * Pure TypeScript — no React, no Next, no I/O. Backs the public shift
 * listing (Req 4.x), the search bar (Req 19.x), and the publication
 * invariant that ties shift visibility to escrow status (Req 3.3, 29.x).
 *
 * The function is the single source of truth for what is visible on the
 * public listing: a shift only appears if the employer has actually
 * deposited and the start datetime is still in the future.
 */

import type { Shift } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Optional criteria applied on top of the publication invariant.
 *
 * All fields are optional; an empty object returns every shift that passes
 * the publication invariant. String comparisons are case-insensitive.
 */
export interface FilterCriteria {
  /** Free-text query matched case-insensitively against title/location/description. */
  text?: string;
  /** Substring matched case-insensitively against `shift.location`. */
  location?: string;
  /** Inclusive lower bound on `shift.date` (`YYYY-MM-DD`). */
  dateFrom?: string;
  /** Inclusive upper bound on `shift.date` (`YYYY-MM-DD`). */
  dateTo?: string;
  /** Inclusive lower bound on `shift.hourlyWage`. */
  wageMin?: number;
  /** Inclusive upper bound on `shift.hourlyWage`. */
  wageMax?: number;
  /** Exact match on `shift.jobType`. */
  jobType?: string;
  /**
   * ISO 8601 reference time used to drop past shifts. Defaults to the
   * current wall-clock time. Exposed primarily so tests and SSR-safe
   * call sites can pin the comparison.
   */
  now?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shift statuses that are eligible to appear on the public listing. */
const VISIBLE_STATUSES: ReadonlySet<Shift['status']> = new Set([
  'Published',
  'FullyBooked',
]);

/**
 * Build the ISO 8601 instant at which a shift starts.
 *
 * `Shift.date` is `YYYY-MM-DD` and `Shift.startTime` is `HH:mm`; concatenated
 * with a `T` they form a valid local-ISO datetime string that `Date.parse`
 * accepts. We compare instants in milliseconds for a total ordering that
 * does not depend on string layout.
 */
function shiftStartMs(shift: Shift): number {
  return Date.parse(`${shift.date}T${shift.startTime}`);
}

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the subset of `shifts` that is publicly visible and matches every
 * supplied criterion. Order from the input is preserved for matching shifts
 * because `Array.prototype.filter` is stable.
 *
 * The publication invariant (always enforced, even with an empty criteria
 * object) is:
 *  1. `status ∈ {Published, FullyBooked}` (Req 3.3, 29.1, 29.2).
 *  2. `escrowStatus === 'Deposited'` (Req 3.3, 29.3) — this is what makes
 *     a shift "real" to workers; an undeposited shift never appears.
 *  3. The shift's start datetime is at or after `criteria.now ?? new
 *     Date().toISOString()` (Req 4.1, 19.4, 29.4).
 *
 * Optional criteria, applied only when set:
 *  - `text` — case-insensitive substring match against title OR location OR
 *    description (Req 19.2, 19.3).
 *  - `location` — case-insensitive substring match against location
 *    (Req 4.2).
 *  - `dateFrom` / `dateTo` — inclusive `YYYY-MM-DD` range against
 *    `shift.date`. String comparison is correct because the format is
 *    fixed-width and lexicographically ordered (Req 4.2).
 *  - `wageMin` / `wageMax` — inclusive numeric range against
 *    `shift.hourlyWage` (Req 4.2).
 *  - `jobType` — exact match against `shift.jobType` (Req 4.2).
 */
export function applyFilters(
  shifts: Shift[],
  criteria: FilterCriteria,
): Shift[] {
  const nowISO = criteria.now ?? new Date().toISOString();
  const nowMs = Date.parse(nowISO);

  return shifts.filter((shift) => {
    // 1. Publication invariant: status + escrow.
    if (!VISIBLE_STATUSES.has(shift.status)) return false;
    if (shift.escrowStatus !== 'Deposited') return false;

    // 2. Publication invariant: not in the past.
    const startMs = shiftStartMs(shift);
    if (Number.isNaN(startMs) || startMs < nowMs) return false;

    // 3. Optional criteria.
    if (criteria.text !== undefined && criteria.text !== '') {
      const text = criteria.text;
      const matchesText =
        includesCI(shift.title, text) ||
        includesCI(shift.location, text) ||
        includesCI(shift.description, text);
      if (!matchesText) return false;
    }

    if (criteria.location !== undefined && criteria.location !== '') {
      if (!includesCI(shift.location, criteria.location)) return false;
    }

    if (criteria.dateFrom !== undefined && shift.date < criteria.dateFrom) {
      return false;
    }
    if (criteria.dateTo !== undefined && shift.date > criteria.dateTo) {
      return false;
    }

    if (
      criteria.wageMin !== undefined &&
      shift.hourlyWage < criteria.wageMin
    ) {
      return false;
    }
    if (
      criteria.wageMax !== undefined &&
      shift.hourlyWage > criteria.wageMax
    ) {
      return false;
    }

    if (criteria.jobType !== undefined && shift.jobType !== criteria.jobType) {
      return false;
    }

    return true;
  });
}
