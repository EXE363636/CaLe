'use client';

/**
 * NavBar (Phase 9W refinement of the Phase 9T / 9V dropdown).
 *
 * A real product nav with:
 *   - Brand block (CaLẻ) plus a small "by CaLedo Tech" subtitle.
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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/stores/authStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useVerificationStore } from '@/stores';
import {
  adminVerificationTaskCount,
  employerDashboardTaskCount,
  workerProfileTaskCount,
} from '@/domain/taskBadges';
import { TaskBadge } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { hasCapability } from '@/data/capabilities';
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
      label: 'Giữ tiền ca làm (mô phỏng)',
      description:
        'Mô phỏng giữ tiền ca để đảm bảo trả công. Trong MVP/demo không có giao dịch thật.',
    },
    {
      href: '/employer/reviews',
      label: 'Đánh giá sau ca',
      description: 'Hướng dẫn chấm điểm người lao động',
    },
  ],
};

const SAFETY_GROUP: MenuGroup = {
  label: 'Hướng dẫn & hỗ trợ',
  activePrefixes: ['/how-it-works', '/safety', '/faq', '/disputes', '/user-guide', '/handbook', '/pricing'],
  items: [
    {
      href: '/how-it-works',
      label: 'Cách hoạt động',
      description: 'Bốn bước từ đăng ca đến thanh toán',
    },
    {
      href: '/pricing',
      label: 'Bảng giá',
      description: 'Miễn phí trong giai đoạn thử nghiệm',
    },
    {
      href: '/safety',
      label: t('nav.label.safety'),
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
      label: t('nav.label.userGuide'),
      description: 'Hướng dẫn từng bước cho cả hai phía',
    },
    {
      href: '/handbook',
      label: 'Cẩm nang làm việc',
      description: 'Bí quyết để làm việc suôn sẻ',
    },
  ],
};

// ---------------------------------------------------------------------------
// Phase 9Z-Fix-3 — public (logged-out) variants of the worker / employer
// dropdowns. Manual QA found that the Phase 9S role-aware groups linked
// straight to protected routes (`/worker/schedule`, `/employer/shifts/new`,
// `/employer/dashboard`) for everyone, including logged-out visitors —
// who would then be bounced to `/login` by `RoleGuard`. That makes the
// nav feel like a sales funnel disguised as discovery.
//
// The public variants below preserve the same visible labels but
// remap each item to a public guide page that explains the feature
// without requiring auth. The protected routes still exist and still
// require login when visited directly; only the marketing-time entry
// point changes.
// ---------------------------------------------------------------------------

const WORKER_GROUP_PUBLIC: MenuGroup = {
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
      // Phase 9Z-Fix-4: deep-link to the Lịch cá nhân anchor on
      // /user-guide so logged-out visitors land directly on the
      // feature explanation, not the top of a long generic guide.
      href: '/user-guide#worker-schedule',
      label: 'Lịch cá nhân',
      description: 'Cách tránh trùng lịch khi ứng tuyển',
    },
    {
      href: '/worker/cancellation-policy',
      label: 'Quy định huỷ ca',
      description: 'Các mốc thời gian và hạn mức huỷ ca',
    },
  ],
};

const EMPLOYER_GROUP_PUBLIC: MenuGroup = {
  label: 'Nhà tuyển dụng',
  activePrefixes: ['/employer'],
  items: [
    {
      // Phase 9Z-Fix-4: deep-link to the Đăng ca tuyển anchor on
      // /user-guide so logged-out visitors land directly on the
      // posting-flow explanation.
      href: '/user-guide#employer-post-shift',
      label: 'Đăng ca tuyển',
      description: 'Quy trình tạo ca và giữ tiền ca làm (mô phỏng)',
    },
    {
      href: '/user-guide#employer-applicants',
      label: 'Quản lý ứng viên',
      description: 'Cách duyệt và xác nhận ca làm',
    },
    {
      href: '/employer/payments',
      label: 'Giữ tiền ca làm (mô phỏng)',
      description:
        'Mô phỏng giữ tiền ca để đảm bảo trả công. Trong MVP/demo không có giao dịch thật.',
    },
    {
      href: '/employer/reviews',
      label: 'Đánh giá sau ca',
      description: 'Hướng dẫn chấm điểm người lao động',
    },
  ],
};

// ---------------------------------------------------------------------------
// B4 — supabase/production: CaLẻ chưa thu/giữ tiền, nên ẩn mục điều hướng
// "Giữ tiền ca làm (mô phỏng)" khỏi dropdown nhà tuyển dụng. Local/demo giữ
// nguyên để phục vụ test. Lọc ở lúc render nên các const nhóm + NAV_GROUPS
// (dùng cho test) không đổi.
// ---------------------------------------------------------------------------
function hidePaymentsInSupabase(group: MenuGroup): MenuGroup {
  if (!isSupabaseEnv()) return group;
  return {
    ...group,
    items: group.items.filter((it) => it.href !== '/employer/payments'),
  };
}

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

  // -------------------------------------------------------------------------
  // HEADER-NAV-LAYOUT-3 — pure-CSS adaptive header (no JS collapse).
  //
  // Product decision: the hamburger is for tablet/mobile ONLY. On every
  // desktop/laptop width (>= 1280px / Tailwind `xl`) the horizontal nav
  // MUST be visible — never collapsed to a hamburger just because labels
  // are long. The earlier LAYOUT-2 measured-fit approach violated this
  // (it collapsed the employer nav at 1366/1440/1920), so it is removed.
  //
  // How the nav now fits one row at 1280px without overlap:
  //   1. Shortened employer desktop labels (Đăng ca / Lịch tuyển /
  //      Ca công khai / Hồ sơ) — full labels live in `title` tooltips,
  //      the mobile drawer, and the UserMenu (routes unchanged).
  //   2. Wider header container (`max-w-[1600px]`) so the desktop nav
  //      has more horizontal room than the page's `max-w-7xl` content.
  //   3. Compact nav gap/padding at <= 1536 (`xl:`), normal at `2xl`.
  //   4. A bounded, truncating profile zone (`min-w-0`, name capped).
  //   5. 3-zone grid `[auto_minmax(0,1fr)_auto]` so the center nav track
  //      can shrink (min-w-0) and the side zones never overlap it.
  // Visibility is now driven purely by CSS breakpoints: `hidden xl:flex`
  // for the desktop nav, `xl:hidden` for the hamburger. No measurement,
  // no ResizeObserver, no feedback loops.
  // -------------------------------------------------------------------------

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional close-on-route-change for the nav dropdown; refactor would change navigation dismissal behavior
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
      {/* HEADER-NAV-LAYOUT-3 — pure-CSS 3-zone adaptive header.
          Below `xl` (< 1280px): a simple flex row (brand left, right
          cluster pushed right via `ml-auto`); the hamburger is the
          nav. At `xl+` (>= 1280px, desktop/laptop): a CSS grid with
          `[auto_minmax(0,1fr)_auto]` — logo (auto) | nav (centered,
          shrinkable min-w-0) | right cluster (auto) — so the nav can
          never overlap the side zones and there is no hamburger.
          The container is widened to `max-w-[1600px]` (page content
          stays `max-w-7xl` elsewhere) and the nav uses a compact gap
          at `xl`, upsizing at `2xl`, so the shortened 7-item employer
          nav fits one row from 1280px upward without collapsing. */}
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-4">
        {/* Brand block — LEFT zone */}
        <Link
          href="/"
          className="flex min-w-0 shrink-0 flex-col leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:rounded xl:justify-self-start"
        >
          <img
            src="/images/logo.png"
            alt={t('site.name')}
            className="h-10 m-2 w-auto object-contain"
          />
          {/* Visual-polish pass — bumped from gray-400 (~2.5:1 on the
              white header) to gray-500 (~4.8:1) so the tagline clears
              the WCAG AA 4.5:1 floor (Req 10.1). Purely a color token
              swap; text content is unchanged (Req 12.2). */}
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:block">
            by CaLedo Tech
          </span>
        </Link>

        {/* Desktop nav — CENTER zone. Pure CSS: hidden below `xl`
            (hamburger takes over), inline flex at `xl+`. `min-w-0`
            lets the center track shrink so it never forces the side
            zones to overlap; `justify-self-center` keeps it centered
            within the track. Compact link gap at `xl`, roomier at
            `2xl`. */}
        <nav
          className="hidden min-w-0 items-center justify-center gap-0.5 xl:flex xl:justify-self-center 2xl:gap-1"
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
          {role === 'worker' && currentUser && (
            <WorkerNav pathname={pathname} workerId={currentUser.id} />
          )}
          {role === 'employer' && currentUser && (
            <EmployerNav pathname={pathname} employerId={currentUser.id} />
          )}
          {role === 'admin' && <AdminNav pathname={pathname} />}
        </nav>

        {/* Right cluster — RIGHT zone. `min-w-0` lets the profile name
            truncate instead of pushing the nav; at `xl+` it sits at the
            end of its grid track (`xl:justify-self-end`), cancelling
            the `< xl` flex `ml-auto`. */}
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 xl:ml-0 xl:justify-self-end">
          {isLoggedIn && hasCapability('notifications') && <NotificationBell />}

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
                className="ml-1 inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg bg-orange-500 px-4 text-sm font-semibold text-gray-900 shadow-sm transition-shadow hover:bg-orange-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
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

          {/* Hamburger — `xl:hidden`: visible ONLY below 1280px
              (tablet/mobile). On desktop/laptop the horizontal nav
              above is the canonical navigation. */}
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
        group={WORKER_GROUP_PUBLIC}
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
        group={hidePaymentsInSupabase(EMPLOYER_GROUP_PUBLIC)}
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
    </>
  );
}

function WorkerNav({
  pathname,
  workerId,
}: {
  pathname: string;
  workerId: string;
}) {
  // Phase 10A-Fix-5 — worker profile badge counts only LATEST per-doc
  // verification records in actionable status (Rejected / NeedsMoreInfo).
  // The dashboard nav no longer carries an unread-notification badge
  // since unread notifications belong to the bell, not a nav link.
  const workerDocs = useVerificationStore((s) => s.workerDocuments);
  const profileCount = useMemo(
    // Xác minh chưa có backend ở supabase → không hiện badge giả.
    () => (hasCapability('verifications') ? workerProfileTaskCount(workerId, workerDocs) : 0),
    [workerId, workerDocs],
  );
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
      <NavLink href="/handbook" pathname={pathname}>
        Cẩm nang làm việc
      </NavLink>
      <NavLink
        href="/worker/profile"
        pathname={pathname}
        badgeCount={profileCount}
        badgeAriaLabel={
          profileCount > 0
            ? `${profileCount} tài liệu xác minh cần xử lý`
            : undefined
        }
      >
        {t('nav.profile')}
      </NavLink>
    </>
  );
}

function EmployerNav({
  pathname,
  employerId,
}: {
  pathname: string;
  employerId: string;
}) {
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const dashboardCount = useMemo(() => {
    const ids = new Set(
      shifts.filter((s) => s.employerId === employerId).map((s) => s.id),
    );
    return employerDashboardTaskCount(applications, ids);
  }, [shifts, applications, employerId]);
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink
        href="/employer/shifts/new"
        pathname={pathname}
        title={t('nav.postShift')}
      >
        {t('nav.short.postShift')}
      </NavLink>
      <NavLink
        href="/employer/dashboard"
        pathname={pathname}
        badgeCount={dashboardCount}
        badgeAriaLabel={
          dashboardCount > 0 ? `${dashboardCount} ứng viên cần xử lý` : undefined
        }
      >
        {t('nav.dashboard')}
      </NavLink>
      <NavLink
        href="/employer/schedule"
        pathname={pathname}
        title={t('nav.employerSchedule')}
      >
        {t('nav.short.employerSchedule')}
      </NavLink>
      {/* Phase 10C-Stab-1 Batch 2 P — direct link to the public
          listing so employers can preview how their shifts appear
          to workers. HEADER-NAV-LAYOUT-3 — shortened to "Ca công khai"
          on the desktop nav (full label in the `title` tooltip + the
          mobile drawer) so the 7-item employer nav fits one row at
          >= 1280px without a hamburger. */}
      <NavLink
        href="/shifts"
        pathname={pathname}
        title={t('nav.full.publicShifts')}
      >
        {t('nav.short.publicShifts')}
      </NavLink>
      <NavLink href="/handbook" pathname={pathname}>
        Cẩm nang làm việc
      </NavLink>
      <NavLink
        href="/employer/profile"
        pathname={pathname}
        title={t('nav.full.employerProfile')}
      >
        {t('nav.short.employerProfile')}
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
  // Phase 10A-Fix-4 — surface pending verification queue items as a
  // badge on the admin dashboard nav link so missed notifications
  // don't lead to forgotten reviews.
  const workerDocs = useVerificationStore((s) => s.workerDocuments);
  const employerDocs = useVerificationStore((s) => s.employerDocuments);
  const typeChangeRequests = useVerificationStore(
    (s) => s.typeChangeRequests,
  );
  const verificationCount = useMemo(
    () =>
      hasCapability('verifications')
        ? adminVerificationTaskCount(workerDocs, employerDocs, typeChangeRequests)
        : 0,
    [workerDocs, employerDocs, typeChangeRequests],
  );
  return (
    <>
      <NavLink href="/" pathname={pathname} exact>
        {t('nav.home')}
      </NavLink>
      <NavLink
        href="/admin/dashboard"
        pathname={pathname}
        badgeCount={verificationCount}
        badgeAriaLabel={
          verificationCount > 0
            ? `${verificationCount} mục chờ xác minh`
            : undefined
        }
      >
        Tổng quan admin
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
    // HEADER-NAV-LAYOUT-3 — compact horizontal padding at `xl`
    // (`px-2`) so the full employer nav fits one row at 1280px, with
    // roomier `px-3` from `2xl` (>= 1536px) upward.
    // Visual-polish pass — `min-h-[44px]` guarantees the >=44px touch
    // target (Req 9.1) even though the visible label is shorter, and
    // the focus ring matches the shared Button contract
    // (`ring-orange-400` + `ring-offset-2`) for a uniform 2px orange
    // focus indicator with offset (Req 10.3). Colors already come from
    // the token ramp (orange-*/gray-*), so no hex touches here.
    'whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center 2xl:px-3',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
    active
      ? 'bg-orange-50 text-orange-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  ].join(' ');
}

function NavLink({
  href,
  pathname,
  exact = false,
  badgeCount = 0,
  badgeAriaLabel,
  title,
  children,
}: {
  href: string;
  pathname: string;
  exact?: boolean;
  /**
   * Phase 10A-Fix-4 — render a `<TaskBadge>` on the nav link for
   * "needs your attention" indicators. Hidden when `<= 0`.
   */
  badgeCount?: number;
  badgeAriaLabel?: string;
  /**
   * HEADER-NAV-LAYOUT-3 — optional native tooltip. Set to the FULL
   * label when `children` renders a shortened desktop label so hover
   * still reveals the complete name (e.g. "Danh sách ca công khai").
   */
  title?: string;
  children: ReactNode;
}) {
  // Strip query string from the link's href before computing the active
  // state — admin nav uses `?tab=...` deep links and we want them to
  // match against `pathname` only.
  const targetPath = href.split('?')[0];
  const active = exact
    ? pathname === targetPath
    : isPathActive(pathname, targetPath);
  if (badgeCount > 0) {
    // Wrap in a relative span so the absolutely-positioned badge
    // anchors to the link without breaking the existing flex layout
    // of role-specific nav rows.
    return (
      <span className="relative inline-flex">
        <Link href={href} title={title} className={navLinkClasses(active)}>
          {children}
        </Link>
        <TaskBadge count={badgeCount} ariaLabel={badgeAriaLabel} />
      </span>
    );
  }
  return (
    <Link href={href} title={title} className={navLinkClasses(active)}>
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
            'h-3.5 w-3.5 text-gray-400 transition-transform motion-reduce:transition-none',
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
                  className="flex flex-col rounded-lg px-3 py-2 text-sm transition-colors hover:bg-orange-50 focus:outline-none focus-visible:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
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
