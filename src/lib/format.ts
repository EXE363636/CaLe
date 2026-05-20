/**
 * Vietnamese formatting utilities for the CaLẻ / ShiftNow MVP.
 *
 * Pure TypeScript — no React, no Next, no I/O. All formatting is done via
 * the standard `Intl` APIs configured for the `vi-VN` locale, so currency
 * and date output match Requirement 27 (Vietnamese localization) without
 * shipping a translation library.
 *
 * Conventions:
 *   - Currency amounts are integer Vietnamese Dong (₫); fractional amounts
 *     are rounded away (`maximumFractionDigits: 0`).
 *   - Dates are rendered as `DD/MM/YYYY` (Req 27.3).
 *   - Times are 24-hour `HH:mm` and pass through unchanged.
 *   - Session expiration uses a fixed 24-hour idle window (Req 30.2).
 */

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Format a number as Vietnamese Dong (e.g. `50.000 ₫`).
 *
 * Non-finite or non-numeric input falls back to `0 ₫` so the UI never
 * renders `NaN ₫` from a stale store value.
 */
export function formatVND(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return VND_FORMATTER.format(0);
  }
  return VND_FORMATTER.format(n);
}

/**
 * Format an ISO date string as `DD/MM/YYYY` in Vietnamese convention.
 *
 * Accepts either a date-only `YYYY-MM-DD` or a full ISO 8601 timestamp.
 * For date-only inputs we anchor at local midnight to avoid the UTC
 * round-trip shifting the calendar day.
 */
export function formatDateVN(iso: string): string {
  if (typeof iso !== 'string' || iso.length === 0) return '';

  // Date-only input: build a local-midnight Date so the day doesn't shift.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  const d = new Date(dateOnly);
  if (Number.isNaN(d.getTime())) return '';

  return DATE_FORMATTER.format(d);
}

/**
 * Pass-through formatter for 24-hour wall-clock times.
 *
 * Stored times are already `HH:mm` and Vietnamese convention uses the same
 * 24-hour format, so no transformation is needed. The function exists as a
 * single point of change in case the convention shifts later.
 */
export function formatTimeVN(hhmm: string): string {
  if (typeof hhmm !== 'string') return '';
  return hhmm;
}

/**
 * Predicate: is a session expired given `now` and the user's last activity?
 *
 * Both inputs are ISO 8601 strings. Returns `true` when `now − lastActivity`
 * exceeds 24 hours (Req 30.2). Unparseable inputs are treated as expired so
 * a corrupt session is never honoured.
 */
export function isSessionExpired(now: string, lastActivityAt: string): boolean {
  const nowMs = Date.parse(now);
  const lastMs = Date.parse(lastActivityAt);
  if (Number.isNaN(nowMs) || Number.isNaN(lastMs)) return true;
  return nowMs - lastMs > SESSION_TIMEOUT_MS;
}
