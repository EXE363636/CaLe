'use client';

/**
 * Compact, decision-focused applicant row used on the employer manage shift
 * page. Shows only the data an employer needs to scan quickly:
 *  - avatar + name
 *  - reputation + verification badges
 *  - completed shift count + avg rating as stat chips
 *  - top 3 skills as pills
 *
 * The full profile (bio, all skills, preferences, rating history) lives in
 * the `WorkerProfileModal`, which is opened by the "Xem hồ sơ" button.
 *
 * Phase 10A-Fix-5 — verification chips are LIVE-DERIVED on this row,
 * not passed in by the caller. The component subscribes to
 * `useVerificationStore.workerDocuments` and runs
 * `getWorkerVerificationSummary(...)` on every render so admin-side
 * approvals reflect immediately on every employer-facing surface that
 * uses this row. The legacy `<VerificationBadge>` snapshot derived
 * from `worker.verifications` is no longer rendered here.
 */

import { useMemo } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import {
  getSkillScoreForCategory,
  skillBadgeLabel,
} from '@/domain/skillScore';
import { averageRating } from '@/domain/rating';
import { SkillProgressBar } from './SkillProgressBar';
import { t } from '@/i18n/vi';
import type { ReactNode } from 'react';
import type { Worker } from '@/types';

interface WorkerSummaryRowProps {
  worker: Worker;
  /** Right-aligned content — typically a status badge. */
  statusSlot?: ReactNode;
  /** Bottom action area — typically Approve/Reject + actions. */
  actions?: ReactNode;
  onViewProfile: () => void;
  /**
   * Phase 10A-Fix-9 — when set, the row shows a "Phù hợp công việc:
   * N điểm" chip derived from the worker's per-category skill score
   * for this `jobType`. Optional so non-employer surfaces (worker
   * profile preview, admin queue) can keep rendering the row without
   * an unrelated chip.
   */
  jobCategory?: string;
  className?: string;
}

const TOP_SKILLS = 3;

export function WorkerSummaryRow({
  worker,
  statusSlot,
  actions,
  onViewProfile,
  jobCategory,
  className = '',
}: WorkerSummaryRowProps) {
  const workerDocuments = useVerificationStore((s) => s.workerDocuments);
  const summary = useMemo(
    () => getWorkerVerificationSummary(worker, workerDocuments),
    [worker, workerDocuments],
  );
  // Phase 10A-Fix-9: per-category skill score chip. Visible only when
  // the caller supplies `jobCategory` (e.g. the employer applicant
  // list passes the shift's `jobType`). Workers with no rating in the
  // category get a "no data yet" chip so the employer doesn't have to
  // guess whether the score is missing or just zero.
  const skillEntry = jobCategory
    ? getSkillScoreForCategory(worker.skillScores, jobCategory)
    : undefined;
  const skillBadge = jobCategory ? skillBadgeLabel(skillEntry) : undefined;
  const avg = averageRating(worker.ratingsReceived);

  return (
    <Card className={className}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <UserAvatar name={worker.fullName} avatarUrl={worker.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onViewProfile}
              className="truncate text-left font-semibold text-gray-900 hover:text-orange-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
            >
              {worker.fullName}
            </button>
            <ReputationBadge score={worker.reputationScore} />
          </div>
          {/* Phase 10A-Fix-5 — live verification chips. Phone stays on
              the user record (no dedicated phone-doc store), every
              identity method is derived from the verification store. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {worker.verifications.includes('phone') && (
              <Badge tone="info">{t('verification.phone')}</Badge>
            )}
            {summary.identityVerified ? (
              <Badge tone="success">Đã xác minh danh tính</Badge>
            ) : (
              <Badge tone="neutral">Chưa xác minh danh tính</Badge>
            )}
            {summary.approvedMethods.map((m) => (
              <span
                key={m.type}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
              >
                <span>{m.label}</span>
                {m.maskedIdentifier && (
                  <span className="font-mono text-emerald-600/80">
                    {m.maskedIdentifier}
                  </span>
                )}
              </span>
            ))}
            {summary.pendingCount > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {summary.pendingCount} đang chờ duyệt
              </span>
            )}
            {/* Phase 10A-Fix-9: per-category skill score chip (employer
                applicant view). Always shows — when the worker has no
                rating in this category yet, the chip reads "Mới" so
                the employer doesn't see a missing field. */}
            {jobCategory && (
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  skillEntry && skillEntry.completedCount > 0
                    ? 'bg-indigo-50 text-indigo-800'
                    : 'bg-gray-100 text-gray-600',
                ].join(' ')}
                title={
                  skillEntry && skillEntry.completedCount > 0
                    ? `Skill score for ${jobCategory}`
                    : `No data yet for ${jobCategory}`
                }
              >
                {skillEntry && skillEntry.completedCount > 0
                  ? `Phù hợp công việc: ${skillEntry.score} điểm · ${skillBadge}`
                  : `Phù hợp công việc: ${skillBadge}`}
              </span>
            )}
          </div>
        </div>
        {statusSlot && <div className="shrink-0">{statusSlot}</div>}
      </div>

      {/* Stat chips */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatChip
          value={String(worker.completedShiftCount)}
          label={t('employer.applicant.completedShifts')}
          tone="success"
        />
        <StatChip
          value={avg === null ? '—' : avg.toFixed(1)}
          label={t('employer.applicant.avgRating')}
          tone={avg === null ? 'neutral' : 'info'}
        />
        <StatChip
          value={String(worker.noShowCount)}
          label={t('employer.applicant.noShows')}
          tone={worker.noShowCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Top skills */}
      {worker.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {worker.skills.slice(0, TOP_SKILLS).map((s, idx) => (
            <span
              key={`${s}-${idx}`}
              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
            >
              {s}
            </span>
          ))}
          {worker.skills.length > TOP_SKILLS && (
            <button
              type="button"
              onClick={onViewProfile}
              className="text-xs font-medium text-orange-600 hover:underline"
            >
              +{worker.skills.length - TOP_SKILLS}
            </button>
          )}
        </div>
      )}

      {/* CORE-STABILITY-9 Part 4 — "Kỹ năng nổi bật": top skills by
          XP level so the employer can scan progression at a glance. */}
      {(worker.skillScores ?? []).some((s) => (s.xp ?? 0) > 0) && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {t('skill.highlight.title')}
          </p>
          <div className="flex flex-col gap-1.5">
            {[...(worker.skillScores ?? [])]
              .filter((s) => (s.xp ?? 0) > 0)
              .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
              .slice(0, 3)
              .map((entry) => (
                <SkillProgressBar key={entry.category} entry={entry} compact />
              ))}
          </div>
        </div>
      )}

      {/* Footer: actions + view profile */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
        <Button size="sm" variant="ghost" onClick={onViewProfile}>
          {t('employer.applicant.viewProfile')}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StatChip — tight rectangle with a number + small label
// ---------------------------------------------------------------------------

const toneClasses = {
  success: 'bg-green-50 text-green-800 border-green-100',
  info: 'bg-blue-50 text-blue-800 border-blue-100',
  danger: 'bg-red-50 text-red-800 border-red-100',
  neutral: 'bg-gray-50 text-gray-700 border-gray-100',
} as const;

type StatTone = keyof typeof toneClasses;

function StatChip({
  value,
  label,
  tone = 'neutral',
}: {
  value: string;
  label: string;
  tone?: StatTone;
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center',
        toneClasses[tone],
      ].join(' ')}
    >
      <span className="text-base font-bold leading-tight">{value}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide opacity-80 leading-tight">
        {label}
      </span>
    </div>
  );
}
