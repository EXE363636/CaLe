'use client';

/**
 * EmployerTrustPanel (Phase 9I).
 *
 * Small inline trust strip rendered on `/shifts/[id]` directly under the
 * employer name. Surfaces the employer's average worker rating, total
 * review count, and verification status so a worker can decide whether
 * to apply without opening the full profile modal first.
 *
 * Pure presentation — pulls data from `useEmployerFeedbackStore` (live
 * worker → employer feedback) but does not mutate. Falls back to a
 * "no reviews yet" line when the employer has none.
 */

import { useMemo } from 'react';
import { Badge, StarRating } from '@/components/ui';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { t } from '@/i18n/vi';
import type { Employer } from '@/types';

interface EmployerTrustPanelProps {
  employer: Employer;
  onOpenProfile?: () => void;
}

export function EmployerTrustPanel({
  employer,
  onOpenProfile,
}: EmployerTrustPanelProps) {
  // Stable raw selector — filter and average inside `useMemo` so we
  // never feed Zustand a fresh-array selector (HANDOFF Section 11 rule).
  const allFeedback = useEmployerFeedbackStore((s) => s.feedback);
  const { avg, count, recent } = useMemo(() => {
    const mine = allFeedback.filter((f) => f.toEmployerId === employer.id);
    if (mine.length === 0) {
      return { avg: null as number | null, count: 0, recent: undefined };
    }
    const total = mine.reduce((acc, f) => acc + f.stars, 0);
    const sorted = [...mine].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return {
      avg: total / mine.length,
      count: mine.length,
      recent: sorted[0],
    };
  }, [allFeedback, employer.id]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2">
      <div className="flex items-center gap-2">
        {avg !== null ? (
          <>
            <StarRating value={Math.round(avg)} readOnly size="sm" />
            <span className="text-sm font-semibold text-gray-900">
              {avg.toFixed(1)} / 5
            </span>
            <span className="text-xs text-gray-500">
              ({count} {t('common.reviews')})
            </span>
          </>
        ) : (
          <span className="text-xs italic text-gray-500">
            {t('employer.trust.noReviews')}
          </span>
        )}
      </div>

      {employer.verifiedBusiness ? (
        <Badge tone="success">{t('employer.profile.verifiedBusiness')}</Badge>
      ) : (
        <Badge tone="neutral">{t('employer.profile.notVerified')}</Badge>
      )}

      {recent?.comment && (
        <p className="w-full truncate text-xs italic text-gray-600">
          “{recent.comment}”
        </p>
      )}

      {onOpenProfile && (
        <button
          type="button"
          onClick={onOpenProfile}
          className="ml-auto text-xs font-medium text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
        >
          {t('employer.trust.viewProfile')} →
        </button>
      )}
    </div>
  );
}
