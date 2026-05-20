# Implementation Plan: CaLẻ / ShiftNow

## Overview

This plan converts the requirements and design into incremental coding tasks for a front-end-only Next.js MVP. Pure domain modules are built first with property-based tests covering Properties 1–18 from the design. The data layer, Zustand stores, UI primitives, and role-scoped pages are then layered on top so each step compiles and runs against the previous step.

Stack: Next.js (App Router) + React + TypeScript + Tailwind CSS + Zustand + Vitest + fast-check + React Testing Library.

## Tasks

- [ ] 1. Bootstrap Next.js project and tooling
  - [x] 1.1 Initialize Next.js App Router project with TypeScript and Tailwind
    - Run `create-next-app` with TypeScript, Tailwind, App Router, ESLint, `src/` directory, no Turbopack default
    - Configure `tsconfig.json` with `strict: true` and `@/*` path alias to `src/*`
    - Set `<html lang="vi">` in `app/layout.tsx`
    - Add Vietnamese-compatible font (`Inter` via `next/font`) in the root layout
    - _Requirements: 17.1, 27.1_

  - [x] 1.2 Configure Tailwind for mobile-first responsive design
    - Verify default mobile-first breakpoints (sm/md/lg/xl) are active
    - Add `min-h-[44px]` / `min-w-[44px]` utility usage convention for touch targets in a comment block in `tailwind.config.ts`
    - Configure `content` globs to include `src/**/*.{ts,tsx}`
    - _Requirements: 17.1, 17.4_

  - [x] 1.3 Set up Vitest, fast-check, and React Testing Library
    - Install `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fast-check`
    - Add `vitest.config.ts` with `jsdom` environment, `@/` alias, and `setupFiles` for jest-dom matchers
    - Add `test` and `test:run` scripts to `package.json`
    - Create `src/__tests__/sanity.test.ts` that asserts `1 + 1 === 2` and confirm the runner works
    - _Requirements: (tooling — supports all property-test requirements below)_

  - [x] 1.4 Create folder skeleton matching the design
    - Create empty index files for: `src/app/`, `src/components/{ui,shift,user,layout,forms}/`, `src/stores/`, `src/domain/`, `src/data/seed/`, `src/i18n/`, `src/lib/`, `src/types/`
    - Add `src/__tests__/{properties,generators}/` directories
    - _Requirements: (structural)_

- [x] 2. Define shared TypeScript types
  - [x] 2.1 Implement enums and core entity types in `src/types/index.ts`
    - Define `Role`, `VerificationFlag`, `ShiftStatus`, `EscrowStatus`, `ApplicationStatus`, `DisputeStatus`, `NotificationKind`
    - Define `BaseUser`, `Worker`, `Employer`, `Admin`, `User` discriminated union
    - Define `Shift`, `Application`, `Rating`, `CancellationRecord`, `Notification`, `Dispute`, `BoostCreditLedgerEntry`
    - Define generic `Result<T, E>` discriminated union
    - _Requirements: 1.1, 1.5, 2.1, 2.5, 3.1, 6.2, 8.1, 10.1, 13.1, 15.4_

- [ ] 3. Implement pure domain modules with property-based tests
  - [ ] 3.1 Implement `src/domain/deposit.ts`
    - Implement `hoursBetween(start, end)` for `HH:mm` strings (handle non-overnight only)
    - Implement `calculateDeposit(wage, hours, positions) = wage * hours * positions`
    - _Requirements: 3.2_

  - [ ]* 3.2 Write property test for deposit calculation
    - **Property 2: Deposit total is the product**
    - **Validates: Requirements 3.2**
    - Use `fc.nat({ max: 1_000_000 })`, positive `hours`, positive `positions`; assert non-negative, equals product, monotonic in each argument
    - File: `src/__tests__/properties/deposit.property.test.ts`

  - [ ] 3.3 Implement `src/domain/reputation.ts`
    - Constants `INITIAL_SCORE=100`, `MIN_SCORE=0`, `MAX_SCORE=100`, `APPLY_THRESHOLD=50`
    - Implement `applyReputationEvent(score, event)` with deltas `+5/-20/-10` and admin-adjust delta, clamped to `[0, 100]`
    - Implement `canApplyToShifts(score)` returning `score >= APPLY_THRESHOLD`
    - Implement `classifyCancellation(applicationStatus, shiftStartISO, nowISO)` returning `'NoPenalty' | 'OnTime' | 'LateCancel'`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 12.1, 12.2, 12.3, 14.5_

  - [ ]* 3.4 Write property test for reputation score evolution
    - **Property 5: Reputation score evolution**
    - **Validates: Requirements 8.2, 8.3, 8.4, 14.5**
    - Generate arbitrary starting score and a sequence of events; assert final equals clamped sum and every intermediate score stays in `[0, 100]`
    - File: `src/__tests__/properties/reputation-evolution.property.test.ts`

  - [ ]* 3.5 Write property test for reputation threshold
    - **Property 6: Reputation threshold gates new applications**
    - **Validates: Requirements 8.5**
    - Property: for any integer score, `canApplyToShifts(s) === (s >= 50)`
    - File: `src/__tests__/properties/reputation-threshold.property.test.ts`

  - [ ]* 3.6 Write property test for cancellation classification
    - **Property 7: Cancellation classification**
    - **Validates: Requirements 12.1, 12.2, 12.3**
    - Generate arbitrary `now`, `shiftStart`, application status; assert mapping to `NoPenalty / OnTime / LateCancel` and that only `LateCancel` triggers the −10 reputation delta
    - File: `src/__tests__/properties/cancellation.property.test.ts`

  - [ ] 3.7 Implement `src/domain/escrow.ts` state machine
    - Define `EscrowEvent` union from the design
    - Implement `transitionEscrow(current, event)` covering all legal transitions; return current status for illegal events
    - Implement `isTerminalEscrow(s)` returning `true` for `'Released' | 'Refunded'`
    - _Requirements: 3.4, 9.3, 9.5, 10.2, 10.3, 10.4, 10.5, 10.6, 25.4_

  - [ ]* 3.8 Write property test for escrow state machine
    - **Property 3: Escrow state machine**
    - **Validates: Requirements 3.4, 9.3, 9.5, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 15.5, 25.4**
    - For arbitrary `(status, event)` pairs assert: result is either a defined next state or unchanged; terminal states never transition out; `NoShow` always lands on `Refunded`
    - File: `src/__tests__/properties/escrow.property.test.ts`

  - [ ] 3.9 Implement `src/domain/conflict.ts`
    - Define `TimeRange` interface with `date`, `startTime`, `endTime`
    - Constant `BUFFER_MINUTES = 60`
    - Implement `hasConflict(target, approved)` using `[target.start − 60min, target.end + 60min]` window
    - Implement `findConflicts(target, approved)` returning the offending ranges
    - _Requirements: 5.4, 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]* 3.10 Write property test for time conflict detection
    - **Property 9: Time conflict detection with one-hour buffer**
    - **Validates: Requirements 5.4, 22.1, 22.2, 22.3, 22.4**
    - Generate arbitrary `target` and approved list; assert `hasConflict` matches the buffered-overlap predicate; assert no conflict when approved list is empty
    - File: `src/__tests__/properties/conflict.property.test.ts`

  - [ ] 3.11 Implement `src/domain/timeGates.ts` for check-in/out/no-show and edit/cancel 24h
    - Implement `canCheckIn(now, application, shift)`, `canCheckOut(now, application, shift)`, `shouldMarkNoShow(now, application, shift)`
    - Implement `canEditShift(now, shift)` and `canCancelShift(now, shift)` enforcing the 24h gate and not-already-completed/cancelled rule
    - _Requirements: 7.1, 7.3, 7.5, 25.1, 25.3_

  - [ ]* 3.12 Write property test for check-in/out/no-show gates
    - **Property 10: Check-in, check-out and no-show time gates**
    - **Validates: Requirements 7.1, 7.3, 7.5**
    - Verify each predicate is `true` exactly when the design's interval condition holds; verify mutual exclusivity for a single application
    - File: `src/__tests__/properties/time-gates.property.test.ts`

  - [ ]* 3.13 Write property test for edit/cancel 24-hour gates
    - **Property 11: Edit and cancel 24-hour gates for employers**
    - **Validates: Requirements 25.1, 25.3**
    - Generate arbitrary `now` and shift start; assert both predicates iff `T − now ≥ 24h` and shift is not cancelled/completed
    - File: `src/__tests__/properties/edit-cancel-gate.property.test.ts`

  - [ ] 3.14 Implement `src/domain/filter.ts`
    - Define `FilterCriteria` interface
    - Implement `applyFilters(shifts, criteria)` enforcing: status ∈ {Published, FullyBooked}, escrow = Deposited, start datetime ≥ now, criteria match (case-insensitive substring on title/location/description), wage range, date range, jobType
    - Preserve input order for matching shifts
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 19.2, 19.3, 19.4, 29.1, 29.2, 29.3, 29.4_

  - [ ]* 3.15 Write property test for shift filtering and publication invariant
    - **Property 4: Listing predicate and publication invariant**
    - **Validates: Requirements 3.3, 4.1, 4.3, 19.2, 19.4, 29.1, 29.2, 29.3, 29.4**
    - Generate arbitrary shifts and criteria; assert returned set equals the predicate; assert no non-Deposited shift ever appears
    - File: `src/__tests__/properties/filter.property.test.ts`

  - [ ] 3.16 Implement `src/domain/rating.ts`
    - Implement `averageRating(ratings)` returning `null` for empty list, mean otherwise
    - _Requirements: 13.3_

  - [ ]* 3.17 Write property test for average rating
    - **Property 12: Average rating is the arithmetic mean**
    - **Validates: Requirements 13.3**
    - Generate non-empty rating arrays; assert mean equals `Σ stars / n`, lies in `[1, 5]`, is permutation-invariant; empty list returns `null`
    - File: `src/__tests__/properties/rating.property.test.ts`

- [ ] 4. Implement formatting and validation utilities with property-based tests
  - [ ] 4.1 Implement `src/lib/format.ts` and `src/lib/parse.ts`
    - `formatVND(n)` using `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`
    - `formatDateVN(iso)` using `Intl.DateTimeFormat('vi-VN', { day, month, year: '2-digit'/'numeric' })` to produce `DD/MM/YYYY`
    - `parseDateVN(formatted)` returning the original ISO `YYYY-MM-DD`
    - `formatTimeVN(hhmm)` passthrough
    - `isSessionExpired(now, lastActivityAt)` returning `now − lastActivityAt > 24h`
    - _Requirements: 27.2, 27.3, 30.2_

  - [ ]* 4.2 Write property test for VND currency formatting
    - **Property 15: VND currency formatting round-trip**
    - **Validates: Requirements 27.2**
    - Generate non-negative integers; assert formatted output contains only digits/separators/`₫` and digit-stripping parses back to the input
    - File: `src/__tests__/properties/format-vnd.property.test.ts`

  - [ ]* 4.3 Write property test for date formatting round-trip
    - **Property 16: Date formatting round-trip**
    - **Validates: Requirements 27.3**
    - Generate valid `YYYY-MM-DD` strings; assert `parseDateVN(formatDateVN(d)) === d` and output matches `^\d{2}/\d{2}/\d{4}$`
    - File: `src/__tests__/properties/format-date.property.test.ts`

  - [ ]* 4.4 Write property test for session expiration predicate
    - **Property 18: Session expiration predicate**
    - **Validates: Requirements 30.2**
    - Generate arbitrary `now` and `lastActivityAt`; assert predicate matches `now − last > 24h`
    - File: `src/__tests__/properties/session-expiration.property.test.ts`

  - [ ] 4.5 Implement `src/lib/validate.ts`
    - `isRequired(v)`, `isValidEmail(s)`, `isValidPassword(s)` (min length 8)
    - `isValidVNPhone(s)` accepting `+84` / `84` / `0` prefix and 9-digit subscriber with carrier prefix in `{3,5,7,8,9}`; never throws
    - All validators return `Result<true, string>` style discriminated unions for use by forms
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [ ]* 4.6 Write property test for Vietnamese phone validator
    - **Property 17: Vietnamese phone validator**
    - **Validates: Requirements 28.3**
    - Generate arbitrary strings (including symbols and unicode); assert no throw; assert validity matches the canonical regex
    - File: `src/__tests__/properties/vn-phone.property.test.ts`

  - [ ] 4.7 Implement `src/lib/ids.ts`
    - Tiny id generator using `crypto.randomUUID()` with a typed wrapper
    - _Requirements: (supports 3.1, 5.3, 6.3, 9.4, 13.1, 18.x)_

- [ ] 5. Build data layer (seeds, persistence, hydration)
  - [ ] 5.1 Author mock seed JSON files in `src/data/seed/`
    - `users.json`: 3 employers, 6 workers (mix of verification statuses and reputation scores including one < 50), 1 admin
    - `shifts.json`: at least 8 shifts spanning Draft/Published/FullyBooked/Completed/Cancelled with realistic Vietnamese titles and districts
    - `applications.json`: cover Pending/Approved/Rejected/CheckedIn/CheckedOut/Confirmed
    - `ratings.json`, `notifications.json`, `disputes.json`, `boostLedger.json`
    - _Requirements: 4.1, 4.4, 6.1, 14.1, 15.1, 18.1, 26.1, 26.2, 26.3, 26.4, 26.5_

  - [ ] 5.2 Implement `src/data/persistence.ts`
    - Constants for all `cale.*` localStorage keys and `SCHEMA_VERSION`
    - `read<T>(key, fallback)` and `write<T>(key, value)` with try/catch
    - `loadAll()` reads every key; on schema mismatch or parse error, reseeds from `data/seed/*.json` and returns the seeded snapshot
    - `persistAll(state)` writes each store slice back
    - _Requirements: (supports persistence across all stateful requirements)_

  - [ ]* 5.3 Write unit tests for persistence
    - Cover happy path, corrupted JSON, version bump, missing keys
    - File: `src/data/persistence.test.ts`

- [ ] 6. Build Zustand stores wired to domain modules and persistence
  - [ ] 6.1 Implement `src/stores/authStore.ts`
    - `currentUser`, `login(email, password)` returning `Result`, `register(input)`, `logout()`, `touch()`
    - Block login when `user.suspended === true` (return `{ ok: false, reason: 'SUSPENDED' }`)
    - Persist to `cale.auth`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 14.4, 30.2_

  - [ ] 6.2 Implement `src/stores/shiftStore.ts`
    - `create`, `simulateDeposit`, `edit`, `cancel`, `list(filter)` (delegates to `domain/filter`), `setStatus`, `useBoostCredit`
    - `simulateDeposit` flips escrow `PendingDeposit → Deposited` and shift `Draft → Published`
    - `cancel` enforces `canCancelShift` from `domain/timeGates`; refunds escrow via `transitionEscrow('CancelShift')`
    - `edit` enforces `canEditShift` and forbids changing `wage` and `date`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 25.1, 25.2, 25.3, 25.4, 25.5, 29.1, 29.2, 29.4_

  - [ ] 6.3 Implement `src/stores/applicationStore.ts`
    - `apply(shiftId, workerId)` returning `Result<Application, 'VERIFICATION_REQUIRED' | 'REPUTATION_TOO_LOW' | 'CONFLICT' | 'FULLY_BOOKED' | 'ALREADY_APPLIED'>`
    - Calls `verifications.includes('phone')`, `canApplyToShifts(score)`, `hasConflict(target, approvedRanges)`
    - `approve(id)`: sets status `Approved`, increments `positionsFilled`, marks shift `FullyBooked` when full
    - `reject(id)`, `cancelByWorker(id)` (uses `classifyCancellation` and applies reputation event), `checkIn`, `checkOut`, `confirmCompletion(id, rating)`, `markNoShow(id)` (grants Boost_Credit, refunds escrow), `reportIssue(id, reason)` (creates Dispute)
    - Maintains the position counter invariant on every mutation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 6.4, 6.5, 7.2, 7.4, 7.5, 8.2, 8.3, 8.4, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.4, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.5_

  - [ ]* 6.4 Write property test for application gating (verification + reputation)
    - **Property 1: Verification gates application**
    - **Property 6: Reputation threshold gates new applications (integration through store)**
    - **Validates: Requirements 2.1, 5.1, 5.2, 8.5**
    - Generate arbitrary worker (verification flags + score) and shift; assert `apply` returns `VERIFICATION_REQUIRED` iff phone missing, `REPUTATION_TOO_LOW` iff score < 50; assert no Application is persisted on rejection
    - File: `src/__tests__/properties/application-gates.property.test.ts`

  - [ ]* 6.5 Write property test for position counter invariant
    - **Property 8: Position counter invariant**
    - **Validates: Requirements 6.3, 6.4, 12.4**
    - Generate a shift and a sequence of approve/reject/cancel/no-show ops; after every step assert the four invariants from the design
    - File: `src/__tests__/properties/positions-invariant.property.test.ts`

  - [ ]* 6.6 Write property test for rating immutability
    - **Property 13: Ratings are immutable after creation**
    - **Validates: Requirements 13.5**
    - Create a rating via `confirmCompletion`; run an arbitrary sequence of subsequent store ops; assert deep-equality to the snapshot
    - File: `src/__tests__/properties/rating-immutable.property.test.ts`

  - [ ] 6.7 Implement `src/stores/notificationStore.ts`
    - `push(n)`, `markRead(id)`, `unreadCount(userId)`
    - Other stores call `push` for each notification kind defined in `NotificationKind`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ]* 6.8 Write property test for unread notification count
    - **Property 14: Unread notification count**
    - **Validates: Requirements 18.5**
    - Generate notifications and a target userId; assert count equals filtered length; `markRead` decrements by exactly 1 when previously unread for that user
    - File: `src/__tests__/properties/notifications.property.test.ts`

  - [ ] 6.9 Implement `src/stores/adminStore.ts`
    - `suspend(userId)`, `reactivate(userId)`, `adjustReputation(workerId, delta, note)` (records reason), `overrideEscrow(shiftId, status, note)`, `resolveDispute(disputeId, outcome, note)`
    - _Requirements: 14.3, 14.4, 14.5, 15.3, 15.5_

  - [ ] 6.10 Implement `<AppHydrator>` client component
    - On mount, call `persistence.loadAll()` and seed all Zustand stores once
    - Mount in root `app/layout.tsx`
    - _Requirements: (cross-cutting; supports all stateful requirements)_

- [x] 7. Checkpoint - Domain and stores complete
  - Ensure all property tests and unit tests pass, ask the user if questions arise.

- [x] 8. Build Vietnamese localization layer
  - [x] 8.1 Create `src/i18n/vi.ts` dictionary
    - Flat `vi: Record<string, string>` with dotted keys covering: nav, auth, landing, shift listing/detail/create, dashboards (worker/employer/admin), notifications, errors, validation messages, status labels, escrow labels, verification badges, empty states (`Không tìm thấy ca làm phù hợp`)
    - Export `t(key)` helper that returns the value or the key with a `console.warn` in dev
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 19.5, 27.1, 27.4, 27.5, 28.1, 28.2_

- [x] 9. Build UI primitives in `src/components/ui/`
  - [x] 9.1 Implement `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`
    - Tailwind classes for variants; `min-h-[44px]` on Button and Input; `aria-invalid` and error message slot on inputs
    - All component strings come from `t()`
    - _Requirements: 17.4, 28.1, 28.5_

  - [x] 9.2 Implement `Modal`, `Toast`, `EmptyState`, `StarRating`
    - `Modal` with focus trap, ESC-to-close, and `aria-modal`
    - `Toast` host wired to `notificationStore` for transient action errors
    - `EmptyState` accepts localized `title`, `description`, optional `action`
    - `StarRating` 1–5, controlled and read-only modes
    - _Requirements: 13.1, 13.2, 18.1, 18.4, 19.5, 28.5_

  - [ ]* 9.3 Write component unit tests for primitives
    - Test 44×44 minimum sizing on Button/Input
    - Test Modal focus trap and ESC handler
    - Test StarRating click sets value and read-only mode disables clicks
    - Files: `src/components/ui/*.test.tsx`
    - _Requirements: 17.4, 13.5_

- [x] 10. Build domain-specific components
  - [x] 10.1 Implement shift components in `src/components/shift/`
    - `ShiftStatusBadge`, `EscrowStatusBadge` mapping status → colored `Badge`
    - `ShiftCard` showing title, location, `formatDateVN(date)`, time, `formatVND(hourlyWage)`, positions remaining, employer name, status badge
    - `ShiftFilters` controlled component with location, date range, wage range, jobType selectors; stacks vertically on mobile
    - `ShiftSearchBar` with 300 ms debounced text input that updates URL query and filter state
    - _Requirements: 4.2, 4.4, 4.5, 17.3, 19.1, 19.3, 19.4, 27.2, 27.3_

  - [x] 10.2 Implement user components in `src/components/user/`
    - `UserAvatar` with initials fallback
    - `ReputationBadge` color-coded (green ≥ 80, amber 50–79, red < 50)
    - `VerificationBadge` chips for phone/id/student
    - `WorkerProfileCard` for application review screens
    - _Requirements: 2.5, 6.2, 8.1, 24.3_

  - [x] 10.3 Implement form components in `src/components/forms/`
    - `LoginForm`, `RegisterForm` (with role selection)
    - `ShiftForm` (create/edit) using `calculateDeposit` to display the simulated deposit total live
    - `ApplicationActions` (Apply / Cancel) gated by verification + reputation + conflict via `applicationStore.apply`
    - `RatingForm` 1–5 stars + optional textarea, locked once submitted
    - All forms use `lib/validate.ts`; error messages via `t()` keys
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 9.4, 12.1, 13.1, 13.2, 13.5, 28.1, 28.2, 28.3, 28.4_

- [x] 11. Build layout components and access control
  - [x] 11.1 Implement `NavBar` (desktop) and `MobileNav` (hamburger) in `src/components/layout/`
    - Desktop visible at `md:flex`; hamburger drawer at `md:hidden`
    - Items generated from current role (`worker`, `employer`, `admin`, or guest)
    - `NotificationBell` with unread badge sourced from `notificationStore.unreadCount`
    - `Footer` with localized links to landing sections
    - _Requirements: 17.2, 18.5, 27.1_

  - [x] 11.2 Implement `RoleGuard` component
    - Reads `authStore.currentUser`; redirects unauthenticated to `/login`, wrong-role to that user's dashboard
    - Used in every role-scoped route segment
    - On every mount, also calls `isSessionExpired` and logs out if true
    - _Requirements: 1.3, 1.5, 14.4, 30.2_

- [x] 12. Build authentication and landing pages
  - [x] 12.1 Implement `app/page.tsx` landing page
    - Vietnamese hero, separate CTAs for `Đăng ký Nhà tuyển dụng` and `Đăng ký Người làm`
    - Sections for employer benefits, worker benefits, and "How It Works"
    - Server Component (no client state needed)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 12.2 Implement `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`
    - Use `LoginForm` / `RegisterForm`; on success redirect by role
    - Show suspension message when `reason === 'SUSPENDED'`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 14.4_

- [x] 13. Build shift discovery pages
  - [x] 13.1 Implement `app/shifts/page.tsx` (listing + filters + search)
    - Reads `shiftStore.list(filter)`, displays `ShiftCard` grid
    - Wires `ShiftFilters` and `ShiftSearchBar`; URL query syncs with filter state
    - Empty state shows `Không tìm thấy ca làm phù hợp`
    - Excludes shifts with start datetime in the past
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 17.1, 17.3, 19.1, 19.2, 19.3, 19.4, 19.5, 29.4_

  - [x] 13.2 Implement `app/shifts/[id]/page.tsx` (shift detail)
    - Show full shift info, employer profile snippet, positions remaining
    - Worker view: `ApplicationActions` with verification/reputation/conflict gating; show conflict details on `CONFLICT` reason (Req 22.5)
    - Hide Apply when `FullyBooked`
    - Sticky bottom action bar on mobile
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4, 17.3, 22.1, 22.2, 22.3, 22.4, 22.5, 23.2_

- [x] 14. Build worker pages
  - [x] 14.1 Implement `app/worker/dashboard/page.tsx`
    - Stats: completed shifts, total earnings (sum of `payoutAmount` for `Confirmed` apps), reputation score, average rating received, upcoming approved shifts with check-in status
    - Notifications list (read/unread) with `markRead` on click
    - Buttons for `Check_In` and `Check_Out` gated by `canCheckIn` / `canCheckOut`
    - Wrapped in `<RoleGuard role="worker">`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 18.1, 18.4, 18.5, 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 14.2 Implement `app/worker/profile/page.tsx`
    - Edit photo, bio, skills, preferred job types, preferred locations
    - View completed shift count, reputation score, average rating, verification status, rating history, cancellation history
    - "Verify phone" button toggles `verifications` flag (mocked)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 12.5, 13.4, 24.1, 24.2, 24.3, 24.4, 24.5_

- [x] 15. Build employer pages
  - [x] 15.1 Implement `app/employer/dashboard/page.tsx`
    - Stats: total posted shifts, total completed, total deposited, total paid out, average rating given, upcoming shifts with application counts
    - Notifications list (`ApplicationReceived`, `NoShow`, `LateCancel`)
    - Wrapped in `<RoleGuard role="employer">`
    - _Requirements: 18.2, 18.3, 18.5, 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 15.2 Implement `app/employer/shifts/new/page.tsx`
    - `ShiftForm` create flow; live deposit total; `Mô phỏng đặt cọc` button calls `shiftStore.simulateDeposit`
    - On deposit, escrow → `Deposited`, status → `Published`, redirect to manage page
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.2, 10.3, 28.1, 28.2, 28.4, 29.1, 29.2_

  - [x] 15.3 Implement `app/employer/shifts/[id]/page.tsx`
    - List applications with `WorkerProfileCard`, verification badges, reputation badge
    - Approve / Reject buttons calling `applicationStore`
    - For `CheckedOut` applications: Confirm completion (with `RatingForm`) or Report issue (creates Dispute)
    - Edit / Cancel buttons gated by 24h rule via `domain/timeGates`
    - `Use Boost_Credit` button when credit balance > 0
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.5, 9.1, 9.2, 9.3, 9.4, 9.5, 11.2, 11.3, 11.4, 11.5, 13.1, 13.2, 13.5, 25.1, 25.2, 25.3, 25.4, 25.5_

  - [x] 15.4 Implement `app/employer/profile/page.tsx`
    - Edit company name, business type, description, logo, verified-business flag (mocked)
    - Display total posted shifts and average rating from workers
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 16. Build admin pages
  - [x] 16.1 Implement `app/admin/dashboard/page.tsx`
    - Tabs/sections: Users, Shifts, Disputes, Analytics
    - Users: list with verification, reputation, suspend/reactivate, manual reputation adjustment with reason note
    - Shifts: list with status, escrow status, override escrow with note
    - Disputes: list with resolve action (`ResolvedReleased` / `ResolvedRefunded`) + note
    - Analytics: total employers, workers, shifts posted, shifts completed, active disputes
    - Wrapped in `<RoleGuard role="admin">`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 17. Checkpoint - All pages render and connect to stores
  - Ensure all tests pass and the app boots with seeded data, ask the user if questions arise.

- [ ] 18. Add cross-cutting integration tests and final polish
  - [ ]* 18.1 Write integration tests for end-to-end shift lifecycle
    - Seed data; simulate: employer creates → deposits → publishes → worker applies → employer approves → worker checks in → checks out → employer confirms with rating → reputation +5 → escrow Released
    - File: `src/__tests__/integration/lifecycle.test.ts`
    - _Requirements: 3.1–3.5, 5.1–5.5, 6.3, 7.1–7.4, 8.2, 9.3, 9.4, 10.2–10.5, 13.1–13.3_

  - [ ]* 18.2 Write integration tests for no-show, late-cancel, and dispute flows
    - No-show: reputation −20, escrow Refunded, employer +1 Boost_Credit, notifications to both parties
    - Late-cancel: reputation −10, position decrements, employer notified
    - Dispute: report issue → admin resolves with `ResolvedRefunded` → escrow `Refunded`
    - File: `src/__tests__/integration/exceptions.test.ts`
    - _Requirements: 7.5, 8.3, 8.4, 11.1, 11.2, 11.4, 12.3, 12.4, 9.5, 15.5_

  - [ ] 18.3 Implement responsive verification utility pass
    - Audit every page for `min-h-[44px]` on interactive elements, single-column mobile layout, hamburger nav under `md`
    - Add a stylelint or eslint comment-based audit checklist in `RESPONSIVE.md`
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ] 18.4 Implement Vietnamese localization audit
    - Grep for any bare Vietnamese or English UI strings outside `vi.ts`; move them to keys
    - Verify all currency uses `formatVND`, all dates use `formatDateVN`
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 19. Final checkpoint - MVP ready for demo
  - Ensure all tests pass (unit, property, integration), all pages render with seeded data, and responsive behavior is verified at 375 px / 768 px / 1280 px widths. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP (test-only sub-tasks). All other sub-tasks must be implemented.
- Each task references specific requirements for traceability.
- Property-based test sub-tasks each map to exactly one Property from the design's Correctness Properties section (Properties 1–18).
- Checkpoints (tasks 7, 17, 19) ensure incremental validation between phases.
- The MVP is front-end only: no real backend, no real auth, no real payment. All persistence is `localStorage`.
- Pure domain modules (`src/domain/*`) are framework-free TypeScript so they can later be moved server-side without rewriting.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "3.3", "3.7", "3.9", "3.11", "3.14", "3.16", "4.1", "4.5", "4.7", "5.1", "8.1"] },
    { "id": 4, "tasks": ["3.2", "3.4", "3.5", "3.6", "3.8", "3.10", "3.12", "3.13", "3.15", "3.17", "4.2", "4.3", "4.4", "4.6", "5.2"] },
    { "id": 5, "tasks": ["5.3", "6.1", "6.2", "6.7", "6.9"] },
    { "id": 6, "tasks": ["6.3", "6.10"] },
    { "id": 7, "tasks": ["6.4", "6.5", "6.6", "6.8", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.2"] },
    { "id": 9, "tasks": ["9.3", "10.1", "10.3", "11.1", "11.2"] },
    { "id": 10, "tasks": ["12.1", "12.2", "13.1", "14.2", "15.4", "16.1"] },
    { "id": 11, "tasks": ["13.2", "14.1", "15.1", "15.2"] },
    { "id": 12, "tasks": ["15.3"] },
    { "id": 13, "tasks": ["18.1", "18.2", "18.3", "18.4"] }
  ]
}
```
