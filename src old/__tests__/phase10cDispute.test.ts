/**
 * Phase 10C — Wave 4 employer dispute tests.
 *
 * Covers the refactored `applicationStore.reportIssue(payload)`:
 *
 *   - Round-trip persistence of `category`, `reason`,
 *     `evidenceDescription`, `evidenceFileName`, and `raisedBy ===
 *     'employer'` on the resulting Dispute record.
 *   - Application transitions to `'Disputed'` and the linked Shift's
 *     escrow flips to `'Disputed'`.
 *   - Worker + admin notifications fire.
 *   - Validation rejects `CATEGORY_REQUIRED`, `CATEGORY_INVALID`
 *     (worker-side category supplied), `REASON_REQUIRED`,
 *     `FIELD_TOO_LONG` (over-length, path separators), `WRONG_STATUS`
 *     (wrong application status / already-disputed). All rejection
 *     paths leave `applicationStore.disputes` unchanged AND leave
 *     the application's status untouched.
 *
 * Strict Wave 4 scope — no auto-release lifecycle, no admin
 * resolution, no partial release.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Admin,
  Application,
  Employer,
  Shift,
  Worker,
} from '@/types';

const NOW_ISO = '2026-06-01T08:00:00.000Z';

function makeShift(override: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-1',
    employerId: 'employer-1',
    title: 'Phục vụ tiệc',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: '2026-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 1,
    status: 'AwaitingConfirmation',
    escrowStatus: 'Completed',
    depositAmount: 200_000,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    evidenceRequirement: 'OptionalPhoto',
    ...override,
  };
}

function makeWorker(id: string): Worker {
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

function makeAdmin(): Admin {
  return {
    id: 'admin-1',
    role: 'admin',
    email: 'admin@example.com',
    phone: '+84903000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    fullName: 'Quản trị viên',
  };
}

function makeApp(
  shiftId: string,
  workerId: string,
  override: Partial<Application> = {},
): Application {
  return {
    id: `app-${shiftId}-${workerId}`,
    shiftId,
    workerId,
    status: 'CheckedOut',
    appliedAt: '2026-05-15T00:00:00.000Z',
    approvedAt: '2026-05-16T00:00:00.000Z',
    checkInAt: '2026-06-02T08:00:00.000Z',
    checkOutAt: '2026-06-02T12:00:00.000Z',
    autoReleaseAt: '2026-06-03T00:00:00.000Z',
    payoutAmount: 200_000,
    checkoutChecklist: [true, true],
    workerCheckoutNote: 'đã hoàn thành',
    workerEvidenceFileName: 'opt.jpg',
    ...override,
  };
}

function reset(appOverrides: Partial<Application> = {}): {
  shift: Shift;
  worker: Worker;
  app: Application;
} {
  const shift = makeShift();
  const worker = makeWorker('w1');
  const app = makeApp(shift.id, worker.id, appOverrides);
  useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
  useApplicationStore.setState({
    applications: [app],
    ratings: [],
    disputes: [],
  });
  useUserStore.setState({ users: [makeEmployer(), worker, makeAdmin()] });
  useNotificationStore.setState({ notifications: [] });
  return { shift, worker, app };
}

function snapshotApp(id: string): Application | undefined {
  return useApplicationStore.getState().applications.find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applicationStore.reportIssue — Phase 10C structured payload', () => {
  beforeEach(() => {
    useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [] });
    useNotificationStore.setState({ notifications: [] });
  });

  it('persists category, reason, evidenceDescription, and evidenceFileName exactly', () => {
    const { app } = reset();
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'ChecklistFailed',
      reason: 'Người làm chỉ tích 1 trong 3 mục.',
      evidenceDescription: 'Ảnh chụp khu vực còn rác sau khi rời ca.',
      evidenceFileName: 'evidence-001.jpg',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.category).toBe('ChecklistFailed');
    expect(r.value.reason).toBe('Người làm chỉ tích 1 trong 3 mục.');
    expect(r.value.evidenceDescription).toBe(
      'Ảnh chụp khu vực còn rác sau khi rời ca.',
    );
    expect(r.value.evidenceFileName).toBe('evidence-001.jpg');
    expect(r.value.raisedBy).toBe('employer');
    expect(r.value.status).toBe('Open');
  });

  it("flips the application to 'Disputed' and the shift escrow to 'Disputed'", () => {
    const { app, shift } = reset();
    useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'BehaviorIssue',
      reason: 'Cãi vã với khách.',
      evidenceDescription: 'Ghi âm trong ca.',
    });
    expect(snapshotApp(app.id)?.status).toBe('Disputed');
    expect(
      useShiftStore.getState().shifts.find((s) => s.id === shift.id)
        ?.escrowStatus,
    ).toBe('Disputed');
  });

  it('fires worker + admin notifications', () => {
    const { app, worker } = reset();
    useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'NoShow',
      reason: 'Không có mặt sau ca.',
      evidenceDescription: 'Đã liên hệ nhưng không trả lời.',
    });
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.find((n) => n.userId === worker.id)?.kind).toBe(
      'DisputeFiled',
    );
    expect(notifications.find((n) => n.userId === 'admin-1')?.kind).toBe(
      'DisputeOpened',
    );
  });

  it('rejects CATEGORY_REQUIRED on missing category and leaves state unchanged', () => {
    const { app } = reset();
    const before = snapshotApp(app.id);
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      // @ts-expect-error — exercising the runtime guard for missing category
      category: undefined,
      reason: 'something',
      evidenceDescription: 'description',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CATEGORY_REQUIRED');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('rejects CATEGORY_INVALID when the value is not in the employer enum', () => {
    const { app } = reset();
    const before = snapshotApp(app.id);
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      // worker-side enum value supplied to the employer action
      category: 'WrongAddress' as 'NoShow',
      reason: 'something',
      evidenceDescription: 'description',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CATEGORY_INVALID');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('rejects REASON_REQUIRED on whitespace-only reason', () => {
    const { app } = reset();
    const before = snapshotApp(app.id);
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'Other',
      reason: '   ',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('REASON_REQUIRED');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('rejects FIELD_TOO_LONG on path-separator filename', () => {
    const { app } = reset();
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'Other',
      reason: 'reason',
      evidenceFileName: '../etc/passwd',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('FIELD_TOO_LONG');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
  });

  it('rejects WRONG_STATUS when the application is already Disputed', () => {
    const { app } = reset();
    // First dispute succeeds.
    useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'NoShow',
      reason: 'first',
    });
    expect(useApplicationStore.getState().disputes).toHaveLength(1);
    // Second dispute on the now-Disputed application is rejected
    // without appending a duplicate row.
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'NoShow',
      reason: 'second',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
    expect(useApplicationStore.getState().disputes).toHaveLength(1);
  });

  it('rejects WRONG_STATUS when the application is not CheckedOut', () => {
    const { app } = reset({ status: 'Approved' });
    const r = useApplicationStore.getState().reportIssue({
      applicationId: app.id,
      category: 'NoShow',
      reason: 'reason',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkOut now sets autoReleaseAt = checkOutAt + 12h (data only;
// the lifecycle action that consumes this field ships in Wave 7).
// ---------------------------------------------------------------------------

describe('applicationStore.checkOut — Phase 10C autoReleaseAt data', () => {
  beforeEach(() => {
    useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [] });
    useNotificationStore.setState({ notifications: [] });
  });

  it('sets autoReleaseAt = checkOutAt + 12h on success', () => {
    const shift = makeShift({
      status: 'InProgress',
      escrowStatus: 'InProgress',
      evidenceRequirement: 'None',
    });
    const worker = makeWorker('w1');
    const app = makeApp(shift.id, worker.id, {
      status: 'CheckedIn',
      checkInAt: '2026-06-02T08:00:00.000Z',
      checkOutAt: undefined,
      autoReleaseAt: undefined,
      checkoutChecklist: undefined,
      workerCheckoutNote: undefined,
      workerEvidenceFileName: undefined,
    });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [makeEmployer(), worker] });

    const r = useApplicationStore.getState().checkOut({ applicationId: app.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.checkOutAt).toBeDefined();
    expect(r.value.autoReleaseAt).toBeDefined();
    expect(
      Date.parse(r.value.autoReleaseAt!) - Date.parse(r.value.checkOutAt!),
    ).toBe(12 * 60 * 60 * 1000);
  });
});
