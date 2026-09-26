/**
 * Review repo (supabase) — đánh giá hai chiều sau ca, migration 0024.
 * Đọc bảng `shift_reviews` (RLS: mọi người dùng đã đăng nhập); ghi qua RPC
 * `submit_shift_review` (server tự suy ra chiều + người nhận, chỉ nhận đơn
 * 'Confirmed' trong 14 ngày sau ca, mỗi chiều một lần).
 *
 * Map về 2 kiểu có sẵn để UI cũ dùng lại:
 *   employer_to_worker → `Rating`          (applicationStore.ratings)
 *   worker_to_employer → `EmployerFeedback` (employerFeedbackStore)
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { EmployerFeedback, EmployerFeedbackTag, Rating } from '@/types';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const stars = (v: unknown): 1 | 2 | 3 | 4 | 5 => {
  const n = typeof v === 'number' ? Math.round(v) : 0;
  return (Math.min(5, Math.max(1, n)) as 1 | 2 | 3 | 4 | 5);
};

export interface ReviewRows {
  ratings: Rating[];
  feedback: EmployerFeedback[];
}

/** Lỗi "server chưa có bảng/RPC" (0024 chưa apply). */
export class ReviewBackendMissingError extends Error {}
const MISSING_CODES = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);

export function splitReviewRows(rows: Row[]): ReviewRows {
  const ratings: Rating[] = [];
  const feedback: EmployerFeedback[] = [];
  for (const r of rows) {
    const comment = s(r.comment) || undefined;
    if (r.direction === 'employer_to_worker') {
      ratings.push({
        id: s(r.id),
        shiftId: s(r.shift_id),
        applicationId: s(r.application_id),
        fromUserId: s(r.from_user_id),
        toUserId: s(r.to_user_id),
        stars: stars(r.stars),
        feedback: comment,
        createdAt: s(r.created_at),
      });
    } else if (r.direction === 'worker_to_employer') {
      feedback.push({
        id: s(r.id),
        shiftId: s(r.shift_id),
        applicationId: s(r.application_id),
        fromUserId: s(r.from_user_id),
        toEmployerId: s(r.to_user_id),
        stars: stars(r.stars),
        comment,
        tags: (Array.isArray(r.tags) ? r.tags : []) as EmployerFeedbackTag[],
        createdAt: s(r.created_at),
      });
    }
  }
  return { ratings, feedback };
}

const CHUNK = 80;

/** Mọi đánh giá GỬI TỚI hoặc DO các user này viết. */
export async function listReviewsInvolving(userIds: string[]): Promise<ReviewRows> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return { ratings: [], feedback: [] };
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK).join(',');
    const { data, error } = await getSupabaseClient()
      .from('shift_reviews')
      .select('id, application_id, shift_id, direction, from_user_id, to_user_id, stars, comment, tags, created_at')
      .or(`to_user_id.in.(${part}),from_user_id.in.(${part})`)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code && MISSING_CODES.has(error.code)) {
        throw new ReviewBackendMissingError(error.message);
      }
      throw new Error(`list shift_reviews: ${error.message}`);
    }
    if (Array.isArray(data)) rows.push(...(data as Row[]));
  }
  // Gộp trùng (một review có thể khớp cả hai phía của hai chunk).
  const seen = new Set<string>();
  return splitReviewRows(rows.filter((r) => (seen.has(s(r.id)) ? false : (seen.add(s(r.id)), true))));
}

/**
 * Gửi đánh giá cho đơn `applicationId`. Server tự quyết chiều theo người gọi.
 * Ném Error với message = mã lỗi server (NOT_COMPLETED, ALREADY_SUBMITTED, ...).
 */
export async function submitShiftReview(input: {
  applicationId: string;
  stars: number;
  comment?: string;
  tags?: EmployerFeedbackTag[];
}): Promise<ReviewRows> {
  const { data, error } = await getSupabaseClient().rpc('submit_shift_review', {
    p_application_id: input.applicationId,
    p_stars: input.stars,
    p_comment: input.comment ?? null,
    p_tags: input.tags ?? [],
  });
  if (error) {
    if (error.code && MISSING_CODES.has(error.code)) {
      throw new ReviewBackendMissingError(error.message);
    }
    const known = /[A-Z_]{6,}/.exec(error.message)?.[0];
    throw new Error(known ?? error.message);
  }
  return splitReviewRows(data ? [data as Row] : []);
}
