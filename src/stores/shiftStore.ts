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
import { transitionEscrow } from '@/domain/escrow';
import { applyFilters, type FilterCriteria } from '@/domain/filter';
import { syncLifecycle as runSyncLifecycle } from '@/domain/shiftLifecycle';
import { canEditShift } from '@/domain/timeGates';
import { newPrefixedId } from '@/lib/ids';
import type { Result, Shift, ShiftStatus } from '@/types';

import { useApplicationStore } from './applicationStore';
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
  | 'TOO_LATE_HAS_APPLICANTS';
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
  cancel(shiftId: string, nowIso?: string): Result<Shift, CancelError>;
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

  cancel(shiftId, when) {
    const shift = get().getById(shiftId);
    if (!shift) return { ok: false, error: 'NOT_FOUND' };

    // Phase 9G: applicant-aware cancellation rule.
    //
    //   - After shift start  → blocked unconditionally (TOO_LATE_STARTED).
    //   - Within 6h before start AND shift has any active applicant  → blocked
    //     (TOO_LATE_HAS_APPLICANTS).
    //   - Within 6h before start AND zero active applicants  → allowed.
    //   - More than 6h before start → allowed.
    //
    // "Active applicant" = any application in a state that still occupies
    // a slot or expects employer action: Pending, Approved,
    // CancellationRequested, CheckedIn, CheckedOut. Rejected /
    // CancelledByWorker / NoShow / Confirmed are skipped — those workers
    // have already exited the lifecycle.
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
    // shouldn't be re-cancelled. The pre-9G `canCancelShift` enforced
    // this; we keep the equivalent guard inline here.
    if (shift.status === 'Cancelled' || shift.status === 'Completed') {
      return { ok: false, error: 'TOO_LATE_STARTED' };
    }

    const next = patchShift(get().shifts, shiftId, {
      status: 'Cancelled',
      escrowStatus: transitionEscrow(shift.escrowStatus, 'CancelShift'),
    });
    set({ shifts: next });
    persist(next);
    const updated = next.find((s) => s.id === shiftId)!;
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
    set({ shifts });
  },
}));
