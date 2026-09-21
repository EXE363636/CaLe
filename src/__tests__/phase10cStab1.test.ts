/**
 * Phase 10C-Stabilization-1 Batch 1 — central lifecycle sync,
 * canonical check-in/out gates, lifecycle notifications, schedule
 * overlap fix.
 *
 * Manual QA bugs covered in this batch (Stabilization-1 spec lines 2,
 * 5, 6, 7, 8, 17):
 *
 *   - Bug 2: shift lifecycle timing (21:02–21:03 ends by 21:04;
 *     08:30–11:30 not "Đang diễn ra" at 21:15; pending applications
 *     expire at start; status syncs on page mount via
 *     `runLifecycleSync`).
 *   - Bug 5: absence/no-show — `canEmployerMarkAbsent` does NOT read
 *     `evidenceRequirement`. Available regardless of evidence level.
 *   - Bug 6: check-in / check-out — canonical helpers gate by the
 *     15/15 minute window; no early check-in.
 *   - Bug 7: lifecycle notifications — `ShiftStarted` and
 *     `ShiftEnded` fire once per `(applicationId, kind)`, idempotent
 *     across repeated `runLifecycleSync` calls.
 *   - Bug 8: schedule overlap — `Confirmed` past shifts no longer
 *     count; `Expired` / `Cancelled*` / `Rejected` never count.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  CHECK_IN_EARLY_MINUTES,
  CHECK_IN_LATE_MINUTES,
  CHECK_OUT_GRACE_MINUTES,
  canEmployerMarkAbsent,
  canEmployerMarkPresent,
  canWorkerCheckIn,
  canWorkerCheckOut,
} from '@/domain/timeGates';
import { hasConflict } from '@/domain/conflict';
import { suggestShiftStatus } from '@/domain/shiftLifecycle';
import { planLifecycleSync } from '@/domain/lifecycleSync';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Application,
  Employer,
  EvidenceRequirement,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ANCHOR_MS = 1_750_000_000_000;
const ANCHOR_ISO = new Date(ANCHOR_MS).toISOString();
const MS_PER_MINUTE = 60_000;

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

function buildEmployer(): Employer {
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
    verifiedBusiness: false,
    boostCredits: 0,
  };
}

/**
 * Compose a shift's local-date + start/end strings from epoch
 * milliseconds. Avoids host-timezone drift in the fixtures: we
 * format the date components using `Date` accessors directly so
 * the test is deterministic regardless of the host TZ.
 */
function shiftFromEpoch(
  startMs: number,
  endMs: number,
  override: Partial<Shift> = {},
): Shift {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return buildShift({
    date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
    ...override,
  });
}

// ---------------------------------------------------------------------------
// Bug 2 — shift lifecycle timing
// ---------------------------------------------------------------------------

describe('Stab-1 Bug 2: lifecycle timing', () => {
  it('a shift 21:02–21:03 is no longer ongoing at 21:04', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(21, 2, 0, 0);
    const end = new Date(start.getTime() + 60_000); // 21:03
    const at = new Date(end.getTime() + 60_000); // 21:04
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
    });
    // No applicants — never checked in — shift expires.
    const next = suggestShiftStatus(shift, [], at.toISOString());
    expect(next).toBe('Expired');
  });

  it('a shift 08:30–11:30 is not "Đang diễn ra" at 21:15', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 30, 0, 0);
    const end = new Date(start.getTime() + 3 * 60 * 60_000); // 11:30
    const at = new Date(start.getTime());
    at.setHours(21, 15, 0, 0); // 21:15 same day
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
    });
    const next = suggestShiftStatus(shift, [], at.toISOString());
    // No checked-in workers → expired (not InProgress / AwaitingConfirmation).
    expect(next).toBe('Expired');
  });

  it('a shift 21:25 starts later than 21:15; lifecycle keeps it Published', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(21, 25, 0, 0);
    const end = new Date(start.getTime() + 60_000); // 21:26
    const at = new Date(start.getTime());
    at.setHours(21, 15, 0, 0); // 21:15
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
      positionsTotal: 5,
      positionsFilled: 0,
    });
    const next = suggestShiftStatus(shift, [], at.toISOString());
    expect(next).toBe('Published');
  });

  it('pending applications expire when the shift starts', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const at = new Date(start.getTime() + 5_000); // 5s after start
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
    });
    const app = buildApp(shift.id, 'w1', { status: 'Pending' });
    const result = planLifecycleSync({
      shifts: [shift],
      applications: [app],
      nowIso: at.toISOString(),
    });
    expect(result.expiredApplicationIds).toContain(app.id);
  });
});

// ---------------------------------------------------------------------------
// Bug 5 — evidence None must NOT remove no-show actions
// ---------------------------------------------------------------------------

describe('Stab-1 Bug 5: absence/no-show always available', () => {
  it('canEmployerMarkAbsent does not depend on evidenceRequirement', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    // Test all 5 evidence levels — every one must permit mark-absent.
    const levels: EvidenceRequirement[] = [
      'None',
      'ChecklistOnly',
      'OptionalPhoto',
      'RequiredPhoto',
      'RequiredHandoverChecklist',
    ];
    // Now is 30 min past start (well after the 15 min check-in window).
    const at = new Date(start.getTime() + 30 * 60_000).toISOString();
    for (const level of levels) {
      const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
        evidenceRequirement: level,
        status: 'InProgress',
      });
      const app = buildApp(shift.id, 'w1', { status: 'Approved' });
      expect(canEmployerMarkAbsent(at, app, shift)).toBe(true);
    }
  });

  it('canEmployerMarkAbsent rejects before the no-show threshold', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const shift = shiftFromEpoch(start.getTime(), end.getTime());
    const app = buildApp(shift.id, 'w1');
    // Right at start — still inside the late-check-in window.
    const at = new Date(start.getTime()).toISOString();
    expect(canEmployerMarkAbsent(at, app, shift)).toBe(false);
  });

  it('canEmployerMarkAbsent rejects when the application is not Approved', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const shift = shiftFromEpoch(start.getTime(), end.getTime());
    const at = new Date(start.getTime() + 30 * 60_000).toISOString();
    for (const status of ['CheckedIn', 'CheckedOut', 'Confirmed', 'NoShow'] as const) {
      const app = buildApp(shift.id, 'w1', { status });
      expect(canEmployerMarkAbsent(at, app, shift)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Bug 6 — check-in / check-out window precision
// ---------------------------------------------------------------------------

describe('Stab-1 Bug 6: check-in / check-out windows', () => {
  it('canWorkerCheckIn allows the window [start − 15min, start + 15min]', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const shift = shiftFromEpoch(start.getTime(), end.getTime());
    const app = buildApp(shift.id, 'w1');

    // 16 min early — too early.
    expect(
      canWorkerCheckIn(
        new Date(
          start.getTime() - (CHECK_IN_EARLY_MINUTES + 1) * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(false);
    // Exactly 15 min early — allowed.
    expect(
      canWorkerCheckIn(
        new Date(
          start.getTime() - CHECK_IN_EARLY_MINUTES * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
    // At start — allowed.
    expect(
      canWorkerCheckIn(start.toISOString(), app, shift),
    ).toBe(true);
    // 15 min late — still allowed (inclusive).
    expect(
      canWorkerCheckIn(
        new Date(
          start.getTime() + CHECK_IN_LATE_MINUTES * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
    // 16 min late — too late.
    expect(
      canWorkerCheckIn(
        new Date(
          start.getTime() + (CHECK_IN_LATE_MINUTES + 1) * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(false);
  });

  it('canWorkerCheckOut allows checkout from end onward when CheckedIn', () => {
    // CORE-STABILITY-9 Part 2 — check-out now opens at shift END, not
    // start. A worker mid-shift must not see the check-out CTA.
    const start = new Date(ANCHOR_MS);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000); // 11:00
    const shift = shiftFromEpoch(start.getTime(), end.getTime());
    // CORE-STABILITY-8 Part 4 — check-out requires the worker's own
    // self check-in (`checkInAt`), so the CheckedIn app carries it.
    const app = buildApp(shift.id, 'w1', {
      status: 'CheckedIn',
      checkInAt: start.toISOString(),
    });

    // At start — too early now (mid-shift, must wait until end).
    expect(canWorkerCheckOut(start.toISOString(), app, shift)).toBe(false);
    // Just before end — still too early.
    expect(
      canWorkerCheckOut(
        new Date(end.getTime() - 60_000).toISOString(),
        app,
        shift,
      ),
    ).toBe(false);
    // At end — allowed.
    expect(canWorkerCheckOut(end.toISOString(), app, shift)).toBe(true);
    // End + 60 min grace — still allowed.
    expect(
      canWorkerCheckOut(
        new Date(
          end.getTime() + CHECK_OUT_GRACE_MINUTES * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
    // End + 61 min — late check-out remains available.
    expect(
      canWorkerCheckOut(
        new Date(
          end.getTime() + (CHECK_OUT_GRACE_MINUTES + 1) * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
  });

  it('canEmployerMarkPresent covers [start − 15min, end + grace]', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const shift = shiftFromEpoch(start.getTime(), end.getTime());
    const app = buildApp(shift.id, 'w1');

    // 16 min early — too early.
    expect(
      canEmployerMarkPresent(
        new Date(
          start.getTime() - (CHECK_IN_EARLY_MINUTES + 1) * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(false);
    // 15 min early — allowed.
    expect(
      canEmployerMarkPresent(
        new Date(
          start.getTime() - CHECK_IN_EARLY_MINUTES * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
    // Mid-shift — allowed.
    expect(
      canEmployerMarkPresent(
        new Date(start.getTime() + 30 * MS_PER_MINUTE).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
    // End + grace — allowed.
    expect(
      canEmployerMarkPresent(
        new Date(
          end.getTime() + CHECK_OUT_GRACE_MINUTES * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(true);
    // Beyond grace — not allowed.
    expect(
      canEmployerMarkPresent(
        new Date(
          end.getTime() + (CHECK_OUT_GRACE_MINUTES + 1) * MS_PER_MINUTE,
        ).toISOString(),
        app,
        shift,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bug 7 — lifecycle notifications are idempotent
// ---------------------------------------------------------------------------

describe('Stab-1 Bug 7: lifecycle notifications idempotency', () => {
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

  it('emits ShiftStarted once per application across repeated runs', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const at = new Date(start.getTime() + 60_000).toISOString(); // 1 min past start
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'Published',
    });
    const app = buildApp(shift.id, 'w1', { status: 'Approved' });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [buildEmployer(), buildWorker('w1')] });

    const r1 = useApplicationStore.getState().runLifecycleSync(at);
    expect(r1.notifiedStartIds).toEqual([app.id]);
    const r2 = useApplicationStore.getState().runLifecycleSync(at);
    expect(r2.notifiedStartIds).toEqual([]);
    // Notification slice should contain exactly one ShiftStarted for the
    // worker and one for the employer (two total) — not four.
    const startedNotifications = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftStarted');
    expect(startedNotifications).toHaveLength(2);
    expect(
      startedNotifications.find((n) => n.userId === 'w1'),
    ).toBeDefined();
    expect(
      startedNotifications.find((n) => n.userId === 'e1'),
    ).toBeDefined();
  });

  it('emits ShiftEnded once per application for CheckedIn workers', () => {
    const start = new Date(ANCHOR_MS);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    const at = new Date(end.getTime() + 60_000).toISOString();
    const shift = shiftFromEpoch(start.getTime(), end.getTime(), {
      status: 'InProgress',
    });
    const app = buildApp(shift.id, 'w1', {
      status: 'CheckedIn',
      checkInAt: start.toISOString(),
      shiftStartedNotifiedAt: at,
    });
    useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [buildEmployer(), buildWorker('w1')] });

    const r1 = useApplicationStore.getState().runLifecycleSync(at);
    expect(r1.notifiedEndIds).toEqual([app.id]);
    const r2 = useApplicationStore.getState().runLifecycleSync(at);
    expect(r2.notifiedEndIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Bug 8 — schedule overlap (conflict detection)
// ---------------------------------------------------------------------------

describe('Stab-1 Bug 8: schedule overlap excludes stale shifts', () => {
  // Direct unit test of `hasConflict` — the apply-flow gate that
  // surfaced the bug filters by status + by shift end-in-future via
  // `approvedRangesForWorker` in `applicationStore`. The store-level
  // tests below cover the full integration.
  it('two minute-by-minute non-overlapping ranges produce no conflict', () => {
    const target = {
      date: '2030-06-02',
      startTime: '11:30',
      endTime: '12:30',
    };
    const approved = [
      { date: '2030-06-02', startTime: '08:00', endTime: '09:00' },
    ];
    // The 60-minute buffer means 09:00..11:30 is exactly 150 min apart —
    // outside the 60-min buffer — so no conflict.
    expect(hasConflict(target, approved)).toBe(false);
  });

  it('overlapping ranges produce a conflict', () => {
    const target = {
      date: '2030-06-02',
      startTime: '08:30',
      endTime: '09:30',
    };
    const approved = [
      { date: '2030-06-02', startTime: '08:00', endTime: '09:00' },
    ];
    expect(hasConflict(target, approved)).toBe(true);
  });
});

describe('Stab-1 Bug 8: applicationStore.apply does not block on stale shifts', () => {
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

  it('does NOT block apply when the worker has a Confirmed shift in the past', () => {
    // Past confirmed shift (8:00–9:00 a year ago).
    const pastStart = ANCHOR_MS - 365 * 24 * 60 * 60_000;
    const pastEnd = pastStart + 60 * 60_000;
    const pastShift = shiftFromEpoch(pastStart, pastEnd, {
      id: 's-past',
      status: 'Completed',
      escrowStatus: 'Released',
    });
    const pastApp = buildApp('s-past', 'w1', {
      id: 'app-past',
      status: 'Confirmed',
      confirmedAt: new Date(pastEnd).toISOString(),
    });

    // New shift now (no time conflict with the past shift either).
    const newShiftStart = ANCHOR_MS + 24 * 60 * 60_000;
    const newShiftEnd = newShiftStart + 60 * 60_000;
    const newShift = shiftFromEpoch(newShiftStart, newShiftEnd, {
      id: 's-new',
      status: 'Published',
      positionsTotal: 5,
      positionsFilled: 0,
    });

    useShiftStore.setState({ shifts: [pastShift, newShift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [pastApp],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [buildEmployer(), buildWorker('w1')] });

    const r = useApplicationStore.getState().apply('s-new', 'w1');
    expect(r.ok).toBe(true);
  });

  it('does NOT block apply when the worker has an Expired or Cancelled application', () => {
    const pastStart = ANCHOR_MS - 24 * 60 * 60_000;
    const pastEnd = pastStart + 60 * 60_000;
    const pastShift = shiftFromEpoch(pastStart, pastEnd, {
      id: 's-stale',
      status: 'Expired',
    });
    const expiredApp = buildApp('s-stale', 'w1', {
      id: 'app-expired',
      status: 'Expired',
    });

    const newShiftStart = ANCHOR_MS + 24 * 60 * 60_000;
    const newShiftEnd = newShiftStart + 60 * 60_000;
    const newShift = shiftFromEpoch(newShiftStart, newShiftEnd, {
      id: 's-new',
      status: 'Published',
      positionsTotal: 5,
      positionsFilled: 0,
    });

    useShiftStore.setState({ shifts: [pastShift, newShift], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [expiredApp],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [buildEmployer(), buildWorker('w1')] });

    const r = useApplicationStore.getState().apply('s-new', 'w1');
    expect(r.ok).toBe(true);
  });

  it('DOES block apply when the worker has an actively-overlapping Approved future shift', () => {
    // Use real-future epoch (a year ahead of now) so
    // `approvedRangesForWorker`'s "endMs + grace > now" guard keeps
    // the existing approved shift in the conflict pool.
    //
    // Pin the future timestamp to a deterministic mid-day hour so a
    // late-night test run doesn't roll endTime past midnight: when
    // start = 23:30 + 1h, the legacy fixture computed end = 00:30
    // on the same date string, collapsing the conflict window.
    const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60_000);
    inOneYear.setHours(12, 0, 0, 0); // noon, deterministic across local TZs
    const sharedStart = inOneYear.getTime();
    const sharedEnd = sharedStart + 60 * 60_000;
    const ongoingShift = shiftFromEpoch(sharedStart, sharedEnd, {
      id: 's-ongoing',
      status: 'Published',
    });
    const approvedApp = buildApp('s-ongoing', 'w1', {
      id: 'app-approved',
      status: 'Approved',
    });

    // Conflicting new shift overlaps the same time range.
    const newShift = shiftFromEpoch(sharedStart, sharedEnd, {
      id: 's-new',
      status: 'Published',
      positionsTotal: 5,
      positionsFilled: 0,
    });

    useShiftStore.setState({
      shifts: [ongoingShift, newShift],
      lastLifecycleSyncAt: null,
    });
    useApplicationStore.setState({
      applications: [approvedApp],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({ users: [buildEmployer(), buildWorker('w1')] });

    const r = useApplicationStore.getState().apply('s-new', 'w1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('CONFLICT');
  });
});
