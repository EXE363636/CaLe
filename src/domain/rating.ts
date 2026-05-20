/**
 * Rating aggregation domain module.
 *
 * Pure TypeScript — no React, no Next, no I/O. Backs Requirement 13.3
 * (display the average rating a worker has received).
 *
 * Each `Rating.stars` value is constrained by the type system to the integer
 * range `[1, 5]`, so the arithmetic mean of any non-empty rating list also
 * lies in `[1, 5]`. An empty list has no defined mean and is reported as
 * `null` so callers can render a placeholder (e.g. "Chưa có đánh giá").
 */

import type { Rating } from '@/types';

/**
 * Compute the arithmetic mean of a list of ratings.
 *
 * Returns `null` when the list is empty. Otherwise returns
 * `sum(stars) / ratings.length`, which always lies within `[1, 5]` because
 * each `Rating.stars` is in `[1, 5]`.
 *
 * The result is permutation-invariant: re-ordering the input list does not
 * change the output. Callers that need a rounded display value should round
 * at the presentation layer.
 */
export function averageRating(ratings: Rating[]): number | null {
  if (ratings.length === 0) return null;

  let sum = 0;
  for (const rating of ratings) {
    sum += rating.stars;
  }
  return sum / ratings.length;
}
