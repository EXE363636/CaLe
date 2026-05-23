# CaLẻ / ShiftNow — Project Handoff

A handoff document for the next developer (or new Kiro session) picking up this MVP. Read top to bottom before touching code. **Do not rebuild from scratch.**

---

## 1. Current Project Status

- **CaLẻ / ShiftNow** is a student MVP — a responsive web app that connects employers in Vietnam with short-term workers (students, freelancers).
- Built with **Next.js 16, TypeScript (strict), Tailwind v4, Zustand 5, localStorage / mock data**.
- **Tasks 1–16 are complete** (tracked in `.kiro/specs/cale-shiftnow/tasks.md`). Tasks 17–19 are checkpoints / optional polish, intentionally skipped.
- **Build passes:** `npx next build` → exit 0, 15 routes.
- **Mock auth only.** Passwords stored as `mock-hash:<value>`. Any password works for seed accounts (the auth store accepts `"demo"` as a fallback).
- **Simulated escrow / payment only.** No real money, no payment gateway, no OTP, no real ID verification.

---

## 2. Implemented Routes (15)

```
○  /                          (landing)
○  /login
○  /register
○  /shifts                    (worker discovery, shows only actionable shifts)
ƒ  /shifts/[id]               (public detail; employer name should be clickable — see pending E)
○  /worker/dashboard
○  /worker/profile
○  /worker/schedule
○  /employer/dashboard
○  /employer/schedule
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

9. **Safer worker cancellation flow with employer approval window** *(2026-05-22, Phase 2)*. Replaces one-click worker cancel. Three branches now run inside `applicationStore.cancelByWorker(applicationId, reason, nowIso?)`:
   - `Pending` → cancels immediately, no notification, no penalty.
   - `Approved` + **>3h** before shift → cancels immediately, position freed, employer notified (`WorkerCancelled` or `LateCancel` if also within 24h), late-cancel reputation rule (−10) applied iff within 24h.
   - `Approved` + **≤3h** before shift → status flips to new `'CancellationRequested'`, position **NOT** freed, no reputation hit yet, employer notified (`CancellationRequested`).
   New employer-only actions on the manage page: `approveCancellationRequest` finalises the cancel, frees the position, and applies the late-cancel reputation hit if the *decision time* falls within 24h. `rejectCancellationRequest` restores the application to its pre-request `'Approved'` status and clears the request fields. Both notify the worker (`CancellationApproved` / `CancellationRejected`).
   Cancellation reason is required everywhere — empty / whitespace returns `REASON_REQUIRED`. The reason is saved on `Application.cancellationReasonNote` and embedded in every notification body.
   `cancelByWorker` return shape changed from `Result<Application, ...>` to `Result<{ application: Application; requiresApproval: boolean }, ...>`. Both callers (`app/shifts/[id]/page.tsx`, `app/worker/dashboard/page.tsx`) were updated; they only inspect `.ok` / `.error`, so the change is non-breaking for them.
   `'CancellationRequested'` is in the `ACTIVE_STATUSES` set so the conflict detector and the `positionsFilled` invariant continue to count it as occupying a slot while the request is open.
   No real notifications, no real auth, no real payment, no real OTP, no real ID verification — everything is localStorage / mock as before.
   - **Files changed:** `src/types/index.ts`, `src/domain/timeGates.ts`, `src/stores/applicationStore.ts`, `src/components/forms/CancelApplicationDialog.tsx`, `src/components/forms/ApplicationActions.tsx`, `src/app/shifts/[id]/page.tsx`, `src/app/worker/dashboard/page.tsx`, `src/app/employer/shifts/[id]/page.tsx`, `src/i18n/vi.ts`.

10. **Employer "Hủy ca" button now actually cancels and gives feedback** *(2026-05-22)*. The confirm step on `/employer/shifts/[id]` previously called `cancelShift(shift.id)` and unconditionally collapsed the confirm row, so when the store returned `{ ok: false, error: 'TOO_LATE' }` (the most common case — shift starts in <24h is blocked by the `canCancelShift` 24-hour gate) the UI silently did nothing and the employer thought the button was broken. Fix:
   - `handleCancelShift` now reads the `Result` from `shiftStore.cancel` and surfaces `shift.error.TOO_LATE` / `shift.error.NOT_FOUND` inline (red `role="alert"`) when the store rejects.
   - On success, the page pushes a `ShiftCancelled` notification to every affected worker (applications in `Pending | Approved | CancellationRequested | CheckedIn | CheckedOut`), then calls `router.push('/employer/dashboard')` so the employer sees the cancellation reflected in their dashboard list immediately. Workers in terminal states (`Confirmed | NoShow | Rejected | CancelledByWorker`) are skipped on purpose.
   - The cancel button now exposes a `loading` state during the call, and the cancel UI block is hidden once the shift's status is `Cancelled | Completed | InProgress | AwaitingConfirmation | Expired`. A small "ca này đã bị huỷ" banner replaces the button when `status === 'Cancelled'` so the page is not blank where the button used to be.
   - Ownership check (`shift.employerId !== currentUserId` → `notFound()`) is unchanged. The simulated escrow refund continues to flow through the existing `transitionEscrow(s.escrowStatus, 'CancelShift')` call inside `shiftStore.cancel` — no real payment refund is triggered.
   - **Files changed:** `src/app/employer/shifts/[id]/page.tsx` (real Result handling, `useNotificationStore.push` for affected workers, `useRouter().push('/employer/dashboard')` on success, inline error surface, cancelled banner), `src/i18n/vi.ts` (new key `shift.cancelled.banner`; reused existing `shift.error.TOO_LATE` / `shift.error.NOT_FOUND`).

11. **Worker cancellation quota with reputation-based bonus** *(2026-05-22, Phase 3)*. Workers can no longer cancel an unlimited number of applications. A rolling-window quota now gates every quota-countable cancellation branch.
    - Default limits: **3 cancellations / 7-day window**, **10 cancellations / 30-day window**.
    - Reputation tier bonuses (replacement, NOT cumulative on top of each other):
      - reputation 50–79 → 3/week, 10/month
      - reputation 80–94 → 4/week, 12/month (+1 weekly, +2 monthly)
      - reputation 95–100 → 5/week, 14/month (+2 weekly, +4 monthly)
    - Quota-countable events (each writes a `CancellationRecord` to `Worker.cancellationHistory`):
      - Pending application cancelled immediately.
      - Approved application cancelled immediately (`>3h` before start, with or without late-cancel reputation hit).
      - Cancellation request approved by the employer.
    - NOT counted:
      - Pending cancellation requests (`CancellationRequested` state) — record is only written when the employer approves.
      - Rejected cancellation requests — application reverts to `Approved`, no record.
      - Admin reputation adjustments — those write a synthetic record with `shiftId: ''` which `isQuotaCountable` filters out.
    - Block behavior: when both the weekly and monthly windows have remaining capacity the quota gate passes; otherwise `applicationStore.cancelByWorker` returns `{ ok: false, error: 'QUOTA_EXCEEDED' }` and **no state change is made and no notification is fired**. The dialog renders a clear red banner ("Đã hết hạn mức huỷ" + "Bạn đã vượt hạn mức huỷ trong tuần hoặc trong tháng này. Vui lòng thử lại sau.") and disables the submit button. Closing the dialog is the only path forward.
    - The dialog also shows the current usage in informational form whenever quota is supplied, e.g. "Bạn còn 2/3 lượt huỷ trong 7 ngày gần đây." and the same line for 30 days. Both lines use `t('cancel.quota.weekly')` / `t('cancel.quota.monthly')` with `{remaining}` and `{limit}` placeholders.
    - Quota math is a pure module (`src/domain/cancellationQuota.ts`) so it's framework-free and easy to property-test later. The store exposes `getCancellationQuota(workerId, nowIso?)` for diagnostics, but the UI computes its own snapshot via `useMemo` from `worker.cancellationHistory` + `worker.reputationScore` to follow the existing rule of avoiding unstable Zustand selectors that return new arrays.
    - Mock / localStorage only — the existing `Worker.cancellationHistory` array is the source of truth. No new types or storage keys.
    - **Files changed:** `src/domain/cancellationQuota.ts` (new), `src/stores/applicationStore.ts` (quota gate in `cancelByWorker`, always-write record on immediate + approved-request branches, new `getCancellationQuota` selector, new `QUOTA_EXCEEDED` error code), `src/components/forms/CancelApplicationDialog.tsx` (new optional `quota` prop, indicator block, blocker banner, submit gating), `src/app/worker/dashboard/page.tsx` (memoize quota usage, pass to dialog), `src/app/shifts/[id]/page.tsx` (memoize quota usage, pass to dialog, map `QUOTA_EXCEEDED` to a localized error), `src/i18n/vi.ts` (`cancel.confirm.quotaBlocked`, `cancel.quota.title`, `cancel.quota.blockedTitle`, `cancel.quota.blockedHint`, `cancel.quota.weekly`, `cancel.quota.monthly`).

12. **Clickable user/employer profile preview modals** *(2026-05-22, Phase 4)*. Both the worker-facing `/shifts/[id]` page and the admin Users tab now expose a one-click profile preview, so identity and trust signals are visible without leaving the current screen.
    - **Employer modal on `/shifts/[id]`** (existing component widened): the employer name was already a button that opens `EmployerProfileModal`. The modal now shows **four** counts in a single grid — posted, active, completed, cancelled — instead of the previous posted/completed pair. "Active" includes `Published | FullyBooked | InProgress | AwaitingConfirmation`; "Cancelled" is `status === 'Cancelled'` only; "Completed" is `status === 'Completed'`. All counts are derived in a single `useMemo` over `useShiftStore.shifts` (stable selector, no fresh-array selector hazard).
    - **Admin user-profile modal on `/admin/dashboard` Users tab** (new): every user name in the row is now a clickable orange button. Clicking opens `AdminUserProfileModal` (shared instance hoisted into `UsersPanel` — one mount per panel, not per row) which adapts to role:
      - **Worker**: identity (avatar, name, email, phone), reputation badge, suspension badge, lifetime stat strip (completed shifts, average rating, no-show count, lifetime cancellations), the **rolling 7-/30-day cancellation quota** with `used / limit / remaining` for both windows so the admin can see the same Phase 3 numbers the worker sees, verification badges, bio, skills, preferred job types, preferred locations, and the most recent 5 ratings with star + feedback + date.
      - **Employer**: identity (logo, company name, business type, email, phone), `verifiedBusiness` badge, suspension badge, four-count stat grid (posted / active / completed / cancelled), a red disputed-payment callout when at least one shift has `escrowStatus === 'Disputed'`, and the description.
      - **Admin**: identity, role badge, suspension badge, "Tài khoản hiện tại" badge when the modal subject is the logged-in admin, and a short note that admin actions are mock/localStorage-only.
    - Modal subject re-resolves from the live `users` array on every render via `useMemo([users, profileUserId])`, so an admin can suspend / reactivate / adjust reputation from the row and watch the open modal update without closing.
    - Lifetime cancellation count for workers excludes admin-adjust ledger entries (those use `shiftId: ''`) — same filter as the Phase 3 quota math.
    - Modals close via X / ESC / backdrop (the existing `Modal` primitive handles all three). Mobile-friendly because the layout is a single vertical column inside the existing responsive `Modal`.
    - Reuses existing primitives: `Modal`, `Card`, `Badge`, `ReputationBadge`, `VerificationBadge`, `StarRating`, `UserAvatar`. No new dependencies. No real auth / payment / OTP / ID verification.
    - Avoids unstable Zustand selectors — `EmployerProfileModal` and the employer branch of `AdminUserProfileModal` both pull `useShiftStore((s) => s.shifts)` (stable ref) and derive counts in a `useMemo`. The worker branch derives the quota the same way over `worker.cancellationHistory` + `worker.reputationScore`.
    - **Files changed:** `src/components/user/AdminUserProfileModal.tsx` (new), `src/components/user/EmployerProfileModal.tsx` (added `active` and `cancelled` to the stat grid), `src/components/user/index.ts` (export new modal), `src/app/admin/dashboard/page.tsx` (clickable user-name button, hoisted `profileUserId` state, `AdminUserProfileModal` mount in `UsersPanel`, `onOpenProfile` prop wired to `UserRow`), `src/i18n/vi.ts` (new keys: `employer.profile.activeShifts`, `employer.profile.cancelledShifts`, `admin.profile.title`, `admin.profile.quota.title`, `admin.profile.quota.weekly`, `admin.profile.quota.monthly`, `admin.profile.employer.disputedPayments`, `admin.profile.admin.note`, `admin.profile.admin.description`).

13. **Worker personal schedule and conflict blocking** *(2026-05-22, Phase 5)*. Workers now manage one-time personal busy blocks at `/worker/schedule`, and the apply flow refuses any shift that overlaps with either an approved shift (existing Phase 1 rule) or a personal busy block on the same date (new).
    - **New type** `ScheduleBlock` in `src/types/index.ts`: `{ id, userId, title, date (YYYY-MM-DD), startTime (HH:mm), endTime (HH:mm), note?, createdAt, updatedAt }`. One-time only — recurring weekly schedules are explicitly out of scope for the MVP.
    - **New Zustand store** `src/stores/scheduleStore.ts` (`useScheduleStore`): `forUser(userId)`, `getById(id)`, `add(input)`, `update(id, userId, patch)`, `remove(id, userId)`, `hydrate(blocks)`. Owner mismatch returns `OWNER_MISMATCH`; missing fields return `TITLE_REQUIRED | DATE_REQUIRED | TIME_REQUIRED`; `endTime <= startTime` returns `TIME_RANGE_INVALID`. Persistence uses the new `STORAGE_KEYS.scheduleBlocks` key. Schema version bumped from 1 → 2 so existing browsers reseed cleanly.
    - **AppHydrator** updated to seed the schedule slice from `loadAll().scheduleBlocks`.
    - **New page** `src/app/worker/schedule/page.tsx` wrapped in `<RoleGuard role="worker">`. Lists the worker's blocks sorted by `(date, startTime)` ascending. "Thêm lịch bận" button opens a modal form with title / date / start time / end time / optional note. Each row has Edit and Delete (Delete uses an inline confirm). An orange info banner reminds the worker that **approved shifts also count as busy time when applying** so they don't try to add their own shifts here. Empty state is rendered when no blocks exist.
    - **Navigation:** "Lịch cá nhân" added to both `NavBar` and `MobileNav` worker arrays only — employers, admins, and guests do not see the link.
    - **New pure helper** `src/domain/scheduleConflict.ts` exposing `hasScheduleConflict(target, blocks)` and `findScheduleConflicts(target, blocks)`. Same-date overlap rule, **no buffer** (the buffer only applies to inter-shift conflicts in `domain/conflict.ts`). Malformed inputs yield `false` so the UI never reports a false positive.
    - **Apply flow:** `applicationStore.apply` now runs the schedule-conflict gate immediately after the existing approved-shift conflict gate, returning the new `ApplyError = 'SCHEDULE_CONFLICT'`. No state change, no employer notification when blocked. The error is mapped to `apply.error.SCHEDULE_CONFLICT` ("Ca này trùng với lịch cá nhân của bạn.") in the existing `t('apply.error.${result.error}')` site on `/shifts/[id]`. All earlier gates remain — phone verification → reputation ≥ 50 → already-applied → fully-booked → conflict with approved shifts → schedule conflict — in that order.
    - **Position-counter invariant** untouched: `CancellationRequested` is still in `ACTIVE_STATUSES` and the schedule check is purely informational on the apply path.
    - **Limitations to advertise:** one-time blocks only (no recurring weekly), no calendar widget, no Google Calendar, no server sync. localStorage / mock only. No real auth / payment / OTP / ID verification.
    - **Files changed:** `src/types/index.ts` (new `ScheduleBlock` type), `src/data/persistence.ts` (new `STORAGE_KEYS.scheduleBlocks`, `Snapshot.scheduleBlocks`, `seedSnapshot` defaults to `[]`, schema version bumped to 2), `src/stores/scheduleStore.ts` (new), `src/stores/index.ts` (re-export), `src/components/layout/AppHydrator.tsx` (hydrate the new slice), `src/components/layout/NavBar.tsx` and `src/components/layout/MobileNav.tsx` (worker-only "Lịch cá nhân" link), `src/domain/scheduleConflict.ts` (new), `src/stores/applicationStore.ts` (new `SCHEDULE_CONFLICT` apply error + gate), `src/app/worker/schedule/page.tsx` (new page), `src/i18n/vi.ts` (`nav.schedule`, `apply.error.SCHEDULE_CONFLICT`, the `schedule.*` block of strings + form-error keys).

14. **Worker schedule promoted to a weekly timetable view** *(2026-05-22, Phase 5B)*. The `/worker/schedule` page kept its Phase 5 store + apply-time conflict gate but the UI was rebuilt as a Monday→Sunday timetable so workers can manage busy time the way a school timetable looks.
    - **Timetable grid:** seven columns (Thứ Hai → Chủ Nhật) with the date under each weekday. Today's column is highlighted with the orange-50 / orange-700 accent already used elsewhere in the app. Time slots run as rows with a sticky leftmost column.
    - **Configurable slots** (UI-local state, NOT persisted): the page exposes `Giờ bắt đầu ngày` / `Giờ kết thúc ngày` / `Độ dài mỗi slot (phút)` inputs. Defaults: `07:00`, `21:00`, 120 minutes — yielding the same 7 slots described in the task spec (07–09, 09–11, 11–13, 13–15, 15–17, 17–19, 19–21). The new pure module `src/domain/week.ts` validates the config (`INVALID_TIME_RANGE`, `INVALID_SLOT_DURATION`, `TOO_MANY_SLOTS`) and generates the rows; an invalid config surfaces a localized error and keeps the previous render rather than blanking out.
    - **Cell click → create:** clicking an empty cell opens the existing add/edit dialog with the date and the slot's start / end pre-filled. Clicking an existing block in a cell opens edit mode for that block. Both flows use the same `ScheduleBlockDialog` so validation is identical.
    - **Week navigation:** `← Tuần trước` / `Tuần này` / `Tuần sau →` buttons + a date-range readout `DD/MM/YYYY – DD/MM/YYYY`. Week math is ISO Monday-first (Sunday belongs to the previous week's last day) and lives in `domain/week.ts` (`startOfWeek`, `weekDates`, `shiftWeek`, `todayIso`).
    - **Block placement:** blocks for the visible week are indexed once in a `useMemo`-derived `Map<date, ScheduleBlock[]>`, so each cell does an `O(1)` lookup + an `O(n)` overlap filter against its own slot using `rangesOverlap` from `domain/week.ts`. Blocks longer than one slot render in every slot they cover.
    - **Mobile:** the table is wrapped in `overflow-x-auto` with a `min-w-[720px]` so it horizontally scrolls below `md`. The leftmost time column is `sticky` so the labels stay visible while scrolling.
    - **List view preserved** as a "Tất cả lịch bận" section below the timetable so workers can still scan/edit/delete their full set without finding each block on the grid.
    - **No store, type, or persistence changes.** The Phase 5 apply gate continues to fire as-is; quota, conflict, verification, reputation gates all unchanged.
    - **Limitations stated again:** one-time blocks only, no recurring weekly schedule, no Google Calendar, no server sync. Slot configuration is UI-local — closing the page resets it to defaults. localStorage / mock only.
    - **Files changed:** `src/domain/week.ts` (new pure module — `SlotConfig`, `validateSlotConfig`, `generateSlots`, `weekDates`, `startOfWeek`, `shiftWeek`, `todayIso`, `timeToMinutes`, `rangesOverlap`), `src/app/worker/schedule/page.tsx` (rewritten — week nav, slot config form, timetable grid component, cell-click prefill, click-to-edit on cells, list view preserved), `src/i18n/vi.ts` (added `schedule.week.{prev,current,next}`, `schedule.slotCfg.*` including the three error codes, `schedule.timetable.{timeColumn,addInSlot}`, `schedule.list.title`, `schedule.empty.weekHint`).

15. **Final business-logic and trust polish** *(2026-05-22, Phase 6)*. Final pass tackling the long tail of product-review feedback: individual / freelance employer accounts, employer trust tiers driving the deposit ratio, a mock-payment confirm card, the positionsTotal input UX bug, worker-side reputation recovery copy, worker → employer feedback (with fixed-vocabulary tags), and required rejection reasons.
    - **Employer account types.** New `EmployerType = 'individual' | 'business'` union added to `src/types/index.ts`. The register form on `/register` now exposes a two-button selector (`Cá nhân / Freelance` vs `Doanh nghiệp`) with a short hint under each option. Defaults to `individual` so freelance employers don't have to fight the form. The `Employer` type carries the value as an optional field (`employerType?`) so existing seed records remain valid; the modal display falls back to `'business'` when missing. `EmployerProfileModal` now renders the type as a chip next to the verification badge.
    - **Employer trust tier + deposit ratio.** New pure module `src/domain/employerTrust.ts` exposes `classifyEmployerTrust({ verifiedBusiness, completedShiftCount })`, `trustForEmployer(employer, completedCount)`, `depositForTrust(...)` and the constant `DEPOSIT_RATIO = { low: 1.0, medium: 0.7, high: 0.5 }`. Tiering rules are simple and transparent:
      - **Low** — default. Pays 100% upfront.
      - **Medium** — `verifiedBusiness` OR ≥3 completed shifts. Pays 70%.
      - **High** — `verifiedBusiness` AND ≥5 completed shifts. Pays 50%.
    - **Deposit calculation.** `shiftStore.create` now derives the employer's tier from the live shift list (no denormalised counter) and calls `depositForTrust(...)` instead of `calculateDeposit(...)`. The deposit-confirm card on `/employer/shifts/new` shows a transparent breakdown: full wage → tier label → ratio percentage → final deposit. The simulate-deposit button is now `Xác nhận đã thanh toán` (mock payment), then the existing escrow flow takes over (`PendingDeposit → Deposited`, shift `Draft → Published`).
    - **`positionsTotal` input UX fix.** The previous numeric input snapped to `0` whenever the field was cleared, then refused to be edited. `ShiftForm` now keeps the input as a controlled string (`positionsText`) and only commits to numeric state on change, so the field can be temporarily empty while the user types. On submit the validator emits localized errors: `error.positions.required` (empty), `error.positions.invalid` (non-positive / non-integer), `error.positions.belowFilled` (edit mode, value < already-filled). The `shiftStore.edit` mutator gained a `POSITIONS_BELOW_FILLED` error code so the rule is enforced server-side too — no orphaning approved workers.
    - **Worker reputation recovery copy.** New "Cách cải thiện điểm uy tín" Card on both `/worker/dashboard` and `/worker/profile` explains the +5 / −10 / −20 rules in two short Vietnamese lines. No new gamification, no new store action — pure surfacing of existing behavior.
    - **Worker → employer feedback.** New `EmployerFeedback` type, new `useEmployerFeedbackStore` (slice persisted under `STORAGE_KEYS.employerFeedback`, schema version bumped 2 → 3 so existing browsers reseed cleanly). Worker dashboard surfaces a "Đánh giá nhà tuyển dụng" section listing every `Confirmed` application without yet-submitted feedback; a `Gửi đánh giá` button reveals the new `EmployerFeedbackForm` inline. The form takes 1–5 stars + optional text + a multi-select of fixed tags: `Trả lương đúng cam kết`, `Môi trường tốt`, `Giao tiếp rõ ràng`, `Công việc đúng mô tả`. Submission is one-shot per application (`ALREADY_SUBMITTED` guard) and immutable. Employer receives an `EmployerFeedbackReceived` notification linking to their profile. Both `EmployerProfileModal` (worker-facing) and the employer branch of `AdminUserProfileModal` (admin-facing) render the latest 5 entries via the new `EmployerFeedbackList` component, with an aggregate average across all entries.
    - **Required rejection reasons.** `applicationStore.reject` signature is now `reject(applicationId, reason)` and returns `REASON_REQUIRED` on empty/whitespace input. The reason is stored on `Application.rejectionReason` and embedded in the worker's `ApplicationRejected` notification body. The employer manage shift page now opens the new `RejectApplicationDialog` (modal with required reason textarea) instead of rejecting on click. The worker dashboard renders a "Đơn bị từ chối gần đây" section showing the most recent 5 rejected applications with the employer's stated reason in a red callout — visible until a different decision is made about the worker's UI cleanup.
    - **Schema bump:** `SCHEMA_VERSION = 3`. Existing browsers will reseed automatically on next load (the `EmployerFeedback` slice starts empty). Pre-Phase-6 employer records without `employerType` are read fine; the UI displays the `'business'` default until the user re-saves.
    - **No real auth / payment / OTP / ID verification / business verification / server sync.** All verifications remain mock toggles; the deposit confirm is purely UI; all stores still use localStorage. No new dependencies.
    - **Files changed:** `src/types/index.ts` (added `EmployerType`, `EmployerTrustLevel`, `EmployerFeedbackTag`, `EmployerFeedback`, `Application.rejectionReason`, `Employer.employerType`, `EmployerFeedbackReceived` notification kind), `src/data/persistence.ts` (new `STORAGE_KEYS.employerFeedback`, `Snapshot.employerFeedback`, `seedSnapshot` defaults to `[]`, schema bumped to 3), `src/domain/employerTrust.ts` (new), `src/stores/shiftStore.ts` (trust-aware deposit calc + `POSITIONS_BELOW_FILLED` edit guard), `src/stores/applicationStore.ts` (`reject` requires reason, persists it, embeds in notification body), `src/stores/employerFeedbackStore.ts` (new), `src/stores/authStore.ts` (accept `employerType` in `RegisterInput`), `src/stores/index.ts` (re-exports), `src/components/layout/AppHydrator.tsx` (hydrate the new slice), `src/components/forms/ShiftForm.tsx` (positionsText controlled string, new `minPositions` prop, three new validation errors), `src/components/forms/RejectApplicationDialog.tsx` (new), `src/components/forms/EmployerFeedbackForm.tsx` (new), `src/components/forms/index.ts` (re-exports), `src/components/user/EmployerProfileModal.tsx` (account-type chip + feedback list), `src/components/user/AdminUserProfileModal.tsx` (feedback list in employer branch), `src/components/user/EmployerFeedbackList.tsx` (new), `src/components/user/index.ts` (re-export), `src/app/register/page.tsx` (employer-type selector), `src/app/employer/shifts/new/page.tsx` (trust explainer + transparent deposit breakdown card with `Xác nhận đã thanh toán`), `src/app/employer/shifts/[id]/page.tsx` (rejection-reason dialog wired into `handleReject` flow), `src/app/worker/dashboard/page.tsx` (recently-rejected section with reason readout, feedback-pending section with inline form, reputation-rules card), `src/app/worker/profile/page.tsx` (reputation-rules card), `src/i18n/vi.ts` (full new key blocks: `employerType.*`, `deposit.*`, `reject.*`, `worker.dashboard.recentlyRejected*`, `worker.dashboard.feedbackPending*`, `worker.dashboard.reputationHint.*`, `employerFeedback.*`, plus `error.positions.required` / `error.positions.belowFilled` and `notification.kind.EmployerFeedbackReceived`).

16. **Automated shift lifecycle and employer schedule view** *(2026-05-22, Phase 7)*. Reduces reliance on admin manual override by rolling shift statuses forward automatically based on time + escrow + applications, and adds a Mon→Sun timetable view of the employer's posted shifts.
    - **New pure module** `src/domain/shiftLifecycle.ts` exposing `suggestShiftStatus(shift, applications, nowIso)` and the bulk `syncLifecycle(shifts, applications, nowIso)`. Decisions are conservative:
      - `Draft` stays `Draft` until the explicit `simulateDeposit` action.
      - `Cancelled / Completed / Expired` are terminal — never auto-changed. Admin override (`shiftStore.setStatus`) is the only escape hatch.
      - `Published / FullyBooked` flip between each other based on `positionsFilled`, advance to `InProgress` when the start time passes and there's an active worker, advance to `AwaitingConfirmation` when the end time passes and a check-in happened, or to `Expired` when the end time passes and nobody showed up.
      - `InProgress` rolls forward to `AwaitingConfirmation` once the end time has passed AND every active worker has either checked out or been marked NoShow / cancelled (the `allDoneOrAbsent` guard avoids yanking the shift out from under a worker mid-shift).
      - `AwaitingConfirmation` never auto-advances — employer / admin decides.
      - Never auto-marks no-show, never auto-confirms completion, never moves escrow status. Those side effects stay behind the explicit human-driven actions.
    - **New store action** `shiftStore.syncLifecycle(nowIso?)` plus a new `lastLifecycleSyncAt` field on the store state. Returns `{ changedIds, syncedAt }` so callers can short-circuit re-renders. Always stamps `lastLifecycleSyncAt` (so the admin UI shows "đồng bộ lúc …" even when nothing moved); persists only when the shift list actually changed. Uses lazy `useApplicationStore.getState()` inside the method body to keep the cyclic import safe.
    - **New hook** `src/lib/useLifecycleSync.ts` — fires `useShiftStore.getState().syncLifecycle()` exactly once on mount via empty-deps `useEffect`. Idempotent (the store no-ops when nothing moved), so SPA navigation re-mounts are safe. Wired into the five entry pages: `/shifts`, `/worker/dashboard`, `/employer/dashboard`, `/employer/shifts/[id]`, `/admin/dashboard`. The boot sync also runs once inside `AppHydrator` after stores hydrate so freshly-loaded data reflects any time-driven moves that happened while the app was closed.
    - **No `setInterval`, no live background scheduler.** Page-load-only sync is the documented MVP trade-off — see "Limitations" below.
    - **Admin Shifts tab polish.** Added a blue explainer banner above the shift list: *"Trạng thái ca được hệ thống tự động cập nhật theo thời gian, đặt cọc và tiến độ ứng tuyển. Override chỉ dùng khi cần xử lý ngoại lệ."* Below the banner, a smaller "Đồng bộ trạng thái lần cuối: …" line shows the local `lastLifecycleSyncAt` time. The override button label changed from `Override` to `Override (khẩn cấp)` to signal it's an emergency tool. The Override flow itself is unchanged — `adminStore.overrideEscrow` still does the work.
    - **Employer schedule page.** New route `/employer/schedule` wrapped in `<RoleGuard role="employer">`. Mirrors the worker schedule layout: `← Tuần trước` / `Tuần này` / `Tuần sau →` nav, the same `Giờ bắt đầu ngày / Giờ kết thúc ngày / Độ dài mỗi slot` config card, the same Mon→Sun grid, the same mobile horizontal-scroll wrapper. Cells render orange chips for shifts on that date that overlap the slot, showing title + time + `positionsFilled / positionsTotal` + `ShiftStatusBadge` + `EscrowStatusBadge`. Clicking a chip navigates to `/employer/shifts/[id]`. The page calls `useLifecycleSync()` on entry so badges reflect any time-driven moves immediately.
    - **Navigation.** "Lịch tuyển dụng" link added to both `NavBar` and `MobileNav` employer arrays only — workers, admins, and guests do not see it. Employer dashboard header gained a `Xem lịch tuyển dụng` button alongside the existing `Đăng ca cần tuyển` button.
    - **Limitations.** One-time sync on page load / navigation only — no live background scheduler, no `setInterval`. No Google Calendar, no server sync. The slot config on `/employer/schedule` is UI-local state, not persisted across reloads (matches `/worker/schedule`). Mock / localStorage only. No real auth / payment / OTP / ID verification.
    - **Files changed:** `src/domain/shiftLifecycle.ts` (new — `suggestShiftStatus`, `syncLifecycle`, `LifecycleSyncResult`), `src/stores/shiftStore.ts` (added `lastLifecycleSyncAt` field + `syncLifecycle` method, lazy `useApplicationStore` import), `src/lib/useLifecycleSync.ts` (new), `src/components/layout/AppHydrator.tsx` (boot sync after hydration), `src/components/layout/NavBar.tsx` and `src/components/layout/MobileNav.tsx` (added "Lịch tuyển dụng" link to employer nav), `src/app/shifts/page.tsx`, `src/app/worker/dashboard/page.tsx`, `src/app/employer/dashboard/page.tsx`, `src/app/employer/shifts/[id]/page.tsx`, `src/app/admin/dashboard/page.tsx` (each calls `useLifecycleSync()` on entry; admin Shifts tab gained the auto-sync banner + last-sync line + relabelled override button), `src/app/employer/schedule/page.tsx` (new page), `src/app/employer/dashboard/page.tsx` (added `Xem lịch tuyển dụng` button in header), `src/i18n/vi.ts` (`nav.employerSchedule`, `admin.shifts.autoNote`, `admin.shifts.lastSync`, `admin.shifts.override`, `employerSchedule.page.title`, `employerSchedule.page.subtitle`, `employerSchedule.empty.weekHint`, `employer.dashboard.viewSchedule`).

17. **Calendar UI redesign for `/worker/schedule` and `/employer/schedule`** *(2026-05-23, Phase 8)*. Both schedule pages were rebuilt on a shared calendar shell with Day / Week / Agenda views, a sidebar mini-month + legend, and a top toolbar — replacing the single Mon→Sun timetable from Phases 5B / 7. Pure UI redesign: no store, type, or persistence changes. localStorage / mock only.
    - **New shared components** in `src/components/calendar/`:
      - `CalendarShell` — Server-Component-safe two-column layout (sidebar + main area). Stacks below `lg`, side-by-side at `lg+`. Body wraps in `overflow-x-auto` so wide week/day grids scroll horizontally on narrow viewports.
      - `MiniMonthCalendar` — 6×7 month grid (Mon-first), prev/next chevrons, "Hôm nay" link. Day click → `onSelectDate(iso)`. Owns its visible-month state; resyncs only when the *month* of the selected date changes externally so internal Prev/Next isn't clobbered.
      - `CalendarToolbar` — title + Hôm nay / ◀ / ▶ + segmented Day/Week/Agenda switcher + optional `actions` slot for page-specific CTAs.
      - `WeekView` — Mon→Sun, sticky 96px time gutter, `min-w-[720px]` inner grid. Slot rows are 60px tall (so `pxPerMinute = 60 / slotMinutes`); events absolute-positioned via the new `dayViewLayout` helper. Today's column gets the orange-50 accent. Click empty cell → `onCellClick(date, start, end)`.
      - `DayView` — single-day variant of the same timetable pattern.
      - `AgendaView` — chronological list grouped by date for a rolling `dayCount` window (default 7). Empty days are omitted; entirely-empty windows render the `emptyMessage` prop.
      - `CalendarEventCard` — colored chip with 8 variants (`personalBusy`, `approvedShift`, `pendingShift`, `publishedShift`, `fullyBookedShift`, `awaitingShift`, `completedShift`, `cancelledShift`). Renders as `<button>` when `onClick` is provided, otherwise as `<div>`. `min-h-[44px]` enforced. Cancelled variant uses `line-through`.
      - `CalendarLegend` — `worker` / `employer` variants. Worker shows personal busy / approved shift / pending shift; employer shows published / fully-booked / awaiting / completed / cancelled / expired. Swatches use the `*-300` step so they remain readable against the lighter `*-100` event-card fills.
    - **Pure helpers added to `src/domain/week.ts`** (additive — every existing export preserved):
      - `monthGrid(year, month)` returns the 6×7 = 42-cell mini-month grid (Mon-first, padded with adjacent-month days), each cell `{ iso, inMonth, isToday }`.
      - `formatMonthYearVN(year, month)` returns `"Tháng M / YYYY"` (no zero-pad).
      - `dayViewLayout(events, dayIso, slotConfig)` filters events to the day, clamps into the visible window, and returns `{ event, topMinutes, heightMinutes }` per event for absolute positioning.
    - **Worker page (`src/app/worker/schedule/page.tsx`) rewritten**:
      - `<RoleGuard role="worker">` preserved. Schedule store API, `ScheduleBlockDialog`, slot config, `validateSlotConfig`, and the apply-time conflict gate (`domain/scheduleConflict.ts`) are all untouched.
      - Sidebar = `MiniMonthCalendar` + `CalendarLegend variant="worker"` + the existing orange info card explaining the approved-shifts overlay.
      - Toolbar = `CalendarToolbar` with view switcher; ◀/▶ steps ±1 week (Week), ±1 day (Day), or ±7 days (Agenda).
      - Body = single `CalendarEvent[]` derived via `useMemo` over `[myBlocks, myCalendarApplications, shiftIndex]`. IDs are prefixed `block-` and `app-` so the click dispatcher can route: blocks → open edit dialog, applications → `router.push(/shifts/{id})`. Personal busy → `personalBusy` variant; approved app → `approvedShift`; pending app → `pendingShift`; CancellationRequested → `cancelledShift`. Shifts in terminal states (`Cancelled`/`Completed`/`Expired`) are filtered out of the calendar overlay.
      - Empty cell click on Day/Week → opens add dialog with `date`/`startTime`/`endTime` prefilled (matches the previous Phase 5B behavior).
      - Flat fallback list "Tất cả lịch bận" preserved at the bottom for delete affordance.
    - **Employer page (`src/app/employer/schedule/page.tsx`) rewritten**:
      - `<RoleGuard role="employer">` preserved. `useLifecycleSync()` boot call preserved (Phase 7 contract).
      - Owner-only filter via `useMemo` over the stable `shifts` selector (no `.filter` inside the Zustand selector — same rule as Section 11).
      - Sidebar = `MiniMonthCalendar` + a primary "Đăng ca mới" CTA (`<Link href="/employer/shifts/new">`) + `CalendarLegend variant="employer"`.
      - Toolbar adds a secondary "Đăng ca mới" Button in the `actions` slot.
      - Body = `CalendarEvent[]` mapped from owned shifts; variant follows `ShiftStatus` (Published → blue, FullyBooked → amber, AwaitingConfirmation → yellow, Completed → green, Cancelled/Expired → red line-through, Draft/InProgress → blue fallback). Status chip slot renders both `ShiftStatusBadge` and `EscrowStatusBadge` inline. Click → `router.push(/employer/shifts/{id})`.
    - **i18n** — appended a single `calendar.*` block to `src/i18n/vi.ts`: view switcher labels (`calendar.view.{day,week,agenda}`), `calendar.today` / `calendar.prev` / `calendar.next`, mini-month aria labels, legend title + per-variant labels for both audiences, and empty-state copy for worker and employer windows. No existing keys renamed or removed.
    - **Limitations / out-of-scope.** No Google Calendar, Outlook, Zoom, or external API. No server sync. No drag-and-drop, no recurring schedules, no calendar library dependency. Slot config remains UI-local (not persisted). `{worker,employer}.cancellationHistory`, `useLifecycleSync()`, conflict rules, ownership guards, and admin override all unchanged.
    - **Route count unchanged at 15** — Phase 8 is a redesign of two existing routes, not a new route. No persistence schema bump.
    - **Files changed:** `src/domain/week.ts` (added `monthGrid`, `formatMonthYearVN`, `dayViewLayout` and the `MonthGridCell` type — additive only), `src/components/calendar/CalendarShell.tsx` (new), `src/components/calendar/MiniMonthCalendar.tsx` (new), `src/components/calendar/CalendarToolbar.tsx` (new), `src/components/calendar/WeekView.tsx` (new), `src/components/calendar/DayView.tsx` (new), `src/components/calendar/AgendaView.tsx` (new), `src/components/calendar/CalendarEventCard.tsx` (new) + `CalendarEventCard.test.tsx` (new), `src/components/calendar/CalendarLegend.tsx` (new), `src/app/worker/schedule/page.tsx` (rewritten), `src/app/employer/schedule/page.tsx` (rewritten), `src/i18n/vi.ts` (calendar.* block).

18. **UI/UX visual polish pass** *(2026-05-23, Phase 9)*. Pure presentation-layer pass — no business logic, store, type, or persistence changes. Goal was to lift the MVP out of "plain dashboard" territory into something that looks presentation-ready and Vietnamese-student-friendly without adding new features.
    - **Global foundations** (`src/app/globals.css`):
      - Soft warm gradient body backdrop (`radial-gradient` blobs in orange-100 / orange-200 / amber-100 over a slate-50 base) with `background-attachment: fixed`. Body's hardcoded `bg-slate-50` removed from `layout.tsx` so the gradient is visible everywhere.
      - Three reusable utility classes added: `.motion-lift` (hover lift + shadow), `.motion-press` (subtle press affordance), `.modal-panel-anim` + `.modal-backdrop-anim` (low-duration mount animations). All four wrapped in `@media (prefers-reduced-motion: reduce)` so users with motion sensitivity get the unanimated experience.
      - `.hero-decor` class for the landing hero radial blob, scoped to the hero markup so it doesn't leak.
    - **UI primitives polished**:
      - `Button` — primary/danger now use `bg-gradient-to-b` for a subtle two-stop fill, hover lifts the shadow, `motion-press` adds a 1 px translate on `:active`.
      - `Card` — added `tone: 'default' | 'warm' | 'subtle'` and a `flush` prop. Clickable cards now `motion-lift` instead of just shadow-on-hover.
      - `Modal` — panel uses `shadow-2xl ring-1 ring-black/5` plus `modal-panel-anim`; backdrop uses `modal-backdrop-anim`. Close icon button refined with focus ring.
      - `EmptyState` — calendar-with-spark default icon (was a generic clipboard), new `tone: 'subtle' | 'warm'` prop, friendlier max-width on description.
      - `Input` — already had focus rings; no behavioral change, but hover state slightly tightened. (Already had `min-h-[44px]`.)
    - **Landing page** (`src/app/page.tsx`) — full visual redesign:
      - Two-column hero at `lg+` — copy on the left with a hero badge ("Sinh viên · Linh hoạt · Tin cậy"), gradient-text accent on the headline, dual CTAs, trust hint copy. Right column shows a tasteful product mockup (sample shift card + reputation chip + calendar slot card) with backdrop blur blob.
      - New trust strip below the hero with four icon-led benefits (escrow, no-deposit, reputation, schedule).
      - Benefits sections gained icon-on-tinted-bg, lead copy, hover-lift cards.
      - "How it works" steps placed inside soft orange-50 cards with gradient-fill step numbers.
      - Final CTA section now uses an orange→amber gradient with decorative blur blobs.
    - **Worker dashboard** (`src/app/worker/dashboard/page.tsx`):
      - New gradient welcome strip with avatar fallback (first letter on an orange-amber gradient tile), greeting copy that adapts to whether the worker is a newcomer (`completedShiftCount === 0`) or veteran, plus quick "Tìm ca làm" + "Lịch cá nhân" CTAs.
      - Stat tiles replaced with a `StatTile` primitive that has a colored top accent strip (`tone: 'brand' | 'neutral' | 'good' | 'warn' | 'bad'`) and an inline glyph icon. The new fourth tile shows the worker's **live weekly cancellation quota** (`quotaUsage(...)` from `domain/cancellationQuota.ts`) — UI-only change, no store mutations.
      - Empty states for "Ca làm sắp tới" and "Đơn đã ứng tuyển" got descriptive hints + a "Tìm ca làm" CTA on the upcoming-shifts empty state.
    - **Employer dashboard** (`src/app/employer/dashboard/page.tsx`):
      - Same welcome-strip pattern with the company name.
      - Six `StatTile`s (active shifts / pending applicants / posted / completed / deposited / paid out) — applicants tile flips to amber when there are pending apps to demand attention without color regressions.
      - Empty state for "Ca làm sắp tới" surfaces a primary "Đăng ca mới" CTA inside a warm-toned `EmptyState`.
      - "Xem lịch tuyển dụng →" deep link added next to the section heading.
    - **Auth pages** (`src/app/login/page.tsx`, `src/app/register/page.tsx`, new `src/components/layout/AuthSidePanel.tsx`):
      - New shared `AuthSidePanel` component renders next to the form on `lg+`. Orange→amber gradient panel with the brand name, mode-specific welcome copy, three trust benefits (escrow, no-fees, two-way reputation), and an explicit MVP disclaimer.
      - Login demo accounts moved into a `<details>` disclosure so the form is the dominant element on narrow screens.
      - Form cards lifted to `shadow-md ring-1 ring-black/5` for depth.
    - **Employer create-shift page** (`src/app/employer/shifts/new/page.tsx`):
      - Hero-style header with eyebrow label.
      - Trust explainer card now a gradient warm panel with shield icon + tier-coded top-accent strip (`amber` low / `orange` medium / `emerald` high).
      - Deposit confirm card lifted to a richer warm card with a wallet glyph and a `ring-1 ring-orange-100` breakdown table.
    - **Calendar event chip** (`src/components/calendar/CalendarEventCard.tsx`) — added `hover:-translate-y-0.5 hover:shadow-md` lift on clickable variants, `shadow-sm` baseline; honors `motion-reduce`.
    - **Calendar toolbar** (`src/components/calendar/CalendarToolbar.tsx`) — wrapped in a soft rounded card (`rounded-2xl border bg-white shadow-sm`) instead of a flat bottom-bordered row.
    - **i18n** (`src/i18n/vi.ts`) — additive only:
      - Landing: `landing.hero.badge`, `landing.hero.titleAccent`, `landing.hero.trustHint`, `landing.trust.{escrow,noDeposit,reputation,schedule}`, `landing.employer.lead`, `landing.worker.lead`, `landing.howItWorks.lead`, `landing.finalCta.{title,subtitle}`. Existing `landing.hero.title` / `landing.hero.subtitle` were updated for stronger copy.
      - Auth: `auth.side.welcome`, `auth.side.welcome.desc`, `auth.side.join`, `auth.side.join.desc`, `auth.side.benefit{1,2,3}` + `.desc`, `auth.side.disclaimer`.
      - Worker dashboard: `worker.dashboard.welcome.{veteran,newcomer}`, `worker.dashboard.cancelQuota` + `.weekHint`, `worker.dashboard.noUpcomingShifts.hint`, `worker.dashboard.noApplications.hint`.
      - Employer dashboard: `employer.dashboard.welcome.{active,idle}`, `employer.dashboard.stats.activeShifts`, `employer.dashboard.noShifts.hint`, `employer.dashboard.pendingApps`. Old `employer.dashboard.applicants` repurposed for the pending-apps tile.
      - Shifts/new: `shifts.new.subtitle`.
    - **Responsive audit** — new file `RESPONSIVE.md` at the workspace root. Manual checklist for every route at 375 / 768 / 1280 px, plus a touch-target matrix for primitives. This closes original-spec **Task 18.3**.
    - **Constraints honored** — no new dependencies, no new external UI library, no new business logic, no store/type/persistence changes, no Google Calendar / Outlook / Zoom / payment / OTP / ID-verification integrations. localStorage / mock only. Schema unchanged at version 3. Route count unchanged at 15. All Zustand selectors remain stable raw-array reads with `useMemo` derivations.
    - **Files changed:** `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/calendar/CalendarEventCard.tsx`, `src/components/calendar/CalendarToolbar.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/layout/AuthSidePanel.tsx` (new), `src/app/worker/dashboard/page.tsx`, `src/app/employer/dashboard/page.tsx`, `src/app/employer/shifts/new/page.tsx`, `src/i18n/vi.ts`, `RESPONSIVE.md` (new).

19. **Calendar UX, Vietnamese date/time inputs, and visible polish** *(2026-05-23, Phase 9B)*. UI-only follow-up to Phase 9 — pure presentation + light page-level validation. No business logic, store, type, or persistence changes. The apply-time conflict gate (`domain/scheduleConflict.findScheduleConflicts` in `applicationStore.apply`) is untouched.
    - **Calendar visual redesign** (`/worker/schedule`, `/employer/schedule`):
      - Both pages now lead with a soft warm gradient hero header (eyebrow label + bold title + subtitle) so they read as polished product surfaces, not bare grids.
      - Sidebar items wrapped in their own translucent rounded cards (`bg-white/90 backdrop-blur-sm`) — mini-month, legend, and the worker info note all share the same visual language.
      - Calendar body wraps in a single white panel with a 2xl rounded corner so the grid no longer reads as a raw table.
      - Calendar event chips already gained hover-lift in Phase 9; this pass tightens them and adds a Phase 9B "lock chip" on confirmed work shifts (see below).
      - All decorative motion still honors `prefers-reduced-motion`.
    - **Worker schedule conflict — block vs. confirmed shift**:
      - New pure helper `findShiftOverlap(target, applications, shiftIndex)` in `src/domain/scheduleConflict.ts`. Takes a candidate `{date, startTime, endTime}` and returns the first overlapping work shift whose application status is in `Approved | CheckedIn | CheckedOut | CancellationRequested`. `Pending` is intentionally excluded — pending applications don't yet occupy confirmed schedule space.
      - `ScheduleBlockDialog.handleSubmit` now calls this helper before the schedule store's `add` / `update`. On overlap the dialog returns `error.shiftOverlap` ("Khung giờ này trùng với ca làm đã được duyệt của bạn.") and **does not** mutate the store.
      - End-time-after-start sanity also surfaces locally as `error.endBeforeStart` for friendlier messaging than the store's `TIME_RANGE_INVALID` code.
      - All apply-time logic, store APIs, types, and persistence remain unchanged.
    - **Vietnamese-friendly date and time inputs**:
      - New `DateFieldVN` (`src/components/ui/DateFieldVN.tsx`) — text input with `dd/mm/yyyy` placeholder, auto-inserts slashes, validates on blur, returns canonical `YYYY-MM-DD` via `onChange`. Accepts a `value` in `YYYY-MM-DD` form. Uses `lib/format.formatDateVN` and `lib/parse.parseDateVN`.
      - New `TimeFieldVN` (`src/components/ui/TimeFieldVN.tsx`) — text input with `HH:mm` placeholder, auto-inserts colon, validates 24-hour format on blur, returns canonical `HH:mm` via `onChange`.
      - Wired into: `ScheduleBlockDialog` (worker schedule), worker schedule slot-config, employer schedule slot-config, `ShiftForm` (date + start + end), and `ShiftFilters` (date from / to).
      - Native `<input type="date">` and `<input type="time">` removed from those surfaces. Storage format unchanged (`YYYY-MM-DD`, `HH:mm`).
      - New i18n keys: `error.dateInvalid`, `error.timeInvalid`, `error.endBeforeStart`, `error.shiftOverlap`.
    - **Slot-config collapsible**:
      - Both `/worker/schedule` and `/employer/schedule` now wrap "Cấu hình khung giờ" in a `<details>` summary labeled `t('schedule.slotCfg.toggle')` ("Tuỳ chỉnh khung giờ"). Collapsed by default — the calendar gets full vertical space on first paint, especially on mobile. New i18n key: `schedule.slotCfg.toggle`.
    - **Approved-shift visibility on worker calendar**:
      - Confirmed work shifts (`Approved` / `CheckedIn` / `CheckedOut` / `CancellationRequested`) now render a small inline "lock chip" inside the event card — orange-toned pill with a 🔒 glyph and the localized text "Ca đã duyệt". Pure cosmetic indicator; the click handler still routes to `/shifts/[id]` (read-only). Personal busy blocks fall back to "Lịch cá nhân" when no note is set.
      - New i18n keys: `schedule.event.lockedLabel`, `schedule.event.personalLabel`.
    - **Responsive audit**:
      - `RESPONSIVE.md` updated with Phase 9B notes — slot-config no longer pushes calendar grid down on mobile (resolved), VN inputs replace OS-locale-dependent native pickers, all motion stays reduced-motion safe.
    - **Constraints honored** — no new dependencies, no external UI library, no business logic / store / type / persistence changes, no Google Calendar / Outlook / Zoom / server sync. Mock / localStorage only. Schema still v3. Route count still 15.
    - **Files changed:** `src/components/ui/DateFieldVN.tsx` (new), `src/components/ui/TimeFieldVN.tsx` (new), `src/components/ui/index.ts` (re-exports), `src/domain/scheduleConflict.ts` (additive `findShiftOverlap` + `ShiftOverlap` + `CONFIRMED_WORK_STATUSES`), `src/app/worker/schedule/page.tsx` (rewritten — gradient header, polished sidebar/body, collapsible slot config, locked chip, shift-overlap guard, VN inputs), `src/app/employer/schedule/page.tsx` (rewritten — gradient header, polished sidebar/body, collapsible slot config, VN time inputs), `src/components/forms/ShiftForm.tsx` (date + start + end now use VN fields), `src/components/shift/ShiftFilters.tsx` (date from / to use VN fields), `src/i18n/vi.ts` (new error / schedule keys), `RESPONSIVE.md` (Phase 9B notes).

20. **Smart Vietnamese date/time inputs and visual acceptance pass** *(2026-05-23, Phase 9C)*. Tightens the typing model behind `DateFieldVN` / `TimeFieldVN` so users get the same hand-held feel as a mobile calendar widget, and closes the visual gaps that were still leaking on a hard refresh (admin dashboard, shifts listing, weak background gradient). UI-only — no business logic, store, type, or persistence changes.
    - **Smart `DateFieldVN`** (`src/components/ui/DateFieldVN.tsx`):
      - Strips non-digits silently (slashes are reinserted by the formatter).
      - Day digit `4..9` auto-pads to `0X/` immediately. Day digit `1..3` waits for a possible second digit (10–19, 20–29, 30–31). Day pair `32..99` rejected with `error.dateInvalid`.
      - Month digit `2..9` auto-pads to `0X/`. Month digit `1` waits (10–12). Month pair `13..99` rejected.
      - Year accepts up to 4 digits.
      - On blur, single-digit day / month is padded where safe; otherwise the localized error fires. Canonical `onChange(YYYY-MM-DD)` only fires when the input is a real calendar date (round-trip check via `formatDateVN` ∘ `parseDateVN`).
      - Examples: `"4"` → `"04/"`, `"12"` → `"12/"`, `"31"` → `"31/"`, `"3112"` → `"31/12/"`, `"31122026"` → `"31/12/2026"` and emits `"2026-12-31"`. `"50/62/026"` is rejected and emits nothing.
    - **Smart `TimeFieldVN`** (`src/components/ui/TimeFieldVN.tsx`):
      - Strips non-digits silently.
      - Hour digit `3..9` auto-pads to `0X:` immediately. Hour digit `0..2` waits (00–23). Hour pair `24..29` rejected with `error.timeInvalid`.
      - Minute first digit `6..9` rejected (minutes max 59).
      - On blur, single-digit hour is padded to `0X:00`; `03:` → `03:00`; otherwise the localized error fires. Canonical `onChange(HH:mm)` only fires when the regex `^([01]\d|2[0-3]):([0-5]\d)$` matches.
      - Examples: `"3"` → `"03:"`, `"930"` → `"09:30"`, `"1330"` → `"13:30"` and emits `"13:30"`. `"2400"` and `"60:00"` are rejected.
    - **Validation messages** (`src/i18n/vi.ts`) — already added in Phase 9B, kept as-is for 9C: `error.dateInvalid`, `error.timeInvalid`, `error.endBeforeStart`, `error.shiftOverlap`.
    - **Smart fields applied consistently** — all five surfaces from Phase 9B (`ScheduleBlockDialog`, worker/employer slot-config, `ShiftForm`, `ShiftFilters`) now consume the smart versions automatically. No call-site changes were needed because the prop contracts (`value: canonical`, `onChange: (canonical) => void`) are unchanged.
    - **Visual acceptance pass**:
      - Stronger global gradient — `globals.css` linear-gradient top stop bumped from `#fff7ed` to `#ffedd5` (orange-100), and the radial blob alphas raised from `0.10` / `0.10` / `0.12` to `0.18` / `0.16` / `0.18`. After a hard refresh on any route, the upper third of the viewport now reads as warmly tinted, not slate-on-slate.
      - `/admin/dashboard` gained a gradient hero header matching the worker/employer dashboards (eyebrow + bold title + subtitle), with a "Chế độ admin" shield badge on the right edge to keep the tone serious. Tab nav rehoused in a white card with shadow + border.
      - `/shifts` gained a gradient hero header (eyebrow + title + subtitle + match-count chip on the right). Search bar + filters wrapped in a single white panel so they read as a unified control surface. Empty state flipped to `tone='warm'`.
    - **Visual QA documentation** — new file `VISUAL_QA.md` at the workspace root. Per-route visual treatment matrix + standardized patterns + remaining limitations + when-to-re-run guidance. Complements `RESPONSIVE.md` (which captures layout / breakpoint / touch-target issues).
    - **i18n** — additive only: `shifts.listing.eyebrow`, `shifts.listing.subtitle`, `shifts.listing.matchSuffix`, `admin.dashboard.eyebrow`, `admin.dashboard.subtitle`, `admin.dashboard.badge`. No existing keys renamed or removed.
    - **Constraints honored** — no new dependencies, no external UI library, no business logic / store / type / persistence changes, no Google Calendar / Outlook / Zoom / server sync, no date-picker library. Mock / localStorage only. Schema still v3. Route count still 15.
    - **Files changed:** `src/components/ui/DateFieldVN.tsx` (rewritten — smart formatter + finalizer), `src/components/ui/TimeFieldVN.tsx` (rewritten — smart formatter + finalizer), `src/app/admin/dashboard/page.tsx` (gradient hero + admin badge), `src/app/shifts/page.tsx` (gradient hero + unified search/filter panel + warm empty state), `src/app/globals.css` (stronger background gradient), `src/i18n/vi.ts` (new shifts/admin hero keys), `VISUAL_QA.md` (new).

21. **Motion system, scroll reveal, and hero interaction polish** *(2026-05-23, Phase 9D)*. Pure presentation pass — no business logic, store, type, or persistence changes. Goal was to lift the app from "designed but static" into "designed and alive" without crossing into distracting animation or adding new dependencies.
    - **CSS motion utilities added to `globals.css`**:
      - `entrance-up` + `entrance-right` keyframes for first-paint fade-and-slide. Each consumes a `--entrance-delay` custom property so callers can stagger across multiple elements.
      - `.reveal` + `.reveal.is-revealed` for scroll-into-view fade-and-slide, also with `--reveal-delay` for stagger.
      - `float-soft` keyframe (4 px vertical drift, 8 s ease-in-out infinite) and `.float-soft-slow` modifier (11 s) for ambient warmth on decorative shapes.
      - `.bg-dot-grid` utility — CSS-only orange dot pattern at low alpha for paper-texture decoration.
      - All four families short-circuited under `prefers-reduced-motion: reduce`: animations cancel, transforms reset to identity, the reveal transition becomes instant.
    - **`Reveal` component** (`src/components/ui/Reveal.tsx`):
      - `'use client'` wrapper that uses `IntersectionObserver` to add `is-revealed` once the element scrolls into the viewport. One-shot: the observer disconnects after revealing, so scrolling back up doesn't replay the fade.
      - SSR / no-`IntersectionObserver` / reduced-motion users see the revealed state immediately — no content is hidden behind the observer.
      - Props: `as` (element tag, defaults to `div`), `delayMs` (stagger), `threshold` (intersection ratio, defaults to 0.15). No animation variants — a single reveal direction kept the API tight.
      - Re-exported from `src/components/ui/index.ts` alongside the rest of the primitives.
    - **Landing hero motion** (`src/app/page.tsx`):
      - On first paint, the hero copy column staggers in via `entrance-up` at 0 / 80 / 160 / 240 / 320 ms (badge → headline → subtitle → CTA pair → trust hint).
      - The hero mockup column uses `entrance-right` at 320 ms so it slides in from the right after the copy lands.
      - Subsequent sections (trust strip, employer benefits, worker benefits, employer how-it-works, worker how-it-works, final CTA) each wrap in `Reveal` with appropriate stagger. The trust strip stagger is 80 ms × index; benefit and how-it-works pairs use 0 / 120 ms.
    - **Hero mockup clarity decision (Option 1)**:
      - The whole mockup column is now `pointer-events-none` and `aria-hidden="true"`. The cards still look like polished UI but cannot trap clicks or keyboard focus.
      - A small "Bản xem trước" pill at the top of the mockup stack tells sighted users this is preview imagery.
      - The mockup is wrapped in three soft-floating animations (`float-soft` on the main shift card and the calendar-slot card; `float-soft-slow` on the reputation chip and the backdrop blob) so the cards drift by 4 px on slightly different cadences. Total visual motion: a few pixels per second per card. Reduced-motion users see them static.
      - A faint dot-grid layer (`.bg-dot-grid`, masked to a radial fade) sits behind the mockup so the column reads as a designed product surface, not floating cards on white.
    - **Dashboard welcome strips** got `entrance-up` on the hero strip itself so worker / employer dashboards fade in on load. Below-the-fold dashboard sections (StatTiles, sections list) were intentionally NOT reveal-wrapped — these are utility surfaces and reveal motion would slow down user-facing data.
    - **Calendar pages** got a soft floating decorative-blob layer behind the page chrome (two orange / amber blurred circles at `-z-10`, `pointer-events-none`, `aria-hidden`, on the `.float-soft` loop). The blobs sit above the grid only visually — the calendar content remains instantly interactive. The grid itself was deliberately not reveal-wrapped: rendering speed beats entrance polish for a calendar surface.
    - **VISUAL_QA.md updated** — new "Phase 9D — motion + reveal additions" section captures the entrance sequence, mockup interaction decision, scroll-reveal map, calendar treatment, and reduced-motion guarantees.
    - **Constraints honored** — no new dependencies, no external animation library, no Framer Motion, no business logic / store / type / persistence changes. Mock / localStorage only. Schema unchanged at v3. Route count unchanged at 15. All Zustand selectors remain stable raw-array reads.
    - **Files changed:** `src/app/globals.css` (4 new keyframes + reveal + float + dot-grid utilities, reduced-motion fallback expanded), `src/components/ui/Reveal.tsx` (new), `src/components/ui/index.ts` (re-export), `src/app/page.tsx` (entrance staggers + Reveal wrappers + decorative mockup with "Bản xem trước" pill + pointer-events-none + aria-hidden + float-soft + bg-dot-grid), `src/app/worker/dashboard/page.tsx` (entrance-up on welcome strip), `src/app/employer/dashboard/page.tsx` (entrance-up on welcome strip), `src/app/worker/schedule/page.tsx` (decorative blob layer + entrance-up on hero), `src/app/employer/schedule/page.tsx` (decorative blob layer + entrance-up on hero), `VISUAL_QA.md` (Phase 9D section).

22. **Hero featured-job interactivity and background depth** *(2026-05-23, Phase 9E)*. Pure presentation pass — no business logic, store, type, or persistence changes. Goal was to retire the Phase 9D decorative `HeroMockup` (which read as "fake preview") and ship a real, clickable featured-job card backed by live store data, plus deepen the hero background visual.
    - **`FeaturedJobMockup` client island** (new file `src/components/landing/FeaturedJobMockup.tsx`):
      - `'use client'` component that reads `useShiftStore((s) => s.shifts)` (stable raw selector). Filters via the same publication invariant the discovery page enforces — `status === 'Published'`, `escrowStatus === 'Deposited'`, `positionsFilled < positionsTotal`, start datetime in the future. Sorts ascending by `${date}T${startTime}` and picks the soonest-eligible shift.
      - When a featured shift exists → main card renders as a `<Link href={\`/shifts/${shift.id}\`}>` with `aria-label` referencing the real title (e.g. `"Xem chi tiết ca Phục vụ quán phở giờ trưa"`), `motion-lift` hover, `focus-visible:ring-2 focus-visible:ring-orange-400`, and a stronger `ring-1 ring-orange-100` accent so it reads as "featured", not "preview".
      - When no eligible shift exists (empty store, all expired) → main card links to `/shifts` instead and renders a friendly fallback body (`"Khám phá ca làm phù hợp"`). No fake detail URLs are ever produced.
      - Two supporting stat cards (reputation chip, sample calendar slot) stay decorative inside an `aria-hidden="true"` wrapper and use muted `bg-white/80` with slightly desaturated borders. No hover lift, no focus ring, no pointer cursor — they clearly read as "supporting stats", not interactive controls.
      - The mockup column slides in from the right via `entrance-right` at 320 ms (same delay the Phase 9D mockup used). Soft `float-soft` and dot-grid backdrops preserved from Phase 9D.
    - **Featured-job pill copy.** Phase 9D's "Bản xem trước" badge replaced with `t('landing.hero.featured.badge')` → `"Việc đang nổi bật"`. The accompanying glyph is a spark icon so the pill reads as "highlighted opportunity", not "preview/loading".
    - **Hero background depth** (`HeroBackgroundDecor` in `src/app/page.tsx`):
      - Curved bottom gradient wash (`borderTopLeftRadius: '50% 100%'`) that bleeds the hero into the next section so the boundary feels designed, not stamped.
      - Four floating motif glyphs on `lg+` only — phone, calendar, shield-with-check, location pin — each at low alpha (`text-orange-300/60..70`) and drifting on the existing `.float-soft` loop. Hidden on mobile via `hidden lg:block` so the small viewport stays clean.
      - Wrapper has `pointer-events-none` + `aria-hidden="true"` and sits at `-z-0` so the decoration never traps input.
    - **Featured-job click target.** Soonest currently-listable shift via the live `useShiftStore`. When seed data is loaded that's `shift-001` (Phục vụ quán phở giờ trưa, 25/05/2026) until it expires; thereafter it advances to the next eligible shift automatically. Empty-store fallback `/shifts`.
    - **i18n** — additive: `landing.hero.featured.badge`, `landing.hero.featured.statusBadge`, `landing.hero.featured.viewCta`, `landing.hero.featured.exploreCta`, `landing.hero.featured.exploreAria`, `landing.hero.featured.fallbackTitle`, `landing.hero.featured.fallbackHint`, `landing.hero.featured.repLabel`, `landing.hero.featured.repHint`, `landing.hero.featured.upcomingLabel`, `landing.hero.featured.upcomingDay`, `landing.hero.featured.upcomingTime`. No existing keys renamed or removed.
    - **Constraints honored** — no new dependencies, no external image assets, no new animation library, no business logic / store / type / persistence changes, no new seed data, no server fetching. All routes existed before this phase. Mock / localStorage only. Schema unchanged at v3. Route count unchanged at 15.
    - **Files changed:** `src/components/landing/FeaturedJobMockup.tsx` (new), `src/app/page.tsx` (removed dead `HeroMockup` function, imported `FeaturedJobMockup`, added `HeroBackgroundDecor` with curved wash + motif icons, swapped mockup column source), `src/i18n/vi.ts` (new `landing.hero.featured.*` keys), `VISUAL_QA.md` (Phase 9E section + updated remaining-limitations note).

23. **Product UX refinements pass** *(2026-05-23, Phase 9F)*. Wide-scope copy, interaction, and rule cleanup. No business logic / store / type / persistence changes; one domain-module behavior split (employer cancel deadline) and one new lib helper file. Mock / localStorage only. Route count unchanged at 15. Schema unchanged at v3.
    - **Inclusive copy** — `vi.ts` only, user-facing strings:
      - `landing.hero.badge` "Sinh viên · Linh hoạt · Tin cậy" → "Linh hoạt · Tin cậy · Minh bạch"
      - `landing.hero.title` "Việc làm thêm ngắn hạn" → "Việc làm ngắn hạn"
      - `landing.hero.titleAccent` "cho mọi sinh viên" → "cho người lao động linh hoạt"
      - `landing.hero.subtitle` "với sinh viên và người tìm việc linh hoạt … không cần ứng dụng tải về" → "với người lao động linh hoạt … không cần tải ứng dụng"
      - `auth.side.join.desc` "cả sinh viên tìm việc lẫn quán/sự kiện" → "cả người tìm việc linh hoạt lẫn quán/sự kiện cần người làm linh hoạt"
      - `site.description` dropped "sinh viên và" → "người lao động linh hoạt"
      - **Preserved:** `btn.uploadStudentCard` and `verification.student` (these refer to the student-card verification artefact for one user group, not the platform's overall audience). Seed user bios untouched (mock data).
    - **Tổng quan rename**:
      - `nav.dashboard` "Bảng điều khiển" → "Tổng quan"
      - `worker.dashboard.title` → "Tổng quan người lao động"
      - `employer.dashboard.title` → "Tổng quan nhà tuyển dụng"
      - `admin.dashboard.title` "Quản trị hệ thống" → "Tổng quan quản trị"
      - `admin.dashboard.eyebrow` → "Tổng quan admin"
      - Route paths and file structure unchanged.
    - **Clickable stat tiles** (worker / employer / admin):
      - `StatTile` (worker + employer copies) gained `onClick` + `ariaLabel` props. When provided the tile renders as a `<button>` with `motion-lift`, `cursor-pointer`, `focus-visible:ring-2`, hover-shown "Xem chi tiết →" indicator. Otherwise it renders as a plain `<div>` (no behavior change for non-interactive use).
      - **Worker dashboard:**
        - Reputation tile → opens new modal showing the +5 / −10 / −20 explanation + current score.
        - Completed-shifts and earnings tiles → smooth-scroll to the existing `worker-upcoming-section`.
        - Cancel-quota tile → opens new modal showing weekly + monthly usage + reputation-tier bonus rules.
      - **Employer dashboard:**
        - Active / posted shifts tiles → smooth-scroll to `employer-active-shifts`.
        - Pending-applicants tile → smooth-scroll to `employer-pending-apps`.
        - Completed / deposited / paid-out tiles → open new payments-summary modal listing the four key metrics + an MVP disclaimer.
      - **Admin dashboard:**
        - `AnalyticsPanel` `StatCard` gained `onClick` + `ariaLabel`. Each stat now jumps to the right tab + applies an initial filter:
          - Total users → Users tab, filter `'all'`
          - Workers → Users tab, filter `'worker'`
          - Employers → Users tab, filter `'employer'`
          - Total shifts → Shifts tab, filter `'all'`
          - Active shifts → Shifts tab, filter `'active'`
          - Completed shifts → Shifts tab, filter `'completed'`
          - Disputed payments → Shifts tab, filter `'disputed'`
          - Open disputes → Disputes tab
        - `UsersPanel` and `ShiftsPanel` accept new `initialFilter` props so the deeplink lands users on the right slice.
      - All scroll/modal targets are existing surfaces — no new pages, no new fake data. Pure UI navigation + presentation.
    - **Hourly wage formatter + Vietnamese words**:
      - New file `src/lib/numberVN.ts` exporting `formatNumberVNInput`, `parseVNNumberInput`, `numberToVietnameseWords`, `numberToVietnameseCurrency`. Pure TS, no dependencies. Range 0..999_999_999 with sentinel "số quá lớn" outside. Handles Vietnamese euphony rules (mười lăm not mười năm, mốt after mươi).
      - `ShiftForm` hourly-wage `Input` replaced with a hand-rolled controlled text input that renders `35.000` while typing `35000`, internal canonical value stays `number`. Helper text below the field reads the current value as words: `"35000"` → `"(ba mươi lăm nghìn VNĐ)"`. When empty, the helper line shows the new `form.hourlyWage.hint` copy.
      - Validation logic untouched — submit still requires `hourlyWage > 0`.
    - **`TimeFieldVN` deletion fix**:
      - The Phase 9C smart formatter was too aggressive on backspace — typing `14:00` then deleting from the right would re-insert the colon and trap the caret around `:`.
      - New `handleChange` detects deletion direction by comparing previous visible text length with new raw input length. When deleting, the formatter is bypassed and the user's raw input (sanitized to digits + `:`) is preserved. Forward typing keeps the existing smart auto-format.
      - Now flows naturally: `14:00` → `14:0` → `14:` → `14` → `1` → empty.
      - Blur-time finalizer unchanged: `3` → `03:00`, `13` → `13:00`, `13:` → `13:00`, `13:4` → `13:40`. Invalid input still surfaces `error.timeInvalid`.
    - **Employer cancellation deadline** — domain change in `src/domain/timeGates.ts`:
      - Split the unified 24-hour `withinEditCancelWindow` into `EDIT_DEADLINE_HOURS = 24` and `CANCEL_DEADLINE_HOURS = 6`. New helper `withinShiftDeadline(now, shift, deadlineMs)` parameterized by the deadline.
      - `canEditShift` still uses 24h (Req 25.1).
      - `canCancelShift` now uses **6h** (Phase 9F) — employers can cancel a shift up until 6 hours before start, regardless of whether anyone has applied or been approved.
      - Backwards-compatible alias `EDIT_CANCEL_DEADLINE_HOURS` kept as an export so any external import doesn't break.
      - i18n updated: `shift.error.TOO_LATE` body changed to "Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu." Two new keys for clarity: `shift.error.TOO_LATE_CANCEL` (alias) and `shift.error.TOO_LATE_EDIT` (24h message).
      - Worker cancellation rules untouched (Phase 2 / 3): the 3h `requiresEmployerApprovalToCancel` gate + the 24h `classifyCancellation` reputation rule both remain.
      - No persistence schema bump.
    - **Page help guides** — new primitive `src/components/ui/PageHelpButton.tsx`:
      - Ghost-style button labeled "Hướng dẫn sử dụng" with a question-mark glyph, opens existing `Modal` primitive with surface-specific bullet items.
      - 6 surfaces wired: worker dashboard, worker schedule, employer dashboard, employer schedule, `/employer/shifts/new`, admin dashboard.
      - Accessible: native `<button>` + ESC-to-close from `Modal` + focus ring.
      - Keys: `help.btn.{label,aria,close}` + `help.{workerDashboard,workerSchedule,employerDashboard,employerSchedule,shiftCreate,adminDashboard}.{title,intro,item1..item4}`.
    - **Admin sort controls**:
      - Replaced single sort hint ("Sắp xếp theo điểm uy tín ↓") with a `<select>` dropdown (Tên / Vai trò / Điểm uy tín / Trạng thái / Ngày tham gia) + asc/desc toggle button.
      - Sort applies to derived `useMemo` array; existing role-filter chips and reputation-adjustment row state untouched.
      - i18n: `admin.user.sortField`, `admin.user.sortField.{name,role,reputation,status,joined}`, `admin.user.sortDir.{asc,desc,toAsc,toDesc}`.
      - `ShiftsPanel` gained four filter chips (Tất cả / Đang hoạt động / Đã hoàn thành / Tranh chấp) so the deeplink from analytics tiles renders the right slice.
    - **Visual polish on stat cards** — hover lift, focus ring, "Xem chi tiết →" hover-revealed indicator on every interactive tile. Non-interactive tiles unchanged.
    - **Constraints honored** — no new dependencies (`numberVN.ts` is pure TS), no external UI library, no backend / server logic, no schema bump. All Zustand selectors remain stable raw-array reads with `useMemo` derivations. Apply-time worker conflict logic + worker cancellation rules untouched.
    - **Files changed:** `src/i18n/vi.ts` (inclusive-copy + Tổng quan + new error / sort / help / payments / quota-modal keys), `src/lib/numberVN.ts` (new), `src/domain/timeGates.ts` (split edit/cancel deadlines, new constants), `src/components/ui/PageHelpButton.tsx` (new), `src/components/ui/index.ts` (re-export), `src/components/ui/TimeFieldVN.tsx` (deletion-direction handling), `src/components/forms/ShiftForm.tsx` (formatted wage input + Vietnamese words helper), `src/app/worker/dashboard/page.tsx` (interactive StatTiles + reputation/quota modals + help button + section anchor), `src/app/employer/dashboard/page.tsx` (interactive StatTiles + payments modal + help button + section anchors), `src/app/admin/dashboard/page.tsx` (interactive StatCards + jumpToTab handlers + sort dropdown + filter chips on Shifts tab + help button), `src/app/worker/schedule/page.tsx` (help button), `src/app/employer/schedule/page.tsx` (help button), `src/app/employer/shifts/new/page.tsx` (help button).

24. **Phase 9F UX bug fixes + visual cleanup pass** *(2026-05-23, Phase 9G)*. Targeted bug fixes against the four issues surfaced by manual browser QA after Phase 9F shipped, plus a visual direction reset: the chrome was carrying too many decorative blobs and the help-modal backdrop was rendering banding artefacts. No new dependencies, no schema bump (still v3), no business logic changes outside the cancel rule. Mock / localStorage only. Route count unchanged at 15.
    - **A. Employer cancellation rule — applicant-aware exception** (`src/stores/shiftStore.ts`):
      - Phase 9F switched the employer cancel deadline from 24h to a flat 6h. Manual QA showed that broke the common case "I posted a shift, nobody applied, I want to cancel right before it starts" — the employer had no way out.
      - New `cancel()` rule:
        1. After the shift's start datetime → blocked unconditionally with `TOO_LATE_STARTED`.
        2. Less than 6 hours before start AND the shift has any active applicant (status in `Pending | Approved | CancellationRequested | CheckedIn | CheckedOut`) → blocked with `TOO_LATE_HAS_APPLICANTS`.
        3. Less than 6 hours before start AND zero active applicants → **allowed** (the new exception).
        4. More than 6 hours before start → allowed.
      - `CancelError` union expanded from `'NOT_FOUND' | 'TOO_LATE'` to `'NOT_FOUND' | 'TOO_LATE_STARTED' | 'TOO_LATE_HAS_APPLICANTS'`. The store no longer calls `canCancelShift` from `domain/timeGates`; that helper is kept for back-compat (it wasn't time-only any more, so a domain export couldn't satisfy the new contract without dragging applicationStore into the domain layer — kept the rule inline).
      - i18n: new `shift.error.TOO_LATE_STARTED` ("Không thể huỷ ca sau khi ca đã bắt đầu.") and `shift.error.TOO_LATE_HAS_APPLICANTS` ("Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu vì ca đã có người ứng tuyển hoặc được duyệt."). The legacy `shift.error.TOO_LATE` / `shift.error.TOO_LATE_CANCEL` keys remain so older code paths still resolve.
      - Worker cancellation rules untouched — no changes to `cancelByWorker`, `quotaUsage`, the 3h employer-approval gate, or the `classifyCancellation` 24h reputation rule.
      - `app/employer/shifts/[id]/page.tsx` updated to map the new error codes onto the localized strings.
    - **B. Help-modal visual fix** (`src/components/ui/Modal.tsx`):
      - Manual QA showed "white content in the middle, dark/gray blocks on both sides" — the `backdrop-blur-sm` + body's `background-attachment: fixed` warm gradient combined to make the blur sample bands of varying brightness, producing diagonal artefacts.
      - Backdrop now uses solid `bg-slate-900/60` with **no `backdrop-blur`**. Outer wrapper switched to `fixed inset-0 overflow-y-auto` with the panel centered inside a `flex min-h-full items-center justify-center p-4 sm:p-6` so tall help-style content can scroll naturally.
      - Default panel widened from `max-w-md` → `max-w-lg` (callers can still override via `className`).
      - Added body `overflow: hidden` scroll-lock while the modal is open, restored on unmount.
      - Animations preserved (`modal-panel-anim`, `modal-backdrop-anim`).
    - **C. Worker dashboard stat-tile behavior** (`src/app/worker/dashboard/page.tsx`):
      - "Tổng thu nhập" tile previously scrolled to upcoming shifts (a different, unrelated section). Now opens a dedicated `IncomeDetailModal`:
        - Shows total earnings, completed-paid count, recent 5 confirmed shifts with payouts, and a short MVP disclaimer ("Thu nhập được tính từ các ca đã hoàn thành và đã thanh toán trong bản MVP.").
        - Empty state: friendly "Chưa có thu nhập…" copy.
      - "Ca đã hoàn thành" tile now opens a `CompletedShiftsModal` with the same 5 most-recent confirmed shifts (date + location). No fake data; uses live `useApplicationStore` payouts and the existing `worker.completedShiftCount` counter.
      - `statDetail` state union extended from `'reputation' | 'quota' | null` to `'reputation' | 'quota' | 'income' | 'completed' | null`.
      - i18n additions: `worker.dashboard.incomeModal.{totalLabel,completedCount,recentTitle,empty,disclaimer}` + `worker.dashboard.completedModal.{totalLabel,recentTitle,empty}`.
    - **D. Visual / background cleanup** (`src/app/globals.css`, `src/app/page.tsx`, `src/app/worker/schedule/page.tsx`, `src/app/employer/schedule/page.tsx`):
      - `globals.css` body chrome collapsed from "3 corner radial blobs + linear gradient with `background-attachment: fixed`" to "1 large diagonal mesh wash anchored top-left + 1 cream→slate linear gradient, normal scroll attachment". This kills the modal-banding root cause and gives a calmer first-paint surface.
      - `.hero-decor` reduced from 3 overlapping radials to a single warm wash anchored top-right + a soft fade-out at the bottom.
      - New `.hero-panel` utility — designed surface (warm radial + dot-grid mask + inset orange ring + soft warm shadow) wrapping `<FeaturedJobMockup />` so the right column reads as an intentional product hero, not floating cards on beige.
      - `.bg-dot-grid` alpha lowered from `0.18` → `0.10` (paper texture, not active chrome).
      - Removed the four floating motif icons (phone / calendar / shield / map-pin) from `HeroBackgroundDecor` per "stop adding random blobs". Curved bottom wash kept.
      - Removed the two floating blurred orange/amber circles behind `/worker/schedule` and `/employer/schedule`. The body's calmer chrome now carries that surface treatment without competing with the calendar grid.
      - The final-CTA orange section's two white/amber blur blobs were kept — they sit inside an explicit gradient panel and contribute to the band, not to the body chrome.
      - Motion utilities (`motion-lift`, `motion-press`, `entrance-up`, `entrance-right`, `reveal`, `float-soft`) all preserved. `prefers-reduced-motion: reduce` block unchanged.
    - **Files changed (Phase 9G):** `src/stores/shiftStore.ts` (new `CancelError` union, applicant-aware `cancel()` rule, dropped `canCancelShift` import), `src/components/ui/Modal.tsx` (no backdrop-blur, `max-w-lg` default, scroll-lock, `min-h-full` flex-centered scroll wrapper), `src/i18n/vi.ts` (new `shift.error.TOO_LATE_STARTED` / `TOO_LATE_HAS_APPLICANTS` + worker income/completed modal keys), `src/app/employer/shifts/[id]/page.tsx` (error-code mapping), `src/app/worker/dashboard/page.tsx` (income + completed modals, extended `statDetail` state), `src/app/globals.css` (calmer body chrome + new `.hero-panel` utility + reduced `.hero-decor` and `.bg-dot-grid`), `src/app/page.tsx` (`HeroBackgroundDecor` simplified to bottom wash only, mockup wrapped in `.hero-panel`), `src/app/worker/schedule/page.tsx` (removed decor blobs), `src/app/employer/schedule/page.tsx` (removed decor blobs), `HANDOFF.md`, `VISUAL_QA.md`.

25. **Phase 9H modal portal + stat-card detail bug fixes** *(2026-05-23, Phase 9H)*. Targeted bug fixes against two manual-QA findings against Phase 9G:
    1. The help-guide modal looked "trapped inside the page section" — the overlay only covered the section, not the viewport. Root cause: `Modal` rendered in-tree, so any ancestor with `transform`, `filter`, `overflow: hidden`, or its own stacking context (the gradient hero, `.hero-panel`, schedule containers) clipped the fixed overlay.
    2. Worker / employer stat-card detail modals carried thin content. Worker reputation and quota modals showed only abstract rules; employer tiles still scrolled to anchors that didn't always exist on the dashboard.
    - **A. Modal portal** (`src/components/ui/Modal.tsx`):
      - Switched the overlay to render via `createPortal(overlay, document.body)`. SSR-safe — the portal is gated on a `useEffect`-set `mounted` flag so the server renders `null` and the first hydrated render matches.
      - Bumped overlay z-index from `z-50` → `z-[100]` so the modal sits above the sticky NavBar (`z-30`), MobileNav drawer (`z-50`), and Toast host (`z-50`).
      - All other 9G fixes preserved: solid `bg-slate-900/60` backdrop with no `backdrop-blur`, `max-w-lg` default panel, `flex min-h-full items-center justify-center` scroll wrapper, body scroll-lock, ESC + click-outside + close-button + focus trap intact.
      - The change is fully transparent to all callers (`PageHelpButton`, worker stat detail modals, employer payments modal, the new Phase 9H detail modals, `CancelApplicationDialog`, `EmployerFeedbackForm`, etc.). No call site touched.
    - **B. Worker stat-card detail enrichment** (`src/app/worker/dashboard/page.tsx`):
      - **Reputation modal** now shows: current score in a tone-coded hero strip (good/warn/bad), the existing rules summary, two side-by-side stat tiles (`completedShiftCount` + `ratingsReceived.length`), and the most-recent 5 cancellation records from `worker.cancellationHistory` with `LateCancel` (−10) / `OnTime` (0) badges. When `cancellationHistory` is empty we render a clear MVP note instead of inventing fake events.
      - **Cancellation-quota modal** now shows the existing weekly/monthly remaining lines plus the most-recent 5 cancellation records with shift title + date + LateCancel/OnTime classification, plus an empty-state copy when no history exists.
      - **Income modal** now adds time-range (`HH:mm–HH:mm`) and location to each recent payout row; everything else preserved.
      - **Completed-shifts modal** now adds time-range + location to each row, plus an "Đã xác nhận" badge and an optional payout amount when `payoutAmount > 0`.
      - Removed the orphan `scrollToId` helper.
      - i18n additions: `worker.dashboard.reputationModal.{currentLabel,bandGood,bandWarn,bandBad,completedLabel,ratingsLabel,recentTitle,noHistory,lateCancel,onTimeCancel}`, `worker.dashboard.quotaModal.{recentTitle,empty,unknownShift}`, `worker.dashboard.completedModal.confirmedBadge`.
    - **C. Employer stat-card detail enrichment** (`src/app/employer/dashboard/page.tsx`):
      - Replaced the `scrollToId(...)` shortcuts on all six tiles with proper detail modals, controlled by a single `statDetail` state (`'posted' | 'active' | 'pending' | 'completed' | 'payments' | null`).
      - **Posted-shifts modal** lists every shift the employer has ever posted (Draft/Published/FullyBooked/InProgress/AwaitingConfirmation/Completed/Cancelled), sorted descending by start datetime. Each row shows title, date, time-range, location, status badge, deposit total, position counter, and a "Xem chi tiết →" link to `/employer/shifts/[id]`. Truncated to 12 with a note when more exist.
      - **Active-shifts modal** lists shifts in `Published | FullyBooked | InProgress | AwaitingConfirmation`, sorted ascending so the next-up shift is first.
      - **Completed-shifts modal** lists `Completed` shifts, sorted descending. Same row template as the other shift lists.
      - **Pending-applicants modal** lists every `Pending` application across the employer's shifts with worker name, shift title, date, and a "Xem chi tiết" link to the manage page.
      - **Payments modal** keeps the existing 4-cell summary and now adds a "Recent payouts" list of the most-recent 5 completed shifts contributing to `totalPaidOut` (title, date, time-range, deposit amount), plus an empty-state copy.
      - Extracted a shared `<ShiftListModal>` helper at the bottom of the file for the three list-style modals.
      - Removed the orphan `scrollToId` helper. The `id="employer-active-shifts"` / `id="employer-pending-apps"` anchors on the dashboard sections are kept (harmless, future deeplinks may still want them) but no longer driven by tile clicks.
      - i18n additions: `employer.payments.{recentTitle,empty}`, `employer.detail.{positionsLabel,truncated,posted.{title,intro,empty},active.{title,intro,empty},completed.{title,intro,empty},pending.{title,intro,empty}}`.
    - **D. Modal visual consistency.** Every modal in the workspace now portal-mounts above the viewport with the same backdrop, panel width, padding, animations, and close button, since they all share the `Modal` primitive. No call site needed any per-modal fix; the portal change cascaded.
    - **Constraints honored** — no new dependencies (`createPortal` is part of React DOM, already in the bundle), no schema bump (still v3), no business logic changes, no new seed data, no server fetching. Worker / employer cancellation rules from Phase 9G unchanged. Mock / localStorage only.
    - **Files changed (Phase 9H):** `src/components/ui/Modal.tsx` (portal mount, `mounted` SSR guard, `z-[100]`), `src/app/worker/dashboard/page.tsx` (richer reputation + quota + income + completed modals, dropped orphan `scrollToId`), `src/app/employer/dashboard/page.tsx` (six tile-detail modals replacing scroll shortcuts, shared `ShiftListModal`, dropped orphan `scrollToId`), `src/i18n/vi.ts` (worker reputation/quota/completed + employer detail keys), `HANDOFF.md`, `VISUAL_QA.md`.

26. **Phase 9I demo data consistency + richer detail modals + employer rating visibility** *(2026-05-23, Phase 9I)*. Targeted fixes against three manual-QA findings against Phase 9H:
    1. Worker dashboard showed `Ca đã hoàn thành: 12` but the modal listed "no completed shifts" because seed data only had one Confirmed application backing the count.
    2. Worker reputation showed 95/100 but the modal couldn't explain why — there were no positive events or denormalized ratings.
    3. Employer ratings/reviews existed in `ratings.json` but the worker → employer feedback slice (`employerFeedback`) was seeded empty so no review was visible anywhere.
    - **A. Seed data enrichment** (mock-only — no business logic changes):
      - `src/data/seed/users.json` — `worker-001` got 5 denormalized `ratingsReceived` entries (4×5★ + 1×4★) backing the 95/100 score; `worker-002` got 4 entries; `worker-003` and `worker-004` got 1 each. `worker-001` also got one `OnTime` cancellation history entry. `worker-005` keeps its existing `LateCancel` + 1 NoShow. Bios neutralised: removed the `"sinh viên"` framing left over from before Phase 9F's inclusive-copy pass.
      - `src/data/seed/shifts.json` — 5 new `Completed` shifts (`shift-010`..`shift-014`) across both `employer-001` and `employer-002`, all with `escrowStatus: 'Released'` and realistic deposit totals.
      - `src/data/seed/applications.json` — 7 new `Confirmed` applications (`app-100`..`app-104` for `worker-001`, `app-110`/`app-111` for `worker-002`) with `checkInAt`/`checkOutAt`/`confirmedAt` timestamps + `payoutAmount` so the income / completed modals show real recent rows. Older 7 confirmed shifts on `worker-001` (12 − 5) and 14 on `worker-002` (18 − 4) intentionally don't have detail rows — the modal calls these out as "X ca cũ hơn không có dữ liệu chi tiết trong bản MVP".
      - `src/data/seed/ratings.json` — synced with the worker `ratingsReceived` arrays so `applicationStore.ratings` slice and `Worker.ratingsReceived` agree.
      - `src/data/seed/employerFeedback.json` — **new** seed file (6 entries) so worker → employer reviews are visible immediately on a fresh reseed. `employer-001` gets 3 reviews (avg 4.7), `employer-002` gets 3 reviews (avg 5.0), `employer-003` has none yet.
      - `src/data/persistence.ts` — imports the new `employerFeedback.json` seed; `seedSnapshot.employerFeedback` now returns the seeded array (was `[]`); `SCHEMA_VERSION` bumped from **3 → 4** so existing localStorage demos auto-pick up the richer data on next load. The Phase 9I bump is the only schema change in this phase; the persisted shape itself is unchanged (no new keys, no field migrations).
    - **B. Worker stat-card detail enrichment** (`src/app/worker/dashboard/page.tsx`):
      - **Reputation modal** now renders a derived **score timeline** computed from observable events (Confirmed applications → +5 each, `LateCancel` records → −10 each, aggregated `noShowCount` → −20 × N). Each row shows the event label, the source shift title (when resolvable), the date, and a tone-coded delta badge. An MVP disclaimer line clarifies the data is mock and explains how the real system updates the score. Empty state preserved when no events exist.
      - **Completed-shifts modal** rows now show employer name, time-range, location, the worker's own rating from that shift (★ + comment, when available), and the payout. Recent-title now reads `"Hiển thị 5 ca gần nhất trong tổng số 12 ca đã hoàn thành"` so the count + list count match. When `completedShiftCount > Confirmed application count`, an italic "Còn X ca cũ hơn không có dữ liệu chi tiết trong bản MVP" footer prevents the perceived inconsistency.
      - **Income modal** rows now show employer name in addition to the prior date / time / location / payout.
      - **Quota modal** unchanged from Phase 9H (already shows recent cancellation history with classifications).
      - i18n additions: `worker.dashboard.completedModal.{noRating,legacyNote}` (with new `{shown}/{total}` placeholder for `recentTitle`), `worker.dashboard.reputationModal.{eventCompleted,eventLateCancel,eventNoShow,timelineNote}` (replacing the old empty-history copy).
    - **C. Employer rating / review visibility**:
      - `src/components/user/EmployerTrustPanel.tsx` — **new** small inline trust strip rendered on `/shifts/[id]` directly under the employer name. Shows average stars + review count + verification badge + last-review excerpt + "Xem hồ sơ →" link. Pure client component reading `useEmployerFeedbackStore` with stable selectors and a `useMemo`-derived avg/count/recent triple. Falls back to "Chưa có đánh giá" when the employer has none.
      - `src/app/shifts/[id]/page.tsx` — imports the new panel and renders it whenever the shift's employer record resolves. Existing `EmployerProfileModal` still opens via the employer-name button or the new "Xem hồ sơ →" link.
      - `src/app/employer/profile/page.tsx` — added a "Đánh giá từ người làm" `Card` section using the existing `<EmployerFeedbackList employerId={employer.id} />` so the employer sees their own incoming feedback in the same component shape workers see.
      - The existing `EmployerProfileModal` (Phase 6) and `AdminUserProfileModal` already mount `EmployerFeedbackList` — they automatically pick up the seeded feedback without modification.
      - i18n additions: `employer.trust.{noReviews,viewProfile}`, `employer.profile.workerFeedback.{title,intro}`, `common.reviews`.
    - **D. Employer dashboard pending-applicants modal** — added reputation badge (color-tinted by score band), verification chips (phone / id / student), and completed-shift count to each pending-application row. Surfacing the same trust signals workers see on the employer side keeps the symmetry. i18n: `employer.detail.pending.{repBadge,completedShifts}`.
    - **Constraints honored** — no new dependencies, no business logic changes, no new types, no new stores, mock / localStorage only. The single schema bump (3 → 4) is the smallest possible: it forces a reseed from the bundled JSON and changes nothing else. No worker / employer cancellation rule changes. Build still 15 routes, tests still 8.
    - **Files changed (Phase 9I):** `src/data/seed/users.json` (denormalized ratings + neutralised bios), `src/data/seed/shifts.json` (5 new Completed shifts), `src/data/seed/applications.json` (7 new Confirmed applications), `src/data/seed/ratings.json` (synced with users), `src/data/seed/employerFeedback.json` (new), `src/data/persistence.ts` (import new seed, `SCHEMA_VERSION` 3 → 4), `src/components/user/EmployerTrustPanel.tsx` (new), `src/app/shifts/[id]/page.tsx` (renders trust panel), `src/app/employer/profile/page.tsx` (worker-feedback card), `src/app/worker/dashboard/page.tsx` (rep timeline + enriched completed/income modals + completed-modal title with `{shown}/{total}` + legacy-note footer), `src/app/employer/dashboard/page.tsx` (pending modal trust badges), `src/i18n/vi.ts` (rep timeline keys + completed modal updates + employer trust keys + pending modal keys + `common.reviews`), `HANDOFF.md`, `VISUAL_QA.md`.

27. **Phase 9J admin reputation form guidance + admin adjustment history visibility** *(2026-05-23, Phase 9J)*. Two follow-ups against Phase 9I manual QA:
    1. The admin reputation form let admins type any number — there was no inline cue that the valid range is 0–100 and the inline error only fired after submit.
    2. When an admin adjusted a worker's score, the worker reputation modal didn't surface the adjustment as its own row — admin records lived inside `cancellationHistory` but the timeline only consumed `LateCancel` entries from that slice.
    - **A. Admin reputation form guidance** (`src/app/admin/dashboard/page.tsx`):
      - The "Điểm uy tín mới" `Input` now carries `placeholder="0–100"`, `hint="Nhập điểm từ 0 đến 100."`, and live `error` text "Điểm uy tín phải nằm trong khoảng 0–100." when the typed value drops out of range. `min={0}`, `max={100}`, `step={1}` were already in place; native browser validation pairs with the inline message. Width bumped from `w-32` → `w-40` so the placeholder doesn't clip.
      - The submit-time guard (which also fires `INVALID_SCORE` from the store) is unchanged. Reason input still required.
      - i18n additions: `admin.user.newScore.placeholder`, `admin.user.newScore.hint`. The legacy `admin.user.scoreOutOfRange` key was reworded to match the new "0–100 range" copy.
    - **B. Admin adjustment surfaced on the worker timeline** (`src/app/worker/dashboard/page.tsx`):
      - `repTimeline` derivation now parses `cancellationHistory` records prefixed with `[Admin set X → Y]` (the format `adminStore.adjustReputation` writes) and emits a distinct admin event row instead of the routine LateCancel/OnTime branch.
      - Each admin row shows: an "Admin" tinted badge, the label "Quản trị viên điều chỉnh điểm: X → Y", the admin's reason as the sublabel, the adjustment date, and the actual delta (`Y − X`) on a tone-coded badge (positive → green, negative → red, zero → amber).
      - Row chrome switches to indigo border + indigo-tinted background so admin entries don't visually mix with shift-driven events.
      - Quota modal now filters `[Admin set ...]` synthetic records out of the recent-cancellation list, so admin overrides don't pollute the worker's own cancellation log.
      - i18n additions: `worker.dashboard.reputationModal.{eventAdminAdjust,eventAdminBy,adminBadge}`.
    - **C. Admin user profile modal — adjustment history block** (`src/components/user/AdminUserProfileModal.tsx`):
      - New `<AdminAdjustmentHistoryList>` section under the Worker body. Reads the same `[Admin set X → Y] reason` records out of `cancellationHistory`, renders them sorted descending with old → new score, reason quote, and date.
      - Empty state: "Chưa có lịch sử điều chỉnh điểm bởi quản trị viên." when no adjustment exists.
      - i18n: `admin.user.adjustmentHistory.{title,empty}`.
    - **D. End-to-end consistency** — when an admin presses "Lưu" in the form: `adminStore.adjustReputation` writes the new score via `userStore.updateUser` (the user list re-sorts immediately), appends the synthetic record to `cancellationHistory`, and pushes a `ReputationAdjusted` notification to the worker. Worker dashboard, worker reputation modal, admin user profile modal, and the notification feed all reflect the change without a refresh.
    - **Constraints honored** — no new dependencies, no schema bump (still v4), no business logic changes, no new types or stores. `adminStore.adjustReputation` semantics unchanged. Mock / localStorage only.
    - **Files changed (Phase 9J):** `src/app/admin/dashboard/page.tsx` (form guidance + live error), `src/app/worker/dashboard/page.tsx` (admin row in `repTimeline` + indigo styling + quota-modal filter), `src/components/user/AdminUserProfileModal.tsx` (admin adjustment history list), `src/i18n/vi.ts` (new placeholder/hint/event/badge/section keys), `HANDOFF.md`, `VISUAL_QA.md`.

28. **Phase 9L notification deep links + contextual modal opening** *(2026-05-23, Phase 9L)*. Manual QA found that clicking a notification often landed the worker on a generic page (e.g. `/worker/profile`) instead of the actual context. Phase 9L makes notification links contextual:
    - **A. Query-param convention.** Each notification's `link` now embeds a `?modal=...` (worker / employer dashboards) or `?tab=...&filter=...` (admin dashboard) hint so the destination page can open the matching modal / tab on arrival. Format documented inline in the relevant store comments.
    - **B. New shared hook** `src/lib/useModalFromQuery.ts` — reads `searchParams.get('modal')` exactly once on mount, fires the page-supplied `onMatch(value)` callback, then `router.replace(pathname)` strips the param so refreshing or closing the modal doesn't reopen it. A `useRef` guard makes the effect idempotent across the post-replace re-render. Pages pass an `allowed` array so unknown values are silently dropped.
    - **C. Worker dashboard** (`src/app/worker/dashboard/page.tsx`) — wires the hook with `['reputation', 'quota', 'income', 'completed']`. Notifications that target one of those modals open it on arrival; users can still dismiss with ESC / overlay click and the URL stays clean.
    - **D. Employer dashboard** (`src/app/employer/dashboard/page.tsx`) — same treatment with `['posted', 'active', 'pending', 'completed', 'payments']`.
    - **E. Admin dashboard** (`src/app/admin/dashboard/page.tsx`) — adds an inline `useEffect` that reads `?tab=` + optional `?filter=` once, switches the active tab, and seeds the appropriate `usersInitialFilter` / `shiftsInitialFilter` before stripping the params. Valid tab values: `analytics | users | shifts | disputes`. Valid filter values per tab: users → `all | worker | employer | admin`; shifts → `all | active | completed | disputed`. Disputes tab takes no filter.
    - **F. Updated notification links at creation sites:**
      - `adminStore.adjustReputation` → `ReputationAdjusted` notification now links to `/worker/dashboard?modal=reputation` (was `/worker/profile`).
      - `applicationStore.approve` → `ApplicationApproved` notification now links to `/shifts/{shiftId}` so workers see the shift they were approved for (was `/worker/dashboard`).
      - `applicationStore.confirmCompletion` → `ShiftCompletedConfirmed` notification now links to `/worker/dashboard?modal=income` (was `/worker/dashboard`, opens the income detail modal showing the new payout).
      - `applicationStore.approveCancellationRequest` → `CancellationApproved` notification now links to `/worker/dashboard?modal=quota` (was `/worker/dashboard`).
      - `applicationStore.markNoShow` (worker recipient) → `NoShow` notification now links to `/worker/dashboard?modal=reputation` (was `/worker/profile`, opens the reputation timeline showing the −20 event).
      - All other notification kinds already pointed at the right place: `ApplicationReceived` → `/employer/shifts/{id}`, `CancellationRequested`/`WorkerCancelled`/`LateCancel`/`NoShow` (employer recipient) → `/employer/shifts/{id}`, `ShiftCancelled` (worker recipient) → `/worker/dashboard`, `ApplicationRejected` → `/worker/dashboard`, `EmployerFeedbackReceived` → `/employer/profile`, `CancellationRejected` → `/worker/dashboard`. Those were left untouched.
    - **G. Fallback safety.** Notifications without `link` still render as a button instead of a `<Link>` (existing `NotificationBell` behaviour), so missing or unknown `?modal=` values never break the click. The query-param hooks silently drop unknown values and clean the URL.
    - **Constraints honored** — no new dependencies, no schema bump (still v4), no business logic / store mutator-signature changes, no new types. Notification shape unchanged — we only updated the `link` field at creation time. Mock / localStorage only.
    - **Files changed (Phase 9L):** `src/lib/useModalFromQuery.ts` (new), `src/app/worker/dashboard/page.tsx` (hook wiring), `src/app/employer/dashboard/page.tsx` (hook wiring), `src/app/admin/dashboard/page.tsx` (tab + filter query reader), `src/stores/adminStore.ts` (`ReputationAdjusted` link), `src/stores/applicationStore.ts` (`ApplicationApproved`, `ShiftCompletedConfirmed`, `CancellationApproved`, worker-recipient `NoShow` links), `HANDOFF.md`, `VISUAL_QA.md`.

29. **Phase 9M dashboard notification cards become first-class clickable items** *(2026-05-23, Phase 9M)*. Phase 9L wired notification deep links via `NotificationBell` + dashboard query-param hooks, but the in-page notification side panel on `/worker/dashboard` and `/employer/dashboard` rendered notifications as plain `<p>` text. Result: clicking the "Điểm uy tín đã được cập nhật" card on the worker dashboard did nothing.
    - **A. New shared component** `src/components/layout/DashboardNotificationCard.tsx`. Used by both the worker and the employer dashboard's right-rail notification list.
    - **B. Click behavior** mirrors `NotificationBell`:
      - Always calls `onRead(notification.id)` so the unread dot disappears even when the click doesn't navigate.
      - When `notification.link` exists:
        - If the link's pathname matches the current page (`usePathname()`) **and** carries a `?modal=<value>` query the page can handle (passed in via `samePageModalAllowed`), the card calls `onSamePageModal(value)` instead of routing — opening the modal in-place without the brief query-string flicker `router.push` would otherwise produce.
        - Otherwise it falls back to `router.push(notification.link)`. Cross-route deep links pick up `?modal=` / `?tab=` automatically via the existing `useModalFromQuery` hook on the destination page.
      - When `notification.link` is unset, the card stays interactive (button still focusable) and only calls `onRead`. No router move.
    - **C. Affordance:**
      - Renders as a native `<button>` so keyboard `Enter` / `Space` activate the click. Native `focus-visible:ring-2 focus-visible:ring-orange-400` for keyboard users.
      - Hover background flips from the default unread `bg-orange-50` to a slightly stronger `bg-orange-100/60` when actionable.
      - Hover-revealed "Xem chi tiết →" affordance appears only when the card has a `link` so non-actionable rows don't suggest navigation. Affordance also reveals on `:focus-visible` for keyboard users.
      - Cursor toggles between `cursor-pointer` (actionable) and `cursor-default` (no link).
    - **D. Worker dashboard wiring** (`src/app/worker/dashboard/page.tsx`):
      - Added `markRead` selector (alongside the existing `markAllRead`).
      - Replaced the plain `<li>` rows with `<DashboardNotificationCard>`, passing `samePageModalAllowed=['reputation','quota','income','completed']` and an `onSamePageModal` that flips `statDetail`. `ReputationAdjusted`/`ShiftCompletedConfirmed`/`CancellationApproved` notifications therefore open the matching detail modal directly when clicked from the dashboard.
    - **E. Employer dashboard wiring** (`src/app/employer/dashboard/page.tsx`):
      - Same treatment with `samePageModalAllowed=['posted','active','pending','completed','payments']`. `ApplicationReceived` and the other employer notifications still route to `/employer/shifts/{id}` (cross-route) via `router.push`.
    - **F. i18n** — single new key `notification.viewDetail` ("Xem chi tiết") for the affordance label.
    - **G. Constraints honored** — no new dependencies, no schema bump (still v4), no notification business-logic changes (creation sites and `notification.link` values unchanged from Phase 9L). `NotificationBell` behavior unchanged.
    - **Files changed (Phase 9M):** `src/components/layout/DashboardNotificationCard.tsx` (new), `src/app/worker/dashboard/page.tsx` (`markRead` selector + card wiring), `src/app/employer/dashboard/page.tsx` (`markRead` selector + card wiring), `src/i18n/vi.ts` (`notification.viewDetail`), `HANDOFF.md`, `VISUAL_QA.md`.

30. **Phase 9N NotificationBell same-page deep-link fix + shared notification action** *(2026-05-23, Phase 9N)*. Manual QA found the global `NotificationBell` dropdown still failed to open the right modal when the user was already on the destination dashboard. Root cause: `NotificationBell` rendered each notification with `<Link href={notification.link}>`, so a same-page link like `/worker/dashboard?modal=reputation` triggered a router push to the same path. The page didn't remount, the `useModalFromQuery` hook (Phase 9L) had already fired its one-shot mount effect, and nothing opened. Phase 9M's `DashboardNotificationCard` used a same-page callback to side-step this, but the bell didn't share that path.
    - **A. New shared helper** `src/lib/notificationAction.ts`:
      - `handleNotificationClick(notification, ctx)` — single click handler used by both the bell and the in-page card. Always marks the notification read, then:
        - If `notification.link` is unset → done.
        - Parses the link. If its pathname matches the current `pathname` AND it carries a `?modal=...` (or `?tab=...` for admin), dispatches a window-level `cale:open-dashboard-modal` `CustomEvent` with `{ pathname, modal, tab, filter }` so the page can flip its local state without a router round-trip.
        - Otherwise calls `router.push(notification.link)`. The destination page handles the deep link via its `useModalFromQuery` hook (Phase 9L).
      - `useDashboardModalEvents(expectedPath, onMatch)` — companion subscriber. Listens on the window for the same custom event and fires `onMatch(detail)` when the event's `detail.pathname` matches the dashboard's own path. Cleans up the listener on unmount.
    - **B. NotificationBell refactor** (`src/components/layout/NotificationBell.tsx`):
      - Replaced the prior split between `<Link>` (for linked notifications) and `<button>` (for un-linked) with a single `<button>` per row.
      - Added `useRouter()` selector. Click handler now calls `handleNotificationClick(n, { markRead, router, pathname })` and closes the dropdown.
      - Removed the now-unused `next/link` import.
      - Behavior on `/worker/dashboard` clicking a `?modal=reputation` notification: helper fires the custom event → dashboard's `useDashboardModalEvents` subscriber sees it → `setStatDetail('reputation')` → reputation modal opens immediately. URL stays clean. Notification marked read. Dropdown closes.
    - **C. DashboardNotificationCard refactor** (`src/components/layout/DashboardNotificationCard.tsx`):
      - Dropped the bespoke `samePageModalAllowed` / `onSamePageModal` prop pair from Phase 9M. Card now delegates to `handleNotificationClick` for symmetry with the bell.
      - Same affordance and accessibility: native `<button>`, focus-visible orange ring, hover background, `aria-label`, hover-revealed "Xem chi tiết →" indicator only when actionable.
    - **D. Worker dashboard subscription** (`src/app/worker/dashboard/page.tsx`):
      - `useDashboardModalEvents('/worker/dashboard', detail => …)` translates `detail.modal ∈ {reputation, quota, income, completed}` into `setStatDetail(detail.modal)`. The mount-time `useModalFromQuery` hook (Phase 9L) is preserved for cross-route arrivals.
      - Updated `<DashboardNotificationCard>` instantiation — no more allow-list prop.
    - **E. Employer dashboard subscription** (`src/app/employer/dashboard/page.tsx`):
      - Same wiring. `detail.modal ∈ {posted, active, pending, completed, payments}` flips `statDetail`.
    - **F. Admin dashboard subscription** (`src/app/admin/dashboard/page.tsx`):
      - `useDashboardModalEvents('/admin/dashboard', detail => …)` honours `detail.tab ∈ {analytics, users, shifts, disputes}` and per-tab `detail.filter`. Uses the same validation logic as the mount-time `searchParams` reader so behavior is identical between cross-route deep links and same-page bell clicks.
    - **G. Same-page-vs-cross-route routing decision matrix** lives in `notificationAction.ts` — a single place to update if a future notification kind needs new handling.
    - **H. Data-consistency principle (HANDOFF Section 8 rules):** added a new bullet — "Stat metrics ↔ detail modals must derive from the same store data." The principle was implicit since Phase 9I but is now stated explicitly.
    - **Constraints honored** — no new dependencies (`window.dispatchEvent` is a browser primitive), no schema bump (still v4), no business-logic changes, no notification-creation-site changes (links unchanged from Phase 9L). `markRead` semantics unchanged.
    - **Files changed (Phase 9N):** `src/lib/notificationAction.ts` (new), `src/components/layout/NotificationBell.tsx` (uses shared helper, `<button>` rows), `src/components/layout/DashboardNotificationCard.tsx` (uses shared helper, dropped Phase 9M props), `src/app/worker/dashboard/page.tsx` (event subscription), `src/app/employer/dashboard/page.tsx` (event subscription), `src/app/admin/dashboard/page.tsx` (event subscription), `HANDOFF.md` (Section 8 principle + this entry), `VISUAL_QA.md`.

31. **Phase 9O global action feedback (toast) system** *(2026-05-23, Phase 9O)*. Until now, action results lived in scattered inline `setError(...)` strings; success was usually invisible to the actor. Phase 9O introduces a single global toast surface so every action surfaces real feedback to the user.
    - **A. Toast store** `src/stores/toastStore.ts`:
      - Slice: `toasts: ToastItem[]`. Mutators: `show(input)` returns the id; `dismiss(id)`; `clear()`.
      - `ToastTone` union: `'success' | 'error' | 'warning' | 'info'`.
      - Default durations: success 3000ms, info/warning 4000ms, error 5000ms. `duration: 0` makes a toast sticky.
      - In-memory only — never persisted to localStorage. No schema bump. Stable raw selector pattern (UI reads `toasts` directly; no per-call filtering inside selectors).
    - **B. Helper API** `src/lib/toast.ts` — typed wrappers `showSuccess(title, description?)`, `showError(title, description?, { sticky? })`, `showWarning`, `showInfo`, plus `dismissToast(id)`. Action sites import these instead of touching the store directly.
    - **C. Central error map** `src/lib/errorMap.ts` — `toastFromStoreError(code)` translates known store error codes (e.g. `REPUTATION_TOO_LOW`, `SHIFT_FULL`, `TOO_LATE_HAS_APPLICANTS`, `INVALID_SCORE`, `OVERLAPS_APPROVED_SHIFT`, `INVALID_CREDENTIALS`, `SUSPENDED`, …) into Vietnamese messages. Unknown codes fall back to `feedback.error.generic` and `console.warn` for dev visibility. Single source of truth so the same code never has two different toasts in different pages.
    - **D. Toast primitive rewrite** `src/components/ui/Toast.tsx`:
      - Title + optional description, tone-coded icon in a soft circle, accent bar, ring, close button (44 × 44 hit area).
      - `role="status"` + `aria-live="polite"` for success/info; `role="alert"` + `aria-live="assertive"` for warning/error. Keyboard-accessible close.
      - 200ms slide-in keyframe (`@keyframes toast-in`) — short-circuited under `prefers-reduced-motion: reduce` (added to the existing media-query block in `globals.css`).
    - **E. Toast host** `src/components/layout/ToastHost.tsx` — single mount point at `app/layout.tsx`. Portals into `document.body`, renders top-right on `sm+`, bottom-center on mobile. Pulls `toasts` via stable selector and subscribes to `dismiss`. Stacks multiple toasts cleanly.
    - **F. Wired action sites:**
      - **Worker:** apply (`/shifts/[id]`), cancel + cancellation request (`/shifts/[id]` + `/worker/dashboard`), check-in / check-out (`/worker/dashboard`), schedule add / update / delete (`/worker/schedule`).
      - **Employer:** create shift (`/employer/shifts/new`), simulate deposit (same), cancel shift (`/employer/shifts/[id]`), approve / reject applicant (same), mark no-show, approve / reject cancellation request, confirm completion already showed inline UI — kept that and added a toast for the success path via the existing approve flow.
      - **Admin:** suspend / reactivate, reputation adjust (out-of-range, missing reason, store error all toast), resolve dispute.
      - **Auth:** login success/failure, register success/failure, logout (NavBar + MobileNav).
    - **G. i18n** — large new block under `feedback.*` covering success titles + descriptions for every wired action and `feedback.error.*` lookup keys for the central error map. All-Vietnamese strings; no English fallback shown to end users.
    - **H. Toast vs notification distinction:**
      - Toast = ephemeral, in-memory, dismisses automatically, shown to the **actor** (the user who took the action) right after the action completes.
      - Notification = persistent, role-scoped, lives in `cale.notifications` localStorage, shown to the **affected user** in the bell, deep-linked via Phase 9L/M/N.
      - Some flows produce both (e.g. employer approves applicant: actor sees `feedback.applicant.approve.success` toast; worker recipient sees `ApplicationApproved` notification on their bell with a `/shifts/{id}` link). The two layers don't duplicate content — toasts confirm to the actor that the action happened; notifications inform the recipient.
    - **Constraints honored** — no new dependencies, no schema bump (still v4), no business-logic changes, no store mutator-signature changes. Mock / localStorage only. Pure additive surface.
    - **Files changed (Phase 9O):** `src/stores/toastStore.ts` (new), `src/lib/toast.ts` (new), `src/lib/errorMap.ts` (new), `src/components/ui/Toast.tsx` (rewritten — title + description + tone palette + reduced-motion-aware animation), `src/components/ui/index.ts` (re-exports), `src/components/layout/ToastHost.tsx` (new portal mount), `src/app/layout.tsx` (mounts `<ToastHost />`), `src/app/globals.css` (`@keyframes toast-in` + reduced-motion entry), `src/i18n/vi.ts` (large `feedback.*` block + a few `apply.error.*` keys), `src/app/shifts/[id]/page.tsx`, `src/app/worker/dashboard/page.tsx`, `src/app/worker/schedule/page.tsx`, `src/app/employer/shifts/new/page.tsx`, `src/app/employer/shifts/[id]/page.tsx`, `src/app/admin/dashboard/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/layout/NavBar.tsx`, `src/components/layout/MobileNav.tsx`, `HANDOFF.md`, `VISUAL_QA.md`.

32. **Phase 9P auth correctness, toast UX polish, admin shift detail navigation** *(2026-05-23, Phase 9P)*. Three independent QA findings, fixed together because they all touch real product correctness rather than just visuals.
    - **A. Auth correctness — critical fix** (`src/stores/authStore.ts`):
      - **Root cause.** The previous `login` accepted *any* password whenever the stored hash was `mock-hash:demo`: the check was `if (user.passwordHash !== expected && user.passwordHash !== 'mock-hash:demo')`. Since all seed users use `mock-hash:demo`, that meant any random string logged in successfully — a serious auth bug, not just a demo shortcut.
      - **New rule:** `login(email, password)`:
        1. Empty / non-string password → `INVALID_CREDENTIALS` (no auto-login).
        2. Email is normalised (trim + lowercase) before lookup.
        3. Unknown email → `INVALID_CREDENTIALS` (never `EMAIL_NOT_FOUND`, so attackers can't enumerate registered emails).
        4. Wrong password → `INVALID_CREDENTIALS`.
        5. Correct password + suspended → `SUSPENDED` (only after credentials match — suspension state is never leaked to a caller who can't authenticate).
      - Demo accounts still keep `passwordHash: "mock-hash:demo"`, so typing `demo` continues to work for them; nothing else does.
      - `register` is unchanged in behaviour but its hashed password is now actually verified on subsequent logins (because the universal-`demo` backdoor is gone).
      - **New tests** `src/__tests__/authStore.test.ts` (12 cases): correct password succeeds; case-insensitive email; wrong password rejected; `demo` rejected for non-demo accounts; `demo` accepted only for demo accounts; unknown email rejected; empty password rejected; suspended-with-correct-password returns `SUSPENDED`; suspended-with-wrong-password returns `INVALID_CREDENTIALS` (regression guard against suspension leak); register + login + wrong-password round-trip; short password rejected; duplicate email rejected.
    - **B. Toast UX polish** (`src/components/layout/ToastHost.tsx`, `src/components/ui/Toast.tsx`, `src/app/globals.css`):
      - **Position.** Desktop offset moved from `top-4` → `top-24` so toasts sit clearly below the sticky NavBar (`h-16`-ish) and never cover the logout / nav actions. Mobile stays bottom-center.
      - **Icon alignment.** Card's flex now uses `items-center` so the tone-icon badge centers vertically with the entire title + description block. Close button uses `self-start` so it stays visually anchored to the top-right corner without affecting icon alignment.
      - **Auto-dismiss progress bar.** New `.toast-progress` element rendered along the bottom of every non-sticky toast. Width animates from 100% → 0% over the toast's `duration` via `animation-duration` set inline. Tone-aware color (success → emerald, error → red, warning → amber, info → blue). Sticky toasts (`duration <= 0`) skip the bar entirely.
      - **Reduced motion.** `.toast-progress` added to the `@media (prefers-reduced-motion: reduce)` block alongside `.toast-anim` so motion-sensitive users see instant transitions.
      - All Phase 9O semantics preserved: live-region tones, stacking, close button, single global mount, error-code → message map.
    - **C. Toast tone correctness** — `handleSuspend` and `handleReactivate` in `src/app/admin/dashboard/page.tsx` already toast based on `result.ok` (Phase 9O wiring). Confirmed: success path → success toast, failure path (`CANNOT_SUSPEND_SELF`, `CANNOT_SUSPEND_LAST_ADMIN`, `USER_NOT_FOUND`) → error toast with the real reason. Same pattern for `overrideEscrow` (success/error toast added in this phase).
    - **D. Admin shift detail navigation** (`src/app/admin/dashboard/page.tsx`):
      - The Ca làm tab's `<ShiftRow>` now exposes two distinct actions:
        1. **Title is a `<Link>` to `/shifts/{id}`** with hover/focus styles (`hover:text-orange-600`, `focus-visible:ring`). Admins land on the public shift detail page, which already has a "đang xem với tư cách quản trị viên" branch and shows the full record (title, description, employer, date/time, wage, positions filled/total, status, escrow, location).
        2. **Explicit "Xem chi tiết" button** (also linking to `/shifts/{id}`), so the action is discoverable for users who don't realise the title is clickable.
        3. **"Override (khẩn cấp)" button kept**, but no longer the only way to inspect details. Each emergency action surfaces a real toast (success or `toastFromStoreError(result.error)`).
      - Row metadata expanded to show `positionsFilled / positionsTotal` alongside the existing date / deposit summary so admins get a quick health snapshot before opening the detail.
      - Existing filters (`Tất cả` / `Đang hoạt động` / `Đã hoàn thành` / `Tranh chấp`) untouched.
      - The escrow override flow now surfaces success/error feedback via the global toast system instead of failing silently.
    - **Constraints honored** — no new dependencies, no schema bump (still v4), no business-logic changes outside the auth rule, no notification-creation-site changes. Mock / localStorage only. New tests use existing Vitest setup; no new test runner.
    - **Files changed (Phase 9P):** `src/stores/authStore.ts` (login rewrite), `src/__tests__/authStore.test.ts` (new — 12 cases), `src/components/ui/Toast.tsx` (icon alignment + progress bar), `src/components/layout/ToastHost.tsx` (`sm:top-24` positioning), `src/app/globals.css` (`@keyframes toast-progress-shrink` + reduced-motion entry), `src/app/admin/dashboard/page.tsx` (Link import, ShiftRow title-as-link + "Xem chi tiết" button + positions counter + override toast feedback), `HANDOFF.md`, `VISUAL_QA.md`.

33. **Phase 9Q toast lifecycle hardening + global footer** *(2026-05-23, Phase 9Q)*. Manual QA after Phase 9P found two real product issues: clicking a failing action repeatedly (e.g. wrong-password login) stacked identical toasts, and the existing footer was a one-line stub. This phase makes both production-shape.
    - **A. Toast dedupe** (`src/stores/toastStore.ts`):
      - New `dedupeKey = ${tone}|${title}|${description}` is computed inside `show`. If a toast with the same key is already on screen, the store **bumps the existing toast's `version` field and refreshes `createdAt`** instead of pushing a duplicate. The same id is returned to the caller so any external tracking stays stable.
      - Different toasts (different tone, title, or description) still stack normally.
      - A toast that has been dismissed (`dismiss(id)` or auto-dismissed) can appear again with a fresh `version: 1`.
      - New constant `MAX_VISIBLE_TOASTS = 4`. When the queue exceeds the cap, the oldest **non-sticky** toast is evicted first; sticky toasts (`duration <= 0`) are pinned and only evicted when every slot is sticky.
    - **B. Toast lifecycle in the component** (`src/components/ui/Toast.tsx`):
      - `<Toast>` now accepts a `version` prop. The auto-dismiss `useEffect` lists `version` in its dep array, so a dedupe re-trigger cleanly clears the stale `setTimeout` and starts a new one matching the refreshed duration.
      - The progress bar element is re-keyed on `version` (`key={\`progress-${version}\`}`) so React mounts a fresh node and the `@keyframes toast-progress-shrink` animation restarts at full width — no more half-empty bars after a re-trigger.
      - A new `.toast-shake` class (added to `globals.css` via `@keyframes toast-shake`) plays a tiny ±3px horizontal pulse only when `version` changes from one value to another. Tracked with a `useRef(prevVersion)` so the initial mount doesn't shake.
      - Sticky toasts (`duration <= 0`) skip the progress bar entirely — pre-existing behavior, preserved.
    - **C. ToastHost cleanup** (`src/components/layout/ToastHost.tsx`):
      - `useEffect` cleanup now calls `useToastStore.getState().clear()` on unmount so navigating away (or hot-reloading in dev) never leaves stale `dismiss` handlers pointing at unmounted toast nodes.
      - Forwards `t.version` to each `<Toast>`.
    - **D. Reduced motion.** Both `.toast-progress` and `.toast-shake` are added to the `@media (prefers-reduced-motion: reduce)` block in `globals.css`. Reduced-motion users get instant transitions but the dedupe + auto-dismiss timer logic still runs unchanged, so functionality isn't degraded.
    - **E. Tests** (`src/__tests__/toastStore.test.ts` — 13 cases): first show creates one item; identical re-show doesn't stack; identical re-show bumps `version` and `createdAt`; different tone/title/description create separate items; dismissed toast can appear again with `version: 1`; `MAX_VISIBLE_TOASTS` cap enforced; oldest non-sticky evicted first when cap exceeded; sticky `duration: 0` preserved verbatim; per-tone defaults applied; `dismiss` removes only the matching item; `clear` removes all.
    - **F. Global footer** (`src/components/layout/Footer.tsx` rewritten):
      - Five-column responsive layout (mobile stacks; `md:` two columns; `lg:` five columns).
      - Column 1 — brand `CaLẻ / ShiftNow` (orange), publisher `CaLedo Tech`, tagline, mock contact (`support@caledo.vn`, hotline `1900 3636`, address `Hà Nội, Việt Nam`).
      - Columns 2–5 — `Về CaLedo`, `Dành cho người lao động`, `Dành cho nhà tuyển dụng`, `Pháp lý & hỗ trợ`. Each column contains four links. Routes that already exist (`/shifts`, `/worker/profile`, `/worker/schedule`, `/employer/shifts/new`, `/employer/dashboard`) link normally; the rest are rendered as `aria-disabled` placeholder text so we don't pretend they navigate anywhere.
      - Bottom row — copyright `© 2026 CaLedo Tech. All rights reserved.` plus an MVP disclaimer pill: `MVP mock data — chưa dùng cho giao dịch thật.`
      - Subtle border-top in `border-orange-100`, slightly translucent white panel so the footer separates from the warm body chrome without a hard line.
      - **Placement decision.** Footer is mounted once in `app/layout.tsx` (already wired since Phase 9). Phase 9Q makes it client-side and uses `usePathname()` to **hide on `/admin/*`** so the admin tooling UI stays compact. Worker / employer dashboards keep the footer because they're product surfaces with normal page heights.
      - No external SVG assets, no QR codes, no third-party logos.
    - **Constraints honored** — no new dependencies, no schema bump (still v4), no business-logic changes, no toast-creation-site changes (callers still use `showSuccess` / `showError` etc.), no notification changes. Mock / localStorage only.
    - **Files changed (Phase 9Q):** `src/stores/toastStore.ts` (dedupe + version + cap), `src/__tests__/toastStore.test.ts` (new — 13 cases), `src/components/ui/Toast.tsx` (version-driven timer reset, progress re-key, shake on dedupe), `src/components/layout/ToastHost.tsx` (forward version, clear on unmount), `src/app/globals.css` (`@keyframes toast-shake` + reduced-motion entry), `src/components/layout/Footer.tsx` (rewrite), `HANDOFF.md`, `VISUAL_QA.md`.

34. **Phase 9R toast lifecycle ownership + auth cleanup + real footer routes** *(2026-05-23, Phase 9R)*. Three production-quality fixes after Phase 9Q manual QA: a stuck-toast race, stale auth errors carrying over after a successful login, and footer dead links / MVP-flavoured pill.
    - **A. Toast auto-dismiss owned by the store** (`src/stores/toastStore.ts`):
      - Root cause of the "progress bar finishes but toast stays" bug was a race between the `<Toast>` component's local `setTimeout` (keyed on `version`) and Zustand state updates. The component's effect would clean up its old timer before the new one fired in the right order, occasionally leaving a stale toast on screen.
      - The fix moves timer ownership into the store. Module-scoped `Map<id, TimerHandle>` registry; `show` schedules `setTimeout` keyed on the toast id; `dismiss`, `clear`, `clearByScope` and the dedupe re-trigger all go through `clearTimer(id)` first. The component is now purely presentational — it consumes `version` only for the progress-bar `key` and the shake animation.
      - Sticky toasts (`duration <= 0`) skip the registry entirely. Cap eviction also clears the evicted toast's timer.
    - **B. Toast scopes + auth cleanup** (`src/stores/toastStore.ts`, `src/lib/toast.ts`):
      - New optional `scope: ToastScope` field on `ToastItem`. Free-form string so callers can introduce buckets like `'auth' | 'worker' | …` without changing the store.
      - New `clearByScope(scope)` mutator drops every toast in a category and cancels their timers.
      - New helper `clearToastsByScope(scope)` re-exports the store mutator for call sites.
      - `showSuccess / showError / showWarning / showInfo` accept an optional `{ scope }` (and `{ sticky }` for `showError`). Backward-compatible — call sites that don't pass options still work.
      - Login/register/logout flows now call `clearToastsByScope('auth')` before showing their success toast and pass `scope: 'auth'` to every auth-related toast. So a user who clicks "Đăng nhập" with the wrong password 5 times then succeeds sees the success toast, not the lingering error.
    - **C. Route-change cleanup** (`src/components/layout/ToastHost.tsx`):
      - `<ToastHost>` now reads `usePathname()` and tracks the previous path with a `useRef`. When the path leaves `/login` or `/register` (e.g. after a successful submit pushes the user to a dashboard), it calls `clearByScope('auth')` so any stale wrong-password toast doesn't ride along into the dashboard.
    - **D. Component cleanup** (`src/components/ui/Toast.tsx`):
      - Removed the local `useEffect` that scheduled `setTimeout(onClose, duration)`. The auto-dismiss now happens via the store. Component still uses `version` to re-key the progress bar (`<span key={\`progress-${version}\`}>`) and play the shake pulse on dedupe.
    - **E. Footer mounted everywhere with real routes** (`src/components/layout/Footer.tsx`):
      - Removed the `usePathname().startsWith('/admin')` hide. Footer is now visible on every route including `/admin/*`. The previous Phase 9Q exclusion left admins with no way to find legal/help links from the management screens. Modals never see the footer because they portal into `document.body` while the footer lives in the page tree.
      - Every footer link is now a real `<Link>` to a real route. Phase 9Q's `aria-disabled` placeholder rows are gone. Existing routes are reused where they fit (`/shifts`, `/worker/schedule`, `/employer/shifts/new`, `/employer/dashboard`); the rest are new static info pages shipped in this same phase.
      - Bottom row no longer shows the "MVP mock data — chưa dùng cho giao dịch thật" pill. Replaced with a more natural `Made with care in Hà Nội · Phiên bản dùng thử` line so the footer reads like a real product without hiding that this is a trial build.
      - Brand line, contact, copy preserved with light tightening.
    - **F. Static info pages** (12 new routes):
      - `/about`, `/how-it-works`, `/safety`, `/faq`, `/terms`, `/privacy`, `/disputes`, `/support`, `/worker/reputation-guide`, `/worker/cancellation-policy`, `/employer/payments`, `/employer/reviews`.
      - Each page uses a shared `<InfoPage>` shell with eyebrow + title + intro + sections + optional CTA row. Vietnamese copy is written naturally, not AI-filler — every page has 3–6 substantive sections with concrete rules, examples, or links.
      - All pages are pure server components. Total static route count: 15 → **27**.
    - **G. Tests** (`src/__tests__/toastStore.test.ts` extended):
      - 7 new lifecycle / scope cases on top of the Phase 9Q dedupe + cap suite. Uses `vi.useFakeTimers()` to verify exact-duration auto-dismiss, dedupe timer reset (advancing past the *original* duration after a re-trigger should NOT remove the toast), manual dismiss timer cleanup, `clear()` cancels all timers, and `clearByScope` cleanly partitions the queue.
      - **Total tests: 33 → 40** (4 files, all passing).
    - **Constraints honored** — no new dependencies (`vi.useFakeTimers` ships with Vitest), no schema bump (still v4), no business-logic changes, no notification-creation-site changes. Mock / localStorage only.
    - **Files changed (Phase 9R):** `src/stores/toastStore.ts` (store-owned timers + scope), `src/lib/toast.ts` (helper API + `clearToastsByScope`), `src/components/ui/Toast.tsx` (drop local timer), `src/components/layout/ToastHost.tsx` (route-change cleanup), `src/app/login/page.tsx` (scope + cleanup), `src/app/register/page.tsx` (scope + cleanup), `src/components/layout/NavBar.tsx` (clear on logout), `src/components/layout/MobileNav.tsx` (clear on logout), `src/components/layout/Footer.tsx` (real routes, no admin hide, no MVP pill), `src/components/layout/InfoPage.tsx` (new shared shell), 12 new info pages (`src/app/{about,how-it-works,safety,faq,terms,privacy,disputes,support,worker/reputation-guide,worker/cancellation-policy,employer/payments,employer/reviews}/page.tsx`), `src/__tests__/toastStore.test.ts` (extended), `HANDOFF.md`, `VISUAL_QA.md`.

35. **Phase 9S product-grade navigation shell** *(2026-05-23, Phase 9S)*. The Phase 9R footer matured into a real product surface but the top NavBar still read as a starter-template stub: brand on the left, three flat links in the middle, no Trang chủ entry, no grouping, lots of empty space. Phase 9S replaces both NavBar and MobileNav with a grouped, role-aware navigation that matches the breadth of the new footer.
    - **A. Public navbar** (`src/components/layout/NavBar.tsx` rewrite):
      - Brand block: `CaLẻ / ShiftNow` with a small `by CaLedo Tech` eyebrow that appears on `sm+`.
      - Center nav (visible on `lg+`): `Trang chủ` · `Tìm ca làm` · `Người lao động ▾` · `Nhà tuyển dụng ▾` · `An toàn & hướng dẫn ▾` · `Hỗ trợ`. Three dropdowns each surface four destinations with a short Vietnamese description per item:
        - **Người lao động** → `/shifts`, `/worker/reputation-guide`, `/worker/schedule`, `/worker/cancellation-policy`.
        - **Nhà tuyển dụng** → `/employer/shifts/new`, `/employer/dashboard`, `/employer/payments`, `/employer/reviews`.
        - **An toàn & hướng dẫn** → `/how-it-works`, `/safety`, `/faq`, `/disputes`.
      - Right cluster (visible on `lg+`): `Đăng nhập` · `Đăng ký` · primary CTA `Tìm ca làm ngay`. The CTA is an orange gradient button so the primary action is unambiguous.
      - On `< lg`, the desktop nav collapses; the brand + hamburger remain.
    - **B. Authenticated navbar variants** (same file):
      - **Worker:** `Trang chủ` · `Tìm ca làm` · `Tổng quan` · `Lịch cá nhân` · `Hồ sơ` · `Hỗ trợ` + bell + logout.
      - **Employer:** `Trang chủ` · `Đăng ca tuyển` · `Tổng quan` · `Lịch tuyển dụng` · `Hồ sơ doanh nghiệp` · `Hỗ trợ` + bell + logout.
      - **Admin:** `Trang chủ` · `Tổng quan admin` · `Người dùng` · `Ca làm` · `Tranh chấp` · `Hỗ trợ` + bell + logout. The Người dùng / Ca làm / Tranh chấp links use `?tab=...` deep links that the admin dashboard's existing `searchParams` reader handles natively.
    - **C. Dropdown primitive** (in-component):
      - In-house, no library. `<button aria-haspopup="menu" aria-expanded>` for the trigger, `<Link role="menuitem">` for items.
      - Closes on outside click, ESC key, route change, and after any item click.
      - Each item shows a label plus a one-line description in muted text so the menu reads like real product navigation, not a list of routes.
      - White card · soft shadow · 1px ring · `hover:bg-orange-50` on items · keyboard focus ring.
    - **D. Active-state matching:**
      - `isPathActive(pathname, target)` matches the target prefix-style so `/worker/profile/edit` keeps `Hồ sơ` lit.
      - Dropdown triggers light up when `pathname` matches **any** of `activePrefixes`; e.g. the `Người lao động` dropdown is active anywhere under `/worker/*` even when none of its visible items match exactly.
      - Query-param links (`/admin/dashboard?tab=users`) match against `pathname` only — the query is stripped before comparison.
      - `Trang chủ` uses an `exact` flag so it doesn't claim the active state on every route.
    - **E. Mobile drawer** (`src/components/layout/MobileNav.tsx` rewrite):
      - Same role-aware structure but laid out as labelled sections in a vertical drawer:
        - **Public:** Chính · Người lao động · Nhà tuyển dụng · Hướng dẫn & hỗ trợ.
        - **Worker:** Chính (5 worker links) · Hướng dẫn (4 info links).
        - **Employer:** Chính (5 employer links) · Hướng dẫn (4 info links).
        - **Admin:** Chính (5 admin links) · Hướng dẫn (2 info links).
      - Footer of the drawer carries the auth actions: logged-in users see a red `Đăng xuất` button (preserves the Phase 9R toast cleanup); guests see two stacked buttons (`Đăng nhập` ghost + `Đăng ký` orange).
      - Drawer is now `w-80 max-w-[90vw]` (was `w-72`) so the longer Vietnamese link labels fit cleanly.
    - **F. Visual style** kept consistent with the rest of the app: warm orange brand accent, white background, subtle `border-orange-100` border-bottom, no third-party logos, no QR codes, no fake search hero.
    - **G. Link consistency.** Every navbar link goes to a real route. The dropdowns reuse the exact same destinations the Phase 9R footer points at, so the two surfaces stay in sync. No `aria-disabled` placeholders.
    - **H. Notification bell + logout** preserved from the prior NavBar; bell still mounts on desktop for logged-in users, logout button kept in both desktop and mobile shells. Phase 9R toast cleanup behavior preserved (`useToastStore.getState().clear()` on logout).
    - **Constraints honored** — no new dependencies, no schema bump (still v4), no business-logic changes, no notification-creation-site changes, no homepage redesign (the optional "compact hero" suggestion in the spec was deferred since the current landing page already has a substantial hero from earlier phases). Mock / localStorage only.
    - **Files changed (Phase 9S):** `src/components/layout/NavBar.tsx` (rewrite — public/role-aware variants + dropdown primitive + active-state matching), `src/components/layout/MobileNav.tsx` (rewrite — grouped sections per role + auth footer), `HANDOFF.md`, `VISUAL_QA.md`.

36. **Phase 9T — Responsive polish, nav UX, admin cleanup, richer atmosphere** *(2026-05-23, Phase 9T)*. Phase 9S landed the grouped, role-aware navigation shell but manual QA at 360 / 390 / 430 px surfaced a handful of mobile breakages, the admin top nav still duplicated the dashboard's tab system, the new dropdowns only opened on click, and the surface still read a touch flat once the Phase 9G calm-down pass took the corner blobs away. Phase 9T tightens all of that without touching business logic, schema (still v4), or persistence — purely UI / motion polish.
    - **A. Mobile responsiveness on the homepage.** At 360 px the hero H1 (`text-4xl sm:text-5xl lg:text-6xl`) clipped + wrapped badly and the CTA pair lost its symmetry. Fixed:
      - Hero H1 dropped to `text-3xl sm:text-4xl lg:text-6xl` and gained `text-balance` so the line reads cleanly on the smallest phones without losing the desktop punch.
      - Both CTAs in the hero use `w-full sm:w-auto` so they stack as full-width pills on narrow phones and revert to natural-width buttons at `sm+`. The container is still `flex-col sm:flex-row`.
      - `<FeaturedJobMockup />` panel padding tightened from `p-6 sm:p-7 lg:p-8` to `p-4 sm:p-6 lg:p-8` — the previous outer + inner padding combination was overflowing the inner mockup chip row at 360 px.
      - No horizontal scroll on `/` at 360 / 390 / 430 / 768 px.
    - **B. Mobile drawer density.** User feedback called out "too much blank empty space" in the Phase 9S drawer. Tightened the `<ul>` `gap-4` → `gap-2` between sections and added a thin `border-t border-gray-100 pt-2` divider on every section after the first, so the grouped sections read as a denser, real navigation panel rather than four loose card blocks. No fake links added to fill space — sparseness is fixed by tightening, not padding.
    - **C. Desktop nav refinement.**
      - `navLinkClasses()` gained `whitespace-nowrap` so labels like `Hỗ trợ`, `Tổng quan admin`, and `Lịch tuyển dụng` never split into two lines at narrow desktop widths.
      - The desktop-nav breakpoint was bumped from `lg` to `xl`. The hidden / shown pairs now read `hidden ... xl:flex`, the mobile button container is `xl:hidden`, and the logout button + guest right-cluster also flip at `xl`. Below `xl` the hamburger drawer covers everything, which is the right call given six full Vietnamese labels in the public nav.
      - **CTA dedup.** The Phase 9S NavBar had both a centre `Tìm ca làm` link and a right-side `Tìm ca làm ngay` orange CTA — two competing "find a shift" buttons fighting for attention. The right-side CTA is now `Đăng ca tuyển` linking to `/register?role=employer`. The middle `Tìm ca làm` link stays for workers; the right CTA is dedicated to employers. Two clear paths, no duplicate fight.
    - **D. Dropdown hover/click behaviour.** The Phase 9S `Dropdown` primitive only opened on click, which felt slow against the desktop expectation of menu hover. Phase 9T adds:
      - `onMouseEnter` on the **container** (which already wraps both trigger and menu) opens immediately and clears any pending close timer.
      - `onMouseLeave` on the same container schedules a close via `setTimeout(..., 150)` — long enough that the cursor can travel from the trigger down to the menu items without the menu collapsing.
      - `onFocus` on the trigger button mirrors hover-open for keyboard tab navigation.
      - Click toggle, ESC, outside-click, and route-change close are all preserved unchanged.
      - The pending close timer lives in a `useRef`, is cleared on every re-entry, and is cleaned up in a `useEffect` return so it never fires after unmount.
      - The mobile drawer (`<MobileNav>`) intentionally does **not** use hover behaviour — touch surfaces stay click/collapsible.
    - **E. Admin navbar cleanup.** Phase 9S put `Người dùng`, `Ca làm`, and `Tranh chấp` into the admin top nav as `?tab=...` deep links. In manual QA those read as a half-broken second navigation primitive next to the dashboard's own tab bar, since the URL-driven tab feels different from the in-page pill tabs (which are the canonical control). Final admin top nav: `Trang chủ` · `Tổng quan admin` · `Hỗ trợ`. The same three deep-link entries were also dropped from `MobileNav`'s admin `Chính` group. Admins get to the user / shift / dispute panels via the dashboard's own tab system, which is where the data actually lives.
    - **F. Background / motion richer system.**
      - `globals.css` body chrome gained a small low-alpha bottom-right radial ellipse (`rgba(252, 211, 77, 0.14)`) on top of the existing top-left mesh + cream-to-slate linear, so tall pages have a hint of depth in both corners. Still no `background-attachment: fixed`.
      - New `.bg-grid-soft` utility — smaller (16 × 16 px) and lower-alpha (0.06) than `.bg-dot-grid` (22 × 22, 0.10). Intended for low-key paper texture on dashboard panels; left available for any surface that wants it.
      - New `@keyframes float-blob` + `.float-blob` class. Slow drift (`translate3d` + ~1.5° rotation) on a 16 s loop, with an opt-in `.float-blob-slow` modifier extending the loop to 22 s. Designed for blurred decorative gradient shapes on the homepage hero. Amplitude stays under 16 px so the motion reads as ambient warmth, never as "this page is loading".
      - Hero (`/`) gained two `.float-blob` shapes inside `<HeroBackgroundDecor />` — one orange, one amber, both blurred + low-alpha + `pointer-events-none` + `aria-hidden`. Hidden below `lg` so the small viewport stays calm and the H1 + CTAs own the screen.
      - Worker + employer dashboards each gained a small top-right radial decorative blob behind every card (`pointer-events-none`, `aria-hidden`, `-z-10` inside an `isolate` wrapper so the blob never bleeds onto adjacent layout). Dashboards no longer read as "white cards on gray".
      - All three new classes (`.float-blob`, `.bg-grid-soft`, the body radial layers, plus the hero blob shapes) are listed in `prefers-reduced-motion: reduce` — `.float-blob` is named alongside `.float-soft` in the existing `animation: none;` list, and `.bg-grid-soft` is purely static so it's a no-op for motion-sensitive users.
    - **G. Trust chips on the hero.** Three small rounded pills under the hero CTAs, each prefixed with the existing `<CheckIcon />`:
      - "Người làm không đặt cọc"
      - "Nhà tuyển dụng đặt cọc tiền công"
      - "Điểm uy tín minh bạch"
      - Container: `flex flex-wrap justify-center gap-2 lg:justify-start mt-4` so the chips wrap cleanly on narrow phones without pushing the hero too tall.
      - Each chip: `inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-orange-200`.
      - Wrapped in the same `entrance-up` cascade as the rest of the hero, with `--entrance-delay: 360ms` so they appear after the trust hint slot. The Phase 9D trust hint paragraph was replaced by the chip row — three chips communicate the safety story more concretely than a single line of muted copy.
    - **H. Cross-page responsive QA.** Walked `/`, `/login`, `/register`, `/shifts`, `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`, `/about`, `/terms` at 360 / 390 / 430 / 768 px in head: no horizontal scroll, navbar doesn't wrap, footer intact, toast doesn't cover key nav, dropdown / drawer usable. No concrete responsive bugs surfaced on those pages so no per-page edits were needed beyond the homepage fixes already in Section A.
    - **Constraints honored.** No new dependencies (Tailwind v4 in CSS only, no extra animation library). No schema bump (still v4). No business-logic changes (stores, persistence, auth flows, routing logic untouched). No `backdrop-blur` added on toast/modal backdrops. Locked light theme preserved. Mock / localStorage only — no real auth, real payment, real OTP, or real ID verification was added.
    - **Validation.** `npm run build` → exit 0, **27 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9T):** `src/components/layout/NavBar.tsx` (`whitespace-nowrap`, `xl` breakpoint, hover-open dropdown, right CTA → `Đăng ca tuyển`, admin nav simplified to three links), `src/components/layout/MobileNav.tsx` (`xl:hidden` wrapper, denser section spacing + dividers, admin Chính group cleaned up), `src/app/page.tsx` (hero H1 size + balance, full-width mobile CTAs, mockup panel padding, two float-blob shapes inside `<HeroBackgroundDecor />`, trust chip row replacing the trust hint), `src/app/globals.css` (second radial ellipse on body, `.bg-grid-soft` utility, `@keyframes float-blob` + `.float-blob` class + `.float-blob-slow` modifier, reduced-motion list extended), `src/app/worker/dashboard/page.tsx` (top-right decorative blob + `isolate` wrapper), `src/app/employer/dashboard/page.tsx` (same decorative blob), `HANDOFF.md`, `VISUAL_QA.md`.

---

## 5b. Phase 2 ✅ Completed — Safer Worker Cancellation Flow

*(Completed 2026-05-22. Earlier in this same session a "Phase 2 In Progress" section described the partial state. That state has now been finished and merged into the bug-fixes list as item #9 in section 5. The detailed reference below is preserved for the next maintainer.)*

### 1. Goal of Phase 2

- Replace one-click worker application cancellation with a safer cancellation flow.
- Worker must enter a cancellation reason.
- If shift start time is **more than 3 hours** away, allow immediate cancellation.
- If shift start time is **within 3 hours**, do not cancel immediately; create a cancellation request that employer must approve / reject.
- Employer must receive notifications when worker cancels or requests cancellation.
- Worker must receive notifications when employer approves / rejects cancellation request.
- Existing late-cancel rule (within 24h) **remains** for the reputation penalty logic (−10 points). The 3h gate is a separate gate that decides whether the cancel is immediate vs. needs approval.
- New employer-approval threshold is **within 3 hours** of shift start.

### 2. What was shipped

All items below are now in the codebase and verified by `npm run build` + `npm run test:run` (both exit 0):

- **Types** (`src/types/index.ts`):
  - New `ApplicationStatus` value `'CancellationRequested'`.
  - New `Application` fields: `cancellationRequestedAt`, `cancellationReasonNote`, `preCancellationStatus`.
  - Three new `NotificationKind` values: `'CancellationRequested'`, `'CancellationApproved'`, `'CancellationRejected'`.
- **Pure domain helper** (`src/domain/timeGates.ts`):
  - `requiresEmployerApprovalToCancel(nowIso, shift)` returns `true` when shift starts within `WORKER_CANCEL_APPROVAL_HOURS = 3`.
- **Application store** (`src/stores/applicationStore.ts`):
  - `cancelByWorker(applicationId, reason, nowIso?)` — three-branch logic:
    - `Pending` → immediate cancellation, no notification, no penalty.
    - `Approved` + **>3h** before shift → immediate cancellation, position freed, employer notified, late-cancel reputation rule (−10) applied iff within 24h.
    - `Approved` + **≤3h** before shift → status flips to `'CancellationRequested'`, position **NOT** freed, no reputation hit yet, employer notified.
    - Returns `Result<{ application, requiresApproval }, ApplicationActionError | 'REASON_REQUIRED' | 'SHIFT_NOT_FOUND'>`. (Return shape changed — every caller updated.)
  - `approveCancellationRequest(applicationId)` — finalises cancellation, frees position, applies late-cancel reputation hit if the *decision time* falls within 24h, notifies worker.
  - `rejectCancellationRequest(applicationId)` — restores `preCancellationStatus` (always `'Approved'` in practice), clears the request fields, notifies worker.
  - `'CancellationRequested'` is in `ACTIVE_STATUSES`, so it counts toward `positionsFilled` and the time-conflict detector while the request is pending.
- **UI**:
  - `src/components/forms/CancelApplicationDialog.tsx` — shows a separate "needs employer approval" notice when within 3h; submit button label flips to "Gửi yêu cầu huỷ" in that case.
  - `src/components/forms/ApplicationActions.tsx` — new `CancellationRequested` branch shows a warning badge and an info line explaining the application is awaiting the employer's decision (no actionable buttons).
  - `src/app/employer/shifts/[id]/page.tsx` — when an applicant is in `CancellationRequested`, the row shows the worker's reason in an orange callout and the action buttons are **Chấp nhận huỷ** / **Từ chối huỷ** (calls `approveCancellationRequest` / `rejectCancellationRequest`). The cancellation-request branch sits above the existing branches in `ApplicationActionButtons` so it always wins.
  - `src/app/worker/dashboard/page.tsx` — `upcoming` now includes `CancellationRequested` so the worker doesn't lose sight of a pending request.
  - Both `badgeToneForApp` (employer page) and `badgeToneFor` (worker dashboard) map `CancellationRequested` → `'warning'`.
- **i18n** (`src/i18n/vi.ts`): added `application.status.CancellationRequested`, `notification.kind.CancellationRequested`, `notification.kind.CancellationApproved`, `notification.kind.CancellationRejected`, `cancel.confirm.approvalRequired`, `cancel.confirm.requestSubmit`, `cancel.requested.awaitingDecision`, `cancel.request.employerHeading`, `cancel.request.employerHint`, `btn.approveCancellation`, `btn.rejectCancellation`.

### 3. Files changed in Phase 2

- `src/types/index.ts`
- `src/domain/timeGates.ts`
- `src/stores/applicationStore.ts`
- `src/components/forms/CancelApplicationDialog.tsx`
- `src/components/forms/ApplicationActions.tsx`
- `src/app/shifts/[id]/page.tsx`
- `src/app/worker/dashboard/page.tsx`
- `src/app/employer/shifts/[id]/page.tsx`
- `src/i18n/vi.ts`

### 4. Manual test steps

Run `npm run dev` and use the seed accounts.

**Branch A — `Pending` cancel (should be silent):**
1. Log in as a verified worker. Apply to any future-published shift to create a `Pending` application.
2. From `/shifts/[id]` (or the worker dashboard), click **Huỷ đơn ứng tuyển**.
3. Expect the modal — type a reason (e.g. "Thay đổi kế hoạch"), submit.
4. Application becomes `Người làm đã huỷ`. Employer dashboard shows **no** new notification (Pending cancels are noise by design). Worker reputation unchanged.

**Branch B — `Approved` + >3h immediate cancel:**
1. As a worker with an `Approved` application whose shift starts more than 24h from now, click cancel.
2. Modal shows the green "Bạn huỷ trước giờ bắt đầu hơn 24h…" note. Submit button label is **"Xác nhận huỷ"**.
3. After submit: application is `CancelledByWorker`, `positionsFilled` decremented, employer receives a `WorkerCancelled` notification including the worker name, shift title, and reason. Worker reputation unchanged.
4. Repeat with a shift between 3h and 24h: modal shows the red late-cancel warning, employer receives a `LateCancel` notification, worker reputation drops by 10.

**Branch C — `Approved` + ≤3h needs employer approval:**
1. As a worker with an `Approved` application whose shift starts within 3 hours, click cancel.
2. Modal shows the orange "Vì ca bắt đầu trong vòng 3 giờ…" notice. Submit button label is **"Gửi yêu cầu huỷ"**.
3. Submit. Application status flips to `Yêu cầu huỷ`. Position is **not** freed; the shift's `positionsFilled` is unchanged. Employer receives a `CancellationRequested` notification linking to `/employer/shifts/[id]`.
4. Worker dashboard still shows the shift in "Ca làm sắp tới" with the new badge. Worker has no buttons (correct).
5. **Approve path:** log in as the employer, open the manage page, see the orange callout with the worker's reason and **Chấp nhận huỷ** / **Từ chối huỷ** buttons. Click **Chấp nhận huỷ**. Application becomes `Người làm đã huỷ`, position is freed, the worker gets a `CancellationApproved` notification. If the decision happens within 24h of shift start, the worker also takes the −10 reputation hit.
6. **Reject path:** start over with another `CancellationRequested` and click **Từ chối huỷ**. Application goes back to `Đã duyệt`, position remains held, worker gets a `CancellationRejected` notification.

**Build and tests:**
- `npm run build` → exit 0.
- `npm run test:run` → exit 0.

### 5. Existing warnings still apply

- Do not rebuild from scratch.
- Do not add real payment.
- Do not add real OTP.
- Do not add real ID verification.
- Do not add production auth.
- Keep mock / localStorage only.
- Avoid unstable Zustand selectors that return new arrays / objects directly.

---

## 6. Latest QA Findings and Pending Improvements

These are the **next things to fix**. Implement them in the order listed in section 7. Do **not** combine them into one giant change — small, reviewable PRs.

### A. Admin reputation adjustment ✅ *Done 2026-05-22 — see Section 5, item 8.*

### B. Worker application cancellation ✅ *Done 2026-05-22 — see Section 5, item 9 and Section 5b.*

### C. Cancellation quota system ✅ *Done 2026-05-22 (Phase 3) — see Section 5, item 11.*

### D. Worker personal schedule feature ✅ *Done 2026-05-22 (Phase 5) — see Section 5, item 13. Implemented as one-time blocks only; recurring weekly schedules are deferred.*

### E. Employer profile modal from shift detail ✅ *Done 2026-05-22 (Phase 4) — see Section 5, item 12.*

---

## 7. Recommended Next Implementation Order

Do **NOT** implement everything in one giant change. One PR per item, build + manual test between each:

1. ~~**Fix admin reputation input** to a 0–100 final score + worker notification with old/new/reason + immediate sorting.~~ ✅ *Done 2026-05-22.*
2. ~~**Fix cancellation modal** with required reason + employer notification.~~ ✅ *Done 2026-05-22 (Phase 2).*
3. ~~**Add within-3-hours cancellation approval flow** (CancellationRequest entity + employer approve/reject UI + notifications both ways).~~ ✅ *Done 2026-05-22 (Phase 2 — implemented as new `'CancellationRequested'` `ApplicationStatus` rather than a separate entity).*
4. ~~**Add cancellation quota system** (compute from `cancellationHistory`, gate with clear message).~~ ✅ *Done 2026-05-22 (Phase 3).*
5. ~~**Add `EmployerProfileModal`** from `/shifts/[id]`.~~ ✅ *Done 2026-05-22 (Phase 4 — clickable employer name + admin user-profile modal).*
6. ~~**Add worker schedule page** (`/worker/schedule`) + extend application conflict check to include busy blocks.~~ ✅ *Done 2026-05-22 (Phase 5).*
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
- **Stat metrics ↔ detail modals must derive from the same store data.** *(Phase 9N principle)* If a dashboard tile shows `Ca đã hoàn thành: 12`, the corresponding detail modal must either render rows derived from the same query (`useApplicationStore` Confirmed apps in this case) or label any gap explicitly ("Còn X ca cũ hơn không có dữ liệu chi tiết trong bản MVP"). Do not hardcode demo records that aren't reachable from a generic selector — every worker / employer should see consistent numbers regardless of which seed user they're logged in as.

That's it. Good luck.
