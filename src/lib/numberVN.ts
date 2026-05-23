/**
 * Vietnamese number formatting + words conversion (Phase 9F).
 *
 * Pure TypeScript — no React, no Next, no I/O. Used by `ShiftForm` for the
 * hourly wage input so users see `35.000` while typing `35000`, with a
 * helper line `(ba mươi lăm nghìn VNĐ)` reading the value out loud.
 *
 * Conventions:
 *   - Thousand separator is `.` (Vietnamese convention).
 *   - Canonical internal value is a number (storage unchanged).
 *   - Words conversion handles 0..999_999_999 — the practical wage range.
 *     Larger inputs get the literal `"số quá lớn"` fallback so we never
 *     emit a malformed string.
 */

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/**
 * Strip all non-digits, then re-insert `.` every three digits from the
 * right. `35000` → `"35.000"`. Empty input → empty string.
 */
export function formatNumberVNInput(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits === '') return '';
  // Strip leading zeros but keep a single zero if the input was exactly "0".
  const trimmed = digits.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse a Vietnamese-formatted number string back into a plain integer.
 * `"35.000"` → `35000`. Accepts unformatted input too (`"35000"` → `35000`).
 * Returns `NaN` for empty input so the caller can distinguish "no value".
 */
export function parseVNNumberInput(value: string): number {
  if (typeof value !== 'string') return Number.NaN;
  const digits = value.replace(/\D/g, '');
  if (digits === '') return Number.NaN;
  return Number(digits);
}

// ---------------------------------------------------------------------------
// Words conversion
// ---------------------------------------------------------------------------

const DIGIT_WORDS: readonly string[] = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

/** Convert a 1..999 group to Vietnamese words. Used by `numberToVietnameseWords`. */
function groupToWords(n: number, isFirstGroup: boolean): string {
  // Coerce to integer in [0, 999].
  const num = Math.max(0, Math.min(999, Math.floor(n)));
  if (num === 0) return '';

  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const ones = num % 10;

  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${DIGIT_WORDS[hundreds]} trăm`);
  } else if (!isFirstGroup && (tens > 0 || ones > 0)) {
    // Non-leading group with no hundreds: insert "không trăm" so we can
    // still read the tens/ones cleanly. e.g. 1_005 → "một nghìn không
    // trăm linh năm".
    parts.push('không trăm');
  }

  if (tens === 0) {
    if (ones > 0) {
      // "linh" linker only between hundreds and ones when tens is zero.
      if (hundreds > 0 || !isFirstGroup) {
        parts.push('linh');
      }
      parts.push(DIGIT_WORDS[ones]);
    }
  } else if (tens === 1) {
    parts.push('mười');
    if (ones === 5) {
      // "mười lăm" not "mười năm".
      parts.push('lăm');
    } else if (ones > 0) {
      parts.push(DIGIT_WORDS[ones]);
    }
  } else {
    parts.push(`${DIGIT_WORDS[tens]} mươi`);
    if (ones === 1) {
      // "mốt" replaces "một" after "mươi".
      parts.push('mốt');
    } else if (ones === 5) {
      parts.push('lăm');
    } else if (ones > 0) {
      parts.push(DIGIT_WORDS[ones]);
    }
  }

  return parts.join(' ');
}

/**
 * Convert an integer to Vietnamese words (no currency suffix).
 *
 * Range: `0..999_999_999`. Outside that range returns `"số quá lớn"` so we
 * never emit a half-baked phrase. Negative numbers are clamped to 0.
 *
 * Examples:
 *   - `0`        → `"không"`
 *   - `35000`    → `"ba mươi lăm nghìn"`
 *   - `45000`    → `"bốn mươi lăm nghìn"`
 *   - `120000`   → `"một trăm hai mươi nghìn"`
 *   - `1_500_000`→ `"một triệu năm trăm nghìn"`
 *   - `100_000_000` → `"một trăm triệu"`
 */
export function numberToVietnameseWords(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  if (n < 0) return numberToVietnameseWords(0);
  if (n === 0) return DIGIT_WORDS[0];
  if (n > 999_999_999) return 'số quá lớn';

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const ones = n % 1_000;

  const out: string[] = [];

  if (millions > 0) {
    const seg = groupToWords(millions, true);
    if (seg) out.push(`${seg} triệu`);
  }
  if (thousands > 0) {
    const seg = groupToWords(thousands, millions === 0);
    if (seg) out.push(`${seg} nghìn`);
  }
  if (ones > 0) {
    const seg = groupToWords(ones, millions === 0 && thousands === 0);
    if (seg) out.push(seg);
  }

  return out.join(' ');
}

/**
 * Convenience wrapper used by the `ShiftForm` helper text — appends
 * "VNĐ" after the words. Empty / NaN input returns empty string so the
 * caller can omit the helper line entirely while the field is empty.
 */
export function numberToVietnameseCurrency(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '';
  return `${numberToVietnameseWords(n)} VNĐ`;
}
