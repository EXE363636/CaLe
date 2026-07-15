'use client';

/**
 * Toast primitive (Phase 9O initial, Phase 9P UX polish, Phase 9Q
 * lifecycle hardening).
 *
 * - The single-toast component renders a card with an icon (vertically
 *   centered with the text block via `items-center`), a title + optional
 *   description, a close button, and a thin progress bar that animates
 *   from full width to zero over the toast's duration so the user can
 *   see when it's about to disappear.
 * - When `duration <= 0` the toast is sticky and the progress bar is not
 *   rendered.
 * - Phase 9Q: when `version` changes (dedupe re-trigger from the store),
 *   the auto-dismiss timer resets, the progress bar restarts, and a
 *   brief "shake" pulse plays so the user notices the repeated event
 *   without a duplicate card stacking up.
 * - The animation respects `prefers-reduced-motion` via a CSS toggle.
 *
 * Live region semantics:
 *   - `success` / `info` use `role="status"` + `aria-live="polite"`.
 *   - `warning` / `error` use `role="alert"` + `aria-live="assertive"`.
 *
 * The `<ToastHost>` (in `src/components/layout/ToastHost.tsx`) is the
 * single mount point. Pages should NOT instantiate `<Toast>` directly
 * — call `showSuccess` / `showError` from `@/lib/toast` instead.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import type { ToastTone } from '@/stores/toastStore';

interface ToastProps {
  title: string;
  description?: string;
  tone?: ToastTone;
  onClose: () => void;
  /** Auto-dismiss after ms. 0 = no auto-dismiss. Default 4000. */
  duration?: number;
  /**
   * Phase 9Q: changes whenever the store dedupes a repeated trigger.
   * Used as the dependency that resets the dismiss timer + progress
   * bar + shake animation.
   */
  version?: number;
}

const tonePalette: Record<
  ToastTone,
  { ring: string; icon: string; bar: string; progress: string }
> = {
  success: {
    ring: 'ring-emerald-200',
    icon: 'text-emerald-600 bg-emerald-50',
    bar: 'before:bg-emerald-500',
    progress: 'bg-emerald-500',
  },
  error: {
    ring: 'ring-red-200',
    icon: 'text-red-600 bg-red-50',
    bar: 'before:bg-red-500',
    progress: 'bg-red-500',
  },
  info: {
    ring: 'ring-blue-200',
    icon: 'text-blue-600 bg-blue-50',
    bar: 'before:bg-blue-500',
    progress: 'bg-blue-500',
  },
  warning: {
    ring: 'ring-amber-200',
    icon: 'text-amber-600 bg-amber-50',
    bar: 'before:bg-amber-500',
    progress: 'bg-amber-500',
  },
};

const toneIcon: Record<ToastTone, ReactNode> = {
  success: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

export function Toast({
  title,
  description,
  tone = 'info',
  onClose,
  duration = 4000,
  version = 1,
}: ToastProps) {
  // Phase 9R — auto-dismiss is now owned by the store (see
  // `toastStore.scheduleDismiss`). The component used to run its own
  // `setTimeout` keyed on `version`, but that occasionally raced with
  // Zustand state updates and left a stale toast on screen after the
  // progress bar finished. Removing the local timer makes the store
  // the single source of truth.
  //
  // The `version` prop is still consumed below so the progress bar
  // re-keys and the shake pulse plays on dedupe re-triggers.

  // Track the previous version so we can play the "shake" pulse only
  // on actual re-triggers, not on the initial mount. `useRef` keeps
  // the previous value across renders without scheduling another
  // render itself.
  const prevVersion = useRef(version);
  // eslint-disable-next-line react-hooks/refs -- intentional previous-version tracking to play the shake pulse only on a real re-trigger, not initial mount; ref is synced in the effect below
  const shouldShake = version !== prevVersion.current;
  useEffect(() => {
    prevVersion.current = version;
  }, [version]);

  const isAlert = tone === 'error' || tone === 'warning';
  const palette = tonePalette[tone];
  const showProgress = duration > 0;

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={[
        'toast-anim relative flex items-center gap-3 overflow-hidden rounded-xl bg-white px-4 py-3 shadow-lg',
        'min-w-[280px] max-w-sm text-sm',
        // Reserve a little extra bottom padding for the progress bar so
        // it doesn't crowd the description text.
        showProgress ? 'pb-4' : '',
        'ring-1',
        palette.ring,
        'before:absolute before:left-0 before:top-0 before:h-full before:w-1',
        palette.bar,
        // Phase 9Q — shake on dedupe re-trigger. The class re-applies
        // each time the toast re-renders with a higher version because
        // we key it on `version`.
        shouldShake ? 'toast-shake' : '',
      ].join(' ')}
      // Re-keying the outer node by version isn't enough because
      // `key` is owned by the parent. Instead we re-key the inner
      // progress element below.
    >
      {/* Icon — `items-center` on the row keeps the badge centered with
          the entire text block (Phase 9P alignment fix). */}
      <span
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          palette.icon,
        ].join(' ')}
        aria-hidden="true"
      >
        {toneIcon[tone]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-600">{description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Phase 9P — auto-dismiss progress bar. Sits at the bottom edge,
          width animates from 100% → 0% over `duration` so users can see
          when the toast will disappear. Hidden under
          `prefers-reduced-motion` via the global CSS rule. Re-keyed on
          `version` so dedupe re-triggers restart the animation cleanly
          (React mounts a fresh element). */}
      {showProgress && (
        <span
          key={`progress-${version}`}
          aria-hidden="true"
          className={[
            'toast-progress absolute bottom-0 left-0 h-0.5',
            palette.progress,
          ].join(' ')}
          style={{
            // Animation duration is set inline so each toast can vary
            // independently. The `toast-progress` class declares the
            // keyframe; this property selects how long it runs.
            animationDuration: `${duration}ms`,
          }}
        />
      )}
    </div>
  );
}
