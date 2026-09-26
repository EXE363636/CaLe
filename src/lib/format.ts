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

import { t } from '@/i18n/vi';

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  // Phase 9Z-Fix-2: switched from `style: 'currency', currency: 'VND'`
  // (which renders the `₫` symbol via Intl) to a plain decimal
  // formatter so we can append the lowercase `đ` ourselves. The new
  // suffix is consistent with the form helper text that reads amounts
  // as `... đồng` and matches the i18n `(đ)` form-label convention.
  style: 'decimal',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * CORE-STABILITY-6 Part 2 — shared date+time+seconds formatter for
 * logs / notifications (e.g. "30/05/2026 09:15:32"). Mirrors the
 * `Intl.DateTimeFormat('vi-VN', { ... second: '2-digit' })` convention
 * used across history surfaces so every timestamp reads consistently.
 */
const LOG_DATETIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Format an ISO timestamp as `DD/MM/YYYY HH:mm:ss` in `vi-VN`. Used for
 * notification timestamps and history logs. Invalid input is returned
 * unchanged so the UI never renders `Invalid Date`.
 */
export function formatLogDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return LOG_DATETIME_FORMATTER.format(d);
}

/**
 * Format a number as Vietnamese Dong (e.g. `50.000 đ`). Phase 9Z-Fix-2
 * standardised the suffix to lowercase `đ` (replacing the `₫` glyph)
 * so amount displays match the form helper text convention.
 *
 * Non-finite or non-numeric input falls back to `0 đ` so the UI never
 * renders `NaN đ` from a stale store value.
 */
export function formatVND(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return `${VND_FORMATTER.format(0)} đ`;
  }
  return `${VND_FORMATTER.format(n)} đ`;
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

const WEEKDAY_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function localYmd(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Ngày của ca theo cách người lao động đọc nhanh trên điện thoại:
 * "Hôm nay" / "Ngày mai" / "T6, 26/09" (thêm năm nếu khác năm hiện tại).
 * `date` là `YYYY-MM-DD` (giờ địa phương); `now` cho phép test xác định.
 */
export function formatRelativeDayVN(date: string, now: Date = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return formatDateVN(date);
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const today = localYmd(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (date === today) return t('common.today');
  if (date === localYmd(tomorrow)) return t('common.tomorrow');
  const [y, m, dd] = date.split('-');
  const sameYear = Number(y) === now.getFullYear();
  return `${WEEKDAY_VN[d.getDay()]}, ${dd}/${m}${sameYear ? '' : `/${y}`}`;
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
