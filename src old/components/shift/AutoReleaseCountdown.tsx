'use client';

/**
 * Phase 10C — Auto-release countdown.
 *
 * Presentational component that renders an `hh:mm:ss` countdown to
 * `autoReleaseAt`. Used inside the employer confirmation panel so
 * the employer can see how long they have to confirm or dispute
 * before the auto-release lifecycle would settle the application
 * (the lifecycle itself ships in Wave 7).
 *
 * Implementation notes:
 *
 *   - A single UI-local `setInterval(..., 1000)` keeps the rendered
 *     value fresh. This timer is presentational only — it never
 *     mutates store state and is torn down on unmount or when the
 *     countdown reaches zero. The auto-release lifecycle action
 *     itself does NOT use timers (per Requirement 6.8).
 *   - When `autoReleaseAt` is in the past, the component renders
 *     `00:00:00` and stops scheduling further ticks.
 *   - Tests inject a deterministic `nowSource` so a `vi.useFakeTimers()`
 *     harness can advance the clock without flake.
 *   - Accessible label "Đếm ngược tự động thanh toán" + a stable
 *     `data-testid="auto-release-countdown"` so the Wave 12 property
 *     test (Requirement 11.12) can locate the element across
 *     re-renders.
 */

import { useEffect, useMemo, useState } from 'react';

export interface AutoReleaseCountdownProps {
  /** ISO 8601 deadline. */
  autoReleaseAt: string;
  /**
   * Optional override for the wall clock. Tests pass a deterministic
   * source so the rendered value is stable under fake timers. When
   * omitted, the component falls back to `Date.now()`.
   */
  nowSource?: () => number;
  /** Extra Tailwind classes for the wrapper element. */
  className?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatRemaining(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function AutoReleaseCountdown({
  autoReleaseAt,
  nowSource,
  className = '',
}: AutoReleaseCountdownProps) {
  const deadlineMs = useMemo(() => Date.parse(autoReleaseAt), [autoReleaseAt]);
  const [now, setNow] = useState<number>(() =>
    nowSource ? nowSource() : Date.now(),
  );

  // Tick once per second. The interval is torn down when the
  // component unmounts OR when the deadline has been reached so we
  // don't keep work scheduled in the background.
  useEffect(() => {
    const tick = () => setNow(nowSource ? nowSource() : Date.now());
    // Run an immediate tick on mount so the first paint reflects
    // the latest `nowSource()` value rather than the stale
    // initial-state snapshot.
    tick();
    if (Number.isFinite(deadlineMs) && deadlineMs <= (nowSource ? nowSource() : Date.now())) {
      return undefined;
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, nowSource]);

  const remainingMs = Number.isFinite(deadlineMs) ? deadlineMs - now : 0;
  const display = formatRemaining(remainingMs);
  const isExpired = remainingMs <= 0;

  return (
    <span
      data-testid="auto-release-countdown"
      aria-label="Đếm ngược tự động thanh toán"
      className={[
        'inline-flex items-center justify-center rounded-md font-mono text-sm tabular-nums tracking-wider',
        isExpired
          ? 'bg-gray-100 px-2 py-1 text-gray-500'
          : 'bg-orange-50 px-2 py-1 text-orange-700 ring-1 ring-orange-200',
        className,
      ].join(' ')}
      role="timer"
    >
      {display}
    </span>
  );
}
