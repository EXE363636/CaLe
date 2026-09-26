'use client';

/**
 * HelpPopover — Phase 9Y-Fix.
 *
 * Replaces the Phase 9Y `<HelpHint>` (hover-only `<span>` tooltip) with
 * a click/tap accessible help button + small `<Modal>`-based popover.
 *
 * Why this replacement was needed:
 *
 *   1. The original `<HelpHint>` rendered an absolutely-positioned
 *      tooltip layer. When the surrounding card carried `overflow-hidden`
 *      (StatTile cards do), the tooltip was clipped. Phase 9Y already
 *      patched StatTile, but mobile users still had no way to reveal the
 *      tooltip — hover doesn't exist on touch devices.
 *   2. Tapping the `(?)` glyph on mobile did nothing (the trigger was a
 *      non-focusable `<span>`).
 *   3. The tooltip's white-on-gray rendering looked like a native browser
 *      `title=` tooltip rather than a CaLẻ-styled surface.
 *
 * Design choices:
 *
 *   - **Click/tap as primary interaction.** Works on every device; ESC
 *     + outside click + explicit close button all dismiss.
 *   - **Portaled via `<Modal>`.** The Modal primitive already portals to
 *     `document.body`, so the popover escapes any clipping ancestor.
 *     We reuse it instead of writing a second portal so behaviour stays
 *     consistent with the rest of the app's overlays.
 *   - **Real `<button>` trigger.** Keyboard users tab to it and press
 *     Enter/Space; screen readers announce "Giải thích: …". The
 *     trigger MUST NOT be nested inside another `<button>` — call sites
 *     are responsible for placing it outside any clickable ancestor
 *     (e.g. StatTile refactored to a `<div>` with a transparent overlay
 *     anchor).
 *   - **Stop click propagation** so the trigger never accidentally
 *     fires the parent card's click handler.
 *   - **Small payload.** A short concept blurb + optional "Xem hướng
 *     dẫn chi tiết" CTA to `/user-guide` matching the rest of the app.
 *
 * Limitations:
 *
 *   - Body scroll locks while the popover is open (inherited from
 *     `<Modal>`). For a single-paragraph help blurb this is acceptable.
 *   - No anchored positioning; the popover centers via the existing
 *     Modal layout. This is intentional — anchored popovers were the
 *     source of the original clipping bug.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Modal } from './Modal';
import { Button } from './Button';
import { t } from '@/i18n/vi';

export interface HelpPopoverProps {
  /** Modal title — "Điểm uy tín", "Đơn chờ duyệt", etc. */
  title: string;
  /** Short concept blurb (1–3 sentences). Plain text. */
  description: string;
  /**
   * Optional deep link rendered as a "Xem hướng dẫn chi tiết →" CTA.
   * Defaults to `/user-guide` so the user can always read the long-form
   * walk-through.
   */
  learnMoreHref?: string;
  /**
   * Optional aria-label override for the trigger. Defaults to
   * "Giải thích: {title}".
   */
  ariaLabel?: string;
  /** Extra classes appended to the trigger `<button>`. */
  className?: string;
}

export function HelpPopover({
  title,
  description,
  learnMoreHref = '/user-guide',
  ariaLabel,
  className = '',
}: HelpPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        // The popover trigger lives inline next to a stat label. Stop
        // propagation so its click never bubbles to a surrounding click
        // handler (e.g. a StatTile overlay anchor). `mousedown` is also
        // stopped because some focus-trap libraries listen on it.
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={ariaLabel ?? `Giải thích: ${title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          // Compact circular `(?)` button — sits inline with label text.
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-orange-300 bg-white text-xs font-bold text-orange-700',
          'cursor-pointer transition-colors hover:bg-orange-50 hover:border-orange-400',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1',
          // Vertical alignment with the surrounding label baseline.
          'align-middle',
          className,
        ].join(' ')}
      >
        ?
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        // Smaller than the default `max-w-lg` so the popover reads as a
        // help mini-modal, not a full dialog.
        className="max-w-md"
      >
        <div className="flex flex-col gap-4 text-sm text-gray-700">
          <p className="leading-relaxed">{description}</p>

          {/* Footer — "Xem hướng dẫn" link on the left, "Đã hiểu" on
              the right. Stacks on small screens. */}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {learnMoreHref && (
              <Link
                href={learnMoreHref}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1 rounded-lg border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:w-auto"
              >
                {t('help.viewFullGuide')} →
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOpen(false)}
              className={learnMoreHref ? 'w-full sm:w-auto' : 'w-full sm:ml-auto sm:w-auto'}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
