/**
 * Phase 10C-Stab-1 Batch 2 — recommended-minimum hourly wage helper.
 *
 * Pure TypeScript — no React, no I/O. Provides a single source of
 * truth for the per-job-type recommended hourly minimum the
 * `<ShiftForm/>` warns against. The numbers are MOCK and explicitly
 * NOT a legal compliance threshold — copy is "mức khuyến nghị tối
 * thiểu" everywhere.
 *
 * Numbers reflect rough Vietnamese gig-economy informal market rates
 * (Q1 2026 mock baseline) for the seven canonical job categories
 * `ShiftForm` already exposes plus the catch-all "Khác".
 *
 * Update note: when QA wants to tune these values, change the table
 * here and the warning copy automatically picks up the new floor.
 * No store / UI code reads the literals directly; everyone calls
 * `recommendedHourlyMinimum(jobType)`.
 */

/**
 * Per-job-type recommended hourly minimums in VND. The catch-all
 * `'__default'` applies to "Khác" and any unknown jobType.
 */
const RECOMMENDED_MIN_VND: Record<string, number> = {
  'Phục vụ': 30_000,
  'Pha chế': 35_000,
  'Kho vận': 35_000,
  'Hỗ trợ sự kiện': 30_000,
  'Phát tờ rơi': 25_000,
  'Bảo vệ': 35_000,
  'Thu ngân': 35_000,
  __default: 30_000,
};

/**
 * Returns the recommended hourly minimum (in VND) for `jobType`. Falls
 * back to the `'__default'` floor (30_000đ) for unknown job types or
 * the catch-all "Khác".
 *
 * Pure: same input → same output, no clock reads, no globals.
 */
export function recommendedHourlyMinimum(jobType: string): number {
  if (typeof jobType !== 'string' || jobType.length === 0) {
    return RECOMMENDED_MIN_VND.__default;
  }
  return RECOMMENDED_MIN_VND[jobType] ?? RECOMMENDED_MIN_VND.__default;
}

/**
 * Predicate: is the supplied hourly wage below the recommended minimum
 * for the job type? Returns `false` for non-finite or non-positive
 * inputs so the warning never fires on garbage.
 */
export function isBelowRecommendedMinimum(
  jobType: string,
  hourlyWage: number,
): boolean {
  if (!Number.isFinite(hourlyWage) || hourlyWage <= 0) return false;
  return hourlyWage < recommendedHourlyMinimum(jobType);
}
