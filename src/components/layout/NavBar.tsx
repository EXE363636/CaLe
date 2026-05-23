'use client';

/**
 * NavBar (Phase 9S rewrite).
 *
 * A real product nav with:
 *   - Brand block (CaLẻ / ShiftNow) plus a small "by CaLedo Tech" subtitle.
 *   - Public guest nav with grouped dropdowns:
 *       Trang chủ · Tìm ca làm · Người lao động ▾ · Nhà tuyển dụng ▾ ·
 *       An toàn & hướng dẫn ▾ · Hỗ trợ
 *     Right side: Đăng nhập · Đăng ký · primary CTA "Tìm ca làm ngay".
 *   - Role-aware nav for logged-in worker / employer / admin.
 *   - Active-state highlighting via path-prefix matching so any sub-route
 *     (e.g. `/worker/profile/edit`) keeps the parent menu lit.
 *   - Notification bell + logout button preserved from prior phases.
 *   - Mobile hamburger delegates to the redesigned `<MobileNav>`.
 *
 * No third-party dropdown library — the dropdown is a small in-component
 * primitive built on `<details>` semantics with click-outside / route-
 * change auto-close. Keyboard-accessible: native `<button>` for the
 * trigger, `<Link>` for items, focus rings on both.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { NotificationBell } from './NotificationBell';
import { MobileNav } from './MobileNav';
import { showSuccess } from '@/lib/toast';
import { useToastStore } from '@/stores/toastStore';
import { t } from '@/i18n/vi';

// ---------------------------------------------------------------------------
// Public nav structure
// ---------------------------------------------------------------------------

interface MenuItem {
  href: string;
  label: string;
  /** Short helper line under the label inside dropdowns. */
  description?: string;
}

interface MenuGroup {
  /** Trigger label (also used for the dropdown's aria-label). */
  label: string;
  /** Path prefixes that should light up the trigger's active state. */
  activePrefixes: string[];
  items: MenuItem[];
}

const WORKER_GROUP: MenuGroup = {
  label: 'Người lao động',
  activePrefixes: ['/worker'],
  items: [
    {
      href: '/shifts',
      label: 'Tìm ca làm',
      description: 'Xem các ca đang tuyển gần bạn',
    },
    {
      href: '/worker/reputation-guide',
      label: 'Hồ sơ & điểm uy tín',
      description: 'Hiểu cách hệ thống đánh giá độ tin cậy',
    },
    {
      href: '/worker/schedule',
      label: 'Lịch cá nhân',
      description: 'Quản lý thời gian rảnh và tránh trùng lịch',
    },
    {
      href: '/worker/cancellation-policy',
      label: 'Quy định huỷ ca',
      description: 'Các mốc thời gian và hạn mức huỷ ca',
    },
  ],
};

const EMPLOYER_GROUP: MenuGroup = {
  label: 'Nhà tuyển dụng',
  activePrefixes: ['/employer'],
  items: [
    {
      href: '/employer/shifts/new',
      label: 'Đăng ca tuyển',
      description: 'Tạo ca làm và mời người lao động',
    },
    {
      href: '/employer/dashboard',
      label: 'Quản lý ứng viên',
      description: 'Duyệt đơn và xác nhận ca hoàn thành',
    },
    {
      href: '/employer/payments',
      label: 'Đặt cọc & thanh toán',
      description: 'Cấp độ tin cậy và tỷ lệ đặt cọc',
    },
    {
      href: '/employer/reviews',
      label: 'Đánh giá sau ca',
      description: 'Hướng dẫn chấm điểm người lao động',
    },
  ],
};

const SAFETY_GROUP: MenuGroup = {
  label: 'An toàn & hướng dẫn',
  activePrefixes: ['/how-it-works', '/safety', '/faq', '/disputes'],
  items: [
    {
      href: '/how-it-works',
      label: 'Cách hoạt động',
      description: 'Bốn bước từ đăng ca đến thanh toán',
    },
    {
      href: '/safety',
      label: 'An toàn & xác minh',
      description: 'Cơ chế bảo vệ người dùng của CaLẻ',
    },
    {
      href: '/faq',
      label: 'Câu hỏi thường gặp',
      description: 'Trả lời nhanh các thắc mắc phổ biến',
    },
    {
      href: '/disputes',
      label: 'Xử lý tranh chấp',
      description: 'Quy trình khi xảy ra mâu thuẫn',
    },
  ],
};

// ---------------------------------------------------------------------------
// Active-state helper
// ---------------------------------------------------------------------------

function isPathActive(pathname: string, target: string): boolean {
  if (target === '/') return pathname === '/';
  return pathname === target || pathname.startsWith(`${target}/`);
}

function isAnyPrefixActive(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// ---------------------------------------------------------------------------
// NavBar
// ---------------------------------------------------------------------------

export function NavBar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);

  const role = currentUser?.role ?? null;
  const isLoggedIn = currentUser !== null;

  function handleLogout() {
    logout();
    useToastStore.getState().clear();
    showSuccess(t('feedback.auth.logout.success'), undefined, {
      scope: 'auth',
    });
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand block */}
        <Link
          href="/"
          className="flex shrink-0 flex-col leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:rounded"
        >
          <span className="text-lg font-bold text-orange-600 hover:text-orange-700">
            {t('site.name')}
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:block">
            by CaLedo Tech
          </span>
        </Link>

        {/* Desktop nav — gated by role. Hidden below `lg` so the nav
            doesn't crowd the brand on tablet widths; mobile drawer
            covers small viewports. */}
        <nav
          className="ml-2 hidden flex-1 items-center justify-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {role === null && <PublicNav pathname={pathname} />}
          {role === 'worker' && <WorkerNav pathname={pathname} />}
          {role === 'employer' && <EmployerNav pathname={pathname} />}
          {role === 'admin' && <AdminNav pathname={pathname} />}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          {isLoggedIn && <NotificationBell />}

          {role === null && (
            <div className="hidden items-center gap-1 lg:flex">
              <NavButton href="/login" pathname={pathname}>
                {t('nav.login')}
              </NavButton>
              <NavButton href="/register" pathname={pathname}>
                {t('nav.register')}
              </NavButton>
              <Link
                href="/shifts"
                className="ml-1 inline-flex min-h-[40px] items-center rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1"
              >
                Tìm ca làm ngay
              </Link>
            </div>
          )}

          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="hidden lg:flex min-h-[40px] items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-600"
            >
              {t('nav.logout')}
            </button>
          )}

          <MobileNav />
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Per-role nav variants
// ---------------------------------------------------------------------------

function PublicNav({ pathname }: { pathname: string }) {
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink href="/shifts" pathname={pathname}>
        {t('nav.shifts')}
      </NavLink>
      <Dropdown group={WORKER_GROUP} pathname={pathname} />
      <Dropdown group={EMPLOYER_GROUP} pathname={pathname} />
      <Dropdown group={SAFETY_GROUP} pathname={pathname} />
      <NavLink href="/support" pathname={pathname}>
        Hỗ trợ
      </NavLink>
    </>
  );
}

function WorkerNav({ pathname }: { pathname: string }) {
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink href="/shifts" pathname={pathname}>
        {t('nav.shifts')}
      </NavLink>
      <NavLink href="/worker/dashboard" pathname={pathname}>
        {t('nav.dashboard')}
      </NavLink>
      <NavLink href="/worker/schedule" pathname={pathname}>
        {t('nav.schedule')}
      </NavLink>
      <NavLink href="/worker/profile" pathname={pathname}>
        {t('nav.profile')}
      </NavLink>
      <NavLink href="/support" pathname={pathname}>
        Hỗ trợ
      </NavLink>
    </>
  );
}

function EmployerNav({ pathname }: { pathname: string }) {
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink href="/employer/shifts/new" pathname={pathname}>
        {t('nav.postShift')}
      </NavLink>
      <NavLink href="/employer/dashboard" pathname={pathname}>
        {t('nav.dashboard')}
      </NavLink>
      <NavLink href="/employer/schedule" pathname={pathname}>
        {t('nav.employerSchedule')}
      </NavLink>
      <NavLink href="/employer/profile" pathname={pathname}>
        Hồ sơ doanh nghiệp
      </NavLink>
      <NavLink href="/support" pathname={pathname}>
        Hỗ trợ
      </NavLink>
    </>
  );
}

function AdminNav({ pathname }: { pathname: string }) {
  // The admin dashboard's tab system already covers users/shifts/disputes.
  // We deep-link to those tabs from the navbar via `?tab=` query — the
  // existing `useModalFromQuery`-style handler in `/admin/dashboard`
  // already reads this param.
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink href="/admin/dashboard" pathname={pathname}>
        Tổng quan admin
      </NavLink>
      <NavLink href="/admin/dashboard?tab=users" pathname={pathname}>
        Người dùng
      </NavLink>
      <NavLink href="/admin/dashboard?tab=shifts" pathname={pathname}>
        Ca làm
      </NavLink>
      <NavLink href="/admin/dashboard?tab=disputes" pathname={pathname}>
        Tranh chấp
      </NavLink>
      <NavLink href="/support" pathname={pathname}>
        Hỗ trợ
      </NavLink>
    </>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function navLinkClasses(active: boolean): string {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[40px] flex items-center',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
    active
      ? 'bg-orange-50 text-orange-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  ].join(' ');
}

function NavLink({
  href,
  pathname,
  exact = false,
  children,
}: {
  href: string;
  pathname: string;
  exact?: boolean;
  children: ReactNode;
}) {
  // Strip query string from the link's href before computing the active
  // state — admin nav uses `?tab=...` deep links and we want them to
  // match against `pathname` only.
  const targetPath = href.split('?')[0];
  const active = exact
    ? pathname === targetPath
    : isPathActive(pathname, targetPath);
  return (
    <Link href={href} className={navLinkClasses(active)}>
      {children}
    </Link>
  );
}

function NavButton({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: ReactNode;
}) {
  const active = pathname === href;
  return (
    <Link href={href} className={navLinkClasses(active)}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Dropdown — small accessible primitive
// ---------------------------------------------------------------------------

function Dropdown({
  group,
  pathname,
}: {
  group: MenuGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = isAnyPrefixActive(pathname, group.activePrefixes);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Click-outside dismissal.
  useEffect(() => {
    if (!open) return;
    function handler(event: MouseEvent) {
      const node = containerRef.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape dismissal.
  useEffect(() => {
    if (!open) return;
    function handler(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          navLinkClasses(active),
          'gap-1',
        ].join(' ')}
      >
        {group.label}
        <svg
          className={[
            'h-3.5 w-3.5 text-gray-400 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={group.label}
          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
        >
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <li key={item.href} role="none">
                <Link
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex flex-col rounded-lg px-3 py-2 text-sm transition-colors hover:bg-orange-50 focus:outline-none focus-visible:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span className="font-medium text-gray-900">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 text-xs text-gray-500">
                      {item.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports for tests / docs
// ---------------------------------------------------------------------------

export const NAV_GROUPS = {
  worker: WORKER_GROUP,
  employer: EMPLOYER_GROUP,
  safety: SAFETY_GROUP,
};
