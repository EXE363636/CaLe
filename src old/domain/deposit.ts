/**
 * Deposit calculation for the CaLẻ / ShiftNow MVP.
 *
 * The simulated deposit (Req 3.2) equals:
 *
 *   depositAmount = hourlyWage × hoursPerWorker × positionsTotal
 *
 * Times are 24-hour `HH:mm` strings. Only non-overnight ranges are supported
 * for the MVP — `start` must be strictly earlier than `end` on the same day.
 * Anything else (malformed input, equal times, end ≤ start) returns `0` as
 * a defensive default so the UI can still render a deposit total without
 * throwing. Stores layered above are responsible for surfacing validation
 * errors at form-submit time.
 */

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parse a strict `HH:mm` string into total minutes since midnight.
 * Returns `null` for any malformed input.
 */
function parseHHmm(value: string): number | null {
  if (typeof value !== 'string') return null;
  const match = HHMM_RE.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/**
 * Decimal hours between two same-day `HH:mm` times.
 *
 * Returns `0` when:
 *  - either input is not a valid `HH:mm` string, or
 *  - `end` is not strictly after `start` (overnight ranges are out of scope
 *    for the MVP).
 *
 * @example
 *   hoursBetween('09:00', '12:30'); // 3.5
 *   hoursBetween('22:00', '02:00'); // 0 (overnight, unsupported)
 *   hoursBetween('10:00', '10:00'); // 0
 */
export function hoursBetween(start: string, end: string): number {
  const startMin = parseHHmm(start);
  const endMin = parseHHmm(end);
  if (startMin === null || endMin === null) return 0;
  if (endMin <= startMin) return 0;
  return (endMin - startMin) / 60;
}

/**
 * Simulated deposit total for a shift.
 *
 * `depositAmount = wage × hours × positions`. No clamping or rounding is
 * applied — callers feed integer VND wages and integer positions, and
 * `hoursBetween` already returns a clean fractional hour count, so the
 * product is exact for typical inputs.
 *
 * @example
 *   calculateDeposit(50000, 4, 3); // 600000
 */
export function calculateDeposit(
  wage: number,
  hours: number,
  positions: number,
): number {
  return wage * hours * positions;
}
