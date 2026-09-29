import Link from 'next/link';
import { t } from '@/i18n/vi';

/**
 * P1 feedback F4 — công tắc "Tôi cần việc / Tôi cần tuyển" ở đầu 2 trang
 * marketing theo vai trò (`/viec-lam`, `/tuyen-dung`). Là 2 liên kết thật
 * (không phải tab JS) để mỗi vai trò có URL riêng, chia sẻ được.
 */
export function RoleSwitch({ active }: { active: 'worker' | 'employer' }) {
  const items = [
    { key: 'worker', href: '/viec-lam', label: t('home.role.worker') },
    { key: 'employer', href: '/tuyen-dung', label: t('home.role.employer') },
  ] as const;
  return (
    <nav aria-label={t('home.role.switchAria')} className="flex justify-center">
      <ul className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-orange-100">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-gray-900',
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
