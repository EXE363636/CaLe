/**
 * localStorage persistence layer for the CaLẻ / ShiftNow MVP.
 *
 * Pure TypeScript with light DOM access — no React, no Next imports. The
 * module is safe to import from both Server and Client Components: every
 * `localStorage` access is guarded with `typeof window === 'undefined'`
 * checks, so SSR returns the seed snapshot rather than crashing.
 *
 * On first load, or whenever the persisted `cale.schemaVersion` does not
 * match the current `SCHEMA_VERSION`, the cached data is discarded and the
 * seed JSON files (committed under `src/data/seed/`) are written back as
 * the new starting state. This keeps demo data fresh across app upgrades
 * without the user having to clear storage manually.
 */

import type {
  Application,
  BoostCreditLedgerEntry,
  Dispute,
  EmployerFeedback,
  EmployerTypeChangeRequest,
  EmployerVerificationDocument,
  Notification,
  Rating,
  ScheduleBlock,
  Shift,
  User,
  WorkerVerificationDocument,
} from '@/types';

import applicationsSeed from './seed/applications.json';
import boostLedgerSeed from './seed/boostLedger.json';
import disputesSeed from './seed/disputes.json';
import employerFeedbackSeed from './seed/employerFeedback.json';
import notificationsSeed from './seed/notifications.json';
import ratingsSeed from './seed/ratings.json';
import shiftsSeed from './seed/shifts.json';
import usersSeed from './seed/users.json';
import verificationsSeed from './seed/verifications.json';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Bumped whenever the persisted shape changes; triggers an automatic reseed. */
export const SCHEMA_VERSION = 6;

/** Every key the app writes to localStorage, namespaced under `cale.`. */
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
} as const;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Authentication slice persisted between sessions. */
export interface AuthState {
  /** ID of the logged-in user, or `null` when nobody is signed in. */
  currentUserId: string | null;
  /** ISO 8601 timestamp of the user's last activity (used for idle timeout). */
  lastActivityAt: string | null;
}

/** Full application snapshot — what stores hydrate from on boot. */
export interface Snapshot {
  auth: AuthState;
  users: User[];
  shifts: Shift[];
  applications: Application[];
  ratings: Rating[];
  notifications: Notification[];
  disputes: Dispute[];
  boostLedger: BoostCreditLedgerEntry[];
  /** Phase 5: worker-owned personal busy blocks. */
  scheduleBlocks: ScheduleBlock[];
  /** Phase 6: worker → employer feedback records. */
  employerFeedback: EmployerFeedback[];
  /** Phase 10A: worker identity-verification submissions. */
  workerVerifications: WorkerVerificationDocument[];
  /** Phase 10A: employer verification submissions. */
  employerVerifications: EmployerVerificationDocument[];
  /** Phase 10A-Fix-1: pending/decided employer type change requests. */
  employerTypeChangeRequests: EmployerTypeChangeRequest[];
}

// ---------------------------------------------------------------------------
// Seed snapshot
// ---------------------------------------------------------------------------

/**
 * Build a fresh snapshot from the bundled seed JSON files.
 *
 * The casts are necessary because TypeScript widens JSON literals to plain
 * `string` rather than the discriminated unions on our domain types
 * (`role: 'worker' | 'employer' | 'admin'`, `status: ApplicationStatus`,
 * etc.). The seed files are hand-authored to match those unions, so the
 * `as unknown as T[]` cast is sound.
 */
export function seedSnapshot(): Snapshot {
  return {
    auth: { currentUserId: null, lastActivityAt: null },
    users: usersSeed as unknown as User[],
    shifts: shiftsSeed as unknown as Shift[],
    applications: applicationsSeed as unknown as Application[],
    ratings: ratingsSeed as unknown as Rating[],
    notifications: notificationsSeed as unknown as Notification[],
    disputes: disputesSeed as unknown as Dispute[],
    boostLedger: boostLedgerSeed as unknown as BoostCreditLedgerEntry[],
    // Phase 5: schedule blocks start empty — workers add their own.
    scheduleBlocks: [],
    // Phase 6: employer feedback seeded (Phase 9I) so worker → employer
    // reviews are visible on the shift detail and employer profile right
    // after a fresh reseed; new feedback still gets appended at runtime.
    employerFeedback: employerFeedbackSeed as unknown as EmployerFeedback[],
    // Phase 10A: verification submissions seeded so the admin queue and
    // the worker / employer profile verification sections have data on
    // first paint. Cast through `unknown` because the JSON literal types
    // are wider than the discriminated unions in `types/index.ts`.
    workerVerifications:
      verificationsSeed.workerDocuments as unknown as WorkerVerificationDocument[],
    employerVerifications:
      verificationsSeed.employerDocuments as unknown as EmployerVerificationDocument[],
    // Phase 10A-Fix-1: type-change requests start empty; employers
    // submit them at runtime.
    employerTypeChangeRequests: [],
  };
}

// ---------------------------------------------------------------------------
// Low-level read / write
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Read a JSON value from localStorage, returning `fallback` on:
 *  - server-side rendering,
 *  - a missing key,
 *  - a parse error,
 *  - any unexpected exception (e.g. private-browsing storage access denied).
 */
export function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[persistence] failed to read ${key}; using fallback`, err);
    return fallback;
  }
}

/**
 * Write a JSON value to localStorage. No-op on the server. Errors (quota
 * exceeded, security exceptions) are logged but do not throw — the in-memory
 * Zustand state remains the source of truth for the running session.
 */
export function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[persistence] failed to write ${key}`, err);
  }
}

// ---------------------------------------------------------------------------
// Bulk load / save
// ---------------------------------------------------------------------------

/**
 * Load the full snapshot.
 *
 * Behaviour:
 *  1. On the server, return the seed snapshot directly so SSR pages can
 *     render meaningful content.
 *  2. On the client, compare the persisted `cale.schemaVersion` to
 *     `SCHEMA_VERSION`. On mismatch (or first load), write the seed
 *     snapshot back to localStorage and return it.
 *  3. Otherwise read each slice with the corresponding seed array as
 *     fallback, so a partially-cleared storage still hydrates cleanly.
 */
export function loadAll(): Snapshot {
  const seed = seedSnapshot();
  if (!isBrowser()) return seed;

  const storedVersion = read<number | null>(STORAGE_KEYS.schemaVersion, null);
  if (storedVersion !== SCHEMA_VERSION) {
    persistAll(seed);
    return seed;
  }

  return {
    auth: read<AuthState>(STORAGE_KEYS.auth, seed.auth),
    users: read<User[]>(STORAGE_KEYS.users, seed.users),
    shifts: read<Shift[]>(STORAGE_KEYS.shifts, seed.shifts),
    applications: read<Application[]>(STORAGE_KEYS.applications, seed.applications),
    ratings: read<Rating[]>(STORAGE_KEYS.ratings, seed.ratings),
    notifications: read<Notification[]>(STORAGE_KEYS.notifications, seed.notifications),
    disputes: read<Dispute[]>(STORAGE_KEYS.disputes, seed.disputes),
    boostLedger: read<BoostCreditLedgerEntry[]>(STORAGE_KEYS.boostLedger, seed.boostLedger),
    scheduleBlocks: read<ScheduleBlock[]>(
      STORAGE_KEYS.scheduleBlocks,
      seed.scheduleBlocks,
    ),
    employerFeedback: read<EmployerFeedback[]>(
      STORAGE_KEYS.employerFeedback,
      seed.employerFeedback,
    ),
    workerVerifications: read<WorkerVerificationDocument[]>(
      STORAGE_KEYS.workerVerifications,
      seed.workerVerifications,
    ),
    employerVerifications: read<EmployerVerificationDocument[]>(
      STORAGE_KEYS.employerVerifications,
      seed.employerVerifications,
    ),
    employerTypeChangeRequests: read<EmployerTypeChangeRequest[]>(
      STORAGE_KEYS.employerTypeChangeRequests,
      seed.employerTypeChangeRequests,
    ),
  };
}

/**
 * Write the full snapshot back to localStorage. No-op on the server.
 *
 * Stores typically call this after every mutation. The schema version is
 * stamped first so a partially-completed write does not orphan the slices
 * under an old version number.
 */
export function persistAll(snapshot: Snapshot): void {
  if (!isBrowser()) return;
  write(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION);
  write(STORAGE_KEYS.auth, snapshot.auth);
  write(STORAGE_KEYS.users, snapshot.users);
  write(STORAGE_KEYS.shifts, snapshot.shifts);
  write(STORAGE_KEYS.applications, snapshot.applications);
  write(STORAGE_KEYS.ratings, snapshot.ratings);
  write(STORAGE_KEYS.notifications, snapshot.notifications);
  write(STORAGE_KEYS.disputes, snapshot.disputes);
  write(STORAGE_KEYS.boostLedger, snapshot.boostLedger);
  write(STORAGE_KEYS.scheduleBlocks, snapshot.scheduleBlocks);
  write(STORAGE_KEYS.employerFeedback, snapshot.employerFeedback);
  write(STORAGE_KEYS.workerVerifications, snapshot.workerVerifications);
  write(STORAGE_KEYS.employerVerifications, snapshot.employerVerifications);
  write(
    STORAGE_KEYS.employerTypeChangeRequests,
    snapshot.employerTypeChangeRequests,
  );
}
