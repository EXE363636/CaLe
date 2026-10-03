/**
 * Phần đầu các trang hướng dẫn (03/10 — làm lại theo ngôn ngữ landing): thay khung
 * `InfoPage` hẹp. Dòng nhãn vai trò, tiêu đề lớn, một đoạn dẫn, 1–2 nút, và (tuỳ chọn)
 * một minh hoạ bên phải từ `lg` (bên dưới trên điện thoại). Nền theo `ToneScroll`
 * (khối khai báo `data-tone`), có lớp `hero-decor` như trang vai trò.
 *
 * Không có hook → dùng được trong trang server; chữ do trang dựng bằng `getTx()`.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

export function GuideHero({
  eyebrow,
  title,
  lead,
  actions = [],
  aside,
  top,
  tone = 'cream',
}: {
  /** Dòng nhãn nhỏ trên tiêu đề; bỏ trống khi trùng ý tiêu đề. */
  eyebrow?: string;
  title: string;
  lead: ReactNode;
  actions?: Array<{ href: string; label: string; primary?: boolean }>;
  /** Minh hoạ bên phải (vd thẻ tự diễn của landing). */
  aside?: ReactNode;
  /** Dòng trên cùng, căn giữa (vd công tắc vai trò như `RoleSwitch` của trang vai trò). */
  top?: ReactNode;
  tone?: string;
}) {
  return (
    <section data-tone={tone} className="hero-decor relative px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
      {top && <div className="mx-auto mb-8 max-w-6xl sm:mb-10">{top}</div>}
      <div
        className={[
          'mx-auto grid max-w-6xl items-center gap-10',
          aside ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16' : '',
        ].join(' ')}
      >
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-sm font-semibold text-orange-700">{eyebrow}</p>}
          <h1 className="max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <div className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">{lead}</div>
          {actions.length > 0 && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={
                    a.primary
                      ? 'cta-arrow-nudge inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-7 text-base font-semibold text-gray-900 shadow-md hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
                      : 'inline-flex min-h-[52px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-base font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
                  }
                >
                  {a.label}
                  {a.primary && (
                    <span className="cta-arrow" aria-hidden="true">
                      →
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  );
}
