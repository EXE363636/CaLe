/**
 * QA-Automation-1 — shared constants for the E2E suite.
 *
 * Keep these in sync with `src/data/persistence.ts` (SCHEMA_VERSION,
 * STORAGE_KEYS) and `src/stores/authStore.ts` (password scheme). They
 * are duplicated here (not imported) so the e2e bundle stays free of
 * the app's module graph / path aliases.
 */

/** Must match `SCHEMA_VERSION` in src/data/persistence.ts. */
export const SCHEMA_VERSION = 11;

/** Must match `STORAGE_KEYS` in src/data/persistence.ts. */
export const STORAGE_KEYS = {
  schemaVersion: 'cale.schemaVersion',
  auth: 'cale.auth',
  users: 'cale.users',
  shifts: 'cale.shifts',
  applications: 'cale.applications',
  ratings: 'cale.ratings',
  notifications: 'cale.notifications',
  disputes: 'cale.disputes',
  boostLedger: 'cale.boostLedger',
  scheduleBlocks: 'cale.scheduleBlocks',
  employerFeedback: 'cale.employerFeedback',
  workerVerifications: 'cale.workerVerifications',
  employerVerifications: 'cale.employerVerifications',
  employerTypeChangeRequests: 'cale.employerTypeChangeRequests',
  wallets: 'cale.wallets',
  walletLedger: 'cale.walletLedger',
  reviewReports: 'cale.reviewReports',
  shiftDrafts: 'cale.shiftDrafts',
} as const;

/**
 * Deterministic demo password. The seed users carry
 * `passwordHash: "mock-hash:demo"`, and `authStore.login` checks
 * `mock-hash:${password}` — so the literal password is `demo`.
 */
export const DEMO_PASSWORD = 'demo';

/** Deterministic demo account emails (subset of src/data/seed/users.json). */
export const ACCOUNTS = {
  employer: {
    id: 'employer-001',
    email: 'lien@quanphoha.vn',
    password: DEMO_PASSWORD,
  },
  worker: {
    id: 'worker-001',
    email: 'an.nguyen@gmail.com',
    password: DEMO_PASSWORD,
  },
  admin: {
    id: 'admin-001',
    email: 'admin@cale.vn',
    password: DEMO_PASSWORD,
  },
} as const;

/**
 * Deterministic wall-clock anchor used by clock-controlled tests.
 * Chosen as a fixed weekday noon in Asia/Ho_Chi_Minh so derived
 * date/time strings never roll across midnight.
 */
export const ANCHOR_ISO = '2027-06-02T05:00:00.000Z'; // 12:00 ICT (UTC+7)
