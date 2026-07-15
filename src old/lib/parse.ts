/**
 * Vietnamese parsing utilities for the CaLẻ / ShiftNow MVP.
 *
 * Pure TypeScript — no React, no Next, no I/O. Inverse of the formatters in
 * `lib/format.ts`. Used when round-tripping form values back to the
 * canonical ISO representations stored on entities.
 */

const DDMMYYYY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Parse a `DD/MM/YYYY` Vietnamese date string into the canonical ISO
 * `YYYY-MM-DD` form used by stored entities (Req 27.3).
 *
 * Returns an empty string for malformed input so calling code can treat
 * the result as a falsy validation failure without a try/catch.
 *
 * @example
 *   parseDateVN('25/12/2025'); // "2025-12-25"
 *   parseDateVN('not a date'); // ""
 */
export function parseDateVN(formatted: string): string {
  if (typeof formatted !== 'string') return '';
  const match = DDMMYYYY_RE.exec(formatted.trim());
  if (!match) return '';
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}
