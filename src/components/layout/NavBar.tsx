'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { NotificationBell } from './NotificationBell';
import { MobileNav } from './MobileNav';
import { t } from '@/i18n/vi';
import type { Role } from '@/types';

interface NavItem {
  href: string;
  label: string;
}

function getNavItems(role: Role | null): NavItem[] {
  if (role === 'worker') {
    return [
      { href: '/shifts', label: t('nav.shifts') },
      { href: '/worker/dashboard', label: t('nav.dashboard') },
      { href: '/worker/schedule', label: t('nav.schedule') },
      { href: '/worker/profile', label: t('nav.profile') },
    ];
  }
  if (role === 'employer') {
    return [
      { href: '/employer/dashboard', label: t('nav.dashboard') },
      { href: '/employer/schedule', label: t('nav.employerSchedule') },
      { href: '/employer/shifts/new', label: t('nav.postShift') },
      { href: '/employer/profile', label: t('nav.profile') },
    ];
  }
  if (role === 'admin') {
    return [{ href: '/admin/dashboard', label: t('nav.admin') }];
  }
  // Guest
  return [
    { href: '/shifts', label: t('nav.shifts') },
    { href: '/login', label: t('nav.login') },
    { href: '/register', label: t('nav.register') },
  ];
}

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);

  const role: Role | null = currentUser?.role ?? null;
  const items = getNavItems(role);
  const isLoggedIn = currentUser !== null;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold text-orange-600 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded"
        >
          {t('site.name')}
        </Link>

        {/* Desktop nav — hidden below md */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center',
                pathname === item.href
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side: bell + logout (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-1">
          {/* Notification bell — only when logged in */}
          {isLoggedIn && <NotificationBell />}

          {/* Desktop logout */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="hidden md:flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
            >
              {t('nav.logout')}
            </button>
          )}

          {/* Mobile hamburger */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
