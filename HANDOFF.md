# CaLẻ / ShiftNow — Project Handoff

A handoff document for the next developer (or new Kiro session) picking up this MVP. Read top to bottom before touching code. **Do not rebuild from scratch.**

---

## 1. Current Project Status

- **CaLẻ / ShiftNow** is a student MVP — a responsive web app that connects employers in Vietnam with short-term workers (students, freelancers).
- Built with **Next.js 16, TypeScript (strict), Tailwind v4, Zustand 5, localStorage / mock data**.
- **Tasks 1–16 are complete** (tracked in `.kiro/specs/cale-shiftnow/tasks.md`). Tasks 17–19 are checkpoints / optional polish, intentionally skipped.
- **Build passes:** `npx next build` → exit 0, 14 routes.
- **Mock auth only.** Passwords stored as `mock-hash:<value>`. Any password works for seed accounts (the auth store accepts `"demo"` as a fallback).
- **Simulated escrow / payment only.** No real money, no payment gateway, no OTP, no real ID verification.

---

## 2. Implemented Routes (14)

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
