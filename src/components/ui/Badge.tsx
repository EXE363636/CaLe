import type { ReactNode } from 'react';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/**
 * Semantic status tones — background + ink + ring triples.
 *
 * Colors are sourced from Design_Tokens through Tailwind color utilities
 * ONLY — no discrete hex literals in this component (Req 1.2, 1.4). The ring
 * is a soft hairline (family-200 @ 70%) that lets the chip read on cream /
 * white surfaces. The five semantic statuses map 1:1 to the design's
 * canonical status pairs; `purple` is an additional accent tone.
 *
 *   tone     bg / ink utility               canonical pair (DESIGN.md §1.2)
 *   info     bg-blue-100  / text-blue-800    #dbeafe / #1e40af
 *   warning  bg-amber-100 / text-amber-800   #fef3c7 / #92400e
 *   success  bg-green-100 / text-green-800   #dcfce7 / #166534
 *   danger   bg-red-100   / text-red-800     #fee2e2 / #991b1b
 *   neutral  bg-gray-100  / text-gray-700    #f3f4f6 / #374151
 *
 * Accessibility (Req 3.3, 3.4): the text label (`children`) is ALWAYS
 * rendered below, so status is never communicated by color alone.
 */
const toneClasses: Record<BadgeTone, string> = {
  info: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200/70',
  warning: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/70',
  success: 'bg-green-100 text-green-800 ring-1 ring-green-200/70',
  danger: 'bg-red-100 text-red-800 ring-1 ring-red-200/70',
  neutral: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/70',
  purple: 'bg-purple-100 text-purple-800 ring-1 ring-purple-200/70',
};

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
