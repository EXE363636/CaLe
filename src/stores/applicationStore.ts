/**
 * Application store — the heart of the shift lifecycle.
 *
 * Owns the `Application[]` list plus all transitions that touch worker
 * reputation, employer payouts, and shift positions. Mutators delegate to
 * pure domain modules:
 *  - `domain/conflict.ts` for time-overlap detection (Req 22)
 *  - `domain/reputation.ts` for score evolution and cancellation classes
 *  - `domain/escrow.ts` for the simulated payment lifecycle
 *  - `domain/deposit.ts` to snapshot the per-worker payout
 *
 * Cross-store side effects (notifications, position counters, employer
 * boost credits, ratings, disputes) are issued through the relevant
 * sibling stores so each piece of state has a single source of truth.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import {
  canCancelByQuota,
  quotaUsage,
  type QuotaUsage,
} from '@/domain/cancellationQuota';
import { hasConflict, type TimeRange } from '@/domain/conflict';
import { calculateDeposit, hoursBetween } from '@/domain/deposit';
import { transitionEscrow } from '@/domain/escrow';
import {
  validateCheckoutPayload,
  type CheckoutPayload,
  type EvidenceValidationFailure,
} from '@/domain/evidence';
import {
  applyReputationEvent,
  canApplyToShifts,
  classifyCancellation,
} from '@/domain/reputation';
import { hasScheduleConflict } from '@/domain/scheduleConflict';
import { applyRatingToSkillScores } from '@/domain/skillScore';
import { planExpirePendingApplications } from '@/domain/applicationExpiry';
import { requiresEmployerApprovalToCancel } from '@/domain/timeGates';
import { appendShiftTimelineEntry } from '@/domain/shiftTimeline';
import { newPrefixedId } from '@/lib/ids';
import { notifyAdmins } from '@/lib/adminNotifications';
import {
  EMPLOYER_DISPUTE_CATEGORIES,
  WORKER_DISPUTE_CATEGORIES,
  type EmployerDisputeCategory,
  type WorkerDisputeCategory,
} from '@/types';
import type {
  Application,
  ApplicationStatus,
  CancellationRecord,
  Dispute,
  DisputeResponse,
  Rating,
  Result,
  Worker,
} from '@/types';

import { useNotificationStore } from './notificationStore';
import { useScheduleStore } from './scheduleStore';
import { useShiftStore } from './shiftStore';
import { asWorker, useUserStore } from './userStore';
import { useWalletStore } from './walletStore';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ApplyError =
  | 'VERIFICATION_REQUIRED'
  | 'REPUTATION_TOO_LOW'
  | 'CONFLICT'
  | 'SCHEDULE_CONFLICT'
  | 'FULLY_BOOKED'
  | 'ALREADY_APPLIED'
  | 'SHIFT_NOT_FOUND'
  | 'WORKER_NOT_FOUND'
  | 'NOT_PUBLISHED';

export type ApplicationActionError =
  | 'APPLICATION_NOT_FOUND'
  | 'WRONG_STATUS'
  /**
   * Phase 10A-Fix-9: a Pending applicant cannot be approved after the
   * shift has started. The employer dashboard / shift detail surfaces
   * the corresponding "Đơn đã hết hạn xử lý" badge instead.
   */
  | 'SHIFT_ALREADY_STARTED';

/**
 * Phase 10C — `checkOut` payload. The application id discriminates
 * the target row; the optional fields drive the per-evidence-level
 * validation in `domain/evidence.validateCheckoutPayload`.
 */
export interface CheckoutInput {
  applicationId: string;
  checklist?: boolean[];
  note?: string;
  evidenceFileName?: string;
}

/**
 * Phase 10C — error union returned by the refactored `checkOut`.
 *
 * The `EVIDENCE_REQUIRED` variant is a structured object (not a bare
 * string) per Requirement 4.9 so callers can pattern-match the
 * `code` discriminator to render a precise Vietnamese message
 * without round-tripping through string equality.
 */
export type CheckOutError =
  | 'APPLICATION_NOT_FOUND'
  | 'WRONG_STATUS'
  | { code: 'EVIDENCE_REQUIRED'; reason: EvidenceValidationFailure };

/**
 * Phase 10C — payload for the structured employer dispute action.
 *
 * `category` must come from the employer-side enum
 * (`EmployerDisputeCategory`); the Wave 5 worker action will use the
 * mirror enum. Length bounds are enforced symmetrically by the
 * `<DisputeDialog/>` UX so the rejection paths below are reachable
 * only via direct store calls or race conditions.
 */
export interface ReportIssuePayload {
  applicationId: string;
  category: EmployerDisputeCategory;
  reason: string;
  /** ≤2000 characters; trimmed before persistence. */
  evidenceDescription?: string;
  /** ≤255 characters, no path separators. */
  evidenceFileName?: string;
}

/**
 * Phase 10C Wave 5 — payload for the worker-side dispute action. The
 * worker-side action takes the application id as a positional
 * argument (matching the design's `workerOpenDispute(applicationId,
 * payload)` shape) so the call site reads symmetrically with
 * `cancelByWorker(applicationId, reason)` and the rest of the
 * worker actions in this store.
 */
export interface WorkerOpenDisputePayload {
  category: WorkerDisputeCategory;
  reason: string;
  /** ≤2000 characters; trimmed before persistence. */
  evidenceDescription?: string;
  /** ≤255 characters, no path separators. */
  evidenceFileName?: string;
}

/**
 * Phase 10C — error union for `reportIssue`. `WRONG_STATUS` covers
 * both "application is not in a disputable state" and "application
 * is already `'Disputed'`" (Requirement 7.9 — no duplicate
 * disputes).
 */
export type ReportIssueError =
  | 'APPLICATION_NOT_FOUND'
  | 'WRONG_STATUS'
  | 'CATEGORY_REQUIRED'
  | 'CATEGORY_INVALID'
  | 'REASON_REQUIRED'
  | 'FIELD_TOO_LONG'
  /**
   * Phase 10C-Stab-1 Batch 4 D — worker tried to file a
   * `'PaymentDispute'` before the 1-hour pre-auto-release window.
   */
  | 'TOO_EARLY';

/** Payload for confirming a shift completion: 1–5 stars + optional feedback. */
export interface NewRating {
  stars: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
}

interface ApplicationStore {
  applications: Application[];
  ratings: Rating[];
  disputes: Dispute[];

  // Reads
  forShift(shiftId: string): Application[];
  forWorker(workerId: string): Application[];
  getById(id: string): Application | undefined;

  // Worker actions
  apply(shiftId: string, workerId: string): Result<Application, ApplyError>;
  /**
   * Worker-initiated cancellation flow (Phase 2 + Phase 3):
   *
   *  - `Pending` applications cancel immediately, no employer involvement.
   *  - `Approved` applications more than 3h before start cancel immediately
   *    and the employer is notified. Late-cancel reputation rule still
   *    applies if the cancel happens within 24h.
   *  - `Approved` applications within 3h of start enter
   *    `CancellationRequested` instead and notify the employer to approve
   *    or reject. The position remains held until the employer decides.
   *
   * The `reason` is required and stored on the application
   * (`cancellationReasonNote`) and forwarded to every notification.
   *
   * Phase 3 quota gate: every quota-countable branch (Pending immediate,
   * Approved immediate, Approved-needs-approval) is rejected with
   * `QUOTA_EXCEEDED` when the worker is out of weekly or monthly capacity.
   * No state change is made and no notification is fired in that case.
   *
   * Returns `value.requiresApproval = true` when a request was created.
   */
  cancelByWorker(
    applicationId: string,
    reason: string,
    nowIso?: string,
  ): Result<
    { application: Application; requiresApproval: boolean },
    | ApplicationActionError
    | 'REASON_REQUIRED'
    | 'SHIFT_NOT_FOUND'
    | 'QUOTA_EXCEEDED'
  >;
  /**
   * Read-only snapshot of a worker's current cancellation quota usage so
   * the UI can render "Bạn còn X/Y lượt huỷ" indicators. Pure derivation
   * over `Worker.cancellationHistory` — does not mutate any store.
   */
  getCancellationQuota(workerId: string, nowIso?: string): QuotaUsage | undefined;
  checkIn(applicationId: string): Result<Application, ApplicationActionError>;
  /**
   * Phase 10C — refactored to take a single payload object so the
   * worker `CheckoutDialog` can submit checklist booleans, an
   * optional or required handover note, and an optional or required
   * mock evidence filename in one call.
   *
   * Validation:
   *   - Resolves the linked `Shift` and reads `shift.evidenceRequirement`
   *     (defaults to `'None'` only for legacy seed shifts).
   *   - Calls `validateCheckoutPayload(requirement, payload)`.
   *   - On failure returns
   *     `{ ok: false, error: { code: 'EVIDENCE_REQUIRED', reason } }`
   *     and leaves the application untouched (no field writes,
   *     status / `checkOutAt` / evidence fields all remain at
   *     their pre-call values).
   *
   * On success persists `status: 'CheckedOut'`, `checkOutAt`,
   * `checkoutChecklist`, `workerCheckoutNote`, and
   * `workerEvidenceFileName` and drives the existing escrow + shift
   * status transitions (`'WorkerCheckOut'` event +
   * `'AwaitingConfirmation'` rollover when applicable).
   */
  checkOut(input: CheckoutInput): Result<Application, CheckOutError>;

  /**
   * Phase 10C-Stab-1 Batch 2 D — employer marks an Approved worker
   * as physically present without waiting for the worker's self-
   * check-in. Status flips to `'CheckedIn'` so the rest of the
   * lifecycle (check-out, escrow, etc.) proceeds normally.
   *
   * Returns `WRONG_STATUS` when the application is not `'Approved'`.
   * The wall-clock window is enforced by the UI via
   * `canEmployerMarkPresent`.
   */
  markPresentByEmployer(
    applicationId: string,
  ): Result<Application, ApplicationActionError>;

  // Employer actions
  approve(applicationId: string): Result<Application, ApplicationActionError>;
  /**
   * Phase 6: rejecting a Pending application requires a non-empty reason
   * which is stored on the application and included in the worker
   * notification body. Empty / whitespace input returns
   * `REASON_REQUIRED`.
   */
  reject(
    applicationId: string,
    reason: string,
  ): Result<Application, ApplicationActionError | 'REASON_REQUIRED'>;
  /**
   * Approve a worker's cancellation request (status `CancellationRequested`).
   * Application becomes `CancelledByWorker`, position is freed, the worker
   * is notified, and the late-cancel reputation rule is applied if the
   * decision falls within 24h of shift start.
   */
  approveCancellationRequest(
    applicationId: string,
  ): Result<Application, ApplicationActionError>;
  /**
   * Reject a worker's cancellation request. The application reverts to its
   * pre-request status (currently always `Approved`) and the worker is
   * notified.
   */
  rejectCancellationRequest(
    applicationId: string,
  ): Result<Application, ApplicationActionError>;
  confirmCompletion(
    applicationId: string,
    rating: NewRating,
  ): Result<Application, ApplicationActionError>;
  /**
   * Phase 10C — structured employer-side dispute action. Replaces
   * the pre-Phase-10C two-arg `(applicationId, reason)` shape with
   * a single payload object that also carries the new `category`,
   * `evidenceDescription`, and `evidenceFileName` fields per
   * Requirement 7.1.
   *
   * Validation order:
   *   1. Resolve application; reject `APPLICATION_NOT_FOUND` if
   *      missing.
   *   2. Reject `WRONG_STATUS` when the application is not in
   *      `'CheckedOut'` (only checked-out applications can be
   *      disputed in this phase) or is already `'Disputed'`.
   *   3. Reject `CATEGORY_REQUIRED` / `CATEGORY_INVALID` when the
   *      category is missing or out of the employer-side enum.
   *   4. Reject `REASON_REQUIRED` when the trimmed reason is empty.
   *   5. Reject `FIELD_TOO_LONG` when any string field exceeds its
   *      bound or `evidenceFileName` contains `/` or `\`.
   *
   * On success: appends a new `Dispute` (status `'Open'`, raisedBy
   * `'employer'`), flips the application's status to `'Disputed'`,
   * drives the existing `'EmployerReportIssue'` escrow event, and
   * fires worker + admin notifications.
   */
  reportIssue(
    payload: ReportIssuePayload,
  ): Result<Dispute, ReportIssueError>;
  /**
   * Phase 10C Wave 5 — worker-side structured dispute action.
   * Mirrors `reportIssue` but accepts a worker-side category and
   * sets `Dispute.raisedBy = 'worker'`. The application id is the
   * first positional argument so the call site reads
   * `workerOpenDispute(app.id, { category, reason, ... })`.
   *
   * Validation: same shape and rejection codes as `reportIssue`.
   * `CATEGORY_INVALID` fires when an employer-side category is
   * supplied to this worker-side action (Requirement 7.4 / 7.5).
   *
   * On success: appends a `Dispute` (status `'Open'`, raisedBy
   * `'worker'`), flips the application's status to `'Disputed'`,
   * drives the existing `'EmployerReportIssue'` escrow event so
   * the linked Shift's escrow becomes `'Disputed'`, and fires
   * employer + admin notifications.
   */
  workerOpenDispute(
    applicationId: string,
    payload: WorkerOpenDisputePayload,
  ): Result<Dispute, ReportIssueError>;
  /**
   * Phase 10C-Stab-1 Batch 3 E — append a follow-up response to an
   * existing dispute. Either side can respond; an employer-filed
   * dispute receives worker responses and vice versa. Does NOT
   * create a new dispute record — `disputes.length` stays unchanged
   * after this call.
   *
   * Validation:
   *   - Resolves the dispute; rejects `'WRONG_STATUS'` when the
   *     dispute is in a terminal status
   *     (`'ResolvedReleased' | 'ResolvedRefunded' | 'PartialRelease'
   *     | 'ClosedInvalid'`).
   *   - Trimmed `reason` must be non-empty (`'REASON_REQUIRED'`).
   *   - `reason ≤ 1000`, `evidenceDescription ≤ 2000`,
   *     `evidenceFileName ≤ 255` and may not contain `/` or `\`
   *     (else `'FIELD_TOO_LONG'`).
   *
   * On success: persists the response onto `dispute.responses`,
   * notifies the OTHER side and admins.
   */
  appendDisputeResponse(
    disputeId: string,
    side: 'employer' | 'worker',
    payload: {
      authorUserId: string;
      reason: string;
      evidenceDescription?: string;
      evidenceFileName?: string;
    },
  ): Result<
    DisputeResponse,
    'NOT_FOUND' | 'WRONG_STATUS' | 'REASON_REQUIRED' | 'FIELD_TOO_LONG'
  >;
  markNoShow(applicationId: string): Result<Application, ApplicationActionError>;

  /**
   * Phase 10A-Fix-10 — find every `Pending` application whose shift
   * has already started (or is otherwise no longer recruitable) and
   * flip it to `'Expired'`. Idempotent — repeated calls produce no
   * further state changes and emit no duplicate notifications because
   * we filter on `status === 'Pending'` before touching anything.
   *
   * Returns the list of application IDs that changed in this pass so
   * callers (or tests) can assert the run was a no-op vs. did work.
   */
  expirePendingApplicationsForStartedShifts(nowIso?: string): {
    expiredIds: string[];
  };

  /**
   * Phase 10C-Stabilization-1 B — canonical single-call lifecycle
   * sync. Fans out to:
   *
   *   1. `useShiftStore.syncLifecycle()` — rolls shift statuses
   *      (Published → InProgress / Expired, etc.).
   *   2. `expirePendingApplicationsForStartedShifts()` — flips
   *      stale Pending applications to Expired.
   *   3. Emits idempotent `ShiftStarted` / `ShiftEnded` notification
   *      pairs for newly-active / newly-ended shifts. Applications
   *      carry `shiftStartedNotifiedAt` / `shiftEndedNotifiedAt`
   *      markers so re-running the sync produces no duplicates.
   *   4. `autoReleaseEligibleApplications()` — the 12 h auto-release
   *      pass, gated by the per-application `autoReleased` audit
   *      marker.
   *
   * This is the canonical entry point that `useLifecycleSync` and
   * `AppHydrator` should call. Pure orchestration over existing
   * actions — no new state shape, no timers, no polling.
   */
  runLifecycleSync(nowIso?: string): {
    changedShiftIds: string[];
    expiredApplicationIds: string[];
    notifiedStartIds: string[];
    notifiedEndIds: string[];
    releasedIds: string[];
  };

  /**
   * Phase 10C Wave 5B — idempotent 12-hour auto-release pass.
   *
   * Walks the application list and, for every record that:
   *   - has `status === 'CheckedOut'`,
   *   - has `autoReleased !== true` (audit marker — not yet
   *     auto-released in a previous pass),
   *   - carries a non-empty `autoReleaseAt` ISO string whose
   *     deadline is `≤ nowIso ?? new Date().toISOString()`, AND
   *   - has NO associated dispute in a non-terminal status,
   *
   * runs the equivalent of `confirmCompletion(id, { stars: 5 })`
   * to drive the existing escrow `'EmployerConfirm'` event,
   * reputation bump, skill score update, rating creation, and
   * shift-Completed rollover. Then sets `autoReleased = true` on
   * the application as the audit marker.
   *
   * Each per-record block is wrapped in `try { ... } catch { ... }`
   * so one malformed record never blocks the rest of the pass
   * (Requirement 6.10). The persistence step writes only the
   * records that actually flipped, identified by the returned
   * `releasedIds`.
   *
   * MUST NOT be called from any code path other than
   * `useLifecycleSync` and `AppHydrator` (Requirement 6.9). MUST
   * NOT use `setTimeout`, `setInterval`, polling, or any external
   * API (Requirement 6.8).
   *
   * Returns the application IDs that were auto-released in this
   * pass. A second invocation against the same state returns an
   * empty list (idempotent).
   */
  autoReleaseEligibleApplications(nowIso?: string): {
    releasedIds: string[];
  };

  // Hydration
  hydrateApplications(applications: Application[]): void;
  hydrateRatings(ratings: Rating[]): void;
  hydrateDisputes(disputes: Dispute[]): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

function persistApplications(applications: Application[]): void {
  write(STORAGE_KEYS.applications, applications);
}

function persistRatings(ratings: Rating[]): void {
  write(STORAGE_KEYS.ratings, ratings);
}

function persistDisputes(disputes: Dispute[]): void {
  write(STORAGE_KEYS.disputes, disputes);
}

/**
 * Phase 10C-Stab-1 Batch 4B — append a single timeline entry to the
 * shift identified by `shiftId` and persist. Idempotent at the
 * caller level: callers must guard duplicate emissions with the
 * relevant idempotency stamp on the application / shift before
 * invoking this. The helper itself does NOT dedupe.
 */
function appendTimelineToShift(
  shiftId: string,
  kind: import('@/types').ShiftTimelineEntry['kind'],
  note: string,
): void {
  const shiftStore = useShiftStore.getState();
  const shift = shiftStore.getById(shiftId);
  if (!shift) return;
  const nextTimeline = appendShiftTimelineEntry(shift.timeline, {
    kind,
    note,
  });
  const nextShifts = shiftStore.shifts.map((s) =>
    s.id === shiftId ? { ...s, timeline: nextTimeline } : s,
  );
  shiftStore.hydrate(nextShifts);
  write(STORAGE_KEYS.shifts, nextShifts);
}

function shiftToTimeRange(shiftId: string): TimeRange | undefined {
  const shift = useShiftStore.getState().getById(shiftId);
  if (!shift) return undefined;
  return { date: shift.date, startTime: shift.startTime, endTime: shift.endTime };
}

/**
 * Phase 10C-Stab-1 F — application statuses that count as "currently
 * holding the worker's calendar." Filtering on this set ALONE was the
 * pre-Stab-1 bug: a `Confirmed` shift in the past was blocking new
 * applications even though the worker was no longer occupied. The
 * fix pairs this set with a `now < shift.endTime + grace` check in
 * `approvedRangesForWorker` below so terminal-but-past shifts drop
 * out of the conflict pool.
 *
 * Statuses listed:
 *   - `'Approved'`             — worker hasn't started yet, must show up.
 *   - `'CheckedIn'`            — worker is mid-shift.
 *   - `'CheckedOut'`           — worker is past their commitment but
 *                                the shift end + grace might still
 *                                overlap a new commitment, so we keep
 *                                them in the pool until end+grace.
 *   - `'CancellationRequested'` — held in limbo while the employer
 *                                decides; safer to treat as a real
 *                                commitment until resolved.
 *
 * Notably absent:
 *   - `'Confirmed'`            — past shifts must NEVER block future
 *                                applications. The escrow-released
 *                                state is the explicit "we're done"
 *                                marker.
 *   - `'Disputed'`             — payment is held but the worker is
 *                                no longer expected to be on-site.
 */
const ACTIVE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'Approved',
  'CancellationRequested',
  'CheckedIn',
  'CheckedOut',
]);

/**
 * Phase 10C-Stab-1 F — conflict candidates for `workerId`. Filters on
 * BOTH `ACTIVE_STATUSES` AND a "shift end + 60min grace is in the
 * future" check so a checked-out worker's past shift doesn't keep
 * blocking new applications. The 60-minute tail mirrors
 * `CHECK_OUT_GRACE_MINUTES` so the conflict window stays consistent
 * with the lifecycle sync.
 */
function approvedRangesForWorker(
  workerId: string,
  applications: Application[],
  nowIso: string,
): TimeRange[] {
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(nowMs)) return [];
  const graceMs = 60 * 60 * 1000;

  return applications
    .filter((a) => a.workerId === workerId && ACTIVE_STATUSES.has(a.status))
    .map((a) => {
      const range = shiftToTimeRange(a.shiftId);
      if (!range) return undefined;
      // Drop shifts whose end + grace has already passed.
      const endMs = new Date(`${range.date}T${range.endTime}:00`).getTime();
      if (!Number.isFinite(endMs)) return range;
      if (endMs + graceMs < nowMs) return undefined;
      return range;
    })
    .filter((r): r is TimeRange => r !== undefined);
}

function patchWorkerScore(workerId: string, mutator: (worker: Worker) => Partial<Worker>): void {
  const userStore = useUserStore.getState();
  const worker = asWorker(userStore.findById(workerId));
  if (!worker) return;
  userStore.updateUser(worker.id, mutator(worker));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],
  ratings: [],
  disputes: [],

  forShift(shiftId) {
    return get().applications.filter((a) => a.shiftId === shiftId);
  },

  forWorker(workerId) {
    return get().applications.filter((a) => a.workerId === workerId);
  },

  getById(id) {
    return get().applications.find((a) => a.id === id);
  },

  // -------------------------------------------------------------------------
  // Worker actions
  // -------------------------------------------------------------------------

  apply(shiftId, workerId) {
    const shift = useShiftStore.getState().getById(shiftId);
    if (!shift) return { ok: false, error: 'SHIFT_NOT_FOUND' };
    if (shift.status !== 'Published') return { ok: false, error: 'NOT_PUBLISHED' };
    if (shift.positionsFilled >= shift.positionsTotal) {
      return { ok: false, error: 'FULLY_BOOKED' };
    }

    const worker = asWorker(useUserStore.getState().findById(workerId));
    if (!worker) return { ok: false, error: 'WORKER_NOT_FOUND' };
    if (!worker.verifications.includes('phone')) {
      return { ok: false, error: 'VERIFICATION_REQUIRED' };
    }
    if (!canApplyToShifts(worker.reputationScore)) {
      return { ok: false, error: 'REPUTATION_TOO_LOW' };
    }

    const all = get().applications;
    const duplicate = all.some(
      (a) =>
        a.shiftId === shiftId &&
        a.workerId === workerId &&
        a.status !== 'Rejected' &&
        a.status !== 'CancelledByWorker',
    );
    if (duplicate) return { ok: false, error: 'ALREADY_APPLIED' };

    const target = shiftToTimeRange(shiftId);
    if (target && hasConflict(target, approvedRangesForWorker(workerId, all, nowIso()))) {
      return { ok: false, error: 'CONFLICT' };
    }

    // Phase 5: also block when the shift overlaps any of the worker's
    // personal busy blocks on the same date. The schedule store hosts the
    // raw blocks; the pure helper does the math. No buffer is applied —
    // the worker controls their own calendar exactly.
    if (target) {
      const blocks = useScheduleStore.getState().forUser(workerId);
      if (hasScheduleConflict(target, blocks)) {
        return { ok: false, error: 'SCHEDULE_CONFLICT' };
      }
    }

    const application: Application = {
      id: newPrefixedId('app'),
      shiftId,
      workerId,
      status: 'Pending',
      appliedAt: nowIso(),
    };

    const next = [...all, application];
    set({ applications: next });
    persistApplications(next);

    // Notify employer (Req 18.2)
    useNotificationStore.getState().push({
      userId: shift.employerId,
      kind: 'ApplicationReceived',
      title: 'Có đơn ứng tuyển mới',
      body: `${worker.fullName} vừa ứng tuyển ca "${shift.title}".`,
      link: `/employer/shifts/${shift.id}`,
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    appendTimelineToShift(
      shift.id,
      'WorkerApplied',
      `${worker.fullName} đã ứng tuyển.`,
    );

    return { ok: true, value: application };
  },

  cancelByWorker(applicationId, reason, when) {
    const trimmedReason = (reason ?? '').trim();
    if (trimmedReason === '') return { ok: false, error: 'REASON_REQUIRED' };

    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Pending' && app.status !== 'Approved') {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const cancelledAt = when ?? nowIso();
    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'SHIFT_NOT_FOUND' };

    const worker = asWorker(useUserStore.getState().findById(app.workerId));
    const workerName = worker?.fullName ?? 'Người làm';

    // Phase 3: quota gate. Block before any state change so a quota miss
    // does not produce a partial cancellation. The same gate applies to
    // every branch below — Pending immediate, Approved immediate, and
    // Approved-needs-approval — because a successful approval will spend
    // quota whether the worker takes the immediate or the request path.
    if (worker) {
      const usage = quotaUsage(
        worker.cancellationHistory,
        worker.reputationScore,
        cancelledAt,
      );
      if (!canCancelByQuota(usage)) {
        return { ok: false, error: 'QUOTA_EXCEEDED' };
      }
    }

    // ---------------------------------------------------------------------
    // Branch 1: shift starts within 3h AND application is Approved.
    // The cancellation needs employer approval — do NOT release the
    // position, do NOT apply the reputation hit yet, just notify.
    // ---------------------------------------------------------------------
    const needsApproval =
      app.status === 'Approved' && requiresEmployerApprovalToCancel(cancelledAt, shift);

    if (needsApproval) {
      const requested: Application = {
        ...app,
        status: 'CancellationRequested',
        cancellationRequestedAt: cancelledAt,
        cancellationReasonNote: trimmedReason,
        preCancellationStatus: 'Approved',
      };
      const next = get().applications.map((a) =>
        a.id === applicationId ? requested : a,
      );
      set({ applications: next });
      persistApplications(next);

      useNotificationStore.getState().push({
        userId: shift.employerId,
        kind: 'CancellationRequested',
        title: 'Người làm yêu cầu huỷ ca',
        body:
          `${workerName} yêu cầu huỷ đơn ứng tuyển ca "${shift.title}" ` +
          `(ca bắt đầu trong vòng 3 giờ, cần bạn duyệt). Lý do: ${trimmedReason}`,
        link: `/employer/shifts/${shift.id}`,
      });

      return { ok: true, value: { application: requested, requiresApproval: true } };
    }

    // ---------------------------------------------------------------------
    // Branch 2: immediate cancellation. Pending → no penalty, no employer
    // notification. Approved + >3h → cancel now, free position, fire
    // late-cancel reputation hit if within 24h, notify employer.
    // ---------------------------------------------------------------------
    const cls = classifyCancellation(
      app.status,
      `${shift.date}T${shift.startTime}:00`,
      cancelledAt,
    );

    const cancelReason: CancellationRecord['type'] | undefined =
      cls === 'NoPenalty' ? undefined : (cls as CancellationRecord['type']);

    const updated: Application = {
      ...app,
      status: 'CancelledByWorker',
      cancelledAt,
      cancelReason,
      cancellationReasonNote: trimmedReason,
    };

    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    if (app.status === 'Approved') {
      useShiftStore.getState().incrementFilled(app.shiftId, -1);
    }

    // Phase 3: every immediate cancel produces a `CancellationRecord` so
    // the rolling 7-/30-day quota math has something to count. The record
    // type carries the late-cancel/on-time semantics so the worker profile
    // timeline still distinguishes them. Reputation is only docked for
    // late cancels.
    const recordType: CancellationRecord['type'] =
      cls === 'LateCancel' ? 'LateCancel' : 'OnTime';
    patchWorkerScore(app.workerId, (w) => {
      const newScore =
        cls === 'LateCancel'
          ? applyReputationEvent(w.reputationScore, { kind: 'LateCancel' })
          : w.reputationScore;
      const record: CancellationRecord = {
        id: newPrefixedId('cancel'),
        shiftId: app.shiftId,
        cancelledAt,
        type: recordType,
        reasonNote: trimmedReason,
      };
      return {
        reputationScore: newScore,
        cancellationHistory: [...w.cancellationHistory, record],
      };
    });

    if (app.status === 'Approved') {
      const isLate = cls === 'LateCancel';
      useNotificationStore.getState().push({
        userId: shift.employerId,
        kind: isLate ? 'LateCancel' : 'WorkerCancelled',
        title: isLate ? 'Người làm huỷ muộn' : 'Người làm đã huỷ',
        body:
          `${workerName} đã huỷ đơn ứng tuyển ca "${shift.title}".` +
          (isLate ? ' (Trong vòng 24h trước giờ bắt đầu.)' : '') +
          ` Lý do: ${trimmedReason}`,
        link: `/employer/shifts/${shift.id}`,
      });
    }

    return { ok: true, value: { application: updated, requiresApproval: false } };
  },

  getCancellationQuota(workerId, when) {
    const worker = asWorker(useUserStore.getState().findById(workerId));
    if (!worker) return undefined;
    return quotaUsage(
      worker.cancellationHistory,
      worker.reputationScore,
      when ?? nowIso(),
    );
  },

  checkIn(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Approved') return { ok: false, error: 'WRONG_STATUS' };

    const updated: Application = { ...app, status: 'CheckedIn', checkInAt: nowIso() };
    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    // Drive escrow: Deposited -> InProgress (Req 10.4).
    const shift = useShiftStore.getState().getById(app.shiftId);
    if (shift && shift.escrowStatus === 'Deposited') {
      useShiftStore.getState().setStatus(shift.id, 'InProgress');
      // The shift store doesn't directly expose escrow mutation; cheat via a status-only
      // patch and trust the central transition function elsewhere. For this MVP we
      // mirror the escrow transition by writing the shift list directly.
      const shifts = useShiftStore.getState().shifts.map((s) =>
        s.id === shift.id
          ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'WorkerCheckIn') }
          : s,
      );
      useShiftStore.getState().hydrate(shifts);
      write(STORAGE_KEYS.shifts, shifts);
    }

    // Phase 10C-Stab-1 Batch 2 E.2 — notify the employer that the
    // worker has self-checked-in.
    if (shift) {
      const worker = asWorker(useUserStore.getState().findById(app.workerId));
      const workerName = worker?.fullName ?? 'Người làm';
      useNotificationStore.getState().push({
        userId: shift.employerId,
        kind: 'WorkerCheckedIn',
        title: 'Người làm đã check-in',
        body: `${workerName} đã check-in cho ca "${shift.title}".`,
        link: `/employer/shifts/${shift.id}`,
      });

      // Phase 10C-Stab-1 Batch 4B — timeline emission.
      appendTimelineToShift(
        shift.id,
        'WorkerCheckedIn',
        `${workerName} đã check-in.`,
      );
    }

    return { ok: true, value: updated };
  },

  /**
   * Phase 10C-Stab-1 Batch 2 D — employer marks the worker as
   * physically present. Independent from the worker self-checking-in;
   * either side moves the application status to `'CheckedIn'`. The
   * worker is notified.
   *
   * Phase 10C-Stab-1 Batch 3 D — extended to accept already-
   * CheckedIn applications (worker self-checked-in but employer
   * had not yet confirmed). Once `markedPresentAt` is stamped the
   * action becomes idempotent: a second call returns
   * `WRONG_STATUS`.
   *
   * Validation:
   *   - Application must exist and currently be `'Approved'` OR
   *     `'CheckedIn'`.
   *   - `markedPresentAt` must NOT already be set (idempotency).
   *   - The time window is enforced by the UI via
   *     `canEmployerMarkPresent`; this store action accepts any
   *     `'Approved'` or unmarked `'CheckedIn'` application so the
   *     wall-clock check stays in one place.
   *
   * On success: flips `status` to `'CheckedIn'` (no-op when
   * already CheckedIn), sets `markedPresentAt` +
   * `markedPresentByEmployerId`, drives the same escrow
   * transition as worker self-check-in, fires a
   * `'EmployerMarkedPresent'` notification to the worker.
   */
  markPresentByEmployer(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Approved' && app.status !== 'CheckedIn') {
      return { ok: false, error: 'WRONG_STATUS' };
    }
    if (app.markedPresentAt) return { ok: false, error: 'WRONG_STATUS' };

    const ts = nowIso();
    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const updated: Application = {
      ...app,
      status: 'CheckedIn',
      checkInAt: app.checkInAt ?? ts,
      markedPresentAt: ts,
      markedPresentByEmployerId: shift.employerId,
    };
    const next = get().applications.map((a) =>
      a.id === applicationId ? updated : a,
    );
    set({ applications: next });
    persistApplications(next);

    // Mirror the escrow transition that worker self-check-in does.
    if (shift.escrowStatus === 'Deposited') {
      useShiftStore.getState().setStatus(shift.id, 'InProgress');
      const shifts = useShiftStore.getState().shifts.map((s) =>
        s.id === shift.id
          ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'WorkerCheckIn') }
          : s,
      );
      useShiftStore.getState().hydrate(shifts);
      write(STORAGE_KEYS.shifts, shifts);
    }

    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'EmployerMarkedPresent',
      title: 'Nhà tuyển dụng đã xác nhận có mặt',
      body: `Nhà tuyển dụng đã xác nhận bạn có mặt cho ca "${shift.title}".`,
      link: `/shifts/${shift.id}`,
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    {
      const worker = asWorker(useUserStore.getState().findById(app.workerId));
      const workerName = worker?.fullName ?? 'Người làm';
      appendTimelineToShift(
        shift.id,
        'EmployerMarkedPresent',
        `Nhà tuyển dụng xác nhận ${workerName} có mặt.`,
      );
    }

    return { ok: true, value: updated };
  },

  checkOut(input) {
    // Phase 10C — refactored signature. `input.applicationId` is the
    // discriminator; the rest of the payload is validated against the
    // shift's evidence requirement before any state change.
    const app = get().getById(input.applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'CheckedIn') return { ok: false, error: 'WRONG_STATUS' };

    // Resolve the linked shift first so the evidence validator gets
    // the correct level. Legacy shifts that pre-date Phase 10C fall
    // back to `'None'` (the most permissive level) so existing seed
    // data continues to check out cleanly.
    const shift = useShiftStore.getState().getById(app.shiftId);
    const requirement = shift?.evidenceRequirement ?? 'None';

    const payload: CheckoutPayload = {
      checklist: input.checklist,
      note: input.note,
      evidenceFileName: input.evidenceFileName,
    };
    const validation = validateCheckoutPayload(requirement, payload);
    if (!validation.ok) {
      // EVIDENCE_REQUIRED contract — leave the application strictly
      // unchanged (no writes to status, checkOutAt, evidence fields,
      // or autoReleaseAt). Caller receives the typed reason so the
      // dialog can render a precise Vietnamese message.
      return {
        ok: false,
        error: { code: 'EVIDENCE_REQUIRED', reason: validation.reason },
      };
    }

    const checkOutAt = nowIso();
    // Phase 10C — pre-compute the auto-release deadline as
    // `checkOutAt + 12h`. Wave 4 only persists the field so the
    // employer countdown component can render it; the actual
    // auto-release lifecycle (idempotent flip to Confirmed) ships
    // in Wave 7 with `autoReleaseEligibleApplications`.
    const autoReleaseAt = new Date(
      Date.parse(checkOutAt) + 12 * 60 * 60 * 1000,
    ).toISOString();
    const updated: Application = {
      ...app,
      status: 'CheckedOut',
      checkOutAt,
      autoReleaseAt,
      checkoutChecklist: payload.checklist ?? [],
      workerCheckoutNote: (payload.note ?? '').trim(),
      workerEvidenceFileName: payload.evidenceFileName ?? '',
    };
    const next = get().applications.map((a) =>
      a.id === input.applicationId ? updated : a,
    );
    set({ applications: next });
    persistApplications(next);

    if (shift) {
      const others = get().applications.filter((a) => a.shiftId === shift.id && a.id !== app.id);
      const allDone = others.every(
        (o) => o.status === 'CheckedOut' || o.status === 'Confirmed' || o.status === 'NoShow',
      );
      if (allDone) {
        useShiftStore.getState().setStatus(shift.id, 'AwaitingConfirmation');
      }
      const shifts = useShiftStore.getState().shifts.map((s) =>
        s.id === shift.id
          ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'WorkerCheckOut') }
          : s,
      );
      useShiftStore.getState().hydrate(shifts);
      write(STORAGE_KEYS.shifts, shifts);

      // Phase 10C-Stab-1 Batch 2 E.5 — notify the employer that the
      // worker checked out, with the 12-hour confirm-or-dispute
      // reminder.
      const worker = asWorker(useUserStore.getState().findById(app.workerId));
      const workerName = worker?.fullName ?? 'Người làm';
      useNotificationStore.getState().push({
        userId: shift.employerId,
        kind: 'WorkerCheckedOut',
        title: 'Người làm đã check-out',
        body: `${workerName} đã check-out cho ca "${shift.title}". Vui lòng xác nhận hoặc khiếu nại trong 12 giờ.`,
        link: `/employer/shifts/${shift.id}`,
      });

      // Phase 10C-Stab-1 Batch 4B — timeline emission.
      appendTimelineToShift(
        shift.id,
        'WorkerCheckedOut',
        `${workerName} đã check-out.`,
      );
    }

    return { ok: true, value: updated };
  },

  // -------------------------------------------------------------------------
  // Employer actions
  // -------------------------------------------------------------------------

  approve(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Pending') return { ok: false, error: 'WRONG_STATUS' };

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (shift.positionsFilled >= shift.positionsTotal) {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    // Phase 10A-Fix-9: a pending applicant must never be approved after
    // the shift has already started. The shift store may still be in
    // `'Published'` if the lifecycle sync hasn't promoted it yet, so
    // we authoritatively check the start datetime here.
    // Phase 10A-Fix-10: also expire the application inline so callers
    // who hit this gate don't leave a stale Pending record behind.
    const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
    if (Number.isFinite(startMs) && startMs <= Date.now()) {
      get().expirePendingApplicationsForStartedShifts();
      return { ok: false, error: 'SHIFT_ALREADY_STARTED' };
    }
    // Belt-and-braces: terminal / mid-flight statuses block approval too.
    if (
      shift.status === 'InProgress' ||
      shift.status === 'AwaitingConfirmation' ||
      shift.status === 'Completed' ||
      shift.status === 'Cancelled' ||
      shift.status === 'Expired'
    ) {
      get().expirePendingApplicationsForStartedShifts();
      return { ok: false, error: 'SHIFT_ALREADY_STARTED' };
    }

    const hours = hoursBetween(shift.startTime, shift.endTime);
    const payoutAmount = calculateDeposit(shift.hourlyWage, hours, 1);

    const updated: Application = {
      ...app,
      status: 'Approved',
      approvedAt: nowIso(),
      payoutAmount,
    };

    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    useShiftStore.getState().incrementFilled(shift.id, 1);

    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'ApplicationApproved',
      title: 'Đơn ứng tuyển đã được duyệt',
      body: `Bạn đã được nhận vào ca "${shift.title}".`,
      // Phase 9L — link to the specific shift detail so the worker can
      // immediately review what they were approved for.
      link: `/shifts/${shift.id}`,
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    {
      const worker = asWorker(useUserStore.getState().findById(app.workerId));
      const workerName = worker?.fullName ?? 'Người làm';
      appendTimelineToShift(
        shift.id,
        'EmployerApprovedApplicant',
        `Nhà tuyển dụng đã duyệt ${workerName}.`,
      );
    }

    return { ok: true, value: updated };
  },

  reject(applicationId, reason) {
    const trimmedReason = (reason ?? '').trim();
    if (trimmedReason === '') return { ok: false, error: 'REASON_REQUIRED' };

    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Pending') return { ok: false, error: 'WRONG_STATUS' };

    const updated: Application = {
      ...app,
      status: 'Rejected',
      rejectionReason: trimmedReason,
    };
    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    const shift = useShiftStore.getState().getById(app.shiftId);
    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'ApplicationRejected',
      title: 'Đơn ứng tuyển bị từ chối',
      body: shift
        ? `Đơn ứng tuyển ca "${shift.title}" của bạn đã bị từ chối. Lý do: ${trimmedReason}`
        : `Đơn ứng tuyển của bạn đã bị từ chối. Lý do: ${trimmedReason}`,
      link: '/worker/dashboard',
    });

    return { ok: true, value: updated };
  },

  approveCancellationRequest(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'CancellationRequested') {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const decidedAt = nowIso();
    const reasonNote = app.cancellationReasonNote ?? '';

    // Run the late-cancel classifier against the shift's start time, not
    // the moment of the original request — this matches the existing rule
    // that the penalty depends on time-to-start at decision time.
    const cls = classifyCancellation(
      'Approved',
      `${shift.date}T${shift.startTime}:00`,
      decidedAt,
    );

    const updated: Application = {
      ...app,
      status: 'CancelledByWorker',
      cancelledAt: decidedAt,
      cancelReason: cls === 'NoPenalty' ? undefined : (cls as CancellationRecord['type']),
    };

    const next = get().applications.map((a) =>
      a.id === applicationId ? updated : a,
    );
    set({ applications: next });
    persistApplications(next);

    // Free the position now that the cancellation is final.
    useShiftStore.getState().incrementFilled(shift.id, -1);

    // Phase 3: every approved cancellation request consumes quota and is
    // recorded on the worker's history. Reputation is only docked on late
    // cancels — the on-time / late distinction is preserved by the record
    // `type` so the worker profile still tells the story correctly.
    const recordType: CancellationRecord['type'] =
      cls === 'LateCancel' ? 'LateCancel' : 'OnTime';
    patchWorkerScore(app.workerId, (w) => {
      const newScore =
        cls === 'LateCancel'
          ? applyReputationEvent(w.reputationScore, { kind: 'LateCancel' })
          : w.reputationScore;
      const record: CancellationRecord = {
        id: newPrefixedId('cancel'),
        shiftId: shift.id,
        cancelledAt: decidedAt,
        type: recordType,
        reasonNote,
      };
      return {
        reputationScore: newScore,
        cancellationHistory: [...w.cancellationHistory, record],
      };
    });

    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'CancellationApproved',
      title: 'Yêu cầu huỷ đã được chấp nhận',
      body:
        `Nhà tuyển dụng đã chấp nhận yêu cầu huỷ ca "${shift.title}" của bạn.` +
        (cls === 'LateCancel' ? ' Điểm uy tín giảm 10.' : ''),
      // Phase 9L — open the cancellation-quota modal so the worker can
      // immediately see the impact on their weekly/monthly window.
      link: '/worker/dashboard?modal=quota',
    });

    return { ok: true, value: updated };
  },

  rejectCancellationRequest(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'CancellationRequested') {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const shift = useShiftStore.getState().getById(app.shiftId);

    // Restore the application to its pre-request status. In practice this
    // is always `Approved` because Pending applications cancel immediately
    // without producing a request — fall back to `Approved` defensively.
    const restoredStatus = app.preCancellationStatus ?? 'Approved';

    const updated: Application = {
      ...app,
      status: restoredStatus,
      cancellationRequestedAt: undefined,
      cancellationReasonNote: undefined,
      preCancellationStatus: undefined,
    };

    const next = get().applications.map((a) =>
      a.id === applicationId ? updated : a,
    );
    set({ applications: next });
    persistApplications(next);

    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'CancellationRejected',
      title: 'Yêu cầu huỷ bị từ chối',
      body: shift
        ? `Nhà tuyển dụng đã từ chối yêu cầu huỷ ca "${shift.title}". Đơn của bạn vẫn còn hiệu lực.`
        : 'Nhà tuyển dụng đã từ chối yêu cầu huỷ. Đơn của bạn vẫn còn hiệu lực.',
      link: '/worker/dashboard',
    });

    return { ok: true, value: updated };
  },

  confirmCompletion(applicationId, rating) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'CheckedOut') return { ok: false, error: 'WRONG_STATUS' };

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const ts = nowIso();
    const updated: Application = { ...app, status: 'Confirmed', confirmedAt: ts };
    const apps = get().applications.map((a) => (a.id === applicationId ? updated : a));

    const newRating: Rating = {
      id: newPrefixedId('rating'),
      shiftId: shift.id,
      applicationId: app.id,
      fromUserId: shift.employerId,
      toUserId: app.workerId,
      stars: rating.stars,
      feedback: rating.feedback,
      createdAt: ts,
    };
    const ratings = [...get().ratings, newRating];

    set({ applications: apps, ratings });
    persistApplications(apps);
    persistRatings(ratings);

    // Reputation: +5 for completion (Req 8.2)
    // Phase 10A-Fix-9: also update the per-job-type skill score so the
    // employer applicant view can render "Phù hợp công việc: N điểm".
    patchWorkerScore(app.workerId, (worker) => ({
      reputationScore: applyReputationEvent(worker.reputationScore, { kind: 'Completed' }),
      completedShiftCount: worker.completedShiftCount + 1,
      ratingsReceived: [...worker.ratingsReceived, newRating],
      skillScores: applyRatingToSkillScores(
        worker.skillScores,
        shift.jobType,
        rating.stars,
        ts,
      ),
    }));

    // Escrow: Completed -> Released (Req 10.5)
    const shifts = useShiftStore.getState().shifts.map((s) =>
      s.id === shift.id
        ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'EmployerConfirm') }
        : s,
    );
    useShiftStore.getState().hydrate(shifts);
    write(STORAGE_KEYS.shifts, shifts);

    // Mark shift Completed if every approved application is now Confirmed.
    const remaining = apps.filter((a) => a.shiftId === shift.id && a.status !== 'Confirmed' && a.status !== 'NoShow' && a.status !== 'Rejected' && a.status !== 'CancelledByWorker');
    if (remaining.length === 0) {
      useShiftStore.getState().setStatus(shift.id, 'Completed');
    }

    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'ShiftCompletedConfirmed',
      title: 'Ca làm đã được xác nhận',
      body: `Ca "${shift.title}" đã được xác nhận hoàn thành. Tiền công đã chuyển.`,
      // Phase 9L — open the income detail modal so the worker sees the
      // payout reflected on their dashboard right away.
      link: '/worker/dashboard?modal=income',
    });

    // Phase 10C-Stab-1 Batch 4 E — stamp paidAwaitingRatingAt and
    // notify the worker to rate the employer.
    const ratedAt = ts;
    const appsAfter = useApplicationStore.getState().applications.map((a) =>
      a.id === applicationId ? { ...a, paidAwaitingRatingAt: ratedAt } : a,
    );
    useApplicationStore.setState({ applications: appsAfter });
    persistApplications(appsAfter);
    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'WorkerPostPaymentRatingRequired',
      title: 'Hãy đánh giá nhà tuyển dụng',
      body: `Bạn đã nhận lương cho ca "${shift.title}". Hãy đánh giá nhà tuyển dụng để hoàn tất ca.`,
      link: `/shifts/${shift.id}`,
    });

    // Phase 10C-Stab-1 Batch 4 J — credit the worker wallet with the
    // payout, then refund any unused deposit (positions not filled
    // and all applications now in terminal states) to the employer.
    const payoutAmount = updated.payoutAmount ?? 0;
    if (payoutAmount > 0) {
      useWalletStore
        .getState()
        .credit(app.workerId, payoutAmount, 'WorkerWageReleased', {
          shiftId: shift.id,
          applicationId: app.id,
          note: `Lương ca "${shift.title}"`,
        });
    }
    const TERMINAL_APP = new Set([
      'Confirmed',
      'NoShow',
      'Rejected',
      'CancelledByWorker',
      'CancelledByEmployer',
      'Expired',
    ]);
    const allTerminal = apps
      .filter((a) => a.shiftId === shift.id)
      .every((a) => TERMINAL_APP.has(a.status));
    if (allTerminal && shift.positionsFilled < shift.positionsTotal) {
      const perWorkerWage = payoutAmount > 0
        ? payoutAmount
        : Math.floor(shift.depositAmount / Math.max(1, shift.positionsTotal));
      const unused = perWorkerWage * (shift.positionsTotal - shift.positionsFilled);
      if (unused > 0) {
        useWalletStore
          .getState()
          .credit(shift.employerId, unused, 'EmployerUnusedRefund', {
            shiftId: shift.id,
            note: `Hoàn cọc vị trí không sử dụng cho ca "${shift.title}"`,
          });
      }
    }

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    {
      const worker = asWorker(useUserStore.getState().findById(app.workerId));
      const workerName = worker?.fullName ?? 'Người làm';
      appendTimelineToShift(
        shift.id,
        'WageReleased',
        payoutAmount > 0
          ? `Đã giải ngân ${payoutAmount.toLocaleString('vi-VN')} đồng cho ${workerName}.`
          : `Đã xác nhận hoàn thành cho ${workerName}.`,
      );
    }

    return { ok: true, value: updated };
  },

  reportIssue(payload) {
    // Phase 10C — structured employer-side dispute. Validate every
    // field before any state change so a rejection leaves the
    // application + dispute slice strictly unchanged.
    const trimmedReason = (payload?.reason ?? '').trim();
    const evidenceDescription = (payload?.evidenceDescription ?? '').trim();
    const evidenceFileName = (payload?.evidenceFileName ?? '').trim();

    if (!payload?.category) {
      return { ok: false, error: 'CATEGORY_REQUIRED' };
    }
    if (!EMPLOYER_DISPUTE_CATEGORIES.includes(payload.category)) {
      return { ok: false, error: 'CATEGORY_INVALID' };
    }
    if (trimmedReason.length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    if (
      trimmedReason.length > 1000 ||
      evidenceDescription.length > 2000 ||
      evidenceFileName.length > 255
    ) {
      return { ok: false, error: 'FIELD_TOO_LONG' };
    }
    if (
      evidenceFileName.length > 0 &&
      (evidenceFileName.includes('/') || evidenceFileName.includes('\\'))
    ) {
      return { ok: false, error: 'FIELD_TOO_LONG' };
    }

    const app = get().getById(payload.applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    // Disputable status set: only `'CheckedOut'` for now. The wider
    // set (CheckedIn / Confirmed / etc.) ships with worker-side
    // disputes in Wave 5 and admin escalation in Wave 8.
    if (app.status !== 'CheckedOut') {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const ts = nowIso();
    const dispute: Dispute = {
      id: newPrefixedId('dispute'),
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      category: payload.category,
      reason: trimmedReason,
      evidenceDescription:
        evidenceDescription.length > 0 ? evidenceDescription : undefined,
      evidenceFileName:
        evidenceFileName.length > 0 ? evidenceFileName : undefined,
      status: 'Open',
      createdAt: ts,
    };
    const disputes = [...get().disputes, dispute];

    // Flip the application to `'Disputed'` so auto-release skips it
    // (auto-release wiring lands in Wave 7 but the predicate it will
    // use already excludes this status).
    const apps = get().applications.map((a) =>
      a.id === payload.applicationId ? { ...a, status: 'Disputed' as const } : a,
    );

    set({ disputes, applications: apps });
    persistDisputes(disputes);
    persistApplications(apps);

    // Drive the existing `'Completed' -> 'Disputed'` escrow
    // transition so the shift's escrow status reflects the held
    // payment.
    const shifts = useShiftStore.getState().shifts.map((s) =>
      s.id === shift.id
        ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'EmployerReportIssue') }
        : s,
    );
    useShiftStore.getState().hydrate(shifts);
    write(STORAGE_KEYS.shifts, shifts);

    // Notify the worker.
    const categoryLabel = `dispute.category.${payload.category}`;
    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'DisputeFiled',
      title: 'Nhà tuyển dụng đang khiếu nại ca làm',
      body: `Khiếu nại về ca "${shift.title}". Tiền công đang được giữ lại cho đến khi quản trị viên xử lý.`,
      link: `/shifts/${shift.id}`,
    });
    // Notify every active admin so the disputes queue picks it up.
    notifyAdmins({
      users: useUserStore.getState().users,
      push: useNotificationStore.getState().push,
      kind: 'DisputeOpened',
      title: 'Có khiếu nại mới cần xử lý',
      body: `Khiếu nại trên ca "${shift.title}" — loại "${categoryLabel}".`,
      link: '/admin/dashboard?tab=disputes',
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    appendTimelineToShift(
      shift.id,
      'EmployerOpenedDispute',
      `Nhà tuyển dụng mở khiếu nại — ${trimmedReason.slice(0, 120)}`,
    );

    return { ok: true, value: dispute };
  },

  workerOpenDispute(applicationId, payload) {
    // Phase 10C Wave 5 — worker-side structured dispute. Mirrors
    // `reportIssue` but writes `raisedBy: 'worker'` and notifies the
    // employer + admins instead. Validates BEFORE any state change so
    // a rejection leaves the application + dispute slice byte-identical
    // to its pre-call snapshot.
    const trimmedReason = (payload?.reason ?? '').trim();
    const evidenceDescription = (payload?.evidenceDescription ?? '').trim();
    const evidenceFileName = (payload?.evidenceFileName ?? '').trim();

    if (!payload?.category) {
      return { ok: false, error: 'CATEGORY_REQUIRED' };
    }
    if (!WORKER_DISPUTE_CATEGORIES.includes(payload.category)) {
      // Employer-side category supplied to the worker-side action,
      // or any out-of-enum value.
      return { ok: false, error: 'CATEGORY_INVALID' };
    }
    if (trimmedReason.length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    if (
      trimmedReason.length > 1000 ||
      evidenceDescription.length > 2000 ||
      evidenceFileName.length > 255
    ) {
      return { ok: false, error: 'FIELD_TOO_LONG' };
    }
    if (
      evidenceFileName.length > 0 &&
      (evidenceFileName.includes('/') || evidenceFileName.includes('\\'))
    ) {
      return { ok: false, error: 'FIELD_TOO_LONG' };
    }

    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    // Worker-side disputable status set: `'CheckedOut'` only for now —
    // a worker can dispute after they've finished their side and are
    // waiting for employer confirmation. The wider set ships in
    // future waves alongside admin escalation.
    // Phase 10C-Stab-1 Batch 4 I — `'AbsentDispute'` is the only
    // category accepted on `'NoShow'` applications.
    if (payload.category === 'AbsentDispute') {
      if (app.status !== 'NoShow') {
        return { ok: false, error: 'WRONG_STATUS' };
      }
    } else if (app.status !== 'CheckedOut') {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    // Phase 10C-Stab-1 Batch 4 D — block PaymentDispute when filed
    // before `autoReleaseAt - 1h`. Other categories pass through.
    if (payload.category === 'PaymentDispute' && app.autoReleaseAt) {
      const nowMs = Date.now();
      const autoMs = Date.parse(app.autoReleaseAt);
      if (Number.isFinite(autoMs) && nowMs < autoMs - 60 * 60 * 1000) {
        return { ok: false, error: 'TOO_EARLY' };
      }
    }

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const ts = nowIso();
    const dispute: Dispute = {
      id: newPrefixedId('dispute'),
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'worker',
      category: payload.category,
      reason: trimmedReason,
      evidenceDescription:
        evidenceDescription.length > 0 ? evidenceDescription : undefined,
      evidenceFileName:
        evidenceFileName.length > 0 ? evidenceFileName : undefined,
      status: 'Open',
      createdAt: ts,
    };
    const disputes = [...get().disputes, dispute];

    // Flip the application to `'Disputed'`. The Wave 7 auto-release
    // predicate already excludes this status; once admin resolution
    // ships in Wave 8 the same status drives both predicates.
    const apps = get().applications.map((a) =>
      a.id === applicationId ? { ...a, status: 'Disputed' as const } : a,
    );

    set({ disputes, applications: apps });
    persistDisputes(disputes);
    persistApplications(apps);

    // Drive the existing `'Completed' -> 'Disputed'` escrow
    // transition so the shift's escrow status reflects the held
    // payment. Same event used by employer-side `reportIssue` —
    // single source of truth for the escrow state machine.
    const shifts = useShiftStore.getState().shifts.map((s) =>
      s.id === shift.id
        ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'EmployerReportIssue') }
        : s,
    );
    useShiftStore.getState().hydrate(shifts);
    write(STORAGE_KEYS.shifts, shifts);

    // Notify the employer.
    const categoryLabel = `dispute.category.${payload.category}`;
    useNotificationStore.getState().push({
      userId: shift.employerId,
      kind: 'DisputeFiled',
      title: 'Người làm đang khiếu nại ca làm',
      body: `Khiếu nại về ca "${shift.title}". Tiền công đang được giữ lại cho đến khi quản trị viên xử lý.`,
      link: `/employer/shifts/${shift.id}`,
    });
    // Notify every active admin so the disputes queue picks it up.
    notifyAdmins({
      users: useUserStore.getState().users,
      push: useNotificationStore.getState().push,
      kind: 'DisputeOpened',
      title: 'Có khiếu nại mới cần xử lý',
      body: `Khiếu nại trên ca "${shift.title}" — loại "${categoryLabel}".`,
      link: '/admin/dashboard?tab=disputes',
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    appendTimelineToShift(
      shift.id,
      'WorkerOpenedDispute',
      `Người làm mở khiếu nại — ${trimmedReason.slice(0, 120)}`,
    );

    return { ok: true, value: dispute };
  },

  // -------------------------------------------------------------------------
  // Phase 10C-Stab-1 Batch 3 E — appendDisputeResponse
  // -------------------------------------------------------------------------

  appendDisputeResponse(disputeId, side, payload) {
    const trimmedReason = (payload?.reason ?? '').trim();
    const evidenceDescription = (payload?.evidenceDescription ?? '').trim();
    const evidenceFileName = (payload?.evidenceFileName ?? '').trim();

    if (trimmedReason.length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    if (
      trimmedReason.length > 1000 ||
      evidenceDescription.length > 2000 ||
      evidenceFileName.length > 255
    ) {
      return { ok: false, error: 'FIELD_TOO_LONG' };
    }
    if (
      evidenceFileName.length > 0 &&
      (evidenceFileName.includes('/') || evidenceFileName.includes('\\'))
    ) {
      return { ok: false, error: 'FIELD_TOO_LONG' };
    }

    const dispute = get().disputes.find((d) => d.id === disputeId);
    if (!dispute) return { ok: false, error: 'NOT_FOUND' };

    const TERMINAL: ReadonlySet<string> = new Set([
      'ResolvedReleased',
      'ResolvedRefunded',
      'PartialRelease',
      'ClosedInvalid',
    ]);
    if (TERMINAL.has(dispute.status)) {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const ts = nowIso();
    const response: DisputeResponse = {
      id: newPrefixedId('dispute-response'),
      side,
      authorUserId: payload.authorUserId,
      reason: trimmedReason,
      evidenceDescription:
        evidenceDescription.length > 0 ? evidenceDescription : undefined,
      evidenceFileName:
        evidenceFileName.length > 0 ? evidenceFileName : undefined,
      createdAt: ts,
    };

    const updatedDispute: Dispute = {
      ...dispute,
      responses: [...(dispute.responses ?? []), response],
    };
    const disputes = get().disputes.map((d) =>
      d.id === disputeId ? updatedDispute : d,
    );
    set({ disputes });
    persistDisputes(disputes);

    // Notify the OTHER side + admins.
    const shift = useShiftStore.getState().getById(dispute.shiftId);
    const shiftTitle = shift?.title ?? 'ca làm';
    const otherUserId =
      side === 'worker'
        ? shift?.employerId
        : useApplicationStore
            .getState()
            .applications.find((a) => a.id === dispute.applicationId)?.workerId;
    if (otherUserId) {
      useNotificationStore.getState().push({
        userId: otherUserId,
        kind: 'DisputeFiled',
        title: 'Có phản hồi khiếu nại mới',
        body: `Có phản hồi mới trên khiếu nại ca "${shiftTitle}".`,
        link:
          side === 'worker'
            ? `/employer/shifts/${dispute.shiftId}`
            : `/shifts/${dispute.shiftId}`,
      });
    }
    notifyAdmins({
      users: useUserStore.getState().users,
      push: useNotificationStore.getState().push,
      kind: 'DisputeOpened',
      title: 'Phản hồi khiếu nại mới',
      body: `Có phản hồi mới trên khiếu nại ca "${shiftTitle}".`,
      link: '/admin/dashboard?tab=disputes',
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    if (shift) {
      appendTimelineToShift(
        shift.id,
        side === 'worker'
          ? 'WorkerRespondedToDispute'
          : 'EmployerRespondedToDispute',
        side === 'worker'
          ? `Người làm phản hồi khiếu nại — ${trimmedReason.slice(0, 120)}`
          : `Nhà tuyển dụng phản hồi khiếu nại — ${trimmedReason.slice(0, 120)}`,
      );
    }

    return { ok: true, value: response };
  },

  markNoShow(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Approved') return { ok: false, error: 'WRONG_STATUS' };

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const updated: Application = { ...app, status: 'NoShow' };
    const apps = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: apps });
    persistApplications(apps);

    // Reputation: -20 for no-show (Req 8.3)
    patchWorkerScore(app.workerId, (worker) => ({
      reputationScore: applyReputationEvent(worker.reputationScore, { kind: 'NoShow' }),
      noShowCount: worker.noShowCount + 1,
    }));

    // Free the position
    useShiftStore.getState().incrementFilled(shift.id, -1);

    // Escrow refund + employer Boost_Credit (Req 10.6, 11.1, 11.2)
    const shifts = useShiftStore.getState().shifts.map((s) =>
      s.id === shift.id
        ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'NoShow') }
        : s,
    );
    useShiftStore.getState().hydrate(shifts);
    write(STORAGE_KEYS.shifts, shifts);

    const userStore = useUserStore.getState();
    const employer = userStore.findById(shift.employerId);
    if (employer && employer.role === 'employer') {
      userStore.updateUser(employer.id, { boostCredits: employer.boostCredits + 1 });
    }

    // Notify both parties (Req 18.3)
    useNotificationStore.getState().push({
      userId: shift.employerId,
      kind: 'NoShow',
      title: 'Người làm vắng mặt',
      body: `Một người làm không tới ca "${shift.title}". Bạn được tặng 1 lượt boost.`,
      link: `/employer/shifts/${shift.id}`,
    });
    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'NoShow',
      title: 'Bạn bị đánh dấu vắng mặt',
      body: `Bạn không tới ca "${shift.title}". Điểm uy tín giảm 20.`,
      // Phase 9L — open the reputation detail modal so the worker can
      // see the −20 event on their score timeline.
      link: '/worker/dashboard?modal=reputation',
    });

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    {
      const worker = asWorker(useUserStore.getState().findById(app.workerId));
      const workerName = worker?.fullName ?? 'Người làm';
      appendTimelineToShift(
        shift.id,
        'EmployerMarkedAbsent',
        `Nhà tuyển dụng đánh dấu ${workerName} vắng mặt.`,
      );
    }

    return { ok: true, value: updated };
  },

  // -------------------------------------------------------------------------
  // Phase 10A-Fix-10 — expire stale Pending applications
  // -------------------------------------------------------------------------

  expirePendingApplicationsForStartedShifts(when) {
    const at = when ?? nowIso();
    const shifts = useShiftStore.getState().shifts;
    const plan = planExpirePendingApplications(
      get().applications,
      shifts,
      at,
    );
    if (plan.expiredIds.length === 0) {
      return { expiredIds: [] };
    }
    set({ applications: plan.applications });
    persistApplications(plan.applications);

    // Index shifts so the notification body can quote the title.
    const shiftById = new Map<string, typeof shifts[number]>();
    for (const s of shifts) shiftById.set(s.id, s);

    // One notification per affected worker. The planner only includes
    // applications that were Pending at this exact tick — any future
    // call sees them as `'Expired'` and skips them, so we never
    // duplicate.
    for (const id of plan.expiredIds) {
      const app = plan.applications.find((a) => a.id === id);
      if (!app) continue;
      const shift = shiftById.get(app.shiftId);
      const shiftTitle = shift?.title ?? 'ca làm';
      useNotificationStore.getState().push({
        userId: app.workerId,
        kind: 'ApplicationExpired',
        title: 'Đơn ứng tuyển đã hết hạn',
        body: `Ca ${shiftTitle} đã bắt đầu trước khi đơn của bạn được duyệt. Bạn không bị trừ điểm uy tín hoặc hạn mức hủy.`,
        link: shift ? `/shifts/${shift.id}` : '/worker/dashboard',
      });
    }

    return { expiredIds: plan.expiredIds };
  },

  // -------------------------------------------------------------------------
  // Phase 10C-Stabilization-1 B — central lifecycle sync orchestrator
  // -------------------------------------------------------------------------

  runLifecycleSync(when) {
    const at = when ?? nowIso();
    const nowMs = Date.parse(at);

    // Step 1: roll shift statuses forward.
    const { changedIds: changedShiftIds } = useShiftStore
      .getState()
      .syncLifecycle(at);

    // Step 2: expire stale Pending applications.
    const { expiredIds: expiredApplicationIds } = get()
      .expirePendingApplicationsForStartedShifts(at);

    // Step 3: idempotent ShiftStarted / ShiftEnded notifications.
    // Read the live application + shift snapshot AFTER steps 1+2 so we
    // see the freshly-rolled statuses.
    const apps = get().applications;
    const shifts = useShiftStore.getState().shifts;
    const shiftById = new Map<string, typeof shifts[number]>();
    for (const s of shifts) shiftById.set(s.id, s);

    const notifiedStartIds: string[] = [];
    const notifiedEndIds: string[] = [];
    const startedAppIds = new Set<string>();
    const endedAppIds = new Set<string>();

    // Notification windows mirror the time-gate constants.
    const CHECK_IN_LATE_MS = 15 * 60 * 1000;
    const CHECK_OUT_GRACE_MS = 60 * 60 * 1000;

    for (const a of apps) {
      // Only approved-or-later applications care about start/end.
      if (
        a.status !== 'Approved' &&
        a.status !== 'CheckedIn' &&
        a.status !== 'CheckedOut'
      ) {
        continue;
      }
      const shift = shiftById.get(a.shiftId);
      if (!shift) continue;
      const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
      const endMs = new Date(`${shift.date}T${shift.endTime}:00`).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;

      // ShiftStarted: now ≥ start, application not yet notified.
      if (
        a.shiftStartedNotifiedAt === undefined &&
        nowMs >= startMs &&
        // Don't fire for applications that already moved past the
        // start window without checking in (no-show is its own flow).
        nowMs < startMs + CHECK_IN_LATE_MS + CHECK_OUT_GRACE_MS
      ) {
        startedAppIds.add(a.id);
        useNotificationStore.getState().push({
          userId: a.workerId,
          kind: 'ShiftStarted',
          title: 'Ca làm đã bắt đầu',
          body: `Ca làm "${shift.title}" đã bắt đầu. Vui lòng check-in nếu bạn đã có mặt.`,
          link: `/shifts/${shift.id}`,
        });
        useNotificationStore.getState().push({
          userId: shift.employerId,
          kind: 'ShiftStarted',
          title: 'Ca làm đã bắt đầu',
          body: `Ca làm "${shift.title}" đã bắt đầu. Hãy kiểm tra người làm đã có mặt.`,
          link: `/employer/shifts/${shift.id}`,
        });
        notifiedStartIds.push(a.id);
      }

      // ShiftEnded: now ≥ end, application not yet notified, only
      // when the worker actually started (CheckedIn) — for
      // approved-but-no-show records the ShiftStarted line is
      // sufficient.
      if (
        a.shiftEndedNotifiedAt === undefined &&
        nowMs >= endMs &&
        a.status === 'CheckedIn'
      ) {
        endedAppIds.add(a.id);
        useNotificationStore.getState().push({
          userId: a.workerId,
          kind: 'ShiftEnded',
          title: 'Ca làm đã kết thúc',
          body: `Ca "${shift.title}" đã kết thúc. Vui lòng check-out và hoàn tất checklist.`,
          link: `/shifts/${shift.id}`,
        });
        useNotificationStore.getState().push({
          userId: shift.employerId,
          kind: 'ShiftEnded',
          title: 'Ca làm đã kết thúc',
          body: `Ca "${shift.title}" đã kết thúc. Hãy xác nhận sau khi người làm check-out.`,
          link: `/employer/shifts/${shift.id}`,
        });
        notifiedEndIds.push(a.id);
      }
    }

    // Stamp the idempotency markers in a single batched write so a
    // partial failure can't leave us with notifications fired but
    // markers absent.
    if (startedAppIds.size > 0 || endedAppIds.size > 0) {
      const updatedApps = get().applications.map((a) => {
        const next: Application = a;
        let mutated = false;
        let copy: Application = next;
        if (startedAppIds.has(a.id) && copy.shiftStartedNotifiedAt === undefined) {
          copy = { ...copy, shiftStartedNotifiedAt: at };
          mutated = true;
        }
        if (endedAppIds.has(a.id) && copy.shiftEndedNotifiedAt === undefined) {
          copy = { ...copy, shiftEndedNotifiedAt: at };
          mutated = true;
        }
        return mutated ? copy : a;
      });
      set({ applications: updatedApps });
      persistApplications(updatedApps);
    }

    // -------------------------------------------------------------------
    // Phase 10C-Stab-1 Batch 3 B — employer expiry notifications.
    //
    //   - `'ShiftStartingSoon'` fires inside the 10-minute pre-start
    //     window when there is at least one unfilled position on a
    //     Published / FullyBooked shift. Idempotent via
    //     `Shift.startingSoonNotifiedAt`.
    //
    //   - `'ShiftExpiredEmpty'` fires once per shift after the
    //     lifecycle sync transitions it to `'Expired'` with zero
    //     approved positions. Idempotent via
    //     `Shift.expiredEmptyNotifiedAt`.
    // -------------------------------------------------------------------
    const NOTIF_WINDOW_MS = 10 * 60_000;
    // Re-read shifts after the syncLifecycle pass so we see the most
    // recent statuses (e.g. Published → Expired transitions).
    const liveShifts = useShiftStore.getState().shifts;
    const startingSoonStamps = new Map<string, string>();
    const expiredEmptyStamps = new Map<string, string>();
    for (const shift of liveShifts) {
      const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
      const endMs = new Date(`${shift.date}T${shift.endTime}:00`).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;

      // ShiftStartingSoon: 10-min pre-start window, only when the
      // shift is still recruiting and has unfilled positions.
      if (
        !shift.startingSoonNotifiedAt &&
        (shift.status === 'Published' || shift.status === 'FullyBooked') &&
        nowMs >= startMs - NOTIF_WINDOW_MS &&
        nowMs < startMs &&
        shift.positionsTotal > shift.positionsFilled
      ) {
        const remaining = shift.positionsTotal - shift.positionsFilled;
        useNotificationStore.getState().push({
          userId: shift.employerId,
          kind: 'ShiftStartingSoon',
          title: 'Ca sắp bắt đầu',
          body:
            `Ca "${shift.title}" sắp bắt đầu lúc ${shift.startTime}. ` +
            `Bạn còn ${remaining} vị trí chưa duyệt.`,
          link: `/employer/shifts/${shift.id}`,
        });
        startingSoonStamps.set(shift.id, at);
      }

      // ShiftExpiredEmpty: shift is Expired with zero approved
      // positions and we haven't already notified.
      if (
        !shift.expiredEmptyNotifiedAt &&
        shift.status === 'Expired' &&
        shift.positionsFilled === 0
      ) {
        useNotificationStore.getState().push({
          userId: shift.employerId,
          kind: 'ShiftExpiredEmpty',
          title: 'Ca đã hết hạn',
          body: `Ca "${shift.title}" đã hết hạn vì không có người được duyệt đúng giờ.`,
          link: `/employer/shifts/${shift.id}`,
        });
        expiredEmptyStamps.set(shift.id, at);
      }
    }
    if (startingSoonStamps.size > 0 || expiredEmptyStamps.size > 0) {
      const nextShifts = useShiftStore.getState().shifts.map((s) => {
        const startStamp = startingSoonStamps.get(s.id);
        const expiredStamp = expiredEmptyStamps.get(s.id);
        if (!startStamp && !expiredStamp) return s;
        return {
          ...s,
          ...(startStamp ? { startingSoonNotifiedAt: startStamp } : {}),
          ...(expiredStamp ? { expiredEmptyNotifiedAt: expiredStamp } : {}),
        };
      });
      useShiftStore.setState({ shifts: nextShifts });
      write(STORAGE_KEYS.shifts, nextShifts);
    }

    // Step 4: 12 h auto-release pass.
    const { releasedIds } = get().autoReleaseEligibleApplications(at);

    return {
      changedShiftIds,
      expiredApplicationIds,
      notifiedStartIds,
      notifiedEndIds,
      releasedIds,
    };
  },

  // -------------------------------------------------------------------------
  // Phase 10C Wave 5B — idempotent 12-hour auto-release pass
  // -------------------------------------------------------------------------

  autoReleaseEligibleApplications(when) {
    // Resolve the current clock once so every per-record predicate
    // reads the same "now" — keeps the pass deterministic under
    // fake-timer harnesses.
    const nowMs = Date.parse(when ?? nowIso());

    // Build the set of applications that currently have a dispute in
    // a non-terminal status. Dispute-locked applications are NEVER
    // auto-released — admin resolution (Wave 8) is the only path
    // out of dispute.
    const TERMINAL_DISPUTE_STATUSES = new Set([
      'ResolvedReleased',
      'ResolvedRefunded',
      'PartialRelease',
      'ClosedInvalid',
    ]);
    const openDisputeAppIds = new Set<string>();
    for (const d of get().disputes) {
      if (!TERMINAL_DISPUTE_STATUSES.has(d.status)) {
        openDisputeAppIds.add(d.applicationId);
      }
    }

    // Filter eligible applications. The predicate intentionally
    // matches the Wave 0 design exactly so the same predicate can be
    // tested in isolation and the test pins behavior across waves.
    const eligible = get().applications.filter((a) => {
      if (a.status !== 'CheckedOut') return false;
      if (a.autoReleased === true) return false;
      if (typeof a.autoReleaseAt !== 'string' || a.autoReleaseAt.length === 0) {
        return false;
      }
      const deadlineMs = Date.parse(a.autoReleaseAt);
      if (!Number.isFinite(deadlineMs)) return false;
      if (deadlineMs > nowMs) return false;
      if (openDisputeAppIds.has(a.id)) return false;
      return true;
    });

    if (eligible.length === 0) {
      return { releasedIds: [] };
    }

    const releasedIds: string[] = [];
    // Process each eligible record under per-record error isolation
    // so one bad row never blocks the rest. We delegate to
    // `confirmCompletion` so all existing side effects fire exactly
    // once per release: rating record, reputation bump, skill score
    // update, escrow `'EmployerConfirm'` event, shift-Completed
    // rollover, and the standard `'ShiftCompletedConfirmed'`
    // notification. We then mark `autoReleased: true` as the audit
    // marker distinguishing auto from manual confirmation, and push
    // an extra `'AutoReleaseSettled'` notification to BOTH parties
    // so the worker income + employer payment release are visible
    // as separate ledger entries.
    for (const a of eligible) {
      try {
        const result = get().confirmCompletion(a.id, { stars: 5 });
        if (!result.ok) {
          // confirmCompletion only rejects on APPLICATION_NOT_FOUND
          // or WRONG_STATUS — neither should fire after our
          // predicate, but if it does we skip cleanly.
          continue;
        }

        // Mark the application as auto-released so a second pass
        // (or any future re-run) skips it.
        const updatedApps = get().applications.map((x) =>
          x.id === a.id ? { ...x, autoReleased: true } : x,
        );
        set({ applications: updatedApps });
        persistApplications(updatedApps);

        // Push the auto-release-specific notifications. The worker
        // already received the `'ShiftCompletedConfirmed'` toast
        // from `confirmCompletion`; the additional
        // `'AutoReleaseSettled'` entry quotes the payout amount
        // so both sides have a ledger-grade record of WHY the
        // release happened (12-hour timeout vs. employer
        // confirmation).
        const shift = useShiftStore.getState().getById(a.shiftId);
        const payout = a.payoutAmount ?? 0;
        if (shift) {
          // Worker income credit notification.
          useNotificationStore.getState().push({
            userId: a.workerId,
            kind: 'AutoReleaseSettled',
            title: 'Tự động giải ngân tiền công',
            body:
              `Hệ thống tự động xác nhận ca "${shift.title}" sau 12 giờ ` +
              `nhà tuyển dụng không thao tác. Tiền công ${payout.toLocaleString('vi-VN')}đ ` +
              `đã được chuyển cho bạn (mô phỏng).`,
            link: '/worker/dashboard?modal=income',
          });
          // Employer deposit-released notification.
          useNotificationStore.getState().push({
            userId: shift.employerId,
            kind: 'AutoReleaseSettled',
            title: 'Tự động giải ngân tiền công',
            body:
              `Ca "${shift.title}" đã được hệ thống tự động xác nhận sau 12 giờ ` +
              `(không có khiếu nại). Tiền cọc ${payout.toLocaleString('vi-VN')}đ ` +
              `đã được giải ngân cho người làm.`,
            link: `/employer/shifts/${shift.id}`,
          });
        }

        releasedIds.push(a.id);
      } catch (err) {
        // Per-record error isolation. Log in dev so the bug surfaces;
        // in production / MVP this branch is unreachable because
        // `confirmCompletion` never throws — it returns a `Result`.
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[autoReleaseEligibleApplications] skipped ${a.id}:`,
            err,
          );
        }
      }
    }

    return { releasedIds };
  },

  // -------------------------------------------------------------------------
  // Hydration
  // -------------------------------------------------------------------------

  hydrateApplications(applications) {
    set({ applications });
  },
  hydrateRatings(ratings) {
    set({ ratings });
  },
  hydrateDisputes(disputes) {
    set({ disputes });
  },
}));
