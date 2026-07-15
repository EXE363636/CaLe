/**
 * Shared avatar/logo initials helper (CORE-STABILITY-7 Part 3).
 *
 * Pure TypeScript — no React, no I/O. Single source of truth for the
 * initials shown in every avatar fallback (header, UserMenu, dashboard
 * welcome card, profile modals, applicant cards, notifications).
 *
 * ## The rule (global, one rule everywhere)
 *
 *   Take the FIRST LETTER of the FIRST TWO whitespace-separated words
 *   of the name, uppercased.
 *
 *   - "Quán Phở Hà"     → "QP"
 *   - "Nguyễn Văn An"   → "NV"
 *   - "Trần Bình"       → "TB"
 *   - "Madonna"         → "M"   (single word → one letter)
 *   - ""                → "?"   (empty / whitespace fallback)
 *
 * Diacritics are preserved (Vietnamese uppercase letters render fine).
 * Leading/trailing whitespace and repeated spaces are collapsed.
 *
 * When an entity has a custom logo / avatar image, callers pass that
 * image to {@link UserAvatar} which renders the image instead — the
 * initials are only the fallback.
 */
export function getUserInitials(name: string): string {
  if (typeof name !== 'string') return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toLocaleUpperCase('vi-VN') ?? '')
    .filter(Boolean)
    .join('');
  return letters.length > 0 ? letters : '?';
}
