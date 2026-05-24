'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { Badge, Button, EmptyState, Modal, Textarea } from '@/components/ui';
import { ShiftStatusBadge } from '@/components/shift/ShiftStatusBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { WorkerSummaryRow } from '@/components/user/WorkerSummaryRow';
import { WorkerProfileModal } from '@/components/user/WorkerProfileModal';
import { RatingForm } from '@/components/forms/RatingForm';
import { RejectApplicationDialog } from '@/components/forms/RejectApplicationDialog';
import {
  APPROVED_OR_LATER_STATUSES,
  computeEmployerCancellationPenalty,
} from '@/domain/employerCancellation';
import { shouldMarkNoShow } from '@/domain/timeGates';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { showSuccess, showError } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
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
  useLifecycleSync();
  const router = useRouter();
  const users = useUserStore((s) => s.users);
  const applications = useApplicationStore((s) => s.applications);
  const approve = useApplicationStore((s) => s.approve);
  const reject = useApplicationStore((s) => s.reject);
  const markNoShow = useApplicationStore((s) => s.markNoShow);
  const reportIssue = useApplicationStore((s) => s.reportIssue);
  const confirmCompletion = useApplicationStore((s) => s.confirmCompletion);
  const approveCancellationRequest = useApplicationStore(
    (s) => s.approveCancellationRequest,
  );
  const rejectCancellationRequest = useApplicationStore(
    (s) => s.rejectCancellationRequest,
  );
  const cancelShift = useShiftStore((s) => s.cancel);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Phase 10A-Fix-7: cancellation now goes through a modal that
  // captures a required reason. The legacy inline confirm has been
  // replaced; `cancelOpen` controls modal visibility.
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [ratingForAppId, setRatingForAppId] = useState<string | null>(null);
  // Phase 6: rejection-reason dialog state. Holds the application id
  // currently being rejected; null when the dialog is closed.
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const shiftApps = applications.filter((a) => a.shiftId === shift.id);
  const positionsLeft = shift.positionsTotal - shift.positionsFilled;

  function handleApprove(appId: string) {
    setActionLoading(appId);
    const result = approve(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.applicant.approve.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleReject(appId: string) {
    // Phase 6: open the reason dialog instead of rejecting immediately.
    // The actual `reject(...)` call happens in `handleConfirmReject`.
    setRejectError(null);
    setRejectingAppId(appId);
  }

  function handleConfirmReject(reason: string) {
    if (!rejectingAppId) return;
    setActionLoading(rejectingAppId);
    const result = reject(rejectingAppId, reason);
    setActionLoading(null);
    if (!result.ok) {
      const message =
        result.error === 'REASON_REQUIRED'
          ? t('reject.error.reasonRequired')
          : toastFromStoreError(result.error);
      setRejectError(message);
      showError(message);
      return;
    }
    showSuccess(t('feedback.applicant.reject.success'));
    setRejectingAppId(null);
  }

  function handleMarkNoShow(appId: string) {
    setActionLoading(appId);
    const result = markNoShow(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(
        t('feedback.applicant.markNoShow.success'),
        t('feedback.applicant.markNoShow.success.desc'),
      );
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleReportIssue(appId: string) {
    reportIssue(appId, 'Người làm không hoàn thành đúng yêu cầu.');
  }

  function handleApproveCancellation(appId: string) {
    setActionLoading(appId);
    const result = approveCancellationRequest(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.applicant.cancellationApproved.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleRejectCancellation(appId: string) {
    setActionLoading(appId);
    const result = rejectCancellationRequest(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.applicant.cancellationRejected.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  function handleCancelShift() {
    if (cancelLoading) return;
    setCancelLoading(true);
    setCancelError(null);

    const trimmed = cancelReason.trim();
    if (trimmed === '') {
      setCancelError('Vui lòng nhập lý do hủy.');
      setCancelLoading(false);
      return;
    }

    const result = cancelShift(shift.id, trimmed);
    if (!result.ok) {
      // Phase 9G — distinguish the failure modes so the employer
      // sees a precise reason. Phase 10A-Fix-7 added `REASON_REQUIRED`
      // for empty reasons; the inline guard above handles that case
      // before calling the store, so we shouldn't normally see it
      // here. `NOT_FOUND` is rare (only if the shift was deleted
      // between render and click).
      const message = toastFromStoreError(result.error);
      setCancelError(message);
      showError(message);
      setCancelLoading(false);
      return;
    }

    // Phase 10A-Fix-7 — the store now owns the affected-worker
    // notification fan-out, the application status flips, the worker
    // protection credit, and the employer penalty calculation. The
    // employer-facing UI just confirms success and navigates away.
    setCancelLoading(false);
    setCancelOpen(false);
    setCancelReason('');
    if (result.value.employerCancelledAfterApproval) {
      showSuccess(
        t('feedback.shift.cancel.success'),
        `Hệ thống đã thông báo cho người lao động và áp dụng phí hủy ${Math.round(
          (result.value.employerCancellationPenaltyRate ?? 0) * 100,
        )}% tiền cọc.`,
      );
    } else {
      showSuccess(
        t('feedback.shift.cancel.success'),
        t('feedback.shift.cancel.success.desc'),
      );
    }
    // Redirect back to the employer dashboard so the employer sees the
    // cancellation reflected in their shift list immediately.
    router.push('/employer/dashboard');
  }

  // Phase 10A-Fix-7 — preview the penalty inline in the dialog so the
  // employer sees the consequence before they confirm. Recomputed on
  // every render with `Date.now()` so opening the dialog two minutes
  // before the 6h cutoff still reflects the higher rate.
  const cancelPreview = useMemo(() => {
    return computeEmployerCancellationPenalty(
      shift,
      applications,
      Date.now(),
    );
  }, [shift, applications]);
  const hasApprovedWorkers = useMemo(
    () =>
      applications.some(
        (a) =>
          a.shiftId === shift.id &&
          APPROVED_OR_LATER_STATUSES.has(a.status),
      ),
    [applications, shift.id],
  );

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

      {/* Cancel shift — only available while the shift is in a state that
          can still be cancelled. Completed / InProgress / AwaitingConfirmation
          / Cancelled / Expired states should never expose this control.
          Phase 10A-Fix-7: cancellation now opens a modal that captures
          a required reason and warns about worker-protection + employer
          penalty consequences. */}
      {['Draft', 'Published', 'FullyBooked'].includes(shift.status) && (
        <div className="mt-4 flex flex-col gap-2">
          <div>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setCancelError(null);
                setCancelOpen(true);
              }}
            >
              {t('btn.cancelShift')}
            </Button>
          </div>
        </div>
      )}

      {/* Already cancelled — informational banner so the page is not blank
          where the cancel button used to be. Phase 10A-Fix-7 — also
          shows the cancellation reason and the penalty applied so the
          employer has a record. */}
      {shift.status === 'Cancelled' && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
        >
          <p className="font-medium text-gray-900">
            {t('shift.cancelled.banner')}
          </p>
          {shift.employerCancellationReason && (
            <p className="mt-1 text-xs text-gray-600">
              <span className="font-medium">Lý do:</span>{' '}
              {shift.employerCancellationReason}
            </p>
          )}
          {shift.employerCancelledAfterApproval &&
            (shift.employerCancellationPenaltyAmount ?? 0) > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Phí hủy sau khi đã duyệt người:{' '}
                {Math.round(
                  (shift.employerCancellationPenaltyRate ?? 0) * 100,
                )}
                % tiền cọc ({formatVND(shift.employerCancellationPenaltyAmount ?? 0)}
                ).
              </p>
            )}
          {/* Phase 10A-Fix-8 — surface the affected approved-worker
              count on the cancelled-shift detail so the employer can
              audit the cancellation later (the payments-modal ledger
              already shows the money side; this banner shows the
              human side). Counts every application that was flipped
              to `'CancelledByEmployer'` by the store. */}
          {shift.employerCancelledAfterApproval &&
            (() => {
              const affectedCount = shiftApps.filter(
                (a) => a.status === 'CancelledByEmployer',
              ).length;
              if (affectedCount === 0) return null;
              return (
                <p className="mt-1 text-xs text-gray-600">
                  Số người lao động đã được duyệt bị ảnh hưởng:{' '}
                  <span className="font-semibold text-gray-900">
                    {affectedCount}
                  </span>
                </p>
              );
            })()}
        </div>
      )}

      {/* Phase 10A-Fix-7 — employer cancellation modal. */}
      <Modal
        open={cancelOpen}
        onClose={() => {
          if (cancelLoading) return;
          setCancelOpen(false);
          setCancelError(null);
        }}
        title="Hủy ca làm"
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          {hasApprovedWorkers ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
              Ca này đã có người lao động được duyệt. Khi hủy, người lao
              động sẽ không bị phạt và hệ thống sẽ ghi nhận ảnh hưởng đến
              uy tín nhà tuyển dụng.
            </p>
          ) : (
            <p className="text-gray-600">
              Vui lòng nhập lý do hủy. Người lao động đang chờ duyệt sẽ
              nhận thông báo ca không còn áp dụng.
            </p>
          )}

          <Textarea
            label="Lý do hủy (bắt buộc)"
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError(null);
            }}
            placeholder="Ví dụ: Lịch đột xuất thay đổi, không thể tổ chức ca."
            rows={3}
          />

          {cancelPreview.afterApproval && cancelPreview.amount > 0 && (
            <div className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-900 ring-1 ring-orange-200">
              <p className="font-medium">
                Phí hủy: {Math.round(cancelPreview.rate * 100)}% tiền cọc
                ({formatVND(cancelPreview.amount)})
              </p>
              <p className="mt-0.5 text-orange-800/80">
                {cancelPreview.rate >= 0.15
                  ? 'Bạn đang hủy trong vòng 6 giờ trước giờ bắt đầu.'
                  : cancelPreview.rate >= 0.1
                    ? 'Bạn đang hủy trong vòng 24 giờ trước giờ bắt đầu.'
                    : 'Bạn đang hủy hơn 24 giờ trước giờ bắt đầu.'}
              </p>
            </div>
          )}

          {cancelError && (
            <p role="alert" className="text-sm text-red-600">
              {cancelError}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCancelOpen(false);
                setCancelError(null);
              }}
              disabled={cancelLoading}
            >
              Không
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleCancelShift}
              loading={cancelLoading}
              disabled={cancelReason.trim() === ''}
            >
              Xác nhận hủy ca
            </Button>
          </div>
        </div>
      </Modal>

      {/* Applications */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t('employer.dashboard.applicants')} ({shiftApps.length})
        </h2>

        {shiftApps.length === 0 ? (
          <EmptyState
            tone="warm"
            title={t('employer.manageShift.empty.applicants.title')}
            description={t('employer.manageShift.empty.applicants.description')}
          />
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
                      // Phase 9Z-Fix-1: dropped the inline HelpPopover
                      // next to Approved / Confirmed badges. Manual QA
                      // flagged that only two of the six status types
                      // carried a `?` (the Pending / Rejected / etc.
                      // states had none), creating inconsistent UI on
                      // applicant cards. Per the Phase 9Y-Fix-3 rule
                      // ("overview/list cards stay clean; help lives in
                      // drill-down/detail surfaces"), all per-row help
                      // is removed. Status meaning is conveyed by the
                      // tinted badge alone; `/user-guide` carries the
                      // long-form explanation.
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
                        onApproveCancellation={() => handleApproveCancellation(app.id)}
                        onRejectCancellation={() => handleRejectCancellation(app.id)}
                      />
                    }
                  />

                  {/* Cancellation request panel — shows the worker's reason
                      below the row so the employer can decide in context. */}
                  {app.status === 'CancellationRequested' && (
                    <div className="ml-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                      <p className="font-medium">
                        {t('cancel.request.employerHeading')}
                      </p>
                      <p className="mt-1 text-orange-900/80">
                        <span className="font-medium">{t('form.reasonNote')}:</span>{' '}
                        {app.cancellationReasonNote || '—'}
                      </p>
                      <p className="mt-1 text-xs text-orange-900/70">
                        {t('cancel.request.employerHint')}
                      </p>
                    </div>
                  )}

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

      {/* Phase 6: rejection-reason dialog. Resolves the worker + shift
          from the live applications list so name/title labels stay in
          sync if anything else changes mid-decision. */}
      {rejectingAppId &&
        (() => {
          const target = applications.find((a) => a.id === rejectingAppId);
          if (!target) return null;
          const targetWorker = asWorker(users.find((u) => u.id === target.workerId));
          return (
            <RejectApplicationDialog
              open={true}
              onClose={() => {
                setRejectingAppId(null);
                setRejectError(null);
              }}
              workerName={targetWorker?.fullName ?? 'Người làm'}
              shiftTitle={shift.title}
              onConfirm={handleConfirmReject}
              loading={actionLoading === rejectingAppId}
            />
          );
        })()}
      {rejectError && rejectingAppId === null && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {rejectError}
        </p>
      )}
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
  onApproveCancellation,
  onRejectCancellation,
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
  onApproveCancellation: () => void;
  onRejectCancellation: () => void;
}) {
  // Cancellation-request decision — always takes precedence over other
  // states because the application is currently held in
  // `CancellationRequested` and nothing else can happen until the employer
  // approves or rejects.
  if (application.status === 'CancellationRequested') {
    return (
      <>
        <Button
          size="sm"
          variant="primary"
          onClick={onApproveCancellation}
          loading={loading}
        >
          {t('btn.approveCancellation')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRejectCancellation}
          loading={loading}
        >
          {t('btn.rejectCancellation')}
        </Button>
      </>
    );
  }

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
    case 'CancellationRequested':
      return 'warning';
    case 'Rejected':
      return 'danger';
    case 'NoShow':
      return 'danger';
    case 'CancelledByWorker':
      return 'neutral';
    case 'CancelledByEmployer':
      return 'danger';
    default:
      return 'neutral';
  }
}
