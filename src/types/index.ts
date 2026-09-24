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
  | 'Confirmed'
  /**
   * Phase 10C: an employer or worker has filed a structured dispute
   * against the application after the worker checked out. The
   * application is held until an admin resolves the dispute.
   * Auto-release is blocked while the application sits in this
   * state.
   */
  | 'Disputed';

export type DisputeStatus =
  | 'Open'
  | 'ResolvedReleased'
  | 'ResolvedRefunded'
  /**
   * Phase 10C: admin released a strict subset of the escrow to the
   * worker and refunded the remainder to the employer. Terminal.
   */
  | 'PartialRelease'
  /**
   * Phase 10C: admin asked one of the parties for additional context
   * before deciding. Non-terminal — auto-release stays blocked while
   * a dispute sits in this state.
   */
  | 'RequestedMoreEvidence'
  /**
   * Phase 10C: admin closed the dispute as not actionable (no escrow
   * change). Terminal.
   */
  | 'ClosedInvalid';

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
  | 'ApplicationExpired'
  /**
   * Phase 10C: an employer filed a dispute on a checked-out
   * application. Worker is notified ("Nhà tuyển dụng đang khiếu nại
   * ca làm").
   */
  | 'DisputeFiled'
  /**
   * Phase 10C: a new dispute was filed and the admin queue should
   * pick it up. Sent to every active admin via `notifyAdmins`.
   */
  | 'DisputeOpened'
  /**
   * Phase 10C Wave 5B: the 12-hour auto-release pass settled an
   * application that the employer had not confirmed or disputed.
   * Sent to both the worker (income credited) and the employer
   * (deposit released). The body quotes the payout amount so both
   * sides have a ledger-grade record.
   */
  | 'AutoReleaseSettled'
  /**
   * Phase 10C-Stab-1 — emitted to the worker AND employer when the
   * shift's start time has passed and the lifecycle sync transitions
   * the shift to `'InProgress'`. Single notification per
   * `(applicationId, kind)` — the application carries
   * `shiftStartedNotifiedAt` as the idempotency hook.
   */
  | 'ShiftStarted'
  /**
   * Phase 10C-Stab-1 — emitted to both sides when the shift's end +
   * grace window has passed and the worker hasn't checked out yet.
   * Idempotent via `shiftEndedNotifiedAt`.
   */
  | 'ShiftEnded'
  /**
   * Phase 10C-Stab-1 Batch 2 — worker self-checked-in. Notifies
   * the employer.
   */
  | 'WorkerCheckedIn'
  /**
   * Phase 10C-Stab-1 Batch 2 — employer marked worker present
   * without the worker self-checking-in. Notifies the worker.
   */
  | 'EmployerMarkedPresent'
  /**
   * Phase 10C-Stab-1 Batch 2 — worker checked out. Reminds the
   * employer to confirm or dispute within 12 hours.
   */
  | 'WorkerCheckedOut'
  /**
   * Phase 10C-Stab-1 Batch 3 B — fired to the employer when a
   * shift's start is within 10 minutes and there are still unfilled
   * positions. Idempotent via `Shift.startingSoonNotifiedAt`.
   */
  | 'ShiftStartingSoon'
  /**
   * Phase 10C-Stab-1 Batch 3 B — fired to the employer when the
   * lifecycle sync transitions a shift to `'Expired'` with zero
   * approved positions. Idempotent via `Shift.expiredEmptyNotifiedAt`.
   */
  | 'ShiftExpiredEmpty'
  /**
   * Phase 10C-Stab-1 Batch 4 E — fired to the worker after wage
   * release (manual confirm or auto-release) reminding them to rate
   * the employer.
   */
  | 'WorkerPostPaymentRatingRequired'
  /**
   * Phase 10C-Stab-1 Batch 4 E — fired to the employer when the
   * worker submits their post-payment rating.
   */
  | 'WorkerRatedEmployer'
  /**
   * Phase 10C-Stab-1 Batch 4 H — admin asked one or both sides for
   * additional evidence on a dispute.
   */
  | 'AdminRequestedEvidence'
  /**
   * CORE-STABILITY-6 Part 3 — fired to the user after a successful
   * wallet withdrawal so the cash-out has a notification-grade record.
   */
  | 'UserWithdrawal'
  /**
   * CORE-STABILITY-7 Part 1 — fired to the user after a successful
   * wallet top-up. Deeplinks to the wallet transaction history.
   */
  | 'UserTopUp'
  /**
   * CORE-STABILITY-7 Part 1 — fired to the employer when a shift
   * deposit is held (shift published). Deeplinks to the employer
   * wallet / deposit history.
   */
  | 'EmployerDepositPaid'
  /**
   * CORE-STABILITY-7 Part 6 — fired to admins when a user reports a
   * review ("Báo cáo đánh giá"). Deeplinks to the admin dashboard.
   */
  | 'ReviewReported';

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
  /**
   * Phase 10C-Stab-1 Batch 4 J — wallet balance in Vietnamese đồng.
   * Optional for backwards compatibility; legacy snapshots default
   * to 0 in the wallet store hydrate.
   */
  walletBalance?: number;
  /**
   * PayOS payout (tiền THẬT) — tài khoản ngân hàng worker nhận lương khi xong
   * ca. `bankBin` = mã BIN ngân hàng (napas). Optional / back-compat: hồ sơ cũ
   * đọc là undefined; chỉ dùng ở chế độ supabase khi bật payout thật.
   */
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
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
  /**
   * Phase 10C-Stab-1 Batch 4 J — wallet balance in Vietnamese đồng.
   * Optional for backwards compatibility; legacy snapshots default
   * to 0 in the wallet store hydrate.
   */
  walletBalance?: number;
  /**
   * CORE-STABILITY-8 Part 5 — policy when a shift does not reach its
   * full approved headcount by the start cutoff. Optional for
   * back-compat; absent reads as the default `'RunWithApproved'`.
   */
  understaffedPolicy?: NoShowPolicy;
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

  /**
   * Phase 10C: post-shift evidence level chosen by the employer in
   * `ShiftForm`. Optional at the type level so legacy snapshots
   * hydrate without rewrites; new shifts created via Phase 10C UI
   * always carry an explicit value seeded from the
   * `suggestedEvidenceForJobType(jobType)` helper.
   *
   * The five literal values are documented in
   * `src/domain/evidence.ts`.
   */
  evidenceRequirement?: EvidenceRequirement;

  /**
   * Phase 10C-Stab-1 Batch 2 — when the employer chose `'Khác'` as
   * the job type, this carries the free-text custom name they
   * supplied. Required by the Wage validation rule (I.4): "If job
   * type is 'Khác', require customJobTypeName."
   */
  customJobTypeName?: string;

  /**
   * Phase 10C-Stab-1 Batch 2 — when this shift was created by
   * "Đăng lại từ ca này" on a cancelled / expired prior shift,
   * carries the source shift's id so admin / employer audit views
   * can trace the lineage.
   */
  repostedFromShiftId?: string;

  /**
   * Phase 10C-Stab-1 Batch 2 — retroactive verification flag for
   * legacy shifts that were posted by employers who hadn't yet
   * completed verification under the Batch 2 H gate. Set by
   * `shiftStore.hydrate(...)` when a public shift's owning
   * employer lacks an approved verification summary; surfaces a
   * "Ca này cần xác minh nhà tuyển dụng" banner on shift detail.
   * The flag is informational only — it does NOT auto-cancel the
   * shift.
   */
  requiresEmployerVerification?: boolean;

  /**
   * Phase 10C-Stab-1 Batch 2 — append-only audit log for surface-
   * facing events. Every entry stamps an exact-second ISO
   * timestamp. Used by the shift-detail repost banner and by the
   * employer's payments / dashboard timeline.
   *
   * Kinds:
   *   - `'CreatedFromRepost'`  → "Nhà tuyển dụng đã tạo ca mới
   *                               dựa trên ca này" (logged on the
   *                               OLD shift; carries the new shift's
   *                               id + title in `note`).
   *   - `'EmployerCancelled'`  → mirror of `cancelledAt` for
   *                               consistency in the timeline view.
   *   - `'AutoExpired'`        → lifecycle sync transitioned the
   *                               shift to Expired.
   *   - `'Reposted'`           → reciprocal of `'CreatedFromRepost'`
   *                               on the NEW shift, pointing back
   *                               to the source.
   */
  timeline?: ShiftTimelineEntry[];

  /**
   * Phase 10C-Stab-1 Batch 3 B — ISO timestamp set when the
   * lifecycle sync fired the `'ShiftStartingSoon'` employer
   * notification. Idempotency hook so re-running the sync at the
   * same `now` produces no duplicate notifications.
   */
  startingSoonNotifiedAt?: string;

  /**
   * Phase 10C-Stab-1 Batch 3 B — ISO timestamp set when the
   * lifecycle sync fired the `'ShiftExpiredEmpty'` employer
   * notification (i.e. the shift transitioned to Expired with zero
   * approved positions). Idempotency hook for the same reason.
   */
  expiredEmptyNotifiedAt?: string;
}

/**
 * Phase 10C-Stab-1 Batch 2 / Batch 4 L — typed audit-log entry on
 * `Shift.timeline`. Always carries a second-resolution ISO timestamp.
 */
export interface ShiftTimelineEntry {
  id: string;
  /** ISO 8601 with seconds. */
  occurredAt: string;
  kind:
    | 'CreatedFromRepost'
    | 'EmployerCancelled'
    | 'AutoExpired'
    | 'Reposted'
    | 'ShiftPublished'
    | 'DepositHeld'
    | 'WorkerApplied'
    | 'EmployerApprovedApplicant'
    | 'WorkerCheckedIn'
    | 'EmployerMarkedPresent'
    | 'EmployerMarkedAbsent'
    | 'WorkerCheckedOut'
    | 'EmployerOpenedDispute'
    | 'WorkerOpenedDispute'
    | 'WorkerRespondedToDispute'
    | 'EmployerRespondedToDispute'
    | 'AdminRequestedEvidence'
    | 'AdminResolvedDispute'
    | 'WageReleased'
    | 'WageRefunded';
  /**
   * Free-form Vietnamese note. May contain quoted shift IDs / titles.
   * UI is responsible for any escaping / truncation.
   */
  note: string;
}

/**
 * CORE-STABILITY-8 Part 1 — a saved create-shift form snapshot
 * (autosave / "Lưu nháp"). A draft is **NOT** a real shift: it never
 * appears on the public listing, never enters lifecycle sync, never
 * touches the wallet/ledger, and never requires cancellation. It is a
 * convenience so an employer can resume an unfinished posting (e.g.
 * after an insufficient-balance deposit attempt). Drafts are converted
 * into a real `Shift` only when the employer publishes + deposits.
 *
 * All fields mirror `ShiftFormValues` so "Tiếp tục chỉnh sửa" can
 * repopulate the form exactly. Fields may be incomplete — a draft can
 * be saved before the form is valid; publish/deposit re-validates.
 */
export interface ShiftDraft {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string;
  jobType: string;
  customJobTypeName: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyWage: number;
  positionsTotal: number;
  workplaceImageLabel: string;
  workplaceNotes: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  requiresVerifiedDocumentOnArrival: boolean;
  evidenceRequirement: EvidenceRequirement;
  /** ISO 8601 (seconds) when the draft was first saved. */
  savedAt: string;
  /** ISO 8601 (seconds) of the most recent edit. */
  updatedAt: string;
}

/**
 * CORE-STABILITY-8 Part 5 — employer policy when a shift does not have
 * enough approved workers by the start cutoff:
 *   - `'RunWithApproved'` (default): the shift runs with whoever was
 *     approved; unused slots are refunded at close.
 *   - `'RequireFull'`: if not enough workers are approved by start, the
 *     shift auto-cancels and the full deposit is refunded.
 */
export type NoShowPolicy = 'RunWithApproved' | 'RequireFull';

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
  /** True when the employer confirmed completion without a worker check-out. */
  confirmedWithoutCheckout?: boolean;
  cancelledAt?: string;
  cancelReason?: 'OnTime' | 'LateCancel';
  /** hourlyWage * hours, snapshotted at approval. */
  payoutAmount?: number;

  /**
   * Phase 10C-Stab-1 Batch 3 F — partial-release amount applied by
   * the admin when resolving a dispute with `'PartialRelease'`. In
   * the MVP only `ResolvedReleased` and `ResolvedRefunded` are
   * wired, but the field is reserved so the schema doesn't need to
   * change again when partial resolution lands.
   */
  partialPayoutAmount?: number;

  /**
   * Phase 10C-Stab-1 Batch 3 F — ISO timestamp set when an admin
   * resolved a dispute against the worker (`ResolvedRefunded`),
   * flipping the application to `'NoShow'`. Mirrors `confirmedAt`
   * on the released path.
   */
  noShowAt?: string;

  /**
   * Phase 10C-Stab-1 Batch 3 F — idempotency guard for the
   * dispute-resolution notification. Set when admin resolution
   * pushed `'DisputeResolved'` notifications to both sides; future
   * passes that re-read the same dispute skip the notification.
   */
  disputeResolutionNotifiedAt?: string;

  /**
   * Phase 6: required reason supplied by the employer when rejecting a
   * `Pending` application. Mirrored into the worker's
   * `ApplicationRejected` notification so they can see why.
   */
  rejectionReason?: string;

  /**
   * Phase 10C-Stab-1 Batch 4 E — set when the employer confirms
   * completion / wage is released. Cleared once the worker submits
   * their post-payment rating. Drives the prominent
   * "Đánh giá nhà tuyển dụng" CTA on the worker dashboard.
   */
  paidAwaitingRatingAt?: string;

  /**
   * Phase 10C-Stab-1 Batch 4 E — ISO timestamp the worker submitted
   * the post-payment rating of the employer.
   */
  workerRatedEmployerAt?: string;

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

  /**
   * Phase 10C: per-item state of the worker's check-out checklist.
   * Shape mirrors `CHECKOUT_CHECKLIST_ITEMS_VI[shift.evidenceRequirement]`
   * in `src/i18n/vi.ts`; a `true` entry means the corresponding
   * checklist row was ticked at submit time. Optional / back-compat.
   */
  checkoutChecklist?: boolean[];

  /**
   * Phase 10C: optional or required handover note submitted at
   * check-out. Bounded to 1000 characters by the dialog and store.
   */
  workerCheckoutNote?: string;

  /**
   * Phase 10C: filename only (≤255 chars, no path separators).
   * Public-safe mock string — no actual file content is ever stored.
   * Required when `Shift.evidenceRequirement === 'RequiredPhoto'`.
   */
  workerEvidenceFileName?: string;

  /**
   * Phase 10C: ISO 8601 timestamp = `checkOutAt + 12h`. Set on a
   * successful `applicationStore.checkOut(...)`; never modified
   * afterwards. Drives the auto-release eligibility predicate in
   * `applicationStore.autoReleaseEligibleApplications(...)`.
   */
  autoReleaseAt?: string;

  /**
   * Phase 10C: marks an Application that was confirmed by the
   * automatic 12-hour auto-release pass rather than by an explicit
   * employer confirmation. Audit marker only — does NOT change the
   * outward `status` from `'Confirmed'`.
   */
  autoReleased?: boolean;

  /**
   * Phase 10C-Stab-1 — set once the lifecycle sync has fired the
   * "ca làm đã bắt đầu" notification pair (worker + employer) for
   * this application. Idempotency hook so repeated `useLifecycleSync`
   * mounts don't spam duplicate notifications.
   */
  shiftStartedNotifiedAt?: string;

  /**
   * Phase 10C-Stab-1 — set once the lifecycle sync has fired the
   * "ca đã kết thúc" notification pair for this application. Same
   * idempotency rationale as `shiftStartedNotifiedAt`.
   */
  shiftEndedNotifiedAt?: string;

  /**
   * Phase 10C-Stab-1 Batch 2 — ISO timestamp the employer marked
   * the worker as physically present. Independent from
   * `checkInAt` (which the worker sets when they self-check-in).
   * Used to detect mismatch states:
   *
   *   - worker `checkInAt` set + employer `markedPresentAt` unset
   *     → "Người lao động đã check-in nhưng nhà tuyển dụng chưa xác nhận"
   *   - employer `markedPresentAt` set + worker `checkInAt` unset
   *     → "Nhà tuyển dụng đã xác nhận nhưng người lao động chưa check-in"
   *
   * Application status flips to `'CheckedIn'` when EITHER side
   * confirms (so escrow can flip and the shift can roll forward).
   * Mismatch detection is a UI overlay on top of the underlying
   * status, not a new status value.
   */
  markedPresentAt?: string;
  /** Snake-cased actor id of who marked them present (employer id). */
  markedPresentByEmployerId?: string;
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
  /**
   * CORE-STABILITY-9 Part 4 — accumulated experience points for the
   * skill-progression (levelling / "cày cấp") MVP. Optional for
   * back-compat; absent reads as `0` → Level 1. XP grows on completed
   * shifts + positive ratings + no-dispute (see
   * `src/domain/skillProgression.ts`).
   */
  xp?: number;
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
  /**
   * CORE-STABILITY-6 Part 2 — optional idempotency key. When set,
   * `notificationStore.push` is a no-op if a notification with the
   * same `(userId, dedupeKey)` already exists, so repeated lifecycle
   * syncs / page reloads never create duplicate notifications (e.g.
   * the "Ca làm đã kết thúc / chưa check-in" end-of-shift notice). The
   * key should encode event-type + recipient + shift/application/
   * dispute id + lifecycle transition. Optional so legacy records and
   * intentionally-repeatable notifications are unaffected.
   */
  dedupeKey?: string;
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

  /**
   * Phase 10C: structured dispute category from the side-specific
   * enum. Required for new disputes created by Phase 10C actions
   * (`reportIssue` / `workerOpenDispute`). Optional at the type level
   * so pre-Phase-10C seed data hydrates without rewrites — the store
   * lazily migrates legacy records by setting `category: 'Other'` on
   * first read.
   */
  category?: EmployerDisputeCategory | WorkerDisputeCategory;

  /**
   * Phase 10C: optional free-text description supplied with the
   * dispute. Bounded to 2000 characters by the dialog and store.
   * Public-safe — never PII or document content.
   */
  evidenceDescription?: string;

  /**
   * Phase 10C: filename only (≤255 chars, no path separators).
   * Public-safe mock string — no actual file content is ever stored.
   */
  evidenceFileName?: string;

  /**
   * Phase 10C-Stab-1 Batch 3 E — append-only list of follow-up
   * responses to the dispute from either side. Used so a worker can
   * respond to an employer-filed dispute (and vice versa) without
   * spawning a duplicate dispute record.
   */
  responses?: DisputeResponse[];

  /**
   * Phase 10C-Stab-1 Batch 4 H — admin-supplied evidence request
   * target. Set only when `status === 'RequestedMoreEvidence'`.
   */
  evidenceRequestTarget?: 'worker' | 'employer' | 'both';
}

/**
 * Phase 10C-Stab-1 Batch 3 E — single response/reply on a dispute.
 * Side identifies the author role; `authorUserId` carries the actual
 * worker / employer id so the admin queue can render attributable
 * statements.
 */
export interface DisputeResponse {
  id: string;
  side: 'employer' | 'worker';
  authorUserId: string;
  reason: string;
  evidenceDescription?: string;
  evidenceFileName?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Phase 10C — Evidence + dispute category enums
// ---------------------------------------------------------------------------

/**
 * Post-shift evidence level attached to every `Shift`. The employer
 * picks one in `ShiftForm`; the worker's `CheckoutDialog` validates
 * its checklist / photo / note payload against this value.
 *
 * The mapping from job-category risk level to a recommended value is
 * exposed by `getSuggestedEvidenceLevel(jobType, riskLevel)` and the
 * composition `suggestedEvidenceForJobType(jobType)` in
 * `src/domain/evidence.ts`. Out-of-enum or missing input falls back to
 * the safe default `'RequiredHandoverChecklist'`.
 */
export type EvidenceRequirement =
  | 'None'
  | 'ChecklistOnly'
  | 'OptionalPhoto'
  | 'RequiredPhoto'
  | 'RequiredHandoverChecklist';

/**
 * Phase 10C: employer-side dispute categories. Used by
 * `applicationStore.reportIssue(...)`. Wrong-role categories submitted
 * to that action are rejected with `'CATEGORY_INVALID'`.
 */
export type EmployerDisputeCategory =
  | 'NoShow'
  | 'LeftEarly'
  | 'ChecklistFailed'
  | 'MisrepresentedSkills'
  | 'BehaviorIssue'
  | 'Damage'
  | 'Other';

/**
 * Phase 10C: worker-side dispute categories. Used by
 * `applicationStore.workerOpenDispute(applicationId, payload)`.
 * Wrong-role categories submitted to that action are rejected with
 * `'CATEGORY_INVALID'`.
 */
export type WorkerDisputeCategory =
  | 'WrongAddress'
  | 'UnsafeWorksite'
  | 'EmployerNoShow'
  | 'ScopeChanged'
  | 'PaymentDispute'
  /**
   * Phase 10C-Stab-1 Batch 4 I — worker disputes an employer's
   * `markNoShow` decision. Eligible from `Application.status === 'NoShow'`.
   */
  | 'AbsentDispute'
  | 'Other';

/** Stable iteration order for the employer-side category picker. */
export const EMPLOYER_DISPUTE_CATEGORIES: readonly EmployerDisputeCategory[] = [
  'NoShow',
  'LeftEarly',
  'ChecklistFailed',
  'MisrepresentedSkills',
  'BehaviorIssue',
  'Damage',
  'Other',
] as const;

/** Stable iteration order for the worker-side category picker. */
export const WORKER_DISPUTE_CATEGORIES: readonly WorkerDisputeCategory[] = [
  'WrongAddress',
  'UnsafeWorksite',
  'EmployerNoShow',
  'ScopeChanged',
  'PaymentDispute',
  'AbsentDispute',
  'Other',
] as const;

// ---------------------------------------------------------------------------
// Phase 10C-Stab-1 Batch 4 J — Wallet model
// ---------------------------------------------------------------------------

/**
 * Wallet ledger entry kinds. Each transaction in the wallet ledger
 * carries one of these labels so admin / employer / worker views can
 * render a human-readable Vietnamese description without inferring
 * intent from the amount sign.
 */
export type WalletLedgerEntryKind =
  | 'EmployerDepositHeld'
  | 'WorkerWageReleased'
  | 'EmployerUnusedRefund'
  | 'EmployerDisputeRefund'
  | 'EmployerPartialRefund'
  | 'WorkerPartialRelease'
  | 'EmployerCancellationPenalty'
  /**
   * QA-Fix-1 E — demo-only "add funds" top-up. Credits the user's
   * wallet so the demo can exercise deposit / payout flows without a
   * real payment gateway.
   */
  | 'UserTopUp'
  /**
   * CORE-STABILITY-6 Part 3 — demo-only "withdraw funds". Debits the
   * user's wallet (amount stored negative). No real banking
   * integration; bounded by available balance.
   */
  | 'UserWithdrawal'
  /** Rút tiền THẬT (PayOS Kênh chi) thất bại → hoàn lại vào ví. */
  | 'UserWithdrawalReversed'
  /** Phí nền tảng 10% của một ca → ví admin được chỉ định (migration 0021). */
  | 'PlatformFeeReceived';

/**
 * Single wallet ledger entry. Append-only; never mutated.
 *
 *   - `amount` is signed: positive = credit (received), negative =
 *     debit (paid out).
 *   - `occurredAt` carries seconds-resolution ISO 8601.
 */
export interface WalletLedgerEntry {
  id: string;
  occurredAt: string;
  userId: string;
  kind: WalletLedgerEntryKind;
  amount: number;
  shiftId?: string;
  applicationId?: string;
  note?: string;
}

/** Per-user wallet aggregate. */
export interface UserWallet {
  userId: string;
  balance: number;
  updatedAt: string;
}

/**
 * PayOS — đơn NẠP tiền THẬT (Kênh thu / QR). Khác wallet ledger mô phỏng: đây là
 * dòng tiền thật qua cổng. Webhook PayOS xác nhận -> cộng ví thật.
 */
export type PaymentOrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export interface PaymentOrder {
  orderCode: number;
  status: PaymentOrderStatus;
  amount: number;
  checkoutUrl?: string;
  qrCode?: string;
  paidAt?: string;
}

/**
 * PayOS — đơn CHI tiền THẬT (Kênh chi) ra STK người nhận.
 *   WORKER_PAYOUT  : trả lương worker khi xong ca.
 *   EMPLOYER_REFUND: hoàn cọc employer khi ca huỷ/hết hạn.
 */
export type PayoutOrderKind = 'WORKER_PAYOUT' | 'EMPLOYER_REFUND' | 'USER_WITHDRAWAL';
export type PayoutOrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface PayoutOrder {
  id: string;
  kind: PayoutOrderKind;
  userId: string;
  shiftId?: string;
  applicationId?: string;
  amount: number;
  toBin: string;
  toAccountNumber: string;
  toAccountName?: string;
  status: PayoutOrderStatus;
  failReason?: string;
  createdAt: string;
  updatedAt: string;
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
 * CORE-STABILITY-7 Part 6 — a report ("Báo cáo đánh giá") filed against
 * a review. Reporting does NOT delete the review; it marks it as "Đang
 * được xem xét" and creates an admin-visible record. The `targetKind`
 * discriminates which review collection the `targetReviewId` points to:
 *   - `'employerFeedback'` → a worker → employer review
 *     (`EmployerFeedback`)
 *   - `'rating'`           → an employer → worker rating (`Rating`)
 */
export interface ReviewReport {
  id: string;
  targetKind: 'employerFeedback' | 'rating';
  targetReviewId: string;
  /** User who filed the report. */
  reportedByUserId: string;
  /** Required free-text reason. */
  reason: string;
  /** Optional supporting note / evidence description. */
  note?: string;
  status: 'Open' | 'Reviewed' | 'Dismissed';
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
  /**
   * CORE-STABILITY-9 Part 5 — discriminator: `'busy'` (default,
   * back-compat — blocks conflicting applications) or `'available'`
   * (free time used for job suggestions). Absent reads as `'busy'`.
   * Availability blocks are NEVER fed into the application-conflict
   * gate.
   */
  kind?: 'busy' | 'available';
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
