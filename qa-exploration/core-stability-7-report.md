# CORE-STABILITY-7 — Stability Pass Report

**Date:** 2026-05-30
**Status:** Complete. All targeted bugs fixed, all gates green.
**App:** CaLẻ / ShiftNow (localStorage-only Next.js 16 MVP, mock-only).

Scope: notification dedup + deeplinks (1), wallet top-up/withdraw/
deposit-draft flow (2), avatar/logo consistency (3), numeric validation
(4), attendance present/absent/late-arrival (5), feedback/review system
(6), regression checklist (7), exploratory QA (8), security (9),
validation (10).

---

## 1. Root causes

- **Notifications (Part 1):** wallet events created no notification
  (top-up) or no deeplink (withdraw); wage-release pointed at the income
  modal not the wallet history; deposit produced no notification. Several
  lifecycle notifications lacked dedup keys, risking duplicates on repeat
  `runLifecycleSync`.
- **Deposit draft (Part 2):** an insufficient-balance deposit only showed
  a toast and offered no recovery path, so the employer lost flow context
  even though the Draft was already persisted.
- **Avatar (Part 3):** the dashboards used `name.charAt(0)` (one letter)
  while `UserAvatar` used a 2-letter rule — inconsistent initials.
- **Numeric fields (Part 4):** the on-site contact phone accepted
  letters; no shared digit/phone sanitizer.
- **Attendance (Part 5):** the absent action was simply hidden for
  checked-in workers (no explanation), and there was no way to correct a
  wrongful absent when a worker arrived late.
- **Feedback (Part 6):** the review list was date-only, fixed-sort, with
  no report flow or admin visibility.

## 2. Bugs fixed

CS7-1 wallet notification deeplinks + top-up notification; CS7-2
deposit/wage-release deeplinks + dedup; CS7-3 insufficient-deposit draft
modal + top-up resume; CS7-4 avatar initials; CS7-5 numeric field
validation; CS7-6 attendance dim + late-arrival reversal; CS7-7 feedback
sort/summary/report; CS7-8 build type error (new notification kinds);
CS7-9 schema-bump test fixups. Full detail in
`core-stability-7-bugs.json`.

## 3. Features added

- Central notification deeplink resolver (`lib/notificationTarget.ts`).
- Wallet top-up notification + same-route wallet-history modal deeplink.
- Insufficient-deposit draft modal (Nạp tiền ngay / Lưu nháp / Quay lại)
  with inline top-up + resume.
- Single global initials helper (`lib/initials.ts`).
- Phone/number input sanitizers (`lib/validate.ts`).
- `applicationStore.revertNoShowToPresent` (late-arrival correction).
- Review-report system (`stores/reviewReportStore.ts`) + sortable,
  summarised, reportable feedback list + admin reported-reviews card.

## 4. Features deferred

None new. (Carried-over deferrals: staff-supply/agency actor, in-app
chat, calendar availability, server-side authz, postcss/next upgrade.)

## 5. Files changed

- `src/lib/notificationTarget.ts` (new), `src/lib/initials.ts` (new),
  `src/lib/validate.ts` (sanitizers), `src/lib/adminNotifications.ts`
  (dedupeKey), `src/lib/errorMap.ts` (DISPUTE_OPEN).
- `src/stores/reviewReportStore.ts` (new), `src/stores/walletStore.ts`,
  `src/stores/shiftStore.ts` (deposit notif), `src/stores/applicationStore.ts`
  (deeplinks, dedup, `revertNoShowToPresent`), `src/stores/index.ts`.
- `src/components/wallet/WalletPanel.tsx`,
  `src/components/user/EmployerFeedbackList.tsx` (rebuilt),
  `src/components/user/UserAvatar.tsx`,
  `src/components/user/WorkerProfileModal.tsx`,
  `src/components/forms/ShiftForm.tsx`,
  `src/components/layout/AppHydrator.tsx`.
- `src/app/worker/dashboard/page.tsx`,
  `src/app/employer/dashboard/page.tsx`,
  `src/app/employer/shifts/new/page.tsx`,
  `src/app/employer/shifts/[id]/page.tsx`,
  `src/app/admin/dashboard/page.tsx`, `src/app/register/page.tsx`.
- `src/types/index.ts` (NotificationKind +3, ReviewReport),
  `src/data/persistence.ts` (schema 9→10, reviewReports slice),
  `src/i18n/vi.ts` (Part 2/4/5/6 keys + notification labels).
- Tests: `src/__tests__/coreStability7.test.ts` (new),
  `e2e/21-core-stability-7.spec.ts` (new),
  `e2e/20-core-stability-6.spec.ts` (Part 4 updated for the modal),
  `src/__tests__/phase10cStab1Batch2.test.ts` (SCHEMA_VERSION),
  `e2e/fixtures/constants.ts` + `e2e/fixtures/seed.ts` (schema + slice).

No new routes (28 invariant held). No new dependencies.

## 6. Tests added/updated

- **Unit** `coreStability7.test.ts` — initials, sanitizers,
  resolveNotificationTarget, dedup with wallet keys, reviewReportStore,
  revertNoShowToPresent (26 tests).
- **E2E** `21-core-stability-7.spec.ts` — top-up notification deeplink,
  insufficient-deposit draft modal + resume, contact-phone numeric
  strip, feedback XSS inert, unauth redirect (5 tests).
- **Updated** `20-core-stability-6.spec.ts` Part 4 for the new modal;
  `phase10cStab1Batch2.test.ts` for the schema bump.

## 7. Notification kind → deeplink coverage table

| Notification kind | Recipient | Deeplink target |
|---|---|---|
| ApplicationReceived | employer | `/employer/shifts/{id}` |
| ApplicationApproved | worker | `/shifts/{id}` |
| ApplicationRejected | worker | `/shifts/{id}` (was dashboard) |
| ApplicationExpired | worker | `/shifts/{id}` (dedupe keyed) |
| WorkerCheckedIn | employer | `/employer/shifts/{id}` |
| EmployerMarkedPresent | worker | `/shifts/{id}` |
| WorkerCheckedOut | employer | `/employer/shifts/{id}` |
| ShiftStarted / ShiftEnded | both | shift detail (dedupe keyed) |
| ShiftStartingSoon / ShiftExpiredEmpty | employer | `/employer/shifts/{id}` |
| DisputeFiled | other party | shift detail (worker/employer) |
| DisputeOpened | admins | `/admin/dashboard?tab=verifications` |
| DisputeResolved | both | shift detail |
| AdminRequestedEvidence | party | shift detail |
| NoShow | both | shift detail / `?modal=reputation` |
| ShiftCompletedConfirmed | worker | `/worker/dashboard?modal=wallet` (was income) |
| AutoReleaseSettled | worker / employer | worker `?modal=wallet` / employer shift detail |
| WorkerPostPaymentRatingRequired | worker | `/shifts/{id}` |
| **UserTopUp** (new) | user | `?modal=wallet` (own dashboard) |
| **UserWithdrawal** | user | `?modal=wallet` (own dashboard) |
| **EmployerDepositPaid** (new) | employer | `/employer/dashboard?modal=wallet` |
| **ReviewReported** (new) | admins | `/admin/dashboard` |

Same-route clicks open the target tab/modal/section in place via the
existing `DASHBOARD_MODAL_EVENT`; cross-route clicks `router.push` and
the destination reads the intent on mount. Wallet deeplinks open the
WalletPanel ledger modal via an `openLedgerSignal` prop.

## 8. Numeric field audit table

| Field | Page | Behavior | Status |
|---|---|---|---|
| On-site contact phone | new-shift | strip non-digits on input + isValidVNPhone | Fixed (E2E) |
| Register phone | /register | sanitizePhoneInput + isValidVNPhone | Fixed |
| Worker/employer phone (display) | profiles | read-only | n/a |
| Hourly wage | new-shift | digits-only (pre-existing) | OK |
| Headcount / positions | new-shift | digits-only (hardened) | Fixed |
| Wallet top-up amount | WalletPanel | digits-only + >0 + cap | OK |
| Wallet withdraw amount | WalletPanel | digits-only + >0 + ≤ balance | OK (CS6) |
| Withdrawal note / bank | WalletPanel | free text, escaped | OK |
| CCCD / student ID | verification (mock) | alphanumeric by design | n/a |
| Partial release / deposit amount | not user-editable | computed | n/a |
| OTP | not present | — | n/a |

## 9. Attendance behavior table

| Situation | Employer sees | Result |
|---|---|---|
| Approved, in window | "Xác nhận có mặt" + "Đánh dấu vắng mặt" | both active |
| Worker checked in | "Đánh dấu vắng mặt" **dimmed** + reason | absent disabled |
| Mark absent | — | worker banner + dispute option; reputation −20, refund, boost +1 |
| Late arrival (NoShow, shift not closed) | "Đến muộn — chuyển sang có mặt" | reason dialog → CheckedIn, +20 rep, noShow−1, boost−1, escrow→InProgress, timeline + notify |
| Absent + open dispute | reversal blocked | `DISPUTE_OPEN` — admin must resolve (safe behavior) |
| Ended/cancelled/completed | no live attendance buttons | terminal |
| evidenceRequirement=None | absent still available | independent of evidence |

## 10. Feedback / review behavior table

| Capability | Before | After |
|---|---|---|
| Sort | newest only | newest / oldest / highest / lowest / with-comment |
| Timestamp | date only | date + time + seconds (vi-VN) |
| Summary | average + count | average + count + star distribution |
| Report | none | "Báo cáo đánh giá" → admin notified, "Đang được xem xét" badge, never deletes, deduped per reporter |
| Admin visibility | none | disputes tab "Đánh giá bị báo cáo" card (reporter / reason / content / Reviewed-Dismissed) |
| Both sides | employer reviews only | worker rating history timestamp upgraded; report model supports both kinds |

## 11. Checklist coverage update

`qa-exploration/checklist-coverage-matrix.md` updated with a
CORE-STABILITY-7 additions section: C (attendance dim + reversal), I
(insufficient-deposit draft + top-up notification), M (every-kind
deeplink + wallet deeplinks + dedup), and new Feedback / Avatar /
Numeric rows. No checklist item regressed.

## 12. Security / access-control result

All checks PASS (see `core-stability-7-security.md`): notification
privacy, wallet authorization + no-bypass guard, draft isolation,
attendance ownership, feedback-report + numeric-field XSS inert.

## 13. npm audit result

**2 moderate** — `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93) transitively via
`next`. Remediation downgrades `next` to 9.x (breaking). **Deferred**;
carried over from CS6, not introduced here.

## 14. Unit / build / E2E / time results

- `npm run test:run`: **446 passed / 446** (was 420; +26).
- `npm run build`: **clean, 28 routes** (TypeScript type-check passes).
- `npx playwright test --project=chromium`: **99 passed / 99** (was 94;
  +5). Log: `qa-exploration/e2e-cs7-full.log`.
- `npm run test:time`: **22 passed / 22**.

## 15. Report file paths

- `qa-exploration/core-stability-7-report.md` (this file)
- `qa-exploration/core-stability-7-bugs.json`
- `qa-exploration/core-stability-7-security.md`
- `qa-exploration/core-stability-7-security.json`
- `qa-exploration/cs7-explore.json` (exploratory probe output)
- `qa-exploration/checklist-coverage-matrix.md` (updated)

## 16. Remaining blockers

None. Deferred (non-blocking): staff-supply/agency actor, in-app chat,
calendar availability, server-side authorization (mock-only MVP),
postcss/next moderate advisory.

## 17. Manual QA readiness verdict

**Ready.** Every readiness gate is met:
1. Duplicate notifications prevented (dedup keys; distinct shifts allowed).
2. All notification kinds deeplink to a meaningful context (table §7).
3. Notification timestamps visible (date+time+seconds).
4. Top-up creates a notification + wallet-history deeplink (E2E verified).
5. Withdraw creates a notification + wallet-history deeplink.
6. Insufficient deposit preserves the draft + offers a top-up path (E2E).
7. Logo/avatar initials consistent (QP / NV verified live).
8. Numeric-only fields reject letters (E2E + Unit).
9. Attendance present/absent/late-change flow works (Unit) with safe
   dispute handling.
10. Feedback sorting/reporting works (Unit + UI).
11. No Critical/High exploratory bugs remain.
12. No Critical/High security bugs remain.
13. Unit (446) / build (28 routes) / E2E (99) / time (22) all pass.
