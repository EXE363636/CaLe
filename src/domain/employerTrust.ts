/**
 * Employer trust + deposit-ratio math (Phase 6).
 *
 * Pure TypeScript — no React, no Next, no I/O. The shift creation flow
 * uses these helpers to:
 *   - classify an employer as low / medium / high trust, and
 *   - reduce the upfront deposit ratio for established employers.
 *
 * Rules (intentionally simple; no per-shift scoring yet):
 *   - **High trust** — `verifiedBusiness === true` AND
 *     `completedShiftCount >= 5`. Pays 50% of the wage upfront.
 *   - **Medium trust** — `verifiedBusiness === true` (any completed count)
 *     OR `completedShiftCount >= 3`. Pays 70% of the wage upfront.
 *   - **Low trust** — everyone else. Pays the full 100% upfront.
 *
 * `completedShiftCount` is computed from the live `shiftStore` slice in
 * the caller (so this module stays framework-free) and passed in.
 */

import type { Employer, EmployerTrustLevel } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum completed shifts to reach `medium` trust without verification. */
export const MEDIUM_COMPLETED_THRESHOLD = 3;
/** Minimum completed shifts to reach `high` trust (must also be verified). */
export const HIGH_COMPLETED_THRESHOLD = 5;

/** Per-tier deposit ratio, expressed as a fraction of the base shift wage. */
export const DEPOSIT_RATIO: Readonly<Record<EmployerTrustLevel, number>> = {
  low: 1.0,
  medium: 0.7,
  high: 0.5,
};

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * Subset of the data the trust calculation needs. Decoupled from the full
 * `Employer` shape so callers can pass synthetic values in unit tests.
 */
export interface EmployerTrustInput {
  verifiedBusiness: boolean;
  completedShiftCount: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify an employer's trust tier from a verification flag + a count of
 * fully-completed shifts. Pure function: same inputs → same output.
 */
export function classifyEmployerTrust(
  input: EmployerTrustInput,
): EmployerTrustLevel {
  if (input.verifiedBusiness && input.completedShiftCount >= HIGH_COMPLETED_THRESHOLD) {
    return 'high';
  }
  if (
    input.verifiedBusiness ||
    input.completedShiftCount >= MEDIUM_COMPLETED_THRESHOLD
  ) {
    return 'medium';
  }
  return 'low';
}

/**
 * Convenience: classify directly from an `Employer` record using its
 * `verifiedBusiness` flag. The completed-shift count must come from the
 * caller (typically `shiftStore.shifts.filter(...).length`) since the
 * `Employer` record itself does not denormalise that value.
 */
export function trustForEmployer(
  employer: Employer,
  completedShiftCount: number,
): EmployerTrustLevel {
  return classifyEmployerTrust({
    verifiedBusiness: employer.verifiedBusiness,
    completedShiftCount,
  });
}

/**
 * Required deposit for a given trust tier and base wage:
 *
 *   deposit = wagePerWorker × positionsTotal × ratio[trust]
 *
 * Where `wagePerWorker` is the per-worker wage **for the shift's full
 * duration** (i.e. `hourlyWage × hours`). The caller is responsible for
 * computing `wagePerWorker` from `shift.hourlyWage` and the shift duration
 * — this module only does the trust-aware multiplication so the formula
 * stays in one place.
 *
 * The result is always rounded to the nearest VND (no fractional ₫).
 */
export function depositForTrust(
  wagePerWorker: number,
  positionsTotal: number,
  trust: EmployerTrustLevel,
): number {
  const total = wagePerWorker * positionsTotal * DEPOSIT_RATIO[trust];
  return Math.round(total);
}
