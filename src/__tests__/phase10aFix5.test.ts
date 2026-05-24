/**
 * Phase 10A-Fix-5 — live verification everywhere, latest-doc badge
 * semantics, and canonical shift availability.
 *
 * Pins down:
 *   - `getWorkerVerificationSummary.approvedMethods` returns every
 *     approved identity method, deduped by document type.
 *   - The Bình Lê regression — application submitted while only phone
 *     verified, then admin approves CCCD/student/driver later. The
 *     summary reflects all three approvals immediately.
 *   - `isShiftAvailableForRecruiting` rejects full / past / non-published
 *     / non-deposited shifts, AND reconciles `positionsFilled` against
 *     the live application store (so a stale field can't let a 3/3
 *     shift slip through to the featured surface).
 *   - `selectAvailableShiftsForRecruiting` skips a full first candidate
 *     and falls through to the next available one.
 */

import { describe, it, expect } from 'vitest';

import { getWorkerVerificationSummary } from '@/stores/verificationStore';
import {
  approvedOrConfirmedApplicationCount,
  effectiveFilledCount,
  isShiftAvailableForRecruiting,
  selectAvailableShiftsForRecruiting,
} from '@/domain/shiftAvailability';
import type {
  Application,
  Shift,
  Worker,
  WorkerVerificationDocument,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

function workerDoc(
  workerId: string,
  documentType: 'NationalId' | 'StudentCard' | 'DriverLicense',
  status: 'Pending' | 'Approved' | 'Rejected' | 'NeedsMoreInfo',
  reviewedAt = '2026-05-04T00:00:00.000Z',
  maskedIdentifier?: string,
): WorkerVerificationDocument {
  return {
    id: `wver-${workerId}-${documentType}-${status}-${reviewedAt}`,
    workerId,
    documentType,
    status,
    displayLabel: documentType,
    submittedAt: '2026-05-03T00:00:00.000Z',
    reviewedAt: status === 'Pending' ? undefined : reviewedAt,
    maskedIdentifier,
  };
}

const TOMORROW = (() => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
})();

const YESTERDAY = (() => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
})();

function makeShift(
  id: string,
  override: Partial<Shift> = {},
): Shift {
  const base: Shift = {
    id,
    employerId: 'employer-1',
    title: `Shift ${id}`,
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: TOMORROW,
    startTime: '10:00',
    endTime: '14:00',
    hourlyWage: 50_000,
    positionsTotal: 3,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 600_000,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
  return { ...base, ...override };
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
    appliedAt: '2026-05-02T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// approvedMethods + Bình Lê regression
// ---------------------------------------------------------------------------

describe('getWorkerVerificationSummary.approvedMethods — Phase 10A-Fix-5', () => {
  it('returns one entry per approved document type', () => {
    const worker = makeWorker('worker-binh');
    const docs = [
      workerDoc(
        worker.id,
        'NationalId',
        'Approved',
        '2026-05-04T00:00:00.000Z',
        '0791•••••456',
      ),
      workerDoc(worker.id, 'StudentCard', 'Approved'),
      workerDoc(worker.id, 'DriverLicense', 'Approved'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    const types = summary.approvedMethods.map((m) => m.type);
    expect(types).toEqual(
      expect.arrayContaining(['NationalId', 'StudentCard', 'DriverLicense']),
    );
    expect(summary.approvedMethods).toHaveLength(3);
  });

  it('dedupes by document type — only one chip per method even with multiple approved records', () => {
    const worker = makeWorker('w1');
    const docs = [
      workerDoc(worker.id, 'NationalId', 'Approved', '2026-05-04T00:00:00.000Z'),
      // Re-approval of the same doc type later.
      workerDoc(worker.id, 'NationalId', 'Approved', '2026-05-10T00:00:00.000Z'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.approvedMethods).toHaveLength(1);
    expect(summary.approvedMethods[0].type).toBe('NationalId');
  });

  it('Bình Lê regression — application submitted with only phone, then admin approves three identity methods', () => {
    const worker = makeWorker('worker-binh');

    // Time T0: application submitted; only phone is "verified" via the
    // legacy `worker.verifications` flag. No approved docs yet.
    let docs: WorkerVerificationDocument[] = [];
    let summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(false);
    expect(summary.approvedMethods).toHaveLength(0);

    // Time T1: admin approves CCCD, student card, and driver license.
    // Employer-facing summary should now show all three methods.
    docs = [
      workerDoc(worker.id, 'NationalId', 'Approved'),
      workerDoc(worker.id, 'StudentCard', 'Approved'),
      workerDoc(worker.id, 'DriverLicense', 'Approved'),
    ];
    summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(true);
    expect(summary.approvedMethods).toHaveLength(3);

    // Application record itself doesn't store any verification snapshot;
    // the selector is the only source of truth.
  });

  it('does not include Pending or Rejected docs in approvedMethods', () => {
    const worker = makeWorker('w1');
    const docs = [
      workerDoc(worker.id, 'NationalId', 'Pending'),
      workerDoc(worker.id, 'StudentCard', 'Rejected'),
      workerDoc(worker.id, 'DriverLicense', 'Approved'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.approvedMethods).toHaveLength(1);
    expect(summary.approvedMethods[0].type).toBe('DriverLicense');
  });
});

// ---------------------------------------------------------------------------
// Canonical shift availability
// ---------------------------------------------------------------------------

describe('isShiftAvailableForRecruiting — Phase 10A-Fix-5', () => {
  const NOW = Date.now();

  it('rejects shifts that are not Published', () => {
    const s = makeShift('s', { status: 'Cancelled' });
    expect(isShiftAvailableForRecruiting(s, [], NOW)).toBe(false);
  });

  it('rejects shifts whose escrow is not Deposited', () => {
    const s = makeShift('s', { escrowStatus: 'PendingDeposit' });
    expect(isShiftAvailableForRecruiting(s, [], NOW)).toBe(false);
  });

  it('rejects shifts whose start time has already passed', () => {
    const s = makeShift('s', {
      date: YESTERDAY,
      startTime: '08:00',
    });
    expect(isShiftAvailableForRecruiting(s, [], NOW)).toBe(false);
  });

  it('rejects 3/3 full shifts even when applications array is empty', () => {
    const s = makeShift('s', { positionsTotal: 3, positionsFilled: 3 });
    expect(isShiftAvailableForRecruiting(s, [], NOW)).toBe(false);
  });

  it('rejects shifts whose stale positionsFilled is 0 but live applications fill all slots', () => {
    const s = makeShift('s', { positionsTotal: 2, positionsFilled: 0 });
    const apps: Application[] = [
      makeApp(s.id, 'w1', 'Approved'),
      makeApp(s.id, 'w2', 'Confirmed'),
    ];
    // effectiveFilledCount = max(0, 2) = 2; positionsTotal = 2 → full.
    expect(effectiveFilledCount(s, apps)).toBe(2);
    expect(isShiftAvailableForRecruiting(s, apps, NOW)).toBe(false);
  });

  it('accepts shifts where one slot is free (positionsFilled stale, but live apps still under cap)', () => {
    const s = makeShift('s', { positionsTotal: 3, positionsFilled: 0 });
    const apps: Application[] = [
      makeApp(s.id, 'w1', 'Approved'),
      makeApp(s.id, 'w2', 'CheckedIn'),
      // pending app does NOT count toward occupancy.
      makeApp(s.id, 'w3', 'Pending'),
    ];
    expect(effectiveFilledCount(s, apps)).toBe(2);
    expect(isShiftAvailableForRecruiting(s, apps, NOW)).toBe(true);
  });

  it('counts CancellationRequested as still occupying — seat not released until the cancel is approved', () => {
    const s = makeShift('s', { positionsTotal: 2, positionsFilled: 0 });
    const apps: Application[] = [
      makeApp(s.id, 'w1', 'Approved'),
      makeApp(s.id, 'w2', 'CancellationRequested'),
    ];
    expect(approvedOrConfirmedApplicationCount(s.id, apps)).toBe(2);
    expect(isShiftAvailableForRecruiting(s, apps, NOW)).toBe(false);
  });
});

describe('selectAvailableShiftsForRecruiting — Phase 10A-Fix-5', () => {
  const NOW = Date.now();

  it('returns shifts sorted by soonest start time', () => {
    const a = makeShift('a', { date: TOMORROW, startTime: '15:00' });
    const b = makeShift('b', { date: TOMORROW, startTime: '08:00' });
    const result = selectAvailableShiftsForRecruiting([a, b], [], NOW);
    expect(result.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('falls through to the next eligible shift when the top candidate is full', () => {
    const full = makeShift('full', {
      positionsTotal: 3,
      positionsFilled: 3,
      date: TOMORROW,
      startTime: '08:00',
    });
    const open = makeShift('open', {
      positionsTotal: 2,
      positionsFilled: 0,
      date: TOMORROW,
      startTime: '12:00',
    });
    const result = selectAvailableShiftsForRecruiting([full, open], [], NOW);
    expect(result.map((s) => s.id)).toEqual(['open']);
  });

  it('returns an empty array when no shifts are eligible', () => {
    const past = makeShift('past', {
      date: YESTERDAY,
      startTime: '08:00',
    });
    const full = makeShift('full', {
      positionsTotal: 3,
      positionsFilled: 3,
    });
    const result = selectAvailableShiftsForRecruiting([past, full], [], NOW);
    expect(result).toEqual([]);
  });
});
