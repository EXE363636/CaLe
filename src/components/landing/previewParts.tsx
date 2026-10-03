/**
 * Mảnh dùng chung của hai minh hoạ nhiều bước ở trang vai trò (03/10):
 * `ShiftPostPlayground` (đăng ca) và `ApplyPreview` (nhận ca).
 */

import type { ReactNode, Ref } from 'react';

/**
 * Khung các bước của minh hoạ nhiều bước (03/10, chủ dự án: khung không được đổi cỡ
 * khi chuyển bước). Mọi bước nằm chồng trong CÙNG một ô lưới nên khung luôn cao bằng
 * bước dài nhất; bước không xem thì ẩn (`invisible` + `inert`, không đọc, không bấm).
 */
export function StageStack({ children, className = '' }: { children: ReactNode; className?: string }) {
  // `className` cho chiều cao cố định (vd "Thử đăng một ca": khung cao bằng bước 2/3, bước
  // 1 cuộn bên trong). Không truyền thì khung cao bằng bước dài nhất.
  return <div className={['grid min-h-0 min-w-0', className].join(' ')}>{children}</div>;
}

/** Một bước trong `StageStack`: cột dọc cao hết ô, nút chuyển bước dồn xuống đáy. */
export const THIN_SCROLL = '[scrollbar-width:thin] [scrollbar-color:var(--color-orange-300)_transparent]';

export function Stage({
  on,
  scroll,
  scrollRef,
  children,
}: {
  on: boolean;
  scroll?: boolean;
  /** Vùng cuộn của bước (để minh hoạ tự cuộn theo mục mới hiện). */
  scrollRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div
      ref={scrollRef}
      aria-hidden={!on}
      inert={!on}
      className={[
        'flex min-h-0 min-w-0 flex-col [grid-area:1/1]',
        // Khung cao cố định mà bước dài hơn (màn hẹp): cuộn bên trong thay vì tràn.
        scroll ? `overflow-y-auto pr-1 ${THIN_SCROLL}` : '',
        on ? 'motion-fade-up' : 'invisible',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/** Hàng nút chuyển bước ở đáy một bước; giữ chỗ cả khi chưa hiện để khung không nhảy. */
export function StageNav({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={['mt-auto flex flex-wrap justify-between gap-3 pt-4', show ? '' : 'invisible'].join(' ')}
    >
      {children}
    </div>
  );
}

export function StepButton({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
        primary ? 'bg-orange-500 text-gray-900 hover:bg-orange-400' : 'text-orange-700 hover:bg-orange-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Một mốc trên dòng thời gian: giờ bên trái, chấm + đường nối, tiêu đề + một câu. */
export function TimelineItem({
  on,
  time,
  title,
  last,
  aside,
  children,
}: {
  on: boolean;
  time: string;
  title: string;
  last?: boolean;
  /** Nhãn nhỏ bên phải tiêu đề (vd "+180.000 đ"). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li
      className={[
        'grid grid-cols-[5.25rem_1rem_minmax(0,1fr)] gap-x-2 pb-4 transition-opacity duration-300 motion-reduce:transition-none',
        on ? 'opacity-100' : 'opacity-30',
      ].join(' ')}
    >
      <span className="pt-0.5 text-right text-xs font-semibold text-gray-700 tabular-nums">{time}</span>
      <span className="relative flex justify-center">
        <span className={['mt-1 h-3 w-3 rounded-full ring-4', on ? 'bg-orange-500 ring-orange-100' : 'bg-gray-300 ring-gray-100'].join(' ')} />
        {!last && <span aria-hidden="true" className="absolute bottom-[-1rem] top-4 w-0.5 bg-gray-200" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {aside}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-gray-600">{children}</span>
      </span>
    </li>
  );
}

export function Row({
  label,
  sub,
  value,
  strong,
  tone,
  reserve,
}: {
  label: string;
  sub?: string;
  value: ReactNode;
  strong?: boolean;
  tone?: string;
  /** Giữ chỗ nhưng ẩn (dòng chỉ hiện trong một tình huống, khung không được nhảy). */
  reserve?: boolean;
}) {
  return (
    <div
      aria-hidden={reserve || undefined}
      className={['flex items-baseline justify-between gap-3 py-1', strong ? 'mt-1 border-t border-orange-200/70 pt-2' : '', reserve ? 'invisible' : ''].join(' ')}
    >
      <dt className="min-w-0">
        <span className={strong ? 'font-semibold text-gray-900' : 'text-gray-700'}>{label}</span>
        {sub && <span className="block text-xs text-gray-600 tabular-nums">{sub}</span>}
      </dt>
      <dd className={['shrink-0 text-right tabular-nums', strong ? 'text-base font-bold' : 'font-semibold', tone ?? 'text-gray-900'].join(' ')}>{value}</dd>
    </div>
  );
}
