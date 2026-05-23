# Visual QA Notes — CaLẻ / ShiftNow

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
