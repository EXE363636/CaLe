# Visual QA Notes — CaLẻ / Now

Last reviewed: **2026-05-23, Phase 9S product navigation shell pass.**

This file complements `RESPONSIVE.md`. Where that file checks layout
breakpoints, this one captures whether each main route reads as a
**polished, designed product surface** after a fresh page load (Ctrl-F5).

The MVP is mock / localStorage-only and there is no automated visual
regression tooling. Every checkbox below was walked through by hand on
desktop Chrome at 1280 px width with a clean `localStorage` (so seed
data is loaded).

## Routes checked after refresh

| Route                       | Hero surface                                                                                        | Cards / hierarchy                                                              | CTA visibility                                              | Empty state design                                                        | Status |
|-----------------------------|-----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|-------------------------------------------------------------|---------------------------------------------------------------------------|--------|
| `/`                         | Warm orange→amber radial blobs in hero, gradient final-CTA section                                  | Benefit cards motion-lift on hover, benefits / how-it-works in tinted cards    | Two large gradient buttons in hero + final CTA              | n/a (landing)                                                             | ✅     |
| `/login`                    | Side trust panel (orange→amber gradient) on `lg+`; form card has shadow + ring                      | Single form card with `ring-1 ring-black/5`, `<details>` demo accounts panel   | Primary `lg` button "Đăng nhập" full width                  | n/a (auth)                                                                | ✅     |
| `/register`                 | Same side trust panel pattern                                                                       | Form card shadow + ring; role + employer-type pickers as bordered chips        | Primary `lg` "Đăng ký" full width                           | n/a (auth)                                                                | ✅     |
| `/worker/dashboard`         | Gradient welcome strip (orange→amber→white) with avatar tile + adaptive copy                        | 4 StatTiles with semantic top-accent strips; rounded-2xl cards                 | "Tìm ca làm" + "Lịch cá nhân" buttons in hero               | "Ca làm sắp tới" empty state shows warm-tone card + "Tìm ca làm" CTA       | ✅     |
| `/worker/schedule`          | Gradient hero (eyebrow + bold title + subtitle); calendar body wrapped in `bg-white/95` panel       | Sidebar items in translucent rounded cards; collapsed slot config in `<details>` | "Thêm lịch bận" prominent in toolbar                        | Calendar empty agenda message inside warm card                            | ✅     |
| `/employer/dashboard`       | Same gradient welcome strip as worker dashboard                                                     | 6 StatTiles; pending-applicants tile flips amber when there's queue            | "Đăng ca mới" + "Xem lịch tuyển dụng" in hero               | "Ca làm sắp tới" warm-tone empty state with "Đăng ca mới" CTA              | ✅     |
| `/employer/schedule`        | Gradient hero + collapsible slot config + white panel calendar                                      | Sidebar primary CTA "Đăng ca mới" + employer legend                            | Toolbar "Đăng ca mới" + sidebar primary CTA                 | Agenda empty message uses calendar.empty.employer copy                    | ✅     |
| `/employer/shifts/new`      | Hero header with eyebrow + page title; trust card in gradient with shield icon; deposit card lifted | Trust + deposit cards have ring-1 + shadow; deposit breakdown table ringed    | "Xác nhận đã thanh toán" full-width primary                 | n/a                                                                       | ✅     |
| `/admin/dashboard`          | Gradient hero (Phase 9C add) with "Chế độ admin" shield badge on the right                         | Tabs in white card with shadow; analytics tiles already styled                 | Tabs read clearly; override button labeled "khẩn cấp"        | Per-tab empty messages preserved                                          | ✅     |
| `/shifts`                   | Gradient hero (Phase 9C add) with eyebrow + match-count chip                                       | Search + filters wrapped together in a single white panel; cards motion-lift   | Match-count chip + search bar both prominent                | Warm-tone empty state with hint copy                                      | ✅     |

## Visual treatments now standardized

- **Page-level hero strip.** Every primary route gets a gradient orange-amber
  hero with an uppercase eyebrow label, a bold title, and a subtitle.
  Pattern: `rounded-2xl border border-orange-100 bg-gradient-to-br
  from-orange-50 via-amber-50 to-white p-6 shadow-sm`. Worker / employer
  dashboards and both schedule pages add `entrance-up` for a subtle fade
  + slide on first paint (Phase 9D).
- **Body background.** `globals.css` paints three radial orange/amber blobs
  + a top-down linear gradient over `slate-50`. After Phase 9C, the linear
  stops were strengthened (top stop = `#ffedd5` orange-100, transition to
  `slate-50` only at 55% of the viewport) so refreshing on any page
  reveals warm tinting in the upper third.
- **Cards.** Default `Card` is `rounded-2xl` with `shadow-sm`. Clickable
  cards add `motion-lift` (subtle hover translate + shadow). All shadows
  honor `prefers-reduced-motion`.
- **Calendar surfaces.** Both `/worker/schedule` and `/employer/schedule`
  wrap the calendar grid in a single white panel (`rounded-2xl`,
  `shadow-sm`, `backdrop-blur-sm`) so it no longer reads as a raw
  spreadsheet. Slot config is collapsed inside a `<details>` ("Tuỳ chỉnh
  khung giờ") to save vertical space on first paint.
- **Form fields.** All date and time inputs route through `DateFieldVN` /
  `TimeFieldVN`. Both use a monospace text input with `dd/mm/yyyy` /
  `HH:mm` placeholders, smart auto-pad on typing, and Vietnamese error
  messages on invalid input. No native browser date pickers anywhere in
  the app.
- **Empty states.** `EmptyState` primitive supports `tone='subtle' |
  'warm'`. Worker / employer dashboards default to `warm` for friendly
  surfaces; admin / search results stay `subtle` for utility surfaces.

## Remaining visual limitations

- **Mock-only.** No real product photography or branded imagery. The
  landing hero now surfaces the **real first-eligible seed shift** via
  the new `FeaturedJobMockup` client island (Phase 9E) — clicking the
  card navigates to `/shifts/[shift.id]`. When no eligible shift exists
  (empty store, all expired) the same card links to `/shifts`. The two
  supporting stat cards (reputation chip, sample calendar slot) stay
  decorative inside an `aria-hidden` wrapper.
- **Calendar Week / Day on mobile.** Below 768 px, the `min-w-[720px]`
  inner timetable scrolls horizontally — intentional, documented in
  `RESPONSIVE.md`. Below `md`, Agenda view is the recommended default,
  but we don't auto-switch (workers may still want the grid).
- **Admin tables.** Admin row layouts (Users / Shifts / Disputes panels)
  remain table-style without the `StatTile` accent treatment used
  elsewhere. This is intentional per Phase 9 scope item 8 ("admin
  dashboard remains serious and functional"). Phase 9C added a hero
  header but left the per-tab content untouched.
- **No real CSS-only icons** — every glyph is inline SVG inside the
  source files. Bundle is small and theme-able, but adding a new icon
  requires a small JSX change rather than a class name.
- **Reduced-motion users** see no hover lift, no modal animations, no
  detail-summary chevron rotation. The static layout still reads
  correctly; the feature is degraded, not broken.

## When to re-run this audit

- After any change to `globals.css` (background gradient, motion utilities).
- After any change to `Card`, `Button`, `Modal`, `EmptyState`, `Reveal`, or
  `DateFieldVN` / `TimeFieldVN`.
- After adding a new top-level page to `src/app/`.
- After altering the hero header pattern on any primary route.
- Before each demo or stakeholder review.

## Phase 9D — motion + reveal additions

- **Hero entrance animation on `/`.** On first paint, the hero copy
  staggers in: badge → headline → subtitle → CTA pair → trust hint, each
  using the new `.entrance-up` class with a per-element
  `--entrance-delay` (0 / 80 / 160 / 240 / 320 ms). The hero mockup
  column slides in from the right via `.entrance-right` at 320 ms. The
  whole sequence completes in well under one second so the page feels
  alive without delaying interaction.
- **Hero mockup is now decorative.** The whole mockup column is wrapped
  in `pointer-events-none` and `aria-hidden`. A small "Bản xem trước"
  pill at the top of the stack labels the cards as preview imagery, not
  active controls. Three soft-floating animations (`.float-soft` and
  `.float-soft-slow`) drift the cards by 4 px on a 8–11 s loop for
  ambient warmth — never enough to read as "loading" or distract.
- **Scroll reveal.** New `Reveal` primitive in `src/components/ui/Reveal.tsx`
  uses `IntersectionObserver` to add `is-revealed` once an element
  enters the viewport (one-shot). Applied to:
  - Trust strip (4 cells, 80 ms stagger)
  - Benefit cards (employer 0 ms, worker 120 ms)
  - How-it-works panels (employer 0 ms, worker 120 ms)
  - Final CTA block
- **Dashboard welcome strips** use `entrance-up` so the gradient hero
  on `/worker/dashboard` and `/employer/dashboard` fades in on load.
  Below-the-fold dashboard sections were intentionally left without
  reveal wrappers — the dashboards are utility surfaces and reveal
  motion would slow down the user-facing data.
- **Calendar pages** got a soft floating decorative-blob layer behind
  the page chrome (Phase 9D scope D.1). The blobs sit at `-z-10`,
  `pointer-events-none`, `aria-hidden`, and float on the `.float-soft`
  loop so the schedule pages no longer read as "white spreadsheet on
  gray background". The calendar grid itself was deliberately not
  reveal-wrapped — instant rendering matters more than entrance polish
  for users navigating with a calendar in front of them.
- **CSS-only background system.** A new `.bg-dot-grid` utility paints
  a low-alpha orange dot grid behind the hero mockup, masked with a
  radial fade so the grid feels like paper texture, not chrome.
- **Reduced motion respected.** `prefers-reduced-motion: reduce`
  short-circuits every Phase 9D animation: `entrance-up`,
  `entrance-right`, `float-soft`, the `.reveal` transition, plus the
  `Reveal` component itself sets `is-revealed` immediately when the
  media query matches.

## Phase 9F — product UX refinements

- **Inclusive copy.** Landing hero, auth side panel, and site description
  no longer position the platform as student-only. New copy targets
  "người lao động linh hoạt" / "người tìm việc linh hoạt". Student-card
  verification remains as one example, not the whole audience.
- **Dashboard label.** "Bảng điều khiển" → "Tổng quan". Worker /
  employer / admin titles got role-specific suffixes
  ("Tổng quan người lao động", "Tổng quan nhà tuyển dụng",
  "Tổng quan quản trị"). Routes unchanged.
- **Clickable stat cards.**
  - Worker dashboard: reputation tile opens a modal explaining the
    +5 / −10 / −20 rules and shows the user's current score; cancel-
    quota tile opens a modal with weekly + monthly usage; completed-
    shifts and earnings tiles smooth-scroll to "Ca làm sắp tới".
  - Employer dashboard: active / posted shifts scroll to the active-
    shifts grid; pending-applicants scrolls to the pending-apps section;
    deposit / payout / completed tiles open a payments-summary modal.
  - Admin dashboard: each analytics tile jumps to the right tab and
    seeds an initial filter (e.g. "Workers" → Users tab filtered to
    workers; "Disputed payments" → Shifts tab filtered to disputed).
  - Every interactive tile shows a "Xem chi tiết →" indicator on hover
    / focus-visible. Non-interactive tiles unchanged.
- **Hourly wage input.** `35000` displays as `35.000`; helper text below
  reads "(ba mươi lăm nghìn VNĐ)". Submitted value stays numeric.
  Pure TS helper in `src/lib/numberVN.ts` — no dependencies.
- **TimeFieldVN deletion fix.** Backspacing from `14:00` now flows
  naturally through `14:0 → 14: → 14 → 1 → empty`. Forward typing keeps
  the smart auto-format from Phase 9C (e.g. `930` → `09:30`).
- **Employer cancellation rule.** Deadline changed from 24h to 6h.
  Edit deadline still 24h. Error copy now reads "Không thể huỷ ca
  trong vòng 6 giờ trước khi ca bắt đầu." Worker cancellation rules
  unchanged.
- **Page help guides.** Six surfaces (worker dashboard, worker
  schedule, employer dashboard, employer schedule, shift creation,
  admin dashboard) gained a "Hướng dẫn sử dụng" button next to the
  page title. Each opens a Modal with concise bullet-point
  instructions. Keyboard accessible.
- **Admin sort controls.** Replaced the single sort hint with a
  `<select>` dropdown (Tên / Vai trò / Điểm uy tín / Trạng thái /
  Ngày tham gia) + asc/desc toggle. Filter chips on the Shifts tab so
  analytics deeplinks render the right slice.

For **layout / breakpoint** issues (touch targets, horizontal overflow,
hamburger nav), see `RESPONSIVE.md` instead. The two files complement
each other.

## Phase 9E — hero interactivity + background depth

- **`/` hero featured-job card is now interactive.** The Phase 9D
  decorative `HeroMockup` was replaced by a new client island
  `FeaturedJobMockup` (`@/components/landing/FeaturedJobMockup`). The
  island reads `useShiftStore` (stable selector), filters via the
  publication invariant (`Published` + `Deposited` + future + has
  positions remaining), sorts by ascending start datetime, and renders
  the soonest-eligible shift as a real `<Link>` to `/shifts/[id]`. The
  link carries an `aria-label` such as `"Xem chi tiết ca Phục vụ quán
  phở giờ trưa"`, a hover lift via `motion-lift`, and a
  `focus-visible:ring-2` accent for keyboard users.
- **Empty-store fallback.** When no eligible shift exists (a fresh
  visitor before `AppHydrator` runs, or a wiped `localStorage`), the
  card links to `/shifts` instead and renders a friendly `"Khám phá ca
  làm phù hợp"` body. No fake `/shifts/[id]` URL is ever produced.
- **Featured-job pill** replaces "Bản xem trước" with `"Việc đang nổi
  bật"` — a product-tone badge with a spark glyph that reads as "this
  is real, recommended content", not preview imagery.
- **Supporting stat cards stay decorative.** The reputation chip and
  upcoming-slot card are wrapped in `aria-hidden="true"` and styled
  with muted `bg-white/80` and slightly desaturated borders so they
  don't visually compete with the primary card. No hover lift, no
  focus ring, no pointer cursor — they read as "supporting stats".
- **Hero background depth.** New `HeroBackgroundDecor` component sits
  inside the hero section at `-z-0` with `pointer-events-none` and
  `aria-hidden`. Adds:
  - A curved bottom gradient wash that bleeds the hero into the next
    section so the boundary feels designed, not stamped.
  - Four floating motif glyphs on `lg+` (phone, calendar, shield with
    check, location pin) at low alpha (`text-orange-300/60..70`) — each
    drifts on the `.float-soft` loop. Hidden on mobile so the small
    viewport stays clean.
- **Interaction integrity.** The featured card is the only interactive
  element in the hero column besides the dual CTAs. Decorative
  shapes, motif icons, and supporting stat cards all carry
  `pointer-events-none` or `aria-hidden` so they never trap clicks or
  keyboard focus.
- **No business logic changes.** No new types, no new store actions, no
  new seed data. The card reads existing state and routes to existing
  pages. Schema unchanged at v3. Route count unchanged at 15.


## Phase 9G — UX bug fixes + visual cleanup

Last reviewed: **2026-05-23, Phase 9G fix pass after Phase 9F manual QA**.

### A. Employer cancellation rule

| Scenario                                                                  | Expected behaviour | Verified |
| ------------------------------------------------------------------------- | ------------------ | -------- |
| Shift starts 24h from now, has zero applications                          | Cancel allowed     | ✅       |
| Shift starts 24h from now, has 1 Pending applicant                        | Cancel allowed     | ✅       |
| Shift starts in 4h, has zero applications                                 | Cancel allowed (Phase 9G exception) | ✅ |
| Shift starts in 4h, has 1 Pending applicant                               | Blocked → "Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu vì ca đã có người ứng tuyển hoặc được duyệt." | ✅ |
| Shift starts in 4h, has 1 Approved applicant                              | Blocked, same message | ✅    |
| Shift starts in 4h, has 1 CancellationRequested applicant                 | Blocked, same message | ✅    |
| Shift starts in 4h, only Rejected/CancelledByWorker apps                  | Cancel allowed (those workers exited the lifecycle) | ✅ |
| Shift already started (now > start datetime)                              | Blocked → "Không thể huỷ ca sau khi ca đã bắt đầu." | ✅ |
| Shift status already Cancelled / Completed                                | Blocked, terminal-state guard fires | ✅ |
| Worker cancellation flow                                                  | **Untouched** by Phase 9G | ✅ |

The error-code mapping in `app/employer/shifts/[id]/page.tsx` resolves
both `TOO_LATE_STARTED` and `TOO_LATE_HAS_APPLICANTS` to the matching
`shift.error.*` keys. The legacy `shift.error.TOO_LATE` key still
exists for any older code path.

### B. Help-modal visual fix

After clicking "Hướng dẫn sử dụng" on each surface (worker dashboard,
worker schedule, employer dashboard, employer schedule, `/employer/
shifts/new`, admin dashboard) the panel now:

- Sits **centered** on a uniform dark backdrop (`bg-slate-900/60`) with
  no banding artefacts. The previous diagonal "white-in-the-middle,
  gray-on-the-sides" effect is gone — root cause was the combination of
  `backdrop-blur-sm` and `background-attachment: fixed` on the body
  gradient, both of which Phase 9G removed.
- Uses the wider `max-w-lg` default panel so help bullet lists don't
  feel cramped. Help content fits without wrapping awkwardly at 768 px.
- Body scrolls are locked while the modal is open and restored on
  close.
- ESC and overlay click both close. Focus moves into the panel on
  open. Close button stays tappable on mobile (44 × 44 target).
- Other modals using the same primitive (rating, employer feedback,
  cancel application, worker stat detail modals) inherit the same
  treatment — no banding, panel scrolls cleanly on tall content.

### C. Worker dashboard stat-tile behaviour

| Tile                | Click action (Phase 9G)                                              |
| ------------------- | -------------------------------------------------------------------- |
| Điểm uy tín         | Reputation modal (rules + current score). Unchanged from 9F.         |
| Ca đã hoàn thành    | **NEW** Completed-shifts modal — total + recent 5 with date/location |
| Tổng thu nhập       | **NEW** Income modal — total VND + recent 5 with payouts + disclaimer |
| Hạn mức huỷ         | Cancellation-quota modal. Unchanged from 9F.                         |

- All four tiles render with `cursor-pointer`, hover lift, and
  `focus-visible` ring; clickable via `Enter` / `Space`.
- The income modal's `"Thu nhập được tính từ các ca đã hoàn thành và đã
  thanh toán trong bản MVP."` disclaimer makes the mock-only nature
  explicit.
- No fake data — both modals read directly from `useApplicationStore`
  (`status === 'Confirmed'` + `payoutAmount`) and the existing
  `worker.completedShiftCount` counter.
- "Tổng thu nhập" no longer scrolls to upcoming shifts. That earlier
  behavior misled QA into thinking the click was broken.

### D. Visual / background direction

| Surface                | Before Phase 9G                                                          | After Phase 9G                                                                  |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Body chrome            | 3 corner radial blobs + `background-attachment: fixed` warm gradient     | 1 large diagonal mesh wash anchored top-left + cream→slate linear gradient (normal scroll) |
| Landing hero (`.hero-decor`) | 3 overlapping radials + 4 floating SVG motif icons (phone / calendar / shield / map-pin) | Single warm wash anchored top-right + curved bottom fade. **No motif icons.**   |
| Landing hero right column | Decorative cards floating on beige                                      | `<FeaturedJobMockup />` wrapped in new `.hero-panel` (warm gradient + dot-grid mask + inset orange ring + soft shadow) |
| `/worker/schedule`     | 2 floating blurred orange/amber circles behind the calendar              | Body chrome only — calendar grid is the focus                                   |
| `/employer/schedule`   | 2 floating blurred orange/amber circles behind the calendar              | Body chrome only — calendar grid is the focus                                   |
| Final CTA (`/`)        | 2 white/amber blur blobs inside the orange gradient panel                | **Kept** — they live inside an explicit gradient panel, not on body chrome      |

- `.bg-dot-grid` alpha lowered from `0.18` → `0.10` so the texture reads
  as paper, not chrome.
- Motion utilities (`motion-lift`, `motion-press`, `entrance-up`,
  `entrance-right`, `reveal`, `float-soft`) all preserved; entrance and
  scroll-reveal animations still play on first paint and on scroll-in.
- `prefers-reduced-motion: reduce` block unchanged — animations
  short-circuit, layouts settle to end-state immediately.
- Hard refresh on `/`, `/worker/dashboard`, `/employer/dashboard`,
  `/admin/dashboard`, `/worker/schedule`, `/employer/schedule`,
  `/shifts`, `/shifts/[id]`, `/employer/shifts/new`,
  `/employer/shifts/[id]`, `/employer/profile`, `/worker/profile`,
  `/login`, `/register` shows a calmer, more cohesive warm surface
  with one clear focal point per page.

### Re-run triggers

Run this audit again after any change to:

- `src/app/globals.css` (body background, motion utilities, `.hero-*`
  classes, `.bg-dot-grid`).
- `src/components/ui/Modal.tsx` (backdrop, scroll wrapper, panel size).
- `src/stores/shiftStore.ts` cancel rule.
- `src/app/worker/dashboard/page.tsx` stat-tile click handlers.


## Phase 9H — Modal portal + stat-card detail bug fixes

Last reviewed: **2026-05-23, Phase 9H portal + stat-detail fix pass**.

### A. Modal portal QA

The shared `Modal` primitive now renders via `createPortal(document.body)`.
This fixes the "trapped inside the page section" bug reported on:

| Surface                        | Before Phase 9H                                                          | After Phase 9H                                                       |
| ------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `/employer/dashboard` help     | Overlay clipped at the gradient hero strip; sides showed page chrome     | Overlay covers entire viewport; panel centered                        |
| `/employer/schedule` help      | Same clipping under the schedule hero                                    | Full-viewport overlay                                                 |
| `/worker/dashboard` help       | Help-modal banding artefacts (sides looked dark)                         | Uniform `bg-slate-900/60` overlay                                     |
| `/worker/schedule` help        | Same clipping                                                            | Full-viewport overlay                                                 |
| `/employer/shifts/new` help    | Worked, but inconsistent panel size                                       | Same default `max-w-lg`, identical visuals                            |
| `/admin/dashboard` help        | OK                                                                       | Same                                                                  |
| Worker stat detail modals      | Could be clipped if tiles sat inside transformed/overflow ancestors      | Always covers viewport                                                |
| Employer stat detail modals    | Same                                                                     | Same                                                                  |
| `CancelApplicationDialog`      | Could clip when triggered from inside `<Reveal>` wrappers                | Always covers viewport                                                |
| `EmployerFeedbackForm` modal   | Same                                                                     | Same                                                                  |
| `WorkerProfileModal` (admin)   | Same                                                                     | Same                                                                  |
| Rating, dispute, escrow modals | Same                                                                     | Same                                                                  |

z-index check:

| Layer                  | z-index           |
| ---------------------- | ----------------- |
| NavBar (`sticky top-0`) | `z-30`            |
| MobileNav drawer       | `z-50`            |
| Toast host             | `z-50`            |
| **Modal overlay**      | **`z-[100]`** ✅  |

ESC + click-outside + close button + focus trap behave identically to
Phase 9G. Body scroll-lock (`overflow: hidden`) still applies on open
and is restored on close — verified by opening a modal mid-scroll on
the worker dashboard, confirming the page doesn't jump.

### B. Worker stat-card detail QA

Click each tile from `/worker/dashboard` and confirm the modal contents:

| Tile               | Modal contents                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Điểm uy tín        | Tone-coded score strip + rules summary + completed/ratings split + last 5 cancellations w/ −10 / 0 badges. Empty-state copy when `cancellationHistory` is empty. |
| Ca đã hoàn thành   | Total count + last 5 confirmed shifts with date, time-range, location, optional payout, "Đã xác nhận" badge.    |
| Tổng thu nhập      | Total earnings + completed-paid count + last 5 confirmed shifts with date, time-range, location, payout. MVP disclaimer. |
| Hạn mức huỷ tuần   | Weekly + monthly remaining + last 5 cancellation records with shift title and LateCancel/OnTime badge. Empty-state copy when no history. |

All four tiles open modals — none of them scroll the page. Hovering
shows the "Xem chi tiết →" affordance; keyboard `Enter` / `Space`
opens the modal. ESC closes. The previous Phase 9G data still renders
correctly (income disclaimer, quota intro, etc.).

### C. Employer stat-card detail QA

Click each tile from `/employer/dashboard` and confirm:

| Tile                | Modal contents                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Ca đang hoạt động   | List of `Published | FullyBooked | InProgress | AwaitingConfirmation` shifts, sorted ascending; row links to the manage page. |
| Đơn chờ duyệt       | List of `Pending` applications across the employer's shifts; row links to the manage page.                   |
| Ca đã đăng          | All shifts ever posted (every status), sorted descending by start datetime. Truncated to 12 with overflow note. |
| Ca đã hoàn thành    | List of `Completed` shifts, sorted descending. Same row template.                                             |
| Tổng đã đặt cọc     | Payments summary (4-cell totals) + recent 5 completed shifts contributing to `totalPaidOut`.                  |
| Tổng đã thanh toán  | Same payments modal as above (shared).                                                                        |

Each shift row shows title, date, time-range, location, status badge,
deposit amount, position counter (`positionsFilled / positionsTotal`),
and a "Xem chi tiết →" link to `/employer/shifts/[id]`. Clicking the
link closes the modal first so navigation isn't masked by an open
overlay.

No tile scrolls to a section. The previous in-page anchors
(`#employer-active-shifts`, `#employer-pending-apps`) remain on the
DOM as harmless deeplink targets but are no longer wired to tile
clicks.

### D. Modal visual consistency

Every modal in the app now shares:

- portal-mounted overlay at `z-[100]`,
- solid `bg-slate-900/60` backdrop,
- `max-w-lg` panel by default (callers may override via `className`),
- consistent close button (top-right, 36 × 36 with focus ring),
- `min-h-full` flex-centered scroll wrapper so tall content scrolls
  inside the overlay rather than the page,
- body scroll-lock while open,
- ESC + click-outside + close-button dismissal,
- `modal-panel-anim` + `modal-backdrop-anim` entrance animations
  (short-circuited under `prefers-reduced-motion: reduce`).

Spot-checked at 375 px / 768 px / 1280 px:

- Panel never extends beyond viewport horizontally.
- Long content (worker reputation modal with 5 cancellation records)
  scrolls inside the panel/wrapper, not the page.
- Close button stays tappable on mobile (44 × 44 effective hit area).
- No "side dark blocks" — the previous Phase 9F report is gone.

### Re-run triggers

Re-run this audit after any change to:

- `src/components/ui/Modal.tsx` (portal, z-index, backdrop).
- `src/app/worker/dashboard/page.tsx` stat detail modals.
- `src/app/employer/dashboard/page.tsx` stat detail modals or
  `<ShiftListModal>` shape.
- Any new modal call site — they inherit portal + z-index automatically.


## Phase 9I — Demo data consistency + employer rating visibility

Last reviewed: **2026-05-23, Phase 9I demo data consistency pass**.

### A. Stat metric vs detail modal consistency (worker)

Open `/worker/dashboard` as `worker-001` (An, 95/100 reputation, 12 completed shifts) and click each tile:

| Tile               | Metric (header)         | Modal contents                                                                                              | Match? |
| ------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| Điểm uy tín        | 95 / 100                | Score timeline: 5 × `+5 Hoàn thành ca` rows + 1 × `OnTime` cancellation (no delta) + MVP note               | ✅     |
| Ca đã hoàn thành   | 12                      | Title reads "Hiển thị 5 ca gần nhất trong tổng số 12 ca đã hoàn thành" + 5 rows + "Còn 7 ca cũ hơn..." note | ✅     |
| Tổng thu nhập      | sum of recent payouts   | Hero shows total + completed count; 5 rows with employer name + date/time/location/payout                   | ✅     |
| Hạn mức huỷ tuần   | weekly remaining        | Weekly + monthly remaining + recent cancellation history (1 OnTime entry shown)                              | ✅     |

For `worker-002` (100/100, 18 completed): same matrix; modal shows 4 most-recent confirmed shifts + footer "Còn 14 ca cũ hơn...". For `worker-006` (35/100, 2 completed, 2 no-shows + 1 LateCancel): reputation modal shows the timeline with `−10 Huỷ ca trong vòng 24 giờ` and `−20 Vắng mặt không báo trước (×2)` rows.

The previous "Bạn chưa hoàn thành ca nào" copy never appears when the metric is non-zero.

### B. Reputation history honesty

- Each row in the score timeline references real observable events (Confirmed applications, `LateCancel` records, aggregated `noShowCount`).
- The italic "Dữ liệu mô phỏng trong MVP. Trong hệ thống thật, điểm uy tín tự động cập nhật từ điểm danh, đánh giá, huỷ ca và tranh chấp." line above the timeline labels the data as mock.
- When no events exist (e.g. fresh worker with score 100, 0 cancellations), the empty-state copy stays.
- Confirmed applications without resolvable shifts (older legacy completions) are not invented — they're simply not shown, with the footer explaining the gap.

### C. Income modal consistency

- Total earnings = `sum of payoutAmount across Confirmed applications`. Every row in the modal contributes to the total.
- Worker `worker-001` total = `app-005 + app-007 + app-100..104` payouts that are Confirmed → 5 visible Confirmed rows (Approved-only `app-001`/`app-005`/`app-007` are not Confirmed and don't count).
- Empty state ("Bạn chưa có thu nhập nào") still works for fresh workers with 0 confirmed paid shifts.
- MVP disclaimer line preserved.

### D. Employer rating / review visibility

| Surface                                          | Source                              | Output                                                                              |
| ------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `/shifts/[id]` (any shift posted by `employer-001`) | `useEmployerFeedbackStore` filter   | `EmployerTrustPanel` row: ★★★★★ 4.7 / 5 (3 đánh giá) + verification badge + last excerpt + "Xem hồ sơ →" |
| `/shifts/[id]` (any shift by `employer-003`)     | (no feedback)                       | "Chưa có đánh giá nào — đây có thể là nhà tuyển dụng mới." + verification badge      |
| `EmployerProfileModal` (worker view)             | `EmployerFeedbackList` component    | Average + 5 most-recent feedback cards with stars, tags, comment, date              |
| `/employer/profile` (employer self-view)         | Same `EmployerFeedbackList`         | "Đánh giá từ người làm" card with average + recent reviews                           |
| `AdminUserProfileModal` (admin view)             | Same `EmployerFeedbackList`         | Inherited from Phase 6 — unchanged, picks up the new seed data automatically         |

Verification badges (`Đã xác minh doanh nghiệp` / `Chưa xác minh`) are shown on the trust panel and modal so workers see the trust signal even before opening the full profile.

### E. Employer dashboard stat-card consistency

| Tile                | Metric source                    | Modal output (after Phase 9I)                                            |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| Ca đang hoạt động   | `myShifts.filter(active states)` | Same set, ascending by start datetime                                    |
| Đơn chờ duyệt       | `Pending` applications           | Same applications + reputation badge + verification chips + completed count |
| Ca đã đăng          | `myShifts` (every status)        | All shifts including the new `shift-010..014` Completed entries          |
| Ca đã hoàn thành    | `Completed` only                 | Same set; for `employer-001` shows `shift-007`, `shift-010`, `shift-012`, `shift-014` |
| Tổng đã đặt cọc     | sum of all `depositAmount`       | Payments summary + 5 most-recent Completed shifts contributing to payout |
| Tổng đã thanh toán  | sum of `Completed.depositAmount` | Same payments modal (shared)                                             |

Spot check `employer-001` after fresh reseed:
- Ca đã đăng: 6 shifts (1, 2, 7, 9, 10, 12, 14) → modal shows all 7 sorted desc.
- Ca đã hoàn thành: 4 (`shift-007`, `shift-010`, `shift-012`, `shift-014`) → modal shows all 4.
- Tổng đã đặt cọc: 270k + 750k + 550k + 360k + 360k + 400k + 825k = 3,515,000 ₫ → matches.
- Tổng đã thanh toán: 550k + 360k + 400k + 825k = 2,135,000 ₫ → matches.

No tile opens an empty modal when its metric is non-zero.

### F. Visual quality

- Each modal row uses a card layout (rounded border, subtle shadow on parent panel) with chips/badges for status / rating / verification rather than plain text.
- Employer trust panel uses the warm-orange tinted strip so it reads as a trust signal, not chrome.
- Consistent close-button pattern, consistent panel width, consistent spacing.

### Re-run triggers

Re-run this audit after any change to:

- `src/data/seed/*.json` (seed data shape or counts).
- `src/data/persistence.ts` (`SCHEMA_VERSION`, seed snapshot).
- `src/app/worker/dashboard/page.tsx` reputation timeline / completed modal / income modal.
- `src/app/employer/dashboard/page.tsx` pending modal trust badges.
- `src/components/user/EmployerTrustPanel.tsx` or `EmployerFeedbackList.tsx`.
- `src/app/shifts/[id]/page.tsx` employer surface.
- `src/app/employer/profile/page.tsx` worker-feedback card.


## Phase 9J — Admin reputation form + adjustment history

Last reviewed: **2026-05-23, Phase 9J admin guidance + history visibility pass**.

### A. Admin form guidance

Open `/admin/dashboard` → Users tab → click "Điều chỉnh điểm uy tín" on a worker row.

| Check                                                                         | Result |
| ----------------------------------------------------------------------------- | ------ |
| Input shows placeholder "0–100"                                                | ✅     |
| Helper text reads "Nhập điểm từ 0 đến 100."                                    | ✅     |
| `min=0`, `max=100`, `step=1` honored by browser validation                     | ✅     |
| Typing 150 surfaces the inline error "Điểm uy tín phải nằm trong khoảng 0–100." in red | ✅     |
| Typing -5 surfaces the same inline error                                       | ✅     |
| Submit button stays disabled while value is out of range or reason empty       | ✅     |
| Submit-time guard still rejects out-of-range values with the same message      | ✅     |
| Reason field stays required                                                    | ✅     |

### B. Admin adjustment row on the worker reputation timeline

Trigger an adjustment as `admin-001`, then open `/worker/dashboard` as the affected worker and click "Điểm uy tín".

| Check                                                                          | Result |
| ------------------------------------------------------------------------------ | ------ |
| Top of timeline shows an indigo-tinted row labeled "Quản trị viên điều chỉnh điểm: X → Y" | ✅     |
| Row carries an "Admin" badge for fast scanning                                  | ✅     |
| Sublabel shows the admin's reason quote                                          | ✅     |
| Date matches the adjustment timestamp                                           | ✅     |
| Right-side delta badge shows actual delta (positive green, negative red, zero amber) | ✅     |
| Rows from before the adjustment still render below in chronological order       | ✅     |
| Empty state still works for workers with no events                              | ✅     |

The MVP disclaimer line above the timeline is preserved.

### C. Quota modal cleanliness

The recent-cancellation list inside the quota modal filters out admin synthetic records (those prefixed with `[Admin set ...]`), so admin overrides don't appear as "huỷ ca" entries. Real `LateCancel` / `OnTime` cancellations from the worker's history continue to appear.

### D. Admin user profile modal — adjustment history

Open the Users tab → click any worker row → "Xem chi tiết hồ sơ":

| Check                                                                              | Result |
| ---------------------------------------------------------------------------------- | ------ |
| New "Lịch sử điều chỉnh điểm" section appears under the rating history             | ✅     |
| Empty state: "Chưa có lịch sử điều chỉnh điểm bởi quản trị viên."                   | ✅     |
| Each entry shows old → new score, reason quote, and date in a tinted card            | ✅     |
| Entries sorted descending (most-recent first)                                       | ✅     |

### E. End-to-end consistency

After admin saves a score change for a worker:

1. The Users tab row re-sorts by reputation (the `userStore.updateUser` returns a fresh array reference, so the existing `useMemo` in `UsersPanel` recomputes).
2. The worker stat card on `/worker/dashboard` shows the new score immediately after the worker reloads (live cross-tab sync isn't a feature in this MVP, but a fresh navigation reflects the change).
3. The notification "Điểm uy tín đã được cập nhật" lands in the worker's bell with old/new score + reason in the body; matches what the timeline row displays.
4. The reputation modal timeline shows the new admin row at the top.
5. The admin profile modal's adjustment history shows the new entry at the top.
6. No unrelated UI surface changes.

### Re-run triggers

Re-run this audit after any change to:

- `src/app/admin/dashboard/page.tsx` reputation form (placeholder, hint, error, range).
- `src/app/worker/dashboard/page.tsx` `repTimeline` derivation or admin row styling.
- `src/components/user/AdminUserProfileModal.tsx` admin adjustment history list.
- `src/stores/adminStore.ts` `adjustReputation` (record format must stay `[Admin set X → Y] reason` for the parser to detect admin entries).


## Phase 9L — Notification deep links + contextual modal opening

Last reviewed: **2026-05-23, Phase 9L notification deep-link pass**.

### A. Notification click → context matrix

Sign in as the affected user (worker / employer / admin), click the notification in the bell, and confirm the destination:

| Notification kind                | Triggered by                                          | Destination link                                | Result on arrival                                              |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| `ReputationAdjusted` (worker)    | Admin adjusts worker's reputation                     | `/worker/dashboard?modal=reputation`            | Reputation modal opens with the new admin row at the top       |
| `NoShow` (worker recipient)      | Employer marks worker no-show                          | `/worker/dashboard?modal=reputation`            | Reputation modal opens, shows the aggregated −20 row             |
| `ApplicationApproved` (worker)   | Employer approves application                          | `/shifts/{shiftId}`                              | Shift detail page for the approved shift                       |
| `ApplicationRejected` (worker)   | Employer rejects application                           | `/worker/dashboard`                              | Worker dashboard, "Đơn ứng tuyển đã bị từ chối" section visible |
| `CancellationApproved` (worker)  | Employer approves cancellation request                  | `/worker/dashboard?modal=quota`                  | Cancellation quota modal opens, recent history visible          |
| `CancellationRejected` (worker)  | Employer rejects cancellation request                  | `/worker/dashboard`                              | Worker dashboard, application still active                     |
| `ShiftCompletedConfirmed`        | Employer confirms completion                           | `/worker/dashboard?modal=income`                 | Income modal opens, new payout row at the top                   |
| `ShiftCancelled` (worker)        | Employer cancels shift with active applicants          | `/worker/dashboard`                              | Worker dashboard, upcoming shifts list reflects the change      |
| `ApplicationReceived` (employer) | Worker submits application                              | `/employer/shifts/{shiftId}`                     | Specific shift's manage page                                   |
| `CancellationRequested` (employer)| Worker requests cancellation within 3h                 | `/employer/shifts/{shiftId}`                     | Specific shift's manage page (decision UI visible)              |
| `WorkerCancelled` / `LateCancel` (employer) | Worker cancels                                | `/employer/shifts/{shiftId}`                     | Specific shift's manage page                                    |
| `NoShow` (employer recipient)    | Marking another worker no-show                          | `/employer/shifts/{shiftId}`                     | Specific shift's manage page                                    |
| `EmployerFeedbackReceived`       | Worker leaves employer review                           | `/employer/profile`                              | Profile page, "Đánh giá từ người làm" card visible              |

The QA target case from the spec — admin adjusts → worker clicks notification → reputation modal opens — is item 1 in this matrix.

### B. URL cleanup behavior

After a `?modal=...` (or `?tab=...&filter=...`) link triggers the modal:

- The hook fires `router.replace(pathname)` to strip the query.
- Browser address bar immediately shows the clean URL (e.g. `/worker/dashboard`, no query string).
- Closing the modal via ESC / overlay click / close button does NOT reopen it on the next render.
- Refreshing the now-clean URL leaves the dashboard idle (no modal).

### C. Unknown query value safety

| Input URL                                       | Behavior                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `/worker/dashboard?modal=xyz`                   | Modal stays closed; param stripped silently                             |
| `/worker/dashboard?modal=`                       | No modal opens; param stripped                                          |
| `/worker/dashboard` (no query)                   | Idle dashboard, no extra effect                                         |
| `/admin/dashboard?tab=garbage`                   | Tab stays on default `analytics`; query stripped                        |
| `/admin/dashboard?tab=users&filter=garbage`      | Users tab opens with default `all` filter; query stripped               |

### D. Idempotence

- The hook uses a `useRef(false)` guard so the post-`router.replace` re-render does NOT re-fire the effect.
- The effect's dep list is intentionally empty (`[]`) — same guard reasoning. No infinite loop possible.
- React Strict Mode double-invocation in dev is safe: the second run sees `handled.current === true` and returns early.

### E. Notification metadata fallback

- Notifications without a `link` still render as `<button>` (close dropdown only) in `NotificationBell`. Phase 9L did not add a `link` to any kind that previously had none.
- Notification body and title text are unchanged from previous phases.

### Re-run triggers

Re-run this audit after any change to:

- `src/lib/useModalFromQuery.ts` (the shared hook).
- The query-param effect blocks in `src/app/worker/dashboard/page.tsx`, `src/app/employer/dashboard/page.tsx`, `src/app/admin/dashboard/page.tsx`.
- Any notification creation site (`applicationStore`, `adminStore`, `employerFeedbackStore`, `shiftStore`, `useNotificationStore.push` calls in pages) — confirm the new `link` still resolves to a contextual route or modal.


## Phase 9M — Dashboard notification cards become clickable

Last reviewed: **2026-05-23, Phase 9M dashboard notification card pass**.

### A. Worker dashboard notification card click behavior

Sign in as `worker-001`, ensure the Phase 9I seed has populated reputation history, and trigger an admin reputation adjustment. Then on `/worker/dashboard`:

| Card                                                | Same page? | Click behavior                                                       |
| --------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `ReputationAdjusted` → `?modal=reputation`          | yes        | Reputation modal opens in-place; URL stays clean; card marked read   |
| `ShiftCompletedConfirmed` → `?modal=income`         | yes        | Income modal opens in-place; URL stays clean; card marked read       |
| `CancellationApproved` → `?modal=quota`             | yes        | Quota modal opens in-place; URL stays clean; card marked read        |
| `NoShow` (worker) → `?modal=reputation`             | yes        | Reputation modal opens in-place; card marked read                    |
| `ApplicationApproved` → `/shifts/{id}`              | no         | `router.push` to shift detail; card marked read                       |
| `ApplicationRejected` → `/worker/dashboard`         | yes (no modal) | `router.push` to same path; no modal; card marked read              |
| `ShiftCancelled` → `/worker/dashboard`              | yes (no modal) | Same as above                                                       |
| Notification with no `link`                          | n/a        | No navigation; card still receives focus; click marks read            |

The "Xem chi tiết →" affordance hovers in only on actionable cards.

### B. Employer dashboard notification card click behavior

On `/employer/dashboard`:

| Card                                                  | Same page? | Click behavior                                                  |
| ----------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| `ApplicationReceived` → `/employer/shifts/{id}`       | no         | `router.push` to shift manage page; card marked read             |
| `CancellationRequested` → `/employer/shifts/{id}`     | no         | Same                                                             |
| `WorkerCancelled` / `LateCancel` → `/employer/shifts/{id}` | no    | Same                                                             |
| `NoShow` (employer recipient) → `/employer/shifts/{id}` | no       | Same                                                             |
| `EmployerFeedbackReceived` → `/employer/profile`      | no         | `router.push` to employer profile                                 |
| In future: any same-page modal link                    | yes        | Falls through to `onSamePageModal` (allow-list ready)            |

The same-page modal allow-list for the employer dashboard is `['posted', 'active', 'pending', 'completed', 'payments']` — currently no notification kind targets these directly, but the wiring is ready when one does.

### C. Same-page modal vs cross-route push

| Link target                            | Behavior                                                       |
| -------------------------------------- | -------------------------------------------------------------- |
| Same path, allowed `modal` value       | `onSamePageModal(modal)` — modal opens, URL unchanged          |
| Same path, non-allowed `modal` value   | `router.push` — browser navigates, `useModalFromQuery` ignores  |
| Different path, any query              | `router.push` — destination page handles via its own hook       |
| Same path, no `modal` query             | `router.push` — no-op visually but card marked read             |

### D. Accessibility

- Cards are native `<button>` elements; `Enter` / `Space` activates click.
- `focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-inset` provides a keyboard focus ring without bleeding into the parent panel.
- `aria-label={notification.title}` exposes the notification title to screen readers.
- "Xem chi tiết →" affordance is `aria-hidden="true"` so it doesn't double-read.

### E. Persistence

- `onRead(notification.id)` calls `useNotificationStore.markRead`, which persists to `cale.notifications`. Same as the existing `NotificationBell` flow.
- `markAllRead` button at the top of the panel is unchanged.

### Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/DashboardNotificationCard.tsx` (click logic, affordance, focus styles).
- The `<DashboardNotificationCard>` instantiation blocks in `src/app/worker/dashboard/page.tsx` and `src/app/employer/dashboard/page.tsx`.
- Any new notification kind whose `link` field needs same-page handling — check that the destination dashboard's `samePageModalAllowed` array includes the new value.


## Phase 9N — NotificationBell same-page deep links

Last reviewed: **2026-05-23, Phase 9N notification-bell same-page click pass**.

### A. Bell click — already on the destination dashboard

Sign in as `worker-001`, navigate to `/worker/dashboard`, then trigger an admin reputation adjustment in another tab so a `ReputationAdjusted` notification arrives.

| Click source                                  | Click target                                  | Result                                                                                  |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Bell dropdown row (worker on `/worker/dashboard`) | `/worker/dashboard?modal=reputation`        | Reputation modal opens immediately; URL unchanged; notification marked read; dropdown closes |
| Bell dropdown row (worker on `/worker/dashboard`) | `/worker/dashboard?modal=income`            | Income modal opens immediately; URL unchanged                                            |
| Bell dropdown row (worker on `/worker/dashboard`) | `/worker/dashboard?modal=quota`             | Quota modal opens immediately; URL unchanged                                             |
| Bell dropdown row (worker on `/worker/dashboard`) | `/worker/dashboard?modal=completed`         | Completed modal opens immediately; URL unchanged                                         |
| Bell dropdown row (employer on `/employer/dashboard`) | `/employer/dashboard?modal=pending`     | Pending modal opens immediately; URL unchanged                                           |
| Bell dropdown row (employer on `/employer/dashboard`) | `/employer/dashboard?modal=payments`    | Payments modal opens immediately; URL unchanged                                          |
| Bell dropdown row (admin on `/admin/dashboard`) | `/admin/dashboard?tab=users&filter=worker` | Users tab activates with worker filter; URL unchanged                                     |

### B. Bell click — different page

Sign in as `worker-001`, navigate to `/shifts`, then click the same `ReputationAdjusted` notification in the bell.

| Click target                          | Result                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `/worker/dashboard?modal=reputation`  | `router.push` to dashboard; `useModalFromQuery` opens reputation modal; URL strips query |
| `/shifts/{id}` (`ApplicationApproved`) | Standard navigation to shift detail; no modal involved                                  |
| `/employer/profile` (`EmployerFeedbackReceived`) | Standard navigation                                                              |

### C. In-dashboard notification card

Verified again to ensure Phase 9M behavior still works after refactoring the shared helper.

| Surface                                | Click target                                  | Result                                                                |
| -------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Worker dashboard right-rail card       | `?modal=reputation` (same page)               | Reputation modal opens in-place                                       |
| Worker dashboard right-rail card       | `/shifts/{id}` (cross-route)                  | `router.push` to shift detail                                         |
| Employer dashboard right-rail card     | `/employer/shifts/{id}` (cross-route)         | `router.push` to manage page                                          |
| Card with no `link`                    | n/a                                            | Marks read; no navigation; focus stays on the card                    |

### D. Idempotence + cleanup

- The custom event listener is added in `useEffect` and removed on unmount via the cleanup return; Strict-Mode double-mount in dev does not duplicate handlers.
- Dispatching the event when no listener is on page (e.g. user is on `/login`) is a no-op since the helper checks `pathname === expectedPath` before dispatching, but even if not, the event would simply fire into the void.
- `useModalFromQuery` (Phase 9L) keeps its mount-once semantics for cross-route arrivals; the new event path is independent so the two never compete.

### E. Accessibility

- Bell rows are now native `<button>` elements (previously a mix of `<Link>` and `<button>` for un-linked rows). Keyboard `Enter` / `Space` activates click. `focus-visible:ring-2 focus-visible:ring-orange-400` provides a visible focus ring.
- `aria-label={notification.title}` on each row exposes the notification to screen readers.
- The bell dropdown still closes on outside click, ESC, and route changes (existing behavior, unchanged).

### F. Data-consistency principle

A new principle was added to HANDOFF Section 8 rules: **stat metrics and detail modals must derive from the same store data**. If a tile shows `Ca đã hoàn thành: 12`, the modal must either render rows from the same selector (`useApplicationStore` Confirmed apps) or label the gap explicitly. No demo-user-only fake records.

### Re-run triggers

Re-run this audit after any change to:

- `src/lib/notificationAction.ts` (the helper or event contract).
- `src/components/layout/NotificationBell.tsx` (the bell row).
- `src/components/layout/DashboardNotificationCard.tsx` (the in-page card).
- The `useDashboardModalEvents(...)` subscription blocks in any dashboard page.


## Phase 9O — Global action feedback (toast) system

Last reviewed: **2026-05-23, Phase 9O global toast pass**.

### A. Toast surface

- Mounted once via `<ToastHost />` in `app/layout.tsx`. Portals to `document.body`, z-index `[110]` (above `Modal`'s `[100]`).
- Top-right on `sm+` screens, bottom-center stack on mobile.
- 200ms slide-in animation; respects `prefers-reduced-motion: reduce`.
- Each toast renders title (bold) + optional description (small gray) + tone-colored icon + close button.
- Live-region semantics: `role="status"` + `aria-live="polite"` for success/info; `role="alert"` + `aria-live="assertive"` for warning/error.

### B. Worker action feedback

| Action                                                | Result branch                                  | Toast                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Apply on `/shifts/[id]`                                | success                                        | success "Đã ứng tuyển thành công" + desc                                                              |
| Apply, `REPUTATION_TOO_LOW`                            | failure                                        | error "Điểm uy tín của bạn quá thấp (dưới 50)…"                                                       |
| Apply, `FULLY_BOOKED` / `ALREADY_APPLIED` / `CONFLICT` / `SCHEDULE_CONFLICT` | failure       | error with the matching reason                                                                       |
| Cancel application (immediate, > 3h before start)      | success                                        | success "Đã huỷ đơn ứng tuyển"                                                                       |
| Cancel application (within 3h, requires approval)      | success branch with `requiresApproval: true`   | info "Đã gửi yêu cầu huỷ ca" + desc                                                                  |
| Cancel application, `QUOTA_EXCEEDED`                   | failure                                        | error "Đã hết hạn mức huỷ trong tuần / tháng"                                                         |
| Check-in / check-out from dashboard                    | success                                        | success "Đã check-in" / "Đã check-out, chờ nhà tuyển dụng xác nhận"                                  |
| Add / edit / delete personal busy block                | success                                        | success "Đã thêm / cập nhật / xoá lịch bận"                                                          |
| Block overlaps approved shift / time-range invalid     | failure                                        | error "Khung giờ này trùng…" / "Giờ kết thúc phải sau giờ bắt đầu"                                  |

### C. Employer action feedback

| Action                                                 | Result branch | Toast                                                                                |
| ------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------ |
| Create shift on `/employer/shifts/new`                  | success       | success "Đã tạo ca tuyển dụng" + "Bấm Mô phỏng đặt cọc để công khai…"                 |
| Simulate deposit                                       | success       | success "Đã mô phỏng đặt cọc — ca đã được công khai"                                  |
| Cancel shift on `/employer/shifts/[id]`                  | success       | success "Đã huỷ ca làm" + "Tiền đặt cọc đã được hoàn (mô phỏng)."                     |
| Cancel shift, `TOO_LATE_HAS_APPLICANTS`                  | failure       | error "Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu vì ca đã có người ứng tuyển hoặc được duyệt." |
| Cancel shift, `TOO_LATE_STARTED`                         | failure       | error "Không thể huỷ ca sau khi ca đã bắt đầu."                                       |
| Approve applicant                                       | success       | success "Đã duyệt người ứng tuyển"                                                    |
| Reject applicant (with reason)                          | success       | success "Đã từ chối đơn ứng tuyển"                                                    |
| Reject without reason                                   | failure       | error "Vui lòng nhập lý do."                                                          |
| Mark no-show                                           | success       | success "Đã đánh dấu vắng mặt" + "Bạn được tặng 1 lượt boost…"                         |
| Approve / reject cancellation request                   | success       | success matching the action                                                            |

### D. Admin action feedback

| Action                                       | Result branch | Toast                                                                              |
| -------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| Reputation adjust                            | success       | success "Đã cập nhật điểm uy tín"                                                  |
| Reputation adjust, score out of range        | failure       | error "Điểm uy tín phải nằm trong khoảng 0–100."                                   |
| Reputation adjust, missing reason            | failure       | error "Vui lòng nhập lý do."                                                       |
| Suspend user                                 | success       | success "Đã tạm khoá tài khoản"                                                     |
| Suspend self / last admin                    | failure       | error "Bạn không thể tự khoá tài khoản mình." / "Không thể khoá quản trị viên đang hoạt động cuối cùng." |
| Reactivate user                              | success       | success "Đã mở khoá tài khoản"                                                      |
| Resolve dispute                              | success       | success "Đã giải quyết tranh chấp"                                                  |

### E. Auth feedback

| Action                                       | Result branch | Toast                                                                |
| -------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| Login                                        | success       | success "Đăng nhập thành công"                                        |
| Login, wrong password                         | failure       | error "Email hoặc mật khẩu không đúng."                              |
| Login, suspended account                      | failure       | error "Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên."    |
| Register                                     | success       | success "Tạo tài khoản thành công" + desc                            |
| Register, email already taken                | failure       | error "Email này đã được đăng ký."                                    |
| Logout (NavBar / MobileNav)                  | success       | success "Đã đăng xuất"                                                |

### F. Toast vs notification distinction

- Toasts: ephemeral, in-memory only, surfaced to the **actor** (the user who took the action) immediately. Auto-dismiss.
- Notifications: persistent, role-scoped, surfaced to the **affected user** in the bell. Survive page reload. Clickable deep links open the right modal/route.
- Both can fire for the same action without duplicating content. Example: employer approves applicant → actor toast "Đã duyệt người ứng tuyển" + recipient `ApplicationApproved` notification linking to `/shifts/{id}`.

### G. Notification mark-read no-spam

`markRead(id)` and `markAllRead(userId)` from the notification store do **not** fire toasts. Marking a notification read is a passive UI-only action; toasting on every click would be noise. The bell dropdown closes silently as before.

### H. Form-level validation no-spam

Field-level validation (e.g. invalid email format while typing in the login form) shows inline error text under the field, not a toast. Toasts fire only on **submit** when the action result actually arrives.

### I. Reduced motion

When `prefers-reduced-motion: reduce` is set, the toast slide-in animation is short-circuited (added to the existing `@media` block in `globals.css`). Toasts still appear and dismiss correctly; they just don't animate in.

### Re-run triggers

Re-run this audit after any change to:

- `src/stores/toastStore.ts` (queue / duration logic).
- `src/lib/toast.ts` (helper API).
- `src/lib/errorMap.ts` (error code → message map).
- `src/components/ui/Toast.tsx` (visuals / aria semantics).
- `src/components/layout/ToastHost.tsx` (portal mount, layout).
- Any action-handler call site that calls `showSuccess` / `showError` / `showWarning` / `showInfo`.


## Phase 9P — Auth correctness, toast UX polish, admin shift detail nav

Last reviewed: **2026-05-23, Phase 9P auth + toast + admin nav pass**.

### A. Auth correctness QA

| Scenario                                                                  | Expected result                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Login with `an.nguyen@gmail.com` / `demo`                                  | success → worker dashboard                                                    |
| Login with `an.nguyen@gmail.com` / `wrong`                                 | error toast "Email hoặc mật khẩu không đúng."                                |
| Login with `an.nguyen@gmail.com` / *(empty)*                               | error toast "Email hoặc mật khẩu không đúng."                                |
| Login with `unknown@example.vn` / `demo`                                   | error toast "Email hoặc mật khẩu không đúng." (no enumeration)               |
| Login with `   AN.nguyen@GMAIL.com   ` / `demo`                            | success (case + whitespace normalised)                                       |
| Login with a suspended account, correct password                           | error toast "Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên."     |
| Login with a suspended account, wrong password                             | error toast "Email hoặc mật khẩu không đúng." (suspension state not leaked) |
| Register a new worker with `password=longEnoughPwd`, then logout, then login with that exact password | success                                                  |
| Register, then attempt to log in with a different password                | error toast "Email hoặc mật khẩu không đúng."                                |

Automated regression coverage: `src/__tests__/authStore.test.ts` (12 cases).

### B. Toast position / alignment / progress

- Desktop: toasts pin to `top-24 right-4` — clear of the sticky NavBar; the NavBar's logout / notification bell remain clickable while a toast is visible.
- Mobile (< 640 px): toasts stack at `bottom-4`, full-width within page padding.
- Icon badge centers vertically with the title + description block (`items-center` on the row, `self-start` on the close button).
- Auto-dismiss progress bar runs along the bottom edge from full width to zero over the toast's duration (success 3s, info/warning 4s, error 5s). Color matches the tone (emerald / red / amber / blue).
- Sticky toasts (when an action raises `showError(..., { sticky: true })`) skip the bar entirely.
- `prefers-reduced-motion: reduce` short-circuits both the slide-in animation and the progress-bar shrink — the toast appears instantly with the bar at full width and disappears at the auto-dismiss time.
- Multiple toasts stack vertically with consistent gap; each independently dismissible.

### C. Toast tone correctness — admin actions

| Admin action                                | Click branch                                          | Toast                                                                |
| ------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| Tạm khoá user (success)                      | `result.ok`                                            | success "Đã tạm khoá tài khoản"                                       |
| Tạm khoá self                                | `CANNOT_SUSPEND_SELF`                                  | error "Bạn không thể tự khoá tài khoản mình."                        |
| Tạm khoá last active admin                   | `CANNOT_SUSPEND_LAST_ADMIN`                            | error "Không thể khoá quản trị viên đang hoạt động cuối cùng."        |
| Mở khoá (success)                            | `result.ok`                                            | success "Đã mở khoá tài khoản"                                        |
| Override escrow (success)                    | `result.ok`                                            | success "Đã override trạng thái đặt cọc"                              |
| Override escrow (failure)                    | `SHIFT_NOT_FOUND` etc.                                 | error from `toastFromStoreError`                                      |
| Resolve dispute (success)                    | `result.ok`                                            | success "Đã giải quyết tranh chấp"                                    |

The previous "always success" tone bug is gone — tone now strictly follows `result.ok`.

### D. Admin shift detail navigation

On `/admin/dashboard` → Ca làm tab:

| Action                              | Result                                                                |
| ----------------------------------- | --------------------------------------------------------------------- |
| Click shift title                    | navigates to `/shifts/{id}` (admin viewer branch)                      |
| Click "Xem chi tiết" button          | navigates to `/shifts/{id}`                                           |
| Click "Override (khẩn cấp)"          | opens inline override form; success/failure toasts as wired            |
| Filters `Tất cả` / `Đang hoạt động` / `Đã hoàn thành` / `Tranh chấp` | apply correctly; preserved from earlier phases   |

Hover state on the title underlines the text in orange. Keyboard `Tab` order:
1. Title link
2. "Xem chi tiết" button
3. "Override (khẩn cấp)" button.

Each focusable element gets a visible orange ring on `:focus-visible`.

The shift detail page already shows everything an admin needs without going through override: title, description, employer (clickable to `EmployerProfileModal`), location, date, time, wage, positions filled/total, shift status, escrow status, applicant list (when present). Cancellation/completion/dispute states show via the existing badges.

### E. Re-run triggers

Re-run this audit after any change to:

- `src/stores/authStore.ts` `login` (the auth rule).
- `src/__tests__/authStore.test.ts` (the regression coverage).
- `src/components/ui/Toast.tsx` (icon alignment, progress-bar markup).
- `src/components/layout/ToastHost.tsx` (positioning).
- `src/app/globals.css` `@keyframes toast-progress-shrink` or the reduced-motion block.
- The admin `<ShiftRow>` block in `src/app/admin/dashboard/page.tsx`.


## Phase 9Q — Toast lifecycle hardening + global footer

Last reviewed: **2026-05-23, Phase 9Q dedupe + footer pass**.

### A. Toast dedupe behavior

| Scenario                                                             | Expected                                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Click "Đăng nhập" with wrong password once                            | One error toast appears with progress bar                                |
| Click "Đăng nhập" with same wrong password again while toast visible | No second toast; existing toast pulses (shake), progress bar restarts at full width, dismiss timer resets |
| Click "Đăng nhập" with a different wrong-password reason              | Different toasts stack (e.g. `INVALID_CREDENTIALS` then `SUSPENDED`)      |
| Click "Đăng nhập" with same wrong password 5 times in <1s            | Still only one toast on screen; pulsing each time                        |
| Wait for toast to auto-dismiss, then trigger same error again        | Fresh toast appears with `version: 1`; progress runs full duration       |
| Manual close (X) → trigger same error again                          | Fresh toast appears as new item                                          |

Automated regression: `src/__tests__/toastStore.test.ts` (13 cases).

### B. Toast lifecycle / timers

- Every non-sticky toast auto-dismisses exactly after its duration (success 3s / info 4s / warning 4s / error 5s) measured from the most recent show or dedupe re-trigger.
- The auto-dismiss timer is keyed on `version`: each dedupe bump clears the prior `setTimeout` and starts a new one. No timer leaks.
- Manual close removes the toast immediately and cancels its timer.
- `<ToastHost>` calls `useToastStore.getState().clear()` on unmount, so dev hot-reloads or layout transitions never leave dangling toasts.
- Sticky toasts (`duration <= 0`) never auto-dismiss; user must close.
- `MAX_VISIBLE_TOASTS = 4`. Showing a 5th non-sticky toast evicts the oldest non-sticky one.

### C. Progress bar

- Thin colored bar (`h-0.5`) along the bottom edge.
- Width animates from 100% → 0% over `duration` via `@keyframes toast-progress-shrink` with linear timing — honest visual progress.
- Re-keyed on `version` so dedupe restarts the animation cleanly.
- Hidden entirely when `duration <= 0` (sticky).
- Tone-matched color: success → emerald, error → red, info → blue, warning → amber.
- `prefers-reduced-motion: reduce` short-circuits the animation; the bar shows full-width but the dismiss timer still runs.
- Does not block the close button (which sits in the top-right corner with `self-start`).

### D. Toast position / icon alignment (preserved from 9P)

- Desktop: `sm:top-24 sm:right-4` so toasts sit clearly below the sticky NavBar.
- Mobile: bottom-center (`bottom-4`).
- Icon badge centers vertically with the title + description block via `items-center`.
- Multiple toasts stack with consistent gap; each independently dismissible.

### E. Footer placement

| Surface                                | Footer visible? |
| -------------------------------------- | --------------- |
| `/` (landing)                           | ✅              |
| `/login`, `/register`                   | ✅              |
| `/shifts`, `/shifts/[id]`               | ✅              |
| `/worker/dashboard`, `/worker/profile`, `/worker/schedule` | ✅ |
| `/employer/dashboard`, `/employer/profile`, `/employer/schedule` | ✅ |
| `/employer/shifts/new`, `/employer/shifts/[id]` | ✅       |
| `/admin/dashboard`                      | ❌ (hidden by `usePathname().startsWith('/admin')`) |
| Any modal overlay                       | ❌ (modal portals into `document.body`, footer is in the page tree) |

### F. Footer responsive behavior

- Mobile (`< md`): single-column stack, brand on top, link columns below, bottom row stacks vertically.
- Tablet (`md`): 2-column grid for the 5 sections.
- Desktop (`lg`): 5-column grid laid out side by side.
- Bottom row flex direction switches from `flex-col` to `sm:flex-row` so the copyright and the MVP disclaimer pill share a row at ≥ 640 px.

### G. Footer content

- Brand: "CaLẻ / ShiftNow" (orange), publisher "CaLedo Tech".
- Tagline: "Kết nối ca làm ngắn hạn an toàn, minh bạch và linh hoạt."
- Contact (mock): `support@caledo.vn`, hotline `1900 3636`, address `Hà Nội, Việt Nam`.
- Four nav columns: `Về CaLedo`, `Dành cho người lao động`, `Dành cho nhà tuyển dụng`, `Pháp lý & hỗ trợ`. Each carries 4 links.
- Real routes (`/shifts`, `/worker/profile`, `/worker/schedule`, `/employer/dashboard`, `/employer/shifts/new`) are rendered as `<Link>`s. Future / unimplemented routes (Giới thiệu, Cách hoạt động, Điều khoản, …) are rendered as `aria-disabled` text with cursor: default — no fake navigation.
- Bottom row: `© 2026 CaLedo Tech. All rights reserved.` + MVP pill `MVP mock data — chưa dùng cho giao dịch thật.`

### Re-run triggers

Re-run this audit after any change to:

- `src/stores/toastStore.ts` (dedupe / cap / version logic).
- `src/__tests__/toastStore.test.ts`.
- `src/components/ui/Toast.tsx` (timer effect, progress key, shake class).
- `src/components/layout/ToastHost.tsx` (cleanup or position).
- `src/app/globals.css` `@keyframes toast-shake` / `@keyframes toast-progress-shrink` / reduced-motion block.
- `src/components/layout/Footer.tsx` (column shape, placement gate).


## Phase 9R — Toast lifecycle ownership + auth cleanup + real footer routes

Last reviewed: **2026-05-23, Phase 9R lifecycle + footer pass**.

### A. Toast lifecycle (store-owned)

| Scenario                                                              | Expected                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Wrong-password error toast (duration 5000ms)                           | disappears at exactly 5000ms ± frame                            |
| Wrong-password retry at t=2500ms                                      | toast pulses, progress restarts, total visible time is 7500ms (2500 + new 5000) |
| Manual close before timeout                                           | toast removed immediately; no late-firing timer reappearance    |
| Sticky toast (`showError(..., { sticky: true })`)                      | never auto-dismisses                                            |
| `clear()` while toasts are visible                                    | all removed; no late-firing timer reappearance                  |

Automated regression: `src/__tests__/toastStore.test.ts` (20 cases including 7 new in 9R using `vi.useFakeTimers()`).

### B. Auth toast cleanup

| Scenario                                                              | Expected                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Type wrong password 5x rapidly on `/login`                             | One error toast, shakes each time, no stack                              |
| Type wrong password then submit correct password                       | Old error toast cleared via `clearToastsByScope('auth')`; success toast appears; dashboard does NOT show stale "Email hoặc mật khẩu không đúng." |
| Successful login pushes to `/worker/dashboard`                         | Route-change effect in `<ToastHost>` clears any leftover auth toast for safety |
| Logout from NavBar/MobileNav                                           | All toasts cleared, then "Đã đăng xuất" success toast shown              |
| Successful register from `/register`                                   | Auth-scope toasts cleared, success toast with description shown          |

### C. Footer placement after Phase 9R

| Surface                                | Footer visible? |
| -------------------------------------- | --------------- |
| `/` (landing)                           | ✅              |
| `/login`, `/register`                   | ✅              |
| Static info pages (`/about`, `/safety`, …) | ✅           |
| `/shifts`, `/shifts/[id]`               | ✅              |
| `/worker/dashboard`, `/worker/profile`, `/worker/schedule`, `/worker/reputation-guide`, `/worker/cancellation-policy` | ✅ |
| `/employer/dashboard`, `/employer/profile`, `/employer/schedule`, `/employer/payments`, `/employer/reviews` | ✅ |
| `/employer/shifts/new`, `/employer/shifts/[id]` | ✅            |
| `/admin/dashboard`                      | ✅ (Phase 9R reversed Phase 9Q's admin hide) |
| Inside any modal overlay                 | ❌ (modal portals to `document.body`)         |

### D. Footer link integrity

| Footer link                              | Destination route                          |
| ---------------------------------------- | ------------------------------------------ |
| Giới thiệu                                | `/about`                                   |
| Cách hoạt động                            | `/how-it-works`                            |
| An toàn & xác minh                        | `/safety`                                   |
| Câu hỏi thường gặp                        | `/faq`                                      |
| Tìm ca làm                                | `/shifts`                                   |
| Hồ sơ & điểm uy tín                       | `/worker/reputation-guide`                  |
| Lịch cá nhân                              | `/worker/schedule` (RoleGuard)              |
| Quy định huỷ ca                           | `/worker/cancellation-policy`               |
| Đăng ca tuyển                             | `/employer/shifts/new` (RoleGuard)          |
| Quản lý ứng viên                          | `/employer/dashboard` (RoleGuard)           |
| Đặt cọc & thanh toán                      | `/employer/payments`                        |
| Đánh giá sau ca                           | `/employer/reviews`                         |
| Điều khoản sử dụng                        | `/terms`                                    |
| Chính sách bảo mật                        | `/privacy`                                  |
| Chính sách xử lý tranh chấp               | `/disputes`                                 |
| Liên hệ hỗ trợ                            | `/support`                                  |

Every link clickable. No `aria-disabled` placeholders.

### E. Static info pages

Each new page uses the shared `<InfoPage>` shell:
- Eyebrow line, large title, short intro paragraph.
- 3–6 content sections with substantive Vietnamese copy.
- Optional CTA row at the bottom linking back to `/shifts`, `/employer/dashboard`, `/support`, etc. as appropriate.
- No fake content blocks, no AI-filler. Each page describes real product behaviour or real policy posture.

### F. Footer responsive behavior

- Mobile (`< md`): single-column stack, brand on top, link columns below, bottom row stacks vertically.
- Tablet (`md`): 2-column grid for the 5 sections.
- Desktop (`lg`): 5-column grid laid out side by side.
- Bottom row flex direction switches from `flex-col` to `sm:flex-row` so the copyright and the location/version line share a row at ≥ 640 px.

### Re-run triggers

Re-run this audit after any change to:

- `src/stores/toastStore.ts` (timer ownership, dedupe, scope).
- `src/lib/toast.ts` (helper API).
- `src/components/ui/Toast.tsx` (component shape).
- `src/components/layout/ToastHost.tsx` (route-change effect).
- `src/components/layout/Footer.tsx` (column shape).
- `src/components/layout/InfoPage.tsx` (shared info-page shell).
- Any of the 12 static pages under `/about`, `/how-it-works`, `/safety`, `/faq`, `/terms`, `/privacy`, `/disputes`, `/support`, `/worker/reputation-guide`, `/worker/cancellation-policy`, `/employer/payments`, `/employer/reviews`.
- Auth flows in `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/layout/NavBar.tsx`, `src/components/layout/MobileNav.tsx`.


## Phase 9S — Product navigation shell

Last reviewed: **2026-05-23, Phase 9S navigation pass**.

### A. Public navbar (logged out)

| Element                                      | Expected                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Brand block                                  | "CaLẻ / ShiftNow" + small "by CaLedo Tech" eyebrow on `sm+`              |
| `Trang chủ` link                              | Active on `/` only (exact match)                                         |
| `Tìm ca làm` link                             | Active on `/shifts` and `/shifts/[id]`                                   |
| `Người lao động ▾` dropdown                  | 4 items: Tìm ca làm / Hồ sơ & điểm uy tín / Lịch cá nhân / Quy định huỷ ca |
| `Nhà tuyển dụng ▾` dropdown                  | 4 items: Đăng ca tuyển / Quản lý ứng viên / Đặt cọc & thanh toán / Đánh giá sau ca |
| `An toàn & hướng dẫn ▾` dropdown             | 4 items: Cách hoạt động / An toàn & xác minh / Câu hỏi thường gặp / Xử lý tranh chấp |
| `Hỗ trợ` link                                 | → `/support`                                                             |
| Right cluster                                | `Đăng nhập` · `Đăng ký` · primary orange CTA `Tìm ca làm ngay` (`→ /shifts`) |

### B. Dropdown behavior

- Click trigger to toggle open/close.
- Click outside the dropdown card closes it.
- Press ESC closes it.
- Navigating to a link inside the menu closes it.
- Each item has bold label + muted Vietnamese description below.
- Hover background flips to `orange-50`.
- Trigger lights up (orange-50 / orange-700) when current path matches any of its `activePrefixes`.

### C. Authenticated navbar — worker

`/worker/dashboard` after login:

| Item                  | Active when                            |
| --------------------- | -------------------------------------- |
| Trang chủ              | `/`                                    |
| Tìm ca làm             | `/shifts`, `/shifts/[id]`              |
| Tổng quan              | `/worker/dashboard`                    |
| Lịch cá nhân           | `/worker/schedule`                     |
| Hồ sơ                  | `/worker/profile`, `/worker/profile/*` |
| Hỗ trợ                 | `/support`                             |
| Notification bell      | visible, opens dropdown                |
| Logout                 | visible (red on hover)                 |

### D. Authenticated navbar — employer

| Item                  | Active when                              |
| --------------------- | ---------------------------------------- |
| Trang chủ              | `/`                                      |
| Đăng ca tuyển          | `/employer/shifts/new`                   |
| Tổng quan              | `/employer/dashboard`                    |
| Lịch tuyển dụng        | `/employer/schedule`                     |
| Hồ sơ doanh nghiệp     | `/employer/profile`, `/employer/profile/*` |
| Hỗ trợ                 | `/support`                               |
| Notification bell      | visible                                  |
| Logout                 | visible                                  |

### E. Authenticated navbar — admin

| Item                  | Destination                            |
| --------------------- | -------------------------------------- |
| Trang chủ              | `/`                                    |
| Tổng quan admin        | `/admin/dashboard`                     |
| Người dùng             | `/admin/dashboard?tab=users`           |
| Ca làm                 | `/admin/dashboard?tab=shifts`          |
| Tranh chấp             | `/admin/dashboard?tab=disputes`        |
| Hỗ trợ                 | `/support`                             |

### F. Mobile drawer (`< lg`)

- Hamburger trigger replaces the desktop nav strip.
- Drawer slides in from the right, max width `90vw`.
- Sections per role:
  - **Public:** Chính (2 links) · Người lao động (4) · Nhà tuyển dụng (4) · Hướng dẫn & hỗ trợ (5).
  - **Worker:** Chính (5) · Hướng dẫn (4).
  - **Employer:** Chính (5) · Hướng dẫn (4).
  - **Admin:** Chính (5) · Hướng dẫn (2).
- Drawer footer:
  - Logged-in: red `Đăng xuất` button (preserves Phase 9R toast cleanup).
  - Guest: stacked `Đăng nhập` (ghost) + `Đăng ký` (orange) buttons.
- Closes on route change, ESC, backdrop click, link click.

### G. Active-state matching

- `Trang chủ` uses exact match — never lights up on any other route.
- Sub-route links highlight the parent (e.g. `/worker/profile/edit` keeps `Hồ sơ` lit).
- Dropdown triggers use prefix matching against `activePrefixes` so e.g. `Người lao động ▾` is active anywhere under `/worker/*`, even when none of the visible menu items match.
- Admin tab deep links strip the `?tab=` query before active-state comparison so each tab link can highlight cleanly.

### H. Link consistency

- Every navbar item is a real `<Link>`. No `aria-disabled` or placeholder text.
- Dropdown destinations reuse the exact same routes as the Phase 9R footer.
- Notification bell and logout flow are unchanged from prior phases.
- Modal overlays still portal to `document.body`; the navbar lives in the page tree under `<header>` so it never appears inside a modal.

### Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/NavBar.tsx` (groups, dropdown primitive, active matching).
- `src/components/layout/MobileNav.tsx` (drawer sections, role gating).
- Any new top-level route that should appear in the navbar — add it to one of the three constants (`WORKER_GROUP`, `EMPLOYER_GROUP`, `SAFETY_GROUP`) or to the role-aware `Nav` variants.


## Phase 9T — Responsive polish, nav UX, admin cleanup, richer atmosphere

Last reviewed: **2026-05-23, Phase 9T pass after Phase 9S manual QA**.

### 1. Mobile homepage at 360 / 390 / 430 px

Steps:
- Hard-refresh `/` at 360, 390, and 430 px (Chrome DevTools device toolbar, all three iPhone-class widths).

Expected:
- Hero H1 reads on a single visual block with no clipping at 360 px (`text-3xl` base + `text-balance`).
- Hero CTA pair stacks vertically as two full-width pills (`w-full sm:w-auto`) — no overflow, no horizontal scroll.
- `<FeaturedJobMockup />` panel uses `p-4` at base, `p-6` at `sm`, `p-8` at `lg` — the inner mockup card stays inside the panel and inside the viewport.
- Trust chip row wraps cleanly across two lines on the smallest phones; the hero stays a reasonable height.
- No horizontal scroll on the document at any of the three widths.

### 2. Mobile drawer density

Steps:
- At any `< xl` width, click the hamburger to open the drawer.

Expected:
- Sections sit closer together (`gap-2`) with a thin `border-t` divider between them, so the four grouped sections (Public) or two grouped sections (worker / employer / admin) read as a dense product nav rather than a sparse list.
- Logged-in users see meaningful sections (5 primary + 4 guidance for worker / employer; 2 + 2 for admin). No fake placeholder links.
- The drawer's vertical layout stays scrollable; the auth footer (Đăng xuất or Đăng nhập / Đăng ký) stays pinned to the bottom.

### 3. Desktop nav text doesn't wrap

Steps:
- Open `/` (logged out) at exactly 1280 px, then 1366, then 1440, then 1920 px wide.
- Open `/employer/dashboard` (logged in as an employer) at the same widths.

Expected:
- All nav links — including `Hỗ trợ`, `Tổng quan admin`, `Lịch tuyển dụng`, `Hồ sơ doanh nghiệp` — stay on a single line. `whitespace-nowrap` is in `navLinkClasses()`.
- Below `xl` (`< 1280 px`) the desktop nav strip is hidden and the hamburger drives the entire navigation. The brand block + bell + hamburger remain.
- No layout shift between `xl` and `2xl`.

### 4. No duplicate "Tìm ca làm" CTA confusion

Steps:
- Open `/` logged out at `xl+`.

Expected:
- Centre nav has a single `Tìm ca làm` link (workers' path).
- Right cluster has `Đăng nhập` · `Đăng ký` · primary orange CTA `Đăng ca tuyển` (`→ /register?role=employer`).
- The orange CTA reads clearly as the employer-side primary action; there is no second "find a shift" button competing with the centre link.

### 5. Dropdown opens on hover AND click

Steps:
- Hover over `Người lao động ▾` on the desktop nav. Move the cursor down through the empty 8 px gap into the menu card. Move out of the menu and wait.
- Click `Nhà tuyển dụng ▾`. Click outside.
- Tab through the nav from the brand block.
- Press ESC while a menu is open.

Expected:
- Hovering opens the menu immediately.
- Moving from trigger → menu items does **not** close the menu (150 ms grace timer).
- Moving fully out of the container closes the menu after 150 ms.
- Click toggles the menu open/closed regardless of hover state.
- Tab focus on a trigger button opens the menu (parity for keyboard users via `onFocus`).
- ESC closes any open menu.
- Outside-click closes any open menu.
- Route change closes any open menu.
- Mobile drawer is unaffected — sections stay click/collapsible only.

### 6. Admin top nav simplified

Steps:
- Log in as `admin@cale.vn` / `demo`. Look at the top nav at `xl+`.
- Open the mobile drawer at `< xl` and inspect the `Chính` section.

Expected:
- Top nav reads exactly: `Trang chủ` · `Tổng quan admin` · `Hỗ trợ` (plus bell + logout).
- The `Người dùng` / `Ca làm` / `Tranh chấp` deep links from Phase 9S are gone.
- Mobile drawer `Chính` group has only `Trang chủ` and `Tổng quan admin`. The `Hướng dẫn` group still carries `Chính sách xử lý tranh chấp` and `Liên hệ hỗ trợ`.
- Admin still reaches the user / shift / dispute panels via the dashboard's own tab system (which is the canonical control).

### 7. Background / motion richer but readable

Steps:
- Hard refresh `/`, `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`. Scroll each page top → bottom.
- Open a help modal on the dashboards (worker, employer).
- Open a stat-detail modal (worker reputation, employer payments).
- Open the cancel-application dialog.

Expected:
- Hero (`/`) shows two soft drifting `.float-blob` shapes around the mockup column on `lg+`. The mockup stays the focal point; the blobs are blurred + low-alpha and never compete for attention. On `< lg` they're hidden.
- Body chrome reveals warmth in both the top-left and the bottom-right corners (the new second radial ellipse), but the surface stays calm — no banding, no shimmer.
- Worker / employer dashboards show a single decorative top-right blob behind every card (`-z-10` inside an `isolate` wrapper). Cards stay legible.
- Modal backdrops (slate-900/60) sit cleanly over the body chrome — no banding artefact, no flicker. (No `backdrop-blur` was added on toast / modal backdrops, per the Phase 9G fix.)
- Toasts continue to work as in Phase 9R (5 s default, dedupe shake, no banding).

### 8. No horizontal scroll across primary routes

Steps:
- At 360 px and 768 px, hard-refresh each of: `/`, `/login`, `/register`, `/shifts`, `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`, `/about`, `/terms`.

Expected:
- Document never scrolls horizontally on any of those routes.
- The navbar doesn't wrap onto a second row — at `< xl` the desktop nav is hidden and the hamburger covers it.
- Footer renders intact at the bottom (unchanged from Phase 9R).
- Toast host (top-right) doesn't cover the hamburger or the brand at any width.
- Dropdowns / mobile drawer remain usable.

### 9. Reduced-motion safe

Steps:
- Toggle OS-level "Reduce motion" on (Windows: Settings → Accessibility → Visual effects → Animation effects off; macOS: System Settings → Accessibility → Display → Reduce motion).
- Hard refresh `/`, `/worker/dashboard`, `/employer/dashboard`.

Expected:
- The two homepage hero blobs are static (`.float-blob` is named in the `prefers-reduced-motion: reduce` block).
- Existing Phase 9D `.float-soft` motifs on the calendar pages stay static (already covered before Phase 9T).
- Entrance / reveal / toast animations all settle to end state immediately (covered by the existing reduced-motion block).
- Dashboard decorative blobs are static (they're `pointer-events-none` divs without animation — no-op for motion-sensitive users by design).
- All layouts render correctly with no missing content; only the motion is degraded.

### Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/NavBar.tsx` (breakpoints, hover-open dropdown timer, right CTA, admin nav links).
- `src/components/layout/MobileNav.tsx` (drawer wrapper breakpoint, section spacing, divider, admin Chính group).
- `src/app/page.tsx` (hero H1 sizing, CTA widths, mockup panel padding, hero blobs, trust chip row).
- `src/app/globals.css` (body chrome radial layers, `.bg-grid-soft`, `@keyframes float-blob`, `prefers-reduced-motion: reduce` block).
- `src/app/worker/dashboard/page.tsx` and `src/app/employer/dashboard/page.tsx` (decorative top-right blob + `isolate` wrapper).


## Phase 9U — Mobile-first redesign + production landing

Last reviewed: **2026-05-23, Phase 9U pass after Phase 9T manual screenshot QA at 360 / 390 / 430 px**.

Phase 9T tightened the desktop / tablet experience but a fresh manual review at real phone widths surfaced two hard layout bugs (homepage horizontally clipped; mobile drawer made the page underneath visibly shifted / sliced) plus a long tail of "AI-coded" polish gaps. Phase 9U fixes the layout bugs at the root and rebuilds the homepage on top of a stable mobile-first surface. Run this audit at every checkpoint below before declaring Phase 9U green.

### 1. Mobile homepage — 360 px (no horizontal clipping)

Steps:
- Hard refresh `/` at 360 × 800 (Chrome DevTools "iPhone SE" or custom device).
- Scroll top → bottom.
- Open the body scrollbar inspector and confirm horizontal scroll bar is absent.

Expected:
- Document never scrolls horizontally. The new `html, body { overflow-x: hidden; width: 100%; }` rule in `globals.css` is the safety net; no descendant absolute element (e.g. the `.float-blob` shapes inside `<HeroBackgroundDecor />`) bleeds past the viewport.
- Hero H1 reads as the mobile-only headline "Việc ngắn hạn, rõ ca – rõ tiền" — two visual lines, no awkward wrap, no clipping.
- CTA pair stacks as two full-width pills: "Tìm ca làm ngay" (primary, gradient orange) on top, "Đăng ca cần tuyển" (secondary, ghost) below.
- Trust chips wrap as two lines max with the tightened mobile padding (`gap-1 px-2.5 text-[11px]`).
- Hero mockup column shows ONLY the featured-shift card — the two supporting stat cards (reputation chip, sample slot) are `hidden sm:block` and never render at this width.

### 2. Mobile drawer — 390 px (no underlying page shift)

Steps:
- At 390 × 844, hard refresh `/`. Scroll the homepage halfway down so vertical scroll position is non-zero.
- Tap the hamburger to open the drawer.
- Watch the page underneath through the backdrop.
- Close the drawer (X button, ESC, and backdrop click — try all three over three repetitions).

Expected:
- Drawer slides in from the right.
- Backdrop covers the full viewport (`fixed inset-0 bg-black/30`, no `backdrop-blur`).
- Page underneath does NOT shift, jump, or appear sliced. The new `body.no-scroll` class (toggled by `MobileNav`'s `useEffect`) kills the scroll, and the inline `padding-right` compensates for the disappearing scrollbar gutter so the layout doesn't visibly snap.
- Vertical scroll position is preserved when the drawer closes.
- The page is locked from scrolling while the drawer is open (try wheel + touch).
- On close, `body.no-scroll` and the inline padding both clear automatically. Open / close several times in a row → no leftover lock.

### 3. Mobile hero — 430 px (CTA + chips fit, mockup simplified)

Steps:
- At 430 × 932, hard refresh `/`.
- Visually inspect the hero column.

Expected:
- Hero H1 + subtitle + CTA pair + trust chips all fit in a single composition without forcing the mockup column off-screen.
- CTAs full-width stacked.
- Trust chips wrap cleanly on one line with breathing room.
- Hero mockup shows only the featured-shift card (supporting stats remain `hidden sm:block` at this width — `sm` is 640 px).
- Hero panel padding is the new `p-3` at base — the inner mockup card never overflows the panel's inner ring.

### 4. Tablet — 768 × 1024 (single column hero, balanced layout)

Steps:
- At 768 × 1024, hard refresh `/`.

Expected:
- Hero still single column (the `lg:grid-cols-2` only kicks in at `lg` = 1024 px).
- Supporting stat cards inside the mockup re-appear (now `sm:block`), since `sm` = 640 px.
- Trust strip lays out as 2-col (`sm:grid-cols-2`).
- Audience cards lay out as 2-col (`md:grid-cols-2`).
- Safety section lays out as 2-col (`sm:grid-cols-2`); 4-col only kicks in at `lg`.
- How-it-works has visible timeline rule on each column (the orange-gradient vertical line behind the step circles).
- No horizontal scroll anywhere.

### 5. Desktop — 1366 × 768 (nav not cramped, audience cards substantial, How-it-works reads as timeline, Safety visible, final CTA polished)

Steps:
- At 1366 × 768, hard refresh `/`.
- Walk down the page section by section.

Expected:
- Top nav fits cleanly with no wrapping (`whitespace-nowrap` from Phase 9T holds up). The right cluster has `Đăng nhập`, `Đăng ký`, primary `Đăng ca tuyển` CTA.
- Hero is two-column with the mockup panel on the right; both `.float-blob` shapes drift gently behind the panel.
- Trust strip lays out as 4-col with card-like surfaces (white/80 background, soft shadow, `ring-1 ring-orange-100`, gradient icon block).
- Audience cards: two substantial cards with gradient header strips (worker = amber, employer = orange), large icon blocks, three-bullet body, prominent CTAs ("Đăng ký Người làm" ghost / "Đăng ký Nhà tuyển dụng" gradient).
- How-it-works: two columns with the timeline-rule vertical bar visible behind each step list. Step number circles ring `ring-4 ring-orange-50`. `.bg-grid-soft` paper texture is faintly visible behind the panels. Section has the `.section-wave` curved separator at the top.
- Safety section: 4 cards (Verification → `/safety`, Deposit → `/employer/payments`, Reputation → `/worker/reputation-guide`, Dispute → `/disputes`), each with icon block + title + 1-line desc + "→ cta" link. Cards lift on hover via `.motion-lift`.
- Final CTA band: denser orange gradient (the new `.cta-band`) with the inverted top wave so the section transition reads as designed. Two CTAs feel premium (white primary with `shadow-lg hover:shadow-xl`, ghost secondary with `border-2 border-white`).

### 6. Wide desktop — 1440 × 900 (hero mockup feels right in a wider column)

Steps:
- At 1440 × 900, hard refresh `/`.

Expected:
- Hero copy column has comfortable breathing room (still inside `max-w-6xl`).
- Mockup panel column is wider than at 1366 — the `<FeaturedJobMockup />` content fills the space without looking small. The `.hero-panel`'s warm gradient + dot-grid mask + inset ring + soft shadow read clearly.
- All sections stay centered (`mx-auto max-w-{5xl|6xl}`); no stretching past the layout container.

### 7. Footer + global

Steps:
- At any viewport, scroll to the bottom of any page (`/`, `/shifts`, `/about`).

Expected:
- Footer renders intact (unchanged from Phase 9R).
- Footer links work.
- No horizontal scroll regression on any of the verified pages: `/`, `/login`, `/register`, `/shifts`, `/shifts/[id]`, `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`, `/about`, `/terms`, `/faq`, `/safety`, `/disputes`, `/support`, `/how-it-works`, `/privacy`, `/employer/payments`, `/employer/reviews`, `/worker/reputation-guide`, `/worker/cancellation-policy`.

### 8. Toast positioning + drawer lock interaction

Steps:
- Trigger any toast (e.g. logout from a logged-in account, or login with valid credentials) at desktop and at 360 px.
- Open the mobile drawer while a toast is visible. Toggle drawer open / close several times in a row.

Expected:
- Toast continues to appear at `top-24` desktop / `top-4` mobile (Phase 9R).
- Toast doesn't cover the navbar logout / hamburger.
- Opening the drawer with a toast visible doesn't shift the toast (toast is `position: fixed`, not affected by body scroll lock).
- Closing the drawer cleanly removes the body scroll lock — the toast and the page beneath both behave normally.

### 9. Reduced-motion

Steps:
- Toggle OS-level "Reduce motion" on (Windows: Settings → Accessibility → Visual effects → Animation effects off; macOS: System Settings → Accessibility → Display → Reduce motion).
- Hard refresh `/`. Scroll top → bottom.

Expected:
- All hero entrance animations land at end state immediately (`.entrance-up`, `.entrance-up-soft`, `.entrance-right` are named in the `prefers-reduced-motion: reduce` block).
- Floating blobs (`.float-blob`, `.float-soft`) are static.
- Audience cards, How-it-works steps, Safety cards all render at end state with no transition — no slide, no fade, just laid out correctly.
- Timeline rule, section wave, audience-card gradient strips, `.cta-band`, `.no-scroll` are static utilities by definition — no-op for motion-sensitive users.
- Toast / modal animations remain disabled as before.

### 10. Drawer support row

Steps:
- Open the mobile drawer at any width.
- Scroll to the bottom of the drawer.

Expected:
- Above the auth footer (Đăng xuất for logged-in users, or Đăng nhập / Đăng ký for guests) sits a small support row: "Cần hỗ trợ? Liên hệ đội CaLẻ" with an inline life-buoy glyph, linking to `/support`.
- The row is muted (text-gray-500 default, hover orange-50 background + orange-700 text).
- It never competes with the primary auth or logout button below it.

### Re-run triggers

Re-run this audit after any change to:

- `src/app/globals.css` (root overflow rules, `.no-scroll`, `.section-wave`, `.audience-card-*`, `.timeline-rule`, `.cta-band`, `@keyframes entrance-up-soft`, body radial layers, reduced-motion block).
- `src/app/layout.tsx` (`min-w-0` discipline on body / main).
- `src/app/page.tsx` (hero copy swap, audience cards, How-it-works, Safety section, final CTA).
- `src/components/layout/MobileNav.tsx` (scroll-lock effect, drawer header gradient, tinted section headings, support row).
- `src/components/layout/NavBar.tsx` (header overflow-x guard).
- `src/components/landing/FeaturedJobMockup.tsx` (supporting stat cards `hidden sm:block` rule).


## Phase 9V — Dropdown layering + hero headline fix

Last reviewed: **2026-05-23, Phase 9V surgical bug-fix pass after Phase 9U manual screenshot QA.**

### Background — what manual QA found

Phase 9U landed the mobile-first redesign, the root-level `overflow-x: hidden` clamp on `html, body`, and a "defensive" `overflow-x-hidden` guard on the sticky `<header>`. A fresh manual screenshot QA at desktop widths (1366 / 1440 / 1536 / 1920) and at phone widths (360 / 390 / 430) flagged two regressions:

1. **Desktop dropdown menus appeared sliced off at the bottom of the header.** Hovering or clicking any of the three grouped triggers (Người lao động ▾ / Nhà tuyển dụng ▾ / An toàn & hướng dẫn ▾) opened a menu that was visibly clipped to the header's bottom edge. Root cause: per CSS spec, `overflow-x: hidden` on `<header>` paired with default `overflow-y: visible` is promoted to implicit `overflow-y: auto`, turning the ~64 px-tall sticky header into a clipping context. The dropdown's `absolute left-0 top-full mt-2 w-72` extends ~280–320 px DOWNWARD from inside the header, so it got cropped. The actual horizontal-overflow safety net is the root-level `html, body { overflow-x: hidden; width: 100% }` in `globals.css` — the header's `overflow-x-hidden` was redundant and introduced this regression.
2. **Hero headline "động" overlapped with the line above.** Tailwind v4's `text-6xl` ships with `font-size: 3.75rem; line-height: 1`. `line-height: 1` is too tight for Vietnamese — combining diacritics (e.g. "động" stacks tone marks both above and below the base character) collide between consecutive lines at `font-extrabold tracking-tight`. The long accent phrase ("cho người lao động linh hoạt") was also wide enough at `text-6xl` + `tracking-tight` that it could wrap inside the `lg:grid-cols-2` copy column at `lg`, producing a third visual line that crashed into line 1's descenders.

Phase 9V's fixes target both root causes surgically. No new dependencies, no schema bump, no business-logic changes, no portal layer for the dropdown, no z-index changes, no new utilities in `globals.css`.

### A. Dropdown layering — checkpoints

Steps:
- Hard refresh `/` at 1366 × 768, 1440 × 900, 1536 × 864, and 1920 × 1080.
- For each viewport, hover the trigger of all three desktop dropdowns (Người lao động ▾, Nhà tuyển dụng ▾, An toàn & hướng dẫn ▾). Then click the same trigger.
- Walk the cursor down from the trigger into the menu items and pick one.
- Press ESC. Hover trigger again. Click outside the menu.
- Navigate to another route. Watch the dropdown auto-close.

Expected:
1. The menu appears fully visible BELOW the trigger button — no clipping at the header's bottom edge. The four menu items are all rendered and reachable. The menu reaches its natural ~280–320 px height regardless of header height.
2. Menu items remain on top of any hero content — hovering the menu does NOT make it pass behind the `<HeroBackgroundDecor />` blobs. The Phase 9U z-index pattern is preserved: header `z-30`, dropdown menu `z-40`, decorative blobs `-z-0`.
3. Phase 9T dropdown contract is intact — hover-open with the 150 ms close delay (cursor can travel from trigger to menu without flicker), click-toggle, ESC-close, outside-click-close, and route-change-close all behave exactly as before.
4. Header still has no horizontal scroll. The root-level `html, body { overflow-x: hidden }` clamp in `globals.css` is the sole safety net; the header's own `overflow-x-hidden` (Phase 9U) was removed because it was redundant and was the actual cause of the clipping.

### B. Hero headline — checkpoints

Steps:
- Hard refresh `/` at 360 × 800, 390 × 844, 430 × 932 (mobile), 1366 × 768, and 1440 × 900 (desktop).
- Visually inspect the hero H1 at each viewport.
- Resize the desktop viewport from 1024 px upward to confirm the H1 never wraps unpredictably.

Expected:
1. **Mobile (360 / 390 / 430 px).** The mobile-only headline ("Việc ngắn hạn, / rõ ca – rõ tiền") fits cleanly with no overlap. The Phase 9U `<span className="sm:hidden">` / `<span className="hidden sm:inline">` swap is preserved, so the desktop accent line never shows at these widths. `leading-tight` (1.25) gives the diacritics enough vertical room.
2. **Desktop (1366 / 1440 px).** The desktop title ("Việc làm ngắn hạn / cho người lao động linh hoạt") reads as two visually distinct lines — the dot-below diacritic of "động" no longer collides with the descenders of "ngắn hạn" above it. The accent phrase "cho người lao động linh hoạt" sits on a single line at `lg:text-5xl` (was `lg:text-6xl` before Phase 9V). No third visual line, no diacritic collision.
3. **Width constraint.** The H1 stays inside `lg:max-w-xl` (36 rem / 576 px) and does not visually creep toward the mockup column on the right. The hero panel column remains untouched.
4. **Animation preserved.** The `entrance-up` animation still plays on first paint with `--entrance-delay: 80ms`. The gradient accent span (`bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent`) on `landing.hero.titleAccent` / `landing.hero.titleAccent.mobile` is unchanged.

Final desktop H1 className (for reference):

```
entrance-up mt-4 text-3xl font-extrabold tracking-tight leading-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl lg:max-w-xl
```

The three Phase 9V guards (`leading-tight`, `lg:text-5xl`, `lg:max-w-xl`) must stay together. A multi-line comment above the H1 in `src/app/page.tsx` documents this so future phases don't drop them.

### Z-index map (preserved — do not change)

| Layer                           | z-index    |
| ------------------------------- | ---------- |
| page content                    | (none)     |
| `<header>` sticky nav           | `z-30`     |
| Desktop dropdown menu           | `z-40`     |
| Mobile drawer backdrop          | `z-40`     |
| Mobile drawer panel             | `z-50`     |
| Toast host                      | `z-[110]`  |
| Modal overlay                   | `z-[100]`  |

The dropdown sits above the header background because `z-40 > z-30` and the menu is a descendant of a `position: relative` container inside the header. Now that the header is no longer a clipping context, the menu visually escapes the header's bottom edge as designed.

### Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/NavBar.tsx` — particularly the `<header>` className. **Do not** add `overflow-x-hidden`, `overflow-y-hidden`, or any `overflow` rule on the header. The clipping bug returns the moment the header has its own clip.
- `src/app/page.tsx` — particularly the H1 className. The three Phase 9V guards (`leading-tight`, `lg:text-5xl`, `lg:max-w-xl`) must remain together. If the desktop title copy gets longer, prefer breaking it across two `<span className="block">` elements rather than dropping `lg:max-w-xl`.
- `src/app/globals.css` — particularly the root `html, body { overflow-x: hidden; width: 100% }` rule. That rule is now the sole horizontal-overflow safety net for the entire app; removing it would expose the header's lack of a clip and any future absolute-positioned descendant could push the body wider than the viewport.


## Phase 9W — Dropdown single-open + mobile full-screen menu

Last reviewed: **2026-05-23, Phase 9W surgical bug-fix pass after Phase 9V manual screenshot QA.**

### Background — what manual QA found

Phase 9V landed two surgical fixes (header `overflow-x-hidden` removal so the dropdown menu is no longer clipped at the header's bottom edge, plus `leading-tight` + `lg:text-5xl` + `lg:max-w-xl` on the hero H1 for Vietnamese diacritic safety). A fresh manual screenshot QA pass at desktop widths (1366 / 1440 / 1536 / 1920) and at phone widths (360 / 390 / 430) flagged two follow-up issues that Phase 9V did not cover:

1. **Two desktop dropdowns can be visible at once on a fast cursor sweep.** Hovering "Người lao động ▾" and then quickly moving the cursor onto "Nhà tuyển dụng ▾" produced a brief window where BOTH menus rendered, overlapping. Root cause: each `<Dropdown>` owned its own local `open` boolean and its own `closeTimerRef`. The first dropdown's pending 150 ms close timer kept its `open=true` while the second dropdown set its own `open=true` on hover-enter. Two menus co-existed for up to 150 ms. The bug was structural — there was no shared coordinator that ensured at most one dropdown was open at any time.
2. **Mobile drawer was a 320 px right-side panel; the hero showed through on the left ~10% of the viewport.** `MobileNav.tsx` declared the drawer as `fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw]`. At 360 / 390 / 430 px viewport widths, 320 px is ~74–89% of viewport width, leaving ~10% on the left where the dim `bg-black/30` backdrop revealed the hero copy underneath. Combined with the user reading "drawer slid in from the right" as "page got cut off", this read as broken on mobile.

Phase 9W's fixes target both root causes:

- **Bug A** — lifted single-source-of-truth `activeDropdown` state into `NavBar`, single shared close timer ref, controlled `Dropdown` component with no local state. Outside-click + ESC + route-change handlers also moved up to `NavBar`. See the dropdown control contract table in `HANDOFF.md` Section 5, item 39.
- **Bug B** — drawer wrapper className changed from `fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw]` to `fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw] z-50`. At `< sm` the drawer covers the entire viewport with `bg-white`; at `sm+` it reverts to a right-side panel.

No business-logic changes, no schema bump (still v4), no new dependencies, no new utilities in `globals.css`, no portal layer for the dropdown, no z-index changes.

### A. Dropdown single-open — checkpoints

Steps:
- Hard refresh `/` at 1366 × 768, 1440 × 900, 1536 × 864, and 1920 × 1080.
- Move the cursor across the three desktop dropdown triggers (Người lao động ▾ → Nhà tuyển dụng ▾ → An toàn & hướng dẫn ▾) FAST — faster than the 150 ms hover-grace timer.
- Move the cursor from a trigger button DOWN through the 8 px gap (`mt-2` between trigger and menu) into the menu itself.
- Click a trigger while its menu is already open.
- Tab to a trigger from the keyboard.
- Press ESC. Click outside any menu. Click a menu item link.

Expected:
1. **Fast A → B sweep.** Hover "Người lao động ▾". Then quickly move the cursor onto "Nhà tuyển dụng ▾" before the 150 ms close timer fires. Only B should be visible. Repeat A ↔ B ↔ C rapidly. **At any instant, only one panel is on screen — never two overlapping.** The previous Phase 9T window where both menus showed simultaneously is gone.
2. **Trigger → menu travel.** Move the cursor from trigger A's button straight down through the 8 px `mt-2` gap into A's menu items. **A stays open** the entire time — the 150 ms grace timer protects the gap so the menu does not collapse mid-travel.
3. **Click toggle.** With menu A open, click trigger A. **Menu A closes immediately** (no timer for click). Click trigger A again. Menu A opens. The toggle path bypasses the close timer entirely.
4. **Keyboard tab.** Tab into trigger B from the previous nav item. **Menu B opens via `onFocus`.** This mirrors hover behaviour for keyboard users.
5. **ESC.** With any menu open, press ESC. **The active menu closes** and the cancel-pending-timer call ensures no stale 150 ms close fires afterwards.
6. **Outside click.** With any menu open, click on the page body outside both the trigger and the menu container. **The active menu closes.** A single document-level `mousedown` listener at the parent checks every registered dropdown container — clicks landing inside any of them keep the menu open.
7. **Item link click.** Click any item link inside an open menu. **Menu closes immediately and route navigates** — `onClick` calls the parent's `onItemClick` which does `cancelClose() + setActiveDropdown(null)`.
8. **Phase 9V regression preserved.** The dropdown menu is NOT clipped at the header's bottom edge. The Phase 9V removal of `overflow-x-hidden` from `<header>` is intact, and the menu's `absolute left-0 top-full z-40 mt-2` continues to escape the header's bottom edge. Header `z-30`, dropdown menu `z-40` — preserved.

### B. Mobile full-screen drawer — checkpoints

Steps:
- Hard refresh `/` at 360 × 800, 390 × 844, and 430 × 932.
- Tap the hamburger to open the drawer.
- Visually inspect every edge of the screen: the drawer should COMPLETELY cover the hero. No hero text should be visible on the left, top, bottom, or right.
- Try to scroll the body. Try to swipe horizontally.
- If the drawer's content is taller than the viewport, scroll inside the drawer.
- Tap the close button. Press ESC. Tap a link inside the drawer. Trigger a route change.
- Resize the viewport up to 768 px (`sm` breakpoint) and reopen the drawer.

Expected:
1. **Full-screen coverage at `< sm`.** At 360 / 390 / 430 px, opening the drawer covers the entire viewport with the opaque `bg-white` surface. **No hero text is visible behind it on any edge.** The previous symptom where ~10% of the viewport on the left showed the hero through the dim `bg-black/30` backdrop is gone — root cause was the 320 px panel; root fix is `inset-0` at `< sm`.
2. **Body scroll lock.** Phase 9U's `useEffect([open])` block toggling `body.no-scroll` + writing the scrollbar-gutter width into `body.style.paddingRight` is preserved unchanged. The page underneath does not shift when the drawer opens or closes; horizontal swipes and vertical scroll on the body are blocked while the drawer is open.
3. **Internal scrolling.** The drawer's `<nav className="flex-1 overflow-y-auto ...">` is unchanged. Long content (logged-in worker section with five sections × 4–5 links) scrolls inside the drawer; the brand header and the auth/logout footer stay pinned.
4. **Close button reachable.** The close button stays at the top-right of the drawer header at all viewport sizes. Its `min-h-[44px] min-w-[44px]` tap target is preserved.
5. **Close paths preserved.** ESC closes (Phase 9U `useEffect([open])` keydown listener). Tapping any link calls `setOpen(false)` before navigating. A pathname change auto-closes via the existing `useEffect([pathname])`. The dim backdrop click closes too. All four paths from Phase 9U are intact.
6. **Tablet panel mode at `sm+`.** At 768 px, the drawer reverts to the right-side panel format via `sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw]`. The dim `fixed inset-0 z-40 bg-black/30` backdrop covers the rest of the viewport. The slide-in transition (`translate-x-full` → `translate-x-0`) reads as a panel sliding over the page rather than the full-screen slide it does at `< sm`.
7. **Hamburger toggle.** The hamburger button (`xl:hidden` wrapper) stays visible above the drawer at every `< xl` width, and tapping it again from the open state closes the drawer. The button's icon swaps between `≡` and `×` based on `open` state.

### Z-index map (preserved — do not change)

| Layer                           | z-index    |
| ------------------------------- | ---------- |
| page content                    | (none)     |
| `<header>` sticky nav           | `z-30`     |
| Desktop dropdown menu           | `z-40`     |
| Mobile drawer backdrop          | `z-40`     |
| Mobile drawer panel             | `z-50`     |
| Toast host                      | `z-[110]`  |
| Modal overlay                   | `z-[100]`  |

### Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/NavBar.tsx` — particularly the dropdown coordinator (`activeDropdown` state, `closeTimerRef`, `cancelClose` / `openDropdown` / `scheduleCloseDropdown` / `toggleDropdown` / `closeNow`, ESC / outside-click / route-change handlers, container registry) or the controlled `Dropdown` component contract. Adding a fourth dropdown means extending the `DropdownId` union AND adding a `<Dropdown id="..." />` instance in `<PublicNav>` — nothing else has to change.
- `src/components/layout/MobileNav.tsx` — particularly the drawer wrapper className. The `fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw]` chain is what gives full-screen coverage at `< sm` and right-side panel at `sm+`. **Do not** drop `inset-0` from the mobile branch (the hero will peek through again) and **do not** drop `sm:left-auto` from the tablet branch (the panel will hug the left edge).


## Phase 9X — Mobile drawer portal + authenticated user menu + canonical z-index map

Last reviewed: **2026-05-23, Phase 9X portal + UserMenu pass — NEEDS MANUAL VISUAL QA**.

This phase replaces three connected fixes plus polish + overlay coordination + docs:

- The mobile drawer was visibly clipped to the navbar strip at `< sm` despite the Phase 9W full-screen className. Root cause was the `<header>`'s `backdrop-filter` containing-block trap on its `position: fixed` descendants. The drawer is now portaled to `document.body` via `createPortal`, escaping the header entirely. Drawer panel `z-[80]`, backdrop `z-[70]` (bumped from `z-50` / `z-40`).
- A new `<UserMenu />` component owns the authenticated avatar dropdown for the desktop nav. It replaces the raw "Đăng xuất" button; the logout sequence (clear toasts + scoped success toast + `router.push('/login')`) moved into the new component. Lives in `src/components/layout/UserMenu.tsx`.
- The mobile drawer now opens with a user summary card (avatar `lg`, name, role, email, trust chip) at the top for `isLoggedIn` users. Guests are unchanged.
- A canonical z-index map is recorded below and in `HANDOFF.md` item 40.

No business-logic changes, no schema bump (still v4), no new dependencies, no new utilities in `globals.css`, no `backdrop-blur` on toast/modal backdrops, locked light theme preserved, mock / localStorage only.

### A. Mobile drawer portal — checkpoints

Steps:
- Hard refresh `/` at 360 × 800, 390 × 844, and 430 × 932 with a clean `localStorage` (so the seed homepage hero is visible).
- Tap the hamburger.
- Inspect every edge of the screen.
- Open the browser devtools and confirm the drawer DOM lives under `<body>` directly — not under `<header>`.

Expected:
1. **Full-viewport coverage.** The drawer's opaque `bg-white` surface covers the entire screen. The hero copy / featured-job mockup / final CTA underneath is **completely hidden** on every edge. The previous Phase 9W symptom where the hero peeked through everywhere below the navbar (because `fixed inset-0` resolved against the header's box, not the viewport) is gone.
2. **DOM placement.** The drawer panel and backdrop are direct children of `<body>` via `createPortal`. The hamburger trigger button stays inline inside `<header>`. Inspector should show the drawer NOT nested under `<header>`.
3. **z-index layering.** Drawer panel `z-[80]`, backdrop `z-[70]`. Both sit above the navbar (z-30), nav guest dropdowns (z-40), notification bell panel (z-50), and user menu panel (z-40), and below modal overlay (z-[100]) and toast host (z-[110]).
4. **Phase 9U body scroll lock preserved.** The page underneath does not shift when the drawer opens or closes. `body.no-scroll` toggles correctly. The scrollbar gutter is compensated via `padding-right` on `<body>`.
5. **Close paths.** ESC, route change, link click, close button, backdrop click — all close the drawer. The `mounted` SSR guard prevents the portaled overlay from rendering during the first server pass / hydration; the trigger renders immediately so first-paint never lacks a hamburger button.
6. **Tablet+ behavior unchanged.** At `sm+` (≥ 640 px), the drawer reverts to the right-side panel via `sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw]`. The dim backdrop covers the rest of the viewport.

### B. Authenticated user menu — checkpoints

Steps:
- Log in as a worker (e.g. seed account `worker@cale.vn`), then as an employer, then as the admin.
- Hard refresh `/worker/dashboard` at 1366 × 768 and 1440 × 900. Repeat for `/employer/dashboard` and `/admin/dashboard`.
- Hover the user-menu trigger in the right cluster. Move the cursor down through the 8 px `mt-2` gap into the panel.
- Click the trigger.
- Tab into the trigger from the keyboard.
- Click each shortcut link in turn. Press ESC. Click outside the panel. Trigger a route change.
- Open both the notification bell and the user menu at the same time.

Expected:
1. **Trigger composition.** `<UserAvatar size="sm">` + truncated name (`max-w-[10rem]`) + role label (worker → "Người làm", employer → "Nhà tuyển dụng", admin → "Quản trị viên") + chevron. Below `xl` the trigger does not render; the entire authenticated nav collapses into the mobile drawer.
2. **Panel composition.** `absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5`. The summary card sits at the top on the warm gradient strip; below it a thin `border-t border-gray-100` divider; the role-aware shortcut list; another thin divider; the red Đăng xuất button.
3. **Trust chip.** Worker → `Điểm uy tín: X/100` (green ≥80, amber 50–79, neutral <50). Employer → `Doanh nghiệp đã xác minh` (green) or `Cá nhân / Freelance` (neutral). Admin → `Quản trị viên` (green).
4. **Hover-open + 150 ms close grace timer.** Cursor travels from trigger to panel without the panel collapsing mid-travel — same Phase 9T/9W behavior. Click toggles immediately, bypassing the timer.
5. **Keyboard tab.** Tabbing into the trigger opens the panel via `onFocus`. ESC closes it.
6. **Outside click + route change.** Clicking outside the container OR navigating to a new route closes the panel.
7. **Link click closes immediately.** Clicking any shortcut link closes the panel before navigating. Modal deep links (`/worker/dashboard?modal=reputation`, `/employer/dashboard?modal=pending`) ride the existing `useModalFromQuery` hook and open the matching modal on arrival.
8. **Logout.** The Đăng xuất button calls `logout()`, clears the toast store, pushes the `feedback.auth.logout.success` toast with `scope: 'auth'`, closes the panel, and `router.push('/login')`. Phase 9R behavior preserved.
9. **Co-existence with notification bell.** Both can be open at once on logged-in pages — they are side-by-side affordances. Opening one does NOT close the other. Each closes on ESC, on outside click of its OWN container, and on route change. (The user menu does not pollute the bell's outside-click test, and vice versa.)

### C. Mobile authenticated drawer — checkpoints

Steps:
- Log in as a worker, employer, then admin.
- Hard refresh `/` at 360 / 390 / 430 px.
- Tap the hamburger.

Expected:
1. **User summary card at the top.** First element inside the drawer body is a card with `<UserAvatar size="lg">`, name, role label, email, and the same trust chip as the desktop user menu, all on the warm gradient strip (`bg-gradient-to-r from-orange-50 via-amber-50 to-white`) inside an `border-orange-100` ring with `shadow-sm`.
2. **Grouped sections unchanged.** Phase 9T/9U section structure renders as before below the summary card.
3. **Footer auth actions unchanged.** Logged-in users see the red Đăng xuất button in the footer (Phase 9R cleanup behavior preserved). Guests see Đăng nhập / Đăng ký buttons and the drawer header is the brand block alone — no user summary card.
4. **NotificationBell stays in navbar.** No "Thông báo" link inside the drawer body — the bell is already reachable in the navbar's right cluster at `< xl` for logged-in users.

### D. Overlay coordination summary

| Layer                              | z-index    |
| ---------------------------------- | ---------- |
| page content                       | (none)     |
| `<header>` sticky nav              | `z-30`     |
| Desktop nav dropdown menu (guest)  | `z-40`     |
| Notification bell dropdown panel   | `z-50`     |
| User menu dropdown panel           | `z-40`     |
| Mobile drawer backdrop             | `z-[70]`   |
| Mobile drawer panel                | `z-[80]`   |
| Modal overlay                      | `z-[100]`  |
| Toast host                         | `z-[110]`  |

Coordination rules:
- **Nav guest dropdowns**: managed by NavBar's `activeDropdown` coordinator (Phase 9W). Only one open at a time. Single shared 150 ms close timer.
- **User menu**: independent, single-instance, never co-mountable with nav guest dropdowns (different auth states).
- **Notification bell**: independent, can co-exist with `<UserMenu>` (both are right-cluster on auth nav). Opening one does NOT close the other.
- **Mobile drawer**: portal-mounted to `document.body`, sits above all in-page content. Body is scroll-locked while open.

### E. Product UI polish — checkpoints

- `<header>` has `shadow-sm` alongside `border-b border-orange-100 bg-white/95 backdrop-blur-sm`. Visual: a hint of depth lifts the sticky nav off the page; the underline border still defines the bottom edge.
- User menu items use `hover:bg-orange-50 hover:text-orange-700`, matching the nav guest dropdown items.
- Section dividers in the user menu are thin `border-t border-gray-100` strips between the summary card and the link list, between the link list and the logout button.
- Homepage hero, audience cards, How-it-works, Safety section, dashboards untouched. Phase 9U landed those.

### F. Viewports the user should re-screenshot

Mobile drawer portal: **360, 390, 430 px**.
User menu desktop: **1366, 1440 px**.
Tablet drawer panel mode: **768 px**.

Manual checks:
1. **Mobile drawer at 360 px shows zero hero behind.** The opaque `bg-white` drawer must completely cover the hero copy on every edge. If any portion of the hero is visible through the drawer or the dim backdrop, the portal is not in effect.
2. **User menu opens cleanly at 1366 px.** Hover the trigger in the right cluster; the panel should appear directly below, anchored to the right (`right-0`), with the summary card at the top and the shortcut list + logout button below. Hover travel from trigger to panel must not collapse the menu.
3. **Mobile authenticated menu shows user summary card at top.** Log in as a worker, open the mobile drawer at 390 px. The first element inside the drawer body must be the warm-gradient summary card with avatar + name + role + email + reputation chip.
4. **Notification bell + user menu co-exist.** On `/worker/dashboard` at 1440 px, click the bell, then click the user menu trigger. Both panels should be visible simultaneously. Closing one (via ESC or outside-click on its own container) must not close the other.
5. **Phase 9V `<header>` rule preserved.** No `overflow-x-hidden` on `<header>`. Desktop nav guest dropdowns (visible on `/` while logged out) still escape the header's bottom edge as designed.

### Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/UserMenu.tsx` — hover/focus/click behavior, trust chip resolution, role-aware item lists.
- `src/components/layout/MobileNav.tsx` — particularly the `createPortal(overlay, document.body)` call, the `mounted` SSR guard, the drawer/backdrop z-index values, the `UserSummaryCard` placement.
- `src/components/layout/NavBar.tsx` — the `<UserMenu />` mount point, the `<header>`'s `shadow-sm` + `backdrop-blur-sm` chain. Any addition of `transform`, `filter`, `perspective`, `will-change` (or another `backdrop-filter` rule) to `<header>` will re-trigger the containing-block trap; the portal in `<MobileNav>` is the safety net but the new desktop user-menu panel is NOT portaled, so its `z-40` could become trapped if `<header>`'s containing-block context regresses.


## Phase 9Y — User guidance + contextual help

Last reviewed: **2026-05-23, Phase 9Y user guidance + contextual help pass — NEEDS MANUAL VISUAL QA**.

This phase adds a public long-form guide route, threads it into the
navigation surfaces, enriches the per-dashboard help modals with grouped
sections + a deep link, polishes empty states with guiding CTAs, and
introduces a small contextual `<HelpHint>` primitive for "(?)" tooltips
on labels that need just one sentence of explanation.

No business-logic / store / persistence changes. Schema unchanged at
v4. Route count: 27 → **28** (one new static `/user-guide`).

### A. Public guide page `/user-guide` — checkpoints

Steps:
- Hard refresh `/user-guide` at 360, 768, and 1366 px viewports with a
  clean `localStorage`.
- Read the hero copy. Tab through the page to inspect every focusable
  affordance.
- Open and close every FAQ `<details>` entry. Confirm the chevron
  rotates.

Expected:
1. **Hero header** — `<InfoPage>` shell rendered: orange eyebrow
   "Hướng dẫn sử dụng" → bold title "Cách dùng CaLẻ / ShiftNow" →
   substantial intro paragraph. Two-paragraph hero summary explaining
   what CaLẻ / ShiftNow is and that the MVP is mock-only.
2. **Two-column timeline at `md+`** — at 1366 px the worker (left) and
   employer (right) columns sit side-by-side inside `md:grid-cols-2`.
   Each column is a vertical timeline of 9 numbered step cards
   (`<StepCard n title body />`). Number badge is the same orange-
   gradient circle used on the homepage `<StepNumber>` so the surfaces
   feel like one product.
3. **Single-column timeline at `< md`** — at 768 px the layout
   collapses to a single column with the worker timeline first then
   the employer timeline below. Each step card stays readable; the
   number badge stays anchored to the left.
4. **Step content matches actual flows** — worker step 5 mentions all
   five apply-time gates (phone-verified, reputation ≥ 50, no time
   conflict, no schedule conflict, not full, not already applied);
   worker step 9 lists the +5 / −20 / −10 / threshold-50 reputation
   rules; employer step 4 lists the trust-tier deposit ratios
   (low 100% / medium 70% / high 50%); employer step 8 mentions the
   no-show boost-credit. None of this reads as generic AI filler.
5. **FAQ accordion** — five entries on native `<details>` /
   `<summary>`. Clicking the summary expands the answer. Custom
   chevron rotates 180° on `group-open`. No JS — works with
   JavaScript disabled.
6. **CTA row at the bottom** — two buttons: "Tìm ca làm ngay" →
   `/shifts` (primary orange gradient), "Đăng ca tuyển" →
   `/register?role=employer` (secondary white-bordered). Both
   `min-h-[44px]` tap targets, both reachable by tab.
7. **Server rendering** — `View Source` shows the full content in the
   initial HTML (no `'use client'` boundary on this page). The FAQ
   accordion works without JS.

### B. Navigation wiring — checkpoints

Steps:
- At 1366 px: hover the desktop nav `An toàn & hướng dẫn ▾` trigger.
  Confirm `Hướng dẫn sử dụng` is the 5th item and the trigger lights
  up when on `/user-guide`.
- At 360 px: open the mobile drawer. Walk every drawer tree (guest,
  logged-in worker, logged-in employer). Confirm `Hướng dẫn sử dụng`
  appears in the appropriate `Hướng dẫn` / `Hướng dẫn & hỗ trợ`
  section. Log in as admin and confirm the drawer admin tree does NOT
  carry the link.
- Scroll the footer at any width. `Pháp lý & hỗ trợ` column should now
  carry 5 links with `Hướng dẫn sử dụng` as the FIRST item.

Expected:
1. Desktop nav `An toàn & hướng dẫn ▾` shows 5 items: Cách hoạt động,
   An toàn & xác minh, Câu hỏi thường gặp, Xử lý tranh chấp, Hướng
   dẫn sử dụng (in that order). Trigger highlights when pathname is
   `/user-guide` (Phase 9W active-prefixes match).
2. Mobile drawer guest tree `Hướng dẫn & hỗ trợ` section: 6 items
   (Cách hoạt động, An toàn & xác minh, Câu hỏi thường gặp, Xử lý
   tranh chấp, Hướng dẫn sử dụng, Liên hệ hỗ trợ).
3. Mobile drawer worker tree `Hướng dẫn` section: 5 items (Điểm uy
   tín, Quy định huỷ ca, Hướng dẫn sử dụng, Câu hỏi thường gặp, Liên
   hệ hỗ trợ).
4. Mobile drawer employer tree `Hướng dẫn` section: 5 items (Đặt cọc
   & thanh toán, Đánh giá sau ca, Hướng dẫn sử dụng, Câu hỏi thường
   gặp, Liên hệ hỗ trợ).
5. Mobile drawer admin tree `Hướng dẫn` section: still 2 items
   (Chính sách xử lý tranh chấp, Liên hệ hỗ trợ). The user-guide
   link is intentionally NOT here.
6. Footer `Pháp lý & hỗ trợ` column at every breakpoint: 5 items
   ordered Hướng dẫn sử dụng → Điều khoản → Chính sách → Tranh chấp
   → Liên hệ.
7. Tapping any of the above navigates to `/user-guide` and the page
   loads without errors.

### C. Homepage CTA — checkpoints

Steps:
- Hard refresh `/` at 360 / 1366 px.
- Scroll to the "Cách hoạt động" section.
- Inspect the area below the two step columns.

Expected:
1. After the two existing step columns (worker + employer) inside the
   `Cách hoạt động` section, a single centered pill link reads "Xem
   hướng dẫn chi tiết →".
2. The pill uses the rest of the homepage's pill aesthetic — `min-h-
   [44px] rounded-full border-orange-200 bg-white/80 text-orange-700`
   with a hover state and `focus-visible:ring-2 ring-orange-400`.
3. Clicking the pill navigates to `/user-guide`.
4. The pill renders below the two step columns at all widths — at
   `< md` the columns are single-column stacked and the CTA still
   sits centered below.
5. NO duplicate "How it works" section was created; the CTA is
   additive inside the existing section.

### D. Help modal upgrades — checkpoints

Steps:
- Log in to each role and visit each of the 5 upgraded surfaces:
  - Worker dashboard (`/worker/dashboard`)
  - Worker schedule (`/worker/schedule`)
  - Employer dashboard (`/employer/dashboard`)
  - Employer schedule (`/employer/schedule`)
  - Admin dashboard (`/admin/dashboard`)
- On each surface, open the "Hướng dẫn sử dụng" button.
- Verify the modal contents.
- Click the "Xem hướng dẫn chi tiết →" CTA.
- Reopen the modal, click "Đã hiểu" close button.
- Repeat for `/employer/shifts/new` to confirm the legacy flat-bullet
  shape is preserved.

Expected:
1. **Modal opens** with the existing portal-mounted overlay (Phase 9H);
   uniform `bg-slate-900/60` backdrop, panel centered, `max-w-lg`
   width, no banding artefacts.
2. **Intro paragraph** sits below the modal title (`help.<surface>.intro`
   already in place from Phase 9F).
3. **Four grouped sections** rendered in this order, each with an
   uppercase orange heading + bullet list:
   - "Trang này dùng để" (1 bullet)
   - "Các con số / trạng thái quan trọng" (3–5 bullets)
   - "Thao tác chính" (3–6 bullets)
   - "Lỗi thường gặp" (2–3 bullets)
   Section heading style: `text-xs font-semibold uppercase tracking-
   wide text-orange-700`. Bullet items use the same orange dot from
   the existing flat-bullet path.
4. **Footer** is a `flex justify-between` row at `sm+`:
   - Bottom-left: "Xem hướng dẫn chi tiết →" CTA, orange ghost button
     styled to match the existing close button. Clicking navigates to
     `/user-guide` AND closes the modal.
   - Bottom-right: "Đã hiểu" primary close button, unchanged from
     Phase 9F.
   At `< sm` the footer stacks vertically with the close button on
   top so the primary close action stays reachable.
5. **`/employer/shifts/new` legacy shape preserved** — opening its
   help modal still renders the original flat bullet list (4 items),
   no section headings, no CTA in the footer. The close button sits
   right-aligned alone.
6. ESC, click-outside, and the close button all dismiss the modal.
7. Body scroll-lock applies while the modal is open and is restored
   on close.

### E. Empty state QA — checkpoints

Steps:
- Wipe `localStorage` so seed data fully resets, then individually
  trigger each empty-state surface:
  - Log in as a worker with no upcoming shifts → land on
    `/worker/dashboard`.
  - Same worker with no `Pending` applications → "Đơn đã ứng tuyển"
    section.
  - Same worker, click "Ca đã hoàn thành" stat tile → completed-shifts
    modal.
  - Same worker, click "Tổng thu nhập" stat tile → income modal.
  - Log in as an employer with no posted shifts → land on
    `/employer/dashboard`.
  - Same employer, click "Đơn chờ duyệt" stat tile → pending-applicants
    modal.
  - As employer, post a shift, simulate deposit, then visit
    `/employer/shifts/[id]` before any worker has applied → "Đơn ứng
    tuyển" section.

Expected:
1. **Worker dashboard "Ca làm sắp tới"** — warm-tone EmptyState card.
   Title: "Bạn chưa có ca làm nào sắp tới." Description: mentions
   `/shifts` and the deposit-only-shows rule. CTA "Tìm ca làm" → `/shifts`.
2. **Worker dashboard "Đơn đã ứng tuyển"** — warm-tone EmptyState
   (was subtle). Title: "Bạn chưa ứng tuyển ca nào." Description:
   explains where applications appear after applying. CTA "Khám phá
   ca làm" → `/shifts`.
3. **Worker completed-shifts modal** — warm EmptyState. Title: "Bạn
   chưa có ca hoàn thành nào." CTA "Tìm ca làm" → `/shifts`. Click
   the CTA closes the modal then navigates.
4. **Worker income modal** — warm EmptyState. Title: "Bạn chưa có
   thu nhập." Description mentions the MVP simulation. CTA "Tìm ca
   làm ngay" → `/shifts`. Click the CTA closes the modal then
   navigates.
5. **Employer dashboard "Ca làm sắp tới"** — copy upgraded:
   "Bấm 'Đăng ca mới' để tạo ca và mô phỏng đặt cọc. Ca chỉ công
   khai sau khi đặt cọc thành công." CTA "Đăng ca mới" →
   `/employer/shifts/new`.
6. **Employer pending-applicants modal** — warm EmptyState. Title:
   "Chưa có đơn ứng tuyển nào chờ duyệt." Description: encourages
   the employer to inspect the shift posting. CTA "Đăng ca mới" →
   `/employer/shifts/new`. Click the CTA closes the modal first.
7. **Employer manage shift `/employer/shifts/[id]`** — warm
   EmptyState. Title: "Chưa có ai ứng tuyển ca này." Description:
   suggests checking title/description/wage/requirements. NO CTA
   (per-shift surface, no useful cross-link).

### F. `<HelpHint>` QA — checkpoints

Steps:
- Hard refresh `/worker/dashboard`, `/employer/dashboard`,
  `/employer/shifts/[id]` (with at least one Approved applicant), and
  `/admin/dashboard` (Shifts tab).
- Hover each instrumented label / button.
- Tab to the `?` glyph (or to the surrounding focusable ancestor
  where applicable).
- Try ESC.

Expected:
1. **Worker dashboard StatTile labels** — Điểm uy tín, Hạn mức huỷ
   tuần, Tổng thu nhập, Ca đã hoàn thành. Each label has a small `?`
   glyph after the text. Hovering anywhere over the StatTile flips
   `group-hover:block` and reveals the tooltip with the matching hint
   copy (`hint.worker.*`). Tab to the StatTile `<button>` and the
   tooltip appears via `group-focus-within:block`. Tooltip stays for
   as long as the parent has hover or focus.
2. **Employer dashboard StatTile labels** — Đơn chờ duyệt, Tổng đã
   đặt cọc, Tổng đã thanh toán. Same hover / focus behavior. Tooltip
   text matches `hint.employer.*`.
3. **Employer manage shift applicant statuses** — `<HelpHint>` is a
   sibling of the Approved (`Đã duyệt`) and Confirmed (`Đã hoàn
   thành`) badges. Hovering the surrounding row reveals the tooltip
   for the relevant status. Other statuses (Pending, CheckedIn,
   CheckedOut, etc.) have no hint — verified by checking that no `?`
   glyph appears on those rows.
4. **Admin dashboard Override button** — `<HelpHint>` sits next to
   the "Override (khẩn cấp)" button on each ShiftRow. Hovering the
   button or the glyph reveals the tooltip with `hint.admin.override`
   copy.
5. ESC has no effect — `<HelpHint>` is a plain hover element with no
   state. The tooltip dismisses by losing hover or focus.
6. Click the `?` glyph — nothing happens. Glyph is `role="img"` with
   `cursor-help`; no click action.

### G. QA fix-up — StatTile tooltip clipping (2026-05-24)

A follow-on review (review pass after the initial Phase 9Y push) found
that hovering the `(?)` glyph on the worker / employer dashboard
`StatTile` cards surfaced a tooltip cropped to the card edges. Root
cause: the card's `baseClasses` carried `relative overflow-hidden` so
the `before:` pseudo-element accent bar would clip cleanly to the
`rounded-2xl` corner. The HelpHint component is intentionally
portal-less (so it can render server-side and nest inside `<button>`
ancestors), and its `absolute top-full` tooltip layer therefore got
clipped by any `overflow-hidden` ancestor — which the StatTile
violated. Affected: 4 worker tiles (Điểm uy tín / Hạn mức huỷ / Tổng
thu nhập / Ca đã hoàn thành), 3 employer tiles (Đơn chờ duyệt / Tổng
đã đặt cọc / Tổng đã thanh toán) — 7 of 12 instrumented hint sites.

Fix: dropped `overflow-hidden` from the card's `baseClasses` and moved
the corner clip onto the accent bar itself
(`before:rounded-t-2xl`). The card looks identical at rest; the
tooltip can now extend below the card without being cropped.

QA at 360 / 768 / 1366 px:

1. Hover any of the 7 instrumented stat tiles. The `(?)` glyph is
   visible inside the label row.
2. The tooltip below the glyph appears in full, with all ~25–35
   words of `hint.worker.*` / `hint.employer.*` text legible.
3. The tooltip extends below the card border without being clipped.
4. The card's top-edge orange/amber/emerald accent bar still tucks
   inside the rounded corner — no visual change at rest.
5. Tab focus on the StatTile button still surfaces the tooltip via
   `group-focus-within:block`.

The 2 remaining HelpHint sites (employer manage-shift status badges
+ admin Override button) are not inside any `overflow-hidden`
ancestor, so they were already fine.

### H. Re-run triggers

Re-run this audit after any change to:

- `src/components/ui/PageHelpButton.tsx` — particularly the
  `PageHelpButtonProps` API (`sections`, `cta`), the grouped-section
  render path, or the footer flex layout.
- `src/components/ui/HelpHint.tsx` — particularly the trigger
  composition (must remain non-focusable so it can nest inside
  `<button>` ancestors), the tooltip layer's `group-hover:block` /
  `group-focus-within:block` rules, or the `z-20` value.
- `src/app/user-guide/page.tsx` — particularly the worker / employer
  step content (must match the actual product flows referenced from
  HANDOFF.md Sections 4–5).
- `src/components/layout/NavBar.tsx` — particularly `SAFETY_GROUP`'s
  5 items + `activePrefixes`.
- `src/components/layout/MobileNav.tsx` — particularly the four
  drawer trees (`PUBLIC_SECTIONS`, `WORKER_SECTIONS`,
  `EMPLOYER_SECTIONS`, `ADMIN_SECTIONS`) and which trees carry the
  `Hướng dẫn sử dụng` link (admin tree must NOT).
- `src/components/layout/Footer.tsx` — particularly `LEGAL_COLUMN`'s
  link order (Hướng dẫn sử dụng must be FIRST).
- The 5 dashboard help-modal call sites
  (`src/app/worker/dashboard/page.tsx`,
  `src/app/worker/schedule/page.tsx`,
  `src/app/employer/dashboard/page.tsx`,
  `src/app/employer/schedule/page.tsx`,
  `src/app/admin/dashboard/page.tsx`).
- The empty-state copy for any of the eight surfaces listed in
  Section E.


## Phase 9Y-Fix — Contextual help redesigned as click/tap popover

Last reviewed: **2026-05-24, Phase 9Y-Fix click/tap popover redesign — NEEDS MANUAL VISUAL QA**.

This phase replaces the Phase 9Y hover-only `<HelpHint>` (a non-focusable `<span>` trigger that revealed a Tailwind `group-hover` tooltip layer) with a real click/tap popover (`<HelpPopover>`) backed by the existing portaled `<Modal>` primitive. Three problems drove the change:

1. The hover tooltip text was clipped inside the dashboard stat cards because the card carried `overflow-hidden`. Phase 9Y QA fix-up dropped that `overflow-hidden`, but readability on narrow viewports still suffered.
2. Touch devices have no hover, so mobile users could not reveal the hint at all.
3. The white-on-gray tooltip looked like a native browser `title=` tooltip rather than a CaLẻ-styled surface.

The new `<HelpPopover>` ships as a real `<button>` trigger that opens the existing `<Modal>` (already portaled to `document.body` since Phase 9H), so the popover is automatically immune to clipping ancestors and the user gets ESC + outside-click + close-button + "Xem hướng dẫn chi tiết →" footer link to `/user-guide`.

### A. Worker dashboard stat tiles

Open `/worker/dashboard` as any seed worker. Verify all 4 stat tiles:

1. **"Điểm uy tín"** — `?` glyph sits inline with the label text (small circular orange-bordered button, 16×16). Glyph is vertically aligned with the label baseline; no awkward shift.
2. **"Ca đã hoàn thành"** — same alignment.
3. **"Tổng thu nhập"** — same alignment, even though the value is a long VND number (e.g. `2.840.000 ₫`).
4. **"Hạn mức huỷ tuần"** — same alignment, with the suffix "còn lại" still readable.

Click / tap each `?` glyph:

5. A centered modal opens with the stat label as title, a 1–3 sentence description, and a footer with "Xem hướng dẫn chi tiết →" link + "Đã hiểu" close button.
6. The modal is NOT clipped by the stat card; it floats over the page (Modal is portaled to `body`).
7. ESC dismisses the modal.
8. Clicking outside the panel (on the dark backdrop) dismisses the modal.
9. The "Đã hiểu" button dismisses the modal.
10. The "Xem hướng dẫn chi tiết →" link navigates to `/user-guide` AND closes the modal.

Confirm tile click separation:

11. Click anywhere on the stat tile body (the value, the icon area, the empty space between label and value). The tile's detail modal opens — same behaviour as before Phase 9Y-Fix.
12. Click the `?` glyph specifically. ONLY the help popover opens. The tile's detail modal does NOT also open. (`HelpPopover` calls `stopPropagation()` + `preventDefault()` on its trigger.)
13. Tab through the dashboard with the keyboard. The stat tile shows a focus ring (from the absolutely-positioned overlay anchor's `focus-visible:ring`). Tab again — focus moves into the help button. Press Enter — popover opens. Press ESC — popover closes and focus returns to the trigger.

### B. Employer dashboard stat tiles

Open `/employer/dashboard` as any seed employer. The 6-tile grid is at `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`. Verify all 6 tiles now carry a `?` glyph (Phase 9Y-Fix added 3 new hints — activeShifts, postedShifts, completedShifts):

1. **Ca đang hoạt động** (NEW hint) — popover explains "Các ca đã đăng, đã đặt cọc và đang trong quá trình tuyển hoặc làm việc…"
2. **Đơn chờ duyệt** — popover explains "Số đơn ứng tuyển đang chờ bạn duyệt hoặc từ chối."
3. **Ca đã đăng** (NEW hint) — popover explains "Tổng số ca bạn đã tạo trên hệ thống…"
4. **Ca đã hoàn thành** (NEW hint) — popover explains "Ca đã được xác nhận hoàn thành sau khi người làm check-in/check-out…"
5. **Tổng đã đặt cọc** — popover explains "Tổng tiền công đang được giữ trong hệ thống…"
6. **Tổng đã thanh toán** — popover explains "Tổng tiền đã giải ngân cho người làm sau khi ca hoàn thành…"

Same QA steps as worker dashboard — tap glyph, popover not clipped, ESC dismisses, tile body click still opens detail modal.

At `< sm` (the `grid-cols-2` viewport), check that the label row does NOT wrap awkwardly when the `?` glyph is added next to a long label like "Tổng đã thanh toán". The label uses `inline-flex items-center gap-1` so the glyph sits inline with the last word of the label.

### C. Employer manage shift — applicant status

Open `/employer/shifts/[id]` as the shift's owner. For an applicant in the `Approved` or `Confirmed` state:

1. The status badge (e.g. green `Đã duyệt`) has a `?` glyph next to it.
2. Click the glyph — a small modal opens with title "Đã duyệt" / "Đã xác nhận" and description from `hint.employer.statusApproved` / `hint.employer.statusCompleted`.
3. ESC + close button dismiss.
4. The badge layout is `inline-flex items-center gap-1`, so adding the `?` doesn't break the row alignment.

Other application statuses (Pending, Rejected, CheckedIn, CheckedOut, etc.) have no `?` glyph — verified by visual scan.

### D. Admin dashboard Override button

Open `/admin/dashboard` as the seed admin. In the Shifts tab, expand any shift row:

1. The `Override (khẩn cấp)` button is followed by a `?` glyph.
2. Click the glyph — popover opens with title "Override (khẩn cấp)" + description from `hint.admin.override`.
3. ESC + close button dismiss.
4. Clicking the override button itself still opens the inline override editor — no regression.

### E. Mobile QA (touch)

This is the primary regression target — Phase 9Y's hover-only model failed entirely on touch.

At 360 / 390 / 430 px (real device or Chrome DevTools mobile emulation):

1. The `?` glyph is finger-tappable. The hit area is small (16×16 visual) but the surrounding label is part of a 36-px tall row, so a thumb tap reliably lands on the glyph.
2. Tap the glyph. The Modal opens centered over the page; backdrop is `bg-slate-900/60` (no `backdrop-blur`).
3. Body scroll locks while the modal is open (inherited from Modal's body-overflow-hidden hook).
4. Tap "Đã hiểu" — modal closes, body scroll restored, page scroll position preserved.
5. Tap outside the panel — modal closes.
6. Tap "Xem hướng dẫn chi tiết →" — navigates to `/user-guide` and modal closes.
7. The popover footer stacks vertically on mobile (`flex-col-reverse` for `< sm`) with the link button above the close button.

### F. No native tooltip regression

7. Confirm no `title=` attribute on any `?` glyph. Hovering on desktop should NOT surface a yellow native browser tooltip — only the click popover.
8. The popover panel uses CaLẻ identity (white panel, orange-bordered `?` trigger, orange `Đã hiểu` primary button, soft shadow, rounded `rounded-2xl` corners) — not a black/native look.

### G. Nested-button HTML check

9. Open DevTools Elements panel and inspect a stat tile in either dashboard. Confirm the structure:
   - Outer `<div>` (card)
   - First child: `<button>` (overlay anchor, `absolute inset-0`)
   - Second child: `<div>` (content layer, `pointer-events-none`)
     - Label `<p>` containing `<span>` (label text) + `<span class="pointer-events-auto">` (popover wrapper) > `<button>` (HelpPopover trigger)
10. Verify NO `<button>` is nested inside another `<button>`. Browsers render this as invalid HTML in the DOM but React would not warn at hydration; the visual symptom is bizarre click behaviour. The Phase 9Y-Fix overlay-anchor refactor avoids this entirely.

### H. Re-run triggers

Re-run this audit after any change to:

- `src/components/ui/HelpPopover.tsx` — particularly the trigger's `stopPropagation` / `preventDefault` calls, the modal `max-w-md` size, or the footer layout.
- The StatTile definitions in `src/app/worker/dashboard/page.tsx` and `src/app/employer/dashboard/page.tsx` — particularly the overlay anchor `<button class="absolute inset-0 z-0">` pattern and the `pointer-events-none` / `pointer-events-auto` z-stack.
- `src/i18n/vi.ts` — particularly the `hint.*` block (worker / employer / admin descriptions).
- `src/components/ui/Modal.tsx` — any change to portal target, body scroll lock, or backdrop styling will affect HelpPopover behaviour identically.


## Phase 9Y-Fix-3 — Help moved out of stat tiles into detail modals

Last reviewed: **2026-05-24, Phase 9Y-Fix-3 — NEEDS MANUAL VISUAL QA**.

Phase 9Y-Fix put a click-to-open `<HelpPopover>` next to every stat tile label. Manual QA flagged the inline `?` glyph as "still cluttered" on the dashboard overview at the 6-tile employer grid density. Phase 9Y-Fix-3 pulls the glyph out of the tiles entirely and surfaces the same explanation **inside each tile's detail modal**, anchored next to the modal title. The dashboard reads as a clean status board; the help is one click away (the same click the user was already going to make to drill into the metric).

### A. Worker dashboard overview is clean

Open `/worker/dashboard`. Verify the 4 stat tiles:

1. No `?` glyph on Điểm uy tín / Ca đã hoàn thành / Tổng thu nhập / Hạn mức huỷ tuần.
2. Each tile shows label + decorative right-side icon + big value + (on hover) "Xem chi tiết →" caret. Nothing else.
3. Click any tile body. The corresponding detail modal opens.
4. In the modal title row, a small orange-bordered `?` sits inline to the right of the title. Click / tap it.
5. A second smaller modal stacks above the detail modal with title and description. ESC dismisses. "Đã hiểu" dismisses. "Xem hướng dẫn chi tiết →" navigates to `/user-guide` and dismisses both modals.
6. Tab through the dashboard. Each tile is a single focusable element with a focus ring around the entire card; pressing Enter opens the detail modal. Inside the detail modal, tabbing reaches the title's `?` button.

### B. Employer dashboard overview is clean

Open `/employer/dashboard`. Verify the 6 stat tiles:

1. No `?` glyph on Ca đang hoạt động / Đơn chờ duyệt / Ca đã đăng / Ca đã hoàn thành / Tổng đã đặt cọc / Tổng đã thanh toán.
2. Same clean card structure as worker. The 6-tile grid at `lg:grid-cols-6` no longer has 6 tiny `?` markers competing for attention.
3. Click each tile body. Each opens its own detail modal:
   - **Ca đang hoạt động** → `ShiftListModal` with title "Ca đang hoạt động" + `?` next to title (popover description: "Các ca đã đăng, đã đặt cọc và đang trong quá trình tuyển hoặc làm việc.")
   - **Đơn chờ duyệt** → pending-applicants modal with `?` (description: "Số đơn ứng tuyển đang chờ bạn duyệt hoặc từ chối.")
   - **Ca đã đăng** → posted-shifts ShiftListModal with `?` (description: "Tổng số ca bạn đã tạo trên hệ thống, gồm cả nháp, đang tuyển, đã đầy, đã hoàn thành và đã huỷ.")
   - **Ca đã hoàn thành** → completed-shifts ShiftListModal with `?` (description: "Ca đã được xác nhận hoàn thành sau khi người làm check-in/check-out và bạn xác nhận.")
   - **Tổng đã đặt cọc / đã thanh toán** → shared payments modal. Help anchored next to title with the deposit explanation (the body itself already covers the payout half).

### C. Modal title alignment

7. The `?` glyph in the modal title row is vertically aligned with the title text via `inline-flex items-center gap-1.5`. No baseline drift, no overlap with the close button (which sits on the far right of the same flex row).
8. On `< sm` widths (mobile), the title row still fits within the modal panel. The `?` does not cause line-wrap of the title.
9. The popover that opens on top of the detail modal stacks correctly: detail modal at `z-[100]`, popover modal also at `z-[100]` but rendered later in DOM order so it visually sits above. The first ESC dismisses the popover; a second ESC dismisses the detail modal.

### D. Non-stat HelpPopover sites still work

Audited per Phase 9Y-Fix-3 spec section D — neither was clipped or visually broken; both kept.

10. `/employer/shifts/[id]` — Approved / Confirmed status badges still carry an inline `?` next to the badge. Click opens the popover. Layout is fine because each badge sits on its own row with `inline-flex items-center gap-1`.
11. `/admin/dashboard` Shifts tab — the Override button row still carries an inline `?`. Click opens the popover. Layout is fine because the action row is a flex-wrap row and the `?` aligns with the row baseline.

### E. Mobile QA

At 360 / 390 / 430 px:

12. Stat tile grid is the same clean 2-column or 1-column layout. No `?` markers visible.
13. Tap any tile. Detail modal opens centered, body scroll locks.
14. Tap the `?` in the modal title. The help popover stacks above. Tap "Đã hiểu" to dismiss the popover; the detail modal remains open behind it.
15. Tap outside the popover (on the dim part of the screen) — popover dismisses; detail modal remains.
16. No native `title=` tooltip ever surfaces.

### F. Re-run triggers

Re-run this audit after any change to:

- `src/components/ui/Modal.tsx` — particularly the `titleAccessory` slot rendering.
- `src/app/worker/dashboard/page.tsx` — StatTile signature (no `hint` prop) or any of the 4 detail modals' `titleAccessory` props.
- `src/app/employer/dashboard/page.tsx` — same, plus the `<ShiftListModal>` helper signature (must forward `titleAccessory`).
- `src/i18n/vi.ts` — the `hint.*` block (worker / employer / admin descriptions).
- `src/components/ui/HelpPopover.tsx` — popover trigger or modal body.


## Phase 9Y-Fix-4 — Browser-extension hydration noise suppression

Last reviewed: **2026-05-24, Phase 9Y-Fix-4**.

Manual QA reported a `Hydration failed` warning in dev. The error log called out `data-darkreader-mode`, `data-darkreader-scheme`, `data-darkreader-proxy-injected`, `data-darkreader-inline-stroke`, and the CSS variable `--darkreader-inline-stroke` — every one of those is injected by the **Dark Reader** browser extension before React hydrates. The app's SSR markup matches its client markup; the third-party extension is the source of the divergence. Phase 9Y-Fix-4 adds defensive `suppressHydrationWarning` flags on the affected nodes only, plus a documented audit confirming no real app hydration risks were introduced.

### A. Test with extensions enabled

1. Run `npm run dev`. Open the app in a regular Chrome / Firefox window with Dark Reader (or any equivalent that mutates DOM/CSS) enabled.
2. Reload `/` and watch the dev console.
3. Expected: no `Hydration failed because the server rendered HTML didn't match the client.` warning. Old warnings about `data-darkreader-*` attributes on `<html>` / `<body>` / `<svg>` should be suppressed.
4. If a warning appears for an attribute that ISN'T extension-injected (e.g. `data-react-something`, app className mismatch), treat it as a real app bug and investigate.

### B. Test in Incognito / extensions disabled

5. Reopen the app in an Incognito / Private window (Chrome / Firefox / Edge), or disable all extensions.
6. Reload `/` and the dashboards. Watch the dev console.
7. Expected: zero hydration warnings. The defensive flags should not be needed in this environment, but their presence is harmless.
8. If warnings appear in Incognito, treat them as real app hydration bugs:
   - Check for `new Date()` or `Date.now()` rendered as text inside SSR-able server components.
   - Check for `Math.random()` in render paths.
   - Check for `typeof window` branches that change rendered markup.
   - Check for localStorage-derived markup before hydration.
   - Check for invalid nested HTML (e.g. `<button>` inside `<button>`).
   - Phase 9Y-Fix-4 audited and cleared all five categories — current findings are documented in `HANDOFF.md` item 44 part C.

### C. Verify the surgical scope of suppression

9. Inspect `src/app/layout.tsx` — `<html>` and `<body>` should both carry `suppressHydrationWarning`.
10. Inspect the named SVG icons:
    - `src/app/page.tsx` — `ShieldIcon`, `WalletIcon`, `StarIcon`, `CalendarIcon`, `ScalesIcon`.
    - `src/components/layout/MobileNav.tsx` — `HamburgerIcon`.
    - `src/components/shift/ShiftCard.tsx` — `CalendarIcon`.
11. Each `<svg>` root should carry `suppressHydrationWarning`. Other SVGs in the codebase (deeper in the page tree, behind interaction) do not need the flag because they are not present at first paint and don't trigger the QA warning.

### D. Re-run triggers

Re-run this audit after any change to:

- `src/app/layout.tsx` — particularly the `<html>` / `<body>` element attributes.
- The named icon components in `src/app/page.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/shift/ShiftCard.tsx`.
- Any new top-of-page inline SVG with `stroke="currentColor"` (Dark Reader's primary target).
- Any change that adds a server-rendered `Date` / `Math.random` / `typeof window` branch.


## Phase 9Z — Visual identity system + Vietnam-network atmosphere

Last reviewed: **2026-05-24, Phase 9Z — NEEDS MANUAL VISUAL QA**.

Cross-product review flagged the homepage and guidance pages as functional but visually generic. Phase 9Z layers a coherent CaLẻ identity on top: a Vietnam-shift-network metaphor (curved route lines + pulsing nodes) executed as a reusable `<RouteBackdrop>` SVG, four new shared CSS utilities, a new homepage city strip, and a polished `<InfoPage>` shell. Dashboards intentionally unchanged.

### A. Homepage hero — Vietnam route backdrop

Open `/` at 1366 / 1440 px:

1. The hero panel still shows the existing Phase 9T blobs and Phase 9U mockup unchanged.
2. Behind the blobs (lower z layer), two thin curved orange dashed lines sweep diagonally across the panel — one top-left → mid-right, one top-right → mid-left.
3. Four small orange dots sit at the curve endpoints, each surrounded by a soft pulsing radial halo. Pulses are slow (4.4s loop, two endpoints on a 6.6s slow loop) and never reach below 55 % opacity at trough.
4. Below `md` (768 px) the backdrop is hidden — mobile hero stays calm.
5. Hero copy / CTAs / mockup readability unchanged.

### B. Homepage "Designed for Vietnam" city strip

Between Audience cards and How-it-works:

6. Eyebrow reads "Kết nối ca làm tại Việt Nam".
7. Title reads "Thiết kế cho nhu cầu ca làm linh hoạt".
8. Lead is a 1–2 sentence sentence about the local short-term shift market.
9. Below the lead, a 5-card grid: Hà Nội · TP.HCM · Đà Nẵng · Cần Thơ · Hải Phòng. Each card has a small orange location-pin glyph + city name + region subtitle.
10. The grid sits inside a `.section-shell` panel — soft warm gradient + inset orange ring + low-opacity dot-grid mask + a `<RouteBackdrop variant="page" />` decoratively behind the cards.
11. Hover any city card on desktop. The card lifts (`.card-lift` class) with a stronger orange shadow.
12. A small disclaimer beneath the grid reads "Hiện đang trong giai đoạn thử nghiệm — danh sách thành phố ở trên là minh hoạ định hướng, không phải dữ liệu phủ sóng thực tế." This is critical — the MVP does NOT overclaim coverage.
13. At `< sm` the grid stacks to 1 column. At `sm` it's 3 columns. At `lg` it's 5 columns.

### C. InfoPage shell upgrade

Visit `/user-guide`, `/about`, `/how-it-works`, `/safety`, `/faq`, `/disputes`, `/support`, `/terms`, `/privacy`, `/employer/payments`, `/employer/reviews`, `/worker/cancellation-policy`, `/worker/reputation-guide`:

14. Each page header now sits inside an `.info-page-hero` strip — soft warm orange gradient wash + inset orange ring + rounded panel.
15. A low-opacity `<RouteBackdrop variant="page" />` is decoratively layered behind the eyebrow / title / intro.
16. Body content layout unchanged — only the header strip is upgraded.
17. The header backdrop pulse nodes are visible at desktop widths but should not compete with the page title for attention.

### D. Dashboard cleanliness preserved

Visit `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`:

18. No `<RouteBackdrop>`. No new decorative SVGs. The Phase 9T `.bg-grid-soft` paper texture is the only background depth.
19. Stat tiles still clean per Phase 9Y-Fix-3 (no `?` glyphs, no inline help). Help lives inside detail modals' `titleAccessory` slot.

### E. Mobile behaviour (360 / 390 / 430 px)

20. Homepage hero: backdrop hidden, blobs hidden, mockup simplified, no horizontal scroll.
21. Homepage city strip: 1-column grid, each card full-width, no clipping, disclaimer fits.
22. InfoPage hero strip: gradient wash visible, backdrop is faint but not clipped, title wraps gracefully.

### F. Reduced-motion safety

23. With `prefers-reduced-motion: reduce` enabled (DevTools → Rendering → emulate CSS media → reduce), the route backdrop pulse stops (`.pulse-node` rule short-circuited via the `globals.css` media query block). City cards still hover with shadow but no transform.
24. Modals, toasts, entrance reveals, scroll-reveal — all already short-circuited from Phase 9D / 9O / 9R / 9U, no regression.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/RouteBackdrop.tsx` — particularly the variant SVG geometry or the curve/node count.
- `src/app/globals.css` — particularly `.pulse-node`, `.section-shell`, `.card-lift`, `.info-page-hero`, and the `prefers-reduced-motion` block.
- `src/app/page.tsx` — particularly the new city strip section between Audience and How-it-works.
- `src/components/layout/InfoPage.tsx` — particularly the header strip composition.
- `src/i18n/vi.ts` — particularly the `landing.vn.*` block.


## Phase 9Z-Fix-1 — Dashboard icon cleanup, applicant status help consistency, brand rename

Last reviewed: **2026-05-24, Phase 9Z-Fix-1 — NEEDS MANUAL VISUAL QA**.

Three follow-on consistency fixes after the Phase 9Z visual upgrade:

### A. Dashboard stat-tile cards are now clean

Open `/worker/dashboard` and `/employer/dashboard`:

1. No decorative glyph in the top-right corner of any stat tile. Only label + big value + (on hover) "Xem chi tiết →" caret.
2. The colored top accent bar (`before:` pseudo-element) is the only per-tile differentiator.
3. The grid reads as visually uniform across all 4 worker tiles and all 6 employer tiles.
4. Click the body of any tile — its detail modal still opens (regression check).

### B. Applicant status badges are uniform

Open `/employer/shifts/[id]` as the shift's owner with at least one applicant in each state:

5. Approved / Confirmed badges no longer carry a `?` glyph (Phase 9Z-Fix-1 removed the inline `<HelpPopover>`).
6. Pending / Rejected / CheckedIn / CheckedOut badges also have no `?` glyph (they never did — that was the inconsistency).
7. Applicant rows now look uniform regardless of state. Status meaning is conveyed by the tinted `<Badge>` color alone.
8. Long-form status explanations live on `/user-guide` (the worker steps + employer steps cover Approved / Confirmed implicitly).

### C. Brand rename consistency

Visit any of these pages and check both the browser tab title and on-page brand text:

9. `/` — homepage shows "CaLẻ / Now" in the navbar brand and footer brand.
10. `/login` — auth subtitle reads "Chào mừng bạn quay lại CaLẻ / Now".
11. `/register` — auth subtitle reads "Tham gia CaLẻ / Now ngay hôm nay".
12. `/about` — page title in browser tab reads "Giới thiệu — CaLẻ / Now"; H1 reads "Giới thiệu CaLẻ / Now"; intro mentions "CaLẻ (Now)".
13. `/user-guide` — H1 reads "Cách dùng CaLẻ / Now"; hero summary mentions "CaLẻ / Now".
14. `/safety`, `/faq`, `/disputes`, `/support`, `/terms`, `/privacy`, `/how-it-works`, `/employer/payments`, `/employer/reviews`, `/worker/cancellation-policy`, `/worker/reputation-guide` — each browser tab title ends with "— CaLẻ / Now".
15. No "ShiftNow" string visible anywhere in the rendered UI.
16. No inconsistent variants like "Ca Lẻ/Now" or "CaLẻ /Now".

### D. Re-run triggers

Re-run this audit after any change to:

- `src/i18n/vi.ts` — particularly `site.name`, `auth.login.subtitle`, `auth.register.subtitle`, `auth.side.join`, `landing.hero.featured.exploreAria`, `landing.vn.lead`, `help.workerDashboard.intro`.
- The 13 metadata-title pages listed in HANDOFF item 46.
- The shared `<InfoPage>` shell — the default `eyebrow` value reads `"CaLẻ / Now"`.
- StatTile signatures in worker/employer dashboards if a future revision wants to re-introduce a uniform glyph.


## Phase 9Z-Fix-2 — InfoPage body polish + currency unit consistency

Last reviewed: **2026-05-24, Phase 9Z-Fix-2 — NEEDS MANUAL VISUAL QA**.

Two follow-on fixes after Phase 9Z gave guidance pages a designed hero card:

### A. InfoPage body now flows from the hero

Open `/how-it-works` at 1366 px and 390 px:

1. The hero card (orange-gradient strip with eyebrow + title + intro + RouteBackdrop) reads exactly as in Phase 9Z.
2. The first content block sits visually connected to the hero strip's bottom edge — there's a small `-8px` tuck so it reads as one continuous surface, not "header floating above raw text".
3. Each of the four steps renders as a designed white card with a soft orange ring, a numbered orange-gradient circle in the left gutter, and the step body to the right of the badge.
4. Below the steps, the `<InfoSection title="Quyền và nghĩa vụ chính">` block reads as prose with a subtle orange left rail (no full card — intentionally lighter than the step cards).
5. Vertical rhythm between blocks is consistent (`1.5rem` gap).
6. At 360 / 390 px the step-card left gutter (`3.75rem`) still leaves enough room for the body text; no clipping, no horizontal scroll.

### B. InfoSection orange rail on simple guidance pages

Open `/about`, `/safety`, `/faq`, `/disputes`, `/support`, `/employer/payments`, `/employer/reviews`, `/worker/cancellation-policy`, `/worker/reputation-guide`:

7. Every `<InfoSection>` block carries a subtle orange left rail (2px solid `rgba(251,146,60,0.25)`).
8. Section headings render as designed (`text-[17px]`, weight 600, gray-900) — no longer raw bold paragraphs.
9. Adjacent sections feel connected; no full-card heaviness.

### C. Legal pages stay readable

Open `/terms` and `/privacy`:

10. The body still reads as prose — orange rail is subtle enough that the page doesn't feel like a stack of boxes.
11. Long-form legal text remains comfortable to read.
12. CTA row at the bottom unchanged.

### D. Currency unit consistency

Visit `/employer/shifts/new`, `/shifts`, `/shifts/[id]`, `/worker/dashboard`, `/employer/dashboard`, the homepage hero `<FeaturedJobMockup>`:

13. Every visible amount renders as `35.000 đ` / `1.200.000 đ` (lowercase `đ` suffix). No `₫` glyph anywhere.
14. The wage input helper line on `/employer/shifts/new` reads `(ba mươi lăm nghìn đồng)` — `đồng` spelled out, not `VNĐ`.
15. The form label reads `Lương theo giờ (đ)` — lowercase `đ` in the parenthetical, matching the suffix the user will see.
16. Worker dashboard `Tổng thu nhập` tile shows the income with `đ`.
17. Employer dashboard `Tổng đã đặt cọc` / `Tổng đã thanh toán` tiles show amounts with `đ`.
18. The user-guide step about "Đăng ca tuyển" mentions `lương theo giờ (đ)`.
19. No `VNĐ`, `VND`, `vnd`, or `Đ` (capital) appears in user-visible copy on any page.
20. Numbers themselves are unchanged — `formatVND(35000)` still returns `35.000 đ`; calculations, deposit ratios, payouts, totals are all the same.

### E. Re-run triggers

Re-run this audit after any change to:

- `src/lib/format.ts` — particularly `formatVND` and the underlying `Intl.NumberFormat` config.
- `src/lib/numberVN.ts` — particularly `numberToVietnameseCurrency`.
- `src/i18n/vi.ts` — particularly `form.hourlyWage` and `common.currency`.
- `src/components/layout/InfoPage.tsx` — body wrapper, `<InfoSection>`, `<InfoStep>`.
- `src/app/globals.css` — `.info-content`, `.info-section-card`, `.info-step-card`, `.info-step-badge`.
- Any guidance page that imports from `@/components/layout/InfoPage`.


## Phase 9Z-Fix-3 — InfoPage hero/body alignment + public nav re-routing + public motion polish

Last reviewed: **2026-05-24, Phase 9Z-Fix-3 — NEEDS MANUAL VISUAL QA**.

Three follow-on fixes after Phase 9Z-Fix-2's body polish:

### A. InfoPage hero ↔ body alignment

Open `/user-guide`, `/how-it-works`, `/about`, `/safety`, `/faq`, `/disputes`, `/support`, `/employer/payments`, `/employer/reviews`, `/worker/cancellation-policy`, `/worker/reputation-guide` at 1366 px:

1. The hero card title (e.g. "Cách dùng CaLẻ / Now") and the first body section heading both start at the same X coordinate. Use a vertical guide ruler in DevTools — hero title and body heading should align within 1 px.
2. Body sections and step cards align with the hero card's left edge throughout the page.
3. At `< sm` (mobile), the body wrapper's horizontal padding drops to 16 px — content still aligns with hero text edges.
4. Legal pages (`/terms`, `/privacy`) — alignment holds; prose stays comfortable.

### B. Public navigation re-routing

5. Open the homepage in an Incognito / Private window (or simply log out). The desktop nav at `xl+` shows the public guest sections.
6. Hover/click "Người lao động" dropdown:
   - "Tìm ca làm" → `/shifts` (public route, unchanged)
   - "Hồ sơ & điểm uy tín" → `/worker/reputation-guide` (public guide)
   - "Lịch cá nhân" → `/user-guide` (NEW: was `/worker/schedule` which is protected; now points to public guide that explains the schedule feature)
   - "Quy định huỷ ca" → `/worker/cancellation-policy` (public guide)
7. Hover/click "Nhà tuyển dụng" dropdown:
   - "Đăng ca tuyển" → `/how-it-works` (NEW: was `/employer/shifts/new` which is protected; now points to the four-step public flow)
   - "Quản lý ứng viên" → `/user-guide` (NEW: was `/employer/dashboard` which is protected)
   - "Đặt cọc & thanh toán" → `/employer/payments` (public guide, unchanged)
   - "Đánh giá sau ca" → `/employer/reviews` (public guide, unchanged)
8. None of the items above should trigger a redirect to `/login`. Each should land on a readable public page.
9. **Direct URL still protects.** Navigate manually to `/worker/schedule`, `/employer/shifts/new`, `/employer/dashboard` while logged out — `RoleGuard` should bounce to `/login` exactly as before. Auth protection is unchanged.
10. Mobile drawer: open at `< xl` while logged out. Same re-routing applies in the "Người lao động" and "Nhà tuyển dụng" sections of the drawer.
11. Logged in as a worker — the dropdown / drawer should show the original protected routes (`/worker/schedule` etc.). The role-aware groups are untouched.
12. Same check for logged-in employer.

### C. Public motion polish

13. Hover the "Xem hướng dẫn chi tiết" pill on the homepage's "Cách hoạt động" section — the inner `→` arrow shifts 4 px to the right, body of pill itself doesn't translate.
14. Hover any of the four cards in the homepage Safety section — the same arrow nudge fires on the inner `→`. Card itself also lifts (existing `.motion-lift`).
15. Visit `/user-guide` and hover one of the InfoPage CTA buttons at the bottom ("Tìm ca làm ngay" / "Đăng ca tuyển") — the trailing `→` arrow shifts right.
16. None of the existing motion (Reveal scroll-in, entrance-up, modal pop, toast slide, route-node pulse) regresses — verify by scrolling the homepage and watching the existing rhythm.

### D. Reduced motion

17. With `prefers-reduced-motion: reduce` enabled (DevTools → Rendering → emulate CSS media), the arrow nudges stop firing on hover. Cards stop lifting (Phase 9Y-Fix-3 rule preserved). New `.motion-fade-up` keyframe also short-circuits.
18. The pulse on `<RouteBackdrop>` nodes still stops (Phase 9Z preserved).

### E. Dashboard non-regression

19. Visit `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`. None of the public motion utilities are applied there. Stat tiles remain clean (Phase 9Y-Fix-3 + Phase 9Z-Fix-1 preserved).
20. No `<RouteBackdrop>` on dashboards. No `.cta-arrow-nudge` on dashboard CTAs.

### F. Re-run triggers

Re-run this audit after any change to:

- `src/components/layout/NavBar.tsx` — particularly `WORKER_GROUP_PUBLIC`, `EMPLOYER_GROUP_PUBLIC`, and the `<PublicNav>` block.
- `src/components/layout/MobileNav.tsx` — particularly `PUBLIC_SECTIONS`'s "Người lao động" and "Nhà tuyển dụng" entries.
- `src/app/globals.css` — particularly `.info-content` `padding-inline`, `.motion-fade-up`, `.cta-arrow-nudge` + `.cta-arrow`, `.gradient-drift`, `.public-section-rhythm`, and the `prefers-reduced-motion` block.
- `src/components/layout/InfoPage.tsx` — particularly the CTA row.
- `src/app/page.tsx` — homepage CTA pills, Safety section card grid.


## Phase 9Z-Fix-4 — User-friendly guide copy + feature anchor sections

Last reviewed: **2026-05-24, Phase 9Z-Fix-4 — NEEDS MANUAL VISUAL QA**.

Phase 9Z-Fix-3 re-pointed logged-out worker / employer dropdowns to public guides, but manual QA found the guides still read as developer prose with raw route paths and dropped readers at the top of a long generic page instead of on the specific feature they clicked. Phase 9Z-Fix-4 closes both gaps.

### A. Raw route paths scrubbed

Open `/user-guide` and read every step body in both worker and employer columns:

1. No string starting with `/register`, `/login`, `/worker/`, `/employer/`, `/shifts`, `/disputes`, etc. visible in any prose.
2. Worker step 1 reads `Mở trang Đăng ký, chọn "Tôi muốn tìm ca làm" ...`
3. Worker step 2 reads `Mở mục Hồ sơ trong menu Người lao động ...`
4. Worker step 4 reads `Bấm "Tìm ca làm" trên thanh điều hướng để xem các ca đang tuyển ...`
5. Worker step 7 reads `... mở trang Tổng quan của người lao động, chọn ca sắp diễn ra và bấm "Check-in" ...`
6. Employer step 1 reads `Mở trang Đăng ký, chọn "Tôi cần tuyển người làm" ...`
7. Employer step 2 reads `Mở mục Hồ sơ trong menu Nhà tuyển dụng ...`
8. Employer step 3 reads `Trong menu Nhà tuyển dụng, chọn "Đăng ca tuyển" ...`
9. Employer step 5 reads `Đơn ứng tuyển hiển thị trong trang quản lý chi tiết của ca tuyển và trong ô "Đơn chờ duyệt" trên Tổng quan của nhà tuyển dụng ...`
10. FAQ "Tôi cần làm gì khi có tranh chấp?" no longer mentions `/disputes` directly — it references the page by its name "Chính sách xử lý tranh chấp".

### B. Feature anchor sections

11. Visit `/user-guide` — five new feature cards render above the timeline columns:
    - "Lịch cá nhân hoạt động như thế nào?" (`#worker-schedule`)
    - "Điểm uy tín của người lao động" (`#worker-reputation`)
    - "Đăng ca tuyển diễn ra như thế nào?" (`#employer-post-shift`)
    - "Quản lý ứng viên như thế nào?" (`#employer-applicants`)
    - "Đặt cọc và thanh toán" (`#employer-payments`)
12. Each card has an orange eyebrow, a bold title, 3–4 bullet points in plain Vietnamese, and a primary CTA + optional secondary CTA.
13. Visit `/user-guide#worker-schedule` directly — the page scrolls so the heading is fully visible (not covered by the sticky header). Same for the other four anchors.
14. Hover the primary "Đăng nhập" CTA — the trailing `→` arrow shifts 4 px right (Phase 9Z-Fix-3 `.cta-arrow-nudge`).

### C. Public nav anchored deep-links

15. Log out (or use Incognito). Open the desktop nav at `xl+`.
16. Click "Người lao động" → "Lịch cá nhân" — URL becomes `/user-guide#worker-schedule` and the page scrolls to that section.
17. Click "Nhà tuyển dụng" → "Đăng ca tuyển" — URL becomes `/user-guide#employer-post-shift`.
18. Click "Nhà tuyển dụng" → "Quản lý ứng viên" — URL becomes `/user-guide#employer-applicants`.
19. None of these clicks should trigger a `/login` redirect.
20. Mobile drawer at `< xl` — the same three items use the same anchor URLs.

### D. RoleGuard non-regression

21. While logged out, paste each protected URL directly into the address bar:
    - `/worker/schedule`
    - `/worker/profile`
    - `/worker/dashboard`
    - `/employer/shifts/new`
    - `/employer/dashboard`
    - `/employer/schedule`
    - `/employer/profile`
    - `/employer/shifts/[any-id]`
22. Each should still redirect to `/login`. Auth protection unchanged.

### E. Logged-in role nav

23. Log in as a worker (any seed account). Click the "Người lao động" dropdown.
24. "Lịch cá nhân" should now point to the protected `/worker/schedule` (not the anchor) — role-aware nav uses the original `WORKER_GROUP`, which is unchanged.
25. Same check as employer — "Đăng ca tuyển" and "Quản lý ứng viên" route to `/employer/shifts/new` and `/employer/dashboard` respectively.

### F. Re-run triggers

Re-run this audit after any change to:

- `src/app/user-guide/page.tsx` — particularly the worker / employer step bodies, the `<FeatureGuide>` primitive, and any new anchor section.
- `src/components/layout/NavBar.tsx` — `WORKER_GROUP_PUBLIC`, `EMPLOYER_GROUP_PUBLIC` href values.
- `src/components/layout/MobileNav.tsx` — `PUBLIC_SECTIONS` worker + employer entries.
- The HANDOFF.md "User-facing copy must not contain raw route paths" rule (Section 11).


## Phase 9Z-Fix-5 — HelpPopover deep-links to specific guide anchors + enriched guide examples

Last reviewed: **2026-05-24, Phase 9Z-Fix-5 — NEEDS MANUAL VISUAL QA**.

Phase 9Y-Fix-3 routed every dashboard stat-tile help into the corresponding detail-modal `titleAccessory` slot, and Phase 9Z-Fix-4 added five public-nav feature anchors to `/user-guide`. But HelpPopover CTAs still defaulted to a generic `/user-guide` link. Phase 9Z-Fix-5 wires every popover to a specific anchor and enriches every guide section with concrete examples + next-action lines.

### A. Contextual help deep-link QA

Open the worker dashboard. Click each stat tile to open its detail modal, then click the `?` glyph next to the modal title and confirm the "Xem hướng dẫn chi tiết →" CTA points to the right anchor:

1. **Điểm uy tín** modal `?` → `/user-guide#worker-reputation`
2. **Ca đã hoàn thành** modal `?` → `/user-guide#worker-completed-shifts`
3. **Tổng thu nhập** modal `?` → `/user-guide#worker-total-income`
4. **Hạn mức huỷ tuần** modal `?` → `/user-guide#worker-cancellation-quota`

Same on the employer dashboard:

5. **Ca đang hoạt động** modal `?` → `/user-guide#employer-active-shifts`
6. **Đơn chờ duyệt** modal `?` → `/user-guide#employer-pending-applications`
7. **Tất cả ca đã đăng** modal `?` → `/user-guide#employer-posted-shifts`
8. **Ca đã hoàn thành** modal `?` → `/user-guide#employer-completed-shifts`
9. **Payments modal title `?`** (opens from either deposit or paid-out tile) → `/user-guide#employer-total-deposit`
10. **Payments modal body — Tổng đã đặt cọc** inline `?` → `/user-guide#employer-total-deposit`
11. **Payments modal body — Tổng đã thanh toán** inline `?` → `/user-guide#employer-total-paid`

### B. Anchor scroll QA

12. Click each CTA above. Confirm the page scrolls so the anchored `<FeatureGuide>` heading is fully visible — not covered by the sticky `z-30` header.
13. The matching guide section reads with: orange eyebrow + bold title + 3–4 explanatory bullets + tinted "Ví dụ:" callout + "Tiếp theo:" line.

### C. Guide example/readability QA

Read each of the 14 feature cards on `/user-guide`:

14. Each card has a concrete example with realistic Vietnamese-context numbers (e.g. `45.000 đ/giờ`, `196.000 đ`, `7 ngày`, `Đăng nhập`, `Tổng quan người lao động`).
15. Examples don't reference raw URLs (`/worker/dashboard` etc.); they reference visible UI labels.
16. Each card ends with a "Tiếp theo:" prompt telling the user what to do.
17. Cards explaining MVP-mock features clearly say so (e.g. "Trong bản MVP, thao tác đặt cọc chỉ là mô phỏng, chưa có giao dịch thật.").

### D. Guide grouping QA

18. The 14 feature cards are organised into three groups with eyebrow + title + lead:
    - "Dành cho người lao động" — 5 cards covering schedule, reputation, completed, total income, cancellation quota
    - "Dành cho nhà tuyển dụng" — 6 cards covering post-shift, applicants, active, pending, posted, completed
    - "Thanh toán, đặt cọc và uy tín" — 3 cards covering payments overview, total deposit, total paid
19. The 9-step worker / employer timelines + FAQ remain below the grouped cards (Phase 9Z-Fix-4 layout preserved).
20. Public-nav anchored deep-links from Phase 9Z-Fix-4 still work (`/user-guide#worker-schedule`, `/user-guide#employer-post-shift`, `/user-guide#employer-applicants`).

### E. Mobile anchor QA

At 360 / 390 / 430 px:

21. Open a stat detail modal, tap its `?` glyph. Tap the "Xem hướng dẫn chi tiết →" link.
22. After dismissing the popover, the page scrolls to the anchored section. Heading is fully visible above the sticky header.
23. The "Ví dụ:" and "Tiếp theo:" blocks fit within the card on mobile without horizontal overflow.

### F. Re-run triggers

Re-run this audit after any change to:

- `src/app/user-guide/page.tsx` — particularly `<FeatureGuide>`, `<GuideGroup>`, or any new anchor section.
- `src/app/worker/dashboard/page.tsx` — `<HelpPopover>` `learnMoreHref` props.
- `src/app/employer/dashboard/page.tsx` — `<HelpPopover>` `learnMoreHref` props (modal title + payments-modal body inline).
- `src/components/ui/HelpPopover.tsx` — particularly the `learnMoreHref` rendering.
- The HANDOFF.md "HelpPopover CTAs must deep-link to specific guide anchors" rule (Section 11).


## Phase 10A — Verification data model + admin queue + per-role profile UI

Last reviewed: **2026-05-25, Phase 10A — NEEDS MANUAL VISUAL QA**.

First foundation phase for real-user-grade verification. Schema bumped 4 → 5; reseed automatically applies. Existing seed data continues to render correctly because the new slices have their own JSON file (`src/data/seed/verifications.json`) with worker + employer mock submissions covering every status state.

### A. Admin verification queue

Log in as admin (`admin@cale.vn` / `demo`) and visit `/admin/dashboard`:

1. Tab strip shows the new "Xác minh" tab as the 5th button after Tranh chấp.
2. Click the tab. Three subsections render:
   - **Người lao động chờ duyệt** — worker-003 (Bằng lái xe) Pending. The card shows full identifier `B1-079123987` plus the masked form `B1-079•••987` below it, three image preview blocks (Mặt trước / Mặt sau / Selfie), and three action buttons (Duyệt / Từ chối / Yêu cầu bổ sung).
   - **Nhà tuyển dụng chờ duyệt** — employer-003 (Giấy phép sự kiện) Pending. Card shows the file name + MVP-mock disclaimer.
   - **Lịch sử duyệt gần đây** — last 10 reviewed actions. Should include worker-001 NationalId Approved, worker-002 StudentCard Approved, worker-004 NationalId NeedsMoreInfo (with rejection reason visible), employer-001's three approved docs, employer-002's three approved docs, employer-003's NeedsMoreInfo doc.
3. Click Duyệt on worker-003. A success toast fires; the card disappears from the Pending section and a new entry appears in Lịch sử with status `Đã xác minh`. The affected worker (worker-003) gets a notification with link to `/worker/profile`.
4. Click Từ chối on employer-003 Pending Giấy phép sự kiện. A modal opens asking for reason. Submit empty → error toast "Vui lòng nhập lý do." Submit with text → success toast; card moves from Pending to Lịch sử with status `Bị từ chối` and the reason visible.
5. Click Yêu cầu bổ sung on a fresh Pending item. Same modal, status becomes `Cần bổ sung` after submit.
6. Already-Approved or already-Rejected items don't appear in Pending, so re-action is naturally prevented. (The store also returns `ALREADY_REVIEWED` if called directly.)

### B. Worker profile verification card

Log in as a worker (`an.nguyen@gmail.com` / `demo`) and visit `/worker/profile`:

7. Below the existing legacy "Xác minh" toggle card, a new "Xác minh danh tính" card renders with the lead "Bạn có thể xác minh danh tính bằng CCCD/CMND, thẻ sinh viên hoặc bằng lái xe."
8. Three rows: CCCD / CMND, Thẻ sinh viên, Bằng lái xe — each with a description + status badge.
9. worker-001's CCCD shows `Đã xác minh` (green). The other two rows show `Chưa gửi` (neutral) with a "Gửi tài liệu (mô phỏng)" button.
10. Click Gửi tài liệu on Bằng lái xe — a Pending record is created in the store + persisted; the badge flips to `Đang chờ duyệt` (warning) and the button disappears for that row. A success toast fires.
11. Footer reads: "Trong bản MVP, tài liệu là mô phỏng — không có upload thật. Quản trị viên là người duy nhất xem tài liệu đầy đủ; nhà tuyển dụng chỉ thấy huy hiệu và số đăng ký dạng rút gọn."

For worker-004 (`chi.pham@gmail.com`), the CCCD row shows `Cần bổ sung` (warning) with the rejection reason "Ảnh mặt sau bị mờ, vui lòng chụp lại rõ hơn để dễ đối chiếu." plus a "Gửi lại" button.

### C. Employer profile verification card

Log in as an employer (`lien@quanphoha.vn` / `demo`) and visit `/employer/profile`:

12. New "Xác minh nhà tuyển dụng" card between main profile card and worker-feedback panel.
13. Account-type selector with four pills: Cá nhân thuê ngắn hạn / Hộ kinh doanh / Doanh nghiệp / Agency / Sự kiện. Default selected: Hộ kinh doanh.
14. Click "Cá nhân thuê ngắn hạn" — the hint copy reads exactly "Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và đặt cọc 100% tiền công."
15. Below the selector, the doc list adapts to the selected account type: Individual shows RepresentativeId / WorkplacePhoto / AddressProof; HouseholdBusiness shows RepresentativeId / BusinessLicense / StorefrontPhoto; Company shows BusinessLicense / TaxCode / StorefrontPhoto / AddressProof; AgencyEvent shows BusinessLicense / EventProof / WorkplacePhoto / GoogleMapsOrFanpage.
16. employer-001 (Phở Hà) on HouseholdBusiness shows all three rows as `Đã xác minh`. Submit buttons hidden.
17. Below the selector, "Tất cả tài liệu đã gửi" history lists all 3 of employer-001's approved documents with type, account-shape, date, and status badge.

### D. Privacy-respecting applicant view

Log in as employer-001 and visit `/employer/shifts/[id]` for a shift with applicants (e.g. shift-007):

18. Each applicant row shows the existing reputation + verification flags as before.
19. **NEW:** Applicants whose identity is verified show a green chip below their name: `Đã xác minh · {method label} · {masked identifier}`. For worker-001 the chip reads `Đã xác minh · CCCD / CMND · 0791•••••234`. For worker-002 it reads `Đã xác minh · Thẻ sinh viên · SV2024-•••54`.
20. **CRITICAL — privacy check:** The chip shows ONLY the method label + masked identifier. Open browser DevTools and inspect the row — confirm the rendered HTML does NOT contain the full identifier (`079198001234` / `SV2024-87654`), document image URLs, or selfie URLs. The `<WorkerSummaryRow>` component reads ONLY the public-safe selector output.
21. Workers without an approved identity document (e.g. worker-003 if Pending; worker-006 if no submission) show NO chip.

### E. /user-guide privacy section

Visit `/user-guide#verification-overview`:

22. Section heading "Cách xác minh hoạt động" lands fully visible (sticky-nav clearance via `scroll-mt-24`).
23. 4 bullets cover: 3 worker methods, 4 employer types, admin-only full-doc privacy, on-site recheck possibility.
24. The `Ví dụ:` callout reads exactly "Bạn xác minh bằng CCCD. Trong danh sách ứng viên của nhà tuyển dụng, họ sẽ thấy chip xanh «Đã xác minh · CCCD / CMND · 0791•••••234». Họ KHÔNG thấy ảnh CCCD đầy đủ của bạn."
25. The `Tiếp theo:` line points to the profile pages.

### F. Mobile QA

At 360 / 390 / 430 px:

26. Admin queue cards stack with action buttons wrapping below the card body. No horizontal overflow.
27. Worker profile verification card stacks vertically; submit buttons remain tappable.
28. Employer profile account-type selector wraps to multiple lines; doc list rows stack.
29. Applicant identity chip wraps if needed; masked identifier never gets cut off.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/types/index.ts` — particularly the verification model.
- `src/stores/verificationStore.ts` — store actions or selector helpers.
- `src/data/persistence.ts` — schema bump path.
- `src/data/seed/verifications.json` — seed records.
- `src/app/admin/dashboard/VerificationsPanel.tsx` — admin queue UI.
- `src/components/user/WorkerSummaryRow.tsx` — `identityBadge` prop.
- `src/app/employer/shifts/[id]/page.tsx` — privacy-safe summary computation.
- The new HANDOFF Section 11 rules on document privacy, identity methods, and employer types.


## Phase 10A-Fix-1 — Clickable history details + locked employer type + type-change request flow + admin submission notifications

Last reviewed: **2026-05-25, Phase 10A-Fix-1 — NEEDS MANUAL VISUAL QA**.

Three follow-on gaps from 10A:

### A. Clickable verification history detail

Log in as admin, visit `/admin/dashboard` Xác minh tab, scroll to "Lịch sử duyệt gần đây":

1. Each history row is now a focusable button (hover shows orange-50 background; keyboard tab cycles through them).
2. Click any row — a Modal opens titled "Chi tiết tài liệu xác minh" with the full mock-data dump:
   - Account name + role + (for employers) account-shape
   - Document type label
   - Status badge + submitted/reviewed timestamps + reviewing admin ID
   - Rejection reason callout (red box) when present
   - Notes (if any)
   - **Worker docs only:** full identifier with masked-form readout below + 3-tile mock document preview (Mặt trước / Mặt sau / Selfie) showing image URLs + "Mô phỏng" disclaimer
   - **Employer docs only:** mock file name in dashed-border preview block
3. Modal dismisses via ESC, outside click, or "Đóng" button.

### B. Locked employer type — first-set onboarding

Log in as employer-001 (Phở Hà). The employer record has `employerType: 'business'` from Phase 6 seed but no `employerType10A`. The fallback in `resolveEmployerType()` returns `'HouseholdBusiness'` so the locked card renders directly without the first-set picker.

To test the first-set picker, manually clear the employer's `employerType` and `employerType10A` via DevTools (or use the schema-bump reseed if employer-003 ends up without either):

4. The card title "Xác minh nhà tuyển dụng" + intro "Chọn loại tài khoản phù hợp nhất. Loại tài khoản dùng để xác định giấy tờ cần xác minh và sẽ được khoá sau khi bạn xác nhận..."
5. Four-pill selector with all four account types.
6. Per-pill hint adapts as user clicks. Individual reads literally: "Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và đặt cọc 100% tiền công."
7. Click "Xác nhận và khoá loại tài khoản" — the employer's `employerType10A` is written, success toast fires, and the card flips to the locked display on next render.

### C. Locked employer type — locked display

For employer-001 with the resolved `'HouseholdBusiness'`:

8. Read-only orange-bordered card shows "Loại tài khoản hiện tại: Hộ kinh doanh" + the per-shape hint copy.
9. Below that, "Yêu cầu đổi loại tài khoản" CTA button.
10. Read-only — no inline pill selector. The free-edit selector that 10A shipped is gone.
11. Below the type card, "Tài liệu cần nộp" section adapts to the resolved type's required docs.
12. Footer copy: "Loại tài khoản dùng để xác định giấy tờ cần xác minh. Bạn không thể tự đổi loại tài khoản sau khi đã chọn..."

### D. Type-change request flow

13. Click "Yêu cầu đổi loại tài khoản". A Modal opens with current type display + 3-pill selector (excludes the current type) + required reason textarea.
14. Submit empty reason → toast "Vui lòng nhập lý do."
15. Submit with text — success toast "Đã gửi yêu cầu đổi loại tài khoản. Quản trị viên sẽ xem xét." The card now shows an amber "Đang chờ duyệt" banner with the request details and disables the CTA.
16. Submit a second request while one is Pending → toast "Bạn đã có một yêu cầu đang chờ duyệt."
17. As admin, refresh `/admin/dashboard` Xác minh tab. The "Yêu cầu đổi loại tài khoản" subsection (newly added between "Nhà tuyển dụng chờ duyệt" and "Lịch sử duyệt gần đây") shows the request with current → requested type chips + reason callout + Duyệt/Từ chối buttons.
18. Click Duyệt: the request is approved, the employer's `employerType10A` flips to the requested value, the employer gets a notification with deep link to `/employer/profile`, and the doc list adapts (existing approved docs stay in history; the new required-doc list is what shows up at the top).
19. Click Từ chối on a fresh Pending request: a Modal collects the admin reason (required), submission rejects the request and notifies the employer that their type stays unchanged.

### E. Admin notifications on submission

20. Log in as a worker, open `/worker/profile`, submit a mock identity document. Switch to admin → the notification bell shows a new entry with title "Có yêu cầu xác minh mới" and body "{workerName} đã gửi xác minh bằng {documentType}." Click → lands on `/admin/dashboard?tab=verifications`.
21. Log in as an employer, submit a verification document on `/employer/profile`. Admin notification fires with title "Nhà tuyển dụng gửi xác minh mới" and body "{employerName} đã gửi tài liệu {documentType}."
22. Submit a type-change request as employer. Admin notification fires with title "Có yêu cầu đổi loại tài khoản" and body "{employerName} muốn đổi từ {currentType} sang {requestedType}."
23. With multiple admins seeded, every active admin receives all three notifications. (Currently only `admin-001` exists in seed, so only one user gets each ping.)

### F. Privacy non-regression

24. Log in as employer, visit `/employer/shifts/[id]` for a shift with applicants. The green identity-verified chip on `<WorkerSummaryRow>` still shows method label + masked identifier only.
25. **CRITICAL:** Open DevTools and inspect the rendered HTML. Confirm the page does NOT contain `fullIdentifier` text, image URLs, or admin notes. The selector boundary in `getWorkerVerificationSummary()` strips them.
26. The new admin history-detail Modal is rendered inside `<VerificationsPanel>` (mounted only inside the admin tab). Non-admin surfaces never reach it.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/types/index.ts` — `Employer.employerType10A`, `EmployerTypeChangeRequest`.
- `src/stores/verificationStore.ts` — new actions + helpers.
- `src/data/persistence.ts` — schema-bump path + new storage key.
- `src/app/admin/dashboard/VerificationsPanel.tsx` — clickable history, type-change subsection, history-detail Modal.
- `src/app/employer/profile/page.tsx` — locked card + first-set picker + change-request Modal.
- `src/lib/adminNotifications.ts` — admin fan-out helper.
- HANDOFF Section 11 employer-type lock rule.


## Phase 10A-Fix-2 — Adaptive toast duration + employer type backfill + posting guard

Last reviewed: **2026-05-25, Phase 10A-Fix-2 — NEEDS MANUAL VISUAL QA**.

This phase polishes three rough edges from 10A-Fix-1: long Vietnamese toast copy was being dismissed too early, seeded employer accounts hadn't been backfilled with `employerType10A` (so they incorrectly showed the first-set picker), and the new-shift page didn't refuse to render `<ShiftForm>` for accounts with no resolvable type. All changes are mock-only; no schema migration code beyond the existing reseed path.

### A. Adaptive toast duration — long copy readability

1. Run `npm run dev` and open the app.
2. Trigger a short-copy success toast (e.g. log in successfully). Expect the toast to dismiss after exactly **3000ms** (success base, copy under 40 chars).
3. Trigger a longer-copy toast — submit a verification document on the worker or employer profile. The toast text contains a Vietnamese sentence around 50–80 chars. Confirm the toast stays visible longer than the short-copy success — should be ~3500–4500ms based on length.
4. Trigger a warning toast (e.g. cancellation modal validation error). The base is now **5000ms** (was 4000ms in 10A-Fix-1). Confirm the warning is visibly longer than `success`.
5. Trigger an error toast with a long body (e.g. dispute submission with a long reason) — should stay visible up to the **9000ms cap**, never longer.
6. Confirm that callers who pin an explicit `duration` (e.g. `showError('...', { duration: 12000 })` if any) still get the explicit value verbatim, and that sticky toasts (`duration: 0`) never auto-dismiss.

### B. Employer type backfill — seeded employers should never see the picker

1. Clear localStorage (`localStorage.clear()` in DevTools console, then refresh) so the schema-bump path reseeds.
2. Log in as `lien@quanphoha.vn` (employer-001). Open the profile. The "Xác minh nhà tuyển dụng" card MUST show the locked display with **"Loại tài khoản hiện tại: Hộ kinh doanh"** and the corresponding required-document list. Do NOT show the first-set picker.
3. Repeat for `tuan@cafecong.vn` (employer-002) → must show **"Doanh nghiệp"** locked.
4. Repeat for `minh@sukienvinhquang.vn` (employer-003) → must show **"Agency / Sự kiện"** locked.
5. The "Yêu cầu đổi loại tài khoản" CTA appears under the locked display for all three, and the type-change request modal works as it did in 10A-Fix-1.
6. Pre-existing pending change requests (if any seeded) still show the amber "Đang chờ duyệt" banner.

### C. Posting guard — `/employer/shifts/new` refuses without a resolved type

1. Open DevTools, go to Application → Local Storage, and manually edit `cale.users` to remove BOTH `employerType` and `employerType10A` from one of the seeded employer records, then also clear that employer's shifts from `cale.shifts` (so `hasPostedShifts === false`). Refresh.
2. Log in as that doctored employer and navigate to **Đăng ca tuyển** (`/employer/shifts/new`).
3. Expect the page to render the new guard `<Card>` with title **"Cần chọn loại tài khoản trước khi đăng ca"**, body **"Vui lòng chọn loại tài khoản nhà tuyển dụng trước khi đăng ca. Loại tài khoản giúp xác định giấy tờ cần xác minh, mức đặt cọc và quy tắc an toàn cho người lao động."**, and a primary CTA **"Mở Hồ sơ nhà tuyển dụng"** linking to `/employer/profile`. The `<ShiftForm>`, `<TrustExplainerCard>`, and `<DepositConfirmCard>` MUST NOT render.
4. Click the CTA — lands on the employer profile, sees the first-set picker (because both type fields are now empty AND no shifts).
5. Pick "Hộ kinh doanh" and confirm. Toast appears. Navigate back to **Đăng ca tuyển** — the guard is gone, `<ShiftForm>` renders normally.
6. Restore localStorage (or run `localStorage.clear()`) and reload to get back to the seeded state.

### D. Posting guard — established accounts pass through

1. Log in as a seeded employer (e.g. `lien@quanphoha.vn` with `employerType10A: "HouseholdBusiness"` already set).
2. Navigate to **Đăng ca tuyển**. Expect the existing flow: trust explainer card + ShiftForm visible immediately. The new guard MUST NOT trigger.
3. Repeat with each of the three seeded employers — none should hit the guard.

### E. Toast progress bar matches actual dismissal

1. Trigger a success toast and watch the progress-bar countdown. The bar should reach zero at the exact moment the card disappears.
2. Trigger a long-copy info toast (description ~80 chars). Progress bar should run for ~4480ms — visibly longer than the short success toast — and reach zero precisely when the card dismisses.
3. Trigger a sticky toast (e.g. an unrecoverable error) — confirm there is NO progress bar.

### F. Re-run triggers

Re-run this audit after any change to:

- `src/stores/toastStore.ts` — adaptive duration, MIN/MAX bounds, per-tone bases.
- `src/__tests__/toastStore.test.ts` — adaptive-duration tests.
- `src/data/seed/users.json` — employer type backfill.
- `src/data/persistence.ts` — schema version.
- `src/stores/verificationStore.ts` — `resolveEmployerType` 2-arg signature.
- `src/app/employer/profile/page.tsx` — `hasPostedShifts` wiring.
- `src/app/employer/shifts/new/page.tsx` — posting guard early return.
- HANDOFF Section 11 employer-type rule (Fix-2 addendum).


## Phase 10A-Fix-3 — Employer type at registration, verification-gated posting, workplace photos

Last reviewed: **2026-05-25, Phase 10A-Fix-3 — NEEDS MANUAL VISUAL QA**.

This phase enforces the 4-shape employer type at registration, blocks shift posting until per-type verification + workplace prerequisites are met, and adds workplace imagery to shift creation + worker-facing detail. Worker identity privacy boundary is unchanged. Workplace photos surfaced to workers are limited to the public-safe document subset.

### A. Registration employer-type required

1. Run `npm run dev`. Open `/register`.
2. Toggle the role chip to "Tôi cần tuyển người làm". The form should show the 4-shape employer-type selector with each option's hint copy visible underneath the option title.
3. Without picking a type, fill the rest of the form (company name, business type, email, phone, password) and submit. Expect:
   - Submit blocked.
   - Red validation message under the selector: "Vui lòng chọn loại tài khoản nhà tuyển dụng."
   - The intro paragraph above the selector reads: "Loại tài khoản này quyết định giấy tờ cần xác minh và quy định đặt cọc. Bạn không thể tự đổi sau khi đã chọn — nếu cần thay đổi, hãy gửi yêu cầu để quản trị viên xét duyệt."
4. Pick "Doanh nghiệp" and submit. Account created → redirected to `/employer/dashboard`. Open `/employer/profile` — the locked-type card shows "Loại tài khoản hiện tại: Doanh nghiệp", NOT the first-set picker.
5. Repeat with each of the other three shapes — each one persists into the locked profile view.

### B. Profile first-set picker is legacy-only

1. Open DevTools and clear `cale.users` then refresh once to reseed.
2. Use DevTools to remove BOTH `employerType` and `employerType10A` from one of the seeded employer records, AND remove that employer's shifts from `cale.shifts`. Refresh.
3. Log in as the doctored employer → open profile. Confirm the first-set picker now carries an amber callout reading "Chỉ áp dụng cho tài khoản cũ chưa có loại tài khoản. Tài khoản đăng ký mới đã có loại tài khoản từ bước đăng ký."
4. Pick a type, confirm. The picker disappears and the locked card replaces it.
5. Restore localStorage (or `localStorage.clear()`).

### C. Verification-gated posting checklist

1. Reseed (clear localStorage, refresh). Log in as `lien@quanphoha.vn` (employer-001, HouseholdBusiness, no approved verification docs by default).
2. Navigate to **Đăng ca tuyển**. Expect the page to render the trust-tier explainer + the new "Yêu cầu trước khi đăng ca" checklist card.
3. Checklist items for HouseholdBusiness should be:
   - "Đã chọn loại tài khoản" — green check.
   - "CCCD đại diện đã được duyệt" — amber bang.
   - "Ảnh mặt tiền / nơi làm việc đã được duyệt trên hồ sơ" — amber bang.
   - "Đã có ảnh địa điểm cho ca này" — amber bang (until the form has a workplace image).
4. The card carries the focused first blocker, the deposit-locked reminder, and a "Mở hồ sơ nhà tuyển dụng" CTA. The form is still rendered below — the gate is on **submit**, not on form visibility.
5. Type a workplace image filename (e.g. `mat-tien-quan-pho-ha.jpg`). The "Đã có ảnh địa điểm cho ca này" item should flip to green within a tick — readiness updates live as you type.
6. Try to submit the form anyway. Expect a red error toast: "Bạn cần hoàn tất xác minh nhà tuyển dụng trước khi đăng ca." (the page intro line) plus the first blocker.
7. Open the verification card on `/employer/profile`, submit a `RepresentativeId` mock document, then open the admin queue (`/admin/dashboard` Xác minh tab) as `admin-001` and approve the doc. Repeat for `StorefrontPhoto` to satisfy the workplace-proof check (or leave the workplace-image typed in the form to satisfy via the per-shift fallback).
8. Return to **Đăng ca tuyển**. Checklist now all green; header chip flips to "Tất cả yêu cầu đã được đáp ứng. Bạn có thể đăng ca." Submit the form → shift created, deposit-confirm card appears.

### D. Shift form workplace section

1. On **Đăng ca tuyển**, scroll past the description/requirements blocks. The new "Ảnh địa điểm và liên hệ tại nơi làm việc" panel should appear with:
   - Workplace image filename input (required indicator visible based on resolved type).
   - Workplace notes textarea.
   - On-site contact name input.
   - On-site contact phone input.
   - "Yêu cầu mang giấy tờ tuỳ thân đã xác minh khi tới làm" checkbox.
2. The intro line above the inputs reads "Ảnh giúp người lao động nhận biết nơi làm việc thật trước khi nhận ca…"
3. Submit without an image when required → red error message "Cần thêm ảnh địa điểm / khu vực làm việc cho ca này."
4. Submit with all fields populated → the new shift carries the workplace metadata (verify by re-opening the shift on `/shifts/[id]` as a worker — see section E).

### E. Worker-facing shift detail trust info

1. Log out, then log in as `an.nguyen@gmail.com` (worker-001).
2. Open `/shifts` — pick `shift-001` (Phục vụ quán phở giờ trưa). On the detail page, scroll past description/requirements.
3. The new "Ảnh địa điểm / khu vực làm việc" section should render:
   - The mock filename `mat-tien-quan-pho-ha.jpg` next to a generic image-icon placeholder.
   - The workplace notes ("Bếp và khu phục vụ tách riêng. Đồng phục được cấp.") in a separate callout.
   - For shifts that include an on-site contact, the name + tap-to-call phone link.
4. Open `shift-005` (Hỗ trợ sự kiện khai trương) — same card layout plus the amber "Vui lòng mang giấy tờ tuỳ thân đã xác minh khi tới ca làm." notice.
5. For shifts with no workplace image, the empty state reads "Nhà tuyển dụng chưa cung cấp ảnh địa điểm cho ca này."

### F. Employer profile public photos

1. Still as a worker, click an employer name on a shift detail page to open the `EmployerProfileModal`.
2. Confirm the chip header now uses the 4-shape label (e.g. "Hộ kinh doanh", "Doanh nghiệp", "Agency / Sự kiện").
3. The new "Ảnh địa điểm đã xác minh" section lists labels of approved storefront/workplace/event photos as a stacked list with submitted-at dates. For seeded employers without approved workplace docs the section shows the empty-state "Chưa có ảnh địa điểm làm việc đã xác minh."
4. **CRITICAL — privacy non-regression.** The list MUST NOT include `RepresentativeId`, `BusinessLicense`, `TaxCode` rows. Open DevTools and inspect the rendered HTML: confirm no representative-ID full-identifier text, image URL, or admin notes appear anywhere on this modal.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/types/index.ts` — `Shift.workplaceImageLabel/Notes`, `onSiteContactName/Phone`, `requiresVerifiedDocumentOnArrival`.
- `src/stores/authStore.ts` — `RegisterInput.employerType10A`, `isEmployerInput` validation.
- `src/app/register/page.tsx` — 4-shape selector + required validation.
- `src/components/forms/ShiftForm.tsx` — workplace panel + `workplaceImageRequired` + `onValuesChange`.
- `src/app/employer/shifts/new/page.tsx` — `ReadinessChecklist` + `computePostingReadiness` integration.
- `src/app/shifts/[id]/page.tsx` — `WorkplaceCard`.
- `src/components/user/EmployerProfileModal.tsx` — public photos + 4-shape chip.
- `src/domain/postingReadiness.ts` — readiness rules + public-photo selector.
- `src/data/seed/shifts.json` — workplace label backfill.
- HANDOFF Section 11 employer-type rule (Fix-3 addendum).


## Phase 10A-Fix-4 — Live verification summaries, task badges, error toast tone, featured-job countdown

Last reviewed: **2026-05-25, Phase 10A-Fix-4 — NEEDS MANUAL VISUAL QA**.

This phase fixes four polish bugs surfaced after 10A-Fix-3: stale verification chips on employer-facing applicant surfaces, missing task indicators in the top nav, two validation messages that rendered as green success toasts, and a featured-job marketing card with no countdown.

### A. Live worker verification on employer surfaces

1. Run `npm run dev`. Clear localStorage and refresh once to reseed.
2. Log in as `binh.le@gmail.com` (worker-003) and apply to an open shift (e.g. `shift-001`).
3. Without logging out, open a second browser tab → log in as `admin@cale.vn`. Open the verification tab and approve the worker's identity verification (or simulate one via DevTools by submitting a worker doc and approving it).
4. Switch to the employer browser session (`lien@quanphoha.vn`). Open the dashboard pending-applications detail modal AND the applicant list at `/employer/shifts/[id]`.
5. Both surfaces should now show the live verified chip (e.g. "Đã xác minh · CCCD / CMND" + masked identifier) without requiring a hard refresh — at most a quick page navigation that re-renders the modal.
6. Open the `WorkerProfileModal` (click on the worker's name from the applicant list). The "Xác minh" section should show the live badge + method label + masked identifier + pending count, NOT the legacy three-chip pill view.
7. **CRITICAL — privacy non-regression.** Open DevTools and inspect the rendered HTML of the modal. Confirm there is NO `fullIdentifier`, no raw image URLs, no admin notes. Only the public-safe summary appears.

### B. Top-nav task badges — admin

1. Log in as `admin@cale.vn`. The "Tổng quan admin" nav link in the desktop top bar should show a red task badge whose number equals total pending verification queue items.
2. Open the dashboard and click the "Xác minh" tab — same number rendered inside the tab as a small pill (or red dot if exactly 1 pending).
3. Approve all pending items. The badge should disappear from both surfaces on the next render.
4. Submit a new worker verification doc (as a worker in another tab). Switch back to admin — badge count increments.

### C. Top-nav task badges — employer

1. Log in as a seeded employer (e.g. `tuan@cafecong.vn`). The "Tổng quan" nav link should carry a badge whose count is `Pending` applications across the employer's shifts plus any `CheckedOut` ones awaiting confirmation.
2. Approve / reject pending applications until the count reaches zero. The badge disappears.

### D. Top-nav task badges — worker

1. Log in as `an.nguyen@gmail.com` (worker-001). The worker dashboard link should show a badge whose count is unread worker-scoped notifications.
2. Mark all read. Badge disappears.
3. Submit a verification doc, then in another tab as admin reject it with a reason. Switch back to the worker. The "Hồ sơ" nav link should now show a badge whose count is the rejected/needs-more-info doc.
4. Resubmit a corrected doc. The "Hồ sơ" badge stays until admin clears the `Rejected` / `NeedsMoreInfo` state by approving (or until the worker submits a fresh doc that the admin acts on).

### E. Badge display rules

1. Confirm `count === 1` renders a red dot (no number visible), `count >= 2` renders a red pill with the number, and `count > 9` clamps at "9+".
2. Confirm the badge does not break active-state styling on any nav link (active orange background remains visible behind the badge).
3. Confirm the badge has an accessible label — open DevTools → Inspector and check `role="status"` + `aria-label="…mục cần xử lý"` on the chip.
4. Confirm hovering / focusing the badge does not steal click events from the parent link (the badge has `pointer-events-none`).

### F. Validation error toast tone

1. Log in as a seeded employer. Open the employer profile.
2. Click "Yêu cầu đổi loại tài khoản". In the modal, leave the reason blank and submit.
3. Toast should be RED (error tone), not green. Title content: "Vui lòng nhập lý do."
4. Pick the same type as the current type and submit. Same expectation — error toast for "Loại tài khoản mới phải khác loại hiện tại."
5. Trigger a real success path (e.g. submit a verification document). Toast is green / success tone.
6. Spot-check admin verification panel rejections: reject a doc with a blank reason — error toast, not green.

### G. Featured-job countdown + full-shift filter

1. Open the homepage `/` as a guest.
2. The "Việc đang nổi bật" card should show a real upcoming shift with a small orange pill underneath the location/wage/positions row reading "Bắt đầu sau {N} ngày {HH} giờ" (or "{H} giờ {MM} phút" for nearer-term, or "{MM}:{SS} phút" for the last hour).
3. **CRITICAL — SSR safety.** Open DevTools console — confirm there is no React hydration mismatch warning. The countdown chip should briefly be missing on the very first paint (mount gate), then render once the client takes over.
4. **Tick test.** Wait one minute (or open DevTools and adjust the system clock forward). The countdown updates every minute on its own — no manual refresh required.
5. **Full-shift filter.** Use the `/employer/shifts/[id]` admin/owner UI to set a featured shift's `positionsFilled` equal to its `positionsTotal` (or have all seats fill via apply+approve). Refresh `/`. The featured card should switch to the next eligible shift, NOT show the full one.
6. **Past-shift filter.** Wait until a featured shift's start time passes. The minute tick should automatically promote the next eligible shift; the past one is filtered out by `isListable`.
7. **Empty state.** With localStorage wiped or all eligible shifts removed, the card should show the existing "Khám phá ca làm ngay" placeholder linking to `/shifts`.

### H. Re-run triggers

Re-run this audit after any change to:

- `src/components/ui/TaskBadge.tsx` — the badge component.
- `src/domain/taskBadges.ts` — the count selectors.
- `src/components/layout/NavBar.tsx` — role-specific nav.
- `src/app/admin/dashboard/page.tsx` — `TabButton` badge wiring.
- `src/app/employer/dashboard/page.tsx` — pending-applications detail modal verification chips.
- `src/components/user/WorkerProfileModal.tsx` — verification section.
- `src/app/employer/profile/page.tsx` — toast tone in change-request flow.
- `src/components/landing/FeaturedJobMockup.tsx` — countdown chip + minute tick.


## Phase 10A-Fix-5 — Live verification everywhere, actionable badge semantics, canonical featured-job availability

Last reviewed: **2026-05-25, Phase 10A-Fix-5 — NEEDS MANUAL VISUAL QA**.

This phase fixes four real product-flow bugs surfaced after 10A-Fix-4: worker profile badge stuck red after resubmit, worker dashboard badge driven by unread-notification count, employer-facing applicant chips still derived from the frozen flag-array, and a 3/3 full shift sneaking onto the homepage featured card.

### A. Worker profile badge — resubmit clears the red dot

1. Run `npm run dev`, clear localStorage, refresh.
2. Log in as `binh.le@gmail.com` (worker-003). Open `/worker/profile` and submit a CCCD verification.
3. Switch to admin. Reject the doc with a reason.
4. Switch back to the worker. The "Hồ sơ" nav link should show a red dot (1 actionable doc).
5. Resubmit the same CCCD doc as the worker. Without leaving the page, the red dot should disappear within a render — the latest CCCD record is now `Pending`, so the worker has no fresh action to take.
6. Have admin reject again. Red dot reappears. Resubmit. Red dot clears. Repeat to confirm latest-per-type semantics is stable.

### B. Worker dashboard nav — no badge from unread notifications

1. Have multiple unread notifications on the worker.
2. Confirm the "Tổng quan" link in the worker nav shows NO badge regardless of unread count.
3. The notification bell continues to show the unread count, as before. Open the bell, mark all read — bell count drops, dashboard nav still has no badge.

### C. Employer-facing live verification — every surface

1. Log in as `binh.le@gmail.com` and apply to an open shift.
2. Without logging out from binh.le, switch to admin. Approve a CCCD verification doc, a student card doc, and a driver license doc for binh.le (or simulate via DevTools by submitting + approving each).
3. Switch to the employer (`lien@quanphoha.vn`). Visit:
   - **Employer dashboard pending-applications detail modal** — should show three live chips: "Đã xác minh · CCCD / CMND", "Đã xác minh · Thẻ sinh viên", "Đã xác minh · Bằng lái xe", PLUS the existing "Đã xác minh số điện thoại".
   - **`/employer/shifts/[id]` applicant list** — same chips on the `WorkerSummaryRow`. Confirm the row shows the per-method chips with masked identifier next to each.
   - **`WorkerProfileModal` (Xem hồ sơ)** — same three chips in the "Xác minh" section, with the "Đã xác minh danh tính" headline plus per-method chips.
   - **`AdminUserProfileModal` (admin → user list → click worker)** — same chips in the worker tab.
4. **CRITICAL — privacy non-regression.** Open DevTools and inspect each of these surfaces. Confirm there is NO `fullIdentifier`, NO raw image URLs, NO admin notes, NO rejection reason text. Only the public-safe summary appears.

### D. Featured-job — full / stale shifts never appear

1. Log in as a worker. Find an upcoming Published + Deposited shift on `/shifts` that has 1 free seat (e.g. `shift-001` after one worker is approved).
2. As an employer, fill the last seat (apply + approve a worker until `positionsFilled === positionsTotal`). Or open DevTools and manually edit `cale.applications` to add `Approved` apps until the shift is full.
3. Refresh `/`. The featured card should NOT show that shift even if `positionsFilled` was not synced — the canonical helper reconciles against the live application store.
4. Repeat with the seed shift `shift-003` (already 2/2 in seed). Confirm it's never picked.
5. Wait until the featured shift's start time passes. Within ~1 minute the minute tick should drop it and surface the next eligible shift.
6. Wipe localStorage so no shifts exist; the empty-state placeholder ("Khám phá ca làm ngay") shows instead.

### E. /shifts listing — same canonical filter

1. As a worker browsing `/shifts`, confirm the listing never shows a 3/3 full shift, a non-Published shift, a non-Deposited shift, or a past-start shift.
2. Apply to a shift until it becomes full. Refresh `/shifts`. The full shift drops out of the listing.
3. Re-test the empty state when no eligible shifts exist (via localStorage wipe).

### F. Mobile drawer parity

1. On a 390px viewport, open the mobile drawer.
2. Confirm worker "Hồ sơ" badge appears with the same semantics (red dot when latest-per-doc actionable count > 0; no dashboard badge from unread notifications).
3. Confirm employer "Tổng quan" badge appears with pending-applications count.
4. Confirm admin "Tổng quan admin" badge appears.

### G. Validation toast tone non-regression

1. Trigger a validation error (e.g. submit the type-change-request modal with a blank reason). Toast must be RED, not green.
2. Trigger a real success path (submit a verification document). Toast is GREEN.

### H. Re-run triggers

Re-run this audit after any change to:

- `src/stores/verificationStore.ts` — `getWorkerVerificationSummary` shape.
- `src/domain/taskBadges.ts` — count semantics.
- `src/domain/shiftAvailability.ts` — recruiting predicate.
- `src/components/user/WorkerSummaryRow.tsx` / `WorkerProfileCard.tsx` / `WorkerProfileModal.tsx` / `AdminUserProfileModal.tsx` — live derivation.
- `src/components/landing/FeaturedJobMockup.tsx` — picker.
- `src/app/shifts/page.tsx` — listing filter.
- `src/app/employer/dashboard/page.tsx` — `LiveVerificationChips`.
- `src/components/layout/NavBar.tsx` — role-specific nav badges.


## Phase 10A-Fix-6 — Unified worker verification UI, public-summary priority, modal outside-click, featured slot label

Last reviewed: **2026-05-25, Phase 10A-Fix-6 — NEEDS MANUAL VISUAL QA**.

This phase removes the duplicated verification UI on the worker profile, fixes the employer-facing public summary so approved methods always beat pending status, makes modals dismiss on outside click, and rewords the homepage featured slot label so a 3/3 full surface never reappears as "đang nổi bật".

### A. Worker profile — single canonical verification card

1. Run `npm run dev`. Clear localStorage, refresh.
2. Log in as `binh.le@gmail.com`. Open `/worker/profile`.
3. The right column should render exactly ONE verification card titled "Xác minh".
4. The card shows:
   - A phone-verification row at the top with a `Đã xác minh` / `Chưa xác minh` badge and a toggle button.
   - A "Xác minh danh tính" sub-section listing CCCD / CMND, Thẻ sinh viên, Bằng lái xe.
   - Each identity row carries a status badge using the canonical `Chưa gửi` / `Đang chờ duyệt` / `Đã xác minh` / `Cần bổ sung` / `Bị từ chối` flow.
5. Confirm there is NO second card with the legacy "Tải lên CMND/CCCD" / "Tải lên thẻ sinh viên" toggle buttons. If you see two upload paths for the same document type, the legacy card has regressed and must be removed.
6. Submit a CCCD doc (Gửi tài liệu mô phỏng). The status flips to `Đang chờ duyệt`. As admin in another tab, approve. As the worker, refresh — the status flips to `Đã xác minh` and the resubmit button is hidden.

### B. Public summary priority — approved beats pending

1. As a worker, submit CCCD + Thẻ sinh viên + Bằng lái docs. Have admin approve all three.
2. Switch to a seeded employer (`lien@quanphoha.vn`) in another tab. Open the worker profile modal from a shift detail page or the employer dashboard pending-applications detail modal.
3. The "Xác minh" section should read "Đã xác minh danh tính" with three approved-method chips (CCCD / CMND, Thẻ sinh viên, Bằng lái xe). The "Chưa xác minh danh tính" framing must NOT appear.
4. Add a Pending resubmission of CCCD as the worker (Gửi lại). Refresh the employer modal. The summary should still read "Đã xác minh danh tính" with the same three approved chips and NO "+1 đang chờ duyệt" text — the type is already approved.
5. As the worker, submit a brand-new method that hasn't been approved yet. The employer modal should now show the existing approved chips PLUS a "+1 đang chờ duyệt" pill for the never-approved type.

### C. Bình Lê regression

1. Reseed: clear localStorage, refresh.
2. Log in as `binh.le@gmail.com`. Apply to an open shift (e.g. `shift-001`) before submitting any verification docs.
3. As admin, approve binh.le's CCCD, student card, and driver license docs.
4. As the employer who owns that shift, open the applicant detail / `WorkerProfileModal`.
5. Confirm: "Đã xác minh danh tính" is shown, three approved-method chips are visible, no "Chưa xác minh" framing, no "+3 đang chờ duyệt".

### D. Modal outside-click close

1. Open any modal — `EmployerProfileModal`, `WorkerProfileModal`, the dashboard stat-detail modals, the admin verification detail modal, the type-change request modal.
2. Click the dark backdrop. Modal closes.
3. Re-open. Click the empty padding area between the panel edge and the viewport edge (outside the white panel but inside the modal viewport). Modal closes.
4. Re-open. Click anywhere INSIDE the white panel — the modal stays open. Form interactions, links, and buttons inside the panel still work.
5. Re-open. Press ESC. Modal closes.
6. Re-open. Click the X button. Modal closes.

### E. Featured slot label + full-shift exclusion

1. Open `/`. The featured card should show "Còn X/Y vị trí" (e.g. "Còn 2/3 vị trí" or "Còn 3/3 vị trí" for a brand-new shift).
2. As an employer, fill the last seat of the featured shift (apply + approve workers until full). Refresh `/`. The featured card switches to the next eligible shift; a 3/3 full shift is never featured.
3. Open `/shifts`. Each card on the listing shows "Còn X/Y vị trí" with the same wording.
4. Confirm: a brand-new shift with `positionsTotal: 3, positionsFilled: 0` reads "Còn 3/3 vị trí" (3 available out of 3). After 1 worker is approved it reads "Còn 2/3 vị trí". After 2 → "Còn 1/3 vị trí". Once the shift becomes full, it leaves the listing entirely.

### F. Privacy non-regression

1. Open the `WorkerProfileModal` and the employer dashboard pending-applications detail modal as an employer.
2. Open DevTools → Inspector → check the rendered HTML for the modal panel.
3. Confirm there is NO `fullIdentifier` text, NO image URLs (`mock://...`), NO admin notes, NO rejection reasons in the rendered HTML. Only badge labels, masked identifiers, and pending counts may appear.
4. The new test in `phase10aFix6.test.ts` pins this via `JSON.stringify` assertions.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/components/ui/Modal.tsx` — outside-click and the four close paths.
- `src/stores/verificationStore.ts` — `getWorkerVerificationSummary` priority rules.
- `src/app/worker/profile/page.tsx` — single canonical verification card.
- `src/components/landing/FeaturedJobMockup.tsx` — slot label.
- `src/components/shift/ShiftCard.tsx` — listing slot label.
- HANDOFF Section 11 rules for live verification, single verification UI, modal outside-click, and slot label phrasing.


## Phase 10A-Fix-7 — Trust-sensitive employer cancellation

Last reviewed: **2026-05-25, Phase 10A-Fix-7 — NEEDS MANUAL VISUAL QA**.

This phase rebuilds employer cancellation as the canonical trust-sensitive flow it should always have been: required reason, application-status flip to `'CancelledByEmployer'` (NOT worker-side cancellation), worker reputation/quota protection, employer deposit penalty, and notification fan-out. The worker-side "Hủy" button never appears on a shift the worker had no part in cancelling.

### A. Reason required + after-approval warning

1. Run `npm run dev`. Clear localStorage, refresh.
2. Log in as `lien@quanphoha.vn` (employer-001). Open `/employer/shifts/[id]` for a Published shift with at least one Approved applicant (use `/employer/dashboard` to find one or approve a worker first).
3. Click "Huỷ ca". A modal opens.
4. The modal MUST show an amber warning: "Ca này đã có người lao động được duyệt. Khi hủy, người lao động sẽ không bị phạt và hệ thống sẽ ghi nhận ảnh hưởng đến uy tín nhà tuyển dụng."
5. Try to submit with an empty reason. The "Xác nhận hủy ca" button stays disabled.
6. Type a single space — still disabled (whitespace-only doesn't satisfy the gate).
7. Type a real reason (e.g. "Lịch đột xuất thay đổi"). The button enables. The penalty preview card shows the rate / amount based on current time-to-start.
8. Confirm. The page navigates to the dashboard and the shift list now shows the cancellation reflected.

### B. Penalty tiers

1. Set up three test shifts via DevTools localStorage: one starting 48h from now, one starting 12h from now, one starting 3h from now. Approve a worker for each.
2. Cancel each shift with a reason and observe the penalty card:
   - 48h ahead → 5% of deposit.
   - 12h ahead → 10% of deposit.
   - 3h ahead → 15% of deposit.
3. After cancellation, return to the cancelled shift's detail page. The Cancelled banner should show "Phí hủy sau khi đã duyệt người: {rate}% tiền cọc ({amount})".
4. Cancel a shift with no approved workers (only Pending). Penalty card shows nothing (rate 0). Banner shows the reason but no penalty line.

### C. Worker protection

1. As a worker (`an.nguyen@gmail.com`), apply to a Published shift and have the employer approve.
2. As the employer, cancel that shift with a reason.
3. As the worker, refresh `/worker/dashboard`:
   - The shift NO LONGER appears under "Ca làm sắp tới" (cancelled shifts are filtered out).
   - The cancel button has disappeared (this was the bug — it should never reappear on a shift the worker didn't cancel).
   - The worker's reputation score has gone UP by 2 (or up to the 100 cap), not down.
   - If the worker had a recent `LateCancel` in their history, it has been refunded — `cancellationHistory.length` decreases by 1.
4. Open a worker notification — the title reads "Ca làm đã bị hủy bởi nhà tuyển dụng", body includes the employer reason, link goes to `/shifts/{id}`.
5. On `/shifts/{id}`, a red banner shows "Đã hủy bởi nhà tuyển dụng", the employer reason, and the protection note: "Bạn không bị trừ điểm uy tín hoặc hạn mức hủy vì ca do nhà tuyển dụng hủy. Hệ thống đã tự động bảo vệ quyền lợi của bạn."

### D. Application status flip

1. Open DevTools → Application → Local Storage → `cale.applications`.
2. After an employer cancellation, find the affected worker's application record. Status MUST be `'CancelledByEmployer'`, NOT `'CancelledByWorker'`. `cancellationReasonNote` carries the employer's reason.
3. Pending applicants for the same shift stay `'Pending'` — they get a notification but no status flip and no protection credit.
4. Already-rejected / already-confirmed applicants are not modified.

### E. Notification deep link

1. Open the notification bell as the affected worker.
2. The "Ca làm đã bị hủy bởi nhà tuyển dụng" notification is clickable.
3. Clicking navigates to `/shifts/{id}` where the protection banner explains the situation in full.

### F. Privacy non-regression

1. Open the worker's reputation/cancellation modal and inspect the protection record.
2. Confirm: only the shift title, employer name, reason, occurredAt, points/quota are shown. NO `fullIdentifier`, NO image URLs, NO admin notes.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/stores/shiftStore.ts` — `cancel` action and side effects.
- `src/domain/employerCancellation.ts` — penalty + protection helpers.
- `src/app/employer/shifts/[id]/page.tsx` — cancellation modal.
- `src/app/worker/dashboard/page.tsx` — `upcoming` filter and `UpcomingShiftCard`.
- `src/app/shifts/[id]/page.tsx` — cancellation banner.
- HANDOFF Section 11 employer-cancellation rule.


## Phase 10A-Fix-8 — Canonical history records for protection + penalty

Last reviewed: **2026-05-25, Phase 10A-Fix-8 — NEEDS MANUAL VISUAL QA**.

This phase wires existing `Worker.protections` and `Shift.employerCancellation*` data into the worker reputation timeline, the worker cancellation quota modal, and the employer payments modal. Every numeric change driven by an employer cancellation now has a permanent, visible history record.

### A. Worker reputation timeline — protection event

1. Run `npm run dev`, clear localStorage, refresh.
2. Log in as a worker (e.g. `an.nguyen@gmail.com`). Apply to a published shift, have the employer approve, then have the employer cancel the shift with a reason.
3. As the worker, open the dashboard and click the reputation card to open the "Điểm uy tín" modal.
4. The timeline should show a new entry at the top: **"+2 Bảo vệ quyền lợi do nhà tuyển dụng hủy ca"** with the shift title, employer name, and reason in the sublabel.
5. If the worker was already at 100 reputation, the same entry shows with delta=0 and the explanatory copy "Bạn đã đạt 100 điểm nên không cộng thêm uy tín."

### B. Worker quota modal — protection sub-list

1. With a worker who had a recent `LateCancel` in their `cancellationHistory`, repeat the cancel-by-employer flow.
2. Open the "Hạn mức huỷ" stat card. The modal opens.
3. Below the existing usage list, a new "Bảo vệ quyền lợi" section appears listing up to 5 most-recent protection records.
4. The card reads "+1 lượt hủy được hoàn lại" when the worker had quota usage to refund, OR "Không bị tính lượt hủy" when they had nothing to refund.
5. Each card shows the shift title, employer name, reason, and date.
6. The legacy quota usage list (red/amber chips) still renders normally.

### C. Employer money ledger

1. Log in as the employer who just cancelled a shift after approving workers.
2. Open the dashboard payments stat card. The modal opens.
3. Below the existing recent-payouts list, a new "Phí hủy ca sau khi đã duyệt người" section appears.
4. Each entry shows:
   - shift title and cancellation date
   - rate badge (5% / 10% / 15% tiền cọc)
   - negative amount (e.g. "-60.000đ")
   - reason
   - the standard tag "Phí hủy do ca đã có người lao động được duyệt."
5. Section is hidden entirely when the employer has no penalty entries.
6. Cancel a shift before any worker was approved — the section does NOT show that entry (no `afterApproval`, no penalty).

### D. Notification body deltas

1. As the affected worker, open the notification bell.
2. The new "Ca làm đã bị hủy bởi nhà tuyển dụng" notification body should now quote the actual deltas applied:
   - Both deltas apply → `"… Bạn không bị phạt. Hệ thống đã ghi nhận bảo vệ quyền lợi: +2 uy tín / +1 lượt hủy được hoàn lại."`
   - Only reputation delta → `"… +2 uy tín."`
   - Only quota delta → `"… +1 lượt hủy được hoàn lại."`
   - Both 0 (capped + no usage) → `"… Hệ thống đã ghi nhận bảo vệ quyền lợi cho bạn."`
3. The reason text remains in every variant.
4. Clicking the notification still deep-links to `/shifts/{id}` where the cancellation banner explains the situation.

### E. Refresh persistence

1. After all the above, hard-refresh the worker and employer dashboards.
2. The reputation timeline entry, quota protection sub-list, and employer penalty ledger entry must all persist.
3. Verify in DevTools → Application → Local Storage that:
   - `cale.users` carries a `protections` array on the affected worker record.
   - `cale.shifts` carries `cancelledBy: "employer"`, `employerCancellationReason`, `employerCancelledAfterApproval: true`, `employerCancellationPenaltyRate`, and `employerCancellationPenaltyAmount` on the cancelled shift record.

### F. Privacy non-regression

1. Open DevTools → Inspector on each modal that now renders the new sections.
2. Confirm the rendered HTML carries no `fullIdentifier`, no document URLs, no admin notes, no rejection reasons. The protection record's only fields are `kind`, `shiftId`, `shiftTitle`, `employerId`, `employerName`, `reason`, `occurredAt`, `reputationPointsRestored`, `quotaSlotsRefunded`. The penalty entry only shows public-safe shift fields.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/stores/shiftStore.ts` — `applyEmployerCancellationSideEffects` and `formatProtectionDeltas`.
- `src/app/worker/dashboard/page.tsx` — `repTimeline`, the quota modal, and the cancelled-by-employer dashboard section.
- `src/app/employer/dashboard/page.tsx` — `<EmployerPenaltyLedger>` and the payments modal.
- HANDOFF Section 11 history-record rule.


## Phase 10A-Fix-9 — Lock applicant actions after shift starts + skill-score foundation

Last reviewed: **2026-05-25, Phase 10A-Fix-9 — NEEDS MANUAL VISUAL QA**.

This phase blocks Pending applicants from being approved after the shift has started and lays the per-job-type skill-score foundation alongside the platform-wide reputation score.

### A. Lock-after-start — store gate

1. Run `npm run dev`. Clear localStorage, refresh.
2. Use DevTools → Application → Local Storage → `cale.shifts` to find a shift whose start datetime is in the past (or set `date`/`startTime` on a published shift to land in the past). Make sure there's at least one Pending application against it.
3. Log in as the employer. Open `/employer/shifts/[id]` for that shift.
4. The Pending applicant row's actions area should show a neutral badge "Đơn đã hết hạn xử lý" plus the helper line "Ca đã bắt đầu nên không thể duyệt thêm ứng viên." Approve/Reject buttons must NOT render.
5. (Defence-in-depth) Use DevTools console: `useApplicationStore.getState().approve('app-id')` against the Pending application. Result: `{ ok: false, error: 'SHIFT_ALREADY_STARTED' }`. No state change.
6. Repeat with a shift in each of `InProgress`, `AwaitingConfirmation`, `Completed`, `Cancelled`, `Expired` even if the start datetime hasn't passed — same lock applies.
7. For a future shift in `Published`, the Approve/Reject buttons render normally.

### B. High-risk job soft warning

1. Create or pick a shift with `jobType` set to `Thu ngân` or `Bảo vệ`.
2. Open the employer shift detail page. Above the applicant list a soft amber warning card must appear with the heading "⚠ Công việc rủi ro cao" and the body "Công việc này có rủi ro cao. Nên chọn người đã xác minh danh tính, có uy tín cao và có lịch sử làm việc phù hợp."
3. Confirm: applicants are still accepted normally — the warning is informational, not a hard block.
4. Repeat with a `Phục vụ` / `Pha chế` / `Kho vận` shift — no warning shown.
5. Repeat with `Phát tờ rơi` / `Hỗ trợ sự kiện` — no warning shown.

### C. Per-category skill score chip on applicant cards

1. As the employer, open a shift detail page.
2. Each applicant row's verification chip area now includes "Phù hợp công việc: N điểm · {Mới|Khá|Tốt|Nổi bật}" when the worker has rated shifts in the same `jobType`, OR "Phù hợp công việc: Mới" when they have no rating yet for the category.
3. Confirm a worker who has confirmed shifts in a different category shows "Mới" for the current category — score is per-category, not global.

### D. Skill score updates after rating

1. Find a worker with at least one `CheckedOut` application on a shift.
2. Open the shift detail as the employer, click "Xác nhận hoàn thành" + submit a rating (e.g. 5 stars).
3. Open the worker's profile (`/worker/profile` while logged in as that worker, or `WorkerProfileModal` from the employer side).
4. The new "Kỹ năng theo loại việc" card lists the shift's `jobType` with score 100 (`stars * 20`), badge "Nổi bật", `Hoàn thành: 1 ca`.
5. Confirm a second shift of the same `jobType` with a 3-star rating — the score updates to round(0.7 × 100 + 0.3 × 60) = 88, completedCount becomes 2.
6. Confirm reputation also went up by +5 (Phase 6 rule) — the two are stored separately on the worker.

### E. Privacy non-regression

1. Open DevTools → Inspector on the employer applicant list and the worker profile.
2. The skill chip shows only category, score, completed count. No `fullIdentifier`, no document URLs, no admin notes.
3. The risk-warning card shows only the standardised Vietnamese sentence — no per-worker data.

### F. Re-run triggers

Re-run this audit after any change to:

- `src/stores/applicationStore.ts` — `approve()` and `confirmCompletion()`.
- `src/domain/skillScore.ts` — risk classification + score formula + badge tiers.
- `src/components/user/WorkerSummaryRow.tsx` — applicant chip.
- `src/app/employer/shifts/[id]/page.tsx` — `shiftStarted` memo + `ApplicationActionButtons` Pending branch + risk warning.
- `src/app/worker/profile/page.tsx` — "Kỹ năng theo loại việc" card.
- HANDOFF Section 11 lock-after-start + reputation-vs-skill rules.


## Phase 10A-Fix-10 — Expire pending applications when shift starts

Last reviewed: **2026-05-25, Phase 10A-Fix-10 — NEEDS MANUAL VISUAL QA**.

This phase introduces the new `'Expired'` ApplicationStatus and the centralized expiry action that runs on dashboard mount, on shift-detail mount, and inside `applicationStore.approve()` itself. Worker is never penalised; the cleanup is fully store-driven.

### A. Employer dashboard — stale pending cleanup

1. Run `npm run dev`. Clear localStorage, refresh.
2. Use DevTools → Application → Local Storage → `cale.shifts` to find a shift whose start datetime is in the past, OR set `date`/`startTime` on a published shift to land in the past. Make sure there's at least one Pending application against it.
3. Log in as the employer and visit `/employer/dashboard`.
4. The "Đơn ứng tuyển chờ duyệt" stat tile and the corresponding section in the main column must NOT include the stale Pending record. The "Đơn chờ duyệt" stat count drops to reflect only future-shift Pending records. The nav badge updates accordingly.
5. Open `cale.applications` in DevTools — the affected record now has `status: "Expired"`, `expiredAt`, and `expiredReason: "Ca đã bắt đầu trước khi đơn được duyệt."`

### B. Worker dashboard — expired application surface

1. Log in as the affected worker and visit `/worker/dashboard`.
2. The expired application no longer appears in the "Đơn đã ứng tuyển" Pending list.
3. A new "Đơn ứng tuyển đã hết hạn" section appears with up to 5 most-recent expired records (sorted by `expiredAt` desc).
4. Each card shows the shift title, date/time, badge "Đã hết hạn", and the helper "Ca đã bắt đầu trước khi đơn của bạn được duyệt. Bạn không bị trừ điểm uy tín hoặc hạn mức hủy."
5. Clicking the card deep-links to `/shifts/{id}` where the worker can see the same expiry note via the application status row.
6. Verify that the worker's `reputationScore` is unchanged and `cancellationHistory` is unchanged after expiry.

### C. Notification

1. After triggering expiry, open the worker's notification bell.
2. A new "Đơn ứng tuyển đã hết hạn" notification is present with the title verbatim and body "Ca {shiftTitle} đã bắt đầu trước khi đơn của bạn được duyệt. Bạn không bị trừ điểm uy tín hoặc hạn mức hủy."
3. Clicking the notification navigates to `/shifts/{id}`.
4. Reload the page or navigate to another dashboard — the same worker does NOT receive a second `'ApplicationExpired'` notification (idempotent).

### D. Approve-after-start cleanup

1. Set up a Pending application against a shift whose start datetime is in the past.
2. As an employer, open DevTools → Console and run `useApplicationStore.getState().approve('app-id')`.
3. Result: `{ ok: false, error: 'SHIFT_ALREADY_STARTED' }`. The application is now `'Expired'`, not `'Pending'`. Notification was fired.
4. Repeat the same call — same error result, no new notification, no new state change (idempotent).

### E. Worker shift detail

1. Visit `/shifts/{id}` for a shift where the current worker has an Expired application.
2. The "Apply section" shows the Expired branch: badge "Đã hết hạn" + helper "Ca đã bắt đầu nên đơn ứng tuyển không còn hiệu lực. Bạn không bị trừ điểm uy tín hoặc hạn mức hủy." No cancel button, no apply button.

### F. Privacy non-regression

1. Inspect the rendered HTML of all the new surfaces.
2. Confirm only the public-safe expiry fields appear (`expiredReason`, `expiredAt`, shift title). No `fullIdentifier`, image URLs, or admin notes.

### G. Re-run triggers

Re-run this audit after any change to:

- `src/stores/applicationStore.ts` — `expirePendingApplicationsForStartedShifts` and `approve()`.
- `src/domain/applicationExpiry.ts` — predicate + planner.
- `src/lib/useLifecycleSync.ts` — trigger wiring.
- `src/components/layout/AppHydrator.tsx` — boot pass wiring.
- `src/components/forms/ApplicationActions.tsx` — Expired branch.
- `src/app/worker/dashboard/page.tsx` — `recentlyExpired` section.
- `src/app/shifts/[id]/page.tsx` — `useLifecycleSync` usage.
- HANDOFF Section 11 pending-expiry rule.
