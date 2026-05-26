/**
 * Shift store — owns the lifecycle of shift records.
 *
 * Mutators delegate to the pure domain modules:
 *  - `domain/escrow.ts` for escrow status transitions
 *  - `domain/timeGates.ts` for the 24h edit/cancel window
 *  - `domain/filter.ts` for the listing predicate
 *  - `domain/deposit.ts` for the simulated deposit total
 *
 * State updates are persisted to localStorage on every mutation so a
 * page reload keeps the demo data fresh.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { calculateDeposit, hoursBetween } from '@/domain/deposit';
import {
  depositForTrust,
  trustForEmployer,
} from '@/domain/employerTrust';
import {
  AFFECTED_APPLICATION_STATUSES,
  buildWorkerProtection,
  computeEmployerCancellationPenalty,
  refundOneLateCancel,
} from '@/domain/employerCancellation';
import { transitionEscrow } from '@/domain/escrow';
import { suggestedEvidenceForJobType } from '@/domain/evidence';
import { applyFilters, type FilterCriteria } from '@/domain/filter';
import { syncLifecycle as runSyncLifecycle } from '@/domain/shiftLifecycle';
import { canEditShift } from '@/domain/timeGates';
import { newPrefixedId } from '@/lib/ids';
import type {
  Application,
  ApplicationStatus,
  EvidenceRequirement,
  Result,
  Shift,
  ShiftStatus,
  Worker,
} from '@/types';

import { useApplicationStore } from './applicationStore';
import { useNotificationStore } from './notificationStore';
import { asEmployer, useUserStore } from './userStore';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Fields collected from the create-shift form. */
export interface NewShiftInput {
  employerId: string;
  title: string;
  description: string;
  requirements: string;
  jobType: string;
  location: string;
  district?: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  hourlyWage: number;
  positionsTotal: number;

  /** Phase 10A-Fix-3 — workplace imagery + on-site contact metadata. */
  workplaceImageUrl?: string;
  workplaceImageLabel?: string;
  workplaceNotes?: string;
  onSiteContactName?: string;
  onSiteContactPhone?: string;
  requiresVerifiedDocumentOnArrival?: boolean;

  /**
   * Phase 10C — post-shift evidence requirement. The new-shift UI
   * always supplies a value seeded from
   * `suggestedEvidenceForJobType(jobType)`. Optional in the input
   * type so legacy / programmatic callers still compile; when
   * omitted, `create` falls back to the same suggestion helper.
   */
  evidenceRequirement?: EvidenceRequirement;
}

/** Editable subset of a shift (Req 25.1 — wage and date are NOT editable). */
export type ShiftEditablePatch = Partial<
  Pick<
    Shift,
    | 'title'
    | 'description'
    | 'requirements'
    | 'jobType'
    | 'location'
    | 'district'
    | 'startTime'
    | 'endTime'
    | 'positionsTotal'
  >
>;

export type CancelError =
  | 'NOT_FOUND'
  | 'TOO_LATE_STARTED'
  | 'TOO_LATE_HAS_APPLICANTS'
  /** Phase 10A-Fix-7: empty / whitespace-only reason. */
  | 'REASON_REQUIRED';
export type EditError = 'NOT_FOUND' | 'TOO_LATE' | 'POSITIONS_BELOW_FILLED';

interface ShiftStore {
  shifts: Shift[];
  /** Phase 7: ISO timestamp of the last successful lifecycle sync. */
  lastLifecycleSyncAt: string | null;

  // Reads
  list(filter: FilterCriteria): Shift[];
  getById(id: string): Shift | undefined;
  byEmployer(employerId: string): Shift[];

  // Mutators
  create(input: NewShiftInput): Shift;
  simulateDeposit(shiftId: string): void;
  setStatus(shiftId: string, status: ShiftStatus): void;
  incrementFilled(shiftId: string, delta: number): void;
  edit(shiftId: string, patch: ShiftEditablePatch, nowIso?: string): Result<Shift, EditError>;
  /**
   * Phase 10A-Fix-7: employer-initiated cancellation. Reason is required
   * and stored on the shift. When at least one worker had been approved
   * the store also (a) flips their applications to
   * `'CancelledByEmployer'`, (b) credits each worker with a
   * `WorkerProtectionRecord` plus a reputation/quota refund, and
   * (c) computes the deposit penalty per the time-window rules in
   * `src/domain/employerCancellation.ts`. Pending-only applicants are
   * notified but receive no protection record.
   */
  cancel(shiftId: string, reason: string, nowIso?: string): Result<Shift, CancelError>;
  useBoostCredit(shiftId: string): void;

  /**
   * Phase 7: walk the shift list and roll forward any time-driven status
   * transitions (Published → InProgress, InProgress → AwaitingConfirmation,
   * etc.). Pure-derivation; never auto-confirms completion or marks
   * workers as no-show. Returns the IDs that actually changed so callers
   * can short-circuit re-renders when nothing moved.
   */
  syncLifecycle(nowIso?: string): { changedIds: string[]; syncedAt: string };

  /** Hydrate the slice from a persisted snapshot. */
  hydrate(shifts: Shift[]): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

function persist(shifts: Shift[]): void {
  write(STORAGE_KEYS.shifts, shifts);
}

function patchShift(
  shifts: Shift[],
  shiftId: string,
  patch: Partial<Shift>,
): Shift[] {
  return shifts.map((s) => (s.id === shiftId ? { ...s, ...patch, updatedAt: nowIso() } : s));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useShiftStore = create<ShiftStore>((set, get) => ({
  shifts: [],
  lastLifecycleSyncAt: null,

  list(filter) {
    return applyFilters(get().shifts, filter);
  },

  getById(id) {
    return get().shifts.find((s) => s.id === id);
  },

  byEmployer(employerId) {
    return get().shifts.filter((s) => s.employerId === employerId);
  },

  create(input) {
    const hours = hoursBetween(input.startTime, input.endTime);
    const fullWage = calculateDeposit(input.hourlyWage, hours, 1);

    // Phase 6: deposit ratio depends on the employer's trust tier. Tier
    // is derived from `verifiedBusiness` + completed-shift count using
    // the live shift list — same source the UI shows in the deposit
    // breakdown card. Falls back to the full 100% when the employer
    // record can't be resolved (defensive; should never happen).
    const employer = asEmployer(useUserStore.getState().findById(input.employerId));
    const completedCount = get().shifts.filter(
      (s) => s.employerId === input.employerId && s.status === 'Completed',
    ).length;
    const trust = employer ? trustForEmployer(employer, completedCount) : 'low';
    const depositAmount = depositForTrust(fullWage, input.positionsTotal, trust);

    const created = nowIso();

    const shift: Shift = {
      id: newPrefixedId('shift'),
      employerId: input.employerId,
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      jobType: input.jobType,
      location: input.location,
      district: input.district,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      hourlyWage: input.hourlyWage,
      positionsTotal: input.positionsTotal,
      positionsFilled: 0,
      status: 'Draft',
      escrowStatus: 'PendingDeposit',
      depositAmount,
      createdAt: created,
      updatedAt: created,
      // Phase 10A-Fix-3 — only persist trim non-empty values to keep
      // the JSON snapshot tight; empty strings round-trip as undefined.
      workplaceImageUrl: input.workplaceImageUrl?.trim() || undefined,
      workplaceImageLabel: input.workplaceImageLabel?.trim() || undefined,
      workplaceNotes: input.workplaceNotes?.trim() || undefined,
      onSiteContactName: input.onSiteContactName?.trim() || undefined,
      onSiteContactPhone: input.onSiteContactPhone?.trim() || undefined,
      requiresVerifiedDocumentOnArrival:
        input.requiresVerifiedDocumentOnArrival ?? false,
      // Phase 10C — persist the post-shift evidence requirement.
      // Defaults to the suggestion for legacy / programmatic callers
      // that don't supply one (the new-shift UI always does).
      evidenceRequirement:
        input.evidenceRequirement ??
        suggestedEvidenceForJobType(input.jobType),
    };

    const next = [...get().shifts, shift];
    set({ shifts: next });
    persist(next);
    return shift;
  },

  simulateDeposit(shiftId) {
    const shift = get().getById(shiftId);
    if (!shift) return;
    if (shift.escrowStatus !== 'PendingDeposit') return;

    const next = patchShift(get().shifts, shiftId, {
      escrowStatus: transitionEscrow(shift.escrowStatus, 'Deposit'),
      status: 'Published',
    });
    set({ shifts: next });
    persist(next);
  },

  setStatus(shiftId, status) {
    const next = patchShift(get().shifts, shiftId, { status });
    set({ shifts: next });
    persist(next);
  },

  incrementFilled(shiftId, delta) {
    const shift = get().getById(shiftId);
    if (!shift) return;
    const filled = Math.max(0, Math.min(shift.positionsTotal, shift.positionsFilled + delta));
    const status: ShiftStatus =
      filled >= shift.positionsTotal
        ? 'FullyBooked'
        : shift.status === 'FullyBooked'
        ? 'Published'
        : shift.status;
    const next = patchShift(get().shifts, shiftId, { positionsFilled: filled, status });
    set({ shifts: next });
    persist(next);
  },

  edit(shiftId, patch, when) {
    const shift = get().getById(shiftId);
    if (!shift) return { ok: false, error: 'NOT_FOUND' };
    if (!canEditShift(when ?? nowIso(), shift)) return { ok: false, error: 'TOO_LATE' };

    // Phase 6: prevent shrinking `positionsTotal` below the number of
    // applications already counted as approved/filled. Required so an
    // employer can't accidentally orphan approved workers.
    if (
      patch.positionsTotal !== undefined &&
      patch.positionsTotal < shift.positionsFilled
    ) {
      return { ok: false, error: 'POSITIONS_BELOW_FILLED' };
    }

    const next = patchShift(get().shifts, shiftId, patch);
    set({ shifts: next });
    persist(next);
    const updated = next.find((s) => s.id === shiftId)!;
    return { ok: true, value: updated };
  },

  cancel(shiftId, reason, when) {
    const shift = get().getById(shiftId);
    if (!shift) return { ok: false, error: 'NOT_FOUND' };

    // Phase 10A-Fix-7: reason is required. Trim before checking so a
    // whitespace-only string doesn't satisfy the gate. The error code
    // surfaces in the employer dialog so the field highlights.
    const trimmedReason = (reason ?? '').trim();
    if (trimmedReason === '') {
      return { ok: false, error: 'REASON_REQUIRED' };
    }

    // Phase 9G: applicant-aware cancellation rule.
    //
    //   - After shift start  → blocked unconditionally (TOO_LATE_STARTED).
    //   - Within 6h before start AND shift has any active applicant  → blocked
    //     (TOO_LATE_HAS_APPLICANTS).
    //   - Within 6h before start AND zero active applicants  → allowed.
    //   - More than 6h before start → allowed.
    const at = when ?? nowIso();
    const startMs = new Date(`${shift.date}T${shift.startTime}:00`).getTime();
    const nowMs = new Date(at).getTime();

    if (Number.isFinite(startMs) && Number.isFinite(nowMs)) {
      if (nowMs >= startMs) {
        return { ok: false, error: 'TOO_LATE_STARTED' };
      }
      const sixHoursMs = 6 * 60 * 60 * 1000;
      if (startMs - nowMs < sixHoursMs) {
        const apps = useApplicationStore.getState().applications;
        const hasActive = apps.some(
          (a) =>
            a.shiftId === shiftId &&
            (a.status === 'Pending' ||
              a.status === 'Approved' ||
              a.status === 'CancellationRequested' ||
              a.status === 'CheckedIn' ||
              a.status === 'CheckedOut'),
        );
        if (hasActive) {
          return { ok: false, error: 'TOO_LATE_HAS_APPLICANTS' };
        }
      }
    }

    // Terminal states are still off-limits — `Cancelled` / `Completed`
    // shouldn't be re-cancelled.
    if (shift.status === 'Cancelled' || shift.status === 'Completed') {
      return { ok: false, error: 'TOO_LATE_STARTED' };
    }

    // Phase 10A-Fix-7: compute the penalty + protection state BEFORE
    // mutating the application slice so we have a clean read of who
    // was approved at cancel time.
    const apps = useApplicationStore.getState().applications;
    const penalty = computeEmployerCancellationPenalty(shift, apps, nowMs);

    // Patch the shift with the new metadata + Cancelled status.
    const next = patchShift(get().shifts, shiftId, {
      status: 'Cancelled',
      escrowStatus: transitionEscrow(shift.escrowStatus, 'CancelShift'),
      cancelledAt: at,
      cancelledBy: 'employer',
      employerCancellationReason: trimmedReason,
      employerCancelledAfterApproval: penalty.afterApproval,
      employerCancellationPenaltyRate: penalty.rate,
      employerCancellationPenaltyAmount: penalty.amount,
    });
    set({ shifts: next });
    persist(next);
    const updated = next.find((s) => s.id === shiftId)!;

    // Phase 10A-Fix-7: orchestrate the side effects.
    applyEmployerCancellationSideEffects(updated, apps, at, trimmedReason);

    return { ok: true, value: updated };
  },

  useBoostCredit(shiftId) {
    const shift = get().getById(shiftId);
    if (!shift) return;
    const employer = useUserStore.getState().findById(shift.employerId);
    if (!employer || employer.role !== 'employer') return;
    if (employer.boostCredits <= 0) return;

    // Spend credit
    useUserStore.getState().updateUser(employer.id, { boostCredits: employer.boostCredits - 1 });

    // Mark shift as boosted
    const next = patchShift(get().shifts, shiftId, { boostedAt: nowIso() });
    set({ shifts: next });
    persist(next);
  },

  syncLifecycle(when) {
    // Phase 7: roll any time-driven status transitions forward. Reads
    // applications via lazy `getState()` so the cycle between
    // shiftStore and applicationStore stays in method bodies (modules
    // load fine — runtime calls are deferred until both are wired up).
    const at = when ?? nowIso();
    const apps = useApplicationStore.getState().applications;
    const result = runSyncLifecycle(get().shifts, apps, at);

    // Always stamp `lastLifecycleSyncAt` so the admin UI can show "đồng
    // bộ lúc …" even when nothing moved. Persist only when the shift
    // list actually changed to avoid unnecessary localStorage writes.
    if (result.changedIds.length === 0) {
      set({ lastLifecycleSyncAt: at });
    } else {
      set({ shifts: result.shifts, lastLifecycleSyncAt: at });
      persist(result.shifts);
    }
    return { changedIds: result.changedIds, syncedAt: at };
  },

  hydrate(shifts) {
    // Phase 10C — backfill `evidenceRequirement` on legacy seeded
    // shifts that pre-date the field so worker / employer surfaces
    // can rely on a non-undefined value. Uses
    // `suggestedEvidenceForJobType` so each backfilled shift gets a
    // sensible level instead of the hardest one. Idempotent: shifts
    // that already carry the field round-trip unchanged.
    const backfilled = shifts.map((s) =>
      s.evidenceRequirement
        ? s
        : {
            ...s,
            evidenceRequirement: suggestedEvidenceForJobType(s.jobType),
          },
    );
    set({ shifts: backfilled });
  },
}));

// ---------------------------------------------------------------------------
// Phase 10A-Fix-7 — employer cancellation side effects
// ---------------------------------------------------------------------------

/**
 * Orchestrate the post-cancel work outside the Zustand setter so the
 * shift slice stays focused on its own data. Mutates the application
 * slice (status flips), worker records (protection credit), and
 * notification slice. Persistence happens inside each slice's helper.
 */
function applyEmployerCancellationSideEffects(
  shift: Shift,
  applicationsBefore: Application[],
  occurredAt: string,
  reason: string,
): void {
  const userStore = useUserStore.getState();
  const applicationStore = useApplicationStore.getState();
  const notificationStore = useNotificationStore.getState();

  const employer = asEmployer(userStore.findById(shift.employerId));
  const employerName = employer?.companyName ?? 'Nhà tuyển dụng';

  // Snapshot the applications belonging to this shift in the order the
  // employer sees them. We bucket into:
  //   - approved (or later) → flip status, credit protection, notify.
  //   - pending             → leave status untouched; notify only.
  //   - terminal (Rejected / CancelledByWorker / NoShow) → skip.
  const ourApps = applicationsBefore.filter((a) => a.shiftId === shift.id);
  const affected: Application[] = [];
  const pendingOnly: Application[] = [];
  for (const a of ourApps) {
    if (AFFECTED_APPLICATION_STATUSES.has(a.status)) {
      affected.push(a);
    } else if (a.status === 'Pending') {
      pendingOnly.push(a);
    }
  }

  // 1. Flip affected applications to `'CancelledByEmployer'`. We
  //    intentionally do not call `applicationStore.cancelByWorker` here
  //    — that would mark the worker as the canceller and tick the
  //    weekly quota, which is precisely what Fix-7 forbids. We
  //    rebuild the application slice in place and persist via the
  //    store's existing setter helper.
  if (affected.length > 0) {
    const affectedIds = new Set(affected.map((a) => a.id));
    const updatedApps = applicationStore.applications.map((a) =>
      affectedIds.has(a.id)
        ? ({
            ...a,
            status: 'CancelledByEmployer' as ApplicationStatus,
            cancelledAt: occurredAt,
            cancellationReasonNote: reason,
          } satisfies Application)
        : a,
    );
    // Use the store's hydrate path: it both replaces state AND
    // triggers a persist write via `applicationStore.hydrate` callers.
    // The application store doesn't expose a public bulk-mutate, so we
    // do it through `setState` directly. The slice's own persist
    // helpers are only called inside store actions; since we're
    // bypassing those, we write directly using the storage key.
    useApplicationStore.setState({ applications: updatedApps });
    write(STORAGE_KEYS.applications, updatedApps);
  }

  // 2. Credit each affected worker with a protection record + reputation
  //    bump + late-cancel quota refund. `userStore.updateUser` already
  //    persists. Phase 10A-Fix-8: collect each protection record so the
  //    notification body can quote the worker's actual delta numbers.
  const protectionByWorker = new Map<
    string,
    { reputationDelta: number; quotaDelta: number }
  >();
  for (const a of affected) {
    const user = userStore.findById(a.workerId);
    if (!user || user.role !== 'worker') continue;
    const worker = user as Worker;
    const built = buildWorkerProtection({
      worker,
      shift,
      employerName,
      reason,
      occurredAt,
    });
    const refundedHistory =
      built.record.quotaSlotsRefunded > 0
        ? refundOneLateCancel(worker.cancellationHistory)
        : worker.cancellationHistory;
    userStore.updateUser(worker.id, {
      reputationScore: built.patch.reputationScore,
      protections: built.patch.protections,
      cancellationHistory: refundedHistory,
    } satisfies Partial<Worker>);
    protectionByWorker.set(a.workerId, {
      reputationDelta: built.record.reputationPointsRestored,
      quotaDelta: built.record.quotaSlotsRefunded,
    });
  }

  // 3. Notify every affected worker with the protection-aware copy +
  //    a deep link to the shift detail (where the cancellation reason
  //    + protection note now render). Phase 10A-Fix-8 — body quotes
  //    the actual deltas applied to that specific worker.
  for (const a of affected) {
    const deltas = protectionByWorker.get(a.workerId) ?? {
      reputationDelta: 0,
      quotaDelta: 0,
    };
    const protectionLine = formatProtectionDeltas(
      deltas.reputationDelta,
      deltas.quotaDelta,
    );
    notificationStore.push({
      userId: a.workerId,
      kind: 'EmployerCancelledShift',
      title: 'Ca làm đã bị hủy bởi nhà tuyển dụng',
      body: `${shift.title} đã bị hủy. Lý do: ${reason}. Bạn không bị phạt. ${protectionLine}`,
      link: `/shifts/${shift.id}`,
    });
  }

  // 4. Notify Pending-only applicants so they know not to wait. They
  //    receive no protection credit because they were never approved.
  for (const a of pendingOnly) {
    notificationStore.push({
      userId: a.workerId,
      kind: 'ShiftCancelled',
      title: 'Ca làm đã bị hủy',
      body: `${shift.title} đã bị hủy. Đơn ứng tuyển của bạn không còn áp dụng.`,
      link: '/shifts',
    });
  }
}

/**
 * Phase 10A-Fix-8 — render the worker-side protection summary as a
 * single Vietnamese sentence that names the actual deltas applied.
 * When both deltas are zero (the worker was already at the rep cap
 * AND had no late-cancel slot to refund) we still confirm the
 * protection record was created so the notification reads consistently.
 */
function formatProtectionDeltas(
  reputationDelta: number,
  quotaDelta: number,
): string {
  const parts: string[] = [];
  if (reputationDelta > 0) parts.push(`+${reputationDelta} uy tín`);
  if (quotaDelta > 0) parts.push(`+${quotaDelta} lượt hủy được hoàn lại`);
  if (parts.length === 0) {
    return 'Hệ thống đã ghi nhận bảo vệ quyền lợi cho bạn.';
  }
  return `Hệ thống đã ghi nhận bảo vệ quyền lợi: ${parts.join(' / ')}.`;
}
