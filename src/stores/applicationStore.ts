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
import { hasConflict, type TimeRange } from '@/domain/conflict';
import { calculateDeposit, hoursBetween } from '@/domain/deposit';
import { transitionEscrow } from '@/domain/escrow';
import {
  applyReputationEvent,
  canApplyToShifts,
  classifyCancellation,
} from '@/domain/reputation';
import { newPrefixedId } from '@/lib/ids';
import type {
  Application,
  ApplicationStatus,
  CancellationRecord,
  Dispute,
  Rating,
  Result,
  Worker,
} from '@/types';

import { useNotificationStore } from './notificationStore';
import { useShiftStore } from './shiftStore';
import { asWorker, useUserStore } from './userStore';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ApplyError =
  | 'VERIFICATION_REQUIRED'
  | 'REPUTATION_TOO_LOW'
  | 'CONFLICT'
  | 'FULLY_BOOKED'
  | 'ALREADY_APPLIED'
  | 'SHIFT_NOT_FOUND'
  | 'WORKER_NOT_FOUND'
  | 'NOT_PUBLISHED';

export type ApplicationActionError =
  | 'APPLICATION_NOT_FOUND'
  | 'WRONG_STATUS';

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
  cancelByWorker(applicationId: string, nowIso?: string): Result<Application, ApplicationActionError>;
  checkIn(applicationId: string): Result<Application, ApplicationActionError>;
  checkOut(applicationId: string): Result<Application, ApplicationActionError>;

  // Employer actions
  approve(applicationId: string): Result<Application, ApplicationActionError>;
  reject(applicationId: string): Result<Application, ApplicationActionError>;
  confirmCompletion(
    applicationId: string,
    rating: NewRating,
  ): Result<Application, ApplicationActionError>;
  reportIssue(
    applicationId: string,
    reason: string,
  ): Result<Application, ApplicationActionError>;
  markNoShow(applicationId: string): Result<Application, ApplicationActionError>;

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

function shiftToTimeRange(shiftId: string): TimeRange | undefined {
  const shift = useShiftStore.getState().getById(shiftId);
  if (!shift) return undefined;
  return { date: shift.date, startTime: shift.startTime, endTime: shift.endTime };
}

const ACTIVE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'Approved',
  'CheckedIn',
  'CheckedOut',
  'Confirmed',
]);

function approvedRangesForWorker(workerId: string, applications: Application[]): TimeRange[] {
  return applications
    .filter((a) => a.workerId === workerId && ACTIVE_STATUSES.has(a.status))
    .map((a) => shiftToTimeRange(a.shiftId))
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
    if (target && hasConflict(target, approvedRangesForWorker(workerId, all))) {
      return { ok: false, error: 'CONFLICT' };
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

    return { ok: true, value: application };
  },

  cancelByWorker(applicationId, when) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Pending' && app.status !== 'Approved') {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const cancelledAt = when ?? nowIso();
    const shift = useShiftStore.getState().getById(app.shiftId);
    const cls = shift
      ? classifyCancellation(app.status, `${shift.date}T${shift.startTime}:00`, cancelledAt)
      : 'NoPenalty';

    const cancelReason: CancellationRecord['type'] | undefined =
      cls === 'NoPenalty' ? undefined : (cls as CancellationRecord['type']);

    const updated: Application = {
      ...app,
      status: 'CancelledByWorker',
      cancelledAt,
      cancelReason,
    };

    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    // Free the position if it was approved.
    if (app.status === 'Approved') {
      useShiftStore.getState().incrementFilled(app.shiftId, -1);
    }

    // Apply reputation penalty for late cancels.
    if (cls === 'LateCancel') {
      patchWorkerScore(app.workerId, (worker) => {
        const newScore = applyReputationEvent(worker.reputationScore, { kind: 'LateCancel' });
        const record: CancellationRecord = {
          id: newPrefixedId('cancel'),
          shiftId: app.shiftId,
          cancelledAt,
          type: 'LateCancel',
        };
        return {
          reputationScore: newScore,
          cancellationHistory: [...worker.cancellationHistory, record],
        };
      });

      if (shift) {
        useNotificationStore.getState().push({
          userId: shift.employerId,
          kind: 'LateCancel',
          title: 'Người làm huỷ muộn',
          body: `Một người làm vừa huỷ ca "${shift.title}" trong vòng 24h trước giờ bắt đầu.`,
          link: `/employer/shifts/${shift.id}`,
        });
      }
    }

    return { ok: true, value: updated };
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

    return { ok: true, value: updated };
  },

  checkOut(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'CheckedIn') return { ok: false, error: 'WRONG_STATUS' };

    const updated: Application = { ...app, status: 'CheckedOut', checkOutAt: nowIso() };
    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    const shift = useShiftStore.getState().getById(app.shiftId);
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
      link: '/worker/dashboard',
    });

    return { ok: true, value: updated };
  },

  reject(applicationId) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'Pending') return { ok: false, error: 'WRONG_STATUS' };

    const updated: Application = { ...app, status: 'Rejected' };
    const next = get().applications.map((a) => (a.id === applicationId ? updated : a));
    set({ applications: next });
    persistApplications(next);

    const shift = useShiftStore.getState().getById(app.shiftId);
    useNotificationStore.getState().push({
      userId: app.workerId,
      kind: 'ApplicationRejected',
      title: 'Đơn ứng tuyển bị từ chối',
      body: shift
        ? `Đơn ứng tuyển ca "${shift.title}" của bạn đã bị từ chối.`
        : 'Đơn ứng tuyển của bạn đã bị từ chối.',
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
    patchWorkerScore(app.workerId, (worker) => ({
      reputationScore: applyReputationEvent(worker.reputationScore, { kind: 'Completed' }),
      completedShiftCount: worker.completedShiftCount + 1,
      ratingsReceived: [...worker.ratingsReceived, newRating],
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
      link: '/worker/dashboard',
    });

    return { ok: true, value: updated };
  },

  reportIssue(applicationId, reason) {
    const app = get().getById(applicationId);
    if (!app) return { ok: false, error: 'APPLICATION_NOT_FOUND' };
    if (app.status !== 'CheckedOut') return { ok: false, error: 'WRONG_STATUS' };

    const shift = useShiftStore.getState().getById(app.shiftId);
    if (!shift) return { ok: false, error: 'APPLICATION_NOT_FOUND' };

    const ts = nowIso();
    const dispute: Dispute = {
      id: newPrefixedId('dispute'),
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason,
      status: 'Open',
      createdAt: ts,
    };
    const disputes = [...get().disputes, dispute];
    set({ disputes });
    persistDisputes(disputes);

    // Escrow: Completed -> Disputed (Req 9.5)
    const shifts = useShiftStore.getState().shifts.map((s) =>
      s.id === shift.id
        ? { ...s, escrowStatus: transitionEscrow(s.escrowStatus, 'EmployerReportIssue') }
        : s,
    );
    useShiftStore.getState().hydrate(shifts);
    write(STORAGE_KEYS.shifts, shifts);

    return { ok: true, value: app };
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
      link: '/worker/profile',
    });

    return { ok: true, value: updated };
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
