# HEADER-NAV-LAYOUT-2 — Adaptive Desktop Header Fix

**Date:** 2026-05-30
**Status:** Fixed + bounding-box-tested + screenshot-verified.

## 1. Root cause

The header content is capped at `max-w-7xl` (1280px → ~1216px usable
after padding) at **every** viewport ≥ 1280px. Measured intrinsic
zone widths:

| Role | Logo | Nav | Profile (long name) | Sum + gaps |
|------|------|-----|---------------------|------------|
| Worker | 100 | 541 | 249 | fits (~890) |
| Admin | 100 | 305 | 309 | fits (~714) |
| **Employer** | 100 | **870** | **337** | **~1307 → ~91px over** |

The previous HEADER-NAV-LAYOUT-1 fix used a `[1fr_auto_1fr]` grid that
**mathematically centered** the nav but reserved no guaranteed space
for the right zone, so the 7-item employer nav (~870px) spilled
**~164px into the profile zone** ("Hồ sơ doanh nghiệp" colliding with
"Quán Phở Hà"). The no-overflow tests passed because the document root
clamps overflow — they never measured nav↔profile overlap.

## 2. Layout strategy

Adaptive, content-aware header that guarantees non-overlap:

- **3-zone CSS grid** `xl:grid-cols-[1fr_auto_1fr]` (equal side tracks
  → nav centered) at `xl+`; plain flex row below `xl`.
- **JS fit measurement**: an always-present, off-screen (`invisible
  absolute`) measurement clone of the active nav reports the true
  intrinsic nav width (never latches at 0 the way a `display:none`
  visible nav would). On mount + every container resize, the component
  checks `logo + nav + right + gaps ≤ availableContentWidth` (with the
  container's own padding subtracted — the ~64px correction the first
  attempt missed).
- **When the nav fits** (worker, admin): render the inline centered
  nav; the hamburger is hidden at `xl`.
- **When it doesn't fit** (employer): collapse the inline nav and force
  the hamburger visible at `xl`. The hamburger drawer + the profile
  `UserMenu` already list every role page, so nothing is hidden without
  an accessible menu. Grid tracks never overlap by construction.
- **Loop-safety**: the right zone is NOT observed for resize (its width
  changes as a side-effect of the collapse decision), and a
  `prev === fits` guard prevents redundant state churn. The profile
  name keeps `min-w-0 max-w-[10rem] truncate`; the role label is
  `whitespace-nowrap`.

No motion/GSAP, no route changes, no business-logic changes.

## 3. Breakpoints used

- `< xl` (< 1280px): hamburger (existing design, unchanged).
- `≥ xl` (≥ 1280px): inline nav **iff** the fit measurement says it fits
  for that role; otherwise hamburger. The decision is content-driven,
  not a fixed pixel breakpoint, because the `max-w-7xl` cap makes the
  fit constant per role across 1280–1920.

## 4. Full nav vs compact per viewport (measured)

| Role | 1920 | 1536 | 1440 | 1366 | 1280 | 1024 |
|------|------|------|------|------|------|------|
| Worker | full | full | full | full | full | hamburger |
| Admin | full | full | full | full | full | hamburger |
| Employer (long name) | hamburger | hamburger | hamburger | hamburger | hamburger | hamburger |

Measured nav↔profile / nav↔logo gaps when the nav is shown (no overlap;
all ≥ 16px): Worker navRightGap **+89**, logoNavGap **+238**; Admin
navRightGap **+147**, logoNavGap **+355**. Employer: nav collapsed, so
zero overlap at every width.

## 5. Files changed

- `src/components/layout/NavBar.tsx` — 3-zone grid + adaptive fit
  measurement (off-screen measurer, ResizeObserver, collapse logic),
  pass `forceVisible` to MobileNav.
- `src/components/layout/MobileNav.tsx` — `forceVisible` prop so the
  hamburger can show at `xl+` when the desktop nav doesn't fit.
- `src/components/layout/UserMenu.tsx` — `whitespace-nowrap` on the role
  label (kept from LAYOUT-1; name already truncates).
- `e2e/18-header-nav-centering.spec.ts` — rewritten to assert **real
  bounding boxes** (no overlap, no overflow, header height, link
  reachability) across 6 widths × 3 roles + drawer-reachability.

## 6. Test results

- `npm run test:run`: **408 passed / 408**
- `npm run build`: clean, **28 routes**
- `npm run test:e2e`: **67 passed / 67** (includes 19 header layout
  bounding-box tests)
- `npm run test:time`: **19 passed / 19**

## 7. Screenshot paths (post-fix)

- `qa-exploration/shots/header-layout-employer-1366.png`
- `qa-exploration/shots/header-layout-employer-1440.png`
- `qa-exploration/shots/header-layout-employer-1920.png`
- `qa-exploration/shots/header-layout-employer-1024.png`
- `qa-exploration/shots/header-layout-admin-1366.png`
- `qa-exploration/shots/header-layout-worker-1366.png`

Quantitative gap data: `qa-exploration/overlap-clean5.log` (final run).

## 8. Confirmation

Nav/profile overlap is **gone** at every tested width for every role,
verified by bounding-box measurement (not just center drift):
- Worker/admin: inline nav with ≥ 89px clearance to the profile zone.
- Employer (long name): nav collapses to the hamburger, so the profile
  zone has the full right side to itself — no collision.
- No horizontal overflow at any width; header height stable (one row).
