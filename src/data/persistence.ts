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
  ReviewReport,
  ScheduleBlock,
  Shift,
  ShiftDraft,
  User,
  UserWallet,
  WalletLedgerEntry,
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
export const SCHEMA_VERSION = 19;

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
  /** Phase 10C-Stab-1 Batch 4 J — wallet model. */
  wallets: 'cale.wallets',
  walletLedger: 'cale.walletLedger',
  /** CORE-STABILITY-7 Part 6 — review reports ("Báo cáo đánh giá"). */
  reviewReports: 'cale.reviewReports',
  /** CORE-STABILITY-8 Part 1 — saved create-shift form drafts. */
  shiftDrafts: 'cale.shiftDrafts',
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
  /** Phase 10C-Stab-1 Batch 4 J: per-user wallet aggregates. */
  wallets: UserWallet[];
  /** Phase 10C-Stab-1 Batch 4 J: append-only wallet ledger. */
  walletLedger: WalletLedgerEntry[];
  /** CORE-STABILITY-7 Part 6: review reports. */
  reviewReports: ReviewReport[];
  /** CORE-STABILITY-8 Part 1: saved create-shift form drafts. */
  shiftDrafts: ShiftDraft[];
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
    // Phase 10C-Stab-1 Batch 4 J: wallets + ledger start empty.
    wallets: [],
    walletLedger: [],
    // CORE-STABILITY-7 Part 6: review reports start empty.
    reviewReports: [],
    // CORE-STABILITY-8 Part 1: shift drafts start empty.
    shiftDrafts: [],
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
    wallets: read<UserWallet[]>(STORAGE_KEYS.wallets, seed.wallets),
    walletLedger: read<WalletLedgerEntry[]>(
      STORAGE_KEYS.walletLedger,
      seed.walletLedger,
    ),
    reviewReports: read<ReviewReport[]>(
      STORAGE_KEYS.reviewReports,
      seed.reviewReports,
    ),
    shiftDrafts: read<ShiftDraft[]>(
      STORAGE_KEYS.shiftDrafts,
      seed.shiftDrafts,
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
  write(STORAGE_KEYS.wallets, snapshot.wallets);
  write(STORAGE_KEYS.walletLedger, snapshot.walletLedger);
  write(STORAGE_KEYS.reviewReports, snapshot.reviewReports);
  write(STORAGE_KEYS.shiftDrafts, snapshot.shiftDrafts);
}

// ---------------------------------------------------------------------------
// Phase 10C-Stab-1 Batch 2 — admin snapshot export/import dev utility
// ---------------------------------------------------------------------------

/**
 * Result discriminator used by the admin export/import flow. Mirrors
 * the convention used by the Zustand stores so the admin dashboard can
 * `result.ok` / `result.error` against it.
 */
export type SnapshotResult<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Error codes returned by `importSnapshot`. */
export type ImportSnapshotError =
  | 'INVALID_JSON'
  | 'VERSION_MISMATCH'
  | 'INVALID_PAYLOAD';

/**
 * Wire shape of the JSON document produced by `exportSnapshot`. The
 * payload is keyed by the canonical `STORAGE_KEYS.*` storage key strings
 * so the importer can iterate without relying on a fixed property
 * ordering. The version stamp + ISO export timestamp make the file
 * self-describing for QA / dev use.
 */
export interface SnapshotDocument {
  version: number;
  exportedAt: string;
  payload: Record<string, unknown>;
}

/** Storage keys included in the snapshot document. */
const SNAPSHOT_KEYS: ReadonlyArray<string> = Object.values(STORAGE_KEYS).filter(
  (k) => k !== STORAGE_KEYS.schemaVersion,
);

/**
 * Serialise every persisted slice into a single JSON string. Reads
 * each slice via `read(...)` (which falls back to the seed when the
 * slice has never been written), so the export works even on the
 * server (returns the seed snapshot) — though the admin dashboard
 * only ever invokes it from a Client Component.
 *
 * The output is pretty-printed so a human can diff snapshots in the
 * filesystem.
 */
export function exportSnapshot(): string {
  const seed = seedSnapshot();
  const seedByKey: Record<string, unknown> = {
    [STORAGE_KEYS.auth]: seed.auth,
    [STORAGE_KEYS.users]: seed.users,
    [STORAGE_KEYS.shifts]: seed.shifts,
    [STORAGE_KEYS.applications]: seed.applications,
    [STORAGE_KEYS.ratings]: seed.ratings,
    [STORAGE_KEYS.notifications]: seed.notifications,
    [STORAGE_KEYS.disputes]: seed.disputes,
    [STORAGE_KEYS.boostLedger]: seed.boostLedger,
    [STORAGE_KEYS.scheduleBlocks]: seed.scheduleBlocks,
    [STORAGE_KEYS.employerFeedback]: seed.employerFeedback,
    [STORAGE_KEYS.workerVerifications]: seed.workerVerifications,
    [STORAGE_KEYS.employerVerifications]: seed.employerVerifications,
    [STORAGE_KEYS.employerTypeChangeRequests]:
      seed.employerTypeChangeRequests,
    [STORAGE_KEYS.wallets]: seed.wallets,
    [STORAGE_KEYS.walletLedger]: seed.walletLedger,
    [STORAGE_KEYS.reviewReports]: seed.reviewReports,
    [STORAGE_KEYS.shiftDrafts]: seed.shiftDrafts,
  };

  const payload: Record<string, unknown> = {};
  for (const key of SNAPSHOT_KEYS) {
    payload[key] = read<unknown>(key, seedByKey[key]);
  }

  const document: SnapshotDocument = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    payload,
  };
  return JSON.stringify(document, null, 2);
}

/**
 * Parse + validate + persist a snapshot JSON document. Returns
 * `Result<{ keysImported }, ImportSnapshotError>` so the admin
 * dashboard can show a precise localized error.
 *
 * Validation order:
 *   1. JSON parse — `'INVALID_JSON'` on syntax error.
 *   2. Top-level shape — must be a non-null object with numeric
 *      `version` and a `payload` object: `'INVALID_PAYLOAD'`.
 *   3. Version match — `SCHEMA_VERSION`: `'VERSION_MISMATCH'`.
 *   4. Each slice value must be present in `payload`. Missing keys
 *      → `'INVALID_PAYLOAD'`.
 *
 * On success, writes every slice (and stamps the schema version)
 * before returning. The caller is expected to refresh the page so
 * Zustand re-hydrates from the new state — we do not push the data
 * into stores from inside this module to avoid the persistence
 * layer pulling on Zustand.
 */
export function importSnapshot(
  json: string,
): SnapshotResult<{ keysImported: string[] }, ImportSnapshotError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'INVALID_JSON' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return { ok: false, error: 'INVALID_PAYLOAD' };
  }

  const document = parsed as Partial<SnapshotDocument>;
  if (typeof document.version !== 'number') {
    return { ok: false, error: 'INVALID_PAYLOAD' };
  }
  if (document.version !== SCHEMA_VERSION) {
    return { ok: false, error: 'VERSION_MISMATCH' };
  }

  const payload = document.payload;
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return { ok: false, error: 'INVALID_PAYLOAD' };
  }

  for (const key of SNAPSHOT_KEYS) {
    if (!(key in payload)) {
      return { ok: false, error: 'INVALID_PAYLOAD' };
    }
  }

  // Persist after every gate has passed so a partial / failed import
  // never half-rewrites localStorage.
  if (isBrowser()) {
    write(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION);
    for (const key of SNAPSHOT_KEYS) {
      write(key, (payload as Record<string, unknown>)[key]);
    }
  }

  return { ok: true, value: { keysImported: [...SNAPSHOT_KEYS] } };
}
