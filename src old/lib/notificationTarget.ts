/**
 * Central notification deeplink resolver (CORE-STABILITY-7 Part 1).
 *
 * Pure TypeScript — no React, no I/O. Maps a notification to the route
 * (+ intent query) the user should land on when they click it. Every
 * notification kind resolves to a meaningful context, not just the
 * dashboard:
 *
 *   - wallet events       → the recipient's dashboard with
 *                           `?modal=wallet` (opens the wallet history)
 *   - application/shift   → the relevant shift detail (worker `/shifts/{id}`,
 *                           employer `/employer/shifts/{id}`)
 *   - employer applicant  → employer dashboard `?modal=pending` or the
 *                           shift detail
 *   - dispute events      → the dispute panel on the relevant shift /
 *                           the admin disputes tab
 *
 * The resolver is the single source of truth: `notificationStore.push`
 * uses it to backfill a `link` when the caller didn't supply one, so
 * legacy call sites and new ones both get correct deeplinks. A caller
 * MAY still pass an explicit `link` to override.
 */

import type { Notification, NotificationKind, Role } from '@/types';

/** Wallet-history modal value understood by both dashboards. */
export const WALLET_MODAL = 'wallet';

/** Notification kinds whose natural target is the wallet history. */
const WALLET_KINDS: ReadonlySet<NotificationKind> = new Set([
  'UserTopUp',
  'UserWithdrawal',
]);

/**
 * Resolve the deeplink for a notification, given the recipient's role.
 *
 * Returns a relative URL string (path + optional query) or `undefined`
 * when there is no better target than "stay where you are". The role is
 * needed because the same event can target different routes for the
 * worker vs the employer.
 *
 * Inputs are read defensively; this never throws.
 */
export function resolveNotificationTarget(
  notification: Pick<Notification, 'kind' | 'link'> & {
    shiftId?: string;
    role?: Role;
  },
  role?: Role,
): string | undefined {
  // An explicit link always wins — the caller knew the exact context.
  if (notification.link) return notification.link;

  const r = role ?? notification.role;
  const shiftId = notification.shiftId;

  // Wallet events → wallet history on the recipient's own dashboard.
  if (WALLET_KINDS.has(notification.kind)) {
    return walletHistoryLink(r);
  }

  switch (notification.kind) {
    // Worker income / wage release → wallet history (shift detail is a
    // secondary nicety we can't always resolve without the id).
    case 'AutoReleaseSettled':
    case 'ShiftCompletedConfirmed':
      return r === 'employer'
        ? shiftLink('employer', shiftId)
        : walletHistoryLink('worker');

    case 'WorkerPostPaymentRatingRequired':
      return shiftId ? shiftLink('worker', shiftId) : '/worker/dashboard';

    default:
      return undefined;
  }
}

/** Wallet-history deeplink for the given role's dashboard. */
export function walletHistoryLink(role?: Role): string {
  if (role === 'employer') return `/employer/dashboard?modal=${WALLET_MODAL}`;
  if (role === 'admin') return '/admin/dashboard';
  return `/worker/dashboard?modal=${WALLET_MODAL}`;
}

/** Shift-detail deeplink for the given role + shift id. */
export function shiftLink(
  role: 'worker' | 'employer',
  shiftId?: string,
): string | undefined {
  if (!shiftId) return undefined;
  return role === 'employer'
    ? `/employer/shifts/${shiftId}`
    : `/shifts/${shiftId}`;
}
