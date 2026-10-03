/**
 * Khung chung của ba trang pháp lý (`/terms`, `/privacy`, `/disputes`) — 03/10, làm lại
 * lần 2 (chủ dự án duyệt kế hoạch, bỏ ô tóm tắt). Câu chữ pháp lý do trang truyền vào và
 * GIỮ NGUYÊN văn; các khối ở đây chỉ đổi cách trình bày.
 *
 *   - `LegalHero`: thanh chuyển giữa 3 tài liệu (viên thuốc, trang đang xem nền mực), nhãn
 *     "Pháp lý", tiêu đề, đoạn dẫn, dòng thông tin (áp dụng cho bản nào · số mục).
 *   - `LegalArticle`: từ `lg` hai cột — mục lục dính bên trái sáng mục đang đọc
 *     (`LegalTocNav`), bài bên phải ~70 ký tự; mỗi mục có số lớn màu cam ở lề trái. Điện
 *     thoại: mục lục gập trong `<details>`, số mục nằm trên tiêu đề (không chiếm lề). Vạch tiến độ đọc trên cùng (`LegalProgress`).
 *     Tiêu đề mục bỏ số "1. " ở đầu (số đã ở lề).
 *   - `LegalEnd`: thẻ "Còn thắc mắc?" (email + hotline + trang hỗ trợ) và hai thẻ "Đọc tiếp".
 *   - Khối trình bày trong mục: `LegalList`, `LegalCards` (thẻ icon / ✕ / ✓), `LegalSteps`
 *     (dòng thời gian), `LegalDefs` (tách "Nhãn: nội dung"), `LegalSentences` (ngắt một
 *     đoạn dài thành từng câu), `LegalCallout` (số lớn + đoạn), `LegalMail`.
 *
 * Không hook ở đây (phần chạy theo cuộn nằm trong `legal/LegalScrollUI.tsx`) → dùng được
 * trong trang server. Mọi chữ hiển thị do trang dựng bằng `getTx()` rồi truyền vào (test
 * i18n quét `tx('…')` trong file trang).
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { LegalProgress, LegalTocNav, type LegalTocItem } from '@/components/legal/LegalScrollUI';
import { LandingIconGlyph, type LandingIcon } from '@/components/landing/LandingSections';

export type LegalDoc = 'terms' | 'privacy' | 'disputes';

export interface LegalSection {
  /** Neo cho mục lục (`#id`), chỉ chữ thường / số / gạch nối. */
  id: string;
  title: string;
  body: ReactNode;
}

/** "1. Phạm vi dịch vụ" → "Phạm vi dịch vụ" (số đã hiện ở lề / mục lục). */
const plainTitle = (t: string) => t.replace(/^\s*\d+\.\s*/, '');

// ---------------------------------------------------------------------------
// Phần đầu
// ---------------------------------------------------------------------------

export function LegalHero({
  current,
  docs,
  switcherLabel,
  eyebrow,
  title,
  lead,
  meta,
  actions = [],
}: {
  current: LegalDoc;
  /** Ba tài liệu theo thứ tự hiển thị trên thanh chuyển. */
  docs: Array<{ doc: LegalDoc; href: string; label: string }>;
  switcherLabel: string;
  eyebrow: string;
  title: string;
  lead: ReactNode;
  /** Dòng thông tin nhỏ dưới đoạn dẫn (vd "Áp dụng cho: bản dùng thử", "6 mục"). */
  meta: string[];
  actions?: Array<{ href: string; label: string }>;
}) {
  return (
    <section data-tone="cream" className="hero-decor relative px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav aria-label={switcherLabel} className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="inline-flex gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-black/5">
            {docs.map((d) => {
              const on = d.doc === current;
              return (
                <li key={d.doc}>
                  <Link
                    href={d.href}
                    aria-current={on ? 'page' : undefined}
                    className={[
                      'inline-flex min-h-[40px] items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none',
                      on ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-orange-50 hover:text-gray-900',
                    ].join(' ')}
                  >
                    {d.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="mt-10 text-sm font-semibold text-orange-700">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <div className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">{lead}</div>
        <ul className="mt-6 flex flex-wrap gap-2 text-sm text-gray-700">
          {meta.map((m) => (
            <li key={m} className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-black/10">
              {m}
            </li>
          ))}
        </ul>
        {actions.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-base font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Thân bài
// ---------------------------------------------------------------------------

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
  const items: LegalTocItem[] = sections.map((s, i) => ({ id: s.id, n: i + 1, title: plainTitle(s.title) }));

  return (
    <section data-tone={tone} className="px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8">
      <LegalProgress targetId="legal-article" />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
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
            <ol className="flex flex-col gap-1">
              {items.map((it) => (
                <li key={it.id}>
                  <a
                    href={`#${it.id}`}
                    className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm leading-snug text-gray-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <span className="w-5 shrink-0 text-xs text-gray-500 tabular-nums">{String(it.n).padStart(2, '0')}</span>
                    {it.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </details>

        {/* Mục lục — từ lg: cột trái, dính khi cuộn, sáng mục đang đọc. */}
        <LegalTocNav label={tocLabel} items={items} />

        <article id="legal-article" className="min-w-0 text-base leading-relaxed text-gray-700 sm:text-[1.0625rem]">
          {sections.map((s, i) => (
            // Neo là cả mục (có `py-10`): lề cuộn 4.5rem để TIÊU ĐỀ (không phải đường kẻ)
            // dừng ngay dưới header dính (~97px); mục đầu không có đệm trên → 7rem như
            // `.public-skin [id]` (03/10, e2e 44). `!` thắng quy tắc chung của `.public-skin`.
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-h`}
              className="scroll-mt-[4.5rem]! border-t border-black/5 py-10 first:scroll-mt-28! first:border-t-0 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-4"
            >
              <span aria-hidden="true" className="mb-2 block text-xl font-extrabold leading-none text-orange-500 tabular-nums sm:mb-0 sm:pt-0.5 sm:text-3xl">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 max-w-[68ch]">
                <h2 id={`${s.id}-h`} className="mb-4 text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  {plainTitle(s.title)}
                </h2>
                <div>{s.body}</div>
              </div>
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cuối trang
// ---------------------------------------------------------------------------

export function LegalEnd({
  title,
  body,
  email,
  hotline,
  supportLabel,
  nextLabel,
  next,
}: {
  title: string;
  body: string;
  email: string;
  hotline: string;
  supportLabel: string;
  nextLabel: string;
  next: Array<{ href: string; title: string; body: string }>;
}) {
  return (
    <section aria-labelledby="legal-end" data-tone="cream" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-3xl bg-gray-900 p-6 text-white sm:p-8">
          <h2 id="legal-end" className="text-xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{body}</p>
          <dl className="mt-5 flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-white/70">Email</dt>
              <dd>
                <a href={`mailto:${email}`} className="break-all font-semibold text-orange-300 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  {email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/70">Hotline</dt>
              <dd>
                <a href={`tel:${hotline}`} className="font-semibold tabular-nums text-white underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  {hotline}
                </a>
              </dd>
            </div>
          </dl>
          <Link
            href="/support"
            className="mt-5 inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-semibold text-orange-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {supportLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
        {next.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="group flex flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5 transition-shadow hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none sm:p-8"
          >
            <span className="text-sm font-semibold text-orange-700">{nextLabel}</span>
            <span className="mt-2 text-lg font-bold text-gray-900">{n.title}</span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{n.body}</span>
            <span aria-hidden="true" className="mt-4 text-lg text-orange-700 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Khối trình bày trong một mục
// ---------------------------------------------------------------------------

/** Danh sách gạch đầu dòng (chấm cam, căn trái). */
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

const CARD_TONE = {
  neutral: 'bg-orange-50 text-orange-700 ring-orange-100',
  bad: 'bg-red-50 text-red-700 ring-red-100',
  good: 'bg-green-50 text-green-700 ring-green-100',
} as const;

/**
 * Lưới thẻ trắng, mỗi thẻ một ô biểu tượng + câu (giữ nguyên văn). `mark` = dấu ✕ (điều
 * cấm) / ✓ (quyền); `icon` = biểu tượng landing.
 */
export function LegalCards({
  items,
  tone = 'neutral',
  mark,
}: {
  items: Array<{ text: ReactNode; icon?: LandingIcon }>;
  tone?: keyof typeof CARD_TONE;
  mark?: 'x' | 'check';
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 rounded-2xl bg-white p-4 text-base leading-relaxed shadow-card ring-1 ring-black/5 sm:p-5">
          <span aria-hidden="true" className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1', CARD_TONE[tone]].join(' ')}>
            {it.icon ? (
              <LandingIconGlyph name={it.icon} className="h-5 w-5" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                {mark === 'x' ? <path d="m6 6 8 8M14 6l-8 8" /> : <path d="m5 10.5 3.2 3L15 6.5" />}
              </svg>
            )}
          </span>
          <span className="min-w-0 text-gray-800">{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Dòng thời gian dọc: số trong vòng tròn nối bằng vạch cam. */
export function LegalSteps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {i < items.length - 1 && <span aria-hidden="true" className="absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 bg-orange-200" />}
          <span aria-hidden="true" className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white tabular-nums">
            {i + 1}
          </span>
          <span className="min-w-0 pt-1 text-gray-800">{it}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Danh sách "Nhãn: nội dung" thành bảng hai cột (tách ở dấu ":" đầu tiên; câu không có
 * ":" giữ nguyên một dòng). Chữ giữ nguyên văn.
 */
export function LegalDefs({ items }: { items: string[] }) {
  return (
    <dl className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
      {items.map((it, i) => {
        const at = it.indexOf(':');
        const label = at > 0 ? it.slice(0, at) : '';
        const rest = at > 0 ? it.slice(at + 1).trim() : it;
        return (
          <div key={i} className="grid gap-1 border-t border-black/5 px-5 py-4 first:border-t-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
            <dt className="font-semibold text-gray-900">{label}</dt>
            <dd className="text-gray-700">{rest}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Ngắt một đoạn dài thành từng câu (gạch đầu dòng), giữ nguyên văn từng câu. */
export function LegalSentences({ text }: { text: string }) {
  const parts = text.split(/(?<=\.)\s+(?=\p{Lu})/u).filter(Boolean);
  return <LegalList items={parts} />;
}

/** Ô nổi bật: số lớn bên trái (trang trí, `aria-hidden`) + đoạn nguyên văn bên phải. */
export function LegalCallout({ big, unit, children }: { big: string; unit: string; children: ReactNode }) {
  return (
    <div className="flex gap-5 rounded-2xl bg-orange-50 p-5 ring-1 ring-orange-100 sm:p-6">
      <span aria-hidden="true" className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-white px-4 py-3 text-center shadow-card ring-1 ring-black/5">
        <span className="text-3xl font-extrabold leading-none text-gray-900 tabular-nums">{big}</span>
        <span className="mt-1 text-xs font-semibold text-orange-700">{unit}</span>
      </span>
      <div className="min-w-0 self-center text-gray-800">{children}</div>
    </div>
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
