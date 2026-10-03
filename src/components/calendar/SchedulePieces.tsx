'use client';

/**
 * Mảnh dùng chung của hai trang lịch (03/10 — thiết kế lại theo ngôn ngữ landing):
 *
 *   - `ScheduleSummary`: dải số tóm tắt tuần đang xem ở đầu trang (số to + nhãn nhỏ),
 *     vd người lao động "3 ca · 12 giờ · 540.000 đ", nhà tuyển dụng "5 ca · 14/16
 *     người · 2 ca thiếu người".
 *   - `EventPeek`: bấm một mục trên lịch → hộp chi tiết (giờ, nơi, trạng thái, tiền /
 *     số người) + hành động đúng lúc, thay cho việc nhảy thẳng sang trang khác.
 *   - `UpcomingList`: cột phải "Sắp tới" — vài mục gần nhất kể từ hôm nay.
 */

import type { ReactNode } from 'react';

import { Modal } from '@/components/ui';
import { formatDateVN } from '@/lib/format';

import type { CalendarEventVariant } from './CalendarEventCard';

export function ScheduleSummary({ label, items }: { label: string; items: Array<{ value: string; label: string; warn?: boolean }> }) {
  return (
    // Trải hết bề ngang trang (thẳng mép trái lịch và mép phải cột bên), mỗi ô bằng nhau.
    <dl aria-label={label} className={['mt-5 grid gap-3', items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'].join(' ')}>
      {items.map((it) => (
        <div
          key={it.label}
          className={['min-w-0 rounded-2xl px-4 py-3 shadow-card ring-1', it.warn ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-black/5'].join(' ')}
        >
          <dt className="text-xs font-medium text-gray-600">{it.label}</dt>
          <dd className={['mt-1 text-2xl font-bold tabular-nums', it.warn ? 'text-amber-800' : 'text-gray-900'].join(' ')}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EventPeek({
  open,
  onClose,
  title,
  badge,
  rows,
  note,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: ReactNode;
  rows: Array<{ label: string; value: ReactNode }>;
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {badge && <div className="-mt-1 mb-3">{badge}</div>}
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="text-gray-600">{r.label}</dt>
            <dd className="font-medium text-gray-900 tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-900">{note}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
    </Modal>
  );
}

const DOT: Record<CalendarEventVariant, string> = {
  personalBusy: 'bg-gray-400',
  availableSlot: 'bg-green-400',
  approvedShift: 'bg-orange-500',
  pendingShift: 'bg-amber-400',
  publishedShift: 'bg-blue-500',
  fullyBookedShift: 'bg-amber-500',
  awaitingShift: 'bg-amber-500',
  completedShift: 'bg-green-600',
  cancelledShift: 'bg-red-500',
  expiredShift: 'bg-gray-300',
};

export function UpcomingList({
  title,
  empty,
  items,
  onSelect,
}: {
  title: string;
  empty: ReactNode;
  items: Array<{ id: string; title: string; date: string; startTime: string; endTime: string; variant: CalendarEventVariant; label?: string }>;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <div className="mt-2 text-sm text-gray-600">{empty}</div>
      ) : (
        <ul className="mt-2 flex flex-col">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it.id)}
                className="flex min-h-[44px] w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <span aria-hidden="true" className={['mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', DOT[it.variant]].join(' ')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{it.title}</span>
                  <span className="block text-xs text-gray-600 tabular-nums">
                    {formatDateVN(it.date).slice(0, 5)} · {it.startTime}–{it.endTime}
                    {it.label ? ` · ${it.label}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
