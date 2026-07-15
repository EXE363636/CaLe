/**
 * Review-report store (CORE-STABILITY-7 Part 6).
 *
 * Mock-only. Records user reports against reviews ("Báo cáo đánh giá").
 * Reporting NEVER deletes the underlying review — it creates an
 * admin-visible record and the UI flags the review as "Đang được xem
 * xét". Persisted to localStorage under `STORAGE_KEYS.reviewReports`.
 *
 * Mirrors existing store patterns: hydrate on boot, persist on every
 * mutation, no setTimeout / setInterval / polling.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import { notifyAdmins } from '@/lib/adminNotifications';
import { useUserStore } from './userStore';
import { useNotificationStore } from './notificationStore';
import type { Result, ReviewReport } from '@/types';

export type ReviewReportError = 'REASON_REQUIRED' | 'ALREADY_REPORTED';

export interface NewReviewReportInput {
  targetKind: ReviewReport['targetKind'];
  targetReviewId: string;
  reportedByUserId: string;
  reason: string;
  note?: string;
}

interface ReviewReportStore {
  reports: ReviewReport[];

  /** All reports (admin queue). Newest first. */
  all(): ReviewReport[];
  /** Open reports only. */
  open(): ReviewReport[];
  /** Is a given review currently flagged (has an Open report)? */
  isReported(targetReviewId: string): boolean;
  forReview(targetReviewId: string): ReviewReport[];

  submit(
    input: NewReviewReportInput,
  ): Result<ReviewReport, ReviewReportError>;

  /** Admin marks a report resolved. */
  resolve(reportId: string, status: 'Reviewed' | 'Dismissed'): void;

  hydrate(reports: ReviewReport[]): void;
}

const nowIso = (): string => new Date().toISOString();

function persist(reports: ReviewReport[]): void {
  write(STORAGE_KEYS.reviewReports, reports);
}

export const useReviewReportStore = create<ReviewReportStore>((set, get) => ({
  reports: [],

  all() {
    return [...get().reports].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },

  open() {
    return get()
      .all()
      .filter((r) => r.status === 'Open');
  },

  isReported(targetReviewId) {
    return get().reports.some(
      (r) => r.targetReviewId === targetReviewId && r.status === 'Open',
    );
  },

  forReview(targetReviewId) {
    return get().reports.filter((r) => r.targetReviewId === targetReviewId);
  },

  submit(input) {
    const reason = (input.reason ?? '').trim();
    if (reason === '') return { ok: false, error: 'REASON_REQUIRED' };

    // One open report per (review, reporter) — re-reporting while an
    // Open report exists is a no-op error so a double-click / refresh
    // can't create duplicate records.
    const existingOpen = get().reports.find(
      (r) =>
        r.targetReviewId === input.targetReviewId &&
        r.reportedByUserId === input.reportedByUserId &&
        r.status === 'Open',
    );
    if (existingOpen) return { ok: false, error: 'ALREADY_REPORTED' };

    const record: ReviewReport = {
      id: newPrefixedId('review-report'),
      targetKind: input.targetKind,
      targetReviewId: input.targetReviewId,
      reportedByUserId: input.reportedByUserId,
      reason,
      note: input.note?.trim() || undefined,
      status: 'Open',
      createdAt: nowIso(),
    };
    const next = [record, ...get().reports];
    set({ reports: next });
    persist(next);

    // Notify every active admin so the report surfaces in the admin
    // dashboard. Deduped per report id.
    const users = useUserStore.getState().users;
    notifyAdmins({
      users,
      push: (n) => useNotificationStore.getState().push(n),
      kind: 'ReviewReported',
      title: 'Có báo cáo đánh giá mới',
      body: `Một đánh giá đã bị báo cáo. Lý do: ${reason}`,
      link: '/admin/dashboard',
      dedupeKey: `ReviewReported:${record.id}`,
    });

    return { ok: true, value: record };
  },

  resolve(reportId, status) {
    const next = get().reports.map((r) =>
      r.id === reportId ? { ...r, status } : r,
    );
    set({ reports: next });
    persist(next);
  },

  hydrate(reports) {
    set({ reports });
  },
}));
