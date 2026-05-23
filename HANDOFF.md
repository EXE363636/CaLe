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

That's it. Good luck.
