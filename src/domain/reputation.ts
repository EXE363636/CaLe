/**
 * Reputation domain module.
 *
 * Pure TypeScript — no React, no Next, no I/O. Deterministic and easily
 * property-tested. Backs Requirements 8.x (reputation lifecycle), 12.1–12.3
 * (cancellation classification), and 14.5 (admin manual adjustment).
 *
 * Score model:
 *  - All workers start at `INITIAL_SCORE` (100).
 *  - Score is always clamped to `[MIN_SCORE, MAX_SCORE]` (`[0, 100]`).
 *  - Workers below `APPLY_THRESHOLD` (50) cannot apply to new shifts.
 */

import type { Application, ApplicationStatus, Shift } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INITIAL_SCORE = 100;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;
export const APPLY_THRESHOLD = 50;

/** Reputation deltas for the non-admin event kinds (Req 8.2–8.4). */
const COMPLETED_DELTA = 5;
const NO_SHOW_DELTA = -20;
const LATE_CANCEL_DELTA = -10;

/** Late-cancel window in milliseconds (24 hours). */
const LATE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of events that can change a worker's reputation.
 *
 * `AdminAdjust` carries an explicit signed `delta`. The delta is added as-is
 * (it is *not* clamped before addition), but the resulting score is always
 * clamped to `[MIN_SCORE, MAX_SCORE]`.
 */
export type ReputationEvent =
  | { kind: 'Completed' }
  | { kind: 'NoShow' }
  | { kind: 'LateCancel' }
  | { kind: 'AdminAdjust'; delta: number };

/** Result of classifying a worker-initiated cancellation. */
export type CancellationClass = 'NoPenalty' | 'OnTime' | 'LateCancel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number): number {
  if (n < MIN_SCORE) return MIN_SCORE;
  if (n > MAX_SCORE) return MAX_SCORE;
  return n;
}

function deltaFor(event: ReputationEvent): number {
  switch (event.kind) {
    case 'Completed':
      return COMPLETED_DELTA;
    case 'NoShow':
      return NO_SHOW_DELTA;
    case 'LateCancel':
      return LATE_CANCEL_DELTA;
    case 'AdminAdjust':
      return event.delta;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a single reputation event to a starting score and return the new
 * score, clamped to `[MIN_SCORE, MAX_SCORE]`.
 *
 * The starting score is also clamped before adding the delta so that callers
 * cannot drift outside the legal range by feeding back stored values.
 */
export function applyReputationEvent(
  score: number,
  event: ReputationEvent,
): number {
  return clamp(clamp(score) + deltaFor(event));
}

/**
 * Predicate: does this score allow the worker to apply to new shifts?
 *
 * `true` iff `score >= APPLY_THRESHOLD` (Req 8.5).
 */
export function canApplyToShifts(score: number): boolean {
  return score >= APPLY_THRESHOLD;
}

/**
 * Classify a worker-initiated cancellation as `NoPenalty`, `OnTime`, or
 * `LateCancel` based on the application's current status and the time
 * remaining until the shift starts (Req 12.1–12.3).
 *
 * Rules:
 *  - `Pending` → `NoPenalty` (employer hadn't approved yet).
 *  - Any other non-`Approved` status → `NoPenalty` (defensive; nothing to
 *    penalise because the worker isn't on the hook for the shift).
 *  - `Approved` and the shift starts at least 24h from `now` → `OnTime`.
 *  - `Approved` and the shift starts inside the 24h window (or has already
 *    started) → `LateCancel`. Cancelling after the shift has begun is still
 *    treated as a late cancellation so the worker is penalised.
 *
 * Both timestamps are ISO 8601 strings.
 */
export function classifyCancellation(
  applicationStatus: ApplicationStatus,
  shiftStartISO: string,
  nowISO: string,
): CancellationClass {
  if (applicationStatus === 'Pending') return 'NoPenalty';
  if (applicationStatus !== 'Approved') return 'NoPenalty';

  const shiftStart = Date.parse(shiftStartISO);
  const now = Date.parse(nowISO);

  // Defensive: an unparseable timestamp shouldn't reward the worker. Treat
  // it the same as a same-day cancellation.
  if (Number.isNaN(shiftStart) || Number.isNaN(now)) return 'LateCancel';

  const msUntilStart = shiftStart - now;
  if (msUntilStart >= LATE_CANCEL_WINDOW_MS) return 'OnTime';
  return 'LateCancel';
}

// ---------------------------------------------------------------------------
// Derived reputation (supabase — server chưa lưu điểm uy tín)
// ---------------------------------------------------------------------------

/** Điểm uy tín tạm tính + số liệu gốc đã dùng để tính. */
export interface DerivedReputation {
  score: number;
  completed: number;
  noShows: number;
  lateCancels: number;
  /** Mọi lần người lao động tự huỷ (kể cả huỷ đúng hạn / khi chờ duyệt). */
  workerCancellations: number;
}

/**
 * Tạm tính điểm uy tín của MỘT người lao động từ lịch sử đơn THẬT, dùng ở chế
 * độ supabase nơi server chưa lưu điểm (migration phase 1: "KHÔNG có
 * reputation"). Dùng đúng luật của module này:
 *  - `Confirmed`          → Completed (+5), mốc: confirmedAt ?? checkOutAt ?? giờ kết thúc ca;
 *  - `NoShow`             → NoShow (−20), mốc: noShowAt ?? giờ bắt đầu ca;
 *  - `CancelledByWorker`  → LateCancel (−10) CHỈ khi đơn đã từng được duyệt
 *    (`approvedAt`) và yêu cầu huỷ (cancellationRequestedAt ?? cancelledAt)
 *    rơi vào cửa sổ 24h trước giờ bắt đầu (`classifyCancellation`); huỷ khi
 *    còn chờ duyệt hoặc huỷ đúng hạn không bị trừ.
 * Sự kiện áp theo thứ tự thời gian từ `INITIAL_SCORE`, kẹp `[0, 100]` sau mỗi
 * bước (giống `applyReputationEvent`), nên kết quả không phụ thuộc thứ tự mảng
 * đầu vào. Không có điều chỉnh thủ công của admin (chưa có backend).
 */
export function deriveReputationFromHistory(
  applications: readonly Application[],
  shiftsById: ReadonlyMap<string, Shift>,
): DerivedReputation {
  const events: { at: string; event: ReputationEvent }[] = [];
  let completed = 0;
  let noShows = 0;
  let lateCancels = 0;
  let workerCancellations = 0;

  for (const app of applications) {
    const shift = shiftsById.get(app.shiftId);
    const startIso = shift ? `${shift.date}T${shift.startTime}:00` : app.appliedAt;
    const endIso = shift ? `${shift.date}T${shift.endTime}:00` : app.appliedAt;

    if (app.status === 'Confirmed') {
      completed += 1;
      events.push({ at: app.confirmedAt ?? app.checkOutAt ?? endIso, event: { kind: 'Completed' } });
    } else if (app.status === 'NoShow') {
      noShows += 1;
      events.push({ at: app.noShowAt ?? startIso, event: { kind: 'NoShow' } });
    } else if (app.status === 'CancelledByWorker') {
      workerCancellations += 1;
      if (!app.approvedAt) continue;
      const cancelAt = app.cancellationRequestedAt ?? app.cancelledAt;
      if (cancelAt && classifyCancellation('Approved', startIso, cancelAt) === 'LateCancel') {
        lateCancels += 1;
        events.push({ at: cancelAt, event: { kind: 'LateCancel' } });
      }
    }
  }

  events.sort((a, b) => a.at.localeCompare(b.at));
  const score = events.reduce((s, e) => applyReputationEvent(s, e.event), INITIAL_SCORE);
  return { score, completed, noShows, lateCancels, workerCancellations };
}
