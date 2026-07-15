/**
 * Phase 10C-Stab-1 Batch 3 I — derive a worker's "did I already
 * apply to this shift?" state from the application list.
 *
 * Pure TypeScript — no React, no Next, no I/O. The worker shifts
 * listing uses this to swap the apply CTA for a status badge plus a
 * "Xem đơn" link when a matching application already exists, so the
 * worker can't re-submit and immediately understands where they
 * stand.
 *
 * Returns the LATEST application (by `appliedAt` desc) when a worker
 * has multiple records on a shift (e.g. one that was rejected then
 * re-applied). The status of that latest record is what the UI
 * cares about.
 */

import type { Application, ApplicationStatus } from '@/types';

export interface WorkerApplicationState {
  exists: boolean;
  status?: ApplicationStatus;
  applicationId?: string;
}

/**
 * Resolve the worker's most recent application for the given shift.
 *
 * Iteration order: filter to the worker + shift pair, sort
 * descending by `appliedAt`, return the first record.
 */
export function getWorkerApplicationStateForShift(
  shiftId: string,
  workerId: string,
  applications: Application[],
): WorkerApplicationState {
  const matches = applications.filter(
    (a) => a.shiftId === shiftId && a.workerId === workerId,
  );
  if (matches.length === 0) return { exists: false };
  matches.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  const latest = matches[0];
  return {
    exists: true,
    status: latest.status,
    applicationId: latest.id,
  };
}
