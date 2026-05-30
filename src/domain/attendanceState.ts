/**
 * Attendance state machine (CORE-STABILITY-9 Parts 1 & 3).
 *
 * Pure TypeScript — no React, no I/O. Derives a single canonical
 * attendance state for an application+shift at a given wall clock, and
 * maps it to ROLE-AWARE copy keys so the employer never sees
 * worker-perspective text (and vice-versa).
 *
 * The state machine distinguishes worker self check-in from employer
 * mark-present: `Application.checkInAt` is the worker's own confirmation
 * ("Tôi đã có mặt"); `Application.markedPresentAt` is the employer's.
 * Time-driven facts (shift started / ended) come from the clock, not a
 * button click.
 */

import type { Application, Shift } from '@/types';

export type AttendanceState =
  | 'ApprovedNotStarted'
  | 'WorkerCheckedInEarly'
  | 'WorkerCheckedInInProgress'
  | 'EmployerMarkedPresentOnly'
  | 'BothConfirmedPresent'
  | 'NoShow'
  | 'AwaitingCheckout'
  | 'CheckedOut'
  | 'AwaitingEmployerConfirmation'
  | 'Disputed'
  | 'Completed';

export type AttendanceViewerRole = 'worker' | 'employer' | 'admin';

function momentMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

/**
 * Derive the canonical attendance state. Pure / deterministic.
 *
 * Precedence: terminal/dispute states first, then the two-sided
 * presence matrix gated by the wall clock.
 */
export function deriveAttendanceState(
  application: Application,
  shift: Shift,
  nowIso: string,
): AttendanceState {
  const status = application.status;

  if (status === 'Confirmed') return 'Completed';
  if (status === 'Disputed') return 'Disputed';
  if (status === 'NoShow') return 'NoShow';
  if (status === 'CheckedOut') return 'AwaitingEmployerConfirmation';

  const now = new Date(nowIso).getTime();
  const start = momentMs(shift.date, shift.startTime);
  const end = momentMs(shift.date, shift.endTime);
  const started = !Number.isNaN(now) && !Number.isNaN(start) && now >= start;
  const ended = !Number.isNaN(now) && !Number.isNaN(end) && now >= end;

  const workerCheckedIn = Boolean(application.checkInAt);
  const employerPresent = Boolean(application.markedPresentAt);

  if (status === 'CheckedIn') {
    // After end, a checked-in worker is awaiting check-out.
    if (ended && workerCheckedIn) return 'AwaitingCheckout';
    if (workerCheckedIn && employerPresent) return 'BothConfirmedPresent';
    if (workerCheckedIn && !employerPresent) {
      return started ? 'WorkerCheckedInInProgress' : 'WorkerCheckedInEarly';
    }
    // Employer marked present but the worker has not self-confirmed.
    if (!workerCheckedIn && employerPresent) return 'EmployerMarkedPresentOnly';
    // Defensive: CheckedIn status with neither stamp — treat as in-progress.
    return started ? 'WorkerCheckedInInProgress' : 'WorkerCheckedInEarly';
  }

  // Approved (not yet checked in).
  if (status === 'Approved') {
    if (employerPresent) return 'EmployerMarkedPresentOnly';
    return 'ApprovedNotStarted';
  }

  // Any other status has no attendance copy.
  return 'ApprovedNotStarted';
}

/**
 * Map an attendance state + viewer role to an i18n key. Returns
 * `undefined` when the state needs no banner for that role (the
 * surface renders nothing). The keys live under `attendance.copy.*`.
 */
export function attendanceCopyKey(
  state: AttendanceState,
  role: AttendanceViewerRole,
): string | undefined {
  // Only a subset of states warrant a status banner. Each
  // (state, role) pair has its own key so copy is never cross-perspective.
  const BANNER_STATES: ReadonlySet<AttendanceState> = new Set([
    'WorkerCheckedInEarly',
    'WorkerCheckedInInProgress',
    'EmployerMarkedPresentOnly',
    'BothConfirmedPresent',
    'AwaitingCheckout',
  ]);
  if (!BANNER_STATES.has(state)) return undefined;
  return `attendance.copy.${role}.${state}`;
}
