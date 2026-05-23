'use client';

import type { ReactNode } from 'react';

export type CalendarEventVariant =
  | 'personalBusy'
  | 'approvedShift'
  | 'pendingShift'
  | 'publishedShift'
  | 'fullyBookedShift'
  | 'awaitingShift'
  | 'completedShift'
  | 'cancelledShift';

export interface CalendarEventCardProps {
  title: string;
  /** e.g. "08:00 - 12:00" */
  timeRange: string;
  /** Optional secondary line, e.g. "3/5 vị trí" */
  subtitle?: string;
  /** Pre-rendered chip (e.g. ShiftStatusBadge) */
  statusChip?: ReactNode;
  variant: CalendarEventVariant;
  onClick?: () => void;
  className?: string;
  /** When true, the card uses absolute-positioning-friendly styles (h-full, etc.). */
  absolute?: boolean;
}

const variantClasses: Record<CalendarEventVariant, string> = {
  personalBusy: 'bg-slate-100 border-slate-300 text-slate-800',
  approvedShift: 'bg-orange-100 border-orange-300 text-orange-900',
  pendingShift: 'bg-amber-100 border-amber-300 text-amber-900',
  publishedShift: 'bg-blue-100 border-blue-300 text-blue-900',
  fullyBookedShift: 'bg-amber-100 border-amber-300 text-amber-900',
  awaitingShift: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  completedShift: 'bg-green-100 border-green-300 text-green-900',
  cancelledShift: 'bg-red-100 border-red-300 text-red-900 line-through',
};

export function CalendarEventCard({
  title,
  timeRange,
  subtitle,
  statusChip,
  variant,
  onClick,
  className = '',
  absolute = false,
}: CalendarEventCardProps) {
  const baseClasses = [
    'flex flex-col gap-0.5 overflow-hidden rounded-lg border px-2 py-1.5 text-left',
    'min-h-[44px] shadow-sm',
    absolute ? 'h-full w-full' : 'w-full',
    variantClasses[variant],
    onClick
      ? 'cursor-pointer transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-medium text-sm">{title}</span>
        {statusChip ? (
          <span className="shrink-0 leading-none">{statusChip}</span>
        ) : null}
      </div>
      <span className="truncate text-xs opacity-75">{timeRange}</span>
      {subtitle ? (
        <span className="truncate text-xs">{subtitle}</span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {body}
      </button>
    );
  }

  return <div className={baseClasses}>{body}</div>;
}
