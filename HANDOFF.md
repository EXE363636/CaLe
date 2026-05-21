# CaLẻ / ShiftNow — Project Handoff

A handoff document for the next developer (or Kiro session) picking up this MVP. Read top to bottom before touching code.

---

## 1. Project Overview

**CaLẻ / ShiftNow** is a responsive web MVP that connects employers in Vietnam with short-term workers (students, freelancers) for shifts lasting a few hours to one day. The platform builds trust through worker verification, reputation scoring, and a simulated escrow system where the employer deposits wages up front and the platform releases payment only after the worker completes the shift and the employer confirms.

**Core flow:**

```
Employer creates shift → deposits (mock) → shift goes Published
Worker browses /shifts → applies → employer approves
Worker checks in → checks out → employer confirms + rates → escrow Released
```

Failure paths: worker no-shows (refund + boost credit to employer, reputation hit to worker), worker late-cancels (reputation hit), employer reports issue (dispute opened, admin resolves).

**Three roles:** Worker, Employer, Admin. Each has a dedicated dashboard and access guard.

UI is fully Vietnamese — every user-facing string flows through `src/i18n/vi.ts`.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| UI | React 19.2.4 + TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-config in `globals.css`, no `tailwind.config.ts`) |
| State | Zustand 5 |
| Tests | Vitest + fast-check + React Testing Library (configured but minimal tests written) |
| Persistence | `localStorage` via `src/data/persistence.ts` (schema-versioned, SSR-safe) |
| Auth | **Mock only** — passwords stored as `mock-hash:<value>` placeholders |
| Payment | **Simulated** — escrow state machine in `src/domain/escrow.ts`, no real money movement |
| i18n | Single Vietnamese dictionary in `src/i18n/vi.ts` with `t()` helper, no library |

Path alias: `@/*` → `./src/*`.

---

## 3. Current Implementation Status

**Build:** passes cleanly (`npx next build` exits 0, 13 routes).

**Routes:**

```
○  /                          (landing)
○  /login
○  /register
○  /shifts                    (worker discovery)
ƒ  /shifts/[id]               (public detail)
○  /worker/dashboard
○  /worker/profile
○  /employer/dashboard
○  /employer/shifts/new
ƒ  /employer/shifts/[id]      (manage own shift)
○  /employer/profile
○  /admin/dashboard
○  /_not-found
```

**Project layout:**

```
src/
  app/                # Next.js routes
  components/
    ui/               # primitives: Button, Input, Modal, Toast, ...
    shift/            # ShiftCard, ShiftFilters, ShiftStatusBadge, ...
    user/             # UserAvatar, ReputationBadge, WorkerSummaryRow, WorkerProfileModal, ...
    forms/            # ShiftForm, ApplicationActions, RatingForm
    layout/           # NavBar, MobileNav, NotificationBell, RoleGuard, AppHydrator, Footer
  domain/             # PURE TypeScript — escrow, reputation, conflict, filter, deposit, rating, timeGates
  stores/             # Zustand: auth, user, shift, application, notification, admin
  data/
    persistence.ts    # localStorage I/O with schema versioning
    seed/             # JSON seed: users, shifts, applications, ratings, notifications, disputes, boostLedger
  i18n/vi.ts          # Vietnamese dictionary + status label helpers
  lib/                # format, parse, validate, ids
  types/index.ts      # All shared TypeScript types
```

---

## 4. Completed Tasks 1–16

| # | Task | Status |
|---|---|---|
| 1 | Bootstrap Next.js + TS + Tailwind + Vitest | ✅ |
| 2 | Define shared TypeScript types | ✅ |
| 3 | Pure domain modules (escrow, reputation, conflict, filter, deposit, rating, timeGates) | ✅ |
| 4 | Format/validate utilities (`formatVND`, `formatDateVN`, `isValidVNPhone`, ...) | ✅ |
| 5 | Mock seed data (10 users, 9 shifts, 13 apps, 4 ratings, 10 notifications, 2 disputes) + persistence layer | ✅ |
| 6 | Zustand stores + `<AppHydrator>` | ✅ |
| 7 | Checkpoint — domain & stores verified | ✅ |
| 8 | Vietnamese i18n dictionary | ✅ |
| 9 | UI primitives (Button, Input, Modal, StarRating, ...) | ✅ |
| 10 | Domain components (ShiftCard, ShiftForm, ApplicationActions, ...) | ✅ |
| 11 | Layout (NavBar, MobileNav, NotificationBell, RoleGuard, Footer) | ✅ |
| 12 | Landing + auth pages | ✅ |
| 13 | Shift discovery `/shifts` + detail `/shifts/[id]` | ✅ |
| 14 | Worker dashboard + profile | ✅ |
| 15 | Employer dashboard + new shift + manage shift + profile | ✅ |
| 16 | Admin dashboard (Users, Shifts, Disputes, Analytics tabs) | ✅ |

**Tasks 17–19 are checkpoints / optional polish** (integration tests, responsive audit, i18n audit). Skipped intentionally — keep it simple.

**Optional `*` test sub-tasks** (3.2–3.17, 4.2–4.6, 5.3, 6.4–6.8, 9.3, 18.1–18.2) were skipped per the "student MVP, keep it simple" directive. Only the sanity test from Task 1.3 is in place.

---

## 5. Important Business Rules

These are encoded in pure domain modules and enforced by the stores. **Do not weaken them in UI components.**

- **Workers never deposit money.** Trust is built through phone/ID/student-card verification + reputation score + ratings.
- **Employers must deposit before publishing.** A shift stays in `Draft` / `escrow=PendingDeposit` until the employer clicks "Mô phỏng đặt cọc" (`shiftStore.simulateDeposit`).
- **`/shifts` only shows actionable shifts:** `status === 'Published'` AND `escrow === 'Deposited'` AND `positionsFilled < positionsTotal` AND start time in the future. `FullyBooked` shifts are NOT shown.
- **Reputation thresholds:**
  - Initial score: 100 (clamped to `[0, 100]`)
  - +5 on confirmed completion
  - −20 on no-show
  - −10 on late-cancel (within 24h of shift start)
  - **Exactly 50 is allowed; below 50 is restricted** (`canApplyToShifts(score) === score >= 50`)
- **No real payment, no real auth, no real OTP, no real ID verification.** All payment-like things go through `transitionEscrow()`. Verification is a flag toggle on the worker profile page.
- **Admin cannot suspend self.** `adminStore.suspend()` returns `CANNOT_SUSPEND_SELF` and the UI hides the button.
- **Admin cannot suspend the last active admin.** Returns `CANNOT_SUSPEND_LAST_ADMIN`.
- **Time conflict prevention:** workers cannot apply to a shift that overlaps any of their approved shifts within a ±60-minute buffer.
- **Ratings are immutable.** `confirmCompletion` creates a `Rating` record; nothing in the store mutates it afterwards.
- **Employers can only manage their own shifts.** `/employer/shifts/[id]` returns 404 when `shift.employerId !== currentUserId`.

---

## 6. Bug Fixes Already Made (DO NOT REGRESS)

These were caught during manual QA — read the affected file's git history if you're tempted to "simplify" them.

1. **Zustand `getSnapshot` infinite loop** in `NotificationBell` and the worker/employer dashboards. **Cause:** the `notificationStore.forUser(userId)` selector ran `.filter()` on every call → returned a new array reference each render → infinite re-render. **Fix:** select the raw `notifications` array, then filter in the component with `useMemo`. **Rule:** never put non-primitive `.filter`/`.map`/`.reduce` results inside a Zustand selector body.
2. **Light theme fix.** `globals.css` had a `prefers-color-scheme: dark` block that flipped the body to near-black on Windows dark mode. Removed it, locked `color-scheme: light`, fixed the broken `--font-geist-sans` reference (we use Inter).
3. **Duplicate React key `TP.HCM`** in `WorkerProfile`'s `ChipList`. **Cause:** users could enter `"Quận 1, TP.HCM, Quận 10, TP.HCM"` and `parseList()` produced duplicates. **Fix:** key is now `${item}-${idx}`, and `parseList()` deduplicates case-insensitively.
4. **Auth/nav stale state.** `NavBar` showed the bell + logout based on `currentUserId` while nav items used `useCurrentRole()`. If localStorage had a stale ID, the user got guest links + a logged-in bell. **Fix:** new `useCurrentUser()` selector — both NavBar and MobileNav now derive `isLoggedIn` from a *resolved* User object. `AppHydrator` now auto-logouts when `currentUserId` doesn't resolve. NotificationBell closes its dropdown on logout and route change. `/login` and `/register` redirect already-authenticated users to their dashboard.
5. **Employer shift ownership.** `/employer/shifts/[id]` originally let any logged-in employer view any shift's applicants. **Fix:** added an ownership check that returns `notFound()` when `shift.employerId !== currentUserId`.
6. **Admin self-suspension lockout.** The only admin could suspend themselves. **Fix:** described above (Section 5).
7. **Applicant review UI refactor.** Old `/employer/shifts/[id]` showed worker bio + skills + completed count as plain text inline. Refactored into a compact `WorkerSummaryRow` (avatar, name, status, reputation, stat chips, top 3 skills, action buttons) + a shared `WorkerProfileModal` opened from the name or "Xem hồ sơ" button. Full bio/preferences/rating history live in the modal.

---

## 7. Current Known Status

- ✅ Build passes (13 routes, 0 errors, 0 warnings).
- ✅ TypeScript strict mode.
- ✅ All seed cross-references valid (50 records, 0 broken FKs).
- ✅ Mock auth + localStorage persistence — works on a single browser, no backend.
- ⚠️ Tests: only the `1 + 1 === 2` sanity test exists. Property-based tests were intentionally skipped.
- ⚠️ No real authentication. Anyone with the right email/password (or just `demo`) can log in as any seed user.
- ⚠️ No production deployment — designed to run locally with `npm run dev`.
- ⚠️ State is per-browser. Clearing localStorage resets everything to seed data.

---

## 8. Demo Accounts

All seed accounts use `mock-hash:demo` so any password works (the auth store accepts `"demo"` or anything else as a fallback).

| Role | Email | Password |
|---|---|---|
| Worker (verified, score 95) | `an.nguyen@gmail.com` | `demo` |
| Worker (max score 100) | `ha.tran@gmail.com` | `demo` |
| Worker (low rep, score 35 — restricted) | `em.dang@gmail.com` | `demo` |
| Employer (verified) | `lien@quanphoha.vn` | `demo` |
| Employer (verified) | `tuan@cafecong.vn` | `demo` |
| Employer (individual) | `minh@sukienvinhquang.vn` | `demo` |
| Admin | `admin@cale.vn` | `demo` |

The `/login` page also displays these as a hint box for convenience.

---

## 9. Recommended Next Steps

In priority order:

1. **Manual QA pass** — log in as each role, walk through the full lifecycle (employer creates → deposits → worker applies → approves → check-in → check-out → confirms → rating). Verify the no-show and dispute flows. Verify the ownership check on `/employer/shifts/[id]`.
2. **Responsive check** — resize to 375 / 768 / 1280 / 1920. The mobile-first Tailwind classes should hold up; flag any broken layouts.
3. **UI polish** — empty states are functional but plain; you might add nicer illustrations. Toast notifications exist but aren't wired into store error returns yet.
4. **Tasks 17–19** — only if the demo needs them. They are checkpoints + optional integration tests + responsive/i18n audits.
5. **Production-readiness** (NOT MVP scope) — would need a real backend, real auth (NextAuth or similar), real payment integration (VNPay/MoMo/Stripe), real SMS for OTP, and proper RBAC on the server. **Do not attempt this incrementally** — the mock layer is intentionally a single replaceable seam.

---

## 10. Warnings

Read these before making changes:

- **Do NOT add real payment** integration. The escrow state machine in `src/domain/escrow.ts` is the contract; replacing it requires a backend redesign, not a UI tweak.
- **Do NOT add real OTP** or real ID/CCCD verification. The verification UI is a flag toggle. Adding real OTP would require Twilio/Firebase + a backend + rate limiting.
- **Do NOT add real authentication** (JWT/session/cookie/OAuth). The mock auth store is intentional — see `src/stores/authStore.ts` comment block.
- **Do NOT over-engineer.** This is a student MVP. If a decision can be a 5-line `useMemo`, don't reach for a library. If a 50-record JSON file is enough, don't add a database.
- **Do NOT regress the bug fixes in Section 6.** Especially: don't put non-primitive computed selectors back into Zustand, don't remove the dark-mode lockout, don't drop the admin lockout guards, don't re-introduce the dual-source-of-truth `currentUserId` + `useCurrentRole()` pattern in NavBar.
- **Do NOT bypass `RoleGuard`.** Every role-scoped page must be wrapped. The guard is presentational only (no real backend), but it's the single place where role redirection is enforced.
- **Read `node_modules/next/dist/docs/`** before writing Next.js code (per workspace AGENTS.md). Next 16 has breaking changes from older Next versions.
- **Tailwind v4 is configured in CSS**, not `tailwind.config.ts`. The conventions live in the header comment of `src/app/globals.css`.

---

## Commands

```bash
# Install (once)
npm install

# Development
npm run dev          # http://localhost:3000

# Production build (also runs TypeScript check)
npm run build

# Tests (Vitest)
npm run test         # watch mode
npm run test:run     # single run
```

That's it. The MVP is shippable as a clickable demo. Good luck.
