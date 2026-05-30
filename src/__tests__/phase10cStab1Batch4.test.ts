/**
 * Phase 10C-Stabilization-1 Batch 4 — manual-QA regressions.
 *
 * Covers:
 *   - F  isShiftStartingSoon 6h threshold
 *   - D  Check-in late window 5min, employer / dispute eligibility
 *   - A  repostSanitize helpers
 *   - B  getShiftDisplayPhase boundaries (new union)
 *   - C  bucketApplicants partition
 *   - E  paidAwaitingRatingAt + WorkerRatedEmployer
 *   - G  compareShiftsForWorker preferred location + soonest sort
 *   - I  workerOpenDispute(AbsentDispute) on NoShow
 *   - H  adminDisputeTaskCount + requestMoreEvidence
 *   - J  wallet ledger entries on simulateDeposit / confirmCompletion / dispute
 *   - L  shift timeline emission spot-check
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  STARTING_SOON_HOURS,
  isShiftStartingSoon,
  getShiftDisplayPhase,
} from '@/domain/shiftLifecycle';
import {
  CHECK_IN_LATE_MINUTES,
  canEmployerMarkAbsent,
  canEmployerMarkPresent,
  canWorkerCheckIn,
} from '@/domain/timeGates';
import {
  sanitizeRepostDescription,
  sanitizeRepostTitle,
} from '@/domain/repostSanitize';
import { bucketApplicants } from '@/domain/applicantBuckets';
import { compareShiftsForWorker } from '@/domain/shiftSorting';
import { adminDisputeTaskCount } from '@/domain/taskBadges';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useAdminStore } from '@/stores/adminStore';
import { useVerificationStore } from '@/stores/verificationStore';
import { useWalletStore } from '@/stores/walletStore';

import type {
  Admin,
  Application,
  Dispute,
  Employer,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ANCHOR_MS = 1_750_000_000_000;
const ANCHOR_ISO = new Date(ANCHOR_MS).toISOString();

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

function buildAdmin(): Admin {
  return {
    id: 'admin-1',
    role: 'admin',
    email: 'admin@example.com',
    phone: '+84903000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2030-05-01T00:00:00.000Z',
    fullName: 'Admin',
  };
}

function buildWorker(id: string, override: Partial<Worker> = {}): Worker {
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
    ...override,
  };
}

function buildShift(override: Partial<Shift> = {}): Shift {
  return {
    id: 's-test',
    employerId: 'e1',
    title: 'Phục vụ tiệc',
    description: 'desc',
    requirements: 'req',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    date: '2030-06-02',
    startTime: '12:02',
    endTime: '13:00',
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

function resetStores() {
  useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
  useApplicationStore.setState({
    applications: [],
    ratings: [],
    disputes: [],
  });
  useUserStore.setState({ users: [] });
  useNotificationStore.setState({ notifications: [] });
  useEmployerFeedbackStore.setState({ feedback: [] });
  useVerificationStore.setState({
    workerDocuments: [],
    employerDocuments: [],
    typeChangeRequests: [],
  });
  useWalletStore.setState({ wallets: [], ledger: [] });
}

// ---------------------------------------------------------------------------
// F — Sắp bắt đầu threshold
// ---------------------------------------------------------------------------

describe('Batch 4 F: isShiftStartingSoon', () => {
  const baseStart = new Date(ANCHOR_MS);
  baseStart.setHours(12, 0, 0, 0);
  const shiftDate = `${baseStart.getFullYear()}-${String(
    baseStart.getMonth() + 1,
  ).padStart(2, '0')}-${String(baseStart.getDate()).padStart(2, '0')}`;
  const startTime = `${String(baseStart.getHours()).padStart(2, '0')}:${String(
    baseStart.getMinutes(),
  ).padStart(2, '0')}`;

  it('5h59m before start → true', () => {
    expect(STARTING_SOON_HOURS).toBe(6);
    const now = new Date(
      baseStart.getTime() - (5 * 60 + 59) * 60_000,
    ).toISOString();
    expect(
      isShiftStartingSoon({ date: shiftDate, startTime }, now),
    ).toBe(true);
  });
  it('6h01m before start → false', () => {
    const now = new Date(
      baseStart.getTime() - (6 * 60 + 1) * 60_000,
    ).toISOString();
    expect(
      isShiftStartingSoon({ date: shiftDate, startTime }, now),
    ).toBe(false);
  });
  it('exact start → false (already started)', () => {
    expect(
      isShiftStartingSoon(
        { date: shiftDate, startTime },
        baseStart.toISOString(),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D — check-in window 15 before / 5 after
// ---------------------------------------------------------------------------

describe('Batch 4 D: check-in window 15min before / 5min after start', () => {
  it('CHECK_IN_LATE_MINUTES is 5', () => {
    expect(CHECK_IN_LATE_MINUTES).toBe(5);
  });

  // Use local-time shift coordinates so the date/startTime parse
  // matches the wall clock used to derive `now`.
  const baseStart = new Date(ANCHOR_MS);
  baseStart.setHours(12, 2, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 60 * 60_000);
  const shift = buildShift({
    date: `${baseStart.getFullYear()}-${String(
      baseStart.getMonth() + 1,
    ).padStart(2, '0')}-${String(baseStart.getDate()).padStart(2, '0')}`,
    startTime: `${String(baseStart.getHours()).padStart(2, '0')}:${String(
      baseStart.getMinutes(),
    ).padStart(2, '0')}`,
    endTime: `${String(baseEnd.getHours()).padStart(2, '0')}:${String(
      baseEnd.getMinutes(),
    ).padStart(2, '0')}`,
  });

  it('11:46 (16 min before) → false', () => {
    const at = new Date(baseStart.getTime() - 16 * 60_000).toISOString();
    expect(canWorkerCheckIn(at, buildApp(shift.id, 'w1'), shift)).toBe(false);
  });
  it('11:47 (15 min before) → true', () => {
    const at = new Date(baseStart.getTime() - 15 * 60_000).toISOString();
    expect(canWorkerCheckIn(at, buildApp(shift.id, 'w1'), shift)).toBe(true);
  });
  it('12:07 (5 min after, inclusive) → true', () => {
    const at = new Date(baseStart.getTime() + 5 * 60_000).toISOString();
    expect(canWorkerCheckIn(at, buildApp(shift.id, 'w1'), shift)).toBe(true);
  });
  it('12:08 (6 min after) → false', () => {
    const at = new Date(baseStart.getTime() + 6 * 60_000).toISOString();
    expect(canWorkerCheckIn(at, buildApp(shift.id, 'w1'), shift)).toBe(false);
  });
});

describe('Batch 4 D: employer mark-present after worker self-check-in', () => {
  it("CheckedIn + no markedPresentAt + within window → true", () => {
    const baseStart = new Date(ANCHOR_MS);
    baseStart.setHours(12, 2, 0, 0);
    const baseEnd = new Date(baseStart.getTime() + 60 * 60_000);
    const shift = buildShift({
      date: `${baseStart.getFullYear()}-${String(
        baseStart.getMonth() + 1,
      ).padStart(2, '0')}-${String(baseStart.getDate()).padStart(2, '0')}`,
      startTime: `${String(baseStart.getHours()).padStart(2, '0')}:${String(
        baseStart.getMinutes(),
      ).padStart(2, '0')}`,
      endTime: `${String(baseEnd.getHours()).padStart(2, '0')}:${String(
        baseEnd.getMinutes(),
      ).padStart(2, '0')}`,
    });
    const app = buildApp(shift.id, 'w1', { status: 'CheckedIn' });
    const at = new Date(baseStart.getTime() + 10 * 60_000).toISOString();
    expect(canEmployerMarkPresent(at, app, shift)).toBe(true);
  });
});

describe('Batch 4 D: employer mark-absent application-state gate', () => {
  it('NoShow application → false (already terminal)', () => {
    const baseStart = new Date(ANCHOR_MS);
    baseStart.setHours(12, 2, 0, 0);
    const baseEnd = new Date(baseStart.getTime() + 60 * 60_000);
    const shift = buildShift({
      date: `${baseStart.getFullYear()}-${String(
        baseStart.getMonth() + 1,
      ).padStart(2, '0')}-${String(baseStart.getDate()).padStart(2, '0')}`,
      startTime: `${String(baseStart.getHours()).padStart(2, '0')}:${String(
        baseStart.getMinutes(),
      ).padStart(2, '0')}`,
      endTime: `${String(baseEnd.getHours()).padStart(2, '0')}:${String(
        baseEnd.getMinutes(),
      ).padStart(2, '0')}`,
    });
    const at = new Date(baseStart.getTime() + 30 * 60_000).toISOString();
    const terminalApp = buildApp(shift.id, 'w1', { status: 'NoShow' });
    expect(canEmployerMarkAbsent(at, terminalApp, shift)).toBe(false);
  });
  it('Approved application within window → true', () => {
    const baseStart = new Date(ANCHOR_MS);
    baseStart.setHours(12, 2, 0, 0);
    const baseEnd = new Date(baseStart.getTime() + 60 * 60_000);
    const shift = buildShift({
      date: `${baseStart.getFullYear()}-${String(
        baseStart.getMonth() + 1,
      ).padStart(2, '0')}-${String(baseStart.getDate()).padStart(2, '0')}`,
      startTime: `${String(baseStart.getHours()).padStart(2, '0')}:${String(
        baseStart.getMinutes(),
      ).padStart(2, '0')}`,
      endTime: `${String(baseEnd.getHours()).padStart(2, '0')}:${String(
        baseEnd.getMinutes(),
      ).padStart(2, '0')}`,
    });
    // Now is 30 min past start (well after 5 min check-in window).
    const at = new Date(baseStart.getTime() + 30 * 60_000).toISOString();
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    expect(canEmployerMarkAbsent(at, app, shift)).toBe(true);
  });
});

describe('Batch 4 D: worker dispute eligibility', () => {
  beforeEach(resetStores);

  it("PaymentDispute filed >1h before autoReleaseAt → 'TOO_EARLY'", () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift();
    const checkOutAt = '2030-06-02T11:50:00.000Z';
    const autoReleaseAt = '2030-06-02T23:50:00.000Z';
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedOut',
      checkOutAt,
      autoReleaseAt,
    });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    // 5 min after checkout — well outside the 1h pre-auto-release.
    const before = new Date('2030-06-02T11:55:00.000Z');
    const original = Date.now;
    Date.now = () => before.getTime();
    try {
      const r = useApplicationStore.getState().workerOpenDispute(app.id, {
        category: 'PaymentDispute',
        reason: 'Tiền công không đúng',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('TOO_EARLY');
    } finally {
      Date.now = original;
    }
  });

  it("PaymentDispute filed within 1h of autoReleaseAt → succeeds", () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift();
    const autoReleaseAt = '2030-06-02T23:50:00.000Z';
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedOut',
      checkOutAt: '2030-06-02T11:50:00.000Z',
      autoReleaseAt,
    });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    // 1 hour before auto-release.
    const at = new Date('2030-06-02T22:55:00.000Z');
    const original = Date.now;
    Date.now = () => at.getTime();
    try {
      const r = useApplicationStore.getState().workerOpenDispute(app.id, {
        category: 'PaymentDispute',
        reason: 'Tiền công không đúng',
      });
      expect(r.ok).toBe(true);
    } finally {
      Date.now = original;
    }
  });
});

// ---------------------------------------------------------------------------
// A — repost prefill cleanup
// ---------------------------------------------------------------------------

describe('Batch 4 A: repost prefill sanitization', () => {
  it('strips "(đã huỷ)" suffix', () => {
    expect(sanitizeRepostTitle('Phục vụ buổi sáng (đã huỷ)')).toBe(
      'Phục vụ buổi sáng',
    );
  });
  it('strips "(đã hết hạn)" suffix', () => {
    expect(sanitizeRepostTitle('Phục vụ (đã hết hạn)')).toBe('Phục vụ');
  });
  it('strips "[Hệ thống] ..." prefix from description', () => {
    const desc = '[Hệ thống] Ca bị hủy lúc 22:00\n\nMô tả gốc';
    expect(sanitizeRepostDescription(desc)).toBe('Mô tả gốc');
  });
  it('does not mutate the source object', () => {
    const source = {
      title: 'Phục vụ (đã huỷ)',
      description: 'desc',
    };
    const sourceTitle = source.title;
    const sourceDesc = source.description;
    sanitizeRepostTitle(source.title);
    sanitizeRepostDescription(source.description);
    expect(source.title).toBe(sourceTitle);
    expect(source.description).toBe(sourceDesc);
  });
});

// ---------------------------------------------------------------------------
// B — getShiftDisplayPhase boundaries
// ---------------------------------------------------------------------------

describe('Batch 4 B: getShiftDisplayPhase boundaries', () => {
  // Build a shift starting 12:02–13:00 LOCAL on the anchor day so we
  // can probe `now` against multiple wall-clock anchors. Mirrors the
  // pattern used in Batch 3 C tests.
  const baseStart = new Date(ANCHOR_MS);
  baseStart.setHours(12, 2, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 58 * 60_000);
  const shiftDate = `${baseStart.getFullYear()}-${String(
    baseStart.getMonth() + 1,
  ).padStart(2, '0')}-${String(baseStart.getDate()).padStart(2, '0')}`;
  const shift = buildShift({
    date: shiftDate,
    startTime: `${String(baseStart.getHours()).padStart(2, '0')}:${String(
      baseStart.getMinutes(),
    ).padStart(2, '0')}`,
    endTime: `${String(baseEnd.getHours()).padStart(2, '0')}:${String(
      baseEnd.getMinutes(),
    ).padStart(2, '0')}`,
    status: 'Published',
    positionsTotal: 1,
    positionsFilled: 0,
  });

  it('12:01 with Approved roster → CheckInOpen', () => {
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    const now = new Date(baseStart.getTime() - 60_000).toISOString();
    expect(getShiftDisplayPhase(shift, [app], now)).toBe('CheckInOpen');
  });
  it('12:02 (exact start) Approved-only → Upcoming', () => {
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    expect(
      getShiftDisplayPhase(shift, [app], baseStart.toISOString()),
    ).toBe('Upcoming');
  });
  it('12:02 with one CheckedIn → InProgress', () => {
    const app = buildApp(shift.id, 'w1', { status: 'CheckedIn' });
    expect(
      getShiftDisplayPhase(shift, [app], baseStart.toISOString()),
    ).toBe('InProgress');
  });
  it('after end with CheckedIn (no checkout) → AwaitingWorkerCheckout', () => {
    const app = buildApp(shift.id, 'w1', {
      status: 'CheckedIn',
      checkInAt: baseStart.toISOString(),
    });
    const now = new Date(baseEnd.getTime() + 60_000).toISOString();
    expect(getShiftDisplayPhase(shift, [app], now)).toBe(
      'AwaitingWorkerCheckout',
    );
  });
  it('app CheckedOut + status AwaitingConfirmation → AwaitingEmployerConfirmation', () => {
    const awaiting = { ...shift, status: 'AwaitingConfirmation' as const };
    const app = buildApp(shift.id, 'w1', { status: 'CheckedOut' });
    expect(
      getShiftDisplayPhase(awaiting, [app], baseEnd.toISOString()),
    ).toBe('AwaitingEmployerConfirmation');
  });
  it('any app Disputed → Disputed', () => {
    const app = buildApp(shift.id, 'w1', { status: 'Disputed' });
    expect(
      getShiftDisplayPhase(shift, [app], baseStart.toISOString()),
    ).toBe('Disputed');
  });
  it('shift status Completed → Completed', () => {
    const completed = { ...shift, status: 'Completed' as const };
    expect(
      getShiftDisplayPhase(completed, [], baseStart.toISOString()),
    ).toBe('Completed');
  });
});

// ---------------------------------------------------------------------------
// C — bucketApplicants
// ---------------------------------------------------------------------------

describe('Batch 4 C: bucketApplicants partition', () => {
  // Shift on 2030-06-02 12:02–13:00 local, so 06:00 UTC of the same
  // day reliably falls before any local timezone's end-of-shift.
  const shift = buildShift();
  const PRE_END = '2030-06-02T03:00:00.000Z';
  const POST_END = '2030-06-03T05:00:00.000Z';
  const apps: Application[] = [
    buildApp(shift.id, 'w-pending', { status: 'Pending' }),
    buildApp(shift.id, 'w-approved', { status: 'Approved' }),
    buildApp(shift.id, 'w-checkedin', {
      status: 'CheckedIn',
      checkInAt: '2030-06-02T12:02:00.000Z',
    }),
    buildApp(shift.id, 'w-checkedout', { status: 'CheckedOut' }),
    buildApp(shift.id, 'w-confirmed', { status: 'Confirmed' }),
  ];

  it('returns 5 buckets in stable order, each with 1 app', () => {
    const buckets = bucketApplicants(shift, apps, PRE_END);
    const keys = buckets.map((b) => b.bucket);
    expect(keys).toEqual([
      'Pending',
      'Approved',
      'CheckedIn',
      'AwaitingConfirmation',
      'Confirmed',
    ]);
    for (const b of buckets) expect(b.applications).toHaveLength(1);
  });

  it('no application appears in two buckets', () => {
    const buckets = bucketApplicants(shift, apps, PRE_END);
    const seen = new Set<string>();
    for (const b of buckets) {
      for (const a of b.applications) {
        expect(seen.has(a.id)).toBe(false);
        seen.add(a.id);
      }
    }
  });

  it('empty buckets are filtered out', () => {
    const buckets = bucketApplicants(shift, [], PRE_END);
    expect(buckets).toEqual([]);
  });

  it('CheckedIn with checkInAt + ended shift → AwaitingCheckout', () => {
    const a = buildApp(shift.id, 'w', {
      status: 'CheckedIn',
      checkInAt: '2030-06-02T12:02:00.000Z',
    });
    const buckets = bucketApplicants(shift, [a], POST_END);
    expect(buckets[0]?.bucket).toBe('AwaitingCheckout');
  });
});

// ---------------------------------------------------------------------------
// E — confirmCompletion + employerFeedback rating wiring
// ---------------------------------------------------------------------------

describe('Batch 4 E: post-payment rating wiring', () => {
  beforeEach(resetStores);

  it('confirmCompletion sets paidAwaitingRatingAt and notifies worker', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ status: 'AwaitingConfirmation' });
    const app = buildApp(shift.id, worker.id, { status: 'CheckedOut' });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore
      .getState()
      .confirmCompletion(app.id, { stars: 5 });
    expect(r.ok).toBe(true);

    const after = useApplicationStore
      .getState()
      .applications.find((a) => a.id === app.id);
    expect(after?.paidAwaitingRatingAt).toBeTruthy();

    const notif = useNotificationStore
      .getState()
      .notifications.find(
        (n) =>
          n.userId === worker.id &&
          n.kind === 'WorkerPostPaymentRatingRequired',
      );
    expect(notif).toBeDefined();
  });

  it('employerFeedback.submit clears paidAwaitingRatingAt and stamps workerRatedEmployerAt', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ status: 'AwaitingConfirmation' });
    const app = buildApp(shift.id, worker.id, {
      status: 'Confirmed',
      paidAwaitingRatingAt: '2030-06-03T00:00:00.000Z',
    });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const r = useEmployerFeedbackStore.getState().submit({
      shiftId: shift.id,
      applicationId: app.id,
      fromUserId: worker.id,
      toEmployerId: employer.id,
      stars: 5,
      tags: [],
    });
    expect(r.ok).toBe(true);

    const after = useApplicationStore
      .getState()
      .applications.find((a) => a.id === app.id);
    expect(after?.workerRatedEmployerAt).toBeTruthy();
    expect(after?.paidAwaitingRatingAt).toBeUndefined();

    const notif = useNotificationStore
      .getState()
      .notifications.find(
        (n) => n.userId === employer.id && n.kind === 'WorkerRatedEmployer',
      );
    expect(notif).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// G — compareShiftsForWorker
// ---------------------------------------------------------------------------

describe('Batch 4 G: compareShiftsForWorker', () => {
  it('preferred-location match wins over earlier start', () => {
    const a = {
      date: '2030-06-02',
      startTime: '09:00',
      location: 'Quận 7, TP.HCM',
    };
    const b = {
      date: '2030-06-02',
      startTime: '12:00',
      location: 'Quận 1, TP.HCM',
    };
    const cmp = compareShiftsForWorker(a, b, {
      preferredLocations: ['Quận 1'],
    });
    expect(cmp).toBeGreaterThan(0);
  });
  it('both match → soonest first', () => {
    const a = {
      date: '2030-06-02',
      startTime: '09:00',
      location: 'Quận 1',
    };
    const b = {
      date: '2030-06-02',
      startTime: '12:00',
      location: 'Quận 1, ABC',
    };
    expect(
      compareShiftsForWorker(a, b, { preferredLocations: ['Quận 1'] }),
    ).toBeLessThan(0);
  });
  it('neither matches → soonest first', () => {
    const a = {
      date: '2030-06-02',
      startTime: '09:00',
      location: 'Quận 7',
    };
    const b = {
      date: '2030-06-02',
      startTime: '12:00',
      location: 'Quận 8',
    };
    expect(
      compareShiftsForWorker(a, b, { preferredLocations: ['Quận 1'] }),
    ).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// I — Worker absent dispute
// ---------------------------------------------------------------------------

describe('Batch 4 I: workerOpenDispute(AbsentDispute)', () => {
  beforeEach(resetStores);

  it('accepts AbsentDispute on NoShow application', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift();
    const app = buildApp(shift.id, worker.id, { status: 'NoShow' });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'AbsentDispute',
      reason: 'Tôi đã có mặt nhưng nhà tuyển dụng đánh dấu vắng',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects PaymentDispute on NoShow application (WRONG_STATUS)', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift();
    const app = buildApp(shift.id, worker.id, { status: 'NoShow' });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'PaymentDispute',
      reason: 'Tiền công không đúng',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
  });
});

// ---------------------------------------------------------------------------
// H — Admin dispute badge + requestMoreEvidence
// ---------------------------------------------------------------------------

describe('Batch 4 H: adminDisputeTaskCount', () => {
  it('counts Open + RequestedMoreEvidence', () => {
    const disputes: Dispute[] = [
      {
        id: 'd1',
        shiftId: 's',
        applicationId: 'a',
        raisedBy: 'employer',
        reason: 'r',
        status: 'Open',
        createdAt: ANCHOR_ISO,
      },
      {
        id: 'd2',
        shiftId: 's',
        applicationId: 'a',
        raisedBy: 'employer',
        reason: 'r',
        status: 'RequestedMoreEvidence',
        createdAt: ANCHOR_ISO,
      },
      {
        id: 'd3',
        shiftId: 's',
        applicationId: 'a',
        raisedBy: 'employer',
        reason: 'r',
        status: 'ResolvedReleased',
        createdAt: ANCHOR_ISO,
      },
    ];
    expect(adminDisputeTaskCount(disputes)).toBe(2);
  });
});

describe('Batch 4 H: requestMoreEvidence', () => {
  beforeEach(resetStores);

  it('sets status, target, and fans out notifications to the target sides', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const admin = buildAdmin();
    const shift = buildShift();
    const app = buildApp(shift.id, worker.id, { status: 'Disputed' });
    const dispute: Dispute = {
      id: 'd-1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'lý do',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker, admin] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const r = useAdminStore
      .getState()
      .requestMoreEvidence(dispute.id, 'both', 'Cần ảnh bàn giao');
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.value.status).toBe('RequestedMoreEvidence');
    expect(r.value.evidenceRequestTarget).toBe('both');

    const notifs = useNotificationStore.getState().notifications;
    const w = notifs.find(
      (n) =>
        n.userId === worker.id && n.kind === 'AdminRequestedEvidence',
    );
    const e = notifs.find(
      (n) =>
        n.userId === employer.id && n.kind === 'AdminRequestedEvidence',
    );
    expect(w).toBeDefined();
    expect(e).toBeDefined();
  });

  it('rejects empty note (REASON_REQUIRED)', () => {
    const dispute: Dispute = {
      id: 'd-1',
      shiftId: 's',
      applicationId: 'a',
      raisedBy: 'employer',
      reason: 'r',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [dispute],
    });
    const r = useAdminStore
      .getState()
      .requestMoreEvidence(dispute.id, 'worker', '   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('REASON_REQUIRED');
  });

  it('rejects terminal dispute (WRONG_STATUS)', () => {
    const dispute: Dispute = {
      id: 'd-1',
      shiftId: 's',
      applicationId: 'a',
      raisedBy: 'employer',
      reason: 'r',
      status: 'ResolvedReleased',
      createdAt: ANCHOR_ISO,
      resolvedAt: ANCHOR_ISO,
    };
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [dispute],
    });
    const r = useAdminStore
      .getState()
      .requestMoreEvidence(dispute.id, 'worker', 'note');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
  });
});

// ---------------------------------------------------------------------------
// J — Wallet ledger
// ---------------------------------------------------------------------------

describe('Batch 4 J: wallet ledger', () => {
  beforeEach(resetStores);

  it('simulateDeposit creates EmployerDepositHeld ledger entry', () => {
    const employer = buildEmployer();
    useUserStore.setState({ users: [employer] });
    const shift = buildShift({
      employerId: employer.id,
      status: 'Draft',
      escrowStatus: 'PendingDeposit',
    });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useVerificationStore.setState({
      workerDocuments: [],
      employerDocuments: [
        {
          id: 'doc-rep',
          employerId: employer.id,
          employerType: 'HouseholdBusiness',
          documentType: 'RepresentativeId',
          status: 'Approved',
          displayLabel: 'CCCD',
          submittedAt: ANCHOR_ISO,
        },
        {
          id: 'doc-biz',
          employerId: employer.id,
          employerType: 'HouseholdBusiness',
          documentType: 'BusinessLicense',
          status: 'Approved',
          displayLabel: 'GPKD',
          submittedAt: ANCHOR_ISO,
        },
        {
          id: 'doc-store',
          employerId: employer.id,
          employerType: 'HouseholdBusiness',
          documentType: 'StorefrontPhoto',
          status: 'Approved',
          displayLabel: 'Storefront',
          submittedAt: ANCHOR_ISO,
        },
      ],
      typeChangeRequests: [],
    });

    // CORE-STABILITY-6 Part 4 — fund the employer wallet to satisfy
    // the insufficient-balance deposit guard.
    useWalletStore.getState().topUp(employer.id, shift.depositAmount);

    const r = useShiftStore.getState().simulateDeposit(shift.id);
    expect(r.ok).toBe(true);
    const ledger = useWalletStore.getState().ledger;
    expect(
      ledger.find(
        (l) =>
          l.userId === employer.id && l.kind === 'EmployerDepositHeld',
      ),
    ).toBeDefined();
    // Topped up the deposit amount, debit nets back to 0.
    expect(useWalletStore.getState().getBalance(employer.id)).toBe(0);
  });

  it('confirmCompletion credits worker wallet with payoutAmount', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ status: 'AwaitingConfirmation' });
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedOut',
      payoutAmount: 200_000,
    });
    useUserStore.setState({ users: [employer, worker, buildAdmin()] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    useApplicationStore
      .getState()
      .confirmCompletion(app.id, { stars: 5 });

    expect(useWalletStore.getState().getBalance(worker.id)).toBe(200_000);
    const wageEntry = useWalletStore
      .getState()
      .ledger.find(
        (l) => l.userId === worker.id && l.kind === 'WorkerWageReleased',
      );
    expect(wageEntry?.amount).toBe(200_000);
  });

  it('dispute refund credits employer wallet', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const admin = buildAdmin();
    const shift = buildShift({
      escrowStatus: 'Disputed',
      status: 'AwaitingConfirmation',
    });
    const app = buildApp(shift.id, worker.id, {
      status: 'Disputed',
      payoutAmount: 200_000,
    });
    const dispute: Dispute = {
      id: 'd-1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'r',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker, admin] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const r = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedRefunded', 'Hoàn tiền');
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().getBalance(employer.id)).toBe(200_000);
  });

  it('dispute release credits worker wallet', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const admin = buildAdmin();
    const shift = buildShift({
      escrowStatus: 'Disputed',
      status: 'AwaitingConfirmation',
    });
    const app = buildApp(shift.id, worker.id, {
      status: 'Disputed',
      payoutAmount: 200_000,
    });
    const dispute: Dispute = {
      id: 'd-1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'r',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useUserStore.setState({ users: [employer, worker, admin] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });

    const r = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedReleased', 'Thanh toán');
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().getBalance(worker.id)).toBe(200_000);
  });
});
