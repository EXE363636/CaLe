/**
 * Availability-based job suggestions (CORE-STABILITY-9 Part 5).
 *
 * Pure TypeScript — no React, no I/O, NO AI. A rule-based scorer that
 * ranks public shifts for a worker by how well they fit the worker's
 * declared free time, location preference, skills, and wage.
 *
 * Weighted score (0–100):
 *   - time fit      40%  (shift fits inside an availability block)
 *   - location fit  25%  (shift location matches a preferred location)
 *   - skill fit     25%  (worker has the shift's job type as a skill /
 *                         a skill score in that category)
 *   - wage          10%  (higher hourly wage scores higher, capped)
 *
 * A shift that overlaps an already-approved/active job OR a busy block
 * is excluded (score 0 / filtered) — the worker cannot work two places
 * at once.
 */

import type { Application, ScheduleBlock, Shift, Worker } from '@/types';
import { hasScheduleConflict } from './scheduleConflict';

function momentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

/** Weights (sum = 1). */
export const MATCH_WEIGHTS = {
  time: 0.4,
  location: 0.25,
  skill: 0.25,
  wage: 0.1,
} as const;

/** Wage that maps to a full wage-score (đ/hour). Above this caps at 1. */
const WAGE_FULL_SCORE_AT = 100_000;

export type MatchLabel = 'Rất phù hợp' | 'Phù hợp' | 'Cần cân nhắc';

export interface ShiftMatch {
  shift: Shift;
  /** Total weighted score in [0, 100]. */
  score: number;
  /** Whether the shift fits inside an availability block. */
  fitsAvailability: boolean;
  label: MatchLabel;
}

/** Does `shift` fit entirely inside ANY of the worker's availability blocks? */
export function fitsInsideAvailability(
  shift: Pick<Shift, 'date' | 'startTime' | 'endTime'>,
  blocks: ScheduleBlock[],
): boolean {
  const s = momentMs(shift.date, shift.startTime);
  const e = momentMs(shift.date, shift.endTime);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return blocks.some((b) => {
    if (b.kind !== 'available') return false;
    if (b.date !== shift.date) return false;
    const bs = momentMs(b.date, b.startTime);
    const be = momentMs(b.date, b.endTime);
    if (Number.isNaN(bs) || Number.isNaN(be)) return false;
    return bs <= s && e <= be;
  });
}

function locationFit(shift: Shift, worker: Worker): number {
  const prefs = worker.preferredLocations ?? [];
  if (prefs.length === 0) return 0.5; // neutral when no preference declared
  const loc = (shift.location + ' ' + (shift.district ?? '')).toLowerCase();
  return prefs.some((p) => loc.includes(p.toLowerCase())) ? 1 : 0;
}

function skillFit(shift: Shift, worker: Worker): number {
  const jt = shift.jobType.toLowerCase();
  const hasSkill = (worker.skills ?? []).some(
    (s) => s.toLowerCase() === jt || jt.includes(s.toLowerCase()),
  );
  const hasScore = (worker.skillScores ?? []).some(
    (s) => s.category.toLowerCase() === jt && s.completedCount > 0,
  );
  if (hasSkill && hasScore) return 1;
  if (hasSkill || hasScore) return 0.7;
  return 0;
}

function wageFit(shift: Shift): number {
  const w = shift.hourlyWage;
  if (!Number.isFinite(w) || w <= 0) return 0;
  return Math.max(0, Math.min(1, w / WAGE_FULL_SCORE_AT));
}

/** Map a 0–100 score to a Vietnamese match label. */
export function matchLabel(score: number): MatchLabel {
  if (score >= 75) return 'Rất phù hợp';
  if (score >= 50) return 'Phù hợp';
  return 'Cần cân nhắc';
}

/**
 * Score a single shift for a worker. Returns `null` when the shift must
 * be EXCLUDED (overlaps a busy block or an already-approved/active job).
 */
export function scoreShiftForWorker(
  shift: Shift,
  worker: Worker,
  blocks: ScheduleBlock[],
  approvedRanges: Array<Pick<Shift, 'date' | 'startTime' | 'endTime'>>,
): ShiftMatch | null {
  const target = {
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
  };

  // Exclude if it overlaps a BUSY block.
  if (hasScheduleConflict(target, blocks)) return null;

  // Exclude if it overlaps an already-approved/active job.
  const ts = momentMs(shift.date, shift.startTime);
  const te = momentMs(shift.date, shift.endTime);
  for (const r of approvedRanges) {
    if (r.date !== shift.date) continue;
    const rs = momentMs(r.date, r.startTime);
    const re = momentMs(r.date, r.endTime);
    if (Number.isNaN(rs) || Number.isNaN(re)) continue;
    if (ts < re && te > rs) return null;
  }

  const fits = fitsInsideAvailability(shift, blocks);
  const timeScore = fits ? 1 : 0;
  const score = Math.round(
    (MATCH_WEIGHTS.time * timeScore +
      MATCH_WEIGHTS.location * locationFit(shift, worker) +
      MATCH_WEIGHTS.skill * skillFit(shift, worker) +
      MATCH_WEIGHTS.wage * wageFit(shift)) *
      100,
  );

  return {
    shift,
    score,
    fitsAvailability: fits,
    label: matchLabel(score),
  };
}

/**
 * Rank a list of public shifts for a worker, excluding conflicts. Sorted
 * by score descending, then by start datetime ascending. Pure.
 */
export function suggestShiftsForWorker(
  shifts: Shift[],
  worker: Worker,
  blocks: ScheduleBlock[],
  approvedApplications: Application[],
  approvedShiftIndex: Map<string, Shift>,
): ShiftMatch[] {
  const approvedRanges = approvedApplications
    .map((a) => approvedShiftIndex.get(a.shiftId))
    .filter((s): s is Shift => Boolean(s))
    .map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime }));

  const matches: ShiftMatch[] = [];
  for (const shift of shifts) {
    const m = scoreShiftForWorker(shift, worker, blocks, approvedRanges);
    if (m) matches.push(m);
  }
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return `${a.shift.date}T${a.shift.startTime}`.localeCompare(
      `${b.shift.date}T${b.shift.startTime}`,
    );
  });
  return matches;
}
