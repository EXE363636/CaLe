/**
 * Phase 10A-Fix-10 — expire pending applications when shift starts.
 *
 * Pins down:
 *   - `planExpirePendingApplications` flips Pending → Expired only
 *     when the shift is past start OR in a non-recruitable status.
 *   - Approved / Rejected / Confirmed / CancelledByEmployer /
 *     CancelledByWorker / CheckedIn / CheckedOut / CancellationRequested
 *     applications are NEVER touched.
 *   - `expirePendingApplicationsForStartedShifts` persists the change,
 *     fans out one notification per affected worker, and is idempotent
 *     (running twice produces no further state changes / notifications).
 *   - The expiry never reduces worker reputation or quota.
 *   - Employer pending count excludes Expired.
 *   - `approve()` after start returns SHIFT_ALREADY_STARTED AND flips
 *     the application to Expired (so callers can't leave stale data).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  planExpirePendingApplications,
  shouldExpirePendingForShift,
} from '@/domain/applicationExpiry';
import { employerPendingApplicationCount } from '@/domain/taskBadges';
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
const NOW_MS = Date.now();

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
// Pure helpers
// ---------------------------------------------------------------------------

describe('shouldExpirePendingForShift — Phase 10A-Fix-10', () => {
  it('returns true when shift start datetime is in the past', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
    });
    expect(shouldExpirePendingForShift(shift, NOW_MS)).toBe(true);
  });

  it.each<['InProgress' | 'AwaitingConfirmation' | 'Completed' | 'Cancelled' | 'Expired']>([
    ['InProgress'],
    ['AwaitingConfirmation'],
    ['Completed'],
    ['Cancelled'],
    ['Expired'],
  ])('returns true when shift status is %s even if datetime is future', (status) => {
    const shift = makeShift({ status });
    expect(shouldExpirePendingForShift(shift, NOW_MS)).toBe(true);
  });

  it('returns false for a Published future shift', () => {
    const shift = makeShift();
    expect(shouldExpirePendingForShift(shift, NOW_MS)).toBe(false);
  });
});

describe('planExpirePendingApplications — Phase 10A-Fix-10', () => {
  it('flips only Pending applications whose shift has started', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const futureShift = makeShift({ id: 's-future' });
    const pastShift = makeShift({
      id: 's-past',
      date: past.date,
      startTime: past.startTime,
    });
    const apps: Application[] = [
      makeApp('s-future', 'w1', 'Pending'),
      makeApp('s-past', 'w2', 'Pending'),
      makeApp('s-past', 'w3', 'Approved'),
      makeApp('s-past', 'w4', 'Rejected'),
      makeApp('s-past', 'w5', 'Confirmed'),
      makeApp('s-past', 'w6', 'CancelledByEmployer'),
      makeApp('s-past', 'w7', 'CancelledByWorker'),
    ];
    const result = planExpirePendingApplications(
      apps,
      [futureShift, pastShift],
      new Date().toISOString(),
    );
    expect(result.expiredIds).toHaveLength(1);
    const expired = result.applications.find((a) => a.workerId === 'w2')!;
    expect(expired.status).toBe('Expired');
    expect(expired.expiredAt).toBeDefined();
    expect(expired.expiredReason).toMatch(/đã bắt đầu/i);

    // Other statuses untouched.
    const w3 = result.applications.find((a) => a.workerId === 'w3');
    expect(w3?.status).toBe('Approved');
    const w6 = result.applications.find((a) => a.workerId === 'w6');
    expect(w6?.status).toBe('CancelledByEmployer');
    // Future Pending stays Pending.
    const w1 = result.applications.find((a) => a.workerId === 'w1');
    expect(w1?.status).toBe('Pending');
  });

  it('is idempotent: running twice produces no further changes', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
    });
    const apps = [makeApp(shift.id, 'w1', 'Pending')];
    const r1 = planExpirePendingApplications(
      apps,
      [shift],
      new Date().toISOString(),
    );
    const r2 = planExpirePendingApplications(
      r1.applications,
      [shift],
      new Date().toISOString(),
    );
    expect(r1.expiredIds).toHaveLength(1);
    expect(r2.expiredIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Store integration
// ---------------------------------------------------------------------------

describe('applicationStore.expirePendingApplicationsForStartedShifts', () => {
  beforeEach(resetStores);

  it('persists the flip + fans out exactly one notification per worker', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
    });
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1'), makeWorker('w2')],
    });
    useApplicationStore.setState({
      applications: [
        makeApp(shift.id, 'w1', 'Pending'),
        makeApp(shift.id, 'w2', 'Pending'),
      ],
      ratings: [],
      disputes: [],
    });

    const r1 = useApplicationStore
      .getState()
      .expirePendingApplicationsForStartedShifts();
    expect(r1.expiredIds).toHaveLength(2);

    // Both apps now Expired.
    const apps = useApplicationStore.getState().applications;
    expect(apps.every((a) => a.status === 'Expired')).toBe(true);

    // One notification per worker.
    const notifs = useNotificationStore.getState().notifications;
    expect(notifs.filter((n) => n.kind === 'ApplicationExpired')).toHaveLength(2);
    const w1Notif = notifs.find((n) => n.userId === 'w1');
    expect(w1Notif?.body).toContain(shift.title);
    expect(w1Notif?.body).toContain('không bị trừ');

    // Idempotent — second call adds nothing.
    const r2 = useApplicationStore
      .getState()
      .expirePendingApplicationsForStartedShifts();
    expect(r2.expiredIds).toHaveLength(0);
    expect(useNotificationStore.getState().notifications).toHaveLength(2);
  });

  it('does not affect Approved applications even when the shift has started', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
    });
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1')],
    });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Approved')],
      ratings: [],
      disputes: [],
    });

    useApplicationStore
      .getState()
      .expirePendingApplicationsForStartedShifts();

    const apps = useApplicationStore.getState().applications;
    expect(apps[0].status).toBe('Approved');

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs.filter((n) => n.kind === 'ApplicationExpired')).toHaveLength(0);
  });

  it('does not reduce worker reputation or cancellation quota', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
    });
    useShiftStore.setState({ shifts: [shift] });
    const worker = makeWorker('w1', { reputationScore: 95 });
    useUserStore.setState({ users: [makeEmployer(), worker] });
    useApplicationStore.setState({
      applications: [makeApp(shift.id, 'w1', 'Pending')],
      ratings: [],
      disputes: [],
    });

    useApplicationStore
      .getState()
      .expirePendingApplicationsForStartedShifts();

    const updated = useUserStore.getState().findById('w1') as Worker;
    expect(updated.reputationScore).toBe(95);
    expect(updated.cancellationHistory).toHaveLength(0);
    expect(updated.noShowCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Employer pending count excludes Expired
// ---------------------------------------------------------------------------

describe('employerPendingApplicationCount — Phase 10A-Fix-10', () => {
  it('excludes Expired applications from the pending count', () => {
    const employerShiftIds = new Set(['s1']);
    const apps: Application[] = [
      makeApp('s1', 'w1', 'Pending'),
      makeApp('s1', 'w2', 'Expired'),
      makeApp('s1', 'w3', 'Pending'),
    ];
    expect(employerPendingApplicationCount(apps, employerShiftIds)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// approve() after start returns SHIFT_ALREADY_STARTED AND flips to Expired
// ---------------------------------------------------------------------------

describe('approve() — Phase 10A-Fix-10 store cleanup', () => {
  beforeEach(resetStores);

  it('returns SHIFT_ALREADY_STARTED and converts the application to Expired', () => {
    const past = localDateTimeFromOffset(-1 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
    });
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({
      users: [makeEmployer(), makeWorker('w1')],
    });
    const pending = makeApp(shift.id, 'w1', 'Pending');
    useApplicationStore.setState({
      applications: [pending],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore.getState().approve(pending.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('SHIFT_ALREADY_STARTED');

    // The application is now Expired, not Pending.
    const after = useApplicationStore
      .getState()
      .applications.find((a) => a.id === pending.id);
    expect(after?.status).toBe('Expired');
  });
});
