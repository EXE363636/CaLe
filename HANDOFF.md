# CaLẻ / ShiftNow — Project Handoff

A handoff document for the next developer (or new Kiro session) picking up this MVP. Read top to bottom before touching code. **Do not rebuild from scratch.**

---

## 1. Current Project Status

- **CaLẻ / ShiftNow** is a student MVP — a responsive web app that connects employers in Vietnam with short-term workers (students, freelancers).
- Built with **Next.js 16, TypeScript (strict), Tailwind v4, Zustand 5, localStorage / mock data**.
- **Tasks 1–16 are complete** (tracked in `.kiro/specs/cale-shiftnow/tasks.md`). Tasks 17–19 are checkpoints / optional polish, intentionally skipped.
- **Build passes:** `npx next build` → exit 0, 13 routes.
- **Mock auth only.** Passwords stored as `mock-hash:<value>`. Any password works for seed accounts (the auth store accepts `"demo"` as a fallback).
- **Simulated escrow / payment only.** No real money, no payment gateway, no OTP, no real ID verification.

---

## 2. Implemented Routes (13)

```
○  /                          (landing)
○  /login
○  /register
○  /shifts                    (worker discovery, shows only actionable shifts)
ƒ  /shifts/[id]               (public detail; employer name should be clickable — see pending E)
○  /worker/dashboard
○  /worker/profile
○  /employer/dashboard
○  /employer/shifts/new
ƒ  /employer/shifts/[id]      (manage own shift; ownership-guarded)
○  /employer/profile
○  /admin/dashboard
○  /_not-found
```

Legend: `○` static, `ƒ` dynamic (server-rendered on demand).

---

## 3. Implemented Components / Features

**Layout (`src/components/layout/`)**
- `AppHydrator` — one-shot client component, reads `loadAll()` and seeds every Zustand store; auto-logouts users whose `currentUserId` no longer resolves.
- `NavBar` — sticky top bar with role-based links, notification bell, logout.
- `MobileNav` — hamburger drawer for `< md`.
- `NotificationBell` — unread badge + dropdown; closes on logout / route change.
- `Footer` — minimal site footer.
- `RoleGuard` — client-side access control (`worker | employer | admin`); redirects + idle-timeout.

**UI primitives (`src/components/ui/`)**
- `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Modal`, `Toast`, `EmptyState`, `StarRating`.

**Shift components (`src/components/shift/`)**
- `ShiftCard`, `ShiftFilters`, `ShiftSearchBar`, `ShiftStatusBadge`, `EscrowStatusBadge`.

**User components (`src/components/user/`)**
- `UserAvatar`, `ReputationBadge`, `VerificationBadge`, `WorkerProfileCard`, `WorkerSummaryRow`, `WorkerProfileModal`.

**Forms (`src/components/forms/`)**
- `ShiftForm`, `ApplicationActions`, `RatingForm`.

**Domain modules (pure TS, `src/domain/`)**
- `escrow.ts` — state machine, `transitionEscrow(state, event)`.
- `reputation.ts` — `applyReputationEvent`, `canApplyToShifts`, `classifyCancellation`, constants `INITIAL_SCORE=100`, `APPLY_THRESHOLD=50`.
- `conflict.ts` — `hasConflict(target, approved)` with 60-min buffer.
- `timeGates.ts` — `canCheckIn`, `canCheckOut`, `shouldMarkNoShow`, `canEditShift`, `canCancelShift` (24h gate).
- `filter.ts` — `applyFilters(shifts, criteria)` (publication invariant).
- `deposit.ts` — `hoursBetween`, `calculateDeposit`.
- `rating.ts` — `averageRating`.

**State (`src/stores/`)**
- `authStore` — login, register, logout, `useCurrentRole`, `useCurrentUser`.
- `userStore` — `users`, `findById`, `findByEmail`, `addUser`, `updateUser`, `setSuspended`.
- `shiftStore` — create, simulateDeposit, edit, cancel, list, useBoostCredit.
- `applicationStore` — apply, approve, reject, checkIn, checkOut, confirmCompletion, reportIssue, markNoShow, cancelByWorker.
- `notificationStore` — push, markRead, markAllRead, unreadCount.
- `adminStore` — suspend, reactivate, adjustReputation, overrideEscrow, resolveDispute.

**i18n** — single Vietnamese dictionary `src/i18n/vi.ts` with `t()` helper and typed status-label helpers (`shiftStatusLabel`, `escrowLabel`, etc.).

**Persistence** — `src/data/persistence.ts` (`localStorage`, schema-versioned, SSR-safe).

**Seed data** — 10 users (3 employers, 6 workers, 1 admin), 9 shifts, 13 applications, 4 ratings, 10 notifications, 2 disputes, 2 boost-ledger entries. All cross-references valid.

---

## 4. Established Business Rules (DO NOT WEAKEN)

- **Workers never deposit money.** Trust is built through phone/ID/student-card verification + reputation + ratings.
- **Employers must deposit before publishing.** A shift stays in `Draft` / `escrow=PendingDeposit` until `shiftStore.simulateDeposit()` is called. Then `escrow=Deposited` and `status=Published`.
- **`/shifts` shows only actionable shifts:**
  - `status === 'Published'`
  - `escrowStatus === 'Deposited'`
  - `positionsFilled < positionsTotal`
  - shift start time is in the future
  - `FullyBooked` shifts are NOT shown.
- **Reputation thresholds:**
  - Initial score = 100, clamped to `[0, 100]`.
  - +5 on confirmed completion, −20 on no-show, −10 on late-cancel (within 24h).
  - **Below 50 = restricted from applying. Exactly 50 = allowed.** (`canApplyToShifts(s) === s >= 50`)
- **Admin cannot suspend self.** Returns `CANNOT_SUSPEND_SELF`. UI hides the button.
- **Admin cannot suspend the last active admin.** Returns `CANNOT_SUSPEND_LAST_ADMIN`.
- **Employer manage shift page is owner-only.** `/employer/shifts/[id]` returns 404 when `shift.employerId !== currentUserId`.
- **Public shift detail** = `/shifts/[id]`. **Employer manage** = `/employer/shifts/[id]`. Do not merge.
- **Time conflict prevention** — workers cannot apply to a shift overlapping any approved shift within ±60 minutes.
- **Ratings are immutable** after `confirmCompletion`.
- **No real auth, payment, OTP, or ID verification.** Mock all of them.

---

## 5. Bug Fixes Already Made (DO NOT REGRESS)

These were caught during manual QA. Read the affected file's history before "simplifying" anything in this list.

1. **Zustand `getSnapshot` infinite loop.** `notificationStore.forUser(userId)` returned a fresh `.filter()` array on every call when used as a Zustand selector → infinite re-render. **Fix:** select the raw `notifications` array, then filter in the component with `useMemo`. **Rule:** never put non-primitive `.filter` / `.map` / `.reduce` results inside a Zustand selector body.
2. **Dark theme issue.** `globals.css` had a `prefers-color-scheme: dark` block that flipped the body to near-black on Windows dark mode. Removed it. Locked `color-scheme: light`. Fixed broken `--font-geist-sans` reference (we use Inter).
3. **Duplicate React key `TP.HCM`** in `WorkerProfile`'s `ChipList`. **Fix:** key is `${item}-${idx}`; `parseList()` deduplicates case-insensitively.
4. **Auth/nav stale state.** Old NavBar showed bell + logout based on `currentUserId` while items used `useCurrentRole()` — diverged when localStorage had a stale ID. **Fix:** `useCurrentUser()` selector resolves to a real `User`; both NavBar and MobileNav derive `isLoggedIn` from it. `AppHydrator` auto-logouts on missing/suspended user. `NotificationBell` closes on logout and route change. `/login` and `/register` redirect already-authenticated users.
5. **Employer shift ownership.** `/employer/shifts/[id]` originally let any logged-in employer view any shift's applicants. **Fix:** `notFound()` when `shift.employerId !== currentUserId`.
6. **Admin self-suspension lockout.** Only admin could suspend themselves. **Fix:** `adminStore.suspend()` returns `CANNOT_SUSPEND_SELF` / `CANNOT_SUSPEND_LAST_ADMIN`; UI hides the button for self and last-active admin; "Tài khoản hiện tại" badge labels the current admin row.
7. **Applicant review UI refactor.** Old card showed bio + skills + completed count as plain text inline. Refactored into compact `WorkerSummaryRow` (avatar, name, status, reputation, stat chips, top 3 skills, action buttons) + a shared `WorkerProfileModal` opened from the name or "Xem hồ sơ" button. Full bio / preferences / rating history now live in the modal.

8. **Admin reputation adjustment is now final-score based** *(2026-05-22)*. The admin Users tab previously exposed a delta input ranging −100 → +100 that was added to the worker's current score, which was confusing and easy to misread. New behavior:
   - Input is labelled **"Điểm uy tín mới"**, `type="number"`, `min={0}`, `max={100}`, `step={1}`. The current score is shown above the form for context.
   - `adminStore.adjustReputation(workerId, newScore, reason)` now takes the **absolute target score**, not a delta. It validates `0 ≤ newScore ≤ 100`, rounds to an integer, and writes the value directly via `userStore.updateUser`. Out-of-range or non-numeric input returns `INVALID_SCORE`. An empty/whitespace reason returns `REASON_REQUIRED`. Both errors are surfaced inline below the form.
   - The affected worker receives a mock notification (localStorage only, no real push):
     - title: `"Điểm uy tín đã được cập nhật"`
     - body: `"Điểm uy tín của bạn đã được điều chỉnh từ {old} thành {new}. Lý do: {reason}"`
     - kind: `ReputationAdjusted` (already in `NotificationKind`)
     - link: `/worker/profile`
   - The user list re-sorts immediately. `UsersPanel` already memoizes a sort by `reputationScore` desc keyed on `[users, filter]`; because `userStore.updateUser` returns a new `users` array reference, the memo recomputes and the row visibly moves on save.
   - The worker's `cancellationHistory` gets an entry tagged `[Admin set {old} → {new}] {reason}` so the change is traceable on the worker profile timeline.
   - **Files changed:** `src/stores/adminStore.ts` (signature + validation + notification body), `src/app/admin/dashboard/page.tsx` (input label/min/max, current-score readout, inline error surface, submit button gating), `src/i18n/vi.ts` (`admin.user.newScore`, `admin.user.currentScore`, `admin.user.scoreOutOfRange`, `admin.error.INVALID_SCORE`, `admin.error.REASON_REQUIRED`).

---

## 5b. Phase 2 In Progress — Safer Worker Cancellation Flow

**Status: NOT confirmed complete. A previous Kiro session began Phase 2 and stopped mid-implementation. Inspect the code before continuing.**

### 1. Goal of Phase 2

- Replace one-click worker application cancellation with a safer cancellation flow.
- Worker must enter a cancellation reason.
- If shift start time is **more than 3 hours** away, allow immediate cancellation.
- If shift start time is **within 3 hours**, do not cancel immediately; create a cancellation request that employer must approve / reject.
- Employer must receive notifications when worker cancels or requests cancellation.
- Worker must receive notifications when employer approves / rejects cancellation request.
- Existing late-cancel rule (within 24h) **remains** for the reputation penalty logic (−10 points). The 3h gate is a separate gate that decides whether the cancel is immediate vs. needs approval.
- New employer-approval threshold is **within 3 hours** of shift start.

### 2. Work already started in this Kiro session

Implementation was started but **may be incomplete**. The following pieces were planned and partially written:

- Added new `ApplicationStatus`: `CancellationRequested` — applied while waiting for employer approval; the position is **not** freed during this state.
- Extended `Application` with optional cancellation-request fields:
  - `cancellationRequestedAt`, `cancellationReasonNote`, `preCancellationStatus`
- Added pure time-gate helper in `src/domain/timeGates.ts`:
  - `requiresEmployerApprovalToCancel(now, shift)` — true when shift starts in <3h
  - constant `WORKER_CANCEL_APPROVAL_HOURS = 3`
- Modified `applicationStore.cancelByWorker(applicationId, reason, nowIso?)` so it branches:
  - `Pending` → immediate cancellation, no notification
  - `Approved` + **>3h** before shift → immediate cancellation, employer notified, late-cancel reputation rule (−10) applied iff within 24h
  - `Approved` + **≤3h** before shift → status flips to `CancellationRequested`, position **not** freed, no reputation change yet, employer notified to approve/reject
  - Return type changed to `Result<{ application, requiresApproval: boolean }, ...>` — callers must read `result.value.application` and/or `result.value.requiresApproval`.
- Added store actions:
  - `approveCancellationRequest(applicationId)` — finalises cancellation, frees position, applies reputation hit if late-cancel window applies at decision time, notifies worker
  - `rejectCancellationRequest(applicationId)` — restores `preCancellationStatus` (always `Approved` in practice), clears request fields, notifies worker
- Kept `CancellationRequested` in the `ACTIVE_STATUSES` set inside `applicationStore.ts` so the conflict detector and the `positionsFilled` invariant continue to count it as occupying a slot.
- Added new `NotificationKind` values: `CancellationRequested`, `CancellationApproved`, `CancellationRejected`. (Kept the existing `WorkerCancelled` and `LateCancel` kinds.)
- Updated callers:
  - `src/app/shifts/[id]/page.tsx` — destructured new return shape from `cancelByWorker`.
  - `src/app/worker/dashboard/page.tsx` — destructured new return shape.
  - `src/components/forms/CancelApplicationDialog.tsx` — added the "approval required" notice when within 3h, swapped the submit button label to a "request" variant.
- Planned but **not necessarily wired up yet**:
  - Employer manage shift page (`src/app/employer/shifts/[id]/page.tsx`) showing pending cancellation requests with approve / reject buttons.
  - i18n keys for: `cancel.confirm.approvalRequired`, `cancel.confirm.requestSubmit`, `application.status.CancellationRequested`, `notification.kind.CancellationRequested`, `notification.kind.CancellationApproved`, `notification.kind.CancellationRejected`, employer-side approve/reject button labels, error code `application.error.SHIFT_NOT_FOUND`. **These keys may be missing from `src/i18n/vi.ts`** — `t()` will fall back to the key string in that case (and `console.warn` in dev), so missing keys do not cause build errors but they do show raw keys in the UI.
  - Status badge tone for `CancellationRequested` in `app/employer/shifts/[id]/page.tsx` (`badgeToneForApp`) and `app/worker/dashboard/page.tsx` (`badgeToneFor`).
  - `ApplicationActions.tsx` rendering of the `CancellationRequested` state on `/shifts/[id]` (currently it falls through to the "not applied yet" Apply button — that's a real UI bug to fix).

### 3. Important warning

- **Phase 2 is NOT confirmed complete yet.**
- A new Kiro session **must** inspect the actual code before continuing.
- Do **not** assume all listed changes are finished.
- Run `npm run build` and `npm run test:run` first to see the current state.
- Search the codebase for these symbols to determine what is already written:
  - `CancellationRequested`
  - `requiresEmployerApprovalToCancel`
  - `approveCancellationRequest`
  - `rejectCancellationRequest`
  - `cancelByWorker`
  - `cancellationRequestedAt`
  - `preCancellationStatus`

### 4. Required next steps for new Kiro session

1. Read this HANDOFF.md first.
2. Inspect these files for partial / inconsistent state:
   - `src/types/index.ts`
   - `src/domain/timeGates.ts`
   - `src/stores/applicationStore.ts`
   - `src/stores/notificationStore.ts`
   - `src/components/forms/ApplicationActions.tsx`
   - `src/components/forms/CancelApplicationDialog.tsx`
   - `src/app/shifts/[id]/page.tsx`
   - `src/app/worker/dashboard/page.tsx`
   - `src/app/employer/shifts/[id]/page.tsx`
   - `src/i18n/vi.ts`
3. Run `npm run build` and `npm run test:run`.
4. Fix any TypeScript / build errors caused by the incomplete Phase 2 implementation. See "Known Current Build Errors" below if populated.
5. Complete Phase 2 before starting Phase 3.
6. Do **not** start the cancellation quota system (Phase 3) or the worker schedule feature (Phase 6) yet.

### 5. Exact continuation prompt for next Kiro account

Paste this verbatim:

> "Continue Phase 2 from the existing partial implementation. First inspect the codebase and determine which cancellation-flow changes are already present. Do not duplicate types/actions. Complete the safer worker cancellation flow: reason modal, >3h immediate cancellation, ≤3h employer approval request, employer approve/reject actions, notifications to both sides, i18n labels, and UI states. Run `npm run build` and `npm run test:run`. Update HANDOFF.md when complete."

### 6. Existing warnings still apply

- Do not rebuild from scratch.
- Do not add real payment.
- Do not add real OTP.
- Do not add real ID verification.
- Do not add production auth.
- Keep mock / localStorage only.
- Avoid unstable Zustand selectors that return new arrays / objects directly. Pattern that breaks: `useStore((s) => s.list.filter(...))`. Pattern that works: select `s.list`, then `useMemo`.

### 7. Known Current Build Errors

*(Populated below by the same session right after writing this HANDOFF section. If empty, the build was clean at the time of the handoff but Phase 2 may still have UI gaps — read sections 2 and 4 above.)*

<!-- BEGIN: build-errors -->
**Last checked: 2026-05-22, this Kiro session.**

- `npm run build` → exit 0, 13 routes, no TypeScript errors.
- `npm run test:run` → exit 0, 1 file / 1 test passed.

**TypeScript compiles cleanly, but Phase 2 still has UI/UX gaps that must be addressed before declaring Phase 2 done.** The build being green only means there are no type errors — it does NOT mean the flow works end-to-end. Specifically, in addition to anything you find on inspection:

1. `src/components/forms/ApplicationActions.tsx` does **not** render a branch for `applicationStatus === 'CancellationRequested'`. As-is, an application in that state will fall through every status check and the UI will render the "Apply" button, which is wrong. Add a branch that shows a `CancellationRequested` badge with the existing reason and **no** action button (the worker cannot cancel-the-cancel; the employer must decide).
2. `src/app/employer/shifts/[id]/page.tsx` `ApplicationActionButtons` has **no** branch for `application.status === 'CancellationRequested'`. The employer needs Approve / Reject buttons here that call `applicationStore.approveCancellationRequest(id)` / `rejectCancellationRequest(id)` plus a small UI showing the worker's `cancellationReasonNote`.
3. `badgeToneForApp` (in `app/employer/shifts/[id]/page.tsx`) and `badgeToneFor` (in `app/worker/dashboard/page.tsx`) do not map `'CancellationRequested'` to a tone — it falls back to `'neutral'`. Map it to `'warning'` so the row visually stands out.
4. The i18n dictionary in `src/i18n/vi.ts` is missing several keys referenced by the partial implementation. With the current code they will render as the raw key string and emit a `console.warn` in dev. Add at least:
   - `application.status.CancellationRequested` (e.g. "Yêu cầu huỷ")
   - `notification.kind.CancellationRequested`, `notification.kind.CancellationApproved`, `notification.kind.CancellationRejected`
   - `cancel.confirm.approvalRequired` (e.g. "Vì ca bắt đầu trong vòng 3 giờ, yêu cầu huỷ sẽ cần nhà tuyển dụng duyệt.")
   - `cancel.confirm.requestSubmit` (e.g. "Gửi yêu cầu huỷ")
   - `application.error.SHIFT_NOT_FOUND` (e.g. "Không tìm thấy ca làm.")
   - employer-side button labels: e.g. `btn.approveCancellation` / `btn.rejectCancellation`
5. `applicationStore.cancelByWorker` now returns `Result<{ application, requiresApproval }, ...>`. The previous shape was `Result<Application, ...>`. Verify every caller has been updated; the callers in `app/shifts/[id]/page.tsx` and `app/worker/dashboard/page.tsx` were updated, but greppping for `cancelByWorker` is recommended.
6. The Phase 2 changes have **no automated tests yet**. The single Vitest sanity test still passes only because all the new logic lives in the store and the UI; no Phase 2 path is exercised. Property tests for `requiresEmployerApprovalToCancel` and a unit test for the three `cancelByWorker` branches would be sensible but optional for the MVP.
<!-- END: build-errors -->

---

## 6. Latest QA Findings and Pending Improvements

These are the **next things to fix**. Implement them in the order listed in section 7. Do **not** combine them into one giant change — small, reviewable PRs.

### A. Admin reputation adjustment ✅ *Done 2026-05-22 — see Section 5, item 8.*

### B. Worker application cancellation needs a safer flow

**Current issue:** Worker can click "Hủy đơn ứng tuyển" too easily — one-click cancel.

**Desired behavior:**
- Cancel opens a confirmation modal.
- Cancellation reason is **required**.
- **If shift start time is more than 3 hours away:**
  - Allow immediate cancellation.
  - Save reason on the cancellation record.
  - Notify employer with worker name, shift title, reason.
- **If shift start time is within 3 hours:**
  - Worker **cannot** cancel immediately.
  - Create a `CancellationRequest` that the employer must approve or reject.
  - Notify employer.
- **Employer manage shift page** must show cancellation requests and allow:
  - **Approve cancellation** → application becomes `CancelledByWorker`, notify worker.
  - **Reject cancellation** → application remains in its prior state (Approved / Pending), notify worker.
- Late-cancel rule remains: **under 24h** of shift start = reputation penalty (−10).
- New employer-approval threshold is **within 3 hours** of shift start (separate gate from the reputation penalty).
- Every state change must notify the relevant other party.

### C. Cancellation quota system

**Default max cancellations:**
- 3 per rolling 7-day window
- 10 per rolling 30-day window

**High-reputation bonus:**
- `reputationScore >= 80` → +1 weekly, +2 monthly
- `reputationScore >= 95` → +2 weekly, +4 monthly

**Implementation notes:**
- Use the existing `Worker.cancellationHistory` array if possible — count entries within the 7-day / 30-day window.
- Keep it mock/localStorage, no backend.
- If quota exceeded, **block cancellation** and show a clear message ("Bạn đã vượt hạn mức huỷ trong tuần này…").

### D. Worker personal schedule feature

**New feature:** worker schedule page, likely `/worker/schedule`.

**Worker can add busy blocks** like class time, work shifts at other places, personal commitments.

**`ScheduleBlock` shape:**
```ts
interface ScheduleBlock {
  id: string;
  userId: string;        // owning worker
  title: string;
  date?: string;         // YYYY-MM-DD for one-off blocks
  dayOfWeek?: 0|1|2|3|4|5|6;  // for recurring weekly blocks (Sun=0)
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  note?: string;
}
```

**UI:** keep it simple — list + form. **No calendar library.**

**Navigation:** add "Lịch cá nhân" link to worker nav (`NavBar` + `MobileNav` worker arrays).

**Application gating:** when applying to a shift, block if it overlaps:
- any busy schedule block, OR
- any existing approved shift

Show a clear conflict message identifying the conflicting block / shift.

**Constraints:** no Google Calendar integration, no server sync, no recurrence beyond simple `dayOfWeek`.

### E. Employer profile modal from shift detail

This was requested in an earlier QA pass and remains pending.

**On `/shifts/[id]`:** the employer name should be a clickable button that opens `EmployerProfileModal`.

**Modal contents:**
- Company / employer name
- Email (if available)
- Business type
- Description / bio (with empty state if missing)
- Number of posted shifts
- Number of completed shifts (computable from `shiftStore.shifts` filtered by `employerId` and `status === 'Completed'`)
- Verification / status badge (`verifiedBusiness` flag)

**Behavior:** must work on desktop and mobile, close via X / ESC / backdrop (the existing `Modal` primitive handles all three).

---

## 7. Recommended Next Implementation Order

Do **NOT** implement everything in one giant change. One PR per item, build + manual test between each:

1. ~~**Fix admin reputation input** to a 0–100 final score + worker notification with old/new/reason + immediate sorting.~~ ✅ *Done 2026-05-22.*
2. **Fix cancellation modal** with required reason + employer notification.
3. **Add within-3-hours cancellation approval flow** (CancellationRequest entity + employer approve/reject UI + notifications both ways).
4. **Add cancellation quota system** (compute from `cancellationHistory`, gate with clear message).
5. **Add `EmployerProfileModal`** from `/shifts/[id]`.
6. **Add worker schedule page** (`/worker/schedule`) + extend application conflict check to include busy blocks.
7. **Run full manual QA** for worker / employer / admin flows.

After each step: `npx next build` must pass.

---

## 8. Recommended Opening Prompt for the Next Kiro Session

Paste this into the next session:

> "Read HANDOFF.md, .kiro/specs/cale-shiftnow/tasks.md, requirements.md, design.md, and the current codebase. Continue from the existing CaLẻ / ShiftNow student MVP. Do not rebuild from scratch. First summarize your understanding of the current project state, then run `npm run build` and `npm run test:run`. Do not modify files yet unless there is a build error."

---

## 9. Demo Accounts

All seed accounts use `mock-hash:demo` so any password works (the auth store accepts `"demo"` as a fallback).

| Role | Email | Password |
|---|---|---|
| Worker (verified, score 95) | `an.nguyen@gmail.com` | `demo` |
| Worker (max score 100) | `ha.tran@gmail.com` | `demo` |
| Worker (low rep, score 35 — restricted) | `em.dang@gmail.com` | `demo` |
| Employer (verified) | `lien@quanphoha.vn` | `demo` |
| Employer (verified) | `tuan@cafecong.vn` | `demo` |
| Employer (individual) | `minh@sukienvinhquang.vn` | `demo` |
| Admin | `admin@cale.vn` | `demo` |

The `/login` page also displays these as a hint box.

---

## 10. Commands

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

---

## 11. Strong Warnings

Read these before making changes. Each rule has bitten the project at least once.

- **Do not rebuild from scratch.** The MVP is intentional in shape and depth. Modify in place.
- **Do not add real payment** integration. The escrow state machine in `src/domain/escrow.ts` is the contract; replacing it requires a backend redesign, not a UI tweak.
- **Do not add real OTP** or real ID/CCCD verification. Verification UI is a flag toggle.
- **Do not add production authentication** (JWT/session/cookie/OAuth). The mock auth store is intentional.
- **Do not bypass `RoleGuard`.** Every role-scoped page must be wrapped. The guard is presentational only (no real backend), but it's the single place where role redirection is enforced.
- **Avoid unstable Zustand selectors** that return new arrays/objects directly. Pattern that breaks: `useStore((s) => s.list.filter(...))`. Pattern that works: select `s.list` (stable), then `useMemo(() => list.filter(...), [list, ...])` in the component.
- **Use `useMemo`** for derived filtered/sorted arrays in pages. Don't recompute on every render.
- **Keep it student MVP.** If a 5-line `useMemo` does the job, don't reach for a library. If a 50-record JSON file is enough, don't add a database. If two `useState`s and a callback work, don't add a state machine library.
- **Do not regress the bug fixes in section 5.** Especially: don't put non-primitive computed selectors back into Zustand, don't remove the dark-mode lockout, don't drop the admin lockout guards, don't re-introduce the dual-source-of-truth `currentUserId` + `useCurrentRole()` pattern in NavBar.
- **Read `node_modules/next/dist/docs/`** before writing Next.js code (per workspace AGENTS.md). Next 16 has breaking changes from older versions.
- **Tailwind v4 is configured in CSS**, not `tailwind.config.ts`. The conventions live in the header comment of `src/app/globals.css`.

That's it. Good luck.
