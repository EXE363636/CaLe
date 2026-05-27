'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { useVerificationStore } from '@/stores';
import { ShiftForm, type ShiftFormValues } from '@/components/forms/ShiftForm';
import { Badge, Button, Card, PageHelpButton } from '@/components/ui';
import {
  DEPOSIT_RATIO,
  trustForEmployer,
} from '@/domain/employerTrust';
import { computePostingReadiness } from '@/domain/postingReadiness';
import {
  sanitizeRepostDescription,
  sanitizeRepostTitle,
} from '@/domain/repostSanitize';
import { formatVND } from '@/lib/format';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import type { EmployerType10A } from '@/types';

export default function NewShiftPage() {
  return (
    <RoleGuard role="employer">
      <NewShiftContent />
    </RoleGuard>
  );
}

function NewShiftContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from') ?? null;
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const createShift = useShiftStore((s) => s.create);
  const simulateDeposit = useShiftStore((s) => s.simulateDeposit);
  // Phase 10A-Fix-3 — read employer verification documents so we can
  // compute posting readiness against the same data the admin queue
  // sees.
  const employerDocuments = useVerificationStore((s) => s.employerDocuments);

  const [createdShiftId, setCreatedShiftId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [deposited, setDeposited] = useState(false);
  // Phase 10A-Fix-3 — live snapshot of the workplace-image filename so
  // the readiness checklist updates as the employer types. Mirrored
  // out of `<ShiftForm>` via the `onValuesChange` callback.
  const [workplaceImageDraft, setWorkplaceImageDraft] = useState('');

  // Phase 10C-Stab-1 Batch 3 A — when the employer arrives via
  // `?from={id}` we resolve the source shift and pre-fill the form
  // with everything except date / startTime / endTime (the employer
  // must pick a fresh future date).
  const sourceShift = useMemo(() => {
    if (!fromParam) return null;
    return shifts.find((s) => s.id === fromParam) ?? null;
  }, [shifts, fromParam]);

  const initialValues = useMemo<Partial<ShiftFormValues> | undefined>(() => {
    if (!sourceShift) return undefined;
    return {
      title: sanitizeRepostTitle(sourceShift.title),
      description: sanitizeRepostDescription(sourceShift.description),
      requirements: sourceShift.requirements,
      jobType: sourceShift.jobType,
      customJobTypeName: sourceShift.customJobTypeName ?? '',
      location: sourceShift.location,
      hourlyWage: sourceShift.hourlyWage,
      positionsTotal: sourceShift.positionsTotal,
      evidenceRequirement: sourceShift.evidenceRequirement,
      workplaceImageLabel: sourceShift.workplaceImageLabel ?? '',
      workplaceNotes: sourceShift.workplaceNotes ?? '',
      onSiteContactName: sourceShift.onSiteContactName ?? '',
      onSiteContactPhone: sourceShift.onSiteContactPhone ?? '',
      requiresVerifiedDocumentOnArrival:
        sourceShift.requiresVerifiedDocumentOnArrival ?? false,
      // Date / startTime / endTime intentionally omitted — employer
      // must pick a fresh future date.
    };
  }, [sourceShift]);

  // Mirror the source shift's workplace image label into the live
  // draft so the readiness checklist reflects the prefilled value
  // on first render.
  useEffect(() => {
    if (sourceShift?.workplaceImageLabel) {
      setWorkplaceImageDraft(sourceShift.workplaceImageLabel);
    }
  }, [sourceShift]);

  // Phase 6: derive the employer's trust tier so we can show the deposit
  // breakdown live as they fill the form. Both selectors return stable
  // references; the `useMemo` keeps the per-employer count cheap.
  const employer = asEmployer(users.find((u) => u.id === currentUserId));
  const completedCount = useMemo(
    () =>
      currentUserId
        ? shifts.filter(
            (s) => s.employerId === currentUserId && s.status === 'Completed',
          ).length
        : 0,
    [shifts, currentUserId],
  );
  const trust = employer ? trustForEmployer(employer, completedCount) : 'low';
  const ratio = DEPOSIT_RATIO[trust];

  // Phase 10A-Fix-2: posting guard. A truly-new employer (no
  // employerType10A, no legacy employerType, and no shifts yet) must
  // pick an account type before posting. `resolveEmployerType` returns
  // `undefined` only in that exact state — established accounts with
  // posted shifts get an automatic fallback. Phase 10A-Fix-3 — the
  // resolved type is now read off `readiness.resolvedType` instead of
  // a separate variable.
  const hasPostedShifts = useMemo(
    () =>
      employer ? shifts.some((s) => s.employerId === employer.id) : false,
    [shifts, employer],
  );

  // Phase 10A-Fix-3: full posting readiness. Computed at the page
  // level so the same `ready` flag controls (1) the checklist display,
  // (2) the create-shift submit handler, and (3) the deposit-confirm
  // CTA. Recomputes when the employer record, doc list, or in-form
  // workplace-image draft changes.
  const readiness = useMemo(() => {
    if (!employer) return null;
    return computePostingReadiness({
      employer,
      employerDocuments,
      hasPostedShifts,
      workplaceImageInForm: workplaceImageDraft,
    });
  }, [employer, employerDocuments, hasPostedShifts, workplaceImageDraft]);

  // Workplace image is required for the form when readiness rules say
  // so. AgencyEvent + Individual always require it; HouseholdBusiness /
  // Company only require it when no profile-side workplace photo is
  // approved yet.
  const workplaceImageRequired = useMemo<boolean>(() => {
    if (!readiness?.resolvedType) return false;
    const t10 = readiness.resolvedType;
    if (t10 === 'Individual' || t10 === 'AgencyEvent') return true;
    return !readiness.checks.workplaceProofApproved;
  }, [readiness]);

  function handleSubmit(values: ShiftFormValues) {
    if (!currentUserId) return;
    // Phase 10A-Fix-3 — defence in depth. The form already validates
    // the workplace-image label when required; this re-checks the
    // full readiness rule set so a stale form state can't bypass the
    // gate (e.g. employer types in a filename then deletes it before
    // submitting).
    if (!readiness || !readiness.ready) {
      showError(
        t('posting.readiness.intro'),
        readiness?.blockers[0],
      );
      return;
    }
    const shift = createShift({ ...values, employerId: currentUserId });
    setCreatedShiftId(shift.id);
    setDepositAmount(shift.depositAmount);
    showSuccess(
      t('feedback.shift.create.success'),
      t('feedback.shift.create.success.desc'),
    );
  }

  function handleDeposit() {
    if (!createdShiftId) return;
    const result = simulateDeposit(createdShiftId);
    if (!result.ok) {
      // Phase 10C-Stab-1 Batch 2 H — store-side verification gate
      // rejects the publish. Surface the localized message; do not
      // flip the deposited UI.
      const messageKey = `shift.create.error.${result.error}` as const;
      showError(t(messageKey));
      return;
    }
    setDeposited(true);
    showSuccess(t('feedback.shift.deposit.success'));
    setTimeout(() => router.push(`/employer/shifts/${createdShiftId}`), 1200);
  }

  // Phase 10A-Fix-3: posting guard now uses the full readiness rule
  // set, not just "is type set?". When the employer is brand-new
  // (no resolved type), we render the type-picker prompt. When the
  // type is set but verification or workplace prerequisites are
  // missing, we render the same page wrapper but show the checklist
  // alongside the form so the employer can still see the deposit
  // explainer + form (the form's submit + the deposit CTA below the
  // form remain blocked until `readiness.ready === true`).
  if (employer && readiness && !readiness.resolvedType) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
            {t('employer.dashboard.title')}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            {t('btn.postShift')}
          </h1>
        </header>
        <Card>
          <h2 className="mb-2 font-semibold text-gray-900">
            Cần chọn loại tài khoản trước khi đăng ca
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Vui lòng chọn loại tài khoản nhà tuyển dụng trước khi đăng ca.
            Loại tài khoản giúp xác định giấy tờ cần xác minh, mức đặt cọc
            và quy tắc an toàn cho người lao động.
          </p>
          <Link href="/employer/profile">
            <Button variant="primary" size="md">
              {t('posting.readiness.cta.profile')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero header — Phase 9 polish */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('employer.dashboard.title')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('btn.postShift')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('shifts.new.subtitle')}
            </p>
          </div>
          <PageHelpButton
            title={t('help.shiftCreate.title')}
            intro={t('help.shiftCreate.intro')}
            items={[
              t('help.shiftCreate.item1'),
              t('help.shiftCreate.item2'),
              t('help.shiftCreate.item3'),
              t('help.shiftCreate.item4'),
            ]}
          />
        </div>
      </header>

      {/* Phase 10C-Stab-1 Batch 3 A — repost-from banner. Visible
          when the employer arrived via /employer/shifts/new?from={id}
          so they understand they're cloning a previous shift and
          must pick a fresh date. */}
      {!createdShiftId && sourceShift && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <p className="text-sm text-orange-900">
            <strong>Đang tạo ca mới từ:</strong> {sourceShift.title}. Vui lòng chọn ngày giờ mới trước khi đặt cọc.
          </p>
        </Card>
      )}

      {/* Phase 6: trust tier + deposit ratio explainer. Visible from the
          first paint so the employer sees what they'll be charged before
          they finish filling out the form. */}
      {!createdShiftId && (
        <TrustExplainerCard trust={trust} ratio={ratio} />
      )}

      {/* Phase 10A-Fix-3 — verification + workplace readiness checklist.
          Always shown before creation so the employer sees what's
          missing. Hidden after creation since at that point readiness
          was already enforced. */}
      {!createdShiftId && readiness && readiness.resolvedType && (
        <ReadinessChecklist
          resolvedType={readiness.resolvedType}
          ready={readiness.ready}
          checks={readiness.checks}
          blockers={readiness.blockers}
        />
      )}

      {/* Success state */}
      {deposited && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {t('shifts.deposit.success')}
        </div>
      )}

      {/* After creation, before deposit — Phase 6 mock-payment block. */}
      {createdShiftId && !deposited && (
        <DepositConfirmCard
          depositAmount={depositAmount}
          trust={trust}
          ratio={ratio}
          onConfirm={handleDeposit}
        />
      )}

      {/* Form (hidden after creation). Phase 10A-Fix-3 — workplace
          image required by employer-type readiness rules; the live
          draft drives the readiness recompute via `onValuesChange`. */}
      {!createdShiftId && (
        <ShiftForm
          mode="create"
          onSubmit={handleSubmit}
          workplaceImageRequired={workplaceImageRequired}
          initialValues={initialValues}
          onValuesChange={(v) => setWorkplaceImageDraft(v.workplaceImageLabel)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 10A-Fix-3 — verification + workplace readiness checklist
// ---------------------------------------------------------------------------

function ReadinessChecklist({
  resolvedType,
  ready,
  checks,
  blockers,
}: {
  resolvedType: EmployerType10A;
  ready: boolean;
  checks: {
    typeSelected: boolean;
    representativeIdApproved: boolean;
    businessLicenseOrTaxApproved: boolean;
    workplaceProofApproved: boolean;
    workplaceImageProvided: boolean;
    eventProofApproved: boolean;
  };
  blockers: string[];
}) {
  // Pick which checklist items apply to the current type.
  const items: Array<{ key: string; label: string; ok: boolean }> = [
    {
      key: 'type',
      label: t('posting.readiness.checklist.type'),
      ok: checks.typeSelected,
    },
    {
      key: 'id',
      label: t('posting.readiness.checklist.id'),
      ok: checks.representativeIdApproved,
    },
  ];

  if (resolvedType === 'Company') {
    items.push({
      key: 'business',
      label: t('posting.readiness.checklist.business'),
      ok: checks.businessLicenseOrTaxApproved,
    });
  }
  if (resolvedType === 'AgencyEvent') {
    items.push({
      key: 'event',
      label: t('posting.readiness.checklist.event'),
      ok: checks.eventProofApproved,
    });
  }
  if (
    resolvedType === 'HouseholdBusiness' ||
    resolvedType === 'Company'
  ) {
    items.push({
      key: 'workplaceProof',
      label: t('posting.readiness.checklist.workplaceProof'),
      ok: checks.workplaceProofApproved,
    });
  }
  // Per-shift workplace image: required for Individual + AgencyEvent;
  // optional fallback for HouseholdBusiness / Company when no profile
  // photo is approved.
  items.push({
    key: 'workplaceImage',
    label: t('posting.readiness.checklist.workplaceImage'),
    ok: checks.workplaceImageProvided,
  });

  const tone = ready ? 'success' : 'warning';
  const headerLabel = ready
    ? t('posting.readiness.allClear')
    : t('posting.readiness.intro');

  return (
    <div
      className={[
        'mb-5 rounded-2xl border p-4 shadow-sm',
        ready
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-amber-300 bg-amber-50',
      ].join(' ')}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">
          {t('posting.readiness.title')}
        </p>
        <Badge tone={tone}>{headerLabel}</Badge>
      </div>
      <ul className="flex flex-col gap-1.5 text-xs text-gray-800">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={[
                'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                it.ok ? 'bg-emerald-500' : 'bg-amber-500',
              ].join(' ')}
            >
              {it.ok ? '✓' : '!'}
            </span>
            <span className={it.ok ? 'text-gray-700' : 'text-amber-900'}>
              {it.label}
            </span>
          </li>
        ))}
      </ul>
      {!ready && blockers.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-amber-900">
            {blockers[0]}
          </p>
          <p className="text-[11px] text-amber-800/80">
            {t('posting.readiness.depositLocked')}
          </p>
          <Link href="/employer/profile">
            <Button size="sm" variant="secondary">
              {t('posting.readiness.cta.profile')}
            </Button>
          </Link>
        </div>
      )}
      {resolvedType === 'Individual' && (
        <p className="mt-3 text-[11px] italic leading-relaxed text-gray-600">
          {t('posting.readiness.individualNote')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust explainer
// ---------------------------------------------------------------------------

function TrustExplainerCard({
  trust,
  ratio,
}: {
  trust: 'low' | 'medium' | 'high';
  ratio: number;
}) {
  const toneRing: Record<typeof trust, string> = {
    low: 'before:bg-amber-500',
    medium: 'before:bg-orange-500',
    high: 'before:bg-emerald-500',
  };
  return (
    <div
      className={[
        'relative mb-5 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm',
        'before:absolute before:left-0 before:top-0 before:h-1 before:w-full',
        toneRing[trust],
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-orange-900">
            {t('deposit.trust.title')}
          </p>
          <p className="mt-1 text-xs text-orange-800/90">
            {t(`deposit.trust.${trust}`)}
          </p>
          <p className="mt-2 text-xs text-gray-600">
            {t('deposit.trust.ratio').replace(
              '{percent}',
              String(Math.round(ratio * 100)),
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deposit confirm card
// ---------------------------------------------------------------------------

function DepositConfirmCard({
  depositAmount,
  trust,
  ratio,
  onConfirm,
}: {
  depositAmount: number;
  trust: 'low' | 'medium' | 'high';
  ratio: number;
  onConfirm: () => void;
}) {
  // Reverse-calculate the full-wage figure so the breakdown line shows
  // both the gross amount and the discounted deposit. Avoids re-passing
  // the original form values through props.
  const fullWage = ratio > 0 ? Math.round(depositAmount / ratio) : depositAmount;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
            <path strokeLinecap="round" d="M16 11h4M16 14h4" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-orange-900">
            {t('shifts.deposit.title')}
          </h2>
          <p className="mt-0.5 text-sm text-orange-800/90">
            {t('shifts.deposit.description')}
          </p>
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white/80 px-4 py-3 text-xs text-gray-700 ring-1 ring-orange-100">
        <DepositRow
          label={t('deposit.breakdown.fullWage')}
          value={formatVND(fullWage)}
        />
        <DepositRow
          label={t('deposit.breakdown.trust')}
          value={t(`deposit.trust.label.${trust}`)}
        />
        <DepositRow
          label={t('deposit.breakdown.ratio')}
          value={`${Math.round(ratio * 100)}%`}
        />
        <hr className="my-1 border-orange-100" />
        <DepositRow
          label={t('shifts.deposit.amount')}
          value={formatVND(depositAmount)}
          highlight
        />
      </dl>

      <Button variant="primary" size="lg" onClick={onConfirm} className="mt-4 w-full">
        {t('deposit.confirmPaid')}
      </Button>
    </div>
  );
}

function DepositRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={highlight ? 'font-semibold text-orange-900' : 'text-gray-600'}>
        {label}
      </dt>
      <dd className={highlight ? 'font-bold text-orange-900' : 'font-medium text-gray-900'}>
        {value}
      </dd>
    </div>
  );
}
