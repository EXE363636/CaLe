import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  /** Visual tone — defaults to `subtle`. `warm` pulls from the brand palette. */
  tone?: 'subtle' | 'warm';
  className?: string;
}

const DefaultIcon = () => (
  // Calendar-with-spark glyph — feels closer to a "schedule a shift" cue
  // than a plain document icon. Inline SVG, no external library.
  <svg
    className="h-14 w-14 text-orange-300"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.4}
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m13.5 14.2-1 2.4-2.5.5 1.8 1.7-.5 2.4 2.2-1.2 2.2 1.2-.5-2.4 1.8-1.7-2.5-.5z"
    />
  </svg>
);

const toneClasses: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  subtle: 'border-gray-200 bg-gray-50',
  warm: 'border-orange-100 bg-orange-50/60',
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  tone = 'subtle',
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-2xl',
        'border border-dashed px-6 py-12 text-center',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-center">
        {icon ?? <DefaultIcon />}
      </div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {description && (
        <p className="max-w-sm text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
