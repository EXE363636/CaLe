/**
 * Phase 10A-Fix-4 — task-badge counters.
 *
 * Pure helpers that count "needs your attention" items per role.
 * Used by the role-specific NavBar variants and the admin tab bar to
 * render small red dots / counts so users notice pending work even
 * when they miss the toast or notification bell.
 *
 * No store imports here so the helpers stay easy to unit-test and
 * reusable in components that already select the relevant slices.
 */

import type {
  Application,
  ApplicationStatus,
  EmployerTypeChangeRequest,
  EmployerVerificationDocument,
  Notification,
  WorkerVerificationDocument,
} from '@/types';

/**
 * Total count of items waiting in the admin verification queue.
 *
 *   pending worker docs + pending employer docs + pending type-change requests
 */
export function adminVerificationTaskCount(
  workerDocuments: WorkerVerificationDocument[],
  employerDocuments: EmployerVerificationDocument[],
  typeChangeRequests: EmployerTypeChangeRequest[],
): number {
  let count = 0;
  for (const d of workerDocuments) {
    if (d.status === 'Pending') count += 1;
  }
  for (const d of employerDocuments) {
    if (d.status === 'Pending') count += 1;
  }
  for (const r of typeChangeRequests) {
    if (r.status === 'Pending') count += 1;
  }
  return count;
}

/**
 * Active applications waiting for an employer's decision. Counts
 * only `Pending` (worker just applied) so it doubles as the inbox
 * counter shown next to "Tổng quan".
 */
export function employerPendingApplicationCount(
  applications: Application[],
  employerShiftIds: ReadonlySet<string>,
): number {
  let count = 0;
  for (const a of applications) {
    if (a.status === 'Pending' && employerShiftIds.has(a.shiftId)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Worker tasks needing attention on the profile surface. Counts
 * verification docs in `NeedsMoreInfo` or `Rejected` status — these
 * are the only states that require the worker to take action (resubmit
 * or fix something). `Pending` is intentionally excluded — that's the
 * admin's queue, not the worker's.
 *
 * Phase 10A-Fix-5 — only the LATEST doc per `documentType` is
 * considered. If a worker resubmits a CCCD that was previously
 * `Rejected`, the older record drops out of the actionable count even
 * though it still lives in the slice for history. This is the only
 * way the badge correctly clears the moment the worker resubmits.
 */
export function workerProfileTaskCount(
  workerId: string,
  workerDocuments: WorkerVerificationDocument[],
): number {
  // Group by documentType, keep the newest by submittedAt; the actionable
  // statuses (`Rejected` / `NeedsMoreInfo`) only count when they are the
  // latest record for their type.
  const latestPerType = new Map<string, WorkerVerificationDocument>();
  for (const d of workerDocuments) {
    if (d.workerId !== workerId) continue;
    const prev = latestPerType.get(d.documentType);
    if (!prev || prev.submittedAt < d.submittedAt) {
      latestPerType.set(d.documentType, d);
    }
  }
  let count = 0;
  for (const d of latestPerType.values()) {
    if (d.status === 'NeedsMoreInfo' || d.status === 'Rejected') count += 1;
  }
  return count;
}

/**
 * Worker dashboard tasks. Phase 10A-Fix-5 — this counter intentionally
 * returns `0` always. Unread notifications are an inbox concern that
 * belongs to the notification bell, not a nav-link task indicator.
 * Until we wire a real actionable selector (e.g. "shift starting in
 * <30 min, please check in" or "shift checked out, please confirm"),
 * the worker dashboard nav stays badge-free so users aren't trained
 * to ignore the indicator.
 *
 * Kept as an exported function so the public API of this module
 * remains stable and the existing test fixtures keep type-checking;
 * passing `notifications` is now a no-op.
 */
export function workerDashboardTaskCount(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workerId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _notifications: Notification[],
): number {
  return 0;
}

/**
 * Employer dashboard tasks — pending applications across all the
 * employer's shifts plus completed-without-confirmation slots that
 * still need an employer decision. Mirrors the dashboard tile values.
 */
export function employerDashboardTaskCount(
  applications: Application[],
  employerShiftIds: ReadonlySet<string>,
  awaitingConfirmationStatuses: ApplicationStatus[] = ['CheckedOut'],
): number {
  let count = 0;
  const awaitingSet = new Set<ApplicationStatus>(awaitingConfirmationStatuses);
  for (const a of applications) {
    if (!employerShiftIds.has(a.shiftId)) continue;
    if (a.status === 'Pending' || awaitingSet.has(a.status)) {
      count += 1;
    }
  }
  return count;
}
