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
import { appendShiftTimelineEntry } from '@/domain/shiftTimeline';
import { formatVND } from '@/lib/format';
import type {
  Application,
  ApplicationStatus,
  Dispute,
  DisputeStatus,
  EscrowStatus,
  NotificationKind,
  Result,
  Worker,
} from '@/types';

import { useApplicationStore } from './applicationStore';
import { useAuthStore } from './authStore';
import { useNotificationStore } from './notificationStore';
import { useShiftStore } from './shiftStore';
import { useUserStore, asWorker } from './userStore';
import { useWalletStore } from './walletStore';

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
  | 'CANNOT_SUSPEND_LAST_ADMIN'
  /**
   * Phase 10C-Stab-1 Batch 3 F — admin tried to resolve a dispute
   * that is already resolved or in an otherwise non-resolvable state.
   */
  | 'WRONG_STATUS';

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
  /**
   * Phase 10C-Stab-1 Batch 4 H — admin asks worker / employer / both
   * sides for additional evidence on a dispute. Idempotent re-requests
   * are allowed: a dispute already in `'RequestedMoreEvidence'` can be
   * re-requested with a different note.
   */
  requestMoreEvidence(
    disputeId: string,
    target: 'worker' | 'employer' | 'both',
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

/**
 * Phase 10C-Stab-1 Batch 4B — append a timeline entry to the
 * specified shift and persist. Same pattern as the helper in
 * applicationStore but kept here to avoid a cross-store cycle.
 */
function appendTimelineToShift(
  shiftId: string,
  kind: import('@/types').ShiftTimelineEntry['kind'],
  note: string,
): void {
  const shiftStore = useShiftStore.getState();
  const shift = shiftStore.getById(shiftId);
  if (!shift) return;
  const nextTimeline = appendShiftTimelineEntry(shift.timeline, {
    kind,
    note,
  });
  const nextShifts = shiftStore.shifts.map((s) =>
    s.id === shiftId ? { ...s, timeline: nextTimeline } : s,
  );
  shiftStore.hydrate(nextShifts);
  write(STORAGE_KEYS.shifts, nextShifts);
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
      // Phase 9L — deep-link to the worker dashboard with the reputation
      // detail modal pre-opened so the worker sees the admin adjustment
      // row immediately.
      link: '/worker/dashboard?modal=reputation',
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

    // Phase 10C-Stab-1 Batch 3 F — block re-resolution. Disputes
    // remain resolvable while in `'Open'` or `'RequestedMoreEvidence'`;
    // every other status is terminal.
    if (
      dispute.status !== 'Open' &&
      dispute.status !== 'RequestedMoreEvidence'
    ) {
      return { ok: false, error: 'WRONG_STATUS' };
    }

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

    // ---------------------------------------------------------------
    // Phase 10C-Stab-1 Batch 3 F — flip the linked application out of
    // 'Disputed' into the appropriate terminal status, then notify
    // both sides.
    // ---------------------------------------------------------------
    const linkedApp = appStore.applications.find(
      (a) => a.id === dispute.applicationId,
    );
    if (linkedApp) {
      let nextStatus: ApplicationStatus = linkedApp.status;
      let appPatch: Partial<Application> = {};
      if (outcome === 'ResolvedReleased') {
        nextStatus = 'Confirmed';
        appPatch = { status: 'Confirmed', confirmedAt: ts };
      } else if (outcome === 'ResolvedRefunded') {
        nextStatus = 'NoShow';
        appPatch = { status: 'NoShow', noShowAt: ts };
      }
      if (nextStatus !== linkedApp.status) {
        const updatedApp: Application = { ...linkedApp, ...appPatch };
        const apps = appStore.applications.map((a) =>
          a.id === linkedApp.id ? updatedApp : a,
        );
        useApplicationStore.setState({ applications: apps });
        write(STORAGE_KEYS.applications, apps);
      }

      // Compose notifications for the worker + employer. Body quotes
      // the shift title and the deposit amount so both sides have a
      // ledger-grade record of the resolution.
      const shift = useShiftStore.getState().getById(dispute.shiftId);
      const shiftTitle = shift?.title ?? 'ca làm';
      const amountVN = shift ? formatVND(shift.depositAmount) : '';
      const kind: NotificationKind = 'DisputeResolved';
      if (outcome === 'ResolvedReleased') {
        useNotificationStore.getState().push({
          userId: linkedApp.workerId,
          kind,
          title: 'Tranh chấp đã được giải quyết',
          body:
            `Quản trị viên đã thanh toán cho bạn cho ca "${shiftTitle}".` +
            (amountVN ? ` Tiền công ${amountVN} đã được giải ngân.` : ''),
          link: `/shifts/${dispute.shiftId}`,
        });
        if (shift) {
          useNotificationStore.getState().push({
            userId: shift.employerId,
            kind,
            title: 'Tranh chấp đã được giải quyết',
            body:
              `Quản trị viên đã thanh toán toàn bộ tiền cọc cho người lao động cho ca "${shiftTitle}".` +
              (amountVN ? ` Số tiền: ${amountVN}.` : ''),
            link: `/employer/shifts/${dispute.shiftId}`,
          });
        }
      } else {
        // ResolvedRefunded
        useNotificationStore.getState().push({
          userId: linkedApp.workerId,
          kind,
          title: 'Tranh chấp đã được giải quyết',
          body:
            `Quản trị viên đã hoàn tiền đặt cọc cho nhà tuyển dụng cho ca "${shiftTitle}".` +
            (amountVN ? ` Số tiền hoàn: ${amountVN}.` : ''),
          link: `/shifts/${dispute.shiftId}`,
        });
        if (shift) {
          useNotificationStore.getState().push({
            userId: shift.employerId,
            kind,
            title: 'Tranh chấp đã được giải quyết',
            body:
              `Quản trị viên đã hoàn tiền đặt cọc cho bạn cho ca "${shiftTitle}".` +
              (amountVN ? ` Số tiền hoàn: ${amountVN}.` : ''),
            link: `/employer/shifts/${dispute.shiftId}`,
          });
        }
      }

      // Stamp the application-level idempotency marker so a future
      // re-resolve attempt (which is now blocked anyway) wouldn't
      // re-fire the notification.
      const finalApps = useApplicationStore.getState().applications.map((a) =>
        a.id === linkedApp.id
          ? { ...a, disputeResolutionNotifiedAt: ts }
          : a,
      );
      useApplicationStore.setState({ applications: finalApps });
      write(STORAGE_KEYS.applications, finalApps);

      // Phase 10C-Stab-1 Batch 4 J — settle wallet ledger.
      const shiftFinal = useShiftStore.getState().getById(dispute.shiftId);
      if (shiftFinal) {
        const amount =
          linkedApp.payoutAmount && linkedApp.payoutAmount > 0
            ? linkedApp.payoutAmount
            : shiftFinal.depositAmount;
        if (outcome === 'ResolvedReleased') {
          useWalletStore
            .getState()
            .credit(linkedApp.workerId, amount, 'WorkerWageReleased', {
              shiftId: shiftFinal.id,
              applicationId: linkedApp.id,
              note: `Tranh chấp giải quyết — thanh toán cho ca "${shiftFinal.title}"`,
            });
        } else if (outcome === 'ResolvedRefunded') {
          useWalletStore
            .getState()
            .credit(shiftFinal.employerId, amount, 'EmployerDisputeRefund', {
              shiftId: shiftFinal.id,
              applicationId: linkedApp.id,
              note: `Tranh chấp giải quyết — hoàn cọc cho ca "${shiftFinal.title}"`,
            });
        }
      }

      // Phase 10C-Stab-1 Batch 4B — timeline emission. Two entries
      // so the audit log records both the resolution decision and
      // the resulting wallet movement.
      if (shiftFinal) {
        appendTimelineToShift(
          shiftFinal.id,
          'AdminResolvedDispute',
          outcome === 'ResolvedReleased'
            ? `Quản trị viên giải quyết: thanh toán cho người làm.`
            : `Quản trị viên giải quyết: hoàn cọc cho nhà tuyển dụng.`,
        );
        appendTimelineToShift(
          shiftFinal.id,
          outcome === 'ResolvedReleased' ? 'WageReleased' : 'WageRefunded',
          outcome === 'ResolvedReleased'
            ? `Đã giải ngân tiền công sau khiếu nại.`
            : `Đã hoàn cọc cho nhà tuyển dụng sau khiếu nại.`,
        );
      }
    }

    return { ok: true, value: updated };
  },

  // -----------------------------------------------------------------
  // Phase 10C-Stab-1 Batch 4 H — request more evidence
  // -----------------------------------------------------------------
  requestMoreEvidence(disputeId, target, note) {
    const trimmedNote = (note ?? '').trim();
    if (trimmedNote === '') return { ok: false, error: 'REASON_REQUIRED' };

    const appStore = useApplicationStore.getState();
    const dispute = appStore.disputes.find((d) => d.id === disputeId);
    if (!dispute) return { ok: false, error: 'DISPUTE_NOT_FOUND' };
    if (
      dispute.status !== 'Open' &&
      dispute.status !== 'RequestedMoreEvidence'
    ) {
      return { ok: false, error: 'WRONG_STATUS' };
    }

    const updated: Dispute = {
      ...dispute,
      status: 'RequestedMoreEvidence',
      resolutionNote: trimmedNote,
      evidenceRequestTarget: target,
    };
    const disputes = appStore.disputes.map((d) =>
      d.id === disputeId ? updated : d,
    );
    appStore.hydrateDisputes(disputes);
    write(STORAGE_KEYS.disputes, disputes);

    const shift = useShiftStore.getState().getById(dispute.shiftId);
    const shiftTitle = shift?.title ?? 'ca làm';
    const linkedApp = appStore.applications.find(
      (a) => a.id === dispute.applicationId,
    );
    const targets: Array<'worker' | 'employer'> =
      target === 'both' ? ['worker', 'employer'] : [target];
    for (const t of targets) {
      const userId =
        t === 'worker'
          ? linkedApp?.workerId
          : shift?.employerId;
      if (!userId) continue;
      useNotificationStore.getState().push({
        userId,
        kind: 'AdminRequestedEvidence',
        title: 'Quản trị viên yêu cầu bổ sung bằng chứng',
        body: `Quản trị viên cần thêm thông tin về tranh chấp ca "${shiftTitle}". Lý do: ${trimmedNote}`,
        link:
          t === 'worker'
            ? `/shifts/${dispute.shiftId}`
            : `/employer/shifts/${dispute.shiftId}`,
      });
    }

    // Phase 10C-Stab-1 Batch 4B — timeline emission.
    if (shift) {
      appendTimelineToShift(
        shift.id,
        'AdminRequestedEvidence',
        `Quản trị viên yêu cầu ${target === 'both' ? 'cả hai bên' : target === 'worker' ? 'người làm' : 'nhà tuyển dụng'} bổ sung bằng chứng — ${trimmedNote.slice(0, 120)}`,
      );
    }

    return { ok: true, value: updated };
  },
}));