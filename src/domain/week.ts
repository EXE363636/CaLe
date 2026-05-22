/**
 * Week + slot math for the worker timetable view (Phase 5B).
 *
 * Pure TypeScript — no React, no Next, no I/O. The timetable page calls
 * these helpers inside `useMemo` to derive the rendered grid from a small
 * set of inputs:
 *   - the currently selected anchor date (any day inside the target week),
 *   - the slot configuration (day start / day end / slot duration),
 *   - the list of `ScheduleBlock`s.
 *
 * Conventions:
 *   - Calendar dates are `YYYY-MM-DD` strings.
 *   - Wall-clock times are 24-hour `HH:mm`.
 *   - Weeks are Monday-first (ISO standard) to match the Vietnamese
 *     timetable convention "Thứ Hai → Chủ Nhật".
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard cap on generated slot rows so a misconfigured form can't lock up the UI. */
export const MAX_SLOT_ROWS = 24;

/** Lower bound for slot duration in minutes. */
export const MIN_SLOT_DURATION = 15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlotConfig {
  /** Day start as `HH:mm`. */
  dayStart: string;
  /** Day end as `HH:mm`. Must be strictly greater than `dayStart`. */
  dayEnd: string;
  /** Slot duration in minutes. Must be a positive integer ≥ MIN_SLOT_DURATION. */
  slotMinutes: number;
}

export interface TimeSlot {
  /** `HH:mm`. */
  startTime: string;
  /** `HH:mm`. */
  endTime: string;
}

export type SlotConfigError =
  | 'INVALID_TIME_RANGE'
  | 'INVALID_SLOT_DURATION'
  | 'TOO_MANY_SLOTS';

export type SlotConfigValidation =
  | { ok: true }
  | { ok: false; error: SlotConfigError };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Parse `HH:mm` to minutes-since-midnight. Returns `NaN` on malformed input. */
export function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) {
    return Number.NaN;
  }
  return h * 60 + mm;
}

/** Format minutes-since-midnight to `HH:mm`. Caller must clamp into `[0, 1440]`. */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/** Add `n` whole days to a `YYYY-MM-DD` date and return the new ISO date. */
function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Return the Monday of the ISO week that contains `isoDate`. Sunday is
 * treated as the last day of the previous Monday-anchored week.
 */
export function startOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const jsDay = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const offset = jsDay === 0 ? -6 : 1 - jsDay;
  return addDays(isoDate, offset);
}

/** Return today's date as `YYYY-MM-DD` in the local timezone. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Shift a week-anchor date by ±1 week. */
export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  return addDays(weekStart, deltaWeeks * 7);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Build the seven Monday-to-Sunday `YYYY-MM-DD` dates for the given week. */
export function weekDates(weekStart: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) out.push(addDays(weekStart, i));
  return out;
}

/**
 * Validate a `SlotConfig`. Returns `{ ok: true }` when:
 *  - `dayEnd > dayStart` (parsed minutes),
 *  - `slotMinutes` is a positive integer ≥ `MIN_SLOT_DURATION`,
 *  - the resulting row count is ≤ `MAX_SLOT_ROWS`.
 */
export function validateSlotConfig(cfg: SlotConfig): SlotConfigValidation {
  const start = timeToMinutes(cfg.dayStart);
  const end = timeToMinutes(cfg.dayEnd);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { ok: false, error: 'INVALID_TIME_RANGE' };
  }
  if (
    !Number.isFinite(cfg.slotMinutes) ||
    !Number.isInteger(cfg.slotMinutes) ||
    cfg.slotMinutes < MIN_SLOT_DURATION
  ) {
    return { ok: false, error: 'INVALID_SLOT_DURATION' };
  }
  const rows = Math.ceil((end - start) / cfg.slotMinutes);
  if (rows > MAX_SLOT_ROWS) {
    return { ok: false, error: 'TOO_MANY_SLOTS' };
  }
  return { ok: true };
}

/**
 * Produce the time slots that fit between `dayStart` and `dayEnd` at
 * `slotMinutes` intervals. The last slot is clamped to `dayEnd` so a
 * non-divisible window still terminates cleanly. Returns an empty array
 * if the config is invalid.
 */
export function generateSlots(cfg: SlotConfig): TimeSlot[] {
  if (!validateSlotConfig(cfg).ok) return [];
  const start = timeToMinutes(cfg.dayStart);
  const end = timeToMinutes(cfg.dayEnd);
  const slots: TimeSlot[] = [];
  let cursor = start;
  while (cursor < end && slots.length < MAX_SLOT_ROWS) {
    const next = Math.min(end, cursor + cfg.slotMinutes);
    slots.push({ startTime: minutesToTime(cursor), endTime: minutesToTime(next) });
    cursor = next;
  }
  return slots;
}

/**
 * Two `[startTime, endTime)` ranges on the same date overlap iff
 * `aStart < bEnd && aEnd > bStart`. Both arguments are in minutes.
 */
export function rangesOverlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Convenience wrapper using `HH:mm` strings; non-overlapping on parse failure. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  if (
    Number.isNaN(as) ||
    Number.isNaN(ae) ||
    Number.isNaN(bs) ||
    Number.isNaN(be)
  ) {
    return false;
  }
  return rangesOverlapMinutes(as, ae, bs, be);
}
