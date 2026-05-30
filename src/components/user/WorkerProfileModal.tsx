'use client';

/**
 * Full-profile modal opened from the employer applicant list.
 * Shows everything the employer might need to make a decision: bio, full
 * skills list, preferences, rating history, no-show / cancellation stats.
 *
 * Phase 10A-Fix-4 — verification info is now LIVE-DERIVED from the
 * verification store via `getWorkerVerificationSummary(...)`. The
 * legacy frozen `worker.verifications` flag-array is no longer the
 * source of truth on this surface; if admin approves a new doc, the
 * employer's view reflects it on next render. The full document
 * subset (front/back/selfie/`fullIdentifier`) is intentionally NOT
 * surfaced — that boundary remains admin-only per the Phase 10A
 * privacy rule.
 */

import { useMemo } from 'react';
import { Modal, StarRating, Badge } from '@/components/ui';
import { UserAvatar } from './UserAvatar';
import { ReputationBadge } from './ReputationBadge';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import { averageRating } from '@/domain/rating';
import { formatDateVN, formatLogDateTime } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Worker } from '@/types';

interface WorkerProfileModalProps {
  open: boolean;
  onClose: () => void;
  worker: Worker | null;
}

export function WorkerProfileModal({ open, onClose, worker }: WorkerProfileModalProps) {
  // Phase 10A-Fix-4 — read the verification slice so the modal always
  // shows current admin-approval state. We compute the public-safe
  // summary inside `useMemo` to keep the selector return stable.
  const workerDocuments = useVerificationStore((s) => s.workerDocuments);
  const verificationSummary = useMemo(
    () =>
      worker ? getWorkerVerificationSummary(worker, workerDocuments) : null,
    [worker, workerDocuments],
  );

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

        {/* Verification — Phase 10A-Fix-4: live summary, not the
            frozen `worker.verifications` flag array. Public-safe:
            badge + method label + masked identifier only.
            Phase 10A-Fix-5: render every approved method, not just
            the most-recent primary, so a worker who has CCCD +
            student card + driver license shows all three. */}
        <Section title="Xác minh">
          {verificationSummary ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {worker.verifications.includes('phone') && (
                <Badge tone="info">{t('verification.phone')}</Badge>
              )}
              {verificationSummary.identityVerified ? (
                <Badge tone="success">Đã xác minh danh tính</Badge>
              ) : (
                <Badge tone="neutral">Chưa xác minh danh tính</Badge>
              )}
              {verificationSummary.approvedMethods.map((m) => (
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
              {verificationSummary.pendingCount > 0 && (
                <span className="text-[11px] text-amber-700">
                  +{verificationSummary.pendingCount} đang chờ duyệt
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
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
                    <span className="font-mono text-[11px] text-gray-400">
                      {formatLogDateTime(r.createdAt)}
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
