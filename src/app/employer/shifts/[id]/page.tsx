'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { Badge, Button, EmptyState } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { WorkerSummaryRow } from '@/components/user/WorkerSummaryRow';
import { WorkerProfileModal } from '@/components/user/WorkerProfileModal';
import { RatingForm } from '@/components/forms/RatingForm';
import { shouldMarkNoShow } from '@/domain/timeGates';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Application, Shift, Worker } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EmployerShiftDetailPage({ params }: Props) {
  return (
    <RoleGuard role="employer">
      <EmployerShiftDetailInner params={params} />
    </RoleGuard>
  );
}

function EmployerShiftDetailInner({ params }: Props) {
  const { id } = use(params);
  const shift = useShiftStore((s) => s.shifts.find((sh) => sh.id === id));
  const currentUserId = useAuthStore((s) => s.currentUserId);

  if (!shift) return notFound();
  if (shift.employerId !== currentUserId) return notFound();

  return <ManageShiftContent shift={shift} />;
}

function ManageShiftContent({ shift }: { shift: Shift }) {
  const users = useUserStore((s) => s.users);
  const applications = useApplicationStore((s) => s.applications);
  const approve = useApplicationStore((s) => s.approve);
  const reject = useApplicationStore((s) => s.reject);
  const markNoShow = useApplicationStore((s) => s.markNoShow);
  const reportIssue = useApplicationStore((s) => s.reportIssue);
  const confirmCompletion = useApplicationStore((s) => s.confirmCompletion);
  const cancelShift = useShiftStore((s) => s.cancel);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [ratingForAppId, setRatingForAppId] = useState<string | null>(null);

  const shiftApps = applications.filter((a) => a.shiftId === shift.id);
  const positionsLeft = shift.positionsTotal - shift.positionsFilled;

  function handleApprove(appId: string) {
    setActionLoading(appId);
    approve(appId);
    setActionLoading(null);
  }

  function handleReject(appId: string) {
    setActionLoading(appId);
    reject(appId);
    setActionLoading(null);
  }

  function handleMarkNoShow(appId: string) {
    setActionLoading(appId);
    markNoShow(appId);
    setActionLoading(null);
  }

  function handleReportIssue(appId: string) {
    reportIssue(appId, 'Người làm không hoàn thành đúng yêu cầu.');
  }

  function handleCancelShift() {
    cancelShift(shift.id);
    setCancelConfirm(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/employer/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
      >
        ← {t('btn.back')}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shift.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateVN(shift.date)} • {formatTimeVN(shift.startTime)}–
            {formatTimeVN(shift.endTime)} • {formatVND(shift.hourlyWage)}/giờ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShiftStatusBadge status={shift.status} />
          <EscrowStatusBadge status={shift.escrowStatus} />
        </div>
      </div>

      {/* Positions summary */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <span>
          {shift.positionsFilled}/{shift.positionsTotal} người đã duyệt
        </span>
        <span>{positionsLeft} vị trí còn trống</span>
      </div>

      {/* Cancel shift */}
      {['Draft', 'Published', 'FullyBooked'].includes(shift.status) && (
        <div className="mt-4">
          {!cancelConfirm ? (
            <Button size="sm" variant="danger" onClick={() => setCancelConfirm(true)}>
              {t('btn.cancelShift')}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-700">Xác nhận huỷ ca?</span>
              <Button size="sm" variant="danger" onClick={handleCancelShift}>
                Huỷ ca
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(false)}>
                Không
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Applications */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t('employer.dashboard.applicants')} ({shiftApps.length})
        </h2>

        {shiftApps.length === 0 ? (
          <EmptyState title="Chưa có đơn ứng tuyển nào." />
        ) : (
          <div className="flex flex-col gap-3">
            {shiftApps.map((app) => {
              const worker = asWorker(users.find((u) => u.id === app.workerId));
              if (!worker) return null;

              const nowIso = new Date().toISOString();
              const canMarkNoShow =
                app.status === 'Approved' && shouldMarkNoShow(nowIso, app, shift);
              const showRating = ratingForAppId === app.id;

              return (
                <div key={app.id} className="flex flex-col gap-2">
                  <WorkerSummaryRow
                    worker={worker}
                    statusSlot={
                      <Badge tone={badgeToneForApp(app.status)}>
                        {t(`application.status.${app.status}`)}
                      </Badge>
                    }
                    onViewProfile={() => setProfileWorker(worker)}
                    actions={
                      <ApplicationActionButtons
                        application={app}
                        loading={actionLoading === app.id}
                        canMarkNoShow={canMarkNoShow}
                        showRating={showRating}
                        onApprove={() => handleApprove(app.id)}
                        onReject={() => handleReject(app.id)}
                        onMarkNoShow={() => handleMarkNoShow(app.id)}
                        onConfirm={() => setRatingForAppId(app.id)}
                        onReport={() => handleReportIssue(app.id)}
                      />
                    }
                  />

                  {/* Rating panel — opens below the summary row */}
                  {showRating && app.status === 'CheckedOut' && (
                    <div className="ml-2 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                      <RatingForm
                        onSubmit={(rating) => {
                          confirmCompletion(app.id, rating);
                          setRatingForAppId(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shared profile modal */}
      <WorkerProfileModal
        open={profileWorker !== null}
        onClose={() => setProfileWorker(null)}
        worker={profileWorker}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ApplicationActionButtons({
  application,
  loading,
  canMarkNoShow,
  showRating,
  onApprove,
  onReject,
  onMarkNoShow,
  onConfirm,
  onReport,
}: {
  application: Application;
  loading: boolean;
  canMarkNoShow: boolean;
  showRating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onMarkNoShow: () => void;
  onConfirm: () => void;
  onReport: () => void;
}) {
  if (application.status === 'Pending') {
    return (
      <>
        <Button size="sm" variant="primary" onClick={onApprove} loading={loading}>
          {t('btn.approve')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject} loading={loading}>
          {t('btn.reject')}
        </Button>
      </>
    );
  }

  if (canMarkNoShow) {
    return (
      <Button size="sm" variant="danger" onClick={onMarkNoShow} loading={loading}>
        Đánh dấu vắng mặt
      </Button>
    );
  }

  if (application.status === 'CheckedOut' && !showRating) {
    return (
      <>
        <Button size="sm" variant="primary" onClick={onConfirm}>
          {t('btn.confirmCompletion')}
        </Button>
        <Button size="sm" variant="danger" onClick={onReport}>
          {t('btn.reportIssue')}
        </Button>
      </>
    );
  }

  if (application.status === 'Confirmed') {
    return <span className="text-sm text-green-600">✓ Đã xác nhận & thanh toán</span>;
  }

  if (application.status === 'NoShow') {
    return (
      <span className="text-sm text-red-600">Vắng mặt — đã hoàn tiền & tặng boost</span>
    );
  }

  return null;
}

function badgeToneForApp(
  status: Application['status'],
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' {
  switch (status) {
    case 'Approved':
      return 'success';
    case 'CheckedIn':
      return 'purple';
    case 'CheckedOut':
      return 'warning';
    case 'Confirmed':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Rejected':
      return 'danger';
    case 'NoShow':
      return 'danger';
    case 'CancelledByWorker':
      return 'neutral';
    default:
      return 'neutral';
  }
}
