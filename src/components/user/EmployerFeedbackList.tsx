'use client';

/**
 * Worker → employer feedback list. Thin wrapper over the shared
 * `ReviewList` so reviews in BOTH directions (worker → employer here,
 * employer → worker on the worker profile) look and behave the same.
 *
 * Used inside `EmployerProfileModal`, the employer profile page and the
 * employer branch of `AdminUserProfileModal`.
 */

import { useMemo } from 'react';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { t } from '@/i18n/vi';
import { ReviewList } from './ReviewList';

interface EmployerFeedbackListProps {
  employerId: string;
  /** Maximum number of entries to render. Defaults to 5. */
  limit?: number;
}

export function EmployerFeedbackList({ employerId, limit = 5 }: EmployerFeedbackListProps) {
  const all = useEmployerFeedbackStore((s) => s.feedback);
  const items = useMemo(
    () => all.filter((f) => f.toEmployerId === employerId),
    [all, employerId],
  );
  return (
    <ReviewList
      items={items}
      reportKind="employerFeedback"
      limit={limit}
      emptyText={t('employerFeedback.empty')}
    />
  );
}
