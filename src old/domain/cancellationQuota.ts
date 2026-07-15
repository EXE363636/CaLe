/**
 * Cancellation quota domain module (Phase 3).
 *
 * Pure TypeScript — no React, no Next, no I/O. Backs the rolling 7-day /
 * 30-day cancellation quota for workers.
 *
 * Rules:
 *  - Default quota: 3 cancellations / 7 days, 10 cancellations / 30 days.
 *  - Reputation ≥ 80: weekly limit +1, monthly limit +2.
 *  - Reputation ≥ 95: weekly limit +2, monthly limit +4. (Total bonuses,
 *    NOT cumulative with the ≥80 tier.)
 *  - Quota counts records inside the rolling window. Both windows must
 *    have remaining capacity for a cancel to proceed.
 *
 * What counts as a cancellation for the quota:
 *  - Immediate cancellations of `Pending` or `Approved` applications.
 *  - Approved cancellation requests (employer says yes).
 *
 * What does NOT count:
 *  - Rejected cancellation requests (no record is ever written).
 *  - Pending cancellation requests (`CancellationRequested` state) — the
 *    record is only added once the employer approves.
 *  - Admin-driven reputation adjustments. Those entries piggy-back on the
 *    same `cancellationHistory` array but use `shiftId: ''`, so they are
 *    filtered out below by `isQuotaCountable`.
 */

import type { CancellationRecord } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WEEKLY_LIMIT_BASE = 3;
export const MONTHLY_LIMIT_BASE = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const WEEK_WINDOW_MS = 7 * MS_PER_DAY;
export const MONTH_WINDOW_MS = 30 * MS_PER_DAY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuotaLimits {
  weekly: number;
  monthly: number;
}

export interface QuotaWindow {
  used: number;
  limit: number;
  remaining: number;
}

export interface QuotaUsage {
  weekly: QuotaWindow;
  monthly: QuotaWindow;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Filter out non-cancellation entries that share the `cancellationHistory`
 * array. Admin reputation adjustments write a synthetic record with an
 * empty `shiftId`; those must not consume quota.
 */
function isQuotaCountable(rec: CancellationRecord): boolean {
  return typeof rec.shiftId === 'string' && rec.shiftId.length > 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the per-window cancellation limits for a worker, given their
 * current reputation score. The two reputation tiers are *replacement*
 * tiers, not additive on top of each other.
 */
export function quotaLimits(reputationScore: number): QuotaLimits {
  if (reputationScore >= 95) {
    return {
      weekly: WEEKLY_LIMIT_BASE + 2,
      monthly: MONTHLY_LIMIT_BASE + 4,
    };
  }
  if (reputationScore >= 80) {
    return {
      weekly: WEEKLY_LIMIT_BASE + 1,
      monthly: MONTHLY_LIMIT_BASE + 2,
    };
  }
  return { weekly: WEEKLY_LIMIT_BASE, monthly: MONTHLY_LIMIT_BASE };
}

/**
 * Count quota-countable cancellation records inside the rolling window
 * `[now − windowMs, now]`.
 */
export function countCancellationsInWindow(
  history: CancellationRecord[],
  windowMs: number,
  nowIso: string,
): number {
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return 0;
  const threshold = now - windowMs;

  let count = 0;
  for (const rec of history) {
    if (!isQuotaCountable(rec)) continue;
    const t = new Date(rec.cancelledAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= threshold && t <= now) count += 1;
  }
  return count;
}

/**
 * Snapshot of a worker's current quota state — used by the UI to render
 * the "Bạn còn X/Y" indicator and by the store as the authoritative gate.
 */
export function quotaUsage(
  history: CancellationRecord[],
  reputationScore: number,
  nowIso: string,
): QuotaUsage {
  const limits = quotaLimits(reputationScore);
  const usedWeekly = countCancellationsInWindow(history, WEEK_WINDOW_MS, nowIso);
  const usedMonthly = countCancellationsInWindow(history, MONTH_WINDOW_MS, nowIso);
  return {
    weekly: {
      used: usedWeekly,
      limit: limits.weekly,
      remaining: Math.max(0, limits.weekly - usedWeekly),
    },
    monthly: {
      used: usedMonthly,
      limit: limits.monthly,
      remaining: Math.max(0, limits.monthly - usedMonthly),
    },
  };
}

/**
 * Predicate: does the worker have quota left to cancel one more shift?
 *
 * `true` iff both the weekly and monthly windows have remaining capacity.
 */
export function canCancelByQuota(usage: QuotaUsage): boolean {
  return usage.weekly.remaining > 0 && usage.monthly.remaining > 0;
}
