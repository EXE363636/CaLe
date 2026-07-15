/**
 * Phase 10A-Fix-9 — per-job-type skill score domain helpers.
 *
 * Pre-Fix-9 the platform tracked a single platform-wide
 * `reputationScore` (Worker.reputationScore). That number is fine for
 * "is this worker reliable in general" but tells the employer nothing
 * about how the worker performs in this specific category — a worker
 * with a 95 reputation rating who has only ever done event-support
 * shifts is not necessarily a strong choice for a cash-handling shift.
 *
 * This module is the canonical place for:
 *
 *   - Mapping a free-form `jobType` string to a `'Low' | 'Medium' |
 *     'High'` risk level so employer-side surfaces can show
 *     risk-aware guidance for high-risk jobs.
 *   - Updating the worker's per-category `WorkerSkillScore` after a
 *     rating event using a weighted-average formula that gives
 *     recent shifts more weight than older ones.
 *   - Looking up a worker's skill score for a given category, or
 *     reporting "no data yet" when the worker has never done one.
 *   - Mapping a numeric score to an end-user badge label
 *     (`Mới` / `Khá` / `Tốt` / `Nổi bật`) so UI surfaces stay
 *     consistent.
 *
 * No store / framework dependency — every helper is a pure function
 * over the `WorkerSkillScore[]` array. Callers persist the result via
 * `userStore.updateUser`.
 */

import type { WorkerSkillScore } from '@/types';

// ---------------------------------------------------------------------------
// Risk level mapping
// ---------------------------------------------------------------------------

export type JobRiskLevel = 'Low' | 'Medium' | 'High';

/**
 * Risk level for a given `jobType`. Spec mapping:
 *   - Low:    Event support, booth activation, sampling
 *   - Medium: Packaging, warehouse helper, F&B support
 *   - High:   Cash handling, high-value goods, unsupervised inventory
 *
 * The mapping is intentionally explicit (no defaults / catch-alls)
 * so when a future job type is added the developer has to decide the
 * risk classification rather than silently inheriting `'Low'`.
 *
 * Returns `'Medium'` for unknown types — pragmatic middle-ground that
 * surfaces a soft warning without hard-blocking.
 */
const LOW_RISK_TYPES = new Set<string>([
  'Phát tờ rơi',
  'Hỗ trợ sự kiện',
  // English / mock-data variants seen in the seeded shifts:
  'event-support',
  'sampling',
  'booth-activation',
]);

const HIGH_RISK_TYPES = new Set<string>([
  'Thu ngân',
  'Bảo vệ',
  // English / mock-data variants:
  'cash-handling',
  'high-value-goods',
  'unsupervised-inventory',
]);

const MEDIUM_RISK_TYPES = new Set<string>([
  'Phục vụ',
  'Pha chế',
  'Kho vận',
  // English / mock-data variants:
  'packaging',
  'warehouse-helper',
  'fnb-support',
]);

export function jobCategoryRiskLevel(jobType: string): JobRiskLevel {
  if (LOW_RISK_TYPES.has(jobType)) return 'Low';
  if (HIGH_RISK_TYPES.has(jobType)) return 'High';
  if (MEDIUM_RISK_TYPES.has(jobType)) return 'Medium';
  // Unknown type → conservative middle-ground.
  return 'Medium';
}

// ---------------------------------------------------------------------------
// Score update
// ---------------------------------------------------------------------------

/** Score cap. Mirrors `reputationScore`'s 0-100 range. */
export const SKILL_SCORE_CAP = 100;

/**
 * Map a 1-5 star rating to the 0-100 score scale we persist. The
 * formula `stars * 20` is the spec default for the "first score" path;
 * later updates use it as the rating's contribution before averaging.
 */
export function ratingToSkillScore(stars: number): number {
  const clamped = Math.max(1, Math.min(5, Math.round(stars)));
  return clamped * 20;
}

/**
 * Update a worker's per-category skill score after a rating event.
 *
 * Formula:
 *   - first rating  → score = stars * 20
 *   - later ratings → score = round(0.7 * old + 0.3 * (stars * 20))
 *
 * The 0.7 / 0.3 split gives recent shifts a meaningful but bounded
 * influence — a single bad shift can't tank a strong record, and a
 * single great shift can't carry a weak one. Tunable later if QA
 * shows the curve is too forgiving / too harsh.
 *
 * Pure: returns a new `WorkerSkillScore[]` array; never mutates input.
 */
export function applyRatingToSkillScores(
  scores: WorkerSkillScore[] | undefined,
  category: string,
  stars: number,
  occurredAt: string,
): WorkerSkillScore[] {
  const incoming = ratingToSkillScore(stars);
  const next = (scores ?? []).slice();
  const idx = next.findIndex((s) => s.category === category);
  if (idx === -1) {
    next.push({
      category,
      score: incoming,
      completedCount: 1,
      lastRating: stars,
      lastUpdatedAt: occurredAt,
    });
    return next;
  }
  const existing = next[idx];
  const blended = Math.round(0.7 * existing.score + 0.3 * incoming);
  const clamped = Math.max(0, Math.min(SKILL_SCORE_CAP, blended));
  next[idx] = {
    category,
    score: clamped,
    completedCount: existing.completedCount + 1,
    lastRating: stars,
    lastUpdatedAt: occurredAt,
  };
  return next;
}

// ---------------------------------------------------------------------------
// Lookup + presentation helpers
// ---------------------------------------------------------------------------

/**
 * Find the worker's skill-score entry for a category, or `undefined`
 * if the worker has no rating in that category yet.
 */
export function getSkillScoreForCategory(
  scores: WorkerSkillScore[] | undefined,
  category: string,
): WorkerSkillScore | undefined {
  return (scores ?? []).find((s) => s.category === category);
}

export type SkillBadge = 'New' | 'Decent' | 'Good' | 'Standout';

/**
 * Map a 0-100 skill score (or `undefined` for "no data yet") to the
 * canonical badge tier used across the UI. Pre-Fix-9 surfaces that
 * already render reputation labels can keep their own scale; this
 * helper is for the new skill-score chips only.
 *
 *   - undefined / completedCount === 0 → `'New'`  ("Mới")
 *   - 1–59     → `'Decent'`   ("Khá")     [intentionally lenient since
 *                                          the rating curve clamps the
 *                                          floor at 20 already]
 *   - 60–84    → `'Good'`     ("Tốt")
 *   - 85–100   → `'Standout'` ("Nổi bật")
 */
export function skillBadgeForScore(
  entry: WorkerSkillScore | undefined,
): SkillBadge {
  if (!entry || entry.completedCount === 0) return 'New';
  if (entry.score >= 85) return 'Standout';
  if (entry.score >= 60) return 'Good';
  return 'Decent';
}

export const SKILL_BADGE_LABEL: Record<SkillBadge, string> = {
  New: 'Mới',
  Decent: 'Khá',
  Good: 'Tốt',
  Standout: 'Nổi bật',
};

export function skillBadgeLabel(
  entry: WorkerSkillScore | undefined,
): string {
  return SKILL_BADGE_LABEL[skillBadgeForScore(entry)];
}
