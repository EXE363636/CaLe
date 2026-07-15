/**
 * Phase 10A-Fix-8 — canonical ledger / history records for worker
 * reputation/quota protection and employer deposit/penalty money
 * history.
 *
 * Pins down:
 *   - Every employer cancellation that flips an approved worker writes
 *     a `WorkerProtectionRecord` carrying the actual `reputationPointsRestored`
 *     and `quotaSlotsRefunded` deltas, even when both are zero.
 *   - The notification body quotes the worker's actual deltas so the
 *     copy reads "+2 uy tín" / "+1 lượt hủy được hoàn lại" / "+2 uy tín
 *     / +1 lượt hủy được hoàn lại" / a neutral fallback line when both
 *     deltas are zero.
 *   - The shift record stores the employer-cancellation penalty so any
 *     surface (the new `<EmployerPenaltyLedger>` is the canonical one)
 *     can list it from the live store.
 *   - Pending-only applicants receive no protection record.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Application,
  Employer,
  Shift,
  Worker,
} from '@/types';

const NOW_ISO = '2026-06-01T08:00:00.000Z';
const NOW_MS = new Date(NOW_ISO).getTime();

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

function resetStores() {
  useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
  useApplicationStore.setState({
    applications: [],
    ratings: [],
    disputes: [],
  });
  useUserStore.setState({ users: [] });
  useNotificationStore.setState({ notifications: [] });
}

// ---------------------------------------------------------------------------
// Worker reputation/protection history
// ---------------------------------------------------------------------------

describe('Worker protection history — Phase 10A-Fix-8', () => {
  beforeEach(resetStores);

  it('writes a WorkerProtectionRecord with delta=+2 when reputation < 100', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    const worker = makeWorker('w1', { reputationScore: 80 });
    useUserStore.setState({ users: [makeEmployer(), worker] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Đột xuất hủy');

    const updated = useUserStore.getState().findById('w1') as Worker;
    expect(updated.reputationScore).toBe(82);
    expect(updated.protections).toHaveLength(1);
    const rec = updated.protections![0];
    expect(rec.kind).toBe('EmployerCancelledShift');
    expect(rec.reputationPointsRestored).toBe(2);
    expect(rec.shiftTitle).toBe(shift.title);
    expect(rec.employerName).toBe('Quán A');
    expect(rec.reason).toBe('Đột xuất hủy');
  });

  it('writes a WorkerProtectionRecord with delta=0 when reputation already at the cap (visible reason)', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    const worker = makeWorker('w1', { reputationScore: 100 });
    useUserStore.setState({ users: [makeEmployer(), worker] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Đột xuất hủy');

    const updated = useUserStore.getState().findById('w1') as Worker;
    // Score didn't change (already at the cap).
    expect(updated.reputationScore).toBe(100);
    // Record still exists so the worker can see "we protected you" in
    // the timeline even though the delta is 0.
    expect(updated.protections).toHaveLength(1);
    expect(updated.protections![0].reputationPointsRestored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Worker quota protection history
// ---------------------------------------------------------------------------

describe('Worker quota protection history — Phase 10A-Fix-8', () => {
  beforeEach(resetStores);

  it('refunds one LateCancel slot when the worker had used quota', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    const worker = makeWorker('w1', {
      cancellationHistory: [
        {
          id: 'c1',
          shiftId: 's0',
          cancelledAt: '2026-05-30T00:00:00.000Z',
          type: 'LateCancel',
        },
      ],
    });
    useUserStore.setState({ users: [makeEmployer(), worker] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const updated = useUserStore.getState().findById('w1') as Worker;
    // LateCancel slot dropped → worker's weekly quota usage falls.
    expect(updated.cancellationHistory).toHaveLength(0);
    // Protection record carries the delta the system applied.
    expect(updated.protections![0].quotaSlotsRefunded).toBe(1);
  });

  it('writes the protection record with quotaSlotsRefunded=0 when the worker had no quota usage', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    const worker = makeWorker('w1');
    useUserStore.setState({ users: [makeEmployer(), worker] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const updated = useUserStore.getState().findById('w1') as Worker;
    expect(updated.cancellationHistory).toHaveLength(0);
    expect(updated.protections![0].quotaSlotsRefunded).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Notification body deltas
// ---------------------------------------------------------------------------

describe('EmployerCancelledShift notification body — Phase 10A-Fix-8 deltas', () => {
  beforeEach(resetStores);

  it('quotes "+2 uy tín / +1 lượt hủy được hoàn lại" when both deltas apply', () => {
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
    useUserStore.setState({ users: [makeEmployer(), worker] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const notif = useNotificationStore
      .getState()
      .notifications.find((n) => n.userId === 'w1');
    expect(notif).toBeDefined();
    expect(notif!.body).toContain('+2 uy tín');
    expect(notif!.body).toContain('+1 lượt hủy được hoàn lại');
    expect(notif!.body).toContain('Lý do');
    expect(notif!.body).toContain('Bạn không bị phạt');
  });

  it('quotes "+2 uy tín" only when there is nothing to refund', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1', { reputationScore: 80 })],
    });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const notif = useNotificationStore
      .getState()
      .notifications.find((n) => n.userId === 'w1');
    expect(notif!.body).toContain('+2 uy tín');
    expect(notif!.body).not.toContain('lượt hủy được hoàn lại');
  });

  it('falls back to a neutral protection line when both deltas are 0', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1', { reputationScore: 100 })],
    });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const notif = useNotificationStore
      .getState()
      .notifications.find((n) => n.userId === 'w1');
    expect(notif!.body).toContain('Hệ thống đã ghi nhận bảo vệ quyền lợi');
    expect(notif!.body).not.toContain('+1');
    expect(notif!.body).not.toContain('+2');
  });
});

// ---------------------------------------------------------------------------
// Employer penalty ledger
// ---------------------------------------------------------------------------

describe('Employer penalty ledger — Phase 10A-Fix-8', () => {
  beforeEach(resetStores);

  it('persists the penalty rate and amount on the shift record so the ledger can list it', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1')],
    });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    // Pull the live shift record from the store — this is the source
    // the `<EmployerPenaltyLedger>` UI reads from.
    const updated = useShiftStore.getState().getById(shift.id);
    expect(updated).toBeDefined();
    expect(updated!.cancelledBy).toBe('employer');
    expect(updated!.employerCancelledAfterApproval).toBe(true);
    expect(updated!.employerCancellationPenaltyRate).toBeGreaterThan(0);
    expect(
      updated!.employerCancellationPenaltyAmount,
    ).toBeGreaterThan(0);
    // Reason is on the shift so the ledger can render "Lý do: ..."
    expect(updated!.employerCancellationReason).toBe('Lý do');
  });

  it('omits a penalty line when no worker was ever approved (no after-approval flag)', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1')],
    });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Pending')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const updated = useShiftStore.getState().getById(shift.id);
    expect(updated!.employerCancelledAfterApproval).toBe(false);
    expect(updated!.employerCancellationPenaltyAmount).toBe(0);
    expect(updated!.employerCancellationPenaltyRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pending applicants receive no protection record
// ---------------------------------------------------------------------------

describe('Pending applicants — Phase 10A-Fix-8', () => {
  beforeEach(resetStores);

  it('do not receive a WorkerProtectionRecord and do not get a reputation bump', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    const pending = makeWorker('w-pending', { reputationScore: 70 });
    useUserStore.setState({ users: [makeEmployer(), pending] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w-pending', 'Pending')],
      ratings: [],
      disputes: [],
    });

    useShiftStore.getState().cancel(shift.id, 'Lý do');

    const updated = useUserStore
      .getState()
      .findById('w-pending') as Worker;
    expect(updated.reputationScore).toBe(70);
    expect(updated.protections ?? []).toHaveLength(0);

    // Notification is the generic "shift cancelled" copy, not the
    // protection-aware one.
    const notif = useNotificationStore
      .getState()
      .notifications.find((n) => n.userId === 'w-pending');
    expect(notif!.kind).toBe('ShiftCancelled');
  });
});
