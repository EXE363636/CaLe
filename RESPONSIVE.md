# Responsive & Touch-Target Audit — CaLẻ / ShiftNow

Last reviewed: **2026-05-23, Phase 9B calendar UX + VN date/time pass.**

This document is the manual audit checklist used to verify Tailwind v4
responsive behavior across the MVP. The codebase has no automated tooling
for this — every checkbox below was walked through by hand at the
breakpoints listed in Req 17.1.

## Breakpoints under test

| Breakpoint | Width  | Typical device                                                  |
|------------|--------|-----------------------------------------------------------------|
| Mobile     | 375 px | iPhone SE / Android small                                       |
| Tablet     | 768 px | iPad portrait                                                   |
| Desktop    | 1280 px| Laptop, demo screen                                             |

## Conventions

- **Touch targets** must satisfy `min-h-[44px]` and (for icon-only buttons)
  `min-w-[44px]`. UI primitives (`Button`, `Input`) enforce this by default;
  any hand-rolled `<button>` needs the class explicitly.
- **Mobile-first**: base classes target the 375 px viewport. Larger screens
  layer on `md:` / `lg:` / `xl:` modifiers.
- **Horizontal scroll** is acceptable only inside the calendar week/day
  grids (`overflow-x-auto` on a `min-w-[720px]` inner). No other page may
  produce horizontal scroll on any breakpoint.
- **Hamburger nav** (`md:hidden`) appears below `md` on every page that
  renders the global `NavBar`.
- **Cards** never overflow the viewport; long text uses `truncate` or
  `whitespace-pre-line` as appropriate.

## Pages — manual audit results

| Page                              | 375 px | 768 px | 1280 px | Notes |
|-----------------------------------|--------|--------|---------|-------|
| `/`                               | ✅     | ✅     | ✅      | Hero stacks single-col below `lg`; mockup column hides on mobile (decorative). |
| `/login`                          | ✅     | ✅     | ✅      | Side trust panel hidden below `lg`. |
| `/register`                       | ✅     | ✅     | ✅      | Side trust panel hidden below `lg`. |
| `/shifts`                         | ✅     | ✅     | ✅      | Filter pane stacks above grid below `md`; cards 1-col → 2-col → 3-col. |
| `/shifts/[id]`                    | ✅     | ✅     | ✅      | Sticky bottom action bar on mobile (Req 17.3). |
| `/worker/dashboard`               | ✅     | ✅     | ✅      | Welcome strip wraps; stat tiles 2-col → 4-col. |
| `/worker/profile`                 | ✅     | ✅     | ✅      | |
| `/worker/schedule`                | ✅     | ✅     | ✅      | Calendar week/day grids horizontally scroll inside `min-w-[720px]` wrapper — intentional. Slot config now collapsed inside `<details>` (Phase 9B). |
| `/employer/dashboard`             | ✅     | ✅     | ✅      | Welcome strip + dual CTA stack on small screens. |
| `/employer/profile`               | ✅     | ✅     | ✅      | |
| `/employer/schedule`              | ✅     | ✅     | ✅      | Same intentional calendar scroll. Slot config now collapsed inside `<details>` (Phase 9B). |
| `/employer/shifts/new`            | ✅     | ✅     | ✅      | Trust card + deposit card stack vertically. |
| `/employer/shifts/[id]`           | ✅     | ✅     | ✅      | Applicant rows wrap action buttons on narrow widths. |
| `/admin/dashboard`                | ✅     | ✅     | ✅      | Tab buttons wrap; tables scroll horizontally where needed. |

## Touch targets — primitives

| Component                | Min height            | Notes |
|--------------------------|-----------------------|-------|
| `Button` (`md` size)     | `min-h-[44px]`        | Default. `sm` = 36 px allowed for inline secondary actions. |
| `Input`                  | `min-h-[44px]`        | All form fields. |
| `Modal` close button     | `h-9 w-9` interactive | 36 px is intentional — the panel itself is closed via ESC and backdrop, so the X icon is supplementary. Acceptable per WCAG when alternatives exist. |
| Calendar nav chevrons    | `h-8 w-8`             | Mini-month chevrons; backed up by larger toolbar buttons. |
| Mini-month day cells     | 44×44 mobile / 36×36 desktop | Responsive — drops to 36 only on `md+` where pointer accuracy is higher. |
| Calendar event chip      | `min-h-[44px]`        | Always meets target. |

## Known intentional behaviors

- Calendar Week and Day views render `min-w-[720px]` content inside an
  `overflow-x-auto` wrapper. Below 768 px the grid scrolls horizontally;
  Agenda view is the recommended mobile alternative and is the most
  usable below `md`.
- Landing hero mockup column collapses to a stacked single-column layout
  below `lg`. Below `md` the mockup's secondary mini-cards stack 1-col;
  this is intentional and not a bug.
- Demo accounts panel on `/login` is collapsed inside a `<details>` so
  the form is the dominant element on a narrow viewport.

## Outstanding non-blocking notes

- **Admin dashboard tables** can produce a small horizontal scroll
  inside the table wrapper on 375 px when the rep / status / actions row
  is full. The scroll is contained inside `overflow-x-auto` and does not
  leak to the page chrome — acceptable for an admin-only screen.
- **Calendar slot config form** is now collapsed by default inside a
  `<details>` disclosure (Phase 9B). The mobile grid no longer pushes
  down by ~120 px on first paint; the previous note is resolved.
- **Reduced motion** — every transition class added in Phase 9 / 9B
  (`motion-lift`, `motion-press`, modal animations, calendar event-card
  hover lift, slot-config chevron rotation) honors
  `prefers-reduced-motion: reduce` via the media query in `globals.css`.
- **Native browser locale** for the deprecated `<input type="date">`
  / `<input type="time">` inputs has been replaced everywhere with
  `DateFieldVN` / `TimeFieldVN` (Phase 9B). No remaining surfaces show
  AM/PM or `mm/dd/yyyy` regardless of the user's OS locale.

## When this needs re-running

- Any new top-level page added to `src/app/`.
- Any restructuring of `NavBar` / `Footer` / page shells.
- Any change to Tailwind v4 setup in `globals.css`.
- After every phase that adds new interactive elements (form pages,
  calendar variants, modal flows).
