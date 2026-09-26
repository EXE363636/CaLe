/**
 * SkillProgressBar (CORE-STABILITY-9 Part 4).
 *
 * Renders one worker skill as a level chip + XP progress line bar.
 * Pure presentational — no store access; the caller passes the
 * `WorkerSkillScore` entry. Used on the worker profile and (compact
 * variant) on the employer applicant card.
 */

import { skillProgress, MAX_LEVEL } from '@/domain/skillProgression';
import type { WorkerSkillScore } from '@/types';

interface SkillProgressBarProps {
  entry: WorkerSkillScore;
  /** Compact = single line for applicant cards; default = full card row. */
  compact?: boolean;
}

export function SkillProgressBar({ entry, compact = false }: SkillProgressBarProps) {
  const p = skillProgress(entry.xp ?? 0);
  const pct = Math.round(p.fraction * 100);
  const atMax = p.level >= MAX_LEVEL;

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-medium text-gray-800">
            {entry.category}
          </span>
          <span className="shrink-0 font-semibold text-orange-700">
            Cấp {p.level}
          </span>
        </div>
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <span
            className="block h-full min-w-[2px] bg-orange-500"
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>
    );
  }

  return (
    <li className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-semibold text-gray-900">{entry.category}</p>
        <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
          Cấp {p.level}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-orange-100">
          <span
            className="block h-full min-w-[3px] rounded-full bg-orange-500 transition-[width] motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="shrink-0 text-xs tabular-nums text-gray-500">
          {atMax ? `${p.xp} XP` : `${p.intoLevel}/${p.levelSpan} XP`}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        Hoàn thành: {entry.completedCount} ca
        {entry.score > 0 ? ` · ${entry.score}/100 điểm kỹ năng` : ''}
      </p>
    </li>
  );
}
