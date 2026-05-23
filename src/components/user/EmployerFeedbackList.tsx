'use client';

/**
 * Read-only list of worker → employer feedback entries (Phase 6).
 *
 * Used inside `EmployerProfileModal` and the employer branch of
 * `AdminUserProfileModal` so both audiences see the same trust signal.
 * Sources data via `useEmployerFeedbackStore` and renders the most
 * recent N entries with stars + tags + optional comment.
 */

import { useMemo } from 'react';
import { StarRating } from '@/components/ui';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { formatDateVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { EmployerFeedbackTag } from '@/types';

interface EmployerFeedbackListProps {
  employerId: string;
  /** Maximum number of entries to render. Defaults to 5. */
  limit?: number;
}

export function EmployerFeedbackList({
  employerId,
  limit = 5,
}: EmployerFeedbackListProps) {
  // Pull the raw `feedback` array (stable selector) and filter / sort
  // inside `useMemo` so we never feed Zustand a fresh-array selector.
  const all = useEmployerFeedbackStore((s) => s.feedback);

  // Full per-employer slice — used for the average across all feedback.
  const allEntries = useMemo(
    () => all.filter((f) => f.toEmployerId === employerId),
    [all, employerId],
  );

  // Visible slice — most recent `limit` entries. Both memos stay above
  // any conditional return so hook order is stable across renders.
  const entries = useMemo(
    () =>
      [...allEntries]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    [allEntries, limit],
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm italic text-gray-400">
        {t('employerFeedback.empty')}
      </p>
    );
  }

  // Average across the whole feedback set (not just the visible slice).
  const avg =
    allEntries.length === 0
      ? null
      : allEntries.reduce((acc, f) => acc + f.stars, 0) / allEntries.length;

  return (
    <div>
      {avg !== null && (
        <div className="mb-3 flex items-center gap-2">
          <StarRating value={Math.round(avg)} readOnly size="sm" />
          <span className="text-sm font-medium text-gray-900">
            {avg.toFixed(1)} / 5
          </span>
          <span className="text-xs text-gray-500">
            ({allEntries.length})
          </span>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {entries.map((f) => (
          <li key={f.id} className="rounded-lg border border-gray-100 px-3 py-2">
            <div className="flex items-center justify-between">
              <StarRating value={f.stars} readOnly size="sm" />
              <span className="text-xs text-gray-400">
                {formatDateVN(f.createdAt)}
              </span>
            </div>
            {f.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {f.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            )}
            {f.comment && (
              <p className="mt-1.5 text-sm text-gray-700">
                &ldquo;{f.comment}&rdquo;
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TagChip({ tag }: { tag: EmployerFeedbackTag }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
      {t(`employerFeedback.tag.${tag}`)}
    </span>
  );
}
