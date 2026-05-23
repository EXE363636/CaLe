'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { ShiftForm, type ShiftFormValues } from '@/components/forms/ShiftForm';
import { Button, PageHelpButton } from '@/components/ui';
import {
  DEPOSIT_RATIO,
  trustForEmployer,
} from '@/domain/employerTrust';
import { formatVND } from '@/lib/format';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';

export default function NewShiftPage() {
  return (
    <RoleGuard role="employer">
      <NewShiftContent />
    </RoleGuard>
  );
}

function NewShiftContent() {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const createShift = useShiftStore((s) => s.create);
  const simulateDeposit = useShiftStore((s) => s.simulateDeposit);

  const [createdShiftId, setCreatedShiftId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [deposited, setDeposited] = useState(false);

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

  function handleSubmit(values: ShiftFormValues) {
    if (!currentUserId) return;
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
    simulateDeposit(createdShiftId);
    setDeposited(true);
    showSuccess(t('feedback.shift.deposit.success'));
    setTimeout(() => router.push(`/employer/shifts/${createdShiftId}`), 1200);
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

      {/* Phase 6: trust tier + deposit ratio explainer. Visible from the
          first paint so the employer sees what they'll be charged before
          they finish filling out the form. */}
      {!createdShiftId && (
        <TrustExplainerCard trust={trust} ratio={ratio} />
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

      {/* Form (hidden after creation) */}
      {!createdShiftId && (
        <ShiftForm
          mode="create"
          onSubmit={handleSubmit}
        />
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
