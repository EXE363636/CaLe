'use client';

/**
 * PageHelpButton — Phase 9F (flat items) + Phase 9Y (sections + CTA).
 *
 * Small "Hướng dẫn sử dụng" button that opens a Modal with concise,
 * surface-specific instructions. Used to give first-time users a quick
 * orientation without cluttering the page chrome.
 *
 * Two content shapes are supported:
 *
 *   - Phase 9F (`items`): a flat array of bullet items. Lighter, used
 *     on single-purpose surfaces like `/employer/shifts/new` where the
 *     page already has obvious affordances.
 *   - Phase 9Y (`sections`): grouped sections (`heading` + bullet list).
 *     Used on dashboards where help content covers purpose / numbers /
 *     actions / common mistakes.
 *
 * When both are passed, `sections` wins; `items` is preserved for
 * backwards-compat callers that haven't migrated yet.
 *
 * Phase 9Y also adds an optional `cta` link rendered at the bottom-left
 * of the modal footer. Typical use: surfaces a `/user-guide` deep link
 * so first-time users can read the long-form walk-through.
 *
 * The button is keyboard-accessible (focus ring, Enter/Space activate
 * via native <button>); the Modal primitive handles ESC-to-close and
 * click-outside dismissal.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Button, Modal } from '@/components/ui';
import { t } from '@/i18n/vi';

export interface PageHelpSection {
  /** Section heading — already translated by the caller. */
  heading: string;
  /** Bullet items inside the section — already translated. */
  items: string[];
}

export interface PageHelpButtonProps {
  /** Modal title — already translated by the caller. */
  title: string;
  /** Optional intro paragraph above the bullet list / sections. */
  intro?: string;
  /**
   * Flat list of bullet items — original Phase 9F path. Ignored when
   * `sections` is also provided.
   */
  items?: string[];
  /**
   * Phase 9Y — richer, grouped help content. When provided, renders
   * grouped sections instead of a single bullet list.
   */
  sections?: PageHelpSection[];
  /**
   * Phase 9Y — optional CTA link rendered at the bottom-left of the
   * modal footer (e.g. "Xem hướng dẫn chi tiết → /user-guide").
   */
  cta?: { label: string; href: string };
  /** Optional className for the trigger button. */
  className?: string;
}

export function PageHelpButton({
  title,
  intro,
  items,
  sections,
  cta,
  className = '',
}: PageHelpButtonProps) {
  const [open, setOpen] = useState(false);

  // Phase 9Y — `sections` wins when both shapes are present.
  const useSections = sections !== undefined && sections.length > 0;

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
        <div className="flex flex-col gap-4 text-sm text-gray-700">
          {intro && <p className="text-gray-700">{intro}</p>}

          {useSections ? (
            <div className="flex flex-col gap-4">
              {sections!.map((section) => (
                <section key={section.heading}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-orange-700">
                    {section.heading}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                        />
                        <span className="text-[13px] leading-relaxed text-gray-700">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {(items ?? []).map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Footer — Phase 9Y: CTA on the left, close button on the
              right. When no CTA is provided we fall back to the original
              right-aligned close button. */}
          <div
            className={[
              'mt-2 flex items-center gap-2',
              cta ? 'flex-col-reverse sm:flex-row sm:justify-between' : 'justify-end',
            ].join(' ')}
          >
            {cta && (
              <Link
                href={cta.href}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1 rounded-lg border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:w-auto"
              >
                {cta.label} →
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOpen(false)}
              className={cta ? 'w-full sm:w-auto' : ''}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
