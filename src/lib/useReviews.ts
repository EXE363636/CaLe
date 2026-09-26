'use client';

/**
 * Đánh giá người lao động NHẬN được (nhà tuyển dụng → worker).
 *   supabase: từ applicationStore.ratings (nạp từ shift_reviews, 0024);
 *   local/demo: từ hồ sơ `worker.ratingsReceived` như trước.
 */

import { useMemo } from 'react';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { useApplicationStore } from '@/stores/applicationStore';
import type { Rating, Worker } from '@/types';

export function useWorkerReviews(worker: Worker | null | undefined): Rating[] {
  const ratings = useApplicationStore((s) => s.ratings);
  return useMemo(() => {
    if (!worker) return [];
    if (!isSupabaseEnv()) return worker.ratingsReceived;
    return ratings
      .filter((r) => r.toUserId === worker.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [worker, ratings]);
}
