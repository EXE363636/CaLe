/**
 * Shared TypeScript types for the CaLẻ / ShiftNow MVP.
 *
 * Conventions:
 *  - IDs are opaque `string`s produced by `lib/ids.ts`.
 *  - Timestamps are ISO 8601 strings (e.g. `2025-01-30T08:15:00.000Z`).
 *  - Calendar dates are `YYYY-MM-DD`.
 *  - Wall-clock times are 24-hour `HH:mm`.
 *  - Currency amounts are integers in Vietnamese Dong (₫).
 *
 * These types back mock data + `localStorage` persistence; no Zod schemas
 * or runtime validators live here.
 */

// ---------------------------------------------------------------------------
// Enums and discriminator unions
// ---------------------------------------------------------------------------

export type Role = 'worker' | 'employer' | 'admin';

export type VerificationFlag = 'phone' | 'id' | 'student';

export type ShiftStatus =
  | 'Draft' // employer created, deposit pending
  | 'Published' // visible on listing
  | 'FullyBooked' // all positions filled, still visible
  | 'InProgress' // at least one approved worker checked in
  | 'AwaitingConfirmation' // worker(s) checked out, employer not confirmed
  | 'Completed' // all assigned workers confirmed
  | 'Cancelled'
  | 'Expired'; // start time passed without check-in

export type EscrowStatus =
  | 'PendingDeposit'
  | 'Deposited'
  | 'InProgress'
  | 'Completed'
  | 'Released'
  | 'Disputed'
  | 'Refunded';

export type ApplicationStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'CancelledByWorker'
  | 'CancellationRequested'
  | 'NoShow'
  | 'CheckedIn'
  | 'CheckedOut'
  | 'Confirmed';

export type DisputeStatus = 'Open' | 'ResolvedReleased' | 'ResolvedRefunded';

export type NotificationKind =
  | 'ApplicationReceived'
  | 'ApplicationApproved'
  | 'ApplicationRejected'
  | 'NoShow'
  | 'ShiftCompletedConfirmed'
  | 'ShiftEdited'
  | 'ShiftCancelled'
  | 'LateCancel'
  | 'WorkerCancelled'
  | 'CancellationRequested'
  | 'CancellationApproved'
  | 'CancellationRejected'
  | 'ReputationAdjusted'
  | 'DisputeResolved';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Fields shared by every user account, regardless of role.
 *
 * `passwordHash` is intentionally a plain string with a `mock-hash:` prefix
 * for the MVP; real hashing is documented as a future security task.
 */
export interface BaseUser {
  id: string;
  role: Role;
  email: string;
  phone: string;
  passwordHash: string;
  suspended: boolean;
  createdAt: string; // ISO 8601
}

export interface Worker extends BaseUser {
  role: 'worker';
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  skills: string[];
  preferredJobTypes: string[];
  preferredLocations: string[];
  /** Subset of 'phone' | 'id' | 'student'. */
  verifications: VerificationFlag[];
  /** Initialized to 100 (Req 8.1); clamped to [0, 100]. */
  reputationScore: number;
  completedShiftCount: number;
  ratingsReceived: Rating[];
  cancellationHistory: CancellationRecord[];
  noShowCount: number;
}

export interface Employer extends BaseUser {
  role: 'employer';
  companyName: string;
  businessType: string;
  description?: string;
  logoUrl?: string;
  verifiedBusiness: boolean;
  /** Boost_Credit balance (Req 11.2). */
  boostCredits: number;
}

export interface Admin extends BaseUser {
  role: 'admin';
  fullName: string;
}

/**
 * Discriminated union over `role`. Narrow with `user.role === 'worker' | ...`.
 */
export type User = Worker | Employer | Admin;

// ---------------------------------------------------------------------------
// Shifts and applications
// ---------------------------------------------------------------------------

export interface Shift {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string;
  /** e.g. 'phục vụ', 'phát tờ rơi', 'kho vận'. */
  jobType: string;
  /** Free text including district. */
  location: string;
  /** Extracted district for filtering. */
  district?: string;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:mm. */
  startTime: string;
  /** HH:mm. */
  endTime: string;
  /** VND per hour. */
  hourlyWage: number;
  positionsTotal: number;
  positionsFilled: number;
  status: ShiftStatus;
  escrowStatus: EscrowStatus;
  /** Computed at creation, frozen thereafter. */
  depositAmount: number;
  createdAt: string;
  updatedAt: string;
  /** Set when the employer used a Boost_Credit on this shift. */
  boostedAt?: string;
}

export interface Application {
  id: string;
  shiftId: string;
  workerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  approvedAt?: string;
  checkInAt?: string;
  checkOutAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: 'OnTime' | 'LateCancel';
  /** hourlyWage * hours, snapshotted at approval. */
  payoutAmount?: number;

  // -------------------------------------------------------------------------
  // Worker cancellation request (Phase 2)
  // -------------------------------------------------------------------------
  /**
   * When the worker filed a `CancellationRequested` (within 3h of start).
   * Cleared on `cancelledAt` once the employer approves the request.
   */
  cancellationRequestedAt?: string;
  /** Free-text reason supplied by the worker on every cancellation flow. */
  cancellationReasonNote?: string;
  /**
   * The application's status immediately before it became
   * `CancellationRequested`. Used to restore state when the employer
   * rejects the request (the application was always `Approved` in practice
   * because Pending applications cancel immediately).
   */
  preCancellationStatus?: 'Approved';
}

export interface Rating {
  id: string;
  shiftId: string;
  applicationId: string;
  /** Employer who issued the rating. */
  fromUserId: string;
  /** Worker being rated. */
  toUserId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  createdAt: string;
  // Ratings are immutable after creation (Req 13.5).
}

export interface CancellationRecord {
  id: string;
  shiftId: string;
  cancelledAt: string;
  type: 'OnTime' | 'LateCancel';
  reasonNote?: string;
}

// ---------------------------------------------------------------------------
// Notifications, disputes, ledger
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  /** Pre-localized Vietnamese title. */
  title: string;
  body: string;
  /** Optional route to navigate to on click. */
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Dispute {
  id: string;
  shiftId: string;
  applicationId: string;
  raisedBy: 'employer' | 'worker';
  reason: string;
  status: DisputeStatus;
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface BoostCreditLedgerEntry {
  id: string;
  employerId: string;
  delta: 1 | -1;
  reason: 'NoShowGrant' | 'ShiftRepost';
  shiftId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Generic Result type
// ---------------------------------------------------------------------------

/**
 * Discriminated union for operations that can fail without throwing.
 *
 * Use the `ok` flag to narrow:
 *
 * ```ts
 * const r: Result<Shift, 'NOT_FOUND'> = ...;
 * if (r.ok) {
 *   r.value; // Shift
 * } else {
 *   r.error; // 'NOT_FOUND'
 * }
 * ```
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
