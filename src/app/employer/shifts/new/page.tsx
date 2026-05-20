'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { ShiftForm, type ShiftFormValues } from '@/components/forms/ShiftForm';
import { Button } from '@/components/ui';
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
  const createShift = useShiftStore((s) => s.create);
  const simulateDeposit = useShiftStore((s) => s.simulateDeposit);

  const [createdShiftId, setCreatedShiftId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [deposited, setDeposited] = useState(false);

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

      {/* Success state */}
      {deposited && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {t('shifts.deposit.success')}
        </div>
      )}

      {/* After creation, before deposit */}
      {createdShiftId && !deposited && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="mb-2 font-semibold text-orange-800">{t('shifts.deposit.title')}</h2>
          <p className="mb-3 text-sm text-orange-700">{t('shifts.deposit.description')}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-orange-900">
              {t('shifts.deposit.amount')}: {formatVND(depositAmount)}
            </span>
            <Button variant="primary" onClick={handleDeposit}>
              {t('btn.deposit')}
            </Button>
          </div>
        </div>
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
