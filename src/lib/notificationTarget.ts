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
  'PaymentReviewCredited',
  'PaymentReviewDismissed',
]);

/**
 * Worker check-in / check-out window prompts (Cluster 1, Property 2,
 * Req 2.4). Tapping one of these should deep-link the worker to the shift
 * detail — which now hosts the check-in / check-out action — so they can
 * act in place instead of detouring back to `/worker/dashboard`. These are
 * the lifecycle "window" kinds a worker receives: the shift is about to
 * start (`ShiftStartingSoon`), has started (`ShiftStarted` → check in), or
 * has ended without a check-out (`ShiftEnded` → check out).
 */
const WORKER_CHECKIN_KINDS: ReadonlySet<NotificationKind> = new Set([
  'ShiftStartingSoon',
  'ShiftStarted',
  'ShiftEnded',
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
    /** 0035 — chat: nhà tuyển dụng cần biết mở cuộc trò chuyện của đơn nào. */
    applicationId?: string;
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

  // Worker check-in / check-out window prompts → the worker shift detail,
  // which hosts the matching check-in / check-out action. Fall back to the
  // worker dashboard when no shift id is available. Scoped to the worker
  // view: an employer who happens to receive one of these keeps the prior
  // behavior (it falls through to the switch / `undefined`), so no existing
  // routing regresses.
  if (r !== 'employer' && WORKER_CHECKIN_KINDS.has(notification.kind)) {
    return shiftLink('worker', shiftId) ?? '/worker/dashboard';
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

    // 0035 — tin nhắn mới: mở khung chat ngay trên trang chi tiết ca.
    case 'ChatMessage':
      return r === 'employer' || r === 'worker'
        ? chatLink(r, shiftId, notification.applicationId)
        : undefined;

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
  const id = encodeURIComponent(shiftId);
  return role === 'employer' ? `/employer/shifts/${id}` : `/shifts/${id}`;
}

/**
 * 0035 — deeplink mở khung chat của một đơn ứng tuyển (không có route riêng):
 *   - người lao động: `/shifts/{shiftId}?chat=1` (mỗi ca họ chỉ có một đơn);
 *   - nhà tuyển dụng: `/employer/shifts/{shiftId}?chat={applicationId}`
 *     (thiếu applicationId → chỉ mở trang quản lý ca).
 */
export function chatLink(
  role: 'worker' | 'employer',
  shiftId?: string,
  applicationId?: string,
): string | undefined {
  const base = shiftLink(role, shiftId);
  if (!base) return undefined;
  if (role === 'worker') return `${base}?chat=1`;
  return applicationId ? `${base}?chat=${encodeURIComponent(applicationId)}` : base;
}
