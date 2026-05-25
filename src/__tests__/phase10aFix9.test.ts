/**
 * Phase 10A-Fix-9 — applicant-action lock-after-start + skill-score
 * foundation.
 *
 * Pins down:
 *   - `applicationStore.approve` returns the new
 *     `'SHIFT_ALREADY_STARTED'` error code when the shift's start
 *     datetime has passed OR the shift is in a terminal/in-flight
 *     status. No state change happens.
 *   - `confirmCompletion` updates the worker's `skillScores` for the
 *     shift's `jobType` using the `applyRatingToSkillScores` formula
 *     (first rating writes `stars * 20`; later ratings use the
 *     0.7 / 0.3 weighted average).
 *   - `jobCategoryRiskLevel` returns the spec's risk classifications
 *     for the canonical job type strings.
 *   - `skillBadgeForScore` and `skillBadgeLabel` map scores to the
 *     `Mới` / `Khá` / `Tốt` / `Nổi bật` ladder.
 *   - Reputation and skill score are independent — a confirm event
 *     bumps both, but they are stored separately on the worker.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  applyRatingToSkillScores,
  getSkillScoreForCategory,
  jobCategoryRiskLevel,
  ratingToSkillScore,
  skillBadgeForScore,
  skillBadgeLabel,
} from '@/domain/skillScore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Application,
  Employer,
  Shift,
  Worker,
} from '@/types';

// ---------------------------------------------------------------------------
// Risk-level classification
// ---------------------------------------------------------------------------

describe('jobCategoryRiskLevel — Phase 10A-Fix-9', () => {
  it('classifies low-risk types', () => {
    expect(jobCategoryRiskLevel('Phát tờ rơi')).toBe('Low');
    expect(jobCategoryRiskLevel('Hỗ trợ sự kiện')).toBe('Low');
  });
  it('classifies medium-risk types', () => {
    expect(jobCategoryRiskLevel('Phục vụ')).toBe('Medium');
    expect(jobCategoryRiskLevel('Pha chế')).toBe('Medium');
    expect(jobCategoryRiskLevel('Kho vận')).toBe('Medium');
  });
  it('classifies high-risk types', () => {
    expect(jobCategoryRiskLevel('Thu ngân')).toBe('High');
    expect(jobCategoryRiskLevel('Bảo vệ')).toBe('High');
  });
  it('returns Medium for unknown types as a conservative default', () => {
    expect(jobCategoryRiskLevel('Random new category')).toBe('Medium');
  });
});

// ---------------------------------------------------------------------------
// Skill-score helpers
// ---------------------------------------------------------------------------

describe('ratingToSkillScore — Phase 10A-Fix-9', () => {
  it('maps 1-5 stars to 20-100', () => {
    expect(ratingToSkillScore(1)).toBe(20);
    expect(ratingToSkillScore(5)).toBe(100);
  });
  it('clamps out-of-range input', () => {
    expect(ratingToSkillScore(0)).toBe(20);
    expect(ratingToSkillScore(7)).toBe(100);
  });
});

describe('applyRatingToSkillScores — Phase 10A-Fix-9', () => {
  const NOW = '2026-06-01T08:00:00.000Z';

  it('first rating writes stars * 20 and completedCount = 1', () => {
    const result = applyRatingToSkillScores(undefined, 'Phục vụ', 5, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: 'Phục vụ',
      score: 100,
      completedCount: 1,
      lastRating: 5,
      lastUpdatedAt: NOW,
    });
  });

  it('later ratings use the 0.7 / 0.3 weighted average', () => {
    // Existing entry at score 100, completedCount 1.
    const seed = applyRatingToSkillScores(undefined, 'Phục vụ', 5, NOW);
    // New rating: 3 stars → 60.
    const next = applyRatingToSkillScores(seed, 'Phục vụ', 3, NOW);
    // Expected: round(0.7 * 100 + 0.3 * 60) = round(88) = 88
    expect(next[0].score).toBe(88);
    expect(next[0].completedCount).toBe(2);
  });

  it('different categories accumulate independently', () => {
    const a = applyRatingToSkillScores(undefined, 'Phục vụ', 4, NOW);
    const b = applyRatingToSkillScores(a, 'Pha chế', 5, NOW);
    expect(b).toHaveLength(2);
    expect(getSkillScoreForCategory(b, 'Phục vụ')?.score).toBe(80);
    expect(getSkillScoreForCategory(b, 'Pha chế')?.score).toBe(100);
  });

  it('clamps score to [0, 100]', () => {
    const seed = applyRatingToSkillScores(undefined, 'X', 5, NOW);
    const sky = applyRatingToSkillScores(seed, 'X', 5, NOW);
    expect(sky[0].score).toBeLessThanOrEqual(100);
    expect(sky[0].score).toBeGreaterThanOrEqual(0);
  });
});

describe('skillBadgeForScore / skillBadgeLabel — Phase 10A-Fix-9', () => {
  it('returns "New" / "Mới" when there is no entry or no completed shifts', () => {
    expect(skillBadgeForScore(undefined)).toBe('New');
    expect(skillBadgeLabel(undefined)).toBe('Mới');
  });
  it('returns Decent / Khá for low-but-rated scores', () => {
    expect(
      skillBadgeLabel({
        category: 'X',
        score: 40,
        completedCount: 1,
        lastUpdatedAt: '',
      }),
    ).toBe('Khá');
  });
  it('returns Good / Tốt for the 60-84 band', () => {
    expect(
      skillBadgeLabel({
        category: 'X',
        score: 75,
        completedCount: 2,
        lastUpdatedAt: '',
      }),
    ).toBe('Tốt');
  });
  it('returns Standout / Nổi bật for 85+', () => {
    expect(
      skillBadgeLabel({
        category: 'X',
        score: 92,
        completedCount: 3,
        lastUpdatedAt: '',
      }),
    ).toBe('Nổi bật');
  });
});

// ---------------------------------------------------------------------------
// applicationStore.approve — shift-already-started gate
// ---------------------------------------------------------------------------

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
  // Default: 2 days in the future so approve()'s start-time gate
  // accepts it. Override `date`/`startTime` to land in the past.
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

describe('applicationStore.approve — Phase 10A-Fix-9 lock-after-start', () => {
  beforeEach(resetStores);

  it('returns SHIFT_ALREADY_STARTED when the shift start datetime is in the past', () => {
    // Build a shift that started yesterday at noon local time.
    const past = localDateTimeFromOffset(-1 * 24 * 60 * 60 * 1000);
    const shift = makeShift({
      date: past.date,
      startTime: past.startTime,
      // status still Published because the lifecycle sync hasn't run.
      status: 'Published',
    });
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({ users: [makeEmployer(), makeWorker('w1')] });
    const pending = makeApp(shift.id, 'w1', 'Pending');
    useApplicationStore.setState({
      applications: [pending],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore.getState().approve(pending.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('SHIFT_ALREADY_STARTED');

    // Phase 10A-Fix-10: approve() now also expires the application
    // inline so callers don't leave a stale Pending record. Status
    // flips to 'Expired' rather than staying 'Pending'.
    const after = useApplicationStore
      .getState()
      .applications.find((a) => a.id === pending.id);
    expect(after?.status).toBe('Expired');
  });

  it.each<['InProgress' | 'AwaitingConfirmation' | 'Completed' | 'Cancelled' | 'Expired']>([
    ['InProgress'],
    ['AwaitingConfirmation'],
    ['Completed'],
    ['Cancelled'],
    ['Expired'],
  ])('returns SHIFT_ALREADY_STARTED when shift is %s even if datetime hasn\'t passed', (status) => {
    const shift = makeShift({ status });
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({ users: [makeEmployer(), makeWorker('w1')] });
    const pending = makeApp(shift.id, 'w1', 'Pending');
    useApplicationStore.setState({
      applications: [pending],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore.getState().approve(pending.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('SHIFT_ALREADY_STARTED');
  });

  it('still allows approval before the shift starts', () => {
    const shift = makeShift();
    useShiftStore.setState({ shifts: [shift] });
    useUserStore.setState({ users: [makeEmployer(), makeWorker('w1')] });
    const pending = makeApp(shift.id, 'w1', 'Pending');
    useApplicationStore.setState({
      applications: [pending],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore.getState().approve(pending.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Approved');
  });
});

// ---------------------------------------------------------------------------
// confirmCompletion writes a skillScore entry
// ---------------------------------------------------------------------------

describe('confirmCompletion — Phase 10A-Fix-9 skill-score side effect', () => {
  beforeEach(resetStores);

  it('writes a fresh WorkerSkillScore for the shift\'s jobType on first confirmation', () => {
    const shift = makeShift({
      jobType: 'Phục vụ',
      status: 'AwaitingConfirmation',
    });
    useShiftStore.setState({ shifts: [shift] });
    const worker = makeWorker('w1');
    useUserStore.setState({ users: [makeEmployer(), worker] });
    const app: Application = {
      ...makeApp(shift.id, 'w1', 'CheckedOut'),
      checkOutAt: NOW_ISO,
    };
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    const r = useApplicationStore
      .getState()
      .confirmCompletion(app.id, { stars: 5 });
    expect(r.ok).toBe(true);

    const updated = useUserStore.getState().findById('w1') as Worker;
    const entry = (updated.skillScores ?? []).find(
      (s) => s.category === 'Phục vụ',
    );
    expect(entry).toBeDefined();
    expect(entry!.score).toBe(100);
    expect(entry!.completedCount).toBe(1);
    expect(entry!.lastRating).toBe(5);

    // Reputation also bumped (independent of skill score).
    expect(updated.reputationScore).toBeGreaterThan(80);
  });

  it('updates an existing skill score entry rather than appending duplicate', () => {
    const shift = makeShift({
      jobType: 'Phục vụ',
      status: 'AwaitingConfirmation',
    });
    useShiftStore.setState({ shifts: [shift] });
    // Worker already has a 100-score entry from a prior confirmed shift.
    const worker = makeWorker('w1', {
      skillScores: [
        {
          category: 'Phục vụ',
          score: 100,
          completedCount: 1,
          lastRating: 5,
          lastUpdatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    });
    useUserStore.setState({ users: [makeEmployer(), worker] });
    const app: Application = {
      ...makeApp(shift.id, 'w1', 'CheckedOut'),
      checkOutAt: NOW_ISO,
    };
    useApplicationStore.setState({
      applications: [app],
      ratings: [],
      disputes: [],
    });

    useApplicationStore
      .getState()
      .confirmCompletion(app.id, { stars: 3 });

    const updated = useUserStore.getState().findById('w1') as Worker;
    const entries = (updated.skillScores ?? []).filter(
      (s) => s.category === 'Phục vụ',
    );
    expect(entries).toHaveLength(1); // updated, not duplicated
    // Weighted average: round(0.7 * 100 + 0.3 * 60) = 88.
    expect(entries[0].score).toBe(88);
    expect(entries[0].completedCount).toBe(2);
  });
});
