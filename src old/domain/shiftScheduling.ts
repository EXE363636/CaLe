/**
 * QA-Fix-2 Phase 1 — past-shift scheduling validation.
 *
 * Pure / deterministic. Used by BOTH the create form (UI) and the
 * store actions (`shiftStore.create` / `simulateDeposit`) so a past
 * shift can never be created, published, or deposited — regardless of
 * which path is taken.
 *
 * A shift is invalid when:
 *   - date / startTime / endTime is missing,
 *   - date is before today (local calendar day),
 *   - date is today and the end time is at or before "now",
 *   - start time is at or after end time (same-day only; overnight
 *     ranges are out of scope for the MVP, mirroring deposit.ts).
 */

export type ShiftTimingError =
  | 'MISSING_DATETIME'
  | 'PAST_DATE'
  | 'END_BEFORE_NOW'
  | 'START_NOT_BEFORE_END';

export interface ShiftTimingResult {
  ok: boolean;
  error?: ShiftTimingError;
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` for the local calendar day of an ISO instant. */
function localDateKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Combine `YYYY-MM-DD` + `HH:mm` into epoch ms (local time). */
function momentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

/**
 * Validate that a shift's date/time is in the future and internally
 * consistent. Returns `{ ok: true }` when valid, otherwise the first
 * failing reason.
 *
 * @param date      `YYYY-MM-DD`
 * @param startTime `HH:mm`
 * @param endTime   `HH:mm`
 * @param nowIso    Wall-clock ISO-8601 (defaults to `new Date()` at
 *                  call sites that omit it).
 */
export function validateShiftFutureTiming(
  date: string,
  startTime: string,
  endTime: string,
  nowIso: string,
): ShiftTimingResult {
  if (
    !date ||
    !startTime ||
    !endTime ||
    !DATE_RE.test(date) ||
    !HHMM_RE.test(startTime) ||
    !HHMM_RE.test(endTime)
  ) {
    return { ok: false, error: 'MISSING_DATETIME' };
  }

  // Same-day ordering: start must be strictly before end.
  if (startTime >= endTime) {
    return { ok: false, error: 'START_NOT_BEFORE_END' };
  }

  const todayKey = localDateKey(nowIso);
  if (todayKey === null) return { ok: false, error: 'MISSING_DATETIME' };

  // Date strictly before today → past.
  if (date < todayKey) {
    return { ok: false, error: 'PAST_DATE' };
  }

  // Date is today → the end time must still be in the future.
  if (date === todayKey) {
    const endMs = momentMs(date, endTime);
    const nowMs = new Date(nowIso).getTime();
    if (Number.isFinite(endMs) && Number.isFinite(nowMs) && endMs <= nowMs) {
      return { ok: false, error: 'END_BEFORE_NOW' };
    }
  }

  return { ok: true };
}

/**
 * Convenience boolean wrapper.
 */
export function isShiftTimingInFuture(
  date: string,
  startTime: string,
  endTime: string,
  nowIso: string,
): boolean {
  return validateShiftFutureTiming(date, startTime, endTime, nowIso).ok;
}
