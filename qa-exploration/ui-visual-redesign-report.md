# UI-VISUAL-REDESIGN-1 — Report

**Date:** 2026-06-02
**App:** CaLẻ / Now (localStorage-only Next.js 16 MVP).
**Goal:** A *visible* visual redesign (not a subtle refresh) — modern,
premium, role-distinct — while preserving all product logic, routes, and
tests. Bolt repo used for visual inspiration only.

---

## 1. Files changed

| File | Change |
|---|---|
| `src/components/ui/Badge.tsx` | Pills gained a tonal `ring-1` + bumped to `font-semibold` for a crisper, more polished badge across the whole app. |
| `src/components/ui/EmptyState.tsx` | Icon now sits in a soft orange→amber gradient chip (rounded-3xl, ring) so every empty state reads as a friendly designed card; title bumped to `text-base`. |
| `src/components/user/SkillProgressBar.tsx` | Full skill card redesigned: indigo→violet gradient progress bar, gradient level chip, tinted card surface, hover shadow. Used on profile + applicant cards. |
| `src/app/worker/dashboard/page.tsx` | **Bold orange gradient welcome hero** (white avatar ring, decorative blobs, white CTA buttons); **stat tiles rebuilt** as premium colourful gradient-icon-chip cards (rounded-3xl, tinted wash, `text-3xl` value); **reputation modal** got a conic-gradient score-ring hero + tinted stat cards. |
| `src/app/employer/dashboard/page.tsx` | **Orange→rose gradient command-center hero** (distinct from worker), white CTA buttons; six stat tiles rebuilt to the same premium colourful-chip style. |
| `src/app/admin/dashboard/page.tsx` | **Cool slate→indigo "control panel" hero** (deliberately different from the warm worker/employer dashboards); analytics StatCards rebuilt as rounded-3xl gradient cards with `text-3xl` values. |
| `src/app/worker/profile/page.tsx` | **Premium orange gradient profile hero** with large avatar in a white ring + inline uy-tín / completed-shifts / verification stat chips. (Removed now-unused `ReputationBadge` import.) |

No store / domain / route / test files were modified. No dependency added.

## 2. Pages redesigned (not merely refined)

- **Worker dashboard** — new gradient hero + colourful icon-chip stat grid.
- **Employer dashboard** — new orange-rose command-center hero + colourful stat grid.
- **Admin dashboard** — new cool slate-indigo control-panel hero + stronger analytics cards.
- **Worker profile** — new gradient profile hero with avatar ring + stat chips.
- **Reputation modal** — new conic-gradient score-ring hero + tinted stat cards.
- **Skill section** — colourful gradient skill cards (profile + applicant).
- **Global** — badges + empty states restyled app-wide.

## 3. Bolt visual patterns adopted

- **Gradient hero panels** with decorative blurred blobs (Bolt dashboard headers).
- **Colourful stat cards** with gradient icon chips (Bolt `StatCard`).
- **Role-distinct colour identity** — warm orange (worker), orange-rose (employer), cool slate-indigo (admin) — echoing Bolt's sectioned dashboards.
- **Larger radii (`rounded-3xl`)**, layered shadows, hover lift, tinted card washes.
- **Polished pill badges** with subtle rings.
- **Gradient progress bars** for the skill cards.
- **Ring-gauge score visual** for the reputation modal.

NOT copied: Bolt logic, stores, routing, mock business data, package.json,
Vite/react-router setup.

## 4. Before / after visual difference summary

| Surface | Before (Batches 1–5) | After (this redesign) |
|---|---|---|
| Worker dashboard hero | Pale cream gradient strip, small avatar, dark text | **Bold orange gradient panel**, 64px white-ring avatar, white CTAs, decorative blobs |
| Worker/employer stat tiles | Flat white card, thin top accent bar, no icon | **Tinted gradient card + colourful gradient icon chip**, `text-3xl` value |
| Employer dashboard hero | Same pale cream strip as worker (indistinguishable) | **Orange→rose gradient**, visibly distinct from worker |
| Admin dashboard hero | Pale cream strip (same warm look) | **Cool slate→indigo control panel**, clearly a different area |
| Worker profile hero | White card, avatar + small reputation badge | **Orange gradient hero**, large avatar ring, inline stat chips |
| Reputation modal | Flat orange tint summary box | **Conic-gradient score ring** + gradient hero + tinted stat cards |
| Skill cards | Grey card, flat indigo bar | **Indigo gradient card + gradient progress bar + gradient level chip** |
| Badges | Flat colour pill | **Pill with tonal ring, semibold** |
| Empty states | Bare 56px glyph | **Glyph in gradient chip card**, larger title |

Screenshot file sizes corroborate the change (e.g. worker dashboard
~290KB → ~437KB, employer dashboard ~324KB → ~428KB, profile ~380KB →
~492KB) — substantially more visual content rendered.

## 5. Logic preservation checklist

| Invariant | Status |
|---|---|
| `getShiftLifecycleState` | ✅ untouched |
| `ShiftLifecycleBadge` | ✅ untouched |
| Attendance state machine | ✅ untouched |
| Checkout-after-end rule (`canCheckOut`) | ✅ untouched |
| Employer present/absent buttons | ✅ untouched |
| Draft separation (worker can't see draft) | ✅ untouched |
| Wallet / ledger | ✅ untouched |
| Notifications / deeplinks | ✅ untouched |
| Same-route intents | ✅ untouched |
| Disputes | ✅ untouched |
| Reviews / reporting | ✅ untouched |
| Skill progression | ✅ untouched (visual-only card change) |
| Availability recommendations | ✅ untouched |
| All routes (28) | ✅ unchanged |
| All tests | ✅ pass |

## 6. Test results

- `npm run test:run`: **544 / 544 passed**.
- `npm run build`: **clean, 28 routes**.
- `npm run test:e2e` (chromium): **112 / 112 passed**.
- `npm run test:time`: **22 / 22 passed**.
- Horizontal-overflow sweep: **0 offenders** across 9 routes × 5 viewports
  (1920 / 1440 / 1366 / 1280 / 1024).

## 7. Screenshots (1440×900)

- `qa-exploration/shots/redesign-home.png`
- `qa-exploration/shots/redesign-worker-dashboard.png`
- `qa-exploration/shots/redesign-worker-profile.png`
- `qa-exploration/shots/redesign-reputation-modal.png`
- `qa-exploration/shots/redesign-employer-dashboard.png`
- `qa-exploration/shots/redesign-employer-create-shift.png`
- `qa-exploration/shots/redesign-employer-shift-detail.png`
- `qa-exploration/shots/redesign-admin-dashboard.png`

## 8. Remaining visual issues

- The employer create-shift and shift-detail pages keep the Batch-3
  multi-section / applicant-bucket structure; they inherit the new
  Badge / EmptyState / Card polish but did not get a new gradient hero
  this pass (they are task-focused forms, not overview surfaces). Could
  be deepened in a follow-up if desired.
- Calendar Week/Day grid still scrolls inside its own panel below ~768px
  (intentional, pre-existing).
- Mock-only data; no real product photography.

## 9. Is the redesign visually significant?

**Yes.** The three dashboards now open on bold, role-distinct gradient
heroes (warm orange / orange-rose / cool slate-indigo), the stat grids are
colourful gradient-icon-chip cards instead of flat white boxes, the worker
profile and reputation modal lead with premium gradient visuals (incl. a
conic score ring), and the global badge / empty-state / skill-card
treatments are visibly more polished. The change is clearly perceptible at
first glance, not a shadow tweak.

## Manual QA readiness verdict

**READY.**
- UI is visibly different from the old app. ✅
- Homepage modern (already strong; inherits global polish). ✅
- Worker dashboard redesigned. ✅
- Employer dashboard redesigned. ✅
- Admin dashboard redesigned. ✅
- Profile + reputation modal redesigned. ✅
- All tests pass (544 unit / 112 E2E / 22 time-travel). ✅
- No core logic broken; 28 routes intact. ✅

No auto-commit performed — the user commits explicitly.
