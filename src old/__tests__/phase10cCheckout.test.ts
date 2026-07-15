/**
 * Phase 10C — Wave 3 worker check-out tests.
 *
 * Covers:
 *
 *   1. The refactored `applicationStore.checkOut(payload)` signature
 *      (single object input, application id discriminator).
 *   2. The `'EVIDENCE_REQUIRED'` no-mutation contract: when the
 *      payload fails the shift's evidence requirement the call
 *      returns `{ ok: false, error: { code: 'EVIDENCE_REQUIRED',
 *      reason } }` and leaves the application's status, evidence
 *      fields, and `checkOutAt` untouched.
 *   3. Successful check-out persists `status: 'CheckedOut'`,
 *      `checkOutAt`, `checkoutChecklist`, `workerCheckoutNote`, and
 *      `workerEvidenceFileName` and drives the existing escrow +
 *      shift-status side effects (`'AwaitingConfirmation'`).
 *   4. The structured EVIDENCE_REQUIRED error round-trips through
 *      `toastFromStoreError` to the localized Vietnamese copy keyed
 *      under `error.evidence.*`.
 *
 * Strict Wave 3 scope — no auto-release, no dispute, no admin
 * resolution, no ledger writes.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { toastFromStoreError } from '@/lib/errorMap';
import { CHECKLIST_ITEM_COUNT } from '@/domain/evidence';
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

const NOW_ISO = '2026-06-01T08:00:00.000Z';

function makeShift(override: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-1',
    employerId: 'employer-1',
    title: 'Phục vụ tiệc',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: '2026-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 1,
    status: 'InProgress',
    escrowStatus: 'InProgress',
    depositAmount: 200_000,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    evidenceRequirement: 'OptionalPhoto',
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
  override: Partial<Application> = {},
): Application {
  return {
    id: `app-${shiftId}-${workerId}`,
    shiftId,
    workerId,
    status: 'CheckedIn',
    appliedAt: '2026-05-15T00:00:00.000Z',
    approvedAt: '2026-05-16T00:00:00.000Z',
    checkInAt: '2026-06-02T08:00:00.000Z',
    payoutAmount: 200_000,
    ...override,
  };
}

function reset(level: EvidenceRequirement = 'OptionalPhoto') {
  const shift = makeShift({ evidenceRequirement: level });
  const worker = makeWorker('w1');
  const app = makeApp(shift.id, worker.id);
  useShiftStore.setState({ shifts: [shift], lastLifecycleSyncAt: null });
  useApplicationStore.setState({
    applications: [app],
    ratings: [],
    disputes: [],
  });
  useUserStore.setState({ users: [makeEmployer(), worker] });
  useNotificationStore.setState({ notifications: [] });
  return { shift, worker, app };
}

function snapshotApp(id: string): Application | undefined {
  return useApplicationStore.getState().applications.find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applicationStore.checkOut — Phase 10C payload + EVIDENCE_REQUIRED', () => {
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

  it('rejects EVIDENCE_REQUIRED when RequiredPhoto checkout has no filename', () => {
    const { app } = reset('RequiredPhoto');
    const before = snapshotApp(app.id);

    const r = useApplicationStore.getState().checkOut({
      applicationId: app.id,
      // No evidenceFileName supplied; RequiredPhoto needs one.
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.error).toBe('object');
      expect((r.error as { code: string }).code).toBe('EVIDENCE_REQUIRED');
      expect((r.error as { reason: string }).reason).toBe('PHOTO_REQUIRED');
    }
    // No-mutation contract — the application is byte-identical.
    const after = snapshotApp(app.id);
    expect(after).toEqual(before);
  });

  it('rejects EVIDENCE_REQUIRED when RequiredHandoverChecklist is incomplete', () => {
    const { app } = reset('RequiredHandoverChecklist');
    const before = snapshotApp(app.id);
    const len = CHECKLIST_ITEM_COUNT.RequiredHandoverChecklist;

    const r = useApplicationStore.getState().checkOut({
      applicationId: app.id,
      checklist: Array(len).fill(false),
      note: 'đã bàn giao',
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect((r.error as { code: string }).code).toBe('EVIDENCE_REQUIRED');
      expect((r.error as { reason: string }).reason).toBe(
        'CHECKLIST_INCOMPLETE',
      );
    }
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('rejects EVIDENCE_REQUIRED when RequiredHandoverChecklist note is empty', () => {
    const { app } = reset('RequiredHandoverChecklist');
    const before = snapshotApp(app.id);
    const len = CHECKLIST_ITEM_COUNT.RequiredHandoverChecklist;

    const r = useApplicationStore.getState().checkOut({
      applicationId: app.id,
      checklist: Array(len).fill(true),
      note: '   ', // whitespace-only is empty after trim()
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect((r.error as { code: string }).code).toBe('EVIDENCE_REQUIRED');
      expect((r.error as { reason: string }).reason).toBe('NOTE_REQUIRED');
    }
    expect(snapshotApp(app.id)).toEqual(before);
  });

  it('persists checklist, note, filename, and checkOutAt on success', () => {
    const { app, shift } = reset('RequiredHandoverChecklist');
    const len = CHECKLIST_ITEM_COUNT.RequiredHandoverChecklist;

    const r = useApplicationStore.getState().checkOut({
      applicationId: app.id,
      checklist: Array(len).fill(true),
      note: ' đã bàn giao đầy đủ ',
      evidenceFileName: 'handover-001.jpg',
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('CheckedOut');
    expect(r.value.checkOutAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(r.value.checkoutChecklist).toEqual(Array(len).fill(true));
    // Note is trimmed before persisting.
    expect(r.value.workerCheckoutNote).toBe('đã bàn giao đầy đủ');
    expect(r.value.workerEvidenceFileName).toBe('handover-001.jpg');

    // Side effect: the only-applicant shift rolls to AwaitingConfirmation.
    const updatedShift = useShiftStore
      .getState()
      .shifts.find((s) => s.id === shift.id);
    expect(updatedShift?.status).toBe('AwaitingConfirmation');
    expect(updatedShift?.escrowStatus).toBe('Completed');
  });

  it('accepts None level with an empty payload and persists empty fields', () => {
    const { app } = reset('None');

    const r = useApplicationStore.getState().checkOut({ applicationId: app.id });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('CheckedOut');
    expect(r.value.checkoutChecklist).toEqual([]);
    expect(r.value.workerCheckoutNote).toBe('');
    expect(r.value.workerEvidenceFileName).toBe('');
  });

  it('rejects WRONG_STATUS when the application is not CheckedIn', () => {
    const { app } = reset('OptionalPhoto');
    // Force the application back to Approved.
    useApplicationStore.setState({
      applications: useApplicationStore
        .getState()
        .applications.map((a) =>
          a.id === app.id ? { ...a, status: 'Approved' } : a,
        ),
    });

    const r = useApplicationStore.getState().checkOut({ applicationId: app.id });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
  });

  it('rejects APPLICATION_NOT_FOUND for an unknown id', () => {
    reset('OptionalPhoto');
    const r = useApplicationStore
      .getState()
      .checkOut({ applicationId: 'does-not-exist' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('APPLICATION_NOT_FOUND');
  });
});

describe('toastFromStoreError — Phase 10C structured EVIDENCE_REQUIRED', () => {
  it('maps each evidence reason to its localized Vietnamese message', () => {
    expect(
      toastFromStoreError({
        code: 'EVIDENCE_REQUIRED',
        reason: 'CHECKLIST_INCOMPLETE',
      }),
    ).toMatch(/tích đầy đủ các mục/i);
    expect(
      toastFromStoreError({
        code: 'EVIDENCE_REQUIRED',
        reason: 'PHOTO_REQUIRED',
      }),
    ).toMatch(/đính kèm tên tệp ảnh bàn giao/i);
    expect(
      toastFromStoreError({
        code: 'EVIDENCE_REQUIRED',
        reason: 'NOTE_REQUIRED',
      }),
    ).toMatch(/nhập ghi chú bàn giao/i);
    expect(
      toastFromStoreError({
        code: 'EVIDENCE_REQUIRED',
        reason: 'FIELD_TOO_LONG',
      }),
    ).toMatch(/quá dài/i);
  });

  it('falls back to generic for unknown structured codes', () => {
    expect(
      toastFromStoreError({ code: 'UNKNOWN_X' as 'EVIDENCE_REQUIRED', reason: 'X' }),
    ).toMatch(/Có lỗi xảy ra/i);
  });
});
