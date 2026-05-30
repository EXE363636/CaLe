# HEADER-NAV-LAYOUT-3 — Adaptive Header (desktop horizontal nav, no hamburger ≥1280px)

**Date:** 2026-05-30
**Status:** Fixed + bounding-box-tested (10 desktop + 5 tablet widths × 3 roles) + screenshot-verified.

## 1. Root cause

The LAYOUT-2 fix used a JS measurement to collapse the desktop nav to a
hamburger when it didn't fit. Because the header content was capped at
`max-w-7xl` (~1216px usable), the employer's 7 **full-length** labels
(~870px) never fit, so the employer was forced into the hamburger on
1366/1440/1920 — unacceptable for desktop UX. The real problem was two
things at once: labels too long **and** the container too narrow.

## 2. Product decision applied

Hamburger is for **tablet/mobile only**. At every desktop/laptop width
**≥ 1280px** the horizontal nav is shown and never collapses. The
hamburger appears **only below 1280px**. Visibility is now pure CSS
(`hidden xl:flex` nav / `xl:hidden` hamburger) — the JS measurement,
ResizeObserver, off-screen measurer, and `forceVisible` collapse path
from LAYOUT-2 were all removed.

## 3. Labels changed (employer desktop nav only)

| Route | Old desktop label | New desktop label | Full label preserved in |
|-------|-------------------|-------------------|--------------------------|
| `/employer/shifts/new` | Đăng ca tuyển | **Đăng ca** | `title` tooltip, drawer, UserMenu |
| `/employer/schedule` | Lịch tuyển dụng | **Lịch tuyển** | `title` tooltip, drawer |
| `/shifts` | Danh sách ca công khai | **Ca công khai** | `title` tooltip (`Danh sách ca công khai`), drawer |
| `/employer/profile` | Hồ sơ doanh nghiệp | **Hồ sơ** | `title` tooltip (`Hồ sơ doanh nghiệp`), drawer |
| `/`, `/employer/dashboard`, `/support` | Trang chủ / Tổng quan / Hỗ trợ | unchanged | — |

Routes unchanged, no nav items removed, full labels available on hover
(`title`) + in the mobile drawer + UserMenu. New i18n keys:
`nav.short.*`, `nav.full.*`, `nav.support`. Worker/admin labels left
as-is (they already fit comfortably).

## 4. Layout strategy

- Header inner: `flex` below `xl`; **CSS grid `[auto_minmax(0,1fr)_auto]`** at `xl+` (logo | nav | profile). The center nav track is `min-w-0` so it can shrink and never forces the side zones to overlap.
- **Widened header container** `max-w-[1600px]` (page content elsewhere stays `max-w-7xl`) so the desktop nav has more room than the article width.
- **Compact spacing**: nav link gap `gap-0.5` at `xl`, `gap-1` at `2xl`; link padding `px-2` at `xl`, `px-3` at `2xl`.
- Profile zone `min-w-0`; name `max-w-[10rem] truncate`; role label `whitespace-nowrap`.

## 5. Breakpoints

- **≥ 1280px (Tailwind `xl`)**: horizontal nav, no hamburger. (`2xl` ≥ 1536px: roomier gap/padding.)
- **< 1280px (tablet/mobile)**: hamburger drawer.

## 6. Files changed

- `src/components/layout/NavBar.tsx` — removed JS-collapse machinery; pure-CSS 3-zone grid; widened container; compact gap/padding; employer short labels + `title` tooltips; `NavLink` gains an optional `title` prop.
- `src/components/layout/MobileNav.tsx` — `forceVisible` prop no longer passed (kept, defaults false); hamburger wrapper stays `xl:hidden`.
- `src/i18n/vi.ts` — added `nav.short.*`, `nav.full.*`, `nav.support` keys (shared keys unchanged).
- `e2e/18-header-nav-centering.spec.ts` — rewritten for LAYOUT-3 (10 desktop widths: nav visible, no hamburger, no overlap, shortened employer labels; 5 tablet widths: hamburger + drawer reachability).

## 7. Screenshot paths

- `qa-exploration/shots/header-adaptive-employer-1366.png`
- `qa-exploration/shots/header-adaptive-employer-1440.png`
- `qa-exploration/shots/header-adaptive-employer-1280.png`
- `qa-exploration/shots/header-adaptive-worker-1366.png`
- `qa-exploration/shots/header-adaptive-admin-1366.png`
- `qa-exploration/shots/header-adaptive-tablet-1024.png`

## 8. Test results

- `npm run test:run`: **408 passed / 408**
- `npm run build`: clean, **28 routes**
- `npm run test:e2e`: **83 passed / 83** (incl. 35 header-layout bounding-box tests)
- `npm run test:time`: **19 passed / 19**

Measured nav↔logo / nav↔profile gaps (all positive ⇒ no overlap), all
roles, every desktop width — full data in `qa-exploration/layout3.json`:

| Role | 1920 | 1536 | 1440 | 1366 | 1280 |
|------|------|------|------|------|------|
| Worker | 299 | 267 | 248 | 211 | 168 |
| **Employer (long name)** | 214 | 182 | 168 | 131 | **88** |
| Admin | 387 | 355 | 321 | 284 | 241 |

Employer renders all 7 links with the shortened labels:
`["Trang chủ","Đăng ca","Tổng quan","Lịch tuyển","Ca công khai","Hồ sơ","Hỗ trợ"]`.

## 9. Confirmation

- **Employer desktop nav is horizontal at 1280 / 1366 / 1440 / 1536 / 1920** (and 1600/1680/2560/3840) — verified, with ≥88px clearance to the profile zone at the tightest width (1280).
- **No hamburger on desktop/laptop** (≥1280px) for any role — `hamburgerVisible=false` at all 10 desktop widths × 3 roles.
- **No overlap** (logo↔nav and nav↔profile gaps all positive) and **no horizontal overflow** at any tested width.
- **Tablet/mobile hamburger still works** — `hamburgerVisible=true`, desktop nav hidden, no overflow, and all employer routes reachable through the drawer at 1024×768 / 768×1024 / 820×1180 / 1024×1366 / 800×1280.
