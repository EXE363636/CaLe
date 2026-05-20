/**
 * Form validation helpers for the CaLẻ / ShiftNow MVP.
 *
 * Pure TypeScript — no React, no Next, no I/O. Each validator returns a
 * `Result<true, ErrorKey>` so forms can branch on `.ok` and look the error
 * key up in the i18n dictionary (`src/i18n/vi.ts`, populated in Task 8.1).
 *
 * Validators MUST never throw — they accept `unknown` defensively and
 * report a typed error key on failure. Form-layer code is responsible for
 * surfacing the localized message under the offending field (Req 28.x).
 */

import type { Result } from '@/types';

// ---------------------------------------------------------------------------
// Error keys
// ---------------------------------------------------------------------------

/** I18n key for an empty required field. */
export type RequiredError = 'error.required';
/** I18n key for a malformed email address. */
export type EmailError = 'error.email.invalid';
/** I18n key for a password shorter than the minimum length. */
export type PasswordError = 'error.password.tooShort';
/** I18n key for a malformed Vietnamese phone number. */
export type PhoneError = 'error.phone.invalid';

/** Minimum acceptable password length (Req 28). */
export const MIN_PASSWORD_LENGTH = 8;

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Vietnamese mobile phone number, post-normalization:
 *   - optional `+` then `84`, OR a leading `0`
 *   - followed by a carrier-prefix digit in {3, 5, 7, 8, 9}
 *   - followed by 8 more digits (9-digit subscriber total)
 */
const VN_PHONE_RE = /^(?:\+?84|0)([35789])\d{8}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok: Result<true, never> = { ok: true, value: true };

function fail<E>(error: E): Result<true, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Pass when `v` is a non-empty, non-whitespace value.
 *
 * Accepts `unknown` so it can guard form fields, store reads, and seed
 * data without any pre-cast. `null`, `undefined`, empty string, and a
 * whitespace-only string all fail.
 */
export function isRequired(v: unknown): Result<true, RequiredError> {
  if (v === null || v === undefined) return fail('error.required');
  if (typeof v === 'string' && v.trim() === '') return fail('error.required');
  return ok;
}

/**
 * Pass when `s` looks like a syntactically valid email.
 *
 * Uses a small RFC-shaped regex; the goal is to catch obvious typos in the
 * MVP, not to fully validate against RFC 5322.
 */
export function isValidEmail(s: string): Result<true, EmailError> {
  try {
    if (typeof s !== 'string') return fail('error.email.invalid');
    if (!EMAIL_RE.test(s.trim())) return fail('error.email.invalid');
    return ok;
  } catch {
    return fail('error.email.invalid');
  }
}

/**
 * Pass when `s` is at least `MIN_PASSWORD_LENGTH` characters long.
 *
 * The MVP intentionally avoids complexity rules (uppercase / digit /
 * special) to keep the demo flow simple; that refinement is deferred until
 * a real auth backend exists.
 */
export function isValidPassword(s: string): Result<true, PasswordError> {
  try {
    if (typeof s !== 'string') return fail('error.password.tooShort');
    if (s.length < MIN_PASSWORD_LENGTH) return fail('error.password.tooShort');
    return ok;
  } catch {
    return fail('error.password.tooShort');
  }
}

/**
 * Pass when `s` is a recognizable Vietnamese mobile number.
 *
 * Accepts the three common entry forms after stripping spaces, dashes, and
 * parentheses:
 *   - `+84` followed by a 9-digit subscriber
 *   - `84` followed by a 9-digit subscriber
 *   - `0` followed by a 9-digit subscriber
 *
 * The first digit of the 9-digit subscriber must identify a recognized
 * carrier prefix in `{3, 5, 7, 8, 9}` (Req 28.3).
 */
export function isValidVNPhone(s: string): Result<true, PhoneError> {
  try {
    if (typeof s !== 'string') return fail('error.phone.invalid');
    const stripped = s.replace(/[\s\-()]/g, '');
    if (!VN_PHONE_RE.test(stripped)) return fail('error.phone.invalid');
    return ok;
  } catch {
    return fail('error.phone.invalid');
  }
}
