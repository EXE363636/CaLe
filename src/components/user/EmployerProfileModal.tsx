'use client';

/**
 * Read-only employer profile modal shown to workers (and others) from the
 * shift detail page. Sources data entirely from existing stores; no API
 * calls. Closes via X / ESC / backdrop (Modal handles all three).
 */

import { useMemo } from 'react';
import { Modal, Badge } from '@/components/ui';
import { UserAvatar } from './UserAvatar';
import { EmployerFeedbackList } from './EmployerFeedbackList';
import { useShiftStore } from '@/stores/shiftStore';
import { t } from '@/i18n/vi';
import type { Employer, EmployerType } from '@/types';

interface EmployerProfileModalProps {
  open: boolean;
  onClose: () => void;
  employer: Employer | null;
}

export function EmployerProfileModal({
  open,
  onClose,
  employer,
}: EmployerProfileModalProps) {
  // Always select the shifts array (stable reference) — `useMemo` derives
  // the per-employer counts so the selector itself never returns a fresh
  // array (Zustand snapshot stability).
  const allShifts = useShiftStore((s) => s.shifts);
  const { posted, active, completed, cancelled } = useMemo(() => {
    if (!employer) return { posted: 0, active: 0, completed: 0, cancelled: 0 };
    let posted = 0;
    let active = 0;
    let completed = 0;
    let cancelled = 0;
    for (const s of allShifts) {
      if (s.employerId !== employer.id) continue;
      posted += 1;
      if (s.status === 'Completed') completed += 1;
      else if (s.status === 'Cancelled') cancelled += 1;
      else if (
        s.status === 'Published' ||
        s.status === 'FullyBooked' ||
        s.status === 'InProgress' ||
        s.status === 'AwaitingConfirmation'
      ) {
        active += 1;
      }
    }
    return { posted, active, completed, cancelled };
  }, [allShifts, employer]);

  if (!employer) return null;

  return (
    <Modal open={open} onClose={onClose} title={t('employer.profile.title')}>
      <div className="flex flex-col gap-5">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <UserAvatar
            name={employer.companyName}
            avatarUrl={employer.logoUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900">
              {employer.companyName}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {employer.businessType}
            </p>
          </div>
          {employer.verifiedBusiness ? (
            <Badge tone="success">{t('employer.profile.verifiedBusiness')}</Badge>
          ) : (
            <Badge tone="neutral">{t('employer.profile.notVerified')}</Badge>
          )}
        </div>

        {/* Phase 6: account-type chip — distinguishes individual /
            freelance employers from registered businesses. */}
        <EmployerTypeChip type={employer.employerType} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-4">
          <Stat value={String(posted)} label={t('employer.profile.postedShifts')} />
          <Stat value={String(active)} label={t('employer.profile.activeShifts')} />
          <Stat
            value={String(completed)}
            label={t('employer.profile.completedShifts')}
          />
          <Stat
            value={String(cancelled)}
            label={t('employer.profile.cancelledShifts')}
          />
        </div>

        {/* Description */}
        <Section title={t('employer.profile.description')}>
          {employer.description ? (
            <p className="whitespace-pre-line text-sm text-gray-700">
              {employer.description}
            </p>
          ) : (
            <p className="text-sm italic text-gray-400">
              {t('employer.profile.noDescription')}
            </p>
          )}
        </Section>

        {/* Email */}
        <Section title={t('employer.profile.email')}>
          <p className="text-sm text-gray-700">{employer.email}</p>
        </Section>

        {/* Phase 6: worker-authored feedback. */}
        <Section title={t('employerFeedback.title')}>
          <EmployerFeedbackList employerId={employer.id} />
        </Section>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function EmployerTypeChip({ type }: { type: EmployerType | undefined }) {
  // Default to `'business'` to preserve pre-Phase-6 seed records that
  // don't carry the field yet.
  const t0 = type ?? 'business';
  return (
    <Badge tone={t0 === 'individual' ? 'info' : 'neutral'}>
      {t(`employerType.${t0}`)}
    </Badge>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
