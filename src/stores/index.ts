/**
 * Barrel re-exports for the Zustand stores.
 *
 * Components import from `@/stores` rather than reaching into individual
 * files so the wiring stays consistent and refactors are localized.
 */

export { useAuthStore, useCurrentRole, useCurrentUser } from './authStore';
export type { LoginError, RegisterError, RegisterInput } from './authStore';

export { useUserStore, asWorker, asEmployer } from './userStore';

export { useShiftStore } from './shiftStore';
export type {
  NewShiftInput,
  ShiftEditablePatch,
  CancelError,
  EditError,
} from './shiftStore';

export { useApplicationStore } from './applicationStore';
export type {
  ApplyError,
  ApplicationActionError,
  NewRating,
} from './applicationStore';

export { useNotificationStore } from './notificationStore';

export { useAdminStore } from './adminStore';
export type { AdminError } from './adminStore';

export { useScheduleStore } from './scheduleStore';
export type {
  NewScheduleBlockInput,
  ScheduleBlockEditablePatch,
  ScheduleError,
} from './scheduleStore';

export { useEmployerFeedbackStore } from './employerFeedbackStore';
export type {
  FeedbackError,
  NewEmployerFeedbackInput,
} from './employerFeedbackStore';

export {
  useVerificationStore,
  workerDocLabel,
  employerDocLabel,
  employerTypeLabel,
  getWorkerVerificationSummary,
  getEmployerVerificationSummary,
  getPendingWorkerVerifications,
  getPendingEmployerVerifications,
  getRecentVerificationHistory,
  verificationStatusLabel,
  verificationStatusTone,
  resolveEmployerType,
  getPendingTypeChangeRequest,
  getPendingTypeChangeRequests,
} from './verificationStore';
export type {
  WorkerDocumentSubmission,
  EmployerDocumentSubmission,
  VerifyError,
} from './verificationStore';
