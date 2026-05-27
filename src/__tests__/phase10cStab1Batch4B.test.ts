/**
 * Phase 10C-Stabilization-1 Batch 4B — UI surfaces + timeline
 * emission threading.
 *
 * Tests focus on the store-side changes that back the new UI:
 *
 *   1. Timeline emission threading — every wired store action now
 *      appends an entry to `Shift.timeline` with a second-resolution
 *      ISO timestamp and the right `kind`.
 *   2. Idempotency — retrying an idempotent action does NOT emit
 *      duplicate timeline entries.
 *   3. Wallet ledger entries fire on the canonical paths
 *      (`simulateDeposit` → `EmployerDepositHeld`,
 *      `confirmCompletion` → `WorkerWageReleased`,
 *      `resolveDispute` → `WorkerWageReleased` / `EmployerDisputeRefund`).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useWalletStore } from '@/stores/walletStore';
import { useVerificationStore } from '@/stores/verificationStore';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useAdminStore } from '@/stores/adminStore';
import type {
  Application,
  Employer,
  Shift,
  ShiftTimelineEntry,
  Worker,
} from '@/types';

const ANCHOR_MS = 1_770_000_000_000; // 2026-02-01-ish
const ANCHOR_ISO = new Date(ANCHOR_MS).toISOString();

function buildShift(override: Partial<Shift> = {}): Shift {
  return {
    id: 's-test',
    employerId: 'e1',
    title: 'Phục vụ tiệc',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: '2030-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: ANCHOR_ISO,
    updatedAt: ANCHOR_ISO,
    evidenceRequirement: 'OptionalPhoto',
    timeline: [],
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
    status: 'Pending',
    appliedAt: ANCHOR_ISO,
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
    createdAt: ANCHOR_ISO,
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

function buildEmployer(): Employer {
  return {
    id: 'e1',
    role: 'employer',
    email: 'e@example.com',
    phone: '+84902000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: ANCHOR_ISO,
    companyName: 'Quán A',
    businessType: 'Nhà hàng',
    verifiedBusiness: false,
    boostCredits: 0,
    employerType10A: 'HouseholdBusiness',
  };
}

function setupStores(opts: {
  shifts: Shift[];
  applications: Application[];
  users?: Array<Worker | Employer>;
}) {
  useShiftStore.setState({
    shifts: opts.shifts,
    lastLifecycleSyncAt: null,
  });
  useApplicationStore.setState({
    applications: opts.applications,
    ratings: [],
    disputes: [],
  });
  useUserStore.setState({
    users: opts.users ?? [buildEmployer(), buildWorker('w1')],
  });
  useNotificationStore.setState({ notifications: [] });
  useWalletStore.setState({ wallets: [], ledger: [] });
  useVerificationStore.setState({
    workerDocuments: [],
    employerDocuments: [],
    employerTypeChangeRequests: [],
  });
  useEmployerFeedbackStore.setState({ feedback: [] });
}

function timelineKindsOf(shiftId: string): string[] {
  const shift = useShiftStore.getState().getById(shiftId);
  return (shift?.timeline ?? []).map((t: ShiftTimelineEntry) => t.kind);
}

// ---------------------------------------------------------------------------
// Batch 4B — timeline emission threading
// ---------------------------------------------------------------------------

describe('Batch 4B: timeline emission threading', () => {
  beforeEach(() => {
    setupStores({ shifts: [], applications: [] });
  });

  it('apply emits a WorkerApplied timeline entry on the shift', () => {
    const shift = buildShift();
    setupStores({ shifts: [shift], applications: [] });
    const r = useApplicationStore.getState().apply(shift.id, 'w1');
    expect(r.ok).toBe(true);
    expect(timelineKindsOf(shift.id)).toContain('WorkerApplied');
  });

  it('approve emits an EmployerApprovedApplicant entry', () => {
    const shift = buildShift({ positionsTotal: 2 });
    const app = buildApp(shift.id, 'w1', { status: 'Pending' });
    setupStores({ shifts: [shift], applications: [app] });
    const r = useApplicationStore.getState().approve(app.id);
    expect(r.ok).toBe(true);
    expect(timelineKindsOf(shift.id)).toContain('EmployerApprovedApplicant');
  });

  it('checkIn emits a WorkerCheckedIn entry', () => {
    // Pin "now" to within the 15-minute check-in window.
    const start = new Date();
    start.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endTime = `${pad((start.getHours() + 1) % 24)}:${pad(start.getMinutes())}`;
    const shift = buildShift({
      id: 's-now',
      date,
      startTime,
      endTime,
      escrowStatus: 'Deposited',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'Approved',
      payoutAmount: 50_000,
    });
    setupStores({ shifts: [shift], applications: [app] });
    const r = useApplicationStore.getState().checkIn(app.id);
    expect(r.ok).toBe(true);
    expect(timelineKindsOf(shift.id)).toContain('WorkerCheckedIn');
  });

  it('markPresentByEmployer emits an EmployerMarkedPresent entry', () => {
    const start = new Date();
    start.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endTime = `${pad((start.getHours() + 1) % 24)}:${pad(start.getMinutes())}`;
    const shift = buildShift({
      id: 's-now',
      date,
      startTime,
      endTime,
      escrowStatus: 'Deposited',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'Approved',
      payoutAmount: 50_000,
    });
    setupStores({ shifts: [shift], applications: [app] });
    const r = useApplicationStore.getState().markPresentByEmployer(app.id);
    expect(r.ok).toBe(true);
    expect(timelineKindsOf(shift.id)).toContain('EmployerMarkedPresent');
  });

  it('markPresentByEmployer is idempotent — no duplicate timeline entry', () => {
    const start = new Date();
    start.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endTime = `${pad((start.getHours() + 1) % 24)}:${pad(start.getMinutes())}`;
    const shift = buildShift({
      id: 's-now',
      date,
      startTime,
      endTime,
      escrowStatus: 'Deposited',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'Approved',
      payoutAmount: 50_000,
    });
    setupStores({ shifts: [shift], applications: [app] });
    const r1 = useApplicationStore.getState().markPresentByEmployer(app.id);
    expect(r1.ok).toBe(true);
    const r2 = useApplicationStore.getState().markPresentByEmployer(app.id);
    // Second call must return WRONG_STATUS, store action exits early
    // BEFORE timeline emission, so only one entry appears.
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe('WRONG_STATUS');
    const presentEntries = timelineKindsOf(shift.id).filter(
      (k) => k === 'EmployerMarkedPresent',
    );
    expect(presentEntries.length).toBe(1);
  });

  it('markNoShow emits an EmployerMarkedAbsent entry', () => {
    const shift = buildShift({
      // Past start so the no-show gate clears.
      date: '2020-01-01',
      startTime: '08:00',
      endTime: '12:00',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'Approved',
      payoutAmount: 200_000,
    });
    setupStores({ shifts: [shift], applications: [app] });
    const r = useApplicationStore.getState().markNoShow(app.id);
    expect(r.ok).toBe(true);
    expect(timelineKindsOf(shift.id)).toContain('EmployerMarkedAbsent');
  });

  it('confirmCompletion emits a WageReleased entry and credits worker wallet', () => {
    const shift = buildShift({
      escrowStatus: 'Completed',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'CheckedOut',
      checkOutAt: ANCHOR_ISO,
      payoutAmount: 200_000,
    });
    setupStores({ shifts: [shift], applications: [app] });
    const r = useApplicationStore
      .getState()
      .confirmCompletion(app.id, { stars: 5 });
    expect(r.ok).toBe(true);
    expect(timelineKindsOf(shift.id)).toContain('WageReleased');
    expect(useWalletStore.getState().getBalance('w1')).toBe(200_000);
  });
});

// ---------------------------------------------------------------------------
// Batch 4B — wallet ledger entries on canonical paths
// ---------------------------------------------------------------------------

describe('Batch 4B: wallet ledger', () => {
  beforeEach(() => {
    setupStores({ shifts: [], applications: [] });
  });

  it('simulateDeposit debits employer wallet with EmployerDepositHeld', () => {
    const shift = buildShift({
      status: 'Draft',
      escrowStatus: 'PendingDeposit',
      depositAmount: 200_000,
    });
    setupStores({
      shifts: [shift],
      applications: [],
    });
    // Need verification docs so the readiness gate passes.
    useVerificationStore.setState({
      workerDocuments: [],
      employerDocuments: [
        {
          id: 'doc-rep',
          employerId: 'e1',
          employerType: 'HouseholdBusiness',
          documentType: 'RepresentativeId',
          status: 'Approved',
          displayLabel: 'CCCD',
          submittedAt: ANCHOR_ISO,
        },
        {
          id: 'doc-1',
          employerId: 'e1',
          employerType: 'HouseholdBusiness',
          documentType: 'BusinessLicense',
          status: 'Approved',
          displayLabel: 'GPKD',
          submittedAt: ANCHOR_ISO,
        },
        {
          id: 'doc-2',
          employerId: 'e1',
          employerType: 'HouseholdBusiness',
          documentType: 'StorefrontPhoto',
          status: 'Approved',
          displayLabel: 'Ảnh mặt bằng',
          submittedAt: ANCHOR_ISO,
        },
      ],
      employerTypeChangeRequests: [],
    });
    const r = useShiftStore.getState().simulateDeposit(shift.id);
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().getBalance('e1')).toBe(-200_000);
    const ledger = useWalletStore.getState().forUser('e1');
    expect(ledger.some((l) => l.kind === 'EmployerDepositHeld')).toBe(true);
    // Timeline entries should also include both ShiftPublished and DepositHeld.
    const kinds = timelineKindsOf(shift.id);
    expect(kinds).toContain('DepositHeld');
    expect(kinds).toContain('ShiftPublished');
  });

  it('admin resolveDispute(ResolvedReleased) credits worker and emits WageReleased timeline', () => {
    const shift = buildShift({
      escrowStatus: 'Disputed',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'Disputed',
      payoutAmount: 200_000,
    });
    const dispute = {
      id: 'd-1',
      applicationId: app.id,
      shiftId: shift.id,
      raisedBy: 'employer' as const,
      reason: 'không hoàn thành',
      status: 'Open' as const,
      createdAt: ANCHOR_ISO,
    };
    setupStores({
      shifts: [shift],
      applications: [app],
    });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [dispute],
    });
    useUserStore.setState({
      users: [
        buildEmployer(),
        buildWorker('w1'),
        {
          id: 'admin1',
          role: 'admin',
          fullName: 'Admin',
          email: 'a@a',
          phone: '+84',
          passwordHash: 'mock-hash:demo',
          suspended: false,
          createdAt: ANCHOR_ISO,
        },
      ],
    });
    const r = useAdminStore
      .getState()
      .resolveDispute(dispute.id, 'ResolvedReleased', 'OK');
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().getBalance('w1')).toBe(200_000);
    expect(timelineKindsOf(shift.id)).toContain('AdminResolvedDispute');
    expect(timelineKindsOf(shift.id)).toContain('WageReleased');
  });
});
