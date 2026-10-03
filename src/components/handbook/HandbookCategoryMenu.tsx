import Link from 'next/link';

import type { HandbookAudience, HandbookCategory } from '@/data/mock/handbookArticles';
import type { Locale } from '@/i18n/locale';
import { categoryLabel, handbookListHref } from '@/lib/handbook';

/**
 * Danh mục cẩm nang của MỘT vai trò (người lao động HOẶC nhà tuyển dụng) —
 * không bao giờ hiện danh mục của vai trò kia. 03/10: hàng chip phía trên bài
 * (cuộn ngang trên điện thoại).
 */
export function HandbookCategoryMenu({
  audience,
  categories,
  currentCategory,
  locale,
  labels,
}: {
  audience: HandbookAudience;
  categories: HandbookCategory[];
  currentCategory: string;
  locale: Locale;
  labels: { heading: string; all: string; nav: string };
}) {
  const items = [
    { id: 'all', label: labels.all, href: handbookListHref(audience) },
    ...categories.map((c) => ({
      id: c.id,
      label: categoryLabel(c, locale),
      href: handbookListHref(audience, c.id),
    })),
  ];
  return (
    <nav aria-label={labels.nav}>
      <h2 className="sr-only">{labels.heading}</h2>
      <ul className="-mx-4 flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {items.map((item) => {
          const isActive = item.id === 'all' ? currentCategory === 'all' : currentCategory === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-black/10 hover:bg-orange-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
