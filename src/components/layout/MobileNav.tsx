'use client';

/**
 * MobileNav (Phase 9X — portal fix + authenticated user-summary card).
 *
 * ## Phase 9X — root cause + fix for the "drawer hides only the navbar
 *                strip" bug at < sm widths
 *
 * Symptom: at 360 / 390 / 430 px the drawer slid in but the homepage
 * hero kept showing through everywhere below the navbar — the drawer
 * appeared to clip to roughly the height of the header (~64 px).
 *
 * Root cause: `<header>` in `NavBar.tsx` carries `backdrop-blur-sm`,
 * which translates to `backdrop-filter: blur(...)`. Per CSS spec, an
 * element with a non-`none` `backdrop-filter` becomes a containing
 * block for ALL descendants, **including `position: fixed`
 * descendants**. `<MobileNav>` was rendered inline inside `<header>`,
 * so its drawer's `fixed inset-0 …` positioned relative to the
 * header's box (not the viewport). The drawer's full-screen mode
 * therefore covered only the header strip; the hero peeked through
 * everywhere else.
 *
 * Fix: portal the drawer + backdrop into `document.body` so they
 * escape the header's containing-block trap. The hamburger trigger
 * button stays inline inside `<header>` because it must remain part
 * of the navbar's flex layout.
 *
 * Z-index map (Phase 9X canonical, see HANDOFF.md / VISUAL_QA.md):
 *
 *   header (sticky)              z-30
 *   nav guest dropdown menu      z-40
 *   notification bell panel      z-50
 *   user menu panel              z-40
 *   mobile drawer backdrop       z-[70]   ← Phase 9X bump
 *   mobile drawer panel          z-[80]   ← Phase 9X bump
 *   modal overlay                z-[100]
 *   toast host                   z-[110]
 *
 * The drawer panel must always sit above the navbar (z-30) AND above
 * the user-menu / nav dropdown panels so opening the drawer never
 * leaves a guest dropdown visible behind it. It must stay below the
 * modal overlay so a help modal opened from inside the drawer (rare
 * but possible) renders correctly.
 *
 * Other Phase 9X changes:
 *
 *   - For `isLoggedIn` users, the drawer body now opens with a user
 *     summary card (avatar `lg`, name, role, email, trust chip) on a
 *     subtle warm gradient strip. Below it the existing grouped
 *     sections (Phase 9T/9U) render unchanged.
 *
 *   - Drawer backdrop bumped from z-40 to z-[70]; drawer panel bumped
 *     from z-50 to z-[80]; the panel is opaque white so it can never
 *     read as transparent.
 *
 *   - Phase 9U body scroll-lock effect (`body.no-scroll` + scrollbar
 *     gutter compensation) is preserved exactly. It still lives in
 *     this component, gated by `typeof document === 'undefined'`.
 *
 *   - ESC, route-change auto-close, link-click auto-close, close
 *     button — all preserved.
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { showSuccess } from '@/lib/toast';
import { useToastStore } from '@/stores/toastStore';
import { t } from '@/i18n/vi';
import { UserAvatar } from '@/components/user/UserAvatar';
import type { Admin, Employer, User, Worker } from '@/types';

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
      // Phase 9Z-Fix-3: public-variant — `/worker/schedule` is
      // protected, so logged-out users get the user-guide instead.
      // Phase 9Z-Fix-4: deep-link to the feature anchor so the user
      // lands directly on the Lịch cá nhân explanation.
      { href: '/user-guide#worker-schedule', label: 'Lịch cá nhân' },
      { href: '/worker/cancellation-policy', label: 'Quy định huỷ ca' },
    ],
  },
  {
    heading: 'Nhà tuyển dụng',
    links: [
      // Phase 9Z-Fix-3: public-variant — `/employer/shifts/new` and
      // `/employer/dashboard` are protected, so logged-out users get
      // public guide pages.
      // Phase 9Z-Fix-4: deep-link to specific anchors so the user
      // lands on the right feature explanation.
      { href: '/user-guide#employer-post-shift', label: 'Đăng ca tuyển' },
      { href: '/user-guide#employer-applicants', label: 'Quản lý ứng viên' },
      { href: '/employer/payments', label: 'Giữ tiền ca làm (mô phỏng)' },
      { href: '/employer/reviews', label: 'Đánh giá sau ca' },
    ],
  },
  {
    heading: 'Hướng dẫn & hỗ trợ',
    links: [
      { href: '/how-it-works', label: 'Cách hoạt động' },
      { href: '/safety', label: t('nav.label.safety') },
      { href: '/faq', label: 'Câu hỏi thường gặp' },
      { href: '/disputes', label: 'Xử lý tranh chấp' },
      { href: '/user-guide', label: t('nav.label.userGuide') },
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
      { href: '/user-guide', label: t('nav.label.userGuide') },
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
      { href: '/employer/payments', label: 'Giữ tiền ca làm (mô phỏng)' },
      { href: '/employer/reviews', label: 'Đánh giá sau ca' },
      { href: '/user-guide', label: t('nav.label.userGuide') },
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
      // Phase 9Y-Fix-4 — Dark Reader and similar extensions inject
      // `data-darkreader-inline-stroke` on stroked SVGs before
      // hydration, producing noisy dev warnings. The flag suppresses
      // those for this element only; real hydration mismatches still
      // surface on legitimate descendants.
      suppressHydrationWarning
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

// Small life-buoy / chat glyph for the drawer support row (Phase 9U).
function SupportGlyph() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// User-summary helpers (Phase 9X)
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
    const score = (user as Worker).reputationScore;
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
      return 'bg-orange-100 text-orange-700';
  }
}

// ---------------------------------------------------------------------------
// MobileNav
// ---------------------------------------------------------------------------

export function MobileNav({ forceVisible = false }: { forceVisible?: boolean } = {}) {
  const [open, setOpen] = useState(false);

  // Phase 9X — portal mount guard. `createPortal` needs a real DOM
  // node; on the server (and during the first hydration pass) we
  // render only the trigger, never the portaled overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR-safe portal mount gate; the overlay must not render until client mount
    setMounted(true);
  }, []);

  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);

  const role = currentUser?.role ?? null;
  const isLoggedIn = currentUser !== null;
  const sections = useMemo<DrawerSection[]>(() => {
    if (role === 'worker') return WORKER_SECTIONS;
    if (role === 'employer') return EMPLOYER_SECTIONS;
    if (role === 'admin') return ADMIN_SECTIONS;
    return PUBLIC_SECTIONS;
  }, [role]);

  // Close drawer on route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional close-drawer-on-route-change; refactor would change navigation dismissal behavior
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

  // Phase 9U body scroll lock — preserved exactly.
  //
  // Toggles `body.no-scroll` while open and writes a scrollbar gutter
  // into `padding-right` so the layout doesn't shift when the
  // vertical scroll bar disappears. Restored on close + on unmount,
  // so a route change mid-drawer never leaves the body locked.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (open) {
      const scrollBarGutter =
        window.innerWidth - document.documentElement.clientWidth;
      body.classList.add('no-scroll');
      if (scrollBarGutter > 0) {
        body.style.paddingRight = `${scrollBarGutter}px`;
      }
      return () => {
        body.classList.remove('no-scroll');
        body.style.paddingRight = '';
      };
    }
    return undefined;
  }, [open]);

  function handleLogout() {
    logout();
    useToastStore.getState().clear();
    showSuccess(t('feedback.auth.logout.success'), undefined, {
      scope: 'auth',
    });
    setOpen(false);
    router.push('/login');
  }

  // ------------------------------------------------------------------
  // The portaled overlay (backdrop + drawer panel).
  // Lives on document.body so it escapes the <header>'s
  // `backdrop-filter` containing-block trap.
  // ------------------------------------------------------------------
  const overlay = (
    <>
      {/* Backdrop — z-[70] so it sits above the navbar (z-30) and any
          dropdown menus (z-40 / z-50) but below the drawer panel
          (z-[80]). Invisible at < sm because the drawer covers the
          whole viewport, but it's still on top of everything else so
          a click outside the drawer dismisses it. */}
      <div
        className={[
          'fixed inset-0 z-[70] bg-black/30 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel.
       *
       * - At `< sm`: occupies the entire viewport via `fixed inset-0`.
       * - At `sm+`: reverts to the right-side panel (`sm:inset-y-0
       *   sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw]`).
       * - The `bg-white` is opaque so the drawer can never read as
       *   transparent (Phase 9X requirement).
       * - z-[80] sits above the backdrop (z-[70]) but below modal
       *   (z-[100]) and toast (z-[110]).
       */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        className={[
          'fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw] z-[80] bg-white shadow-xl',
          'flex flex-col transition-transform duration-200 motion-reduce:transition-none',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-hidden={!open}
      >
        {/* Drawer header — warm gradient strip as before. */}
        <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-4">
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold text-orange-700">
              {t('site.name')}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
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

        {/* Body — scrollable. */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-3"
          aria-label="Mobile navigation"
        >
          {/* Phase 9X — authenticated user summary card pinned above
              the grouped sections. Mirrors the desktop user-menu
              summary so the user gets the same identity context on
              small screens. Guests skip this entirely; the drawer
              header alone (brand block) is enough. */}
          {isLoggedIn && currentUser && (
            <UserSummaryCard user={currentUser} />
          )}

          <ul className="mt-3 flex flex-col gap-2">
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
                  onNavigate={() => setOpen(false)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Account / auth footer */}
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <Link
            href="/support"
            onClick={() => setOpen(false)}
            className="mb-3 flex min-h-[40px] items-center gap-2 rounded-lg px-2 text-xs font-medium text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-700"
          >
            <SupportGlyph />
            <span>Cần hỗ trợ? Liên hệ đội CaLẻ</span>
          </Link>

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
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
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-orange-500 px-3 text-sm font-semibold text-gray-900 shadow-sm"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={forceVisible ? 'block' : 'xl:hidden'}>
      {/* Hamburger trigger — stays inline inside <header> so it sits in
          the navbar's flex layout. Only the drawer + backdrop portal.
          HEADER-NAV-LAYOUT-2: `forceVisible` keeps the hamburger shown
          at `xl+` when the desktop nav doesn't fit, so all nav links
          stay reachable without overlapping the profile zone. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('btn.close') : 'Menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        // Visual-polish pass — hamburger already meets the >=44px touch
        // target; add `ring-offset-2` so its focus ring matches the
        // shared 2px-orange-plus-offset contract (Req 10.3, 9.1).
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        <HamburgerIcon open={open} />
      </button>

      {/* Portal the overlay into <body> so it escapes the <header>'s
          `backdrop-filter` containing-block trap. Mounting guard
          keeps SSR safe — the trigger renders on first paint, the
          overlay only after the client `useEffect` has fired. */}
      {mounted && createPortal(overlay, document.body)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User summary card (Phase 9X) — top of the drawer for authenticated users.
// ---------------------------------------------------------------------------

function UserSummaryCard({ user }: { user: User }) {
  const name = displayName(user);
  const avatarUrl = avatarUrlFor(user);
  const role = roleLabel(user);
  const chip = trustChip(user);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-3 shadow-sm">
      <UserAvatar name={name} avatarUrl={avatarUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
        <p className="truncate text-xs text-gray-600">{role}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{user.email}</p>
        <span
          className={[
            'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
            chipClasses(chip.tone),
          ].join(' ')}
        >
          {chip.label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer section view
// ---------------------------------------------------------------------------

function DrawerSectionView({
  heading,
  links,
  pathname,
  onNavigate,
}: {
  heading: string;
  links: DrawerLink[];
  pathname: string;
  onNavigate: () => void;
}): ReactNode {
  return (
    <section>
      <p className="mx-1 mb-1 mt-0 rounded-md bg-orange-50/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
        {heading}
      </p>
      <ul className="flex flex-col gap-0.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
