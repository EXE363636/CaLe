'use client';

import type { ReactNode } from 'react';

export type CalendarEventVariant =
  | 'personalBusy'
  | 'availableSlot'
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
  /**
   * Nhãn trạng thái dạng chữ cho thẻ trên lưới lịch (absolute). Khi có,
   * thẻ lưới hiện dòng chữ này thay cho `statusChip` — gọn đủ để ca 1 giờ
   * vẫn đọc được trạng thái, không chỉ dựa vào màu thẻ.
   */
  statusLabel?: string;
  variant: CalendarEventVariant;
  onClick?: () => void;
  className?: string;
  /** When true, the card uses absolute-positioning-friendly styles (h-full, etc.). */
  absolute?: boolean;
}

const variantClasses: Record<CalendarEventVariant, string> = {
  personalBusy: 'bg-slate-100 border-slate-300 text-slate-800',
  // P3 palette: success/positive family unified on `green-*` (was
  // `emerald-*`). `availableSlot` keeps its dashed border + lighter
  // `green-50` fill as the differentiator from the solid `completedShift`.
  availableSlot: 'bg-green-50 border-green-300 text-green-800 border-dashed',
  // P3 palette: reduce the orange fill (`orange-100` -> `orange-50`) so an
  // approved-shift block doesn't compete with the orange primary CTAs;
  // still semantically orange (border + `text-orange-900` retained).
  approvedShift: 'bg-orange-50 border-orange-300 text-orange-900',
  pendingShift: 'bg-amber-100 border-amber-300 text-amber-900',
  publishedShift: 'bg-blue-100 border-blue-300 text-blue-900',
  fullyBookedShift: 'bg-amber-100 border-amber-300 text-amber-900',
  // P3 palette: caution/waiting family unified on `amber-*` (was
  // `yellow-*`). State->variant mapping + label unchanged.
  awaitingShift: 'bg-amber-100 border-amber-300 text-amber-900',
  completedShift: 'bg-green-100 border-green-300 text-green-900',
  cancelledShift: 'bg-red-100 border-red-300 text-red-900 line-through',
};

/**
 * Mỗi giờ trên lưới cao tối thiểu 60px: đủ cho 3 dòng của thẻ ca 1 giờ
 * (tên ca 20px + giờ 16px + trạng thái 16px + đệm 8px), để thẻ nằm gọn
 * trong khung giờ của nó và trạng thái không chỉ dựa vào màu.
 */
const PX_PER_HOUR_MIN = 60;

/**
 * Chiều cao (px) của một hàng khung giờ trên lưới lịch tuần/ngày.
 * Khung 120 phút → 120px; 60 phút → 60px; 30 phút → 60px.
 */
export function calendarSlotRowHeight(slotMinutes: number): number {
  if (!(slotMinutes > 0)) return 60;
  return Math.max(60, Math.round(slotMinutes * (PX_PER_HOUR_MIN / 60)));
}

export function CalendarEventCard({
  title,
  timeRange,
  subtitle,
  statusChip,
  statusLabel,
  variant,
  onClick,
  className = '',
  absolute = false,
}: CalendarEventCardProps) {
  const baseClasses = [
    'flex flex-col overflow-hidden rounded-lg border text-left',
    // Lưới lịch: cột có thể chỉ ~90px → lề ngang gọn để giờ ca không bị cắt.
    absolute ? 'px-1.5 py-1' : 'gap-0.5 px-2 py-1.5',
    'min-h-[44px] shadow-sm',
    absolute ? 'h-full w-full' : 'w-full',
    variantClasses[variant],
    onClick
      ? 'cursor-pointer transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Thẻ thấp bị cắt chữ → di chuột vẫn đọc được đủ tên + giờ.
  const tooltip = absolute
    ? [title, timeRange, statusLabel, subtitle].filter(Boolean).join(' · ')
    : undefined;

  // Trên lưới lịch (absolute) cột rất hẹp (~100px): xếp dọc theo thứ tự ưu
  // tiên tên ca → giờ → nhãn trạng thái → phụ đề, để phần bị cắt khi thẻ
  // thấp là phần ít quan trọng nhất. Nhãn trạng thái KHÔNG chung hàng với
  // tên ca (nhãn không co lại được, sẽ đẩy tên ca về 0px).
  const body = absolute ? (
    <>
      <span className="shrink-0 truncate text-sm font-medium leading-5">{title}</span>
      <span className="shrink-0 truncate text-xs leading-4 tabular-nums opacity-75">{timeRange}</span>
      {statusLabel ? (
        <span className="shrink-0 truncate text-xs font-semibold leading-4">{statusLabel}</span>
      ) : statusChip ? (
        <span className="flex max-w-full shrink-0 pt-0.5 leading-none">{statusChip}</span>
      ) : null}
      {subtitle ? (
        <span className="truncate text-xs leading-4">{subtitle}</span>
      ) : null}
    </>
  ) : (
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
      <button type="button" onClick={onClick} className={baseClasses} title={tooltip}>
        {body}
      </button>
    );
  }

  return (
    <div className={baseClasses} title={tooltip}>
      {body}
    </div>
  );
}
