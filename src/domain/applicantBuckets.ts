/**
 * Phase 10C-Stab-1 Batch 4 C — applicant lifecycle bucket helper.
 *
 * Pure / deterministic. Splits an application list into
 * stable-ordered buckets the employer can render as collapsible
 * sections. Statuses that don't represent active progress
 * (Rejected / CancelledBy* / Expired / CancellationRequested) are
 * intentionally skipped from the primary view.
 */

import type { Application, Shift } from '@/types';

export type ApplicantBucket =
  | 'Pending'
  | 'Approved'
  | 'CheckedIn'
  | 'PresenceConfirmed'
  | 'AwaitingCheckout'
  | 'AwaitingConfirmation'
  | 'Disputed'
  | 'Absent'
  | 'Confirmed';

export interface BucketedApplicants {
  bucket: ApplicantBucket;
  applications: Application[];
}

export function bucketApplicants(
  shift: Shift,
  applications: Application[],
  nowIso: string,
): BucketedApplicants[] {
  const now = new Date(nowIso).getTime();
  const end = new Date(`${shift.date}T${shift.endTime}:00`).getTime();
  const buckets: Record<ApplicantBucket, Application[]> = {
    Pending: [],
    Approved: [],
    CheckedIn: [],
    PresenceConfirmed: [],
    AwaitingCheckout: [],
    AwaitingConfirmation: [],
    Disputed: [],
    Absent: [],
    Confirmed: [],
  };
  for (const a of applications) {
    if (a.shiftId !== shift.id) continue;
    if (a.status === 'Pending') {
      buckets.Pending.push(a);
    } else if (a.status === 'Approved') {
      buckets.Approved.push(a);
    } else if (a.status === 'CheckedIn') {
      const bothConfirmed =
        Boolean(a.checkInAt) && Boolean(a.markedPresentAt);
      if (
        Number.isFinite(now) &&
        Number.isFinite(end) &&
        now >= end &&
        a.checkInAt &&
        !a.checkOutAt
      ) {
        buckets.AwaitingCheckout.push(a);
      } else if (bothConfirmed) {
        buckets.PresenceConfirmed.push(a);
      } else {
        buckets.CheckedIn.push(a);
      }
    } else if (a.status === 'CheckedOut') {
      buckets.AwaitingConfirmation.push(a);
    } else if (a.status === 'Disputed') {
      buckets.Disputed.push(a);
    } else if (a.status === 'NoShow') {
      buckets.Absent.push(a);
    } else if (a.status === 'Confirmed') {
      buckets.Confirmed.push(a);
    }
    // CancellationRequested / Rejected / CancelledBy* / Expired —
    // skipped from primary buckets.
  }
  const order: ApplicantBucket[] = [
    'Pending',
    'Approved',
    'CheckedIn',
    'PresenceConfirmed',
    'AwaitingCheckout',
    'AwaitingConfirmation',
    'Disputed',
    'Absent',
    'Confirmed',
  ];
  return order
    .map((bucket) => ({ bucket, applications: buckets[bucket] }))
    .filter((b) => b.applications.length > 0);
}
