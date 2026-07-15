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
import {
  employerTypeLabel,
  resolveEmployerType,
  useVerificationStore,
} from '@/stores';
import { getPublicEmployerWorkplacePhotos } from '@/domain/postingReadiness';
import { formatDateVN } from '@/lib/format';
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
  const employerDocuments = useVerificationStore((s) => s.employerDocuments);

  const { posted, active, completed, cancelled, hasPostedShifts } = useMemo(() => {
    if (!employer)
      return {
        posted: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        hasPostedShifts: false,
      };
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
    return { posted, active, completed, cancelled, hasPostedShifts: posted > 0 };
  }, [allShifts, employer]);

  // Phase 10A-Fix-3 — public-safe approved storefront / workplace
  // photos. Returns just the label + submitted-at for each, never the
  // raw image URL or filename of a private document.
  const publicPhotos = useMemo(() => {
    if (!employer) return [];
    return getPublicEmployerWorkplacePhotos(employer.id, employerDocuments);
  }, [employer, employerDocuments]);

  // Phase 10A-Fix-3 — prefer the 4-shape canonical type when available;
  // fall back to the legacy 2-shape only for ancient pre-Phase-6 data.
  const resolvedType = useMemo(
    () =>
      employer
        ? resolveEmployerType(employer, { hasPostedShifts })
        : undefined,
    [employer, hasPostedShifts],
  );

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

        {/* Phase 10A-Fix-3: prefer canonical 4-shape label; the chip
            falls back to the legacy 2-shape when the new field is
            missing. */}
        <EmployerTypeChip
          resolvedType={resolvedType}
          legacyType={employer.employerType}
        />

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

        {/* Phase 10A-Fix-3 — public-safe approved workplace / storefront
            photos. Mock filenames only; no raw image URLs or private
            documents are surfaced here. */}
        <Section title={t('employer.profile.publicPhotos.title')}>
          {publicPhotos.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-sm">
              {publicPhotos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-orange-50 px-3 py-2 ring-1 ring-orange-100"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-orange-500"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m6 17 4-5 3 4 2-2 3 3" />
                        <circle cx="9" cy="10" r="1.4" />
                      </svg>
                    </span>
                    <span className="truncate font-medium text-gray-900">
                      {p.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-500">
                    {formatDateVN(p.submittedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-gray-500">
              {t('employer.profile.publicPhotos.empty')}
            </p>
          )}
        </Section>

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

function EmployerTypeChip({
  resolvedType,
  legacyType,
}: {
  resolvedType:
    | 'Individual'
    | 'HouseholdBusiness'
    | 'Company'
    | 'AgencyEvent'
    | undefined;
  legacyType: EmployerType | undefined;
}) {
  // Phase 10A-Fix-3 — prefer the canonical 4-shape label. Falls back
  // to the Phase-6 2-shape label only for ancient seed records that
  // somehow have neither field set.
  if (resolvedType) {
    const tone = resolvedType === 'Individual' ? 'info' : 'neutral';
    return <Badge tone={tone}>{employerTypeLabel(resolvedType)}</Badge>;
  }
  const t0 = legacyType ?? 'business';
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
