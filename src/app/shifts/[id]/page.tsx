'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asEmployer, asWorker } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { ApplicationActions } from '@/components/forms/ApplicationActions';
import { CancelApplicationDialog } from '@/components/forms/CancelApplicationDialog';
import { EmployerProfileModal } from '@/components/user/EmployerProfileModal';
import { EmployerTrustPanel } from '@/components/user/EmployerTrustPanel';
import { Button } from '@/components/ui';
import { quotaUsage } from '@/domain/cancellationQuota';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { t } from '@/i18n/vi';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import type { Shift } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

// Outer page: resolves params and guards against missing shift
export default function ShiftDetailPage({ params }: Props) {
  const { id } = use(params);
  const shift = useShiftStore((s) => s.shifts.find((sh) => sh.id === id));
  if (!shift) return notFound();
  return <ShiftDetailContent shift={shift} />;
}

// Inner component: receives a guaranteed non-null Shift
function ShiftDetailContent({ shift }: { shift: Shift }) {
  const users = useUserStore((s) => s.users);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const applications = useApplicationStore((s) => s.applications);
  const apply = useApplicationStore((s) => s.apply);
  const cancelByWorker = useApplicationStore((s) => s.cancelByWorker);

  const [applyError, setApplyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [employerModalOpen, setEmployerModalOpen] = useState(false);

  const employerUser = users.find((u) => u.id === shift.employerId);
  const employer = asEmployer(employerUser);
  const employerName = employer?.companyName ?? 'Nhà tuyển dụng';

  const currentUser = currentUserId ? users.find((u) => u.id === currentUserId) : null;
  const worker = asWorker(currentUser ?? undefined);

  const myApp = worker
    ? applications.find(
        (a) =>
          a.shiftId === shift.id &&
          a.workerId === worker.id &&
          a.status !== 'Rejected' &&
          a.status !== 'CancelledByWorker',
      )
    : undefined;

  // Phase 3: derive cancellation quota for the current worker only when
  // the cancel dialog is open. Selectors above already return stable
  // references, so this useMemo recomputes only when the inputs actually
  // change.
  const cancelQuota = useMemo(() => {
    if (!worker || !cancelDialogOpen) return undefined;
    return quotaUsage(
      worker.cancellationHistory,
      worker.reputationScore,
      new Date().toISOString(),
    );
  }, [worker, cancelDialogOpen]);

  function handleApply() {
    if (!worker) return;
    setLoading(true);
    setApplyError(null);
    const result = apply(shift.id, worker.id);
    setLoading(false);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setApplyError(message);
      showError(message);
      return;
    }
    showSuccess(
      t('feedback.apply.success'),
      t('feedback.apply.success.desc'),
    );
  }

  function handleConfirmCancel(reason: string) {
    if (!myApp) return;
    setLoading(true);
    setApplyError(null);
    const result = cancelByWorker(myApp.id, reason);
    setLoading(false);
    if (!result.ok) {
      const message = toastFromStoreError(result.error);
      setApplyError(message);
      showError(message);
      return;
    }
    // Phase 9O — toast based on whether a request was created or the
    // application was cancelled outright.
    if (result.value.requiresApproval) {
      showInfo(
        t('feedback.cancelRequest.success'),
        t('feedback.cancelRequest.success.desc'),
      );
    } else {
      showSuccess(t('feedback.cancel.success'));
    }
    // On success, close the dialog. If approval is required the application
    // status flips to `CancellationRequested` and the page re-renders with
    // the new badge.
    setCancelDialogOpen(false);
  }

  const positionsLeft = shift.positionsTotal - shift.positionsFilled;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/shifts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
      >
        ← {t('btn.back')}
      </Link>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{shift.title}</h1>
        <ShiftStatusBadge status={shift.status} />
      </div>

      {/* Employer — clickable when we can resolve to an Employer record */}
      <p className="mt-1 text-sm text-gray-500">
        {t('shifts.detail.employer')}:{' '}
        {employer ? (
          <button
            type="button"
            onClick={() => setEmployerModalOpen(true)}
            className="font-medium text-orange-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
          >
            {employerName}
          </button>
        ) : (
          <span className="font-medium text-gray-700">{employerName}</span>
        )}
      </p>

      {/* Phase 9I — quick employer trust signal so workers see the
          rating + verification status before opening the full profile
          modal. Pure presentation; clicking "Xem hồ sơ" still opens the
          existing `EmployerProfileModal`. */}
      {employer && (
        <EmployerTrustPanel
          employer={employer}
          onOpenProfile={() => setEmployerModalOpen(true)}
        />
      )}

      {/* Key info grid */}
      <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
        <InfoItem label="Ngày làm" value={formatDateVN(shift.date)} />
        <InfoItem
          label="Giờ làm"
          value={`${formatTimeVN(shift.startTime)} – ${formatTimeVN(shift.endTime)}`}
        />
        <InfoItem
          label={t('shifts.detail.wage')}
          value={`${formatVND(shift.hourlyWage)}/giờ`}
          highlight
        />
        <InfoItem
          label={t('shifts.detail.positionsLeft')}
          value={`${positionsLeft} / ${shift.positionsTotal}`}
          highlight={positionsLeft > 0}
        />
      </div>

      {/* Location */}
      <div className="mt-4 flex items-start gap-2 text-sm text-gray-700">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-7.327a7.5 7.5 0 10-15 0c0 2.925 1.274 5.248 3.218 7.327a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
        <span>{shift.location}</span>
      </div>

      {/* Payment status */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">{t('shifts.detail.depositStatus')}:</span>
        <EscrowStatusBadge status={shift.escrowStatus} />
      </div>

      {/* Description */}
      {shift.description && (
        <Section title="Mô tả công việc">
          <p className="text-sm text-gray-700 whitespace-pre-line">{shift.description}</p>
        </Section>
      )}

      {/* Requirements */}
      {shift.requirements && (
        <Section title={t('shifts.detail.requirements')}>
          <p className="text-sm text-gray-700 whitespace-pre-line">{shift.requirements}</p>
        </Section>
      )}

      {/* Apply section */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {!currentUserId && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Đăng nhập để ứng tuyển ca làm này.</p>
            <div className="flex gap-3">
              <Link href="/login">
                <Button variant="primary">{t('btn.login')}</Button>
              </Link>
              <Link href="/register?role=worker">
                <Button variant="secondary">{t('btn.register')}</Button>
              </Link>
            </div>
          </div>
        )}

        {currentUser?.role === 'employer' && (
          <p className="text-sm text-gray-500">
            Bạn là nhà tuyển dụng. Quản lý ca tại trang tổng quan của bạn.
          </p>
        )}

        {currentUser?.role === 'admin' && (
          <p className="text-sm text-gray-500">Bạn đang xem với tư cách quản trị viên.</p>
        )}

        {worker && (
          <ApplicationActions
            shiftId={shift.id}
            workerId={worker.id}
            applicationStatus={myApp?.status ?? null}
            workerVerifications={worker.verifications}
            workerReputationScore={worker.reputationScore}
            shiftStatus={shift.status}
            onApply={handleApply}
            onRequestCancel={() => setCancelDialogOpen(true)}
            loading={loading}
            error={applyError}
          />
        )}
      </div>

      {/* Cancel confirmation dialog */}
      {myApp && (
        <CancelApplicationDialog
          open={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          application={myApp}
          shift={shift}
          onConfirm={handleConfirmCancel}
          loading={loading}
          quota={cancelQuota}
        />
      )}

      {/* Employer profile modal */}
      <EmployerProfileModal
        open={employerModalOpen}
        onClose={() => setEmployerModalOpen(false)}
        employer={employer ?? null}
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={[
          'mt-0.5 text-sm font-semibold',
          highlight ? 'text-orange-600' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
