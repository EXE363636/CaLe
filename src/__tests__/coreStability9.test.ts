/**
 * CORE-STABILITY-9 — unit guards for:
 *   Part 1/3: role-aware attendance copy + attendance state machine
 *   Part 2:   checkout timing lock (opens at shift END, not start)
 *   Part 4:   worker skill progression (XP / level MVP)
 *   Part 5:   availability blocks + availability-based job suggestions
 *
 * Deterministic domain tests; no React, no timers. "now" instants for
 * the time-gate tests are built from the SAME local-time frame the
 * gates use to parse `(date, startTime)` so the assertions are
 * timezone-stable across CI runners.
 */

import { describe, it, expect } from 'vitest';

import {
  deriveAttendanceState,
  attendanceCopyKey,
  type AttendanceState,
} from '@/domain/attendanceState';
import { canCheckOut, isLateCheckout } from '@/domain/timeGates';
import {
  levelForXp,
  skillProgress,
  xpForCompletion,
  awardSkillXp,
  buildSkillDisplayList,
  DEFAULT_SKILL_CATEGORIES,
  MAX_LEVEL,
} from '@/domain/skillProgression';
import {
  fitsInsideAvailability,
  scoreShiftForWorker,
  suggestShiftsForWorker,
  matchLabel,
} from '@/domain/availabilityMatch';
import { hasScheduleConflict } from '@/domain/scheduleConflict';
import { useScheduleStore } from '@/stores/scheduleStore';
import type {
  Application,
  ScheduleBlock,
  Shift,
  Worker,
  WorkerSkillScore,
} from '@/types';

const A_ISO = '2030-06-02T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkShift(over: Partial<Shift> = {}): Shift {
  return {
    id: 's-cs9',
    employerId: 'emp-1',
    title: 'Phục vụ',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    date: '2030-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 2,
    positionsFilled: 0,
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
    id: 'app-cs9',
    shiftId: 's-cs9',
    workerId: 'w-cs9',
    status: 'Approved',
    appliedAt: A_ISO,
    approvedAt: A_ISO,
    ...over,
  };
}

function mkWorker(over: Partial<Worker> = {}): Worker {
  return {
    id: 'w-cs9',
    role: 'worker',
    email: 'w@x.vn',
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: A_ISO,
    fullName: 'Worker CS9',
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

function mkBlock(over: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    id: `sched-${Math.random().toString(36).slice(2)}`,
    userId: 'w-cs9',
    title: 'Khung giờ',
    date: '2030-06-02',
    startTime: '07:00',
    endTime: '13:00',
    kind: 'available',
    createdAt: A_ISO,
    updatedAt: A_ISO,
    ...over,
  };
}

/** Build an ISO instant `offsetMin` minutes from a local wall clock. */
function localIso(dateTime: string, offsetMin = 0): string {
  return new Date(new Date(dateTime).getTime() + offsetMin * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Part 1 / 3 — attendance state machine + role-aware copy
// ---------------------------------------------------------------------------

describe('CS9 Part 1/3: attendance state machine', () => {
  const shift = mkShift({ date: '2030-06-02', startTime: '08:00', endTime: '12:00' });
  const beforeStart = localIso('2030-06-02T07:00:00'); // 1h before start
  const midShift = localIso('2030-06-02T10:00:00');
  const afterEnd = localIso('2030-06-02T12:30:00');

  it('Approved + nothing → ApprovedNotStarted', () => {
    expect(deriveAttendanceState(mkApp({ status: 'Approved' }), shift, beforeStart)).toBe(
      'ApprovedNotStarted',
    );
  });

  it('Approved + employer marked present → EmployerMarkedPresentOnly', () => {
    const app = mkApp({ status: 'Approved', markedPresentAt: beforeStart });
    expect(deriveAttendanceState(app, shift, beforeStart)).toBe(
      'EmployerMarkedPresentOnly',
    );
  });

  it('CheckedIn (worker self) before start → WorkerCheckedInEarly', () => {
    const app = mkApp({ status: 'CheckedIn', checkInAt: beforeStart });
    expect(deriveAttendanceState(app, shift, beforeStart)).toBe(
      'WorkerCheckedInEarly',
    );
  });

  it('CheckedIn (worker self) mid-shift → WorkerCheckedInInProgress', () => {
    const app = mkApp({ status: 'CheckedIn', checkInAt: midShift });
    expect(deriveAttendanceState(app, shift, midShift)).toBe(
      'WorkerCheckedInInProgress',
    );
  });

  it('CheckedIn with employer-only (no self) → EmployerMarkedPresentOnly', () => {
    const app = mkApp({ status: 'CheckedIn', markedPresentAt: midShift });
    expect(deriveAttendanceState(app, shift, midShift)).toBe(
      'EmployerMarkedPresentOnly',
    );
  });

  it('CheckedIn with BOTH stamps mid-shift → BothConfirmedPresent', () => {
    const app = mkApp({
      status: 'CheckedIn',
      checkInAt: midShift,
      markedPresentAt: midShift,
    });
    expect(deriveAttendanceState(app, shift, midShift)).toBe(
      'BothConfirmedPresent',
    );
  });

  it('CheckedIn (self) after end → AwaitingCheckout', () => {
    const app = mkApp({ status: 'CheckedIn', checkInAt: midShift });
    expect(deriveAttendanceState(app, shift, afterEnd)).toBe('AwaitingCheckout');
  });

  it('terminal statuses map to their states', () => {
    expect(deriveAttendanceState(mkApp({ status: 'CheckedOut' }), shift, afterEnd)).toBe(
      'AwaitingEmployerConfirmation',
    );
    expect(deriveAttendanceState(mkApp({ status: 'Confirmed' }), shift, afterEnd)).toBe(
      'Completed',
    );
    expect(deriveAttendanceState(mkApp({ status: 'Disputed' }), shift, afterEnd)).toBe(
      'Disputed',
    );
    expect(deriveAttendanceState(mkApp({ status: 'NoShow' }), shift, afterEnd)).toBe(
      'NoShow',
    );
  });
});

describe('CS9 Part 1: role-aware copy keys (never cross-perspective)', () => {
  const bannerStates: AttendanceState[] = [
    'WorkerCheckedInEarly',
    'WorkerCheckedInInProgress',
    'EmployerMarkedPresentOnly',
    'BothConfirmedPresent',
    'AwaitingCheckout',
  ];

  it('returns a role-scoped key for banner states', () => {
    for (const s of bannerStates) {
      expect(attendanceCopyKey(s, 'worker')).toBe(`attendance.copy.worker.${s}`);
      expect(attendanceCopyKey(s, 'employer')).toBe(`attendance.copy.employer.${s}`);
      expect(attendanceCopyKey(s, 'admin')).toBe(`attendance.copy.admin.${s}`);
    }
  });

  it('worker and employer keys are distinct (no shared text)', () => {
    for (const s of bannerStates) {
      expect(attendanceCopyKey(s, 'worker')).not.toBe(
        attendanceCopyKey(s, 'employer'),
      );
    }
  });

  it('non-banner states return undefined (no banner)', () => {
    expect(attendanceCopyKey('ApprovedNotStarted', 'worker')).toBeUndefined();
    expect(attendanceCopyKey('Completed', 'employer')).toBeUndefined();
    expect(attendanceCopyKey('NoShow', 'admin')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Part 2 — checkout timing lock (opens at END, not start)
// ---------------------------------------------------------------------------

describe('CS9 Part 2: checkout opens at shift END, not start', () => {
  // Short shift 15:55–16:00 to exercise the boundary precisely.
  const shift = mkShift({
    date: '2030-06-02',
    startTime: '15:55',
    endTime: '16:00',
  });
  const app = mkApp({
    status: 'CheckedIn',
    checkInAt: localIso('2030-06-02T15:55:00'),
  });

  it('hidden at 15:50 (before start)', () => {
    expect(canCheckOut(localIso('2030-06-02T15:50:00'), app, shift)).toBe(false);
  });

  it('hidden at 15:55 (at start, mid-shift)', () => {
    expect(canCheckOut(localIso('2030-06-02T15:55:00'), app, shift)).toBe(false);
  });

  it('hidden at 15:59 (still mid-shift)', () => {
    expect(canCheckOut(localIso('2030-06-02T15:59:00'), app, shift)).toBe(false);
  });

  it('visible at 16:00 (exactly end)', () => {
    expect(canCheckOut(localIso('2030-06-02T16:00:00'), app, shift)).toBe(true);
  });

  it('visible at 16:01 (just after end)', () => {
    expect(canCheckOut(localIso('2030-06-02T16:01:00'), app, shift)).toBe(true);
  });

  it('remains visible after grace and is labelled as late checkout', () => {
    const afterGrace = localIso('2030-06-02T17:01:00');
    expect(canCheckOut(afterGrace, app, shift)).toBe(true);
    expect(isLateCheckout(afterGrace, shift)).toBe(true);
    expect(isLateCheckout(localIso('2030-06-02T17:00:00'), shift)).toBe(false);
  });

  it('employer mark-present alone (no self check-in) never unlocks checkout', () => {
    const employerOnly = mkApp({
      status: 'CheckedIn',
      markedPresentAt: localIso('2030-06-02T15:55:00'),
    });
    expect(canCheckOut(localIso('2030-06-02T16:00:00'), employerOnly, shift)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Part 4 — skill XP / level progression
// ---------------------------------------------------------------------------

describe('CS9 Part 4: skill XP and levels', () => {
  it('levelForXp maps thresholds correctly', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(119)).toBe(2);
    expect(levelForXp(120)).toBe(3);
    expect(levelForXp(249)).toBe(3);
    expect(levelForXp(250)).toBe(4);
    expect(levelForXp(499)).toBe(4);
    expect(levelForXp(500)).toBe(5);
    expect(levelForXp(99_999)).toBe(MAX_LEVEL);
  });

  it('negative / NaN XP clamps to level 1', () => {
    expect(levelForXp(-10)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
  });

  it('xpForCompletion: completed + 5★ + no-dispute = 17', () => {
    expect(xpForCompletion(5, false)).toBe(17); // 10 + 5 + 2
  });

  it('xpForCompletion: completed + 4★ + no-dispute = 15', () => {
    expect(xpForCompletion(4, false)).toBe(15); // 10 + 3 + 2
  });

  it('xpForCompletion: completed + 3★ + no-dispute = 12', () => {
    expect(xpForCompletion(3, false)).toBe(12); // 10 + 0 + 2
  });

  it('xpForCompletion: disputed earns 0 regardless of stars', () => {
    expect(xpForCompletion(5, true)).toBe(0);
    expect(xpForCompletion(undefined, true)).toBe(0);
  });

  it('skillProgress reports fraction within current level', () => {
    const p = skillProgress(60); // level 2, floor 50, next 120 → 10/70
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(10);
    expect(p.levelSpan).toBe(70);
    expect(p.fraction).toBeCloseTo(10 / 70, 5);
  });

  it('skillProgress at max level reports fraction 1, null span', () => {
    const p = skillProgress(600);
    expect(p.level).toBe(5);
    expect(p.levelSpan).toBeNull();
    expect(p.fraction).toBe(1);
  });

  it('awardSkillXp creates a new category entry when missing', () => {
    const next = awardSkillXp(undefined, 'Phục vụ', 5, false, A_ISO);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ category: 'Phục vụ', xp: 17, completedCount: 0 });
  });

  it('awardSkillXp accumulates XP on an existing entry without mutating input', () => {
    const start: WorkerSkillScore[] = [
      { category: 'Phục vụ', score: 80, completedCount: 3, xp: 40, lastUpdatedAt: A_ISO },
    ];
    const next = awardSkillXp(start, 'Phục vụ', 4, false, A_ISO);
    expect(next[0].xp).toBe(55); // 40 + 15
    // input untouched
    expect(start[0].xp).toBe(40);
  });

  it('awardSkillXp on a disputed shift adds 0 XP', () => {
    const start: WorkerSkillScore[] = [
      { category: 'Kho vận', score: 70, completedCount: 2, xp: 100, lastUpdatedAt: A_ISO },
    ];
    const next = awardSkillXp(start, 'Kho vận', 5, true, A_ISO);
    expect(next[0].xp).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// PRODUCT-UX-FIX-BACKEND-PREP-1 Part 2 — skill display list (defaults)
// ---------------------------------------------------------------------------

describe('PUX Part 2: buildSkillDisplayList', () => {
  it('returns all default casual-job categories for a worker with no scores', () => {
    const list = buildSkillDisplayList(undefined);
    expect(list).toHaveLength(DEFAULT_SKILL_CATEGORIES.length);
    expect(list.map((s) => s.category)).toEqual([...DEFAULT_SKILL_CATEGORIES]);
    // All placeholders are Level 1 / 0 XP / 0 completed.
    for (const entry of list) {
      expect(entry.xp).toBe(0);
      expect(entry.completedCount).toBe(0);
    }
  });

  it('default categories are casual jobs, never programming languages', () => {
    const cats = DEFAULT_SKILL_CATEGORIES.map((c) => c.toLowerCase());
    for (const banned of ['java', 'python', 'c++', 'javascript']) {
      expect(cats).not.toContain(banned);
    }
    expect(DEFAULT_SKILL_CATEGORIES).toContain('Phục vụ');
    expect(DEFAULT_SKILL_CATEGORIES).toContain('Pha chế');
  });

  it('real scores sort first (by XP desc), then default placeholders fill the rest', () => {
    const scores: WorkerSkillScore[] = [
      { category: 'Pha chế', score: 80, completedCount: 4, xp: 60, lastUpdatedAt: A_ISO },
      { category: 'Phục vụ', score: 90, completedCount: 6, xp: 130, lastUpdatedAt: A_ISO },
    ];
    const list = buildSkillDisplayList(scores);
    // Highest-XP real score first.
    expect(list[0].category).toBe('Phục vụ');
    expect(list[1].category).toBe('Pha chế');
    // Real categories are not duplicated by placeholders.
    const phucVu = list.filter((s) => s.category === 'Phục vụ');
    expect(phucVu).toHaveLength(1);
    // Remaining default categories appear after the real ones.
    expect(list.length).toBeGreaterThan(2);
  });

  it('does not mutate the input array', () => {
    const scores: WorkerSkillScore[] = [
      { category: 'Phục vụ', score: 90, completedCount: 6, xp: 130, lastUpdatedAt: A_ISO },
    ];
    const snapshot = JSON.stringify(scores);
    buildSkillDisplayList(scores);
    expect(JSON.stringify(scores)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Part 5 — availability blocks + job suggestions
// ---------------------------------------------------------------------------

describe('CS9 Part 5: availability matching', () => {
  it('fitsInsideAvailability: shift inside an available block', () => {
    const shift = mkShift({ date: '2030-06-02', startTime: '08:00', endTime: '12:00' });
    const blocks = [mkBlock({ kind: 'available', startTime: '07:00', endTime: '13:00' })];
    expect(fitsInsideAvailability(shift, blocks)).toBe(true);
  });

  it('fitsInsideAvailability: shift partially outside → false', () => {
    const shift = mkShift({ startTime: '08:00', endTime: '14:00' });
    const blocks = [mkBlock({ kind: 'available', startTime: '07:00', endTime: '13:00' })];
    expect(fitsInsideAvailability(shift, blocks)).toBe(false);
  });

  it('fitsInsideAvailability: busy blocks never count as availability', () => {
    const shift = mkShift({ startTime: '08:00', endTime: '12:00' });
    const blocks = [mkBlock({ kind: 'busy', startTime: '07:00', endTime: '13:00' })];
    expect(fitsInsideAvailability(shift, blocks)).toBe(false);
  });

  it('matchLabel thresholds', () => {
    expect(matchLabel(80)).toBe('Rất phù hợp');
    expect(matchLabel(75)).toBe('Rất phù hợp');
    expect(matchLabel(60)).toBe('Phù hợp');
    expect(matchLabel(50)).toBe('Phù hợp');
    expect(matchLabel(30)).toBe('Cần cân nhắc');
  });

  it('scoreShiftForWorker excludes a shift overlapping a BUSY block', () => {
    const shift = mkShift({ startTime: '08:00', endTime: '12:00' });
    const worker = mkWorker();
    const blocks = [mkBlock({ kind: 'busy', startTime: '09:00', endTime: '10:00' })];
    expect(scoreShiftForWorker(shift, worker, blocks, [])).toBeNull();
  });

  it('scoreShiftForWorker excludes a shift overlapping an approved job', () => {
    const shift = mkShift({ startTime: '08:00', endTime: '12:00' });
    const worker = mkWorker();
    const approved = [{ date: '2030-06-02', startTime: '11:00', endTime: '13:00' }];
    expect(scoreShiftForWorker(shift, worker, [], approved)).toBeNull();
  });

  it('a fully-fitting, on-skill, preferred-location shift scores high', () => {
    const shift = mkShift({
      jobType: 'Phục vụ',
      location: 'Quận 1, TP.HCM',
      hourlyWage: 100_000,
    });
    const worker = mkWorker({
      skills: ['Phục vụ'],
      preferredLocations: ['Quận 1'],
      skillScores: [
        { category: 'Phục vụ', score: 90, completedCount: 5, xp: 120, lastUpdatedAt: A_ISO },
      ],
    });
    const blocks = [mkBlock({ kind: 'available', startTime: '07:00', endTime: '13:00' })];
    const m = scoreShiftForWorker(shift, worker, blocks, []);
    expect(m).not.toBeNull();
    // time 40 + location 25 + skill 25 + wage 10 = 100.
    expect(m!.score).toBe(100);
    expect(m!.fitsAvailability).toBe(true);
    expect(m!.label).toBe('Rất phù hợp');
  });

  it('suggestShiftsForWorker ranks higher-scoring shifts first', () => {
    const worker = mkWorker({
      skills: ['Phục vụ'],
      preferredLocations: ['Quận 1'],
    });
    const blocks = [mkBlock({ kind: 'available', startTime: '07:00', endTime: '23:00' })];
    const good = mkShift({
      id: 's-good',
      jobType: 'Phục vụ',
      location: 'Quận 1, TP.HCM',
      hourlyWage: 100_000,
      startTime: '08:00',
      endTime: '12:00',
    });
    const weak = mkShift({
      id: 's-weak',
      jobType: 'Bảo vệ',
      location: 'Quận 9, TP.HCM',
      hourlyWage: 30_000,
      startTime: '14:00',
      endTime: '18:00',
    });
    const ranked = suggestShiftsForWorker(
      [weak, good],
      worker,
      blocks,
      [],
      new Map(),
    );
    expect(ranked.map((m) => m.shift.id)).toEqual(['s-good', 's-weak']);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('suggestShiftsForWorker drops conflicting shifts entirely', () => {
    const worker = mkWorker();
    const blocks = [mkBlock({ kind: 'busy', startTime: '08:00', endTime: '12:00' })];
    const conflicting = mkShift({ id: 's-busy', startTime: '09:00', endTime: '11:00' });
    const ranked = suggestShiftsForWorker(
      [conflicting],
      worker,
      blocks,
      [],
      new Map(),
    );
    expect(ranked).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PRODUCT-UX-FIX-BACKEND-PREP-1 Part 1 — scheduleStore add busy/available
// ---------------------------------------------------------------------------

describe('PUX Part 1: scheduleStore.add busy/available', () => {
  it('adds an AVAILABLE block (does not gate applications)', () => {
    useScheduleStore.setState({ blocks: [] });
    const r = useScheduleStore.getState().add({
      userId: 'w-cs9',
      title: 'Rảnh chiều',
      date: '2030-06-02',
      startTime: '14:00',
      endTime: '18:00',
      kind: 'available',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe('available');
    const blocks = useScheduleStore.getState().forUser('w-cs9');
    expect(blocks).toHaveLength(1);
    // Availability blocks must NOT count as a schedule conflict.
    expect(
      hasScheduleConflict(
        { date: '2030-06-02', startTime: '15:00', endTime: '16:00' },
        blocks,
      ),
    ).toBe(false);
  });

  it('adds a BUSY block (gates a conflicting application)', () => {
    useScheduleStore.setState({ blocks: [] });
    const r = useScheduleStore.getState().add({
      userId: 'w-cs9',
      title: 'Giờ học sáng',
      date: '2030-06-02',
      startTime: '08:00',
      endTime: '11:00',
      kind: 'busy',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe('busy');
    const blocks = useScheduleStore.getState().forUser('w-cs9');
    expect(
      hasScheduleConflict(
        { date: '2030-06-02', startTime: '09:00', endTime: '10:00' },
        blocks,
      ),
    ).toBe(true);
  });

  it('defaults to busy when kind is omitted (back-compat)', () => {
    useScheduleStore.setState({ blocks: [] });
    const r = useScheduleStore.getState().add({
      userId: 'w-cs9',
      title: 'Việc cá nhân',
      date: '2030-06-02',
      startTime: '08:00',
      endTime: '09:00',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe('busy');
  });

  it('job suggestion uses an available block, not a busy block', () => {
    const worker = mkWorker({ skills: ['Phục vụ'], preferredLocations: ['Quận 1'] });
    const shift = mkShift({
      id: 's-fit',
      jobType: 'Phục vụ',
      location: 'Quận 1, TP.HCM',
      startTime: '08:00',
      endTime: '12:00',
      hourlyWage: 80_000,
    });
    // With an AVAILABLE block covering the shift → fits + ranked.
    const availBlocks = [
      mkBlock({ kind: 'available', startTime: '07:00', endTime: '13:00' }),
    ];
    const rankedAvail = suggestShiftsForWorker(
      [shift],
      worker,
      availBlocks,
      [],
      new Map(),
    );
    expect(rankedAvail).toHaveLength(1);
    expect(rankedAvail[0].fitsAvailability).toBe(true);

    // With a BUSY block over the same window → excluded entirely.
    const busyBlocks = [
      mkBlock({ kind: 'busy', startTime: '07:00', endTime: '13:00' }),
    ];
    const rankedBusy = suggestShiftsForWorker(
      [shift],
      worker,
      busyBlocks,
      [],
      new Map(),
    );
    expect(rankedBusy).toHaveLength(0);
  });
});
