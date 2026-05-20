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
import { transitionEscrow } from '@/domain/escrow';
import { applyFilters, type FilterCriteria } from '@/domain/filter';
import { canCancelShift, canEditShift } from '@/domain/timeGates';
import { newPrefixedId } from '@/lib/ids';
import type { Result, Shift, ShiftStatus } from '@/types';

import { useUserStore } from './userStore';

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

export type CancelError = 'NOT_FOUND' | 'TOO_LATE';
export type EditError = 'NOT_FOUND' | 'TOO_LATE';

interface ShiftStore {
  shifts: Shift[];

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
    const depositAmount = calculateDeposit(input.hourlyWage, hours, input.positionsTotal);
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

    const next = patchShift(get().shifts, shiftId, patch);
    set({ shifts: next });
    persist(next);
    const updated = next.find((s) => s.id === shiftId)!;
    return { ok: true, value: updated };
  },

  cancel(shiftId, when) {
    const shift = get().getById(shiftId);
    if (!shift) return { ok: false, error: 'NOT_FOUND' };
    if (!canCancelShift(when ?? nowIso(), shift)) return { ok: false, error: 'TOO_LATE' };

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

  hydrate(shifts) {
    set({ shifts });
  },
}));
