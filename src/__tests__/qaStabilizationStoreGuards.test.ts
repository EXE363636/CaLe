/**
 * QA-Stabilization-Automation Phase 4 — store-level regression guards.
 *
 * Two contracts that the UI/domain unit tests + E2E specs exercise
 * indirectly, pinned here directly at the store boundary so a future
 * refactor can't silently regress them:
 *
 *   1. `shiftStore.simulateDeposit` HARD-BLOCKS a past / inconsistent
 *      shift with `PAST_SHIFT` and performs NO escrow flip, NO wallet
 *      debit, NO timeline entry, NO Published status. (Phase 2A.7)
 *
 *   2. `applicationStore.runLifecycleSync` Step 2b reconciles an
 *      `Approved`-but-never-checked-in application on an ENDED shift to
 *      the non-penalizing `Expired` terminal with the neutral reason
 *      "Hết hạn — chưa ghi nhận có mặt.", fires exactly one
 *      `ApplicationExpired` notification, leaves worker reputation
 *      untouched, and is idempotent on a second pass. (Phase 2B.4)
 *
 * Deterministic: every timestamp is an explicit literal and the
 * lifecycle sync receives an explicit `nowIso`. No `Date.now()`.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useWalletStore } from '@/stores/walletStore';
import { useVerificationStore } from '@/stores/verificationStore';
import type {
  Application,
  Employer,
  EmployerVerificationDocument,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMPLOYER_ID = 'employer-guard-1';
const WORKER_ID = 'worker-guard-1';

function makeEmployer(): Employer {
  return {
    id: EMPLOYER_ID,
    role: 'employer',
    email: 'guard-emp@example.com',
    phone: '+84902000111',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    companyName: 'Quán Kiểm Thử',
    businessType: 'Nhà hàng',
    verifiedBusiness: true,
    boostCredits: 0,
    employerType10A: 'HouseholdBusiness',
  };
}

function makeWorker(): Worker {
  return {
    id: WORKER_ID,
    role: 'worker',
    email: 'guard-worker@example.com',
    phone: '+84905000111',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    fullName: 'Người Kiểm Thử',
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone', 'id'],
    reputationScore: 88,
    completedShiftCount: 2,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
}

/** Three approved docs so `computePostingReadiness` passes for a
 * HouseholdBusiness employer — isolates the PAST_SHIFT guard. */
function approvedEmployerDocs(): EmployerVerificationDocument[] {
  const base = {
    employerId: EMPLOYER_ID,
    employerType: 'HouseholdBusiness' as const,
    status: 'Approved' as const,
    submittedAt: '2026-01-02T00:00:00.000Z',
    reviewedAt: '2026-01-03T00:00:00.000Z',
  };
  return [
    { ...base, id: 'd-rep', documentType: 'RepresentativeId', displayLabel: 'CCCD' },
    { ...base, id: 'd-biz', documentType: 'BusinessLicense', displayLabel: 'GPKD' },
    { ...base, id: 'd-store', documentType: 'StorefrontPhoto', displayLabel: 'Ảnh mặt bằng' },
  ] as EmployerVerificationDocument[];
}

function makeShift(over: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-guard-1',
    employerId: EMPLOYER_ID,
    title: 'Ca kiểm thử quá khứ',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2020-01-01', // long past
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 0,
    status: 'Draft',
    escrowStatus: 'PendingDeposit',
    depositAmount: 200_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    evidenceRequirement: 'OptionalPhoto',
    timeline: [],
    workplaceImageLabel: 'Ảnh mặt bằng',
    ...over,
  };
}

function makeApp(over: Partial<Application> = {}): Application {
  return {
    id: 'app-guard-1',
    shiftId: 'shift-guard-1',
    workerId: WORKER_ID,
    status: 'Approved',
    appliedAt: '2026-01-01T00:00:00.000Z',
    approvedAt: '2026-01-02T00:00:00.000Z',
    payoutAmount: 200_000,
    ...over,
  };
}

function resetStores() {
  useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
  useApplicationStore.setState({ applications: [], ratings: [], disputes: [] });
  useUserStore.setState({ users: [makeEmployer(), makeWorker()] });
  useNotificationStore.setState({ notifications: [] });
  useWalletStore.setState({ wallets: [], ledger: [] });
  useVerificationStore.setState({
    workerDocuments: [],
    employerDocuments: approvedEmployerDocs(),
    typeChangeRequests: [],
  });
}

// ---------------------------------------------------------------------------
// 1 — simulateDeposit hard-blocks a past shift
// ---------------------------------------------------------------------------

describe('shiftStore.simulateDeposit — past-shift hard block (Phase 2A)', () => {
  beforeEach(resetStores);

  it('rejects PAST_SHIFT and performs no escrow / wallet / timeline / publish write', () => {
    const shift = makeShift(); // date 2020-01-01, escrow PendingDeposit
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });

    const r = useShiftStore.getState().simulateDeposit(shift.id);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('PAST_SHIFT');

    // No state mutation: escrow + status unchanged, still a Draft.
    const after = useShiftStore.getState().getById(shift.id)!;
    expect(after.escrowStatus).toBe('PendingDeposit');
    expect(after.status).toBe('Draft');
    expect(after.timeline ?? []).toHaveLength(0);

    // No wallet debit happened.
    expect(useWalletStore.getState().getBalance(EMPLOYER_ID)).toBe(0);
    expect(useWalletStore.getState().ledger).toHaveLength(0);
  });

  it('still deposits a valid FUTURE shift (guard does not over-block)', () => {
    const future = makeShift({
      id: 'shift-guard-future',
      date: '2030-01-01',
      startTime: '08:00',
      endTime: '12:00',
    });
    useShiftStore.setState({ shifts: [future], lastLifecycleSyncAt: null });
    // CORE-STABILITY-6 Part 4 — fund the employer wallet so the new
    // insufficient-balance guard is satisfied (deposit = 200_000).
    useWalletStore.getState().topUp(EMPLOYER_ID, 200_000);

    const r = useShiftStore.getState().simulateDeposit(future.id);

    expect(r.ok).toBe(true);
    const after = useShiftStore.getState().getById(future.id)!;
    expect(after.status).toBe('Published');
    expect(after.escrowStatus).toBe('Deposited');
    // Wallet: topped up 200_000, debited 200_000 for the deposit → 0.
    expect(useWalletStore.getState().getBalance(EMPLOYER_ID)).toBe(0);
  });

  it('blocks deposit with INSUFFICIENT_BALANCE and creates no published shift / ledger', () => {
    const future = makeShift({
      id: 'shift-guard-poor',
      date: '2030-01-01',
      startTime: '08:00',
      endTime: '12:00',
    });
    useShiftStore.setState({ shifts: [future], lastLifecycleSyncAt: null });
    // Employer wallet has only part of the required 200_000 deposit.
    useWalletStore.getState().topUp(EMPLOYER_ID, 199_000);
    const ledgerBefore = useWalletStore.getState().ledger.length;

    const r = useShiftStore.getState().simulateDeposit(future.id);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INSUFFICIENT_BALANCE');
    // No publish, no deposit ledger entry, balance unchanged.
    const after = useShiftStore.getState().getById(future.id)!;
    expect(after.status).toBe('Draft');
    expect(after.escrowStatus).toBe('PendingDeposit');
    expect(useWalletStore.getState().ledger.length).toBe(ledgerBefore);
    expect(useWalletStore.getState().getBalance(EMPLOYER_ID)).toBe(199_000);
  });

  it('deposits when the employer has EXACTLY the required balance', () => {
    const future = makeShift({
      id: 'shift-guard-exact',
      date: '2030-01-01',
      startTime: '08:00',
      endTime: '12:00',
    });
    useShiftStore.setState({ shifts: [future], lastLifecycleSyncAt: null });
    useWalletStore.getState().topUp(EMPLOYER_ID, 200_000); // exact deposit

    const r = useShiftStore.getState().simulateDeposit(future.id);

    expect(r.ok).toBe(true);
    expect(useShiftStore.getState().getById(future.id)!.status).toBe('Published');
    expect(useWalletStore.getState().getBalance(EMPLOYER_ID)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2 — runLifecycleSync Step 2b reconciles stale Approved apps
// ---------------------------------------------------------------------------

describe('applicationStore.runLifecycleSync — Step 2b stale-Approved reconciliation (Phase 2B)', () => {
  beforeEach(resetStores);

  // Sync at a "now" long after the shift ended.
  const NOW_ISO = '2026-05-30T05:00:00.000Z';

  it('moves an Approved-never-checked-in app on an ended shift to Expired (neutral, no reputation change)', () => {
    const endedShift = makeShift({
      id: 'shift-ended',
      date: '2026-05-20', // ended days before NOW
      startTime: '08:00',
      endTime: '12:00',
      status: 'Expired',
      escrowStatus: 'Deposited',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    const staleApp = makeApp({
      id: 'app-stale',
      shiftId: endedShift.id,
      status: 'Approved',
      // No checkInAt — never showed up.
    });
    useShiftStore.setState({ shifts: [endedShift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [staleApp],
      ratings: [],
      disputes: [],
    });

    const reputationBefore = (useUserStore.getState().users.find(
      (u) => u.id === WORKER_ID,
    ) as Worker).reputationScore;

    useApplicationStore.getState().runLifecycleSync(NOW_ISO);

    const after = useApplicationStore
      .getState()
      .applications.find((a) => a.id === 'app-stale')!;
    expect(after.status).toBe('Expired');
    expect(after.expiredReason).toBe('Hết hạn — chưa ghi nhận có mặt.');
    expect(after.expiredAt).toBeTruthy();

    // Non-penalizing: reputation unchanged.
    const reputationAfter = (useUserStore.getState().users.find(
      (u) => u.id === WORKER_ID,
    ) as Worker).reputationScore;
    expect(reputationAfter).toBe(reputationBefore);

    // Exactly one ApplicationExpired notification to the worker.
    const expiredNotifs = useNotificationStore
      .getState()
      .notifications.filter(
        (n) => n.kind === 'ApplicationExpired' && n.userId === WORKER_ID,
      );
    expect(expiredNotifs).toHaveLength(1);
  });

  it('is idempotent — a second sync produces no further status change and no duplicate notification', () => {
    const endedShift = makeShift({
      id: 'shift-ended-2',
      date: '2026-05-20',
      startTime: '08:00',
      endTime: '12:00',
      status: 'Expired',
      escrowStatus: 'Deposited',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    const staleApp = makeApp({
      id: 'app-stale-2',
      shiftId: endedShift.id,
      status: 'Approved',
    });
    useShiftStore.setState({ shifts: [endedShift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [staleApp],
      ratings: [],
      disputes: [],
    });

    useApplicationStore.getState().runLifecycleSync(NOW_ISO);
    const afterFirst = useApplicationStore
      .getState()
      .applications.find((a) => a.id === 'app-stale-2')!;
    const notifsAfterFirst = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ApplicationExpired').length;

    // Second pass — no external state change.
    useApplicationStore.getState().runLifecycleSync(NOW_ISO);
    const afterSecond = useApplicationStore
      .getState()
      .applications.find((a) => a.id === 'app-stale-2')!;
    const notifsAfterSecond = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ApplicationExpired').length;

    expect(afterSecond.status).toBe('Expired');
    expect(afterSecond.expiredAt).toBe(afterFirst.expiredAt);
    expect(notifsAfterSecond).toBe(notifsAfterFirst);
  });

  it('does NOT touch an Approved app on a still-future shift', () => {
    const futureShift = makeShift({
      id: 'shift-future-keep',
      date: '2030-01-01',
      startTime: '08:00',
      endTime: '12:00',
      status: 'Published',
      escrowStatus: 'Deposited',
      positionsTotal: 1,
      positionsFilled: 1,
    });
    const approvedApp = makeApp({
      id: 'app-future-keep',
      shiftId: futureShift.id,
      status: 'Approved',
    });
    useShiftStore.setState({ shifts: [futureShift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [approvedApp],
      ratings: [],
      disputes: [],
    });

    useApplicationStore.getState().runLifecycleSync(NOW_ISO);

    const after = useApplicationStore
      .getState()
      .applications.find((a) => a.id === 'app-future-keep')!;
    expect(after.status).toBe('Approved');
  });
});
