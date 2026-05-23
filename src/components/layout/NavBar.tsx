'use client';

/**
 * NavBar (Phase 9W refinement of the Phase 9T / 9V dropdown).
 *
 * A real product nav with:
 *   - Brand block (CaLẻ / ShiftNow) plus a small "by CaLedo Tech" subtitle.
 *   - Public guest nav with grouped dropdowns:
 *       Trang chủ · Tìm ca làm · Người lao động ▾ · Nhà tuyển dụng ▾ ·
 *       An toàn & hướng dẫn ▾ · Hỗ trợ
 *     Right side: Đăng nhập · Đăng ký · primary CTA "Đăng ca tuyển"
 *     (Phase 9T: the right CTA targets employers so the worker side
 *     uses the middle "Tìm ca làm" link and the right CTA balances
 *     the audiences without two competing "find a shift" buttons).
 *   - Role-aware nav for logged-in worker / employer / admin.
 *   - Active-state highlighting via path-prefix matching so any sub-route
 *     (e.g. `/worker/profile/edit`) keeps the parent menu lit.
 *   - Notification bell + logout button preserved from prior phases.
 *   - Mobile hamburger delegates to the redesigned `<MobileNav>`.
 *
 * No third-party dropdown library — the dropdown is a small in-component
 * primitive built on a button + popover with click-outside / route-
 * change auto-close. Phase 9T introduced hover-open with a 150ms close
 * delay so the cursor can travel from the trigger to the menu without
 * the menu collapsing. Phase 9W lifts the dropdown's coordination state
 * to this NavBar parent so only ONE dropdown can be open at a time —
 * see the "Phase 9W single-open coordinator" block below for the root
 * cause and the fix. Click-toggle, ESC, outside-click, route-change
 * close, and `onFocus` keyboard-open are all preserved.
 *
 * Phase 9T also bumps the desktop-nav breakpoint from `lg` to `xl` so
 * the long Vietnamese labels never wrap or compete with the brand at
 * common laptop widths. Below `xl` the hamburger drives the entire nav.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/stores/authStore';
import { NotificationBell } from './NotificationBell';
import { MobileNav } from './MobileNav';
import { UserMenu } from './UserMenu';
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

/**
 * Phase 9W — `DropdownId` is the union of all dropdown identifiers used
 * by the NavBar's single-open coordinator. Adding a new dropdown means
 * extending this union AND adding a `<Dropdown id="..." />` instance
 * below; nothing else has to change.
 */
type DropdownId = 'worker' | 'employer' | 'safety';

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
  activePrefixes: ['/how-it-works', '/safety', '/faq', '/disputes', '/user-guide'],
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
    {
      href: '/user-guide',
      label: 'Hướng dẫn sử dụng',
      description: 'Hướng dẫn từng bước cho cả hai phía',
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
  const currentUser = useCurrentUser();

  const role = currentUser?.role ?? null;
  const isLoggedIn = currentUser !== null;

  // -------------------------------------------------------------------------
  // Phase 9W — single-open dropdown coordinator
  //
  // Root cause of the Phase 9V follow-up bug: each `<Dropdown>` owned
  // its own local `open` boolean and its own `closeTimerRef`. When a
  // user moved the cursor fast between two triggers, the trigger A's
  // 150 ms close timer was still pending while trigger B's
  // `setOpen(true)` ran — both menus became visible at once, overlapping.
  //
  // Fix: lift state to this NavBar parent. The parent owns:
  //   1. `activeDropdown` — exactly one of `'worker' | 'employer' |
  //      'safety' | null`. Setting a new id implicitly closes the
  //      previously-open dropdown so two menus can never co-exist.
  //   2. `closeTimerRef` — ONE shared timer ref; opening any dropdown
  //      cancels any pending close, and scheduling a close cancels the
  //      previous timer first so timers don't accumulate.
  //   3. The outside-click, ESC, and route-change handlers — they're
  //      route- and document-level, not per-dropdown, so they belong
  //      here.
  //
  // Each `<Dropdown>` is now a controlled, layout-only child. It owns
  // markup, hover/focus/click triggers, and the `containerRef` used by
  // the parent's outside-click test, but it does NOT decide when its
  // own menu is open.
  // -------------------------------------------------------------------------
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to each dropdown container, used by the parent-level
  // outside-click listener. We register/unregister via the
  // `registerContainer` callback passed to each `<Dropdown>` so the
  // map stays in sync if a dropdown unmounts (e.g. role change).
  const containersRef = useRef<Map<DropdownId, HTMLElement>>(new Map());
  const registerContainer = useCallback(
    (id: DropdownId, node: HTMLElement | null) => {
      const map = containersRef.current;
      if (node) {
        map.set(id, node);
      } else {
        map.delete(id);
      }
    },
    [],
  );

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openDropdown = useCallback(
    (id: DropdownId) => {
      cancelClose();
      // Setting a new id implicitly closes the previously-open dropdown
      // because the controlled child reads `isOpen={activeDropdown === id}`.
      setActiveDropdown(id);
    },
    [cancelClose],
  );

  const scheduleCloseDropdown = useCallback(
    (id: DropdownId) => {
      cancelClose();
      closeTimerRef.current = setTimeout(() => {
        // Only close if this dropdown is still the one that's open —
        // a faster `openDropdown(otherId)` may have run while the
        // timer was pending.
        setActiveDropdown((current) => (current === id ? null : current));
        closeTimerRef.current = null;
      }, 150);
    },
    [cancelClose],
  );

  const toggleDropdown = useCallback(
    (id: DropdownId) => {
      cancelClose();
      setActiveDropdown((current) => (current === id ? null : id));
    },
    [cancelClose],
  );

  const closeNow = useCallback(() => {
    cancelClose();
    setActiveDropdown(null);
  }, [cancelClose]);

  // Cleanup the shared timer when NavBar unmounts.
  useEffect(() => () => cancelClose(), [cancelClose]);

  // Close on route change (covers programmatic navigation + Link clicks
  // that triggered before the child's `onClick` handler ran).
  useEffect(() => {
    cancelClose();
    setActiveDropdown(null);
  }, [pathname, cancelClose]);

  // Outside-click dismissal — single document-level listener that
  // checks against ALL registered dropdown containers.
  useEffect(() => {
    if (activeDropdown === null) return;
    function handler(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      for (const node of containersRef.current.values()) {
        if (node.contains(target)) return; // click landed inside a dropdown
      }
      cancelClose();
      setActiveDropdown(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeDropdown, cancelClose]);

  // ESC dismissal.
  useEffect(() => {
    if (activeDropdown === null) return;
    function handler(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelClose();
        setActiveDropdown(null);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeDropdown, cancelClose]);

  // Phase 9X — desktop logout now lives inside `<UserMenu />`. The
  // mobile drawer keeps its own logout button for `< xl` viewports.
  // NavBar no longer needs to know about logout at all.

  // Phase 9V — DO NOT add `overflow-x-hidden` here.
  //
  // Phase 9U briefly added `overflow-x-hidden` to this <header> as a
  // "defensive" horizontal-overflow guard. Per CSS spec, when
  // `overflow-x: hidden` is paired with default `overflow-y: visible`,
  // browsers promote `overflow-y` to implicit `auto`, turning the
  // ~64px-tall header into a clipping context. The desktop dropdown
  // menus (`absolute left-0 top-full mt-2 w-72`) extend ~280–320 px
  // DOWNWARD from inside the header and got cropped at the header's
  // bottom edge — they appeared sliced off across all desktop widths.
  //
  // The actual horizontal-overflow safety net lives at the document
  // root (`html, body { overflow-x: hidden; width: 100% }` in
  // `globals.css`). That clamp is sufficient. The header must NOT
  // re-introduce its own `overflow-x-hidden`. If a future page
  // surfaces a real horizontal scroll bug, fix the offending
  // descendant element rather than restoring this clip.
  //
  // Z-index map (preserved): header = z-30, dropdown menu = z-40.
  // Phase 9X — `shadow-sm` adds a hint of depth so the sticky nav
  // visibly lifts off the page; the underline border still defines
  // the bottom edge.
  return (
    <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur-sm">
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

        {/* Desktop nav — gated by role. Hidden below `xl` (Phase 9T:
            bumped from `lg`) so the long Vietnamese labels stay on
            one line at common laptop widths and the hamburger drawer
            covers everything narrower. */}
        <nav
          className="ml-2 hidden flex-1 items-center justify-center gap-1 xl:flex"
          aria-label="Main navigation"
        >
          {role === null && (
            <PublicNav
              pathname={pathname}
              activeDropdown={activeDropdown}
              registerContainer={registerContainer}
              onOpen={openDropdown}
              onClose={scheduleCloseDropdown}
              onToggle={toggleDropdown}
              onItemClick={closeNow}
            />
          )}
          {role === 'worker' && <WorkerNav pathname={pathname} />}
          {role === 'employer' && <EmployerNav pathname={pathname} />}
          {role === 'admin' && <AdminNav pathname={pathname} />}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          {isLoggedIn && <NotificationBell />}

          {role === null && (
            <div className="hidden items-center gap-1 xl:flex">
              <NavButton href="/login" pathname={pathname}>
                {t('nav.login')}
              </NavButton>
              <NavButton href="/register" pathname={pathname}>
                {t('nav.register')}
              </NavButton>
              {/* Phase 9T — the middle nav already carries "Tìm ca làm"
                  for workers, so this primary CTA is dedicated to the
                  employer side. Two clear paths, no duplicate "find a
                  shift" CTA fighting itself for attention. */}
              <Link
                href="/register?role=employer"
                className="ml-1 inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1"
              >
                Đăng ca tuyển
              </Link>
            </div>
          )}

          {isLoggedIn && (
            <div className="hidden xl:flex">
              <UserMenu />
            </div>
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

interface PublicNavProps {
  pathname: string;
  activeDropdown: DropdownId | null;
  registerContainer: (id: DropdownId, node: HTMLElement | null) => void;
  onOpen: (id: DropdownId) => void;
  onClose: (id: DropdownId) => void;
  onToggle: (id: DropdownId) => void;
  onItemClick: () => void;
}

function PublicNav({
  pathname,
  activeDropdown,
  registerContainer,
  onOpen,
  onClose,
  onToggle,
  onItemClick,
}: PublicNavProps) {
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink href="/shifts" pathname={pathname}>
        {t('nav.shifts')}
      </NavLink>
      <Dropdown
        id="worker"
        group={WORKER_GROUP}
        pathname={pathname}
        isOpen={activeDropdown === 'worker'}
        registerContainer={registerContainer}
        onOpen={onOpen}
        onClose={onClose}
        onToggle={onToggle}
        onItemClick={onItemClick}
      />
      <Dropdown
        id="employer"
        group={EMPLOYER_GROUP}
        pathname={pathname}
        isOpen={activeDropdown === 'employer'}
        registerContainer={registerContainer}
        onOpen={onOpen}
        onClose={onClose}
        onToggle={onToggle}
        onItemClick={onItemClick}
      />
      <Dropdown
        id="safety"
        group={SAFETY_GROUP}
        pathname={pathname}
        isOpen={activeDropdown === 'safety'}
        registerContainer={registerContainer}
        onOpen={onOpen}
        onClose={onClose}
        onToggle={onToggle}
        onItemClick={onItemClick}
      />
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

// Phase 9T — admin top nav simplification.
//
// The previous Phase 9S build duplicated the admin dashboard's own tab
// system in the top nav via `?tab=...` deep links (`Người dùng`, `Ca làm`,
// `Tranh chấp`). In manual QA those links read as a separate, half-broken
// navigation primitive — they didn't change the URL the user could see
// against, didn't visually feel different from the dashboard's own
// pill-style tabs, and adding them at the top forced the rest of the nav
// to compete for room. We keep only `Trang chủ`, `Tổng quan admin`, and
// `Hỗ trợ` here and let the dashboard's tab system do its job.
function AdminNav({ pathname }: { pathname: string }) {
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink href="/admin/dashboard" pathname={pathname}>
        Tổng quan admin
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
    // Phase 9T — `whitespace-nowrap` prevents long Vietnamese labels
    // (Hỗ trợ, Tổng quan admin, Lịch tuyển dụng…) from wrapping onto
    // two lines at narrow desktop widths.
    'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[40px] flex items-center',
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
// Dropdown — small, controlled, layout-only primitive (Phase 9W)
//
// The `Dropdown` is a purely controlled component now. The parent
// `NavBar` owns:
//   - `activeDropdown` state (single source of truth, exactly one open
//     at a time),
//   - the shared 150 ms close timer (cancellation + reschedule on
//     re-entry),
//   - the document-level outside-click and ESC handlers,
//   - the route-change auto-close.
//
// This `Dropdown` owns:
//   - the trigger button + menu markup,
//   - hover/focus/click triggers that call back into the parent,
//   - the container ref used by the parent's outside-click test
//     (registered via `registerContainer`).
//
// Behavior contract preserved from Phase 9T:
//   - Hover-open + 150 ms close delay on `onMouseLeave`.
//   - Click-toggle on the trigger.
//   - `onFocus` mirrors hover-open for keyboard tab navigation.
//   - Item-link click closes the menu immediately.
//   - The mobile drawer (`<MobileNav>`) intentionally does NOT use this
//     hover behaviour — touch surfaces stay click-collapsible.
// ---------------------------------------------------------------------------

interface DropdownProps {
  id: DropdownId;
  group: MenuGroup;
  pathname: string;
  isOpen: boolean;
  registerContainer: (id: DropdownId, node: HTMLElement | null) => void;
  onOpen: (id: DropdownId) => void;
  onClose: (id: DropdownId) => void;
  onToggle: (id: DropdownId) => void;
  onItemClick: () => void;
}

function Dropdown({
  id,
  group,
  pathname,
  isOpen,
  registerContainer,
  onOpen,
  onClose,
  onToggle,
  onItemClick,
}: DropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const active = isAnyPrefixActive(pathname, group.activePrefixes);

  // Register / unregister this dropdown's container with the parent so
  // its outside-click listener can check against every dropdown at
  // once. We re-register in a layout-stable effect so the parent's
  // first outside-click event after mount sees the node.
  useEffect(() => {
    registerContainer(id, containerRef.current);
    return () => registerContainer(id, null);
  }, [id, registerContainer]);

  return (
    <div
      ref={containerRef}
      data-nav-dropdown={id}
      className="relative"
      onMouseEnter={() => onOpen(id)}
      onMouseLeave={() => onClose(id)}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        onFocus={() => onOpen(id)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={[navLinkClasses(active), 'gap-1'].join(' ')}
      >
        {group.label}
        <svg
          className={[
            'h-3.5 w-3.5 text-gray-400 transition-transform',
            isOpen ? 'rotate-180' : '',
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

      {isOpen && (
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
                  onClick={() => onItemClick()}
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
