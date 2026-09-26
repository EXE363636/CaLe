'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { getDataMode, isSupabaseEnv } from '@/data/supabaseClient';
import { useUserStore, asWorker } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { Badge, Button, ButtonLink, EmptyState, Modal, Textarea } from '@/components/ui';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { hasCapability } from '@/data/capabilities';
import { EmployerConfirmationPanel } from '@/components/shift/EmployerConfirmationPanel';
import { WorkerSummaryRow } from '@/components/user/WorkerSummaryRow';
import { WorkerProfileModal } from '@/components/user/WorkerProfileModal';
import { RatingForm } from '@/components/forms/RatingForm';
import { RejectApplicationDialog } from '@/components/forms/RejectApplicationDialog';
import {
  DisputeDialog,
  DisputeResponseDialog,
  type DisputePayload,
  type DisputeResponsePayload,
} from '@/components/forms';
import {
  APPROVED_OR_LATER_STATUSES,
  computeEmployerCancellationPenalty,
} from '@/domain/employerCancellation';
import { jobCategoryRiskLevel } from '@/domain/skillScore';
import {
  canEmployerMarkAbsent,
  canEmployerMarkPresent,
  shouldMarkNoShow,
} from '@/domain/timeGates';
import { deriveAttendanceState, attendanceCopyKey } from '@/domain/attendanceState';
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { bucketApplicants } from '@/domain/applicantBuckets';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { showSuccess, showError } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import { tSettlement } from '@/lib/settlementCopy';
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
  const hydrated = useHydrationStore((s) => s.hydrated);
  // Supabase: store sau hydrate có thể chưa chứa ca này (deep-link từ thông
  // báo, ca cũ ngoài danh sách đã tải) → tra server MỘT lần trước khi kết
  // luận 404. Lỗi mạng hiện màn hình thử lại thay vì 404 sai.
  const [lookup, setLookup] = useState<{ key: string; status: 'missing' | 'error' } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lookupKey = `${id}#${attempt}`;
  const needsServerLookup = !shift && hydrated && isSupabaseEnv();

  useEffect(() => {
    if (!needsServerLookup) return;
    let cancelled = false;
    useShiftStore
      .getState()
      .refetchOne(id)
      .then(() => {
        if (!cancelled) setLookup({ key: lookupKey, status: 'missing' });
      })
      .catch(() => {
        if (!cancelled) setLookup({ key: lookupKey, status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [needsServerLookup, id, lookupKey]);

  // Wait for hydration before deciding the shift is missing — a cold
  // load / refresh / deep-link renders against the still-empty store
  // otherwise, producing a permanent 404.
  if (!shift) {
    const lookupDone = lookup?.key === lookupKey ? lookup.status : null;
    if (!hydrated || (needsServerLookup && lookupDone === null)) {
      return (
        <div
          className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-500"
          role="status"
          aria-live="polite"
        >
          {t('common.loading')}
        </div>
      );
    }
    if (lookupDone === 'error') {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
          <h1 className="text-lg font-semibold text-gray-900">
            {t('employer.manageShift.loadError.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{t('employer.manageShift.loadError.body')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => setAttempt((n) => n + 1)}>
              {t('btn.retry')}
            </Button>
            <ButtonLink href="/employer/dashboard" variant="ghost">
              {t('employer.manageShift.backToDashboard')}
            </ButtonLink>
          </div>
        </div>
      );
    }
    return notFound();
  }
  if (shift.employerId !== currentUserId) return notFound();

  return <ManageShiftContent shift={shift} />;
}

function ManageShiftContent({ shift }: { shift: Shift }) {
  useLifecycleSync();
  const router = useRouter();
  const users = useUserStore((s) => s.users);
  const applications = useApplicationStore((s) => s.applications);
  const approveAsync = useApplicationStore((s) => s.approveAsync);
  const rejectAsync = useApplicationStore((s) => s.rejectAsync);
  const markNoShowAsync = useApplicationStore((s) => s.markNoShowAsync);
  const markPresentAsync = useApplicationStore((s) => s.markPresentAsync);
  const confirmCompletionAsync = useApplicationStore((s) => s.confirmCompletionAsync);
  const revertNoShowToPresentAsync = useApplicationStore(
    (s) => s.revertNoShowToPresentAsync,
  );
  const reportIssue = useApplicationStore((s) => s.reportIssue);
  const appendDisputeResponse = useApplicationStore(
    (s) => s.appendDisputeResponse,
  );
  const disputes = useApplicationStore((s) => s.disputes);
  const confirmCompletion = useApplicationStore((s) => s.confirmCompletion);
  const approveCancellationRequestAsync = useApplicationStore(
    (s) => s.approveCancellationRequestAsync,
  );
  const rejectCancellationRequestAsync = useApplicationStore(
    (s) => s.rejectCancellationRequestAsync,
  );
  const cancelShift = useShiftStore((s) => s.cancel);
  const cancelShiftAsync = useShiftStore((s) => s.cancelAsync);
  const repostFromShift = useShiftStore((s) => s.repostFromShift);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Đơn đang chờ xác nhận "vắng mặt" (chỉ supabase — thao tác không hoàn tác).
  const [noShowConfirmAppId, setNoShowConfirmAppId] = useState<string | null>(null);
  // Phase 10A-Fix-7: cancellation now goes through a modal that
  // captures a required reason. The legacy inline confirm has been
  // replaced; `cancelOpen` controls modal visibility.
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [ratingForAppId, setRatingForAppId] = useState<string | null>(null);
  // P0-checkout-stuck: đơn đang chờ xác nhận hoàn thành THỦ CÔNG (worker chưa check-out).
  const [manualCompleteAppId, setManualCompleteAppId] = useState<string | null>(null);
  // Phase 6: rejection-reason dialog state. Holds the application id
  // currently being rejected; null when the dialog is closed.
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  // Phase 10C — employer dispute dialog state. Holds the target
  // application id when the dialog is open; reset on close or success.
  const [disputeAppId, setDisputeAppId] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  // Phase 10C-Stab-1 Batch 3 E — employer-side response dialog state
  // for worker-initiated disputes. Holds the target dispute id when
  // the dialog is open.
  const [responseTargetDisputeId, setResponseTargetDisputeId] = useState<
    string | null
  >(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  // CORE-STABILITY-7 Part 5 — "đổi vắng mặt → có mặt" (late arrival)
  // dialog state. Holds the target application id + a required reason.
  const [revertAppId, setRevertAppId] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [revertError, setRevertError] = useState<string | null>(null);

  const shiftApps = applications.filter((a) => a.shiftId === shift.id);
  // Kẹp ≥ 0: dữ liệu lệch (vd. duyệt vượt số vị trí trước khi server chặn)
  // không được hiện "-1 vị trí còn trống".
  const positionsLeft = Math.max(0, shift.positionsTotal - shift.positionsFilled);

  // Phase 10A-Fix-9: lock applicant approve/reject after the shift
  // start datetime, in addition to the more obvious terminal states
  // (`InProgress`, `AwaitingConfirmation`, `Completed`, `Cancelled`,
  // `Expired`). The same predicate drives the "Đơn đã hết hạn xử lý"
  // badge inside `ApplicationActionButtons` below.
  const shiftStarted =
    // eslint-disable-next-line react-hooks/purity -- intentional real-time gate: locks approve/reject once the shift start time has passed
    new Date(`${shift.date}T${shift.startTime}:00`).getTime() <= Date.now() ||
    shift.status === 'InProgress' ||
    shift.status === 'AwaitingConfirmation' ||
    shift.status === 'Completed' ||
    shift.status === 'Cancelled' ||
    shift.status === 'Expired';

  // Phase 10A-Fix-9: surface a soft warning for high-risk job
  // categories so the employer is reminded to favour verified /
  // high-reputation workers. Computed live so changes to the job-type
  // mapping in `src/domain/skillScore.ts` flow through automatically.
  const riskLevel = jobCategoryRiskLevel(shift.jobType);

  async function handleApprove(appId: string) {
    if (actionLoading) return;
    setActionLoading(appId);
    const result = await approveAsync(appId);
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

  async function handleConfirmReject(reason: string) {
    if (!rejectingAppId || actionLoading) return;
    setActionLoading(rejectingAppId);
    const result = await rejectAsync(rejectingAppId, reason);
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
    if (actionLoading) return; // khóa double-click
    // Supabase: vắng mặt là KHÔNG hoàn tác được (server chốt cọc, hoàn phần dư
    // về ví khi người cuối cùng được xử lý) → hỏi lại qua Modal trước khi gửi.
    if (isSupabaseEnv()) {
      setNoShowConfirmAppId(appId);
      return;
    }
    void performMarkNoShow(appId);
  }

  async function performMarkNoShow(appId: string) {
    setNoShowConfirmAppId(null);
    setActionLoading(appId);
    // Wrapper tự dispatch: supabase → RPC + refetch server; local → sync cũ.
    const result = await markNoShowAsync(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(
        t('feedback.applicant.markNoShow.success'),
        t(
          isSupabaseEnv()
            ? 'feedback.applicant.markNoShow.success.descReal'
            : 'feedback.applicant.markNoShow.success.desc',
        ),
      );
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  // Phase 10C-Stab-1 Batch 2 D — employer marks an Approved
  // applicant as physically present. Always available regardless of
  // `evidenceRequirement` (D.5). The button visibility is gated by
  // `canEmployerMarkPresent` from `domain/timeGates`.
  async function handleMarkPresent(appId: string) {
    if (actionLoading) return; // khóa double-click
    setActionLoading(appId);
    // Wrapper tự dispatch: supabase → RPC + refetch server; local → sync cũ.
    const result = await markPresentAsync(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('lifecycle.toast.markPresent.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  // Supabase: xác nhận hoàn thành trực tiếp qua RPC (không thu rating — ratings
  // chưa có backend). Local giữ luồng RatingForm → confirmCompletion cũ.
  async function handleConfirmComplete(appId: string): Promise<boolean> {
    if (actionLoading) return false; // khóa double-click
    setActionLoading(appId);
    const result = await confirmCompletionAsync(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.applicant.confirm.success'));
      return true;
    } else {
      showError(toastFromStoreError(result.error));
      return false;
    }
  }

  // CORE-STABILITY-7 Part 5.4 — open the late-arrival correction
  // dialog for a NoShow application.
  function handleOpenRevert(appId: string) {
    setRevertReason('');
    setRevertError(null);
    setRevertAppId(appId);
  }

  async function handleConfirmRevert() {
    if (!revertAppId || actionLoading) return;
    const trimmed = revertReason.trim();
    if (trimmed === '') {
      setRevertError(t('attendance.revert.error.reasonRequired'));
      return;
    }
    setActionLoading(revertAppId);
    const result = await revertNoShowToPresentAsync(revertAppId, trimmed);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('attendance.revert.success'));
      setRevertAppId(null);
      setRevertReason('');
      setRevertError(null);
      return;
    }
    const message =
      result.error === 'DISPUTE_OPEN'
        ? t('attendance.revert.error.disputeOpen')
        : result.error === 'REASON_REQUIRED'
          ? t('attendance.revert.error.reasonRequired')
          : toastFromStoreError(result.error);
    setRevertError(message);
    showError(message);
  }

  function handleReportIssue(appId: string) {
    // Phase 10C — open the structured dispute dialog instead of the
    // pre-Phase-9 instant "Người lao động không hoàn thành đúng yêu cầu"
    // shortcut. The dialog gathers category + reason + evidence and
    // forwards them to `applicationStore.reportIssue(payload)`.
    setDisputeError(null);
    setDisputeAppId(appId);
  }

  function handleDisputeSubmit(payload: DisputePayload) {
    if (!disputeAppId) return;
    setActionLoading(disputeAppId);
    const result = reportIssue({
      applicationId: disputeAppId,
      // Worker-side categories are filtered out at the dialog level
      // (the dialog renders only the employer enum on this surface),
      // so the cast is safe here.
      category: payload.category as
        | 'NoShow'
        | 'LeftEarly'
        | 'ChecklistFailed'
        | 'MisrepresentedSkills'
        | 'BehaviorIssue'
        | 'Damage'
        | 'Other',
      reason: payload.reason,
      evidenceDescription: payload.evidenceDescription,
      evidenceFileName: payload.evidenceFileName,
    });
    setActionLoading(null);
    if (result.ok) {
      showSuccess(
        t('feedback.dispute.success'),
        t('feedback.dispute.success.desc'),
      );
      setDisputeAppId(null);
      setDisputeError(null);
      return;
    }
    const message = toastFromStoreError(result.error);
    setDisputeError(message);
    showError(message);
  }

  async function handleApproveCancellation(appId: string) {
    if (actionLoading) return;
    setActionLoading(appId);
    const result = await approveCancellationRequestAsync(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.applicant.cancellationApproved.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  async function handleRejectCancellation(appId: string) {
    if (actionLoading) return;
    setActionLoading(appId);
    const result = await rejectCancellationRequestAsync(appId);
    setActionLoading(null);
    if (result.ok) {
      showSuccess(t('feedback.applicant.cancellationRejected.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  // Phase 10C-Stab-1 Batch 3 A — repost no longer auto-creates a
  // Draft. Instead it appends a `'CreatedFromRepost'` timeline
  // entry on the source shift and navigates the employer to
  // `/employer/shifts/new?from={id}` where they edit and confirm
  // before any new shift is persisted.
  const [repostLoading, setRepostLoading] = useState(false);
  function handleRepost() {
    if (repostLoading) return;
    setRepostLoading(true);
    const result = repostFromShift(shift.id);
    setRepostLoading(false);
    if (!result.ok) {
      showError(toastFromStoreError(result.error));
      return;
    }
    showSuccess(
      t('feedback.repost.success'),
      t('feedback.repost.success.desc'),
    );
    router.push(`/employer/shifts/new?from=${result.value.id}`);
  }

  async function handleCancelShift() {
    if (cancelLoading) return;
    setCancelLoading(true);
    setCancelError(null);

    const trimmed = cancelReason.trim();
    if (trimmed === '') {
      setCancelError(t('employer.manageShift.cancel.reasonRequired'));
      setCancelLoading(false);
      return;
    }

    // Supabase: hủy qua RPC (không có thông tin penalty client — Phase 3 mới có tiền).
    if (getDataMode() === 'supabase') {
      const res = await cancelShiftAsync(shift.id, trimmed);
      if (!res.ok) {
        const message = toastFromStoreError(res.error);
        setCancelError(message);
        showError(message);
        setCancelLoading(false);
        return;
      }
      setCancelLoading(false);
      setCancelOpen(false);
      setCancelReason('');
      // Production: tiền là THẬT (PayOS) → không dùng mô tả "(mô phỏng)".
      showSuccess(
        t('feedback.shift.cancel.success'),
        t('feedback.shift.cancel.success.descReal'),
      );
      router.push('/employer/dashboard');
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
        t('employer.manageShift.cancel.successPenalty').replace(
          '{rate}',
          String(Math.round((result.value.employerCancellationPenaltyRate ?? 0) * 100)),
        ),
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
      // eslint-disable-next-line react-hooks/purity -- intentional real-time penalty preview; recomputed each render so the rate reflects the current time vs the 6h cutoff
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
        className="mb-4 -ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-sm font-medium text-orange-700 transition-colors hover:text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        ← {t('btn.back')}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-balance break-words text-2xl font-bold text-gray-900">
            {shift.title}
          </h1>
          <p className="mt-1 text-sm text-gray-600 tabular-nums">
            {formatDateVN(shift.date)} • {formatTimeVN(shift.startTime)}–
            {formatTimeVN(shift.endTime)} • {formatVND(shift.hourlyWage)}
            {t('common.perHour')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* CORE-STABILITY-10 — single unified lifecycle badge,
              identical label + colour to every other surface. Escrow
              is a distinct money concept and stays separate. */}
          <ShiftLifecycleBadge shift={shift} applications={applications} />
          {/* Escrow/cọc chưa có backend ở supabase → ẩn badge tiền (mục 4/5). */}
          {/* Server không cập nhật escrow_status khi chốt tiền (0018/0019) →
              với ca đã hoàn thành / hết hạn, nhãn cọc là trạng thái cũ. Ví +
              lịch sử giao dịch là nơi thể hiện tiền đã chốt. */}
          {hasCapability('wallet') &&
            !(isSupabaseEnv() && (shift.status === 'Completed' || shift.status === 'Expired')) && (
              <EscrowStatusBadge status={shift.escrowStatus} />
            )}
        </div>
      </div>

      {/* Positions summary */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 tabular-nums">
        <span>
          {shift.positionsFilled}/{shift.positionsTotal}{' '}
          {t('employer.manageShift.positionsApproved')}
        </span>
        <span>
          {positionsLeft} {t('employer.manageShift.positionsLeft')}
        </span>
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

      {/* Phase 10C-Stab-1 Batch 2 — Repost banner. Surfaces a "Đăng
          lại từ ca này" CTA on cancelled / expired / completed
          shifts so the employer can quickly clone the source. The
          store action creates a fresh Draft and we navigate to the
          new shift's detail. */}
      {(shift.status === 'Cancelled' ||
        shift.status === 'Expired' ||
        shift.status === 'Completed') && (
        <div
          role="note"
          className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900"
        >
          <p className="font-medium text-orange-900">
            {t(`employer.repost.banner.title.${shift.status}`)}
          </p>
          <p className="mt-1 text-xs text-orange-900/80">
            {t('employer.repost.banner.body')}
          </p>
          <div className="mt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleRepost}
              loading={repostLoading}
            >
              {t('employer.repost.button')}
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
            <p className="mt-1 break-words text-xs text-gray-600">
              <span className="font-medium">
                {t('employer.manageShift.cancelled.reasonLabel')}
              </span>{' '}
              {shift.employerCancellationReason}
            </p>
          )}
          {shift.employerCancelledAfterApproval &&
            (shift.employerCancellationPenaltyAmount ?? 0) > 0 && (
              <p className="mt-1 text-xs text-amber-700 tabular-nums">
                {t('employer.manageShift.cancelled.penaltyPrefix')}{' '}
                {Math.round((shift.employerCancellationPenaltyRate ?? 0) * 100)}
                {t('employer.manageShift.cancelled.penaltyUnit')} (
                {formatVND(shift.employerCancellationPenaltyAmount ?? 0)}).
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
                  {t('employer.manageShift.cancelled.affectedLabel')}{' '}
                  <span className="font-semibold text-gray-900">
                    {affectedCount}
                  </span>
                </p>
              );
            })()}
        </div>
      )}

      {/* Phase 10C-Stab-1 Batch 2 — append-only audit timeline.
          Shown when the shift has at least one entry; renders each
          event with a vi-VN second-resolution timestamp so the
          employer can audit the lineage. */}
      <ShiftTimelineSection timeline={shift.timeline} />

      {/* Xác nhận đánh dấu vắng mặt (supabase) — thay window.confirm. */}
      <Modal
        open={noShowConfirmAppId !== null}
        onClose={() => setNoShowConfirmAppId(null)}
        title={t('attendance.markNoShow.title')}
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>{t('attendance.markNoShow.confirm')}</p>
          <div className="mt-1 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setNoShowConfirmAppId(null)}>
              {t('btn.back')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (noShowConfirmAppId) void performMarkNoShow(noShowConfirmAppId);
              }}
            >
              {t('attendance.markNoShow.submit')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 10A-Fix-7 — employer cancellation modal. */}
      <Modal
        open={cancelOpen}
        onClose={() => {
          if (cancelLoading) return;
          setCancelOpen(false);
          setCancelError(null);
        }}
        title={t('employer.manageShift.cancel.title')}
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          {hasApprovedWorkers ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
              {t('employer.manageShift.cancel.warnApproved')}
            </p>
          ) : (
            <p className="text-gray-600">{t('employer.manageShift.cancel.intro')}</p>
          )}

          <Textarea
            label={t('employer.manageShift.cancel.reasonLabel')}
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError(null);
            }}
            placeholder={t('employer.manageShift.cancel.reasonPlaceholder')}
            rows={3}
            maxLength={500}
          />

          {cancelPreview.afterApproval && cancelPreview.amount > 0 && (
            <div className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-900 ring-1 ring-orange-200">
              <p className="font-medium tabular-nums">
                {t('employer.manageShift.cancel.penaltyPrefix')}{' '}
                {Math.round(cancelPreview.rate * 100)}
                {t('employer.manageShift.cancelled.penaltyUnit')} (
                {formatVND(cancelPreview.amount)})
              </p>
              <p className="mt-0.5 text-orange-800/80">
                {t(
                  cancelPreview.rate >= 0.15
                    ? 'employer.manageShift.cancel.within6h'
                    : cancelPreview.rate >= 0.1
                      ? 'employer.manageShift.cancel.within24h'
                      : 'employer.manageShift.cancel.over24h',
                )}
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
              {t('employer.manageShift.cancel.keep')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleCancelShift}
              loading={cancelLoading}
              disabled={cancelReason.trim() === ''}
            >
              {t('employer.manageShift.cancel.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Applications — QA-Fix-1 D: parent "Tình trạng đơn" heading
          with lifecycle sub-sections. The count reflects the number
          of applications actually shown in the buckets (active
          lifecycle states), so the header never disagrees with the
          visible cards. Terminal-but-hidden states (Rejected /
          CancelledBy* / Expired) are intentionally excluded. */}
      <section className="mt-8">
        {(() => {
          const buckets = bucketApplicants(
            shift,
            shiftApps,
            new Date().toISOString(),
          );
          const visibleCount = buckets.reduce(
            (sum, b) => sum + b.applications.length,
            0,
          );
          return (
            <>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {t('employer.applicants.parentHeading')} ({visibleCount})
              </h2>

              {/* Phase 10A-Fix-9: high-risk-job soft warning. */}
              {riskLevel === 'High' && (
                <div
                  role="note"
                  className="mb-4 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">{t('employer.manageShift.risk.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                      {t('employer.manageShift.risk.body')}
                    </p>
                  </div>
                </div>
              )}

              {visibleCount === 0 ? (
                <EmptyState
                  tone="warm"
                  title={t('employer.manageShift.empty.applicants.title')}
                  description={t('employer.manageShift.empty.applicants.description')}
                />
              ) : (
                <div className="flex flex-col gap-6">
                  {buckets.map(
                    (bucket) => (
                <section
                  key={bucket.bucket}
                  // P3 card-in-card: this bucket groups `WorkerSummaryRow`
                  // cards (each already a bordered, shadowed Card). Dropped
                  // the bucket's own `shadow-card` and lightened its border
                  // (gray-200 -> gray-100) so it reads as a soft grouping
                  // tray, not a competing card. Heading + spacing kept.
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
                  aria-labelledby={`applicant-bucket-${bucket.bucket}`}
                >
                  <header className="flex flex-col gap-0.5 border-b border-gray-200 pb-2">
                    <h3
                      id={`applicant-bucket-${bucket.bucket}`}
                      className="text-sm font-semibold text-gray-900"
                    >
                      {t(`applicantBucket.${bucket.bucket}`)}
                      <span className="ml-2 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                        {bucket.applications.length}
                      </span>
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-500">
                      {bucket.bucket === 'AwaitingConfirmation'
                        ? tSettlement('applicantBucket.AwaitingConfirmation.hint')
                        : t(`applicantBucket.${bucket.bucket}.hint`)}
                    </p>
                  </header>
                  <div className="flex flex-col gap-3">
                    {bucket.applications.map((app) => {
              const worker = asWorker(users.find((u) => u.id === app.workerId));
              // Hồ sơ chưa tải (supabase, RLS/mạng) → vẫn hiện đơn để số đếm ở
              // tiêu đề khớp với số dòng, thay vì lặng lẽ biến mất.
              if (!worker) {
                return (
                  <div
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600"
                  >
                    <span>{t('employer.manageShift.workerMissing')}</span>
                    <Badge tone={badgeToneForApp(app.status)}>
                      {t(`application.status.${app.status}`)}
                    </Badge>
                  </div>
                );
              }

              const nowIso = new Date().toISOString();
              // CORE-STABILITY-9 Parts 1 & 3 · demo-logic-data-consistency
              // Cluster 1 — derive the canonical attendance state ONCE and
              // reuse it for BOTH the action-row gating below and the
              // employer banner, so the buttons never diverge from the
              // copy. `deriveAttendanceState` is the single source of truth.
              const attendanceState = deriveAttendanceState(app, shift, nowIso);
              // QA-Fix-1 C1 — attendance controls must NOT appear on
              // terminal shift states (Expired / Cancelled /
              // Completed). The time-gate predicates below would
              // otherwise keep "Đánh dấu vắng mặt" live for days
              // after an Expired shift. The employer can still mark
              // absence while the shift is in an actionable state.
              const shiftTerminal =
                shift.status === 'Expired' ||
                shift.status === 'Cancelled' ||
                shift.status === 'Completed';
              // Phase 10C-Stab-1 Batch 2 D — canonical lifecycle
              // gates. The Mark Absent button uses the new
              // `canEmployerMarkAbsent` predicate (independent of
              // `evidenceRequirement`); the legacy `shouldMarkNoShow`
              // call is preserved as the fallback inside the helper.
              const canMarkAbsent =
                // Supabase: RPC employer_mark_no_show (0018) — gate qua capability attendance.
                (!isSupabaseEnv() || hasCapability('attendance')) &&
                !shiftTerminal &&
                app.status === 'Approved' &&
                (canEmployerMarkAbsent(nowIso, app, shift) ||
                  shouldMarkNoShow(nowIso, app, shift));
              const canMarkPresent =
                // Gate thống nhất qua capability attendance (production = có RPC thật).
                hasCapability('attendance') &&
                !shiftTerminal &&
                canEmployerMarkPresent(nowIso, app, shift);
              // P0-checkout-stuck: đơn kẹt `CheckedIn` sau khi ca kết thúc —
              // employer ĐÃ xác nhận có mặt nhưng worker chưa/không check-out.
              // Cho employer đóng thủ công qua RPC (không có nút này ở local, nơi
              // lifecycle sync tự xử lý).
              const shiftEndedNow =
                new Date(`${shift.date}T${shift.endTime}:00`).getTime() <=
                new Date(nowIso).getTime();
              const canManualComplete =
                isSupabaseEnv() &&
                !shiftTerminal &&
                app.status === 'CheckedIn' &&
                Boolean(app.markedPresentAt) &&
                !app.checkOutAt &&
                shiftEndedNow;
              // CORE-STABILITY-7 Part 5.2 — when the worker has already
              // checked in, the "Đánh dấu vắng mặt" action is shown but
              // disabled/dimmed with an explanatory reason (an absence
              // on a checked-in worker should go through a dispute).
              //
              // demo-logic-data-consistency Cluster 1 (BUG 1 · Property 1):
              // once BOTH sides have confirmed presence
              // (`BothConfirmedPresent`), the worker has self-confirmed and
              // any absence must go through the dispute / "report issue"
              // flow — so the stray disabled red button is suppressed and
              // only the "Hai bên đã xác nhận có mặt…" waiting-for-checkout
              // banner remains. Other checked-in states keep the existing
              // disabled affordance unchanged (Property 11).
              const absentDisabledReason =
                !shiftTerminal &&
                app.status === 'CheckedIn' &&
                Boolean(app.checkInAt) &&
                attendanceState !== 'BothConfirmedPresent'
                  ? t('attendance.absentDisabled.checkedIn')
                  : null;
              // CORE-STABILITY-7 Part 5.4 — a NoShow can be corrected to
              // present (late arrival) while the shift hasn't fully
              // closed out (escrow not yet Released).
              const canRevertToPresent =
                // Supabase: RPC employer_revert_no_show (0019) — server chặn khi
                // cọc đã chốt (DEPOSIT_NOT_HELD).
                (!isSupabaseEnv() || hasCapability('attendance')) &&
                app.status === 'NoShow' &&
                shift.status !== 'Completed' &&
                shift.status !== 'Cancelled' &&
                (isSupabaseEnv() || shift.escrowStatus !== 'Released');
              // CORE-STABILITY-9 Parts 1 & 3 — role-aware attendance
              // copy for the EMPLOYER viewer (never worker-perspective
              // text). One banner derived from the canonical state
              // (reuses `attendanceState` above — the same single source
              // that gates the action row, so copy and buttons agree).
              const employerAttendanceCopy = attendanceCopyKey(
                attendanceState,
                'employer',
              );
              const showRating = ratingForAppId === app.id;

              return (
                <div key={app.id} className="flex flex-col gap-2">
                  <WorkerSummaryRow
                    worker={worker}
                    jobCategory={shift.jobType}
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
                        canMarkAbsent={canMarkAbsent}
                        canMarkPresent={canMarkPresent}
                        absentDisabledReason={absentDisabledReason}
                        canRevertToPresent={canRevertToPresent}
                        showRating={showRating}
                        shiftStarted={shiftStarted}
                        onApprove={() => handleApprove(app.id)}
                        onReject={() => handleReject(app.id)}
                        onMarkAbsent={() => handleMarkNoShow(app.id)}
                        onMarkPresent={() => handleMarkPresent(app.id)}
                        onRevertToPresent={() => handleOpenRevert(app.id)}
                        onConfirm={() =>
                          // Ratings có backend (local) → mở RatingForm; chưa có
                          // (supabase) → xác nhận hoàn thành trực tiếp qua RPC.
                          hasCapability('ratings')
                            ? setRatingForAppId(app.id)
                            : handleConfirmComplete(app.id)
                        }
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

                  {/* CORE-STABILITY-9 Parts 1 & 3 — role-aware
                      attendance banner. Surfaces EMPLOYER-perspective
                      copy under the row (never "Nhà tuyển dụng đã xác
                      nhận BẠN..."). Derived from the canonical
                      attendance state. */}
                  {employerAttendanceCopy && (
                    <p
                      role="status"
                      className="ml-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
                    >
                      {t(employerAttendanceCopy)}
                    </p>
                  )}

                  {/* Phase 10C — employer confirmation panel.
                      Renders below the row when the application is
                      checked-out and the inline rating form is not
                      already open (so we don't double up the
                      confirm CTA). The panel hosts the read-only
                      evidence summary, the 12-hour countdown, and
                      the Confirm + Dispute actions. */}
                  {app.status === 'CheckedOut' && !showRating && (
                    <EmployerConfirmationPanel
                      application={app}
                      shift={shift}
                      onConfirm={() =>
                        // Ratings có backend (local) → mở RatingForm rồi
                        // xác nhận. Chưa có (supabase) → xác nhận hoàn thành
                        // trực tiếp qua RPC `employer_confirm_completion`
                        // (tồn tại sau reload); KHÔNG mở RatingForm.
                        hasCapability('ratings')
                          ? setRatingForAppId(app.id)
                          : handleConfirmComplete(app.id)
                      }
                      onDispute={() => handleReportIssue(app.id)}
                      // Tranh chấp chưa có backend ở supabase → ẩn CTA
                      // "Khiếu nại" để không có nút chỉ đổi RAM (mục 5).
                      showDispute={hasCapability('disputes')}
                      loading={actionLoading === app.id}
                    />
                  )}

                  {/* P0-checkout-stuck — đơn kẹt CheckedIn sau giờ (worker chưa
                      check-out). Cho employer đóng thủ công (có modal cảnh báo). */}
                  {canManualComplete && (
                    <div className="ml-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3">
                      <p className="text-sm font-semibold text-amber-900">
                        {t('employer.manageShift.manual.title')}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        {t('employer.manageShift.manual.body')}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        className="mt-2"
                        loading={actionLoading === app.id}
                        onClick={() => setManualCompleteAppId(app.id)}
                      >
                        {t('employer.manageShift.manual.button')}
                      </Button>
                    </div>
                  )}

                  {/* Phase 10C-Stab-1 Batch 3 E — Disputed panel.
                      When the application is in `'Disputed'`, render
                      a panel below the row with the right copy
                      depending on who initiated, the linked
                      statement (category / reason / evidence), every
                      back-and-forth response, and a "Phản hồi khiếu
                      nại" button when the employer is the responding
                      side (i.e. worker initiated). */}
                  {app.status === 'Disputed' && (() => {
                    const ourDispute = disputes
                      .filter((d) => d.applicationId === app.id)
                      .sort((a2, b2) =>
                        b2.createdAt.localeCompare(a2.createdAt),
                      )[0];
                    if (!ourDispute) return null;
                    const initiatedByWorker =
                      ourDispute.raisedBy === 'worker';
                    return (
                      <div className="ml-2 flex flex-col gap-2">
                        <p
                          role="status"
                          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
                        >
                          {initiatedByWorker
                            ? t('employer.dispute.statusLine.byWorker')
                            : t('employer.dispute.statusLine.byEmployer')}
                        </p>
                        {initiatedByWorker && (
                          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-900">
                            <p className="font-semibold">
                              {t('employer.dispute.workerStatement.title')}
                            </p>
                            <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-3">
                              <dt className="font-medium">
                                {t('employer.manageShift.dispute.category')}
                              </dt>
                              <dd>
                                {ourDispute.category
                                  ? t(`dispute.category.${ourDispute.category}`)
                                  : t('employer.manageShift.dispute.none')}
                              </dd>
                              <dt className="font-medium">
                                {t('employer.manageShift.dispute.reason')}
                              </dt>
                              <dd className="whitespace-pre-line break-words">
                                {ourDispute.reason}
                              </dd>
                              <dt className="font-medium">
                                {t('employer.manageShift.dispute.evidence')}
                              </dt>
                              <dd className="whitespace-pre-line break-words">
                                {ourDispute.evidenceDescription ||
                                  t('employer.manageShift.dispute.none')}
                              </dd>
                              <dt className="font-medium">
                                {t('employer.manageShift.dispute.file')}
                              </dt>
                              <dd className="break-all font-mono">
                                {ourDispute.evidenceFileName ||
                                  t('employer.manageShift.dispute.none')}
                              </dd>
                            </dl>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setResponseTargetDisputeId(ourDispute.id);
                                  setResponseError(null);
                                  setResponseDialogOpen(true);
                                }}
                              >
                                {t('employer.dispute.respondButton')}
                              </Button>
                            </div>
                          </div>
                        )}
                        {/* Render every back-and-forth response. */}
                        {ourDispute.responses &&
                          ourDispute.responses.length > 0 && (
                            <ul className="flex flex-col gap-2 border-t border-amber-200 pt-2 text-[12px] text-amber-900">
                              {[...ourDispute.responses]
                                .sort((a2, b2) =>
                                  a2.createdAt.localeCompare(b2.createdAt),
                                )
                                .map((r) => (
                                  <li
                                    key={r.id}
                                    className="rounded-md border border-amber-200 bg-white/70 px-2 py-1.5"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                      {r.side === 'worker'
                                        ? t('employer.manageShift.dispute.sideWorker')
                                        : t('employer.manageShift.dispute.sideEmployer')}
                                      {' · '}
                                      {new Intl.DateTimeFormat('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      }).format(new Date(r.createdAt))}
                                    </p>
                                    <p className="mt-1 whitespace-pre-line break-words">
                                      {r.reason}
                                    </p>
                                    {r.evidenceDescription && (
                                      <p className="mt-1 break-words italic">
                                        {r.evidenceDescription}
                                      </p>
                                    )}
                                    {r.evidenceFileName && (
                                      <p className="mt-1 break-all font-mono text-xs">
                                        {r.evidenceFileName}
                                      </p>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          )}
                      </div>
                    );
                  })()}

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
                </section>
              ),
            )}
                </div>
              )}
            </>
          );
        })()}
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
              workerName={targetWorker?.fullName ?? t('employer.manageShift.dispute.sideWorker')}
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

      {/* Phase 10C — employer dispute dialog. Opens from the
          confirmation panel's "Khiếu nại" button. Closes on success
          or when the employer cancels; on store rejection the
          dialog stays open with `errorMessage` set. */}
      {disputeAppId && (
        <DisputeDialog
          open={true}
          onClose={() => {
            setDisputeAppId(null);
            setDisputeError(null);
          }}
          side="employer"
          subjectTitle={shift.title}
          onSubmit={handleDisputeSubmit}
          loading={actionLoading === disputeAppId}
          errorMessage={disputeError}
        />
      )}

      {/* Phase 10C-Stab-1 Batch 3 E — employer-side response dialog
          for worker-initiated disputes. Mounts when the employer
          clicks "Phản hồi khiếu nại" on the Disputed panel. */}
      {responseDialogOpen && responseTargetDisputeId && (
        <DisputeResponseDialog
          open={true}
          onClose={() => {
            setResponseDialogOpen(false);
            setResponseTargetDisputeId(null);
            setResponseError(null);
          }}
          side="employer"
          subjectTitle={shift.title}
          onSubmit={(payload: DisputeResponsePayload) => {
            const targetId = responseTargetDisputeId;
            if (!targetId) return;
            setActionLoading(targetId);
            const result = appendDisputeResponse(targetId, 'employer', {
              authorUserId: shift.employerId,
              reason: payload.reason,
              evidenceDescription: payload.evidenceDescription,
              evidenceFileName: payload.evidenceFileName,
            });
            setActionLoading(null);
            if (result.ok) {
              showSuccess(
                t('dispute.response.feedback.success'),
                t('dispute.response.feedback.success.desc'),
              );
              setResponseDialogOpen(false);
              setResponseTargetDisputeId(null);
              setResponseError(null);
              return;
            }
            const message = toastFromStoreError(result.error);
            setResponseError(message);
            showError(message);
          }}
          loading={actionLoading === responseTargetDisputeId}
          errorMessage={responseError}
        />
      )}

      {/* CORE-STABILITY-7 Part 5.4 — late-arrival correction dialog.
          Captures a required reason before reverting NoShow → present. */}
      {revertAppId && (
        <Modal
          open={true}
          onClose={() => {
            setRevertAppId(null);
            setRevertReason('');
            setRevertError(null);
          }}
          title={t('attendance.revert.title')}
        >
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-gray-700">{t('attendance.revert.body')}</p>
            <Textarea
              label={t('attendance.revert.reasonLabel')}
              value={revertReason}
              onChange={(e) => {
                setRevertReason(e.target.value);
                if (revertError) setRevertError(null);
              }}
              rows={3}
              maxLength={500}
              placeholder={t('attendance.revert.reasonPlaceholder')}
            />
            {revertError && (
              <p role="alert" className="text-xs text-red-600">
                {revertError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRevertAppId(null);
                  setRevertReason('');
                  setRevertError(null);
                }}
              >
                {t('btn.cancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmRevert}
                loading={actionLoading === revertAppId}
              >
                {t('attendance.revert.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* P0-checkout-stuck — modal cảnh báo xác nhận hoàn thành THỦ CÔNG khi
          worker chưa check-out. Gọi RPC employer_confirm_completion (server). */}
      {manualCompleteAppId && (
        <Modal
          open={true}
          onClose={() => setManualCompleteAppId(null)}
          title={t('employer.manageShift.manual.modalTitle')}
        >
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              {t('employer.manageShift.manual.modalBody')}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setManualCompleteAppId(null)}>
                {t('btn.cancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={actionLoading === manualCompleteAppId}
                onClick={async () => {
                  const id = manualCompleteAppId;
                  const completed = await handleConfirmComplete(id);
                  if (completed) setManualCompleteAppId(null);
                }}
              >
                {t('employer.manageShift.manual.button')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ApplicationActionButtons({
  application,
  loading,
  canMarkAbsent,
  canMarkPresent,
  absentDisabledReason,
  canRevertToPresent,
  showRating,
  shiftStarted,
  onApprove,
  onReject,
  onMarkAbsent,
  onMarkPresent,
  onRevertToPresent,
  onApproveCancellation,
  onRejectCancellation,
}: {
  application: Application;
  loading: boolean;
  canMarkAbsent: boolean;
  canMarkPresent: boolean;
  /** CORE-STABILITY-7 Part 5.2 — when set, the "Đánh dấu vắng mặt"
   *  button is rendered disabled/dimmed with this reason (the worker
   *  already checked in). */
  absentDisabledReason: string | null;
  /** CORE-STABILITY-7 Part 5.4 — show the "đổi sang có mặt" late-
   *  arrival correction action on a NoShow row. */
  canRevertToPresent: boolean;
  showRating: boolean;
  /** Phase 10A-Fix-9 — true when the shift has started or is in a
   *  terminal state. Pending applicants in this case can no longer be
   *  approved or rejected; the row shows a neutral "đã hết hạn xử lý"
   *  badge instead of the action buttons. */
  shiftStarted: boolean;
  onApprove: () => void;
  onReject: () => void;
  onMarkAbsent: () => void;
  onMarkPresent: () => void;
  onRevertToPresent: () => void;
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
    if (shiftStarted) {
      // Phase 10A-Fix-9: shift has started or is in a terminal state.
      // Pending applicants can no longer be processed.
      return (
        <div className="flex flex-col gap-1">
          <Badge tone="neutral">{t('employer.manageShift.pendingExpired')}</Badge>
          <p className="text-xs text-gray-500">
            {t('employer.manageShift.pendingExpiredHint')}
          </p>
        </div>
      );
    }
    return (
      <>
        <Button size="md" variant="primary" onClick={onApprove} loading={loading}>
          {t('btn.approve')}
        </Button>
        <Button size="md" variant="ghost" onClick={onReject} loading={loading}>
          {t('btn.reject')}
        </Button>
      </>
    );
  }

  if (canMarkPresent || canMarkAbsent || absentDisabledReason) {
    // Phase 10C-Stab-1 Batch 2 D — pair the canonical
    // "Xác nhận có mặt" / "Đánh dấu vắng mặt" buttons.
    // Both are gated by their own predicate so the row only
    // renders the actions actually available right now.
    return (
      <>
        {canMarkPresent && (
          <Button
            size="md"
            variant="primary"
            onClick={onMarkPresent}
            loading={loading}
          >
            {t('lifecycle.btn.employerMarkPresent')}
          </Button>
        )}
        {canMarkAbsent && (
          <Button
            size="md"
            variant="danger"
            onClick={onMarkAbsent}
            loading={loading}
          >
            {t('lifecycle.btn.employerMarkAbsent')}
          </Button>
        )}
        {/* CORE-STABILITY-7 Part 5.2 — checked-in worker: the absent
            action is shown disabled/dimmed with an explanatory title. */}
        {!canMarkAbsent && absentDisabledReason && (
          <span className="inline-flex flex-col">
            <Button
              size="md"
              variant="danger"
              disabled
              title={absentDisabledReason}
              aria-label={absentDisabledReason}
            >
              {t('lifecycle.btn.employerMarkAbsent')}
            </Button>
            <span className="mt-0.5 max-w-[14rem] text-xs leading-tight text-gray-500">
              {absentDisabledReason}
            </span>
          </span>
        )}
      </>
    );
  }

  if (application.status === 'CheckedOut' && !showRating) {
    // Phase 10C — Confirm + Dispute live inside the new
    // `<EmployerConfirmationPanel/>` mounted below this row. The row
    // itself shows no inline action buttons in this state so the
    // panel can present the read-only evidence + countdown + actions
    // together.
    return null;
  }

  if (application.status === 'Disputed') {
    return (
      <span className="text-sm text-amber-700">
        {t('employer.manageShift.status.disputed')}
      </span>
    );
  }

  if (application.status === 'Confirmed') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {t('employer.manageShift.status.confirmed')}
      </span>
    );
  }

  if (application.status === 'NoShow') {
    return (
      <div className="flex flex-col items-end gap-1">
        {/* Production: cọc chỉ hoàn khi ca chốt, không có "boost" → nhãn
            khác bản demo để không khẳng định sai về tiền. */}
        <span className="text-right text-sm text-red-700">
          {t(
            isSupabaseEnv()
              ? 'employer.manageShift.status.noShowReal'
              : 'employer.manageShift.status.noShowLocal',
          )}
        </span>
        {/* CORE-STABILITY-7 Part 5.4 — late-arrival correction. */}
        {canRevertToPresent && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRevertToPresent}
            loading={loading}
          >
            {t('attendance.revert.button')}
          </Button>
        )}
      </div>
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
    case 'Expired':
      return 'neutral';
    case 'Disputed':
      return 'warning';
    default:
      return 'neutral';
  }
}
// ---------------------------------------------------------------------------
// Phase 10C-Stab-1 Batch 2 — append-only audit timeline rendering.
// ---------------------------------------------------------------------------

const TIMELINE_DATETIME = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function ShiftTimelineSection({
  timeline,
}: {
  timeline?: Shift['timeline'];
}) {
  if (!timeline || timeline.length === 0) return null;
  // Newest first so an employer auditing the lineage reads the most
  // recent event without scrolling.
  const ordered = [...timeline].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
  return (
    <section
      aria-labelledby="shift-timeline-title"
      className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-card"
    >
      <h2
        id="shift-timeline-title"
        className="text-sm font-semibold text-gray-900"
      >
        {t('shift.timeline.title')}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {ordered.map((entry) => {
          const when = (() => {
            const d = new Date(entry.occurredAt);
            if (Number.isNaN(d.getTime())) return entry.occurredAt;
            return TIMELINE_DATETIME.format(d);
          })();
          return (
            <li
              key={entry.id}
              className="flex flex-col gap-0.5 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700"
            >
              <span className="font-medium text-gray-900">
                {t(`shift.timeline.kind.${entry.kind}`)}
              </span>
              <span className="font-mono text-xs text-gray-500">{when}</span>
              <span className="leading-relaxed">{entry.note}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Phase 10C-Stab-1 Batch 3 C — display phase chip.
// ---------------------------------------------------------------------------

