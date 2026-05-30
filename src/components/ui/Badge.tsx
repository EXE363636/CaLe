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

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-green-100 text-green-800 ring-1 ring-green-200/70',
  warning: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/70',
  danger: 'bg-red-100 text-red-800 ring-1 ring-red-200/70',
  info: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200/70',
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
