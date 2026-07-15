'use client';

/**
 * DateFieldVN — Phase 9C smart Vietnamese date input.
 *
 * Replaces the native `<input type="date">` whose UI defaults vary by
 * browser locale. Phase 9C rewrites the typing model so users feel less
 * friction:
 *
 *   - The visible format is always `dd/mm/yyyy`.
 *   - We accept digits only; non-digit input (except slashes the user
 *     happens to type) is dropped silently.
 *   - Day digits 4–9 auto-pad to `0X/` immediately, matching how mobile
 *     calendar widgets behave. Day digits 1–3 wait for a possible second
 *     digit (10–19, 20–29, 30–31).
 *   - Month digits 2–9 auto-pad to `0X/`. Month digit 1 waits because it
 *     may become 10–12.
 *   - Anything that exceeds the 0–31 / 0–12 buckets is rejected.
 *   - On blur we finalize valid partial values where safe (e.g. typing
 *     "3" then leaving stays as "3/", not "03/00/0000").
 *   - The canonical `onChange(YYYY-MM-DD)` only fires when the input
 *     parses to a real calendar date. Invalid input never emits a
 *     half-baked canonical value — callers can trust the contract.
 *
 * Storage stays unchanged. Pure presentational — no store reads, no
 * router. Imports only `t()` and the existing format helpers.
 */

import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';
import { formatDateVN } from '@/lib/format';
import { parseDateVN } from '@/lib/parse';
import { t } from '@/i18n/vi';

export interface DateFieldVNProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Canonical `YYYY-MM-DD` value (or empty string). */
  value: string;
  /**
   * Receives the canonical `YYYY-MM-DD` string (or empty when the user
   * cleared the field). Never fires with malformed input.
   */
  onChange: (canonical: string) => void;
  label?: string;
  error?: string;
  hint?: string;
}

// ---------------------------------------------------------------------------
// Smart formatter
// ---------------------------------------------------------------------------

/**
 * Take whatever the user typed (any string) and return the visible text
 * we should now show. Pure function — no state, no DOM.
 *
 * Rules (matches the Phase 9C spec):
 *   1. Strip everything except digits. Slashes the user typed don't add
 *      meaning; we re-insert them ourselves.
 *   2. Day digit 1..3 may stand alone; 4..9 auto-pad.
 *   3. Day pair 32..39 is rejected (too high — `0..31`).
 *   4. Month digit 1 may stand alone; 2..9 auto-pad.
 *   5. Month pair 13..19 is rejected.
 *   6. Year is left to grow up to 4 digits; we only emit the slash
 *      between fields, never strip year digits.
 *
 * Returns `null` for an unsalvageable digit pattern (e.g. day = 32) so
 * the caller can hold the previous text and surface an error.
 */
function smartFormat(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';

  let out = '';
  let i = 0;

  // ---- Day ----
  const d1 = Number(digits[i]);
  if (Number.isNaN(d1)) return null;

  if (digits.length === 1) {
    // Single day digit. 4..9 auto-pad to "0X/"; 1..3 stand alone; 0 stands alone too.
    if (d1 >= 4) {
      out = `0${d1}/`;
    } else {
      out = String(d1);
    }
    i += 1;
  } else {
    // At least two digits typed — finalize day.
    const dayStr = digits.slice(0, 2);
    const dayNum = Number(dayStr);
    if (dayNum < 1 || dayNum > 31) {
      // Invalid day pair (e.g. "32", "00"). Reject the whole input so the
      // caller can show "ngày không hợp lệ".
      return null;
    }
    out = `${dayStr}/`;
    i = 2;
  }

  if (i >= digits.length) return out;

  // ---- Month ----
  const m1 = Number(digits[i]);
  if (Number.isNaN(m1)) return null;

  if (digits.length - i === 1) {
    if (m1 >= 2) {
      // Single month digit 2..9 auto-pads to "0X/".
      out += `0${m1}/`;
    } else {
      // Single month digit 0 or 1 stays alone (waiting for 10..12).
      out += String(m1);
    }
    i += 1;
  } else {
    const monthStr = digits.slice(i, i + 2);
    const monthNum = Number(monthStr);
    if (monthNum < 1 || monthNum > 12) {
      return null;
    }
    out += `${monthStr}/`;
    i += 2;
  }

  if (i >= digits.length) return out;

  // ---- Year (up to 4 digits) ----
  const yearChunk = digits.slice(i, i + 4);
  out += yearChunk;
  return out;
}

/**
 * On blur we want to "finalize" partial input where safe — typing "3"
 * then leaving the field shouldn't pad the day to "03/" (we already do
 * that proactively for 4–9), but we should pad single-digit month input
 * before the year if the user got that far.
 *
 * Returns either the finalized text or `null` if the input is incomplete
 * (caller surfaces the localized error).
 */
function finalizeOnBlur(text: string): { text: string; complete: boolean } {
  // Empty → empty; nothing to finalize.
  if (text === '') return { text: '', complete: false };

  // Already a complete `dd/mm/yyyy`.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return { text, complete: true };
  }

  // Try padding the partial: "3/" -> "03/", "12/3/" -> "12/03/", etc.
  const parts = text.split('/').filter(Boolean);
  if (parts.length >= 1 && parts[0].length === 1) {
    parts[0] = `0${parts[0]}`;
  }
  if (parts.length >= 2 && parts[1].length === 1) {
    parts[1] = `0${parts[1]}`;
  }
  const padded = parts
    .slice(0, 3)
    .filter((p) => p.length > 0)
    .join('/');

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(padded)) {
    return { text: padded, complete: true };
  }
  return { text: padded, complete: false };
}

/**
 * Validate that `dd/mm/yyyy` actually exists as a real date (not 31/02
 * or 31/04). Uses the same round-trip check as Phase 9B but lifted into
 * a helper so both the eager onChange path and the blur path call it.
 */
function isValidVNDate(formatted: string): boolean {
  const iso = parseDateVN(formatted);
  if (iso === '') return false;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return formatDateVN(iso) === formatted;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DateFieldVN = forwardRef<HTMLInputElement, DateFieldVNProps>(
  (
    { value, onChange, label, error: externalError, hint, id, className = '', required, ...rest },
    ref,
  ) => {
    const [text, setText] = useState<string>(() =>
      value ? formatDateVN(value) : '',
    );
    const [internalError, setInternalError] = useState<string | null>(null);

    // Re-sync when canonical changes externally (dialog re-seed for edit).
    useEffect(() => {
      setText(value ? formatDateVN(value) : '');
      setInternalError(null);
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const next = smartFormat(e.target.value);
      if (next === null) {
        // Unsalvageable digit pattern — show error, keep previous text.
        setInternalError(t('error.dateInvalid'));
        return;
      }

      setText(next);

      if (next === '') {
        setInternalError(null);
        onChange('');
        return;
      }

      if (next.length === 10) {
        if (!isValidVNDate(next)) {
          setInternalError(t('error.dateInvalid'));
          return;
        }
        setInternalError(null);
        onChange(parseDateVN(next));
        return;
      }

      // Partial input — clear error, hold canonical.
      setInternalError(null);
    }

    function handleBlur() {
      const { text: finalText, complete } = finalizeOnBlur(text);
      setText(finalText);

      if (finalText === '') {
        setInternalError(null);
        return;
      }

      if (!complete) {
        setInternalError(t('error.dateInvalid'));
        return;
      }
      if (!isValidVNDate(finalText)) {
        setInternalError(t('error.dateInvalid'));
        return;
      }
      setInternalError(null);
      onChange(parseDateVN(finalText));
    }

    const inputId =
      id ?? (label ? `date-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const error = externalError ?? internalError ?? undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
            'min-h-[44px] transition-colors duration-150',
            'placeholder:font-sans placeholder:text-gray-400',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1',
            error
              ? 'border-red-400 bg-red-50 focus-visible:ring-red-400'
              : 'border-gray-300 bg-white hover:border-gray-400',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

DateFieldVN.displayName = 'DateFieldVN';
