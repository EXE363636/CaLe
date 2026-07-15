/**
 * QA-SYSTEM-1 Phase 2/3 — time-travel lifecycle QA harness + scenarios.
 *
 * Demonstrates testing time-based marketplace flows WITHOUT waiting in
 * real time, by driving the domain/store layer with an explicit,
 * advancing `nowIso` clock. Every lifecycle action in this app accepts
 * an injected `nowIso` (or operates on explicit timestamps), so a tiny
 * clock helper is all that's needed — no app rewrite.
 *
 * Harness primitives (local to this file; the pattern is the
 * deliverable, reusable across store tests):
 *   - `makeClock(startIso)` → { nowIso(), advance(ms), advanceHours(h),
 *     advanceDays(d) }.
 *   - `runLifecycle(clock)` → runs the canonical
 *     `applicationStore.runLifecycleSync(clock.nowIso())` so UI-visible
 *     state reflects the advanced time.
 *
 * Scenarios covered (QA-SYSTEM-1 Phase 3):
 *   F. Worker checks out, employer does nothing → held < 12h, then
 *      auto-release at 12h, idempotent afterwards.
 *   G. Employer disputes before 12h → auto-release must NOT pay; escrow
 *      stays held/disputed across the 12h boundary.
 *   D. Approved worker never checks in → past shift end reconciles to a
 *      neutral Expired state, no reputation penalty, no live controls.
 *
 * Deterministic: no `Date.now()`, no real timers, no waiting.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useWalletStore } from '@/stores/walletStore';
import type {
  Application,
  Dispute,
  Employer,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Time-travel harness
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function makeClock(startIso: string) {
  let nowMs = Date.parse(startIso);
  return {
    nowIso: () => new Date(nowMs).toISOString(),
    nowMs: () => nowMs,
    advance: (ms: number) => {
      nowMs += ms;
    },
    advanceHours: (h: number) => {
      nowMs += h * HOUR_MS;
    },
    advanceDays: (d: number) => {
      nowMs += d * DAY_MS;
    },
  };
}

function runLifecycle(clock: { nowIso: () => string }) {
  return useApplicationStore.getState().runLifecycleSync(clock.nowIso());
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMPLOYER_ID = 'emp-tt';
const WORKER_ID = 'wkr-tt';

function makeEmployer(): Employer {
  return {
    id: EMPLOYER_ID,
    role: 'employer',
    email: 'emp-tt@example.com',
    phone: '+84902000222',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    companyName: 'Quán Thời Gian',
    businessType: 'Nhà hàng',
    verifiedBusiness: true,
    boostCredits: 0,
  };
}

function makeWorker(): Worker {
  return {
    id: WORKER_ID,
    role: 'worker',
    email: 'wkr-tt@example.com',
    phone: '+84905000222',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    fullName: 'Người Thời Gian',
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 90,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
}

function makeShift(over: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-tt',
    employerId: EMPLOYER_ID,
    title: 'Ca kiểm thử thời gian',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2026-05-28',
    startTime: '10:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 1,
    status: 'AwaitingConfirmation',
    escrowStatus: 'Completed',
    depositAmount: 100_000,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    evidenceRequirement: 'OptionalPhoto',
    timeline: [],
    ...over,
  };
}

function makeApp(over: Partial<Application> = {}): Application {
  return {
    id: 'app-tt',
    shiftId: 'shift-tt',
    workerId: WORKER_ID,
    status: 'CheckedOut',
    appliedAt: '2026-05-20T00:00:00.000Z',
    approvedAt: '2026-05-21T00:00:00.000Z',
    checkInAt: '2026-05-28T10:00:00.000Z',
    checkOutAt: '2026-05-28T12:02:00.000Z',
    payoutAmount: 100_000,
    ...over,
  };
}

function seed(opts: {
  shift?: Partial<Shift>;
  app?: Partial<Application>;
  disputes?: Dispute[];
}) {
  const shift = makeShift(opts.shift);
  const app = makeApp({ shiftId: shift.id, ...opts.app });
  useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
  useApplicationStore.setState({
    applications: [app],
    ratings: [],
    disputes: opts.disputes ?? [],
  });
  useUserStore.setState({ users: [makeEmployer(), makeWorker()] });
  useNotificationStore.setState({ notifications: [] });
  useWalletStore.setState({ wallets: [], ledger: [] });
  return { shift, app };
}

function appNow(id: string): Application | undefined {
  return useApplicationStore.getState().applications.find((a) => a.id === id);
}

beforeEach(() => {
  useShiftStore.setState({ shifts: [], lastLifecycleSyncAt: null });
  useApplicationStore.setState({ applications: [], ratings: [], disputes: [] });
  useUserStore.setState({ users: [] });
  useNotificationStore.setState({ notifications: [] });
  useWalletStore.setState({ wallets: [], ledger: [] });
});

// ---------------------------------------------------------------------------
// Scenario F — checked-out, employer idle → 12h auto-release
// ---------------------------------------------------------------------------

describe('Time-travel F: checked-out → held < 12h → auto-release at 12h (idempotent)', () => {
  it('holds payment before 12h, auto-releases at 12h, and does not double-release', () => {
    // Check-out at 12:02; auto-release deadline 12h later = 00:02 next day.
    const checkOutIso = '2026-05-28T12:02:00.000Z';
    const autoReleaseAt = new Date(Date.parse(checkOutIso) + 12 * HOUR_MS).toISOString();
    const { app } = seed({
      app: { status: 'CheckedOut', checkOutAt: checkOutIso, autoReleaseAt, autoReleased: false },
    });
    const clock = makeClock('2026-05-28T13:00:00.000Z'); // ~1h after checkout

    // (1) Before 12h: lifecycle sync must NOT auto-release.
    runLifecycle(clock);
    expect(appNow(app.id)?.status).toBe('CheckedOut');
    expect(appNow(app.id)?.autoReleased).toBeFalsy();
    expect(useWalletStore.getState().getBalance(WORKER_ID)).toBe(0);

    // (2) Advance PAST the 12h boundary, then sync → auto-release.
    clock.advanceHours(12); // now ~01:00 next day, past 00:02 deadline
    runLifecycle(clock);
    const released = appNow(app.id);
    expect(released?.status).toBe('Confirmed');
    expect(released?.autoReleased).toBe(true);
    expect(useWalletStore.getState().getBalance(WORKER_ID)).toBe(100_000);

    const autoNotifs1 = useNotificationStore
      .getState()
      .notifications.filter((n) => n.userId === WORKER_ID).length;

    // (3) Advance again + re-sync: no duplicate release / ledger / notif.
    clock.advanceHours(6);
    runLifecycle(clock);
    expect(appNow(app.id)?.status).toBe('Confirmed');
    expect(useWalletStore.getState().getBalance(WORKER_ID)).toBe(100_000);
    const workerWageEntries = useWalletStore
      .getState()
      .forUser(WORKER_ID)
      .filter((l) => l.amount > 0);
    expect(workerWageEntries.length).toBe(1);
    const autoNotifs2 = useNotificationStore
      .getState()
      .notifications.filter((n) => n.userId === WORKER_ID).length;
    expect(autoNotifs2).toBe(autoNotifs1);
  });
});

// ---------------------------------------------------------------------------
// Scenario G — dispute before 12h blocks auto-release across the boundary
// ---------------------------------------------------------------------------

describe('Time-travel G: open dispute before 12h blocks auto-release across the boundary', () => {
  it('does NOT auto-pay past 12h while an Open dispute exists; escrow stays held', () => {
    const checkOutIso = '2026-05-28T12:02:00.000Z';
    const autoReleaseAt = new Date(Date.parse(checkOutIso) + 12 * HOUR_MS).toISOString();
    const dispute: Dispute = {
      id: 'disp-tt',
      shiftId: 'shift-tt',
      applicationId: 'app-tt',
      raisedBy: 'employer',
      category: 'ChecklistFailed',
      reason: 'Checklist chưa đủ.',
      status: 'Open',
      createdAt: '2026-05-28T12:30:00.000Z',
      responses: [],
    } as Dispute;
    const { app } = seed({
      shift: { escrowStatus: 'Disputed' },
      app: {
        status: 'Disputed',
        checkOutAt: checkOutIso,
        autoReleaseAt,
        autoReleased: false,
      },
      disputes: [dispute],
    });
    const clock = makeClock('2026-05-28T13:00:00.000Z');

    // Advance well past the 12h boundary.
    clock.advanceDays(1);
    runLifecycle(clock);

    // Auto-release must NOT have paid the worker.
    expect(appNow(app.id)?.autoReleased).toBeFalsy();
    expect(appNow(app.id)?.status).toBe('Disputed');
    expect(useWalletStore.getState().getBalance(WORKER_ID)).toBe(0);
    // Escrow remains held/disputed (not Released).
    const shift = useShiftStore.getState().shifts.find((s) => s.id === 'shift-tt');
    expect(shift?.escrowStatus).not.toBe('Released');
  });
});

// ---------------------------------------------------------------------------
// Scenario D — approved, never checked in, time advances past shift end
// ---------------------------------------------------------------------------

describe('Time-travel D: approved-never-checked-in reconciles to neutral Expired past shift end', () => {
  it('moves to Expired with a neutral reason and no reputation penalty after the shift ends', () => {
    const { app } = seed({
      shift: {
        date: '2026-05-28',
        startTime: '10:00',
        endTime: '12:00',
        status: 'Published',
        escrowStatus: 'Deposited',
      },
      app: {
        status: 'Approved',
        checkInAt: undefined,
        checkOutAt: undefined,
        autoReleaseAt: undefined,
      },
    });
    const reputationBefore = (useUserStore
      .getState()
      .users.find((u) => u.id === WORKER_ID) as Worker).reputationScore;

    // Before shift end: still an active Approved application. Build the
    // "now" from the SAME local-time frame the store uses to parse
    // shift end (`new Date(`${date}T${endTime}:00`)`), so the check is
    // timezone-robust across CI runners — one hour before the 10:00
    // local start.
    const beforeStartMs = new Date('2026-05-28T10:00:00').getTime() - HOUR_MS;
    const clockBefore = makeClock(new Date(beforeStartMs).toISOString());
    runLifecycle(clockBefore);
    expect(appNow(app.id)?.status).toBe('Approved');

    // Advance two days past the shift end and re-sync. Two days clears
    // the shift end in any timezone.
    const afterEndMs = new Date('2026-05-28T12:00:00').getTime() + 2 * DAY_MS;
    const clockAfter = makeClock(new Date(afterEndMs).toISOString());
    runLifecycle(clockAfter);

    const after = appNow(app.id);
    expect(after?.status).toBe('Expired');
    expect(after?.expiredReason).toBe('Hết hạn — chưa ghi nhận có mặt.');

    // Non-penalizing.
    const reputationAfter = (useUserStore
      .getState()
      .users.find((u) => u.id === WORKER_ID) as Worker).reputationScore;
    expect(reputationAfter).toBe(reputationBefore);
  });

  it('does NOT duplicate the "Ca làm đã kết thúc" no-check-in notification across repeated lifecycle syncs (Part 2.6)', () => {
    const { app } = seed({
      shift: {
        date: '2026-05-28',
        startTime: '10:00',
        endTime: '12:00',
        status: 'Published',
        escrowStatus: 'Deposited',
      },
      app: {
        status: 'Approved',
        checkInAt: undefined,
        checkOutAt: undefined,
        autoReleaseAt: undefined,
      },
    });

    const afterEndMs = new Date('2026-05-28T12:00:00').getTime() + 2 * DAY_MS;

    // Run lifecycle sync THREE times at the same "now" (simulating
    // AppHydrator + useLifecycleSync + a refresh).
    runLifecycle(makeClock(new Date(afterEndMs).toISOString()));
    runLifecycle(makeClock(new Date(afterEndMs).toISOString()));
    runLifecycle(makeClock(new Date(afterEndMs).toISOString()));

    expect(appNow(app.id)?.status).toBe('Expired');
    // Exactly ONE end-of-shift / no-check-in notification for the worker.
    const endNotifs = useNotificationStore
      .getState()
      .notifications.filter(
        (n) =>
          n.userId === WORKER_ID &&
          n.dedupeKey === `ApplicationExpired:noCheckIn:${app.id}`,
      );
    expect(endNotifs.length).toBe(1);
    // And no other "Ca làm đã kết thúc" copy duplicated for the worker.
    const endedTitled = useNotificationStore
      .getState()
      .notifications.filter(
        (n) => n.userId === WORKER_ID && n.title === 'Ca làm đã kết thúc',
      );
    expect(endedTitled.length).toBe(1);
  });
});
