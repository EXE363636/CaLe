/**
 * Verification store — Phase 10A.
 *
 * Holds the worker- and employer-side verification document slices,
 * exposes admin-side review actions (approve / reject / request more
 * info), and computes per-entity verification summaries that drive
 * trust badges across the app.
 *
 * Mock-only: every "submission" is a localStorage record with no real
 * upload. Image / file fields carry placeholder URLs or file names so
 * the admin queue UI has something to render. Identity numbers stored
 * as `fullIdentifier` are admin-only — UI components must read
 * `maskedIdentifier` for any worker- or employer-visible surface.
 *
 * Concurrency: stores call `persist*` on every mutation. The auth +
 * notification stores read/write their own slices; we only touch the
 * `workerVerifications` / `employerVerifications` slices here.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import type {
  EmployerTrustBadge,
  EmployerType10A,
  EmployerTypeChangeRequest,
  EmployerVerificationDocument,
  EmployerVerificationDocumentType,
  EmployerVerificationSummary,
  Result,
  VerificationStatus,
  Worker,
  WorkerIdentityDocumentType,
  WorkerTrustBadge,
  WorkerVerificationDocument,
  WorkerVerificationSummary,
} from '@/types';

// ---------------------------------------------------------------------------
// Display-label dictionaries (kept here so the store is the single source
// of truth — UI components import these helpers instead of re-inventing the
// Vietnamese labels).
// ---------------------------------------------------------------------------

const WORKER_DOC_LABELS: Record<WorkerIdentityDocumentType, string> = {
  NationalId: 'CCCD / CMND',
  StudentCard: 'Thẻ sinh viên',
  DriverLicense: 'Bằng lái xe',
};

const EMPLOYER_DOC_LABELS: Record<EmployerVerificationDocumentType, string> = {
  RepresentativeId: 'CCCD đại diện',
  BusinessLicense: 'Giấy phép kinh doanh',
  TaxCode: 'Mã số thuế',
  StorefrontPhoto: 'Ảnh mặt tiền',
  WorkplacePhoto: 'Ảnh nơi làm việc',
  EventProof: 'Hợp đồng / xác nhận sự kiện',
  AddressProof: 'Chứng minh địa chỉ',
  GoogleMapsOrFanpage: 'Google Maps / Fanpage',
};

const EMPLOYER_TYPE_LABELS: Record<EmployerType10A, string> = {
  Individual: 'Cá nhân thuê ngắn hạn',
  HouseholdBusiness: 'Hộ kinh doanh',
  Company: 'Doanh nghiệp',
  AgencyEvent: 'Agency / Sự kiện',
};

export function workerDocLabel(t: WorkerIdentityDocumentType): string {
  return WORKER_DOC_LABELS[t];
}

export function employerDocLabel(t: EmployerVerificationDocumentType): string {
  return EMPLOYER_DOC_LABELS[t];
}

export function employerTypeLabel(t: EmployerType10A): string {
  return EMPLOYER_TYPE_LABELS[t];
}

// ---------------------------------------------------------------------------
// Mock submission payloads
// ---------------------------------------------------------------------------

export interface WorkerDocumentSubmission {
  documentType: WorkerIdentityDocumentType;
  fullIdentifier?: string;
  /** Caller-supplied; store auto-generates a default when omitted. */
  maskedIdentifier?: string;
  mockFrontImageUrl?: string;
  mockBackImageUrl?: string;
  mockSelfieImageUrl?: string;
  notes?: string;
}

export interface EmployerDocumentSubmission {
  employerType: EmployerType10A;
  documentType: EmployerVerificationDocumentType;
  mockFileName?: string;
  mockImageUrl?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Selector return types
// ---------------------------------------------------------------------------

export type VerifyError =
  | 'NOT_FOUND'
  | 'REASON_REQUIRED'
  | 'ALREADY_REVIEWED'
  | 'ALREADY_PENDING'
  | 'SAME_TYPE';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface VerificationStore {
  workerDocuments: WorkerVerificationDocument[];
  employerDocuments: EmployerVerificationDocument[];
  /** Phase 10A-Fix-1: pending / decided employer type change requests. */
  typeChangeRequests: EmployerTypeChangeRequest[];

  // Worker-side submissions
  submitWorkerDocument(
    workerId: string,
    payload: WorkerDocumentSubmission,
    nowIso?: string,
  ): WorkerVerificationDocument;

  // Admin-side review actions
  approveWorkerDocument(
    documentId: string,
    adminId: string,
    nowIso?: string,
  ): Result<WorkerVerificationDocument, VerifyError>;
  rejectWorkerDocument(
    documentId: string,
    adminId: string,
    reason: string,
    nowIso?: string,
  ): Result<WorkerVerificationDocument, VerifyError>;
  requestMoreWorkerInfo(
    documentId: string,
    adminId: string,
    reason: string,
    nowIso?: string,
  ): Result<WorkerVerificationDocument, VerifyError>;

  // Employer-side submissions
  submitEmployerDocument(
    employerId: string,
    payload: EmployerDocumentSubmission,
    nowIso?: string,
  ): EmployerVerificationDocument;

  approveEmployerDocument(
    documentId: string,
    adminId: string,
    nowIso?: string,
  ): Result<EmployerVerificationDocument, VerifyError>;
  rejectEmployerDocument(
    documentId: string,
    adminId: string,
    reason: string,
    nowIso?: string,
  ): Result<EmployerVerificationDocument, VerifyError>;
  requestMoreEmployerInfo(
    documentId: string,
    adminId: string,
    reason: string,
    nowIso?: string,
  ): Result<EmployerVerificationDocument, VerifyError>;

  /** Hydrate slices from a persisted snapshot. */
  hydrate(
    workerDocuments: WorkerVerificationDocument[],
    employerDocuments: EmployerVerificationDocument[],
    typeChangeRequests?: EmployerTypeChangeRequest[],
  ): void;

  // ── Phase 10A-Fix-1: type change requests ──────────────────────────────
  submitEmployerTypeChangeRequest(
    employerId: string,
    currentType: EmployerType10A,
    requestedType: EmployerType10A,
    reason: string,
    nowIso?: string,
  ): Result<EmployerTypeChangeRequest, VerifyError>;
  approveEmployerTypeChangeRequest(
    requestId: string,
    adminId: string,
    nowIso?: string,
  ): Result<EmployerTypeChangeRequest, VerifyError>;
  rejectEmployerTypeChangeRequest(
    requestId: string,
    adminId: string,
    adminReason: string,
    nowIso?: string,
  ): Result<EmployerTypeChangeRequest, VerifyError>;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function persistWorkerDocuments(docs: WorkerVerificationDocument[]): void {
  write(STORAGE_KEYS.workerVerifications, docs);
}

function persistEmployerDocuments(docs: EmployerVerificationDocument[]): void {
  write(STORAGE_KEYS.employerVerifications, docs);
}

function persistTypeChangeRequests(reqs: EmployerTypeChangeRequest[]): void {
  write(STORAGE_KEYS.employerTypeChangeRequests, reqs);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function defaultMask(full: string): string {
  if (!full || full.length < 4) return full;
  const tail = full.slice(-3);
  const head = full.slice(0, Math.max(2, full.length - 7));
  return `${head}•••••${tail}`;
}

function reviewWorkerDocument(
  state: { workerDocuments: WorkerVerificationDocument[] },
  documentId: string,
  patch: Partial<WorkerVerificationDocument>,
  reviewedAt: string,
  adminId: string,
): Result<WorkerVerificationDocument, VerifyError> {
  const existing = state.workerDocuments.find((d) => d.id === documentId);
  if (!existing) return { ok: false, error: 'NOT_FOUND' };
  if (existing.status === 'Approved' || existing.status === 'Rejected') {
    // Approved / Rejected are terminal for the workflow shown in the
    // admin queue. NeedsMoreInfo can still be re-actioned because the
    // worker is expected to resubmit the same record.
    return { ok: false, error: 'ALREADY_REVIEWED' };
  }
  const updated: WorkerVerificationDocument = {
    ...existing,
    ...patch,
    reviewedAt,
    reviewedByAdminId: adminId,
  };
  return { ok: true, value: updated };
}

function reviewEmployerDocument(
  state: { employerDocuments: EmployerVerificationDocument[] },
  documentId: string,
  patch: Partial<EmployerVerificationDocument>,
  reviewedAt: string,
  adminId: string,
): Result<EmployerVerificationDocument, VerifyError> {
  const existing = state.employerDocuments.find((d) => d.id === documentId);
  if (!existing) return { ok: false, error: 'NOT_FOUND' };
  if (existing.status === 'Approved' || existing.status === 'Rejected') {
    return { ok: false, error: 'ALREADY_REVIEWED' };
  }
  const updated: EmployerVerificationDocument = {
    ...existing,
    ...patch,
    reviewedAt,
    reviewedByAdminId: adminId,
  };
  return { ok: true, value: updated };
}

// ---------------------------------------------------------------------------
// Public store
// ---------------------------------------------------------------------------

export const useVerificationStore = create<VerificationStore>((set, get) => ({
  workerDocuments: [],
  employerDocuments: [],
  typeChangeRequests: [],

  // ── Worker submission ───────────────────────────────────────────────────

  submitWorkerDocument(workerId, payload, nowIso) {
    const submittedAt = nowIso ?? new Date().toISOString();
    const created: WorkerVerificationDocument = {
      id: newPrefixedId('wver'),
      workerId,
      documentType: payload.documentType,
      status: 'Pending',
      displayLabel: workerDocLabel(payload.documentType),
      fullIdentifier: payload.fullIdentifier,
      maskedIdentifier:
        payload.maskedIdentifier ??
        (payload.fullIdentifier ? defaultMask(payload.fullIdentifier) : undefined),
      submittedAt,
      mockFrontImageUrl: payload.mockFrontImageUrl,
      mockBackImageUrl: payload.mockBackImageUrl,
      mockSelfieImageUrl: payload.mockSelfieImageUrl,
      notes: payload.notes,
      verificationMethodLabel: `Xác minh bằng ${workerDocLabel(payload.documentType).toLowerCase()}`,
    };
    const next = [created, ...get().workerDocuments];
    set({ workerDocuments: next });
    persistWorkerDocuments(next);
    return created;
  },

  approveWorkerDocument(documentId, adminId, nowIso) {
    const reviewedAt = nowIso ?? new Date().toISOString();
    const r = reviewWorkerDocument(
      get(),
      documentId,
      { status: 'Approved', rejectionReason: undefined },
      reviewedAt,
      adminId,
    );
    if (!r.ok) return r;
    const next = get().workerDocuments.map((d) =>
      d.id === documentId ? r.value : d,
    );
    set({ workerDocuments: next });
    persistWorkerDocuments(next);
    return r;
  },

  rejectWorkerDocument(documentId, adminId, reason, nowIso) {
    if (!reason || reason.trim().length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    const reviewedAt = nowIso ?? new Date().toISOString();
    const r = reviewWorkerDocument(
      get(),
      documentId,
      { status: 'Rejected', rejectionReason: reason.trim() },
      reviewedAt,
      adminId,
    );
    if (!r.ok) return r;
    const next = get().workerDocuments.map((d) =>
      d.id === documentId ? r.value : d,
    );
    set({ workerDocuments: next });
    persistWorkerDocuments(next);
    return r;
  },

  requestMoreWorkerInfo(documentId, adminId, reason, nowIso) {
    if (!reason || reason.trim().length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    const reviewedAt = nowIso ?? new Date().toISOString();
    const r = reviewWorkerDocument(
      get(),
      documentId,
      { status: 'NeedsMoreInfo', rejectionReason: reason.trim() },
      reviewedAt,
      adminId,
    );
    if (!r.ok) return r;
    const next = get().workerDocuments.map((d) =>
      d.id === documentId ? r.value : d,
    );
    set({ workerDocuments: next });
    persistWorkerDocuments(next);
    return r;
  },

  // ── Employer submission ────────────────────────────────────────────────

  submitEmployerDocument(employerId, payload, nowIso) {
    const submittedAt = nowIso ?? new Date().toISOString();
    const created: EmployerVerificationDocument = {
      id: newPrefixedId('ever'),
      employerId,
      employerType: payload.employerType,
      documentType: payload.documentType,
      status: 'Pending',
      displayLabel: employerDocLabel(payload.documentType),
      submittedAt,
      mockFileName: payload.mockFileName,
      mockImageUrl: payload.mockImageUrl,
      notes: payload.notes,
    };
    const next = [created, ...get().employerDocuments];
    set({ employerDocuments: next });
    persistEmployerDocuments(next);
    return created;
  },

  approveEmployerDocument(documentId, adminId, nowIso) {
    const reviewedAt = nowIso ?? new Date().toISOString();
    const r = reviewEmployerDocument(
      get(),
      documentId,
      { status: 'Approved', rejectionReason: undefined },
      reviewedAt,
      adminId,
    );
    if (!r.ok) return r;
    const next = get().employerDocuments.map((d) =>
      d.id === documentId ? r.value : d,
    );
    set({ employerDocuments: next });
    persistEmployerDocuments(next);
    return r;
  },

  rejectEmployerDocument(documentId, adminId, reason, nowIso) {
    if (!reason || reason.trim().length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    const reviewedAt = nowIso ?? new Date().toISOString();
    const r = reviewEmployerDocument(
      get(),
      documentId,
      { status: 'Rejected', rejectionReason: reason.trim() },
      reviewedAt,
      adminId,
    );
    if (!r.ok) return r;
    const next = get().employerDocuments.map((d) =>
      d.id === documentId ? r.value : d,
    );
    set({ employerDocuments: next });
    persistEmployerDocuments(next);
    return r;
  },

  requestMoreEmployerInfo(documentId, adminId, reason, nowIso) {
    if (!reason || reason.trim().length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    const reviewedAt = nowIso ?? new Date().toISOString();
    const r = reviewEmployerDocument(
      get(),
      documentId,
      { status: 'NeedsMoreInfo', rejectionReason: reason.trim() },
      reviewedAt,
      adminId,
    );
    if (!r.ok) return r;
    const next = get().employerDocuments.map((d) =>
      d.id === documentId ? r.value : d,
    );
    set({ employerDocuments: next });
    persistEmployerDocuments(next);
    return r;
  },

  hydrate(workerDocuments, employerDocuments, typeChangeRequests) {
    set({
      workerDocuments,
      employerDocuments,
      typeChangeRequests: typeChangeRequests ?? [],
    });
  },

  // ── Phase 10A-Fix-1 — type change requests ─────────────────────────────

  submitEmployerTypeChangeRequest(
    employerId,
    currentType,
    requestedType,
    reason,
    nowIso,
  ) {
    if (currentType === requestedType) {
      return { ok: false, error: 'SAME_TYPE' };
    }
    if (!reason || reason.trim().length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    const existingPending = get().typeChangeRequests.find(
      (r) => r.employerId === employerId && r.status === 'Pending',
    );
    if (existingPending) {
      return { ok: false, error: 'ALREADY_PENDING' };
    }
    const submittedAt = nowIso ?? new Date().toISOString();
    const created: EmployerTypeChangeRequest = {
      id: newPrefixedId('etcr'),
      employerId,
      currentType,
      requestedType,
      reason: reason.trim(),
      status: 'Pending',
      submittedAt,
    };
    const next = [created, ...get().typeChangeRequests];
    set({ typeChangeRequests: next });
    persistTypeChangeRequests(next);
    return { ok: true, value: created };
  },

  approveEmployerTypeChangeRequest(requestId, adminId, nowIso) {
    const reviewedAt = nowIso ?? new Date().toISOString();
    const existing = get().typeChangeRequests.find((r) => r.id === requestId);
    if (!existing) return { ok: false, error: 'NOT_FOUND' };
    if (existing.status !== 'Pending') {
      return { ok: false, error: 'ALREADY_REVIEWED' };
    }
    const updated: EmployerTypeChangeRequest = {
      ...existing,
      status: 'Approved',
      reviewedAt,
      reviewedByAdminId: adminId,
    };
    const next = get().typeChangeRequests.map((r) =>
      r.id === requestId ? updated : r,
    );
    set({ typeChangeRequests: next });
    persistTypeChangeRequests(next);
    return { ok: true, value: updated };
  },

  rejectEmployerTypeChangeRequest(requestId, adminId, adminReason, nowIso) {
    if (!adminReason || adminReason.trim().length === 0) {
      return { ok: false, error: 'REASON_REQUIRED' };
    }
    const reviewedAt = nowIso ?? new Date().toISOString();
    const existing = get().typeChangeRequests.find((r) => r.id === requestId);
    if (!existing) return { ok: false, error: 'NOT_FOUND' };
    if (existing.status !== 'Pending') {
      return { ok: false, error: 'ALREADY_REVIEWED' };
    }
    const updated: EmployerTypeChangeRequest = {
      ...existing,
      status: 'Rejected',
      reviewedAt,
      reviewedByAdminId: adminId,
      adminReason: adminReason.trim(),
    };
    const next = get().typeChangeRequests.map((r) =>
      r.id === requestId ? updated : r,
    );
    set({ typeChangeRequests: next });
    persistTypeChangeRequests(next);
    return { ok: true, value: updated };
  },
}));

// ---------------------------------------------------------------------------
// Pure selector helpers — kept outside the store so callers can `useMemo`
// against stable raw arrays (avoiding the Zustand fresh-array hazard).
// ---------------------------------------------------------------------------

export function getWorkerVerificationSummary(
  worker: Worker,
  workerDocuments: WorkerVerificationDocument[],
): WorkerVerificationSummary {
  const own = workerDocuments.filter((d) => d.workerId === worker.id);
  const approved = own.filter((d) => d.status === 'Approved');
  const pendingCount = own.filter(
    (d) => d.status === 'Pending' || d.status === 'NeedsMoreInfo',
  ).length;

  // Pick the most-recent approved document as the primary method.
  const primary =
    approved.length === 0
      ? undefined
      : approved.reduce((latest, d) =>
          (latest.reviewedAt ?? '') > (d.reviewedAt ?? '') ? latest : d,
        );

  // Phase 10A-Fix-5 — every approved identity method, deduped by
  // documentType so a re-approved doc doesn't render twice. Sorted
  // by reviewed-at desc so newest method shows first.
  const seenTypes = new Set<WorkerIdentityDocumentType>();
  const approvedMethods: WorkerVerificationSummary['approvedMethods'] = [];
  const approvedSorted = [...approved].sort((a, b) =>
    (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''),
  );
  for (const d of approvedSorted) {
    if (seenTypes.has(d.documentType)) continue;
    seenTypes.add(d.documentType);
    approvedMethods.push({
      type: d.documentType,
      label: workerDocLabel(d.documentType),
      maskedIdentifier: d.maskedIdentifier,
    });
  }

  const badges: WorkerTrustBadge[] = [];
  if (worker.verifications.includes('phone')) badges.push('PhoneVerified');
  if (approved.some((d) => d.documentType === 'NationalId')) {
    badges.push('IdentityVerified');
  }
  if (approved.some((d) => d.documentType === 'StudentCard')) {
    badges.push('StudentVerified');
  }
  if (approved.some((d) => d.documentType === 'DriverLicense')) {
    badges.push('DriverLicenseVerified');
  }

  return {
    workerId: worker.id,
    identityVerified: approved.length > 0,
    primaryMethod: primary?.documentType,
    primaryMethodLabel: primary
      ? workerDocLabel(primary.documentType)
      : undefined,
    maskedIdentifier: primary?.maskedIdentifier,
    approvedMethods,
    badges,
    pendingCount,
  };
}

export function getEmployerVerificationSummary(
  employerId: string,
  employerType: EmployerType10A,
  employerDocuments: EmployerVerificationDocument[],
  hasPhoneVerified: boolean,
  hasDepositRequired: boolean,
  trustedEmployer: boolean,
): EmployerVerificationSummary {
  const own = employerDocuments.filter((d) => d.employerId === employerId);
  const approved = own.filter((d) => d.status === 'Approved');
  const pendingCount = own.filter(
    (d) => d.status === 'Pending' || d.status === 'NeedsMoreInfo',
  ).length;

  const identityVerified = approved.some(
    (d) => d.documentType === 'RepresentativeId',
  );
  const businessVerified = approved.some(
    (d) =>
      d.documentType === 'BusinessLicense' ||
      d.documentType === 'TaxCode',
  );
  const workplaceProvided = approved.some(
    (d) =>
      d.documentType === 'StorefrontPhoto' ||
      d.documentType === 'WorkplacePhoto' ||
      d.documentType === 'EventProof' ||
      d.documentType === 'AddressProof' ||
      d.documentType === 'GoogleMapsOrFanpage',
  );

  const badges: EmployerTrustBadge[] = [];
  if (hasPhoneVerified) badges.push('PhoneVerified');
  if (identityVerified) badges.push('IdentityVerified');
  if (businessVerified) badges.push('BusinessVerified');
  if (workplaceProvided) badges.push('WorkplaceProvided');
  if (hasDepositRequired) badges.push('DepositRequired');
  if (trustedEmployer) badges.push('TrustedEmployer');

  return {
    employerId,
    employerType,
    identityVerified,
    businessVerified,
    workplaceProvided,
    badges,
    pendingCount,
  };
}

export function getPendingWorkerVerifications(
  workerDocuments: WorkerVerificationDocument[],
): WorkerVerificationDocument[] {
  return workerDocuments
    .filter((d) => d.status === 'Pending')
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export function getPendingEmployerVerifications(
  employerDocuments: EmployerVerificationDocument[],
): EmployerVerificationDocument[] {
  return employerDocuments
    .filter((d) => d.status === 'Pending')
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export function getRecentVerificationHistory(
  workerDocuments: WorkerVerificationDocument[],
  employerDocuments: EmployerVerificationDocument[],
  limit: number = 10,
): Array<
  | { kind: 'worker'; doc: WorkerVerificationDocument }
  | { kind: 'employer'; doc: EmployerVerificationDocument }
> {
  const all: Array<
    | { kind: 'worker'; doc: WorkerVerificationDocument }
    | { kind: 'employer'; doc: EmployerVerificationDocument }
  > = [
    ...workerDocuments
      .filter((d) => d.reviewedAt !== undefined)
      .map((doc) => ({ kind: 'worker' as const, doc })),
    ...employerDocuments
      .filter((d) => d.reviewedAt !== undefined)
      .map((doc) => ({ kind: 'employer' as const, doc })),
  ];
  return all
    .sort((a, b) =>
      (b.doc.reviewedAt ?? '').localeCompare(a.doc.reviewedAt ?? ''),
    )
    .slice(0, limit);
}

/** Status → Vietnamese label, used across UI surfaces. */
export function verificationStatusLabel(s: VerificationStatus): string {
  switch (s) {
    case 'NotSubmitted':
      return 'Chưa gửi';
    case 'Pending':
      return 'Đang chờ duyệt';
    case 'Approved':
      return 'Đã xác minh';
    case 'NeedsMoreInfo':
      return 'Cần bổ sung';
    case 'Rejected':
      return 'Bị từ chối';
  }
}

/** Status → semantic tone for `<Badge>`. */
export function verificationStatusTone(s: VerificationStatus): 'neutral' | 'warning' | 'success' | 'danger' {
  switch (s) {
    case 'NotSubmitted':
      return 'neutral';
    case 'Pending':
      return 'warning';
    case 'Approved':
      return 'success';
    case 'NeedsMoreInfo':
      return 'warning';
    case 'Rejected':
      return 'danger';
  }
}


/**
 * Phase 10A-Fix-1: derive the canonical `EmployerType10A` from an
 * employer record. Falls back to the legacy `employerType` (Phase 6
 * `'individual' | 'business'`) when `employerType10A` is missing — so
 * pre-Fix-1 records render correctly.
 *
 * Returns `undefined` only when the employer has neither field set,
 * which means onboarding is incomplete and the UI should ask the user
 * to choose once.
 *
 * Phase 10A-Fix-2: if the employer has posted at least one shift,
 * the UI should never show the first-set picker — they are an
 * established account that just hasn't migrated through the new
 * model yet. Pass `hasPostedShifts: true` to fall back to a sensible
 * default (`'HouseholdBusiness'`) instead of returning `undefined`.
 */
export function resolveEmployerType(
  employer: {
    employerType10A?: EmployerType10A;
    employerType?: 'individual' | 'business';
  },
  options: { hasPostedShifts?: boolean } = {},
): EmployerType10A | undefined {
  if (employer.employerType10A) return employer.employerType10A;
  if (employer.employerType === 'individual') return 'Individual';
  if (employer.employerType === 'business') return 'HouseholdBusiness';
  // Phase 10A-Fix-2: established accounts (have posted shifts) should
  // never see the first-set picker. Fall back to HouseholdBusiness
  // and let them request a change via the admin queue if needed.
  if (options.hasPostedShifts) return 'HouseholdBusiness';
  return undefined;
}

/**
 * Phase 10A-Fix-1: pending type change request for a specific
 * employer. Used by employer profile UI to show "request submitted"
 * banner and disable the request CTA.
 */
export function getPendingTypeChangeRequest(
  employerId: string,
  requests: EmployerTypeChangeRequest[],
): EmployerTypeChangeRequest | undefined {
  return requests.find(
    (r) => r.employerId === employerId && r.status === 'Pending',
  );
}

/** Phase 10A-Fix-1: pending type-change requests for the admin queue. */
export function getPendingTypeChangeRequests(
  requests: EmployerTypeChangeRequest[],
): EmployerTypeChangeRequest[] {
  return requests
    .filter((r) => r.status === 'Pending')
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}
