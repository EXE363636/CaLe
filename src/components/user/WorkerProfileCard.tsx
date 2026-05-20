/**
 * WorkerProfileCard
 *
 * Summarises a worker's profile for employer application-review screens.
 * Shows avatar, name, reputation, verifications, star rating, completed
 * shift count, bio, and skill chips.
 *
 * No hooks → no 'use client' needed.
 */

import { Card, StarRating, Badge } from '@/components/ui';
import { t } from '@/i18n/vi';
import { averageRating } from '@/domain/rating';
import type { Worker } from '@/types';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';
import { VerificationBadge } from './VerificationBadge';

export interface WorkerProfileCardProps {
  worker: Worker;
  className?: string;
}

export function WorkerProfileCard({ worker, className = '' }: WorkerProfileCardProps) {
  const avg = averageRating(worker.ratingsReceived);

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

      {/* Row 2: verification badges */}
      <div className="mt-2">
        <VerificationBadge verifications={worker.verifications} />
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
          {worker.skills.map((skill) => (
            <Badge key={skill} tone="neutral" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
