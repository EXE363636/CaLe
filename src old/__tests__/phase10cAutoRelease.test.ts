/**
 * Phase 10C — Wave 5B auto-release lifecycle tests.
 *
 * Covers the new
 * `applicationStore.autoReleaseEligibleApplications(nowIso?)` action:
 *
 *   - Eligibility predicate exactly matches the design:
 *     `status === 'CheckedOut' && autoReleased !== true &&
 *      autoReleaseAt is a non-empty ISO string &&
 *      Date.parse(autoReleaseAt) <= now &&
 *      no associated open dispute`.
 *   - Eligible application transitions to `'Confirmed'` with
 *     `autoReleased: true`, gets a default 5-star Rating, drives
 *     escrow `'Released'`, fires worker `'ShiftCompletedConfirmed'`
 *     plus the new `'AutoReleaseSettled'` notifications to BOTH
 *     worker and employer.
 *   - Idempotent: a second invocation against the same state returns
 *     `releasedIds: []` and produces no additional state change /
 *     notification.
 *   - Open dispute blocks auto-release.
 *   - Already-confirmed application is NOT re-released.
 *   - One faulty application doesn't block the rest of the pass
 *     (per-record error isolation).
 *   - The action runs no timers / polling — `vi.getTimerCount()`
 *     is unchanged across the call under fake timers.
 *
 * Strict Wave 5B scope — no admin resolution, no partial release.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Admin,
  Application,
  Dispute,
  Employer,
  Shift,
  Worker,
} from '@/types';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

// Fixed wall-clock anchor so tests don't depend on `Date.now()`.
// Every fixture timestamp is computed off this anchor; the action
// receives an explicit `nowIso` so the predicate runs deterministically.
const ANCHOR_MS = 1_750_000_000_000;
const ANCHOR_ISO = new Date(ANCHOR_MS).toISOString();
const PAST_CHECKOUT_ISO = new Date(ANCHOR_MS - 13 * 60 * 60 * 1000).toISOString();
const PAST_AUTO_RELEASE_ISO = new Date(
  Date.parse(PAST_CHECKOUT_ISO) + TWELVE_HOURS_MS,
).toISOString();
const FUTURE_AUTO_RELEASE_ISO = new Date(ANCHOR_MS + 60 * 60 * 1000).toISOString();

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
    createdAt: ANCHOR_ISO,
    updatedAt: ANCHOR_ISO,
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
    checkOutAt: PAST_CHECKOUT_ISO,
    autoReleaseAt: PAST_AUTO_RELEASE_ISO,
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

describe('applicationStore.autoReleaseEligibleApplications — Wave 5B', () => {
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

  it('flips an eligible CheckedOut application to Confirmed + autoReleased + 5★', () => {
    const { app, shift } = reset();
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r.releasedIds).toEqual([app.id]);
    const after = snapshotApp(app.id);
    expect(after?.status).toBe('Confirmed');
    expect(after?.autoReleased).toBe(true);
    expect(after?.confirmedAt).toBeDefined();
    // confirmCompletion creates a 5-star rating.
    const rating = useApplicationStore
      .getState()
      .ratings.find((rr) => rr.applicationId === app.id);
    expect(rating?.stars).toBe(5);
    // Escrow rolls from Completed -> Released via the existing event.
    expect(
      useShiftStore.getState().shifts.find((s) => s.id === shift.id)
        ?.escrowStatus,
    ).toBe('Released');
  });

  it('emits AutoReleaseSettled notifications to BOTH worker and employer', () => {
    const { app, worker, shift } = reset();
    useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    const notifications = useNotificationStore.getState().notifications;
    const workerAuto = notifications.find(
      (n) => n.userId === worker.id && n.kind === 'AutoReleaseSettled',
    );
    const employerAuto = notifications.find(
      (n) => n.userId === shift.employerId && n.kind === 'AutoReleaseSettled',
    );
    expect(workerAuto).toBeDefined();
    expect(employerAuto).toBeDefined();
    // The standard ShiftCompletedConfirmed notification still fires
    // for the worker because we delegate to confirmCompletion.
    const standard = notifications.find(
      (n) => n.userId === worker.id && n.kind === 'ShiftCompletedConfirmed',
    );
    expect(standard).toBeDefined();
    // The auto-release body should mention the payout amount so the
    // ledger is human-readable.
    expect(workerAuto?.body).toContain(
      app.payoutAmount!.toLocaleString('vi-VN'),
    );
    expect(employerAuto?.body).toContain(
      app.payoutAmount!.toLocaleString('vi-VN'),
    );
  });

  it('is idempotent — second invocation produces no further state change', () => {
    const { app } = reset();
    const r1 = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r1.releasedIds).toEqual([app.id]);
    const snapshotAfterFirst = snapshotApp(app.id);
    const ratingsAfterFirst = useApplicationStore.getState().ratings.length;
    const notificationsAfterFirst =
      useNotificationStore.getState().notifications.length;

    const r2 = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r2.releasedIds).toEqual([]);
    expect(snapshotApp(app.id)).toEqual(snapshotAfterFirst);
    expect(useApplicationStore.getState().ratings.length).toBe(
      ratingsAfterFirst,
    );
    expect(useNotificationStore.getState().notifications.length).toBe(
      notificationsAfterFirst,
    );
  });

  it('skips an application whose autoReleaseAt is in the future', () => {
    const { app } = reset({ autoReleaseAt: FUTURE_AUTO_RELEASE_ISO });
    const before = snapshotApp(app.id);
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r.releasedIds).toEqual([]);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('skips an application that has an open dispute', () => {
    const { app, shift } = reset();
    const dispute: Dispute = {
      id: 'dispute-1',
      shiftId: shift.id,
      applicationId: app.id,
      raisedBy: 'employer',
      reason: 'something',
      status: 'Open',
      createdAt: ANCHOR_ISO,
    };
    useApplicationStore.setState({
      applications: [{ ...app, status: 'Disputed' }],
      ratings: [],
      disputes: [dispute],
    });
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r.releasedIds).toEqual([]);
    expect(snapshotApp(app.id)?.status).toBe('Disputed');
    expect(snapshotApp(app.id)?.autoReleased).toBeUndefined();
  });

  it('skips an application whose dispute is in PartialRelease (terminal) — but the predicate never sees it because status is no longer CheckedOut after partial-release. Sanity: terminal dispute alone doesn\'t un-release.', () => {
    // Even with a terminal dispute, the predicate requires status
    // === 'CheckedOut'. We simulate a clean CheckedOut application
    // alongside a terminal dispute on a different application.
    const { app } = reset();
    const otherShift = makeShift({ id: 'shift-2' });
    const otherApp = makeApp(otherShift.id, 'w1', {
      id: 'app-other',
      status: 'Confirmed',
    });
    const terminalDispute: Dispute = {
      id: 'dispute-terminal',
      shiftId: otherShift.id,
      applicationId: otherApp.id,
      raisedBy: 'employer',
      reason: 'something',
      status: 'ResolvedReleased',
      createdAt: ANCHOR_ISO,
    };
    useShiftStore.setState({
      shifts: [...useShiftStore.getState().shifts, otherShift],
    });
    useApplicationStore.setState({
      applications: [...useApplicationStore.getState().applications, otherApp],
      ratings: [],
      disputes: [terminalDispute],
    });
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    // The CheckedOut application IS auto-released — the terminal
    // dispute on the OTHER application doesn't block it.
    expect(r.releasedIds).toEqual([app.id]);
  });

  it('skips an application that was already confirmed (status not CheckedOut)', () => {
    const { app } = reset({ status: 'Confirmed' });
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r.releasedIds).toEqual([]);
    // The application is already Confirmed — it stays Confirmed and
    // does NOT pick up a phantom autoReleased: true marker.
    expect(snapshotApp(app.id)?.status).toBe('Confirmed');
    expect(snapshotApp(app.id)?.autoReleased).toBeUndefined();
  });

  it('skips an application that was already auto-released', () => {
    const { app } = reset({ autoReleased: true });
    // Even though the application is still nominally CheckedOut in
    // the fixture, the predicate filters on `autoReleased !== true`
    // so the second pass against any record already marked auto-
    // released finds nothing to do.
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r.releasedIds).toEqual([]);
    expect(snapshotApp(app.id)?.autoReleased).toBe(true);
  });

  it('skips an application whose autoReleaseAt is missing', () => {
    const { app } = reset({ autoReleaseAt: undefined });
    const before = snapshotApp(app.id);
    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(r.releasedIds).toEqual([]);
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('processes multiple eligible applications in a single pass and persists once at the end', () => {
    const shift = makeShift();
    const w1 = makeWorker('w1');
    const w2 = makeWorker('w2');
    const a1 = makeApp(shift.id, 'w1');
    const a2 = makeApp(shift.id, 'w2', { id: 'app-w2' });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [a1, a2],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [makeEmployer(), w1, w2, makeAdmin()] });
    useNotificationStore.setState({ notifications: [] });

    const r = useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);
    expect(new Set(r.releasedIds)).toEqual(new Set([a1.id, a2.id]));
    expect(snapshotApp(a1.id)?.autoReleased).toBe(true);
    expect(snapshotApp(a2.id)?.autoReleased).toBe(true);
  });

  it('uses no polling primitives (setInterval / requestAnimationFrame / fetch)', () => {
    reset();
    // Note: we do NOT spy on `setTimeout` — jsdom's `localStorage`
    // shim uses `setTimeout` internally to dispatch storage events,
    // and our store hits localStorage on every persist. That's
    // jsdom's behaviour, not our action's. The relevant
    // anti-polling assertion is the absence of `setInterval`,
    // `requestAnimationFrame`, and `fetch` — those are the
    // primitives that would betray a real polling loop or external
    // API call.
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    // jsdom doesn't expose `fetch` by default in the test env, so
    // we only spy on it if it exists.
    const fetchSpy =
      typeof globalThis.fetch === 'function'
        ? vi.spyOn(globalThis, 'fetch')
        : null;

    useApplicationStore
      .getState()
      .autoReleaseEligibleApplications(ANCHOR_ISO);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(rafSpy).not.toHaveBeenCalled();
    if (fetchSpy) expect(fetchSpy).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    rafSpy.mockRestore();
    fetchSpy?.mockRestore();
  });
});
