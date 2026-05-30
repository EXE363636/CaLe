# NAV-INTENT-DEEPLINK-FIX-1 — Same-Route Intent / Deeplink Fix

**Date:** 2026-05-30
**Status:** Fixed (UserMenu same-route intents) + regression-tested + validated.

## 1. Root cause

Pages read their tab/modal intent **once on mount**:
`useModalFromQuery` (employer/worker dashboards) uses an empty-deps
`useEffect` + a `handled` ref; the admin dashboard reads `?tab=` once on
mount. The **UserMenu** shortcuts were plain `<Link href="…?modal=…">`
/ `<Link href="…?tab=…">`. When the user was **already on the target
route**, clicking the shortcut updated the URL but Next.js did not
remount the page, so the mount-only reader never re-fired and the
tab/modal/section did not open. From a *different* page the same link
worked (fresh mount reads the query).

The notification **bell** already solved this for notifications via
`handleNotificationClick` → a `DASHBOARD_MODAL_EVENT` custom event that
every dashboard subscribes to (`useDashboardModalEvents`). The UserMenu
simply wasn't using that mechanism.

## 2. Global intent/deeplink strategy

Added `navigateWithIntent(link, { router, pathname })` to
`src/lib/notificationAction.ts` (the module that already owns the event
+ URL parsing):

- **Same-route intent** (`link.pathname === pathname` and link has
  `?modal=`/`?tab=`/`?filter=`) → dispatch the existing
  `DASHBOARD_MODAL_EVENT`; the page's `useDashboardModalEvents`
  subscription opens the tab/modal in-place. No router round-trip, no
  remount, works on repeat clicks.
- **Cross-route / no intent** → normal `router.push(link)` (or, in the
  UserMenu, the native `<Link>` navigation) so the destination reads
  the intent on mount.

`MenuLink` (UserMenu) now intercepts only same-route intent clicks
(`preventDefault` + `navigateWithIntent`); cross-route links keep the
native `<Link>` (prefetch preserved). The helper is **idempotent and
side-effect-free** — it only opens UI, never mutates store state, so
repeated clicks never create duplicate notifications / timeline entries
/ ledger rows. Notifications continue to run lifecycle sync before
showing state (unchanged `useLifecycleSync` on every dashboard mount +
the bell's existing handler).

## 3. Files changed

- `src/lib/notificationAction.ts` — added `navigateWithIntent(...)` (reuses `DASHBOARD_MODAL_EVENT` + `DashboardModalEventDetail`).
- `src/components/layout/UserMenu.tsx` — `MenuLink` routes same-route intent clicks through `navigateWithIntent`; imports `navigateWithIntent` + `AppRouterInstance` type.
- `e2e/19-intent-deeplink.spec.ts` (new) — employer/worker/admin same-route intent regression (repeat-safe, no duplicate side effects).

No routes changed, no business logic changed, no new dependencies.

## 4. Employer actions fixed

- UserMenu **"Quản lý ứng viên"** (`?modal=pending`) — now opens the pending-applicants modal while already on `/employer/dashboard`, and again on repeat click. (UserMenu "Tổng quan / Đăng ca tuyển / Lịch tuyển dụng / Hồ sơ doanh nghiệp / Thanh toán & đặt cọc / Hỗ trợ" are plain cross-route routes — already worked; "Thanh toán & đặt cọc" → `/employer/payments` is its own page.)
- Employer **dashboard in-page shortcuts** (StatCards, post-shift, schedule links) already used in-component `onClick={setStatDetail(...)}` / cross-route `<Link>` — verified they already work same-route; not changed.
- Employer **notifications** continue to use the bell's `handleNotificationClick` same-route event — unchanged, verified.

## 5. Worker actions fixed

- UserMenu **"Điểm uy tín"** (`?modal=reputation`) — now opens the reputation modal while already on `/worker/dashboard`.
- Worker dashboard wallet/history, required-rating banner, and shift-detail links are in-component handlers / cross-route links — already worked; not changed.
- Worker notifications use the bell same-route event — unchanged.

## 6. Admin actions fixed

- UserMenu **"Tranh chấp" / "Người dùng" / "Ca làm"** (`?tab=disputes|users|shifts`) — now switch the admin tab while already on `/admin/dashboard`, repeat-safe.
- Admin analytics StatCards (`jumpToDisputes` / `setTab`) are in-component — already worked.
- Admin dispute notifications use the bell same-route event — unchanged.

## 7. Tests added/updated

- `e2e/19-intent-deeplink.spec.ts` (3 tests):
  - Employer: UserMenu "Quản lý ứng viên" opens pending modal same-route, reopens on repeat click, no duplicate applications.
  - Worker: UserMenu "Điểm uy tín" opens reputation modal same-route.
  - Admin: UserMenu "Tranh chấp" opens disputes tab same-route; switch-away + re-click still focuses it; no duplicate disputes.

## 8. Checklist A–M verification status

See `qa-exploration/checklist-coverage-matrix.md`. **Checklist M
(Notifications/deep-links)** re-verified after the fix: same-route
notification handling (bell) was already covered; UserMenu same-route
intents are now covered by `e2e/19-intent-deeplink.spec.ts`. No
checklist item regressed.

## 9. Calendar availability proposal/MVP status

**Deferred (documented, not implemented).** Assessment: the current
`ScheduleBlock` model stores **busy blocks only** (worker personal busy
time consumed by `domain/scheduleConflict.ts` to block conflicting
applications). There is no availability/free-time concept or
availability-based recommendation. Adding it is **bigger than a small
MVP** (new data shape + store + UI for adding availability + job-list
matching/sort + business logic), so per the task it is deferred. Full
proposed scope + tasks + risks in
`qa-exploration/calendar-availability-proposal.md`.

## 10. Unit / build / E2E / time results

- `npm run test:run`: **408 passed / 408**
- `npm run build`: clean, **28 routes**
- `npm run test:e2e`: **86 passed / 86** (incl. 3 new intent tests)
- `npm run test:time`: **19 passed / 19**

## 11. Remaining deferred items

- Calendar availability + recommendation feature (proposed scope, deferred).
- (Pre-existing) server-side authz, Next/postcss dependency patch, admin partial-release dispute outcomes, auto-no-show penalty policy.

## 12. Manual QA readiness verdict

**Ready.** Same-route intents now work for worker/employer/admin via
the UserMenu, repeat-safe with no duplicate side effects; cross-route
and cold-load deeplinks unchanged and still pass; all gates green.
