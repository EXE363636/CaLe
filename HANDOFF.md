# CaLẻ / Now — Project Handoff

A handoff document for the next developer (or new Kiro session) picking up this MVP. Read top to bottom before touching code. **Do not rebuild from scratch.**

---

## ⚠ MVP Limitation: localStorage scope

This MVP is **client-only**. There is no backend, no server-side database, and no real auth. All persistence happens in `window.localStorage` via `src/data/persistence.ts`. That has three immediate consequences for QA and demo work:

- **localStorage is per browser profile.** Two Chrome profiles, an Incognito window, or two different browsers each have their own copy of `cale.*` storage keys.
- **Manual QA across two profiles will NOT share data.** If you log in as an employer in profile A and a worker in profile B, the two profiles see two completely independent worlds. A shift posted in profile A simply does not exist in profile B.
- **Recommended workaround: snapshot export/import.** The admin dashboard ships a "Tiện ích nhà phát triển: snapshot dữ liệu mock" panel with two buttons — "Tải snapshot mock data" and "Nạp snapshot mock data". Export from profile A, save the resulting `cale-mock-snapshot-<isoDate>.json`, then import it in profile B. The import writes every `STORAGE_KEYS.*` slice and reloads the page so the stores re-hydrate cleanly.
- **Do not rely on cross-profile sync.** When the QA script needs both sides to see the same shift, it must export/import (or use a single browser profile and switch logins via the in-app auth flow).

Wave-3 will introduce a real server; until then, the snapshot utility is the canonical sharing path.

---

## 1. Current Project Status

- **CaLẻ / Now** is a student MVP — a responsive web app that connects employers in Vietnam with short-term workers (students, freelancers).
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

37. **Phase 9U — Mobile-first redesign + production-grade landing experience** *(2026-05-23, Phase 9U)*. Phase 9T tightened the mobile homepage and added the role-grouped drawer, but a fresh manual screenshot QA at 360 / 390 / 430 px revealed two hard bugs and a long tail of "still feels AI-coded" polish gaps:

    - The mobile homepage was **horizontally clipped** — content ran past the right edge at all three phone widths.
    - Opening the mobile drawer made the page underneath **visibly shifted / sliced in half**, because `<html>`/`<body>` had no `overflow-x: hidden` rule, no scroll lock, and the Phase 9T decorative blobs at `-right-20` / `-left-16` could spill the document wider than the viewport.
    - The hero copy + CTAs still overflowed at narrow widths (the desktop title was too long, the supporting stat cards inside `<FeaturedJobMockup />` were competing for the last few pixels of space).
    - The site still read as "designed by an AI" rather than a real product — soft motion was muted, audience cards were flat white, How-it-works lacked structure, and there was no Safety section pointing into the existing trust pages.

    Phase 9U fixes the two layout bugs at the root and rebuilds the landing page on top of a stable mobile-first surface. No business-logic changes, no schema bump (still v4), no new dependencies.

    - **A. Root-level overflow-x clamp.** `globals.css` now declares `overflow-x: hidden` and `width: 100%` on both `html` and `body`. Every descendant — including the existing Phase 9T `.float-blob` shapes, future decorative SVGs, long monospace timestamps inside the agenda view, anything else that might intrinsically push wider than the viewport — is now bounded. We pair this with `min-w-0` on `<body>` and on `<main>` in `src/app/layout.tsx` so flex children that would otherwise refuse to shrink (long Vietnamese labels, the hero mockup's chip row at 360 px) collapse instead of forcing the body wider. This single change kills the "page sliced in half" symptom on its own, and protects against any future decorative absolute element regressing the bug.
    - **B. Body scroll-lock when the drawer is open.** New `.no-scroll` utility class in `globals.css` (`overflow: hidden; touch-action: none`). `MobileNav.tsx` toggles it on `<body>` via a `useEffect` that:
      - Adds the class on `open === true`.
      - Computes the scrollbar gutter (`window.innerWidth - document.documentElement.clientWidth`) and writes it to `body.style.paddingRight` so the page doesn't visibly jump as the scrollbar disappears on Chromium / Firefox.
      - Restores both the class and the inline padding on the cleanup function — fires on close AND on unmount, so a route change mid-drawer (or a hot reload during dev) never leaves the body locked.
      - Is a no-op on the server (`typeof document === 'undefined'` guard).
      Combined with the root `overflow-x: hidden` from A, the page underneath the drawer now stays exactly where it was, with no horizontal peek-through and no vertical scroll happening behind the backdrop.
    - **C. Header overflow-x guard.** `<header>` in `NavBar.tsx` gained `overflow-x-hidden` so the sticky nav itself can never produce horizontal scroll if a future label adds an unexpected character or the hover dropdown's animation overshoots.
    - **D. Mobile-first hero copy.** Two new i18n keys (`landing.hero.title.mobile` = "Việc ngắn hạn,", `landing.hero.titleAccent.mobile` = "rõ ca – rõ tiền", `landing.hero.subtitle.mobile`) drive a Tailwind responsive swap in the H1: `<span className="sm:hidden">` for the punchier mobile headline, `<span className="hidden sm:inline">` for the desktop one. One `<h1>` so screen readers see one heading; the swap is visual only. The mobile subtitle is shorter (~80 chars) so it fits cleanly under the headline at 360 px without forcing the CTAs below the fold.
    - **E. CTA order flipped on mobile + desktop.** Primary is now "Tìm ca làm ngay" → `/shifts` (worker action — the headline talks about finding short shifts), secondary is "Đăng ca cần tuyển" → `/register?role=employer`. The two stay full-width pills below `sm` and revert to natural-width buttons at `sm+`. The desktop right-cluster's primary CTA still says "Đăng ca tuyển" so the employer side has its own balanced path; the worker primary on the hero and the employer primary in the navbar give two clear top-of-page actions.
    - **F. Trust chips fit at 360 px.** Tightened padding from `gap-1.5 px-3 text-xs` to `gap-1 px-2.5 text-[11px]` at base, with `sm:` overrides bumping back to the larger sizing at tablet+. The three chips now wrap as 2-up at 360 px without forcing a third line.
    - **G. Mobile mockup simplified.** The two supporting decorative stat cards in `<FeaturedJobMockup />` (reputation chip + sample slot) are now `hidden sm:block`. Below `sm` only the featured-shift card renders, so the hero column reads as a single clean affordance instead of three cards fighting for attention. Tablet and up still show the full three-card composition.
    - **H. Hero panel padding tightened.** Outer panel now `p-3 sm:p-6 lg:p-8` (was `p-4 sm:p-6 lg:p-8`); inner mockup grid + `min-w-0` on the column so the inner card can never exceed the panel.
    - **I. Mobile drawer visual polish.** `MobileNav.tsx` gains:
      - A subtle `bg-gradient-to-r from-orange-50 via-amber-50 to-white` strip on the drawer header (drawer no longer reads as plain white).
      - Section headings tinted with a hairline `bg-orange-50/60` strip + `text-orange-700` so the four grouped sections feel like real product nav rather than four unstyled lists.
      - A small support row above the auth footer ("Cần hỗ trợ? Liên hệ đội CaLẻ" → `/support`) with an inline life-buoy glyph. Muted styling so it never competes with logout / login / register below it.
    - **J. Homepage redesign — section by section.**
      - **Hero**: mobile-first composition (D + E + F + G + H), three-blob `<HeroBackgroundDecor />` (Phase 9T blobs + new `md:`-only third ellipse for richer mid-viewport depth on tablet).
      - **Trust strip**: 4 pills now have card-like surfaces with `shadow-sm ring-1 ring-orange-100`, gradient icon blocks (`bg-gradient-to-br from-orange-50 to-amber-50`), 11×11 icon containers, and a stronger `text-sm font-semibold` label. Wraps 1-col → 2-col → 4-col.
      - **Audience cards** (NEW visual treatment): each card now has an eyebrow ("Dành cho người làm" / "Dành cho nhà tuyển dụng"), a large gradient icon block, a body bullet list, and a full-width primary CTA. Worker side leans amber via `.audience-card-wrk`; employer side leans deep orange via `.audience-card-emp`. Both lift on hover via the existing `.motion-lift`.
      - **How-it-works** (NEW timeline feel): each step block has `.timeline-rule` — a vertical orange-gradient bar behind the column that visually connects the three numbered steps. Step circles got `ring-4 ring-orange-50` so they sit on top of the line cleanly. Section uses `.section-wave` for a soft top separator + `.bg-grid-soft` paper texture behind the panels. Both step columns reveal with `entrance-up-soft` stagger.
      - **Safety section (NEW)**: 4 mini-cards covering Verification (`/safety`), Deposit (`/employer/payments`), Reputation (`/worker/reputation-guide`), and Dispute handling (`/disputes`). Each card uses `<ShieldIcon />` / `<WalletIcon />` / `<StarIcon />` / new `<ScalesIcon />`, has a title + description + "→ cta" link, lifts on hover via `.motion-lift`, and reveals via `.entrance-up-soft` stagger. No new routes — every link points to an existing info page so the navigation has real off-ramps from the homepage.
      - **Final CTA band**: now uses the new `.cta-band` utility — a denser orange gradient, an inverted top wave (`::before` curved separator) so the section feels like a designed strip rather than a hard cut, and slightly bigger button shadows (`shadow-lg hover:shadow-xl` on the primary). The two existing decorative blobs are kept.
    - **K. Visual atmosphere additions in `globals.css`.**
      - Body chrome gained a third low-alpha radial ellipse anchored bottom-centre (`rgba(254, 215, 170, 0.18)`) so tall pages have warmth in three corners instead of two.
      - `.section-wave` utility — top-edge curved gradient strip via `::before`, no asset, used on the How-it-works section.
      - `.audience-card-emp` / `.audience-card-wrk` — subtle warm gradient header strips on the audience cards.
      - `.timeline-rule` — vertical orange-gradient bar via `::before`, used on the How-it-works step columns.
      - `.cta-band` — denser orange gradient + inverted top wave + isolation context for the final CTA.
      - New `@keyframes entrance-up-soft` + `.entrance-up-soft` class — calmer cousin of `.entrance-up` (640 ms `cubic-bezier(0.22, 1, 0.36, 1)`, same translate amplitude). Used on audience cards, how-it-works steps, and safety cards.
      - `.no-scroll` — body scroll-lock helper for the mobile drawer.
      - `prefers-reduced-motion: reduce` block extended to name `.entrance-up-soft` alongside `.entrance-up` and `.entrance-right` so motion-sensitive users see end-state immediately.
    - **L. Cross-page safety walk.** Verified the new root `overflow-x: hidden` does NOT clip required content on `/login`, `/register`, `/shifts`, `/shifts/[id]`, `/worker/dashboard` (Phase 9T isolate wrapper still bounds the decorative blob), `/employer/dashboard` (same), `/admin/dashboard` (no decorative blob — clean), `/about`, `/terms`, `/faq`, `/safety`, `/disputes`, `/support`, `/how-it-works`, `/privacy`, `/employer/payments`, `/employer/reviews`, `/worker/reputation-guide`, `/worker/cancellation-policy`. None of these pages contain absolute decoration that needs to bleed past the viewport, so the global clamp is a pure safety net for them.
    - **Constraints honored.** No new dependencies (Tailwind v4 in CSS only, Zustand 5, no extra animation library). No schema bump (still v4). No business-logic changes (stores, persistence, auth flows, routing logic untouched). No `backdrop-blur` added on toast/modal backdrops. Locked light theme preserved. Mock / localStorage only — no real auth, real payment, real OTP, or real ID verification was added. The Zustand selector rule is unchanged because no stores were touched.
    - **Validation.** `npm run build` → exit 0, **27 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9U):**
      - `src/app/globals.css` — `html, body { overflow-x: hidden; width: 100%; }`, `.no-scroll`, third body radial ellipse, `.section-wave`, `.audience-card-emp` / `.audience-card-wrk`, `.timeline-rule`, `.cta-band`, `@keyframes entrance-up-soft` + `.entrance-up-soft`, reduced-motion list extended.
      - `src/app/layout.tsx` — `min-w-0` on `<body>` and `<main>`.
      - `src/app/page.tsx` — full homepage redesign (mobile-first hero copy, simpler mobile mockup column, stronger trust strip, audience cards with gradient strips + icon blocks + CTAs, How-it-works with timeline rule, NEW Safety section linking to existing info pages, polished final CTA band, third decorative blob in `<HeroBackgroundDecor />` for `md:`-only).
      - `src/components/layout/MobileNav.tsx` — body scroll-lock effect, gradient drawer header strip, tinted section headings, support row above auth footer, new inline `<SupportGlyph />`.
      - `src/components/layout/NavBar.tsx` — `overflow-x-hidden` on the sticky `<header>`.
      - `src/components/landing/FeaturedJobMockup.tsx` — supporting stat cards now `hidden sm:block` so mobile shows only the featured shift card.
      - `src/i18n/vi.ts` — new keys `landing.hero.title.mobile`, `landing.hero.titleAccent.mobile`, `landing.hero.subtitle.mobile`, `landing.audience.worker.eyebrow`, `landing.audience.employer.eyebrow`, `landing.howItWorks.eyebrow`, `landing.safety.eyebrow`, `landing.safety.title`, `landing.safety.lead`, `landing.safety.{verify,deposit,reputation,dispute}.{title,desc,cta}`.
      - `HANDOFF.md`, `VISUAL_QA.md`.

38. **Phase 9V — Dropdown layering + hero headline diacritic fix** *(2026-05-23, Phase 9V)*. Phase 9U landed the mobile-first redesign and the root-level `overflow-x: hidden` clamp, but a fresh manual screenshot QA at desktop widths (1366 / 1440 / 1536 / 1920) and at phone widths (360 / 390 / 430) flagged two regressions that were specific to Phase 9U's defensive guards and to Tailwind's default `text-6xl` line-height:

    - **A. Desktop dropdowns appeared sliced off at the bottom of the header.** Hovering or clicking any of the three grouped triggers (Người lao động ▾ / Nhà tuyển dụng ▾ / An toàn & hướng dẫn ▾) opened a menu that was visibly clipped to the header's bottom edge. The menu items were physically rendered (DOM inspector confirmed they existed and had the correct `z-40`) but the visible area stopped at ~64 px below the top of the page.
    - **B. Hero headline overlapped on "động".** The desktop H1 ("Việc làm ngắn hạn / cho người lao động linh hoạt") rendered with the bottom dot-below diacritic of "động" colliding into the descenders of the line above it. At the same time, the long accent phrase ("cho người lao động linh hoạt") was wide enough at `text-6xl` + `tracking-tight` that it could wrap inside the hero copy column at `lg`, producing a third visual line that crashed into line 1's descenders.

    Phase 9V fixes both at the root cause. No business-logic changes, no schema bump (still v4), no new dependencies, no new Tailwind utilities in `globals.css`, no portal layer added for the dropdown.

    - **A. Root cause — header `overflow-x-hidden` clipping descendant absolutes.** Phase 9U added `overflow-x-hidden` to `<header>` in `src/components/layout/NavBar.tsx` as a "defensive" horizontal-overflow guard. Per CSS spec, when `overflow-x: hidden` is paired with default `overflow-y: visible`, browsers promote `overflow-y` to implicit `auto` to keep the box consistent. That converts the ~64 px sticky `<header>` into a clipping context for every descendant, including the dropdown `<div role="menu">` which uses `absolute left-0 top-full mt-2 w-72` and extends ~280–320 px DOWNWARD into the page below the header. The actual horizontal-overflow safety net was already at the document root (`html, body { overflow-x: hidden; width: 100% }` in `globals.css`, also Phase 9U) — the header's `overflow-x-hidden` was redundant.
    - **A. Fix — surgical removal of the redundant guard.** Removed `overflow-x-hidden` from the `<header>` className in `NavBar.tsx`. Kept everything else (`sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur-sm`). Added a multi-line comment above the `<header>` explaining exactly why `overflow-x-hidden` must NOT come back — pointing to the root-level clamp in `globals.css` as the safety net and the dropdown clipping symptom that returns when the header has its own clip. Z-index map was untouched: header `z-30`, dropdown menu `z-40` (already correct, sits above the header background once the clipping context is gone).
    - **B. Root cause — Tailwind `text-6xl` line-height-1 is too tight for Vietnamese diacritics.** Tailwind v4's `text-6xl` ships with `font-size: 3.75rem; line-height: 1`. `line-height: 1` leaves zero vertical room for combining diacritics — Vietnamese stacks tone marks both above and below the base character (e.g. "động" has a circumflex above and a dot below "ô"), and at `font-extrabold tracking-tight` the marks of consecutive lines collide. The long accent phrase ("cho người lao động linh hoạt") also wrapped unpredictably inside the `lg:grid-cols-2` copy column at `lg`.
    - **B. Fix — three-part typography guard on the H1.** In `src/app/page.tsx`:
      1. Added `leading-tight` (Tailwind = `line-height: 1.25`) to give multi-line Vietnamese text enough vertical room for combining diacritics.
      2. Reduced desktop max size from `lg:text-6xl` to `lg:text-5xl` (`3rem` / 48px) so the long accent phrase fits without wrapping inside the copy column. Still a strong hero headline; just safer for Vietnamese typography.
      3. Added `lg:max-w-xl` so the H1 sits inside a predictable max width and can never visually creep toward the mockup column on wide desktop.
      Kept `text-balance`, `tracking-tight`, and the Phase 9U mobile-only `<span className="sm:hidden">` / `<span className="hidden sm:inline">` swap. Final desktop H1 className: `entrance-up mt-4 text-3xl font-extrabold tracking-tight leading-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl lg:max-w-xl`. Added a multi-line comment above the H1 documenting the three guards so future phases don't drop them.
    - **Z-index map (preserved, do not change).**
      - page content = no `z-`,
      - header = `z-30`,
      - dropdown menu = `z-40`,
      - mobile drawer backdrop = `z-40`,
      - mobile drawer = `z-50`,
      - modal = `z-[100]`,
      - toast = `z-[110]`.
    - **Cross-page sanity walk.** With the header's `overflow-x-hidden` removed, the root-level `html, body { overflow-x: hidden }` clamp is the sole horizontal-overflow safety net. Walked `/`, `/login`, `/register`, `/shifts`, `/shifts/[id]`, `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard` — none of these pages have a descendant absolute element that was relying on the header's clip, so the global clamp continues to keep horizontal scroll absent. If a future phase introduces an absolute element that bleeds past the viewport, fix it at the source rather than restoring the header clip (the dropdown clipping symptom returns the moment the header gets its own `overflow-x: hidden`).
    - **Constraints honored.** No new dependencies, no schema bump (still v4), no new utilities in `globals.css`, no business-logic changes, no portal layer for the dropdown, no z-index changes, no `backdrop-blur` on toast/modal backdrops, locked light theme preserved, mock / localStorage only. Phase 9T dropdown contract preserved (hover-open with 150 ms close delay, click-toggle, ESC-close, outside-click-close, route-change-close all untouched).
    - **Validation.** `npm run build` → exit 0, **27 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9V):**
      - `src/components/layout/NavBar.tsx` — removed `overflow-x-hidden` from `<header>`; added forbidding-comment explaining why it must not return.
      - `src/app/page.tsx` — H1 now `entrance-up mt-4 text-3xl font-extrabold tracking-tight leading-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl lg:max-w-xl`; multi-line comment documents the diacritic + max-width guards.
      - `HANDOFF.md`, `VISUAL_QA.md`.

39. **Phase 9W — Dropdown single-open coordinator + mobile drawer full-screen** *(2026-05-23, Phase 9W)*. Phase 9V's surgical fixes unblocked the desktop dropdown clipping and the hero diacritic collision, but a fresh manual screenshot QA pass at desktop widths (1366 / 1440 / 1536 / 1920) and at phone widths (360 / 390 / 430) flagged two follow-up issues that Phase 9V did not cover:

    - **A. Two desktop dropdowns can be visible at once on a fast cursor sweep.** Hovering "Người lao động ▾" and then quickly moving the cursor onto "Nhà tuyển dụng ▾" produced a brief window where BOTH menus rendered, overlapping. Each `<Dropdown>` owned its own local `open` boolean and its own `closeTimerRef`. The first dropdown's 150 ms close timer was still pending while the second dropdown's `setOpen(true)` ran, so two menus co-existed for up to 150 ms. The bug was structural — there was no shared coordinator that ensured at most one dropdown was open at any time.
    - **B. Mobile drawer was a 320 px right-side panel; the hero showed through on the left ~10% of the viewport.** `MobileNav.tsx` declared the drawer as `fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw]`. At 360 / 390 / 430 px, 320 px is ~74–89% of viewport width, leaving ~10% on the left where the dim `bg-black/30` backdrop revealed the hero copy underneath. Combined with the user reading "drawer slid in from the right" as "page got cut off", this read as broken on mobile.

    Phase 9W fixes both at the root cause. No business-logic changes, no schema bump (still v4), no new dependencies, no new Tailwind utilities in `globals.css`, no portal layer added for the dropdown, no z-index changes, no `backdrop-blur` on toast/modal backdrops, locked light theme preserved, mock / localStorage only.

    - **A. Root cause — per-dropdown local state + per-dropdown close timer = race condition.** Each `<Dropdown>` ran its own `useState('open')` and its own `useRef('closeTimerRef')`, with no awareness of the other two dropdowns. Mouse leaves trigger A → A schedules a 150 ms close. Within those 150 ms, mouse enters trigger B → B sets `open=true` while A's `open=true` still holds. Both menus render. The Phase 9T 150 ms hover-grace timer was the right idea for travel from the trigger down into the menu, but the timer needed to be shared across all dropdowns so opening any dropdown could cancel any pending close on every other dropdown.
    - **A. Fix — single-source-of-truth `activeDropdown` state, lifted to `NavBar`.** The `<NavBar>` parent now owns:
      1. `const [activeDropdown, setActiveDropdown] = useState<DropdownId | null>(null)` where `DropdownId = 'worker' | 'employer' | 'safety'`. Setting a new id implicitly closes the previously-open dropdown because each `<Dropdown>` reads `isOpen={activeDropdown === id}` — two menus can never co-exist by construction.
      2. `const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` — ONE shared close timer ref. Opening any dropdown calls `cancelClose()` first, and `scheduleCloseDropdown(id)` cancels any pending timer before queuing a new 150 ms close, so timers never accumulate.
      3. The document-level outside-click and ESC handlers, plus the route-change auto-close `useEffect([pathname])`. These were duplicated per-dropdown in Phase 9T (one set of listeners per `<Dropdown>` mount, three sets total at any moment). Phase 9W replaces them with one set of handlers in the parent.
      4. A `containersRef = useRef<Map<DropdownId, HTMLElement>>(new Map())` plus a `registerContainer(id, node)` callback. Each `<Dropdown>` registers its container ref via that callback in a `useEffect`. The parent's outside-click listener walks every registered container and only closes if the click landed in none of them.
    - **A. Refactor — `<Dropdown>` is now controlled and layout-only.** The child no longer owns state, timers, or document listeners. Its props are `{ id, group, pathname, isOpen, registerContainer, onOpen, onClose, onToggle, onItemClick }`. Hover/focus/click translate directly to parent calls:
      - `onMouseEnter` on the container → `onOpen(id)`,
      - `onMouseLeave` on the container → `onClose(id)` (parent runs the 150 ms scheduled close),
      - trigger `onClick` → `onToggle(id)` (immediate toggle, no timer),
      - trigger `onFocus` → `onOpen(id)` (mirror hover for keyboard tab),
      - item `<Link onClick>` → `onItemClick()` which the parent maps to `cancelClose() + setActiveDropdown(null)`.
    - **A. Dropdown control contract.**

      | Owner   | Owns                                                                                       |
      | ------- | ------------------------------------------------------------------------------------------ |
      | NavBar  | `activeDropdown` state, shared `closeTimerRef`, ESC handler, outside-click handler, route-change `useEffect`, `cancelClose` / `openDropdown` / `scheduleCloseDropdown` / `toggleDropdown` / `closeNow`, container registry |
      | Dropdown | trigger button + menu markup, `containerRef` (registered with parent), hover/focus/click triggers that call into parent handlers, no local `useState`, no local `useRef` for timers, no document listeners |

    - **B. Root cause — narrow right-side panel leaves dim-backdrop strip on the left.** `fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw]` is a 320 px panel pinned to the right. At 360 / 390 / 430 px viewport widths, 320 px is ~74–89% of viewport width, so the dim `bg-black/30` backdrop covered the remaining ~10% on the left and the hero copy underneath was visible through it. On a fresh screenshot this read as "the page got sliced in half".
    - **B. Fix — full-screen on mobile, panel on tablet+.** Drawer wrapper className changed from `fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-white shadow-xl flex flex-col transition-transform duration-200` to `fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw] z-50 bg-white shadow-xl flex flex-col transition-transform duration-200`. Effects:
      - At `< sm` (covers 360 / 390 / 430 px): the drawer occupies the entire viewport via `inset-0` with no width constraint. The opaque `bg-white` surface fully covers the hero behind it, eliminating the "hero peeks through on the left" symptom at the layout level.
      - At `sm+`: reverts to the right-side panel via `sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw]`. `sm:left-auto` cancels the `inset-0` left edge from the mobile branch and the explicit `sm:w-96` (was `w-80`) gives a slightly wider panel on tablet+ where the drawer doesn't cover the full screen anyway.
      - The `translate-x-full` → `translate-x-0` slide-in transition works for both modes — at `< sm` it reads as a full-screen slide from the right, at `sm+` it reads as a right-side panel sliding over the dim backdrop.
      - The dim backdrop (`fixed inset-0 z-40 bg-black/30`) was kept always-rendered; at `< sm` it's invisible because the drawer fully covers it (harmless, simpler than gating it with `hidden sm:block`).
      - Drawer header, `<nav>` internal scroll (`flex-1 overflow-y-auto`), close-button 44 × 44 tap target, ESC / route-change / link-click / close-button close paths, and the Phase 9U body scroll-lock (`useEffect([open])` toggling `body.no-scroll` + scrollbar gutter compensation) are ALL preserved unchanged. The hamburger button stays visible above the drawer at `< xl` via the existing `xl:hidden` wrapper.
    - **Z-index map (preserved, do not change).**
      - page content = no `z-`,
      - header = `z-30`,
      - dropdown menu = `z-40`,
      - mobile drawer backdrop = `z-40`,
      - mobile drawer = `z-50`,
      - modal = `z-[100]`,
      - toast = `z-[110]`.
    - **Cross-page sanity walk.** Mentally walked `/`, `/login`, `/register`, `/shifts`, `/shifts/[id]`, `/worker/dashboard`, `/employer/dashboard`, `/admin/dashboard`, info pages — none of these depend on per-dropdown state or the drawer's exact width. The dropdown coordinator only mounts in the public-guest nav (`<PublicNav>`); worker / employer / admin top navs are flat `NavLink` lists and are unaffected. The drawer width swap is purely a Tailwind className change and reaches every route through the shared `<MobileNav>` mounted in `<NavBar>`.
    - **Constraints honored.** No new dependencies, no schema bump (still v4), no new utilities in `globals.css`, no business-logic changes, no portal layer for the dropdown, no z-index changes, no `backdrop-blur` on toast/modal backdrops, locked light theme preserved, mock / localStorage only. Phase 9V `<header>` (no `overflow-x-hidden`) preserved — the dropdown menu still escapes the header's bottom edge as designed. Phase 9U body scroll-lock + scrollbar gutter compensation preserved exactly. Footer, toast, notification bell, and auth flow untouched.
    - **Validation.** `npm run build` → exit 0, **27 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged). **NEEDS MANUAL VISUAL QA** — code-level fixes only; the actual "fast cursor sweep across all three triggers shows at most one menu" and "drawer at 360 px shows zero hero behind" checks must be re-screenshot by a human at the listed viewports (360 / 390 / 430 / 768 / 1366 / 1440 / 1536 / 1920 px).
    - **Files changed (Phase 9W):**
      - `src/components/layout/NavBar.tsx` — lifted dropdown state to the parent (`activeDropdown`, `closeTimerRef`, `cancelClose` / `openDropdown` / `scheduleCloseDropdown` / `toggleDropdown` / `closeNow`, container registry, ESC + outside-click + route-change `useEffect` blocks); refactored `Dropdown` into a controlled, layout-only component with new `id`, `isOpen`, `registerContainer`, `onOpen`, `onClose`, `onToggle`, `onItemClick` props; introduced `DropdownId` union; updated `PublicNav` to thread the coordinator props through to all three `<Dropdown>` instances.
      - `src/components/layout/MobileNav.tsx` — drawer wrapper className changed to `fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw] z-50 bg-white shadow-xl flex flex-col transition-transform duration-200`; comment block above the drawer documents the layout swap by breakpoint.
      - `HANDOFF.md`, `VISUAL_QA.md`.

40. **Phase 9X — Mobile drawer portal fix + authenticated user menu + canonical z-index map** *(2026-05-23, Phase 9X)*. Phase 9W made the mobile drawer full-screen at `< sm`, but a fresh manual screenshot QA at 360 / 390 / 430 px revealed the drawer was STILL clipped to roughly the height of the navbar — the hero copy still peeked through everywhere below the navbar. Phase 9X fixes the real root cause, adds the long-missing authenticated user menu for the desktop nav, and locks down the overlay coordination contract.

    No business-logic changes, no schema bump (still v4), no new dependencies, no new utilities in `globals.css`, no `backdrop-blur` on toast/modal backdrops, locked light theme preserved, mock / localStorage only. Footer, toast, notification bell, and auth flow untouched. Phase 9V `<header>` rule (no `overflow-x-hidden`) and Phase 9W dropdown coordinator state model preserved exactly.

    - **A. Root cause — `backdrop-filter` on `<header>` traps `position: fixed` descendants.** `<header>` in `NavBar.tsx` carries `backdrop-blur-sm`, which compiles to `backdrop-filter: blur(...)`. Per [CSS spec](https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block), an element with a non-`none` `backdrop-filter` (along with `transform`, `filter`, `perspective`, `will-change`) becomes a containing block for ALL descendants, INCLUDING `position: fixed` descendants. `<MobileNav>` was rendered inline inside `<header>`, so the drawer's `fixed inset-0` resolved relative to the header's box (~64 px tall) rather than the viewport. The drawer's full-screen mode therefore covered only the navbar strip; the hero peeked through everywhere below it. The Phase 9W `inset-0` swap was correct in className terms, but the parent's containing-block context defeated it.
    - **A. Fix — portal the drawer + backdrop into `document.body`.** Same approach Phase 9H took for `<Modal>`. `MobileNav.tsx` now imports `createPortal` from `react-dom`, guards with a `mounted` state set in `useEffect(() => setMounted(true), [])` (SSR safety, matching the `Modal` pattern), and splits its render into:
      1. The hamburger trigger button — stays inline inside `<header>` so it sits in the navbar's flex layout and remains tabbable as part of the nav.
      2. The drawer + backdrop overlay — wrapped in `createPortal(overlay, document.body)` so they escape the header's containing block entirely. Once portaled, `fixed inset-0` resolves against the viewport as the spec dictates, and the drawer covers the entire screen at `< sm`.
    - **A. Drawer styling + z-index bumps.** Drawer panel: `fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-w-[90vw] z-[80] bg-white shadow-xl flex flex-col transition-transform duration-200 translate-x-full data-[open=true]:translate-x-0` (the `data-[open=true]` is conceptual; we use a `translate-x-0` class swap on `open`). Backdrop: `fixed inset-0 z-[70] bg-black/30 transition-opacity duration-200`. Bumped from `z-40 / z-50` so the drawer always sits above the navbar (z-30), the nav guest dropdowns (z-40), the user menu (z-40), and the notification bell panel (z-50), while still staying below the modal overlay (z-[100]) and toast host (z-[110]). The `bg-white` confirmation makes the drawer always-opaque — never transparent.
    - **A. Phase 9U body scroll-lock preserved exactly.** The `useEffect([open])` that toggles `body.no-scroll` + writes a scrollbar gutter into `padding-right` is unchanged, still gated by `typeof document === 'undefined'`. ESC, route-change auto-close, link-click auto-close, and close-button paths are all preserved.

    - **B. New `UserMenu` component for the desktop authenticated nav.** Replaces the raw `<button onClick={handleLogout}>...Đăng xuất</button>` block (the `hidden xl:flex min-h-[40px]…` one) for `isLoggedIn` users at `xl+`. Lives in `src/components/layout/UserMenu.tsx`. Composition:
      - **Trigger button**: `<UserAvatar size="sm" name={...} avatarUrl={...} />` + name (truncated `max-w-[10rem]`, `xl:inline-flex`) + role label (`xl:inline-flex`) + chevron `▾`. `min-h-[40px]`, `aria-haspopup="menu"`, `aria-expanded`, `aria-label={t('nav.userMenu.openLabel')}`. Below `xl` the trigger never renders because the mobile drawer covers the entire navbar surface anyway.
      - **Dropdown panel**: `absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5`. Same z-index as the nav guest dropdowns; safe because the two never co-exist (different auth states — `<PublicNav>` only renders for guests, `<UserMenu>` only renders for logged-in users).
      - **User summary card** at the top: `<UserAvatar size="md">` + name + role + email + a trust chip (`Điểm uy tín: X/100` for workers — green ≥80, amber 50–79, neutral <50; `Doanh nghiệp đã xác minh` or `Cá nhân / Freelance` for employers; `Quản trị viên` for admins). Background is the warm gradient strip `bg-gradient-to-r from-orange-50 via-amber-50 to-white`.
      - **Section dividers**: thin `border-t border-gray-100` between the summary card and the link list, between the link list and the logout button.
      - **Role-aware shortcut list** (link click closes the menu immediately):

        | Role     | Items                                                                                                                                                                                                                             |
        | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
        | worker   | Tổng quan → `/worker/dashboard`; Hồ sơ cá nhân → `/worker/profile`; Lịch cá nhân → `/worker/schedule`; Việc đã ứng tuyển → `/worker/dashboard`; Điểm uy tín → `/worker/dashboard?modal=reputation`; Hỗ trợ → `/support`           |
        | employer | Tổng quan nhà tuyển dụng → `/employer/dashboard`; Đăng ca tuyển → `/employer/shifts/new`; Lịch tuyển dụng → `/employer/schedule`; Hồ sơ doanh nghiệp → `/employer/profile`; Quản lý ứng viên → `/employer/dashboard?modal=pending`; Thanh toán & đặt cọc → `/employer/payments`; Hỗ trợ → `/support` |
        | admin    | Tổng quan admin → `/admin/dashboard`; Người dùng → `/admin/dashboard?tab=users`; Ca làm → `/admin/dashboard?tab=shifts`; Tranh chấp → `/admin/dashboard?tab=disputes`; Hỗ trợ → `/support`                                          |

      - **Đăng xuất** button at the bottom: full-width, red text on `hover:bg-red-50`, calls `logout(); useToastStore.getState().clear(); showSuccess(t('feedback.auth.logout.success'), undefined, { scope: 'auth' }); router.push('/login')` — the exact Phase 9R logout sequence, now owned by `UserMenu` instead of `NavBar`.
    - **B. Behavior contract (mirrors Phase 9T/9W nav dropdown).** Hover-open + 150 ms close grace timer; click-toggle on the trigger; `onFocus` opens for keyboard tab; ESC closes; outside click closes; route change closes; link click closes immediately. `<UserMenu>` owns its own state + timer ref + listeners — it is NOT registered with the NavBar dropdown coordinator because it never co-exists with the nav guest dropdowns (different auth states).
    - **B. Modal deep links.** "Điểm uy tín" → `/worker/dashboard?modal=reputation` and "Quản lý ứng viên" → `/employer/dashboard?modal=pending` ride on the existing `useModalFromQuery` hook already wired into both dashboards (Phase 9L). The hook reads the param exactly once on mount, opens the matching modal, and strips the query so refreshing or closing the modal doesn't re-open it. No new state plumbing required.

    - **C. Mobile authenticated drawer — user summary card at top.** When `isLoggedIn`, `MobileNav` now renders a `<UserSummaryCard user={...} />` above the existing grouped nav sections inside the drawer body. Composition: `<UserAvatar size="lg" />` + name + role + email + trust chip on the same warm gradient strip used by the desktop user menu (`bg-gradient-to-r from-orange-50 via-amber-50 to-white`) + `border-orange-100` ring + `shadow-sm`. The grouped sections below stay as-is (Phase 9T/9U structure). The auth footer at the bottom keeps the red Đăng xuất button for logged-in users (Phase 9R cleanup behavior preserved). For guests, the drawer header stays as before (just the brand block — no user summary) and the auth footer keeps Đăng nhập / Đăng ký buttons.
    - **C. NotificationBell stays in the navbar header.** The bell already renders in the right cluster at `< xl` for logged-in users via the existing `{isLoggedIn && <NotificationBell />}` line in `NavBar.tsx`. There is no separate "Thông báo" link inside the drawer — the bell is already reachable via the navbar at every viewport.

    - **D. Product UI polish (light touch).** `<header>` className gained `shadow-sm` alongside `border-b border-orange-100 bg-white/95 backdrop-blur-sm` so the sticky nav visibly lifts off the page; the underline border still defines the bottom edge. User-menu items use `hover:bg-orange-50 hover:text-orange-700` to match the nav guest dropdown items. Section dividers in the user menu are thin `border-t border-gray-100` strips. No touches to homepage hero, audience cards, How-it-works, Safety section, dashboards — Phase 9U landed those, Phase 9X leaves them alone.

    - **E. Canonical z-index map (Phase 9X).**

      | Layer                             | z-index    |
      | --------------------------------- | ---------- |
      | page content                      | (none)     |
      | `<header>` sticky nav             | `z-30`     |
      | Desktop nav dropdown menu (guest) | `z-40`     |
      | Notification bell dropdown panel  | `z-50`     |
      | User menu dropdown panel          | `z-40`     |
      | Mobile drawer backdrop            | `z-[70]`   |
      | Mobile drawer panel               | `z-[80]`   |
      | Modal overlay                     | `z-[100]`  |
      | Toast host                        | `z-[110]`  |

      The notification bell at `z-50` is unchanged from the Phase 9H baseline. The user menu sits at `z-40` next to the nav guest dropdowns — they never co-exist on the same page so the equal z-index is fine. The mobile drawer backdrop moved from `z-40` to `z-[70]` and the drawer panel moved from `z-50` to `z-[80]` so opening the drawer always paints OVER any open user menu / notification bell / nav dropdown.

    - **E. Coordination rules.**
      - **Nav guest dropdowns (Người lao động / Nhà tuyển dụng / An toàn & hướng dẫn)**: managed by NavBar's `activeDropdown` coordinator (Phase 9W). Only one open at a time. Single shared 150 ms close timer.
      - **User menu**: independent, single-instance, not co-mountable with nav guest dropdowns (different auth states). Owns its own state + timer + listeners.
      - **Notification bell**: independent, can co-exist with `<UserMenu>` (both are right-cluster on auth nav). Opening one does NOT close the other — they're side-by-side affordances. Both close on ESC / route change / their own outside-click — natural behavior.
      - **Mobile drawer**: portal-mounted to `document.body`, sits above all in-page content. Body is scroll-locked while open. Opens only at `< xl`, where the bell + user menu collapse into the drawer body so co-existence with them is structurally impossible.

    - **Validation.** `npm run build` → exit 0, **27 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged). **NEEDS MANUAL VISUAL QA** — code-level fixes only; the actual "drawer at 360 px shows zero hero behind", "user menu opens cleanly at 1366 px", "mobile authenticated menu shows user summary card at top" checks must be re-screenshot by a human at the listed viewports (360 / 390 / 430 / 768 / 1366 / 1440 px).

    - **Files changed (Phase 9X):**
      - `src/components/layout/UserMenu.tsx` — NEW. Authenticated avatar dropdown for the desktop nav. Owns trigger + panel + state + timer + listeners + the Phase 9R logout sequence.
      - `src/components/layout/MobileNav.tsx` — portal the drawer + backdrop into `document.body` via `createPortal` (with a `mounted` SSR guard); bumped backdrop z-index `z-40 → z-[70]` and drawer z-index `z-50 → z-[80]`; added a `<UserSummaryCard>` rendered above the grouped sections for logged-in users; preserved the Phase 9U body scroll-lock effect exactly; preserved ESC / route-change / link-click / close-button paths.
      - `src/components/layout/NavBar.tsx` — replaced the raw `<button onClick={handleLogout}>...Đăng xuất</button>` block with `<UserMenu />` for `isLoggedIn` users at `xl+`; removed the now-unused `handleLogout` / `useRouter` / `useAuthStore.logout` / `showSuccess` / `useToastStore` imports; kept `<NotificationBell />` as a sibling of `<UserMenu />` in the right cluster; added `shadow-sm` to the `<header>` className alongside the existing `border-b border-orange-100 bg-white/95 backdrop-blur-sm`.
      - `src/i18n/vi.ts` — new keys: `nav.userMenu.openLabel`, `nav.userMenu.closeLabel`, `nav.userMenu.account`, `nav.userMenu.shortcuts`, `nav.userMenu.support`, `nav.userMenu.worker.{dashboard,profile,schedule,applications,reputation}`, `nav.userMenu.employer.{dashboard,postShift,schedule,profile,pending,payments}`, `nav.userMenu.admin.{dashboard,users,shifts,disputes}`, `nav.userMenu.chip.{reputation,verifiedBusiness,individualEmployer,admin}`.
      - `HANDOFF.md`, `VISUAL_QA.md`.

41. **Phase 9Y — Detailed user guidance + contextual help** *(2026-05-23, Phase 9Y)*. Phases 9F → 9X built out the navigation shell, dashboards, and per-surface help modals, but a fresh content-quality QA flagged that the help text was thin (4 flat bullets per surface, no grouping, no cross-link) and that there was no public, long-form walk-through for first-time visitors. Phase 9Y closes that gap with six pieces:

    - **A. New public route `/user-guide`.** Server component at `src/app/user-guide/page.tsx`, rendered through the existing `<InfoPage>` shell (`eyebrow="Hướng dẫn sử dụng"`, title "Cách dùng CaLẻ / ShiftNow", substantial intro, primary CTAs `Tìm ca làm ngay` → `/shifts` and `Đăng ca tuyển` → `/register?role=employer`). Body composition:
      - **Hero summary** — two short paragraphs explaining what CaLẻ / ShiftNow is and that the MVP is mock-only.
      - **Two role columns at `md:grid-cols-2`** (stacks on mobile). Each column is a `<RoleColumn>` (inline server-component helper scoped to this file) carrying nine `<StepCard>` entries for that audience. Step cards use the homepage `<StepNumber>` glyph (orange-gradient circle) so the surfaces feel like one product.
      - **Worker timeline (9 steps)**: register account → complete profile → verify (mock phone/ID/student) → find shifts at `/shifts` → apply (lists every gate: phone-verified, reputation ≥ 50, no time conflict, no schedule conflict, not full, not already applied) → wait for approval / read rejection reason → check-in / check-out from `/worker/dashboard` → receive payment (mock) → track reputation (`+5 / −20 / −10`, threshold 50).
      - **Employer timeline (9 steps)**: register account → choose Cá nhân vs Doanh nghiệp → complete profile → post shift at `/employer/shifts/new` → simulate deposit per trust tier (low 100% / medium 70% / high 50%) → receive applications → approve / reject with required reason → track shift through Đang diễn ra / Chờ xác nhận → confirm completion (boost-credit on no-show) → rate the worker (1–5 stars + comment, two-way).
      - **FAQ accordion** — five entries built on native `<details>` / `<summary>` (no JS, server-rendered, custom chevron via `group-open:rotate-180`): worker-deposit guarantee, cancellation rules (3h gate / 24h penalty), employer trust-tier deposit math, MVP simulation disclaimer, dispute resolution pointer to `/disputes`.
      - **Step content** matches the actual product flows referenced from `HANDOFF.md` Sections 4 and 5 — not generic AI filler.
    - **B. Wired `/user-guide` into navigation.**
      - **NavBar `SAFETY_GROUP`** in `src/components/layout/NavBar.tsx` — appended a 5th item (`Hướng dẫn sử dụng → /user-guide`, with description "Hướng dẫn từng bước cho cả hai phía"); added `/user-guide` to `activePrefixes` so the `An toàn & hướng dẫn ▾` trigger lights up when the route is active.
      - **MobileNav** in `src/components/layout/MobileNav.tsx` — added the link to all three drawer trees: `PUBLIC_SECTIONS` `Hướng dẫn & hỗ trợ` (5th entry), `WORKER_SECTIONS` `Hướng dẫn`, `EMPLOYER_SECTIONS` `Hướng dẫn`. Admin sections deliberately skipped — admins don't need the user guide.
      - **Footer** in `src/components/layout/Footer.tsx` — `LEGAL_COLUMN` (`Pháp lý & hỗ trợ`) gained `Hướng dẫn sử dụng` as the FIRST item, then keeps the existing four (Điều khoản / Chính sách / Tranh chấp / Liên hệ). Result: 5 links in this column. The previous 4-link cap was a soft preference, not a hard limit.
    - **C. Homepage guidance teaser** *(no duplication)*. The existing "Cách hoạt động" section on `src/app/page.tsx` already carries the 3-step skeleton for both audiences. Phase 9Y adds a single centered "Xem hướng dẫn chi tiết →" link inside that section (after the two step columns), pointing to `/user-guide`. The link uses the existing `<ArrowRightIcon />`, matches the rest of the homepage's pill aesthetic (`min-h-[44px] rounded-full border-orange-200 bg-white/80 …`), and a new i18n key `landing.howItWorks.viewGuide` = "Xem hướng dẫn chi tiết". No duplicate "How it works" section was created.
    - **D. `<PageHelpButton>` extended with grouped sections + CTA.** New optional shape on `src/components/ui/PageHelpButton.tsx`:

      ```ts
      export interface PageHelpSection {
        heading: string;
        items: string[];
      }
      export interface PageHelpButtonProps {
        title: string;
        intro?: string;
        items?: string[];                  // Phase 9F flat-bullet path (preserved)
        sections?: PageHelpSection[];      // Phase 9Y grouped-content path
        cta?: { label: string; href: string };  // Phase 9Y deep link to /user-guide
        className?: string;
      }
      ```

      When `sections` is supplied, the modal body renders each section as a small block with `text-xs font-semibold uppercase tracking-wide text-orange-700` heading + bulleted list and ignores `items`. When `cta` is supplied, the modal footer becomes a `flex justify-between` row — the CTA `<Link>` (orange ghost button styled to match the existing close button) sits on the bottom-left, the "Đã hiểu" close button stays on the bottom-right. Mobile (`< sm`) stacks the two buttons vertically with the close button on top so the primary close action stays reachable. The original flat-`items` codepath is untouched, so `/employer/shifts/new` (which has lighter, single-purpose help) keeps the legacy shape.
    - **D. Five surfaces upgraded to grouped help content.** Pattern per surface: 4 sections in this order — `purpose` (1 item: "Trang này dùng để…"), `numbers` (3–5 items explaining the dashboard's numbers and statuses), `actions` (3–6 items in step-by-step order), `mistakes` (3–4 items: common edge cases) — plus a `cta` pointing to `/user-guide` with the shared `help.viewFullGuide` label "Xem hướng dẫn chi tiết". Surfaces:
      - **Worker dashboard** (`src/app/worker/dashboard/page.tsx`) — `help.workerDashboard.section.*`.
      - **Worker schedule** (`src/app/worker/schedule/page.tsx`) — `help.workerSchedule.section.*`.
      - **Employer dashboard** (`src/app/employer/dashboard/page.tsx`) — `help.employerDashboard.section.*`.
      - **Employer schedule** (`src/app/employer/schedule/page.tsx`) — `help.employerSchedule.section.*`.
      - **Admin dashboard** (`src/app/admin/dashboard/page.tsx`) — `help.adminDashboard.section.*`.

      The 6th surface — `/employer/shifts/new` — keeps the lighter flat-`items` format on purpose (single-purpose form, not a dashboard).
    - **E. Empty states upgraded to be guiding.** Each surface below now uses `<EmptyState tone="warm">` with `title` + descriptive `description` + a primary CTA `<Link>` in the `action` slot:
      - **Worker dashboard** "Ca làm sắp tới" — copy upgraded; CTA "Tìm ca làm" → `/shifts` (was already there).
      - **Worker dashboard** "Đơn đã ứng tuyển" — new `worker.dashboard.empty.applications.{title,description,cta}` keys; CTA "Khám phá ca làm" → `/shifts`.
      - **Worker dashboard** completed-shifts modal — new `worker.dashboard.empty.completed.{title,description,cta}` keys; CTA "Tìm ca làm" → `/shifts` (closes the modal first).
      - **Worker dashboard** income modal — new `worker.dashboard.empty.income.{title,description,cta}` keys; CTA "Tìm ca làm ngay" → `/shifts`.
      - **Employer dashboard** "Ca làm sắp tới" — copy upgraded via new `employer.dashboard.empty.upcoming.descriptionRich`; CTA "Đăng ca mới" → `/employer/shifts/new` (was already there).
      - **Employer dashboard** pending-applicants modal — new `employer.dashboard.empty.pending.{title,description,cta}` keys; CTA "Đăng ca mới" → `/employer/shifts/new`.
      - **Employer manage shift** `/employer/shifts/[id]` "Đơn ứng tuyển" — new `employer.manageShift.empty.applicants.{title,description}` keys; no CTA (per-shift surface, no useful cross-link).

      Worker dashboard reputation modal empty state is intentionally left as-is — it already has surface-specific copy.
    - **F. New `<HelpHint>` primitive** at `src/components/ui/HelpHint.tsx`. Re-exported from `src/components/ui/index.ts`.
      - **Server-component-safe.** No `'use client'`, no React hooks, no portal. Visibility driven entirely by Tailwind's `group-hover` / `group-focus-within` on the outer wrapper `<span>`. Static markup, safe to render inside `<InfoPage>` or anywhere else.
      - **Trigger is a non-focusable `<span role="img" tabIndex=0-NOT-USED>`** rather than a `<button>`. This was a deliberate choice: Phase 9Y instruments StatTile labels with hints, and StatTiles are themselves rendered as `<button>` when clickable. Nesting a focusable element inside another focusable element is invalid HTML and triggers React hydration warnings. With the trigger as a plain `<span>`, hover comes from the parent `<span class="group">` and keyboard reachability comes from the closest focusable ancestor (the StatTile button) — `Tab`-focusing the StatTile flips `group-focus-within:block` on the wrapper span and the tooltip appears for keyboard users too. The `title=` attribute on the glyph announces the hint to screen readers as a fallback.
      - **Tooltip layer**: `absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-700 shadow-lg group-hover:block group-focus-within:block`. `pointer-events-none` so it never steals the cursor; `z-20` sits above adjacent card chrome but below modals (`z-[100]`) and toasts (`z-[110]`).
      - **Limitations advertised**: no portal — narrow ancestors with `overflow: hidden` can clip the tooltip; no click-to-dismiss / ESC; tooltip dismisses by losing hover or focus only.
    - **F. Applied `<HelpHint>` to ~12 instrumented labels.**
      - **Worker dashboard StatTile labels** (`src/app/worker/dashboard/page.tsx`) — Điểm uy tín, Hạn mức huỷ tuần, Tổng thu nhập, Ca đã hoàn thành. Each tile gained an optional `hint` prop; the StatTile body wraps the label text in a `<HelpHint>` when present. Hint copy keys: `hint.worker.{reputation,cancelQuota,totalEarnings,completedShifts}`.
      - **Employer dashboard StatTile labels** (`src/app/employer/dashboard/page.tsx`) — Đơn chờ duyệt, Tổng đã đặt cọc, Tổng đã thanh toán. Same `hint` prop pattern. Hint keys: `hint.employer.{pendingApps,totalDeposited,totalPaidOut}`.
      - **Employer manage shift `/employer/shifts/[id]`** — `<HelpHint>` next to the `Đã duyệt` and `Đã hoàn thành` (Confirmed) status badges in the WorkerSummaryRow. Hint keys: `hint.employer.{statusApproved,statusCompleted}`.
      - **Admin dashboard "Override (khẩn cấp)" button** (`src/app/admin/dashboard/page.tsx`) — `<HelpHint>` rendered as a sibling next to the button. Hint key: `hint.admin.override`.

      Surfaces that already have prose explanations (the user guide page itself, the help modals' grouped sections) intentionally do NOT receive `<HelpHint>` instrumentation — would be redundant.
    - **Constraints honored.** No new dependencies (Tailwind v4 in CSS only, Zustand 5 untouched). No schema bump (still v4). No business-logic / store / persistence changes — every surface only adds presentational props or new copy. No `backdrop-blur` on toast/modal backdrops. Locked light theme preserved. Mock / localStorage only — no real auth, real payment, real OTP, or real ID verification was added. Phase 9V `<header>` rule (no `overflow-x-hidden`) and Phase 9X z-index map preserved exactly. Notification bell, footer, auth flow, dashboard interaction logic, modal portal — all untouched.
    - **Validation.** `npm run build` → exit 0, **28 routes** (was 27 — `/user-guide` is the new one). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged). **NEEDS MANUAL VISUAL QA** — code-only review; the page text density of `/user-guide` and the help-modal layout density on the 5 upgraded dashboard surfaces should be visually scanned by a human at 360 / 768 / 1366 px before promoting.

    - **Phase 9Y QA fix-up — StatTile tooltip clipping** *(2026-05-24, follow-on review)*. Manual review of the worker / employer dashboards flagged a real bug: the `<StatTile>` card carried `relative overflow-hidden`, which clipped the absolutely-positioned `<HelpHint>` tooltip to the card edges. The HelpHint design notes explicitly call this out as a limitation ("narrow ancestors with `overflow: hidden` will clip the tooltip"), but the StatTile usage violated it for all 7 instrumented tiles (4 worker tiles: Điểm uy tín / Hạn mức huỷ / Tổng thu nhập / Ca đã hoàn thành; 3 employer tiles: Đơn chờ duyệt / Tổng đã đặt cọc / Tổng đã thanh toán). The visible `(?)` glyph on hover would surface a tooltip cropped to ~12px of text. **Fix:** dropped `overflow-hidden` from the card class and moved the corner clip onto the `before:` accent bar itself via `before:rounded-t-2xl`. The accent bar still tucks inside the card's rounded corner; the tooltip can now escape downward without being cropped. Pure CSS, no logic change. Both worker and employer dashboard `StatTile` definitions updated identically. The 2 remaining HelpHint sites (employer manage-shift status badges + admin override button) are not inside any `overflow-hidden` ancestor so they were already fine.
      - **Files changed (QA fix-up):** `src/app/worker/dashboard/page.tsx` (StatTile `baseClasses`), `src/app/employer/dashboard/page.tsx` (StatTile `baseClasses`).
      - **Validation.** `npm run build` → exit 0, 28 routes. `npm run test:run` → exit 0, 40/40. Visual diff is identical at rest; tooltip is now visible on hover/focus.

    - **Files changed (Phase 9Y):**
      - `src/components/ui/HelpHint.tsx` — NEW. Pure-CSS server-safe tooltip primitive. Non-focusable `<span>` trigger so it can nest inside StatTile `<button>`s.
      - `src/components/ui/index.ts` — re-export `HelpHint` and the new `PageHelpSection` type.
      - `src/components/ui/PageHelpButton.tsx` — extended `PageHelpButtonProps` with `sections` + `cta`; added grouped-section render path; preserved flat-`items` path; footer becomes `flex justify-between` when CTA is present.
      - `src/app/user-guide/page.tsx` — NEW. Server-rendered public guide. 9-step worker timeline + 9-step employer timeline + 5-entry FAQ accordion (`<details>` / `<summary>`). Inline server-component helpers (`StepCard`, `RoleColumn`, `FaqEntry`, `StepNumber`).
      - `src/components/layout/NavBar.tsx` — `SAFETY_GROUP` gained 5th entry; `activePrefixes` extended with `/user-guide`.
      - `src/components/layout/MobileNav.tsx` — `PUBLIC_SECTIONS` `Hướng dẫn & hỗ trợ` + `WORKER_SECTIONS` `Hướng dẫn` + `EMPLOYER_SECTIONS` `Hướng dẫn` each gained `Hướng dẫn sử dụng → /user-guide` link.
      - `src/components/layout/Footer.tsx` — `LEGAL_COLUMN` prepended with `Hướng dẫn sử dụng → /user-guide` as first item.
      - `src/app/page.tsx` — added centered "Xem hướng dẫn chi tiết →" pill inside the existing "Cách hoạt động" section.
      - `src/app/worker/dashboard/page.tsx` — `<PageHelpButton>` migrated to grouped sections + CTA; StatTile gained `hint` prop and renders the label inside `<HelpHint>` when present; 4 stat tiles instrumented; "Đơn đã ứng tuyển" empty state given `tone="warm"` + CTA; completed-shifts modal and income modal empty states upgraded to `<EmptyState>` with CTAs that close the modal then navigate.
      - `src/app/worker/schedule/page.tsx` — `<PageHelpButton>` migrated to grouped sections + CTA.
      - `src/app/employer/dashboard/page.tsx` — `<PageHelpButton>` migrated to grouped sections + CTA; StatTile gained `hint` prop; 3 stat tiles instrumented; pending-applicants modal empty state upgraded to `<EmptyState>` with CTA.
      - `src/app/employer/schedule/page.tsx` — `<PageHelpButton>` migrated to grouped sections + CTA.
      - `src/app/employer/shifts/[id]/page.tsx` — `<HelpHint>` added next to Approved / Confirmed status badges; "Chưa có ai ứng tuyển" empty state upgraded to `<EmptyState tone="warm">` with descriptive copy (no CTA).
      - `src/app/admin/dashboard/page.tsx` — `<PageHelpButton>` migrated to grouped sections + CTA; `<HelpHint>` added as a sibling of the Override button.
      - `src/i18n/vi.ts` — new keys: `landing.howItWorks.viewGuide`; `help.viewFullGuide`; `help.<surface>.section.<purpose|numbers|actions|mistakes>.{heading,itemN}` for the 5 upgraded surfaces; `worker.dashboard.empty.{applications,completed,income,upcoming}.*`; `employer.dashboard.empty.{upcoming.descriptionRich,pending.*}`; `employer.manageShift.empty.applicants.{title,description}`; `hint.worker.{reputation,cancelQuota,totalEarnings,completedShifts}`; `hint.employer.{totalDeposited,totalPaidOut,pendingApps,statusApproved,statusCompleted}`; `hint.admin.override`.
      - `HANDOFF.md`, `VISUAL_QA.md`.

42. **Phase 9Y-Fix — Contextual help redesigned as click/tap popover** *(2026-05-24, Phase 9Y-Fix)*. Phase 9Y instrumented stat tile labels with a hover-only `<HelpHint>` (`<span role="img">` trigger + Tailwind `group-hover` tooltip layer). Manual QA at 360 / 768 / 1366 px revealed three real product issues: (1) tooltip text was clipped inside the dashboard stat cards because the card carried `overflow-hidden`; the Phase 9Y QA fix-up removed that `overflow-hidden`, but tooltip readability on narrow viewports remained poor; (2) on touch devices there is no hover, so mobile users couldn't reveal the hint at all; (3) the white-on-gray tooltip layer read like a native browser `title=` tooltip rather than a CaLẻ-styled surface. Phase 9Y-Fix replaces the hover model entirely with click/tap.

    - **A. New primitive `<HelpPopover>`** at `src/components/ui/HelpPopover.tsx`. Click-only (no hover behaviour, no native `title=` fallback, no anchored positioning). Trigger is a real `<button>` with `aria-haspopup="dialog"` + `aria-expanded` + `aria-label="Giải thích: <title>"`. Click opens the existing `<Modal>` primitive (already portaled to `document.body` via Phase 9H, so the popover automatically escapes any clipping ancestor — no separate portal needed, no risk of reintroducing the Phase 9Y overflow bug). Modal carries the title from the surrounding stat label, a 1–3 sentence concept description, and a footer with a "Xem hướng dẫn chi tiết →" link to `/user-guide` plus an "Đã hiểu" close button. ESC + outside click + close button all dismiss. Body scroll locks while open (inherited from Modal). The trigger calls `e.stopPropagation()` + `e.preventDefault()` on click and `mousedown` so the parent click handler (StatTile detail-modal opener) never fires when the user taps `?`. Mobile-first by design.
    - **B. StatTile refactored to non-`<button>` card.** The Phase 9Y `<StatTile>` was a `<button>` carrying `onClick`. Nesting `<HelpPopover>` (also a `<button>`) inside it would have produced invalid `<button>` inside `<button>` HTML — exactly the trap that the original `<HelpHint>` `<span>` trigger was designed to avoid. Refactor: the card is now a `<div>` with two stacked layers — a transparent absolutely-positioned `<button class="absolute inset-0 z-0">` overlay anchor that owns the tile's click target + focus ring + aria-label, and a `<div class="relative z-10 pointer-events-none">` content layer that renders the label / value / icon / "Xem chi tiết →" caret. Interactive children inside the content layer (the HelpPopover trigger) opt back into clicks via `pointer-events-auto` on a wrapping `<span>`. Result: tile body is fully clickable, focus ring lights up via the overlay anchor's `focus-visible:ring`, and the help button captures its own clicks without bubbling. Hover lift, focus indicator, and "Xem chi tiết →" caret all preserved. Done identically in both `src/app/worker/dashboard/page.tsx` and `src/app/employer/dashboard/page.tsx` so the two stay in sync.
    - **C. StatTile `hint` prop signature changed** from `hint?: string` (Phase 9Y) to `hint?: { title: string; description: string }`. Title is the human label that goes in the popover's modal title (mirrors the visible stat label). Description is the longer concept blurb. All call sites updated.
    - **D. Three new employer hints added** per the Phase 9Y-Fix content spec: `hint.employer.activeShifts`, `hint.employer.postedShifts`, `hint.employer.completedShifts`. The four already-instrumented employer tiles (Đơn chờ duyệt / Tổng đã đặt cọc / Tổng đã thanh toán) keep their hints. Net result: every one of the 6 employer dashboard stat tiles now carries a popover. Worker dashboard's 4 instrumented tiles also keep their popovers. Wording updated to be popover-friendly (1–2 short sentences) per the spec content list.
    - **E. Other HelpHint sites converted.** `<HelpPopover>` also replaces the inline hint next to (i) the Approved / Confirmed status badges on `/employer/shifts/[id]` (titles read from `application.status.Approved` / `application.status.Confirmed`), and (ii) the Admin Override button on `/admin/dashboard` (title `admin.shifts.override`). Both surfaces had no overflow-hidden parent so they were clipping-safe even before Phase 9Y-Fix; they're converted purely for behavioural consistency (click/tap, ESC dismiss, no native tooltip).
    - **F. `<HelpHint>` removed.** `src/components/ui/HelpHint.tsx` deleted; `HelpHint` and `HelpHintProps` exports dropped from the UI barrel. No call sites remain. The hover-only design is gone from the codebase, by design — the user explicitly required click/tap to be the primary interaction.
    - **G. No nested-button rule documented.** When inserting a HelpPopover inside any clickable surface (stat tiles, action rows, table rows), the surface must not be a `<button>`. Use the StatTile pattern: render the surface as a `<div>` and place a transparent `<button class="absolute inset-0">` overlay anchor as a sibling of the help button, both inside a `relative` container. Document the new rule in HANDOFF Section 11.
    - **Constraints honored.** No new dependencies (Tailwind v4 in CSS only, Zustand 5 untouched). No schema bump (still v4). No business-logic / store / persistence changes — every surface only swaps presentational components and copy. Phase 9V `<header>` rule (no `overflow-x-hidden`), Phase 9X canonical z-index map (modal `z-[100]`, popover inherits), Phase 9Y `/user-guide` route, dashboard interaction logic, modal portal, notification bell, footer, auth flow — all untouched.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged — the change is presentational; no domain logic moved). **NEEDS MANUAL VISUAL QA** at 360 / 390 / 430 / 768 / 1366 px to confirm: the `?` glyph aligns with each stat label baseline; tapping `?` opens a centered popover that is not clipped; the popover's "Đã hiểu" + "Xem hướng dẫn chi tiết →" footer is readable; the surrounding stat-tile detail click still works (clicking the card body opens the detail modal, clicking `?` opens the popover and does NOT also open the detail modal).
    - **Files changed (Phase 9Y-Fix):**
      - `src/components/ui/HelpPopover.tsx` — NEW. Click/tap popover trigger + Modal-based body. Real `<button>` trigger with `aria-haspopup="dialog"`. ESC + outside click + close button all dismiss.
      - `src/components/ui/HelpHint.tsx` — DELETED.
      - `src/components/ui/index.ts` — dropped `HelpHint` exports; added `HelpPopover` + `HelpPopoverProps` exports.
      - `src/app/worker/dashboard/page.tsx` — StatTile refactored from `<button>` to `<div>` + click overlay anchor; HelpPopover rendered inline next to label; 4 call sites pass `hint={{title, description}}`.
      - `src/app/employer/dashboard/page.tsx` — StatTile refactored identically; 6 call sites instrumented (3 new hints added: activeShifts, postedShifts, completedShifts).
      - `src/app/employer/shifts/[id]/page.tsx` — Approved / Confirmed inline HelpHint converted to HelpPopover.
      - `src/app/admin/dashboard/page.tsx` — Admin Override inline HelpHint converted to HelpPopover.
      - `src/i18n/vi.ts` — `hint.*` block rewritten for popover copy. Added `hint.employer.activeShifts`, `hint.employer.postedShifts`, `hint.employer.completedShifts`. Existing `hint.worker.*`, `hint.employer.*`, `hint.admin.override` rewritten to be 1–3 sentences with concrete numbers (still well-under-popover-budget).
      - `HANDOFF.md`, `VISUAL_QA.md`.

43. **Phase 9Y-Fix-3 — Help moved out of stat tiles into detail modals** *(2026-05-24, Phase 9Y-Fix-3)*. Phase 9Y-Fix put a click-to-open `<HelpPopover>` `?` glyph next to every stat tile label. Manual QA flagged that the inline glyph still felt cluttered on the dashboard overview — even subtle 16-px markers add visual noise to a tight 6-tile grid, and the dashboard is supposed to read as a clean status board. Phase 9Y-Fix-3 pulls the help glyph out of the stat tiles entirely and instead surfaces the same explanation **inside the corresponding stat detail modal**, anchored next to the modal title.

    Drill-down is the natural place for explanatory copy: a user who wants to understand "what does Ca đã đăng count?" is already going to click the tile to see the underlying list, and the modal title slot is the most readable surface for a `?` glyph (no clipping, no card-grid density). The dashboard overview stays clean.

    - **A. Stat tiles cleaned up.** All 10 dashboard stat tiles (4 worker + 6 employer) no longer carry inline help. The `hint` prop has been dropped from `StatTile` entirely. Card markup is now: top-row label + decorative icon, big value, hover-revealed "Xem chi tiết →" caret. Nothing else.
    - **B. StatTile simplified back to a `<button>`-as-card.** The Phase 9Y-Fix overlay-anchor pattern (transparent `<button class="absolute inset-0">` + `pointer-events-none` content layer) was introduced specifically so a HelpPopover could sit next to the label without producing nested `<button>`s. With the inline glyph removed there is no longer any nested-button risk, so the tile is back to the cleaner `<button>` form when interactive: `<button onClick={...} aria-label={ariaLabel} className={baseClasses + interactiveClasses}>{body}</button>`. Hover lift, focus ring, and "Xem chi tiết →" caret all preserved. Done identically in both worker and employer dashboards.
    - **C. `<Modal>` extended with optional `titleAccessory?: ReactNode` slot.** Renders inline next to the title inside the same flex row as the close button. Vertically aligned with the title text via `inline-flex items-center gap-1.5`. No layout impact when omitted (the existing `<h2>` keeps its prior centering). Used as the canonical place to mount per-modal `<HelpPopover>` triggers.
    - **D. ShiftListModal helper extended.** The shared `<ShiftListModal>` helper on the employer dashboard (used by Posted / Active / Completed) now forwards `titleAccessory?: ReactNode` to the underlying `<Modal>`. New `import { ReactNode } from 'react'`.
    - **E. 9 detail modals now carry inline help next to their title:**
      - **Worker dashboard:**
        - `Điểm uy tín` modal → `hint.worker.reputation`
        - `Ca đã hoàn thành` modal → `hint.worker.completedShifts`
        - `Tổng thu nhập` modal → `hint.worker.totalEarnings`
        - `Hạn mức huỷ tuần` modal → `hint.worker.cancelQuota`
      - **Employer dashboard:**
        - `Ca đang hoạt động` modal → `hint.employer.activeShifts`
        - `Đơn ứng tuyển chờ duyệt` modal → `hint.employer.pendingApps`
        - `Tất cả ca đã đăng` modal → `hint.employer.postedShifts`
        - `Ca đã hoàn thành` modal → `hint.employer.completedShifts`
        - `Tổng đã đặt cọc / đã thanh toán` payments modal → `hint.employer.totalDeposited` (the modal lists both totals, so the help text covers the deposit half — the body itself already explains the payout half).
      Each `<HelpPopover>` carries the modal's title as its own popover title (so when the user clicks `?` they see "Điểm uy tín" → description), the description from the matching `hint.*` key, and the default `learnMoreHref="/user-guide"` cross-link. Mobile-tap-friendly, ESC + outside click + close-button dismiss inherited from `<Modal>`.
    - **F. Hint copy trimmed to canonical phrasing** per the Phase 9Y-Fix-3 spec — single-sentence descriptions, no concrete numbers (those live in `/user-guide` and the relevant modal body). The Phase 9Y-Fix copy that bundled "Bắt đầu từ 100. +5/−20/−10…" into the hint has been pruned because the reputation modal already shows the timeline of events; the hint is just a plain definition.
    - **G. Non-stat HelpPopover sites untouched and audited:**
      - `/employer/shifts/[id]` Approved / Confirmed status badges — visual placement is fine (status badge sits on a single-line row, `?` aligns to the right of the badge with `gap-1`). No clipping. Kept.
      - `/admin/dashboard` Override button — sits in a flex-wrap row of small action buttons, `?` aligns with the row baseline. No clipping. Kept.
      Neither was clipped or visually broken; they're outside the dashboard "overview" surface so they don't add overview noise. Behaviour and copy unchanged.
    - **H. HelpPopover import** removed from `worker/dashboard/page.tsx` and `employer/dashboard/page.tsx`'s top-level imports? — actually NO, both still import `HelpPopover` because the detail modals use it in the `titleAccessory` slot. Kept the existing imports.
    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence changes. No `backdrop-blur` on toast/modal backdrops. Locked light theme preserved. Phase 9V `<header>` rule, Phase 9X z-index map, Phase 9Y `/user-guide` route, dashboard interaction logic, modal portal — all untouched. Notification bell, footer, auth flow — all untouched.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged — change is purely presentational). **NEEDS MANUAL VISUAL QA** at 360 / 390 / 430 / 768 / 1366 px: confirm the dashboard tile grid reads as a clean status board (no `?` markers visible), tile click still opens its detail modal, the modal title row shows a small `?` next to the title, tapping that `?` opens the popover (which is itself a portaled modal, so it stacks above the parent detail modal cleanly).
    - **Files changed (Phase 9Y-Fix-3):**
      - `src/components/ui/Modal.tsx` — added optional `titleAccessory?: ReactNode` prop; rendered as a sibling of the `<h2>` inside an `inline-flex items-center gap-1.5` wrapper so it stays vertically aligned with the title text.
      - `src/app/worker/dashboard/page.tsx` — StatTile simplified back to `<button>`-as-card (interactive form); `hint` prop dropped from StatTile signature and from all 4 call sites; `<HelpPopover>` moved into all 4 detail modals' `titleAccessory` slot.
      - `src/app/employer/dashboard/page.tsx` — StatTile simplified identically; `hint` prop dropped from all 6 call sites; `<HelpPopover>` mounted on the 4 dashboard-level Modals (Active / Pending / Posted / Completed / Payments — 5 modals total since posted/active/completed go through the shared `<ShiftListModal>` helper); `<ShiftListModal>` extended to forward `titleAccessory?: ReactNode`; added `type ReactNode` import.
      - `src/i18n/vi.ts` — `hint.*` descriptions trimmed to canonical phrasing.
      - `HANDOFF.md`, `VISUAL_QA.md`.

44. **Phase 9Y-Fix-4 — Defensive `suppressHydrationWarning` for browser-extension DOM mutations** *(2026-05-24, Phase 9Y-Fix-4)*. Manual QA flagged a `Hydration failed` console warning in dev. The error log included extension-injected attributes — `data-darkreader-mode`, `data-darkreader-scheme`, `data-darkreader-proxy-injected`, `data-darkreader-inline-stroke`, and the CSS variable `--darkreader-inline-stroke` — which strongly indicated the **Dark Reader** browser extension (or a similar one) was mutating the DOM before React hydrated. This is not an app bug — the SSR markup matches the client markup; the third-party extension is the source of the divergence. Treating it as a real hydration mismatch would either force `'use client'` everywhere (regression) or hide it behind a state-flag-after-mount pattern (also regression). The right fix is React's defensive `suppressHydrationWarning` flag on the affected nodes only.

    - **A. Root suppression on `<html>` and `<body>`.** Both elements in `src/app/layout.tsx` now carry `suppressHydrationWarning`. Extensions overwhelmingly target these two roots (Dark Reader writes its mode/scheme attributes here; password managers add data-attributes; system-style accessibility tools occasionally tag the body). The flag is one level deep — it suppresses the warning for the immediate element but does not silence legitimate child mismatches. Inline comment in `layout.tsx` documents the rationale. Existing `lang="vi"`, `className={inter.variable + ' h-full antialiased'}` on `<html>` and the Phase 9U `min-w-0 min-h-full flex flex-col font-sans text-slate-900` body classes are preserved exactly.
    - **B. Per-SVG suppression on icons most-targeted by Dark Reader.** Dark Reader injects `data-darkreader-inline-stroke` onto SVGs that carry a `stroke=` attribute. The flag's one-level-deep behaviour means root suppression doesn't cover these. Five inline SVG components on the homepage (`ShieldIcon`, `WalletIcon`, `StarIcon`, `CalendarIcon`, `ScalesIcon` in `src/app/page.tsx`) plus `HamburgerIcon` in `src/components/layout/MobileNav.tsx` and `CalendarIcon` in `src/components/shift/ShiftCard.tsx` were updated to carry `suppressHydrationWarning` on the `<svg>` root. These cover every icon currently visible on first paint of the landing page + the navbar + the shift discovery list (the high-impact surfaces that produced the QA warning). All other inline SVGs in the codebase are deeper in the page tree and only appear behind interaction (modals, buttons, state-driven panels), so they don't trigger the warning at first hydration. Accessibility attributes (`aria-hidden`, `viewBox`, `fill`, `stroke`) are preserved. No content is hidden until mounted; no client-only rendering branches were introduced; no new dependencies.
    - **C. Real-app hydration risks audited and cleared.** Searched the codebase for `Date.now()`, `Math.random()`, `new Date()`, `typeof window`, and localStorage-derived markup paths:
      - **`Math.random()`** — zero hits. No randomness in render paths.
      - **`Date.now()` / `new Date()`** — 14 hits across 14 files. Every file with a Date call is a `'use client'` component (`worker/dashboard`, `worker/schedule`, `shifts/page`, `shifts/[id]`, `employer/shifts/[id]`, `employer/schedule`, `AdminUserProfileModal`, `RoleGuard`, `CancelApplicationDialog`, `FeaturedJobMockup`, `DateFieldVN`, `DayView`, `AgendaView`, `admin/dashboard`). The Date values feed gate predicates (`canCheckIn`, `shouldMarkNoShow`, `cancellationQuotaUsage`, sort/filter keys) — they're never rendered as text. SSR + first hydration produce identical markup because seed data is deterministic; `AppHydrator`'s localStorage read happens inside a `useEffect` after first paint, so the first render mirrors SSR exactly. No risk.
      - **`typeof window`** — 3 hits, all inside `useEffect` bodies or pure helper functions: `src/lib/notificationAction.ts` (event dispatch helper), `src/data/persistence.ts` (`isBrowser()` SSR guard for `localStorage`), `src/components/ui/Reveal.tsx` (intersection-observer feature detect inside `useEffect`). None of them branch render output. No risk.
      - **localStorage-derived markup** — `AppHydrator` reads localStorage inside a `useEffect` and seeds Zustand stores. The first render of every page reads the seed snapshot (deterministic), so SSR and first hydration produce identical markup. The store update from `AppHydrator` triggers a *second* render that may differ — but that's a normal React state transition, not a hydration mismatch.
      - **Invalid nested HTML** — Phase 9Y-Fix-3 cleaned up the only known site (StatTile + HelpPopover). Nothing pending.
      - **Conclusion:** the warning observed in QA is extension-induced. No real app hydration bug exists; only the defensive flags described in (A) and (B) are needed.
    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence changes. SSR is NOT disabled; no client-only rendering branches; no icons hidden until mounted. The four named icons (Hamburger / Shield / Wallet / Calendar) keep their accessibility attributes intact. The flag is applied surgically to known extension-target nodes, not codebase-wide. Real hydration mismatches will still warn (the flag is deliberately one-level-deep).
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing** (unchanged — pure JSX prop additions).
    - **Files changed (Phase 9Y-Fix-4):**
      - `src/app/layout.tsx` — `suppressHydrationWarning` on `<html>` and `<body>` + inline comment documenting the rationale.
      - `src/app/page.tsx` — `suppressHydrationWarning` on the 5 inline SVG icons (`ShieldIcon`, `WalletIcon`, `StarIcon`, `CalendarIcon`, `ScalesIcon`).
      - `src/components/layout/MobileNav.tsx` — `suppressHydrationWarning` on `HamburgerIcon`'s `<svg>` root.
      - `src/components/shift/ShiftCard.tsx` — `suppressHydrationWarning` on `CalendarIcon`'s `<svg>` root.
      - `HANDOFF.md`, `VISUAL_QA.md`.

45. **Phase 9Z — Visual identity system + Vietnam-network atmosphere** *(2026-05-24, Phase 9Z)*. Phases 9F → 9Y-Fix-4 made every public surface functional and clean, but a cross-product visual review flagged the homepage and guidance pages still felt "AI-coded" — usable but generic. Phase 9Z layers a coherent CaLẻ visual identity on top: a Vietnam-shift-network metaphor (curved route lines + pulsing nodes) executed as a reusable SVG backdrop, three new shared CSS utilities (`.section-shell`, `.card-lift`, `.info-page-hero`, `.bg-route-soft`), a new "Thiết kế cho nhu cầu ca làm linh hoạt tại Việt Nam" homepage strip with five city chips, and a polished `<InfoPage>` shell. Dashboards intentionally untouched — they remain clean status boards per the Phase 9Y-Fix-3 rule.

    - **A. New primitive `<RouteBackdrop>`** at `src/components/layout/RouteBackdrop.tsx`. Server-component-safe inline SVG with three variants:
      - `"hero"` — two long bezier curves sweeping across the panel + 4 pulsing nodes. Drawn behind the homepage hero blobs.
      - `"page"` — one curve + 3 nodes. Drawn behind `<InfoPage>` headers and the new homepage city strip.
      - `"subtle"` — nodes only, no lines. Reserved for future quiet surfaces.
      Curves use a brand-orange linear gradient stop so they fade at both edges (no hard line). Nodes have a small filled circle plus a larger radial-glow halo that gently pulses via the new `.pulse-node` keyframe (4.4s loop, scaled-cousin `.pulse-node-slow` at 6.6s so two endpoints don't synchronise). `aria-hidden="true"` + `pointer-events: none` on the wrapper. `suppressHydrationWarning` on the `<svg>` root for Phase 9Y-Fix-4 / Dark-Reader resilience. No external image, no extra HTTP request, no third-party dependency.
    - **B. New CSS utilities in `globals.css`:**
      - `@keyframes pulse-node` + `.pulse-node` / `.pulse-node-slow` — opacity + scale ambient pulse for the backdrop's halo nodes. Added to the existing `prefers-reduced-motion` block so motion-sensitive users see static nodes.
      - `.section-shell` — opt-in card chrome for designed marketing surfaces (homepage city strip, future hero blocks). White panel + soft orange ring + warm gradient wash + low-alpha dot grid overlay via a `::before`. Children render normally on top.
      - `.card-lift` — marketing-cousin of `.motion-lift` with a stronger hover shadow (`box-shadow: 0 18px 40px -22px rgba(251,146,60,0.35)`) for city chips and audience cards where the existing `.motion-lift` reads as too subtle. Reduced-motion-safe (transition + transform suppressed in the media query).
      - `.bg-route-soft` — pure-CSS faint dot-and-line texture suitable as a fallback layer where mounting an SVG would feel heavy.
      - `.info-page-hero` — soft warm gradient wash + inset orange ring + rounded panel, used by `<InfoPage>` to replace the previous flat orange underline.
    - **C. Homepage hero atmosphere** in `src/app/page.tsx` — a `<RouteBackdrop variant="hero" className="-z-0 hidden md:block" />` is now layered behind the existing Phase 9T blobs and Phase 9U mockup. Hidden below `md` because the mobile hero stays calm via the page-root overflow clamp; on desktop the route lines + pulsing nodes establish the brand metaphor at first paint. Hero copy / mockup / CTAs untouched — the backdrop is purely additive.
    - **D. New homepage city strip** between Audience cards and How-it-works. Five cards (Hà Nội · TP.HCM · Đà Nẵng · Cần Thơ · Hải Phòng), each a small location-pin glyph + city name + region subtitle. Sits inside a `.section-shell` panel with a `<RouteBackdrop variant="page" />` decoratively layered behind. Copy is intentionally hedged — eyebrow `"Kết nối ca làm tại Việt Nam"`, title `"Thiết kế cho nhu cầu ca làm linh hoạt"`, lead explaining the product is built for the local short-term shift market, and a small disclaimer `"Hiện đang trong giai đoạn thử nghiệm — danh sách thành phố ở trên là minh hoạ định hướng, không phải dữ liệu phủ sóng thực tế."` so the MVP doesn't overclaim coverage. New i18n keys: `landing.vn.{eyebrow,title,lead,disclaimer}`.
    - **E. `<InfoPage>` shell upgraded** in `src/components/layout/InfoPage.tsx`. The header strip now uses the new `.info-page-hero` class (soft warm gradient + inset orange ring) with a low-opacity `<RouteBackdrop variant="page" />` decoratively layered behind the eyebrow / title / intro. Replaces the previous flat orange `border-b border-orange-100 pb-6`. Every static / guidance page that goes through `<InfoPage>` automatically inherits the upgrade — `/about`, `/how-it-works`, `/safety`, `/faq`, `/disputes`, `/support`, `/terms`, `/privacy`, `/user-guide`, `/employer/payments`, `/employer/reviews`, `/worker/cancellation-policy`, `/worker/reputation-guide`. No per-page edits needed.
    - **F. Dashboards intentionally untouched.** Per the Phase 9Y-Fix-3 rule ("Dashboard overviews stay clean; help lives in drill-downs"), no `<RouteBackdrop>` was added to `worker/dashboard`, `employer/dashboard`, `admin/dashboard`, or any of the data-dense surfaces (`/shifts`, `/employer/schedule`, `/worker/schedule`). The Phase 9T `.bg-grid-soft` paper texture they already carry is sufficient depth.
    - **Constraints honored.** No new dependencies (Tailwind v4 in CSS, Zustand 5 untouched). No schema bump (still v4). No business-logic / store / persistence changes. No external images. The Phase 9V `<header>` rule (no `overflow-x-hidden`), Phase 9X canonical z-index map (header / dropdown / drawer / modal / toast all unchanged), Phase 9Y `/user-guide` route, Phase 9Y-Fix-3 dashboard cleanliness rule, Phase 9Y-Fix-4 hydration suppressions, dashboard interaction logic, modal portal, notification bell, footer, auth flow — all untouched. Reduced motion: every new keyframe is added to the existing `prefers-reduced-motion: reduce` block.
    - **Accessibility & performance.** `<RouteBackdrop>` is `aria-hidden` + `pointer-events: none`; SVG is declarative, no JS runtime cost. No layout shift (the backdrop is absolutely positioned inside an already-present container). No horizontal scroll (page-root `overflow-x: hidden` clamp from Phase 9U still active). Text contrast unchanged — backdrop opacity is tuned so headlines and body copy read clearly above. No heavy images, no new web fonts.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing** (unchanged — change is purely presentational).
    - **Files changed (Phase 9Z):**
      - `src/components/layout/RouteBackdrop.tsx` — NEW. Reusable inline-SVG backdrop primitive with three variants (hero / page / subtle).
      - `src/app/globals.css` — added `@keyframes pulse-node` + `.pulse-node` / `.pulse-node-slow`, `.bg-route-soft`, `.section-shell`, `.card-lift`, `.info-page-hero`. Reduced-motion block extended to suppress `pulse-node` and the `.card-lift` hover transform.
      - `src/app/page.tsx` — imported `<RouteBackdrop>`, added `variant="hero"` layer behind the hero blobs, inserted the new "Thiết kế cho nhu cầu ca làm linh hoạt tại Việt Nam" city strip section between Audience cards and How-it-works.
      - `src/components/layout/InfoPage.tsx` — header migrated from flat underline to `.info-page-hero` class + decorative `<RouteBackdrop variant="page" />` layer.
      - `src/i18n/vi.ts` — new keys: `landing.vn.{eyebrow,title,lead,disclaimer}`.
      - `HANDOFF.md`, `VISUAL_QA.md`.

46. **Phase 9Z-Fix-1 — Dashboard icon cleanup, applicant status help consistency, brand rename** *(2026-05-24, Phase 9Z-Fix-1)*. Three follow-on consistency fixes after the Phase 9Z visual upgrade.

    - **A. Decorative stat-tile icons removed.** Worker and employer dashboard `<StatTile>` cards previously rendered a small grey decorative glyph (`<TileIcon name="star|check|wallet|calendar|briefcase|users">`) in the top-right corner. Manual QA flagged the per-tile glyphs as visually inconsistent — different shapes, different visual weights, all competing with the actual numeric value. The colored top accent bar (the `before:` pseudo-element on the card) already provides per-tile differentiation, so the right-side glyph was net subtractive. Phase 9Z-Fix-1 drops the glyph from the JSX in both `src/app/worker/dashboard/page.tsx` and `src/app/employer/dashboard/page.tsx`. The `icon` prop on the StatTile signature is preserved for call-site compatibility (existing `icon="star"` etc. still type-check) but is intentionally a no-op. The `TileIcon` helper components remain in the file as dead code — kept on purpose so a future revision can re-introduce a single uniform glyph treatment without re-defining the SVG paths. Admin dashboard does not use this pattern, so no change there.
    - **B. Inline applicant-status `<HelpPopover>` removed.** `src/app/employer/shifts/[id]/page.tsx` previously rendered a `?` glyph next to Approved / Confirmed badges only. The other four application states (Pending / Rejected / CheckedIn / CheckedOut / etc.) had no glyph, creating inconsistent UI on applicant cards — every row could be at a different state, so the visual treatment looked random. Per the Phase 9Y-Fix-3 rule ("overview/list cards stay clean; help lives in drill-down/detail surfaces"), all per-row inline help is removed. The `<HelpPopover>` import is dropped. Status meaning is conveyed by the tinted `<Badge>` alone; the long-form explanation lives on `/user-guide`. The `hint.employer.statusApproved` / `hint.employer.statusCompleted` i18n keys are preserved for potential reuse but are no longer referenced from the manage-shift page.
    - **C. Brand rename `CaLẻ / ShiftNow` → `CaLẻ / Now`.** Per the spec, the user-facing product name is now `CaLẻ / Now`. Internal technical identifiers — package name `cale-shiftnow`, route folder `.kiro/specs/cale-shiftnow/`, store/domain/lib JSDoc file headers, type module names — are intentionally left as-is because they are not user-facing.
      - **i18n** (`src/i18n/vi.ts`): updated `site.name`, `auth.login.subtitle`, `auth.register.subtitle`, `auth.side.join`, `landing.hero.featured.exploreAria`, `landing.vn.lead`, `help.workerDashboard.intro`. The brand string in NavBar and footer renders via `t('site.name')` so they automatically inherit the rename.
      - **Layout** (`src/app/layout.tsx`): metadata `title` updated.
      - **NavBar** (`src/components/layout/NavBar.tsx`): brand block reads from `t('site.name')` — only the file-header JSDoc comment was updated.
      - **Footer** (`src/components/layout/Footer.tsx`): hardcoded brand text updated.
      - **InfoPage shell** (`src/components/layout/InfoPage.tsx`): default `eyebrow` prop updated.
      - **Per-page metadata titles + body strings** (13 files): `/about`, `/how-it-works`, `/safety`, `/faq`, `/disputes`, `/support`, `/terms`, `/privacy`, `/user-guide`, `/employer/payments`, `/employer/reviews`, `/worker/cancellation-policy`, `/worker/reputation-guide`. Each `metadata.title` updated (`'... — CaLẻ / ShiftNow'` → `'... — CaLẻ / Now'`); free-flowing body strings on `/about`, `/terms`, `/privacy`, `/user-guide` updated similarly.
      - **Docs**: `HANDOFF.md` H1 + Section 1 bullet, `VISUAL_QA.md` H1 — updated. Historical phase prose (e.g. item 35's "Brand block: `CaLẻ / ShiftNow`") intentionally left as-is to preserve the historical record.
      - **Skipped intentionally**: developer-facing JSDoc file headers in `src/types`, `src/lib`, `src/stores`, `src/domain`, `src/data`, `src/i18n`'s top JSDoc. These never render to users.
    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence changes. No icon-component definitions deleted (`TileIcon` helper kept in place to ease future re-instrumentation). Phase 9Z `<RouteBackdrop>`, dashboard interaction logic, modal portal, notification bell, footer, auth flow, toast — all untouched.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged — change is purely presentational + content).
    - **Files changed (Phase 9Z-Fix-1):**
      - `src/app/worker/dashboard/page.tsx` — StatTile body drops the right-side `<TileIcon>` JSX.
      - `src/app/employer/dashboard/page.tsx` — StatTile body drops the right-side `<TileIcon>` JSX.
      - `src/app/employer/shifts/[id]/page.tsx` — inline Approved / Confirmed `<HelpPopover>` removed; HelpPopover import dropped.
      - `src/app/layout.tsx` — metadata title.
      - `src/app/about/page.tsx`, `src/app/how-it-works/page.tsx`, `src/app/safety/page.tsx`, `src/app/faq/page.tsx`, `src/app/disputes/page.tsx`, `src/app/support/page.tsx`, `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/user-guide/page.tsx`, `src/app/employer/payments/page.tsx`, `src/app/employer/reviews/page.tsx`, `src/app/worker/cancellation-policy/page.tsx`, `src/app/worker/reputation-guide/page.tsx` — metadata titles + body strings.
      - `src/components/layout/InfoPage.tsx` — default eyebrow.
      - `src/components/layout/NavBar.tsx` — file-header JSDoc.
      - `src/components/layout/Footer.tsx` — hardcoded brand text.
      - `src/i18n/vi.ts` — 7 user-facing strings.
      - `HANDOFF.md`, `VISUAL_QA.md`.

47. **Phase 9Z-Fix-2 — InfoPage body polish + currency unit consistency** *(2026-05-24, Phase 9Z-Fix-2)*. Two follow-on consistency fixes after Phase 9Z gave guidance pages a designed hero card.

    - **A. InfoPage body content now reads as one designed surface.** Phase 9Z's hero card sat above plain `<section>`s with no visual continuity. Phase 9Z-Fix-2 adds three lightweight body utilities to `globals.css` and threads them through the shared `<InfoPage>` shell:
      - `.info-content` — body wrapper. Owns the vertical rhythm (`gap: 1.5rem`) and a small `-8px` top tuck so the first content block flows out of the hero strip's bottom edge instead of starting after a hard gap.
      - `.info-section-card` — applied to every `<InfoSection>`. Subtle orange left rail (`border-left: 2px solid rgba(251,146,60,0.25)`) + tightened padding so consecutive sections feel connected without becoming heavy boxes. Deliberately NOT a full card — legal pages like `/terms` and `/privacy` still read as prose.
      - `.info-step-card` + `.info-step-badge` — applied via the new `<InfoStep>` primitive. White card surface with a soft orange ring, a left-side gutter (3.75rem) for a numbered orange-gradient circle (mirrors the homepage `<StepNumber />` glyph). Designed for step-based pages.
    - **B. New `<InfoStep>` primitive** exported from `src/components/layout/InfoPage.tsx`. Caller passes `n` + `title` + body children; the card markup + badge are owned by `globals.css`. Migrated `/how-it-works` to use four `<InfoStep>` blocks instead of `<InfoSection>` blocks; the four steps now read as designed numbered cards. Other guidance pages keep `<InfoSection>` (which now renders with the orange-rail treatment automatically) — they don't need numbered cards because they're not step-based.
    - **C. Currency unit standardised to `đ` for amounts and `đồng` for prose.** Manual QA flagged that user-facing copy mixed `VNĐ` (form helper text), `₫` (numeric amounts via `Intl.NumberFormat`), and `đồng` (free-flowing prose). Phase 9Z-Fix-2 standardises:
      - Numeric amounts (`formatVND` output) now end with the lowercase `đ` suffix instead of the `₫` glyph. `formatVND` was switched from `style: 'currency', currency: 'VND'` (which auto-renders `₫`) to `style: 'decimal'` + manual `${formatted} đ` suffix. Behaviour for non-finite / non-numeric input is preserved (`0 đ` instead of `NaN đ`). All call sites that render amounts (`ShiftCard`, `FeaturedJobMockup`, `ShiftForm`, worker / employer dashboards, shift detail, admin dashboard) inherit the new suffix automatically.
      - The `numberToVietnameseCurrency` helper used by the wage-input helper line was changed from `... VNĐ` to `... đồng` so the spelled-out reading matches Vietnamese convention (e.g. `ba mươi lăm nghìn đồng` instead of `ba mươi lăm nghìn VNĐ`).
      - i18n keys `form.hourlyWage` (`(₫)` → `(đ)`) and `common.currency` (`'₫'` → `'đ'`) updated.
      - User-guide body string for the Đăng ca step updated from `lương theo giờ (₫)` to `lương theo giờ (đ)`.
      - Calculation, formula, store data, and Intl number formatting (`vi-VN`, integer mode, dot-thousands separator) are all unchanged.
      - Developer-facing JSDoc comments (in `format.ts`, `numberVN.ts`, `types/index.ts`, `domain/employerTrust.ts`) intentionally keep `₫` / `VND` references because those are technical identifiers, not user-visible copy.
    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence changes. No deposit / payment formula touched. The `formatVND` and `numberToVietnameseCurrency` helpers are still the single source of truth for currency display. Phase 9Z `<RouteBackdrop>` + `.info-page-hero` strip preserved exactly. Tests didn't reference the old suffix so no test updates were needed.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9Z-Fix-2):**
      - `src/app/globals.css` — added `.info-content`, `.info-section-card`, `.info-step-card`, `.info-step-badge` utilities.
      - `src/components/layout/InfoPage.tsx` — body wrapper migrated from `prose-info flex flex-col gap-6` to `.info-content`; `<InfoSection>` migrated to use `.info-section-card`; new `<InfoStep>` primitive exported.
      - `src/app/how-it-works/page.tsx` — four steps migrated from `<InfoSection>` to `<InfoStep n={...}>`.
      - `src/lib/format.ts` — `formatVND` switched from `Intl currency` (`₫` glyph) to `Intl decimal` + manual `đ` suffix.
      - `src/lib/numberVN.ts` — `numberToVietnameseCurrency` suffix changed from `VNĐ` to `đồng`. JSDoc updated.
      - `src/i18n/vi.ts` — `form.hourlyWage` and `common.currency` updated.
      - `src/app/user-guide/page.tsx` — Đăng ca step body string `(₫)` → `(đ)`.
      - `HANDOFF.md`, `VISUAL_QA.md`.

48. **Phase 9Z-Fix-3 — InfoPage hero/body alignment, public nav re-routing, public motion polish** *(2026-05-24, Phase 9Z-Fix-3)*. Three follow-on fixes after Phase 9Z-Fix-2's body polish.

    - **A. InfoPage hero ↔ body alignment.** Manual QA found that on desktop the hero card's title appeared visually indented relative to the body content because the hero strip carries `padding: 24px 24px 20px` (so its title sits 24 px in from the strip edge), while the body wrapper sat flush against the outer container. The two surfaces shared the same `max-w-3xl` parent but their first character of text didn't line up. Fix: add matching `padding-inline: 16px` (mobile) / `24px` (`sm+`) to `.info-content` so body section headings align with the hero title's left edge. Hero strip is unchanged — its rounded gradient + RouteBackdrop preserved exactly. Net effect: every guidance page now reads as one aligned column.
    - **B. Public navigation re-routing for logged-out users.** The Phase 9S grouped nav linked straight to protected routes (`/worker/schedule`, `/employer/shifts/new`, `/employer/dashboard`) regardless of role. Logged-out visitors who clicked any of those got bounced to `/login` by `RoleGuard` — sales-funnel behaviour disguised as discovery. Phase 9Z-Fix-3 introduces public-variant groups in `src/components/layout/NavBar.tsx`:
      - `WORKER_GROUP_PUBLIC` — same labels as `WORKER_GROUP`, but `Lịch cá nhân` now points to `/user-guide` (where the schedule feature is explained) instead of the protected `/worker/schedule`. Other items keep their existing public destinations (`/shifts`, `/worker/reputation-guide`, `/worker/cancellation-policy`).
      - `EMPLOYER_GROUP_PUBLIC` — `Đăng ca tuyển` points to `/how-it-works` (instead of protected `/employer/shifts/new`); `Quản lý ứng viên` points to `/user-guide` (instead of protected `/employer/dashboard`); the other two items already had public destinations (`/employer/payments`, `/employer/reviews`).
      `<PublicNav>` now renders these public variants when `role === null`. The role-aware `<WorkerNav>` / `<EmployerNav>` / `<AdminNav>` surfaces continue to use the original groups (with protected routes). The actual protected routes still require login when visited directly — `RoleGuard` is unchanged.
      `MobileNav.tsx` `PUBLIC_SECTIONS` updated symmetrically: `Lịch cá nhân` → `/user-guide`, `Đăng ca tuyển` → `/how-it-works`, `Quản lý ứng viên` → `/user-guide`. Logged-in worker / employer / admin drawer trees keep their existing protected-route hrefs.
    - **C. Public motion + visual rhythm utilities** added to `globals.css`:
      - `@keyframes motion-fade-up` + `.motion-fade-up` — lighter cousin of `.entrance-up` (360 ms vs 520 ms) for staggered entrance reveals where many cards appear together.
      - `.cta-arrow-nudge` — wrap a Link/Button in this class and an inner `<span class="cta-arrow">…</span>`; the arrow translates 4 px right on hover/focus. Added to: homepage "Xem hướng dẫn chi tiết" pill, homepage Safety section card grid, every `<InfoPage>` CTA button. Reads as "click invites motion" without full-card animation.
      - `@keyframes gradient-drift` + `.gradient-drift` — slow (18 s) low-amplitude background-position drift for warm gradient washes. Defined but applied opt-in only — currently no surface uses it; available for future hero / cta-band polish if desired.
      - `.public-section-rhythm` — vertical-padding utility (56 px mobile, 80 px `md+`) for consistent public marketing rhythm. Available, not yet applied to existing sections (which already carry their own padding rules — kept as-is to avoid layout shift).
      All four utilities respect `prefers-reduced-motion: reduce` via the existing media query block (extended to suppress `.motion-fade-up` opacity/transform and `.cta-arrow-nudge .cta-arrow` translate). Dashboards are intentionally not touched — Phase 9Y-Fix-3's "dashboard overviews stay clean" rule preserved.
    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence / payment changes. RoleGuard still protects the actual private routes when accessed directly. Phase 9Z `<RouteBackdrop>` + `.info-page-hero`, Phase 9Z-Fix-2 `.info-content` / `.info-section-card` / `.info-step-card`, Phase 9X canonical z-index map, Phase 9Y-Fix-3 dashboard cleanliness — all preserved exactly. Reduced motion: every new keyframe and transition is added to the existing `prefers-reduced-motion: reduce` block.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9Z-Fix-3):**
      - `src/app/globals.css` — `.info-content` gained matching horizontal padding; new `.motion-fade-up`, `.cta-arrow-nudge` + `.cta-arrow`, `.gradient-drift`, `.public-section-rhythm` utilities; reduced-motion block extended.
      - `src/components/layout/NavBar.tsx` — added `WORKER_GROUP_PUBLIC` and `EMPLOYER_GROUP_PUBLIC`; `<PublicNav>` now uses the public variants. Original `WORKER_GROUP` / `EMPLOYER_GROUP` preserved for role-aware nav.
      - `src/components/layout/MobileNav.tsx` — `PUBLIC_SECTIONS` worker + employer hrefs re-pointed to public guide pages.
      - `src/components/layout/InfoPage.tsx` — CTA buttons gained `.cta-arrow-nudge` + inner `<span class="cta-arrow">→</span>`.
      - `src/app/page.tsx` — homepage "Xem hướng dẫn chi tiết" pill + Safety card grid gained `.cta-arrow-nudge`; existing `<ArrowRightIcon />` calls wrapped in `<span class="cta-arrow">`.
      - `HANDOFF.md`, `VISUAL_QA.md`.

49. **Phase 9Z-Fix-4 — User-friendly guide copy + feature-specific anchor sections** *(2026-05-24, Phase 9Z-Fix-4)*. Phase 9Z-Fix-3 re-pointed the logged-out worker / employer dropdowns to public guide pages, but manual QA found the guide pages still read as developer prose: every step on `/user-guide` referenced raw route paths (`/register`, `/worker/profile`, `/worker/dashboard`, `/worker/schedule`, `/employer/profile`, `/employer/shifts/new`, `/employer/shifts/[id]`, `/shifts`, `/disputes`) instead of the visible UI labels a normal Vietnamese user would actually look for. Phase 9Z-Fix-3's nav also dropped readers at the top of a long generic guide instead of on the specific feature they clicked. Phase 9Z-Fix-4 closes both gaps:

    - **A. Raw route paths scrubbed from `/user-guide` body copy.** All 8 step bodies (4 worker, 4 employer) plus the dispute FAQ rewrote URLs into UI-label phrasing:
      - `Tại /register, chọn ...` → `Mở trang Đăng ký, chọn ...`
      - `Tại /worker/profile, thêm ...` → `Mở mục Hồ sơ trong menu Người lao động và bổ sung ...`
      - `Vào /shifts để xem ...` → `Bấm "Tìm ca làm" trên thanh điều hướng để xem ...`
      - `Đến giờ ca, vào /worker/dashboard và bấm Check-in.` → `Đến giờ ca, mở trang Tổng quan của người lao động, chọn ca sắp diễn ra và bấm Check-in.`
      - `Tại /employer/profile thêm ...` → `Mở mục Hồ sơ trong menu Nhà tuyển dụng và bổ sung ...`
      - `Vào /employer/shifts/new ...` → `Trong menu Nhà tuyển dụng, chọn "Đăng ca tuyển" ...`
      - `Đơn ứng tuyển hiện trên /employer/shifts/[id] và ô "Đơn chờ duyệt" trên Tổng quan ...` → `Đơn ứng tuyển hiển thị trong trang quản lý chi tiết của ca tuyển và trong ô "Đơn chờ duyệt" trên Tổng quan của nhà tuyển dụng ...`
      - FAQ "Tôi cần làm gì khi có tranh chấp?" no longer mentions `/disputes` directly — it now reads `... theo trang Chính sách xử lý tranh chấp` (the disputes page is reachable via the footer / safety dropdown).

    - **B. Five feature-anchor sections added to `/user-guide`.** New `<FeatureGuide>` server-component primitive (defined inline in `src/app/user-guide/page.tsx`) renders an `id`-anchored card with `scroll-mt-24` so the sticky header doesn't cover the heading after a hash deep-link. Each card carries an eyebrow, a title in plain Vietnamese, 3–4 explanatory bullets, and a primary "Đăng nhập" CTA + optional secondary CTA to a related public page. The five sections, in render order:
      - `#worker-schedule` — "Lịch cá nhân hoạt động như thế nào?" — explains busy-time blocks and the apply-time conflict gate. CTAs: Đăng nhập, Tìm ca làm.
      - `#worker-reputation` — "Điểm uy tín của người lao động" — explains the 100-point start, +5 / −20 / −10 mechanics, threshold 50. CTAs: Đăng nhập, Hồ sơ & điểm uy tín.
      - `#employer-post-shift` — "Đăng ca tuyển diễn ra như thế nào?" — explains shift fields, deposit ratios (100/70/50%), publish gate. CTAs: Đăng nhập, Xem cách đặt cọc.
      - `#employer-applicants` — "Quản lý ứng viên như thế nào?" — explains review profile, duyệt / từ chối kèm lý do, xác nhận hoàn thành. CTAs: Đăng nhập, Xem quy trình tuyển dụng.
      - `#employer-payments` — "Đặt cọc và thanh toán" — explains hold-then-release escrow, MVP simulation. CTAs: Tìm hiểu cấp độ tin cậy, Đăng nhập.
      All five sit at the top of the guide content, above the 9-step worker / employer timelines, so deep-link users land on the targeted explanation immediately. Existing timelines preserved for users who scroll the full guide.

    - **C. Public nav anchors updated.** `WORKER_GROUP_PUBLIC` (`Lịch cá nhân` → `/user-guide#worker-schedule`) and `EMPLOYER_GROUP_PUBLIC` (`Đăng ca tuyển` → `/user-guide#employer-post-shift`, `Quản lý ứng viên` → `/user-guide#employer-applicants`) in `src/components/layout/NavBar.tsx` updated. `MobileNav.tsx` `PUBLIC_SECTIONS` updated symmetrically. Logged-in role-aware nav (`WORKER_GROUP`, `EMPLOYER_GROUP`, `WORKER_SECTIONS`, `EMPLOYER_SECTIONS`, `ADMIN_SECTIONS`) is unchanged — workers / employers / admins continue to navigate to the real protected app routes.

    - **D. RoleGuard non-regression.** All 8 protected page routes (`worker/schedule`, `worker/profile`, `worker/dashboard`, `employer/shifts/new`, `employer/shifts/[id]`, `employer/schedule`, `employer/profile`, `employer/dashboard`) still wrap their content in `<RoleGuard role="...">`. Direct URL access while logged out still bounces to `/login`. The marketing-time entry point change is purely cosmetic — auth protection is unchanged.

    - **Editorial rule going forward** *(documented as a new Section 11 rule below):* user-facing guide / info / help copy must not contain raw route paths. Always reference visible page names, menu labels, button text, or section headings. Internal route strings live in `href={...}` props and other technical contexts where they're not user-visible.

    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence / payment changes. RoleGuard unchanged. Phase 9Z `<RouteBackdrop>`, Phase 9Z-Fix-2 `.info-content` / `.info-section-card` / `.info-step-card`, Phase 9Z-Fix-3 public-variant nav groups + `.cta-arrow-nudge` motion polish, Phase 9Y-Fix-3 dashboard cleanliness — all preserved exactly. Reduced motion: the new `<FeatureGuide>` primary CTA carries `.cta-arrow-nudge`, which is already short-circuited under `prefers-reduced-motion: reduce`.
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9Z-Fix-4):**
      - `src/app/user-guide/page.tsx` — all 8 step bodies + the dispute FAQ scrubbed of raw route paths; new `<FeatureGuide>` server-component primitive defined inline; 5 anchored feature sections rendered above the timelines; `Link` import added.
      - `src/components/layout/NavBar.tsx` — `WORKER_GROUP_PUBLIC` `Lịch cá nhân` href → `/user-guide#worker-schedule`; `EMPLOYER_GROUP_PUBLIC` `Đăng ca tuyển` href → `/user-guide#employer-post-shift`; `EMPLOYER_GROUP_PUBLIC` `Quản lý ứng viên` href → `/user-guide#employer-applicants`. Description copy slightly clarified.
      - `src/components/layout/MobileNav.tsx` — `PUBLIC_SECTIONS` worker + employer entries updated to the same anchor URLs.
      - `HANDOFF.md`, `VISUAL_QA.md`.

50. **Phase 9Z-Fix-5 — HelpPopover deep-links to specific guide anchors + enriched guide examples** *(2026-05-24, Phase 9Z-Fix-5)*. Phase 9Y-Fix-3 moved every dashboard stat-tile help into the corresponding detail-modal `titleAccessory` slot, and Phase 9Z-Fix-4 added five feature anchors to `/user-guide`. But the HelpPopover CTAs still defaulted to a generic `/user-guide` link, dropping users at the top of the guide instead of on the section that explains the metric they just clicked on. Phase 9Z-Fix-5 closes that gap and makes every guide section concrete enough for non-developer users.

    - **A. HelpPopover already supports `learnMoreHref`** (Phase 9Y-Fix introduced the prop with a `'/user-guide'` default). Phase 9Z-Fix-5 didn't change the API — it threaded a specific anchor URL through every dashboard call site so the default fallback no longer applies in practice.
    - **B. 9 new feature-anchor sections added to `/user-guide`** — one per dashboard stat that didn't already have a matching anchor:
      - `#worker-completed-shifts` — "Ca đã hoàn thành là gì?"
      - `#worker-total-income` — "Tổng thu nhập được tính như thế nào?"
      - `#worker-cancellation-quota` — "Hạn mức huỷ tuần là gì?"
      - `#employer-active-shifts` — "Ca đang hoạt động là gì?"
      - `#employer-pending-applications` — "Đơn chờ duyệt là gì?"
      - `#employer-posted-shifts` — "Ca đã đăng gồm những gì?"
      - `#employer-completed-shifts` — "Ca đã hoàn thành là gì?"
      - `#employer-total-deposit` — "Tổng đã đặt cọc được tính như thế nào?"
      - `#employer-total-paid` — "Tổng đã thanh toán là gì?"
      The two existing anchors (`#worker-reputation`, `#worker-schedule`, `#employer-post-shift`, `#employer-applicants`, `#employer-payments` from Phase 9Z-Fix-4) were also enriched with example + nextAction blocks (see point D).
    - **C. HelpPopover-to-anchor mapping wired** on every dashboard call site:
      | Surface | Title | `learnMoreHref` |
      |---|---|---|
      | Worker dashboard | Điểm uy tín | `/user-guide#worker-reputation` |
      | Worker dashboard | Ca đã hoàn thành | `/user-guide#worker-completed-shifts` |
      | Worker dashboard | Tổng thu nhập | `/user-guide#worker-total-income` |
      | Worker dashboard | Hạn mức huỷ tuần | `/user-guide#worker-cancellation-quota` |
      | Employer dashboard | Ca đang hoạt động | `/user-guide#employer-active-shifts` |
      | Employer dashboard | Đơn chờ duyệt | `/user-guide#employer-pending-applications` |
      | Employer dashboard | Tất cả ca đã đăng | `/user-guide#employer-posted-shifts` |
      | Employer dashboard | Ca đã hoàn thành | `/user-guide#employer-completed-shifts` |
      | Employer payments modal title | Tóm tắt thanh toán & đặt cọc | `/user-guide#employer-total-deposit` |
      | Employer payments modal — Tổng đã đặt cọc inline | (per-amount) | `/user-guide#employer-total-deposit` |
      | Employer payments modal — Tổng đã thanh toán inline | (per-amount) | `/user-guide#employer-total-paid` |
      The shared payments modal (opened by both deposit and paid-out tiles) now exposes per-amount HelpPopovers inline next to each `<dt>` so the user gets the right deep-link based on which amount they're examining. The modal-title popover targets the deposit anchor (the deposit half is the larger conceptual surface).
    - **D. `<FeatureGuide>` primitive extended** with two new optional props:
      - `example?: string` — renders a tinted "Ví dụ:" callout below the bullets so real users see exactly how the feature works on a representative case (e.g. for "Tổng thu nhập": "Bạn hoàn thành 2 ca: một ca 4 giờ với lương 45.000 đ/giờ (tổng 180.000 đ) và một ca 5 giờ với lương 60.000 đ/giờ (tổng 300.000 đ). Sau khi cả hai được xác nhận, ô Tổng thu nhập tăng thêm 480.000 đ.").
      - `nextAction?: string` — renders a small "Tiếp theo:" line so users know what to do once they understand the concept (e.g. "Bấm vào ô Tổng thu nhập trên Tổng quan người lao động để xem danh sách các ca và số tiền nhận được gần đây.").
      `primaryCta` was made optional too — sections targeted by in-app HelpPopover CTAs (worker / employer dashboard stats) don't need a redundant "Đăng nhập" pill since the user is already authenticated. The five public-nav anchors (Phase 9Z-Fix-4) keep their Đăng nhập CTAs.
    - **E. New `<GuideGroup>` primitive** for visual grouping. The 14 feature cards on `/user-guide` are now organised into three thematic groups with eyebrow + title + lead text:
      - **"Dành cho người lao động"** (5 cards): worker-schedule, worker-reputation, worker-completed-shifts, worker-total-income, worker-cancellation-quota.
      - **"Dành cho nhà tuyển dụng"** (5 cards): employer-post-shift, employer-applicants, employer-active-shifts, employer-pending-applications, employer-posted-shifts, employer-completed-shifts.
      - **"Thanh toán, đặt cọc và uy tín"** (3 cards): employer-payments, employer-total-deposit, employer-total-paid.
      Reads as three distinct audiences rather than one wall of cards. The 9-step worker / employer timelines + FAQ remain below the grouped cards, untouched.
    - **F. Anchor scroll behaviour preserved** — every `<FeatureGuide>` carries `scroll-mt-24` (Phase 9Z-Fix-4) so the anchored heading is fully visible after a hash deep-link, not covered by the sticky `z-30` header. Mobile inherits the same behaviour.
    - **G. JSX quote escape note.** The "Quản lý ứng viên" example mentions a rejection reason in quotes. Inside a JSX `attribute="..."` literal, ASCII `"..."` nested quotes break the parser. Phase 9Z-Fix-5 uses Vietnamese guillemets `«...»` for the inner quote to preserve readability without breaking the build.
    - **Constraints honored.** No new dependencies. No schema bump (still v4). No business-logic / store / persistence / payment / calculation changes. RoleGuard unchanged. HelpPopover API unchanged (the `learnMoreHref` prop already existed). Phase 9Z `<RouteBackdrop>`, Phase 9Z-Fix-2 InfoPage utilities, Phase 9Z-Fix-3 public-variant nav + `.cta-arrow-nudge`, Phase 9Z-Fix-4 5 anchor sections — all preserved exactly. Reduced motion still works (no new keyframes added).
    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged).
    - **Files changed (Phase 9Z-Fix-5):**
      - `src/app/user-guide/page.tsx` — `<FeatureGuide>` extended with `example` + `nextAction`; `primaryCta` made optional; new `<GuideGroup>` primitive; 9 new anchored sections + 5 existing sections enriched with example + nextAction; layout regrouped into three thematic groups; `ReactNode` import added.
      - `src/app/worker/dashboard/page.tsx` — 4 dashboard HelpPopovers gained specific `learnMoreHref` props.
      - `src/app/employer/dashboard/page.tsx` — 4 list-modal HelpPopovers gained specific `learnMoreHref` props; payments modal title popover targets the deposit anchor; payments modal body now renders per-amount HelpPopovers inline next to each `<dt>` for deposit and paid-out, each with its own deep link.
      - `HANDOFF.md`, `VISUAL_QA.md`.

51. **Phase 10A — Verification data model + admin queue + per-role profile UI** *(2026-05-25, Phase 10A)*. First foundation phase for real-user-grade verification. Replaces the boolean `worker.verifications: ('phone' | 'id' | 'student')[]` flag-list (which was sufficient for the demo but doesn't carry document state, review status, or employer-side documents) with a real model: per-document submissions, status lifecycle, admin review queue, role-aware profile UIs, and privacy-respecting applicant badges.

    - **A. Verification data model** added to `src/types/index.ts`:
      - `VerificationStatus` — `'NotSubmitted' | 'Pending' | 'Approved' | 'Rejected' | 'NeedsMoreInfo'`. Drives every status badge across the app.
      - `WorkerIdentityDocumentType` — `'NationalId' | 'StudentCard' | 'DriverLicense'`. **Workers are NOT required to use CCCD specifically** — any one of the three is sufficient.
      - `WorkerVerificationDocument` — full submission record with `status`, `displayLabel`, `fullIdentifier` (admin-only), `maskedIdentifier` (public-safe), mock image fields, review timestamps, rejection reason, etc.
      - `EmployerType10A` — widens the Phase 6 binary `'individual' | 'business'` to four real-market shapes: `'Individual' | 'HouseholdBusiness' | 'Company' | 'AgencyEvent'`.
      - `EmployerVerificationDocumentType` — 8 doc types covering representative ID, business license, tax code, storefront/workplace photos, event proof, address proof, Google Maps / fanpage link.
      - `EmployerVerificationDocument` — same shape as worker, plus `employerType` snapshotted at submission time.
      - `WorkerTrustBadge` / `EmployerTrustBadge` enums + summary types (`WorkerVerificationSummary`, `EmployerVerificationSummary`) carrying derived badges + identity-verified flag + masked identifier for public-safe consumers.

    - **B. Verification store** at `src/stores/verificationStore.ts`. Holds two slices (`workerDocuments`, `employerDocuments`) and exposes:
      - **Worker actions:** `submitWorkerDocument(workerId, payload)`, `approveWorkerDocument(id, adminId)`, `rejectWorkerDocument(id, adminId, reason)`, `requestMoreWorkerInfo(id, adminId, reason)`. Reject / requestMoreInfo require non-empty reason; the store returns `Result<doc, 'NOT_FOUND' | 'REASON_REQUIRED' | 'ALREADY_REVIEWED'>`.
      - **Employer actions:** symmetric — `submitEmployerDocument`, `approveEmployerDocument`, `rejectEmployerDocument`, `requestMoreEmployerInfo`.
      - **Selectors (pure helpers, exported alongside the store):** `getWorkerVerificationSummary(worker, docs)`, `getEmployerVerificationSummary(employerId, type, docs, hasPhone, depositRequired, trusted)`, `getPendingWorkerVerifications`, `getPendingEmployerVerifications`, `getRecentVerificationHistory(workerDocs, employerDocs, limit)`. Pure functions so consumers can `useMemo` over stable raw arrays — no Zustand fresh-array hazard.
      - **Display helpers:** `workerDocLabel(t)`, `employerDocLabel(t)`, `employerTypeLabel(t)`, `verificationStatusLabel(s)`, `verificationStatusTone(s)`. Single source of truth for the Vietnamese display strings + `<Badge>` tones.
      - **`hydrate(workerDocs, employerDocs)`** — called by `AppHydrator` on boot.

    - **C. Persistence schema bumped from 4 → 5.** `src/data/persistence.ts` now persists `workerVerifications` and `employerVerifications` slices. Existing demo data is auto-reseeded on first boot after the version bump (the existing `loadAll()` mechanism handles this — no manual migration needed). New storage keys: `cale.workerVerifications`, `cale.employerVerifications`.

    - **D. Seed data** at `src/data/seed/verifications.json`. Six demo records covering the spec's required mix:
      - **Workers (4 records):** worker-001 NationalId Approved, worker-002 StudentCard Approved, worker-003 DriverLicense Pending, worker-004 NationalId NeedsMoreInfo (with rejection reason).
      - **Employers (8 records):** employer-001 (HouseholdBusiness — RepresentativeId + BusinessLicense + StorefrontPhoto, all Approved), employer-002 (Company — BusinessLicense + TaxCode + StorefrontPhoto, all Approved), employer-003 (AgencyEvent — BusinessLicense Pending + EventProof NeedsMoreInfo).

    - **E. Admin verification queue** at `src/app/admin/dashboard/VerificationsPanel.tsx`. New "Xác minh" tab on `/admin/dashboard` (added to the Tab union + tab strip + URL-validation lists). Three subsections render in order: Pending workers, Pending employers, Recent review history (last 10 reviewed actions). Each card surfaces:
      - User/employer name + email + phone + account type
      - Document type badge + submitted timestamp
      - **Full identifier** (admin-only) plus the public-facing masked form below it for transparency
      - Mock document preview area showing image URLs / file names with a "Mô phỏng — không có upload thật" note
      - Rejection reason (if NeedsMoreInfo)
      - Three action buttons: Duyệt / Từ chối / Yêu cầu bổ sung
      - Reject + RequestMoreInfo open a Modal collecting the reason; submit fires the store action and pushes a notification to the affected user with a deep link to their profile

    - **F. Worker profile** at `src/app/worker/profile/page.tsx`. New `<WorkerIdentityVerificationCard>` rendered between the existing legacy "Xác minh" toggle card (kept for the boolean `verifications` flag-list — not removed because other parts of the app still read it) and the "Thống kê" stats card. Card shows three rows (CCCD / Thẻ sinh viên / Bằng lái) each with status badge + description + "Gửi tài liệu (mô phỏng)" or "Gửi lại" button. Uses real visible UI labels: "Bạn có thể xác minh danh tính bằng CCCD/CMND, thẻ sinh viên hoặc bằng lái xe." Privacy footer reminds that admins are the only ones who see full documents.

    - **G. Employer profile** at `src/app/employer/profile/page.tsx`. New `<EmployerVerificationCard>` rendered between the main profile card and the existing worker-feedback panel. Account-type selector with four options + per-type hint copy (the Individual hint reads exactly the spec text: "Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và đặt cọc 100% tiền công."). Below the selector, a per-type doc list with status + submit-mock buttons. A "Tất cả tài liệu đã gửi" history section lists every document the employer has ever submitted with type, account-shape, date, and status. MVP-mock disclaimer at the bottom.

    - **H. Privacy boundary on applicant view.** `<WorkerSummaryRow>` (`src/components/user/WorkerSummaryRow.tsx`) gained an optional `identityBadge?: { methodLabel; maskedIdentifier? }` prop. When present, renders a green "Đã xác minh · {method} · {masked}" chip below the name. The manage-shift page (`/employer/shifts/[id]`) computes `getWorkerVerificationSummary(worker, workerDocs)` per row and passes the public-safe subset only — employers never see full document images, only the badge + method label + masked identifier (e.g. `0791•••••234`). This is the single source of truth for the "no full document leak to employers" rule.

    - **I. Notifications.** Every admin action (approve / reject / request-more-info) fires a `useNotificationStore.push()` to the affected user with title + body + `link` deep-pointed at their profile (`/worker/profile` or `/employer/profile`). Notification kind is reused from the existing `'ReputationAdjusted'` enum so the existing notification UI handles it without a new kind being added — pragmatic for Phase 10A since the visual treatment in `NotificationBell` already handles arbitrary titles. A future phase can add a dedicated `'VerificationDecided'` kind if desired.

    - **J. Toasts.** Admin actions show success/error toasts using the existing `showSuccess` / `showError` helpers. Reason-required + already-reviewed errors surface clear Vietnamese messages.

    - **K. /user-guide section.** New `<FeatureGuide id="verification-overview">` card under a new "Xác minh và quyền riêng tư" group. Bullets cover the three worker methods, four employer types, the privacy boundary (admin-only full doc), and the on-site recheck possibility. Concrete example reads: "Bạn xác minh bằng CCCD. Trong danh sách ứng viên của nhà tuyển dụng, họ sẽ thấy chip xanh «Đã xác minh · CCCD / CMND · 0791•••••234». Họ KHÔNG thấy ảnh CCCD đầy đủ của bạn."

    - **L. Shift posting "bring verified document on-site" option** — **deferred to Phase 10B** per the spec's explicit allowance ("If too large for 10A, add data field + UI placeholder and document as 10B follow-up"). Phase 10A ships without the field; the data model is ready (the existing `Shift.requirements` free-text field can carry the message in the interim, or a typed `requireOnSiteIdMatch?: boolean` field can be added in 10B without schema risk since the seed/fallback path defaults missing fields gracefully).

    - **Constraints honored.** No new dependencies. **Schema bumped 4 → 5** (allowed by the spec). No business-logic / payment / formula changes. RoleGuard unchanged. Phase 9Z RouteBackdrop, Phase 9Z-Fix-2 InfoPage utilities, Phase 9Z-Fix-3 nav, Phase 9Z-Fix-4 anchors, Phase 9Z-Fix-5 HelpPopover deep-links — all preserved exactly. The new badges + admin queue use existing `<Badge>` / `<Card>` / `<Modal>` / `<Button>` / `<Textarea>` primitives, no new component dependencies.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged — no new routes added). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged — pure presentational + content + new store actions). The new store has no PBT yet; future work could add property-based tests for the review-action state machine.

    - **Files changed (Phase 10A):**
      - `src/types/index.ts` — verification model (5 enums + 4 interfaces + 2 summary types).
      - `src/data/persistence.ts` — schema bumped to 5; new storage keys; load/persist wiring.
      - `src/data/seed/verifications.json` — NEW. 4 worker + 8 employer seed records.
      - `src/stores/verificationStore.ts` — NEW. Full store + selectors + display helpers.
      - `src/stores/index.ts` — re-export verification store + helpers + types.
      - `src/components/layout/AppHydrator.tsx` — hydrate the verification slice.
      - `src/app/admin/dashboard/VerificationsPanel.tsx` — NEW. Admin queue UI.
      - `src/app/admin/dashboard/page.tsx` — added `verifications` tab + tab button + URL validation list.
      - `src/i18n/vi.ts` — `admin.dashboard.tabs.verifications` label.
      - `src/components/user/WorkerSummaryRow.tsx` — optional `identityBadge` prop + green chip render.
      - `src/app/employer/shifts/[id]/page.tsx` — compute `getWorkerVerificationSummary` per applicant row, pass public-safe subset to `<WorkerSummaryRow>`.
      - `src/app/worker/profile/page.tsx` — `<WorkerIdentityVerificationCard>` helper added in the aside column.
      - `src/app/employer/profile/page.tsx` — `<EmployerVerificationCard>` helper added between main card and feedback list.
      - `src/app/user-guide/page.tsx` — new `verification-overview` anchor section under "Xác minh và quyền riêng tư" group.
      - `HANDOFF.md`, `VISUAL_QA.md`.

52. **Phase 10A-Fix-1 — Clickable history details, locked employer type, type-change request flow, admin-side submission notifications** *(2026-05-25, Phase 10A-Fix-1)*. Manual QA after 10A flagged three concrete gaps. This phase closes them while preserving the privacy boundary (admin sees full docs; employer/worker do not).

    - **A. Clickable verification history rows.** `<VerificationsPanel>` history cards are now keyboard-focusable buttons that open a detail Modal (admin-only). The new `<HistoryDetailBody>` helper renders: account name + role + (for employers) account-shape, document type label, status badge, submitted/reviewed timestamps with admin ID, rejection reason, notes, full identifier (admin-only) with masked-form readout, and the mock front/back/selfie image fields or file name. ESC + outside click + an explicit "Đóng" button all dismiss.

    - **B. Locked employer type with first-set onboarding.** `Employer` gained a new optional canonical field `employerType10A?: EmployerType10A`. The legacy `employerType?: 'individual' | 'business'` field is preserved for back-compat — the new `resolveEmployerType(employer)` helper falls back to it when the new field is missing (`'individual' → 'Individual'`, `'business' → 'HouseholdBusiness'`). Two render branches:
      - **Onboarding (no resolved type):** the employer profile renders a one-time "Xác nhận và khoá loại tài khoản" picker — selecting + confirming writes `employerType10A` to the user record via `userStore.updateUser` and locks the field.
      - **Locked display (type resolved):** the previous free type-selector is replaced with a read-only orange-bordered card showing "Loại tài khoản hiện tại: {type}" + the per-shape hint copy + a "Yêu cầu đổi loại tài khoản" CTA. Clicking the CTA opens a Modal collecting the requested new type (filtered to exclude the current one) + a required reason; submit fires `submitEmployerTypeChangeRequest`.

    - **C. Type-change request store extension.** `verificationStore` gained:
      - New persisted slice `typeChangeRequests: EmployerTypeChangeRequest[]`.
      - Actions: `submitEmployerTypeChangeRequest(employerId, currentType, requestedType, reason)`, `approveEmployerTypeChangeRequest(requestId, adminId)`, `rejectEmployerTypeChangeRequest(requestId, adminId, adminReason)`. All return `Result<request, VerifyError>`. Submit checks `SAME_TYPE`, `REASON_REQUIRED`, and `ALREADY_PENDING` (one Pending per employer at a time). Approve/Reject check `NOT_FOUND` and `ALREADY_REVIEWED`.
      - **On approval**, the admin queue handler calls `updateUser(employerId, { employerType10A: requestedType })` to flip the employer record. Existing approved documents stay in the DB; the doc list adapts to the new type's required set automatically because `TYPE_DOC_OPTIONS[type]` drives the rendering. Documents that no longer apply are still visible in the "Tất cả tài liệu đã gửi" history but don't count toward the current required-doc list.
      - Helpers: `getPendingTypeChangeRequest(employerId, requests)`, `getPendingTypeChangeRequests(requests)`, `resolveEmployerType(employer)`.

    - **D. Admin queue subsection** "Yêu cầu đổi loại tài khoản" rendered between the "Nhà tuyển dụng chờ duyệt" section and "Lịch sử duyệt gần đây". Each request card shows employer name + email/phone, current → requested type chips, submitted timestamp, reason callout, and Duyệt / Từ chối buttons. Reject opens a Modal collecting the admin reason (required). Notifications fire to the employer on both decisions; toasts confirm the admin action.

    - **E. Onboarding integration deferral.** Per the spec's allowance ("If registration type is too large for this phase, implement first-set lock in employer profile"), Phase 10A-Fix-1 ships the first-set lock in the **profile** only — `/register` is unchanged. The first time an employer with no `employerType10A` opens their profile, they pick a shape; subsequent visits show the locked display. Documented as a Phase 10B follow-up to wire the registration form to the canonical field directly.

    - **F. Admin notifications on every submission.** New `src/lib/adminNotifications.ts` `notifyAdmins({ users, push, kind, title, body, link })` helper iterates every active admin and pushes a notification (default link points to `/admin/dashboard?tab=verifications`). Three call sites:
      - **Worker profile** (`/worker/profile`) — when worker submits a doc, notify admins with title "Có yêu cầu xác minh mới" and body "{workerName} đã gửi xác minh bằng {documentType}."
      - **Employer profile** (`/employer/profile`) — when employer submits a doc, notify admins with title "Nhà tuyển dụng gửi xác minh mới" and body "{employerName} đã gửi tài liệu {documentType}."
      - **Employer profile type-change submit** — title "Có yêu cầu đổi loại tài khoản" and body "{employerName} muốn đổi từ {currentType} sang {requestedType}."
      Notification kind reuses `'ReputationAdjusted'` (the existing catch-all) for now — a dedicated `'VerificationDecided'` / `'VerificationSubmitted'` kind is a clean Phase 10B addition.

    - **G. Profile copy** updated per spec: locked card explanation reads literally "Loại tài khoản dùng để xác định giấy tờ cần xác minh. Bạn không thể tự đổi loại tài khoản sau khi đã chọn. Nếu chọn nhầm hoặc mô hình hoạt động thay đổi, hãy gửi yêu cầu để quản trị viên xem xét." Individual hint preserved from 10A: "Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và đặt cọc 100% tiền công."

    - **H. Privacy boundary preserved.** Admin: full mock docs visible in queue + history detail Modal. Worker: own docs in worker profile (own data only). Employer: own docs in employer profile (own data only). Public-facing applicant view continues to show only `<WorkerSummaryRow identityBadge>` chip with method label + masked identifier. The new history-detail Modal is mounted inside `<VerificationsPanel>` which lives behind `RoleGuard role="admin"` on `/admin/dashboard`.

    - **Constraints honored.** No new dependencies. **Schema bumped 5 → 6** to make the new `employerTypeChangeRequests` slice persist cleanly. The 10A-fix on existing `Employer.employerType10A` field uses optional fallback semantics — no migration code needed because the resolveEmployerType helper handles missing fields. RoleGuard unchanged. HelpPopover, dashboard cleanup, info-page utilities, public motion polish — all preserved.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **40/40 tests passing in 4 files** (unchanged — pure store + UI additions).

    - **Files changed (Phase 10A-Fix-1):**
      - `src/types/index.ts` — added `Employer.employerType10A?` field; new `EmployerTypeChangeRequest` interface.
      - `src/data/persistence.ts` — schema bumped 5 → 6; new `employerTypeChangeRequests` storage key; load/persist wiring.
      - `src/stores/verificationStore.ts` — added type-change request slice + actions + `resolveEmployerType` + `getPendingTypeChangeRequest(s)` helpers; extended `VerifyError` enum.
      - `src/stores/index.ts` — re-export new helpers.
      - `src/components/layout/AppHydrator.tsx` — hydrate the new slice.
      - `src/lib/adminNotifications.ts` — NEW helper for cross-admin fan-out.
      - `src/app/admin/dashboard/VerificationsPanel.tsx` — clickable history rows + `<HistoryDetailBody>` modal + new "Yêu cầu đổi loại tài khoản" subsection + handlers + rejection-reason modal.
      - `src/app/worker/profile/page.tsx` — admin notification on document submit.
      - `src/app/employer/profile/page.tsx` — locked-type read-only card + first-set onboarding picker + change-request Modal + admin notifications on doc submit and on type-change submit.
      - `HANDOFF.md`, `VISUAL_QA.md`.

53. **Phase 10A-Fix-2 — Adaptive toast duration + employer type backfill + posting guard** *(2026-05-25, Phase 10A-Fix-2)*. Three concrete polish items emerged after 10A-Fix-1 manual QA: (1) long Vietnamese toast copy was being dismissed before users could read it, (2) seeded employer accounts hadn't been backfilled with `employerType10A`, so opening the employer profile (or hitting the new posting guard) on a freshly-seeded environment misleadingly showed the first-set picker, and (3) the new-shift page didn't refuse to render `<ShiftForm>` for accounts with no resolvable type.

    - **A. Adaptive toast auto-dismiss.** `src/stores/toastStore.ts` introduces `computeAdaptiveDuration(tone, title, description)` and exports `MIN_DURATION_MS = 3000` / `MAX_DURATION_MS = 9000`. Formula: `base + 12ms * max(0, length - 40)`, clamped to the bounds. Per-tone bases bumped — `warning` 4000 → 5000 to match `error`, since warnings carry comparable cognitive load; `success` (3000) and `info` (4000) unchanged. `show()` calls the adaptive function only when the caller does not pin a `duration` value, so explicit numbers (including the sticky `0`) pass through verbatim. Dedupe, cap, and scope behaviour all preserved.

    - **B. Seed backfill + schema bump.** `src/data/seed/users.json` adds `employerType10A` to all three seeded employers: `employer-001 Quán Phở Hà → "HouseholdBusiness"`, `employer-002 Cafe Cộng Sài Gòn → "Company"`, `employer-003 Sự kiện Vinh Quang → "AgencyEvent"`. `src/data/persistence.ts` bumps `SCHEMA_VERSION` from 6 → 7 so existing dev/demo localStorage state reseeds and picks up the new fields. No migration code is needed — the load path discards the old snapshot and writes the seed fresh whenever `cale.schemaVersion` doesn't match.

    - **C. `resolveEmployerType` hardened.** `src/stores/verificationStore.ts` extends the helper to accept an optional second argument: `resolveEmployerType(employer, options: { hasPostedShifts?: boolean } = {})`. When the employer has neither `employerType10A` nor legacy `employerType` set AND `hasPostedShifts: true`, the helper falls back to `'HouseholdBusiness'` instead of returning `undefined`. Rationale: an established account that has already posted shifts must never be punted back to the first-set picker; if the type really is wrong, the canonical path is the type-change-request flow. Truly-new accounts (no type, no shifts) still return `undefined` and trigger the picker / posting guard.

    - **D. Posting guard for `/employer/shifts/new`.** `src/app/employer/shifts/new/page.tsx` now computes `hasPostedShifts` from `useShiftStore` and resolves the employer's type via `resolveEmployerType(employer, { hasPostedShifts })`. When the result is `undefined` (truly-new account, no type, no shifts), the page renders an early-return `<Card>` with the message "Vui lòng chọn loại tài khoản nhà tuyển dụng trước khi đăng ca." plus a CTA `<Link href="/employer/profile">` labeled "Mở Hồ sơ nhà tuyển dụng". The deposit explainer, form, and deposit-confirm flow are skipped entirely until the type is set. Established accounts and seeded employers fall through the guard untouched.

    - **E. Employer profile wired to the same guard.** `src/app/employer/profile/page.tsx` now imports `useShiftStore`, computes `hasPostedShifts` per-employer via `useMemo`, and passes `{ hasPostedShifts }` into `resolveEmployerType(...)`. Result: the seeded employer accounts (and any future established account that somehow lost its `employerType10A`) always see the locked display, never the first-set picker. The picker still appears for genuinely-new accounts with no shifts.

    - **F. Tests added.** `src/__tests__/toastStore.test.ts` adds a new `describe('toastStore.computeAdaptiveDuration — Phase 10A-Fix-2', …)` block with 7 tests covering: per-tone base values for short copy, the 12ms-per-extra-char extension, MIN/MAX clamps, the explicit-duration override path, sticky `duration: 0` preservation, and adaptive fallback when `show()` is called without a duration. The legacy "fallback to per-tone default" test was updated for the warning bump (4000 → 5000). No other test files changed.

    - **Constraints honored.** No new dependencies. The `notifyAdmins` helper, type-change-request flow, and verification queue from 10A-Fix-1 are untouched. Existing `Employer.employerType10A` field reused; no type changes. The `employerType` legacy field continues to fall through `resolveEmployerType` when the canonical field is unset.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **47/47 tests passing in 4 files** (was 40; +7 new adaptive-duration tests).

    - **Files changed (Phase 10A-Fix-2):**
      - `src/stores/toastStore.ts` — adaptive duration + MIN/MAX exports + warning base bump.
      - `src/__tests__/toastStore.test.ts` — fixed warning assertion + appended adaptive-duration test block.
      - `src/data/seed/users.json` — `employerType10A` backfilled on the three seeded employers.
      - `src/data/persistence.ts` — `SCHEMA_VERSION` bumped 6 → 7.
      - `src/stores/verificationStore.ts` — `resolveEmployerType` accepts optional `{ hasPostedShifts }`.
      - `src/app/employer/profile/page.tsx` — imports `useShiftStore`, computes `hasPostedShifts`, passes to `resolveEmployerType`.
      - `src/app/employer/shifts/new/page.tsx` — posting-guard early return for accounts with no resolvable type.
      - `HANDOFF.md`, `VISUAL_QA.md`.

54. **Phase 10A-Fix-3 — Employer type at registration, verification-gated posting, workplace photos** *(2026-05-25, Phase 10A-Fix-3)*. Manual QA after 10A-Fix-2 surfaced three remaining inconsistencies: a brand-new employer could finish registration without an `employerType10A`, a typed employer could still post a shift without any verified documents, and posted shifts had no workplace imagery so workers had nothing visual to judge whether the job/location was real. This phase closes all three loops while preserving the privacy boundary (admin still sees full docs; workers only see public-safe storefront/workplace photo labels).

    - **A. Registration employer-type selector.** `/register` now renders the canonical 4-shape selector (`Cá nhân thuê ngắn hạn` / `Hộ kinh doanh` / `Doanh nghiệp` / `Agency / Sự kiện`) with each option's hint copy inline; selecting an option also writes a back-compat `employerType` (`Individual` → `'individual'`, everything else → `'business'`) so older Phase-6 code paths keep working. Submit is blocked with a Vietnamese validation message when the type is missing for a `role === 'employer'` registration. The auth-store `register()` enforces the same rule as a defence-in-depth check — `INVALID_INPUT` is returned if `employerType10A` is missing or not one of the four canonical strings, even if the form somehow bypassed the front-end gate.

    - **B. Profile first-set picker → legacy fallback only.** `/employer/profile`'s first-set picker still works for accounts that somehow show up without a resolved type, but it now carries an amber callout: "Chỉ áp dụng cho tài khoản cũ chưa có loại tài khoản. Tài khoản đăng ký mới đã có loại tài khoản từ bước đăng ký." Established accounts with posted shifts continue to skip the picker entirely (Phase 10A-Fix-2 rule).

    - **C. Verification-gated posting checklist.** New `src/domain/postingReadiness.ts` `computePostingReadiness({ employer, employerDocuments, hasPostedShifts, workplaceImageInForm })` is the canonical helper. Returns `{ ready, resolvedType, blockers, checks }` where `checks` is a per-rule boolean map and `blockers` is a list of end-user Vietnamese strings ready to render. Per-employer-type rules:
      - `Individual` — `RepresentativeId` approved + per-shift workplace image (deposit stays at 100%).
      - `HouseholdBusiness` — `RepresentativeId` approved + (per-shift image OR an approved `StorefrontPhoto`/`WorkplacePhoto`/`AddressProof`/`GoogleMapsOrFanpage` on the profile).
      - `Company` — `RepresentativeId` + (`BusinessLicense` OR `TaxCode`) + (per-shift image OR an approved profile workplace photo).
      - `AgencyEvent` — `RepresentativeId` + (`EventProof` OR `WorkplacePhoto` OR `GoogleMapsOrFanpage`) + per-shift workplace/event image (always required).
      `/employer/shifts/new` shows a `ReadinessChecklist` card above the form with green-check / amber-bang icons next to each applicable item, the first blocker as a focused Vietnamese sentence, an "Mở hồ sơ nhà tuyển dụng" CTA when not ready, and the deposit-locked reminder. The form's submit handler re-checks `readiness.ready` before calling `createShift` so a stale form state can't bypass the gate. The deposit-confirm card only renders after a successful create, so it's transitively gated.

    - **D. Shift workplace fields.** `Shift` extended with `workplaceImageUrl?`, `workplaceImageLabel?`, `workplaceNotes?`, `onSiteContactName?`, `onSiteContactPhone?`, `requiresVerifiedDocumentOnArrival?`. `ShiftForm` exposes a new "Ảnh địa điểm và liên hệ tại nơi làm việc" panel containing the workplace-image filename input, workplace-notes textarea, on-site contact name + phone, and the "yêu cầu mang giấy tờ tuỳ thân đã xác minh khi tới làm" checkbox. Required-or-optional behaviour for the workplace-image label is driven by a new `workplaceImageRequired?: boolean` prop the new-shift page sets based on the resolved type (always true for Individual/AgencyEvent; true for HouseholdBusiness/Company unless `workplaceProofApproved`). The form also fires a new `onValuesChange?: (values) => void` callback so the readiness checklist can recompute live as the employer types — wrapped in `queueMicrotask` so React doesn't fire it during render.

    - **E. Worker-facing workplace card.** `/shifts/[id]` adds a `WorkplaceCard` block under the requirements section: mock-image placeholder with the filename + a generic icon, workplace notes callout, on-site contact name + tap-to-call phone, and the "vui lòng mang giấy tờ tuỳ thân đã xác minh" amber notice when `requiresVerifiedDocumentOnArrival === true`. Public-safe: the card never reaches into worker- or employer-verification document slices; it only renders the public Shift fields.

    - **F. Employer profile public photos.** `EmployerProfileModal` (the worker-facing employer profile drawer mounted off `/shifts/[id]` and shift cards) now shows an "Ảnh địa điểm đã xác minh" section that lists labels of approved storefront/workplace/event/address-proof/google-maps documents — never the private representative-ID or business-license docs. Sourced via the new `getPublicEmployerWorkplacePhotos(employerId, documents)` selector in `src/domain/postingReadiness.ts`. The chip header also prefers the canonical 4-shape `employerTypeLabel` and falls back to the Phase-6 2-shape only for ancient seed records.

    - **G. Seeded shift backfill.** `src/data/seed/shifts.json` adds `workplaceImageLabel` (and where useful `workplaceNotes`, `onSiteContactName`, `onSiteContactPhone`, `requiresVerifiedDocumentOnArrival`) to the active and historical seeded shifts: `mat-tien-quan-pho-ha.jpg`, `khu-vuc-phuc-vu-toi.jpg`, `mat-tien-cafe-cong.jpg`, `chi-nhanh-le-loi-cafe-cong.jpg`, `san-khau-su-kien-vinh-quang.jpg`, `khu-vuc-phat-to-roi-ho-hoan-kiem.jpg`, `trung-tam-tiec-cuoi-riverside.jpg`, `kho-cafe-cong-q7.jpg`. Schema bumped 7 → 8 to trigger reseed. No code-side migration needed — load path discards the old snapshot when versions don't match.

    - **H. Privacy non-regression.** Workers still see only the public-safe verification summary on applicant cards / employer profile modal — `getPublicEmployerWorkplacePhotos` filters to public document types (StorefrontPhoto / WorkplacePhoto / EventProof / AddressProof / GoogleMapsOrFanpage); private docs (RepresentativeId / BusinessLicense / TaxCode) are excluded from the worker-visible surface. Admin queue surfaces are untouched. Worker identity privacy rules (Phase 10A boundary) are untouched.

    - **I. Notifications.** No new admin notifications fire when the readiness checklist blocks posting. The existing verification-submission and type-change-request flows remain the only `notifyAdmins` call sites.

    - **Constraints honored.** No new dependencies. RoleGuard, HelpPopover, dashboard cleanup, info pages, public motion polish — all preserved. The Phase 10A-Fix-2 toast adaptive duration, type backfill, and posting-guard early-return are all kept in place.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **62/62 tests passing in 5 files** (was 47; +15 new posting-readiness + registration-gate tests).

    - **Files changed (Phase 10A-Fix-3):**
      - `src/types/index.ts` — added `Shift.workplaceImageUrl/Label/Notes`, `onSiteContactName/Phone`, `requiresVerifiedDocumentOnArrival`.
      - `src/stores/authStore.ts` — `RegisterInput.employerType10A` field; `isEmployerInput` now requires the canonical 4-shape value; the new user record persists it.
      - `src/stores/shiftStore.ts` — `NewShiftInput` extended; `create()` writes the new fields.
      - `src/components/forms/ShiftForm.tsx` — workplace panel + `workplaceImageRequired` + `onValuesChange` props + new submit-time validation.
      - `src/app/register/page.tsx` — 4-shape selector replaces 2-shape; required validation; legacy `employerType` mirrored for back-compat.
      - `src/app/employer/shifts/new/page.tsx` — `ReadinessChecklist` component + `computePostingReadiness` integration + `workplaceImageRequired` derivation + form-submit re-check.
      - `src/app/employer/profile/page.tsx` — first-set picker carries the legacy-only callout copy.
      - `src/app/shifts/[id]/page.tsx` — `WorkplaceCard` block under requirements.
      - `src/components/user/EmployerProfileModal.tsx` — public photos section + 4-shape type chip + `getPublicEmployerWorkplacePhotos` selector.
      - `src/domain/postingReadiness.ts` — NEW pure helper.
      - `src/__tests__/postingReadiness.test.ts` — NEW test file (15 tests covering all four shapes + the auth-store registration gate).
      - `src/data/seed/shifts.json` — workplace label backfill on 8 seeded shifts.
      - `src/data/persistence.ts` — `SCHEMA_VERSION` bumped 7 → 8.
      - `src/i18n/vi.ts` — new keys for registration employer-type intro, posting readiness checklist, workplace section, on-site contact, and worker-facing workplace card.
      - `HANDOFF.md`, `VISUAL_QA.md`.

55. **Phase 10A-Fix-4 — Live verification summaries, task badges, error toast tone, featured-job countdown** *(2026-05-25, Phase 10A-Fix-4)*. Manual QA after 10A-Fix-3 surfaced four polish issues: employer-side worker verification chips were stale (read off the frozen `worker.verifications` flag-array instead of the live `useVerificationStore`), top nav had no task indicator so users missed pending work after closing notification toasts, validation messages were green success toasts in two places on the employer profile, and the homepage "Việc đang nổi bật" card was a static label with no countdown. This phase fixes each with minimal blast radius.

    - **A. Live worker verification summary on employer surfaces.** `WorkerProfileModal` and the employer-dashboard pending-applications detail modal now read `useVerificationStore.workerDocuments` and pass through `getWorkerVerificationSummary(worker, docs)` to derive the public-safe view (badge + method label + masked identifier + pending count). The `<VerificationBadge verifications={worker.verifications} />` legacy call has been removed from `WorkerProfileModal` — the legacy `worker.verifications` flag-array is no longer the source of truth on any employer-facing applicant surface. The owner-shift page (`/employer/shifts/[id]`) was already using the live selector via `<WorkerSummaryRow identityBadge={...} />`; nothing changed there. Phone-verification chip remains driven by `worker.verifications.includes('phone')` because the phone flag is still owned by the user record (no separate verification doc for it). Privacy boundary preserved — `fullIdentifier`, image URLs, and admin notes are still admin-only.

    - **B. Task-badge / red-dot indicators.** New `src/components/ui/TaskBadge.tsx` renders a red dot for `count === 1` and a pill for `count >= 2` (clamped at "9+"). Counts come from a new pure helper module `src/domain/taskBadges.ts` (`adminVerificationTaskCount`, `employerDashboardTaskCount`, `employerPendingApplicationCount`, `workerDashboardTaskCount`, `workerProfileTaskCount`). NavBar wiring:
      - **Admin nav** — "Tổng quan admin" link gets a badge whose count is pending worker docs + pending employer docs + pending type-change requests.
      - **Admin dashboard "Xác minh" tab** — same count rendered inside the tab via an extended `TabButton`.
      - **Employer nav** — "Tổng quan" link badge counts `Pending` applications across the employer's shifts plus `CheckedOut` ones awaiting confirmation.
      - **Worker nav** — "Tổng quan" link badge counts unread worker-scoped notifications; "Hồ sơ" link badge counts verification docs in `Rejected` or `NeedsMoreInfo` status (i.e. items the worker must act on themselves).
      The badge is purely presentational — wrapping the existing `<NavLink>` in a `relative` span when the count is positive so the absolutely-positioned chip anchors correctly. Active-state styling is untouched.

    - **C. Validation error tone fix.** `src/app/employer/profile/page.tsx` had two validation paths calling `showSuccess(...)` for what are obviously error messages ("Vui lòng chọn loại tài khoản trước khi nộp tài liệu.", "Vui lòng nhập lý do.", and the type-change-request error fan-out). Both now call `showError(...)`. A workspace-wide grep for `showSuccess.*lỗi|showSuccess.*Vui lòng|showSuccess.*Không thể` returns no remaining hits — every validation message uses the error tone.

    - **D. Featured-job countdown + full-shift filter.** `FeaturedJobMockup` already filtered out full / past shifts via `isListable`. The countdown was the gap. Added a pure formatter `formatFeaturedCountdown(diffMs)` that returns `null` for non-positive gaps, "{N} ngày {HH} giờ" for ≥24h, "{H} giờ {MM} phút" for ≥1h, and "{MM}:{SS} phút" for the last hour. Wired into `FeaturedCardBody` behind an SSR-safe mount gate (`useState(false)` flipped to `true` in `useEffect`) so the server-rendered markup matches the first client paint and React doesn't throw a hydration mismatch over the dynamic time string. A `setInterval(60_000)` tick re-runs both the eligibility filter and the countdown computation, so a featured shift that becomes full or hits its start time mid-session falls out and the next eligible one takes over without a page refresh. The chip is a tasteful orange pill anchored under the location/wage/positions row.

    - **Constraints honored.** No new dependencies. RoleGuard, HelpPopover, dashboard cleanup, info pages, public motion polish — all preserved. Worker identity privacy boundary is unchanged. Verification queue, posting guard, type-change request flow, admin notifications, and Phase 10A-Fix-3 readiness checklist are all untouched.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **75/75 tests passing in 6 files** (was 62; +13 new live-verification + task-badge + countdown tests).

    - **Files changed (Phase 10A-Fix-4):**
      - `src/components/ui/TaskBadge.tsx` — NEW small dot/pill indicator.
      - `src/components/ui/index.ts` — re-export.
      - `src/domain/taskBadges.ts` — NEW pure helper module with the five count selectors.
      - `src/components/layout/NavBar.tsx` — `NavLink` accepts `badgeCount`; role-specific nav components compute counts and pass them through.
      - `src/app/admin/dashboard/page.tsx` — `TabButton` accepts `badgeCount`; verifications tab renders the count.
      - `src/app/employer/dashboard/page.tsx` — pending-applications detail modal uses live `getWorkerVerificationSummary(...)`; new `LiveVerificationChips` helper.
      - `src/components/user/WorkerProfileModal.tsx` — replaced `<VerificationBadge>` with live-derived chips reading `useVerificationStore`.
      - `src/app/employer/profile/page.tsx` — two `showSuccess` validation calls flipped to `showError`.
      - `src/components/landing/FeaturedJobMockup.tsx` — `formatFeaturedCountdown` pure helper + mount-gated live countdown chip + minute tick re-runs eligibility filter.
      - `src/__tests__/phase10aFix4.test.ts` — NEW test file (13 tests covering live verification, all five badge counters, and the countdown formatter).
      - `HANDOFF.md`, `VISUAL_QA.md`.

56. **Phase 10A-Fix-5 — Correct live verification everywhere, actionable badge semantics, canonical featured-job availability** *(2026-05-25, Phase 10A-Fix-5)*. Manual QA after 10A-Fix-4 surfaced four real product-flow bugs: the worker profile nav badge stayed red after the worker resubmitted a `Rejected` doc; the worker dashboard nav showed unread-notification count even though that information already lives on the bell; employer-facing applicant surfaces still rendered the legacy `<VerificationBadge>` snapshot derived from `worker.verifications`; and the homepage featured card still surfaced a 3/3 full shift because `positionsFilled` had drifted. This fix audits every employer-facing worker surface, corrects badge semantics, and adds a canonical recruiting-availability helper.

    - **A. Worker profile badge — latest-doc semantics.** `workerProfileTaskCount` in `src/domain/taskBadges.ts` now keeps only the LATEST record per `documentType` (by `submittedAt`) and only counts `Rejected` / `NeedsMoreInfo` when those are the latest status. The moment a worker resubmits, the latest record flips to `Pending` and the red dot disappears. New tests pin: NeedsMoreInfo → red, resubmit-as-Pending → no red, latest-Approved → no red, older Rejected with newer Pending/Approved → no red.

    - **B. Worker dashboard nav badge — removed.** Unread notifications belong to the bell, not a nav-link task indicator. `workerDashboardTaskCount` is intentionally now `() => 0` so the existing import surface stays stable while the nav stops rendering a misleading indicator. The worker NavBar no longer subscribes to `useNotificationStore`. When we later add a real actionable selector (check-in due, check-out due, confirmation needed), it will be a pure helper that drives the same TaskBadge.

    - **C. Live verification everywhere — `WorkerSummaryRow` is now self-sufficient.** The component subscribes to `useVerificationStore.workerDocuments` directly and runs `getWorkerVerificationSummary(...)` on every render. Removed the legacy `<VerificationBadge verifications={worker.verifications} />` call from this row (it was the source of the stale-chip bug on the employer manage page). The legacy `identityBadge` prop the caller used to compute and pass in is gone — every employer-facing surface that mounts this row now gets live data automatically. Same treatment applied to `WorkerProfileCard` and the worker section of `AdminUserProfileModal` so no employer- or admin-visible surface still reads the frozen flag-array as the verification source of truth.

    - **D. `WorkerVerificationSummary.approvedMethods`.** New field on the public-safe summary returns every approved identity method, deduped by `documentType` and sorted newest-first. Each entry carries `{ type, label, maskedIdentifier? }` — never the `fullIdentifier` or image URLs. `WorkerSummaryRow`, `WorkerProfileModal`, the employer dashboard `LiveVerificationChips`, `AdminUserProfileModal`, and `WorkerProfileCard` all render one chip per approved method, so a worker with CCCD + student card + driver license shows three chips, not just the most-recent primary. The legacy `primaryMethod` / `primaryMethodLabel` fields stay in place for back-compat.

    - **E. Bình Lê regression.** Pinned by a new test in `phase10aFix5.test.ts`: the worker submits an application while only phone is verified, admin later approves CCCD + student card + driver license, and the next render surfaces all three approved methods with no application-record snapshot involved. Application records do NOT and never will store verification snapshots — the selector is the only source of truth.

    - **F. Canonical shift availability.** New `src/domain/shiftAvailability.ts` exports `isShiftAvailableForRecruiting(shift, applications, nowMs)`, `effectiveFilledCount(shift, applications)`, `approvedOrConfirmedApplicationCount(shiftId, applications)`, and `selectAvailableShiftsForRecruiting(shifts, applications, nowMs)`. The predicate uses `effectiveFilled = max(shift.positionsFilled, approvedOrConfirmedAppCount)` so a stale field can't let a 3/3 shift slip through. Occupying statuses: `Approved`, `CancellationRequested`, `CheckedIn`, `CheckedOut`, `Confirmed`. Used by `FeaturedJobMockup` and `/shifts/page.tsx` — both surfaces now read the live `useApplicationStore` slice in addition to the shift store. The featured picker still reaches for `eligible[0]`, so when the top candidate becomes full the next eligible shift takes its place automatically (the `setInterval` minute tick + `applications` dependency in the picker's `useMemo` keeps the selection fresh).

    - **G. Featured countdown non-regression.** Countdown still mount-gated and minute-ticked. Because the picker now consults the canonical helper, the countdown can never appear on a full / past / non-published / non-deposited shift.

    - **H. Validation toast tone non-regression.** Re-grepped for `showSuccess.*Vui lòng|showSuccess.*lỗi|showSuccess.*Không thể` — zero hits remain. The Phase 10A-Fix-4 fix to employer profile validation paths is intact.

    - **I. Mock real-time consistency.** The architecture is unchanged: every store mutation calls `set({...})`, which Zustand fans out to subscribed components. Subscribed surfaces re-render synchronously inside the same tab. No multi-tab broadcast — admin approving in tab A and employer reading in tab B requires a refresh in tab B. This is a documented MVP limitation; documented as Phase 10B follow-up.

    - **Constraints honored.** No new dependencies. RoleGuard, posting guard, type-change request flow, admin notifications, verification queue, HelpPopover, dashboard cleanup, info pages, and the Phase 10A-Fix-4 toast-tone + countdown work are all preserved. Worker identity privacy boundary is unchanged — `fullIdentifier`, raw image URLs, and admin notes are still admin-only.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **91/91 tests passing in 7 files** (was 75; +16 new tests covering `approvedMethods` dedupe, the Bình Lê regression, latest-doc badge semantics, and the canonical availability helper).

    - **Files changed (Phase 10A-Fix-5):**
      - `src/types/index.ts` — `WorkerVerificationSummary.approvedMethods` field added.
      - `src/stores/verificationStore.ts` — `getWorkerVerificationSummary` populates `approvedMethods`.
      - `src/domain/taskBadges.ts` — `workerProfileTaskCount` uses latest-per-type semantics; `workerDashboardTaskCount` returns 0.
      - `src/domain/shiftAvailability.ts` — NEW canonical recruiting-availability helper module.
      - `src/components/user/WorkerSummaryRow.tsx` — self-subscribes to verification store; legacy `<VerificationBadge>` removed; `identityBadge` prop dropped.
      - `src/components/user/WorkerProfileCard.tsx` — same live-derivation pattern; converted to client component.
      - `src/components/user/WorkerProfileModal.tsx` — renders `approvedMethods` chips.
      - `src/components/user/AdminUserProfileModal.tsx` — `WorkerBody` reads live store; removes `<VerificationBadge>`.
      - `src/components/layout/NavBar.tsx` — drops worker dashboard badge wiring + notification-store subscription.
      - `src/components/landing/FeaturedJobMockup.tsx` — uses `selectAvailableShiftsForRecruiting`; subscribes to application store.
      - `src/app/shifts/page.tsx` — uses `isShiftAvailableForRecruiting`; subscribes to application store.
      - `src/app/employer/shifts/[id]/page.tsx` — drops the now-unused per-call `verificationSummary` derivation since `WorkerSummaryRow` handles it internally.
      - `src/app/employer/dashboard/page.tsx` — `LiveVerificationChips` renders `approvedMethods`.
      - `src/__tests__/phase10aFix4.test.ts` — updated for latest-doc semantics + worker-dashboard-counter-now-0.
      - `src/__tests__/phase10aFix5.test.ts` — NEW test file (16 tests).
      - `HANDOFF.md`, `VISUAL_QA.md`.

57. **Phase 10A-Fix-6 — Unified worker verification UI, public-summary priority rules, modal outside-click, featured slot label** *(2026-05-25, Phase 10A-Fix-6)*. Manual QA after 10A-Fix-5 surfaced four polish issues: the worker profile rendered TWO competing verification cards (the legacy "Đã xác minh SĐT / Tải lên CMND/CCCD / Tải lên thẻ sinh viên" card and the canonical "Xác minh danh tính" card) so the worker saw two upload paths for the same document type; the employer-facing public summary still showed "Chưa xác minh danh tính + 3 đang chờ duyệt" even when the worker had three approved docs because pending counted ALL pending records regardless of approval status; clicking on the empty padding outside a modal panel didn't dismiss it; and the homepage featured card showed "3/3 người" which read as full.

    - **A. Unified worker verification UI.** `/worker/profile` now renders ONE canonical `<WorkerIdentityVerificationCard>` instead of two competing cards. The legacy "Xác minh" card with `<VerificationBadge>` + `<VerificationActions>` toggle buttons (`Tải lên CMND/CCCD`, `Tải lên thẻ sinh viên`) is gone. Phone verification moved into the canonical card as a separate row at the top — phone has no separate doc model so it stays a `worker.verifications` flag toggle. The card title is now just "Xác minh" with a phone-verification row + "Xác minh danh tính" sub-section listing CCCD / Thẻ sinh viên / Bằng lái xe with the Phase 10A status flow (`Chưa gửi` / `Đang chờ duyệt` / `Đã xác minh` / `Cần bổ sung` / `Bị từ chối`). New copy reads "Bạn chỉ cần dùng một trong các giấy tờ hợp lệ để xác minh danh tính. Nếu giấy tờ đã được duyệt, bạn không cần tải lại trừ khi muốn bổ sung phương thức khác."

    - **B. Public-summary priority rules.** `getWorkerVerificationSummary` in `src/stores/verificationStore.ts` reworked. The selector now uses **latest-per-document-type** rules:
      - `identityVerified` is `true` iff at least one document type ever reached `Approved` (regardless of newer Pending resubmissions on the same type).
      - `approvedMethods` keeps every approved type, deduped by `documentType`, sorted newest-first.
      - `pendingCount` counts ONLY document types whose latest record is `Pending` AND that have NEVER been approved. A worker who resubmits an already-approved CCCD doesn't generate a "+1 pending" chip on employer surfaces — the approved method is still in force.
      - `NeedsMoreInfo` and `Rejected` are intentionally NOT counted in `pendingCount` — those are worker-action states tracked separately by `workerProfileTaskCount` (Phase 10A-Fix-5 latest-doc rule).
      The Bình Lê regression is now pinned by tests: 3 approved + 0 truly pending → `identityVerified: true`, `pendingCount: 0`, three approved-method chips. Employer modal no longer shows "Chưa xác minh danh tính" when the worker has approved docs.

    - **C. Employer-facing surface re-audit.** Every employer-facing worker display goes through the same canonical selector — re-confirmed for `WorkerSummaryRow`, `WorkerProfileModal`, `WorkerProfileCard`, `AdminUserProfileModal`, and the employer dashboard `LiveVerificationChips`. No surface manually interprets `workerDocuments`. No surface reads `worker.verifications.includes('id' | 'student' | 'driver')` for identity status — only `'phone'` remains a legitimate `worker.verifications` read.

    - **D. Modal outside-click close.** `src/components/ui/Modal.tsx` previously had an `onClick={onClose}` on the backdrop, but the centering wrapper (`.relative flex min-h-full ...`) sat ABOVE the backdrop in the stacking order, so a click on the empty padding around the panel never reached the backdrop's handler. Phase 10A-Fix-6 adds an `onClick` on the centering wrapper that calls `onClose` only when `e.target === e.currentTarget` (i.e. the click landed on the wrapper itself, not on a descendant inside the panel). The X button and ESC continue to work. Pinned by `src/components/ui/Modal.test.tsx` regression tests covering all four close paths.

    - **E. Featured slot label + canonical full-shift exclusion.** `FeaturedJobMockup`'s slot text changed from the ambiguous "{filled}/{total} người" (which read as "the job is full" when filled equalled total) to "Còn {available}/{total} vị trí" — clear-language phrasing keyed off the canonical `effectiveFilledCount(shift, applications)` from Phase 10A-Fix-5. Public `ShiftCard` (used on `/shifts` listing and the employer dashboard) uses the same clearer label. The featured picker continues to consult `selectAvailableShiftsForRecruiting(...)` so a 3/3 full shift is excluded from the eligible pool entirely; if the field is somehow inconsistent (e.g. positionsFilled=3 with no applications), the label clamps `available` to `Math.max(0, total - filled)` so it never renders a negative.

    - **F. Worker profile red-badge non-regression.** `workerProfileTaskCount`'s latest-doc rule (Phase 10A-Fix-5) was unchanged. The badge clears the moment a `Rejected` record is superseded by a newer `Pending` resubmission. The unified verification card respects the same rule via the `byType` `Map` it builds for status display.

    - **Constraints honored.** No new dependencies. Worker identity privacy boundary preserved — pinned by a new test that JSON-stringifies the public summary and asserts `fullIdentifier`, image URLs, and admin notes never appear. Verification queue, posting guard, type-change request flow, admin notifications, nav badges, and the Phase 10A-Fix-5 canonical availability helper are all untouched.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **105/105 tests passing in 9 files** (was 91; +14 new tests across Modal regression, public-summary priority rules, and featured-slot label).

    - **Files changed (Phase 10A-Fix-6):**
      - `src/components/ui/Modal.tsx` — outside-click close on the centering wrapper.
      - `src/components/ui/Modal.test.tsx` — NEW regression tests.
      - `src/stores/verificationStore.ts` — `getWorkerVerificationSummary` priority rules (latest-per-type + approved-beats-pending).
      - `src/app/worker/profile/page.tsx` — removed the legacy `<VerificationBadge>` + `<VerificationActions>` card; phone verification merged into the canonical `<WorkerIdentityVerificationCard>`; helper now accepts `onTogglePhone` and renders the phone row at the top.
      - `src/components/landing/FeaturedJobMockup.tsx` — slot label uses `effectiveFilledCount(shift, applications)` and reads "Còn X/Y vị trí".
      - `src/components/shift/ShiftCard.tsx` — same clearer label on the public listing card.
      - `src/__tests__/phase10aFix4.test.ts` — updated `pendingCount` test to match new public-summary semantics.
      - `src/__tests__/phase10aFix6.test.ts` — NEW test file (10 tests covering priority rules, the Bình Lê regression, privacy non-regression, and slot-label availability).
      - `HANDOFF.md`, `VISUAL_QA.md`.

58. **Phase 10A-Fix-7 — Trust-sensitive employer cancellation: required reason, worker protection, employer penalty, store-orchestrated side effects** *(2026-05-25, Phase 10A-Fix-7)*. Manual QA flagged a serious product-flow bug: the employer could cancel a shift after approving workers via a one-button confirm (no reason captured), affected workers' applications stayed in `'Approved'` state with the worker-side "Hủy" button still rendering, and the worker received no compensation for the disruption while their reputation / quota was untouched in either direction. Phase 10A-Fix-7 turns employer cancellation into the canonical trust-sensitive flow it should always have been.

    - **A. Reason required.** `shiftStore.cancel(shiftId, reason, when?)` now takes a mandatory `reason` and rejects empty / whitespace-only input with `REASON_REQUIRED`. The employer dialog at `/employer/shifts/[id]` was rebuilt as a Modal with a reason textarea, contextual amber warning when the shift has approved workers ("Ca này đã có người lao động được duyệt. Khi hủy, người lao động sẽ không bị phạt và hệ thống sẽ ghi nhận ảnh hưởng đến uy tín nhà tuyển dụng."), and a live penalty preview card. Submit is disabled until `reason.trim() !== ''`.

    - **B. Worker protection.** New `'CancelledByEmployer'` `ApplicationStatus` distinguishes employer cancellation from worker self-cancellation. The store flips every "active" application (`Approved` / `CancellationRequested` / `CheckedIn` / `CheckedOut` / `Confirmed`) to this status — never to the stigmatising `'CancelledByWorker'`. Each affected worker receives:
      - Up to +2 reputation points (clamped at the 100 cap).
      - One refunded `LateCancel` from `cancellationHistory` if any exists (reduces weekly quota usage by one slot).
      - A `WorkerProtectionRecord` appended to a new `Worker.protections` field — auditable in the reputation/cancellation modal.
      Pending-only applicants are notified that the shift is no longer available but receive no protection record (they were never approved).

    - **C. Employer penalty.** `computeEmployerCancellationPenalty(shift, applications, nowMs)` returns `{ rate, amount, afterApproval }` with the spec's tiered rules: 5% deposit penalty when more than 24h before start, 10% within 24h but more than 6h, 15% within 6h. No penalty when no worker had ever been approved (employer can cancel an empty shift cheaply). The shift record is patched with `cancelledAt`, `cancelledBy: 'employer'`, `employerCancellationReason`, `employerCancelledAfterApproval`, `employerCancellationPenaltyRate`, `employerCancellationPenaltyAmount`. The Cancelled-shift banner on the employer page now shows the reason + penalty inline.

    - **D. Worker dashboard / detail UI.** `UpcomingShiftCard` no longer renders the worker-side "Hủy" button when `shift.status === 'Cancelled'`. The `upcoming` filter on `/worker/dashboard` excludes apps belonging to cancelled shifts so a cancelled shift never reappears as actionable. `/shifts/[id]` shows a red banner with the employer reason and the protection note ("Bạn không bị trừ điểm uy tín hoặc hạn mức hủy vì ca do nhà tuyển dụng hủy. Hệ thống đã tự động bảo vệ quyền lợi của bạn.") so a worker who clicks the deep-link notification understands what happened.

    - **E. Notification copy.** New `'EmployerCancelledShift'` `NotificationKind` carries the title "Ca làm đã bị hủy bởi nhà tuyển dụng" with body "{shiftTitle} đã bị hủy. Lý do: {reason}. Bạn không bị phạt và đã được bảo vệ quyền lợi." linking to `/shifts/{id}`. Pending applicants get the existing `'ShiftCancelled'` kind with body "Đơn ứng tuyển của bạn không còn áp dụng."

    - **F. Store-centralised orchestration.** All side effects are owned by `shiftStore.cancel`: shift patching, application status flips, worker patching (reputation + quota refund + protection record), and notification fan-out. The employer page's old in-component `pushNotification` loop is gone — UI only renders. Future surfaces that trigger employer cancellation (e.g. an admin-side override) call the same store action and inherit the full protection / penalty pipeline.

    - **G. Schema impact.** No schema bump. New `Shift` cancellation fields, the `Worker.protections` field, and the new `ApplicationStatus` value are all additive. Pre-Fix-7 records load with `protections === undefined` (treated as `[]` by the helpers) and no employer-cancellation metadata (the existing `Cancelled` status renders normally).

    - **H. Constraints honored.** No new dependencies. No real payment processing. Worker identity privacy boundary preserved (the protection record contains only public-safe fields: shift title, employer name, reason, occurredAt, points/quota — no full IDs, no documents). Verification queue, posting guard, featured job, toasts, notification bell, and nav badges are all untouched.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **118/118 tests passing in 10 files** (was 105; +13 new tests covering penalty tiers, reputation cap clamping, late-cancel quota refund, application-status flip, notification fan-out, and the REASON_REQUIRED gate).

    - **Files changed (Phase 10A-Fix-7):**
      - `src/types/index.ts` — `'CancelledByEmployer'` ApplicationStatus, `'EmployerCancelledShift'` NotificationKind, `WorkerProtectionRecord`, `Worker.protections?`, `Shift.cancelledAt/cancelledBy/employerCancellationReason/employerCancelledAfterApproval/employerCancellationPenaltyRate/employerCancellationPenaltyAmount` fields.
      - `src/domain/employerCancellation.ts` — NEW canonical helper module (`computeEmployerCancellationPenalty`, `buildWorkerProtection`, `refundOneLateCancel`, `AFFECTED_APPLICATION_STATUSES`, `APPROVED_OR_LATER_STATUSES`).
      - `src/stores/shiftStore.ts` — `cancel` now takes `reason`; new `applyEmployerCancellationSideEffects` orchestrates flips, protection credits, and notification fan-out.
      - `src/app/employer/shifts/[id]/page.tsx` — Modal-based cancellation dialog with reason textarea + penalty preview + after-approval warning. Cancelled banner shows reason + penalty.
      - `src/app/worker/dashboard/page.tsx` — `upcoming` filter excludes cancelled shifts; `UpcomingShiftCard` no longer renders the cancel button when `shift.status === 'Cancelled'`; `badgeToneFor` adds `'CancelledByEmployer'` mapping.
      - `src/app/shifts/[id]/page.tsx` — red cancellation banner with employer reason + worker-protection note.
      - `src/i18n/vi.ts` — `application.status.CancelledByEmployer` + `notification.kind.EmployerCancelledShift` labels.
      - `src/__tests__/phase10aFix7.test.ts` — NEW test file (13 tests).
      - `HANDOFF.md`, `VISUAL_QA.md`.

59. **Phase 10A-Fix-8 — Canonical ledger / history records for worker reputation/quota protection and employer deposit/penalty money history** *(2026-05-25, Phase 10A-Fix-8)*. Phase 10A-Fix-7 added `Worker.protections` and the `Shift.employerCancellation*` fields, but neither set was rendered in the existing reputation timeline, cancellation quota modal, or employer payments modal. Manual QA flagged the obvious gap: a worker saw their score jump by +2 with no auditable history record, and the employer had no permanent ledger surface for the deposit penalty (only a one-time toast). This phase wires the existing data into the existing modals so every numeric change has a visible history record.

    - **A. Canonical history rule.** Every user-visible numeric change must create a history record that the corresponding modal renders. The Phase 10A-Fix-7 store already wrote the records (`Worker.protections`, `Shift.employerCancellation*`); Phase 10A-Fix-8 is the wiring pass that surfaces them in the dashboards. No new persistence, no schema bump.

    - **B. Worker reputation timeline.** `/worker/dashboard`'s `repTimeline` `useMemo` (the data behind the "Điểm uy tín" modal) now appends one event per `WorkerProtectionRecord` from `worker.protections ?? []`. Delta uses the record's `reputationPointsRestored` so workers at the cap see a 0-delta event with the explanation "Bạn đã đạt 100 điểm nên không cộng thêm uy tín." Workers below the cap see "+2 Bảo vệ quyền lợi do nhà tuyển dụng hủy ca" with shift title + employer name + reason in the sublabel. Sort order unchanged (newest-first), so a fresh protection event surfaces at the top of the timeline.

    - **C. Worker quota protection sub-list.** The "Hạn mức huỷ tuần" modal grows a new "Bảo vệ quyền lợi" section that lists up to 5 most-recent `WorkerProtectionRecord` entries. Each entry shows the actual quota delta ("+1 lượt hủy được hoàn lại" when refunded, "Không bị tính lượt hủy" when there was no slot to refund), the shift title, the employer name, the cancellation reason, and the date. Section is hidden when the worker has no protection records — the legacy quota usage list still renders normally.

    - **D. Employer money ledger.** The employer dashboard payments modal grows a new `<EmployerPenaltyLedger>` section that filters `myShifts` for `cancelledBy === 'employer'` AND `employerCancelledAfterApproval === true` AND `employerCancellationPenaltyAmount > 0`, sorts by `cancelledAt` desc, and renders up to 5 entries. Each card shows the rate (5 / 10 / 15%), the negative VND amount, the cancellation date, the reason, and the standardised tag "Phí hủy do ca đã có người lao động được duyệt." Section is hidden when the employer has no penalty entries. Penalty data flows directly from the live `useShiftStore` slice; no new schema, no new store slice.

    - **E. Notification body deltas.** `applyEmployerCancellationSideEffects` in `shiftStore.ts` now collects the per-worker `(reputationDelta, quotaDelta)` from `buildWorkerProtection` and feeds it into the notification body via a new `formatProtectionDeltas` pure helper. Bodies read:
      - `+2 uy tín` only — when there's no late-cancel slot to refund.
      - `+1 lượt hủy được hoàn lại` only — when the worker was already at the rep cap.
      - `+2 uy tín / +1 lượt hủy được hoàn lại` — when both apply.
      - `Hệ thống đã ghi nhận bảo vệ quyền lợi cho bạn.` — neutral fallback when both deltas are zero.
      The reason text and the "Bạn không bị phạt" line remain in every variant.

    - **F. Store centralization preserved.** All ledger writes happen inside the Phase 10A-Fix-7 `applyEmployerCancellationSideEffects` orchestrator. UI surfaces only render. Refresh preserves the records because `worker.protections` is patched via `userStore.updateUser` (already persisted) and the shift fields are patched via `patchShift` + `persist` (already persisted in Phase 10A-Fix-7).

    - **G. Constraints honored.** No new dependencies. No schema bump. No new store slice. Worker identity privacy boundary unchanged — `WorkerProtectionRecord` carries only public-safe fields. Employer cancellation modal, posting guard, featured job, type-change requests, and the rest of the verification system are all untouched.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **128/128 tests passing in 11 files** (was 118; +10 new tests covering record persistence, delta clamping, the Bình Lê-style notification body variants, and pending-applicant exclusion).

    - **Files changed (Phase 10A-Fix-8):**
      - `src/stores/shiftStore.ts` — `applyEmployerCancellationSideEffects` collects per-worker deltas; new `formatProtectionDeltas` helper drives the notification body.
      - `src/app/worker/dashboard/page.tsx` — `repTimeline` appends protection events; quota modal grows a "Bảo vệ quyền lợi" section.
      - `src/app/employer/dashboard/page.tsx` — payments modal grows an `<EmployerPenaltyLedger>` section.
      - `src/__tests__/phase10aFix8.test.ts` — NEW test file (10 tests).
      - `HANDOFF.md`, `VISUAL_QA.md`.

60. **Phase 10A-Fix-9 — Lock applicant actions after shift starts + skill-score foundation** *(2026-05-25, Phase 10A-Fix-9)*. Manual QA flagged two gaps: (a) a Pending applicant could still be approved after the shift had started, which is nonsensical product behaviour — once a ca is ongoing/completed/cancelled, the application processing window is closed; and (b) the platform tracked one platform-wide `reputationScore` per worker but had no per-job-type signal an employer could use when evaluating a worker for a specific category (e.g. a 95-rep generalist isn't necessarily a strong choice for a cash-handling shift). This phase fixes (a) at the store level and lays the per-category skill-score foundation for (b).

    - **A. Lock applicant actions after start.** `applicationStore.approve` adds a new `'SHIFT_ALREADY_STARTED'` error code returned when (i) the shift's start datetime is already in the past, OR (ii) the shift status is `InProgress` / `AwaitingConfirmation` / `Completed` / `Cancelled` / `Expired`. Both checks are belt-and-braces — the lifecycle sync isn't always run, so the start-time check catches the case where status is still `Published` but the clock has moved past the start. The error is mapped via `errorMap.ts` to the Vietnamese sentence "Ca đã bắt đầu, không thể duyệt thêm ứng viên." (key `feedback.error.shiftAlreadyStarted`).

    - **B. Employer dashboard / shift detail UI.** `/employer/shifts/[id]` computes `shiftStarted` from the same predicate and passes it into `ApplicationActionButtons`. The Pending branch now shows a neutral `Đơn đã hết hạn xử lý` badge with the helper line "Ca đã bắt đầu nên không thể duyệt thêm ứng viên." instead of the Approve/Reject buttons when `shiftStarted === true`. The store-side `SHIFT_ALREADY_STARTED` error is the defence-in-depth for any other entry point that might call `approve()` after start.

    - **C. Job risk classification.** New pure helper `jobCategoryRiskLevel(jobType): 'Low' | 'Medium' | 'High'` in `src/domain/skillScore.ts`. Mapping per spec:
      - Low: Phát tờ rơi, Hỗ trợ sự kiện
      - Medium: Phục vụ, Pha chế, Kho vận (default for unknown)
      - High: Thu ngân, Bảo vệ
      `/employer/shifts/[id]` shows a soft amber warning when `riskLevel === 'High'`: "Công việc này có rủi ro cao. Nên chọn người đã xác minh danh tính, có uy tín cao và có lịch sử làm việc phù hợp." Soft warning only — applicants are NOT hard-blocked per the spec's "foundation only, retention follow-up" guidance.

    - **D. WorkerSkillScore model.** New optional `Worker.skillScores?: WorkerSkillScore[]` field. Each entry carries `category` (the shift's `jobType` string), `score` (0-100), `completedCount`, `lastRating` (1-5), and `lastUpdatedAt`. Optional + back-compat: pre-Fix-9 worker records read this as `[]`. New domain helpers in `src/domain/skillScore.ts`:
      - `ratingToSkillScore(stars)` → `stars * 20`, clamped to 1-5.
      - `applyRatingToSkillScores(scores, category, stars, occurredAt)` — first rating writes `stars * 20`; later ratings use the 0.7 / 0.3 weighted average so recent shifts have meaningful but bounded influence.
      - `getSkillScoreForCategory(scores, category)` — public-safe lookup.
      - `skillBadgeForScore` / `skillBadgeLabel` — badge tier (`Mới` / `Khá` / `Tốt` / `Nổi bật`) by score band.

    - **E. Rating updates skill score.** `applicationStore.confirmCompletion` now also patches the worker's `skillScores` via `applyRatingToSkillScores(...)` for the shift's `jobType`. Reputation and skill score are updated in the same `patchWorkerScore` call so the two stay consistent. They are stored separately on the Worker — reputation is platform-wide, skill score is per-category.

    - **F. Employer applicant view chip.** `WorkerSummaryRow` accepts a new optional `jobCategory` prop. When set, the row renders a "Phù hợp công việc: N điểm · {badge}" chip (or "Phù hợp công việc: Mới" when there's no rating yet for the category). The row is unchanged on non-employer surfaces that don't pass the prop. The chip lives next to the existing identity verification chips so the employer sees both signals at a glance.

    - **G. Worker profile section.** `/worker/profile` adds a "Kỹ năng theo loại việc" card listing every entry in `worker.skillScores` (sorted newest-first). Each row shows the category, score, badge, and `Hoàn thành: N ca`. Hidden when there are no scores yet so it's not noise for new workers. Copy reads "Điểm kỹ năng tách riêng với điểm uy tín tổng. Nhà tuyển dụng xem điểm kỹ năng phù hợp với loại ca khi duyệt."

    - **H. Constraints honored.** No new dependencies. No real commission payout. No chat. Verification queue, employer cancellation, ledger surfaces, posting guard, featured job, and notification fan-out are all untouched. Worker identity privacy boundary preserved. `WorkerSkillScore` carries only category + score numbers; no PII.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **151/151 tests passing in 12 files** (was 128; +23 new tests across risk classification, score formula, lock-after-start gate including all five terminal statuses, and the new skill-score side effect on `confirmCompletion`).

    - **Files changed (Phase 10A-Fix-9):**
      - `src/types/index.ts` — `WorkerSkillScore` interface, optional `Worker.skillScores?` field.
      - `src/domain/skillScore.ts` — NEW canonical helper module (`jobCategoryRiskLevel`, `ratingToSkillScore`, `applyRatingToSkillScores`, `getSkillScoreForCategory`, `skillBadgeForScore`, `skillBadgeLabel`, `SKILL_SCORE_CAP`).
      - `src/stores/applicationStore.ts` — `'SHIFT_ALREADY_STARTED'` error code; `approve()` time-gate; `confirmCompletion()` updates `skillScores`.
      - `src/lib/errorMap.ts` — `SHIFT_ALREADY_STARTED` mapping.
      - `src/i18n/vi.ts` — `feedback.error.shiftAlreadyStarted` Vietnamese label.
      - `src/app/employer/shifts/[id]/page.tsx` — `shiftStarted` memo; `ApplicationActionButtons` accepts the flag and renders the "Đơn đã hết hạn xử lý" badge; high-risk soft warning above the applicant list; passes `jobCategory={shift.jobType}` into `WorkerSummaryRow`.
      - `src/components/user/WorkerSummaryRow.tsx` — optional `jobCategory` prop drives the per-category skill chip.
      - `src/app/worker/profile/page.tsx` — new "Kỹ năng theo loại việc" card.
      - `src/__tests__/phase10aFix9.test.ts` — NEW test file (23 tests).
      - `HANDOFF.md`, `VISUAL_QA.md`.

61. **Phase 10A-Fix-10 — Expire pending applications when shift starts** *(2026-05-25, Phase 10A-Fix-10)*. Phase 10A-Fix-9 added the `'SHIFT_ALREADY_STARTED'` error code and hid the Approve/Reject buttons after start, but it didn't actually transition stale `Pending` applications out of the Pending state — they continued to show under "Đơn ứng tuyển chờ duyệt" on the employer dashboard and as `Chờ duyệt` on the worker dashboard. Phase 10A-Fix-10 introduces a new `'Expired'` ApplicationStatus and a centralized expiry action that runs on every dashboard mount, on `/shifts/[id]` mount, on `/employer/shifts/[id]` mount, and inside `applicationStore.approve()` itself.

    - **A. New `'Expired'` ApplicationStatus.** Vietnamese label "Đã hết hạn". `Application` extended with optional `expiredAt` and `expiredReason` fields. New `'ApplicationExpired'` `NotificationKind` with title "Đơn ứng tuyển đã hết hạn".

    - **B. Pure expiry helper.** `src/domain/applicationExpiry.ts` exports `shouldExpirePendingForShift(shift, nowMs)` and `planExpirePendingApplications(applications, shifts, nowIso)`. The plan helper returns `{ applications, expiredIds }` so the caller can persist atomically AND fan out one notification per affected worker. `shouldExpirePendingForShift` matches the spec rule: shift status is `InProgress` / `AwaitingConfirmation` / `Completed` / `Cancelled` / `Expired`, OR start datetime has passed.

    - **C. Centralized store action.** `applicationStore.expirePendingApplicationsForStartedShifts(nowIso?)` calls the planner, persists the new applications array, fires one `'ApplicationExpired'` notification per affected worker (deep-linked to `/shifts/{id}`), and returns `{ expiredIds }`. Notification body: "Ca {shiftTitle} đã bắt đầu trước khi đơn của bạn được duyệt. Bạn không bị trừ điểm uy tín hoặc hạn mức hủy." Idempotent: subsequent calls find no Pending records left and emit zero further notifications.

    - **D. Trigger points.** `useLifecycleSync` in `src/lib/useLifecycleSync.ts` was extended to call the new action right after `useShiftStore.syncLifecycle()`. Every page that already used the hook (employer dashboard, worker dashboard, employer shift detail, employer schedule, public `/shifts`, admin dashboard) now also runs the expiry pass on mount. `/shifts/[id]` newly opts in via the same hook. `AppHydrator` runs the action after the boot pass so the very first paint after page reload reflects the right state. `applicationStore.approve()` calls the action inline before returning `'SHIFT_ALREADY_STARTED'` — Fix-9 used to leave the application in Pending; Fix-10 converts it to Expired so callers can't leave stale data.

    - **E. UI surfaces.** Worker `ApplicationActions` adds an `'Expired'` branch with the badge "Đã hết hạn" and the helper "Ca đã bắt đầu nên đơn ứng tuyển không còn hiệu lực. Bạn không bị trừ điểm uy tín hoặc hạn mức hủy." Worker dashboard adds a `recentlyExpired` memoised list (top 5 by `expiredAt` desc) rendered in a new "Đơn ứng tuyển đã hết hạn" section with click-through cards linking to `/shifts/{id}`. Both `badgeToneFor` (worker) and `badgeToneForApp` (employer) gain a `'Expired'` → `neutral` mapping. The employer dashboard's existing `pendingApps` filter (`a.status === 'Pending'`) now naturally excludes Expired records, so the "Đơn ứng tuyển chờ duyệt" stat tile and section both drop them; same for `employerPendingApplicationCount` which drives the nav badge.

    - **F. Worker protection.** The expiry never reduces reputation, never ticks cancellation quota, never appends a `CancellationRecord`. Only `Application.status` flips and `expiredAt` / `expiredReason` are stamped. Pinned by tests covering reputation/quota non-regression.

    - **G. Constraints honored.** No new dependencies. No real commission payout, no chat. Verification queue, cancellation flow, ledger surfaces, posting guard, featured job, skill-score and notification fan-out are all untouched. The `'SHIFT_ALREADY_STARTED'` Fix-9 contract still holds — `approve()` returns the error AND now also expires the record so the UI doesn't have to special-case stale Pending data.

    - **Validation.** `npm run build` → exit 0, **28 routes** (unchanged). `npm run test:run` → exit 0, **165/165 tests passing in 13 files** (was 151; +14 new tests across the pure planner, store action idempotence, employer pending count, approve()-after-start cleanup, and reputation/quota non-regression).

    - **Files changed (Phase 10A-Fix-10):**
      - `src/types/index.ts` — `'Expired'` ApplicationStatus, `'ApplicationExpired'` NotificationKind, optional `Application.expiredAt` / `expiredReason` fields.
      - `src/domain/applicationExpiry.ts` — NEW canonical helper module (`shouldExpirePendingForShift`, `planExpirePendingApplications`).
      - `src/stores/applicationStore.ts` — new `expirePendingApplicationsForStartedShifts(nowIso?)` action; `approve()` calls it inline before returning `'SHIFT_ALREADY_STARTED'`.
      - `src/lib/useLifecycleSync.ts` — extended to call the new action.
      - `src/components/layout/AppHydrator.tsx` — boot pass calls the new action.
      - `src/components/forms/ApplicationActions.tsx` — `'Expired'` branch with badge + helper copy.
      - `src/app/worker/dashboard/page.tsx` — `recentlyExpired` memo + "Đơn ứng tuyển đã hết hạn" section + `badgeToneFor` mapping.
      - `src/app/employer/shifts/[id]/page.tsx` — `badgeToneForApp` mapping for `'Expired'`.
      - `src/app/shifts/[id]/page.tsx` — opts into `useLifecycleSync`.
      - `src/i18n/vi.ts` — `application.status.Expired` + `notification.kind.ApplicationExpired` labels.
      - `src/__tests__/phase10aFix9.test.ts` — updated `approve()` assertion to reflect Fix-10's "convert to Expired" contract.
      - `src/__tests__/phase10aFix10.test.ts` — NEW test file (14 tests).
      - `HANDOFF.md`, `VISUAL_QA.md`.

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
- **Never nest `<button>` inside `<button>`.** *(Phase 9Y-Fix rule, current as of Phase 9Y-Fix-3)* Inserting `<HelpPopover>` (which is a `<button>` trigger) inside any clickable surface requires the surface to NOT be a `<button>`. Two patterns are acceptable: (1) — preferred — surface the help in the corresponding detail modal's `titleAccessory` slot via `<Modal titleAccessory={<HelpPopover .../>}>`; this is what the dashboard `StatTile`s now do (Phase 9Y-Fix-3). (2) — fallback for surfaces with no detail modal — render the surface as a `<div>` with a transparent overlay anchor `<button class="absolute inset-0 z-0">` for the click target, and the help button inside a `relative z-10 pointer-events-none` content layer with a `pointer-events-auto` wrapper around the help button. The HelpPopover trigger itself calls `e.stopPropagation()` + `e.preventDefault()` so its click never bubbles. Hover-only tooltips that nest a non-focusable `<span>` trigger inside a `<button>` are forbidden — they don't work on touch devices.
- **Dashboard overviews stay clean; help lives in drill-downs.** *(Phase 9Y-Fix-3 rule)* Stat tiles, dashboard summary cards, and other overview surfaces should NOT carry inline `?` glyphs or other contextual help instrumentation. Help belongs in the corresponding detail modal's title slot (`<Modal titleAccessory={<HelpPopover .../>}>`), in a `<PageHelpButton>` in the page header, or in `/user-guide`. The overview is a status board — keep it visually quiet. Inline `<HelpPopover>` is still acceptable on per-row controls (admin override, application status badges) where there is no drill-down modal to host the explanation.
- **Contextual help must be click/tap accessible.** *(Phase 9Y-Fix rule)* Every `(?)` glyph must open a real popover/modal, not a hover-only tooltip. Mobile users have no hover state. Use `<HelpPopover>` from `src/components/ui/HelpPopover.tsx`. Title comes from the surrounding label, description is a 1–3 sentence concept blurb. ESC + outside click + close button all dismiss (inherited from `<Modal>`).
- **HelpPopover CTAs must deep-link to specific guide anchors.** *(Phase 9Z-Fix-5 rule)* The `learnMoreHref` prop on `<HelpPopover>` defaults to `/user-guide` but every dashboard / stat-modal call site MUST pass an anchored URL like `/user-guide#worker-total-income`. Generic `/user-guide` links drop users at the top of a long page instead of on the section that explains the metric they clicked on. The Phase 9Z-Fix-5 mapping covers all 10 dashboard stats (4 worker + 6 employer); when a new stat tile or help surface is added, also add a matching `<FeatureGuide>` anchor section to `src/app/user-guide/page.tsx` with `example` + `nextAction` content and wire `learnMoreHref` to it.
- **Hydration warnings: reproduce in Incognito first.** *(Phase 9Y-Fix-4 rule)* Browser extensions — Dark Reader, Grammarly, password managers, accessibility tools — routinely inject DOM attributes (`data-darkreader-mode`, `data-darkreader-inline-stroke`, etc.) onto `<html>`, `<body>`, and stroked SVGs before React hydrates. These produce noisy `Hydration failed` console warnings in dev that are not real app bugs. The root layout already carries `suppressHydrationWarning` on `<html>` and `<body>` defensively (Phase 9Y-Fix-4); the named landing-page icons + `HamburgerIcon` + `ShiftCard.CalendarIcon` carry the flag on their `<svg>` roots. Before treating any new hydration warning as a real bug, **disable extensions and reload in an Incognito / Private window.** If the warning persists in Incognito, it's a real app mismatch — common causes are `Date.now()` / `new Date()` rendered as text, `Math.random()` in render, `typeof window` branches that change rendered markup, localStorage-derived markup before hydration, and invalid nested HTML (e.g. `<button>` inside `<button>`). Fix the underlying mismatch rather than adding more `suppressHydrationWarning` flags — the flag is for known third-party noise only.
- **User-facing copy must not contain raw route paths.** *(Phase 9Z-Fix-4 rule)* Guide pages, info pages, help text, and any other Vietnamese / English prose visible to users must reference the visible page names, menu labels, button text, or section headings — never raw URLs like `/worker/profile` or `/employer/shifts/new`. Examples: `Tại trang Đăng ký, chọn ...` (not `Tại /register, chọn ...`), `Trong menu Nhà tuyển dụng, chọn "Đăng ca tuyển"` (not `Vào /employer/shifts/new`), `Mở trang Tổng quan của người lao động` (not `Vào /worker/dashboard`). Internal route strings live in `href={...}` props and other technical contexts where they're not user-visible. When public nav must deep-link to a feature explanation, use anchored URLs like `/user-guide#worker-schedule` (Phase 9Z-Fix-4 added five such anchor sections to `/user-guide`).
- **Verification document privacy boundary.** *(Phase 10A rule, hardened in 10A-Fix-4)* Admins are the only role permitted to see full identity-document data (`fullIdentifier`, raw image URLs, file names). Worker- and employer-visible surfaces — applicant cards, worker profile public modal, employer profile public modal, shift detail employer block — render the public-safe subset only: identity-verified badge, method label (CCCD / Thẻ sinh viên / Bằng lái xe), and `maskedIdentifier` (e.g. `0791•••••234`). Use `getWorkerVerificationSummary(worker, docs)` and `getEmployerVerificationSummary(...)` from `@/stores` to derive the public-safe view; never reach into `useVerificationStore.workerDocuments` directly from a non-admin surface. **The summary MUST be live-derived from the verification store on every render — never frozen as a snapshot on the `Application` record at submission time.** Phase 10A-Fix-4 removed the legacy `<VerificationBadge verifications={worker.verifications} />` call from `WorkerProfileModal` precisely because that flag-array was a stale snapshot; the modal now reads `useVerificationStore.workerDocuments` and runs `getWorkerVerificationSummary(...)` so admin-side approvals reflect on the next render. The single exception is the admin queue at `/admin/dashboard` Xác minh tab. When adding a new applicant- or worker-facing surface, audit it against this rule before merging.
- **Validation errors must use the error toast tone.** *(Phase 10A-Fix-4 rule)* Never call `showSuccess(...)` for messages like "Vui lòng nhập lý do.", "Loại tài khoản mới phải khác loại hiện tại.", or any other input-validation feedback. Use `showError(...)`. Success toasts are reserved for confirmed successful actions (record created, document submitted, notification fan-out fired). Searching for `showSuccess.*lỗi`, `showSuccess.*Vui lòng`, or `showSuccess.*Không thể` should always return zero hits.
- **Top-nav task badges are actionable, not informational.** *(Phase 10A-Fix-4 rule, hardened in 10A-Fix-5)* The role-specific nav surfaces a small `<TaskBadge>` chip when there are pending tasks the user should not miss: admin verification queue items on "Tổng quan admin" and the "Xác minh" tab; pending applications + check-out confirmations on the employer "Tổng quan"; latest-per-doc `Rejected` / `NeedsMoreInfo` verification docs on the worker "Hồ sơ". The worker dashboard nav does NOT carry a badge — unread notifications belong to the bell, and the dashboard has no other reliable actionable selector yet. Counts come from the pure helpers in `src/domain/taskBadges.ts`. Latest-doc semantics for the worker profile counter are non-negotiable: when the worker resubmits a `Rejected` doc, the latest record flips to `Pending` and the badge clears. Rendering: `count === 1` → red dot, `count >= 2` → red pill (clamped at "9+"), `count <= 0` → nothing. When adding a new role-aware nav entry that has actionable backlog, prefer extending the helper module over hand-rolling new selectors.
- **Featured-job marketing surface excludes full / past shifts and shows a live countdown.** *(Phase 10A-Fix-4 rule, canonicalised in 10A-Fix-5)* `FeaturedJobMockup` and `/shifts/page.tsx` both call `isShiftAvailableForRecruiting(shift, applications, nowMs)` from `src/domain/shiftAvailability.ts`. The helper uses `effectiveFilledCount = max(shift.positionsFilled, approvedOrConfirmedApplicationCount)` so a stale field cannot let a full shift slip through. The minute-tick `setInterval` in the featured component re-runs the filter so a shift that becomes full or hits its start time mid-session is replaced without a page refresh. The countdown chip uses `formatFeaturedCountdown(diffMs)` and is mount-gated to keep the SSR markup stable. When extending any marketing/discovery surface that should exclude full jobs, route through `isShiftAvailableForRecruiting`; do not hand-roll a new predicate.
- **Live worker verification on every employer-facing surface.** *(Phase 10A-Fix-5 rule, hardened in 10A-Fix-6)* The legacy frozen `worker.verifications` flag-array is no longer the source of truth for identity badges anywhere employer- or admin-facing. Every surface (`WorkerSummaryRow`, `WorkerProfileModal`, `WorkerProfileCard`, `AdminUserProfileModal`, the employer dashboard pending-applications detail modal) subscribes to `useVerificationStore.workerDocuments` directly and runs `getWorkerVerificationSummary(...)` on every render. Surfaces render one chip per entry in `approvedMethods` (deduped by document type) so a worker with multiple approved methods shows them all. The phone chip remains driven by `worker.verifications.includes('phone')` because no separate phone-verification doc store exists; if one is added later, that chip should also become live-derived. Application records do NOT and never will store verification snapshots — the selector is the only source of truth. **Public-summary priority rules:** `identityVerified` is `true` whenever any document type ever reached `Approved`; `pendingCount` counts only types whose latest record is `Pending` AND that have never been approved (so a resubmitted-after-approval doc doesn't generate a phantom pending chip); `NeedsMoreInfo` and `Rejected` are intentionally excluded from the public pending pile (they're worker-action states, surfaced via `workerProfileTaskCount`). When adding a new applicant- or worker-facing surface, audit it against this rule before merging.
- **Single canonical worker verification UI.** *(Phase 10A-Fix-6 rule)* `/worker/profile` renders ONE `<WorkerIdentityVerificationCard>` covering phone verification (as a row at the top) and identity verification (CCCD / Thẻ sinh viên / Bằng lái xe with the canonical `Chưa gửi` / `Đang chờ duyệt` / `Đã xác minh` / `Cần bổ sung` / `Bị từ chối` status flow). Do NOT reintroduce a parallel "Tải lên CMND/CCCD" / "Tải lên thẻ sinh viên" toggle card alongside it — having two upload paths for the same document type is a UX bug, not a feature. If a future phase needs a different toggle (e.g. enable / disable phone reminders), wire it inside the same canonical card.
- **Modals close on outside click.** *(Phase 10A-Fix-6 rule)* The shared `<Modal>` primitive in `src/components/ui/Modal.tsx` closes when (1) the X button is clicked, (2) ESC is pressed, (3) the dark backdrop is clicked, OR (4) the empty padding area between the panel and viewport edge is clicked. The centering wrapper carries an `onClick` that fires `onClose` only when `e.target === e.currentTarget`, so clicks inside the panel never bubble up to dismiss. When building a new modal-like surface, prefer the shared `<Modal>` primitive over hand-rolled overlays so the four close paths stay consistent across the app.
- **Slot labels read as "Còn {available}/{total} vị trí".** *(Phase 10A-Fix-6 rule)* Public marketing / discovery surfaces (`FeaturedJobMockup`, `ShiftCard` on `/shifts`) must NOT render the ambiguous "{filled}/{total} người" — when filled equals total it reads as "the job is full" even though the surface only shows non-full shifts. Use "Còn {available}/{total} vị trí" with `available = Math.max(0, total - filled)`. The marketing surfaces consult `effectiveFilledCount(shift, applications)` to keep the label in sync with the live application store.
- **Employer cancellation is a trust-sensitive action.** *(Phase 10A-Fix-7 rule, history-surfaced in 10A-Fix-8)* `shiftStore.cancel(shiftId, reason, when?)` takes a mandatory `reason` and rejects empty strings with `REASON_REQUIRED`. The store — not the UI — owns the side effects: it flips affected applications (`Approved` / `CancellationRequested` / `CheckedIn` / `CheckedOut` / `Confirmed`) to the new `'CancelledByEmployer'` status, credits each affected worker with up to +2 reputation (clamped at 100) and one refunded `LateCancel`, appends a `WorkerProtectionRecord` to `Worker.protections`, computes the deposit penalty (5% / 10% / 15% by time-window when at least one worker had been approved), and fans out notifications. UI surfaces ONLY render and read — never mark workers as self-cancelled, never deduct worker reputation, never tick the worker quota. Worker-facing surfaces (`/worker/dashboard`, `/shifts/[id]`) hide the "Hủy" button when `shift.status === 'Cancelled'` and show the protection note so the worker understands what happened. When adding a new cancellation entry point (e.g. admin override), route it through `shiftStore.cancel` to inherit the full pipeline.
- **Every user-visible numeric change must create a visible history record.** *(Phase 10A-Fix-8 rule)* When the system changes a worker's reputation score, weekly cancellation quota, completed-shift count, or income — or an employer's deposit, paid amount, refund, or penalty total — the store action that drives the change must also persist a record that a corresponding modal/timeline renders. Worker side: `Worker.protections` records are surfaced in both the "Điểm uy tín" reputation timeline (delta = `reputationPointsRestored`) and the "Hạn mức huỷ tuần" modal's "Bảo vệ quyền lợi" sub-list (delta = `quotaSlotsRefunded`). Employer side: `Shift.employerCancellation*` fields drive the `<EmployerPenaltyLedger>` section inside the payments modal (rate + amount + reason + date). Toasts and banners are temporary; the ledger is permanent. When adding a new numeric change (e.g. a future trust-score adjustment), persist it as a record on the relevant entity AND wire the matching modal/timeline before considering the feature complete.
- **Applicant approve/reject is blocked after shift start.** *(Phase 10A-Fix-9 rule)* `applicationStore.approve` returns `'SHIFT_ALREADY_STARTED'` when the shift's start datetime is in the past OR the shift is in `InProgress` / `AwaitingConfirmation` / `Completed` / `Cancelled` / `Expired`. Both checks are belt-and-braces because the lifecycle sync isn't always run. The error maps to "Ca đã bắt đầu, không thể duyệt thêm ứng viên." (`feedback.error.shiftAlreadyStarted`). The employer applicant UI hides the Approve/Reject buttons for Pending applicants when `shiftStarted === true` and shows a neutral `Đơn đã hết hạn xử lý` badge with the helper line "Ca đã bắt đầu nên không thể duyệt thêm ứng viên." instead. When adding a new applicant-action entry point, route it through `applicationStore.approve` so the gate fires.
- **Reputation and skill score are independent signals.** *(Phase 10A-Fix-9 rule)* `Worker.reputationScore` is the platform-wide reliability number that drives reputation gates (apply gate at 50, late-cancel −10, no-show −20, completion +5). `Worker.skillScores` is a per-`jobType` array carrying score + completedCount + lastRating + lastUpdatedAt. Both are updated by `confirmCompletion` but stored separately. Employer applicant surfaces show both — the reputation badge AND the per-category "Phù hợp công việc: N điểm · {Mới|Khá|Tốt|Nổi bật}" chip. Skill score formula (in `src/domain/skillScore.ts`): first rating writes `stars * 20`; later ratings use `round(0.7 * old + 0.3 * stars * 20)` so recent shifts have meaningful but bounded influence. The badge tiers are: New `Mới` (no rating yet), Decent `Khá` (1–59), Good `Tốt` (60–84), Standout `Nổi bật` (85+). High-risk job categories (`Thu ngân`, `Bảo vệ` — see `jobCategoryRiskLevel`) display a soft amber warning above the applicant list reminding the employer to favour verified, high-reputation workers. Soft warning only — applicants are NOT hard-blocked at this phase.
- **Pending applications expire when the shift starts.** *(Phase 10A-Fix-10 rule)* The new `'Expired'` ApplicationStatus is the canonical terminal state for a `Pending` application that the employer never approved before the shift's start datetime passed (or the shift moved into `InProgress` / `AwaitingConfirmation` / `Completed` / `Cancelled` / `Expired`). The transition is run by `applicationStore.expirePendingApplicationsForStartedShifts()` and is wired into (a) `useLifecycleSync` so every dashboard / shift-detail mount runs it, (b) `AppHydrator` boot so the very first paint after page reload reflects the right state, and (c) `applicationStore.approve()` itself so any caller that hits the `'SHIFT_ALREADY_STARTED'` gate also flips the record. Worker is NOT penalised — no reputation drop, no quota tick, no cancellation-history entry. The `recentlyExpired` section on the worker dashboard surfaces these records with click-through cards. The action is idempotent — running it twice produces zero further state changes and zero duplicate notifications. When adding a new pending-application read site, do not gate it only on `status === 'Pending'` for "is this still actionable" — also rely on `useLifecycleSync` having flipped any stale records to `'Expired'` before render.
- **Workers can verify with any of three identity methods.** *(Phase 10A rule)* CCCD/CMND, Thẻ sinh viên, and Bằng lái xe are all valid. The UI must NOT force CCCD specifically. The Worker profile verification card lists the three side-by-side with equal weight and per-method description so the worker picks whichever they have. The user-guide reads "Bạn có thể xác minh danh tính bằng CCCD/CMND, thẻ sinh viên hoặc bằng lái xe."
- **Employer accounts come in four shapes.** *(Phase 10A rule, locked in 10A-Fix-1, hardened in 10A-Fix-2, gated at registration in 10A-Fix-3)* `'Individual'` (cá nhân thuê ngắn hạn — no business license required), `'HouseholdBusiness'` (hộ kinh doanh), `'Company'` (doanh nghiệp), `'AgencyEvent'` (agency / sự kiện). The canonical field is `Employer.employerType10A`; the legacy `employerType` (Phase 6 `'individual' | 'business'`) is preserved for back-compat — `resolveEmployerType()` in `verificationStore` handles the fallback. **Type is selected at registration** — `/register` requires the 4-shape selection for employers, and the auth-store `register()` rejects payloads without a canonical `employerType10A` value as `INVALID_INPUT`. **Type is locked after onboarding.** The employer profile renders read-only when set; changes require submitting an `EmployerTypeChangeRequest` that an admin reviews from the verification queue. The Individual hint copy must remain literally: "Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và đặt cọc 100% tiền công." Any future shape additions must keep the four canonical ones intact. **Established accounts (have posted shifts) never see the first-set picker** — `resolveEmployerType(employer, { hasPostedShifts: true })` is the canonical guard, falling back to `'HouseholdBusiness'` so an account that somehow lost its canonical field still renders a locked display rather than getting punted back through onboarding. The profile-side first-set picker is now a **legacy fallback only** — new accounts pick their type at registration, and the picker carries an amber "Chỉ áp dụng cho tài khoản cũ chưa có loại tài khoản" callout. **Posting requires verification + workplace prerequisites** — `/employer/shifts/new` runs `computePostingReadiness(...)` from `src/domain/postingReadiness.ts` and refuses to create a shift (and therefore refuses to deposit) until the per-type rules are met: `RepresentativeId` approved for everyone, `BusinessLicense`/`TaxCode` approved for `Company`, an event proof for `AgencyEvent`, and a per-shift workplace image (always required for `Individual`/`AgencyEvent`; required for `HouseholdBusiness`/`Company` unless an approved profile-side workplace photo covers it). Employer type is not a cosmetic filter — it drives required documents, deposit ratio, and worker-safety guarantees.

- **Phase 10C-Stab-1 Batch 3 contracts (2026-05-25).** Manual-QA regression fixes after Batch 2. The following invariants are NEW or CHANGED — do not regress:
  - **Repost flow (A)**: `shiftStore.repostFromShift(sourceId)` only appends a `'CreatedFromRepost'` timeline entry to the source and returns the source shift. It does NOT create a Draft. The employer is routed to `/employer/shifts/new?from={sourceId}`; the new-shift page reads `?from=` via `useSearchParams`, looks up the source via `useShiftStore`, and pre-fills the form via `<ShiftForm initialValues={...}>` with everything except `date` / `startTime` / `endTime` (which the employer must pick fresh). Old shift remains unchanged. New shift is created on form submit only, going through the normal `simulateDeposit` flow.
  - **Employer expiry notifications (B)**: New `'ShiftStartingSoon'` and `'ShiftExpiredEmpty'` `NotificationKind` literals. `applicationStore.runLifecycleSync(nowIso?)` fires both. ShiftStartingSoon: 10-minute pre-start window when shift is `Published`/`FullyBooked` AND `positionsTotal > positionsFilled`; idempotent via `Shift.startingSoonNotifiedAt`. ShiftExpiredEmpty: shift is `Expired` with `positionsFilled === 0`; idempotent via `Shift.expiredEmptyNotifiedAt`. Both deep-link to `/employer/shifts/{id}`.
  - **InProgress requires actual check-in (C)**: `suggestShiftStatus` now requires `hasCheckedIn` (not merely `hasActiveWorker`) before promoting `Published`/`FullyBooked` to `InProgress` after start. `Approved`-only roster after start stays `Published` until at least one worker self-checks-in or the employer marks them present. New `getShiftDisplayPhase(shift, applications, nowIso)` returns `'Upcoming' | 'CheckInOpen' | 'InProgress' | 'Ended' | 'Cancelled'` with the corresponding `shift.phase.*` Vietnamese labels. The phase chip renders on the worker dashboard `UpcomingShiftCard` and on the employer manage-shift header, alongside the existing `<ShiftStatusBadge>`.
  - **Mark-present after self-check-in (D)**: `canEmployerMarkPresent` now accepts `'Approved'` AND `'CheckedIn'` AND requires `markedPresentAt` to be unset. `applicationStore.markPresentByEmployer` accepts both source statuses and is idempotent on second call (`WRONG_STATUS` once `markedPresentAt` is set). Mark-absent (`canEmployerMarkAbsent`) is independent of `evidenceRequirement` — works for `'None'` shifts too. New i18n key `lifecycle.mismatch.workerNotCheckedIn` ("Nhà tuyển dụng đã xác nhận bạn có mặt. Nếu bạn đã bắt đầu làm, hãy check-in để ghi nhận.") drives the worker-side amber callout when `markedPresentAt` is set but `checkInAt` is not. The existing `lifecycle.mismatch.workerOnly` drives the symmetric employer-side callout.
  - **Worker dispute response (E)**: `Dispute.responses?: DisputeResponse[]` is the canonical thread on every dispute. `applicationStore.appendDisputeResponse(disputeId, side, payload)` is the sole append path — never create a duplicate `Dispute` record for back-and-forth. Validates `REASON_REQUIRED`, length bounds (reason ≤ 1000, description ≤ 2000, filename ≤ 255 + no path separators), and `WRONG_STATUS` on terminal disputes (`ResolvedReleased | ResolvedRefunded | PartialRelease | ClosedInvalid`). Notifies the OTHER side and admins. Worker-side `/shifts/[id]` UI: when `dispute.raisedBy === 'employer'` it shows "Nhà tuyển dụng đang khiếu nại ca này" with category + reason + evidence + a "Phản hồi khiếu nại" button. The dialog `mode="response"` reuses `<DisputeDialog>` with category hidden. **Never show "Bạn đã khiếu nại" when `dispute.raisedBy === 'employer'`** — the gate must check `raisedBy` not just `status === 'Disputed'`.
  - **Admin dispute resolution propagates to application (F)**: `useAdminStore.resolveDispute` now flips the linked application out of `'Disputed'` after every numeric outcome — `ResolvedReleased` → app `'Confirmed'` + `confirmedAt` stamp; `ResolvedRefunded` → app `'NoShow'` + `noShowAt` stamp. Both outcomes fire a `'DisputeResolved'` notification to BOTH worker AND employer with deep links. Resolved disputes (status in terminal set) cannot be resolved again — second call returns `'WRONG_STATUS'`. New optional fields: `Application.noShowAt`, `Application.partialPayoutAmount`, `Application.disputeResolutionNotifiedAt` (idempotency hooks for future expansions).
  - **Deposit policy is 100% across all trust tiers (G)**: `DEPOSIT_RATIO = { low: 1.0, medium: 1.0, high: 1.0 }` in `src/domain/employerTrust.ts`. Every employer deposits 100% of wage in MVP. Trust tier still drives visibility / priority / fees in future, NOT escrow ratio. All user-facing copy ("70%" / "50%") has been stripped from `vi.ts`, `/employer/payments/page.tsx`, `/user-guide/page.tsx`, etc. Re-introducing partial-deposit copy would mislead employers and starve the platform of payout funds — do not regress.
  - **Schedule overlap buffer is 0 (H)**: `BUFFER_MINUTES = 0` in `src/domain/conflict.ts`. Overlap detection is pure interval-overlap: `targetStart < rEnd && targetEnd > rStart`. Back-to-back shifts (e.g. 12:40–12:45 vs 13:40–13:45) do NOT conflict. The 60-minute buffer was a UX choice that produced false positives at narrow gaps and is gone. Past-confirmed / Expired / Cancelled / NoShow / Rejected applications must NEVER appear in `approvedRangesForWorker`'s output (existing filter is correct).
  - **Already-applied jobs surfaced on /shifts (I)**: `<ShiftCard>` accepts `workerApplicationStatus?: ApplicationStatus`. When set, the card renders a localised badge (`apply.applied.<Status>` keys) plus a "Xem đơn" CTA instead of the generic apply button. `/shifts/page.tsx` derives the status per shift via a `useMemo` `Map<shiftId, ApplicationStatus>` over the live applications slice — never put non-primitive results inside a Zustand selector body. The helper `getWorkerApplicationStateForShift(shiftId, workerId, applications)` lives in `src/domain/workerApplicationState.ts` and picks the LATEST match by `appliedAt` desc when there are duplicates.
  - **Time + log freshness (J)**: All timeline / history / notification timestamps render via `Intl.DateTimeFormat('vi-VN', { day, month, year, hour, minute, second: '2-digit' })`. Notification deep-links must point to a useful surface (the new `'DisputeResolved'`, `'ShiftStartingSoon'`, `'ShiftExpiredEmpty'` kinds all carry concrete `link` URLs). UI surfaces must read live store state via Zustand selectors, never copy data into local component state — that's the source of stale-status bugs.

That's it. Good luck.
