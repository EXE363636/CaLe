/**
 * WorkerProfileCard
 *
 * Summarises a worker's profile for employer application-review screens.
 * Shows avatar, name, reputation, verifications, star rating, completed
 * shift count, bio, and skill chips.
 *
 * Phase 10A-Fix-5 — verification chips are LIVE-DERIVED from the
 * verification store, not the frozen `worker.verifications` flag-array.
 * Component is now a client component because it subscribes to a
 * Zustand slice. Keeps the same employer-facing privacy boundary —
 * only badge + masked identifier per approved method, never the
 * fullIdentifier or image URLs.
 */

'use client';

import { useMemo } from 'react';
import { Card, StarRating, Badge } from '@/components/ui';
import { t } from '@/i18n/vi';
import { averageRating } from '@/domain/rating';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import type { Worker } from '@/types';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';

export interface WorkerProfileCardProps {
  worker: Worker;
  className?: string;
}

export function WorkerProfileCard({ worker, className = '' }: WorkerProfileCardProps) {
  const avg = averageRating(worker.ratingsReceived);
  const workerDocuments = useVerificationStore((s) => s.workerDocuments);
  const summary = useMemo(
    () => getWorkerVerificationSummary(worker, workerDocuments),
    [worker, workerDocuments],
  );

  return (
    <Card className={className}>
      {/* Row 1: avatar + name + reputation */}
      <div className="flex items-center gap-3">
        <UserAvatar
          name={worker.fullName}
          avatarUrl={worker.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{worker.fullName}</p>
        </div>
        <ReputationBadge score={worker.reputationScore} />
      </div>

      {/* Row 2: live verification badges */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
          >
            <span>{m.label}</span>
            {m.maskedIdentifier && (
              <span className="font-mono text-emerald-600/80">
                {m.maskedIdentifier}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Row 3: star rating or empty state */}
      {worker.ratingsReceived.length > 0 && avg !== null ? (
        <div className="mt-2 flex items-center gap-2">
          <StarRating value={avg} readOnly size="sm" />
          <span className="text-sm text-gray-700">
            {avg.toFixed(1)} ({worker.ratingsReceived.length} {t('common.stars')})
          </span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400">{t('reputation.noRatings')}</p>
      )}

      {/* Row 4: completed shift count */}
      <p className="mt-2 text-sm text-gray-600">
        {worker.completedShiftCount} {t('worker.dashboard.stats.completedShifts').toLowerCase()}
      </p>

      {/* Row 5: bio (optional, max 2 lines) */}
      {worker.bio && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{worker.bio}</p>
      )}

      {/* Row 6: skill chips (optional) */}
      {worker.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {worker.skills.map((skill, idx) => (
            <Badge key={`${skill}-${idx}`} tone="neutral" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
