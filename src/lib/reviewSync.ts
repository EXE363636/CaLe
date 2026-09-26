/**
 * Đồng bộ đánh giá hai chiều (0024) giữa server và 2 store có sẵn:
 *   applicationStore.ratings      ← employer_to_worker
 *   employerFeedbackStore.feedback ← worker_to_employer
 * Chỉ dùng ở supabase. Nạp khi mở app (AppHydrator) — không polling.
 */

import {
  ReviewBackendMissingError,
  listReviewsInvolving,
  submitShiftReview,
} from '@/data/repos/reviewRepo';
import { t } from '@/i18n/vi';
import { useApplicationStore } from '@/stores/applicationStore';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import type { EmployerFeedback, EmployerFeedbackTag, Rating, Result } from '@/types';
import { create } from 'zustand';

/**
 * Server đã có shift_reviews (0024) chưa. Form đánh giá chỉ hiện khi 'yes' —
 * trước khi migration được áp, không mời người dùng gửi một form chắc chắn lỗi.
 */
export const useReviewBackendStore = create<{ available: 'unknown' | 'yes' | 'no' }>(() => ({
  available: 'unknown',
}));

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map(current.map((x) => [x.id, x]));
  for (const x of incoming) byId.set(x.id, x);
  return [...byId.values()];
}

function applyRows(ratings: Rating[], feedback: EmployerFeedback[]): void {
  const app = useApplicationStore.getState();
  app.hydrateRatings(mergeById(app.ratings, ratings));
  const fb = useEmployerFeedbackStore.getState();
  fb.hydrate(mergeById(fb.feedback, feedback));
}

/** Nạp mọi đánh giá gửi tới / do các user này viết. Lỗi không chặn boot. */
export async function refetchReviews(userIds: string[]): Promise<void> {
  try {
    const rows = await listReviewsInvolving(userIds);
    applyRows(rows.ratings, rows.feedback);
    useReviewBackendStore.setState({ available: 'yes' });
  } catch (err) {
    // 0024 chưa apply → ẩn form; lỗi mạng → giữ nguyên, thử lại lần mở sau.
    if (err instanceof ReviewBackendMissingError) {
      useReviewBackendStore.setState({ available: 'no' });
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('[reviews] load failed', err);
    }
  }
}

const KNOWN_ERRORS = new Set([
  'NOT_COMPLETED',
  'ALREADY_SUBMITTED',
  'REVIEW_WINDOW_CLOSED',
  'NOT_PARTICIPANT',
  'INVALID_STARS',
  'COMMENT_TOO_LONG',
  'SUSPENDED',
]);

/** Gửi đánh giá; trả về thông điệp lỗi tiếng Việt khi thất bại. */
export async function submitReviewAsync(input: {
  applicationId: string;
  stars: number;
  comment?: string;
  tags?: EmployerFeedbackTag[];
}): Promise<Result<true, string>> {
  try {
    const rows = await submitShiftReview(input);
    applyRows(rows.ratings, rows.feedback);
    return { ok: true, value: true };
  } catch (err) {
    if (err instanceof ReviewBackendMissingError) {
      return { ok: false, error: t('review.error.unavailable') };
    }
    const code = err instanceof Error ? err.message : '';
    return {
      ok: false,
      error: KNOWN_ERRORS.has(code) ? t(`review.error.${code}`) : t('review.error.generic'),
    };
  }
}
