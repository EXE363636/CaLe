/**
 * CORE-STABILITY-8 — unit guards for:
 *   Part 1: ShiftDraft store + draft exclusion from real-shift surfaces
 *   Part 2: required on-site contact for publish/deposit
 *   Part 3: lifecycle integrity (recruiting window closes at start)
 *   Part 4: attendance state machine (mark-present ≠ self check-in)
 *   Part 5: refund policy (empty-expiry full refund; understaffed auto-cancel)
 *
 * Deterministic store/domain tests; no React, no timers.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useShiftDraftStore } from '@/stores/shiftDraftStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useUserStore } from '@/stores/userStore';
import { useWalletStore } from '@/stores/walletStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useVerificationStore } from '@/stores/verificationStore';
import {
  suggestShiftStatus,
  getShiftDisplayPhase,
} from '@/domain/shiftLifecycle';
import { canCheckOut, canCheckIn } from '@/domain/timeGates';
import type {
  Application,
  Employer,
  Shift,
  ShiftDraft,
  Worker,
} from '@/types';

const A_ISO = '2030-06-02T00:00:00.000Z';

function draftInput(over: Partial<ShiftDraft> = {}) {
  return {
    employerId: 'emp-1',
    title: 'Ca nháp',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    customJobTypeName: '',
    location: 'TP.HCM',
    date: '2030-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    workplaceImageLabel: '',
    workplaceNotes: '',
    onSiteContactName: '',
    onSiteContactPhone: '',
    requiresVerifiedDocumentOnArrival: false,
    evidenceRequirement: 'OptionalPhoto' as const,
    ...over,
  };
}

function mkShift(over: Partial<Shift> = {}): Shift {
  return {
    id: 's-cs8',
    employerId: 'emp-1',
    title: 'Phục vụ',
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
    status: 'Draft',
    escrowStatus: 'PendingDeposit',
    depositAmount: 200_000,
    createdAt: A_ISO,
    updatedAt: A_ISO,
    evidenceRequirement: 'OptionalPhoto',
    timeline: [],
    ...over,
  };
}

function mkEmployer(over: Partial<Employer> = {}): Employer {
  return {
    id: 'emp-1',
    role: 'employer',
    email: 'e@x.vn',
    phone: '+84902000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: A_ISO,
    companyName: 'Quán Test',
    businessType: 'Nhà hàng',
    verifiedBusiness: true,
    boostCredits: 0,
    employerType10A: 'HouseholdBusiness',
    ...over,
  };
}

function mkWorker(id: string, over: Partial<Worker> = {}): Worker {
  return {
    id,
    role: 'worker',
    email: `${id}@x.vn`,
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: A_ISO,
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
    ...over,
  };
}

function mkApp(over: Partial<Application> = {}): Application {
  return {
    id: 'app-cs8',
    shiftId: 's-cs8',
    workerId: 'w-cs8',
    status: 'Approved',
    appliedAt: A_ISO,
    approvedAt: A_ISO,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Part 1 — ShiftDraft store
// ---------------------------------------------------------------------------

describe('shiftDraftStore (Part 1)', () => {
  beforeEach(() => {
    useShiftDraftStore.setState({ drafts: [] });
  });

  it('saves a draft with savedAt + updatedAt and returns it', () => {
    const rec = useShiftDraftStore.getState().save(draftInput());
    expect(rec.id).toBeTruthy();
    expect(rec.savedAt).toBeTruthy();
    expect(rec.updatedAt).toBeTruthy();
    expect(useShiftDraftStore.getState().forEmployer('emp-1')).toHaveLength(1);
  });

  it('updates a draft in place and re-stamps updatedAt', () => {
    const rec = useShiftDraftStore.getState().save(draftInput());
    const updated = useShiftDraftStore
      .getState()
      .update(rec.id, { title: 'Đã sửa' });
    expect(updated?.title).toBe('Đã sửa');
    // savedAt preserved.
    expect(updated?.savedAt).toBe(rec.savedAt);
  });

  it('removes a draft (no cancellation history / refund / notification)', () => {
    const rec = useShiftDraftStore.getState().save(draftInput());
    useShiftDraftStore.getState().remove(rec.id);
    expect(useShiftDraftStore.getState().forEmployer('emp-1')).toHaveLength(0);
  });

  it('scopes drafts per employer', () => {
    useShiftDraftStore.getState().save(draftInput({ employerId: 'emp-1' }));
    useShiftDraftStore.getState().save(draftInput({ employerId: 'emp-2' }));
    expect(useShiftDraftStore.getState().forEmployer('emp-1')).toHaveLength(1);
    expect(useShiftDraftStore.getState().forEmployer('emp-2')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Part 1 — Draft shifts excluded from real-shift surfaces
// ---------------------------------------------------------------------------

describe('Draft shift exclusion (Part 1)', () => {
  beforeEach(() => {
    useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
  });

  it('byEmployer excludes Draft shifts', () => {
    useShiftStore.setState({
      shifts: [
        mkShift({ id: 'd1', status: 'Draft' }),
        mkShift({ id: 'p1', status: 'Published', escrowStatus: 'Deposited' }),
      ],
      lastLifecycleSyncAt: null,
    });
    const list = useShiftStore.getState().byEmployer('emp-1');
    expect(list.map((s) => s.id)).toEqual(['p1']);
  });

  it('discardDraftShift removes a Draft and refuses a Published shift', () => {
    useShiftStore.setState({
      shifts: [
        mkShift({ id: 'd1', status: 'Draft' }),
        mkShift({ id: 'p1', status: 'Published', escrowStatus: 'Deposited' }),
      ],
      lastLifecycleSyncAt: null,
    });
    expect(useShiftStore.getState().discardDraftShift('d1')).toBe(true);
    expect(useShiftStore.getState().getById('d1')).toBeUndefined();
    expect(useShiftStore.getState().discardDraftShift('p1')).toBe(false);
    expect(useShiftStore.getState().getById('p1')).toBeDefined();
  });

  it('lifecycle sync never moves a Draft shift', () => {
    const draft = mkShift({ status: 'Draft' });
    expect(suggestShiftStatus(draft, [], '2030-06-02T10:00:00.000Z')).toBe(
      'Draft',
    );
  });
});

// ---------------------------------------------------------------------------
// Part 2 — required on-site contact for publish/deposit
// ---------------------------------------------------------------------------

describe('simulateDeposit contact-required guard (Part 2)', () => {
  beforeEach(() => {
    useUserStore.setState({ users: [mkEmployer()] });
    useWalletStore.setState({ wallets: [], ledger: [] });
    useVerificationStore.setState({
      workerDocuments: [],
      employerDocuments: [],
      typeChangeRequests: [],
    });
  });

  function seedDepositableShift(over: Partial<Shift> = {}) {
    useShiftStore.setState({
      shifts: [
        mkShift({
          status: 'Draft',
          escrowStatus: 'PendingDeposit',
          // verified employer with no docs would hit the verification
          // gate; disable that gate by giving the employer no
          // verification requirement via verifiedBusiness + no docs is
          // still gated, so we stub the readiness by marking the
          // employer verified AND seeding nothing — the gate uses
          // computePostingReadiness which needs docs. To isolate the
          // CONTACT guard we fund the wallet and supply contact in the
          // "passes" case; the verification gate runs FIRST so for the
          // contact test we must pass verification too.
          ...over,
        }),
      ],
      lastLifecycleSyncAt: null,
    });
  }

  it('blocks publish when contact person is missing (CONTACT_PERSON_REQUIRED)', () => {
    // Bypass the verification gate by making the employer an Individual
    // with an approved representative id is complex; instead we assert
    // the guard ordering by giving a verified employer that passes the
    // readiness via no-op: the verification gate only runs when the
    // employer record resolves. We seed a NON-employer-typed owner so
    // the verification gate is skipped and the contact guard is reached.
    useUserStore.setState({ users: [] }); // no employer record → skip verification gate
    seedDepositableShift({ onSiteContactName: '', onSiteContactPhone: '' });
    useWalletStore.getState().topUp('emp-1', 1_000_000);
    const r = useShiftStore.getState().simulateDeposit('s-cs8');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CONTACT_PERSON_REQUIRED');
  });

  it('blocks publish when contact phone is missing/invalid (CONTACT_PHONE_REQUIRED)', () => {
    useUserStore.setState({ users: [] });
    seedDepositableShift({
      onSiteContactName: 'Anh Liêm',
      onSiteContactPhone: '',
    });
    useWalletStore.getState().topUp('emp-1', 1_000_000);
    const r = useShiftStore.getState().simulateDeposit('s-cs8');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CONTACT_PHONE_REQUIRED');
  });

  it('publishes when contact person + valid phone are present', () => {
    useUserStore.setState({ users: [] });
    seedDepositableShift({
      onSiteContactName: 'Anh Liêm',
      onSiteContactPhone: '0901234567',
    });
    useWalletStore.getState().topUp('emp-1', 1_000_000);
    const r = useShiftStore.getState().simulateDeposit('s-cs8');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Published');
  });
});

// ---------------------------------------------------------------------------
// Part 3 — lifecycle integrity (recruiting window closes at start)
// ---------------------------------------------------------------------------

describe('lifecycle integrity at start (Part 3)', () => {
  // Shift 13:00–14:00 local. Build via local Date so the test is
  // timezone-stable.
  const start = new Date(A_ISO);
  start.setHours(13, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60_000);
  const shift = mkShift({
    status: 'Published',
    escrowStatus: 'Deposited',
    positionsTotal: 2,
    positionsFilled: 1,
    date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    startTime: `${String(start.getHours()).padStart(2, '0')}:00`,
    endTime: `${String(end.getHours()).padStart(2, '0')}:00`,
  });
  const app = mkApp({ status: 'Approved' });

  it('at 12:59 not ongoing (still Published)', () => {
    const now = new Date(start.getTime() - 60_000).toISOString();
    expect(suggestShiftStatus(shift, [app], now)).toBe('Published');
  });

  it('at 13:00 (start) rolls to InProgress (recruiting closed)', () => {
    expect(suggestShiftStatus(shift, [app], start.toISOString())).toBe(
      'InProgress',
    );
  });

  it('at 13:59 shows InProgress, NOT "Đang tuyển" (Published)', () => {
    const now = new Date(start.getTime() + 59 * 60_000).toISOString();
    const status = suggestShiftStatus(shift, [app], now);
    expect(status).toBe('InProgress');
    expect(status).not.toBe('Published');
    // Display phase agrees.
    expect(getShiftDisplayPhase(shift, [app], now)).toBe('InProgress');
  });
});

// ---------------------------------------------------------------------------
// Part 4 — attendance state machine
// ---------------------------------------------------------------------------

describe('attendance state machine (Part 4)', () => {
  beforeEach(() => {
    useUserStore.setState({
      users: [mkEmployer(), mkWorker('w-cs8')],
    });
    useNotificationStore.setState({ notifications: [] });
    useApplicationStore.setState({
      applications: [mkApp({ status: 'Approved' })],
      ratings: [],
      disputes: [],
    });
    // Shift currently running (start in the past, end in the future
    // relative to a fixed now used below).
    useShiftStore.setState({
      shifts: [
        mkShift({
          status: 'InProgress',
          escrowStatus: 'Deposited',
          date: '2030-06-02',
          startTime: '08:00',
          endTime: '23:00',
        }),
      ],
      lastLifecycleSyncAt: null,
    });
  });

  it('markPresentByEmployer sets markedPresentAt but NOT the worker checkInAt', () => {
    const r = useApplicationStore.getState().markPresentByEmployer('app-cs8');
    expect(r.ok).toBe(true);
    const app = useApplicationStore.getState().getById('app-cs8');
    expect(app?.status).toBe('CheckedIn');
    expect(app?.markedPresentAt).toBeTruthy();
    // CORE-STABILITY-8 Part 4 — worker's own checkInAt stays unset.
    expect(app?.checkInAt).toBeUndefined();
  });

  it('employer-marked-present alone does NOT unlock check-out (no self check-in)', () => {
    useApplicationStore.getState().markPresentByEmployer('app-cs8');
    const app = useApplicationStore.getState().getById('app-cs8')!;
    const shift = useShiftStore.getState().getById('s-cs8')!;
    const now = '2030-06-02T10:00:00.000Z';
    expect(canCheckOut(now, app, shift)).toBe(false);
  });

  it('worker can self check-in after employer mark-present, which unlocks check-out', () => {
    useApplicationStore.getState().markPresentByEmployer('app-cs8');
    const app = useApplicationStore.getState().getById('app-cs8')!;
    const shift = useShiftStore.getState().getById('s-cs8')!;
    const now = '2030-06-02T10:00:00.000Z';
    // Worker can still confirm presence mid-shift.
    expect(canCheckIn(now, app, shift)).toBe(true);
    const r = useApplicationStore.getState().checkIn('app-cs8');
    expect(r.ok).toBe(true);
    const after = useApplicationStore.getState().getById('app-cs8')!;
    expect(after.checkInAt).toBeTruthy();
    // CORE-STABILITY-9 Part 2 — check-out is mid-shift gated: it stays
    // locked at 10:00 (shift runs 08:00–23:00) and only opens at end.
    expect(canCheckOut(now, after, shift)).toBe(false);
    // After the shift ends (local 23:00) the self-checked-in worker can
    // check out. Build the "after end" instant from the same local frame
    // the gate uses to parse `endTime` so this is timezone-stable.
    const afterEndIso = new Date(
      new Date('2030-06-02T23:00:00').getTime() + 60_000,
    ).toISOString();
    expect(canCheckOut(afterEndIso, after, shift)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Part 5 — refund policy
// ---------------------------------------------------------------------------

describe('refund policy (Part 5)', () => {
  beforeEach(() => {
    useUserStore.setState({ users: [mkEmployer()] });
    useWalletStore.setState({ wallets: [], ledger: [] });
    useNotificationStore.setState({ notifications: [] });
    useApplicationStore.setState({
      applications: [],
      ratings: [],
      disputes: [],
    });
  });

  it('empty deposited shift expiry refunds the full deposit to the employer', () => {
    // Shift in the past with no applicants, Expired-eligible.
    useShiftStore.setState({
      shifts: [
        mkShift({
          status: 'Published',
          escrowStatus: 'Deposited',
          positionsTotal: 2,
          positionsFilled: 0,
          date: '2030-06-01',
          startTime: '08:00',
          endTime: '12:00',
        }),
      ],
      lastLifecycleSyncAt: null,
    });
    // Run sync at a time well after the shift end.
    useApplicationStore.getState().runLifecycleSync('2030-06-01T13:00:00.000Z');
    // Full deposit refunded.
    expect(useWalletStore.getState().getBalance('emp-1')).toBe(200_000);
    const refund = useWalletStore
      .getState()
      .forUser('emp-1')
      .find((l) => l.kind === 'EmployerUnusedRefund');
    expect(refund).toBeDefined();
    // Escrow flipped to Refunded.
    expect(useShiftStore.getState().getById('s-cs8')?.escrowStatus).toBe(
      'Refunded',
    );
    // Refund is not duplicated on a second sync.
    useApplicationStore.getState().runLifecycleSync('2030-06-01T14:00:00.000Z');
    expect(useWalletStore.getState().getBalance('emp-1')).toBe(200_000);
  });

  it('RequireFull policy auto-cancels an understaffed shift at start + refunds', () => {
    useUserStore.setState({
      users: [
        mkEmployer({ understaffedPolicy: 'RequireFull' }),
        mkWorker('w-cs8'),
      ],
    });
    // Build a shift whose start is in the local past so the sync's
    // wall-clock comparison fires regardless of test TZ.
    const start = new Date();
    start.setFullYear(2030, 5, 1);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 4 * 60 * 60_000);
    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    useShiftStore.setState({
      shifts: [
        mkShift({
          status: 'Published',
          escrowStatus: 'Deposited',
          positionsTotal: 3,
          positionsFilled: 1,
          date: dateStr,
          startTime: '08:00',
          endTime: `${String(end.getHours()).padStart(2, '0')}:00`,
        }),
      ],
      lastLifecycleSyncAt: null,
    });
    useApplicationStore.setState({
      applications: [mkApp({ status: 'Approved', shiftId: 's-cs8' })],
      ratings: [],
      disputes: [],
    });
    // Sync 30 min after start: not full (1/3), no check-in → auto-cancel.
    const syncNow = new Date(start.getTime() + 30 * 60_000).toISOString();
    useApplicationStore.getState().runLifecycleSync(syncNow);
    const shift = useShiftStore.getState().getById('s-cs8');
    expect(shift?.status).toBe('Cancelled');
    expect(shift?.escrowStatus).toBe('Refunded');
    // Full deposit refunded.
    expect(useWalletStore.getState().getBalance('emp-1')).toBe(200_000);
    // Approved worker flipped to CancelledByEmployer (no penalty).
    expect(useApplicationStore.getState().getById('app-cs8')?.status).toBe(
      'CancelledByEmployer',
    );
  });

  it('RunWithApproved policy does NOT auto-cancel an understaffed shift', () => {
    useUserStore.setState({
      users: [
        mkEmployer({ understaffedPolicy: 'RunWithApproved' }),
        mkWorker('w-cs8'),
      ],
    });
    const start = new Date();
    start.setFullYear(2030, 5, 1);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 4 * 60 * 60_000);
    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    useShiftStore.setState({
      shifts: [
        mkShift({
          status: 'Published',
          escrowStatus: 'Deposited',
          positionsTotal: 3,
          positionsFilled: 1,
          date: dateStr,
          startTime: '08:00',
          endTime: `${String(end.getHours()).padStart(2, '0')}:00`,
        }),
      ],
      lastLifecycleSyncAt: null,
    });
    useApplicationStore.setState({
      applications: [mkApp({ status: 'Approved', shiftId: 's-cs8' })],
      ratings: [],
      disputes: [],
    });
    const syncNow = new Date(start.getTime() + 30 * 60_000).toISOString();
    useApplicationStore.getState().runLifecycleSync(syncNow);
    // Not cancelled — runs with the approved worker (rolls to InProgress).
    expect(useShiftStore.getState().getById('s-cs8')?.status).not.toBe(
      'Cancelled',
    );
  });
});
