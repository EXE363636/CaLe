# Visual QA Notes — CaLẻ / ShiftNow

Last reviewed: **2026-05-23, Phase 9E hero interactivity + background depth pass.**

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
