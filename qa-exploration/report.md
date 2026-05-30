# Exploratory QA Report — QA-Stabilization-Automation Phase 5

**Run date:** 2026-05-30
**Method:** Read-only Playwright probes against the running dev app
(`http://localhost:3000`) using the bundled demo seed data (which
contains legacy / mixed-state shifts). No code was edited during the
read-only exploration pass; the one bug found was fixed afterward and
re-verified.
**Roles walked:** Worker (`an.nguyen@gmail.com`), Employer
(`lien@quanphoha.vn`, long company name "Quán Phở Hà"), Admin
(`admin@cale.vn`).

## Probe scope

wrong shift status · missing buttons · stale UI after actions · wrong
notification/deep-link · wallet/ledger mismatch · duplicate timeline
entries · dispute state not updating · already-applied jobs shown open ·
invalid check-in/out timing · past-shift posting · navbar
overflow/layout · admin dispute visibility.

## Observations (read-only)

| Area | Observation | Result |
|------|-------------|--------|
| Navbar overflow — worker | `scrollWidth − clientWidth` @1440px | **0 px** (OK) |
| Navbar overflow — employer (long name) | same | **0 px** (OK) |
| Navbar overflow — admin | same | **0 px** (OK) |
| Raw i18n keys — worker dashboard | regex scan of DOM text | **none** (OK) |
| Raw i18n keys — admin disputes | regex scan of DOM text | **none** (OK) |
| Terminal shift live controls — shift-001 (Expired) | mark-absent / mark-present buttons | **0 / 0** (OK) |
| Terminal shift live controls — shift-002 (Expired) | same | **0 / 0** (OK) |
| Terminal shift live controls — shift-007 (Completed) | same | **0 / 0** (OK) |
| Terminal shift live controls — shift-009 (Cancelled) | same | **0 / 0** (OK) |
| Terminal shift live controls — shift-010/012 (Completed) | same | **0 / 0** (OK) |
| Applicant parent heading | "Tình trạng đơn" on every employer shift detail | **present** (OK) |
| Admin dispute cards | expandable "Xem chi tiết" cards | **2 present** (OK) |
| Admin disputes | request-more-evidence action | **present** (OK) |
| Duplicate terminal badges | >3× occurrence scan on 6 employer details | **none** (OK) |

## Bugs found

### BUG-1 — Worker shift card shows public "Đang tuyển" instead of personal status (FIXED)

- **Role:** Worker
- **Page URL:** `/shifts`
- **Account:** `an.nguyen@gmail.com` (worker-001)
- **Shift:** "Phục vụ cafe cuối tuần" (shift-004), 30/05/2026 13:00–21:00 — worker has an **Approved** application
- **Steps to reproduce:**
  1. Log in as the worker.
  2. Open Tìm ca làm (`/shifts`).
  3. Find the card for a Published shift the worker has already applied to / been approved on.
- **Expected:** The card's single primary status badge reflects the worker's own application status (e.g. "Đã được duyệt"); the public recruiting status "Đang tuyển" must not be the main label for a shift the worker is already engaged with (Checklist K / old bug class 4).
- **Actual (before fix):** The card's top-right primary badge showed "Đang tuyển" (public recruiting status) while the personal "Đã được duyệt" status only appeared in a secondary pin below — two competing statuses, with the misleading recruiting one as primary.
- **Screenshot:** `qa-exploration/shots/explore-worker-shifts.png`
- **Severity:** Medium
- **Suggested fix:** In `ShiftCard`, when `workerApplicationStatus` is set, render the personal application-status badge as the Row-1 primary badge instead of the public `ShiftStatusBadge`.
- **Status:** **FIXED** — `src/components/shift/ShiftCard.tsx` now swaps the primary badge to the personal status when the worker has an active application. Re-verified read-only: scoped probe reports `cardHasDangTuyen=false`, `cardHasApproved=true`, `cardHasViewDetail=true` (`qa-exploration/probe-card-scoped.json`). Regression test added: `src/components/shift/ShiftCard.test.tsx` (4 cases).

## Result

- **Critical bugs:** 0
- **High bugs:** 0
- **Medium bugs:** 1 found → **fixed + regression-tested + re-verified**
- **Low bugs:** 0

After the fix, a re-run of unit (404/404), build (28 routes), and E2E
(34/34) all pass, and the scoped re-probe confirms the bug is resolved.
No remaining Critical/High/Medium blockers from exploratory QA.


---

## Addendum (2026-05-30) — HEADER-NAV-LAYOUT-2

### BUG-2 — Employer desktop nav overlaps the profile zone (FIXED)

- **Role:** Employer (long company name "Quán Phở Hà …")
- **Page:** any authenticated `/employer/*` page, desktop 1280–1920px
- **Expected:** desktop nav never overlaps logo or notification/profile zone; long name truncates
- **Actual (before fix):** the 7-item employer nav (~870px) overlapped the profile zone by ~164px inside the `max-w-7xl` (~1216px) cap — "Hồ sơ doanh nghiệp" collided with "Quán Phở Hà". The earlier HEADER-NAV-LAYOUT-1 centering passed no-overflow tests but the bounding boxes still overlapped.
- **Severity:** Medium
- **Status:** **FIXED** — adaptive header (measure nav fit; collapse to hamburger when it doesn't fit). Worker/admin keep the inline centered nav (no overlap, ≥89px clearance); employer collapses to the hamburger (all links reachable via drawer + UserMenu). Verified by 19 bounding-box E2E tests in `e2e/18-header-nav-centering.spec.ts` and screenshots in `qa-exploration/shots/header-layout-*.png`. Full detail in `qa-exploration/header-nav-layout-2-report.md`.

### Updated validation after the header fix

- Unit **408/408**, build **28 routes**, E2E **67/67**, time-travel **19/19**, npm audit **2 moderate (deferred)**.
- Exploratory: **0 Critical, 0 High open.** Two Medium bugs found across the QA-SYSTEM work, both fixed + regression-tested + re-verified.
