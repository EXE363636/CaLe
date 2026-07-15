/**
 * Cluster 1 · Task 3 — PRESERVATION baseline test.
 *
 * Property 11 (Preservation) — "Attendance states other than 'both confirmed
 * present'".
 *
 * Validates: Requirements 3.1, 3.2
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (observation-first baseline)
 * ---------------------------------------------------------------------------
 * This test records the CURRENT behavior of the UNFIXED code for every
 * attendance state EXCEPT `BothConfirmedPresent`, so the Cluster 1 fix
 * (task 5.1 — suppressing the stray "Đánh dấu vắng mặt" CTA only in
 * `BothConfirmedPresent`) can be proven NOT to regress it.
 *
 * It asserts, over the whole non-`BothConfirmedPresent` state space, the two
 * things Property 11 protects:
 *
 *   1. STATE + COPY: the canonical state produced by `deriveAttendanceState`
 *      is stable, and the EMPLOYER-facing attendance copy selected by
 *      `attendanceCopyKey` (resolved through the same `attendance.copy.*`
 *      i18n source the employer page uses) is byte-for-byte the current copy.
 *
 *   2. NO-SHOW AFFORDANCE: a genuine no-show — an `Approved` worker who never
 *      checked in, inside `[start + CHECK_IN_LATE, end + grace]` — STILL
 *      yields the mark-absent affordance. On the page this is the LIVE
 *      "Đánh dấu vắng mặt" button, driven by
 *      `canMarkAbsent = !terminal && status==='Approved' &&
 *       (canEmployerMarkAbsent || shouldMarkNoShow)`. The fix must preserve
 *      this while removing only the stray disabled button in
 *      `BothConfirmedPresent`.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO PASS ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * The fix (task 5.1) touches ONLY the page-level `absentDisabledReason`
 * branch for the `BothConfirmedPresent` state; it does NOT change
 * `deriveAttendanceState`, `attendanceCopyKey`, the `attendance.copy.*`
 * strings, or `canEmployerMarkAbsent` / `shouldMarkNoShow`. Testing those
 * pure domain layers therefore records a baseline that is (a) fast and
 * deterministic, (b) stable across the fix, and (c) exactly the contract
 * Property 11 protects. This test PASSING now is the success signal.
 *
 * NOTE ON TIME: the domain functions parse `(shift.date, shift.time)` in
 * LOCAL time and parse `nowIso` with `new Date(nowIso)`. To stay timezone-
 * stable across CI runners, "now" instants are built from the SAME local
 * frame as the shift window (see `isoAt`), mirroring the existing
 * `coreStability10` domain tests.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  deriveAttendanceState,
  attendanceCopyKey,
  type AttendanceState,
} from '@/domain/attendanceState';
import {
  canEmployerMarkAbsent,
  shouldMarkNoShow,
  CHECK_IN_EARLY_MINUTES,
  CHECK_IN_LATE_MINUTES,
  CHECK_OUT_GRACE_MINUTES,
} from '@/domain/timeGates';
import { t } from '@/i18n/vi';
import type { Application, Shift } from '@/types';

// ---------------------------------------------------------------------------
// Shift window + local-time helpers
// ---------------------------------------------------------------------------

const MIN = 60_000;

const SHIFT_DATE = '2030-06-15';
const START_HHMM = '08:00';
const END_HHMM = '17:00';

// Parsed in LOCAL time exactly like the domain modules
// (`new Date(`${date}T${time}:00`)`).
const startMs = new Date(`${SHIFT_DATE}T${START_HHMM}:00`).getTime();
const endMs = new Date(`${SHIFT_DATE}T${END_HHMM}:00`).getTime();
const SHIFT_LEN_MIN = Math.round((endMs - startMs) / MIN); // 540

/** An ISO instant for an absolute epoch-ms — round-trips through the domain
 *  funcs' `new Date(nowIso).getTime()` on the same timeline as the shift. */
const isoAt = (ms: number): string => new Date(ms).toISOString();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A non-terminal shift with the fixed window above. `InProgress` so the
 *  page's `shiftTerminal` guard is false (the no-show button is live). */
const SHIFT: Shift = {
  id: 's-preserve',
  employerId: 'emp-1',
  title: 'Phục vụ tiệc',
  description: '',
  requirements: '',
  jobType: 'Phục vụ',
  location: 'Quận 1, TP.HCM',
  district: 'Quận 1, TP.HCM',
  date: SHIFT_DATE,
  startTime: START_HHMM,
  endTime: END_HHMM,
  hourlyWage: 50_000,
  positionsTotal: 2,
  positionsFilled: 1,
  status: 'InProgress',
  escrowStatus: 'InProgress',
  depositAmount: 200_000,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
  evidenceRequirement: 'OptionalPhoto',
};

function mkApp(over: Partial<Application> = {}): Application {
  return {
    id: 'app-preserve',
    shiftId: SHIFT.id,
    workerId: 'w-preserve',
    status: 'Approved',
    appliedAt: '2020-01-01T00:00:00.000Z',
    approvedAt: '2020-01-01T01:00:00.000Z',
    payoutAmount: 200_000,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Baseline copy map — the EMPLOYER-facing attendance copy the current code
// produces for each state, resolved through the same `attendance.copy.*`
// source the page reads. `undefined` = the state renders NO banner.
//
// A full `Record` so TypeScript forces every enum member to be accounted for.
// `BothConfirmedPresent` is listed for completeness but is INTENTIONALLY
// out of scope for this preservation test (it is the bug-condition state
// covered by tasks 1 / 5).
// ---------------------------------------------------------------------------

const EMPLOYER_COPY_BASELINE: Record<AttendanceState, string | undefined> = {
  ApprovedNotStarted: undefined,
  WorkerCheckedInEarly: 'Người làm đã check-in. Vui lòng xác nhận có mặt nếu đúng.',
  WorkerCheckedInInProgress: 'Người làm đã check-in. Vui lòng xác nhận có mặt nếu đúng.',
  EmployerMarkedPresentOnly:
    'Bạn đã xác nhận người làm có mặt. Đang chờ người làm tự check-in để ghi nhận thời điểm bắt đầu.',
  BothConfirmedPresent:
    'Hai bên đã xác nhận có mặt. Đợi đến hết ca để người làm check-out.', // OUT OF SCOPE
  NoShow: undefined,
  AwaitingCheckout: 'Ca đã kết thúc. Đang chờ người làm check-out.',
  CheckedOut: undefined, // never produced by deriveAttendanceState
  AwaitingEmployerConfirmation: undefined,
  Disputed: undefined,
  Completed: undefined,
};

/** Every non-`BothConfirmedPresent` state that `deriveAttendanceState` can
 *  actually return — the exact scope of this preservation baseline. */
const COVERED_STATES: readonly AttendanceState[] = [
  'ApprovedNotStarted',
  'WorkerCheckedInEarly',
  'WorkerCheckedInInProgress',
  'EmployerMarkedPresentOnly',
  'NoShow',
  'AwaitingCheckout',
  'AwaitingEmployerConfirmation',
  'Disputed',
  'Completed',
];

// ---------------------------------------------------------------------------
// Generators — one arbitrary per target state, with time jitter that keeps
// the triple inside that state's region. `deriveAttendanceState(app, SHIFT,
// nowIso)` is guaranteed to equal `state` for every emitted fixture.
// ---------------------------------------------------------------------------

interface Fixture {
  state: AttendanceState;
  app: Application;
  nowIso: string;
  /** True only for the genuine-no-show fixtures (Approved, never checked in,
   *  inside the mark-absent window). */
  genuineNoShow: boolean;
}

const TRUTHY_STAMP = isoAt(startMs); // any truthy ISO — only presence matters

// Approved + no stamps → ApprovedNotStarted regardless of `now`.
const arbApprovedNotStarted: fc.Arbitrary<Fixture> = fc
  .integer({ min: -180, max: SHIFT_LEN_MIN + 180 })
  .map((offMin) => ({
    state: 'ApprovedNotStarted',
    app: mkApp({ status: 'Approved' }),
    nowIso: isoAt(startMs + offMin * MIN),
    genuineNoShow: false,
  }));

// Genuine no-show: Approved, never checked in, now in
// [start + CHECK_IN_LATE, end + grace] → canEmployerMarkAbsent === true.
const arbGenuineNoShow: fc.Arbitrary<Fixture> = fc
  .integer({ min: CHECK_IN_LATE_MINUTES, max: SHIFT_LEN_MIN + CHECK_OUT_GRACE_MINUTES })
  .map((offMin) => ({
    state: 'ApprovedNotStarted',
    app: mkApp({ status: 'Approved' }),
    nowIso: isoAt(startMs + offMin * MIN),
    genuineNoShow: true,
  }));

// Employer marked present, worker not self-checked-in → EmployerMarkedPresentOnly.
//   variant A: status Approved + markedPresentAt
//   variant B: status CheckedIn + markedPresentAt, no checkInAt
const arbEmployerPresentOnly: fc.Arbitrary<Fixture> = fc
  .tuple(
    fc.integer({ min: -60, max: SHIFT_LEN_MIN + 120 }),
    fc.constantFrom<'Approved' | 'CheckedIn'>('Approved', 'CheckedIn'),
  )
  .map(([offMin, status]) => ({
    state: 'EmployerMarkedPresentOnly',
    app: mkApp({ status, markedPresentAt: TRUTHY_STAMP }),
    nowIso: isoAt(startMs + offMin * MIN),
    genuineNoShow: false,
  }));

// CheckedIn + checkInAt, no employer mark, now < start → WorkerCheckedInEarly.
const arbWorkerCheckedInEarly: fc.Arbitrary<Fixture> = fc
  .integer({ min: 1, max: CHECK_IN_EARLY_MINUTES })
  .map((beforeMin) => ({
    state: 'WorkerCheckedInEarly',
    app: mkApp({ status: 'CheckedIn', checkInAt: TRUTHY_STAMP }),
    nowIso: isoAt(startMs - beforeMin * MIN),
    genuineNoShow: false,
  }));

// CheckedIn + checkInAt, no employer mark, start <= now < end → InProgress.
const arbWorkerCheckedInInProgress: fc.Arbitrary<Fixture> = fc
  .integer({ min: 0, max: SHIFT_LEN_MIN - 1 })
  .map((offMin) => ({
    state: 'WorkerCheckedInInProgress',
    app: mkApp({ status: 'CheckedIn', checkInAt: TRUTHY_STAMP }),
    nowIso: isoAt(startMs + offMin * MIN),
    genuineNoShow: false,
  }));

// CheckedIn + checkInAt, now >= end → AwaitingCheckout (first branch wins).
const arbAwaitingCheckout: fc.Arbitrary<Fixture> = fc
  .integer({ min: 0, max: 300 })
  .map((afterMin) => ({
    state: 'AwaitingCheckout',
    app: mkApp({ status: 'CheckedIn', checkInAt: TRUTHY_STAMP }),
    nowIso: isoAt(endMs + afterMin * MIN),
    genuineNoShow: false,
  }));

// Terminal / status-driven states — returned before any time computation.
const arbNoShow: fc.Arbitrary<Fixture> = fc
  .integer({ min: -60, max: SHIFT_LEN_MIN + 120 })
  .map((offMin) => ({
    state: 'NoShow',
    app: mkApp({ status: 'NoShow', noShowAt: TRUTHY_STAMP }),
    nowIso: isoAt(startMs + offMin * MIN),
    genuineNoShow: false,
  }));

const arbAwaitingEmployerConfirmation: fc.Arbitrary<Fixture> = fc
  .integer({ min: 0, max: SHIFT_LEN_MIN + 120 })
  .map((offMin) => ({
    state: 'AwaitingEmployerConfirmation',
    app: mkApp({ status: 'CheckedOut', checkInAt: TRUTHY_STAMP, checkOutAt: TRUTHY_STAMP }),
    nowIso: isoAt(endMs + offMin * MIN),
    genuineNoShow: false,
  }));

const arbDisputed: fc.Arbitrary<Fixture> = fc
  .integer({ min: -60, max: SHIFT_LEN_MIN + 120 })
  .map((offMin) => ({
    state: 'Disputed',
    app: mkApp({ status: 'Disputed' }),
    nowIso: isoAt(startMs + offMin * MIN),
    genuineNoShow: false,
  }));

const arbCompleted: fc.Arbitrary<Fixture> = fc
  .integer({ min: 0, max: SHIFT_LEN_MIN + 120 })
  .map((offMin) => ({
    state: 'Completed',
    app: mkApp({ status: 'Confirmed', confirmedAt: TRUTHY_STAMP }),
    nowIso: isoAt(endMs + offMin * MIN),
    genuineNoShow: false,
  }));

/** Any non-`BothConfirmedPresent` fixture. */
const arbAnyPreservedState: fc.Arbitrary<Fixture> = fc.oneof(
  arbApprovedNotStarted,
  arbGenuineNoShow,
  arbEmployerPresentOnly,
  arbWorkerCheckedInEarly,
  arbWorkerCheckedInInProgress,
  arbAwaitingCheckout,
  arbNoShow,
  arbAwaitingEmployerConfirmation,
  arbDisputed,
  arbCompleted,
);

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/** Assert the employer-facing copy for `state` equals the recorded baseline
 *  (via the same selector + i18n source the page uses). */
function assertEmployerCopyBaseline(state: AttendanceState): void {
  const key = attendanceCopyKey(state, 'employer');
  const expected = EMPLOYER_COPY_BASELINE[state];
  if (expected === undefined) {
    // Non-banner state → the surface renders no attendance banner.
    expect(key).toBeUndefined();
  } else {
    expect(key).toBe(`attendance.copy.employer.${state}`);
    // Resolved copy is the exact baseline string (a real dictionary hit,
    // not the missing-key fallback).
    expect(t(key as string)).toBe(expected);
  }
}

describe('Property 11 (Preservation): attendance states other than "both confirmed present"', () => {
  it('scope guard: coverage excludes BothConfirmedPresent (and it is a real, separately-owned state)', () => {
    expect(COVERED_STATES).not.toContain('BothConfirmedPresent');

    // A genuine both-confirmed triple derives to BothConfirmedPresent — the
    // one state deliberately left to tasks 1 / 5, not asserted here.
    const bothConfirmed = mkApp({
      status: 'CheckedIn',
      checkInAt: TRUTHY_STAMP,
      markedPresentAt: TRUTHY_STAMP,
    });
    expect(
      deriveAttendanceState(bothConfirmed, SHIFT, isoAt(startMs + 30 * MIN)),
    ).toBe('BothConfirmedPresent');
  });

  it('baseline: employer attendance copy is unchanged for every banner state (except BothConfirmedPresent)', () => {
    // The four employer banner states in scope, with their current copy.
    assertEmployerCopyBaseline('WorkerCheckedInEarly');
    assertEmployerCopyBaseline('WorkerCheckedInInProgress');
    assertEmployerCopyBaseline('EmployerMarkedPresentOnly');
    assertEmployerCopyBaseline('AwaitingCheckout');
  });

  it('baseline: non-banner states render no employer attendance banner', () => {
    for (const state of [
      'ApprovedNotStarted',
      'NoShow',
      'AwaitingEmployerConfirmation',
      'Disputed',
      'Completed',
    ] as const) {
      expect(attendanceCopyKey(state, 'employer')).toBeUndefined();
    }
  });

  it('baseline: genuine no-show (Approved, never checked in) still yields the mark-absent affordance', () => {
    const app = mkApp({ status: 'Approved' });
    const nowIso = isoAt(startMs + 30 * MIN); // 30 min in → past the check-in window

    // State stays ApprovedNotStarted (no self check-in, no employer mark)...
    expect(deriveAttendanceState(app, SHIFT, nowIso)).toBe('ApprovedNotStarted');
    // ...and the employer's LIVE "Đánh dấu vắng mặt" affordance is available.
    expect(canEmployerMarkAbsent(nowIso, app, SHIFT)).toBe(true);
    // Page-level driver: canMarkAbsent = !terminal && Approved && (gate || noShow).
    const shiftTerminal =
      SHIFT.status === 'Expired' ||
      SHIFT.status === 'Cancelled' ||
      SHIFT.status === 'Completed';
    const canMarkAbsent =
      !shiftTerminal &&
      app.status === 'Approved' &&
      (canEmployerMarkAbsent(nowIso, app, SHIFT) || shouldMarkNoShow(nowIso, app, SHIFT));
    expect(canMarkAbsent).toBe(true);
  });

  it('property: derived state is stable and employer copy matches the baseline across the non-BothConfirmedPresent space', () => {
    fc.assert(
      fc.property(arbAnyPreservedState, (fx) => {
        const derived = deriveAttendanceState(fx.app, SHIFT, fx.nowIso);

        // The generator's intended state is exactly what the machine derives.
        expect(derived).toBe(fx.state);
        // Never the excluded bug-condition state.
        expect(derived).not.toBe('BothConfirmedPresent');

        // Employer copy is the recorded baseline for that state.
        assertEmployerCopyBaseline(derived);
      }),
      { numRuns: 300 },
    );
  });

  it('property: every genuine no-show keeps the mark-absent affordance across [start+late, end+grace]', () => {
    fc.assert(
      fc.property(arbGenuineNoShow, (fx) => {
        // Genuine no-show remains ApprovedNotStarted (never checked in)...
        expect(deriveAttendanceState(fx.app, SHIFT, fx.nowIso)).toBe('ApprovedNotStarted');
        expect(fx.app.status).toBe('Approved');
        // ...and the mark-absent gate is open for the whole window.
        expect(canEmployerMarkAbsent(fx.nowIso, fx.app, SHIFT)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
