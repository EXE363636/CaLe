'use client';

/**
 * Modal — workspace-wide dialog primitive.
 *
 * Phase 9H: portal to `document.body`.
 *   The previous in-tree mount got clipped by ancestors that established
 *   stacking contexts (transforms, fixed positions, sticky nav, hero
 *   panels, etc.). Symptom: help-guide modal looked "stuck inside the
 *   page section" — the overlay only covered the section, not the
 *   viewport. Switching to `createPortal(document.body)` lifts the
 *   modal out of every ancestor so it renders against the root.
 *
 * Phase 9G visual fix retained:
 *   - Backdrop is solid `bg-slate-900/60` with no `backdrop-blur` so it
 *     doesn't band against the body's warm gradient.
 *   - Default panel is `max-w-lg`; callers can override via `className`.
 *   - Outer wrapper is `fixed inset-0 overflow-y-auto`; inner content
 *     centers via flex so tall content scrolls naturally.
 *   - `z-[100]` keeps the modal above sticky nav (`z-40`) and any
 *     decorative floats.
 *
 * SSR-safe — `createPortal` is only called after `useEffect` has run on
 * the client; on the server (and during the first hydration pass) the
 * component renders `null`, matching the prior "open=false" behaviour.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Phase 9Y-Fix-3: optional slot rendered inline next to the title.
   * Typical use: a `<HelpPopover>` glyph that explains the metric the
   * modal is detailing. Sits inside the same flex row as the title
   * + close button so it stays vertically aligned with the title text.
   */
  titleAccessory?: ReactNode;
  children: ReactNode;
  /** Extra classes on the inner panel. */
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  titleAccessory,
  children,
  className = '',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Track whether we're mounted on the client. `createPortal` needs a
  // real DOM node — this guard makes the component SSR-safe and avoids
  // a hydration mismatch when the page server-renders.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap: move focus into panel when opened.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  // Prevent body scroll while the modal is open. Restored on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop — solid dark layer, no backdrop-blur (Phase 9G fix). */}
      <div
        className="modal-backdrop-anim fixed inset-0 bg-slate-900/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centering wrapper — flex on the scrollable container so the
          panel can overflow vertically when content is tall. */}
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          tabIndex={-1}
          className={[
            'modal-panel-anim relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl',
            'ring-1 ring-black/5 focus:outline-none',
            className,
          ].join(' ')}
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            {title && (
              <div className="inline-flex items-center gap-1.5">
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  {title}
                </h2>
                {titleAccessory}
              </div>
            )}
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );

  // Portal to body — the modal escapes any ancestor with `transform`,
  // `filter`, or `overflow` that would otherwise create a clipping
  // stacking context.
  return createPortal(overlay, document.body);
}
