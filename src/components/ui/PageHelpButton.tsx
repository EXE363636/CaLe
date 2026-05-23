'use client';

/**
 * PageHelpButton — Phase 9F.
 *
 * Small "Hướng dẫn sử dụng" button that opens a Modal with concise,
 * surface-specific instructions. Used to give first-time users a quick
 * orientation without cluttering the page chrome.
 *
 * The button is keyboard-accessible (focus ring, Enter/Space activate via
 * native <button>); the Modal primitive handles ESC-to-close and click-
 * outside dismissal.
 *
 * Pure presentational — no store reads, no router. The caller passes the
 * title and an array of bullet items (already-translated strings).
 */

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { t } from '@/i18n/vi';

export interface PageHelpButtonProps {
  /** Modal title — already translated by the caller. */
  title: string;
  /** Bullet items — already translated. Each renders as a list row. */
  items: string[];
  /** Optional intro paragraph above the bullet list. */
  intro?: string;
  /** Optional className for the trigger button. */
  className?: string;
}

export function PageHelpButton({
  title,
  items,
  intro,
  className = '',
}: PageHelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={t('help.btn.aria')}
        className={[
          'inline-flex items-center gap-1.5 border border-orange-200 bg-white/80 text-orange-700 hover:bg-orange-50',
          className,
        ].join(' ')}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.9.5-1.6 1.1-1.6 2.3" />
          <path d="M12 17h.01" />
        </svg>
        {t('help.btn.label')}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          {intro && <p className="text-gray-700">{intro}</p>}
          <ul className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
