/**
 * Phase 10A-Fix-7 — employer cancellation: required reason, worker
 * protection, employer penalty, and store side-effect orchestration.
 *
 * Pins down:
 *   - `shiftStore.cancel` rejects empty / whitespace-only reasons.
 *   - `computeEmployerCancellationPenalty` tiers (5 / 10 / 15%) match
 *     the time-window rules in the spec.
 *   - Employer cancellation flips affected applications to
 *     `'CancelledByEmployer'` (NOT `'CancelledByWorker'`).
 *   - Worker reputation goes UP, not down. Quota refunds when the
 *     worker had a recent late-cancel; protection record is appended
 *     either way.
 *   - Notification fan-out fires per affected worker.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  AFFECTED_APPLICATION_STATUSES,
  computeEmployerCancellationPenalty,
  buildWorkerProtection,
  refundOneLateCancel,
} from '@/domain/employerCancellation';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Application,
  CancellationRecord,
  Employer,
  Shift,
  Worker,
} from '@/types';

const NOW_ISO = '2026-06-01T08:00:00.000Z';
const NOW_MS = new Date(NOW_ISO).getTime();

/**
 * Build a `'YYYY-MM-DD'` + `'HH:mm'` pair that, when re-parsed by the
 * helper as local time, lands exactly `offsetMs` ahead of `NOW_MS`.
 * This sidesteps the pre-existing mock-data convention of storing
 * shift date / time as bare strings (which the helper interprets as
 * the test machine's local timezone).
 */
function localDateTimeFromOffset(offsetMs: number): {
  date: string;
  startTime: string;
} {
  const d = new Date(NOW_MS + offsetMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, startTime: `${hh}:${mi}` };
}

function makeShift(override: Partial<Shift> = {}): Shift {
  // Default: 2 days in the future, 3 seats, 600k deposit.
  const future = localDateTimeFromOffset(2 * 24 * 60 * 60 * 1000);
  return {
    id: 's1',
    employerId: 'employer-1',
    title: 'Phục vụ tiệc cưới',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: future.date,
    startTime: future.startTime,
    endTime: '14:00',
    hourlyWage: 50_000,
    positionsTotal: 3,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 600_000,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...override,
  };
}

function makeWorker(id: string, override: Partial<Worker> = {}): Worker {
  return {
    id,
    role: 'worker',
    email: `${id}@example.com`,
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    fullName: id,
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 80,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
    ...override,
  };
}

function makeEmployer(): Employer {
  return {
    id: 'employer-1',
    role: 'employer',
    email: 'e@example.com',
    phone: '+84902000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    companyName: 'Quán A',
    businessType: 'Nhà hàng',
    verifiedBusiness: false,
    boostCredits: 0,
  };
}

function makeApp(
  shiftId: string,
  workerId: string,
  status: Application['status'],
): Application {
  return {
    id: `app-${shiftId}-${workerId}-${status}`,
    shiftId,
    workerId,
    status,
    appliedAt: '2026-05-15T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('computeEmployerCancellationPenalty — Phase 10A-Fix-7', () => {
  const HOUR_MS = 60 * 60 * 1000;

  it('returns 0 / 0 when no worker was ever approved', () => {
    const shift = makeShift();
    const apps: Application[] = [makeApp('s1', 'w1', 'Pending')];
    const r = computeEmployerCancellationPenalty(shift, apps, NOW_MS);
    expect(r.afterApproval).toBe(false);
    expect(r.rate).toBe(0);
    expect(r.amount).toBe(0);
  });

  it('charges 5% when more than 24h before start', () => {
    const future = localDateTimeFromOffset(48 * HOUR_MS);
    const shift = makeShift({
      date: future.date,
      startTime: future.startTime,
    });
    const apps: Application[] = [makeApp('s1', 'w1', 'Approved')];
    const r = computeEmployerCancellationPenalty(shift, apps, NOW_MS);
    expect(r.rate).toBe(0.05);
    expect(r.amount).toBe(Math.round(shift.depositAmount * 0.05));
    expect(r.afterApproval).toBe(true);
  });

  it('charges 10% when within 24h but more than 6h before start', () => {
    // 12h ahead.
    const future = localDateTimeFromOffset(12 * HOUR_MS);
    const shift = makeShift({
      date: future.date,
      startTime: future.startTime,
    });
    const apps: Application[] = [makeApp(shift.id, 'w1', 'Approved')];
    const r = computeEmployerCancellationPenalty(shift, apps, NOW_MS);
    expect(r.rate).toBe(0.1);
  });

  it('charges 15% when within 6h before start', () => {
    const future = localDateTimeFromOffset(3 * HOUR_MS);
    const shift = makeShift({
      date: future.date,
      startTime: future.startTime,
    });
    const apps: Application[] = [makeApp(shift.id, 'w1', 'CheckedIn')];
    const r = computeEmployerCancellationPenalty(shift, apps, NOW_MS);
    expect(r.rate).toBe(0.15);
  });
});

describe('buildWorkerProtection — Phase 10A-Fix-7', () => {
  it('reputation bump caps at 100', () => {
    const worker = makeWorker('w1', { reputationScore: 99 });
    const built = buildWorkerProtection({
      worker,
      shift: makeShift(),
      employerName: 'Quán A',
      reason: 'lý do',
      occurredAt: NOW_ISO,
    });
    expect(built.record.reputationPointsRestored).toBe(1);
    expect(built.patch.reputationScore).toBe(100);
  });

  it('reputation bump = 0 when worker is already at the cap', () => {
    const worker = makeWorker('w1', { reputationScore: 100 });
    const built = buildWorkerProtection({
      worker,
      shift: makeShift(),
      employerName: 'Quán A',
      reason: 'lý do',
      occurredAt: NOW_ISO,
    });
    expect(built.record.reputationPointsRestored).toBe(0);
    expect(built.patch.reputationScore).toBe(100);
  });

  it('quota refund = 1 when worker has a recent LateCancel; 0 otherwise', () => {
    const withCancel = makeWorker('w1', {
      cancellationHistory: [
        {
          id: 'c1',
          shiftId: 's0',
          cancelledAt: '2026-05-30T00:00:00.000Z',
          type: 'LateCancel',
        },
      ],
    });
    const builtWith = buildWorkerProtection({
      worker: withCancel,
      shift: makeShift(),
      employerName: 'A',
      reason: 'r',
      occurredAt: NOW_ISO,
    });
    expect(builtWith.record.quotaSlotsRefunded).toBe(1);

    const without = makeWorker('w2');
    const builtWithout = buildWorkerProtection({
      worker: without,
      shift: makeShift(),
      employerName: 'A',
      reason: 'r',
      occurredAt: NOW_ISO,
    });
    expect(builtWithout.record.quotaSlotsRefunded).toBe(0);
  });
});

describe('refundOneLateCancel — Phase 10A-Fix-7', () => {
  it('drops the most recent LateCancel and leaves OnTime entries alone', () => {
    const history: CancellationRecord[] = [
      {
        id: 'c1',
        shiftId: 's0',
        cancelledAt: '2026-05-20T00:00:00.000Z',
        type: 'OnTime',
      },
      {
        id: 'c2',
        shiftId: 's1',
        cancelledAt: '2026-05-25T00:00:00.000Z',
        type: 'LateCancel',
      },
      {
        id: 'c3',
        shiftId: 's2',
        cancelledAt: '2026-05-30T00:00:00.000Z',
        type: 'LateCancel',
      },
    ];
    const next = refundOneLateCancel(history);
    expect(next.find((c) => c.id === 'c3')).toBeUndefined();
    expect(next.find((c) => c.id === 'c2')).toBeDefined();
    expect(next.find((c) => c.id === 'c1')).toBeDefined();
  });

  it('returns an unchanged list when no LateCancel exists', () => {
    const history: CancellationRecord[] = [
      {
        id: 'c1',
        shiftId: 's0',
        cancelledAt: '2026-05-20T00:00:00.000Z',
        type: 'OnTime',
      },
    ];
    expect(refundOneLateCancel(history)).toHaveLength(1);
  });
});

describe('AFFECTED_APPLICATION_STATUSES contents', () => {
  it('contains every status that should flip to CancelledByEmployer', () => {
    expect([...AFFECTED_APPLICATION_STATUSES]).toEqual(
      expect.arrayContaining([
        'Approved',
        'CancellationRequested',
        'CheckedIn',
        'CheckedOut',
        'Confirmed',
      ]),
    );
    // Pending must NOT be in this set — the helper filters it
    // separately and never marks pending applicants as protected.
    expect(AFFECTED_APPLICATION_STATUSES.has('Pending')).toBe(false);
    expect(AFFECTED_APPLICATION_STATUSES.has('Rejected')).toBe(false);
    expect(AFFECTED_APPLICATION_STATUSES.has('CancelledByWorker')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Store integration
// ---------------------------------------------------------------------------

describe('shiftStore.cancel — Phase 10A-Fix-7 store orchestration', () => {
  function resetAll() {
    useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [] });
    useNotificationStore.setState({ notifications: [] });
  }

  beforeEach(resetAll);

  // Freeze the clock at NOW_ISO so `cancel(...)` evaluates the future-dated
  // fixtures against the same fixed "now" they were built around, instead of
  // the drifting wall clock (which would trip TOO_LATE_STARTED first).
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects empty / whitespace-only reasons with REASON_REQUIRED', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({ users: [makeEmployer()] });

    const r1 = useShiftStore.getState().cancel(shift.id, '');
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toBe('REASON_REQUIRED');

    const r2 = useShiftStore.getState().cancel(shift.id, '   ');
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe('REASON_REQUIRED');
  });

  it('flips affected workers to CancelledByEmployer (NOT CancelledByWorker) and credits protection', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });

    const worker = makeWorker('w1', {
      reputationScore: 80,
      cancellationHistory: [
        {
          id: 'c1',
          shiftId: 's0',
          cancelledAt: '2026-05-30T00:00:00.000Z',
          type: 'LateCancel',
        },
      ],
    });
    const otherWorker = makeWorker('w2');
    useUserStore.setState({ users: [makeEmployer(), worker, otherWorker] });

    useApplicationStore.setState({
      applications: [
        makeApp(shift.id, 'w1', 'Approved'),
        // Pending applicant — gets a notification but no protection.
        makeApp(shift.id, 'w2', 'Pending'),
      ],
      ratings: [],
      disputes: [],
    });

    const result = useShiftStore
      .getState()
      .cancel(shift.id, 'Đột xuất hủy ca');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Application status flipped (NOT CancelledByWorker).
    const apps = useApplicationStore.getState().applications;
    const w1App = apps.find((a) => a.workerId === 'w1');
    expect(w1App?.status).toBe('CancelledByEmployer');
    expect(w1App?.cancellationReasonNote).toBe('Đột xuất hủy ca');
    // Pending applicant stays Pending — not converted.
    const w2App = apps.find((a) => a.workerId === 'w2');
    expect(w2App?.status).toBe('Pending');

    // Worker reputation went UP (was 80, +2 protection bump).
    const updatedWorker = useUserStore.getState().findById('w1') as Worker;
    expect(updatedWorker.reputationScore).toBe(82);
    // LateCancel slot refunded.
    expect(updatedWorker.cancellationHistory).toHaveLength(0);
    // Protection record appended.
    expect(updatedWorker.protections).toHaveLength(1);
    expect(updatedWorker.protections?.[0].kind).toBe('EmployerCancelledShift');

    // Other worker (Pending) gets no protection record.
    const otherUpdated = useUserStore.getState().findById('w2') as Worker;
    expect(otherUpdated.protections ?? []).toHaveLength(0);

    // Notifications fired for both workers (one EmployerCancelledShift,
    // one ShiftCancelled).
    const notifications = useNotificationStore.getState().notifications;
    const w1Notifs = notifications.filter((n) => n.userId === 'w1');
    const w2Notifs = notifications.filter((n) => n.userId === 'w2');
    expect(w1Notifs).toHaveLength(1);
    expect(w1Notifs[0].kind).toBe('EmployerCancelledShift');
    expect(w1Notifs[0].body).toContain('Đột xuất hủy ca');
    expect(w2Notifs).toHaveLength(1);
    expect(w2Notifs[0].kind).toBe('ShiftCancelled');

    // Shift carries the cancellation metadata.
    const updatedShift = useShiftStore.getState().getById(shift.id);
    expect(updatedShift?.status).toBe('Cancelled');
    expect(updatedShift?.cancelledBy).toBe('employer');
    expect(updatedShift?.employerCancelledAfterApproval).toBe(true);
    expect(updatedShift?.employerCancellationReason).toBe('Đột xuất hủy ca');
    expect(
      updatedShift?.employerCancellationPenaltyAmount ?? 0,
    ).toBeGreaterThan(0);
  });

  it('records penalty 0 / afterApproval false when no worker was ever approved', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({ users: [makeEmployer(), makeWorker('w1')] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Pending')],
      ratings: [],
      disputes: [],
    });

    const result = useShiftStore.getState().cancel(shift.id, 'Lý do');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.employerCancelledAfterApproval).toBe(false);
    expect(result.value.employerCancellationPenaltyAmount).toBe(0);
    expect(result.value.employerCancellationPenaltyRate).toBe(0);
  });
});
