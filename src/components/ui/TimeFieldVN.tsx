'use client';

/**
 * TimeFieldVN — Phase 9C smart Vietnamese 24-hour time input.
 *
 * Replaces the native `<input type="time">` so the visible UX is always
 * `HH:mm`, never AM/PM, regardless of OS locale. Phase 9C rewrites the
 * typing model so users get an immediate auto-pad on hour digits 3–9
 * and a strict reject on out-of-range minutes:
 *
 *   - Accepts digits only (non-digit input dropped silently).
 *   - Hour digit 3..9 auto-pads to `0X:` immediately.
 *   - Hour digit 0..2 waits because it may become 00–23.
 *   - Hour pair 24..29 is rejected (24-hour cap is 23).
 *   - Minute digit 6..9 is rejected (minutes max at 59).
 *   - Pasting `930` → "09:30"; pasting `1330` → "13:30"; `2400` → reject.
 *   - On blur, single-digit hour ("3") finalizes to `03:00`; partial
 *     `03:` finalizes to `03:00`; otherwise we surface the localized
 *     error and keep the partial text so the user can fix it.
 *   - The canonical `onChange(HH:mm)` only fires when the input is a
 *     real 24-hour value. Invalid never emits a half-baked canonical.
 *
 * Pure presentational — no store reads, no router.
 */

import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';
import { t } from '@/i18n/vi';

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface TimeFieldVNProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Canonical `HH:mm` value (or empty string). */
  value: string;
  onChange: (canonical: string) => void;
  label?: string;
  error?: string;
  hint?: string;
}

// ---------------------------------------------------------------------------
// Smart formatter
// ---------------------------------------------------------------------------

/**
 * Build the visible text from raw user input.
 *
 *   - Strip non-digits, cap at 4 digits.
 *   - Hour 3..9 auto-pads. Hour 0..2 stays single-digit.
 *   - Hour pair 24..29 → reject.
 *   - Minute first digit 6..9 → reject.
 *
 * Returns `null` on an unsalvageable pattern.
 *
 * Phase 9C correctness note: digits are consumed left-to-right, slot by
 * slot, so a paste of "930" produces "09:30" (the leading 9 auto-pads
 * the hour, then "3" + "0" land on the minute slot). A naive
 * `digits.slice(0, 2)` for the hour would mis-interpret "93" as a
 * 93-hour pair and reject, which matches neither the spec examples
 * ("930" -> "09:30", "1330" -> "13:30") nor the autocorrect behavior
 * users expect from a smart input.
 */
function smartFormat(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';

  let i = 0;

  // ---- Hour ----
  const h1 = Number(digits[i]);
  if (Number.isNaN(h1)) return null;

  let hour: string;
  if (h1 >= 3) {
    // Auto-pad immediately. The hour slot is full after one digit, so
    // any remaining digits feed the minute slot.
    hour = `0${h1}`;
    i += 1;
  } else if (digits.length === 1) {
    // Single 0..2 — wait for the second digit.
    return String(h1);
  } else {
    // Two-digit hour 0..23. Anything 24..29 (or higher accidental input)
    // is unsalvageable.
    const hourStr = digits.slice(0, 2);
    const hourNum = Number(hourStr);
    if (hourNum > 23) return null;
    hour = hourStr;
    i = 2;
  }

  // No more digits → "0X:" or "HH:" (always end with colon when hour
  // slot is full so the user can keep typing without finding the colon
  // themselves).
  if (i >= digits.length) return `${hour}:`;

  // ---- Minute ----
  let minute = '';
  const m1 = Number(digits[i]);
  if (Number.isNaN(m1) || m1 > 5) return null;
  minute += String(m1);
  i += 1;

  if (i < digits.length) {
    const m2 = Number(digits[i]);
    if (Number.isNaN(m2)) return null;
    minute += String(m2);
  }

  return `${hour}:${minute}`;
}

/**
 * Finalize partial input on blur.
 *
 *   - "" → "" (no error)
 *   - "3" → "03:00"
 *   - "03" → "03:00"
 *   - "03:" → "03:00"
 *   - "03:1" → "03:10"
 *   - "03:15" → "03:15" (already complete)
 *   - anything else → as-is, caller surfaces error
 */
function finalizeOnBlur(text: string): { text: string; complete: boolean } {
  if (text === '') return { text: '', complete: false };

  if (HHMM_RE.test(text)) return { text, complete: true };

  // Pad single-digit hour: "3" → "03:00"
  if (/^\d$/.test(text)) {
    const padded = `0${text}:00`;
    return { text: padded, complete: HHMM_RE.test(padded) };
  }
  // "03" → "03:00"
  if (/^\d{2}$/.test(text)) {
    const padded = `${text}:00`;
    return { text: padded, complete: HHMM_RE.test(padded) };
  }
  // "03:" → "03:00"
  if (/^\d{2}:$/.test(text)) {
    const padded = `${text}00`;
    return { text: padded, complete: HHMM_RE.test(padded) };
  }
  // "03:1" → "03:10"
  if (/^\d{2}:\d$/.test(text)) {
    const padded = `${text}0`;
    return { text: padded, complete: HHMM_RE.test(padded) };
  }
  return { text, complete: false };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TimeFieldVN = forwardRef<HTMLInputElement, TimeFieldVNProps>(
  (
    { value, onChange, label, error: externalError, hint, id, className = '', required, ...rest },
    ref,
  ) => {
    const [text, setText] = useState<string>(value ?? '');
    const [internalError, setInternalError] = useState<string | null>(null);

    useEffect(() => {
      setText(value ?? '');
      setInternalError(null);
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;

      // Phase 9F deletion fix: detect when the user is deleting (raw is
      // shorter than the previous visible text) and let them through
      // without re-applying the smart formatter, which would otherwise
      // re-insert a colon they're trying to remove and trap the caret.
      const isDeleting = raw.length < text.length;
      if (isDeleting) {
        // Strip non-digits/non-colon characters but otherwise preserve
        // exactly what the user is left with after their backspace.
        // This lets `14:00` → `14:0` → `14:` → `14` → `1` → `` flow
        // naturally end-to-end.
        const sanitized = raw.replace(/[^\d:]/g, '');
        setText(sanitized);
        setInternalError(null);

        // Only emit canonical when a complete HH:mm survived deletion
        // (rare but possible if the user deleted the colon and re-typed
        // it). Otherwise clear the canonical so callers know we're
        // mid-edit.
        if (sanitized === '') {
          onChange('');
        } else if (sanitized.length === 5 && HHMM_RE.test(sanitized)) {
          onChange(sanitized);
        }
        return;
      }

      // Forward typing path — keep Phase 9C smart auto-format.
      const next = smartFormat(raw);
      if (next === null) {
        setInternalError(t('error.timeInvalid'));
        return;
      }
      setText(next);

      if (next === '') {
        setInternalError(null);
        onChange('');
        return;
      }

      if (next.length === 5 && HHMM_RE.test(next)) {
        setInternalError(null);
        onChange(next);
        return;
      }

      setInternalError(null);
    }

    function handleBlur() {
      const { text: finalText, complete } = finalizeOnBlur(text);
      setText(finalText);

      if (finalText === '') {
        setInternalError(null);
        return;
      }
      if (!complete || !HHMM_RE.test(finalText)) {
        setInternalError(t('error.timeInvalid'));
        return;
      }
      setInternalError(null);
      onChange(finalText);
    }

    const inputId =
      id ?? (label ? `time-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
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
          placeholder="HH:mm"
          maxLength={5}
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
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
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

TimeFieldVN.displayName = 'TimeFieldVN';
