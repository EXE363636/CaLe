/**
 * Phase 10C-Stabilization-1 Batch 2 — wage validation, custom job
 * type, repost lineage, mark-present action, dispute initiator
 * copy split, schedule overlap boundary cases, lifecycle
 * idempotency, and snapshot export/import round-trip.
 *
 * These tests verify the items called out in the Batch 2 brief:
 *
 *   - I.4   wage warning + acknowledgement gate, custom job type
 *   - G/H   repost lineage + verification gate
 *   - D     `markPresentByEmployer` action, mismatch states
 *   - L     dispute initiator copy split (raisedBy)
 *   - F     schedule overlap exact-minute boundary
 *   - A     lifecycle 21:02–21:03 ends at 21:04
 *   - A     08:30–11:30 not running at 21:15
 *   - 7     auto-release notification idempotency
 *   - 16    snapshot export → import round-trip
 *
 * Heavy fixtures match the patterns in
 * `phase10cStab1.test.ts` so the two batches share a deterministic
 * style and a stable epoch anchor.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  isBelowRecommendedMinimum,
  recommendedHourlyMinimum,
} from '@/domain/wage';
import { hasScheduleConflict } from '@/domain/scheduleConflict';
import { suggestShiftStatus } from '@/domain/shiftLifecycle';
import {
  exportSnapshot,
  importSnapshot,
  STORAGE_KEYS,
} from '@/data/persistence';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useVerificationStore } from '@/stores/verificationStore';
import type {
  Application,
  Employer,
  EmployerVerificationDocument,
  ScheduleBlock,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ANCHOR_MS = 1_750_000_000_000;
const ANCHOR_ISO = new Date(ANCHOR_MS).toISOString();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function shiftFromEpoch(
  startMs: number,
  endMs: number,
  override: Partial<Shift> = {},
): Shift {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);
  return buildShift({
    date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(
      startDate.getDate(),
    )}`,
    startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
    ...override,
  });
}

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

/**
 * Build the minimum set of approved verification docs that
 * `computePostingReadiness` accepts for a HouseholdBusiness
 * employer with a workplace photo on file. Used by tests that need
 * the verification gate to PASS.
 */
function buildApprovedVerificationDocs(
  employerId: string,
): EmployerVerificationDocument[] {
  return [
    {
      id: 'v1',
      employerId,
      employerType: 'HouseholdBusiness',
      documentType: 'RepresentativeId',
      status: 'Approved',
      displayLabel: 'CCCD đại diện',
      submittedAt: ANCHOR_ISO,
      reviewedAt: ANCHOR_ISO,
    },
    {
      id: 'v2',
      employerId,
      employerType: 'HouseholdBusiness',
      documentType: 'BusinessLicense',
      status: 'Approved',
      displayLabel: 'Giấy phép kinh doanh',
      submittedAt: ANCHOR_ISO,
      reviewedAt: ANCHOR_ISO,
    },
    {
      id: 'v3',
      employerId,
      employerType: 'HouseholdBusiness',
      documentType: 'StorefrontPhoto',
      status: 'Approved',
      displayLabel: 'Ảnh mặt tiền',
      submittedAt: ANCHOR_ISO,
      reviewedAt: ANCHOR_ISO,
    },
  ];
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
// I.4 — Wage validation
// ---------------------------------------------------------------------------

describe('Batch 2 I.4: wage validation', () => {
  it('flags a wage below the recommended minimum for the job type', () => {
    expect(recommendedHourlyMinimum('Phục vụ')).toBe(30_000);
    expect(isBelowRecommendedMinimum('Phục vụ', 25_000)).toBe(true);
    expect(isBelowRecommendedMinimum('Phục vụ', 30_000)).toBe(false);
    expect(isBelowRecommendedMinimum('Phục vụ', 50_000)).toBe(false);
  });

  it('treats unknown job types as the catch-all default floor', () => {
    expect(recommendedHourlyMinimum('Khác')).toBe(30_000);
    expect(isBelowRecommendedMinimum('Khác', 20_000)).toBe(true);
    expect(isBelowRecommendedMinimum('not-a-job', 20_000)).toBe(true);
  });

  it('returns false for non-finite or non-positive wages', () => {
    expect(isBelowRecommendedMinimum('Phục vụ', 0)).toBe(false);
    expect(isBelowRecommendedMinimum('Phục vụ', -100)).toBe(false);
    expect(isBelowRecommendedMinimum('Phục vụ', Number.NaN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// I.4 — Custom job type required when jobType === 'Khác'
// ---------------------------------------------------------------------------

describe('Batch 2 I.4: customJobTypeName persisted via shiftStore.create', () => {
  beforeEach(resetStores);

  it('persists customJobTypeName when jobType is Khác', () => {
    const employer = buildEmployer();
    useUserStore.setState({ users: [employer] });
    const shift = useShiftStore.getState().create({
      employerId: employer.id,
      title: 'Hỗ trợ chuyển nhà',
      description: '',
      requirements: '',
      jobType: 'Khác',
      location: 'TP.HCM',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '12:00',
      hourlyWage: 50_000,
      positionsTotal: 1,
      customJobTypeName: 'Hỗ trợ chuyển nhà',
    });
    expect(shift.customJobTypeName).toBe('Hỗ trợ chuyển nhà');
  });

  it('drops blank customJobTypeName values', () => {
    const employer = buildEmployer();
    useUserStore.setState({ users: [employer] });
    const shift = useShiftStore.getState().create({
      employerId: employer.id,
      title: 'Phục vụ',
      description: '',
      requirements: '',
      jobType: 'Phục vụ',
      location: 'TP.HCM',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '12:00',
      hourlyWage: 50_000,
      positionsTotal: 1,
      customJobTypeName: '   ',
    });
    expect(shift.customJobTypeName).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// H — simulateDeposit verification gate
// ---------------------------------------------------------------------------

describe('Batch 2 H: simulateDeposit employer verification gate', () => {
  beforeEach(resetStores);

  it('blocks unverified employers (no approved docs) with EMPLOYER_NOT_VERIFIED', () => {
    const employer = buildEmployer({ verifiedBusiness: false });
    useUserStore.setState({ users: [employer] });
    const shift = useShiftStore.getState().create({
      employerId: employer.id,
      title: 'Phục vụ',
      description: '',
      requirements: '',
      jobType: 'Phục vụ',
      location: 'TP.HCM',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '12:00',
      hourlyWage: 50_000,
      positionsTotal: 1,
      workplaceImageLabel: 'storefront.jpg',
    });
    const result = useShiftStore.getState().simulateDeposit(shift.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('EMPLOYER_NOT_VERIFIED');
    }
  });

  it('blocks employers without a resolved type with EMPLOYER_TYPE_REQUIRED', () => {
    const employer = buildEmployer({
      employerType10A: undefined,
      employerType: undefined,
    });
    useUserStore.setState({ users: [employer] });
    const shift = useShiftStore.getState().create({
      employerId: employer.id,
      title: 'Phục vụ',
      description: '',
      requirements: '',
      jobType: 'Phục vụ',
      location: 'TP.HCM',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '12:00',
      hourlyWage: 50_000,
      positionsTotal: 1,
      workplaceImageLabel: 'storefront.jpg',
    });
    const result = useShiftStore.getState().simulateDeposit(shift.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('EMPLOYER_TYPE_REQUIRED');
    }
  });

  it('passes verified employers with the required docs + workplace photo', () => {
    const employer = buildEmployer();
    useUserStore.setState({ users: [employer] });
    useVerificationStore.setState({
      workerDocuments: [],
      employerDocuments: buildApprovedVerificationDocs(employer.id),
      typeChangeRequests: [],
    });
    const shift = useShiftStore.getState().create({
      employerId: employer.id,
      title: 'Phục vụ',
      description: '',
      requirements: '',
      jobType: 'Phục vụ',
      location: 'TP.HCM',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '12:00',
      hourlyWage: 50_000,
      positionsTotal: 1,
      workplaceImageLabel: 'storefront.jpg',
    });
    const result = useShiftStore.getState().simulateDeposit(shift.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('Published');
      expect(result.value.escrowStatus).toBe('Deposited');
    }
  });
});

// ---------------------------------------------------------------------------
// G — repostFromShift creates a Draft and logs the lineage
// ---------------------------------------------------------------------------

describe('Batch 2 G: repostFromShift', () => {
  beforeEach(resetStores);

  it('creates a fresh Draft from a Cancelled source and appends timeline entries', () => {
    const employer = buildEmployer();
    useUserStore.setState({ users: [employer] });
    // Inject a cancelled shift directly so we can repost from it.
    const cancelled: Shift = buildShift({
      id: 's-source',
      status: 'Cancelled',
      escrowStatus: 'Refunded',
      employerId: employer.id,
    });
    useShiftStore.setState({
      shifts: [cancelled],
      lastLifecycleSyncAt: null,
    });

    const result = useShiftStore.getState().repostFromShift(cancelled.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const draft = result.value;
    expect(draft.id).not.toBe(cancelled.id);
    expect(draft.status).toBe('Draft');
    expect(draft.escrowStatus).toBe('PendingDeposit');
    expect(draft.repostedFromShiftId).toBe(cancelled.id);
    expect(draft.timeline?.length).toBe(1);
    expect(draft.timeline?.[0]?.kind).toBe('Reposted');

    // The original shift is preserved (status / escrow unchanged) and
    // gets a CreatedFromRepost timeline entry.
    const updatedSource = useShiftStore
      .getState()
      .shifts.find((s) => s.id === cancelled.id);
    expect(updatedSource?.status).toBe('Cancelled');
    expect(updatedSource?.timeline?.length).toBe(1);
    expect(updatedSource?.timeline?.[0]?.kind).toBe('CreatedFromRepost');
  });

  it('rejects with WRONG_STATUS for an active Published shift', () => {
    const employer = buildEmployer();
    useUserStore.setState({ users: [employer] });
    const active = buildShift({
      id: 's-active',
      status: 'Published',
      employerId: employer.id,
    });
    useShiftStore.setState({ shifts: [active], lastLifecycleSyncAt: null });
    const result = useShiftStore.getState().repostFromShift(active.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('WRONG_STATUS');
    }
  });

  it('rejects with NOT_FOUND for an unknown id', () => {
    const result = useShiftStore.getState().repostFromShift('missing');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('NOT_FOUND');
    }
  });
});

// ---------------------------------------------------------------------------
// D — markPresentByEmployer
// ---------------------------------------------------------------------------

describe('Batch 2 D: markPresentByEmployer', () => {
  beforeEach(resetStores);

  it('sets markedPresentAt and markedPresentByEmployerId, flips to CheckedIn, emits notification', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, { status: 'Approved' });
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const result = useApplicationStore
      .getState()
      .markPresentByEmployer(app.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updated = result.value;
    expect(updated.status).toBe('CheckedIn');
    expect(updated.markedPresentAt).toBeTruthy();
    expect(updated.markedPresentByEmployerId).toBe(employer.id);

    // Worker receives the EmployerMarkedPresent notification.
    const notified = useNotificationStore
      .getState()
      .notifications.filter(
        (n) => n.kind === 'EmployerMarkedPresent' && n.userId === worker.id,
      );
    expect(notified.length).toBe(1);
  });

  it('rejects WRONG_STATUS when the application is not Approved', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, { status: 'Confirmed' });
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const result = useApplicationStore
      .getState()
      .markPresentByEmployer(app.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('WRONG_STATUS');
    }
  });
});

// ---------------------------------------------------------------------------
// L — Dispute initiator copy split (read directly from the dispute slice)
// ---------------------------------------------------------------------------

describe('Batch 2 L: dispute initiator', () => {
  beforeEach(resetStores);

  it('reportIssue creates a dispute with raisedBy = employer', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedOut',
      checkOutAt: ANCHOR_ISO,
      autoReleaseAt: new Date(ANCHOR_MS + 12 * 3600_000).toISOString(),
    });
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const result = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'NoShow',
      reason: 'Người làm rời ca sớm và không bàn giao.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.raisedBy).toBe('employer');
    expect(result.value.applicationId).toBe(app.id);
    // Application flips to Disputed.
    const updatedApp = useApplicationStore.getState().getById(app.id);
    expect(updatedApp?.status).toBe('Disputed');
  });

  it('workerOpenDispute creates a dispute with raisedBy = worker', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedOut',
      checkOutAt: ANCHOR_ISO,
      autoReleaseAt: new Date(ANCHOR_MS + 12 * 3600_000).toISOString(),
    });
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const result = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'PaymentDispute',
      reason: 'Nhà tuyển dụng chưa trả đủ tiền công.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.raisedBy).toBe('worker');

    // Both raisedBy values must round-trip through the dispute slice.
    const stored = useApplicationStore.getState().disputes;
    expect(stored.length).toBe(1);
    expect(stored[0].raisedBy).toBe('worker');
  });
});

// ---------------------------------------------------------------------------
// F — schedule overlap exact-minute boundary
// ---------------------------------------------------------------------------

describe('Batch 2 F: schedule-conflict exact-minute boundary', () => {
  it('back-to-back ranges (08:00–09:00 vs 09:00–10:00) do NOT conflict', () => {
    const block: ScheduleBlock = {
      id: 'b1',
      userId: 'w1',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Cá nhân',
    };
    const target = {
      date: '2030-07-01',
      startTime: '09:00',
      endTime: '10:00',
    };
    expect(hasScheduleConflict(target, [block])).toBe(false);
  });

  it('one-minute overlap (08:00–09:00 vs 08:59–10:00) DOES conflict', () => {
    const block: ScheduleBlock = {
      id: 'b1',
      userId: 'w1',
      date: '2030-07-01',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Cá nhân',
    };
    const target = {
      date: '2030-07-01',
      startTime: '08:59',
      endTime: '10:00',
    };
    expect(hasScheduleConflict(target, [block])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A — Lifecycle: 21:02–21:03 ends at 21:04
// ---------------------------------------------------------------------------

describe('Batch 2 A: lifecycle exact timing', () => {
  it('a 21:02–21:03 shift is Ended (Expired) by 21:04', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(21, 2, 0, 0);
    const end = new Date(start.getTime() + 60_000);
    const at = new Date(end.getTime() + 60_000);
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
    });
    const next = suggestShiftStatus(shift, [], at.toISOString());
    expect(next).toBe('Expired');
  });

  it('an 08:30–11:30 shift is NOT Đang diễn ra at 21:15', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 30, 0, 0);
    const end = new Date(start.getTime() + 3 * 3600_000);
    const at = new Date(start.getTime());
    at.setHours(21, 15, 0, 0);
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
    });
    const next = suggestShiftStatus(shift, [], at.toISOString());
    expect(next).not.toBe('InProgress');
  });
});

// ---------------------------------------------------------------------------
// 7 — Auto-release notification idempotency
// ---------------------------------------------------------------------------

describe('Batch 2: auto-release idempotency', () => {
  beforeEach(resetStores);

  it('runLifecycleSync run twice produces no duplicate auto-release', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    // Shift in the past; CheckedOut + autoReleaseAt < now.
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 3600_000);
    const at = new Date(end.getTime() + 24 * 3600_000); // 1 day after end
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'AwaitingConfirmation',
      escrowStatus: 'InProgress',
      employerId: employer.id,
    });
    const app = buildApp(shift.id, worker.id, {
      status: 'CheckedOut',
      checkInAt: start.toISOString(),
      checkOutAt: end.toISOString(),
      autoReleaseAt: new Date(end.getTime() + 12 * 3600_000).toISOString(),
      shiftStartedNotifiedAt: end.toISOString(),
      shiftEndedNotifiedAt: end.toISOString(),
    });
    useUserStore.setState({ users: [employer, worker] });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const r1 = useApplicationStore
      .getState()
      .runLifecycleSync(at.toISOString());
    expect(r1.releasedIds).toContain(app.id);

    const releasedNotificationsAfterFirst = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'AutoReleaseSettled');
    const initialCount = releasedNotificationsAfterFirst.length;

    const r2 = useApplicationStore
      .getState()
      .runLifecycleSync(at.toISOString());
    expect(r2.releasedIds).toEqual([]);

    const releasedNotificationsAfterSecond = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'AutoReleaseSettled');
    // Second run produced no new notifications.
    expect(releasedNotificationsAfterSecond.length).toBe(initialCount);
  });
});

// ---------------------------------------------------------------------------
// 16 — Snapshot export → import round-trip
// ---------------------------------------------------------------------------

describe('Batch 2 16: exportSnapshot / importSnapshot round-trip', () => {
  beforeEach(() => {
    resetStores();
    // Reset localStorage before each round-trip test so the export
    // reflects only what we put in.
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('round-trips a non-trivial state via exportSnapshot / importSnapshot', () => {
    const employer = buildEmployer();
    const worker = buildWorker('w1');
    const shift = buildShift({ employerId: employer.id });
    const app = buildApp(shift.id, worker.id, { status: 'Approved' });

    // Seed localStorage by writing each slice. We intentionally avoid
    // calling the store hydrate paths because the round-trip we care
    // about is "export current localStorage → import it back".
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEYS.schemaVersion,
      JSON.stringify(8),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.users,
      JSON.stringify([employer, worker]),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.shifts,
      JSON.stringify([shift]),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.applications,
      JSON.stringify([app]),
    );

    const json = exportSnapshot();
    const parsed = JSON.parse(json) as {
      version: number;
      payload: Record<string, unknown>;
    };
    expect(parsed.version).toBe(8);
    expect(parsed.payload[STORAGE_KEYS.users]).toEqual([employer, worker]);
    expect(parsed.payload[STORAGE_KEYS.shifts]).toEqual([shift]);

    // Wipe the slices we wrote and import.
    window.localStorage.removeItem(STORAGE_KEYS.users);
    window.localStorage.removeItem(STORAGE_KEYS.shifts);
    window.localStorage.removeItem(STORAGE_KEYS.applications);
    expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBeNull();

    const result = importSnapshot(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.keysImported).toContain(STORAGE_KEYS.users);
    expect(result.value.keysImported).toContain(STORAGE_KEYS.shifts);

    // The round-trip rewrote the localStorage values — read them back
    // and confirm they match the originals.
    const usersBack = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.users) ?? 'null',
    );
    expect(usersBack).toEqual([employer, worker]);
    const shiftsBack = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.shifts) ?? 'null',
    );
    expect(shiftsBack).toEqual([shift]);
  });

  it('rejects malformed JSON with INVALID_JSON', () => {
    const result = importSnapshot('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_JSON');
    }
  });

  it('rejects a JSON document missing the expected payload keys', () => {
    const bad = JSON.stringify({
      version: 8,
      exportedAt: '2030-01-01T00:00:00.000Z',
      payload: {},
    });
    const result = importSnapshot(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_PAYLOAD');
    }
  });

  it('rejects a JSON document with a stale version', () => {
    const bad = JSON.stringify({
      version: 1,
      exportedAt: '2030-01-01T00:00:00.000Z',
      payload: { 'cale.users': [] },
    });
    const result = importSnapshot(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('VERSION_MISMATCH');
    }
  });
});

// ---------------------------------------------------------------------------
// Item 13 — DateFieldVN allows clearing/editing day/month/year
// ---------------------------------------------------------------------------

import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { DateFieldVN } from '@/components/ui/DateFieldVN';

describe('Batch 2 13: DateFieldVN clear / re-type cycle', () => {
  function ControlledDate({
    onCanonical,
  }: {
    onCanonical: (next: string) => void;
  }) {
    const [value, setValue] = React.useState('');
    return React.createElement(DateFieldVN, {
      label: 'Ngày',
      value,
      onChange: (next: string) => {
        setValue(next);
        onCanonical(next);
      },
    });
  }

  it('accepts typing, clearing, and re-typing without losing canonical sync', () => {
    const cb = (s: string) => values.push(s);
    const values: string[] = [];
    const { container } = render(
      React.createElement(ControlledDate, { onCanonical: cb }),
    );
    const input = container.querySelector('input') as HTMLInputElement;

    // Type a valid date.
    fireEvent.change(input, { target: { value: '15/06/2030' } });
    expect(values[values.length - 1]).toBe('2030-06-15');

    // Clear the field.
    fireEvent.change(input, { target: { value: '' } });
    expect(values[values.length - 1]).toBe('');

    // Re-type a different date.
    fireEvent.change(input, { target: { value: '02/07/2030' } });
    expect(values[values.length - 1]).toBe('2030-07-02');
  });
});
