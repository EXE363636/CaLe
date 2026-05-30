/**
 * QA-Automation-1 — deterministic seed/reset helpers.
 *
 * The app is a localStorage-only Next.js MVP. These builders produce
 * a minimal, valid `Snapshot`-shaped object that the app's
 * `loadAll()` reads on boot. Tests inject it via `addInitScript`
 * BEFORE the app's `AppHydrator` runs, so the stores hydrate from our
 * deterministic state instead of the bundled demo JSON.
 *
 * No clock dependence: every timestamp is an explicit ISO string.
 * Tests that exercise time-sensitive UI control the clock via
 * Playwright's `page.clock` (see `e2e/fixtures/test.ts`).
 */

import { SCHEMA_VERSION, STORAGE_KEYS, ACCOUNTS } from './constants';

// Minimal structural types — intentionally loose so the e2e bundle
// does not depend on the app's `@/types` module graph.
type Json = Record<string, unknown>;

export interface SeedSnapshot {
  auth: { currentUserId: string | null; lastActivityAt: string | null };
  users: Json[];
  shifts: Json[];
  applications: Json[];
  ratings: Json[];
  notifications: Json[];
  disputes: Json[];
  boostLedger: Json[];
  scheduleBlocks: Json[];
  employerFeedback: Json[];
  workerVerifications: Json[];
  employerVerifications: Json[];
  employerTypeChangeRequests: Json[];
  wallets: Json[];
  walletLedger: Json[];
  reviewReports: Json[];
  shiftDrafts: Json[];
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildEmployer(over: Json = {}): Json {
  return {
    id: ACCOUNTS.employer.id,
    role: 'employer',
    email: ACCOUNTS.employer.email,
    phone: '+84902111001',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-02-10T09:00:00.000Z',
    companyName: 'Quán Phở Hà',
    businessType: 'Nhà hàng / Quán ăn',
    description: 'Quán phở gia đình tại Quận 1.',
    logoUrl: '',
    verifiedBusiness: true,
    boostCredits: 1,
    employerType10A: 'HouseholdBusiness',
    ...over,
  };
}

export function buildWorker(over: Json = {}): Json {
  return {
    id: ACCOUNTS.worker.id,
    role: 'worker',
    email: ACCOUNTS.worker.email,
    phone: '+84905444001',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-02-20T11:00:00.000Z',
    fullName: 'Nguyễn Văn An',
    avatarUrl: '',
    bio: 'Người lao động linh hoạt.',
    skills: ['phục vụ', 'thu ngân'],
    preferredJobTypes: ['Phục vụ', 'Thu ngân'],
    preferredLocations: ['Quận 1, TP.HCM'],
    verifications: ['phone', 'id'],
    reputationScore: 90,
    completedShiftCount: 3,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
    skillScores: [],
    ...over,
  };
}

export function buildAdmin(over: Json = {}): Json {
  return {
    id: ACCOUNTS.admin.id,
    role: 'admin',
    email: ACCOUNTS.admin.email,
    phone: '+84901000001',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-01-05T08:00:00.000Z',
    fullName: 'Quản trị viên ShiftNow',
    ...over,
  };
}

/**
 * Three approved employer-verification docs so the
 * `computePostingReadiness` gate (HouseholdBusiness →
 * RepresentativeId + BusinessLicense + StorefrontPhoto) passes and
 * `simulateDeposit` can publish a shift.
 */
export function buildEmployerVerificationDocs(
  employerId = ACCOUNTS.employer.id,
): Json[] {
  const base = {
    employerId,
    employerType: 'HouseholdBusiness',
    status: 'Approved',
    submittedAt: '2026-02-11T09:00:00.000Z',
    reviewedAt: '2026-02-12T09:00:00.000Z',
  };
  return [
    { ...base, id: 'evd-rep', documentType: 'RepresentativeId', displayLabel: 'CCCD' },
    { ...base, id: 'evd-biz', documentType: 'BusinessLicense', displayLabel: 'GPKD' },
    { ...base, id: 'evd-store', documentType: 'StorefrontPhoto', displayLabel: 'Ảnh mặt bằng' },
  ];
}

let shiftCounter = 0;
export function buildShift(over: Json = {}): Json {
  shiftCounter += 1;
  return {
    id: `e2e-shift-${shiftCounter}`,
    employerId: ACCOUNTS.employer.id,
    title: 'Phục vụ quán phở giờ trưa',
    description: 'Phục vụ khách, dọn bàn và hỗ trợ thu ngân.',
    requirements: 'Nhanh nhẹn, lễ phép.',
    jobType: 'Phục vụ',
    location: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2027-06-10',
    startTime: '11:00',
    endTime: '14:00',
    hourlyWage: 45000,
    positionsTotal: 2,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 270000,
    createdAt: '2027-06-01T09:00:00.000Z',
    updatedAt: '2027-06-01T10:00:00.000Z',
    evidenceRequirement: 'OptionalPhoto',
    timeline: [],
    ...over,
  };
}

let appCounter = 0;
export function buildApplication(over: Json = {}): Json {
  appCounter += 1;
  return {
    id: `e2e-app-${appCounter}`,
    shiftId: 'e2e-shift-1',
    workerId: ACCOUNTS.worker.id,
    status: 'Pending',
    appliedAt: '2027-06-02T03:00:00.000Z',
    ...over,
  };
}

export function buildScheduleBlock(over: Json = {}): Json {
  return {
    id: `e2e-block-${Math.random().toString(36).slice(2, 8)}`,
    userId: ACCOUNTS.worker.id,
    date: '2027-06-10',
    startTime: '13:40',
    endTime: '13:45',
    label: 'Lịch cá nhân',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Snapshot assembly
// ---------------------------------------------------------------------------

/**
 * Build a complete snapshot. Defaults give a verified employer + a
 * phone+id-verified worker + an admin, no shifts/applications.
 * Callers pass `over` to inject the precondition state for a test.
 */
export function buildSnapshot(over: Partial<SeedSnapshot> = {}): SeedSnapshot {
  return {
    auth: { currentUserId: null, lastActivityAt: null },
    users: [buildEmployer(), buildWorker(), buildAdmin()],
    shifts: [],
    applications: [],
    ratings: [],
    notifications: [],
    disputes: [],
    boostLedger: [],
    scheduleBlocks: [],
    employerFeedback: [],
    workerVerifications: [],
    employerVerifications: buildEmployerVerificationDocs(),
    employerTypeChangeRequests: [],
    wallets: [],
    walletLedger: [],
    reviewReports: [],
    shiftDrafts: [],
    ...over,
  };
}

/**
 * Reset the per-file id counters so ids are stable run-to-run within
 * a worker. Call in `test.beforeEach` if a spec relies on exact ids.
 */
export function resetSeedCounters(): void {
  shiftCounter = 0;
  appCounter = 0;
}

/**
 * The payload + key map an `addInitScript` uses to write the snapshot
 * into `localStorage`. Returns a plain object so it serialises across
 * the Playwright init-script boundary.
 */
export function toLocalStoragePayload(
  snapshot: SeedSnapshot,
): { schemaVersion: number; entries: Array<[string, string]> } {
  const entries: Array<[string, string]> = [
    [STORAGE_KEYS.schemaVersion, JSON.stringify(SCHEMA_VERSION)],
    [STORAGE_KEYS.auth, JSON.stringify(snapshot.auth)],
    [STORAGE_KEYS.users, JSON.stringify(snapshot.users)],
    [STORAGE_KEYS.shifts, JSON.stringify(snapshot.shifts)],
    [STORAGE_KEYS.applications, JSON.stringify(snapshot.applications)],
    [STORAGE_KEYS.ratings, JSON.stringify(snapshot.ratings)],
    [STORAGE_KEYS.notifications, JSON.stringify(snapshot.notifications)],
    [STORAGE_KEYS.disputes, JSON.stringify(snapshot.disputes)],
    [STORAGE_KEYS.boostLedger, JSON.stringify(snapshot.boostLedger)],
    [STORAGE_KEYS.scheduleBlocks, JSON.stringify(snapshot.scheduleBlocks)],
    [STORAGE_KEYS.employerFeedback, JSON.stringify(snapshot.employerFeedback)],
    [STORAGE_KEYS.workerVerifications, JSON.stringify(snapshot.workerVerifications)],
    [STORAGE_KEYS.employerVerifications, JSON.stringify(snapshot.employerVerifications)],
    [STORAGE_KEYS.employerTypeChangeRequests, JSON.stringify(snapshot.employerTypeChangeRequests)],
    [STORAGE_KEYS.wallets, JSON.stringify(snapshot.wallets)],
    [STORAGE_KEYS.walletLedger, JSON.stringify(snapshot.walletLedger)],
    [STORAGE_KEYS.reviewReports, JSON.stringify(snapshot.reviewReports)],
    [STORAGE_KEYS.shiftDrafts, JSON.stringify(snapshot.shiftDrafts)],
  ];
  return { schemaVersion: SCHEMA_VERSION, entries };
}
