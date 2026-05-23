'use client';

/**
 * MobileNav (Phase 9S rewrite, Phase 9T tightening).
 *
 * Hamburger drawer for `< xl` viewports (Phase 9T bumped from `< lg` so
 * the long Vietnamese labels stay on one line in the desktop bar).
 * Mirrors the desktop nav's grouped structure so users see the same
 * product-level shape on small screens. Sections:
 *
 *   - Chính (top-level: Trang chủ, Tìm ca làm)
 *   - Người lao động (the four worker links)
 *   - Nhà tuyển dụng (the four employer links)
 *   - Hướng dẫn & hỗ trợ (info pages + Hỗ trợ)
 *   - Tài khoản (Đăng nhập / Đăng ký or Tổng quan / Hồ sơ + Logout)
 *
 * Drawer renders the role-aware account section so logged-in users see
 * their dashboard / profile / logout, and guests see Đăng nhập / Đăng ký.
 *
 * Closes on route change, ESC, outside click, and after any nav link
 * click. Notification bell stays in the desktop NavBar — it's already
 * accessible there. Logout button is preserved in the drawer footer
 * for logged-in users.
 *
 * Phase 9T also drops the admin `?tab=` deep links from the Chính
 * group; the admin dashboard's own tab system already covers those
 * surfaces and duplicating them here read as a half-broken second
 * navigation primitive in QA. The drawer keeps a thin divider between
 * sections (`border-t`) so the grouped sections feel substantial even
 * on narrow phones where the drawer can otherwise read as sparse.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { showSuccess } from '@/lib/toast';
import { useToastStore } from '@/stores/toastStore';
import { t } from '@/i18n/vi';

interface DrawerLink {
  href: string;
  label: string;
}

interface DrawerSection {
  heading: string;
  links: DrawerLink[];
}

const PUBLIC_SECTIONS: DrawerSection[] = [
  {
    heading: 'Chính',
    links: [
      { href: '/', label: 'Trang chủ' },
      { href: '/shifts', label: 'Tìm ca làm' },
    ],
  },
  {
    heading: 'Người lao động',
    links: [
      { href: '/shifts', label: 'Tìm ca làm' },
      { href: '/worker/reputation-guide', label: 'Hồ sơ & điểm uy tín' },
      { href: '/worker/schedule', label: 'Lịch cá nhân' },
      { href: '/worker/cancellation-policy', label: 'Quy định huỷ ca' },
    ],
  },
  {
    heading: 'Nhà tuyển dụng',
    links: [
      { href: '/employer/shifts/new', label: 'Đăng ca tuyển' },
      { href: '/employer/dashboard', label: 'Quản lý ứng viên' },
      { href: '/employer/payments', label: 'Đặt cọc & thanh toán' },
      { href: '/employer/reviews', label: 'Đánh giá sau ca' },
    ],
  },
  {
    heading: 'Hướng dẫn & hỗ trợ',
    links: [
      { href: '/how-it-works', label: 'Cách hoạt động' },
      { href: '/safety', label: 'An toàn & xác minh' },
      { href: '/faq', label: 'Câu hỏi thường gặp' },
      { href: '/disputes', label: 'Xử lý tranh chấp' },
      { href: '/support', label: 'Liên hệ hỗ trợ' },
    ],
  },
];

const WORKER_SECTIONS: DrawerSection[] = [
  {
    heading: 'Chính',
    links: [
      { href: '/', label: 'Trang chủ' },
      { href: '/shifts', label: 'Tìm ca làm' },
      { href: '/worker/dashboard', label: 'Tổng quan' },
      { href: '/worker/schedule', label: 'Lịch cá nhân' },
      { href: '/worker/profile', label: 'Hồ sơ' },
    ],
  },
  {
    heading: 'Hướng dẫn',
    links: [
      { href: '/worker/reputation-guide', label: 'Điểm uy tín' },
      { href: '/worker/cancellation-policy', label: 'Quy định huỷ ca' },
      { href: '/faq', label: 'Câu hỏi thường gặp' },
      { href: '/support', label: 'Liên hệ hỗ trợ' },
    ],
  },
];

const EMPLOYER_SECTIONS: DrawerSection[] = [
  {
    heading: 'Chính',
    links: [
      { href: '/', label: 'Trang chủ' },
      { href: '/employer/shifts/new', label: 'Đăng ca tuyển' },
      { href: '/employer/dashboard', label: 'Tổng quan' },
      { href: '/employer/schedule', label: 'Lịch tuyển dụng' },
      { href: '/employer/profile', label: 'Hồ sơ doanh nghiệp' },
    ],
  },
  {
    heading: 'Hướng dẫn',
    links: [
      { href: '/employer/payments', label: 'Đặt cọc & thanh toán' },
      { href: '/employer/reviews', label: 'Đánh giá sau ca' },
      { href: '/faq', label: 'Câu hỏi thường gặp' },
      { href: '/support', label: 'Liên hệ hỗ trợ' },
    ],
  },
];

const ADMIN_SECTIONS: DrawerSection[] = [
  {
    heading: 'Chính',
    links: [
      { href: '/', label: 'Trang chủ' },
      { href: '/admin/dashboard', label: 'Tổng quan admin' },
    ],
  },
  {
    heading: 'Hướng dẫn',
    links: [
      { href: '/disputes', label: 'Chính sách xử lý tranh chấp' },
      { href: '/support', label: 'Liên hệ hỗ trợ' },
    ],
  },
];

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

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);

  const role = currentUser?.role ?? null;
  const isLoggedIn = currentUser !== null;
  const sections =
    role === 'worker'
      ? WORKER_SECTIONS
      : role === 'employer'
        ? EMPLOYER_SECTIONS
        : role === 'admin'
          ? ADMIN_SECTIONS
          : PUBLIC_SECTIONS;

  // Close drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="xl:hidden">
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
          'fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-white shadow-xl',
          'flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-hidden={!open}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-orange-100 px-4 py-4">
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold text-orange-600">
              {t('site.name')}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              by CaLedo Tech
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t('btn.close')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Sections — Phase 9T: tighter `gap-2` between sections plus a
            thin divider so the drawer reads as denser product nav rather
            than four loose card sections floating in white space. */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-3"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-2">
            {sections.map((section, idx) => (
              <li
                key={section.heading}
                className={
                  idx > 0 ? 'border-t border-gray-100 pt-2' : undefined
                }
              >
                <DrawerSectionView
                  heading={section.heading}
                  links={section.links}
                  pathname={pathname}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Account / auth footer */}
        <div className="border-t border-gray-100 px-4 py-4">
          {isLoggedIn ? (
            <button
              onClick={() => {
                logout();
                useToastStore.getState().clear();
                showSuccess(t('feedback.auth.logout.success'), undefined, {
                  scope: 'auth',
                });
                setOpen(false);
                router.push('/login');
              }}
              className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t('nav.logout')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700 hover:bg-orange-50"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-3 text-sm font-semibold text-white shadow-sm"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DrawerSectionView({
  heading,
  links,
  pathname,
}: {
  heading: string;
  links: DrawerLink[];
  pathname: string;
}): ReactNode {
  return (
    <section>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {heading}
      </p>
      <ul className="flex flex-col gap-0.5">
        {links.map((link) => {
          const targetPath = link.href.split('?')[0];
          const active =
            pathname === targetPath ||
            (targetPath !== '/' && pathname.startsWith(`${targetPath}/`));
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={[
                  'flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-700 hover:bg-gray-100',
                ].join(' ')}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
