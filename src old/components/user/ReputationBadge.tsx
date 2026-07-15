/**
 * ReputationBadge
 *
 * Displays a worker's reputation score with colour-coded styling:
 *   ≥ 80  → green
 *   ≥ 50  → amber
 *   < 50  → red
 *
 * No hooks → no 'use client' needed.
 */

export interface ReputationBadgeProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

function getColorClasses(score: number): string {
  if (score >= 80) return 'text-green-700 bg-green-100';
  if (score >= 50) return 'text-amber-700 bg-amber-100';
  return 'text-red-700 bg-red-100';
}

export function ReputationBadge({
  score,
  showLabel = true,
  className = '',
}: ReputationBadgeProps) {
  const colorClasses = getColorClasses(score);

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClasses,
        className,
      ].join(' ')}
    >
      {showLabel ? `⭐ ${score} điểm` : score}
    </span>
  );
}
