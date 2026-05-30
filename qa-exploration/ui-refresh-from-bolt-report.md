# UI-REFRESH-FROM-BOLT-REFERENCE-1 — Report

**Date:** 2026-05-31
**App:** CaLẻ / Now (localStorage-only Next.js 16 MVP).
**Reference repo:** https://github.com/VuAnh05/Web.git (Bolt-generated
UI, **inspection only** — cloned to `design-reference/bolt-ui/`, gitignored,
NOT merged into the app).
**Scope of this pass:** Part 1 (inspect) + Part 2 (plan) + Batch 1 of the
shared design system. Per the task's "do not do one giant risky edit"
rule, per-page worker/employer/admin refreshes (Batches 2–4) are planned
but gated on review — see §9.

---

## 1. Bolt repo inspection summary

**Stack:** Vite 5 + React 18 + react-router-dom 6 + TypeScript 5 +
Tailwind **v3** (with a `tailwind.config.js`). Extra deps: `framer-motion`
(animations), `lucide-react` (icons), `clsx`, `date-fns`. It is a
**separate demo app** with its own mock data + context — NOT our product
logic.

**Stack differences vs our app:**

| | Bolt reference | CaLẻ / Now (current) |
|---|---|---|
| Build | Vite + react-router | Next.js 16 App Router |
| Tailwind | v3 + JS config | v4 + CSS `@theme`/`@utility` (no config file) |
| Animation | framer-motion | CSS keyframes (globals.css) |
| Icons | lucide-react | inline SVG |
| State | React Context + mockData | Zustand + localStorage |

**Visual patterns worth adopting (and adopted in Batch 1):**
- Layered, soft card shadow tokens (`shadow-card`, `shadow-card-hover`,
  `shadow-modal`) — cleaner depth than our flat `shadow-sm`/`shadow-2xl`.
- `StatCard` composition: label + large value + tinted icon chip.
- `PageHeader` / `SectionHeader` layout (title+subtitle left, actions
  right, stacks on mobile).
- `rounded-2xl` everywhere, warm-orange primary, cream background, soft
  hover lift — which our app *already* matches (Phase 9 polish).

**Patterns deliberately NOT copied:**
- **framer-motion** — would add a runtime dependency; our CSS keyframes
  already cover entrance/lift/scale. (Bolt's `StatCard` count-up and
  `Modal` spring were re-implemented as CSS or dropped.)
- **react-router / Vite structure** — incompatible with Next App Router;
  would mean rewriting routing.
- **lucide-react** — our app uses inline SVG; adding an icon lib for
  parity isn't worth the dep.
- **Heavy decorative effects** from Bolt's `index.css` (3D tilt,
  neon-border, particle/bubble/sparkle, animated gradient text,
  glass-morphism) — too flashy for a labor marketplace and the task
  explicitly says "tasteful motion only, not too flashy".
- **Bolt business logic / mock data / context** — our domain + stores
  remain the single source of truth.

**Dependency differences:** Bolt pulls in 4 runtime deps we don't have
(framer-motion, lucide-react, clsx, date-fns). **None were installed** —
no `package.json` change.

**Risk assessment:** LOW for Batch 1 (additive primitives + token swaps
on shared `Card`/`Modal`). The colour palette is essentially identical
to ours, so adopting the design language is low-friction. The only build
gotcha encountered: the cloned reference folder was being type-checked by
our `tsconfig` (`**/*.tsx` glob) and failed on its `react-router-dom`
import — fixed by adding `design-reference` to tsconfig `exclude` and
gitignoring the folder.

---

## 2. What visual ideas were adopted (Batch 1)

1. **Refined shadow system** — added Bolt's `shadow-card`,
   `shadow-card-hover`, `shadow-modal` as Tailwind v4 `@utility` classes
   in `globals.css`. The shared `Card` now uses `shadow-card` (+
   `shadow-card-hover` on hover) instead of `shadow-sm`/`shadow-md`; the
   `Modal` panel uses `shadow-modal` instead of `shadow-2xl`. This softens
   and layers elevation app-wide in one change — every card and modal
   benefits with zero per-page edits.
2. **New shared primitives** (additive, exported from `@/components/ui`):
   - `PageShell` — standard max-width/gutter/padding container (Bolt
     `AppShell` main).
   - `SectionHeader` — title+subtitle+actions row (Bolt `PageHeader`).
   - `StatCard` + `MetricGrid` — Bolt stat-card look (label / big value /
     tinted icon chip), CSS-only, tones mapped to our semantic palette.
3. **CSS entrance utilities** `animate-scale-in` / `animate-slide-up`
   (from Bolt's keyframes), reduced-motion-safe, available for future
   per-page use.

These primitives are ready for Batches 2–4 to adopt page-by-page without
re-deriving styling.

## 3. What was not copied and why
See §1 "deliberately NOT copied". Headline: no framer-motion, no
react-router, no icon lib, no flashy effects, no Bolt logic/data — to
protect the dependency surface, the Next.js architecture, and
CORE-STABILITY-10.

## 4. Files changed (Batch 1)
- `src/app/globals.css` — added `shadow-card` / `shadow-card-hover` /
  `shadow-modal` `@utility` tokens + `animate-scale-in` /
  `animate-slide-up` keyframes (reduced-motion-safe).
- `src/components/ui/Card.tsx` — `shadow-sm`→`shadow-card`,
  hover `shadow-md`→`shadow-card-hover`. No prop/API change.
- `src/components/ui/Modal.tsx` — panel `shadow-2xl`→`shadow-modal`. No
  behaviour change (portal, focus trap, Escape, scroll lock intact).
- `src/components/ui/PageShell.tsx` (NEW), `SectionHeader.tsx` (NEW),
  `StatCard.tsx` (NEW — also exports `MetricGrid`).
- `src/components/ui/index.ts` — export the new primitives.
- `tsconfig.json` — `exclude` now lists `design-reference` (keep the
  reference clone out of our type-check/build).
- `.gitignore` — ignore `/design-reference/`.

No route added/removed. No store/domain/test file changed. No Vietnamese
copy changed. No test selector changed.

## 5. Pages/components refreshed
- **Shared design system (Batch 1):** Card + Modal elevation refined
  app-wide; new PageShell/SectionHeader/StatCard/MetricGrid primitives
  available. Because Card/Modal are used everywhere, every dashboard,
  detail page, list, and modal already shows the softer elevation.
- Per-page composition refreshes (worker/employer/admin pages, wallet +
  reputation modals) are **planned, not yet applied** — see §9.

## 6. Core logic preservation checklist
| Invariant | Status |
|---|---|
| `getShiftLifecycleState` single source of truth | ✅ untouched |
| `ShiftLifecycleBadge` everywhere | ✅ untouched |
| Check-in / mark-present do NOT start shift early | ✅ untouched |
| Checkout only after shift end | ✅ untouched |
| Attendance state machine + role-aware copy | ✅ untouched |
| Employer present/absent buttons | ✅ untouched |
| Draft not a real shift | ✅ untouched |
| Wallet / ledger / deposit / refund | ✅ untouched |
| Notifications + deeplink + same-route intent | ✅ untouched |
| Reviews sort/report | ✅ untouched |
| Skill progression + availability suggestions | ✅ untouched |
| Vietnamese copy | ✅ unchanged |
| 28-route invariant | ✅ still 28 |

## 7. Test results
- `npm run test:run`: **544 passed / 544**.
- `npm run build`: **clean, 28 routes**.
- `npm run test:e2e` (chromium): **112 passing** — one run showed 111/112
  with a single flaky failure in `e2e/20-core-stability-6.spec.ts` Part 1
  (UserMenu hover + 1600ms flash-ring timing race under parallel load);
  re-running that spec in isolation passed **8/8**. Not a regression from
  this pass (no logic/selector changed). Logs:
  `qa-exploration/e2e-ui-refresh-batch1.log`, `e2e-cs6-recheck.log`.
- `npm run test:time`: **22 passed / 22**.
- `npm audit`: **2 moderate** (postcss via next) — pre-existing, no deps
  added.

## 8. Visual QA screenshot paths (1366×768, after Batch 1)
- `qa-exploration/shots/ui-refresh-home.png`
- `qa-exploration/shots/ui-refresh-worker-dashboard.png`
- `qa-exploration/shots/ui-refresh-worker-profile.png`
- `qa-exploration/shots/ui-refresh-employer-dashboard.png`
- `qa-exploration/shots/ui-refresh-employer-shift-detail.png`
- `qa-exploration/shots/ui-refresh-admin-dashboard.png`

## 9. Remaining visual issues / planned batches (NOT yet done)
The app was already Phase-9-polished, so the headline visual gaps the
task lists are mostly already addressed. The remaining, lower-risk
opportunities — to be done as reviewed batches, each followed by
test+build+E2E:

- **Batch 2 (worker pages):** adopt `StatCard`/`MetricGrid` on the worker
  dashboard tiles; widen the reputation modal to a 2-column
  summary+history grid on desktop; lay the worker profile skill section
  out as a grid (not narrow sidebar).
- **Batch 3 (employer pages):** stronger active-shift/pending-applicant
  cards via shared primitives; multi-section create-shift form polish.
- **Batch 4 (admin + modals):** admin metric cards via `StatCard`;
  wallet transaction-row + notification-item visual refinement.
- **Batch 5:** wide-viewport visual QA at 1920/1536/1440/1366/1280/1024
  + overflow checks.

Each batch is visual-only and must keep the §6 invariants. None require
new dependencies.

## 10. Manual QA readiness verdict
**Ready (for Batch 1).** Current app logic is fully intact, all tests
pass (E2E flake confirmed non-regression), no route lost, no feature
removed, lifecycle/attendance/checkout untouched, homepage present, and
the UI is visibly refined (softer layered card/modal elevation app-wide)
with no narrowing of desktop layouts. Batches 2–5 remain available as
reviewed follow-ups.

---

# Batch 2 — Worker pages

**Date:** 2026-06-01
**Scope:** Apply the Batch 1 design system to the worker-facing pages
(dashboard, profile, reputation modal, job list, schedule, shift detail).
Visual-only — no logic, route, copy, selector, or dependency changes.

## B2.1 Files changed
- `src/app/worker/profile/page.tsx` — widened `max-w-3xl` →
  `PageShell width="6xl"`; added a warm-gradient header card
  (avatar + name + `ReputationBadge`) on `shadow-card`; **moved the skill
  section out of the narrow right sidebar into a full-width responsive
  grid** (`grid sm:grid-cols-2 lg:grid-cols-3`) below the 2-column body,
  using `SectionHeader`. The lg:grid-cols-3 info+sidebar layout, all
  subcomponents (BasicInfoCard, RatingsHistory,
  WorkerIdentityVerificationCard, StatRow), and `buildSkillDisplayList`
  (0-XP default skill cards) are preserved.
- `src/app/worker/dashboard/page.tsx` — **reputation modal** widened to
  `max-w-4xl` and restructured into a desktop 2-column grid (left =
  summary + rules + stat grid, right = scrollable history
  `max-h-[22rem] overflow-y-auto`), collapsing to one column on
  mobile/tablet. Welcome header + `StatTile` cards upgraded from
  `shadow-sm`/`shadow-md` to the design-system `shadow-card` /
  `shadow-card-hover`. The local `StatTile` was kept (not swapped to the
  shared `StatCard`) because its intentional Phase-9Z decisions —
  top-accent colour bar, dropped per-tile icons, "Xem chi tiết →" hover
  hint — are feature-complete; only the elevation token changed.
- `src/app/shifts/page.tsx` (worker job list) — wrapper standardised to
  `PageShell width="7xl"`; gradient hero + unified filter card upgraded to
  `shadow-card`. The availability sort toggle ("Phù hợp lịch rảnh"), the
  match-pill props, and the already-applied `workerApplicationStatus`
  distinction on `ShiftCard` are untouched.
- `src/app/worker/schedule/page.tsx` — header + calendar body panel
  upgraded to `shadow-card`. The "Thêm lịch trình" button, the
  Lịch rảnh / Lịch bận kind toggle, the slot-config `<details>`,
  CalendarShell/legend, and the shift-overlap guard are untouched.
- `src/app/shifts/[id]/page.tsx` (worker shift detail) — apply-section
  card upgraded to `shadow-card`. Kept the `max-w-3xl` reading width
  (correct for a single-column detail page). `ShiftLifecycleBadge`,
  attendance copy, checkout/dispute/absent-dispute flows untouched.

No new files. No route added/removed (still 28). No store/domain/test
file changed. No Vietnamese copy changed. No test selector changed. No
dependency added.

## B2.2 Bolt ideas adopted in this batch
- Bolt `StatCard` tinted layered elevation → applied via the shared
  `shadow-card`/`shadow-card-hover` tokens on dashboard tiles and the
  welcome header.
- Bolt `PageHeader`/`AppShell` composition → `PageShell` +
  `SectionHeader` adopted on profile and job-list so desktop uses the
  full width band consistently.
- Bolt dashboard "wide modal with summary + grid" → reputation modal is
  now a 2-column desktop layout instead of a tall narrow single column.

## B2.3 Logic preservation checklist (Batch 2)
| Invariant | Status |
|---|---|
| `getShiftLifecycleState` single source of truth | ✅ untouched |
| `ShiftLifecycleBadge` (dashboard upcoming card, shift detail, ShiftCard) | ✅ untouched |
| `canCheckIn` / `canCheckOut` gates (checkout only after end + checkInAt) | ✅ untouched |
| `UpcomingShiftCard` lifecycle-badge suppression while plain `Published` | ✅ untouched |
| Attendance state machine + worker-perspective copy | ✅ untouched |
| Worker dispute / absent-dispute / response flows | ✅ untouched |
| Applied/approved distinct from open jobs (`workerApplicationStatus`) | ✅ untouched |
| Availability sort + match labels | ✅ untouched |
| Schedule add button + busy/available toggle + overlap guard | ✅ untouched |
| Skill progression visible (incl. 0-XP defaults) | ✅ untouched |
| Wallet preview / ledger deeplink (`walletLedgerSignal`) | ✅ untouched |
| Notifications + same-route intent (`useDashboardModalEvents`) | ✅ untouched |
| Vietnamese copy | ✅ unchanged |
| 28-route invariant | ✅ still 28 |

## B2.4 Test results (Batch 2)
- `npm run test:run`: **544 passed / 544**.
- `npm run build`: **clean, 28 routes**.
- `npm run test:e2e` (chromium): **112 passed / 112** (the
  previously-flaky `20-core-stability-6` Part 1 passed this run).
- `npm run test:time`: **22 passed / 22**.
- Diagnostics on all 4 edited page files: **none**.

## B2.5 Screenshot paths (1366×768)
- `qa-exploration/shots/ui-refresh-batch2-worker-dashboard.png`
- `qa-exploration/shots/ui-refresh-batch2-reputation-modal.png`
- `qa-exploration/shots/ui-refresh-batch2-worker-profile.png`
- `qa-exploration/shots/ui-refresh-batch2-worker-job-list.png`
- `qa-exploration/shots/ui-refresh-batch2-worker-schedule.png`

## B2.6 Remaining issues / readiness
No regressions found. Worker pages now use the design-system elevation
and full-width containers; the reputation modal and profile are no longer
narrow on desktop. **Ready for Batch 3 (Employer pages).**

---

# Batch 3 — Employer pages

**Date:** 2026-06-01
**Scope:** Apply the Batch 1 design system to the employer-facing pages
(dashboard, create-shift, shift detail, schedule, profile). Visual-only —
no logic, route, copy, selector, or dependency changes.

## B3.1 Files changed
- `src/app/employer/dashboard/page.tsx` — welcome header + the six
  `StatTile` cards upgraded from `shadow-sm`/`shadow-md` to the
  design-system `shadow-card` / `shadow-card-hover`. The local `StatTile`
  (top-accent bar, "Xem chi tiết →" hover hint, dropped icons) was kept,
  not swapped to the shared `StatCard`, for the same Phase-9Z reasons as
  the worker dashboard. All six stat detail modals, the wallet panel, the
  active-shift / pending-application sections, and the
  notification/deeplink/same-route intent logic
  (`useDashboardModalEvents`, `useModalFromQuery`) are untouched.
- `src/components/forms/ShiftForm.tsx` — introduced a presentational
  `FormSection` wrapper (heading on a `shadow-card` surface) and grouped
  the form into **Thông tin ca làm** (title / job type / custom name /
  location / date / start / end / wage / positions) and **Mô tả và yêu
  cầu** (description / requirements / workplace-imagery + on-site contact
  block / evidence picker). The deposit total, deposit button, submit
  ("Đăng ca cần tuyển"), and "Lưu nháp" stay below the sections. **Every
  field label, the `#shift-hourly-wage` id, all validation, the
  evidence-rank high-risk gate, the wage-acknowledgement gate, the custom
  job-type rule, and `onValuesChange`/`onSaveDraft` callbacks are
  unchanged** — the E2E specs that fill the form by label and click
  "Đăng ca cần tuyển" / "Lưu nháp" all still pass.
- `src/app/employer/shifts/new/page.tsx` — page wrapper widened
  `max-w-2xl` → `max-w-3xl` so the multi-section cards breathe; the
  readiness checklist, trust explainer, and deposit-confirm cards
  upgraded to `shadow-card`. The insufficient-balance modal, top-up
  modal, draft save/restore/delete, repost-from banner, and posting
  readiness gate are untouched.
- `src/app/employer/shifts/[id]/page.tsx` — applicant **bucket sections**
  now render on a `rounded-2xl bg-gray-50/60 shadow-card` panel with a
  bordered header and the count shown as a pill chip (was a plain
  `(n)`), so the lifecycle groups (Chờ duyệt / Đã duyệt / …) read as
  distinct blocks. The `#applicant-bucket-{bucket}` ids (used by E2E),
  `WorkerSummaryRow`, all action buttons (Duyệt / Từ chối / Đánh dấu có
  mặt / Đánh dấu vắng mặt / Xem hồ sơ / Khiếu nại / cancellation
  approve-reject), `ShiftLifecycleBadge`, dispute panels, and
  employer-perspective copy are untouched.
- `src/app/employer/schedule/page.tsx` — header + calendar body panel
  upgraded to `shadow-card`. Draft-exclusion (`status !== 'Draft'`),
  `LIFECYCLE_VARIANT` colour mapping, `ShiftLifecycleBadge` +
  `EscrowStatusBadge` status chips, and applicant-count subtitle are
  untouched.
- `src/app/employer/profile/page.tsx` — wrapper widened `max-w-2xl` →
  `PageShell width="4xl"` so the desktop layout isn't cramped. The
  business-info card, verification card (type picker / locked display /
  doc submission / type-change modal), the understaffed-policy card
  ("Chính sách khi không đủ người"), and worker-feedback list are
  untouched.
- `src/i18n/vi.ts` — added three section-heading keys
  (`shiftForm.section.basics` = "Thông tin ca làm",
  `shiftForm.section.details` = "Mô tả và yêu cầu",
  `shiftForm.section.deposit` = "Đặt cọc"). No existing copy changed.

No new files. No route added/removed (still 28). No store/domain/test
file changed. No dependency added.

## B3.2 Bolt ideas adopted in this batch
- Bolt `StatCard` layered elevation → `shadow-card`/`shadow-card-hover`
  on the employer dashboard tiles + welcome header.
- Bolt `CreateShiftPage` multi-section card layout → the create-shift
  form is now grouped into titled `FormSection` cards instead of one
  flat field list.
- Bolt `PageHeader`/`AppShell` width discipline → `PageShell width="4xl"`
  on the employer profile so the desktop layout uses the width band.
- Bolt card grouping → applicant buckets on the shift-detail page read as
  distinct panels with pill counts.

## B3.3 Logic preservation checklist (Batch 3)
| Invariant | Status |
|---|---|
| `getShiftLifecycleState` single source of truth | ✅ untouched |
| `ShiftLifecycleBadge` (dashboard cards, schedule, shift detail) | ✅ untouched |
| `EscrowStatusBadge` everywhere | ✅ untouched |
| Attendance gates (`canEmployerMarkPresent` / `canEmployerMarkAbsent` / `shouldMarkNoShow`) | ✅ untouched |
| Applicant action buttons (Duyệt/Từ chối/Có mặt/Vắng mặt/Xem hồ sơ/Khiếu nại) | ✅ untouched |
| Employer-perspective attendance + dispute copy | ✅ untouched |
| Draft not a real shift (excluded from dashboard + schedule) | ✅ untouched |
| Draft save / restore / delete on create-shift | ✅ untouched |
| Insufficient-balance modal + top-up path | ✅ untouched |
| Posting readiness gate + deposit ratio | ✅ untouched |
| Employer cancellation penalty + worker protection | ✅ untouched |
| Wallet / ledger / payments-summary modal | ✅ untouched |
| Notifications + deeplink + same-route intent | ✅ untouched |
| Understaffed policy ("Chính sách khi không đủ người") visible | ✅ untouched |
| ShiftForm field labels + `#shift-hourly-wage` id (E2E selectors) | ✅ unchanged |
| `#applicant-bucket-{bucket}` ids (E2E selectors) | ✅ unchanged |
| Vietnamese copy | ✅ unchanged (3 additive section keys only) |
| 28-route invariant | ✅ still 28 |

## B3.4 Test results (Batch 3)
- `npm run test:run`: **544 passed / 544**.
- `npm run build`: **clean, 28 routes**.
- `npm run test:e2e` (chromium): **112 passed / 112** — including the
  employer draft (`22-core-stability-8`), insufficient-deposit
  (`20-core-stability-6` Part 4, `21-core-stability-7`), applicant-bucket
  (`01-apply-approve`, `13-dispute-invariant`), and header-nav
  responsive specs at 1280–3840px.
- `npm run test:time`: **22 passed / 22**.
- Diagnostics on all 7 edited files: **none**.

## B3.5 Screenshot paths (1440×900)
- `qa-exploration/shots/ui-refresh-batch3-employer-dashboard.png`
- `qa-exploration/shots/ui-refresh-batch3-employer-create-shift.png`
- `qa-exploration/shots/ui-refresh-batch3-employer-shift-detail.png`
- `qa-exploration/shots/ui-refresh-batch3-employer-schedule.png`
- `qa-exploration/shots/ui-refresh-batch3-employer-profile.png`

## B3.6 Remaining issues / readiness
No regressions found. Employer pages now use the design-system elevation,
the create-shift form reads as structured sections, the employer profile
uses the full desktop width, and applicant buckets are visually distinct.
The header-nav responsive specs confirm no horizontal overflow at
1280–1920px. **Ready for Batch 4 (Admin + Modals).**

---

# Batch 4 — Admin pages + shared modals

**Date:** 2026-06-01
**Scope:** Apply the Batch 1 design system to the admin dashboard (all
tabs) and the shared modal/notification surfaces. Visual-only — no logic,
route, copy, selector, or dependency changes.

## B4.1 Files changed
- `src/app/admin/dashboard/page.tsx`
  - Header strip upgraded `shadow-sm` → `shadow-card`.
  - Local analytics `StatCard` upgraded: `shadow-card`/`shadow-card-hover`,
    larger value (`text-2xl font-bold`), uppercase tracked label — matching
    the worker/employer dashboard tile language. The `highlight` red
    treatment, `onClick` jump-to-tab behaviour, and "Xem chi tiết →" hover
    hint are unchanged.
  - **Admin dispute card** (`DisputeRow`): added a status-toned left
    accent (`border-l-4` amber = open, emerald = released, gray =
    refunded) so the queue is easy to scan, and surfaced the **amount
    held** (`shift.depositAmount`) inline in the collapsed view via a new
    `admin.dispute.amountHeld` label. The "Xem chi tiết / Thu gọn" toggle
    text (E2E selector in `14-status-wallet-admin`), the expand panel
    (shift title / worker / employer / initiator / category / reason /
    evidence / timestamps / responses), and **all admin actions**
    (resolve → release/refund, request-more-evidence) are unchanged.
  - **Reported reviews card**: each report row is now a `rounded-xl`
    panel with a header row (reason + an "Open" status badge) and clearer
    spacing. Report reason, reporter, target review (stars + comment),
    timestamp, and the Reviewed / Dismissed actions are all still visible.
    **No review is deleted** — `resolve(id, 'Reviewed'|'Dismissed')` is
    unchanged.
  - Snapshot dev utility section upgraded `shadow-sm` → `shadow-card`.
  - Users tab, Shifts tab, and the verification queue already use the
    shared `Card` (which got `shadow-card` in Batch 1), so they inherit
    the refined elevation with no per-row edits.
- `src/components/wallet/WalletPanel.tsx`
  - `LedgerRow` rebuilt as a two-column row: kind + timestamp + note on
    the left, the signed amount right-aligned with `tabular-nums`.
    Positive amounts stay emerald, negative rose (unchanged
    `entryToneClass`).
  - The transaction-history modal widened to `max-w-xl` (was the default
    `max-w-lg`) and still scrolls long ledgers (`max-h-[60vh]
    overflow-y-auto`). The `?modal=wallet` deeplink (`openLedgerSignal`),
    top-up, and withdraw flows are unchanged.
- `src/components/layout/NotificationBell.tsx`
  - Dropdown widened (`w-80` → `sm:w-96`) with `max-w-[calc(100vw-1.5rem)]`
    so it never overflows on small screens, and upgraded to `shadow-modal`.
    The unread dot, unread `bg-orange-50` row tint, timestamp
    (`formatLogDateTime`), and `handleNotificationClick` deeplink wiring
    are all unchanged.
- `src/i18n/vi.ts` — added one key (`admin.dispute.amountHeld` = "Tiền cọc
  đang giữ"). No existing copy changed.

**Modals reviewed, no change needed:** the shared `Modal` primitive
already portals to `document.body`, scrolls tall content
(`fixed inset-0 overflow-y-auto` + flex centering), accepts a `className`
width override, and uses `shadow-modal` (Batch 1). The `DisputeDialog`,
`DisputeResponseDialog`, top-up / withdraw modals, insufficient-balance
modal, and reputation modal (widened in Batch 2) all consume that
primitive, so they already have desktop-friendly width + scroll + mobile
single-column behaviour. Validation and buttons untouched.

No new files. No route added/removed (still 28). No store/domain/test
file changed. No dependency added.

## B4.2 Admin pages refreshed
- Admin dashboard header + analytics stat cards (overview metrics).
- Admin dispute queue (status-accented cards + amount-held).
- Admin reported-reviews card.
- Admin users / shifts / verification-queue tabs (inherit `shadow-card`).

## B4.3 Modals refreshed
- Wallet transaction-history modal (wider, cleaner rows).
- Notification dropdown panel (wider, softer elevation, no overflow).
- (DisputeDialog / top-up / withdraw / insufficient-balance / reputation
  modals already desktop-friendly via the shared `Modal` primitive.)

## B4.4 Bolt ideas adopted in this batch
- Bolt `StatCard` language → admin analytics tiles now match the
  worker/employer tile look (big value, tracked label, layered shadow).
- Bolt card grouping + status accent → admin dispute cards use a
  status-toned left border so the queue scans quickly.
- Bolt layered elevation (`shadow-card` / `shadow-modal`) → admin header,
  snapshot utility, notification dropdown.
- Bolt "clean transaction row" → wallet ledger rows align the amount on
  the right with tabular figures.

## B4.5 Logic preservation checklist (Batch 4)
| Invariant | Status |
|---|---|
| `getShiftLifecycleState` / `ShiftLifecycleBadge` | ✅ untouched |
| Attendance / checkout / draft logic | ✅ untouched |
| Admin dispute resolve (release / refund) + request-more-evidence | ✅ untouched |
| Admin dispute expand toggle ("Xem chi tiết / Thu gọn") E2E selector | ✅ unchanged |
| Reported reviews resolve (Reviewed / Dismissed); no review deleted | ✅ untouched |
| Admin user suspend / reactivate / reputation-adjust | ✅ untouched |
| Verification queue approve / reject / needs-more-info | ✅ untouched |
| Notification timestamp + unread state + deeplink (`handleNotificationClick`) | ✅ untouched |
| Wallet ledger deeplink (`?modal=wallet` / `openLedgerSignal`) | ✅ untouched |
| Wallet top-up / withdraw / insufficient-balance flows | ✅ untouched |
| Modal portal / focus trap / Escape / scroll lock / validation | ✅ untouched |
| Same-route intent (`useDashboardModalEvents`) | ✅ untouched |
| Vietnamese copy | ✅ unchanged (1 additive key only) |
| 28-route invariant | ✅ still 28 |

## B4.6 Test results (Batch 4)
- `npm run test:run`: **544 passed / 544**.
- `npm run build`: **clean, 28 routes**.
- `npm run test:e2e` (chromium): **112 passed / 112** — including admin
  dispute badge + expandable detail (`14-status-wallet-admin` H10/H11),
  dispute resolve (`13-dispute-invariant` H1/H2), admin same-route intent
  (`19-intent-deeplink`), wallet top-up deeplink (`21-core-stability-7`),
  and admin nav responsive specs at 1280–3840px (`18-header-nav-centering`,
  `16-wallet-topup-navbar`).
- `npm run test:time`: **22 passed / 22**.
- Diagnostics on all edited files: **none**.

## B4.7 Screenshot paths (1440×900)
- `qa-exploration/shots/ui-refresh-batch4-admin-dashboard.png`
- `qa-exploration/shots/ui-refresh-batch4-admin-disputes.png`
- `qa-exploration/shots/ui-refresh-batch4-admin-users.png`
- `qa-exploration/shots/ui-refresh-batch4-notifications.png`
- `qa-exploration/shots/ui-refresh-batch4-wallet-modal.png`
- `qa-exploration/shots/ui-refresh-batch4-dispute-modal.png`

## B4.8 Remaining issues / readiness
No regressions found. Admin overview/dispute/review surfaces are clearer
and easier to scan; the dispute queue now shows the amount held at a
glance; wallet rows and the notification panel are cleaner without losing
timestamps, unread state, or deeplinks. The admin nav responsive specs
confirm no horizontal overflow at 1280–1920px. **Ready for Batch 5 (full
visual QA + regression sweep across 1920/1536/1440/1366/1280/1024).**
