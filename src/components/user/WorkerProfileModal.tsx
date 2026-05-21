'use client';

/**
 * Full-profile modal opened from the employer applicant list.
 * Shows everything the employer might need to make a decision: bio, full
 * skills list, preferences, rating history, no-show / cancellation stats.
 */

import { Modal, StarRating } from '@/components/ui';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';
import { VerificationBadge } from './VerificationBadge';
import { averageRating } from '@/domain/rating';
import { formatDateVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Worker } from '@/types';

interface WorkerProfileModalProps {
  open: boolean;
  onClose: () => void;
  worker: Worker | null;
}

export function WorkerProfileModal({ open, onClose, worker }: WorkerProfileModalProps) {
  if (!worker) return null;

  const avg = averageRating(worker.ratingsReceived);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('employer.applicant.fullProfile')}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-5">
        {/* Identity row */}
        <div className="flex items-center gap-3">
          <UserAvatar name={worker.fullName} avatarUrl={worker.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900">{worker.fullName}</p>
            <p className="mt-0.5 truncate text-xs text-gray-500">{worker.email}</p>
          </div>
          <ReputationBadge score={worker.reputationScore} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3">
          <Stat
            value={String(worker.completedShiftCount)}
            label={t('employer.applicant.completedShifts')}
          />
          <Stat
            value={avg === null ? '—' : avg.toFixed(1)}
            label={t('employer.applicant.avgRating')}
          />
          <Stat value={String(worker.noShowCount)} label={t('employer.applicant.noShows')} />
        </div>

        {/* Verification */}
        <Section title="Xác minh">
          <VerificationBadge verifications={worker.verifications} />
        </Section>

        {/* Bio */}
        <Section title={t('employer.applicant.bio')}>
          {worker.bio ? (
            <p className="whitespace-pre-line text-sm text-gray-700">{worker.bio}</p>
          ) : (
            <p className="text-sm italic text-gray-400">
              {t('employer.applicant.noBio')}
            </p>
          )}
        </Section>

        {/* Skills */}
        {worker.skills.length > 0 && (
          <Section title={t('employer.applicant.skills')}>
            <ChipList items={worker.skills} />
          </Section>
        )}

        {/* Preferred job types */}
        {worker.preferredJobTypes.length > 0 && (
          <Section title={t('employer.applicant.preferredJobs')}>
            <ChipList items={worker.preferredJobTypes} />
          </Section>
        )}

        {/* Preferred locations */}
        {worker.preferredLocations.length > 0 && (
          <Section title={t('employer.applicant.preferredLocations')}>
            <ChipList items={worker.preferredLocations} />
          </Section>
        )}

        {/* Rating history */}
        <Section title={t('employer.applicant.ratingHistory')}>
          {worker.ratingsReceived.length === 0 ? (
            <p className="text-sm italic text-gray-400">{t('reputation.noRatings')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {worker.ratingsReceived.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <StarRating value={r.stars} readOnly size="sm" />
                    <span className="text-xs text-gray-400">
                      {formatDateVN(r.createdAt)}
                    </span>
                  </div>
                  {r.feedback && (
                    <p className="mt-1.5 text-sm text-gray-700">
                      &ldquo;{r.feedback}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-lg font-bold text-gray-900">{value}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, idx) => (
        <span
          key={`${it}-${idx}`}
          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
        >
          {it}
        </span>
      ))}
    </div>
  );
}
