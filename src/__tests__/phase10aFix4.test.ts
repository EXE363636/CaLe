/**
 * Phase 10A-Fix-4 — live verification, task badges, featured countdown.
 *
 * Pins down:
 *   - `getWorkerVerificationSummary` reflects admin approvals after
 *     application submission (the spec's binh.le scenario).
 *   - Task-badge counters match expected values for admin / employer /
 *     worker scenarios.
 *   - `formatFeaturedCountdown` produces the right Vietnamese phrasing
 *     across day / hour / minute thresholds.
 */

import { describe, it, expect } from 'vitest';

import {
  adminVerificationTaskCount,
  employerDashboardTaskCount,
  employerPendingApplicationCount,
  workerDashboardTaskCount,
  workerProfileTaskCount,
} from '@/domain/taskBadges';
import { getWorkerVerificationSummary } from '@/stores/verificationStore';
import { formatFeaturedCountdown } from '@/components/landing/FeaturedJobMockup';
import type {
  Application,
  EmployerTypeChangeRequest,
  EmployerVerificationDocument,
  Notification,
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
  submittedAt: string = '2026-05-02T00:00:00.000Z',
): WorkerVerificationDocument {
  return {
    id: `wver-${workerId}-${documentType}-${status}-${submittedAt}`,
    workerId,
    documentType,
    status,
    displayLabel: documentType,
    submittedAt,
    reviewedAt: status === 'Pending' ? undefined : '2026-05-03T00:00:00.000Z',
  };
}

function emptyApplication(
  shiftId: string,
  workerId: string,
  status: Application['status'],
): Application {
  return {
    id: `app-${shiftId}-${workerId}-${status}`,
    shiftId,
    workerId,
    status,
    appliedAt: '2026-05-04T00:00:00.000Z',
  };
}

function notification(
  userId: string,
  read: boolean,
  id: string,
): Notification {
  return {
    id,
    userId,
    kind: 'ReputationAdjusted',
    title: 'Test',
    body: 'Test',
    read,
    createdAt: '2026-05-05T00:00:00.000Z',
  };
}

function emptyEmployerDoc(
  employerId: string,
  status: 'Pending' | 'Approved',
  id: string,
): EmployerVerificationDocument {
  return {
    id,
    employerId,
    employerType: 'Company',
    documentType: 'BusinessLicense',
    status,
    displayLabel: 'BusinessLicense',
    submittedAt: '2026-05-06T00:00:00.000Z',
  };
}

function emptyTypeChange(
  employerId: string,
  status: 'Pending' | 'Approved' | 'Rejected',
  id: string,
): EmployerTypeChangeRequest {
  return {
    id,
    employerId,
    currentType: 'HouseholdBusiness',
    requestedType: 'Company',
    reason: 'test',
    status,
    submittedAt: '2026-05-07T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Live verification summary — the binh.le scenario
// ---------------------------------------------------------------------------

describe('getWorkerVerificationSummary — Phase 10A-Fix-4 (live derivation)', () => {
  it('reports identityVerified=false when the worker has no approved docs', () => {
    const worker = makeWorker('worker-binh');
    const summary = getWorkerVerificationSummary(worker, []);
    expect(summary.identityVerified).toBe(false);
    expect(summary.primaryMethod).toBeUndefined();
  });

  it('reflects an admin approval that happens AFTER an application was submitted', () => {
    const worker = makeWorker('worker-binh');

    // Initial submission: nothing approved yet.
    let docs: WorkerVerificationDocument[] = [
      workerDoc(worker.id, 'NationalId', 'Pending'),
    ];
    let summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(false);

    // Admin approves the doc (in real code the store mutates the slice
    // in place — here we just rebuild the array). The selector must
    // immediately surface the new state without any stored snapshot
    // on the application.
    docs = [workerDoc(worker.id, 'NationalId', 'Approved')];
    summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(true);
    expect(summary.primaryMethod).toBe('NationalId');
    expect(summary.primaryMethodLabel).toMatch(/CCCD/);
  });

  it('public pendingCount counts only types not already approved (Phase 10A-Fix-6)', () => {
    const worker = makeWorker('worker-binh');
    const docs = [
      // Pending CCCD (no prior approved CCCD) — counts.
      workerDoc(worker.id, 'NationalId', 'Pending'),
      // NeedsMoreInfo student card — does NOT count toward the public
      // pending pile (it's a worker action, not an admin action). The
      // worker-profile badge picks this up via `workerProfileTaskCount`.
      workerDoc(worker.id, 'StudentCard', 'NeedsMoreInfo'),
      // Approved driver license — has its own approved chip; cannot
      // simultaneously contribute to pending.
      workerDoc(worker.id, 'DriverLicense', 'Approved'),
    ];
    const summary = getWorkerVerificationSummary(worker, docs);
    expect(summary.identityVerified).toBe(true); // driver license approved
    expect(summary.pendingCount).toBe(1); // only the un-approved CCCD pending
  });
});

// ---------------------------------------------------------------------------
// Task badge counters
// ---------------------------------------------------------------------------

describe('adminVerificationTaskCount — Phase 10A-Fix-4', () => {
  it('returns 0 when nothing is pending', () => {
    const docs = [workerDoc('w1', 'NationalId', 'Approved')];
    expect(adminVerificationTaskCount(docs, [], [])).toBe(0);
  });

  it('counts pending worker docs + employer docs + type-change requests', () => {
    const workerDocs = [
      workerDoc('w1', 'NationalId', 'Pending'),
      workerDoc('w2', 'StudentCard', 'Pending'),
      workerDoc('w3', 'NationalId', 'Approved'),
    ];
    const employerDocs = [
      emptyEmployerDoc('e1', 'Pending', 'e1d'),
      emptyEmployerDoc('e2', 'Approved', 'e2d'),
    ];
    const typeChangeRequests = [
      emptyTypeChange('e3', 'Pending', 'r1'),
      emptyTypeChange('e4', 'Approved', 'r2'),
    ];
    expect(
      adminVerificationTaskCount(
        workerDocs,
        employerDocs,
        typeChangeRequests,
      ),
    ).toBe(4); // 2 pending worker + 1 pending employer + 1 pending change
  });
});

describe('employerPendingApplicationCount + employerDashboardTaskCount', () => {
  it('counts only pending applications scoped to the employer shifts', () => {
    const ids = new Set(['s1', 's2']);
    const apps: Application[] = [
      emptyApplication('s1', 'w1', 'Pending'),
      emptyApplication('s1', 'w2', 'Approved'),
      emptyApplication('s2', 'w3', 'Pending'),
      // shift not owned by employer:
      emptyApplication('s9', 'w4', 'Pending'),
    ];
    expect(employerPendingApplicationCount(apps, ids)).toBe(2);
  });

  it('dashboard count includes CheckedOut applications awaiting confirmation', () => {
    const ids = new Set(['s1']);
    const apps: Application[] = [
      emptyApplication('s1', 'w1', 'Pending'),
      emptyApplication('s1', 'w2', 'CheckedOut'),
      emptyApplication('s1', 'w3', 'Confirmed'),
    ];
    expect(employerDashboardTaskCount(apps, ids)).toBe(2);
  });
});

describe('workerProfileTaskCount + workerDashboardTaskCount', () => {
  it('counts NeedsMoreInfo + Rejected as actionable when they are the LATEST per type', () => {
    const docs = [
      workerDoc('w1', 'NationalId', 'NeedsMoreInfo', '2026-05-02T00:00:00.000Z'),
      workerDoc('w1', 'StudentCard', 'Rejected', '2026-05-02T00:00:00.000Z'),
      workerDoc('w1', 'DriverLicense', 'Approved', '2026-05-02T00:00:00.000Z'),
      workerDoc('w2', 'NationalId', 'Rejected', '2026-05-02T00:00:00.000Z'),
    ];
    // w1 has 2 actionable docs (NeedsMoreInfo + Rejected). w2 isn't
    // counted because the workerId filter only takes 'w1'.
    expect(workerProfileTaskCount('w1', docs)).toBe(2);
  });

  it('drops an older Rejected doc when a newer Pending submission for the same type exists (Phase 10A-Fix-5 latest-doc rule)', () => {
    const docs = [
      // worker resubmitted CCCD after a Rejected — latest is Pending,
      // so the "needs action" badge should clear.
      workerDoc('w1', 'NationalId', 'Rejected', '2026-05-02T00:00:00.000Z'),
      workerDoc('w1', 'NationalId', 'Pending', '2026-05-04T00:00:00.000Z'),
      // Different doc type: latest is Approved.
      workerDoc('w1', 'StudentCard', 'NeedsMoreInfo', '2026-05-02T00:00:00.000Z'),
      workerDoc('w1', 'StudentCard', 'Approved', '2026-05-04T00:00:00.000Z'),
    ];
    expect(workerProfileTaskCount('w1', docs)).toBe(0);
  });

  it('still counts the latest doc when it itself is Rejected/NeedsMoreInfo', () => {
    const docs = [
      workerDoc('w1', 'NationalId', 'Pending', '2026-05-02T00:00:00.000Z'),
      // Admin rejected the resubmission — latest is now Rejected, so
      // the worker has fresh action to take.
      workerDoc('w1', 'NationalId', 'Rejected', '2026-05-04T00:00:00.000Z'),
    ];
    expect(workerProfileTaskCount('w1', docs)).toBe(1);
  });

  it('worker dashboard counter is intentionally always 0 (Phase 10A-Fix-5)', () => {
    // Unread notifications belong to the bell, not the dashboard nav.
    const notifs: Notification[] = [
      notification('w1', false, 'n1'),
      notification('w1', false, 'n2'),
      notification('w1', true, 'n3'),
      notification('w2', false, 'n4'),
    ];
    expect(workerDashboardTaskCount('w1', notifs)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Featured countdown formatter
// ---------------------------------------------------------------------------

describe('formatFeaturedCountdown — Phase 10A-Fix-4', () => {
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('returns null for non-positive or non-finite differences', () => {
    expect(formatFeaturedCountdown(0)).toBeNull();
    expect(formatFeaturedCountdown(-1000)).toBeNull();
    expect(formatFeaturedCountdown(NaN)).toBeNull();
  });

  it('formats >=24h as "{N} ngày {HH} giờ"', () => {
    expect(formatFeaturedCountdown(2 * DAY + 4 * HOUR)).toBe(
      'Bắt đầu sau 2 ngày 04 giờ',
    );
    expect(formatFeaturedCountdown(1 * DAY + 0 * HOUR)).toBe(
      'Bắt đầu sau 1 ngày 00 giờ',
    );
  });

  it('formats >=1h and <24h as "{H} giờ {MM} phút"', () => {
    expect(formatFeaturedCountdown(3 * HOUR + 25 * MIN)).toBe(
      'Bắt đầu sau 3 giờ 25 phút',
    );
    expect(formatFeaturedCountdown(1 * HOUR + 5 * MIN)).toBe(
      'Bắt đầu sau 1 giờ 05 phút',
    );
  });

  it('formats <1h as "{MM}:{SS} phút"', () => {
    expect(formatFeaturedCountdown(25 * MIN + 10_000)).toBe(
      'Bắt đầu sau 25:10 phút',
    );
    expect(formatFeaturedCountdown(45 * 1000)).toBe(
      'Bắt đầu sau 00:45 phút',
    );
  });
});
