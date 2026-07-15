/**
 * adminNotifications — Phase 10A-Fix-1.
 *
 * Helper to push a notification to every active admin account. Used by
 * call sites that need to alert admins about new submissions
 * (verification documents, type-change requests, future flows).
 *
 * Pure TypeScript — call sites pass the user array + push function so
 * this helper has no Zustand coupling.
 */

import type { NotificationKind, User } from '@/types';

interface AdminNotifyInput {
  /** All users (typically `useUserStore((s) => s.users)`). */
  users: User[];
  /**
   * `useNotificationStore.getState().push` (passed in to avoid hidden
   * import coupling — call sites already have it).
   */
  push: (input: {
    userId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    link?: string;
    dedupeKey?: string;
  }) => unknown;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Deep link target — defaults to the admin verification queue. */
  link?: string;
  /**
   * CORE-STABILITY-7 — optional per-admin idempotency key prefix. When
   * provided, each admin notification is deduped on
   * `(adminId, "<dedupeKey>:<adminId>")` so a repeated push (re-render,
   * double submit) never creates duplicate admin alerts.
   */
  dedupeKey?: string;
}

/**
 * Push the same notification to every non-suspended admin. Returns
 * the number of admins notified (0 if none exist or all suspended).
 */
export function notifyAdmins({
  users,
  push,
  kind,
  title,
  body,
  link = '/admin/dashboard?tab=verifications',
  dedupeKey,
}: AdminNotifyInput): number {
  let count = 0;
  for (const u of users) {
    if (u.role !== 'admin') continue;
    if (u.suspended) continue;
    push({
      userId: u.id,
      kind,
      title,
      body,
      link,
      dedupeKey: dedupeKey ? `${dedupeKey}:${u.id}` : undefined,
    });
    count++;
  }
  return count;
}
