'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asEmployer, asWorker } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { hasCapability } from '@/data/capabilities';
import { PaymentEvidenceCard } from '@/components/shift/PaymentEvidenceCard';
import { ApplicationActions } from '@/components/forms/ApplicationActions';
import { CancelApplicationDialog } from '@/components/forms/CancelApplicationDialog';
import { CheckoutDialog } from '@/components/forms/CheckoutDialog';
import {
  DisputeDialog,
  DisputeResponseDialog,
  type DisputePayload,
  type DisputeResponsePayload,
} from '@/components/forms';
import { EmployerFeedbackForm } from '@/components/forms/EmployerFeedbackForm';
import { EmployerProfileModal } from '@/components/user/EmployerProfileModal';
import { EmployerTrustPanel } from '@/components/user/EmployerTrustPanel';
import { Button } from '@/components/ui';
import { quotaUsage } from '@/domain/cancellationQuota';
import { canCheckIn, canCheckOut, isLateCheckout } from '@/domain/timeGates';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { t } from '@/i18n/vi';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import type { Shift, VerificationFlag } from '@/types';
import { getDataMode, isSupabaseEnv } from '@/data/supabaseClient';
import { VerificationGateNotice } from '@/components/verification/VerificationGateNotice';

interface Props {
  params: Promise<{ id: string }>;
}

// Outer page: resolves params and guards against missing shift
export default function ShiftDetailPage({ params }: Props) {
  const { id } = use(params);
  const shift = useShiftStore((s) => s.shifts.find((sh) => sh.id === id));
  const hydrated = useHydrationStore((s) => s.hydrated);
  // Wait for hydration before deciding the shift is missing. On a cold
  // load / refresh / deep-link the store is empty during the first
  // render; calling `notFound()` then would render a permanent 404.
  if (!shift) {
    if (!hydrated) return <ShiftDetailLoading />;
    return notFound();
  }
  return <ShiftDetailContent shift={shift} />;
}

function ShiftDetailLoading() {
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

// Inner component: receives a guaranteed non-null Shift
function ShiftDetailContent({ shift }: { shift: Shift }) {
  // Phase 10A-Fix-10: roll lifecycle (incl. expire stale Pending) on
  // mount so a worker arriving via a notification deep-link sees the
  // correct application status without needing a hard refresh.
  useLifecycleSync();
  const users = useUserStore((s) => s.users);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const applications = useApplicationStore((s) => s.applications);
  const applyAsync = useApplicationStore((s) => s.applyAsync);
  const cancelByWorker = useApplicationStore((s) => s.cancelByWorker);
  const withdrawAsync = useApplicationStore((s) => s.withdrawAsync);
  // Cluster 1 (Property 2, Req 2.4) — reuse the SAME check-in/check-out
  // actions the worker dashboard uses so a check-in notification deep-link
  // lands on a surface where the worker can act in place.
  // Attendance qua async wrapper (tự dispatch supabase→RPC / local→sync).
  const checkInAsync = useApplicationStore((s) => s.checkInAsync);
  const checkOutAsync = useApplicationStore((s) => s.checkOutAsync);
  const workerOpenDispute = useApplicationStore((s) => s.workerOpenDispute);
  // Phase 10C-Stab-1 Batch 2 — dispute tracking. We need the current
  // dispute (if any) to render the right status copy depending on
  // who initiated it.
  const disputes = useApplicationStore((s) => s.disputes);

  const [applyError, setApplyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  // Cluster 1 (Property 2, Req 2.4) — worker check-out dialog state, mirroring
  // the worker dashboard: check-out opens the evidence dialog rather than
  // firing instantly.
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [employerModalOpen, setEmployerModalOpen] = useState(false);
  // Phase 10C Wave 5 — worker-side dispute dialog state.
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  // Phase 10C-Stab-1 Batch 3 E — worker-side response affordance for
  // an employer-initiated dispute. Opens a slim follow-up dialog that
  // appends to the existing Dispute record (no duplicate row).
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const appendDisputeResponse = useApplicationStore(
    (s) => s.appendDisputeResponse,
  );

  // Phase 10C-Stab-1 Batch 4B — post-payment rating + absent dispute.
  const submitEmployerFeedback = useEmployerFeedbackStore((s) => s.submit);
  const allFeedback = useEmployerFeedbackStore((s) => s.feedback);
  const [ratingFormOpen, setRatingFormOpen] = useState(false);
  // Absent-dispute dialog state — distinct from the regular
  // worker-side dispute dialog so we can preset the category.
  const [absentDisputeDialogOpen, setAbsentDisputeDialogOpen] =
    useState(false);
  const [absentDisputeError, setAbsentDisputeError] = useState<string | null>(
    null,
  );

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

  // Phase 10C-Stab-1 Batch 4B — Worker's already-submitted feedback
  // for this shift (idempotency for the post-payment rating banner).
  const submittedFeedbackForApp = useMemo(() => {
    if (!worker || !myApp) return undefined;
    return allFeedback.find(
      (f) => f.applicationId === myApp.id && f.fromUserId === worker.id,
    );
  }, [allFeedback, worker, myApp]);

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

  async function handleApply() {
    if (!worker || loading) return;
    setLoading(true);
    setApplyError(null);
    const result = await applyAsync(shift.id, worker.id);
    setLoading(false);
    if (!result.ok) {
      // Phase 10C-Stab-1 Batch 2 F — when the apply was blocked by
      // a schedule conflict, name the conflicting shift in the
      // error so the worker doesn't have to hunt for it. We
      // re-derive the conflicting shift from the worker's active
      // applications using the same active-status set as the store.
      let message = toastFromStoreError(result.error);
      if (result.error === 'CONFLICT') {
        const ACTIVE = new Set([
          'Approved',
          'CancellationRequested',
          'CheckedIn',
          'CheckedOut',
        ]);
        const conflicting = applications
          .filter(
            (a) => a.workerId === worker.id && ACTIVE.has(a.status),
          )
          .map((a) => useShiftStore.getState().getById(a.shiftId))
          .find((s) => {
            if (!s) return false;
            // Same-date overlap (cheap check; the store already
            // ran the canonical predicate and returned CONFLICT).
            return s.date === shift.date;
          });
        if (conflicting) {
          message = t('apply.error.CONFLICT.detailed')
            .replace('{title}', conflicting.title)
            .replace('{date}', conflicting.date)
            .replace('{startTime}', conflicting.startTime)
            .replace('{endTime}', conflicting.endTime);
        }
      }
      setApplyError(message);
      showError(message);
      return;
    }
    showSuccess(
      t('feedback.apply.success'),
      t('feedback.apply.success.desc'),
    );
  }

  async function handleConfirmCancel(reason: string) {
    if (!myApp || loading) return;
    setLoading(true);
    setApplyError(null);

    if (getDataMode() === 'supabase') {
      const res = await withdrawAsync(myApp.id, reason);
      setLoading(false);
      if (!res.ok) {
        const message = toastFromStoreError(res.error);
        setApplyError(message);
        showError(message);
        return;
      }
      if (res.value === 'CancellationRequested') {
        showInfo(
          t('feedback.cancelRequest.success'),
          t('feedback.cancelRequest.success.desc'),
        );
      } else {
        showSuccess(t('feedback.cancel.success'));
      }
      setCancelDialogOpen(false);
      return;
    }

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

  // Cluster 1 (Property 2, Req 2.4) — check-in / check-out handlers reused
  // verbatim from the worker dashboard so a `ShiftStartingSoon` (or other
  // check-in-window) notification deep-link can be acted on in place.
  async function handleCheckIn() {
    if (!myApp || loading) return; // khóa double-click
    setLoading(true);
    // Wrapper tự dispatch: supabase → RPC + refetch server; local → sync cũ.
    const result = await checkInAsync(myApp.id);
    setLoading(false);
    if (result.ok) {
      showSuccess(t('feedback.checkIn.success'));
    } else {
      showError(toastFromStoreError(result.error));
    }
  }

  async function handleCheckoutSubmit(payload: {
    checklist?: boolean[];
    note?: string;
    evidenceFileName?: string;
  }) {
    if (!myApp || loading) return; // khóa double-click
    setLoading(true);
    const input = { applicationId: myApp.id, ...payload };
    // Wrapper tự dispatch: supabase → RPC + refetch; local → sync (giữ lỗi cấu trúc).
    const result = await checkOutAsync(input);
    setLoading(false);
    if (result.ok) {
      showSuccess(
        t('feedback.checkOut.success'),
        t('feedback.checkOut.success.desc'),
      );
      setCheckoutDialogOpen(false);
      setCheckoutError(null);
      return;
    }
    // Keep the dialog open so the worker can correct the evidence payload;
    // surface the typed store error inline and as a toast.
    const message = toastFromStoreError(result.error);
    setCheckoutError(message);
    showError(message);
  }

  const positionsLeft = shift.positionsTotal - shift.positionsFilled;

  // Cluster 1 (Property 2, Req 2.4) — gate the check-in/check-out CTA with
  // the SAME time-gate predicates the dashboard uses. `myApp` is already
  // scoped to the current authenticated worker, so a deep-link can never
  // expose the action to a different user or outside the allowed window.
  const nowIso = new Date().toISOString();
  // Gate thống nhất qua capability attendance (production = có RPC thật).
  const attendanceOn = hasCapability('attendance');
  const showCheckIn = attendanceOn && myApp ? canCheckIn(nowIso, myApp, shift) : false;
  const showCheckOut = attendanceOn && myApp ? canCheckOut(nowIso, myApp, shift) : false;
  const lateCheckout = showCheckOut && isLateCheckout(nowIso, shift);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/shifts"
        className="mb-4 -ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-sm font-medium text-orange-700 transition-colors hover:text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        ← {t('btn.back')}
      </Link>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 text-balance break-words text-2xl font-bold text-gray-900">
          {shift.title}
        </h1>
        <ShiftLifecycleBadge shift={shift} applications={applications} />
      </div>

      {/* QA-Fix-2 Phase 3 — old-notification reconciliation note. When
          the shift is in a terminal state (ended / cancelled /
          expired / completed) we tell the worker the linked
          notification refers to a finished shift, so an old approval
          deep-link doesn't read as an active job. Lifecycle sync has
          already run on mount, so the badge above reflects current
          state. */}
      {(shift.status === 'Expired' ||
        shift.status === 'Cancelled' ||
        shift.status === 'Completed') && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
        >
          {t('shifts.detail.oldNotificationNote')}
        </p>
      )}

      {/* Employer — clickable when we can resolve to an Employer record */}
      <p className="mt-1 text-sm text-gray-500">
        {t('shifts.detail.employer')}:{' '}
        {employer ? (
          <button
            type="button"
            onClick={() => setEmployerModalOpen(true)}
            className="font-medium text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
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
        <span className="min-w-0 break-words">{shift.location}</span>
      </div>

      {/* Payment status — cọc/ký quỹ chưa có backend ở supabase → ẩn (mục 4/5). */}
      {hasCapability('wallet') && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('shifts.detail.depositStatus')}:</span>
          <EscrowStatusBadge status={shift.escrowStatus} />
        </div>
      )}

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

      {/* Phase 10A-Fix-3 — workplace imagery card. Public-safe: only
          shows the mock filename / caption + workplace notes + on-site
          contact info. Never reveals private employer documents. */}
      <WorkplaceCard shift={shift} />

      {/* Phase 10C-Stab-1 Batch 2 — retroactive verification flag.
          Surfaces a banner on shift detail when the legacy employer
          hasn't completed verification yet. The flag is set during
          `shiftStore.hydrate(...)`; we do NOT auto-cancel — workers
          can still apply but should review the employer profile. */}
      {shift.requiresEmployerVerification && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {t('shift.requiresEmployerVerification.banner')}
        </div>
      )}

      {/* Phase 10A-Fix-7 — employer cancellation banner. When the
          employer cancelled this shift, every worker who lands on the
          detail page (often via a notification deep link) sees the
          reason + the protection note. The banner is public-safe:
          only the employer-supplied reason is shown. */}
      {shift.status === 'Cancelled' && shift.cancelledBy === 'employer' && (
        <Section title="Ca làm đã bị hủy">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p>
              <span className="font-semibold">Đã hủy bởi nhà tuyển dụng</span>
              {shift.cancelledAt && (
                <span className="ml-2 text-xs text-red-800/80">
                  ({formatDateVN(shift.cancelledAt.slice(0, 10))})
                </span>
              )}
            </p>
            {shift.employerCancellationReason && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Lý do:</span>{' '}
                {shift.employerCancellationReason}
              </p>
            )}
            {shift.employerCancelledAfterApproval && (
              <p className="mt-2 text-xs leading-relaxed text-red-800">
                Bạn không bị trừ điểm uy tín hoặc hạn mức hủy vì ca do nhà
                tuyển dụng hủy. Hệ thống đã tự động bảo vệ quyền lợi của
                bạn.
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Phase 10C — Worker-facing payment & evidence education.
          Mounted ABOVE the apply section so workers see what they
          need to prepare and the 12-hour payment release rules
          before deciding to apply. Read-only card — Wave 2 does not
          change checkout validation, escrow flows, or dispute UI. */}
      <PaymentEvidenceCard shift={shift} />

      {/* Apply section */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-card">
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

        {worker && !myApp && <VerificationGateNotice action="apply" />}

        {worker && (
          <ApplicationActions
            shiftId={shift.id}
            workerId={worker.id}
            applicationStatus={myApp?.status ?? null}
            workerVerifications={
              // PHASE_2_PLAN §4.4: supabase mode — verification chưa migrate và KHÔNG
              // phải security gate (RPC apply không enforce). Nới gate client để worker
              // ứng tuyển được. Local mode giữ nguyên. Không migrate verification ở Phase 2.
              getDataMode() === 'supabase'
                ? (['phone', 'id', 'student'] as VerificationFlag[])
                : worker.verifications
            }
            workerReputationScore={worker.reputationScore}
            shiftStatus={shift.status}
            onApply={handleApply}
            onRequestCancel={() => setCancelDialogOpen(true)}
            loading={loading}
            error={applyError}
          />
        )}

        {/* Cluster 1 (Property 2, Req 2.4) — check-in / check-out action.
            This is the deep-link target for check-in notifications
            (`ShiftStartingSoon`, ...). It renders ONLY for the worker who
            owns this application and ONLY while the same time gates the
            dashboard uses (`canCheckIn` / `canCheckOut`) allow it, so a
            notification link can't expose the action to the wrong user or
            outside the window. Wiring (actions, dialog, labels) is reused
            from the worker dashboard's UpcomingShiftCard. */}
        {worker && myApp && (showCheckIn || showCheckOut) && (
          <div className="mt-4 flex flex-col items-start gap-2 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {showCheckIn && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleCheckIn}
                  loading={loading}
                >
                  {t('btn.checkIn')}
                </Button>
              )}
              {showCheckOut && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setCheckoutError(null);
                    setCheckoutDialogOpen(true);
                  }}
                  loading={loading}
                >
                  {t(lateCheckout ? 'btn.checkOutLate' : 'btn.checkOut')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Phase 10C-Stab-1 Batch 4B — absent dispute banner.
            Renders when the worker has been marked absent / no-show
            so they have a clear path to file an `'AbsentDispute'`
            via the existing `<DisputeDialog side="worker">`.
            Distinct from the standard CheckedOut dispute path
            because the application is in a terminal-ish state
            and the category is preset. */}
        {worker && myApp?.status === 'NoShow' && (
          <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">
              {t('worker.absentDispute.banner.title')}
            </p>
            <p className="text-xs leading-relaxed text-red-900/80">
              {t('worker.absentDispute.banner.body')}
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setAbsentDisputeError(null);
                setAbsentDisputeDialogOpen(true);
              }}
              disabled={loading}
            >
              {t('worker.absentDispute.banner.button')}
            </Button>
          </div>
        )}

        {/* Phase 10C-Stab-1 Batch 4B — post-payment rating banner.
            Renders when wage has been released to the worker but the
            worker hasn't yet rated the employer. The form mounts
            inline below the banner; on submit it calls the existing
            `useEmployerFeedbackStore.submit` which clears
            `paidAwaitingRatingAt` and stamps `workerRatedEmployerAt`
            on the application atomically. */}
        {worker &&
          myApp &&
          myApp.paidAwaitingRatingAt &&
          !myApp.workerRatedEmployerAt &&
          !submittedFeedbackForApp && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              <p className="font-semibold">
                {t('worker.postPaymentRating.banner.title')}
              </p>
              <p className="text-xs leading-relaxed text-orange-900/80">
                {t('worker.postPaymentRating.banner.body')}
              </p>
              {!ratingFormOpen ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setRatingFormOpen(true)}
                >
                  {t('worker.postPaymentRating.banner.button')}
                </Button>
              ) : (
                <EmployerFeedbackForm
                  loading={loading}
                  onSubmit={(input) => {
                    if (!worker || !myApp) return;
                    setLoading(true);
                    const result = submitEmployerFeedback({
                      shiftId: shift.id,
                      applicationId: myApp.id,
                      fromUserId: worker.id,
                      toEmployerId: shift.employerId,
                      stars: input.stars,
                      comment: input.comment,
                      tags: input.tags,
                    });
                    setLoading(false);
                    if (result.ok) {
                      showSuccess(
                        t('feedback.dispute.success'),
                      );
                      setRatingFormOpen(false);
                    } else {
                      showError(toastFromStoreError(result.error));
                    }
                  }}
                />
              )}
            </div>
          )}

        {/* Phase 10C Wave 5 — worker dispute action. Visible after the
            worker has checked out and is waiting for employer
            confirmation. Once a dispute exists the application status
            flips to `'Disputed'` and the button is replaced by a
            read-only status line. */}
        {worker && myApp?.status === 'CheckedOut' && (
          <div className="mt-4 flex flex-col items-start gap-2 border-t border-gray-100 pt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDisputeError(null);
                setDisputeDialogOpen(true);
              }}
              disabled={loading}
            >
              {t('worker.dispute.openButton')}
            </Button>
          </div>
        )}
        {worker && myApp?.status === 'Disputed' && (() => {
          // Phase 10C-Stab-1 Batch 2 L — render the right dispute
          // status copy depending on who initiated it. The worker
          // shouldn't see "Bạn đã khiếu nại ca này" when the
          // employer is the one who filed.
          const ourDispute = disputes
            .filter((d) => d.applicationId === myApp.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          const initiatedByEmployer = ourDispute?.raisedBy === 'employer';
          return (
            <div className="mt-4 flex flex-col gap-3">
              <p
                role="status"
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
              >
                {initiatedByEmployer
                  ? t('worker.dispute.statusLine.byEmployer')
                  : t('worker.dispute.statusLine.byWorker')}
              </p>
              {/* Phase 10C-Stab-1 Batch 2 L — when the employer
                  initiated, surface their statement (category /
                  reason / evidence description / filename) so the
                  worker can read what they're being accused of. */}
              {initiatedByEmployer && ourDispute && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-900">
                  <p className="font-semibold">
                    {t('worker.dispute.employerStatement.title')}
                  </p>
                  <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-3">
                    <dt className="font-medium">
                      {t('worker.dispute.employerStatement.category')}:
                    </dt>
                    <dd>
                      {ourDispute.category
                        ? t(`dispute.category.${ourDispute.category}`)
                        : t('worker.dispute.employerStatement.empty')}
                    </dd>
                    <dt className="font-medium">
                      {t('worker.dispute.employerStatement.reason')}:
                    </dt>
                    <dd className="whitespace-pre-line">{ourDispute.reason}</dd>
                    <dt className="font-medium">
                      {t('worker.dispute.employerStatement.evidenceDescription')}:
                    </dt>
                    <dd className="whitespace-pre-line">
                      {ourDispute.evidenceDescription ||
                        t('worker.dispute.employerStatement.empty')}
                    </dd>
                    <dt className="font-medium">
                      {t('worker.dispute.employerStatement.evidenceFile')}:
                    </dt>
                    <dd className="break-all font-mono">
                      {ourDispute.evidenceFileName ||
                        t('worker.dispute.employerStatement.empty')}
                    </dd>
                  </dl>
                  {/* Phase 10C-Stab-1 Batch 3 E — wire the response
                      affordance to the new DisputeResponseDialog. The
                      dialog dispatches `appendDisputeResponse` so the
                      worker statement is appended to the existing
                      Dispute record (no duplicate). */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setResponseError(null);
                        setResponseDialogOpen(true);
                      }}
                    >
                      {t('worker.dispute.respondButton')}
                    </Button>
                  </div>
                  {/* Render any prior responses chronologically so
                      both sides can read the back-and-forth without
                      leaving the page. */}
                  {ourDispute.responses && ourDispute.responses.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2 border-t border-red-200 pt-2 text-[12px] text-red-900">
                      {[...ourDispute.responses]
                        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                        .map((r) => (
                          <li
                            key={r.id}
                            className="rounded-md border border-red-200 bg-white/70 px-2 py-1.5"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                              {r.side === 'worker'
                                ? 'Người lao động'
                                : 'Nhà tuyển dụng'}
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
                            <p className="mt-1 whitespace-pre-line">{r.reason}</p>
                            {r.evidenceDescription && (
                              <p className="mt-1 italic">
                                {r.evidenceDescription}
                              </p>
                            )}
                            {r.evidenceFileName && (
                              <p className="mt-1 break-all font-mono text-[11px]">
                                {r.evidenceFileName}
                              </p>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Phase 10C-Stab-1 Batch 3 E — worker response dialog. Opens
          when the worker clicks "Phản hồi khiếu nại" on an
          employer-initiated dispute. */}
      {worker && myApp?.status === 'Disputed' && (() => {
        const ourDispute = disputes
          .filter((d) => d.applicationId === myApp.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (!ourDispute) return null;
        return (
          <DisputeResponseDialog
            open={responseDialogOpen}
            onClose={() => {
              setResponseDialogOpen(false);
              setResponseError(null);
            }}
            side="worker"
            subjectTitle={shift.title}
            onSubmit={(payload: DisputeResponsePayload) => {
              if (!worker) return;
              setLoading(true);
              const result = appendDisputeResponse(ourDispute.id, 'worker', {
                authorUserId: worker.id,
                reason: payload.reason,
                evidenceDescription: payload.evidenceDescription,
                evidenceFileName: payload.evidenceFileName,
              });
              setLoading(false);
              if (result.ok) {
                showSuccess(
                  t('dispute.response.feedback.success'),
                  t('dispute.response.feedback.success.desc'),
                );
                setResponseDialogOpen(false);
                setResponseError(null);
                return;
              }
              const message = toastFromStoreError(result.error);
              setResponseError(message);
              showError(message);
            }}
            loading={loading}
            errorMessage={responseError}
          />
        );
      })()}

      {/* Phase 10C Wave 5 — worker dispute dialog. Mounts only when
          the worker has a checked-out application on this shift and
          opens the dispute action via the apply section. Re-uses the
          existing `<DisputeDialog/>` with `side="worker"`. */}
      {worker && myApp?.status === 'CheckedOut' && (
        <DisputeDialog
          open={disputeDialogOpen}
          onClose={() => {
            setDisputeDialogOpen(false);
            setDisputeError(null);
          }}
          side="worker"
          subjectTitle={shift.title}
          onSubmit={(payload: DisputePayload) => {
            if (!myApp) return;
            setLoading(true);
            const result = workerOpenDispute(myApp.id, {
              category: payload.category as
                | 'WrongAddress'
                | 'UnsafeWorksite'
                | 'EmployerNoShow'
                | 'ScopeChanged'
                | 'PaymentDispute'
                | 'Other',
              reason: payload.reason,
              evidenceDescription: payload.evidenceDescription,
              evidenceFileName: payload.evidenceFileName,
            });
            setLoading(false);
            if (result.ok) {
              showSuccess(
                t('feedback.dispute.success'),
                t('feedback.dispute.success.desc'),
              );
              setDisputeDialogOpen(false);
              setDisputeError(null);
              return;
            }
            const message = toastFromStoreError(result.error);
            setDisputeError(message);
            showError(message);
          }}
          loading={loading}
          errorMessage={disputeError}
        />
      )}

      {/* Phase 10C-Stab-1 Batch 4B — absent dispute dialog. Re-uses
          `<DisputeDialog/>` with the category preset to
          `'AbsentDispute'` so the worker only fills in reason and
          evidence. The store action accepts AbsentDispute only when
          the application is in `'NoShow'`. */}
      {worker && myApp?.status === 'NoShow' && (
        <DisputeDialog
          open={absentDisputeDialogOpen}
          onClose={() => {
            setAbsentDisputeDialogOpen(false);
            setAbsentDisputeError(null);
          }}
          side="worker"
          subjectTitle={shift.title}
          defaultCategory="AbsentDispute"
          onSubmit={(payload: DisputePayload) => {
            if (!myApp) return;
            setLoading(true);
            const result = workerOpenDispute(myApp.id, {
              category: 'AbsentDispute',
              reason: payload.reason,
              evidenceDescription: payload.evidenceDescription,
              evidenceFileName: payload.evidenceFileName,
            });
            setLoading(false);
            if (result.ok) {
              showSuccess(
                t('feedback.dispute.success'),
                t('feedback.dispute.success.desc'),
              );
              setAbsentDisputeDialogOpen(false);
              setAbsentDisputeError(null);
              return;
            }
            const message = toastFromStoreError(result.error);
            setAbsentDisputeError(message);
            showError(message);
          }}
          loading={loading}
          errorMessage={absentDisputeError}
        />
      )}

      {/* Cluster 1 (Property 2, Req 2.4) — worker check-out dialog. Mounted
          as a sibling of the cancel dialog and reusing the dashboard's
          <CheckoutDialog/> so the evidence payload flow is identical. Opens
          from the check-out CTA above; resolves the live application + shift
          so a background lifecycle update never leaves it stale. */}
      {worker && myApp && (
        <CheckoutDialog
          open={checkoutDialogOpen}
          onClose={() => {
            setCheckoutDialogOpen(false);
            setCheckoutError(null);
          }}
          application={myApp}
          shift={shift}
          onSubmit={handleCheckoutSubmit}
          loading={loading}
          errorMessage={checkoutError}
        />
      )}

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
          highlight ? 'text-orange-700' : 'text-gray-900',
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

// ---------------------------------------------------------------------------
// Phase 10A-Fix-3 — workplace imagery card (worker-facing)
// ---------------------------------------------------------------------------

function WorkplaceCard({ shift }: { shift: Shift }) {
  // Ảnh địa điểm là tên-tệp giả (chưa có upload thật). Ở supabase/production
  // KHÔNG hiển thị (kể cả dữ liệu cũ) để không coi chuỗi filename là ảnh thật.
  const hasImage =
    !isSupabaseEnv() &&
    typeof shift.workplaceImageLabel === 'string' &&
    shift.workplaceImageLabel.trim().length > 0;
  const hasNotes =
    typeof shift.workplaceNotes === 'string' &&
    shift.workplaceNotes.trim().length > 0;
  const hasContact =
    (typeof shift.onSiteContactName === 'string' &&
      shift.onSiteContactName.trim().length > 0) ||
    (typeof shift.onSiteContactPhone === 'string' &&
      shift.onSiteContactPhone.trim().length > 0);

  return (
    <Section title={t('shifts.detail.workplace.title')}>
      {/* Mock image placeholder — renders the filename + a generic
          icon so the worker sees something concrete without us hosting
          actual photos in the MVP. */}
      <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
        {hasImage ? (
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-orange-500 ring-1 ring-orange-200"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
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
            <div className="min-w-0">
              <p className="text-sm font-medium text-orange-900">
                {shift.workplaceImageLabel}
              </p>
              <p className="mt-0.5 text-[11px] italic text-orange-800/80">
                Ảnh mô phỏng — bản MVP không có upload thật.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            {t('shifts.detail.workplace.empty')}
          </p>
        )}

        {hasNotes && (
          <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-orange-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
              {t('shifts.detail.workplace.notes')}
            </p>
            <p className="mt-1 whitespace-pre-line text-xs text-gray-700">
              {shift.workplaceNotes}
            </p>
          </div>
        )}

        {hasContact && (
          <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-orange-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
              {t('shifts.detail.onSiteContact')}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700">
              {shift.onSiteContactName && (
                <span className="font-medium">{shift.onSiteContactName}</span>
              )}
              {shift.onSiteContactPhone && (
                <a
                  href={`tel:${shift.onSiteContactPhone}`}
                  className="font-medium text-orange-700 hover:underline"
                >
                  {shift.onSiteContactPhone}
                </a>
              )}
            </div>
          </div>
        )}

        {shift.requiresVerifiedDocumentOnArrival && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            {t('shifts.detail.requiresVerifiedDocument')}
          </p>
        )}
      </div>
    </Section>
  );
}
