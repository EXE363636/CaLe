/**
 * ID generation utilities for the CaLẻ / ShiftNow MVP.
 *
 * Pure TypeScript — no React, no Next, no I/O. Used by stores when creating
 * new entities (Shift, Application, Rating, Notification, etc.).
 *
 * `crypto.randomUUID()` is available in modern browsers and Node 19+. The
 * Next.js 16 / React 19 / Node 20 setup supports it natively.
 */

/**
 * Returns a fresh RFC 4122 v4 UUID string.
 *
 * @example
 *   const id = newId(); // "550e8400-e29b-41d4-a716-446655440000"
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Returns a UUID prefixed with a short label for human readability in logs
 * and devtools (`shift_550e8400-...`). The prefix is informational only —
 * IDs are still treated as opaque strings.
 *
 * @example
 *   newPrefixedId('shift'); // "shift_550e8400-e29b-41d4-a716-446655440000"
 */
export function newPrefixedId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
