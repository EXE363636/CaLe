/**
 * Worker skill progression (CORE-STABILITY-9 Part 4) — XP / level MVP.
 *
 * Pure TypeScript — no React, no I/O. A levelling ("cày cấp") layer on
 * top of the existing per-category `WorkerSkillScore` (rating-derived
 * 0–100 score). XP grows when a worker completes a shift well and earns
 * positive reviews; a dispute/no-show earns no XP.
 *
 * XP formula (per confirmed shift in a category):
 *   - completed shift           : +10
 *   - 5-star review             : +5
 *   - 4-star review             : +3
 *   - (1–3 star)                : +0
 *   - no dispute on the shift   : +2
 *   - disputed / no-show / lost : 0 XP total (the award is skipped)
 *
 * Level thresholds (cumulative XP):
 *   - Level 1: 0–49
 *   - Level 2: 50–119
 *   - Level 3: 120–249
 *   - Level 4: 250–499
 *   - Level 5: 500+
 */

import type { WorkerSkillScore } from '@/types';

export const LEVEL_THRESHOLDS: ReadonlyArray<{ level: number; min: number }> = [
  { level: 5, min: 500 },
  { level: 4, min: 250 },
  { level: 3, min: 120 },
  { level: 2, min: 50 },
  { level: 1, min: 0 },
];

/** Max level in the MVP. */
export const MAX_LEVEL = 5;

/** Resolve the level for a cumulative XP value. */
export function levelForXp(xp: number): number {
  const safe = Number.isFinite(xp) && xp > 0 ? xp : 0;
  for (const t of LEVEL_THRESHOLDS) {
    if (safe >= t.min) return t.level;
  }
  return 1;
}

/** Lower XP bound (inclusive) for the current level. */
export function levelFloor(level: number): number {
  return LEVEL_THRESHOLDS.find((t) => t.level === level)?.min ?? 0;
}

/**
 * Lower XP bound of the NEXT level, or `null` at max level. Used to
 * render the progress bar within the current level.
 */
export function nextLevelAt(level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS.find((t) => t.level === level + 1)?.min ?? null;
}

export interface SkillProgress {
  level: number;
  xp: number;
  /** XP into the current level (xp - levelFloor). */
  intoLevel: number;
  /** XP span of the current level (next - floor), or null at max. */
  levelSpan: number | null;
  /** Progress fraction within the current level in [0, 1]; 1 at max. */
  fraction: number;
}

/** Compute the render-ready progress for a cumulative XP value. */
export function skillProgress(xp: number): SkillProgress {
  const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  const level = levelForXp(safeXp);
  const floor = levelFloor(level);
  const next = nextLevelAt(level);
  const intoLevel = safeXp - floor;
  const levelSpan = next === null ? null : next - floor;
  const fraction =
    levelSpan === null || levelSpan <= 0
      ? 1
      : Math.max(0, Math.min(1, intoLevel / levelSpan));
  return { level, xp: safeXp, intoLevel, levelSpan, fraction };
}

/**
 * XP earned for a single confirmed shift in a category.
 *
 * @param stars     employer rating 1–5 (or undefined when not yet rated)
 * @param disputed  true when the shift had a dispute / the worker lost
 *                  it (no-show etc.) — in that case NO XP is awarded.
 */
export function xpForCompletion(
  stars: number | undefined,
  disputed: boolean,
): number {
  if (disputed) return 0;
  let xp = 10; // completed shift
  const s = typeof stars === 'number' ? Math.round(stars) : 0;
  if (s >= 5) xp += 5;
  else if (s === 4) xp += 3;
  // 1–3 stars: no rating bonus.
  xp += 2; // no dispute
  return xp;
}

/**
 * Apply an XP award for a completed shift to the worker's per-category
 * skill scores. Returns a NEW array (never mutates). Creates the
 * category entry if missing. `disputed` shifts award 0 XP (no-op on XP
 * but still returns the array unchanged for that field).
 *
 * Note: this updates ONLY the `xp` field — the rating-derived `score`
 * is maintained separately by `applyRatingToSkillScores`. Callers
 * typically run both on confirmation.
 */
export function awardSkillXp(
  scores: WorkerSkillScore[] | undefined,
  category: string,
  stars: number | undefined,
  disputed: boolean,
  occurredAt: string,
): WorkerSkillScore[] {
  const gain = xpForCompletion(stars, disputed);
  const next = (scores ?? []).slice();
  const idx = next.findIndex((s) => s.category === category);
  if (idx === -1) {
    next.push({
      category,
      score: 0,
      completedCount: 0,
      xp: gain,
      lastUpdatedAt: occurredAt,
    });
  } else {
    const cur = next[idx];
    next[idx] = {
      ...cur,
      xp: (cur.xp ?? 0) + gain,
      lastUpdatedAt: occurredAt,
    };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Display list (PRODUCT-UX-FIX-BACKEND-PREP-1 Part 2)
// ---------------------------------------------------------------------------

/**
 * Default casual-job skill categories for CaLẻ. These match the real
 * job types on the platform — NOT programming / tech skills. A worker
 * who has not completed any shift yet still sees these cards at Level 1
 * / 0 XP so the skill section is never a blank surface.
 */
export const DEFAULT_SKILL_CATEGORIES: ReadonlyArray<string> = [
  'Phục vụ',
  'Pha chế',
  'Bốc xếp',
  'Kho vận',
  'Sự kiện',
  'Thu ngân',
  'Đóng gói',
  'Giao tiếp',
];

/**
 * Build the ordered list of skill cards to render on the worker
 * profile / dashboard. Merges the worker's real `skillScores` with the
 * default casual-job categories so the section is never empty:
 *
 *   - real scores first, sorted by XP descending (most-progressed top);
 *   - then any default categories the worker has no score for yet,
 *     rendered as Level 1 / 0 XP placeholders (completedCount 0).
 *
 * Pure — never mutates the input. The placeholder entries carry
 * `xp: 0` / `completedCount: 0` so `SkillProgressBar` renders Level 1
 * with an empty (but visible) progress track.
 */
export function buildSkillDisplayList(
  scores: WorkerSkillScore[] | undefined,
): WorkerSkillScore[] {
  const real = [...(scores ?? [])].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
  const seen = new Set(real.map((s) => s.category));
  const placeholders: WorkerSkillScore[] = DEFAULT_SKILL_CATEGORIES.filter(
    (c) => !seen.has(c),
  ).map((category) => ({
    category,
    score: 0,
    completedCount: 0,
    xp: 0,
    lastUpdatedAt: '',
  }));
  return [...real, ...placeholders];
}
