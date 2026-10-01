import Link from 'next/link';

import type { HandbookAudience } from '@/data/mock/handbookArticles';
import { handbookListHref } from '@/lib/handbook';

/**
 * Công tắc "Người lao động / Nhà tuyển dụng" của cẩm nang. Mỗi bên là một cẩm
 * nang riêng (danh mục + bài riêng), không trộn.
 */
export function HandbookAudienceSwitch({
  current,
  labels,
}: {
  current: HandbookAudience;
  labels: { nav: string; worker: string; employer: string };
}) {
  const items: { audience: HandbookAudience; label: string }[] = [
    { audience: 'worker', label: labels.worker },
    { audience: 'employer', label: labels.employer },
  ];
  return (
    <nav aria-label={labels.nav} className="mt-6 inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
      {items.map((item) => {
        const active = item.audience === current;
        return (
          <Link
            key={item.audience}
            href={handbookListHref(item.audience)}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold transition-colors ${
              active ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-700 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
