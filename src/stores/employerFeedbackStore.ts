/**
 * Employer feedback store (Phase 6).
 *
 * Worker → employer feedback after a confirmed shift. Mirrors `ratings`
 * (which is employer-authored worker feedback) but lives in its own slice
 * so the existing rating immutability invariants are not affected.
 *
 * Records are immutable once submitted and persisted to localStorage via
 * `STORAGE_KEYS.employerFeedback`.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import type {
  EmployerFeedback,
  EmployerFeedbackTag,
  Result,
} from '@/types';

import { useNotificationStore } from './notificationStore';
import { useShiftStore } from './shiftStore';
import { useUserStore } from './userStore';
import { useApplicationStore } from './applicationStore';
import { STORAGE_KEYS as APP_STORAGE_KEYS, write as appWrite } from '@/data/persistence';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FeedbackError =
  | 'INVALID_STARS'
  | 'ALREADY_SUBMITTED'
  | 'COMMENT_TOO_LONG';

export interface NewEmployerFeedbackInput {
  shiftId: string;
  applicationId: string;
  fromUserId: string;
  toEmployerId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  tags: EmployerFeedbackTag[];
}

interface EmployerFeedbackStore {
  feedback: EmployerFeedback[];

  // Reads
  forEmployer(employerId: string): EmployerFeedback[];
  forApplication(applicationId: string): EmployerFeedback | undefined;

  // Mutators
  submit(input: NewEmployerFeedbackInput): Result<EmployerFeedback, FeedbackError>;

  /** Hydrate the slice from a persisted snapshot. */
  hydrate(feedback: EmployerFeedback[]): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMMENT_MAX = 500;

const nowIso = (): string => new Date().toISOString();

function persist(feedback: EmployerFeedback[]): void {
  write(STORAGE_KEYS.employerFeedback, feedback);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEmployerFeedbackStore = create<EmployerFeedbackStore>((set, get) => ({
  feedback: [],

  forEmployer(employerId) {
    return get().feedback.filter((f) => f.toEmployerId === employerId);
  },

  forApplication(applicationId) {
    return get().feedback.find((f) => f.applicationId === applicationId);
  },

  submit(input) {
    if (
      !Number.isFinite(input.stars) ||
      input.stars < 1 ||
      input.stars > 5 ||
      !Number.isInteger(input.stars)
    ) {
      return { ok: false, error: 'INVALID_STARS' };
    }
    const trimmed = (input.comment ?? '').trim();
    if (trimmed.length > COMMENT_MAX) {
      return { ok: false, error: 'COMMENT_TOO_LONG' };
    }

    if (get().feedback.some((f) => f.applicationId === input.applicationId)) {
      return { ok: false, error: 'ALREADY_SUBMITTED' };
    }

    const record: EmployerFeedback = {
      id: newPrefixedId('empfb'),
      shiftId: input.shiftId,
      applicationId: input.applicationId,
      fromUserId: input.fromUserId,
      toEmployerId: input.toEmployerId,
      stars: input.stars,
      comment: trimmed.length > 0 ? trimmed : undefined,
      // Dedupe tags defensively — UI is checkbox-driven so duplicates
      // are unlikely, but this keeps the contract simple.
      tags: Array.from(new Set(input.tags)),
      createdAt: nowIso(),
    };

    const next = [...get().feedback, record];
    set({ feedback: next });
    persist(next);

    // Phase 10C-Stab-1 Batch 4 E — clear paidAwaitingRatingAt and
    // stamp workerRatedEmployerAt on the matching application.
    {
      const appsState = useApplicationStore.getState();
      const updatedApps = appsState.applications.map((a) =>
        a.id === input.applicationId
          ? {
              ...a,
              workerRatedEmployerAt: record.createdAt,
              paidAwaitingRatingAt: undefined,
            }
          : a,
      );
      useApplicationStore.setState({ applications: updatedApps });
      appWrite(APP_STORAGE_KEYS.applications, updatedApps);
    }

    // Phase 6: notify the employer that they have new feedback. Body
    // includes the worker name + shift title so it's actionable from the
    // bell. Mock / localStorage only — no real push.
    const worker = useUserStore.getState().findById(input.fromUserId);
    const shift = useShiftStore.getState().getById(input.shiftId);
    const workerName =
      worker && worker.role === 'worker' ? worker.fullName : 'Người làm';
    useNotificationStore.getState().push({
      userId: input.toEmployerId,
      kind: 'WorkerRatedEmployer',
      title: 'Người làm đã đánh giá bạn',
      body: shift
        ? `${workerName} đã gửi đánh giá ${input.stars}/5 sao cho ca "${shift.title}".`
        : `${workerName} đã gửi đánh giá ${input.stars}/5 sao.`,
      link: '/employer/profile',
    });

    return { ok: true, value: record };
  },

  hydrate(feedback) {
    set({ feedback });
  },
}));
