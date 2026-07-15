'use client';

/**
 * TaskBadge — Phase 10A-Fix-4.
 *
 * Small "needs your attention" indicator for nav links and tab
 * buttons. Two display modes:
 *
 *   - count >= 2 → red pill with the number (clamped at "9+").
 *   - count === 1 → small red dot (less noisy than "1").
 *   - count <= 0 → renders nothing.
 *
 * Designed to sit absolutely-positioned on the top-right of a parent
 * `<Link>` / `<button>` (the parent must be `relative`). The component
 * is purely presentational; counts are computed by the caller via the
 * pure helpers in `src/domain/taskBadges.ts`.
 *
 * Accessible label: when a count is provided, screen readers announce
 * "{count} mục cần xử lý". Pure-dot mode falls back to a generic
 * "Có mục cần xử lý" so the indicator isn't silent.
 */

import type { ReactNode } from 'react';

interface TaskBadgeProps {
  /** Item count. Negative or zero → renders nothing. */
  count: number;
  /**
   * Optional accessible-label override. Defaults to a Vietnamese
   * sentence using the count.
   */
  ariaLabel?: string;
  /** Additional class names for layout tweaks (positioning, etc.). */
  className?: string;
}

export function TaskBadge({
  count,
  ariaLabel,
  className = '',
}: TaskBadgeProps): ReactNode {
  if (count <= 0) return null;

  const isDot = count === 1;
  const display = count > 9 ? '9+' : String(count);
  const label =
    ariaLabel ??
    (isDot ? 'Có mục cần xử lý' : `${display} mục cần xử lý`);

  if (isDot) {
    return (
      <span
        role="status"
        aria-label={label}
        className={[
          'pointer-events-none absolute -top-1 -right-1',
          'h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm',
          className,
        ].join(' ')}
      />
    );
  }

  return (
    <span
      role="status"
      aria-label={label}
      className={[
        'pointer-events-none absolute -top-1.5 -right-1.5',
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1',
        'rounded-full bg-red-500 text-[10px] font-bold leading-none text-white',
        'ring-2 ring-white shadow-sm',
        className,
      ].join(' ')}
    >
      {display}
    </span>
  );
}
