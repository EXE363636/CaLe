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
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate font-medium text-gray-800">
            {entry.category}
          </span>
          <span className="shrink-0 font-semibold text-indigo-700">
            Cấp {p.level}
          </span>
        </div>
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <span
            className="block h-full min-w-[2px] bg-indigo-500"
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>
    );
  }

  return (
    <li className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white px-4 py-3 text-sm shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-semibold text-gray-900">{entry.category}</p>
        <span className="shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          Cấp {p.level}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-indigo-100">
          <span
            className="block h-full min-w-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="shrink-0 font-mono text-[11px] text-gray-500">
          {atMax ? `${p.xp} XP` : `${p.intoLevel}/${p.levelSpan} XP`}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500">
        Hoàn thành: {entry.completedCount} ca
        {entry.score > 0 ? ` · ${entry.score}/100 điểm kỹ năng` : ''}
      </p>
    </li>
  );
}
