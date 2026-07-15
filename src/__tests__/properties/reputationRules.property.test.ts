/**
 * Cluster 2 · Task 8 — PRESERVATION baseline test.
 *
 * Property 12 (Preservation) — "Worker's own dashboard + reputation rules".
 *
 * Validates: Requirements 3.3, 3.4
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (observation-first baseline)
 * ---------------------------------------------------------------------------
 * This records the CURRENT behavior of the UNFIXED code for the two things
 * Property 12 protects, so the Cluster 2 fix (adding a shared
 * `getWorkerReputation(userId)` reader and deriving the landing hero from the
 * current user/role) can be proven NOT to regress them:
 *
 *   PART A — REPUTATION RULES (Req 3.4).  The scoring rules in
 *   `src/domain/reputation.ts` are the single source of truth for how a
 *   worker's score moves. The Cluster 2 fix only changes the *display read
 *   source*; it must NOT touch these rules. The design cites them as:
 *   completed +5, late-cancel −10, no-show −20, admin adjustment, clamp
 *   0–100, apply threshold 50. Confirmed against the module:
 *     - exported constants: INITIAL_SCORE=100, MIN_SCORE=0, MAX_SCORE=100,
 *       APPLY_THRESHOLD=50
 *     - private deltas: COMPLETED_DELTA=+5, LATE_CANCEL_DELTA=−10,
 *       NO_SHOW_DELTA=−20 (NOT exported)
 *     - `applyReputationEvent(score, event)` clamps the input, adds the
 *       delta, clamps the result to [0,100]
 *     - `canApplyToShifts(score)` === `score >= APPLY_THRESHOLD`
 *   Because the deltas are private, this test does NOT hard-code the magic
 *   numbers (that would just mirror the implementation). Instead it REUSES
 *   the real functions + exported constants and asserts the INVARIANTS that
 *   define the rules: clamp bounds, idempotent clamping, each event's delta
 *   (derived from the function, then asserted constant + correctly-signed +
 *   correctly-ordered), admin-adjust additivity, and the apply threshold.
 *   Property-based over random single events AND random event SEQUENCES.
 *
 *   PART B — WORKER'S OWN DASHBOARD (Req 3.3).  A logged-in worker's own
 *   dashboard (`src/app/worker/dashboard/page.tsx`) surfaces their real
 *   reputation, completed-shift count, earnings, and upcoming shifts — all
 *   derived from THEIR OWN record / applications, never a literal and never
 *   another worker's data. The de-facto reputation source today is
 *   `worker.reputationScore` (the reputation `StatTile` renders
 *   `String(worker.reputationScore)`); the fix will route that read through
 *   `getWorkerReputation(currentUser.id)`, which returns the same clamped
 *   `worker.reputationScore`, so this baseline stays valid.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO PASS ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * Both parts assert behavior that the Cluster 2 fix explicitly leaves
 * untouched: the reputation domain rules stay byte-for-byte, and a worker's
 * own dashboard keeps deriving from their own record/applications. This test
 * PASSING now is the success signal (the recorded baseline). It uses only the
 * real domain functions and the real store selectors — it does NOT import the
 * not-yet-existing `getWorkerReputation`, so it never fails as a compile
 * error.
 *
 * PART B tests at the DATA / SELECTOR layer rather than rendering the full
 * client dashboard (which is heavy: RoleGuard, useLifecycleSync, ~10 store
 * hooks, query hooks). The selection logic mirrored here is the exact inline
 * derivation the page performs; the store seeding follows the same pattern as
 * the neighboring render tests (`featuredJobMockup.test.tsx`,
 * `reputationDisplayEquality.property.test.ts`).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  applyReputationEvent,
  canApplyToShifts,
  INITIAL_SCORE,
  MIN_SCORE,
  MAX_SCORE,
  APPLY_THRESHOLD,
  type ReputationEvent,
} from '@/domain/reputation';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import type { Application, Shift, Worker } from '@/types';

// ===========================================================================
// PART A — Reputation rules (Property 12 / Req 3.4)
// ===========================================================================

/** Clamp to the module's exported bounds — the definition of "clamp 0..100".
 *  Built from the exported constants (NOT a copy of the private delta logic). */
const clampScore = (n: number): number =>
  Math.min(MAX_SCORE, Math.max(MIN_SCORE, n));

/** Generator over the full `ReputationEvent` union. `AdminAdjust` carries a
 *  random signed delta (including magnitudes that force clamping). */
const arbEvent: fc.Arbitrary<ReputationEvent> = fc.oneof(
  fc.constant<ReputationEvent>({ kind: 'Completed' }),
  fc.constant<ReputationEvent>({ kind: 'NoShow' }),
  fc.constant<ReputationEvent>({ kind: 'LateCancel' }),
  fc
    .integer({ min: -250, max: 250 })
    .map<ReputationEvent>((delta) => ({ kind: 'AdminAdjust', delta })),
);

// The three non-admin deltas, DERIVED from the real function at a mid-range
// score (50) where no clamping occurs — so the test never hard-codes the
// private magic numbers. (Observed on the current code: +5 / −10 / −20.)
const D_COMPLETED = applyReputationEvent(50, { kind: 'Completed' }) - 50;
const D_LATE_CANCEL = applyReputationEvent(50, { kind: 'LateCancel' }) - 50;
const D_NO_SHOW = applyReputationEvent(50, { kind: 'NoShow' }) - 50;

describe('Property 12 (Preservation) · Part A: reputation scoring rules unchanged', () => {
  it('constants sanity: 0 = MIN < APPLY_THRESHOLD < MAX = 100, INITIAL in range', () => {
    expect(MIN_SCORE).toBe(0);
    expect(MAX_SCORE).toBe(100);
    expect(MIN_SCORE).toBeLessThan(APPLY_THRESHOLD);
    expect(APPLY_THRESHOLD).toBeLessThan(MAX_SCORE);
    expect(INITIAL_SCORE).toBeGreaterThanOrEqual(MIN_SCORE);
    expect(INITIAL_SCORE).toBeLessThanOrEqual(MAX_SCORE);
  });

  it('clamp bounds: any starting score + any event yields a score in [0,100]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), arbEvent, (score, event) => {
        const r = applyReputationEvent(score, event);
        expect(r).toBeGreaterThanOrEqual(MIN_SCORE);
        expect(r).toBeLessThanOrEqual(MAX_SCORE);
        // Result is already fully clamped (idempotent clamping).
        expect(clampScore(r)).toBe(r);
      }),
      { numRuns: 300 },
    );
  });

  it('sequence fold: applying a random event sequence stays in [0,100] at every step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_SCORE, max: MAX_SCORE }),
        fc.array(arbEvent, { maxLength: 40 }),
        (start, events) => {
          let score = start;
          for (const event of events) {
            score = applyReputationEvent(score, event);
            expect(score).toBeGreaterThanOrEqual(MIN_SCORE);
            expect(score).toBeLessThanOrEqual(MAX_SCORE);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('idempotent clamping: pre-clamping the input never changes the output', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), arbEvent, (score, event) => {
        expect(applyReputationEvent(score, event)).toBe(
          applyReputationEvent(clampScore(score), event),
        );
      }),
      { numRuns: 300 },
    );
  });

  it('each event delta: derived deltas are correctly signed and ordered (no-show worse than late-cancel)', () => {
    // Completed rewards, no-show and late-cancel penalise.
    expect(D_COMPLETED).toBeGreaterThan(0);
    expect(D_LATE_CANCEL).toBeLessThan(0);
    expect(D_NO_SHOW).toBeLessThan(0);
    // A no-show is at least as punishing as a late cancellation.
    expect(Math.abs(D_NO_SHOW)).toBeGreaterThanOrEqual(Math.abs(D_LATE_CANCEL));
  });

  it('each event delta: each non-admin event applies a CONSTANT delta in the unclamped region', () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN_SCORE, max: MAX_SCORE }), (s) => {
        const cs = clampScore(s);
        // Completed: +D_COMPLETED wherever there is headroom below the cap.
        if (cs + D_COMPLETED <= MAX_SCORE) {
          expect(applyReputationEvent(s, { kind: 'Completed' }) - cs).toBe(D_COMPLETED);
        }
        // Late-cancel / no-show: their (negative) delta wherever it stays >= floor.
        if (cs + D_LATE_CANCEL >= MIN_SCORE) {
          expect(applyReputationEvent(s, { kind: 'LateCancel' }) - cs).toBe(D_LATE_CANCEL);
        }
        if (cs + D_NO_SHOW >= MIN_SCORE) {
          expect(applyReputationEvent(s, { kind: 'NoShow' }) - cs).toBe(D_NO_SHOW);
        }
      }),
      { numRuns: 250 },
    );
  });

  it('each event delta: direction holds for ALL scores (completed never lowers, penalties never raise)', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 150 }), (s) => {
        const cs = clampScore(s);
        expect(applyReputationEvent(s, { kind: 'Completed' })).toBeGreaterThanOrEqual(cs);
        expect(applyReputationEvent(s, { kind: 'NoShow' })).toBeLessThanOrEqual(cs);
        expect(applyReputationEvent(s, { kind: 'LateCancel' })).toBeLessThanOrEqual(cs);
        // From the same start, a no-show lands no higher than a late-cancel.
        expect(applyReputationEvent(s, { kind: 'NoShow' })).toBeLessThanOrEqual(
          applyReputationEvent(s, { kind: 'LateCancel' }),
        );
      }),
      { numRuns: 250 },
    );
  });

  it('admin adjustment: signed delta added as-is then clamped (additivity + saturation + no-op)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_SCORE, max: MAX_SCORE }),
        fc.integer({ min: -250, max: 250 }),
        (s, delta) => {
          const cs = clampScore(s);
          // No-op: a zero adjustment leaves the (clamped) score unchanged.
          expect(applyReputationEvent(s, { kind: 'AdminAdjust', delta: 0 })).toBe(cs);
          // In-range additivity: the exact signed delta is applied.
          if (cs + delta >= MIN_SCORE && cs + delta <= MAX_SCORE) {
            expect(applyReputationEvent(s, { kind: 'AdminAdjust', delta })).toBe(cs + delta);
          }
          // Saturation: extreme deltas clamp to the bounds.
          expect(applyReputationEvent(s, { kind: 'AdminAdjust', delta: 100_000 })).toBe(MAX_SCORE);
          expect(applyReputationEvent(s, { kind: 'AdminAdjust', delta: -100_000 })).toBe(MIN_SCORE);
        },
      ),
      { numRuns: 250 },
    );
  });

  it('apply threshold: canApplyToShifts(s) === (s >= APPLY_THRESHOLD), monotonic, exact boundary', () => {
    // Exact boundary at 50: allowed at the threshold, restricted one below.
    expect(canApplyToShifts(APPLY_THRESHOLD)).toBe(true);
    expect(canApplyToShifts(APPLY_THRESHOLD - 1)).toBe(false);

    fc.assert(
      fc.property(fc.integer({ min: -50, max: 150 }), (s) => {
        expect(canApplyToShifts(s)).toBe(s >= APPLY_THRESHOLD);
        // Monotonic: if s can apply, so can s + 1.
        if (canApplyToShifts(s)) {
          expect(canApplyToShifts(s + 1)).toBe(true);
        }
      }),
      { numRuns: 250 },
    );
  });
});

// ===========================================================================
// PART B — Worker's own dashboard data derives from their own record
//          (Property 12 / Req 3.3)
// ===========================================================================

const SELF_ID = 'wrk-self';
const OTHER_ID = 'wrk-other';
const EMPLOYER_ID = 'emp-1';

/** The two "active" statuses the dashboard's upcoming list keys on, plus the
 *  future / cancelled markers. */
const TODAY = new Date().toISOString().slice(0, 10);

function mkWorker(id: string, over: Partial<Worker> = {}): Worker {
  return {
    id,
    role: 'worker',
    email: `${id}@demo.vn`,
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    fullName: `Worker ${id}`,
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 100,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
    ...over,
  };
}

function mkShift(id: string, over: Partial<Shift> = {}): Shift {
  return {
    id,
    employerId: EMPLOYER_ID,
    title: `Shift ${id}`,
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2999-01-01',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 2,
    positionsFilled: 1,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...over,
  };
}

function mkApp(id: string, over: Partial<Application> = {}): Application {
  return {
    id,
    shiftId: 'sh-x',
    workerId: SELF_ID,
    status: 'Approved',
    appliedAt: '2020-01-01T00:00:00.000Z',
    ...over,
  };
}

// The logged-in worker's OWN record. Deliberately distinct from OTHER so any
// accidental cross-worker read shows up.
const SELF_REPUTATION = 72;
const SELF_COMPLETED_COUNT = 3;

// Confirmed payouts that belong to SELF (must be summed) vs OTHER (must not).
const SELF_PAYOUT_A = 300_000;
const SELF_PAYOUT_B = 150_000;
const OTHER_PAYOUT = 9_000_000;
const EXPECTED_OWN_EARNINGS = SELF_PAYOUT_A + SELF_PAYOUT_B; // 450_000

function seedDashboard(): void {
  useHydrationStore.setState({ hydrated: true });
  useUserStore.setState({
    users: [
      mkWorker(SELF_ID, {
        reputationScore: SELF_REPUTATION,
        completedShiftCount: SELF_COMPLETED_COUNT,
      }),
      // Different score + completed count — proves isolation.
      mkWorker(OTHER_ID, { reputationScore: 15, completedShiftCount: 99 }),
    ],
  });
  useAuthStore.setState({ currentUserId: SELF_ID, lastActivityAt: null });
  useShiftStore.setState({
    shifts: [
      mkShift('sh-future', { date: '2999-01-01', status: 'Published' }),
      mkShift('sh-future-cancelled', { date: '2999-01-01', status: 'Cancelled' }),
      mkShift('sh-past', { date: '2000-01-01', status: 'Completed' }),
      mkShift('sh-other-future', { date: '2999-01-01', status: 'Published' }),
      mkShift('sh-conf-self-a', { date: '2000-06-01', status: 'Completed' }),
      mkShift('sh-conf-self-b', { date: '2000-06-02', status: 'Completed' }),
      mkShift('sh-conf-other', { date: '2000-06-03', status: 'Completed' }),
    ],
  });
  useApplicationStore.setState({
    applications: [
      // SELF — two confirmed (earnings) ...
      mkApp('app-self-conf-a', {
        shiftId: 'sh-conf-self-a',
        status: 'Confirmed',
        payoutAmount: SELF_PAYOUT_A,
      }),
      mkApp('app-self-conf-b', {
        shiftId: 'sh-conf-self-b',
        status: 'Confirmed',
        payoutAmount: SELF_PAYOUT_B,
      }),
      // ... one approved FUTURE (upcoming) ...
      mkApp('app-self-future', { shiftId: 'sh-future', status: 'Approved' }),
      // ... one approved future but the SHIFT is cancelled (excluded) ...
      mkApp('app-self-future-cancelled', {
        shiftId: 'sh-future-cancelled',
        status: 'Approved',
      }),
      // ... one approved but PAST (excluded by date).
      mkApp('app-self-past', { shiftId: 'sh-past', status: 'Approved' }),
      // OTHER worker — a huge confirmed payout + a future approved shift,
      // both of which must NOT leak into SELF's earnings / upcoming.
      mkApp('app-other-conf', {
        shiftId: 'sh-conf-other',
        workerId: OTHER_ID,
        status: 'Confirmed',
        payoutAmount: OTHER_PAYOUT,
      }),
      mkApp('app-other-future', {
        shiftId: 'sh-other-future',
        workerId: OTHER_ID,
        status: 'Approved',
      }),
    ],
    disputes: [],
  });
}

function resetStores(): void {
  useApplicationStore.setState({ applications: [], disputes: [] });
  useShiftStore.setState({ shifts: [] });
  useUserStore.setState({ users: [] });
  useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  useHydrationStore.setState({ hydrated: false });
}

// ---------------------------------------------------------------------------
// Selector-layer mirrors of the worker dashboard's own-data derivations
// (src/app/worker/dashboard/page.tsx). Kept faithful to the page so the
// baseline reflects what the dashboard actually surfaces.
// ---------------------------------------------------------------------------

/** Resolve the logged-in worker exactly as the page does. */
function resolveOwnWorker(): Worker | undefined {
  const currentUserId = useAuthStore.getState().currentUserId;
  const users = useUserStore.getState().users;
  return asWorker(users.find((u) => u.id === currentUserId));
}

/** `myApps = applications.filter(a => a.workerId === worker.id)` */
function ownApplications(worker: Worker): Application[] {
  return useApplicationStore.getState().applications.filter(
    (a) => a.workerId === worker.id,
  );
}

/** The reputation string the dashboard's StatTile surfaces today. */
function dashboardReputationValue(worker: Worker): string {
  return String(worker.reputationScore);
}

/** `totalEarnings = myApps.filter(Confirmed).reduce(+payoutAmount)` */
function ownTotalEarnings(worker: Worker): number {
  return ownApplications(worker)
    .filter((a) => a.status === 'Confirmed')
    .reduce((acc, a) => acc + (a.payoutAmount ?? 0), 0);
}

/** The dashboard's upcoming filter (statuses + non-cancelled shift + future date). */
function ownUpcoming(worker: Worker): Application[] {
  const shiftMap = new Map(useShiftStore.getState().shifts.map((s) => [s.id, s]));
  return ownApplications(worker).filter((a) => {
    if (
      !['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut'].includes(
        a.status,
      )
    ) {
      return false;
    }
    const sh = shiftMap.get(a.shiftId);
    if (!sh) return false;
    if (sh.status === 'Cancelled') return false;
    return sh.date >= TODAY;
  });
}

describe("Property 12 (Preservation) · Part B: worker's own dashboard derives from their own data", () => {
  beforeEach(seedDashboard);
  afterEach(resetStores);

  it('reputation source: the dashboard surfaces the logged-in worker\'s OWN reputationScore', () => {
    const worker = resolveOwnWorker();
    expect(worker).toBeDefined();
    expect(worker!.id).toBe(SELF_ID);

    // The de-facto source today: `worker.reputationScore` (StatTile renders
    // `String(worker.reputationScore)`). It is the OWN record's real score,
    // not a literal and not the other worker's score.
    expect(dashboardReputationValue(worker!)).toBe(String(SELF_REPUTATION));
    expect(worker!.reputationScore).toBe(SELF_REPUTATION);

    const other = useUserStore.getState().findById(OTHER_ID) as Worker;
    expect(worker!.reputationScore).not.toBe(other.reputationScore);
  });

  it('completed-shift count: reads the OWN worker record (not another worker)', () => {
    const worker = resolveOwnWorker()!;
    expect(worker.completedShiftCount).toBe(SELF_COMPLETED_COUNT);
    const other = useUserStore.getState().findById(OTHER_ID) as Worker;
    expect(worker.completedShiftCount).not.toBe(other.completedShiftCount);
  });

  it('earnings: sum only the OWN confirmed applications (another worker\'s payout is excluded)', () => {
    const worker = resolveOwnWorker()!;
    expect(ownTotalEarnings(worker)).toBe(EXPECTED_OWN_EARNINGS);
    // Every confirmed app that fed the sum belongs to this worker.
    for (const a of ownApplications(worker).filter((x) => x.status === 'Confirmed')) {
      expect(a.workerId).toBe(SELF_ID);
    }
    // The huge OTHER payout never contributed.
    expect(ownTotalEarnings(worker)).toBeLessThan(OTHER_PAYOUT);
  });

  it('upcoming: only the OWN future, non-cancelled shifts (isolated from another worker)', () => {
    const worker = resolveOwnWorker()!;
    const upcoming = ownUpcoming(worker);

    // Exactly the one eligible SELF application (future + Approved + shift
    // not cancelled). Past shift and cancelled-shift apps are excluded.
    expect(upcoming.map((a) => a.id)).toEqual(['app-self-future']);
    // Everything surfaced belongs to the logged-in worker.
    for (const a of upcoming) {
      expect(a.workerId).toBe(SELF_ID);
    }
    // The OTHER worker's future approved application never appears.
    expect(upcoming.some((a) => a.id === 'app-other-future')).toBe(false);
  });
});
