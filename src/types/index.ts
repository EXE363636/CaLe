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
  /**
   * Phase 10A-Fix-7: terminal state for an approved (or later) worker
   * whose shift was cancelled by the employer. Worker is NOT penalised
   * — no reputation drop, no quota tick. The status exists so worker-
   * facing UI can show "Đã hủy bởi nhà tuyển dụng" instead of the
   * stigmatising "CancelledByWorker" framing, and so cancel buttons
   * never reappear on a card the worker had no part in cancelling.
   */
  | 'CancelledByEmployer'
  /**
   * Phase 10A-Fix-10: terminal state for a `Pending` application that
   * the employer never approved before the shift started (or the shift
   * moved into a non-recruitable status). Worker is NOT penalised
   * — no reputation drop, no quota tick. UI shows "Đã hết hạn" with
   * the helper "Ca đã bắt đầu nên đơn ứng tuyển không còn hiệu lực."
   */
  | 'Expired'
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
  | 'EmployerFeedbackReceived'
  | 'DisputeResolved'
  /**
   * Phase 10A-Fix-7: worker received employer-cancellation protection.
   * Title: "Ca làm đã bị hủy bởi nhà tuyển dụng".
   */
  | 'EmployerCancelledShift'
  /**
   * Phase 10A-Fix-10: worker's Pending application expired because
   * the shift started before the employer approved it.
   * Title: "Đơn ứng tuyển đã hết hạn".
   */
  | 'ApplicationExpired';

/**
 * Phase 6: classification of an employer account. Individual / freelance
 * employers do not need a registered business; business employers may be
 * verified for higher trust. The value is mock — there is no real business
 * verification flow in the MVP.
 */
export type EmployerType = 'individual' | 'business';

/**
 * Phase 6: trust tier derived from `verifiedBusiness` + completed-shifts
 * history. Drives the employer's deposit ratio when posting a new shift.
 */
export type EmployerTrustLevel = 'low' | 'medium' | 'high';

/** Phase 6: optional fixed-vocabulary tags on a worker → employer feedback. */
export type EmployerFeedbackTag =
  | 'PaidOnTime'
  | 'GoodEnvironment'
  | 'ClearCommunication'
  | 'AccurateDescription';

// ---------------------------------------------------------------------------
// Phase 10A — verification model
// ---------------------------------------------------------------------------

/**
 * Lifecycle of every verification document submission. `NotSubmitted` is
 * the implicit pre-state used by selectors when no record exists yet.
 */
export type VerificationStatus =
  | 'NotSubmitted'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'NeedsMoreInfo';

/**
 * Worker identity-verification methods. The MVP accepts any one of the
 * three — workers are NOT required to submit CCCD specifically. Each
 * choice opens a separate `WorkerVerificationDocument` record so admins
 * can review them independently.
 */
export type WorkerIdentityDocumentType =
  | 'NationalId'    // CCCD / CMND
  | 'StudentCard'   // thẻ sinh viên
  | 'DriverLicense'; // bằng lái xe

/**
 * Mock-only identity-document submission. Image fields are URL strings or
 * file names; in the MVP they are placeholder values, never real uploads.
 * `maskedIdentifier` is the publicly-visible partial number (e.g.
 * `0791•••••456`) — admins see the full mock identifier inline; workers
 * and employers only see the masked form.
 */
export interface WorkerVerificationDocument {
  id: string;
  workerId: string;
  documentType: WorkerIdentityDocumentType;
  status: VerificationStatus;
  /** Vietnamese display label for the document type. */
  displayLabel: string;
  /** Full identifier (admin-only). */
  fullIdentifier?: string;
  /** Public-safe masked form. */
  maskedIdentifier?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  rejectionReason?: string;
  notes?: string;
  /** Mock URL or file name — no real upload in the MVP. */
  mockFrontImageUrl?: string;
  mockBackImageUrl?: string;
  mockSelfieImageUrl?: string;
  /** Optional human-readable label for the verification method. */
  verificationMethodLabel?: string;
}

/**
 * Phase 10A widens `EmployerType` from the Phase 6 binary
 * (`'individual' | 'business'`) to four real-market account shapes.
 * `'individual'` and `'business'` remain valid backwards-compat aliases —
 * the new values let the employer-verification UI request the correct
 * documents per shape.
 */
export type EmployerType10A =
  | 'Individual'
  | 'HouseholdBusiness'
  | 'Company'
  | 'AgencyEvent';

/**
 * Document types the employer-verification flow can collect. The
 * required subset depends on the employer's `EmployerType10A`:
 *
 *   - `Individual`         → RepresentativeId + (StorefrontPhoto |
 *                            WorkplacePhoto | AddressProof)
 *   - `HouseholdBusiness`  → RepresentativeId + (BusinessLicense |
 *                            TaxCode) + StorefrontPhoto
 *   - `Company`            → BusinessLicense + TaxCode +
 *                            (StorefrontPhoto | AddressProof)
 *   - `AgencyEvent`        → BusinessLicense + EventProof +
 *                            (WorkplacePhoto | GoogleMapsOrFanpage)
 *
 * All values are optional in the model; the UI enforces "at least one
 * identity proof + at least one workplace proof" client-side.
 */
export type EmployerVerificationDocumentType =
  | 'RepresentativeId'
  | 'BusinessLicense'
  | 'TaxCode'
  | 'StorefrontPhoto'
  | 'WorkplacePhoto'
  | 'EventProof'
  | 'AddressProof'
  | 'GoogleMapsOrFanpage';

export interface EmployerVerificationDocument {
  id: string;
  employerId: string;
  /** The employer's account shape at time of submission. */
  employerType: EmployerType10A;
  documentType: EmployerVerificationDocumentType;
  status: VerificationStatus;
  displayLabel: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  rejectionReason?: string;
  notes?: string;
  /** Mock URL or file name — no real upload in the MVP. */
  mockFileName?: string;
  mockImageUrl?: string;
}

/**
 * Trust badges derived by the verification store from the entity's
 * approved documents + verification flags. UI components render badges
 * straight from this list — they don't run their own derivation.
 */
export type WorkerTrustBadge =
  | 'PhoneVerified'
  | 'IdentityVerified'
  | 'StudentVerified'
  | 'DriverLicenseVerified';

export type EmployerTrustBadge =
  | 'PhoneVerified'
  | 'IdentityVerified'
  | 'BusinessVerified'
  | 'WorkplaceProvided'
  | 'DepositRequired'
  | 'TrustedEmployer';

export interface WorkerVerificationSummary {
  workerId: string;
  /** Identity verified iff at least one identity-doc record is `Approved`. */
  identityVerified: boolean;
  /** The single approved method label (most-recent), if any. */
  primaryMethod?: WorkerIdentityDocumentType;
  /** Display label of the primary approved method, public-safe. */
  primaryMethodLabel?: string;
  /** Public-safe masked identifier of the primary approved method. */
  maskedIdentifier?: string;
  /**
   * Phase 10A-Fix-5 — every approved identity method, not just the
   * primary. Employer-facing surfaces render one chip per entry so a
   * worker who has approved CCCD + student card + driver license is
   * shown all three, not just the most-recently-reviewed one.
   * Each entry is public-safe — masked identifier only, no raw
   * fullIdentifier or image URLs.
   */
  approvedMethods: Array<{
    type: WorkerIdentityDocumentType;
    label: string;
    maskedIdentifier?: string;
  }>;
  badges: WorkerTrustBadge[];
  /** Pending / NeedsMoreInfo count for admin queue triage. */
  pendingCount: number;
}

export interface EmployerVerificationSummary {
  employerId: string;
  employerType: EmployerType10A;
  identityVerified: boolean;
  businessVerified: boolean;
  workplaceProvided: boolean;
  badges: EmployerTrustBadge[];
  pendingCount: number;
}

/**
 * Phase 10A-Fix-1: employer type change request.
 *
 * Employer cannot directly change their account type after onboarding.
 * They submit a request that an admin reviews from the verification
 * queue. On approval the store rewrites the employer's
 * `employerType10A` field; on rejection nothing changes.
 *
 * One Pending request per employer at a time — re-submitting while a
 * Pending request exists returns `ALREADY_PENDING`.
 */
export interface EmployerTypeChangeRequest {
  id: string;
  employerId: string;
  currentType: EmployerType10A;
  requestedType: EmployerType10A;
  /** Required reason from the employer. */
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  /** Admin's decision reason (rejection only). */
  adminReason?: string;
}

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
  /**
   * Phase 10A-Fix-7 — protection events credited to the worker (e.g.
   * an employer cancelled a shift after approval). Optional for
   * back-compat; pre-Fix-7 worker records read this as `[]`.
   */
  protections?: WorkerProtectionRecord[];
  /**
   * Phase 10A-Fix-9 — per-job-type skill scores. Separate from
   * `reputationScore`. Updated when the employer rates a confirmed
   * shift via `confirmCompletion`. Optional / back-compat: pre-Fix-9
   * worker records read this as `[]`.
   */
  skillScores?: WorkerSkillScore[];
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
  /**
   * Phase 6: account classification. Defaults to `'business'` for
   * pre-Phase-6 records that don't carry the field yet (handled in the
   * register flow / hydration so existing seed data stays valid).
   */
  employerType?: EmployerType;
  /**
   * Phase 10A-Fix-1: canonical 4-value account shape used by the
   * verification flow. Locked after onboarding — employers must submit
   * an `EmployerTypeChangeRequest` to change it.
   *
   * When this field is missing, the UI infers a reasonable default
   * from the legacy `employerType` (Phase 6: `'individual'` → `'Individual'`,
   * `'business'` → `'HouseholdBusiness'`). The first time the employer
   * confirms a type the store writes this field and the UI locks
   * subsequent edits.
   */
  employerType10A?: EmployerType10A;
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

  /**
   * Phase 10A-Fix-3 — workplace imagery + on-site contact info.
   *
   * `workplaceImageUrl` is intended for a real upload eventually; in the
   * MVP only `workplaceImageLabel` (a mock filename or short caption)
   * is rendered to workers. The field is public-safe — these are
   * storefront / event photos meant to help workers judge whether the
   * job and location look real before applying.
   *
   * `requiresVerifiedDocumentOnArrival` is a simple boolean flag
   * surfaced on the worker-facing shift detail; when true, workers are
   * reminded to bring an approved CCCD / student card / driver license.
   * Independent from the worker's stored verification — the employer
   * may want a fresh on-site check.
   */
  workplaceImageUrl?: string;
  workplaceImageLabel?: string;
  workplaceNotes?: string;
  onSiteContactName?: string;
  onSiteContactPhone?: string;
  requiresVerifiedDocumentOnArrival?: boolean;

  /**
   * Phase 10A-Fix-7: employer cancellation metadata. All fields are
   * undefined unless the shift was cancelled by the employer; even
   * then `employerCancellationPenaltyAmount` may be 0 if no workers
   * were ever approved (no penalty owed).
   */
  cancelledAt?: string;
  cancelledBy?: 'employer' | 'admin';
  employerCancellationReason?: string;
  /** True when at least one worker was Approved/CheckedIn/CheckedOut/Confirmed/CancellationRequested at cancel time. */
  employerCancelledAfterApproval?: boolean;
  /** 0.05, 0.10, or 0.15 depending on time gap to start. 0 when no penalty applies. */
  employerCancellationPenaltyRate?: number;
  /** VND amount = round(depositAmount * rate). */
  employerCancellationPenaltyAmount?: number;
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

  /**
   * Phase 6: required reason supplied by the employer when rejecting a
   * `Pending` application. Mirrored into the worker's
   * `ApplicationRejected` notification so they can see why.
   */
  rejectionReason?: string;

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

  /**
   * Phase 10A-Fix-10: when an unapproved Pending application transitions
   * to `'Expired'` because the shift started, we stamp these so the
   * worker / employer / admin can audit the lifecycle event later.
   */
  expiredAt?: string;
  expiredReason?: string;
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

/**
 * Phase 10A-Fix-7 — record of a "system gave the worker the benefit of
 * the doubt" event. Currently only one trigger: an employer cancelled
 * a shift the worker had been approved for. The system credits the
 * worker with a reputation bump and a quota refund (capped) and writes
 * one of these records so the worker can see the protection event in
 * their reputation / cancellation history modal.
 */
export interface WorkerProtectionRecord {
  id: string;
  /** Type of protection event. */
  kind: 'EmployerCancelledShift';
  shiftId: string;
  /** Snapshot at protection time so history reads correctly even if
   *  the shift is later edited / deleted. */
  shiftTitle: string;
  employerId: string;
  employerName: string;
  /** Employer-supplied cancellation reason (mirrored verbatim). */
  reason: string;
  /** ISO timestamp of the cancellation. */
  occurredAt: string;
  /** Reputation points added (0 when score was already at the cap). */
  reputationPointsRestored: number;
  /** Cancellation quota slots refunded (0 when worker had no recent quota usage). */
  quotaSlotsRefunded: number;
}

/**
 * Phase 10A-Fix-9 — per-job-type skill score. Separate from the
 * platform-wide `reputationScore` so an employer evaluating a worker
 * for a specific job category sees how the worker has performed on
 * that exact category, not just their general reputation.
 *
 * The score is bounded `[0, 100]`; first rating writes
 * `stars * 20`, later updates use a weighted average that gives
 * recent shifts more weight than older ones (see
 * `src/domain/skillScore.ts`).
 */
export interface WorkerSkillScore {
  /** The shift `jobType` string used as the category key. */
  category: string;
  /** Score in [0, 100]; undefined / missing entry means "no data yet". */
  score: number;
  /** Number of confirmed shifts that contributed to the score. */
  completedCount: number;
  /** Last `stars` value (1-5) used to update the score. */
  lastRating?: number;
  /** ISO timestamp of the most recent score update. */
  lastUpdatedAt: string;
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

/**
 * Phase 6: worker-authored feedback on the employer after a confirmed
 * shift. Mirrors `Rating` (which is employer-authored worker feedback)
 * with optional fixed-vocabulary tags. Immutable once submitted.
 */
export interface EmployerFeedback {
  id: string;
  shiftId: string;
  applicationId: string;
  /** Worker who left the feedback. */
  fromUserId: string;
  /** Employer being reviewed. */
  toEmployerId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  tags: EmployerFeedbackTag[];
  createdAt: string;
}

/**
 * Worker-owned personal busy block (Phase 5).
 *
 * One-time, date-based entries only — recurring weekly schedules are
 * intentionally out of scope for the MVP. Each block contributes to the
 * "is this shift in conflict?" check when the worker tries to apply.
 */
export interface ScheduleBlock {
  id: string;
  /** Owning worker. */
  userId: string;
  title: string;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:mm. */
  startTime: string;
  /** HH:mm. */
  endTime: string;
  /** Optional free-text note. */
  note?: string;
  createdAt: string;
  updatedAt: string;
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
