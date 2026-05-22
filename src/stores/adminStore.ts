/**
 * Admin store — overrides and dispute resolution for admin users.
 *
 * Admins can:
 *  - suspend / reactivate any user (Req 14.3, 14.4)
 *  - manually adjust a worker's reputation with a reason note (Req 14.5)
 *  - override an escrow status with a reason note (Req 15.3)
 *  - resolve a dispute with `Released` or `Refunded` and a note (Req 15.5)
 *
 * The store keeps the ledger of escrow overrides + dispute resolutions
 * in-memory so the admin dashboard can show recent admin actions. Reason
 * notes are stored on the affected entities themselves; this store just
 * orchestrates the side effects.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { MAX_SCORE, MIN_SCORE } from '@/domain/reputation';
import type {
  Dispute,
  DisputeStatus,
  EscrowStatus,
  Result,
  Worker,
} from '@/types';

import { useApplicationStore } from './applicationStore';
import { useAuthStore } from './authStore';
import { useNotificationStore } from './notificationStore';
import { useShiftStore } from './shiftStore';
import { useUserStore, asWorker } from './userStore';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AdminError =
  | 'USER_NOT_FOUND'
  | 'NOT_A_WORKER'
  | 'SHIFT_NOT_FOUND'
  | 'DISPUTE_NOT_FOUND'
  | 'INVALID_OUTCOME'
  | 'INVALID_SCORE'
  | 'REASON_REQUIRED'
  | 'CANNOT_SUSPEND_SELF'
  | 'CANNOT_SUSPEND_LAST_ADMIN';

interface AdminStore {
  suspend(userId: string): Result<true, AdminError>;
  reactivate(userId: string): Result<true, AdminError>;
  /**
   * Set a worker's reputation to an exact final score in [0, 100].
   *
   * `newScore` is the absolute target value, **not** a delta. The caller
   * also provides a non-empty `reason` which is appended to the worker's
   * cancellation/admin timeline and embedded in the in-app notification
   * fired to the affected worker.
   */
  adjustReputation(
    workerId: string,
    newScore: number,
    reason: string,
  ): Result<Worker, AdminError>;
  overrideEscrow(
    shiftId: string,
    status: EscrowStatus,
    note: string,
  ): Result<true, AdminError>;
  resolveDispute(
    disputeId: string,
    outcome: 'ResolvedReleased' | 'ResolvedRefunded',
    note: string,
  ): Result<Dispute, AdminError>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

function persistShifts(): void {
  write(STORAGE_KEYS.shifts, useShiftStore.getState().shifts);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAdminStore = create<AdminStore>(() => ({
  suspend(userId) {
    const userStore = useUserStore.getState();
    const user = userStore.findById(userId);
    if (!user) return { ok: false, error: 'USER_NOT_FOUND' };

    // Can't suspend yourself
    const currentAdminId = useAuthStore.getState().currentUserId;
    if (currentAdminId && userId === currentAdminId) {
      return { ok: false, error: 'CANNOT_SUSPEND_SELF' };
    }

    // Can't suspend the last active admin
    if (user.role === 'admin') {
      const otherActiveAdmins = userStore.users.filter(
        (u) => u.role === 'admin' && u.id !== userId && !u.suspended,
      );
      if (otherActiveAdmins.length === 0) {
        return { ok: false, error: 'CANNOT_SUSPEND_LAST_ADMIN' };
      }
    }

    userStore.setSuspended(userId, true);
    return { ok: true, value: true };
  },

  reactivate(userId) {
    const userStore = useUserStore.getState();
    const user = userStore.findById(userId);
    if (!user) return { ok: false, error: 'USER_NOT_FOUND' };
    userStore.setSuspended(userId, false);
    return { ok: true, value: true };
  },

  adjustReputation(workerId, newScore, reason) {
    const userStore = useUserStore.getState();
    const worker = asWorker(userStore.findById(workerId));
    if (!worker) return { ok: false, error: 'NOT_A_WORKER' };

    // Validate inputs — reason must be present, score must be a valid
    // integer in [0, 100]. Anything else is rejected so callers can surface
    // a precise error in the UI.
    const trimmedReason = reason.trim();
    if (trimmedReason === '') return { ok: false, error: 'REASON_REQUIRED' };
    if (
      typeof newScore !== 'number' ||
      Number.isNaN(newScore) ||
      !Number.isFinite(newScore) ||
      newScore < MIN_SCORE ||
      newScore > MAX_SCORE
    ) {
      return { ok: false, error: 'INVALID_SCORE' };
    }

    const finalScore = Math.round(newScore);
    const oldScore = worker.reputationScore;

    // Append a synthetic cancellation-history-like note so the admin
    // adjustment is visible on the worker profile timeline. We piggy-back on
    // `cancellationHistory` rather than introducing a new ledger for the MVP.
    const updated: Partial<Worker> = {
      reputationScore: finalScore,
      cancellationHistory: [
        ...worker.cancellationHistory,
        {
          id: `admin-adjust-${nowIso()}`,
          shiftId: '',
          cancelledAt: nowIso(),
          type: 'OnTime',
          reasonNote: `[Admin set ${oldScore} → ${finalScore}] ${trimmedReason}`,
        },
      ],
    };
    userStore.updateUser(worker.id, updated);

    const refreshed = asWorker(userStore.findById(worker.id));
    if (!refreshed) return { ok: false, error: 'NOT_A_WORKER' };

    // Notify the worker that their reputation has been adjusted (mock,
    // localStorage-only — no real push). Body includes old/new score + reason.
    useNotificationStore.getState().push({
      userId: worker.id,
      kind: 'ReputationAdjusted',
      title: 'Điểm uy tín đã được cập nhật',
      body:
        `Điểm uy tín của bạn đã được điều chỉnh từ ${oldScore} thành ${finalScore}. ` +
        `Lý do: ${trimmedReason}`,
      link: '/worker/profile',
    });

    return { ok: true, value: refreshed };
  },

  overrideEscrow(shiftId, status, note) {
    const shiftStore = useShiftStore.getState();
    const shift = shiftStore.getById(shiftId);
    if (!shift) return { ok: false, error: 'SHIFT_NOT_FOUND' };

    const next = shiftStore.shifts.map((s) =>
      s.id === shiftId
        ? { ...s, escrowStatus: status, updatedAt: nowIso() }
        : s,
    );
    shiftStore.hydrate(next);
    persistShifts();

    // Best-effort log via console so the admin reason is captured during dev.
    console.info(`[admin] override escrow on ${shiftId} -> ${status}: ${note}`);

    return { ok: true, value: true };
  },

  resolveDispute(disputeId, outcome, note) {
    if (outcome !== 'ResolvedReleased' && outcome !== 'ResolvedRefunded') {
      return { ok: false, error: 'INVALID_OUTCOME' };
    }

    const appStore = useApplicationStore.getState();
    const dispute = appStore.disputes.find((d) => d.id === disputeId);
    if (!dispute) return { ok: false, error: 'DISPUTE_NOT_FOUND' };

    const ts = nowIso();
    const updated: Dispute = {
      ...dispute,
      status: outcome as DisputeStatus,
      resolutionNote: note,
      resolvedAt: ts,
    };
    const disputes = appStore.disputes.map((d) => (d.id === disputeId ? updated : d));
    appStore.hydrateDisputes(disputes);
    write(STORAGE_KEYS.disputes, disputes);

    // Drive the linked shift's escrow to match the resolution.
    const shiftStore = useShiftStore.getState();
    const targetEscrow: EscrowStatus =
      outcome === 'ResolvedReleased' ? 'Released' : 'Refunded';
    const shifts = shiftStore.shifts.map((s) =>
      s.id === dispute.shiftId
        ? { ...s, escrowStatus: targetEscrow, updatedAt: ts }
        : s,
    );
    shiftStore.hydrate(shifts);
    persistShifts();

    return { ok: true, value: updated };
  },
}));
