'use client';

/**
 * UserMenu (Phase 9X) — authenticated avatar / profile dropdown.
 *
 * Replaces the raw `Đăng xuất` text button that previously sat next to
 * the notification bell for `isLoggedIn && role !== null` users at
 * `xl+`. Renders a compact trigger (`UserAvatar` + role label + a
 * truncated name + chevron) and a dropdown panel with:
 *
 *   - A user summary card (avatar, name, role, email, trust chip).
 *   - A role-aware list of shortcut links that deep-link into the
 *     existing pages (worker/employer/admin dashboards, profiles,
 *     schedules, the reputation modal, the pending-applicants modal,
 *     etc.). Modal deep links use `?modal=...` and rely on the
 *     `useModalFromQuery` hook already wired into the dashboards.
 *   - A red, full-width Đăng xuất button that mirrors the Phase 9R
 *     logout behaviour: clear toasts, push the success toast with the
 *     `auth` scope, navigate to /login.
 *
 * Behaviour mirrors the Phase 9T/9W nav dropdown:
 *   - hover-open + 150 ms close grace timer,
 *   - click-toggle on the trigger,
 *   - `onFocus` opens for keyboard tab,
 *   - ESC closes,
 *   - outside click closes,
 *   - route change closes,
 *   - link click closes immediately.
 *
 * The menu is independent from the nav guest dropdowns (different auth
 * states — they never co-exist on the same page) and from the
 * notification bell (both can be open at once on logged-in pages — see
 * the overlay coordination notes in HANDOFF.md / VISUAL_QA.md).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { getWorkerReputation } from '@/stores/userStore';
import { useToastStore } from '@/stores/toastStore';
import { showSuccess } from '@/lib/toast';
import { navigateWithIntent } from '@/lib/notificationAction';
import { t } from '@/i18n/vi';
import { UserAvatar } from '@/components/user/UserAvatar';
import type { Admin, Employer, User, Worker } from '@/types';

// ---------------------------------------------------------------------------
// Item structure
// ---------------------------------------------------------------------------

interface MenuItem {
  href: string;
  label: string;
}

function workerItems(): MenuItem[] {
  return [
    { href: '/worker/dashboard', label: t('nav.userMenu.worker.dashboard') },
    { href: '/worker/profile', label: t('nav.userMenu.worker.profile') },
    { href: '/worker/schedule', label: t('nav.userMenu.worker.schedule') },
    {
      // CORE-STABILITY-6 Part 1 — explicit section intent so this works
      // same-route (scrolls/highlights the applied-jobs section even
      // when already on the worker dashboard).
      href: '/worker/dashboard?section=applications',
      label: t('nav.userMenu.worker.applications'),
    },
    {
      href: '/worker/dashboard?modal=reputation',
      label: t('nav.userMenu.worker.reputation'),
    },
    { href: '/support', label: t('nav.userMenu.support') },
  ];
}

function employerItems(): MenuItem[] {
  return [
    {
      href: '/employer/dashboard',
      label: t('nav.userMenu.employer.dashboard'),
    },
    {
      href: '/employer/shifts/new',
      label: t('nav.userMenu.employer.postShift'),
    },
    { href: '/employer/schedule', label: t('nav.userMenu.employer.schedule') },
    { href: '/employer/profile', label: t('nav.userMenu.employer.profile') },
    {
      href: '/employer/dashboard?modal=pending',
      label: t('nav.userMenu.employer.pending'),
    },
    { href: '/employer/payments', label: t('nav.userMenu.employer.payments') },
    { href: '/support', label: t('nav.userMenu.support') },
  ];
}

function adminItems(): MenuItem[] {
  return [
    { href: '/admin/dashboard', label: t('nav.userMenu.admin.dashboard') },
    {
      href: '/admin/dashboard?tab=users',
      label: t('nav.userMenu.admin.users'),
    },
    {
      href: '/admin/dashboard?tab=shifts',
      label: t('nav.userMenu.admin.shifts'),
    },
    {
      href: '/admin/dashboard?tab=disputes',
      label: t('nav.userMenu.admin.disputes'),
    },
    { href: '/support', label: t('nav.userMenu.support') },
  ];
}

// ---------------------------------------------------------------------------
// Identity helpers
// ---------------------------------------------------------------------------

function displayName(user: User): string {
  if (user.role === 'worker') return (user as Worker).fullName;
  if (user.role === 'employer') return (user as Employer).companyName;
  return (user as Admin).fullName;
}

function avatarUrlFor(user: User): string | undefined {
  if (user.role === 'worker') return (user as Worker).avatarUrl;
  if (user.role === 'employer') return (user as Employer).logoUrl;
  return undefined;
}

function roleLabel(user: User): string {
  if (user.role === 'worker') return t('role.worker');
  if (user.role === 'employer') return t('role.employer');
  return t('role.admin');
}

function trustChip(user: User): { label: string; tone: 'good' | 'warn' | 'neutral' } {
  if (user.role === 'worker') {
    // Cluster 2 · BUG 3 (Req 2.3): read through the single shared source so
    // the trust chip matches the worker dashboard / employer badges exactly.
    const score = getWorkerReputation(user.id);
    return {
      label: t('nav.userMenu.chip.reputation').replace('{score}', String(score)),
      tone: score >= 80 ? 'good' : score >= 50 ? 'warn' : 'neutral',
    };
  }
  if (user.role === 'employer') {
    const e = user as Employer;
    return e.verifiedBusiness
      ? { label: t('nav.userMenu.chip.verifiedBusiness'), tone: 'good' }
      : { label: t('nav.userMenu.chip.individualEmployer'), tone: 'neutral' };
  }
  return { label: t('nav.userMenu.chip.admin'), tone: 'good' };
}

function chipClasses(tone: 'good' | 'warn' | 'neutral'): string {
  switch (tone) {
    case 'good':
      return 'bg-green-100 text-green-700';
    case 'warn':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-orange-100 text-orange-800';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserMenu() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-role item list, derived from the current user's role.
  const items: MenuItem[] = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'worker') return workerItems();
    if (currentUser.role === 'employer') return employerItems();
    return adminItems();
  }, [currentUser]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 150);
  }, [cancelClose]);

  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  const toggle = useCallback(() => {
    cancelClose();
    setOpen((v) => !v);
  }, [cancelClose]);

  // Cleanup the timer on unmount.
  useEffect(() => () => cancelClose(), [cancelClose]);

  // Close on route change.
  useEffect(() => {
    cancelClose();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional close-on-route-change for the user menu; refactor would change navigation dismissal behavior
    setOpen(false);
  }, [pathname, cancelClose]);

  // Outside click + ESC dismissal — only mount listeners while open.
  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const node = containerRef.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) {
        cancelClose();
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelClose();
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, cancelClose]);

  if (!currentUser) return null;

  const name = displayName(currentUser);
  const avatarUrl = avatarUrlFor(currentUser);
  const role = roleLabel(currentUser);
  const chip = trustChip(currentUser);

  function handleLogout() {
    logout();
    useToastStore.getState().clear();
    showSuccess(t('feedback.auth.logout.success'), undefined, {
      scope: 'auth',
    });
    closeNow();
    router.push('/login');
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      data-user-menu="true"
    >
      <button
        type="button"
        onClick={toggle}
        onFocus={openNow}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? t('nav.userMenu.closeLabel') : t('nav.userMenu.openLabel')}
        className={[
          'flex min-h-[40px] min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-colors',
          'text-gray-700 hover:bg-orange-50 hover:text-orange-700',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
        ].join(' ')}
      >
        <UserAvatar name={name} avatarUrl={avatarUrl} size="sm" />
        <span className="hidden min-w-0 max-w-[10rem] truncate xl:inline-block">
          {name}
        </span>
        <span className="hidden shrink-0 whitespace-nowrap text-xs text-gray-500 xl:inline-flex">
          {role}
        </span>
        <svg
          className={[
            'h-3.5 w-3.5 text-gray-400 transition-transform motion-reduce:transition-none',
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
          aria-label={t('nav.userMenu.account')}
          className={[
            'absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5',
          ].join(' ')}
        >
          {/* User summary card */}
          <div className="flex items-start gap-3 rounded-lg bg-orange-50 px-3 py-3">
            <UserAvatar name={name} avatarUrl={avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {name}
              </p>
              <p className="truncate text-xs text-gray-500">{role}</p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {currentUser.email}
              </p>
              <span
                className={[
                  'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  chipClasses(chip.tone),
                ].join(' ')}
              >
                {chip.label}
              </span>
            </div>
          </div>

          {/* Section divider between summary and links */}
          <div className="my-2 border-t border-gray-100" aria-hidden="true" />

          {/* Shortcut list */}
          <ul className="flex flex-col">
            {items.map((item, idx) => (
              <li key={`${item.href}-${idx}`} role="none">
                <MenuLink
                  href={item.href}
                  onActivate={closeNow}
                  router={router}
                  pathname={pathname}
                >
                  {item.label}
                </MenuLink>
              </li>
            ))}
          </ul>

          {/* Section divider before logout */}
          <div className="my-2 border-t border-gray-100" aria-hidden="true" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[40px] w-full items-center justify-center rounded-lg px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal link primitive — closes the menu on click.
//
// NAV-INTENT-DEEPLINK-FIX-1: a shortcut whose href carries an intent
// (`?modal=` / `?tab=`) must work even when the user is ALREADY on the
// target route. A plain `<Link>` to the same path updates the URL but
// the page's mount-only intent readers never re-fire, so the
// tab/modal would not open. We route the click through
// `navigateWithIntent`: for a SAME-route intent it dispatches the
// dashboard event (and we `preventDefault` so the `<Link>` no-op
// navigation doesn't also run); for a cross-route link we let the
// normal `<Link>` navigation proceed (preserving prefetch).
// ---------------------------------------------------------------------------

function MenuLink({
  href,
  onActivate,
  router,
  pathname,
  children,
}: {
  href: string;
  onActivate: () => void;
  router: Pick<AppRouterInstance, 'push'>;
  pathname: string;
  children: ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const url = new URL(href, 'http://placeholder.local');
    const hasIntent =
      url.searchParams.has('modal') ||
      url.searchParams.has('tab') ||
      url.searchParams.has('filter') ||
      url.searchParams.has('section');
    // Only intercept same-route intent clicks; everything else uses the
    // native <Link> navigation untouched.
    if (hasIntent && url.pathname === pathname) {
      e.preventDefault();
      navigateWithIntent(href, { router, pathname });
    }
    onActivate();
  }
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={handleClick}
      className="flex min-h-[40px] items-center rounded-lg px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus-visible:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      {children}
    </Link>
  );
}
