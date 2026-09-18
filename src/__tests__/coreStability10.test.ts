/**
 * CORE-STABILITY-10 — unified shift lifecycle, role-aware attendance,
 * checkout lock, and badge consistency.
 *
 *   Part 1 — getShiftLifecycleState is ONE source of truth; check-in /
 *            mark-present never move it; time-only transitions.
 *   Part 2/3 — attendance state machine separate from shift state;
 *            checkout only after end + valid attendance.
 *   Part 4 — employer present/absent eligibility.
 *   Part 5 — role-aware copy keys (worker / employer / admin).
 *   Part 6 — getShiftStatusBadge: same state = same label + same tone.
 *   Part 7 — cross-role time-travel (18:05–18:09) consistency.
 *
 * Deterministic domain tests; "now" instants are built from the SAME
 * local-time frame the helpers use to parse `(date, time)` so they are
 * timezone-stable across CI runners.
 */

import { describe, it, expect } from 'vitest';

import {
  getShiftLifecycleState,
  getShiftStatusBadge,
  isActiveDashboardShift,
  type ShiftLifecycleState,
} from '@/domain/shiftLifecycleState';
import {
  deriveAttendanceState,
  attendanceCopyKey,
} from '@/domain/attendanceState';
import { canCheckOut } from '@/domain/timeGates';
import {
  canEmployerMarkPresent,
  canEmployerMarkAbsent,
} from '@/domain/timeGates';
import type { Application, Shift } from '@/types';

const A_ISO = '2030-06-02T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkShift(over: Partial<Shift> = {}): Shift {
  return {
    id: 's-cs10',
    employerId: 'emp-1',
    title: 'Phục vụ tiệc',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    date: '2030-06-02',
    startTime: '18:05',
    endTime: '18:09',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 1,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: A_ISO,
    updatedAt: A_ISO,
    evidenceRequirement: 'OptionalPhoto',
    ...over,
  };
}

function mkApp(over: Partial<Application> = {}): Application {
  return {
    id: 'app-cs10',
    shiftId: 's-cs10',
    workerId: 'w-cs10',
    status: 'Approved',
    appliedAt: A_ISO,
    approvedAt: A_ISO,
    ...over,
  };
}

/** Build an ISO instant from a local wall clock on the shift day. */
function localIso(dateTime: string, offsetMin = 0): string {
  return new Date(
    new Date(dateTime).getTime() + offsetMin * 60_000,
  ).toISOString();
}

// ---------------------------------------------------------------------------
// Part 1 — getShiftLifecycleState is the ONE source of truth
// ---------------------------------------------------------------------------

describe('CS10 Part 1: lifecycle state is time-driven only', () => {
  const shift = mkShift({ startTime: '18:05', endTime: '18:09' });

  it('Draft / PendingDeposit / terminal states are honoured first', () => {
    expect(
      getShiftLifecycleState(mkShift({ status: 'Draft' }), [], localIso('2030-06-02T18:06:00')),
    ).toBe('Draft');
    expect(
      getShiftLifecycleState(
        mkShift({ status: 'Published', escrowStatus: 'PendingDeposit' }),
        [],
        localIso('2030-06-02T18:06:00'),
      ),
    ).toBe('PendingDeposit');
    expect(
      getShiftLifecycleState(mkShift({ status: 'Cancelled' }), [], localIso('2030-06-02T18:06:00')),
    ).toBe('Cancelled');
    expect(
      getShiftLifecycleState(mkShift({ status: 'Completed' }), [], localIso('2030-06-02T18:06:00')),
    ).toBe('Completed');
    expect(
      getShiftLifecycleState(mkShift({ status: 'Expired' }), [], localIso('2030-06-02T18:06:00')),
    ).toBe('Expired');
  });

  it('before start − 15min → Published', () => {
    expect(
      getShiftLifecycleState(shift, [], localIso('2030-06-02T17:30:00')),
    ).toBe('Published');
  });

  it('within 15min before start → StartingSoon (never InProgress)', () => {
    expect(
      getShiftLifecycleState(shift, [], localIso('2030-06-02T17:55:00')),
    ).toBe('StartingSoon');
    expect(
      getShiftLifecycleState(shift, [], localIso('2030-06-02T18:04:00')),
    ).toBe('StartingSoon');
  });

  it('start ≤ now < end → InProgress', () => {
    expect(
      getShiftLifecycleState(shift, [], localIso('2030-06-02T18:05:00')),
    ).toBe('InProgress');
    expect(
      getShiftLifecycleState(shift, [], localIso('2030-06-02T18:08:00')),
    ).toBe('InProgress');
  });

  it('after end with a checked-in worker → AwaitingCheckout', () => {
    const app = mkApp({ status: 'CheckedIn', checkInAt: localIso('2030-06-02T18:05:00') });
    expect(
      getShiftLifecycleState(shift, [app], localIso('2030-06-02T18:10:00')),
    ).toBe('AwaitingCheckout');
  });

  it('after end with nobody checked in → Expired', () => {
    const app = mkApp({ status: 'Approved' });
    expect(
      getShiftLifecycleState(shift, [app], localIso('2030-06-02T18:10:00')),
    ).toBe('Expired');
  });

  it('CheckedOut application → AwaitingEmployerConfirmation', () => {
    const app = mkApp({ status: 'CheckedOut' });
    expect(
      getShiftLifecycleState(shift, [app], localIso('2030-06-02T18:10:00')),
    ).toBe('AwaitingEmployerConfirmation');
  });

  it('dispute beats the time rules', () => {
    const app = mkApp({ status: 'Disputed' });
    expect(
      getShiftLifecycleState(shift, [app], localIso('2030-06-02T18:06:00')),
    ).toBe('Disputed');
  });
});

describe('CS10 Part 1: check-in / mark-present do NOT change lifecycle', () => {
  const shift = mkShift({ startTime: '18:05', endTime: '18:09' });
  const before = localIso('2030-06-02T18:00:00'); // before start

  it('worker checked-in before start → still NOT InProgress', () => {
    const checkedIn = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T18:00:00'),
    });
    // 18:00 is within 15min of an 18:05 start → StartingSoon, never InProgress.
    expect(getShiftLifecycleState(shift, [checkedIn], before)).toBe(
      'StartingSoon',
    );
  });

  it('employer marked present before start → still NOT InProgress', () => {
    const markedPresent = mkApp({
      status: 'CheckedIn',
      markedPresentAt: localIso('2030-06-02T18:00:00'),
    });
    expect(getShiftLifecycleState(shift, [markedPresent], before)).toBe(
      'StartingSoon',
    );
  });

  it('lifecycle is identical with or without check-in at the same now', () => {
    const now = localIso('2030-06-02T18:04:00');
    const approved = mkApp({ status: 'Approved' });
    const checkedIn = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T18:00:00'),
    });
    expect(getShiftLifecycleState(shift, [approved], now)).toBe(
      getShiftLifecycleState(shift, [checkedIn], now),
    );
  });
});

// ---------------------------------------------------------------------------
// Part 2/3 — attendance state separate from shift state
// ---------------------------------------------------------------------------

describe('CS10 Part 2/3: attendance state + checkout gate', () => {
  const shift = mkShift({ startTime: '18:05', endTime: '18:09' });

  it('worker checked-in early → WorkerCheckedInEarly (waiting, no checkout)', () => {
    const app = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T17:55:00'),
    });
    const at = localIso('2030-06-02T17:55:00');
    expect(deriveAttendanceState(app, shift, at)).toBe('WorkerCheckedInEarly');
    expect(canCheckOut(at, app, shift)).toBe(false);
  });

  it('worker checked-in during shift → WorkerCheckedInInProgress (no checkout)', () => {
    const app = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T18:05:00'),
    });
    const at = localIso('2030-06-02T18:07:00');
    expect(deriveAttendanceState(app, shift, at)).toBe(
      'WorkerCheckedInInProgress',
    );
    expect(canCheckOut(at, app, shift)).toBe(false);
  });

  it('employer marked-present only → EmployerMarkedPresentOnly, never unlocks checkout', () => {
    const app = mkApp({
      status: 'CheckedIn',
      markedPresentAt: localIso('2030-06-02T18:00:00'),
    });
    // During shift.
    const during = localIso('2030-06-02T18:07:00');
    expect(deriveAttendanceState(app, shift, during)).toBe(
      'EmployerMarkedPresentOnly',
    );
    expect(canCheckOut(during, app, shift)).toBe(false);
    // Even after end, employer-only presence never unlocks checkout.
    const after = localIso('2030-06-02T18:10:00');
    expect(canCheckOut(after, app, shift)).toBe(false);
  });

  it('worker self check-in after end → AwaitingCheckout + checkout allowed', () => {
    const app = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T18:05:00'),
    });
    const after = localIso('2030-06-02T18:10:00');
    expect(deriveAttendanceState(app, shift, after)).toBe('AwaitingCheckout');
    expect(canCheckOut(after, app, shift)).toBe(true);
  });

  it('checkout never opens before end', () => {
    const app = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T18:05:00'),
    });
    for (const t of ['18:05', '18:06', '18:08']) {
      expect(canCheckOut(localIso(`2030-06-02T${t}:00`), app, shift)).toBe(
        false,
      );
    }
    // At/after end → allowed.
    expect(canCheckOut(localIso('2030-06-02T18:09:00'), app, shift)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Part 4 — employer present/absent eligibility
// ---------------------------------------------------------------------------

describe('CS10 Part 4: employer present/absent eligibility', () => {
  const shift = mkShift({ startTime: '18:05', endTime: '18:09' });

  it('approved worker during window → can mark present AND absent', () => {
    const app = mkApp({ status: 'Approved' });
    // 18:21 is >15min after start (absent window opens at start+15) and
    // within end+grace.
    const at = localIso('2030-06-02T18:21:00');
    expect(canEmployerMarkPresent(at, app, shift)).toBe(true);
    expect(canEmployerMarkAbsent(at, app, shift)).toBe(true);
  });

  it('mark-present is independent of evidenceRequirement (None)', () => {
    const app = mkApp({ status: 'Approved' });
    const noneShift = mkShift({ evidenceRequirement: 'None' });
    const at = localIso('2030-06-02T18:21:00');
    expect(canEmployerMarkAbsent(at, app, noneShift)).toBe(true);
  });

  it('worker self checked-in → mark-present no longer offered (idempotent gate)', () => {
    const app = mkApp({
      status: 'CheckedIn',
      checkInAt: localIso('2030-06-02T18:05:00'),
      markedPresentAt: undefined,
    });
    const at = localIso('2030-06-02T18:07:00');
    // Employer can still confirm presence on a self-checked-in worker
    // (markedPresentAt unset) — Batch 3 D.
    expect(canEmployerMarkPresent(at, app, shift)).toBe(true);
    // But mark-ABSENT must NOT be eligible for a CheckedIn worker.
    expect(canEmployerMarkAbsent(at, app, shift)).toBe(false);
  });

  it('employer mark-present already done → not offered again', () => {
    const app = mkApp({
      status: 'CheckedIn',
      markedPresentAt: localIso('2030-06-02T18:06:00'),
    });
    const at = localIso('2030-06-02T18:07:00');
    expect(canEmployerMarkPresent(at, app, shift)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 5 — role-aware copy
// ---------------------------------------------------------------------------

describe('CS10 Part 5: role-aware attendance copy keys', () => {
  const states = [
    'WorkerCheckedInEarly',
    'WorkerCheckedInInProgress',
    'EmployerMarkedPresentOnly',
    'BothConfirmedPresent',
    'AwaitingCheckout',
  ] as const;

  it('worker / employer / admin keys are all distinct per state', () => {
    for (const s of states) {
      const w = attendanceCopyKey(s, 'worker');
      const e = attendanceCopyKey(s, 'employer');
      const a = attendanceCopyKey(s, 'admin');
      expect(w).toBe(`attendance.copy.worker.${s}`);
      expect(e).toBe(`attendance.copy.employer.${s}`);
      expect(a).toBe(`attendance.copy.admin.${s}`);
      expect(w).not.toBe(e);
      expect(e).not.toBe(a);
    }
  });
});

// ---------------------------------------------------------------------------
// Part 6 — badge consistency: same state = same label + same tone
// ---------------------------------------------------------------------------

describe('CS10 Part 6: badge mapping consistency', () => {
  it('every state maps to a stable label + tone + priority', () => {
    const states: ShiftLifecycleState[] = [
      'Draft',
      'PendingDeposit',
      'Published',
      'StartingSoon',
      'InProgress',
      'AwaitingCheckout',
      'AwaitingEmployerConfirmation',
      'Completed',
      'Expired',
      'Cancelled',
      'Disputed',
    ];
    for (const s of states) {
      const info = getShiftStatusBadge(s);
      expect(info.state).toBe(s);
      expect(info.labelKey).toBe(`shift.lifecycle.${s}`);
      expect(typeof info.tone).toBe('string');
      expect(typeof info.priority).toBe('number');
    }
  });

  it('InProgress is "info" (blue) — NEVER purple or green', () => {
    const info = getShiftStatusBadge('InProgress');
    expect(info.tone).toBe('info');
    expect(info.tone).not.toBe('purple');
    expect(info.tone).not.toBe('success');
  });

  it('StartingSoon and InProgress are distinct states (no contradiction)', () => {
    expect(getShiftStatusBadge('StartingSoon').labelKey).not.toBe(
      getShiftStatusBadge('InProgress').labelKey,
    );
  });

  it('calling getShiftStatusBadge twice for the same state is identical', () => {
    expect(getShiftStatusBadge('InProgress')).toEqual(
      getShiftStatusBadge('InProgress'),
    );
  });
});

// ---------------------------------------------------------------------------
// Part 6b — isActiveDashboardShift groups by the SAME clock as the badge
// (BUG B — supabase has no lifecycle sync so `status` lags the wall clock)
// ---------------------------------------------------------------------------

describe('CS10 Part 6b: isActiveDashboardShift matches the badge clock', () => {
  const shift = mkShift({ startTime: '18:05', endTime: '18:09' });

  it('keeps a genuinely upcoming shift in the active group', () => {
    // Before start → Published → active.
    expect(
      isActiveDashboardShift(shift, [], localIso('2030-06-02T17:30:00')),
    ).toBe(true);
  });

  it('keeps an in-progress shift in the active group', () => {
    expect(
      isActiveDashboardShift(shift, [], localIso('2030-06-02T18:06:00')),
    ).toBe(true);
  });

  it('DROPS an overdue Published shift nobody worked (badge = Expired)', () => {
    // Stored status still Published, but the clock is past end and no one
    // checked in → badge reads Expired → must NOT count as active.
    const now = localIso('2030-06-02T18:20:00');
    expect(getShiftLifecycleState(shift, [], now)).toBe('Expired');
    expect(isActiveDashboardShift(shift, [], now)).toBe(false);
  });

  it('keeps an overdue shift where a worker still needs check-out', () => {
    const checkedIn = mkApp({ status: 'CheckedIn', checkInAt: A_ISO });
    const now = localIso('2030-06-02T18:20:00');
    expect(getShiftLifecycleState(shift, [checkedIn], now)).toBe(
      'AwaitingCheckout',
    );
    expect(isActiveDashboardShift(shift, [checkedIn], now)).toBe(true);
  });

  it('keeps a checked-out shift awaiting employer confirmation', () => {
    const checkedOut = mkApp({ status: 'CheckedOut', checkOutAt: A_ISO });
    const now = localIso('2030-06-02T18:20:00');
    expect(getShiftLifecycleState(shift, [checkedOut], now)).toBe(
      'AwaitingEmployerConfirmation',
    );
    expect(isActiveDashboardShift(shift, [checkedOut], now)).toBe(true);
  });

  it('drops terminal DB states (Completed / Cancelled)', () => {
    const now = localIso('2030-06-02T18:06:00');
    expect(
      isActiveDashboardShift(mkShift({ status: 'Completed' }), [], now),
    ).toBe(false);
    expect(
      isActiveDashboardShift(mkShift({ status: 'Cancelled' }), [], now),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 7 — cross-role time-travel (18:05–18:09)
// ---------------------------------------------------------------------------

describe('CS10 Part 7: cross-role time-travel 18:05–18:09', () => {
  // Worker approved; employer marks present at 18:00; worker checks in
  // at 18:04. The lifecycle badge is computed from the SAME helper for
  // both worker and employer surfaces, so it agrees at every instant.
  const shift = mkShift({ startTime: '18:05', endTime: '18:09' });

  // Employer-marked-present at 18:00, then worker self-checks-in at 18:04.
  function appAt(nowIso: string): Application {
    const nowMs = new Date(nowIso).getTime();
    const markedAt = localIso('2030-06-02T18:00:00');
    const checkInAt = localIso('2030-06-02T18:04:00');
    const status =
      nowMs >= new Date(checkInAt).getTime() ? 'CheckedIn' : 'Approved';
    return mkApp({
      status,
      markedPresentAt: nowMs >= new Date(markedAt).getTime() ? markedAt : undefined,
      checkInAt: nowMs >= new Date(checkInAt).getTime() ? checkInAt : undefined,
    });
  }

  const probes: Array<{
    at: string;
    expectedState: ShiftLifecycleState;
    checkout: boolean;
  }> = [
    { at: '2030-06-02T18:00:00', expectedState: 'StartingSoon', checkout: false },
    { at: '2030-06-02T18:04:00', expectedState: 'StartingSoon', checkout: false },
    { at: '2030-06-02T18:05:00', expectedState: 'InProgress', checkout: false },
    { at: '2030-06-02T18:08:00', expectedState: 'InProgress', checkout: false },
    { at: '2030-06-02T18:09:00', expectedState: 'AwaitingCheckout', checkout: true },
    { at: '2030-06-02T18:10:00', expectedState: 'AwaitingCheckout', checkout: true },
  ];

  for (const p of probes) {
    it(`at ${p.at.slice(11, 16)} → ${p.expectedState}, checkout=${p.checkout}`, () => {
      const now = localIso(p.at);
      const app = appAt(now);

      // Both worker and employer surfaces render the SAME helper with the
      // SAME (shift, [app], now), so they cannot disagree.
      const workerState = getShiftLifecycleState(shift, [app], now);
      const employerState = getShiftLifecycleState(shift, [app], now);
      expect(workerState).toBe(p.expectedState);
      expect(employerState).toBe(workerState);

      // The badge label + tone is identical for both surfaces.
      expect(getShiftStatusBadge(workerState)).toEqual(
        getShiftStatusBadge(employerState),
      );

      // Checkout availability matches the rule (only after end + self check-in).
      expect(canCheckOut(now, app, shift)).toBe(p.checkout);
    });
  }

  it('at 18:04 the worker is checked-in (waiting), employer can still confirm present', () => {
    const now = localIso('2030-06-02T18:04:00');
    const app = appAt(now);
    expect(app.status).toBe('CheckedIn');
    // Worker attendance copy = worker-perspective waiting (early).
    const state = deriveAttendanceState(app, shift, now);
    // Worker self-checked-in + employer present before start → both confirmed.
    expect(['BothConfirmedPresent', 'WorkerCheckedInEarly']).toContain(state);
    // No checkout before end.
    expect(canCheckOut(now, app, shift)).toBe(false);
  });
});
