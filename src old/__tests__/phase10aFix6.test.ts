/**
 * Phase 10A-Fix-6 — public-summary priority rules + featured slot
 * label + canonical full-shift exclusion.
 *
 * Pins down:
 *   - When a worker has at least one approved identity doc, the public
 *     summary reports `identityVerified: true` even if newer pending
 *     resubmissions exist.
 *   - Pending count counts only document types that are not already
 *     approved.
 *   - The Bình Lê screenshot regression: 3 approved + 0 truly pending
 *     → identityVerified true, pendingCount 0, three approved methods.
 *   - Featured slot label uses available count, not filled count.
 */

import { describe, it, expect } from 'vitest';

import { getWorkerVerificationSummary } from '@/stores/verificationStore';
import {
  effectiveFilledCount,
  isShiftAvailableForRecruiting,
} from '@/domain/shiftAvailability';
import type {
  Application,
  Shift,
  Worker,
  WorkerVerificationDocument,
} from '@/types';

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

function doc(
  workerId: string,
  documentType: 'NationalId' | 'StudentCard' | 'DriverLicense',
  status: 'Pending' | 'Approved' | 'Rejected' | 'NeedsMoreInfo',
  submittedAt: string,
): WorkerVerificationDocument {
  return {
    id: `wver-${workerId}-${documentType}-${status}-${submittedAt}`,
    workerId,
    documentType,
    status,
    displayLabel: documentType,
    submittedAt,
    reviewedAt:
      status === 'Pending' ? undefined : '2026-05-04T00:00:00.000Z',
  };
}

const TOMORROW = (() => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
// Public summary priority rules
// ---------------------------------------------------------------------------

describe('getWorkerVerificationSummary — Phase 10A-Fix-6 priority rules', () => {
  it('approved beats pending — a doc type with both approved and pending records reports approved, not pending', () => {
    const worker = makeWorker('w1');
    const docs = [
      // Original CCCD approved a long time ago.
      doc(worker.id, 'NationalId', 'Approved', '2026-05-01T00:00:00.000Z'),
      // Worker resubmits CCCD later — new record is Pending.
      doc(worker.id, 'NationalId', 'Pending', '2026-05-10T00:00:00.000Z'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(true);
    // No pending chip — the type is already approved, the resubmission
    // doesn't put the public into "still being reviewed" state.
    expect(summary.pendingCount).toBe(0);
    expect(summary.approvedMethods).toHaveLength(1);
    expect(summary.approvedMethods[0].type).toBe('NationalId');
  });

  it('latest Pending shows pending only when the type has never been approved', () => {
    const worker = makeWorker('w1');
    const docs = [
      doc(worker.id, 'NationalId', 'Pending', '2026-05-10T00:00:00.000Z'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(false);
    expect(summary.pendingCount).toBe(1);
  });

  it('three approved methods produce three chips, no "chưa xác minh" framing, no pending', () => {
    const worker = makeWorker('worker-binh');
    const docs = [
      doc(worker.id, 'NationalId', 'Approved', '2026-05-01T00:00:00.000Z'),
      doc(worker.id, 'StudentCard', 'Approved', '2026-05-02T00:00:00.000Z'),
      doc(worker.id, 'DriverLicense', 'Approved', '2026-05-03T00:00:00.000Z'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(true);
    expect(summary.pendingCount).toBe(0);
    expect(summary.approvedMethods.map((m) => m.type)).toEqual(
      expect.arrayContaining([
        'NationalId',
        'StudentCard',
        'DriverLicense',
      ]),
    );
  });

  it('approved CCCD + pending student card → identityVerified true, pending count 1 (student card not approved yet)', () => {
    const worker = makeWorker('w1');
    const docs = [
      doc(worker.id, 'NationalId', 'Approved', '2026-05-01T00:00:00.000Z'),
      doc(worker.id, 'StudentCard', 'Pending', '2026-05-02T00:00:00.000Z'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(true);
    expect(summary.pendingCount).toBe(1);
    expect(summary.approvedMethods).toHaveLength(1);
  });

  it('NeedsMoreInfo / Rejected do NOT count toward the public pending pile (worker-action only)', () => {
    const worker = makeWorker('w1');
    const docs = [
      doc(worker.id, 'NationalId', 'NeedsMoreInfo', '2026-05-01T00:00:00.000Z'),
      doc(worker.id, 'StudentCard', 'Rejected', '2026-05-02T00:00:00.000Z'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(false);
    expect(summary.pendingCount).toBe(0);
  });

  it('public summary never returns admin-only fields', () => {
    const worker = makeWorker('w1');
    const docWith = (
      submittedAt: string,
      reviewedAt: string | undefined,
    ): WorkerVerificationDocument => ({
      id: `wver-${submittedAt}`,
      workerId: worker.id,
      documentType: 'NationalId',
      status: 'Approved',
      displayLabel: 'CCCD / CMND',
      // These are admin-only — must NOT appear in the public summary.
      fullIdentifier: '079123456789',
      maskedIdentifier: '0791•••••456',
      submittedAt,
      reviewedAt,
      reviewedByAdminId: 'admin-001',
      mockFrontImageUrl: 'mock://front.jpg',
      mockBackImageUrl: 'mock://back.jpg',
      mockSelfieImageUrl: 'mock://selfie.jpg',
      notes: 'admin internal note',
    });
    const summary = getWorkerVerificationSummary(worker, [
      docWith('2026-05-01T00:00:00.000Z', '2026-05-04T00:00:00.000Z'),
    ]);
    const json = JSON.stringify(summary);
    expect(json).not.toContain('079123456789'); // fullIdentifier
    expect(json).not.toContain('mock://front');
    expect(json).not.toContain('mock://back');
    expect(json).not.toContain('mock://selfie');
    expect(json).not.toContain('admin internal note');
    // Masked identifier IS public-safe and should appear.
    expect(json).toContain('0791•••••456');
  });
});

// ---------------------------------------------------------------------------
// Featured slot label / availability
// ---------------------------------------------------------------------------

describe('Featured slot — Phase 10A-Fix-6 label + exclusion', () => {
  const NOW = Date.now();

  it('a 3/3 full shift is excluded by isShiftAvailableForRecruiting', () => {
    const s = makeShift('full', { positionsTotal: 3, positionsFilled: 3 });
    expect(isShiftAvailableForRecruiting(s, [], NOW)).toBe(false);
  });

  it('available count for 0 filled / 3 total is 3 (label reads "Còn 3/3 vị trí")', () => {
    const s = makeShift('open', { positionsTotal: 3, positionsFilled: 0 });
    const filled = effectiveFilledCount(s, []);
    expect(filled).toBe(0);
    const available = s.positionsTotal - filled;
    expect(available).toBe(3);
  });

  it('available count for 1 filled / 3 total is 2 (label reads "Còn 2/3 vị trí")', () => {
    const s = makeShift('open', { positionsTotal: 3, positionsFilled: 0 });
    const apps: Application[] = [makeApp(s.id, 'w1', 'Approved')];
    const filled = effectiveFilledCount(s, apps);
    expect(filled).toBe(1);
    const available = s.positionsTotal - filled;
    expect(available).toBe(2);
  });

  it('available count clamps to 0 (never negative) when applications exceed positionsTotal', () => {
    // Defensive: if data is somehow inconsistent, the label should
    // still read sensibly.
    const s = makeShift('over', { positionsTotal: 2, positionsFilled: 3 });
    const filled = effectiveFilledCount(s, []);
    expect(filled).toBe(3);
    const available = Math.max(0, s.positionsTotal - filled);
    expect(available).toBe(0);
  });
});
