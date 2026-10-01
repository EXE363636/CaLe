import Link from 'next/link';

import type { HandbookAudience, HandbookCategory } from '@/data/mock/handbookArticles';
import type { Locale } from '@/i18n/locale';
import { categoryLabel, handbookListHref } from '@/lib/handbook';

/**
 * Danh mục cẩm nang của MỘT vai trò (người lao động HOẶC nhà tuyển dụng) —
 * không bao giờ hiện danh mục của vai trò kia.
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
    <nav aria-label={labels.nav} className="flex flex-col gap-2">
      <h2 className="mb-2 px-3 text-sm font-bold uppercase tracking-wider text-gray-500 lg:px-0">
        {labels.heading}
      </h2>
      <ul className="hide-scrollbar flex gap-2 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const isActive = item.id === 'all' ? currentCategory === 'all' : currentCategory === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
