/**
 * Central error code → Vietnamese message map (Phase 9O).
 *
 * Action handlers across the app receive `Result<T, ErrorCode>` from
 * the Zustand stores. To keep toast copy consistent, this module
 * translates known error codes into user-facing strings rather than
 * having each call site invent its own. Unknown codes fall back to
 * the generic "Có lỗi xảy ra" copy and are logged for the developer.
 *
 * Pure module — no React, no store imports — so it's safe to call
 * from any layer (form submit, store callback, page effect).
 */

import { t } from '@/i18n/vi';

/**
 * Phase 10C — `EVIDENCE_REQUIRED` is a structured error so the
 * caller can pattern-match the `code` discriminator. We accept the
 * full union here so worker `CheckoutDialog` and any future
 * structured errors get a single, central Vietnamese mapping.
 */
type StructuredStoreError =
  | { code: 'EVIDENCE_REQUIRED'; reason: string };

/**
 * Look up a Vietnamese message for a known store error code.
 * Returns the generic fallback when the code isn't recognised.
 *
 * Accepts either a bare string error code (legacy callers) or a
 * structured `{ code, reason }` object (Phase 10C `EVIDENCE_REQUIRED`).
 */
export function toastFromStoreError(
  code: string | StructuredStoreError | undefined | null,
): string {
  if (!code) return t('feedback.error.generic');

  // Phase 10C — structured EVIDENCE_REQUIRED error. The `reason` field
  // identifies which validator branch fired; we map each branch to a
  // precise Vietnamese error message keyed under `error.evidence.*`.
  if (typeof code === 'object') {
    if (code.code === 'EVIDENCE_REQUIRED') {
      const reasonMap: Record<string, string> = {
        CHECKLIST_INCOMPLETE: t('error.evidence.checklistIncomplete'),
        PHOTO_REQUIRED: t('error.evidence.photoRequired'),
        NOTE_REQUIRED: t('error.evidence.noteRequired'),
        FIELD_TOO_LONG: t('error.evidence.tooLong'),
      };
      return reasonMap[code.reason] ?? t('feedback.error.generic');
    }
    return t('feedback.error.generic');
  }

  const map: Record<string, string> = {
    // applicationStore — apply()
    VERIFICATION_REQUIRED: t('apply.error.VERIFICATION_REQUIRED'),
    REPUTATION_TOO_LOW: t('apply.error.REPUTATION_TOO_LOW'),
    SHIFT_NOT_FOUND: t('apply.error.SHIFT_NOT_FOUND'),
    SHIFT_NOT_AVAILABLE: t('apply.error.SHIFT_NOT_AVAILABLE'),
    SHIFT_NOT_DEPOSITED: t('apply.error.SHIFT_NOT_DEPOSITED'),
    FULLY_BOOKED: t('apply.error.FULLY_BOOKED'),
    ALREADY_APPLIED: t('apply.error.ALREADY_APPLIED'),
    CONFLICT: t('apply.error.CONFLICT'),
    SCHEDULE_CONFLICT: t('apply.error.SCHEDULE_CONFLICT'),

    // applicationStore — cancelByWorker()
    APPLICATION_NOT_FOUND: t('feedback.error.applicationNotFound'),
    WRONG_STATUS: t('feedback.error.wrongStatus'),
    SHIFT_ALREADY_STARTED: t('feedback.error.shiftAlreadyStarted'),
    REASON_REQUIRED: t('feedback.error.reasonRequired'),
    QUOTA_EXCEEDED: t('cancel.confirm.quotaBlocked'),
    // CORE-STABILITY-7 Part 5 — absent→present reversal blocked by open dispute.
    DISPUTE_OPEN: t('attendance.revert.error.disputeOpen'),

    // applicationStore — reportIssue() / dispute action
    CATEGORY_REQUIRED: t('dispute.dialog.error.categoryRequired'),
    CATEGORY_INVALID: t('dispute.dialog.error.categoryRequired'),
    FIELD_TOO_LONG: t('dispute.dialog.error.fieldTooLong'),

    // shiftStore — cancel()
    NOT_FOUND: t('shift.error.NOT_FOUND'),
    TOO_LATE_STARTED: t('shift.error.TOO_LATE_STARTED'),
    TOO_LATE_HAS_APPLICANTS: t('shift.error.TOO_LATE_HAS_APPLICANTS'),
    // shiftStore — edit()
    TOO_LATE: t('shift.error.TOO_LATE_EDIT'),
    POSITIONS_BELOW_FILLED: t('feedback.error.positionsBelowFilled'),

    // adminStore
    USER_NOT_FOUND: t('feedback.error.userNotFound'),
    NOT_A_WORKER: t('feedback.error.notAWorker'),
    DISPUTE_NOT_FOUND: t('feedback.error.disputeNotFound'),
    INVALID_OUTCOME: t('feedback.error.invalidOutcome'),
    INVALID_SCORE: t('admin.user.scoreOutOfRange'),
    CANNOT_SUSPEND_SELF: t('feedback.error.cannotSuspendSelf'),
    CANNOT_SUSPEND_LAST_ADMIN: t('feedback.error.cannotSuspendLastAdmin'),

    // employerFeedbackStore
    INVALID_STARS: t('feedback.error.invalidStars'),
    ALREADY_SUBMITTED: t('feedback.error.alreadySubmitted'),
    COMMENT_TOO_LONG: t('feedback.error.commentTooLong'),

    // scheduleStore
    OWNER_MISMATCH: t('feedback.error.ownerMismatch'),
    TITLE_REQUIRED: t('feedback.error.titleRequired'),
    DATE_REQUIRED: t('feedback.error.dateRequired'),
    TIME_REQUIRED: t('feedback.error.timeRequired'),
    TIME_RANGE_INVALID: t('feedback.error.timeRangeInvalid'),
    BLOCK_NOT_FOUND: t('feedback.error.blockNotFound'),
    OVERLAPS_APPROVED_SHIFT: t('feedback.error.overlapsApprovedShift'),

    // authStore
    INVALID_CREDENTIALS: t('feedback.error.invalidCredentials'),
    SUSPENDED: t('feedback.error.suspended'),
    EMAIL_TAKEN: t('feedback.error.emailTaken'),
    INVALID_EMAIL: t('feedback.error.invalidEmail'),
    INVALID_PASSWORD: t('feedback.error.invalidPassword'),
    INVALID_PHONE: t('feedback.error.invalidPhone'),
  };

  const message = map[code];
  if (message) return message;

  // Dev-time visibility for unmapped codes.
  if (typeof console !== 'undefined') {
    console.warn(
      `[errorMap] Unmapped store error code: "${code}". Falling back to generic.`,
    );
  }
  return t('feedback.error.generic');
}
