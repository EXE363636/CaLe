/**
 * Thân các trang pháp lý (`/terms`, `/privacy`, `/disputes`) — 03/10, làm lại theo
 * ngôn ngữ landing (cùng cột đọc của bài cẩm nang).
 *
 *   - Từ `lg`: hai cột — mục lục dính bên trái (link `#id` tới từng `h2`), bài bên
 *     phải trong cột ~70 ký tự, chữ căn trái.
 *   - Điện thoại: mục lục gập trong `<details>` ở đầu bài.
 *   - Mỗi mục có `id` + `scroll-mt-24` (chừa thanh điều hướng dính).
 *
 * Chỉ trình bày, không hook → dùng trong trang server. Câu chữ do trang dựng bằng
 * `getTx()` rồi truyền vào (test i18n quét `tx('…')` trong file trang). Không tự
 * thêm chữ hiển thị nào ở đây.
 */

import type { ReactNode } from 'react';

export interface LegalSection {
  /** Neo cho mục lục (`#id`), chỉ chữ thường / số / gạch nối. */
  id: string;
  title: string;
  body: ReactNode;
}

export function LegalArticle({
  tocLabel,
  sections,
  tone = 'paper',
}: {
  /** Nhãn mục lục, vd "Mục lục". */
  tocLabel: string;
  sections: LegalSection[];
  tone?: string;
}) {
  const toc = (
    <ol className="flex flex-col gap-1">
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm leading-snug text-gray-700 hover:bg-orange-50 hover:text-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <section data-tone={tone} className="px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        {/* Mục lục — điện thoại: gập lại ở đầu bài. */}
        <details className="group rounded-2xl bg-white shadow-card ring-1 ring-black/5 lg:hidden">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-5 text-base font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 [&::-webkit-details-marker]:hidden">
            {tocLabel}
            <svg
              className="h-5 w-5 shrink-0 text-orange-700 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </summary>
          <nav aria-label={tocLabel} className="border-t border-orange-100 px-2 py-2">
            {toc}
          </nav>
        </details>

        {/* Mục lục — từ lg: cột trái, dính khi cuộn. */}
        <nav aria-label={tocLabel} className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <p className="mb-2 px-3 text-sm font-semibold text-orange-700">{tocLabel}</p>
          <div className="border-l-2 border-orange-200">{toc}</div>
        </nav>

        <article className="min-w-0 max-w-[70ch] text-base leading-relaxed text-gray-700 sm:text-[1.0625rem]">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="mb-12 scroll-mt-24 last:mb-0">
              <h2 id={`${s.id}-h`} className="mb-4 text-balance text-2xl font-bold tracking-tight text-gray-900">
                {s.title}
              </h2>
              <div>{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}

/** Danh sách gạch đầu dòng trong một mục pháp lý (chấm cam, căn trái). */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-[0.625em] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
          <span className="min-w-0">{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Link email trong bài pháp lý. */
export function LegalMail({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className="break-all font-medium text-orange-700 underline-offset-2 hover:underline">
      {address}
    </a>
  );
}
