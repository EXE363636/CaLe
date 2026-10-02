/**
 * Các khối nội dung của trang vai trò (`/for-workers`, `/for-employers`).
 *
 * `LandingMoneyFlow` có thể cho tiêu đề "đánh máy" khi cuộn tới (`typedTitle`) và
 * thay các chặng bằng một sơ đồ (`diagram`).
 *
 * `tone` (03/10): trang bọc trong `ToneScroll` → khối để nền trong suốt và khai báo
 * `data-tone` (nền cả trang đổi màu theo khối đang xem, như trang chủ). Không có
 * `tone` → nền riêng như cũ.
 *
 * Chỉ trình bày — câu chữ do trang (server) dựng bằng `getTx()` rồi truyền vào,
 * để test i18n quét được câu `tx('…')` ngay trong file trang. Không có hook nên
 * dùng được cả ở server component.
 *
 * Mọi điều ghi ở đây phải là tính năng đang chạy ở CẢ chế độ demo lẫn
 * production (xem `data/capabilities.ts`); câu về tiền đổi theo chế độ ở trang.
 */

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { MotionGroup } from './MotionGroup';
import { TypeOnView } from './TypeOnView';

/** Nền của khối: theo `ToneScroll` khi có `tone`, không thì nền riêng `fallback`. */
function sectionBg(tone: string | undefined, fallback: string) {
  return tone ? '' : fallback;
}

// ---------------------------------------------------------------------------
// Icon — nét vẽ thống nhất 1.75, 24×24
// ---------------------------------------------------------------------------

export type LandingIcon =
  | 'profile'
  | 'status'
  | 'attendance'
  | 'calendar'
  | 'repeat'
  | 'wallet'
  | 'money'
  | 'phone'
  | 'star'
  | 'clock'
  | 'gift'
  | 'shield'
  | 'help';

const ICON_PATHS: Record<LandingIcon, ReactNode> = {
  profile: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75S13.9 16 14.5 19" />
      <path d="m15.5 10.5 1.75 1.75L21 8.5" />
    </>
  ),
  status: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 12h3M14 12h3" />
    </>
  ),
  attendance: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <path d="m9.5 10.5 1.75 1.75L14.75 8.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3" />
      <path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4" />
      <rect x="4" y="9" width="16.5" height="10" rx="2.5" />
      <path d="M16 14h1.5" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.75" width="10" height="18.5" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9L12 3.5Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.75 9.5a2.4 2.4 0 0 1 4.6.9c0 1.6-2.35 2.1-2.35 3.6M12 16.75v.01" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M4 13h16M12 9v11M12 9c-1.5-3-5-3.5-5-1.25C7 9 9 9 12 9Zm0 0c1.5-3 5-3.5 5-1.25C17 9 15 9 12 9Z" />
    </>
  ),
};

export function LandingIconGlyph({ name, className = 'h-6 w-6' }: { name: LandingIcon; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dòng cam kết ngắn dưới nút ở hero
// ---------------------------------------------------------------------------

export function LandingChecks({ items }: { items: string[] }) {
  return (
    <ul className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-700 lg:mx-0 lg:justify-start">
      {items.map((it) => (
        <li key={it} className="inline-flex items-center gap-1.5">
          <svg className="h-4 w-4 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 10.5 3.2 3L15 6.5" />
          </svg>
          {it}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Cách hoạt động — các bước nối nhau (thứ tự là thông tin, nên đánh số)
// ---------------------------------------------------------------------------

export function LandingSteps({
  id,
  title,
  lead,
  steps,
  tone,
}: {
  id: string;
  title: string;
  lead?: string;
  steps: Array<{ title: string; body: string }>;
  tone?: string;
}) {
  return (
    <section aria-labelledby={id} data-tone={tone} className={[sectionBg(tone, 'bg-white'), 'px-4 py-14 sm:px-6 sm:py-20 lg:px-8'].join(' ')}>
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h2>
          {lead && <p className="mt-3 text-base leading-relaxed text-gray-600">{lead}</p>}
        </div>
        {/* Khi cuộn tới: số bước sáng lần lượt, đường nối tự vẽ sang bước sau. */}
        <MotionGroup>
          <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 md:flex-col md:gap-5" style={{ '--i': i } as CSSProperties}>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="m-rail absolute left-5 top-12 h-[calc(100%-1rem)] w-0.5 bg-orange-300 md:left-12 md:top-5 md:h-0.5 md:w-[calc(100%-1.5rem)]"
                  />
                )}
                <span className="m-node relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-base font-bold text-white tabular-nums">
                  {i + 1}
                </span>
                <div className="m-text min-w-0">
                  <h3 className="text-lg font-semibold leading-snug text-gray-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </MotionGroup>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tính năng — tiêu đề bên trái, danh sách có đường kẻ bên phải (không lưới thẻ)
// ---------------------------------------------------------------------------

export function LandingFeatures({
  id,
  title,
  lead,
  items,
  tone,
}: {
  id: string;
  title: string;
  lead?: string;
  items: Array<{ icon: LandingIcon; title: string; body: string }>;
  tone?: string;
}) {
  return (
    <section aria-labelledby={id} data-tone={tone} className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h2>
          {lead && <p className="mt-3 text-base leading-relaxed text-gray-600">{lead}</p>}
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.title} className="flex gap-4 border-t border-orange-200/70 py-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700 shadow-card ring-1 ring-orange-100">
                <LandingIconGlyph name={it.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{it.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dòng tiền — các chặng với số tiền lớn, kèm ghi chú quy định
// ---------------------------------------------------------------------------

export function LandingMoneyFlow({
  id,
  title,
  lead,
  stages,
  rulesTitle,
  rules,
  footnote,
  typedTitle = false,
  diagram,
  tone,
}: {
  id: string;
  title: string;
  lead?: string;
  stages?: Array<{ label: string; amount: string; body: string }>;
  /** Sơ đồ thay cho các chặng (vd `PayoutTimeline`). */
  diagram?: ReactNode;
  tone?: string;
  rulesTitle?: string;
  rules?: string[];
  footnote?: string;
  /** Tiêu đề "đánh máy" khi cuộn tới (`TypeOnView`) — dùng cho khối lời hứa chính của trang. */
  typedTitle?: boolean;
}) {
  return (
    <section aria-labelledby={id} data-tone={tone} className={[sectionBg(tone, 'bg-white'), 'px-4 py-14 sm:px-6 sm:py-20 lg:px-8'].join(' ')}>
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {typedTitle ? <TypeOnView text={title} /> : title}
          </h2>
          {lead && <p className="mt-3 text-base leading-relaxed text-gray-600">{lead}</p>}
        </div>
        {diagram}
        {/* Khi cuộn tới: các chặng hiện theo dòng tiền, số tiền được quét ra. */}
        {stages && stages.length > 0 && (
          <MotionGroup>
            <ol
              className={[
                'mt-10 grid overflow-hidden rounded-3xl bg-orange-50 ring-1 ring-orange-100',
                stages.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3',
              ].join(' ')}
            >
              {stages.map((s, i) => (
                <li
                  key={s.label}
                  style={{ '--i': i } as CSSProperties}
                  className={[
                    'm-stage relative p-6 sm:p-8',
                    i > 0 ? 'border-t border-orange-200/70 md:border-l md:border-t-0' : '',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-orange-800">{s.label}</p>
                  <p className="m-amount mt-2 text-3xl font-bold leading-tight tracking-tight text-gray-900 tabular-nums sm:text-4xl">
                    {s.amount}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{s.body}</p>
                </li>
              ))}
            </ol>
          </MotionGroup>
        )}
        {rules && rules.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {rulesTitle && <h3 className="text-base font-semibold text-gray-900">{rulesTitle}</h3>}
            <ul className="flex flex-col gap-3 text-sm leading-relaxed text-gray-700">
              {rules.map((r) => (
                <li key={r} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {footnote && <p className="mt-6 text-xs leading-relaxed text-gray-600">{footnote}</p>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Câu hỏi thường gặp — <details> mở/đóng được bằng bàn phím, không cần JS
// ---------------------------------------------------------------------------

export function LandingFaq({
  id,
  title,
  items,
  more,
  white = false,
  wide = false,
  tone,
}: {
  id: string;
  title: string;
  items: Array<{ q: string; a: string }>;
  more?: { href: string; label: string };
  /** Nền trắng thay cho nền kem của trang (để các khối xen kẽ). */
  white?: boolean;
  /** Theo mép trái chung max-w-6xl: tiêu đề bên trái, danh sách bên phải (trang chủ). */
  wide?: boolean;
  tone?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      data-tone={tone}
      className={['px-4 py-14 sm:px-6 sm:py-20 lg:px-8', white && !tone ? 'bg-white' : ''].join(' ')}
    >
      <div
        className={
          wide
            ? 'mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16'
            : 'mx-auto max-w-3xl'
        }
      >
        <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {title}
        </h2>
        <div>
          <div
            className={[
              'mt-8 divide-y divide-orange-200/70 rounded-2xl bg-white shadow-card ring-1 ring-gray-200',
              wide ? 'lg:mt-0' : '',
            ].join(' ')}
          >
            {items.map((it) => (
              <details key={it.q} className="group px-5 sm:px-6">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 [&::-webkit-details-marker]:hidden">
                  {it.q}
                  <svg
                    className="h-5 w-5 shrink-0 text-orange-700 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-gray-600">{it.a}</p>
              </details>
            ))}
          </div>
          {more && (
            <Link
              href={more.href}
              className="mt-6 inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {more.label} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// An toàn & hỗ trợ — hai lối tắt tới /safety và /support (03/10)
// ---------------------------------------------------------------------------

export function LandingHelp({
  id,
  title,
  items,
  tone,
}: {
  id: string;
  title: string;
  items: Array<{ href: string; icon: LandingIcon; title: string; body: string }>;
  tone?: string;
}) {
  return (
    <section aria-labelledby={id} data-tone={tone} className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 id={id} className="sr-only">
          {title}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className="group flex h-full gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 transition-shadow hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                  <LandingIconGlyph name={it.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-gray-900">
                    {it.title}{' '}
                    <span aria-hidden="true" className="inline-block text-orange-700 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                      →
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-gray-600">{it.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
