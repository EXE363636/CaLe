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
    // 03/10 — cùng kiểu với công tắc vai trò ở đầu trang /for-workers, /for-employers
    // (`RoleSwitch`): viên thuốc tròn, ô đang chọn nền mực, căn giữa.
    <nav aria-label={labels.nav} className="flex justify-center">
      <ul className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-orange-100">
        {items.map((item) => {
          const active = item.audience === current;
          return (
            <li key={item.audience}>
              <Link
                href={handbookListHref(item.audience)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
                  active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-orange-50 hover:text-gray-900',
                ].join(' ')}
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
