'use client';

/**
 * Khung chung của dashboard người lao động và nhà tuyển dụng (03/10) — hai trang dùng
 * cùng các khối để thẳng hàng như nhau:
 *   - `DashboardHeader`: tiêu đề lớn + một dòng trạng thái, nút phụ bên phải (không đóng khung).
 *   - `DashboardTiles`: hàng thẻ số cao bằng nhau (ô cuối là ví), mỗi ô mở hộp chi tiết.
 *   - Bên dưới là các khối trải hết bề ngang, một cột (bỏ cột phụ lệch chiều cao; bỏ bảng
 *     thông báo — chuông trên thanh điều hướng đã có).
 *   - `DashboardSection`: tiêu đề khối + số đếm + link phải.
 *   - `DashboardEmpty`: thẻ trắng khi khối trống (cùng một kiểu ở hai trang).
 *   - `SegmentedTabs`: công tắc viên thuốc (cùng kiểu `RoleSwitch`), đủ ARIA tab + phím mũi tên.
 */

import Link from 'next/link';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export const DASH_CARD = 'rounded-3xl bg-white shadow-card ring-1 ring-black/5';

export function DashboardHeader({ title, status, actions }: { title: string; status: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base text-gray-600">{status}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Lớp thẻ của hàng ô số (dùng cả cho ô ví `WalletPanel variant="tile"`). */
export const DASH_TILE = ['min-w-0 p-5 sm:p-6', DASH_CARD].join(' ');

/**
 * Hàng thẻ số đầu trang: mỗi ô một thẻ cao bằng nhau (nhãn, số lớn, "Xem chi tiết →"),
 * `extra` là thẻ cuối (ô ví, trải 2 cột trên điện thoại). Lưới 2 cột trên điện thoại (ô số lẻ cuối trải 2 cột), đủ số cột
 * từ `lg`. Số dài tự xuống dòng thay vì tràn.
 */
export function DashboardTiles({
  label,
  items,
  extra,
  viewDetail,
}: {
  label: string;
  items: Array<{ key: string; label: string; value: string; suffix?: string; valueClass?: string; onClick?: () => void }>;
  extra?: ReactNode;
  /** Chữ "Xem chi tiết" (theo ngôn ngữ). */
  viewDetail: string;
}) {
  const total = items.length + (extra ? 1 : 0);
  const lgCols = total >= 4 ? 'lg:grid-cols-4' : total === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  return (
    <section
      aria-label={label}
      className={[
        'mb-10 grid grid-cols-2 gap-4 lg:gap-5',
        lgCols,
      ].join(' ')}
    >
      {items.map((s, i) => {
        // Điện thoại: ô số lẻ cuối trải 2 cột (không để một ô lẻ loi).
        const span = items.length % 2 === 1 && i === items.length - 1 ? 'col-span-2 lg:col-span-1' : '';
        const body = (
          <>
            <span className="text-sm font-medium text-gray-600">{s.label}</span>
            <span
              className={[
                'mt-1 text-2xl font-extrabold leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-3xl',
                s.valueClass ?? 'text-gray-900',
              ].join(' ')}
            >
              {s.value}
              {s.suffix && <span className="ml-1 text-sm font-medium text-gray-500">{s.suffix}</span>}
            </span>
            {s.onClick && (
              <span aria-hidden="true" className="mt-auto pt-3 text-sm font-semibold text-gray-500 group-hover:text-orange-700">
                {viewDetail} →
              </span>
            )}
          </>
        );
        return s.onClick ? (
          <button
            key={s.key}
            type="button"
            onClick={s.onClick}
            className={[
              'group flex flex-col items-start text-left transition-shadow hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              DASH_TILE,
              span,
            ].join(' ')}
          >
            {body}
          </button>
        ) : (
          <div key={s.key} className={['flex flex-col', DASH_TILE, span].join(' ')}>
            {body}
          </div>
        );
      })}
      {/* Ô ví: điện thoại trải 2 cột (đủ chỗ cho 3 nút trên một hàng). */}
      {extra && <div className="col-span-2 min-w-0 lg:col-span-1">{extra}</div>}
    </section>
  );
}

export function DashboardSection({
  id,
  title,
  count,
  link,
  aside,
  highlight,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  link?: { href: string; label: string };
  /** Thứ đặt bên phải tiêu đề thay cho link (vd công tắc tab). */
  aside?: ReactNode;
  /** Nháy viền khi được dẫn tới (vd `?section=applications`). */
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={['scroll-mt-24 rounded-3xl transition-shadow', highlight ? 'ring-2 ring-orange-400 ring-offset-4' : ''].join(' ')}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-gray-900">
          {title}
          {count !== undefined && count > 0 && (
            <>
              {' '}
              <span className="ml-1 text-base font-semibold text-gray-500 tabular-nums">{count}</span>
            </>
          )}
        </h2>
        {aside ??
          (link && (
            <Link href={link.href} className="text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
              {link.label} →
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}

export function DashboardEmpty({ title, body, action }: { title: string; body?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className={['px-6 py-8 text-center', DASH_CARD].join(' ')}>
      <p className="font-semibold text-gray-900">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">{body}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/** Một dòng gọn trong thẻ trắng (vd "Không có đơn nào đang chờ duyệt. Tìm ca làm →"). */
export function DashboardNote({ children }: { children: ReactNode }) {
  return <p className={['px-5 py-4 text-sm text-gray-600', DASH_CARD].join(' ')}>{children}</p>;
}

export function SegmentedTabs<K extends string>({
  idBase,
  label,
  tabs,
  value,
  onChange,
}: {
  idBase: string;
  label: string;
  tabs: ReadonlyArray<{ key: K; label: string; count?: number }>;
  value: K;
  onChange: (key: K) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-orange-100">
      {tabs.map((tab, i) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idBase}-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={[
              'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              selected ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-orange-50 hover:text-gray-900',
            ].join(' ')}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={['tabular-nums', selected ? 'text-white/70' : 'text-gray-400'].join(' ')}>
                {' '}
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Vùng nội dung của `SegmentedTabs` (gắn đúng id / aria). */
export function SegmentedPanel({ idBase, active, children }: { idBase: string; active: string; children: ReactNode }) {
  return (
    <div id={`${idBase}-panel`} role="tabpanel" aria-labelledby={`${idBase}-tab-${active}`}>
      {children}
    </div>
  );
}
