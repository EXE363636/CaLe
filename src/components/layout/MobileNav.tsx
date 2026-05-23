'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
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
  return [
    { href: '/shifts', label: t('nav.shifts') },
    { href: '/login', label: t('nav.login') },
    { href: '/register', label: t('nav.register') },
  ];
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);

  const role: Role | null = currentUser?.role ?? null;
  const isLoggedIn = currentUser !== null;
  const items = getNavItems(role);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('btn.close') : 'Menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <HamburgerIcon open={open} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        className={[
          'fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-xl',
          'flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-hidden={!open}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <span className="text-base font-semibold text-orange-600">{t('site.name')}</span>
          <button
            onClick={() => setOpen(false)}
            aria-label={t('btn.close')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    'flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        {isLoggedIn && (
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={() => {
                logout();
                setOpen(false);
                router.push('/login');
              }}
              className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
