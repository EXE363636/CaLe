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
import { SkillProgressBar } from './SkillProgressBar';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import { averageRating } from '@/domain/rating';
import { buildSkillDisplayList } from '@/domain/skillProgression';
import { formatLogDateTime } from '@/lib/format';
import { t } from '@/i18n/vi';
import { hasCapability } from '@/data/capabilities';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { derivedReputationOf, useDerivedReputationMap } from '@/lib/useDerivedReputation';
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

  // BUG 11 / Property 9 — render each skill as a per-skill level/progress bar
  // derived from THIS worker's own `skillScores`, replacing the old flat
  // name-only chips. `buildSkillDisplayList` appends DEFAULT_SKILL_CATEGORIES
  // placeholders (Cấp 1 / 0 XP) so a worker's OWN dashboard/profile is never
  // blank — but an employer viewing a SPECIFIC worker must see only the skills
  // this worker actually earned (BUG 10 — "not hard-coded the same for
  // everyone"), so we filter those injected placeholders back out to the
  // worker's real recorded categories (kept in the XP-desc order
  // buildSkillDisplayList already applies to the real scores).
  const recordedSkills = useMemo(() => {
    const recorded = new Set((worker?.skillScores ?? []).map((s) => s.category));
    return buildSkillDisplayList(worker?.skillScores).filter((s) =>
      recorded.has(s.category),
    );
  }, [worker?.skillScores]);
  const derivedMap = useDerivedReputationMap();

  if (!worker) return null;

  const avg = averageRating(worker.ratingsReceived);
  // Production: không có điểm uy tín / đánh giá / điểm kỹ năng thật và giấy tờ
  // xác minh không có ở client → ẩn thay vì hiện số mặc định như dữ liệu thật.
  // Số ca / vắng mặt đếm từ đơn của các ca mà người xem thấy được ("với bạn").
  const ratingsOn = hasCapability('ratings');
  const serverMode = isSupabaseEnv();
  const derived = derivedReputationOf(derivedMap, worker.id);
  const completedValue = serverMode ? derived.completed : worker.completedShiftCount;
  const noShowValue = serverMode ? derived.noShows : worker.noShowCount;

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
            <p className="mt-0.5 truncate text-xs text-gray-600">{worker.email}</p>
          </div>
          {ratingsOn && <ReputationBadge score={worker.reputationScore} />}
        </div>

        {/* Stats grid */}
        <div
          className={[
            'grid gap-2 rounded-xl bg-gray-50 p-3',
            ratingsOn ? 'grid-cols-3' : 'grid-cols-2',
          ].join(' ')}
        >
          <Stat
            value={String(completedValue)}
            label={t(serverMode ? 'workerRow.completedWithYou' : 'employer.applicant.completedShifts')}
          />
          {ratingsOn && (
            <Stat
              value={avg === null ? '—' : avg.toFixed(1)}
              label={t('employer.applicant.avgRating')}
            />
          )}
          <Stat
            value={String(noShowValue)}
            label={t(serverMode ? 'workerRow.noShowsWithYou' : 'employer.applicant.noShows')}
          />
        </div>

        {/* Verification — Phase 10A-Fix-4: live summary, not the
            frozen `worker.verifications` flag array. Public-safe:
            badge + method label + masked identifier only.
            Phase 10A-Fix-5: render every approved method, not just
            the most-recent primary, so a worker who has CCCD +
            student card + driver license shows all three. */}
        {!serverMode && (
        <Section title={t('workerRow.verifyTitle')}>
          {verificationSummary ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {worker.verifications.includes('phone') && (
                <Badge tone="info">{t('verification.phone')}</Badge>
              )}
              {verificationSummary.identityVerified ? (
                <Badge tone="success">{t('workerRow.identityVerified')}</Badge>
              ) : (
                <Badge tone="neutral">{t('workerRow.identityNotVerified')}</Badge>
              )}
              {verificationSummary.approvedMethods.map((m) => (
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
              {verificationSummary.pendingCount > 0 && (
                <span className="text-xs text-amber-700">
                  {t('workerRow.pendingCount').replace('{n}', String(verificationSummary.pendingCount))}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600">—</p>
          )}
        </Section>
        )}

        {/* Bio */}
        <Section title={t('employer.applicant.bio')}>
          {worker.bio ? (
            <p className="whitespace-pre-line text-sm text-gray-700">{worker.bio}</p>
          ) : (
            <p className="text-sm text-gray-600">
              {t('employer.applicant.noBio')}
            </p>
          )}
        </Section>

        {/* Skills — BUG 11 / Property 9: each recorded skill renders a derived
            level ("Cấp N") + XP/score progress bar from THIS worker's own
            skillScores, not flat identical chips. Only the worker's real
            recorded skills are shown (no fabricated default placeholders); when
            the worker has no skill data the section is omitted (Property 16). */}
        {ratingsOn && recordedSkills.length > 0 && (
          <Section title={t('employer.applicant.skills')}>
            <ul className="flex flex-col gap-2">
              {recordedSkills.map((entry) => (
                <SkillProgressBar key={entry.category} entry={entry} />
              ))}
            </ul>
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

        {/* Rating history — không có hệ thống đánh giá ở production. */}
        {ratingsOn && (
        <Section title={t('employer.applicant.ratingHistory')}>
          {worker.ratingsReceived.length === 0 ? (
            <p className="text-sm text-gray-600">{t('reputation.noRatings')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {worker.ratingsReceived.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <StarRating value={r.stars} readOnly size="sm" />
                    <span className="font-mono text-xs text-gray-400">
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
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-gray-700">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-lg font-bold tabular-nums text-gray-900">{value}</span>
      <span className="mt-0.5 text-xs text-gray-600">
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
