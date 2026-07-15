/**
 * Phase 10C-Stabilization-1 Batch 3 — 100% deposit policy, schedule
 * overlap buffer removal, shift display phase, mark-present idempotency,
 * admin dispute resolution propagation, employer expiry notifications,
 * repost-no-draft contract, worker dispute response, and worker
 * application state derivation.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  DEPOSIT_RATIO,
  depositForTrust,
} from '@/domain/employerTrust';
import { hasConflict } from '@/domain/conflict';
import {
  getShiftDisplayPhase,
  suggestShiftStatus,
} from '@/domain/shiftLifecycle';
import { canEmployerMarkAbsent } from '@/domain/timeGates';
import { getWorkerApplicationStateForShift } from '@/domain/workerApplicationState';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useVerificationStore } from '@/stores/verificationStore';
import { useAdminStore } from '@/stores/adminStore';
import type {
  Application,
  Dispute,
  Employer,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ANCHOR_MS = 1_750_000_000_000;
const ANCHOR_ISO = new Date(ANCHOR_MS).toISOString();

function buildShift(override: Partial<Shift> = {}): Shift {
  return {
    id: 's-test',
    employerId: 'e1',
    title: 'Phục vụ tiệc',
    description: 'desc',
    requirements: 'req',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: '2030-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 1,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: ANCHOR_ISO,
    updatedAt: ANCHOR_ISO,
    evidenceRequirement: 'OptionalPhoto',
    ...override,
  };
}

function buildApp(
  shiftId: string,
  workerId: string,
  override: Partial<Application> = {},
): Application {
  return {
    id: `app-${shiftId}-${workerId}`,
    shiftId,
    workerId,
    status: 'Approved',
    appliedAt: '2030-05-15T00:00:00.000Z',
    approvedAt: '2030-05-16T00:00:00.000Z',
    payoutAmount: 200_000,
    ...override,
  };
}

function buildWorker(id: string): Worker {
  return {
    id,
    role: 'worker',
    email: `${id}@example.com`,
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2030-05-01T00:00:00.000Z',
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
  };
}

function buildEmployer(override: Partial<Employer> = {}): Employer {
  return {
    id: 'e1',
    role: 'employer',
    email: 'e@example.com',
    phone: '+84902000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2030-05-01T00:00:00.000Z',
    companyName: 'Quán A',
    businessType: 'Nhà hàng',
    verifiedBusiness: true,
    boostCredits: 0,
    employerType10A: 'HouseholdBusiness',
    ...override,
  };
}

function resetStores() {
  useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
  useApplicationStore.setState({
    applications: [],
    ratings: [],
    disputes: [],
  });
  useUserStore.setState({ users: [] });
  useNotificationStore.setState({ notifications: [] });
  useVerificationStore.setState({
    workerDocuments: [],
    employerDocuments: [],
    typeChangeRequests: [],
  });
}

// ---------------------------------------------------------------------------
// G — 100% deposit policy
// ---------------------------------------------------------------------------

describe('Batch 3 G: 100% deposit policy', () => {
  it('low tier returns wagePerWorker * positionsTotal', () => {
    expect(DEPOSIT_RATIO.low).toBe(1.0);
    expect(depositForTrust(100_000, 3, 'low')).toBe(300_000);
  });

  it('medium tier returns wagePerWorker * positionsTotal', () => {
    expect(DEPOSIT_RATIO.medium).toBe(1.0);
    expect(depositForTrust(100_000, 3, 'medium')).toBe(300_000);
  });

  it('high tier returns wagePerWorker * positionsTotal', () => {
    expect(DEPOSIT_RATIO.high).toBe(1.0);
    expect(depositForTrust(100_000, 3, 'high')).toBe(300_000);
  });
});

// ---------------------------------------------------------------------------
// H — schedule overlap buffer removed
// ---------------------------------------------------------------------------

describe('Batch 3 H: schedule overlap buffer removed', () => {
  it('back-to-back ranges 12:40-12:45 vs 13:40-13:45 → no conflict', () => {
    const target = {
      date: '2030-06-02',
      startTime: '12:40',
      endTime: '12:45',
    };
    const approved = [
      { date: '2030-06-02', startTime: '13:40', endTime: '13:45' },
    ];
    expect(hasConflict(target, approved)).toBe(false);
  });

  it('actually overlapping ranges 12:40-13:45 vs 13:40-13:45 → conflict', () => {
    const target = {
      date: '2030-06-02',
      startTime: '12:40',
      endTime: '13:45',
    };
    const approved = [
      { date: '2030-06-02', startTime: '13:40', endTime: '13:45' },
    ];
    expect(hasConflict(target, approved)).toBe(true);
  });

  it('exact same range 12:40-12:45 vs 12:40-12:45 → conflict', () => {
    const target = {
      date: '2030-06-02',
      startTime: '12:40',
      endTime: '12:45',
    };
    const approved = [
      { date: '2030-06-02', startTime: '12:40', endTime: '12:45' },
    ];
    expect(hasConflict(target, approved)).toBe(true);
  });

  it('empty approved list → false', () => {
    const target = {
      date: '2030-06-02',
      startTime: '12:40',
      endTime: '12:45',
    };
    expect(hasConflict(target, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C — shift display phase + suggestShiftStatus tightening
// ---------------------------------------------------------------------------

// Helper: build a local-time anchored shift + ISO instants. The
// shift store interprets `date`/`startTime`/`endTime` as LOCAL time
// (no `Z` suffix), so the test must construct `now` from the same
// local-time reference for the wall-clock comparison to land on the
// expected branch.
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function buildLocalShift(
  startDate: Date,
  endDate: Date,
  override: Partial<Shift> = {},
): Shift {
  return buildShift({
    date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
    ...override,
  });
}

describe('Batch 3 C: shift display phase', () => {
  // Build a shift starting 12:02–13:00 local on a fixed anchor day
  // so we can probe `now` against multiple wall-clock anchors.
  const baseStart = new Date(ANCHOR_MS);
  baseStart.setHours(12, 2, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 58 * 60_000);
  const shift = buildLocalShift(baseStart, baseEnd, {
    status: 'Published',
  });

  it('returns CheckInOpen at 12:01 with no check-in', () => {
    const now = new Date(baseStart.getTime() - 60_000).toISOString();
    expect(getShiftDisplayPhase(shift, [], now)).toBe('CheckInOpen');
  });

  it('returns InProgress at 12:02 with no check-in (recruiting window closed)', () => {
    // CORE-STABILITY-8 Part 3 — once the start time is reached the
    // shift reads as "Đang diễn ra" regardless of check-in (presence
    // is a separate, application-level fact). It must NEVER keep
    // showing "Sắp tới / Đang tuyển" after it has begun.
    const now = baseStart.toISOString();
    expect(getShiftDisplayPhase(shift, [], now)).toBe('InProgress');
  });

  it('returns InProgress at 12:02 with one CheckedIn application', () => {
    const app = buildApp(shift.id, 'w1', { status: 'CheckedIn' });
    const now = baseStart.toISOString();
    expect(getShiftDisplayPhase(shift, [app], now)).toBe('InProgress');
  });

  it('returns Upcoming at 13:00:00 (end) with no apps', () => {
    // Phase 10C-Stab-1 Batch 4 B — `'Ended'` was retired in favor of
    // `'AwaitingWorkerCheckout' | 'AwaitingEmployerConfirmation' |
    // 'Completed' | 'Expired'`. With no apps + no shift status flip
    // we have no signal that anyone needs to act, so the phase falls
    // back to `'Upcoming'`. The lifecycle sync rolls Shift.status
    // forward to `'Expired'` separately.
    const now = baseEnd.toISOString();
    expect(getShiftDisplayPhase(shift, [], now)).toBe('Upcoming');
  });

  it('returns Cancelled when shift.status === Cancelled', () => {
    const cancelled = { ...shift, status: 'Cancelled' as const };
    const now = baseStart.toISOString();
    expect(getShiftDisplayPhase(cancelled, [], now)).toBe('Cancelled');
  });
});

describe('Batch 3 C: suggestShiftStatus promotes to InProgress at start (recruiting closed)', () => {
  // Use positionsTotal: 2, positionsFilled: 0 so the lifecycle's
  // FullyBooked auto-promotion (when filled === total) doesn't fire
  // before we even reach the "before/after start" branch we're testing.
  const baseStart = new Date(ANCHOR_MS);
  baseStart.setHours(12, 2, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 58 * 60_000);
  const shift = buildLocalShift(baseStart, baseEnd, {
    status: 'Published',
    positionsTotal: 2,
    positionsFilled: 0,
  });

  it('Approved-only roster at 12:01 (before start) stays Published', () => {
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    const now = new Date(baseStart.getTime() - 60_000).toISOString();
    expect(suggestShiftStatus(shift, [app], now)).toBe('Published');
  });

  it('Approved-only roster at 12:02 (after start) rolls to InProgress (CORE-STABILITY-8 Part 3)', () => {
    // The recruiting window closes at start; an active (Approved+)
    // roster rolls the shift to InProgress so it never keeps showing
    // "Đang tuyển" after start. Presence is tracked separately.
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    const now = baseStart.toISOString();
    expect(suggestShiftStatus(shift, [app], now)).toBe('InProgress');
  });

  it('CheckedIn roster at 12:02:00 advances to InProgress', () => {
    const app = buildApp(shift.id, 'w1', { status: 'CheckedIn' });
    const now = baseStart.toISOString();
    expect(suggestShiftStatus(shift, [app], now)).toBe('InProgress');
  });
});

// ---------------------------------------------------------------------------
// D — mark present after worker self-check-in + idempotency
// ---------------------------------------------------------------------------

describe('Batch 3 D: mark present after worker self-check-in', () => {
  beforeEach(resetStores);

  it('worker CheckedIn (no markedPresentAt) — markPresentByEmployer succeeds, idempotent on second call', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedIn',
      checkInAt: '2030-06-02T08:01:00.000Z',
    });
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const first = useApplicationStore
      .getState()
      .markPresentByEmployer(app.id);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.markedPresentAt).toBeTruthy();

    // Second call — idempotency.
    const second = useApplicationStore
      .getState()
      .markPresentByEmployer(app.id);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toBe('WRONG_STATUS');
    }
  });

  it('mismatch state pin: checkInAt set + markedPresentAt unset', () => {
    const app: Application = buildApp('s', 'w', {
      status: 'CheckedIn',
      checkInAt: '2030-06-02T08:01:00.000Z',
    });
    // Predicate-equivalent flag the UI uses: worker checked in but
    // employer hasn't confirmed presence.
    const flagged =
      Boolean(app.checkInAt) && !app.markedPresentAt && app.status === 'CheckedIn';
    expect(flagged).toBe(true);
  });
});

describe('Batch 3 D: mark absent independent of evidenceRequirement', () => {
  // Build a local-time shift with `start` and `now` derived from
  // the same anchored Date so the local-time parse in
  // `shiftMomentMs` and `toEpochMs` lands on the same offset. This
  // avoids the UTC-vs-local mismatch that bit the earlier draft.
  const baseStart = new Date(ANCHOR_MS);
  baseStart.setHours(8, 0, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 4 * 60 * 60_000);
  // 16 minutes after start so the worker has missed the check-in
  // window.
  const lateNowIso = new Date(baseStart.getTime() + 16 * 60_000).toISOString();

  it('shift with evidenceRequirement None + Approved app + within window → true', () => {
    const shift = buildLocalShift(baseStart, baseEnd, {
      evidenceRequirement: 'None',
    });
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    expect(canEmployerMarkAbsent(lateNowIso, app, shift)).toBe(true);
  });

  it('shift with evidenceRequirement RequiredHandoverChecklist + same setup → true', () => {
    const shift = buildLocalShift(baseStart, baseEnd, {
      evidenceRequirement: 'RequiredHandoverChecklist',
    });
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    expect(canEmployerMarkAbsent(lateNowIso, app, shift)).toBe(true);
  });

  it('Confirmed / Disputed / NoShow / CancelledByWorker → false', () => {
    const shift = buildLocalShift(baseStart, baseEnd);
    for (const status of [
      'Confirmed',
      'Disputed',
      'NoShow',
      'CancelledByWorker',
    ] as const) {
      const app = buildApp(shift.id, 'w1', { status });
      expect(canEmployerMarkAbsent(lateNowIso, app, shift)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// F — admin dispute resolution propagates to application
// ---------------------------------------------------------------------------

describe('Batch 3 F: admin release flips application to Confirmed', () => {
  beforeEach(resetStores);

  it('resolveDispute(ResolvedReleased) sets app.status = Confirmed and notifies both sides', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({
      employerId: employer.id,
      escrowStatus: 'Disputed',
    });
    const app = buildApp(shift.id, worker.id, { status: 'Disputed' });
    const dispute: Dispute = {
      id: 'd1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'Người làm vắng mặt',
      status: 'Open',
      createdAt: ANCHOR_ISO,
      category: 'NoShow',
    };
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const result = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedReleased', 'note');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('ResolvedReleased');

    const updatedApp = useApplicationStore.getState().getById(app.id);
    expect(updatedApp?.status).toBe('Confirmed');
    expect(updatedApp?.confirmedAt).toBeTruthy();

    // Both sides receive the DisputeResolved notification.
    const notifs = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'DisputeResolved');
    expect(notifs.length).toBe(2);
    expect(notifs.some((n) => n.userId === worker.id)).toBe(true);
    expect(notifs.some((n) => n.userId === employer.id)).toBe(true);
  });
});

describe('Batch 3 F: admin refund flips application to NoShow', () => {
  beforeEach(resetStores);

  it('resolveDispute(ResolvedRefunded) sets app.status = NoShow', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({
      employerId: employer.id,
      escrowStatus: 'Disputed',
    });
    const app = buildApp(shift.id, worker.id, { status: 'Disputed' });
    const dispute: Dispute = {
      id: 'd1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'worker',
      reason: 'Tranh chấp tiền công',
      status: 'Open',
      createdAt: ANCHOR_ISO,
      category: 'PaymentDispute',
    };
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const result = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedRefunded', 'note');
    expect(result.ok).toBe(true);

    const updatedApp = useApplicationStore.getState().getById(app.id);
    expect(updatedApp?.status).toBe('NoShow');
    expect(updatedApp?.noShowAt).toBeTruthy();
  });
});

describe('Batch 3 F: cannot resolve a resolved dispute twice', () => {
  beforeEach(resetStores);

  it('first call ok, second call returns WRONG_STATUS', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({
      employerId: employer.id,
      escrowStatus: 'Disputed',
    });
    const app = buildApp(shift.id, worker.id, { status: 'Disputed' });
    const dispute: Dispute = {
      id: 'd1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'Lý do',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const first = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedReleased', 'note');
    expect(first.ok).toBe(true);

    const second = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedRefunded', 'try again');
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toBe('WRONG_STATUS');
    }
  });
});

// ---------------------------------------------------------------------------
// B — employer expiry notifications
// ---------------------------------------------------------------------------

describe('Batch 3 B: ShiftStartingSoon idempotent + 10-min window', () => {
  beforeEach(resetStores);

  it('fires once for a shift starting in 9 min and is idempotent at the same now', () => {
    const employer = buildEmployer();
    // Anchor on local time so `runLifecycleSync` sees a 9-minute gap
    // regardless of the runner's TZ.
    const baseStart = new Date(ANCHOR_MS);
    baseStart.setHours(9, 0, 0, 0);
    const baseEnd = new Date(baseStart.getTime() + 4 * 60 * 60_000);
    const shift = buildLocalShift(baseStart, baseEnd, {
      employerId: employer.id,
      status: 'Published',
      positionsTotal: 2,
      positionsFilled: 1,
    });
    useUserStore.setState({ users: [employer] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [],
    });

    const nowIso = new Date(baseStart.getTime() - 9 * 60_000).toISOString();
    useApplicationStore.getState().runLifecycleSync(nowIso);
    const first = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftStartingSoon');
    expect(first.length).toBe(1);

    // Run again at the same `now` — idempotent.
    useApplicationStore.getState().runLifecycleSync(nowIso);
    const second = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftStartingSoon');
    expect(second.length).toBe(1);
  });

  it('does not fire when the shift starts in 11 min', () => {
    const employer = buildEmployer();
    const baseStart = new Date(ANCHOR_MS);
    baseStart.setHours(9, 0, 0, 0);
    const baseEnd = new Date(baseStart.getTime() + 4 * 60 * 60_000);
    const shift = buildLocalShift(baseStart, baseEnd, {
      employerId: employer.id,
      status: 'Published',
      positionsTotal: 2,
      positionsFilled: 1,
    });
    useUserStore.setState({ users: [employer] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });

    useApplicationStore
      .getState()
      .runLifecycleSync(new Date(baseStart.getTime() - 11 * 60_000).toISOString());
    const fired = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftStartingSoon');
    expect(fired.length).toBe(0);
  });
});

describe('Batch 3 B: ShiftExpiredEmpty fires once on transition to Expired', () => {
  beforeEach(resetStores);

  it('Published → Expired with positionsFilled=0 fires once', () => {
    const employer = buildEmployer();
    // Past shift — date in the past so lifecycle sync moves it to
    // Expired since no one checked in and no one is approved.
    const shift = buildShift({
      employerId: employer.id,
      date: '2020-06-02',
      startTime: '08:00',
      endTime: '12:00',
      status: 'Published',
      positionsTotal: 1,
      positionsFilled: 0,
    });
    useUserStore.setState({ users: [employer] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });

    const nowIso = '2025-01-01T00:00:00.000Z';
    useApplicationStore.getState().runLifecycleSync(nowIso);
    const first = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftExpiredEmpty');
    expect(first.length).toBe(1);

    useApplicationStore.getState().runLifecycleSync(nowIso);
    const second = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftExpiredEmpty');
    expect(second.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// A — repostFromShift does not create a new shift
// ---------------------------------------------------------------------------

describe('Batch 3 A: repostFromShift does not create a new shift', () => {
  beforeEach(resetStores);

  it('appends a CreatedFromRepost timeline entry on the source and does NOT create a Draft', () => {
    const employer = buildEmployer();
    const cancelled = buildShift({
      id: 's-source',
      status: 'Cancelled',
      escrowStatus: 'Refunded',
      employerId: employer.id,
    });
    useUserStore.setState({ users: [employer] });
    useShiftStore.setState({ shifts: [cancelled], lastLifecycleSyncAt: null });

    const result = useShiftStore.getState().repostFromShift(cancelled.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(useShiftStore.getState().shifts.length).toBe(1);
    expect(result.value.id).toBe(cancelled.id);

    const updatedSource = useShiftStore
      .getState()
      .shifts.find((s) => s.id === cancelled.id);
    expect(updatedSource?.status).toBe('Cancelled');
    expect(updatedSource?.timeline?.length).toBe(1);
    expect(updatedSource?.timeline?.[0]?.kind).toBe('CreatedFromRepost');
  });
});

// ---------------------------------------------------------------------------
// E — appendDisputeResponse
// ---------------------------------------------------------------------------

describe('Batch 3 E: appendDisputeResponse appends to existing dispute, does not duplicate', () => {
  beforeEach(resetStores);

  it('worker response on an employer-filed dispute keeps disputes.length === 1', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({
      employerId: employer.id,
      escrowStatus: 'Disputed',
    });
    const app = buildApp(shift.id, worker.id, { status: 'Disputed' });
    const dispute: Dispute = {
      id: 'd1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'Lý do',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const r = useApplicationStore
      .getState()
      .appendDisputeResponse(dispute.id, 'worker', {
        authorUserId: worker.id,
        reason: 'Tôi đã làm đầy đủ.',
      });
    expect(r.ok).toBe(true);
    expect(useApplicationStore.getState().disputes.length).toBe(1);
    expect(
      useApplicationStore.getState().disputes[0].responses?.length,
    ).toBe(1);
    expect(
      useApplicationStore.getState().disputes[0].responses?.[0]?.side,
    ).toBe('worker');
  });
});

describe('Batch 3 E: response on terminal dispute is rejected', () => {
  beforeEach(resetStores);

  it('returns WRONG_STATUS when dispute is ResolvedReleased', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id);
    const dispute: Dispute = {
      id: 'd1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'Lý do',
      status: 'ResolvedReleased',
      createdAt: ANCHOR_ISO,
      resolvedAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const r = useApplicationStore
      .getState()
      .appendDisputeResponse(dispute.id, 'worker', {
        authorUserId: worker.id,
        reason: 'Phản hồi muộn',
      });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('WRONG_STATUS');
    }
  });
});

describe('Batch 3 E: REASON_REQUIRED on empty trim', () => {
  beforeEach(resetStores);

  it('returns REASON_REQUIRED on whitespace-only reason', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, { status: 'Disputed' });
    const dispute: Dispute = {
      id: 'd1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'Lý do',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const r = useApplicationStore
      .getState()
      .appendDisputeResponse(dispute.id, 'worker', {
        authorUserId: worker.id,
        reason: '   ',
      });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('REASON_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// I — getWorkerApplicationStateForShift
// ---------------------------------------------------------------------------

describe('Batch 3 I: getWorkerApplicationStateForShift', () => {
  it('returns exists=false when no match', () => {
    const r = getWorkerApplicationStateForShift('s1', 'w1', []);
    expect(r.exists).toBe(false);
  });

  it('returns Pending status for a single Pending match', () => {
    const app = buildApp('s1', 'w1', { status: 'Pending' });
    const r = getWorkerApplicationStateForShift('s1', 'w1', [app]);
    expect(r).toEqual({
      exists: true,
      status: 'Pending',
      applicationId: app.id,
    });
  });

  it('returns Approved status for a single Approved match', () => {
    const app = buildApp('s1', 'w1', { status: 'Approved' });
    const r = getWorkerApplicationStateForShift('s1', 'w1', [app]);
    expect(r.status).toBe('Approved');
  });

  it('returns Expired status for a single Expired match', () => {
    const app = buildApp('s1', 'w1', { status: 'Expired' });
    const r = getWorkerApplicationStateForShift('s1', 'w1', [app]);
    expect(r.status).toBe('Expired');
  });

  it('picks the LATEST match by appliedAt when there are duplicates', () => {
    const oldApp = buildApp('s1', 'w1', {
      id: 'app-old',
      status: 'Rejected',
      appliedAt: '2030-05-15T00:00:00.000Z',
    });
    const newApp = buildApp('s1', 'w1', {
      id: 'app-new',
      status: 'Approved',
      appliedAt: '2030-05-20T00:00:00.000Z',
    });
    const r = getWorkerApplicationStateForShift('s1', 'w1', [oldApp, newApp]);
    expect(r.applicationId).toBe('app-new');
    expect(r.status).toBe('Approved');
  });
});
