/**
 * Đánh giá hai chiều sau ca (0024):
 *  - canReviewApplication: chỉ đơn 'Confirmed', chưa đánh giá, trong 14 ngày;
 *  - splitReviewRows: map đúng chiều về Rating / EmployerFeedback;
 *  - submitReviewAsync: thêm vào store khi thành công, lỗi server → thông
 *    điệp tiếng Việt, không đổi store.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ submit: vi.fn(), list: vi.fn() }));

vi.mock('@/data/repos/reviewRepo', async (orig) => {
  const actual = await orig<typeof import('@/data/repos/reviewRepo')>();
  return {
    ...actual,
    submitShiftReview: repo.submit,
    listReviewsInvolving: repo.list,
  };
});

import { canReviewApplication, reviewDeadlineMs } from '@/domain/reviewEligibility';
import { splitReviewRows } from '@/data/repos/reviewRepo';
import { submitReviewAsync } from '@/lib/reviewSync';
import { useApplicationStore } from '@/stores/applicationStore';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';

const shift = { date: '2026-09-24', startTime: '17:05', endTime: '18:05' };
const endMs = new Date('2026-09-24T18:05:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('canReviewApplication', () => {
  it('chỉ đơn Confirmed, chưa đánh giá', () => {
    expect(canReviewApplication({ status: 'Confirmed' }, shift, false, endMs + DAY)).toBe(true);
    expect(canReviewApplication({ status: 'CheckedOut' }, shift, false, endMs + DAY)).toBe(false);
    expect(canReviewApplication({ status: 'Confirmed' }, shift, true, endMs + DAY)).toBe(false);
    expect(canReviewApplication(undefined, shift, false, endMs)).toBe(false);
  });
  it('hết hạn sau 14 ngày kể từ giờ kết thúc ca', () => {
    expect(canReviewApplication({ status: 'Confirmed' }, shift, false, endMs + 14 * DAY)).toBe(true);
    expect(canReviewApplication({ status: 'Confirmed' }, shift, false, endMs + 14 * DAY + 1)).toBe(false);
  });
  it('ca qua đêm: kết thúc vào ngày hôm sau', () => {
    const night = { date: '2026-09-24', startTime: '22:00', endTime: '02:00' };
    expect(reviewDeadlineMs(night)).toBe(new Date('2026-09-25T02:00:00').getTime() + 14 * DAY);
  });
});

describe('splitReviewRows', () => {
  it('employer_to_worker → Rating, worker_to_employer → EmployerFeedback', () => {
    const { ratings, feedback } = splitReviewRows([
      { id: 'r1', direction: 'employer_to_worker', application_id: 'a1', shift_id: 's1', from_user_id: 'e1', to_user_id: 'w1', stars: 5, comment: 'Nhanh nhẹn', tags: [], created_at: '2026-09-25T00:00:00Z' },
      { id: 'r2', direction: 'worker_to_employer', application_id: 'a1', shift_id: 's1', from_user_id: 'w1', to_user_id: 'e1', stars: 4, comment: null, tags: ['PaidOnTime'], created_at: '2026-09-25T01:00:00Z' },
    ]);
    expect(ratings).toEqual([
      expect.objectContaining({ id: 'r1', fromUserId: 'e1', toUserId: 'w1', stars: 5, feedback: 'Nhanh nhẹn' }),
    ]);
    expect(feedback).toEqual([
      expect.objectContaining({ id: 'r2', fromUserId: 'w1', toEmployerId: 'e1', stars: 4, tags: ['PaidOnTime'] }),
    ]);
    expect(feedback[0].comment).toBeUndefined();
  });
});

describe('submitReviewAsync', () => {
  beforeEach(() => {
    repo.submit.mockReset();
    useApplicationStore.getState().hydrateRatings([]);
    useEmployerFeedbackStore.getState().hydrate([]);
  });

  it('thành công → thêm vào store tương ứng', async () => {
    repo.submit.mockResolvedValue(
      splitReviewRows([
        { id: 'r9', direction: 'worker_to_employer', application_id: 'a9', shift_id: 's9', from_user_id: 'w1', to_user_id: 'e1', stars: 5, tags: [], created_at: '2026-09-25T00:00:00Z' },
      ]),
    );
    const res = await submitReviewAsync({ applicationId: 'a9', stars: 5 });
    expect(res.ok).toBe(true);
    expect(useEmployerFeedbackStore.getState().feedback.map((f) => f.id)).toEqual(['r9']);
  });

  it('server báo đã đánh giá → thông điệp tiếng Việt, store không đổi', async () => {
    repo.submit.mockRejectedValue(new Error('ALREADY_SUBMITTED'));
    const res = await submitReviewAsync({ applicationId: 'a9', stars: 5 });
    expect(res).toEqual({ ok: false, error: 'Bạn đã đánh giá ca này rồi.' });
    expect(useEmployerFeedbackStore.getState().feedback).toEqual([]);
  });
});
