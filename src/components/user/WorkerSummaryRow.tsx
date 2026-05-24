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
 */

import { Card, Button } from '@/components/ui';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';
import { VerificationBadge } from './VerificationBadge';
import { averageRating } from '@/domain/rating';
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
   * Phase 10A — optional identity-verification cue. When provided, shows
   * a small "Đã xác minh • {method} • {masked}" chip below the name.
   * Employer-side surfaces only see the masked identifier; the full
   * document is admin-only.
   */
  identityBadge?: {
    methodLabel: string;
    maskedIdentifier?: string;
  };
  className?: string;
}

const TOP_SKILLS = 3;

export function WorkerSummaryRow({
  worker,
  statusSlot,
  actions,
  onViewProfile,
  identityBadge,
  className = '',
}: WorkerSummaryRowProps) {
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
          <div className="mt-1.5">
            <VerificationBadge verifications={worker.verifications} />
          </div>
          {identityBadge && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Đã xác minh · {identityBadge.methodLabel}</span>
              {identityBadge.maskedIdentifier && (
                <span className="font-mono text-emerald-600/80">
                  {identityBadge.maskedIdentifier}
                </span>
              )}
            </div>
          )}
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
