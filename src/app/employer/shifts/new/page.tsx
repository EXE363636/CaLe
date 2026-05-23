'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { ShiftForm, type ShiftFormValues } from '@/components/forms/ShiftForm';
import { Button, Card } from '@/components/ui';
import {
  DEPOSIT_RATIO,
  trustForEmployer,
} from '@/domain/employerTrust';
import { formatVND } from '@/lib/format';
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
  }

  function handleDeposit() {
    if (!createdShiftId) return;
    simulateDeposit(createdShiftId);
    setDeposited(true);
    setTimeout(() => router.push(`/employer/shifts/${createdShiftId}`), 1200);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('btn.postShift')}</h1>

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
  return (
    <Card className="mb-4 bg-orange-50/50">
      <p className="text-sm font-semibold text-orange-800">
        {t('deposit.trust.title')}
      </p>
      <p className="mt-1 text-xs text-orange-700/90">
        {t(`deposit.trust.${trust}`)}
      </p>
      <p className="mt-2 text-xs text-gray-600">
        {t('deposit.trust.ratio').replace(
          '{percent}',
          String(Math.round(ratio * 100)),
        )}
      </p>
    </Card>
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
    <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
      <h2 className="mb-2 font-semibold text-orange-800">
        {t('shifts.deposit.title')}
      </h2>
      <p className="mb-3 text-sm text-orange-700">
        {t('shifts.deposit.description')}
      </p>

      <dl className="mb-4 flex flex-col gap-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-gray-700">
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
        <hr className="my-1 border-gray-200" />
        <DepositRow
          label={t('shifts.deposit.amount')}
          value={formatVND(depositAmount)}
          highlight
        />
      </dl>

      <Button variant="primary" onClick={onConfirm} className="w-full">
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
