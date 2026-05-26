/**
 * Phase 10C — Wave 5A worker-side dispute tests.
 *
 * Covers the new `applicationStore.workerOpenDispute(applicationId,
 * payload)` action:
 *
 *   - Round-trip persistence of `category`, `reason`,
 *     `evidenceDescription`, `evidenceFileName`, and `raisedBy ===
 *     'worker'` on the resulting Dispute record.
 *   - Application transitions to `'Disputed'`; linked Shift's escrow
 *     flips to `'Disputed'` via the same `'EmployerReportIssue'`
 *     escrow event used by the employer-side action.
 *   - Employer + admin notifications fire; worker is NOT notified
 *     (they were the actor).
 *   - Validation rejects `CATEGORY_REQUIRED`, `CATEGORY_INVALID`
 *     (employer-side category supplied to the worker action),
 *     `REASON_REQUIRED`, `FIELD_TOO_LONG` (over-length, path
 *     separators), `WRONG_STATUS` (non-CheckedOut, already-Disputed).
 *     All rejection paths leave `applicationStore.disputes` and the
 *     application untouched.
 *
 * Strict Wave 5A scope — no auto-release lifecycle, no admin
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

describe('applicationStore.workerOpenDispute — Phase 10C Wave 5A', () => {
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
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'ScopeChanged',
      reason: 'Phạm vi công việc khác xa mô tả ban đầu.',
      evidenceDescription: 'Ảnh chat thoả thuận với nhà tuyển dụng.',
      evidenceFileName: 'evidence-001.jpg',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.category).toBe('ScopeChanged');
    expect(r.value.reason).toBe('Phạm vi công việc khác xa mô tả ban đầu.');
    expect(r.value.evidenceDescription).toBe(
      'Ảnh chat thoả thuận với nhà tuyển dụng.',
    );
    expect(r.value.evidenceFileName).toBe('evidence-001.jpg');
    expect(r.value.raisedBy).toBe('worker');
    expect(r.value.status).toBe('Open');
  });

  it("flips the application to 'Disputed' and the shift escrow to 'Disputed'", () => {
    const { app, shift } = reset();
    useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'PaymentDispute',
      reason: 'Tiền công không đúng cam kết.',
    });
    expect(snapshotApp(app.id)?.status).toBe('Disputed');
    expect(
      useShiftStore.getState().shifts.find((s) => s.id === shift.id)?.escrowStatus,
    ).toBe('Disputed');
  });

  it('fires employer + admin notifications (not the worker)', () => {
    const { app, worker, shift } = reset();
    useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'UnsafeWorksite',
      reason: 'Nguy hiểm khi làm việc.',
    });
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.find((n) => n.userId === shift.employerId)?.kind).toBe(
      'DisputeFiled',
    );
    expect(notifications.find((n) => n.userId === 'admin-1')?.kind).toBe(
      'DisputeOpened',
    );
    // Worker is the actor — no notification fires for them.
    expect(notifications.find((n) => n.userId === worker.id)).toBeUndefined();
  });

  it('rejects CATEGORY_REQUIRED on missing category and leaves state unchanged', () => {
    const { app } = reset();
    const before = snapshotApp(app.id);
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      // @ts-expect-error — exercising the runtime guard for missing category
      category: undefined,
      reason: 'something',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CATEGORY_REQUIRED');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('rejects CATEGORY_INVALID when the value is from the employer enum', () => {
    const { app } = reset();
    const before = snapshotApp(app.id);
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      // employer-side enum value supplied to the worker action
      category: 'NoShow' as 'WrongAddress',
      reason: 'something',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CATEGORY_INVALID');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('rejects REASON_REQUIRED on whitespace-only reason', () => {
    const { app } = reset();
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'Other',
      reason: '   ',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('REASON_REQUIRED');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
  });

  it('rejects FIELD_TOO_LONG on path-separator filename', () => {
    const { app } = reset();
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'Other',
      reason: 'reason',
      evidenceFileName: '..\\windows\\system32',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('FIELD_TOO_LONG');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
  });

  it('rejects WRONG_STATUS when the application is already Disputed', () => {
    const { app } = reset();
    useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'EmployerNoShow',
      reason: 'first',
    });
    expect(useApplicationStore.getState().disputes).toHaveLength(1);
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'EmployerNoShow',
      reason: 'second',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
    expect(useApplicationStore.getState().disputes).toHaveLength(1);
  });

  it('rejects WRONG_STATUS when the application is not CheckedOut', () => {
    const { app } = reset({ status: 'Approved' });
    const r = useApplicationStore.getState().workerOpenDispute(app.id, {
      category: 'WrongAddress',
      reason: 'reason',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
    expect(useApplicationStore.getState().disputes).toHaveLength(0);
  });

  it('rejects APPLICATION_NOT_FOUND for unknown id', () => {
    reset();
    const r = useApplicationStore.getState().workerOpenDispute('does-not-exist', {
      category: 'Other',
      reason: 'reason',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('APPLICATION_NOT_FOUND');
  });
});
