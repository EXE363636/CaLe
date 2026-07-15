/**
 * Phase 10C-Stab-1 Batch 4 A — repost prefill sanitization.
 *
 * Strips system suffixes / prefixes that the cancellation / expiry
 * flow appended to the source shift's title and description so the
 * employer's repost form starts with clean copy. Pure /
 * deterministic; no React, no I/O.
 */

const TITLE_SUFFIX_PATTERNS: ReadonlyArray<RegExp> = [
  /\s*\(đã\s*hu[ỷỳy]\)\s*$/iu,
  /\s*\(đã\s*hết\s*hạn\)\s*$/iu,
  /\s*\(đã\s*kết\s*thúc\)\s*$/iu,
];

const DESCRIPTION_PREFIX_PATTERNS: ReadonlyArray<RegExp> = [
  /^\[Hệ thống\][^\n]*\n+/iu,
  /^\(Đã hu[ỷỳy]\)[^\n]*\n+/iu,
  /^\(Đã hết hạn\)[^\n]*\n+/iu,
];

export function sanitizeRepostTitle(title: string): string {
  let next = title;
  for (const re of TITLE_SUFFIX_PATTERNS) {
    next = next.replace(re, '');
  }
  return next.trim();
}

export function sanitizeRepostDescription(description: string): string {
  let next = description;
  for (const re of DESCRIPTION_PREFIX_PATTERNS) {
    next = next.replace(re, '');
  }
  return next.trim();
}
